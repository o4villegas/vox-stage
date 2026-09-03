// Runs once per test file (per-file storage isolation): applies worker/migrations/*.sql to
// the isolated D1 the Workers Vitest plugin provides.
import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
