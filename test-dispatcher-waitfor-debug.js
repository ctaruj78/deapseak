const puppeteer = require('puppeteer');

(async () => {
    console.log('\n🔍 ПОРІВНЯННЯ: Чому dispatcher в quick test провалюється?\n');

    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.text().includes('Redirect') || msg.text().includes('redirectUserByRole')) {
            console.log('🌐', msg.text());
        }
    });

    try {
        console.log('1️⃣ Відкриваю login...');
        await page.goto('http://localhost:5000/pages/auth/login.html', {
            waitUntil: 'domcontentloaded',
            timeout: 10000
        });

        console.log('2️⃣ Вводжу dispatcher credentials...');
        await page.type('#email', 'dispatcher@festlift.pt');
        await page.type('#password', 'dispatcher123');

        console.log('3️⃣ Натискаю Login...');
        const startTime = Date.now();
        await page.click('button[type="submit"]');

        console.log('4️⃣ Чекаю на редирект (waitForFunction)...');
        
        // Логуємо URL кожну секунду
        const checkInterval = setInterval(async () => {
            const url = page.url();
            console.log(`   Поточний URL: ${url}`);
        }, 1000);

        try {
            await page.waitForFunction(
                () => !window.location.href.includes('login.html'),
                { timeout: 20000 }
            );
            clearInterval(checkInterval);
            
            const loginTime = Date.now() - startTime;
            console.log(`\n✅ Редирект виконано за ${loginTime}ms`);
            console.log(`   Final URL: ${page.url()}`);
            
        } catch (error) {
            clearInterval(checkInterval);
            console.log(`\n❌ Timeout після 20s`);
            console.log(`   URL залишився: ${page.url()}`);
            
            // Перевіряємо що є в localStorage
            const storage = await page.evaluate(() => ({
                token: localStorage.getItem('token'),
                userData: localStorage.getItem('userData')
            }));
            console.log(`   Token: ${storage.token ? 'ТАК' : 'НІ'}`);
            console.log(`   UserData: ${storage.userData ? 'ТАК' : 'НІ'}`);
            
            // Перевіряємо console.log в браузері
            const logs = await page.evaluate(() => {
                return window.__loginLogs || 'Немає логів';
            });
            console.log(`   Login Logs: ${logs}`);
        }

        await browser.close();

    } catch (error) {
        console.error('❌ ПОМИЛКА:', error.message);
        await browser.close();
    }
})();
