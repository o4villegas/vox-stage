// VoxStage Worker: /api/* is answered here; everything else is served from the static
// assets directory (app/dist) by the Workers Assets layer (wrangler.jsonc: run_worker_first
// is limited to /api/*, so the Worker never sees asset requests in production).
import { Hono } from "hono";
import type { HelloResponse } from "../../shared/api";
import type { AppEnv } from "./env";
import { toPublicUser } from "./lib/users";
import { requireUser } from "./middleware/auth";
import { sameOriginGuard } from "./middleware/origin";
import { authRoutes } from "./routes/auth";

const app = new Hono<AppEnv>();

app.use("/api/*", sameOriginGuard);

app.get("/api/health", (c) => c.json({ ok: true, service: c.env.APP_NAME }));

app.route("/api/auth", authRoutes);

// Everything below /api/ from here on requires a signed-in user.
app.use("/api/*", requireUser);

app.get("/api/hello", (c) => {
  const user = c.get("user");
  const res: HelloResponse = { message: `Hello, ${user.email}`, user: toPublicUser(user) };
  return c.json(res);
});

app.notFound((c) => {
  if (new URL(c.req.url).pathname.startsWith("/api/")) {
    return c.json({ error: "not_found", message: "No such API route." }, 404);
  }
  return c.env.ASSETS.fetch(c.req.raw);
});

app.onError((err, c) => {
  console.error(
    JSON.stringify({ event: "unhandled_error", message: err.message, stack: err.stack }),
  );
  return c.json({ error: "internal", message: "Something went wrong on our side." }, 500);
});

export default app;
