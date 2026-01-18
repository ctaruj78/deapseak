const jwt = require('jsonwebtoken');

const JWT_SECRET = 'deapseak_secret_key_2024';
const BASE_URL = 'http://localhost:5000';

// Токени для всіх ролей
const tokens = {
    admin: jwt.sign({ userId: '1', username: 'admin', role: 'admin', email: 'info@festlift.pt' }, JWT_SECRET, { expiresIn: '1h' }),
    dispatcher: jwt.sign({ userId: '2', username: 'dispatcher', role: 'dispatcher', email: 'dispatcher@festlift.pt' }, JWT_SECRET, { expiresIn: '1h' }),
    tech: jwt.sign({ userId: '3', username: 'tech', role: 'tech', email: 'tech1@festlift.pt' }, JWT_SECRET, { expiresIn: '1h' }),
    client: jwt.sign({ userId: '4', username: 'client', role: 'client', email: 'client@festlift.pt' }, JWT_SECRET, { expiresIn: '1h' })
};

async function testEndpoint(name, path, role, method = 'GET', body = null) {
    const start = Date.now();
    try {
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${tokens[role]}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (body) options.body = JSON.stringify(body);
        
        const response = await fetch(`${BASE_URL}${path}`, options);
        const time = Date.now() - start;
        
        const status = response.status;
        const statusText = response.statusText;
        
        let result = '✅';
        if (status >= 400) result = '❌';
        else if (status >= 300) result = '⚠️';
        
        console.log(`${result} ${name} [${role}] - ${status} ${statusText} (${time}ms)`);
        
        // Показати перші 200 символів відповіді
        if (status >= 400) {
            const text = await response.text();
            console.log(`   └─ ${text.substring(0, 150)}...`);
        }
        
        return { name, status, time, ok: response.ok };
    } catch (error) {
        const time = Date.now() - start;
        console.log(`❌ ${name} [${role}] - ERROR: ${error.message} (${time}ms)`);
        return { name, status: 0, time, ok: false, error: error.message };
    }
}

async function testAPIEndpoints() {
    console.log('🔍 ЕТАП 2: Тестування API Endpoints\n');
    console.log('📡 Формат: [STATUS] Endpoint [ROLE] - HTTP_CODE (TIME)\n');
    
    const results = [];
    
    // Health check
    console.log('🏥 Health & Status:');
    results.push(await testEndpoint('Health Check', '/api/health', 'admin'));
    
    // Authentication
    console.log('\n🔐 Authentication:');
    results.push(await testEndpoint('Auth Status', '/api/auth/status', 'admin'));
    results.push(await testEndpoint('Auth Status', '/api/auth/status', 'dispatcher'));
    results.push(await testEndpoint('Auth Status', '/api/auth/status', 'tech'));
    results.push(await testEndpoint('Auth Status', '/api/auth/status', 'client'));
    
    // Users
    console.log('\n👥 Users:');
    results.push(await testEndpoint('Get All Users', '/api/users', 'admin'));
    results.push(await testEndpoint('Get All Users', '/api/users', 'dispatcher'));
    results.push(await testEndpoint('Get Techs', '/api/users?role=tech', 'dispatcher'));
    results.push(await testEndpoint('Get Clients', '/api/users?role=client', 'admin'));
    
    // Lifts
    console.log('\n🏢 Lifts:');
    results.push(await testEndpoint('Get All Lifts', '/api/lifts', 'admin'));
    results.push(await testEndpoint('Get All Lifts', '/api/lifts', 'dispatcher'));
    results.push(await testEndpoint('Get All Lifts', '/api/lifts', 'client'));
    results.push(await testEndpoint('Get Lift Stats', '/api/lifts/stats', 'admin'));
    
    // Requests
    console.log('\n📋 Requests:');
    results.push(await testEndpoint('Get Requests', '/api/requests', 'admin'));
    results.push(await testEndpoint('Get Requests', '/api/requests', 'dispatcher'));
    results.push(await testEndpoint('Get Requests', '/api/requests', 'tech'));
    results.push(await testEndpoint('Get Requests', '/api/requests', 'client'));
    
    // Orçamentos
    console.log('\n💰 Orçamentos:');
    results.push(await testEndpoint('Get Orçamentos', '/api/orcamentos', 'admin'));
    results.push(await testEndpoint('Get Orçamentos', '/api/orcamentos', 'dispatcher'));
    results.push(await testEndpoint('Next Number', '/api/orcamentos/next-number', 'admin'));
    results.push(await testEndpoint('Next Number', '/api/orcamentos/next-number', 'dispatcher'));
    
    // AI
    console.log('\n🤖 AI Assistant:');
    results.push(await testEndpoint('AI Health', '/api/ai/health', 'admin'));
    
    // Analytics
    console.log('\n�� Analytics:');
    results.push(await testEndpoint('Dashboard Stats', '/api/analytics/dashboard', 'admin'));
    results.push(await testEndpoint('Dashboard Stats', '/api/analytics/dashboard', 'dispatcher'));
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 ПІДСУМОК ТЕСТУВАННЯ API:');
    console.log('='.repeat(60));
    
    const total = results.length;
    const passed = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok).length;
    const avgTime = Math.round(results.reduce((sum, r) => sum + r.time, 0) / total);
    const maxTime = Math.max(...results.map(r => r.time));
    
    console.log(`✅ Успішно: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
    console.log(`❌ Помилок: ${failed}/${total}`);
    console.log(`⏱️  Середній час: ${avgTime}ms`);
    console.log(`⏱️  Максимальний час: ${maxTime}ms`);
    
    if (failed > 0) {
        console.log('\n❌ Endpoints з помилками:');
        results.filter(r => !r.ok).forEach(r => {
            console.log(`  • ${r.name} - ${r.status || 'ERROR'}`);
        });
    }
    
    console.log('\n✅ ЕТАП 2 ЗАВЕРШЕНО\n');
}

testAPIEndpoints().then(() => process.exit(0)).catch(err => {
    console.error('❌ Критична помилка:', err);
    process.exit(1);
});
