"""Embedding utilities for therapy research papers.

Generic embedding functions delegate to the shared research_client package.
Therapy-specific text builders (paper_to_embedding_text, query_to_embedding_text)
remain here since they encode domain knowledge.
"""
from __future__ import annotations

# Re-export generic embedding functions from the shared package
from research_client.embeddings import (  # noqa: F401
    EMBEDDING_DIMS,
    EMBEDDING_MODEL,
    aembed_text,
    aembed_texts,
    embed_text,
    embed_texts,
)


def paper_to_embedding_text(
    title: str,
    key_findings: list[str] | None = None,
    therapeutic_techniques: list[str] | None = None,
    abstract: str | None = None,
) -> str:
    """Build the text representation of a paper for embedding."""
    parts = [f"Title: {title}"]
    if abstract:
        parts.append(f"Abstract: {abstract[:1000]}")
    if key_findings:
        parts.append(f"Key findings: {'; '.join(key_findings)}")
    if therapeutic_techniques:
        parts.append(f"Therapeutic techniques: {'; '.join(therapeutic_techniques)}")
    return "\n".join(parts)


def query_to_embedding_text(
    feedback_subject: str | None,
    feedback_content: str | None,
    issues: list[dict] | None = None,
) -> str:
    """Build the query text for similarity search from feedback context."""
    parts = []
    if feedback_subject:
        parts.append(f"Topic: {feedback_subject}")
    if feedback_content:
        parts.append(f"Context: {feedback_content[:500]}")
    if issues:
        issue_descs = []
        for issue in issues:
            desc = f"{issue.get('title', '')} ({issue.get('category', '')}, {issue.get('severity', '')})"
            if issue.get("description"):
                desc += f": {issue['description'][:200]}"
            issue_descs.append(desc)
        parts.append(f"Issues: {'; '.join(issue_descs)}")
    return "\n".join(parts) if parts else "therapeutic intervention children"
