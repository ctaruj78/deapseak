/**
 * 📊 Unified Analytics Engine для DeapSeaK
 * Об'єднана система аналітики, що замінює всі існуючі модулі
 * 
 * Об'єднує функціонал з:
 * - analytics-dashboard.js
 * - smart-analytics-engine.js  
 * - predictive-maintenance.js
 * - crm-unified.js
 * - scan-analytics.js
 */

class UnifiedAnalyticsEngine {
    constructor() {
        this.charts = {};
        this.data = {};
        this.cache = new Map();
        this.predictions = new Map();
        this.realTimeUpdateInterval = null;
        
        // Конфігурація
        this.config = {
            updateInterval: 30000, // 30 секунд
            alertThresholds: {
                liftsOffline: 5,
                maintenanceOverdue: 3,
                qrScansDropped: 20,
                systemLoad: 80
            },
            charts: {
                colors: {
                    primary: '#007bff',
                    success: '#28a745',
                    warning: '#ffc107',
                    danger: '#dc3545',
                    info: '#17a2b8',
                    purple: '#6f42c1'
                }
            }
        };
        
        this.init();
    }

    async init() {
        console.log('🚀 Ініціалізація Unified Analytics Engine...');
        
        try {
            // Завантажуємо дані
            await this.loadAllData();
            
            // Ініціалізуємо графіки
            this.initializeCharts();
            
            // Налаштовуємо обробники подій
            this.setupEventListeners();
            
            // Ініціалізуємо обробку табів
            this.initTabHandlers();
            
            // Оновлюємо KPI
            this.updateKPICards();
            
            // Перевіряємо алерти
            this.checkAlerts();
            
            // Генеруємо AI рекомендації
            this.generateAIRecommendations();
            
            // Запускаємо реал-тайм оновлення
            this.startRealTimeUpdates();
            
            // Обробляємо хеш URL для автоматичного переключення табів
            this.handleUrlHash();
            
            // Додаємо обробник зміни хешу
            window.addEventListener('hashchange', () => {
                this.handleUrlHash();
            });
            
            console.log('✅ Unified Analytics Engine готовий!');
            
        } catch (error) {
            console.error('❌ Помилка ініціалізації Analytics Engine:', error);
            this.showError('Помилка завантаження аналітичних даних');
        }
    }

    /**
     * 📥 Завантаження всіх даних з різних джерел
     */
    async loadAllData() {
        console.log('📚 Завантаження аналітичних даних...');
        
        // Завантажуємо основні дані
        const lifts = JSON.parse(localStorage.getItem('lifts') || '[]');
        const inspections = JSON.parse(localStorage.getItem('scheduled_inspections') || '[]');
        const qrScans = JSON.parse(localStorage.getItem('qr_scan_history') || '[]');
        const maintenanceRequests = JSON.parse(localStorage.getItem('maintenanceRequests') || '[]');
        const systemLog = JSON.parse(localStorage.getItem('system_critical_log') || '[]');
        
        // Структуруємо дані
        this.data = {
            lifts: {
                raw: lifts,
                total: lifts.length,
                active: lifts.filter(l => l.status === 'active').length,
                maintenance: lifts.filter(l => l.status === 'maintenance').length,
                offline: lifts.filter(l => l.status === 'offline').length,
                locationGroups: this.groupByLocation(lifts)
            },
            
            maintenance: {
                raw: maintenanceRequests,
                total: maintenanceRequests.length,
                pending: maintenanceRequests.filter(r => r.status === 'pending').length,
                inProgress: maintenanceRequests.filter(r => r.status === 'in-progress').length,
                completed: maintenanceRequests.filter(r => r.status === 'completed').length,
                overdue: this.getOverdueMaintenances(maintenanceRequests)
            },
            
            qr: {
                raw: qrScans,
                total: qrScans.length,
                today: this.getScansToday(qrScans),
                thisWeek: this.getScansThisWeek(qrScans),
                topUsers: this.getTopQRUsers(qrScans),
                timeDistribution: this.getQRTimeDistribution(qrScans)
            },
            
            inspections: {
                raw: inspections,
                total: inspections.length,
                upcoming: this.getUpcomingInspections(inspections),
                completed: inspections.filter(i => i.status === 'completed').length,
                overdue: inspections.filter(i => new Date(i.scheduledDate) < new Date() && i.status !== 'completed').length
            },
            
            system: {
                uptime: this.calculateSystemUptime(),
                performance: this.getSystemPerformance(),
                alerts: this.getSystemAlerts(systemLog),
                lastUpdate: new Date().toISOString()
            }
        };
        
        // Кешуємо для швидкого доступу
        this.cache.set('analytics_data', this.data);
        this.cache.set('last_update', Date.now());
        
        console.log('📊 Дані завантажено:', this.data);
    }

    /**
     * 📈 Ініціалізація всіх графіків
     */
    initializeCharts() {
        console.log('📊 Ініціалізація графіків...');
        
        // Overview Chart - загальна активність
        this.initOverviewChart();
        
        // Lifts Charts
        this.initLiftsStatusChart();
        this.initLiftsLocationChart();
        
        // Maintenance Chart
        this.initMaintenanceChart();
        
        // QR Analytics Charts
        this.initQRScansChart();
        this.initQRUsersChart();
        
        // Predictive Chart
        this.initPredictionChart();
    }

    /**
     * 📊 Загальний графік активності
     */
    initOverviewChart() {
        const ctx = document.getElementById('overview-chart');
        if (!ctx) return;

        const data = this.generateOverviewData();
        
        this.charts.overview = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Активність ліфтів',
                    data: data.liftsActivity,
                    borderColor: this.config.charts.colors.primary,
                    backgroundColor: this.config.charts.colors.primary + '20',
                    tension: 0.4
                }, {
                    label: 'QR сканування',
                    data: data.qrActivity,
                    borderColor: this.config.charts.colors.success,
                    backgroundColor: this.config.charts.colors.success + '20',
                    tension: 0.4
                }, {
                    label: 'ТО виконано',
                    data: data.maintenanceActivity,
                    borderColor: this.config.charts.colors.warning,
                    backgroundColor: this.config.charts.colors.warning + '20',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Активність системи за останні 7 днів'
                    },
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f0f0f0'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    /**
     * 🏢 Графік статусів ліфтів
     */
    initLiftsStatusChart() {
        const ctx = document.getElementById('lifts-status-chart');
        if (!ctx) return;

        this.charts.liftsStatus = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Активні', 'На ТО', 'Офлайн', 'Помилки'],
                datasets: [{
                    data: [
                        this.data.lifts.active,
                        this.data.lifts.maintenance,
                        this.data.lifts.offline,
                        Math.floor(Math.random() * 3) // Випадкові помилки для демо
                    ],
                    backgroundColor: [
                        this.config.charts.colors.success,
                        this.config.charts.colors.warning,
                        this.config.charts.colors.info,
                        this.config.charts.colors.danger
                    ]
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

    /**
     * 📍 Географічний розподіл ліфтів
     */
    initLiftsLocationChart() {
        const ctx = document.getElementById('lifts-location-chart');
        if (!ctx) return;

        const locationData = Object.entries(this.data.lifts.locationGroups);
        
        this.charts.liftsLocation = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: locationData.map(([location]) => location || 'Не вказано'),
                datasets: [{
                    label: 'Кількість ліфтів',
                    data: locationData.map(([, count]) => count),
                    backgroundColor: this.config.charts.colors.info,
                    borderColor: this.config.charts.colors.primary,
                    borderWidth: 1
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

    /**
     * 🔧 Графік технічного обслуговування
     */
    initMaintenanceChart() {
        const ctx = document.getElementById('maintenance-chart');
        if (!ctx) return;

        const maintenanceData = this.generateMaintenanceTimelineData();
        
        this.charts.maintenance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: maintenanceData.labels,
                datasets: [{
                    label: 'Планові ТО',
                    data: maintenanceData.planned,
                    borderColor: this.config.charts.colors.success,
                    backgroundColor: this.config.charts.colors.success + '20'
                }, {
                    label: 'Екстрені ТО',
                    data: maintenanceData.emergency,
                    borderColor: this.config.charts.colors.danger,
                    backgroundColor: this.config.charts.colors.danger + '20'
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

    /**
     * 📱 Графік QR сканувань
     */
    initQRScansChart() {
        const ctx = document.getElementById('qr-scans-chart');
        if (!ctx) return;

        this.charts.qrScans = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.data.qr.timeDistribution.labels,
                datasets: [{
                    label: 'Сканування за годинами',
                    data: this.data.qr.timeDistribution.data,
                    backgroundColor: this.config.charts.colors.success,
                    borderColor: this.config.charts.colors.primary,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    /**
     * 👥 Топ користувачів QR
     */
    initQRUsersChart() {
        const ctx = document.getElementById('qr-users-chart');
        if (!ctx) return;

        this.charts.qrUsers = new Chart(ctx, {
            type: 'horizontalBar',
            data: {
                labels: this.data.qr.topUsers.map(u => u.name),
                datasets: [{
                    label: 'Сканувань',
                    data: this.data.qr.topUsers.map(u => u.count),
                    backgroundColor: this.config.charts.colors.purple
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    /**
     * 🔮 Графік прогнозування
     */
    initPredictionChart() {
        const ctx = document.getElementById('prediction-chart');
        if (!ctx) return;

        const predictions = this.generatePredictions();
        
        this.charts.prediction = new Chart(ctx, {
            type: 'line',
            data: {
                labels: predictions.labels,
                datasets: [{
                    label: 'Ймовірність поломки (%)',
                    data: predictions.breakdown,
                    borderColor: this.config.charts.colors.danger,
                    backgroundColor: this.config.charts.colors.danger + '20',
                    tension: 0.4
                }, {
                    label: 'Прогноз навантаження (%)',
                    data: predictions.load,
                    borderColor: this.config.charts.colors.warning,
                    backgroundColor: this.config.charts.colors.warning + '20',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    /**
     * 📊 Оновлення KPI карток
     */
    updateKPICards() {
        // Оновлюємо значення KPI
        this.updateElement('total-lifts', this.data.lifts.total);
        this.updateElement('active-lifts', this.data.lifts.active);
        this.updateElement('qr-scans', this.data.qr.total);
        this.updateElement('maintenance-needed', this.data.maintenance.pending);
        
        // Оновлюємо зміни
        this.updateElement('lifts-change', this.calculateLiftsChange());
        this.updateElement('active-change', this.calculateActiveChange());
        this.updateElement('scans-change', this.calculateScansChange());
        this.updateElement('maintenance-change', this.calculateMaintenanceChange());
    }

    /**
     * ⚠️ Перевірка та відображення алертів
     */
    checkAlerts() {
        const alerts = [];
        
        // Перевіряємо офлайн ліфти
        if (this.data.lifts.offline > this.config.alertThresholds.liftsOffline) {
            alerts.push({
                type: 'critical',
                title: 'Багато ліфтів офлайн',
                message: `${this.data.lifts.offline} ліфтів недоступні`,
                icon: 'fas fa-exclamation-triangle'
            });
        }
        
        // Перевіряємо прострочені ТО
        if (this.data.maintenance.overdue.length > this.config.alertThresholds.maintenanceOverdue) {
            alerts.push({
                type: 'warning',
                title: 'Прострочені ТО',
                message: `${this.data.maintenance.overdue.length} ТО потребують уваги`,
                icon: 'fas fa-clock'
            });
        }
        
        // Перевіряємо падіння QR активності
        const qrDrop = this.calculateQRActivityDrop();
        if (qrDrop > this.config.alertThresholds.qrScansDropped) {
            alerts.push({
                type: 'info',
                title: 'Зниження QR активності',
                message: `Сканування впали на ${qrDrop}%`,
                icon: 'fas fa-chart-line-down'
            });
        }
        
        this.displayAlerts(alerts);
    }

    /**
     * 📺 Відображення алертів
     */
    displayAlerts(alerts) {
        const alertsContainer = document.getElementById('alerts-container');
        const alertsPanel = document.getElementById('alerts-panel');
        
        if (!alertsContainer || !alertsPanel) return;
        
        if (alerts.length === 0) {
            alertsPanel.style.display = 'none';
            return;
        }
        
        alertsPanel.style.display = 'block';
        alertsContainer.innerHTML = alerts.map(alert => `
            <div class="alert-item">
                <div class="alert-icon alert-${alert.type}">
                    <i class="${alert.icon}"></i>
                </div>
                <div class="flex-grow-1">
                    <strong>${alert.title}</strong><br>
                    <small>${alert.message}</small>
                </div>
            </div>
        `).join('');
    }

    /**
     * 🤖 Генерація AI рекомендацій
     */
    generateAIRecommendations() {
        const recommendations = [];
        
        // Аналіз ТО
        if (this.data.maintenance.pending > 5) {
            recommendations.push({
                type: 'maintenance',
                priority: 'high',
                title: 'Оптимізація графіка ТО',
                description: 'Рекомендується перерозподіл навантаження між техніками для зменшення черги ТО.',
                action: 'Переглянути графік'
            });
        }
        
        // Аналіз використання QR
        if (this.data.qr.today < this.data.qr.thisWeek / 7 * 0.5) {
            recommendations.push({
                type: 'qr',
                priority: 'medium',
                title: 'Низька активність QR',
                description: 'Сьогоднішня активність QR сканування нижча за середню. Рекомендується перевірити доступність системи.',
                action: 'Перевірити систему'
            });
        }
        
        // Прогноз поломок
        const riskLifts = this.data.lifts.raw.filter(lift => this.calculateBreakdownRisk(lift) > 70);
        if (riskLifts.length > 0) {
            recommendations.push({
                type: 'prediction',
                priority: 'critical',
                title: 'Високий ризик поломок',
                description: `${riskLifts.length} ліфтів мають високий ризик поломки найближчим часом.`,
                action: 'Планувати ТО'
            });
        }
        
        this.displayAIRecommendations(recommendations);
    }

    /**
     * 💡 Відображення AI рекомендацій
     */
    displayAIRecommendations(recommendations) {
        const container = document.getElementById('ai-recommendations');
        if (!container) return;
        
        container.innerHTML = recommendations.map((rec, index) => `
            <div class="recommendation-item mb-3 p-3 border rounded">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">
                            <i class="fas fa-lightbulb text-warning mr-2"></i>
                            ${rec.title}
                            <span class="badge badge-${rec.priority === 'critical' ? 'danger' : rec.priority === 'high' ? 'warning' : 'info'} ml-2">
                                ${rec.priority}
                            </span>
                        </h6>
                        <p class="mb-2 text-muted small">${rec.description}</p>
                        <button class="btn btn-sm btn-outline-primary" onclick="analyticsEngine.handleRecommendationAction('${rec.type}', ${index})">
                            ${rec.action}
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * ⚡ Реал-тайм оновлення
     */
    startRealTimeUpdates() {
        this.realTimeUpdateInterval = setInterval(async () => {
            try {
                await this.loadAllData();
                this.updateKPICards();
                this.checkAlerts();
                this.updateCharts();
                
                console.log('🔄 Дані оновлено:', new Date().toLocaleTimeString());
                
            } catch (error) {
                console.error('❌ Помилка оновлення даних:', error);
            }
        }, this.config.updateInterval);
    }

    /**
     * 📊 Оновлення всіх графіків
     */
    updateCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.update === 'function') {
                chart.update('none'); // Без анімації для реал-тайм
            }
        });
    }

    /**
     * 🛠️ Допоміжні методи
     */
    
    groupByLocation(lifts) {
        const groups = {};
        lifts.forEach(lift => {
            const location = lift.location || lift.address || 'Не вказано';
            groups[location] = (groups[location] || 0) + 1;
        });
        return groups;
    }

    getOverdueMaintenances(maintenances) {
        const now = new Date();
        return maintenances.filter(m => 
            m.scheduledDate && 
            new Date(m.scheduledDate) < now && 
            m.status !== 'completed'
        );
    }

    getScansToday(scans) {
        const today = new Date().toDateString();
        return scans.filter(scan => 
            scan.timestamp && 
            new Date(scan.timestamp).toDateString() === today
        ).length;
    }

    getScansThisWeek(scans) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return scans.filter(scan => 
            scan.timestamp && 
            new Date(scan.timestamp) > weekAgo
        ).length;
    }

    getTopQRUsers(scans) {
        const userCounts = {};
        scans.forEach(scan => {
            const user = scan.user || 'Анонім';
            userCounts[user] = (userCounts[user] || 0) + 1;
        });
        
        return Object.entries(userCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }

    getQRTimeDistribution(scans) {
        const hours = Array(24).fill(0);
        const labels = Array(24).fill(0).map((_, i) => `${i}:00`);
        
        scans.forEach(scan => {
            if (scan.timestamp) {
                const hour = new Date(scan.timestamp).getHours();
                hours[hour]++;
            }
        });
        
        return { labels, data: hours };
    }

    calculateBreakdownRisk(lift) {
        // Простий алгоритм розрахунку ризику
        let risk = 0;
        
        // Вік ліфта
        if (lift.installDate) {
            const age = (new Date() - new Date(lift.installDate)) / (365.25 * 24 * 60 * 60 * 1000);
            risk += Math.min(age * 2, 30);
        }
        
        // Частота ТО
        risk += Math.random() * 40; // Випадковий компонент для демо
        
        // Тип ліфта
        if (lift.type === 'freight') risk += 10;
        
        return Math.min(risk, 100);
    }

    generateOverviewData() {
        const labels = [];
        const liftsActivity = [];
        const qrActivity = [];
        const maintenanceActivity = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('uk-UA', { weekday: 'short' }));
            
            // Генеруємо випадкові дані для демо
            liftsActivity.push(Math.floor(Math.random() * 50) + 30);
            qrActivity.push(Math.floor(Math.random() * 20) + 10);
            maintenanceActivity.push(Math.floor(Math.random() * 8) + 2);
        }
        
        return { labels, liftsActivity, qrActivity, maintenanceActivity };
    }

    generateMaintenanceTimelineData() {
        const labels = [];
        const planned = [];
        const emergency = [];
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }));
            
            planned.push(Math.floor(Math.random() * 5) + 1);
            emergency.push(Math.floor(Math.random() * 2));
        }
        
        return { labels, planned, emergency };
    }

    generatePredictions() {
        const labels = [];
        const breakdown = [];
        const load = [];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            labels.push(date.toLocaleDateString('uk-UA', { weekday: 'short' }));
            
            // Генеруємо прогнози
            breakdown.push(Math.max(0, Math.min(100, Math.random() * 30 + 10)));
            load.push(Math.max(0, Math.min(100, Math.random() * 40 + 40)));
        }
        
        return { labels, breakdown, load };
    }

    // Розрахунки змін для KPI
    calculateLiftsChange() {
        // Простий розрахунок для демо
        return '+2% цього місяця';
    }

    calculateActiveChange() {
        const percentage = Math.round((this.data.lifts.active / this.data.lifts.total) * 100);
        return `${percentage}% онлайн`;
    }

    calculateScansChange() {
        return '+15% за тиждень';
    }

    calculateMaintenanceChange() {
        return this.data.maintenance.pending > 10 ? 'Потребує уваги' : 'Планово';
    }

    calculateQRActivityDrop() {
        // Для демо повертаємо випадкове значення
        return Math.floor(Math.random() * 25);
    }

    calculateSystemUptime() {
        return 99.9; // Для демо
    }

    getSystemPerformance() {
        return {
            cpu: Math.floor(Math.random() * 30) + 20,
            memory: Math.floor(Math.random() * 40) + 30,
            network: Math.floor(Math.random() * 20) + 5
        };
    }

    getSystemAlerts(log) {
        return log.filter(entry => entry.level === 'error' || entry.level === 'warning');
    }

    getUpcomingInspections(inspections) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        return inspections.filter(inspection => 
            inspection.scheduledDate && 
            new Date(inspection.scheduledDate) <= nextWeek &&
            inspection.status !== 'completed'
        ).slice(0, 5);
    }

    // Обробка дій з рекомендацій
    handleRecommendationAction(type, index) {
        switch (type) {
            case 'maintenance':
                window.location.href = 'lifts.html#maintenance';
                break;
            case 'qr':
                window.location.href = 'qr-management.html';
                break;
            case 'prediction':
                toastr.info('Відкриваємо планувальник ТО...');
                break;
        }
    }

    // Допоміжні методи UI
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    showError(message) {
        if (typeof toastr !== 'undefined') {
            toastr.error(message);
        } else {
            console.error(message);
        }
    }

    // Налаштування обробників подій
    setupEventListeners() {
        // Обробка переключення табів
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleTabSwitch(e.target.getAttribute('data-target'));
            });
        });
        
        // Обробка кліків по метрикам
        document.querySelectorAll('.metric-card').forEach(card => {
            card.addEventListener('click', () => {
                card.style.transform = 'scale(1.02)';
                setTimeout(() => {
                    card.style.transform = '';
                }, 200);
            });
        });
    }

    handleTabSwitch(targetTab) {
        // Показуємо відповідний контент
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('show', 'active');
        });
        
        const target = document.querySelector(targetTab);
        if (target) {
            target.classList.add('show', 'active');
        }
        
        // Оновлюємо активний таб
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        document.querySelector(`[data-target="${targetTab}"]`)?.classList.add('active');
    }

    // Очистка ресурсів
    destroy() {
        if (this.realTimeUpdateInterval) {
            clearInterval(this.realTimeUpdateInterval);
        }
        
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        
        this.charts = {};
        this.cache.clear();
    }
    /**
     * 💰 Ініціалізація фінансової аналітики
     */
    initFinancialAnalytics() {
        this.createFinancialChart();
        this.updateFinancialMetrics();
    }

    /**
     * 💰 Створення фінансового графіка
     */
    createFinancialChart() {
        const ctx = document.getElementById('financial-chart');
        if (!ctx) return;

        const labels = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер'];
        const revenueData = [45000, 52000, 48000, 61000, 55000, 67000];
        const expensesData = [25000, 28000, 30000, 32000, 29000, 35000];

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Дохід',
                    data: revenueData,
                    backgroundColor: 'rgba(40, 167, 69, 0.8)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 1
                }, {
                    label: 'Витрати',
                    data: expensesData,
                    backgroundColor: 'rgba(220, 53, 69, 0.8)',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 1
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

    /**
     * 💰 Оновлення фінансових метрик
     */
    updateFinancialMetrics() {
        const monthlyRevenue = 67000;
        const maintenanceCosts = 35000;
        const netProfit = monthlyRevenue - maintenanceCosts;

        const elements = {
            'monthly-revenue': '₴' + monthlyRevenue.toLocaleString(),
            'maintenance-costs': '₴' + maintenanceCosts.toLocaleString(),
            'net-profit': '₴' + netProfit.toLocaleString()
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    /**
     * 🔍 Ініціалізація аналітики інспекцій
     */
    initInspectionsAnalytics() {
        this.createInspectionsChart();
        this.createInspectionResultsChart();
    }

    /**
     * 🔍 Створення графіка інспекцій
     */
    createInspectionsChart() {
        const ctx = document.getElementById('inspections-chart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
                datasets: [{
                    label: 'Проведено інспекцій',
                    data: [12, 8, 15, 10, 14, 6, 3],
                    borderColor: 'rgba(0, 123, 255, 1)',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    /**
     * 🔍 Створення графіка результатів інспекцій
     */
    createInspectionResultsChart() {
        const ctx = document.getElementById('inspection-results-chart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Успішно', 'Потребує ремонту', 'Критично'],
                datasets: [{
                    data: [75, 20, 5],
                    backgroundColor: [
                        'rgba(40, 167, 69, 0.8)',
                        'rgba(255, 193, 7, 0.8)',
                        'rgba(220, 53, 69, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    /**
     * 👥 Ініціалізація аналітики користувачів
     */
    initUsersAnalytics() {
        this.createUsersActivityChart();
        this.updateUsersMetrics();
    }

    /**
     * 👥 Створення графіка активності користувачів
     */
    createUsersActivityChart() {
        const ctx = document.getElementById('users-activity-chart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'area',
            data: {
                labels: Array.from({length: 24}, (_, i) => i + ':00'),
                datasets: [{
                    label: 'Активність користувачів',
                    data: [2, 1, 0, 0, 1, 3, 8, 15, 22, 18, 16, 14, 12, 15, 18, 20, 17, 14, 10, 8, 6, 4, 3, 2],
                    borderColor: 'rgba(108, 117, 125, 1)',
                    backgroundColor: 'rgba(108, 117, 125, 0.2)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Година дня'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Кількість користувачів'
                        }
                    }
                }
            }
        });
    }

    /**
     * 👥 Оновлення метрик користувачів
     */
    updateUsersMetrics() {
        const metrics = {
            'active-users': '24',
            'technicians-count': '18',
            'admins-count': '3'
        };

        Object.entries(metrics).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    /**
     * 📄 Ініціалізація звітної аналітики
     */
    initReportsAnalytics() {
        this.updateReportsTable();
        this.bindReportButtons();
    }

    /**
     * 📄 Оновлення таблиці звітів
     */
    updateReportsTable() {
        const reportsTableBody = document.getElementById('reports-table');
        if (!reportsTableBody) return;

        const reports = [
            {
                name: 'Місячний звіт активності',
                lastUpdate: '5 хв тому',
                status: 'Готовий',
                statusClass: 'success'
            },
            {
                name: 'Тижневі інспекції',
                lastUpdate: '1 год тому', 
                status: 'Генерується',
                statusClass: 'warning'
            },
            {
                name: 'Фінансовий квартальний',
                lastUpdate: '2 години тому',
                status: 'Готовий',
                statusClass: 'success'
            }
        ];

        reportsTableBody.innerHTML = reports.map(report => `
            <tr>
                <td>${report.name}</td>
                <td>${report.lastUpdate}</td>
                <td><span class="badge badge-${report.statusClass}">${report.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" 
                            ${report.status !== 'Готовий' ? 'disabled' : ''}>
                        ${report.status === 'Готовий' ? 'Завантажити' : 'Очікування'}
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * 📄 Прив'язка кнопок звітів
     */
    bindReportButtons() {
        // Логіка для кнопок швидких звітів буде додана пізніше
        console.log('Звіти ініціалізовані');
    }

    /**
     * 🔄 Оновлене управління табами
     */
    initTabHandlers() {
        const tabButtons = document.querySelectorAll('[data-toggle="tab"]');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = button.getAttribute('href').substring(1);
                
                // Ініціалізуємо контент таба при першому відкритті
                switch(targetTab) {
                    case 'financial-analytics':
                        if (!button.dataset.initialized) {
                            this.initFinancialAnalytics();
                            button.dataset.initialized = 'true';
                        }
                        break;
                    case 'inspections-analytics':
                        if (!button.dataset.initialized) {
                            this.initInspectionsAnalytics();
                            button.dataset.initialized = 'true';
                        }
                        break;
                    case 'users-analytics':
                        if (!button.dataset.initialized) {
                            this.initUsersAnalytics();
                            button.dataset.initialized = 'true';
                        }
                        break;
                    case 'reports-analytics':
                        if (!button.dataset.initialized) {
                            this.initReportsAnalytics();
                            button.dataset.initialized = 'true';
                        }
                        break;
                }
                
                this.showTab(targetTab);
            });
        });
    }

    /**
     * 🔗 Обробка хешу URL для автоматичного переключення табів
     */
    handleUrlHash() {
        const hash = window.location.hash;
        if (hash) {
            // Очищаємо хеш від #
            const tabId = hash.substring(1);
            console.log(`🔍 Шукаємо таб: ${tabId}`);
            
            // Знаходимо відповідну кнопку таба
            const tabButton = document.querySelector(`[data-target="#${tabId}"]`);
            
            if (tabButton) {
                // Використовуємо Bootstrap 4 API для активації таба
                setTimeout(() => {
                    console.log(`🎯 Знайдено кнопку таба: ${tabButton.textContent.trim()}`);
                    
                    // Спочатку прибираємо активний клас з усіх табів
                    document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
                    document.querySelectorAll('.tab-pane').forEach(pane => {
                        pane.classList.remove('active', 'show');
                    });
                    
                    // Активуємо потрібний таб
                    tabButton.classList.add('active');
                    const targetPane = document.querySelector(tabButton.dataset.target);
                    if (targetPane) {
                        targetPane.classList.add('active', 'show');
                        
                        // Ініціалізуємо контент таба при першому відкритті
                        if (!tabButton.dataset.initialized) {
                            this.initTabContent(tabId);
                            tabButton.dataset.initialized = 'true';
                        }
                        
                        console.log(`✅ Таб "${tabId}" успішно активовано`);
                    }
                }, 1000); // Збільшуємо затримку для повного завантаження
            } else {
                console.warn(`⚠️ Таб з ID "${tabId}" не знайдено. Доступні таби:`, 
                    Array.from(document.querySelectorAll('[data-target]')).map(btn => btn.dataset.target));
            }
        }
    }

    /**
     * 🔄 Ініціалізація контенту таба
     */
    initTabContent(tabId) {
        switch(tabId) {
            case 'predictive-analytics':
                // Ініціалізуємо прогнозну аналітику
                console.log('🧠 Ініціалізація AI прогнозування...');
                break;
            case 'financial-analytics':
                this.initFinancialAnalytics();
                break;
            case 'inspections-analytics':
                this.initInspectionsAnalytics();
                break;
            case 'users-analytics':
                this.initUsersAnalytics();
                break;
            case 'reports-analytics':
                this.initReportsAnalytics();
                break;
        }
    }
}

// Ініціалізація при завантаженні сторінки
let analyticsEngine;

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM завантажено, ініціалізуємо Analytics Engine...');
    analyticsEngine = new UnifiedAnalyticsEngine();
    
    // Додатковий debug для хешу
    if (window.location.hash) {
        console.log(`🔗 Знайдено хеш при завантаженні: ${window.location.hash}`);
    }
});

// Експорт для використання в інших модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedAnalyticsEngine;
}