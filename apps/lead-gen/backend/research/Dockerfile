# Research CF Container for the lead-gen LangGraph split.
# Serves 6 research graphs (research_agent, scholar, lead_papers, common_crawl,
# agentic_search, gh_patterns). Deliberately lean — no torch, no playwright.
# The sibling ml/ container owns heavy ML inference; this one is scraping,
# HTTP, SQL, and LLM-as-API calls.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# ca-certificates is needed for HTTPS to OpenAlex / arXiv / GitHub / etc.
# psycopg[binary] ships its own libpq so we don't need libpq-dev.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# The shared leadgen_agent package lives one directory up. Cloudflare's
# container build context is the directory containing wrangler.jsonc
# (i.e. research/), so the deploy script copies ../leadgen_agent into
# research/ before `wrangler deploy` runs. Keep the COPY path local.
COPY leadgen_agent ./leadgen_agent

COPY app.py ./
COPY research_graphs ./research_graphs

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
