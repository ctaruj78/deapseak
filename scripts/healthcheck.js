#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════
 *  FestLift — Автоматичний Health Check
 *  Запуск: node scripts/healthcheck.js
 *  Запуск після змін: node scripts/healthcheck.js --fix
 *  Запуск + API тести: node scripts/healthcheck.js --api
 * ═══════════════════════════════════════════════════════════════════
 */

const fs   = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const FIX_MODE = process.argv.includes('--fix');
const API_MODE = process.argv.includes('--api');
const ROOT     = path.join(__dirname, '..');
const BASE_URL = 'http://localhost:5000';

// ── Кольори в терміналі ────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  red:    '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue:   '\x1b[34m', cyan:  '\x1b[36m', bold:   '\x1b[1m',
  white:  '\x1b[37m', gray:  '\x1b[90m',
};
const ok    = (m) => `${C.green}✅ ${m}${C.reset}`;
const fail  = (m) => `${C.red}❌ ${m}${C.reset}`;
const warn  = (m) => `${C.yellow}⚠️  ${m}${C.reset}`;
const info  = (m) => `${C.cyan}ℹ️  ${m}${C.reset}`;
const fixed = (m) => `${C.blue}🔧 ${m}${C.reset}`;
const head  = (m) => `\n${C.bold}${C.white}${m}${C.reset}`;

let errors = 0;
let warnings = 0;
let fixes = 0;

// ── HTTP helper ────────────────────────────────────────────────────
function httpGet(url) {
    return new Promise((resolve) => {
        const lib = url.startsWith('https') ? https : http;
        const req = lib.get(url, { timeout: 8000 }, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
        });
        req.on('error', e => resolve({ status: 0, body: '', error: e.message }));
        req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: '', error: 'timeout' }); });
    });
}

function httpPost(url, json) {
    return new Promise((resolve) => {
        const body = JSON.stringify(json);
        const opts = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
            timeout: 8000
        };
        const req = http.request(url, opts, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', e => resolve({ status: 0, body: null, error: e.message }));
        req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
        req.write(body);
        req.end();
    });
}

// ── Зчитати всі HTML-файли ─────────────────────────────────────────
function getAllHtmlFiles() {
    const results = [];
    function walk(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) {
                if (!['node_modules', '.git'].includes(e.name)) walk(full);
            } else if (e.name.endsWith('.html') && !e.name.includes('backup') && !full.includes('includes/')) {
                results.push(full);
            }
        }
    }
    walk(path.join(ROOT, 'pages'));
    results.push(path.join(ROOT, 'index.html'));
    return results;
}

// ═══════════════════════════════════════════════════════════════════
//  ПЕРЕВІРКА 1: Структура HTML файлів
// ═══════════════════════════════════════════════════════════════════
function checkHtmlFiles() {
    console.log(head('═══ 1. HTML ФАЙЛИ (структура) ═══'));

    const files = getAllHtmlFiles();
    const issues = [];

    const checks = [
        {
            name: 'Viewport meta без >',
            pattern: /initial-scale=1\.0"\n/,
            fix: (c) => c.replace(/initial-scale=1\.0"\n(\s*<!--)/g, 'initial-scale=1.0">\n$1')
                         .replace(/initial-scale=1\.0"\n(\s*<)/g, 'initial-scale=1.0">\n$1'),
        },
        {
            name: 'Подвійний >> в CSS/JS link',
            pattern: /\.(css|js)">>$/m,
            fix: (c) => c.replace(/\.(css|js)">>/gm, '.$1">'),
        },
        {
            name: 'authToken (старий ключ)',
            pattern: /getItem\s*\(\s*['"]authToken['"]\s*\)/,
            fix: null, // не авто-фіксуємо — небезпечно без контексту
        },
        {
            name: 'Відсутній AdminLTE CSS (для захищених сторінок)',
            pattern: null,
            test: (content, file) => {
                const pub = ['login.html','index.html','demo.html','offline.html',
                             'ai-guest.html','ai-assistant-full.html','ai-diagnostics-full.html',
                             'test-','simple-','maps-simple','view-lift-modal','task-map.html'];
                const isPublic = pub.some(p => file.includes(p));
                if (isPublic) return false;
                return !content.includes('adminlte/adminlte.min.css') && !content.includes('adminlte.min.css');
            },
            fix: null,
        },
        {
            name: 'Файл є includes/ (пропускаємо)',
            pattern: null,
            test: (c, f) => false,
        },
        {
            name: 'Відсутній jQuery перед body close',
            pattern: null,
            test: (content, file) => {
                const pub = ['login.html','index.html','demo.html','offline.html',
                             'ai-guest.html','ai-assistant-full.html','ai-diagnostics-full.html',
                             'test-','simple-','maps-simple','view-lift-modal',
                             'task-map.html','auth/profile'];
                const isPublic = pub.some(p => file.includes(p));
                if (isPublic) return false;
                return !content.includes('jquery/jquery.min.js') &&
                       !content.includes('jquery.min.js') &&
                       !content.includes('cdn.jsdelivr.net/npm/jquery');
            },
            fix: null,
        },
    ];

    for (const file of files) {
        let content;
        try { content = fs.readFileSync(file, 'utf8'); }
        catch (e) { console.log(fail(`Не можу прочитати: ${path.relative(ROOT, file)}`)); errors++; continue; }

        const rel = path.relative(ROOT, file);
        let fileIssues = [];

        // Перевіряємо viewport без >
        if (/initial-scale=1\.0"\r?\n/.test(content)) {
            fileIssues.push('Viewport meta без >');
            if (FIX_MODE) {
                content = content.replace(/initial-scale=1\.0"(\r?\n)/g, 'initial-scale=1.0">$1');
                fixes++;
            }
        }

        // Подвійний >>
        if (/\.(css|js)">>/m.test(content)) {
            fileIssues.push('Подвійний >> у link/script');
            if (FIX_MODE) {
                content = content.replace(/\.(css|js)">>/gm, '.$1">');
                fixes++;
            }
        }

        // Старий authToken
        if (/getItem\s*\(\s*['"]authToken['"]\s*\)/.test(content)) {
            fileIssues.push('Старий ключ authToken (не liftmanager_jwt)');
        }

        // AdminLTE відсутній
        {
            const pub = ['login.html','index.html','demo.html','offline.html',
                         'ai-guest.html','ai-assistant-full.html','ai-diagnostics-full.html',
                         'test-','simple-','maps-simple','view-lift-modal','auth/profile',
                         'task-map.html'];
            const isPublic = pub.some(p => file.includes(p));
            if (!isPublic && !content.includes('adminlte.min.css')) {
                fileIssues.push('Відсутній adminlte.min.css');
            }
        }

        // jQuery відсутній
        {
            const pub = ['login.html','index.html','demo.html','offline.html',
                         'ai-guest.html','ai-assistant-full.html','ai-diagnostics-full.html',
                         'test-','simple-','maps-simple','view-lift-modal','auth/profile',
                         'task-map.html'];
            const isPublic = pub.some(p => file.includes(p));
            if (!isPublic && !content.includes('jquery') && !content.includes('jQuery')) {
                fileIssues.push('Відсутній jQuery');
            }
        }

        // <script перед </head>
        if (/<\/head>/.test(content)) {
            const headIdx = content.indexOf('</head>');
            if (content.lastIndexOf('<script', headIdx) > content.lastIndexOf('</script>', headIdx - 1) + 100) {
                // Possibly unclosed script block in head — soft warn
            }
        }

        if (FIX_MODE && fileIssues.length > 0) {
            fs.writeFileSync(file, content, 'utf8');
        }

        if (fileIssues.length > 0) {
            issues.push({ file: rel, problems: fileIssues });
            fileIssues.forEach(p => {
                if (FIX_MODE && p.includes('Viewport') || p.includes('>>')) {
                    console.log(fixed(`${rel} → ${p}`));
                } else {
                    console.log(fail(`${rel} → ${p}`));
                    errors++;
                }
            });
        }
    }

    if (issues.length === 0) {
        console.log(ok(`Всі ${files.length} HTML файлів чисті`));
    } else {
        console.log(warn(`Знайдено проблем у ${issues.length} файлах з ${files.length}`));
    }

    return issues;
}

// ═══════════════════════════════════════════════════════════════════
//  ПЕРЕВІРКА 2: JS/CSS файли — чи існують на сервері
// ═══════════════════════════════════════════════════════════════════
async function checkStaticAssets() {
    console.log(head('═══ 2. СТАТИЧНІ РЕСУРСИ ═══'));

    const criticalAssets = [
        '/plugins/adminlte/adminlte.min.css',
        '/plugins/adminlte/adminlte.min.js',
        '/plugins/bootstrap/bootstrap.min.css',
        '/plugins/bootstrap/bootstrap.bundle.min.js',
        '/plugins/jquery/jquery.min.js',
        '/plugins/fontawesome/css/all.min.css',
        '/assets/js/auth.js',
        '/assets/js/global-settings.js',
        '/assets/js/sidebar-init.js',
        '/assets/css/admin.css',
        '/assets/css/lifts.css',
        '/manifest.json',
        '/sw.js',
        '/offline.html',
    ];

    let assetErrors = 0;
    for (const asset of criticalAssets) {
        const r = await httpGet(`${BASE_URL}${asset}`);
        if (r.status === 200) {
            const size = r.body.length;
            if (size < 10) {
                console.log(fail(`${asset} → ПОРОЖНІЙ ФАЙЛ (${size} байт)`));
                assetErrors++; errors++;
            } else {
                console.log(ok(`${asset} (${(size/1024).toFixed(1)}kb)`));
            }
        } else {
            console.log(fail(`${asset} → HTTP ${r.status || 'ERROR: ' + r.error}`));
            assetErrors++; errors++;
        }
    }

    if (assetErrors === 0) console.log(ok('Всі критичні ресурси доступні'));
}

// ═══════════════════════════════════════════════════════════════════
//  ПЕРЕВІРКА 3: API endpoints
// ═══════════════════════════════════════════════════════════════════
async function checkApiEndpoints() {
    console.log(head('═══ 3. API ENDPOINTS ═══'));

    // Логін
    const loginResp = await httpPost(`${BASE_URL}/api/auth/login`, {
        email: 'info@festlift.pt',
        password: 'admin123'
    });

    if (loginResp.status !== 200 || !loginResp.body?.data?.token) {
        console.log(fail(`POST /api/auth/login → HTTP ${loginResp.status} — не вдалося увійти`));
        errors++;
        return;
    }
    const token = loginResp.body.data.token;
    console.log(ok(`POST /api/auth/login → JWT отримано`));

    const endpoints = [
        { method: 'GET', path: '/api/lifts?limit=5',         check: r => r.body?.success && Array.isArray(r.body?.data), label: 'GET /api/lifts' },
        { method: 'GET', path: '/api/lifts/stats',           check: r => r.status === 200, label: 'GET /api/lifts/stats' },
        { method: 'GET', path: '/api/users/me',              check: r => r.status === 200 && (r.body?._id || r.body?.data?._id || r.body?.data?.id), label: 'GET /api/users/me' },
        { method: 'GET', path: '/api/users?limit=5',         check: r => r.status === 200, label: 'GET /api/users (admin)' },
        { method: 'GET', path: '/api/requests?limit=5',      check: r => r.status === 200, label: 'GET /api/requests' },
        { method: 'GET', path: '/api/municipalities?limit=5',check: r => r.status === 200, label: 'GET /api/municipalities' },
        { method: 'GET', path: '/api/auth/status',           check: r => r.status === 200, label: 'GET /api/auth/status' },
    ];

    for (const ep of endpoints) {
        const r = await new Promise((resolve) => {
            const opts = {
                method: ep.method,
                headers: { 'Authorization': `Bearer ${token}` },
                timeout: 8000,
            };
            const req = http.request(`${BASE_URL}${ep.path}`, opts, (res) => {
                let data = '';
                res.on('data', d => data += d);
                res.on('end', () => {
                    try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                    catch { resolve({ status: res.statusCode, body: data }); }
                });
            });
            req.on('error', e => resolve({ status: 0, error: e.message }));
            req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
            req.end();
        });

        if (r.status === 0) {
            console.log(fail(`${ep.label} → TIMEOUT/ERROR: ${r.error}`));
            errors++;
        } else if (ep.check(r)) {
            const extra = r.body?.pagination?.total !== undefined ? ` (всього: ${r.body.pagination.total})` : '';
            console.log(ok(`${ep.label} → ${r.status}${extra}`));
        } else {
            console.log(fail(`${ep.label} → HTTP ${r.status} — неочікувана відповідь: ${JSON.stringify(r.body)?.substring(0, 100)}`));
            errors++;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
//  ПЕРЕВІРКА 4: Сторінки повертають 200 (HTTP)
// ═══════════════════════════════════════════════════════════════════
async function checkPageHttp() {
    console.log(head('═══ 4. HTTP СТАТУС СТОРІНОК ═══'));

    const pages = [
        '/',
        '/pages/auth/login.html',
        '/pages/admin/admin-dashboard.html',
        '/pages/admin/lifts.html',
        '/pages/admin/requests.html',
        '/pages/dispatcher/dashboard.html',
        '/pages/dispatcher/lifts-new.html',
        '/pages/tech/tech-dashboard.html',
        '/pages/tech/qr-scanner.html',
        '/pages/client/dashboard.html',
    ];

    let pageErrors = 0;
    for (const page of pages) {
        const r = await httpGet(`${BASE_URL}${page}`);
        if (r.status !== 200) {
            console.log(fail(`${page} → HTTP ${r.status || r.error}`));
            pageErrors++; errors++;
        } else {
            // Перевіряємо що це HTML, не JSON помилка
            if (r.body.startsWith('{') || r.body.startsWith('Error')) {
                console.log(fail(`${page} → 200 але повернув помилку: ${r.body.substring(0,80)}`));
                pageErrors++; errors++;
            } else {
                console.log(ok(`${page} → 200 OK`));
            }
        }
    }
    if (pageErrors === 0) console.log(ok('Всі сторінки повертають 200 OK'));
}

// ═══════════════════════════════════════════════════════════════════
//  ПЕРЕВІРКА 5: MongoDB — ліфти, юзери, заявки
// ═══════════════════════════════════════════════════════════════════
async function checkDatabase() {
    console.log(head('═══ 5. БД — MongoDB ═══'));

    // Використовуємо API щоб перевірити БД
    const loginResp = await httpPost(`${BASE_URL}/api/auth/login`, {
        email: 'info@festlift.pt', password: 'admin123'
    });
    if (!loginResp.body?.data?.token) {
        console.log(fail('Не вдалося залогінитись для перевірки БД'));
        errors++; return;
    }
    const token = loginResp.body.data.token;

    const dbChecks = [
        { path: '/api/lifts/stats', label: 'Колекція lifts', field: 'data' },
        { path: '/api/users?limit=1', label: 'Колекція users', field: 'data' },
        { path: '/api/requests?limit=1', label: 'Колекція requests', field: 'data' },
        { path: '/api/municipalities?limit=1', label: 'Колекція municipalities', field: null },
    ];

    for (const chk of dbChecks) {
        const r = await new Promise((resolve) => {
            const req = http.request(`${BASE_URL}${chk.path}`, {
                headers: { 'Authorization': `Bearer ${token}` }, timeout: 8000
            }, (res) => {
                let data = '';
                res.on('data', d => data += d);
                res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, body: {} }); } });
            });
            req.on('error', e => resolve({ status: 0, error: e.message }));
            req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
            req.end();
        });
        if (r.status === 200 && r.body?.success !== false) {
            console.log(ok(`${chk.label} → доступна`));
        } else {
            console.log(fail(`${chk.label} → HTTP ${r.status} — ${r.body?.message || r.error || 'помилка'}`));
            errors++;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
//  ПЕРЕВІРКА 6: PM2 та сервер
// ═══════════════════════════════════════════════════════════════════
async function checkServer() {
    console.log(head('═══ 6. СЕРВЕР (PM2 + порт) ═══'));

    // Перевіряємо port 5000
    const r = await httpGet(`${BASE_URL}/api/auth/status`);
    if (r.status === 200 || r.status === 401) {
        console.log(ok(`Порт 5000 відповідає (HTTP ${r.status})`));
    } else {
        console.log(fail(`Порт 5000 НЕ відповідає: ${r.error || r.status}`));
        errors++;
    }

    // Перевіряємо HTTPS через домен
    const rDomain = await httpGet('https://crm.festlift.pt/api/auth/status');
    if (rDomain.status > 0) {
        console.log(ok(`crm.festlift.pt відповідає (HTTP ${rDomain.status})`));
    } else {
        console.log(warn(`crm.festlift.pt недоступний: ${rDomain.error}`));
        warnings++;
    }
}

// ═══════════════════════════════════════════════════════════════════
//  ПЕРЕВІРКА 7: Service Worker версія
// ═══════════════════════════════════════════════════════════════════
function checkServiceWorker() {
    console.log(head('═══ 7. SERVICE WORKER ═══'));

    const swPath = path.join(ROOT, 'sw.js');
    if (!fs.existsSync(swPath)) {
        console.log(fail('sw.js не існує!'));
        errors++;
        return;
    }
    const sw = fs.readFileSync(swPath, 'utf8');
    const match = sw.match(/CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/);
    if (match) {
        console.log(ok(`Service Worker версія: ${match[1]}`));
    } else {
        console.log(warn('CACHE_VERSION не знайдено в sw.js'));
        warnings++;
    }

    // Перевіряємо що в precache є потрібні файли
    const needed = ['/manifest.json', '/offline.html'];
    for (const n of needed) {
        if (sw.includes(n)) console.log(ok(`Precache: ${n}`));
        else { console.log(warn(`Відсутній в precache: ${n}`)); warnings++; }
    }
}

// ═══════════════════════════════════════════════════════════════════
//  ПЕРЕВІРКА 8: Manifest.json
// ═══════════════════════════════════════════════════════════════════
function checkManifest() {
    console.log(head('═══ 8. MANIFEST.JSON ═══'));

    const mPath = path.join(ROOT, 'manifest.json');
    if (!fs.existsSync(mPath)) {
        console.log(fail('manifest.json не існує!'));
        errors++; return;
    }
    let m;
    try { m = JSON.parse(fs.readFileSync(mPath, 'utf8')); }
    catch (e) { console.log(fail(`manifest.json — помилка JSON: ${e.message}`)); errors++; return; }

    const required = ['name', 'short_name', 'start_url', 'icons', 'display'];
    for (const field of required) {
        if (m[field]) console.log(ok(`manifest.${field}: ${typeof m[field] === 'string' ? m[field] : JSON.stringify(m[field]).substring(0,60)}`));
        else { console.log(fail(`manifest.${field} відсутнє!`)); errors++; }
    }

    if (m.start_url && m.start_url.includes('localhost')) {
        console.log(fail(`start_url містить localhost: ${m.start_url}`));
        errors++;
    }
}

// ═══════════════════════════════════════════════════════════════════
//  ПІДСУМОК
// ═══════════════════════════════════════════════════════════════════
function printSummary() {
    console.log(`\n${C.bold}${'═'.repeat(55)}${C.reset}`);
    console.log(`${C.bold}  ПІДСУМОК HEALTH CHECK${C.reset}`);
    console.log(`${'═'.repeat(55)}`);

    if (errors === 0 && warnings === 0) {
        console.log(ok('ВСЕ ЧИСТО! Жодних проблем не знайдено.'));
    } else {
        if (errors > 0) console.log(fail(`ПОМИЛОК: ${errors}`));
        if (warnings > 0) console.log(warn(`ПОПЕРЕДЖЕНЬ: ${warnings}`));
        if (fixes > 0) console.log(fixed(`AUTO-ВИПРАВЛЕНО: ${fixes}`));
    }

    if (FIX_MODE && fixes > 0) {
        console.log(`\n${info('Зміни збережено. Перезапустіть сервер: pm2 restart deapseak')}`);
    }

    console.log(`\n${C.gray}Запуск з --fix: автоматично виправляє HTML проблеми${C.reset}`);
    console.log(`${C.gray}Запуск з --api: повна перевірка всіх API ендпоінтів${C.reset}`);
    console.log(`${'═'.repeat(55)}\n`);

    process.exit(errors > 0 ? 1 : 0);
}

// ═══════════════════════════════════════════════════════════════════
//  ГОЛОВНА ФУНКЦІЯ
// ═══════════════════════════════════════════════════════════════════
async function main() {
    const startTime = Date.now();

    console.log(`\n${C.bold}${C.cyan}${'═'.repeat(55)}${C.reset}`);
    console.log(`${C.bold}${C.cyan}  FestLift Health Check${C.reset}${FIX_MODE ? C.yellow + ' [FIX MODE]' + C.reset : ''}${API_MODE ? C.blue + ' [API MODE]' + C.reset : ''}`);
    console.log(`${C.bold}${C.cyan}  ${new Date().toLocaleString('uk-UA')}${C.reset}`);
    console.log(`${C.bold}${C.cyan}${'═'.repeat(55)}${C.reset}`);

    // 1. HTML структура
    checkHtmlFiles();

    // 2. Статичні ресурси
    await checkStaticAssets();

    // 3-5. Залежить від API_MODE
    await checkServer();
    await checkPageHttp();

    if (API_MODE) {
        await checkApiEndpoints();
        await checkDatabase();
    }

    // 6-8. Завжди
    checkServiceWorker();
    checkManifest();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(info(`Перевірка виконана за ${elapsed}с`));

    printSummary();
}

main().catch(e => {
    console.error(fail(`Критична помилка health check: ${e.message}`));
    process.exit(2);
});
