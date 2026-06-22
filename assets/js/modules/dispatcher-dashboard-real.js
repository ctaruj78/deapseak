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
 * Função-Based Data Access:
 * - Dispatcher бачить ВСІ заявки
 * - Técnicoи фільтруються по статусу (available, busy)
 * - Clienteи пов'язані з ліфтами через client field
 */

class DispatcherDashboardReal {
    constructor() {
        console.log('🚀 DispatcherDashboardReal: Ініціалізація з реальними даними...');
        
        this.API_BASE = window.location.origin;
        // Перевіряємо sessionStorage спочатку (пріоритет), потім localStorage
        this.token = sessionStorage.getItem('liftmanager_jwt') ||
                     localStorage.getItem('liftmanager_jwt') ||
                     localStorage.getItem('token') ||
                     localStorage.getItem('authToken') ||
                     localStorage.getItem('lm_token');
        
        if (!this.token) {
            console.error('❌ Token не знайдено — auth.js обробить редірект');
            return; // Не редіректимо — auth.js вже це робить
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
            console.log('📡 A carregar даних з API...');
            
            // Паралельне завантаження всіх даних
            await Promise.all([
                this.loadRequests(),
                this.loadTechnicians(),
                this.loadLifts(),
                this.loadStatistics()
            ]);
            
            // ✅ Перерахунок завдань техніків після завантаження заявок
            // (Promise.all виконується паралельно, atrás при нормалізації техніків
            //  заявки могли бути ще не завантажені → activeRequests = 0 у всіх)
            this.technicians = this.technicians.map(tech => {
                const activeRequests = this.requests.filter(r =>
                    (r.technicianId === tech.id || r.technicianId?.toString() === tech.id?.toString()) &&
                    (r.status === 'assigned' || r.status === 'in_progress')
                ).length;
                return {
                    ...tech,
                    currentAssignments: activeRequests,
                    status: this.determineTechStatus(activeRequests)
                };
            });
            
            console.log('✅ Todos дані завантажено:', {
                requests: this.requests.length,
                technicians: this.technicians.length,
                lifts: this.lifts.length
            });
            
            // Рендеринг UI
            this.renderRequests();
            this.renderTechnicians();
            this.updateStats();
            this.renderActivities();
            
            // Definições
            this.setupEventListeners();
            this.setupFilters();
            this.setupWebSocket();
            
            console.log('✅ DispatcherDashboardReal готова до роботи!');
        } catch (error) {
            console.error('❌ Erro ініціалізації:', error);
            this.showNotification('Erro ao carregar dados', 'error');
        }
    }
    
    /**
     * 📋 A carregar заявок з API
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
            console.error('❌ Erro завантаження заявок:', error);
            this.requests = [];
            throw error;
        }
    }
    
    /**
     * 🔧 A carregar техніків з API
     */
    async loadTechnicians() {
        try {
            const response = await fetch(`${this.API_BASE}/api/technicians`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // /api/technicians повертає масив напряму
            const techArray = Array.isArray(data) ? data : (data.data || []);
            if (techArray.length > 0) {
                this.technicians = techArray.map(tech => this.normalizeTechnician(tech));
                console.log('✅ Завантажено техніків:', this.technicians.length);
            } else {
                console.warn('⚠️ Técnicoів не знайдено');
                this.technicians = [];
            }
        } catch (error) {
            console.error('❌ Erro завантаження техніків:', error);
            this.technicians = [];
        }
    }
    
    /**
     * 🏢 A carregar ліфтів з API
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
            console.error('❌ Erro завантаження ліфтів:', error);
            this.lifts = [];
        }
    }
    
    /**
     * 📊 A carregar статистики з API
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
            console.error('❌ Erro завантаження статистики:', error);
            this.calculateLocalStatistics();
        }
    }
    
    /**
     * 🔄 Нормалізація заявки до єдиного формату
     */
    normalizeRequest(req) {
        return {
            id: req._id || req.id,
            requestNumber: req.requestNumber || null,
            title: req.title || req.description || 'Pedido sem título',
            client: this.getClientName(req.clientId || req.client),
            clientId: req.clientId || req.client,
            priority: req.priority || 'medium',
            status: req.status || 'pending',
            date: this.formatDate(req.createdAt || req.date || new Date()),
            assignedTo: this.getTechnicianName(req.technician || req.assignedTo),
            technicianId: req.technician || req.assignedTo,
            description: req.description || req.title || '',
            location: this.getLiftAddress(req.liftId) || req.liftAddress || req.location || 'Não especificado',
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
            firstName: tech.firstName || tech.name?.split(' ')[0] || 'Técnico',
            lastName: tech.lastName || tech.name?.split(' ')[1] || '',
            email: tech.email,
            phone: tech.phone || 'Não especificado',
            status: this.determineTechStatus(activeRequests),
            currentAssignments: activeRequests,
            rating: tech.rating || 4.5,
            specialty: tech.specialty || 'Manutenção Geral',
            avatar: tech.avatar || '/assets/img/default-avatar.png',
            location: tech.location || 'Não especificado'
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
        if (!clientId) return 'Cliente desconhecido';
        
        // Шукаємо в завантажених користувачах
        // TODO: Завантажувати користувачів окремо
        
        // Поки що повертаємо ID
        return `Cliente ${clientId.toString().slice(-4)}`;
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
            return parts.join(', ') || 'Endereço não especificado';
        }
        
        // Якщо address - рядок
        return lift.address || 'Endereço não especificado';
    }
    
    /**
     * 📅 Форматування дати
     */
    formatDate(date) {
        if (!date) return new Date().toLocaleDateString('pt-PT');
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return new Date().toLocaleDateString('pt-PT');
        
        const dateStr = d.toLocaleDateString('pt-PT');
        const timeStr = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        
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
                        <p class="text-muted">Pedidos não encontrados</p>
                        <button class="btn btn-sm btn-primary" onclick="window.dispatcherDashboard.loadRequests()">
                            <i class="fas fa-sync"></i> Atualizar
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
        
        const reqLabel = request.requestNumber || ('#' + request.id.toString().slice(-6));
        const clientShort = (request.client || '—').length > 18 ? request.client.slice(0, 16) + '…' : (request.client || '—');
        const techShort = request.assignedTo
            ? ((request.assignedTo.length > 16 ? request.assignedTo.slice(0, 14) + '…' : request.assignedTo))
            : null;

        tr.innerHTML = `
            <td class="text-center align-middle" style="width:30px">
                <input type="checkbox" class="request-select" data-id="${request.id}">
            </td>
            <td class="align-middle" style="width:110px">
                <span class="badge badge-secondary font-weight-normal" style="font-size:11px">${reqLabel}</span>
                <div class="text-muted" style="font-size:11px;white-space:nowrap">${request.date}</div>
            </td>
            <td class="align-middle">
                <div class="font-weight-bold" style="font-size:13px;line-height:1.2">${request.title}</div>
                <div class="text-muted" style="font-size:11px">
                    <i class="fas fa-map-marker-alt mr-1"></i>${request.location}
                </div>
            </td>
            <td class="align-middle" style="font-size:12px">
                <i class="fas fa-user text-muted mr-1"></i>${clientShort}
            </td>
            <td class="text-center align-middle" style="width:80px">${priorityBadge}</td>
            <td class="text-center align-middle" style="width:90px">${statusBadge}</td>
            <td class="align-middle" style="font-size:12px">
                ${techShort
                    ? `<i class="fas fa-user-check text-success mr-1"></i>${techShort}`
                    : '<span class="text-muted">—</span>'
                }
            </td>
            <td class="text-center align-middle" style="width:80px">
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-outline-info btn-action" data-action="view" data-id="${request.id}" title="Ver">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-outline-success btn-action" data-action="assign" data-id="${request.id}" title="Atribuir">
                        <i class="fas fa-user-plus"></i>
                    </button>
                    <button class="btn btn-outline-warning btn-action" data-action="edit" data-id="${request.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        `;
        
        return tr;
    }
    
    /**
     * 🏷️ Badge для пріоритету
     */
    getPriorityBadge(priority) {
        const badges = {
            'high': '<span class="badge badge-danger">Alto</span>',
            'medium': '<span class="badge badge-warning">Médio</span>',
            'low': '<span class="badge badge-success">Baixo</span>'
        };
        return badges[priority] || badges['medium'];
    }
    
    /**
     * 🏷️ Badge для статусу
     */
    getStatusBadge(status) {
        const badges = {
            'pending': '<span class="badge badge-secondary">Novo</span>',
            'assigned': '<span class="badge badge-info">Atribuído</span>',
            'in_progress': '<span class="badge badge-primary">Em curso</span>',
            'completed': '<span class="badge badge-success">Concluído</span>',
            'cancelled': '<span class="badge badge-dark">Cancelado</span>'
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
                const reqDate = new Date(request.createdAt).toLocaleDateString('pt-PT');
                const filterDate = new Date(filters.date).toLocaleDateString('pt-PT');
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
                    <p class="text-muted">Nenhum técnico encontrado</p>
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
            'online': 'Disponível',
            'busy': 'Ocupado',
            'offline': 'Offline'
        }[tech.status] || 'Desconhecido';

        const specialtyMap = {
            'general': 'Geral',
            'electric': 'Elétrica',
            'electrical': 'Elétrica',
            'mechanical': 'Mecânica',
            'hydraulic': 'Hidráulica',
            'maintenance': 'Manutenção',
            'network': 'Redes',
            'hardware': 'Equipamento',
            'software': 'Software',
            'security': 'Segurança',
            'repair': 'Reparação',
            'inspection': 'Inspeção'
        };
        const specialtyText = specialtyMap[tech.specialty] || tech.specialty || 'Geral';
        
        div.innerHTML = `
            <img src="${tech.avatar}" alt="Técnico" class="tech-avatar">
            <div class="flex-grow-1">
                <strong>${tech.firstName} ${tech.lastName}</strong>
                <br>
                <small class="text-muted">
                    <span class="status-indicator ${statusClass}"></span>
                    ${statusText} | Tarefas: ${tech.currentAssignments}
                </small>
            </div>
            <div class="text-right">
                <span class="badge badge-info">${tech.rating} ⭐</span>
                <br>
                <small class="text-muted">${specialtyText}</small>
            </div>
        `;
        
        return div;
    }
    
    /**
     * 📊 Atualização статистики в UI
     */
    updateStats() {
        // Якщо API не повернув потрібні поля, розраховуємо локально
        if (!this.statistics || !this.statistics.total) {
            this.calculateLocalStatistics();
        }
        const stats = this.statistics;
        
        // Atualização карток
        this.updateStatCard('totalRequests', stats.total || 0);
        this.updateStatCard('pendingRequests', stats.pending || 0);
        this.updateStatCard('inProgressRequests', stats.inProgress || 0);
        this.updateStatCard('completedToday', stats.completed || 0);
        
        // Вільні техніки
        const availableTechsCount = this.technicians.filter(t => t.status === 'online').length;
        this.updateStatCard('availableTechs', availableTechsCount);
        
        // Термінові / високопріоритетні заявки
        const urgentCount = this.requests.filter(r =>
            (r.urgent || r.priority === 'high') &&
            (r.status === 'pending' || r.status === 'assigned' || r.status === 'in_progress')
        ).length;
        this.updateStatCard('urgentRequests', urgentCount);
        
        // Atualização badge онлайн техніків
        const onlineTechsEl = document.getElementById('onlineTechs');
        if (onlineTechsEl) {
            onlineTechsEl.textContent = `${availableTechsCount} online`;
        }
        
        // Atualização прогрес-барів (якщо є)
        if (stats.total > 0) {
            const completionRate = Math.round((stats.completed / stats.total) * 100);
            this.updateProgressBar('completionRate', completionRate);
        }
        
        console.log('✅ Статистика оновлена:', stats, 'Técnicoів вільних:', availableTechsCount, 'Термінових:', urgentCount);
    }
    
    /**
     * 🎯 Atualização значення stat-card
     */
    updateStatCard(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    /**
     * 📊 Atualização прогрес-бару
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
        
        // Marемо останні 10 заявок
        const recentRequests = [...this.requests]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10);
        
        if (recentRequests.length === 0) {
            activitiesList.innerHTML = `
                <div class="list-group-item text-center">
                    <small class="text-muted">Sem atividades</small>
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
     * 🎧 Definições обробників подій
     */
    setupEventListeners() {
        console.log('🎧 Definições обробників подій...');
        
        if (typeof $ === 'undefined') {
            console.error('❌ jQuery не завантажено!');
            return;
        }
        
        // Filtroи
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
        
        // Atualização даних
        $('#refreshBtn').on('click', () => {
            this.refreshData();
        });
        
        console.log('✅ Обробники подій налаштовано');
    }
    
    /**
     * 🔄 Atualização вибраних заявок
     */
    updateSelectedRequests() {
        this.selectedRequests.clear();
        $('.request-select:checked').each((index, checkbox) => {
            this.selectedRequests.add($(checkbox).data('id'));
        });
        console.log(`📌 Вибрано заявок: ${this.selectedRequests.size}`);
    }
    
    /**
     * 🔍 Definições фільтрів
     */
    setupFilters() {
        // Заповнення dropdown техніків
        const techFilter = document.getElementById('technicianFilter');
        if (techFilter && this.technicians.length > 0) {
            techFilter.innerHTML = '<option value="all">Todos os técnicos</option>';
            this.technicians.forEach(tech => {
                const option = document.createElement('option');
                option.value = tech.id;
                option.textContent = `${tech.firstName} ${tech.lastName}`;
                techFilter.appendChild(option);
            });
        }
    }
    
    /**
     * 🌐 Definições Socket.IO для real-time оновлень
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
                console.log('📨 Nova заявка:', data);
                this.refreshData();
            });
            
            this.socket.on('lift_updated', (data) => {
                console.log('📨 Elevador оновлено:', data);
                this.refreshData();
            });
            
            this.socket.on('request_updated', (data) => {
                console.log('📨 Pedido оновлена:', data);
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
     * 🔄 Atualização всіх даних
     */
    async refreshData() {
        console.log('🔄 Atualização даних...');
        this.showNotification('A atualizar dados...', 'info');
        
        try {
            await Promise.all([
                this.loadRequests(),
                this.loadTechnicians(),
                this.loadStatistics()
            ]);
            
            // ✅ Перерахунок завдань після паралельного завантаження
            this.technicians = this.technicians.map(tech => {
                const activeRequests = this.requests.filter(r =>
                    (r.technicianId === tech.id || r.technicianId?.toString() === tech.id?.toString()) &&
                    (r.status === 'assigned' || r.status === 'in_progress')
                ).length;
                return {
                    ...tech,
                    currentAssignments: activeRequests,
                    status: this.determineTechStatus(activeRequests)
                };
            });
            
            this.renderRequests();
            this.renderTechnicians();
            this.updateStats();
            this.renderActivities();
            
            this.showNotification('Dados atualizados com sucesso', 'success');
        } catch (error) {
            console.error('❌ Erro оновлення:', error);
            this.showNotification('Erro ao atualizar dados', 'error');
        }
    }
    
    /**
     * 👁️ Перегляд заявки
     */
    async viewRequest(id) {
        console.log('👁️ Перегляд заявки:', id);
        
        const request = this.requests.find(r => r.id.toString() === id.toString());
        if (!request) {
            this.showNotification('Pedido não encontrado', 'error');
            return;
        }
        
        // TODO: Показати модальне вікно з деталями
        toastr.info(`Detalhes do pedido:\n\nID: ${request.id}\nTítulo: ${request.title}\nCliente: ${request.client}\nEstado: ${request.status}\nPrioridade: ${request.priority}\n\n${request.description}`);
    }
    
    /**
     * 👨‍🔧 Atribuir técnico на заявку
     */
    async assignRequest(id) {
        console.log('👨‍🔧 Atribuir técnico на заявку:', id);
        
        const request = this.requests.find(r => r.id.toString() === id.toString());
        if (!request) {
            this.showNotification('Pedido não encontrado', 'error');
            return;
        }
        
        // Заповнюємо форму в модальному вікні
        $('#requestSelect').val(id);
        
        // Заповнюємо список техніків
        const techSelect = $('#techSelect');
        techSelect.empty();
        techSelect.append('<option value="">Selecione um técnico...</option>');
        
        this.technicians
            .filter(t => t.status === 'online' || t.status === 'busy')
            .forEach(tech => {
                techSelect.append(`<option value="${tech.id}">${tech.firstName} ${tech.lastName} (${tech.currentAssignments} tarefas)</option>`);
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
            this.showNotification('Pedido não encontrado', 'error');
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
            this.showNotification('Selecione um pedido e um técnico', 'error');
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
                this.showNotification('Técnico atribuído com sucesso', 'success');
                $('#assignmentModal').modal('hide');
                await this.refreshData();
            } else {
                throw new Error(data.message || 'Erro ao atribuir');
            }
        } catch (error) {
            console.error('❌ Erro призначення:', error);
            this.showNotification('Erro ao atribuir técnico', 'error');
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
                this.showNotification('Alterações guardadas', 'success');
                $('#editRequestModal').modal('hide');
                await this.refreshData();
            } else {
                throw new Error(data.message || 'Erro ao atualizar');
            }
        } catch (error) {
            console.error('❌ Erro оновлення:', error);
            this.showNotification('Erro ao guardar alterações', 'error');
        }
    }
    
    /**
     * 🔔 Показ сповіщення
     */
    showNotification(message, type = 'info') {
        console.log(`🔔 Notificações [${type}]:`, message);
        
        // Використовуємо Toastr якщо доступний
        if (typeof toastr !== 'undefined') {
            toastr[type](message);
            return;
        }
        
        // Fallback на alert
        toastr.info(`${type.toUpperCase()}: ${message}`);
    }
    
    /**
     * 📊 Швидка статистика
     */
    quickStats() {
        const stats = `
Статистика диспетчерської панелі:

📋 Pedidos:
- Всього: ${this.statistics.total || 0}
- Нові: ${this.statistics.pending || 0}
- Em progresso: ${this.statistics.inProgress || 0}
- Завершені: ${this.statistics.completed || 0}

👨‍🔧 Técnicoи:
- Всього: ${this.technicians.length}
- Disponíveis: ${this.technicians.filter(t => t.status === 'online').length}
- Ocupados: ${this.technicians.filter(t => t.status === 'busy').length}

🏢 Elevadores: ${this.lifts.length}
        `;
        
    }
    
    /**
     * 📡 Abrir моніторинг
     */
    openMonitoring() {
        window.location.href = '/pages/dispatcher/monitoring.html';
    }
    
    /**
     * 📢 Розсилка повідомлень
     */
    sendBroadcast() {
        // TODO: Реалізувати розсилку
        toastr.info('Funcionalidade de envio em desenvolvimento');
    }
    
    /**
     * 🚨 Emergência протокол
     */
    emergencyProtocol() {
        if (confirm('Ativar protocolo de emergência?\n\nTodos os técnicos disponíveis serão notificados!')) {
            // TODO: Реалізувати avariйний протокол
            this.showNotification('Protocolo de emergência ativado', 'warning');
        }
    }
    
    /**
     * 📊 Показати звіт по техніках
     */
    showTechReport() {
        console.log('📊 Relatório по техніках');
        
        let html = `
            <table class="table table-bordered table-striped">
                <thead>
                    <tr>
                        <th>Técnico</th>
                        <th>Estado</th>
                        <th>Tarefas</th>
                        <th>Classificação</th>
                        <th>Última atribuição</th>
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
                        ${tech.status === 'online' ? 'Disponível' : tech.status === 'busy' ? 'Ocupado' : 'Offline'}
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
     * 💾 Exportar звіту по техніках в CSV
     */
    exportTechReport() {
        console.log('💾 Exportar звіту техніків в CSV');
        
        let csv = 'Técnico,Estado,Tarefas,Classificação,Última atribuição\n';
        
        this.technicians.forEach(tech => {
            const techRequests = this.requests.filter(r => 
                r.technicianId && r.technicianId.toString() === tech.id.toString()
            ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            const lastReq = techRequests[0];
            const status = tech.status === 'online' ? 'Disponível' : tech.status === 'busy' ? 'Ocupado' : 'Offline';
            
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
        
        this.showNotification('Relatório exportado', 'success');
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
        console.log('📋 Todos os pedidos');
        window.location.href = '/pages/dispatcher/assignments.html';
    }
    
    /**
     * 🔔 Показати сповіщення
     */
    async showNotifications() {
        console.log('🔔 Notificações');

        const listEl = document.getElementById('notificationsList');
        if (listEl) {
            listEl.innerHTML = '<div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i> A carregar...</div>';
        }
        $('#notificationsModal').modal('show');

        let notifications = [];

        try {
            const response = await fetch(`${this.API_BASE}/api/notifications`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const raw = data.data || data || [];
                notifications = raw.map(n => ({
                    message: n.message || '—',
                    time: this._relativeTime(n.createdAt),
                    type: this._notifTypeToBootstrap(n.type),
                    read: n.read
                }));
            }
        } catch (e) {
            console.warn('⚠️ Не вдалося завантажити сповіщення з API:', e);
        }

        // Fallback: генеруємо сповіщення з кешованих заявок якщо API повернув порожній масив
        if (notifications.length === 0 && this.requests && this.requests.length > 0) {
            const recentRequests = [...this.requests]
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                .slice(0, 10);

            notifications = recentRequests.map(req => {
                const statusMap = {
                    'pending':   { msg: `Novo pedido: ${req.title || req.description || 'sem descrição'}`, type: 'info' },
                    'assigned':  { msg: `Técnico atribuído: ${req.title || req.description || '—'}`, type: 'primary' },
                    'in_progress': { msg: `Em curso: ${req.title || req.description || '—'}`, type: 'warning' },
                    'completed': { msg: `Concluído: ${req.title || req.description || '—'}`, type: 'success' },
                    'cancelled': { msg: `Cancelado: ${req.title || req.description || '—'}`, type: 'secondary' }
                };
                const mapped = statusMap[req.status] || { msg: req.title || req.description || '—', type: 'info' };
                const isUrgent = req.priority === 'urgent' || req.priority === 'high';
                return {
                    message: (isUrgent ? '🔴 ' : '') + mapped.msg,
                    time: this._relativeTime(req.createdAt),
                    type: isUrgent ? 'danger' : mapped.type,
                    read: false
                };
            });
        }

        let html = '';
        if (notifications.length === 0) {
            html = '<p class="text-center text-muted py-4"><i class="fas fa-bell-slash"></i> Sem novas notificações</p>';
        } else {
            notifications.forEach(notif => {
                const opacity = notif.read ? ' style="opacity:0.6"' : '';
                html += `
                    <div class="alert alert-${notif.type} mb-2"${opacity}>
                        <strong>${notif.message}</strong>
                        <br>
                        <small class="text-muted">${notif.time}</small>
                    </div>
                `;
            });
        }

        if (listEl) listEl.innerHTML = html;
    }

    /**
     * 🕐 Відносний час
     */
    _relativeTime(date) {
        if (!date) return '';
        const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        if (diff < 60)  return `${diff} seg atrás`;
        if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} h atrás`;
        return `${Math.floor(diff / 86400)} d atrás`;
    }

    /**
     * 🎨 Tipo сповіщення → Bootstrap клас
     */
    _notifTypeToBootstrap(type) {
        const map = { info: 'info', success: 'success', warning: 'warning', error: 'danger', danger: 'danger', urgent: 'danger' };
        return map[type] || 'info';
    }

    /**
     * 💬 Показати повідомлення
     */
    showMessages() {
        console.log('💬 Повідомлення');
        
        // TODO: Реалізувати чат
        toastr.info('Funcionalidade de mensagens em desenvolvimento');
    }
    
    /**
     * ✅ Позначити всі сповіщення як прочитані
     */
    async markAllAsRead() {
        console.log('✅ Позначено всі сповіщення як прочитані');
        try {
            await fetch(`${this.API_BASE}/api/notifications/read-all`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (e) {
            console.warn('⚠️ Не вдалося позначити як прочитані:', e);
        }
        $('#notificationsModal').modal('hide');
        this.showNotification('Todas as notificações marcadas como lidas', 'success');
    }
    
    /**
     * 📊 Filtroація активностей по типу
     */
    filterActivities(type) {
        console.log('🔍 Filtro активностей:', type);
        
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
                    <small class="text-muted">Sem atividades</small>
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
        requestSelect.append('<option value="">Selecione um pedido...</option>');
        
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
        techSelect.append('<option value="">Selecione um técnico...</option>');
        
        this.technicians
            .filter(t => t.status === 'online' || t.status === 'busy')
            .forEach(tech => {
                techSelect.append(`
                    <option value="${tech.id}">
                        ${tech.firstName} ${tech.lastName} (${tech.currentAssignments} tarefas)
                    </option>
                `);
            });
        
        // Показуємо модальне вікно
        $('#assignmentModal').modal('show');
    }
    
    /**
     * 📈 A gerar relatório
     */
    generateReport() {
        console.log('📈 A gerar relatório');
        
        // TODO: Реалізувати генерацію звітів
        toastr.info('Funcionalidade de relatórios em desenvolvimento');
    }
}

// Глобальна ініціалізація
window.DispatcherDashboardReal = DispatcherDashboardReal;

console.log('✅ dispatcher-dashboard-real.js завантажено');
