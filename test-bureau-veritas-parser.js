#!/usr/bin/env node

/**
 * 🧪 ТЕСТ ПАРСЕРА BUREAU VERITAS
 * 
 * Використання:
 *   node test-bureau-veritas-parser.js <path-to-pdf>
 * 
 * Приклад:
 *   node test-bureau-veritas-parser.js ./uploads/inspection-report.pdf
 */

const { parseBureauVeritasPDF } = require('./services/pdf-parser-bureau-veritas');
const path = require('path');

// Кольори для консолі
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function print(text, color = 'reset') {
    console.log(colors[color] + text + colors.reset);
}

function printBox(title, content) {
    const width = 70;
    const line = '═'.repeat(width);
    
    console.log('\n' + colors.cyan + '╔' + line + '╗' + colors.reset);
    console.log(colors.cyan + '║' + colors.reset + colors.bright + 
                title.padEnd(width) + colors.reset + colors.cyan + '║' + colors.reset);
    console.log(colors.cyan + '╠' + line + '╣' + colors.reset);
    
    content.split('\n').forEach(line => {
        console.log(colors.cyan + '║ ' + colors.reset + line.padEnd(width - 1) + colors.cyan + '║' + colors.reset);
    });
    
    console.log(colors.cyan + '╚' + line + '╝' + colors.reset);
}

async function testParser(filePath) {
    try {
        print('\n🧪 ТЕСТУВАННЯ ПАРСЕРА BUREAU VERITAS', 'bright');
        print('═'.repeat(70), 'cyan');
        
        // Перевірка файлу
        if (!filePath) {
            print('❌ Будь ласка, вкажіть шлях до PDF файлу', 'red');
            print('\nВикористання: node test-bureau-veritas-parser.js <path-to-pdf>', 'yellow');
            process.exit(1);
        }
        
        const fs = require('fs');
        if (!fs.existsSync(filePath)) {
            print(`❌ Файл не знайдено: ${filePath}`, 'red');
            process.exit(1);
        }
        
        print(`\n📄 Файл: ${path.basename(filePath)}`, 'blue');
        print(`📁 Шлях: ${path.resolve(filePath)}`, 'blue');
        
        // Парсинг
        print('\n⏳ Парсинг PDF...', 'yellow');
        const startTime = Date.now();
        
        const result = await parseBureauVeritasPDF(filePath);
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        print(`✅ Завершено за ${duration}s`, 'green');
        
        if (!result.success) {
            print('\n❌ ПОМИЛКА ПАРСИНГУ', 'red');
            print(result.error, 'red');
            process.exit(1);
        }
        
        // Результати
        print('\n' + '═'.repeat(70), 'cyan');
        print('📊 РЕЗУЛЬТАТИ АНАЛІЗУ', 'bright');
        print('═'.repeat(70), 'cyan');
        
        // Статус
        const statusIcon = result.passed ? '✅' : '❌';
        const statusColor = result.passed ? 'green' : 'red';
        print(`\n${statusIcon} ВИСНОВОК: ${result.conclusion.status}`, statusColor);
        print(`   ${result.conclusion.reason}`, statusColor);
        
        // Статистика
        printBox('📈 СТАТИСТИКА ПОРУШЕНЬ', 
            `Всього:     ${result.stats.total}\n` +
            `C1 (КРИТИЧНІ):  ${result.stats.critical}\n` +
            `C2 (СЕРЕДНІ):   ${result.stats.medium}\n` +
            `C3 (ЛЕГКІ):     ${result.stats.low}`
        );
        
        // Метадані
        if (result.metadata) {
            let metadataText = '';
            if (result.metadata.reportNumber) metadataText += `Номер звіту:    ${result.metadata.reportNumber}\n`;
            if (result.metadata.date) metadataText += `Дата:           ${result.metadata.date}\n`;
            if (result.metadata.liftId) metadataText += `ID ліфту:       ${result.metadata.liftId}\n`;
            if (result.metadata.installationNumber) metadataText += `№ установки:    ${result.metadata.installationNumber}\n`;
            if (result.metadata.processNumber) metadataText += `№ процесу:      ${result.metadata.processNumber}\n`;
            if (result.metadata.inspector) metadataText += `Інспектор:      ${result.metadata.inspector}\n`;
            if (result.metadata.company) metadataText += `Компанія:       ${result.metadata.company}\n`;
            if (result.metadata.maintenanceCompany) metadataText += `Обслуговування: ${result.metadata.maintenanceCompany}\n`;
            if (result.metadata.owner) metadataText += `Власник:        ${result.metadata.owner}\n`;
            if (result.metadata.location) {
                const location = result.metadata.location.length > 50 
                    ? result.metadata.location.substring(0, 47) + '...'
                    : result.metadata.location;
                metadataText += `Локація:        ${location}`;
            }
            
            if (metadataText) {
                printBox('ℹ️  МЕТАДАНІ', metadataText.trim());
            }
        }
        
        // Порушення
        if (result.violations && result.violations.length > 0) {
            print('\n' + '═'.repeat(70), 'cyan');
            print('⚠️  ВИЯВЛЕНІ ПОРУШЕННЯ', 'yellow');
            print('═'.repeat(70), 'cyan');
            
            result.violations.forEach((violation, index) => {
                const badge = {
                    'C1': { symbol: '🔴', text: 'КРИТИЧНЕ', color: 'red' },
                    'C2': { symbol: '🟡', text: 'СЕРЕДНЄ', color: 'yellow' },
                    'C3': { symbol: '🟢', text: 'ЛЕГКЕ', color: 'blue' }
                }[violation.classification] || { symbol: '⚪', text: 'НЕВІДОМО', color: 'reset' };
                
                print(`\n${index + 1}. ${badge.symbol} ${violation.classification} - ${badge.text}`, badge.color);
                print(`   📜 Артикул: ${violation.article}`, 'cyan');
                
                const desc = violation.description.length > 100
                    ? violation.description.substring(0, 97) + '...'
                    : violation.description;
                print(`   📝 ${desc}`, 'reset');
                
                if (violation.articleInfo) {
                    print(`   ⏰ Термін: ${violation.articleInfo.urgency}`, 'yellow');
                }
            });
        } else {
            print('\n✅ Порушень не виявлено!', 'green');
        }
        
        // Додаткова інформація
        print('\n' + '═'.repeat(70), 'cyan');
        print('📄 ДОДАТКОВА ІНФОРМАЦІЯ', 'bright');
        print('═'.repeat(70), 'cyan');
        print(`Тип звіту:      ${result.reportType}`, 'blue');
        print(`Кількість сторінок: ${result.pageCount}`, 'blue');
        print(`Символів тексту:    ${result.rawText ? result.rawText.length : 'N/A'}`, 'blue');
        
        // JSON експорт
        print('\n' + '═'.repeat(70), 'cyan');
        print('💾 ЕКСПОРТ JSON', 'bright');
        print('═'.repeat(70), 'cyan');
        
        const jsonOutput = {
            success: result.success,
            reportType: result.reportType,
            passed: result.passed,
            conclusion: result.conclusion,
            stats: result.stats,
            metadata: result.metadata,
            violations: result.violations.map(v => ({
                classification: v.classification,
                article: v.article,
                description: v.description,
                urgency: v.articleInfo?.urgency
            }))
        };
        
        const outputFile = filePath.replace('.pdf', '-analysis.json');
        fs.writeFileSync(outputFile, JSON.stringify(jsonOutput, null, 2));
        print(`✅ Збережено: ${outputFile}`, 'green');
        
        // Фінальний висновок
        print('\n' + '═'.repeat(70), 'cyan');
        if (result.passed) {
            print('🎉 ЛІФТ СХВАЛЕНО! Інспекція пройшла успішно.', 'green');
            if (result.stats.low > 0) {
                print(`⚠️  Виправте ${result.stats.low} легких порушень до наступної інспекції`, 'yellow');
            }
        } else {
            print('⚠️  ЛІФТ НЕ СХВАЛЕНО! Потрібні виправлення.', 'red');
            if (result.stats.critical > 0) {
                print(`🚨 УВАГА: ${result.stats.critical} критичних порушень - негайна дія!`, 'red');
            }
            if (result.stats.medium > 0) {
                print(`⚠️  ${result.stats.medium} середніх порушень - виправити протягом 30 днів`, 'yellow');
            }
        }
        print('═'.repeat(70), 'cyan');
        
    } catch (error) {
        print('\n❌ КРИТИЧНА ПОМИЛКА', 'red');
        print(error.message, 'red');
        console.error(error);
        process.exit(1);
    }
}

// Запуск тесту
const pdfPath = process.argv[2];
testParser(pdfPath);
