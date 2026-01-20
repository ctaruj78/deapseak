/**
 * 📊 Dispatcher Dashboard - Real Data Integration
 * 
 * Повна інтеграція диспетчерської панелі з реальними даними з MongoDB через API
 * 
 * API Endpoints:
 * - GET /api/requests - всі заявки
 * - GET /api/requests/stats - статистика заявок
 * - GET /api/users?role=technician - список техніків
 * - GET /api/lifts - ліфти
 * - POST /api/requests/:id/assign - призначення техніка
 * - PUT /api/requests/:id - оновлення заявки
 * 
 * Роль-Based Data Access:
 * - Dispatcher бачить ВСІ заявки
 * - Техніки фільтруються по статусу (available, busy)
 * - Клієнти пов'язані з ліфтами через client field
 */

class DispatcherDashboardReal {
    constructor() {
        console.log('🚀 DispatcherDashboardReal: Ініціалізація з реальними даними...');
        
        this.API_BASE = window.location.origin;
        this.token = localStorage.getItem('token');
        
        if (!this.token) {
            console.error('❌ Token не знайдено! Перенаправлення на логін...');
            window.location.href = '/pages/auth/login.html';
            return;
        }
        
        // Дані кешовані в пам'яті
        this.requests = [];
        this.technicians = [];
        this.lifts = [];
        this.clients = [];
        this.statistics = {};
        
        // WebSocket для real-time оновлень
        this.ws = null;
        
        // Обрані заявки для масових операцій
        this.selectedRequests = new Set();
        
        this.init();
    }
    
    /**
     * 🎯 Ініціалізація панелі
     */
    async init() {
        try {
            console.log('📡 Завантаження даних з API...');
            
            // Паралельне завантаження всіх даних
            await Promise.all([
                this.loadRequests(),
                this.loadTechnicians(),
                this.loadLifts(),
                this.loadStatistics()
            ]);
            
            console.log('✅ Всі дані завантажено:', {
                requests: this.requests.length,
                technicians: this.technicians.length,
                lifts: this.lifts.length
            });
            
            // Рендеринг UI
            this.renderRequests();
            this.renderTechnicians();
            this.updateStats();
            this.renderActivities();
            
            // Налаштування
            this.setupEventListeners();
            this.setupFilters();
            this.setupWebSocket();
            
            console.log('✅ DispatcherDashboardReal готова до роботи!');
        } catch (error) {
            console.error('❌ Помилка ініціалізації:', error);
            this.showNotification('Помилка завантаження даних', 'error');
        }
    }
    
    /**
     * 📋 Завантаження заявок з API
     */
    async loadRequests() {
        try {
            const response = await fetch(`${this.API_BASE}/api/requests`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.data) {
                this.requests = data.data.map(req => this.normalizeRequest(req));
                console.log('✅ Завантажено заявок:', this.requests.length);
            } else {
                console.warn('⚠️ API повернув порожній масив заявок');
                this.requests = [];
            }
        } catch (error) {
            console.error('❌ Помилка завантаження заявок:', error);
            this.requests = [];
            throw error;
        }
    }
    
    /**
     * 🔧 Завантаження техніків з API
     */
    async loadTechnicians() {
        try {
            const response = await fetch(`${this.API_BASE}/api/users?role=technician`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.data) {
                this.technicians = data.data.map(tech => this.normalizeTechnician(tech));
                console.log('✅ Завантажено техніків:', this.technicians.length);
            } else {
                console.warn('⚠️ Техніків не знайдено');
                this.technicians = [];
            }
        } catch (error) {
            console.error('❌ Помилка завантаження техніків:', error);
            this.technicians = [];
        }
    }
    
    /**
     * 🏢 Завантаження ліфтів з API
     */
    async loadLifts() {
        try {
            const response = await fetch(`${this.API_BASE}/api/lifts`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.data) {
                this.lifts = data.data;
                
                // Витягуємо унікальних клієнтів з ліфтів
                const clientIds = new Set();
                this.lifts.forEach(lift => {
                    if (lift.client) clientIds.add(lift.client);
                });
                
                console.log('✅ Завантажено ліфтів:', this.lifts.length);
                console.log('📊 Унікальних клієнтів:', clientIds.size);
            } else {
                this.lifts = [];
            }
        } catch (error) {
            console.error('❌ Помилка завантаження ліфтів:', error);
            this.lifts = [];
        }
    }
    
    /**
     * 📊 Завантаження статистики з API
     */
    async loadStatistics() {
        try {
            const response = await fetch(`${this.API_BASE}/api/requests/stats`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.warn('⚠️ Статистика недоступна, розраховуємо локально');
                this.calculateLocalStatistics();
                return;
            }
            
            const data = await response.json();
            
            if (data.success && data.data) {
                this.statistics = data.data;
                console.log('✅ Статистика завантажена:', this.statistics);
            }
        } catch (error) {
            console.error('❌ Помилка завантаження статистики:', error);
            this.calculateLocalStatistics();
        }
    }
    
    /**
     * 🔄 Нормалізація заявки до єдиного формату
     */
    normalizeRequest(req) {
        return {
            id: req._id || req.id,
            title: req.title || req.description || 'Заявка без назви',
            client: this.getClientName(req.clientId || req.client),
            clientId: req.clientId || req.client,
            priority: req.priority || 'medium',
            status: req.status || 'pending',
            date: this.formatDate(req.createdAt || req.date || new Date()),
            assignedTo: this.getTechnicianName(req.technician || req.assignedTo),
            technicianId: req.technician || req.assignedTo,
            description: req.description || req.title || '',
            location: this.getLiftAddress(req.liftId) || req.liftAddress || req.location || 'Не вказано',
            liftId: req.liftId,
            type: req.type || 'maintenance',
            urgent: req.urgent || req.priority === 'high',
            createdAt: req.createdAt || new Date().toISOString()
        };
    }
    
    /**
     * 👨‍🔧 Нормалізація техніка
     */
    normalizeTechnician(tech) {
        // Підрахунок активних завдань
        const activeRequests = this.requests.filter(r => 
            (r.technicianId === tech._id || r.technicianId === tech._id?.toString()) &&
            (r.status === 'assigned' || r.status === 'in_progress')
        ).length;
        
        return {
            id: tech._id || tech.id,
            firstName: tech.firstName || tech.name?.split(' ')[0] || 'Технік',
            lastName: tech.lastName || tech.name?.split(' ')[1] || '',
            email: tech.email,
            phone: tech.phone || 'Не вказано',
            status: this.determineTechStatus(activeRequests),
            currentAssignments: activeRequests,
            rating: tech.rating || 4.5,
            specialty: tech.specialty || 'Загальне обслуговування',
            avatar: tech.avatar || '/assets/img/default-avatar.png',
            location: tech.location || 'Не вказано'
        };
    }
    
    /**
     * 🎨 Визначення статусу техніка
     */
    determineTechStatus(activeRequests) {
        if (activeRequests === 0) return 'online';
        if (activeRequests <= 2) return 'busy';
        return 'offline';
    }
    
    /**
     * 👤 Отримання імені клієнта
     */
    getClientName(clientId) {
        if (!clientId) return 'Невідомий клієнт';
        
        // Шукаємо в завантажених користувачах
        // TODO: Завантажувати користувачів окремо
        
        // Поки що повертаємо ID
        return `Клієнт ${clientId.toString().slice(-4)}`;
    }
    
    /**
     * 👨‍🔧 Отримання імені техніка
     */
    getTechnicianName(techId) {
        if (!techId) return null;
        
        const tech = this.technicians.find(t => 
            t.id === techId || t.id?.toString() === techId.toString()
        );
        
        return tech ? `${tech.firstName} ${tech.lastName}` : null;
    }
    
    /**
     * 📍 Отримання адреси ліфта
     */
    getLiftAddress(liftId) {
        if (!liftId) return null;
        
        const lift = this.lifts.find(l => 
            l._id === liftId || l._id?.toString() === liftId.toString()
        );
        
        if (!lift) return null;
        
        // Якщо address - об'єкт
        if (typeof lift.address === 'object') {
            const parts = [];
            if (lift.address.street) parts.push(lift.address.street);
            if (lift.address.city) parts.push(lift.address.city);
            if (lift.address.postalCode) parts.push(lift.address.postalCode);
            return parts.join(', ') || 'Адреса не вказана';
        }
        
        // Якщо address - рядок
        return lift.address || 'Адреса не вказана';
    }
    
    /**
     * 📅 Форматування дати
     */
    formatDate(date) {
        if (!date) return new Date().toLocaleDateString('uk-UA');
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return new Date().toLocaleDateString('uk-UA');
        
        const dateStr = d.toLocaleDateString('uk-UA');
        const timeStr = d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
        
        return `${dateStr} ${timeStr}`;
    }
    
    /**
     * 📊 Локальний розрахунок статистики
     */
    calculateLocalStatistics() {
        this.statistics = {
            total: this.requests.length,
            pending: this.requests.filter(r => r.status === 'pending').length,
            inProgress: this.requests.filter(r => r.status === 'in_progress').length,
            completed: this.requests.filter(r => r.status === 'completed').length,
            cancelled: this.requests.filter(r => r.status === 'cancelled').length
        };
        
        console.log('📊 Локальна статистика:', this.statistics);
    }
    
    /**
     * 🎨 Рендеринг заявок у таблиці
     */
    renderRequests() {
        const tbody = document.getElementById('requestsTableBody');
        if (!tbody) {
            console.error('❌ requestsTableBody не знайдено');
            return;
        }
        
        tbody.innerHTML = '';
        
        // Отримання фільтрів
        const filters = this.getFilters();
        let filteredRequests = this.applyFilters(this.requests, filters);
        
        // Сортування
        filteredRequests = this.applySorting(filteredRequests, filters.sort);
        
        if (filteredRequests.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <i class="fas fa-inbox fa-2x text-muted mb-2"></i>
                        <p class="text-muted">Заявки не знайдені</p>
                        <button class="btn btn-sm btn-primary" onclick="window.dispatcherDashboard.loadRequests()">
                            <i class="fas fa-sync"></i> Оновити
                        </button>
                    </td>
                </tr>
            `;
            return;
        }
        
        filteredRequests.forEach(request => {
            const tr = this.createRequestRow(request);
            tbody.appendChild(tr);
        });
        
        console.log(`✅ Відображено ${filteredRequests.length} заявок з ${this.requests.length}`);
    }
    
    /**
     * 🎯 Створення рядка таблиці для заявки
     */
    createRequestRow(request) {
        const tr = document.createElement('tr');
        
        // Визначення класу пріоритету
        const priorityBadge = this.getPriorityBadge(request.priority);
        const statusBadge = this.getStatusBadge(request.status);
        
        tr.innerHTML = `
            <td class="text-center">
                <input type="checkbox" class="request-select" data-id="${request.id}">
            </td>
            <td>
                <strong>#${request.id.toString().slice(-4)}</strong>
                <br>
                <small class="text-muted">${request.date}</small>
            </td>
            <td>
                <strong>${request.title}</strong>
                <br>
                <small class="text-muted">
                    <i class="fas fa-map-marker-alt"></i> ${request.location}
                </small>
            </td>
            <td>
                <i class="fas fa-user"></i> ${request.client}
            </td>
            <td class="text-center">
                ${priorityBadge}
            </td>
            <td class="text-center">
                ${statusBadge}
            </td>
            <td>
                ${request.assignedTo ? 
                    `<i class="fas fa-user-check text-success"></i> ${request.assignedTo}` : 
                    '<span class="text-muted">Не призначено</span>'
                }
            </td>
            <td class="text-right">
                <button class="btn btn-sm btn-info btn-action" data-action="view" data-id="${request.id}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-success btn-action" data-action="assign" data-id="${request.id}">
                    <i class="fas fa-user-plus"></i>
                </button>
                <button class="btn btn-sm btn-warning btn-action" data-action="edit" data-id="${request.id}">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        
        return tr;
    }
    
    /**
     * 🏷️ Badge для пріоритету
     */
    getPriorityBadge(priority) {
        const badges = {
            'high': '<span class="badge badge-danger">Високий</span>',
            'medium': '<span class="badge badge-warning">Середній</span>',
            'low': '<span class="badge badge-success">Низький</span>'
        };
        return badges[priority] || badges['medium'];
    }
    
    /**
     * 🏷️ Badge для статусу
     */
    getStatusBadge(status) {
        const badges = {
            'pending': '<span class="badge badge-secondary">Нова</span>',
            'assigned': '<span class="badge badge-info">Призначена</span>',
            'in_progress': '<span class="badge badge-primary">В роботі</span>',
            'completed': '<span class="badge badge-success">Завершена</span>',
            'cancelled': '<span class="badge badge-dark">Скасована</span>'
        };
        return badges[status] || badges['pending'];
    }
    
    /**
     * 🔍 Отримання фільтрів з UI
     */
    getFilters() {
        return {
            priority: document.getElementById('priorityFilter')?.value || 'all',
            status: document.getElementById('statusFilter')?.value || 'all',
            technician: document.getElementById('technicianFilter')?.value || 'all',
            date: document.getElementById('dateFilter')?.value || '',
            sort: document.getElementById('sortSelect')?.value || 'date-desc'
        };
    }
    
    /**
     * 🎯 Застосування фільтрів
     */
    applyFilters(requests, filters) {
        return requests.filter(request => {
            const priorityMatch = filters.priority === 'all' || request.priority === filters.priority;
            const statusMatch = filters.status === 'all' || request.status === filters.status;
            const techMatch = filters.technician === 'all' || 
                (request.technicianId && request.technicianId.toString() === filters.technician);
            
            let dateMatch = true;
            if (filters.date) {
                const reqDate = new Date(request.createdAt).toLocaleDateString('uk-UA');
                const filterDate = new Date(filters.date).toLocaleDateString('uk-UA');
                dateMatch = reqDate === filterDate;
            }
            
            return priorityMatch && statusMatch && techMatch && dateMatch;
        });
    }
    
    /**
     * 📊 Застосування сортування
     */
    applySorting(requests, sortType) {
        const sorted = [...requests];
        
        switch (sortType) {
            case 'date-desc':
                sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'date-asc':
                sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'priority-desc':
                const prio = { 'high': 3, 'medium': 2, 'low': 1 };
                sorted.sort((a, b) => prio[b.priority] - prio[a.priority]);
                break;
            case 'priority-asc':
                const prioAsc = { 'high': 3, 'medium': 2, 'low': 1 };
                sorted.sort((a, b) => prioAsc[a.priority] - prioAsc[b.priority]);
                break;
            case 'status':
                const statusOrder = { 'pending': 1, 'assigned': 2, 'in_progress': 3, 'completed': 4, 'cancelled': 5 };
                sorted.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
                break;
        }
        
        return sorted;
    }
    
    /**
     * 👨‍🔧 Рендеринг списку техніків
     */
    renderTechnicians() {
        const techList = document.getElementById('techList');
        if (!techList) {
            console.error('❌ techList не знайдено');
            return;
        }
        
        techList.innerHTML = '';
        
        if (this.technicians.length === 0) {
            techList.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-users-slash fa-2x text-muted mb-2"></i>
                    <p class="text-muted">Техніків не знайдено</p>
                </div>
            `;
            return;
        }
        
        this.technicians.forEach(tech => {
            const techItem = this.createTechnicianItem(tech);
            techList.appendChild(techItem);
        });
        
        console.log(`✅ Відображено ${this.technicians.length} техніків`);
    }
    
    /**
     * 👤 Створення елемента техніка
     */
    createTechnicianItem(tech) {
        const div = document.createElement('div');
        div.className = 'tech-item';
        
        const statusClass = {
            'online': 'online',
            'busy': 'busy',
            'offline': 'offline'
        }[tech.status] || 'offline';
        
        const statusText = {
            'online': 'Доступний',
            'busy': 'Зайнятий',
            'offline': 'Офлайн'
        }[tech.status] || 'Невідомо';
        
        div.innerHTML = `
            <img src="${tech.avatar}" alt="${tech.firstName}" class="tech-avatar">
            <div class="flex-grow-1">
                <strong>${tech.firstName} ${tech.lastName}</strong>
                <br>
                <small class="text-muted">
                    <span class="status-indicator ${statusClass}"></span>
                    ${statusText} | Завдань: ${tech.currentAssignments}
                </small>
            </div>
            <div class="text-right">
                <span class="badge badge-info">${tech.rating} ⭐</span>
                <br>
                <small class="text-muted">${tech.specialty}</small>
            </div>
        `;
        
        return div;
    }
    
    /**
     * 📊 Оновлення статистики в UI
     */
    updateStats() {
        const stats = this.statistics.total ? this.statistics : this.calculateLocalStatistics();
        
        // Оновлення карток
        this.updateStatCard('totalRequests', stats.total || 0);
        this.updateStatCard('pendingRequests', stats.pending || 0);
        this.updateStatCard('inProgressRequests', stats.inProgress || 0);
        this.updateStatCard('completedToday', stats.completed || 0);
        
        // Оновлення прогрес-барів (якщо є)
        if (stats.total > 0) {
            const completionRate = Math.round((stats.completed / stats.total) * 100);
            this.updateProgressBar('completionRate', completionRate);
        }
        
        console.log('✅ Статистика оновлена:', stats);
    }
    
    /**
     * 🎯 Оновлення значення stat-card
     */
    updateStatCard(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    /**
     * 📊 Оновлення прогрес-бару
     */
    updateProgressBar(id, percentage) {
        const element = document.getElementById(id);
        if (element) {
            element.style.width = `${percentage}%`;
            element.textContent = `${percentage}%`;
        }
    }
    
    /**
     * 📜 Рендеринг останніх активностей
     */
    renderActivities() {
        const activitiesList = document.getElementById('recentActivities');
        if (!activitiesList) return;
        
        activitiesList.innerHTML = '';
        
        // Беремо останні 10 заявок
        const recentRequests = [...this.requests]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10);
        
        if (recentRequests.length === 0) {
            activitiesList.innerHTML = `
                <div class="list-group-item text-center">
                    <small class="text-muted">Активностей немає</small>
                </div>
            `;
            return;
        }
        
        recentRequests.forEach(request => {
            const item = document.createElement('div');
            item.className = 'list-group-item list-group-item-action';
            item.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">${request.title}</h6>
                    <small>${request.date}</small>
                </div>
                <p class="mb-1">
                    <small>${request.client} | ${request.location}</small>
                </p>
                <small>${this.getStatusBadge(request.status)}</small>
            `;
            activitiesList.appendChild(item);
        });
    }
    
    /**
     * 🎧 Налаштування обробників подій
     */
    setupEventListeners() {
        console.log('🎧 Налаштування обробників подій...');
        
        if (typeof $ === 'undefined') {
            console.error('❌ jQuery не завантажено!');
            return;
        }
        
        // Фільтри
        $('#priorityFilter, #statusFilter, #technicianFilter, #dateFilter, #sortSelect').on('change', () => {
            this.renderRequests();
        });
        
        // Вибір всіх чекбоксів
        $('#selectAllRequests').on('change', (e) => {
            const checked = e.target.checked;
            $('.request-select').prop('checked', checked);
            this.updateSelectedRequests();
        });
        
        // Обробники для кнопок дій
        $(document).on('click', '.btn-action', (e) => {
            e.preventDefault();
            const action = $(e.target).closest('.btn-action').data('action');
            const id = $(e.target).closest('.btn-action').data('id');
            
            console.log('🎯 Дія:', action, 'ID:', id);
            
            switch (action) {
                case 'view':
                    this.viewRequest(id);
                    break;
                case 'assign':
                    this.assignRequest(id);
                    break;
                case 'edit':
                    this.editRequest(id);
                    break;
            }
        });
        
        // Оновлення даних
        $('#refreshBtn').on('click', () => {
            this.refreshData();
        });
        
        console.log('✅ Обробники подій налаштовано');
    }
    
    /**
     * 🔄 Оновлення вибраних заявок
     */
    updateSelectedRequests() {
        this.selectedRequests.clear();
        $('.request-select:checked').each((index, checkbox) => {
            this.selectedRequests.add($(checkbox).data('id'));
        });
        console.log(`📌 Вибрано заявок: ${this.selectedRequests.size}`);
    }
    
    /**
     * 🔍 Налаштування фільтрів
     */
    setupFilters() {
        // Заповнення dropdown техніків
        const techFilter = document.getElementById('technicianFilter');
        if (techFilter && this.technicians.length > 0) {
            techFilter.innerHTML = '<option value="all">Всі техніки</option>';
            this.technicians.forEach(tech => {
                const option = document.createElement('option');
                option.value = tech.id;
                option.textContent = `${tech.firstName} ${tech.lastName}`;
                techFilter.appendChild(option);
            });
        }
    }
    
    /**
     * 🌐 Налаштування Socket.IO для real-time оновлень
     */
    setupWebSocket() {
        try {
            // Підключення до Socket.IO сервера з timeout
            this.socket = io({
                reconnection: true,
                reconnectionDelay: 5000,
                reconnectionAttempts: 3, // ✅ ВИПРАВЛЕНО: було Infinity
                timeout: 10000 // ✅ ДОДАНО: timeout для connection
            });
            
            this.socket.on('connect', () => {
                console.log('✅ Socket.IO підключено');
                
                // Аутентифікація - використовуємо правильний ключ токена
                const token = localStorage.getItem('liftmanager_jwt') || localStorage.getItem('token');
                if (token) {
                    this.socket.emit('authenticate', token);
                } else {
                    console.warn('⚠️ Токен не знайдено в localStorage');
                }
            });
            
            this.socket.on('authenticated', (data) => {
                if (data.success) {
                    console.log('✅ Socket.IO автентифіковано:', data.user.email);
                } else {
                    console.error('❌ Socket.IO auth failed:', data.error);
                }
            });
            
            // Real-time оновлення
            this.socket.on('new_request', (data) => {
                console.log('📨 Нова заявка:', data);
                this.refreshData();
            });
            
            this.socket.on('lift_updated', (data) => {
                console.log('📨 Ліфт оновлено:', data);
                this.refreshData();
            });
            
            this.socket.on('request_updated', (data) => {
                console.log('📨 Заявка оновлена:', data);
                this.refreshData();
            });
            
            this.socket.on('disconnect', () => {
                console.log('🔌 Socket.IO відключено');
            });
            
            this.socket.on('error', (error) => {
                console.error('❌ Socket.IO помилка:', error);
            });
        } catch (error) {
            console.error('❌ Не вдалося налаштувати Socket.IO:', error);
        }
    }
    
    /**
     * 🔄 Оновлення всіх даних
     */
    async refreshData() {
        console.log('🔄 Оновлення даних...');
        this.showNotification('Оновлення даних...', 'info');
        
        try {
            await Promise.all([
                this.loadRequests(),
                this.loadTechnicians(),
                this.loadStatistics()
            ]);
            
            this.renderRequests();
            this.renderTechnicians();
            this.updateStats();
            this.renderActivities();
            
            this.showNotification('Дані оновлено успішно', 'success');
        } catch (error) {
            console.error('❌ Помилка оновлення:', error);
            this.showNotification('Помилка оновлення даних', 'error');
        }
    }
    
    /**
     * 👁️ Перегляд заявки
     */
    async viewRequest(id) {
        console.log('👁️ Перегляд заявки:', id);
        
        const request = this.requests.find(r => r.id.toString() === id.toString());
        if (!request) {
            this.showNotification('Заявку не знайдено', 'error');
            return;
        }
        
        // TODO: Показати модальне вікно з деталями
        alert(`Деталі заявки:\n\nID: ${request.id}\nТип: ${request.title}\nКлієнт: ${request.client}\nСтатус: ${request.status}\nПріоритет: ${request.priority}\n\n${request.description}`);
    }
    
    /**
     * 👨‍🔧 Призначення техніка на заявку
     */
    async assignRequest(id) {
        console.log('👨‍🔧 Призначення техніка на заявку:', id);
        
        const request = this.requests.find(r => r.id.toString() === id.toString());
        if (!request) {
            this.showNotification('Заявку не знайдено', 'error');
            return;
        }
        
        // Заповнюємо форму в модальному вікні
        $('#requestSelect').val(id);
        
        // Заповнюємо список техніків
        const techSelect = $('#techSelect');
        techSelect.empty();
        techSelect.append('<option value="">Оберіть техніка...</option>');
        
        this.technicians
            .filter(t => t.status === 'online' || t.status === 'busy')
            .forEach(tech => {
                techSelect.append(`<option value="${tech.id}">${tech.firstName} ${tech.lastName} (${tech.currentAssignments} завдань)</option>`);
            });
        
        // Показуємо модальне вікно
        $('#assignmentModal').modal('show');
    }
    
    /**
     * ✏️ Редагування заявки
     */
    async editRequest(id) {
        console.log('✏️ Редагування заявки:', id);
        
        const request = this.requests.find(r => r.id.toString() === id.toString());
        if (!request) {
            this.showNotification('Заявку не знайдено', 'error');
            return;
        }
        
        // Заповнюємо форму редагування
        $('#editRequestId').val(request.id);
        $('#editTitle').val(request.title);
        $('#editClient').val(request.client);
        $('#editDescription').val(request.description);
        $('#editLocation').val(request.location);
        $('#editPriority').val(request.priority);
        $('#editStatus').val(request.status);
        
        // Показуємо модальне вікно
        $('#editRequestModal').modal('show');
    }
    
    /**
     * 💾 Відправка призначення техніка
     */
    async submitAssignment() {
        console.log('💾 Відправка призначення...');
        
        const requestId = $('#requestSelect').val();
        const technicianId = $('#techSelect').val();
        const priority = $('#prioritySelect').val();
        const deadline = $('#deadline').val();
        const notes = $('#assignmentNotes').val();
        const notifyClient = $('#notifyClient').is(':checked');
        
        if (!requestId || !technicianId) {
            this.showNotification('Виберіть заявку та техніка', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/api/requests/${requestId}/assign`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    technician: technicianId,
                    priority,
                    deadline,
                    notes,
                    notifyClient
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Техніка призначено успішно', 'success');
                $('#assignmentModal').modal('hide');
                await this.refreshData();
            } else {
                throw new Error(data.message || 'Помилка призначення');
            }
        } catch (error) {
            console.error('❌ Помилка призначення:', error);
            this.showNotification('Помилка призначення техніка', 'error');
        }
    }
    
    /**
     * 💾 Відправка оновленої заявки
     */
    async submitEditRequest() {
        console.log('💾 Збереження змін заявки...');
        
        const requestId = $('#editRequestId').val();
        const title = $('#editTitle').val();
        const description = $('#editDescription').val();
        const location = $('#editLocation').val();
        const priority = $('#editPriority').val();
        const status = $('#editStatus').val();
        
        try {
            const response = await fetch(`${this.API_BASE}/api/requests/${requestId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    description,
                    location,
                    priority,
                    status
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Зміни збережено', 'success');
                $('#editRequestModal').modal('hide');
                await this.refreshData();
            } else {
                throw new Error(data.message || 'Помилка оновлення');
            }
        } catch (error) {
            console.error('❌ Помилка оновлення:', error);
            this.showNotification('Помилка збереження змін', 'error');
        }
    }
    
    /**
     * 🔔 Показ сповіщення
     */
    showNotification(message, type = 'info') {
        console.log(`🔔 Сповіщення [${type}]:`, message);
        
        // Використовуємо Toastr якщо доступний
        if (typeof toastr !== 'undefined') {
            toastr[type](message);
            return;
        }
        
        // Fallback на alert
        alert(`${type.toUpperCase()}: ${message}`);
    }
    
    /**
     * 📊 Швидка статистика
     */
    quickStats() {
        const stats = `
Статистика диспетчерської панелі:

📋 Заявки:
- Всього: ${this.statistics.total || 0}
- Нові: ${this.statistics.pending || 0}
- В роботі: ${this.statistics.inProgress || 0}
- Завершені: ${this.statistics.completed || 0}

👨‍🔧 Техніки:
- Всього: ${this.technicians.length}
- Доступні: ${this.technicians.filter(t => t.status === 'online').length}
- Зайняті: ${this.technicians.filter(t => t.status === 'busy').length}

🏢 Ліфти: ${this.lifts.length}
        `;
        
        alert(stats);
    }
    
    /**
     * 📡 Відкрити моніторинг
     */
    openMonitoring() {
        window.location.href = '/pages/dispatcher/monitoring.html';
    }
    
    /**
     * 📢 Розсилка повідомлень
     */
    sendBroadcast() {
        // TODO: Реалізувати розсилку
        alert('Функція розсилки в розробці');
    }
    
    /**
     * 🚨 Аварійний протокол
     */
    emergencyProtocol() {
        if (confirm('Активувати аварійний протокол?\n\nБудуть сповіщені всі доступні техніки!')) {
            // TODO: Реалізувати аварійний протокол
            this.showNotification('Аварійний протокол активовано', 'warning');
        }
    }
    
    /**
     * 📊 Показати звіт по техніках
     */
    showTechReport() {
        console.log('📊 Звіт по техніках');
        
        let html = `
            <table class="table table-bordered table-striped">
                <thead>
                    <tr>
                        <th>Технік</th>
                        <th>Статус</th>
                        <th>Завдань</th>
                        <th>Рейтинг</th>
                        <th>Останнє призначення</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        this.technicians.forEach(tech => {
            // Знаходимо останню заявку для техніка
            const techRequests = this.requests.filter(r => 
                r.technicianId && r.technicianId.toString() === tech.id.toString()
            ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            const lastReq = techRequests[0];
            
            html += `
                <tr>
                    <td>${tech.firstName} ${tech.lastName}</td>
                    <td>
                        <span class="status-indicator ${tech.status}"></span>
                        ${tech.status === 'online' ? 'Доступний' : tech.status === 'busy' ? 'Зайнятий' : 'Офлайн'}
                    </td>
                    <td>${tech.currentAssignments}</td>
                    <td>${tech.rating} ⭐</td>
                    <td>${lastReq ? lastReq.date : '-'}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        
        document.getElementById('techReportContent').innerHTML = html;
        $('#techReportModal').modal('show');
    }
    
    /**
     * 💾 Експорт звіту по техніках в CSV
     */
    exportTechReport() {
        console.log('💾 Експорт звіту техніків в CSV');
        
        let csv = 'Технік,Статус,Завдань,Рейтинг,Останнє призначення\n';
        
        this.technicians.forEach(tech => {
            const techRequests = this.requests.filter(r => 
                r.technicianId && r.technicianId.toString() === tech.id.toString()
            ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            const lastReq = techRequests[0];
            const status = tech.status === 'online' ? 'Доступний' : tech.status === 'busy' ? 'Зайнятий' : 'Офлайн';
            
            csv += `${tech.firstName} ${tech.lastName},${status},${tech.currentAssignments},${tech.rating},${lastReq ? lastReq.date : '-'}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tech-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Звіт експортовано', 'success');
    }
    
    /**
     * 🎬 Управління техніками
     */
    showTechManagement() {
        console.log('🎬 Управління техніками');
        window.location.href = '/pages/dispatcher/technicians.html';
    }
    
    /**
     * 📋 Показати всі заявки
     */
    showAllRequests() {
        console.log('📋 Всі заявки');
        window.location.href = '/pages/dispatcher/assignments.html';
    }
    
    /**
     * 🔔 Показати сповіщення
     */
    showNotifications() {
        console.log('🔔 Сповіщення');
        
        // TODO: Завантажити реальні сповіщення з API
        const notifications = [
            { id: 1, message: 'Нова заявка від клієнта', time: '5 хв тому', type: 'info' },
            { id: 2, message: 'Технік завершив завдання', time: '15 хв тому', type: 'success' },
            { id: 3, message: 'Термінова заявка!', time: '30 хв тому', type: 'danger' }
        ];
        
        let html = '';
        notifications.forEach(notif => {
            html += `
                <div class="alert alert-${notif.type}">
                    <strong>${notif.message}</strong>
                    <br>
                    <small class="text-muted">${notif.time}</small>
                </div>
            `;
        });
        
        document.getElementById('notificationsList').innerHTML = html;
        $('#notificationsModal').modal('show');
    }
    
    /**
     * 💬 Показати повідомлення
     */
    showMessages() {
        console.log('💬 Повідомлення');
        
        // TODO: Реалізувати чат
        alert('Функція повідомлень в розробці');
    }
    
    /**
     * ✅ Позначити всі сповіщення як прочитані
     */
    markAllAsRead() {
        console.log('✅ Позначено всі сповіщення як прочитані');
        $('#notificationsModal').modal('hide');
        this.showNotification('Всі сповіщення прочитані', 'success');
    }
    
    /**
     * 📊 Фільтрація активностей по типу
     */
    filterActivities(type) {
        console.log('🔍 Фільтр активностей:', type);
        
        // TODO: Реалізувати фільтрацію
        let filteredRequests = this.requests;
        
        if (type === 'assignments') {
            filteredRequests = this.requests.filter(r => r.status === 'assigned');
        } else if (type === 'completions') {
            filteredRequests = this.requests.filter(r => r.status === 'completed');
        }
        
        // Перерендеримо список активностей
        this.renderActivitiesFiltered(filteredRequests);
    }
    
    /**
     * 📜 Рендеринг відфільтрованих активностей
     */
    renderActivitiesFiltered(requests) {
        const activitiesList = document.getElementById('recentActivities');
        if (!activitiesList) return;
        
        activitiesList.innerHTML = '';
        
        const recentRequests = requests
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10);
        
        if (recentRequests.length === 0) {
            activitiesList.innerHTML = `
                <div class="list-group-item text-center">
                    <small class="text-muted">Активностей немає</small>
                </div>
            `;
            return;
        }
        
        recentRequests.forEach(request => {
            const item = document.createElement('div');
            item.className = 'list-group-item list-group-item-action';
            item.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">${request.title}</h6>
                    <small>${request.date}</small>
                </div>
                <p class="mb-1">
                    <small>${request.client} | ${request.location}</small>
                </p>
                <small>${this.getStatusBadge(request.status)}</small>
            `;
            activitiesList.appendChild(item);
        });
    }
    
    /**
     * 📝 Створення нового призначення
     */
    createNewAssignment() {
        console.log('📝 Нове призначення');
        
        // Очищаємо форму
        $('#assignmentForm')[0].reset();
        
        // Заповнюємо список заявок
        const requestSelect = $('#requestSelect');
        requestSelect.empty();
        requestSelect.append('<option value="">Оберіть заявку...</option>');
        
        this.requests
            .filter(r => r.status === 'pending')
            .forEach(req => {
                requestSelect.append(`
                    <option value="${req.id}">
                        #${req.id.toString().slice(-4)} - ${req.title} (${req.client})
                    </option>
                `);
            });
        
        // Заповнюємо список техніків
        const techSelect = $('#techSelect');
        techSelect.empty();
        techSelect.append('<option value="">Оберіть техніка...</option>');
        
        this.technicians
            .filter(t => t.status === 'online' || t.status === 'busy')
            .forEach(tech => {
                techSelect.append(`
                    <option value="${tech.id}">
                        ${tech.firstName} ${tech.lastName} (${tech.currentAssignments} завдань)
                    </option>
                `);
            });
        
        // Показуємо модальне вікно
        $('#assignmentModal').modal('show');
    }
    
    /**
     * 📈 Генерація звіту
     */
    generateReport() {
        console.log('📈 Генерація звіту');
        
        // TODO: Реалізувати генерацію звітів
        alert('Функція звітів в розробці');
    }
}

// Глобальна ініціалізація
window.DispatcherDashboardReal = DispatcherDashboardReal;

console.log('✅ dispatcher-dashboard-real.js завантажено');
