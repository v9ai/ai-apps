"""Email outreach graph.

Flow:
    lookup_contact
      → load_product_context   (personas + outreach_templates from products row)
      → match_persona          (score contact role vs personas, cache to contact_persona_scores)
      → select_template        (pick template keyed on matched persona)
      → extract_hook
      → draft                  (template scaffold when product-aware, else free-form)
      → format_html

Produces {subject, text, html, contact_id, product_aware}. When `product_id`
is absent or persona match falls below threshold, the graph preserves the
legacy free-form behaviour (no template, no regressions for plain campaigns).
"""

from __future__ import annotations

import json
import os
from html import escape
from typing import Any

import psycopg
from langgraph.graph import END, START, StateGraph

from .llm import ainvoke_json, make_llm
from .state import EmailOutreachState

DEFAULT_PERSONA_THRESHOLD = 0.55


def _maybe_json(v: Any) -> Any:
    if isinstance(v, str):
        try:
            return json.loads(v)
        except json.JSONDecodeError:
            return None
    return v


def _dsn() -> str:
    return os.environ.get("NEON_DATABASE_URL", "").strip()


async def lookup_contact(state: EmailOutreachState) -> dict:
    email = (state.get("recipient_email") or "").strip().lower()
    dsn = _dsn()
    if not email or not dsn:
        return {"contact_id": None}
    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, position, seniority, department, ai_profile
                    FROM contacts
                    WHERE lower(email) = %s
                    LIMIT 1
                    """,
                    (email,),
                )
                row = cur.fetchone()
                if not row:
                    return {"contact_id": None}
                cols = [d[0] for d in cur.description or []]
                rec = dict(zip(cols, row))
                return {
                    "contact_id": int(rec["id"]),
                    "_contact_row": rec,
                }
    except Exception:
        return {"contact_id": None}


async def load_product_context(state: EmailOutreachState) -> dict:
    product_id = state.get("product_id")
    if not product_id:
        return {"personas": [], "templates": []}
    dsn = _dsn()
    if not dsn:
        return {"personas": [], "templates": []}
    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT icp_analysis, gtm_analysis FROM products WHERE id = %s LIMIT 1",
                    (int(product_id),),
                )
                row = cur.fetchone()
    except Exception:
        return {"personas": [], "templates": []}
    if not row:
        return {"personas": [], "templates": []}
    icp = _maybe_json(row[0]) or {}
    gtm = _maybe_json(row[1]) or {}
    personas = icp.get("personas") or []
    templates = gtm.get("outreach_templates") or gtm.get("templates") or []
    if not isinstance(personas, list):
        personas = []
    if not isinstance(templates, list):
        templates = []
    return {"personas": personas, "templates": templates}


def _norm(s: str | None) -> str:
    return (s or "").strip().lower()


def _fuzzy_score(a: str, b: str) -> float:
    """token_set_ratio via rapidfuzz when available; fallback to overlap ratio."""
    a_n, b_n = _norm(a), _norm(b)
    if not a_n or not b_n:
        return 0.0
    try:
        from rapidfuzz.fuzz import token_set_ratio  # type: ignore

        return float(token_set_ratio(a_n, b_n)) / 100.0
    except Exception:
        a_tokens = set(a_n.split())
        b_tokens = set(b_n.split())
        if not a_tokens or not b_tokens:
            return 0.0
        inter = len(a_tokens & b_tokens)
        union = len(a_tokens | b_tokens)
        return inter / union if union else 0.0


def _score_persona(contact: dict[str, Any], persona: dict[str, Any]) -> tuple[float, str]:
    title_score = _fuzzy_score(contact.get("position") or "", persona.get("title") or "")
    seniority_score = _fuzzy_score(
        contact.get("seniority") or "",
        persona.get("seniority") or persona.get("level") or "",
    )
    department_score = _fuzzy_score(
        contact.get("department") or "",
        persona.get("department") or persona.get("function") or "",
    )
    score = 0.7 * title_score + 0.15 * seniority_score + 0.15 * department_score
    method = "title_exact" if title_score >= 0.99 else "title_fuzzy"
    return score, method


async def match_persona(state: EmailOutreachState) -> dict:
    product_id = state.get("product_id")
    contact_id = state.get("contact_id")
    personas = state.get("personas") or []
    threshold = state.get("persona_match_threshold") or DEFAULT_PERSONA_THRESHOLD
    if not product_id or not contact_id or not personas:
        return {"persona_match": None, "product_aware": False}

    dsn = _dsn()
    if not dsn:
        return {"persona_match": None, "product_aware": False}

    # Cache lookup first
    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT persona_title, score, method
                    FROM contact_persona_scores
                    WHERE contact_id = %s AND product_id = %s
                    ORDER BY score DESC
                    LIMIT 1
                    """,
                    (int(contact_id), int(product_id)),
                )
                cached = cur.fetchone()
                if cached and float(cached[1]) >= threshold:
                    return {
                        "persona_match": {
                            "title": cached[0],
                            "score": float(cached[1]),
                            "method": cached[2],
                        },
                        "product_aware": True,
                    }
    except Exception:
        pass

    contact_row = state.get("_contact_row") or {}
    best: tuple[float, str, str] | None = None  # (score, title, method)
    for p in personas:
        if not isinstance(p, dict):
            continue
        title = p.get("title") or p.get("name") or ""
        if not title:
            continue
        score, method = _score_persona(contact_row, p)
        if best is None or score > best[0]:
            best = (score, title, method)

    if best is None:
        return {"persona_match": None, "product_aware": False}

    score_val, title, method = best
    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO contact_persona_scores
                      (contact_id, product_id, persona_title, score, method, rationale)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (contact_id, product_id, persona_title) DO UPDATE
                      SET score = EXCLUDED.score,
                          method = EXCLUDED.method,
                          rationale = EXCLUDED.rationale,
                          scored_at = now()::text
                    """,
                    (
                        int(contact_id),
                        int(product_id),
                        title,
                        float(score_val),
                        method,
                        f"title/seniority/department weighted 0.7/0.15/0.15",
                    ),
                )
    except Exception:
        pass

    if score_val < threshold:
        return {
            "persona_match": {"title": title, "score": score_val, "method": method},
            "product_aware": False,
        }
    return {
        "persona_match": {"title": title, "score": score_val, "method": method},
        "product_aware": True,
    }


async def select_template(state: EmailOutreachState) -> dict:
    if not state.get("product_aware"):
        return {"template": None}
    match = state.get("persona_match") or {}
    templates = state.get("templates") or []
    title = _norm(match.get("title"))
    if not title or not templates:
        return {"template": None}

    def _tmpl_persona(t: dict[str, Any]) -> str:
        return _norm(t.get("persona") or t.get("persona_title") or t.get("title"))

    def _tmpl_channel(t: dict[str, Any]) -> str:
        return _norm(t.get("channel"))

    for t in templates:
        if isinstance(t, dict) and _tmpl_persona(t) == title:
            return {"template": t}
    for t in templates:
        if isinstance(t, dict) and _tmpl_channel(t) == "email":
            return {"template": t}
    return {"template": None}


async def extract_hook(state: EmailOutreachState) -> dict:
    llm = make_llm(provider="email_llm")
    post = (state.get("post_text") or "")[:4000]
    if not post.strip():
        return {"hook": ""}
    result = await ainvoke_json(
        llm,
        [
            {
                "role": "system",
                "content": (
                    "Pick one specific, concrete hook from the provided LinkedIn post — a claim, "
                    "metric, or opinion to reference in a cold email. Return JSON `{\"hook\": \"...\"}` "
                    "with a single sentence, no quotes."
                ),
            },
            {"role": "user", "content": post},
        ],
        provider="email_llm",
    )
    return {"hook": (result or {}).get("hook", "") if isinstance(result, dict) else ""}


async def draft(state: EmailOutreachState) -> dict:
    llm = make_llm(provider="email_llm")
    tone = state.get("tone") or "professional and friendly"
    template = state.get("template") if state.get("product_aware") else None

    if template:
        body = template.get("body") or template.get("text") or ""
        hook_slot = template.get("hook") or ""
        cta = template.get("cta") or ""
        persona_pain = ""
        match = state.get("persona_match") or {}
        for p in state.get("personas") or []:
            if isinstance(p, dict) and _norm(p.get("title") or p.get("name")) == _norm(match.get("title")):
                persona_pain = p.get("pain") or p.get("pains") or p.get("jtbd") or ""
                if isinstance(persona_pain, list):
                    persona_pain = "; ".join(str(x) for x in persona_pain[:3])
                break

        scaffold = (
            f"Subject template: {template.get('subject') or ''}\n"
            f"Body template (keep structure, substitute variables):\n{body}\n"
            f"Hook slot guidance: {hook_slot}\n"
            f"CTA: {cta}\n"
            f"Persona pain to reference: {persona_pain}"
        )
        result = await ainvoke_json(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "Fill the provided outreach template. Substitute "
                        "{{first_name}}, {{company}}, {{hook_from_post}}, {{persona_pain}} "
                        "with values from the context. Keep the template's structure and CTA. "
                        "Under 120 words. No em-dashes, no exclamation marks. "
                        'Return JSON {"subject": "...", "body": "..."}.'
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Recipient: {state.get('recipient_name', '')}\n"
                        f"Role: {state.get('recipient_role', '') or 'unknown'}\n"
                        f"Tone: {tone}\n"
                        f"Hook from post: {state.get('hook', '') or 'none'}\n"
                        f"Post URL: {state.get('post_url', '') or 'n/a'}\n\n"
                        f"{scaffold}"
                    ),
                },
            ],
            provider="email_llm",
        )
        return {
            "subject": result.get("subject", "") if isinstance(result, dict) else "",
            "draft": result.get("body", "") if isinstance(result, dict) else "",
        }

    result = await ainvoke_json(
        llm,
        [
            {
                "role": "system",
                "content": (
                    "Write a short cold outreach email that references the hook naturally. "
                    "Under 100 words. No em-dashes, no exclamation marks. "
                    'Return JSON {"subject": "...", "body": "..."}.'
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Recipient: {state.get('recipient_name', '')}\n"
                    f"Role: {state.get('recipient_role', '') or 'unknown'}\n"
                    f"Tone: {tone}\n"
                    f"Hook: {state.get('hook', '') or 'none'}\n"
                    f"Post URL: {state.get('post_url', '') or 'n/a'}"
                ),
            },
        ],
        provider="email_llm",
    )
    return {
        "subject": result.get("subject", "") if isinstance(result, dict) else "",
        "draft": result.get("body", "") if isinstance(result, dict) else "",
    }


async def format_html(state: EmailOutreachState) -> dict:
    text = state.get("draft", "")
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    html = "\n".join(f"<p>{escape(p)}</p>" for p in paragraphs)
    return {"text": text, "html": html}


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(EmailOutreachState)
    builder.add_node("lookup_contact", lookup_contact)
    builder.add_node("load_product_context", load_product_context)
    builder.add_node("match_persona", match_persona)
    builder.add_node("select_template", select_template)
    builder.add_node("extract_hook", extract_hook)
    builder.add_node("draft", draft)
    builder.add_node("format_html", format_html)
    builder.add_edge(START, "lookup_contact")
    builder.add_edge("lookup_contact", "load_product_context")
    builder.add_edge("load_product_context", "match_persona")
    builder.add_edge("match_persona", "select_template")
    builder.add_edge("select_template", "extract_hook")
    builder.add_edge("extract_hook", "draft")
    builder.add_edge("draft", "format_html")
    builder.add_edge("format_html", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
