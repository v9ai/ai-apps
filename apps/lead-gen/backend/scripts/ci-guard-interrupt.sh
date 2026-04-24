#!/usr/bin/env bash
# Enforces plan invariant: no interrupt() calls inside graphs served by the
# ml or research CF Containers. RemoteGraph + interrupt() has an open bug
# where the interrupt payload fails to serialize across the HTTP boundary
# and resume never completes. Human-in-the-loop graphs must live in core.
#
# Implemented via Python AST to skip docstring mentions cleanly.

set -eu

cd "$(dirname "$0")/.."
exec python3 scripts/ci_guard_interrupt.py
