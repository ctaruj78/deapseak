/**
 * 🔍 ТЕСТ ВІДСУТНОСТІ AI ВІДЖЕТА
 * Перевіряє що inline AI віджет видалено з усіх сторінок
 */

const puppeteer = require('puppeteer');
const BASE_URL = 'http://localhost:5000';

const PAGES_TO_CHECK = [
    { role: 'dispatcher', path: '/pages/dispatcher/lifts.html', name: 'Dispatcher Lifts' },
    { role: 'dispatcher', path: '/pages/dispatcher/lifts-new.html', name: 'Dispatcher Lifts New' },
    { role: 'dispatcher', path: '/pages/dispatcher/qr-management.html', name: 'Dispatcher QR' },
    { role: 'dispatcher', path: '/pages/dispatcher/lifts-admin-style.html', name: 'Dispatcher Admin Style' },
    { role: 'admin', path: '/pages/admin/lifts.html', name: 'Admin Lifts' },
    { role: 'tech', path: '/pages/tech/dashboard.html', name: 'Tech Dashboard' },
    { role: 'client', path: '/pages/client/dashboard.html', name: 'Client Dashboard' }
];

const CREDENTIALS = {
    admin: { email: 'info@festlift.pt', password: 'admin123' },
    dispatcher: { email: 'dispatcher@festlift.pt', password: 'dispatcher123' },
    tech: { email: 'tech1@festlift.pt', password: 'tech123' },
    client: { email: 'client@festlift.pt', password: 'client123' }
};

async function login(page, role) {
    const creds = CREDENTIALS[role];
    
    await page.goto(`${BASE_URL}/pages/auth/login.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
    });
    
    await page.type('#email', creds.email);
    await page.type('#password', creds.password);
    await page.click('button[type="submit"]');
    
    await page.waitForFunction(
        () => !window.location.href.includes('login.html'),
        { timeout: 15000 }
    );
    
    await new Promise(r => setTimeout(r, 1000));
}

(async () => {
    console.log('\n🔍 ТЕСТ: Перевірка відсутності AI віджета\n');
    console.log('═'.repeat(60));
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const results = [];
    let currentRole = null;
    
    for (const pageInfo of PAGES_TO_CHECK) {
        const page = await browser.newPage();
        
        try {
            // Login якщо роль змінилась
            if (currentRole !== pageInfo.role) {
                console.log(`\n🔐 Логін як ${pageInfo.role}...`);
                await login(page, pageInfo.role);
                currentRole = pageInfo.role;
            }
            
            console.log(`\n📄 Тестування: ${pageInfo.name}`);
            console.log(`   URL: ${pageInfo.path}`);
            
            // Відкрити сторінку
            await page.goto(`${BASE_URL}${pageInfo.path}`, {
                waitUntil: 'domcontentloaded',
                timeout: 15000
            });
            
            await new Promise(r => setTimeout(r, 2000));
            
            // Перевірка наявності віджета
            const widgetCheck = await page.evaluate(() => {
                const checks = {
                    fabButton: document.querySelector('#ai-assistant-fab') !== null,
                    modal: document.querySelector('#ai-assistant-modal') !== null,
                    widgetClass: document.querySelector('[class*="ai-widget"]') !== null,
                    floatingChat: document.querySelector('[class*="floating"][class*="chat"]') !== null,
                    anyWidget: document.querySelectorAll('[id*="assistant"], [class*="assistant-fab"]').length
                };
                
                const hasWidget = checks.fabButton || checks.modal || checks.widgetClass || checks.floatingChat;
                
                return {
                    hasWidget,
                    details: checks
                };
            });
            
            if (widgetCheck.hasWidget) {
                console.log('   ❌ ЗНАЙДЕНО ВІДЖЕТ!');
                console.log('   Деталі:', JSON.stringify(widgetCheck.details, null, 2));
                results.push({
                    page: pageInfo.name,
                    status: 'FAIL',
                    widget: widgetCheck.details
                });
            } else {
                console.log('   ✅ Віджет відсутній (OK)');
                results.push({
                    page: pageInfo.name,
                    status: 'PASS'
                });
            }
            
        } catch (error) {
            console.log(`   ⚠️  Помилка: ${error.message}`);
            results.push({
                page: pageInfo.name,
                status: 'ERROR',
                error: error.message
            });
        } finally {
            await page.close();
        }
    }
    
    await browser.close();
    
    // Підсумок
    console.log('\n' + '═'.repeat(60));
    console.log('📊 ПІДСУМОК');
    console.log('═'.repeat(60) + '\n');
    
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const errors = results.filter(r => r.status === 'ERROR').length;
    
    console.log(`✅ Пройдено: ${passed}/${results.length}`);
    console.log(`❌ Провалено: ${failed}/${results.length}`);
    console.log(`⚠️  Помилок: ${errors}/${results.length}\n`);
    
    if (failed > 0) {
        console.log('❌ ЗНАЙДЕНО ВІДЖЕТ НА СТОРІНКАХ:');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`   • ${r.page}`);
        });
        console.log();
    }
    
    if (passed === results.length) {
        console.log('🎉 ТЕСТ ПРОЙДЕНО! AI віджет видалено з усіх сторінок.\n');
        process.exit(0);
    } else {
        console.log('⚠️  ТЕСТ ПРОВАЛЕНО! Віджет залишився на деяких сторінках.\n');
        process.exit(1);
    }
})();
