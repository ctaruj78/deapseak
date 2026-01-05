#!/usr/bin/env node
/**
 * 🔍 Перевірка використання API endpoints
 * Зіставляє endpoints з unified-server.js та їх використання на сторінках
 */

const fs = require('fs');
const path = require('path');

// Витягуємо всі endpoints з unified-server.js
const serverContent = fs.readFileSync('./unified-server.js', 'utf-8');
const endpointRegex = /app\.(get|post|put|delete)\('(\/api\/[^']+)'/g;
const endpoints = [];
let match;

while ((match = endpointRegex.exec(serverContent)) !== null) {
    endpoints.push({
        method: match[1].toUpperCase(),
        path: match[2],
        pattern: match[2].replace(/:\w+/g, '[^/]+') // Замінюємо :id на regex
    });
}

console.log(`📡 Знайдено ${endpoints.length} API endpoints в unified-server.js\n`);

// Функція для пошуку використання endpoint
function findUsageInFiles(endpoint) {
    const usage = {
        endpoint: endpoint.path,
        method: endpoint.method,
        usedIn: []
    };
    
    const roles = ['admin', 'client', 'tech', 'dispatcher'];
    
    roles.forEach(role => {
        const roleDir = path.join('./pages', role);
        if (!fs.existsSync(roleDir)) return;
        
        const files = fs.readdirSync(roleDir).filter(f => f.endsWith('.html') && !f.includes('.backup'));
        
        files.forEach(file => {
            const filePath = path.join(roleDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            
            // Пошук використання endpoint (з або без параметрів)
            const searchPattern = endpoint.path.replace(/:\w+/g, '');
            if (content.includes(endpoint.path) || content.includes(searchPattern)) {
                usage.usedIn.push(`${role}/${file}`);
            }
        });
    });
    
    return usage;
}

// Групування endpoints за категоріями
const categories = {
    auth: [],
    lifts: [],
    users: [],
    requests: [],
    notifications: [],
    ai: [],
    email: [],
    settings: [],
    orcamentos: [],
    regulations: [],
    other: []
};

endpoints.forEach(ep => {
    const usage = findUsageInFiles(ep);
    const item = { ...ep, usedIn: usage.usedIn };
    
    if (ep.path.includes('/auth/')) categories.auth.push(item);
    else if (ep.path.includes('/lifts')) categories.lifts.push(item);
    else if (ep.path.includes('/users')) categories.users.push(item);
    else if (ep.path.includes('/requests')) categories.requests.push(item);
    else if (ep.path.includes('/notifications')) categories.notifications.push(item);
    else if (ep.path.includes('/ai/')) categories.ai.push(item);
    else if (ep.path.includes('/email/')) categories.email.push(item);
    else if (ep.path.includes('/settings')) categories.settings.push(item);
    else if (ep.path.includes('/orcamentos')) categories.orcamentos.push(item);
    else if (ep.path.includes('/regulations')) categories.regulations.push(item);
    else categories.other.push(item);
});

// Статистика
const stats = {
    total: endpoints.length,
    used: 0,
    unused: 0
};

console.log('═══════════════════════════════════════════════════════════');
console.log('📊 API ENDPOINTS ПО КАТЕГОРІЯХ');
console.log('═══════════════════════════════════════════════════════════\n');

Object.keys(categories).forEach(category => {
    const items = categories[category];
    if (items.length === 0) return;
    
    const used = items.filter(i => i.usedIn.length > 0).length;
    const unused = items.length - used;
    
    stats.used += used;
    stats.unused += unused;
    
    console.log(`\n📁 ${category.toUpperCase()} (${items.length} endpoints)`);
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`✅ Використовуються: ${used}`);
    console.log(`❌ НЕ використовуються: ${unused}\n`);
    
    items.forEach(item => {
        const icon = item.usedIn.length > 0 ? '✅' : '❌';
        const method = item.method.padEnd(6);
        console.log(`  ${icon} ${method} ${item.path}`);
        
        if (item.usedIn.length > 0) {
            item.usedIn.forEach(file => {
                console.log(`     └─ ${file}`);
            });
        }
    });
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('📈 ЗАГАЛЬНА СТАТИСТИКА');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`Всього endpoints: ${stats.total}`);
console.log(`✅ Використовуються: ${stats.used} (${Math.round(stats.used/stats.total*100)}%)`);
console.log(`❌ НЕ використовуються: ${stats.unused} (${Math.round(stats.unused/stats.total*100)}%)`);

// ТОП-5 найбільш використовуваних
console.log('\n═══════════════════════════════════════════════════════════');
console.log('🏆 ТОП-5 НАЙБІЛЬШ ВИКОРИСТОВУВАНИХ ENDPOINTS');
console.log('═══════════════════════════════════════════════════════════\n');

const allEndpoints = Object.values(categories).flat();
const sortedByUsage = allEndpoints
    .filter(e => e.usedIn.length > 0)
    .sort((a, b) => b.usedIn.length - a.usedIn.length)
    .slice(0, 5);

sortedByUsage.forEach((ep, idx) => {
    console.log(`${idx + 1}. ${ep.method} ${ep.path}`);
    console.log(`   Використань: ${ep.usedIn.length}`);
    console.log(`   Файли: ${ep.usedIn.join(', ')}\n`);
});

// Невикористані endpoints
console.log('═══════════════════════════════════════════════════════════');
console.log('⚠️  НЕВИКОРИСТАНІ ENDPOINTS (потенційно можна видалити)');
console.log('═══════════════════════════════════════════════════════════\n');

const unused = allEndpoints.filter(e => e.usedIn.length === 0);
unused.forEach(ep => {
    console.log(`  ❌ ${ep.method.padEnd(6)} ${ep.path}`);
});

console.log(`\n📊 Всього невикористаних: ${unused.length}`);

// Збереження звіту
const report = {
    timestamp: new Date().toISOString(),
    summary: stats,
    categories,
    unused: unused.map(e => ({ method: e.method, path: e.path }))
};

fs.writeFileSync('./api-endpoints-usage-report.json', JSON.stringify(report, null, 2));
console.log('\n📄 Детальний звіт збережено: api-endpoints-usage-report.json\n');
