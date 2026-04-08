"""salescue/server.py — FastAPI server exposing all 16 ML modules.

Usage:
    uvicorn salescue.server:app --reload --port 8000
    # or: make dev
"""

from __future__ import annotations

import json
import time
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .backbone import SharedEncoder, get_device
from .engine import Engine, list_modules, _ensure_registry, MODULE_REGISTRY
from .validation import (
    SalesCueValidationError,
    validate_text,
    validate_transcript,
    validate_subjects,
)

app = FastAPI(
    title="SalesCue",
    version="0.3.0",
    description="Sales intelligence API — 16 ML modules for lead scoring, intent, spam, sentiment, and more.",
)

# ── Lazy engine singleton ────────────────────────────────────────────────────

_engine: Engine | None = None


def _get_engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = Engine().preload()
    return _engine


# ── Request / Response models ────────────────────────────────────────────────


class TextRequest(BaseModel):
    text: str


class IntentRequest(BaseModel):
    text: str
    event_history: Optional[list[dict[str, Any]]] = None


class ReplyRequest(BaseModel):
    text: str
    touchpoint: Optional[int] = None


class ICPRequest(BaseModel):
    icp: str
    prospect: str


class SubjectRequest(BaseModel):
    subjects: list[str]


class CallRequest(BaseModel):
    transcript: list[dict[str, str]]


class AnomalyRequest(BaseModel):
    text: str
    signals: dict[str, list[float]]


class SurvivalRequest(BaseModel):
    text: str
    structured_features: Optional[list[float]] = None


class BanditRequest(BaseModel):
    text: str
    structured_features: Optional[list[float]] = None


class EmailgenRequest(BaseModel):
    text: str
    email_type: str = "initial_outreach"
    context: Optional[dict[str, str]] = None


class GraphRequest(BaseModel):
    text: str
    graph: Optional[dict[str, Any]] = None


class AnalyzeRequest(BaseModel):
    text: str
    modules: Optional[list[str]] = None


class BanditUpdateRequest(BaseModel):
    text: str
    arm_index: int
    reward: float
    structured_features: Optional[list[float]] = None


# ── Helper ───────────────────────────────────────────────────────────────────


def _run_module(name: str, text: str, **kwargs: Any) -> dict[str, Any]:
    """Run a single module by name, return its result dict."""
    engine = _get_engine()
    if name not in engine._modules:
        raise HTTPException(status_code=404, detail=f"Module '{name}' not found")

    module = engine._modules[name]
    validated = validate_text(text)
    encoded = SharedEncoder.encode(validated)

    t0 = time.perf_counter()
    result = module.process(encoded, validated, **kwargs)
    elapsed = round(time.perf_counter() - t0, 4)

    return {"result": result, "module": name, "time_s": elapsed}


# ── Health ───────────────────────────────────────────────────────────────────


@app.get("/health")
def health():
    _ensure_registry()
    return {
        "status": "ok",
        "version": "0.3.0",
        "modules": list_modules(),
        "module_count": len(list_modules()),
        "device": str(get_device()),
    }


# ── Individual module endpoints ──────────────────────────────────────────────


@app.post("/score")
def score(req: TextRequest):
    return _run_module("score", req.text)


@app.post("/intent")
def intent(req: IntentRequest):
    return _run_module("intent", req.text, event_history=req.event_history)


@app.post("/reply")
def reply(req: ReplyRequest):
    return _run_module("reply", req.text, touchpoint=req.touchpoint)


@app.post("/sentiment")
def sentiment(req: TextRequest):
    return _run_module("sentiment", req.text)


@app.post("/triggers")
def triggers(req: TextRequest):
    return _run_module("triggers", req.text)


@app.post("/icp")
def icp(req: ICPRequest):
    text = json.dumps({"icp": req.icp, "prospect": req.prospect})
    return _run_module("icp", text)


@app.post("/spam")
def spam(req: TextRequest):
    return _run_module("spam", req.text)


@app.post("/objection")
def objection(req: TextRequest):
    return _run_module("objection", req.text)


@app.post("/entities")
def entities(req: TextRequest):
    return _run_module("entities", req.text)


@app.post("/subject")
def subject(req: SubjectRequest):
    validated = validate_subjects(req.subjects)
    text = json.dumps(validated)
    return _run_module("subject", text)


@app.post("/survival")
def survival(req: SurvivalRequest):
    import torch

    kwargs: dict[str, Any] = {}
    if req.structured_features is not None:
        kwargs["structured_features"] = torch.tensor(
            [req.structured_features], dtype=torch.float32
        ).to(get_device())
    return _run_module("survival", req.text, **kwargs)


@app.post("/bandit")
def bandit(req: BanditRequest):
    import torch

    kwargs: dict[str, Any] = {}
    if req.structured_features is not None:
        kwargs["structured_features"] = torch.tensor(
            [req.structured_features], dtype=torch.float32
        ).to(get_device())
    return _run_module("bandit", req.text, **kwargs)


@app.post("/bandit/update")
def bandit_update(req: BanditUpdateRequest):
    """Update bandit arm posterior after observing a reward."""
    import torch

    engine = _get_engine()
    module = engine._modules.get("bandit")
    if module is None:
        raise HTTPException(status_code=404, detail="Bandit module not loaded")

    validated = validate_text(req.text)
    encoded = SharedEncoder.encode(validated)

    sf = None
    if req.structured_features is not None:
        sf = torch.tensor(
            [req.structured_features], dtype=torch.float32
        ).to(get_device())

    module.update_reward(encoded, req.text, req.arm_index, req.reward, structured_features=sf)
    return {"status": "updated", "arm_index": req.arm_index, "reward": req.reward}


@app.post("/call")
def call(req: CallRequest):
    validated = validate_transcript(req.transcript)
    engine = _get_engine()
    module = engine._modules.get("call")
    if module is None:
        raise HTTPException(status_code=404, detail="Call module not loaded")

    # Call module uses encoder/tokenizer directly
    encoder, tokenizer = SharedEncoder.load()
    t0 = time.perf_counter()
    result = module.process_transcript(encoder, tokenizer, validated)
    elapsed = round(time.perf_counter() - t0, 4)
    return {"result": result, "module": "call", "time_s": elapsed}


@app.post("/anomaly")
def anomaly(req: AnomalyRequest):
    import torch

    engine = _get_engine()
    module = engine._modules.get("anomaly")
    if module is None:
        raise HTTPException(status_code=404, detail="Anomaly module not loaded")

    validated = validate_text(req.text)
    encoded = SharedEncoder.encode(validated)

    t0 = time.perf_counter()
    result = module.process(encoded, validated, signals=req.signals)
    elapsed = round(time.perf_counter() - t0, 4)
    return {"result": result, "module": "anomaly", "time_s": elapsed}


@app.post("/emailgen")
def emailgen(req: EmailgenRequest):
    kwargs: dict[str, Any] = {"email_type": req.email_type}
    if req.context:
        kwargs["context"] = req.context
    return _run_module("emailgen", req.text, **kwargs)


@app.post("/graph")
def graph(req: GraphRequest):
    kwargs: dict[str, Any] = {}
    if req.graph:
        kwargs["graph"] = req.graph
    return _run_module("graph", req.text, **kwargs)


# ── Batch analysis ───────────────────────────────────────────────────────────


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    """Run multiple modules on a single text. Uses the Engine."""
    engine = _get_engine()

    if req.modules:
        # Validate module names
        available = set(engine._modules.keys())
        unknown = set(req.modules) - available
        if unknown:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown modules: {sorted(unknown)}. Available: {sorted(available)}",
            )

    validated = validate_text(req.text)
    encoded = SharedEncoder.encode(validated)

    modules_to_run = req.modules or list(engine._modules.keys())
    results: dict[str, Any] = {}
    timings: dict[str, float] = {}
    errors: list[dict[str, str]] = []

    for name in modules_to_run:
        # Skip modules that need special inputs
        if name in ("call", "anomaly"):
            continue
        module = engine._modules[name]
        t0 = time.perf_counter()
        try:
            results[name] = module.process(encoded, validated)
        except Exception as e:
            errors.append({"module": name, "error": str(e)})
        timings[name] = round(time.perf_counter() - t0, 4)

    return {
        "results": results,
        "timings": timings,
        "errors": errors,
        "total_time": round(sum(timings.values()), 4),
        "modules_run": len(results),
    }


# ── Error handler ────────────────────────────────────────────────────────────


@app.exception_handler(SalesCueValidationError)
async def validation_error_handler(request, exc):
    return HTTPException(status_code=422, detail=str(exc))
