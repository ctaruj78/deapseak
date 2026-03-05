/**
 * Assignment Manager - Система управління заявками з QR інтеграцією
 * Оновлена версія з повною інтеграцією API та QR системою
 */
class AssignmentManager {
    constructor() {
        this.apiUrl = '/api';
        this.assignments = [];
        this.technicians = [];
        this.templates = [];
        this.currentUser = JSON.parse(localStorage.getItem('userData')) || {};
        
        this.filters = {
            status: 'all',
            priority: 'all',
            technician: 'all',
            period: 'today',
            category: 'all'
        };
        this.currentView = 'listView';
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.searchQuery = '';
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Ініціалізація модуля
     */
    async init() {
        try {
            await this.loadData();
            await this.loadTemplates();
            this.setupEventListeners();
            this.setupAutoRefresh();
            this.isInitialized = true;
            
            console.log('✅ Assignment Manager ініціалізовано з QR підтримкою');
        } catch (error) {
            console.error('❌ Помилка ініціалізації Assignment Manager:', error);
            this.loadFromLocalStorage(); // Fallback на локальні дані
        }
    }

    /**
     * Завантаження даних з API
     */
    async loadData(filters = {}) {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Відсутній токен авторизації');
            }

            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            const queryParams = new URLSearchParams(filters).toString();
            
            const [assignmentsRes, techsRes] = await Promise.all([
                fetch(`${this.apiUrl}/requests?${queryParams}`, { headers }),
                fetch(`${this.apiUrl}/users?role=tech`, { headers })
            ]);

            if (assignmentsRes.ok && techsRes.ok) {
                this.assignments = await assignmentsRes.json();
                this.technicians = await techsRes.json();
                
                // Зберігання для офлайн режиму
                localStorage.setItem('assignments', JSON.stringify(this.assignments));
                localStorage.setItem('technicians', JSON.stringify(this.technicians));
                
                this.renderAssignments();
                this.updateStatistics();
                
                return { assignments: this.assignments, technicians: this.technicians };
            } else {
                throw new Error('Помилка завантаження з API');
            }
        } catch (error) {
            console.warn('⚠️ Використання локальних даних:', error.message);
            this.loadFromLocalStorage();
        }
    }

    /**
     * Завантаження з localStorage
     */
    loadFromLocalStorage() {
        this.assignments = JSON.parse(localStorage.getItem('assignments')) || [];
        this.technicians = JSON.parse(localStorage.getItem('technicians')) || [];
        
        if (this.assignments.length === 0) {
            this.createSampleData();
        }
        
        this.renderAssignments();
        this.updateStatistics();
    }

    /**
     * Створення тестових даних
     */
    createSampleData() {
        this.assignments = [
            {
                _id: '1',
                assignmentNumber: 'REQ-2026-0001',
                title: 'Reparação do elevador',
                description: 'Substituição de cabos e verificação do sistema de segurança',
                status: 'new',
                priority: 'high',
                client: {
                    name: 'Condomínio Jardins do Tejo',
                    company: 'Condomínio Jardins do Tejo',
                    phone: '+351211 234 567',
                    email: 'info@condominiotejo.pt'
                },
                location: {
                    address: 'Rua da Liberdade, 123, Lisboa',
                    building: 'ЖК "Центральний"',
                    floor: '15',
                    liftNumber: 'Ліфт №1'
                },
                qrCode: {
                    code: 'QR001',
                    scanHistory: []
                },
                timestamps: {
                    created: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 дні тому
                    updated: new Date()
                },
                metadata: {
                    category: 'repair',
                    source: 'web'
                }
            },
            {
                _id: '2',
                assignmentNumber: 'REQ-2026-0002',
                title: 'Manutenção preventiva',
                description: 'Manutenção periódica de acordo com o calendário',
                status: 'assigned',
                priority: 'medium',
                client: {
                    name: 'Hotel Beira-Mar',
                    company: 'Hotel Beira-Mar Lda.',
                    phone: '+351 961 234 567',
                    email: 'manut@hotelbeiramar.pt'
                },
                location: {
                    address: 'Av. dos Aliados, 45, Porto',
                    building: 'ЖК "Сонячний"',
                    floor: '12',
                    liftNumber: 'Ліфт №2'
                },
                assignment: {
                    assignedTo: 'tech1',
                    assignedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 години тому
                    instructions: 'Повна перевірка всіх систем'
                },
                qrCode: {
                    code: 'QR002',
                    scanHistory: []
                },
                timestamps: {
                    created: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 день тому
                    updated: new Date()
                },
                metadata: {
                    category: 'maintenance',
                    source: 'mobile'
                }
            }
        ];

        this.technicians = [
            {
                _id: 'tech1',
                firstName: 'Carlos',
                lastName: 'Silva',
                phone: '+351 912 111 111',
                email: 'c.silva@festlift.pt',
                role: 'tech',
                status: 'available',
                specialization: ['reparação', 'manutenção']
            },
            {
                _id: 'tech2',
                firstName: 'Miguel',
                lastName: 'Ferreira',
                phone: '+351 912 222 222',
                email: 'm.ferreira@festlift.pt',
                role: 'tech',
                status: 'busy',
                specialization: ['instalação', 'modernização']
            }
        ];

        // Зберегти тестові дані
        localStorage.setItem('assignments', JSON.stringify(this.assignments));
        localStorage.setItem('technicians', JSON.stringify(this.technicians));
    }

    /**
     * Створення нової заявки
     */
    async createAssignment(assignmentData) {
        try {
            const token = localStorage.getItem('authToken');
            
            // Генерація номера заявки
            const assignmentNumber = await this.generateAssignmentNumber();
            
            const newAssignment = {
                ...assignmentData,
                assignmentNumber,
                status: 'new',
                timestamps: {
                    created: new Date(),
                    updated: new Date()
                },
                metadata: {
                    source: 'web',
                    category: assignmentData.category || 'maintenance',
                    createdBy: this.currentUser._id
                }
            };

            const response = await fetch(`${this.apiUrl}/assignments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newAssignment)
            });

            if (response.ok) {
                const createdAssignment = await response.json();
                this.assignments.unshift(createdAssignment);
                this.renderAssignments();
                this.updateStatistics();
                
                // QR інтеграція
                if (assignmentData.qrCode?.code) {
                    await this.linkQRToAssignment(createdAssignment._id, assignmentData.qrCode.code);
                }
                
                this.showNotification('✅ Заявка успішно створена', 'success');
                return createdAssignment;
            } else {
                throw new Error('Помилка створення заявки');
            }
        } catch (error) {
            console.error('Помилка створення заявки:', error);
            this.showNotification('❌ Помилка створення заявки', 'error');
        }
    }

    /**
     * Призначення заявки техніку
     */
    async assignToTechnician(assignmentId, technicianId, instructions = '') {
        try {
            const token = localStorage.getItem('authToken');
            
            const assignmentData = {
                assignment: {
                    assignedTo: technicianId,
                    assignedBy: this.currentUser._id,
                    assignedAt: new Date(),
                    instructions
                },
                status: 'assigned',
                timestamps: {
                    updated: new Date()
                }
            };

            const response = await fetch(`${this.apiUrl}/assignments/${assignmentId}/assign`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(assignmentData)
            });

            if (response.ok) {
                await this.loadData();
                this.showNotification('✅ Заявка призначена техніку', 'success');
                
                // Відправка сповіщення техніку
                await this.sendNotificationToTechnician(technicianId, assignmentId);
                
                return true;
            } else {
                throw new Error('Помилка призначення заявки');
            }
        } catch (error) {
            console.error('Помилка призначення заявки:', error);
            this.showNotification('❌ Помилка призначення заявки', 'error');
        }
    }

    /**
     * QR інтеграція - обробка сканування
     */
    async handleQRScan(qrCode) {
        try {
            const token = localStorage.getItem('authToken');
            
            // Пошук заявки за QR кодом
            const response = await fetch(`${this.apiUrl}/assignments/by-qr/${qrCode}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const assignment = await response.json();
                
                // Реєстрація сканування
                await this.recordQRScan(assignment._id, qrCode, 'scanned');
                
                // Відкриття деталей заявки
                this.openAssignmentDetails(assignment._id);
                
                this.showNotification(`📱 QR скановано: ${assignment.title}`, 'info');
                return assignment;
            } else {
                // QR не знайдено - пропонуємо створити заявку
                this.showQRNotFoundDialog(qrCode);
            }
        } catch (error) {
            console.error('Помилка обробки QR:', error);
            this.showNotification('❌ Помилка сканування QR коду', 'error');
        }
    }

    /**
     * Реєстрація QR сканування
     */
    async recordQRScan(assignmentId, qrCode, action = 'scanned') {
        try {
            const token = localStorage.getItem('authToken');
            
            const scanData = {
                scannedBy: this.currentUser._id,
                scannedAt: new Date(),
                action,
                qrCode,
                notes: `${action} користувачем ${this.currentUser.firstName || 'Unknown'}`
            };

            await fetch(`${this.apiUrl}/assignments/${assignmentId}/qr-scan`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(scanData)
            });
        } catch (error) {
            console.error('Помилка реєстрації QR сканування:', error);
        }
    }

    /**
     * Відображення списку заявок
     */
    renderAssignments() {
        const container = document.getElementById('assignmentsContainer') || 
                         document.getElementById('requestsTableBody') ||
                         document.querySelector('.assignments-list');
                         
        if (!container) {
            console.warn('Контейнер для заявок не знайдено');
            return;
        }

        let filteredAssignments = this.getFilteredAssignments();
        let html = '';

        if (filteredAssignments.length === 0) {
            html = `
                <div class="col-12">
                    <div class="alert alert-info text-center">
                        <i class="fas fa-info-circle mr-2"></i>
                        Заявки не знайдено. <a href="#" onclick="assignmentManager.showCreateDialog()">Створити нову заявку</a>
                    </div>
                </div>
            `;
        } else {
            filteredAssignments.forEach(assignment => {
                html += this.createAssignmentCard(assignment);
            });
        }

        container.innerHTML = html;
        this.updatePagination();
    }

    /**
     * Створення картки заявки
     */
    createAssignmentCard(assignment) {
        const statusClass = this.getStatusClass(assignment.status);
        const priorityClass = this.getPriorityClass(assignment.priority);
        const assignedTech = this.getTechnicianName(assignment.assignment?.assignedTo);
        
        return `
            <div class="col-lg-6 col-xl-4 mb-3">
                <div class="card assignment-card h-100" data-id="${assignment._id}">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <span class="badge badge-${priorityClass} priority-badge">
                            ${this.getPriorityText(assignment.priority)}
                        </span>
                        <span class="badge badge-${statusClass} status-badge">
                            ${this.getStatusText(assignment.status)}
                        </span>
                    </div>
                    
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-1">${assignment.assignmentNumber}</h6>
                            ${assignment.qrCode?.code ? `
                                <span class="badge badge-info qr-badge" title="QR код: ${assignment.qrCode.code}">
                                    <i class="fas fa-qrcode"></i>
                                </span>
                            ` : ''}
                        </div>
                        
                        <h6 class="assignment-title">${assignment.title}</h6>
                        <p class="card-text text-muted small">${assignment.description.substring(0, 80)}${assignment.description.length > 80 ? '...' : ''}</p>
                        
                        <div class="assignment-details">
                            <div class="detail-row mb-1">
                                <i class="fas fa-building text-muted mr-2"></i>
                                <small>${assignment.client?.company || 'Не вказано'}</small>
                            </div>
                            
                            <div class="detail-row mb-1">
                                <i class="fas fa-map-marker-alt text-muted mr-2"></i>
                                <small>${assignment.location?.address || 'Не вказано'}</small>
                            </div>
                            
                            <div class="detail-row mb-1">
                                <i class="fas fa-user text-muted mr-2"></i>
                                <small>${assignedTech || 'Не призначено'}</small>
                            </div>
                            
                            <div class="detail-row">
                                <i class="fas fa-clock text-muted mr-2"></i>
                                <small>${this.formatDate(assignment.timestamps.created)}</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card-footer">
                        <div class="btn-group btn-group-sm w-100" role="group">
                            <button class="btn btn-outline-primary" onclick="assignmentManager.viewAssignment('${assignment._id}')" title="Переглянути">
                                <i class="fas fa-eye"></i>
                            </button>
                            
                            ${this.currentUser.role === 'dispatcher' ? `
                                <button class="btn btn-outline-warning" onclick="assignmentManager.editAssignment('${assignment._id}')" title="Редагувати">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-outline-success" onclick="assignmentManager.showAssignDialog('${assignment._id}')" title="Призначити">
                                    <i class="fas fa-user-plus"></i>
                                </button>
                            ` : ''}
                            
                            ${this.currentUser.role === 'tech' && assignment.assignment?.assignedTo === this.currentUser._id ? `
                                <button class="btn btn-outline-info" onclick="assignmentManager.startWork('${assignment._id}')" title="Почати роботу">
                                    <i class="fas fa-play"></i>
                                </button>
                            ` : ''}
                            
                            ${assignment.qrCode?.code ? `
                                <button class="btn btn-outline-dark" onclick="assignmentManager.showQR('${assignment.qrCode.code}')" title="Показати QR">
                                    <i class="fas fa-qrcode"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Фільтрація заявок
     */
    getFilteredAssignments() {
        return this.assignments.filter(assignment => {
            // Фільтр по статусу
            if (this.filters.status !== 'all' && assignment.status !== this.filters.status) {
                return false;
            }
            
            // Фільтр по пріоритету
            if (this.filters.priority !== 'all' && assignment.priority !== this.filters.priority) {
                return false;
            }
            
            // Фільтр по техніку
            if (this.filters.technician !== 'all' && assignment.assignment?.assignedTo !== this.filters.technician) {
                return false;
            }
            
            // Фільтр по категорії
            if (this.filters.category !== 'all' && assignment.metadata?.category !== this.filters.category) {
                return false;
            }
            
            // Пошук
            if (this.searchQuery && !this.matchesSearch(assignment)) {
                return false;
            }
            
            return true;
        });
    }

    /**
     * Допоміжні методи
     */
    getStatusClass(status) {
        const classes = {
            'new': 'primary',
            'assigned': 'info', 
            'in-progress': 'warning',
            'completed': 'success',
            'cancelled': 'secondary',
            'on-hold': 'dark'
        };
        return classes[status] || 'secondary';
    }

    getStatusText(status) {
        const texts = {
            'new': 'Нова',
            'assigned': 'Призначена',
            'in-progress': 'В роботі', 
            'completed': 'Завершена',
            'cancelled': 'Скасована',
            'on-hold': 'Призупинена'
        };
        return texts[status] || status;
    }

    getPriorityClass(priority) {
        const classes = {
            'low': 'success',
            'medium': 'warning',
            'high': 'danger',
            'urgent': 'danger'
        };
        return classes[priority] || 'secondary';
    }

    getPriorityText(priority) {
        const texts = {
            'low': 'Низький',
            'medium': 'Середній',
            'high': 'Високий',
            'urgent': 'Терміновий'
        };
        return texts[priority] || priority;
    }

    getTechnicianName(techId) {
        if (!techId) return 'Не призначено';
        const tech = this.technicians.find(t => t._id === techId);
        return tech ? `${tech.firstName} ${tech.lastName}` : 'Невідомий технік';
    }

    matchesSearch(assignment) {
        const query = this.searchQuery.toLowerCase();
        const searchFields = [
            assignment.title,
            assignment.description,
            assignment.assignmentNumber,
            assignment.client?.company,
            assignment.location?.address
        ].filter(Boolean);
        
        return searchFields.some(field => 
            field.toLowerCase().includes(query)
        );
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('uk-UA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async generateAssignmentNumber() {
        const year = new Date().getFullYear();
        const count = this.assignments.length + 1;
        return `ASG-${year}-${String(count).padStart(3, '0')}`;
    }

    /**
     * Оновлення статистики
     */
    updateStatistics() {
        const stats = {
            total: this.assignments.length,
            new: this.assignments.filter(a => a.status === 'new').length,
            assigned: this.assignments.filter(a => a.status === 'assigned').length,
            inProgress: this.assignments.filter(a => a.status === 'in-progress').length,
            completed: this.assignments.filter(a => a.status === 'completed').length,
            highPriority: this.assignments.filter(a => a.priority === 'high' || a.priority === 'urgent').length
        };

        // Оновлення елементів інтерфейсу
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };

        updateElement('totalAssignments', stats.total);
        updateElement('newAssignments', stats.new);
        updateElement('assignedAssignments', stats.assigned);
        updateElement('inProgressAssignments', stats.inProgress);
        updateElement('completedAssignments', stats.completed);
        updateElement('highPriorityAssignments', stats.highPriority);
    }

    /**
     * Налаштування подій
     */
    setupEventListeners() {
        // Фільтри
        document.addEventListener('change', (e) => {
            if (e.target.hasAttribute('data-filter')) {
                const filterType = e.target.getAttribute('data-filter');
                this.filters[filterType] = e.target.value;
                this.renderAssignments();
            }
        });

        // Пошук
        const searchInput = document.getElementById('assignmentSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.renderAssignments();
            });
        }
    }

    /**
     * Автооновлення даних
     */
    setupAutoRefresh() {
        // Оновлення кожні 30 секунд
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                this.loadData(this.filters);
            }
        }, 30000);
    }

    /**
     * Завантаження шаблонів
     */
    async loadTemplates() {
        try {
            const token = localStorage.getItem('authToken');
            
            const response = await fetch(`${this.apiUrl}/assignment-templates`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.templates = await response.json();
            }
        } catch (error) {
            console.error('Помилка завантаження шаблонів:', error);
        }
    }

    /**
     * Показ сповіщення
     */
    showNotification(message, type = 'info') {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                text: message,
                icon: type === 'error' ? 'error' : type === 'success' ? 'success' : 'info',
                timer: 3000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    /**
     * Публічні методи для взаємодії з інтерфейсом
     */
    
    // Перегляд деталей заявки
    viewAssignment(id) {
        console.log('Перегляд заявки:', id);
        // Тут буде код для відкриття модального вікна з деталями
    }

    // Редагування заявки
    editAssignment(id) {
        console.log('Редагування заявки:', id);
        // Тут буде код для відкриття форми редагування
    }

    // Показ діалогу призначення
    showAssignDialog(id) {
        console.log('Призначення заявки:', id);
        // Тут буде код для відкриття діалогу призначення техніку
    }

    // Початок роботи техніком
    startWork(id) {
        console.log('Початок роботи над заявкою:', id);
        this.updateAssignmentStatus(id, 'in-progress');
    }

    // Показ QR коду
    showQR(qrCode) {
        console.log('Показ QR коду:', qrCode);
        // Тут буде код для відображення QR коду
    }

    // Діалог створення заявки
    showCreateDialog() {
        console.log('Створення нової заявки');
        // Тут буде код для відкриття форми створення заявки
    }

    /**
     * Оновлення статусу заявки
     */
    async updateAssignmentStatus(assignmentId, status, additionalData = {}) {
        try {
            const token = localStorage.getItem('authToken');
            
            const updateData = {
                status,
                timestamps: {
                    updated: new Date(),
                    [status === 'in-progress' ? 'started' : status]: new Date()
                },
                ...additionalData
            };

            const response = await fetch(`${this.apiUrl}/assignments/${assignmentId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                await this.loadData();
                this.showNotification(`✅ Статус оновлено на "${this.getStatusText(status)}"`, 'success');
                return true;
            } else {
                throw new Error('Помилка оновлення статусу');
            }
        } catch (error) {
            console.error('Помилка оновлення статусу:', error);
            this.showNotification('❌ Помилка оновлення статусу', 'error');
        }
    }

    /**
     * Рендеринг модуля в заданому контейнері для CRM інтеграції
     */
    renderInContainer(containerId, action) {
        action = action || '';
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        let html = '';

        switch (action) {
            case 'create':
                html = this.generateCreateForm();
                break;
            case 'my':
            case 'my-tasks':
                html = this.generateMyAssignments();
                break;
            case 'scan':
                html = this.generateQRScanner();
                break;
            default:
                html = this.generateMainInterface();
        }

        container.innerHTML = html;
        this.setupContainerEvents(containerId);
        
        // Завантажуємо дані
        this.loadAssignments();
    }

    generateMainInterface() {
        return `
            <div class="row">
                <div class="col-md-12">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">
                                <i class="fas fa-tasks"></i> Управління заявками
                            </h3>
                            <div class="card-tools">
                                <button type="button" class="btn btn-primary btn-sm" onclick="assignmentManager.showCreateModal()">
                                    <i class="fas fa-plus"></i> Нова заявка
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <!-- Фільтри -->
                            <div class="row mb-3">
                                <div class="col-md-3">
                                    <select class="form-control" id="statusFilter">
                                        <option value="">Всі статуси</option>
                                        <option value="pending">Очікує</option>
                                        <option value="in_progress">В роботі</option>
                                        <option value="completed">Завершено</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <input type="text" class="form-control" id="searchFilter" placeholder="Пошук...">
                                </div>
                                <div class="col-md-2">
                                    <button class="btn btn-info" onclick="assignmentManager.showQRScanner()">
                                        <i class="fas fa-qrcode"></i> QR
                                    </button>
                                </div>
                            </div>

                            <!-- Таблиця заявок -->
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Тип</th>
                                            <th>Опис</th>
                                            <th>Статус</th>
                                            <th>Клієнт</th>
                                            <th>Створено</th>
                                            <th>Дії</th>
                                        </tr>
                                    </thead>
                                    <tbody id="assignments-table-body">
                                        <tr>
                                            <td colspan="7" class="text-center">
                                                <i class="fas fa-spinner fa-spin"></i> Завантаження...
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generateCreateForm() {
        return `
            <div class="row">
                <div class="col-md-8 offset-md-2">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">
                                <i class="fas fa-plus"></i> Нова заявка
                            </h3>
                        </div>
                        <div class="card-body">
                            <form id="create-assignment-form">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label for="assignment-type">Тип заявки</label>
                                            <select class="form-control" id="assignment-type" required>
                                                <option value="">Оберіть тип</option>
                                                <option value="maintenance">Технічне обслуговування</option>
                                                <option value="repair">Ремонт</option>
                                                <option value="installation">Встановлення</option>
                                                <option value="inspection">Перевірка</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label for="assignment-priority">Пріоритет</label>
                                            <select class="form-control" id="assignment-priority">
                                                <option value="normal">Звичайний</option>
                                                <option value="high">Високий</option>
                                                <option value="urgent">Терміновий</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label for="assignment-description">Опис проблеми</label>
                                    <textarea class="form-control" id="assignment-description" rows="4" 
                                              placeholder="Опишіть детально проблему або вимоги до роботи..."></textarea>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label for="client-name">Ім'я клієнта</label>
                                            <input type="text" class="form-control" id="client-name" 
                                                   placeholder="Повне ім'я клієнта">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label for="client-phone">Телефон</label>
                                            <input type="tel" class="form-control" id="client-phone" 
                                                   placeholder="+351 9XX XXX XXX">
                                        </div>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label for="assignment-location">Адреса</label>
                                    <textarea class="form-control" id="assignment-location" rows="2" 
                                              placeholder="Повна адреса об'єкта"></textarea>
                                </div>

                                <div class="form-group">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-save"></i> Створити заявку
                                    </button>
                                    <button type="button" class="btn btn-secondary ml-2" onclick="crmNav.loadModule('assignment-manager')">
                                        <i class="fas fa-times"></i> Скасувати
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupContainerEvents(containerId) {
        // Налаштування обробників подій для контейнера
        const container = document.getElementById(containerId);
        if (!container) return;

        // Фільтри
        const statusFilter = container.querySelector('#statusFilter');
        const searchFilter = container.querySelector('#searchFilter');

        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.applyFilters());
        }
        if (searchFilter) {
            searchFilter.addEventListener('input', () => this.applyFilters());
        }

        // Форма створення заявки
        const createForm = container.querySelector('#create-assignment-form');
        if (createForm) {
            createForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateAssignment();
            });
        }
    }

    /**
     * Методи для інтеграції з CRM системою
     */

    // Рендер модуля в контейнер CRM
    renderInContainer(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="assignment-manager-container">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2><i class="fas fa-tasks"></i> Управління заявками</h2>
                    <button class="btn btn-primary" onclick="assignmentManager.showCreateForm()">
                        <i class="fas fa-plus"></i> Нова заявка
                    </button>
                </div>
                
                <!-- Фільтри та пошук -->
                <div class="card mb-4">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-3">
                                <select class="form-control" id="status-filter">
                                    <option value="">Всі статуси</option>
                                    <option value="pending">Очікує</option>
                                    <option value="in-progress">Виконується</option>
                                    <option value="completed">Завершено</option>
                                    <option value="cancelled">Скасовано</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <select class="form-control" id="priority-filter">
                                    <option value="">Всі пріоритети</option>
                                    <option value="low">Низький</option>
                                    <option value="medium">Середній</option>
                                    <option value="high">Високий</option>
                                    <option value="urgent">Терміново</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <input type="text" class="form-control" id="search-input" placeholder="Пошук заявок...">
                            </div>
                            <div class="col-md-2">
                                <button class="btn btn-outline-secondary btn-block" onclick="assignmentManager.scanQRCode()">
                                    <i class="fas fa-qrcode"></i> QR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Список заявок -->
                <div id="assignments-list-container">
                    <div class="text-center">
                        <i class="fas fa-spinner fa-spin fa-2x"></i>
                        <p>Завантаження заявок...</p>
                    </div>
                </div>

                <!-- Модальні вікна -->
                <div id="assignment-modal-container"></div>
            </div>
        `;

        // Налаштування обробників подій для CRM
        this.setupCRMEventListeners();
        
        // Завантаження даних
        this.loadAssignments();
    }

    // Налаштування обробників подій для CRM
    setupCRMEventListeners() {
        // Фільтри
        const statusFilter = document.getElementById('status-filter');
        const priorityFilter = document.getElementById('priority-filter');
        const searchInput = document.getElementById('search-input');

        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        if (priorityFilter) {
            priorityFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.applyFilters();
                }, 300);
            });
        }
    }

    // Застосування фільтрів
    applyFilters() {
        const status = document.getElementById('status-filter')?.value || '';
        const priority = document.getElementById('priority-filter')?.value || '';
        const search = document.getElementById('search-input')?.value || '';

        let filteredAssignments = [...this.assignments];

        // Фільтр по статусу
        if (status) {
            filteredAssignments = filteredAssignments.filter(a => a.status === status);
        }

        // Фільтр по пріоритету
        if (priority) {
            filteredAssignments = filteredAssignments.filter(a => a.priority === priority);
        }

        // Пошук
        if (search) {
            const searchLower = search.toLowerCase();
            filteredAssignments = filteredAssignments.filter(a => 
                a.title?.toLowerCase().includes(searchLower) ||
                a.description?.toLowerCase().includes(searchLower) ||
                a.location?.toLowerCase().includes(searchLower)
            );
        }

        this.renderAssignmentsList(filteredAssignments);
    }

    // Отримання статистики для CRM дашборда
    getStats() {
        const stats = {
            total: this.assignments.length,
            pending: this.assignments.filter(a => a.status === 'pending').length,
            inProgress: this.assignments.filter(a => a.status === 'in-progress').length,
            completed: this.assignments.filter(a => a.status === 'completed').length,
            urgent: this.assignments.filter(a => a.priority === 'urgent').length,
            todayAssignments: this.assignments.filter(a => {
                const today = new Date().toDateString();
                return new Date(a.createdAt).toDateString() === today;
            }).length
        };

        return stats;
    }

    // Отримання останніх заявок для віджета
    getRecentAssignments(limit = 5) {
        return this.assignments
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);
    }

    // Компактний віджет для дашборда
    renderWidget(containerId, title = 'Останні заявки') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const recentAssignments = this.getRecentAssignments();

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h5 class="card-title mb-0">${title}</h5>
                </div>
                <div class="card-body p-0">
                    ${recentAssignments.length > 0 ? `
                        <div class="list-group list-group-flush">
                            ${recentAssignments.map(assignment => `
                                <div class="list-group-item list-group-item-action">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 class="mb-1">${assignment.title || 'Без назви'}</h6>
                                            <small class="text-muted">${assignment.location || 'Не вказано'}</small>
                                        </div>
                                        <span class="badge badge-${this.getStatusColor(assignment.status)}">
                                            ${this.getStatusText(assignment.status)}
                                        </span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="card-footer">
                            <a href="#" onclick="assignmentManager.renderInContainer('main-content')" class="btn btn-sm btn-outline-primary btn-block">
                                Переглянути всі
                            </a>
                        </div>
                    ` : `
                        <div class="text-center py-4">
                            <i class="fas fa-inbox fa-2x text-muted mb-2"></i>
                            <p class="text-muted mb-0">Заявки відсутні</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }
}

// Глобальна ініціалізація
let assignmentManager;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof assignmentManager === 'undefined') {
        assignmentManager = new AssignmentManager();
        window.assignmentManager = assignmentManager; // Глобальний доступ
    }
});

    // Експорт для використання в модулях
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = AssignmentManager;
    }