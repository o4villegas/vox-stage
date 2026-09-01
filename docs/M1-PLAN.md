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

**Frontend framework — DECIDED 2026-08-30: React 18 + Vite** (SPA-only per ADR-0008, no
SSR), chosen under authority Lando delegated with his answer to the framework question.
His stated bar, recorded as a product requirement: *"this frontend needs to be better
than the highest grossing app today… whatever it takes to get there."* Engineering
reading of that mandate: framework choice is not what produces top-tier feel — design
system, motion/interaction craft, latency budgets, and audio-UX polish are — so the
framework pick optimizes for ecosystem (Capacitor phase, component libraries, hiring)
while the quality bar is carried by dedicated design/polish work in every milestone and
a hardening pass at M6. The audio engine stays framework-free either way (plain Web
Audio modules ported from the spikes/Rangefinder), so the framework only renders UI and
remains swappable before M4.

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

**Email provider — DECIDED 2026-08-30: Resend** ("resend is preferred" — Lando). Still
needed before build: a **sending domain** (none named yet), and Resend's current
pricing/limits re-verified against its own docs at build time (rule 3).

**OAuth / social login — evaluated 2026-08-30 (Lando: "evaluate investment in oauth
installation for scale"), verdict: defer, revisit at defined triggers.**

- Today (ADR-0006): email-OTP only. That keeps the App Store guideline 4.8 exemption —
  own-account-only auth is exempt from the Sign in with Apple requirement (R27).
- Cost of adding any third-party OAuth (e.g. Google): the 4.8 exemption is lost, so the
  App Store build must then also offer **Sign in with Apple** — i.e., OAuth arrives as a
  minimum of two providers plus an account-linking model (email as join key, collision
  policy), token validation server-side, extra attack surface, and a superseding ADR for
  ADR-0006.
- Benefit at scale *(judgment, unmeasured)*: one-tap sign-in typically beats OTP on
  signup conversion and removes the email-deliverability dependency from the hot path.
- **Recommendation:** beta ships OTP-only. Revisit when either trigger fires:
  (a) App Store submission phase begins, or (b) measured signup abandonment at the OTP
  step becomes a top-3 funnel loss. If added, add Google + Apple together in one change.

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

## 6. Decisions — status as of 2026-08-30 (Lando, in-session)

| # | Decision | Status |
|---|---|---|
| 1 | Frontend framework | **DECIDED: React 18 + Vite** — call delegated with a top-tier quality mandate (see §1) |
| 2 | Email provider + sending domain | **Provider DECIDED: Resend**; OAuth-at-scale evaluated → defer (see §3). **Sending domain still OPEN** |
| 3 | Deploy path / `CLOUDFLARE_API_TOKEN` repo secret | **DECIDED 2026-09-01 ("lets do github" — Lando, superseding a "my computer" answer minutes earlier): GitHub Actions deploys on push to `main`, exactly as §4 specifies. Needs the `CLOUDFLARE_API_TOKEN` added as a GitHub repository secret by Lando (agent cannot set secrets), scoped to Workers Scripts:Edit + D1:Edit (M2 adds R2 + Queues). Token scopes are unverified (R59) — confirm in the Cloudflare dashboard before the first deploy** |
| 4 | Worker/app naming | **DECIDED: `voxstage` + `voxstage-staging`** |
| 5 | Lint/format | **DECIDED: Biome** |
| 6 | M1 approval itself | **OPEN** — after the Phase 0 exit report (S2 pending) |

## 7. Estimate & sequencing (judgment)

Scaffolding + CI ≈ 1 session; auth (worker + tests) ≈ 1–2 sessions; SPA shell +
sign-in UI + deploy wiring ≈ 1 session; hardening + phone verification ≈ 1 session.
Delivered as one draft PR per the working agreement (single reviewable unit), branch
`claude/vox-stage-m1`.

## 8. Explicitly out of M1

Uploads/R2, queues, RunPod wiring (M2) · profile capture (M3) · any audio playback
(M4) · scoring (M5) · payments, social, export (out of MVP entirely — ADR-0007).
