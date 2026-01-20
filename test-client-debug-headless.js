const puppeteer = require('puppeteer');

(async () => {
    console.log('\n🔍 ДЕТАЛЬНИЙ ДЕБАГ: Client Login\n');
    console.log('════════════════════════════════════════════════════════════\n');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    page.on('console', msg => console.log('🌐 Browser:', msg.text()));
    page.on('pageerror', error => console.error('❌ JS Error:', error.message));

    const apiCalls = [];
    page.on('request', request => {
        if (request.url().includes('/api/') || request.url().includes('pages/')) {
            apiCalls.push({ type: 'request', method: request.method(), url: request.url() });
        }
    });

    page.on('response', async response => {
        if (response.url().includes('/api/')) {
            const data = { type: 'response', status: response.status(), url: response.url() };
            try {
                const text = await response.text();
                data.body = text.substring(0, 300);
            } catch (e) {}
            apiCalls.push(data);
        }
    });

    try {
        console.log('1️⃣ Відкриваю pages/auth/login.html...');
        await page.goto('http://localhost:5000/pages/auth/login.html', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('2️⃣ Заповнюю форму логіну для client (client@festlift.pt)...');
        await page.type('#email', 'client@festlift.pt', { delay: 50 });
        await page.type('#password', 'client123', { delay: 50 });

        console.log('3️⃣ Натискаю кнопку Login...');
        const loginTime = Date.now();
        await page.click('button[type="submit"]');

        console.log('4️⃣ Чекаю 8 секунд на обробку...');
        await new Promise(resolve => setTimeout(resolve, 8000));

        console.log('\n📊 API Calls:');
        apiCalls.slice(-10).forEach((call, i) => {
            if (call.type === 'request') {
                console.log(`   📤 ${call.method} ${call.url}`);
            } else {
                console.log(`   📥 ${call.status} ${call.url}`);
            }
        });

        const currentUrl = page.url();
        console.log(`\n5️⃣ URL: ${currentUrl}`);

        const storage = await page.evaluate(() => ({
            token: localStorage.getItem('token'),
            userRole: localStorage.getItem('userRole'),
            allKeys: Object.keys(localStorage)
        }));
        console.log(`\n6️⃣ Token: ${storage.token ? 'ТАК' : 'НІ'}`);
        console.log(`   Role: ${storage.userRole || 'НІ'}`);

        const pageTitle = await page.title();
        console.log(`\n7️⃣ Title: "${pageTitle}"`);

        await page.screenshot({ 
            path: '/workspaces/deapseak/temp/client-login-debug.png',
            fullPage: true 
        });
        console.log('   ✅ Скріншот: temp/client-login-debug.png');

        console.log('\n════════════════════════════════════════════════════════════');
        console.log('📋 ВИСНОВОК:');
        console.log(`Час: ${Date.now() - loginTime}ms`);
        console.log(`URL: ${currentUrl}`);
        console.log(`Token: ${storage.token ? 'ТАК' : 'НІ'}`);
        console.log(`Успіх: ${currentUrl.includes('/client/') ? 'ТАК ✅' : 'НІ ❌'}`);

        await browser.close();

    } catch (error) {
        console.error('\n❌ ПОМИЛКА:', error.message);
        await browser.close();
        process.exit(1);
    }
})();
