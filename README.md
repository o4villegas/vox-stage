# VoxStage

Sing any song in the key that fits your voice. VoxStage measures a singer's vocal profile,
splits the vocal out of an uploaded song, recommends a per-singer key ("sync"), plays the
song shifted in real time, and scores live singing against the melody.

This repository is documentation-first: `CLAUDE.md` is the agent operating guide and the
project's memory; `docs/` holds the architecture, research base, roadmap, plans, and
decision records. **Milestone 1** (this code) is the deployed hello-app with working
email-code sign-in on a phone.

## Layout

| Path | What it is |
|---|---|
| `app/` | The phone-first web app (Vite + React + TypeScript). Builds to `app/dist`. |
| `worker/` | The Cloudflare Worker API (Hono): `/api/health`, `/api/auth/*`, `/api/hello`. |
| `worker/migrations/` | D1 (SQLite) schema migrations. |
| `shared/` | Types shared by app and Worker. |
| `wrangler.jsonc` | The one Worker: serves `app/dist` as static assets + `/api/*`. |
| `spikes/` | Phase 0 throwaway experiments (never imported by the app). |
| `docs/` | Architecture, research (`RESEARCH.md`), roadmap, M1 plan, ADRs. |

## Everyday commands

```sh
npm install          # installs, then builds app/dist (see "build bridge" below)
npm run dev          # Vite on http://localhost:5173 + wrangler dev on :8787 (proxied /api)
npm run check        # lint → typecheck → build → test → wrangler dry-run (what CI runs)
npm test             # vitest: Worker tests inside workerd (isolated D1), app tests in jsdom
npm run lint         # biome ci
npm run typecheck    # wrangler types + tsc for worker and app
```

Local `wrangler dev` uses the **real staging database** (`remote: true` on the D1 binding),
so there is one database to reason about. Pass `--local` to `wrangler dev` to use a scratch
local copy instead. Tests never touch the remote database.

## Sign-in flow (email one-time code)

1. `POST /api/auth/request-code {email}` → `202` — issues a 6-digit code (10-minute life,
   salted SHA-256 at rest), rate-limited 3 per email and 10 per IP per 15 minutes, and
   emails it via Resend.
2. `POST /api/auth/verify {email, code}` → `200 {user}` + `vox_session` cookie
   (`HttpOnly; Secure; SameSite=Lax`, 30 days, renewed when under 15 days remain).
   Five wrong attempts invalidate the code.
3. `GET /api/auth/me`, `POST /api/auth/logout`, and any other `/api/*` route require the
   cookie. Cross-site POSTs are rejected by an Origin check.

### Email configuration

- `RESEND_API_KEY` is a Worker **secret** (Cloudflare dashboard → the Worker → Settings →
  Variables and Secrets → Add → Secret), never a file in this repo.
- `EMAIL_FROM` (in `wrangler.jsonc`) defaults to Resend's test sender
  `onboarding@resend.dev`, which can only deliver to the Resend account owner's own inbox.
  Verify a sending domain in Resend and change `EMAIL_FROM` before anyone else signs in.
- `AUTH_DEV_ECHO="1"` (staging only) also writes each code to the Worker log
  (`npx wrangler tail voxstage-staging`). Set it to `"0"` before external beta users.

## Database migrations

Migrations live in `worker/migrations/` and are applied by hand, on purpose (the deploy
pipeline never runs them):

```sh
npm run db:migrate:remote     # applies pending migrations to the staging D1
```

## Deploy path (Cloudflare Workers Builds)

Cloudflare pulls this repository itself; nothing in the repo or in GitHub Actions holds a
Cloudflare token.

- Every push to a non-`main` branch → `npx wrangler versions upload` → a **preview URL**
  (posted as a comment on the pull request).
- Every push to `main` → `npx wrangler deploy` → the live `voxstage-staging` URL.

**Build bridge.** Workers Builds installs dependencies automatically but ignores
wrangler's custom-build hook, so `package.json` has `"postinstall": "npm run build"` to
guarantee `app/dist` exists before the upload. The intended long-term setting is the
dashboard's **Build command** = `npm run build` (Worker → Settings → Build); once that is
set, the `postinstall` line can be removed.

GitHub Actions (`.github/workflows/ci.yml`) only lints, type-checks, tests, and builds.

## Working rules

See `CLAUDE.md`. In short: no application code without the owner's explicit approval for
that milestone; every load-bearing claim is verified and recorded in `docs/RESEARCH.md`;
copyright guardrails (ADR-0007) are architectural.
