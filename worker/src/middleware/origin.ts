import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../env";

/**
 * CSRF backstop for state-changing API calls: when a browser sends an Origin header it
 * must match the host we were reached on. Cookies are SameSite=Lax as well; this catches
 * the cross-site POST cases Lax alone does not.
 */
export const sameOriginGuard = createMiddleware<AppEnv>(async (c, next) => {
  const method = c.req.method;
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const origin = c.req.header("origin");
    if (origin) {
      let originHost: string | null = null;
      try {
        originHost = new URL(origin).host;
      } catch {
        originHost = null;
      }
      if (originHost !== new URL(c.req.url).host) {
        return c.json({ error: "bad_origin", message: "Cross-site request rejected." }, 403);
      }
    }
  }
  await next();
});
