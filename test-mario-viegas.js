/**
 * ТЕСТ ПАРСЕРА ДЛЯ ЗВІТУ MARIO VIEGAS
 */

const { parseBureauVeritasPDF } = require('./services/pdf-parser-bureau-veritas');

// Симуляція тексту зі звіту Mario Viegas
const testText = `
IDENTIFICAÇÃO DA INSTALAÇÃO 
Localização da instalação  RUA MARIO VIEGAS, 122, . Relatório nº DT2024-16084-01-01 
Código Postal  2755-057 Instalação nº -- 
Localidade  Alcabideche Posição n.º UNICO 
Concelho  Cascais. Processo nº 371-11.05/002019 
Proprietário ADMINISTRAÇÃO DO EDIFÍCIO Marca ou Fabricante Fortis 
Morada RUA MARIO VIEGAS, 122, . Empresa Instaladora Fortis, ITALA 
Código Postal  2755-057Alcabideche Empresa de Manutenção FESTLIFT 

TIPO DE EDIFÍCIO   TIPO DE INSPEÇÃO 
Habitação Inspecção Periódica 
Nº Fogos : 10  

ASCENSORES E MONTA-CARGAS 
Transporte de Accionamento Casa das Máquinas Nº Pessoas Nº Paragens Nº Cabos/Correias Diâmetro/Larg. (mm) 
Pessoas Electromecânico Sim, Em cima 4 7 2 / 11 / 
Carga Nominal(Kg) Curso (m) Vel.Nominal/Vel.Nivelação(m/s) Marcação CE 
300  0,60 /VF  

REGULAMENTAÇÃO APLICÁVEL 
 Decreto 513/70     DL 295/98 (EN81-1/2:98+A3:09) 

NOTA DE CLAUSULAS 
Tipo Deficiência detectada 
C2 Artº.46.º 2 – O dispositivo contra entalamentos instalado na cabina, encontra-se inoperacional. 


RESULTADO DA INSPECÇÃO- Este Relatório de Inspecção reflecte as constatações do inspector no momento da inspeção, realizada no âmbito do Decreto-Lei nº 320/2002, de 28/12. 
Reprovada C2-Regularizar no prazo de 30 dias 

Observações 
Sem Observações 
Constatações 
Sem Constatações 

Data da Inspecção Inspector  Proprietário (Requerente)  Empresa Manutenção 
2025/02/26  Delmar Sambalanda  ADMINISTRAÇÃO DO EDIFÍCIO  FESTLIFT - Ruslan 

OBRIGAÇÕES DO PROPRIETÁRIO 
O Proprietário da instalação é responsável pela utilização, conservação e manutenção da mesma, de acordo com as condições de segurança regulamentares, estabelecidas pelo Decreto-Lei 320/2002 de 28 de Dezembro, em 
concreto está obrigado a empreender as acções oportunas para que dentro do prazo estabelecido se realizem as correções e reparações indicadas neste relatório de inspeção. 
EM RELAÇÃO AO NÍVEL DAS DEFICIÊNCIAS INDICADAS NO RELATÓRIO 
Elevador Aprovado: Não foram detetadas deficiências na instalação, no decorrer da inspeção. 
Elevador Aprovado com cláusulas C3: foram detetadas cláusulas tipo C3, correspondem a situações que não apresentam um risco directo para a segurança de pessoas e bens, cuja resolução deve ser verificada na inspeção 
periódica seguinte. 
Elevador Aprovado com cláusulas C2*: foram detectadas cláusulas tipo C2*, correspondem a situações de médio risco para a segurança de pessoas e bens. Estas cláusulas não obrigam à imobilização das instalações. A 
remoção destas não conformidades deve ser executada no prazo máximo de 2 anos após a sua deteção, conforme Despacho n.º 17/2022/DG de 8 de junho de 2022. 
Elevador Reprovado: foram detetadas cláusulas tipo C2, correspondem a situações de médio risco para a segurança de pessoas e bens. Estas cláusulas dão lugar a uma reinspecção. 
Elevador Reprovado com Imobilização: foram detetadas cláusulas tipo C1, correspondem a situações de elevado risco para a segurança de pessoas e bens, cuja resolução deve ser imediata. Estas cláusulas dão lugar à 
imobilização das instalações. 
`;

console.log('🧪 TESTING MARIO VIEGAS REPORT PARSING\n');
console.log('=' .repeat(80));

// Імпортуємо функцію витягування порушень напряму
const pdfParserModule = require('./services/pdf-parser-bureau-veritas');

// Отримуємо внутрішню функцію (якщо експортована) або створюємо тест
console.log('\n📋 Test text length:', testText.length, 'chars');
console.log('\n🔍 Searching for key patterns:');
console.log('  - "NOTA DE CLAUSULAS":', testText.includes('NOTA DE CLAUSULAS') ? '✅' : '❌');
console.log('  - "Reprovada":', testText.includes('Reprovada') ? '✅' : '❌');
console.log('  - "C2 Artº.46.º 2":', testText.includes('C2 Artº.46.º 2') ? '✅' : '❌');
console.log('  - "RESULTADO DA INSPECÇÃO":', testText.includes('RESULTADO DA INSPECÇÃO') ? '✅' : '❌');

// Знаходимо секцію з порушеннями
const notaStart = testText.indexOf('NOTA DE CLAUSULAS');
const resultStart = testText.indexOf('RESULTADO DA INSPECÇÃO');

if (notaStart !== -1 && resultStart !== -1) {
    const violationsSection = testText.substring(notaStart, resultStart);
    console.log('\n📊 Violations section:');
    console.log('  Start:', notaStart);
    console.log('  End:', resultStart);
    console.log('  Length:', violationsSection.length, 'chars');
    console.log('\n📝 Content:');
    console.log(violationsSection);
    console.log('\n' + '='.repeat(80));
    
    // Тестуємо regex
    const regex = /([C][123])\s+Art[ºo°]?\.?\s*([\d\s\.º°]+?)\s+[-–—]\s*(.+)/gi;
    let match;
    let count = 0;
    
    console.log('\n🔍 Testing regex pattern:');
    console.log('  Pattern:', regex.toString());
    
    while ((match = regex.exec(violationsSection)) !== null) {
        count++;
        console.log(`\n  Match #${count}:`);
        console.log('    Full match:', match[0]);
        console.log('    Classification:', match[1]);
        console.log('    Article:', match[2]);
        console.log('    Description:', match[3].substring(0, 100));
    }
    
    console.log(`\n📊 Total matches: ${count}`);
}

console.log('\n' + '='.repeat(80));
console.log('✅ Test completed\n');
