"""Load Qwen agent bundles (system prompt + tools + generation config) by slug.

Each bundle is a small HF model repo under `v9ai/qwen-hoa-<slug>` or
`v9ai/qwen-course-<slug>` containing:

    system_prompt.txt   - stable persona for the agent
    tools.json          - list of tool names the agent may call
    generation.json     - {model, temperature, max_tokens}
    README.md           - model card

The loader prefers a local checkout at `apps/hoa/agent-bundles/<slug>/`
(fast dev loop) and falls back to `huggingface_hub.snapshot_download()`.

Usage:
    bundle = load_agent("biography-writer")
    print(bundle.system_prompt)
    tools = resolve_tools(bundle, tool_registry)
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any, Mapping, Optional

HF_ORG = os.environ.get("HF_AGENT_ORG", "vadimnicolai")
HOA_PREFIX = "qwen-hoa-"
COURSE_PREFIX = "qwen-course-"

_REPO_ROOT = Path(__file__).resolve().parent.parent
LOCAL_BUNDLES_DIR = _REPO_ROOT / "agent-bundles"


@dataclass
class AgentBundle:
    slug: str
    system_prompt: str
    tools: list[str] = field(default_factory=list)
    generation: dict[str, Any] = field(default_factory=dict)
    source: str = "local"


def _bundle_repo_id(slug: str, family: str = "hoa") -> str:
    prefix = COURSE_PREFIX if family == "course" else HOA_PREFIX
    return f"{HF_ORG}/{prefix}{slug}"


def _read_bundle(dir_path: Path, slug: str, source: str) -> AgentBundle:
    system_prompt = (dir_path / "system_prompt.txt").read_text().strip()
    tools_path = dir_path / "tools.json"
    tools = json.loads(tools_path.read_text()) if tools_path.exists() else []
    gen_path = dir_path / "generation.json"
    generation = json.loads(gen_path.read_text()) if gen_path.exists() else {}
    return AgentBundle(
        slug=slug,
        system_prompt=system_prompt,
        tools=tools,
        generation=generation,
        source=source,
    )


@lru_cache(maxsize=128)
def load_agent(slug: str, family: str = "hoa") -> AgentBundle:
    """Load an agent bundle by slug. Tries local dir first, then HF Hub.

    Slug uses hyphens (matches HF repo naming). Accept underscores as a
    convenience — they're normalized to hyphens before lookup.
    """
    slug = slug.replace("_", "-")
    local = LOCAL_BUNDLES_DIR / slug
    if local.is_dir() and (local / "system_prompt.txt").is_file():
        return _read_bundle(local, slug, source=f"local:{local}")

    from huggingface_hub import snapshot_download

    repo_id = _bundle_repo_id(slug, family=family)
    path = Path(snapshot_download(repo_id, repo_type="model"))
    return _read_bundle(path, slug, source=f"hf:{repo_id}")


def resolve_tools(bundle: AgentBundle, registry: Mapping[str, Any]) -> list[Any]:
    """Turn bundle's tool-name list into FunctionTool objects from a registry."""
    resolved: list[Any] = []
    missing: list[str] = []
    for name in bundle.tools:
        tool = registry.get(name)
        if tool is None:
            missing.append(name)
        else:
            resolved.append(tool)
    if missing:
        raise KeyError(
            f"Agent '{bundle.slug}' requires tools not in registry: {missing}. "
            f"Available: {sorted(registry)}"
        )
    return resolved


def available_slugs(family: str = "hoa") -> list[str]:
    """Enumerate local bundle slugs. Useful for extract/upload scripts."""
    if not LOCAL_BUNDLES_DIR.is_dir():
        return []
    prefix = COURSE_PREFIX.rstrip("-") if family == "course" else HOA_PREFIX.rstrip("-")
    out = []
    for p in sorted(LOCAL_BUNDLES_DIR.iterdir()):
        if p.is_dir() and (p / "system_prompt.txt").is_file():
            out.append(p.name)
    return out


__all__ = [
    "AgentBundle",
    "HF_ORG",
    "HOA_PREFIX",
    "COURSE_PREFIX",
    "LOCAL_BUNDLES_DIR",
    "load_agent",
    "resolve_tools",
    "available_slugs",
]
