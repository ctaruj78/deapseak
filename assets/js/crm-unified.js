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
        
        console.log('CRMUnified constructor викликано');
        
        // Ініціалізація після завантаження DOM
        this.init();
    }
    
    async init() {
        try {
            console.log('Ініціалізація CRM системи...');
            
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
            
            // Завантаження даних користувача
            await this.loadUserData();
            
            // Налаштування рольового доступу
            this.setupRoleAccess();
            
            // Генерація навігації
            this.renderNavigation();
            
            // Завантаження дашборду
            this.loadDashboard();
            
            console.log(`CRM ініціалізовано для ролі: ${this.userRole}`);
        } catch (error) {
            console.error('Критична помилка ініціалізації CRM:', error);
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
            console.error('Помилка завантаження даних користувача:', error);
            this.handleAuthError();
        }
    }
    
    handleAuthError() {
        console.warn('Помилка автентифікації, перенаправлення на логін');
        window.location.href = '/login.html';
    }
    
    handleCriticalError(error) {
        console.error('Критична помилка CRM системи:', error);
        
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
                console.warn(`Елемент з ID "${id}" не знайдено`);
            }
        });
    }
    
    setupRoleAccess() {
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
        console.log(`Завантаження модуля: ${moduleId}`);
        
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
        
        try {
            // Асинхронне завантаження модуля
            const content = await this.getModuleContent(moduleId);
            document.getElementById('main-content').innerHTML = content;
            
            // Ініціалізація модуля після завантаження
            this.initModuleAfterLoad(moduleId);
            
        } catch (error) {
            console.error(`Помилка завантаження модуля ${moduleId}:`, error);
            document.getElementById('main-content').innerHTML = this.getDefaultModuleContent(moduleId);
        }
        
        // Активація пункту меню
        this.setActiveMenuItem(moduleId);
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
        console.log('Ініціалізація генератора QR кодів');
        // Тут може бути додаткова логіка
    }
    
    initQRScanner() {
        console.log('Ініціалізація QR сканера');
        // Тут може бути додаткова логіка
    }
    
    initQRAnalytics() {
        console.log('Ініціалізація аналітики QR');
        // Тут може бути додаткова логіка
    }
    
    initTasks() {
        console.log('Ініціалізація модуля завдань');
        // Тут може бути додаткова логіка
    }
    
    hasAccessToModule(moduleId) {
        console.log(`Перевірка доступу до модуля: ${moduleId}`);
        console.log(`Доступні модулі для ролі ${this.userRole}:`, this.availableModules);
        
        // Пряма перевірка доступу
        if (this.availableModules.includes(moduleId)) {
            console.log(`Модуль ${moduleId} знайдено в availableModules`);
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
        console.log(`Завантаження модуля: ${moduleId}`);
        
        try {
            // Визначаємо шлях до файлу залежно від модуля та ролі
            const modulePath = this.getModulePath(moduleId);
            console.log(`Шлях до модуля ${moduleId}: ${modulePath}`);
            
            if (modulePath) {
                const response = await fetch(modulePath);
                console.log(`Відповідь сервера для ${moduleId}: ${response.status}`);
                
                if (response.ok) {
                    const htmlContent = await response.text();
                    console.log(`Модуль ${moduleId} успішно завантажено`);
                    return this.extractContentFromHtml(htmlContent);
                } else {
                    console.error(`Помилка HTTP ${response.status} для модуля ${moduleId}`);
                }
            } else {
                console.error(`Шлях для модуля ${moduleId} не знайдено`);
            }
        } catch (error) {
            console.error(`Помилка завантаження модуля ${moduleId}:`, error);
        }
        
        // Якщо не вдалося завантажити - показуємо заглушку
        console.log(`Показуємо заглушку для модуля ${moduleId}`);
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
        console.log('Початок ініціалізації CRM...');
        window.crmSystem = new CRMUnified();
    } catch (error) {
        console.error('Помилка при створенні CRM системи:', error);
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