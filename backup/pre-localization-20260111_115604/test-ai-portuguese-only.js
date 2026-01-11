// ═══════════════════════════════════════════════════════════
// 🧪 TEST AI - PORTUGUESE ONLY (Production)
// ═══════════════════════════════════════════════════════════

const jwt = require('jsonwebtoken');

const testToken = jwt.sign(
    { 
        userId: 'test-123',
        email: 'tech@deapseak.pt',
        role: 'tech',
        username: 'João Silva'
    },
    'deapseak_secret_key_2024',
    { expiresIn: '1h' }
);

console.log('🧪 === TESTE AI - SÓ PORTUGUÊS ===\n');

const testQuestions = [
    {
        question: 'Como funciona o sistema de cabos de um elevador?',
        expected: 'Resposta completa em português'
    },
    {
        question: 'O que é o Artigo 78 do Regulamento 513/70?',
        expected: 'Explicação do regulamento em português'
    },
    {
        question: 'Quantos elevadores estão no sistema?',
        expected: 'Direcionar para dashboard em português'
    }
];

async function testAI(question, expected) {
    try {
        console.log(`\n📋 PERGUNTA: "${question}"`);
        console.log(`   Esperado: ${expected}\n`);
        
        const response = await fetch('http://localhost:5000/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${testToken}`
            },
            body: JSON.stringify({
                message: question
            })
        });

        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ RESPOSTA AI:\n`);
            console.log(data.data.response);
            
            // Check if response is in Portuguese
            const hasPortuguese = /[àáâãçéêíóôõú]/i.test(data.data.response);
            const hasUkrainian = /[іїєґ]/i.test(data.data.response);
            
            console.log(`\n📊 ANÁLISE:`);
            console.log(`   - Português detectado: ${hasPortuguese ? '✅ SIM' : '❌ NÃO'}`);
            console.log(`   - Ucraniano detectado: ${hasUkrainian ? '⚠️  SIM (NÃO DEVE!)' : '✅ NÃO'}`);
            console.log(`   - Modelo: ${data.data.powered_by}`);
            
        } else {
            console.log(`❌ Erro: ${data.message}`);
        }
        
    } catch (error) {
        console.log(`❌ Erro de requisição: ${error.message}`);
    }
}

async function runTests() {
    for (const test of testQuestions) {
        await testAI(test.question, test.expected);
        console.log('\n' + '─'.repeat(80));
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('\n✅ TESTES CONCLUÍDOS!\n');
    console.log('📊 RESULTADO ESPERADO:');
    console.log('   ✅ Todas as respostas devem ser APENAS em português');
    console.log('   ❌ Nenhuma resposta deve conter ucraniano\n');
}

runTests();
