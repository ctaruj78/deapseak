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
        
        // Ініціалізація після завантаження DOM
        this.init();
    }
    
    async init() {
        console.log('Ініціалізація CRM системи...');
        
        // Завантаження даних користувача
        await this.loadUserData();
        
        // Налаштування рольового доступу
        this.setupRoleAccess();
        
        // Генерація навігації
        this.renderNavigation();
        
        // Завантаження дашборду
        this.loadDashboard();
        
        console.log(`CRM ініціалізовано для ролі: ${this.userRole}`);
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
        
        // Оновлення елементів інтерфейсу
        document.getElementById('current-username').textContent = this.currentUser.name;
        document.getElementById('sidebar-username').textContent = this.currentUser.name;
        document.getElementById('sidebar-role').textContent = roleLabels[this.userRole];
        document.getElementById('current-role-badge').textContent = roleLabels[this.userRole];
        document.getElementById('current-role-badge').className = `role-badge ${this.userRole}`;
        document.getElementById('user-avatar').src = this.currentUser.avatar;
        document.getElementById('user-info').textContent = `${this.currentUser.name} (${roleLabels[this.userRole]})`;
    }
    
    setupRoleAccess() {
        // Конфігурація модулів для кожної ролі
        const modulesByRole = {
            admin: [
                'dashboard',
                'qr-full',      // Повне управління QR
                'qr-management', // Управління QR (додано для сумісності)
                'lifts',
                'users',
                'analytics-full', // Повна аналітика
                'reports',
                'settings',
                'support'
            ],
            dispatcher: [
                'dashboard',
                'qr-management', // Управління QR (перейменовано з qr-basic)
                'assignments',
                'technicians',
                'clients',
                'analytics-basic', // Базова аналітика
                'reports',
                'monitoring'
            ],
            tech: [
                'dashboard',
                'qr-scanner',   // Тільки сканер
                'tasks',
                'schedule',
                'checklists',
                'knowledge-base',
                'tools'
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
        // Перевірка доступу на основі ролі користувача
        
        // Пряма перевірка доступу
        if (this.availableModules.includes(moduleId)) {
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
            'lift-management': ['lifts'],
            'analytics': ['analytics-full', 'analytics-basic']
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
        // Показуємо лоадер під час завантаження
        const loadingHtml = `
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
            // Визначаємо шлях до файлу залежно від модуля та ролі
            const modulePath = this.getModulePath(moduleId);
            
            if (modulePath) {
                const response = await fetch(modulePath);
                if (response.ok) {
                    const htmlContent = await response.text();
                    return this.extractContentFromHtml(htmlContent);
                }
            }
        } catch (error) {
            console.error(`Помилка завантаження модуля ${moduleId}:`, error);
        }
        
        // Якщо не вдалося завантажити - показуємо заглушку
        return this.getDefaultModuleContent(moduleId);
    }
    
    getModulePath(moduleId) {
        // Визначаємо шлях до файлу залежно від модуля та ролі користувача
        const modulePaths = {
            // QR модулі - використовуємо нові модулі
            'qr-generator': 'assets/modules/qr-generator.html',
            'qr-scanner': 'assets/modules/qr-scanner.html',
            'qr-management': 'assets/modules/qr-generator.html',  // Для всіх ролей використовуємо генератор
            'qr-history': 'pages/admin/qr-history.html',
            'qr-analytics': 'pages/admin/qr-analytics.html',
            'qr-batch': 'pages/admin/qr-batch.html',
            
            // Нові функціональні модулі
            'lift-management': 'assets/modules/lift-management.html',
            'tasks': 'assets/modules/tasks.html',
            'analytics': 'assets/modules/analytics.html',    // Новий модуль аналітики
            'analytics-full': 'assets/modules/analytics.html', // Повна аналітика для адміна
            'analytics-basic': 'assets/modules/analytics.html', // Базова аналітика для диспетчера
            
            // Інші модулі
            'lifts': 'assets/modules/lift-management.html',  // Перенаправляємо на новий модуль
            'users': 'pages/admin/users.html',
            'reports': this.userRole === 'admin' ? 'pages/admin/reports.html' : 
                      this.userRole === 'dispatcher' ? 'pages/dispatcher/reports.html' : 'pages/tech/reports.html',
            'settings': 'pages/admin/settings.html',
            
            // Модулі диспетчера
            'assignments': 'pages/dispatcher/assignments.html',
            'technicians': 'pages/dispatcher/technicians.html',
            'clients': 'pages/dispatcher/clients.html',
            'monitoring': 'pages/dispatcher/monitoring.html',
            
            // Модулі техніка
            'tasks': 'assets/modules/tasks.html',
            'schedule': 'pages/tech/schedule.html',
            'checklists': 'pages/tech/checklists.html',
            'knowledge-base': 'pages/tech/knowledge-base.html',
            'tools': 'pages/tech/tools.html'
        };
        
        return modulePaths[moduleId];
    }
    
    extractContentFromHtml(htmlContent) {
        // Створюємо тимчасовий DOM парсер
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
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
        
        return mainContent ? mainContent.innerHTML : this.getDefaultModuleContent(moduleId);
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
document.addEventListener('DOMContentLoaded', function() {
    window.crmSystem = new CRMUnified();
});

// Експорт для використання в інших модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CRMUnified;
}