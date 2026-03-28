"""Per-company research: fetch website and classify with DeepSeek."""

import json
import re

import httpx

from .models import CandidateCompany, CompanyResearchResult
from .prompts import build_classification_messages
from .search import get_llm

_HTTP_TIMEOUT = 10.0


def _guess_slug(name: str, domain: str) -> str:
    """Generate likely ATS board slug from company name/domain."""
    # Try domain first (e.g. "mistral.ai" -> "mistral")
    slug = domain.split(".")[0].lower()
    slug = re.sub(r"[^a-z0-9]", "", slug)
    if slug:
        return slug
    # Fallback to name
    return re.sub(r"[^a-z0-9]", "", name.lower())


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


def _probe_greenhouse(slug: str) -> ATSBoardDetection | None:
    """Check if company has a Greenhouse job board."""
    url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs"
    try:
        resp = httpx.get(url, timeout=_HTTP_TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            jobs = data.get("jobs", [])
            return ATSBoardDetection(
                vendor="greenhouse",
                board_slug=slug,
                url=f"https://boards.greenhouse.io/{slug}",
                job_count=len(jobs),
            )
    except (httpx.HTTPError, json.JSONDecodeError):
        pass
    return None


def _probe_lever(slug: str) -> ATSBoardDetection | None:
    """Check if company has a Lever job board."""
    url = f"https://api.lever.co/v0/postings/{slug}"
    try:
        resp = httpx.get(url, timeout=_HTTP_TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                return ATSBoardDetection(
                    vendor="lever",
                    board_slug=slug,
                    url=f"https://jobs.lever.co/{slug}",
                    job_count=len(data),
                )
    except (httpx.HTTPError, json.JSONDecodeError):
        pass
    return None


def _probe_ashby(slug: str) -> ATSBoardDetection | None:
    """Check if company has an Ashby job board."""
    url = f"https://api.ashbyhq.com/posting-api/job-board/{slug}"
    try:
        resp = httpx.get(url, timeout=_HTTP_TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            jobs = data.get("jobs", [])
            return ATSBoardDetection(
                vendor="ashby",
                board_slug=slug,
                url=f"https://jobs.ashbyhq.com/{slug}",
                job_count=len(jobs),
            )
    except (httpx.HTTPError, json.JSONDecodeError):
        pass
    return None


def _probe_ats_boards(name: str, domain: str) -> list[ATSBoardDetection]:
    """Probe all three ATS platforms for job boards."""
    slug = _guess_slug(name, domain)
    boards: list[ATSBoardDetection] = []

    for probe_fn in [_probe_greenhouse, _probe_lever, _probe_ashby]:
        result = probe_fn(slug)
        if result:
            boards.append(result)

    return boards


def _classify_company(
    name: str,
    domain: str,
    website_snippet: str,
    ats_boards: list[ATSBoardDetection],
) -> dict:
    """Call DeepSeek to classify company as AI + remote."""
    ats_evidence_parts = []
    for board in ats_boards:
        ats_evidence_parts.append(
            f"- {board.vendor}: {board.url} ({board.job_count} jobs)"
        )
    ats_evidence = "\n".join(ats_evidence_parts)

    messages = build_classification_messages(name, domain, website_snippet, ats_evidence)
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

    # 2. Probe ATS boards
    ats_boards = _probe_ats_boards(name, domain)
    if ats_boards:
        board_summary = ", ".join(f"{b.vendor}({b.job_count})" for b in ats_boards)
        print(f"    ATS boards: {board_summary}")

    # 3. Find careers URL
    careers_url = None
    for board in ats_boards:
        careers_url = board.url
        break
    if not careers_url and website_snippet:
        careers_url = f"https://{domain}/careers"

    # 4. Classify with DeepSeek
    raw = _classify_company(name, domain, website_snippet, ats_boards)

    result = CompanyResearchResult(
        name=name,
        domain=domain,
        website_snippet=website_snippet[:500],
        careers_url=careers_url,
        ats_boards=ats_boards,
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
