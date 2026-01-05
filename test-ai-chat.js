// ═══════════════════════════════════════════════════════════
// 🧪 TEST AI CHAT ENDPOINT
// ═══════════════════════════════════════════════════════════
// Тестує інтеграцію Gemini AI через API endpoint

const jwt = require('jsonwebtoken');

// Generate test JWT token
const testToken = jwt.sign(
    { 
        userId: 'test-user-123',
        email: 'admin@deapseak.pt',
        role: 'admin',
        username: 'Admin Test'
    },
    process.env.JWT_SECRET || 'deapseak_secret_key_2024',
    { expiresIn: '1h' }
);

console.log('🔑 Test JWT Token:', testToken.substring(0, 50) + '...\n');

// Test questions
const testQuestions = [
    {
        question: 'Скільки ліфтів в системі?',
        context: 'General system question'
    },
    {
        question: 'Що таке система управління ліфтами?',
        context: 'System explanation'
    },
    {
        question: 'Como funciona o sistema de cabos?',
        context: 'Portuguese regulation question'
    }
];

async function testAIChat(question, context) {
    try {
        console.log(`\n📤 Запитання: "${question}"`);
        console.log(`   Контекст: ${context}`);
        
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
            console.log(`✅ Відповідь AI (${data.data.powered_by}):\n`);
            console.log(data.data.response);
            console.log(`\n⏱ Час: ${data.data.timestamp}`);
        } else {
            console.log(`❌ Помилка: ${data.message}`);
        }
        
    } catch (error) {
        console.log(`❌ Помилка запиту: ${error.message}`);
    }
}

// Run tests
async function runTests() {
    console.log('🧪 === ТЕСТУВАННЯ AI CHAT ENDPOINT ===\n');
    
    for (const test of testQuestions) {
        await testAIChat(test.question, test.context);
        console.log('\n' + '─'.repeat(80) + '\n');
        // Wait between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('✅ Тестування завершено!');
}

runTests();
