#!/usr/bin/env node
/**
 * АУДИТ РОЛЕЙ ТА API — FestLift / Deapseak
 * Перевіряє: аутентифікацію, авторизацію, ізоляцію даних між ролями
 */

const http = require('http');

const BASE = 'http://localhost:5000';
let passed = 0, failed = 0, warnings = 0;
const results = [];

// ─── HTTP helper ──────────────────────────────────────────────────
function req(method, path, body, token) {
    return new Promise((resolve) => {
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: '127.0.0.1', port: 5000,  // explicit IPv4
            path, method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
            }
        };
        const r = http.request(opts, (res) => {
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

// ─── Test helpers ────────────────────────────────────────────────
function PASS(msg) { passed++; results.push(`  ✅ ${msg}`); }
function FAIL(msg) { failed++; results.push(`  ❌ ${msg}`); }
function WARN(msg) { warnings++; results.push(`  ⚠️  ${msg}`); }
function HDR(msg)  { results.push(`\n${msg}`); }

// ─── Login helper ────────────────────────────────────────────────
async function login(emailOrUser, password, expectedRole) {
    const r = await req('POST', '/api/auth/login', { login: emailOrUser, password });
    if (r.status === 200 && r.body.success) {
        const role = r.body.data?.user?.role;
        const name = r.body.data?.user?.firstName || r.body.data?.user?.name || r.body.data?.user?.email;
        if (role !== expectedRole) FAIL(`Login ${emailOrUser}: role=${role}, expected=${expectedRole}`);
        else PASS(`Login ${emailOrUser} → role=${role}, name="${name}"`);
        return r.body.data.token;
    } else {
        FAIL(`Login ${emailOrUser}: HTTP ${r.status} — ${r.body.message}`);
        return null;
    }
}

// ─── Main audit ──────────────────────────────────────────────────
async function run() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('   АУДИТ РОЛЕЙ ТА API — FestLift');
    console.log('═══════════════════════════════════════════════════════');

    // ─── 1. Login всі ролі ────────────────────────────────────────
    HDR('[ 1 ] АУТЕНТИФІКАЦІЯ — усі ролі');
    const adminToken      = await login('info@festlift.pt',      'admin123',      'admin');
    const dispToken       = await login('dispatcher@festlift.pt','dispatcher123', 'dispatcher');
    const techToken       = await login('tech1@festlift.pt',     'tech123',       'technician');
    const clientToken     = await login('client@festlift.pt',    'client123',     'client');

    // ─── 2. Без токена → 401 ─────────────────────────────────────
    HDR('[ 2 ] БЕЗ ТОКЕНА → має бути 401/403');
    const noTokenTests = [
        ['/api/lifts', 'GET lifts без токена'],
        ['/api/requests', 'GET requests без токена'],
        ['/api/users', 'GET users без токена'],
        ['/api/orcamentos', 'GET orcamentos без токена'],
        ['/api/orcamentos/my', 'GET orcamentos/my без токена'],
    ];
    for (const [path, label] of noTokenTests) {
        const r = await req('GET', path, null, null);
        if (r.status === 401 || r.status === 403) PASS(`${label} → ${r.status}`);
        else FAIL(`${label} → ${r.status} (expected 401/403)`);
    }

    // ─── 3. GET /api/orcamentos/my — тільки client ────────────────
    HDR('[ 3 ] GET /api/orcamentos/my — ізоляція ролей');
    for (const [token, role, shouldWork] of [
        [adminToken,  'admin',      false],
        [dispToken,   'dispatcher', false],
        [techToken,   'technician', false],
        [clientToken, 'client',     true],
    ]) {
        if (!token) { WARN(`Пропуск ${role} — немає токена`); continue; }
        const r = await req('GET', '/api/orcamentos/my', null, token);
        if (shouldWork) {
            if (r.status === 200) PASS(`${role} → /my → 200 ✓`);
            else FAIL(`${role} → /my → ${r.status} (expected 200)`);
        } else {
            if (r.status === 403) PASS(`${role} → /my → 403 (заблоковано) ✓`);
            else FAIL(`${role} → /my → ${r.status} (expected 403)`);
        }
    }

    // ─── 4. GET /api/orcamentos — тільки admin/dispatcher ────────
    HDR('[ 4 ] GET /api/orcamentos — тільки admin/dispatcher');
    for (const [token, role, shouldWork] of [
        [adminToken,  'admin',      true],
        [dispToken,   'dispatcher', true],
        [techToken,   'technician', false],
        [clientToken, 'client',     false],
    ]) {
        if (!token) { WARN(`Пропуск ${role}`); continue; }
        const r = await req('GET', '/api/orcamentos', null, token);
        if (shouldWork) {
            if (r.status === 200) PASS(`${role} → GET /orcamentos → 200 ✓`);
            else FAIL(`${role} → GET /orcamentos → ${r.status}`);
        } else {
            if (r.status === 403) PASS(`${role} → GET /orcamentos → 403 ✓`);
            else FAIL(`${role} → GET /orcamentos → ${r.status} (expected 403)`);
        }
    }

    // ─── 5. Операції з орçаментами — client НЕ може ──────────────
    HDR('[ 5 ] Orçamentos — client не може POST/PUT/DELETE/PATCH');
    if (clientToken) {
        const tests = [
            ['POST',   '/api/orcamentos',             {numero:'TEST',cliente:{nome:'X',email:'x@x.pt',morada:'X'},servicos:[],validadeAte:'2026-12-01'}],
            ['DELETE', '/api/orcamentos/000000000000000000000001', null],
            ['PATCH',  '/api/orcamentos/000000000000000000000001/status', {status:'aprovado'}],
            ['POST',   '/api/orcamentos/000000000000000000000001/enviar', {email:'x@x.pt'}],
        ];
        for (const [method, path, body] of tests) {
            const r = await req(method, path, body, clientToken);
            if (r.status === 403) PASS(`client ${method} ${path.split('/').pop()} → 403 ✓`);
            else if (r.status === 404) PASS(`client ${method} ${path.split('/').pop()} → 404 (not found, but not 200) ✓`);
            else FAIL(`client ${method} ${path.split('/').pop()} → ${r.status} (expected 403)`);
        }
    }

    // ─── 6. GET /api/users — тільки admin ─────────────────────────
    HDR('[ 6 ] GET /api/users — тільки admin');
    for (const [token, role, shouldWork] of [
        [adminToken,  'admin',      true],
        [dispToken,   'dispatcher', false],
        [techToken,   'technician', false],
        [clientToken, 'client',     false],
    ]) {
        if (!token) { WARN(`Пропуск ${role}`); continue; }
        const r = await req('GET', '/api/users', null, token);
        if (shouldWork) {
            if (r.status === 200) PASS(`${role} → GET /users → 200 ✓`);
            else FAIL(`${role} → GET /users → ${r.status}`);
        } else {
            if (r.status === 403) PASS(`${role} → GET /users → 403 ✓`);
            else FAIL(`${role} → GET /users → ${r.status} (expected 403)`);
        }
    }

    // ─── 7. GET /api/lifts ────────────────────────────────────────
    HDR('[ 7 ] GET /api/lifts — доступ усіх ролей');
    for (const [token, role] of [
        [adminToken, 'admin'], [dispToken, 'dispatcher'],
        [techToken, 'technician'], [clientToken, 'client'],
    ]) {
        if (!token) { WARN(`Пропуск ${role}`); continue; }
        const r = await req('GET', '/api/lifts', null, token);
        if (r.status === 200) PASS(`${role} → GET /lifts → 200 ✓`);
        else FAIL(`${role} → GET /lifts → ${r.status}`);
    }

    // ─── 8. GET /api/requests ─────────────────────────────────────
    HDR('[ 8 ] GET /api/requests — доступ ролей');
    for (const [token, role, shouldWork] of [
        [adminToken,  'admin',      true],
        [dispToken,   'dispatcher', true],
        [techToken,   'technician', true],
        [clientToken, 'client',     true],
    ]) {
        if (!token) { WARN(`Пропуск ${role}`); continue; }
        const r = await req('GET', '/api/requests', null, token);
        if (r.status === 200 || r.status === 404) PASS(`${role} → GET /requests → ${r.status} ✓`);
        else if (r.status === 403) {
            if (!shouldWork) PASS(`${role} → GET /requests → 403 (очікувано) ✓`);
            else FAIL(`${role} → GET /requests → 403 (не має бути заблоковано)`);
        } else FAIL(`${role} → GET /requests → ${r.status}`);
    }

    // ─── 9. Профіль ──────────────────────────────────────────────
    HDR('[ 9 ] GET /api/users/profile — всі авторизовані');
    for (const [token, role] of [
        [adminToken, 'admin'], [dispToken, 'dispatcher'],
        [techToken, 'technician'], [clientToken, 'client'],
    ]) {
        if (!token) { WARN(`Пропуск ${role}`); continue; }
        const r = await req('GET', '/api/users/profile', null, token);
        if (r.status === 200) {
            const email = r.body.data?.email || r.body.email;
            PASS(`${role} → GET /profile → 200, email=${email}`);
        } else FAIL(`${role} → GET /profile → ${r.status}`);
    }

    // ─── 10. Ізоляція даних клієнта ──────────────────────────────
    HDR('[ 10 ] Ізоляція орçаментів клієнта');
    if (clientToken) {
        const r = await req('GET', '/api/orcamentos/my', null, clientToken);
        if (r.status === 200) {
            const orcamentos = r.body.data || [];
            const allMatchEmail = orcamentos.every(o => o.cliente?.email === 'client@festlift.pt');
            if (orcamentos.length === 0) PASS(`client@festlift.pt → 0 орçаментів (очікувано)`);
            else if (allMatchEmail) PASS(`client@festlift.pt → ${orcamentos.length} орçаментів, усі свої ✓`);
            else FAIL(`client@festlift.pt → є чужі орçаменти!`);
        } else FAIL(`GET /my для client@festlift.pt → ${r.status}`);
    }

    // ─── 11. Зміна ролі тільки admin ─────────────────────────────
    HDR('[ 11 ] PATCH /api/auth/users/:id/role — тільки admin');
    const { ObjectId } = require('mongodb');
    const fakeId = '000000000000000000000001';
    for (const [token, role, shouldWork] of [
        [dispToken,   'dispatcher', false],
        [clientToken, 'client',     false],
        [adminToken,  'admin',      true],  // may return 404 for fake ID — that's OK
    ]) {
        if (!token) { WARN(`Пропуск ${role}`); continue; }
        const r = await req('PATCH', `/api/auth/users/${fakeId}/role`, { role: 'client' }, token);
        if (!shouldWork) {
            if (r.status === 403) PASS(`${role} → PATCH role → 403 ✓`);
            else FAIL(`${role} → PATCH role → ${r.status} (expected 403)`);
        } else {
            if (r.status === 403) FAIL(`admin → PATCH role → 403 (should be allowed)`);
            else PASS(`admin → PATCH role → ${r.status} (not 403) ✓`);
        }
    }

    // ─── 12. Orçamento auto-expiry ────────────────────────────────
    HDR('[ 12 ] Орçаменти — статус expirado для прострочених');
    if (adminToken) {
        const r = await req('GET', '/api/orcamentos', null, adminToken);
        if (r.status === 200) {
            const all = r.body.data || [];
            const now = new Date();
            const badOnes = all.filter(o =>
                o.status === 'enviado' &&
                o.validadeAte &&
                new Date(o.validadeAte) < now
            );
            if (badOnes.length === 0) PASS(`Жодного прострочено+enviado орçаменту ✓`);
            else FAIL(`${badOnes.length} орçаментів досі "enviado" але прострочені: ${badOnes.map(o=>o.numero).join(', ')}`);
        }
    }

    // ─── Summary ──────────────────────────────────────────────────
    results.forEach(r => console.log(r));
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`  ✅ Passed:   ${passed}`);
    console.log(`  ❌ Failed:   ${failed}`);
    console.log(`  ⚠️  Warnings: ${warnings}`);
    console.log('═══════════════════════════════════════════════════════');

    if (failed === 0) console.log('\n🎉 ВСЕ ТЕСТИ ПРОЙШЛИ!\n');
    else console.log(`\n⚠️  ${failed} ТЕСТ(ИВ) НЕ ПРОЙШЛО — потребує уваги\n`);

    process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(2); });
