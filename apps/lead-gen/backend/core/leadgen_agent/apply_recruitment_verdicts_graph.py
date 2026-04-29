"""Apply cached recruitment verdicts to ``companies.category`` as a LangGraph.

Single-node graph wrapping the verdict-application step that previously lived
in ``backend/scripts/apply_recruitment_verdicts.py``. Decoupled from the
classifier so a CSV produced by ``classify_recruitment_bulk`` (or any other
verdict source) can be reviewed offline and applied later, without re-paying
the LLM cost.

Two input modes — exactly one must be set:

* ``csv_path``: read verdicts from a local CSV (header row required:
  ``id,key,name,website,is_recruitment,confidence,reasons``). Convenient for
  local dev, **not** suitable for Cloudflare Container deploys where the file
  system is ephemeral.
* ``verdicts``: an inline list of ``{id, confidence, reasons[, key, name]}``
  dicts. Use this from the Next.js app or from any caller running on CF.

A row is eligible iff ``confidence >= threshold`` (default 0.60). When fed
from a CSV, ``is_recruitment`` must also be ``"true"`` (case-insensitive);
inline callers are assumed to have pre-filtered.

Invoke via ``langgraph dev`` :8002::

    curl -s -X POST http://127.0.0.1:8002/runs/wait \\
      -H 'authorization: Bearer $LANGGRAPH_AUTH_TOKEN' \\
      -H 'content-type: application/json' \\
      -d '{"assistant_id":"apply_recruitment_verdicts",
           "input":{"csv_path":"classify_recruitment_all.csv","threshold":0.6}}'

State shape: ``ApplyRecruitmentVerdictsState`` in ``state.py``.
"""

from __future__ import annotations

import asyncio
import csv
import json
import logging
from pathlib import Path
from typing import Any

import psycopg
from langgraph.graph import END, START, StateGraph

from .deep_icp_graph import _dsn
from .state import ApplyRecruitmentVerdictsState

log = logging.getLogger(__name__)

DEFAULT_THRESHOLD = 0.60
METHOD_TAG = "classify-recruitment-llm-v1"

UPDATE_SQL = (
    "UPDATE companies SET category = %s, score = %s, score_reasons = %s, "
    "updated_at = now()::text WHERE id = %s"
)


def _load_from_csv(path: Path, threshold: float) -> list[dict[str, Any]]:
    eligible: list[dict[str, Any]] = []
    with path.open() as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            if (row.get("is_recruitment") or "").strip().lower() != "true":
                continue
            try:
                conf = float(row.get("confidence") or 0.0)
            except ValueError:
                continue
            if conf < threshold:
                continue
            eligible.append(
                {
                    "id": int(row["id"]),
                    "key": row.get("key") or "",
                    "name": row.get("name") or "",
                    "confidence": conf,
                    "reasons": [
                        s.strip()
                        for s in (row.get("reasons") or "").split("|")
                        if s.strip()
                    ],
                }
            )
    return eligible


def _normalize_inline(verdicts: list[dict[str, Any]], threshold: float) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for r in verdicts or []:
        try:
            cid = int(r["id"])
            conf = float(r.get("confidence") or 0.0)
        except (KeyError, TypeError, ValueError):
            continue
        if conf < threshold:
            continue
        reasons = r.get("reasons") or []
        if isinstance(reasons, str):
            reasons = [s.strip() for s in reasons.split("|") if s.strip()]
        out.append(
            {
                "id": cid,
                "key": r.get("key") or "",
                "name": r.get("name") or "",
                "confidence": conf,
                "reasons": [str(s) for s in reasons][:5],
            }
        )
    return out


async def apply_node(state: ApplyRecruitmentVerdictsState) -> dict[str, Any]:
    threshold = float(state.get("threshold") or DEFAULT_THRESHOLD)
    csv_path_str = state.get("csv_path") or ""
    inline = state.get("verdicts") or []

    if csv_path_str and inline:
        raise ValueError("apply_recruitment_verdicts: pass csv_path OR verdicts, not both")
    if not csv_path_str and not inline:
        raise ValueError("apply_recruitment_verdicts: must pass csv_path or verdicts")

    if csv_path_str:
        csv_path = Path(csv_path_str)
        if not csv_path.is_absolute():
            csv_path = Path.cwd() / csv_path
        if not csv_path.exists():
            raise FileNotFoundError(f"csv not found: {csv_path}")
        eligible = await asyncio.to_thread(_load_from_csv, csv_path, threshold)
    else:
        eligible = _normalize_inline(inline, threshold)

    log.info(
        "eligible (confidence>=%.2f): %d rows (source=%s)",
        threshold,
        len(eligible),
        "csv" if csv_path_str else "inline",
    )
    if not eligible:
        return {
            "eligible_count": 0,
            "applied": 0,
            "method": METHOD_TAG,
        }

    def _apply() -> int:
        n = 0
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                for r in eligible:
                    reasons_payload = {
                        "method": METHOD_TAG,
                        "is_recruitment": True,
                        "confidence": r["confidence"],
                        "reasons": r["reasons"],
                    }
                    cur.execute(
                        UPDATE_SQL,
                        (
                            "STAFFING",
                            r["confidence"],
                            json.dumps(reasons_payload),
                            r["id"],
                        ),
                    )
                    n += 1
        return n

    applied = await asyncio.to_thread(_apply)
    log.info("updated %d companies to category=STAFFING", applied)

    return {
        "eligible_count": len(eligible),
        "applied": applied,
        "method": METHOD_TAG,
    }


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ApplyRecruitmentVerdictsState)
    builder.add_node("apply", apply_node)
    builder.add_edge(START, "apply")
    builder.add_edge("apply", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
