#!/usr/bin/env node
/**
 * Тест визначення клауз з РЕАЛЬНИХ даних користувача
 * Це дані з 10 порушень, де тільки 4 є реальними
 */

// РЕАЛЬНІ дані від користувача (з 10 порушень)
const testReport = `
C2 Artigo NOTA - NOTA - Observação Geral
Porушення: Artº.22.° 3 – Não existe escada de acesso à casa das máquinas ou a existente não cumpre com os requisitos de segurança: fixação, largura, inclinação, corrimão ou pegas e eventuais guarda-corpos. Do último degrau ao pavimento da casa da máquina tem 0,70 m e as pegas instaladas por cima do alçapão são insuficientes.

C2 Artigo NOTA - NOTA - Observação Geral
Porушення: Artº.22.º 2 – O acesso à casa das máquinas não é fácil e seguro. O alçapão não é contrabalançado.

C2 Artigo NOTA - NOTA - Observação Geral
Porушення: Artº.74º 2 – O dispositivo de fim de curso de segurança actua com o contrapeso assente sobre os pára-choques.

C3 Artigo NOTA - NOTA - Observação Geral
Porушення: Artº.85º – As peças salientes das máquinas, nomeadamente volantes, engrenagens e correias, não estão devidamente resguardadas. RESULTADO DA INSPECÇÃO- Este Relatório de Inspecção reflecte as constatações do inspector no momento da inspeção, realizada no âmbito do Decreto-Lei nº 320/2002, de 28/12. Reprovada

C2 Artigo NOTA - NOTA - Observação Geral
Porушення: Regularizar no prazo de 30 dias Caso tenham sido detetadas cláusulas do tipo

C2 Artigo NOTA - NOTA - Observação Geral
Porушення: foram detetadas cláusulas tipo

C3 Artigo NOTA - NOTA - Observação Geral
Porушення: foram detetadas cláusulas tipo

C2 Artigo NOTA - NOTA - Observação Geral
Porушення: *: foram detectadas cláusulas tipo

C2 Artigo NOTA - NOTA - Observação Geral
Porушення: *, correspondem a situações de médio risco para a segurança de pessoas e bens. Estas cláusulas não obrigam à imobilização das instalações. A remoção destas não conformidades deve ser executada no prazo máximo de 2 anos após a sua deteção, conforme Despacho n.º 17/2022/DG de 8 de junho de 2022. Elevador Reprovado: foram detetadas cláusulas tipo

C2 Artigo NOTA - NOTA - Observação Geral
Porушення: , correspondem a situações de médio risco para a segurança de pessoas e bens. Estas cláusulas dão lugar a uma reinspecção. Elevador Reprovado com Imobilização: foram detetadas cláusulas tipo
`;

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║    🧪 ТЕСТ З РЕАЛЬНИМИ ДАНИМИ (10 рядків → 4 реальних)   ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const lines = testReport.split('\n').map(l => l.trim()).filter(l => l.length > 0);
const violations = [];

console.log('📝 Обробка рядків:\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Шукаємо явні мітки C1, C2, C3 на початку рядка
    const clauseMatch = line.match(/^(C[123])\s+/i);
    
    if (clauseMatch) {
        const severity = clauseMatch[1].toUpperCase();
        
        // Перевіряємо поточний рядок І наступний для пошуку номера статті
        const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
        const combinedText = line + ' ' + nextLine;
        
        // Витягуємо номер статті з об'єднаного тексту
        // Формат: Artº.22.° 3 або Artº.74º 2
        const articleMatch = combinedText.match(/Art[ºo]?\.\s*(\d+)\s*[ºo°\.]*\s*(\d*)/i);
        
        // ФІЛЬТР: пропускаємо рядки без номера статті
        if (!articleMatch) {
            console.log(`❌ Пропущено (немає статті): ${line.substring(0, 60)}...`);
            continue;
        }
        
        // ФІЛЬТР: пропускаємо загальні пояснення та службові тексти
        const skipPhrases = [
            'foram detetadas cláusulas',
            'foram detectadas cláusulas',
            'correspondem a situações',
            'regularizar no prazo',
            'elevador reprovado',
            'estas cláusulas',
            'caso tenham sido'
        ];
        
        const isGenericText = skipPhrases.some(phrase => combinedText.toLowerCase().includes(phrase));
        
        if (isGenericText) {
            console.log(`❌ Пропущено (службовий текст): ${combinedText.substring(0, 60)}...`);
            continue;
        }
        
        const article = `Art. ${articleMatch[1]}${articleMatch[2] ? '.' + articleMatch[2] : ''}`;
        
        // Витягуємо опис порушення з наступного рядка (після "Porушення:" або "–")
        let violation = nextLine;
        const violationMatch = nextLine.match(/(?:Porушення:|–)\s*(.+)/i);
        if (violationMatch) {
            violation = violationMatch[1].trim();
        }
        
        // Перевіряємо чи вже є таке порушення (дедуплікація)
        const isDuplicate = violations.some(v => 
            v.article === article && v.severity === severity
        );
        
        if (isDuplicate) {
            console.log(`⚠️ Пропущено (дублікат): ${article} - ${severity}`);
            continue;
        }
        
        violations.push({
            id: violations.length + 1,
            description: violation,
            severity: severity,
            article: article
        });
        
        console.log(`✅ Додано: ${severity} ${article}`);
    }
}

console.log('\n' + '═'.repeat(62));
console.log(`📊 Знайдено порушень: ${violations.length}`);
console.log('═'.repeat(62));

const c1Count = violations.filter(v => v.severity === 'C1').length;
const c2Count = violations.filter(v => v.severity === 'C2').length;
const c3Count = violations.filter(v => v.severity === 'C3').length;

console.log('\n📋 Статистика:');
console.log(`   🔴 C1 (Критичні):  ${c1Count}`);
console.log(`   🟡 C2 (Середні):   ${c2Count}`);
console.log(`   🟢 C3 (Легкі):     ${c3Count}`);

console.log('\n📝 Деталі порушень:');
violations.forEach(v => {
    console.log(`\n   ${v.id}. ${v.severity} - ${v.article}`);
    console.log(`      ${v.description.substring(0, 100)}...`);
});

console.log('\n' + '═'.repeat(62));
if (c2Count === 3 && c3Count === 1 && violations.length === 4) {
    console.log('✅ ТЕСТ ПРОЙДЕНО! Визначено 3×C2 + 1×C3 (4 порушення)');
} else {
    console.log(`❌ ТЕСТ ПРОВАЛЕНО! Очікувалось 3×C2 + 1×C3 (4 порушення)`);
    console.log(`   Отримано: ${c2Count}×C2 + ${c3Count}×C3 (${violations.length} порушень)`);
}
console.log('═'.repeat(62) + '\n');
