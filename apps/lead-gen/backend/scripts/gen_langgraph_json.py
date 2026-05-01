"""Emit ``backend/core/langgraph.json`` from ``leadgen_agent.registry``.

``langgraph dev`` reads ``langgraph.json`` directly and JSON does not allow
header comments, so the file's "do not edit" notice lives here in the
generator instead. ``--check`` is the CI mode: it fails non-zero if the
on-disk file is stale, so a forgotten ``make gen-langgraph-json`` cannot ship.

Resolution check: every spec must import cleanly and expose both
``compiled_attr`` and ``builder_attr``. A typo in the registry fails here
before the FastAPI container ever boots.

Usage::

    uv run python -m scripts.gen_langgraph_json          # write
    uv run python -m scripts.gen_langgraph_json --check  # CI guard
"""

from __future__ import annotations

import argparse
import importlib
import json
import sys
from pathlib import Path

from leadgen_agent.registry import GRAPHS, GraphSpec

REPO_ROOT = Path(__file__).resolve().parents[1]
TARGET = REPO_ROOT / "core" / "langgraph.json"


def _resolve(spec: GraphSpec) -> list[str]:
    errors: list[str] = []
    try:
        mod = importlib.import_module(spec.module)
    except Exception as exc:  # noqa: BLE001
        errors.append(f"{spec.assistant_id}: import {spec.module} failed ({type(exc).__name__}: {exc})")
        return errors
    if not hasattr(mod, spec.compiled_attr):
        errors.append(f"{spec.assistant_id}: {spec.module}:{spec.compiled_attr} missing")
    if spec.builder_attr is not None and not hasattr(mod, spec.builder_attr):
        errors.append(f"{spec.assistant_id}: {spec.module}:{spec.builder_attr} missing")
    return errors


def _payload() -> dict[str, object]:
    return {
        "$schema": "https://langgra.ph/schema.json",
        "dependencies": ["."],
        "graphs": {
            spec.assistant_id: f"{spec.module}:{spec.compiled_attr}"
            for spec in GRAPHS
        },
        "http": {"app": "leadgen_agent.custom_app:app"},
        "env": ".env",
    }


def _serialize(payload: dict[str, object]) -> str:
    return json.dumps(payload, indent=2) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit non-zero if the on-disk langgraph.json differs from the "
        "registry. Used in CI to catch stale files.",
    )
    parser.add_argument(
        "--skip-resolve",
        action="store_true",
        help="Skip module-import resolution. Use when generating the file in "
        "an environment where graph deps (LLM SDKs etc.) aren't installed.",
    )
    args = parser.parse_args(argv)

    if not args.skip_resolve:
        all_errors: list[str] = []
        for spec in GRAPHS:
            all_errors.extend(_resolve(spec))
        if all_errors:
            print("registry resolution failed:", file=sys.stderr)
            for line in all_errors:
                print(f"  - {line}", file=sys.stderr)
            return 2

    serialized = _serialize(_payload())

    if args.check:
        try:
            current = TARGET.read_text()
        except FileNotFoundError:
            print(f"{TARGET} missing — run gen_langgraph_json without --check", file=sys.stderr)
            return 1
        if current != serialized:
            print(
                f"{TARGET} is stale — run `make gen-langgraph-json` and commit",
                file=sys.stderr,
            )
            return 1
        return 0

    TARGET.write_text(serialized)
    print(f"wrote {TARGET} ({len(GRAPHS)} graphs)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
