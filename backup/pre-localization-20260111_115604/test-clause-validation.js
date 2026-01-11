#!/usr/bin/env node
/**
 * ТЕСТ ВАЛІДАЦІЇ КЛАУЗ З РЕАЛЬНИМИ ДАНИМИ
 * v2.0: З НОВОЮ ВАЛІДАЦІЄЮ
 * 
 * Очікуваний результат: 4 реальні порушення (3× C2, 1× C3)
 * 6 службових текстів мають бути відфільтровані
 */

const { isValidViolation, ValidationStats } = require('./services/clause-validator');

// РЕАЛЬНІ дані від користувача (з 10 порушень)
const testData = [
    {
        classification: 'C2',
        article: '22',
        description: 'Artº.22.° 3 – Não existe escada de acesso à casa das máquinas ou a existente não cumpre com os requisitos de segurança: fixação, largura, inclinação, corrimão ou pegas e eventuais guarda-corpos. Do último degrau ao pavimento da casa da máquina tem 0,70 m e as pegas instaladas por cima do alçapão são insuficientes.',
        expectedValid: true
    },
    {
        classification: 'C2',
        article: '22',
        description: 'Artº.22.º 2 – O acesso à casa das máquinas não é fácil e seguro. O alçapão não é contrabalançado.',
        expectedValid: true
    },
    {
        classification: 'C2',
        article: '74',
        description: 'Artº.74º 2 – O dispositivo de fim de curso de segurança actua com o contrapeso assente sobre os pára-choques.',
        expectedValid: true
    },
    {
        classification: 'C3',
        article: '85',
        description: 'Artº.85º – As peças salientes das máquinas, nomeadamente volantes, engrenagens e correias, não estão devidamente resguardadas. RESULTADO DA INSPECÇÃO- Este Relatório de Inspecção reflecte as constatações do inspector no momento da inspeção, realizada no âmbito do Decreto-Lei nº 320/2002, de 28/12. Reprovada',
        expectedValid: true
    },
    {
        classification: 'C2',
        article: null,
        description: 'Regularizar no prazo de 30 dias Caso tenham sido detetadas cláusulas do tipo',
        expectedValid: false
    },
    {
        classification: 'C2',
        article: null,
        description: 'foram detetadas cláusulas tipo',
        expectedValid: false
    },
    {
        classification: 'C3',
        article: null,
        description: 'foram detetadas cláusulas tipo',
        expectedValid: false
    },
    {
        classification: 'C2',
        article: null,
        description: '*: foram detectadas cláusulas tipo',
        expectedValid: false
    },
    {
        classification: 'C2',
        article: null,
        description: '*, correspondem a situações de médio risco para a segurança de pessoas e bens. Estas cláusulas não obrigam à imobilização das instalações. A remoção destas não conformidades deve ser executada no prazo máximo de 2 anos após a sua deteção, conforme Despacho n.º 17/2022/DG de 8 de junho de 2022. Elevador Reprovado: foram detetadas cláusulas tipo',
        expectedValid: false
    },
    {
        classification: 'C2',
        article: null,
        description: ', correspondem a situações de médio risco para a segurança de pessoas e bens. Estas cláusulas dão lugar a uma reinspecção. Elevador Reprovado com Imobilização: foram detetadas cláusulas tipo',
        expectedValid: false
    }
];

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║    🧪 ТЕСТ ВАЛІДАЦІЇ КЛАУЗ (v2.0 З ФІЛЬТРАЦІЄЮ)          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const stats = new ValidationStats();
const results = [];

testData.forEach((test, index) => {
    const validation = isValidViolation(test.classification, test.article, test.description);
    stats.add(validation.valid, validation.reason || 'Валідне порушення');
    
    const icon = validation.valid ? '✅' : '❌';
    const expectedIcon = test.expectedValid ? '✅' : '❌';
    const match = validation.valid === test.expectedValid ? '✅ OK' : '❌ ПОМИЛКА';
    
    results.push({
        index: index + 1,
        valid: validation.valid,
        expected: test.expectedValid,
        match: validation.valid === test.expectedValid,
        classification: test.classification,
        article: test.article || 'N/A',
        reason: validation.reason,
        description: test.description.substring(0, 60) + '...'
    });
    
    console.log(`\n${index + 1}. ${icon} Результат: ${validation.valid ? 'ВАЛІДНЕ' : 'ВІДХИЛЕНЕ'} | Очікувалося: ${expectedIcon} ${test.expectedValid ? 'ВАЛІДНЕ' : 'ВІДХИЛЕНЕ'} | ${match}`);
    console.log(`   Класифікація: ${test.classification}`);
    console.log(`   Артикул: ${test.article || 'ВІДСУТНІЙ'}`);
    console.log(`   Опис: ${test.description.substring(0, 80)}...`);
    if (!validation.valid) {
        console.log(`   ⚠️  Причина відхилення: ${validation.reason}`);
    }
});

// Статистика
stats.report();

// Фінальний результат
const correctResults = results.filter(r => r.match).length;
const totalTests = results.length;
const accuracy = (correctResults / totalTests) * 100;

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                    📊 ФІНАЛЬНИЙ РЕЗУЛЬТАТ                  ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log(`✅ Правильних результатів: ${correctResults}/${totalTests} (${accuracy.toFixed(1)}%)\n`);

if (accuracy === 100) {
    console.log('🎉 ВІДМІННО! Всі тести пройдені успішно!');
    console.log('   ✅ Реальні порушення розпізнані');
    console.log('   ✅ Службові тексти відфільтровані');
    console.log('   ✅ Точність: 100%\n');
} else {
    console.log('⚠️  Є помилки! Потрібно доопрацювати валідацію.\n');
    
    const errors = results.filter(r => !r.match);
    console.log('Помилкові результати:');
    errors.forEach(e => {
        console.log(`   ${e.index}. ${e.classification} Art.${e.article}: ${e.description}`);
        console.log(`      Отримано: ${e.valid}, Очікувалося: ${e.expected}`);
        console.log(`      Причина: ${e.reason}\n`);
    });
}

// Детальна статистика по типах
console.log('📋 Розбивка по очікуваним результатам:');
const truePositives = results.filter(r => r.valid && r.expected).length;
const trueNegatives = results.filter(r => !r.valid && !r.expected).length;
const falsePositives = results.filter(r => r.valid && !r.expected).length;
const falseNegatives = results.filter(r => !r.valid && r.expected).length;

console.log(`   True Positives (правильно розпізнані):  ${truePositives}`);
console.log(`   True Negatives (правильно відфільтровані): ${trueNegatives}`);
console.log(`   False Positives (помилково розпізнані): ${falsePositives}`);
console.log(`   False Negatives (помилково відфільтровані): ${falseNegatives}\n`);

// Exit code для CI/CD
process.exit(accuracy === 100 ? 0 : 1);
