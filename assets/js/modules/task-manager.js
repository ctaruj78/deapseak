// task-manager.js - МЕНЕДЖЕР ЗАВДАНЬ ДЛЯ ТЕХНІКА
class TaskManager {
    constructor() {
        this.tasks = [];
        this.filters = {
            status: 'all',
            type: 'all',
            priority: 'all'
        };
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.init();
    }

    init() {
        this.loadTasks();
        this.setupEventListeners();
        this.updateStats();
    }

    async loadTasks() {
        try {
            // 🔥 ПІДКЛЮЧЕНО ДО РЕАЛЬНОГО API /api/requests
            const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('liftmanager_jwt');
            
            const apiUrl = window.location.hostname.includes('app.github.dev') 
                ? `https://${window.location.hostname.replace('5173-', '3000-')}/api/requests`
                : '/api/requests';
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                // API може повертати {data: [...]} або просто [...]
                this.tasks = Array.isArray(data) ? data : (data.data || data.requests || []);
                console.log('✅ Tarefa завантажені з API:', this.tasks.length);
                localStorage.setItem('tasks', JSON.stringify(this.tasks));
            } else {
                console.warn('⚠️ API /api/requests returned non-OK status:', response.status);
                throw new Error(`API status: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Erro завантаження завдань з API:', error);
            // Fallback: спроба завантажити з localStorage
            this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
            
            if (this.tasks.length === 0) {
                console.warn('⚠️ Використовуються демо-дані (API indisponível)');
                this.tasks = this.createSampleTasks();
                localStorage.setItem('tasks', JSON.stringify(this.tasks));
            }
        }

        this.applyFilters();
    }

    createSampleTasks() {
        return [
            {
                id: 'TASK-2024-001',
                type: 'repair',
                title: 'Reparação дверей ліфта',
                liftId: 'lift1',
                lift: 'Otis Gen2 - вул. Центральна, 12',
                priority: 'high',
                status: 'in-progress',
                createdDate: '2024-01-10T08:00:00',
                deadline: '2024-01-15T18:00:00',
                startedDate: '2024-01-12T09:30:00',
                category: 'mechanical',
                estimatedTime: 120,
                progress: 60,
                technician: 'Іван Петренко',
                description: 'Двері ліфта не закриваються повністю. Необхідно відрегулювати механізм та перевірити датчики.',
                checklist: [
                    { item: 'Перевірка механізму дверей', status: 'completed', notes: 'Механізм потребує регулювання' },
                    { item: 'Перевірка датчиків безпеки', status: 'in-progress', notes: 'Датчики працюють коректно' },
                    { item: 'Тестування роботи дверей', status: 'pending', notes: '' }
                ],
                materials: [
                    { name: 'Комплект регулювання', quantity: 1, used: true },
                    { name: 'Мастило', quantity: 1, used: false }
                ]
            },
            {
                id: 'TASK-2024-002',
                type: 'maintenance',
                title: 'Щомісячне обслуговування',
                liftId: 'lift2',
                lift: 'Schindler 3300 - пр. Перемоги, 45',
                priority: 'medium',
                status: 'pending',
                createdDate: '2024-01-15T10:00:00',
                deadline: '2024-01-20T17:00:00',
                category: 'cleaning',
                estimatedTime: 90,
                technician: 'Марія Коваленко',
                description: 'Планове щомісячне обслуговування: чистка, мащення, перевірка основних компонентів.'
            },
            {
                id: 'TASK-2024-003',
                type: 'emergency',
                title: 'Аварійна зупинка ліфта',
                liftId: 'lift3',
                lift: 'KONE MonoSpace - вул. Шевченка, 78',
                priority: 'high',
                status: 'urgent',
                createdDate: '2024-01-16T14:30:00',
                deadline: '2024-01-16T16:00:00',
                category: 'electrical',
                estimatedTime: 180,
                technician: 'Петро Сидоренко',
                description: 'Elevador parado entre andares. Необхідна негайна допомога!',
                emergency: true
            },
            {
                id: 'TASK-2024-004',
                type: 'inspection',
                title: 'Технічний огляд',
                liftId: 'lift1',
                lift: 'Otis Gen2 - вул. Центральна, 12',
                priority: 'medium',
                status: 'completed',
                createdDate: '2024-01-05T09:00:00',
                deadline: '2024-01-08T17:00:00',
                startedDate: '2024-01-06T10:00:00',
                completedDate: '2024-01-06T15:30:00',
                category: 'safety',
                estimatedTime: 240,
                actualTime: 210,
                progress: 100,
                technician: 'Іван Петренко',
                result: 'success',
                notes: 'Elevador у хорошому технічному стані. Todos системи працюють належним чином.'
            }
        ];
    }

    setupEventListeners() {
        $('#statusFilter').on('change', (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        });

        $('#typeFilter').on('change', (e) => {
            this.filters.type = e.target.value;
            this.applyFilters();
        });

        $('#priorityFilter').on('change', (e) => {
            this.filters.priority = e.target.value;
            this.applyFilters();
        });

        // Pesquisa
        $('#searchInput').on('input', (e) => {
            this.searchTasks(e.target.value);
        });
    }

    applyFilters() {
        let filteredTasks = [...this.tasks];

        // Filtroація за статусом
        if (this.filters.status !== 'all') {
            filteredTasks = filteredTasks.filter(task => 
                task.status === this.filters.status
            );
        }

        // Filtroація за типом
        if (this.filters.type !== 'all') {
            filteredTasks = filteredTasks.filter(task => 
                task.type === this.filters.type
            );
        }

        // Filtroація за пріоритетом
        if (this.filters.priority !== 'all') {
            filteredTasks = filteredTasks.filter(task => 
                task.priority === this.filters.priority
            );
        }

        this.renderTasks(filteredTasks);
        this.updateStats(filteredTasks);
        this.updatePagination(filteredTasks);
    }

    resetFilters() {
        $('#statusFilter').val('all');
        $('#typeFilter').val('all');
        $('#priorityFilter').val('all');
        $('#searchInput').val('');
        this.filters = { status: 'all', type: 'all', priority: 'all' };
        this.currentPage = 1;
        this.applyFilters();
    }

    searchTasks(query) {
        if (!query.trim()) {
            this.applyFilters();
            return;
        }

        const filteredTasks = this.tasks.filter(task =>
            task.title.toLowerCase().includes(query.toLowerCase()) ||
            task.id.toLowerCase().includes(query.toLowerCase()) ||
            task.lift.toLowerCase().includes(query.toLowerCase()) ||
            (task.description && task.description.toLowerCase().includes(query.toLowerCase())) ||
            (task.technician && task.technician.toLowerCase().includes(query.toLowerCase()))
        );

        this.renderTasks(filteredTasks);
        this.updateStats(filteredTasks);
    }

    renderTasks(tasks) {
        const tbody = $('#tasksTableBody');
        tbody.empty();

        if (tasks.length === 0) {
            tbody.html(`
                <tr>
                    <td colspan="8" class="text-center py-5">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <h4>Завдань не знайдено</h4>
                        <p>Спробуйте змінити параметри фільтрів</p>
                    </td>
                </tr>
            `);
            return;
        }

        // Пагінація
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const paginatedTasks = tasks.slice(startIndex, startIndex + this.itemsPerPage);

        paginatedTasks.forEach(task => {
            const row = this.createTaskRow(task);
            tbody.append(row);
        });
    }

    createTaskRow(task) {
        const statusClass = `status-${task.status}`;
        const priorityClass = `priority-${task.priority}`;
        const statusText = this.getStatusText(task.status);
        const typeText = this.getTypeText(task.type);
        const priorityText = this.getPriorityText(task.priority);
        const deadlineStatus = this.getDeadlineStatus(task);
        
        return $(`
            <tr>
                <td><strong>${task.id}</strong></td>
                <td>${this.formatDate(task.createdDate)}</td>
                <td>${typeText}</td>
                <td>${task.lift}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td><span class="priority-badge ${priorityClass}">${priorityText}</span></td>
                <td>${this.formatDeadline(task.deadline)} ${deadlineStatus}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-info btn-icon" onclick="taskManager.viewTask('${task.id}')" title="Перегляд">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary btn-icon" onclick="taskManager.downloadTaskReport('${task.id}')" title="Relatório">
                            <i class="fas fa-download"></i>
                        </button>
                        ${task.status === 'pending' || task.status === 'urgent' ? 
                            `<button class="btn btn-sm btn-success btn-icon" onclick="taskManager.startTask('${task.id}')" title="Розпочати">
                                <i class="fas fa-play"></i>
                            </button>` : ''}
                        ${task.status === 'in-progress' ? 
                            `<button class="btn btn-sm btn-warning btn-icon" onclick="taskManager.completeTask('${task.id}')" title="Concluir">
                                <i class="fas fa-check"></i>
                            </button>` : ''}
                    </div>
                </td>
            </tr>
        `);
    }

    getStatusText(status) {
        const statuses = {
            'pending': 'В очікуванні',
            'in-progress': 'Em progresso',
            'completed': 'Завершено',
            'cancelled': 'Скасовано',
            'urgent': 'Urgente'
        };
        return statuses[status] || status;
    }

    getTypeText(type) {
        const types = {
            'repair': 'Reparação',
            'maintenance': 'Manutenção',
            'inspection': 'Inspeção',
            'emergency': 'Аварійна'
        };
        return types[type] || type;
    }

    getPriorityText(priority) {
        const priorities = {
            'high': 'Altий',
            'medium': 'Agoедній',
            'low': 'Низький'
        };
        return priorities[priority] || priority;
    }

    getDeadlineStatus(task) {
        if (task.status === 'completed') return '';
        
        const now = new Date();
        const deadline = new Date(task.deadline);
        const timeDiff = deadline - now;
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        if (hoursDiff < 0) {
            return '<span class="text-danger"><i class="fas fa-exclamation-triangle"></i> Протерміновано</span>';
        } else if (hoursDiff < 24) {
            return '<span class="text-warning"><i class="fas fa-clock"></i> Скоро prazo</span>';
        }
        return '';
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('uk-UA');
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('uk-UA');
    }

    formatDeadline(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('uk-UA');
    }

    updateStats(tasks = this.tasks) {
        $('#totalTasks').text(tasks.length);
        $('#tasksBadge').text(tasks.filter(t => t.status === 'pending' || t.status === 'in-progress' || t.status === 'urgent').length);
        
        const pending = tasks.filter(t => t.status === 'pending').length;
        $('#pendingTasks').text(pending);

        const inProgress = tasks.filter(t => t.status === 'in-progress').length;
        $('#inProgressTasks').text(inProgress);

        const completed = tasks.filter(t => t.status === 'completed').length;
        $('#completedTasks').text(completed);
    }

    updatePagination(tasks) {
        const totalPages = Math.ceil(tasks.length / this.itemsPerPage);
        $('#currentPage').text(this.currentPage);
        $('#totalPages').text(totalPages || 1);
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.applyFilters();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.getFilteredTasks().length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.applyFilters();
        }
    }

    getFilteredTasks() {
        let filteredTasks = [...this.tasks];

        if (this.filters.status !== 'all') {
            filteredTasks = filteredTasks.filter(task => 
                task.status === this.filters.status
            );
        }

        if (this.filters.type !== 'all') {
            filteredTasks = filteredTasks.filter(task => 
                task.type === this.filters.type
            );
        }

        if (this.filters.priority !== 'all') {
            filteredTasks = filteredTasks.filter(task => 
                task.priority === this.filters.priority
            );
        }

        return filteredTasks;
    }

    startNewTask() {
        $('#newTaskForm')[0].reset();
        $('#taskDeadline').val(new Date().toISOString().slice(0, 16));
        $('#newTaskModal').modal('show');
    }

    createTask() {
        const formData = {
            type: $('#taskType').val(),
            liftId: $('#taskLift').val(),
            priority: $('#taskPriority').val(),
            deadline: $('#taskDeadline').val(),
            title: $('#taskTitle').val(),
            description: $('#taskDescription').val(),
            category: $('#taskCategory').val()
        };

        if (!formData.type || !formData.liftId || !formData.deadline || !formData.title) {
            this.showNotification('Por favor, заповніть обов\'язкові поля', 'error');
            return;
        }

        const newTask = {
            id: `TASK-${new Date().getFullYear()}-${String(this.tasks.length + 1).padStart(3, '0')}`,
            status: 'pending',
            createdDate: new Date().toISOString(),
            progress: 0,
            ...formData,
            technician: $('#techName').text()
        };

        this.tasks.unshift(newTask);
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
        
        $('#newTaskModal').modal('hide');
        this.applyFilters();
        
        this.showNotification('Tarefa com sucesso створено!', 'success');
    }

    viewTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        currentTaskId = taskId;
        const modalContent = this.createTaskDetails(task);
        $('#taskDetailsContent').html(modalContent);
        
        // Atualização видимості кнопок
        this.updateTaskButtons(task);
        
        $('#viewTaskModal').modal('show');
    }

    createTaskDetails(task) {
        const statusClass = `status-${task.status}`;
        const priorityClass = `priority-${task.priority}`;
        const statusText = this.getStatusText(task.status);
        const typeText = this.getTypeText(task.type);
        const priorityText = this.getPriorityText(task.priority);
        
        return `
            <div class="task-details">
                <div class="row mb-4">
                    <div class="col-md-8">
                        <h4>${task.id}</h4>
                        <h5>${task.title}</h5>
                    </div>
                    <div class="col-md-4 text-right">
                        <span class="priority-badge ${priorityClass}">${priorityText}</span>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>

                <div class="row mb-4">
                    <div class="col-md-6">
                        <div class="info-item">
                            <strong><i class="fas fa-elevator"></i> Elevador:</strong> ${task.lift}
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-tag"></i> Tipo:</strong> ${typeText}
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-calendar-plus"></i> Створено:</strong> ${this.formatDateTime(task.createdDate)}
                        </div>
                        ${task.category ? `
                            <div class="info-item">
                                <strong><i class="fas fa-folder"></i> Категорія:</strong> ${task.category}
                            </div>
                        ` : ''}
                    </div>
                    <div class="col-md-6">
                        <div class="info-item">
                            <strong><i class="fas fa-user-cog"></i> Técnico:</strong> ${task.technician || 'Não atribuído'}
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-hourglass-end"></i> Термін:</strong> ${this.formatDateTime(task.deadline)}
                            ${this.getDeadlineStatus(task)}
                        </div>
                        ${task.estimatedTime ? `
                            <div class="info-item">
                                <strong><i class="fas fa-clock"></i> Очікуваний час:</strong> ${task.estimatedTime} хв
                            </div>
                        ` : ''}
                        ${task.actualTime ? `
                            <div class="info-item">
                                <strong><i class="fas fa-stopwatch"></i> Фактичний час:</strong> ${task.actualTime} хв
                            </div>
                        ` : ''}
                    </div>
                </div>

                ${task.description ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-align-left"></i> Descrição завдання</h5>
                        </div>
                        <div class="card-body">
                            <p class="card-text">${task.description}</p>
                        </div>
                    </div>
                ` : ''}

                ${task.progress > 0 ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-chart-line"></i> Прогрес</h5>
                        </div>
                        <div class="card-body">
                            <div class="progress progress-sm">
                                <div class="progress-bar bg-success" style="width: ${task.progress}%"></div>
                            </div>
                            <small class="text-muted">${task.progress}% concluída</small>
                        </div>
                    </div>
                ` : ''}

                ${task.checklist && task.checklist.length > 0 ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-clipboard-list"></i> Чек-лист</h5>
                        </div>
                        <div class="card-body">
                            <div class="checklist">
                                ${task.checklist.map(item => `
                                    <div class="task-details ${item.status === 'completed' ? 'completed' : item.status === 'in-progress' ? 'bg-warning' : ''}">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <span>${item.item}</span>
                                            <span class="badge ${item.status === 'completed' ? 'badge-success' : item.status === 'in-progress' ? 'badge-warning' : 'badge-secondary'}">
                                                ${item.status === 'completed' ? 'Concluído' : item.status === 'in-progress' ? 'Em progresso' : 'В очікуванні'}
                                            </span>
                                        </div>
                                        ${item.notes ? `<p class="mb-0 mt-2"><small>${item.notes}</small></p>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                ` : ''}

                ${task.materials && task.materials.length > 0 ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-toolbox"></i> Матеріали</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Матеріал</th>
                                            <th>Кількість</th>
                                            <th>Використано</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${task.materials.map(material => `
                                            <tr>
                                                <td>${material.name}</td>
                                                <td>${material.quantity}</td>
                                                <td>${material.used ? '<span class="text-success"><i class="fas fa-check"></i> Sim</span>' : '<span class="text-muted"><i class="fas fa-times"></i> Não</span>'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ` : ''}

                ${task.notes ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-sticky-note"></i> Нотатки</h5>
                        </div>
                        <div class="card-body">
                            <p class="card-text">${task.notes}</p>
                        </div>
                    </div>
                ` : ''}

                ${task.result ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-check-circle"></i> Результат</h5>
                        </div>
                        <div class="card-body">
                            <div class="text-center">
                                <h2 class="${task.result === 'success' ? 'text-success' : 'text-danger'}">
                                    ${task.result === 'success' ? 'Успішно concluída' : 'Не вдалося завершити'}
                                </h2>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    updateTaskButtons(task) {
        if (task.status === 'pending' || task.status === 'urgent') {
            $('#startTaskBtn').show();
            $('#completeTaskBtn').hide();
        } else if (task.status === 'in-progress') {
            $('#startTaskBtn').hide();
            $('#completeTaskBtn').show();
        } else {
            $('#startTaskBtn').hide();
            $('#completeTaskBtn').hide();
        }
    }

    startTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        task.status = 'in-progress';
        task.startedDate = new Date().toISOString();
        
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
        this.applyFilters();
        
        this.showNotification('Tarefa розпочато!', 'success');
        this.viewTask(taskId);
    }

    completeTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        task.status = 'completed';
        task.completedDate = new Date().toISOString();
        task.progress = 100;
        
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
        this.applyFilters();
        
        this.showNotification('Tarefa concluída com sucesso!', 'success');
        this.viewTask(taskId);
    }

    downloadTaskReport(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.showNotification(`Підготовка звіту для завдання ${taskId}...`, 'info');
        
        // Імітація створення PDF
        setTimeout(() => {
            const reportContent = this.generateTaskReport(task);
            const blob = new Blob([reportContent], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `звіт_завдання_${taskId}.pdf`;
            link.click();
            
            this.showNotification('Relatório com sucesso завантажено', 'success');
        }, 1500);
    }

    generateTaskReport(task) {
        return `
            ЗВІТ ПРО ВИКОНАННЯ ЗАВДАННЯ #${task.id}
            ===================================
            
            Nome: ${task.title}
            Tipo: ${this.getTypeText(task.type)}
            Elevador: ${task.lift}
            Estado: ${this.getStatusText(task.status)}
            Prioridade: ${this.getPriorityText(task.priority)}
            
            Створено: ${this.formatDateTime(task.createdDate)}
            ${task.startedDate ? `Розпочато: ${this.formatDateTime(task.startedDate)}` : ''}
            ${task.completedDate ? `Завершено: ${this.formatDateTime(task.completedDate)}` : ''}
            Термін: ${this.formatDateTime(task.deadline)}
            
            ${task.description ? `Descrição: ${task.description}` : ''}
            
            ${task.estimatedTime ? `Очікуваний час: ${task.estimatedTime} хв` : ''}
            ${task.actualTime ? `Фактичний час: ${task.actualTime} хв` : ''}
            
            ${task.result ? `Результат: ${task.result === 'success' ? 'Успішно' : 'Не вдалося'}` : ''}
            
            ===================================
            Згенеровано: ${new Date().toLocaleString('uk-UA')}
        `;
    }

    syncTasks() {
        this.showNotification('Синхронізація завдань...', 'info');
        this.loadTasks();
    }

    exportTasks() {
        const filteredTasks = this.getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            this.showNotification('Немає завдань для експорту', 'warning');
            return;
        }

        this.showNotification('Підготовка експорту...', 'info');
        
        // Створення CSV
        const csvContent = this.convertToCSV(filteredTasks);
        this.downloadCSV(csvContent, `завдання_${new Date().toISOString().split('T')[0]}.csv`);
    }

    convertToCSV(tasks) {
        const headers = ['ID', 'Tipo', 'Elevador', 'Estado', 'Prioridade', 'Створено', 'Термін', 'Técnico'];
        const rows = tasks.map(task => [
            task.id,
            this.getTypeText(task.type),
            task.lift,
            this.getStatusText(task.status),
            this.getPriorityText(task.priority),
            this.formatDate(task.createdDate),
            this.formatDate(task.deadline),
            task.technician || 'Não atribuído'
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        this.showNotification('Exportar com sucesso concluída', 'success');
    }

    printTasks() {
        window.print();
    }

    showNotification(message, type = 'info') {
        if (typeof Swal !== 'undefined') {
            const Toast = Swal.mixin({
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
            const iconMap = { success: 'success', error: 'error', warning: 'warning', info: 'info' };
            Toast.fire({ icon: iconMap[type] || 'info', title: message });
        } else {
            alert(message);
        }
    }
}

// Ініціалізація
$(document).ready(function() {
    window.taskManager = new TaskManager();
});