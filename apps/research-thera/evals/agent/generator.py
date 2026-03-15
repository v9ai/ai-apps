"""Research agent generator with fixture caching.

Runs the Rust DeepSeek Reasoner binary (research_agent) and caches the parsed
JSON output as fixtures for reproducible evaluation. The first test case
(feedback-based-intervention) is pre-seeded from the existing latest-research.md
to avoid an expensive binary run.
"""

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

# generator.py lives at: apps/research-thera/evals/agent/generator.py
# REPO_ROOT is 5 levels up: agent -> evals -> research-thera -> apps -> ai-apps
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"
LATEST_RESEARCH_MD = (
    REPO_ROOT / "apps/research-thera/_memory/therapeutic-research/latest-research.md"
)
CARGO_MANIFEST = REPO_ROOT / "apps/research-thera/crates/research/Cargo.toml"

# ---------------------------------------------------------------------------
# Test cases
# ---------------------------------------------------------------------------

TEST_CASES = [
    {
        "id": "feedback-based-intervention",
        "therapeutic_type": "Feedback-based Intervention",
        "title": "Update despre comportamentul Bogdan",
        "population": "children adolescents families",
        "expected_evidence_levels": ["meta-analysis", "rct", "systematic_review"],
        "expected_technique_keywords": ["video feedback", "coaching", "reinforcement"],
    },
    {
        "id": "cbt-test-anxiety-teen",
        "therapeutic_type": "Cognitive Behavioral Therapy",
        "title": "Reduce test anxiety",
        "population": "adolescents",
        "expected_evidence_levels": ["rct", "meta-analysis"],
        "expected_technique_keywords": ["CBT", "cognitive restructuring", "exposure"],
    },
    {
        "id": "social-skills-asd-preschool",
        "therapeutic_type": "Social Skills Training",
        "title": "Improve eye contact and social interaction",
        "population": "preschool children ASD",
        "expected_evidence_levels": ["rct", "systematic_review"],
        "expected_technique_keywords": ["eye contact", "joint attention", "naturalistic"],
    },
]

# ---------------------------------------------------------------------------
# JSON extraction — mirrors extract_research_json from research_agent.rs:344
# ---------------------------------------------------------------------------


def extract_research_json(text: str) -> Optional[str]:
    """Extract the JSON block from agent markdown output.

    Replicates the Rust extract_research_json logic:
    finds '## Recommended JSON Output' marker, then the ```json fence.
    """
    markers = ["## Recommended JSON Output", "## Recommended Optimizer Grid"]
    for marker in markers:
        idx = text.find(marker)
        if idx == -1:
            continue
        after_marker = text[idx:]
        fence_idx = after_marker.find("```json")
        if fence_idx == -1:
            continue
        json_start = fence_idx + len("```json")
        after_fence = after_marker[json_start:]
        end_idx = after_fence.find("```")
        if end_idx != -1:
            return after_fence[:end_idx].strip()
    return None


# ---------------------------------------------------------------------------
# Fixture caching
# ---------------------------------------------------------------------------


def run_agent(case: dict) -> dict:
    """Return parsed ResearchOutput JSON for the given test case.

    Strategy:
    1. Load from fixtures/{case_id}_agent.json if it exists.
    2. For feedback-based-intervention: pre-seed from latest-research.md.
    3. Otherwise: run the Rust binary with cargo run.
    """
    case_id = case["id"]
    fixture_path = FIXTURES_DIR / f"{case_id}_agent.json"

    if fixture_path.exists():
        return json.loads(fixture_path.read_text(encoding="utf-8"))["result"]

    # Pre-seed first case from the existing memory file (no binary run needed)
    if case_id == "feedback-based-intervention" and LATEST_RESEARCH_MD.exists():
        text = LATEST_RESEARCH_MD.read_text(encoding="utf-8")
        json_str = extract_research_json(text)
        if json_str:
            result = json.loads(json_str)
            _save_fixture(fixture_path, case_id, result, source="latest-research.md")
            return result

    # Run the Rust binary for cases without an existing memory file
    proc = subprocess.run(
        [
            "cargo",
            "run",
            "--manifest-path",
            str(CARGO_MANIFEST),
            "--bin",
            "research",
            "--",
            "--stdout",
            "query",
            "--therapeutic-type",
            case["therapeutic_type"],
            "--title",
            case["title"],
            "--population",
            case["population"],
        ],
        capture_output=True,
        text=True,
        timeout=300,
    )

    if proc.returncode != 0:
        raise RuntimeError(
            f"research binary failed (exit {proc.returncode}):\n{proc.stderr}"
        )

    output_text = proc.stdout
    json_str = extract_research_json(output_text)
    if not json_str:
        raise ValueError(
            f"No '## Recommended JSON Output' block found in binary output.\n"
            f"stdout (first 500 chars):\n{output_text[:500]}"
        )

    result = json.loads(json_str)
    _save_fixture(fixture_path, case_id, result, source="binary")
    return result


def _save_fixture(path: Path, case_id: str, result: dict, source: str) -> None:
    FIXTURES_DIR.mkdir(exist_ok=True)
    path.write_text(
        json.dumps(
            {
                "id": case_id,
                "source": source,
                "result": result,
                "generated_at": datetime.now(timezone.utc).isoformat(),
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )


# ---------------------------------------------------------------------------
# Input description for LLMTestCase.input
# ---------------------------------------------------------------------------


def build_input_description(case: dict) -> str:
    """Build a human-readable description of the research request."""
    return (
        f"Therapeutic Type: {case['therapeutic_type']}\n"
        f"Title: {case['title']}\n"
        f"Population: {case['population']}"
    )
