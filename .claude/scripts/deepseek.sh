#!/bin/bash
# DeepSeek API caller with Ollama fallback
# Usage: ./deepseek.sh "system prompt" "user message"

SYSTEM_PROMPT="$1"
USER_MESSAGE="$2"

if [ -n "$DEEPSEEK_API_KEY" ]; then
    PAYLOAD=$(jq -n \
        --arg sys "$SYSTEM_PROMPT" \
        --arg usr "$USER_MESSAGE" \
        '{
            model: "deepseek-chat",
            messages: [
                {role: "system", content: $sys},
                {role: "user", content: $usr}
            ],
            temperature: 0.3,
            max_tokens: 8192
        }')

    RESULT=$(curl -s --max-time 60 https://api.deepseek.com/chat/completions \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
        -d "$PAYLOAD")

    CONTENT=$(echo "$RESULT" | jq -r '.choices[0].message.content // empty' 2>/dev/null)

    if [ -n "$CONTENT" ]; then
        echo "[ANALISTA: DeepSeek]"
        echo "$CONTENT"
        exit 0
    fi

    ERROR=$(echo "$RESULT" | jq -r '.error.message // empty' 2>/dev/null)
    echo "[DeepSeek unavailable: $ERROR — fallback to Ollama]" >&2
fi

# Fallback: Ollama qwen2.5:3b
echo "[ANALISTA: Ollama fallback]"
COMBINED_PROMPT="$SYSTEM_PROMPT

USER REQUEST:
$USER_MESSAGE"

curl -s --max-time 120 http://localhost:11434/api/generate \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg p "$COMBINED_PROMPT" '{
        model: "qwen2.5:3b",
        prompt: $p,
        stream: false,
        options: {temperature: 0.3, num_predict: 4096}
    }')" | jq -r '.response // "ERROR: Ollama also unavailable"'
