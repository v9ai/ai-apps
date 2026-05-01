"""Emit a container's ``langgraph.json`` from its Python registry.

Three containers each own their own registry + ``langgraph.json``:

    --container core     → leadgen_agent.registry        → core/langgraph.json
    --container ml       → ml_graphs.registry            → ml/langgraph.json
    --container research → research_graphs.registry      → research/langgraph.json

``langgraph dev`` reads ``langgraph.json`` directly and JSON does not allow
header comments, so the "do not edit" notice lives here in the generator
instead. ``--check`` is the CI mode: it fails non-zero if the on-disk file
is stale, so a forgotten ``make gen-langgraph-json-*`` cannot ship.

Resolution check: every spec must import cleanly and expose its
``compiled_attr`` (and ``builder_attr`` if not None). A typo in any registry
fails here before the FastAPI container ever boots.

Usage::

    uv run python -m scripts.gen_langgraph_json --container core           # write
    uv run python -m scripts.gen_langgraph_json --container ml --check     # CI guard
"""

from __future__ import annotations

import argparse
import importlib
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

REPO_ROOT = Path(__file__).resolve().parents[1]


class _SpecLike(Protocol):
    assistant_id: str
    module: str
    compiled_attr: str
    builder_attr: str | None


@dataclass(frozen=True)
class _Container:
    name: str
    registry_module: str  # importable; must expose GRAPHS: tuple[GraphSpec, ...]
    target: Path  # absolute path to the langgraph.json this container ships
    http_app: str | None  # mirrors langgraph.json's "http.app" key, or None to omit
    package_root: Path | None = None  # extra dir added to sys.path so the
    # container's package (e.g. ``ml_graphs``) is importable when this script
    # runs from ``backend/``. Mirrors what ``langgraph dev`` sees at runtime
    # when invoked with ``--config <container>/langgraph.json``.


_CONTAINERS: dict[str, _Container] = {
    "core": _Container(
        name="core",
        registry_module="leadgen_agent.registry",
        target=REPO_ROOT / "core" / "langgraph.json",
        # ``langgraph dev`` mounts this Starlette app; carries the bearer
        # middleware so local dev exercises the same auth path as prod.
        http_app="leadgen_agent.custom_app:app",
    ),
    "ml": _Container(
        name="ml",
        registry_module="ml_graphs.registry",
        target=REPO_ROOT / "ml" / "langgraph.json",
        http_app=None,
        package_root=REPO_ROOT / "ml",
    ),
    "research": _Container(
        name="research",
        registry_module="research_graphs.registry",
        target=REPO_ROOT / "research" / "langgraph.json",
        # research keeps ``app.py`` as the http app for Starlette mounting parity.
        http_app="app:app",
        package_root=REPO_ROOT / "research",
    ),
}


def _ensure_importable(container: _Container) -> None:
    """Add the container's package root to sys.path if needed.

    ``langgraph dev --config ml/langgraph.json`` runs with ``ml/`` as cwd,
    so registry specs use container-relative module paths (``ml_graphs.X``,
    not ``ml.ml_graphs.X``). Mirror that here so ``--check`` resolution can
    actually import the modules.
    """
    if container.package_root is None:
        return
    path_str = str(container.package_root)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)


def _load_graphs(container: _Container) -> tuple[_SpecLike, ...]:
    mod = importlib.import_module(container.registry_module)
    graphs = getattr(mod, "GRAPHS", None)
    if graphs is None:
        raise RuntimeError(
            f"{container.registry_module} must expose GRAPHS: tuple[GraphSpec, ...]"
        )
    return tuple(graphs)


def _resolve(spec: _SpecLike) -> list[str]:
    errors: list[str] = []
    try:
        mod = importlib.import_module(spec.module)
    except Exception as exc:  # noqa: BLE001
        errors.append(
            f"{spec.assistant_id}: import {spec.module} failed "
            f"({type(exc).__name__}: {exc})"
        )
        return errors
    if not hasattr(mod, spec.compiled_attr):
        errors.append(
            f"{spec.assistant_id}: {spec.module}:{spec.compiled_attr} missing"
        )
    if spec.builder_attr is not None and not hasattr(mod, spec.builder_attr):
        errors.append(
            f"{spec.assistant_id}: {spec.module}:{spec.builder_attr} missing"
        )
    return errors


def _payload(container: _Container, graphs: tuple[_SpecLike, ...]) -> dict[str, object]:
    out: dict[str, object] = {
        "$schema": "https://langgra.ph/schema.json",
        "dependencies": ["."],
        "graphs": {
            spec.assistant_id: f"{spec.module}:{spec.compiled_attr}"
            for spec in graphs
        },
    }
    if container.http_app is not None:
        out["http"] = {"app": container.http_app}
    out["env"] = ".env"
    return out


def _serialize(payload: dict[str, object]) -> str:
    return json.dumps(payload, indent=2) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--container",
        choices=sorted(_CONTAINERS.keys()),
        default="core",
        help="Which container's langgraph.json to emit (default: core).",
    )
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

    container = _CONTAINERS[args.container]
    _ensure_importable(container)
    graphs = _load_graphs(container)

    if not args.skip_resolve:
        all_errors: list[str] = []
        for spec in graphs:
            all_errors.extend(_resolve(spec))
        if all_errors:
            print(
                f"[{container.name}] registry resolution failed:", file=sys.stderr
            )
            for line in all_errors:
                print(f"  - {line}", file=sys.stderr)
            return 2

    serialized = _serialize(_payload(container, graphs))

    if args.check:
        try:
            current = container.target.read_text()
        except FileNotFoundError:
            print(
                f"{container.target} missing — run gen_langgraph_json "
                f"--container {container.name} without --check",
                file=sys.stderr,
            )
            return 1
        if current != serialized:
            print(
                f"{container.target} is stale — run "
                f"`make gen-langgraph-json-{container.name}` and commit",
                file=sys.stderr,
            )
            return 1
        return 0

    container.target.write_text(serialized)
    print(f"wrote {container.target} ({len(graphs)} graphs)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
