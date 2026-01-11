const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function testModels() {
    const models = ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-latest'];
    
    for (const modelName of models) {
        try {
            console.log(`\n🧪 Testing ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Hello');
            const response = await result.response;
            console.log(`✅ ${modelName} works! Response:`, response.text().substring(0, 50));
            break; // Found working model
        } catch (error) {
            console.log(`❌ ${modelName} failed:`, error.message.substring(0, 100));
        }
    }
}

testModels().catch(console.error);
