class Renderer {
    static renderDashboard(user) {
        let content = '';
        
        switch (user.role) {
            case 'admin':
                content = this.renderAdminDashboard();
                break;
            case 'technician':
                content = this.renderTechnicianDashboard();
                break;
            case 'client':
                content = this.renderClientDashboard();
                break;
            case 'dispatcher':
                content = this.renderDispatcherDashboard();
                break;
            default:
                content = '<div class="error">Невідома роль користувача</div>';
        }
        
        document.getElementById('main-content').innerHTML = content;
        this.updateDynamicContent(user.role);
    }

    static renderAdminDashboard() {
        return `
            <section class="dashboard-section">
                <h2>Панель адміністратора</h2>
                
                <div class="admin-controls">
                    <button class="btn primary" onclick="Router.navigate('/users')">
                        <i class="fas fa-users"></i> Керування користувачами
                    </button>
                    <button class="btn primary" onclick="Router.navigate('/lifts')">
                        <i class="fas fa-elevator"></i> Всі ліфти
                    </button>
                    <button class="btn primary" onclick="Router.navigate('/reports')">
                        <i class="fas fa-chart-bar"></i> Звіти
                    </button>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <h3><i class="fas fa-elevator"></i> Всього ліфтів</h3>
                        <p id="total-lifts">0</p>
                        <span class="stat-trend" id="lifts-trend"></span>
                    </div>
                    <div class="stat-card">
                        <h3><i class="fas fa-tools"></i> На ремонті</h3>
                        <p id="repairing-lifts">0</p>
                        <span class="stat-trend" id="repairs-trend"></span>
                    </div>
                    <div class="stat-card">
                        <h3><i class="fas fa-ticket-alt"></i> Активних заявок</h3>
                        <p id="active-requests">0</p>
                        <span class="stat-trend" id="requests-trend"></span>
                    </div>
                    <div class="stat-card">
                        <h3><i class="fas fa-users"></i> Користувачів</h3>
                        <p id="total-users">0</p>
                        <span class="stat-trend" id="users-trend"></span>
                    </div>
                </div>
                
                <div class="admin-grid">
                    <div class="chart-container">
                        <h3>Статуси ліфтів</h3>
                        <canvas id="lifts-status-chart" width="400" height="250"></canvas>
                    </div>
                    
                    <div class="recent-activity">
                        <h3>Остання активність</h3>
                        <div id="recent-activities" class="activities-list"></div>
                    </div>
                </div>

                <div class="quick-actions">
                    <h3>Швидкі дії</h3>
                    <div class="actions-grid">
                        <button class="btn secondary" onclick="AdminManager.addNewUser()">
                            <i class="fas fa-user-plus"></i> Додати користувача
                        </button>
                        <button class="btn secondary" onclick="AdminManager.generateReport()">
                            <i class="fas fa-file-export"></i> Експорт звіту
                        </button>
                        <button class="btn secondary" onclick="AdminManager.systemSettings()">
                            <i class="fas fa-cog"></i> Налаштування
                        </button>
                    </div>
                </div>
            </section>
        `;
    }

    static renderTechnicianDashboard() {
        return `
            <section class="dashboard-section">
                <h2>Моя робоча панель</h2>
                
                <div class="technician-header">
                    <div class="tech-stats">
                        <div class="tech-stat">
                            <span class="stat-label">Активні завдання:</span>
                            <span class="stat-value" id="active-tasks">0</span>
                        </div>
                        <div class="tech-stat">
                            <span class="stat-label">Завершені сьогодні:</span>
                            <span class="stat-value" id="completed-today">0</span>
                        </div>
                    </div>
                    
                    <button class="btn primary" onclick="TechnicianManager.startNewTask()">
                        <i class="fas fa-plus"></i> Почати нове завдання
                    </button>
                </div>

                <div class="tasks-container">
                    <div class="tasks-section">
                        <h3>Поточні завдання <span class="badge" id="current-tasks-count">0</span></h3>
                        <div id="current-tasks-list" class="tasks-list"></div>
                    </div>
                    
                    <div class="tasks-section">
                        <h3>Майбутні завдання <span class="badge" id="upcoming-tasks-count">0</span></h3>
                        <div id="upcoming-tasks-list" class="tasks-list"></div>
                    </div>
                </div>

                <div class="tech-tools">
                    <h3>Інструменти</h3>
                    <div class="tools-grid">
                        <button class="btn secondary" onclick="TechnicianManager.viewSchedule()">
                            <i class="fas fa-calendar"></i> Графік роботи
                        </button>
                        <button class="btn secondary" onclick="TechnicianManager.viewInventory()">
                            <i class="fas fa-boxes"></i> Інвентар
                        </button>
                        <button class="btn secondary" onclick="TechnicianManager.timeTracking()">
                            <i class="fas fa-stopwatch"></i> Облік часу
                        </button>
                    </div>
                </div>

                <div class="performance-stats">
                    <h3>Моя продуктивність</h3>
                    <div class="performance-grid">
                        <div class="performance-card">
                            <div class="performance-metric">
                                <span class="metric-value" id="completion-rate">0%</span>
                                <span class="metric-label">Завершення завдань</span>
                            </div>
                        </div>
                        <div class="performance-card">
                            <div class="performance-metric">
                                <span class="metric-value" id="avg-time">0хв</span>
                                <span class="metric-label">Середній час</span>
                            </div>
                        </div>
                        <div class="performance-card">
                            <div class="performance-metric">
                                <span class="metric-value" id="rating">0.0</span>
                                <span class="metric-label">Рейтинг</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    static renderClientDashboard() {
        return `
            <section class="dashboard-section">
                <h2>Мої ліфти</h2>
                
                <div class="client-header">
                    <div class="client-info">
                        <h3 id="client-name">Завантаження...</h3>
                        <p class="client-contact" id="client-contact"></p>
                    </div>
                    
                    <button id="new-request-btn" class="btn primary">
                        <i class="fas fa-plus"></i> Нова заявка
                    </button>
                </div>

                <div class="client-stats">
                    <div class="client-stat">
                        <span class="stat-label">Всього ліфтів:</span>
                        <span class="stat-value" id="client-total-lifts">0</span>
                    </div>
                    <div class="client-stat">
                        <span class="stat-label">На обслуговуванні:</span>
                        <span class="stat-value" id="client-active-lifts">0</span>
                    </div>
                    <div class="client-stat">
                        <span class="stat-label">Активних заявок:</span>
                        <span class="stat-value" id="client-active-requests">0</span>
                    </div>
                </div>

                <div class="lifts-container">
                    <h3>Мої ліфти <span class="badge" id="client-lifts-count">0</span></h3>
                    <div id="client-lifts-list" class="lifts-grid"></div>
                </div>

                <div class="requests-container">
                    <h3>Останні заявки <span class="badge" id="client-requests-count">0</span></h3>
                    <div id="client-requests-list" class="requests-list"></div>
                </div>

                <div class="client-actions">
                    <h3>Швидкі дії</h3>
                    <div class="actions-grid">
                        <button class="btn secondary" onclick="ClientManager.viewAllRequests()">
                            <i class="fas fa-list"></i> Всі мої заявки
                        </button>
                        <button class="btn secondary" onclick="ClientManager.contactSupport()">
                            <i class="fas fa-headset"></i> Зв'язатися з підтримкою
                        </button>
                        <button class="btn secondary" onclick="ClientManager.downloadDocs()">
                            <i class="fas fa-download"></i> Документація
                        </button>
                    </div>
                </div>
            </section>
        `;
    }

    static renderDispatcherDashboard() {
        return `
            <section class="dashboard-section">
                <h2>Панель диспетчера</h2>
                
                <div class="dispatcher-controls">
                    <div class="control-group">
                        <button class="btn primary" onclick="DispatcherManager.viewAllRequests()">
                            <i class="fas fa-tasks"></i> Всі заявки
                        </button>
                        <button class="btn primary" onclick="DispatcherManager.createEmergency()">
                            <i class="fas fa-exclamation-triangle"></i> Екстрена заявка
                        </button>
                    </div>
                    
                    <div class="filters">
                        <select id="status-filter" onchange="DispatcherManager.filterRequests()">
                            <option value="all">Всі статуси</option>
                            <option value="pending">Очікують</option>
                            <option value="in-progress">В роботі</option>
                            <option value="completed">Завершені</option>
                        </select>
                        
                        <select id="priority-filter" onchange="DispatcherManager.filterRequests()">
                            <option value="all">Всі пріоритети</option>
                            <option value="high">Високий</option>
                            <option value="medium">Середній</option>
                            <option value="low">Низький</option>
                        </select>
                    </div>
                </div>

                <div class="dispatcher-stats">
                    <div class="stat-card urgent">
                        <h3><i class="fas fa-exclamation-circle"></i> Термінові</h3>
                        <p id="urgent-requests">0</p>
                    </div>
                    <div class="stat-card">
                        <h3><i class="fas fa-clock"></i> Очікують призначення</h3>
                        <p id="pending-requests">0</p>
                    </div>
                    <div class="stat-card">
                        <h3><i class="fas fa-user-check"></i> Техніків онлайн</h3>
                        <p id="online-technicians">0</p>
                    </div>
                </div>

                <div class="dispatcher-grid">
                    <div class="requests-panel">
                        <h3>Активні заявки <span class="badge" id="active-requests-count">0</span></h3>
                        <div id="requests-list" class="dispatcher-requests-list"></div>
                    </div>
                    
                    <div class="technicians-panel">
                        <h3>Доступні техніки <span class="badge" id="available-techs-count">0</span></h3>
                        <div id="technicians-list" class="technicians-list"></div>
                    </div>
                </div>

                <div class="map-container">
                    <h3>Карта заявок</h3>
                    <div id="requests-map" class="map-placeholder">
                        <i class="fas fa-map-marked-alt"></i>
                        <p>Карта активних заявок</p>
                    </div>
                </div>

                <div class="dispatcher-tools">
                    <h3>Інструменти диспетчера</h3>
                    <div class="tools-grid">
                        <button class="btn secondary" onclick="DispatcherManager.manageSchedule()">
                            <i class="fas fa-calendar-alt"></i> Графіки роботи
                        </button>
                        <button class="btn secondary" onclick="DispatcherManager.sendBroadcast()">
                            <i class="fas fa-bullhorn"></i> Розсилка
                        </button>
                        <button class="btn secondary" onclick="DispatcherManager.generateDispatchReport()">
                            <i class="fas fa-file-alt"></i> Звіт диспетчера
                        </button>
                    </div>
                </div>
            </section>
        `;
    }

    static async updateDynamicContent(role) {
        try {
            switch (role) {
                case 'admin':
                    await this.updateAdminContent();
                    break;
                case 'technician':
                    await this.updateTechnicianContent();
                    break;
                case 'client':
                    await this.updateClientContent();
                    break;
                case 'dispatcher':
                    await this.updateDispatcherContent();
                    break;
            }
        } catch (error) {
            console.error('Помилка оновлення контенту:', error);
            this.showError('Не вдалося завантажити дані');
        }
    }

    static async updateAdminContent() {
        const [lifts, requests, users, activities] = await Promise.all([
            LiftAPI.getLifts(),
            LiftAPI.getRepairs(),
            LiftAPI.getUsers(),
            LiftAPI.getActivities()
        ]);

        // Оновлення статистики
        document.getElementById('total-lifts').textContent = lifts.length;
        document.getElementById('repairing-lifts').textContent = 
            lifts.filter(lift => lift.status === 'repairing').length;
        document.getElementById('active-requests').textContent = 
            requests.filter(req => req.status !== 'completed').length;
        document.getElementById('total-users').textContent = users.length;

        // Оновлення активності
        this.renderActivities(activities.slice(0, 10));
        
        // Оновлення графіків
        this.renderLiftsStatusChart(lifts);
    }

    static async updateTechnicianContent() {
        const [tasks, performance] = await Promise.all([
            TechnicianManager.getMyTasks(),
            TechnicianManager.getPerformanceStats()
        ]);

        const currentTasks = tasks.filter(task => 
            task.status === 'in-progress' || task.status === 'assigned'
        );
        const upcomingTasks = tasks.filter(task => task.status === 'scheduled');

        document.getElementById('active-tasks').textContent = currentTasks.length;
        document.getElementById('current-tasks-count').textContent = currentTasks.length;
        document.getElementById('upcoming-tasks-count').textContent = upcomingTasks.length;

        this.renderTasksList('current-tasks-list', currentTasks);
        this.renderTasksList('upcoming-tasks-list', upcomingTasks);

        // Оновлення статистики продуктивності
        if (performance) {
            document.getElementById('completion-rate').textContent = 
                `${performance.completionRate}%`;
            document.getElementById('avg-time').textContent = 
                `${performance.averageTime}хв`;
            document.getElementById('rating').textContent = 
                performance.rating.toFixed(1);
        }
    }

    static async updateClientContent() {
        const [lifts, requests, clientInfo] = await Promise.all([
            ClientManager.getMyLifts(),
            ClientManager.getMyRequests(),
            ClientManager.getClientInfo()
        ]);

        document.getElementById('client-name').textContent = clientInfo.name;
        document.getElementById('client-contact').textContent = clientInfo.contact;
        document.getElementById('client-total-lifts').textContent = lifts.length;
        document.getElementById('client-active-lifts').textContent = 
            lifts.filter(lift => lift.status === 'active').length;
        document.getElementById('client-active-requests').textContent = 
            requests.filter(req => req.status !== 'completed').length;
        document.getElementById('client-lifts-count').textContent = lifts.length;
        document.getElementById('client-requests-count').textContent = requests.length;

        this.renderClientLifts(lifts);
        this.renderClientRequests(requests.slice(0, 5));
    }

    static async updateDispatcherContent() {
        const [requests, technicians] = await Promise.all([
            DispatcherManager.getAllRequests(),
            DispatcherManager.getAvailableTechnicians()
        ]);

        const urgentRequests = requests.filter(req => 
            req.priority === 'high' && req.status !== 'completed'
        );
        const pendingRequests = requests.filter(req => 
            req.status === 'pending'
        );
        const onlineTechnicians = technicians.filter(tech => 
            tech.status === 'available'
        );

        document.getElementById('urgent-requests').textContent = urgentRequests.length;
        document.getElementById('pending-requests').textContent = pendingRequests.length;
        document.getElementById('online-technicians').textContent = onlineTechnicians.length;
        document.getElementById('active-requests-count').textContent = 
            requests.filter(req => req.status !== 'completed').length;
        document.getElementById('available-techs-count').textContent = onlineTechnicians.length;

        this.renderDispatcherRequests(requests);
        this.renderTechniciansList(technicians);
    }

    static renderTasksList(containerId, tasks) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (tasks.length === 0) {
            container.innerHTML = '<div class="empty-state">Немає завдань</div>';
            return;
        }

        container.innerHTML = tasks.map(task => `
            <div class="task-item" data-task-id="${task.id}">
                <div class="task-header">
                    <span class="task-priority priority-${task.priority}">
                        ${this.getPriorityLabel(task.priority)}
                    </span>
                    <span class="task-id">#${task.id}</span>
                </div>
                <div class="task-content">
                    <h4>${task.title}</h4>
                    <p>${task.description}</p>
                    <div class="task-meta">
                        <span class="task-location">
                            <i class="fas fa-map-marker-alt"></i> ${task.location}
                        </span>
                        <span class="task-deadline">
                            <i class="fas fa-clock"></i> ${this.formatDate(task.deadline)}
                        </span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn small" onclick="TechnicianManager.viewTask(${task.id})">
                        Деталі
                    </button>
                    ${task.status === 'assigned' ? `
                    <button class="btn small primary" onclick="TechnicianManager.startTask(${task.id})">
                        Почати
                    </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    static renderClientLifts(lifts) {
        const container = document.getElementById('client-lifts-list');
        if (!container) return;

        if (lifts.length === 0) {
            container.innerHTML = '<div class="empty-state">Немає ліфтів</div>';
            return;
        }

        container.innerHTML = lifts.map(lift => `
            <div class="lift-card" data-lift-id="${lift.id}">
                <div class="lift-header">
                    <h4>${lift.name}</h4>
                    <span class="lift-status status-${lift.status}">
                        ${this.getStatusLabel(lift.status)}
                    </span>
                </div>
                <div class="lift-info">
                    <p><i class="fas fa-map-marker-alt"></i> ${lift.location}</p>
                    <p><i class="fas fa-calendar"></i> Останнє ТО: ${this.formatDate(lift.lastMaintenance)}</p>
                </div>
                <div class="lift-actions">
                    <button class="btn small" onclick="ClientManager.viewLift(${lift.id})">
                        Деталі
                    </button>
                    <button class="btn small primary" onclick="ClientManager.createRequest(${lift.id})">
                        Заявка
                    </button>
                </div>
            </div>
        `).join('');
    }

    static renderDispatcherRequests(requests) {
        const container = document.getElementById('requests-list');
        if (!container) return;

        const activeRequests = requests.filter(req => req.status !== 'completed');

        if (activeRequests.length === 0) {
            container.innerHTML = '<div class="empty-state">Немає активних заявок</div>';
            return;
        }

        container.innerHTML = activeRequests.map(request => `
            <div class="request-item" data-request-id="${request.id}">
                <div class="request-header">
                    <span class="request-priority priority-${request.priority}">
                        ${this.getPriorityLabel(request.priority)}
                    </span>
                    <span class="request-id">#${request.id}</span>
                </div>
                <div class="request-content">
                    <h4>${request.title}</h4>
                    <p>${request.description}</p>
                    <div class="request-meta">
                        <span class="request-location">
                            <i class="fas fa-map-marker-alt"></i> ${request.location}
                        </span>
                        <span class="request-client">
                            <i class="fas fa-building"></i> ${request.clientName}
                        </span>
                    </div>
                </div>
                <div class="request-status">
                    <span class="status-badge status-${request.status}">
                        ${this.getStatusLabel(request.status)}
                    </span>
                </div>
                <div class="request-actions">
                    <button class="btn small" onclick="DispatcherManager.viewRequest(${request.id})">
                        Деталі
                    </button>
                    ${request.status === 'pending' ? `
                    <button class="btn small primary" onclick="DispatcherManager.assignRequest(${request.id})">
                        Призначити
                    </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    // Допоміжні методи
    static getPriorityLabel(priority) {
        const labels = {
            'high': 'Високий',
            'medium': 'Середній',
            'low': 'Низький'
        };
        return labels[priority] || priority;
    }

    static getStatusLabel(status) {
        const labels = {
            'active': 'Активний',
            'inactive': 'Неактивний',
            'repairing': 'На ремонті',
            'pending': 'Очікує',
            'in-progress': 'В роботі',
            'completed': 'Завершено',
            'assigned': 'Призначено',
            'scheduled': 'Заплановано'
        };
        return labels[status] || status;
    }

    static formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('uk-UA');
    }

    static showError(message) {
        // Реалізація відображення помилок
        console.error(message);
    }
}

// Додаємо глобальний доступ
if (typeof window !== 'undefined') {
    window.Renderer = Renderer;
}