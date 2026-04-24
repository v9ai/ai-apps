# Cloudflare Container image for lead-gen **core** (the hub).
# Holds every in-process graph except ML (ml/) and long-running research
# (research/). Stays lean: no torch, no sentence-transformers — those live
# in the ml container and are reached via RemoteGraph adapters.
#
# Build context is `backend/` (so `leadgen_agent/` resolves as a sibling).
# wrangler.jsonc sets `image: "./Dockerfile"` with `cwd=backend/core`, so
# COPY paths are relative to `backend/`.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# OS deps — psycopg[binary] ships its own libpq so we only need
# ca-certificates here. Playwright's `--with-deps` pulls everything Chromium
# needs below.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY core/requirements.txt ./
# Vendored local-path deps referenced by requirements.txt (e.g. research-client).
# Copied before `pip install` so the `./vendor/research-client` entry resolves.
COPY vendor ./vendor
RUN pip install --no-cache-dir -r requirements.txt

# Playwright's Chromium is needed by `deep_scrape_graph` and the existing
# AsyncChromiumLoader code paths. `--with-deps` adds the OS libs Chromium
# links against on Debian slim (~350 MB total).
RUN python -m playwright install --with-deps chromium

# Shared package used by every graph, identical across all 3 containers.
COPY leadgen_agent ./leadgen_agent

# Core-specific files.
COPY core/app.py ./app.py
COPY core/linkedin_api.py ./core/linkedin_api.py
COPY core/remote_graphs.py ./core/remote_graphs.py
COPY core/langgraph.json ./langgraph.json
RUN touch ./core/__init__.py

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
