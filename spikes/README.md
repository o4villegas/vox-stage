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
| S4 latency calibration | cross-correlation unit tests | **PASS** (R36): 0-sample error at SNR ≈ 6 dB | blocked on the artifact host in all browsers — the frame doesn't delegate mic permission (R40) | math proven; **needs the pages.dev deploy** |

## Running the device pages (S1, S4)

Phones require HTTPS for mic access. Easiest path (matches the Rangefinder tooling):

```sh
# S1 — from the repo root, on a machine with wrangler logged in:
npx wrangler pages deploy spikes/s1-client-audio/dist --project-name voxstage-spikes
# S4 is dependency-free; deploy its folder directly:
npx wrangler pages deploy spikes/s4-latency-cal --project-name voxstage-spikes-s4
```

Open the `.pages.dev` URL on each phone, run, tap **Copy results JSON**, and paste the
JSON back into the session — it gets recorded in docs/RESEARCH.md against the gates.

On S1, test with **echoCancellation both off and on** while the stems play — that's the
open question from Rangefinder's guardrail (ROADMAP S1).

## S1 rebuild (only needed if app.mjs changes)

```sh
cd spikes/s1-client-audio && npm install && npx esbuild app.mjs --bundle --format=esm --outfile=dist/bundle.js && cp index.html dist/
# sandbox/desktop bench:
CHROMIUM_PATH=/opt/pw-browsers/chromium node bench.mjs
```

## S2 execution (once credentials exist)

1. Build & push the image: `docker build -t <registry>/voxstage-s2 spikes/s2-runpod-worker && docker push …`
2. Create a serverless endpoint from it in the RunPod console (24 GB-class flex worker).
3. `RUNPOD_API_KEY=… RUNPOD_ENDPOINT_ID=… AUDIO_GET_URL=… GPU_USD_PER_HR=0.69 node spikes/s2-runpod-worker/driver.mjs`
4. Record: cold vs warm delay, execution seconds, dashboard-billed cost, stem quality
   across 3 genres → gates in docs/ROADMAP.md.

Provide the API key as an environment variable in the cloud-environment settings (or
run the driver from your own machine) — never paste it into chat or commit it.
