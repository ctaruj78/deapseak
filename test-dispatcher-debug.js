/**
 * 🔍 ДЕТАЛЬНИЙ ТЕСТ DISPATCHER LOGIN
 * З виводом console.log з браузера
 */

const puppeteer = require('puppeteer');
const BASE_URL = 'http://localhost:5000';

(async () => {
    console.log('\n🔍 ДЕТАЛЬНИЙ ТЕСТ: Dispatcher Login\n');
    
    const browser = await puppeteer.launch({
        headless: false, // Відкрити браузер
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        devtools: true // Відкрити DevTools
    });
    
    const page = await browser.newPage();
    
    // Логування всіх console.log з браузера
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        const icon = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '💬';
        console.log(`${icon} [Browser ${type}]: ${text}`);
    });
    
    page.on('pageerror', error => {
        console.log('❌ [Browser error]:', error.message);
    });
    
    page.on('requestfailed', request => {
        console.log('❌ [Request failed]:', request.url(), request.failure().errorText);
    });
    
    try {
        console.log('📄 Відкриваю login.html...\n');
        await page.goto(`${BASE_URL}/pages/auth/login.html`, {
            waitUntil: 'domcontentloaded',
            timeout: 10000
        });
        
        console.log('⌨️  Вводжу дані...\n');
        await page.type('#email', 'dispatcher@festlift.pt');
        await page.type('#password', 'dispatcher123');
        
        console.log('🔐 Натискаю Login...\n');
        await page.click('button[type="submit"]');
        
        console.log('⏳ Чекаю перенаправлення (макс 20с)...\n');
        
        // Чекати або зміни URL або timeout
        const result = await Promise.race([
            page.waitForFunction(
                () => !window.location.href.includes('login.html'),
                { timeout: 20000 }
            ).then(() => 'success'),
            new Promise(resolve => setTimeout(() => resolve('timeout'), 20000))
        ]);
        
        const currentUrl = page.url();
        console.log(`\n📍 Поточний URL: ${currentUrl}`);
        
        if (result === 'success') {
            console.log('✅ Успішно перенаправлено!\n');
        } else {
            console.log('❌ Timeout! URL не змінився.\n');
            
            // Перевірка наявності елементів
            const hasModal = await page.evaluate(() => {
                return document.querySelector('.modal.show') !== null;
            });
            
            console.log(`🔍 Модальне вікно відкрите: ${hasModal}`);
            
            if (hasModal) {
                console.log('⏸️  Залишаю браузер відкритим на 10с для перевірки...');
                await new Promise(r => setTimeout(r, 10000));
            }
        }
        
    } catch (error) {
        console.error('❌ Помилка:', error.message);
    } finally {
        console.log('\n✅ Тест завершено\n');
        await browser.close();
    }
})();
