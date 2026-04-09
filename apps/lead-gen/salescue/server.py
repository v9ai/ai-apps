"""salescue/server.py — FastAPI server exposing all 16 ML modules.

Usage:
    uvicorn salescue.server:app --reload --port 8000
    # or: make dev
"""

from __future__ import annotations

import json
import logging
import time
from contextlib import asynccontextmanager
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

logger = logging.getLogger("salescue")


# ── Startup warmup ──────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Preload DeBERTa model and prototype embeddings on startup."""
    from .modules.company_classifier import _get_prototype_embeds

    t0 = time.perf_counter()

    # 1. Load model weights + tokenizer into memory
    SharedEncoder.load()

    # 2. Dummy encode to JIT-compile any MPS/CUDA kernels
    SharedEncoder.encode("warmup")

    # 3. Pre-compute staffing/non-staffing prototype embeddings
    _get_prototype_embeds()

    elapsed = round(time.perf_counter() - t0, 1)
    logger.info(f"Model loaded in {elapsed}s")
    print(f"[salescue] Model loaded in {elapsed}s")

    yield


app = FastAPI(
    title="SalesCue",
    version="0.3.0",
    description="Sales intelligence API — 16 ML modules for lead scoring, intent, spam, sentiment, and more.",
    lifespan=lifespan,
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


class SkillsRequest(BaseModel):
    text: str
    top_k: int = 10
    threshold: float = 0.35


class CompanyClassifyRequest(BaseModel):
    company_id: int
    name: str
    description: str = ""
    website: str = ""
    location: str = ""
    size: str = ""
    industry: str = ""


class CompanyBatchClassifyRequest(BaseModel):
    companies: list[CompanyClassifyRequest]


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
    kwargs = {}
    if req.touchpoint is not None:
        kwargs["touchpoint"] = req.touchpoint
    return _run_module("reply", req.text, **kwargs)


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


@app.post("/skills")
def skills(req: SkillsRequest):
    return _run_module("skills", req.text, top_k=req.top_k, threshold=req.threshold)


@app.post("/graph")
def graph(req: GraphRequest):
    kwargs: dict[str, Any] = {}
    if req.graph:
        kwargs["graph"] = req.graph
    return _run_module("graph", req.text, **kwargs)


# ── Company classifier (standalone — not an Engine module) ───────────────────


def _parse_size(size: str) -> int:
    """Parse LinkedIn size strings like '51-200 employees' → upper bound (200)."""
    import re
    m = re.match(r"(\d[\d,]*)\s*[-–]\s*(\d[\d,]*)", size)
    if m:
        return int(m.group(2).replace(",", ""))
    m2 = re.search(r"(\d[\d,]+)", size)
    if m2:
        return int(m2.group(1).replace(",", ""))
    return 999999  # unknown — don't flag


@app.post("/classify-company")
async def classify_company(req: CompanyClassifyRequest):
    """Classify whether a company is a staffing/recruitment firm.

    Called fire-and-forget by the GraphQL importCompanies resolver.
    If staffing detected, tags the company as an ICP target (does NOT block).
    """
    import asyncio
    from .modules.company_classifier import classify_company as _classify

    # Prepend industry to description so the classifier can use it as a signal
    description = f"{req.industry}. {req.description}" if req.industry else req.description

    t0 = time.perf_counter()
    result = _classify(
        name=req.name,
        description=description,
        website=req.website,
        location=req.location,
    )
    elapsed = round(time.perf_counter() - t0, 4)

    import re

    # Parse size — from explicit field or from description
    size_str = req.size
    if not size_str and req.description:
        size_match = re.search(r"Size:\s*(.+?)(?:\n|$)", req.description)
        if size_match:
            size_str = size_match.group(1).strip()

    employee_count = _parse_size(size_str)

    # Geo relevance: exclude firms *focused* on irrelevant regions.
    # We split terms into strong signals (regional labels that imply focus)
    # and weak signals (individual country names that may be incidental).
    # Strong signal = instant flag.  Weak signals use a threshold: 2+ hits → flag.
    # This avoids false-positives like "offices in 30 countries including India".

    _STRONG_GEO_TERMS = (
        # Regional / bloc labels — these almost always indicate focus
        r"latam|latin america|sub-saharan|west africa|east africa|north africa"
        r"|central america|south america|central asia|oceania"
        r"|south asia|southeast asia|eastern europe"
        r"|apac|mena|gcc|asean|mercosur|caricom"
        r"|middle east"
    )
    _WEAK_GEO_TERMS = (
        # Individual countries — a single mention may be incidental
        r"india|philippines|nigeria|pakistan|bangladesh|vietnam"
        r"|indonesia|thailand|malaysia|myanmar|cambodia"
        r"|kenya|ghana|ethiopia|tanzania|uganda"
        r"|egypt|morocco|sri lanka"
        r"|colombia|brazil|mexico|argentina|peru|chile"
        r"|saudi arabia|united arab emirates|\buae\b|qatar|kuwait|bahrain|oman"
    )

    _STRONG_GEO_RE = re.compile(
        rf"\b({_STRONG_GEO_TERMS})\b", re.IGNORECASE,
    )
    _WEAK_GEO_RE = re.compile(
        rf"\b({_WEAK_GEO_TERMS})\b", re.IGNORECASE,
    )
    # "africa" alone is strong, but inside "EMEA" it includes Europe (relevant).
    # Only flag EMEA when paired with an explicit Africa/Middle-East mention.
    _EMEA_RE = re.compile(r"\bemea\b", re.IGNORECASE)
    _AFRICA_OR_ME_RE = re.compile(
        r"\b(africa|middle east|mena)\b", re.IGNORECASE,
    )
    # Standalone "africa" is strong — but exclude "south africa" which is relevant
    _AFRICA_STANDALONE_RE = re.compile(r"\bafrica\b", re.IGNORECASE)
    _SOUTH_AFRICA_RE = re.compile(r"\bsouth africa\b", re.IGNORECASE)

    geo_text = f"{req.name} {req.description} {req.location}"

    # --- evaluate geo signals ---
    strong_hits = len(_STRONG_GEO_RE.findall(geo_text))

    # "africa" needs special handling: don't count if every occurrence is
    # part of "south africa" (South Africa is a relevant market).
    africa_all = _AFRICA_STANDALONE_RE.findall(geo_text)
    south_africa_all = _SOUTH_AFRICA_RE.findall(geo_text)
    if africa_all and len(africa_all) <= len(south_africa_all):
        # All "africa" mentions are inside "south africa" — not a signal.
        # Remove the "africa" strong hits that came from "south africa".
        strong_hits = max(0, strong_hits - len(south_africa_all))

    weak_hits = len(_WEAK_GEO_RE.findall(geo_text))

    # EMEA is only a signal when the text also mentions Africa / Middle East
    emea_flag = bool(_EMEA_RE.search(geo_text)) and bool(
        _AFRICA_OR_ME_RE.search(geo_text)
    )
    if emea_flag:
        strong_hits += 1

    is_irrelevant_geo = strong_hits >= 1 or weak_hits >= 2

    is_target = result["is_staffing"] and employee_count <= 200 and not is_irrelevant_geo
    result["is_target"] = is_target
    result["employee_count"] = employee_count
    result["is_irrelevant_geo"] = is_irrelevant_geo

    # If staffing detected, tag as ICP target (don't block)
    if result["is_staffing"]:
        asyncio.create_task(_update_company_tagged(
            company_id=req.company_id,
            confidence=result["confidence"],
            reasons=result["reasons"],
            is_target=is_target,
        ))

    return {
        "result": result,
        "company_id": req.company_id,
        "time_s": elapsed,
    }


async def _update_company_tagged(
    company_id: int,
    confidence: float,
    reasons: list[str],
    is_target: bool = False,
) -> None:
    """Tag a staffing company in the DB. If it's an ICP target (≤200 employees), add 'target-icp' tag."""
    import os

    db_url = os.environ.get("NEON_DATABASE_URL") or os.environ.get("DATABASE_URL", "")
    if not db_url:
        print(f"[classify-company] No DATABASE_URL — cannot update company {company_id}")
        return

    try:
        import asyncpg  # type: ignore[import-untyped]
    except ImportError:
        print(f"[classify-company] asyncpg not available — cannot update company {company_id}")
        return

    import json

    conn = await asyncpg.connect(db_url)
    try:
        if is_target:
            # tags is a text column storing a JSON array string
            row = await conn.fetchrow("SELECT tags FROM companies WHERE id = $1", company_id)
            existing_tags: list[str] = []
            if row and row["tags"]:
                try:
                    existing_tags = json.loads(row["tags"])
                except (json.JSONDecodeError, TypeError):
                    existing_tags = []
            if "target-icp" not in existing_tags:
                existing_tags.append("target-icp")
            await conn.execute(
                """UPDATE companies
                   SET category = 'STAFFING',
                       tags = $1,
                       ai_classification_reason = $2,
                       ai_classification_confidence = $3,
                       updated_at = now()
                 WHERE id = $4""",
                json.dumps(existing_tags),
                "; ".join(reasons),
                confidence,
                company_id,
            )
            print(f"[classify-company] Tagged ICP target id={company_id} (confidence={confidence:.2f})")
        else:
            await conn.execute(
                """UPDATE companies
                   SET category = 'STAFFING',
                       ai_classification_reason = $1,
                       ai_classification_confidence = $2,
                       updated_at = now()
                 WHERE id = $3""",
                "; ".join(reasons),
                confidence,
                company_id,
            )
            print(f"[classify-company] Tagged staffing firm id={company_id} (confidence={confidence:.2f})")
    finally:
        await conn.close()


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
