#!/usr/bin/env node
/**
 * Full QA/security/performance audit of FestLift using DeepSeek + GPT (+ optional Grok).
 * Splits target files into line-numbered chunks, sends each chunk to every configured
 * provider with an identical checklist prompt (phase 1), then makes providers that DIDN'T
 * find a given issue review it against the code and give a verdict (phase 2 — cross-check /
 * "debate"). Findings both providers hit independently are corroborated without an extra
 * call; only genuinely disputed/unique findings get cross-checked.
 *
 * This script only COLLECTS + ADJUDICATES findings. Fixing is a separate, manual step
 * (Claude reads each finding against the real code before anything gets changed).
 *
 * Usage:
 *   node scripts/ai-audit.js --scope=backend [--providers=deepseek,gpt] [--skip-cross]
 *   node scripts/ai-audit.js --scope=pages-admin
 *   node scripts/ai-audit.js --scope=pages-dispatcher
 *   node scripts/ai-audit.js --scope=pages-client
 *   node scripts/ai-audit.js --scope=pages-tech
 *   node scripts/ai-audit.js --scope=assets
 *   node scripts/ai-audit.js --scope=backend --cross-only   # re-run phase 2 on existing phase-1 output
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'audit-reports');
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEEPSEEK_MODEL = 'deepseek-v4-pro';
const XAI_MODEL = 'grok-4.3';
const GPT_MODEL = 'gpt-5.3-codex';

// Shared chunk budget (chars), reused across every provider so they all analyze exactly
// the same code slice — that's what makes cross-checking findings meaningful.
const CHUNK_CHAR_BUDGET = 140000;

const CHECKLIST_SYSTEM_PROMPT = `You are a senior QA engineer and application security tester auditing a production Node.js/Express + MongoDB/Mongoose backend for a Portuguese elevator-maintenance management system (FestLift). UI language is PT-PT; you may see Portuguese identifiers/strings, that's expected.

Roles in the system: admin, dispatcher, technician (role values 'technician' or legacy 'tech'), client. Auth is JWT (access + refresh), with a server-side gate that blocks most routes while a user's mustChangePassword flag is true. Known project trap: some routes are registered TWICE — once as an inline handler directly in unified-server.js (which wins, since it's registered first) and again in backend/routes/*.js via backend/controllers/*.js (dead code for that path, shadowed). Don't assume backend/controllers/*.js is "live" just because it exists — note this ambiguity in your finding if relevant instead of asserting the route is reachable. There are also two parallel auth middlewares: authenticate() (backend/middleware/auth.js) and authenticateToken() (defined inline in unified-server.js) — both matter, don't assume only one exists.

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
- Client-side auth/redirect logic that can be bypassed (stale localStorage session reuse, role checks trusting unsigned client data instead of the JWT payload, redirect loops that fail open)

LOGIC / CORRECTNESS BUGS
- Race conditions (e.g. non-atomic counters, check-then-act on shared state, same-second timestamp comparisons)
- Off-by-one, wrong operator, wrong variable used, dead/unreachable branches
- Error handling gaps that crash the process or leak stack traces to clients
- Input validation gaps (missing required-field checks, no type/range validation before DB write)
- Mongoose .save() triggering full-document validation on unrelated fields (vs validateModifiedOnly / findByIdAndUpdate)

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

const CROSS_CHECK_SYSTEM_PROMPT = `You are the same senior QA/security auditor, now doing adjudication. Another auditor (a different AI model) looked at the SAME code chunk you're about to see and reported some findings you did NOT independently flag. For each one, decide: is it real?

Respond with ONLY a JSON array (no markdown fences, no prose before/after), one element per finding IN THE SAME ORDER given, each:
{
  "verdict": "confirmed|disputed|needs_more_context",
  "reasoning": "<1-3 sentences — if disputed, say exactly why the other auditor is wrong (wrong line, misreads the code, not actually exploitable, etc.); if confirmed, say what independently convinces you>"
}
"confirmed" = you agree this is a real, provable issue given the code shown.
"disputed" = you believe the other auditor misread the code or the issue isn't real/exploitable as described.
"needs_more_context" = you can't tell from this chunk alone (e.g. depends on a helper function not shown).
Be a genuine second opinion, not a rubber stamp — actively look for reasons the finding could be wrong before confirming, and actively verify the line/logic before disputing.`;

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

async function callDeepSeek(systemPrompt, userContent) {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
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

async function callGrok(systemPrompt, userContent) {
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
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

async function callGPT(systemPrompt, userContent) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: GPT_MODEL,
      instructions: systemPrompt,
      input: [{ role: 'user', content: userContent }],
      reasoning: { effort: 'high' },
    }),
  });
  if (!res.ok) throw new Error(`GPT HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const msg = (data.output || []).find((o) => o.type === 'message');
  if (!msg) return '';
  return (msg.content || []).map((c) => c.text || '').join('');
}

const PROVIDERS = {
  deepseek: { call: callDeepSeek, requires: () => DEEPSEEK_API_KEY, label: 'DeepSeek (' + DEEPSEEK_MODEL + ')' },
  gpt: { call: callGPT, requires: () => OPENAI_API_KEY, label: 'GPT (' + GPT_MODEL + ')' },
  grok: { call: callGrok, requires: () => XAI_API_KEY, label: 'Grok (' + XAI_MODEL + ')' },
};

function parseJsonArray(raw) {
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

// ─────────────────────────────────────────────────────────────────────────
// Phase 1: independent findings collection
// ─────────────────────────────────────────────────────────────────────────

async function runChunk(providerName, chunk, scope) {
  const dir = path.join(REPORT_DIR, providerName, scope);
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, `${chunk.id}.json`);
  if (fs.existsSync(outPath)) {
    console.log(`  [${providerName}] ${chunk.id} already done, skipping`);
    return JSON.parse(fs.readFileSync(outPath, 'utf8'));
  }
  const { call } = PROVIDERS[providerName];
  const raw = await withRetry(() => call(CHECKLIST_SYSTEM_PROMPT, chunk.content), `${providerName}/${chunk.id}`);
  const findings = parseJsonArray(raw);
  const result = {
    provider: providerName,
    chunk_id: chunk.id,
    label: chunk.label,
    findings: findings ?? [],
    parse_failed: findings === null,
    raw: findings === null ? raw : undefined,
  };
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`  [${providerName}] ${chunk.id} (${chunk.label}) -> ${result.findings.length} findings${result.parse_failed ? ' [PARSE FAILED, raw saved]' : ''}`);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────
// Phase 1.5: dedupe/corroborate across providers for the same chunk
// ─────────────────────────────────────────────────────────────────────────

function findingsOverlap(a, b) {
  if (a.file !== b.file) return false;
  const aStart = a.line_start ?? 0, aEnd = a.line_end ?? aStart;
  const bStart = b.line_start ?? 0, bEnd = b.line_end ?? bStart;
  const nearby = aStart <= bEnd + 15 && bStart <= aEnd + 15;
  const sameCategory = !a.category || !b.category || a.category === b.category;
  return nearby && sameCategory;
}

/** For one chunk, cross-reference every provider's findings against every other
 *  provider's. Returns { corroborated: [...], needsCrossCheck: [{finding, reportedBy, reviewers}] } */
function reconcileChunk(perProviderResults) {
  const corroborated = [];
  const needsCrossCheck = [];
  const providerNames = Object.keys(perProviderResults);

  for (const providerName of providerNames) {
    for (const finding of perProviderResults[providerName].findings || []) {
      const others = providerNames.filter((p) => p !== providerName);
      const echoedBy = others.filter((p) =>
        (perProviderResults[p].findings || []).some((f) => findingsOverlap(finding, f))
      );
      if (echoedBy.length > 0) {
        corroborated.push({ ...finding, _provider: providerName, _corroborated_by: echoedBy, _resolution: 'corroborated' });
      } else {
        needsCrossCheck.push({ finding, reportedBy: providerName, reviewers: others });
      }
    }
  }
  // needsCrossCheck currently has one entry per (finding, reportedBy) — collapse
  // duplicates already merged into corroborated isn't needed since those went the other branch.
  return { corroborated, needsCrossCheck };
}

// ─────────────────────────────────────────────────────────────────────────
// Phase 2: cross-check — each reviewer gives a verdict on findings it didn't flag
// ─────────────────────────────────────────────────────────────────────────

async function crossCheckChunk(chunk, scope, needsCrossCheck) {
  const results = [];
  // Group by reviewer so each reviewer gets ONE call per chunk covering everything
  // it needs to weigh in on (cheaper + gives it the full picture of what's disputed).
  const byReviewer = {};
  for (const item of needsCrossCheck) {
    for (const reviewer of item.reviewers) {
      byReviewer[reviewer] = byReviewer[reviewer] || [];
      byReviewer[reviewer].push(item);
    }
  }

  for (const [reviewer, items] of Object.entries(byReviewer)) {
    const dir = path.join(REPORT_DIR, `${reviewer}-reviews`, scope);
    fs.mkdirSync(dir, { recursive: true });
    const outPath = path.join(dir, `${chunk.id}.json`);
    let verdicts;
    if (fs.existsSync(outPath)) {
      console.log(`  [${reviewer} reviews] ${chunk.id} already done, skipping`);
      verdicts = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    } else {
      const findingsList = items.map((it, i) => ({
        index: i,
        reported_by: it.reportedBy,
        ...it.finding,
      }));
      const userContent = `${chunk.content}\n\n=== FINDINGS TO ADJUDICATE (from another auditor, NOT you) ===\n${JSON.stringify(findingsList, null, 2)}\n=== END FINDINGS ===`;
      const { call } = PROVIDERS[reviewer];
      const raw = await withRetry(() => call(CROSS_CHECK_SYSTEM_PROMPT, userContent), `${reviewer}-reviews/${chunk.id}`);
      const parsed = parseJsonArray(raw);
      verdicts = {
        reviewer,
        chunk_id: chunk.id,
        verdicts: parsed ?? [],
        parse_failed: parsed === null,
        raw: parsed === null ? raw : undefined,
      };
      fs.writeFileSync(outPath, JSON.stringify(verdicts, null, 2));
      console.log(`  [${reviewer} reviews] ${chunk.id} -> ${verdicts.verdicts.length} verdicts${verdicts.parse_failed ? ' [PARSE FAILED]' : ''}`);
    }
    items.forEach((it, i) => {
      const v = (verdicts.verdicts || [])[i];
      results.push({
        ...it.finding,
        _provider: it.reportedBy,
        _reviewed_by: reviewer,
        _verdict: v ? v.verdict : 'unverified',
        _verdict_reasoning: v ? v.reasoning : (verdicts.parse_failed ? 'reviewer response failed to parse' : null),
      });
    });
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const scopeArg = args.find((a) => a.startsWith('--scope='));
  if (!scopeArg) {
    console.error('Usage: node scripts/ai-audit.js --scope=backend|pages-admin|pages-dispatcher|pages-client|pages-tech|assets [--providers=deepseek,gpt] [--skip-cross]');
    process.exit(1);
  }
  const scope = scopeArg.split('=')[1];
  const providersArg = args.find((a) => a.startsWith('--providers='));
  const providerNames = providersArg ? providersArg.split('=')[1].split(',') : ['deepseek', 'gpt'];
  const skipCross = args.includes('--skip-cross');

  for (const p of providerNames) {
    if (!PROVIDERS[p]) throw new Error(`Unknown provider: ${p}. Known: ${Object.keys(PROVIDERS).join(', ')}`);
    if (!PROVIDERS[p].requires()) throw new Error(`Missing API key for provider "${p}"`);
  }
  if (!skipCross && providerNames.length < 2) {
    console.warn('Only one provider configured — cross-check phase has nothing to compare against, skipping it.');
  }

  const chunks = buildScope(scope);
  console.log(`Scope "${scope}": ${chunks.length} chunk(s). Providers: ${providerNames.map((p) => PROVIDERS[p].label).join(', ')}\n`);

  const allFindings = [];
  for (const chunk of chunks) {
    console.log(`Chunk ${chunk.id}: ${chunk.label} (${chunk.content.length} chars)`);

    // Phase 1
    const perProviderResults = {};
    const phase1 = await Promise.all(providerNames.map((p) => runChunk(p, chunk, scope)));
    providerNames.forEach((p, i) => { perProviderResults[p] = phase1[i]; });

    if (providerNames.length < 2) {
      for (const p of providerNames) {
        allFindings.push(...(perProviderResults[p].findings || []).map((f) => ({ ...f, _provider: p, _resolution: 'unreviewed' })));
      }
      continue;
    }

    // Phase 1.5: reconcile
    const { corroborated, needsCrossCheck } = reconcileChunk(perProviderResults);
    allFindings.push(...corroborated);
    console.log(`  reconcile: ${corroborated.length} corroborated by 2+ providers, ${needsCrossCheck.length} unique (need review)`);

    // Phase 2: cross-check the disputed/unique ones
    if (!skipCross && needsCrossCheck.length > 0) {
      const reviewed = await crossCheckChunk(chunk, scope, needsCrossCheck);
      allFindings.push(...reviewed.map((f) => ({ ...f, _resolution: f._verdict === 'confirmed' ? 'confirmed_by_review' : f._verdict === 'disputed' ? 'disputed' : 'unverified' })));
    } else {
      allFindings.push(...needsCrossCheck.map((it) => ({ ...it.finding, _provider: it.reportedBy, _resolution: 'unreviewed' })));
    }
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const combinedPath = path.join(REPORT_DIR, `adjudicated-${scope}.json`);
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const resolutionOrder = { corroborated: 0, confirmed_by_review: 1, unreviewed: 2, unverified: 3, disputed: 4 };
  allFindings.sort((a, b) =>
    (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9) ||
    (resolutionOrder[a._resolution] ?? 9) - (resolutionOrder[b._resolution] ?? 9)
  );
  fs.writeFileSync(combinedPath, JSON.stringify(allFindings, null, 2));

  const bySeverity = allFindings.reduce((acc, f) => { acc[f.severity] = (acc[f.severity] || 0) + 1; return acc; }, {});
  const byResolution = allFindings.reduce((acc, f) => { acc[f._resolution] = (acc[f._resolution] || 0) + 1; return acc; }, {});
  console.log(`\nDone. ${allFindings.length} findings written to ${combinedPath}`);
  console.log('By severity:', bySeverity);
  console.log('By resolution:', byResolution);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
