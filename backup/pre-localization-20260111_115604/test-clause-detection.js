#!/usr/bin/env node
/**
 * Тест визначення клауз з PDF звіту
 */

// Тестовий текст з вашого прикладу
const testReport = `
C2 Artigo NOTA - NOTA - Observação Geral
Porушення: Artº.22.° 3 – Não existe escada de acesso à casa das máquinas ou a existente não cumpre com os requisitos de segurança: fixação, largura, inclinação, corrimão ou pegas e eventuais guarda-corpos. Do último degrau ao pavimento da casa da máquina tem 0,70 m e as pegas instaladas por cima do alçapão são insuficientes.

C2 Artigo NOTA - NOTA - Observação Geral
Porушення: Artº.22.º 2 – O acesso à casa das máquinas não é fácil e seguro. O alçapão não é contrabalançado.

C2 Artigo NOTA - NOTA - Observação Geral
Porушення: Artº.74º 2 – O dispositivo de fim de curso de segurança actua com o contrapeso assente sobre os pára-choques.

C3 Artigo NOTA - NOTA - Observação Geral
Porушення: Artº.85º – As peças salientes das máquinas, nomeadamente volantes, engrenagens e correias, não estão devidamente resguardadas. RESULTADO DA INSPECÇÃO- Este Relatório de Inspecção reflecte as constatações do inspector no momento da inspeção, realizada no âmbito do Decreto-Lei nº 320/2002, de 28/12. Reprovada
`;

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         🧪 ТЕСТ ВИЗНАЧЕННЯ КЛАУЗ З PDF ЗВІТУ              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const lines = testReport.split('\n').map(l => l.trim()).filter(l => l.length > 0);
const violations = [];

lines.forEach((line) => {
    // Шукаємо явні мітки C1, C2, C3 на початку рядка
    const clauseMatch = line.match(/^(C[123])\s+/i);
    
    if (clauseMatch) {
        const severity = clauseMatch[1].toUpperCase();
        const description = line.substring(clauseMatch[0].length).trim();
        
        // Витягуємо номер статті
        const articleMatch = description.match(/Art[ºo]?\.\s*(\d+)[ºo]?\s*(\d*)/i);
        const article = articleMatch ? `Art. ${articleMatch[1]}${articleMatch[2] ? '.' + articleMatch[2] : ''}` : 'Artigo Geral';
        
        // Витягуємо опис порушення
        let violation = description;
        const violationMatch = description.match(/(?:Porушення:|–)\s*(.+)/i);
        if (violationMatch) {
            violation = violationMatch[1].trim();
        }
        
        violations.push({
            severity,
            article,
            description: violation.substring(0, 100) + '...'
        });
    }
});

console.log(`📊 Знайдено порушень: ${violations.length}\n`);

const c1Count = violations.filter(v => v.severity === 'C1').length;
const c2Count = violations.filter(v => v.severity === 'C2').length;
const c3Count = violations.filter(v => v.severity === 'C3').length;

console.log('📋 Статистика:');
console.log(`   🔴 C1 (Критичні):  ${c1Count}`);
console.log(`   🟡 C2 (Середні):   ${c2Count}`);
console.log(`   🟢 C3 (Легкі):     ${c3Count}\n`);

violations.forEach((v, i) => {
    const icon = v.severity === 'C1' ? '🔴' : (v.severity === 'C2' ? '🟡' : '🟢');
    console.log(`${icon} ${i + 1}. ${v.severity} - ${v.article}`);
    console.log(`   ${v.description}\n`);
});

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                    ✅ РЕЗУЛЬТАТ                            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

if (c2Count === 3 && c3Count === 1) {
    console.log('✅ ПРАВИЛЬНО! Знайдено 3 × C2 і 1 × C3');
    console.log('   Відповідає вашим даним із звіту.\n');
} else {
    console.log(`❌ ПОМИЛКА! Очікувалося 3 × C2 і 1 × C3`);
    console.log(`   Отримано: ${c2Count} × C2 і ${c3Count} × C3\n`);
}
