import type { User } from "./lib/users";

export type Env = Cloudflare.Env;

/** Hono generic: bindings + per-request variables. */
export type AppEnv = {
  Bindings: Env;
  Variables: { user: User };
};
