#!/usr/bin/env bash
# S2 spike — worker bootstrap (throwaway).
#
# WHY THIS EXISTS: the spike's own Dockerfile (alongside this file) is the shape a
# production worker takes — deps and weights baked into the image. Building it needs a
# container registry to push to, and this cloud session has no registry credentials
# (ghcr.io push is denied for the session's git-scoped GitHub token). So for the spike we
# boot RunPod's stock PyTorch image and install on top at worker start.
#
# CONSEQUENCE FOR THE NUMBERS: cold-start / delayTime measured this way is INFLATED by
# this install (pip + weights download) and is NOT representative of a baked image. Warm
# executionTime — which is what the cost-per-song and p50 gates rest on — is unaffected,
# because deps and weights are all resident before the handler starts serving.
set -euo pipefail

REF="${HANDLER_REF:-main}"
MODELS="${PRELOAD_MODELS:-htdemucs hdemucs_mmi}"
RAW="https://raw.githubusercontent.com/o4villegas/vox-stage/${REF}/spikes/s2-runpod-worker/handler.py"

echo "[bootstrap] installing python deps"
pip install --no-cache-dir --quiet demucs runpod requests imageio-ffmpeg

# demucs shells out to ffmpeg to decode mp3; the stock pytorch image has none, and
# imageio-ffmpeg ships a static build (avoids apt in the hot path).
echo "[bootstrap] installing static ffmpeg onto PATH"
python -c "
import imageio_ffmpeg, shutil, os, stat
dst = '/usr/local/bin/ffmpeg'
shutil.copy(imageio_ffmpeg.get_ffmpeg_exe(), dst)
os.chmod(dst, os.stat(dst).st_mode | stat.S_IEXEC)
print('ffmpeg ->', dst)
"

# Pre-download weights so no job pays a model-download cost mid-execution.
echo "[bootstrap] preloading models: ${MODELS}"
for m in ${MODELS}; do
  python -c "from demucs.pretrained import get_model; get_model('${m}'); print('preloaded ${m}')"
done

echo "[bootstrap] fetching handler from ${RAW}"
curl -sSL --retry 3 -o /handler.py "${RAW}?cb=$(date +%s)"
python -c "import ast,sys; ast.parse(open('/handler.py').read()); print('handler parsed ok')"

echo "[bootstrap] starting handler"
exec python -u /handler.py
