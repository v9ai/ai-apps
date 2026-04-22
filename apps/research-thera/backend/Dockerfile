# Cloudflare Container image for research-thera LangGraph graphs.
# Ships all 8 graphs: books, research, story, tts, deep_analysis, parent_advice,
# habits, generate_therapy_research. Vendors the shared `deepseek_client` and
# `research_client` packages (mirrored from pypackages/ at deploy time) so the
# Docker build context stays inside backend/.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HF_HOME=/app/.cache/huggingface \
    SENTENCE_TRANSFORMERS_HOME=/app/.cache/huggingface/sentence-transformers

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the sentence-transformers models used by research_client so
# cold-start requests don't pay the model download cost.
RUN python - <<'PY'
from sentence_transformers import SentenceTransformer, CrossEncoder
SentenceTransformer("all-MiniLM-L6-v2")
CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
PY

COPY app.py ./
COPY research_agent ./research_agent
COPY deepseek_client ./deepseek_client
COPY research_client ./research_client

EXPOSE 8080

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
