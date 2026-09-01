# VoxStage — Agent Operating Guide

VoxStage helps aspiring musicians (open-mic performers, talent-show contestants, karaoke
singers) perform any song in the key that fits their voice. A user measures a persistent
**vocal profile** (range + comfortable tessitura), uploads a song, and the app splits the
vocal stem out (GPU), analyzes the vocal melody and key, recommends a per-user transposition
("**sync**"), plays the synced song with real-time pitch shifting and per-stem mixing, and
scores the user's live singing accuracy against the melody.

This file is the entry point for every agent session in this repo. Read it fully before
acting.

## Non-negotiable working rules (set by Lando, repo owner)

1. **No application code without Lando's explicit, current approval.** Documentation, ADRs,
   and research notes are pre-approved deliverable types. Source code, scaffolding, configs,
   dependency manifests, and infrastructure changes are NOT — each phase/feature needs its
   own go-ahead. Approval for one phase does not carry to the next. If unsure whether
   something counts as code, ask before writing it.
2. **Never assert an unverified claim as fact.** Every load-bearing claim is either
   (a) verified against a primary source and cited, or (b) explicitly labeled as an
   assumption, estimate, or engineering judgment. `docs/RESEARCH.md` is the project's
   verified fact base — cite its entry IDs (R1, R2, …) instead of re-asserting from memory.
3. **Research goes stale.** Facts in `docs/RESEARCH.md` were verified **2026-08-28**.
   Re-verify pricing, platform limits, and library/maintenance status before relying on them
   in a new decision — especially anything older than ~90 days.
4. **Branch and review flow:** develop on the session's designated branch, push, open a
   **draft PR** into `main`. Lando merges. Merging a PR that adds/changes an ADR marks that
   ADR Accepted (see `docs/decisions/README.md`).
5. **Copyright guardrails are architectural, not optional** (ADR-0007): user-uploaded audio
   is processed per user; never build cross-user deduplication/caching of processed audio,
   a shared song/stem catalog, or sharing/export of processed copyrighted audio, without a
   new Accepted ADR.

## Current state — UPDATE THIS SECTION AS IT CHANGES

- **Architecture: ACCEPTED.** PR #1 merged 2026-08-29 on Lando's explicit in-session
  instruction — `docs/ARCHITECTURE.md` is the working architecture and ADRs 0001–0008 are
  Accepted.
- **Phase:** Phase 0 **approved by Lando ("go", 2026-08-28) and in progress.** Spike code
  lives in `/spikes/` (throwaway — never graduates into the app). **No application code
  exists**; Phase 1 still needs its own approval, milestone by milestone.
- **Phase 0 status:** see the table in `spikes/README.md`. S0 CLOSED (audit complete,
  R50) · S1 CLOSED (pass on device; mic processing all-OFF confirmed, R39–R43) · S4
  CLOSED (pass with documented deviation, RTT ≈ 70 ms, R45/R47) · **S3 PASS both halves**
  (R37 scoring math; R56/R57 extractor half — 4.5 median cents / 0.17 % octave-err on
  separated stems at −6 dB vs 4.2 / 0.15 % on a clean vocal, while the *unseparated* mix
  scores 87.41 % octave-err, so separation is load-bearing **and** near-lossless; gate
  thresholds still await Lando's ratification, and only pYIN was run). **S3 did not need
  the GPU endpoint** — it ran on CPU locally. **Sole remaining blocker: S2**, and it is
  now narrow. RunPod egress is open and
  the key authenticates (R53 supersedes R49). The deployment shape is settled (R51, PR #8:
  the handler must be baked into the image as `CMD`). **The image itself is now built and
  proven** — this session built PR #8's Dockerfile unchanged (11 GB, ≈10 min) and ran the
  handler inside it end-to-end, stems out, timings returned (R53). What remains is only
  *getting that image onto an endpoint*, and this sandbox cannot push (its `GITHUB_TOKEN`
  is a proxy placeholder, not a credential).
  **GPU performance is now MEASURED (R58)** — a RunPod *Pod* (created via `POST /v2/pods`,
  results read back through `GET /v2/pods/{id}/logs`, pod terminated after) ran the 3-genre
  corpus on an A4000: **12.65 s median for a 216 s track = 17.1x realtime, ~$0.0024/song**,
  against 485 s on CPU — a **~38x** speedup that turns ADR-0001/0003's GPU requirement from
  assumption into measurement. **2 of 3 S2 gates PASS** (cost ≤$0.03/song with 12x margin;
  p50 warm ≤60 s with 47 s of headroom) on the *slowest* serverless tier.
  **What still blocks S2's closure: cold-start**, which needs a real serverless endpoint.
  Endpoint creation from a repo is **console-only (R55)** — verified across v1 REST, v2 REST
  and GraphQL, so no agent can do it. Lando connected GitHub in the RunPod console
  2026-09-01; only the endpoint creation step remains. Deploy from `main`, Dockerfile path
  `spikes/s2-runpod-worker/Dockerfile`, **container disk 30 GB** (11 GB image; the SDK
  hard-kills a worker under 10 % free) and **max workers >= 1** (the dead `voxstage-s2-spike`
  endpoint has `workersMax: 0`, which is exactly why its jobs never ran). Fallbacks: a Docker
  Hub push as `gvo555` (needs the from-desktop bridge, 530 on 2026-09-01), or allowlisting
  `proxy.runpod.net` + `ssh.runpod.io` (R53) — though R58 showed the Pod route does **not**
  need those hosts.
  Device pages current on both hosts (GitHub Pages primary, Cloudflare mirror redeployed
  2026-08-30). S2 spend: **$0.355 through 2026-08-31 (R53)** plus one ~6-minute A4000 pod at
  $0.17/hr for R58 (billing lagged at $0 when queried). **Nothing is running** — the pod was
  terminated and verified gone; the leftover `voxstage-s2-spike` endpoint has `workersMax: 0`
  and cannot bill.
- **Environment audit 2026-09-01 evening (R59, `docs/STATUS-2026-09-01.md`):**
  `api.cloudflare.com` and `api.resend.com` are **egress-denied** in this sandbox, so
  `wrangler` cannot deploy from here and the `CLOUDFLARE_API_TOKEN` (a `cfat_` Account
  API Token) and `RESEND_API_KEY` are present but **unverified**. Working routes: the
  Cloudflare MCP connector (inventory + D1/KV/R2 create, no deploy), RunPod REST (full),
  and Lando's machine via the from-desktop bridge (**wrangler OAuth-logged-in with write
  scopes; Docker Desktop NOT running**). `S3_API_KEY` is the R2 endpoint URL, not a key.
  The sandbox Docker daemon starts on demand; `DOCKER_API_KEY` is present but unverified.
  M1's deploy path must be GitHub Actions (+ repo secret), desktop wrangler, or an
  allowlist change — never assume the sandbox can reach Cloudflare.
- **Product decisions confirmed by Lando (2026-08-28, T/F interview):** reuse prior
  VoxApp/VoxReport tech ("Rangefinder") for profile capture · accounts-first, no
  anonymous mode · 2-stem separation for MVP · live scoring is launch-blocking ·
  iOS 14.5+ floor CONFIRMED · beta GPU design ceiling ~$50/month · no export/download of
  processed audio in MVP (ADR-0007 stands) · free beta, no payments · Phase 0 spikes run
  and reviewed before M1 · milestones delivered end-to-end as single draft PRs.
- **Prior art to reuse:** "Rangefinder" (`/home/lando555/VoxFiles` on Lando's machine,
  readable via the from-desktop MCP connector) — his deployed vocal-range PWA: in-house
  FFT-accelerated MPM pitch engine (`verify/mpm-fast.mjs` + engine in `index.html`),
  accuracy harness with frozen baseline (`verify/harness.mjs`), PWA shell, Cloudflare
  Pages deploy. Audit = Spike S0, **complete — reuse map in R50** (engine ports into a
  worklet unmodified; the rAF/Analyser capture harness deliberately does not; tessitura
  algorithm = minimal contiguous window ≥60% voiced time). Its production guardrail:
  echoCancellation, noiseSuppression, AND autoGainControl all OFF — "turning any of them
  on distorts the pitch reading."
- **M1 plan: merged as plan of record** (PR #3, 2026-08-30) — `docs/M1-PLAN.md`. §6
  decisions made by Lando 2026-08-30: **React 18 + Vite** (delegated, with a stated
  top-tier frontend quality mandate — see plan §1), **Resend** (OAuth-at-scale
  evaluated → deferred with triggers, plan §3), **`voxstage`/`voxstage-staging`**,
  **Biome**. Still open: sending domain, `CLOUDFLARE_API_TOKEN`, and the M1 go itself —
  merging the plan did NOT authorize the build (rule 1 stands).
- **PRs #7, #8 and #9 all merged 2026-09-01** on Lando's explicit in-session permission
  ("permission to proceed with merge and deploy"), so the §6 decisions, the S2 worker
  contract and the S3 harness + R53–R57 are now on `main`. **One caveat carried forward: R51's "no worker logs exist"
  is wrong** — it holds only for API v1; API v2 streams them (R55), so M2 is NOT forced to
  make the worker self-report through its job output.
- **Open items awaiting Lando (see `docs/STATUS-2026-09-01.md` §6):** **the S2 endpoint
  deploy** — three paths: (A) sandbox rebuild + Docker Hub push with `DOCKER_API_KEY` +
  `PATCH` the existing endpoint via REST v1 (agent-executable if the key is valid and
  Lando says go); (B) Lando starts Docker Desktop and the bridge builds/pushes; (C) console
  Import Git Repository (R55, ~5 min) · **ratify S3's gate thresholds** (R57 proposes
  octave-err ≤ 5 %, median ≤ 25 ¢, voicing ≥ 85 %) · **M1 deploy path** (GitHub Actions +
  `CLOUDFLARE_API_TOKEN` repo secret recommended) · OTP sending domain · M1 approval after
  the Phase 0 exit report. **No longer needed:** allowlisting the RunPod *API* domains, or
  `zenodo.org` — both done.
- **Sessions:** do NOT spawn sibling sessions via the API — the environment's setup
  script fails them on arrival ("Setup script failed", non-recoverable, verified twice
  2026-08-29). This session owns Phase 0 follow-ups, PR watching, and the exit report.

## Repo map

| Path | Purpose |
|---|---|
| `CLAUDE.md` | This guide — rules, state, constraint quick-reference |
| `docs/ARCHITECTURE.md` | Full system architecture: planes, components, flows, data model |
| `docs/RESEARCH.md` | Verified fact base with sources, dates, and confidence tiers |
| `docs/ROADMAP.md` | Phase 0 validation spikes (with pass/fail gates), MVP scope, milestones |
| `docs/M1-PLAN.md` | M1 build plan of record — tooling, layout, auth spec, CI; §6 = open decisions |
| `docs/decisions/` | ADRs — one decision per file; process in its README |

## Constraint quick-reference

Hard constraints most likely to be violated by an uninformed session. Sources in
`docs/RESEARCH.md` by ID.

| Constraint | Consequence for design | Source |
|---|---|---|
| Cloudflare cannot run stem separation (no Workers AI model; Containers are CPU-only, ≤4 vCPU) | GPU work runs on RunPod serverless | R1, R2 |
| RunPod `/run` payload cap ~10 MB | Pass audio as presigned R2 URLs, never inline | R12 |
| Workers request body ≤100 MB (Free/Pro plans) | Browser uploads go direct to R2 via presigned PUT, never through a Worker | R3, R4 |
| Rubber Band library is GPL (paid license required for App Store) | Do NOT use it; pitch shifting = `signalsmith-stretch` (MIT) | R21, R20 |
| ml5.js pitchDetection is dead (model deleted 2024) | Do NOT use it; pitch detection = `pitchy` (MPM) in an AudioWorklet | R17, R16 |
| Safari has no `noiseSuppression` / `autoGainControl` mic constraints | Pitch tracker must tolerate raw mic input | R24 |
| iOS floor: AudioWorklet requires iOS 14.5+; mic in WKWebView requires iOS 14.3+ | Proposed minimum: iOS 14.5 (awaiting Lando confirmation) | R24, R25 |
| App Store guideline 4.8: own-account-only auth is exempt from Sign in with Apple | Auth stays email-OTP only; adding any social login triggers the requirement | R27 |
| R2 egress is free; storage $0.015/GB-mo | Stream audio to clients from R2 directly; don't proxy | R5 |
| Real-world mobile browser audio round-trip latency is significant (~100 ms measured on desktop Safari; mobile worse) | Latency calibration is a designed onboarding feature; scoring applies the measured offset | R26 |

## Verification protocol for future sessions

- Cloudflare platform facts: verify against the official `cloudflare/cloudflare-docs`
  GitHub repo (builds developers.cloudflare.com) — direct vendor-site fetches may be blocked
  by the sandbox egress proxy.
- Library facts (license, version, maintenance): verify via the npm registry and the
  project's own repo/README, not blogs.
- Record new verified facts in `docs/RESEARCH.md` with URL, quote, and date; record new
  decisions as ADRs. Do not silently contradict an Accepted ADR — supersede it with a new
  one.
