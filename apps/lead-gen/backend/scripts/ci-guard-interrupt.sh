#!/usr/bin/env bash
# Enforces plan invariant: no interrupt() calls inside graphs served by the
# ml or research CF Containers. RemoteGraph + interrupt() has an open bug
# where the interrupt payload fails to serialize across the HTTP boundary
# and resume never completes. Human-in-the-loop graphs must live in core.
#
# Run this in CI; fail the build if an interrupt() lands in the wrong place.

set -eu

cd "$(dirname "$0")/.."

hits=0
for dir in ml research; do
    if [ ! -d "$dir" ]; then
        continue
    fi
    # Grep for `interrupt(` skipping obvious false positives (imports,
    # comments, docstrings that just mention the word).
    found=$(grep -RnE '\binterrupt\s*\(' "$dir" \
        --include='*.py' \
        --exclude-dir='__pycache__' \
        --exclude-dir='.venv' \
        | grep -vE '^\s*#' \
        | grep -vE '^\s*"""' \
        || true)
    if [ -n "$found" ]; then
        echo "ERROR: interrupt() found in $dir/ — move the graph to core/ or remove the interrupt:"
        echo "$found"
        hits=$((hits + 1))
    fi
done

if [ "$hits" -gt 0 ]; then
    echo ""
    echo "See plan: RemoteGraph + interrupt() is a known bad combination."
    exit 1
fi

echo "OK: no interrupt() in ml/ or research/."
