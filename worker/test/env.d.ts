import type { D1Migration } from "@cloudflare/vitest-plugin";

declare global {
  namespace Cloudflare {
    interface Env {
      /** Test-only binding provided by vitest.config.ts. */
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
