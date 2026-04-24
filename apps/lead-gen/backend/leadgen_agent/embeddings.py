"""Local semantic embedding client for ICP matching (intervention #4).

Thin async wrapper over the Rust/Candle ``icp-embed`` HTTP server
(``crates/icp-embed``, serves BAAI/bge-m3, 1024-dim). All embedding calls
funnel through this module so swapping the backend to a different local
model (MLX, ONNX, other Candle binary) is a one-file change.

No external API calls. Server URL defaults to ``http://127.0.0.1:7799``;
override via ``ICP_EMBED_URL``.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
from typing import Any, Iterable

import httpx

log = logging.getLogger(__name__)


EMBED_MODEL = "BAAI/bge-m3"
EMBED_DIM = 1024
DEFAULT_URL = "http://127.0.0.1:7799/embed"
MAX_TEXT_CHARS = 4000  # BGE-M3 handles 8k tokens, cap chars so a 32-batch fits.


def _url() -> str:
    raw = (os.environ.get("ICP_EMBED_URL") or "").strip()
    if not raw:
        return DEFAULT_URL
    if raw.endswith("/embed"):
        return raw
    return raw.rstrip("/") + "/embed"


async def embed_texts(texts: list[str], timeout: float = 120.0) -> list[list[float]]:
    """Embed a batch of texts. Returns L2-normalized 1024-dim vectors."""
    if not texts:
        return []
    payload = {"texts": texts}
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(_url(), json=payload)
        resp.raise_for_status()
        data = resp.json()
    vecs = data.get("vectors") or []
    if len(vecs) != len(texts):
        raise RuntimeError(
            f"embed_texts: server returned {len(vecs)} vectors for {len(texts)} inputs"
        )
    return [[float(x) for x in v] for v in vecs]


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _truncate(s: str, n: int) -> str:
    s = s or ""
    return s if len(s) <= n else s[:n]


def _joined(items: Iterable[Any], sep: str = " | ") -> str:
    parts = [str(x).strip() for x in items if x is not None and str(x).strip()]
    return sep.join(parts)


def compose_product_icp_text(icp_analysis: dict[str, Any] | None) -> str:
    """Build the canonical document string used as the product's ICP embedding.

    Joins segments, personas, anti-ICP, and deal-breakers into a single
    passage; prefixed with ``passage:`` per BGE-M3 convention.
    """
    if not icp_analysis:
        return ""
    parts: list[str] = []

    segs = icp_analysis.get("segments") or []
    seg_strs: list[str] = []
    for s in segs:
        if not isinstance(s, dict):
            continue
        seg_strs.append(
            _joined(
                [
                    s.get("name"),
                    s.get("industry"),
                    s.get("stage"),
                    s.get("geo"),
                    s.get("reasoning"),
                ]
            )
        )
    if seg_strs:
        parts.append("segments: " + " ; ".join(x for x in seg_strs if x))

    personas = icp_analysis.get("personas") or []
    per_strs: list[str] = []
    for p in personas:
        if not isinstance(p, dict):
            continue
        per_strs.append(
            _joined(
                [
                    p.get("title"),
                    p.get("department"),
                    p.get("seniority"),
                    p.get("pain"),
                ]
            )
        )
    if per_strs:
        parts.append("personas: " + " ; ".join(x for x in per_strs if x))

    anti = icp_analysis.get("anti_icp") or []
    anti_strs = [str(a).strip() for a in anti if a]
    if anti_strs:
        parts.append("anti_icp: " + " ; ".join(anti_strs))

    dbs = icp_analysis.get("deal_breakers") or []
    db_strs: list[str] = []
    for d in dbs:
        if not isinstance(d, dict):
            continue
        db_strs.append(_joined([d.get("name"), d.get("severity"), d.get("reason")]))
    if db_strs:
        parts.append("deal_breakers: " + " ; ".join(x for x in db_strs if x))

    text = " || ".join(parts)
    return "passage: " + _truncate(text, MAX_TEXT_CHARS)


def compose_company_profile_text(
    company: dict[str, Any],
    facts: list[dict[str, Any]] | None = None,
) -> str:
    """Build the canonical query string used as the company's profile embedding.

    Pulls description / industry / tags from the company row and merges the
    latest classification.home + classification.about markdown from
    ``company_facts`` when present. Prefixed with ``query:`` per BGE-M3.
    """
    parts: list[str] = []

    desc = (company.get("description") or "").strip()
    industry = (company.get("industry") or "").strip()
    tags = company.get("tags")
    if isinstance(tags, str):
        try:
            tags_parsed = json.loads(tags)
        except json.JSONDecodeError:
            tags_parsed = [tags] if tags else []
    else:
        tags_parsed = tags or []
    tag_str = ", ".join(str(t) for t in tags_parsed if t)

    if desc:
        parts.append(f"description: {desc}")
    if industry:
        parts.append(f"industry: {industry}")
    if tag_str:
        parts.append(f"tags: {tag_str}")

    home_md = ""
    about_md = ""
    for f in facts or []:
        field = f.get("field")
        if field == "classification.home" and not home_md:
            vj = f.get("value_json")
            if isinstance(vj, str):
                try:
                    payload = json.loads(vj)
                except json.JSONDecodeError:
                    payload = {}
            elif isinstance(vj, dict):
                payload = vj
            else:
                payload = {}
            home_md = str(payload.get("home_markdown") or "")
        elif field == "classification.about" and not about_md:
            vj = f.get("value_json")
            if isinstance(vj, str):
                try:
                    payload = json.loads(vj)
                except json.JSONDecodeError:
                    payload = {}
            elif isinstance(vj, dict):
                payload = vj
            else:
                payload = {}
            about_md = str(payload.get("about_markdown") or payload.get("home_markdown") or "")

    if home_md:
        parts.append("home: " + _truncate(home_md, 4000))
    if about_md:
        parts.append("about: " + _truncate(about_md, 2000))

    text = " || ".join(parts)
    return "query: " + _truncate(text, MAX_TEXT_CHARS)


def vector_to_pg_literal(vec: list[float]) -> str:
    """Format a python list as a pgvector text literal: '[0.01,0.02,...]'."""
    return "[" + ",".join(f"{float(x):.7f}" for x in vec) + "]"


__all__ = [
    "EMBED_DIM",
    "EMBED_MODEL",
    "MAX_TEXT_CHARS",
    "compose_company_profile_text",
    "compose_product_icp_text",
    "content_hash",
    "embed_texts",
    "vector_to_pg_literal",
]
