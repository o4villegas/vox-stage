# Architecture Decision Records

One decision per file, numbered, never edited after acceptance — superseded by a new ADR
instead. Format: Context / Decision / Consequences, with facts cited as `Rn` →
`../RESEARCH.md`.

**Status meanings**
- **Proposed** — in a draft PR; not yet binding.
- **Accepted** — the PR adding it was merged by Lando. Binding on all future sessions.
- **Superseded by ADR-NNNN** — no longer binding.

An agent that needs to act against an Accepted ADR must first propose a superseding ADR and
get it merged.

| # | Decision |
|---|---|
| 0001 | Two-plane architecture: client real-time, server async analysis |
| 0002 | Cloudflare as control plane (Workers, D1, R2, Queues) |
| 0003 | RunPod serverless GPU for separation + analysis |
| 0004 | signalsmith-stretch (MIT) for pitch shifting; Rubber Band rejected |
| 0005 | pitchy (McLeod Pitch Method) for real-time pitch detection |
| 0006 | Single-method email-OTP auth |
| 0007 | Copyright posture: per-user processing, no dedup, no export |
| 0008 | Portable SPA now, Capacitor for iOS later (floor iOS 14.5) |
