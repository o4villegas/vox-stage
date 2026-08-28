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

- **Phase:** Architecture proposed (this docs PR). **No application code exists.**
- **Next step:** Phase 0 validation spikes (`docs/ROADMAP.md`) — defined but **not yet
  approved to build**.
- **Open decisions awaiting Lando:** formal architecture sign-off; iOS floor 14.5+
  confirmation; GPU budget ceiling for beta; Phase 0 spike approval.

## Repo map

| Path | Purpose |
|---|---|
| `CLAUDE.md` | This guide — rules, state, constraint quick-reference |
| `docs/ARCHITECTURE.md` | Full system architecture: planes, components, flows, data model |
| `docs/RESEARCH.md` | Verified fact base with sources, dates, and confidence tiers |
| `docs/ROADMAP.md` | Phase 0 validation spikes (with pass/fail gates), MVP scope, milestones |
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
