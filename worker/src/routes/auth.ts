import { type Context, Hono } from "hono";
import type {
  ApiErrorBody,
  MeResponse,
  RequestCodeResponse,
  VerifyResponse,
} from "../../../shared/api";
import type { AppEnv } from "../env";
import { clearSessionCookie, readSessionCookie, writeSessionCookie } from "../lib/cookies";
import { sendSignInCode } from "../lib/email";
import { issueCode, verifyCode } from "../lib/otp";
import { hitRateLimit } from "../lib/rateLimit";
import { createSession, deleteSession, resolveSession } from "../lib/sessions";
import { normalizeEmail, toPublicUser, upsertUser } from "../lib/users";

// docs/M1-PLAN.md §3: per-email 3 / 15 min, per-IP 10 / 15 min on request-code.
const WINDOW_MS = 15 * 60 * 1000;
const LIMIT_CODES_PER_EMAIL = 3;
const LIMIT_CODES_PER_IP = 10;
const LIMIT_VERIFY_PER_IP = 20;

export const authRoutes = new Hono<AppEnv>();

authRoutes.post("/request-code", async (c) => {
  const body = await readJson<{ email?: unknown }>(c);
  const email = normalizeEmail(body?.email);
  if (!email) return fail(c, 400, "invalid_email", "Enter a valid email address.");

  const now = Date.now();
  const byEmail = await hitRateLimit(
    c.env.DB,
    `codes:email:${email}`,
    LIMIT_CODES_PER_EMAIL,
    WINDOW_MS,
    now,
  );
  if (!byEmail.allowed) return tooMany(c, byEmail.retryAfterMs);
  const byIp = await hitRateLimit(
    c.env.DB,
    `codes:ip:${clientIp(c)}`,
    LIMIT_CODES_PER_IP,
    WINDOW_MS,
    now,
  );
  if (!byIp.allowed) return tooMany(c, byIp.retryAfterMs);

  const code = await issueCode(c.env.DB, email, now);
  const delivery = await sendSignInCode(c.env, email, code);
  if (delivery === "unavailable") {
    return fail(
      c,
      503,
      "email_unavailable",
      "Email sending isn't set up on this environment yet, so no code could be sent.",
    );
  }
  const res: RequestCodeResponse = { ok: true, delivery: delivery === "sent" ? "email" : "log" };
  return c.json(res, 202);
});

authRoutes.post("/verify", async (c) => {
  const body = await readJson<{ email?: unknown; code?: unknown }>(c);
  const email = normalizeEmail(body?.email);
  const code = typeof body?.code === "string" ? body.code.replace(/\s+/g, "") : "";
  if (!email || !/^\d{6}$/.test(code)) {
    return fail(c, 400, "invalid_code", "Enter the 6-digit code from your email.");
  }

  const now = Date.now();
  const byIp = await hitRateLimit(
    c.env.DB,
    `verify:ip:${clientIp(c)}`,
    LIMIT_VERIFY_PER_IP,
    WINDOW_MS,
    now,
  );
  if (!byIp.allowed) return tooMany(c, byIp.retryAfterMs);

  const outcome = await verifyCode(c.env.DB, email, code, now);
  switch (outcome) {
    case "invalid":
      return fail(c, 401, "invalid_code", "That code didn't match. Check the email and try again.");
    case "expired":
      return fail(c, 401, "code_expired", "That code has expired. Request a new one.");
    case "locked":
      return fail(c, 401, "too_many_attempts", "Too many attempts. Request a new code.");
    case "ok":
      break;
  }

  const user = await upsertUser(c.env.DB, email, now);
  const token = await createSession(c.env.DB, user.id, now);
  writeSessionCookie(c, token);
  const res: VerifyResponse = { user: toPublicUser(user) };
  return c.json(res, 200);
});

authRoutes.post("/logout", async (c) => {
  const token = readSessionCookie(c);
  if (token) await deleteSession(c.env.DB, token);
  clearSessionCookie(c);
  return c.body(null, 204);
});

authRoutes.get("/me", async (c) => {
  const token = readSessionCookie(c);
  const session = token ? await resolveSession(c.env.DB, token, Date.now()) : null;
  if (!session) {
    if (token) clearSessionCookie(c);
    return fail(c, 401, "unauthenticated", "Please sign in.");
  }
  if (session.renewed && token) writeSessionCookie(c, token);
  const res: MeResponse = { user: toPublicUser(session.user) };
  return c.json(res, 200);
});

async function readJson<T>(c: Context<AppEnv>): Promise<T | null> {
  try {
    return await c.req.json<T>();
  } catch {
    return null;
  }
}

function clientIp(c: Context<AppEnv>): string {
  // Cloudflare sets this at the edge and overwrites any client-supplied value.
  return c.req.header("cf-connecting-ip") ?? "local";
}

function fail(c: Context<AppEnv>, status: 400 | 401 | 403 | 503, error: string, message: string) {
  const body: ApiErrorBody = { error, message };
  return c.json(body, status);
}

function tooMany(c: Context<AppEnv>, retryAfterMs: number) {
  const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  c.header("Retry-After", String(retryAfterSeconds));
  const body: ApiErrorBody = {
    error: "rate_limited",
    message: `Too many tries. Please wait about ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`,
    retryAfterSeconds,
  };
  return c.json(body, 429);
}
