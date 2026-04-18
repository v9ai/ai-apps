"""
regen_questions.py
──────────────────
Regenerate ONLY the questions for a person, using existing research JSON.
Uses a multi-agent adversarial debate protocol: advocate generates,
critic attacks, judge rules. Only questions that survive the debate are kept.

Usage:
    python3 regen_questions.py athos-georgiou
    python3 regen_questions.py athos-georgiou --rounds 3
    python3 regen_questions.py athos-georgiou --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()

ROOT = Path(__file__).parent
PROJECT_ROOT = ROOT.parent
RESEARCH_DIR = PROJECT_ROOT / "src" / "lib" / "research"

sys.path.insert(0, str(ROOT))

from research_pipeline import (
    PERSON_CATEGORIES,
    DEFAULT_CATEGORIES,
    BLOG_QUERIES,
    _get_blog_context,
    _run_agent,
    _extract_json,
    _HF_TOKEN,
)

_hf_token = os.environ.get("HF_TOKEN", "")
if not _hf_token:
    token_path = Path.home() / ".cache" / "huggingface" / "token"
    if token_path.exists():
        _hf_token = token_path.read_text().strip()

import research_pipeline
research_pipeline._HF_TOKEN = _hf_token


_FORCE_LOCAL = False


def _build_client(preference: str):
    """Build a single client: 'hf' (72B remote) or 'mlx' (local 7B).
    Falls back to MLX if HF requested but unavailable."""
    from research_pipeline import _make_hf_client, _make_client as _make_mlx
    pref = (preference or "").lower()
    if pref == "hf" and not _FORCE_LOCAL:
        client = _make_hf_client()
        if client:
            return client, "hf"
        console.print("[yellow]HF requested but token/client unavailable — falling back to MLX[/]")
    return _make_mlx(), "mlx"


_VALID_MODEL_KINDS = ("mlx", "hf")


def _parse_judge_model_spec(spec: str | list[str] | None) -> list[str]:
    """Normalise the --judge-model arg into a list of model kinds.

    `spec` may be:
      - None       → empty list (caller substitutes a default)
      - "hf"       → ["hf"]
      - "hf,mlx,hf"→ ["hf", "mlx", "hf"]
      - ["hf","mlx"] → ["hf", "mlx"]
    Unknown kinds raise ValueError.
    """
    if spec is None:
        return []
    if isinstance(spec, str):
        parts = [p.strip().lower() for p in spec.split(",") if p.strip()]
    else:
        parts = [str(p).strip().lower() for p in spec if str(p).strip()]
    for p in parts:
        if p not in _VALID_MODEL_KINDS:
            raise ValueError(
                f"Invalid judge model {p!r}; expected one of {_VALID_MODEL_KINDS}"
            )
    return parts


def _make_clients(
    advocate_model: str,
    critic_model: str,
    judge_model: str | list[str],
    jury_size: int,
) -> dict:
    """Return one client per role.

    `judge_model` may be a single kind (jury_size copies of one client, with
    per-juror temperature variance to decorrelate) or a list/comma-string of
    distinct kinds (one client per kind; list length overrides jury_size).
    Mixed-model juries are the strongest defence against correlated
    single-model bias.
    """
    advocate, advocate_kind = _build_client(advocate_model)
    critic, critic_kind = _build_client(critic_model)

    judge_kinds = _parse_judge_model_spec(judge_model)
    if len(judge_kinds) <= 1:
        kind = judge_kinds[0] if judge_kinds else "mlx"
        judge, judge_kind = _build_client(kind)
        judges = [judge] * max(1, jury_size)
        kinds_label = f"{judge_kind}×{len(judges)}"
    else:
        if jury_size and jury_size != len(judge_kinds):
            console.print(
                f"[yellow]--jury {jury_size} ignored: --judge-model list of "
                f"{len(judge_kinds)} kinds determines jury size[/]"
            )
        judges = []
        actual_kinds = []
        for k in judge_kinds:
            client, actual = _build_client(k)
            judges.append(client)
            actual_kinds.append(actual)
        kinds_label = ",".join(actual_kinds)

    console.print(
        f"[dim]Roles → advocate:{advocate_kind} critic:{critic_kind} "
        f"judges:{kinds_label}[/]"
    )
    return {"advocate": advocate, "critic": critic, "judges": judges,
            "judge_kinds": kinds_label}


def _make_client():
    """Backwards-compatible single-client builder (HF preferred, MLX fallback)."""
    client, kind = _build_client("hf")
    if kind == "hf":
        console.print("[bold magenta]Using HF 72B for debate[/]")
    else:
        console.print("[dim]Using local MLX (Qwen2.5-7B)[/]")
    return client


def _ctx_block(label: str, text: str) -> str:
    if not text or not text.strip():
        return ""
    return f"\n=== {label.upper()} ===\n{text[:3000]}\n"


def _build_research_context(research: dict, slug: str, categories: dict) -> str:
    all_context = (
        _ctx_block("Biography", research.get("bio", ""))
        + _ctx_block("Contributions", json.dumps(research.get("key_contributions", []), indent=2))
        + _ctx_block("Quotes", json.dumps(research.get("quotes", []), indent=2))
        + _ctx_block("Technical Philosophy", json.dumps(research.get("technical_philosophy", {}), indent=2))
        + _ctx_block("Executive Summary", json.dumps(research.get("executive_summary", {}), indent=2))
        + _ctx_block("Timeline", json.dumps(research.get("timeline", []), indent=2))
        + _ctx_block("Blog Posts", json.dumps(research.get("blog_posts", []), indent=2))
    )
    blog_context = _get_blog_context(slug, categories)
    if blog_context:
        all_context += blog_context
        console.print(f"  [green]✓[/] Blog embedding context loaded")
    return all_context


# ═══════════════════════════════════════════════════════════════════════════
# Agent system prompts
# ═══════════════════════════════════════════════════════════════════════════

# Personas live as HF model repos (v9ai/qwen-hoa-regen-{advocate,critic,judge});
# loader prefers local `apps/hoa/agent-bundles/` for the dev loop.
# Loaded once in metrics._debate_primitives and re-exported so the orchestrator
# and the DeepEval BaseMetric wrapper share a single source of truth.
from metrics._debate_primitives import (
    ADVOCATE_SYSTEM,
    CRITIC_SYSTEM,
    JUDGE_SYSTEM,
    JUDGE_JSON_INSTRUCTION,
    jury_aggregate,
    synthesise_critique_text,
)


# ═══════════════════════════════════════════════════════════════════════════
# Debate rounds
# ═══════════════════════════════════════════════════════════════════════════

async def _advocate_generate(
    client, research: dict, all_context: str, categories: dict,
    num_questions: int, prior_critique: str | None = None,
) -> str:
    cat_lines = "\n".join(
        f"{i}. {cat} — {desc}"
        for i, (cat, desc) in enumerate(categories.items(), 1)
    )
    cat_names = "|".join(categories.keys())

    if prior_critique:
        task = (
            f"The critic and judge found flaws in your previous questions. "
            f"Here is their feedback:\n\n{prior_critique}\n\n"
            f"Revise or replace the flagged questions. Keep any ACCEPTED questions unchanged. "
            f"For REVISION REQUIRED questions, apply the judge's specified fix. "
            f"For REJECTED questions, write entirely new ones grounded in the research.\n\n"
            f"Research context:\n{all_context}\n\n"
            f"Categories (exactly 2 per category):\n{cat_lines}\n\n"
            f"Output a JSON array of exactly {num_questions} objects:\n"
            f'{{"category": "{cat_names}", '
            f'"question": "the question text", '
            f'"why_this_question": "1-sentence reason — specific to this person, not boilerplate", '
            f'"expected_insight": "what kind of answer this should draw out"}}'
        )
    else:
        task = (
            f"Generate {num_questions} high-quality interview questions for a podcast episode featuring "
            f"{research.get('name', '?')} ({research.get('executive_summary', {}).get('one_liner', '')}).\n"
            f"Use the following research to make questions specific and probing:\n{all_context}\n\n"
            f"Question categories (exactly 2 per category):\n{cat_lines}\n\n"
            f"Rules:\n"
            f"- Reference actual project names, papers, quotes, blog post titles, or events from the research\n"
            f"- Each question must be standalone (no follow-ups or 'building on the previous...')\n"
            f"- Keep each question under 40 words\n"
            f"- For each question, explain WHY this question matters and what INSIGHT you expect\n"
            f"- why_this_question must be specific to THIS person — never use boilerplate openers "
            f"like 'Understanding the...', 'Insight into...', 'Exploring the...'\n"
            f"- When blog post titles are in the context, weave them into questions naturally\n"
            f"- Use AT LEAST 4 different question structures:\n"
            f"  * Open narrative: 'Walk me through...'\n"
            f"  * Comparative: 'How does X compare to Y...'\n"
            f"  * Counterfactual: 'If you had to rebuild X without Y...'\n"
            f"  * Contrarian: 'Critics say X. Where are they wrong?'\n"
            f"  * Surprise/failure: 'What surprised you most about...'\n"
            f"  * Forward-looking: 'What would need to be true for...'\n"
            f"- Do NOT use 'In your [artifact], you [claim]. What specific...' more than twice\n"
            f"- No more than 3 questions may start with the same 2-word prefix\n"
            f"- Do NOT embed specific numeric values (download counts, star counts, percentages)\n"
            f"- Do NOT invent comparisons or alternatives not in the source material\n"
            f"- Do NOT assume vendor/employer affiliation from papers\n\n"
            f"Output a JSON array of exactly {num_questions} objects:\n"
            f'{{"category": "{cat_names}", '
            f'"question": "the question text", '
            f'"why_this_question": "1-sentence reason — specific to this person, not boilerplate", '
            f'"expected_insight": "what kind of answer this should draw out"}}'
        )

    return await _run_agent(client, ADVOCATE_SYSTEM, task)


async def _critic_review(
    client, questions_json: str, all_context: str, research: dict,
) -> str:
    contributions = research.get("key_contributions", [])
    contrib_names = [c.get("name", c.get("title", "")) for c in contributions if isinstance(c, dict)]
    blog_posts = research.get("blog_posts", [])
    blog_titles = [b.get("title", "") for b in blog_posts if isinstance(b, dict)]

    grounding_ref = ""
    if contrib_names:
        grounding_ref += f"\nKnown projects/papers: {', '.join(contrib_names)}\n"
    if blog_titles:
        grounding_ref += f"Known blog posts: {', '.join(blog_titles[:15])}\n"

    task = (
        f"Review these interview questions for {research.get('name', '?')}. "
        f"Attack every weakness you find.\n\n"
        f"QUESTIONS TO REVIEW:\n{questions_json}\n\n"
        f"RESEARCH CONTEXT (ground truth):\n{all_context}\n\n"
        f"GROUNDING REFERENCES:{grounding_ref}\n"
        f"Any project, paper, or quote mentioned in a question that is NOT in the lists above "
        f"or the research context is HALLUCINATED — flag it.\n\n"
        f"For EACH question, output:\n"
        f"- Question number and text\n"
        f"- Verdict: PASS or FAIL\n"
        f"- If FAIL: which failure mode(s) (GENERIC, HALLUCINATED, NUMERIC, REPETITIVE, "
        f"TEMPLATED, VAGUE, OVERLONG, LAZY) and the specific words that fail\n\n"
        f"Then provide a STRUCTURAL REVIEW of the full set:\n"
        f"- Count of question structures used (narrative, comparative, counterfactual, etc.)\n"
        f"- Any 2-word prefix appearing 3+ times\n"
        f"- Category balance (exactly 2 per category?)\n"
        f"- Overall quality score: 1-10"
    )

    return await _run_agent(client, CRITIC_SYSTEM, task)


async def _judge_rule(
    client, questions_json: str, critique: str, all_context: str,
    research: dict, num_questions: int, categories: dict, is_final: bool,
    *,
    temperature: float | None = None,
    seed: int | None = None,
    judge_label: str = "JUDGE",
) -> dict:
    """Issue a structured JSON ruling (see JUDGE_JSON_INSTRUCTION).

    Returns a dict shaped per the contract; on parse failure returns a
    permissive fallback so a single bad judge response doesn't crash the run.
    `temperature` and `seed` let callers vary jurors against the same model;
    `judge_label` is injected into the persona so the LLM perceives itself
    as a distinct juror (textual diversity even when sampler diversity is weak).
    """
    cat_names = "|".join(categories.keys())
    final_note = (
        "\n\nThis is the FINAL ROUND — your verdicts and any `revised` blocks "
        "will be saved verbatim. For REJECTED items, supply a replacement in "
        "`revised` using the research context."
        if is_final else ""
    )

    task = (
        f"You are {judge_label}, ruling independently of any other juror.\n"
        f"Evaluate this debate about interview questions for {research.get('name', '?')}.\n\n"
        f"ADVOCATE'S QUESTIONS (1-indexed):\n{questions_json}\n\n"
        f"CRITIC'S REVIEW:\n{critique}\n\n"
        f"RESEARCH CONTEXT (use this to independently verify claims):\n{all_context}\n\n"
        f"Categories permitted: {cat_names}. Expected count: {num_questions}.\n"
        f"For each question, issue a binding verdict, a 0..1 score, and a reason.\n"
        f"Also score the set as a whole.{final_note}\n\n"
        f"{JUDGE_JSON_INSTRUCTION}"
    )

    extra: dict = {}
    if seed is not None:
        extra["seed"] = seed

    raw = await _run_agent(
        client, JUDGE_SYSTEM, task,
        temperature=temperature, extra_kwargs=extra or None,
    )
    parsed = _extract_json(raw)
    if isinstance(parsed, dict) and isinstance(parsed.get("questions"), list):
        return parsed

    console.print(f"[yellow]{judge_label} response was not valid JSON — fallback[/]")
    return {
        "questions": [],
        "overall_score": 0.0,
        "overall_reason": "judge response unparseable; raw output preserved",
        "_raw": raw,
    }


_JURY_BASE_TEMPERATURE = 0.3
_JURY_TEMPERATURE_STEP = 0.15
_JURY_TEMPERATURE_MAX = 0.9


def _judge_sampling_for(idx: int, total: int) -> tuple[float, int]:
    """Per-juror (temperature, seed). idx is 0-based. With one juror we use
    the base temperature; multi-juror runs spread temperatures around the
    base so independent samples stay decorrelated even on backends that
    ignore `seed`."""
    if total <= 1:
        return _JURY_BASE_TEMPERATURE, 17
    temp = min(
        _JURY_TEMPERATURE_MAX,
        _JURY_BASE_TEMPERATURE + _JURY_TEMPERATURE_STEP * idx,
    )
    return temp, 17 + idx * 101


async def _jury_judge(
    judges: list, questions_json: str, critique: str, all_context: str,
    research: dict, num_questions: int, categories: dict, is_final: bool,
) -> dict:
    """Run N judges in parallel with per-juror temperature/seed and aggregate."""
    if not judges:
        return {"questions": [], "overall_score": 0.0, "overall_reason": "no judges"}
    total = len(judges)
    coros = []
    for idx, j in enumerate(judges):
        temp, seed = _judge_sampling_for(idx, total)
        coros.append(_judge_rule(
            j, questions_json, critique, all_context,
            research, num_questions, categories, is_final,
            temperature=temp, seed=seed,
            judge_label=f"JUROR-{idx + 1}-OF-{total}",
        ))
    judgments = await asyncio.gather(*coros)
    return jury_aggregate(judgments)


# ═══════════════════════════════════════════════════════════════════════════
# Post-generation validation
# ═══════════════════════════════════════════════════════════════════════════

def _validate_questions(questions: list[dict], research: dict, categories: dict) -> list[str]:
    """Check questions against rules that can be verified programmatically."""
    issues = []

    contrib_names = set()
    for c in research.get("key_contributions", []):
        if isinstance(c, dict):
            for key in ("name", "title"):
                if c.get(key):
                    contrib_names.add(c[key].lower())

    blog_titles = set()
    for b in research.get("blog_posts", []):
        if isinstance(b, dict) and b.get("title"):
            blog_titles.add(b["title"].lower())

    valid_cats = set(categories.keys())
    prefix_counts: dict[str, int] = {}

    for i, q in enumerate(questions):
        text = q.get("question", "")
        cat = q.get("category", "")
        why = q.get("why_this_question", "")

        if cat not in valid_cats:
            issues.append(f"Q{i+1}: invalid category '{cat}'")

        word_count = len(text.split())
        if word_count > 45:
            issues.append(f"Q{i+1}: {word_count} words (limit 40)")

        prefix = " ".join(text.split()[:2]).lower().rstrip(".,")
        prefix_counts[prefix] = prefix_counts.get(prefix, 0) + 1

        boilerplate = ("understanding the", "insight into", "exploring the",
                       "detailed explanation", "discussion on")
        why_lower = why.lower()
        for bp in boilerplate:
            if why_lower.startswith(bp):
                issues.append(f"Q{i+1}: boilerplate why_this_question ('{bp}...')")
                break

    for prefix, count in prefix_counts.items():
        if count > 3:
            issues.append(f"Prefix '{prefix}' used {count} times (max 3)")

    cat_counts = {}
    for q in questions:
        cat_counts[q.get("category", "")] = cat_counts.get(q.get("category", ""), 0) + 1
    for cat in valid_cats:
        if cat_counts.get(cat, 0) != 2:
            issues.append(f"Category '{cat}' has {cat_counts.get(cat, 0)} questions (expected 2)")

    return issues


# ═══════════════════════════════════════════════════════════════════════════
# Main debate orchestrator
# ═══════════════════════════════════════════════════════════════════════════

async def regenerate_questions(
    slug: str,
    rounds: int = 2,
    dry_run: bool = False,
    jury: int = 1,
    advocate_model: str = "mlx",
    critic_model: str = "mlx",
    judge_model: str | None = None,
) -> list[dict]:
    research_path = RESEARCH_DIR / f"{slug}.json"
    if not research_path.exists():
        console.print(f"[red]No research JSON for {slug}[/]")
        return []

    research = json.loads(research_path.read_text())
    name = research.get("name", slug)
    console.print(Panel(
        f"[bold cyan]Adversarial debate: {name}[/]\n"
        f"[dim]{rounds} round{'s' if rounds > 1 else ''} — advocate → critic → "
        f"jury({jury})[/]",
        title="Question Generation",
    ))

    categories = PERSON_CATEGORIES.get(slug, DEFAULT_CATEGORIES)
    if len(categories) > 7:
        core = dict(list(categories.items())[:5])
        domain = dict(list(categories.items())[5:7])
        categories = {**core, **domain}

    num_questions = len(categories) * 2
    console.print(f"  Categories: {len(categories)} ({', '.join(categories.keys())})")
    console.print(f"  Target: {num_questions} questions\n")

    all_context = _build_research_context(research, slug, categories)

    if judge_model is None:
        judge_model = "hf" if (_hf_token and not _FORCE_LOCAL) else "mlx"
    clients = _make_clients(advocate_model, critic_model, judge_model, jury)
    advocate_client = clients["advocate"]
    critic_client = clients["critic"]
    judges = clients["judges"]

    prior_critique = None
    final_questions: list[dict] | None = None
    final_ruling: dict | None = None
    last_advocate_questions: list[dict] = []

    for round_num in range(1, rounds + 1):
        is_final = round_num == rounds
        console.print(f"[bold yellow]── Round {round_num}/{rounds} ──[/]")

        # Advocate generates/revises
        console.print(f"  [blue]Advocate[/] {'revising' if prior_critique else 'generating'}...")
        advocate_output = await _advocate_generate(
            advocate_client, research, all_context, categories,
            num_questions, prior_critique,
        )
        questions_raw = _extract_json(advocate_output)
        if not questions_raw or not isinstance(questions_raw, list):
            console.print(f"  [red]Advocate failed to produce valid JSON[/]")
            if round_num == 1:
                return []
            break
        last_advocate_questions = questions_raw

        questions_json = json.dumps(questions_raw, indent=2)
        console.print(f"  [blue]Advocate[/] produced {len(questions_raw)} questions")

        # Critic attacks
        console.print(f"  [red]Critic[/] reviewing...")
        critique = await _critic_review(critic_client, questions_json, all_context, research)

        pass_count = critique.lower().count("pass")
        fail_count = critique.lower().count("fail")
        console.print(f"  [red]Critic[/] verdict: ~{pass_count} pass, ~{fail_count} fail")

        # Jury rules (1..N judges)
        console.print(
            f"  [magenta]Jury({len(judges)})[/] "
            f"{'issuing final ruling' if is_final else 'evaluating'}..."
        )
        ruling = await _jury_judge(
            judges, questions_json, critique, all_context,
            research, num_questions, categories, is_final,
        )
        console.print(
            f"  [magenta]Jury[/] overall score: {ruling.get('overall_score', 0.0):.2f}"
        )

        if is_final:
            final_ruling = ruling
            final_questions = _materialise_final_questions(
                questions_raw, ruling, categories, num_questions,
            )
        else:
            prior_critique = (
                f"CRITIC:\n{critique}\n\n"
                f"JURY RULING:\n{synthesise_critique_text(ruling)}"
            )

        console.print()

    if not final_questions:
        console.print("[yellow]No final ruling produced — falling back to last advocate set[/]")
        final_questions = [
            {**q, "verdict": "ACCEPTED", "judge_score": None, "judge_reason": ""}
            for q in last_advocate_questions
        ]

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    jury_size = len(judges)

    questions = [
        {
            "category": q.get("category", ""),
            "question": q.get("question", ""),
            "why_this_question": q.get("why_this_question", ""),
            "expected_insight": q.get("expected_insight", ""),
            "last_verified": now,
            "verdict": q.get("verdict", "ACCEPTED"),
            "judge_score": q.get("judge_score"),
            "judge_reason": q.get("judge_reason", ""),
            "jury_size": jury_size,
        }
        for q in final_questions
        if isinstance(q, dict) and q.get("question")
    ]

    # Post-generation validation (operates on user-facing fields only)
    issues = _validate_questions(questions, research, categories)
    if issues:
        console.print(Panel(
            "\n".join(f"  [yellow]⚠[/] {issue}" for issue in issues),
            title="[yellow]Post-debate validation[/]",
        ))

    # Display
    table = Table(title="Final Questions (post-debate)", show_lines=True)
    table.add_column("#", width=3)
    table.add_column("Category", width=18)
    table.add_column("Question", width=64)
    table.add_column("V", width=3)
    table.add_column("Score", width=5, justify="right")
    for i, q in enumerate(questions, 1):
        verdict = q.get("verdict", "")
        v_icon = {"ACCEPTED": "✓", "REVISION_REQUIRED": "~",
                  "REJECTED": "+"}.get(verdict, " ")
        score = q.get("judge_score")
        score_str = f"{score:.2f}" if isinstance(score, (int, float)) else "—"
        table.add_row(str(i), q["category"], q["question"], v_icon, score_str)
    console.print(table)

    if final_ruling and final_ruling.get("overall_reason"):
        console.print(Panel(
            f"score {final_ruling.get('overall_score', 0.0):.2f}\n"
            f"{final_ruling.get('overall_reason', '')}",
            title="[magenta]Jury overall verdict[/]",
        ))

    if dry_run:
        console.print("[dim]Dry run — not saving[/]")
        return questions

    research["questions"] = questions
    research_path.write_text(json.dumps(research, indent=2, ensure_ascii=False) + "\n")
    console.print(f"  [green]✓[/] Saved to {research_path.relative_to(PROJECT_ROOT)}")

    return questions


def _materialise_final_questions(
    advocate_questions: list[dict],
    ruling: dict,
    categories: dict,
    num_questions: int,
) -> list[dict]:
    """Combine the advocate's last set with the jury's per-question ruling.

    For ACCEPTED: keep the advocate's text.
    For REVISION_REQUIRED / REJECTED with a `revised` block: take the revision.
    For REVISION_REQUIRED / REJECTED with no `revised` block: keep advocate's
    text but tag the verdict so the audit trail records the disagreement.
    """
    by_index = {int(q.get("index", 0)): q for q in ruling.get("questions", [])}
    out: list[dict] = []
    for i, advocate_q in enumerate(advocate_questions, 1):
        verdict_q = by_index.get(i, {})
        verdict = verdict_q.get("verdict", "ACCEPTED")
        score = verdict_q.get("score")
        reason = verdict_q.get("reason", "")
        revised = verdict_q.get("revised") if isinstance(verdict_q, dict) else None
        chosen = revised if (verdict != "ACCEPTED" and isinstance(revised, dict)
                              and revised.get("question")) else advocate_q
        out.append({
            "category": chosen.get("category", advocate_q.get("category", "")),
            "question": chosen.get("question", advocate_q.get("question", "")),
            "why_this_question": chosen.get("why_this_question",
                                            advocate_q.get("why_this_question", "")),
            "expected_insight": chosen.get("expected_insight",
                                           advocate_q.get("expected_insight", "")),
            "verdict": verdict,
            "judge_score": float(score) if isinstance(score, (int, float)) else None,
            "judge_reason": reason,
        })
    return out


# ═══════════════════════════════════════════════════════════════════════════
# Batch mode
# ═══════════════════════════════════════════════════════════════════════════

def _discover_slugs(force: bool = False) -> list[str]:
    """Find all research JSON slugs, optionally filtering to those without questions."""
    slugs = []
    for f in sorted(RESEARCH_DIR.glob("*.json")):
        if "timeline" in f.name or "eval" in f.name:
            continue
        slug = f.stem
        if not force:
            data = json.loads(f.read_text())
            if data.get("questions"):
                continue
        slugs.append(slug)
    return slugs


async def regenerate_all(
    rounds: int = 2,
    dry_run: bool = False,
    force: bool = False,
    concurrency: int = 3,
    jury: int = 1,
    advocate_model: str = "mlx",
    critic_model: str = "mlx",
    judge_model: str | None = None,
) -> None:
    slugs = _discover_slugs(force=force)
    total = len(slugs)

    if not slugs:
        console.print("[green]All personalities already have questions.[/]")
        return

    console.print(Panel(
        f"[bold cyan]{total} personalities to process[/]\n"
        f"[dim]concurrency={concurrency}, rounds={rounds}, force={force}, dry_run={dry_run}[/]",
        title="Batch Question Generation",
    ))

    semaphore = asyncio.Semaphore(concurrency)
    results: list[tuple[str, str, int]] = []

    async def _run_one(slug: str, idx: int) -> None:
        async with semaphore:
            console.print(f"\n[bold]({idx}/{total}) {slug}[/]")
            try:
                questions = await regenerate_questions(
                    slug,
                    rounds=rounds,
                    dry_run=dry_run,
                    jury=jury,
                    advocate_model=advocate_model,
                    critic_model=critic_model,
                    judge_model=judge_model,
                )
                status = "ok" if questions else "empty"
                results.append((slug, status, len(questions)))
            except Exception as e:
                console.print(f"  [red]Error: {e}[/]")
                results.append((slug, f"error: {e}", 0))

    tasks = [_run_one(slug, i + 1) for i, slug in enumerate(slugs)]
    await asyncio.gather(*tasks)

    # Summary
    console.print("\n")
    summary = Table(title="Batch Results", show_lines=True)
    summary.add_column("Slug", width=30)
    summary.add_column("Status", width=12)
    summary.add_column("Questions", width=10, justify="right")

    ok_count = 0
    for slug, status, count in sorted(results):
        style = "green" if status == "ok" else ("yellow" if status == "empty" else "red")
        summary.add_row(slug, f"[{style}]{status}[/]", str(count))
        if status == "ok":
            ok_count += 1

    console.print(summary)
    console.print(f"\n[bold]{ok_count}/{total} succeeded[/]")


async def main():
    parser = argparse.ArgumentParser(description="Regenerate questions via adversarial debate")
    parser.add_argument("slug", nargs="?", help="Person slug (omit with --all)")
    parser.add_argument("--all", action="store_true", help="Process all personalities")
    parser.add_argument("--rounds", type=int, default=2, help="Debate rounds (default: 2)")
    parser.add_argument("--dry-run", action="store_true", help="Print without saving")
    parser.add_argument("--force", action="store_true", help="Regenerate even if questions exist")
    parser.add_argument("--concurrency", type=int, default=3, help="Max concurrent debates (default: 3)")
    parser.add_argument("--local", action="store_true", help="Force local MLX model (skip HF API)")
    parser.add_argument("--jury", type=int, default=1,
                        help="Number of judges in the jury (default: 1)")
    parser.add_argument("--advocate-model", choices=("mlx", "hf"), default="mlx",
                        help="Model for the advocate role (default: mlx)")
    parser.add_argument("--critic-model", choices=("mlx", "hf"), default="mlx",
                        help="Model for the critic role (default: mlx)")
    parser.add_argument("--judge-model", type=str, default=None,
                        help=("Model for the judge role. Single kind ('hf' or 'mlx') "
                              "or comma-separated list ('hf,mlx,hf') for a mixed-model "
                              "jury. Default: hf if HF_TOKEN set, else mlx."))
    args = parser.parse_args()

    global _FORCE_LOCAL
    if args.local:
        _FORCE_LOCAL = True

    if args.all:
        await regenerate_all(
            rounds=args.rounds,
            dry_run=args.dry_run,
            force=args.force,
            concurrency=args.concurrency,
            jury=args.jury,
            advocate_model=args.advocate_model,
            critic_model=args.critic_model,
            judge_model=args.judge_model,
        )
    elif args.slug:
        await regenerate_questions(
            args.slug,
            rounds=args.rounds,
            dry_run=args.dry_run,
            jury=args.jury,
            advocate_model=args.advocate_model,
            critic_model=args.critic_model,
            judge_model=args.judge_model,
        )
    else:
        parser.error("Provide a slug or use --all")


if __name__ == "__main__":
    asyncio.run(main())
