/* S2 spike driver — submits one separation job to a RunPod serverless endpoint
 * and reports the measured cold-start / execution split.
 *
 * Required env:
 *   RUNPOD_API_KEY      — account API key (NOT committed anywhere)
 *   RUNPOD_ENDPOINT_ID  — the deployed endpoint id
 *   AUDIO_GET_URL       — presigned/plain GET URL of a test song
 * Optional env:
 *   PUT_URL_VOCALS / PUT_URL_NO_VOCALS — presigned PUTs for the stems
 *   GPU_USD_PER_HR      — flex-worker rate, for the cost estimate line
 *
 * Run: node driver.mjs
 */
const { RUNPOD_API_KEY, RUNPOD_ENDPOINT_ID, AUDIO_GET_URL } = process.env;
if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID || !AUDIO_GET_URL) {
  console.error("Missing env: RUNPOD_API_KEY, RUNPOD_ENDPOINT_ID, AUDIO_GET_URL required.");
  process.exit(2);
}
const base = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}`;
const headers = { authorization: `Bearer ${RUNPOD_API_KEY}`, "content-type": "application/json" };

const input = { audio_url: AUDIO_GET_URL, put_urls: {} };
if (process.env.PUT_URL_VOCALS) input.put_urls.vocals = process.env.PUT_URL_VOCALS;
if (process.env.PUT_URL_NO_VOCALS) input.put_urls.no_vocals = process.env.PUT_URL_NO_VOCALS;

const submittedAt = Date.now();
const run = await (await fetch(`${base}/run`, { method: "POST", headers, body: JSON.stringify({ input }) })).json();
if (!run.id) { console.error("Submit failed:", run); process.exit(1); }
console.log(`Job ${run.id} submitted; polling…`);

let status;
for (;;) {
  await new Promise((ok) => setTimeout(ok, 3000));
  status = await (await fetch(`${base}/status/${run.id}`, { headers })).json();
  process.stderr.write(`  ${status.status}\n`);
  if (["COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"].includes(status.status)) break;
}

console.log(JSON.stringify(status, null, 2));
console.log(`wall_from_submit_s: ${((Date.now() - submittedAt) / 1000).toFixed(1)}`);
// RunPod reports delayTime/executionTime in ms on completed jobs; verify
// against the dashboard's billed seconds when recording S2 results.
if (status.executionTime && process.env.GPU_USD_PER_HR) {
  const usd = (status.executionTime / 1000 / 3600) * Number(process.env.GPU_USD_PER_HR);
  console.log(`estimated_compute_usd: ${usd.toFixed(5)} (executionTime × $${process.env.GPU_USD_PER_HR}/hr — confirm vs dashboard billing)`);
}
process.exit(status.status === "COMPLETED" ? 0 : 1);
