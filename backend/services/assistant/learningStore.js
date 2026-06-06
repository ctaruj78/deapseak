'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const storagePath = path.resolve(process.cwd(), 'data/assistant-learning');
const feedbackFile = path.join(storagePath, 'feedback.jsonl');
const datasetDir = path.join(storagePath, 'datasets');

function ensureStorage() {
  fs.mkdirSync(storagePath, { recursive: true });
  fs.mkdirSync(datasetDir, { recursive: true });
  if (!fs.existsSync(feedbackFile)) {
    fs.writeFileSync(feedbackFile, '', 'utf8');
  }
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }
  return tags
    .map((tag) => String(tag || '').trim())
    .filter(Boolean)
    .slice(0, 10);
}

function normalizeRating(rating) {
  const value = Number(rating);
  if (Number.isFinite(value)) {
    if (value > 0) return 1;
    if (value < 0) return -1;
    return 0;
  }
  return 0;
}

function parseJsonLine(line) {
  try {
    return JSON.parse(line);
  } catch (_err) {
    return null;
  }
}

function readAllEntries() {
  ensureStorage();
  const raw = fs.readFileSync(feedbackFile, 'utf8');
  if (!raw.trim()) {
    return [];
  }

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseJsonLine)
    .filter(Boolean);
}

function appendFeedback(payload = {}) {
  ensureStorage();

  const rating = normalizeRating(payload.rating);
  const approved = typeof payload.approved === 'boolean' ? payload.approved : rating > 0;

  const entry = {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    question: String(payload.question || '').trim(),
    answer: String(payload.answer || '').trim(),
    rating,
    approved,
    feedbackText: String(payload.feedbackText || '').trim(),
    tags: normalizeTags(payload.tags),
    source: String(payload.source || 'ui').trim(),
    provider: String(payload.provider || '').trim(),
    model: String(payload.model || '').trim(),
    user: {
      id: payload.user?.id || null,
      role: payload.user?.role || null
    }
  };

  fs.appendFileSync(feedbackFile, `${JSON.stringify(entry)}\n`, 'utf8');
  return entry;
}

function getRecent(limit = 20) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 200));
  const entries = readAllEntries();
  return entries.slice(-safeLimit).reverse();
}

function getStats() {
  const entries = readAllEntries();
  const approved = entries.filter((entry) => entry.approved === true).length;
  const rejected = entries.filter((entry) => entry.rating < 0 || entry.approved === false).length;
  const neutral = entries.length - approved - rejected;

  return {
    total: entries.length,
    approved,
    rejected,
    neutral,
    feedbackFile,
    datasetDir
  };
}

function createDatasetLine(entry) {
  return {
    instruction: entry.question,
    response: entry.answer,
    metadata: {
      source: entry.source || 'ui',
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      rating: Number(entry.rating || 0),
      model: entry.model || '',
      provider: entry.provider || ''
    }
  };
}

function buildDataset(options = {}) {
  ensureStorage();

  const onlyApproved = options.onlyApproved !== false;
  const maxItems = Math.max(1, Math.min(Number(options.maxItems) || 2000, 10000));

  const entries = readAllEntries()
    .filter((entry) => entry.question && entry.answer)
    .filter((entry) => (onlyApproved ? entry.approved === true : true))
    .slice(-maxItems);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(datasetDir, `train-${stamp}.jsonl`);
  const lines = entries.map((entry) => JSON.stringify(createDatasetLine(entry))).join('\n');

  fs.writeFileSync(outputFile, lines.length ? `${lines}\n` : '', 'utf8');

  return {
    outputFile,
    records: entries.length,
    onlyApproved,
    maxItems
  };
}

module.exports = {
  storagePath,
  appendFeedback,
  getRecent,
  getStats,
  buildDataset
};
