# S2 spike — RunPod serverless worker: htdemucs 2-stem separation.
# Base tag verified to exist on Docker Hub 2026-08-28.
FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir demucs runpod requests

# Pre-download htdemucs weights into the image so cold starts don't fetch them.
RUN python -c "from demucs.pretrained import get_model; get_model('htdemucs')"

COPY handler.py /handler.py
CMD ["python", "-u", "/handler.py"]
