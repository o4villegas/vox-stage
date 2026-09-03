import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Two test projects:
//  - "worker": runs inside the Workers runtime (workerd) with an isolated local D1 that
//    has the real migrations applied (worker/test/apply-migrations.ts).
//  - "app": React component smoke tests under jsdom.
export default defineConfig({
  test: {
    projects: [
      {
        plugins: [
          cloudflareTest(async () => ({
            wrangler: { configPath: "./wrangler.jsonc" },
            // Never let tests touch the remote staging database (wrangler.jsonc sets
            // remote:true on DB for local dev only).
            remoteBindings: false,
            miniflare: {
              bindings: {
                TEST_MIGRATIONS: await readD1Migrations(
                  path.join(import.meta.dirname, "worker/migrations"),
                ),
                // Exercise the real email path against a mocked Resend endpoint.
                RESEND_API_KEY: "re_test_not_a_real_key",
                AUTH_DEV_ECHO: "0",
              },
            },
          })),
        ],
        test: {
          name: "worker",
          include: ["worker/**/*.test.ts"],
          setupFiles: ["./worker/test/apply-migrations.ts"],
        },
      },
      {
        plugins: [react()],
        test: {
          name: "app",
          include: ["app/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["./app/test/setup.ts"],
        },
      },
    ],
  },
});
