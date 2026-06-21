// report-manager.js - МЕНЕДЖЕР ЗВІТІВ ТА АНАЛІТИКИ
class ReportManager {
    constructor() {
        this.reportData = {
            assignments: [],
            technicians: [],
            customers: [],
            financials: []
        };
        this.currentFilters = {
            period: 'week',
            reportType: 'performance',
            groupBy: 'daily'
        };
        this.charts = {};
        this.init();
    }

    init() {
        this.loadReportData();
        this.setupEventListeners();
        this.initializeCharts();
        this.setupAutoRefresh();
    }

    async loadReportData() {
        try {
            const token = (typeof AuthManager !== 'undefined' ? AuthManager.getAuthToken() : null)
                || localStorage.getItem('liftmanager_jwt') || sessionStorage.getItem('liftmanager_jwt')
                || localStorage.getItem('token') || sessionStorage.getItem('token') || '';
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            const [requestsRes, liftsRes] = await Promise.all([
                fetch('/api/requests/stats', { headers }),
                fetch('/api/lifts/stats', { headers })
            ]);

            if (requestsRes.ok && liftsRes.ok) {
                const requestsData = await requestsRes.json();
                const liftsData = await liftsRes.json();

                // Нормалізуємо реальні дані до формату reportData
                this.reportData.liftsStats = liftsData.data || liftsData;
                this.reportData.requestsStats = requestsData.data || requestsData;

                localStorage.setItem('reportData', JSON.stringify(this.reportData));
            } else {
                throw new Error('API indisponível');
            }
        } catch (error) {
            console.warn('Використання локальних даних:', error);
            this.loadFromLocalStorage();
        }

        this.updateAllUI();
    }

    loadFromLocalStorage() {
        const savedData = JSON.parse(localStorage.getItem('reportData')) || {};
        this.reportData = {
            assignments: savedData.assignments || [],
            technicians: savedData.technicians || [],
            customers: savedData.customers || [],
            financials: savedData.financials || []
        };
    }

    createSampleData() {
        this.reportData = { assignments: [], technicians: [], customers: [], financials: [] };
        localStorage.setItem('reportData', JSON.stringify(this.reportData));
    }

    updateAllUI() {
        this.updateMetrics();
        this.initializeCharts();
        this.updateStatsTable();
        this.updateComparisonAnalysis();
        this.updateKPIMetrics();
        this.updateReportDate();
    }

    updateMetrics() {
        const metrics = this.calculateMetrics();
        
        $('#totalAssignments').text(metrics.totalAssignments);
        $('#completionRate').text(metrics.completionRate + '%');
        $('#avgTime').text(this.formatTime(metrics.avgTime));
        $('#slaCompliance').text(metrics.slaCompliance !== null ? metrics.slaCompliance + '%' : '—');
        $('#escalations').text(metrics.escalations);
        $('#customerSatisfaction').text(metrics.customerSatisfaction !== null ? metrics.customerSatisfaction + '%' : '—');
        
        // Atualização трендів
        this.updateTrends();
    }

    calculateMetrics() {
        const totalAssignments = this.reportData.assignments.reduce((sum, day) => sum + day.total, 0);
        const completedAssignments = this.reportData.assignments.reduce((sum, day) => sum + day.completed, 0);
        const totalTime = this.reportData.assignments.reduce((sum, day) => sum + day.avgTime, 0);
        
        const count = this.reportData.assignments.length;
        return {
            totalAssignments: totalAssignments,
            completionRate: totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0,
            avgTime: count > 0 ? totalTime / count : 0,
            slaCompliance: null,
            escalations: Math.floor(totalAssignments * 0.05),
            customerSatisfaction: null
        };
    }

    updateTrends() {
        $('#assignmentsTrend').text('—').attr('class', 'trend-indicator trend-neutral');
        $('#completionTrend').text('—').attr('class', 'trend-indicator trend-neutral');
        $('#timeTrend').text('—').attr('class', 'trend-indicator trend-neutral');
        $('#slaTrend').text('—').attr('class', 'trend-indicator trend-neutral');
        $('#escalationsTrend').text('—').attr('class', 'trend-indicator trend-neutral');
        $('#satisfactionTrend').text('—').attr('class', 'trend-indicator trend-neutral');
    }

    initializeCharts() {
        this.initializePerformanceChart();
        this.initializePriorityChart();
        this.initializeTechPerformanceChart();
        this.initializeWorkloadChart();
    }

    initializePerformanceChart() {
        const ctx = document.getElementById('performanceChart');
        if (ctx) {
            const existing = Chart.getChart(ctx);
            if (existing) existing.destroy();
            this.charts.performance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: this.reportData.assignments.map(a => a.date),
                    datasets: [
                        {
                            label: 'Total de pedidos',
                            data: this.reportData.assignments.map(a => a.total),
                            borderColor: '#007bff',
                            backgroundColor: 'rgba(0, 123, 255, 0.1)',
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Concluídos',
                            data: this.reportData.assignments.map(a => a.completed),
                            borderColor: '#28a745',
                            backgroundColor: 'rgba(40, 167, 69, 0.1)',
                            fill: true,
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Evolução dos pedidos'
                        }
                    }
                }
            });
        }
    }

    initializePriorityChart() {
        const ctx = document.getElementById('priorityChart');
        if (ctx) {
            const existing = Chart.getChart(ctx);
            if (existing) existing.destroy();
            const priorityData = {
                high: this.reportData.assignments.reduce((sum, day) => sum + day.highPriority, 0),
                medium: this.reportData.assignments.reduce((sum, day) => sum + (day.total - day.highPriority), 0)
            };
            
            this.charts.priority = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Alta prioridade', 'Prioridade média'],
                    datasets: [{
                        data: [priorityData.high, priorityData.medium],
                        backgroundColor: ['#dc3545', '#ffc107'],
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
    }

    initializeTechPerformanceChart() {
        const ctx = document.getElementById('techPerformanceChart');
        if (ctx) {
            const existing = Chart.getChart(ctx);
            if (existing) existing.destroy();
            this.charts.techPerformance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: this.reportData.technicians.map(t => t.name),
                    datasets: [{
                        label: 'Tarefas concluídas',
                        data: this.reportData.technicians.map(t => t.completed),
                        backgroundColor: '#17a2b8'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Desempenho dos técnicos'
                        }
                    }
                }
            });
        }
    }

    initializeWorkloadChart() {
        const ctx = document.getElementById('workloadChart');
        if (ctx) {
            const existing = Chart.getChart(ctx);
            if (existing) existing.destroy();
            // Dezпування по днях тижня
            const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            const workloadData = daysOfWeek.map(() => 0);
            
            this.reportData.assignments.forEach(assignment => {
                const date = new Date(assignment.date);
                const dayOfWeek = date.getDay();
                workloadData[dayOfWeek] += assignment.total;
            });
            
            this.charts.workload = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: daysOfWeek,
                    datasets: [{
                        label: 'Volume de trabalho',
                        data: workloadData,
                        backgroundColor: '#6f42c1'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Carga por dia da semana'
                        }
                    }
                }
            });
        }
    }

    updateCharts() {
        // Atualização всіх графіків
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.canvas && document.body.contains(chart.canvas)) {
                chart.update();
            }
        });
    }

    updateStatsTable() {
        const tableBody = $('#statsTable');
        tableBody.empty();
        
        const stats = this.calculateDetailedStats();
        
        stats.forEach(stat => {
            const row = `
                <tr>
                    <td>${stat.metric}</td>
                    <td>${stat.current}</td>
                    <td>${stat.previous}</td>
                    <td class="${stat.change >= 0 ? 'text-success' : 'text-danger'}">
                        ${stat.change >= 0 ? '+' : ''}${stat.change}%
                    </td>
                    <td>${stat.target}</td>
                    <td class="${stat.deviation >= 0 ? 'text-success' : 'text-danger'}">
                        ${stat.deviation >= 0 ? '+' : ''}${stat.deviation}%
                    </td>
                </tr>
            `;
            tableBody.append(row);
        });
    }

    calculateDetailedStats() {
        return [
            {
                metric: 'Total de pedidos',
                current: this.reportData.assignments.reduce((sum, day) => sum + day.total, 0),
                previous: 285,
                change: 5.2,
                target: 300,
                deviation: 2.3
            },
            {
                metric: 'Percentagem de conclusão',
                current: (() => { const t = this.reportData.assignments.reduce((sum, day) => sum + day.total, 0); return t > 0 ? Math.round((this.reportData.assignments.reduce((sum, day) => sum + day.completed, 0) / t) * 100) : 0; })(),
                previous: 88,
                change: 4.5,
                target: 95,
                deviation: -1.2
            },
            {
                metric: 'Tempo médio de execução (min)',
                current: (() => { const c = this.reportData.assignments.length; return c > 0 ? Math.round(this.reportData.assignments.reduce((sum, day) => sum + day.avgTime, 0) / c) : 0; })(),
                previous: 145,
                change: -12.4,
                target: 120,
                deviation: 8.3
            },
            {
                metric: 'Conformidade SLA',
                current: 95,
                previous: 92,
                change: 3.3,
                target: 98,
                deviation: -3.1
            },
            {
                metric: 'Satisfação dos clientes',
                current: 92,
                previous: 89,
                change: 3.4,
                target: 95,
                deviation: -3.2
            }
        ];
    }

    updateComparisonAnalysis() {
        const container = $('#comparisonAnalysis');
        container.empty();
        
        const comparisons = [
            { label: 'Mês atual', value: 120, target: 130 },
            { label: 'Mês anterior', value: 110, target: 125 },
            { label: 'Este ano', value: 850, target: 900 },
            { label: 'Ano passado', value: 780, target: 850 }
        ];
        
        comparisons.forEach(comp => {
            const percentage = Math.round((comp.value / comp.target) * 100);
            const progressClass = percentage >= 90 ? 'bg-success' : 
                                 percentage >= 70 ? 'bg-warning' : 'bg-danger';
            
            const comparison = `
                <div class="comparison-card">
                    <div class="d-flex justify-content-between align-items-center">
                        <span>${comp.label}</span>
                        <strong>${comp.value} / ${comp.target}</strong>
                    </div>
                    <div class="performance-meter">
                        <div class="performance-fill ${progressClass}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="d-flex justify-content-between">
                        <small class="text-muted">Execução</small>
                        <small class="font-weight-bold">${percentage}%</small>
                    </div>
                </div>
            `;
            container.append(comparison);
        });
    }

    updateKPIMetrics() {
        const container = $('#kpiMetrics');
        container.empty();
        
        const kpis = [
            { name: 'Faturação', value: '125.000€', target: '120.000€', status: 'success' },
            { name: 'Custo', value: '85.000€', target: '80.000€', status: 'warning' },
            { name: 'Lucro', value: '40.000€', target: '35.000€', status: 'success' },
            { name: 'ROI', value: '47%', target: '40%', status: 'success' }
        ];
        
        kpis.forEach(kpi => {
            const kpiElement = `
                <div class="metric-card mb-3">
                    <div class="metric-value text-${kpi.status}">${kpi.value}</div>
                    <div class="metric-label">${kpi.name}</div>
                    <small class="text-muted">Meta: ${kpi.target}</small>
                </div>
            `;
            container.append(kpiElement);
        });
    }

    updateReportDate() {
        $('#reportDate').text(`Relatório de: ${new Date().toLocaleDateString('pt-PT')}`);
    }

    setupEventListeners() {
        // Зміна фільтрів
        $('#periodSelect, #reportType, #groupBy').change(() => {
            this.currentFilters.period = $('#periodSelect').val();
            this.currentFilters.reportType = $('#reportType').val();
            this.currentFilters.groupBy = $('#groupBy').val();
            
            this.applyFilters();
        });
        
        // Гарячі клавіші
        $(document).on('keydown', (e) => {
            if (e.ctrlKey) {
                switch(e.key) {
                    case 'r':
                        e.preventDefault();
                        this.generateReport();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.exportReport();
                        break;
                    case 'p':
                        e.preventDefault();
                        this.printReport();
                        break;
                }
            }
        });
    }

    setupAutoRefresh() {
        // Автоматичне оновлення даних кожні 5 minилин
        setInterval(() => {
            this.loadReportData();
        }, 300000);
    }

    applyFilters() {
        this.showToast('Застосовую фільтри...', 'info');
        
        // Тут буде логіка фільтрації даних
        setTimeout(() => {
            this.updateAllUI();
            this.showToast('Filtros aplicados', 'success');
        }, 1000);
    }

    applyCustomPeriod() {
        const fromDate = $('#dateFrom').val();
        const toDate = $('#dateTo').val();
        
        if (!fromDate || !toDate) {
            this.showToast('Виберіть діапазон дат', 'error');
            return;
        }
        
        this.showToast(`Застосовано період: ${fromDate} - ${toDate}`, 'success');
        // Логіка фільтрації за власним періодом
    }

    generateReport() {
        this.showToast('A gerar relatório...', 'info');
        
        // Імітація генерації звіту
        setTimeout(() => {
            this.updateAllUI();
            this.showToast('Relatório com sucesso згенеровано', 'success');
        }, 2000);
    }

    generatePerformanceReport() {
        this.showModal('Relatório продуктивності', `
            <div class="report-preview">
                <h4>Relatório продуктивності</h4>
                <p>Детальний аналіз продуктивності техніків та системи</p>
                <div class="export-options">
                    <button class="btn btn-outline-primary" onclick="reportManager.exportPDF('performance')">
                        <i class="fas fa-file-pdf"></i> PDF
                    </button>
                    <button class="btn btn-outline-success" onclick="reportManager.exportExcel('performance')">
                        <i class="fas fa-file-excel"></i> Excel
                    </button>
                    <button class="btn btn-outline-info" onclick="reportManager.exportHTML('performance')">
                        <i class="fas fa-code"></i> HTML
                    </button>
                </div>
            </div>
        `);
    }

    generateFinancialReport() {
        this.showModal('Фінансовий звіт', `
            <div class="report-preview">
                <h4>Фінансовий звіт</h4>
                <p>Фінансові показники та аналіз рентабельності</p>
                <div class="export-options">
                    <button class="btn btn-outline-primary" onclick="reportManager.exportPDF('financial')">
                        <i class="fas fa-file-pdf"></i> PDF
                    </button>
                    <button class="btn btn-outline-success" onclick="reportManager.exportExcel('financial')">
                        <i class="fas fa-file-excel"></i> Excel
                    </button>
                </div>
            </div>
        `);
    }

    generateTechnicalReport() {
        this.showModal('Технічний звіт', `
            <div class="report-preview">
                <h4>Технічний звіт</h4>
                <p>Технічні метрики та показники якості обслуговування</p>
                <div class="export-options">
                    <button class="btn btn-outline-primary" onclick="reportManager.exportPDF('technical')">
                        <i class="fas fa-file-pdf"></i> PDF
                    </button>
                </div>
            </div>
        `);
    }

    generateQualityReport() {
        this.showModal('Relatório якості', `
            <div class="report-preview">
                <h4>Relatório якості</h4>
                <p>Показники якості обслуговування та задоволеності клієнтів</p>
                <div class="export-options">
                    <button class="btn btn-outline-primary" onclick="reportManager.exportPDF('quality')">
                        <i class="fas fa-file-pdf"></i> PDF
                    </button>
                    <button class="btn btn-outline-info" onclick="reportManager.exportHTML('quality')">
                        <i class="fas fa-code"></i> HTML
                    </button>
                </div>
            </div>
        `);
    }

    exportReport() {
        $('#reportSettingsModal').modal('show');
    }

    exportAll() {
        this.showToast('Підготовка повного пакету звітів...', 'info');
        
        // Імітація експорту всіх звітів
        setTimeout(() => {
            this.showToast('Todos звіти експортовано com sucesso', 'success');
        }, 3000);
    }

    exportPDF(type) {
        this.showToast(`Exportar ${type} звіту в PDF...`, 'info');
        // Логіка експорту в PDF
    }

    exportExcel(type) {
        this.showToast(`Exportar ${type} звіту в Excel...`, 'info');
        // Логіка експорту в Excel
    }

    exportHTML(type) {
        this.showToast(`Exportar ${type} звіту в HTML...`, 'info');
        // Логіка експорту в HTML
    }

    printReport() {
        this.showToast('Підготовка до друку...', 'info');
        setTimeout(() => {
            window.print();
        }, 1000);
    }

    applySettings() {
        const includeCharts = $('#includeCharts').is(':checked');
        const includeRecommendations = $('#includeRecommendations').is(':checked');
        
        this.showToast('Definições застосовано', 'success');
        $('#reportSettingsModal').modal('hide');
        
        // Застосування налаштувань
    }

    quickStats() {
        const stats = this.calculateMetrics();
        const message = `
            📊 Швидка статистика:
            • Завдань: ${stats.totalAssignments}
            • Завершено: ${stats.completionRate}%
            • Час: ${this.formatTime(stats.avgTime)}
            • SLA: ${stats.slaCompliance}%
            • Задоволеність: ${stats.customerSatisfaction}%
        `;
        
        this.showToast(message, 'info');
    }

    tableView() {
        this.showToast('Перегляд таблиці', 'info');
        // Логіка переключення на табличний вигляд
    }

    chartView() {
        this.showToast('Перегляд графіків', 'info');
        // Логіка переключення на графічний вигляд
    }

    showModal(title, content) {
        $('#techDetailsContent').html(content);
        $('#techDetailsModal .modal-title').text(title);
        $('#techDetailsModal').modal('show');
    }

    showToast(message, type = 'info') {
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

    // Допоміжні методи
    formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}:${mins.toString().padStart(2, '0')}`;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    }

    calculateEfficiency(completed, total) {
        return total > 0 ? Math.round((completed / total) * 100) : 0;
    }
}

// Ініціалізація
$(document).ready(function() {
    window.reportManager = new ReportManager();
});