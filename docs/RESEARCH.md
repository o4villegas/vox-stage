# VoxStage Research Base

All entries verified **2026-08-28** unless noted. Cite entries by ID (R1, R2, …) instead of
re-asserting facts from memory. Re-verify pricing/limits/maintenance facts older than ~90
days before building new decisions on them.

**Confidence tiers**
- **T1** — verified against a primary source (vendor docs repo, npm registry, project README,
  official guideline text).
- **T2** — sourced, but secondary (third-party reviews/benchmarks, search snapshots), or a
  well-searched absence claim. Treat as directional until independently confirmed.
- **T3** — engineering judgment / derived estimate. Must be validated by a Phase 0 spike or
  measurement before being treated as fact.

**Method caveat:** the research sandbox's egress proxy blocked direct fetches of several
first-party sites (moises.ai, apple/google app stores, runpod.io marketing pages, caniuse,
MDN web pages). Cloudflare facts were verified from the official `cloudflare/cloudflare-docs`
GitHub repo at HEAD dated 2026-08-28 (the source that builds developers.cloudflare.com);
browser-support facts from the `@mdn/browser-compat-data` npm dataset v8.0.13 (published
2026-08-27); the rest via official GitHub repos, the npm registry, and search snapshots of
the cited pages.

---

## Platform — Cloudflare (all T1, from cloudflare/cloudflare-docs @ HEAD 2026-08-28)

- **R1.** Workers AI catalog (86 models) contains **no music source-separation model**. Audio
  models are ASR (`@cf/openai/whisper*`, Deepgram Flux/Nova-3), TTS (Deepgram Aura, MeloTTS),
  and voice-activity detection; no audio-to-audio task exists.
  https://developers.cloudflare.com/workers-ai/models/
- **R2.** Cloudflare Containers: GA since **2026-04-13** on Workers Paid; **CPU-only** (no GPU
  anywhere in docs; third-party confirms "does not offer GPUs"); max instance `standard-4` =
  4 vCPU / 12 GiB / 20 GB disk; billed per 10 ms active (CPU $0.000020/vCPU-s).
  https://developers.cloudflare.com/changelog/post/2026-04-13-containers-sandbox-ga/ ·
  https://developers.cloudflare.com/containers/platform/limits/ ·
  https://developers.cloudflare.com/containers/platform/pricing/
- **R3.** Workers request-body limits follow the zone plan: **Free/Pro 100 MB**, Business
  200 MB, Enterprise 500 MB. https://developers.cloudflare.com/workers/platform/limits/
- **R4.** R2 presigned URLs are the documented pattern for direct user uploads; per-object
  `PutObject`, expiry 1 s–7 days. https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- **R5.** R2 pricing: Standard $0.015/GB-month (IA $0.01); Class A $4.50/M ops, Class B
  $0.36/M; **zero egress fees**; free tier 10 GB-month + 1M Class A + 10M Class B monthly.
  https://developers.cloudflare.com/r2/pricing/
- **R6.** Queues: available on **Free and Paid** Workers plans (Free: 10k ops/day, 24 h
  retention; Paid: 1M ops/month included then $0.40/M, retention to 14 days; ~3 ops per
  delivered message). Supports batching, retries, dead-letter queues, and HTTP **pull
  consumers** for infrastructure outside Workers.
  https://developers.cloudflare.com/queues/platform/pricing/ ·
  https://developers.cloudflare.com/queues/platform/limits/

## GPU stem separation

- **R7 (T2).** Replicate `ryan5453/demucs`: runs on A100 40 GB; "approximately $0.026 to
  run"; "predictions typically complete within 23 seconds."
  https://replicate.com/ryan5453/demucs
- **R8 (T2).** Modal GPU pricing: T4 $0.000164/s, L4 $0.000222/s, A10G $0.000306/s; $30/mo
  free credits. Community Demucs-on-Modal example: `sastraxi/stemset`.
  https://modal.com/pricing · https://github.com/sastraxi/stemset
- **R9 (T2/T1 mix).** RunPod Serverless: flex workers from **$0.58/hr (16 GB A4000/A4500)**
  and **$0.69/hr (24 GB L4/A5000)** ≈ $0.00019/s; bills per second of active execution,
  scale-to-zero; **active (always-on) workers at 40% discount**, no cold starts.
  https://www.runpod.io/pricing · https://docs.runpod.io/serverless/pricing
- **R10 (T2).** RunPod FlashBoot cold starts: marketing claims "sub-200 ms"/"as low as
  500 ms"; an independent 2026 test measured **563 ms best, 42 s worst** — benefits
  concentrate on endpoints with steady traffic.
  https://www.runpod.io/product/serverless ·
  https://sergeyshmakov.github.io/mineru-runpod/blog/2026-05-26-runpod-flashboot-mechanism-investigation/
- **R11 (T1).** RunPod's official `runpod-workers` org has **no Demucs worker**; plan is our
  own Docker image from `runpod-workers/worker-template`. Community reference exists:
  `dwin-gharibi/runpod-demucs` ("Demucs v4 (htdemucs, mdx_extra) | 4-stem and 6-stem
  separation, vocals, karaoke"). https://github.com/dwin-gharibi/runpod-serverless-workers
- **R12 (T1 for /run; T2 for /runsync cap).** RunPod job flow: async `/run` + optional
  `webhook` field ("the Serverless Endpoint will POST the response JSON to that URI");
  payload cap **10 MB on `/run`** (20 MB `/runsync` per user forum, unofficial) — pass audio
  by URL, not inline. Plain HTTPS + API key; drivable from a Cloudflare Worker/Queue
  consumer. https://docs.runpod.io/serverless/endpoints/send-requests
- **R13 (T2 → feeds a T3 estimate).** Third-party htdemucs benchmarks, ~3-min song:
  RTX 3090 ~15 s, RTX 4090 ~10 s, A100 ~8 s; A10G "~8 seconds for 3 minutes of audio."
  Combined with R9 pricing this yields a **derived, unmeasured** estimate of **<$0.01/song
  compute** — to be measured in Spike S2 before use in any financial projection.
  https://dev.to/codesugar_lin_037a57b06a4/htdemucs-vs-bs-roformer-vs-spleeter-a-2026-audio-source-separation-benchmark-2ll8 ·
  https://pub.towardsai.net/building-a-production-audio-separation-api-with-metas-demucs-a484227773f8
- **R14 (T2).** Managed separation APIs: Music.ai (Moises) ~"$0.05 per minute" for
  instrumental separation (third-party review of official pricing; $25/mo Professional plan
  exists); LALAL.AI minute packs ($15/90 min–$90/900 min) with API access on ~$15/mo Pro
  tier, per-stem billing caveat; AudioShake API is contact-sales (no published price);
  Gaudio Studio "starts at $0.14 per minute."
  https://www.aimusicpreneur.com/ai-tools/music-ai/ · https://www.lalal.ai/pricing/ ·
  https://developer.audioshake.ai/legacy-api/server-to-server ·
  https://www.gaudiolab.com/developers/resources/pricing
- **R15 (T1).** Client-side WASM Demucs exists (freemusicdemixer.com / demucs.cpp via
  Emscripten): fully in-browser, **≥4 GB RAM floor** (4 GB per WASM worker; 4/8/16/32 GB
  presets = 1/2/4/8 threads), minutes per song (early single-worker build "~17 minutes for
  an average 4-minute song"; 4 workers up to 4× faster); mobile supported since Apr 2025 but
  "best experienced on a desktop or laptop." Not viable as VoxStage's mobile-web primary
  path. https://github.com/sevagh/freemusicdemixer.com · https://freemusicdemixer.com

## Browser / iOS audio

- **R16 (T1).** `pitchy` npm: v4.1.0 (2024-01-04), MIT, McLeod Pitch Method + 0–1 clarity
  measure; "fast and accurate enough to be used in real-time applications such as tuners";
  no formal accuracy/latency benchmarks published; single maintainer, stable-not-active.
  https://github.com/ianprime0509/pitchy
- **R17 (T1).** ml5.js pitchDetection (CREPE) is effectively dead: hosted model deleted
  (issue #1489, July 2024) and the module is absent from ml5 1.x.
  https://github.com/ml5js/ml5-library/issues/1489
- **R18 (T1).** CREPE has an official browser demo (stripped model, <3% of parameters, via
  TF.js) and community browser ports (e.g., `alexcrist/autotone`); full CREPE claims SOTA
  2018, "outperforming pYIN and SWIPE." https://marl.github.io/crepe ·
  https://github.com/marl/crepe
- **R19 (T1).** Production web-tuner precedent for MPM-in-browser: rtcd.io chromatic tuner
  ("industry-recognized McLeod Pitch Method… processed locally in your browser") and
  `@chordbook/tuner` (Web Audio + pitchy). https://github.com/chordbook/tuner
- **R20 (T1).** `signalsmith-stretch` npm: v1.3.2 (2025-06-27), **MIT**, published by the
  library's author (Signalsmith Audio); "JS/WASM release of the Signalsmith Stretch
  library"; upstream ships a Web Audio release (WASM/AudioWorklet).
  https://github.com/Signalsmith-Audio/signalsmith-stretch
- **R21 (T1).** Rubber Band Library is **GPL v2+**; its README states commercial terms are
  required otherwise and explicitly flags **Apple App Store distribution as requiring the
  paid licence**. `rubberband-wasm` (npm, third-party) is GPLv2.
  https://github.com/breakfastquay/rubberband
- **R22 (T1).** `soundtouchjs` v0.3.0 LGPL-2.1 (2026-02-04) and `@soundtouchjs/audio-worklet`
  v2.1.1 MPL-2.0 (2026-08-03) — actively maintained fallback, lower fidelity on full mixes.
  (npm registry.)
- **R23 (T1).** Tone.js PitchShift is a dual-delay-line doppler shifter (source JSDoc);
  documented artifact complaints (issues #383, #803). Unsuitable for full-song quality.
  https://github.com/Tonejs/Tone.js
- **R24 (T1).** Support matrix (@mdn/browser-compat-data 8.0.13, 2026-08-27): AudioWorklet —
  Safari 14.1, **iOS Safari/WebView 14.5**; getUserMedia — iOS Safari 11, **WKWebView
  enabled iOS 14.3** (WebKit announcement; requires `NSCameraUsageDescription`/
  `NSMicrophoneUsageDescription`); `echoCancellation` Safari 11+; **`noiseSuppression` and
  `autoGainControl` NOT supported in Safari/iOS Safari**; `AudioContext.outputLatency` —
  **Safari 18.4+** (older "Safari lacks outputLatency" advice is outdated); BiquadFilterNode
  (peaking/notch/highpass) universal since Safari 6 / Chrome 14.
  https://webkit.org/blog/11353/
- **R25 (T2).** Capacitor mic access works via WKWebView with the Info.plist key; iOS
  re-prompts permission on each `getUserMedia` call unless the native shell implements
  iOS 15's `WKUIDelegate decideMediaCapturePermissionFor` (Apple forums thread 734363).
- **R26 (T1 for desktop figure; T3 for mobile).** Measured round-trip audio latency, desktop
  Safari: **mean 100.02 ms** (MLS loopback + cross-correlation; WAC 2025,
  doi 10.5281/zenodo.17642262). Mobile browsers documented as higher, especially over
  Bluetooth (no published iOS-specific ms figure found). Standard calibration: loopback
  beep + cross-correlation, or manual tap-sync; seed with `outputLatency` + `baseLatency`
  where available. https://github.com/gilpanal/weblatencytest
- **R27 (T1).** App Store guideline 4.8 (Login Services) applies to apps using third-party
  or social login; "Another login service is not required if: Your app exclusively uses
  your company's own account setup and sign-in systems." **Email-only own-account auth ⇒
  Sign in with Apple not required.** https://developer.apple.com/app-store/review/guidelines/

## Market & competitors

- **R28 (T2).** Moises (Music.AI): stem separation (incl. lead/background vocals), key/chord
  detection, pitch changer, speed changer, lyrics; pitch/tempo shifting made **free**
  Oct 2025. Key change is a **manual per-song control**; multiple targeted searches found
  **no persistent vocal-range profile or range-fit auto-transpose**. Scale: 50M users +
  $40M Series A (Jan 2025), "over 60 million users" (2025); pricing ~$3.99/$9.99 tiers per
  2026 third-party reviews (first-party page proxy-blocked).
  https://www.musicbusinessworldwide.com/music-ai-raises-40m-in-series-a-round-as-its-moises-platform-hits-50m-users/ ·
  https://moises.ai/features/pitch-changer-shifter/
- **R29 (T2).** Adjacent products: LALAL.AI (splitter only); KaraFun (licensed karaoke,
  **manual** ±6-semitone key change); Smule (scoring + pitch guides; **manual**
  pitch-shifting shipped as a VIP feature, 2025); Yousician (**auto-transpose after vocal
  range calibration — but only within its licensed catalog**); Simply Sing (vocal test →
  auto-adjusts all songs to range — **closed catalog of covers, no uploads, no stems**;
  $59.99/yr); Sing Sharp (alive; training-focused); Vanido (dead); Singing Carrots (range
  test + 70k-song search by range — **advisory only, does not process audio**); Vocal Gauge
  (advisory transposer, no playback); Riffstation (killed by licensing issues, 2018-19).
  https://support.yousician.com/hc/en-us/articles/360000550225-Transposing-songs ·
  https://singingcarrots.com/docs/find-songs-by-vocal-range-or-name/ ·
  https://smule.zendesk.com/hc/en-us/articles/35739735608852-Pitch-Shifting-Backing-Track ·
  https://www.karafun.com/help/features_103.html
- **R30 (T2 — directional only).** Karaoke-app market sizing conflicts across report mills:
  $6.8–8.3B (2024–25) growing to $14.8–19.8B (2033–35). Do not present a specific TAM as
  fact. Moises's verified 30M→50M→60M+ user growth (2023→2025) is the better demand proxy.
- **R31 (T2).** Legal posture precedent: Moises ToS — users "solely responsible for ensuring
  they have all necessary authorizations… rights to upload content," personal-use framing;
  LALAL.AI terms similar ("solely responsible for the usage and distribution"). **No
  lawsuits found against separation tools (2023–2026 searches).** The label suits target
  generative tools (UMG/Sony/Warner v. Suno & Udio, June 2024 → licensing settlements
  2025). Cautionary: Riffstation's licensed-content versions were shut down over "legal
  issues." https://help.moises.ai/hc/en-us/articles/7401394754962-Terms-of-Service ·
  https://www.lalal.ai/terms-and-conditions/
- **R32 (T2).** Participation signal (survey): 29% sang karaoke at home/with friends, 25% in
  a karaoke bar, 48% never. https://www.news.market.us/karaoke-statistics/

- **R40.** Safari retest on the same iPhone (genuine Safari UA `Version/26.6 … Safari/604.1`,
  2026-08-28 21:31Z, via the Phone Lab artifact): **identical `NotAllowedError` with no
  permission prompt** — same as the in-app run (R39). Root cause revised: the claude.ai
  artifact viewer embeds pages in an iframe that does **not delegate microphone permission
  (Permissions Policy)**, so `getUserMedia` fails in EVERY browser before the OS can
  prompt; the earlier "open it in Safari" advice was wrong. Consequences: the artifact
  route is valid ONLY for playback-plane tests; mic-dependent spikes (S1 tracker, S4
  calibration) require a top-level HTTPS host (Cloudflare Pages per `spikes/README.md`,
  or equivalent). Also in this run: **playback plane re-validated in real Safari** —
  shifter ok, clock drift 28.3 ms over a 7 s soak, 0 long tasks, outputLatency 12.3 ms —
  and the artifact's fixed self-publish return loop confirmed working (delivered
  round-trip at 21:32:08Z).

- **R41.** S1 mic half, first working device pass (iPhone iOS 18.7, real Safari, via
  https://voxstage-spikes.pages.dev/s1/, 2026-08-28 22:08Z, echoCancellation OFF): mic
  permission granted; blob-URL worklet tap loaded; **pitch pipeline ran at 46.9
  windows/s — the theoretical rate (48000/1024 = 46.875)** — while the shifted 2-stem
  loop played. iOS applied exactly `{echoCancellation:false}` and exposed no
  noiseSuppression/autoGainControl fields (corroborates R24). outputLatency 9.7 ms.
  Clock drift 510 ms over the run (duration not captured by this report version;
  possible app-switch pause or mic-engagement route glitch — see open questions).
  `longTasks: 0` is NOT evidence of health: Safari likely doesn't support the longtask
  observer, and the page swallows that failure.
- **R42.** Same device/page, **echoCancellation ON** (2026-08-28 22:09Z): iOS applied
  `{echoCancellation:true}` and rebuilt the audio route (mic `groupId` changed between
  passes). Result: **pitch window rate collapsed 46.9 → 29.2 windows/s** (mic samples no
  longer arriving at real-time rate — duration-normalized, so valid despite unknown run
  lengths) and **clock drift exploded to 11.39 s** (vs 0.51 s EC-off). Interpretation:
  requesting EC engages iOS's voice-processing audio path, which throttles/stalls the
  Web Audio graph during simultaneous playback + capture. **Decision input: EC must stay
  OFF on iOS** — this independently re-derives Rangefinder's production guardrail and
  extends it (not just pitch distortion; pipeline starvation). Design consequence:
  scoring must tolerate backing-track bleed in the raw mic signal (clarity gating,
  level dominance of the singer's voice, optional headphones-recommended mode) rather
  than lean on EC.

## Absence claims (inherently T2 — cannot prove a negative)

- **R33.** No product found that combines: user-uploaded songs + stem separation + persistent
  measured vocal profile + automatic range-fit transposition + live pitch feedback. Each
  half exists separately (R28, R29). A niche or stealth competitor could exist.

## Phase 0 measurements (own experiments — T1 for the stated environment)

- **R34.** S0 partial — Rangefinder audit (read from `/home/lando555/VoxFiles` via the
  from-desktop connector, 2026-08-28, **interrupted by connector disconnect**). Verified
  before the cut: project = "Rangefinder", a deployed vocal-range PWA (Cloudflare Pages,
  wrangler runbook); engine contract `mpm(buf, sr) -> {hz, clarity} | null`, 60–1200 Hz
  clamp, NSDF peak picking at 0.93 threshold + parabolic interpolation, FFT-accelerated
  (Wiener–Khinchin) with exact prefix-sum normalization, behavior-locked to a frozen
  baseline via `verify/harness.mjs`; production guardrail: echoCancellation,
  noiseSuppression, autoGainControl all OFF ("turning any of them on distorts the pitch
  reading"). **Still unread:** full engine body (74/124 lines of `mpm-fast.mjs`),
  `index.html` app (33 KB), `harness.mjs`, `splice-mpm.mjs` — resume when the connector
  returns.
- **R35.** S1 sandbox bench (headless Chromium 141, container x86 CPU, 2026-08-28; code:
  `spikes/s1-client-audio/`): `signalsmith-stretch` rendered 60 s of 2-stem stereo mix at
  +3 semitones in 2.69 s wall — **22.3× realtime**. `pitchy` (MPM, 2048-sample windows,
  hop 512): **3,824 windows/s**; accuracy on a known 220 Hz ±5 Hz vibrato tone with noise:
  **mean 1.54 / max 2.89 abs cents**, 465/465 windows above 0.9 clarity. Desktop-class
  numbers only — the S1 gate still requires real-phone runs.
- **R36.** S4 math validation (Node 22, 2026-08-28; `spikes/s4-latency-cal/xcorr.test.mjs`):
  normalized cross-correlation recovered chirp offsets with **0-sample error in 5/5
  cases**, including 0.08 gain against 0.06-σ noise (SNR ≈ 6 dB); ~0.8 s per search over
  2 s @ 48 kHz. Physical round-trip numbers still require device runs.
- **R37.** S3 scoring-math validation (Node 22, 2026-08-28;
  `spikes/s3-melody-eval/contour-score.test.mjs`): octave-folded cents scoring passes all
  property tests (perfect=100, octave-up=100, 50-cents-flat=50, semitone-off=0, silence=0,
  unvoiced-ref excluded; fold bounded to [-600, 600)).
- **R38.** Docker Hub tag `pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime` exists (registry
  API, 2026-08-28) — S2 worker base image.
- **R39.** First real-device run (Lando's iPhone, iOS 18.7, **inside the claude.ai in-app
  viewer**, 2026-08-28, via the Phone Lab artifact): **playback plane PASSES on iPhone** —
  signalsmith-stretch WASM AudioWorklet loaded (data:-URL module under the artifact CSP),
  2-stem loop played at +3 st for a 20 s smoke soak at 48 kHz with **clock drift −1.3 ms,
  0 long tasks, outputLatency 12.3 ms, baseLatency 2.7 ms**. **Mic path blocked in the
  in-app viewer**: `getUserMedia` → `NotAllowedError` ("not allowed by the user agent or
  the platform in the current context") for both the tracker and S4 — mic tests require
  opening the page in Safari (R24: iOS Safari supports getUserMedia). The artifact
  self-publish results channel worked (delivered:true round-trip). Still pending: Safari
  rerun for mic tracking + S4 latency, longer soak, echoCancellation A/B, Bluetooth.

## Could-not-verify register (as of 2026-08-28)

- Moises first-party pricing page; exact free-tier definition.
- Official LALAL.AI API rate card; Music.ai per-module rate card; any AudioShake price.
- RunPod 4090-tier serverless rate; official `/runsync` 20 MB cap.
- iOS-specific (Safari/WKWebView) round-trip latency in ms — desktop figure only (R26).
- Formal pitchy accuracy/latency benchmarks (none published).
- Current Smule MAU (nothing fresher than 50M, 2018).
- Cloudflare "no GPU in Containers" as an explicit official sentence (verified as absence
  from official docs + third-party confirmation).
