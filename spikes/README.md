# Phase 0 validation spikes

Approved by Lando 2026-08-28 ("go"). All code here is **throwaway** — it proves physics,
then production code is written fresh (docs/ROADMAP.md). Gates live in the roadmap;
results get recorded as new entries in docs/RESEARCH.md.

## Status — 2026-08-28

| Spike | Sandbox-executable part | Result | Device/credential part | Status |
|---|---|---|---|---|
| S0 Rangefinder audit | read via desktop connector | partial (R34) | — | **blocked mid-audit: connector disconnected; resume when back** |
| S1 client audio chain | stretch + pitchy bench, headless Chromium | **PASS on desktop CPU** (R35): stretch 22.3× realtime, pitchy 3,824 win/s @ 1.5 mean cents | iPhone iOS 18.7: **playback+shifter PASS twice** — in-app (R39) and real Safari (R40) | **mic half blocked on the artifact host in ALL browsers (R40)** — needs the wrangler pages.dev deploy below (+ long soak, EC A/B) |
| S2 RunPod pipeline | Docker Hub base tag verified; worker+driver written | not run | needs `RUNPOD_API_KEY` (+ endpoint, test song URL) | **blocked: no RunPod credentials in this environment** |
| S3 melody extraction | scoring math property tests | **PASS** (R37) | `eval_pyin.py` on real stems (runs after S2) | client half done |
| S4 latency calibration | xcorr unit tests (R36); v2/v3 harness iterations | v1 alignment invalid on iOS (R44) → v2 validated alignment (R45) → v3 gating rejects noise (R47) | iPhone RTT **≈ 70 ms, spread 7.5 ms across 2 sessions** (R45, R47) | **CLOSED — PASS with documented deviation, accepted by Lando 2026-08-29** |

## Running the device pages (S1, S4)

**PRIMARY HOST (2026-08-29): https://o4villegas.github.io/vox-stage/** — `/s1/` and
`/s4/`, served from the `gh-pages` branch (auto-enabled by pushing it, R46; updates =
push new files to `gh-pages`, or let `.github/workflows/spike-pages.yml` do it on merges
to main touching `/spikes`). Older mirror at https://voxstage-spikes.pages.dev
(Cloudflare Pages, deployed via the desktop bridge; its `/s4/` runs the outdated v1
harness until redeployed). Mic prompts normally on both (top-level HTTPS) — unlike the
claude.ai artifact host, whose iframe blocks mic in all browsers (R40).

Open it on each phone, run both tests, tap **Copy results JSON**, and paste the JSON back
into the session — it gets recorded in docs/RESEARCH.md against the gates.

To redeploy after changing spike pages (staging dir lives at
`/home/lando555/voxstage-spikes-deploy` on Lando's machine):

```sh
npx wrangler pages deploy site --project-name voxstage-spikes --commit-dirty=true
```

On S1, test with **echoCancellation both off and on** while the stems play — that's the
open question from Rangefinder's guardrail (ROADMAP S1).

## S1 rebuild (only needed if app.mjs changes)

```sh
cd spikes/s1-client-audio && npm install && npx esbuild app.mjs --bundle --format=esm --outfile=dist/bundle.js && cp index.html dist/
# sandbox/desktop bench:
CHROMIUM_PATH=/opt/pw-browsers/chromium node bench.mjs
```

## S2 execution (once `RUNPOD_API_KEY` is in the environment)

Key-only path — try before building anything:

1. **Endpoint**: check whether a usable Demucs worker image is already published
   (start from the community repo noted in R11 — verify its README for a registry
   image ref) and create a serverless endpoint via RunPod's REST API (24 GB-class flex
   worker, e.g. L4/A5000). If no published image exists, fall back to building
   `spikes/s2-runpod-worker/Dockerfile` (needs Docker — Lando's machine via the
   from-desktop bridge, or RunPod's GitHub-build integration if offered).
2. **Test audio**: use a public-domain recording URL (e.g., from Wikimedia Commons) as
   `AUDIO_GET_URL` — legal, and reachable by RunPod. `put_urls` may be omitted: the
   handler then measures separation without uploading stems (timings are the gate data;
   stem-quality listening needs the uploads and can be a second pass).
3. **Run twice** (cold, then warm):
   `RUNPOD_API_KEY=… RUNPOD_ENDPOINT_ID=… AUDIO_GET_URL=… GPU_USD_PER_HR=0.69 node spikes/s2-runpod-worker/driver.mjs`
4. **Record**: delayTime (cold-start), executionTime, dashboard-billed cost/run, and —
   with uploads — stem quality across 3 genres → gates in docs/ROADMAP.md.

The key lives ONLY as an environment variable (cloud-environment settings, or Lando's
own machine) — never in chat, never committed. NOTE: env-var changes reach newly
provisioned containers; a long-running session's container keeps its original env.
