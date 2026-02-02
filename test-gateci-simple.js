const testText = `TIPOARTIGO/PONTODEFICIÊNCIA DETETADA
C29.9.11.1O dispositivo elétrico de paragem da máquina do ascensor, comandado por atuação do limitador de 
velocidade no sentido de subida está inoperacional.
C315.11Inexistência, junto à chave de desencravamento, da indicação que chame a atenção para o perigo da 
utilização dessa chave.
C36.3.5.1A casa de máquinas apresenta sinais de humidade.
C312.A máquina de tração apresenta fuga de óleo.
C39.9.4Existem indícios de início de défice de aderência entre o limitador de velocidade e o respectivo cabo.
C38.3.2/10.1.2As roçadeiras da cabina apresentam sinais de desgaste.
RESULTADO DA INSPEÇÃO`;

console.log('🧪 TESTING GATECI FORMAT\n');
console.log('Text length:', testText.length);

// Test 1: Чи знаходимо заголовок таблиці?
const tableMatch = testText.match(/TIPO\s*ARTIGO\/PONTO\s*DEFICI[ÊE]NCIA\s+DETETADA([\s\S]+?)(?=RESULTADO|$)/i);
console.log('\n1️⃣ Table match:', tableMatch ? `YES (${tableMatch[1].length} chars)` : 'NO');

if (tableMatch) {
    const tableContent = tableMatch[1];
    console.log('\n📋 Table content preview:');
    console.log(tableContent.substring(0, 200));
    
    // Test 2: Regex для витягування порушень
    const regex = /^([C][123])\s*(\d+[º°]?[a-z]?\.?[-\s\/]*[\d\.]*)\s*(.+?)(?=^[C][123]\s*\d|$)/gim;
    console.log('\n2️⃣ Testing regex:', regex.toString());
    
    let match;
    let count = 0;
    const violations = [];
    
    while ((match = regex.exec(tableContent)) !== null) {
        count++;
        const classification = match[1];
        const article = match[2].trim();
        const description = match[3].trim().replace(/\s+/g, ' ').substring(0, 100);
        
        violations.push({ classification, article, description });
        console.log(`\n  Match #${count}:`);
        console.log(`    Class: ${classification}`);
        console.log(`    Article: ${article}`);
        console.log(`    Desc: ${description}...`);
    }
    
    console.log(`\n📊 Total matches: ${count}`);
    console.log('\n✅ Expected: 6 violations');
}

console.log('\n' + '='.repeat(80));
