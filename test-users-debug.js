const puppeteer = require('puppeteer');

(async () => {
    console.log('🚀 Запуск...');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    
    let requestsPending = 0;
    
    page.on('console', msg => console.log('[CONSOLE]', msg.text()));
    page.on('pageerror', error => console.log('[ERROR]', error.message));
    page.on('request', req => {
        requestsPending++;
        console.log('[REQUEST]', requestsPending, req.url().substring(0, 80));
    });
    page.on('response', resp => {
        requestsPending--;
        if (resp.status() >= 400) {
            console.log('[BAD RESPONSE]', resp.status(), resp.url().substring(0, 60));
        }
    });
    page.on('requestfailed', req => {
        requestsPending--;
        console.log('[FAILED]', req.url().substring(0, 60), req.failure().errorText);
    });
    
    console.log('🔐 Логін...');
    await page.goto('http://localhost:5000/pages/auth/login.html', { waitUntil: 'networkidle2', timeout: 10000 });
    await page.type('#email', 'info@festlift.pt');
    await page.type('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    console.log('✅ Logged in');
    
    console.log('📄 Завантаження users.html...');
    try {
        await page.goto('http://localhost:5000/pages/admin/users.html', { 
            waitUntil: 'load',
            timeout: 20000 
        });
        console.log('✅ Page loaded (DOM ready)');
        
        console.log('⏳ Чекаємо 5 секунд для виконання JavaScript...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log(`📊 Pending requests: ${requestsPending}`);
        
    } catch (e) {
        console.error('❌ Error:', e.message);
    }
    
    await browser.close();
})();
