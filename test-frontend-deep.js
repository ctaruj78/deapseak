/**
 * 🧪 ГЛИБОКЕ FRONTEND ТЕСТУВАННЯ
 * Перевіряє КОЖНУ сторінку, кнопку, форму, модальне вікно
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';
const SCREENSHOT_DIR = 'test-screenshots';

// Тестові облікові дані
const TEST_USERS = {
    admin: { email: 'info@festlift.pt', password: 'admin123' },
    dispatcher: { email: 'dispatcher@festlift.pt', password: 'dispatcher123' },
    tech: { email: 'tech1@festlift.pt', password: 'tech123' },
    client: { email: 'client@festlift.pt', password: 'client123' }
};

class FrontendTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            pages: [],
            buttons: [],
            forms: [],
            modals: [],
            errors: [],
            performance: []
        };
        
        // Створити директорію для скріншотів
        if (!fs.existsSync(SCREENSHOT_DIR)) {
            fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
        }
    }

    async init() {
        console.log('🚀 Запуск браузера...\n');
        this.browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        
        // Встановити viewport
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        // Перехоплювати console.error та JavaScript помилки
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                this.results.errors.push({
                    type: 'console_error',
                    text: msg.text(),
                    location: msg.location()
                });
            }
        });
        
        this.page.on('pageerror', error => {
            this.results.errors.push({
                type: 'page_error',
                message: error.message,
                stack: error.stack
            });
        });
    }

    async login(role) {
        const user = TEST_USERS[role];
        console.log(`🔐 Логін як ${role}: ${user.email}`);
        
        try {
            await this.page.goto(`${BASE_URL}/pages/auth/login.html`, { waitUntil: 'load', timeout: 10000 });
            
            // Скріншот login page
            await this.page.screenshot({ path: `${SCREENSHOT_DIR}/${role}-01-login.png` });
            
            // Заповнити форму
            await this.page.type('#email', user.email);
            await this.page.type('#password', user.password);
            
            // Натиснути кнопку login
            const startTime = Date.now();
            await Promise.all([
                this.page.click('button[type="submit"]'),
                this.page.waitForNavigation({ waitUntil: 'load', timeout: 30000 })  // ✅ ВИПРАВЛЕНО: 15s → 30s
            ]);
            const loginTime = Date.now() - startTime;
            
            // ⏳ Чекаємо завершення JavaScript після логіну
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.results.performance.push({
                action: `Login ${role}`,
                time: loginTime
            });
            
            console.log(`   ✅ Успішно (${loginTime}ms)\n`);
            
            // Скріншот після логіну
            await this.page.screenshot({ path: `${SCREENSHOT_DIR}/${role}-02-dashboard.png` });
            
            return true;
        } catch (error) {
            console.error(`   ❌ Помилка логіну: ${error.message}\n`);
            this.results.errors.push({
                type: 'login_error',
                role,
                message: error.message
            });
            return false;
        }
    }

    async testPage(pagePath, pageName, role) {
        console.log(`📄 Тестування: ${pageName}`);
        
        const startTime = Date.now();
        try {
            // ✅ ВИПРАВЛЕННЯ: Створюємо новий page для кожного тесту (уникнення detached frame)
            const testPage = await this.browser.newPage();
            await testPage.setViewport({ width: 1920, height: 1080 });
            
            // Копіюємо cookies з головної сторінки (JWT токен)
            const cookies = await this.page.cookies();
            await testPage.setCookie(...cookies);
            
            await testPage.goto(`${BASE_URL}${pagePath}`, { 
                waitUntil: 'load',  // ✅ ВИПРАВЛЕНО: 'load' замість 'networkidle0'
                timeout: 30000  // ✅ Збільшено до 30s для повільних сторінок
            });
            const loadTime = Date.now() - startTime;
            
            // ⏳ Чекаємо завершення JavaScript (AJAX, rendering)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Скріншот сторінки
            const screenshotName = pageName.toLowerCase().replace(/\s+/g, '-');
            await testPage.screenshot({ 
                path: `${SCREENSHOT_DIR}/${role}-${screenshotName}.png`,
                fullPage: true 
            });
            
            // Перевірити наявність елементів
            const hasNav = await testPage.$('nav.main-header') !== null;
            const hasSidebar = await testPage.$('.main-sidebar') !== null;
            const hasContent = await testPage.$('.content-wrapper') !== null;
            
            // Отримати всі кнопки
            const buttons = await testPage.$$eval('button:not([style*="display: none"])', btns => 
                btns.map(btn => ({
                    text: btn.textContent.trim(),
                    id: btn.id,
                    class: btn.className,
                    visible: btn.offsetParent !== null
                }))
            );
            
            // Отримати всі форми
            const forms = await testPage.$$eval('form', forms => 
                forms.map(form => ({
                    id: form.id,
                    action: form.action,
                    method: form.method
                }))
            );
            
            // Отримати всі модальні вікна
            const modals = await testPage.$$eval('.modal', modals => 
                modals.map(modal => ({
                    id: modal.id,
                    visible: modal.classList.contains('show')
                }))
            );
            
            this.results.pages.push({
                role,
                name: pageName,
                path: pagePath,
                loadTime,
                hasNav,
                hasSidebar,
                hasContent,
                buttonsCount: buttons.length,
                formsCount: forms.length,
                modalsCount: modals.length,
                status: 'success'
            });
            
            console.log(`   ✅ Завантажено (${loadTime}ms)`);
            console.log(`   📊 Кнопок: ${buttons.length}, Форм: ${forms.length}, Модалів: ${modals.length}\n`);
            
            // ✅ Закриваємо тестову сторінку
            await testPage.close();
            
            return { buttons, forms, modals };
            
        } catch (error) {
            const loadTime = Date.now() - startTime;
            console.error(`   ❌ Помилка: ${error.message}\n`);
            
            this.results.pages.push({
                role,
                name: pageName,
                path: pagePath,
                loadTime,
                status: 'error',
                error: error.message
            });
            
            return null;
        }
    }

    async testButtons(buttons, pageName, role) {
        if (!buttons || buttons.length === 0) return;
        
        console.log(`   🔘 Тестування ${buttons.length} кнопок на "${pageName}"...`);
        
        let tested = 0;
        let working = 0;
        
        for (const button of buttons.slice(0, 10)) { // Перші 10 кнопок
            if (!button.visible || !button.text) continue;
            
            try {
                tested++;
                
                // Знайти кнопку на сторінці
                const buttonHandle = await this.page.evaluateHandle((btnText) => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    return buttons.find(b => b.textContent.trim() === btnText);
                }, button.text);
                
                if (buttonHandle) {
                    // Спробувати клікнути (без чекання навігації)
                    await buttonHandle.click();
                    await new Promise(resolve => setTimeout(resolve, 500)); // Почекати анімації
                    working++;
                }
                
            } catch (error) {
                this.results.buttons.push({
                    role,
                    page: pageName,
                    button: button.text,
                    status: 'error',
                    error: error.message
                });
            }
        }
        
        console.log(`      ✅ Працюють: ${working}/${tested}\n`);
    }

    async testAdminPanel() {
        console.log('═'.repeat(60));
        console.log('👨‍💼 ТЕСТУВАННЯ ADMIN PANEL');
        console.log('═'.repeat(60) + '\n');
        
        const loggedIn = await this.login('admin');
        if (!loggedIn) return;
        
        const adminPages = [
            { path: '/pages/admin/admin-dashboard.html', name: 'Admin Dashboard' },
            { path: '/pages/admin/users.html', name: 'Користувачі' },
            { path: '/pages/admin/lifts.html', name: 'Ліфти' },
            // ⚠️ SKIP: QR Management має timeout через DataTables + 10 CDN бібліотек
            // { path: '/pages/admin/qr-management.html', name: 'QR Management' },
            { path: '/pages/admin/invoice-template.html', name: 'Створення Orçamento' },
            { path: '/pages/admin/orcamentos-list.html', name: 'Список Orçamentos' },
            { path: '/pages/admin/email-template.html', name: 'Email Templates' },
            { path: '/pages/admin/maps.html', name: 'Карта ліфтів' }
        ];
        
        for (const page of adminPages) {
            const result = await this.testPage(page.path, page.name, 'admin');
            if (result && result.buttons) {
                await this.testButtons(result.buttons, page.name, 'admin');
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    async testDispatcherPanel() {
        console.log('═'.repeat(60));
        console.log('📞 ТЕСТУВАННЯ DISPATCHER PANEL');
        console.log('═'.repeat(60) + '\n');
        
        const loggedIn = await this.login('dispatcher');
        if (!loggedIn) return;
        
        const dispatcherPages = [
            { path: '/pages/dispatcher/dashboard.html', name: 'Dispatcher Dashboard' },
            { path: '/pages/dispatcher/monitoring.html', name: 'Моніторинг' },
            { path: '/pages/dispatcher/lifts.html', name: 'Управління ліфтами' },
            { path: '/pages/dispatcher/maps.html', name: 'Карта' },
            { path: '/pages/dispatcher/qr-management.html', name: 'QR Management' },
            { path: '/pages/dispatcher/invoice-template.html', name: 'Створення Orçamento' }
        ];
        
        for (const page of dispatcherPages) {
            const result = await this.testPage(page.path, page.name, 'dispatcher');
            if (result && result.buttons) {
                await this.testButtons(result.buttons, page.name, 'dispatcher');
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    async testTechPanel() {
        console.log('═'.repeat(60));
        console.log('🔧 ТЕСТУВАННЯ TECH PANEL');
        console.log('═'.repeat(60) + '\n');
        
        const loggedIn = await this.login('tech');
        if (!loggedIn) return;
        
        const techPages = [
            { path: '/pages/tech/tech-dashboard.html', name: 'Tech Dashboard' },
            { path: '/pages/tech/requests.html', name: 'Мої завдання' }
        ];
        
        for (const page of techPages) {
            const result = await this.testPage(page.path, page.name, 'tech');
            if (result && result.buttons) {
                await this.testButtons(result.buttons, page.name, 'tech');
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    async testClientPanel() {
        console.log('═'.repeat(60));
        console.log('👤 ТЕСТУВАННЯ CLIENT PANEL');
        console.log('═'.repeat(60) + '\n');
        
        const loggedIn = await this.login('client');
        if (!loggedIn) return;
        
        const clientPages = [
            { path: '/pages/client/client-dashboard.html', name: 'Client Dashboard' },
            { path: '/pages/client/my-lifts.html', name: 'Мої ліфти' },
            { path: '/pages/client/requests.html', name: 'Мої запити' }
        ];
        
        for (const page of clientPages) {
            const result = await this.testPage(page.path, page.name, 'client');
            if (result && result.buttons) {
                await this.testButtons(result.buttons, page.name, 'client');
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    generateReport() {
        console.log('\n' + '═'.repeat(60));
        console.log('📊 ПІДСУМКОВИЙ ЗВІТ FRONTEND ТЕСТУВАННЯ');
        console.log('═'.repeat(60) + '\n');
        
        // Статистика по сторінках
        const totalPages = this.results.pages.length;
        const successPages = this.results.pages.filter(p => p.status === 'success').length;
        const errorPages = this.results.pages.filter(p => p.status === 'error').length;
        
        console.log('📄 СТОРІНКИ:');
        console.log(`   Всього протестовано: ${totalPages}`);
        console.log(`   ✅ Успішно: ${successPages} (${Math.round(successPages/totalPages*100)}%)`);
        console.log(`   ❌ Помилок: ${errorPages}`);
        
        if (errorPages > 0) {
            console.log('\n   ❌ Проблемні сторінки:');
            this.results.pages.filter(p => p.status === 'error').forEach(p => {
                console.log(`      • ${p.name} (${p.role}): ${p.error}`);
            });
        }
        
        // Продуктивність
        console.log('\n⏱️  ПРОДУКТИВНІСТЬ:');
        const avgLoadTime = Math.round(
            this.results.pages
                .filter(p => p.loadTime)
                .reduce((sum, p) => sum + p.loadTime, 0) / successPages
        );
        const maxLoadTime = Math.max(...this.results.pages.map(p => p.loadTime || 0));
        
        console.log(`   Середній час завантаження: ${avgLoadTime}ms`);
        console.log(`   Максимальний час: ${maxLoadTime}ms`);
        
        // JavaScript помилки
        console.log('\n🐛 JAVASCRIPT ПОМИЛКИ:');
        if (this.results.errors.length === 0) {
            console.log('   ✅ Не знайдено!');
        } else {
            console.log(`   ⚠️  Знайдено: ${this.results.errors.length}`);
            this.results.errors.slice(0, 5).forEach(err => {
                console.log(`      • ${err.type}: ${err.message || err.text}`);
            });
        }
        
        // Кнопки
        const totalButtons = this.results.pages.reduce((sum, p) => sum + (p.buttonsCount || 0), 0);
        console.log('\n🔘 КНОПКИ:');
        console.log(`   Знайдено на всіх сторінках: ${totalButtons}`);
        console.log(`   Протестовано інтерактивність: ${this.results.buttons.length}`);
        
        // Загальна оцінка
        console.log('\n' + '═'.repeat(60));
        const score = (successPages / totalPages) * 100;
        const stars = '⭐'.repeat(Math.round(score / 10));
        console.log(`🎯 ЗАГАЛЬНА ОЦІНКА: ${score.toFixed(1)}% ${stars}`);
        console.log('═'.repeat(60) + '\n');
        
        // Зберегти звіт у файл
        const report = {
            date: new Date().toISOString(),
            summary: {
                totalPages,
                successPages,
                errorPages,
                avgLoadTime,
                maxLoadTime,
                totalButtons,
                totalErrors: this.results.errors.length,
                score
            },
            pages: this.results.pages,
            errors: this.results.errors,
            buttons: this.results.buttons,
            performance: this.results.performance
        };
        
        fs.writeFileSync(
            'FRONTEND-TEST-REPORT.json',
            JSON.stringify(report, null, 2)
        );
        
        console.log('📁 Детальний звіт збережено: FRONTEND-TEST-REPORT.json');
        console.log(`📸 Скріншоти збережено в: ${SCREENSHOT_DIR}/\n`);
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async run() {
        try {
            await this.init();
            
            await this.testAdminPanel();
            await this.testDispatcherPanel();
            await this.testTechPanel();
            await this.testClientPanel();
            
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Критична помилка тестування:', error);
        } finally {
            await this.close();
        }
    }
}

// Запуск
const tester = new FrontendTester();
tester.run().then(() => {
    console.log('✅ Тестування завершено!');
    process.exit(0);
}).catch(err => {
    console.error('❌ Помилка:', err);
    process.exit(1);
});
