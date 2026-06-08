#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
MODEL="${OLLAMA_MODEL:-gemma4:12b-it-qat}"
CANDIDATES_CSV="${OLLAMA_MODEL_CANDIDATES:-$MODEL}"
PROMPT="Warmup ping"

SELECTED_MODEL="$MODEL"
TAGS_JSON="$(curl -fsS "${BASE_URL}/api/tags" 2>/dev/null || true)"
if [ -n "$TAGS_JSON" ]; then
  OLDIFS="$IFS"
  IFS=','
  for candidate in $CANDIDATES_CSV; do
    candidate="$(echo "$candidate" | xargs)"
    if echo "$TAGS_JSON" | grep -q "\"name\"[[:space:]]*:[[:space:]]*\"${candidate}\""; then
      SELECTED_MODEL="$candidate"
      break
    fi
  done
  IFS="$OLDIFS"
fi

echo "Warming model ${SELECTED_MODEL} via ${BASE_URL}"
curl -fsS "${BASE_URL}/api/generate" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"${SELECTED_MODEL}\",\"prompt\":\"${PROMPT}\",\"stream\":false}" >/dev/null

echo "OK: warmup finished"
