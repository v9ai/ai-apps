#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BRICKS_DIR="$(dirname "$SCRIPT_DIR")"
MODEL_PATH="$BRICKS_DIR/qwen2.5-coder-3b-instruct-q4_k_m.gguf"
LLAMA_PORT="${LLAMA_PORT:-2028}"
CODEGEN_PORT="${CODEGEN_PORT:-2027}"

if [ ! -f "$MODEL_PATH" ]; then
  echo "Model not found: $MODEL_PATH"
  echo "Run: hf download Qwen/Qwen2.5-Coder-3B-Instruct-GGUF qwen2.5-coder-3b-instruct-q4_k_m.gguf --local-dir $BRICKS_DIR"
  exit 1
fi

echo "Starting llama-server on port $LLAMA_PORT..."
/opt/homebrew/bin/llama-server \
  --model "$MODEL_PATH" \
  --port "$LLAMA_PORT" \
  --host 127.0.0.1 \
  --ctx-size 4096 \
  -ngl 99 \
  &
LLAMA_PID=$!

echo "Waiting for llama-server..."
for i in $(seq 1 30); do
  if curl -s http://127.0.0.1:$LLAMA_PORT/health > /dev/null 2>&1; then
    echo "llama-server ready."
    break
  fi
  sleep 1
done

echo "Starting codegen_server on port $CODEGEN_PORT..."
cd "$SCRIPT_DIR"
LLAMA_URL="http://127.0.0.1:$LLAMA_PORT" \
CODEGEN_PORT="$CODEGEN_PORT" \
uv run python -m bricks_agent.codegen_server &
CODEGEN_PID=$!

echo "Both servers running. llama=$LLAMA_PID codegen=$CODEGEN_PID"

trap "kill $LLAMA_PID $CODEGEN_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
