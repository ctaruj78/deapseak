const puppeteer = require('puppeteer');

(async () => {
    console.log('\n🔍 ТЕСТ: Admin Login з повним логуванням\n');

    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Логуємо ВСЕ з консолі браузера
    page.on('console', msg => console.log('🌐', msg.text()));
    page.on('pageerror', error => console.error('❌ JS Error:', error.message));

    // Очистити context
    await page.evaluateOnNewDocument(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    await page.goto('http://localhost:5000/pages/auth/login.html', {
        waitUntil: 'networkidle2',
        timeout: 10000
    });

    console.log(`URL після goto: ${page.url()}\n`);

    await page.type('#email', 'info@festlift.pt');
    await page.type('#password', 'admin123');

    console.log('Натискаю Login...\n');
    await page.click('button[type="submit"]');

    // Чекаємо 8 секунд і логуємо URL кожну секунду
    for (let i = 1; i <= 8; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const url = page.url();
        const token = await page.evaluate(() => localStorage.getItem('token'));
        console.log(`${i}s: URL=${url.split('/').slice(-1)} Token=${token ? 'YES' : 'NO'}`);
    }

    console.log(`\nФінальний URL: ${page.url()}`);

    await browser.close();
})();
