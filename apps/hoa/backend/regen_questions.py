"""
regen_questions.py
──────────────────
Regenerate ONLY the questions for a person, using existing research JSON.
Avoids re-running the full 20-agent pipeline.

Usage:
    python3 regen_questions.py athos-georgiou
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

# Set up HF token from cache
_hf_token = os.environ.get("HF_TOKEN", "")
if not _hf_token:
    token_path = Path.home() / ".cache" / "huggingface" / "token"
    if token_path.exists():
        _hf_token = token_path.read_text().strip()

# Patch the module-level token
import research_pipeline
research_pipeline._HF_TOKEN = _hf_token


def _make_client():
    """Get best available client: HF 72B preferred, MLX fallback."""
    from research_pipeline import _make_hf_client, _make_client as _make_mlx
    client = _make_hf_client()
    if client:
        console.print("[bold magenta]Using HF 72B for question generation[/]")
        return client
    console.print("[dim]Falling back to local MLX[/]")
    return _make_mlx()


def _ctx_block(label: str, text: str) -> str:
    if not text or not text.strip():
        return ""
    return f"\n=== {label.upper()} ===\n{text[:3000]}\n"


async def regenerate_questions(slug: str) -> list[dict]:
    research_path = RESEARCH_DIR / f"{slug}.json"
    if not research_path.exists():
        console.print(f"[red]No research JSON for {slug}[/]")
        return []

    research = json.loads(research_path.read_text())
    console.print(f"[bold cyan]Regenerating questions for {slug}[/]")

    # Get categories (capped at 7)
    categories = PERSON_CATEGORIES.get(slug, DEFAULT_CATEGORIES)
    if len(categories) > 7:
        core = dict(list(categories.items())[:5])
        domain = dict(list(categories.items())[5:7])
        categories = {**core, **domain}

    num_questions = len(categories) * 2
    console.print(f"  Categories: {len(categories)} ({', '.join(categories.keys())})")
    console.print(f"  Target: {num_questions} questions")

    # Build context from existing research
    all_context = (
        _ctx_block("Biography", research.get("bio", ""))
        + _ctx_block("Contributions", json.dumps(research.get("key_contributions", []), indent=2))
        + _ctx_block("Quotes", json.dumps(research.get("quotes", []), indent=2))
        + _ctx_block("Technical Philosophy", json.dumps(research.get("technical_philosophy", {}), indent=2))
        + _ctx_block("Executive Summary", json.dumps(research.get("executive_summary", {}), indent=2))
        + _ctx_block("Timeline", json.dumps(research.get("timeline", []), indent=2))
        + _ctx_block("Blog Posts", json.dumps(research.get("blog_posts", []), indent=2))
    )

    # Add blog embedding context if available
    blog_context = _get_blog_context(slug, categories)
    if blog_context:
        all_context += blog_context
        console.print(f"  [green]✓[/] Blog embedding context loaded")

    cat_lines = "\n".join(
        f"{i}. {cat} — {desc}"
        for i, (cat, desc) in enumerate(categories.items(), 1)
    )
    cat_names = "|".join(categories.keys())

    client = _make_client()

    result = await _run_agent(
        client,
        (
            "You are an expert podcast host and interviewer who specializes in deep technical "
            "conversations with AI/tech leaders. You craft questions that reveal genuine insight — "
            "referencing the person's specific work, intellectual tensions in their field, and "
            "decisions they've made. You never ask generic or Wikipedia-level questions. Each "
            "question opens a thread the guest hasn't been asked before.\n\n"
            "Anti-patterns to avoid:\n"
            "- 'Tell me about X' or 'What is X' — these are lazy prompts, not questions\n"
            "- Questions answerable with a single fact (yes/no, a date, a name)\n"
            "- Questions that could apply to any tech CEO without modification\n"
            "- Duplicating topics the guest has already been asked on prior podcasts\n"
            "- Do NOT embed specific numeric values (download counts, star counts, repo counts, percentages). "
            "Use relative references: 'your most-downloaded model', 'your highest-starred repo', 'the benchmark you lead on'\n"
            "- Do NOT invent comparisons or alternatives not in the source material "
            "(e.g., don't say 'versus 64 or 256' unless sources explicitly discuss those values)\n"
            "- Do NOT assume the answer space (e.g., 'What's the optimal batch size' presumes there is one)\n"
            "- Do NOT assume current vendor/employer affiliation from papers — "
            "a paper about AMD GPUs does not mean the person works exclusively on AMD\n\n"
            "Quality markers:\n"
            "- References a specific project, paper, decision, blog post title, or quote from the research\n"
            "- Creates productive tension (e.g., contrasting two positions the guest holds)\n"
            "- Invites a story or concrete example, not an abstract answer\n"
            "- Under 40 words — concise enough to deliver naturally on air\n"
            "- Questions remain valid even if download counts, star counts, or affiliations change\n"
            "- When blog posts are available, directly reference blog post titles in questions (e.g., \"In your post 'Title'...\")"
        ),
        (
            f"Generate {num_questions} high-quality interview questions for a podcast episode featuring "
            f"{research.get('name', slug)} ({research.get('executive_summary', {}).get('one_liner', '')}).\n"
            f"Use the following research to make questions specific and probing:\n{all_context}\n\n"
            f"Question categories (exactly 2 per category):\n{cat_lines}\n\n"
            f"Rules:\n"
            f"- Reference actual project names, papers, quotes, blog post titles, or events from the research\n"
            f"- Each question must be standalone (no follow-ups or 'building on the previous...')\n"
            f"- Keep each question under 40 words\n"
            f"- For each question, explain WHY this question matters and what INSIGHT you expect it to reveal\n"
            f"- Check the person's prior podcast appearances and do NOT repeat questions they've likely been asked\n"
            f"- When blog post titles are in the context, weave them into questions naturally\n"
            f"- Use AT LEAST 4 different question structures across your output:\n"
            f"  * Open narrative: 'Walk me through...'\n"
            f"  * Comparative: 'How does X compare to Y...'\n"
            f"  * Counterfactual: 'If you had to rebuild X without Y...'\n"
            f"  * Contrarian: 'Critics say X. Where are they wrong?'\n"
            f"  * Surprise/failure: 'What surprised you most about...'\n"
            f"  * Forward-looking: 'What would need to be true for...'\n"
            f"- Do NOT use 'In your [artifact], you [claim]. What specific...' more than twice total\n\n"
            f"Output a JSON array of exactly {num_questions} objects:\n"
            f'{{"category": "{cat_names}", '
            f'"question": "the question text", '
            f'"why_this_question": "1-sentence reason this question is worth asking", '
            f'"expected_insight": "what kind of answer this should draw out"}}'
        ),
    )

    questions_raw = _extract_json(result)
    if not questions_raw or not isinstance(questions_raw, list):
        console.print(f"[red]Failed to parse questions from LLM output ({len(result)} chars)[/]")
        console.print(result[:500])
        return []

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    questions = [
        {
            "category": q.get("category", ""),
            "question": q.get("question", ""),
            "why_this_question": q.get("why_this_question", ""),
            "expected_insight": q.get("expected_insight", ""),
            "last_verified": now,
        }
        for q in questions_raw
        if isinstance(q, dict) and q.get("question")
    ]

    console.print(f"\n  [green]✓[/] Generated {len(questions)} questions")

    # Display
    table = Table(title="Regenerated Interview Questions", show_lines=True)
    table.add_column("Category", width=18)
    table.add_column("Question", width=78)
    for q in questions:
        table.add_row(q["category"], q["question"])
    console.print(table)

    # Update research JSON
    research["questions"] = questions
    research_path.write_text(json.dumps(research, indent=2, ensure_ascii=False) + "\n")
    console.print(f"  [green]✓[/] Saved to {research_path.relative_to(PROJECT_ROOT)}")

    return questions


async def main():
    parser = argparse.ArgumentParser(description="Regenerate questions for a person using existing research")
    parser.add_argument("slug", help="Person slug")
    parser.add_argument("--dry-run", action="store_true", help="Print without saving")
    args = parser.parse_args()

    await regenerate_questions(args.slug)


if __name__ == "__main__":
    asyncio.run(main())
