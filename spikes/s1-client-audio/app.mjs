/* S1 spike — client audio chain: 2 synthesized stems → per-stem gain → one
 * SignalsmithStretch node (live-input mode, semitone shift) → speakers,
 * while the mic runs a pitch tracker (pitchy/MPM) via an AudioWorklet tap.
 * ?bench=1 runs the headless benchmark path instead (no gesture, no mic).
 * Throwaway spike code — never graduates into the app (docs/ROADMAP.md). */
import SignalsmithStretch from "signalsmith-stretch";
import { PitchDetector } from "pitchy";

const $ = (id) => document.getElementById(id);
const log = (m) => { const el = $("log"); if (el) { el.textContent += m + "\n"; el.scrollTop = el.scrollHeight; } };

/* ---------- synthetic stems (no copyrighted audio needed) ---------- */
async function renderStems(sampleRate, seconds) {
  const len = Math.floor(sampleRate * seconds);
  const mk = () => new OfflineAudioContext(2, len, sampleRate);

  // "pad" stem: detuned saws through a lowpass, slow amplitude LFO
  const padCtx = mk();
  {
    const lp = padCtx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400;
    const g = padCtx.createGain(); g.gain.value = 0.16;
    const lfo = padCtx.createOscillator(); lfo.frequency.value = 0.25;
    const lfoG = padCtx.createGain(); lfoG.gain.value = 0.05;
    lfo.connect(lfoG).connect(g.gain); lfo.start();
    for (const f of [110, 138.59, 164.81, 220]) {
      const o = padCtx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f;
      o.detune.value = (Math.random() - 0.5) * 12;
      o.connect(lp); o.start();
    }
    lp.connect(g).connect(padCtx.destination);
  }

  // "rhythm" stem: noise bursts on a grid + eighth-note bass sine
  const rhyCtx = mk();
  {
    const noise = rhyCtx.createBuffer(1, sampleRate, sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    for (let t = 0; t < seconds; t += 0.5) {
      const src = rhyCtx.createBufferSource(); src.buffer = noise;
      const bp = rhyCtx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3000; bp.Q.value = 1.2;
      const g = rhyCtx.createGain();
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      src.connect(bp).connect(g).connect(rhyCtx.destination);
      src.start(t, 0, 0.15);
    }
    for (let t = 0; t < seconds; t += 0.25) {
      const o = rhyCtx.createOscillator(); o.frequency.value = 55;
      const g = rhyCtx.createGain();
      g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.connect(g).connect(rhyCtx.destination); o.start(t); o.stop(t + 0.22);
    }
  }
  const [pad, rhythm] = await Promise.all([padCtx.startRendering(), rhyCtx.startRendering()]);
  return { pad, rhythm };
}

/* ---------- mic tap worklet (posts 2048-sample windows) ---------- */
const TAP_CODE = `
class VoxTap extends AudioWorkletProcessor {
  constructor(){ super(); this.buf = new Float32Array(2048); this.since = 0; this.calls = 0; }
  process(inputs){
    this.calls++;
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length) {
      this.buf.copyWithin(0, ch.length);
      this.buf.set(ch, 2048 - ch.length);
      this.since += ch.length;
      if (this.since >= 1024) { this.since = 0; this.port.postMessage(this.buf.slice(0)); }
    }
    return true;
  }
}
registerProcessor("vox-tap", VoxTap);`;

const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const hzToNote = (hz) => {
  const midi = 69 + 12 * Math.log2(hz / 440);
  const r = Math.round(midi);
  return `${NOTE_NAMES[((r % 12) + 12) % 12]}${Math.floor(r / 12) - 1} ${((midi - r) * 100).toFixed(0)}c`;
};

/* ---------- interactive mode ---------- */
async function startInteractive() {
  const ctx = new AudioContext();
  const report = {
    userAgent: navigator.userAgent,
    sampleRate: ctx.sampleRate,
    baseLatency: ctx.baseLatency ?? null,
    outputLatency: null, longTasks: 0, driftMs: null,
    pitchWindowsPerSec: 0, started: new Date().toISOString(),
  };

  log("Rendering synthetic stems…");
  const { pad, rhythm } = await renderStems(ctx.sampleRate, 8);
  log("Building graph…");
  const stretch = await SignalsmithStretch(ctx);
  const padGain = ctx.createGain(), rhyGain = ctx.createGain();
  const mkSrc = (buf, gain) => {
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
    s.connect(gain).connect(stretch); s.start(); return s;
  };
  mkSrc(pad, padGain); mkSrc(rhythm, rhyGain);
  stretch.connect(ctx.destination);
  stretch.start();
  stretch.schedule({ active: true, semitones: parseFloat($("semi").value) });

  $("semi").oninput = () => {
    const v = parseFloat($("semi").value);
    $("semiVal").textContent = v;
    stretch.schedule({ output: ctx.currentTime, semitones: v });
  };
  $("padGain").oninput = () => (padGain.gain.value = parseFloat($("padGain").value));
  $("rhyGain").oninput = () => (rhyGain.gain.value = parseFloat($("rhyGain").value));

  // mic + pitch tracking
  $("micBtn").onclick = async () => {
    const ec = $("ecToggle").checked;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: ec, noiseSuppression: false, autoGainControl: false },
    });
    const applied = stream.getAudioTracks()[0].getSettings();
    log("Mic constraints applied: " + JSON.stringify(applied));
    report.micSettings = applied;
    await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([TAP_CODE], { type: "application/javascript" })));
    const tap = new AudioWorkletNode(ctx, "vox-tap");
    ctx.createMediaStreamSource(stream).connect(tap);
    const det = PitchDetector.forFloat32Array(2048);
    let windows = 0, t0 = performance.now();
    tap.port.onmessage = (e) => {
      windows++;
      const [hz, clarity] = det.findPitch(e.data, ctx.sampleRate);
      if (clarity > 0.8 && hz > 60 && hz < 1200) {
        $("pitch").textContent = `${hz.toFixed(1)} Hz  ${hzToNote(hz)}  (clarity ${clarity.toFixed(2)})`;
      }
      if (windows % 100 === 0) {
        report.pitchWindowsPerSec = (windows / ((performance.now() - t0) / 1000)).toFixed(1);
      }
    };
    log("Pitch tracking live. Sing!");
  };

  // health probes: context-time drift vs wall clock, long tasks
  if ("PerformanceObserver" in window) {
    try {
      new PerformanceObserver((l) => (report.longTasks += l.getEntries().length)).observe({ entryTypes: ["longtask"] });
    } catch { /* longtask unsupported (Safari) — fine */ }
  }
  const wall0 = performance.now(), ctx0 = ctx.currentTime;
  setInterval(() => {
    const drift = (performance.now() - wall0) / 1000 - (ctx.currentTime - ctx0);
    report.driftMs = (drift * 1000).toFixed(1);
    report.outputLatency = ctx.outputLatency ?? null;
    $("stats").textContent = JSON.stringify(report, null, 2);
  }, 1000);

  $("copyBtn").onclick = () => navigator.clipboard.writeText(JSON.stringify(report, null, 2));
  log("Playing. Move the semitone slider; then enable mic and sing.");
}

/* ---------- bench mode (?bench=1, headless-friendly) ---------- */
async function runBench() {
  const out = { mode: "bench", ua: navigator.userAgent };

  // 1) stretch throughput: 60 s of 2-stem mix rendered offline through the shifter
  const SR = 48000, SECONDS = 60;
  const { pad, rhythm } = await renderStems(SR, 8);
  const mix = [new Float32Array(SR * SECONDS), new Float32Array(SR * SECONDS)];
  for (let c = 0; c < 2; c++) {
    const p = pad.getChannelData(c), r = rhythm.getChannelData(c), m = mix[c];
    for (let i = 0; i < m.length; i++) m[i] = p[i % p.length] + r[i % r.length];
  }
  const off = new OfflineAudioContext(2, SR * SECONDS, SR);
  const stretch = await SignalsmithStretch(off);
  stretch.connect(off.destination);
  await stretch.addBuffers(mix);
  stretch.schedule({ active: true, input: 0, rate: 1, semitones: 3 });
  const t0 = performance.now();
  await off.startRendering();
  const wall = (performance.now() - t0) / 1000;
  out.stretch = {
    semitones: 3, audioSeconds: SECONDS, wallSeconds: +wall.toFixed(2),
    realtimeFactor: +(SECONDS / wall).toFixed(2),
  };

  // 2) pitchy speed + accuracy on a known vibrato tone (220 Hz ± 5 Hz @ 5 Hz)
  const dur = 5, n = SR * dur, tone = new Float32Array(n);
  const f0 = 220, dev = 5, vib = 5;
  let phase = 0;
  const inst = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const f = f0 + dev * Math.sin(2 * Math.PI * vib * (i / SR));
    inst[i] = f;
    phase += (2 * Math.PI * f) / SR;
    tone[i] = 0.5 * Math.sin(phase) + 0.02 * (Math.random() * 2 - 1);
  }
  const det = PitchDetector.forFloat32Array(2048);
  const win = new Float32Array(2048);
  let calls = 0, errSum = 0, errN = 0, maxErr = 0;
  const p0 = performance.now();
  for (let start = 0; start + 2048 <= n; start += 512) {
    win.set(tone.subarray(start, start + 2048));
    const [hz, clarity] = det.findPitch(win, SR);
    calls++;
    if (clarity > 0.9) {
      const ref = inst[start + 1024];
      const cents = Math.abs(1200 * Math.log2(hz / ref));
      errSum += cents; errN++; if (cents > maxErr) maxErr = cents;
    }
  }
  const pWall = (performance.now() - p0) / 1000;
  out.pitchy = {
    windows: calls, wallSeconds: +pWall.toFixed(3),
    windowsPerSec: Math.round(calls / pWall),
    meanAbsCents: +(errSum / errN).toFixed(2), maxAbsCents: +maxErr.toFixed(2),
    clarityGated: errN,
  };

  window.__benchResult = out;
  document.title = "BENCH DONE";
  if ($("stats")) $("stats").textContent = JSON.stringify(out, null, 2);
}

if (new URLSearchParams(location.search).has("bench")) {
  runBench().catch((e) => { window.__benchResult = { error: String(e && e.stack || e) }; document.title = "BENCH DONE"; });
} else {
  $("startBtn").onclick = () => { $("startBtn").disabled = true; startInteractive().catch((e) => log("ERROR: " + e)); };
}
