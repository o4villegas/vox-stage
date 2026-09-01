/* S2 spike benchmark — runs the test corpus through a deployed RunPod endpoint and
 * reports the numbers the ROADMAP S2 gates ask for: cold start, warm runtime,
 * cost per song, and per-genre stem results.
 *
 * Corpus: JamendoLyrics (dataset MIT; each track Creative Commons, license per track
 * below). Only CC BY / CC BY-SA tracks are used — commercially permissive, so the
 * benchmark corpus itself carries no non-commercial restriction. Three contrasting
 * genres, chosen to span easy-to-hard vocal isolation.
 *
 * Required env: RUNPOD_API_KEY, RUNPOD_ENDPOINT_ID
 * Optional env: GPU_USD_PER_HR (default 0.69, R9) · MODELS (space separated)
 *               SONGS (comma separated ids) · OUT (json results path)
 *
 * Run: node bench.mjs
 */
const { RUNPOD_API_KEY, RUNPOD_ENDPOINT_ID } = process.env;
if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID) {
  console.error("Missing env: RUNPOD_API_KEY, RUNPOD_ENDPOINT_ID required.");
  process.exit(2);
}
const USD_HR = Number(process.env.GPU_USD_PER_HR || 0.69);
const MODELS = (process.env.MODELS || "htdemucs").split(/\s+/).filter(Boolean);
const HF = "https://huggingface.co/datasets/jamendolyrics/jamendolyrics/resolve/main/subsets";

const CORPUS = [
  { id: "rnb",     genre: "RNB",     license: "CC BY",    artist: "Rxbyn",        title: "Bad Side",   url: `${HF}/en/mp3/Rxbyn_-_Bad_Side.mp3` },
  { id: "rock",    genre: "Rock",    license: "CC BY-SA", artist: "Durch Dick und Dünn", title: "Freifliegen", url: `${HF}/de/mp3/Freifliegen_-_durch.dick.und.duenn.mp3` },
  { id: "hiphop",  genre: "Hip-Hop", license: "CC BY-SA", artist: "Wilson Way",   title: "Te Recuerdo", url: `${HF}/es/mp3/Te_Recuerdo_-_Wilson_Way.mp3` },
];
const songs = process.env.SONGS
  ? CORPUS.filter((s) => process.env.SONGS.split(",").includes(s.id))
  : CORPUS;

const base = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}`;
const headers = { authorization: `Bearer ${RUNPOD_API_KEY}`, "content-type": "application/json" };

async function runOne(song, model) {
  const submittedAt = Date.now();
  const res = await fetch(`${base}/run`, {
    method: "POST", headers,
    body: JSON.stringify({ input: { audio_url: song.url, model } }),
  });
  const run = await res.json();
  if (!run.id) return { error: `submit failed: ${JSON.stringify(run)}` };

  let status;
  const deadline = Date.now() + 20 * 60 * 1000;
  for (;;) {
    await new Promise((ok) => setTimeout(ok, 4000));
    status = await (await fetch(`${base}/status/${run.id}`, { headers })).json();
    if (["COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"].includes(status.status)) break;
    if (Date.now() > deadline) return { error: "client timeout", status };
    process.stderr.write(`    ${song.id}/${model}: ${status.status}\r`);
  }
  return {
    jobId: run.id,
    status: status.status,
    delayMs: status.delayTime ?? null,        // queue + cold start, per RunPod
    execMs: status.executionTime ?? null,     // handler runtime
    wallS: +((Date.now() - submittedAt) / 1000).toFixed(1),
    output: status.output ?? null,
    error: status.error ?? null,
  };
}

const results = [];
for (const model of MODELS) {
  for (const song of songs) {
    process.stderr.write(`  running ${song.id} (${song.genre}) on ${model}…\n`);
    const r = await runOne(song, model);
    const row = { song: song.id, genre: song.genre, license: song.license, model, ...r };
    if (r.execMs) {
      row.costUsd = +((r.execMs / 1000 / 3600) * USD_HR).toFixed(5);
      const dur = r.output?.timings?.audio_duration_s;
      if (dur) { row.durationS = dur; row.realtimeFactor = +(dur / (r.execMs / 1000)).toFixed(2); }
    }
    results.push(row);
    const t = r.output?.timings ?? {};
    console.log(
      `${row.status === "COMPLETED" ? "OK " : "ERR"} ${song.id.padEnd(7)} ${model.padEnd(12)} ` +
      `delay=${r.delayMs != null ? (r.delayMs / 1000).toFixed(1) + "s" : "?"} ` +
      `exec=${r.execMs != null ? (r.execMs / 1000).toFixed(1) + "s" : "?"} ` +
      `dl=${t.download_s ?? "?"}s sep=${t.separate_s ?? "?"}s dur=${t.audio_duration_s ?? "?"}s ` +
      `cost=$${row.costUsd ?? "?"}` + (r.error ? `  ERROR: ${JSON.stringify(r.error).slice(0, 200)}` : "")
    );
    if (r.output?.error) console.log(`    handler error: ${String(r.output.stderr || r.output.error).slice(-600)}`);
  }
}

const ok = results.filter((r) => r.status === "COMPLETED" && r.costUsd != null);
if (ok.length) {
  const costs = ok.map((r) => r.costUsd).sort((a, b) => a - b);
  const e2e = ok.map((r) => r.execMs / 1000).sort((a, b) => a - b);
  const p50 = (a) => a[Math.floor(a.length / 2)];
  console.log("\n=== S2 gates (docs/ROADMAP.md) ===");
  console.log(`runs completed      : ${ok.length}/${results.length}`);
  console.log(`cost/song  max      : $${Math.max(...costs).toFixed(5)}  (gate ≤ $0.03)  -> ${Math.max(...costs) <= 0.03 ? "PASS" : "FAIL"}`);
  console.log(`exec p50            : ${p50(e2e).toFixed(1)}s  (gate ≤ 60s)     -> ${p50(e2e) <= 60 ? "PASS" : "FAIL"}`);
  console.log(`genres covered      : ${[...new Set(ok.map((r) => r.genre))].join(", ")}`);
  console.log(`GPU rate assumed    : $${USD_HR}/hr — confirm against dashboard billing`);
}
const out = process.env.OUT || "s2-results.json";
await (await import("node:fs/promises")).writeFile(out, JSON.stringify({ at: new Date().toISOString(), usdPerHr: USD_HR, results }, null, 2));
console.log(`\nwrote ${out}`);
