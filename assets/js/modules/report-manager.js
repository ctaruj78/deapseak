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
            const [assignmentsRes, techsRes, customersRes, financialsRes] = await Promise.all([
                fetch('../api/assignments/reports'),
                fetch('../api/technicians/performance'),
                fetch('../api/customers/satisfaction'),
                fetch('../api/financials/reports')
            ]);

            if (assignmentsRes.ok && techsRes.ok && customersRes.ok && financialsRes.ok) {
                this.reportData = {
                    assignments: await assignmentsRes.json(),
                    technicians: await techsRes.json(),
                    customers: await customersRes.json(),
                    financials: await financialsRes.json()
                };
                
                localStorage.setItem('reportData', JSON.stringify(this.reportData));
            } else {
                throw new Error('API недоступне');
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
        
        if (this.reportData.assignments.length === 0) {
            this.createSampleData();
        }
    }

    createSampleData() {
        // Створення зразкових даних для демонстрації
        const now = new Date();
        const assignments = [];
        
        // Генерація даних за останні 30 днів
        for (let i = 0; i < 30; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            
            assignments.push({
                date: date.toISOString().split('T')[0],
                total: Math.floor(Math.random() * 20) + 10,
                completed: Math.floor(Math.random() * 18) + 8,
                inProgress: Math.floor(Math.random() * 5) + 2,
                highPriority: Math.floor(Math.random() * 5) + 1,
                avgTime: Math.floor(Math.random() * 120) + 60,
                revenue: Math.floor(Math.random() * 5000) + 2000
            });
        }
        
        this.reportData = {
            assignments: assignments.reverse(),
            technicians: [
                { id: 'TECH-001', name: 'Іван Петренко', completed: 45, efficiency: 92, rating: 4.8 },
                { id: 'TECH-002', name: 'Марія Коваленко', completed: 38, efficiency: 88, rating: 4.9 },
                { id: 'TECH-003', name: 'Петро Сидоренко', completed: 32, efficiency: 85, rating: 4.6 }
            ],
            customers: [
                { rating: 5, count: 45 },
                { rating: 4, count: 30 },
                { rating: 3, count: 15 },
                { rating: 2, count: 7 },
                { rating: 1, count: 3 }
            ],
            financials: {
                totalRevenue: 125000,
                totalCost: 85000,
                profit: 40000,
                averageTicket: 2500
            }
        };
        
        localStorage.setItem('reportData', JSON.stringify(this.reportData));
    }

    updateAllUI() {
        this.updateMetrics();
        this.updateCharts();
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
        $('#slaCompliance').text(metrics.slaCompliance + '%');
        $('#escalations').text(metrics.escalations);
        $('#customerSatisfaction').text(metrics.customerSatisfaction + '%');
        
        // Оновлення трендів
        this.updateTrends();
    }

    calculateMetrics() {
        const totalAssignments = this.reportData.assignments.reduce((sum, day) => sum + day.total, 0);
        const completedAssignments = this.reportData.assignments.reduce((sum, day) => sum + day.completed, 0);
        const totalTime = this.reportData.assignments.reduce((sum, day) => sum + day.avgTime, 0);
        
        return {
            totalAssignments: totalAssignments,
            completionRate: Math.round((completedAssignments / totalAssignments) * 100),
            avgTime: totalTime / this.reportData.assignments.length,
            slaCompliance: 95, // Приклад значення
            escalations: Math.floor(totalAssignments * 0.05),
            customerSatisfaction: 92 // Приклад значення
        };
    }

    updateTrends() {
        // Імітація трендів
        const trends = {
            assignments: '+5%',
            completion: '+2%',
            time: '-10%',
            sla: '0%',
            escalations: '-15%',
            satisfaction: '+3%'
        };
        
        $('#assignmentsTrend').text(trends.assignments).attr('class', 'trend-indicator trend-up');
        $('#completionTrend').text(trends.completion).attr('class', 'trend-indicator trend-up');
        $('#timeTrend').text(trends.time).attr('class', 'trend-indicator trend-down');
        $('#slaTrend').text(trends.sla).attr('class', 'trend-indicator trend-neutral');
        $('#escalationsTrend').text(trends.escalations).attr('class', 'trend-indicator trend-down');
        $('#satisfactionTrend').text(trends.satisfaction).attr('class', 'trend-indicator trend-up');
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
            this.charts.performance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: this.reportData.assignments.map(a => a.date),
                    datasets: [
                        {
                            label: 'Всього заявок',
                            data: this.reportData.assignments.map(a => a.total),
                            borderColor: '#007bff',
                            backgroundColor: 'rgba(0, 123, 255, 0.1)',
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Завершено',
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
                            text: 'Динаміка заявок'
                        }
                    }
                }
            });
        }
    }

    initializePriorityChart() {
        const ctx = document.getElementById('priorityChart');
        if (ctx) {
            const priorityData = {
                high: this.reportData.assignments.reduce((sum, day) => sum + day.highPriority, 0),
                medium: this.reportData.assignments.reduce((sum, day) => sum + (day.total - day.highPriority), 0)
            };
            
            this.charts.priority = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Високий пріоритет', 'Середній пріоритет'],
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
            this.charts.techPerformance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: this.reportData.technicians.map(t => t.name),
                    datasets: [{
                        label: 'Завершено завдань',
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
                            text: 'Продуктивність техніків'
                        }
                    }
                }
            });
        }
    }

    initializeWorkloadChart() {
        const ctx = document.getElementById('workloadChart');
        if (ctx) {
            // Групування по днях тижня
            const daysOfWeek = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
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
                        label: 'Завантаження',
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
                            text: 'Завантаження по днях тижня'
                        }
                    }
                }
            });
        }
    }

    updateCharts() {
        // Оновлення всіх графіків
        Object.values(this.charts).forEach(chart => {
            if (chart) {
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
                metric: 'Загальна кількість заявок',
                current: this.reportData.assignments.reduce((sum, day) => sum + day.total, 0),
                previous: 285,
                change: 5.2,
                target: 300,
                deviation: 2.3
            },
            {
                metric: 'Відсоток завершення',
                current: Math.round((this.reportData.assignments.reduce((sum, day) => sum + day.completed, 0) / 
                                  this.reportData.assignments.reduce((sum, day) => sum + day.total, 0)) * 100),
                previous: 88,
                change: 4.5,
                target: 95,
                deviation: -1.2
            },
            {
                metric: 'Середній час виконання (хв)',
                current: Math.round(this.reportData.assignments.reduce((sum, day) => sum + day.avgTime, 0) / 
                                  this.reportData.assignments.length),
                previous: 145,
                change: -12.4,
                target: 120,
                deviation: 8.3
            },
            {
                metric: 'Відповідність SLA',
                current: 95,
                previous: 92,
                change: 3.3,
                target: 98,
                deviation: -3.1
            },
            {
                metric: 'Задоволеність клієнтів',
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
            { label: 'Поточний місяць', value: 120, target: 130 },
            { label: 'Попередній місяць', value: 110, target: 125 },
            { label: 'Цього року', value: 850, target: 900 },
            { label: 'Минулого року', value: 780, target: 850 }
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
                        <small class="text-muted">Виконання</small>
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
            { name: 'Оборот', value: '125,000₴', target: '120,000₴', status: 'success' },
            { name: 'Вартість', value: '85,000₴', target: '80,000₴', status: 'warning' },
            { name: 'Прибуток', value: '40,000₴', target: '35,000₴', status: 'success' },
            { name: 'ROI', value: '47%', target: '40%', status: 'success' }
        ];
        
        kpis.forEach(kpi => {
            const kpiElement = `
                <div class="metric-card mb-3">
                    <div class="metric-value text-${kpi.status}">${kpi.value}</div>
                    <div class="metric-label">${kpi.name}</div>
                    <small class="text-muted">Ціль: ${kpi.target}</small>
                </div>
            `;
            container.append(kpiElement);
        });
    }

    updateReportDate() {
        $('#reportDate').text(`Звіт на: ${new Date().toLocaleDateString('uk-UA')}`);
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
        // Автоматичне оновлення даних кожні 5 хвилин
        setInterval(() => {
            this.loadReportData();
        }, 300000);
    }

    applyFilters() {
        this.showToast('Застосовую фільтри...', 'info');
        
        // Тут буде логіка фільтрації даних
        setTimeout(() => {
            this.updateAllUI();
            this.showToast('Фільтри застосовано', 'success');
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
        this.showToast('Генерація звіту...', 'info');
        
        // Імітація генерації звіту
        setTimeout(() => {
            this.updateAllUI();
            this.showToast('Звіт успішно згенеровано', 'success');
        }, 2000);
    }

    generatePerformanceReport() {
        this.showModal('Звіт продуктивності', `
            <div class="report-preview">
                <h4>Звіт продуктивності</h4>
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
        this.showModal('Звіт якості', `
            <div class="report-preview">
                <h4>Звіт якості</h4>
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
            this.showToast('Всі звіти експортовано успішно', 'success');
        }, 3000);
    }

    exportPDF(type) {
        this.showToast(`Експорт ${type} звіту в PDF...`, 'info');
        // Логіка експорту в PDF
    }

    exportExcel(type) {
        this.showToast(`Експорт ${type} звіту в Excel...`, 'info');
        // Логіка експорту в Excel
    }

    exportHTML(type) {
        this.showToast(`Експорт ${type} звіту в HTML...`, 'info');
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
        
        this.showToast('Налаштування застосовано', 'success');
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
        $.notify(message, {
            className: type,
            position: 'bottom right',
            autoHideDelay: 3000
        });
    }

    // Допоміжні методи
    formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}:${mins.toString().padStart(2, '0')}`;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('uk-UA', {
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