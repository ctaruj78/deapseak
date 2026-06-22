// requests-manager.js - РОЗШИРЕНА ВЕРСІЯ ДЛЯ ADMINLTE
class RequestsManager {
    constructor() {
        this.requests = [];
        this.filters = {
            status: 'all',
            priority: 'all',
            lift: 'all'
        };
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.init();
    }

    init() {
        this.loadRequests();
        this.setupEventListeners();
        this.updateStats();
    }

    async loadRequests() {
        try {
            const token = sessionStorage.getItem('liftmanager_jwt')
                || localStorage.getItem('liftmanager_jwt')
                || localStorage.getItem('authToken')
                || localStorage.getItem('token')
                || '';

            const response = await fetch('/api/requests?limit=500', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (!response.ok) throw new Error(`API indisponível (${response.status})`);

            const payload = await response.json();
            this.requests = Array.isArray(payload)
                ? payload
                : (payload.requests || payload.data || []);

            // keep a local cache only as a non-authoritative offline fallback
            localStorage.setItem('maintenanceRequests', JSON.stringify(this.requests));
        } catch (error) {
            console.warn('Falha a carregar pedidos reais:', error.message);
            this.requests = JSON.parse(localStorage.getItem('maintenanceRequests')) || [];
        }

        this.applyFilters();
    }

    setupEventListeners() {
        $('#statusFilter').on('change', (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        });

        $('#priorityFilter').on('change', (e) => {
            this.filters.priority = e.target.value;
            this.applyFilters();
        });

        $('#liftFilter').on('change', (e) => {
            this.filters.lift = e.target.value;
            this.applyFilters();
        });

        $('#searchInput').on('input', (e) => {
            this.searchRequests(e.target.value);
        });

        // Обробка завантаження фото
        $('#requestPhotos').on('change', (e) => {
            this.handlePhotoUpload(e.target.files);
        });

        // Автоматичне оновлення заголовку при зміні типу
        $('#requestType').on('change', (e) => {
            this.updateRequestTitle(e.target.value);
        });
    }

    updateRequestTitle(type) {
        const titles = {
            'maintenance': 'Manutenção técnica',
            'repair': 'Reparação do elevador',
            'inspection': 'Inspeção técnica',
            'consultation': 'Consultoria',
            'emergency': 'Situação de emergência'
        };
        
        if (titles[type]) {
            $('#requestTitle').val(titles[type]);
        }
    }

    applyFilters() {
        let filteredRequests = [...this.requests];

        // Filtroація за статусом
        if (this.filters.status !== 'all') {
            filteredRequests = filteredRequests.filter(request => 
                request.status === this.filters.status
            );
        }

        // Filtroація за пріоритетом
        if (this.filters.priority !== 'all') {
            filteredRequests = filteredRequests.filter(request => 
                request.priority === this.filters.priority
            );
        }

        // Filtroація за ліфтом
        if (this.filters.lift !== 'all') {
            filteredRequests = filteredRequests.filter(request => 
                request.liftId === this.filters.lift
            );
        }

        this.renderRequests(filteredRequests);
        this.updateStats(filteredRequests);
        this.updatePagination(filteredRequests);
    }

    resetFilters() {
        $('#statusFilter').val('all');
        $('#priorityFilter').val('all');
        $('#liftFilter').val('all');
        $('#searchInput').val('');
        this.filters = { status: 'all', priority: 'all', lift: 'all' };
        this.currentPage = 1;
        this.applyFilters();
    }

    searchRequests(query) {
        if (!query.trim()) {
            this.applyFilters();
            return;
        }

        const filteredRequests = this.requests.filter(request =>
            request.title.toLowerCase().includes(query.toLowerCase()) ||
            request.description.toLowerCase().includes(query.toLowerCase()) ||
            request.id.toLowerCase().includes(query.toLowerCase()) ||
            (request.technician && request.technician.toLowerCase().includes(query.toLowerCase()))
        );

        this.renderRequests(filteredRequests);
        this.updateStats(filteredRequests);
    }

    renderRequests(requests) {
        const tbody = $('#requestsTableBody');
        tbody.empty();

        if (requests.length === 0) {
            tbody.html(`
                <tr>
                    <td colspan="8" class="text-center py-5">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <h4>Nenhum pedido encontrado</h4>
                        <p>Tente alterar os filtros</p>
                    </td>
                </tr>
            `);
            return;
        }

        // Пагінація
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const paginatedRequests = requests.slice(startIndex, startIndex + this.itemsPerPage);

        paginatedRequests.forEach(request => {
            const row = this.createRequestRow(request);
            tbody.append(row);
        });
    }

    createRequestRow(request) {
        const priorityClass = `priority-${request.priority}`;
        const statusClass = `status-${request.status}`;
        const priorityText = this.getPriorityText(request.priority);
        const statusText = this.getStatusText(request.status);
        const liftName = this.getLiftName(request.liftId);
        
        return $(`
            <tr>
                <td><strong>#${request.id}</strong></td>
                <td>${this.formatDate(request.createdAt)}</td>
                <td>${liftName}</td>
                <td>
                    <div><strong>${request.title}</strong></div>
                    <small class="text-muted">${request.description.substring(0, 50)}...</small>
                </td>
                <td><span class="priority-badge ${priorityClass}">${priorityText}</span></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${request.technician || 'Não atribuído'}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-info btn-icon" onclick="requestsManager.viewRequest('${request.id}')" title="Ver">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary btn-icon" onclick="requestsManager.downloadReport('${request.id}')" title="Relatório">
                            <i class="fas fa-download"></i>
                        </button>
                        ${request.status === 'in-progress' && request.assignedTo ? 
                            `<button class="btn btn-sm btn-success btn-icon" onclick="requestsManager.chatWithTech('${request.id}')" title="Chat">
                                <i class="fas fa-comments"></i>
                            </button>` : ''}
                        ${request.status === 'pending' ? 
                            `<button class="btn btn-sm btn-warning btn-icon" onclick="requestsManager.cancelRequest('${request.id}')" title="Cancelar">
                                <i class="fas fa-times"></i>
                            </button>` : ''}
                    </div>
                </td>
            </tr>
        `);
    }

    getLiftName(liftId) {
        const lifts = JSON.parse(localStorage.getItem('lifts')) || [
            { id: 'lift1', model: 'Otis Gen2', location: 'Rua Central, 12' },
            { id: 'lift2', model: 'Schindler 3300', location: 'Av. da Vitória, 45' },
            { id: 'lift3', model: 'KONE MonoSpace', location: 'Rua Shevchenko, 78' }
        ];
        const lift = lifts.find(l => l.id === liftId);
        return lift ? `${lift.model} - ${lift.location}` : 'Elevador desconhecido';
    }

    getPriorityText(priority) {
        const priorities = {
            'high': 'Alto',
            'medium': 'Médio',
            'low': 'Baixo'
        };
        return priorities[priority] || priority;
    }

    getStatusText(status) {
        const statuses = {
            'pending': 'Em espera',
            'in-progress': 'Em progresso',
            'completed': 'Concluído',
            'cancelled': 'Cancelado'
        };
        return statuses[status] || status;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('pt-PT');
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('pt-PT');
    }

    updateStats(requests = this.requests) {
        $('#totalRequests').text(requests.length);
        $('#requestsCount').text(requests.filter(req => req.status === 'pending' || req.status === 'in-progress').length);
        
        const pendingRequests = requests.filter(req => req.status === 'pending').length;
        $('#pendingRequests').text(pendingRequests);

        const inProgressRequests = requests.filter(req => req.status === 'in-progress').length;
        $('#inProgressRequests').text(inProgressRequests);

        const completedRequests = requests.filter(req => req.status === 'completed').length;
        $('#completedRequests').text(completedRequests);
    }

    updatePagination(requests) {
        const totalPages = Math.ceil(requests.length / this.itemsPerPage);
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
        const totalPages = Math.ceil(this.getFilteredRequests().length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.applyFilters();
        }
    }

    getFilteredRequests() {
        let filteredRequests = [...this.requests];

        if (this.filters.status !== 'all') {
            filteredRequests = filteredRequests.filter(request => 
                request.status === this.filters.status
            );
        }

        if (this.filters.priority !== 'all') {
            filteredRequests = filteredRequests.filter(request => 
                request.priority === this.filters.priority
            );
        }

        if (this.filters.lift !== 'all') {
            filteredRequests = filteredRequests.filter(request => 
                request.liftId === this.filters.lift
            );
        }

        return filteredRequests;
    }

    createNewRequest() {
        $('#newRequestForm')[0].reset();
        $('#photosPreview').empty();
        $('#newRequestModal').modal('show');
    }

    handlePhotoUpload(files) {
        const preview = $('#photosPreview');
        preview.empty();

        Array.from(files).slice(0, 5).forEach(file => {
            if (file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = $('<img>')
                        .attr('src', e.target.result)
                        .addClass('photo-preview')
                        .attr('title', file.name);
                    preview.append(img);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    async submitNewRequest() {
        const formData = {
            type: $('#requestType').val(),
            liftId: $('#requestLift').val(),
            priority: $('#requestPriority').val(),
            title: $('#requestTitle').val(),
            description: $('#requestDescription').val(),
            urgent: $('#urgentRequest').is(':checked')
        };

        if (!formData.type || !formData.liftId || !formData.title || !formData.description) {
            this.showNotification('Por favor, preencha todos os campos obrigatórios', 'error');
            return;
        }

        let photoUrls = [];
        const photoFiles = $('#requestPhotos')[0].files;
        if (photoFiles.length > 0) {
            const data = new FormData();
            Array.from(photoFiles).slice(0, 5).forEach(file => {
                if (file.type.startsWith('image/')) {
                    data.append('files', file);
                }
            });
            try {
                const res = await fetch(window.location.origin + '/api/upload', {
                    method: 'POST',
                    body: data
                });
                const result = await res.json();
                photoUrls = result.files.map(f => f.url);
            } catch (err) {
                this.showNotification('Erro ao carregar foto', 'error');
            }
        }

        const newRequest = {
            id: Date.now().toString(),
            ...formData,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            photos: photoUrls,
            history: [{
                action: 'Pedido criado',
                timestamp: new Date().toISOString()
            }]
        };

        this.requests.unshift(newRequest);
        localStorage.setItem('maintenanceRequests', JSON.stringify(this.requests));
        $('#newRequestModal').modal('hide');
        this.applyFilters();
        this.showNotification('Pedido criado com sucesso!', 'success');
    }

    viewRequest(requestId) {
        const request = this.requests.find(req => req.id === requestId);
        if (!request) return;

        currentRequestId = requestId;
        const modalContent = this.createRequestDetails(request);
        $('#requestDetailsContent').html(modalContent);
        
        // Atualização видимості кнопки чату
        if (request.status === 'in-progress' && request.assignedTo) {
            $('#chatWithTechBtn').show();
        } else {
            $('#chatWithTechBtn').hide();
        }
        
        $('#viewRequestModal').modal('show');
    }

    createRequestDetails(request) {
        const priorityClass = `priority-${request.priority}`;
        const statusClass = `status-${request.status}`;
        const priorityText = this.getPriorityText(request.priority);
        const statusText = this.getStatusText(request.status);
        const liftName = this.getLiftName(request.liftId);
        
        return `
            <div class="request-details">
                <div class="row mb-4">
                    <div class="col-md-8">
                        <h4>Pedido #${request.id}</h4>
                        <h5>${request.title}</h5>
                    </div>
                    <div class="col-md-4 text-right">
                        <span class="priority-badge ${priorityClass}">${priorityText}</span>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>

                <div class="row mb-4">
                    <div class="col-md-6">
                        <div class="info-item">
                            <strong><i class="fas fa-elevator"></i> Elevador:</strong> ${liftName}
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-tag"></i> Tipo:</strong> ${this.getRequestTypeText(request.type)}
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-calendar"></i> Criado:</strong> ${this.formatDateTime(request.createdAt)}
                        </div>
                    </div>
                    <div class="col-md-6">
                        ${request.assignedTo ? `
                            <div class="info-item">
                                <strong><i class="fas fa-user-cog"></i> Técnico:</strong> ${request.technician || 'Desconhecido'}
                            </div>
                        ` : ''}
                        ${request.startedAt ? `
                            <div class="info-item">
                                <strong><i class="fas fa-play-circle"></i> Início dos trabalhos:</strong> ${this.formatDateTime(request.startedAt)}
                            </div>
                        ` : ''}
                        ${request.completedAt ? `
                            <div class="info-item">
                                <strong><i class="fas fa-check-circle"></i> Concluído:</strong> ${this.formatDateTime(request.completedAt)}
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="card-title"><i class="fas fa-align-left"></i> Descrição do problema</h5>
                    </div>
                    <div class="card-body">
                        <p class="card-text">${request.description || 'Sem descrição detalhada'}</p>
                        ${request.urgent ? '<span class="badge badge-danger">Pedido urgente</span>' : ''}
                    </div>
                </div>

                ${request.photos && request.photos.length > 0 ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-images"></i> Fotografias</h5>
                        </div>
                        <div class="card-body">
                            <div class="d-flex flex-wrap">
                                ${request.photos.map(photo => `
                                    <img src="../../assets/img/requests/${photo}" 
                                         class="photo-preview mr-2 mb-2" 
                                         style="width: 100px; height: 100px; object-fit: cover;"
                                         onerror="this.src='../../assets/img/requests/default.jpg'">
                                `).join('')}
                            </div>
                        </div>
                    </div>
                ` : ''}

                ${request.cost ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-money-bill-wave"></i> Custo</h5>
                        </div>
                        <div class="card-body">
                            <h4 class="text-success">₴${request.cost.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</h4>
                        </div>
                    </div>
                ` : request.estimatedCost ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-money-bill-wave"></i> Custo estimado</h5>
                        </div>
                        <div class="card-body">
                            <h4 class="text-warning">₴${request.estimatedCost.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</h4>
                        </div>
                    </div>
                ` : ''}

                ${request.rating ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-star"></i> Avaliação de qualidade</h5>
                        </div>
                        <div class="card-body">
                            <div class="rating-stars h3">
                                ${'⭐'.repeat(request.rating)}${'☆'.repeat(5 - request.rating)}
                            </div>
                        </div>
                    </div>
                ` : ''}

                ${request.history && request.history.length > 0 ? `
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="card-title"><i class="fas fa-history"></i> Histórico de ações</h5>
                    </div>
                    <div class="card-body">
                        <ul class="list-group">
                            ${request.history.map(h => `<li class="list-group-item"><b>${h.action}</b> <span class="text-muted float-right">${new Date(h.timestamp).toLocaleString('pt-PT')}</span></li>`).join('')}
                        </ul>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    getRequestTypeText(type) {
        const types = {
            'maintenance': 'Manutenção técnica',
            'repair': 'Reparação',
            'inspection': 'Inspeção técnica',
            'consultation': 'Consultoria',
            'emergency': 'Situação de emergência'
        };
        return types[type] || type;
    }

    downloadReport(requestId) {
        const request = this.requests.find(req => req.id === requestId);
        if (!request) return;

        this.showNotification(`Preparar relatório para o pedido #${requestId}...`, 'info');
        
        // Імітація створення PDF
        setTimeout(() => {
            const reportContent = this.generateReportContent(request);
            const blob = new Blob([reportContent], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `relatorio_pedido_${requestId}.pdf`;
            link.click();
            
            this.showNotification('Relatório descarregado com sucesso', 'success');
        }, 1500);
    }

    generateReportContent(request) {
        // Імітація створення звіту
        return `
            RELATÓRIO DO PEDIDO #${request.id}
            =============================
            
            Título: ${request.title}
            Tipo: ${this.getRequestTypeText(request.type)}
            Elevador: ${this.getLiftName(request.liftId)}
            Estado: ${this.getStatusText(request.status)}
            Prioridade: ${this.getPriorityText(request.priority)}
            
            Criado: ${this.formatDateTime(request.createdAt)}
            ${request.startedAt ? `Início dos trabalhos: ${this.formatDateTime(request.startedAt)}` : ''}
            ${request.completedAt ? `Concluído: ${this.formatDateTime(request.completedAt)}` : ''}
            
            Descrição:
            ${request.description}
            
            ${request.cost ? `Custo: €${request.cost.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}` : ''}
            ${request.rating ? `Avaliação: ${'⭐'.repeat(request.rating)}` : ''}
            
            =============================
            Gerado: ${new Date().toLocaleString('pt-PT')}
        `;
    }

    chatWithTech(requestId) {
        const request = this.requests.find(req => req.id === requestId);
        if (!request || !request.assignedTo) {
            this.showNotification('Técnico não atribuído a este pedido', 'warning');
            return;
        }

this.showNotification('A abrir chat com o técnico...', 'info');
        
        // Імітація переходу в чат
        setTimeout(() => {
            window.open(`../../chat.html?techId=${request.assignedTo}&requestId=${requestId}`, '_blank');
        }, 1000);
    }

    setRequestStatus(request, newStatus) {
        const oldStatus = request.status;
        request.status = newStatus;
        request.updatedAt = new Date().toISOString();
        // Логування дії
        if (!request.history) request.history = [];
        request.history.push({
            action: `Estado alterado: ${oldStatus} → ${newStatus}`,
            timestamp: request.updatedAt
        });
        localStorage.setItem('maintenanceRequests', JSON.stringify(this.requests));
        this.applyFilters();
        // Push-сповіщення
        if (window.pushNotificationsClient) {
            if (newStatus === 'completed') {
                window.pushNotificationsClient.notifyRequestCompleted(request);
            } else if (newStatus === 'cancelled') {
                window.pushNotificationsClient.send('Pedido cancelado', `Pedido N.º${request.id} foi cancelado.`);
                } else if (newStatus === 'in-progress') {
                    window.pushNotificationsClient.send('Pedido em progresso', `Pedido N.º${request.id} foi aceite.`);
            }
        }
    }

    // Приклад використання централізованої зміни статусу
    startRequest(requestId) {
        const request = this.requests.find(req => req.id === requestId);
        if (!request) return;
        this.setRequestStatus(request, 'in-progress');
        this.showNotification('Pedido aceite e em progresso', 'info');
    }
    completeRequest(requestId) {
        const request = this.requests.find(req => req.id === requestId);
        if (!request) return;
        this.setRequestStatus(request, 'completed');
        this.showNotification('Pedido concluído com sucesso!', 'success');
    }

    cancelRequest(requestId) {
        const request = this.requests.find(req => req.id === requestId);
        if (!request) return;

        if (await swalConfirm('Tem a certeza que pretende cancelar este pedido?')) {
            this.setRequestStatus(request, 'cancelled');
            this.showNotification('Pedido cancelado', 'success');
        }
    }

    exportRequests() {
        const filteredRequests = this.getFilteredRequests();
        
        if (filteredRequests.length === 0) {
            this.showNotification('Sem pedidos para exportar', 'warning');
            return;
        }

        this.showNotification('A preparar exportação...', 'info');
        
        // Створення CSV
        const csvContent = this.convertToCSV(filteredRequests);
        this.downloadCSV(csvContent, `pedidos_${new Date().toISOString().split('T')[0]}.csv`);
    }

    convertToCSV(requests) {
        const headers = ['ID', 'Tipo', 'Elevador', 'Título', 'Prioridade', 'Estado', 'Técnico', 'Criado'];
        const rows = requests.map(request => [
            request.id,
            this.getRequestTypeText(request.type),
            this.getLiftName(request.liftId),
            request.title,
            this.getPriorityText(request.priority),
            this.getStatusText(request.status),
            request.technician || 'Não atribuído',
            this.formatDate(request.createdAt)
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

    printRequests() {
        window.print();
    }

    createMaintenanceRequest() {
        this.openRequestModal('maintenance');
    }

    createRepairRequest() {
        this.openRequestModal('repair');
    }

    createConsultationRequest() {
        this.openRequestModal('consultation');
    }

    createInspectionRequest() {
        this.openRequestModal('inspection');
    }

    openRequestModal(type) {
        $('#newRequestForm')[0].reset();
        $('#requestType').val(type);
        this.updateRequestTitle(type);
        $('#photosPreview').empty();
        $('#newRequestModal').modal('show');
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
            toastr.info(message);
        }
    }
}

// Ініціалізація
$(document).ready(function() {
    window.requestsManager = new RequestsManager();
});