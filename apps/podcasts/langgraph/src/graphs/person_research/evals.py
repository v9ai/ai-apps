"""
Evals for the person research pipeline.

Run (deterministic only — reads existing JSON files):
    python -m src.graphs.person_research.evals
    python -m src.graphs.person_research.evals --slug athos-georgiou --verbose

Run (full pipeline + deepeval — invokes graph, costs API credits):
    python -m src.graphs.person_research.evals --full

Three phases:
1. Hard structural assertions — fail fast on counts, types, required fields
2. Semantic assertions — identity anchors, forbidden terms, URL validity
3. deepeval GEval metrics — LLM-judged quality for bio, completeness, attribution
"""

from __future__ import annotations

from dotenv import load_dotenv

load_dotenv()

import json
import os
import sys
from pathlib import Path

from rich.console import Console
from rich.table import Table

console = Console()

RESEARCH_DIR = Path(__file__).resolve().parents[4] / "src" / "lib" / "research"


# ═══════════════════════════════════════════════════════════════════════════
# Deterministic test definitions
# ═══════════════════════════════════════════════════════════════════════════

# Known wrong-person URLs that should NEVER appear in any research profile.
# These are real examples of name collisions caught in production.
KNOWN_WRONG_PERSON_URLS = {
    "athos-georgiou": [
        # Dr. Chrysanthos Athos Georgiou — Cypriot surgeon, NOT the AI researcher
        "akel.org.cy",
        # Athos Georgiou — Credit Manager at Alpha Bank Cyprus
        "cy.linkedin.com/in/athos-georgiou-077977231",
    ],
}

# For each personality, the profile MUST mention these terms (case-insensitive)
# to confirm it's about the right person.
IDENTITY_ANCHORS = {
    "athos-georgiou": {
        "required_any": ["NCA", "athrael-soju", "athosgeorgiou.com", "LLM inference"],
        "forbidden_terms": ["surgeon", "Alpha Bank", "AKEL", "Nicosia General Hospital", "Credit Manager"],
    },
}

# Ground-truth arXiv paper counts per person (verified via arXiv API).
# Eval checks that personalities.ts has exactly this many papers.
ARXIV_PAPER_COUNTS = {
    "athos-georgiou": {
        "count": 2,
        "expected_ids": ["2603.10031", "2512.02660"],
    },
}

# Every source/timeline URL must be reachable (not a wrong-person domain)
FORBIDDEN_DOMAINS = {
    "athos-georgiou": ["akel.org.cy", "cy.linkedin.com"],
}


# ═══════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════

def _load_research(slug: str) -> dict | None:
    path = RESEARCH_DIR / f"{slug}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text())


def _extract_all_urls(research: dict) -> list[str]:
    """Extract every URL from the research profile."""
    urls: list[str] = []
    for event in research.get("timeline", []):
        if event.get("url"):
            urls.append(event["url"])
    for c in research.get("key_contributions", []):
        if c.get("url"):
            urls.append(c["url"])
    for q in research.get("quotes", []):
        if q.get("url"):
            urls.append(q["url"])
    for s in research.get("sources", []):
        if s.get("url"):
            urls.append(s["url"])
    for url in research.get("social", {}).values():
        if url:
            urls.append(url)
    return urls


def _extract_all_text(research: dict) -> str:
    """Concatenate all text fields for keyword scanning."""
    parts = [
        research.get("bio", ""),
        " ".join(research.get("topics", [])),
    ]
    for event in research.get("timeline", []):
        parts.append(event.get("event", ""))
    for c in research.get("key_contributions", []):
        parts.append(c.get("title", ""))
        parts.append(c.get("description", ""))
    for q in research.get("quotes", []):
        parts.append(q.get("text", ""))
        parts.append(q.get("source", ""))
    return " ".join(parts)


class EvalResult:
    def __init__(self, name: str, slug: str):
        self.name = name
        self.slug = slug
        self.passed = True
        self.failures: list[str] = []

    def fail(self, msg: str):
        self.passed = False
        self.failures.append(msg)


# ═══════════════════════════════════════════════════════════════════════════
# Deterministic evals (phase 1 + 2) — run on existing JSON files
# ═══════════════════════════════════════════════════════════════════════════

def eval_no_wrong_person_urls(slug: str, research: dict) -> EvalResult:
    """No URL from a known wrong-person domain should appear."""
    result = EvalResult("no_wrong_person_urls", slug)
    urls = _extract_all_urls(research)
    forbidden = KNOWN_WRONG_PERSON_URLS.get(slug, [])

    for url in urls:
        for pattern in forbidden:
            if pattern in url:
                result.fail(f"Wrong-person URL found: {url} (matches '{pattern}')")

    return result


def eval_no_forbidden_domains(slug: str, research: dict) -> EvalResult:
    """No URL should come from a forbidden domain for this person."""
    result = EvalResult("no_forbidden_domains", slug)
    urls = _extract_all_urls(research)
    forbidden = FORBIDDEN_DOMAINS.get(slug, [])

    for url in urls:
        for domain in forbidden:
            if domain in url:
                result.fail(f"Forbidden domain in URL: {url} (domain: {domain})")

    return result


def eval_identity_anchors(slug: str, research: dict) -> EvalResult:
    """Profile text must contain at least one identity anchor and no forbidden terms."""
    result = EvalResult("identity_anchors", slug)
    anchors = IDENTITY_ANCHORS.get(slug)
    if not anchors:
        return result  # no anchors defined — skip

    text = _extract_all_text(research).lower()

    # Must contain at least one required term
    required = anchors.get("required_any", [])
    if required:
        found = [term for term in required if term.lower() in text]
        if not found:
            result.fail(f"None of the identity anchors found in text: {required}")

    # Must NOT contain any forbidden terms
    forbidden = anchors.get("forbidden_terms", [])
    for term in forbidden:
        if term.lower() in text:
            result.fail(f"Forbidden term found in text: '{term}'")

    return result


def eval_has_required_fields(slug: str, research: dict) -> EvalResult:
    """Research profile must have all required top-level fields populated."""
    result = EvalResult("has_required_fields", slug)

    required = ["slug", "name", "bio", "topics", "timeline", "key_contributions", "social", "sources"]
    for field in required:
        val = research.get(field)
        if val is None:
            result.fail(f"Missing field: {field}")
        elif isinstance(val, (list, dict, str)) and len(val) == 0:
            result.fail(f"Empty field: {field}")

    return result


def eval_no_null_urls(slug: str, research: dict) -> EvalResult:
    """No URL field should contain 'null' or be the string 'null'."""
    result = EvalResult("no_null_urls", slug)
    urls = _extract_all_urls(research)

    for url in urls:
        if url == "null" or url == "None" or not url.startswith("http"):
            result.fail(f"Invalid URL: '{url}'")

    return result


def eval_bio_mentions_name(slug: str, research: dict) -> EvalResult:
    """Bio must mention the person's name."""
    result = EvalResult("bio_mentions_name", slug)
    name = research.get("name", "")
    bio = research.get("bio", "")

    if name and name.lower() not in bio.lower():
        result.fail(f"Bio does not mention '{name}'")

    return result


def eval_structure_depth(slug: str, research: dict) -> EvalResult:
    """Research must meet minimum depth thresholds for rich output."""
    result = EvalResult("structure_depth", slug)
    name = research.get("name", slug)

    bio = research.get("bio", "")
    if len(bio) < 100:
        result.fail(f"Bio too short ({len(bio)} chars, need >= 100)")
    if len(bio) > 2000:
        result.fail(f"Bio too long ({len(bio)} chars, need <= 2000)")

    topics = research.get("topics", [])
    if len(topics) < 5:
        result.fail(f"Too few topics ({len(topics)}, need >= 5)")

    timeline = research.get("timeline", [])
    if len(timeline) < 3:
        result.fail(f"Too few timeline events ({len(timeline)}, need >= 3)")
    for event in timeline:
        if not event.get("date"):
            result.fail(f"Timeline event missing date: {event.get('event', '')[:50]}")
        if not event.get("event"):
            result.fail(f"Timeline event missing description")

    contributions = research.get("key_contributions", [])
    if len(contributions) < 2:
        result.fail(f"Too few contributions ({len(contributions)}, need >= 2)")
    for c in contributions:
        if not c.get("title"):
            result.fail(f"Contribution missing title")
        if not c.get("description"):
            result.fail(f"Contribution missing description: {c.get('title', '')}")

    quotes = research.get("quotes", [])
    for q in quotes:
        if not q.get("text"):
            result.fail(f"Quote missing text")
        if not q.get("source"):
            result.fail(f"Quote missing source: {q.get('text', '')[:50]}")

    sources = research.get("sources", [])
    if len(sources) < 3:
        result.fail(f"Too few sources ({len(sources)}, need >= 3)")

    return result


def eval_arxiv_papers(slug: str, research: dict) -> EvalResult:
    """Verify arXiv paper count and IDs match ground truth in personalities.ts."""
    result = EvalResult("arxiv_papers", slug)
    expected = ARXIV_PAPER_COUNTS.get(slug)
    if not expected:
        return result  # no ground truth — skip

    # Check personalities.ts papers
    ts_path = RESEARCH_DIR.parent / "personalities.ts"
    if not ts_path.exists():
        result.fail(f"personalities.ts not found at {ts_path}")
        return result

    import re
    content = ts_path.read_text()

    # Find papers array for this slug
    slug_pos = content.find(f'slug: "{slug}"')
    if slug_pos == -1:
        result.fail(f"Slug '{slug}' not found in personalities.ts")
        return result

    # Extract papers block after slug
    papers_match = re.search(
        r'slug:\s*"' + re.escape(slug) + r'".*?papers:\s*\[(.*?)\]',
        content, re.DOTALL,
    )
    if not papers_match:
        result.fail(f"No papers array found for {slug} in personalities.ts")
        return result

    papers_block = papers_match.group(1)
    arxiv_ids = re.findall(r'arxiv:\s*"([^"]+)"', papers_block)

    # Check count
    if len(arxiv_ids) != expected["count"]:
        result.fail(f"Paper count mismatch: got {len(arxiv_ids)}, expected {expected['count']}")

    # Check expected IDs
    for eid in expected["expected_ids"]:
        if eid not in arxiv_ids:
            result.fail(f"Missing expected arXiv paper: {eid}")

    # Check no unexpected IDs
    for aid in arxiv_ids:
        if aid not in expected["expected_ids"]:
            result.fail(f"Unexpected arXiv paper: {aid}")

    return result


ALL_DETERMINISTIC_EVALS = [
    eval_no_wrong_person_urls,
    eval_no_forbidden_domains,
    eval_identity_anchors,
    eval_has_required_fields,
    eval_no_null_urls,
    eval_bio_mentions_name,
    eval_structure_depth,
    eval_arxiv_papers,
]


# ═══════════════════════════════════════════════════════════════════════════
# Deterministic runner
# ═══════════════════════════════════════════════════════════════════════════

def run_deterministic_evals(slug: str | None = None, verbose: bool = False) -> bool:
    """Run deterministic evals on existing JSON files."""
    if slug:
        slugs = [slug]
    else:
        slugs = [p.stem for p in RESEARCH_DIR.glob("*.json")]

    if not slugs:
        console.print("[yellow]No research files found.[/]")
        return True

    all_passed = True
    table = Table(title="Person Research Evals (Deterministic)")
    table.add_column("Slug", style="cyan", width=20)
    table.add_column("Eval", width=25)
    table.add_column("Status", width=8)
    table.add_column("Details", style="dim", width=50)

    for s in sorted(slugs):
        research = _load_research(s)
        if not research:
            table.add_row(s, "—", "[yellow]SKIP[/]", "File not found")
            continue

        for eval_fn in ALL_DETERMINISTIC_EVALS:
            result = eval_fn(s, research)
            if result.passed:
                if verbose:
                    table.add_row(s, result.name, "[green]PASS[/]", "")
            else:
                all_passed = False
                for failure in result.failures:
                    table.add_row(s, result.name, "[red]FAIL[/]", failure)

    console.print(table)

    if all_passed:
        console.print("\n[bold green]All deterministic evals passed.[/]\n")
    else:
        console.print("\n[bold red]Some deterministic evals failed.[/]\n")

    return all_passed


# ═══════════════════════════════════════════════════════════════════════════
# Full pipeline evals (phase 3) — invokes graph + deepeval GEval
# ═══════════════════════════════════════════════════════════════════════════

# Mock persons for end-to-end pipeline testing
MOCK_PERSONS = [
    {
        "name": "Andrej Karpathy",
        "slug": "andrej-karpathy",
        "role": "Founder",
        "org": "Eureka Labs",
        "github": "karpathy",
        "expected_topics_contain": ["deep learning", "neural network"],
        "expected_min_timeline": 5,
        "expected_min_contributions": 3,
        "expected_min_quotes": 1,
        "expected_social_contain": ["github"],
    },
    {
        "name": "Simon Willison",
        "slug": "simon-willison",
        "role": "Creator of Datasette",
        "org": "",
        "github": "simonw",
        "expected_topics_contain": ["llm"],
        "expected_min_timeline": 5,
        "expected_min_contributions": 3,
        "expected_min_quotes": 1,
        "expected_social_contain": ["github"],
    },
    {
        "name": "Yann LeCun",
        "slug": "yann-lecun",
        "role": "VP & Chief AI Scientist",
        "org": "Meta",
        "github": "",
        "expected_topics_contain": ["deep learning"],
        "expected_min_timeline": 5,
        "expected_min_contributions": 3,
        "expected_min_quotes": 1,
        "expected_social_contain": [],
    },
]


def _assert_structure(research: dict, person: dict) -> None:
    """Structural and semantic assertions on pipeline output."""
    name = person["name"]

    for field in ("slug", "name", "generated_at", "bio", "topics",
                  "timeline", "key_contributions", "quotes", "social", "sources"):
        assert field in research, f"{name}: missing field '{field}'"

    bio = research["bio"]
    assert len(bio) >= 100, f"{name}: bio too short ({len(bio)} chars)"
    assert len(bio) <= 2000, f"{name}: bio too long ({len(bio)} chars)"

    topics = research["topics"]
    assert len(topics) >= 5, f"{name}: too few topics ({len(topics)})"

    topics_lower = [t.lower() for t in topics]
    topics_text = " ".join(topics_lower)
    for expected in person["expected_topics_contain"]:
        assert any(expected.lower() in t for t in topics_lower) or expected.lower() in topics_text, (
            f"{name}: expected topic containing '{expected}' in {topics}"
        )

    timeline = research["timeline"]
    assert len(timeline) >= person["expected_min_timeline"], (
        f"{name}: too few timeline events ({len(timeline)})"
    )
    for event in timeline:
        assert event.get("date"), f"{name}: timeline event missing 'date'"
        assert event.get("event"), f"{name}: timeline event missing 'event'"

    contributions = research["key_contributions"]
    assert len(contributions) >= person["expected_min_contributions"], (
        f"{name}: too few contributions ({len(contributions)})"
    )

    quotes = research["quotes"]
    assert len(quotes) >= person["expected_min_quotes"], (
        f"{name}: too few quotes ({len(quotes)})"
    )
    for q in quotes:
        assert q.get("text"), f"{name}: quote missing 'text'"
        assert q.get("source"), f"{name}: quote missing 'source'"

    social = research["social"]
    for expected_key in person["expected_social_contain"]:
        assert expected_key in social, (
            f"{name}: expected '{expected_key}' in social"
        )

    sources = research["sources"]
    assert len(sources) >= 3, f"{name}: too few sources ({len(sources)})"


def run_full_evals() -> None:
    """Run full pipeline on mock persons, then deepeval GEval metrics."""
    from deepeval import evaluate
    from deepeval.metrics import GEval
    from deepeval.models import DeepEvalBaseLLM
    from deepeval.test_case import LLMTestCase, LLMTestCaseParams
    from langchain_openai import ChatOpenAI

    from .graph import build_person_research_graph
    from .state import PersonResearchState

    # DeepSeek judge
    class DeepSeekJudge(DeepEvalBaseLLM):
        def __init__(self):
            self._model = ChatOpenAI(
                model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
                api_key=os.environ["DEEPSEEK_API_KEY"],
                base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
                temperature=0.0,
            )

        def load_model(self):
            return self._model

        def generate(self, prompt: str, **kwargs) -> str:
            return self._model.invoke(prompt).content

        async def a_generate(self, prompt: str, **kwargs) -> str:
            return (await self._model.ainvoke(prompt)).content

        def get_model_name(self) -> str:
            return os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    judge = DeepSeekJudge()

    # Metrics
    bio_quality_metric = GEval(
        model=judge,
        name="Biography Quality",
        criteria=(
            "The biography must be 3-5 sentences that accurately describe the person's "
            "current role, major achievements, and significance in their field. "
            "It must mention the person's organization if known. "
            "The bio should read as a polished, factual summary — not a generic placeholder. "
            "It must not contain fabricated claims or attribute work to the wrong person."
        ),
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
            LLMTestCaseParams.EXPECTED_OUTPUT,
        ],
        threshold=0.7,
    )

    research_completeness_metric = GEval(
        model=judge,
        name="Research Completeness",
        criteria=(
            "The research profile must be comprehensive and well-sourced. "
            "It should include: a substantive biography (not generic), "
            "at least 5 relevant topics, a timeline with 5+ dated events, "
            "at least 3 key contributions with descriptions and URLs, "
            "and at least 1 real quote with attribution. "
            "Social links should be present where the person is known to have accounts. "
            "Sources must be listed with URLs. "
            "Information should be consistent across sections (timeline events should "
            "correspond to key_contributions, topics should reflect the bio)."
        ),
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.65,
    )

    source_attribution_metric = GEval(
        model=judge,
        name="Source Attribution & Factuality",
        criteria=(
            "Every factual claim in the bio and timeline should be traceable to a listed source. "
            "Quotes must include a source name and URL — never fabricated. "
            "Timeline events should have dates in YYYY-MM format. "
            "URLs in contributions and sources should look like real, plausible URLs "
            "(not made-up domains). "
            "The profile must not attribute achievements of a different person with the same name."
        ),
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.65,
    )

    # Run pipeline
    graph = build_person_research_graph()
    bio_cases: list[LLMTestCase] = []
    completeness_cases: list[LLMTestCase] = []

    for person in MOCK_PERSONS:
        print(f"\n  Running graph: {person['name']} ...")
        init_state: PersonResearchState = {
            "person_name": person["name"],
            "person_slug": person["slug"],
            "person_role": person["role"],
            "person_org": person["org"],
            "person_github": person["github"],
        }
        result = graph.invoke(init_state)

        research = result.get("research", {})
        print(f"    bio: {research.get('bio', '')[:80]}...")
        print(f"    topics: {len(research.get('topics', []))}")
        print(f"    timeline: {len(research.get('timeline', []))}")
        print(f"    contributions: {len(research.get('key_contributions', []))}")
        print(f"    quotes: {len(research.get('quotes', []))}")
        print(f"    sources: {len(research.get('sources', []))}")

        # Phase 1 + 2: hard assertions
        _assert_structure(research, person)

        profile_json = json.dumps(research, indent=2)
        person_input = (
            f"Name: {person['name']}\n"
            f"Role: {person['role']}\n"
            f"Organization: {person['org']}\n"
            f"GitHub: {person['github']}"
        )

        bio_cases.append(LLMTestCase(
            name=f"{person['name']} — Bio Quality",
            input=person_input,
            actual_output=research.get("bio", ""),
            expected_output=(
                f"A 3-5 sentence biography of {person['name']} mentioning their role "
                f"as {person['role']} at {person['org']}. Should cover major achievements, "
                f"current work, and significance in the AI/tech field."
            ),
        ))

        completeness_cases.append(LLMTestCase(
            name=f"{person['name']} — Research Completeness",
            input=person_input,
            actual_output=profile_json,
        ))

    total = len(MOCK_PERSONS)
    print(
        f"\nAll hard structural + semantic assertions passed "
        f"({total} persons verified)."
    )
    print(
        f"Running deepeval metrics: "
        f"{len(bio_cases)} bio, "
        f"{len(completeness_cases)} completeness cases...\n"
    )

    evaluate(
        test_cases=bio_cases,
        metrics=[bio_quality_metric],
    )
    evaluate(
        test_cases=completeness_cases,
        metrics=[research_completeness_metric, source_attribution_metric],
    )


# ═══════════════════════════════════════════════════════════════════════════
# Entry point
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Person research evals")
    parser.add_argument("--slug", help="Run evals for a specific slug only")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show passing evals too")
    parser.add_argument(
        "--full", action="store_true",
        help="Run full pipeline + deepeval GEval (costs API credits)",
    )
    args = parser.parse_args()

    if args.full:
        run_full_evals()
    else:
        passed = run_deterministic_evals(slug=args.slug, verbose=args.verbose)
        sys.exit(0 if passed else 1)
