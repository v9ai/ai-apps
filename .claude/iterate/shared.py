#!/usr/bin/env python3
"""Shared constants and helpers for the iterate pipeline."""
from __future__ import annotations

import re

ALL_METRIC_NAMES = [
    "Task Completion",
    "Incremental Progress",
    "Coherence",
    "Code Quality",
    "Focus",
    "Answer Relevancy",
    "Faithfulness",
    "Contextual Relevancy",
]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two embedding vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a < 1e-9 or norm_b < 1e-9:
        return 0.0
    return dot / (norm_a * norm_b)


def extract_errors(content: str) -> list[str]:
    """Extract error-like lines from actual error output (not prose)."""
    patterns = [
        r'^(?:error|Error|ERROR):[ \t]+\S.*',
        r'^(?:error)\[E\d+\]:.*',                          # Rust compiler errors
        r'^(?:TypeError|SyntaxError|ReferenceError|ImportError|KeyError|ValueError|AttributeError|ModuleNotFoundError|NameError|IndexError|RuntimeError|OSError|IOError|FileNotFoundError|PermissionError)[:( ].*',
        r'^(?:FAIL|FAILED)[ \t]+\S.*',
        r'^panic:.*',
        r'^thread .+ panicked at.*',                        # Rust panics
        r'^.*exit(?:ed with)? code [1-9]\d*',
        r'^cargo build .* failed',                          # Cargo failures
        r'^error: could not compile',                       # Rust compile errors
        r'^TS\d{4}:.*',                                     # TypeScript errors
        r'^Traceback \(most recent call last\):',           # Python tracebacks
        r'^\s+raise \w+Error\b.*',                          # Python raises
        r'^npm ERR!.*',                                     # npm errors
        r'^Build failed\b.*',                               # Generic build failures
        r'^assertion failed\b.*',                           # Test assertion failures
    ]
    errors = []
    for pattern in patterns:
        errors.extend(re.findall(pattern, content, re.MULTILINE)[:5])
    return errors[:15]


def classify_errors(errors: list[str]) -> dict[str, int]:
    """Classify errors by category for actionable feedback."""
    categories: dict[str, int] = {
        "compile": 0, "type": 0, "runtime": 0, "test": 0, "build": 0, "other": 0,
    }
    for e in errors:
        el = e.lower()
        if any(k in el for k in ("compile", "cargo", "error[e", "ts2", "syntaxerror")):
            categories["compile"] += 1
        elif any(k in el for k in ("typeerror", "ts\d", "type")):
            categories["type"] += 1
        elif any(k in el for k in ("panic", "traceback", "runtime", "raise")):
            categories["runtime"] += 1
        elif any(k in el for k in ("fail", "assert", "test")):
            categories["test"] += 1
        elif any(k in el for k in ("build", "npm err")):
            categories["build"] += 1
        else:
            categories["other"] += 1
    return {k: v for k, v in categories.items() if v > 0}


def parse_diff_stats(diff: str) -> dict:
    """Parse git diff --stat output into structured stats."""
    if not diff or diff == "No diff available.":
        return {"files": 0, "insertions": 0, "deletions": 0, "net": 0}
    # Last line of diff --stat: " 5 files changed, 120 insertions(+), 30 deletions(-)"
    m = re.search(
        r'(\d+)\s+files?\s+changed(?:,\s+(\d+)\s+insertions?\(\+\))?(?:,\s+(\d+)\s+deletions?\(-\))?',
        diff,
    )
    if not m:
        files = len(re.findall(r'^\s*.+?\s+\|', diff, re.MULTILINE))
        return {"files": files, "insertions": 0, "deletions": 0, "net": 0}
    files = int(m.group(1))
    ins = int(m.group(2) or 0)
    dels = int(m.group(3) or 0)
    return {"files": files, "insertions": ins, "deletions": dels, "net": ins - dels}
