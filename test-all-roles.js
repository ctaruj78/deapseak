/**
 * 🧪 ШВИДКЕ ТЕСТУВАННЯ ВСІХ РОЛЕЙ + QR CODES
 */

const puppeteer = require('puppeteer');

const roles = [
    { name: '👨‍💼 Admin', email: 'info@festlift.pt', pass: 'admin123', qr: '/pages/admin/lifts.html' },
    { name: '📞 Dispatcher', email: 'dispatcher@festlift.pt', pass: 'dispatcher123', qr: '/pages/dispatcher/lifts.html' },
    { name: '🔧 Tech', email: 'tech1@festlift.pt', pass: 'tech123', qr: null },
    { name: '👤 Client', email: 'client@festlift.pt', pass: 'client123', qr: null }
];

(async () => {
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║  🧪 ТЕСТУВАННЯ ВСІХ ПАНЕЛЕЙ + QR CODES          ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    for (const role of roles) {
        // Використовуємо окремий incognito context для кожної ролі
        const context = await browser.createBrowserContext();
        const page = await context.newPage();
        
        try {
            // 1. Login test
            await page.goto('http://localhost:5000/pages/auth/login.html', { 
                waitUntil: 'domcontentloaded', 
                timeout: 10000 
            });
            
            await page.type('#email', role.email);
            await page.type('#password', role.pass);
            
            const loginStart = Date.now();
            
            // Простий підхід: click і чекати
            await page.click('button[type="submit"]');
            await new Promise(resolve => setTimeout(resolve, 2000)); // Даємо час на redirect + JS load
            
            const loginTime = Date.now() - loginStart;
            
            const dashboardUrl = await page.evaluate(() => window.location.href);
            const loginSuccess = !dashboardUrl.includes('login.html');
            
            console.log(
                loginSuccess ? '✅' : '❌', 
                role.name.padEnd(18), 
                (loginTime + 'ms').padStart(7), 
                '→', 
                dashboardUrl.split('/').pop()
            );
            
            // 2. QR test (for admin & dispatcher)
            if (loginSuccess && role.qr) {
                const qrStart = Date.now();
                await page.goto('http://localhost:5000' + role.qr, { 
                    waitUntil: 'networkidle0', 
                    timeout: 10000 
                });
                const qrTime = Date.now() - qrStart;
                
                // Check for QR code elements
                const qrElements = await page.evaluate(() => {
                    const qrDivs = document.querySelectorAll('[id*="qr"], [class*="qr"]');
                    const canvases = document.querySelectorAll('canvas');
                    const qrButtons = document.querySelectorAll('button[onclick*="QR"], button[onclick*="qr"]');
                    
                    return {
                        qrDivs: qrDivs.length,
                        canvases: canvases.length,
                        qrButtons: qrButtons.length,
                        total: qrDivs.length + canvases.length + qrButtons.length
                    };
                });
                
                const hasQR = qrElements.total > 0;
                
                console.log(
                    '   ', 
                    hasQR ? '📱 QR:' : '⚠️  QR:', 
                    (qrTime + 'ms').padStart(7), 
                    hasQR ? `READY (${qrElements.qrButtons} buttons, ${qrElements.canvases} canvas)` : 'NOT FOUND'
                );
            }
            
        } catch (error) {
            console.log('❌', role.name.padEnd(18), 'TIMEOUT →', error.message.substring(0, 50));
        }
        
        await page.close();
        await context.close();
    }
    
    await browser.close();
    console.log('\n🎯 Тестування завершено!\n');
    process.exit(0);
})();
