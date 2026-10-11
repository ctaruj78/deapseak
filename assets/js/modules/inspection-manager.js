// inspections-manager.js - МЕНЕДЖЕР ІНСПЕКЦІЙ ДЛЯ ТЕХНІКА
class InspectionManager {
    constructor() {
        this.inspections = [];
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
        this.loadInspections();
        this.setupEventListeners();
        this.updateStats();
    }

    async loadInspections() {
        try {
            // 🔥 ПІДКЛЮЧЕНО ДО РЕАЛЬНОГО API /api/requests з типом inspection
            const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('liftmanager_jwt');
            
            const apiUrl = window.location.hostname.includes('app.github.dev') 
                ? `https://${window.location.hostname.replace('5173-', '3000-')}/api/requests?type=inspection,maintenance`
                : '/api/requests?type=inspection,maintenance';
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                // API повертає requests, конвертуємо їх в інспекції
                const requests = Array.isArray(data) ? data : (data.data || data.requests || []);
                
                // Конвертація requests → inspections
                this.inspections = requests.map(req => ({
                    id: req._id || req.id,
                    type: req.type || 'inspection',
                    title: req.description || req.title || 'Inspeção',
                    liftId: req.lift?._id || req.lift?.id,
                    lift: `${req.lift?.model || 'Elevador'} - ${req.lift?.location || 'Endereço'}`,
                    priority: req.priority || 'medium',
                    status: req.status || 'planned',
                    scheduledDate: req.scheduledDate || req.createdAt,
                    completedDate: req.completedAt,
                    technician: req.assignedTo?.firstName ? `${req.assignedTo.firstName} ${req.assignedTo.lastName}` : 'Não atribuído',
                    notes: req.notes || req.description || '',
                    progress: req.progress || 0
                }));
                
                console.log('✅ Inspeções завантажені з API:', this.inspections.length);
                localStorage.setItem('inspections', JSON.stringify(this.inspections));
            } else {
                console.warn('⚠️ API /api/requests returned non-OK status:', response.status);
                throw new Error(`API status: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Erro завантаження інспекцій з API:', error);
            // Fallback: спроба завантажити з localStorage
            this.inspections = JSON.parse(localStorage.getItem('inspections')) || [];
        }

        this.applyFilters();
    }

    createSampleInspections() {
        return [];
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
            this.searchInspections(e.target.value);
        });
    }

    applyFilters() {
        let filteredInspections = [...this.inspections];

        // Filtroація за статусом
        if (this.filters.status !== 'all') {
            filteredInspections = filteredInspections.filter(inspection => 
                inspection.status === this.filters.status
            );
        }

        // Filtroація за типом
        if (this.filters.type !== 'all') {
            filteredInspections = filteredInspections.filter(inspection => 
                inspection.type === this.filters.type
            );
        }

        // Filtroація за пріоритетом
        if (this.filters.priority !== 'all') {
            filteredInspections = filteredInspections.filter(inspection => 
                inspection.priority === this.filters.priority
            );
        }

        this.renderInspections(filteredInspections);
        this.updateStats(filteredInspections);
        this.updatePagination(filteredInspections);
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

    searchInspections(query) {
        if (!query.trim()) {
            this.applyFilters();
            return;
        }

        const filteredInspections = this.inspections.filter(inspection =>
            inspection.title.toLowerCase().includes(query.toLowerCase()) ||
            inspection.id.toLowerCase().includes(query.toLowerCase()) ||
            inspection.lift.toLowerCase().includes(query.toLowerCase()) ||
            (inspection.technician && inspection.technician.toLowerCase().includes(query.toLowerCase()))
        );

        this.renderInspections(filteredInspections);
        this.updateStats(filteredInspections);
    }

    renderInspections(inspections) {
        const tbody = $('#inspectionsTableBody');
        tbody.empty();

        if (inspections.length === 0) {
            tbody.html(`
                <tr>
                    <td colspan="8" class="text-center py-5">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <h4>Nenhuma inspeção encontrada</h4>
                        <p>Tente alterar os parâmetros dos filtros</p>
                    </td>
                </tr>
            `);
            return;
        }

        // Пагінація
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const paginatedInspections = inspections.slice(startIndex, startIndex + this.itemsPerPage);

        paginatedInspections.forEach(inspection => {
            const row = this.createInspectionRow(inspection);
            tbody.append(row);
        });
    }

    createInspectionRow(inspection) {
        const statusClass = `status-${inspection.status}`;
        const priorityClass = `priority-${inspection.priority}`;
        const statusText = this.getStatusText(inspection.status);
        const typeText = this.getTypeText(inspection.type);
        const priorityText = this.getPriorityText(inspection.priority);
        
        return $(`
            <tr>
                <td><strong>${inspection.id}</strong></td>
                <td>${this.formatDate(inspection.scheduledDate)}</td>
                <td>${typeText}</td>
                <td>${inspection.lift}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td><span class="priority-badge ${priorityClass}">${priorityText}</span></td>
                <td>${this.getResultText(inspection)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-info btn-icon" onclick="inspectionManager.viewInspection('${inspection.id}')" title="Ver">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary btn-icon" onclick="inspectionManager.downloadReport('${inspection.id}')" title="Relatório">
                            <i class="fas fa-download"></i>
                        </button>
                        ${inspection.status === 'in-progress' ? 
                            `<button class="btn btn-sm btn-success btn-icon" onclick="inspectionManager.continueInspection('${inspection.id}')" title="Continuar">
                                <i class="fas fa-play"></i>
                            </button>` : ''}
                        ${inspection.status === 'planned' ? 
                            `<button class="btn btn-sm btn-warning btn-icon" onclick="inspectionManager.startInspection('${inspection.id}')" title="Iniciar">
                                <i class="fas fa-play-circle"></i>
                            </button>` : ''}
                    </div>
                </td>
            </tr>
        `);
    }

    getStatusText(status) {
        const statuses = {
            'planned': 'Planeada',
            'in-progress': 'Em curso',
            'completed': 'Concluída',
            'overdue': 'Em atraso',
            'cancelled': 'Cancelada'
        };
        return statuses[status] || status;
    }

    getTypeText(type) {
        const types = {
            'safety': 'Segurança',
            'technical': 'Técnica',
            'periodic': 'Periódica',
            'emergency': 'Emergência',
            'custom': 'Outro'
        };
        return types[type] || type;
    }

    getPriorityText(priority) {
        const priorities = {
            'high': 'Alta',
            'medium': 'Média',
            'low': 'Baixa'
        };
        return priorities[priority] || priority;
    }

    getResultText(inspection) {
        if (inspection.status !== 'completed') return '-';
        
        if (inspection.result === 'passed') {
            return `<span class="text-success"><i class="fas fa-check-circle"></i> Aprovada (${inspection.score}%)</span>`;
        } else if (inspection.result === 'failed') {
            return `<span class="text-danger"><i class="fas fa-times-circle"></i> Reprovado</span>`;
        } else {
            return `<span class="text-warning"><i class="fas fa-exclamation-circle"></i> Aprovada com reservas</span>`;
        }
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('pt-PT');
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('pt-PT');
    }

    updateStats(inspections = this.inspections) {
        $('#totalInspections').text(inspections.length);
        $('#inspectionsBadge').text(inspections.filter(i => i.status === 'planned' || i.status === 'in-progress').length);
        
        const planned = inspections.filter(i => i.status === 'planned').length;
        $('#plannedInspections').text(planned);

        const inProgress = inspections.filter(i => i.status === 'in-progress').length;
        $('#inProgressInspections').text(inProgress);

        const completed = inspections.filter(i => i.status === 'completed').length;
        $('#completedInspections').text(completed);
    }

    updatePagination(inspections) {
        const totalPages = Math.ceil(inspections.length / this.itemsPerPage);
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
        const totalPages = Math.ceil(this.getFilteredInspections().length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.applyFilters();
        }
    }

    getFilteredInspections() {
        let filteredInspections = [...this.inspections];

        if (this.filters.status !== 'all') {
            filteredInspections = filteredInspections.filter(inspection => 
                inspection.status === this.filters.status
            );
        }

        if (this.filters.type !== 'all') {
            filteredInspections = filteredInspections.filter(inspection => 
                inspection.type === this.filters.type
            );
        }

        if (this.filters.priority !== 'all') {
            filteredInspections = filteredInspections.filter(inspection => 
                inspection.priority === this.filters.priority
            );
        }

        return filteredInspections;
    }

    async startNewInspection() {
        $('#newInspectionForm')[0].reset();
        await this.populateLiftDropdown('#inspectionLift');
        $('#newInspectionModal').modal('show');
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

    createInspection() {
        const formData = {
            type: $('#inspectionType').val(),
            liftId: $('#inspectionLift').val(),
            priority: $('#inspectionPriority').val(),
            scheduledDate: $('#inspectionDate').val(),
            description: $('#inspectionDescription').val(),
            checklist: $('#inspectionChecklist').val()
        };

        if (!formData.type || !formData.liftId || !formData.scheduledDate) {
            this.showNotification('Por favor, preencha todos os campos obrigatórios', 'error');
            return;
        }

        const newInspection = {
            id: `INS-${new Date().getFullYear()}-${String(this.inspections.length + 1).padStart(3, '0')}`,
            title: this.generateInspectionTitle(formData.type),
            status: 'planned',
            ...formData,
            createdAt: new Date().toISOString(),
            technician: $('#techName').text()
        };

        this.inspections.unshift(newInspection);
        localStorage.setItem('inspections', JSON.stringify(this.inspections));
        
        $('#newInspectionModal').modal('hide');
        this.applyFilters();
        
        this.showNotification('Inspeção criada com sucesso!', 'success');
    }

    generateInspectionTitle(type) {
        const titles = {
            'safety': 'Verificação de segurança',
            'technical': 'Inspeção técnica',
            'periodic': 'Verificação periódica',
            'emergency': 'Verificação de emergência',
            'custom': 'Verificação especial'
        };
        return titles[type] || 'Nova inspeção';
    }

    viewInspection(inspectionId) {
        const inspection = this.inspections.find(i => i.id === inspectionId);
        if (!inspection) return;

        currentInspectionId = inspectionId;
        const modalContent = this.createInspectionDetails(inspection);
        $('#inspectionDetailsContent').html(modalContent);
        
        // Atualização видимості кнопки продовження
        if (inspection.status === 'in-progress') {
            $('#continueInspectionBtn').show();
        } else {
            $('#continueInspectionBtn').hide();
        }
        
        $('#viewInspectionModal').modal('show');
    }

    createInspectionDetails(inspection) {
        const statusClass = `status-${inspection.status}`;
        const priorityClass = `priority-${inspection.priority}`;
        const statusText = this.getStatusText(inspection.status);
        const typeText = this.getTypeText(inspection.type);
        const priorityText = this.getPriorityText(inspection.priority);
        
        return `
            <div class="inspection-details">
                <div class="row mb-4">
                    <div class="col-md-8">
                        <h4>${inspection.id}</h4>
                        <h5>${inspection.title}</h5>
                    </div>
                    <div class="col-md-4 text-right">
                        <span class="priority-badge ${priorityClass}">${priorityText}</span>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>

                <div class="row mb-4">
                    <div class="col-md-6">
                        <div class="info-item">
                            <strong><i class="fas fa-elevator"></i> Elevador:</strong> ${inspection.lift}
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-tag"></i> Tipo:</strong> ${typeText}
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-calendar"></i> Planeada:</strong> ${this.formatDateTime(inspection.scheduledDate)}
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="info-item">
                            <strong><i class="fas fa-user-cog"></i> Técnico:</strong> ${inspection.technician || 'Não atribuído'}
                        </div>
                        ${inspection.completedDate ? `
                            <div class="info-item">
                                <strong><i class="fas fa-check-circle"></i> Concluída:</strong> ${this.formatDateTime(inspection.completedDate)}
                            </div>
                        ` : ''}
                        ${inspection.duration ? `
                            <div class="info-item">
                                <strong><i class="fas fa-clock"></i> Duração:</strong> ${inspection.duration} min
                            </div>
                        ` : ''}
                    </div>
                </div>

                ${inspection.description ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-align-left"></i> Descrição da inspeção</h5>
                        </div>
                        <div class="card-body">
                            <p class="card-text">${inspection.description}</p>
                        </div>
                    </div>
                ` : ''}

                ${inspection.checklist && inspection.checklist.length > 0 ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-clipboard-list"></i> Lista de verificação</h5>
                            ${inspection.progress ? `
                                <div class="progress progress-sm">
                                    <div class="progress-bar bg-success" style="width: ${inspection.progress}%"></div>
                                </div>
                            ` : ''}
                        </div>
                        <div class="card-body">
                            <div class="checklist">
                                ${inspection.checklist.map(item => `
                                    <div class="checklist-item ${item.status === 'completed' ? (item.result === 'passed' ? 'completed' : 'failed') : ''}">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <span>${item.item}</span>
                                            <span class="badge ${item.status === 'completed' ? (item.result === 'passed' ? 'badge-success' : 'badge-danger') : 'badge-secondary'}">
                                                ${item.status === 'completed' ? (item.result === 'passed' ? 'Aprovado' : 'Reprovado') : 'Pendente'}
                                            </span>
                                        </div>
                                        ${item.notes ? `<p class="mb-0 mt-2"><small>${item.notes}</small></p>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                ` : ''}

                ${inspection.photos && inspection.photos.length > 0 ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-images"></i> Fotografias</h5>
                        </div>
                        <div class="card-body">
                            <div class="d-flex flex-wrap">
                                ${inspection.photos.map(photo => `
                                    <img src="../../assets/img/inspections/${photo}" 
                                         class="photo-preview mr-2 mb-2" 
                                         style="width: 100px; height: 100px; object-fit: cover;"
                                         onerror="this.src='../../assets/img/inspections/default.jpg'">
                                `).join('')}
                            </div>
                        </div>
                    </div>
                ` : ''}

                ${inspection.notes ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-sticky-note"></i> Notas</h5>
                        </div>
                        <div class="card-body">
                            <p class="card-text">${inspection.notes}</p>
                        </div>
                    </div>
                ` : ''}

                ${inspection.result ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-chart-bar"></i> Resultado</h5>
                        </div>
                        <div class="card-body">
                            <div class="text-center">
                                <h2 class="${inspection.result === 'passed' ? 'text-success' : 'text-danger'}">
                                    ${inspection.result === 'passed' ? 'Aprovada' : 'Reprovada'}
                                    ${inspection.score ? ` (${inspection.score}%)` : ''}
                                </h2>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    startInspection(inspectionId) {
        const inspection = this.inspections.find(i => i.id === inspectionId);
        if (!inspection) return;

        inspection.status = 'in-progress';
        inspection.startedDate = new Date().toISOString();
        
        localStorage.setItem('inspections', JSON.stringify(this.inspections));
        this.applyFilters();
        
        this.showNotification('Inspeção iniciada!', 'success');
        this.viewInspection(inspectionId);
    }

    continueInspection(inspectionId) {
        // Перенаправлення на сторінку виконання інспекції
        window.location.href = `inspection-execution.html?id=${inspectionId}`;
    }

    downloadReport(inspectionId) {
        const inspection = this.inspections.find(i => i.id === inspectionId);
        if (!inspection) return;

        this.showNotification(`A preparar relatório da inspeção ${inspectionId}...`, 'info');
        
        // Імітація створення PDF
        setTimeout(() => {
            const reportContent = this.generateReportContent(inspection);
            const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `relatorio_inspecao_${inspectionId}.txt`;
            link.click();
            
            this.showNotification('Relatório descarregado com sucesso', 'success');
        }, 1500);
    }

    generateReportContent(inspection) {
        // Імітація створення звіту
        return `
            RELATÓRIO DE INSPEÇÃO #${inspection.id}
            ===================================
            
            Nome: ${inspection.title}
            Tipo: ${this.getTypeText(inspection.type)}
            Elevador: ${inspection.lift}
            Estado: ${this.getStatusText(inspection.status)}
            Prioridade: ${this.getPriorityText(inspection.priority)}
            
            Planeada: ${this.formatDateTime(inspection.scheduledDate)}
            ${inspection.startedDate ? `Iniciada: ${this.formatDateTime(inspection.startedDate)}` : ''}
            ${inspection.completedDate ? `Concluída: ${this.formatDateTime(inspection.completedDate)}` : ''}
            
            ${inspection.description ? `Descrição: ${inspection.description}` : ''}
            
            ${inspection.result ? `Resultado: ${inspection.result === 'passed' ? 'Aprovada' : 'Reprovada'}${inspection.score ? ` (${inspection.score}%)` : ''}` : ''}
            
            ===================================
            Gerado em: ${new Date().toLocaleString('pt-PT')}
        `;
    }

    async downloadChecklistPdf(slug, label) {
        this.showNotification(`A preparar ${label}...`, 'info');
        try {
            const token = (window.AuthManager && AuthManager.getToken && AuthManager.getToken())
                || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('authToken') || '';
            const res = await fetch(`/api/checklists/${slug}/pdf`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const url = URL.createObjectURL(await res.blob());
            const link = document.createElement('a');
            link.href = url;
            link.download = `Checklist_${slug}.pdf`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            this.showNotification('Lista de verificação descarregada', 'success');
        } catch (err) {
            this.showNotification('Erro ao descarregar a lista de verificação: ' + err.message, 'error');
        }
    }

    loadSafetyChecklist() { return this.downloadChecklistPdf('seguranca', 'lista de verificação de segurança'); }
    loadTechnicalChecklist() { return this.downloadChecklistPdf('tecnica', 'lista de inspeção técnica'); }
    loadAnnualChecklist() { return this.downloadChecklistPdf('anual', 'lista de inspeção anual'); }

    exportInspections() {
        const filteredInspections = this.getFilteredInspections();
        
        if (filteredInspections.length === 0) {
            this.showNotification('Não há inspeções para exportar', 'warning');
            return;
        }

        this.showNotification('A preparar exportação...', 'info');
        
        // Створення CSV
        const csvContent = this.convertToCSV(filteredInspections);
        this.downloadCSV(csvContent, `inspecoes_${new Date().toISOString().split('T')[0]}.csv`);
    }

    convertToCSV(inspections) {
        const headers = ['ID', 'Tipo', 'Elevador', 'Estado', 'Prioridade', 'Planeada', 'Técnico', 'Resultado'];
        const rows = inspections.map(inspection => [
            inspection.id,
            this.getTypeText(inspection.type),
            inspection.lift,
            this.getStatusText(inspection.status),
            this.getPriorityText(inspection.priority),
            this.formatDate(inspection.scheduledDate),
            inspection.technician || 'Não atribuído',
            inspection.result || '-'
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

    printInspections() {
        window.print();
    }

    importChecklist() {
        this.showNotification('A importação de listas de verificação estará disponível em breve', 'info');
    }

    exportReports() {
        this.showNotification('A exportação de relatórios estará disponível em breve', 'info');
    }

    showNotification(message, type = 'info') {
        // Використання SweetAlert2 Toast
        if (typeof Swal !== 'undefined') {
            const Toast = Swal.mixin({
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer)
                    toast.addEventListener('mouseleave', Swal.resumeTimer)
                }
            });

            const iconMap = {
                'success': 'success',
                'error': 'error',
                'warning': 'warning',
                'info': 'info'
            };

            Toast.fire({
                icon: iconMap[type] || 'info',
                title: message
            });
        } else {
            // Fallback до звичайного alert
            toastr.info(message);
        }
    }
}

// Ініціалізація
$(document).ready(function() {
    window.inspectionManager = new InspectionManager();
});