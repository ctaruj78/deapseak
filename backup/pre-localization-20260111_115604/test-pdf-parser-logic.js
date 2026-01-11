#!/usr/bin/env node
/**
 * Тест нової логіки pdf-parser.js
 */

const fs = require('fs');
const pdfParser = require('./services/pdf-parser.js');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║          🧪 ТЕСТ PDF PARSER З НОВОЮ ЛОГІКОЮ              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Знаходимо тестовий PDF
const testPdfPath = '/workspaces/deapseak/uploads/test-inspection.pdf';

// Якщо немає тестового файлу - створюємо симуляцію
const testText = `
C2 Artigo NOTA - NOTA - Observação Geral
Porušenня: Artº.22.° 3 – Não existe escada de acesso à casa das máquinas ou a existente não cumpre com os requisitos de segurança

C2 Artigo NOTA - NOTA - Observação Geral
Porušennja: Artº.22.º 2 – O acesso à casa das máquinas não é fácil e seguro. O alçapão não é contrabalançado.

C2 Artigo NOTA - NOTA - Observação Geral
Porušennja: Artº.74º 2 – O dispositivo de fim de curso de segurança actua com o contrapeso assente sobre os pára-choques.

C3 Artigo NOTA - NOTA - Observação Geral
Porušennja: Artº.85º – As peças salientes das máquinas, nomeadamente volantes, engrenagens e correias, não estão devidamente resguardadas.

C2 Artigo NOTA - NOTA - Observação Geral
Porušennja: Regularizar no prazo de 30 dias Caso tenham sido detetadas cláusulas do tipo

C2 Artigo NOTA - NOTA - Observação Geral
Porušennja: foram detetadas cláusulas tipo
`;

console.log('📝 Тестовий текст (10 рядків):\n');
console.log(testText.substring(0, 300) + '...\n');

console.log('═'.repeat(62));
console.log('🔍 Викликаємо extractViolations (стара логіка):\n');

const oldViolations = pdfParser.extractViolations(testText);
console.log(`📊 Стара логіка знайшла: ${oldViolations.length} порушень`);

oldViolations.forEach((v, i) => {
    console.log(`  ${i + 1}. ${v.classification} - Art. ${v.article}`);
});

console.log('\n' + '═'.repeat(62));
console.log('💡 Очікуваний результат з НОВОЮ логікою:\n');
console.log('  Має знайти 4 порушення (фільтрувати службові тексти)');
console.log('  1. C2 - Art. 22.3');
console.log('  2. C2 - Art. 22.2');
console.log('  3. C2 - Art. 74.2');
console.log('  4. C3 - Art. 85');

console.log('\n' + '═'.repeat(62));
console.log('⚠️ ПРОБЛЕМА:\n');
console.log('  pdf-parser.js використовує extractViolations()');
console.log('  але ми додали analyzeInspectionReportFromText()');
console.log('  ТРЕБА ПЕРЕВІРИТИ чи parsePDF() викликає нову функцію!');

console.log('\n═'.repeat(62));
