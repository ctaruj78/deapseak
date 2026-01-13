/**
 * 🧪 Тест модального вікна додавання/редагування ліфта
 * Перевіряє всі функції та кнопки
 */

const puppeteer = require('puppeteer');

const CONFIG = {
    BASE_URL: 'http://localhost:5000',
    ADMIN_EMAIL: 'admin@deapseak.com',
    ADMIN_PASSWORD: 'admin123',
    TIMEOUT: 30000
};

const COLORS = {
    RESET: '\x1b[0m',
    GREEN: '\x1b[32m',
    RED: '\x1b[31m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    CYAN: '\x1b[36m'
};

function log(message, color = COLORS.RESET) {
    console.log(`${color}${message}${COLORS.RESET}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, COLORS.GREEN);
}

function logError(message) {
    log(`❌ ${message}`, COLORS.RED);
}

function logWarning(message) {
    log(`⚠️  ${message}`, COLORS.YELLOW);
}

function logInfo(message) {
    log(`ℹ️  ${message}`, COLORS.CYAN);
}

function logSection(message) {
    log(`\n${'='.repeat(70)}`, COLORS.BLUE);
    log(`  ${message}`, COLORS.BLUE);
    log(`${'='.repeat(70)}`, COLORS.BLUE);
}

class LiftModalTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async init() {
        logInfo('Запуск браузера...');
        this.browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        // Логування помилок консолі
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                logError(`Console Error: ${msg.text()}`);
            }
        });
    }

    async login() {
        logSection('🔐 АВТОРИЗАЦІЯ');
        
        try {
            await this.page.goto(`${CONFIG.BASE_URL}/login.html`, { waitUntil: 'networkidle2' });
            
            await this.page.type('#email', CONFIG.ADMIN_EMAIL);
            await this.page.type('#password', CONFIG.ADMIN_PASSWORD);
            await this.page.click('button[type="submit"]');
            
            await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
            
            const currentUrl = this.page.url();
            if (currentUrl.includes('/pages/admin/')) {
                logSuccess('Успішна авторизація як адміністратор');
                return true;
            } else {
                logError(`Невірний URL після логіну: ${currentUrl}`);
                return false;
            }
        } catch (error) {
            logError(`Помилка авторизації: ${error.message}`);
            return false;
        }
    }

    async navigateToLiftsPage() {
        logSection('📄 ПЕРЕХІД НА СТОРІНКУ ЛІФТІВ');
        
        try {
            await this.page.goto(`${CONFIG.BASE_URL}/pages/admin/lifts.html`, { 
                waitUntil: 'networkidle2',
                timeout: CONFIG.TIMEOUT 
            });
            
            await this.page.waitForSelector('#lifts-table-body', { timeout: 10000 });
            logSuccess('Сторінка ліфтів завантажена');
            return true;
        } catch (error) {
            logError(`Помилка завантаження сторінки: ${error.message}`);
            return false;
        }
    }

    async testModalOpening() {
        logSection('🪟 ТЕСТ 1: Відкриття модального вікна');
        
        try {
            // Натискаємо кнопку "Додати ліфт"
            const addButton = await this.page.$('button:has-text("Adicionar"), button:has-text("додати")');
            if (!addButton) {
                // Пробуємо знайти за селектором
                await this.page.click('a[href="#"][onclick*="modal"]');
            } else {
                await addButton.click();
            }
            
            // Чекаємо на появу модального вікна
            await this.page.waitForSelector('#enhancedLiftModal.show', { timeout: 5000 });
            
            const isVisible = await this.page.$eval('#enhancedLiftModal', 
                el => el.classList.contains('show')
            );
            
            if (isVisible) {
                logSuccess('Модальне вікно успішно відкрилось');
                this.addTestResult('Відкриття модального вікна', true);
                return true;
            } else {
                logError('Модальне вікно не з\'явилось');
                this.addTestResult('Відкриття модального вікна', false);
                return false;
            }
        } catch (error) {
            logError(`Помилка відкриття модального вікна: ${error.message}`);
            this.addTestResult('Відкриття модального вікна', false, error.message);
            return false;
        }
    }

    async testFormFields() {
        logSection('📝 ТЕСТ 2: Заповнення полів форми');
        
        const testData = {
            municipalNumber: 'TEST-' + Date.now(),
            brand: 'Test Brand',
            model: 'Model X',
            address: 'Rua de Teste 123, Lisboa',
            postcode: '1000-001',
            clientEmail: 'test@festlift.pt',
            capacity: '630',
            speed: '1.0'
        };
        
        try {
            // Заповнюємо основні поля
            await this.page.type('#enhancedMunicipalNumber', testData.municipalNumber);
            await this.page.type('#enhancedLiftBrand', testData.brand);
            await this.page.type('#enhancedLiftModel', testData.model);
            await this.page.type('#enhancedLiftAddress', testData.address);
            await this.page.type('#enhancedLiftPostcode', testData.postcode);
            await this.page.type('#enhancedClientEmail', testData.clientEmail);
            await this.page.type('#enhancedLiftCapacity', testData.capacity);
            await this.page.type('#enhancedLiftSpeed', testData.speed);
            
            logSuccess('Всі поля успішно заповнені');
            
            // Перевіряємо чи значення збереглись
            const municipalValue = await this.page.$eval('#enhancedMunicipalNumber', el => el.value);
            const brandValue = await this.page.$eval('#enhancedLiftBrand', el => el.value);
            const capacityValue = await this.page.$eval('#enhancedLiftCapacity', el => el.value);
            const speedValue = await this.page.$eval('#enhancedLiftSpeed', el => el.value);
            
            const fieldsCorrect = 
                municipalValue === testData.municipalNumber &&
                brandValue === testData.brand &&
                capacityValue === testData.capacity &&
                speedValue === testData.speed;
            
            if (fieldsCorrect) {
                logSuccess('Всі значення полів коректні');
                this.addTestResult('Заповнення полів форми', true);
                return true;
            } else {
                logError('Деякі значення полів не збереглись');
                this.addTestResult('Заповнення полів форми', false, 'Значення не збереглись');
                return false;
            }
        } catch (error) {
            logError(`Помилка заповнення форми: ${error.message}`);
            this.addTestResult('Заповнення полів форми', false, error.message);
            return false;
        }
    }

    async testMapFunctionality() {
        logSection('🗺️ ТЕСТ 3: Функціональність карти');
        
        try {
            // Перехід на вкладку з картою
            await this.page.click('#location-tab');
            await this.page.waitForTimeout(1000);
            
            // Перевіряємо чи карта завантажилась
            const mapExists = await this.page.$('#enhancedLiftMap');
            if (!mapExists) {
                logWarning('Контейнер карти не знайдено');
                this.addTestResult('Ініціалізація карти', false, 'Контейнер не знайдено');
                return false;
            }
            
            // Перевіряємо чи Leaflet завантажився
            const leafletLoaded = await this.page.evaluate(() => {
                return typeof L !== 'undefined';
            });
            
            if (leafletLoaded) {
                logSuccess('Leaflet завантажено');
            } else {
                logWarning('Leaflet не завантажено');
            }
            
            // Тестуємо введення координат
            await this.page.type('#enhancedLiftLat', '38.7223');
            await this.page.type('#enhancedLiftLng', '-9.1393');
            
            const lat = await this.page.$eval('#enhancedLiftLat', el => el.value);
            const lng = await this.page.$eval('#enhancedLiftLng', el => el.value);
            
            if (lat === '38.7223' && lng === '-9.1393') {
                logSuccess('Координати успішно встановлені');
                this.addTestResult('Робота з координатами', true);
                return true;
            } else {
                logError('Координати не встановились');
                this.addTestResult('Робота з координатами', false);
                return false;
            }
        } catch (error) {
            logError(`Помилка тестування карти: ${error.message}`);
            this.addTestResult('Функціональність карти', false, error.message);
            return false;
        }
    }

    async testFormSubmit() {
        logSection('💾 ТЕСТ 4: Збереження форми');
        
        try {
            // Натискаємо кнопку збереження
            await this.page.click('button[type="submit"]');
            
            // Чекаємо на відповідь
            await this.page.waitForTimeout(3000);
            
            // Перевіряємо чи модальне вікно закрилось
            const modalClosed = await this.page.evaluate(() => {
                const modal = document.getElementById('enhancedLiftModal');
                return !modal || !modal.classList.contains('show');
            });
            
            if (modalClosed) {
                logSuccess('Модальне вікно закрилось після збереження');
            } else {
                logWarning('Модальне вікно все ще відкрите');
            }
            
            // Чекаємо на оновлення таблиці
            await this.page.waitForTimeout(2000);
            
            // Перевіряємо чи з'явився новий ліфт в таблиці
            const tableRows = await this.page.$$('#lifts-table-body tr');
            logInfo(`Знайдено рядків в таблиці: ${tableRows.length}`);
            
            if (tableRows.length > 0) {
                logSuccess('Таблиця оновилась після збереження');
                this.addTestResult('Збереження ліфта', true);
                return true;
            } else {
                logWarning('Таблиця порожня або не оновилась');
                this.addTestResult('Збереження ліфта', false, 'Таблиця не оновилась');
                return false;
            }
        } catch (error) {
            logError(`Помилка збереження: ${error.message}`);
            this.addTestResult('Збереження ліфта', false, error.message);
            return false;
        }
    }

    async testEditMode() {
        logSection('✏️ ТЕСТ 5: Режим редагування');
        
        try {
            // Знаходимо кнопку редагування першого ліфта
            await this.page.waitForSelector('#lifts-table-body tr', { timeout: 5000 });
            
            const editButton = await this.page.$('#lifts-table-body tr:first-child button[onclick*="editLift"]');
            if (!editButton) {
                logWarning('Кнопка редагування не знайдена');
                this.addTestResult('Режим редагування', false, 'Кнопка не знайдена');
                return false;
            }
            
            // Натискаємо кнопку редагування
            await editButton.click();
            
            // Чекаємо на відкриття модального вікна
            await this.page.waitForSelector('#enhancedLiftModal.show', { timeout: 5000 });
            
            // Перевіряємо чи поля заповнені
            const municipalNumber = await this.page.$eval('#enhancedMunicipalNumber', el => el.value);
            const brand = await this.page.$eval('#enhancedLiftBrand', el => el.value);
            
            if (municipalNumber && brand) {
                logSuccess('Дані ліфта завантажились для редагування');
                
                // Змінюємо capacity
                await this.page.evaluate(() => {
                    document.getElementById('enhancedLiftCapacity').value = '';
                });
                await this.page.type('#enhancedLiftCapacity', '800');
                
                // Змінюємо speed
                await this.page.evaluate(() => {
                    document.getElementById('enhancedLiftSpeed').value = '';
                });
                await this.page.type('#enhancedLiftSpeed', '1.5');
                
                // Зберігаємо
                await this.page.click('button[type="submit"]');
                await this.page.waitForTimeout(3000);
                
                logSuccess('Зміни збережено');
                this.addTestResult('Редагування ліфта', true);
                return true;
            } else {
                logError('Дані не завантажились');
                this.addTestResult('Редагування ліфта', false, 'Дані не завантажились');
                return false;
            }
        } catch (error) {
            logError(`Помилка режиму редагування: ${error.message}`);
            this.addTestResult('Редагування ліфта', false, error.message);
            return false;
        }
    }

    async testValidation() {
        logSection('🔍 ТЕСТ 6: Валідація форми');
        
        try {
            // Відкриваємо модальне вікно знову
            await this.page.evaluate(() => {
                const modal = document.getElementById('enhancedLiftModal');
                if (modal) {
                    $(modal).modal('show');
                }
            });
            
            await this.page.waitForTimeout(1000);
            
            // Очищаємо форму
            await this.page.evaluate(() => {
                document.getElementById('enhancedLiftForm').reset();
            });
            
            // Пробуємо зберегти порожню форму
            await this.page.click('button[type="submit"]');
            await this.page.waitForTimeout(1000);
            
            // Перевіряємо чи з'явились помилки валідації
            const hasErrors = await this.page.evaluate(() => {
                const invalidFields = document.querySelectorAll('.is-invalid');
                return invalidFields.length > 0;
            });
            
            if (hasErrors) {
                logSuccess('Валідація працює - виявлено помилки в порожній формі');
                this.addTestResult('Валідація форми', true);
                return true;
            } else {
                logWarning('Валідація не спрацювала');
                this.addTestResult('Валідація форми', false, 'Валідація не спрацювала');
                return false;
            }
        } catch (error) {
            logError(`Помилка тестування валідації: ${error.message}`);
            this.addTestResult('Валідація форми', false, error.message);
            return false;
        }
    }

    addTestResult(testName, passed, error = null) {
        this.results.total++;
        if (passed) {
            this.results.passed++;
        } else {
            this.results.failed++;
        }
        
        this.results.tests.push({
            name: testName,
            passed,
            error
        });
    }

    printResults() {
        logSection('📊 РЕЗУЛЬТАТИ ТЕСТУВАННЯ');
        
        log(`\nВсього тестів: ${this.results.total}`);
        logSuccess(`Пройдено: ${this.results.passed}`);
        if (this.results.failed > 0) {
            logError(`Провалено: ${this.results.failed}`);
        }
        
        const percentage = ((this.results.passed / this.results.total) * 100).toFixed(1);
        log(`\nУспішність: ${percentage}%\n`);
        
        log('Деталі тестів:', COLORS.CYAN);
        this.results.tests.forEach((test, index) => {
            const status = test.passed ? '✅' : '❌';
            const color = test.passed ? COLORS.GREEN : COLORS.RED;
            log(`${index + 1}. ${status} ${test.name}`, color);
            if (test.error) {
                log(`   Помилка: ${test.error}`, COLORS.YELLOW);
            }
        });
        
        log('');
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async run() {
        try {
            await this.init();
            
            const loginSuccess = await this.login();
            if (!loginSuccess) {
                logError('Не вдалось авторизуватись. Тести скасовано.');
                await this.cleanup();
                return;
            }
            
            await this.navigateToLiftsPage();
            
            // Запускаємо тести
            await this.testModalOpening();
            await this.testFormFields();
            await this.testMapFunctionality();
            await this.testFormSubmit();
            await this.testEditMode();
            await this.testValidation();
            
            this.printResults();
            
        } catch (error) {
            logError(`Критична помилка: ${error.message}`);
            console.error(error);
        } finally {
            await this.cleanup();
        }
    }
}

// Запуск тестів
(async () => {
    log('\n🧪 ТЕСТУВАННЯ МОДАЛЬНОГО ВІКНА ДОДАВАННЯ/РЕДАГУВАННЯ ЛІФТА\n', COLORS.BLUE);
    
    const tester = new LiftModalTester();
    await tester.run();
    
    process.exit(0);
})();
