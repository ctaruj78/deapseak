const express = require('express');
const router = express.Router();

const FLAGS_PATH = require('path').resolve(process.cwd(), 'config/assistant.flags.json');
const fs = require('fs');
const learningStore = require('../services/assistant/learningStore');

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

router.get('/learning/status', (_req, res) => {
  return res.json({
    ok: true,
    enabled: String(process.env.ASSISTANT_LEARNING_ENABLED || 'true') === 'true',
    storagePath: learningStore.storagePath
  });
});

router.post('/learning/feedback', (req, res) => {
  if (String(process.env.ASSISTANT_LEARNING_ENABLED || 'true') !== 'true') {
    return res.status(503).json({ ok: false, error: 'Learning scaffold disabled' });
  }

  const body = req.body || {};
  if (!body.question || !body.answer) {
    return res.status(400).json({ ok: false, error: 'question and answer are required' });
  }

  const entry = learningStore.appendFeedback({
    question: body.question,
    answer: body.answer,
    rating: body.rating,
    feedbackText: body.feedbackText,
    tags: body.tags,
    approved: body.approved,
    source: body.source,
    model: body.model,
    provider: body.provider,
    user: {
      id: req.user?.userId || body.userId || null,
      role: req.user?.role || body.userRole || null
    }
  });

  return res.status(201).json({ ok: true, entry });
});

router.get('/learning/stats', (_req, res) => {
  return res.json({ ok: true, stats: learningStore.getStats() });
});

router.get('/learning/recent', (req, res) => {
  const limit = Number(req.query.limit || 20);
  return res.json({ ok: true, entries: learningStore.getRecent(limit) });
});

router.post('/learning/build-dataset', (req, res) => {
  const body = req.body || {};
  const result = learningStore.buildDataset({
    onlyApproved: body.onlyApproved !== false,
    maxItems: Number(body.maxItems || 2000)
  });
  return res.json({ ok: true, dataset: result });
});

module.exports = router;
