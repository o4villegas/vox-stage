# ADR-0001: Two-plane architecture — client real-time, server async analysis

**Status:** Accepted 2026-08-29 (PR #1 merged on Lando's explicit instruction) · proposed 2026-08-28

## Context
VoxStage needs both millisecond-sensitive audio work (synced playback, pitch shifting,
live pitch scoring) and heavy compute (stem separation, melody extraction). Round-tripping
live audio through a server adds unacceptable latency on top of an already-significant
mobile audio round-trip (~100 ms desktop Safari; mobile worse — R26). Meanwhile browser
clients demonstrably can run real-time pitch detection (R16, R19) and real-time WASM pitch
shifting (R20), but cannot run GPU-class separation at mobile-acceptable speed (R15).

## Decision
Split the system into (a) a **client performance plane** — all real-time DSP in Web Audio
(playback, `signalsmith-stretch` shifting, BiquadFilter EQ, `pitchy` tracking, scoring,
latency calibration) — and (b) an **async analysis plane** — stem separation + melody/key
analysis as server-side jobs whose results (stems, melody contour JSON) are delivered to
the client for local use. No real-time audio path touches a server.

## Consequences
- Zero server cost and zero server latency for the core singing experience.
- Client CPU load becomes the binding constraint → validated first (Spike S1); fallback is
  server-pre-rendered shifted variants.
- Analysis results must be fully self-describing artifacts (stems + contour) so the client
  needs no live backend during a performance session.
