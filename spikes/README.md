# Phase 0 validation spikes

Approved by Lando 2026-08-28 ("go"). All code here is **throwaway** — it proves physics,
then production code is written fresh (docs/ROADMAP.md). Gates live in the roadmap;
results get recorded as new entries in docs/RESEARCH.md.

## Status — 2026-08-31

| Spike | Sandbox-executable part | Result | Device/credential part | Status |
|---|---|---|---|---|
| S0 Rangefinder audit | read via desktop connector | partial (R34) → **complete (R50)**: FFT engine confirmed deployed; engine ports, capture harness doesn't; profile algorithm + harness methodology mapped | — | **CLOSED — audit complete, reuse map in R50** |
| S1 client audio chain | stretch + pitchy bench, headless Chromium | **PASS on desktop CPU** (R35): stretch 22.3× realtime, pitchy 3,824 win/s @ 1.5 mean cents | iPhone iOS 18.7: **playback+shifter PASS twice** (R39, R40); mic runs on GitHub Pages settled the EC question — **all processing OFF** (R41 clean, R42 EC-on collapse) | **CLOSED — pass; guardrail confirmed on device** |
| S2 RunPod pipeline | handler validated end-to-end (R52); image builds and runs (R53); **GPU separation MEASURED on a real A4000 pod (R58): 12.65 s median for a 216 s track = 17.1x realtime, $0.0024/song, vs 485 s on CPU — a ~38x speedup** | egress open, key valid (R53); build context made deployment-safe (R55) | **2 of 3 gates PASS on conservative hardware** — cost ≤$0.03/song (12x margin) and p50 warm ≤60 s (47 s headroom). **Cold-start still unmeasured**: needs a serverless endpoint, and that creation step is console-only (R55) |
| S3 melody extraction | scoring math property tests (R37); extractor half measured on synthetic mixes with human f0 truth (R56/R57) | **PASS both halves** — separated stems score **4.5 median cents / 0.17% octave-err / 99.8% voicing** at −6 dB, vs **4.2 / 0.15%** on a clean vocal. Decisive control: the *unseparated* mix scores **87.41% octave-err** at the same SNR, so separation is load-bearing and near-lossless | ran on CPU locally — **did not need the GPU endpoint** (R56) | **PASS on proposed gates; thresholds await Lando's ratification.** Only pYIN evaluated (ROADMAP also names torchcrepe); synthetic mixes = upper bound (R57) |
| S4 latency calibration | xcorr unit tests (R36); v2/v3 harness iterations | v1 alignment invalid on iOS (R44) → v2 validated alignment (R45) → v3 gating rejects noise (R47) | iPhone RTT **≈ 70 ms, spread 7.5 ms across 2 sessions** (R45, R47) | **CLOSED — PASS with documented deviation, accepted by Lando 2026-08-29** |

## Running the device pages (S1, S4)

**PRIMARY HOST (2026-08-29): https://o4villegas.github.io/vox-stage/** — `/s1/` and
`/s4/`, served from the `gh-pages` branch (auto-enabled by pushing it, R46; updates =
push new files to `gh-pages`, or let `.github/workflows/spike-pages.yml` do it on merges
to main touching `/spikes`). Mirror at https://voxstage-spikes.pages.dev (Cloudflare
Pages, deployed via the desktop bridge; redeployed 2026-08-30 from main `c9b09fe` — now
serves the same v3 harness). **⚠ 2026-09-01: the `voxstage-spikes` Pages project is now
Git-connected to `o4villegas/vox-stage` (Lando, console), production branch `main`, blank
build config. With automatic deployments ON, every merge to `main` republishes the raw
repo tree to the mirror and breaks `/s1/` (happened once, deployment `9da55c5b` from
`67a5313`; restored the same day by redeploying `site/`). Automatic deployments must stay
OFF on that project; it is not the M1 deploy path. Mic prompts normally on both (top-level HTTPS) — unlike the
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

2. **GPU Pod — USED SUCCESSFULLY 2026-09-01 (R58); no proxy host needed.** An earlier note
   here said reaching a Pod requires `proxy.runpod.net` to be allowlisted. That is only true
   if you want a *shell* or an HTTP port. You do not: `POST /v2/pods` takes the benchmark as
   the container command, and **`GET /v2/pods/{id}/logs`** streams its stdout back as SSE,
   so results come out through the plain API. This is how S2's GPU numbers were measured
   while `proxy.runpod.net` was still 403-blocked.

   ```sh
   # create (A5000/L4/A4500 are often out of stock — fall back to A4000; it is the slowest
   # serverless tier, so its numbers are a conservative floor)
   curl -X POST https://api.runpod.io/v2/pods -H "Authorization: Bearer $RUNPOD_API_KEY" \
     -H 'content-type: application/json' --data @body.json
   curl -N -H "Authorization: Bearer $RUNPOD_API_KEY" \
     "https://api.runpod.io/v2/pods/<id>/logs?source=container"
   curl -X DELETE -H "Authorization: Bearer $RUNPOD_API_KEY" \
     https://api.runpod.io/v2/pods/<id>          # ALWAYS: a live pod bills by the hour
   ```

   Two traps: the container **relaunches after its command exits**, so a benchmark repeats
   until you delete the pod (useful for repeat measurements, expensive if forgotten); and
   Python `urllib` gets a **Cloudflare 403 (error 1010)** from this API — use curl.

   What a Pod *cannot* measure is serverless **cold-start**, queue behaviour, or real
   serverless billing. Those need an endpoint, and endpoint creation from a repo is
   **console-only** (R55).

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
