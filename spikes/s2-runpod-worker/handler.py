"""S2 spike — RunPod serverless handler: URL in, stems out via presigned PUTs.

Input (job["input"]):
  audio_url: presigned GET URL for the source audio (payload cap forces URL I/O)
  put_urls:  {"vocals": <presigned PUT>, "no_vocals": <presigned PUT>}  (either optional)

Returns timing breakdown so the spike can measure cost/latency per stage.
Throwaway spike code — the production job also does melody extraction (S3).
"""
import os
import subprocess
import tempfile
import time

import requests
import runpod


def handler(job):
    inp = job["input"]
    timings = {}
    t0 = time.time()

    workdir = tempfile.mkdtemp()
    src = os.path.join(workdir, "input")
    r = requests.get(inp["audio_url"], timeout=120)
    r.raise_for_status()
    with open(src, "wb") as f:
        f.write(r.content)
    timings["download_s"] = round(time.time() - t0, 2)
    timings["input_bytes"] = len(r.content)

    t1 = time.time()
    subprocess.run(
        ["python", "-m", "demucs.separate", "--two-stems", "vocals",
         "-n", "htdemucs", "-o", workdir, src],
        check=True,
    )
    timings["separate_s"] = round(time.time() - t1, 2)

    outdir = os.path.join(workdir, "htdemucs", "input")
    uploads = {}
    for stem in ("vocals", "no_vocals"):
        url = (inp.get("put_urls") or {}).get(stem)
        path = os.path.join(outdir, f"{stem}.wav")
        if url and os.path.exists(path):
            t2 = time.time()
            with open(path, "rb") as f:
                resp = requests.put(url, data=f, headers={"content-type": "audio/wav"}, timeout=300)
            resp.raise_for_status()
            uploads[stem] = {"s": round(time.time() - t2, 2), "bytes": os.path.getsize(path)}
    timings["uploads"] = uploads
    timings["total_s"] = round(time.time() - t0, 2)

    return {"timings": timings, "gpu": os.environ.get("RUNPOD_GPU_TYPE_ID", "unknown")}


runpod.serverless.start({"handler": handler})
