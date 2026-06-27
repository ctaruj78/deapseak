// task-manager.js — Gestor de tarefas para técnicos
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
        this.loadTasks();
        this.setupEventListeners();
    }

    async loadTasks() {
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('liftmanager_jwt');
            const res = await fetch('/api/tasks', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error('API error');
            const data = await res.json();
            this.tasks = Array.isArray(data) ? data : (data.data || data.tasks || []);
            this.applyFilters();
            this.updateStats();
        } catch (e) {
            console.error('Erro ao carregar tarefas:', e);
            this.tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
            this.applyFilters();
            this.updateStats();
        }
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
        $('#searchInput').on('input', (e) => {
            this.searchTasks(e.target.value);
        });
    }

    applyFilters() {
        let filteredTasks = [...this.tasks];

        if (this.filters.status !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.status === this.filters.status);
        }
        if (this.filters.type !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.type === this.filters.type);
        }
        if (this.filters.priority !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.priority === this.filters.priority);
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
        const q = query.toLowerCase();
        const filteredTasks = this.tasks.filter(task =>
            (task.title || '').toLowerCase().includes(q) ||
            (task.id || '').toLowerCase().includes(q) ||
            (task.lift || '').toLowerCase().includes(q) ||
            (task.description || '').toLowerCase().includes(q) ||
            (task.technician || '').toLowerCase().includes(q)
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
                        <h4>Nenhuma tarefa encontrada</h4>
                        <p>Tente alterar os parâmetros dos filtros</p>
                    </td>
                </tr>
            `);
            return;
        }

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const paginated = tasks.slice(startIndex, startIndex + this.itemsPerPage);
        paginated.forEach(task => tbody.append(this.createTaskRow(task)));
    }

    createTaskRow(task) {
        const statusText = this.getStatusText(task.status);
        const typeText = this.getTypeText(task.type);
        const priorityText = this.getPriorityText(task.priority);
        const deadlineStatus = this.getDeadlineStatus(task);

        return $(`
            <tr>
                <td><strong>${task.id || task._id || ''}</strong></td>
                <td>${this.formatDate(task.createdDate || task.createdAt)}</td>
                <td>${typeText}</td>
                <td>${task.lift || ''}</td>
                <td><span class="status-badge status-${task.status}">${statusText}</span></td>
                <td><span class="priority-badge priority-${task.priority}">${priorityText}</span></td>
                <td>${this.formatDeadline(task.deadline)} ${deadlineStatus}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-info btn-icon" onclick="taskManager.viewTask('${task.id || task._id}')" title="Ver">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary btn-icon" onclick="taskManager.downloadTaskReport('${task.id || task._id}')" title="Relatório">
                            <i class="fas fa-download"></i>
                        </button>
                        ${task.status === 'pending' || task.status === 'urgent' ?
                            `<button class="btn btn-sm btn-success btn-icon" onclick="taskManager.startTask('${task.id || task._id}')" title="Iniciar">
                                <i class="fas fa-play"></i>
                            </button>` : ''}
                        ${task.status === 'in-progress' ?
                            `<button class="btn btn-sm btn-warning btn-icon" onclick="taskManager.completeTask('${task.id || task._id}')" title="Concluir">
                                <i class="fas fa-check"></i>
                            </button>` : ''}
                    </div>
                </td>
            </tr>
        `);
    }

    getStatusText(status) {
        const statuses = {
            'pending': 'Pendente',
            'in-progress': 'Em progresso',
            'completed': 'Concluído',
            'cancelled': 'Cancelado',
            'urgent': 'Urgente',
            'new': 'Novo',
            'assigned': 'Atribuído'
        };
        return statuses[status] || status;
    }

    getTypeText(type) {
        const types = {
            'repair': 'Reparação',
            'maintenance': 'Manutenção',
            'inspection': 'Inspeção',
            'emergency': 'Avaria'
        };
        return types[type] || type;
    }

    getPriorityText(priority) {
        const priorities = {
            'high': 'Alto',
            'medium': 'Médio',
            'low': 'Baixo'
        };
        return priorities[priority] || priority;
    }

    getDeadlineStatus(task) {
        if (task.status === 'completed') return '';
        const now = new Date();
        const deadline = new Date(task.deadline);
        const hoursDiff = (deadline - now) / (1000 * 60 * 60);
        if (hoursDiff < 0) return '<span class="text-danger"><i class="fas fa-exclamation-triangle"></i> Prazo excedido</span>';
        if (hoursDiff < 24) return '<span class="text-warning"><i class="fas fa-clock"></i> Prazo próximo</span>';
        return '';
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-PT');
    }

    formatDateTime(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('pt-PT');
    }

    formatDeadline(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-PT');
    }

    updateStats(tasks = this.tasks) {
        $('#totalTasks').text(tasks.length);
        $('#tasksBadge').text(tasks.filter(t => ['pending', 'in-progress', 'urgent', 'new', 'assigned'].includes(t.status)).length);
        $('#pendingTasks').text(tasks.filter(t => t.status === 'pending' || t.status === 'new').length);
        $('#inProgressTasks').text(tasks.filter(t => t.status === 'in-progress').length);
        $('#completedTasks').text(tasks.filter(t => t.status === 'completed').length);
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
        if (this.filters.status !== 'all') filteredTasks = filteredTasks.filter(t => t.status === this.filters.status);
        if (this.filters.type !== 'all') filteredTasks = filteredTasks.filter(t => t.type === this.filters.type);
        if (this.filters.priority !== 'all') filteredTasks = filteredTasks.filter(t => t.priority === this.filters.priority);
        return filteredTasks;
    }

    async startNewTask() {
        $('#newTaskForm')[0].reset();
        $('#taskDeadline').val(new Date().toISOString().slice(0, 16));
        await this.populateLiftDropdown('#taskLift');
        $('#newTaskModal').modal('show');
    }

    async populateLiftDropdown(selector) {
        const select = $(selector);
        select.html('<option value="">Selecione o elevador...</option>');
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('liftmanager_jwt');
            const res = await fetch('/api/lifts?limit=200', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) return;
            const data = await res.json();
            const lifts = Array.isArray(data) ? data : (data.data || data.lifts || []);
            lifts.forEach(lift => {
                const street = lift.address?.street || lift.location || '';
                const city = lift.address?.city || '';
                const label = `${lift.brand || ''} ${lift.model || ''} — ${street}${city ? ', ' + city : ''}`.trim();
                select.append(`<option value="${lift._id}">${label}</option>`);
            });
        } catch (e) {
            console.error('Erro ao carregar elevadores:', e);
        }
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
            this.showNotification('Por favor, preencha todos os campos obrigatórios', 'error');
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
        this.showNotification('Tarefa criada com sucesso!', 'success');
    }

    viewTask(taskId) {
        const task = this.tasks.find(t => (t.id || t._id) === taskId);
        if (!task) return;

        window.currentTaskId = taskId;
        $('#taskDetailsContent').html(this.createTaskDetails(task));
        this.updateTaskButtons(task);
        $('#viewTaskModal').modal('show');
    }

    createTaskDetails(task) {
        const statusText = this.getStatusText(task.status);
        const typeText = this.getTypeText(task.type);
        const priorityText = this.getPriorityText(task.priority);

        return `
            <div class="task-details">
                <div class="row mb-4">
                    <div class="col-md-8">
                        <h4>${task.id || task._id || ''}</h4>
                        <h5>${task.title || ''}</h5>
                    </div>
                    <div class="col-md-4 text-right">
                        <span class="priority-badge priority-${task.priority}">${priorityText}</span>
                        <span class="status-badge status-${task.status}">${statusText}</span>
                    </div>
                </div>
                <div class="row mb-4">
                    <div class="col-md-6">
                        <div class="info-item"><strong>Elevador:</strong> ${task.lift || ''}</div>
                        <div class="info-item"><strong>Tipo:</strong> ${typeText}</div>
                        <div class="info-item"><strong>Criado:</strong> ${this.formatDateTime(task.createdDate || task.createdAt)}</div>
                        ${task.category ? `<div class="info-item"><strong>Categoria:</strong> ${task.category}</div>` : ''}
                    </div>
                    <div class="col-md-6">
                        <div class="info-item"><strong>Técnico:</strong> ${task.technician || 'Não atribuído'}</div>
                        <div class="info-item"><strong>Prazo:</strong> ${this.formatDateTime(task.deadline)} ${this.getDeadlineStatus(task)}</div>
                        ${task.estimatedTime ? `<div class="info-item"><strong>Tempo estimado:</strong> ${task.estimatedTime} min</div>` : ''}
                        ${task.actualTime ? `<div class="info-item"><strong>Tempo real:</strong> ${task.actualTime} min</div>` : ''}
                    </div>
                </div>
                ${task.description ? `
                    <div class="card mb-4">
                        <div class="card-header"><h5 class="card-title"><i class="fas fa-align-left"></i> Descrição</h5></div>
                        <div class="card-body"><p class="card-text">${task.description}</p></div>
                    </div>
                ` : ''}
                ${task.progress > 0 ? `
                    <div class="card mb-4">
                        <div class="card-header"><h5 class="card-title"><i class="fas fa-chart-line"></i> Progresso</h5></div>
                        <div class="card-body">
                            <div class="progress progress-sm">
                                <div class="progress-bar bg-success" style="width: ${task.progress}%"></div>
                            </div>
                            <small class="text-muted">${task.progress}% concluído</small>
                        </div>
                    </div>
                ` : ''}
                ${task.notes ? `
                    <div class="card mb-4">
                        <div class="card-header"><h5 class="card-title"><i class="fas fa-sticky-note"></i> Notas</h5></div>
                        <div class="card-body"><p class="card-text">${task.notes}</p></div>
                    </div>
                ` : ''}
                ${task.result ? `
                    <div class="card mb-4">
                        <div class="card-header"><h5 class="card-title"><i class="fas fa-check-circle"></i> Resultado</h5></div>
                        <div class="card-body text-center">
                            <h2 class="${task.result === 'success' ? 'text-success' : 'text-danger'}">
                                ${task.result === 'success' ? 'Concluído com sucesso' : 'Não foi possível concluir'}
                            </h2>
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
        const task = this.tasks.find(t => (t.id || t._id) === taskId);
        if (!task) return;
        task.status = 'in-progress';
        task.startedDate = new Date().toISOString();
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
        this.applyFilters();
        this.showNotification('Tarefa iniciada!', 'success');
        this.viewTask(taskId);
    }

    completeTask(taskId) {
        const task = this.tasks.find(t => (t.id || t._id) === taskId);
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
        const task = this.tasks.find(t => (t.id || t._id) === taskId);
        if (!task) return;
        this.showNotification(`A preparar relatório da tarefa ${taskId}...`, 'info');
        setTimeout(() => {
            const blob = new Blob([this.generateTaskReport(task)], { type: 'text/plain' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `relatorio_tarefa_${taskId}.txt`;
            link.click();
            this.showNotification('Relatório descarregado com sucesso', 'success');
        }, 1500);
    }

    generateTaskReport(task) {
        return `
RELATÓRIO DE TAREFA #${task.id || task._id}
===========================================

Título: ${task.title || ''}
Tipo: ${this.getTypeText(task.type)}
Elevador: ${task.lift || ''}
Estado: ${this.getStatusText(task.status)}
Prioridade: ${this.getPriorityText(task.priority)}

Criado: ${this.formatDateTime(task.createdDate || task.createdAt)}
${task.startedDate ? `Iniciado: ${this.formatDateTime(task.startedDate)}` : ''}
${task.completedDate ? `Concluído: ${this.formatDateTime(task.completedDate)}` : ''}
Prazo: ${this.formatDateTime(task.deadline)}

${task.description ? `Descrição: ${task.description}` : ''}
${task.estimatedTime ? `Tempo estimado: ${task.estimatedTime} min` : ''}
${task.actualTime ? `Tempo real: ${task.actualTime} min` : ''}
${task.result ? `Resultado: ${task.result === 'success' ? 'Concluído com sucesso' : 'Não foi possível concluir'}` : ''}

===========================================
Gerado: ${new Date().toLocaleString('pt-PT')}
        `.trim();
    }

    syncTasks() {
        this.showNotification('A sincronizar tarefas...', 'info');
        this.loadTasks();
    }

    exportTasks() {
        const filteredTasks = this.getFilteredTasks();
        if (filteredTasks.length === 0) {
            this.showNotification('Não há tarefas para exportar', 'warning');
            return;
        }
        this.showNotification('A preparar exportação...', 'info');
        const csvContent = this.convertToCSV(filteredTasks);
        this.downloadCSV(csvContent, `tarefas_${new Date().toISOString().split('T')[0]}.csv`);
    }

    convertToCSV(tasks) {
        const headers = ['ID', 'Tipo', 'Elevador', 'Estado', 'Prioridade', 'Criado', 'Prazo', 'Técnico'];
        const rows = tasks.map(task => [
            task.id || task._id || '',
            this.getTypeText(task.type),
            task.lift || '',
            this.getStatusText(task.status),
            this.getPriorityText(task.priority),
            this.formatDate(task.createdDate || task.createdAt),
            this.formatDate(task.deadline),
            task.technician || 'Não atribuído'
        ]);
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        this.showNotification('Exportação concluída com sucesso', 'success');
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
            Toast.fire({ icon: type, title: message });
        } else if (typeof toastr !== 'undefined') {
            toastr[type] ? toastr[type](message) : toastr.info(message);
        }
    }
}

$(document).ready(function() {
    window.taskManager = new TaskManager();
});
