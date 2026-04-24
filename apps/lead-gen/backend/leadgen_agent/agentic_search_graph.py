"""Agentic codebase search graph: DeepSeek-driven glob/grep/read tool loop.

Port of the former ``crates/agentic-search`` Rust crate. Two flows share the same
three-tool hierarchy (glob → grep → read):

* ``search``   — decompose a natural-language query into N parallel angles, run
  a tool-calling worker per angle, synthesize findings into one answer with
  file:line citations.
* ``discover`` — scan the codebase across predefined stack groups (API,
  Database, AI/ML, Observability, Workers, Background Jobs, Evaluation,
  Frontend) and emit rich stack metadata JSON suitable for the stack page.

The tool hierarchy is intentionally cost-aware:
    glob  — near-zero cost, returns paths only (caps at 300)
    grep  — lightweight, file:line matches (caps at 200)
    read  — heavy, full file with line numbers (caps at 300 lines)

Why a custom loop instead of ``create_react_agent`` / ``ToolNode``: the default
target is local ``mlx_lm.server`` which does not reliably emit OpenAI
tool-call deltas. We force JSON output and parse ``{"tool","args"}`` /
``{"answer"}`` via :func:`ainvoke_json`, which is robust to markdown fences and
``<think>`` blocks. When ``provider="deepseek"`` is used, DeepSeek's native
tool-calling is used via ``llm.bind_tools(...)``.

CLI:
    python -m leadgen_agent.agentic_search_graph search "<query>" [--root PATH] [--workers 3] [--max-turns 8]
    python -m leadgen_agent.agentic_search_graph discover [--root PATH] [--output out.json] [--max-turns 10]

Requires: langchain-openai, langgraph, python-dotenv (all already in backend
deps). Optionally shells out to ``rg`` for faster grep; falls back to a pure
Python regex walker if ``rg`` is not on PATH.
"""

# Requires: langgraph, langchain-openai, python-dotenv (all already in backend).
#           Optional: ripgrep (`rg`) for faster grep — falls back to pure Python.

from __future__ import annotations

import argparse
import asyncio
import fnmatch
import json
import logging
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from .llm import ainvoke_json, make_llm

log = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────

GLOB_CAP = 300
GREP_CAP = 200
READ_CAP = 300

EXCLUDED_DIR_NAMES = {
    "node_modules",
    "target",
    ".git",
    ".next",
    "dist",
    "__generated__",
    "__pycache__",
    ".venv",
    "venv",
}


# ── Tool implementations ─────────────────────────────────────────────────────


def _is_excluded(rel: Path) -> bool:
    """Match the Rust crate's exclusion rules: skip build outputs + dotdirs."""
    for part in rel.parts:
        if part in EXCLUDED_DIR_NAMES:
            return True
        if part.startswith("."):
            return True
    return False


def glob_search(pattern: str, root: Path) -> list[str]:
    """Match file paths by glob pattern relative to ``root``.

    Uses :meth:`pathlib.Path.glob` (supports ``**`` for recursion). Returns
    POSIX-style relative paths, sorted for stability.
    """
    try:
        root = root.resolve()
    except OSError:
        pass
    try:
        hits = list(root.glob(pattern))
    except (ValueError, OSError) as exc:
        log.warning("glob pattern %r failed: %s", pattern, exc)
        return []

    results: list[str] = []
    for p in hits:
        if not p.is_file():
            continue
        try:
            rel = p.relative_to(root)
        except ValueError:
            continue
        if _is_excluded(rel):
            continue
        results.append(rel.as_posix())
    results.sort()
    return results


@dataclass
class GrepMatch:
    file: str
    line: int
    content: str


def _has_ripgrep() -> bool:
    try:
        subprocess.run(
            ["rg", "--version"],
            check=True,
            capture_output=True,
            timeout=3,
        )
        return True
    except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return False


def _grep_ripgrep(pattern: str, glob_filter: str | None, root: Path) -> list[GrepMatch]:
    cmd = ["rg", "--no-heading", "--line-number", "--color=never", "--max-count", str(GREP_CAP)]
    for name in EXCLUDED_DIR_NAMES:
        cmd.extend(["--glob", f"!**/{name}/**"])
    if glob_filter:
        cmd.extend(["--glob", glob_filter])
    cmd.extend(["-e", pattern, "."])
    try:
        res = subprocess.run(
            cmd,
            cwd=str(root),
            capture_output=True,
            text=True,
            timeout=30,
        )
    except (subprocess.TimeoutExpired, OSError) as exc:
        log.warning("ripgrep failed, falling back to python: %s", exc)
        return _grep_python(pattern, glob_filter, root)

    results: list[GrepMatch] = []
    for raw in res.stdout.splitlines():
        # Format: path:line:content
        parts = raw.split(":", 2)
        if len(parts) < 3:
            continue
        file_, line_str, content = parts
        try:
            line = int(line_str)
        except ValueError:
            continue
        # Strip leading ./ that rg includes
        if file_.startswith("./"):
            file_ = file_[2:]
        results.append(GrepMatch(file=file_, line=line, content=content.strip()))
        if len(results) >= GREP_CAP:
            break
    return results


def _matches_glob(rel: Path, pattern: str) -> bool:
    rel_str = rel.as_posix()
    return fnmatch.fnmatch(rel_str, pattern) or fnmatch.fnmatch(rel.name, pattern)


def _grep_python(pattern: str, glob_filter: str | None, root: Path) -> list[GrepMatch]:
    try:
        regex = re.compile(pattern)
    except re.error as exc:
        log.warning("invalid grep pattern %r: %s", pattern, exc)
        return []

    results: list[GrepMatch] = []
    for dirpath, dirnames, filenames in os.walk(root):
        # In-place prune of excluded dirs
        dirnames[:] = [d for d in dirnames if d not in EXCLUDED_DIR_NAMES and not d.startswith(".")]
        dir_path = Path(dirpath)
        for fname in filenames:
            file_path = dir_path / fname
            try:
                rel = file_path.relative_to(root)
            except ValueError:
                continue
            if glob_filter and not _matches_glob(rel, glob_filter):
                continue
            try:
                with file_path.open("r", encoding="utf-8", errors="strict") as fh:
                    for i, line in enumerate(fh, start=1):
                        if regex.search(line):
                            results.append(
                                GrepMatch(
                                    file=rel.as_posix(),
                                    line=i,
                                    content=line.rstrip("\n").strip(),
                                )
                            )
                            if len(results) >= GREP_CAP:
                                return results
            except (OSError, UnicodeDecodeError):
                continue
    return results


def grep_search(pattern: str, glob_filter: str | None, root: Path) -> list[GrepMatch]:
    """Regex content search. Prefers ``rg`` when available, else pure Python."""
    try:
        root = root.resolve()
    except OSError:
        pass
    if _has_ripgrep():
        return _grep_ripgrep(pattern, glob_filter, root)
    return _grep_python(pattern, glob_filter, root)


def read_file(path: str, root: Path) -> str:
    """Read a file with line numbers. Caps at ``READ_CAP`` lines."""
    p = Path(path)
    full = p if p.is_absolute() else root / p
    try:
        text = full.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        return f"cannot read {full}: {exc}"

    lines = text.splitlines()
    capped = len(lines) > READ_CAP
    shown = lines[:READ_CAP]
    numbered = "\n".join(f"{i + 1:>4}\t{line}" for i, line in enumerate(shown))
    if capped:
        numbered += (
            f"\n… truncated at {READ_CAP} lines (file has {len(lines)} total) "
            "— use grep for specific content"
        )
    return numbered


def execute_tool(name: str, args: dict[str, Any], root: Path) -> str:
    """Dispatch a single tool call — matches the Rust ``tools::execute`` shape."""
    if name == "glob":
        pattern = str(args.get("pattern") or "**/*")
        paths = glob_search(pattern, root)
        if not paths:
            return "No files matched."
        capped = len(paths) > GLOB_CAP
        shown = paths[:GLOB_CAP]
        out = f"{len(paths)} files:\n" + "\n".join(shown)
        if capped:
            out += f"\n… showing first {GLOB_CAP} — use a more specific pattern"
        return out

    if name == "grep":
        pattern = str(args.get("pattern") or "")
        glob_filter = args.get("glob")
        glob_filter_str: str | None = str(glob_filter) if glob_filter else None
        matches = grep_search(pattern, glob_filter_str, root)
        if not matches:
            return "No matches."
        capped = len(matches) >= GREP_CAP
        out = "\n".join(f"{m.file}:{m.line}: {m.content}" for m in matches)
        if capped:
            out += "\n… capped at 200 — refine the pattern"
        return out

    if name == "read":
        return read_file(str(args.get("path") or ""), root)

    return f"unknown tool: {name}"


# ── Tool schema (for prompt-driven JSON loop) ────────────────────────────────

TOOLS_DOC = (
    "Available tools (cheapest-first: glob → grep → read):\n"
    "- glob(pattern)          — match file paths. Near-zero cost. Example: 'src/**/*.ts'.\n"
    "- grep(pattern, glob?)   — regex content search. Lightweight. Returns file:line:content.\n"
    "- read(path)             — full file with line numbers. Heavy. Only after glob/grep.\n"
)

STEP_INSTRUCTION = (
    "Return JSON only, one of two shapes:\n"
    '  {"tool": "glob"|"grep"|"read", "args": {"pattern": "..."} | {"pattern": "...", "glob": "..."} | {"path": "..."}}\n'
    '  {"answer": "<final findings with file:line references>"}\n'
    "Emit `answer` as soon as you can support concrete file:line citations."
)


# ── State types ──────────────────────────────────────────────────────────────


class AgenticSearchState(TypedDict, total=False):
    """State for the ``search`` flow."""

    query: str
    root: str
    workers: int
    max_turns: int
    sub_queries: list[dict[str, str]]
    findings: list[dict[str, str]]
    answer: str


class DiscoveryState(TypedDict, total=False):
    """State for the ``discover`` flow."""

    root: str
    max_turns: int
    groups: list[dict[str, Any]]
    output: dict[str, Any]


# ── Discovery targets (one parallel worker per group) ────────────────────────


@dataclass(frozen=True)
class DiscoveryTarget:
    label: str
    color: str
    technologies: str
    hints: str


DISCOVERY_TARGETS: tuple[DiscoveryTarget, ...] = (
    DiscoveryTarget(
        label="API",
        color="blue",
        technologies="Apollo Server 5, GraphQL, Vercel routes",
        hints=(
            "Glob schema/**/*.graphql and count types/queries/mutations. "
            "Glob src/app/api/**/* to list API routes. "
            "Read src/apollo/context.ts. Read vercel.json for timeout config."
        ),
    ),
    DiscoveryTarget(
        label="Database",
        color="cyan",
        technologies="Neon PostgreSQL, Drizzle ORM",
        hints=(
            "Read src/db/schema.ts and count table definitions. "
            "Glob migrations/*.sql and count files. "
            "Grep for 'hasMore' to find pagination patterns. "
            "Look for Drizzle + Neon integration sites."
        ),
    ),
    DiscoveryTarget(
        label="AI / ML",
        color="orange",
        technologies="DeepSeek, Anthropic Claude, Vercel AI SDK, OpenRouter",
        hints=(
            "Read package.json for AI SDK versions. Glob src/agents/**/* and count agents. "
            "Glob src/anthropic/**/* for Claude integrations. "
            "Grep for 'deepseek' and 'claude' in src/ to find usage sites. "
            "Check src/observability/prompts.ts for eval-first patterns. "
            "Look for multi-model routing patterns across agents."
        ),
    ),
    DiscoveryTarget(
        label="Observability",
        color="green",
        technologies="LangSmith",
        hints=(
            "Read .env.example for LANGCHAIN_ vars. "
            "Read .claude/hooks/stop_hook.py for scoring pipeline. "
            "Check package.json for observability deps."
        ),
    ),
    DiscoveryTarget(
        label="Workers",
        color="amber",
        technologies="Background workers, Rust/WASM, Python services",
        hints=(
            "Glob workers/**/wrangler*.toml and read each one for: runtime, cron triggers, "
            "queue bindings, DB bindings. Count source files in each worker directory. "
            "Look for language choice rationale (Rust for CPU-bound, Python for LLM, TS for I/O)."
        ),
    ),
    DiscoveryTarget(
        label="Background Jobs",
        color="indigo",
        technologies="Cron + Queues",
        hints=(
            "Check wrangler.toml files for cron triggers and queue bindings. "
            "Grep for 'scheduled' in workers/ to find cron handlers. "
            "Check workers/ directory for background job implementations."
        ),
    ),
    DiscoveryTarget(
        label="Evaluation",
        color="crimson",
        technologies="Promptfoo, Vitest",
        hints=(
            "Glob src/evals/**/*.ts and list eval files. "
            "Read src/evals/ files to find what each tests. "
            "Check package.json for promptfoo and vitest versions. "
            "Look for promptfoo config files in the root."
        ),
    ),
    DiscoveryTarget(
        label="Frontend",
        color="violet",
        technologies="Next.js, React, Radix UI (Themes + Icons), Better Auth",
        hints=(
            "Read package.json for exact versions. Glob src/app/**/* to count routes. "
            "Glob src/components/**/* to count components. Read next.config.ts and vercel.json."
        ),
    ),
)


# ── Generic tool-loop (JSON protocol, no native tool-calling required) ───────


async def _tool_loop(
    *,
    system: str,
    user: str,
    root: Path,
    max_turns: int,
    label: str,
    provider: str | None = None,
) -> str:
    """Run a DeepSeek tool-calling loop. Returns the final text answer.

    Uses the JSON protocol documented in :data:`STEP_INSTRUCTION` so it works
    against both DeepSeek (which supports native tool calls) and local MLX
    (which does not). On the last turn, tool calls are suppressed — the model
    is forced to emit ``{"answer": ...}``.
    """
    llm = make_llm(provider=provider)
    transcript: list[str] = [f"Task: {user}"]

    for turn in range(max_turns):
        is_last = turn == max_turns - 1
        instruction = STEP_INSTRUCTION
        if is_last:
            instruction = (
                "You have gathered enough information. Do not call any more tools. "
                'Return JSON {"answer": "<final findings with file:line references>"} only.'
            )
        result = await ainvoke_json(
            llm,
            [
                {"role": "system", "content": f"{system}\n\n{TOOLS_DOC}\n{instruction}"},
                {"role": "user", "content": "\n\n".join(transcript)},
            ],
            provider=provider,
        )
        if not isinstance(result, dict):
            return str(result)
        if "answer" in result:
            return str(result["answer"])
        tool = str(result.get("tool") or "")
        args = result.get("args") or {}
        if not isinstance(args, dict):
            args = {}
        log.info("[%s] turn %d/%d tool=%s", label, turn + 1, max_turns, tool or "<none>")
        observation = execute_tool(tool, args, root)
        # Truncate runaway observations so the context window stays sane.
        if len(observation) > 8000:
            observation = observation[:8000] + "\n… (observation truncated)"
        transcript.append(f"Tool {tool}({args}) returned:\n{observation}")

    # Fell through without an answer — return the last observation as best effort.
    return transcript[-1] if transcript else ""


# ── Search flow: decompose → workers (parallel) → synthesize ────────────────


async def decompose_node(state: AgenticSearchState) -> dict:
    query = (state.get("query") or "").strip()
    workers = int(state.get("workers") or 3)
    if not query:
        return {"sub_queries": []}

    llm = make_llm(provider="deepseek")
    system = (
        f"You decompose a codebase search query into up to {workers} parallel, independent "
        "sub-queries. Each sub-query investigates a different angle simultaneously. "
        'Return JSON {"sub_queries": [{"angle": "short label", "query": "focused NL query"}]}. '
        "Make angles non-overlapping so workers don't duplicate work."
    )
    result = await ainvoke_json(
        llm,
        [
            {"role": "system", "content": system},
            {"role": "user", "content": query},
        ],
        provider="deepseek",
    )
    sub_queries: list[dict[str, str]] = []
    if isinstance(result, dict):
        raw = result.get("sub_queries")
        if isinstance(raw, list):
            for item in raw:
                if isinstance(item, dict):
                    angle = str(item.get("angle") or "").strip()
                    sub_query = str(item.get("query") or "").strip()
                    if angle and sub_query:
                        sub_queries.append({"angle": angle, "query": sub_query})
    elif isinstance(result, list):
        # Some models respond with a bare array; accept it.
        for item in result:
            if isinstance(item, dict):
                angle = str(item.get("angle") or "").strip()
                sub_query = str(item.get("query") or "").strip()
                if angle and sub_query:
                    sub_queries.append({"angle": angle, "query": sub_query})

    if not sub_queries:
        # Fallback: single worker with the raw query.
        sub_queries = [{"angle": "General", "query": query}]

    # Clamp to requested worker count.
    sub_queries = sub_queries[: max(1, workers)]
    log.info("decomposed into %d workers: %s", len(sub_queries), [s["angle"] for s in sub_queries])
    return {"sub_queries": sub_queries}


async def _run_worker(
    angle: str,
    sub_query: str,
    root: Path,
    max_turns: int,
) -> dict[str, str]:
    system = (
        f'You are a parallel codebase search worker.\n'
        f'Your angle: "{angle}".\n'
        f"Project root: {root}\n"
        "Use tools cheapest-first — glob (near-zero) before grep (lightweight) before read (heavy). "
        "Be focused. Return all relevant findings with file:line references."
    )
    try:
        findings = await _tool_loop(
            system=system,
            user=sub_query,
            root=root,
            max_turns=max_turns,
            label=angle,
            provider="deepseek",
        )
    except Exception as exc:  # noqa: BLE001
        log.warning("[%s] worker error: %s", angle, exc)
        findings = f"worker error: {exc}"
    return {"angle": angle, "findings": findings}


async def workers_node(state: AgenticSearchState) -> dict:
    sub_queries = state.get("sub_queries") or []
    root = Path(state.get("root") or ".").resolve()
    max_turns = int(state.get("max_turns") or 8)

    if not sub_queries:
        return {"findings": []}

    tasks = [
        _run_worker(sq["angle"], sq["query"], root, max_turns)
        for sq in sub_queries
    ]
    findings = await asyncio.gather(*tasks)
    for f in findings:
        log.info("[%s] findings received (%d chars)", f["angle"], len(f["findings"]))
    return {"findings": list(findings)}


async def synthesize_node(state: AgenticSearchState) -> dict:
    query = state.get("query") or ""
    findings = state.get("findings") or []
    if not findings:
        return {"answer": ""}

    findings_text = "\n\n---\n\n".join(
        f"### {f['angle']} angle\n{f['findings']}" for f in findings
    )

    llm = make_llm(provider="deepseek")
    system = (
        "You are a synthesis agent. Multiple parallel workers each investigated a different "
        "angle of a codebase search query. Merge their findings into one concise, deduplicated "
        'answer with file:line references. Return JSON {"answer": "..."}. '
        "Highlight the most important findings first. Avoid repetition."
    )
    user = f"Original query: {query}\n\nParallel worker findings:\n\n{findings_text}"
    result = await ainvoke_json(
        llm,
        [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        provider="deepseek",
    )
    answer = ""
    if isinstance(result, dict):
        answer = str(result.get("answer") or "")
    elif isinstance(result, str):
        answer = result
    return {"answer": answer}


def build_search_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(AgenticSearchState)
    builder.add_node("decompose", decompose_node)
    builder.add_node("workers", workers_node)
    builder.add_node("synthesize", synthesize_node)
    builder.add_edge(START, "decompose")
    builder.add_edge("decompose", "workers")
    builder.add_edge("workers", "synthesize")
    builder.add_edge("synthesize", END)
    return builder.compile(checkpointer=checkpointer)


# ── Discovery flow: parallel workers → collect → emit ───────────────────────


def _discovery_system_prompt(target: DiscoveryTarget, root: Path) -> str:
    return (
        f'You are a codebase discovery agent investigating the "{target.label}" layer.\n'
        f"Technologies: {target.technologies}\n"
        f"Project root: {root}\n\n"
        "INSTRUCTIONS:\n"
        "1. Use glob to find relevant files (cheap — do this first)\n"
        "2. Use grep to find versions, config values, usage patterns (lightweight)\n"
        "3. Use read to confirm details only in the most important files (expensive)\n"
        "4. Discover REAL data: actual versions from package.json, actual file counts,\n"
        "   actual cron schedules, actual table names, actual env var names.\n"
        "5. For each entry, find the EXACT files and line numbers where that technology is used.\n"
        "6. Reason about WHY this technology was chosen based on code evidence.\n"
        "7. Identify design patterns visible in the implementation.\n"
        "8. Write 3-5 interview talking points — concise, opinionated, experience-based.\n"
        "9. Document gotchas — surprising behaviours, non-obvious pitfalls.\n"
        "10. Note security considerations specific to this technology in this project.\n"
        "11. Note observable performance characteristics — latency, cold-start, batch vs single.\n"
        '12. When done, respond with {"answer": "<JSON object>"} where <JSON object> matches the '
        "OUTPUT SCHEMA below.\n\n"
        "OUTPUT SCHEMA (the JSON payload inside answer must match):\n"
        "{\n"
        f'  "label": "{target.label}",\n'
        f'  "color": "{target.color}",\n'
        '  "entries": [\n'
        "    {\n"
        '      "name": "Technology name with version",\n'
        '      "version": "x.y.z or null",\n'
        '      "role": "One-line role in this project",\n'
        '      "url": "https://official-site.com or null",\n'
        '      "details": "2-3 sentences on actual usage",\n'
        '      "facts": ["Concrete discovered fact with numbers"],\n'
        '      "source_locations": [{"path": "src/x.ts", "line": 1, "note": "why"}],\n'
        '      "why_chosen": "1-2 sentences on WHY this tech was chosen",\n'
        '      "pros": ["Advantage 1"],\n'
        '      "cons": ["Drawback 1"],\n'
        '      "alternatives_considered": [{"name": "Alt", "reason_not_chosen": "..."}],\n'
        '      "trade_offs": ["Trade-off 1"],\n'
        '      "patterns_used": ["Pattern 1"],\n'
        '      "interview_points": ["Talking point"],\n'
        '      "gotchas": ["Non-obvious pitfall"],\n'
        '      "security_considerations": ["Security aspect"],\n'
        '      "performance_notes": ["Observable perf characteristic"]\n'
        "    }\n"
        "  ]\n"
        "}"
    )


def _parse_group_json(raw: str, target: DiscoveryTarget) -> dict[str, Any]:
    """Parse a discovery group JSON payload with markdown-fence tolerance."""
    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[len("```json") :].strip()
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:].strip()
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3].strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        log.warning("[%s] could not parse discovery JSON: %s", target.label, exc)
        parsed = None

    if isinstance(parsed, dict) and isinstance(parsed.get("entries"), list):
        parsed.setdefault("label", target.label)
        parsed.setdefault("color", target.color)
        return parsed

    return {
        "label": target.label,
        "color": target.color,
        "entries": [
            {
                "name": f"{target.label} (discovery failed)",
                "role": "See hardcoded fallback in stack page",
                "details": (cleaned[:300] if cleaned else "no content"),
                "facts": [],
            }
        ],
    }


async def _run_discovery_worker(target: DiscoveryTarget, root: Path, max_turns: int) -> dict[str, Any]:
    system = _discovery_system_prompt(target, root)
    user = f"Investigate the {target.label} layer. Search hints: {target.hints}"
    try:
        raw = await _tool_loop(
            system=system,
            user=user,
            root=root,
            max_turns=max_turns,
            label=target.label,
            provider="deepseek",
        )
    except Exception as exc:  # noqa: BLE001
        log.warning("[%s] discovery failed: %s", target.label, exc)
        return {
            "label": target.label,
            "color": target.color,
            "entries": [
                {
                    "name": f"{target.label} (discovery failed)",
                    "role": "See hardcoded fallback",
                    "details": f"Error: {exc}",
                    "facts": [],
                }
            ],
        }
    return _parse_group_json(raw, target)


async def discovery_node(state: DiscoveryState) -> dict:
    root = Path(state.get("root") or ".").resolve()
    max_turns = int(state.get("max_turns") or 10)
    log.info("starting self-discovery across %d parallel workers", len(DISCOVERY_TARGETS))

    tasks = [_run_discovery_worker(t, root, max_turns) for t in DISCOVERY_TARGETS]
    groups = await asyncio.gather(*tasks)
    for g in groups:
        log.info("[%s] completed — %d entries", g.get("label"), len(g.get("entries") or []))

    output = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "root": str(root),
        "groups": list(groups),
    }
    return {"groups": list(groups), "output": output}


def build_discovery_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(DiscoveryState)
    builder.add_node("discover", discovery_node)
    builder.add_edge(START, "discover")
    builder.add_edge("discover", END)
    return builder.compile(checkpointer=checkpointer)


# Default export — LangGraph Studio picks up the `graph` name by convention.
# The `search` flow is the primary entrypoint; `discovery_graph` is also exposed.
graph = build_search_graph()
discovery_graph = build_discovery_graph()


# ── CLI ──────────────────────────────────────────────────────────────────────


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="agentic_search_graph",
        description=(
            "Parallel agentic codebase search driven by DeepSeek. "
            "Tool hierarchy: glob (near-zero) → grep (lightweight) → read (heavy)."
        ),
    )
    sub = parser.add_subparsers(dest="command", required=True)

    search = sub.add_parser("search", help="Natural-language search across the codebase")
    search.add_argument("query", nargs="+", help="Natural language query")
    search.add_argument("--root", default=".", help="Root directory to search (default: CWD)")
    search.add_argument("-w", "--workers", type=int, default=3, help="Number of parallel workers")
    search.add_argument("--max-turns", type=int, default=8, help="Max tool-use turns per worker")

    disc = sub.add_parser("discover", help="Scan codebase and emit stack metadata JSON")
    disc.add_argument("--root", default=".", help="Root directory to scan (default: CWD)")
    disc.add_argument("-o", "--output", default=None, help="Output file path (default: stdout)")
    disc.add_argument("--max-turns", type=int, default=10, help="Max tool-use turns per worker")

    return parser.parse_args(argv)


async def _cli_search(args: argparse.Namespace) -> int:
    query = " ".join(args.query).strip()
    if not query:
        sys.stderr.write("Usage: agentic_search_graph search <query>\n")
        return 1
    state: AgenticSearchState = {
        "query": query,
        "root": args.root,
        "workers": args.workers,
        "max_turns": args.max_turns,
    }
    result = await graph.ainvoke(state)
    sys.stdout.write((result.get("answer") or "") + "\n")
    return 0


async def _cli_discover(args: argparse.Namespace) -> int:
    state: DiscoveryState = {
        "root": args.root,
        "max_turns": args.max_turns,
    }
    result = await discovery_graph.ainvoke(state)
    output = result.get("output") or {}
    payload = json.dumps(output, indent=2)
    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(payload, encoding="utf-8")
        sys.stderr.write(f"Discovery written to {out_path}\n")
    else:
        sys.stdout.write(payload + "\n")
    return 0


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(
        level=os.environ.get("SEARCH_LOG", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    args = _parse_args(argv)
    if args.command == "search":
        return asyncio.run(_cli_search(args))
    if args.command == "discover":
        return asyncio.run(_cli_discover(args))
    sys.stderr.write(f"Unknown command: {args.command}\n")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
