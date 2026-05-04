class AnalyticsDashboard {
    constructor() {
        this.charts = {};
        this.data = {};
        this.init();
    }

    async init() {
        await this.loadData();
        this.initializeCharts();
        this.setupEventListeners();
        this.updateKPICards();
    }

    async loadData() {
        // A carregar даних для аналітики
        this.data = {
            maintenance: await this.loadMaintenanceData(),
            financial: await this.loadFinancialData(),
            performance: await this.loadPerformanceData(),
            usage: await this.loadUsageData(),
            lifts: await this.loadLiftsData()
        };
    }

    async loadMaintenanceData() {
        const lifts = JSON.parse(localStorage.getItem('lifts')) || [];
        const requests = JSON.parse(localStorage.getItem('maintenanceRequests')) || [];
        
        // Обробка даних для аналітики Manutenção
        return {
            totalMaintenance: requests.length,
            completed: requests.filter(r => r.status === 'completed').length,
            pending: requests.filter(r => r.status === 'pending').length,
            averageTime: this.calculateAverageTime(requests),
            byType: this.groupByMaintenanceType(requests),
            weeklyData: this.generateWeeklyData(requests)
        };
    }

    generateWeeklyData(requests) {
        // Генерація тижневих даних для графіка
        const days = ['Понеділок', 'Вівторок', 'Agoеда', 'Четвер', 'П\'ятниця', 'Субота', 'Неділя'];
        const weeklyData = {};
        
        days.forEach(day => {
            weeklyData[day] = Math.floor(Math.random() * 10) + 5; // Випадкові дані для прикладу
        });
        
        return weeklyData;
    }

    calculateAverageTime(requests) {
        const completedRequests = requests.filter(r => r.status === 'completed' && r.startedAt && r.completedAt);
        if (completedRequests.length === 0) return 0;

        const totalTime = completedRequests.reduce((sum, req) => {
            const start = new Date(req.startedAt);
            const end = new Date(req.completedAt);
            return sum + (end - start);
        }, 0);

        return Math.round(totalTime / completedRequests.length / 60000); // Повертаємо в хвилинах
    }

    groupByMaintenanceType(requests) {
        const types = {};
        requests.forEach(req => {
            const type = req.type || 'regular';
            types[type] = (types[type] || 0) + 1;
        });
        return types;
    }

    async loadFinancialData() {
        // A carregar фінансових даних
        const invoices = JSON.parse(localStorage.getItem('invoices')) || [];
        
        return {
            totalRevenue: invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
            paid: invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.amount || 0), 0),
            overdue: invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + (inv.amount || 0), 0),
            byMonth: this.groupFinancialByMonth(invoices),
            monthlyData: this.generateMonthlyData()
        };
    }

    generateMonthlyData() {
        // Генерація місячних даних для графіка
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho'];
        const monthlyData = [];
        
        months.forEach(() => {
            monthlyData.push(Math.floor(Math.random() * 20000) + 10000); // Випадкові дані для прикладу
        });
        
        return monthlyData;
    }

    groupFinancialByMonth(invoices) {
        const months = {};
        invoices.forEach(inv => {
            if (inv.date) {
                const month = new Date(inv.date).toLocaleString('pt-PT', { month: 'long', year: 'numeric' });
                months[month] = (months[month] || 0) + (inv.amount || 0);
            }
        });
        return months;
    }

    async loadPerformanceData() {
        const technicians = JSON.parse(localStorage.getItem('users'))?.filter(u => u.role === 'technician') || [];
        const requests = JSON.parse(localStorage.getItem('maintenanceRequests')) || [];
        
        const performance = {};
        technicians.forEach(tech => {
            const techRequests = requests.filter(r => r.assignedTo === tech.id);
            performance[tech.id] = {
                name: `${tech.firstName} ${tech.lastName}`,
                total: techRequests.length,
                completed: techRequests.filter(r => r.status === 'completed').length,
                averageTime: this.calculateTechAverageTime(techRequests),
                rating: this.calculateTechRating(techRequests)
            };
        });

        return performance;
    }

    calculateTechAverageTime(requests) {
        const completed = requests.filter(r => r.status === 'completed' && r.startedAt && r.completedAt);
        if (completed.length === 0) return 0;

        const totalTime = completed.reduce((sum, req) => {
            const start = new Date(req.startedAt);
            const end = new Date(req.completedAt);
            return sum + (end - start);
        }, 0);

        return Math.round(totalTime / completed.length / 60000);
    }

    calculateTechRating(requests) {
        const completed = requests.filter(r => r.status === 'completed');
        if (completed.length === 0) return 0;

        const ratings = completed.map(r => r.rating || 5); // Припускаємо рейтинг 5 за замовчуванням
        return (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1);
    }

    async loadUsageData() {
        // Дані використання системи
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const loginHistory = JSON.parse(localStorage.getItem('loginHistory')) || [];
        
        return {
            activeUsers: users.filter(u => u.status === 'active').length,
            totalLogins: loginHistory.length,
            dailyAverage: this.calculateDailyAverage(loginHistory),
            byRole: this.groupUsageByRole(loginHistory, users)
        };
    }

    calculateDailyAverage(loginHistory) {
        const loginsByDate = {};
        loginHistory.forEach(login => {
            const date = new Date(login.timestamp).toDateString();
            loginsByDate[date] = (loginsByDate[date] || 0) + 1;
        });

        const dates = Object.keys(loginsByDate);
        if (dates.length === 0) return 0;

        return Math.round(Object.values(loginsByDate).reduce((sum, count) => sum + count, 0) / dates.length);
    }

    groupUsageByRole(loginHistory, users) {
        const usageByRole = {};
        loginHistory.forEach(login => {
            const user = users.find(u => u.id === login.userId);
            if (user) {
                usageByRole[user.role] = (usageByRole[user.role] || 0) + 1;
            }
        });
        return usageByRole;
    }

    async loadLiftsData() {
        const lifts = JSON.parse(localStorage.getItem('lifts')) || [];
        
        return {
            total: lifts.length,
            active: lifts.filter(l => l.status === 'active').length,
            maintenance: lifts.filter(l => l.status === 'maintenance').length,
            inactive: lifts.filter(l => l.status === 'inactive').length
        };
    }

    initializeCharts() {
        this.createMaintenanceChart();
        this.createLiftsStatusChart();
        this.createPerformanceChart();
        this.createFinancialChart();
        this.createTrendsChart();
    }

    createMaintenanceChart() {
        const ctx = document.getElementById('maintenanceChart').getContext('2d');
        const weeklyData = this.data.maintenance.weeklyData;
        
        this.charts.maintenance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(weeklyData),
                datasets: [{
                    label: 'Quantidade de manutenções',
                    data: Object.values(weeklyData),
                    backgroundColor: 'rgba(60, 141, 188, 0.8)',
                    borderColor: 'rgba(60, 141, 188, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Щотижнева активність Manutenção'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    createLiftsStatusChart() {
        const ctx = document.getElementById('liftsStatusChart').getContext('2d');
        
        this.charts.liftsStatus = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Активні', 'Em manutenção', 'Неактивні'],
                datasets: [{
                    data: [
                        this.data.lifts.active,
                        this.data.lifts.maintenance,
                        this.data.lifts.inactive
                    ],
                    backgroundColor: [
                        'rgba(40, 167, 69, 0.8)',
                        'rgba(255, 193, 7, 0.8)',
                        'rgba(220, 53, 69, 0.8)'
                    ],
                    borderColor: [
                        'rgba(40, 167, 69, 1)',
                        'rgba(255, 193, 7, 1)',
                        'rgba(220, 53, 69, 1)'
                    ],
                    borderWidth: 1
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

    createPerformanceChart() {
        const ctx = document.getElementById('performanceChart').getContext('2d');
        
        this.charts.performance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Velocidade', 'Qualidade', 'Надійність', 'Ефективність', 'Комуникація'],
                datasets: [{
                    label: 'Agoедня оцінка',
                    data: [4.5, 4.8, 4.3, 4.6, 4.7],
                    fill: true,
                    backgroundColor: 'rgba(60, 141, 188, 0.2)',
                    borderColor: 'rgb(60, 141, 188)',
                    pointBackgroundColor: 'rgb(60, 141, 188)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(60, 141, 188)'
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

    createFinancialChart() {
        const ctx = document.getElementById('financialChart').getContext('2d');
        const monthlyData = this.data.financial.monthlyData;
        
        this.charts.financial = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Кві', 'Mai', 'Jun'],
                datasets: [{
                    label: 'Доходи',
                    data: monthlyData,
                    borderColor: 'rgb(255, 193, 7)',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString('pt-PT') + ' ₴';
                            }
                        }
                    }
                }
            }
        });
    }

    createTrendsChart() {
        const ctx = document.getElementById('trendsChart').getContext('2d');
        
        this.charts.trends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Кві', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                datasets: [{
                    label: 'Indicadores reais',
                    data: [65, 59, 80, 81, 56, 55, 72, 68, 75, 82, 78, 85],
                    borderColor: 'rgb(220, 53, 69)',
                    tension: 0.1,
                    fill: false
                }, {
                    label: 'Прогноз',
                    data: [null, null, null, null, null, null, 72, 68, 75, 82, 78, 85, 90, 88, 92],
                    borderColor: 'rgb(40, 167, 69)',
                    borderDash: [5, 5],
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    setupEventListeners() {
        document.getElementById('timePeriod').addEventListener('change', () => this.updateCharts());
        document.getElementById('analyticsType').addEventListener('change', () => this.updateCharts());
    }

    updateCharts() {
        const period = document.getElementById('timePeriod').value;
        const analyticsType = document.getElementById('analyticsType').value;

        // Atualização даних графіків на основі вибраних параметрів
        this.refreshChartData(period, analyticsType);
        this.updateKPICards();
    }

    refreshChartData(period, analyticsType) {
        // Atualização даних для всіх графіків
        Object.values(this.charts).forEach(chart => {
            chart.update();
        });
    }

    updateKPICards() {
        // Atualização карток з ключовими показниками
        document.getElementById('totalMaintenance').textContent = this.data.maintenance.totalMaintenance;
        document.getElementById('completedRequests').textContent = this.data.maintenance.completed;
        document.getElementById('totalRevenue').textContent = this.formatCurrency(this.data.financial.totalRevenue);
        document.getElementById('activeLifts').textContent = this.data.lifts.active;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('pt-PT', { 
            style: 'currency', 
            currency: 'EUR',
            minimumFractionDigits: 0 
        }).format(amount);
    }

    exportChartData() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'analytics-data.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    generateReport() {
        const reportData = {
            generatedAt: new Date().toISOString(),
            period: document.getElementById('timePeriod').value,
            analyticsType: document.getElementById('analyticsType').value,
            data: this.data
        };

        this.downloadReport(reportData);
    }

    downloadReport(data) {
        const template = this.getReportTemplate();
        const htmlContent = template.replace('{{REPORT_DATA}}', JSON.stringify(data, null, 2));
        
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.html`;
        link.click();
    }

    getReportTemplate() {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Аналітичний звіт</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .section { margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Аналітичний звіт</h1>
                    <p>Згенеровано: ${new Date().toLocaleString('pt-PT')}</p>
                </div>
                <pre>{{REPORT_DATA}}</pre>
            </body>
            </html>
        `;
    }

    showNotification(message, type = 'info') {
        // Використання toast-сповіщень AdminLTE
        const toast = $(`<div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <strong class="mr-auto">Análise</strong>
                <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>`);

        // Додавання класу в залежності від типу
        if (type === 'success') {
            toast.find('.toast-header').addClass('bg-success text-white');
        } else if (type === 'error') {
            toast.find('.toast-header').addClass('bg-danger text-white');
        } else if (type === 'warning') {
            toast.find('.toast-header').addClass('bg-warning text-dark');
        } else {
            toast.find('.toast-header').addClass('bg-info text-white');
        }

        // Додавання до контейнера toast
        $('#toastContainer').append(toast);
        toast.toast({ delay: 3000 });
        toast.toast('show');

        // Автоматичне видалення після закриття
        toast.on('hidden.bs.toast', function () {
            $(this).remove();
        });
    }
}

// Додаємо контейнер для toast-сповіщень
if (!document.getElementById('toastContainer')) {
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);
}

// Ініціалізація аналітичної панелі
document.addEventListener('DOMContentLoaded', function() {
    window.analyticsDashboard = new AnalyticsDashboard();
});