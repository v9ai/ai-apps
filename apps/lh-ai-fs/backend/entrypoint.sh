#!/bin/sh
set -e

# If arguments are passed (docker compose command override), run those instead
if [ $# -gt 0 ]; then
  exec "$@"
fi

exec uvicorn main:app --host 0.0.0.0 --port 8002 --reload
