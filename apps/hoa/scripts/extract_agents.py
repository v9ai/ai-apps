#!/usr/bin/env python3
"""Bootstrap agent-bundles/ from inline personas in source files.

Scans:
  backend/research_pipeline.py  - 24 spec-tuple personas + 3 recovery personas
  backend/regen_questions.py    - 3 debate personas (ADVOCATE/CRITIC/JUDGE)
  ../../crates/course-review/src/prompts.rs - 10 expert personas

Writes:
  apps/hoa/agent-bundles/<slug>/
    system_prompt.txt
    tools.json
    generation.json
    README.md

Run once to bootstrap. After this, agent-bundles/ is the source of truth.
"""

from __future__ import annotations

import ast
import json
import re
import sys
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parent.parent
BUNDLES_DIR = REPO / "agent-bundles"
BACKEND = REPO / "backend"
CRATES = REPO.parent.parent / "crates"

# ── Tool name mapping ─────────────────────────────────────────────────────
# Maps the TOOL_* or TOOLS_* identifier used in research_pipeline.py specs
# to the underlying tool name strings (matches _TOOL_FNS registry).
TOOL_IDENT_TO_NAMES: dict[str, list[str]] = {
    "TOOL_WEB_SEARCH": ["web_search"],
    "TOOL_WEB_NEWS": ["web_news_search"],
    "TOOL_FETCH_URL": ["fetch_url_content"],
    "TOOL_GITHUB": ["fetch_github_profile"],
    "TOOL_GITHUB_EXT": ["fetch_github_repos_extended"],
    "TOOL_ORCID": ["fetch_orcid_profile"],
    "TOOL_ACADEMIC": ["fetch_academic_profile"],
    "TOOL_ARXIV": ["search_arxiv"],
    "TOOL_SEMANTIC": ["search_semantic_scholar"],
    "TOOL_HF": ["fetch_hf_author"],
    "TOOL_VIDEO": ["video_search"],
    "TOOL_WIKIPEDIA": ["fetch_wikipedia_summary"],
    "TOOL_OPENALEX": ["search_openalex"],
    "TOOL_CHECK_URL": ["check_social_url"],
    "TOOL_BLOG_RSS": ["fetch_blog_rss"],
    "TOOL_BLOG_POST": ["fetch_blog_post_content"],
    "TOOLS_SEARCH": ["web_search", "fetch_url_content"],
    "TOOLS_NEWS": ["web_news_search", "web_search", "fetch_url_content"],
    "TOOLS_ACADEMIC": ["search_arxiv", "search_semantic_scholar", "search_openalex"],
    "TOOLS_VIDEO": ["video_search", "web_search", "fetch_url_content"],
    "TOOLS_BLOG": ["fetch_blog_rss", "fetch_blog_post_content", "web_search", "fetch_url_content"],
    "tools_search": ["web_search", "fetch_url_content"],
    "tools_news": ["web_news_search", "web_search", "fetch_url_content"],
    "tools_academic": ["search_arxiv", "search_semantic_scholar", "search_openalex"],
}


# ── Generation defaults ───────────────────────────────────────────────────
DEFAULT_GEN = {
    "model": "mlx-community/Qwen2.5-7B-Instruct-4bit",
    "fallback_model": "Qwen/Qwen2.5-72B-Instruct",
    "temperature": 0.2,
    "max_tokens": 4096,
}

# Per-slug generation overrides (agents that need non-default params).
GEN_OVERRIDES: dict[str, dict[str, Any]] = {
    "regen-advocate": {"temperature": 0.4, "max_tokens": 6000},
    "regen-critic": {"temperature": 0.3, "max_tokens": 4000},
    "regen-judge": {"temperature": 0.1, "max_tokens": 6000},
    "executive-summary": {"temperature": 0.15, "max_tokens": 2000},
    "quality-evaluator": {"temperature": 0.1, "max_tokens": 2000},
}


# ── Extraction: Python specs ──────────────────────────────────────────────

def _concat_str_expr(node: ast.AST) -> str | None:
    """Collapse implicit-concatenated or Add-concatenated string literals."""
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        l = _concat_str_expr(node.left)
        r = _concat_str_expr(node.right)
        if l is not None and r is not None:
            return l + r
    return None


def _tool_ref_to_names(node: ast.AST) -> list[str]:
    """Resolve a tools reference (Name or List literal) to tool name strings."""
    names: list[str] = []
    if isinstance(node, ast.Name):
        return list(TOOL_IDENT_TO_NAMES.get(node.id, []))
    if isinstance(node, ast.List):
        for elt in node.elts:
            if isinstance(elt, ast.Name):
                names.extend(TOOL_IDENT_TO_NAMES.get(elt.id, []))
        # dedupe preserving order
        seen: set[str] = set()
        out: list[str] = []
        for n in names:
            if n not in seen:
                seen.add(n)
                out.append(n)
        return out
    return names


def extract_pipeline_specs(source_path: Path) -> list[dict[str, Any]]:
    """Extract (slug, system_prompt, tools[]) from research_pipeline.py spec tuples."""
    tree = ast.parse(source_path.read_text())
    specs: list[dict[str, Any]] = []
    seen_slugs: set[str] = set()

    for node in ast.walk(tree):
        if not isinstance(node, ast.Tuple):
            continue
        if len(node.elts) != 4:
            continue
        slug_node = node.elts[0]
        if not (isinstance(slug_node, ast.Constant) and isinstance(slug_node.value, str)):
            continue
        slug = slug_node.value
        # basic shape check: slug is a simple identifier-like string
        if not re.fullmatch(r"[a-z][a-z0-9_]*", slug):
            continue
        persona = _concat_str_expr(node.elts[1])
        if persona is None or not persona.startswith("You "):
            continue
        if slug in seen_slugs:
            continue
        seen_slugs.add(slug)
        tools = _tool_ref_to_names(node.elts[3])
        specs.append({
            "slug": slug,
            "system_prompt": persona,
            "tools": tools,
            "source_file": "backend/research_pipeline.py",
        })
    return specs


def extract_run_agent_calls(source_path: Path) -> list[dict[str, Any]]:
    """Extract personas from `await _run_agent(client, (persona), (task), [tools])` calls.

    These are the 6 'direct' agents that don't use the spec-tuple form:
    quality-evaluator, executive-summary, interview-questions, timeline-recovery,
    quote-recovery, social-recovery.

    Slugs are assigned by line-number → label mapping since the source has no
    explicit slug at the call site.
    """
    # Line-number → (slug, optional tools override) for the 6 direct-call agents.
    # Lines chosen from grep of "You are" occurrences inside _run_agent calls.
    line_to_slug: dict[int, tuple[str, list[str] | None]] = {
        1605: ("quality-evaluator", []),
        1662: ("executive-summary", []),
        1818: ("interview-questions", []),
        1950: ("timeline-recovery", None),  # inferred from 4th arg
        1976: ("quote-recovery", None),
        1996: ("social-recovery", None),
    }

    tree = ast.parse(source_path.read_text())
    out: list[dict[str, Any]] = []
    for node in ast.walk(tree):
        if not (isinstance(node, ast.Call)
                and isinstance(node.func, ast.Name)
                and node.func.id == "_run_agent"):
            continue
        if len(node.args) < 3:
            continue
        persona = _concat_str_expr(node.args[1])
        if persona is None or not persona.startswith("You are"):
            continue
        # Match by the persona's starting line number
        persona_line = node.args[1].lineno
        slug_info = None
        for target_line, info in line_to_slug.items():
            if abs(persona_line - target_line) <= 2:
                slug_info = info
                break
        if slug_info is None:
            continue
        slug, tools_override = slug_info
        if tools_override is not None:
            tools = tools_override
        elif len(node.args) >= 4:
            tools = _tool_ref_to_names(node.args[3])
        else:
            tools = []
        out.append({
            "slug": slug,
            "system_prompt": persona,
            "tools": tools,
            "source_file": "backend/research_pipeline.py",
        })
    return out


def extract_module_constants(
    source_path: Path,
    constant_suffix: str = "_SYSTEM",
    slug_prefix: str = "",
    tools: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Extract top-level module constants named *_SYSTEM (e.g., ADVOCATE_SYSTEM)."""
    tree = ast.parse(source_path.read_text())
    out: list[dict[str, Any]] = []
    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        if len(node.targets) != 1 or not isinstance(node.targets[0], ast.Name):
            continue
        name = node.targets[0].id
        if not name.endswith(constant_suffix):
            continue
        value = _concat_str_expr(node.value)
        if value is None:
            continue
        base = name[: -len(constant_suffix)].lower()
        slug = f"{slug_prefix}{base}".replace("_", "-")
        out.append({
            "slug": slug,
            "system_prompt": value,
            "tools": list(tools or []),
            "source_file": str(source_path.relative_to(REPO)),
        })
    return out


# ── Extraction: Rust course-review prompts.rs ─────────────────────────────

RUST_FN_PATTERN = re.compile(
    r"fn\s+(?P<name>\w+)_system\(\)\s*->\s*String\s*\{\s*"
    r"(?P<body>\".*?\")\.to_string\(\)\s*\}",
    re.DOTALL,
)


def _unescape_rust_string(raw: str) -> str:
    """Turn a Rust `"..."`-with-backslash-continuations literal into plain text."""
    assert raw.startswith('"') and raw.endswith('"'), raw[:40]
    inner = raw[1:-1]
    # In Rust, `\` at end of line joins the next line *without* a newline,
    # and leading whitespace on the continuation is trimmed.
    inner = re.sub(r"\\\n\s*", "", inner)
    # Unescape standard sequences we use.
    inner = (
        inner
        .replace("\\n", "\n")
        .replace('\\"', '"')
        .replace("\\\\", "\\")
    )
    return inner


def extract_course_prompts(source_path: Path) -> list[dict[str, Any]]:
    """Extract (slug, system_prompt) from crates/course-review/src/prompts.rs."""
    text = source_path.read_text()
    out: list[dict[str, Any]] = []
    for m in RUST_FN_PATTERN.finditer(text):
        name = m.group("name")
        body = _unescape_rust_string(m.group("body"))
        slug = name.replace("_", "-")
        out.append({
            "slug": slug,
            "system_prompt": body.strip(),
            "tools": [],  # course-review agents don't use function calling
            "source_file": str(source_path.relative_to(REPO.parent.parent)),
            "family": "course",
        })
    return out


# ── Writing bundles ───────────────────────────────────────────────────────

def _gen_for(slug: str) -> dict[str, Any]:
    gen = dict(DEFAULT_GEN)
    gen.update(GEN_OVERRIDES.get(slug, {}))
    return gen


def _model_card(spec: dict[str, Any]) -> str:
    slug = spec["slug"]
    family = spec.get("family", "hoa")
    tools = spec.get("tools", [])
    tools_md = (
        "\n".join(f"- `{t}`" for t in tools) if tools else "_none (pure synthesis)_"
    )
    return f"""---
library_name: transformers
tags:
- qwen2.5
- prompt-engineering
- agent
- {family}
---

# {slug}

Qwen2.5-Instruct system prompt for the **{slug}** agent in the
[House of Agents](https://github.com/) monorepo (`apps/hoa` / `crates/course-review`).

This repo ships the agent's **persona** — a stable role description plus its
tool allow-list and generation defaults. Task prompts (the per-request
instruction) stay in application code, so this bundle composes with any
inference runtime: MLX locally, HF Inference API remotely, or vLLM.

## Files

| File | Purpose |
|------|---------|
| `system_prompt.txt` | Stable persona — loaded into the `system` role |
| `tools.json` | Ordered list of tool names this agent is allowed to invoke |
| `generation.json` | Default model, temperature, max_tokens, and HF fallback model |

## Tool allow-list

{tools_md}

## Usage (Python)

```python
from hf_agent import load_agent, resolve_tools

bundle = load_agent("{slug}", family="{family}")
# bundle.system_prompt, bundle.tools, bundle.generation are ready to use
```

## Usage (Rust)

```rust
let bundle = hf_agent::load_agent("{slug}", Family::{family.capitalize()})?;
println!("{{}}", bundle.system_prompt);
```

## Source

Extracted from `{spec.get('source_file', 'unknown')}`.
"""


def write_bundle(spec: dict[str, Any]) -> Path:
    slug_hyphen = spec["slug"].replace("_", "-")
    out_dir = BUNDLES_DIR / slug_hyphen
    out_dir.mkdir(parents=True, exist_ok=True)

    (out_dir / "system_prompt.txt").write_text(spec["system_prompt"].strip() + "\n")
    (out_dir / "tools.json").write_text(json.dumps(spec.get("tools", []), indent=2) + "\n")
    (out_dir / "generation.json").write_text(json.dumps(_gen_for(slug_hyphen), indent=2) + "\n")
    (out_dir / "README.md").write_text(_model_card({**spec, "slug": slug_hyphen}))
    return out_dir


def main() -> int:
    BUNDLES_DIR.mkdir(parents=True, exist_ok=True)

    specs: list[dict[str, Any]] = []

    # 1. research_pipeline.py — spec tuples (21 agents)
    pipeline_specs = extract_pipeline_specs(BACKEND / "research_pipeline.py")
    specs.extend(pipeline_specs)

    # 1b. research_pipeline.py — direct _run_agent() calls (6 more agents)
    direct_specs = extract_run_agent_calls(BACKEND / "research_pipeline.py")
    specs.extend(direct_specs)

    # 2. regen_questions.py — 3 debate personas (ADVOCATE/CRITIC/JUDGE)
    debate_specs = extract_module_constants(
        BACKEND / "regen_questions.py",
        constant_suffix="_SYSTEM",
        slug_prefix="regen-",
    )
    specs.extend(debate_specs)

    # 3. course-review/src/prompts.rs — 10 expert personas
    rust_specs = extract_course_prompts(CRATES / "course-review" / "src" / "prompts.rs")
    specs.extend(rust_specs)

    # write bundles
    written: list[str] = []
    for spec in specs:
        path = write_bundle(spec)
        written.append(path.name)

    print(f"Wrote {len(written)} bundles to {BUNDLES_DIR}:")
    for name in sorted(written):
        print(f"  - {name}")

    # sanity: count by family
    hoa = [s for s in specs if s.get("family", "hoa") == "hoa"]
    course = [s for s in specs if s.get("family") == "course"]
    print(f"\nhoa family: {len(hoa)}")
    print(f"course family: {len(course)}")
    print(f"total: {len(specs)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
