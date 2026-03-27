"""Convert knowledge-base articles into chat JSONL for MLX LoRA fine-tuning.

For each content/*.md article, constructs a training example:
  system: writer persona + quality constraints
  user:   reconstructed prompt (topic, outline from headings, style guidance)
  assistant: the full article text

Usage:
    python scripts/build_training_data.py            # writes data/train-articles.jsonl
    python scripts/build_training_data.py --dry-run   # prints stats only
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "content"
DATA_DIR = ROOT / "data"
OUTPUT = DATA_DIR / "train-articles.jsonl"

# ── System prompt (matches pipeline persona + constraints) ────────────

SYSTEM_PROMPT = """\
You are an expert AI engineer and technical writer. You write comprehensive \
knowledge base articles for intermediate-to-senior AI engineers.

Requirements for every article:
- Start with `# Title` — a clear, descriptive title
- Opening paragraph: explain what this is, why it matters, cross-reference related articles
- Use `##` for major sections, `###` for subsections
- Include at least 3 real, working code examples (Python preferred, TypeScript where relevant)
- Use ```python or ```typescript code fences with proper syntax
- Include tables for comparisons using markdown pipe syntax
- Cross-reference at least 2 related articles as [Title](/slug) links
- Be specific and technical — no hand-waving or filler
- Target 2000-4000 words
- No frontmatter, no YAML headers — just pure markdown starting with `# Title`"""


def slug_to_topic(slug: str) -> str:
    """Convert a slug like 'few-shot-chain-of-thought' to 'Few Shot Chain of Thought'."""
    return slug.replace("-", " ").title()


def extract_outline(text: str) -> str:
    """Extract an outline from ## and ### headings in an article."""
    lines = []
    for line in text.splitlines():
        if line.startswith("### "):
            lines.append(f"  - {line[4:].strip()}")
        elif line.startswith("## "):
            lines.append(f"- {line[3:].strip()}")
    return "\n".join(lines)


def extract_cross_refs(text: str) -> list[str]:
    """Extract cross-referenced slugs from [Title](/slug) links."""
    return re.findall(r"\]\(/([\w-]+)\)", text)


def build_user_prompt(slug: str, topic: str, outline: str, cross_refs: list[str]) -> str:
    """Construct the user prompt that would produce this article."""
    related = ", ".join(cross_refs[:6]) if cross_refs else "related topics in AI engineering"

    prompt = f"Write a comprehensive knowledge base article about **{topic}**.\n\n"
    prompt += f"Slug: {slug}\n\n"
    prompt += "Outline:\n" + outline + "\n\n"
    prompt += f"Cross-reference these related articles where relevant: {related}\n\n"
    prompt += (
        "Write for intermediate-to-senior AI engineers. Include real code examples, "
        "comparison tables, and production patterns. Target 2000-4000 words."
    )
    return prompt


def process_article(md_path: Path) -> dict | None:
    """Convert a single article to a chat training example."""
    text = md_path.read_text().strip()
    if not text:
        return None

    slug = md_path.stem
    topic = slug_to_topic(slug)

    # Extract title from first line if available
    first_line = text.split("\n", 1)[0]
    if first_line.startswith("# "):
        topic = first_line[2:].strip()

    outline = extract_outline(text)
    if not outline:
        return None  # skip articles without sections

    cross_refs = extract_cross_refs(text)

    user_prompt = build_user_prompt(slug, topic, outline, cross_refs)

    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
            {"role": "assistant", "content": text},
        ]
    }


def main() -> None:
    dry_run = "--dry-run" in sys.argv

    md_files = sorted(CONTENT_DIR.glob("*.md"))
    if not md_files:
        print(f"No .md files found in {CONTENT_DIR}")
        sys.exit(1)

    examples = []
    skipped = []

    for md in md_files:
        example = process_article(md)
        if example:
            examples.append(example)
        else:
            skipped.append(md.stem)

    # Stats
    word_counts = [len(ex["messages"][2]["content"].split()) for ex in examples]
    total_words = sum(word_counts)
    avg_words = total_words // len(examples) if examples else 0

    print(f"Articles found:   {len(md_files)}")
    print(f"Training examples: {len(examples)}")
    print(f"Skipped:          {len(skipped)}")
    if skipped:
        print(f"  ({', '.join(skipped)})")
    print(f"Total words:      {total_words:,}")
    print(f"Avg words/article: {avg_words:,}")
    print(f"Min words:        {min(word_counts):,}")
    print(f"Max words:        {max(word_counts):,}")

    if dry_run:
        print("\n[dry-run] No files written.")
        if examples:
            print(f"\nSample user prompt ({examples[0]['messages'][1]['content'][:200]}...)")
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w") as f:
        for ex in examples:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")

    print(f"\nWrote {len(examples)} examples to {OUTPUT}")


if __name__ == "__main__":
    main()
