const express = require('express');
const router = express.Router();

const FLAGS_PATH = require('path').resolve(process.cwd(), 'config/assistant.flags.json');
const fs = require('fs');

router.get('/health', (_req, res) => {
  let flags = null;

  try {
    const raw = fs.readFileSync(FLAGS_PATH, 'utf8');
    flags = JSON.parse(raw);
  } catch (_err) {
    flags = { readError: true };
  }

  return res.json({
    ok: true,
    service: 'assistant',
    enabled: Boolean(flags && flags.assistantEnabled),
    mode: (flags && flags.mode) || 'unknown',
    rolloutStage: (flags && flags.rolloutStage) || 'unknown',
    model: process.env.OLLAMA_MODEL || 'qwen2.5:3b',
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'
  });
});

module.exports = router;
