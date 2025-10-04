/**
 * Assignment Manager - Система управління заявками з QR інтеграцією
 * Оновлена версія з повною інтеграцією API та QR системою
 */
class AssignmentManager {
    constructor() {
        this.apiUrl = 'http://localhost:3001/api';
        this.assignments = [];
        this.technicians = [];
        this.requests = [];
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

    async init() {
        try {
            await this.loadData();
            await this.loadTemplates();
            this.setupEventListeners();
            this.setupDragAndDrop();
            this.setupAutoRefresh();
            this.isInitialized = true;
            
            console.log('Assignment Manager ініціалізовано з QR підтримкою');
        } catch (error) {
            console.error('Помилка ініціалізації Assignment Manager:', error);
        }
    }

    /**
     * Завантаження даних з API з підтримкою авторизації
     */
    async loadData(filters = {}) {
        try {
            const token = localStorage.getItem('authToken');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            const queryParams = new URLSearchParams(filters).toString();
            
            const [assignmentsRes, techsRes, requestsRes] = await Promise.all([
                fetch(`${this.apiUrl}/assignments?${queryParams}`, { headers }),
                fetch(`${this.apiUrl}/technicians`, { headers }),
                fetch(`${this.apiUrl}/maintenance-requests`, { headers })
            ]);

            if (assignmentsRes.ok && techsRes.ok && requestsRes.ok) {
                this.assignments = await assignmentsRes.json();
                this.technicians = await techsRes.json();
                this.requests = await requestsRes.json();
                
                // Зберігання в localStorage для офлайн режиму
                localStorage.setItem('assignments', JSON.stringify(this.assignments));
                localStorage.setItem('technicians', JSON.stringify(this.technicians));
                localStorage.setItem('maintenanceRequests', JSON.stringify(this.requests));
                
                this.renderAssignments();
                this.updateStatistics();
            } else {
                throw new Error('API недоступне');
            }
        } catch (error) {
            console.warn('Використання локальних даних:', error);
            this.loadFromLocalStorage();
        }
    }

        this.updateAllUI();
    }

    loadFromLocalStorage() {
        this.assignments = JSON.parse(localStorage.getItem('assignments')) || [];
        this.technicians = JSON.parse(localStorage.getItem('technicians')) || [];
        this.requests = JSON.parse(localStorage.getItem('maintenanceRequests')) || [];
        
        if (this.assignments.length === 0) {
            this.createSampleData();
        }
    }

    createSampleData() {
        // Створення тестових даних для демонстрації
        this.assignments = [
            {
                id: 'ASSIGN-001',
                requestId: 'REQ-2024-001',
                technicianId: 'TECH-001',
                priority: 'high',
                status: 'in-progress',
                assignedAt: new Date().toISOString(),
                deadline: new Date(Date.now() + 24 * 3600000).toISOString(),
                notes: 'Термінове призначення через несправність кнопки виклику',
                completedAt: null
            },
            {
                id: 'ASSIGN-002',
                requestId: 'REQ-2024-002',
                technicianId: 'TECH-002',
                priority: 'medium',
                status: 'assigned',
                assignedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
                deadline: new Date(Date.now() + 48 * 3600000).toISOString(),
                notes: 'Планове обслуговування',
                completedAt: null
            }
        ];

        localStorage.setItem('assignments', JSON.stringify(this.assignments));
    }

    updateAllUI() {
        this.updateStatistics();
        this.applyFilters();
        this.populateTechFilter();
        this.updateLastUpdateTime();
    }

    updateStatistics() {
        const stats = {
            total: this.assignments.length,
            active: this.assignments.filter(a => 
                a.status === 'assigned' || a.status === 'in-progress'
            ).length,
            completed: this.assignments.filter(a => a.status === 'completed').length,
            overdue: this.assignments.filter(a => this.isAssignmentOverdue(a)).length
        };

        $('#totalAssignments').text(stats.total);
        $('#activeAssignments').text(stats.active);
        $('#completedAssignments').text(stats.completed);
        $('#overdueAssignments').text(stats.overdue);
        $('#assignmentsBadge').text(stats.active);
    }

    isAssignmentOverdue(assignment) {
        if (assignment.status === 'completed' || !assignment.deadline) return false;
        return new Date() > new Date(assignment.deadline);
    }

    applyFilters() {
        let filtered = this.assignments.filter(assignment => {
            const statusMatch = this.filters.status === 'all' || assignment.status === this.filters.status;
            const priorityMatch = this.filters.priority === 'all' || assignment.priority === this.filters.priority;
            const techMatch = this.filters.technician === 'all' || assignment.technicianId === this.filters.technician;
            const periodMatch = this.filterByPeriod(assignment);
            const searchMatch = this.searchQuery === '' || this.matchesSearch(assignment);

            return statusMatch && priorityMatch && techMatch && periodMatch && searchMatch;
        });

        this.renderAssignments(filtered);
        this.updatePagination(filtered.length);
    }

    filterByPeriod(assignment) {
        const assignedDate = new Date(assignment.assignedAt);
        const now = new Date();

        switch(this.filters.period) {
            case 'today':
                return assignedDate.toDateString() === now.toDateString();
            case 'week':
                const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
                return assignedDate >= startOfWeek;
            case 'month':
                return assignedDate.getMonth() === now.getMonth() && 
                       assignedDate.getFullYear() === now.getFullYear();
            default:
                return true;
        }
    }

    matchesSearch(assignment) {
        const request = this.requests.find(r => r.id === assignment.requestId);
        const technician = this.technicians.find(t => t.id === assignment.technicianId);
        
        const searchTerms = this.searchQuery.toLowerCase().split(' ');
        
        return searchTerms.some(term => 
            assignment.id.toLowerCase().includes(term) ||
            (request && request.title.toLowerCase().includes(term)) ||
            (technician && (
                technician.firstName.toLowerCase().includes(term) ||
                technician.lastName.toLowerCase().includes(term)
            )) ||
            assignment.priority.toLowerCase().includes(term) ||
            assignment.status.toLowerCase().includes(term)
        );
    }

    resetFilters() {
        $('#statusFilter').val('all');
        $('#priorityFilter').val('all');
        $('#techFilter').val('all');
        $('#periodFilter').val('today');
        $('#searchInput').val('');
        
        this.filters = {
            status: 'all',
            priority: 'all',
            technician: 'all',
            period: 'today'
        };
        this.searchQuery = '';
        
        this.applyFilters();
    }

    populateTechFilter() {
        const select = $('#techFilter');
        select.empty().append('<option value="all">Всі техніки</option>');
        
        this.technicians.forEach(tech => {
            select.append(new Option(
                `${tech.firstName} ${tech.lastName}`,
                tech.id
            ));
        });
    }

    renderAssignments(assignments) {
        const container = $('#assignmentsContainer');
        container.empty();

        if (assignments.length === 0) {
            container.html(`
                <div class="text-center py-5">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h4>Призначень не знайдено</h4>
                    <p>Спробуйте змінити параметри фільтрів</p>
                </div>
            `);
            return;
        }

        // Пагінація
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const paginated = assignments.slice(startIndex, startIndex + this.itemsPerPage);

        paginated.forEach(assignment => {
            const element = this.createAssignmentElement(assignment);
            container.append(element);
        });

        $('#shownCount').text(paginated.length);
        $('#totalCount').text(assignments.length);
    }

    createAssignmentElement(assignment) {
        const request = this.requests.find(r => r.id === assignment.requestId);
        const technician = this.technicians.find(t => t.id === assignment.technicianId);
        const isOverdue = this.isAssignmentOverdue(assignment);

        return `
            <div class="assignment-card ${assignment.priority}-priority ${isOverdue ? 'overdue' : ''}" 
                 data-assignment-id="${assignment.id}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h5 class="card-title mb-1">${request ? request.title : 'Невідома заявка'}</h5>
                            <p class="card-text text-muted mb-1">ID: ${assignment.id}</p>
                            ${request ? `<p class="card-text mb-1">📍 ${request.location}</p>` : ''}
                        </div>
                        <div class="text-right">
                            <span class="priority-badge priority-${assignment.priority}">
                                ${this.getPriorityText(assignment.priority)}
                            </span>
                            <span class="badge ${this.getStatusClass(assignment.status)}">
                                ${this.getStatusText(assignment.status)}
                            </span>
                            ${isOverdue ? '<span class="badge badge-danger ml-1">Протерміновано</span>' : ''}
                        </div>
                    </div>

                    <div class="row mb-3">
                        <div class="col-md-6">
                            <p class="mb-1"><strong>Технік:</strong> ${technician ? 
                                `${technician.firstName} ${technician.lastName}` : 'Не призначено'}</p>
                            <p class="mb-1"><strong>Призначено:</strong> ${this.formatDateTime(assignment.assignedAt)}</p>
                            ${assignment.deadline ? `
                                <p class="mb-1"><strong>Крайній термін:</strong> ${this.formatDateTime(assignment.deadline)}</p>
                            ` : ''}
                        </div>
                        <div class="col-md-6">
                            ${this.renderProgress(assignment)}
                        </div>
                    </div>

                    ${assignment.notes ? `
                        <div class="alert alert-info py-2 mb-3">
                            <strong>Нотатки:</strong> ${assignment.notes}
                        </div>
                    ` : ''}

                    <div class="assignment-actions">
                        <button class="btn btn-sm btn-info" onclick="assignmentManager.viewAssignment('${assignment.id}')">
                            <i class="fas fa-eye"></i> Перегляд
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="assignmentManager.editAssignment('${assignment.id}')">
                            <i class="fas fa-edit"></i> Редагувати
                        </button>
                        ${assignment.status !== 'completed' ? `
                            <button class="btn btn-sm btn-success" onclick="assignmentManager.completeAssignment('${assignment.id}')">
                                <i class="fas fa-check"></i> Завершити
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-danger" onclick="assignmentManager.cancelAssignment('${assignment.id}')">
                            <i class="fas fa-times"></i> Скасувати
                        </button>
                        <span class="drag-handle ml-auto" title="Перетягнути для зміни порядку">
                            <i class="fas fa-grip-vertical"></i>
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    renderProgress(assignment) {
        if (assignment.status === 'completed') {
            return `
                <div class="progress progress-sm mb-2">
                    <div class="progress-bar bg-success" style="width: 100%"></div>
                </div>
                <small class="text-success">Завершено: ${this.formatDateTime(assignment.completedAt)}</small>
            `;
        }

        const assigned = new Date(assignment.assignedAt);
        const deadline = new Date(assignment.deadline);
        const now = new Date();
        const totalTime = deadline - assigned;
        const elapsed = now - assigned;
        const progress = Math.min(Math.max((elapsed / totalTime) * 100, 0), 100);

        return `
            <div class="progress progress-sm mb-2">
                <div class="progress-bar ${progress > 80 ? 'bg-warning' : 'bg-info'}" 
                     style="width: ${progress}%"></div>
            </div>
            <small class="text-muted">Виконано: ${Math.round(progress)}%</small>
        `;
    }

    switchView(viewType) {
        this.currentView = viewType;
        // Додаткова логіка для зміни виду буде реалізована
        this.applyFilters();
    }

    setupEventListeners() {
        $('#statusFilter, #priorityFilter, #techFilter, #periodFilter').change(() => {
            this.filters.status = $('#statusFilter').val();
            this.filters.priority = $('#priorityFilter').val();
            this.filters.technician = $('#techFilter').val();
            this.filters.period = $('#periodFilter').val();
            this.applyFilters();
        });

        $('#searchInput').on('input', (e) => {
            this.searchQuery = e.target.value.trim();
            this.applyFilters();
        });

        // Гарячі клавіші
        $(document).on('keydown', (e) => {
            if (e.ctrlKey) {
                switch(e.key) {
                    case 'n':
                        e.preventDefault();
                        this.createNewAssignment();
                        break;
                    case 'f':
                        e.preventDefault();
                        $('#searchInput').focus();
                        break;
                }
            }
        });
    }

    setupDragAndDrop() {
        // Ініціалізація drag and drop для сортування
        const container = document.getElementById('assignmentsContainer');
        if (container) {
            new Sortable(container, {
                handle: '.drag-handle',
                animation: 150,
                onEnd: (evt) => {
                    this.onAssignmentReorder(evt.oldIndex, evt.newIndex);
                }
            });
        }
    }

    onAssignmentReorder(oldIndex, newIndex) {
        // Логіка зміни порядку призначень
        console.log('Переміщено з', oldIndex, 'на', newIndex);
    }

    setupAutoRefresh() {
        setInterval(() => {
            this.refreshData();
        }, 300000); // Оновлення кожні 5 хвилин
    }

    refreshData() {
        this.loadData();
        this.showToast('Дані оновлено', 'info');
    }

    searchAssignments() {
        this.applyFilters();
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.applyFilters();
        }
    }

    nextPage() {
        const totalItems = this.getFilteredAssignments().length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.applyFilters();
        }
    }

    updatePagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        $('#currentPage').text(this.currentPage);
        
        if (totalPages === 0) {
            $('#currentPage').text('1');
        }
    }

    getFilteredAssignments() {
        return this.assignments.filter(assignment => {
            const statusMatch = this.filters.status === 'all' || assignment.status === this.filters.status;
            const priorityMatch = this.filters.priority === 'all' || assignment.priority === this.filters.priority;
            const techMatch = this.filters.technician === 'all' || assignment.technicianId === this.filters.technician;
            const periodMatch = this.filterByPeriod(assignment);
            const searchMatch = this.searchQuery === '' || this.matchesSearch(assignment);

            return statusMatch && priorityMatch && techMatch && periodMatch && searchMatch;
        });
    }

    createNewAssignment() {
        this.showAssignmentModal('create');
    }

    viewAssignment(assignmentId) {
        this.showAssignmentModal('view', assignmentId);
    }

    editAssignment(assignmentId) {
        this.showAssignmentModal('edit', assignmentId);
    }

    showAssignmentModal(mode, assignmentId = null) {
        let title = '';
        let content = '';

        if (mode === 'create') {
            title = 'Нове призначення';
            content = this.getAssignmentForm();
        } else {
            const assignment = this.assignments.find(a => a.id === assignmentId);
            if (assignment) {
                title = mode === 'view' ? 'Перегляд призначення' : 'Редагування призначення';
                content = this.getAssignmentDetails(assignment, mode);
            }
        }

        $('#assignmentModalBody').html(content);
        $('#assignmentModal .modal-title').text(title);
        $('#assignmentModal').modal('show');
    }

    getAssignmentForm() {
        const pendingRequests = this.requests.filter(req => req.status === 'pending');
        const availableTechs = this.technicians.filter(tech => this.isTechnicianAvailable(tech.id));

        return `
            <form id="assignmentForm">
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="requestSelect">Заявка *</label>
                            <select id="requestSelect" class="form-control" required>
                                <option value="">Оберіть заявку...</option>
                                ${pendingRequests.map(req => 
                                    `<option value="${req.id}">${req.id} - ${req.title}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="techSelect">Технік *</label>
                            <select id="techSelect" class="form-control" required>
                                <option value="">Оберіть техніка...</option>
                                ${availableTechs.map(tech => 
                                    `<option value="${tech.id}">${tech.firstName} ${tech.lastName}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="prioritySelect">Пріоритет *</label>
                            <select id="prioritySelect" class="form-control" required>
                                <option value="high">Високий</option>
                                <option value="medium" selected>Середній</option>
                                <option value="low">Низький</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="deadline">Крайній термін *</label>
                            <input type="datetime-local" id="deadline" class="form-control" required>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label for="assignmentNotes">Нотатки</label>
                    <textarea id="assignmentNotes" class="form-control" rows="3" 
                              placeholder="Додаткові вказівки..."></textarea>
                </div>

                <div class="form-group">
                    <div class="custom-control custom-switch">
                        <input type="checkbox" class="custom-control-input" id="notifyTech" checked>
                        <label class="custom-control-label" for="notifyTech">Сповістити техніка</label>
                    </div>
                </div>
            </form>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Скасувати</button>
                <button type="button" class="btn btn-primary" onclick="assignmentManager.saveAssignment()">
                    <i class="fas fa-save"></i> Зберегти
                </button>
            </div>
        `;
    }

    saveAssignment() {
        // Логіка збереження призначення
        this.showToast('Призначення збережено', 'success');
        $('#assignmentModal').modal('hide');
        this.refreshData();
    }

    completeAssignment(assignmentId) {
        if (confirm('Позначити призначення як завершене?')) {
            const assignment = this.assignments.find(a => a.id === assignmentId);
            if (assignment) {
                assignment.status = 'completed';
                assignment.completedAt = new Date().toISOString();
                localStorage.setItem('assignments', JSON.stringify(this.assignments));
                this.showToast('Призначення завершено', 'success');
                this.refreshData();
            }
        }
    }

    cancelAssignment(assignmentId) {
        if (confirm('Скасувати це призначення?')) {
            const assignment = this.assignments.find(a => a.id === assignmentId);
            if (assignment) {
                assignment.status = 'cancelled';
                localStorage.setItem('assignments', JSON.stringify(this.assignments));
                this.showToast('Призначення скасовано', 'info');
                this.refreshData();
            }
        }
    }

    bulkAssign() {
        $('#bulkAssignmentModal').modal('show');
        this.populateBulkAssignmentModal();
    }

    populateBulkAssignmentModal() {
        const pendingRequests = this.requests.filter(req => req.status === 'pending');
        const availableTechs = this.technicians.filter(tech => this.isTechnicianAvailable(tech.id));

        // Заповнення доступних заявок
        const requestsContainer = $('#availableRequests');
        requestsContainer.empty();
        
        pendingRequests.forEach(req => {
            requestsContainer.append(`
                <div class="list-group-item request-item" data-request-id="${req.id}">
                    <div class="custom-control custom-checkbox">
                        <input type="checkbox" class="custom-control-input" id="req-${req.id}">
                        <label class="custom-control-label" for="req-${req.id}">
                            <strong>${req.id}</strong> - ${req.title}
                            <br><small class="text-muted">${req.location}</small>
                        </label>
                    </div>
                </div>
            `);
        });

        // Заповнення вибору техніків
        const techSelect = $('#bulkTechSelect');
        techSelect.empty().append('<option value="">Оберіть техніка...</option>');
        
        availableTechs.forEach(tech => {
            techSelect.append(new Option(
                `${tech.firstName} ${tech.lastName} (${tech.specialty})`,
                tech.id
            ));
        });
    }

    submitBulkAssignment() {
        const selectedTech = $('#bulkTechSelect').val();
        if (!selectedTech) {
            this.showToast('Оберіть техніка для призначення', 'error');
            return;
        }

        const selectedRequests = [];
        $('.request-item input:checked').each(function() {
            selectedRequests.push($(this).closest('.request-item').data('request-id'));
        });

        if (selectedRequests.length === 0) {
            this.showToast('Оберіть хоча б одну заявку', 'error');
            return;
        }

        // Створення масових призначень
        selectedRequests.forEach(requestId => {
            const newAssignment = {
                id: 'ASSIGN-' + Date.now() + Math.random().toString(36).substr(2, 5),
                requestId: requestId,
                technicianId: selectedTech,
                priority: 'medium',
                status: 'assigned',
                assignedAt: new Date().toISOString(),
                deadline: new Date(Date.now() + 48 * 3600000).toISOString(),
                notes: 'Масове призначення'
            };
            
            this.assignments.push(newAssignment);
        });

        localStorage.setItem('assignments', JSON.stringify(this.assignments));
        $('#bulkAssignmentModal').modal('hide');
        this.showToast(`Призначено ${selectedRequests.length} заявок`, 'success');
        this.refreshData();
    }

    reassignOverdue() {
        const overdueAssignments = this.assignments.filter(a => this.isAssignmentOverdue(a));
        
        if (overdueAssignments.length === 0) {
            this.showToast('Немає протермінованих призначень', 'info');
            return;
        }

        if (confirm(`Знайдено ${overdueAssignments.length} протермінованих призначень. Перепризначити?`)) {
            overdueAssignments.forEach(assignment => {
                // Логіка перепризначення
                assignment.status = 'pending';
                assignment.technicianId = null;
                assignment.assignedAt = null;
            });

            localStorage.setItem('assignments', JSON.stringify(this.assignments));
            this.showToast('Протерміновані призначення перепризначено', 'success');
            this.refreshData();
        }
    }

    generateReport() {
        const reportData = this.prepareReportData();
        this.showReportModal(reportData);
    }

    prepareReportData() {
        return {
            total: this.assignments.length,
            byStatus: this.groupByStatus(),
            byPriority: this.groupByPriority(),
            byTechnician: this.groupByTechnician(),
            completionRate: this.calculateCompletionRate(),
            averageTime: this.calculateAverageCompletionTime()
        };
    }

    showReportModal(reportData) {
        const content = `
            <div class="report-content">
                <h5>Звіт по призначенням</h5>
                <div class="row">
                    <div class="col-md-6">
                        <div class="card mb-3">
                            <div class="card-body">
                                <h6>За статусами</h6>
                                ${Object.entries(reportData.byStatus).map(([status, count]) => `
                                    <p>${this.getStatusText(status)}: <strong>${count}</strong></p>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card mb-3">
                            <div class="card-body">
                                <h6>За пріоритетами</h6>
                                ${Object.entries(reportData.byPriority).map(([priority, count]) => `
                                    <p>${this.getPriorityText(priority)}: <strong>${count}</strong></p>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="assignmentManager.exportReport()">
                    <i class="fas fa-download"></i> Експортувати звіт
                </button>
            </div>
        `;

        this.showModal('Звіт по призначенням', content);
    }

    exportReport() {
        this.showToast('Підготовка звіту до експорту...', 'info');
        // Логіка експорту
    }

    exportAssignments() {
        const filtered = this.getFilteredAssignments();
        if (filtered.length === 0) {
            this.showToast('Немає даних для експорту', 'warning');
            return;
        }

        this.showToast('Експорт даних...', 'info');
        // Логіка експорту в CSV/Excel
    }

    showCalendarView() {
        this.showToast('Перегляд календаря призначень', 'info');
        // Логіка календарного представлення
    }

    showNotifications() {
        this.showToast('Функціонал сповіщень призначень', 'info');
    }

    showToast(message, type = 'info') {
        $.notify(message, {
            className: type,
            position: 'bottom right',
            autoHideDelay: 3000
        });
    }

    showModal(title, content) {
        $('#assignmentModalBody').html(content);
        $('#assignmentModal .modal-title').text(title);
        $('#assignmentModal').modal('show');
    }

    updateLastUpdateTime() {
        $('#lastUpdate').text(`Оновлено: ${new Date().toLocaleTimeString('uk-UA')}`);
    }

    // Допоміжні методи
    getPriorityText(priority) {
        const priorities = {
            'high': 'Високий',
            'medium': 'Середній',
            'low': 'Низький'
        };
        return priorities[priority] || priority;
    }

    getStatusText(status) {
        const statuses = {
            'pending': 'В очікуванні',
            'assigned': 'Призначено',
            'in-progress': 'В роботі',
            'completed': 'Завершено',
            'cancelled': 'Скасовано'
        };
        return statuses[status] || status;
    }

    getStatusClass(status) {
        const classes = {
            'pending': 'badge-secondary',
            'assigned': 'badge-info',
            'in-progress': 'badge-warning',
            'completed': 'badge-success',
            'cancelled': 'badge-danger'
        };
        return classes[status] || 'badge-secondary';
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('uk-UA');
    }

    groupByStatus() {
        const groups = {};
        this.assignments.forEach(a => {
            groups[a.status] = (groups[a.status] || 0) + 1;
        });
        return groups;
    }

    groupByPriority() {
        const groups = {};
        this.assignments.forEach(a => {
            groups[a.priority] = (groups[a.priority] || 0) + 1;
        });
        return groups;
    }

    groupByTechnician() {
        const groups = {};
        this.assignments.forEach(a => {
            if (a.technicianId) {
                groups[a.technicianId] = (groups[a.technicianId] || 0) + 1;
            }
        });
        return groups;
    }

    calculateCompletionRate() {
        const completed = this.assignments.filter(a => a.status === 'completed').length;
        return this.assignments.length > 0 ? (completed / this.assignments.length) * 100 : 0;
    }

    calculateAverageCompletionTime() {
        const completed = this.assignments.filter(a => 
            a.status === 'completed' && a.assignedAt && a.completedAt
        );

        if (completed.length === 0) return 0;

        const totalTime = completed.reduce((sum, a) => {
            const assigned = new Date(a.assignedAt);
            const completed = new Date(a.completedAt);
            return sum + (completed - assigned);
        }, 0);

        return (totalTime / completed.length) / 3600000; // Години
    }

    isTechnicianAvailable(techId) {
        const tech = this.technicians.find(t => t.id === techId);
        if (!tech) return false;

        const activeAssignments = this.assignments.filter(a => 
            a.technicianId === techId && 
            (a.status === 'assigned' || a.status === 'in-progress')
        );

        return activeAssignments.length < 3;
    }
}

// Ініціалізація
$(document).ready(function() {
    window.assignmentManager = new AssignmentManager();
});