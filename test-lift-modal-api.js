/**
 * 🧪 API тести модального вікна ліфтів
 * Перевіряє всі endpoint та функції створення/редагування
 */

const https = require('https');
const http = require('http');

const CONFIG = {
    BASE_URL: 'http://localhost:5000',
    ADMIN_EMAIL: 'info@festlift.pt',
    ADMIN_PASSWORD: 'admin123',
    TEST_LIFT_PREFIX: 'API-TEST-'
};

const COLORS = {
    RESET: '\x1b[0m',
    GREEN: '\x1b[32m',
    RED: '\x1b[31m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    CYAN: '\x1b[36m',
    MAGENTA: '\x1b[35m'
};

function log(message, color = COLORS.RESET) {
    console.log(`${color}${message}${COLORS.RESET}`);
}

function logSuccess(message) { log(`✅ ${message}`, COLORS.GREEN); }
function logError(message) { log(`❌ ${message}`, COLORS.RED); }
function logWarning(message) { log(`⚠️  ${message}`, COLORS.YELLOW); }
function logInfo(message) { log(`ℹ️  ${message}`, COLORS.CYAN); }
function logSection(message) {
    log(`\n${'='.repeat(75)}`, COLORS.BLUE);
    log(`  ${message}`, COLORS.BLUE);
    log(`${'='.repeat(75)}`, COLORS.BLUE);
}

class LiftModalAPITester {
    constructor() {
        this.token = null;
        this.testLiftId = null;
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    // Виконує HTTP запит
    async makeRequest(endpoint, method = 'GET', data = null, useToken = true) {
        return new Promise((resolve, reject) => {
            const url = new URL(endpoint, CONFIG.BASE_URL);
            const options = {
                hostname: url.hostname,
                port: url.port || 5000,
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (useToken && this.token) {
                options.headers['Authorization'] = `Bearer ${this.token}`;
            }

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const jsonData = body ? JSON.parse(body) : {};
                        resolve({
                            status: res.statusCode,
                            headers: res.headers,
                            data: jsonData
                        });
                    } catch (e) {
                        resolve({
                            status: res.statusCode,
                            headers: res.headers,
                            data: body
                        });
                    }
                });
            });

            req.on('error', reject);

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    // Тест 1: Авторизація
    async testLogin() {
        logSection('🔐 ТЕСТ 1: Авторизація адміністратора');
        
        try {
            const response = await this.makeRequest('/api/auth/login', 'POST', {
                email: CONFIG.ADMIN_EMAIL,
                password: CONFIG.ADMIN_PASSWORD
            }, false);

            if (response.status === 200 && response.data.token) {
                this.token = response.data.token;
                logSuccess(`Успішна авторизація як ${CONFIG.ADMIN_EMAIL}`);
                logInfo(`Token: ${this.token.substring(0, 30)}...`);
                this.addTestResult('Авторизація', true);
                return true;
            } else {
                logError(`Помилка авторизації: ${response.status}`);
                logError(JSON.stringify(response.data, null, 2));
                this.addTestResult('Авторизація', false, `Status ${response.status}`);
                return false;
            }
        } catch (error) {
            logError(`Виняток авторизації: ${error.message}`);
            this.addTestResult('Авторизація', false, error.message);
            return false;
        }
    }

    // Тест 2: Отримання списку ліфтів
    async testGetLifts() {
        logSection('📋 ТЕСТ 2: Отримання списку ліфтів');
        
        try {
            const response = await this.makeRequest('/api/lifts', 'GET');

            if (response.status === 200) {
                const lifts = response.data.data || response.data.lifts || response.data;
                logSuccess(`Отримано список ліфтів: ${lifts.length} шт.`);
                
                if (lifts.length > 0) {
                    logInfo(`Приклад першого ліфта:`);
                    const firstLift = lifts[0];
                    logInfo(`  ID: ${firstLift._id}`);
                    logInfo(`  Номер: ${firstLift.municipalNumber}`);
                    logInfo(`  Адреса: ${firstLift.address?.street || 'N/A'}`);
                    if (firstLift.client) {
                        logInfo(`  Клієнт: ${firstLift.client.email || firstLift.client}`);
                    }
                }
                
                this.addTestResult('Отримання списку ліфтів', true);
                return true;
            } else {
                logError(`Помилка отримання: ${response.status}`);
                this.addTestResult('Отримання списку ліфтів', false, `Status ${response.status}`);
                return false;
            }
        } catch (error) {
            logError(`Виняток: ${error.message}`);
            this.addTestResult('Отримання списку ліфтів', false, error.message);
            return false;
        }
    }

    // Тест 3: Створення нового ліфта (POST)
    async testCreateLift() {
        logSection('➕ ТЕСТ 3: Створення нового ліфта');
        
        const newLift = {
            municipalNumber: `${CONFIG.TEST_LIFT_PREFIX}${Date.now()}`,
            brand: 'Test Brand',
            model: 'Test Model X',
            address: {
                street: 'Rua de Teste 123',
                city: 'Lisboa',
                postcode: '1000-001'
            },
            capacity: 630,
            speed: 1.0,
            floors: 5,
            type: 'passenger',
            clientEmail: 'client@festlift.pt'
        };

        try {
            logInfo('Дані для створення:');
            logInfo(JSON.stringify(newLift, null, 2));

            const response = await this.makeRequest('/api/lifts', 'POST', newLift);

            if (response.status === 201 || response.status === 200) {
                const createdLift = response.data.data || response.data.lift || response.data;
                this.testLiftId = createdLift._id;
                
                logSuccess('Ліфт успішно створено!');
                logInfo(`ID створеного ліфта: ${this.testLiftId}`);
                logInfo(`Номер: ${createdLift.municipalNumber}`);
                logInfo(`Бренд: ${createdLift.brand}`);
                logInfo(`Capacity: ${createdLift.capacity} kg`);
                logInfo(`Speed: ${createdLift.speed} m/s`);
                
                // Перевірка полів
                const fieldsCorrect = 
                    createdLift.municipalNumber === newLift.municipalNumber &&
                    createdLift.brand === newLift.brand &&
                    createdLift.capacity === newLift.capacity &&
                    createdLift.speed === newLift.speed;
                
                if (fieldsCorrect) {
                    logSuccess('Всі поля збереглись коректно');
                } else {
                    logWarning('Деякі поля не збереглись правильно');
                }
                
                this.addTestResult('Створення ліфта', true);
                return true;
            } else {
                logError(`Помилка створення: ${response.status}`);
                logError(JSON.stringify(response.data, null, 2));
                this.addTestResult('Створення ліфта', false, `Status ${response.status}`);
                return false;
            }
        } catch (error) {
            logError(`Виняток: ${error.message}`);
            this.addTestResult('Створення ліфта', false, error.message);
            return false;
        }
    }

    // Тест 4: Отримання деталей одного ліфта (GET by ID)
    async testGetLiftById() {
        logSection('🔍 ТЕСТ 4: Отримання деталей ліфта за ID');
        
        if (!this.testLiftId) {
            logWarning('Пропущено: немає ID тестового ліфта');
            this.addTestResult('Отримання деталей ліфта', false, 'Немає ID');
            return false;
        }

        try {
            const response = await this.makeRequest(`/api/lifts/${this.testLiftId}`, 'GET');

            if (response.status === 200) {
                const lift = response.data.data || response.data.lift || response.data;
                
                logSuccess('Деталі ліфта отримано!');
                logInfo(`ID: ${lift._id}`);
                logInfo(`Номер: ${lift.municipalNumber}`);
                logInfo(`Бренд: ${lift.brand} ${lift.model}`);
                logInfo(`Адреса: ${lift.address?.street}, ${lift.address?.city}`);
                logInfo(`Capacity: ${lift.capacity} kg`);
                logInfo(`Speed: ${lift.speed} m/s`);
                logInfo(`Статус: ${lift.status}`);
                
                if (lift.client) {
                    logInfo(`Клієнт: ${lift.client.email || lift.client}`);
                }
                
                this.addTestResult('Отримання деталей ліфта', true);
                return true;
            } else {
                logError(`Помилка: ${response.status}`);
                this.addTestResult('Отримання деталей ліфта', false, `Status ${response.status}`);
                return false;
            }
        } catch (error) {
            logError(`Виняток: ${error.message}`);
            this.addTestResult('Отримання деталей ліфта', false, error.message);
            return false;
        }
    }

    // Тест 5: Оновлення ліфта (PUT) - тест capacity та speed
    async testUpdateLift() {
        logSection('✏️ ТЕСТ 5: Оновлення ліфта (capacity та speed)');
        
        if (!this.testLiftId) {
            logWarning('Пропущено: немає ID тестового ліфта');
            this.addTestResult('Оновлення ліфта', false, 'Немає ID');
            return false;
        }

        const updates = {
            capacity: 800,
            speed: 1.5,
            brand: 'Updated Brand',
            model: 'Updated Model'
        };

        try {
            logInfo('Оновлення:');
            logInfo(`  Capacity: 630 → 800 kg`);
            logInfo(`  Speed: 1.0 → 1.5 m/s`);
            logInfo(`  Brand: Test Brand → Updated Brand`);

            const response = await this.makeRequest(
                `/api/lifts/${this.testLiftId}`, 
                'PUT', 
                updates
            );

            if (response.status === 200) {
                const updatedLift = response.data.data || response.data.lift || response.data;
                
                logSuccess('Ліфт успішно оновлено!');
                logInfo(`Capacity: ${updatedLift.capacity} kg`);
                logInfo(`Speed: ${updatedLift.speed} m/s`);
                logInfo(`Brand: ${updatedLift.brand}`);
                
                // Перевірка чи зміни застосувались
                const updatesCorrect = 
                    updatedLift.capacity === updates.capacity &&
                    updatedLift.speed === updates.speed &&
                    updatedLift.brand === updates.brand;
                
                if (updatesCorrect) {
                    logSuccess('✅ Всі зміни збереглись коректно!');
                    this.addTestResult('Оновлення ліфта', true);
                    return true;
                } else {
                    logError('Деякі зміни не застосувались');
                    logInfo(`Очікувалось: capacity=${updates.capacity}, speed=${updates.speed}`);
                    logInfo(`Отримано: capacity=${updatedLift.capacity}, speed=${updatedLift.speed}`);
                    this.addTestResult('Оновлення ліфта', false, 'Зміни не застосувались');
                    return false;
                }
            } else {
                logError(`Помилка оновлення: ${response.status}`);
                logError(JSON.stringify(response.data, null, 2));
                this.addTestResult('Оновлення ліфта', false, `Status ${response.status}`);
                return false;
            }
        } catch (error) {
            logError(`Виняток: ${error.message}`);
            this.addTestResult('Оновлення ліфта', false, error.message);
            return false;
        }
    }

    // Тест 6: Перевірка валідації (невалідні дані)
    async testValidation() {
        logSection('🔍 ТЕСТ 6: Валідація форми (невалідні дані)');
        
        const invalidData = {
            municipalNumber: '', // порожнє обов'язкове поле
            brand: 'Test',
            capacity: -100, // негативне значення
            speed: 'abc' // не число
        };

        try {
            logInfo('Спроба створити ліфт з невалідними даними...');
            
            const response = await this.makeRequest('/api/lifts', 'POST', invalidData);

            if (response.status === 400 || response.status === 422) {
                logSuccess('Валідація працює! Сервер відхилив невалідні дані');
                logInfo(`Status: ${response.status}`);
                logInfo(`Повідомлення: ${response.data.message || 'Validation error'}`);
                this.addTestResult('Валідація форми', true);
                return true;
            } else if (response.status === 201 || response.status === 200) {
                logWarning('Валідація НЕ працює! Сервер прийняв невалідні дані');
                this.addTestResult('Валідація форми', false, 'Валідація відсутня');
                return false;
            } else {
                logError(`Неочікуваний статус: ${response.status}`);
                this.addTestResult('Валідація форми', false, `Status ${response.status}`);
                return false;
            }
        } catch (error) {
            logError(`Виняток: ${error.message}`);
            this.addTestResult('Валідація форми', false, error.message);
            return false;
        }
    }

    // Тест 7: Видалення тестового ліфта
    async testDeleteLift() {
        logSection('🗑️ ТЕСТ 7: Видалення тестового ліфта');
        
        if (!this.testLiftId) {
            logWarning('Пропущено: немає ID тестового ліфта');
            this.addTestResult('Видалення ліфта', false, 'Немає ID');
            return false;
        }

        try {
            const response = await this.makeRequest(
                `/api/lifts/${this.testLiftId}`, 
                'DELETE'
            );

            if (response.status === 200 || response.status === 204) {
                logSuccess('Тестовий ліфт успішно видалено');
                this.addTestResult('Видалення ліфта', true);
                return true;
            } else {
                logError(`Помилка видалення: ${response.status}`);
                this.addTestResult('Видалення ліфта', false, `Status ${response.status}`);
                return false;
            }
        } catch (error) {
            logError(`Виняток: ${error.message}`);
            this.addTestResult('Видалення ліфта', false, error.message);
            return false;
        }
    }

    // Тест 8: Перевірка що ліфт видалено
    async testLiftDeleted() {
        logSection('✔️ ТЕСТ 8: Перевірка видалення');
        
        if (!this.testLiftId) {
            logWarning('Пропущено: немає ID тестового ліфта');
            this.addTestResult('Перевірка видалення', false, 'Немає ID');
            return false;
        }

        try {
            const response = await this.makeRequest(`/api/lifts/${this.testLiftId}`, 'GET');

            if (response.status === 404) {
                logSuccess('Ліфт дійсно видалено (404 Not Found)');
                this.addTestResult('Перевірка видалення', true);
                return true;
            } else if (response.status === 200) {
                logWarning('Ліфт все ще існує! Видалення не спрацювало');
                this.addTestResult('Перевірка видалення', false, 'Ліфт існує');
                return false;
            } else {
                logError(`Неочікуваний статус: ${response.status}`);
                this.addTestResult('Перевірка видалення', false, `Status ${response.status}`);
                return false;
            }
        } catch (error) {
            logError(`Виняток: ${error.message}`);
            this.addTestResult('Перевірка видалення', false, error.message);
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
        logSection('📊 ПІДСУМКИ ТЕСТУВАННЯ');
        
        log(`\n📈 Статистика:`, COLORS.MAGENTA);
        log(`   Всього тестів: ${this.results.total}`);
        logSuccess(`   Пройдено: ${this.results.passed}`);
        if (this.results.failed > 0) {
            logError(`   Провалено: ${this.results.failed}`);
        }
        
        const percentage = ((this.results.passed / this.results.total) * 100).toFixed(1);
        log(`\n🎯 Успішність: ${percentage}%\n`, COLORS.CYAN);
        
        log('📋 Детальні результати:', COLORS.CYAN);
        this.results.tests.forEach((test, index) => {
            const status = test.passed ? '✅' : '❌';
            const color = test.passed ? COLORS.GREEN : COLORS.RED;
            log(`   ${index + 1}. ${status} ${test.name}`, color);
            if (test.error) {
                log(`      ⚠️  Помилка: ${test.error}`, COLORS.YELLOW);
            }
        });
        
        log('');
        
        // Фінальний вердикт
        if (this.results.failed === 0) {
            log('🎉 ВСІ ТЕСТИ ПРОЙДЕНО! Модальне вікно працює ідеально!', COLORS.GREEN);
        } else if (this.results.passed > this.results.failed) {
            log('⚠️  Більшість тестів пройдено, але є проблеми', COLORS.YELLOW);
        } else {
            log('❌ Критичні проблеми! Потрібне виправлення', COLORS.RED);
        }
        
        log('');
    }

    async run() {
        log('\n🧪 ТЕСТУВАННЯ API МОДАЛЬНОГО ВІКНА ЛІФТІВ\n', COLORS.BLUE);
        logInfo(`База: ${CONFIG.BASE_URL}`);
        logInfo(`Користувач: ${CONFIG.ADMIN_EMAIL}\n`);
        
        try {
            // Послідовне виконання тестів
            const loginOk = await this.testLogin();
            if (!loginOk) {
                logError('Не вдалось авторизуватись. Тести скасовано.');
                return;
            }

            await this.testGetLifts();
            await this.testCreateLift();
            await this.testGetLiftById();
            await this.testUpdateLift();
            await this.testValidation();
            await this.testDeleteLift();
            await this.testLiftDeleted();

            this.printResults();
            
        } catch (error) {
            logError(`Критична помилка: ${error.message}`);
            console.error(error);
        }
    }
}

// Запуск
(async () => {
    const tester = new LiftModalAPITester();
    await tester.run();
    process.exit(0);
})();
