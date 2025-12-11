#!/usr/bin/env node
/**
 * Демонстрація роботи з порушеннями БЕЗ явних номерів статей
 * Система має визначити артикули за змістом
 */

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   🎯 ДЕМОНСТРАЦІЯ ІНТЕЛЕКТУАЛЬНОГО ВИЗНАЧЕННЯ АРТИКУЛІВ   ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📝 Сценарій: PDF звіт БЕЗ явних номерів статей\n');
console.log('Текст порушення НЕ містить "Artº.XX", тільки опис проблеми.');
console.log('Система має САМА визначити, який артикул порушено.\n');

const testViolations = [
    {
        severity: 'C2',
        description: 'Не існує сходи доступу до машинного приміщення або існуючі не відповідають вимогам безпеки',
        expected: 'Art. 22'
    },
    {
        severity: 'C2',
        description: 'Пристрій кінцевого вимикача безпеки спрацьовує з противагою на буферах',
        expected: 'Art. 74'
    },
    {
        severity: 'C3',
        description: 'Виступаючі частини машин не захищені належним чином',
        expected: 'Art. 85'
    },
    {
        severity: 'C1',
        description: 'Система гальмування несправна та не реагує належним чином',
        expected: 'Art. 12'
    },
    {
        severity: 'C2',
        description: 'Відсутнє аварійне освітлення в кабіні ліфта',
        expected: 'Art. 35'
    }
];

console.log('════════════════════════════════════════════════════════════\n');

testViolations.forEach((violation, index) => {
    console.log(`${index + 1}. ${violation.severity} - ${violation.description}`);
    console.log(`   Очікуваний артикул: ${violation.expected}`);
    console.log(`   🔍 Система визначить автоматично за ключовими словами\n`);
});

console.log('════════════════════════════════════════════════════════════\n');

console.log('💡 Як це працює:\n');
console.log('1. Система шукає явний номер статті (Artº.XX)');
console.log('2. Якщо НЕ знайдено → аналізує текст за ключовими словами');
console.log('3. База знань містить 13 артикулів з ~100 ключових фраз');
console.log('4. Підраховує збіги та вибирає найкращий варіант\n');

console.log('📚 Приклади ключових слів:\n');
console.log('   Art. 22: "escada de acesso", "alçapão", "corrimão"');
console.log('   Art. 74: "fim de curso", "pára-choques", "contrapeso"');
console.log('   Art. 85: "peças salientes", "volantes", "engrenagens"');
console.log('   Art. 12: "travagem", "freio", "sistema de travagem"');
console.log('   Art. 35: "iluminação", "luz de emergência"\n');

console.log('════════════════════════════════════════════════════════════\n');

console.log('✅ Переваги:');
console.log('   • Працює навіть якщо в PDF немає номерів статей');
console.log('   • Автоматична класифікація порушень');
console.log('   • Підтримка португальської мови');
console.log('   • 13 основних артикулів регуляції ліфтів');
console.log('   • Зважена оцінка за кількістю збігів\n');

console.log('🔧 Для тестування запустіть:');
console.log('   node test-article-detection.js\n');
