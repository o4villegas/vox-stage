import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../env";
import { clearSessionCookie, readSessionCookie, writeSessionCookie } from "../lib/cookies";
import { resolveSession } from "../lib/sessions";

/** Requires a valid session cookie; attaches `user` to the context. */
export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  const token = readSessionCookie(c);
  const session = token ? await resolveSession(c.env.DB, token, Date.now()) : null;
  if (!session) {
    if (token) clearSessionCookie(c);
    return c.json({ error: "unauthenticated", message: "Please sign in." }, 401);
  }
  if (session.renewed && token) writeSessionCookie(c, token);
  c.set("user", session.user);
  await next();
});
