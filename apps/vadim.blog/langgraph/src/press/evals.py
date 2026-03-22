"""
press.evals — Journalism quality evaluator for the press pipeline.

Seven GEval metrics that replicate a senior journalist's editorial review:
  1. source_citation        — every factual claim links to a primary source
  2. anti_hallucination     — no facts invented outside the research brief
  3. writing_quality        — clarity, active voice, no filler prose
  4. journalistic_standards — attribution, balance, data context, no hype
  5. seo_alignment          — keywords placed naturally per SEO strategy
  6. structural_completeness — sections, word count, frontmatter, conclusion
  7. lead_quality           — opening hook earns the reader

Configuration:
    DEEPSEEK_API_KEY  — uses DeepSeek as evaluator (recommended)
    EVAL_MODEL        — model name override (default: deepseek-chat)
    OPENAI_API_KEY    — fallback if no DeepSeek key

Usage:
    # Programmatic
    from press.evals import evaluate_article
    result = await evaluate_article(draft, research_brief, seo_strategy)
    print(result.summary())

    # pytest (fast structural tests)
    uv run pytest tests/ -v

    # pytest (LLM evals — requires API key + deepeval)
    uv run pytest evals/ -v -m eval

    # CLI
    press eval --input article.md --research brief.md --seo seo.md
"""

from __future__ import annotations

import asyncio
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

from press import extract_seo_slug, slugify_seo, strip_frontmatter
from press.publisher import parse_frontmatter


# ── Model configuration ────────────────────────────────────────────────────────

def _configure_eval_llm() -> str:
    """Configure the OpenAI-compatible client and return the model name."""
    if dk := os.getenv("DEEPSEEK_API_KEY"):
        if not os.getenv("OPENAI_API_KEY"):
            os.environ["OPENAI_API_KEY"] = dk
        os.environ["OPENAI_BASE_URL"] = "https://api.deepseek.com/v1"
        return os.getenv("EVAL_MODEL", "deepseek-chat")
    return os.getenv("EVAL_MODEL", "gpt-4o-mini")


EVAL_MODEL = _configure_eval_llm()


# ── Graceful import of deepeval ────────────────────────────────────────────────

try:
    from deepeval.metrics import GEval
    from deepeval.test_case import LLMTestCase, LLMTestCaseParams
    _DEEPEVAL_AVAILABLE = True
except ImportError:
    _DEEPEVAL_AVAILABLE = False
    GEval = None  # type: ignore[assignment,misc]
    LLMTestCase = None  # type: ignore[assignment,misc]
    LLMTestCaseParams = None  # type: ignore[assignment,misc]


# ── Evaluation criteria ────────────────────────────────────────────────────────

_SOURCE_CITATION = """
Evaluate whether every factual claim in the article is backed by an inline markdown hyperlink.

Factual claims requiring links: statistics, percentages, benchmark numbers, study results,
quotes, assertions about specific organizations, products, or research findings.

Proper format: [descriptive anchor text](https://url)
Reject: bare URLs, footnote-style citations, "according to a study" without a link.

Score:
  1.0 — All factual claims linked; zero unlinked assertions of fact
  0.8 — >85% linked; 1-2 minor contextual claims lack links
  0.6 — ~75% linked; a few important claims (stats, quotes) lack sources
  0.4 — ~50% linked; notable gaps on statistics or direct quotes
  0.2 — Only a handful of links; most factual assertions are unsupported
  0.0 — No inline hyperlinks; article is assertion-only
"""

_ANTI_HALLUCINATION = """
You are given an article (actual_output) and a research brief (context).

For every factual claim in the article, check whether it appears in the research brief.

A claim is HALLUCINATED if it:
- Is absent from the research brief entirely
- Inflates or distorts a figure from the brief (e.g., brief says 34%, article says 41%)
- Presents a "Needs Verification" item from the brief as an established fact
- Attributes a finding to a study or source not mentioned in the brief
- Invents an organization, survey, or statistic not in the brief

A claim is VALID if it:
- Directly matches a fact in the brief with the same figures and framing
- Is a reasonable summary of brief content without distortion or embellishment
- Is uncontroversial general background that any reader would accept without a source

Score:
  1.0 — No hallucinated claims; every fact traces back to the research brief
  0.8 — 1 claim slightly extends beyond what the brief explicitly states
  0.6 — 2–3 claims overstate or add unsupported detail
  0.3 — Several invented statistics or assertions with no basis in the brief
  0.0 — Major claims are fabricated; article substantially departs from the brief
"""

_WRITING_QUALITY = """
Score the prose quality against a journalist's style checklist. Check each criterion
and deduct for violations:

1. SENTENCE LENGTH: Flag sentences over 25 words. Long, rambling sentences signal unclear thinking.
2. PARAGRAPH LENGTH: No block should exceed 4 sentences. Wall-of-text repels readers.
3. ACTIVE VOICE: "Companies hired 2,400 workers" beats "2,400 workers were hired by companies".
4. SPECIFICITY: "latency dropped 40ms (23%)" > "latency improved significantly". Vague claims = deduct.
5. NO FILLER PHRASES: deduct for "in this article", "it is worth noting", "let's dive into",
   "in today's world", "it goes without saying", "as we all know", "needless to say",
   "in conclusion, we can see that".
6. NO WEASEL WORDS: deduct for "very", "really", "basically", "essentially" as hollow intensifiers.
7. NO UNJUSTIFIED HEDGING: deduct for "may potentially", "could possibly", "might be able to"
   where a direct statement is clearly warranted by the evidence.
8. SECTION LEADS: Each section should open with a specific claim or finding, not a vague setup.

Score:
  1.0 — Publication-ready: clean, specific, active voice, zero filler
  0.8 — Strong prose with 1–2 minor issues
  0.6 — Adequate but 3–4 style violations (passive clusters, occasional filler)
  0.4 — Multiple writing problems requiring editorial revision
  0.2 — Significant quality issues throughout; prose feels AI-generated
  0.0 — Filler-heavy, passive throughout, generic; reads as boilerplate
"""

_JOURNALISTIC_STANDARDS = """
Evaluate adherence to these six journalistic principles:

1. INVERTED PYRAMID: The most important finding leads. A reader who stops at paragraph 2
   should understand the article's main claim. Don't bury the lede under background.

2. NAMED ATTRIBUTION: Claims cite named sources, not vague authority.
   Bad: "research shows", "experts say", "according to a study"
   Good: "[GitLab's 2023 Remote Work Report](url) found that..." or "[Jane Smith, CTO at Acme](url) said..."

3. BALANCE: The article acknowledges counterarguments or limitations. It presents the
   strongest case against its own thesis and explains why the evidence still holds.

4. DATA CONTEXT: Numbers include comparison, scale, or trend.
   Bad: "34% of workers prefer remote"
   Good: "34% of workers prefer fully remote work, up from 22% in 2020 ([source](url))"

5. HONEST SCOPE: "The data covers US knowledge workers 2020–2024" rather than
   "globally, the industry shows…". Scope limitations are stated explicitly.

6. NO HYPE: Specific numbers speak for themselves. Deduct for "revolutionary",
   "game-changing", "explosive growth", "unprecedented", "transformative" unless
   backed by specific data demonstrating that scale.

Score:
  1.0 — All six principles met; publishable in a quality news outlet
  0.8 — Five principles met; 1 minor lapse (e.g., one vague attribution)
  0.6 — Four principles met; balance missing or some numbers lack context
  0.4 — Three or fewer principles met; multiple vague attributions or hype
  0.2 — Surface-level adherence only
  0.0 — Reads as advocacy or marketing; no journalistic standards met
"""

_SEO_ALIGNMENT = """
The article (actual_output) should follow the SEO strategy (context).

Check all seven:
1. PRIMARY KEYWORD in H1 headline — exact match or close variant required
2. PRIMARY KEYWORD in first 100 words of body — must appear naturally
3. SECONDARY KEYWORDS in H2 headings — should cover most recommended sections
4. META DESCRIPTION in frontmatter — must be present and 150–160 characters
5. TITLE TAG in frontmatter — matches or closely follows the SEO strategy's recommendation
6. NATURAL INTEGRATION — keywords read fluently; obvious stuffing or awkward repetition = deduct
7. URL SLUG — the SEO strategy must contain a "URL Slug" recommendation that: (a) starts with
   or contains the primary keyword, (b) is 3–6 hyphenated words, (c) contains no English stop
   words (the, a, an, is, are, for, of, to, in, on, at, by, with, etc.). If the article
   frontmatter includes a `slug:` field, it should match or closely follow the recommended slug.

Score:
  1.0 — Strategy followed precisely; all 7 checks pass including well-formed URL slug
  0.8 — Primary keyword correct; secondary keywords mostly present; URL slug present; 1 minor gap
  0.6 — Primary keyword in H1 but missing from body, or H2s diverge, or URL slug missing
  0.4 — Partially follows strategy; meta description missing or wrong length; no URL slug
  0.2 — Significant deviations from the SEO strategy
  0.0 — Article ignores the SEO strategy entirely
"""

_STRUCTURAL_COMPLETENESS = """
Evaluate structural completeness for a journalism article:

Required elements:
1. FRONTMATTER: Contains title, description, date, tags, status fields (YAML block between ---)
2. H1 HEADLINE: Single compelling headline immediately after frontmatter
3. OPENING: 1–2 paragraphs before the first H2 section that establish the story and hook
4. H2 SECTIONS: At least 4 substantive sections with descriptive headings
5. COUNTERARGUMENT: At least one section or paragraph addressing opposing views or limitations
6. WORD COUNT: Approximately 1200–1800 words (estimate from total output length)
7. CONCLUSION: Ends with implications, call to action, or clear takeaway — not trailing off
8. LOGICAL FLOW: Sections connect; no abrupt topic jumps; transitions link ideas

Score:
  1.0 — All 8 elements present; logical flow throughout
  0.8 — 7 of 8 elements; 1 minor omission (e.g., no counterargument section)
  0.6 — 5–6 elements present; missing conclusion or under word count
  0.4 — 4 or fewer elements; structural gaps impede readability
  0.2 — Basic skeleton only; missing most structural requirements
  0.0 — No discernible structure; disorganized content
"""

_LEAD_QUALITY = """
Evaluate the quality of the article's opening (the text provided as actual_output,
which is the first 2–3 paragraphs before any H2 section).

A great journalistic lead:
1. IMMEDIACY: Opens with the most surprising or specific finding — not scene-setting or context dump
2. SPECIFICITY: Contains a concrete claim or data point, not vague statements like
   "many companies are struggling with productivity"
3. NEWS HOOK: Signals immediately why this matters now, to whom, and what the stakes are
4. NO CLICHÉS: Deduct for "In today's world", "With the rise of", "In an era where",
   "It's no secret that", "Everyone knows", "We live in a time when",
   "The landscape is changing", "More important than ever"
5. NO GENERIC AI OPENER: Deduct for "In this article, I will explore...",
   "In this post, we'll cover...", "Today we're going to look at..."
6. CREATES PULL: After reading the lead, a reader should have a clear reason to continue

Score:
  1.0 — Exceptional: specific, immediate, surprising, creates irresistible pull
  0.8 — Good: specific claim, relevant, minimal clichés
  0.6 — Adequate: correct format but misses the most compelling angle or slightly generic
  0.4 — Weak: starts with context/background before the key insight; some clichés
  0.2 — Very weak: pure scene-setting or context dump with no hook
  0.0 — Generic opener with no journalistic value; could apply to any article on any topic
"""


# ── Text helpers ───────────────────────────────────────────────────────────────

def extract_lead(article: str, max_chars: int = 700) -> str:
    """Return the opening paragraph(s) after frontmatter and H1, before first H2."""
    body = strip_frontmatter(article)
    lines = body.split("\n")
    content_lines: list[str] = []
    skipped_h1 = False
    for line in lines:
        if not skipped_h1 and line.startswith("# ") and not line.startswith("## "):
            skipped_h1 = True
            continue
        content_lines.append(line)
    body = "\n".join(content_lines).strip()
    h2 = re.search(r"^##\s", body, re.MULTILINE)
    lead = body[: h2.start()].strip() if h2 else body
    return lead[:max_chars]


def word_count(text: str) -> int:
    return len(text.split())


# ── Result types ───────────────────────────────────────────────────────────────

@dataclass
class MetricResult:
    name: str
    score: float
    passed: bool
    reason: str
    threshold: float


@dataclass
class ArticleEvalResult:
    metrics: dict[str, MetricResult] = field(default_factory=dict)

    @property
    def overall_score(self) -> float:
        if not self.metrics:
            return 0.0
        return sum(m.score for m in self.metrics.values()) / len(self.metrics)

    @property
    def passed_all(self) -> bool:
        return all(m.passed for m in self.metrics.values())

    @property
    def failed_metrics(self) -> list[str]:
        return [name for name, m in self.metrics.items() if not m.passed]

    def summary(self) -> str:
        verdict = "PASS" if self.passed_all else "FAIL"
        lines = [
            f"Overall: {self.overall_score:.2f} [{verdict}]",
            "",
        ]
        for name, m in sorted(self.metrics.items()):
            status = "✓" if m.passed else "✗"
            lines.append(
                f"  {status} {name:<28} {m.score:.2f}  (min {m.threshold:.2f})"
            )
        if self.failed_metrics:
            lines += ["", "Failed metrics:"]
            for name in self.failed_metrics:
                reason = self.metrics[name].reason
                short = (reason[:120] + "…") if len(reason) > 120 else reason
                lines.append(f"  - {name}: {short}")
        return "\n".join(lines)

    def to_dict(self) -> dict:
        return {
            "overall_score": round(self.overall_score, 4),
            "passed_all": self.passed_all,
            "metrics": {
                name: {
                    "score": round(m.score, 4),
                    "passed": m.passed,
                    "reason": m.reason,
                    "threshold": m.threshold,
                }
                for name, m in self.metrics.items()
            },
        }


# ── Metric factory ─────────────────────────────────────────────────────────────

# (name, criteria, evaluation_params, threshold)
_METRIC_SPECS: list[tuple[str, str, list, float]] = [
    (
        "source_citation",
        _SOURCE_CITATION,
        ["ACTUAL_OUTPUT"],
        0.7,
    ),
    (
        "anti_hallucination",
        _ANTI_HALLUCINATION,
        ["ACTUAL_OUTPUT", "CONTEXT"],
        0.7,
    ),
    (
        "writing_quality",
        _WRITING_QUALITY,
        ["ACTUAL_OUTPUT"],
        0.6,
    ),
    (
        "journalistic_standards",
        _JOURNALISTIC_STANDARDS,
        ["ACTUAL_OUTPUT"],
        0.7,
    ),
    (
        "seo_alignment",
        _SEO_ALIGNMENT,
        ["ACTUAL_OUTPUT", "CONTEXT"],
        0.6,
    ),
    (
        "structural_completeness",
        _STRUCTURAL_COMPLETENESS,
        ["ACTUAL_OUTPUT"],
        0.7,
    ),
    (
        "lead_quality",
        _LEAD_QUALITY,
        ["ACTUAL_OUTPUT"],
        0.6,
    ),
]


def _make_metrics(model: str) -> dict[str, tuple[object, float]]:
    """Build all GEval metric instances. Raises ImportError if deepeval is missing."""
    if not _DEEPEVAL_AVAILABLE:
        raise ImportError(
            "deepeval is required for LLM evals. "
            "Install it with: uv add deepeval  (or: pip install 'press[eval]')"
        )
    result: dict[str, tuple[object, float]] = {}
    for name, criteria, param_names, threshold in _METRIC_SPECS:
        params = [getattr(LLMTestCaseParams, p) for p in param_names]
        metric = GEval(
            name=name.replace("_", " ").title(),
            criteria=criteria,
            evaluation_params=params,
            model=model,
            async_mode=True,
        )
        result[name] = (metric, threshold)
    return result


# ── Core evaluation functions ──────────────────────────────────────────────────

async def evaluate_article(
    draft: str,
    research_brief: str = "",
    seo_strategy: str = "",
    model: str = EVAL_MODEL,
    metrics_to_run: list[str] | None = None,
) -> ArticleEvalResult:
    """
    Run journalism quality evals on a draft article.

    Args:
        draft:           Full markdown article (including frontmatter)
        research_brief:  Research brief the article was based on
        seo_strategy:    SEO strategy document
        model:           LLM model for evaluation (default: EVAL_MODEL env var)
        metrics_to_run:  Subset of metric names; runs all if None

    Returns:
        ArticleEvalResult with per-metric scores, pass/fail, and reasons
    """
    all_metrics = _make_metrics(model)
    if metrics_to_run:
        all_metrics = {k: v for k, v in all_metrics.items() if k in metrics_to_run}

    lead = extract_lead(draft)

    def _case_for(name: str) -> object:
        if name == "anti_hallucination":
            return LLMTestCase(
                input="Evaluate the article for hallucinated claims against the research brief.",
                actual_output=draft,
                context=[research_brief] if research_brief else ["(no research brief provided)"],
            )
        if name == "seo_alignment":
            return LLMTestCase(
                input="Evaluate the article's SEO alignment against the strategy.",
                actual_output=draft,
                context=[seo_strategy] if seo_strategy else ["(no SEO strategy provided)"],
            )
        if name == "lead_quality":
            return LLMTestCase(
                input="Evaluate the quality of this article's opening paragraph(s).",
                actual_output=lead,
            )
        return LLMTestCase(
            input="Evaluate the journalism quality of this article.",
            actual_output=draft,
        )

    async def _run_one(name: str, metric: object, threshold: float) -> MetricResult:
        case = _case_for(name)
        try:
            await metric.a_measure(case)  # type: ignore[union-attr]
            score: float = metric.score if metric.score is not None else 0.0  # type: ignore[union-attr]
            return MetricResult(
                name=name,
                score=score,
                passed=score >= threshold,
                reason=metric.reason or "",  # type: ignore[union-attr]
                threshold=threshold,
            )
        except Exception as exc:
            return MetricResult(
                name=name,
                score=0.0,
                passed=False,
                reason=f"Evaluation error: {exc}",
                threshold=threshold,
            )

    tasks = [
        _run_one(name, metric, threshold)
        for name, (metric, threshold) in all_metrics.items()
    ]
    results = await asyncio.gather(*tasks)
    return ArticleEvalResult(metrics={r.name: r for r in results})


def evaluate_article_sync(
    draft: str,
    research_brief: str = "",
    seo_strategy: str = "",
    model: str = EVAL_MODEL,
    metrics_to_run: list[str] | None = None,
) -> ArticleEvalResult:
    """Synchronous wrapper around evaluate_article."""
    return asyncio.run(
        evaluate_article(draft, research_brief, seo_strategy, model, metrics_to_run)
    )


async def evaluate_file(
    article_path: Path,
    research_path: Optional[Path] = None,
    seo_path: Optional[Path] = None,
    model: str = EVAL_MODEL,
    metrics_to_run: list[str] | None = None,
) -> ArticleEvalResult:
    """Evaluate a markdown article file, optionally with research brief and SEO strategy."""
    draft = article_path.read_text()
    brief = research_path.read_text() if research_path and research_path.exists() else ""
    seo = seo_path.read_text() if seo_path and seo_path.exists() else ""
    return await evaluate_article(draft, brief, seo, model, metrics_to_run)


# ── Publish integrity validation ───────────────────────────────────────────────

def validate_published_output(md: str) -> list[str]:
    """Check published markdown for structural and frontmatter issues.

    Returns a list of problem descriptions. Empty list = clean.
    More comprehensive than publisher.validate_before_publish — use this
    for post-publish audits and tests.
    """
    issues: list[str] = []
    stripped = md.lstrip()

    if not stripped.startswith("---"):
        issues.append("missing_frontmatter: no YAML frontmatter block found")
        return issues

    delimiter_lines = re.findall(r"^---\s*$", stripped, re.MULTILINE)
    if len(delimiter_lines) > 2:
        issues.append(
            f"double_frontmatter: found {len(delimiter_lines)} '---' delimiters, expected 2"
        )

    meta, body = parse_frontmatter(md)
    if not meta:
        issues.append("malformed_frontmatter: could not parse YAML frontmatter")
        return issues

    title = meta.get("title", "")
    if not title or len(str(title)) < 10:
        issues.append(f"bad_title: '{title}' is too short or missing")

    desc = str(meta.get("description", ""))
    if not desc or desc.strip() in ("", "---") or len(desc) < 20:
        issues.append(f"bad_description: '{desc}' is not a meaningful summary")

    tags = meta.get("tags", [])
    if isinstance(tags, list) and len(tags) >= 4:
        slug_like = [t for t in tags if isinstance(t, str) and " " not in t and t == t.lower()]
        if len(slug_like) == len(tags):
            issues.append(
                f"slug_word_tags: tags {tags} look like slug fragments, not topic tags"
            )

    date_val = meta.get("date")
    if not date_val:
        issues.append("missing_date: no date in frontmatter")
    else:
        try:
            from datetime import datetime, timedelta
            dt = datetime.strptime(str(date_val), "%Y-%m-%d")
            if dt < datetime.now() - timedelta(days=7):
                issues.append(
                    f"stale_date: date {date_val} is more than 7 days old — "
                    "likely copied from source article instead of publish date"
                )
        except ValueError:
            pass

    inline_links = re.findall(r"\[.+?\]\(https?://[^)]+\)", body)
    if len(inline_links) == 0:
        issues.append(
            "no_inline_links: article body has zero markdown hyperlinks — "
            "every factual claim should link to its source"
        )
    elif len(inline_links) < 3:
        issues.append(
            f"few_inline_links: only {len(inline_links)} link(s) found — "
            "a well-sourced article needs at least 3 inline references"
        )

    return issues
