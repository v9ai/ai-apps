# Cloudflare Container image for agentic-healthcare LangGraph chat service.
# Ships the FastAPI app (chat_server.py) with LlamaIndex + FastEmbed for local
# embeddings (bge-large-en-v1.5, 1024-dim) and LlamaParse for PDF ingestion.
# Mirrors apps/research-thera/backend/Dockerfile — same slim Python base, same
# single-worker uvicorn entry — differences are the port (8001) and the
# modules COPY'd in (chat_server + graph + routes + ingestion helpers).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# psycopg[binary] ships its own libpq; fastembed pulls manylinux onnxruntime
# wheels — no extra system libs required beyond ca-certificates for TLS to
# Neon / R2 / LlamaCloud.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# FastEmbed model weights (bge-large-en-v1.5 ~1.3 GB, bge-small-en-v1.5 ~130 MB)
# are downloaded lazily on first embedding call and cached under
# /root/.cache/fastembed inside the container. Keeping the image slim by NOT
# baking the weights in — first request after a cold start pays the download
# cost once, then subsequent requests are fast until the instance sleeps.

# Copy FastAPI app, LangGraph pipeline, local modules, and routes.
COPY chat_server.py ./
COPY config.py ./
COPY db.py ./
COPY embeddings.py ./
COPY graph.py ./
COPY ingestion_graph.py ./
COPY ingestion_pipeline.py ./
COPY search_graph.py ./
COPY llm_backend.py ./
COPY llm_settings.py ./
COPY parsers.py ./
COPY postprocessors.py ./
COPY retrievers.py ./
COPY storage.py ./
COPY routes ./routes

EXPOSE 8001

CMD ["uvicorn", "chat_server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
