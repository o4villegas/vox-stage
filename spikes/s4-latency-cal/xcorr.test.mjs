/* Unit test: the offset finder must recover a known, attenuated, noisy
 * placement of the chirp to sample precision. Run: node xcorr.test.mjs */
import { makeChirp, findOffset } from "./xcorr.mjs";

const SR = 48000;
const chirp = makeChirp(SR);
let failures = 0;

function check(name, trueOffset, gain, noiseSigma) {
  const rec = new Float32Array(SR * 2);
  for (let i = 0; i < rec.length; i++) rec[i] = noiseSigma * (Math.random() * 2 - 1);
  for (let i = 0; i < chirp.length; i++) rec[trueOffset + i] += gain * chirp[i];
  const t0 = performance.now();
  const { lag, peak } = findOffset(rec, chirp);
  const ms = (performance.now() - t0).toFixed(0);
  const err = Math.abs(lag - trueOffset);
  const ok = err <= 1;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: true=${trueOffset} found=${lag} (err ${err} samples, peak ${peak.toFixed(3)}, ${ms} ms)`);
}

check("clean mid-buffer", 13337, 0.3, 0.0);
check("noisy, quiet (SNR ~ 6 dB)", 42001, 0.1, 0.05);
check("very start", 0, 0.5, 0.02);
check("near end", SR * 2 - chirp.length - 10, 0.2, 0.03);
check("phone-ish: quiet + loud noise", 30000, 0.08, 0.06);

process.exit(failures ? 1 : 0);
