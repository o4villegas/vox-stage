"""S2 spike — RunPod serverless handler: URL in, stems out via presigned PUTs.

Input (job["input"]):
  audio_url: presigned GET URL for the source audio (payload cap forces URL I/O)
  model:     demucs model name (htdemucs | hdemucs_mmi | mdx_extra) — default htdemucs.
             The fallback models are benchmarked alongside htdemucs because of the
             weights-licensing question logged in R48.
  put_urls:  {"vocals": <presigned PUT>, "no_vocals": <presigned PUT>}  (either optional)

Returns a timing breakdown so the spike can measure cost/latency per stage, plus the
audio duration needed to turn execution time into a cost-per-song figure.
Throwaway spike code — the production job also does melody extraction (S3).
"""
import os
import subprocess
import tempfile
import time
import wave

import requests
import runpod


def _wav_duration_s(path):
    """Duration of a PCM wav, via stdlib (no ffprobe in the bootstrap image)."""
    try:
        with wave.open(path, "rb") as w:
            return round(w.getnframes() / float(w.getframerate()), 2)
    except Exception:
        return None


def _versions():
    info = {}
    try:
        import torch

        info["torch"] = torch.__version__
        info["cuda_available"] = torch.cuda.is_available()
        if torch.cuda.is_available():
            info["gpu_name"] = torch.cuda.get_device_name(0)
    except Exception as e:  # pragma: no cover - diagnostic only
        info["torch_error"] = str(e)
    try:
        import demucs

        info["demucs"] = getattr(demucs, "__version__", "unknown")
    except Exception as e:  # pragma: no cover
        info["demucs_error"] = str(e)
    return info


def handler(job):
    inp = job["input"]
    model = inp.get("model", "htdemucs")
    timings = {}
    t0 = time.time()

    workdir = tempfile.mkdtemp()
    src = os.path.join(workdir, "input.mp3")
    r = requests.get(inp["audio_url"], timeout=180)
    r.raise_for_status()
    with open(src, "wb") as f:
        f.write(r.content)
    timings["download_s"] = round(time.time() - t0, 2)
    timings["input_bytes"] = len(r.content)

    t1 = time.time()
    proc = subprocess.run(
        ["python", "-m", "demucs.separate", "--two-stems", "vocals",
         "-n", model, "-o", workdir, src],
        capture_output=True, text=True,
    )
    timings["separate_s"] = round(time.time() - t1, 2)
    if proc.returncode != 0:
        return {"error": "demucs failed", "returncode": proc.returncode,
                "stderr": proc.stderr[-4000:], "model": model,
                "versions": _versions(), "timings": timings}

    outdir = os.path.join(workdir, model, "input")
    stems = {}
    uploads = {}
    for stem in ("vocals", "no_vocals"):
        path = os.path.join(outdir, f"{stem}.wav")
        if not os.path.exists(path):
            continue
        stems[stem] = {"bytes": os.path.getsize(path)}
        if stem == "vocals":
            timings["audio_duration_s"] = _wav_duration_s(path)
        url = (inp.get("put_urls") or {}).get(stem)
        if url:
            t2 = time.time()
            with open(path, "rb") as f:
                resp = requests.put(url, data=f, headers={"content-type": "audio/wav"}, timeout=300)
            resp.raise_for_status()
            uploads[stem] = {"s": round(time.time() - t2, 2), "bytes": os.path.getsize(path)}

    timings["uploads"] = uploads
    timings["total_s"] = round(time.time() - t0, 2)
    dur = timings.get("audio_duration_s")
    if dur and timings["separate_s"]:
        # >1 means faster than realtime — the number that drives cost per song.
        timings["realtime_factor"] = round(dur / timings["separate_s"], 2)

    return {
        "model": model,
        "timings": timings,
        "stems": stems,
        "versions": _versions(),
        "gpu": os.environ.get("RUNPOD_GPU_TYPE_ID", "unknown"),
    }


runpod.serverless.start({"handler": handler})
