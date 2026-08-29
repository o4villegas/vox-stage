"""S3 spike (extractor half) — pYIN accuracy on a separated vocal stem.

Runs where librosa is installed (the S2 container has the audio stack; add
`pip install librosa` there, or run locally). Not executable in the docs
sandbox — deliberately kept dependency-light here.

Usage:
  python eval_pyin.py stem.wav reference.csv
    reference.csv rows: time_seconds,hz   (hz empty/0 for unvoiced frames)

Reports: voiced-frame mean/median abs cents error, octave-error rate
(|error| folded 1200 > 550 cents), voicing agreement. Gate values are decided
during the spike per docs/ROADMAP.md.
"""
import csv
import sys

import librosa
import numpy as np


def main(wav_path, ref_path):
    y, sr = librosa.load(wav_path, sr=None, mono=True)
    f0, voiced, _ = librosa.pyin(
        y, fmin=librosa.note_to_hz("C2"), fmax=librosa.note_to_hz("C6"), sr=sr
    )
    times = librosa.times_like(f0, sr=sr)

    ref_t, ref_hz = [], []
    with open(ref_path) as f:
        for row in csv.reader(f):
            if not row or row[0].startswith("#"):
                continue
            ref_t.append(float(row[0]))
            ref_hz.append(float(row[1]) if len(row) > 1 and row[1] else 0.0)
    ref_t, ref_hz = np.array(ref_t), np.array(ref_hz)

    ref_interp = np.interp(times, ref_t, ref_hz, left=0, right=0)
    both = (ref_interp > 0) & voiced & np.isfinite(f0)

    cents = 1200 * np.log2(f0[both] / ref_interp[both])
    folded = ((cents % 1200) + 1200) % 1200
    folded = np.where(folded >= 600, folded - 1200, folded)
    octave_err = np.abs(np.abs(cents) - np.abs(folded)) > 1  # frames rescued by folding

    print(f"frames: ref-voiced={int((ref_interp > 0).sum())} both-voiced={int(both.sum())}")
    print(f"voicing agreement: {both.sum() / max(1, (ref_interp > 0).sum()):.2%}")
    print(f"mean |cents| (folded): {np.abs(folded).mean():.1f}")
    print(f"median |cents| (folded): {np.median(np.abs(folded)):.1f}")
    print(f"octave-error rate: {octave_err.mean():.2%}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
