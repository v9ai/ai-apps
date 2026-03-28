"""Per-company research: fetch website and classify with DeepSeek."""

import json
import re

import httpx

from .models import CandidateCompany, CompanyResearchResult
from .prompts import build_classification_messages
from .search import get_llm

_HTTP_TIMEOUT = 10.0


def _fetch_website_snippet(domain: str) -> str:
    """Fetch text from company website (try /about, then root)."""
    for path in ["/about", "/careers", "/"]:
        url = f"https://{domain}{path}"
        try:
            resp = httpx.get(url, timeout=_HTTP_TIMEOUT, follow_redirects=True)
            if resp.status_code == 200:
                text = resp.text
                # Strip HTML tags for a rough text extract
                text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL)
                text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL)
                text = re.sub(r"<[^>]+>", " ", text)
                text = re.sub(r"\s+", " ", text).strip()
                return text[:3000]
        except (httpx.HTTPError, httpx.InvalidURL):
            continue
    return ""


def _classify_company(
    name: str,
    domain: str,
    website_snippet: str,
) -> dict:
    """Call DeepSeek to classify company as AI + remote."""
    messages = build_classification_messages(name, domain, website_snippet)
    response = get_llm().invoke(messages)

    try:
        return json.loads(response.content)
    except json.JSONDecodeError:
        return {
            "is_ai_company": False,
            "is_fully_remote": False,
            "ai_tier": 0,
            "confidence": "low",
            "reasons": ["Failed to parse LLM response"],
        }


def research_and_classify(candidate: CandidateCompany) -> CompanyResearchResult:
    """Full research pipeline for a single candidate company."""
    name = candidate["name"]
    domain = candidate["domain"]

    print(f"  → Researching {name} ({domain})")

    # 1. Fetch website content
    website_snippet = _fetch_website_snippet(domain)

    # 2. Find careers URL
    careers_url = f"https://{domain}/careers" if website_snippet else None

    # 3. Classify with DeepSeek
    raw = _classify_company(name, domain, website_snippet)

    result = CompanyResearchResult(
        name=name,
        domain=domain,
        website_snippet=website_snippet[:500],
        careers_url=careers_url,
        is_ai_company=bool(raw.get("is_ai_company", False)),
        is_fully_remote=bool(raw.get("is_fully_remote", False)),
        ai_tier=int(raw.get("ai_tier", 0)),
        company_type=raw.get("company_type", "unknown"),
        employee_range=raw.get("employee_range", "unknown"),
        confidence=raw.get("confidence", "low"),
        reasons=raw.get("reasons", []),
    )

    label = "AI" if result.is_ai_company else "non-AI"
    remote = "remote" if result.is_fully_remote else "non-remote"
    print(f"    [{label}, {remote}] tier={result.ai_tier} conf={result.confidence}")

    return result
