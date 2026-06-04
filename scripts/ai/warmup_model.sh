#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
MODEL="${OLLAMA_MODEL:-qwen2.5:3b}"
PROMPT="Warmup ping"

echo "Warming model ${MODEL} via ${BASE_URL}"
curl -fsS "${BASE_URL}/api/generate" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"${MODEL}\",\"prompt\":\"${PROMPT}\",\"stream\":false}" >/dev/null

echo "OK: warmup finished"
