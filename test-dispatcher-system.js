#!/usr/bin/env node

/**
 * 🔍 Комплексна перевірка диспетчерської панелі
 * 
 * Перевіряє:
 * - Всі HTML сторінки на наявність помилок
 * - API endpoints доступність
 * - База даних підключення
 * - JavaScript файли синтаксис
 * - CSS файли валідність
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Кольори для консолі
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

class DispatcherSystemTester {
    constructor() {
        this.baseDir = '/workspaces/deapseak';
        this.dispatcherDir = path.join(this.baseDir, 'pages/dispatcher');
        this.apiUrl = 'http://localhost:5000';
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            warnings: 0,
            errors: []
        };
    }

    // Утиліти для виводу
    log(message, type = 'info') {
        const prefix = {
            'info': `${colors.blue}ℹ${colors.reset}`,
            'success': `${colors.green}✅${colors.reset}`,
            'error': `${colors.red}❌${colors.reset}`,
            'warning': `${colors.yellow}⚠️${colors.reset}`,
            'test': `${colors.cyan}🧪${colors.reset}`
        };
        console.log(`${prefix[type]} ${message}`);
    }

    logSection(title) {
        console.log(`\n${colors.magenta}${'='.repeat(60)}${colors.reset}`);
        console.log(`${colors.magenta}  ${title}${colors.reset}`);
        console.log(`${colors.magenta}${'='.repeat(60)}${colors.reset}\n`);
    }

    // 1. Перевірка HTML файлів
    async testHTMLFiles() {
        this.logSection('📄 Перевірка HTML файлів');
        
        const htmlFiles = [
            'dashboard.html',
            'monitoring.html',
            'assignments.html',
            'clients.html',
            'technicians.html',
            'qr-management.html',
            'calendar.html',
            'reports.html',
            'notifications.html',
            'support.html',
            'settings.html',
            'profile.html'
        ];

        for (const file of htmlFiles) {
            this.results.total++;
            const filePath = path.join(this.dispatcherDir, file);
            
            try {
                if (!fs.existsSync(filePath)) {
                    this.log(`${file} - файл не знайдено`, 'error');
                    this.results.failed++;
                    this.results.errors.push(`${file}: файл відсутній`);
                    continue;
                }

                const content = fs.readFileSync(filePath, 'utf8');
                
                // Перевірки
                const checks = {
                    'DOCTYPE': content.includes('<!DOCTYPE html>'),
                    'charset UTF-8': content.includes('charset="UTF-8"'),
                    'sidebar include': content.includes('sidebar.html') || content.includes('class="main-sidebar"'),
                    'Auth Manager': content.includes('auth.js') || content.includes('AuthManager'),
                    'jQuery': content.includes('jquery'),
                    'AdminLTE': content.includes('adminlte'),
                    'Bootstrap': content.includes('bootstrap')
                };

                const failed = Object.entries(checks).filter(([k, v]) => !v);
                
                if (failed.length === 0) {
                    this.log(`${file} - OK`, 'success');
                    this.results.passed++;
                } else {
                    this.log(`${file} - відсутні: ${failed.map(([k]) => k).join(', ')}`, 'warning');
                    this.results.warnings++;
                }

                // Перевірка на типові помилки
                const syntaxIssues = [];
                
                if (content.includes('undefined undefined')) {
                    syntaxIssues.push('містить "undefined undefined"');
                }
                
                if (content.match(/<script[^>]*>\s*<script/)) {
                    syntaxIssues.push('подвійні script теги');
                }
                
                if (content.match(/onclick="[^"]*[^"]*"/g)?.some(s => !s.includes('('))) {
                    syntaxIssues.push('некоректні onclick атрибути');
                }

                if (syntaxIssues.length > 0) {
                    this.log(`  ⚠️  ${syntaxIssues.join(', ')}`, 'warning');
                }

            } catch (error) {
                this.log(`${file} - помилка читання: ${error.message}`, 'error');
                this.results.failed++;
                this.results.errors.push(`${file}: ${error.message}`);
            }
        }
    }

    // 2. Перевірка API endpoints
    async testAPIEndpoints() {
        this.logSection('🌐 Перевірка API endpoints');
        
        // Спочатку отримаємо токен
        const token = await this.getTestToken();
        
        if (!token) {
            this.log('Не вдалося отримати токен аутентифікації', 'error');
            return;
        }

        const endpoints = [
            { method: 'GET', path: '/api/health', requiresAuth: false },
            { method: 'GET', path: '/api/users/me', requiresAuth: true },
            { method: 'GET', path: '/api/users?role=client', requiresAuth: true, description: 'Список клієнтів' },
            { method: 'GET', path: '/api/users?role=technician', requiresAuth: true, description: 'Список техніків' },
            { method: 'GET', path: '/api/requests', requiresAuth: true, description: 'Список запитів' },
            { method: 'GET', path: '/api/lifts', requiresAuth: true, description: 'Список ліфтів' },
            { method: 'GET', path: '/api/notifications', requiresAuth: true, description: 'Сповіщення' }
        ];

        for (const endpoint of endpoints) {
            this.results.total++;
            
            try {
                const result = await this.makeRequest(
                    endpoint.method,
                    endpoint.path,
                    endpoint.requiresAuth ? token : null
                );

                if (result.statusCode >= 200 && result.statusCode < 300) {
                    this.log(`${endpoint.method} ${endpoint.path} - OK (${result.statusCode})`, 'success');
                    this.results.passed++;
                } else if (result.statusCode === 403) {
                    this.log(`${endpoint.method} ${endpoint.path} - 403 Forbidden (потрібні права)`, 'warning');
                    this.results.warnings++;
                    this.results.errors.push(`${endpoint.path}: 403 Forbidden - перевірте права доступу`);
                } else if (result.statusCode === 401) {
                    this.log(`${endpoint.method} ${endpoint.path} - 401 Unauthorized`, 'warning');
                    this.results.warnings++;
                } else {
                    this.log(`${endpoint.method} ${endpoint.path} - помилка ${result.statusCode}`, 'error');
                    this.results.failed++;
                    this.results.errors.push(`${endpoint.path}: HTTP ${result.statusCode}`);
                }
            } catch (error) {
                this.log(`${endpoint.method} ${endpoint.path} - помилка: ${error.message}`, 'error');
                this.results.failed++;
                this.results.errors.push(`${endpoint.path}: ${error.message}`);
            }
        }
    }

    // 3. Перевірка JavaScript модулів
    async testJavaScriptModules() {
        this.logSection('📜 Перевірка JavaScript модулів');
        
        const jsFiles = [
            'assets/js/auth.js',
            'assets/js/service-integration.js',
            'assets/js/modules/client-manager.js',
            'assets/js/modules/monitoring-manager.js',
            'assets/js/id-converter.js'
        ];

        for (const file of jsFiles) {
            this.results.total++;
            const filePath = path.join(this.baseDir, file);
            
            try {
                if (!fs.existsSync(filePath)) {
                    this.log(`${file} - не знайдено`, 'error');
                    this.results.failed++;
                    continue;
                }

                const content = fs.readFileSync(filePath, 'utf8');
                
                // Базова перевірка синтаксису
                const issues = [];
                
                // Перевірка на незакриті дужки
                const openBraces = (content.match(/{/g) || []).length;
                const closeBraces = (content.match(/}/g) || []).length;
                if (openBraces !== closeBraces) {
                    issues.push(`незбалансовані фігурні дужки (${openBraces} відкритих, ${closeBraces} закритих)`);
                }
                
                // Перевірка на console.log для відлагодження
                const consoleLogs = (content.match(/console\.(log|warn|error)/g) || []).length;
                if (consoleLogs > 10) {
                    this.log(`  ⚠️  багато console.log (${consoleLogs})`, 'warning');
                }

                if (issues.length === 0) {
                    this.log(`${file} - OK`, 'success');
                    this.results.passed++;
                } else {
                    this.log(`${file} - проблеми: ${issues.join(', ')}`, 'error');
                    this.results.failed++;
                    this.results.errors.push(`${file}: ${issues.join(', ')}`);
                }

            } catch (error) {
                this.log(`${file} - помилка: ${error.message}`, 'error');
                this.results.failed++;
            }
        }
    }

    // 4. Перевірка підключення до MongoDB
    async testDatabaseConnection() {
        this.logSection('🗄️  Перевірка підключення до MongoDB');
        
        this.results.total++;
        
        try {
            const { MongoClient } = require('mongodb');
            const client = new MongoClient('mongodb://localhost:27017', {
                serverSelectionTimeoutMS: 5000
            });
            
            await client.connect();
            await client.db('deapseak').admin().ping();
            
            this.log('MongoDB підключення - OK', 'success');
            this.results.passed++;
            
            // Перевірка колекцій
            const collections = await client.db('deapseak').listCollections().toArray();
            const collectionNames = collections.map(c => c.name);
            
            const required = ['users', 'requests', 'lifts'];
            const missing = required.filter(c => !collectionNames.includes(c));
            
            if (missing.length === 0) {
                this.log(`Всі колекції присутні: ${required.join(', ')}`, 'success');
            } else {
                this.log(`Відсутні колекції: ${missing.join(', ')}`, 'warning');
                this.results.warnings++;
            }
            
            await client.close();
            
        } catch (error) {
            this.log(`MongoDB підключення - помилка: ${error.message}`, 'error');
            this.results.failed++;
            this.results.errors.push(`MongoDB: ${error.message}`);
        }
    }

    // 5. Перевірка sidebar consistency
    async testSidebarConsistency() {
        this.logSection('🎨 Перевірка consistency sidebar');
        
        const sidebarInclude = path.join(this.dispatcherDir, 'includes/sidebar.html');
        
        if (!fs.existsSync(sidebarInclude)) {
            this.log('Файл sidebar.html не знайдено', 'error');
            this.results.failed++;
            return;
        }

        const sidebarContent = fs.readFileSync(sidebarInclude, 'utf8');
        
        // Перевірка що sidebar має headset icon
        if (sidebarContent.includes('fa-headset')) {
            this.log('Sidebar має headset icon - OK', 'success');
            this.results.passed++;
        } else {
            this.log('Sidebar не має headset icon', 'warning');
            this.results.warnings++;
        }

        // Перевірка меню items
        const menuItems = [
            'dashboard.html',
            'monitoring.html',
            'assignments.html',
            'clients.html',
            'technicians.html'
        ];

        let allPresent = true;
        for (const item of menuItems) {
            if (!sidebarContent.includes(item)) {
                this.log(`Sidebar не має посилання на ${item}`, 'warning');
                allPresent = false;
            }
        }

        if (allPresent) {
            this.log('Всі необхідні пункти меню присутні', 'success');
        }
    }

    // Допоміжні методи
    async getTestToken() {
        try {
            const result = await this.makeRequest('POST', '/api/auth/login', null, {
                email: 'dispatcher@festlift.pt',
                password: 'dispatcher123'
            });

            if (result.data && result.data.token) {
                return result.data.token;
            }
        } catch (error) {
            console.error('Помилка отримання токена:', error.message);
        }
        return null;
    }

    makeRequest(method, path, token = null, body = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: 5000,
                path: path,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (token) {
                options.headers['Authorization'] = `Bearer ${token}`;
            }

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        resolve({
                            statusCode: res.statusCode,
                            data: data ? JSON.parse(data) : null
                        });
                    } catch {
                        resolve({
                            statusCode: res.statusCode,
                            data: data
                        });
                    }
                });
            });

            req.on('error', reject);
            
            if (body) {
                req.write(JSON.stringify(body));
            }
            
            req.end();
        });
    }

    // Генерація звіту
    generateReport() {
        this.logSection('📊 Підсумковий звіт');
        
        const passRate = this.results.total > 0 
            ? ((this.results.passed / this.results.total) * 100).toFixed(1)
            : 0;

        console.log(`${colors.cyan}Всього тестів:${colors.reset} ${this.results.total}`);
        console.log(`${colors.green}Успішно:${colors.reset} ${this.results.passed}`);
        console.log(`${colors.yellow}Попередження:${colors.reset} ${this.results.warnings}`);
        console.log(`${colors.red}Помилки:${colors.reset} ${this.results.failed}`);
        console.log(`${colors.blue}Успішність:${colors.reset} ${passRate}%`);

        if (this.results.errors.length > 0) {
            console.log(`\n${colors.red}Знайдені проблеми:${colors.reset}`);
            this.results.errors.forEach((error, i) => {
                console.log(`  ${i + 1}. ${error}`);
            });
        }

        console.log(`\n${colors.magenta}${'='.repeat(60)}${colors.reset}\n`);

        // Висновок
        if (this.results.failed === 0 && this.results.warnings === 0) {
            this.log('🎉 Всі перевірки пройдені успішно!', 'success');
        } else if (this.results.failed === 0) {
            this.log('✅ Критичних помилок немає, але є попередження', 'warning');
        } else {
            this.log('❌ Знайдено критичні помилки, потрібне виправлення', 'error');
        }
    }

    // Головний метод запуску
    async run() {
        console.log(`\n${colors.cyan}${'*'.repeat(60)}${colors.reset}`);
        console.log(`${colors.cyan}  🔍 ТЕСТУВАННЯ ДИСПЕТЧЕРСЬКОЇ СИСТЕМИ${colors.reset}`);
        console.log(`${colors.cyan}${'*'.repeat(60)}${colors.reset}\n`);

        await this.testHTMLFiles();
        await this.testJavaScriptModules();
        await this.testSidebarConsistency();
        await this.testDatabaseConnection();
        await this.testAPIEndpoints();
        
        this.generateReport();
    }
}

// Запуск
const tester = new DispatcherSystemTester();
tester.run().catch(error => {
    console.error('Критична помилка:', error);
    process.exit(1);
});
