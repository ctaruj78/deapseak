#!/bin/bash
# Ollama quick scanner for FestLift multi-agent system
# Usage: ./ollama-scan.sh "question about codebase"

QUESTION="$1"

curl -s http://localhost:11434/api/generate \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg q "$QUESTION" '{
        model: "qwen2.5:3b",
        prompt: $q,
        stream: false,
        options: {temperature: 0.1, num_predict: 2048}
    }')" | jq -r '.response // "ERROR: Ollama not available"'
