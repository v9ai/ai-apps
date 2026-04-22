# Cloudflare Container image for research-thera LangGraph graphs. Ships only
# the self-contained graphs (currently `books`) — the ML-heavy research/story/
# tts graphs still run via `langgraph dev` locally.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py ./
COPY research_agent ./research_agent
COPY deepseek_client ./deepseek_client

# Only the books graph runs in the container today; drop the siblings so the
# image stays slim and avoids pulling their transitive deps at import time.
RUN find ./research_agent -maxdepth 1 -type f -name '*_graph.py' \
    ! -name 'books_graph.py' -delete \
 && rm -f ./research_agent/neon.py ./research_agent/d1.py \
          ./research_agent/cli.py ./research_agent/story.py \
          ./research_agent/research_sources.py ./research_agent/reranker.py \
          ./research_agent/therapy_context.py ./research_agent/embeddings.py \
          ./research_agent/backfill_embeddings.py

EXPOSE 8080

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
