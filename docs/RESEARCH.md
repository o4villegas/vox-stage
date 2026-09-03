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

- **R43.** Pass-1 (EC-off) follow-ups from Lando (2026-08-28): run length ≈ **1 minute**;
  he **switched apps mid-run** — which accounts for the 510 ms clock drift as a
  backgrounding pause, not underruns (pass-1 pipeline health therefore reads as good);
  and he heard **system-level output ducking**: "the music compressed when I sang. My
  voice was sidechained to the audio." The spike page's graph has no path that could
  cause this (the mic tap never feeds the output), so this is iOS/WebKit applying
  dynamic output processing while capture is live, even with echoCancellation off.
  Caveats: subjective single listen; possible conflation with the EC-on run; needs a
  controlled A/B in M5. Product consequences: (a) the iOS *web* experience will duck the
  backing track under the singer's voice — acceptable for practice, imperfect for
  performance feel; (b) dynamic ducking incidentally *reduces* backing-track bleed while
  the user sings (mildly helps scoring); (c) a native shell (Capacitor) can configure
  AVAudioSession directly and likely eliminate it — strengthening ADR-0008's App Store
  phase; (d) headphones mode sidesteps it entirely.

- **R44.** S4 first device run **FAILED ITS VALIDITY CHECK — harness defect, device not
  judged** (iPhone iOS 18.7, Safari, pages.dev, 2026-08-28 ~22:15Z): runs
  [−1934.3, 649.8, 1126.8, 63.6, 636.9] ms, sd 1075.6 → gate fail. A negative round trip
  is physically impossible, proving the v1 alignment reference (first-worklet-callback
  time stamp) is unreliable on iOS WebKit — the pre-flagged untested assumption. The
  correlator core itself remains proven (R36). The single physically plausible value,
  **63.6 ms, is recorded as hypothesis only** (would be an excellent RTT; one clean-looking
  value in an invalid series is not a result). **Harness v2** (committed, redeploy
  pending): every capture block stamped with worklet context time, mid-stream anchoring,
  continuity check from stamps, and validity rejection (0 < RTT < 1000 ms, peak ≥ 0.4,
  gap < 5 ms) with auto-retry up to 8 chirps for 5 valid. v2 verified headlessly: in a
  no-loopback environment it rejected all 8 attempts (peak 0.032) instead of averaging
  garbage, and flagged an 8.7 ms capture gap. Roadmap fallback (manual tap-sync) remains
  the designed next step if v2 also fails on device.

- **R45.** S4 v2 device run (iPhone iOS 18.7, Safari, GitHub Pages host, 2026-08-29
  ~22:55Z): **the v2 block-stamp alignment is validated** — no impossible values, and the
  two high-confidence matches (peak ≈ 0.80) measured **66.7 ms and 74.2 ms round-trip**,
  agreeing within 7.5 ms (inside the ±20 ms gate; the 74.2 run was auto-rejected only for
  a 1.26 s capture gap elsewhere in its buffer). The six weak matches (peak 0.386–0.45)
  form an exact comb: 386.6/628.6 and 404.4/646.3/888.1/1130.0 ms, spacing **241.9 ±
  0.1 ms** — the correlator locking onto a periodic ambient sound (~4.13 Hz; e.g., ~124
  BPM audio) rather than the chirp **[interpretation: judgment, quantitatively
  supported]**. Formal gate: FAIL (sd 303.7 across contaminated accepts). Root cause:
  v2's peak validity floor (≥ 0.4) admits noise lock-ons. **Harness v3**: floor raised
  to ≥ 0.6 (cleanly separates the 0.80 real cluster from the 0.45 noise cluster), page
  copy warns to pause music/TV. Working hypothesis pending the v3 rerun: true built-in
  speaker↔mic RTT ≈ 70 ms on this device — notably better than the 100 ms desktop-Safari
  reference (R26), and very workable for calibrated scoring.
- **R46.** GitHub Pages auto-enablement via `gh-pages` branch push **still works**
  (2026-08-29, empirical): pushing an orphan `gh-pages` branch to the public repo
  triggered GitHub's dynamic "pages build and deployment" run (conclusion: success, run
  33279499322) with no settings interaction; the Actions-based `configure-pages`
  `enablement: true` route had failed ("Resource not accessible by integration") because
  GITHUB_TOKEN cannot create the Pages site. Spike pages now serve at
  https://o4villegas.github.io/vox-stage/ from `gh-pages`.

- **R47.** S4 v3 device run (same iPhone, 2026-08-29 ~23:05Z): the raised peak floor
  **worked** — all six periodic-noise lock-ons were rejected (peaks 0.365–0.445 < 0.6;
  they again form a comb, spacing ~227 ms — the rhythmic interferer persisted at a
  slightly different tempo). One valid run: **66.7 ms, peak 0.815**; one more strong
  match (**73.7 ms, peak 0.821**) rejected solely for a 1.33 s capture gap. **Aggregate
  across both sessions, every high-confidence match (peak ≥ 0.80): 66.7, 66.7, 73.7,
  74.2 ms — total spread 7.5 ms**, well inside the ±20 ms repeatability gate; working
  value: RTT ≈ 70 ms on this device (vs the 100 ms desktop-Safari reference, R26).
  Formal in-run gate (5 valid chirps, sd ≤ 20 ms) not achieved: 6/8 attempts consumed by
  environmental rhythmic audio, 1/8 by the gap. Two production notes: (a) a >1 s capture
  stall shortly after mic engagement recurred in both sessions — production calibration
  should discard the first chirp / wait ~2 s after mic open; (b) noisy rhythmic
  environments are the realistic venue condition — calibration UX must detect and
  retry, exactly as the v3 gating does. **Gate disposition: ACCEPTED on aggregated
  evidence by Lando (2026-08-29, in-session) — S4 closes as pass-with-documented-
  deviation (4 high-confidence measurements across 2 sessions instead of 5 in one run).**
- **R48.** Demucs weights licensing (2026-08-29): the community RunPod worker's manifest
  claims "htdemucs* weights are CC-BY-NC (non-commercial)" (T2, uncorroborated). Primary
  sources: `facebookresearch/demucs` LICENSE = **MIT (Meta Platforms)**; README states
  "Demucs is released under the MIT license" with **no weights-specific carve-out**;
  weights are served from Meta's dl.fbaipublicfiles.com with no separate license
  referenced in the loader (`demucs/pretrained.py`). Likely conflation with the MusDB
  training dataset's research-only terms — a models-trained-on-restricted-data gray area
  shared industry-wide. Disposition: **no primary evidence of a non-commercial weights
  restriction**; logged for the pre-launch counsel review (with ADR-0007's items), and
  S2 benchmarks `hdemucs_mmi` / `mdx_extra` alongside `htdemucs` so a fallback model is
  measured either way.
- **R49.** This cloud environment's egress policy blocks ALL RunPod API hosts
  (rest.runpod.io, api.runpod.ai, api.runpod.io → connection rejected, 2026-08-29).
  `RUNPOD_API_KEY` is present in fresh containers, but S2 cannot execute until the
  environment's network policy allows the RunPod domains (Lando's environment settings).
  Re-probed ×4 across 2026-08-30: still blocked. *(**SUPERSEDED 2026-09-01** — the RunPod
  API hosts are now reachable and the key authenticates; see R53. R49 describes the
  2026-08-29/30 state only.)*
- **R50.** S0 Rangefinder audit **COMPLETE** (2026-08-30, from-desktop bridge restored;
  completes R34). Read in full: `verify/mpm-fast.mjs` (124 ln), `verify/harness.mjs`
  (344 ln), `verify/splice-mpm.mjs` (124 ln), `index.html` (751 ln), `CLAUDE.md` deploy
  protocol. Findings for VoxStage reuse:
  - **Deployed engine = the FFT one.** Production `index.html` carries the spliced
    FFT-accelerated `mpm` (body identical to `mpm-fast.mjs`); `public/index.html` is
    byte-identical to root (`diff -q`); `v1_original.html` is the frozen O(n²) baseline,
    never deployed.
  - **Engine ports cleanly** (ADR-0005): `mpm(buf, sr)` is pure and dependency-free —
    self-contained radix-2 FFT, exact prefix-sum `div` normalization, NSDF in Float32 to
    mirror baseline truncation, byte-for-byte baseline peak picking (highest×0.93 +
    parabolic interpolation), `typeof`-guarded MIN_HZ/MAX_HZ (60/1200 fallback). Drops
    into an AudioWorklet unmodified.
  - **Capture harness does NOT port:** the live path polls an AnalyserNode
    (fftSize 2048) from `requestAnimationFrame` with wall-clock `dt` (clamped ≤0.1 s) —
    hop timing is display-rate-dependent, so windows can repeat or skip vs the audio
    clock. VoxStage's worklet-driven hop (128-sample blocks → ring buffer) is a
    deliberate deviation, not a port. Production gates: RMS ≥ 0.008 pre-gate,
    clarity ≥ 0.90 ingest, WIN 2048 / HOP 1024 (file path).
  - **Profile algorithm (the actual reuse for vocal profiles):** per-semitone stats
    E1–C6 (MIDI 28–84) {voiced time, mean clarity, cents jitter, onsets}; a note is
    "active" at ≥0.35 s voiced and ≥6 gated frames; floor/ceiling = extreme active
    notes; **tessitura = minimal contiguous note window holding ≥60% of voiced time**;
    stretch = active notes outside the band; break candidates (needs ≥20 s voiced):
    interior notes with mean clarity < range mean − 0.02 and/or cents stdev > 1.6× range
    mean (both = "hard" flag, one = "soft"). Persisted as slim per-note aggregates
    (localStorage there; D1 per the VoxStage data model).
  - **Verification methodology worth copying:** harness gates = gate-agreement ≥99.5%
    with zero unexcused disagreements (excusal border ±0.005 clarity), cents ≤0.5,
    |Δclarity| ≤0.01, over a 128-case matrix ({sine, 5-harmonic, ±50-cent 5.5 Hz
    vibrato, 1-octave glissando} × MIDI {28..84} × {44.1, 48} kHz × amp {0.3, 0.03});
    splice justified only at ≥5× median speedup; splice tool `node --check`s a temp file
    and renames atomically. House rule: harness must pass before deploying any change
    touching detection logic.
- **R53.** S2 environment re-audit (2026-09-01, fresh container). *Numbering skips R51/R52,
  which are pending in [PR #8](https://github.com/o4villegas/vox-stage/pull/8).*
  - **RunPod egress is OPEN — R49 is resolved.** All three hosts return application-level
    responses, not proxy denials: `api.runpod.ai/v2/health` → 404,
    `rest.runpod.io/v1/endpoints` → 401 unauthenticated, `api.runpod.io/graphql` → 400.
    With `RUNPOD_API_KEY` (present, 50 chars) `GET /v1/endpoints` returns 200 + account
    data, so **the key is valid and the API is usable from this environment**.
  - **Leftover spike endpoint still exists**, idle and not billing: `voxstage-s2-spike`
    (`pw1wbkuc138zz4`, created 2026-08-30) — `workersMax: 0`, `workersMin: 0`,
    idleTimeout 120 s, GPUs A5000/L4/A4500, template `e26f2wqimu` (the R51 dead-end
    `dockerStartCmd` bootstrap over `pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime`).
    With `workersMax: 0` it cannot claim jobs. **Total S2 spend to date: $0.355**
    ($0.3184 on 2026-08-30 + $0.0362 on 2026-08-31, `GET /billing/endpoints`); nothing
    billed 2026-09-01, and `GET /billing/pods` is empty. Well inside the ~$50/mo ceiling.
  - **The REST API cannot build an image.** Its OpenAPI spec (`GET /v1/openapi.json`)
    exposes 23 paths — endpoints, templates, pods, network volumes, billing, and
    `containerregistryauth` — with **no build or git-source route**. A template can only
    point at an image some registry already serves. (`containerregistryauth` does allow a
    *private* registry pull, so the pushed image need not be public.) RunPod *can* build
    from a repo, but only through the console — see R54.
  - **THIS SANDBOX CAN BUILD THE IMAGE — and did.** An earlier draft of this entry claimed
    it could not, on the strength of `docker info` failing. That was wrong: `dockerd`,
    `containerd` and `runc` are all installed and the daemon simply was not started.
    Started it (`dockerd --host=unix:///var/run/docker.sock`, up in 2 s, Docker 29.3.1,
    overlayfs, buildkit) and registry pulls work.
  - **First build failed for a sandbox reason, not a Dockerfile defect.** `pip install`
    died with `SSLError: certificate verify failed: self-signed certificate in certificate
    chain` — this environment's TLS-intercepting egress proxy, whose CA the build container
    does not trust. `runpod` failed identically to `demucs`, which is what rules out a
    package-specific cause; the surface error `No matching distribution found for demucs`
    is misleading. Fix is documented in `/root/.ccr/README.md`: build with `--network
    host`, copy `/root/.ccr/ca-bundle.crt` into the context, set `PIP_CERT` /
    `REQUESTS_CA_BUNDLE` / `SSL_CERT_FILE` and the proxy vars. **Only needed inside this
    sandbox — the committed Dockerfile must NOT carry it.**
  - **PR #8's Dockerfile is sound, built with only that overlay added.** Result:
    `DOCKER_BUILD_EXIT=0`, image **11 GB**. Layer timings — apt/ffmpeg 48.7 s ·
    `pip install demucs runpod requests` 29.5 s · weight preload (htdemucs +
    hdemucs_mmi) 326.4 s · export 27.9 s; **≈10 min including the 146 s base pull**,
    comfortably inside RunPod's 30-minute docker-build cap (R54).
  - **Resolved versions match R52's measured baseline exactly:** demucs **4.1.0**, torch
    **2.5.1+cu124**, torchaudio 2.5.1+cu124, runpod SDK **1.12.0**, numpy 2.1.2, requests
    2.34.2. The deps are unpinned, so this is today's resolution, not a guarantee —
    pinning `demucs==4.1.0` and `runpod==1.12.0` would make the image reproducible against
    R52. (demucs 4.1.0 is the current PyPI release, published 2026-07-11, `requires_python
    >=3.10`; the base image ships Python 3.11.10.)
  - **The handler was validated INSIDE the built image**, via the RunPod SDK's local mode
    (R51 finding 3): served a 15 s MP3 over `--network host`, ran the image with no
    `RUNPOD_WEBHOOK_GET_JOB`, and it consumed `test_input.json` and returned
    `separate_s 19.96 · audio_duration_s 15.05 · realtime_factor 0.75 (CPU, no GPU)` with
    both stems produced (2,654,252 bytes each) and `cuda_available: false`. So the whole
    URL-in → separate → timings contract works in the real image, not just as a loose
    script. *(0.75× here vs R52's 0.45× is a different CPU and a 15 s clip — fixed
    overhead amortizes differently. Not comparable, and neither is the GPU gate figure.)*
  - **⚠ THE VALIDATION IMAGE MUST NEVER BE PUSHED.** Because the sandbox overlay used `ENV`,
    the built image carries `HTTPS_PROXY=http://127.0.0.1:44539`,
    `HTTP_PROXY=http://127.0.0.1:44539`, and `PIP_CERT`/`REQUESTS_CA_BUNDLE`/`SSL_CERT_FILE`
    pointing at `/usr/local/share/ca-certificates/ccr-proxy.crt` (confirmed via
    `docker inspect`). On RunPod every outbound call — fetching the audio from R2, PUTting
    stems back — would be aimed at a localhost proxy that does not exist, and TLS would be
    verified against a sandbox CA. **It is a validation artifact only; it proves the
    Dockerfile, it is not a shippable image.** To produce a shippable one from this sandbox
    the overlay must use build-time `ARG` (not persisted into the image config) and delete
    the CA file in the same `RUN` layer that adds it. The clean route avoids the problem
    entirely: let RunPod build from the repo (R54), where no proxy exists.
  - **What this sandbox still cannot do is PUSH.** `GITHUB_TOKEN`/`GH_TOKEN` are 14-char
    proxy placeholders (`prox…`), not real credentials — git auth is injected by the proxy
    (`gitConfigInjection: true`), so there is nothing to hand `docker login`. This
    corroborates R51's ghcr.io finding. Registry *reachability* is fine
    (hub.docker.com 200, registry-1.docker.io and ghcr.io both answer).
  - **The GPU-Pod fallback is blocked by egress POLICY, not unreachability.** Both hosts
    resolve in DNS; the proxy's own status endpoint records
    `connect_rejected — gateway answered 403 to CONNECT (policy denial)` for
    `proxy.runpod.net:443` and `ssh.runpod.io:443`. An earlier draft called them
    "unreachable" after probing only the apex domain, which proves nothing about
    `<podid>-<port>.proxy.runpod.net`. **So an allowlist ask is still live** — the three
    RunPod *API* domains were allowlisted, these two were not. (`docs.runpod.io` and
    `www.runpod.io` are blocked too; use the `runpod/docs` GitHub repo instead, the same
    workaround CLAUDE.md prescribes for Cloudflare.)
  - **Lando's machine is a working push path** (from-desktop bridge, verified 2026-09-01):
    Docker **28.4.0, daemon up**, Docker Hub credential **resolves** — username `gvo555`,
    served by the Docker Desktop credential helper (`credsStore: desktop.exe`, a WSL
    setup; the `auths` entry itself is empty, so an earlier "already authenticated
    per config.json" reading was right by luck, not by evidence). Docker's **actual**
    daemon disk has **348.9 GB free** (1006.9 GB total, 606.8 GB used) — an earlier draft
    quoted 834 GB, which is the WSL *user* distro's disk, not the one the daemon writes
    to. No local GPU. `vox-stage` is **not yet cloned** there.
- **R54.** RunPod builds images from GitHub — verified against the docs source repo
  (`github.com/runpod/docs` @ `d5b565d`, `serverless/workers/github-integration.mdx`,
  read 2026-09-01), because `docs.runpod.io` and `www.runpod.io` are both egress-blocked.
  "Runpod's GitHub integration simplifies your workflow by pulling your code and Dockerfile
  from GitHub, building the container image, storing it in Runpod's secure container
  registry, and deploying it to your endpoint." **This removes the registry-credential
  blocker entirely.**
  - **Console-only**, consistent with R53's finding that the REST API has no build route.
    One-time authorization: console Settings → Connections → **GitHub** → Connect. Then
    Serverless → New Endpoint → **Import Git Repository** → pick repo, **Branch**, and
    **Dockerfile Path**.
  - **Updates require creating a GitHub *release***, not merely a push: "When you make
    changes to your GitHub repository, they won't automatically be pushed to your endpoint.
    To trigger an update … create a new release." (Secondary summaries claiming every push
    redeploys are wrong — this is from the primary source.) Rollback to any previous build
    is supported from the console.
  - **Limits, all satisfied by our worker:** `docker build` ≤ **30 min** (ours ≈10 min,
    R53) · total build window ≤ 160 min · image ≤ **80 GB** (ours 11 GB) · **no privately
    hosted base images** (ours is public `pytorch/pytorch`) · **no GPU during build**
    (ours preloads weights on CPU) · one GitHub account per RunPod account.
  - **Caveat worth carrying into M2:** "Images built through Runpod's image builder service
    are designed exclusively for Runpod's infrastructure and cannot be pulled or executed
    on other platforms." Fine for a spike; it is soft lock-in for production, so M2 should
    decide deliberately between this and a normal registry push.
  - **Open risk — build context. Investigated and NEUTRALIZED; see R55.** The docs expose a
    *Dockerfile Path* setting but never state what directory becomes the build context.
- **R55.** Deep dive on the R54 build-context gap (2026-09-01). Three results, all measured.
  - **GitHub-sourced deploys are console-only — now definitive, not inferred.** Checked
    every API surface: v1 REST (`rest.runpod.io/v1/openapi.json`, 23 paths — no git route);
    **v2 REST** (`api.runpod.io`, spec at `api-reference-v2/openapi.json` in the docs repo,
    34 paths) whose `CreateEndpointRequest` flattens through its `allOf` chain to exactly 17
    properties — `args, cpu, dataCenterIds, disk, env, flashboot, gpu, image, name,
    networkVolumes, ports, registry, scaling, templateId, timeout, type, workers` — i.e.
    **only `image` or `templateId`, no repo/branch/build field**; and GraphQL, where
    introspection is disabled (`INTROSPECTION_DISABLED` from Apollo). So the console
    click-through cannot be automated away, and RunPod's build context cannot be probed
    through an API.
  - **⚠ R51 finding 4 is WRONG on API v2 — worker logs DO exist.** v2 exposes
    `GET /v2/serverless/{id}/workers` and **`GET /v2/serverless/{id}/workers/{workerId}/logs`**,
    which "Streams a serverless worker's logs as Server-Sent Events" with payload
    `{"source": "container", "line": "...", "ts": "..."}` and `Last-Event-ID` resume, plus
    `GET /v2/serverless/{id}/releases` for build/release history. **v2 verified live with
    the account key** (listed 3 endpoints). R51 concluded "no worker logs exist on any
    RunPod API surface" from the v1 surface alone and drew the M2 design consequence that
    *"any worker we ship must self-report through its job output."* **That constraint is
    not required** — M2 can read worker logs directly. Self-reporting in the job output is
    still worth keeping as a convenience, but it is no longer forced.
  - **The context risk was real, and is now designed out.** Measured locally with real
    docker builds: the current `COPY handler.py /handler.py` **fails under a repo-root
    context** (exit 1, `failed to compute cache key … not found`), which is the context
    RunPod's wording ("Dockerfile Path … if not in root") implies. A context-agnostic hunk
    builds clean under **both** contexts and lands the correct file:
    ```dockerfile
    COPY . /ctx
    RUN set -eux; \
        src="$(find /ctx -name handler.py -type f | head -n1)"; \
        test -n "$src"; \
        cp "$src" /handler.py; \
        rm -rf /ctx
    ```
    Verified against the real 11 GB image at repo-root context: build exit 0, the genuine
    `handler.py` at `/handler.py` (a decoy file elsewhere in the tree was not picked), `/ctx`
    removed, and the image still ran a job to completion (both stems, full timings). Cheap:
    the repo is 432 KB plus an 832 KB `.git`. Unambiguous: `handler.py` is unique in the tree.
  - **Route 2 is proven in production, not theoretical:** the account's two other endpoints
    already run `gvo555/smokescan-analysis:v12` and `gvo555/floorplan-v1:1.0.0`, so RunPod
    pulls from that Docker Hub namespace today.
  - **Sandbox gotchas for future sessions** (all cost time here): the agent proxy's port
    **changes between turns** — never bake `$HTTPS_PROXY` into an image or a script; setting
    `HTTP_PROXY` breaks `apt` with `405 Method Not Allowed` (it sends plain-HTTP, not
    CONNECT — pass only `HTTPS_PROXY`); and `cas-server.xethub.hf.co` (Hugging Face Xet
    storage) is egress-denied, which breaks a *re-download* of the demucs weights, so avoid
    busting that layer's cache.

- **R56.** S3's corpus problem and its resolution (2026-09-01). S3 must score pitch
  extraction **on separated stems**, so it needs a mix to separate *and* frame-level f0
  truth for the vocal inside it. No corpus supplies both under a commercially permissive
  licence:
  - **JamendoLyrics — the S2 benchmark corpus — has NO pitch annotations.** It ships
    word-level timings, line-level timings, lyrics text and audio; it is an automatic
    lyrics-alignment benchmark, "limited strictly to temporal alignment of lyrics with
    audio." So S2's benchmark stems **cannot** be scored for S3's gate. Caught before the
    endpoint run, not after.
  - **vocadito — CC BY 4.0**, verified at the primary source (Zenodo API record
    `5578807`: `"license": "cc-by-4.0"`), not just via mirdata. 40 solo monophonic singing
    excerpts, **44.1 kHz mono**, 8.7–38.7 s (median 19.5 s, 13.6 min total), with human
    frame-level f0 + voicing, two independent note annotators, lyrics, and metadata giving
    `singer_id`, `average_pitch` (**MIDI 47–65**) and `language` (7 languages). Download
    58,492,257 bytes, **md5 `dea40fd18f14d899643c4ba221b33a46`** (verified).
  - **Its f0 format is byte-identical to `eval_pyin.py`'s input contract** — the README
    states "column 1: evenly spaced timestamps in seconds / column 2: f0 values in Hz. A
    value of 0.0 indicates that no f0 is present", which is exactly `time_seconds,hz` with
    0 for unvoiced. **No converter needed**; the annotations are copied verbatim.
  - **Rejected on licence:** MedleyDB melody — CC BY-**NC**-SA 4.0 plus an access request;
    MUSDB18 — academic use only, BY-NC-SA, access-gated (46 of its tracks come from
    MedleyDB). **MIR-1K — licence could not be verified from any reachable source**, so it
    is unusable under rule 2 regardless of how well it fits technically.
  - **Design consequence — synthesize the mixes.** vocadito's vocal (annotated, CC BY) is
    laid over an accompaniment bed = the `no_vocals` stem demucs produces from an S2-corpus
    track (CC BY / CC BY-SA), at controlled SNRs. The whole chain stays commercially
    permissive, and the ground truth stays human rather than extractor-derived, which avoids
    scoring pyin against itself. **A clean-vocal control run is part of the method, not an
    extra:** an error figure from a separated stem is uninterpretable alone — it cannot
    distinguish damage done by separation from the extractor's own error on that singer.
    The separated-minus-clean delta is the number that answers S3.
  - **S3 does not need the GPU endpoint.** Separation output is determined by model and
    weights, not device, so the validated image running demucs on CPU produces stems S3 can
    score. S3 therefore runs in parallel with the S2 deployment rather than behind it.
    *(Engineering judgment: CPU/GPU differ in low-order float noise, immaterial to a pitch
    contour.)*
  - `zenodo.org` was egress-blocked; Lando allowlisted it 2026-09-01, which is what made
    vocadito reachable at all.

- **R57.** S3 extractor half — **PASS**, measured 2026-09-01 (method and corpus per R56;
  code `spikes/s3-melody-eval/{make_mixes.py,run_s3.py}`, scoring by `eval_pyin.py`
  invoked unmodified). 12 vocadito tracks stratified across **MIDI 47–65 and 7 languages**
  × **0 / −6 / −12 dB** = 36 mixes, 885 s, beds rotated across the three S2-corpus genres.
  Separation used the same `demucs.separate --two-stems vocals -n htdemucs` invocation the
  S2 handler runs (CPU; 16.1 min for all 36).
  | condition | median ¢ | octave-err | voicing | Δ median ¢ vs clean |
  |---|---|---|---|---|
  | clean vocal (control) | 4.2 | 0.15 % | — | — |
  | separated @ 0 dB | 4.3 | 0.14 % | 99.84 % | +0.1 |
  | separated @ −6 dB | 4.5 | 0.17 % | 99.83 % | +0.2 |
  | separated @ −12 dB | 4.7 | 0.17 % | 99.22 % | +0.6 |
  Worst single track at −12 dB: median 6.2 ¢, octave-err 2.62 %, voicing 90.01 %. Every
  track, every SNR, clears the proposed gates (octave-err ≤ 5 %, median ≤ 25 ¢, voicing
  ≥ 85 %) with 5–30× margin. **Gate thresholds remain Lando's to ratify** — ROADMAP leaves
  S3's numbers to be "defined during the spike", and these were proposed by this session,
  not agreed.
  - **⚠ The decisive control: pyin on the UNSEPARATED mix.** Without this, the table above
    is unfalsifiable — near-perfect scores on separated stems mean nothing if pyin does
    just as well on the raw mix, since then separation contributes nothing to melody
    extraction. It does not:
    | raw mix (no separation) | median ¢ | octave-err | voicing |
    |---|---|---|---|
    | @ 0 dB | 11.8 | **52.81 %** | 66.69 % |
    | @ −6 dB | 159.9 | **87.41 %** | 68.38 % |
    | @ −12 dB | 251.6 | **97.42 %** | 76.49 % |
    At −6 dB separation cuts the octave-error rate from **87.41 % to 0.17 %** — roughly
    500×. So demucs is doing nearly all the work, and doing it almost losslessly for pitch
    (+0.2 ¢ over a clean vocal).
  - **Architectural consequence:** stem separation is required for **scoring** (M5), not
    only for playback stems (M4). Melody extraction on an unseparated mix is not merely
    worse — at 87–97 % octave errors it is unusable. This strengthens the case for the GPU
    plane beyond what ADR-0001/0003 argued from playback alone.
  - **Limitations — read before treating these as production numbers.** The mixes are
    synthetic: a clean solo vocal laid over a bed, with **no shared reverb, bus compression
    or mastering**, so a real produced record is harder and these figures are best read as
    an **upper bound**. The beds are themselves demucs `no_vocals` stems and so may carry
    residual vocal bleed. vocadito is solo monophonic singing — arguably close to
    VoxStage's real case (one user singing) but not a produced lead vocal. **Only pYIN was
    evaluated; ROADMAP S3 also names torchcrepe**, which was not run — pYIN clears the gate
    so decisively that an ensemble looks unnecessary, but that is judgment, not measurement.
    A qualitative contour check on a real S2-corpus track (no numeric truth exists for it)
    is still worth doing once the endpoint is live.

- **R51.** RunPod Serverless worker contract — measured the hard way (2026-08-31, own
  experiments; T1 for this account/platform). Four findings, each from primary evidence:
  - **A handler must be baked into the image as its `CMD`.** RunPod's own
    `runpod-workers/worker-template` Dockerfile ends `CMD python -u /handler.py` and its
    README's deploy path is "build and push the Docker image". Overriding
    `dockerStartCmd` on a generic image (here `pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime`)
    **never produced a worker that claims jobs**: every job sat `IN_QUEUE` indefinitely
    across three template variants — the full bootstrap, a minimal
    `pip install runpod` + 6-line inline handler, and that same minimal handler with
    fitness checks disabled. All three of Lando's working endpoints use purpose-built
    `runpod/worker-*` images with `dockerStartCmd: null`; ours was the only template on the
    account overriding it. **Design consequence: M2's GPU worker ships as a built and
    pushed image, not as a boot-time install.**
  - **The SDK hard-exits on failed "fitness checks"** (`runpod` 1.12.0,
    `rp_fitness` / `rp_system_fitness`): memory ≥ 4 GB, disk ≥ 10 % free, network
    (TCP 8.8.8.8:53), CUDA version ≥ 11.8, CUDA init, and a GPU compute benchmark. Any
    failure calls `os._exit(1)` — deliberately, so the orchestrator restarts the worker —
    which from outside looks exactly like a job that is never claimed, with no logs.
    Observed directly in a local container: a disk check at 7.3 % free produced
    `Worker is unhealthy, exiting`. Escape hatches: `RUNPOD_SKIP_AUTO_SYSTEM_CHECKS=true`,
    and per-check thresholds `RUNPOD_MIN_DISK_PERCENT` / `RUNPOD_MIN_MEMORY_GB` /
    `RUNPOD_MIN_CUDA_VERSION`. **Design consequence: size container disk generously and
    treat "silent worker" as a fitness failure until proven otherwise.**
  - **Without `RUNPOD_WEBHOOK_GET_JOB` the SDK runs in local mode and exits immediately**
    (`worker.py::_is_local`); observed as `test_input.json not found, exiting`. Useful as
    the local test harness (mount a `test_input.json` and the handler runs one job), and a
    reminder that a worker which "starts fine" locally proves nothing about serving.
  - **Worker state and logs are not diagnostic.** `/health` reports container state, not
    handler state — a worker read `ready/idle` ~29 s after submit while its install could
    not have finished. No worker logs are retrievable: the REST API has no logs or workers
    endpoints (full path list checked), GraphQL introspection is disabled and `Endpoint`
    has no `workers` field, and serverless workers do not appear under `myself { pods }`.
    **Design consequence: any RunPod worker we ship must self-report diagnostics through
    its job output, because the platform gives us nothing else.**
- **R52.** S2 handler validated end-to-end (2026-08-31, local CPU, real song): the spike
  handler downloaded a 5.67 MB CC BY track, ran `htdemucs --two-stems vocals`, and returned
  both stems (38.2 MB each) with duration correctly measured at **216.61 s**; demucs 4.1.0
  on torch 2.5.1+cu124. Separation took **485.4 s on CPU = 0.45× realtime**, which is why
  the GPU is required and is the baseline the GPU run must beat. The URL-in / presigned-
  PUT-out contract (R12) is therefore proven; only the RunPod *deployment* remains open.
  Test corpus (all verified present, all commercially permissive so the benchmark carries
  no non-commercial restriction): JamendoLyrics (dataset MIT, per-track CC) —
  Rxbyn "Bad Side" (RNB, CC BY), Durch Dick und Dünn "Freifliegen" (Rock, CC BY-SA),
  Wilson Way "Te Recuerdo" (Hip-Hop, CC BY-SA).

- **R58.** S2 GPU separation **measured on real hardware** (2026-09-01), via a RunPod **Pod**
  rather than a serverless endpoint — see the scope caveat below. Lando gave in-session
  permission to deploy; the console-only GitHub route (R55) is not reachable by an agent and
  the from-desktop bridge was returning 530, so the Pod route (R53's option 3) was used
  instead — `POST /v2/pods` with the benchmark as the container command, results read back
  through **`GET /v2/pods/{id}/logs`** (the SSE log stream from R55, which is what made this
  possible without the 403-blocked `proxy.runpod.net`).
  - **Hardware:** `NVIDIA RTX A4000` (16 GB), COMMUNITY tier, $0.17/hr,
    `pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime`, torch **2.5.1+cu124**, `cuda: true`.
    A5000/L4/A4500 were all **out of stock** at both SECURE and COMMUNITY (HTTP 400, "no
    longer any instances available") — A4000 is the *slowest* serverless tier, so every
    number below is a **conservative floor**.
  - **Timings** — 3-genre CC corpus, 4 runs per track (the container relaunched after each
    exit, which conveniently gave repeats):
    | track | duration | median separation | realtime factor |
    |---|---|---|---|
    | rnb | 216.6 s | **12.65 s** | 17.1× |
    | rock | 250.3 s | **13.30 s** | 18.8× |
    | hiphop | 193.7 s | **11.56 s** | 16.8× |
  - **Against the ROADMAP S2 gates:**
    - **cost ≤ $0.03/song → PASS with ~12× margin.** At the median 12.65 s: **$0.0020/song**
      on the 16 GB serverless tier ($0.58/hr) and **$0.0024/song** on the 24 GB tier
      ($0.69/hr). *(Execution cost only — see caveat.)*
    - **p50 warm ≤ 60 s → PASS.** Separation alone is 12.7 s, leaving **47 s of headroom**
      for download + upload.
    - **stems usable across 3 genres → already evidenced**, not re-measured here: R52
      produced correct stems for a real song, and R57 showed separated vocals track pitch to
      within 0.2 ¢ of a clean vocal.
  - **GPU vs CPU: ~38×.** R52 measured the same rnb track at **485 s on CPU** (0.45×
    realtime); this is **12.65 s** (17.1× realtime). The GPU requirement in ADR-0001/0003 is
    now measured rather than assumed.
  - **⚠ SCOPE CAVEAT — this does NOT fully close S2.** A Pod is not a serverless endpoint.
    Unmeasured: **cold-start / `delayTime`** (R10's independent test saw 563 ms best, 42 s
    worst), serverless queue behaviour, and RunPod's actual serverless billing granularity
    as opposed to computed execution cost. Two of three gate criteria are satisfied on
    conservative hardware; the third needs the endpoint that only the console can create.
  - **Cost/cleanup:** pod created 15:37:35Z, terminated by API (HTTP 204) after the run,
    **0 pods remaining** — verified. Pod billing still read $0 at query time (billing lags).
  - **Also verified as a side-effect:** R9's serverless pricing, from
    `GET /v2/catalog/gpus` — L4 and A5000 serverless **$0.69/hr**, A4000/A4500 **$0.58/hr**,
    matching R9's secondary sourcing exactly (Pod tiers are cheaper: A4000 $0.17 community /
    $0.25 secure).

- **R59.** Environment + account re-audit (2026-09-01, evening, fresh container; full
  write-up in `docs/STATUS-2026-09-01.md`).
  - **Egress: `api.cloudflare.com` and `api.resend.com` are BOTH policy-denied** (proxy
    status: `connect_rejected — gateway answered 403 to CONNECT`, 7/7 attempts each), as
    are `dash.cloudflare.com`, `*.workers.dev`, `*.pages.dev` and `o4villegas.github.io`.
    So `wrangler` cannot deploy from the sandbox and neither the Cloudflare token nor the
    Resend key can be verified here. **Reachable:** `<acct>.r2.cloudflarestorage.com`
    (400 unauth), all RunPod API hosts (authenticated), npm, Docker Hub, `registry-1`,
    `raw.githubusercontent.com`.
  - **The Cloudflare MCP connector works independently of the token** (own OAuth): listed
    21 Workers, 20 R2 buckets, 22 D1 DBs; no `voxstage*` resource exists. It has D1/KV/R2
    create tools but **no Workers deploy tool**.
  - **Credentials present, shapes only:** `CLOUDFLARE_API_TOKEN` = `cfat_`+48, the
    documented *Account API Token* scannable format (cloudflare-docs
    `fundamentals/api/get-started/token-formats.mdx`: `cfat_[40 characters][checksum]`) —
    scopes **unverified**; `RESEND_API_KEY` = `re_`+33, unverified; `DOCKER_API_KEY`
    present, unverified (login test blocked by the permission classifier);
    `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` present (32/64 chars), unverified (sign
    test blocked); `CLOUDFLARE_ACCESS_KEY` 32 hex ≠ `AWS_ACCESS_KEY_ID`, purpose unclear;
    **`S3_API_KEY` is not a key — it is the R2 S3 endpoint URL.** `RUNPOD_API_KEY` verified.
  - **RunPod:** balance $41.06; `currentSpendPerHr` $0.015 — *[inference]* equals the two
    network volumes (150 GB × $0.07/GB-mo ≈ $0.0146/hr), not VoxStage; 0 pods;
    `voxstage-s2-spike` unchanged (`workersMax: 0`). v1 OpenAPI exposes
    `PATCH /endpoints/{id}` and `PATCH /templates/{id}`, so an agent can retarget the
    existing endpoint at a registry image without the console. ⚠ Two unrelated endpoints
    expose an HF token in plain `env` via the API.
  - **from-desktop bridge is UP** (530 yesterday). On Lando's machine: **Docker is NOT
    available right now** — `/usr/bin/docker` → `/mnt/wsl/docker-desktop/…` which does not
    exist, i.e. Docker Desktop is not running (R53's "daemon up" is stale); **wrangler
    4.86.0 is OAuth-logged-in** with `workers`, `workers_scripts`, `d1`, `queues`, `pages`
    write scopes — a working deploy path; the only `vox-stage` clone there is stale at
    PR #6. The bridge's `env` parameter does **not** expand `$VAR` (sent literally).
  - **Sandbox Docker daemon starts fine** (29.3.1, overlayfs) — the R53 build can be
    repeated here; a push needs a valid `DOCKER_API_KEY`.
  - **Later the same evening — Pages Git connection + wrangler-over-bridge facts.** Lando
    connected the `voxstage-spikes` Pages project to the repo (console). Its first auto-build
    (deployment `9da55c5b`, from `67a5313`, blank build config) published the raw repo tree:
    `/CLAUDE.md` → 200, `/s1/` → 404 (cloudflare-docs `pages/configuration/build-configuration`
    confirms a blank root directory = repo root). Restored by a direct upload of the staged
    `site/` from Lando's machine (deployment `52a01043`, `/`, `/s1/`, `/s4/` → 200).
    **wrangler through the from-desktop bridge is non-TTY, and in that mode `wrangler pages
    deploy` refuses the OAuth login and demands `CLOUDFLARE_API_TOKEN`** (measured); wrapping
    the command in `script -q -c "…" /dev/null` gives it a pseudo-TTY and it proceeds on the
    OAuth token. The bridge's own call ceiling is **60 s regardless of `timeout_ms`**, so a
    deploy must be backgrounded (`nohup … &`) and its log read on a later call. **Workers
    Builds** (cloudflare-docs `workers/ci-cd/builds/`) is verified as a token-free deploy
    path: Cloudflare pulls from GitHub and runs `npx wrangler deploy` on the production
    branch, `npx wrangler versions upload` on others. Also installed Cloudflare's official
    Claude Code plugin per `developers.cloudflare.com/agent-setup/prompt.md` (fetched via the
    bridge; the vendor host is egress-blocked here): 13 skills + 5 MCP server definitions,
    **user-scoped in this ephemeral container only** — it does not persist across sessions,
    and its MCP servers need an interactive OAuth this session cannot perform.
  - **Workers Builds failure cause — MEASURED** (log pasted by Lando, build `0fa40aa8`,
    2026-09-01T20:57Z, non-production branch): the builder ran `npx wrangler versions upload`
    (wrangler 4.128.0) and failed with **`✘ [ERROR] Missing entry-point to Worker script or
    to assets directory`** — i.e. no `wrangler.jsonc`/`main`/`assets` in the repo. Not a
    config error on Cloudflare's side; it resolves itself the moment M1 adds
    `wrangler.jsonc` + a Worker entry at the project root. Preview builds use
    `versions upload`, production (`main`) uses `wrangler deploy`, matching the docs.

- **R60.** M1 build-time verifications (2026-09-03 UTC, local WSL session on Lando's
  machine — it reaches `api.cloudflare.com`, npm, Resend docs; R59's egress wall does not
  apply here). Sources: npm registry (`npm view`), cloudflare-docs pages named inline,
  resend.com/docs, and commands run in this session.
  - **npm versions at pin time:** `hono` 4.13.5 · `wrangler` 4.128.0 (2026-09-01) ·
    `vitest` 4.1.11 · **`@cloudflare/vitest-plugin` 1.1.3** — the Workers Vitest
    integration was **renamed** from `@cloudflare/vitest-pool-workers` (cloudflare-docs
    changelog 2026-08-19; the old name still publishes, 0.22.0) · `@biomejs/biome` 2.5.11 ·
    **`react` 19.2.8** (the React 18 line ends at 18.3.1; the 2026-08-30 "React 18 + Vite"
    decision is taken as "React + Vite", major re-verified per rule 3) · `vite` 8.2.2
    (`@vitejs/plugin-react` 6.1.1 requires vite ^8) · **`typescript` latest is 7.0.2**
    (the new compiler line) — pinned **5.9.3** for ecosystem safety · `@types/node` 22.20.1.
    Peer ranges checked: vitest-plugin needs vitest ^4.1; vitest supports vite ^6–^8.
  - **Workers Builds** (`workers/ci-cd/builds/configuration/`, `build-image/`,
    `api-reference/`): "Currently, Workers Builds does **not** honor the configurations
    set in Custom Builds within your Wrangler configuration file" — the Build command is a
    dashboard/API setting; dependencies are installed automatically (opt out with
    `SKIP_DEPENDENCY_INSTALL`); build image Node default **24.18.0**, **22.23.2
    preinstalled**, overridable via `NODE_VERSION`, `.nvmrc` or `.node-version`; default
    deploy commands `npx wrangler deploy` (production branch) and `npx wrangler versions
    upload` (other branches), and "Workers Builds will use the Wrangler version set in
    your package.json". The **Builds API requires a user-scoped token** with "Workers
    Builds Configuration: Edit" (+ "Workers Scripts: Read"); account tokens "are not
    supported". **Measured:** wrangler's OAuth token → `GET /workers/scripts` 200 (the
    `voxstage-staging` tag is `652ed635955f466182fee9b7e2d76f5b`) but
    `GET /builds/workers/{tag}/triggers` → **403 `Authentication error` (code 10000)**, so
    no agent on this machine can set the Build command; Lando must (dashboard, ~1 min).
    Interim: `"postinstall": "npm run build"` in package.json builds `app/dist` during the
    automatic install.
  - **Preview URLs** (`workers/versions-and-deployments/preview-urls/`): `preview_urls`
    config key (wrangler ≥ 3.91); on wrangler ≥ 4.44 it defaults to the `workers_dev`
    setting; Workers Builds posts a **branch alias** `<branch>-<worker>.<subdomain>.workers.dev`
    plus a per-commit URL as a PR comment. **Measured:** skeleton commit `2f8dda4` → build
    `27fc48c8` **success** (started 2026-09-03T00:53:55Z; the first green check on this
    repo) → `https://claude-vox-stage-m1-voxstage-staging.lando555.workers.dev/` 200
    text/html and `/api/ping` → `{"ok":true,"service":"voxstage-staging",…}`. The
    §8 skeleton dry-run reproduced locally: exit 0, `Total Upload: 0.36 KiB`.
  - **Static assets** (`workers/static-assets/routing/single-page-application/`):
    `run_worker_first` accepts an array of patterns (wrangler ≥ 4.20), paired with
    `not_found_handling: "single-page-application"` — used as `["/api/*"]`.
  - **Remote bindings** (`workers/local-development/#remote-bindings`, GA 2025-09-16):
    `"remote": true` on a D1 binding makes `wrangler dev` proxy to the deployed database
    while code runs locally; supported by wrangler, the Vite plugin and the Vitest plugin
    (`remoteBindings` option — set **false** in `vitest.config.ts` so tests stay isolated).
  - **Vitest plugin v1 API** (`…/migrate-from-vitest-3-to-vitest-4/`, `…/test-apis/`):
    `fetchMock` from `cloudflare:test` is **removed** ("Mock `globalThis.fetch` directly
    or use … MSW"); `env`/`SELF` from `cloudflare:test` are deprecated in favour of
    `import { env, exports } from "cloudflare:workers"` with `exports.default.fetch()`
    ("runs in the same isolate/context as tests so any global mocks will apply");
    storage isolation is per test file. Verified by the passing suite: 27/27.
  - **D1:** `voxstage-staging` created 2026-09-03T00:55:51Z, id
    `7216c05f-8552-4319-ae20-6e4c66e70c99`, region ENAM; `0001_init.sql` applied
    `--remote` (7 statements; tables users, otp_codes, sessions, rate_limits + d1_migrations).
  - **Resend** (`resend.com/docs/knowledge-base/403-error-resend-dev-domain`,
    `…/api-reference/emails/send-email`): with the test sender `onboarding@resend.dev`
    "You can only send testing emails to your own email address" — a 403 otherwise; to
    reach anyone else, verify a domain and use it in `from`. API: `POST
    https://api.resend.com/emails`, `Authorization: Bearer`, body `from`/`to`/`subject`/
    `html`/`text`, success `{"id": …}`. So the M1 phone test can run on the test sender
    **only if Lando signs in with the email that owns the Resend account**.
  - **This machine:** none of the cloud-session secrets exist as env vars here
    (`CLOUDFLARE_API_TOKEN`, `RESEND_API_KEY`, `RUNPOD_API_KEY`, `DOCKER_API_KEY`, AWS keys
    all absent); `gh` is logged in as o4villegas (`repo` scope) and HTTPS push works;
    `wrangler` is OAuth-logged-in with `workers`, `d1`, `queues`, `pages` write; Node
    22.21.1; the Docker CLI is not installed in this WSL distro (Docker Desktop
    integration off). `wrangler versions upload --dry-run` also passes with **no**
    Cloudflare credentials (HOME pointed at an empty dir) — so the CI dry-run step is safe.
  - Traps met: a `.d.ts` beside a same-named `.ts` (`env.d.ts` next to `env.ts`) is
    silently ignored by tsc (renamed to `bindings.d.ts`); Biome 2.5 wants `rules.preset`
    instead of `rules.recommended` (`biome migrate --write`); npm 11.17 gates dependency
    install scripts (`allow-scripts`) — esbuild and workerd still work without theirs.

- **R61.** M1 deployed-preview verification (2026-09-03 01:19–01:28 UTC; measured on the
  `claude/vox-stage-m1` branch preview, draft PR #12).
  - **Pipeline:** scaffold commit `307b163` (+ docs `eec3875`) → Workers Builds build
    `94efb359` **success** (the `postinstall` bridge built `app/dist` inside Workers Builds:
    the preview serves `/assets/index-DOaoZuKI.js`, the same hash as the local build) →
    branch alias `https://claude-vox-stage-m1-voxstage-staging.lando555.workers.dev`.
    GitHub Actions `ci` run `33703163535` **success in 31 s** (lint, typecheck, build,
    27 tests, upload dry-run — the dry-run needs no Cloudflare credentials, R60).
  - **API round-trip on the preview (curl):** `/` = the built React app; `/api/health` 200
    `{"ok":true,"service":"VoxStage"}`; `/api/auth/me` 401; `POST /api/auth/request-code`
    202 `{"ok":true,"delivery":"log"}` (no `RESEND_API_KEY` on staging yet); `POST
    /api/auth/verify` 200 `{user}` with `Set-Cookie: vox_session=…; Max-Age=2592000;
    Path=/; HttpOnly; Secure; SameSite=Lax`; `/api/hello` 200 "Hello, …"; wrong code 401
    `invalid_code`; logout 204; `/api/hello` 401 afterwards. Staging D1 afterwards: users 1,
    sessions 0, otp_codes 0 (code consumed, session deleted). Test rows removed after.
  - **Browser round-trip (Playwright, 390×844):** email → "Enter the code." → code →
    "Hello, e2e-browser." with the status line "Signed-in connection to the server:
    working" (the browser's own cookie-authenticated call to `/api/hello`) → Sign out →
    sign-in screen. Screenshots kept in the session scratchpad, not the repo. One layout
    defect found and fixed in the same session: the step blurbs on the home card wrapped
    one word per line (third grid child fell into the 30 px number column; `grid-column: 2`).
  - **Reading a staging code:** `wrangler tail voxstage-staging --format json`
    (non-interactive) captured **0 events** for the preview URL *and* for the deployed URL
    in 25–30 s windows, with and without `--version-id` — cause undetermined; the
    dashboard's Workers Logs tab (observability on) is untested. What works, with DB admin
    access only: read `salt` + `code_hash` from `otp_codes` and check the ≤ 1,000,000
    candidates offline (Node: 156,831 SHA-256 hashes in 125 ms). That number is the
    reason M1-PLAN §3 calls the 5-attempt lockout and rate limits, not the hash, the real
    defense — verified, not assumed.
  - Cosmetic: the signed-out session probe logs a 401 "Failed to load resource" line in
    the browser console (expected); Chromium's `apple-mobile-web-app-capable` deprecation
    warning is addressed by also emitting `mobile-web-app-capable`.

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
  returns. *(Audit completed 2026-08-30 — see R50.)*
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
