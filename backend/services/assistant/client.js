'use strict';

const DEFAULT_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';
const DEFAULT_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 15000);

async function generate(prompt, options = {}) {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const model = options.model || DEFAULT_MODEL;
  const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: options.ollamaOptions || {}
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama request failed: ${response.status} ${body}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  generate
};
