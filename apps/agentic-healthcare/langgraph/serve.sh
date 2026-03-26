#!/usr/bin/env bash
# Start mlx_lm.server — OpenAI-compatible inference on Apple Silicon
#
# Usage:
#   ./serve.sh                          # 7B 4-bit (default, ~4GB RAM)
#   ./serve.sh mlx-community/Qwen2.5-3B-Instruct-4bit   # 3B (faster, less RAM)
#   PORT=8081 ./serve.sh                # custom port
#
# After starting, set in .env:
#   LLM_BASE_URL=http://localhost:8080
#   LLM_MODEL=mlx-community/Qwen2.5-7B-Instruct-4bit

set -euo pipefail

MODEL="${1:-mlx-community/Qwen2.5-7B-Instruct-4bit}"
PORT="${PORT:-8080}"

echo "Starting mlx_lm.server"
echo "  model : $MODEL"
echo "  port  : $PORT"
echo ""

exec mlx_lm.server \
  --model "$MODEL" \
  --port "$PORT" \
  --host 127.0.0.1
