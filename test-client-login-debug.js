const puppeteer = require('puppeteer');

(async () => {
    console.log('\n🔍 ДЕТАЛЬНИЙ ДЕБАГ: Client Login\n');
    console.log('════════════════════════════════════════════════════════════\n');

    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 100,
        devtools: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    page.on('console', msg => console.log('🌐 Browser Console:', msg.text()));
    page.on('pageerror', error => console.error('❌ Page Error:', error.message));
    
    page.on('request', request => {
        if (request.url().includes('/api/')) {
            console.log('📤 Request:', request.method(), request.url());
        }
    });

    page.on('response', async response => {
        if (response.url().includes('/api/')) {
            console.log('📥 Response:', response.status(), response.url());
            if (response.status() !== 200 && response.status() !== 304) {
                try {
                    const text = await response.text();
                    console.log('   Body:', text.substring(0, 200));
                } catch (e) {}
            }
        }
    });

    try {
        console.log('1️⃣ Відкриваю login.html...');
        await page.goto('http://localhost:5000/login.html', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('2️⃣ Заповнюю форму логіну для client...');
        await page.type('#email', 'maria.costa@example.com');
        await page.type('#password', 'Solomia1704fel!');

        console.log('3️⃣ Натискаю кнопку Login...');
        await page.click('button[type="submit"]');

        console.log('4️⃣ Чекаю на відповідь від API...');
        await page.waitForTimeout(2000);

        console.log('5️⃣ Перевіряю URL після логіну...');
        const currentUrl = page.url();
        console.log('   Current URL:', currentUrl);

        console.log('6️⃣ Перевіряю localStorage...');
        const token = await page.evaluate(() => localStorage.getItem('token'));
        const userRole = await page.evaluate(() => localStorage.getItem('userRole'));
        console.log('   Token:', token ? token.substring(0, 50) + '...' : 'NOT FOUND');
        console.log('   User Role:', userRole);

        console.log('7️⃣ Перевіряю чи є модальні вікна...');
        const modals = await page.evaluate(() => {
            const allModals = document.querySelectorAll('.modal, [class*="modal"], [id*="modal"]');
            return Array.from(allModals).map(m => ({
                id: m.id,
                className: m.className,
                display: window.getComputedStyle(m).display,
                visibility: window.getComputedStyle(m).visibility
            }));
        });
        console.log('   Modals:', JSON.stringify(modals, null, 2));

        console.log('8️⃣ Перевіряю чи є елементи для вибору ролі...');
        const roleSelectors = await page.evaluate(() => {
            const selectors = document.querySelectorAll('[data-role], .role-select, #role-selector');
            return Array.from(selectors).map(s => ({
                tag: s.tagName,
                id: s.id,
                className: s.className,
                text: s.textContent.substring(0, 50)
            }));
        });
        console.log('   Role Selectors:', JSON.stringify(roleSelectors, null, 2));

        console.log('9️⃣ Чекаю 10 секунд для manual inspection...');
        await page.waitForTimeout(10000);

        console.log('\n✅ Дебаг завершено. Перевірте відкритий браузер!');
        console.log('   Натисніть Ctrl+C щоб закрити.\n');

        await new Promise(() => {});

    } catch (error) {
        console.error('\n❌ ПОМИЛКА:', error.message);
        console.error('   Stack:', error.stack);
    }
})();
