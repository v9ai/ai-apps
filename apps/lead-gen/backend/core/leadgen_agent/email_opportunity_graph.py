"""Email composition graph for a specific opportunity.

Flow:
    load_opportunity -> gather_context -> draft -> refine

`load_opportunity` joins `opportunities` -> `companies` -> `contacts` and
the recent `contact_emails` history, then folds everything into the
`recipient_context` + `instructions` strings consumed by the existing
`email_compose_graph` draft/refine pipeline. The downstream nodes
(`gather_context`, `draft`, `refine`) are imported as-is so prompt
governance, anti-pattern stripping, and telemetry stay in one place.

Inputs:
    opportunity_id: str (required) — `opp_<ts>_<rand>` PK
    additional_instructions: str (optional) — free-form user steering

Outputs (mirror EmailComposeResult so the API route / UI stay symmetric):
    subject, body, draft_subject, draft_body, prompt_version, model,
    prompt_tokens, completion_tokens, graph_meta, plus the loaded
    contact_email / contact_id for downstream send.
"""

from __future__ import annotations

import os
from typing import Any

import psycopg
from langgraph.graph import END, START, StateGraph

from .email_compose_graph import draft, gather_context, refine
from .state import EmailOpportunityState


def _dsn() -> str:
    return os.environ.get("NEON_DATABASE_URL", "").strip()


async def load_opportunity(state: EmailOpportunityState) -> dict:
    opp_id = (state.get("opportunity_id") or "").strip()
    dsn = _dsn()
    if not opp_id or not dsn:
        return {
            "opportunity_title": "",
            "recipient_name": "",
            "instructions": state.get("additional_instructions") or "",
            "recipient_context": "",
        }

    with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    o.title, o.url, o.status, o.raw_context,
                    o.applied, o.applied_at, o.application_status,
                    c.name AS company_name,
                    c.website AS company_website,
                    c.category AS company_category,
                    p.id AS contact_id,
                    p.first_name AS contact_first_name,
                    p.last_name AS contact_last_name,
                    p.email AS contact_email,
                    p.position AS contact_position,
                    p.linkedin_url AS contact_linkedin_url
                FROM opportunities o
                LEFT JOIN companies c ON c.id = o.company_id
                LEFT JOIN contacts p ON p.id = o.contact_id
                WHERE o.id = %s
                LIMIT 1
                """,
                (opp_id,),
            )
            row = cur.fetchone()
            if not row:
                return {
                    "opportunity_title": "",
                    "recipient_name": "",
                    "instructions": state.get("additional_instructions") or "",
                    "recipient_context": "",
                }
            cols = [d[0] for d in cur.description or []]
            opp = dict(zip(cols, row))

            prior_subjects: list[str] = []
            if opp.get("contact_id"):
                cur.execute(
                    """
                    SELECT subject
                    FROM contact_emails
                    WHERE contact_id = %s
                    ORDER BY created_at DESC
                    LIMIT 5
                    """,
                    (int(opp["contact_id"]),),
                )
                prior_subjects = [r[0] for r in cur.fetchall() if r and r[0]]

    title = opp.get("title") or ""
    company_name = opp.get("company_name") or ""
    raw_context = (opp.get("raw_context") or "")[:3000]
    first_name = opp.get("contact_first_name") or ""
    last_name = opp.get("contact_last_name") or ""
    recipient_name = f"{first_name} {last_name}".strip()

    parts: list[str] = []
    if title:
        parts.append(f"Role: {title}")
    if company_name:
        line = f"Company: {company_name}"
        if opp.get("company_website"):
            line += f" ({opp['company_website']})"
        parts.append(line)
    if opp.get("company_category"):
        parts.append(f"Company category: {opp['company_category']}")
    if opp.get("contact_position"):
        parts.append(f"Recipient role: {opp['contact_position']}")
    if opp.get("contact_linkedin_url"):
        parts.append(f"Recipient LinkedIn: {opp['contact_linkedin_url']}")
    if opp.get("status"):
        parts.append(f"Opportunity status: {opp['status']}")
    if opp.get("applied"):
        parts.append(
            "Already applied"
            + (f" on {opp['applied_at']}" if opp.get("applied_at") else "")
            + (
                f" — application status: {opp['application_status']}"
                if opp.get("application_status")
                else ""
            )
        )
    if prior_subjects:
        parts.append(
            "Prior outbound subjects (avoid repeating wording): "
            + "; ".join(prior_subjects)
        )
    if raw_context:
        parts.append(f"Job description (truncated):\n{raw_context}")

    recipient_context = "\n".join(parts)

    extra = (state.get("additional_instructions") or "").strip()
    if opp.get("applied"):
        base_instruction = (
            f"Write a concise, specific follow-up email about the {title} role at "
            f"{company_name or 'the company'}. Reference one concrete signal from the "
            "job description and one overlap with the sender's background. Keep it warm "
            "but direct."
        )
    else:
        base_instruction = (
            f"Write a personalized cold outreach email about the {title} role at "
            f"{company_name or 'the company'}. Reference one specific detail from the "
            "job description (a tech, a problem, a stage) and one overlap with the "
            "sender's background. Ask for a 15-minute call."
        )
    instructions = base_instruction + (f"\n\nExtra steering: {extra}" if extra else "")

    return {
        "opportunity_title": title,
        "opportunity_url": opp.get("url") or "",
        "opportunity_status": opp.get("status") or "",
        "opportunity_raw_context": raw_context,
        "opportunity_applied": bool(opp.get("applied")),
        "opportunity_applied_at": opp.get("applied_at") or "",
        "opportunity_application_status": opp.get("application_status") or "",
        "company_name": company_name,
        "company_website": opp.get("company_website") or "",
        "company_category": opp.get("company_category") or "",
        "contact_id": opp.get("contact_id"),
        "contact_first_name": first_name,
        "contact_last_name": last_name,
        "contact_email": opp.get("contact_email") or "",
        "contact_position": opp.get("contact_position") or "",
        "contact_linkedin_url": opp.get("contact_linkedin_url") or "",
        "prior_subjects": prior_subjects,
        # Fields consumed by gather_context / draft / refine:
        "recipient_name": recipient_name or first_name or "",
        "instructions": instructions,
        "recipient_context": recipient_context,
    }


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(EmailOpportunityState)
    builder.add_node("load_opportunity", load_opportunity)
    builder.add_node("gather_context", gather_context)
    builder.add_node("draft", draft)
    builder.add_node("refine", refine)
    builder.add_edge(START, "load_opportunity")
    builder.add_edge("load_opportunity", "gather_context")
    builder.add_edge("gather_context", "draft")
    builder.add_edge("draft", "refine")
    builder.add_edge("refine", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
