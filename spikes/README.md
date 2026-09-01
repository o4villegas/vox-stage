# Phase 0 validation spikes

Approved by Lando 2026-08-28 ("go"). All code here is **throwaway** — it proves physics,
then production code is written fresh (docs/ROADMAP.md). Gates live in the roadmap;
results get recorded as new entries in docs/RESEARCH.md.

## Status — 2026-08-30

| Spike | Sandbox-executable part | Result | Device/credential part | Status |
|---|---|---|---|---|
| S0 Rangefinder audit | read via desktop connector | partial (R34) → **complete (R50)**: FFT engine confirmed deployed; engine ports, capture harness doesn't; profile algorithm + harness methodology mapped | — | **CLOSED — audit complete, reuse map in R50** |
| S1 client audio chain | stretch + pitchy bench, headless Chromium | **PASS on desktop CPU** (R35): stretch 22.3× realtime, pitchy 3,824 win/s @ 1.5 mean cents | iPhone iOS 18.7: **playback+shifter PASS twice** (R39, R40); mic runs on GitHub Pages settled the EC question — **all processing OFF** (R41 clean, R42 EC-on collapse) | **CLOSED — pass; guardrail confirmed on device** |
| S2 RunPod pipeline | Docker Hub base tag verified; worker+driver written | not run | `RUNPOD_API_KEY` present in env | **blocked: environment egress policy denies RunPod API hosts (R49)** — allow the domains, bounce the session, then run the runbook below |
| S3 melody extraction | scoring math property tests (R37); extractor half measured on synthetic mixes with human f0 truth (R56/R57) | **PASS both halves** — separated stems score **4.5 median cents / 0.17% octave-err / 99.8% voicing** at −6 dB, vs **4.2 / 0.15%** on a clean vocal. Decisive control: the *unseparated* mix scores **87.41% octave-err** at the same SNR, so separation is load-bearing and near-lossless | ran on CPU locally — **did not need the GPU endpoint** (R56) | **PASS on proposed gates; thresholds await Lando's ratification.** Only pYIN evaluated (ROADMAP also names torchcrepe); synthetic mixes = upper bound (R57) |
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

## S2 execution (key is in the environment; blocked on egress policy, R49)

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
