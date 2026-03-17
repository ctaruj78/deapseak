/**
 * CRM Unified Navigation - Оновлена навігація з новими модулями
 * Інтегрує assignment-manager, monitoring-manager та chat-system
 */

class CRMNavigationManager {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('userData')) || {};
        this.apiUrl = window.location.origin + '/api';
        this.activeModule = null;
        
        this.init();
    }

    init() {
        this.generateNavigation();
        this.loadDashboard();
        this.setupEventListeners();
        this.updateUserInfo();
        
        console.log('🚀 CRM Navigation Manager ініціалізовано');
    }

    /**
     * Генерує навігаційне меню на основі ролі користувача
     */
    generateNavigation() {
        const navigation = document.getElementById('main-navigation');
        if (!navigation) return;

        const role = this.currentUser.role || 'client';
        const menuStructure = this.getMenuForRole(role);
        
        let html = '';
        
        menuStructure.forEach(section => {
            if (section.items && section.items.length > 0) {
                // Розділ з підменю
                html += `
                    <li class="nav-item has-treeview">
                        <a href="#" class="nav-link">
                            <i class="nav-icon ${section.icon}"></i>
                            <p>
                                ${section.title}
                                <i class="fas fa-angle-left right"></i>
                                ${section.badge ? `<span class="badge badge-${section.badge.type} right">${section.badge.text}</span>` : ''}
                            </p>
                        </a>
                        <ul class="nav nav-treeview">
                            ${section.items.map(item => `
                                <li class="nav-item">
                                    <a href="#" class="nav-link" onclick="crmNav.loadModule('${item.module}', '${item.action || ''}')">
                                        <i class="${item.icon} nav-icon"></i>
                                        <p>
                                            ${item.title}
                                            ${item.badge ? `<span class="badge badge-${item.badge.type} right">${item.badge.text}</span>` : ''}
                                        </p>
                                    </a>
                                </li>
                            `).join('')}
                        </ul>
                    </li>
                `;
            } else {
                // Прямий пункт меню
                html += `
                    <li class="nav-item">
                        <a href="#" class="nav-link" onclick="crmNav.loadModule('${section.module}', '${section.action || ''}')">
                            <i class="nav-icon ${section.icon}"></i>
                            <p>
                                ${section.title}
                                ${section.badge ? `<span class="badge badge-${section.badge.type} right">${section.badge.text}</span>` : ''}
                            </p>
                        </a>
                    </li>
                `;
            }
        });

        navigation.innerHTML = html;
    }

    /**
     * Меню для різних ролей
     */
    getMenuForRole(role) {
        const baseMenu = [
            {
                title: 'Головна панель',
                icon: 'fas fa-tachometer-alt',
                module: 'dashboard'
            }
        ];

        const adminMenu = [
            {
                title: 'Управління заявками',
                icon: 'fas fa-tasks',
                items: [
                    {
                        title: 'Всі заявки',
                        icon: 'far fa-circle',
                        module: 'assignment-manager',
                        action: 'list'
                    },
                    {
                        title: 'Нова заявка',
                        icon: 'far fa-circle',
                        module: 'assignment-manager',
                        action: 'create'
                    },
                    {
                        title: 'QR сканер',
                        icon: 'far fa-circle',
                        module: 'assignment-manager',
                        action: 'scan'
                    }
                ]
            },
            {
                title: 'Моніторинг системи',
                icon: 'fas fa-chart-line',
                items: [
                    {
                        title: 'Дашборд',
                        icon: 'far fa-circle',
                        module: 'monitoring-manager',
                        action: 'dashboard'
                    },
                    {
                        title: 'Алерти',
                        icon: 'far fa-circle',
                        module: 'monitoring-manager',
                        action: 'alerts',
                        badge: { type: 'danger', text: 'NEW' }
                    },
                    {
                        title: 'Звіти',
                        icon: 'far fa-circle',
                        module: 'monitoring-manager',
                        action: 'reports'
                    }
                ]
            },
            {
                title: 'Комунікації',
                icon: 'fas fa-comments',
                items: [
                    {
                        title: 'Чат система',
                        icon: 'far fa-circle',
                        module: 'chat-system',
                        action: 'main'
                    },
                    {
                        title: 'Канали',
                        icon: 'far fa-circle',
                        module: 'chat-system',
                        action: 'channels'
                    },
                    {
                        title: 'Контакти',
                        icon: 'far fa-circle',
                        module: 'chat-system',
                        action: 'contacts'
                    }
                ]
            },
            {
                title: 'QR Система',
                icon: 'fas fa-qrcode',
                items: [
                    {
                        title: 'Генератор QR',
                        icon: 'far fa-circle',
                        module: 'qr-system',
                        action: 'generate'
                    },
                    {
                        title: 'Сканер QR',
                        icon: 'far fa-circle',
                        module: 'qr-system',
                        action: 'scan'
                    },
                    {
                        title: 'Управління QR',
                        icon: 'far fa-circle',
                        module: 'qr-system',
                        action: 'manage'
                    }
                ]
            },
            {
                title: 'Користувачі',
                icon: 'fas fa-users',
                module: 'users'
            },
            {
                title: 'Налаштування',
                icon: 'fas fa-cog',
                module: 'settings'
            }
        ];

        const dispatcherMenu = [
            {
                title: 'Заявки',
                icon: 'fas fa-clipboard-list',
                items: [
                    {
                        title: 'Мої заявки',
                        icon: 'far fa-circle',
                        module: 'assignment-manager',
                        action: 'my'
                    },
                    {
                        title: 'Призначити',
                        icon: 'far fa-circle',
                        module: 'assignment-manager',
                        action: 'assign'
                    },
                    {
                        title: 'Контроль',
                        icon: 'far fa-circle',
                        module: 'assignment-manager',
                        action: 'control'
                    }
                ]
            },
            {
                title: 'Моніторинг',
                icon: 'fas fa-desktop',
                module: 'monitoring-manager',
                badge: { type: 'info', text: 'LIVE' }
            },
            {
                title: 'Чат',
                icon: 'fas fa-comment-dots',
                module: 'chat-system'
            },
            {
                title: 'QR Сканер',
                icon: 'fas fa-qrcode',
                module: 'qr-system',
                action: 'scan'
            }
        ];

        const techMenu = [
            {
                title: 'Мої завдання',
                icon: 'fas fa-wrench',
                module: 'assignment-manager',
                action: 'my-tasks'
            },
            {
                title: 'Звіти',
                icon: 'fas fa-file-alt',
                module: 'assignment-manager',
                action: 'reports'
            },
            {
                title: 'Чат з диспетчером',
                icon: 'fas fa-comments',
                module: 'chat-system'
            },
            {
                title: 'QR Сканер',
                icon: 'fas fa-qrcode',
                module: 'qr-system',
                action: 'scan'
            }
        ];

        const clientMenu = [
            {
                title: 'Мої заявки',
                icon: 'fas fa-list',
                module: 'assignment-manager',
                action: 'client'
            },
            {
                title: 'Нова заявка',
                icon: 'fas fa-plus-circle',
                module: 'assignment-manager',
                action: 'create'
            },
            {
                title: 'Чат підтримка',
                icon: 'fas fa-headset',
                module: 'chat-system',
                action: 'support'
            }
        ];

        const roleMenus = {
            'admin': [...baseMenu, ...adminMenu],
            'dispatcher': [...baseMenu, ...dispatcherMenu],
            'tech': [...baseMenu, ...techMenu],
            'client': [...baseMenu, ...clientMenu]
        };

        return roleMenus[role] || roleMenus['client'];
    }

    /**
     * Завантаження модуля
     */
    async loadModule(moduleName, action = '') {
        try {
            console.log(`🔄 Завантаження модуля: ${moduleName} (${action})`);
            
            // Оновлення активного стану меню
            this.setActiveMenuItem(moduleName, action);
            
            // Показати індикатор завантаження
            this.showLoading();
            
            switch (moduleName) {
                case 'dashboard':
                    await this.loadDashboard();
                    break;
                    
                case 'assignment-manager':
                    await this.loadAssignmentManager(action);
                    break;
                    
                case 'monitoring-manager':
                    await this.loadMonitoringManager(action);
                    break;
                    
                case 'chat-system':
                    await this.loadChatSystem(action);
                    break;
                    
                case 'qr-system':
                    await this.loadQRSystem(action);
                    break;
                    
                case 'users':
                    await this.loadUsersModule();
                    break;
                    
                case 'settings':
                    await this.loadSettingsModule();
                    break;
                    
                default:
                    await this.loadNotFound(moduleName);
            }
            
            this.activeModule = moduleName;
            
        } catch (error) {
            console.error('❌ Помилка завантаження модуля:', error);
            this.showError(`Помилка завантаження модуля: ${moduleName}`);
        }
    }

    /**
     * Завантаження дашборду
     */
    async loadDashboard() {
        const content = document.getElementById('main-content');
        
        content.innerHTML = `
            <div class="content-header">
                <div class="container-fluid">
                    <div class="row mb-2">
                        <div class="col-sm-6">
                            <h1 class="m-0">Головна панель</h1>
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
                    <!-- Статистичні картки -->
                    <div class="row">
                        <div class="col-lg-3 col-6">
                            <div class="small-box bg-info">
                                <div class="inner">
                                    <h3 id="stats-assignments">-</h3>
                                    <p>Активні заявки</p>
                                </div>
                                <div class="icon">
                                    <i class="fas fa-tasks"></i>
                                </div>
                                <a href="#" class="small-box-footer" onclick="crmNav.loadModule('assignment-manager')">
                                    Детальніше <i class="fas fa-arrow-circle-right"></i>
                                </a>
                            </div>
                        </div>
                        
                        <div class="col-lg-3 col-6">
                            <div class="small-box bg-success">
                                <div class="inner">
                                    <h3 id="stats-lifts">-</h3>
                                    <p>Ліфтів в роботі</p>
                                </div>
                                <div class="icon">
                                    <i class="fas fa-chart-line"></i>
                                </div>
                                <a href="#" class="small-box-footer" onclick="crmNav.loadModule('monitoring-manager')">
                                    Детальніше <i class="fas fa-arrow-circle-right"></i>
                                </a>
                            </div>
                        </div>
                        
                        <div class="col-lg-3 col-6">
                            <div class="small-box bg-warning">
                                <div class="inner">
                                    <h3 id="stats-messages">-</h3>
                                    <p>Нових повідомлень</p>
                                </div>
                                <div class="icon">
                                    <i class="fas fa-comments"></i>
                                </div>
                                <a href="#" class="small-box-footer" onclick="crmNav.loadModule('chat-system')">
                                    Детальніше <i class="fas fa-arrow-circle-right"></i>
                                </a>
                            </div>
                        </div>
                        
                        <div class="col-lg-3 col-6">
                            <div class="small-box bg-danger">
                                <div class="inner">
                                    <h3 id="stats-alerts">-</h3>
                                    <p>Активних алертів</p>
                                </div>
                                <div class="icon">
                                    <i class="fas fa-exclamation-triangle"></i>
                                </div>
                                <a href="#" class="small-box-footer" onclick="crmNav.loadModule('monitoring-manager', 'alerts')">
                                    Детальніше <i class="fas fa-arrow-circle-right"></i>
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- Швидкі дії -->
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <h3 class="card-title">
                                        <i class="fas fa-bolt"></i> Швидкі дії
                                    </h3>
                                </div>
                                <div class="card-body">
                                    <div class="btn-group-vertical d-block">
                                        <button type="button" class="btn btn-primary btn-block mb-2" onclick="crmNav.loadModule('assignment-manager', 'create')">
                                            <i class="fas fa-plus"></i> Створити заявку
                                        </button>
                                        <button type="button" class="btn btn-info btn-block mb-2" onclick="crmNav.loadModule('qr-system', 'scan')">
                                            <i class="fas fa-qrcode"></i> Сканувати QR
                                        </button>
                                        <button type="button" class="btn btn-success btn-block mb-2" onclick="crmNav.loadModule('chat-system')">
                                            <i class="fas fa-comment"></i> Відкрити чат
                                        </button>
                                        <button type="button" class="btn btn-warning btn-block" onclick="crmNav.loadModule('monitoring-manager')">
                                            <i class="fas fa-chart-bar"></i> Моніторинг
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <h3 class="card-title">
                                        <i class="fas fa-clock"></i> Останні дії
                                    </h3>
                                </div>
                                <div class="card-body">
                                    <div id="recent-activities">
                                        <p class="text-muted">Завантаження останніх дій...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;

        // Завантаження статистики дашборду
        await this.loadDashboardStats();
    }

    /**
     * Завантаження модуля управління заявками
     */
    async loadAssignmentManager(action) {
        const content = document.getElementById('main-content');
        
        content.innerHTML = `
            <div class="content-header">
                <div class="container-fluid">
                    <div class="row mb-2">
                        <div class="col-sm-6">
                            <h1 class="m-0">Управління заявками</h1>
                        </div>
                        <div class="col-sm-6">
                            <ol class="breadcrumb float-sm-right">
                                <li class="breadcrumb-item"><a href="#" onclick="crmNav.loadModule('dashboard')">Головна</a></li>
                                <li class="breadcrumb-item active">Заявки</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <section class="content">
                <div class="container-fluid">
                    <div id="assignment-manager-container">
                        <!-- Контент модуля заявок -->
                    </div>
                </div>
            </section>
        `;

        // Завантажуємо скрипт модуля заявок
        await this.loadScript('/assets/js/modules/assignment-manager.js');
        
        // Ініціалізуємо модуль заявок в контейнері
        if (typeof AssignmentManager !== 'undefined') {
            window.assignmentManager = new AssignmentManager();
            window.assignmentManager.renderInContainer('assignment-manager-container', action);
        }
    }

    /**
     * Завантаження модуля моніторингу
     */
    async loadMonitoringManager(action) {
        const content = document.getElementById('main-content');
        
        content.innerHTML = `
            <div class="content-header">
                <div class="container-fluid">
                    <div class="row mb-2">
                        <div class="col-sm-6">
                            <h1 class="m-0">Моніторинг системи</h1>
                        </div>
                        <div class="col-sm-6">
                            <ol class="breadcrumb float-sm-right">
                                <li class="breadcrumb-item"><a href="#" onclick="crmNav.loadModule('dashboard')">Головна</a></li>
                                <li class="breadcrumb-item active">Моніторинг</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <section class="content">
                <div class="container-fluid">
                    <div id="monitoring-manager-container">
                        <!-- Контент модуля моніторингу -->
                    </div>
                </div>
            </section>
        `;

        // Завантажуємо скрипт модуля моніторингу
        await this.loadScript('/assets/js/modules/monitoring-manager.js');
        
        // Ініціалізуємо модуль моніторингу в контейнері
        if (typeof MonitoringManager !== 'undefined') {
            window.monitoringManager = new MonitoringManager();
            window.monitoringManager.renderInContainer('monitoring-manager-container', action);
        }
    }

    /**
     * Завантаження чат системи
     */
    async loadChatSystem(action) {
        const content = document.getElementById('main-content');
        
        content.innerHTML = `
            <div class="content-header">
                <div class="container-fluid">
                    <div class="row mb-2">
                        <div class="col-sm-6">
                            <h1 class="m-0">Система комунікації</h1>
                        </div>
                        <div class="col-sm-6">
                            <ol class="breadcrumb float-sm-right">
                                <li class="breadcrumb-item"><a href="#" onclick="crmNav.loadModule('dashboard')">Головна</a></li>
                                <li class="breadcrumb-item active">Чат</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <section class="content">
                <div class="container-fluid">
                    <div class="row">
                        <div class="col-md-4">
                            <!-- Список контактів та каналів -->
                            <div class="card">
                                <div class="card-header">
                                    <h3 class="card-title">Контакти та канали</h3>
                                </div>
                                <div class="card-body p-0">
                                    <div class="nav nav-pills flex-column" id="chat-navigation">
                                        <a class="nav-link active" href="#contacts" data-toggle="pill">
                                            <i class="fas fa-users"></i> Контакти
                                        </a>
                                        <a class="nav-link" href="#channels" data-toggle="pill">
                                            <i class="fas fa-hashtag"></i> Канали
                                        </a>
                                    </div>
                                    <div class="tab-content">
                                        <div class="tab-pane fade show active" id="contacts">
                                            <div id="contactsList" class="contacts-list">
                                                <!-- Список контактів -->
                                            </div>
                                        </div>
                                        <div class="tab-pane fade" id="channels">
                                            <div id="channelsList" class="channels-list">
                                                <!-- Список каналів -->
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-8">
                            <!-- Область чату -->
                            <div class="card">
                                <div class="card-header" id="chatHeader">
                                    <h3 class="card-title">Оберіть контакт або канал</h3>
                                </div>
                                <div class="card-body chat-area" style="height: 400px; overflow-y: auto;">
                                    <div id="messagesContainer" class="messages-container">
                                        <!-- Повідомлення -->
                                    </div>
                                </div>
                                <div class="card-footer">
                                    <form id="messageForm" class="input-group">
                                        <input type="text" id="messageInput" class="form-control" placeholder="Введіть повідомлення...">
                                        <div class="input-group-append">
                                            <button type="button" id="attachButton" class="btn btn-outline-secondary">
                                                <i class="fas fa-paperclip"></i>
                                            </button>
                                            <button type="submit" class="btn btn-primary">
                                                <i class="fas fa-paper-plane"></i>
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;

        // Завантажуємо скрипт чат системи
        await this.loadScript('/assets/js/modules/chat-system.js');
        
        // Ініціалізуємо чат систему (вона ініціалізується автоматично)
        if (typeof chatSystem !== 'undefined') {
            console.log('✅ Чат система ініціалізована в CRM');
        }
    }

    /**
     * Завантаження статистики дашборду
     */
    async loadDashboardStats() {
        try {
            const token = localStorage.getItem('authToken');
            
            // Завантаження статистики заявок
            const assignmentsResponse = await fetch(`${this.apiUrl}/assignments/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (assignmentsResponse.ok) {
                const assignmentsStats = await assignmentsResponse.json();
                document.getElementById('stats-assignments').textContent = assignmentsStats.active || 0;
            }
            
            // Завантаження статистики моніторингу
            const monitoringResponse = await fetch(`${this.apiUrl}/monitoring/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (monitoringResponse.ok) {
                const monitoringStats = await monitoringResponse.json();
                document.getElementById('stats-lifts').textContent = monitoringStats.activeLifts || 0;
                document.getElementById('stats-alerts').textContent = monitoringStats.activeAlerts || 0;
            }
            
            // Завантаження статистики чату
            const chatResponse = await fetch(`${this.apiUrl}/chat/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (chatResponse.ok) {
                const chatStats = await chatResponse.json();
                document.getElementById('stats-messages').textContent = chatStats.todayMessages || 0;
            }
            
        } catch (error) {
            console.error('Помилка завантаження статистики:', error);
        }
    }

    // Допоміжні методи
    
    setActiveMenuItem(moduleName, action) {
        // Видалити активні класи
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // TODO: Додати логіку встановлення активного пункту меню
    }

    showLoading() {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="text-center mt-5">
                <i class="fas fa-spinner fa-spin fa-3x text-primary"></i>
                <p class="mt-3">Завантаження...</p>
            </div>
        `;
    }

    showError(message) {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="alert alert-danger m-3">
                <h4><i class="fas fa-exclamation-triangle"></i> Помилка!</h4>
                ${message}
            </div>
        `;
    }

    updateUserInfo() {
        const user = this.currentUser;
        
        // Оновити інформацію користувача в інтерфейсі
        const usernameElement = document.getElementById('current-username');
        const roleElement = document.getElementById('current-role-badge');
        const sidebarUsername = document.getElementById('sidebar-username');
        const sidebarRole = document.getElementById('sidebar-role');
        
        if (usernameElement) {
            usernameElement.textContent = `${user.firstName || 'Користувач'} ${user.lastName || ''}`;
        }
        
        if (roleElement) {
            roleElement.textContent = this.getRoleText(user.role);
            roleElement.className = `role-badge ${user.role}`;
        }
        
        if (sidebarUsername) {
            sidebarUsername.textContent = `${user.firstName || 'Користувач'} ${user.lastName || ''}`;
        }
        
        if (sidebarRole) {
            sidebarRole.textContent = this.getRoleText(user.role);
        }
    }

    getRoleText(role) {
        const roles = {
            'admin': 'Адміністратор',
            'dispatcher': 'Диспетчер',
            'tech': 'Технік',
            'client': 'Клієнт'
        };
        return roles[role] || 'Гість';
    }

    async loadScript(src) {
        return new Promise((resolve, reject) => {
            // Перевірити, чи скрипт вже завантажений
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    setupEventListeners() {
        // Обробники подій для CRM навігації
        document.addEventListener('click', (e) => {
            // Закрити мобільне меню після кліку
            if (e.target.closest('.nav-link')) {
                document.body.classList.remove('sidebar-open');
            }
        });
    }

    // Методи для інших модулів (заглушки)
    async loadQRSystem(action) {
        // TODO: Реалізувати завантаження QR системи
        this.showError('QR система буде реалізована пізніше');
    }

    async loadUsersModule() {
        // TODO: Реалізувати модуль користувачів
        this.showError('Модуль користувачів буде реалізований пізніше');
    }

    async loadSettingsModule() {
        // TODO: Реалізувати модуль налаштувань
        this.showError('Модуль налаштувань буде реалізований пізніше');
    }

    async loadNotFound(moduleName) {
        this.showError(`Модуль "${moduleName}" не знайдено`);
    }
}

// Глобальна ініціалізація
let crmNav;

document.addEventListener('DOMContentLoaded', () => {
    crmNav = new CRMNavigationManager();
    window.crmNav = crmNav; // Глобальний доступ
});

// Експорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CRMNavigationManager;
}