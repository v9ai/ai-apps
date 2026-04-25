# Cloudflare Container image for lead-gen ML graphs.
# Ships two leaf LangGraph graphs: bge_m3_embed (BAAI/bge-m3, ~2.3 GB) and
# jobbert_ner (TechWolf/JobBERT-v3 + jjzha/jobbert_knowledge_extraction, ~500 MB).
# Weights are baked into the image at build time so cold starts skip the HF
# download (~3 GB savings against first-request latency). CPU-only torch wheel
# keeps the total image under the 3.5 GB target.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HF_HOME=/app/.cache/huggingface \
    SENTENCE_TRANSFORMERS_HOME=/app/.cache/huggingface/sentence-transformers \
    TRANSFORMERS_OFFLINE=0

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the two HF model stacks used by the ML graphs so the first
# request does not pay the download cost (~2.8 GB total). Uses the same
# loader paths the graphs take at runtime.
RUN python - <<'PY'
from sentence_transformers import SentenceTransformer
SentenceTransformer("BAAI/bge-m3")

from huggingface_hub import hf_hub_download
from transformers import AutoModel, AutoModelForTokenClassification, AutoTokenizer
AutoTokenizer.from_pretrained("TechWolf/JobBERT-v3")
AutoModel.from_pretrained("TechWolf/JobBERT-v3")
hf_hub_download(
    repo_id="TechWolf/JobBERT-v3",
    filename="2_Asym/6235903824_Dense/model.safetensors",
)
AutoTokenizer.from_pretrained("jjzha/jobbert_knowledge_extraction")
AutoModelForTokenClassification.from_pretrained("jjzha/jobbert_knowledge_extraction")
PY

# The ml container reuses the shared contracts + jobbert_infer modules from
# leadgen_agent. Build context is `backend/ml/` so we pull from the sibling
# directory via Docker build context; wrangler builds with cwd=backend/ml, so
# this COPY expects the build to be run with `cwd=backend/` passing `ml/` as
# the dockerfile path. See wrangler.jsonc `image` field.
COPY leadgen_agent ./leadgen_agent

COPY app.py ./app.py
COPY ml_graphs ./ml_graphs
COPY langgraph.json ./langgraph.json

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
