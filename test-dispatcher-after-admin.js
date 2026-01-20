const puppeteer = require('puppeteer');

(async () => {
    console.log('\n🔍 SIMULATOR: Quick Test Dispatcher Context\n');

    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Test 1: Admin (як в quick test)
    console.log('Test 1: Admin (щоб симулювати попередній тест)...');
    let page1 = await browser.newPage();
    await page1.goto('http://localhost:5000/pages/auth/login.html', { waitUntil: 'networkidle2' });
    await page1.type('#email', 'info@festlift.pt');
    await page1.type('#password', 'admin123');
    await page1.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 10000));
    console.log(`Admin result: ${page1.url().split('/').pop()}`);
    await page1.close();
    await new Promise(r => setTimeout(r, 1000)); // Затримка як в quick test

    // Test 2: Dispatcher (проблемний)
    console.log('\nTest 2: Dispatcher (після Admin)...');
    let page2 = await browser.newPage();
    
    page2.on('console', msg => {
        if (msg.text().includes('200') || msg.text().includes('redirect') || msg.text().includes('✅') || msg.text().includes('❌')) {
            console.log('  🌐', msg.text());
        }
    });
    page2.on('pageerror', error => console.error('  ❌', error.message));

    await page2.goto('http://localhost:5000/pages/auth/login.html', { waitUntil: 'networkidle2' });
    
    console.log('Вводжу dispatcher credentials...');
    await page2.type('#email', 'dispatcher@festlift.pt');
    await page2.type('#password', 'dispatcher123');
    
    console.log('Клік Submit...');
    await page2.click('button[type="submit"]');

    // Логуємо кожну секунду
    for (let i = 1; i <= 10; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const url = page2.url();
        const token = await page2.evaluate(() => localStorage.getItem('token'));
        const shortUrl = url.split('/').pop();
        console.log(`  ${i}s: ${shortUrl} | Token: ${token ? 'YES' : 'NO'}`);
        
        if (shortUrl !== 'login.html') {
            console.log(`  ✅ Redirect SUCCESS at ${i}s!`);
            break;
        }
    }

    const finalUrl = page2.url();
    console.log(`\n Фінальний URL: ${finalUrl}`);
    console.log(`Успіх: ${finalUrl.includes('/dispatcher/') ? 'ТАК' : 'НІ'}`);

    await browser.close();
})();
