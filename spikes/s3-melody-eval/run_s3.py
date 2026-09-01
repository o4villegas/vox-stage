"""S3 spike — separate the synthetic mixes and score pitch extraction on them.

For every mix built by make_mixes.py: separate it (same model the S2 worker bakes
in), run eval_pyin.py on the separated vocal against vocadito's human f0, and record
the numbers. Also scores each *clean* vocal against the same reference.

That control run is the point of the design. On its own, an error figure from a
separated stem is uninterpretable — you cannot tell whether demucs damaged the vocal
or pyin simply mis-tracks that singer. Scoring the clean vocal against the identical
reference isolates the extractor's own error, so the separated-minus-clean delta is
the number that actually answers S3's question.

eval_pyin.py is invoked unmodified and its stdout parsed, so the reported numbers come
from exactly the script already in the repo.

Run inside the S3 image (demucs + librosa):
  docker run --rm -v <scratch>:/work -w /work --entrypoint python voxstage-s3:eval \
      run_s3.py --build /work/s3/build --out /work/s3/results
"""
import argparse
import json
import os
import re
import subprocess
import sys
import time

METRICS = {
    "ref_voiced": r"ref-voiced=(\d+)",
    "both_voiced": r"both-voiced=(\d+)",
    "voicing_agreement_pct": r"voicing agreement:\s*([\d.]+)%",
    "mean_cents": r"mean \|cents\| \(folded\):\s*([\d.]+)",
    "median_cents": r"median \|cents\| \(folded\):\s*([\d.]+)",
    "octave_error_pct": r"octave-error rate:\s*([\d.]+)%",
}
EVAL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "eval_pyin.py")


def run_eval(wav, ref):
    """eval_pyin.py, unmodified — parse its printed report."""
    p = subprocess.run(
        [sys.executable, EVAL, wav, ref], capture_output=True, text=True
    )
    if p.returncode != 0:
        return {"error": (p.stderr or p.stdout)[-400:]}
    out = {}
    for key, pat in METRICS.items():
        m = re.search(pat, p.stdout)
        out[key] = float(m.group(1)) if m else None
    return out


def separate(mix_path, workdir, model="htdemucs"):
    """Same invocation the S2 handler uses, so S3 scores what production would produce."""
    p = subprocess.run(
        [sys.executable, "-m", "demucs.separate", "--two-stems", "vocals",
         "-n", model, "-o", workdir, mix_path],
        capture_output=True, text=True,
    )
    if p.returncode != 0:
        return None, p.stderr[-400:]
    stem = os.path.splitext(os.path.basename(mix_path))[0]
    out = os.path.join(workdir, model, stem, "vocals.wav")
    return (out, None) if os.path.exists(out) else (None, f"missing {out}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--build", required=True, help="make_mixes.py output dir")
    ap.add_argument("--out", required=True)
    ap.add_argument("--model", default="htdemucs")
    args = ap.parse_args()

    manifest = json.load(open(os.path.join(args.build, "manifest.json")))
    os.makedirs(args.out, exist_ok=True)
    sep_dir = os.path.join(args.out, "separated")

    # Control: the extractor's own error, measured on the untouched vocal.
    controls, results = {}, []
    for tid in sorted({m["track_id"] for m in manifest}, key=int):
        entry = next(m for m in manifest if m["track_id"] == tid)
        t0 = time.time()
        controls[tid] = run_eval(
            os.path.join(args.build, entry["clean"]),
            os.path.join(args.build, entry["ref"]),
        )
        print(f"control {tid}: {controls[tid]} ({time.time() - t0:.0f}s)", flush=True)
    json.dump(controls, open(os.path.join(args.out, "controls.json"), "w"), indent=2)

    for i, m in enumerate(manifest, 1):
        t0 = time.time()
        vocals, err = separate(os.path.join(args.build, m["mix"]), sep_dir, args.model)
        row = dict(m)
        if err:
            row["error"] = err
        else:
            row.update(run_eval(vocals, os.path.join(args.build, m["ref"])))
            ctl = controls.get(m["track_id"], {})
            # The headline: degradation attributable to separation, not to pyin.
            for k in ("median_cents", "octave_error_pct", "voicing_agreement_pct"):
                if row.get(k) is not None and ctl.get(k) is not None:
                    row[f"delta_{k}"] = round(row[k] - ctl[k], 3)
        row["elapsed_s"] = round(time.time() - t0, 1)
        results.append(row)
        print(f"[{i}/{len(manifest)}] {m['track_id']} snr={m['snr_db']} "
              f"med={row.get('median_cents')} oct={row.get('octave_error_pct')}% "
              f"({row['elapsed_s']}s)", flush=True)
        json.dump(results, open(os.path.join(args.out, "results.json"), "w"), indent=2)

    print("\n=== by SNR (median across tracks) ===")
    import statistics as st
    print(f"{'snr':>5} {'n':>3} {'med cents':>10} {'oct err %':>10} {'voicing %':>10} "
          f"{'Δmed':>7} {'Δoct':>7}")
    for snr in sorted({r["snr_db"] for r in results}, reverse=True):
        rs = [r for r in results if r["snr_db"] == snr and r.get("median_cents") is not None]
        if not rs:
            continue
        med = lambda k: st.median([r[k] for r in rs if r.get(k) is not None]) if any(
            r.get(k) is not None for r in rs) else float("nan")
        print(f"{snr:>5} {len(rs):>3} {med('median_cents'):>10.1f} "
              f"{med('octave_error_pct'):>10.2f} {med('voicing_agreement_pct'):>10.2f} "
              f"{med('delta_median_cents'):>7.1f} {med('delta_octave_error_pct'):>7.2f}")
    ctl_ok = [c for c in controls.values() if c.get("median_cents") is not None]
    if ctl_ok:
        print(f"\ncontrol (clean vocal, n={len(ctl_ok)}): "
              f"median {st.median([c['median_cents'] for c in ctl_ok]):.1f} cents, "
              f"octave err {st.median([c['octave_error_pct'] for c in ctl_ok]):.2f}%")


if __name__ == "__main__":
    main()
