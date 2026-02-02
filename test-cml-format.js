/**
 * ТЕСТ ПАРСЕРА ДЛЯ CML LISBOA
 */

const testText = `
30/06/2025
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
`;

console.log('🧪 TESTING CML LISBOA FORMAT\n');
console.log('=' .repeat(80));

console.log('\n📋 Test text length:', testText.length, 'chars');
console.log('\n🔍 Searching for key patterns:');
console.log('  - "NOTA DE CLÁUSULAS":', testText.includes('NOTA DE CLÁUSULAS') ? '✅' : '❌');
console.log('  - "C  2  -":', testText.includes('C  2  -') ? '✅' : '❌');
console.log('  - "ART. 20.º":', testText.includes('ART. 20.º') ? '✅' : '❌');
console.log('  - "ArtigoDescrição":', testText.includes('ArtigoDescrição') ? '✅' : '❌');

// Знаходимо секцію з порушеннями
const notaStart = testText.indexOf('NOTA DE CLÁUSULAS');
const endMarker = testText.indexOf('Lisboa,');

if (notaStart !== -1) {
    const violationsSection = endMarker !== -1 ? 
        testText.substring(notaStart, endMarker) : 
        testText.substring(notaStart);
    
    console.log('\n📊 Violations section:');
    console.log('  Start:', notaStart);
    console.log('  End:', endMarker);
    console.log('  Length:', violationsSection.length, 'chars');
    
    // Тестуємо Format 3 regex (CML)
    console.log('\n🔍 Testing Format 3 regex (CML):');
    const regex3 = /ART[\.º\s]*(\d+[a-zº°\.]*)\s*(?:\(([^)]+)\))?\s*([^\n]{20,500})/gi;
    console.log('  Pattern:', regex3.toString());
    
    let match;
    let count = 0;
    
    while ((match = regex3.exec(violationsSection)) !== null) {
        count++;
        console.log(`\n  Match #${count}:`);
        console.log('    Full match:', match[0].substring(0, 100));
        console.log('    Article:', match[1]);
        console.log('    Legal ref:', match[2] || 'N/A');
        console.log('    Description:', match[3].substring(0, 80));
    }
    
    console.log(`\n📊 Total matches: ${count}`);
    
    // Альтернативний regex - більш простий
    console.log('\n🔍 Testing alternative regex:');
    const altRegex = /ART\.\s*(\d+)\.º\s*\(([^)]+)\)\s*(.+?)(?=Lisboa|$)/gis;
    console.log('  Pattern:', altRegex.toString());
    
    count = 0;
    while ((match = altRegex.exec(violationsSection)) !== null) {
        count++;
        console.log(`\n  Match #${count}:`);
        console.log('    Article:', match[1]);
        console.log('    Legal ref:', match[2]);
        console.log('    Description:', match[3].substring(0, 100).replace(/\s+/g, ' '));
    }
    
    console.log(`\n📊 Alternative matches: ${count}`);
}

console.log('\n' + '='.repeat(80));
console.log('✅ Test completed\n');
