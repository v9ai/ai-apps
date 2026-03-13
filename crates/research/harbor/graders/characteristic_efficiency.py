#!/usr/bin/env python3
"""Characteristic team efficiency grader for Harbor eval framework.

Adapted from team_efficiency.py for characteristic research output.
Characteristic research has 5 expected agents (4 research + 1 synthesis)
instead of 6.

Evaluates research team efficiency based on:
  1. Structured tracing output (task durations, completion status) if available
  2. File-based metrics fallback: output file count, word counts, completeness

Usage:
    OUTPUT_DIR=research-output/characteristics/emotional-dysregulation \
        python3 characteristic_efficiency.py
    # Optional: TRACE_LOG=path/to/trace.log for structured tracing data

Output (stdout): JSON  {"score": 0-1, "details": {...}}
"""

import json
import os
import re
import sys
from pathlib import Path
from typing import Optional

# Characteristic research: 4 research agents + 1 synthesis = 5 total
EXPECTED_AGENTS = 5
EXPECTED_FILES = [f"agent-{i:02d}" for i in range(1, EXPECTED_AGENTS + 1)]
SYNTHESIS_FILE = "synthesis.md"
COMPLETE_FILE = "characteristic-research-complete.md"

# Minimum quality thresholds
MIN_WORDS_PER_AGENT = 500  # agent outputs should be substantive
TARGET_WORDS_PER_AGENT = 2000  # ideal word count
MIN_SECTIONS_PER_AGENT = 3  # at least 3 markdown sections


def parse_trace_log(trace_path: Path) -> Optional[dict]:
    """Parse structured tracing output for timing data.

    Expected log lines (from tracing crate):
      task_completed task_id=1 duration_ms=12345 worker=worker-01
      team_completed total_duration_ms=60000 tasks_completed=5
    """
    if not trace_path.exists():
        return None

    text = trace_path.read_text(encoding="utf-8", errors="replace")

    task_completions = []
    team_completion = None

    # Parse task completion lines
    for match in re.finditer(
        r"task[_ ]completed.*?task_id=(\d+).*?duration_ms=(\d+)", text
    ):
        task_completions.append(
            {"task_id": int(match.group(1)), "duration_ms": int(match.group(2))}
        )

    # Parse team-level tracing
    team_match = re.search(
        r"team[_ ]completed.*?total_duration_ms=(\d+).*?tasks_completed=(\d+)",
        text,
    )
    if team_match:
        team_completion = {
            "total_duration_ms": int(team_match.group(1)),
            "tasks_completed": int(team_match.group(2)),
        }

    # Also check for JSON-formatted tracing (tracing-subscriber JSON output)
    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            entry = json.loads(line)
            msg = entry.get("fields", {}).get("message", "")
            if "task_completed" in msg or "task completed" in msg:
                fields = entry.get("fields", {}) or entry.get("span", {})
                task_id = fields.get("task_id")
                duration = fields.get("duration_ms")
                if task_id is not None and duration is not None:
                    task_completions.append(
                        {"task_id": int(task_id), "duration_ms": int(duration)}
                    )
            if "team_completed" in msg or "team completed" in msg:
                fields = entry.get("fields", {}) or entry.get("span", {})
                total_dur = fields.get("total_duration_ms")
                completed = fields.get("tasks_completed")
                if total_dur is not None:
                    team_completion = {
                        "total_duration_ms": int(total_dur),
                        "tasks_completed": int(completed) if completed else 0,
                    }
        except (json.JSONDecodeError, KeyError, TypeError):
            continue

    if not task_completions and team_completion is None:
        return None

    return {
        "task_completions": task_completions,
        "team_completion": team_completion,
    }


def score_from_traces(trace_data: dict) -> dict:
    """Compute efficiency score from structured tracing data."""
    tasks = trace_data["task_completions"]
    team = trace_data["team_completion"]

    tasks_completed = len(tasks)
    completion_ratio = tasks_completed / EXPECTED_AGENTS

    durations = [t["duration_ms"] for t in tasks]
    avg_duration = sum(durations) / len(durations) if durations else 0
    max_duration = max(durations) if durations else 0
    min_duration = min(durations) if durations else 0

    # Parallelism efficiency: if tasks run in parallel, total time should be
    # close to max single task time, not sum of all tasks.
    total_actual = team["total_duration_ms"] if team else max_duration
    parallelism_ratio = (
        max_duration / max(total_actual, 1) if total_actual > 0 else 0
    )

    # Duration variance penalty: high variance suggests uneven task allocation
    if len(durations) >= 2:
        mean = avg_duration
        variance = sum((d - mean) ** 2 for d in durations) / len(durations)
        cv = (variance**0.5) / mean if mean > 0 else 0  # coefficient of variation
        variance_score = max(0, 1.0 - cv)  # lower CV = better
    else:
        variance_score = 1.0

    composite = (
        completion_ratio * 0.50
        + min(parallelism_ratio, 1.0) * 0.25
        + variance_score * 0.25
    )

    return {
        "score": round(composite, 4),
        "source": "tracing",
        "tasks_completed": tasks_completed,
        "expected_tasks": EXPECTED_AGENTS,
        "avg_duration_ms": round(avg_duration),
        "max_duration_ms": max_duration,
        "min_duration_ms": min_duration,
        "total_actual_ms": total_actual,
        "parallelism_ratio": round(parallelism_ratio, 4),
        "variance_score": round(variance_score, 4),
    }


def score_from_files(output_dir: Path) -> dict:
    """Compute efficiency score from output file metrics (fallback)."""
    agent_files = sorted(output_dir.glob("agent-*.md"))
    has_synthesis = (output_dir / SYNTHESIS_FILE).exists()
    has_complete = (output_dir / COMPLETE_FILE).exists()

    # 1. Completion: how many expected files exist?
    files_found = len(agent_files)
    # Use min(files_found, EXPECTED_AGENTS) to avoid scores > 1 if extra files exist
    completion_ratio = min(files_found, EXPECTED_AGENTS) / EXPECTED_AGENTS

    # 2. Word count analysis per agent
    word_counts = []
    section_counts = []
    file_details = []

    for f in agent_files:
        text = f.read_text(encoding="utf-8", errors="replace")
        words = len(text.split())
        # Count markdown headings as section markers
        sections = len(re.findall(r"^#{1,3}\s+", text, re.MULTILINE))
        word_counts.append(words)
        section_counts.append(sections)
        file_details.append(
            {
                "file": f.name,
                "word_count": words,
                "sections": sections,
                "meets_min_words": words >= MIN_WORDS_PER_AGENT,
                "meets_min_sections": sections >= MIN_SECTIONS_PER_AGENT,
            }
        )

    # 3. Content quality scores
    if word_counts:
        avg_words = sum(word_counts) / len(word_counts)
        # Score: reach target words (2000), cap at 1.0
        word_score = min(avg_words / TARGET_WORDS_PER_AGENT, 1.0)
        # All files meet minimum threshold
        min_threshold_ratio = sum(
            1 for w in word_counts if w >= MIN_WORDS_PER_AGENT
        ) / len(word_counts)
    else:
        avg_words = 0
        word_score = 0
        min_threshold_ratio = 0

    if section_counts:
        avg_sections = sum(section_counts) / len(section_counts)
        section_threshold_ratio = sum(
            1 for s in section_counts if s >= MIN_SECTIONS_PER_AGENT
        ) / len(section_counts)
    else:
        avg_sections = 0
        section_threshold_ratio = 0

    # 4. Deliverable completeness: synthesis + combined report
    deliverable_score = (
        (0.5 if has_synthesis else 0.0) + (0.5 if has_complete else 0.0)
    )

    # Composite
    composite = (
        completion_ratio * 0.35
        + word_score * 0.20
        + min_threshold_ratio * 0.15
        + section_threshold_ratio * 0.10
        + deliverable_score * 0.20
    )

    return {
        "score": round(composite, 4),
        "source": "file_metrics",
        "files_found": files_found,
        "expected_files": EXPECTED_AGENTS,
        "has_synthesis": has_synthesis,
        "has_complete_report": has_complete,
        "avg_word_count": round(avg_words),
        "avg_sections": round(avg_sections, 1),
        "min_words_met_ratio": round(min_threshold_ratio, 4),
        "section_threshold_ratio": round(section_threshold_ratio, 4),
        "deliverable_score": round(deliverable_score, 4),
        "per_file": file_details,
    }


def main():
    output_dir = Path(
        os.environ.get("OUTPUT_DIR", "research-output/characteristics")
    )

    if not output_dir.is_dir():
        print(
            json.dumps(
                {
                    "score": 0,
                    "details": {"error": f"Output directory not found: {output_dir}"},
                }
            )
        )
        sys.exit(0)

    # Try structured tracing first
    trace_log = os.environ.get("TRACE_LOG")
    trace_data = None
    if trace_log:
        trace_data = parse_trace_log(Path(trace_log))

    if trace_data:
        details = score_from_traces(trace_data)
    else:
        details = score_from_files(output_dir)

    result = {
        "score": details.pop("score"),
        "details": details,
    }

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
