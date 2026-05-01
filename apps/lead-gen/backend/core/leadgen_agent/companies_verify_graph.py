# Requires: numpy
"""UK recruitment classifier graph — Python port of ``crates/companies-verify``.

Replaces the Rust Candle + LanceDB stack with:

* BGE-M3 embeddings served locally (wrapped by ``embeddings.embed_texts``).
* An in-memory NumPy kNN over a reference corpus of ~30 labelled snippets
  (see :data:`CORPUS`). The corpus is embedded once at graph build time;
  each classification does a dot-product against the normalised matrix.
* psycopg (autocommit) writes to ``companies.category`` / ``score`` /
  ``score_reasons`` — identical schema contract to the Rust binary.

Dual-signal verdict:

* **Semantic margin** — cosine-sim to recruitment centroid minus non-rec
  centroid among the top-K neighbours.
* **Keyword score** — scans the website text for UK-recruitment specific
  strong/moderate/anti keywords.

Decision matrix (ported verbatim from ``classifier.rs``)::

    strong_hits >= 2                         -> RECRUITMENT
    strong_hits >= 1 and margin > 0          -> RECRUITMENT
    net >= 3 and margin > 0                  -> RECRUITMENT
    otherwise                                -> NOT RECRUITMENT

The graph runs a single ``company_id`` per invocation; a bulk sweep can be
driven by launching many runs in parallel (see notes in
``crates``-crate deletion commit). Website HTML is fetched via the
existing ``loaders.fetch_url`` helper.
"""

from __future__ import annotations

import json
import logging
import re
import time
from html.parser import HTMLParser
from typing import Any, TypedDict

import numpy as np
import psycopg
from langgraph.graph import END, START, StateGraph

from .deep_icp_graph import _dsn
from .embeddings import embed_texts
from .loaders import fetch_url

log = logging.getLogger(__name__)


TOP_K = 7
MAX_TEXT_CHARS = 2000
FETCH_TIMEOUT = 10.0
CONFIDENCE_THRESHOLD = 0.6
METHOD_TAG = "recruitment-verify-v1"


# ── Reference corpus (ported from crates/companies-verify/src/corpus.rs) ──────

CORPUS: list[tuple[str, bool]] = [
    # UK Recruitment (label = True)
    ("REC-accredited recruitment agency placing candidates across the UK in technology, finance, and engineering roles", True),
    ("AWR-compliant staffing solutions for temporary and contract workers throughout England, Scotland, and Wales", True),
    ("Specialist IT recruitment consultancy based in London and Manchester helping companies hire software developers", True),
    ("Executive search and headhunting firm placing C-suite and board-level candidates for FTSE 250 companies", True),
    ("We place permanent and contract software engineers across the UK with a focus on fintech and healthtech", True),
    ("IR35 compliant contractor staffing and umbrella company solutions for the UK contracting market", True),
    ("NHS and healthcare recruitment agency providing locum doctors, nurses, and permanent clinical staff UK-wide", True),
    ("Construction and engineering recruitment specialists operating across the UK, placing site managers and quantity surveyors", True),
    ("Our recruitment consultants match top talent with leading UK employers across multiple sectors", True),
    ("Graduate recruitment and early careers programme specialists helping UK employers attract new talent", True),
    ("Managed service provider for contingent workforce and recruitment process outsourcing across the UK", True),
    ("Temporary staffing agency providing warehouse, logistics, and industrial workers throughout the Midlands", True),
    ("Specialist technology recruiter covering fintech, AI, data science, and cybersecurity roles in London and the South East", True),
    ("UK's leading recruitment agency for accountancy, finance, and banking professionals", True),
    ("We are an employment agency matching job seekers with employers, offering CV advice, interview coaching, and career guidance", True),
    # Non-recruitment (label = False)
    ("We build enterprise software products for supply chain management and logistics optimisation", False),
    ("SaaS platform for customer relationship management and sales automation used by thousands of businesses", False),
    ("Cloud infrastructure and DevOps consulting services helping companies migrate to AWS and Azure", False),
    ("AI research lab focused on natural language processing, computer vision, and reinforcement learning", False),
    ("Digital marketing agency specializing in SEO, PPC, content strategy, and social media management", False),
    ("Cybersecurity consultancy providing penetration testing, security audits, and compliance assessments", False),
    ("Managed IT services and helpdesk support for small and medium enterprises across the UK", False),
    ("Data analytics platform for business intelligence, reporting, and real-time dashboard visualisation", False),
    ("We design and develop mobile applications for iOS and Android platforms for startups and enterprises", False),
    ("E-commerce marketplace connecting buyers and sellers worldwide with integrated payment processing", False),
    ("FinTech company building payment processing infrastructure and open banking APIs", False),
    ("EdTech platform providing online learning, certification, and virtual classroom solutions", False),
    ("Property management software for UK letting agents, landlords, and estate agencies", False),
    ("Legal tech startup automating contract review, due diligence, and regulatory compliance", False),
    ("Healthcare SaaS for patient records, clinic management, and GP appointment scheduling", False),
]


# ── Keyword scoring (ported from classifier.rs) ───────────────────────────────

STRONG_KEYWORDS: tuple[str, ...] = (
    "we recruit",
    "we are a recruitment",
    "recruitment agency",
    "recruitment consultancy",
    "staffing agency",
    "staffing solutions",
    "placing candidates",
    "place candidates",
    "executive search",
    "headhunting",
    "talent acquisition",
    "rec member",
    "rec accredited",
    "awr compliant",
    "ir35",
    "umbrella company",
    "locum",
    "temporary staffing",
    "contract staffing",
    "permanent placement",
    "we place ",
    "our recruiters",
    "our recruitment consultants",
    "job seekers with employers",
    "connecting talent",
    "find your next role",
    "hiring solutions",
    "contingent workforce",
    "managed service provider for recruitment",
    "recruitment process outsourcing",
)

MODERATE_KEYWORDS: tuple[str, ...] = (
    "recruiter",
    "staffing",
    "vacancies",
    "job board",
    "submit your cv",
    "upload your cv",
    "register your cv",
    "looking for work",
    "find a job",
    "browse jobs",
    "apply now",
    "we're hiring",
    "career opportunities",
    "open positions",
    "current vacancies",
    "contractor",
    "temp agency",
    "employment agency",
)

ANTI_KEYWORDS: tuple[str, ...] = (
    "our product",
    "our platform",
    "our software",
    "saas",
    "api",
    "sdk",
    "open source",
    "download",
    "install",
    "pricing plans",
    "free trial",
    "sign up free",
    "developer documentation",
    "github.com/",
    "npm install",
    "pip install",
    "cargo add",
    "docker",
    "kubernetes",
    "cloud platform",
    "machine learning platform",
    "analytics platform",
    "e-commerce",
    "marketplace",
    "checkout",
    "add to cart",
    "shopping",
)


def _score_keywords(text: str) -> dict[str, Any]:
    lower = text.lower()
    strong = 0
    moderate = 0
    anti = 0
    detail: list[str] = []

    for kw in STRONG_KEYWORDS:
        if kw in lower:
            strong += 1
            if len(detail) < 3:
                detail.append(f"+STRONG:{kw}")
    for kw in MODERATE_KEYWORDS:
        if kw in lower:
            moderate += 1
    for kw in ANTI_KEYWORDS:
        if kw in lower:
            anti += 1
            if len(detail) < 3:
                detail.append(f"-ANTI:{kw}")

    net = strong * 3 + moderate - anti * 2
    return {
        "strong": strong,
        "moderate": moderate,
        "anti": anti,
        "net": net,
        "detail": detail,
    }


# ── HTML extraction (ported from scrape.rs) ──────────────────────────────────


class _TextExtractor(HTMLParser):
    """Pulls title, meta description / og:description, h1-h3, and body text."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title: str = ""
        self.meta_desc: str = ""
        self.og_desc: str = ""
        self.headings: list[str] = []
        self.body_parts: list[str] = []
        self._in_title = False
        self._in_heading: str | None = None
        self._skip_depth = 0  # inside <script>/<style>

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in ("script", "style", "noscript"):
            self._skip_depth += 1
            return
        if tag == "title":
            self._in_title = True
        elif tag in ("h1", "h2", "h3"):
            self._in_heading = tag
            self.headings.append("")
        elif tag == "meta":
            attr_map = {k.lower(): (v or "") for k, v in attrs}
            name = attr_map.get("name", "").lower()
            prop = attr_map.get("property", "").lower()
            content = (attr_map.get("content") or "").strip()
            if not content:
                return
            if name == "description" and not self.meta_desc:
                self.meta_desc = content
            elif prop == "og:description" and not self.og_desc:
                self.og_desc = content

    def handle_endtag(self, tag: str) -> None:
        if tag in ("script", "style", "noscript"):
            self._skip_depth = max(0, self._skip_depth - 1)
            return
        if tag == "title":
            self._in_title = False
        elif tag in ("h1", "h2", "h3") and self._in_heading == tag:
            self._in_heading = None

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        text = data.strip()
        if not text:
            return
        if self._in_title:
            self.title += (" " if self.title else "") + text
        elif self._in_heading and self.headings:
            current = self.headings[-1]
            self.headings[-1] = (current + " " + text).strip() if current else text
        else:
            self.body_parts.append(text)


def _extract_text_from_html(html: str) -> str:
    """Mirror ``scrape::extract_text``: title | meta | og | headings | body."""
    parser = _TextExtractor()
    try:
        parser.feed(html)
    except Exception as exc:  # noqa: BLE001 - HTMLParser can raise on malformed input
        log.debug("HTML parse warning: %s", exc)

    parts: list[str] = []
    if parser.title.strip():
        parts.append(parser.title.strip())
    if parser.meta_desc:
        parts.append(parser.meta_desc)
    if parser.og_desc:
        parts.append(parser.og_desc)
    for h in parser.headings:
        if h.strip():
            parts.append(h.strip())
    body = " ".join(p for p in parser.body_parts if p)
    body = re.sub(r"\s+", " ", body).strip()
    if body:
        parts.append(body)

    joined = " | ".join(parts)
    return joined[:MAX_TEXT_CHARS]


# ── In-memory kNN corpus ──────────────────────────────────────────────────────


class _Corpus:
    """Holds the reference corpus texts, labels, and a normalised matrix.

    BGE-M3 already L2-normalises its outputs, so cosine similarity reduces
    to a plain dot product. The matrix is lazy-loaded on first use.
    """

    def __init__(self) -> None:
        self.texts: list[str] = [t for t, _ in CORPUS]
        self.labels: np.ndarray = np.array([1 if lbl else 0 for _, lbl in CORPUS], dtype=np.int8)
        self.matrix: np.ndarray | None = None

    async def ensure_loaded(self) -> None:
        if self.matrix is not None:
            return
        log.info("Embedding %d reference corpus texts for uk_recruitment classifier", len(self.texts))
        vecs = await embed_texts(self.texts)
        arr = np.asarray(vecs, dtype=np.float32)
        # Defensive re-normalisation; BGE-M3 already returns L2-normalised vectors.
        norms = np.linalg.norm(arr, axis=1, keepdims=True)
        norms = np.where(norms < 1e-12, 1.0, norms)
        self.matrix = arr / norms

    async def knn(self, query_vec: list[float], top_k: int) -> list[dict[str, Any]]:
        await self.ensure_loaded()
        assert self.matrix is not None
        q = np.asarray(query_vec, dtype=np.float32)
        n = np.linalg.norm(q)
        if n > 1e-12:
            q = q / n
        sims = self.matrix @ q  # cosine similarity, range [-1, 1]
        # Use the same "distance = 1 - sim" convention as LanceDB L2 on unit vectors
        # would roughly produce; exact values differ but the ordering matches.
        dists = 1.0 - sims
        idx = np.argsort(dists)[:top_k]
        return [
            {
                "text": self.texts[int(i)],
                "label": int(self.labels[int(i)]),
                "distance": float(dists[int(i)]),
                "similarity": float(sims[int(i)]),
            }
            for i in idx
        ]


_CORPUS = _Corpus()


def _truncate(s: str, n: int = 50) -> str:
    return s if len(s) <= n else s[:n] + "..."


async def _classify(website_text: str) -> dict[str, Any]:
    """Run the dual-signal verdict. Returns keys matching the Rust Verdict."""
    vec_list = await embed_texts([website_text])
    neighbours = await _CORPUS.knn(vec_list[0], TOP_K)

    rec_sims = [n["similarity"] for n in neighbours if n["label"] == 1]
    non_sims = [n["similarity"] for n in neighbours if n["label"] == 0]
    avg_rec = sum(rec_sims) / len(rec_sims) if rec_sims else 0.0
    avg_non = sum(non_sims) / len(non_sims) if non_sims else 0.0
    semantic_margin = avg_rec - avg_non

    kw = _score_keywords(website_text)

    if kw["strong"] >= 2:
        is_rec = True
    elif kw["strong"] >= 1 and semantic_margin > 0.0:
        is_rec = True
    elif kw["net"] >= 3 and semantic_margin > 0.0:
        is_rec = True
    else:
        is_rec = False

    keyword_confidence = min(kw["strong"] * 0.2 + kw["moderate"] * 0.05, 0.5)
    semantic_confidence = min(abs(semantic_margin) * 2.0, 0.5)
    confidence = min(keyword_confidence + semantic_confidence, 1.0)

    top_matches: list[str] = []
    for n in neighbours[:2]:
        tag = "REC" if n["label"] == 1 else "NON"
        top_matches.append(f"[{tag} d={n['distance']:.3f}] {_truncate(n['text'], 50)}")
    top_matches.append(
        f"kw: strong={kw['strong']} mod={kw['moderate']} anti={kw['anti']} "
        f"net={kw['net']} margin={semantic_margin:.3f}"
    )
    top_matches.extend(kw["detail"])

    return {
        "is_recruitment": is_rec,
        "confidence": float(confidence),
        "top_matches": top_matches,
        "semantic_margin": float(semantic_margin),
        "keyword_score": kw,
    }


# ── State ─────────────────────────────────────────────────────────────────────


class CompaniesVerifyState(TypedDict, total=False):
    company_id: int
    company: dict[str, Any]
    website_text: str
    verdict: dict[str, Any]
    agent_timings: dict[str, float]
    _error: str


# ── Nodes ─────────────────────────────────────────────────────────────────────


async def load(state: CompaniesVerifyState) -> dict:
    if state.get("_error"):
        return {}
    company_id = state.get("company_id")
    if company_id is None:
        return {"_error": "load: company_id is required"}

    sql = (
        "SELECT id, key, name, website, category, description "
        "FROM companies WHERE id = %s LIMIT 1"
    )
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (int(company_id),))
                row = cur.fetchone()
                if not row:
                    return {"_error": f"load: company id {company_id} not found"}
                cols = [d[0] for d in cur.description or []]
    except psycopg.Error as e:
        return {"_error": f"load: {e}"}

    rec = dict(zip(cols, row))
    website = (rec.get("website") or "").strip()
    if not website:
        return {"_error": f"load: company id {company_id} has no website"}

    return {
        "company": {
            "id": rec["id"],
            "key": rec.get("key") or "",
            "name": rec.get("name") or "",
            "website": website,
            "category": rec.get("category") or "",
            "description": rec.get("description") or "",
        }
    }


async def fetch(state: CompaniesVerifyState) -> dict:
    if state.get("_error"):
        return {}
    company = state.get("company") or {}
    url = company.get("website", "")
    if not url:
        return {"_error": "fetch: missing website url"}

    t0 = time.perf_counter()
    res = await fetch_url(url, timeout=FETCH_TIMEOUT)
    status = res.get("status") or 0
    html = res.get("html") or ""
    if status != 200 or not html:
        err = res.get("error") or f"http {status}"
        return {"_error": f"fetch: {url}: {err}"}

    text = _extract_text_from_html(html)
    if not text:
        return {"_error": f"fetch: no visible text extracted from {url}"}

    return {
        "website_text": text,
        "agent_timings": {"fetch": round(time.perf_counter() - t0, 3)},
    }


async def classify(state: CompaniesVerifyState) -> dict:
    if state.get("_error"):
        return {}
    text = state.get("website_text") or ""
    if not text:
        return {"_error": "classify: missing website_text"}

    t0 = time.perf_counter()
    try:
        verdict = await _classify(text)
    except Exception as e:  # noqa: BLE001
        return {"_error": f"classify: {e}"}

    return {
        "verdict": verdict,
        "agent_timings": {"classify": round(time.perf_counter() - t0, 3)},
    }


async def persist(state: CompaniesVerifyState) -> dict:
    if state.get("_error"):
        return {}
    company = state.get("company") or {}
    verdict = state.get("verdict") or {}
    company_id = company.get("id")
    if company_id is None or not verdict:
        return {"_error": "persist: missing company_id or verdict"}

    is_rec = bool(verdict.get("is_recruitment"))
    confidence = float(verdict.get("confidence") or 0.0)

    if is_rec and confidence >= CONFIDENCE_THRESHOLD:
        new_category = "STAFFING"
    elif (not is_rec) and confidence >= CONFIDENCE_THRESHOLD:
        new_category = "PRODUCT"
    else:
        new_category = "UNKNOWN"

    reasons = {
        "method": METHOD_TAG,
        "is_recruitment": is_rec,
        "confidence": confidence,
        "top_matches": verdict.get("top_matches") or [],
    }

    t0 = time.perf_counter()
    sql = (
        "UPDATE companies SET category = %s, score = %s, score_reasons = %s, "
        "updated_at = now()::text WHERE id = %s"
    )
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    sql,
                    (new_category, confidence, json.dumps(reasons), int(company_id)),
                )
    except psycopg.Error as e:
        return {"_error": f"persist: {e}"}

    log.info(
        "[companies-verify] id=%s key=%s -> %s (%.2f)",
        company_id,
        company.get("key"),
        "RECRUITMENT" if is_rec else "NOT_REC",
        confidence,
    )
    return {"agent_timings": {"persist": round(time.perf_counter() - t0, 3)}}


# ── Graph ─────────────────────────────────────────────────────────────────────


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(CompaniesVerifyState)
    builder.add_node("load", load)
    builder.add_node("fetch", fetch)
    builder.add_node("classify", classify)
    builder.add_node("persist", persist)
    builder.add_edge(START, "load")
    builder.add_edge("load", "fetch")
    builder.add_edge("fetch", "classify")
    builder.add_edge("classify", "persist")
    builder.add_edge("persist", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
