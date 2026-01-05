// Швидкий тест Gemini API
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI('AIzaSyDZbcT2pkbmmRZ8I0uVeD5UpxDkIKMDDjo');

async function test() {
    try {
        console.log('🧪 Тестую Gemini...');
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const result = await model.generateContent('Скажи "Привіт" українською');
        const response = result.response;
        const text = response.text();
        
        console.log('✅ Gemini працює!');
        console.log('📝 Відповідь:', text);
        
    } catch (error) {
        console.error('❌ Помилка:', error.message);
    }
}

test();
