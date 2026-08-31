# S2 spike — RunPod serverless worker: 2-stem separation (vocals / no_vocals).
#
# THIS IS THE SHAPE RUNPOD REQUIRES (R51): the handler must be the image's CMD. Booting a
# generic image and installing at start via `dockerStartCmd` never claims jobs — measured,
# three variants, no worker logs available to explain it. Build and push this image, then
# point the template at it with NO dockerStartCmd override.
#
#   docker build -t <registry>/voxstage-s2:1 .
#   docker push  <registry>/voxstage-s2:1
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

COPY handler.py /handler.py
CMD ["python", "-u", "/handler.py"]
