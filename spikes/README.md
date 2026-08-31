# Phase 0 validation spikes

Approved by Lando 2026-08-28 ("go"). All code here is **throwaway** — it proves physics,
then production code is written fresh (docs/ROADMAP.md). Gates live in the roadmap;
results get recorded as new entries in docs/RESEARCH.md.

## Status — 2026-08-31

| Spike | Sandbox-executable part | Result | Device/credential part | Status |
|---|---|---|---|---|
| S0 Rangefinder audit | read via desktop connector | partial (R34) → **complete (R50)**: FFT engine confirmed deployed; engine ports, capture harness doesn't; profile algorithm + harness methodology mapped | — | **CLOSED — audit complete, reuse map in R50** |
| S1 client audio chain | stretch + pitchy bench, headless Chromium | **PASS on desktop CPU** (R35): stretch 22.3× realtime, pitchy 3,824 win/s @ 1.5 mean cents | iPhone iOS 18.7: **playback+shifter PASS twice** (R39, R40); mic runs on GitHub Pages settled the EC question — **all processing OFF** (R41 clean, R42 EC-on collapse) | **CLOSED — pass; guardrail confirmed on device** |
| S2 RunPod pipeline | handler **validated end-to-end on a real song** (R52): 216.6 s track, both stems, demucs 4.1.0 — CPU 0.45× realtime | egress unblocked; API reachable | **blocked on deployment shape (R51)**: RunPod serverless requires the handler baked into the image as `CMD`; a `dockerStartCmd` bootstrap on a generic image never claims jobs. Needs a built+pushed image (registry credentials) or a GPU Pod |
| S3 melody extraction | scoring math property tests | **PASS** (R37) | `eval_pyin.py` on real stems (runs after S2) | client half done |
| S4 latency calibration | xcorr unit tests (R36); v2/v3 harness iterations | v1 alignment invalid on iOS (R44) → v2 validated alignment (R45) → v3 gating rejects noise (R47) | iPhone RTT **≈ 70 ms, spread 7.5 ms across 2 sessions** (R45, R47) | **CLOSED — PASS with documented deviation, accepted by Lando 2026-08-29** |

## Running the device pages (S1, S4)

**PRIMARY HOST (2026-08-29): https://o4villegas.github.io/vox-stage/** — `/s1/` and
`/s4/`, served from the `gh-pages` branch (auto-enabled by pushing it, R46; updates =
push new files to `gh-pages`, or let `.github/workflows/spike-pages.yml` do it on merges
to main touching `/spikes`). Mirror at https://voxstage-spikes.pages.dev (Cloudflare
Pages, deployed via the desktop bridge; redeployed 2026-08-30 from main `c9b09fe` — now
serves the same v3 harness). Mic prompts normally on both (top-level HTTPS) — unlike the
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

## S2 execution — deployment shape settled the hard way (R51)

Egress and credentials are no longer the blocker; the **deployment shape** is. RunPod
serverless requires the handler baked into the image as its `CMD`. A `dockerStartCmd`
bootstrap over a generic image never claims jobs (three variants tried, R51), and the
platform exposes no worker logs to tell you why. Do not retry that path.

Two viable routes:

1. **Baked image (production-shaped, preferred).** Build
   `spikes/s2-runpod-worker/Dockerfile` and push to a registry RunPod can pull, then point
   a template at it with no `dockerStartCmd`. Needs registry credentials — this cloud
   session has none (ghcr.io push is denied for its git-scoped GitHub token), so it runs
   on Lando's machine via the from-desktop bridge:

   ```sh
   docker build -t <registry>/voxstage-s2:1 spikes/s2-runpod-worker
   docker push <registry>/voxstage-s2:1
   ```

   Then create the endpoint (24 GB-class flex worker, e.g. L4/A5000) and run the
   benchmark below. Give the container generous disk — the SDK kills workers under 10 %
   free (R51).

2. **GPU Pod.** `/pods` in the REST API creates a Pod with shell access, sidestepping the
   serverless worker contract entirely. Reaching it needs its proxy host allowlisted.

Once an endpoint serves jobs, the benchmark is written and ready:

```sh
NODE_USE_ENV_PROXY=1 RUNPOD_API_KEY=… RUNPOD_ENDPOINT_ID=… GPU_USD_PER_HR=0.69 \
  node spikes/s2-runpod-worker/bench.mjs
```

It runs the 3-genre CC BY / BY-SA corpus (R52), prints delayTime / executionTime /
cost-per-song against the ROADMAP gates, and writes `s2-results.json`.
`NODE_USE_ENV_PROXY=1` is required — Node's built-in fetch ignores `HTTPS_PROXY` without it.

The key lives ONLY as an environment variable (cloud-environment settings, or Lando's
own machine) — never in chat, never committed. NOTE: env-var changes reach newly
provisioned containers; a long-running session's container keeps its original env.
