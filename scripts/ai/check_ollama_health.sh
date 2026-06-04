#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"

echo "Checking Ollama at ${BASE_URL}"
if command -v curl >/dev/null 2>&1; then
  curl -fsS "${BASE_URL}/api/tags" >/dev/null
  echo "OK: Ollama API reachable"
else
  echo "ERROR: curl is required"
  exit 1
fi
