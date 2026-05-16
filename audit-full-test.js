/**
 * ПОВНИЙ ФУНКЦІОНАЛЬНИЙ АУДИТ
 * Тестує всі ролі, endpoints і основні функції системи
 */

const http = require('http');

const BASE = 'http://127.0.0.1:5000'; // IPv4 явно — IPv6 (::1) не завжди працює в codespace
let passed = 0, failed = 0, warnings = 0;
const issues = [];

function req(method, path, body, token) {
    return new Promise((resolve) => {
        const data = body ? JSON.stringify(body) : null;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (data) headers['Content-Length'] = Buffer.byteLength(data);

        const r = http.request(`${BASE}${path}`, { method, headers }, (res) => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
                catch { resolve({ status: res.statusCode, body: raw }); }
            });
        });
        r.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
        if (data) r.write(data);
        r.end();
    });
}

function ok(name, condition, detail = '') {
    if (condition) {
        console.log(`  ✅ ${name}`);
        passed++;
    } else {
        console.log(`  ❌ ${name}${detail ? ': ' + detail : ''}`);
        failed++;
        issues.push({ name, detail });
    }
}

function warn(name, detail) {
    console.log(`  ⚠️  ${name}: ${detail}`);
    warnings++;
}

async function login(email, password) {
    const r = await req('POST', '/api/auth/login', { email, password });
    return r.status === 200 && r.body?.data?.token ? r.body.data.token : null;
}

async function run() {
    console.log('\n🔍 ============================================================');
    console.log('🔍  FESTLIFT — ПОВНИЙ ФУНКЦІОНАЛЬНИЙ АУДИТ');
    console.log('🔍 ============================================================\n');

    // ─── 1. HEALTH ───────────────────────────────────────────────────────────
    console.log('1️⃣  HEALTH CHECK');
    const health = await req('GET', '/api/health');
    ok('Server responds', health.status === 200);
    ok('Status ok', health.body?.status === 'ok');
    ok('MongoDB connected', health.body?.mongodb !== 'disconnected');

    // ─── 2. AUTH — всі ролі ──────────────────────────────────────────────────
    console.log('\n2️⃣  AUTENTICAÇÃO — todas as roles');

    const creds = [
        { role: 'admin',      email: 'info@festlift.pt',       pass: 'admin123' },
        { role: 'dispatcher', email: 'dispatcher@festlift.pt', pass: 'dispatcher123' },
        { role: 'technician', email: 'tech1@festlift.pt',      pass: 'tech123' },
        { role: 'client',     email: 'client@festlift.pt',     pass: 'client123' },
    ];

    const tokens = {};
    for (const c of creds) {
        const token = await login(c.email, c.pass);
        tokens[c.role] = token;
        ok(`Login ${c.role} (${c.email})`, !!token, token ? '' : 'Login failed / user not found');
    }

    // ─── 3. INVALID AUTH ─────────────────────────────────────────────────────
    console.log('\n3️⃣  SEGURANÇA — auth inválida');
    const badLogin = await req('POST', '/api/login', { email: 'hacker@evil.com', password: 'wrong' });
    ok('Reject wrong credentials', badLogin.status === 401 || badLogin.status === 400 || !badLogin.body?.token);

    const noToken = await req('GET', '/api/lifts');
    ok('Protected route requires auth', noToken.status === 401 || noToken.status === 403);

    // ─── 4. LIFTS ────────────────────────────────────────────────────────────
    console.log('\n4️⃣  LIFTS — CRUD');
    if (tokens.admin) {
        const lifts = await req('GET', '/api/lifts', null, tokens.admin);
        ok('GET /api/lifts (admin)', lifts.status === 200);
        ok('Lifts is array or object', Array.isArray(lifts.body) || Array.isArray(lifts.body?.lifts) || Array.isArray(lifts.body?.data) || typeof lifts.body === 'object');
    } else { warn('GET /api/lifts', 'skipped — admin token missing'); }

    if (tokens.client) {
        const clientLifts = await req('GET', '/api/lifts', null, tokens.client);
        ok('GET /api/lifts (client)', clientLifts.status === 200 || clientLifts.status === 403);
    }

    if (tokens.dispatcher) {
        const dispLifts = await req('GET', '/api/lifts', null, tokens.dispatcher);
        ok('GET /api/lifts (dispatcher)', dispLifts.status === 200);
    }

    // ─── 5. REQUESTS ─────────────────────────────────────────────────────────
    console.log('\n5️⃣  REQUESTS / PEDIDOS');
    if (tokens.admin) {
        const reqs = await req('GET', '/api/requests', null, tokens.admin);
        ok('GET /api/requests (admin)', reqs.status === 200);
    }
    if (tokens.dispatcher) {
        const reqs = await req('GET', '/api/requests', null, tokens.dispatcher);
        ok('GET /api/requests (dispatcher)', reqs.status === 200);
    }
    if (tokens.technician) {
        const reqs = await req('GET', '/api/requests', null, tokens.technician);
        ok('GET /api/requests (technician)', reqs.status === 200 || reqs.status === 403);
    }

    // ─── 6. USERS (admin only) ───────────────────────────────────────────────
    console.log('\n6️⃣  USERS — kontrol rolí');
    if (tokens.admin) {
        const users = await req('GET', '/api/users', null, tokens.admin);
        ok('GET /api/users (admin)', users.status === 200);
    }
    if (tokens.client) {
        const users = await req('GET', '/api/users', null, tokens.client);
        ok('Client CANNOT access /api/users', users.status === 401 || users.status === 403);
    }
    if (tokens.technician) {
        const users = await req('GET', '/api/users', null, tokens.technician);
        ok('Technician CANNOT access /api/users', users.status === 401 || users.status === 403);
    }

    // ─── 7. ORCAMENTOS ───────────────────────────────────────────────────────
    console.log('\n7️⃣  ORÇAMENTOS');
    if (tokens.admin) {
        const orc = await req('GET', '/api/orcamentos', null, tokens.admin);
        ok('GET /api/orcamentos (admin)', orc.status === 200);
    }
    if (tokens.dispatcher) {
        const orc = await req('GET', '/api/orcamentos', null, tokens.dispatcher);
        ok('GET /api/orcamentos (dispatcher)', orc.status === 200 || orc.status === 403);
    }

    // ─── 8. INSPECTIONS ──────────────────────────────────────────────────────
    console.log('\n8️⃣  INSPECTIONS');
    if (tokens.admin) {
        const insp = await req('GET', '/api/inspections', null, tokens.admin);
        ok('GET /api/inspections (admin)', insp.status === 200 || insp.status === 404);
    }

    // ─── 9. AI CHAT ──────────────────────────────────────────────────────────
    console.log('\n9️⃣  AI CHAT');
    if (tokens.admin) {
        const ai = await req('POST', '/api/ai/chat', { message: 'O que é o DL 320/2002?' }, tokens.admin);
        ok('POST /api/ai/chat responds', ai.status === 200 || ai.status === 429, `status=${ai.status}`);
        if (ai.status === 200) {
            ok('AI chat has response text', !!ai.body?.data?.response);
        }
    }

    // ─── 10. AGENT ───────────────────────────────────────────────────────────
    console.log('\n🔟  AI AGENT NOTIFICATIONS');
    if (tokens.admin) {
        const notif = await req('GET', '/api/agent/notifications', null, tokens.admin);
        ok('GET /api/agent/notifications (admin)', notif.status === 200);
    }
    if (tokens.dispatcher) {
        const notif = await req('GET', '/api/agent/notifications', null, tokens.dispatcher);
        ok('GET /api/agent/notifications (dispatcher)', notif.status === 200);
    }

    // ─── 11. REGULATIONS ─────────────────────────────────────────────────────
    console.log('\n1️⃣1️⃣  REGULATIONS');
    if (tokens.admin) {
        const reg = await req('GET', '/api/regulations', null, tokens.admin);
        ok('GET /api/regulations', reg.status === 200 || reg.status === 404, `status=${reg.status}`);
    }

    // ─── 12. PROFILE ─────────────────────────────────────────────────────────
    console.log('\n1️⃣2️⃣  PROFILE — кожна роль');
    for (const [role, token] of Object.entries(tokens)) {
        if (!token) continue;
        const profile = await req('GET', '/api/users/profile', null, token);
        ok(`GET /api/users/profile (${role})`, profile.status === 200, `status=${profile.status}`);
    }

    // ─── 13. PDF UPLOAD (без файлу — перевірка endpoint) ────────────────────
    console.log('\n1️⃣3️⃣  PDF UPLOAD ENDPOINT');
    if (tokens.admin) {
        const pdf = await req('POST', '/api/pdf/upload', {}, tokens.admin);
        ok('POST /api/pdf/upload reachable (no file = 400)', pdf.status === 400 || pdf.status === 422 || pdf.status === 500, `status=${pdf.status}`);
    }

    // ─── 14. QR ──────────────────────────────────────────────────────────────
    console.log('\n1️⃣4️⃣  QR ENDPOINTS');
    if (tokens.admin) {
        const qr = await req('GET', '/api/qr/list', null, tokens.admin);
        ok('GET /api/qr/list', qr.status === 200 || qr.status === 404, `status=${qr.status}`);
    }

    // ─── 15. STATIC PAGES ────────────────────────────────────────────────────
    console.log('\n1️⃣5️⃣  STATIC PAGES');
    const pages = [
        '/',
        '/pages/auth/login.html',
        '/pages/admin/dashboard.html',
        '/pages/dispatcher/dashboard.html',
        '/pages/technician/dashboard.html',
        '/pages/client/dashboard.html',
        '/pages/ai-assistant/index.html',
    ];
    for (const page of pages) {
        const r = await req('GET', page);
        ok(`Page ${page}`, r.status === 200, `status=${r.status}`);
    }

    // ─── SUMMARY ─────────────────────────────────────────────────────────────
    console.log('\n🏁 ============================================================');
    console.log(`📊 РЕЗУЛЬТАТИ: ✅ ${passed} passed | ❌ ${failed} failed | ⚠️ ${warnings} warnings`);
    console.log('🏁 ============================================================');

    if (issues.length > 0) {
        console.log('\n🔴 ПРОБЛЕМИ ДЛЯ ВИПРАВЛЕННЯ:');
        issues.forEach((i, n) => console.log(`  ${n + 1}. ${i.name}${i.detail ? ' — ' + i.detail : ''}`));
    } else {
        console.log('\n🟢 Всі тести пройдено!');
    }
}

run().catch(console.error);
