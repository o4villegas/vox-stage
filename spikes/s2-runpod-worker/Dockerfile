# S2 spike — RunPod serverless worker: 2-stem separation (vocals / no_vocals).
#
# THIS IS THE SHAPE RUNPOD REQUIRES (R51): the handler must be the image's CMD. Booting a
# generic image and installing at start via `dockerStartCmd` never claims jobs — measured,
# three variants, with no worker logs on API v1 to explain it. (API *v2* does stream worker
# logs — `/v2/serverless/{id}/workers/{workerId}/logs`, R55 — so debug there, not v1.)
#
# Two ways to get this onto an endpoint, both fine — point the template at the image with NO
# dockerStartCmd override:
#   1. RunPod's GitHub integration builds it for you, no registry credential (R54).
#   2. Build and push yourself:
#        docker build -t <registry>/voxstage-s2:1 .
#        docker push  <registry>/voxstage-s2:1
#
# This file builds clean, verified 2026-09-01: 11 GB, ≈10 min, demucs 4.1.0 / torch
# 2.5.1+cu124, and the handler runs inside the image end-to-end (R53).
#
# Give the endpoint generous container disk: the SDK's fitness checks hard-kill any worker
# with under 10% free disk (R51), and that failure is invisible from outside.
FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime

# demucs shells out to ffmpeg to decode mp3; the runtime image ships none.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir demucs runpod requests

# Bake the weights in so no job pays a download mid-execution. htdemucs is the primary;
# hdemucs_mmi is the MIT-weights fallback benchmarked alongside it because of the
# weights-licensing question in R48.
RUN python -c "from demucs.pretrained import get_model; get_model('htdemucs'); get_model('hdemucs_mmi')"

# Resolve the handler from EITHER build context (R55). RunPod's GitHub integration exposes a
# "Dockerfile Path" setting but never documents what directory becomes the build context, and
# its wording ("if not in root") implies `docker build -f <path> .` with the context at the
# repo root — where a plain `COPY handler.py` fails. Measured both ways: the plain COPY errors
# under a repo-root context, this form builds clean under both and picks the right file
# (handler.py is unique in the tree; the repo is ~432 KB, so copying the context is cheap).
COPY . /ctx
RUN set -eux; \
    src="$(find /ctx -name handler.py -type f | head -n1)"; \
    test -n "$src"; \
    cp "$src" /handler.py; \
    rm -rf /ctx

CMD ["python", "-u", "/handler.py"]
