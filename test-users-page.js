const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    // Перехоплювати все
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', req => console.log('REQUEST FAILED:', req.url(), req.failure().errorText));
    page.on('response', resp => {
        if (resp.status() >= 400) {
            console.log('BAD RESPONSE:', resp.status(), resp.url());
        }
    });
    
    // Логін
    console.log('Логін...');
    await page.goto('http://localhost:5000/pages/auth/login.html', { waitUntil: 'networkidle2' });
    await page.type('#email', 'info@festlift.pt');
    await page.type('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    console.log('Перехід на users.html...');
    await page.goto('http://localhost:5000/pages/admin/users.html', { 
        waitUntil: 'load', // Змінено на 'load' замість 'networkidle'
        timeout: 30000 
    });
    
    console.log('✅ Сторінка завантажена!');
    
    // Чекаємо 10 секунд щоб побачити що відбувається
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    await browser.close();
    console.log('Тест завершено');
})();
