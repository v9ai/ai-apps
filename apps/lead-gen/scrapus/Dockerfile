FROM python:3.12-slim

WORKDIR /app

# System deps for lancedb, duckdb, and scientific libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/
COPY scrapus_data/ ./scrapus_data/ 2>/dev/null || true

ENV PYTHONPATH=/app/src
ENV PYTHONUNBUFFERED=1

ENTRYPOINT ["python", "-m", "cli"]
CMD ["run"]
