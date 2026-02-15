2#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════
 * COMPREHENSIVE ROLE-BASED FUNCTIONALITY TESTING SCRIPT
 * ═══════════════════════════════════════════════════════════
 * Тестує всі функції для кожної ролі в системі DeapSeaK
 * 
 * Ролі: admin, dispatcher, technician, client
 * 
 * Використання:
 *   node test-all-roles-functionality.js
 * ═══════════════════════════════════════════════════════════
 */

const https = require('https');
const http = require('http');

// ═══════════════════════════════════════════════════════════
// КОНФІГУРАЦІЯ
// ═══════════════════════════════════════════════════════════

const API_BASE = process.env.API_URL || 'http://localhost:5000';
const COLORS = {
    RESET: '\x1b[0m',
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    MAGENTA: '\x1b[35m',
    CYAN: '\x1b[36m',
    WHITE: '\x1b[37m',
    BOLD: '\x1b[1m'
};

// ═══════════════════════════════════════════════════════════
// ТЕСТОВІ КОРИСТУВАЧІ (ДЕМО)
// ═══════════════════════════════════════════════════════════

const TEST_USERS = {
    admin: {
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        token: null
    },
    dispatcher: {
        username: 'dispatcher1',
        password: 'dispatcher123',
        role: 'dispatcher',
        token: null
    },
    technician: {
        username: 'tech1',
        password: 'tech123',
        role: 'technician',
        token: null
    },
    client: {
        username: 'client1',
        password: 'client123',
        role: 'client',
        token: null
    }
};

// ═══════════════════════════════════════════════════════════
// ФУНКЦІЇ ДЛЯ КОЖНОЇ РОЛІ
// ═══════════════════════════════════════════════════════════

const ROLE_FUNCTIONS = {
    admin: {
        name: 'Адміністратор',
        permissions: [
            'Управління користувачами',
            'Управління ліфтами',
            'Управління заявками',
            'Перегляд звітів',
            'Налаштування системи',
            'Управління фінансами',
            'Доступ до AI асистента',
            'Управління QR кодами',
            'Аналітика та статистика'
        ],
        endpoints: [
            { method: 'GET', path: '/api/auth/users', description: 'Отримання списку користувачів', expectedStatus: 200 },
            { method: 'GET', path: '/api/lifts', description: 'Отримання списку ліфтів', expectedStatus: 200 },
            { method: 'POST', path: '/api/lifts', description: 'Створення нового ліфта', expectedStatus: [201, 400], data: { municipalNumber: 'TEST-001', address: {street: 'Test', city: 'Test', zipCode: '1000', country: 'Portugal'}, manufacturer: 'Test', model: 'Test', capacity: 500, floors: 5, location: {type: 'Point', coordinates: [-9.1393, 38.7223]} } },
            { method: 'GET', path: '/api/requests', description: 'Отримання списку заявок', expectedStatus: 200 },
            { method: 'GET', path: '/api/requests/stats', description: 'Статистика заявок', expectedStatus: 200 },
            { method: 'POST', path: '/api/send-email', description: 'Відправка email', expectedStatus: [200, 400], data: { to: 'test@example.com', subject: 'Test', body: 'Test' } }
        ]
    },
    dispatcher: {
        name: 'Диспетчер',
        permissions: [
            'Перегляд ліфтів',
            'Призначення заявок технікам',
            'Управління заявками',
            'Перегляд техніків',
            'Календар обслуговування',
            'Моніторинг системи',
            'Звіти (обмежені)'
        ],
        endpoints: [
            { method: 'GET', path: '/api/lifts', description: 'Отримання списку ліфтів', expectedStatus: 200 },
            { method: 'GET', path: '/api/requests', description: 'Отримання списку заявок', expectedStatus: 200 },
            { method: 'POST', path: '/api/requests/:id/assign', description: 'Призначення заявки техніку', expectedStatus: [200, 400, 404], requiresRequestId: true, data: { technicianId: 'TECH_ID_PLACEHOLDER' } },
            { method: 'GET', path: '/api/requests/stats', description: 'Статистика заявок', expectedStatus: 200 },
            { method: 'GET', path: '/api/auth/users', description: 'Отримання користувачів (має бути заборонено)', expectedStatus: 403 }
        ]
    },
    technician: {
        name: 'Технік',
        permissions: [
            'Перегляд призначених заявок',
            'Оновлення статусу заявок',
            'Додавання коментарів',
            'Завершення робіт',
            'QR сканер',
            'AR помічник',
            'Перегляд мануалів',
            'Календар завдань'
        ],
        endpoints: [
            { method: 'GET', path: '/api/requests', description: 'Отримання призначених заявок', expectedStatus: 200 },
            { method: 'PATCH', path: '/api/requests/:id/status', description: 'Зміна статусу заявки', expectedStatus: [200, 403, 404], requiresRequestId: true, data: { status: 'in_progress' } },
            { method: 'POST', path: '/api/requests/:id/comment', description: 'Додавання коментаря', expectedStatus: [200, 404], requiresRequestId: true, data: { text: 'Test comment' } },
            { method: 'PUT', path: '/api/requests/:id/work', description: 'Оновлення деталей роботи', expectedStatus: [200, 404], requiresRequestId: true, data: { workDescription: 'Test work', partsUsed: 'Test parts', laborHours: 2 } },
            { method: 'GET', path: '/api/lifts', description: 'Отримання ліфтів', expectedStatus: 200 },
            { method: 'POST', path: '/api/lifts', description: 'Створення ліфта (має бути заборонено)', expectedStatus: 403, data: { municipalNumber: 'TEST-001' } },
            { method: 'GET', path: '/api/auth/users', description: 'Перегляд користувачів (має бути заборонено)', expectedStatus: 403 }
        ]
    },
    client: {
        name: 'Клієнт',
        permissions: [
            'Перегляд своїх ліфтів',
            'Створення заявок',
            'Перегляд своїх заявок',
            'Перегляд історії обслуговування',
            'Перегляд рахунків',
            'Налаштування профілю'
        ],
        endpoints: [
            { method: 'GET', path: '/api/lifts', description: 'Отримання своїх ліфтів', expectedStatus: 200 },
            { method: 'GET', path: '/api/requests', description: 'Отримання своїх заявок', expectedStatus: 200 },
            { method: 'POST', path: '/api/requests', description: 'Створення заявки', expectedStatus: [201, 400], data: { lift: 'LIFT_ID_PLACEHOLDER', title: 'Test request', description: 'Test description', priority: 'medium' } },
            { method: 'GET', path: '/api/auth/profile', description: 'Отримання профілю', expectedStatus: 200 },
            { method: 'POST', path: '/api/lifts', description: 'Створення ліфта (має бути заборонено)', expectedStatus: 403, data: { municipalNumber: 'TEST-001' } },
            { method: 'GET', path: '/api/auth/users', description: 'Перегляд користувачів (має бути заборонено)', expectedStatus: 403 },
            { method: 'GET', path: '/api/requests/stats', description: 'Статистика (має бути заборонена)', expectedStatus: 403 }
        ]
    }
};

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

function log(message, color = COLORS.WHITE) {
    console.log(`${color}${message}${COLORS.RESET}`);
}

function logHeader(title) {
    const line = '═'.repeat(60);
    log(`\n${line}`, COLORS.CYAN);
    log(`  ${title}`, COLORS.CYAN + COLORS.BOLD);
    log(`${line}`, COLORS.CYAN);
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
    log(`ℹ️  ${message}`, COLORS.BLUE);
}

// ═══════════════════════════════════════════════════════════
// API REQUEST FUNCTIONS
// ═══════════════════════════════════════════════════════════

function makeRequest(method, path, token, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${API_BASE}${path}`);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
            method,
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            }
        };

        const req = client.request(options, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    const response = body ? JSON.parse(body) : {};
                    resolve({
                        status: res.statusCode,
                        data: response,
                        headers: res.headers
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: { raw: body },
                        headers: res.headers
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// ═══════════════════════════════════════════════════════════
// LOGIN FUNCTION
// ═══════════════════════════════════════════════════════════

async function login(username, password) {
    try {
        const response = await makeRequest('POST', '/api/auth/login', null, {
            username,
            password
        });

        if (response.status === 200 && response.data.token) {
            return {
                success: true,
                token: response.data.token,
                user: response.data.user
            };
        }

        return {
            success: false,
            message: response.data.message || 'Login failed'
        };
    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
}

// ═══════════════════════════════════════════════════════════
// TEST ENDPOINT FUNCTION
// ═══════════════════════════════════════════════════════════

async function testEndpoint(role, endpoint, token, context = {}) {
    const { method, path, description, expectedStatus, data, requiresRequestId, requiresLiftId } = endpoint;
    
    // Replace placeholders
    let actualPath = path;
    let actualData = data ? JSON.parse(JSON.stringify(data)) : null;
    
    if (requiresRequestId && context.requestId) {
        actualPath = actualPath.replace(':id', context.requestId);
    } else if (requiresRequestId) {
        actualPath = actualPath.replace(':id', '000000000000000000000001'); // Dummy ID
    }
    
    if (actualData) {
        if (actualData.lift === 'LIFT_ID_PLACEHOLDER' && context.liftId) {
            actualData.lift = context.liftId;
        }
        if (actualData.technicianId === 'TECH_ID_PLACEHOLDER' && context.technicianId) {
            actualData.technicianId = context.technicianId;
        }
    }

    try {
        const response = await makeRequest(method, actualPath, token, actualData);
        const expectedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
        const isExpected = expectedStatuses.includes(response.status);

        if (isExpected) {
            logSuccess(`${method} ${actualPath} - ${description} [${response.status}]`);
            return { success: true, response };
        } else {
            logError(`${method} ${actualPath} - ${description}`);
            logError(`  Очікувано: ${expectedStatuses.join(' або ')}, Отримано: ${response.status}`);
            if (response.data.message) {
                logError(`  Повідомлення: ${response.data.message}`);
            }
            return { success: false, response };
        }
    } catch (error) {
        logError(`${method} ${actualPath} - ${description}`);
        logError(`  Помилка: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════
// TEST ROLE FUNCTION
// ═══════════════════════════════════════════════════════════

async function testRole(roleKey) {
    const testUser = TEST_USERS[roleKey];
    const roleConfig = ROLE_FUNCTIONS[roleKey];

    logHeader(`Тестування ролі: ${roleConfig.name} (${roleKey})`);

    // Step 1: Login
    logInfo(`Крок 1: Авторизація користувача ${testUser.username}...`);
    const loginResult = await login(testUser.username, testUser.password);

    if (!loginResult.success) {
        logError(`Не вдалося авторизуватись: ${loginResult.message}`);
        return {
            role: roleKey,
            success: false,
            reason: 'Login failed'
        };
    }

    logSuccess(`Авторизація успішна! Token отримано.`);
    testUser.token = loginResult.token;

    // Step 2: Test permissions
    logInfo(`\nКрок 2: Тестування дозволів...`);
    logInfo(`Дозволені операції для ролі ${roleConfig.name}:`);
    roleConfig.permissions.forEach(perm => {
        log(`  • ${perm}`, COLORS.CYAN);
    });

    // Step 3: Get context data (lift ID, request ID, etc.)
    const context = {};
    
    // Get first lift for context
    try {
        const liftsResponse = await makeRequest('GET', '/api/lifts?limit=1', testUser.token);
        if (liftsResponse.data.data && liftsResponse.data.data.lifts && liftsResponse.data.data.lifts.length > 0) {
            context.liftId = liftsResponse.data.data.lifts[0]._id;
            logInfo(`  Знайдено ліфт: ${context.liftId}`);
        }
    } catch (e) {
        // Ignore
    }

    // Get first request for context
    try {
        const requestsResponse = await makeRequest('GET', '/api/requests?limit=1', testUser.token);
        if (requestsResponse.data.data && requestsResponse.data.data.requests && requestsResponse.data.data.requests.length > 0) {
            context.requestId = requestsResponse.data.data.requests[0]._id;
            logInfo(`  Знайдено заявку: ${context.requestId}`);
        }
    } catch (e) {
        // Ignore
    }

    // Get first technician for context (if admin/dispatcher)
    if (roleKey === 'admin' || roleKey === 'dispatcher') {
        try {
            const usersResponse = await makeRequest('GET', '/api/auth/users', testUser.token);
            if (usersResponse.data.data && usersResponse.data.data.users) {
                const technician = usersResponse.data.data.users.find(u => u.role === 'technician');
                if (technician) {
                    context.technicianId = technician._id;
                    logInfo(`  Знайдено техніка: ${context.technicianId}`);
                }
            }
        } catch (e) {
            // Ignore
        }
    }

    // Step 4: Test endpoints
    logInfo(`\nКрок 3: Тестування API endpoints...`);
    
    let successCount = 0;
    let failCount = 0;

    for (const endpoint of roleConfig.endpoints) {
        const result = await testEndpoint(roleKey, endpoint, testUser.token, context);
        if (result.success) {
            successCount++;
        } else {
            failCount++;
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Step 5: Summary
    logInfo(`\nРезультати для ролі ${roleConfig.name}:`);
    logSuccess(`Успішно: ${successCount}/${roleConfig.endpoints.length}`);
    if (failCount > 0) {
        logError(`Помилок: ${failCount}/${roleConfig.endpoints.length}`);
    }

    const successRate = (successCount / roleConfig.endpoints.length * 100).toFixed(2);
    
    if (successRate === 100) {
        logSuccess(`✨ Роль ${roleConfig.name}: 100% тестів пройдено!`);
    } else if (successRate >= 80) {
        logWarning(`⚠️  Роль ${roleConfig.name}: ${successRate}% тестів пройдено`);
    } else {
        logError(`❌ Роль ${roleConfig.name}: Тільки ${successRate}% тестів пройдено`);
    }

    return {
        role: roleKey,
        name: roleConfig.name,
        success: successCount,
        failed: failCount,
        total: roleConfig.endpoints.length,
        successRate: parseFloat(successRate)
    };
}

// ═══════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════

async function main() {
    console.clear();
    logHeader('🔍 ТЕСТУВАННЯ ВСІХ РОЛЕЙ - DeapSeaK v2');
    
    logInfo(`API Base URL: ${API_BASE}`);
    logInfo(`Тестуємо ${Object.keys(ROLE_FUNCTIONS).length} ролі: ${Object.keys(ROLE_FUNCTIONS).join(', ')}\n`);

    // Check if server is running
    logInfo('Перевірка доступності сервера...');
    try {
        const healthCheck = await makeRequest('GET', '/health', null);
        if (healthCheck.status === 200) {
            logSuccess(`Сервер доступний! ${JSON.stringify(healthCheck.data)}`);
        } else {
            logWarning(`Сервер відповів зі статусом: ${healthCheck.status}`);
        }
    } catch (error) {
        logError(`Сервер недоступний: ${error.message}`);
        logError(`Переконайтесь, що unified-server.js запущений на порту 5000!`);
        process.exit(1);
    }

    const results = [];

    // Test each role
    for (const roleKey of Object.keys(ROLE_FUNCTIONS)) {
        const result = await testRole(roleKey);
        results.push(result);
        
        // Delay between roles
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Final summary
    logHeader('📊 ЗАГАЛЬНИЙ ЗВІТ');
    
    log('\n╔═══════════════╦════════╦════════╦═══════╦═════════════╗', COLORS.CYAN);
    log('║ Роль          ║ Успішно║ Помилок║ Всього║ Успішність  ║', COLORS.CYAN);
    log('╠═══════════════╬════════╬════════╬═══════╬═════════════╣', COLORS.CYAN);
    
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalTests = 0;

    results.forEach(result => {
        const color = result.successRate === 100 ? COLORS.GREEN :
                     result.successRate >= 80 ? COLORS.YELLOW : COLORS.RED;
        
        const roleName = result.name.padEnd(13);
        const success = result.success.toString().padStart(7);
        const failed = result.failed.toString().padStart(7);
        const total = result.total.toString().padStart(6);
        const rate = `${result.successRate.toFixed(2)}%`.padStart(12);
        
        log(`║ ${roleName} ║${success} ║${failed} ║${total} ║${rate} ║`, color);
        
        totalSuccess += result.success;
        totalFailed += result.failed;
        totalTests += result.total;
    });
    
    log('╠═══════════════╬════════╬════════╬═══════╬═════════════╣', COLORS.CYAN);
    
    const overallRate = (totalSuccess / totalTests * 100).toFixed(2);
    const overallColor = overallRate === 100 ? COLORS.GREEN :
                        overallRate >= 80 ? COLORS.YELLOW : COLORS.RED;
    
    const totalLine = 'ВСЬОГО'.padEnd(13);
    const totalSuccessStr = totalSuccess.toString().padStart(7);
    const totalFailedStr = totalFailed.toString().padStart(7);
    const totalTestsStr = totalTests.toString().padStart(6);
    const totalRateStr = `${overallRate}%`.padStart(12);
    
    log(`║ ${totalLine} ║${totalSuccessStr} ║${totalFailedStr} ║${totalTestsStr} ║${totalRateStr} ║`, overallColor + COLORS.BOLD);
    log('╚═══════════════╩════════╩════════╩═══════╩═════════════╝', COLORS.CYAN);

    if (overallRate === 100) {
        log('\n🎉 ВІТАЄМО! Всі тести пройдено успішно!', COLORS.GREEN + COLORS.BOLD);
    } else if (overallRate >= 80) {
        log('\n⚠️  Більшість тестів пройдено, але є проблеми!', COLORS.YELLOW + COLORS.BOLD);
    } else {
        log('\n❌ КРИТИЧНО! Багато тестів провалено!', COLORS.RED + COLORS.BOLD);
    }

    log('\n💡 Рекомендації:', COLORS.CYAN);
    log('  1. Перевірте логи unified-server.js для деталей', COLORS.WHITE);
    log('  2. Переконайтесь, що всі демо користувачі створені', COLORS.WHITE);
    log('  3. Перевірте права доступу для кожної ролі', COLORS.WHITE);
    log('  4. Прогріть кейси з expectedStatus 403 (заборонені операції)', COLORS.WHITE);
}

// Run tests
main().catch(error => {
    logError(`Критична помилка: ${error.message}`);
    console.error(error);
    process.exit(1);
});
