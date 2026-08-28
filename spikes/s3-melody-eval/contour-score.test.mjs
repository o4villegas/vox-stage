/* S3 spike (client half) — scoring math for sung pitch vs reference melody.
 * Octave-tolerant cents error, clarity/voicing gated. Run: node contour-score.test.mjs
 * The extractor-accuracy half (pYIN on real separated stems) runs in the S2
 * container: see eval_pyin.py. */

const centsError = (sungHz, refHz) => {
  let c = 1200 * Math.log2(sungHz / refHz);
  // octave tolerance: fold into [-600, 600)
  c = ((c % 1200) + 1200) % 1200;
  if (c >= 600) c -= 1200;
  return c;
};

/* score: mean over voiced reference frames of max(0, 1 - |cents|/100), as %.
 * A frame with no confident sung pitch scores 0. */
function scorePerformance(refFrames, sungFrames) {
  let sum = 0, n = 0;
  for (let i = 0; i < refFrames.length; i++) {
    const ref = refFrames[i];
    if (!ref) continue; // unvoiced reference frame — not scored
    n++;
    const sung = sungFrames[i];
    if (!sung) continue; // singer silent/unclear on a voiced frame
    sum += Math.max(0, 1 - Math.abs(centsError(sung, ref)) / 100);
  }
  return n ? (100 * sum) / n : 0;
}

let failures = 0;
const t = (name, got, want, tol = 0.5) => {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: got ${got.toFixed(2)}, want ${want}±${tol}`);
};

const ref = Array.from({ length: 200 }, (_, i) => 220 * Math.pow(2, ((i % 12) - 6) / 12));

t("perfect match = 100", scorePerformance(ref, [...ref]), 100);
t("octave up still scores 100", scorePerformance(ref, ref.map((h) => h * 2)), 100);
t("50 cents flat everywhere = 50", scorePerformance(ref, ref.map((h) => h * Math.pow(2, -50 / 1200))), 50);
t("a full semitone off = 0", scorePerformance(ref, ref.map((h) => h * Math.pow(2, -100 / 1200))), 0);
t("silent singer = 0", scorePerformance(ref, ref.map(() => null)), 0);
t("half the frames perfect, half silent = 50",
  scorePerformance(ref, ref.map((h, i) => (i % 2 ? h : null))), 50);
t("unvoiced ref frames excluded",
  scorePerformance(ref.map((h, i) => (i < 100 ? h : null)), ref.map((h, i) => (i < 100 ? h : null))), 100);

// property: error folding is symmetric and bounded
for (let i = 0; i < 1000; i++) {
  const r = 100 + Math.random() * 800, s = 60 + Math.random() * 1100;
  const c = centsError(s, r);
  if (c < -600 || c >= 600) { failures++; console.log(`FAIL fold bounds: ${c}`); break; }
}
console.log(failures ? "RESULT: FAIL" : "RESULT: all pass");
process.exit(failures ? 1 : 0);
