/* S4 spike — chirp generation + offset finding by normalized cross-correlation.
 * Pure functions shared by the device page and the Node unit test. */

export function makeChirp(sampleRate, ms = 120, f0 = 800, f1 = 3200) {
  const n = Math.floor((sampleRate * ms) / 1000);
  const out = new Float32Array(n);
  const k = (f1 - f0) / (n / sampleRate); // linear sweep rate, Hz per second
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const phase = 2 * Math.PI * (f0 * t + 0.5 * k * t * t);
    const env = Math.sin((Math.PI * i) / n); // half-sine envelope, no clicks
    out[i] = env * Math.sin(phase);
  }
  return out;
}

/* Slide `reference` over `recorded`; return the lag maximizing the normalized
 * correlation. Normalization by local energy makes it gain-invariant. */
export function findOffset(recorded, reference, { maxLag = recorded.length - reference.length } = {}) {
  const m = reference.length;
  let refEnergy = 0;
  for (let i = 0; i < m; i++) refEnergy += reference[i] * reference[i];
  const refNorm = Math.sqrt(refEnergy) || 1;

  // prefix sums of squared recording for O(1) local-energy lookup
  const prefix = new Float64Array(recorded.length + 1);
  for (let i = 0; i < recorded.length; i++) prefix[i + 1] = prefix[i] + recorded[i] * recorded[i];

  let bestLag = -1, bestScore = -Infinity, sumScore = 0, count = 0;
  const last = Math.min(maxLag, recorded.length - m);
  for (let lag = 0; lag <= last; lag++) {
    let dot = 0;
    for (let i = 0; i < m; i++) dot += recorded[lag + i] * reference[i];
    const local = Math.sqrt(prefix[lag + m] - prefix[lag]) || 1e-12;
    const score = dot / (local * refNorm);
    sumScore += Math.abs(score); count++;
    if (score > bestScore) { bestScore = score; bestLag = lag; }
  }
  return { lag: bestLag, peak: bestScore, meanAbs: sumScore / count };
}
