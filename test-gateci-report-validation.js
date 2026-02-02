/**
 * Test Case: GATECI Report RP04748 Validation
 * Validates real-world inspection report against IPAC 06/2025
 */

const InspectionReportValidator = require('./services/inspection-report-validator');

// Реальний звіт GATECI RP04748
const gateciReport = {
    report_number: 'RP04748',
    inspection_date: '2026-02-02',
    inspector: 'Ricardo Pires',
    lift: {
        location: 'R. D. António Francisco Marques, LT 28 - Vale de Estacas',
        process_number: '14160709',
        postal_code: '2005-352',
        locality: 'Santarém',
        emie_ref: '942026',
        maintenance_company: 'Festlift, Lda.'
    },
    applicable_regulation: 'Decreto Lei nº 295/98 - Diretiva 95/16/CE (EN81-1:1998/NPEN81-1:2000+A2:2004+A3:2009)',
    result: {
        status: 'Aprovado com cláusulas C3',
        description: 'Aprovado (com cláusulas C3 - Deficiências a reparar até à próxima inspeção)'
    },
    non_conformities: [
        {
            type: 'C3',
            article: 'circular nº 1',
            description: 'NOTA: Falta a documentação prevista na Circular n.º 1-2010-DSL-EL (DGEG); os efeitos desta cláusula encontram-se suspensos pela DGEG, até que se finalizem os trabalhos de definição da metodologia de regularização desta cláusula.',
            deadline: '2027-12-02'
        }
    ],
    observations: []
};

// Validar
const validator = new InspectionReportValidator();
const validation = validator.validateReport(gateciReport);

console.log('═══════════════════════════════════════════════════════════');
console.log('VALIDAÇÃO DE RELATÓRIO GATECI RP04748');
console.log('Conforme Circular IPAC N.º 6/2025');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📋 Relatório: RP04748');
console.log('📅 Data: 2026-02-02');
console.log('👤 Inspetor: Ricardo Pires');
console.log('🏢 Empresa: GATECI\n');

console.log('RESULTADO DA VALIDAÇÃO:');
console.log('═══════════════════════════════════════════════════════════');
console.log(`✓ Válido: ${validation.valid ? '❌ NÃO' : '❌ NÃO'}`);
console.log(`⚠ Erros: ${validation.errors.length}`);
console.log(`⚠ Avisos: ${validation.warnings.length}\n`);

if (validation.errors.length > 0) {
    console.log('ERROS DETECTADOS:');
    console.log('───────────────────────────────────────────────────────────');
    validation.errors.forEach((error, index) => {
        console.log(`\n${index + 1}. ${error.code} - ${error.message}`);
        console.log(`   Localização: ${error.field}`);
        console.log(`   Severidade: ${error.severity.toUpperCase()}`);
        console.log(`   Razão: ${error.reason}`);
        console.log(`   Referência: ${error.reference}`);
        console.log(`   Texto encontrado: "${error.foundText}"`);
        console.log(`   Recomendação: ${error.recommendation}`);
    });
}

console.log('\n\nCORREÇÃO AUTOMÁTICA:');
console.log('═══════════════════════════════════════════════════════════');

const correctionResult = validator.autoCorrectReport(gateciReport, validation);

console.log(`\nCorreções aplicadas: ${correctionResult.corrections.length}`);
console.log(`Requer revisão manual: ${correctionResult.requiresManualReview ? 'SIM' : 'NÃO'}\n`);

if (correctionResult.corrections.length > 0) {
    console.log('CORREÇÕES REALIZADAS:');
    console.log('───────────────────────────────────────────────────────────');
    correctionResult.corrections.forEach((correction, index) => {
        console.log(`\n${index + 1}. Tipo: ${correction.type}`);
        console.log(`   De: ${correction.from}`);
        console.log(`   Original: "${correction.original}"`);
        if (correction.corrected) {
            console.log(`   Corrigido: "${correction.corrected}"`);
        }
        if (correction.reason) {
            console.log(`   Razão: ${correction.reason}`);
        }
    });
}

console.log('\n\nRELATÓRIO CORRIGIDO:');
console.log('═══════════════════════════════════════════════════════════');
console.log(JSON.stringify(correctionResult.correctedReport, null, 2));

console.log('\n\n💡 RECOMENDAÇÃO IPAC 06/2025:');
console.log('═══════════════════════════════════════════════════════════');
console.log('❌ ERRADO (atual):');
console.log('   DEFICIÊNCIA C3: Falta documentação da Circular DGEG');
console.log('');
console.log('✅ CORRETO:');
console.log('   OBSERVAÇÃO: A instalação não apresenta documentação');
console.log('   prevista na Circular DGEG. Recomenda-se regularização.');
console.log('');
console.log('📌 MOTIVO:');
console.log('   "A verificação dos documentos não constitui uma ação');
console.log('   a executar no contexto de inspeção periódica, nem a');
console.log('   competência das EIIE passa pela confirmação da atuação');
console.log('   de outras entidades intervenientes."');
console.log('   - Circular IPAC N.º 6/2025, 20.12.2025');
console.log('═══════════════════════════════════════════════════════════\n');

module.exports = {
    gateciReport,
    validation,
    correctionResult
};
