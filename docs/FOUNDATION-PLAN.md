# Foundation milestone plan (M1.5) — front-end foundation before M2

Status: **plan only** (documents are pre-approved deliverables). Direction chosen by Lando
2026-09-08: **Option A** of `docs/STATUS-2026-09-08.md` §8, with the scope answers recorded
there (phone-first, desktop must not break · dark "stage light" is the permanent identity ·
offline / add-to-home-screen is not for the beta). **Building this milestone still needs
Lando's separate, explicit "go" (rule 1).** Facts cite `docs/RESEARCH.md` (Rn) or the
verification notes below; everything else is engineering judgment for review.

## 1. Goal and "done means"

**Goal:** lay the shared groundwork that M2 (upload → ready), M3 (profile capture), M4
(synced player) and M5 (live scoring) all need, and fix the seventeen measured defects
(F1–F17 in the status document), without changing what the app *does*: it still signs
you in and shows a home screen.

**Done means:** the same flow, rebuilt on the foundation, deployed to
`vox-stage.therancch.com`, and checked by Lando on his phone: sign in, get a code wrong (the
field shows the error and keeps focus), sign in, turn on airplane mode and tap "Sign out"
(the app says it could not sign out, not the sign-in screen), reload while on the code step
(you stay on the code step), and nothing runs past the bottom of the screen.

## 2. Scope

### 2.1 Fix the seventeen defects

| Defect | Fix (judgment) |
|---|---|
| F1 focus thrown away | re-enable the field before calling `focus()` (or focus in an effect keyed on the error); after navigation focus the screen's heading; set the document title per screen |
| F2 home overflows phones | screens become "scrollable content + action area that stays reachable"; no card taller than the viewport by design; measured with phone emulation at 375×667 |
| F3 contrast | replace `--cream-45` with a token that measures ≥ 4.5 : 1 on every surface it is used on |
| F4 no navigation state | router (§3) — one address per screen, Back works, reload keeps you where you were |
| F5 iOS floor | add `min-height: 100vh` before `100dvh`, and a plain `:focus` ring fallback; see open decision §8.2 on the floor itself |
| F6 icons / sharing | Apple touch icon + 192/512 PNG + maskable icon; Open Graph and Twitter tags. **No service worker, no offline shell** (Lando: not for the beta) |
| F7 fonts | self-host Fraunces and Inter as subsetted woff2 files, preload the display weight, `font-display: swap` — removes the render-blocking third-party request and most of the 169 KB |
| F8 no error boundary / timeout / offline handling | root + per-screen error boundaries with a designed "something broke — try again" screen; request timeouts (abort after ~10 s) with retry; an "you're offline" banner from connection failures |
| F9 robots | static `robots.txt` (`Disallow: /` while this is staging) |
| F10 security headers | Worker middleware: HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options` / `frame-ancestors`, `Permissions-Policy` that **allows** the microphone for this origin (M3 needs it); CSP deferred until fonts are self-hosted and the analytics beacon decision is made |
| F11 desktop | **no work** — decision: phone-first, desktop must not break (it does not) |
| F12 console 401 | the session probe treats 401 as a normal answer (no logged failure) |
| F13 sign-out can silently fail | catch the failure, keep the user signed in, show "Couldn't sign out — check your connection and try again" |
| F14 rejected code not attached to the field | a Field primitive with a built-in error state: `aria-invalid`, `aria-describedby`, error styling, assertive announcement; wrong digits cleared and focus returned |
| F15 source map public | `sourcemap: "hidden"` (kept locally for debugging, not served) |
| F16 no asset caching | long-lived cache headers for fingerprinted `/assets/*` files; **verify at build time** that Workers static assets honour a `_headers` file (rule 3) |
| F17 no email check | validate the address before enabling the button; inline hint on blur |

### 2.2 The seven foundation pieces

1. **Design tokens as a scale** (dark only, existing palette kept): spacing (4-pt scale),
   type scale (display/heading/body/label sizes with line heights), radii, elevation,
   motion durations and easings, z-layers, semantic colours (`--text`, `--text-muted`,
   `--danger`, `--success`), all in `app/src/styles/tokens.css`. The 29 loose pixel values
   in today's stylesheet are replaced by tokens.
2. **Component primitives** in `app/src/components/ui/`: Button (primary / ghost / quiet;
   loading and disabled states; icon slot), Field (label, input, hint, error), Surface/Card,
   Sheet (bottom sheet for phones), StatusLine/Toast, Progress (determinate and
   indeterminate — M2's processing state), Dialog, Skeleton, Segmented control. Each with
   a jsdom test and a screenshot.
3. **Layout shell + routing:** masthead, scrollable content region, action area that stays
   reachable; routes `/`, `/sign-in`, `/sign-in/code`, `/songs` (empty-state placeholder —
   see §8.1), `/profile` (placeholder), `/settings` (sign out, email, version). Signed-out
   users are redirected to `/sign-in`; titles and heading focus per route.
4. **Data layer:** a typed API client with timeouts, cancellation and retry; server state
   (session, and later songs / jobs / profile) held in a query cache with polling support
   for M2's "processing…" state.
5. **Motion system:** tokenised durations/easings, a step-to-step transition, one shared
   reduced-motion hook. Library adoption deferred (§8.3).
6. **Resilience:** error boundaries, offline banner, 401 handling in one place, sign-out
   failure surfaced (F8, F13).
7. **Test infrastructure:** coverage provider + threshold in `npm run check`; Playwright
   end-to-end tests of the real flows against a local production build in CI (API answered
   by in-page mocks, so no Cloudflare credentials and no database writes); screenshot
   regression at 320 / 390 / 768 / 1440 with phone emulation; automated accessibility
   checks (axe, including contrast) on every screen; a bundle-size budget.

### 2.3 Out of scope

Desktop layouts · a light theme · service worker / offline shell · any M2+ product feature
(upload, processing status with real jobs, profile capture, player, scoring) · the audio
engine modules (M3+) · the Resend sending domain and `AUTH_DEV_ECHO=0` (separate, already
tracked) · S2 cold-start (Phase 0).

## 3. Tooling additions (verified against the npm registry 2026-09-08)

| Package | Version | Note |
|---|---|---|
| `react-router` | 8.3.1 (2026-09-02) | needs `react ≥ 19.2.7` — we have 19.2.8. Fresh major: pin exactly; fall back to the 7.x line if it misbehaves |
| `@tanstack/react-query` | 5.102.8 | server-state cache, polling, retries |
| `@vitest/coverage-v8` | **4.1.11** | must match `vitest` 4.1.11 exactly (its `latest`, 5.0.0, requires vitest 5, which `@cloudflare/vitest-plugin` 1.1.6 does not support — peer `^4.1.0`) |
| `@playwright/test` | 1.63.0 | end-to-end + screenshot regression |
| `@axe-core/playwright` | 4.13.0 | accessibility checks in the E2E run |
| `motion` | 13.2.0 | peer `react ^19` ✓ — **optional**, see §8.3 |

Bundle budget for the shell: **≤ 120 KB gzip of JavaScript** (today 62 KB), measured on
every commit by the CI build.

## 4. Sequence (one draft PR, commits in this order)

1. **Hygiene + the seventeen fixes that need no new structure** — F1, F3, F5, F7, F9,
   F10, F12, F13, F15, F16, F17, F6 (icons/tags). Take the screenshot-regression baseline
   *before* touching the look.
2. **Tokens + primitives**, then rebuild the three screens on them (fixes F2, F14).
3. **Router + layout shell**, titles and focus per route (fixes F4).
4. **Data layer + resilience** (fixes F8; F13 moves onto the new client).
5. **Motion tokens + the step transition.**
6. **Tests and gates** wired into `npm run check` and CI: coverage, E2E, screenshots, axe,
   bundle budget.
7. Deploy via Workers Builds on merge; Lando's phone check; record the result as a new
   R-entry; update `CLAUDE.md` current state.

## 5. Verification gates (all must hold before the PR leaves draft)

- Every defect F1–F17 (except F11 by decision) has either a regression test or a measured
  check listed in the PR, with the command and output.
- axe: 0 violations on every screen, contrast included; Lighthouse accessibility 100.
- Phone-emulated layout: nothing runs past the screen at 375×667 or 390×844; the action
  area is reachable without scrolling on both.
- Focus lands on the field after an error and on the heading after navigation; the
  document title changes per screen.
- Coverage ≥ 70 % lines (global) with the provider installed and `npm run check` running it.
- Bundle ≤ 120 KB gzip; fonts self-hosted; the only third-party request left is
  Cloudflare's analytics beacon.
- Existing 27 tests still pass; Workers Builds check green; a full sign-in on the preview
  URL over the API (as in R61).

## 6. Estimate [judgment]

2–3 sessions. Branch `claude/vox-stage-foundation`, one draft PR into `main`, delivered
end-to-end per the working agreement.

## 7. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Rebuilding screens on primitives changes the look Lando approved | screenshot baseline taken in commit 1; every later commit diffs against it |
| `react-router` 8 is six days old | pin exact; the 7.x line is the fallback; routing needs are simple |
| Coverage threshold is noisy on a small app | global threshold first, per-file later |
| `_headers` support for Workers static assets unverified | verify in cloudflare-docs at build time; fallback is a Worker middleware that sets cache headers on `/assets/*` |
| Scope creep into M2 screens | `/songs` ships only its empty state; no upload code |

## 8. Open decisions for Lando (one line each)

1. **The signed-in home.** Recommended: make `/songs` the home, showing its real empty
   state ("No songs yet — upload your first" with a disabled upload button until M2), so
   M2 drops straight into it. Alternative: keep the milestone-1 placeholder list.
2. **iPhone floor.** Recommended: raise the declared floor from iOS 14.5 to **15.4**
   (every iPhone that can run 14.5 can also run 15.x [judgment — adoption, not hardware]),
   recorded as an amendment to ADR-0008, *and* keep the cheap CSS fallbacks anyway.
   Alternative: keep 14.5 and rely on the fallbacks only.
3. **Motion library.** Delegated; recommended: tokens + CSS now, adopt `motion` only when
   M3/M5 need orchestrated animation (keeps the shell small).
