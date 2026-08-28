# VoxStage Roadmap

Status: proposed. **No phase below is approved to build until Lando says so — including
Phase 0.** Spike code is throwaway, lives under `/spikes/`, and never graduates into the
app; production code is written fresh in Phase 1+ against what the spikes proved.

## Phase 0 — Validation spikes (~1 week) — converts judgment into measured fact

Gate thresholds below are proposed **[judgment]** and tunable at kickoff. Every spike's
results (numbers, device list, dates) get recorded in `docs/RESEARCH.md` as new T1 entries.

### S0 — Rangefinder reuse audit (analysis only — no code; may run before spike approval)
Inventory Rangefinder (`/home/lando555/VoxFiles`, via the from-desktop connector):
the MPM engine, capture UX flow, accuracy harness + frozen-baseline pattern, PWA shell.
Decide port-vs-rewrite per piece; carry the harness pattern into VoxStage's testing
strategy.
- **Output:** reuse inventory recorded in `docs/RESEARCH.md`; M3 plan updated; ADR-0005
  finalized.

### S1 — Client audio chain on real phones (the highest-risk unknown)
Throwaway page: two stems playing, `signalsmith-stretch` shifting ±3 semitones live, mic
open with `pitchy` tracking — all simultaneously.
- **Pass:** 10 continuous minutes on a mid-range Android (~3-year-old class) and an iPhone
  with no audio dropouts, responsive UI, stable pitch readout; shift artifacts acceptable
  by ear at ±3 st (note the ± where they stop being acceptable).
- **Also resolve here:** mic-constraint policy while a backing track plays. Rangefinder's
  production guardrail is all processing OFF (echoCancellation included) for pitch
  accuracy, but scoring-during-playback may need echoCancellation to reject
  backing-track bleed. Test both; record the winner in ARCHITECTURE §3.
- **Fail →** fallback designs, in order: reduce to single pre-mixed instrumental stem;
  server-side pre-rendered shifted variants (kills instant key preview; adds render cost).

### S2 — Separation pipeline end-to-end on RunPod
Deploy a Demucs worker (community image or our own) with the URL-in/webhook-out contract;
run ≥3 known songs across genres.
- **Measure:** cold-start time, warm runtime, actual billed cost/song, stem quality
  (subjective, per genre), end-to-end wall time from upload to ready.
- **Pass:** measured cost ≤ $0.03/song; p50 warm end-to-end ≤ 60 s; stems usable for all 3
  genres.
- **Fail →** try alternate model config (mdx_extra), bigger GPU tier, or fall back to a
  managed API (R14) with the same contract.

### S3 — Melody extraction accuracy on separated stems
Run candidate extractors (pYIN, torchcrepe) on the S2 vocal stems for songs whose melodies
we know.
- **Pass:** contour visually/aurally faithful; octave-error rate low enough to score
  against (define numerically during the spike with reference annotations).
- **Fail →** extractor ensemble / confidence-gated scoring; worst case, scoring limited to
  chorus sections with strong confidence.

### S4 — Latency calibration repeatability
Beep-loopback calibration on iPhone Safari + Android Chrome, 5 runs per device, wired and
Bluetooth.
- **Pass:** per-device offset repeatable within ±20 ms (wired); Bluetooth documented and
  gated behind a warning.
- **Fail →** manual tap-sync calibration as primary; unscored practice mode as floor.

**Phase 0 exit:** all four spikes pass (or accepted fallbacks chosen) → results logged →
Lando signs off Phase 1.

## Phase 1 — MVP build (approval required per milestone)

Working agreement (Lando, 2026-08-28): each approved milestone is built end-to-end and
delivered as one reviewable draft PR — no mid-milestone check-ins except on blockers or
genuine scope questions. Beta cost control: per-user upload quotas sized so worst-case
GPU spend stays under **~$50/month**, finalized from S2's measured cost/song.

| Milestone | Scope | Done means |
|---|---|---|
| M1 | Repo scaffolding, CI, deploy pipeline, email-OTP auth | deployed hello-app with working sign-in on a phone |
| M2 | Upload → R2 → Queue → RunPod → stems/analysis back → status UI | a real song goes upload→ready end-to-end in prod |
| M3 | Vocal profile capture flow | profile saved and re-loadable on a phone |
| M4 | Sync engine: recommendation + synced playback (shift, stem mix, EQ) | a synced song plays in the recommended key |
| M5 | Live scoring + calibration + post-song summary | scored performance saved; feels fair on test devices |
| M6 | Mobile polish, error states, quotas, beta hardening | 10 external beta users complete the full loop |

## MVP P1 (post-M6, pre-iOS)
Problem-frequency EQ personalization · performance history/progress view · setlists for
open-mic prep.

## Explicitly OUT of MVP scope
Social features · sharing/export of processed audio (ADR-0007) · payments · native iOS app
(Capacitor is its own phase) · multi-provider auth · song catalog of any kind.

## Later — iOS App Store phase
Capacitor shell (iOS 14.5+ floor), native mic-permission delegate (R25), App Store review
prep. Pre-launch: counsel review of ToS/copyright posture (R31).
