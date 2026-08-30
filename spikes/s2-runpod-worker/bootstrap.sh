#!/usr/bin/env bash
# S2 spike — worker bootstrap (throwaway).
#
# WHY THIS EXISTS: the spike's own Dockerfile (alongside this file) is the shape a
# production worker takes — deps and weights baked into the image. Building it needs a
# container registry to push to, and this cloud session has no registry credentials
# (ghcr.io push is denied for the session's git-scoped GitHub token) and cannot even pull
# the base image locally (Docker Hub's blob CDN is outside the session's egress
# allowlist). So for the spike we boot the stock PyTorch image and install on top at
# worker start.
#
# CONSEQUENCE FOR THE NUMBERS: cold-start / delayTime measured this way is INFLATED by
# this install (pip + weights download) and is NOT representative of a baked image. Warm
# executionTime — which is what the cost-per-song and p50 gates rest on — is unaffected,
# because deps and weights are all resident before the handler starts serving.
#
# SELF-DIAGNOSING: a failing bootstrap under `set -e` just exits, and RunPod restarts the
# container forever with the job stuck in queue and no way to see why (the REST API
# exposes no worker logs). So instead every step is logged, and if anything fails we
# still start a handler — one that returns the boot log as its job output.
LOG=/bootstrap.log
: > "$LOG"
BOOT_OK=1
step() { echo "[$(date -u +%H:%M:%S)] $*" | tee -a "$LOG"; }
run()  { step "RUN $*"; if ! "$@" >>"$LOG" 2>&1; then step "FAILED (rc=$?): $*"; BOOT_OK=0; fi; }

REF="${HANDLER_REF:-main}"
MODELS="${PRELOAD_MODELS:-htdemucs}"
RAW="https://raw.githubusercontent.com/o4villegas/vox-stage/${REF}/spikes/s2-runpod-worker/handler.py"

step "bootstrap start (ref=${REF} models=${MODELS})"
step "python: $(python -V 2>&1) at $(command -v python)"

# Phase 1 — the RunPod SDK first and on its own: it is small, and it is what lets a
# failed bootstrap still report itself instead of vanishing into a restart loop.
run pip install --no-cache-dir --quiet runpod requests

# Phase 2 — the heavy parts.
run pip install --no-cache-dir --quiet demucs imageio-ffmpeg

# demucs shells out to ffmpeg to decode mp3; the stock pytorch image has none, and
# imageio-ffmpeg ships a static build (avoids apt in the hot path).
step "installing static ffmpeg onto PATH"
if ! python - >>"$LOG" 2>&1 <<'PY'
import imageio_ffmpeg, shutil, os, stat
dst = "/usr/local/bin/ffmpeg"
shutil.copy(imageio_ffmpeg.get_ffmpeg_exe(), dst)
os.chmod(dst, os.stat(dst).st_mode | stat.S_IEXEC)
print("ffmpeg ->", dst)
PY
then step "FAILED: ffmpeg install"; BOOT_OK=0; fi

# Pre-download weights so no job pays a model-download cost mid-execution.
for m in ${MODELS}; do
  step "preloading model ${m}"
  if ! python -c "from demucs.pretrained import get_model; get_model('${m}')" >>"$LOG" 2>&1; then
    step "FAILED: preload ${m}"; BOOT_OK=0
  fi
done

step "fetching handler from ${RAW}"
if ! curl -sSL --retry 3 -o /handler.py "${RAW}?cb=$(date +%s)" >>"$LOG" 2>&1; then
  step "FAILED: handler fetch"; BOOT_OK=0
fi
if [ -f /handler.py ] && ! python -c "import ast; ast.parse(open('/handler.py').read())" >>"$LOG" 2>&1; then
  step "FAILED: handler did not parse"; BOOT_OK=0
fi

step "bootstrap done BOOT_OK=${BOOT_OK}"

if [ "${BOOT_OK}" != "1" ] || [ ! -f /handler.py ]; then
  step "starting DIAGNOSTIC handler (bootstrap failed)"
  cat > /handler.py <<'PY'
import runpod
def handler(job):
    try:
        log = open("/bootstrap.log").read()[-8000:]
    except Exception as e:
        log = f"<no log: {e}>"
    return {"bootstrap_failed": True, "log": log}
runpod.serverless.start({"handler": handler})
PY
fi

step "starting handler"
exec python -u /handler.py
