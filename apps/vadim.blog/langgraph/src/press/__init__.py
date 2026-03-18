"""Press — LangGraph content pipeline."""

import re

# Common English stop words to strip from SEO-optimized slugs
_STOP_WORDS = frozenset({
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "as", "that", "this", "it", "its", "how", "what", "why", "when", "where",
    "your", "our", "their", "my", "his", "her", "do", "does", "did", "not",
    "will", "can", "may", "up", "more", "than", "into", "about", "after",
    "before", "which", "who", "all", "has", "have", "had", "so", "we",
})


def slugify(s: str) -> str:
    """Convert a title/string into a URL-safe slug."""
    raw = "".join(c.lower() if c.isalnum() else "-" for c in s)
    return "-".join(part for part in raw.split("-") if part)


def slugify_seo(title: str, max_words: int = 6) -> str:
    """SEO-optimized slug: strip stop words and limit word count."""
    raw = "".join(c.lower() if c.isalnum() else " " for c in title)
    words = [w for w in raw.split() if w and w not in _STOP_WORDS]
    return "-".join(words[:max_words]) or slugify(title)


def extract_seo_slug(seo_output: str) -> str | None:
    """Extract the URL Slug recommendation from an SEO strategy string.

    Matches lines like:
      - **URL Slug**: remote-work-productivity-data
      - **URL Slug**: `remote-work-productivity-data` — description
    """
    m = re.search(
        r"\*\*URL\s+Slug\*\*\s*:\s*`?([a-z][a-z0-9-]{2,79}[a-z0-9])`?",
        seo_output,
        re.IGNORECASE,
    )
    return m.group(1).lower() if m else None


def strip_fences(s: str) -> str:
    """Strip leading ```<tag> and trailing ``` markdown fences."""
    trimmed = s.strip()
    if trimmed.startswith("```"):
        nl = trimmed.find("\n")
        body = trimmed[nl + 1 :] if nl != -1 else trimmed
    else:
        body = trimmed
    if body.endswith("```"):
        body = body[: -3]
    return body.strip()


def extract_published_content(editor_output: str, draft: str) -> str:
    """Extract the published article from editor output, falling back to draft."""
    if "---\n" in editor_output and "status: published" in editor_output:
        idx = editor_output.find("---\n")
        if idx is not None:
            return editor_output[idx:]
    return draft


def strip_frontmatter(md: str) -> str:
    """Remove YAML frontmatter block from markdown, return body only."""
    stripped = md.lstrip()
    if stripped.startswith("---"):
        parts = stripped.split("---", 2)
        if len(parts) >= 3:
            return parts[2].strip()
    return md.strip()


def html_to_text(html: str) -> str:
    """Strip HTML tags and decode common entities."""
    text = re.sub(r"<style[^>]*>.*?</style>", " ", html, flags=re.S)
    text = re.sub(r"<script[^>]*>.*?</script>", " ", text, flags=re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    for entity, char in [
        ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"),
        ("&nbsp;", " "), ("&#39;", "'"), ("&quot;", '"'),
    ]:
        text = text.replace(entity, char)
    return re.sub(r"\s+", " ", text).strip()
