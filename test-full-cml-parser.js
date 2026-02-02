/**
 * ПОВНИЙ ТЕСТ ПАРСЕРА CML з реальним текстом
 */

const { parseBureauVeritasPDF } = require('./services/pdf-parser-bureau-veritas');
const fs = require('fs');
const pdfParse = require('pdf-parse');

const testText = `30/06/2025
Data da Inspeção:
PROPRIETÁRIO:
Reinspeção
KONE Portugal
EMIE:
Tipo de Inspeção:
Inspeção de Ascensores, Monta-Cargas, Escadas Mecânicas e Tapetes Rolantes
2
Instalação:
CML/3599/6599
Processo:
Rua dos Soeiros, 307-307B
Administração do Condomínio
NOTA DE CLÁUSULAS
AS  DEFICIÊNCIAS  QUE  A  SEGUIR  SE  INDICAM,  DECORREM  DA  APLICAÇÃO  DO
REGULAMENTO DE SEGURANÇA DE ELEVADORES ELÉCTRICOS, APROVADO PELO
DECRETO  N.°  513/70,  DE  30  DE  OUTUBRO,  ALTERADO  PELO  DECRETO
REGULAMENTAR  N.°  13/80,  DE  16  DE  MAIO  E  DECRETO-LEI  N.°  320/02,  DE  28  DE
DEZEMBRO.
LOCAL:
Validade da Inspeção:
C  2  -  CLÁUSULAS(S)  CUJO  CUMPRIMENTO  DEVERÁ  SER  IMEDIATO.  ESTE  PRAZO
PODERÁ SER PRORROGADO ATÉ 180 DIAS, CASO O PROPRIETÁRIO O SOLICITE À
CML E COMPROVE A ADJUDICAÇÃO DOS TRABALHOS NECESSÁRIOS À RESOLUÇÃO
DAS CLÁUSULAS APLICADAS.
ArtigoDescrição
ART. 20.º
(DL
320/02)
Falta de apresentação dos documentos referentes à modificação importante
efectuada  nesta  instalação,  conforme  definido  no  Anexo  I  do  Decreto-lei  n.°
58/2017,  de  9  de  Junho  e  EN  13015:2001  +  A1:2008.
Lisboa, 30 de Junho de 2025
O DIRETOR TÉCNICO,
www.cm-lisboa.pt | tel: 21 798 80 00 | e-mail ei.cml@cm-lisboa.pt
Página 1 de 1`;

console.log('🧪 FULL CML PARSER TEST\n');
console.log('=' .repeat(80));

// Імпортуємо функцію витягування
const parserModule = require('./services/pdf-parser-bureau-veritas');

console.log('\n📋 Calling extractViolations directly...\n');

// Викликаємо витягування порушень
const violations = parserModule.extractViolations ? 
    parserModule.extractViolations(testText) : 
    [];

console.log('\n' + '='.repeat(80));
console.log(`\n📊 RESULTS: ${violations.length} violations found\n`);

if (violations.length > 0) {
    violations.forEach((v, i) => {
        console.log(`\n${i + 1}. ${v.classification} - Article ${v.article}`);
        console.log(`   Description: ${v.description.substring(0, 100)}...`);
    });
} else {
    console.log('❌ NO VIOLATIONS FOUND - This is a BUG!');
    console.log('\n🔍 Expected to find:');
    console.log('   C2 - Article 20');
    console.log('   Description: Falta de apresentação dos documentos...');
}

console.log('\n' + '='.repeat(80));
console.log('✅ Test completed\n');
