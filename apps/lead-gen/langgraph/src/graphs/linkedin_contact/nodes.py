"""Nodes for the linkedin_contact pipeline.

Flow:
    START --> analyze_profile --> [gate]
                                   |-- relevant --> save_contact --> END
                                   |-- skip --> END
"""

import json
import os
import sys

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from .state import LinkedInContactState, ProfileAnalysis

# ---------------------------------------------------------------------------
# LLM factory
# ---------------------------------------------------------------------------

_llm_json: ChatOpenAI | None = None


def _get_llm() -> ChatOpenAI:
    global _llm_json
    if _llm_json is None:
        _llm_json = ChatOpenAI(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            api_key=os.environ["DEEPSEEK_API_KEY"],
            base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
            temperature=0.2,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
    return _llm_json


ANALYZE_PROFILE_SYSTEM = """\
You are a networking analyst helping an AI/ML engineer find relevant contacts \
for a remote EU job search. Analyze the LinkedIn profile and determine if this \
person is a valuable hiring/recruitment contact.

Valuable contacts include:
- Recruiters or talent acquisition specialists focused on AI, ML, Data Science, \
  or Software Engineering roles
- Hiring managers at AI/ML companies
- Founders/CTOs/VPs at AI startups who hire remotely in EU/UK/EMEA
- People who actively post about AI/ML job opportunities in EU

Return JSON:
{
  "is_relevant": true/false,
  "contact_type": "recruiter" | "hiring_manager" | "founder" | "talent_partner" | "other",
  "focus_areas": ["AI", "ML", ...],
  "regions": ["UK", "EU", "EMEA", ...],
  "relevance_score": 0.0-1.0,
  "reason": "Brief explanation of why this contact is or isn't relevant"
}

Be generous with relevance — anyone connected to AI/ML hiring in Europe is worth saving.\
"""


# ---------------------------------------------------------------------------
# Node 1: analyze_profile
# ---------------------------------------------------------------------------

def analyze_profile_node(state: LinkedInContactState) -> dict:
    """Use LLM to analyze a LinkedIn profile for AI/ML hiring relevance."""
    name = state.get("name", "")
    headline = state.get("headline", "")
    about = state.get("about", "")
    location = state.get("location", "")
    linkedin_url = state.get("linkedin_url", "")

    print(f"  [analyze_profile] Analyzing {name}: {headline}", file=sys.stderr)

    if not name and not headline:
        return {
            "profile_analysis": ProfileAnalysis(
                is_relevant=False,
                contact_type="other",
                focus_areas=[],
                regions=[],
                relevance_score=0.0,
                reason="No profile data provided",
            ),
        }

    user_prompt = f"""\
LinkedIn Profile:
- Name: {name}
- Headline: {headline}
- Location: {location}
- About: {about[:1500] if about else '(not provided)'}
- URL: {linkedin_url}"""

    messages = [
        SystemMessage(content=ANALYZE_PROFILE_SYSTEM),
        HumanMessage(content=user_prompt),
    ]

    response = _get_llm().invoke(messages)

    try:
        raw = json.loads(response.content)
        analysis: ProfileAnalysis = {
            "is_relevant": raw.get("is_relevant", False),
            "contact_type": raw.get("contact_type", "other"),
            "focus_areas": raw.get("focus_areas", []),
            "regions": raw.get("regions", []),
            "relevance_score": float(raw.get("relevance_score", 0.0)),
            "reason": raw.get("reason", ""),
        }
    except (json.JSONDecodeError, KeyError, TypeError):
        analysis = {
            "is_relevant": False,
            "contact_type": "other",
            "focus_areas": [],
            "regions": [],
            "relevance_score": 0.0,
            "reason": "LLM parse error",
        }

    print(
        f"  [analyze_profile] relevant={analysis['is_relevant']} "
        f"type={analysis['contact_type']} score={analysis['relevance_score']} "
        f"— {analysis['reason']}",
        file=sys.stderr,
    )
    return {"profile_analysis": analysis}


# ---------------------------------------------------------------------------
# Router: relevant or skip
# ---------------------------------------------------------------------------

def route_after_analysis(state: LinkedInContactState) -> str:
    analysis = state.get("profile_analysis") or {}
    if analysis.get("is_relevant", False):
        return "save_contact"
    return "skip"


# ---------------------------------------------------------------------------
# Node 2: save_contact
# ---------------------------------------------------------------------------

def save_contact_node(state: LinkedInContactState) -> dict:
    """Upsert the contact into the DB with tags from analysis."""
    name = state.get("name", "").strip()
    headline = state.get("headline", "")
    linkedin_url = state.get("linkedin_url", "")
    analysis = state.get("profile_analysis") or {}

    if not name:
        print("  [save_contact] No name, skipping", file=sys.stderr)
        return {"contact_id": None, "skipped": True}

    parts = name.split(None, 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ""

    # Extract position and company from headline
    position = headline
    company = None
    for sep in [" at ", " @ ", " - ", ", "]:
        if sep in headline:
            position = headline.split(sep, 1)[0].strip()
            company = headline.split(sep, 1)[1].strip()
            break

    # Build tags from analysis
    tags = ["linkedin-contact"]
    contact_type = analysis.get("contact_type", "other")
    if contact_type != "other":
        tags.append(contact_type)
    for area in analysis.get("focus_areas", []):
        tags.append(f"focus:{area.lower()}")
    for region in analysis.get("regions", []):
        tags.append(f"region:{region.lower()}")

    print(f"  [save_contact] Upserting {first_name} {last_name} tags={tags}", file=sys.stderr)

    try:
        from src.db.connection import get_connection
        from src.db.mutations import upsert_contact

        conn = get_connection()
        contact_id = upsert_contact(
            conn,
            first_name=first_name,
            last_name=last_name,
            email=None,
            position=position or None,
            company=company,
            linkedin_url=linkedin_url or None,
            tags=json.dumps(tags),
        )
        conn.close()
        print(f"  [save_contact] Saved: id={contact_id}", file=sys.stderr)
        return {"contact_id": contact_id, "skipped": False}
    except Exception as e:
        print(f"  [save_contact] Failed: {e}", file=sys.stderr)
        return {"contact_id": None, "skipped": False}


# ---------------------------------------------------------------------------
# Node 3: skip — no-op terminal for irrelevant profiles
# ---------------------------------------------------------------------------

def skip_node(state: LinkedInContactState) -> dict:
    name = state.get("name", "unknown")
    reason = (state.get("profile_analysis") or {}).get("reason", "not relevant")
    print(f"  [skip] Skipping {name}: {reason}", file=sys.stderr)
    return {"contact_id": None, "skipped": True}
