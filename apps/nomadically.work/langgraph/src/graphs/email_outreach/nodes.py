"""Nodes for the email outreach pipeline.

Flow:
    START ──→ research_contact ──┐
         ├──→ research_company ──┼──→ screen_remote_eu ──→ [gate]
         └──→ analyze_post ──────┘                          ├─ relevant → draft_email → refine_email → END
                                                            └─ skip → END
"""

import json
import os
import re
import sys
from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from .prompts import ANALYZE_POST_SYSTEM, DRAFT_EMAIL_SYSTEM, REFINE_EMAIL_SYSTEM, SCREEN_REMOTE_EU_SYSTEM
from .state import EmailOutreachState

# ---------------------------------------------------------------------------
# Resume background — loaded once from resume-data.json
# ---------------------------------------------------------------------------

_RESUME_PATH = (
    Path(__file__).resolve().parents[4]
    / "src" / "apollo" / "resolvers" / "resume" / "resume-data.json"
)


_CRYPTO_KEYWORDS = {"crypto", "defi", "blockchain", "dydx", "hyperliquid", "trading"}


def _has_crypto(text: str) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in _CRYPTO_KEYWORDS)


def _load_resume_background() -> str:
    data = json.loads(_RESUME_PATH.read_text())
    basics = data["basics"]
    lines = [
        f"Background on {basics['name']}:",
        f"- {basics['summary']}",
        f"- Key skills: {basics['keySkills']}",
    ]
    for job in data["work"][:2]:
        if not _has_crypto(job.get("summary", "")):
            lines.append(f"- {job['position']} at {job['name']} ({job['years']})")
    for proj in data.get("activities", {}).get("aiProjects", []):
        if not _has_crypto(proj.get("description", "")):
            lines.append(f"- AI Project: {proj['name']} — {proj['description']}")
    for vol in data.get("volunteer", []):
        if not _has_crypto(vol.get("summary", "")):
            lines.append(f"- Open Source: {vol['organization']} — {vol['position']}")
    return "\n".join(lines)


RESUME_BACKGROUND = _load_resume_background()

_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
_REPLY_LINE_RE = re.compile(r"(?m)^.*Reply to:.*$\n?", re.IGNORECASE)
_MAILTO_RE = re.compile(r'<a\s+href="mailto:[^"]*">[^<]*</a>', re.IGNORECASE)


def _strip_email_footer(draft: dict) -> dict:
    """Hard-strip any email addresses and 'Reply to:' lines from the email body."""
    for key in ("text", "html"):
        val = draft.get(key, "")
        val = _REPLY_LINE_RE.sub("", val)
        val = _MAILTO_RE.sub("", val)
        val = _EMAIL_RE.sub("", val)
        draft[key] = val.rstrip()
    return draft


# ---------------------------------------------------------------------------
# LLM factories (same pattern as application_prep/nodes.py)
# ---------------------------------------------------------------------------

_llm_json = None
_llm_json_fallback = None


def _get_llm_json() -> ChatOpenAI:
    global _llm_json
    if _llm_json is None:
        _llm_json = ChatOpenAI(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            api_key=os.environ["DEEPSEEK_API_KEY"],
            base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
            temperature=0.3,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
    return _llm_json


def _get_fallback_json() -> ChatOpenAI | None:
    global _llm_json_fallback
    key = os.getenv("DASHSCOPE_API_KEY")
    if not key:
        return None
    if _llm_json_fallback is None:
        _llm_json_fallback = ChatOpenAI(
            model="qwen-plus",
            api_key=key,
            base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
            temperature=0.3,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
    return _llm_json_fallback


def _invoke_with_fallback(llm: ChatOpenAI, messages):
    """Invoke LLM with Qwen fallback on failure."""
    try:
        return llm.invoke(messages)
    except Exception as e:
        fallback = _get_fallback_json()
        if fallback is None:
            raise
        print(f"  [fallback] DeepSeek failed ({type(e).__name__}), retrying with Qwen...", file=sys.stderr)
        return fallback.invoke(messages)


# ---------------------------------------------------------------------------
# Node 1: research_contact — look up contact in DB
# ---------------------------------------------------------------------------

def research_contact_node(state: EmailOutreachState) -> dict:
    email = state.get("recipient_email", "")
    name = state.get("recipient_name", "")
    print(f"  [research_contact] Looking up {name} / {email}", file=sys.stderr)

    context_parts = []

    try:
        from src.db.connection import get_connection
        conn = get_connection()
        with conn.cursor() as cur:
            # Try email match first, then name match
            if email:
                cur.execute(
                    """SELECT first_name, last_name, position, company,
                              linkedin_url, tags
                       FROM contacts WHERE %s = ANY(emails) LIMIT 1""",
                    [email],
                )
            else:
                cur.execute(
                    """SELECT first_name, last_name, position, company,
                              linkedin_url, tags
                       FROM contacts
                       WHERE first_name || ' ' || last_name ILIKE %s
                       LIMIT 1""",
                    [f"%{name}%"],
                )
            row = cur.fetchone()
        conn.close()

        if row:
            context_parts.append(f"Known contact: {row['first_name']} {row['last_name']}")
            if row.get("position"):
                context_parts.append(f"Role: {row['position']}")
            if row.get("company"):
                context_parts.append(f"Company: {row['company']}")
            if row.get("tags"):
                context_parts.append(f"Tags: {', '.join(row['tags']) if isinstance(row['tags'], list) else row['tags']}")
        else:
            context_parts.append(f"No existing contact found for {name} ({email})")
    except Exception as e:
        print(f"  [research_contact] DB lookup failed: {e}", file=sys.stderr)
        context_parts.append(f"Contact: {name} ({email}) — no DB data available")

    # Add role info from LinkedIn post
    role = state.get("recipient_role", "")
    if role:
        context_parts.append(f"LinkedIn subtitle: {role}")

    return {"contact_context": "\n".join(context_parts)}


# ---------------------------------------------------------------------------
# Node 2: research_company — look up company in DB
# ---------------------------------------------------------------------------

def research_company_node(state: EmailOutreachState) -> dict:
    role = state.get("recipient_role", "")
    name = state.get("recipient_name", "")

    # Extract company name from role string (e.g. "CTO at Acme Inc")
    company_name = ""
    for sep in [" at ", " @ ", " - ", ", "]:
        if sep in role:
            company_name = role.split(sep, 1)[1].strip()
            break

    print(f"  [research_company] Looking up company: {company_name or '(unknown)'}", file=sys.stderr)

    context_parts = []

    if company_name:
        try:
            from src.db.connection import get_connection
            conn = get_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT name, description, industry, size, location,
                              website, category, ai_tier, ai_classification_reason
                       FROM companies
                       WHERE name ILIKE %s
                       LIMIT 1""",
                    [f"%{company_name}%"],
                )
                row = cur.fetchone()
            conn.close()

            if row:
                context_parts.append(f"Company: {row['name']}")
                if row.get("description"):
                    context_parts.append(f"Description: {row['description'][:300]}")
                if row.get("industry"):
                    context_parts.append(f"Industry: {row['industry']}")
                if row.get("size"):
                    context_parts.append(f"Size: {row['size']}")
                if row.get("ai_tier"):
                    context_parts.append(f"AI Tier: {row['ai_tier']}")
            else:
                context_parts.append(f"Company '{company_name}' not found in DB")
        except Exception as e:
            print(f"  [research_company] DB lookup failed: {e}", file=sys.stderr)
            context_parts.append(f"Company: {company_name} — no DB data available")
    else:
        context_parts.append("Could not extract company name from recipient role")

    return {"company_context": "\n".join(context_parts)}


# ---------------------------------------------------------------------------
# Node 3: analyze_post — extract structured info from LinkedIn post
# ---------------------------------------------------------------------------

def analyze_post_node(state: EmailOutreachState) -> dict:
    post_text = state.get("post_text", "")
    print(f"  [analyze_post] Analyzing post ({len(post_text)} chars)", file=sys.stderr)

    if not post_text.strip():
        return {"post_analysis": {
            "topics": [],
            "intent": "other",
            "engagement_hooks": [],
            "key_quotes": [],
        }}

    messages = [
        SystemMessage(content=ANALYZE_POST_SYSTEM),
        HumanMessage(content=f"LinkedIn post:\n\n{post_text[:2000]}"),
    ]

    response = _invoke_with_fallback(_get_llm_json(), messages)

    try:
        analysis = json.loads(response.content)
    except (json.JSONDecodeError, TypeError):
        analysis = {
            "topics": [],
            "intent": "other",
            "engagement_hooks": [post_text[:100]],
            "key_quotes": [],
        }

    return {"post_analysis": analysis}


# ---------------------------------------------------------------------------
# Node 4: screen_remote_eu — gate on fully-remote EU relevance
# ---------------------------------------------------------------------------

_HIRING_INTENTS = {"hiring"}

# Fast keyword reject — avoids LLM call for obvious non-EU posts
_US_ONLY_KEYWORDS = frozenset({
    "us only", "us-only", "united states only", "must be based in the us",
    "us work authorization", "401(k)", "401k",
})
_HYBRID_KEYWORDS = frozenset({
    "hybrid", "on-site", "onsite", "in-office", "in office",
    "days in the office", "days per week in office",
})
_EU_POSITIVE_KEYWORDS = frozenset({
    "remote eu", "remote - eu", "remote-eu", "emea", "europe",
    "eu work authorization", "eu timezone", "cet timezone",
    "european business hours", "eu member", "eea",
})


def _keyword_screen(post_text: str, intent: str) -> dict | None:
    """Fast keyword pre-screen. Returns a screen dict or None to escalate to LLM."""
    if intent not in _HIRING_INTENTS:
        return {
            "is_relevant": True,
            "reason": f"Non-hiring post (intent={intent}) — networking opportunity",
            "work_model": "unknown",
            "region": "unknown",
        }

    lower = post_text.lower()

    # Check EU-positive first (stronger signal)
    has_eu = any(kw in lower for kw in _EU_POSITIVE_KEYWORDS)

    # Hard reject: US-only
    if any(kw in lower for kw in _US_ONLY_KEYWORDS) and not has_eu:
        return {
            "is_relevant": False,
            "reason": "US-only signals detected in hiring post",
            "work_model": "fully_remote",
            "region": "us",
        }

    # Fast accept: clear EU remote signals
    remote_kw = any(kw in lower for kw in {"remote", "fully remote", "work from anywhere"})
    if has_eu and remote_kw:
        return {
            "is_relevant": True,
            "reason": "EU remote signals + remote keyword in hiring post",
            "work_model": "fully_remote",
            "region": "eu",
        }

    return None  # ambiguous — escalate to LLM


def screen_remote_eu_node(state: EmailOutreachState) -> dict:
    """Gate node: check if post is about a fully-remote EU opportunity.

    Non-hiring posts always pass (networking opportunity).
    Hiring posts must be fully remote + EU-eligible to proceed.
    """
    post_text = state.get("post_text", "")
    analysis = state.get("post_analysis") or {}
    intent = analysis.get("intent", "other")
    company_ctx = state.get("company_context", "")

    print(f"  [screen_remote_eu] Screening (intent={intent})", file=sys.stderr)

    # Try keyword pre-screen first
    screen = _keyword_screen(post_text, intent)
    if screen is not None:
        print(f"  [screen_remote_eu] Keyword: is_relevant={screen['is_relevant']} — {screen['reason']}", file=sys.stderr)
        return {"remote_eu_screen": screen}

    # LLM fallback for ambiguous hiring posts
    user_prompt = (
        f"LinkedIn post:\n{post_text[:2000]}\n\n"
        f"Post intent: {intent}\n"
        f"Topics: {', '.join(analysis.get('topics', []))}\n\n"
        f"Company context:\n{company_ctx[:500]}"
    )

    messages = [
        SystemMessage(content=SCREEN_REMOTE_EU_SYSTEM),
        HumanMessage(content=user_prompt),
    ]

    response = _invoke_with_fallback(_get_llm_json(), messages)

    try:
        screen = json.loads(response.content)
    except (json.JSONDecodeError, TypeError):
        # On parse failure, default to relevant (don't block outreach)
        screen = {
            "is_relevant": True,
            "reason": "LLM parse error — defaulting to relevant",
            "work_model": "unknown",
            "region": "unknown",
        }

    print(f"  [screen_remote_eu] LLM: is_relevant={screen.get('is_relevant')} — {screen.get('reason', '?')}", file=sys.stderr)
    return {"remote_eu_screen": screen}


def route_after_screen(state: EmailOutreachState) -> str:
    """Route based on remote-EU screen result."""
    screen = state.get("remote_eu_screen") or {}
    if screen.get("is_relevant", True):
        return "draft_email"
    return "skip"


# ---------------------------------------------------------------------------
# Node 5: draft_email — generate email using all context
# ---------------------------------------------------------------------------

def draft_email_node(state: EmailOutreachState) -> dict:
    print("  [draft_email] Generating email draft", file=sys.stderr)

    contact = state.get("contact_context", "No contact info")
    company = state.get("company_context", "No company info")
    analysis = state.get("post_analysis") or {}
    post_text = state.get("post_text", "")
    post_url = state.get("post_url", "")
    tone = state.get("tone", "professional and friendly")
    recipient_name = state.get("recipient_name", "there")

    user_prompt = f"""Write an outreach email to {recipient_name} based on their LinkedIn post.

--- Contact Research ---
{contact}

--- Company Research ---
{company}

--- Post Analysis ---
Topics: {', '.join(analysis.get('topics', []))}
Intent: {analysis.get('intent', 'unknown')}
Engagement hooks: {', '.join(analysis.get('engagement_hooks', []))}
Key quotes: {', '.join(analysis.get('key_quotes', []))}

--- Original Post (excerpt) ---
{post_text[:1000]}

--- Post URL ---
{post_url}

--- Tone ---
{tone}"""

    system_prompt = DRAFT_EMAIL_SYSTEM.format(resume_background=RESUME_BACKGROUND)

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ]

    response = _invoke_with_fallback(_get_llm_json(), messages)

    try:
        draft = json.loads(response.content)
    except (json.JSONDecodeError, TypeError):
        text = response.content.strip()
        draft = {
            "subject": "Re: your LinkedIn post",
            "text": text,
            "html": "".join(f"<p>{p}</p>" for p in text.split("\n\n") if p.strip()),
        }

    return {"draft": draft}


# ---------------------------------------------------------------------------
# Node 5: refine_email — self-critique and improve
# ---------------------------------------------------------------------------

def refine_email_node(state: EmailOutreachState) -> dict:
    draft = state.get("draft")
    if not draft:
        return {"final": {"subject": "", "text": "", "html": ""}}

    print("  [refine_email] Refining draft", file=sys.stderr)

    post_text = state.get("post_text", "")

    user_prompt = f"""Review and improve this outreach email draft.

--- Draft ---
Subject: {draft['subject']}

Body:
{draft['text']}

--- LinkedIn Post (for reference) ---
{post_text[:500]}

Return the improved (or unchanged) email as JSON."""

    messages = [
        SystemMessage(content=REFINE_EMAIL_SYSTEM),
        HumanMessage(content=user_prompt),
    ]

    response = _invoke_with_fallback(_get_llm_json(), messages)

    try:
        refined = json.loads(response.content)
    except (json.JSONDecodeError, TypeError):
        refined = draft

    # Hard strip: remove "Reply to: ..." lines and any email addresses from body
    refined = _strip_email_footer(refined)

    return {"final": refined}
