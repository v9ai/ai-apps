"""Clean and filter scraped content for training data quality.

Handles: HTML→text cleanup, dedup via content hashing, quality filtering.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass

from .blog_scraper import ScrapedArticle

MIN_WORD_COUNT = 500
MAX_WORD_COUNT = 15000


@dataclass
class CleanedArticle:
    """A cleaned and validated article ready for JSONL conversion."""
    title: str
    url: str
    source: str
    content: str
    word_count: int


def clean_text(text: str) -> str:
    """Normalize whitespace, remove artifacts."""
    # Remove common web artifacts
    text = re.sub(r"Subscribe.*?newsletter", "", text, flags=re.IGNORECASE)
    text = re.sub(r"Share this (post|article).*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"(Cookie|Privacy) (Policy|Notice).*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"Sign up.*?free", "", text, flags=re.IGNORECASE)

    # Normalize whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    lines = [line.strip() for line in text.splitlines()]
    text = "\n".join(lines)

    return text.strip()


def content_hash(text: str) -> str:
    """SHA256 hash of normalized content for dedup."""
    normalized = re.sub(r"\s+", " ", text.lower().strip())
    return hashlib.sha256(normalized.encode()).hexdigest()[:16]


def is_ai_relevant(text: str) -> bool:
    """Check if content is AI/ML engineering relevant."""
    keywords = [
        "machine learning", "deep learning", "neural network", "transformer",
        "llm", "language model", "embedding", "vector", "rag", "retrieval",
        "fine-tun", "lora", "qlora", "inference", "gpu", "training",
        "pytorch", "tensorflow", "hugging face", "langchain", "agent",
        "prompt", "tokeniz", "attention", "diffusion", "reinforcement",
        "classification", "nlp", "computer vision", "generative ai",
        "mlops", "model serving", "quantiz", "distillat",
    ]
    text_lower = text.lower()
    matches = sum(1 for kw in keywords if kw in text_lower)
    return matches >= 3


def clean_articles(
    articles: list[ScrapedArticle],
    seen_hashes: set[str] | None = None,
) -> list[CleanedArticle]:
    """Clean, dedup, and filter a batch of scraped articles."""
    if seen_hashes is None:
        seen_hashes = set()

    cleaned = []
    for article in articles:
        text = clean_text(article.content)
        word_count = len(text.split())

        # Filter by length
        if word_count < MIN_WORD_COUNT:
            continue
        if word_count > MAX_WORD_COUNT:
            # Truncate very long articles
            words = text.split()[:MAX_WORD_COUNT]
            text = " ".join(words)
            word_count = MAX_WORD_COUNT

        # Dedup
        h = content_hash(text)
        if h in seen_hashes:
            continue
        seen_hashes.add(h)

        # Relevance filter
        if not is_ai_relevant(text):
            continue

        cleaned.append(CleanedArticle(
            title=article.title,
            url=article.url,
            source=article.source,
            content=text,
            word_count=word_count,
        ))

    return cleaned
