/**
 * 🔗 Cross-Role Integration Test
 * ================================
 * Перевіряє повний ланцюг взаємодії між ролями через реальне HTTP API:
 *
 *  СЦЕНАРІЙ A — Client → Admin/Dispatcher
 *    1. Client логінується
 *    2. Client знаходить свій ліфт
 *    3. Client створює заявку на ліфт
 *    4. Admin бачить заявку (GET /api/requests)
 *    5. Dispatcher бачить заявку
 *
 *  СЦЕНАРІЙ B — Admin призначає → Technician бачить
 *    6. Admin призначає Technician на заявку
 *    7. Technician бачить заявку у загальному списку
 *
 *  СЦЕНАРІЙ C — Technician виконує → всі бачать зміну статусу
 *    8. Technician змінює статус → "in_progress"
 *    9. Admin бачить статус "in_progress"
 *   10. Dispatcher бачить статус "in_progress"
 *
 *  СЦЕНАРІЙ D — Dispatcher закриває → Admin/Client бачать
 *   11. Dispatcher змінює статус → "completed"
 *   12. Admin бачить статус "completed"
 *
 *  СЦЕНАРІЙ E — Перевірка прав (негативні тести)
 *   13. Client НЕ може призначити техніка (403)
 *   14. Technician НЕ може видалити заявку (403 або дозволено перевіряємо)
 *   15. Dispatcher НЕ може видалити (залежить від ролі)
 *
 *  СЦЕНАРІЙ F — Admin створює заявку → Client з ліфтом її бачить
 *   16. Admin створює заявку (liftId клієнтського ліфта)
 *   17. Client може отримати деталі по ID
 *
 *  CLEANUP — видалення тестових даних
 *
 * Запуск: node test-role-integration.js
 */

'use strict';

const http = require('http');

const BASE_HOST = '127.0.0.1';
const BASE_PORT = 5000;
const COLORS = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m', dim: '\x1b[2m'
};
const c = (color, s) => `${COLORS[color]}${s}${COLORS.reset}`;

// ─── Demo account credentials (from README) ──────────────────────────────────
const ACCOUNTS = {
  admin:      { email: 'info@festlift.pt',           password: 'admin123' },
  dispatcher: { email: 'dispatcher@festlift.pt',     password: 'dispatcher123' },
  tech:       { email: 'tech1@festlift.pt',           password: 'tech123' },
  client:     { email: 'client@festlift.pt',          password: 'client123' },
};

// ─── State ────────────────────────────────────────────────────────────────────
const tokens = {};
const users  = {};
let createdRequestIds = [];   // IDs to cleanup at the end
let testLiftId = null;
let testRequestId = null;     // main test request

let passed = 0, failed = 0, warned = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);
    const req = http.request(
      { host: BASE_HOST, port: BASE_PORT, path, method, headers },
      (res) => {
        let raw = '';
        res.on('data', c => raw += c);
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(raw); } catch (_) {}
          resolve({ status: res.statusCode, json });
        });
      }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function ok(label, cond, detail = '') {
  if (cond) {
    console.log(`  ${c('green','✔')} ${label}${detail ? c('dim', '  └─ '+detail) : ''}`);
    passed++;
  } else {
    console.log(`  ${c('red','✘')} ${label}${detail ? c('dim', '  └─ '+detail) : ''}`);
    failed++;
  }
}

function warn(label, detail = '') {
  console.log(`  ${c('yellow','⚠')} ${label}${detail ? c('dim', '  └─ '+detail) : ''}`);
  warned++;
}

function section(title) {
  console.log(`\n${c('bold', c('cyan', `▶ ${title}`))}`);
}

// ─── Step 0 — Check server health ────────────────────────────────────────────
async function checkHealth() {
  section('PRE-CHECK — Сервер та БД');
  try {
    const { status, json } = await api('GET', '/api/health');
    ok('Сервер відповідає (GET /api/health)', status === 200, `HTTP ${status}`);
    if (json) {
      ok('MongoDB connected', json.mongodb === 'connected' || json.database === 'connected' || !!json.database, JSON.stringify(json).substring(0,80));
    }
  } catch (e) {
    ok('Сервер відповідає', false, e.message);
    console.log(c('red', '\n  FATAL: Сервер не запущено. Запустіть ./autostart.sh\n'));
    process.exit(1);
  }
}

// ─── Step 1 — Login all roles ─────────────────────────────────────────────────
async function loginAll() {
  section('STEP 1 — Логін усіх ролей');
  for (const [role, creds] of Object.entries(ACCOUNTS)) {
    const { status, json } = await api('POST', '/api/auth/login', creds);
    const token = json?.token || json?.data?.token;
    const user  = json?.user  || json?.data?.user;
    if (status === 200 && token) {
      tokens[role] = token;
      users[role]  = user || {};
      ok(`Login [${role}]`, true, user ? `${user.firstName || ''} ${user.lastName || ''} <${user.email}>`.trim() : '');
    } else {
      ok(`Login [${role}]`, false, `HTTP ${status} — ${json?.message || 'no token'}`);
    }
  }
}

// ─── Step 2 — Find client lift ───────────────────────────────────────────────
async function findClientLift() {
  section('STEP 2 — Знаходимо ліфт для клієнта');
  if (!tokens.client) { warn('Пропущено — клієнт не авторизований'); return; }

  const { status, json } = await api('GET', '/api/lifts', null, tokens.client);
  const lifts = json?.data || json?.lifts || (Array.isArray(json) ? json : []);

  if (status === 200 && lifts.length > 0) {
    testLiftId = (lifts[0]._id || lifts[0].id).toString();
    ok(`Клієнт має ліфти (${lifts.length} шт.)`, true, `Перший: "${lifts[0].name || lifts[0].address || testLiftId}"`);
  } else if (status === 200 && lifts.length === 0) {
    warn('Клієнт не має ліфтів — тест сценарію A буде без liftId');
    testLiftId = null;
  } else {
    ok('GET /api/lifts (client)', false, `HTTP ${status}`);
  }
}

// ─── SCENARIO A — Client creates request, Admin+Dispatcher see it ─────────────
async function scenarioA() {
  section('СЦЕНАРІЙ A — Client створює заявку → Admin / Dispatcher бачать');
  if (!tokens.client) { warn('Пропущено'); return; }

  const body = {
    title: `[AUTO-TEST] Несправність ліфта ${Date.now()}`,
    description: 'Автоматичний тест cross-role flow. Можна видалити.',
    type: 'repair',
    priority: 'medium',
    status: 'new',
    liftId: testLiftId || undefined,
  };

  // A1 — Client creates
  const { status: cs, json: cj } = await api('POST', '/api/requests', body, tokens.client);
  const created = cj?.data || cj?.request;
  testRequestId = created?._id?.toString() || created?.id?.toString();
  if (testRequestId) createdRequestIds.push(testRequestId);

  ok('A1 — Client створює заявку (POST /api/requests)', cs === 200 || cs === 201,
     `HTTP ${cs} → ID: ${testRequestId || 'n/a'}`);

  if (!testRequestId) { warn('Неможливо продовжити без ID заявки'); return; }

  // A2 — Admin sees it in list
  const { status: as, json: aj } = await api('GET', '/api/requests', null, tokens.admin);
  const adminList = aj?.data?.requests || aj?.data || (Array.isArray(aj) ? aj : []);
  const adminFound = adminList.some(r => (r._id || r.id)?.toString() === testRequestId);
  ok('A2 — Admin бачить заявку у GET /api/requests', as === 200 && adminFound,
     `HTTP ${as}, всього: ${adminList.length}, знайдено: ${adminFound}`);

  // A3 — Admin gets by ID
  const { status: as2, json: aj2 } = await api('GET', `/api/requests/${testRequestId}`, null, tokens.admin);
  ok('A3 — Admin GET /api/requests/:id', as2 === 200, `HTTP ${as2}`);

  // A4 — Dispatcher sees it
  const { status: ds, json: dj } = await api('GET', '/api/requests', null, tokens.dispatcher);
  const dispList = dj?.data?.requests || dj?.data || (Array.isArray(dj) ? dj : []);
  const dispFound = dispList.some(r => (r._id || r.id)?.toString() === testRequestId);
  ok('A4 — Dispatcher бачить заявку у GET /api/requests', ds === 200 && dispFound,
     `HTTP ${ds}, знайдено: ${dispFound}`);
}

// ─── SCENARIO B — Admin assigns Technician ───────────────────────────────────
async function scenarioB() {
  section('СЦЕНАРІЙ B — Admin призначає → Technician бачить');
  if (!testRequestId || !tokens.admin) { warn('Пропущено'); return; }

  // Find technician ID
  const { status: us, json: uj } = await api('GET', '/api/users', null, tokens.admin);
  const allUsers = uj?.data || uj?.users || (Array.isArray(uj) ? uj : []);
  const techUser = allUsers.find(u => u.role === 'tech' || u.role === 'technician');
  const techId = techUser?._id?.toString() || techUser?.id?.toString();

  ok('B0 — Знайдено техніка в системі', !!techId,
     techId ? `${techUser?.firstName} ${techUser?.lastName} (${techUser?.email})` : 'Техніків немає!');
  if (!techId) { warn('Сценарій B пропущено — немає техніків'); return; }

  // B1 — Admin assigns
  const { status: as, json: aj } = await api(
    'POST', `/api/requests/${testRequestId}/assign`,
    { technicianId: techId, instructions: 'Тест cross-role призначення', deadline: new Date(Date.now() + 7*24*60*60*1000).toISOString() },
    tokens.admin
  );
  ok('B1 — Admin призначає техніка (POST /api/requests/:id/assign)',
     as === 200 || as === 201, `HTTP ${as} — ${aj?.message || ''}`);

  // B2 — Verify status changed to "assigned"
  const { status: rs, json: rj } = await api('GET', `/api/requests/${testRequestId}`, null, tokens.admin);
  const reqStatus = rj?.request?.status || rj?.data?.status;
  ok('B2 — Статус заявки змінено на "assigned"', reqStatus === 'assigned',
     `Поточний статус: ${reqStatus}`);

  // B3 — Technician can see the request
  const { status: ts, json: tj } = await api('GET', '/api/requests', null, tokens.tech);
  const techList = tj?.data?.requests || tj?.data || (Array.isArray(tj) ? tj : []);
  const techFound = techList.some(r => (r._id || r.id)?.toString() === testRequestId);
  ok('B3 — Technician бачить заявку у GET /api/requests', ts === 200 && techFound,
     `HTTP ${ts}, знайдено: ${techFound}`);

  // B4 — Technician can get request by ID
  const { status: ts2 } = await api('GET', `/api/requests/${testRequestId}`, null, tokens.tech);
  ok('B4 — Technician GET /api/requests/:id', ts2 === 200, `HTTP ${ts2}`);
}

// ─── SCENARIO C — Technician updates status ──────────────────────────────────
async function scenarioC() {
  section('СЦЕНАРІЙ C — Technician змінює статус → Admin / Dispatcher бачать');
  if (!testRequestId || !tokens.tech) { warn('Пропущено'); return; }

  // C1 — Tech sets in_progress
  const { status: ts, json: tj } = await api(
    'PATCH', `/api/requests/${testRequestId}/status`,
    { status: 'in_progress' },
    tokens.tech
  );
  ok('C1 — Technician PATCH статус → "in_progress"',
     ts === 200 || ts === 201, `HTTP ${ts} — ${tj?.message || ''}`);

  // C2 — Admin sees in_progress
  const { json: aj } = await api('GET', `/api/requests/${testRequestId}`, null, tokens.admin);
  const sAdmin = aj?.request?.status || aj?.data?.status;
  ok('C2 — Admin бачить статус "in_progress"', sAdmin === 'in_progress',
     `Статус у адміна: ${sAdmin}`);

  // C3 — Dispatcher sees in_progress
  const { json: dj } = await api('GET', `/api/requests/${testRequestId}`, null, tokens.dispatcher);
  const sDisp = dj?.request?.status || dj?.data?.status;
  ok('C3 — Dispatcher бачить статус "in_progress"', sDisp === 'in_progress',
     `Статус у диспетчера: ${sDisp}`);
}

// ─── SCENARIO D — Dispatcher completes ───────────────────────────────────────
async function scenarioD() {
  section('СЦЕНАРІЙ D — Dispatcher закриває заявку → Admin бачить "completed"');
  if (!testRequestId || !tokens.dispatcher) { warn('Пропущено'); return; }

  const { status: ds, json: dj } = await api(
    'PATCH', `/api/requests/${testRequestId}/status`,
    { status: 'completed' },
    tokens.dispatcher
  );
  ok('D1 — Dispatcher PATCH статус → "completed"',
     ds === 200 || ds === 201, `HTTP ${ds} — ${dj?.message || ''}`);

  const { json: aj } = await api('GET', `/api/requests/${testRequestId}`, null, tokens.admin);
  const sAdmin = aj?.request?.status || aj?.data?.status;
  ok('D2 — Admin бачить статус "completed"', sAdmin === 'completed',
     `Статус у адміна: ${sAdmin}`);

  // D3 — Client can still read it
  const { status: cs } = await api('GET', `/api/requests/${testRequestId}`, null, tokens.client);
  ok('D3 — Client читає виконану заявку (GET /api/requests/:id)', cs === 200,
     `HTTP ${cs}`);
}

// ─── SCENARIO E — Permission checks ──────────────────────────────────────────
async function scenarioE() {
  section('СЦЕНАРІЙ E — Перевірка прав (негативні тести)');
  if (!testRequestId) { warn('Пропущено — немає testRequestId'); return; }

  // E1 — Client can NOT assign technician
  const { status: c1s, json: c1j } = await api(
    'POST', `/api/requests/${testRequestId}/assign`,
    { technicianId: '000000000000000000000001' },
    tokens.client
  );
  ok('E1 — Client НЕ може призначити техніка (403)',
     c1s === 403, `HTTP ${c1s} — ${c1j?.message || ''}`);

  // E2 — Technician can NOT delete request (create a fresh one for this test)
  const { status: tmpS, json: tmpJ } = await api('POST', '/api/requests',
    { title: '[TEMP-E2] Тест видалення', description: 'tmp', type: 'repair', priority: 'low', status: 'new' },
    tokens.admin
  );
  const tmpId = (tmpJ?.data?._id || tmpJ?.data?.id || '').toString();
  if (tmpId) createdRequestIds.push(tmpId);

  const { status: t1s } = await api('DELETE', `/api/requests/${tmpId || testRequestId}`, null, tokens.tech);
  ok('E2 — Technician НЕ може видалити заявку (403)',
     t1s === 403, `HTTP ${t1s}`);

  // E3 — Client can NOT delete request
  const { status: c2s } = await api('DELETE', `/api/requests/${tmpId || testRequestId}`, null, tokens.client);
  ok('E3 — Client НЕ може видалити заявку (403)',
     c2s === 403, `HTTP ${c2s}`);

  // E4 — Unauthenticated request is blocked
  const { status: us } = await api('GET', '/api/requests');
  ok('E4 — Неавторизований запит блокується (401)',
     us === 401, `HTTP ${us}`);
}

// ─── SCENARIO F — Admin creates request, client sees it ──────────────────────
async function scenarioF() {
  section('СЦЕНАРІЙ F — Admin створює заявку → Client бачить');
  if (!tokens.admin || !testLiftId) {
    warn('Пропущено — немає admin token або liftId');
    return;
  }

  const body = {
    title: `[AUTO-TEST-ADMIN] Планова інспекція ${Date.now()}`,
    description: 'Створено адміністратором. Автотест.',
    type: 'inspection',
    priority: 'low',
    status: 'new',
    liftId: testLiftId,
  };

  const { status: as, json: aj } = await api('POST', '/api/requests', body, tokens.admin);
  const adminCreated = aj?.data || aj?.request;
  const adminReqId = adminCreated?._id?.toString() || adminCreated?.id?.toString();
  if (adminReqId) createdRequestIds.push(adminReqId);

  ok('F1 — Admin створює заявку для клієнтського ліфта',
     as === 200 || as === 201, `HTTP ${as} → ID: ${adminReqId}`);

  if (!adminReqId) return;

  // Client can read it by ID
  const { status: cs } = await api('GET', `/api/requests/${adminReqId}`, null, tokens.client);
  ok('F2 — Client читає заявку адміна по ID',
     cs === 200, `HTTP ${cs}`);

  // Client sees it in list too
  const { json: clistj } = await api('GET', '/api/requests', null, tokens.client);
  const clist = clistj?.data?.requests || clistj?.data || (Array.isArray(clistj) ? clistj : []);
  const cFound = clist.some(r => (r._id || r.id)?.toString() === adminReqId);
  ok('F3 — Client бачить заявку адміна у GET /api/requests',
     cFound, `Знайдено в списку: ${cFound}`);
}

// ─── SCENARIO G — Dispatcher creates + assigns in one flow ───────────────────
async function scenarioG() {
  section('СЦЕНАРІЙ G — Dispatcher створює заявку і призначає Technician');
  if (!tokens.dispatcher) { warn('Пропущено'); return; }

  const body = {
    title: `[AUTO-TEST-DISP] Аварійний виклик ${Date.now()}`,
    description: 'Створено диспетчером. Автотест.',
    type: 'emergency',
    priority: 'critical',
    status: 'new',
    liftId: testLiftId || undefined,
  };

  const { status: ds, json: dj } = await api('POST', '/api/requests', body, tokens.dispatcher);
  const dispReq = dj?.data || dj?.request;
  const dispReqId = dispReq?._id?.toString() || dispReq?.id?.toString();
  if (dispReqId) createdRequestIds.push(dispReqId);

  ok('G1 — Dispatcher створює заявку',
     ds === 200 || ds === 201, `HTTP ${ds} → ID: ${dispReqId}`);

  if (!dispReqId) return;

  // Find tech
  const { json: uj } = await api('GET', '/api/users', null, tokens.dispatcher);
  const allU = uj?.data || uj?.users || (Array.isArray(uj) ? uj : []);
  const tech = allU.find(u => u.role === 'tech' || u.role === 'technician');
  const techId = tech?._id?.toString() || tech?.id?.toString();

  if (!techId) { warn('G2 — Немає техніків для призначення'); return; }

  const { status: as } = await api(
    'POST', `/api/requests/${dispReqId}/assign`,
    { technicianId: techId },
    tokens.dispatcher
  );
  ok('G2 — Dispatcher призначає техніка на свою заявку',
     as === 200 || as === 201, `HTTP ${as}`);

  // Tech sees it
  const { json: tj } = await api('GET', '/api/requests', null, tokens.tech);
  const tlist = tj?.data?.requests || tj?.data || (Array.isArray(tj) ? tj : []);
  const tFound = tlist.some(r => (r._id || r.id)?.toString() === dispReqId);
  ok('G3 — Technician бачить заявку від диспетчера', tFound,
     `Знайдено: ${tFound}`);
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────
async function cleanup() {
  section('CLEANUP — Видалення тестових заявок');
  let deleted = 0;
  for (const id of [...new Set(createdRequestIds)]) {
    const { status } = await api('DELETE', `/api/requests/${id}`, null, tokens.admin);
    if (status === 200 || status === 204) {
      deleted++;
    } else {
      warn(`Не вдалося видалити ${id} (HTTP ${status})`);
    }
  }
  ok(`Видалено тестових заявок: ${deleted} / ${createdRequestIds.length}`, deleted === createdRequestIds.length);
}

// ─── Summary ──────────────────────────────────────────────────────────────────
function summary() {
  const total = passed + failed;
  console.log('\n' + '─'.repeat(55));
  console.log(c('bold', '  ПІДСУМОК ІНТЕГРАЦІЙНОГО ТЕСТУВАННЯ'));
  console.log('─'.repeat(55));
  console.log(`  ${c('green', '✔ Пройдено:')}  ${passed}`);
  console.log(`  ${c('red',   '✘ Провалено:')} ${failed}`);
  if (warned) console.log(`  ${c('yellow','⚠ Попередження:')} ${warned}`);
  console.log(`  Всього перевірок: ${total}`);
  console.log('─'.repeat(55));

  if (failed === 0) {
    console.log(c('green', c('bold', '\n  ✅ ВСІ ПЕРЕВІРКИ ПРОЙДЕНО!')));
    console.log(c('dim',   '  Всі ролі взаємодіють коректно.\n'));
  } else {
    console.log(c('red', c('bold', `\n  ❌ ${failed} перевірка(ок) провалено!`)));
    console.log(c('dim', '  Перевірте логи вище для деталей.\n'));
    process.exitCode = 1;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(c('bold', '\n🔗 CROSS-ROLE INTEGRATION TEST — FestLift / DeapSeaK'));
  console.log(c('dim', `   ${new Date().toLocaleString('pt-PT')}   http://${BASE_HOST}:${BASE_PORT}\n`));

  try {
    await checkHealth();
    await loginAll();
    await findClientLift();
    await scenarioA();
    await scenarioB();
    await scenarioC();
    await scenarioD();
    await scenarioE();
    await scenarioF();
    await scenarioG();
    await cleanup();
  } catch (err) {
    console.error(c('red', '\n  FATAL: ' + err.message));
    console.error(err.stack);
    process.exitCode = 1;
  }

  summary();
})();
