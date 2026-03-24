"""
Evals for the email outreach pipeline.

Run:
    python -m cli email-outreach --eval
    python -m cli email-outreach --eval --unit-only   (keyword screen only, no LLM)

Three phases:
1. Remote-EU screen — enforces only fully-remote EU hiring posts (or networking) pass
2. Hard assertions — deterministic checks on generated email body
   (no Reply-To lines, no email addresses, no crypto mentions)
3. deepeval GEval — LLM-judged quality (specificity, tone, conciseness)
"""

from dotenv import load_dotenv

load_dotenv()

import json
import os
import re
from unittest.mock import patch

from deepeval import evaluate
from deepeval.metrics import GEval
from deepeval.models import DeepEvalBaseLLM
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from langchain_openai import ChatOpenAI

from .graph import build_email_outreach_graph
from .nodes import _keyword_screen, screen_remote_eu_node

# ---------------------------------------------------------------------------
# DeepSeek judge model
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Phase 1: Remote-EU screen evals — enforce fully-remote-only
# ---------------------------------------------------------------------------

SCREEN_CASES: list[dict] = [
    # === MUST SKIP — hiring posts that are NOT fully-remote EU ===
    {
        "id": "skip-hybrid-berlin-hiring",
        "post_text": (
            "We're hiring a Software Engineer! Hybrid role — 3 days in our "
            "Berlin office, 2 days remote. Great team, competitive salary. "
            "Apply now! #hiring #softwareengineering"
        ),
        "intent": "hiring",
        "company_context": "Company: Acme GmbH, Berlin",
        "expected_relevant": False,
        "reason": "Hybrid is not fully remote",
    },
    {
        "id": "skip-onsite-munich-hiring",
        "post_text": (
            "Exciting opportunity at our Munich HQ! We're looking for a "
            "Senior Backend Engineer to join us on-site. 5 days a week in "
            "our beautiful office. German work permit required. #hiring"
        ),
        "intent": "hiring",
        "company_context": "Company: BayernTech, Munich",
        "expected_relevant": False,
        "reason": "On-site position",
    },
    {
        "id": "skip-us-only-hiring",
        "post_text": (
            "We're growing our engineering team! Fully remote within the US. "
            "Must be authorized to work in the United States. "
            "Great benefits: 401(k), medical, dental, vision. #hiring"
        ),
        "intent": "hiring",
        "company_context": "Company: SF Startup Inc, San Francisco",
        "expected_relevant": False,
        "reason": "US-only with 401k signals",
    },
    {
        "id": "skip-us-work-auth-hiring",
        "post_text": (
            "Join our AI team! Remote position. US work authorization required. "
            "No visa sponsorship available. Competitive salary $150-200k. #hiring"
        ),
        "intent": "hiring",
        "company_context": "Company: AI Labs, USA",
        "expected_relevant": False,
        "reason": "US work authorization requirement",
    },
    {
        "id": "skip-uk-only-hiring",
        "post_text": (
            "We're hiring a Product Manager, fully remote within the UK. "
            "Must have right to work in the United Kingdom. "
            "Join our growing fintech! #hiring #productmanagement"
        ),
        "intent": "hiring",
        "company_context": "Company: LondonFin, UK",
        "expected_relevant": False,
        "reason": "UK-only post-Brexit",
    },
    {
        "id": "skip-worldwide-no-eu-signals",
        "post_text": (
            "We're hiring engineers worldwide! Work from anywhere. "
            "No specific location requirements. Join our distributed team. "
            "#hiring #remote"
        ),
        "intent": "hiring",
        "company_context": "Company: GlobalCo, San Francisco",
        "expected_relevant": False,
        "reason": "Generic worldwide with no EU signals",
    },
    {
        "id": "skip-latam-staffing-hiring",
        "post_text": (
            "Looking for LatAm engineers! We help US startups hire top "
            "nearshore talent from Latin America. Competitive USD salary. "
            "Must be located in LatAm. #hiring #latam"
        ),
        "intent": "hiring",
        "company_context": "Company: NearshoreStaff, Miami",
        "expected_relevant": False,
        "reason": "LatAm staffing — targets Latin America",
    },
    {
        "id": "skip-india-remote-hiring",
        "post_text": (
            "Exciting remote opportunity for engineers in India! "
            "Join our Bangalore-based AI team. Competitive salary in INR. "
            "Remote within India. #hiring #india"
        ),
        "intent": "hiring",
        "company_context": "Company: IndiaAI, Bangalore",
        "expected_relevant": False,
        "reason": "India-only remote position",
    },

    # === MUST PROCEED — hiring posts about fully-remote EU roles ===
    {
        "id": "proceed-remote-eu-hiring",
        "post_text": (
            "We're hiring a Senior AI Engineer! Fully remote, open to "
            "candidates across the EU. Must have EU work authorization. "
            "Exciting LLM work. Apply: careers.example.com #hiring #ai"
        ),
        "intent": "hiring",
        "company_context": "Company: EuroAI, Berlin",
        "expected_relevant": True,
        "reason": "Fully remote + EU work auth",
    },
    {
        "id": "proceed-emea-remote-hiring",
        "post_text": (
            "Join our team! We're looking for a Frontend Developer. "
            "Remote position across EMEA. EU work authorization preferred. "
            "React + TypeScript stack. #hiring #frontend"
        ),
        "intent": "hiring",
        "company_context": "Company: EMEATech, Amsterdam",
        "expected_relevant": True,
        "reason": "EMEA + EU work auth signals",
    },
    {
        "id": "proceed-cet-timezone-hiring",
        "post_text": (
            "Hiring a Data Engineer! Fully remote, must overlap with "
            "CET timezone. European business hours. Our team is "
            "distributed across Europe. #hiring #dataengineering"
        ),
        "intent": "hiring",
        "company_context": "Company: DataEU, Dublin",
        "expected_relevant": True,
        "reason": "CET timezone + European team = EU-eligible",
    },
    {
        "id": "proceed-specific-eu-countries-hiring",
        "post_text": (
            "We're hiring a DevOps Engineer! Remote from Germany, France, "
            "Spain, or Netherlands. Competitive salary in EUR. "
            "Join our infrastructure team. #hiring #devops"
        ),
        "intent": "hiring",
        "company_context": "Company: InfraCo, Paris",
        "expected_relevant": True,
        "reason": "Specific EU countries listed",
    },
    {
        "id": "proceed-europe-remote-hiring",
        "post_text": (
            "Looking for an ML Engineer! Fully remote across Europe. "
            "Work on cutting-edge NLP models. EU passport required. "
            "#hiring #machinelearning"
        ),
        "intent": "hiring",
        "company_context": "Company: NLPLabs, Stockholm",
        "expected_relevant": True,
        "reason": "Europe-wide remote + EU passport required",
    },

    # === MUST PROCEED — non-hiring posts (networking, always pass) ===
    {
        "id": "proceed-knowledge-sharing",
        "post_text": (
            "Just published a blog post about scaling LLM inference to "
            "10k req/s using vLLM + Ray. Some surprising findings about "
            "batch size optimization. Link in comments. #ai #engineering"
        ),
        "intent": "sharing_knowledge",
        "company_context": "Company: AI Startup, San Francisco",
        "expected_relevant": True,
        "reason": "Knowledge sharing — networking opportunity",
    },
    {
        "id": "proceed-celebrating",
        "post_text": (
            "Thrilled to announce we just closed our Series B! "
            "$50M to build the future of AI-powered search. "
            "Amazing team, incredible investors. What a journey! #startup"
        ),
        "intent": "celebrating",
        "company_context": "Company: SearchAI, New York",
        "expected_relevant": True,
        "reason": "Celebrating milestone — networking opportunity",
    },
    {
        "id": "proceed-asking-help",
        "post_text": (
            "Has anyone built a RAG pipeline with LlamaIndex + Postgres? "
            "We're hitting some chunking issues with large PDFs. "
            "Any advice appreciated! #ai #rag"
        ),
        "intent": "asking_for_help",
        "company_context": "",
        "expected_relevant": True,
        "reason": "Asking for help — can offer expertise",
    },
    {
        "id": "proceed-other-general",
        "post_text": (
            "The future of AI engineering is about building systems, "
            "not just models. Context engineering > prompt engineering. "
            "Thoughts? #ai #engineering"
        ),
        "intent": "other",
        "company_context": "",
        "expected_relevant": True,
        "reason": "General thought leadership — networking",
    },
]


def _build_screen_state(case: dict) -> dict:
    """Build a minimal state for screen eval."""
    return {
        "recipient_name": "Test User",
        "recipient_role": "Engineer at TestCo",
        "post_text": case["post_text"],
        "post_url": "",
        "recipient_email": "",
        "tone": "professional",
        "contact_context": "",
        "company_context": case.get("company_context", ""),
        "post_analysis": {
            "topics": [],
            "intent": case["intent"],
            "engagement_hooks": [],
            "key_quotes": [],
        },
        "remote_eu_screen": None,
        "draft": None,
        "final": None,
        "contact_id": None,
    }


# Keyword screen should produce definitive answers for these
_KEYWORD_DEFINITIVE_IDS = {
    "skip-hybrid-berlin-hiring",
    "skip-onsite-munich-hiring",
    "skip-us-only-hiring",
    "skip-us-work-auth-hiring",
    "proceed-remote-eu-hiring",
    "proceed-emea-remote-hiring",
    "proceed-knowledge-sharing",
    "proceed-celebrating",
    "proceed-asking-help",
    "proceed-other-general",
}


def run_screen_unit_tests() -> tuple[int, int]:
    """Keyword screen unit tests. No LLM calls, no DB."""
    print("--- Email Outreach: Remote-EU Keyword Screen Unit Tests ---\n")
    passed = 0
    failed = 0
    escalated = 0

    for case in SCREEN_CASES:
        case_id = case["id"]
        expected = case["expected_relevant"]

        result = _keyword_screen(case["post_text"], case["intent"])

        if result is None:
            if case_id in _KEYWORD_DEFINITIVE_IDS:
                print(f"  FAIL {case_id}: keyword screen returned None (expected definitive)")
                failed += 1
            else:
                print(f"  SKIP {case_id}: escalated to LLM (expected)")
                escalated += 1
            continue

        actual = result["is_relevant"]
        if actual == expected:
            print(f"  PASS {case_id}: {'proceed' if actual else 'skip'} — {result['reason'][:60]}")
            passed += 1
        else:
            print(
                f"  FAIL {case_id}: expected {'proceed' if expected else 'skip'}, "
                f"got {'proceed' if actual else 'skip'}\n"
                f"        reason: {result['reason']}"
            )
            failed += 1

    total = passed + failed
    print(f"\nKeyword screen: {passed}/{total} passed, {escalated} escalated to LLM")
    if failed:
        print(f"  {failed} FAILURES")
    return passed, total


# deepeval metrics for remote-EU screening (lazy-init to avoid import-time failures)
_screen_metric = None


def _get_screen_metric():
    global _screen_metric
    if _screen_metric is None:
        _screen_metric = GEval(
            name="Remote EU Screen Correctness",
            criteria=(
                "The actual_output must correctly gate email generation:\n"
                "- Hiring + fully remote + EU/EEA/EMEA → is_relevant: true\n"
                "- Hiring + hybrid/onsite → is_relevant: false\n"
                "- Hiring + US-only/UK-only → is_relevant: false\n"
                "- Hiring + worldwide with no EU signals → is_relevant: false\n"
                "- Non-hiring (knowledge, celebrating, help) → is_relevant: true\n"
                "The expected_output shows the ground truth."
            ),
            evaluation_params=[
                LLMTestCaseParams.INPUT,
                LLMTestCaseParams.ACTUAL_OUTPUT,
                LLMTestCaseParams.EXPECTED_OUTPUT,
            ],
            threshold=0.7,
            model=DeepSeekJudge(),
        )
    return _screen_metric


def build_screen_test_cases() -> list[LLMTestCase]:
    """Run the full screen node on all cases and build deepeval test cases."""
    cases: list[LLMTestCase] = []
    failures: list[str] = []

    for case in SCREEN_CASES:
        case_id = case["id"]
        expected = case["expected_relevant"]

        state = _build_screen_state(case)
        result_delta = screen_remote_eu_node(state)
        screen = result_delta.get("remote_eu_screen", {})

        actual = screen.get("is_relevant", True)
        reason = screen.get("reason", "")
        work_model = screen.get("work_model", "unknown")
        region = screen.get("region", "unknown")

        status = "proceed" if actual else "skip"
        expected_str = "proceed" if expected else "skip"
        print(f"  {case_id}: {status} [model={work_model}, region={region}] (expected {expected_str})")

        if actual != expected:
            failures.append(
                f"{case_id}: expected is_relevant={expected}, got {actual}\n"
                f"  reason: {reason}"
            )

        input_text = f"Intent: {case['intent']}\nPost: {case['post_text'][:500]}"
        actual_output = (
            f'{{"is_relevant": {str(actual).lower()}, '
            f'"work_model": "{work_model}", '
            f'"region": "{region}", '
            f'"reason": "{reason}"}}'
        )
        expected_output = f'{{"is_relevant": {str(expected).lower()}}}'

        cases.append(
            LLMTestCase(
                input=input_text,
                actual_output=actual_output,
                expected_output=expected_output,
                name=f"{case_id} — {case['reason'][:60]}",
            )
        )

    if failures:
        print(f"\n{'='*60}")
        print(f"SCREEN ASSERTION FAILURES ({len(failures)}):\n")
        for f in failures:
            print(f"  - {f}")
        raise AssertionError(
            f"{len(failures)} screen assertion(s) failed — see output above"
        )

    return cases


# ---------------------------------------------------------------------------
# Phase 2+3: Email quality evals (existing)
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Test fixtures
# ---------------------------------------------------------------------------

EVAL_CASES = [
    {
        "recipient_name": "Sarah Chen",
        "recipient_role": "VP Engineering at Mistral AI",
        "recipient_email": "sarah@mistral.ai",
        "post_text": (
            "Excited to share that we just open-sourced our new mixture-of-experts model! "
            "It achieves state-of-the-art performance on coding benchmarks while being 3x "
            "more efficient than dense models of similar size. The key insight was using "
            "learned routing instead of random token assignment. Paper and weights on HuggingFace."
        ),
        "post_url": "https://linkedin.com/posts/sarah-chen-123",
        "tone": "professional and enthusiastic",
    },
    {
        "recipient_name": "Marcus Weber",
        "recipient_role": "CTO at DeepL",
        "recipient_email": "marcus@deepl.com",
        "post_text": (
            "We're hiring ML engineers for our new real-time translation pipeline. "
            "Looking for people who've worked with transformer architectures at scale. "
            "Fully remote across EU. DM me if interested!"
        ),
        "post_url": "https://linkedin.com/posts/marcus-weber-456",
        "tone": "professional and friendly",
    },
    {
        "recipient_name": "Anya Petrova",
        "recipient_role": "Head of AI at Spotify",
        "recipient_email": "anya@spotify.com",
        "post_text": (
            "Just wrapped up a fascinating project using LLMs to improve our podcast "
            "recommendation engine. The challenge was balancing personalization with "
            "serendipity — users want familiar content but also need to discover new voices. "
            "We found that chain-of-thought prompting helped the model reason about user intent."
        ),
        "post_url": "https://linkedin.com/posts/anya-petrova-789",
        "tone": "warm and curious",
    },
]

# Regex: catches email addresses in body text
_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
_REPLY_TO_RE = re.compile(r"reply\s*to\s*:", re.IGNORECASE)
_CRYPTO_RE = re.compile(r"\b(crypto|defi|blockchain|trading)\b", re.IGNORECASE)


# ---------------------------------------------------------------------------
# Hard assertions
# ---------------------------------------------------------------------------


def _assert_no_reply_to(text: str, label: str):
    assert not _REPLY_TO_RE.search(text), (
        f"[{label}] Email body contains 'Reply to:' — must never appear.\n"
        f"  Body excerpt: {text[:200]}"
    )


def _assert_no_email_address(text: str, label: str):
    match = _EMAIL_RE.search(text)
    assert match is None, (
        f"[{label}] Email body contains email address '{match.group()}' — "
        f"must never embed email addresses in the body.\n"
        f"  Body excerpt: {text[:200]}"
    )


def _assert_no_crypto(text: str, label: str):
    match = _CRYPTO_RE.search(text)
    assert match is None, (
        f"[{label}] Email body mentions '{match.group()}' — crypto/DeFi/blockchain forbidden.\n"
        f"  Body excerpt: {text[:200]}"
    )


def _assert_under_word_limit(text: str, label: str, limit: int = 200):
    word_count = len(text.split())
    assert word_count <= limit, (
        f"[{label}] Email body is {word_count} words (limit: {limit}).\n"
        f"  Body excerpt: {text[:200]}"
    )


# ---------------------------------------------------------------------------
# deepeval metrics
# ---------------------------------------------------------------------------

_quality_metrics = None


def _get_quality_metrics():
    global _quality_metrics
    if _quality_metrics is None:
        judge = DeepSeekJudge()
        _quality_metrics = (
            GEval(
                name="Email Quality",
                criteria=(
                    "The email must: "
                    "1) Reference specific content from the LinkedIn post (not generic). "
                    "2) Have a clear, low-pressure CTA. "
                    "3) Be concise (under 150 words for the body). "
                    "4) Feel personal and genuine, not templated. "
                    "5) NOT contain any email addresses in the body text. "
                    "6) NOT contain any 'Reply to:' line."
                ),
                evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
                threshold=0.7,
                model=judge,
            ),
            GEval(
                name="No Email Address in Body",
                criteria=(
                    "The email body text and HTML must NOT contain any email address "
                    "(like user@domain.com, contact@vadim.blog, etc). "
                    "Email addresses belong in the From/To/Reply-To headers, never in body text. "
                    "Score 1.0 if no email address found, 0.0 if any email address appears."
                ),
                evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
                threshold=1.0,
                model=judge,
            ),
        )
    return _quality_metrics


# ---------------------------------------------------------------------------
# Run pipeline and build test cases
# ---------------------------------------------------------------------------


def _mock_db_lookup(*args, **kwargs):
    return {"contact_context": "No existing contact found", "company_context": "Company not in DB"}


def build_test_cases() -> list[LLMTestCase]:
    graph = build_email_outreach_graph()
    cases = []

    for i, fixture in enumerate(EVAL_CASES):
        label = f"case-{i+1} ({fixture['recipient_name']})"
        print(f"  Running pipeline for {label}...", flush=True)

        # Run the full pipeline (DB lookups may fail in eval env — that's OK)
        result = graph.invoke(fixture)

        final = result.get("final") or result.get("draft")
        assert final, f"[{label}] Pipeline produced no email output"

        text_body = final.get("text", "")
        html_body = final.get("html", "")
        subject = final.get("subject", "")

        # --- Hard assertions (fail fast) ---
        _assert_no_reply_to(text_body, label)
        _assert_no_reply_to(html_body, label)
        _assert_no_email_address(text_body, label)
        _assert_no_email_address(html_body, label)
        _assert_no_crypto(text_body, label)
        _assert_no_crypto(html_body, label)
        _assert_under_word_limit(text_body, label)

        print(f"    Hard assertions passed. Subject: {subject}")

        input_text = (
            f"Recipient: {fixture['recipient_name']} ({fixture['recipient_role']})\n"
            f"Tone: {fixture['tone']}\n\n"
            f"LinkedIn post:\n{fixture['post_text']}"
        )
        actual_output = (
            f"Subject: {subject}\n\n"
            f"Body:\n{text_body}"
        )

        cases.append(
            LLMTestCase(
                input=input_text,
                actual_output=actual_output,
                name=label,
            )
        )

    return cases


def main() -> None:
    """Full eval: remote-EU screen + email quality."""
    # Phase 1: remote-EU keyword screen unit tests
    screen_passed, screen_total = run_screen_unit_tests()

    # Phase 2: full screen eval (keyword + LLM)
    print(f"\n--- Email Outreach: Full Screen Eval (keyword + LLM) ---\n")
    screen_test_cases = build_screen_test_cases()
    print(f"\nAll {len(screen_test_cases)} screen assertions passed.")

    # Phase 3: email quality (body assertions + deepeval)
    print(f"\n--- Email Outreach: Email Quality Eval ---\n")
    quality_test_cases = build_test_cases()
    print(f"\nAll {len(quality_test_cases)} hard body assertions passed.")

    # Phase 4: deepeval metrics for both
    print("Running deepeval metrics...\n")
    evaluate(
        test_cases=screen_test_cases,
        metrics=[_get_screen_metric()],
        run_async=True,
    )
    eq, ne = _get_quality_metrics()
    evaluate(
        test_cases=quality_test_cases,
        metrics=[eq, ne],
        run_async=True,
    )

    # Summary
    skip_cases = [c for c in SCREEN_CASES if not c["expected_relevant"]]
    proceed_cases = [c for c in SCREEN_CASES if c["expected_relevant"]]
    print(f"\n--- Eval Summary ---")
    print(f"  Screen cases: {len(SCREEN_CASES)} ({len(skip_cases)} skip, {len(proceed_cases)} proceed)")
    print(f"  Keyword screen: {screen_passed}/{screen_total}")
    print(f"  Full screen: {len(screen_test_cases)}/{len(SCREEN_CASES)}")
    print(f"  Email quality: {len(quality_test_cases)}/{len(EVAL_CASES)}")


if __name__ == "__main__":
    main()
