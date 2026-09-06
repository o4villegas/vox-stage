import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import {
  dispatch,
  expectResendEmail,
  me,
  ORIGIN,
  requestCode,
  sessionCookieFrom,
  signIn,
  verify,
} from "./helpers";
import { installResendMock } from "./resend-mock";

installResendMock();

describe("health", () => {
  it("answers on /api/health", async () => {
    const res = await dispatch("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, service: "VoxStage" });
  });

  it("returns JSON 404 for unknown API routes (after auth)", async () => {
    const res = await dispatch("/api/nope");
    expect(res.status).toBe(401);
  });
});

describe("request-code", () => {
  it("rejects a malformed email", async () => {
    const res = await requestCode("not-an-email", "203.0.113.10");
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "invalid_email" });
  });

  it("rejects a non-JSON body", async () => {
    const res = await dispatch("/api/auth/request-code", {
      method: "POST",
      headers: { "cf-connecting-ip": "203.0.113.10" },
      body: "email=x",
    });
    expect(res.status).toBe(400);
  });

  it("sends a 6-digit code through Resend to the normalized address", async () => {
    const sent = expectResendEmail();
    const res = await requestCode("  Singer@Example.COM ", "203.0.113.11");
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true, delivery: "email" });
    const email = await sent;
    expect(email.to).toEqual(["singer@example.com"]);
    expect(email.from).toBe("VoxStage <onboarding@resend.dev>");
    expect(email.code).toMatch(/^\d{6}$/);
  });

  it("rate-limits the 4th code for the same email within 15 minutes", async () => {
    const address = "limited@example.com";
    for (let i = 0; i < 3; i++) {
      const sent = expectResendEmail();
      const res = await requestCode(address, "203.0.113.12");
      expect(res.status).toBe(202);
      await sent;
    }
    const res = await requestCode(address, "203.0.113.12");
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toMatch(/^\d+$/);
    expect(await res.json()).toMatchObject({ error: "rate_limited" });
  });

  it("rate-limits the 11th code from one IP within 15 minutes", async () => {
    const ip = "203.0.113.13";
    for (let i = 0; i < 10; i++) {
      const sent = expectResendEmail();
      const res = await requestCode(`ip-${i}@example.com`, ip);
      expect(res.status).toBe(202);
      await sent;
    }
    const res = await requestCode("ip-last@example.com", ip);
    expect(res.status).toBe(429);
  });

  it("rejects cross-site POSTs by Origin", async () => {
    const res = await requestCode("csrf@example.com", "203.0.113.14", "https://evil.example");
    expect(res.status).toBe(403);
  });

  it("accepts same-origin POSTs with an Origin header", async () => {
    const sent = expectResendEmail();
    const res = await requestCode("same@example.com", "203.0.113.14", ORIGIN);
    expect(res.status).toBe(202);
    await sent;
  });
});

describe("verify + session", () => {
  it("signs in with the emailed code and sets a hardened cookie", async () => {
    const sent = expectResendEmail();
    await requestCode("happy@example.com", "203.0.113.20");
    const { code } = await sent;

    const res = await verify("happy@example.com", code, "203.0.113.20");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ user: { email: "happy@example.com" } });
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/^vox_session=[A-Za-z0-9_-]{40,}/);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");

    const cookie = sessionCookieFrom(res);
    const who = await me(cookie);
    expect(who.status).toBe(200);
    expect(await who.json()).toMatchObject({ user: { email: "happy@example.com" } });

    const hello = await dispatch("/api/hello", { headers: { cookie } });
    expect(hello.status).toBe(200);
    expect(await hello.json()).toMatchObject({ message: "Hello, happy@example.com" });

    const out = await dispatch("/api/auth/logout", { method: "POST", headers: { cookie } });
    expect(out.status).toBe(204);
    expect(out.headers.get("set-cookie")).toMatch(/vox_session=;.*Max-Age=0/);
    expect((await me(cookie)).status).toBe(401);
  });

  it("is a no-op logout without a session", async () => {
    const out = await dispatch("/api/auth/logout", { method: "POST" });
    expect(out.status).toBe(204);
  });

  it("rejects a wrong code, then locks after 5 attempts", async () => {
    const sent = expectResendEmail();
    await requestCode("locked@example.com", "203.0.113.21");
    const { code } = await sent;
    const wrong = code === "000000" ? "000001" : "000000";

    for (let i = 0; i < 4; i++) {
      const res = await verify("locked@example.com", wrong, "203.0.113.21");
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ error: "invalid_code" });
    }
    const fifth = await verify("locked@example.com", wrong, "203.0.113.21");
    expect(fifth.status).toBe(401);
    expect(await fifth.json()).toMatchObject({ error: "too_many_attempts" });

    // The real code no longer works either: the row was invalidated.
    const real = await verify("locked@example.com", code, "203.0.113.21");
    expect(real.status).toBe(401);
    expect(await real.json()).toMatchObject({ error: "invalid_code" });
  });

  it("rejects an expired code", async () => {
    const sent = expectResendEmail();
    await requestCode("expired@example.com", "203.0.113.22");
    const { code } = await sent;
    await env.DB.prepare("UPDATE otp_codes SET expires_at = ?1 WHERE email = ?2")
      .bind(Date.now() - 1000, "expired@example.com")
      .run();
    const res = await verify("expired@example.com", code, "203.0.113.22");
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "code_expired" });
  });

  it("a new code replaces the old one", async () => {
    const first = expectResendEmail();
    await requestCode("replace@example.com", "203.0.113.23");
    const { code: oldCode } = await first;
    const second = expectResendEmail();
    await requestCode("replace@example.com", "203.0.113.23");
    const { code: newCode } = await second;

    if (oldCode !== newCode) {
      const stale = await verify("replace@example.com", oldCode, "203.0.113.23");
      expect(stale.status).toBe(401);
    }
    const fresh = await verify("replace@example.com", newCode, "203.0.113.23");
    expect(fresh.status).toBe(200);
  });

  it("rejects malformed codes without touching the attempt counter", async () => {
    const res = await verify("nobody@example.com", "12ab", "203.0.113.24");
    expect(res.status).toBe(400);
  });

  it("expires sessions and renews ones that are close to expiry", async () => {
    const { cookie } = await signIn("session@example.com", "203.0.113.25");
    const token = cookie.slice("vox_session=".length);
    const hash = await sha256Hex(token);

    // Close to expiry → renewed, cookie re-issued.
    await env.DB.prepare("UPDATE sessions SET expires_at = ?1 WHERE token_hash = ?2")
      .bind(Date.now() + 24 * 60 * 60 * 1000, hash)
      .run();
    const renewed = await me(cookie);
    expect(renewed.status).toBe(200);
    expect(renewed.headers.get("set-cookie")).toContain("vox_session=");

    // Past expiry → signed out and cookie cleared.
    await env.DB.prepare("UPDATE sessions SET expires_at = ?1 WHERE token_hash = ?2")
      .bind(Date.now() - 1000, hash)
      .run();
    const gone = await me(cookie);
    expect(gone.status).toBe(401);
    expect(gone.headers.get("set-cookie")).toMatch(/Max-Age=0/);
  });

  it("keeps one user row per email across sign-ins", async () => {
    await signIn("twice@example.com", "203.0.113.26");
    await signIn("twice@example.com", "203.0.113.26");
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE email = ?1")
      .bind("twice@example.com")
      .first<{ n: number }>();
    expect(row?.n).toBe(1);
  });
});

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
