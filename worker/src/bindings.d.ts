// Augments the generated `Cloudflare.Env` (worker-configuration.d.ts, produced by
// `wrangler types`) with values that only exist at runtime.
declare namespace Cloudflare {
  interface Env {
    /** Resend API key. A Worker *secret* (dashboard or `wrangler secret put`), never in config. */
    RESEND_API_KEY?: string;
  }
}
