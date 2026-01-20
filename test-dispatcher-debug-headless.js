const puppeteer = require('puppeteer');

(async () => {
    console.log('\n🔍 ДЕТАЛЬНИЙ ДЕБАГ: Dispatcher Login\n');
    console.log('════════════════════════════════════════════════════════════\n');

    const browser = await puppeteer.launch({
        headless: true, // В Codespaces немає X server
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Логування всіх console.log з браузера
    page.on('console', msg => {
        console.log('🌐 Browser:', msg.text());
    });

    // Логування всіх помилок
    page.on('pageerror', error => {
        console.error('❌ JS Error:', error.message);
    });

    // Логування запитів
    const apiCalls = [];
    page.on('request', request => {
        if (request.url().includes('/api/') || request.url().includes('login') || request.url().includes('dashboard')) {
            apiCalls.push({
                type: 'request',
                method: request.method(),
                url: request.url(),
                time: Date.now()
            });
        }
    });

    // Логування відповідей
    page.on('response', async response => {
        if (response.url().includes('/api/') || response.url().includes('login') || response.url().includes('dashboard')) {
            const responseData = {
                type: 'response',
                status: response.status(),
                url: response.url(),
                time: Date.now()
            };
            
            if (response.url().includes('/api/')) {
                try {
                    const text = await response.text();
                    responseData.body = text.substring(0, 300);
                } catch (e) {
                    responseData.body = 'Cannot read body';
                }
            }
            
            apiCalls.push(responseData);
        }
    });

    try {
        console.log('1️⃣ Відкриваю pages/auth/login.html...');
        const startTime = Date.now();
        await page.goto('http://localhost:5000/pages/auth/login.html', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        console.log(`   ✅ Завантажено за ${Date.now() - startTime}ms\n`);

        console.log('2️⃣ Заповнюю форму логіну для dispatcher (dispatcher@festlift.pt)...');
        await page.type('#email', 'dispatcher@festlift.pt', { delay: 50 });
        await page.type('#password', 'dispatcher123', { delay: 50 });

        console.log('3️⃣ Натискаю кнопку Login...');
        const loginTime = Date.now();
        await page.click('button[type="submit"]');

        console.log('4️⃣ Чекаю 3 секунди на обробку...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('\n📊 API Calls Log:');
        apiCalls.forEach((call, i) => {
            if (call.type === 'request') {
                console.log(`   ${i+1}. 📤 ${call.method} ${call.url}`);
            } else {
                console.log(`   ${i+1}. 📥 ${call.status} ${call.url}`);
                if (call.body) {
                    console.log(`      Body: ${call.body}`);
                }
            }
        });

        console.log('\n5️⃣ Перевіряю поточний URL...');
        const currentUrl = page.url();
        console.log(`   URL: ${currentUrl}`);

        console.log('\n6️⃣ Перевіряю localStorage...');
        const storage = await page.evaluate(() => ({
            token: localStorage.getItem('token'),
            userRole: localStorage.getItem('userRole'),
            userName: localStorage.getItem('userName'),
            userEmail: localStorage.getItem('userEmail'),
            allKeys: Object.keys(localStorage)
        }));
        console.log(`   Token: ${storage.token ? storage.token.substring(0, 50) + '...' : 'NOT FOUND'}`);
        console.log(`   Role: ${storage.userRole || 'NOT FOUND'}`);
        console.log(`   Name: ${storage.userName || 'NOT FOUND'}`);
        console.log(`   Email: ${storage.userEmail || 'NOT FOUND'}`);
        console.log(`   All Keys: ${storage.allKeys.join(', ')}`);

        console.log('\n7️⃣ Перевіряю чи є модальні вікна (display: block або visible)...');
        const visibleModals = await page.evaluate(() => {
            const allModals = document.querySelectorAll('.modal, [class*="modal"], [id*="modal"]');
            return Array.from(allModals)
                .filter(m => {
                    const style = window.getComputedStyle(m);
                    return style.display !== 'none' && style.visibility !== 'hidden';
                })
                .map(m => ({
                    id: m.id,
                    className: m.className,
                    text: m.textContent.substring(0, 100).trim()
                }));
        });
        console.log(`   Visible Modals: ${visibleModals.length}`);
        if (visibleModals.length > 0) {
            console.log('   Details:', JSON.stringify(visibleModals, null, 2));
        }

        console.log('\n8️⃣ Перевіряю чи є role selector або buttons...');
        const roleElements = await page.evaluate(() => {
            const buttons = document.querySelectorAll('button, a, [role="button"]');
            return Array.from(buttons)
                .filter(b => {
                    const text = b.textContent.toLowerCase();
                    return text.includes('dispatcher') || text.includes('диспетчер') || 
                           text.includes('role') || text.includes('роль');
                })
                .map(b => ({
                    tag: b.tagName,
                    text: b.textContent.substring(0, 50).trim(),
                    visible: window.getComputedStyle(b).display !== 'none'
                }));
        });
        console.log(`   Role Elements: ${roleElements.length}`);
        if (roleElements.length > 0) {
            console.log('   Details:', JSON.stringify(roleElements, null, 2));
        }

        console.log('\n9️⃣ Перевіряю title сторінки...');
        const pageTitle = await page.title();
        console.log(`   Title: "${pageTitle}"`);

        console.log('\n🔟 Робимо скріншот для аналізу...');
        await page.screenshot({ 
            path: '/workspaces/deapseak/temp/dispatcher-login-debug.png',
            fullPage: true 
        });
        console.log('   ✅ Скріншот збережено: temp/dispatcher-login-debug.png');

        console.log('\n1️⃣1️⃣ Перевіряю HTML структуру body...');
        const bodyStructure = await page.evaluate(() => {
            const body = document.body;
            const children = Array.from(body.children).slice(0, 10);
            return children.map(c => ({
                tag: c.tagName,
                id: c.id,
                className: c.className.substring(0, 50),
                visible: window.getComputedStyle(c).display !== 'none'
            }));
        });
        console.log('   Body Children (перші 10):');
        bodyStructure.forEach(s => console.log(`     - <${s.tag}> id="${s.id}" class="${s.className}" visible=${s.visible}`));

        console.log('\n1️⃣2️⃣ Чекаю ще 5 секунд на можливий автоматичний редирект...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const finalUrl = page.url();
        console.log(`   Final URL: ${finalUrl}`);

        if (finalUrl === currentUrl) {
            console.log('\n⚠️  ПРОБЛЕМА: Редиректу не відбулось!');
            console.log('   Очікувалось: /pages/dispatcher/dashboard.html або подібне');
            console.log(`   Фактично: ${finalUrl}`);
        } else {
            console.log('\n✅ Редирект відбувся!');
        }

        console.log('\n════════════════════════════════════════════════════════════');
        console.log('📋 ВИСНОВОК:');
        console.log('════════════════════════════════════════════════════════════');
        console.log(`Час з моменту login: ${Date.now() - loginTime}ms`);
        console.log(`Поточна сторінка: ${page.url()}`);
        console.log(`Token збережено: ${storage.token ? 'ТАК' : 'НІ'}`);
        console.log(`Role збережено: ${storage.userRole || 'НІ'}`);
        console.log(`Модальних вікон: ${visibleModals.length}`);
        console.log(`Role buttons: ${roleElements.length}`);

        await browser.close();

    } catch (error) {
        console.error('\n❌ КРИТИЧНА ПОМИЛКА:');
        console.error(`   Повідомлення: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
        await browser.close();
        process.exit(1);
    }
})();
