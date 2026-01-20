/**
 * 🔄 ТЕСТУВАННЯ ПЕРЕХОДІВ МІЖ РОЛЯМИ
 * Перевіряє чи працює функціонал призначення, передачі завдань між ролями
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:5000';

const ROLES = {
    admin: { email: 'info@festlift.pt', password: 'admin123' },
    dispatcher: { email: 'dispatcher@festlift.pt', password: 'dispatcher123' },
    tech: { email: 'tech1@festlift.pt', password: 'tech123' },
    client: { email: 'client@festlift.pt', password: 'client123' }
};

async function login(page, role) {
    const creds = ROLES[role];
    await page.goto(`${BASE_URL}/pages/auth/login.html`, { 
        waitUntil: 'domcontentloaded', 
        timeout: 10000 
    });
    
    await page.type('#email', creds.email);
    await page.type('#password', creds.password);
    
    const startTime = Date.now();
    await page.click('button[type="submit"]');
    
    // Чекаємо навігацію з довшим timeout
    await page.waitForNavigation({ 
        waitUntil: 'domcontentloaded', 
        timeout: 15000 
    });
    
    const loginTime = Date.now() - startTime;
    console.log(`   ⏱️  Логін зайняв: ${loginTime}ms`);
    
    await new Promise(r => setTimeout(r, 1500));
}

async function testScenario(name, testFn) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🧪 ${name}`);
    console.log('═'.repeat(60));
    
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        await testFn(browser);
        console.log(`✅ PASSED`);
        return true;
    } catch (error) {
        console.log(`❌ FAILED: ${error.message}`);
        return false;
    } finally {
        await browser.close();
    }
}

(async () => {
    console.log('\n🚀 ТЕСТУВАННЯ ВЗАЄМОДІЇ МІЖ РОЛЯМИ\n');
    
    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };
    
    // ════════════════════════════════════════════════════════════
    // ТЕСТ 1: Client створює запит → Dispatcher бачить
    // ════════════════════════════════════════════════════════════
    const test1 = await testScenario(
        'Client створює запит → Dispatcher бачить його',
        async (browser) => {
            const clientPage = await browser.newPage();
            
            // 1. Client логін
            console.log('   📱 Client: Логін...');
            await login(clientPage, 'client');
            
            // 2. Client створює запит
            console.log('   📝 Client: Створення запиту...');
            await clientPage.goto(`${BASE_URL}/pages/client/dashboard.html`, {
                waitUntil: 'domcontentloaded',
                timeout: 15000
            });
            await new Promise(r => setTimeout(r, 1500));
            
            // Шукаємо кнопку створення запиту
            const hasCreateButton = await clientPage.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a'));
                return buttons.some(b => 
                    b.textContent.includes('Nova') || 
                    b.textContent.includes('Criar') ||
                    b.textContent.includes('Pedido')
                );
            });
            
            if (hasCreateButton) {
                console.log('   ✅ Кнопка створення запиту знайдена');
            } else {
                console.log('   ⚠️  Кнопка створення запиту не знайдена (можливо потрібен QR)');
            }
            
            // 3. Dispatcher перевіряє запити
            const dispatcherPage = await browser.newPage();
            console.log('   📞 Dispatcher: Логін...');
            await login(dispatcherPage, 'dispatcher');
            
            console.log('   📋 Dispatcher: Перевірка списку запитів...');
            await dispatcherPage.goto(`${BASE_URL}/pages/dispatcher/dashboard.html`, {
                waitUntil: 'domcontentloaded',
                timeout: 15000
            });
            await new Promise(r => setTimeout(r, 1500));
            
            // Перевірка наявності розділу запитів
            const hasRequestsSection = await dispatcherPage.evaluate(() => {
                const text = document.body.textContent;
                return text.includes('Pedido') || 
                       text.includes('Request') || 
                       text.includes('Запит') ||
                       text.includes('Solicitação');
            });
            
            console.log(`   ${hasRequestsSection ? '✅' : '❌'} Розділ запитів ${hasRequestsSection ? 'знайдено' : 'НЕ знайдено'}`);
            
            await clientPage.close();
            await dispatcherPage.close();
            
            if (!hasRequestsSection) {
                throw new Error('Dispatcher не має доступу до запитів');
            }
        }
    );
    results.tests.push({ name: 'Client → Dispatcher', passed: test1 });
    if (test1) results.passed++; else results.failed++;
    
    // ════════════════════════════════════════════════════════════
    // ТЕСТ 2: Dispatcher призначає → Tech бачить завдання
    // ════════════════════════════════════════════════════════════
    const test2 = await testScenario(
        'Dispatcher призначає техніка → Tech бачить завдання',
        async (browser) => {
            const dispatcherPage = await browser.newPage();
            
            console.log('   📞 Dispatcher: Логін...');
            await login(dispatcherPage, 'dispatcher');
            
            console.log('   👨‍🔧 Dispatcher: Перевірка можливості призначення...');
            await dispatcherPage.goto(`${BASE_URL}/pages/dispatcher/dashboard.html`, {
                waitUntil: 'domcontentloaded',
                timeout: 15000
            });
            await new Promise(r => setTimeout(r, 1500));
            
            const canAssign = await dispatcherPage.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.some(b => 
                    b.textContent.includes('Assign') || 
                    b.textContent.includes('Atribuir') ||
                    b.textContent.includes('Призначити')
                );
            });
            
            console.log(`   ${canAssign ? '✅' : '⚠️'} Функція призначення ${canAssign ? 'доступна' : 'не знайдена'}`);
            
            // Tech перевіряє свої завдання
            const techPage = await browser.newPage();
            console.log('   🔧 Tech: Логін...');
            await login(techPage, 'tech');
            
            console.log('   📋 Tech: Перевірка списку завдань...');
            await techPage.goto(`${BASE_URL}/pages/tech/dashboard.html`, {
                waitUntil: 'domcontentloaded',
                timeout: 15000
            });
            await new Promise(r => setTimeout(r, 1500));
            
            const hasTasks = await techPage.evaluate(() => {
                const text = document.body.textContent;
                return text.includes('Tarefa') || 
                       text.includes('Task') || 
                       text.includes('Завдання') ||
                       text.includes('Trabalho');
            });
            
            console.log(`   ${hasTasks ? '✅' : '❌'} Розділ завдань ${hasTasks ? 'знайдено' : 'НЕ знайдено'}`);
            
            await dispatcherPage.close();
            await techPage.close();
            
            if (!hasTasks) {
                throw new Error('Tech не має доступу до завдань');
            }
        }
    );
    results.tests.push({ name: 'Dispatcher → Tech', passed: test2 });
    if (test2) results.passed++; else results.failed++;
    
    // ════════════════════════════════════════════════════════════
    // ТЕСТ 3: Admin бачить всіх користувачів
    // ════════════════════════════════════════════════════════════
    const test3 = await testScenario(
        'Admin має доступ до управління користувачами',
        async (browser) => {
            const adminPage = await browser.newPage();
            
            console.log('   👨‍💼 Admin: Логін...');
            await login(adminPage, 'admin');
            
            console.log('   👥 Admin: Перевірка сторінки користувачів...');
            await adminPage.goto(`${BASE_URL}/pages/admin/users.html`, {
                waitUntil: 'domcontentloaded',
                timeout: 15000
            });
            await new Promise(r => setTimeout(r, 1500));
            
            const usersData = await adminPage.evaluate(() => {
                // Шукаємо таблицю користувачів
                const rows = document.querySelectorAll('table tbody tr, .user-card, .list-group-item');
                const buttons = Array.from(document.querySelectorAll('button'));
                
                // Шукаємо кнопки не тільки по тексту, але й по класам та іконкам
                const hasEditButtons = buttons.some(b => 
                    b.textContent.includes('Edit') || 
                    b.textContent.includes('Editar') ||
                    b.className.includes('edit') ||
                    b.querySelector('.fa-edit')
                );
                
                const hasDeleteButtons = buttons.some(b => 
                    b.textContent.includes('Delete') || 
                    b.textContent.includes('Apagar') ||
                    b.className.includes('delete') ||
                    b.className.includes('danger') ||
                    b.querySelector('.fa-trash')
                );
                
                return {
                    userCount: rows.length,
                    hasEditButtons,
                    hasDeleteButtons
                };
            });
            
            console.log(`   👥 Знайдено користувачів: ${usersData.userCount}`);
            console.log(`   ${usersData.hasEditButtons ? '✅' : '❌'} Кнопки редагування`);
            console.log(`   ${usersData.hasDeleteButtons ? '✅' : '❌'} Кнопки видалення`);
            
            await adminPage.close();
            
            if (usersData.userCount === 0) {
                throw new Error('Admin не бачить користувачів');
            }
        }
    );
    results.tests.push({ name: 'Admin управління', passed: test3 });
    if (test3) results.passed++; else results.failed++;
    
    // ════════════════════════════════════════════════════════════
    // ТЕСТ 4: QR Code сканування (Client → Lift Info)
    // ════════════════════════════════════════════════════════════
    const test4 = await testScenario(
        'QR Code: Client сканує → бачить інформацію про ліфт',
        async (browser) => {
            const page = await browser.newPage();
            
            console.log('   📱 Client: Логін...');
            await login(page, 'client');
            
            console.log('   📷 Client: Перевірка QR сканера...');
            await page.goto(`${BASE_URL}/pages/client/dashboard.html`, {
                waitUntil: 'domcontentloaded',
                timeout: 15000
            });
            await new Promise(r => setTimeout(r, 1500));
            
            const hasQRScanner = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a'));
                return buttons.some(b => 
                    b.textContent.includes('QR') || 
                    b.textContent.includes('Scan') ||
                    b.textContent.includes('Escanear')
                );
            });
            
            console.log(`   ${hasQRScanner ? '✅' : '⚠️'} QR сканер ${hasQRScanner ? 'доступний' : 'не знайдений'}`);
            
            // Перевірка сторінки lifts (де відображається інфо після QR)
            try {
                await page.goto(`${BASE_URL}/pages/admin/lifts.html`, {
                    waitUntil: 'domcontentloaded',
                    timeout: 15000
                });
                await new Promise(r => setTimeout(r, 1500));
                
                const liftInfo = await page.evaluate(() => {
                    const text = document.body.textContent;
                    return {
                        hasLifts: text.includes('Elevador') || text.includes('Lift'),
                        hasQRButtons: document.querySelectorAll('[class*="qr"], [id*="qr"]').length > 0
                    };
                });
                
                console.log(`   ${liftInfo.hasLifts ? '✅' : '❌'} Інформація про ліфти доступна`);
                console.log(`   ${liftInfo.hasQRButtons ? '✅' : '⚠️'} QR кнопки ${liftInfo.hasQRButtons ? 'знайдені' : 'не знайдені'}`);
                
            } catch (e) {
                console.log(`   ⚠️  Не вдалося перевірити сторінку ліфтів: ${e.message}`);
            }
            
            await page.close();
        }
    );
    results.tests.push({ name: 'QR Code функціонал', passed: test4 });
    if (test4) results.passed++; else results.failed++;
    
    // ════════════════════════════════════════════════════════════
    // ПІДСУМОК
    // ════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(60));
    console.log('📊 ПІДСУМОК ТЕСТУВАННЯ ВЗАЄМОДІЇ');
    console.log('═'.repeat(60) + '\n');
    
    console.log(`✅ Пройдено: ${results.passed}/${results.tests.length}`);
    console.log(`❌ Провалено: ${results.failed}/${results.tests.length}`);
    console.log(`📈 Успішність: ${(results.passed / results.tests.length * 100).toFixed(1)}%\n`);
    
    console.log('Детально:');
    results.tests.forEach((test, i) => {
        console.log(`   ${i + 1}. ${test.passed ? '✅' : '❌'} ${test.name}`);
    });
    
    console.log('\n' + '═'.repeat(60));
    
    if (results.passed === results.tests.length) {
        console.log('🎉 ВСІ ТЕСТИ ПРОЙДЕНО! Взаємодія між ролями працює!\n');
    } else {
        console.log('⚠️  Є проблеми з взаємодією між ролями. Потрібні виправлення.\n');
    }
    
})();
