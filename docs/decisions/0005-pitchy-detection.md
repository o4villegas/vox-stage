# ADR-0005: pitchy (McLeod Pitch Method) for real-time pitch detection

**Status:** Proposed · 2026-08-28

## Context
Live scoring and profile capture need monophonic vocal F0 tracking in the browser at
interactive rates, including on iOS where mic input arrives without noise suppression or
auto gain (R24). Options: `pitchy` — MIT, MPM with a clarity measure, the approach used by
production web tuners (R16, R19); CREPE in-browser — the ml5.js wrapper is dead (model
deleted — R17) and full CREPE is heavy for continuous mobile use, though a stripped tfjs
demo exists (R18).

## Decision
Use `pitchy` inside an AudioWorklet for all client-side pitch tracking (profile capture,
live scoring, calibration), gated by its clarity measure. Server-side melody extraction is
a separate concern (pYIN/torchcrepe, decided in Spike S3) — client and server trackers need
not match.

## Consequences
- Small, dependency-light, MIT; proven approach class on mobile browsers.
- No published formal accuracy benchmarks (R16) — noisy-room robustness is explicitly part
  of Spike S1's pass criteria.
- If MPM proves insufficient for scoring fairness, a stripped CREPE worklet is the
  researched fallback (R18) at a CPU cost.
