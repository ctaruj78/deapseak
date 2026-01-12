#!/usr/bin/env node
/**
 * Тест для перевірки проблем з AdminLTE Treeview у всіх HTML сторінках
 * Перевіряє:
 * 1. Виклики Treeview('init') без перевірки наявності плагіна
 * 2. Вбудовані sidebar з проблемними скриптами
 * 3. Відсутні перевірки typeof $.fn.Treeview
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

console.log('🔍 Початок перевірки Treeview issues...\n');

// Знаходимо всі HTML файли в pages/
const htmlFiles = glob.sync('pages/**/*.html', {
    ignore: ['**/backup/**', '**/archive/**', '**/node_modules/**']
});

console.log(`📁 Знайдено ${htmlFiles.length} HTML файлів для перевірки\n`);

let totalIssues = 0;
const issuesReport = [];

// Патерни для пошуку проблем (використовуємо стандартні ASCII символи)
const patterns = {
    treeviewInit: /Treeview\s*\(\s*['"]init['"]\s*\)/g,
    treeviewCheck: /typeof\s+\$\.fn\.Treeview/gi,
    dataWidget: /data-widget=["']treeview["']/g,
    sidebarLoad: /\.load\s*\(\s*["'](includes\/)?sidebar\.html["']\s*\)/g
};

for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    // Нормалізуємо контент для всіх перевірок одразу
    const normalizedContent = content.replace(/\s+/g, ' ');
    const fileIssues = [];
    
    // Шукаємо виклики Treeview('init') в нормалізованому контенті
    const treeviewCalls = normalizedContent.match(patterns.treeviewInit);
    if (treeviewCalls) {
        // Перевіряємо чи є перевірка наявності плагіна (використовуємо match замість test для уникнення проблем з lastIndex)
        const hasCheck = /typeof\s+\$\.fn\.Treeview/.test(normalizedContent);
        
        if (!hasCheck) {
            fileIssues.push({
                type: 'MISSING_CHECK',
                description: `Виклик Treeview('init') БЕЗ перевірки наявності плагіна`,
                count: treeviewCalls.length,
                severity: 'HIGH'
            });
        } else {
            fileIssues.push({
                type: 'HAS_CHECK',
                description: `Виклик Treeview('init') З перевіркою - OK`,
                count: treeviewCalls.length,
                severity: 'OK'
            });
        }
    }
    
    // Перевіряємо чи є data-widget="treeview" (інформація)
    const dataWidgetMatches = content.match(patterns.dataWidget);
    if (dataWidgetMatches) {
        fileIssues.push({
            type: 'INFO',
            description: `Містить data-widget="treeview" атрибути`,
            count: dataWidgetMatches.length,
            severity: 'INFO'
        });
    }
    
    // Перевіряємо чи завантажує sidebar через .load()
    const sidebarLoad = patterns.sidebarLoad.test(content);
    if (sidebarLoad) {
        fileIssues.push({
            type: 'SIDEBAR_LOAD',
            description: `Завантажує sidebar.html динамічно`,
            count: 1,
            severity: 'INFO'
        });
    }
    
    // Якщо є проблеми - додаємо до звіту
    if (fileIssues.length > 0) {
        const highSeverityIssues = fileIssues.filter(i => i.severity === 'HIGH');
        if (highSeverityIssues.length > 0) {
            totalIssues += highSeverityIssues.length;
        }
        
        issuesReport.push({
            file,
            issues: fileIssues
        });
    }
}

// Виводимо звіт
console.log('=' .repeat(80));
console.log('📊 ЗВІТ ПРО ПЕРЕВІРКУ TREEVIEW');
console.log('=' .repeat(80));
console.log();

if (totalIssues === 0) {
    console.log('✅ НЕ ЗНАЙДЕНО КРИТИЧНИХ ПРОБЛЕМ З TREEVIEW!');
    console.log();
} else {
    console.log(`❌ ЗНАЙДЕНО ${totalIssues} КРИТИЧНИХ ПРОБЛЕМ!`);
    console.log();
}

// Групуємо за рівнем проблем
const critical = issuesReport.filter(r => r.issues.some(i => i.severity === 'HIGH'));
const ok = issuesReport.filter(r => r.issues.some(i => i.severity === 'OK'));
const info = issuesReport.filter(r => !r.issues.some(i => i.severity === 'HIGH' || i.severity === 'OK'));

// Критичні проблеми
if (critical.length > 0) {
    console.log('🚨 КРИТИЧНІ ПРОБЛЕМИ (потребують виправлення):');
    console.log('-'.repeat(80));
    critical.forEach(({ file, issues }) => {
        console.log(`\n📄 ${file}`);
        issues.forEach(issue => {
            if (issue.severity === 'HIGH') {
                console.log(`   ❌ ${issue.description} (${issue.count}x)`);
            }
        });
    });
    console.log();
}

// Виправлені файли
if (ok.length > 0) {
    console.log('✅ ФАЙЛИ З ПЕРЕВІРКОЮ (все добре):');
    console.log('-'.repeat(80));
    ok.forEach(({ file, issues }) => {
        const okIssue = issues.find(i => i.severity === 'OK');
        if (okIssue) {
            console.log(`   ✓ ${file}`);
        }
    });
    console.log();
}

// Інформація
if (info.length > 0 && info.length <= 10) {
    console.log('ℹ️  ІНФОРМАЦІЯ (без проблем):');
    console.log('-'.repeat(80));
    info.slice(0, 10).forEach(({ file, issues }) => {
        console.log(`   ℹ️  ${file}`);
        issues.forEach(issue => {
            if (issue.severity === 'INFO') {
                console.log(`      - ${issue.description} (${issue.count}x)`);
            }
        });
    });
    if (info.length > 10) {
        console.log(`   ... та ще ${info.length - 10} файлів`);
    }
    console.log();
}

// Статистика
console.log('=' .repeat(80));
console.log('📈 СТАТИСТИКА:');
console.log('-'.repeat(80));
console.log(`   Всього файлів перевірено: ${htmlFiles.length}`);
console.log(`   Критичних проблем: ${critical.length}`);
console.log(`   Виправлених файлів: ${ok.length}`);
console.log(`   Файлів з data-widget: ${info.length}`);
console.log('=' .repeat(80));

// Рекомендації
if (critical.length > 0) {
    console.log();
    console.log('💡 РЕКОМЕНДАЦІЇ:');
    console.log('-'.repeat(80));
    console.log('   1. Додайте перевірку перед викликом Treeview:');
    console.log('      if (typeof $.fn.Treeview !== \'undefined\') {');
    console.log('          $(\'[data-widget="treeview"]\').Treeview(\'init\');');
    console.log('      }');
    console.log();
    console.log('   2. Або видаліть виклик Treeview якщо є ручні обробники');
    console.log('   3. sidebar.html вже має захист - всі сторінки що завантажують його безпечні');
    console.log('=' .repeat(80));
}

// Exit code
process.exit(totalIssues > 0 ? 1 : 0);
