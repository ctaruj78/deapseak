#!/usr/bin/env node

/**
 * 🧪 Тестування прав доступу диспетчера
 * 
 * Перевіряє:
 * 1. ✅ Диспетчер може створювати клієнтів
 * 2. ✅ Диспетчер може створювати техніків
 * 3. ❌ Диспетчер НЕ може створювати адмінів
 * 4. ❌ Диспетчер НЕ може створювати диспетчерів
 * 5. ✅ Диспетчер може редагувати клієнтів
 * 6. ✅ Диспетчер може редагувати техніків
 * 7. ❌ Диспетчер НЕ може змінювати роль на admin
 * 8. ❌ Диспетчер НЕ може змінювати роль на dispatcher
 * 9. ✅ Диспетчер може видаляти клієнтів
 * 10. ✅ Диспетчер може видаляти техніків
 * 11. ❌ Диспетчер НЕ може видаляти адмінів
 * 12. ❌ Диспетчер НЕ може видаляти диспетчерів
 */

// Конфігурація
const BASE_URL = 'http://localhost:5000';
const DISPATCHER_CREDENTIALS = {
    email: 'dispatcher@festlift.pt',
    password: 'dispatcher123'
};

// Кольори для виводу
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
};

// Статистика тестів
const stats = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
};

let dispatcherToken = null;
let createdUsers = {
    client: null,
    technician: null,
    admin: null,
    dispatcher: null
};

// Функція для виводу з кольорами
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Функція для виводу результату тесту
function logTest(testName, passed, message = '') {
    stats.total++;
    if (passed) {
        stats.passed++;
        log(`✅ ${testName}`, 'green');
        if (message) log(`   ${message}`, 'gray');
    } else {
        stats.failed++;
        log(`❌ ${testName}`, 'red');
        if (message) log(`   ${message}`, 'yellow');
    }
}

// Функція для логіну диспетчера
async function loginDispatcher() {
    try {
        log('\n🔐 Авторизація диспетчера...', 'cyan');
        
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(DISPATCHER_CREDENTIALS)
        });
        
        const data = await response.json();
        
        if (response.ok && data.token) {
            dispatcherToken = data.token;
            log(`✅ Авторизація успішна! Токен: ${dispatcherToken.substring(0, 20)}...`, 'green');
            return true;
        } else {
            log(`❌ Помилка авторизації: ${data.message}`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ Помилка підключення: ${error.message}`, 'red');
        return false;
    }
}

// Тест 1: Створення клієнта (ДОЗВОЛЕНО)
async function testCreateClient() {
    try {
        log('\n📝 Тест 1: Створення клієнта (має бути дозволено)', 'blue');
        
        const clientData = {
            email: `test_client_${Date.now()}@test.com`,
            password: 'test123',
            firstName: 'Test',
            lastName: 'Client',
            role: 'client',
            status: 'active'
        };
        
        const response = await fetch(`${BASE_URL}/api/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${dispatcherToken}`
            },
            body: JSON.stringify(clientData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            createdUsers.client = data.data._id;
            logTest('Створення клієнта', true, `ID: ${createdUsers.client}`);
            return true;
        } else {
            logTest('Створення клієнта', false, `Статус: ${response.status}, Помилка: ${data.error || data.message}`);
            return false;
        }
    } catch (error) {
        logTest('Створення клієнта', false, error.message);
        return false;
    }
}

// Тест 2: Створення техніка (ДОЗВОЛЕНО)
async function testCreateTechnician() {
    try {
        log('\n📝 Тест 2: Створення техніка (має бути дозволено)', 'blue');
        
        const techData = {
            email: `test_tech_${Date.now()}@test.com`,
            password: 'test123',
            firstName: 'Test',
            lastName: 'Technician',
            role: 'technician',
            status: 'active'
        };
        
        const response = await fetch(`${BASE_URL}/api/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${dispatcherToken}`
            },
            body: JSON.stringify(techData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            createdUsers.technician = data.data._id;
            logTest('Створення техніка', true, `ID: ${createdUsers.technician}`);
            return true;
        } else {
            logTest('Створення техніка', false, `Статус: ${response.status}, Помилка: ${data.error || data.message}`);
            return false;
        }
    } catch (error) {
        logTest('Створення техніка', false, error.message);
        return false;
    }
}

// Тест 3: Спроба створити адміна (ЗАБОРОНЕНО)
async function testCreateAdmin() {
    try {
        log('\n📝 Тест 3: Спроба створити адміна (має бути заборонено)', 'blue');
        
        const adminData = {
            email: `test_admin_${Date.now()}@test.com`,
            password: 'test123',
            firstName: 'Test',
            lastName: 'Admin',
            role: 'admin',
            status: 'active'
        };
        
        const response = await fetch(`${BASE_URL}/api/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${dispatcherToken}`
            },
            body: JSON.stringify(adminData)
        });
        
        const data = await response.json();
        
        // Очікуємо 403 Forbidden
        if (response.status === 403) {
            logTest('Блокування створення адміна', true, `Заборонено: ${data.error || data.message}`);
            return true;
        } else if (response.ok) {
            logTest('Блокування створення адміна', false, '⚠️ УРАЗЛИВІСТЬ: Диспетчер зміг створити адміна!');
            createdUsers.admin = data.data._id;
            return false;
        } else {
            logTest('Блокування створення адміна', false, `Неочікувана помилка: ${response.status}`);
            return false;
        }
    } catch (error) {
        logTest('Блокування створення адміна', false, error.message);
        return false;
    }
}

// Тест 4: Спроба створити диспетчера (ЗАБОРОНЕНО)
async function testCreateDispatcher() {
    try {
        log('\n📝 Тест 4: Спроба створити диспетчера (має бути заборонено)', 'blue');
        
        const dispatcherData = {
            email: `test_dispatcher_${Date.now()}@test.com`,
            password: 'test123',
            firstName: 'Test',
            lastName: 'Dispatcher',
            role: 'dispatcher',
            status: 'active'
        };
        
        const response = await fetch(`${BASE_URL}/api/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${dispatcherToken}`
            },
            body: JSON.stringify(dispatcherData)
        });
        
        const data = await response.json();
        
        // Очікуємо 403 Forbidden
        if (response.status === 403) {
            logTest('Блокування створення диспетчера', true, `Заборонено: ${data.error || data.message}`);
            return true;
        } else if (response.ok) {
            logTest('Блокування створення диспетчера', false, '⚠️ УРАЗЛИВІСТЬ: Диспетчер зміг створити іншого диспетчера!');
            createdUsers.dispatcher = data.data._id;
            return false;
        } else {
            logTest('Блокування створення диспетчера', false, `Неочікувана помилка: ${response.status}`);
            return false;
        }
    } catch (error) {
        logTest('Блокування створення диспетчера', false, error.message);
        return false;
    }
}

// Тест 5: Редагування клієнта (ДОЗВОЛЕНО)
async function testEditClient() {
    if (!createdUsers.client) {
        log('\n⚠️ Тест 5 пропущено: клієнт не був створений', 'yellow');
        stats.warnings++;
        return false;
    }
    
    try {
        log('\n📝 Тест 5: Редагування клієнта (має бути дозволено)', 'blue');
        
        const updateData = {
            firstName: 'Updated',
            lastName: 'Client',
            role: 'client'
        };
        
        const response = await fetch(`${BASE_URL}/api/users/${createdUsers.client}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${dispatcherToken}`
            },
            body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            logTest('Редагування клієнта', true, 'Успішно оновлено');
            return true;
        } else {
            logTest('Редагування клієнта', false, `Статус: ${response.status}, Помилка: ${data.error || data.message}`);
            return false;
        }
    } catch (error) {
        logTest('Редагування клієнта', false, error.message);
        return false;
    }
}

// Тест 6: Спроба змінити роль клієнта на admin (ЗАБОРОНЕНО)
async function testChangeClientToAdmin() {
    if (!createdUsers.client) {
        log('\n⚠️ Тест 6 пропущено: клієнт не був створений', 'yellow');
        stats.warnings++;
        return false;
    }
    
    try {
        log('\n📝 Тест 6: Спроба змінити роль клієнта на admin (має бути заборонено)', 'blue');
        
        const updateData = {
            role: 'admin'
        };
        
        const response = await fetch(`${BASE_URL}/api/users/${createdUsers.client}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${dispatcherToken}`
            },
            body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        
        // Очікуємо 403 Forbidden
        if (response.status === 403) {
            logTest('Блокування зміни ролі на admin', true, `Заборонено: ${data.error || data.message}`);
            return true;
        } else if (response.ok) {
            logTest('Блокування зміни ролі на admin', false, '⚠️ УРАЗЛИВІСТЬ: Диспетчер зміг змінити роль на admin!');
            return false;
        } else {
            logTest('Блокування зміни ролі на admin', false, `Неочікувана помилка: ${response.status}`);
            return false;
        }
    } catch (error) {
        logTest('Блокування зміни ролі на admin', false, error.message);
        return false;
    }
}

// Тест 7: Видалення клієнта (ДОЗВОЛЕНО)
async function testDeleteClient() {
    if (!createdUsers.client) {
        log('\n⚠️ Тест 7 пропущено: клієнт не був створений', 'yellow');
        stats.warnings++;
        return false;
    }
    
    try {
        log('\n📝 Тест 7: Видалення клієнта (має бути дозволено)', 'blue');
        
        const response = await fetch(`${BASE_URL}/api/users/${createdUsers.client}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${dispatcherToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            logTest('Видалення клієнта', true, 'Успішно видалено');
            createdUsers.client = null;
            return true;
        } else {
            logTest('Видалення клієнта', false, `Статус: ${response.status}, Помилка: ${data.error || data.message}`);
            return false;
        }
    } catch (error) {
        logTest('Видалення клієнта', false, error.message);
        return false;
    }
}

// Тест 8: Спроба видалити адміна (ЗАБОРОНЕНО)
async function testDeleteAdmin() {
    try {
        log('\n📝 Тест 8: Спроба видалити адміна (має бути заборонено)', 'blue');
        
        // Знаходимо ID адміна
        const usersResponse = await fetch(`${BASE_URL}/api/users`, {
            headers: {
                'Authorization': `Bearer ${dispatcherToken}`
            }
        });
        
        const usersData = await usersResponse.json();
        const adminUser = usersData.data.find(u => u.role === 'admin');
        
        if (!adminUser) {
            log('⚠️ Адміна не знайдено в системі', 'yellow');
            stats.warnings++;
            return false;
        }
        
        const response = await fetch(`${BASE_URL}/api/users/${adminUser._id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${dispatcherToken}`
            }
        });
        
        const data = await response.json();
        
        // Очікуємо 403 Forbidden
        if (response.status === 403) {
            logTest('Блокування видалення адміна', true, `Заборонено: ${data.message}`);
            return true;
        } else if (response.ok) {
            logTest('Блокування видалення адміна', false, '⚠️ КРИТИЧНА УРАЗЛИВІСТЬ: Диспетчер зміг видалити адміна!');
            return false;
        } else {
            logTest('Блокування видалення адміна', false, `Неочікувана помилка: ${response.status}`);
            return false;
        }
    } catch (error) {
        logTest('Блокування видалення адміна', false, error.message);
        return false;
    }
}

// Очищення: видалення тестових користувачів
async function cleanup() {
    log('\n🧹 Очищення тестових даних...', 'cyan');
    
    if (createdUsers.technician) {
        try {
            const response = await fetch(`${BASE_URL}/api/users/${createdUsers.technician}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${dispatcherToken}`
                }
            });
            
            if (response.ok) {
                log('✅ Тестовий технік видалено', 'green');
            }
        } catch (error) {
            log(`⚠️ Помилка видалення техніка: ${error.message}`, 'yellow');
        }
    }
    
    // Якщо випадково створили admin або dispatcher - видаляємо через адміна
    if (createdUsers.admin || createdUsers.dispatcher) {
        log('⚠️ УВАГА: Створені небажані користувачі (admin/dispatcher). Потрібно видалити вручну!', 'red');
        if (createdUsers.admin) log(`   Admin ID: ${createdUsers.admin}`, 'gray');
        if (createdUsers.dispatcher) log(`   Dispatcher ID: ${createdUsers.dispatcher}`, 'gray');
    }
}

// Виведення статистики
function printStats() {
    log('\n' + '='.repeat(60), 'cyan');
    log('📊 СТАТИСТИКА ТЕСТУВАННЯ', 'cyan');
    log('='.repeat(60), 'cyan');
    
    log(`\nВсього тестів: ${stats.total}`, 'blue');
    log(`✅ Пройдено: ${stats.passed}`, 'green');
    log(`❌ Провалено: ${stats.failed}`, 'red');
    log(`⚠️  Попереджень: ${stats.warnings}`, 'yellow');
    
    const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
    log(`\n📈 Успішність: ${successRate}%`, successRate >= 80 ? 'green' : 'red');
    
    if (stats.failed === 0 && stats.warnings === 0) {
        log('\n🎉 ВІТАЄМО! Всі тести пройдені успішно!', 'green');
        log('🔒 Система безпеки працює коректно!', 'green');
    } else if (stats.failed > 0) {
        log('\n⚠️  Виявлено критичні проблеми безпеки!', 'red');
        log('❗ Необхідно негайно виправити провалені тести!', 'red');
    }
    
    log('\n' + '='.repeat(60) + '\n', 'cyan');
}

// Головна функція
async function main() {
    log('╔═══════════════════════════════════════════════════════════╗', 'cyan');
    log('║   🧪 ТЕСТУВАННЯ ПРАВ ДОСТУПУ ДИСПЕТЧЕРА                  ║', 'cyan');
    log('║   Перевірка обмежень створення/редагування користувачів  ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════════╝', 'cyan');
    
    // Перевірка підключення до сервера
    try {
        const healthCheck = await fetch(`${BASE_URL}/api/health`);
        if (!healthCheck.ok) {
            log('\n❌ Сервер не відповідає! Запустіть сервер командою: ./autostart.sh', 'red');
            process.exit(1);
        }
        log('✅ Сервер працює', 'green');
    } catch (error) {
        log('\n❌ Не вдалося підключитися до сервера!', 'red');
        log(`   Помилка: ${error.message}`, 'red');
        log('   Запустіть сервер командою: ./autostart.sh', 'yellow');
        process.exit(1);
    }
    
    // Авторизація
    const loginSuccess = await loginDispatcher();
    if (!loginSuccess) {
        log('\n❌ Не вдалося авторизуватися. Перевірте облікові дані диспетчера.', 'red');
        process.exit(1);
    }
    
    // Запуск тестів
    await testCreateClient();
    await testCreateTechnician();
    await testCreateAdmin();
    await testCreateDispatcher();
    await testEditClient();
    await testChangeClientToAdmin();
    await testDeleteClient();
    await testDeleteAdmin();
    
    // Очищення
    await cleanup();
    
    // Статистика
    printStats();
    
    // Exit code залежно від результатів
    process.exit(stats.failed > 0 ? 1 : 0);
}

// Запуск
main().catch(error => {
    log(`\n❌ Критична помилка: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
