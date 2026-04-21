---
title: Contact Score Server
emoji: 🏷️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
license: apache-2.0
short_description: Qwen2.5-1.5B LoRA for B2B contact tier/score
---

# contact-score-server

FastAPI + `llama-cpp-python` Space that serves a Qwen2.5-1.5B LoRA
(merged and quantized to Q4_K_M) for scoring B2B sales contacts.

## Endpoints

- `GET /health` — liveness check, returns `{"status":"ok"}`.
- `POST /score` — body `{"profile": "<serialized contact profile>"}`,
  returns `{"tier": "A"|"B"|"C"|"D", "score": float, "reasons": [str]}`.

## Runtime

- Base: `Qwen/Qwen2.5-1.5B-Instruct` (Apache-2.0)
- Adapter: `v9ai/contact-score-qwen-1.5b-lora`
- Served GGUF: `v9ai/contact-score-qwen-1.5b-gguf` (Q4_K_M)
- Hardware: `cpu-basic` (2 vCPU, 16 GB). Sleeps on idle. Cold start ≈30–60 s.

## Rubric

The system prompt lives in `app.py` as `SCORE_SYSTEM` and must stay in sync
with the training rubric at `apps/lead-gen/mlx-training/label_contact_score.py`.

## Env vars

- `GGUF_REPO` — override the GGUF source (default `v9ai/contact-score-qwen-1.5b-gguf`).
- `GGUF_FILE` — override the file name within the repo (default `contact-score.Q4_K_M.gguf`).
- `N_CTX` — llama.cpp context window (default 2048).
- `N_THREADS` — llama.cpp thread count (default 2, matches cpu-basic).
- `HF_SPACE_TOKEN` — optional bearer secret. When set, every `/score` request
  must carry `Authorization: Bearer <token>`. Leave unset to keep the Space
  open for anonymous calls.

## Client

Called by the lead-gen LangGraph backend at
`apps/lead-gen/backend/leadgen_agent/score_contact_graph.py`. The GraphQL
mutations `scoreContactLora` and `batchScoreContactsLora` route through that
graph. No other caller.
