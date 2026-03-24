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
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def extract_errors(content: str) -> list[str]:
    """Extract error-like lines from actual error output (not prose)."""
    patterns = [
        r'^(?:error|Error|ERROR):[ \t]+\S.*',
        r'^(?:TypeError|SyntaxError|ReferenceError|ImportError|KeyError|ValueError|AttributeError|ModuleNotFoundError)[:( ].*',
        r'^(?:FAIL|FAILED)[ \t]+\S.*',
        r'^panic:.*',
        r'^.*exit(?:ed with)? code [1-9]\d*',
    ]
    errors = []
    for pattern in patterns:
        errors.extend(re.findall(pattern, content, re.MULTILINE)[:5])
    return errors[:10]
