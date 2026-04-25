# Cloudflare Container image for research-thera LangGraph graphs.
# Ships all 8 graphs: books, research, story, tts, deep_analysis, parent_advice,
# habits, generate_therapy_research. Vendors the shared `deepseek_client` and
# `research_client` packages (mirrored from pypackages/ at deploy time) so the
# Docker build context stays inside backend/.
#
# Two-stage build: builder installs deps into /root/.local via `pip install --user`,
# runtime stage copies just that tree — drops pip/setuptools/wheel caches and
# build-time __pycache__ dirs (~150 MB).
FROM python:3.12-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

COPY requirements.txt ./
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/app/.cache/huggingface \
    SENTENCE_TRANSFORMERS_HOME=/app/.cache/huggingface/sentence-transformers \
    PATH="/root/.local/bin:$PATH"

# libgomp1: torch CPU wheel links libgomp.so.1 (OpenMP runtime). Today this
# works only because numpy/transformers wheels happen to bundle a copy —
# fragile across wheel-version bumps. Install it explicitly.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates libgomp1 \
 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /root/.local

WORKDIR /app

# Pre-download the sentence-transformers models used by research_client so
# cold-start requests don't pay the model download cost.
RUN python - <<'PY'
from sentence_transformers import SentenceTransformer, CrossEncoder
SentenceTransformer("all-MiniLM-L6-v2")
CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
PY

# Code COPY block — kept last so source edits don't invalidate the
# pip-install or model-preload layers above.
COPY app.py ./
COPY research_agent ./research_agent
COPY deepseek_client ./deepseek_client
COPY research_client ./research_client

EXPOSE 8080

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
