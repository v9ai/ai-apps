# HF Spaces Docker SDK target. Binds 0.0.0.0:7860 (the only port Spaces exposes).
# Single worker keeps AsyncPostgresSaver's connection pool and app.state.graphs
# dict coherent — the free tier gives one CPU anyway.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install OS deps first for better layer caching. `psycopg[binary]` ships its
# own libpq, so we don't need libpq-dev here — gcc is only needed if a wheel is
# missing, which is fine for the slim base.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
# Vendored local-path deps referenced by requirements.txt (e.g. research-client).
# Copied before `pip install` so the local-path entries resolve.
COPY vendor ./vendor
RUN pip install --no-cache-dir -r requirements.txt

# Playwright's Chromium is needed by AsyncChromiumLoader in competitor_loader.
# `--with-deps` pulls the OS libs Chromium needs on slim Debian (~350 MB total).
RUN python -m playwright install --with-deps chromium

COPY app.py ./
COPY leadgen_agent ./leadgen_agent

EXPOSE 7860

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
