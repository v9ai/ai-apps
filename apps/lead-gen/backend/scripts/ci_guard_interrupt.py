"""AST-based CI guard: no `interrupt()` calls in ml/ or research/ graphs.

Docstring and comment mentions of ``interrupt()`` are fine. We only flag
actual call expressions where the callable's name is ``interrupt`` or the
attribute chain ends in ``interrupt``.
"""

from __future__ import annotations

import ast
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCOPED_DIRS = ["ml", "research"]


def _is_interrupt_call(node: ast.Call) -> bool:
    func = node.func
    if isinstance(func, ast.Name) and func.id == "interrupt":
        return True
    if isinstance(func, ast.Attribute) and func.attr == "interrupt":
        return True
    return False


def scan(path: pathlib.Path) -> list[tuple[int, str]]:
    try:
        tree = ast.parse(path.read_text(), filename=str(path))
    except SyntaxError as e:
        print(f"  (skip: syntax error in {path}: {e})", file=sys.stderr)
        return []
    hits: list[tuple[int, str]] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and _is_interrupt_call(node):
            hits.append((node.lineno, ast.unparse(node)))
    return hits


def main() -> int:
    total_hits = 0
    for subdir in SCOPED_DIRS:
        base = ROOT / subdir
        if not base.is_dir():
            continue
        for py in base.rglob("*.py"):
            if "__pycache__" in py.parts or ".venv" in py.parts:
                continue
            for lineno, src in scan(py):
                print(f"{py.relative_to(ROOT)}:{lineno}: {src}")
                total_hits += 1
    if total_hits:
        print(
            f"\nFAIL: {total_hits} `interrupt()` call(s) in ml/ or research/. "
            "Move the graph to core/ or remove the interrupt — RemoteGraph + "
            "interrupt() is known-broken across HTTP boundaries."
        )
        return 1
    print("OK: no `interrupt()` calls in ml/ or research/.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
