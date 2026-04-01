#!/usr/bin/env node
/**
 * Діагностика: перевіряє чергування кольорів за адресами ліфтів
 * Запуск: node check-address-colors.js
 */

const http = require('http');

function post(path, data) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const req = http.request({
            hostname: '127.0.0.1', port: 5000, path, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve(JSON.parse(d)));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function get(path, token) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: '127.0.0.1', port: 5000, path, method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
        }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve(JSON.parse(d)));
        });
        req.on('error', reject);
        req.end();
    });
}

// Та сама функція що в lifts.js
function addrKey(lift) {
    const a = lift.address;
    if (a && typeof a === 'object') {
        const parts = [a.street, a.city].filter(Boolean);
        // location може бути GeoJSON {type,coordinates} — не використовуємо як рядок
        return (parts.length ? parts.join(', ') : '').trim().toLowerCase();
    }
    // location може бути GeoJSON або рядок
    const loc = lift.location;
    const locStr = (loc && typeof loc === 'string') ? loc : '';
    return String(a || locStr).trim().toLowerCase();
}

async function main() {
    console.log('=== Діагностика кольорів ліфтів ===\n');

    // 1. Логін
    const login = await post('/api/auth/login', { email: 'info@festlift.pt', password: 'admin123' });
    if (!login.token && !login.data?.token) {
        console.error('❌ Логін не вдався:', login);
        process.exit(1);
    }
    const token = login.token || login.data.token;
    console.log('✅ Логін успішний\n');

    // 2. Отримати ліфти
    const resp = await get('/api/lifts?limit=1000', token);
    const lifts = Array.isArray(resp) ? resp : (resp.lifts || resp.data || []);
    console.log(`✅ Отримано ліфтів: ${lifts.length}\n`);

    if (lifts.length === 0) {
        console.error('❌ API повернув 0 ліфтів — перевірте endpoint /api/lifts');
        process.exit(1);
    }

    // 3. Побудувати мапу груп
    const groupMap = new Map();
    lifts.forEach(l => {
        const k = addrKey(l);
        if (!groupMap.has(k)) groupMap.set(k, groupMap.size);
    });

    console.log(`📊 Унікальних груп адрес: ${groupMap.size}\n`);

    // 4. Показати всі ліфти з їх кольором
    console.log('--- Кольори по ліфтах (останні 20) ---');
    const last20 = lifts.slice(-20);
    last20.forEach(l => {
        const k = addrKey(l);
        const idx = groupMap.get(k);
        const color = idx % 2 === 0 ? '⬜ БІЛИЙ' : '🟦 БЛАКИТНИЙ';
        console.log(`  [${color}] #${l.municipalNumber || l._id} | адреса: "${k}" | група: ${idx}`);
    });

    // 5. Знайти потенційні проблеми
    console.log('\n--- Перевірка проблем ---');
    let problems = 0;

    // Перевірити пагінацію — якщо сторінка показує тільки частину, групи можуть зламатися
    const page1resp = await get('/api/lifts?page=1&limit=10', token);
    const page1lifts = Array.isArray(page1resp) ? page1resp : (page1resp.lifts || page1resp.data || []);
    
    if (page1lifts.length > 0 && page1lifts.length < lifts.length) {
        const pageGroupMap = new Map();
        page1lifts.forEach(l => {
            const k = addrKey(l);
            if (!pageGroupMap.has(k)) pageGroupMap.set(k, pageGroupMap.size);
        });
        console.log(`⚠️  Пагінація активна: сторінка 1 містить ${page1lifts.length} з ${lifts.length} ліфтів`);
        console.log(`   Групи на сторінці 1: ${pageGroupMap.size} (може відрізнятися від загальних груп!)`);
        console.log(`   👉 Саме це і є причина різних кольорів на одній сторінці!`);
        problems++;
    }

    // Перевірити чи є ліфти з порожньою адресою
    const noAddr = lifts.filter(l => !addrKey(l));
    if (noAddr.length > 0) {
        console.log(`⚠️  ${noAddr.length} ліфтів без адреси — всі потраплять в одну групу`);
        noAddr.slice(0, 3).forEach(l => console.log(`   - #${l.municipalNumber || l._id}`));
        problems++;
    }

    if (problems === 0) {
        console.log('✅ Проблем не знайдено — логіка правильна');
        console.log('   Переконайтесь що браузер завантажив новий JS (Ctrl+Shift+R)');
    }

    // 6. Показати реальну структуру адреси першого ліфта
    console.log('\n--- Структура адреси в даних ---');
    const sample = lifts[0];
    console.log('address поле:', JSON.stringify(sample.address));
    console.log('location поле:', JSON.stringify(sample.location));
    console.log('Сформований ключ:', addrKey(sample));
}

main().catch(e => { console.error('Помилка:', e.message); process.exit(1); });
