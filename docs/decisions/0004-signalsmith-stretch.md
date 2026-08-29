# ADR-0004: signalsmith-stretch (MIT) for client-side pitch shifting

**Status:** Accepted 2026-08-29 (PR #1 merged on Lando's explicit instruction) · proposed 2026-08-28

## Context
The "sync" feature shifts a full mix ±several semitones in real time, tempo preserved, on
phones — and the codebase must stay App-Store-distributable later. Options verified:
`signalsmith-stretch` — official JS/WASM + AudioWorklet release by the library's author,
MIT, built for real-time shifting (R20); Rubber Band — high quality but **GPL, with its
README explicitly requiring a paid commercial licence for App Store distribution** (R21);
soundtouchjs — LGPL/MPL, active, lower fidelity on full mixes (R22); Tone.js PitchShift —
delay-line doppler, documented artifacts, unsuitable (R23).

## Decision
Use `signalsmith-stretch` as the only pitch-shift engine. Rubber Band is disallowed absent
a purchased commercial licence (a new ADR would record that purchase). soundtouchjs is the
designated fallback if S1 exposes signalsmith-stretch problems on target devices.

## Consequences
- MIT keeps web and future iOS distribution unencumbered.
- Real-device performance and the acceptable-shift range (±4–5 st working assumption) are
  validated in Spike S1.
