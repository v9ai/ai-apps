"""
evals.py — Journalism quality evaluator for the press pipeline.

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
    from evals import evaluate_article
    result = await evaluate_article(draft, research_brief, seo_strategy)
    print(result.summary())

    # pytest — fast structural tests only
    uv run pytest evals.py -v

    # pytest — include slow LLM eval tests
    uv run pytest evals.py -v -m eval

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

try:
    import pytest
    _PYTEST_AVAILABLE = True
except ImportError:
    import types as _types
    pytest = _types.SimpleNamespace(  # type: ignore[assignment]
        fixture=lambda *a, **kw: (lambda f: f),
        mark=_types.SimpleNamespace(eval=lambda f: f),
    )
    _PYTEST_AVAILABLE = False

from dotenv import load_dotenv

load_dotenv()


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

Check all six:
1. PRIMARY KEYWORD in H1 headline — exact match or close variant required
2. PRIMARY KEYWORD in first 100 words of body — must appear naturally
3. SECONDARY KEYWORDS in H2 headings — should cover most recommended sections
4. META DESCRIPTION in frontmatter — must be present and 150–160 characters
5. TITLE TAG in frontmatter — matches or closely follows the SEO strategy's recommendation
6. NATURAL INTEGRATION — keywords read fluently; obvious stuffing or awkward repetition = deduct

Score:
  1.0 — Strategy followed precisely; all 6 checks pass
  0.8 — Primary keyword correct; secondary keywords mostly present; 1 minor gap
  0.6 — Primary keyword in H1 but missing from body, or H2s diverge from strategy
  0.4 — Partially follows strategy; meta description missing or wrong length
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

def strip_frontmatter(md: str) -> str:
    """Remove YAML frontmatter block from markdown, return body only."""
    stripped = md.lstrip()
    if stripped.startswith("---"):
        parts = stripped.split("---", 2)
        if len(parts) >= 3:
            return parts[2].strip()
    return md.strip()


def extract_lead(article: str, max_chars: int = 700) -> str:
    """Return the opening paragraph(s) after frontmatter and H1, before first H2."""
    body = strip_frontmatter(article)
    # Drop the single H1 line
    lines = body.split("\n")
    content_lines: list[str] = []
    skipped_h1 = False
    for line in lines:
        if not skipped_h1 and line.startswith("# ") and not line.startswith("## "):
            skipped_h1 = True
            continue
        content_lines.append(line)
    body = "\n".join(content_lines).strip()
    # Truncate at first H2
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
) -> ArticleEvalResult:
    """Evaluate a markdown article file, optionally with research brief and SEO strategy."""
    draft = article_path.read_text()
    brief = research_path.read_text() if research_path and research_path.exists() else ""
    seo = seo_path.read_text() if seo_path and seo_path.exists() else ""
    return await evaluate_article(draft, brief, seo, model)


# ── Pytest fixtures & golden samples ──────────────────────────────────────────

GOOD_ARTICLE = """\
---
title: "Remote Work Productivity: What the Data Actually Shows"
description: "Four large-scale studies find remote workers are 13–20% more productive than on-site peers—but the effect disappears for junior engineers without mentorship infrastructure."
date: 2026-03-16
tags: [remote-work, productivity, engineering-teams]
status: draft
---

# Remote Work Productivity: What the Data Actually Shows

A [Stanford study of 16,000 employees](https://nber.org/papers/w18871) found a 13% productivity
gain for remote workers—but that headline number conceals a split: senior engineers improved 18%,
while engineers with less than two years of experience showed no gain at all.

The nuance matters because most "remote work is productive" arguments cite aggregate studies.
Once you break the data down by seniority and role type, the picture changes significantly.

## What the Large-Scale Studies Find

[Microsoft's 2022 Work Trend Index](https://microsoft.com/en-us/worklab/work-trend-index/great-expectations)
surveyed 31,000 workers across 31 countries. Remote and hybrid workers reported equivalent output
on individual tasks, but 43% said collaboration had become harder.

[GitLab's 2023 Global DevSecOps Survey](https://about.gitlab.com/developer-survey/) found
that 56% of remote developers shipped more code than their in-office counterparts, measured
by merged pull requests per quarter.

## Where Remote Work Fails Junior Engineers

The Stanford data shows the productivity gap is not about remote work itself—it's about
access to informal mentorship. In-office environments provide what researchers call
"hallway learning": overheard conversations, shoulder-taps, and ambient knowledge transfer.

A [2023 paper from the National Bureau of Economic Research](https://nber.org/papers/w31515)
found that junior engineers' career advancement slowed 25% in fully remote settings,
measured by time-to-promotion over three years.

## The Infrastructure Gap

Companies that close the productivity gap share three practices:
- Structured pairing programs for engineers in their first two years
- Async documentation culture (decisions recorded, not just discussed)
- Explicit on-call rotations that include junior engineers

[Basecamp's *Shape Up* methodology](https://basecamp.com/shapeup) documents how async-first
teams maintain productivity without real-time coercion—a model that works specifically because
documentation is a first-class deliverable, not an afterthought.

## What the Critics Get Right

The case for in-person work is strongest for specific roles: onboarding, crisis response,
and highly interdependent design work. A [2022 MIT study](https://mitsloan.mit.edu/ideas-made-to-matter/remote-work-may-slow-down-junior-employees)
found that new employees took 20% longer to reach full productivity in fully remote settings.

The debate is not remote vs. in-person—it's about matching work mode to task type.

## Practical Takeaways

If you are a team lead deciding on a remote policy, the data suggests:
1. **Senior engineers**: remote works; trust the data
2. **Junior engineers (<2 years)**: require in-person or structured pairing, not just Slack access
3. **Measure output, not hours**: pull request volume, shipped features, and incident response time
   are more predictive than seat time

The strongest predictor of remote productivity is not the policy itself—it is whether the
company has invested in async communication infrastructure before mandating it.
"""

BAD_ARTICLE = """\
# Remote Work

In today's rapidly evolving digital landscape, remote work has become increasingly important
for many organizations. It is worth noting that this is a very significant topic that affects
a lot of people in today's world. As we all know, the pandemic changed everything.

## Remote Work is Great

Remote work is really amazing because it allows workers to work from home. Many studies
have shown that remote workers are more productive. Experts say this is due to fewer
distractions in the home environment. Companies are basically seeing huge improvements
in their performance metrics.

The data suggests that remote work may potentially be one of the most transformative
shifts in how work gets done. It's an absolutely revolutionary development.

## Challenges

Of course, there are also some challenges. Some people find it hard to work from home.
Communication can be difficult. Various stakeholders have expressed concerns about
collaboration and team cohesion.

## Conclusion

In conclusion, remote work is a very interesting topic that we should all think about.
It is essentially changing the way we work. The future of work will likely involve
some combination of remote and in-person arrangements going forward.
"""

SAMPLE_RESEARCH_BRIEF = """\
# Research Brief: Remote Work Productivity

## Summary
Large-scale studies show a 13% productivity gain for remote workers overall, with senior
engineers outperforming (+18%) and junior engineers showing no gain. The primary variable
is access to mentorship, not the work location itself.

## Key Facts
- Stanford study of 16,000 employees: 13% overall productivity gain — Source: https://nber.org/papers/w18871
- Microsoft 2022 Work Trend Index, 31,000 workers, 31 countries: 43% said collaboration harder — Source: https://microsoft.com/en-us/worklab/work-trend-index/great-expectations
- GitLab 2023 DevSecOps Survey: 56% of remote developers shipped more code — Source: https://about.gitlab.com/developer-survey/
- NBER 2023 paper: junior engineers' career advancement slowed 25% in fully remote settings — Source: https://nber.org/papers/w31515
- MIT 2022 study: new employees 20% longer to reach full productivity in fully remote settings — Source: https://mitsloan.mit.edu/ideas-made-to-matter/remote-work-may-slow-down-junior-employees

## Needs Verification
- Claims about Basecamp Shape Up methodology outcomes (no independent study; self-reported)
"""

SAMPLE_SEO_STRATEGY = """\
# SEO Strategy: Remote Work Productivity

## Target Keywords
| Keyword | Volume | Priority |
|---|---|---|
| remote work productivity | high | P1 |
| remote work productivity data | medium | P2 |
| remote workers vs in-office productivity | medium | P2 |

## Recommended Structure
- **Format**: data-driven analysis
- **Word count**: 1400–1800 words
- **Title tag**: "Remote Work Productivity: What the Data Actually Shows"
- **Meta description**: "Four large-scale studies find remote workers are 13–20% more productive—but the effect disappears for junior engineers without mentorship infrastructure."
- **H1**: Remote Work Productivity: What the Data Actually Shows
- **H2s**:
  1. What the Large-Scale Studies Find
  2. Where Remote Work Fails Junior Engineers
  3. The Infrastructure Gap
  4. What the Critics Get Right
  5. Practical Takeaways
"""


# ── Pytest: fast structural tests (no LLM) ────────────────────────────────────

class TestHelpers:
    """Text manipulation helpers — zero LLM calls."""

    def test_strip_frontmatter_removes_yaml_block(self):
        md = "---\ntitle: Test\n---\n\n# Hello\n\nBody text."
        body = strip_frontmatter(md)
        assert body.startswith("# Hello")
        assert "title: Test" not in body

    def test_strip_frontmatter_passthrough_no_frontmatter(self):
        md = "# Hello\n\nBody text."
        assert strip_frontmatter(md) == md.strip()

    def test_extract_lead_stops_at_h2(self):
        md = "---\ntitle: T\n---\n# H1\n\nLead paragraph.\n\n## Section\n\nBody."
        lead = extract_lead(md)
        assert "Lead paragraph." in lead
        assert "## Section" not in lead
        assert "Body." not in lead

    def test_extract_lead_skips_h1(self):
        md = "---\ntitle: T\n---\n# The Title\n\nFirst para.\n\n## Next\n\nMore."
        lead = extract_lead(md)
        assert "# The Title" not in lead
        assert "First para." in lead

    def test_extract_lead_respects_max_chars(self):
        body = "x " * 1000
        md = f"---\ntitle: T\n---\n# H1\n\n{body}"
        lead = extract_lead(md, max_chars=100)
        assert len(lead) <= 100

    def test_word_count_basic(self):
        assert word_count("one two three") == 3

    def test_word_count_empty(self):
        assert word_count("") == 0


class TestArticleEvalResult:
    """ArticleEvalResult data class behaviour — no LLM calls."""

    def _make_result(self, scores: dict[str, float], threshold: float = 0.7) -> ArticleEvalResult:
        return ArticleEvalResult(
            metrics={
                name: MetricResult(name=name, score=score, passed=score >= threshold,
                                   reason="", threshold=threshold)
                for name, score in scores.items()
            }
        )

    def test_overall_score_is_mean(self):
        r = self._make_result({"a": 0.8, "b": 0.6})
        assert abs(r.overall_score - 0.7) < 0.001

    def test_overall_score_empty(self):
        assert ArticleEvalResult().overall_score == 0.0

    def test_passed_all_true(self):
        r = self._make_result({"a": 0.9, "b": 0.8})
        assert r.passed_all is True

    def test_passed_all_false(self):
        r = self._make_result({"a": 0.9, "b": 0.3})
        assert r.passed_all is False

    def test_failed_metrics_correct(self):
        r = self._make_result({"a": 0.9, "b": 0.3, "c": 0.1})
        assert set(r.failed_metrics) == {"b", "c"}

    def test_summary_contains_verdict(self):
        r = self._make_result({"a": 0.9})
        summary = r.summary()
        assert "PASS" in summary or "FAIL" in summary

    def test_summary_shows_check_marks(self):
        r = self._make_result({"good": 0.9, "bad": 0.3})
        summary = r.summary()
        assert "✓" in summary
        assert "✗" in summary

    def test_to_dict_structure(self):
        r = self._make_result({"source_citation": 0.85})
        d = r.to_dict()
        assert "overall_score" in d
        assert "passed_all" in d
        assert "metrics" in d
        assert "source_citation" in d["metrics"]
        assert "score" in d["metrics"]["source_citation"]
        assert "reason" in d["metrics"]["source_citation"]

    def test_to_dict_scores_rounded(self):
        r = self._make_result({"a": 1 / 3})
        d = r.to_dict()
        # score should be rounded, not 0.3333333...
        assert len(str(d["metrics"]["a"]["score"])) <= 8


class TestMetricSpecs:
    """Validate metric spec structure — no LLM calls."""

    def test_all_seven_metrics_defined(self):
        names = {spec[0] for spec in _METRIC_SPECS}
        expected = {
            "source_citation", "anti_hallucination", "writing_quality",
            "journalistic_standards", "seo_alignment", "structural_completeness",
            "lead_quality",
        }
        assert names == expected

    def test_thresholds_in_valid_range(self):
        for name, _, _, threshold in _METRIC_SPECS:
            assert 0.0 <= threshold <= 1.0, f"{name}: threshold {threshold} out of range"

    def test_criteria_non_empty(self):
        for name, criteria, _, _ in _METRIC_SPECS:
            assert criteria.strip(), f"{name}: empty criteria"

    def test_criteria_minimum_length(self):
        """Each criteria string should be substantive (>100 chars)."""
        for name, criteria, _, _ in _METRIC_SPECS:
            assert len(criteria) >= 100, f"{name}: criteria too short ({len(criteria)} chars)"

    def test_anti_hallucination_uses_context_param(self):
        for name, _, params, _ in _METRIC_SPECS:
            if name == "anti_hallucination":
                assert "CONTEXT" in params, "anti_hallucination must use CONTEXT param"

    def test_seo_alignment_uses_context_param(self):
        for name, _, params, _ in _METRIC_SPECS:
            if name == "seo_alignment":
                assert "CONTEXT" in params, "seo_alignment must use CONTEXT param"


class TestGoldenSamples:
    """Validate the test fixture content — no LLM calls."""

    def test_good_article_has_frontmatter(self):
        assert GOOD_ARTICLE.lstrip().startswith("---")

    def test_good_article_has_inline_links(self):
        assert re.search(r"\[.+?\]\(https?://", GOOD_ARTICLE), "Good article has no inline links"

    def test_good_article_has_h2_sections(self):
        h2s = re.findall(r"^##\s.+", GOOD_ARTICLE, re.MULTILINE)
        assert len(h2s) >= 4, f"Good article has only {len(h2s)} H2 sections"

    def test_good_article_word_count_in_range(self):
        body = strip_frontmatter(GOOD_ARTICLE)
        wc = word_count(body)
        assert 300 < wc < 3000, f"Good article word count {wc} out of expected range"

    def test_bad_article_has_no_links(self):
        links = re.findall(r"\[.+?\]\(https?://", BAD_ARTICLE)
        assert len(links) == 0, "Bad article should have no inline links (it's the negative fixture)"

    def test_bad_article_contains_filler_phrases(self):
        fillers = ["in today's", "as we all know", "it is worth noting", "in conclusion"]
        found = [f for f in fillers if f in BAD_ARTICLE.lower()]
        assert len(found) >= 2, f"Bad article should have filler phrases; found: {found}"

    def test_research_brief_has_key_facts(self):
        assert "## Key Facts" in SAMPLE_RESEARCH_BRIEF
        assert "Stanford" in SAMPLE_RESEARCH_BRIEF

    def test_seo_strategy_has_primary_keyword(self):
        assert "remote work productivity" in SAMPLE_SEO_STRATEGY.lower()


# ── Pytest: LLM eval tests (slow — run with -m eval) ──────────────────────────

@pytest.mark.eval
class TestLLMEvalGoodArticle:
    """
    Verify that a well-written article scores above thresholds.
    Requires DEEPSEEK_API_KEY or OPENAI_API_KEY.
    Run with: uv run pytest evals.py -v -m eval
    """

    @pytest.fixture(scope="class")
    def good_result(self) -> ArticleEvalResult:
        return evaluate_article_sync(
            GOOD_ARTICLE,
            research_brief=SAMPLE_RESEARCH_BRIEF,
            seo_strategy=SAMPLE_SEO_STRATEGY,
        )

    def test_source_citation_passes(self, good_result):
        m = good_result.metrics["source_citation"]
        assert m.score >= 0.7, f"source_citation {m.score:.2f}: {m.reason}"

    def test_writing_quality_passes(self, good_result):
        m = good_result.metrics["writing_quality"]
        assert m.score >= 0.6, f"writing_quality {m.score:.2f}: {m.reason}"

    def test_journalistic_standards_passes(self, good_result):
        m = good_result.metrics["journalistic_standards"]
        assert m.score >= 0.6, f"journalistic_standards {m.score:.2f}: {m.reason}"

    def test_structural_completeness_passes(self, good_result):
        m = good_result.metrics["structural_completeness"]
        assert m.score >= 0.6, f"structural_completeness {m.score:.2f}: {m.reason}"

    def test_lead_quality_passes(self, good_result):
        m = good_result.metrics["lead_quality"]
        assert m.score >= 0.6, f"lead_quality {m.score:.2f}: {m.reason}"

    def test_anti_hallucination_passes(self, good_result):
        m = good_result.metrics["anti_hallucination"]
        assert m.score >= 0.6, f"anti_hallucination {m.score:.2f}: {m.reason}"

    def test_overall_score_above_threshold(self, good_result):
        assert good_result.overall_score >= 0.65, (
            f"Good article overall {good_result.overall_score:.2f}\n{good_result.summary()}"
        )


@pytest.mark.eval
class TestLLMEvalBadArticle:
    """
    Verify that a poorly-written article fails key metrics.
    Requires DEEPSEEK_API_KEY or OPENAI_API_KEY.
    """

    @pytest.fixture(scope="class")
    def bad_result(self) -> ArticleEvalResult:
        return evaluate_article_sync(
            BAD_ARTICLE,
            metrics_to_run=["source_citation", "writing_quality", "journalistic_standards"],
        )

    def test_source_citation_fails(self, bad_result):
        m = bad_result.metrics["source_citation"]
        assert m.score <= 0.3, (
            f"Bad article should fail source_citation, got {m.score:.2f}: {m.reason}"
        )

    def test_writing_quality_fails(self, bad_result):
        m = bad_result.metrics["writing_quality"]
        assert m.score <= 0.5, (
            f"Bad article should fail writing_quality, got {m.score:.2f}: {m.reason}"
        )

    def test_journalistic_standards_fails(self, bad_result):
        m = bad_result.metrics["journalistic_standards"]
        assert m.score <= 0.5, (
            f"Bad article should fail journalistic_standards, got {m.score:.2f}: {m.reason}"
        )


@pytest.mark.eval
class TestLLMEvalHallucination:
    """Verify anti_hallucination metric catches invented claims."""

    HALLUCINATED_ARTICLE = """\
---
title: "Remote Work Productivity Facts"
description: "The data on remote work."
date: 2026-03-16
tags: [remote-work]
status: draft
---

# Remote Work Productivity Facts

A [Harvard study of 50,000 employees](https://harvard.edu/fake) found that remote workers
are 47% more productive than their in-office counterparts. This finding was corroborated
by a [2024 McKinsey report](https://mckinsey.com/fake) showing $2.3 trillion in productivity
gains globally since the shift to remote work began.

## The Numbers Don't Lie

According to the [World Economic Forum](https://wef.org/fake), remote work has increased
GDP in 87 countries by an average of 4.2%. The [Global Remote Work Index 2025](https://fake.com)
ranked fully distributed teams as 3x more innovative than office-bound teams.
"""

    def test_hallucination_detected(self):
        result = evaluate_article_sync(
            self.HALLUCINATED_ARTICLE,
            research_brief=SAMPLE_RESEARCH_BRIEF,
            metrics_to_run=["anti_hallucination"],
        )
        m = result.metrics["anti_hallucination"]
        assert m.score <= 0.4, (
            f"Hallucinated article should fail anti_hallucination, got {m.score:.2f}: {m.reason}"
        )


# ── Publish integrity validation ──────────────────────────────────────────────


def _parse_frontmatter_safe(md: str) -> tuple[dict, str]:
    """Parse YAML frontmatter using line-based delimiter matching.

    Returns (metadata_dict, body_after_frontmatter).
    """
    import yaml

    stripped = md.lstrip()
    if not stripped.startswith("---"):
        return {}, md
    # Match opening --- line, capture YAML until closing --- line
    m = re.match(r"^---[ \t]*\n(.*?\n)---[ \t]*\n", stripped, re.DOTALL)
    if not m:
        return {}, md
    try:
        meta = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        meta = {}
    return meta, stripped[m.end():]


def validate_published_output(md: str) -> list[str]:
    """Check published markdown for structural frontmatter issues.

    Returns a list of problem descriptions. Empty list = clean.
    Can be called as a post-publish gate or in tests.
    """
    issues: list[str] = []
    stripped = md.lstrip()

    # Must have frontmatter
    if not stripped.startswith("---"):
        issues.append("missing_frontmatter: no YAML frontmatter block found")
        return issues

    # Detect double frontmatter (>2 delimiter lines that are exactly ---)
    delimiter_lines = re.findall(r"^---\s*$", stripped, re.MULTILINE)
    if len(delimiter_lines) > 2:
        issues.append(
            f"double_frontmatter: found {len(delimiter_lines)} '---' delimiters, expected 2"
        )

    # Parse first frontmatter block (line-based, safe with --- in values)
    meta, _body = _parse_frontmatter_safe(md)
    if not meta:
        issues.append("malformed_frontmatter: could not parse YAML frontmatter")
        return issues

    # Title
    title = meta.get("title", "")
    if not title or len(str(title)) < 10:
        issues.append(f"bad_title: '{title}' is too short or missing")

    # Description must be meaningful, not a YAML delimiter or slug fragment
    desc = str(meta.get("description", ""))
    if not desc or desc.strip() in ("", "---") or len(desc) < 20:
        issues.append(f"bad_description: '{desc}' is not a meaningful summary")

    # Tags must be meaningful topic phrases, not slug-word fragments.
    # Slug-word tags are ALL single lowercase words (no spaces).
    tags = meta.get("tags", [])
    if isinstance(tags, list) and len(tags) >= 4:
        slug_like = [t for t in tags if isinstance(t, str) and " " not in t and t == t.lower()]
        if len(slug_like) == len(tags):
            issues.append(
                f"slug_word_tags: tags {tags} look like slug fragments, not topic tags"
            )

    # Date: must be present and recent (not copied from a source article)
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
            pass  # non-standard date format, not our concern here

    # Inline links: body must contain markdown hyperlinks [text](url)
    inline_links = re.findall(r"\[.+?\]\(https?://[^)]+\)", _body)
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


# ── Pytest: publish integrity (fast, no LLM) ─────────────────────────────────


DOUBLE_FM_ARTICLE = """\
---
slug: test-article
title: "Test Article"
description: "test"
date: 2026-03-16
authors: [nicolad]
tags:
  - test
  - article
---

---
title: "The Real Title of This Article"
description: "A proper description of the article content."
date: "2024-10-15"
tags: [testing, quality, publishing]
status: published
---

Body content here.
"""

CLEAN_ARTICLE = """\
---
slug: remote-work-productivity
title: "Remote Work Productivity: What the Data Shows"
description: "Four large-scale studies find remote workers are 13-20 percent more productive than on-site peers."
date: 2026-03-16
authors: [nicolad]
tags:
  - remote work
  - productivity
  - engineering teams
---

A [Stanford study](https://nber.org/papers/w18871) found 13% productivity gains.
[GitLab's survey](https://about.gitlab.com/company/culture/all-remote/) of 4,000 developers
found 52% felt more productive. The [Owl Labs 2023 report](https://owllabs.com/state-of-remote-work/2023)
corroborates this finding.
"""

SLUG_TAGS_ARTICLE = """\
---
slug: the-strategic-case-against-mandatory-work
title: "The Strategic Case Against Mandatory Work"
description: "A comprehensive analysis of the strategic case against mandatory work policies in modern organizations."
date: 2026-03-16
tags:
  - strategic
  - case
  - against
  - mandatory
  - work
---

Body.
"""

NO_LINKS_ARTICLE = """\
---
slug: remote-work-analysis
title: "Remote Work Analysis: Why It Matters"
description: "An analysis of remote work trends and their impact on modern organizations."
date: 2026-03-16
authors: [nicolad]
tags:
  - remote work
  - productivity
---

Remote work is increasingly popular. A Stanford study found 13% productivity gains.
GitLab surveyed 4,000 developers and found 52% felt more productive remotely.

## The Data

Multiple studies confirm these findings. The evidence is clear.
"""

FEW_LINKS_ARTICLE = """\
---
slug: remote-work-analysis
title: "Remote Work Analysis: Why It Matters"
description: "An analysis of remote work trends and their impact on modern organizations."
date: 2026-03-16
authors: [nicolad]
tags:
  - remote work
  - productivity
---

A [Stanford study](https://nber.org/papers/w18871) found 13% productivity gains.
GitLab surveyed 4,000 developers and found 52% felt more productive remotely.

## The Data

Multiple studies confirm these findings. The evidence is clear.
"""

WELL_LINKED_ARTICLE = """\
---
slug: remote-work-analysis
title: "Remote Work Analysis: Why It Matters"
description: "An analysis of remote work trends and their impact on modern organizations."
date: 2026-03-16
authors: [nicolad]
tags:
  - remote work
  - productivity
---

A [Stanford study](https://nber.org/papers/w18871) found 13% productivity gains.
[GitLab's survey](https://about.gitlab.com/company/culture/all-remote/) of 4,000 developers
found 52% felt more productive. The [Owl Labs 2023 report](https://owllabs.com/state-of-remote-work/2023)
corroborates this finding.

## The Data

The [NBER paper](https://nber.org/papers/w30810) confirms no negative impact on productivity.
"""


class TestPublishIntegrity:
    """Validate published output structural integrity — no LLM calls."""

    def test_clean_article_passes(self):
        issues = validate_published_output(CLEAN_ARTICLE)
        assert issues == [], f"Clean article should have no issues: {issues}"

    def test_double_frontmatter_detected(self):
        issues = validate_published_output(DOUBLE_FM_ARTICLE)
        assert any("double_frontmatter" in i for i in issues), (
            f"Should detect double frontmatter: {issues}"
        )

    def test_bad_description_detected(self):
        issues = validate_published_output(DOUBLE_FM_ARTICLE)
        assert any("bad_description" in i for i in issues), (
            f"Should detect '---' as bad description: {issues}"
        )

    def test_slug_word_tags_detected(self):
        issues = validate_published_output(SLUG_TAGS_ARTICLE)
        assert any("slug_word_tags" in i for i in issues), (
            f"Should detect slug-fragment tags: {issues}"
        )

    def test_missing_frontmatter_detected(self):
        issues = validate_published_output("# No frontmatter\n\nJust body.")
        assert any("missing_frontmatter" in i for i in issues)

    def test_no_inline_links_detected(self):
        issues = validate_published_output(NO_LINKS_ARTICLE)
        assert any("no_inline_links" in i for i in issues), (
            f"Should detect missing inline links: {issues}"
        )

    def test_few_inline_links_detected(self):
        issues = validate_published_output(FEW_LINKS_ARTICLE)
        assert any("few_inline_links" in i for i in issues), (
            f"Should detect too few inline links: {issues}"
        )

    def test_well_linked_article_passes_link_check(self):
        issues = validate_published_output(WELL_LINKED_ARTICLE)
        link_issues = [i for i in issues if "inline_links" in i]
        assert link_issues == [], f"Well-linked article should pass link checks: {link_issues}"

    def test_good_article_fixture_passes(self):
        issues = validate_published_output(GOOD_ARTICLE)
        assert issues == [], f"GOOD_ARTICLE fixture should pass: {issues}"
