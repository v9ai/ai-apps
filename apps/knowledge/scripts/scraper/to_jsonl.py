"""Convert cleaned scraped content into chat JSONL training pairs.

Generates two types of training examples per article:
1. Article-style: system/user/assistant where assistant writes a knowledge article
2. Q&A-style: system+context/user question/assistant answer
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from .cleaner import CleanedArticle

ARTICLE_SYSTEM = """\
You are an expert AI engineer and technical writer. You write comprehensive \
knowledge base articles for intermediate-to-senior AI engineers.

Requirements for every article:
- Start with `# Title` — a clear, descriptive title
- Use `##` for major sections, `###` for subsections
- Include real code examples where relevant
- Be specific and technical — no hand-waving or filler
- No frontmatter, no YAML headers — just pure markdown starting with `# Title`"""

QA_SYSTEM = """\
You are a knowledgeable AI engineering assistant. Answer questions accurately \
and thoroughly based on the provided context.

Context:
{context}"""


def extract_sections(text: str) -> list[str]:
    """Split text into logical sections by paragraph groups."""
    paragraphs = text.split("\n\n")
    sections = []
    current = []
    for p in paragraphs:
        current.append(p)
        if len(" ".join(current).split()) > 200:
            sections.append("\n\n".join(current))
            current = []
    if current:
        sections.append("\n\n".join(current))
    return sections


def make_article_example(article: CleanedArticle) -> dict:
    """Create an article-generation training example."""
    user_prompt = (
        f"Write a comprehensive technical article about **{article.title}**.\n\n"
        f"Source reference: {article.source}\n\n"
        f"Write for intermediate-to-senior AI engineers. Include code examples "
        f"and practical patterns where relevant."
    )

    return {
        "messages": [
            {"role": "system", "content": ARTICLE_SYSTEM},
            {"role": "user", "content": user_prompt},
            {"role": "assistant", "content": article.content},
        ]
    }


def make_qa_examples(article: CleanedArticle, max_pairs: int = 2) -> list[dict]:
    """Create Q&A training examples from article sections.

    Generates questions that could be answered by the content. Uses simple
    heuristic question generation (not LLM-based, to avoid inference cost).
    """
    sections = extract_sections(article.content)
    examples = []

    for section in sections[:max_pairs]:
        # Extract a question-worthy sentence
        sentences = [s.strip() for s in section.split(".") if len(s.strip()) > 30]
        if not sentences:
            continue

        # Use first substantive sentence to frame a question
        first = sentences[0]
        # Simple heuristic: turn a statement into a "What/How" question
        question = f"Explain the key concepts from {article.title} regarding: {first[:100]}"

        example = {
            "messages": [
                {"role": "system", "content": QA_SYSTEM.format(context=section[:2000])},
                {"role": "user", "content": question},
                {"role": "assistant", "content": section},
            ]
        }
        examples.append(example)

    return examples


def articles_to_jsonl(
    articles: list[CleanedArticle],
    output_path: Path,
    include_qa: bool = True,
    max_qa_per_article: int = 2,
) -> int:
    """Convert cleaned articles to JSONL file. Returns number of examples written."""
    examples = []

    for article in articles:
        # Article-style example
        examples.append(make_article_example(article))

        # Q&A-style examples
        if include_qa:
            examples.extend(make_qa_examples(article, max_qa_per_article))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        for ex in examples:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")

    return len(examples)
