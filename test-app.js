/**
 * FestLift — Скрипт повного тестування додатку
 * Запуск: node test-app.js [--token=<jwt>]
 * Якщо токен не переданий — генерується через JWT_SECRET з .env
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const jwt = require('jsonwebtoken');

const BASE = 'http://localhost:5000';

// Підтримка --token=xxx як аргументу
const argToken = process.argv.find(a => a.startsWith('--token='));
let token = argToken ? argToken.slice(8) : null;

// Якщо токен не переданий — генеруємо самостійно (обхід rate limiter)
if (!token && process.env.JWT_SECRET) {
    token = jwt.sign(
        { id: '69bc17625e7557326f4ac81e', role: 'admin', username: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
}
let createdLiftId = null;
let createdUserId = null;
let createdRequestId = null;
let createdInspectionId = null;
let createdKbId = null;
let createdOrcId = null;

// ── helpers ───────────────────────────────────────────────────────────────────

const c = {
    green:  s => `\x1b[32m${s}\x1b[0m`,
    red:    s => `\x1b[31m${s}\x1b[0m`,
    yellow: s => `\x1b[33m${s}\x1b[0m`,
    cyan:   s => `\x1b[36m${s}\x1b[0m`,
    bold:   s => `\x1b[1m${s}\x1b[0m`,
};

let passed = 0, failed = 0, skipped = 0;
const failures = [];

async function req(method, path, body, auth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && token) headers['Authorization'] = `Bearer ${token}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    try {
        const res = await fetch(`${BASE}${path}`, opts);
        let data;
        try { data = await res.json(); } catch { data = {}; }
        return { status: res.status, ok: res.ok, data };
    } catch (e) {
        return { status: 0, ok: false, data: {}, error: e.message };
    }
}

function test(name, passed_bool, detail = '') {
    if (passed_bool) {
        console.log(`  ${c.green('✓')} ${name}`);
        passed++;
    } else {
        console.log(`  ${c.red('✗')} ${name}${detail ? ' — ' + detail : ''}`);
        failed++;
        failures.push(`${name}${detail ? ': ' + detail : ''}`);
    }
}

function skip(name, reason) {
    console.log(`  ${c.yellow('–')} ${name} (пропущено: ${reason})`);
    skipped++;
}

function section(title) {
    console.log(`\n${c.bold(c.cyan('══ ' + title + ' ══'))}`);
}

// ── tests ────────────────────────────────────────────────────────────────────

async function testHealth() {
    section('1. Сервер та здоров\'я');
    const r = await req('GET', '/api/health', null, false);
    test('GET /api/health → 200', r.status === 200);
    test('health.status = ok', r.data?.status === 'ok' || r.data?.success === true);
}

async function testAuth() {
    section('2. Аутентифікація');

    // Хибний логін
    const bad = await req('POST', '/api/auth/login', { login: 'nobody', password: 'wrong' }, false);
    test('POST /api/auth/login (невірні дані) → 400/401/429', bad.status === 400 || bad.status === 401 || bad.status === 429);

    // Правильний логін (може бути заблокований rate limiter)
    const good = await req('POST', '/api/auth/login', { login: 'admin', password: 'admin123' }, false);
    if (good.status === 429) {
        skip('POST /api/auth/login (admin) → 200', 'rate limiter активний');
        skip('login повертає token', 'rate limiter активний');
    } else {
        test('POST /api/auth/login (admin) → 200', good.status === 200);
        const loginToken = good.data?.token || good.data?.data?.token || good.token;
        test('login повертає token', !!loginToken);
        if (loginToken) token = loginToken;
    }

    // Перевірка поточного юзера (використовує pre-generated token якщо login не спрацював)
    const me = await req('GET', '/api/users/me');
    test('GET /api/users/me → 200', me.status === 200);
    test('me.role = admin', me.data?.role === 'admin' || me.data?.data?.role === 'admin');

    // Heartbeat
    const hb = await req('POST', '/api/auth/heartbeat');
    test('POST /api/auth/heartbeat → 200', hb.status === 200);

    // Auth status
    const st = await req('GET', '/api/auth/status');
    test('GET /api/auth/status → 200', st.status === 200);
}

async function testUsers() {
    section('3. Користувачі');

    const list = await req('GET', '/api/users');
    test('GET /api/users → 200', list.status === 200);
    const users = list.data?.data || list.data?.users || list.data || [];
    test('список юзерів непорожній', Array.isArray(users) && users.length > 0);

    // Створити юзера
    const ts = Date.now();
    const created = await req('POST', '/api/users', {
        username: `test_${ts}`,
        email: `test_${ts}@festlift.test`,
        password: 'Test1234!',
        firstName: 'Тест',
        lastName: 'Юзер',
        role: 'technician'
    });
    test('POST /api/users → 201', created.status === 201);
    createdUserId = created.data?.data?._id || created.data?._id || created.data?.id;
    test('новий юзер має _id', !!createdUserId);

    // Отримати юзера
    if (createdUserId) {
        const one = await req('GET', `/api/users/${createdUserId}`);
        test(`GET /api/users/:id → 200`, one.status === 200);
    }

    // Технічники
    const techs = await req('GET', '/api/users/technicians');
    test('GET /api/users/technicians → 200', techs.status === 200);

    // Видалити тестового юзера
    if (createdUserId) {
        const del = await req('DELETE', `/api/users/${createdUserId}`);
        test('DELETE /api/users/:id → 200', del.status === 200 || del.status === 204);
    }
}

async function testLifts() {
    section('4. Ліфти');

    // Список
    const list = await req('GET', '/api/lifts?limit=5');
    test('GET /api/lifts → 200', list.status === 200);
    const lifts = list.data?.data?.lifts || list.data?.lifts || list.data?.data || [];
    test('список ліфтів непорожній', Array.isArray(lifts) && lifts.length > 0);

    // Статистика
    const stats = await req('GET', '/api/lifts/stats');
    test('GET /api/lifts/stats → 200', stats.status === 200);

    // Створити ліфт
    const newLift = await req('POST', '/api/lifts', {
        municipalNumber: `TEST-${Date.now()}`,
        type: 'passenger',
        liftSubtype: 'public',
        address: {
            street: 'Rua de Teste nº 1, Lisboa',
            zipCode: '1000-001',
            city: 'Lisboa',
            country: 'Portugal'
        },
        clientEmail: 'test@festlift.test',
        clientName: 'Teste Automático',
        inspectionFrequency: 6,
        status: 'active'
    });
    test('POST /api/lifts → 200/201', newLift.status === 200 || newLift.status === 201);
    createdLiftId = newLift.data?.data?._id || newLift.data?.lift?._id || newLift.data?._id;
    test('novo ліфт має _id', !!createdLiftId);

    // Отримати ліфт
    if (createdLiftId) {
        const one = await req('GET', `/api/lifts/${createdLiftId}`);
        test('GET /api/lifts/:id → 200', one.status === 200);

        // Оновити ліфт
        const upd = await req('PUT', `/api/lifts/${createdLiftId}`, { clientName: 'Teste Atualizado' });
        test('PUT /api/lifts/:id → 200', upd.status === 200);

        // Histórico
        const hist = await req('GET', `/api/lifts/${createdLiftId}/history`);
        test('GET /api/lifts/:id/history → 200', hist.status === 200);
    }
}

async function testRequests() {
    section('5. Pedidos de manutenção');

    const list = await req('GET', '/api/requests?limit=5');
    test('GET /api/requests → 200', list.status === 200);

    const stats = await req('GET', '/api/requests/stats');
    test('GET /api/requests/stats → 200', stats.status === 200);

    if (createdLiftId) {
        const created = await req('POST', '/api/requests', {
            liftId: createdLiftId,
            type: 'maintenance',
            priority: 'normal',
            description: 'Teste automático de pedido de manutenção',
            reportedBy: 'Sistema de testes'
        });
        test('POST /api/requests → 200/201', created.status === 200 || created.status === 201);
        createdRequestId = created.data?.data?._id || created.data?._id;
        test('novo pedido tem _id', !!createdRequestId);

        if (createdRequestId) {
            const one = await req('GET', `/api/requests/${createdRequestId}`);
            test('GET /api/requests/:id → 200', one.status === 200);

            const comment = await req('POST', `/api/requests/${createdRequestId}/comment`, {
                text: 'Comentário de teste automático'
            });
            test('POST /api/requests/:id/comment → 200/201', comment.status === 200 || comment.status === 201);
        }
    } else {
        skip('POST /api/requests', 'sem liftId');
    }
}

async function testInspections() {
    section('6. Inspecções');

    const list = await req('GET', '/api/inspections?limit=5');
    test('GET /api/inspections → 200', list.status === 200);

    const nextNum = await req('GET', '/api/inspections/next-number');
    test('GET /api/inspections/next-number → 200', nextNum.status === 200);

    if (createdLiftId) {
        const created = await req('POST', '/api/inspections', {
            liftId: createdLiftId,
            date: new Date().toISOString().split('T')[0],
            type: 'periodic',
            result: 'approved',
            inspector: 'Inspetor de Teste',
            notes: 'Inspecção de teste automático'
        });
        test('POST /api/inspections → 200/201', created.status === 200 || created.status === 201);
        createdInspectionId = created.data?.data?._id || created.data?._id || created.data?.inspection?._id || created.data?.inspection?.id;
        test('nova inspecção tem _id', !!createdInspectionId);

        if (createdInspectionId) {
            const one = await req('GET', `/api/inspections/${createdInspectionId}`);
            test('GET /api/inspections/:id → 200', one.status === 200);
        }
    } else {
        skip('POST /api/inspections', 'sem liftId');
    }
}

async function testQR() {
    section('7. QR Codes');

    const codes = await req('GET', '/api/qr/codes?limit=5');
    test('GET /api/qr/codes → 200', codes.status === 200);

    const history = await req('GET', '/api/qr/history?limit=10');
    test('GET /api/qr/history → 200', history.status === 200);

    const qrStats = await req('GET', '/api/qr/stats');
    test('GET /api/qr/stats → 200', qrStats.status === 200);

    if (createdLiftId) {
        const scan = await req('POST', '/api/qr/scan', {
            liftId: createdLiftId,
            action: 'scan',
            qrCode: `TEST-${createdLiftId}`
        });
        test('POST /api/qr/scan → 200/201', scan.status === 200 || scan.status === 201);
    } else {
        skip('POST /api/qr/scan', 'sem liftId');
    }
}

async function testKnowledgeBase() {
    section('8. Base de Conhecimento');

    const list = await req('GET', '/api/knowledge-base');
    test('GET /api/knowledge-base → 200', list.status === 200);

    const all = await req('GET', '/api/knowledge-base/all');
    test('GET /api/knowledge-base/all → 200', all.status === 200);
    const articles = all.data?.data || all.data?.articles || all.data || [];
    test('base de conhecimento não vazia', Array.isArray(articles) && articles.length > 0);

    const created = await req('POST', '/api/knowledge-base', {
        title: 'Artigo de Teste Automático',
        category: 'manutencao',
        content: 'Conteúdo de teste automático para verificar o funcionamento da base de conhecimento.',
        tags: ['teste', 'automático'],
        published: true
    });
    test('POST /api/knowledge-base → 201', created.status === 201);
    createdKbId = created.data?.id || created.data?.data?._id;
    test('novo artigo tem id', !!createdKbId);

    if (createdKbId) {
        const one = await req('GET', `/api/knowledge-base/${createdKbId}`);
        test('GET /api/knowledge-base/:id → 200', one.status === 200);

        const upd = await req('PUT', `/api/knowledge-base/${createdKbId}`, {
            title: 'Artigo de Teste Atualizado',
            category: 'manutencao',
            content: 'Conteúdo atualizado.'
        });
        test('PUT /api/knowledge-base/:id → 200', upd.status === 200);

        const del = await req('DELETE', `/api/knowledge-base/${createdKbId}`);
        test('DELETE /api/knowledge-base/:id → 200', del.status === 200 || del.status === 204);
    }
}

async function testOrcamentos() {
    section('9. Orçamentos');

    const list = await req('GET', '/api/orcamentos?limit=5');
    test('GET /api/orcamentos → 200', list.status === 200);

    const nextNum = await req('GET', '/api/orcamentos/next-number');
    test('GET /api/orcamentos/next-number → 200', nextNum.status === 200);

    const created = await req('POST', '/api/orcamentos', {
        cliente: { nome: 'Cliente Teste', email: 'teste@festlift.test', morada: 'Rua de Teste, 1, Lisboa', telefone: '+351900000001' },
        servicos: [{ descricao: 'Serviço de manutenção', quantidade: 1, precoUnitario: 150, total: 150 }],
        subtotal: 150,
        iva: 0,
        total: 150,
        notas: 'Orçamento de teste automático'
    });
    test('POST /api/orcamentos → 200/201', created.status === 200 || created.status === 201);
    createdOrcId = created.data?.data?._id || created.data?._id || created.data?.orcamento?._id;
    test('novo orçamento tem _id', !!createdOrcId, created.data?.message || '');

    if (createdOrcId) {
        const one = await req('GET', `/api/orcamentos/${createdOrcId}`);
        test('GET /api/orcamentos/:id → 200', one.status === 200);

        const statusUpd = await req('PATCH', `/api/orcamentos/${createdOrcId}/status`, { status: 'enviado' });
        test('PATCH /api/orcamentos/:id/status → 200', statusUpd.status === 200);

        const del = await req('DELETE', `/api/orcamentos/${createdOrcId}`);
        test('DELETE /api/orcamentos/:id → 200', del.status === 200 || del.status === 204);
    }
}

async function testMunicipalities() {
    section('10. Municípios');

    const list = await req('GET', '/api/municipalities');
    test('GET /api/municipalities → 200', list.status === 200);

    const comms = await req('GET', '/api/municipalities/communications');
    test('GET /api/municipalities/communications → 200', comms.status === 200);

    const stats = await req('GET', '/api/municipalities/stats');
    test('GET /api/municipalities/stats → 200', stats.status === 200);
}

async function testAnalytics() {
    section('11. Analytics & Dashboard');

    const dashboard = await req('GET', '/api/dashboard');
    test('GET /api/dashboard → 200', dashboard.status === 200);

    const analytics = await req('GET', '/api/analytics/dashboard');
    test('GET /api/analytics/dashboard → 200', analytics.status === 200);

    const statistics = await req('GET', '/api/statistics');
    test('GET /api/statistics → 200', statistics.status === 200);
}

async function testSettings() {
    section('12. Configurações');

    const get = await req('GET', '/api/settings');
    test('GET /api/settings → 200', get.status === 200);

    const upd = await req('PUT', '/api/settings', { companyName: 'FestLift Teste' });
    test('PUT /api/settings → 200', upd.status === 200);
}

async function testNotifications() {
    section('13. Notificações');

    const list = await req('GET', '/api/notifications');
    test('GET /api/notifications → 200', list.status === 200);

    const readAll = await req('PATCH', '/api/notifications/read-all');
    test('PATCH /api/notifications/read-all → 200', readAll.status === 200);
}

async function testAI() {
    section('14. IA (health check)');

    const health = await req('GET', '/api/ai/health');
    test('GET /api/ai/health → 200', health.status === 200);
    test('IA provider configurado', !!health.data?.provider || health.data?.status === 'ok' || health.data?.success === true);
}

async function testCleanup() {
    section('15. Limpeza (remoção de dados de teste)');

    // Remove lift (cascades requests, inspections)
    if (createdLiftId) {
        const del = await req('DELETE', `/api/lifts/${createdLiftId}`);
        test('DELETE /api/lifts/:id (cleanup) → 200/204', del.status === 200 || del.status === 204);
    }

    // Remove inspection if still exists
    if (createdInspectionId) {
        const del = await req('DELETE', `/api/inspections/${createdInspectionId}`);
        test('DELETE /api/inspections/:id (cleanup) → 200/204', del.status === 200 || del.status === 204 || del.status === 404);
    }

    // Remove request if still exists
    if (createdRequestId) {
        const del = await req('DELETE', `/api/requests/${createdRequestId}`);
        test('DELETE /api/requests/:id (cleanup) → 200/204', del.status === 200 || del.status === 204 || del.status === 404);
    }
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log(c.bold('\n🧪 FestLift — Тест повного додатку'));
    console.log(`   Server: ${BASE}`);
    console.log(`   Data:   ${new Date().toLocaleString('pt-PT')}\n`);

    if (token) {
        console.log(`   Token:  ${c.green('pre-generated via JWT_SECRET')}`);
    }

    await testHealth();
    await testAuth();

    if (!token) {
        console.log(c.red('\n❌ Немає токена — решта тестів скасована\n'));
        process.exit(1);
    }

    await testUsers();
    await testLifts();
    await testRequests();
    await testInspections();
    await testQR();
    await testKnowledgeBase();
    await testOrcamentos();
    await testMunicipalities();
    await testAnalytics();
    await testSettings();
    await testNotifications();
    await testAI();
    await testCleanup();

    // ── Summary ────────────────────────────────────────────────────────────────
    const total = passed + failed + skipped;
    console.log('\n' + '═'.repeat(50));
    console.log(c.bold('📊 Результати:'));
    console.log(`   ${c.green('Passed:')}  ${passed}/${total}`);
    if (failed > 0) console.log(`   ${c.red('Failed:')}  ${failed}`);
    if (skipped > 0) console.log(`   ${c.yellow('Skipped:')} ${skipped}`);

    if (failures.length > 0) {
        console.log(`\n${c.red('❌ Провалені тести:')}`);
        failures.forEach(f => console.log(`   • ${f}`));
    }

    const pct = Math.round((passed / (passed + failed)) * 100);
    console.log(`\n${pct >= 90 ? c.green('✅') : pct >= 70 ? c.yellow('⚠️') : c.red('❌')} ${c.bold(`Оцінка: ${pct}%`)}\n`);

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(c.red('FATAL: ' + e.message)); process.exit(1); });
