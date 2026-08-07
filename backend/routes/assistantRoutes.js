const express = require('express');
const router = express.Router();

const FLAGS_PATH = require('path').resolve(process.cwd(), 'config/assistant.flags.json');
const fs = require('fs');
const learningStore = require('../services/assistant/learningStore');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleAuth');

// Todo este router lida com histórico de conversas de IA (podem conter
// moradas de clientes, notas internas) e permite escrita em disco — nada aqui
// deve ficar acessível sem sessão válida.
router.use(authenticate);

router.get('/health', authorizeRoles('admin'), (_req, res) => {
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
    rolloutStage: (flags && flags.rolloutStage) || 'unknown'
  });
});

router.get('/learning/status', authorizeRoles('admin'), (_req, res) => {
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
    // Autoria vem sempre da sessão autenticada — nunca do corpo do pedido,
    // que era falsificável por qualquer chamador.
    user: {
      id: req.user.id,
      role: req.user.role
    }
  });

  return res.status(201).json({ ok: true, entry });
});

router.get('/learning/stats', authorizeRoles('admin'), (_req, res) => {
  return res.json({ ok: true, stats: learningStore.getStats() });
});

router.get('/learning/recent', authorizeRoles('admin'), (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 200);
  return res.json({ ok: true, entries: learningStore.getRecent(limit) });
});

router.post('/learning/build-dataset', authorizeRoles('admin'), (req, res) => {
  const body = req.body || {};
  const result = learningStore.buildDataset({
    onlyApproved: body.onlyApproved !== false,
    maxItems: Math.min(Number(body.maxItems) || 2000, 5000)
  });
  return res.json({ ok: true, dataset: result });
});

module.exports = router;
