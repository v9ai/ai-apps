# HF Space (Docker SDK, cpu-basic). Serves contact-score Qwen2.5-1.5B Q4_K_M
# via FastAPI + llama-cpp-python.
FROM python:3.11-slim

# Build deps for llama-cpp-python (C++ compiler + cmake). Kept in one layer.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        cmake \
        git \
        curl \
    && rm -rf /var/lib/apt/lists/*

# HF Spaces run as UID 1000 by convention. Pre-create the user so the
# huggingface-hub cache lives in a writable location.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    HF_HOME=/home/user/.cache/huggingface \
    PYTHONUNBUFFERED=1

WORKDIR $HOME/app

COPY --chown=user requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

COPY --chown=user app.py .

# HF Spaces expect the app on port 7860.
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
