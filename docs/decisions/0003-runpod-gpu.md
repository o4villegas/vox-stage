# ADR-0003: RunPod serverless GPU for stem separation + song analysis

**Status:** Accepted 2026-08-29 (PR #1 merged on Lando's explicit instruction) · proposed 2026-08-28

## Context
Stem separation (Demucs/htdemucs class) needs a GPU for acceptable speed. Cloudflare offers
none: no separation model in Workers AI (R1); Containers are CPU-only, ≤4 vCPU (R2).
Client-side WASM separation needs ≥4 GB RAM and minutes per song — not viable on phones
(R15). Options compared: RunPod serverless (~$0.58–0.69/hr flex, per-second, scale-to-zero
— R9), Replicate (~$0.026/run — R7), Modal (similar per-second GPU rates — R8), managed
APIs at ~$0.05–0.14/min ≈ $0.15–0.40/song (R14). The team already holds a RunPod account.
Third-party benchmarks put htdemucs at ~8–15 s per 3-minute song on modern GPUs (R13),
implying <$0.01/song on RunPod — a derived, unmeasured estimate. Known trade-offs: cold
starts measured 0.5–42 s (R10); no official Demucs worker, so we ship our own Docker image
(R11); ~10 MB payload cap forces URL-based I/O (R12).

## Decision
Run separation + melody extraction + key detection as one job on RunPod serverless flex
workers, using our own Docker image built from `runpod-workers/worker-template`. Cloudflare
Queue consumers drive it via async `/run` with presigned R2 GET/PUT URLs and a webhook
callback. The job contract (URL-in/webhook-out) is vendor-neutral so Replicate/Modal/managed
APIs remain drop-in fallbacks.

## Consequences
- Estimated 15–20× cheaper per song than managed APIs — **must be confirmed by measurement
  in Spike S2 before any financial projection uses it**.
- Cold-start wait is a first-song UX cost; an always-on worker (-40%) is the lever if
  volume justifies it (R9).
- We own a small piece of non-Cloudflare infrastructure (Docker image + endpoint config).
