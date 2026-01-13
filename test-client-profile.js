/**
 * Тест перевірки даних клієнта в localStorage та API
 */

const http = require('http');

async function makeRequest(endpoint, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: endpoint,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(body)
                    });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function loginAndTest(email, password) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🔐 Тест авторизації: ${email}`);
    console.log('='.repeat(70));

    // Логін
    const loginData = JSON.stringify({ email, password });
    const loginReq = new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(loginData)
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(body)
                    });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        req.write(loginData);
        req.end();
    });

    const loginResponse = await loginReq;

    if (loginResponse.status !== 200 || !loginResponse.data.token) {
        console.log('❌ Помилка авторизації:', loginResponse.status);
        console.log(loginResponse.data);
        return;
    }

    const token = loginResponse.data.token;
    console.log('✅ Успішна авторизація');
    console.log(`Token: ${token.substring(0, 30)}...`);

    // Декодуємо JWT (без верифікації)
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        console.log('\n📋 JWT Payload:');
        console.log(JSON.stringify(payload, null, 2));
    }

    // Запит /api/users/me
    console.log('\n📡 GET /api/users/me');
    const meResponse = await makeRequest('/api/users/me', token);
    
    if (meResponse.status === 200) {
        console.log('✅ Профіль отримано:');
        console.log(JSON.stringify(meResponse.data, null, 2));
    } else {
        console.log('❌ Помилка отримання профілю:', meResponse.status);
        console.log(meResponse.data);
    }

    // Запит /api/lifts (для клієнта)
    console.log('\n📡 GET /api/lifts (мої ліфти)');
    const liftsResponse = await makeRequest('/api/lifts', token);
    
    if (liftsResponse.status === 200) {
        const lifts = liftsResponse.data.data || liftsResponse.data.lifts || liftsResponse.data;
        console.log(`✅ Отримано ${lifts.length} ліфтів`);
        if (lifts.length > 0) {
            console.log('\nПриклади ліфтів:');
            lifts.slice(0, 3).forEach((lift, i) => {
                console.log(`  ${i+1}. ${lift.municipalNumber} - ${lift.address?.street || 'N/A'}`);
            });
        } else {
            console.log('⚠️  У цього клієнта немає ліфтів!');
        }
    } else {
        console.log('❌ Помилка отримання ліфтів:', liftsResponse.status);
        console.log(liftsResponse.data);
    }
}

// Тестування різних клієнтів
(async () => {
    await loginAndTest('client@deapseak.com', 'client123');
    await loginAndTest('client@festlift.pt', 'client123');
    await loginAndTest('client2@deapseak.com', 'client123');
    
    console.log('\n' + '='.repeat(70));
    console.log('🏁 Тестування завершено');
    console.log('='.repeat(70) + '\n');
})();
