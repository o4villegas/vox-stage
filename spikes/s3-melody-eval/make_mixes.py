"""S3 spike — build synthetic mixes with exact f0 ground truth.

Why synthetic: S3 must score pitch extraction on *separated* vocals, so it needs
(a) a mix to separate and (b) frame-level f0 truth for the vocal in it. No corpus
gives both under a commercially permissive licence (R56):
  - JamendoLyrics (the S2 corpus) has mixes but only lyrics timings, no f0.
  - MedleyDB / MUSDB18 have both but are CC BY-NC-SA and access-gated.
  - vocadito has human frame-level f0 under CC BY 4.0 — but solo vocals only.
So we take vocadito's annotated vocal and lay it over an accompaniment bed derived
from the S2 corpus (CC BY / CC BY-SA), which keeps the whole chain permissive and
the ground truth human rather than extractor-derived (no circularity).

Beds are the `no_vocals` stems demucs produces from the S2 benchmark tracks, so the
accompaniment is real music rather than noise.

Outputs, per selected track and SNR:
  mixes/<id>_snr<db>.wav   stereo mix to feed through separation
  clean/<id>.wav           the untouched vocal, for the control run
  refs/<id>.csv            vocadito's f0 annotation, copied verbatim
                           (already `time_seconds,hz` — eval_pyin.py's exact format)
  manifest.json            what to run, and against what

Run inside the S3 image (numpy + soundfile):
  docker run --rm -v <scratch>:/work -w /work --entrypoint python voxstage-s3:eval \
      make_mixes.py --vocadito /work/vocadito --beds /work/s3/beds/out/htdemucs \
      --out /work/s3/build
"""
import argparse
import csv
import json
import os
import shutil

import numpy as np
import soundfile as sf

SNRS_DB = (0, -6, -12)
DEFAULT_N = 12


def load_metadata(voc_dir):
    """vocadito_metadata.csv -> list of dicts with duration attached."""
    rows = []
    with open(os.path.join(voc_dir, "vocadito_metadata.csv")) as f:
        for r in csv.DictReader(f):
            wav = os.path.join(voc_dir, "Audio", f"vocadito_{r['track_id']}.wav")
            info = sf.info(wav)
            r["path"] = wav
            r["dur"] = info.duration
            r["average_pitch"] = int(r["average_pitch"])
            rows.append(r)
    return rows


def select(rows, n):
    """Stratify by average pitch, then prefer unseen singers and languages.

    Range-fit is the product's core, so pitch spread matters more than anything
    else here; singer/language spread is the tiebreak so we don't measure one
    voice N times. Deterministic — no RNG, so runs are comparable.
    """
    rows = sorted(rows, key=lambda r: (r["average_pitch"], int(r["track_id"])))
    if n >= len(rows):
        return rows
    # n evenly spaced pitch slots across the sorted range
    picks, seen_singers, seen_langs = [], set(), set()
    for i in range(n):
        lo = round(i * len(rows) / n)
        hi = max(lo + 1, round((i + 1) * len(rows) / n))
        band = [r for r in rows[lo:hi] if r not in picks]
        if not band:
            continue
        band.sort(
            key=lambda r: (
                r["singer_id"] in seen_singers,
                r["language"] in seen_langs,
                -r["dur"],  # longer excerpt = more voiced frames to score
            )
        )
        chosen = band[0]
        picks.append(chosen)
        seen_singers.add(chosen["singer_id"])
        seen_langs.add(chosen["language"])
    return picks


def voiced_rms(vocal, sr, ref_csv):
    """RMS of the vocal over annotated-voiced frames only.

    Overall RMS would be dragged down by vocadito's leading/trailing silence, which
    would silently make every mix quieter than the requested SNR.
    """
    times, hz = [], []
    with open(ref_csv) as f:
        for row in csv.reader(f):
            if not row or row[0].startswith("#"):
                continue
            times.append(float(row[0]))
            hz.append(float(row[1]) if len(row) > 1 and row[1] else 0.0)
    times, hz = np.asarray(times), np.asarray(hz)
    voiced_t = times[hz > 0]
    if voiced_t.size == 0:
        return float(np.sqrt(np.mean(vocal**2)))
    idx = np.unique(np.clip((voiced_t * sr).astype(int), 0, len(vocal) - 1))
    return float(np.sqrt(np.mean(vocal[idx] ** 2)))


def to_stereo(x):
    return np.column_stack([x, x]) if x.ndim == 1 else x


def bed_segment(bed, n, offset):
    """A length-n slice of the bed, tiled if the bed is somehow shorter."""
    if len(bed) < n:
        bed = np.tile(bed, (int(np.ceil(n / len(bed))), 1))
    start = offset % max(1, len(bed) - n)
    return bed[start : start + n]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vocadito", required=True)
    ap.add_argument("--beds", required=True, help="dir of <track>/no_vocals.wav")
    ap.add_argument("--out", required=True)
    ap.add_argument("--n", type=int, default=DEFAULT_N)
    args = ap.parse_args()

    beds = {}
    for name in sorted(os.listdir(args.beds)):
        p = os.path.join(args.beds, name, "no_vocals.wav")
        if os.path.exists(p):
            audio, sr = sf.read(p, always_2d=True)
            beds[name] = (audio, sr)
    if not beds:
        raise SystemExit(f"no <track>/no_vocals.wav under {args.beds}")
    print(f"beds: {', '.join(beds)}")

    rows = load_metadata(args.vocadito)
    picks = select(rows, args.n)
    print(f"selected {len(picks)}/{len(rows)} tracks")

    for d in ("mixes", "clean", "refs"):
        os.makedirs(os.path.join(args.out, d), exist_ok=True)

    bed_names = sorted(beds)
    manifest = []
    for i, r in enumerate(picks):
        tid = r["track_id"]
        vocal, sr = sf.read(r["path"])
        ref_src = os.path.join(args.vocadito, "Annotations", "F0", f"vocadito_{tid}_f0.csv")
        ref_dst = os.path.join(args.out, "refs", f"{tid}.csv")
        shutil.copyfile(ref_src, ref_dst)  # already eval_pyin.py's format, verbatim

        clean_dst = os.path.join(args.out, "clean", f"{tid}.wav")
        sf.write(clean_dst, vocal, sr)

        v_rms = voiced_rms(vocal, sr, ref_dst)
        v_st = to_stereo(vocal)

        # Rotate beds so results aren't tied to one accompaniment.
        bed_name = bed_names[i % len(bed_names)]
        bed, bed_sr = beds[bed_name]
        if bed_sr != sr:
            raise SystemExit(f"sample-rate mismatch: vocal {sr} vs bed {bed_sr} ({bed_name})")
        seg = bed_segment(bed, len(v_st), offset=i * sr * 7)
        b_rms = float(np.sqrt(np.mean(seg**2))) or 1e-9

        for snr in SNRS_DB:
            # scale bed so 20*log10(v_rms / bed_rms) == snr
            gain = (v_rms / b_rms) / (10 ** (snr / 20.0))
            mix = v_st + seg * gain
            peak = float(np.max(np.abs(mix)))
            if peak > 0.99:
                mix = mix * (0.99 / peak)  # scales both parts equally; SNR preserved
            mix_path = os.path.join(args.out, "mixes", f"{tid}_snr{snr}.wav")
            sf.write(mix_path, mix, sr)
            manifest.append(
                {
                    "track_id": tid,
                    "snr_db": snr,
                    "bed": bed_name,
                    "singer": r["singer_id"],
                    "language": r["language"],
                    "average_pitch": r["average_pitch"],
                    "duration_s": round(r["dur"], 2),
                    "mix": os.path.relpath(mix_path, args.out),
                    "clean": os.path.relpath(clean_dst, args.out),
                    "ref": os.path.relpath(ref_dst, args.out),
                }
            )
        print(f"  {tid}: pitch {r['average_pitch']} {r['language']} bed={bed_name}")

    with open(os.path.join(args.out, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    total = sum(m["duration_s"] for m in manifest)
    print(f"\n{len(manifest)} mixes, {total:.0f}s of audio to separate")


if __name__ == "__main__":
    main()
