// Список доступних моделей Gemini
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI('AIzaSyDZbcT2pkbmmRZ8I0uVeD5UpxDkIKMDDjo');

async function listModels() {
    try {
        console.log('📋 Завантаження доступних моделей...\n');
        
        const models = await genAI.listModels();
        
        console.log('✅ Доступні моделі:');
        for (const model of models) {
            if (model.supportedGenerationMethods?.includes('generateContent')) {
                console.log(`  - ${model.name}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Помилка:', error.message);
    }
}

listModels();
