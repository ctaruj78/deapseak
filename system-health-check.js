#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           DeapSeaK — ПОВНА ПЕРЕВІРКА СИСТЕМИ                    ║
 * ║  Перевіряє: автентифікацію, ролі, API, дані, зв'язки, доступ   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Запуск: node system-health-check.js [--base-url http://localhost:3001]
 *
 * Що перевіряє:
 *  1. Сервер (health endpoint)
 *  2. Автентифікація всіх 4 ролей (admin / dispatcher / technician / client)
 *  3. Контроль доступу (403 для заборонених дій)
 *  4. CRUD ліфтів: create / read / update / delete
 *  5. Фільтрація по ролі (клієнт бачить лише свої ліфти, технік — призначені)
 *  6. Цілісність полів: driveType/doorType enum, address.street/city, contractNumber
 *  7. Звіти інспекцій: збереження, поля date/inspector/notes/status/reportType
 *  8. Контракт на обслуговування: завантаження, перегляд
 *  9. Заявки (requests): створення, статус, призначення техніку
 * 10. Сповіщення: отримання, позначити прочитаними
 * 11. Статистика: /api/lifts/stats, /api/requests/stats
 * 12. Профіль: перегляд і оновлення для кожної ролі
 * 13. Управління користувачами (тільки admin)
 * 14. PDF Parser: доступний тільки admin/dispatcher
 * 15. Перевірка populate: client.firstName/lastName, technician.firstName
 */

'use strict';

const https = require('https');
const http  = require('http');
const path  = require('path');
const fs    = require('fs');

// ── Config ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const argBase = args.find(a => a.startsWith('--base-url='));
const BASE_URL = argBase ? argBase.split('=')[1] : 'http://127.0.0.1:5000';

const CREDENTIALS = {
    admin:      { email: 'info@festlift.pt',       password: 'admin123',       role: 'admin' },
    dispatcher: { email: 'dispatcher@festlift.pt', password: 'dispatcher123',  role: 'dispatcher' },
    tech:       { email: 'tech1@festlift.pt',       password: 'tech123',        role: 'technician' },
    client:     { email: 'client@festlift.pt',      password: 'client123',      role: 'client' }
};

// ── Color helpers ─────────────────────────────────────────────────────────
const C = {
    reset:  '\x1b[0m',
    bold:   '\x1b[1m',
    green:  '\x1b[32m',
    red:    '\x1b[31m',
    yellow: '\x1b[33m',
    cyan:   '\x1b[36m',
    gray:   '\x1b[90m',
    blue:   '\x1b[34m',
    magenta:'\x1b[35m'
};
const clr = (c, s) => `${C[c]}${s}${C.reset}`;
const OK   = clr('green',  '✅ PASS');
const FAIL = clr('red',    '❌ FAIL');
const WARN = clr('yellow', '⚠️  WARN');
const INFO = clr('cyan',   'ℹ️  INFO');

// ── State ─────────────────────────────────────────────────────────────────
const tokens  = {};    // role → JWT token
const summary = { pass: 0, fail: 0, warn: 0, skip: 0 };
const failures = [];
let testLiftId    = null;
let testRequestId = null;

// ── HTTP helper ───────────────────────────────────────────────────────────
function request(method, urlPath, body = null, token = null, isFormData = false) {
    return new Promise((resolve, reject) => {
        const fullUrl = BASE_URL + urlPath;
        const url = new URL(fullUrl);
        const mod = url.protocol === 'https:' ? https : http;
        let bodyStr = null;
        const headers = {};

        if (token) headers['Authorization'] = `Bearer ${token}`;

        if (body && !isFormData) {
            bodyStr = JSON.stringify(body);
            headers['Content-Type']   = 'application/json';
            headers['Content-Length'] = Buffer.byteLength(bodyStr);
        }

        const options = {
            hostname: url.hostname,
            port:     url.port || (url.protocol === 'https:' ? 443 : 80),
            path:     url.pathname + url.search,
            method,
            headers,
            timeout: 15000
        };

        const req = mod.request(options, res => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString();
                let data;
                try { data = JSON.parse(raw); } catch { data = { _raw: raw }; }
                resolve({ status: res.statusCode, data, headers: res.headers });
            });
        });

        req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout ${method} ${urlPath}`)); });
        req.on('error', reject);

        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

// ── Test runner ───────────────────────────────────────────────────────────
let _sectionNum = 0;
function section(name) {
    _sectionNum++;
    console.log(`\n${clr('bold', clr('blue', `━━━━━ ${_sectionNum}. ${name} ━━━━━`))}`);
}

function check(label, pass, detail = '', level = 'fail') {
    if (pass === null) {
        console.log(`  ${WARN} ${label}${detail ? clr('gray', ' — ' + detail) : ''}`);
        summary.warn++;
    } else if (pass) {
        console.log(`  ${OK}  ${label}${detail ? clr('gray', ' — ' + detail) : ''}`);
        summary.pass++;
    } else {
        const icon = level === 'warn' ? WARN : FAIL;
        console.log(`  ${icon} ${label}${detail ? clr('red', ' ← ' + detail) : ''}`);
        if (level === 'warn') summary.warn++;
        else { summary.fail++; failures.push(`${label}${detail ? ': ' + detail : ''}`); }
    }
}

function skip(label, reason) {
    console.log(`  ${clr('gray', '⏭  SKIP')} ${label} ${clr('gray', '(' + reason + ')')}`);
    summary.skip++;
}

// ── 1. SERVER HEALTH ──────────────────────────────────────────────────────
async function checkHealth() {
    section('Сервер доступний');
    try {
        const r = await request('GET', '/api/health');
        check('GET /api/health → 200', r.status === 200, `status=${r.status}`);
        check('mongodb: connected', r.data.mongodb === 'connected' || r.data.status === 'ok',
            `mongodb=${r.data.mongodb}, status=${r.data.status}`);
        check('version є', !!r.data.version || !!r.data.mode, `version=${r.data.version}, mode=${r.data.mode}`);
    } catch (e) {
        check('Сервер відповідає', false, e.message);
        console.log(clr('red', '\n  ⛔ Сервер не відповідає — решта тестів буде пропущена'));
        process.exit(1);
    }
}

// ── 2. AUTH ───────────────────────────────────────────────────────────────
async function checkAuth() {
    section('Автентифікація (login) для кожної ролі');
    for (const [key, cred] of Object.entries(CREDENTIALS)) {
        try {
            const r = await request('POST', '/api/auth/login', {
                email: cred.email, password: cred.password
            });
            const ok = r.status === 200 && r.data.success;
            check(`Логін ${cred.role} (${cred.email})`, ok, ok ? '' : JSON.stringify(r.data).substring(0, 100));
            if (ok) {
                tokens[cred.role] = r.data.data?.token || r.data.token;
                // verify role in response
                const userRole = r.data.data?.user?.role || r.data.user?.role;
                check(`Роль у відповіді = ${cred.role}`, userRole === cred.role, `отримано: ${userRole}`);
            }
        } catch (e) {
            check(`Логін ${cred.role}`, false, e.message);
        }
    }
    // Wrong credentials
    try {
        const r = await request('POST', '/api/auth/login', { email: 'wrong@x.com', password: 'wrongpass' });
        check('Невірні дані → 401/400', r.status >= 400, `status=${r.status}`);
    } catch(e) {
        check('Невірні дані → помилка', false, e.message);
    }
    // No token
    try {
        const r = await request('GET', '/api/lifts');
        check('Без токена → 401', r.status === 401, `status=${r.status}`);
    } catch(e) {
        check('Без токена → відмова', false, e.message);
    }
}

// ── 3. PROFILE ────────────────────────────────────────────────────────────
async function checkProfiles() {
    section('Профіль користувача (GET /api/auth/profile)');
    const expectedFields = ['firstName', 'lastName', 'email', 'role'];
    for (const role of ['admin', 'dispatcher', 'technician', 'client']) {
        const tok = tokens[role];
        if (!tok) { skip(`Профіль ${role}`, 'немає токена'); continue; }
        try {
            const r = await request('GET', '/api/auth/profile', null, tok);
            const ok = r.status === 200 && r.data.success;
            check(`GET /profile для ${role} → 200`, ok, ok ? '' : `status=${r.status}`);
            if (ok) {
                const user = r.data.data?.user || r.data.user || r.data.data || {};
                const missingFields = expectedFields.filter(f => !user[f]);
                check(`Усі поля ${expectedFields.join(', ')} присутні (${role})`,
                    missingFields.length === 0,
                    missingFields.length ? `відсутні: ${missingFields.join(', ')}` : '');
                check(`Роль у профілі відповідає (${role})`, user.role === role, `отримано: ${user.role}`);
            }
        } catch(e) {
            check(`Профіль ${role}`, false, e.message);
        }
    }
}

// ── 4. USER MANAGEMENT (admin only) ──────────────────────────────────────
async function checkUserManagement() {
    section('Управління користувачами (тільки admin)');
    const adminTok  = tokens['admin'];
    const dispTok   = tokens['dispatcher'];
    const clientTok = tokens['client'];

    if (adminTok) {
        try {
            const r = await request('GET', '/api/auth/users', null, adminTok);
            check('Admin: GET /api/auth/users → 200', r.status === 200 && r.data.success,
                `status=${r.status}, users=${r.data.data?.users?.length ?? r.data.data?.length ?? '?'}`);
            const users = r.data.data?.users || r.data.data || [];
            if (Array.isArray(users) && users.length) {
                const roles = [...new Set(users.map(u => u.role))].sort();
                check('Є користувачі різних ролей', roles.length > 1, `ролі: ${roles.join(', ')}`);
                const hasPassword = users.some(u => u.password);
                check('Поле password не повертається (select:false)', !hasPassword,
                    hasPassword ? 'password витікає в відповіді!' : '');
            }
        } catch(e) {
            check('Admin: GET /api/auth/users', false, e.message);
        }
    }

    // Dispatcher cannot list users
    if (dispTok) {
        try {
            const r = await request('GET', '/api/auth/users', null, dispTok);
            check('Dispatcher не може переглядати /users → 403', r.status === 403, `status=${r.status}`);
        } catch(e) {
            check('Dispatcher → /users заборонено', false, e.message);
        }
    }

    // Client cannot list users
    if (clientTok) {
        try {
            const r = await request('GET', '/api/auth/users', null, clientTok);
            check('Client не може переглядати /users → 403', r.status === 403, `status=${r.status}`);
        } catch(e) {
            check('Client → /users заборонено', false, e.message);
        }
    }
}

// ── 5. LIFTS CRUD + ROLE FILTER ───────────────────────────────────────────
async function checkLiftsCRUD() {
    section('Ліфти: CRUD та фільтрація по ролі');
    const adminTok  = tokens['admin'];
    const dispTok   = tokens['dispatcher'];
    const techTok   = tokens['technician'];
    const clientTok = tokens['client'];

    // Admin: get all lifts
    if (adminTok) {
        try {
            const r = await request('GET', '/api/lifts?limit=5', null, adminTok);
            check('Admin: GET /api/lifts → 200', r.status === 200 && r.data.success, `status=${r.status}`);
            // Unified server returns data as array; backend returns data.lifts + pagination
            const lifts = Array.isArray(r.data.data) ? r.data.data
                : (r.data.data?.lifts || []);
            const hasPagination = !!r.data.data?.pagination;
            // Pagination is optional (unified server uses flat array)
            if (hasPagination) check('Admin: є pagination в відповіді', true, 'є', 'warn');
            if (lifts.length > 0) {
                const l = lifts[0];
                check('Ліфт має _id', !!l._id, '');
                check('Ліфт має municipalNumber', !!l.municipalNumber, `значення: ${l.municipalNumber}`);
                check('address.street існує', !!l.address?.street, `值: ${l.address?.street}`);
                check('address.city існує', !!l.address?.city, `值: ${l.address?.city}`, 'warn');
                check('driveType є enum', ['traction','traction_mrl','hydraulic','goods','platform',''].includes(l.driveType||''),
                    `driveType: ${l.driveType}`);
                check('doorType є enum', ['automatic','swing','gate',''].includes(l.doorType||''),
                    `doorType: ${l.doorType}`);
                check('status є enum', ['operational','maintenance','repair','out_of_service','inspection'].includes(l.status),
                    `status: ${l.status}`);
                check('capacity є числом', typeof l.capacity === 'number', `capacity: ${l.capacity}`);
                check('floors є числом', typeof l.floors === 'number', `floors: ${l.floors}`);
                // populate check
                if (l.client && typeof l.client === 'object') {
                    check('client populate: має firstName', !!l.client.firstName, `client: ${JSON.stringify(l.client).substring(0,60)}`);
                }
                testLiftId = l._id;
            } else {
                check('Є хоча б один ліфт у БД', false, 'Ліфтів немає — деякі тести будуть пропущені', 'warn');
            }
        } catch(e) {
            check('Admin: GET /api/lifts', false, e.message);
        }
    }

    // Stats
    if (adminTok) {
        try {
            const r = await request('GET', '/api/lifts/stats', null, adminTok);
            check('Admin: GET /api/lifts/stats → 200', r.status === 200 && r.data.success, `status=${r.status}`);
            check('Stats: total є числом', typeof r.data.data?.total === 'number', `total=${r.data.data?.total}`);
        } catch(e) {
            check('Admin: GET /api/lifts/stats', false, e.message);
        }
    }

    // Client sees only own lifts
    if (clientTok) {
        try {
            const r = await request('GET', '/api/lifts', null, clientTok);
            check('Client: GET /api/lifts → 200 (власні)', r.status === 200, `status=${r.status}`);
        } catch(e) {
            check('Client: GET /api/lifts', false, e.message);
        }
    }

    // Dispatcher stats restricted from client
    if (clientTok) {
        try {
            const r = await request('GET', '/api/lifts/stats', null, clientTok);
            check('Client не може /api/lifts/stats → 403', r.status === 403, `status=${r.status}`);
        } catch(e) {
            check('Client → /api/lifts/stats заборонено', false, e.message);
        }
    }

    // Client cannot create lift
    if (clientTok) {
        try {
            const r = await request('POST', '/api/lifts', {
                municipalNumber: 'TEST-CLIENT-ATTEMPT',
                address: { street: 'Test', city: 'Lisboa' },
                location: { type: 'Point', coordinates: [-9.14, 38.72] },
                manufacturer: 'Test', model: 'Test', capacity: 450, floors: 5
            }, clientTok);
            check('Client не може створити ліфт → 403', r.status === 403, `status=${r.status}`);
        } catch(e) {
            check('Client → POST /api/lifts заборонено', false, e.message);
        }
    }

    // Admin can create lift
    let createdLiftId = null;
    if (adminTok) {
        const testNum = `TEST-HEALTH-${Date.now()}`;
        try {
            const r = await request('POST', '/api/lifts', {
                municipalNumber: testNum,
                address: { street: 'Rua do Teste 1', city: 'Lisboa', zipCode: '1000-001', country: 'Portugal' },
                location: { type: 'Point', coordinates: [-9.1393, 38.7223] },
                manufacturer: 'Schindler',
                model: 'HEALTH-TEST',
                capacity: 450,
                floors: 5,
                driveType: 'traction',
                doorType: 'automatic',
                status: 'operational'
            }, adminTok);
            // Unified server returns 200 for both create and update; backend returns 201 for create
            const ok = (r.status === 201 || r.status === 200) && r.data.success;
            check('Admin: POST /api/lifts → 200/201', ok, ok ? `id=${r.data.data?._id || r.data.data?.lift?._id}` : JSON.stringify(r.data).substring(0,120));
            // Extract lift ID from either format
            if (ok) createdLiftId = r.data.data?._id || r.data.data?.lift?._id;
        } catch(e) {
            check('Admin: POST /api/lifts', false, e.message);
        }
    }

    // Update lift
    if (adminTok && createdLiftId) {
        try {
            const r = await request('PUT', `/api/lifts/${createdLiftId}`, {
                maintenanceNotes: 'Health check update',
                contractNumber: 'CONT-HEALTH-001',
                contractPrice: 89.90
            }, adminTok);
            check('Admin: PUT /api/lifts/:id → 200', r.status === 200 && r.data.success,
                `status=${r.status}`);
            // Unified server returns data: liftObject (not data: {lift: ...})
            const updated = r.data.data?.lift || r.data.data;
            check('maintenanceNotes збережено', updated?.maintenanceNotes === 'Health check update',
                `значення: ${updated?.maintenanceNotes}`);
        } catch(e) {
            check('Admin: PUT /api/lifts/:id', false, e.message);
        }
    }

    // Status change
    if (dispTok && createdLiftId) {
        try {
            const r = await request('PATCH', `/api/lifts/${createdLiftId}/status`, { status: 'maintenance' }, dispTok);
            check('Dispatcher: PATCH /api/lifts/:id/status → 200/404',
                [200, 404, 405].includes(r.status), // some servers don't have PATCH status as separate endpoint
                `status=${r.status}`, 'warn');
        } catch(e) {
            check('Dispatcher: PATCH status', false, e.message, 'warn');
        }
    }

    // Inspection report (dispatcher)
    let inspReportOk = false;
    if (dispTok && createdLiftId) {
        try {
            const r = await request('POST', `/api/lifts/${createdLiftId}/inspection-report`, {
                inspector: 'Health Check Inspector',
                inspectionDate: new Date().toISOString().substring(0,10),
                status: 'passed',
                reportType: 'annual',
                notes: 'System health check inspection'
            }, dispTok);
            const ok = r.status === 201 && r.data.success;
            inspReportOk = ok;
            check('Dispatcher: POST inspection-report → 201', ok, `status=${r.status}`);
            if (ok) {
                // server returns {success, message, report: reportData} — no lift object
                const rep = r.data.report;
                check('Звіт: поле date збережено', !!rep?.date, `date: ${rep?.date}`);
                check('Звіт: поле inspector збережено', !!rep?.inspector, `inspector: ${rep?.inspector}`);
                check('Звіт: поле notes збережено', !!rep?.notes, `notes: ${rep?.notes}`);
                check('Звіт: reportType є enum', ['routine','emergency','annual','certification'].includes(rep?.reportType),
                    `reportType: ${rep?.reportType}`);
                check('Звіт: status є enum', ['passed','failed','conditional'].includes(rep?.status),
                    `status: ${rep?.status}`);
            }
        } catch(e) {
            check('Dispatcher: POST inspection-report', false, e.message);
        }
    }

    // client cannot add inspection report
    if (clientTok && createdLiftId) {
        try {
            const r = await request('POST', `/api/lifts/${createdLiftId}/inspection-report`, {
                inspector: 'Hacker', status: 'passed', reportType: 'annual'
            }, clientTok);
            check('Client не може звіт → 403', r.status === 403, `status=${r.status}`);
        } catch(e) {
            check('Client → inspection-report заборонено', false, e.message);
        }
    }

    // GET single lift
    if (adminTok && createdLiftId) {
        try {
            const r = await request('GET', `/api/lifts/${createdLiftId}`, null, adminTok);
            check('GET /api/lifts/:id → 200', r.status === 200 && r.data.success, `status=${r.status}`);
            // Unified server returns data: liftObject (not data: {lift: ...})
            const lift = r.data.data?.lift || r.data.data;
            check('contractNumber збережено', !!lift?.contractNumber, `contractNumber: ${lift?.contractNumber}`);
            check('contractPrice збережено', lift?.contractPrice > 0, `contractPrice: ${lift?.contractPrice}`);
            check('lastInspectionDate оновлено після звіту', inspReportOk ? !!lift?.lastInspectionDate : null,
                `lastInspectionDate: ${lift?.lastInspectionDate}`);
        } catch(e) {
            check('GET /api/lifts/:id', false, e.message);
        }
    }

    // Client cannot delete
    if (clientTok && createdLiftId) {
        try {
            const r = await request('DELETE', `/api/lifts/${createdLiftId}`, null, clientTok);
            check('Client не може DELETE ліфт → 403', r.status === 403, `status=${r.status}`);
        } catch(e) {
            check('Client → DELETE ліфт заборонено', false, e.message);
        }
    }

    // Admin can delete (cleanup)
    if (adminTok && createdLiftId) {
        try {
            const r = await request('DELETE', `/api/lifts/${createdLiftId}`, null, adminTok);
            check('Admin: DELETE ліфт (cleanup) → 200', r.status === 200 && r.data.success, `status=${r.status}`);
        } catch(e) {
            check('Admin: DELETE ліфт cleanup', false, e.message, 'warn');
        }
    }
}

// ── 6. INSPECTION HISTORY FIELDS (existing lifts) ────────────────────────
async function checkInspectionHistory() {
    section('Цілісність inspectionHistory у наявних ліфтів');
    const tok = tokens['admin'];
    if (!tok) { skip('inspectionHistory check', 'немає admin токена'); return; }
    if (!testLiftId) { skip('inspectionHistory check', 'testLiftId не знайдено'); return; }

    try {
        const r = await request('GET', `/api/lifts/${testLiftId}`, null, tok);
        if (r.status !== 200) { check('GET ліфт для перевірки history', false, `status=${r.status}`); return; }
        // Unified server returns data: liftObject (not data: {lift: ...})
        const lift = r.data.data?.lift || r.data.data;
        const hist = lift?.inspectionHistory || [];
        console.log(`  ${INFO} inspectionHistory: ${hist.length} запис(ів)`);

        if (hist.length > 0) {
            let badDate = 0, badStatus = 0, badReportType = 0;
            const validStatus = ['passed','failed','conditional'];
            const validReportType = ['routine','emergency','annual','certification'];
            for (const h of hist) {
                if (!h.date) badDate++;
                if (h.status && !validStatus.includes(h.status)) badStatus++;
                if (h.reportType && !validReportType.includes(h.reportType)) badReportType++;
            }
            check('Усі записи мають date', badDate === 0, `без дати: ${badDate}`);
            check('Усі status є enum', badStatus === 0, `недійсних status: ${badStatus}`);
            check('Усі reportType є enum', badReportType === 0, `недійсних reportType: ${badReportType}`);

            // Check field naming
            const last = hist[hist.length - 1];
            check('Поле "date" (не "inspectionDate")', 'date' in last, `ключі: ${Object.keys(last).join(', ')}`);
            check('Поле "notes" (не "comments")', !('comments' in last) || 'notes' in last,
                `ключі: ${Object.keys(last).join(', ')}`);
            check('Поле "inspector" (не "inspectorName")', !('inspectorName' in last) || 'inspector' in last,
                `ключі: ${Object.keys(last).join(', ')}`);
        } else {
            console.log(`  ${INFO} Немає записів в inspectionHistory — propustiti перевірку полів`);
        }
    } catch(e) {
        check('inspectionHistory check', false, e.message);
    }
}

// ── 7. REQUESTS ───────────────────────────────────────────────────────────
async function checkRequests() {
    section('Заявки (requests): CRUD та доступ');
    const adminTok  = tokens['admin'];
    const dispTok   = tokens['dispatcher'];
    const techTok   = tokens['technician'];
    const clientTok = tokens['client'];

    // Get all requests as admin
    if (adminTok) {
        try {
            const r = await request('GET', '/api/requests?limit=5', null, adminTok);
            check('Admin: GET /api/requests → 200', r.status === 200, `status=${r.status}`);
            const reqs = r.data.data?.requests || r.data.requests || r.data.data || [];
            console.log(`  ${INFO} Заявок у системі: ${Array.isArray(reqs) ? reqs.length : '?'}`);
            if (Array.isArray(reqs) && reqs.length > 0) {
                testRequestId = reqs[0]._id;
                const req0 = reqs[0];
                check('Заявка має title', !!req0.title, `title: ${req0.title}`);
                check('Заявка має status', !!req0.status, `status: ${req0.status}`);
            }
            const r2 = await request('GET', '/api/requests/stats', null, adminTok);
            check('Admin: GET /api/requests/stats → 200', r2.status === 200, `status=${r2.status}`, 'warn');
        } catch(e) {
            check('Admin: GET /api/requests', false, e.message);
        }
    }

    // Client cannot see stats
    if (clientTok) {
        try {
            const r = await request('GET', '/api/requests/stats', null, clientTok);
            check('Client не може /requests/stats → 403', r.status === 403, `status=${r.status}`);
        } catch(e) {
            check('Client → /requests/stats заборонено', false, e.message);
        }
    }

    // Create request as client (if liftId available)
    let createdReqId = null;
    if (clientTok && testLiftId) {
        try {
            const r = await request('POST', '/api/requests', {
                lift: testLiftId,
                title: 'Health Check Request',
                description: 'Automated system check — can be deleted',
                type: 'maintenance',
                priority: 'normal'
            }, clientTok);
            const ok = (r.status === 201 || r.status === 200) && r.data.success;
            check('Client: POST /api/requests → 200/201', ok, `status=${r.status}`);
            if (ok) createdReqId = r.data.data?.request?._id || r.data.request?._id;
        } catch(e) {
            check('Client: POST /api/requests', false, e.message);
        }
    } else if (clientTok) {
        skip('Client: POST /api/requests', 'немає testLiftId');
    }

    // Assign request (dispatcher)
    if (dispTok && createdReqId) {
        try {
            const techR = await request('GET', '/api/auth/users', null, tokens['admin']);
            const techUser = (techR.data.data?.users || techR.data.data || []).find(u => u.role === 'technician');
            if (techUser) {
                const r = await request('POST', `/api/requests/${createdReqId}/assign`, {
                    technicianId: techUser._id
                }, dispTok);
                check('Dispatcher: назначити заявку техніку → 200', r.status === 200, `status=${r.status}`);
            } else {
                skip('Dispatcher: назначити заявку', 'немає techUser');
            }
        } catch(e) {
            check('Dispatcher: assign request', false, e.message, 'warn');
        }
    }

    // Delete test request
    if (adminTok && createdReqId) {
        try {
            const r = await request('DELETE', `/api/requests/${createdReqId}`, null, adminTok);
            check('Admin: DELETE request (cleanup) → 200', r.status === 200 || r.status === 204, `status=${r.status}`, 'warn');
        } catch(e) {}
    }
}

// ── 8. NOTIFICATIONS ──────────────────────────────────────────────────────
async function checkNotifications() {
    section('Сповіщення (notifications)');
    const adminTok = tokens['admin'];
    const clientTok = tokens['client'];

    for (const [role, tok] of [['admin', adminTok], ['client', clientTok]]) {
        if (!tok) { skip(`Notifications для ${role}`, 'немає токена'); continue; }
        try {
            const r = await request('GET', '/api/notifications', null, tok);
            check(`${role}: GET /api/notifications → 200`, r.status === 200, `status=${r.status}`);
        } catch(e) {
            check(`${role}: GET /api/notifications`, false, e.message, 'warn');
        }
    }

    // Mark all read
    if (adminTok) {
        try {
            const r = await request('PATCH', '/api/notifications/read-all', null, adminTok);
            check('Admin: PATCH /notifications/read-all → 200', r.status === 200, `status=${r.status}`, 'warn');
        } catch(e) {
            check('Admin: mark-all-read', false, e.message, 'warn');
        }
    }
}

// ── 9. PDF PARSER ENDPOINT ACCESS ─────────────────────────────────────────
async function checkPdfParser() {
    section('PDF Parser: контроль доступу');
    const clientTok = tokens['client'];
    const techTok   = tokens['technician'];

    // Without body — should fail due to missing file, but NOT 403
    for (const [role, tok] of [['client', clientTok], ['technician', techTok]]) {
        if (!tok) { skip(`PDF parser для ${role}`, 'немає токена'); continue; }
        try {
            const r = await request('POST', '/api/lifts/parse-inspection-pdf', null, tok);
            // client/technician should get 403
            if (role === 'client') {
                check(`${role} не може /parse-inspection-pdf → 403`, r.status === 403, `status=${r.status}`);
            } else {
                // technician is also not allowed based on authorizeRoles('admin','dispatcher')
                check(`${role} не може /parse-inspection-pdf → 403`, r.status === 403, `status=${r.status}`);
            }
        } catch(e) {
            check(`PDF parser access ${role}`, false, e.message, 'warn');
        }
    }

    // Admin/dispatcher should NOT get 403 (may get 400 for missing file)
    for (const [role, tok] of [['admin', tokens['admin']], ['dispatcher', tokens['dispatcher']]]) {
        if (!tok) { skip(`PDF parser для ${role}`, 'немає токена'); continue; }
        try {
            const r = await request('POST', '/api/lifts/parse-inspection-pdf', null, tok);
            check(`${role}: /parse-inspection-pdf не 403`, r.status !== 403, `status=${r.status} (очікується 400 без файлу)`);
        } catch(e) {
            check(`PDF parser ${role}`, false, e.message, 'warn');
        }
    }
}

// ── 10. CONTRACT ENDPOINT ACCESS ──────────────────────────────────────────
async function checkContractEndpoints() {
    section('Контракт: доступ та відповідь');
    if (!testLiftId) { skip('Contract endpoints', 'немає testLiftId'); return; }

    const adminTok  = tokens['admin'];
    const clientTok = tokens['client'];

    if (adminTok) {
        try {
            const r = await request('GET', `/api/lifts/${testLiftId}/contract`, null, adminTok);
            check('Admin: GET /contract → 200 або 404', [200, 404].includes(r.status), `status=${r.status}`);
            if (r.status === 200) {
                const c = r.data.data?.contract;
                console.log(`  ${INFO} Контракт знайдено: ${JSON.stringify(c || null).substring(0, 80)}`);
                if (c) {
                    check('contract має contractFile або contractNumber',
                        !!(c.contractFile || c.contractNumber), `поля: ${Object.keys(c).join(', ')}`);
                } else {
                    console.log(`  ${INFO} Контракт не завантажено (contract: null) — OK`);
                }
            }
        } catch(e) {
            check('Admin: GET /contract', false, e.message, 'warn');
        }
    }

    // Technician cannot post contract
    if (tokens['technician']) {
        try {
            const r = await request('POST', `/api/lifts/${testLiftId}/contract`, null, tokens['technician']);
            check('Technician не може POST /contract → 403', r.status === 403, `status=${r.status}`);
        } catch(e) {
            check('Technician → /contract post заборонено', false, e.message, 'warn');
        }
    }
}

// ── 11. ENUM VALIDATION (Lift model) ─────────────────────────────────────
async function checkEnumValidation() {
    section('Enum валідація (driveType / doorType / status)');
    const tok = tokens['admin'];
    if (!tok) { skip('Enum validation', 'немає admin токена'); return; }

    // Try invalid driveType
    try {
        const r = await request('POST', '/api/lifts', {
            municipalNumber: `ENUM-TEST-${Date.now()}`,
            address: { street: 'Enum Test', city: 'Lisboa' },
            location: { type: 'Point', coordinates: [-9.14, 38.72] },
            manufacturer: 'Test', model: 'Enum', capacity: 450, floors: 5,
            driveType: 'Канатний (з машинним залом)' // legacy display text
        }, tok);
        if (r.status === 200 || r.status === 201) {
            // Accepted — check if hook normalized it
            const liftCreated = r.data.data?.lift || r.data.data;
            const valid = ['traction','traction_mrl','hydraulic','goods','platform'];
            const normalized = valid.includes(liftCreated?.driveType);
            check('Хук нормалізує driveType перед збереженням', normalized,
                `driveType у БД: ${liftCreated?.driveType}`);
            // cleanup
            if (liftCreated?._id) await request('DELETE', `/api/lifts/${liftCreated._id}`, null, tok);
        } else if (r.status === 400) {
            check('Невалідний driveType відхилено (400)', true, 'enum validation на рівні схеми');
        } else {
            check('Enum driveType validation', false, `status=${r.status}`);
        }
    } catch(e) {
        check('Enum driveType test', false, e.message, 'warn');
    }

    // Try invalid doorType
    try {
        const r = await request('POST', '/api/lifts', {
            municipalNumber: `ENUM-DOOR-${Date.now()}`,
            address: { street: 'Door Test', city: 'Lisboa' },
            location: { type: 'Point', coordinates: [-9.14, 38.72] },
            manufacturer: 'Test', model: 'Door', capacity: 450, floors: 5,
            doorType: 'Напівавтоматичні' // legacy display text
        }, tok);
        if (r.status === 200 || r.status === 201) {
            const liftCreated = r.data.data?.lift || r.data.data;
            const valid = ['automatic','swing','gate'];
            const normalized = valid.includes(liftCreated?.doorType);
            check('Хук нормалізує doorType перед збереженням', normalized,
                `doorType у БД: ${liftCreated?.doorType}`);
            if (liftCreated?._id) await request('DELETE', `/api/lifts/${liftCreated._id}`, null, tok);
        } else if (r.status === 400) {
            check('Невалідний doorType відхилено (400)', true, 'enum validation');
        } else {
            check('Enum doorType validation', false, `status=${r.status}`);
        }
    } catch(e) {
        check('Enum doorType test', false, e.message, 'warn');
    }
}

// ── 12. CROSS-ROLE FIELD VISIBILITY ──────────────────────────────────────
async function checkCrossRoleVisibility() {
    section('Перехресна видимість даних між ролями');
    if (!testLiftId) { skip('Cross-role visibility', 'немає testLiftId'); return; }

    const adminTok  = tokens['admin'];
    const dispTok   = tokens['dispatcher'];
    const clientTok = tokens['client'];
    const techTok   = tokens['technician'];

    if (adminTok) {
        try {
            const ra = await request('GET', `/api/lifts/${testLiftId}`, null, adminTok);
            const rd = dispTok ? await request('GET', `/api/lifts/${testLiftId}`, null, dispTok) : null;

            const liftAdmin = ra.data.data?.lift || ra.data.data;
            const liftDisp  = rd ? (rd.data.data?.lift || rd.data.data) : null;

            check('Admin і dispatcher отримують однаковий ліфт', 
                liftAdmin?._id?.toString() === liftDisp?._id?.toString(),
                `admin._id=${liftAdmin?._id}, disp._id=${liftDisp?._id}`);

            // Client accessing a lift that doesn't belong to them — should get 404 or 403 or empty
            if (clientTok) {
                const rc = await request('GET', `/api/lifts/${testLiftId}`, null, clientTok);
                // Either 200 (if client owns it), 404, or 403
                check('Client GET lift: 200/404/403 (не 500)',
                    [200, 404, 403].includes(rc.status), `status=${rc.status}`);
                if (rc.status === 200) {
                    // Ensure no sensitive admin data is exposed
                    const liftC = rc.data.data?.lift;
                    check('Client не отримує password через populate', !liftC?.client?.password, '');
                }
            }

        } catch(e) {
            check('Cross-role visibility', false, e.message, 'warn');
        }
    }
}

// ── 13. INSPECTIONS MODEL (separate collection) ───────────────────────────
async function checkInspectionsCollection() {
    section('Колекція inspections (чеклісти технічного обслуговування)');
    const tok = tokens['admin'] || tokens['dispatcher'] || tokens['technician'];
    if (!tok) { skip('Inspections collection', 'немає токена'); return; }

    try {
        const r = await request('GET', '/api/inspections', null, tok);
        check('GET /api/inspections → 200 або 404',
            [200, 404].includes(r.status), `status=${r.status}`, 'warn');
        if (r.status === 200) {
            const list = r.data.inspections || r.data.data || [];
            console.log(`  ${INFO} Записів в inspections: ${Array.isArray(list) ? list.length : '?'}`);
        }
    } catch(e) {
        check('GET /api/inspections', false, e.message, 'warn');
    }

    // next-number
    try {
        const r = await request('GET', '/api/inspections/next-number', null, tok);
        check('GET /api/inspections/next-number → 200', r.status === 200, `status=${r.status}`, 'warn');
        check('next-number має numero поле', !!r.data.numero, `numero=${r.data.numero}`, 'warn');
    } catch(e) {
        check('GET /api/inspections/next-number', false, e.message, 'warn');
    }
}

// ── 14. REPORTS ROUTES ────────────────────────────────────────────────────
async function checkReports() {
    section('Звіти (reports routes)');
    const tok = tokens['admin'];
    if (!tok) { skip('Reports', 'немає admin токена'); return; }

    try {
        const r = await request('GET', '/api/reports', null, tok);
        check('GET /api/reports → 200 або 404', [200, 404].includes(r.status), `status=${r.status}`, 'warn');
    } catch(e) {
        check('GET /api/reports', false, e.message, 'warn');
    }
}

// ── 15. TECHNICIANS ENDPOINT ──────────────────────────────────────────────
async function checkTechnicians() {
    section('Техніки (/api/technicians)');
    const tok = tokens['admin'] || tokens['dispatcher'];
    if (!tok) { skip('Technicians endpoint', 'немає токена'); return; }

    try {
        const r = await request('GET', '/api/technicians', null, tok);
        check('GET /api/technicians → 200', r.status === 200, `status=${r.status}`, 'warn');
        if (r.status === 200) {
            const techs = r.data.data || r.data || [];
            console.log(`  ${INFO} Технічних фахівців: ${Array.isArray(techs) ? techs.length : '?'}`);
        }
    } catch(e) {
        check('GET /api/technicians', false, e.message, 'warn');
    }
}

// ── 16. PAGE HTML AVAILABILITY ────────────────────────────────────────────
async function checkPages() {
    section('Доступність HTML-сторінок (без авторизації → редирект або 200)');
    const pages = [
        { url: '/pages/auth/login.html',                          label: 'Login page',           expectedStatus: [200] },
        { url: '/pages/admin/lifts.html',                         label: 'Admin Lifts',           expectedStatus: [200] },
        { url: '/pages/dispatcher/lifts-admin-style.html',        label: 'Dispatcher Lifts',      expectedStatus: [200] },
        { url: '/pages/client/my-lifts.html',                     label: 'Client My Lifts',       expectedStatus: [200] },
        { url: '/pages/tech/dashboard.html',                      label: 'Tech Dashboard',        expectedStatus: [200] },
        { url: '/pages/admin/users.html',                         label: 'Admin Users',           expectedStatus: [200] },
        { url: '/pages/admin/reports.html',                       label: 'Admin Reports',         expectedStatus: [200] },
        { url: '/pages/dispatcher/inspections.html',              label: 'Dispatcher Inspections',expectedStatus: [200] },
        { url: '/pages/dispatcher/dashboard.html',                label: 'Dispatcher Dashboard',  expectedStatus: [200] },
        { url: '/pages/client/requests.html',                     label: 'Client Requests',       expectedStatus: [200] },
    ];

    for (const p of pages) {
        try {
            const r = await request('GET', p.url);
            const ok = p.expectedStatus.includes(r.status);
            check(`${p.label} (${p.url.split('/').slice(-1)[0]})`, ok,
                `status=${r.status}`, ok ? 'fail' : 'warn');
        } catch(e) {
            check(p.label, false, e.message, 'warn');
        }
    }
}

// ── 17. SECURITY: SQL/NoSQL injection resistance ──────────────────────────
async function checkSecurity() {
    section('Безпека: ін\'єкції та неавторизований доступ');
    const tok = tokens['admin'];

    // NoSQL injection attempt in lift search
    if (tok) {
        try {
            const r = await request('GET', '/api/lifts?search[$regex]=.*&search[$options]=i', null, tok);
            // Should work but not expose ALL data beyond limit
            check('NoSQL: пошук з regex → 200 (обмежений limit)', r.status === 200, `status=${r.status}`, 'warn');
        } catch(e) {}
    }

    // Token manipulation
    try {
        const r = await request('GET', '/api/lifts', null, 'eyJhbGciOiJIUzI1NiJ9.FAKE.FAKE');
        check('Підроблений токен → 403', r.status === 403, `status=${r.status}`);
    } catch(e) {
        check('Підроблений токен', false, e.message, 'warn');
    }

    // Expired/malformed token
    try {
        const r = await request('GET', '/api/auth/users', null, 'not-a-token');
        check('Невалідний токен → 401/403', [401, 403].includes(r.status), `status=${r.status}`);
    } catch(e) {
        check('Невалідний токен', false, e.message, 'warn');
    }
}

// ── 18. DATABASE INTEGRITY ────────────────────────────────────────────────
async function checkDataIntegrity() {
    section('Цілісність даних у БД (поля, enum, зв\'язки)');
    const adminTok = tokens['admin'];
    if (!adminTok) { skip('Data integrity', 'немає admin токена'); return; }

    try {
        const r = await request('GET', '/api/lifts?limit=20', null, adminTok);
        if (r.status !== 200) { check('GET lifts для аудиту', false, `status=${r.status}`); return; }

        const lifts = r.data.data?.lifts || [];
        if (lifts.length === 0) { skip('Аудит ліфтів', 'немає ліфтів у БД'); return; }

        let issues = {
            noStreet: 0, noCity: 0, noManufacturer: 0, noModel: 0,
            invalidDrive: 0, invalidDoor: 0, noCapacity: 0,
            noFloors: 0, uninitCoords: 0, duplicateCityInStreet: 0
        };
        const validDrive = ['traction','traction_mrl','hydraulic','goods','platform'];
        const validDoor  = ['automatic','swing','gate'];

        for (const l of lifts) {
            if (!l.address?.street)  issues.noStreet++;
            if (!l.address?.city)    issues.noCity++;
            if (!l.manufacturer)     issues.noManufacturer++;
            if (!l.model)            issues.noModel++;
            if (l.driveType && !validDrive.includes(l.driveType)) issues.invalidDrive++;
            if (l.doorType  && !validDoor.includes(l.doorType))   issues.invalidDoor++;
            if (!l.capacity) issues.noCapacity++;
            if (!l.floors)   issues.noFloors++;
            // Check if coordinates are 0,0 (unset)
            const coords = l.location?.coordinates;
            if (coords && coords[0] === 0 && coords[1] === 0) issues.uninitCoords++;
            // City duplicated into street?
            if (l.address?.city && l.address?.street === l.address?.city) issues.duplicateCityInStreet++;
        }

        const total = lifts.length;
        console.log(`  ${INFO} Перевірено ${total} ліфт(ів)`);

        check(`Без address.street (${issues.noStreet}/${total})`, issues.noStreet === 0,
            `${issues.noStreet} ліфтів без вулиці`, 'warn');
        check(`Без address.city (${issues.noCity}/${total})`, issues.noCity === 0,
            `${issues.noCity} ліфтів без міста`, 'warn');
        check(`Без manufacturer (${issues.noManufacturer}/${total})`, issues.noManufacturer === 0,
            ``, 'warn');
        check(`Без capacity (${issues.noCapacity}/${total})`, issues.noCapacity === 0,
            ``, 'warn');
        check(`Невалідний driveType (${issues.invalidDrive}/${total})`, issues.invalidDrive === 0,
            `${issues.invalidDrive} невалідних — є legacy значення`, issues.invalidDrive > 0 ? 'warn' : 'fail');
        check(`Невалідний doorType (${issues.invalidDoor}/${total})`, issues.invalidDoor === 0,
            `${issues.invalidDoor} невалідних — є legacy значення`, issues.invalidDoor > 0 ? 'warn' : 'fail');
        check(`Координати (0,0) — незаповнені (${issues.uninitCoords}/${total})`, issues.uninitCoords === 0,
            `${issues.uninitCoords} ліфтів`, 'warn');
        check(`city === street (дублювання) (${issues.duplicateCityInStreet}/${total})`, issues.duplicateCityInStreet === 0,
            `${issues.duplicateCityInStreet} ліфтів`, 'warn');

    } catch(e) {
        check('Data integrity check', false, e.message, 'warn');
    }
}

// ── 19. CLIENT ROLE: OWN DATA ISOLATION ──────────────────────────────────
async function checkClientIsolation() {
    section('Ізоляція даних клієнта (client бачить лише свої дані)');
    const clientTok = tokens['client'];
    if (!clientTok) { skip('Client isolation', 'немає client токена'); return; }

    // Get profile
    try {
        const pR = await request('GET', '/api/auth/profile', null, clientTok);
        const userId = pR.data.data?.user?._id || pR.data.user?._id;

        // Get lifts
        const lR = await request('GET', '/api/lifts', null, clientTok);
        const lifts = lR.data.data?.lifts || [];
        if (lifts.length > 0) {
            const allOwned = lifts.every(l => {
                const clientId = l.client?._id || l.client;
                return !clientId || clientId.toString() === userId?.toString();
            });
            check('Client бачить лише СВОЇ ліфти', allOwned,
                `${lifts.length} ліфт(ів), userId=${userId}`);
        } else {
            console.log(`  ${INFO} Client не має ліфтів — ізоляція не перевіряється`);
        }
    } catch(e) {
        check('Client isolation', false, e.message, 'warn');
    }
}

// ── SUMMARY ───────────────────────────────────────────────────────────────
function printSummary() {
    const total = summary.pass + summary.fail + summary.warn + summary.skip;
    console.log('\n' + clr('bold', '═'.repeat(62)));
    console.log(clr('bold', '  ПІДСУМОК ПЕРЕВІРКИ СИСТЕМИ'));
    console.log(clr('bold', '═'.repeat(62)));
    console.log(`  ${clr('green', '✅ Пройдено:')}   ${summary.pass}`);
    console.log(`  ${clr('red',   '❌ Провалено:')}  ${summary.fail}`);
    console.log(`  ${clr('yellow','⚠️  Попередження:')} ${summary.warn}`);
    console.log(`  ${clr('gray',  '⏭  Пропущено:')} ${summary.skip}`);
    console.log(`  ${clr('cyan',  'Всього:')}        ${total}`);

    if (failures.length > 0) {
        console.log('\n' + clr('bold', clr('red', '  ПОМИЛКИ:')));
        failures.forEach((f, i) => console.log(clr('red', `  ${i+1}. ${f}`)));
    }

    const score = total > 0 ? Math.round((summary.pass / (total - summary.skip)) * 100) : 0;
    const scoreColor = score >= 90 ? 'green' : score >= 70 ? 'yellow' : 'red';
    console.log('\n' + clr('bold', clr(scoreColor, `  РЕЙТИНГ СИСТЕМИ: ${score}%`)));
    console.log(clr('bold', '═'.repeat(62)));

    if (summary.fail === 0 && summary.warn === 0) {
        console.log(clr('green', '\n  🎉 Всі перевірки пройдені! Система в ідеальному стані.'));
    } else if (summary.fail === 0) {
        console.log(clr('yellow', '\n  ✅ Критичних помилок немає. Є застереження для розгляду.'));
    } else {
        console.log(clr('red', `\n  ⛔ ${summary.fail} критичних помилок. Потрібне виправлення.`));
    }
    console.log('');
}

// ── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
    console.log(clr('bold', clr('cyan', `
╔══════════════════════════════════════════════════════════════════╗
║       DeapSeaK — ПОВНА ПЕРЕВІРКА СИСТЕМИ                        ║
║       ${new Date().toLocaleString('pt-PT').padEnd(56)}║
╚══════════════════════════════════════════════════════════════════╝`)));
    console.log(`  Адреса API: ${clr('cyan', BASE_URL)}\n`);

    await checkHealth();
    await checkAuth();
    await checkProfiles();
    await checkUserManagement();
    await checkLiftsCRUD();
    await checkInspectionHistory();
    await checkRequests();
    await checkNotifications();
    await checkPdfParser();
    await checkContractEndpoints();
    await checkEnumValidation();
    await checkCrossRoleVisibility();
    await checkInspectionsCollection();
    await checkReports();
    await checkTechnicians();
    await checkPages();
    await checkSecurity();
    await checkDataIntegrity();
    await checkClientIsolation();

    printSummary();
    process.exit(summary.fail > 0 ? 1 : 0);
}

main().catch(e => {
    console.error(clr('red', '\n  ⛔ Непередбачена помилка:'), e.message);
    process.exit(1);
});
