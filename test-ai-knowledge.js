#!/usr/bin/env node
/**
 * Тест AI Assistant з новою базою знань
 */

const fs = require('fs');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║     🤖 ТЕСТ AI ASSISTANT - БАЗА ЗНАНЬ ОНОВЛЕНА              ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Завантажити оновлену базу
const kb = JSON.parse(fs.readFileSync('./data/portugal-lift-regulations.json', 'utf8'));

console.log('📊 МЕТАДАНІ БАЗ И ЗНАНЬ:');
console.log(`   • Країна: ${kb.metadata.country}`);
console.log(`   • Оновлено: ${kb.metadata.last_updated}`);
console.log(`   • Версія: ${kb.metadata.version}`);
console.log(`   • Законів: ${kb.metadata.laws_count}`);
console.log(`   • Артиклів: ${kb.metadata.total_articles}`);
console.log(`   • Кодів порушень: ${kb.metadata.total_violation_codes}`);
console.log('');

console.log('📚 ЗАКОНИ В БАЗІ:');
kb.regulations.forEach((reg, i) => {
    console.log(`\n${i+1}. ${reg.number} - ${reg.title}`);
    console.log(`   📅 Дата: ${reg.date}`);
    console.log(`   📝 Статус: ${reg.status}`);
    console.log(`   🔍 Inspection points: ${reg.inspection_points.length}`);
    console.log(`   ⚠️  Критичні вимоги: ${reg.source.critical_articles || reg.source.critical_requirements}`);
});

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║          🔴 ТОП-10 КРИТИЧНИХ ПОРУШЕНЬ                        ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

kb.ai_summary.most_critical.forEach((v, i) => {
    console.log(`${i+1}. ${v.code} - ${v.title}`);
    console.log(`   └─ ${v.why}\n`);
});

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║          🧪 СИМУЛЯЦІЯ ЗАПИТІВ ДО AI                          ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const testQueries = [
    "O que é o Artigo 65?",
    "Decreto 320/2002 manutenção",
    "marcação CE",
    "pára-quedas",
    "DL295-4"
];

console.log('📝 Тестові запити:');
testQueries.forEach((q, i) => {
    console.log(`\n${i+1}. Запит: "${q}"`);
    
    // Пошук по кодах порушень
    const codeMatch = kb.violation_codes.find(v => 
        v.code.toLowerCase() === q.toLowerCase() ||
        v.title.toLowerCase().includes(q.toLowerCase()) ||
        v.explanation.toLowerCase().includes(q.toLowerCase())
    );
    
    if (codeMatch) {
        console.log(`   ✅ Знайдено в violation_codes:`);
        console.log(`      • Код: ${codeMatch.code}`);
        console.log(`      • Назва: ${codeMatch.title}`);
        console.log(`      • WHY: ${codeMatch.why.substring(0, 60)}...`);
        console.log(`      • Термін: ${codeMatch.deadline}`);
    }
    
    // Пошук по законах
    const regMatch = kb.regulations.find(r =>
        r.number.includes(q) ||
        r.title.toLowerCase().includes(q.toLowerCase())
    );
    
    if (regMatch) {
        console.log(`   ✅ Знайдено закон:`);
        console.log(`      • ${regMatch.number} (${regMatch.date})`);
        console.log(`      • ${regMatch.title}`);
    }
    
    if (!codeMatch && !regMatch) {
        console.log(`   ⚠️  Пошук по тексту...`);
        const textResults = kb.violation_codes.filter(v =>
            v.explanation.toLowerCase().includes(q.toLowerCase()) ||
            v.why.toLowerCase().includes(q.toLowerCase())
        );
        console.log(`      Знайдено ${textResults.length} результатів`);
        if (textResults.length > 0) {
            console.log(`      Приклад: ${textResults[0].code} - ${textResults[0].title}`);
        }
    }
});

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║          ✅ ВИСНОВОК                                         ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log(`✅ База знань містить ${kb.violation_codes.length} кодів порушень`);
console.log(`✅ Всі 3 закони інтегровані:`);
kb.ai_summary.laws.forEach(law => {
    console.log(`   • ${law.id} (${law.year}): ${law.codes} кодів - ${law.focus}`);
});
console.log('');
console.log('🚀 AI Assistant готовий відповідати з новою базою знань!');
console.log('');
