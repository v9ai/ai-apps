"""Press — LangGraph content pipeline."""


def slugify(s: str) -> str:
    """Convert a title/string into a URL-safe slug."""
    raw = "".join(c.lower() if c.isalnum() else "-" for c in s)
    return "-".join(part for part in raw.split("-") if part)


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
