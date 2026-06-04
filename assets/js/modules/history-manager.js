// history-manager.js - Client history manager for AdminLTE
class HistoryManager {
    constructor() {
        this.events = [];
        this.lifts = [];
        this.filters = {
            period: '30',
            eventType: 'all',
            lift: 'all'
        };
        this.charts = {};
        this.init();
    }

    init() {
        this.loadHistory();
        this.setupEventListeners();
        this.updateStats();
    }

    async loadHistory() {
        try {
            const liftsResponse = await this.fetchJson('/api/lifts');
            const lifts = Array.isArray(liftsResponse?.data) ? liftsResponse.data : [];
            this.lifts = lifts;

            const requestsResponse = await this.fetchJson('/api/requests?archived=all&limit=200');
            const requests = Array.isArray(requestsResponse?.data) ? requestsResponse.data : [];

            this.events = [
                ...this.buildInspectionEventsFromLifts(lifts),
                ...this.buildRequestEvents(requests)
            ].sort((a, b) => new Date(b.date) - new Date(a.date));

            this.syncLiftFilterOptions();
        } catch (error) {
            console.warn('Erro ao carregar histórico da API:', error);
            this.events = [];
            this.lifts = [];
        }

        this.setupCharts();
        this.applyFilters();
    }

    async fetchJson(url) {
        const token = (typeof AuthManager !== 'undefined' && typeof AuthManager.getAuthToken === 'function')
            ? AuthManager.getAuthToken()
            : (sessionStorage.getItem('liftmanager_jwt') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('authToken') || localStorage.getItem('token'));
        const response = await fetch(url, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || error.error || `HTTP ${response.status}`);
        }
        return await response.json();
    }

    syncLiftFilterOptions() {
        const select = $('#liftFilter');
        if (!select.length) return;

        const current = this.filters.lift || 'all';
        const options = ['<option value="all">Todos os elevadores</option>'];
        const seen = new Set();

        this.lifts.forEach(lift => {
            const value = String(lift._id || lift.municipalNumber || lift.location || lift.address?.street || '').trim();
            if (!value || seen.has(value)) return;
            seen.add(value);
            options.push(`<option value="${value}">${this.getLiftLabel(lift)}</option>`);
        });

        select.html(options.join(''));
        select.val(seen.has(current) ? current : 'all');
        this.filters.lift = select.val() || 'all';
    }

    getLiftLabel(lift) {
        const title = lift?.municipalNumber || lift?.location || lift?.name || lift?.address?.street || 'Elevador';
        const city = lift?.address?.city ? ` - ${lift.address.city}` : '';
        return `${title}${city}`;
    }

    buildInspectionEventsFromLifts(lifts) {
        const events = [];

        lifts.forEach((lift) => {
            const liftId = String(lift._id || lift.municipalNumber || lift.location || '');
            const liftLabel = this.getLiftLabel(lift);
            const address = lift?.address?.street || lift?.location || liftLabel;
            const inspections = Array.isArray(lift.inspectionHistory) ? lift.inspectionHistory : [];

            inspections.forEach((inspection, index) => {
                const date = inspection?.date || inspection?.inspectionDate || inspection?.createdAt;
                if (!date) return;

                const rawNotes = String(inspection.notes || '').trim();
                const violationsMatch = rawNotes.match(/Cl[áa]usulas C1:\s*(\d+).*Cl[áa]usulas C2:\s*(\d+).*Cl[áa]usulas C3:\s*(\d+)/i);
                const c1 = violationsMatch ? Number(violationsMatch[1]) : 0;
                const c2 = violationsMatch ? Number(violationsMatch[2]) : 0;
                const c3 = violationsMatch ? Number(violationsMatch[3]) : 0;
                const violationCount = c1 + c2 + c3;
                const status = String(inspection.status || 'completed').toLowerCase();

                events.push({
                    id: inspection._id ? String(inspection._id) : `${liftId}-${index}`,
                    type: 'inspection',
                    date,
                    liftId,
                    lift: liftLabel,
                    location: address,
                    technician: inspection.inspector || inspection.technician || '—',
                    status: status === 'failed' || violationCount > 0 ? 'completed' : 'completed',
                    description: inspection.reportType ? `Inspeção ${inspection.reportType}` : 'Inspeção periódica',
                    duration: inspection.duration || null,
                    cost: inspection.cost || 0,
                    rating: inspection.rating || 0,
                    details: rawNotes || 'Relatório de inspeção disponível',
                    violations: violationCount
                });
            });
        });

        return events;
    }

    buildRequestEvents(requests) {
        return (requests || []).map((request) => {
            const date = request.updatedAt || request.createdAt || new Date().toISOString();
            const typeMap = {
                maintenance: 'maintenance',
                repair: 'repair',
                inspection: 'inspection',
                emergency: 'emergency'
            };
            const type = typeMap[String(request.type || '').toLowerCase()] || 'maintenance';
            const liftLabel = request.lift?.municipalNumber || request.lift?.address?.street || request.liftId || 'Elevador';
            const liftId = String(request.liftId || request.lift?._id || liftLabel);

            return {
                id: String(request._id || request.requestNumber || `${liftId}-${date}`),
                type,
                date,
                liftId,
                lift: liftLabel,
                location: request.lift?.address?.street || '—',
                technician: request.assignedTo?.firstName ? `${request.assignedTo.firstName} ${request.assignedTo.lastName || ''}`.trim() : '—',
                status: request.status || 'pending',
                description: request.title || request.description || 'Pedido de serviço',
                duration: request.duration || null,
                cost: request.cost || 0,
                rating: request.rating || 0,
                details: request.description || ''
            };
        });
    }

    setupEventListeners() {
        $('#periodFilter').on('change', (e) => {
            this.filters.period = e.target.value;
            this.applyFilters();
        });

        $('#eventTypeFilter').on('change', (e) => {
            this.filters.eventType = e.target.value;
            this.applyFilters();
        });

        $('#liftFilter').on('change', (e) => {
            this.filters.lift = e.target.value;
            this.applyFilters();
        });

        // Text search
        $('#searchInput').on('input', (e) => {
            this.applyFilters();
        });
    }

    applyFilters() {
        let filteredEvents = [...this.events];

        // Filter by period
        if (this.filters.period !== 'all') {
            const days = parseInt(this.filters.period);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            filteredEvents = filteredEvents.filter(event => 
                new Date(event.date) >= cutoffDate
            );
        }

        // Filter by event type
        if (this.filters.eventType !== 'all') {
            filteredEvents = filteredEvents.filter(event => 
                event.type === this.filters.eventType
            );
        }

        // Filter by lift
        if (this.filters.lift !== 'all') {
            filteredEvents = filteredEvents.filter(event => 
                event.liftId === this.filters.lift
            );
        }

        // Text search
        const searchTerm = ($('#searchInput').val() || '').toLowerCase();
        if (searchTerm) {
            filteredEvents = filteredEvents.filter(event =>
                (event.description || '').toLowerCase().includes(searchTerm) ||
                (event.technician || '').toLowerCase().includes(searchTerm) ||
                (event.details || '').toLowerCase().includes(searchTerm)
            );
        }

        // Sort by date (newest first)
        filteredEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

        this.renderTimeline(filteredEvents);
        this.updateStats(filteredEvents);
        this.updateCharts(filteredEvents);
    }

    resetFilters() {
        $('#periodFilter').val('30');
        $('#eventTypeFilter').val('all');
        $('#liftFilter').val('all');
        $('#searchInput').val('');
        this.filters = { period: '30', eventType: 'all', lift: 'all' };
        this.applyFilters();
    }

    renderTimeline(events) {
        const timeline = $('#timeline');
        timeline.empty();
        $('#timelineCount').text(events.length);

        if (events.length === 0) {
            timeline.html(`
                <div class="text-center py-5">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h4>Nenhum evento encontrado</h4>
                    <p>Tente alterar os parametros dos filtros</p>
                    <button class="btn btn-primary mt-3" onclick="historyManager.resetFilters()">
                        <i class="fas fa-sync"></i> Repor filtros
                    </button>
                </div>
            `);
            return;
        }

        events.forEach(event => {
            const eventElement = this.createTimelineItem(event);
            timeline.append(eventElement);
        });
    }

    createTimelineItem(event) {
        const statusClass = this.getStatusClass(event.status);
        const statusText = this.getStatusText(event.status);
        const formattedDate = this.formatDate(event.date);
        const formattedTime = this.formatTime(event.date);
        
        return $(`
            <div class="timeline-item">
                <div class="timeline-date">${formattedDate}<br>${formattedTime}</div>
                <div class="timeline-content">
                    <div class="timeline-icon">${this.getEventIcon(event.type)}</div>
                    <div class="timeline-details">
                        <h4>${event.description}</h4>
                        <p><strong><i class="fas fa-elevator"></i> Elevador:</strong> ${event.lift}</p>
                        <p><strong><i class="fas fa-map-marker-alt"></i> Localizacao:</strong> ${event.location}</p>
                        <p><strong><i class="fas fa-user-cog"></i> Técnico:</strong> ${event.technician}</p>
                        <p><strong><i class="fas fa-clock"></i> Duração:</strong> ${event.duration} min</p>
                        <p><strong><i class="fas fa-money-bill-wave"></i> Custo:</strong> €${(event.cost ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
                        <p><strong><i class="fas fa-star"></i> Avaliacao:</strong> ${this.getRatingStars(event.rating)}</p>
                        <span class="${statusClass}">${statusText}</span>
                        <div class="mt-3">
                            <button class="btn btn-sm btn-info" onclick="historyManager.showEventDetails('${event.id}')">
                                <i class="fas fa-info-circle"></i> Detalhes
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="historyManager.downloadEventReport('${event.id}')">
                                <i class="fas fa-download"></i> Relatório
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    getEventIcon(eventType) {
        const icons = {
            'maintenance': '🔧',
            'repair': '⚠️',
            'inspection': '📋',
            'emergency': '🚨'
        };
        return icons[eventType] || '📅';
    }

    getStatusClass(status) {
        const classes = {
            'completed': 'status-completed',
            'in-progress': 'status-in-progress',
            'pending': 'status-pending'
        };
        return classes[status] || 'status-pending';
    }

    getStatusText(status) {
        const statuses = {
            'completed': 'Concluido',
            'in-progress': 'Em progresso',
            'pending': 'Pendente'
        };
        return statuses[status] || status;
    }

    getRatingStars(rating) {
        return '⭐'.repeat(Math.round(rating));
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('pt-PT');
    }

    formatTime(dateString) {
        return new Date(dateString).toLocaleTimeString('pt-PT', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    updateStats(events = this.events) {
        $('#totalEvents').text(events.length);
        $('#historyCount').text(events.length);
        
        const maintenanceCount = events.filter(e => e.type === 'maintenance').length;
        $('#maintenanceCount').text(maintenanceCount);

        const avgResponseTime = events.length > 0 
            ? Math.round(events.reduce((sum, e) => sum + (e.duration || 0), 0) / events.length)
            : 0;
        $('#avgResponseTime').text(`${avgResponseTime} min`);

        const avgRating = events.length > 0
            ? (events.reduce((sum, e) => sum + (e.rating || 0), 0) / events.length).toFixed(1)
            : '0.0';
        $('#avgRating').text(avgRating);

        // Atualizacao dos custos totais
        const totalCost = events.reduce((sum, e) => sum + (e.cost || 0), 0);
        $('#totalCost').text(`€${totalCost.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`);
    }

    setupCharts() {
        // Destroy any existing Chart.js instances on these canvases
        ['eventTypeChart', 'frequencyChart', 'ratingsChart', 'costsChart'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const existing = Chart.getChart(el);
                if (existing) existing.destroy();
            }
        });
        // Also destroy saved references if needed
        Object.values(this.charts).forEach(chart => {
            try { if (chart) chart.destroy(); } catch {}
        });
        this.charts = {
            eventType: this.createEventTypeChart(),
            frequency: this.createFrequencyChart(),
            ratings: this.createRatingsChart(),
            costs: this.createCostsChart()
        };
    }

    createEventTypeChart() {
        const ctx = document.getElementById('eventTypeChart').getContext('2d');
        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Manutencao tecnica', 'Reparacao', 'Inspecao', 'Emergencia'],
                datasets: [{
                    data: this.calculateEventTypeData(this.events),
                    backgroundColor: ['#36a2eb', '#ff6384', '#ffcd56', '#4bc0c0'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    }

    createFrequencyChart() {
        const ctx = document.getElementById('frequencyChart').getContext('2d');
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.getLastSixMonths(),
                datasets: [{
                    label: 'Numero de eventos',
                    data: this.calculateFrequencyData(this.events),
                    backgroundColor: '#36a2eb',
                    borderWidth: 0,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    createRatingsChart() {
        const ctx = document.getElementById('ratingsChart').getContext('2d');
        return new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Velocidade', 'Qualidade', 'Profissionalismo', 'Comunicacao', 'Avaliacao geral'],
                datasets: [{
                    label: 'Medias de avaliacao',
                    data: this.calculateRatingsData(this.events),
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        min: 0,
                        max: 5,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    createCostsChart() {
        const ctx = document.getElementById('costsChart').getContext('2d');
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.getLastSixMonths(),
                datasets: [{
                    label: 'Custos de manutencao',
                    data: this.calculateCostsData(this.events),
                    borderColor: '#ff6384',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    tension: 0.2,
                    fill: true,
                    pointBackgroundColor: '#ff6384',
                    pointBorderColor: '#fff',
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₴' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    updateCharts(events) {
        if (!this.charts.eventType) return;

        this.charts.eventType.data.datasets[0].data = this.calculateEventTypeData(events);
        this.charts.eventType.update();

        this.charts.frequency.data.datasets[0].data = this.calculateFrequencyData(events);
        this.charts.frequency.update();

        this.charts.ratings.data.datasets[0].data = this.calculateRatingsData(events);
        this.charts.ratings.update();

        this.charts.costs.data.datasets[0].data = this.calculateCostsData(events);
        this.charts.costs.update();
    }

    calculateEventTypeData(events) {
        const types = ['maintenance', 'repair', 'inspection', 'emergency'];
        return types.map(type => events.filter(e => e.type === type).length);
    }

    getLastSixMonths() {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const currentMonth = new Date().getMonth();
        const result = [];
        
        for (let i = 5; i >= 0; i--) {
            const monthIndex = (currentMonth - i + 12) % 12;
            result.push(months[monthIndex]);
        }
        
        return result;
    }

    calculateFrequencyData(events) {
        const months = this.getLastSixMonths();
        const currentMonth = new Date().getMonth();
        const result = [];
        
        for (let i = 5; i >= 0; i--) {
            const targetMonth = (currentMonth - i + 12) % 12;
            const count = events.filter(e => new Date(e.date).getMonth() === targetMonth).length;
            result.push(count);
        }
        
        return result;
    }

    calculateRatingsData(events) {
        const rated = (events || []).filter(e => Number(e.rating || 0) > 0);
        if (rated.length === 0) return [0, 0, 0, 0, 0];

        const avg = rated.reduce((sum, e) => sum + Number(e.rating || 0), 0) / rated.length;
        return [avg, avg, avg, avg, avg];
    }

    calculateCostsData(events) {
        const currentMonth = new Date().getMonth();
        const result = [];
        
        for (let i = 5; i >= 0; i--) {
            const targetMonth = (currentMonth - i + 12) % 12;
            const monthlyCost = events
                .filter(e => new Date(e.date).getMonth() === targetMonth)
                .reduce((sum, e) => sum + (e.cost || 0), 0);
            result.push(monthlyCost);
        }
        
        return result;
    }

    showEventDetails(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        const modalContent = `
            <div class="event-details">
                <h4>${event.description}</h4>
                <hr>
                <div class="row">
                    <div class="col-md-6">
                        <p><strong><i class="fas fa-elevator"></i> Elevador:</strong> ${event.lift}</p>
                        <p><strong><i class="fas fa-map-marker-alt"></i> Localizacao:</strong> ${event.location}</p>
                        <p><strong><i class="fas fa-user-cog"></i> Técnico:</strong> ${event.technician}</p>
                        <p><strong><i class="fas fa-calendar-alt"></i> Data:</strong> ${this.formatDate(event.date)}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong><i class="fas fa-clock"></i> Duracao:</strong> ${event.duration} min</p>
                        <p><strong><i class="fas fa-money-bill-wave"></i> Custo:</strong> €${(event.cost ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
                        <p><strong><i class="fas fa-star"></i> Avaliacao:</strong> ${this.getRatingStars(event.rating)}</p>
                        <p><strong><i class="fas fa-check-circle"></i> Estado:</strong> 
                            <span class="${this.getStatusClass(event.status)}">${this.getStatusText(event.status)}</span>
                        </p>
                    </div>
                </div>
                ${event.details ? `
                <div class="mt-4">
                    <h5><i class="fas fa-list"></i> Detalhes dos trabalhos:</h5>
                    <div class="bg-light p-3 rounded">
                        <p class="mb-0">${event.details}</p>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        // Create modal window
        const modal = `
            <div class="modal fade" id="eventDetailsModal" tabindex="-1" role="dialog">
                <div class="modal-dialog modal-lg" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Detalhes do evento de manutencao</h5>
                            <button type="button" class="close" data-dismiss="modal">
                                <span>&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            ${modalContent}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button>
                            <button type="button" class="btn btn-primary" onclick="historyManager.downloadEventReport('${event.id}')">
                                <i class="fas fa-download"></i> Descarregar relatorio
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Append modal to DOM
        if ($('#eventDetailsModal').length) {
            $('#eventDetailsModal').remove();
        }
        $('body').append(modal);
        $('#eventDetailsModal').modal('show');
    }

    downloadEventReport(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        this.showNotification(`A preparar relatorio para "${event.description}"...`, 'info');
        
        // Simulate generation
        setTimeout(() => {
            this.showNotification('Relatório com sucesso carregado', 'success');
            
            // Build plain text report
            const reportData = `
                RELATORIO DE MANUTENCAO
                ========================
                
                Evento: ${event.description}
                Elevador: ${event.lift}
                Localizacao: ${event.location}
                Técnico: ${event.technician}
                Data: ${this.formatDate(event.date)}
                Hora: ${this.formatTime(event.date)}
                Duracao: ${event.duration} min
                Custo: €${(event.cost ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                Avaliacao: ${event.rating}/5
                Estado: ${this.getStatusText(event.status)}
                
                Detalhes dos trabalhos:
                ${event.details || 'Sem detalhes adicionais'}
                
                ========================
                Gerado em: ${new Date().toLocaleString('pt-PT')}
            `;
            
            // Create file and download
            const blob = new Blob([reportData], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `relatorio_${event.id}_${this.formatDate(event.date)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 1500);
    }

    exportToPDF() {
        this.exportServerReport('pdf');
    }

    exportToExcel() {
        this.exportServerReport('excel');
    }

    async exportServerReport(format = 'excel') {
        try {
            this.showNotification(`A gerar relatório ${format.toUpperCase()}...`, 'info');

            const report = await this.generateBackendReport();
            if (!report || !report.id) {
                this.showNotification('Erro ao gerar relatório no servidor', 'error');
                return;
            }

            const token = localStorage.getItem('authToken') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('token');
            const endpoint = format === 'pdf' ? `/api/reports/${report.id}/pdf` : `/api/reports/${report.id}/excel`;
            const response = await fetch(endpoint, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || 'Falha ao exportar relatório');
            }

            const blob = await response.blob();
            const ext = format === 'pdf' ? 'pdf' : 'csv';
            const fileName = `relatorio_cliente_${new Date().toISOString().split('T')[0]}.${ext}`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showNotification(`Relatório ${format.toUpperCase()} gerado com sucesso`, 'success');
        } catch (error) {
            console.error('Erro ao exportar relatório:', error);
            this.showNotification(error.message || 'Erro ao exportar relatório', 'error');
        }
    }

    async generateBackendReport() {
        const token = localStorage.getItem('authToken') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('token');
        if (!token) {
            throw new Error('Sessão expirada. Faça login novamente.');
        }

        const now = new Date();
        let start = new Date();

        if (this.filters.period === 'all') {
            start.setFullYear(now.getFullYear() - 5);
        } else {
            const days = parseInt(this.filters.period || '30', 10);
            start.setDate(now.getDate() - (isNaN(days) ? 30 : days));
        }

        const eventType = String(this.filters.eventType || 'all').toLowerCase();
        const reportTypeMap = {
            maintenance: 'maintenance',
            inspection: 'inspection',
            emergency: 'breakdown',
            repair: 'breakdown'
        };

        const body = {
            type: reportTypeMap[eventType] || 'activity',
            startDate: start.toISOString().slice(0, 10),
            endDate: now.toISOString().slice(0, 10)
        };

        const response = await fetch('/api/reports/generate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Erro ao gerar relatório');
        }

        return await response.json();
    }

    printHistory() {
        this.showNotification('A preparar para impressao...', 'info');
        
        setTimeout(() => {
            window.print();
            this.showNotification('Pagina pronta para impressao', 'success');
        }, 1000);
    }

    getFilteredEvents() {
        let filteredEvents = [...this.events];

        if (this.filters.period !== 'all') {
            const days = parseInt(this.filters.period);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            filteredEvents = filteredEvents.filter(event => new Date(event.date) >= cutoffDate);
        }

        if (this.filters.eventType !== 'all') {
            filteredEvents = filteredEvents.filter(event => event.type === this.filters.eventType);
        }

        if (this.filters.lift !== 'all') {
            filteredEvents = filteredEvents.filter(event => event.liftId === this.filters.lift);
        }

        return filteredEvents;
    }

    getPeriodText() {
        const periods = {
            '30': 'Ultimos 30 dias',
            '90': 'Ultimos 3 meses',
            '365': 'Ultimo ano',
            'all': 'Historico completo'
        };
        return periods[this.filters.period] || this.filters.period;
    }

    getEventTypeText(type = null) {
        const types = {
            'all': 'Todos os eventos',
            'maintenance': 'Manutencao tecnica',
            'repair': 'Reparação',
            'inspection': 'Inspeção',
            'emergency': 'Manutencao de emergencia'
        };
        return type ? types[type] || type : types[this.filters.eventType];
    }

    getLiftText() {
        if (this.filters.lift === 'all') return 'Todos os elevadores';

        const lift = this.lifts.find(item => String(item._id || item.municipalNumber || item.location || '') === String(this.filters.lift));
        return lift ? this.getLiftLabel(lift) : this.filters.lift;
    }

    calculateAverageDuration(events) {
        return events.length > 0 
            ? Math.round(events.reduce((sum, e) => sum + (e.duration || 0), 0) / events.length)
            : 0;
    }

    calculateAverageRating(events) {
        return events.length > 0
            ? events.reduce((sum, e) => sum + (e.rating || 0), 0) / events.length
            : 0;
    }

    calculateTotalCost(events) {
        return events.reduce((sum, e) => sum + (e.cost || 0), 0);
    }

    showNotification(message, type = 'success') {
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
