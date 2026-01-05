#!/usr/bin/env node
/**
 * 🔍 Аудит сторінок з Sidebar меню
 * Перевіряє які сторінки відображаються в меню та їх підключення до БД
 */

const fs = require('fs');
const path = require('path');

// Сторінки з сайдбарів (зібрані вручну з canonical файлів)
const SIDEBAR_PAGES = {
    admin: [
        'admin-dashboard.html',
        'qr-management.html',
        'qr-analytics.html',
        'qr-history.html',
        'lifts.html',
        'requests.html',
        'maps.html',
        'users.html',
        'invoice-template.html',
        'orcamentos-list.html',
        'reports.html',
        'email-template.html',
        'unified-analytics.html',
        'predictive-maintenance.html',
        'ai-assistant-full.html',
        'notifications.html',
        'settings.html'
    ],
    client: [
        'dashboard.html',
        'my-lifts.html',
        'requests.html',
        'history.html',
        'invoices.html',
        'documentation.html',
        'ai-assistant.html',
        'notifications.html',
        'support.html',
        'profile.html'
    ],
    tech: [
        'dashboard.html',
        'tasks.html',
        'schedule.html',
        'manutencao.html',
        'inspections.html',
        'reports.html',
        'qr-scanner.html',
        'ar-helper.html',
        'tools.html',
        'knowledge-base.html',
        'manuals.html',
        'checklists.html',
        'videos.html',
        'ai-assistant.html',
        'support.html'
    ],
    dispatcher: [
        'dashboard.html',
        'monitoring.html',
        'assignments.html',
        'technicians.html',
        'clients.html',
        'qr-management.html',
        'reports.html',
        'ai-assistant.html',
        'settings.html'
    ]
};

function analyzeFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return { exists: false };
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Перевірка на реальне API підключення
    const hasRealAPI = 
        content.includes('fetch(\'/api/') ||
        content.includes('fetch("/api/') ||
        content.includes('AuthManager.fetchWithAuth') ||
        content.includes('axios.get(\'/api/') ||
        content.includes('axios.post(\'/api/');
    
    // Перевірка на demo дані
    const hasDemoData = 
        content.match(/const\s+\w*demo\w*\s*=\s*\[/i) ||
        content.match(/const\s+\w+\s*=\s*\[\s*{[^}]*id:\s*1/i) ||
        content.match(/\/\/\s*Demo\s+data/i) ||
        content.match(/\/\/\s*Mock\s+data/i);
    
    return {
        exists: true,
        hasRealAPI,
        hasDemoData,
        status: hasRealAPI ? '✅ API' : (hasDemoData ? '❌ DEMO' : '⚠️  Немає даних')
    };
}

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 АУДИТ СТОРІНОК З SIDEBAR МЕНЮ');
console.log('═══════════════════════════════════════════════════════════\n');

const results = {
    total: 0,
    withAPI: 0,
    withDemo: 0,
    noData: 0,
    notExists: 0
};

const detailedResults = {};

Object.keys(SIDEBAR_PAGES).forEach(role => {
    const pages = SIDEBAR_PAGES[role];
    const roleResults = [];
    
    console.log(`\n👤 ${role.toUpperCase()} (${pages.length} сторінок у меню)`);
    console.log('─────────────────────────────────────────────────────────────');
    
    pages.forEach(page => {
        const filePath = path.join('./pages', role, page);
        const analysis = analyzeFile(filePath);
        
        results.total++;
        
        if (!analysis.exists) {
            console.log(`  ❓ ${page} - ФАЙЛ НЕ ІСНУЄ!`);
            results.notExists++;
            roleResults.push({ page, status: 'NOT_EXISTS', ...analysis });
        } else if (analysis.hasRealAPI) {
            console.log(`  ✅ ${page} - Підключено до API${analysis.hasDemoData ? ' (+ demo дані)' : ''}`);
            results.withAPI++;
            roleResults.push({ page, status: 'API', ...analysis });
        } else if (analysis.hasDemoData) {
            console.log(`  ❌ ${page} - Тільки DEMO дані`);
            results.withDemo++;
            roleResults.push({ page, status: 'DEMO', ...analysis });
        } else {
            console.log(`  ⚠️  ${page} - Немає підключення до даних`);
            results.noData++;
            roleResults.push({ page, status: 'NO_DATA', ...analysis });
        }
    });
    
    detailedResults[role] = roleResults;
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('📊 ЗАГАЛЬНА СТАТИСТИКА');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`Всього сторінок у меню: ${results.total}`);
console.log(`✅ З реальним API: ${results.withAPI} (${Math.round(results.withAPI/results.total*100)}%)`);
console.log(`❌ З DEMO даними: ${results.withDemo} (${Math.round(results.withDemo/results.total*100)}%)`);
console.log(`⚠️  Без даних: ${results.noData} (${Math.round(results.noData/results.total*100)}%)`);
console.log(`❓ Не існує: ${results.notExists}`);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🎯 ПРІОРИТЕТНІ ЗАВДАННЯ');
console.log('═══════════════════════════════════════════════════════════\n');

// Пріоритет 1: Файли що не існують
const missingFiles = [];
Object.keys(detailedResults).forEach(role => {
    detailedResults[role].forEach(item => {
        if (item.status === 'NOT_EXISTS') {
            missingFiles.push({ role, page: item.page });
        }
    });
});

if (missingFiles.length > 0) {
    console.log(`❗ ПРІОРИТЕТ 1: Відсутні файли (${missingFiles.length})`);
    console.log('   Файли є в меню, але не існують у проекті!\n');
    missingFiles.forEach(item => {
        console.log(`   - ${item.role}/${item.page}`);
    });
}

// Пріоритет 2: Сторінки з DEMO даними
const demoPages = [];
Object.keys(detailedResults).forEach(role => {
    detailedResults[role].forEach(item => {
        if (item.status === 'DEMO') {
            demoPages.push({ role, page: item.page });
        }
    });
});

if (demoPages.length > 0) {
    console.log(`\n❌ ПРІОРИТЕТ 2: Сторінки з DEMO даними (${demoPages.length})`);
    console.log('   Потрібно підключити до реального API:\n');
    demoPages.forEach(item => {
        console.log(`   - ${item.role}/${item.page}`);
    });
}

// Пріоритет 3: Важливі сторінки без даних
const importantNoData = [];
const importantPages = ['dashboard.html', 'profile.html', 'settings.html'];
Object.keys(detailedResults).forEach(role => {
    detailedResults[role].forEach(item => {
        if (item.status === 'NO_DATA' && importantPages.includes(item.page)) {
            importantNoData.push({ role, page: item.page });
        }
    });
});

if (importantNoData.length > 0) {
    console.log(`\n⚠️  ПРІОРИТЕТ 3: Важливі сторінки без даних (${importantNoData.length})`);
    console.log('   Dashboard/Profile/Settings потребують підключення:\n');
    importantNoData.forEach(item => {
        console.log(`   - ${item.role}/${item.page}`);
    });
}

// Статистика по ролях
console.log('\n═══════════════════════════════════════════════════════════');
console.log('📈 СТАТИСТИКА ПО РОЛЯХ');
console.log('═══════════════════════════════════════════════════════════\n');

Object.keys(SIDEBAR_PAGES).forEach(role => {
    const total = SIDEBAR_PAGES[role].length;
    const roleData = detailedResults[role];
    const withAPI = roleData.filter(i => i.status === 'API').length;
    const withDemo = roleData.filter(i => i.status === 'DEMO').length;
    const noData = roleData.filter(i => i.status === 'NO_DATA').length;
    const missing = roleData.filter(i => i.status === 'NOT_EXISTS').length;
    
    const apiPercent = Math.round(withAPI/total*100);
    const bar = '█'.repeat(Math.floor(apiPercent/5));
    
    console.log(`${role.padEnd(12)} │ ${bar.padEnd(20)} ${apiPercent}% (${withAPI}/${total})`);
    if (withDemo > 0) console.log(`              │ ❌ Demo: ${withDemo}`);
    if (noData > 0) console.log(`              │ ⚠️  Немає: ${noData}`);
    if (missing > 0) console.log(`              │ ❓ Відсутні: ${missing}`);
    console.log('');
});

// Збереження звіту
const report = {
    timestamp: new Date().toISOString(),
    summary: results,
    byRole: detailedResults,
    priorities: {
        missing: missingFiles,
        demo: demoPages,
        important: importantNoData
    }
};

fs.writeFileSync('./sidebar-audit-report.json', JSON.stringify(report, null, 2));
console.log('📄 Детальний звіт збережено: sidebar-audit-report.json\n');

console.log('✅ Аудит завершено!\n');
