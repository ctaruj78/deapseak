/**
 * 🔐 ШВИДКИЙ ТЕСТ ЛОГІНІВ
 * Перевіряє чи всі ролі можуть увійти
 */

const puppeteer = require('puppeteer');
const BASE_URL = 'http://localhost:5000';

const ROLES = [
    { name: 'Admin', email: 'info@festlift.pt', password: 'admin123' },
    { name: 'Dispatcher', email: 'dispatcher@festlift.pt', password: 'dispatcher123' },
    { name: 'Tech', email: 'tech1@festlift.pt', password: 'tech123' },
    { name: 'Client', email: 'client@festlift.pt', password: 'client123' }
];

(async () => {
    console.log('\n🔐 ТЕСТ ЛОГІНІВ ДЛЯ ВСІХ РОЛЕЙ\n');
    
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const results = [];
    
    for (const role of ROLES) {
        const page = await browser.newPage();
        
        try {
            console.log(`   📋 Тестування: ${role.name}`);
            
            // Відкрити логін
            await page.goto(`${BASE_URL}/pages/auth/login.html`, {
                waitUntil: 'domcontentloaded',
                timeout: 10000
            });
            
            // Ввести дані
            await page.type('#email', role.email);
            await page.type('#password', role.password);
            
            // Логін
            const startTime = Date.now();
            await page.click('button[type="submit"]');
            
            // Чекати зміни URL
            await page.waitForFunction(
                () => !window.location.href.includes('login.html'),
                { timeout: 15000 }
            );
            
            const loginTime = Date.now() - startTime;
            const finalUrl = page.url();
            
            console.log(`   ✅ ${role.name}: ${loginTime}ms → ${finalUrl.split('/').pop()}\n`);
            
            results.push({
                role: role.name,
                status: 'success',
                time: loginTime,
                url: finalUrl
            });
            
        } catch (error) {
            console.log(`   ❌ ${role.name}: ${error.message}\n`);
            results.push({
                role: role.name,
                status: 'failed',
                error: error.message
            });
        } finally {
            await page.close();
        }
    }
    
    await browser.close();
    
    // Підсумок
    console.log('═'.repeat(60));
    console.log('📊 РЕЗУЛЬТАТИ');
    console.log('═'.repeat(60) + '\n');
    
    const success = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    
    results.forEach(r => {
        const icon = r.status === 'success' ? '✅' : '❌';
        const info = r.status === 'success' 
            ? `${r.time}ms` 
            : r.error.substring(0, 50);
        console.log(`${icon} ${r.role.padEnd(12)} - ${info}`);
    });
    
    console.log(`\n✅ Успішно: ${success}/${ROLES.length}`);
    console.log(`❌ Помилок: ${failed}/${ROLES.length}`);
    console.log(`📈 Успішність: ${(success/ROLES.length*100).toFixed(1)}%\n`);
    
    if (success === ROLES.length) {
        console.log('🎉 ВСІ РОЛІ ПРАЦЮЮТЬ!\n');
    }
})();
