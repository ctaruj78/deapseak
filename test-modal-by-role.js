#!/usr/bin/env node
/**
 * ============================================================
 *  MODAL SIMULATION — ЗВІТ ПО РОЛЯХ
 *  Перевіряє: логін, CRUD ліфтів, валідацію, дозволи
 *  Запуск: node test-modal-by-role.js [роль]
 *  Ролі: admin | dispatcher | technician | client | all
 * ============================================================
 */

const http  = require('http');
const https = require('https');

const BASE = 'http://localhost:5000';

// ─── Кольори ──────────────────────────────────────────────
const c = {
    reset:  '\x1b[0m',
    bold:   '\x1b[1m',
    dim:    '\x1b[2m',
    green:  '\x1b[32m',
    red:    '\x1b[31m',
    yellow: '\x1b[33m',
    cyan:   '\x1b[36m',
    blue:   '\x1b[34m',
    magenta:'\x1b[35m',
    white:  '\x1b[37m',
    bgGreen:'\x1b[42m',
    bgRed:  '\x1b[41m',
    bgBlue: '\x1b[44m',
};
const ok   = (msg) => `${c.green}✅ ${msg}${c.reset}`;
const fail = (msg) => `${c.red}❌ ${msg}${c.reset}`;
const warn = (msg) => `${c.yellow}⚠️  ${msg}${c.reset}`;
const info = (msg) => `${c.cyan}ℹ️  ${msg}${c.reset}`;
const skip = (msg) => `${c.dim}⏭  ${msg}${c.reset}`;

// ─── Ролі ─────────────────────────────────────────────────
const ROLES = {
    admin: {
        label:    '👨‍💼 Адміністратор',
        email:    'info@festlift.pt',
        password: 'admin123',
        canCreate: true,
        canEdit:   true,
        canDelete: true,
        liftPage:  '/pages/admin/lifts.html',
    },
    dispatcher: {
        label:    '📞 Диспетчер',
        email:    'dispatcher@festlift.pt',
        password: 'dispatcher123',
        canCreate: true,
        canEdit:   true,
        canDelete: false, // тільки запит на видалення
        liftPage:  '/pages/dispatcher/lifts.html',
    },
    technician: {
        label:    '🔧 Технік',
        email:    'tech1@festlift.pt',
        password: 'tech123',
        canCreate: false,
        canEdit:   false,
        canDelete: false,
        liftPage:  null,
    },
    client: {
        label:    '👤 Клієнт',
        email:    'client@festlift.pt',
        password: 'client123',
        canCreate: false,
        canEdit:   false,
        canDelete: false,
        liftPage:  null,
    },
};

// ─── HTTP helpers ─────────────────────────────────────────
function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE + path);
        const opts = {
            hostname: url.hostname,
            port:     url.port || 5000,
            path:     url.pathname + url.search,
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (token) opts.headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(opts, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// ─── Тест–кейси ───────────────────────────────────────────

const TEST_LIFT = {
    municipalNumber:    'TEST-MODAL-' + Date.now(),
    address:            'Rua do Teste 99, Lisboa',
    postcode:           '1000-001',
    clientEmail:        'test@festlift.pt',
    clientName:         'Test Client',
    type:               'passenger',
    brand:              'otis',
    model:              'Gen2 Test',
    capacity:           450,
    speed:              1.0,
    status:             'operational',
    liftsCountAtAddress: 1,
};

async function runRoleTests(roleKey, role) {
    const results = [];
    const add = (name, passed, detail = '') => results.push({ name, passed, detail });

    console.log(`\n${c.bold}${c.bgBlue}${c.white}  ${role.label}  ${c.reset}`);
    console.log(`${c.dim}  Email: ${role.email}${c.reset}\n`);

    // ─── 1. Логін ─────────────────────────────────────────
    let token = null;
    try {
        const loginRes = await request('POST', '/api/auth/login', {
            email:    role.email,
            password: role.password,
        });
        if (loginRes.status === 200 && loginRes.body.token) {
            token = loginRes.body.token;
            add('Логін', true, `HTTP ${loginRes.status}`);
            console.log(`  ${ok('Логін успішний')} ${c.dim}(token отримано)${c.reset}`);
        } else {
            add('Логін', false, `HTTP ${loginRes.status} — ${JSON.stringify(loginRes.body).slice(0,80)}`);
            console.log(`  ${fail('Логін невдалий')} HTTP ${loginRes.status}`);
            return results; // далі без токена немає сенсу
        }
    } catch (e) {
        add('Логін', false, e.message);
        console.log(`  ${fail('Логін — мережева помилка:')} ${e.message}`);
        return results;
    }

    // ─── 2. Перевірка профілю / ролі ─────────────────────
    try {
        const profileRes = await request('GET', '/api/auth/me', null, token);
        const roleFromApi = profileRes.body?.user?.role || profileRes.body?.role || '?';
        const emailOk = (profileRes.body?.user?.email || profileRes.body?.email) === role.email;
        add('Профіль /api/auth/me', profileRes.status === 200 && emailOk,
            `role=${roleFromApi}, status=${profileRes.status}`);
        console.log(`  ${profileRes.status === 200 && emailOk ? ok('Профіль') : fail('Профіль')} role=${c.cyan}${roleFromApi}${c.reset}`);
    } catch (e) {
        add('Профіль', false, e.message);
        console.log(`  ${fail('Профіль — помилка:')} ${e.message}`);
    }

    // ─── 3. GET /api/lifts ────────────────────────────────
    let liftsBefore = 0;
    try {
        const listRes = await request('GET', '/api/lifts', null, token);
        if (listRes.status === 200) {
            const apiData = listRes.body?.data?.lifts || listRes.body?.lifts || listRes.body?.data || [];
            liftsBefore = Array.isArray(apiData) ? apiData.length : 0;
            add('GET /api/lifts', true, `${liftsBefore} ліфтів`);
            console.log(`  ${ok('GET ліфти')} ${c.dim}(${liftsBefore} записів)${c.reset}`);
        } else if (listRes.status === 403) {
            add('GET /api/lifts', false, 'Доступ заборонено (403)');
            console.log(`  ${skip('GET ліфти')} 403 — роль не має доступу`);
        } else {
            add('GET /api/lifts', false, `HTTP ${listRes.status}`);
            console.log(`  ${fail('GET ліфти')} HTTP ${listRes.status}`);
        }
    } catch (e) {
        add('GET /api/lifts', false, e.message);
        console.log(`  ${fail('GET ліфти — помилка:')} ${e.message}`);
    }

    // ─── 4. POST /api/lifts (Створення) ──────────────────
    let createdId = null;
    if (role.canCreate) {
        try {
            const liftData = { ...TEST_LIFT, municipalNumber: 'TEST-' + roleKey.toUpperCase() + '-' + Date.now() };
            const createRes = await request('POST', '/api/lifts', liftData, token);
            const created = createRes.body?.data || createRes.body?.lift || createRes.body;
            if (createRes.status === 201 || createRes.status === 200) {
                createdId = created?._id || created?.id;
                add('POST /api/lifts (Створення)', true, `id=${createdId}`);
                console.log(`  ${ok('Створення ліфта')} ${c.dim}id=${createdId}${c.reset}`);
            } else {
                add('POST /api/lifts (Створення)', false, `HTTP ${createRes.status} — ${JSON.stringify(createRes.body).slice(0,100)}`);
                console.log(`  ${fail('Створення ліфта')} HTTP ${createRes.status} ${c.dim}${JSON.stringify(createRes.body).slice(0,80)}${c.reset}`);
            }
        } catch (e) {
            add('POST /api/lifts', false, e.message);
            console.log(`  ${fail('Створення — помилка:')} ${e.message}`);
        }
    } else {
        // Спробуємо і маємо отримати 403
        try {
            const liftData = { ...TEST_LIFT, municipalNumber: 'TEST-BLOCK-' + Date.now() };
            const blockRes = await request('POST', '/api/lifts', liftData, token);
            if (blockRes.status === 403 || blockRes.status === 401) {
                add('POST /api/lifts заблоковано (очікувано)', true, `HTTP ${blockRes.status} — доступ правильно заборонено`);
                console.log(`  ${ok('Блокування створення (очікувано)')} HTTP ${blockRes.status}`);
            } else {
                add('POST /api/lifts заблоковано', false, `HTTP ${blockRes.status} — МАЛО БУТИ 403, але пропустило!`);
                console.log(`  ${warn('Створення НЕ заблоковано!')} HTTP ${blockRes.status} ${c.red}(дірка в безпеці?)${c.reset}`);
            }
        } catch (e) {
            add('POST /api/lifts (перевірка блокування)', false, e.message);
        }
    }

    // ─── 5. PUT /api/lifts/:id (Редагування) ─────────────
    if (role.canEdit && createdId) {
        try {
            const updateRes = await request('PUT', `/api/lifts/${createdId}`,
                { ...TEST_LIFT, maintenanceNotes: 'Test edit ' + new Date().toISOString() },
                token);
            if (updateRes.status === 200) {
                add('PUT /api/lifts/:id (Редагування)', true, `HTTP ${updateRes.status}`);
                console.log(`  ${ok('Редагування ліфта')}`);
            } else {
                add('PUT /api/lifts/:id', false, `HTTP ${updateRes.status} — ${JSON.stringify(updateRes.body).slice(0,80)}`);
                console.log(`  ${fail('Редагування')} HTTP ${updateRes.status}`);
            }
        } catch (e) {
            add('PUT /api/lifts/:id', false, e.message);
        }
    } else if (!role.canEdit) {
        console.log(`  ${skip('Редагування')} — роль не може редагувати`);
    }

    // ─── 6. Валідація: порожній муніципальний номер ───────
    if (role.canCreate) {
        try {
            const badData = { ...TEST_LIFT, municipalNumber: '' };
            const valRes = await request('POST', '/api/lifts', badData, token);
            if (valRes.status === 400 || valRes.status === 422) {
                add('Валідація: порожній муніципальний №', true, `HTTP ${valRes.status} — сервер відхилив`);
                console.log(`  ${ok('Валідація: порожній муніципальний № → відхилено')} ${c.dim}(HTTP ${valRes.status})${c.reset}`);
            } else if (valRes.status === 200 || valRes.status === 201) {
                // сервер прийняв — перевіряємо чи є ID
                const newId = valRes.body?.data?._id || valRes.body?._id;
                if (newId) {
                    // cleanup
                    await request('DELETE', `/api/lifts/${newId}`, null, token).catch(() => {});
                }
                add('Валідація: порожній муніципальний №', false, `HTTP ${valRes.status} — сервер прийняв без номера!`);
                console.log(`  ${warn('Валідація на сервері слабка')} — порожній муніципальний № прийнятий`);
            } else {
                add('Валідація: порожній муніципальний №', null, `HTTP ${valRes.status}`);
                console.log(`  ${info('Валідація:')} HTTP ${valRes.status}`);
            }
        } catch (e) {
            add('Валідація: порожній муніципальний №', false, e.message);
        }
    }

    // ─── 7. Валідація: некоректний email ──────────────────
    if (role.canCreate) {
        try {
            const badEmail = { ...TEST_LIFT, municipalNumber: 'TEST-V-' + Date.now(), clientEmail: 'not-an-email' };
            const valRes2 = await request('POST', '/api/lifts', badEmail, token);
            if (valRes2.status === 400 || valRes2.status === 422) {
                add('Валідація: некоректний email', true, `HTTP ${valRes2.status}`);
                console.log(`  ${ok('Валідація: некоректний email → відхилено')}`);
            } else {
                add('Валідація: некоректний email', false, `HTTP ${valRes2.status} — прийнято`);
                console.log(`  ${warn('Валідація email на сервері слабка')} HTTP ${valRes2.status}`);
                // cleanup
                const nId = valRes2.body?.data?._id || valRes2.body?._id;
                if (nId) await request('DELETE', `/api/lifts/${nId}`, null, token).catch(() => {});
            }
        } catch (e) {
            add('Валідація: некоректний email', false, e.message);
        }
    }

    // ─── 8. DELETE /api/lifts/:id ────────────────────────
    if (role.canDelete && createdId) {
        try {
            const delRes = await request('DELETE', `/api/lifts/${createdId}`, null, token);
            if (delRes.status === 200) {
                add('DELETE /api/lifts/:id', true, `HTTP ${delRes.status}`);
                console.log(`  ${ok('Видалення ліфта')}`);
                createdId = null;
            } else {
                add('DELETE /api/lifts/:id', false, `HTTP ${delRes.status}`);
                console.log(`  ${fail('Видалення')} HTTP ${delRes.status}`);
            }
        } catch (e) {
            add('DELETE /api/lifts/:id', false, e.message);
        }
    } else if (!role.canDelete && createdId) {
        // Спробуємо і маємо отримати 403
        try {
            const blockDel = await request('DELETE', `/api/lifts/${createdId}`, null, token);
            if (blockDel.status === 403 || blockDel.status === 401) {
                add('DELETE заблоковано (очікувано)', true, `HTTP ${blockDel.status}`);
                console.log(`  ${ok('Видалення заблоковано (очікувано)')} HTTP ${blockDel.status}`);
            } else {
                add('DELETE заблоковано', false, `HTTP ${blockDel.status} — МАЛО БУТИ 403`);
                console.log(`  ${warn('Видалення НЕ заблоковано!')} HTTP ${blockDel.status}`);
            }
        } catch (e) {
            add('DELETE (перевірка блокування)', false, e.message);
        }
        // Cleanup: видаляємо тест-ліфт від імені адміна
        if (createdId) {
            try {
                const adminLogin = await request('POST', '/api/auth/login', { email: 'info@festlift.pt', password: 'admin123' });
                const adminToken = adminLogin.body?.token;
                if (adminToken) await request('DELETE', `/api/lifts/${createdId}`, null, adminToken);
            } catch {}
        }
    } else if (role.canCreate && !createdId) {
        // якщо couldn't create, skip delete
    }

    // ─── 9. Перевірка сторінки lifts.html ────────────────
    if (role.liftPage) {
        try {
            const pageRes = await request('GET', role.liftPage);
            if (pageRes.status === 200) {
                const html = typeof pageRes.body === 'string' ? pageRes.body : JSON.stringify(pageRes.body);
                const hasEnhancedModal = html.includes('enhancedLiftModal');
                const hasELiftPane    = html.includes('eLiftPane-obj');
                const hasFormFooter   = html.includes('eLiftBtnSave');
                const hasMapDiv       = html.includes('enhancedLiftMap');
                const hasTabProgress  = html.includes('tab-progress');
                add('Сторінка lifts.html доступна', true, `HTTP ${pageRes.status}`);
                add('Modal #enhancedLiftModal присутній', hasEnhancedModal);
                add('Нова структура вкладок (eLiftPane-obj)', hasELiftPane);
                add('Кнопка збереження (#eLiftBtnSave)', hasFormFooter);
                add('Контейнер карти (#enhancedLiftMap)', hasMapDiv);
                add('Прогрес-бар (.tab-progress)', hasTabProgress);

                console.log(`  ${ok('Сторінка ' + role.liftPage)}`);
                console.log(`    ${hasEnhancedModal ? ok('enhancedLiftModal') : fail('enhancedLiftModal ВІДСУТНІЙ!')}`);
                console.log(`    ${hasELiftPane     ? ok('Нові вкладки (eLiftPane-obj)')  : fail('Нові вкладки ВІДСУТНІ — старий дизайн?')}`);
                console.log(`    ${hasFormFooter    ? ok('Кнопка Guardar (#eLiftBtnSave)') : fail('#eLiftBtnSave ВІДСУТНІЙ')}`);
                console.log(`    ${hasMapDiv        ? ok('Карта (#enhancedLiftMap)')        : fail('#enhancedLiftMap ВІДСУТНІЙ')}`);
                console.log(`    ${hasTabProgress   ? ok('Прогрес-бар')                    : fail('Прогрес-бар ВІДСУТНІЙ')}`);

                // Перевіряємо ДУБЛІКАТИ ключових ID
                const mapCount = (html.match(/id="enhancedLiftModal"/g) || []).length;
                const munCount = (html.match(/id="enhancedMunicipalNumber"/g) || []).length;
                add('Немає дублікатів #enhancedLiftModal', mapCount <= 1, `знайдено: ${mapCount}`);
                add('Немає дублікатів #enhancedMunicipalNumber', munCount <= 1, `знайдено: ${munCount}`);
                console.log(`    ${mapCount <= 1 ? ok('ID дублікатів немає') : fail(`Дублікат #enhancedLiftModal: ${mapCount} рази!`)}`);
                console.log(`    ${munCount <= 1 ? ok('municipalNumber — одиночне поле') : warn(`#enhancedMunicipalNumber: ${munCount} (нормально якщо є динамічний контейнер)`)}`);

                // Старі вкладки (basic-info/location-info)
                const hasOldTabs = html.includes('id="basic-info"') || html.includes('href="#basic-info"');
                add('Старих вкладок немає (basic-info)', !hasOldTabs, hasOldTabs ? 'ЗНАЙДЕНО залишки старого дизайну!' : 'чисто');
                console.log(`    ${hasOldTabs ? fail('ЗАЛИШКИ СТАРОГО ДИЗАЙНУ (basic-info)!')  : ok('Старих вкладок немає')}`);

            } else {
                add('Сторінка lifts.html', false, `HTTP ${pageRes.status}`);
                console.log(`  ${fail('Сторінка ' + role.liftPage)} HTTP ${pageRes.status}`);
            }
        } catch (e) {
            add('Сторінка lifts.html', false, e.message);
            console.log(`  ${fail('Сторінка — помилка:')} ${e.message}`);
        }
    } else {
        console.log(`  ${skip('Перевірка сторінки лiftів')} — роль не має доступу до цієї сторінки`);
    }

    return results;
}

// ─── Зведений звіт ───────────────────────────────────────
function printSummary(allResults) {
    console.log(`\n${c.bold}${'═'.repeat(60)}${c.reset}`);
    console.log(`${c.bold}${c.bgBlue}${c.white}  ЗВЕДЕНИЙ ЗВІТ  ${c.reset}`);
    console.log(`${c.bold}${'═'.repeat(60)}${c.reset}\n`);

    let totalPass = 0, totalFail = 0, totalSkip = 0;

    for (const [role, results] of Object.entries(allResults)) {
        const roleInfo = ROLES[role];
        const pass = results.filter(r => r.passed === true).length;
        const fail2 = results.filter(r => r.passed === false).length;
        const skip2 = results.filter(r => r.passed === null).length;
        totalPass += pass; totalFail += fail2; totalSkip += skip2;

        const bar = pass === results.length - skip2 ? `${c.green}●${c.reset}` : fail2 > 0 ? `${c.red}●${c.reset}` : `${c.yellow}●${c.reset}`;
        console.log(`${bar} ${c.bold}${roleInfo.label}${c.reset}  ${c.green}${pass}✅${c.reset}  ${c.red}${fail2}❌${c.reset}  ${c.dim}${skip2}⏭${c.reset}`);
        
        const failedTests = results.filter(r => r.passed === false);
        if (failedTests.length > 0) {
            failedTests.forEach(t => {
                console.log(`   ${c.red}└─ ${t.name}${c.reset}${t.detail ? c.dim + ' — ' + t.detail + c.reset : ''}`);
            });
        }
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`${c.bold}Всього: ${c.green}${totalPass} пройшли${c.reset}  ${c.red}${totalFail} провалились${c.reset}  ${c.dim}${totalSkip} пропущені${c.reset}`);

    const score = totalPass + totalFail > 0
        ? Math.round((totalPass / (totalPass + totalFail)) * 100)
        : 0;
    const scoreColor = score >= 85 ? c.green : score >= 60 ? c.yellow : c.red;
    console.log(`${c.bold}Результат: ${scoreColor}${score}%${c.reset}\n`);

    if (totalFail === 0) {
        console.log(`${c.bgGreen}${c.white}${c.bold}  ✅ ВСІ ТЕСТИ ПРОЙШЛИ  ${c.reset}\n`);
    } else {
        console.log(`${c.bgRed}${c.white}${c.bold}  ❌ Є ПОМИЛКИ — ПЕРЕВІР ВИЩЕ  ${c.reset}\n`);
    }
}

// ─── Запуск ───────────────────────────────────────────────
async function main() {
    const arg = process.argv[2] || 'all';
    const chosen = arg === 'all' ? Object.keys(ROLES) : [arg];

    const invalid = chosen.filter(r => !ROLES[r]);
    if (invalid.length > 0) {
        console.log(fail(`Невідома роль: ${invalid.join(', ')}`));
        console.log(info('Доступні ролі: ' + Object.keys(ROLES).join(' | ') + ' | all'));
        process.exit(1);
    }

    console.log(`\n${c.bold}${c.bgBlue}${c.white}`);
    console.log(`  🔬 СИМУЛЯЦІЯ РОЛЕЙ — ТЕСТ МОДАЛЬНОГО ВІКНА ЛІФТА  `);
    console.log(`${c.reset}${c.dim}  ${new Date().toLocaleString('pt-PT')}  |  ${BASE}${c.reset}\n`);

    // Перевірка сервера
    try {
        const health = await request('GET', '/api/health');
        console.log(`${ok('Сервер доступний')} ${c.dim}status: ${health.body?.status || 'ok'}${c.reset}`);
    } catch (e) {
        console.log(fail(`Сервер недоступний на ${BASE}: ${e.message}`));
        console.log(info('Запустіть: ./autostart.sh'));
        process.exit(1);
    }

    const allResults = {};
    for (const roleKey of chosen) {
        allResults[roleKey] = await runRoleTests(roleKey, ROLES[roleKey]);
    }

    printSummary(allResults);
}

main().catch(e => {
    console.error(fail('Критична помилка: ' + e.message));
    process.exit(1);
});
