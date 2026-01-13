#!/usr/bin/env node

/**
 * 🔧 Скрипт для уніфікації sidebar на всіх клієнтських сторінках
 * 
 * Що робить:
 * 1. Читає еталонний sidebar з components/client-sidebar-template.html
 * 2. Знаходить всі HTML файли в pages/client/
 * 3. Замінює старий <aside class="main-sidebar"> на новий
 * 4. Перевіряє чи немає посилань на admin/dispatcher/tech панелі
 * 5. Створює backup перед заміною
 * 
 * Використання:
 *   node unify-client-sidebars.js
 *   node unify-client-sidebars.js --dry-run  (тільки перевірка)
 */

const fs = require('fs').promises;
const path = require('path');

const CLIENT_PAGES_DIR = path.join(__dirname, 'pages', 'client');
const TEMPLATE_FILE = path.join(__dirname, 'components', 'client-sidebar-template.html');
const BACKUP_DIR = path.join(__dirname, 'backup', `sidebar-backup-${Date.now()}`);

const DRY_RUN = process.argv.includes('--dry-run');

// Кольорові виводи
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function readTemplate() {
    try {
        const content = await fs.readFile(TEMPLATE_FILE, 'utf8');
        log(`✅ Прочитано еталонний sidebar (${content.length} символів)`, 'green');
        return content;
    } catch (error) {
        log(`❌ Помилка читання еталону: ${error.message}`, 'red');
        throw error;
    }
}

async function getAllClientPages() {
    const files = await fs.readdir(CLIENT_PAGES_DIR);
    const htmlFiles = files.filter(f => f.endsWith('.html'));
    log(`📄 Знайдено ${htmlFiles.length} HTML файлів`, 'cyan');
    return htmlFiles;
}

async function backupFile(filename) {
    if (DRY_RUN) return;
    
    const sourcePath = path.join(CLIENT_PAGES_DIR, filename);
    const backupPath = path.join(BACKUP_DIR, filename);
    
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    await fs.copyFile(sourcePath, backupPath);
}

function extractSidebar(html) {
    // Знаходимо <aside class="main-sidebar"...> до </aside>
    const sidebarRegex = /<aside\s+class="main-sidebar[^"]*"[^>]*>[\s\S]*?<\/aside>/i;
    const match = html.match(sidebarRegex);
    
    if (!match) {
        return { found: false, sidebar: null, start: -1, end: -1 };
    }
    
    return {
        found: true,
        sidebar: match[0],
        start: match.index,
        end: match.index + match[0].length
    };
}

function checkForCrossPanelLinks(html, filename) {
    const issues = [];
    
    // Перевірка на посилання до admin/dispatcher/tech панелей
    const patterns = [
        { regex: /pages\/admin\//g, type: 'admin' },
        { regex: /pages\/dispatcher\//g, type: 'dispatcher' },
        { regex: /pages\/tech\//g, type: 'technician' }
    ];
    
    patterns.forEach(({ regex, type }) => {
        const matches = html.match(regex);
        if (matches) {
            issues.push({
                file: filename,
                type,
                count: matches.length,
                severity: 'CRITICAL'
            });
        }
    });
    
    return issues;
}

async function processFile(filename, templateSidebar) {
    const filePath = path.join(CLIENT_PAGES_DIR, filename);
    
    log(`\n📝 Обробка: ${filename}`, 'cyan');
    
    // Читаємо файл
    const content = await fs.readFile(filePath, 'utf8');
    
    // Перевіряємо на cross-panel links
    const issues = checkForCrossPanelLinks(content, filename);
    if (issues.length > 0) {
        issues.forEach(issue => {
            log(`  ⚠️ КРИТИЧНО: Знайдено ${issue.count} посилань на ${issue.type} панель!`, 'red');
        });
    }
    
    // Шукаємо існуючий sidebar
    const { found, sidebar, start, end } = extractSidebar(content);
    
    if (!found) {
        log(`  ⚠️ Sidebar не знайдено - пропускаємо`, 'yellow');
        return { status: 'skipped', reason: 'no-sidebar', issues };
    }
    
    log(`  ✓ Знайдено sidebar (${sidebar.length} символів)`, 'gray');
    
    // Порівнюємо з еталоном (без whitespace)
    const oldNormalized = sidebar.replace(/\s+/g, ' ').trim();
    const newNormalized = templateSidebar.replace(/\s+/g, ' ').trim();
    
    if (oldNormalized === newNormalized) {
        log(`  ✅ Sidebar вже актуальний`, 'green');
        return { status: 'up-to-date', issues };
    }
    
    if (DRY_RUN) {
        log(`  🔄 [DRY-RUN] Буде оновлено`, 'yellow');
        return { status: 'will-update', issues };
    }
    
    // Backup
    await backupFile(filename);
    log(`  💾 Backup створено`, 'gray');
    
    // Заміна sidebar
    const newContent = content.substring(0, start) + templateSidebar + content.substring(end);
    
    // Записуємо
    await fs.writeFile(filePath, newContent, 'utf8');
    log(`  ✅ Sidebar оновлено!`, 'green');
    
    return { status: 'updated', issues };
}

async function main() {
    console.log('\n' + '='.repeat(60));
    log('🔧 УНІФІКАЦІЯ SIDEBAR ДЛЯ КЛІЄНТСЬКИХ СТОРІНОК', 'cyan');
    console.log('='.repeat(60));
    
    if (DRY_RUN) {
        log('\n⚠️ РЕЖИМ ТЕСТУВАННЯ (dry-run) - файли не будуть змінені\n', 'yellow');
    }
    
    // 1. Читаємо еталон
    const templateSidebar = await readTemplate();
    
    // 2. Отримуємо список файлів
    const files = await getAllClientPages();
    
    // 3. Обробляємо кожен файл
    const results = {
        updated: [],
        upToDate: [],
        skipped: [],
        willUpdate: [],
        criticalIssues: []
    };
    
    for (const file of files) {
        try {
            const result = await processFile(file, templateSidebar);
            
            if (result.status === 'updated') results.updated.push(file);
            else if (result.status === 'up-to-date') results.upToDate.push(file);
            else if (result.status === 'skipped') results.skipped.push(file);
            else if (result.status === 'will-update') results.willUpdate.push(file);
            
            if (result.issues && result.issues.length > 0) {
                results.criticalIssues.push(...result.issues);
            }
        } catch (error) {
            log(`  ❌ Помилка: ${error.message}`, 'red');
            results.skipped.push(file);
        }
    }
    
    // 4. Звіт
    console.log('\n' + '='.repeat(60));
    log('📊 РЕЗУЛЬТАТИ', 'cyan');
    console.log('='.repeat(60));
    
    log(`\n✅ Оновлено: ${results.updated.length}`, 'green');
    results.updated.forEach(f => log(`   - ${f}`, 'gray'));
    
    if (results.willUpdate.length > 0) {
        log(`\n🔄 Буде оновлено: ${results.willUpdate.length}`, 'yellow');
        results.willUpdate.forEach(f => log(`   - ${f}`, 'gray'));
    }
    
    log(`\n✓ Актуальні: ${results.upToDate.length}`, 'green');
    if (results.upToDate.length > 0 && results.upToDate.length <= 5) {
        results.upToDate.forEach(f => log(`   - ${f}`, 'gray'));
    }
    
    if (results.skipped.length > 0) {
        log(`\n⚠️ Пропущено: ${results.skipped.length}`, 'yellow');
        results.skipped.forEach(f => log(`   - ${f}`, 'gray'));
    }
    
    // Критичні проблеми
    if (results.criticalIssues.length > 0) {
        log(`\n🚨 КРИТИЧНІ ПРОБЛЕМИ: ${results.criticalIssues.length}`, 'red');
        results.criticalIssues.forEach(issue => {
            log(`   ❌ ${issue.file}: ${issue.count} посилань на ${issue.type} панель`, 'red');
        });
    }
    
    // Backup info
    if (!DRY_RUN && results.updated.length > 0) {
        log(`\n💾 Backup збережено в: ${BACKUP_DIR}`, 'cyan');
    }
    
    console.log('\n' + '='.repeat(60));
    log('✅ ГОТОВО!', 'green');
    console.log('='.repeat(60) + '\n');
    
    // Exit code
    if (results.criticalIssues.length > 0) {
        log('⚠️ Знайдено критичні проблеми - перевірте файли вручну!', 'yellow');
        process.exit(1);
    }
}

// Запуск
main().catch(error => {
    log(`\n❌ ФАТАЛЬНА ПОМИЛКА: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
