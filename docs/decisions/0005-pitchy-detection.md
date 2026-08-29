# ADR-0005: McLeod Pitch Method for real-time pitch detection — port the in-house Rangefinder engine

**Status:** Accepted 2026-08-29 (PR #1 merged on Lando's explicit instruction) · proposed 2026-08-28 (revised same day after Lando confirmed prior-tech reuse)

## Context
Live scoring and profile capture need monophonic vocal F0 tracking in the browser at
interactive rates, including on iOS where mic input arrives without noise suppression or
auto gain (R24). The algorithm class is settled — MPM is what production web tuners use
(R19); CREPE-in-browser alternatives are dead (ml5 — R17) or heavy (R18). Within MPM there
are two candidate implementations: `pitchy` (MIT npm package — R16), and **Rangefinder's
in-house engine** (Lando's deployed vocal-range PWA, `/home/lando555/VoxFiles`): an
FFT-accelerated NSDF implementation (Wiener–Khinchin autocorrelation, exact
prefix-sum normalization, 0.93-threshold peak picking with parabolic interpolation,
clarity semantics) with an automated accuracy harness against a frozen baseline
(`verify/harness.mjs`) and production deployment experience. Lando confirmed reuse of
prior tech (2026-08-28).

## Decision
Port the Rangefinder MPM engine into a VoxStage AudioWorklet as the primary pitch tracker
(profile capture, live scoring, calibration), clarity-gated; port its accuracy-harness
pattern as the engine's regression test. `pitchy` is the reference implementation and
drop-in fallback (same algorithm family, same contract shape). Server-side melody
extraction is a separate concern (pYIN/torchcrepe, decided in Spike S3) — client and
server trackers need not match. Exact port-vs-rewrite scope is fixed by the Spike S0
audit.

## Consequences
- Zero external dependency for the core tracker; in-house code with an existing
  accuracy-verification method and production history.
- Rangefinder's guardrail (all mic processing off) transfers as a starting policy; the
  scoring-while-playback case (backing-track bleed vs. echoCancellation distortion) is
  explicitly resolved in Spike S1.
- Noisy-room robustness remains part of Spike S1's pass criteria.
- If MPM proves insufficient for scoring fairness, a stripped CREPE worklet is the
  researched fallback (R18) at a CPU cost.
