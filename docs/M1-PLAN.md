# M1 Implementation Plan — scaffolding, CI, deploy pipeline, auth

Status: **plan only** (docs are pre-approved deliverables). Building M1 requires Lando's
separate approval after the Phase 0 exit report. Facts cite `docs/RESEARCH.md` (Rn) or the
tool-verification table below; everything else is engineering judgment for review.

M1 "done means" (docs/ROADMAP.md): *deployed hello-app with working sign-in on a phone.*

## 1. Tooling (verified against the npm registry, 2026-08-29)

| Tool | Version @ check | Role | Rationale |
|---|---|---|---|
| `hono` | 4.13.5 (2026-08-26) | Worker API framework | ADR-0002 stack; tiny, Workers-first, typed routes |
| `wrangler` | 4.127.1 (2026-08-28) | build/deploy/D1 migrations | Cloudflare's own CLI; Lando already uses it (Rangefinder) |
| `vitest` | 4.1.11 (2026-08-18) | unit tests | de-facto Vite-ecosystem runner |
| `@cloudflare/vitest-pool-workers` | 0.22.0 (2026-08-18) | run tests inside workerd | tests hit real D1/R2 bindings, not mocks |
| `@biomejs/biome` | 2.5.11 (2026-08-27) | lint + format | single fast tool; one config; CI-friendly |

All five actively maintained (latest publishes ≤ 11 days old at check). TypeScript
throughout; Vite for the SPA build; Playwright headless smoke reuses the spike pattern
(R35's bench harness approach).

**Frontend framework — needs Lando's call (§6).** Recommendation: **React 18 + Vite**,
SPA-only per ADR-0008 (no SSR). Rationale: largest ecosystem for the later Capacitor
phase and for hiring; the audio engine itself stays framework-free (plain Web Audio
modules ported from the spikes/Rangefinder), so the framework only renders UI and can be
swapped cheaply before M4 if desired.

## 2. Repository layout (proposed)

```
app/            # SPA (Vite + React + TS). No SSR. Audio engine in app/src/audio/ as
                # framework-free modules (worklets, MPM port, stretch wiring).
worker/         # Hono API (TS): auth, upload slots, job webhook, presigned URLs
worker/migrations/  # D1 SQL migrations (wrangler d1 migrations)
shared/         # types shared app<->worker (session payloads, API contracts)
spikes/         # unchanged, throwaway (Phase 0)
docs/           # unchanged
.github/workflows/ci.yml
wrangler.jsonc  # single Worker: serves app/dist static assets + /api/* routes
```

One Worker serves both static assets and the API (ADR-0002; avoids CORS entirely —
cookies are first-party same-origin).

## 3. Auth flow spec (email OTP — ADR-0006)

Endpoints (all `/api/auth/*`, JSON):

1. `POST /request-code` `{email}` → always `202` (no account enumeration). Server:
   normalize email; rate-limit (per-email 3/15 min, per-IP 10/15 min, D1-backed
   counters); generate 6-digit code; store `otp_codes(email, code_hash, expires_at
   +10min, attempts=0)` (hash: SHA-256 with per-row random salt — codes are
   low-entropy, so rate/attempt limits are the real defense); send email; dev flag
   `AUTH_DEV_ECHO=1` logs the code instead of sending.
2. `POST /verify` `{email, code}` → constant-time compare; `attempts` max 5 then
   invalidate; on success: delete code row, upsert `users`, create
   `sessions(token_hash, user_id, expires_at +30d)`; set cookie
   `vox_session` = random 256-bit token, `HttpOnly; Secure; SameSite=Lax; Path=/`;
   rolling renewal when < 15 days left.
3. `POST /logout` → delete session row, clear cookie.
4. `GET /me` → `{user}` or `401` (the SPA's session probe).

Middleware: cookie → `sessions` lookup → `c.set("user", …)`; everything outside
`/api/auth/*` and static assets requires it.

D1 tables in M1: `users`, `otp_codes`, `sessions` (subset of the ARCHITECTURE §6 sketch;
the rest arrive with M2+ migrations).

**Email provider — needs Lando's call (§6).** Candidates: Resend / Postmark / AWS SES.
All work via plain HTTPS from a Worker. Also needs a sending domain decision.

## 4. CI + deploy pipeline

- **CI (GitHub Actions, on every PR):** install → `biome ci` → `tsc --noEmit` (app +
  worker) → `vitest run` (pool-workers) → `vite build`. No deploy from PRs.
- **Deploy (on push to main):** same checks, then `wrangler deploy`. Needs a
  `CLOUDFLARE_API_TOKEN` repo secret (Workers+D1 scoped) — Lando provisions (§6).
- Migrations: `wrangler d1 migrations apply` runs in the deploy job before `deploy`.
- Two environments: `voxstage-staging` (deployed from main) and `voxstage`
  (production, manual `workflow_dispatch` promote). Beta users live on staging until
  M6 hardening.

## 5. Test strategy

- **Worker unit/integration** (vitest-pool-workers, real D1 binding in miniflare):
  auth happy path, rate limits, attempt lockout, expiry, cookie flags.
- **App**: component smoke only in M1 (sign-in flow renders, calls, redirects) via
  vitest + jsdom; the audio engine gets its ported Rangefinder accuracy harness from
  M3 on (R34), not in M1.
- **E2E**: one Playwright headless run of the deployed staging URL post-deploy
  (sign-in with `AUTH_DEV_ECHO` code path), reusing the spike browser tooling.
- Every CI check runnable locally with one command each (`npm run lint|typecheck|test`).

## 6. Decisions needing Lando before build

| # | Decision | Recommendation |
|---|---|---|
| 1 | Frontend framework | React 18 + Vite (swappable pre-M4) |
| 2 | Email provider + sending domain | pick one of Resend/Postmark/SES; needs a domain (do we own voxstage.* anything?) |
| 3 | `CLOUDFLARE_API_TOKEN` repo secret | Lando provisions, scoped to Workers+D1 |
| 4 | Worker/app naming (`voxstage` + `voxstage-staging`?) | as proposed |
| 5 | Biome (vs ESLint+Prettier) | Biome |
| 6 | M1 approval itself | after Phase 0 exit report |

## 7. Estimate & sequencing (judgment)

Scaffolding + CI ≈ 1 session; auth (worker + tests) ≈ 1–2 sessions; SPA shell +
sign-in UI + deploy wiring ≈ 1 session; hardening + phone verification ≈ 1 session.
Delivered as one draft PR per the working agreement (single reviewable unit), branch
`claude/vox-stage-m1`.

## 8. Explicitly out of M1

Uploads/R2, queues, RunPod wiring (M2) · profile capture (M3) · any audio playback
(M4) · scoring (M5) · payments, social, export (out of MVP entirely — ADR-0007).
