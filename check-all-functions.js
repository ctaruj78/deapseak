#!/usr/bin/env node
/**
 * ============================================================
 * FESTLIFT CRM — Повна діагностика всіх функцій системи
 * Запуск: node check-all-functions.js
 * ============================================================
 */

'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const http  = require('http');
const https = require('https');
const { MongoClient } = require('mongodb');

// ── Налаштування ──────────────────────────────────────────────
const BASE_URL   = process.env.CHECK_URL  || 'http://localhost:5000';
const ADMIN_USER = process.env.CHECK_USER || 'info@festlift.pt';
const ADMIN_PASS = process.env.CHECK_PASS || process.env.ADMIN_PASS || '';
const MONGO_URI  = process.env.MONGODB_URI || 'mongodb://localhost:27017';
// Brevo API key removed — using SMTP only
const SMTP_HOST  = process.env.SMTP_HOST || '';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

// ── Стан ──────────────────────────────────────────────────────
let token = null;
const results = [];
let passCount = 0;
let failCount = 0;
let warnCount = 0;

// ── Кольори ───────────────────────────────────────────────────
const C = {
    reset:  '\x1b[0m',
    bold:   '\x1b[1m',
    green:  '\x1b[32m',
    red:    '\x1b[31m',
    yellow: '\x1b[33m',
    cyan:   '\x1b[36m',
    gray:   '\x1b[90m',
    white:  '\x1b[97m',
};

function ok(name, detail = '')   { passCount++; results.push({ status: 'OK',   name, detail }); console.log(`  ${C.green}✅ OK${C.reset}    ${name}${detail ? C.gray+' — '+detail+C.reset : ''}`); }
function fail(name, detail = '') { failCount++; results.push({ status: 'FAIL', name, detail }); console.log(`  ${C.red}❌ FAIL${C.reset}  ${name}${detail ? C.gray+' — '+detail+C.reset : ''}`); }
function warn(name, detail = '') { warnCount++; results.push({ status: 'WARN', name, detail }); console.log(`  ${C.yellow}⚠️  WARN${C.reset}  ${name}${detail ? C.gray+' — '+detail+C.reset : ''}`); }
function section(title)          { console.log(`\n${C.bold}${C.cyan}━━━ ${title} ━━━${C.reset}`); }

// ── HTTP helper ───────────────────────────────────────────────
function request(method, path, body = null, headers = {}) {
    return new Promise((resolve) => {
        const url   = new URL(BASE_URL + path);
        const lib   = url.protocol === 'https:' ? https : http;
        const opts  = {
            hostname: url.hostname,
            port:     url.port || (url.protocol === 'https:' ? 443 : 80),
            path:     url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...headers,
            },
            timeout: 10000,
        };

        const req = lib.request(opts, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                let json = null;
                try { json = JSON.parse(data); } catch (_) {}
                resolve({ status: res.statusCode, body: json, raw: data });
            });
        });

        req.on('error',   e => resolve({ status: 0,   body: null, raw: e.message }));
        req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: null, raw: 'timeout' }); });

        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// ── Перевірки ─────────────────────────────────────────────────

async function checkServer() {
    section('1. Сервер та MongoDB');

    // Health endpoint
    const r = await request('GET', '/api/health');
    if (r.status === 200 && r.body?.status === 'ok') {
        ok('HTTP сервер', `port=${new URL(BASE_URL).port || 3000}`);
    } else {
        fail('HTTP сервер', `status=${r.status} body=${r.raw?.substring(0, 100)}`);
    }

    // MongoDB
    try {
        const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 4000 });
        await client.connect();
        const ping = await client.db('deapseak').command({ ping: 1 });
        await client.close();
        if (ping?.ok === 1) ok('MongoDB підключення', MONGO_URI.replace(/\/\/.*@/, '//***@'));
        else fail('MongoDB підключення', 'ping не 1');
    } catch (e) {
        fail('MongoDB підключення', e.message.substring(0, 80));
    }

    // Mongoose/db через /api/health
    if (r.body?.mongodb === 'connected' || r.body?.db === 'connected' || r.body?.database === 'connected') {
        ok('MongoDB (server)', 'connected via health check');
    } else if (r.body?.database === 'disconnected') {
        fail('MongoDB (server)', 'server reports disconnected');
    } else {
        // Try users endpoint to probe db
        const u = await request('GET', '/api/users?limit=1');
        if (u.status === 200 || u.status === 401 || u.status === 403) {
            ok('MongoDB (server)', 'db.collection доступна');
        } else if (u.status === 500) {
            fail('MongoDB (server)', 'db.collection помилка 500 — db=undefined?');
        }
    }
}

async function checkAuth() {
    section('2. Авторизація (JWT)');

    if (!ADMIN_PASS) {
        warn('Login', 'CHECK_PASS або ADMIN_PASS не вказано в .env — пропускаємо auth тести');
        return;
    }

    // Login
    const r = await request('POST', '/api/auth/login', { email: ADMIN_USER, password: ADMIN_PASS });
    if (r.status === 200 && r.body?.token) {
        token = r.body.token;
        ok('Login (admin)', `токен отримано, роль=${r.body.user?.role}`);
    } else {
        fail('Login (admin)', `status=${r.status} msg=${r.body?.message}`);
        warn('Auth тести', 'Без токена — решта auth тестів пропущено');
        return;
    }

    // Token verify via /api/auth/status
    const s = await request('GET', '/api/auth/status');
    if (s.status === 200 && s.body?.authenticated) {
        ok('JWT verify', `user=${s.body.user?.email}`);
    } else {
        fail('JWT verify', `status=${s.status}`);
    }

    // Refresh token
    if (r.body?.refreshToken) {
        const ref = await request('POST', '/api/auth/refresh', { refreshToken: r.body.refreshToken });
        if (ref.status === 200 && ref.body?.token) {
            ok('Refresh token', 'новий access token отримано');
        } else {
            fail('Refresh token', `status=${ref.status}`);
        }
    } else {
        warn('Refresh token', 'refreshToken не повернуто при логіні');
    }

    // Users list (admin)
    const u = await request('GET', '/api/auth/users?limit=5');
    if (u.status === 200 && u.body?.success) {
        ok('GET /api/auth/users', `знайдено=${u.body.data?.users?.length ?? u.body.data?.length ?? '?'}`);
    } else {
        fail('GET /api/auth/users', `status=${u.status} msg=${u.body?.message}`);
    }
}

async function checkLifts() {
    section('3. Ліфти (Elevadores)');
    if (!token) { warn('Ліфти', 'пропущено — нема токена'); return; }

    const r = await request('GET', '/api/lifts?limit=5');
    if (r.status === 200) {
        const count = r.body?.data?.length ?? r.body?.lifts?.length ?? r.body?.total ?? '?';
        ok('GET /api/lifts', `знайдено=${count}`);
    } else {
        fail('GET /api/lifts', `status=${r.status}`);
    }

    const stats = await request('GET', '/api/lifts/stats');
    if (stats.status === 200) {
        ok('GET /api/lifts/stats', `total=${stats.body?.total ?? stats.body?.data?.total ?? '?'}`);
    } else {
        fail('GET /api/lifts/stats', `status=${stats.status}`);
    }
}

async function checkOrcamentos() {
    section('4. Orçamentos (Кошториси)');
    if (!token) { warn('Orçamentos', 'пропущено — нема токена'); return; }

    const list = await request('GET', '/api/orcamentos?limit=5');
    if (list.status === 200) {
        ok('GET /api/orcamentos', `знайдено=${list.body?.data?.length ?? list.body?.length ?? '?'}`);
    } else {
        fail('GET /api/orcamentos', `status=${list.status}`);
    }

    const next = await request('GET', '/api/orcamentos/next-number');
    if (next.status === 200) {
        ok('GET /api/orcamentos/next-number', `next=${next.body?.number ?? next.body?.nextNumber ?? '?'}`);
    } else {
        fail('GET /api/orcamentos/next-number', `status=${next.status}`);
    }

    const dash = await request('GET', '/api/orcamentos/stats/dashboard');
    if (dash.status === 200) {
        ok('GET /api/orcamentos/stats/dashboard', 'stats OK');
    } else {
        fail('GET /api/orcamentos/stats/dashboard', `status=${dash.status}`);
    }

    // Test email send with invalid ID to just check auth works (not actual send)
    const emailTest = await request('POST', '/api/orcamentos/000000000000000000000000/enviar', { email: 'test@test.com' });
    if (emailTest.status === 404) {
        ok('POST /api/orcamentos/:id/enviar (auth)', '403 виправлено — auth проходить, повертає 404 (not found)');
    } else if (emailTest.status === 403) {
        fail('POST /api/orcamentos/:id/enviar (auth)', '❌ 403 — токен не проходить (баг validToken?)');
    } else if (emailTest.status === 401) {
        fail('POST /api/orcamentos/:id/enviar (auth)', '401 — токен відсутній');
    } else {
        warn('POST /api/orcamentos/:id/enviar (auth)', `status=${emailTest.status}`);
    }
}

async function checkEmail() {
    section('5. Email (Brevo / SMTP)');

    // SMTP config
    if (!SMTP_HOST) {
        warn('SMTP', 'SMTP_HOST не вказано в .env');
    } else {
        ok('SMTP config', `host=${SMTP_HOST}:${process.env.SMTP_PORT || 587}`);
    }

    // Backend email endpoint
    if (token) {
        const r = await request('POST', '/api/send-email', {
            to: 'test@example.com', subject: 'test', html: '<p>test</p>'
        });
        if (r.status === 200) {
            ok('POST /api/send-email', 'email надіслано');
        } else if (r.status === 400) {
            warn('POST /api/send-email', 'validation error (очікувано без реального email)');
        } else if (r.status === 500) {
            fail('POST /api/send-email', `server error: ${r.body?.message ?? r.raw?.substring(0, 80)}`);
        } else {
            warn('POST /api/send-email', `status=${r.status}`);
        }
    }
}

async function checkAI() {
    section('6. AI Асистент (Gemini)');

    if (!GEMINI_KEY) {
        fail('Gemini API Key', 'GEMINI_API_KEY не встановлено в .env');
    } else {
        ok('Gemini API Key', `key=${GEMINI_KEY.substring(0, 8)}...`);
    }

    // AI health check
    if (token) {
        const h = await request('GET', '/api/ai/health');
        if (h.status === 200 && h.body?.success) {
            if (h.body.configured) {
                ok('AI health', `model=${h.body.model}, provider=${h.body.status}`);
            } else {
                fail('AI health', 'configured=false — API ключ відсутній');
            }
        } else {
            fail('AI health', `status=${h.status}`);
        }
    }

    // Guest AI chat (без токена)
    const guest = await request('POST', '/api/ai/guest-chat', { message: 'Olá, teste de diagnóstico' });
    if (guest.status === 200 && guest.body?.success) {
        ok('AI guest chat', `відповідь отримано (${guest.body.data?.response?.substring(0, 50)}...)`);
    } else if (guest.status === 429) {
        warn('AI guest chat', 'IP ліміт або quota перевищено (429)');
    } else if (guest.status === 500) {
        fail('AI guest chat', `server error: ${guest.body?.message ?? '500'}`);
    } else {
        warn('AI guest chat', `status=${guest.status}`);
    }

    // Authenticated AI chat
    if (token) {
        const chat = await request('POST', '/api/ai/chat', { message: 'Teste de diagnóstico do sistema' });
        if (chat.status === 200 && chat.body?.success) {
            ok('AI chat (autenticado)', 'resposta OK');
        } else if (chat.status === 429) {
            warn('AI chat (autenticado)', 'rate limit ou quota Gemini esgotada');
        } else if (chat.status === 500) {
            fail('AI chat (autenticado)', `${chat.body?.message ?? '500'}`);
        } else {
            warn('AI chat (autenticado)', `status=${chat.status}`);
        }
    }

    // Check which Gemini models are reachable
    if (GEMINI_KEY) {
        const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest'];
        for (const model of models) {
            const mRes = await new Promise((resolve) => {
                const body = JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] });
                const req = https.request({
                    hostname: 'generativelanguage.googleapis.com',
                    path: `/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
                    timeout: 12000,
                }, (res) => {
                    let d = '';
                    res.on('data', c => d += c);
                    res.on('end', () => resolve({ status: res.statusCode, raw: d.substring(0, 200) }));
                });
                req.on('error', e => resolve({ status: 0, raw: e.message }));
                req.on('timeout', () => { req.destroy(); resolve({ status: 0, raw: 'timeout' }); });
                req.write(body);
                req.end();
            });

            if (mRes.status === 200) {
                ok(`Gemini model: ${model}`, 'доступна');
            } else if (mRes.status === 429) {
                warn(`Gemini model: ${model}`, 'quota перевищено (429) — free tier?');
            } else if (mRes.status === 404) {
                fail(`Gemini model: ${model}`, 'модель не знайдена (404) — застаріла');
            } else if (mRes.status === 503) {
                warn(`Gemini model: ${model}`, 'перевантажена (503)');
            } else {
                warn(`Gemini model: ${model}`, `status=${mRes.status}`);
            }
        }
    }
}

async function checkInspections() {
    section('7. Інспекції');
    if (!token) { warn('Інспекції', 'пропущено — нема токена'); return; }

    const r = await request('GET', '/api/inspections?limit=5');
    if (r.status === 200) {
        ok('GET /api/inspections', `знайдено=${r.body?.data?.length ?? r.body?.inspections?.length ?? '?'}`);
    } else {
        fail('GET /api/inspections', `status=${r.status}`);
    }

    const next = await request('GET', '/api/inspections/next-number');
    if (next.status === 200) {
        ok('GET /api/inspections/next-number', `next=${next.body?.nextNumber ?? '?'}`);
    } else {
        fail('GET /api/inspections/next-number', `status=${next.status}`);
    }
}

async function checkRequests() {
    section('8. Заявки (Requests)');
    if (!token) { warn('Заявки', 'пропускаємо — нема токена'); return; }

    const r = await request('GET', '/api/requests?limit=5');
    if (r.status === 200) {
        ok('GET /api/requests', `знайдено=${r.body?.data?.length ?? r.body?.requests?.length ?? '?'}`);
    } else {
        fail('GET /api/requests', `status=${r.status}`);
    }
}

async function checkQR() {
    section('9. QR Система');
    if (!token) { warn('QR', 'пропускаємо — нема токена'); return; }

    const r = await request('GET', '/api/qr/codes?limit=5');
    if (r.status === 200) {
        ok('GET /api/qr/codes', `знайдено=${r.body?.data?.length ?? r.body?.codes?.length ?? '?'}`);
    } else {
        fail('GET /api/qr/codes', `status=${r.status}`);
    }

    const stats = await request('GET', '/api/qr/stats');
    if (stats.status === 200) {
        ok('GET /api/qr/stats', 'OK');
    } else {
        fail('GET /api/qr/stats', `status=${stats.status}`);
    }
}

async function checkNotifications() {
    section('10. Сповіщення');
    if (!token) { warn('Сповіщення', 'пропускаємо'); return; }

    const r = await request('GET', '/api/notifications?limit=5');
    if (r.status === 200) {
        ok('GET /api/notifications', `знайдено=${r.body?.data?.length ?? r.body?.notifications?.length ?? '?'}`);
    } else {
        fail('GET /api/notifications', `status=${r.status}`);
    }
}

async function checkDashboard() {
    section('11. Дашборд та Статистика');
    if (!token) { warn('Дашборд', 'пропускаємо'); return; }

    const dash = await request('GET', '/api/dashboard');
    if (dash.status === 200) {
        ok('GET /api/dashboard', 'OK');
    } else {
        fail('GET /api/dashboard', `status=${dash.status}`);
    }

    const pub = await request('GET', '/api/dashboard/public');
    if (pub.status === 200) {
        ok('GET /api/dashboard/public', 'OK');
    } else {
        fail('GET /api/dashboard/public', `status=${pub.status}`);
    }

    const stats = await request('GET', '/api/statistics');
    if (stats.status === 200) {
        ok('GET /api/statistics', 'OK');
    } else {
        fail('GET /api/statistics', `status=${stats.status}`);
    }
}

async function checkSettings() {
    section('12. Налаштування');
    if (!token) { warn('Налаштування', 'пропускаємо'); return; }

    const r = await request('GET', '/api/settings');
    if (r.status === 200) {
        ok('GET /api/settings', 'OK');
    } else if (r.status === 404) {
        warn('GET /api/settings', 'endpoint не знайдено (404)');
    } else {
        fail('GET /api/settings', `status=${r.status}`);
    }
}

async function checkEnvVars() {
    section('13. Змінні середовища (.env)');

    const required = ['JWT_SECRET', 'MONGODB_URI'];
    const recommended = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'GEMINI_API_KEY'];

    for (const v of required) {
        if (process.env[v]) ok(`.env: ${v}`, 'встановлено');
        else fail(`.env: ${v}`, '❌ ВІДСУТНЬО — критично!');
    }

    for (const v of recommended) {
        if (process.env[v]) ok(`.env: ${v}`, 'встановлено');
        else warn(`.env: ${v}`, 'не встановлено — функціонал обмежений');
    }
}

// ── Підсумок ──────────────────────────────────────────────────
function printSummary() {
    const total = passCount + failCount + warnCount;
    console.log(`\n${'═'.repeat(55)}`);
    console.log(`${C.bold}ПІДСУМОК ДІАГНОСТИКИ${C.reset}`);
    console.log(`${'═'.repeat(55)}`);
    console.log(`  ${C.green}✅ OK  : ${passCount}${C.reset}`);
    console.log(`  ${C.red}❌ FAIL: ${failCount}${C.reset}`);
    console.log(`  ${C.yellow}⚠️  WARN: ${warnCount}${C.reset}`);
    console.log(`  Всього: ${total}`);

    if (failCount > 0) {
        console.log(`\n${C.bold}${C.red}ПРОБЛЕМИ (FAIL):${C.reset}`);
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`  ${C.red}✖${C.reset} ${r.name}${r.detail ? ' — '+r.detail : ''}`);
        });
    }

    if (warnCount > 0) {
        console.log(`\n${C.bold}${C.yellow}ПОПЕРЕДЖЕННЯ (WARN):${C.reset}`);
        results.filter(r => r.status === 'WARN').forEach(r => {
            console.log(`  ${C.yellow}▲${C.reset} ${r.name}${r.detail ? ' — '+r.detail : ''}`);
        });
    }

    console.log(`\n${C.gray}Щоб вказати пароль: CHECK_PASS=yourpass node check-all-functions.js${C.reset}`);
    console.log(`${C.gray}Щоб вказати URL:    CHECK_URL=https://crm.festlift.pt node check-all-functions.js${C.reset}\n`);

    process.exit(failCount > 0 ? 1 : 0);
}

// ── Головна функція ───────────────────────────────────────────
async function main() {
    console.log(`\n${C.bold}${C.white}╔══════════════════════════════════════════════════════╗`);
    console.log(`║   FESTLIFT CRM — Діагностика всіх функцій            ║`);
    console.log(`╚══════════════════════════════════════════════════════╝${C.reset}`);
    console.log(`  ${C.gray}URL: ${BASE_URL}   Дата: ${new Date().toLocaleString('uk-UA')}${C.reset}`);

    await checkEnvVars();
    await checkServer();
    await checkAuth();
    await checkLifts();
    await checkOrcamentos();
    await checkEmail();
    await checkAI();
    await checkInspections();
    await checkRequests();
    await checkQR();
    await checkNotifications();
    await checkDashboard();
    await checkSettings();

    printSummary();
}

main().catch(e => {
    console.error(`\n${C.red}Критична помилка скрипта: ${e.message}${C.reset}`);
    process.exit(2);
});
