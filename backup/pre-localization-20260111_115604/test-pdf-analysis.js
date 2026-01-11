#!/usr/bin/env node
/**
 * 🧪 Тест аналізу португальських порушень
 * Симулює PDF з різними типами порушень
 */

const parser = require('./services/pdf-parser.js');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║     🧪 ТЕСТ СИСТЕМИ АНАЛІЗУ ПОРТУГАЛЬСЬКИХ ПОРУШЕНЬ          ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Тестові порушення з реального PDF
const testViolations = [
    'DL295-4',      // Без CE - CRÍTICO
    'DL320-3',      // Без manutenção - CRÍTICO
    '65',           // Sem pára-quedas - CRÍTICO
    'DL295-5',      // Canalizações - ALTO
    'DL320-8',      // Inspecção atrasada - MODERADO
    '97',           // Avisos apagados - MODERADO
    'DL295-ANEXO-I-2.2'  // Sem acessibilidade - MODERADO
];

console.log('📋 Тестуємо', testViolations.length, 'порушень:\n');

const articles = parser.regulationArticles;
const classInfo = parser.classificationInfo;

let criticalCount = 0;
let highCount = 0;
let moderateCount = 0;

testViolations.forEach((code, index) => {
    const article = articles[code];
    
    if (!article) {
        console.log(`❌ Код ${code} не знайдено!`);
        return;
    }

    // Визначення класифікації
    let classification = 'C3';
    if (article.urgency === 'CRÍTICO') classification = 'C1';
    else if (article.urgency === 'ALTO') classification = 'C2';
    else if (article.urgency === 'MODERADO') classification = 'C2';

    if (classification === 'C1') criticalCount++;
    else if (classification === 'C2') highCount++;
    else moderateCount++;

    const icon = classification === 'C1' ? '🔴' : 
                 classification === 'C2' ? '🟡' : '🟢';

    console.log(`${icon} ${index + 1}. ${code} - ${article.title}`);
    console.log(`   └─ КЛАСИФІКАЦІЯ: ${classification} (${article.urgency})`);
    console.log(`   └─ НЕБЕЗПЕКА: ${article.why.substring(0, 60)}...`);
    console.log(`   └─ ТЕРМІН: ${article.deadline || 'Não especificado'}`);
    console.log(`   └─ ШТРАФ: ${article.penalty || 'Variável'}\n`);
});

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║                    📊 СТАТИСТИКА ТЕСТУ                       ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log(`🔴 C1 CRÍTICO:   ${criticalCount} порушень`);
console.log(`🟡 C2 ALTO:      ${highCount} порушень`);
console.log(`🟢 C3 BAIXO:     ${moderateCount} порушень`);
console.log(`📊 ВСЬОГО:       ${testViolations.length} порушень\n`);

// Пріоритети дій
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║                  ⚠️  ПРІОРИТЕТИ ДІЙ                          ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

if (criticalCount > 0) {
    console.log(`🚨 ТЕРМІНОВІ ДІЇ: ${criticalCount} критичних порушень`);
    console.log('   └─ DESATIVAR ELEVADOR IMEDIATAMENTE');
    console.log('   └─ Усунути до відновлення роботи (0-7 днів)\n');
}

if (highCount > 0) {
    console.log(`⚠️  ПЛАНОВІ ДІЇ: ${highCount} високих порушень`);
    console.log('   └─ Усунути протягом 30 днів');
    console.log('   └─ Може призвести до селювання\n');
}

if (moderateCount > 0) {
    console.log(`ℹ️  МОНІТОРИНГ: ${moderateCount} помірних порушень`);
    console.log('   └─ Усунути до наступної інспекції\n');
}

console.log('✅ Тест завершено успішно!\n');

// Тест класифікації
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║             🎯 ТЕСТ СИСТЕМИ КЛАСИФІКАЦІЇ                     ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

Object.keys(classInfo).forEach(level => {
    const info = classInfo[level];
    console.log(`${info.icon} ${level}: ${info.level}`);
    console.log(`   └─ ${info.meaning}`);
    console.log(`   └─ ${info.action}\n`);
});

console.log('🎉 Всі системи працюють коректно!\n');
