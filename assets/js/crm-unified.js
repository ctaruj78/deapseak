/**
 * DeapSeaK CRM - Unified Role-Based System
 * Єдина CRM система з рольовим доступом
 */

class CRMUnified {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.permissions = {};
        this.availableModules = [];
        this.dataManager = null;
        this.currentModule = null;
        
        // logger.log('CRMUnified constructor викликано');
        
        // Ініціалізація після завантаження DOM
        this.init();
    }
    
    async init() {
        try {
            // logger.log('Ініціалізація CRM системи...');
            
            // Перевіряємо, чи DOM готовий
            if (document.readyState !== 'complete') {
                await new Promise(resolve => {
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', resolve);
                    } else {
                        resolve();
                    }
                });
            }
            
            // Чекаємо на доступність менеджера даних
            if (typeof CRMDataManager !== 'undefined') {
                this.dataManager = window.dataManager || new CRMDataManager();
            } else {
                // logger.warn('CRMDataManager не доступний, використовуємо базову функціональність');
            }
            
            // Завантаження даних користувача
            await this.loadUserData();
            
            // Налаштування рольового доступу
            this.setupRoleAccess();
            
            // Генерація навігації
            this.renderNavigation();
            
            // Завантаження дашборду
            this.loadDashboard();
            
            // Налаштовуємо інтерактивність
            this.setupInteractivity();
            
            // logger.log(`CRM ініціалізовано для ролі: ${this.userRole}`);
        } catch (error) {
            // logger.error('Критична помилка ініціалізації CRM:', error);
            this.handleCriticalError(error);
        }
    }
    
    async loadUserData() {
        try {
            // В реальному додатку тут буде API запит
            const mockUserData = this.getMockUserData();
            
            this.currentUser = mockUserData;
            this.userRole = mockUserData.role;
            
            // Оновлення інтерфейсу користувача
            this.updateUserInterface();
            
        } catch (error) {
            // logger.error('Помилка завантаження даних користувача:', error);
            this.handleAuthError();
        }
    }
    
    handleAuthError() {
        // logger.warn('Помилка автентифікації, перенаправлення на логін');
        window.location.href = '/login.html';
    }
    
    handleCriticalError(error) {
        // logger.error('Критична помилка CRM системи:', error);
        
        const errorContainer = document.body;
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #f8f9fa;">
                    <div style="text-align: center; padding: 40px; background: white; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #dc3545; margin-bottom: 20px;"></i>
                        <h2>Помилка завантаження системи</h2>
                        <p>Сталася критична помилка під час ініціалізації CRM системи.</p>
                        <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; font-family: monospace; text-align: left;">
                            ${error.message || 'Невідома помилка'}
                        </div>
                        <button onclick="location.reload()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            Перезавантажити
                        </button>
                        <a href="/login.html" style="display: block; margin-top: 10px; color: #6c757d; text-decoration: none;">
                            Повернутися до логіну
                        </a>
                    </div>
                </div>
            `;
        }
    }
    
    getMockUserData() {
        // Тимчасовий mock - в реальному проекті буде API
        const role = this.getRoleFromURL() || 'admin';
        
        const users = {
            admin: {
                id: 1,
                name: 'Іван Петренко',
                email: 'admin@deapseak.com',
                role: 'admin',
                avatar: 'https://via.placeholder.com/160x160/dc3545/ffffff?text=А'
            },
            dispatcher: {
                id: 2,
                name: 'Марія Коваленко',
                email: 'dispatcher@deapseak.com',
                role: 'dispatcher',
                avatar: 'https://via.placeholder.com/160x160/ffc107/000000?text=Д'
            },
            tech: {
                id: 3,
                name: 'Олексій Сидоренко',
                email: 'tech@deapseak.com',
                role: 'tech',
                avatar: 'https://via.placeholder.com/160x160/28a745/ffffff?text=Т'
            }
        };
        
        return users[role] || users.admin;
    }
    
    getRoleFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('role');
    }
    
    updateUserInterface() {
        const roleLabels = {
            admin: 'Адміністратор',
            dispatcher: 'Диспетчер',
            tech: 'Технік'
        };
        
        // Оновлення елементів інтерфейсу з перевіркою існування
        const elements = {
            'current-username': this.currentUser.name,
            'sidebar-username': this.currentUser.name,
            'sidebar-role': roleLabels[this.userRole],
            'current-role-badge': roleLabels[this.userRole],
            'user-avatar': this.currentUser.avatar,
            'user-info': `${this.currentUser.name} (${roleLabels[this.userRole]})`
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (id === 'user-avatar') {
                    element.src = value;
                } else if (id === 'current-role-badge') {
                    element.textContent = value;
                    element.className = `role-badge ${this.userRole}`;
                } else {
                    element.textContent = value;
                }
            } else {
                // logger.warn(`Елемент з ID "${id}" не знайдено`);
            }
        });
    }
    
    setupRoleAccess() {
        // Налаштовуємо дозволи для ролі
        this.setupRolePermissions();
        
        // Конфігурація модулів для кожної ролі
        const modulesByRole = {
            admin: [
                'dashboard',
                // QR управління - повне 
                'qr-generator',  // Генератор QR
                'qr-management', // Управління QR системою
                'qr-history',    // Історія сканувань  
                'qr-analytics',  // Аналітика QR
                'qr-batch',      // Пакетне керування
                
                // Основні модулі управління
                'lifts',         // Управління ліфтами
                'maps',          // Мапа ліфтів
                'users',         // Управління користувачами
                'settings',      // Налаштування системи
                
                // Аналітика та звітність
                'analytics-full', // Повна аналітика
                'reports',       // Звіти
                
                // Розумні системи управління
                'ai-assistant',      // AI помічник для прийняття рішень
                'knowledge-manager', // Управління базою знань
                'batch-manager',     // Пакетні операції
                'assignment-manager', // Управління завданнями
                'profile-manager',   // Управління профілями
                'monitoring-manager', // Система моніторингу
                'support-manager',   // Управління підтримкою
                'chat-system',       // Корпоративний чат
                'support'            // Підтримка
            ],
            dispatcher: [
                'dashboard',
                
                // QR - базове управління
                'qr-generator',  // Генерація нових QR
                'qr-management', // Перегляд та управління
                'qr-history',    // Історія сканувань
                
                // Основні функції диспетчера
                'assignments',   // Призначення завдань
                'technicians',   // Управління техніками
                'clients',       // Робота з клієнтами
                'monitoring',    // Моніторинг процесів
                
                // Аналітика та звітність
                'analytics-basic', // Базова аналітика
                'reports',        // Звіти
                
                // Координаційні системи
                'ai-assistant',      // AI для планування
                'assignment-manager', // Розподіл завдань
                'monitoring-manager', // Контроль виконання
                'batch-manager',     // Групові операції
                'chat-system'        // Координаційний чат
            ],
            tech: [
                'dashboard',
                
                // QR - тільки сканування
                'qr-scanner',    // Сканування QR кодів
                
                // Основні робочі функції
                'tasks',         // Мої завдання
                'schedule',      // Розклад роботи
                'checklists',    // Чек-листи перевірок
                'inspections',   // Проведення інспекцій
                
                // Навчання та довідка
                'knowledge-base', // База знань
                'manuals',       // Технічні інструкції
                'videos',        // Відео-гайди та навчання
                
                // Робочі інструменти
                'tools',         // Інструменти техніка
                'ar-helper',     // AR помічник - КЛЮЧОВА функція!
                'task-map',      // Карта завдань у полі
                'notifications', // Робочі сповіщення
                
                // Допоміжні системи
                'ai-assistant',  // AI помічник в роботі
                'voice-control', // Голосові команди (руки зайняті)
                'tool-manager',  // Управління інструментами
                'chat-system'    // Зв'язок з диспетчером
            ]
        };
        
        // Конфігурація прав доступу для кожної ролі
        const permissionsByRole = {
            admin: {
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canExport: true,
                canManageUsers: true,
                canViewAnalytics: true,
                canManageSettings: true,
                canGenerateQR: true,
                canManageQR: true,
                canViewQRAnalytics: true
            },
            dispatcher: {
                canCreate: true,
                canEdit: true,
                canDelete: false,
                canExport: true,
                canManageUsers: false,
                canViewAnalytics: true,
                canManageSettings: false,
                canGenerateQR: true,
                canManageQR: true,
                canViewQRAnalytics: false  // Без аналітики QR
            },
            tech: {
                canCreate: false,
                canEdit: true,  // Тільки свої завдання
                canDelete: false,
                canExport: false,
                canManageUsers: false,
                canViewAnalytics: false,
                canManageSettings: false,
                canGenerateQR: false,
                canManageQR: false,
                canViewQRAnalytics: false,
                canScanQR: true  // Тільки сканування
            }
        };
        
        this.availableModules = modulesByRole[this.userRole] || [];
        this.permissions = permissionsByRole[this.userRole] || {};
        
        // logger.log(`Завантажуємо модулі для ролі: ${this.userRole}`, this.availableModules);
    }
    
    setupRolePermissions() {
        this.rolePermissions = {
            admin: ['admin.*', 'qr.*', 'lifts.*', 'users.*', 'analytics.*', 'reports.*'],
            dispatcher: ['dispatcher.*', 'qr.read', 'qr.generate', 'lifts.read', 'users.read', 'tasks.*'],
            tech: ['tech.*', 'maintenance.*', 'qr.read', 'qr.scan', 'schedule.*'],
            client: ['client.*', 'profile.*', 'qr.scan']
        };
        
        this.userPermissions = this.rolePermissions[this.userRole] || [];
    }
    
    hasPermission(permission) {
        if (!this.userPermissions) return false;
        
        return this.userPermissions.some(p => {
            if (p.endsWith('.*')) {
                const prefix = p.slice(0, -2);
                return permission.startsWith(prefix);
            }
            return p === permission;
        });
    }
    
    renderNavigation() {
        const navigationContainer = document.getElementById('main-navigation');
        navigationContainer.innerHTML = '';
        
        // Конфігурація всіх модулів
        const modules = {
            dashboard: {
                title: 'Головна панель',
                icon: 'fas fa-tachometer-alt',
                action: () => this.loadDashboard()
            },
            'qr-full': {
                title: 'QR Система',
                icon: 'fas fa-qrcode',
                submenu: [
                    { title: 'Генератор QR', icon: 'fas fa-plus-circle', action: () => this.loadModule('qr-generator') },
                    { title: 'Управління QR', icon: 'fas fa-cog', action: () => this.loadModule('qr-management') },
                    { title: 'Історія сканувань', icon: 'fas fa-history', action: () => this.loadModule('qr-history') },
                    { title: 'Аналітика QR', icon: 'fas fa-chart-line', action: () => this.loadModule('qr-analytics') },
                    { title: 'Пакетне керування', icon: 'fas fa-layer-group', action: () => this.loadModule('qr-batch') }
                ]
            },
            'qr-basic': {
                title: 'QR Система',
                icon: 'fas fa-qrcode',
                submenu: [
                    { title: 'Генератор QR', icon: 'fas fa-plus-circle', action: () => this.loadModule('qr-generator') },
                    { title: 'Управління QR', icon: 'fas fa-cog', action: () => this.loadModule('qr-management') },
                    { title: 'Історія сканувань', icon: 'fas fa-history', action: () => this.loadModule('qr-history') }
                ]
            },
            'qr-scanner': {
                title: 'QR Сканер',
                icon: 'fas fa-camera',
                action: () => this.loadModule('qr-scanner')
            },
            lifts: {
                title: 'Ліфти',
                icon: 'fas fa-elevator',
                submenu: [
                    { title: 'Управління ліфтами', icon: 'fas fa-list', action: () => this.loadModule('lifts') },
                    { title: 'Мапа ліфтів', icon: 'fas fa-map-marked-alt', action: () => this.loadModule('maps') }
                ]
            },
            users: {
                title: 'Користувачі',
                icon: 'fas fa-users',
                action: () => this.loadModule('users')
            },
            'analytics-full': {
                title: 'Аналітика',
                icon: 'fas fa-chart-bar',
                action: () => this.loadModule('analytics')
            },
            'analytics-basic': {
                title: 'Базова аналітика',
                icon: 'fas fa-chart-line',
                action: () => this.loadModule('analytics-basic')
            },
            reports: {
                title: 'Звіти',
                icon: 'fas fa-file-alt',
                action: () => this.loadModule('reports')
            },
            settings: {
                title: 'Налаштування',
                icon: 'fas fa-cog',
                action: () => this.loadModule('settings')
            },
            assignments: {
                title: 'Призначення',
                icon: 'fas fa-tasks',
                action: () => this.loadModule('assignments')
            },
            technicians: {
                title: 'Техніки',
                icon: 'fas fa-hard-hat',
                action: () => this.loadModule('technicians')
            },
            clients: {
                title: 'Клієнти',
                icon: 'fas fa-handshake',
                action: () => this.loadModule('clients')
            },
            monitoring: {
                title: 'Моніторинг',
                icon: 'fas fa-desktop',
                action: () => this.loadModule('monitoring')
            },
            tasks: {
                title: 'Мої завдання',
                icon: 'fas fa-clipboard-list',
                action: () => this.loadModule('tasks')
            },
            schedule: {
                title: 'Розклад',
                icon: 'fas fa-calendar-alt',
                action: () => this.loadModule('schedule')
            },
            checklists: {
                title: 'Чек-листи',
                icon: 'fas fa-clipboard-check',
                action: () => this.loadModule('checklists')
            },
            'knowledge-base': {
                title: 'База знань',
                icon: 'fas fa-book',
                action: () => this.loadModule('knowledge-base')
            },
            tools: {
                title: 'Інструменти',
                icon: 'fas fa-toolbox',
                action: () => this.loadModule('tools')
            },
            support: {
                title: 'Підтримка',
                icon: 'fas fa-headset',
                action: () => this.loadModule('support')
            },
            
            // Розумні модулі та допоміжні системи
            'ai-assistant': {
                title: 'AI Асистент',
                icon: 'fas fa-robot',
                action: () => this.loadModule('ai-assistant')
            },
            'ar-helper': {
                title: 'AR Помічник',
                icon: 'fas fa-cube',
                action: () => this.loadModule('ar-helper')
            },
            'voice-control': {
                title: 'Голосове керування',
                icon: 'fas fa-microphone',
                action: () => this.loadModule('voice-control')
            },
            'knowledge-manager': {
                title: 'Менеджер знань',
                icon: 'fas fa-brain',
                action: () => this.loadModule('knowledge-manager')
            },
            'batch-manager': {
                title: 'Пакетний менеджер',
                icon: 'fas fa-boxes',
                action: () => this.loadModule('batch-manager')
            },
            'assignment-manager': {
                title: 'Менеджер завдань',
                icon: 'fas fa-clipboard-list',
                action: () => this.loadModule('assignment-manager')
            },
            'tool-manager': {
                title: 'Менеджер інструментів',
                icon: 'fas fa-wrench',
                action: () => this.loadModule('tool-manager')
            },
            'profile-manager': {
                title: 'Менеджер профілів',
                icon: 'fas fa-user-cog',
                action: () => this.loadModule('profile-manager')
            },
            'monitoring-manager': {
                title: 'Менеджер моніторингу',
                icon: 'fas fa-chart-line',
                action: () => this.loadModule('monitoring-manager')
            },
            'support-manager': {
                title: 'Менеджер підтримки',
                icon: 'fas fa-life-ring',
                action: () => this.loadModule('support-manager')
            },
            'chat-system': {
                title: 'Система чату',
                icon: 'fas fa-comments',
                action: () => this.loadModule('chat-system')
            },
            
            // Додаткові модулі для техніків
            'inspections': {
                title: 'Інспекції',
                icon: 'fas fa-search',
                action: () => this.loadModule('inspections')
            },
            'manuals': {
                title: 'Інструкції',
                icon: 'fas fa-book-open',
                action: () => this.loadModule('manuals')
            },
            'videos': {
                title: 'Відео-гайди',
                icon: 'fas fa-video',
                action: () => this.loadModule('videos')
            },
            'task-map': {
                title: 'Карта завдань',
                icon: 'fas fa-map-marked-alt',
                action: () => this.loadModule('task-map')
            },
            'notifications': {
                title: 'Сповіщення',
                icon: 'fas fa-bell',
                action: () => this.loadModule('notifications')
            }
        };
        
        // Генерування пунктів меню
        this.availableModules.forEach(moduleId => {
            const module = modules[moduleId];
            if (!module) return;
            
            const menuItem = document.createElement('li');
            menuItem.className = 'nav-item';
            
            if (module.submenu) {
                // Пункт з підменю
                menuItem.innerHTML = `
                    <a href="#" class="nav-link">
                        <i class="nav-icon ${module.icon}"></i>
                        <p>
                            ${module.title}
                            <i class="right fas fa-angle-left"></i>
                        </p>
                    </a>
                    <ul class="nav nav-treeview">
                        ${module.submenu.map(item => `
                            <li class="nav-item">
                                <a href="#" class="nav-link" onclick="window.crmSystem.${item.action.toString().match(/loadModule\('(.+)'\)/)?.[1] ? `loadModule('${item.action.toString().match(/loadModule\('(.+)'\)/)[1]}')` : item.action.toString()}">
                                    <i class="${item.icon} nav-icon"></i>
                                    <p>${item.title}</p>
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                `;
            } else {
                // Звичайний пункт меню
                menuItem.innerHTML = `
                    <a href="#" class="nav-link" onclick="window.crmSystem.loadModule('${moduleId}')">
                        <i class="nav-icon ${module.icon}"></i>
                        <p>${module.title}</p>
                    </a>
                `;
            }
            
            navigationContainer.appendChild(menuItem);
        });
    }
    
    loadDashboard() {
        const content = this.generateDashboard();
        document.getElementById('main-content').innerHTML = content;
        
        // Ініціалізація компонентів дашборду
        this.initDashboardComponents();
    }
    
    generateDashboard() {
        const roleNames = {
            admin: 'Адміністратора',
            dispatcher: 'Диспетчера',
            tech: 'Техніка'
        };
        
        return `
            <div class="content-header">
                <div class="container-fluid">
                    <div class="row mb-2">
                        <div class="col-sm-6">
                            <h1 class="m-0">Панель ${roleNames[this.userRole]}</h1>
                        </div>
                        <div class="col-sm-6">
                            <ol class="breadcrumb float-sm-right">
                                <li class="breadcrumb-item active">Головна</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
            
            <section class="content">
                <div class="container-fluid">
                    ${this.generateRoleSpecificContent()}
                </div>
            </section>
        `;
    }
    
    generateRoleSpecificContent() {
        switch (this.userRole) {
            case 'admin':
                return this.generateAdminDashboard();
            case 'dispatcher':
                return this.generateDispatcherDashboard();
            case 'tech':
                return this.generateTechDashboard();
            default:
                return '<div class="alert alert-warning">Невідома роль користувача</div>';
        }
    }
    
    generateAdminDashboard() {
        return `
            <div class="row">
                <div class="col-lg-3 col-6">
                    <div class="small-box bg-info stats-card">
                        <div class="inner">
                            <h3 id="total-lifts">156</h3>
                            <p>Всього ліфтів</p>
                        </div>
                        <div class="icon">
                            <i class="fas fa-elevator"></i>
                        </div>
                        <a href="#" class="small-box-footer" onclick="window.crmSystem.loadModule('lifts')">
                            Детальніше <i class="fas fa-arrow-circle-right"></i>
                        </a>
                    </div>
                </div>
                
                <div class="col-lg-3 col-6">
                    <div class="small-box bg-success stats-card">
                        <div class="inner">
                            <h3 id="total-qr">342</h3>
                            <p>QR-кодів згенеровано</p>
                        </div>
                        <div class="icon">
                            <i class="fas fa-qrcode"></i>
                        </div>
                        <a href="#" class="small-box-footer" onclick="window.crmSystem.loadModule('qr-analytics')">
                            Аналітика <i class="fas fa-arrow-circle-right"></i>
                        </a>
                    </div>
                </div>
                
                <div class="col-lg-3 col-6">
                    <div class="small-box bg-warning stats-card">
                        <div class="inner">
                            <h3 id="active-users">23</h3>
                            <p>Активних користувачів</p>
                        </div>
                        <div class="icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <a href="#" class="small-box-footer" onclick="window.crmSystem.loadModule('users')">
                            Управління <i class="fas fa-arrow-circle-right"></i>
                        </a>
                    </div>
                </div>
                
                <div class="col-lg-3 col-6">
                    <div class="small-box bg-danger stats-card">
                        <div class="inner">
                            <h3 id="pending-tasks">12</h3>
                            <p>Завдань в очікуванні</p>
                        </div>
                        <div class="icon">
                            <i class="fas fa-tasks"></i>
                        </div>
                        <a href="#" class="small-box-footer" onclick="window.crmSystem.loadModule('assignments')">
                            Переглянути <i class="fas fa-arrow-circle-right"></i>
                        </a>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Активність системи</h3>
                        </div>
                        <div class="card-body">
                            <canvas id="activity-chart" width="400" height="200"></canvas>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Швидкі дії</h3>
                        </div>
                        <div class="card-body">
                            <div class="d-grid gap-2">
                                <button class="btn btn-primary mb-2" onclick="window.crmSystem.loadModule('qr-generator')">
                                    <i class="fas fa-plus"></i> Створити QR-код
                                </button>
                                <button class="btn btn-success mb-2" onclick="window.crmSystem.loadModule('lifts')">
                                    <i class="fas fa-plus"></i> Додати ліфт
                                </button>
                                <button class="btn btn-info mb-2" onclick="window.crmSystem.loadModule('users')">
                                    <i class="fas fa-user-plus"></i> Новий користувач
                                </button>
                                <button class="btn btn-warning" onclick="window.crmSystem.loadModule('reports')">
                                    <i class="fas fa-file-export"></i> Експорт звіту
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    generateDispatcherDashboard() {
        return `
            <div class="row">
                <div class="col-lg-3 col-6">
                    <div class="small-box bg-primary stats-card">
                        <div class="inner">
                            <h3 id="active-assignments">18</h3>
                            <p>Активних завдань</p>
                        </div>
                        <div class="icon">
                            <i class="fas fa-clipboard-list"></i>
                        </div>
                        <a href="#" class="small-box-footer" onclick="window.crmSystem.loadModule('assignments')">
                            Переглянути <i class="fas fa-arrow-circle-right"></i>
                        </a>
                    </div>
                </div>
                
                <div class="col-lg-3 col-6">
                    <div class="small-box bg-success stats-card">
                        <div class="inner">
                            <h3 id="available-techs">7</h3>
                            <p>Вільних техніків</p>
                        </div>
                        <div class="icon">
                            <i class="fas fa-hard-hat"></i>
                        </div>
                        <a href="#" class="small-box-footer" onclick="window.crmSystem.loadModule('technicians')">
                            Управління <i class="fas fa-arrow-circle-right"></i>
                        </a>
                    </div>
                </div>
                
                <div class="col-lg-3 col-6">
                    <div class="small-box bg-info stats-card">
                        <div class="inner">
                            <h3 id="client-requests">45</h3>
                            <p>Запитів клієнтів</p>
                        </div>
                        <div class="icon">
                            <i class="fas fa-handshake"></i>
                        </div>
                        <a href="#" class="small-box-footer" onclick="window.crmSystem.loadModule('clients')">
                            Переглянути <i class="fas fa-arrow-circle-right"></i>
                        </a>
                    </div>
                </div>
                
                <div class="col-lg-3 col-6">
                    <div class="small-box bg-warning stats-card">
                        <div class="inner">
                            <h3 id="qr-scans-today">89</h3>
                            <p>QR сканувань сьогодні</p>
                        </div>
                        <div class="icon">
                            <i class="fas fa-qrcode"></i>
                        </div>
                        <a href="#" class="small-box-footer" onclick="window.crmSystem.loadModule('qr-management')">
                            QR система <i class="fas fa-arrow-circle-right"></i>
                        </a>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-12">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Поточні завдання техніків</h3>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>Технік</th>
                                            <th>Завдання</th>
                                            <th>Статус</th>
                                            <th>Пріоритет</th>
                                            <th>Дії</th>
                                        </tr>
                                    </thead>
                                    <tbody id="tech-assignments-table">
                                        <!-- Заповнюється динамічно -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    generateTechDashboard() {
        return `
            <div class="row">
                <div class="col-lg-4 col-6">
                    <div class="small-box bg-primary stats-card">
                        <div class="inner">
                            <h3 id="my-tasks">5</h3>
                            <p>Моїх завдань</p>
                        </div>
                        <div class="icon">
                            <i class="fas fa-tasks"></i>
                        </div>
                        <a href="#" class="small-box-footer" onclick="window.crmSystem.loadModule('tasks')">
                            Переглянути <i class="fas fa-arrow-circle-right"></i>
                        </a>
                    </div>
                </div>
                
                <div class="col-lg-4 col-6">
                    <div class="small-box bg-success stats-card">
                        <div class="inner">
                            <h3 id="completed-today">3</h3>
                            <p>Виконано сьогодні</p>
                        </div>
                        <div class="icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <a href="#" class="small-box-footer" onclick="window.crmSystem.loadModule('tasks')">
                            Історія <i class="fas fa-arrow-circle-right"></i>
                        </a>
                    </div>
                </div>
                
                <div class="col-lg-4 col-6">
                    <div class="small-box bg-info stats-card">
                        <div class="inner">
                            <h3 id="qr-scanned">12</h3>
                            <p>QR відскановано</p>
                        </div>
                        <div class="icon">
                            <i class="fas fa-camera"></i>
                        </div>
                        <a href="#" class="small-box-footer" onclick="window.crmSystem.loadModule('qr-scanner')">
                            Сканувати <i class="fas fa-arrow-circle-right"></i>
                        </a>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Поточні завдання</h3>
                        </div>
                        <div class="card-body">
                            <div id="current-tasks-list">
                                <!-- Заповнюється динамічно -->
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Швидкий доступ</h3>
                        </div>
                        <div class="card-body">
                            <div class="d-grid gap-2">
                                <button class="btn btn-primary mb-2" onclick="window.crmSystem.loadModule('qr-scanner')">
                                    <i class="fas fa-camera"></i> QR Сканер
                                </button>
                                <button class="btn btn-success mb-2" onclick="window.crmSystem.loadModule('checklists')">
                                    <i class="fas fa-clipboard-check"></i> Чек-листи
                                </button>
                                <button class="btn btn-info mb-2" onclick="window.crmSystem.loadModule('knowledge-base')">
                                    <i class="fas fa-book"></i> База знань
                                </button>
                                <button class="btn btn-warning" onclick="window.crmSystem.loadModule('tools')">
                                    <i class="fas fa-toolbox"></i> Інструменти
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    initDashboardComponents() {
        // Ініціалізація компонентів залежно від ролі
        switch (this.userRole) {
            case 'admin':
                this.initAdminDashboard();
                break;
            case 'dispatcher':
                this.initDispatcherDashboard();
                break;
            case 'tech':
                this.initTechDashboard();
                break;
        }
    }
    
    initAdminDashboard() {
        // Завантаження статистики для адміна
        this.loadAdminStats();
    }
    
    initDispatcherDashboard() {
        // Завантаження даних для диспетчера
        this.loadDispatcherData();
    }
    
    initTechDashboard() {
        // Завантаження завдань для техніка
        this.loadTechTasks();
    }
    
    loadAdminStats() {
        // Mock data - в реальному додатку API запит
        setTimeout(() => {
            document.getElementById('total-lifts').textContent = '156';
            document.getElementById('total-qr').textContent = '342';
            document.getElementById('active-users').textContent = '23';
            document.getElementById('pending-tasks').textContent = '12';
        }, 500);
    }
    
    loadDispatcherData() {
        // Mock data для диспетчера
        setTimeout(() => {
            document.getElementById('active-assignments').textContent = '18';
            document.getElementById('available-techs').textContent = '7';
            document.getElementById('client-requests').textContent = '45';
            document.getElementById('qr-scans-today').textContent = '89';
        }, 500);
    }
    
    loadTechTasks() {
        // Mock data для техніка
        setTimeout(() => {
            document.getElementById('my-tasks').textContent = '5';
            document.getElementById('completed-today').textContent = '3';
            document.getElementById('qr-scanned').textContent = '12';
        }, 500);
    }
    
    async loadModule(moduleId) {
        // logger.log(`Завантаження модуля: ${moduleId}`);
        
        // Спеціальний випадок для dashboard - використовуємо власну функцію
        if (moduleId === 'dashboard') {
            this.loadDashboard();
            this.setActiveMenuItem(moduleId);
            return;
        }
        
        // Перевірка доступу до модуля
        if (!this.hasAccessToModule(moduleId)) {
            this.showAccessDenied();
            return;
        }
        
        // Показуємо лоадер
        document.getElementById('main-content').innerHTML = `
            <div class="content-header">
                <div class="container-fluid">
                    <div class="row mb-2">
                        <div class="col-sm-6">
                            <h1 class="m-0">Завантаження...</h1>
                        </div>
                    </div>
                </div>
            </div>
            <section class="content">
                <div class="container-fluid">
                    <div class="text-center" style="padding: 50px;">
                        <i class="fas fa-spinner fa-spin fa-3x text-primary"></i>
                        <p class="mt-3">Завантаження модуля ${moduleId}...</p>
                    </div>
                </div>
            </section>
        `;
        
        // Встановлюємо поточний модуль
        this.currentModule = moduleId;
        
        try {
            // Генеруємо інтерактивний контент модуля
            const content = await this.generateInteractiveModule(moduleId);
            document.getElementById('main-content').innerHTML = content;
            
            // Ініціалізація модуля після завантаження
            this.initModuleAfterLoad(moduleId);
            
        } catch (error) {
            // logger.error(`Помилка завантаження модуля ${moduleId}:`, error);
            document.getElementById('main-content').innerHTML = this.getDefaultModuleContent(moduleId);
        }
        
        // Активація пункту меню
        this.setActiveMenuItem(moduleId);
    }

    async generateInteractiveModule(moduleId) {
        // logger.log(`Генерація інтерактивного модуля: ${moduleId}`);
        
        // Спробуємо завантажити існуючий файл, якщо не знайдемо - створимо динамічно
        try {
            const content = await this.getModuleContent(moduleId);
            return content;
        } catch (error) {
            // logger.log(`Файл для ${moduleId} не знайдено, генеруємо динамічно`);
            return this.generateDynamicModule(moduleId);
        }
    }

    generateDynamicModule(moduleId) {
        const moduleConfig = this.getModuleConfig(moduleId);
        
        return `
            <div class="content-header">
                <div class="container-fluid">
                    <div class="row mb-2">
                        <div class="col-sm-6">
                            <h1 class="m-0">
                                <i class="${moduleConfig.icon}"></i>
                                ${moduleConfig.title}
                            </h1>
                        </div>
                        <div class="col-sm-6">
                            <div class="float-sm-right">
                                ${this.generateModuleActions(moduleId)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <section class="content">
                <div class="container-fluid">
                    ${this.generateModuleContent(moduleId)}
                </div>
            </section>
        `;
    }

    getModuleConfig(moduleId) {
        const configs = {
            'users': {
                title: 'Управління користувачами',
                icon: 'fas fa-users',
                description: 'Керування користувачами системи'
            },
            'lifts': {
                title: 'Управління ліфтами',
                icon: 'fas fa-elevator',
                description: 'Керування ліфтами та їх станом'
            },
            'qr-generator': {
                title: 'Генератор QR-кодів',
                icon: 'fas fa-qrcode',
                description: 'Створення QR-кодів для ліфтів'
            },
            'qr-management': {
                title: 'Управління QR',
                icon: 'fas fa-cog',
                description: 'Керування QR-кодами системи'
            },
            'tasks': {
                title: 'Управління завданнями',
                icon: 'fas fa-tasks',
                description: 'Створення та відстеження завдань'
            },
            'analytics': {
                title: 'Аналітика системи',
                icon: 'fas fa-chart-bar',
                description: 'Статистика та аналіз даних'
            },
            'reports': {
                title: 'Звіти',
                icon: 'fas fa-file-alt',
                description: 'Генерація та перегляд звітів'
            },
            'settings': {
                title: 'Налаштування',
                icon: 'fas fa-cogs',
                description: 'Системні налаштування'
            }
        };
        
        return configs[moduleId] || {
            title: moduleId.charAt(0).toUpperCase() + moduleId.slice(1),
            icon: 'fas fa-cube',
            description: `Модуль ${moduleId}`
        };
    }

    generateModuleActions(moduleId) {
        const actions = [];
        
        // Загальні дії для всіх модулів
        actions.push(`
            <button type="button" class="btn btn-primary" data-action="refresh-data">
                <i class="fas fa-sync"></i> Оновити
            </button>
        `);
        
        // Специфічні дії для модулів
        switch (moduleId) {
            case 'users':
                if (this.hasPermission('users.create')) {
                    actions.unshift(`
                        <button type="button" class="btn btn-success" data-action="add-user">
                            <i class="fas fa-plus"></i> Додати користувача
                        </button>
                    `);
                }
                actions.push(`
                    <button type="button" class="btn btn-info" data-action="export-data" data-type="users">
                        <i class="fas fa-download"></i> Експорт
                    </button>
                `);
                break;
                
            case 'lifts':
                if (this.hasPermission('lifts.create')) {
                    actions.unshift(`
                        <button type="button" class="btn btn-success" data-action="add-lift">
                            <i class="fas fa-plus"></i> Додати ліфт
                        </button>
                    `);
                }
                actions.push(`
                    <button type="button" class="btn btn-info" data-action="export-data" data-type="lifts">
                        <i class="fas fa-download"></i> Експорт
                    </button>
                `);
                break;
                
            case 'qr-generator':
                actions.unshift(`
                    <button type="button" class="btn btn-success" data-action="generate-qr">
                        <i class="fas fa-qrcode"></i> Згенерувати QR
                    </button>
                `);
                break;
                
            case 'tasks':
                if (this.hasPermission('tasks.create')) {
                    actions.unshift(`
                        <button type="button" class="btn btn-success" data-action="add-task">
                            <i class="fas fa-plus"></i> Нове завдання
                        </button>
                    `);
                }
                break;
        }
        
        return actions.join(' ');
    }

    generateModuleContent(moduleId) {
        switch (moduleId) {
            case 'users':
                return this.generateUsersContent();
            case 'lifts':
                return this.generateLiftsContent();
            case 'qr-generator':
                return this.generateQRGeneratorContent();
            case 'qr-management':
                return this.generateQRManagementContent();
            case 'tasks':
                return this.generateTasksContent();
            case 'analytics':
                return this.generateAnalyticsContent();
            case 'reports':
                return this.generateReportsContent();
            case 'settings':
                return this.generateSettingsContent();
            default:
                return this.generateDefaultContent(moduleId);
        }
    }

    generateUsersContent() {
        const users = this.dataManager ? this.dataManager.getAllUsers() : this.getMockUsers();
        
        return `
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Список користувачів</h3>
                            <div class="card-tools">
                                <div class="input-group input-group-sm" style="width: 250px;">
                                    <input type="text" class="form-control" placeholder="Пошук користувачів..." id="users-search">
                                    <div class="input-group-append">
                                        <button type="button" class="btn btn-default">
                                            <i class="fas fa-search"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="card-body table-responsive p-0">
                            <table class="table table-hover text-nowrap" data-sortable="true">
                                <thead>
                                    <tr>
                                        <th data-sort="id">ID</th>
                                        <th data-sort="name">Ім'я</th>
                                        <th data-sort="email">Email</th>
                                        <th data-sort="role">Роль</th>
                                        <th data-sort="status">Статус</th>
                                        <th data-sort="created">Створено</th>
                                        <th>Дії</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${users.map(user => `
                                        <tr>
                                            <td>${user.id}</td>
                                            <td>
                                                <div class="d-flex align-items-center">
                                                    <img src="${user.avatar || 'https://via.placeholder.com/32x32/17a2b8/ffffff?text=' + user.name.charAt(0)}" 
                                                         class="img-circle elevation-2 mr-2" 
                                                         width="32" height="32" alt="${user.name}">
                                                    ${user.name}
                                                </div>
                                            </td>
                                            <td>${user.email}</td>
                                            <td>
                                                <span class="badge badge-${this.getRoleBadgeColor(user.role)}">
                                                    ${this.getRoleLabel(user.role)}
                                                </span>
                                            </td>
                                            <td>
                                                <span class="badge badge-${user.active ? 'success' : 'secondary'}">
                                                    ${user.active ? 'Активний' : 'Неактивний'}
                                                </span>
                                            </td>
                                            <td>${this.formatDate(user.createdAt)}</td>
                                            <td>
                                                <div class="btn-group btn-group-sm">
                                                    <button type="button" class="btn btn-info" data-action="view-details" data-type="user" data-id="${user.id}" title="Переглянути">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                    ${this.hasPermission('users.edit') ? `
                                                        <button type="button" class="btn btn-warning" data-action="edit-user" data-id="${user.id}" title="Редагувати">
                                                            <i class="fas fa-edit"></i>
                                                        </button>
                                                    ` : ''}
                                                    ${this.hasPermission('users.delete') ? `
                                                        <button type="button" class="btn btn-danger" data-action="delete-user" data-id="${user.id}" title="Видалити">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    ` : ''}
                                                    <button type="button" class="btn btn-secondary" data-action="toggle-status" data-type="user" data-id="${user.id}" title="Змінити статус">
                                                        <i class="fas fa-toggle-${user.active ? 'on' : 'off'}"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        <div class="card-footer">
                            <div class="row">
                                <div class="col-sm-12 col-md-5">
                                    <div class="dataTables_info">
                                        Показано ${users.length} записів
                                    </div>
                                </div>
                                <div class="col-sm-12 col-md-7">
                                    <div class="dataTables_paginate paging_simple_numbers">
                                        <ul class="pagination">
                                            <li class="paginate_button page-item previous disabled">
                                                <a href="#" class="page-link">Попередня</a>
                                            </li>
                                            <li class="paginate_button page-item active">
                                                <a href="#" class="page-link">1</a>
                                            </li>
                                            <li class="paginate_button page-item next disabled">
                                                <a href="#" class="page-link">Наступна</a>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    initModuleAfterLoad(moduleId) {
        // Ініціалізація специфічних компонентів модуля після завантаження
        switch (moduleId) {
            case 'qr-generator':
                this.initQRGenerator();
                break;
            case 'qr-scanner':
                this.initQRScanner();
                break;
            case 'qr-analytics':
                this.initQRAnalytics();
                break;
            case 'tasks':
                this.initTasks();
                break;
            // Додати інші модулі за потребою
        }
    }
    
    // Методи ініціалізації для специфічних модулів
    initQRGenerator() {
        // logger.log('Ініціалізація генератора QR кодів');
        // Тут може бути додаткова логіка
    }
    
    initQRScanner() {
        // logger.log('Ініціалізація QR сканера');
        // Тут може бути додаткова логіка
    }
    
    initQRAnalytics() {
        // logger.log('Ініціалізація аналітики QR');
        // Тут може бути додаткова логіка
    }
    
    initTasks() {
        // logger.log('Ініціалізація модуля завдань');
        // Тут може бути додаткова логіка
    }
    
    hasAccessToModule(moduleId) {
        // logger.log(`Перевірка доступу до модуля: ${moduleId}`);
        // logger.log(`Доступні модулі для ролі ${this.userRole}:`, this.availableModules);
        
        // Пряма перевірка доступу
        if (this.availableModules.includes(moduleId)) {
            // logger.log(`Модуль ${moduleId} знайдено в availableModules`);
            return true;
        }
        
        // Перевірка за префіксом (наприклад qr-* модулі)
        if (this.availableModules.some(mod => mod.startsWith(moduleId.split('-')[0]))) {
            return true;
        }
        
        // Додаткові перевірки для специфічних модулів
        const moduleAliases = {
            'qr-management': ['qr-full', 'qr-basic'],
            'qr-generator': ['qr-full', 'qr-management'], 
            'qr-scanner': ['qr-full'],
            'qr-full': ['qr-management', 'qr-generator'],
            'lift-management': ['lifts'],
            'analytics': ['analytics-full', 'analytics-basic'],
            'analytics-full': ['analytics'],
            'analytics-basic': ['analytics'],
            'lifts': ['lift-management'],
            
            // Додаткові псевдоніми для техніків
            'schedule': ['dashboard'],
            'checklists': ['dashboard'], 
            'knowledge-base': ['dashboard'],
            'tools': ['dashboard']
        };
        
        if (moduleAliases[moduleId]) {
            return moduleAliases[moduleId].some(alias => this.availableModules.includes(alias));
        }
        
        return false;
    }
    
    showAccessDenied() {
        const content = `
            <div class="forbidden-content">
                <i class="fas fa-ban text-danger"></i>
                <h2>Доступ заборонено</h2>
                <p>У вас немає прав для доступу до цього розділу.</p>
                <button class="btn btn-primary" onclick="window.crmSystem.loadDashboard()">
                    Повернутися до головної
                </button>
            </div>
        `;
        document.getElementById('main-content').innerHTML = content;
    }
    
    async getModuleContent(moduleId) {
        // logger.log(`Завантаження модуля: ${moduleId}`);
        
        try {
            // Визначаємо шлях до файлу залежно від модуля та ролі
            const modulePath = this.getModulePath(moduleId);
            // logger.log(`Шлях до модуля ${moduleId}: ${modulePath}`);
            
            if (modulePath) {
                const response = await fetch(modulePath);
                // logger.log(`Відповідь сервера для ${moduleId}: ${response.status}`);
                
                if (response.ok) {
                    const htmlContent = await response.text();
                    // logger.log(`Модуль ${moduleId} успішно завантажено`);
                    return this.extractContentFromHtml(htmlContent);
                } else {
                    // logger.error(`Помилка HTTP ${response.status} для модуля ${moduleId}`);
                }
            } else {
                // logger.error(`Шлях для модуля ${moduleId} не знайдено`);
            }
        } catch (error) {
            // logger.error(`Помилка завантаження модуля ${moduleId}:`, error);
        }
        
        // Якщо не вдалося завантажити - показуємо заглушку
        // logger.log(`Показуємо заглушку для модуля ${moduleId}`);
        return this.getDefaultModuleContent(moduleId);
    }
    
    getModulePath(moduleId) {
        // Визначаємо шлях до файлу залежно від модуля та ролі користувача
        
        // Рольово-специфічні модулі
        if (this.userRole === 'tech') {
            const techModulePaths = {
                'tasks': '/pages/tech/tasks.html',
                'qr-scanner': '/pages/tech/qr-scanner.html',
                'schedule': '/pages/tech/schedule.html',
                'checklists': '/pages/tech/checklists.html',
                'knowledge-base': '/pages/tech/knowledge-base.html',
                'tools': '/pages/tech/tools.html',
                'ar-helper': '/pages/tech/ar-helper.html',
                'inspections': '/pages/tech/inspections.html',
                'manuals': '/pages/tech/manuals.html',
                'videos': '/pages/tech/videos.html',
                'task-map': '/pages/tech/task-map.html',
                'notifications': '/pages/tech/notifications.html'
            };
            if (techModulePaths[moduleId]) {
                return techModulePaths[moduleId];
            }
        }
        
        const modulePaths = {
            // QR модулі - використовуємо відповідні файли
            'qr-generator': '/assets/modules/qr-generator.html',
            'qr-scanner': '/assets/modules/qr-scanner.html',
            'qr-management': '/pages/admin/qr-management.html',    // Управління QR кодами
            'qr-full': '/pages/admin/qr-management.html',          // Повне управління QR для адмінів
            'qr-history': '/pages/admin/qr-history.html',
            'qr-analytics': '/pages/admin/qr-analytics.html',
            'qr-batch': '/pages/admin/qr-batch.html',
            
            // Нові функціональні модулі
            'lift-management': '/assets/modules/lift-management.html',
            'tasks': '/assets/modules/tasks.html',
            'analytics': '/assets/modules/analytics.html',    // Новий модуль аналітики
            'analytics-full': '/pages/admin/analytics.html',    // Повна аналітика для адміна
            'analytics-basic': '/assets/modules/analytics.html', // Базова аналітика для диспетчера
            
            // Інші модулі
            'lifts': '/assets/modules/lift-management.html',  // Перенаправляємо на новий модуль
            'maps': '/pages/admin/maps.html',              // Мапа ліфтів
            'users': '/pages/admin/users.html',
            'reports': '/assets/modules/reports.html',  // Уніфікований модуль звітів
            'settings': '/pages/admin/settings.html',
            
            // Розумні модулі
            'ai-assistant': '/pages/ai-assistant/ai-assistant.html',
            'ar-helper': '/pages/ar-helper/index.html',
            'voice-control': '/pages/voice-control/index.html',
            'knowledge-manager': '/pages/knowledge-manager/index.html',
            'batch-manager': '/pages/batch-manager/index.html',
            'assignment-manager': '/pages/assignment-manager/index.html',
            'tool-manager': '/pages/tool-manager/index.html',
            'profile-manager': '/pages/profile-manager/index.html',
            'monitoring-manager': '/pages/monitoring-manager/index.html',
            'support-manager': '/pages/support-manager/index.html',
            'chat-system': '/pages/chat-system/index.html',
            
            // Модулі диспетчера
            'assignments': '/pages/dispatcher/assignments.html',
            'technicians': '/pages/dispatcher/technicians.html',
            'clients': '/pages/dispatcher/clients.html',
            'monitoring': '/pages/dispatcher/monitoring.html',
            
            // Загальні модулі
            'support': '/pages/support.html'
        };
        
        return modulePaths[moduleId];
    }
    
    extractContentFromHtml(htmlContent) {
        // Створюємо тимчасовий DOM парсер
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Витягуємо CSS стилі з head
        const head = doc.querySelector('head');
        let customStyles = '';
        if (head) {
            const styleElements = head.querySelectorAll('style');
            styleElements.forEach(style => {
                customStyles += style.textContent;
            });
        }
        
        // Витягуємо основний контент (все що в body, але без навігації)
        const body = doc.querySelector('body');
        
        // Знаходимо content-wrapper або main content
        let mainContent = body.querySelector('.content-wrapper') || 
                         body.querySelector('main') || 
                         body.querySelector('.container-fluid');
        
        if (!mainContent) {
            // Якщо нема спеціального контейнера, берємо все з body крім навігації
            const elementsToRemove = body.querySelectorAll('nav, .navbar, .sidebar, aside, .main-sidebar, .main-header');
            elementsToRemove.forEach(el => el.remove());
            mainContent = body;
        }
        
        // Поєднуємо стилі та контент
        let result = '';
        if (customStyles) {
            result += `<style>${customStyles}</style>`;
        }
        result += mainContent ? mainContent.innerHTML : this.getDefaultModuleContent(moduleId);
        
        return result;
    }
    
    getDefaultModuleContent(moduleId) {
        return `
            <div class="content-header">
                <div class="container-fluid">
                    <div class="row mb-2">
                        <div class="col-sm-6">
                            <h1 class="m-0">Модуль: ${moduleId}</h1>
                        </div>
                        <div class="col-sm-6">
                            <ol class="breadcrumb float-sm-right">
                                <li class="breadcrumb-item"><a href="#" onclick="window.crmSystem.loadDashboard()">Головна</a></li>
                                <li class="breadcrumb-item active">${moduleId}</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
            
            <section class="content">
                <div class="container-fluid">
                    <div class="card">
                        <div class="card-body">
                            <div class="alert alert-warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                <strong>Увага!</strong> Модуль "${moduleId}" ще не реалізований або недоступний для вашої ролі.
                            </div>
                            <p>Поточна роль: <span class="badge badge-info">${this.userRole}</span></p>
                            <p>Доступні права:</p>
                            <ul>
                                ${Object.entries(this.permissions).map(([key, value]) => 
                                    `<li>${key}: <span class="badge ${value ? 'badge-success' : 'badge-danger'}">${value ? 'Так' : 'Ні'}</span></li>`
                                ).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }
    
    setActiveMenuItem(moduleId) {
        // Зняття активного стану з усіх пунктів
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Додавання активного стану до поточного пункту
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(moduleId)) {
                link.classList.add('active');
            }
        });
    }
    
    handleAuthError() {
        // Обробка помилки авторизації
        alert('Помилка авторизації. Перенаправлення на сторінку входу...');
        window.location.href = '/login.html';
    }

    // === ІНТЕРАКТИВНІ МЕТОДИ ===

    setupInteractivity() {
        // logger.log('Налаштування інтерактивності...');
        
        // Налаштування глобальних обробників подій
        this.setupGlobalEventHandlers();
        
        // Налаштування модальних вікон
        this.setupModals();
        
        // Налаштування форм
        this.setupForms();
        
        // Налаштування таблиць з інтерактивністю
        this.setupInteractiveTables();
        
        // logger.log('Інтерактивність налаштовано');
    }

    setupGlobalEventHandlers() {
        // Обробка всіх кнопок з data-action
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (target) {
                e.preventDefault();
                const action = target.dataset.action;
                const data = target.dataset;
                this.handleAction(action, data, target);
            }
        });

        // Обробка форм з data-submit
        document.addEventListener('submit', (e) => {
            const form = e.target.closest('[data-submit]');
            if (form) {
                e.preventDefault();
                const action = form.dataset.submit;
                this.handleFormSubmit(action, form);
            }
        });

        // Обробка змін у select елементах з data-change
        document.addEventListener('change', (e) => {
            const target = e.target.closest('[data-change]');
            if (target) {
                const action = target.dataset.change;
                this.handleChange(action, target.value, target);
            }
        });
    }

    async handleAction(action, data, element) {
        try {
            element.disabled = true; // Запобігаємо множинним кліками
            
            switch (action) {
                case 'add-user':
                    await this.showUserModal();
                    break;
                case 'edit-user':
                    await this.showUserModal(data.id);
                    break;
                case 'delete-user':
                    await this.deleteUser(data.id);
                    break;
                case 'add-lift':
                    await this.showLiftModal();
                    break;
                case 'edit-lift':
                    await this.showLiftModal(data.id);
                    break;
                case 'delete-lift':
                    await this.deleteLift(data.id);
                    break;
                case 'add-task':
                    await this.showTaskModal();
                    break;
                case 'edit-task':
                    await this.showTaskModal(data.id);
                    break;
                case 'complete-task':
                    await this.completeTask(data.id);
                    break;
                case 'generate-qr':
                    await this.generateQRCode(data);
                    break;
                case 'scan-qr':
                    await this.scanQRCode();
                    break;
                case 'export-data':
                    await this.exportData(data.type);
                    break;
                case 'refresh-data':
                    await this.refreshCurrentModule();
                    break;
                case 'toggle-status':
                    await this.toggleStatus(data.type, data.id);
                    break;
                case 'view-details':
                    await this.viewDetails(data.type, data.id);
                    break;
                default:
                    // logger.warn(`Невідома дія: ${action}`);
            }
        } catch (error) {
            // logger.error(`Помилка виконання дії ${action}:`, error);
            this.showErrorMessage(`Помилка: ${error.message}`);
        } finally {
            element.disabled = false;
        }
    }

    setupModals() {
        // Налаштовуємо SweetAlert2 якщо доступний
        if (typeof Swal !== 'undefined') {
            this.swal = Swal.mixin({
                customClass: {
                    confirmButton: 'btn btn-success mr-2',
                    cancelButton: 'btn btn-danger'
                },
                buttonsStyling: false
            });
        } else {
            // logger.warn('SweetAlert2 не доступний, використовуємо стандартні діалоги');
            this.swal = {
                fire: async (options) => {
                    if (options.input) {
                        const result = prompt(options.title + '\n' + (options.text || ''));
                        return { value: result };
                    } else {
                        const confirmed = confirm(options.title + '\n' + (options.text || ''));
                        return { isConfirmed: confirmed };
                    }
                }
            };
        }
    }

    setupForms() {
        // Налаштування валідації форм
        document.querySelectorAll('form[data-validate="true"]').forEach(form => {
            form.addEventListener('submit', (e) => {
                if (!this.validateForm(form)) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                form.classList.add('was-validated');
            });
        });
    }

    validateForm(form) {
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('is-invalid');
                isValid = false;
            } else {
                field.classList.remove('is-invalid');
            }
        });

        return isValid;
    }

    setupInteractiveTables() {
        // Налаштування сортування таблиць
        document.querySelectorAll('table[data-sortable="true"]').forEach(table => {
            const headers = table.querySelectorAll('th[data-sort]');
            headers.forEach(header => {
                header.style.cursor = 'pointer';
                header.addEventListener('click', () => {
                    this.sortTable(table, header.dataset.sort);
                });
            });
        });
    }

    // === МОДАЛЬНІ ВІКНА ===

    async showUserModal(userId = null) {
        if (!this.hasPermission('users.create') && !userId) {
            return this.showErrorMessage('Немає прав для створення користувачів');
        }

        const user = userId ? await this.getUserById(userId) : null;
        const isEdit = !!user;

        const { value: formValues } = await this.swal.fire({
            title: isEdit ? 'Редагувати користувача' : 'Додати користувача',
            html: this.getUserFormHTML(user),
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: isEdit ? 'Зберегти' : 'Створити',
            cancelButtonText: 'Скасувати',
            width: '600px',
            preConfirm: () => {
                return this.getUserFormData();
            }
        });

        if (formValues) {
            try {
                if (isEdit) {
                    await this.updateUser(userId, formValues);
                } else {
                    await this.createUser(formValues);
                }
                await this.refreshCurrentModule();
                this.showSuccessMessage(isEdit ? 'Користувача оновлено' : 'Користувача створено');
            } catch (error) {
                this.showErrorMessage('Помилка збереження: ' + error.message);
            }
        }
    }

    getUserFormHTML(user = null) {
        return `
            <div class="form-group text-left">
                <label for="user-name">Ім'я користувача</label>
                <input type="text" id="user-name" class="form-control" value="${user?.name || ''}" required>
            </div>
            <div class="form-group text-left">
                <label for="user-email">Email</label>
                <input type="email" id="user-email" class="form-control" value="${user?.email || ''}" required>
            </div>
            <div class="form-group text-left">
                <label for="user-role">Роль</label>
                <select id="user-role" class="form-control" required>
                    <option value="">Оберіть роль</option>
                    <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Адміністратор</option>
                    <option value="dispatcher" ${user?.role === 'dispatcher' ? 'selected' : ''}>Диспетчер</option>
                    <option value="tech" ${user?.role === 'tech' ? 'selected' : ''}>Технік</option>
                    <option value="client" ${user?.role === 'client' ? 'selected' : ''}>Клієнт</option>
                </select>
            </div>
            <div class="form-group text-left">
                <label for="user-phone">Телефон</label>
                <input type="tel" id="user-phone" class="form-control" value="${user?.phone || ''}">
            </div>
        `;
    }

    getUserFormData() {
        return {
            name: document.getElementById('user-name').value,
            email: document.getElementById('user-email').value,
            role: document.getElementById('user-role').value,
            phone: document.getElementById('user-phone').value
        };
    }

    async showLiftModal(liftId = null) {
        if (!this.hasPermission('lifts.create') && !liftId) {
            return this.showErrorMessage('Немає прав для створення ліфтів');
        }

        const lift = liftId ? await this.getLiftById(liftId) : null;
        const isEdit = !!lift;

        const { value: formValues } = await this.swal.fire({
            title: isEdit ? 'Редагувати ліфт' : 'Додати ліфт',
            html: this.getLiftFormHTML(lift),
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: isEdit ? 'Зберегти' : 'Створити',
            cancelButtonText: 'Скасувати',
            width: '700px',
            preConfirm: () => {
                return this.getLiftFormData();
            }
        });

        if (formValues) {
            try {
                if (isEdit) {
                    await this.updateLift(liftId, formValues);
                } else {
                    await this.createLift(formValues);
                }
                await this.refreshCurrentModule();
                this.showSuccessMessage(isEdit ? 'Ліфт оновлено' : 'Ліфт створено');
            } catch (error) {
                this.showErrorMessage('Помилка збереження: ' + error.message);
            }
        }
    }

    getLiftFormHTML(lift = null) {
        return `
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group text-left">
                        <label for="lift-building">Будівля</label>
                        <input type="text" id="lift-building" class="form-control" value="${lift?.building || ''}" required>
                    </div>
                    <div class="form-group text-left">
                        <label for="lift-floor">Поверх</label>
                        <input type="number" id="lift-floor" class="form-control" value="${lift?.floor || ''}" required>
                    </div>
                    <div class="form-group text-left">
                        <label for="lift-model">Модель</label>
                        <input type="text" id="lift-model" class="form-control" value="${lift?.model || ''}">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group text-left">
                        <label for="lift-status">Статус</label>
                        <select id="lift-status" class="form-control" required>
                            <option value="active" ${lift?.status === 'active' ? 'selected' : ''}>Активний</option>
                            <option value="maintenance" ${lift?.status === 'maintenance' ? 'selected' : ''}>На обслуговуванні</option>
                            <option value="inactive" ${lift?.status === 'inactive' ? 'selected' : ''}>Неактивний</option>
                        </select>
                    </div>
                    <div class="form-group text-left">
                        <label for="lift-capacity">Вантажопідйомність (кг)</label>
                        <input type="number" id="lift-capacity" class="form-control" value="${lift?.capacity || ''}">
                    </div>
                    <div class="form-group text-left">
                        <label for="lift-location">Локація</label>
                        <textarea id="lift-location" class="form-control" rows="2">${lift?.location || ''}</textarea>
                    </div>
                </div>
            </div>
        `;
    }

    getLiftFormData() {
        return {
            building: document.getElementById('lift-building').value,
            floor: parseInt(document.getElementById('lift-floor').value),
            model: document.getElementById('lift-model').value,
            status: document.getElementById('lift-status').value,
            capacity: parseInt(document.getElementById('lift-capacity').value) || null,
            location: document.getElementById('lift-location').value
        };
    }

    // === CRUD ОПЕРАЦІЇ ===

    async getUserById(id) {
        if (this.dataManager) {
            return this.dataManager.getUser(id);
        }
        // Fallback для тестових даних
        return {
            id,
            name: 'Тестовий користувач',
            email: 'test@example.com',
            role: 'client'
        };
    }

    async createUser(userData) {
        if (this.dataManager) {
            return this.dataManager.addUser(userData);
        }
        // logger.log('Створення користувача:', userData);
    }

    async updateUser(id, userData) {
        if (this.dataManager) {
            return this.dataManager.updateUser(id, userData);
        }
        // logger.log('Оновлення користувача:', id, userData);
    }

    async deleteUser(id) {
        const confirmed = await this.swal.fire({
            title: 'Видалити користувача?',
            text: 'Цю дію неможливо скасувати!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Так, видалити!',
            cancelButtonText: 'Скасувати'
        });

        if (confirmed.isConfirmed) {
            try {
                if (this.dataManager) {
                    await this.dataManager.deleteUser(id);
                }
                await this.refreshCurrentModule();
                this.showSuccessMessage('Користувача видалено');
            } catch (error) {
                this.showErrorMessage('Помилка видалення: ' + error.message);
            }
        }
    }

    async getLiftById(id) {
        if (this.dataManager) {
            return this.dataManager.getLift(id);
        }
        return {
            id,
            building: 'Тестова будівля',
            floor: 1,
            status: 'active'
        };
    }

    async createLift(liftData) {
        if (this.dataManager) {
            return this.dataManager.addLift(liftData);
        }
        // logger.log('Створення ліфта:', liftData);
    }

    async updateLift(id, liftData) {
        if (this.dataManager) {
            return this.dataManager.updateLift(id, liftData);
        }
        // logger.log('Оновлення ліфта:', id, liftData);
    }

    async deleteLift(id) {
        const confirmed = await this.swal.fire({
            title: 'Видалити ліфт?',
            text: 'Цю дію неможливо скасувати!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Так, видалити!',
            cancelButtonText: 'Скасувати'
        });

        if (confirmed.isConfirmed) {
            try {
                if (this.dataManager) {
                    await this.dataManager.deleteLift(id);
                }
                await this.refreshCurrentModule();
                this.showSuccessMessage('Ліфт видалено');
            } catch (error) {
                this.showErrorMessage('Помилка видалення: ' + error.message);
            }
        }
    }

    // === HELPER МЕТОДИ ===

    async refreshCurrentModule() {
        if (this.currentModule) {
            await this.loadModule(this.currentModule);
        }
    }

    showSuccessMessage(message) {
        if (typeof toastr !== 'undefined') {
            toastr.success(message);
        } else if (this.swal) {
            this.swal.fire({
                icon: 'success',
                title: 'Успіх!',
                text: message,
                timer: 3000,
                showConfirmButton: false
            });
        } else {
            alert(message);
        }
    }

    showErrorMessage(message) {
        if (typeof toastr !== 'undefined') {
            toastr.error(message);
        } else if (this.swal) {
            this.swal.fire({
                icon: 'error',
                title: 'Помилка!',
                text: message
            });
        } else {
            alert(message);
        }
    }

    async generateQRCode(data) {
        try {
            const qrData = {
                liftId: data.liftId,
                building: data.building,
                floor: data.floor,
                timestamp: new Date().toISOString()
            };

            if (this.dataManager) {
                const qrCode = await this.dataManager.generateQRCode(qrData);
                this.showSuccessMessage('QR-код згенеровано успішно');
                return qrCode;
            }
        } catch (error) {
            this.showErrorMessage('Помилка генерації QR-кода: ' + error.message);
        }
    }

    async exportData(type) {
        try {
            let data;
            if (this.dataManager) {
                switch (type) {
                    case 'users':
                        data = this.dataManager.getAllUsers();
                        break;
                    case 'lifts':
                        data = this.dataManager.getAllLifts();
                        break;
                    case 'tasks':
                        data = this.dataManager.getAllTasks();
                        break;
                    default:
                        throw new Error(`Невідомий тип для експорту: ${type}`);
                }
            } else {
                data = { message: `Тестові дані для ${type}` };
            }

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}_export_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showSuccessMessage(`Дані ${type} експортовано успішно`);
        } catch (error) {
            this.showErrorMessage('Помилка експорту: ' + error.message);
        }
    }

    async toggleStatus(type, id) {
        try {
            if (this.dataManager) {
                let item;
                switch (type) {
                    case 'lift':
                        item = this.dataManager.getLift(id);
                        if (item) {
                            const newStatus = item.status === 'active' ? 'maintenance' : 'active';
                            await this.dataManager.updateLift(id, { ...item, status: newStatus });
                        }
                        break;
                    case 'user':
                        item = this.dataManager.getUser(id);
                        if (item) {
                            const newStatus = item.active ? false : true;
                            await this.dataManager.updateUser(id, { ...item, active: newStatus });
                        }
                        break;
                    default:
                        throw new Error(`Невідомий тип: ${type}`);
                }
                await this.refreshCurrentModule();
                this.showSuccessMessage('Статус змінено успішно');
            }
        } catch (error) {
            this.showErrorMessage('Помилка зміни статусу: ' + error.message);
        }
    }

    generateLiftsContent() {
        const lifts = this.dataManager ? this.dataManager.getAllLifts() : this.getMockLifts();
        
        return `
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Список ліфтів</h3>
                        </div>
                        <div class="card-body table-responsive p-0">
                            <table class="table table-hover text-nowrap" data-sortable="true">
                                <thead>
                                    <tr>
                                        <th data-sort="id">ID</th>
                                        <th data-sort="building">Будівля</th>
                                        <th data-sort="floor">Поверх</th>
                                        <th data-sort="model">Модель</th>
                                        <th data-sort="status">Статус</th>
                                        <th data-sort="lastMaintenance">Останнє ТО</th>
                                        <th>Дії</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${lifts.map(lift => `
                                        <tr>
                                            <td>${lift.id}</td>
                                            <td>${lift.building}</td>
                                            <td>${lift.floor}</td>
                                            <td>${lift.model || 'Не вказано'}</td>
                                            <td>
                                                <span class="badge badge-${this.getStatusBadgeColor(lift.status)}">
                                                    ${this.getStatusLabel(lift.status)}
                                                </span>
                                            </td>
                                            <td>${this.formatDate(lift.lastMaintenance)}</td>
                                            <td>
                                                <div class="btn-group btn-group-sm">
                                                    <button type="button" class="btn btn-info" data-action="view-details" data-type="lift" data-id="${lift.id}" title="Переглянути">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                    ${this.hasPermission('lifts.edit') ? `
                                                        <button type="button" class="btn btn-warning" data-action="edit-lift" data-id="${lift.id}" title="Редагувати">
                                                            <i class="fas fa-edit"></i>
                                                        </button>
                                                    ` : ''}
                                                    <button type="button" class="btn btn-success" data-action="generate-qr" data-lift-id="${lift.id}" data-building="${lift.building}" data-floor="${lift.floor}" title="Згенерувати QR">
                                                        <i class="fas fa-qrcode"></i>
                                                    </button>
                                                    ${this.hasPermission('lifts.delete') ? `
                                                        <button type="button" class="btn btn-danger" data-action="delete-lift" data-id="${lift.id}" title="Видалити">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    ` : ''}
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // === MOCK DATA ===

    getMockUsers() {
        return [
            {
                id: 1,
                name: 'Іван Петренко',
                email: 'ivan@example.com',
                role: 'admin',
                active: true,
                createdAt: '2024-01-15',
                avatar: null
            },
            {
                id: 2,
                name: 'Марія Коваленко',
                email: 'maria@example.com',
                role: 'dispatcher',
                active: true,
                createdAt: '2024-01-20',
                avatar: null
            },
            {
                id: 3,
                name: 'Олексій Сидоренко',
                email: 'alex@example.com',
                role: 'tech',
                active: true,
                createdAt: '2024-02-01',
                avatar: null
            },
            {
                id: 4,
                name: 'Світлана Іванова',
                email: 'svitlana@example.com',
                role: 'client',
                active: false,
                createdAt: '2024-02-10',
                avatar: null
            }
        ];
    }

    getMockLifts() {
        return [
            {
                id: 1,
                building: 'Житловий комплекс "Оріон"',
                floor: 1,
                model: 'Otis Gen2',
                status: 'active',
                capacity: 630,
                lastMaintenance: '2024-01-15'
            },
            {
                id: 2,
                building: 'Офісний центр "Столичний"',
                floor: 5,
                model: 'Schindler 3300',
                status: 'maintenance',
                capacity: 1000,
                lastMaintenance: '2024-01-10'
            },
            {
                id: 3,
                building: 'ТРЦ "Мегаполіс"',
                floor: 2,
                model: 'Kone MonoSpace',
                status: 'active',
                capacity: 1250,
                lastMaintenance: '2024-02-01'
            }
        ];
    }

    getMockTasks() {
        return [
            {
                id: 1,
                title: 'Планове ТО ліфта №1',
                assignee: 'Олексій Сидоренко',
                priority: 'medium',
                status: 'pending',
                dueDate: '2024-12-28'
            },
            {
                id: 2,
                title: 'Ремонт двигуна ліфта №2',
                assignee: 'Віктор Петров',
                priority: 'high',
                status: 'in-progress',
                dueDate: '2024-12-25'
            },
            {
                id: 3,
                title: 'Заміна кнопок в кабіні',
                assignee: 'Олексій Сидоренко',
                priority: 'low',
                status: 'completed',
                dueDate: '2024-12-20'
            }
        ];
    }

    // === HELPER METHODS ===

    getRoleBadgeColor(role) {
        const colors = {
            admin: 'danger',
            dispatcher: 'warning',
            tech: 'info',
            client: 'secondary'
        };
        return colors[role] || 'secondary';
    }

    getRoleLabel(role) {
        const labels = {
            admin: 'Адміністратор',
            dispatcher: 'Диспетчер',
            tech: 'Технік',
            client: 'Клієнт'
        };
        return labels[role] || role;
    }

    getStatusBadgeColor(status) {
        const colors = {
            active: 'success',
            maintenance: 'warning',
            inactive: 'secondary',
            error: 'danger'
        };
        return colors[status] || 'secondary';
    }

    getStatusLabel(status) {
        const labels = {
            active: 'Активний',
            maintenance: 'На ТО',
            inactive: 'Неактивний',
            error: 'Помилка'
        };
        return labels[status] || status;
    }

    getPriorityBadgeColor(priority) {
        const colors = {
            low: 'secondary',
            medium: 'info',
            high: 'warning',
            urgent: 'danger'
        };
        return colors[priority] || 'secondary';
    }

    getPriorityLabel(priority) {
        const labels = {
            low: 'Низький',
            medium: 'Середній',
            high: 'Високий',
            urgent: 'Терміново'
        };
        return labels[priority] || priority;
    }

    getTaskStatusBadgeColor(status) {
        const colors = {
            pending: 'warning',
            'in-progress': 'info',
            completed: 'success',
            cancelled: 'danger'
        };
        return colors[status] || 'secondary';
    }

    getTaskStatusLabel(status) {
        const labels = {
            pending: 'Очікує',
            'in-progress': 'В роботі',
            completed: 'Завершено',
            cancelled: 'Скасовано'
        };
        return labels[status] || status;
    }

    formatDate(dateString) {
        if (!dateString) return 'Не вказано';
        const date = new Date(dateString);
        return date.toLocaleDateString('uk-UA');
    }
}

// Глобальні функції для доступу з HTML
function showProfile() {
    window.crmSystem.loadModule('profile');
}

function logout() {
    if (confirm('Ви впевнені, що хочете вийти?')) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login.html';
    }
}

// Ініціалізація системи після завантаження сторінки
function initializeCRM() {
    try {
        // logger.log('Початок ініціалізації CRM...');
        window.crmSystem = new CRMUnified();
    } catch (error) {
        // logger.error('Помилка при створенні CRM системи:', error);
    }
}

// Перевіряємо стан DOM та ініціалізуємо
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCRM);
} else {
    // DOM вже готовий
    initializeCRM();
}

// Експорт для використання в інших модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CRMUnified;
}