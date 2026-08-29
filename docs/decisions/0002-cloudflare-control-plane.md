# ADR-0002: Cloudflare as the control plane (Workers, D1, R2, Queues)

**Status:** Accepted 2026-08-29 (PR #1 merged on Lando's explicit instruction) · proposed 2026-08-28

## Context
Lando's stated platform preference is Cloudflare, with Vercel/others acceptable only if
necessary. Verified: Workers + static assets serve the SPA and API; D1 covers MVP metadata;
R2 offers presigned direct uploads (R4) and **zero egress fees** (R5) — significant for an
app that streams audio stems to phones; Queues provides async job orchestration with
retries/DLQs and works on the $5 Workers Paid plan (R6). The one workload Cloudflare cannot
host is GPU inference (R1, R2) — resolved externally in ADR-0003. Workers' 100 MB request
cap (R3) is irrelevant once uploads bypass Workers via presigned PUT.

## Decision
Cloudflare hosts everything except GPU inference: Workers (Hono) for API + static assets,
D1 for metadata, R2 for all audio artifacts (presigned PUT uploads, presigned/short-lived
GET playback), Queues for the separation-job pipeline, Worker secrets for credentials.

## Consequences
- Fixed platform cost ~$5/mo + usage; free R2 egress makes streaming economics predictable.
- Audio bytes never transit Workers — every audio path is client↔R2 or RunPod↔R2 by URL.
- Vercel is not needed; no requirement forced a platform switch.
