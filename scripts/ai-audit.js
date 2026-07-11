#!/usr/bin/env node
/**
 * Full QA/security/performance audit of FestLift backend using DeepSeek + Grok (xAI).
 * Splits target files into line-numbered chunks, sends each chunk to both providers
 * with an identical checklist prompt, and writes structured JSON findings to
 * audit-reports/<provider>/<chunk-id>.json plus a merged audit-reports/combined-findings.json.
 *
 * This script only COLLECTS findings. Verification and fixing is a separate, manual step
 * (Opus reads each finding against the real code before anything gets changed).
 *
 * Usage:
 *   node scripts/ai-audit.js --scope=backend
 *   node scripts/ai-audit.js --scope=pages-admin
 *   node scripts/ai-audit.js --scope=pages-dispatcher
 *   node scripts/ai-audit.js --scope=pages-client
 *   node scripts/ai-audit.js --scope=pages-tech
 *   node scripts/ai-audit.js --scope=assets
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'audit-reports');
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY;
const DEEPSEEK_MODEL = 'deepseek-v4-pro';
const XAI_MODEL = 'grok-4.3';

// Conservative shared chunk budget (chars). DeepSeek's published context window for the
// v4 models isn't public yet, so we chunk to the tighter budget and reuse the same
// chunk boundaries for Grok (which has a 1M-token window) so both providers analyze
// exactly the same code slice — makes cross-checking findings meaningful.
const CHUNK_CHAR_BUDGET = 140000;

const CHECKLIST_SYSTEM_PROMPT = `You are a senior QA engineer and application security tester auditing a production Node.js/Express + MongoDB/Mongoose backend for a Portuguese elevator-maintenance management system (FestLift). UI language is PT-PT; you may see Portuguese identifiers/strings, that's expected.

Roles in the system: admin, dispatcher, technician (role values 'technician' or legacy 'tech'), client. Auth is JWT (access + refresh). Known project trap: some routes are registered TWICE — once as an inline handler directly in unified-server.js (which wins, since it's registered first) and again in backend/routes/*.js via backend/controllers/*.js (dead code for that path, shadowed). Don't assume backend/controllers/*.js is "live" just because it exists — note this ambiguity in your finding if relevant instead of asserting the route is reachable.

Audit checklist — look for concrete, provable issues only, citing exact line numbers from the numbered source given to you:

SECURITY
- IDOR / missing ownership checks (user A can read/write user B's data by guessing an ID)
- Privilege escalation / missing or wrong role guards (e.g. dispatcher able to modify admin accounts, technician able to act outside assigned scope)
- Mass-assignment (spreading req.body into a Mongoose doc/update without a field whitelist)
- XSS (stored/reflected/DOM) — data rendered via innerHTML/document.write without escaping
- Injection (NoSQL injection via unsanitized query operators, command injection, path traversal)
- Auth bypass, missing auth middleware on sensitive routes, JWT misconfiguration
- Secrets hardcoded in source, logged via console.log, or leaked in API responses (password hashes, tokens, tempPasswordHint, etc.)
- CSRF exposure, missing/weak rate limiting on sensitive endpoints (login, password reset)
- Insecure direct object references in file/document download endpoints

LOGIC / CORRECTNESS BUGS
- Race conditions (e.g. non-atomic counters, check-then-act on shared state)
- Off-by-one, wrong operator, wrong variable used, dead/unreachable branches
- Error handling gaps that crash the process or leak stack traces to clients
- Input validation gaps (missing required-field checks, no type/range validation before DB write)

PERFORMANCE / DATABASE
- N+1 query patterns (query inside a loop that could be a single query/populate)
- Missing .lean() on read-only Mongoose queries
- Missing indexes for fields used in frequent queries/sorts (note the field, not a guess)
- Unbounded queries (no pagination/limit on endpoints that can return large collections)
- Obvious memory leaks (growing arrays/listeners never cleaned up, unclosed connections)

Respond with ONLY a JSON array (no markdown fences, no prose before/after). Each element:
{
  "file": "<relative path as given in the chunk header>",
  "line_start": <int>,
  "line_end": <int>,
  "severity": "critical|high|medium|low",
  "category": "idor|privesc|mass-assignment|xss|injection|auth-bypass|secret-leak|csrf|rate-limit|race-condition|logic-bug|error-handling|validation|n-plus-1|missing-lean|missing-index|unbounded-query|memory-leak|other",
  "title": "<short one-line summary>",
  "description": "<what's wrong and why it's exploitable/broken — be specific, reference actual code from the chunk>",
  "evidence": "<the relevant snippet or expression, verbatim from the given chunk>",
  "suggested_fix": "<concrete fix, not vague advice>",
  "confidence": "high|medium|low"
}
If you find nothing in a chunk, return [].
Do not report style preferences, missing comments, missing tests, or anything you cannot point to concrete code for. Do not repeat the same finding for both the inline route and its (possibly dead) backend/controllers counterpart unless they are genuinely different bugs.`;

function numberLines(content, startLine = 1) {
  return content
    .split('\n')
    .map((line, i) => `${startLine + i}: ${line}`)
    .join('\n');
}

function readFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function listFiles(dir, exts) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => exts.some((e) => f.endsWith(e)))
    .map((f) => path.join(dir, f));
}

/** Split ONE large file into line-numbered chunks under the char budget, each chunk
 *  prefixed with a fixed "shared context" header (first N lines of the file: requires,
 *  middleware, auth helpers) so the model understands the security model without
 *  needing the whole file. */
function chunkSingleFile(relPath, headerLineCount = 180) {
  const raw = readFile(relPath);
  const lines = raw.split('\n');
  const header = lines.slice(0, headerLineCount).join('\n');
  const headerBlock = `=== SHARED CONTEXT: ${relPath} lines 1-${headerLineCount} (requires/middleware/auth helpers — for reference, do not re-report issues here unless they also appear in the numbered chunk below) ===\n${numberLines(header, 1)}\n=== END SHARED CONTEXT ===\n\n`;
  const headerBudget = headerBlock.length;
  const perChunkBudget = CHUNK_CHAR_BUDGET - headerBudget;

  const chunks = [];
  let i = 0;
  let chunkIdx = 0;
  while (i < lines.length) {
    let acc = '';
    const startLine = i + 1;
    while (i < lines.length && acc.length + lines[i].length + 1 < perChunkBudget) {
      acc += lines[i] + '\n';
      i++;
    }
    const endLine = i;
    const body = `=== CHUNK: ${relPath} lines ${startLine}-${endLine} ===\n${numberLines(acc, startLine)}\n=== END CHUNK ===`;
    chunks.push({
      id: `${path.basename(relPath, '.js')}-${String(++chunkIdx).padStart(3, '0')}`,
      label: `${relPath}:${startLine}-${endLine}`,
      content: startLine <= headerLineCount ? body : headerBlock + body,
    });
  }
  return chunks;
}

/** Bundle many small files together up to the char budget. Splits an individual file
 *  by lines only if it alone exceeds the budget. */
function chunkFileGroup(relPaths, groupId) {
  const chunks = [];
  let acc = '';
  let files = [];
  let chunkIdx = 0;

  function flush() {
    if (!acc) return;
    chunks.push({
      id: `${groupId}-${String(++chunkIdx).padStart(3, '0')}`,
      label: files.join(', '),
      content: acc,
    });
    acc = '';
    files = [];
  }

  for (const relPath of relPaths) {
    const raw = readFile(relPath);
    const block = `=== FILE: ${relPath} ===\n${numberLines(raw, 1)}\n=== END FILE: ${relPath} ===\n\n`;
    if (block.length > CHUNK_CHAR_BUDGET) {
      flush();
      const lines = raw.split('\n');
      let i = 0;
      let sub = 0;
      while (i < lines.length) {
        let part = '';
        const startLine = i + 1;
        while (i < lines.length && part.length + lines[i].length + 1 < CHUNK_CHAR_BUDGET - 200) {
          part += lines[i] + '\n';
          i++;
        }
        const endLine = i;
        chunks.push({
          id: `${groupId}-${String(++chunkIdx).padStart(3, '0')}-sub${++sub}`,
          label: `${relPath}:${startLine}-${endLine}`,
          content: `=== FILE: ${relPath} lines ${startLine}-${endLine} ===\n${numberLines(part, startLine)}\n=== END FILE ===`,
        });
      }
      continue;
    }
    if (acc.length + block.length > CHUNK_CHAR_BUDGET) flush();
    acc += block;
    files.push(relPath);
  }
  flush();
  return chunks;
}

function buildScope(scope) {
  if (scope === 'backend') {
    const controllers = listFiles('backend/controllers', ['.js']);
    const models = listFiles('models', ['.js']);
    return [
      ...chunkSingleFile('unified-server.js'),
      ...chunkFileGroup(controllers, 'controllers'),
      ...chunkFileGroup(models, 'models'),
    ];
  }
  if (scope.startsWith('pages-')) {
    const role = scope.replace('pages-', '');
    const dir = `pages/${role}`;
    const files = listFiles(dir, ['.html']);
    if (!files.length) throw new Error(`No files found in ${dir}`);
    return chunkFileGroup(files, `pages-${role}`);
  }
  if (scope === 'assets') {
    const dir = path.join(ROOT, 'assets/js');
    const files = [];
    (function walk(d, rel) {
      for (const f of fs.readdirSync(d)) {
        const abs = path.join(d, f);
        const relPath = path.join(rel, f);
        if (fs.statSync(abs).isDirectory()) walk(abs, relPath);
        else if (f.endsWith('.js')) files.push(path.join('assets/js', relPath));
      }
    })(dir, '');
    return chunkFileGroup(files, 'assets');
  }
  throw new Error(`Unknown scope: ${scope}`);
}

async function callDeepSeek(userContent) {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: CHECKLIST_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      max_tokens: 16000,
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callGrok(userContent) {
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      messages: [
        { role: 'system', content: CHECKLIST_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      max_tokens: 16000,
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`Grok HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

function parseFindings(raw) {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return null; // signals parse failure — raw text saved separately
  }
}

async function withRetry(fn, label, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      console.error(`  [${label}] attempt ${i}/${attempts} failed: ${err.message.slice(0, 200)}`);
      if (i === attempts) throw err;
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}

async function runChunk(provider, chunk, scope) {
  const dir = path.join(REPORT_DIR, provider, scope);
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, `${chunk.id}.json`);
  if (fs.existsSync(outPath)) {
    console.log(`  [${provider}] ${chunk.id} already done, skipping`);
    return JSON.parse(fs.readFileSync(outPath, 'utf8'));
  }
  const call = provider === 'deepseek' ? callDeepSeek : callGrok;
  const raw = await withRetry(() => call(chunk.content), `${provider}/${chunk.id}`);
  const findings = parseFindings(raw);
  const result = {
    provider,
    chunk_id: chunk.id,
    label: chunk.label,
    findings: findings ?? [],
    parse_failed: findings === null,
    raw: findings === null ? raw : undefined,
  };
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`  [${provider}] ${chunk.id} (${chunk.label}) -> ${result.findings.length} findings${result.parse_failed ? ' [PARSE FAILED, raw saved]' : ''}`);
  return result;
}

async function main() {
  const scopeArg = process.argv.find((a) => a.startsWith('--scope='));
  if (!scopeArg) {
    console.error('Usage: node scripts/ai-audit.js --scope=backend|pages-admin|pages-dispatcher|pages-client|pages-tech|assets');
    process.exit(1);
  }
  const scope = scopeArg.split('=')[1];
  if (!DEEPSEEK_API_KEY || !XAI_API_KEY) {
    console.error('Missing DEEPSEEK_API_KEY or XAI_API_KEY in .env');
    process.exit(1);
  }

  const chunks = buildScope(scope);
  console.log(`Scope "${scope}": ${chunks.length} chunk(s). Querying DeepSeek (${DEEPSEEK_MODEL}) and Grok (${XAI_MODEL})...\n`);

  const allResults = [];
  for (const chunk of chunks) {
    console.log(`Chunk ${chunk.id}: ${chunk.label} (${chunk.content.length} chars)`);
    const [ds, gr] = await Promise.all([
      runChunk('deepseek', chunk, scope),
      runChunk('grok', chunk, scope),
    ]);
    allResults.push(ds, gr);
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const combinedPath = path.join(REPORT_DIR, `combined-${scope}.json`);
  const combined = allResults.flatMap((r) =>
    r.findings.map((f) => ({ ...f, _provider: r.provider, _chunk_id: r.chunk_id }))
  );
  fs.writeFileSync(combinedPath, JSON.stringify(combined, null, 2));

  const totalFindings = combined.length;
  const bySeverity = combined.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1;
    return acc;
  }, {});
  console.log(`\nDone. ${totalFindings} raw findings (before dedup/verification) written to ${combinedPath}`);
  console.log('By severity:', bySeverity);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
