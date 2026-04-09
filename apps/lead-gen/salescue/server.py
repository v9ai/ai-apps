"""salescue/server.py — FastAPI server exposing all 16 ML modules.

Usage:
    uvicorn salescue.server:app --reload --port 8000
    # or: make dev
"""

from __future__ import annotations

import json
import logging
import os
import re
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


# ── Module-level geo regex (reused by single + batch classify) ──────────────

_STRONG_GEO_TERMS = (
    r"latam|latin america|sub-saharan|west africa|east africa|north africa"
    r"|central america|south america|central asia|oceania"
    r"|south asia|southeast asia|eastern europe"
    r"|apac|mena|gcc|asean|mercosur|caricom"
    r"|middle east"
)
_WEAK_GEO_TERMS = (
    r"asia|india|philippines|nigeria|pakistan|bangladesh|vietnam"
    r"|indonesia|thailand|malaysia|myanmar|cambodia"
    r"|kenya|ghana|ethiopia|tanzania|uganda"
    r"|egypt|morocco|sri lanka"
    r"|colombia|brazil|mexico|argentina|peru|chile"
    r"|saudi arabia|united arab emirates|\buae\b|qatar|kuwait|bahrain|oman"
    r"|delhi|new delhi|mumbai|bangalore|bengaluru|hyderabad|chennai"
    r"|pune|gurugram|gurgaon|noida|kolkata|ahmedabad"
)
_STRONG_GEO_RE = re.compile(rf"\b({_STRONG_GEO_TERMS})\b", re.IGNORECASE)
_WEAK_GEO_RE = re.compile(rf"\b({_WEAK_GEO_TERMS})\b", re.IGNORECASE)
_EMEA_RE = re.compile(r"\bemea\b", re.IGNORECASE)
_AFRICA_OR_ME_RE = re.compile(r"\b(africa|middle east|mena)\b", re.IGNORECASE)
_AFRICA_STANDALONE_RE = re.compile(r"\bafrica\b", re.IGNORECASE)
_SOUTH_AFRICA_RE = re.compile(r"\bsouth africa\b", re.IGNORECASE)


def _get_db_url() -> str:
    """Return the database URL from environment, or empty string."""
    return os.environ.get("NEON_DATABASE_URL") or os.environ.get("DATABASE_URL", "")


def _check_geo_irrelevance(geo_text: str) -> bool:
    """Check if text indicates irrelevant geographic focus."""
    strong_hits = len(_STRONG_GEO_RE.findall(geo_text))

    # "africa" needs special handling: don't count if every occurrence is
    # part of "south africa" (South Africa is a relevant market).
    africa_all = _AFRICA_STANDALONE_RE.findall(geo_text)
    south_africa_all = _SOUTH_AFRICA_RE.findall(geo_text)
    if africa_all and len(africa_all) <= len(south_africa_all):
        strong_hits = max(0, strong_hits - len(south_africa_all))

    weak_hits = len(_WEAK_GEO_RE.findall(geo_text))

    # EMEA is only a signal when the text also mentions Africa / Middle East
    emea_flag = bool(_EMEA_RE.search(geo_text)) and bool(
        _AFRICA_OR_ME_RE.search(geo_text)
    )
    if emea_flag:
        strong_hits += 1

    return strong_hits >= 1 or weak_hits >= 2


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
    """Parse LinkedIn size strings → upper bound integer.

    Supported formats:
      "51-200 employees" → 200    "2-10" → 10
      "10,001+ employees" → 10001 "501-1,000" → 1000
      "1 employee" → 1            "Self-employed" → 1
      "Myself only" → 1           "" → 999999
    """
    import re
    s = size.strip()
    if not s:
        return 999999
    if re.search(r"\b(self-employed|myself only|solo|freelance)\b", s, re.IGNORECASE):
        return 1
    m = re.match(r"(\d[\d,]*)\s*[-–—]\s*(\d[\d,]*)", s)
    if m:
        return int(m.group(2).replace(",", ""))
    m2 = re.search(r"(\d[\d,]*)\+", s)
    if m2:
        return int(m2.group(1).replace(",", ""))
    m3 = re.search(r"(\d[\d,]*)", s)
    if m3:
        return int(m3.group(1).replace(",", ""))
    return 999999


@app.post("/classify-company")
async def classify_company(req: CompanyClassifyRequest):
    """Classify whether a company is a staffing/recruitment firm.

    Called fire-and-forget by the GraphQL importCompanies resolver.
    If staffing detected, tags the company as an ICP target (does NOT block).
    """
    import asyncio
    from .modules.company_classifier import classify_company as _classify

    t0 = time.perf_counter()
    result = _classify(
        name=req.name,
        description=req.description,
        website=req.website,
        location=req.location,
        industry=req.industry,
    )
    elapsed = round(time.perf_counter() - t0, 4)

    # Parse size — from explicit field or from description
    size_str = req.size
    if not size_str and req.description:
        size_match = re.search(r"Size:\s*(.+?)(?:\n|$)", req.description)
        if size_match:
            size_str = size_match.group(1).strip()

    employee_count = _parse_size(size_str)

    geo_text = f"{req.name} {req.description} {req.location}"
    is_irrelevant_geo = _check_geo_irrelevance(geo_text)

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
    db_url = _get_db_url()
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


# ── Batch company classifier ────────────────────────────────────────────────


@app.post("/classify-companies")
async def classify_companies_batch(req: CompanyBatchClassifyRequest):
    """Classify multiple companies in one request.

    Runs ML inference sequentially (fast after warmup), then batches all DB
    updates into a single asyncpg connection instead of N separate ones.
    """
    from .modules.company_classifier import classify_company as _classify

    t0 = time.perf_counter()
    results: list[dict[str, Any]] = []
    db_updates: list[dict[str, Any]] = []

    for company in req.companies:
        tc = time.perf_counter()
        result = _classify(
            name=company.name,
            description=company.description,
            website=company.website,
            location=company.location,
            industry=company.industry,
        )
        company_elapsed = round(time.perf_counter() - tc, 4)

        # Parse size — from explicit field or from description
        size_str = company.size
        if not size_str and company.description:
            size_match = re.search(r"Size:\s*(.+?)(?:\n|$)", company.description)
            if size_match:
                size_str = size_match.group(1).strip()

        employee_count = _parse_size(size_str)

        geo_text = f"{company.name} {company.description} {company.location}"
        is_irrelevant_geo = _check_geo_irrelevance(geo_text)

        is_target = (
            result["is_staffing"] and employee_count <= 200 and not is_irrelevant_geo
        )
        result["is_target"] = is_target
        result["employee_count"] = employee_count
        result["is_irrelevant_geo"] = is_irrelevant_geo

        results.append({
            "result": result,
            "company_id": company.company_id,
            "time_s": company_elapsed,
        })

        if result["is_staffing"]:
            db_updates.append({
                "company_id": company.company_id,
                "confidence": result["confidence"],
                "reasons": result["reasons"],
                "is_target": is_target,
            })

    # Batch DB updates in a single connection
    if db_updates:
        await _update_companies_tagged_batch(db_updates)

    total_elapsed = round(time.perf_counter() - t0, 4)
    return {
        "results": results,
        "total": len(results),
        "staffing_count": len(db_updates),
        "time_s": total_elapsed,
    }


async def _update_companies_tagged_batch(
    updates: list[dict[str, Any]],
) -> None:
    """Batch-update staffing companies in a single DB connection.

    Each entry in *updates* has: company_id, confidence, reasons, is_target.
    """
    db_url = _get_db_url()
    if not db_url:
        print(
            f"[classify-companies] No DATABASE_URL — cannot update {len(updates)} companies"
        )
        return

    try:
        import asyncpg  # type: ignore[import-untyped]
    except ImportError:
        print(
            f"[classify-companies] asyncpg not available — cannot update {len(updates)} companies"
        )
        return

    import json

    conn = await asyncpg.connect(db_url)
    try:
        for upd in updates:
            company_id = upd["company_id"]
            confidence = upd["confidence"]
            reasons: list[str] = upd["reasons"]
            is_target: bool = upd["is_target"]

            if is_target:
                row = await conn.fetchrow(
                    "SELECT tags FROM companies WHERE id = $1", company_id
                )
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
                print(
                    f"[classify-companies] Tagged ICP target id={company_id} (confidence={confidence:.2f})"
                )
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
                print(
                    f"[classify-companies] Tagged staffing firm id={company_id} (confidence={confidence:.2f})"
                )

        print(
            f"[classify-companies] Batch updated {len(updates)} companies in single connection"
        )
    finally:
        await conn.close()


# ── Classify from DB + stats + dashboard ────────────────────────────────────

_dashboard_cache: dict[str, Any] = {}
_dashboard_cache_ts: float = 0.0


class ClassifyBatchFromDBRequest(BaseModel):
    limit: int = 50


@app.post("/classify-batch")
async def classify_batch_from_db(req: ClassifyBatchFromDBRequest):
    """Pull unclassified companies from DB, run classifier, update results."""
    from .modules.company_classifier import classify_company as _classify

    db_url = _get_db_url()
    if not db_url:
        raise HTTPException(status_code=500, detail="No DATABASE_URL configured")

    try:
        import asyncpg
    except ImportError:
        raise HTTPException(status_code=500, detail="asyncpg not installed")

    conn = await asyncpg.connect(db_url)
    try:
        rows = await conn.fetch(
            """SELECT id, name, description, website, location, industry, size
               FROM companies
               WHERE category = 'UNKNOWN' AND ai_classification_confidence = 0
               LIMIT $1""",
            req.limit,
        )
    finally:
        await conn.close()

    if not rows:
        return {"classified": 0, "staffing": 0, "targets": 0, "message": "No unclassified companies"}

    t0 = time.perf_counter()
    db_updates: list[dict[str, Any]] = []
    classified = 0
    staffing_count = 0
    target_count = 0

    for row in rows:
        result = _classify(
            name=row["name"] or "",
            description=row["description"] or "",
            website=row["website"] or "",
            location=row["location"] or "",
            industry=row["industry"] or "",
        )

        size_str = row["size"] or ""
        employee_count = _parse_size(size_str)
        geo_text = f"{row['name'] or ''} {row['description'] or ''} {row['location'] or ''}"
        is_irrelevant_geo = _check_geo_irrelevance(geo_text)
        is_target = result["is_staffing"] and employee_count <= 200 and not is_irrelevant_geo

        classified += 1
        if result["is_staffing"]:
            staffing_count += 1
            if is_target:
                target_count += 1
            db_updates.append({
                "company_id": row["id"],
                "confidence": result["confidence"],
                "reasons": result["reasons"],
                "is_target": is_target,
            })
        else:
            # Update non-staffing companies with confidence so they don't get re-processed
            db_updates.append({
                "company_id": row["id"],
                "confidence": result["confidence"],
                "reasons": result["reasons"],
                "is_target": False,
                "is_non_staffing": True,
            })

    # Batch DB updates
    if db_updates:
        await _update_classify_batch_results(db_updates)

    elapsed = round(time.perf_counter() - t0, 4)
    return {
        "classified": classified,
        "staffing": staffing_count,
        "targets": target_count,
        "time_s": elapsed,
    }


async def _update_classify_batch_results(updates: list[dict[str, Any]]) -> None:
    """Update companies with classification results (both staffing and non-staffing)."""
    db_url = _get_db_url()
    if not db_url:
        return

    try:
        import asyncpg
    except ImportError:
        return

    conn = await asyncpg.connect(db_url)
    try:
        for upd in updates:
            company_id = upd["company_id"]
            confidence = upd["confidence"]
            reasons: list[str] = upd["reasons"]

            if upd.get("is_non_staffing"):
                await conn.execute(
                    """UPDATE companies
                       SET ai_classification_reason = $1,
                           ai_classification_confidence = $2,
                           updated_at = now()
                     WHERE id = $3""",
                    "; ".join(reasons),
                    confidence,
                    company_id,
                )
            elif upd["is_target"]:
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
                       SET category = 'STAFFING', tags = $1,
                           ai_classification_reason = $2,
                           ai_classification_confidence = $3,
                           updated_at = now()
                     WHERE id = $4""",
                    json.dumps(existing_tags),
                    "; ".join(reasons),
                    confidence,
                    company_id,
                )
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
        print(f"[classify-batch] Updated {len(updates)} companies")
    finally:
        await conn.close()


@app.get("/classify-stats")
async def classify_stats():
    """Return counts of classified/unclassified/staffing/target companies."""
    db_url = _get_db_url()
    if not db_url:
        raise HTTPException(status_code=500, detail="No DATABASE_URL configured")

    try:
        import asyncpg
    except ImportError:
        raise HTTPException(status_code=500, detail="asyncpg not installed")

    conn = await asyncpg.connect(db_url)
    try:
        row = await conn.fetchrow("""
            SELECT
                count(*) AS total,
                count(*) FILTER (WHERE ai_classification_confidence > 0) AS classified,
                count(*) FILTER (WHERE ai_classification_confidence = 0) AS unclassified,
                count(*) FILTER (WHERE category = 'STAFFING') AS staffing,
                count(*) FILTER (WHERE tags LIKE '%target-icp%') AS targets
            FROM companies
        """)
        return {
            "total": row["total"],
            "classified": row["classified"],
            "unclassified": row["unclassified"],
            "staffing": row["staffing"],
            "targets": row["targets"],
        }
    finally:
        await conn.close()


@app.get("/dashboard")
async def dashboard():
    """Category breakdown, confidence distribution, recent classifications (30s cache)."""
    global _dashboard_cache, _dashboard_cache_ts

    if time.time() - _dashboard_cache_ts < 30 and _dashboard_cache:
        return _dashboard_cache

    db_url = _get_db_url()
    if not db_url:
        raise HTTPException(status_code=500, detail="No DATABASE_URL configured")

    try:
        import asyncpg
    except ImportError:
        raise HTTPException(status_code=500, detail="asyncpg not installed")

    conn = await asyncpg.connect(db_url)
    try:
        # Category breakdown
        categories = await conn.fetch("""
            SELECT category, count(*) AS cnt FROM companies GROUP BY category ORDER BY cnt DESC
        """)

        # Confidence distribution (bucketed)
        confidence_dist = await conn.fetch("""
            SELECT
                CASE
                    WHEN ai_classification_confidence = 0 THEN 'unclassified'
                    WHEN ai_classification_confidence < 0.3 THEN 'low (0-0.3)'
                    WHEN ai_classification_confidence < 0.7 THEN 'medium (0.3-0.7)'
                    ELSE 'high (0.7-1.0)'
                END AS bucket,
                count(*) AS cnt
            FROM companies
            GROUP BY bucket ORDER BY bucket
        """)

        # Recent classifications
        recent = await conn.fetch("""
            SELECT id, name, category, ai_classification_confidence, ai_classification_reason, updated_at
            FROM companies
            WHERE ai_classification_confidence > 0
            ORDER BY updated_at DESC LIMIT 20
        """)

        # Target count
        targets = await conn.fetchval(
            "SELECT count(*) FROM companies WHERE tags LIKE '%target-icp%'"
        )

        result = {
            "categories": [{"category": r["category"], "count": r["cnt"]} for r in categories],
            "confidence_distribution": [{"bucket": r["bucket"], "count": r["cnt"]} for r in confidence_dist],
            "recent_classifications": [
                {
                    "id": r["id"],
                    "name": r["name"],
                    "category": r["category"],
                    "confidence": float(r["ai_classification_confidence"]) if r["ai_classification_confidence"] else 0,
                    "reason": r["ai_classification_reason"],
                    "updated_at": str(r["updated_at"]) if r["updated_at"] else None,
                }
                for r in recent
            ],
            "target_count": targets,
        }

        _dashboard_cache = result
        _dashboard_cache_ts = time.time()
        return result
    finally:
        await conn.close()


@app.get("/dashboard/misclassified")
async def dashboard_misclassified():
    """Likely false positives and false negatives for review."""
    db_url = _get_db_url()
    if not db_url:
        raise HTTPException(status_code=500, detail="No DATABASE_URL configured")

    try:
        import asyncpg
    except ImportError:
        raise HTTPException(status_code=500, detail="asyncpg not installed")

    conn = await asyncpg.connect(db_url)
    try:
        # Likely false positives: STAFFING but low confidence
        false_positives = await conn.fetch("""
            SELECT id, name, category, ai_classification_confidence, ai_classification_reason
            FROM companies
            WHERE category = 'STAFFING' AND ai_classification_confidence > 0 AND ai_classification_confidence < 0.6
            ORDER BY ai_classification_confidence ASC LIMIT 20
        """)

        # Likely false negatives: UNKNOWN but name contains staffing keywords
        false_negatives = await conn.fetch("""
            SELECT id, name, category, ai_classification_confidence, description
            FROM companies
            WHERE category = 'UNKNOWN'
              AND (name ILIKE '%staffing%' OR name ILIKE '%recruit%' OR name ILIKE '%talent%' OR name ILIKE '%hiring%')
            ORDER BY name LIMIT 20
        """)

        return {
            "likely_false_positives": [
                {
                    "id": r["id"],
                    "name": r["name"],
                    "confidence": float(r["ai_classification_confidence"]),
                    "reason": r["ai_classification_reason"],
                }
                for r in false_positives
            ],
            "likely_false_negatives": [
                {
                    "id": r["id"],
                    "name": r["name"],
                    "description": (r["description"] or "")[:200],
                }
                for r in false_negatives
            ],
        }
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
