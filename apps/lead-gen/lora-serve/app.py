"""HF Space: serve the contact-score Qwen2.5-1.5B LoRA (merged + Q4_K_M GGUF).

FastAPI + llama-cpp-python on free CPU tier (2 vCPU, 16 GB). One POST route
(``/score``) takes a serialized contact profile and returns a structured
JSON tier/score/reasons. GGUF is pulled from ``v9ai/contact-score-qwen-1.5b-gguf``
at cold start via huggingface_hub.

Called by ``apps/lead-gen/backend/leadgen_agent/score_contact_graph.py``.
The rubric below is frozen — the merged GGUF was trained against this exact
system prompt; do not edit without retraining the adapter.

Latency budget: cold start ~30-60s, warm request ~2-10s at ~5-10 tok/s.
"""

from __future__ import annotations

import json
import os
from typing import Any

from fastapi import FastAPI, HTTPException
from huggingface_hub import hf_hub_download
from llama_cpp import Llama
from pydantic import BaseModel

# Rubric — frozen, must match the prompt the GGUF was fine-tuned against.
SCORE_SYSTEM = """You rate B2B sales contacts on fit for outreach. Output strict JSON only, no prose.
Schema: {"tier": "A"|"B"|"C"|"D", "score": number in [0,1], "reasons": string[] (1-3 items)}
Tier rubric:
- A: decision-maker at ICP-fit company, strong signal (title, past roles, technical depth)
- B: influencer or junior decision-maker; clear buying role but not final authority
- C: relevant but indirect (adjacent role, unclear authority)
- D: wrong role / wrong company / low signal / likely bounce"""

GGUF_REPO = os.environ.get("GGUF_REPO", "v9ai/contact-score-qwen-1.5b-gguf")
GGUF_FILE = os.environ.get("GGUF_FILE", "contact-score.Q4_K_M.gguf")
N_CTX = int(os.environ.get("N_CTX", "2048"))
N_THREADS = int(os.environ.get("N_THREADS", "2"))

# Optional bearer gate. Public Spaces don't need this; set HF_SPACE_TOKEN in
# the Space's secrets to require Authorization: Bearer <token>.
HF_SPACE_TOKEN = os.environ.get("HF_SPACE_TOKEN", "").strip()

TIERS = {"A", "B", "C", "D"}

print(f"Downloading {GGUF_REPO}:{GGUF_FILE}…")
MODEL_PATH = hf_hub_download(repo_id=GGUF_REPO, filename=GGUF_FILE)
print(f"Loading {MODEL_PATH} (n_ctx={N_CTX}, n_threads={N_THREADS})…")
LLM = Llama(
    model_path=MODEL_PATH,
    n_ctx=N_CTX,
    n_threads=N_THREADS,
    chat_format="qwen",
    verbose=False,
)
print("Model loaded; ready.")

app = FastAPI(title="contact-score LoRA server")


class ScoreIn(BaseModel):
    profile: str


class ScoreOut(BaseModel):
    tier: str
    score: float
    reasons: list[str]


def _check_auth(auth_header: str | None) -> None:
    if not HF_SPACE_TOKEN:
        return
    if not auth_header:
        raise HTTPException(401, "missing authorization")
    scheme, _, token = auth_header.partition(" ")
    if scheme.lower() != "bearer" or token != HF_SPACE_TOKEN:
        raise HTTPException(401, "invalid bearer token")


def _score(profile: str) -> ScoreOut:
    out: dict[str, Any] = LLM.create_chat_completion(
        messages=[
            {"role": "system", "content": SCORE_SYSTEM},
            {"role": "user", "content": profile},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
        max_tokens=256,
    )
    raw = out["choices"][0]["message"]["content"] or ""
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(502, f"non-JSON output: {e}: {raw[:200]}")

    tier = str(parsed.get("tier", "D")).upper()
    if tier not in TIERS:
        tier = "D"
    try:
        score_val = float(parsed.get("score", 0.0))
    except (TypeError, ValueError):
        score_val = 0.0
    score_val = max(0.0, min(1.0, score_val))

    reasons_raw = parsed.get("reasons") or []
    if not isinstance(reasons_raw, list):
        reasons_raw = [str(reasons_raw)]
    reasons = [str(r) for r in reasons_raw if isinstance(r, (str, int, float))][:5]

    return ScoreOut(tier=tier, score=score_val, reasons=reasons)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/score", response_model=ScoreOut)
def score(inp: ScoreIn, authorization: str | None = None) -> ScoreOut:
    _check_auth(authorization)
    profile = (inp.profile or "").strip()
    if not profile:
        raise HTTPException(400, "empty profile")
    if len(profile) > 8_000:
        raise HTTPException(413, "profile exceeds 8000 chars")
    return _score(profile)
