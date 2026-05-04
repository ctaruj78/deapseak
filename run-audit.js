#!/usr/bin/env node
/**
 * КОМПЛЕКСНИЙ АУДИТ СИСТЕМИ DEAPSEAK
 * Перевіряє backend, API, role-based access, структуру відповідей
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'deapseak_secret_key_2024';
const BASE = 'http://127.0.0.1:5000';

let passed = 0, failed = 0, warns = 0;
const issues = [];

// ─── кольори ───────────────────────────────────────────────
const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', B = '\x1b[1m', X = '\x1b[0m';
const ok  = (m) => { passed++; console.log(`${G}✅${X} ${m}`); };
const err = (m) => { failed++; issues.push(m); console.log(`${R}❌${X} ${m}`); };
const warn= (m) => { warns++;  console.log(`${Y}⚠️ ${X} ${m}`); };
const hdr = (m) => console.log(`\n${B}${C}── ${m} ──${X}`);

// ─── токени ────────────────────────────────────────────────
const makeToken = (role, userId) =>
    jwt.sign({ userId, username: role, role, email: `${role}@festlift.pt`, id: userId }, JWT_SECRET, { expiresIn: '1h' });

// Використовуємо валідні 24-hex ObjectId (яких немає в БД, але не викличуть CastError)
const T = {
    admin:      makeToken('admin',      '100000000000000000000001'),
    dispatcher: makeToken('dispatcher', '200000000000000000000002'),
    tech:       makeToken('tech',       '300000000000000000000003'),
    client:     makeToken('client',     '400000000000000000000004'),
};

// ─── HTTP хелпер ──────────────────────────────────────────
async function req(method, path, role, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (role) headers['Authorization'] = `Bearer ${T[role]}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const t0 = Date.now();
    try {
        const r = await fetch(`${BASE}${path}`, opts);
        let data;
        const ct = r.headers.get('content-type') || '';
        if (ct.includes('json')) data = await r.json().catch(() => null);
        else data = await r.text().catch(() => null);
        return { status: r.status, data, ms: Date.now() - t0 };
    } catch(e) {
        return { status: 0, error: e.message, ms: Date.now() - t0 };
    }
}

// ─── ТЕСТИ ────────────────────────────────────────────────

async function checkServer() {
    hdr('1. СЕРВЕР / HEALTH');
    const r = await req('GET', '/api/health');
    if (r.status === 200 && r.data?.status === 'ok') {
        ok(`Health OK — mode:${r.data.mode}, mongodb:${r.data.mongodb}, v${r.data.version}`);
        if (r.data.mongodb !== 'connected') err('MongoDB НЕ підключена!');
    } else {
        err(`Health FAILED — ${r.status} ${r.error||''}`);
    }
}

async function checkAuth() {
    hdr('2. АВТОРИЗАЦІЯ');

    // Логін кожної ролі — через реальний endpoint
    const loginTests = [
        { login: 'admin',      password: 'admin123',      role: 'admin' },
        { login: 'dispatcher', password: 'dispatcher123', role: 'dispatcher' },
        { login: 'tech1',      password: 'tech123',        role: 'tech' },
        { login: 'client',     password: 'client123',      role: 'client' },
    ];
    for (const u of loginTests) {
        const r = await req('POST', '/api/auth/login', null, { login: u.login, password: u.password });
        const token = r.data?.token || r.data?.data?.token;
        if (r.status === 200 && token) {
            ok(`Логін ${u.role} (${u.login}) — OK, токен отримано`);
        } else if (r.status === 401) {
            warn(`Логін ${u.role} (${u.login}) — 401 (демо-юзера немає в БД, але endpoint працює)`);
        } else if (r.status === 200 && !token) {
            warn(`Логін ${u.role} (${u.login}) — 200 але токен відсутній у відповіді`);
        } else {
            err(`Логін ${u.role} (${u.login}) — ${r.status} ${JSON.stringify(r.data||r.error).slice(0,80)}`);
        }
    }

    // /api/auth/me — із тестовими токенами повертає 404 (юзер не в БД) — це нормально
    // Перевіряємо лише що endpoint захищений та повертає коректний HTTP код
    for (const role of Object.keys(T)) {
        const r = await req('GET', '/api/auth/me', role);
        if (r.status === 200) {
            ok(`/api/auth/me [${role}] — 200 (реальний юзер)`);
        } else if (r.status === 404) {
            ok(`/api/auth/me [${role}] — 404 (тестовий userId не в БД, endpoint захищений)`);
        } else if (r.status === 500) {
            err(`/api/auth/me [${role}] — 500 SERVER ERROR: ${JSON.stringify(r.data||'').slice(0,100)}`);
        } else {
            warn(`/api/auth/me [${role}] — ${r.status}`);
        }
    }

    // Без токену — має повертати 401
    const noAuth = await req('GET', '/api/auth/me');
    if (noAuth.status === 401) ok('/api/auth/me без токену → 401 (правильно)');
    else err(`/api/auth/me без токену → ${noAuth.status} (очікувався 401)`);
}

async function checkLifts() {
    hdr('3. ЛІФТИ (/api/lifts)');
    const checks = [
        { path: '/api/lifts',        roles: ['admin','dispatcher','tech','client'], expect: 200 },
        { path: '/api/lifts/stats',  roles: ['admin','dispatcher'],                  expect: 200 },
    ];
    for (const c of checks) {
        for (const role of c.roles) {
            const r = await req('GET', c.path, role);
            if (r.status === c.expect) {
                const arr = Array.isArray(r.data) ? r.data : (r.data?.data ?? r.data?.lifts ?? []);
                const count = Array.isArray(arr) ? arr.length : '?';
                ok(`${c.path} [${role}] — ${r.status}, count:${count}`);
            } else {
                err(`${c.path} [${role}] — ${r.status} (очікувався ${c.expect})`);
            }
        }
    }

    // RBAC: client не повинен бачити /api/lifts/stats якщо реалізовано обмеження
    const clientStats = await req('GET', '/api/lifts/stats', 'client');
    if (clientStats.status === 403) ok('/api/lifts/stats [client] → 403 (RBAC OK)');
    else if (clientStats.status === 200) warn('/api/lifts/stats [client] → 200 (статистика відкрита для клієнта — перевір чи це нормально)');
    else warn(`/api/lifts/stats [client] → ${clientStats.status}`);

    // Структура одного ліфта
    const liftsR = await req('GET', '/api/lifts', 'admin');
    if (Array.isArray(liftsR.data) && liftsR.data.length > 0) {
        const lift = liftsR.data[0];
        const required = ['_id','name','status'];
        for (const f of required) {
            if (lift[f] !== undefined) ok(`  Поле lift.${f} присутнє`);
            else warn(`  Поле lift.${f} відсутнє в об'єкті ліфта`);
        }
    } else if (Array.isArray(liftsR.data)) {
        warn('/api/lifts — масив порожній (немає ліфтів у БД?)');
    }
}

async function checkRequests() {
    hdr('4. ЗАЯВКИ (/api/requests)');
    const roles = ['admin','dispatcher','tech','client'];
    for (const role of roles) {
        const r = await req('GET', '/api/requests', role);
        if (r.status === 200) {
            const arr = Array.isArray(r.data) ? r.data : (r.data?.data ?? r.data?.requests ?? []);
            const count = Array.isArray(arr) ? arr.length : '?';
            ok(`/api/requests [${role}] — 200, count:${count}`);
            // Перевірка структури
            if (Array.isArray(arr) && arr.length > 0) {
                const req0 = arr[0];
                if (req0.requestNumber) ok(`  requestNumber присутній: ${req0.requestNumber}`);
                else warn(`  requestNumber відсутній — ID відображатиметься як ObjectId`);
            }
        } else if (r.status === 403) {
            warn(`/api/requests [${role}] → 403 (роль без доступу?)`);
        } else {
            err(`/api/requests [${role}] — ${r.status}`);
        }
    }
}

async function checkUsers() {
    hdr('5. КОРИСТУВАЧІ (/api/users)');
    // Admin — повний доступ
    const admin = await req('GET', '/api/users', 'admin');
    if (admin.status === 200) {
        const arr = Array.isArray(admin.data) ? admin.data : admin.data?.users;
        ok(`/api/users [admin] — 200, count:${Array.isArray(arr)?arr.length:'?'}`);
    } else {
        err(`/api/users [admin] — ${admin.status}`);
    }

    // Dispatcher — може отримувати техніків і клієнтів
    const disp = await req('GET', '/api/users?role=tech', 'dispatcher');
    if (disp.status === 200) ok(`/api/users?role=tech [dispatcher] — 200`);
    else if (disp.status === 403) warn(`/api/users?role=tech [dispatcher] → 403`);
    else err(`/api/users?role=tech [dispatcher] — ${disp.status}`);

    // Client не повинен бачити список юзерів
    const client = await req('GET', '/api/users', 'client');
    if (client.status === 403) ok('/api/users [client] → 403 (RBAC OK)');
    else if (client.status === 200) warn('/api/users [client] → 200 (список всіх юзерів відкритий для клієнта!)');
    else warn(`/api/users [client] → ${client.status}`);
}

async function checkOrcamentos() {
    hdr('6. ОРÇАМЕНТИ (/api/orcamentos)');
    for (const role of ['admin','dispatcher']) {
        const r = await req('GET', '/api/orcamentos', role);
        if (r.status === 200) {
            const arr = Array.isArray(r.data) ? r.data : r.data?.orcamentos;
            ok(`/api/orcamentos [${role}] — 200, count:${Array.isArray(arr)?arr.length:'?'}`);
        } else {
            err(`/api/orcamentos [${role}] — ${r.status}`);
        }
    }
    // next-number
    const nn = await req('GET', '/api/orcamentos/next-number', 'admin');
    if (nn.status === 200) ok(`/api/orcamentos/next-number — 200: ${JSON.stringify(nn.data).slice(0,60)}`);
    else err(`/api/orcamentos/next-number — ${nn.status}`);

    // Client не має доступу
    const cl = await req('GET', '/api/orcamentos', 'client');
    if (cl.status === 403) ok('/api/orcamentos [client] → 403 (RBAC OK)');
    else warn(`/api/orcamentos [client] → ${cl.status}`);
}

async function checkInspections() {
    hdr('7. ІНСПЕКЦІЇ (/api/inspections)');
    for (const role of ['admin','dispatcher','tech']) {
        const r = await req('GET', '/api/inspections', role);
        if (r.status === 200) {
            const arr = Array.isArray(r.data) ? r.data : r.data?.inspections;
            ok(`/api/inspections [${role}] — 200, count:${Array.isArray(arr)?arr.length:'?'}`);
        } else {
            err(`/api/inspections [${role}] — ${r.status}`);
        }
    }
}

async function checkNotifications() {
    hdr('8. СПОВІЩЕННЯ (/api/notifications)');
    for (const role of ['admin','dispatcher','tech','client']) {
        const r = await req('GET', '/api/notifications', role);
        if (r.status === 200) ok(`/api/notifications [${role}] — 200`);
        else if (r.status === 404) warn(`/api/notifications [${role}] — 404 (endpoint не існує?)`);
        else err(`/api/notifications [${role}] — ${r.status}`);
    }
}

async function checkAI() {
    hdr('9. AI АСИСТЕНТ (/api/ai)');
    const h = await req('GET', '/api/ai/health', 'admin');
    if (h.status === 200) ok(`/api/ai/health — 200: ${JSON.stringify(h.data).slice(0,80)}`);
    else err(`/api/ai/health — ${h.status}`);
}

async function checkDashboard() {
    hdr('10. DASHBOARD / СТАТИСТИКА');
    // Реальний endpoint у unified-server.js: /api/dashboard (не /api/dashboard/stats)
    for (const role of ['admin','dispatcher']) {
        const r = await req('GET', '/api/dashboard', role);
        if (r.status === 200) ok(`/api/dashboard [${role}] — 200`);
        else if (r.status === 404) warn(`/api/dashboard [${role}] — 404`);
        else err(`/api/dashboard [${role}] — ${r.status}`);
    }
    // Statistics endpoint
    const stats = await req('GET', '/api/statistics', 'admin');
    if (stats.status === 200) ok(`/api/statistics [admin] — 200`);
    else if (stats.status === 404) warn(`/api/statistics [admin] — 404`);
    else err(`/api/statistics [admin] — ${stats.status}`);

    // Analytics dashboard
    const analytics = await req('GET', '/api/analytics/dashboard', 'admin');
    if (analytics.status === 200) ok(`/api/analytics/dashboard [admin] — 200`);
    else if (analytics.status === 404) warn(`/api/analytics/dashboard [admin] — 404`);
    else err(`/api/analytics/dashboard [admin] — ${analytics.status}`);

    // Lift stats — підтверджуємо
    for (const role of ['admin','dispatcher']) {
        const r = await req('GET', '/api/lifts/stats', role);
        if (r.status === 200) ok(`/api/lifts/stats [${role}] — 200`);
        else err(`/api/lifts/stats [${role}] — ${r.status}`);
    }
}

async function checkStaticPages() {
    hdr('11. СТАТИЧНІ СТОРІНКИ');
    const pages = [
        '/',
        '/pages/auth/login.html',
        '/pages/admin/dashboard.html',
        '/pages/dispatcher/dashboard.html',
        '/pages/dispatcher/lifts.html',
        '/pages/dispatcher/technicians.html',
        '/pages/dispatcher/clients.html',
        '/pages/admin/users.html',
        '/pages/admin/lifts.html',
        '/pages/tech/dashboard.html',
        '/pages/client/dashboard.html',
    ];
    for (const p of pages) {
        const r = await req('GET', p);
        if (r.status === 200) ok(`${p} — 200`);
        else err(`${p} — ${r.status}`);
    }
}

async function checkRBAC() {
    hdr('12. RBAC — ПЕРЕХРЕСНИЙ ДОСТУП');

    // tech не може керувати юзерами
    const techUsers = await req('POST', '/api/users', 'tech', { username: 'hack', role: 'admin' });
    if ([403, 401].includes(techUsers.status)) ok(`POST /api/users [tech] → ${techUsers.status} (заблоковано)`);
    else warn(`POST /api/users [tech] → ${techUsers.status} (очікувався 403)`);

    // client не може редагувати ліфти
    const clientLift = await req('PUT', '/api/lifts/000000000000000000000001', 'client', { name: 'Hacked' });
    if ([403, 401, 404].includes(clientLift.status)) ok(`PUT /api/lifts [client] → ${clientLift.status} (заблоковано)`);
    else warn(`PUT /api/lifts [client] → ${clientLift.status} (очікувався 403/404)`);

    // Без токену — critical endpoints мають повертати 401
    const noAuthLifts = await req('GET', '/api/lifts');
    if (noAuthLifts.status === 401) ok('/api/lifts без токену → 401');
    else if (noAuthLifts.status === 200) err('/api/lifts без токену → 200 (КРИТИЧНО — захист відсутній!)', 'SECURITY');
    else warn(`/api/lifts без токену → ${noAuthLifts.status}`);
}

async function checkTechnicianAndClientEndpoints() {
    hdr('13. ТЕХНІКИ / КЛІЄНТИ / TASKS');
    // /api/technicians
    for (const role of ['admin','dispatcher']) {
        const r = await req('GET', '/api/technicians', role);
        if (r.status === 200) {
            const arr = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
            ok(`/api/technicians [${role}] — 200, count:${Array.isArray(arr)?arr.length:'?'}`);
        } else if (r.status === 404) warn(`/api/technicians [${role}] — 404`);
        else err(`/api/technicians [${role}] — ${r.status}`);
    }
    // GET /api/clients не існує, клієнти отримуються через /api/users?role=client
    for (const role of ['admin','dispatcher']) {
        const r = await req('GET', '/api/users?role=client', role);
        if (r.status === 200) {
            const arr = Array.isArray(r.data) ? r.data : (r.data?.data ?? r.data?.users ?? []);
            ok(`/api/users?role=client [${role}] — 200, count:${Array.isArray(arr)?arr.length:'?'}`);
        } else {
            err(`/api/users?role=client [${role}] — ${r.status}`);
        }
    }
    // /api/users/technicians — диспетчер отримує список техніків
    const techList = await req('GET', '/api/users/technicians', 'dispatcher');
    if (techList.status === 200) {
        const arr = Array.isArray(techList.data) ? techList.data : (techList.data?.data ?? []);
        ok(`/api/users/technicians [dispatcher] — 200, count:${Array.isArray(arr)?arr.length:'?'}`);
    } else warn(`/api/users/technicians [dispatcher] — ${techList.status}`);

    // /api/tasks
    for (const role of ['admin','dispatcher','tech']) {
        const r = await req('GET', '/api/tasks', role);
        if (r.status === 200) {
            const arr = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
            ok(`/api/tasks [${role}] — 200, count:${Array.isArray(arr)?arr.length:'?'}`);
        } else if (r.status === 404) warn(`/api/tasks [${role}] — 404`);
        else err(`/api/tasks [${role}] — ${r.status}`);
    }
}


async function main() {
    console.log(`${B}╔══════════════════════════════════════════════════════╗`);
    console.log(`║     DEAPSEAK — КОМПЛЕКСНИЙ АУДИТ СИСТЕМИ              ║`);
    console.log(`╚══════════════════════════════════════════════════════╝${X}`);
    console.log(`Target: ${BASE}  |  Date: ${new Date().toLocaleString('pt-PT')}\n`);

    await checkServer();
    await checkAuth();
    await checkLifts();
    await checkRequests();
    await checkUsers();
    await checkOrcamentos();
    await checkInspections();
    await checkNotifications();
    await checkAI();
    await checkDashboard();
    await checkStaticPages();
    await checkTechnicianAndClientEndpoints();
    await checkRBAC();

    // ─── ПІДСУМОК ─────────────────────────────────────────
    console.log(`\n${B}╔══════════════════════════════════════════════════════╗`);
    console.log(`║                   ПІДСУМОК                            ║`);
    console.log(`╚══════════════════════════════════════════════════════╝${X}`);
    console.log(`${G}✅ Пройдено: ${passed}${X}   ${Y}⚠️  Попереджень: ${warns}${X}   ${R}❌ Помилок: ${failed}${X}`);
    const total = passed + failed + warns;
    const pct = total ? Math.round(passed/total*100) : 0;
    console.log(`\nЗагальний результат: ${pct >= 90 ? G : pct >= 70 ? Y : R}${pct}%${X} (${passed}/${total})\n`);

    if (issues.length > 0) {
        console.log(`${R}${B}Критичні проблеми:${X}`);
        issues.forEach((i, n) => console.log(`  ${n+1}. ${R}${i}${X}`));
    } else {
        console.log(`${G}${B}Критичних проблем не виявлено${X}`);
    }
    console.log('');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
