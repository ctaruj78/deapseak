#!/usr/bin/env node
/**
 * 🔍 Аналізатор сторінок DeapSeaK
 * Перевіряє які сторінки підключені до реального API/MongoDB
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = './pages';
const ROLES = ['admin', 'client', 'tech', 'dispatcher'];

const results = {
    realAPI: [],      // Сторінки з реальним API
    demoData: [],     // Сторінки з demo даними
    noData: [],       // Сторінки без підключення
    backup: [],       // Backup файли
    total: 0
};

function analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    
    // Пропускаємо backup файли
    if (fileName.includes('.backup')) {
        results.backup.push(filePath);
        return;
    }
    
    results.total++;
    
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
    
    if (hasRealAPI) {
        results.realAPI.push({
            path: filePath,
            file: fileName,
            hasDemo: !!hasDemoData
        });
    } else if (hasDemoData) {
        results.demoData.push({
            path: filePath,
            file: fileName
        });
    } else {
        results.noData.push({
            path: filePath,
            file: fileName
        });
    }
}

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            scanDirectory(fullPath);
        } else if (file.endsWith('.html')) {
            analyzeFile(fullPath);
        }
    });
}

// Сканування всіх ролей
console.log('🔍 Аналіз сторінок DeapSeaK...\n');

ROLES.forEach(role => {
    const roleDir = path.join(PAGES_DIR, role);
    if (fs.existsSync(roleDir)) {
        console.log(`📂 Сканування ${role}/...`);
        scanDirectory(roleDir);
    }
});

// Виведення результатів
console.log('\n═══════════════════════════════════════════════════════════');
console.log('📊 РЕЗУЛЬТАТИ АНАЛІЗУ');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`✅ СТОРІНКИ З РЕАЛЬНИМ API (${results.realAPI.length}):`);
console.log('─────────────────────────────────────────────────────────────');
results.realAPI.forEach(item => {
    const warning = item.hasDemo ? ' ⚠️  (також має demo дані!)' : '';
    console.log(`  ✓ ${item.path}${warning}`);
});

console.log(`\n❌ СТОРІНКИ З DEMO ДАНИМИ (${results.demoData.length}):`);
console.log('─────────────────────────────────────────────────────────────');
results.demoData.forEach(item => {
    console.log(`  × ${item.path}`);
});

console.log(`\n⚠️  СТОРІНКИ БЕЗ ПІДКЛЮЧЕННЯ (${results.noData.length}):`);
console.log('─────────────────────────────────────────────────────────────');
results.noData.forEach(item => {
    console.log(`  ? ${item.path}`);
});

console.log(`\n📦 BACKUP ФАЙЛІВ: ${results.backup.length}`);

console.log('\n═══════════════════════════════════════════════════════════');
console.log(`📈 СТАТИСТИКА:`);
console.log('═══════════════════════════════════════════════════════════');
console.log(`Всього активних сторінок: ${results.total}`);
console.log(`Реальне API: ${results.realAPI.length} (${Math.round(results.realAPI.length/results.total*100)}%)`);
console.log(`Demo дані: ${results.demoData.length} (${Math.round(results.demoData.length/results.total*100)}%)`);
console.log(`Без даних: ${results.noData.length} (${Math.round(results.noData.length/results.total*100)}%)`);
console.log(`Backup: ${results.backup.length}`);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🎯 РЕКОМЕНДАЦІЇ:');
console.log('═══════════════════════════════════════════════════════════');

if (results.demoData.length > 0) {
    console.log(`\n⚠️  Знайдено ${results.demoData.length} сторінок з DEMO даними!`);
    console.log('   Потрібно підключити до реального API:');
    results.demoData.slice(0, 5).forEach(item => {
        console.log(`   - ${item.file}`);
    });
    if (results.demoData.length > 5) {
        console.log(`   ... та ще ${results.demoData.length - 5} сторінок`);
    }
}

if (results.noData.length > 0) {
    console.log(`\n❓ Знайдено ${results.noData.length} сторінок без даних`);
    console.log('   Перевірте чи вони використовуються або видаліть');
}

if (results.realAPI.some(item => item.hasDemo)) {
    console.log('\n⚠️  УВАГА: Деякі сторінки мають і API, і demo дані!');
    console.log('   Видаліть demo дані для чистоти коду');
}

console.log('\n✅ Аналіз завершено!\n');

// Збереження звіту
const report = {
    timestamp: new Date().toISOString(),
    summary: {
        total: results.total,
        realAPI: results.realAPI.length,
        demoData: results.demoData.length,
        noData: results.noData.length,
        backup: results.backup.length
    },
    details: results
};

fs.writeFileSync('./pages-analysis-report.json', JSON.stringify(report, null, 2));
console.log('📄 Детальний звіт збережено: pages-analysis-report.json\n');
