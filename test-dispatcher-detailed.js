const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    console.log('\n🔍 ДЕТАЛЬНИЙ ТЕСТ DISPATCHER LOGIN\n');
    
    // Логування всього
    page.on('console', msg => console.log('[Browser]:', msg.text()));
    page.on('pageerror', err => console.log('[ERROR]:', err.message));
    page.on('request', req => {
        if (req.url().includes('/api/auth/login')) {
            console.log('[REQUEST]:', req.method(), req.url());
        }
    });
    page.on('response', res => {
        if (res.url().includes('/api/auth/login')) {
            console.log('[RESPONSE]:', res.status(), res.url());
        }
    });
    
    console.log('1️⃣ Відкриваю login page...');
    await page.goto('http://localhost:5000/pages/auth/login.html', { waitUntil: 'domcontentloaded' });
    console.log('   URL:', page.url());
    
    console.log('\n2️⃣ Вводжу credentials...');
    await page.type('#email', 'dispatcher@festlift.pt');
    await page.type('#password', 'dispatcher123');
    
    console.log('\n3️⃣ Натискаю login button...');
    await page.click('button[type="submit"]');
    
    console.log('\n4️⃣ Моніторинг URL змін (кожні 500ms):');
    for (let i = 0; i <= 10; i++) {
        await new Promise(r => setTimeout(r, 500));
        const url = await page.evaluate(() => window.location.href);
        const shortUrl = url.split('/').slice(-2).join('/');
        console.log('   ', (i * 500 + 'ms').padStart(7), '→', shortUrl);
        
        if (url.includes('dashboard.html')) {
            console.log('\n✅ УСПІХ! Dashboard завантажено');
            break;
        }
    }
    
    const finalUrl = await page.evaluate(() => window.location.href);
    console.log('\n📍 Фінальний URL:', finalUrl);
    console.log(finalUrl.includes('dashboard.html') ? '✅ SUCCESS' : '❌ FAILED');
    
    await browser.close();
    process.exit(0);
})();
