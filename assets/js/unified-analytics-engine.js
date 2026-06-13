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
            // Використовуємо requestAnimationFrame для більш надійної синхронізації
            this.waitForDOM(() => {
                this.handleUrlHash();
            });
            
            // Додаємо обробник зміни хешу
            window.addEventListener('hashchange', () => {
                this.handleUrlHash();
            });
            
            console.log('✅ Unified Analytics Engine готовий!');
            
        } catch (error) {
            console.error('❌ Erro ініціалізації Analytics Engine:', error);
            this.showError('Erro ao carregar dados analíticos');
        }
    }

    /**
     * 📥 A carregar всіх даних з різних джерел
     */
    async loadAllData() {
        console.log('📚 A carregar аналітичних даних...');
        
        let lifts = [];
        let requests = [];
        let inspections = [];
        let qrScans = [];
        
        try {
            // Завантажуємо основні дані з API
            const token = sessionStorage.getItem('liftmanager_jwt') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('authToken') || localStorage.getItem('token');
            if (token) {
                console.log('🔑 Використовуємо токен для запиту аналітики...');

                const headers = {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                };

                const [liftsResp, requestsResp, inspectionsResp, qrResp] = await Promise.all([
                    fetch('/api/lifts', { method: 'GET', headers }),
                    fetch('/api/requests?limit=500', { method: 'GET', headers }),
                    fetch('/api/inspections?limit=500', { method: 'GET', headers }),
                    fetch('/api/qr/history?limit=500', { method: 'GET', headers })
                ]);

                if (liftsResp.ok) {
                    const data = await liftsResp.json();
                    lifts = data.lifts || data.data || data || [];
                    if (!Array.isArray(lifts)) lifts = [];
                }

                if (requestsResp.ok) {
                    const data = await requestsResp.json();
                    requests = data.requests || data.data || data || [];
                    if (!Array.isArray(requests)) requests = [];
                }

                if (inspectionsResp.ok) {
                    const data = await inspectionsResp.json();
                    inspections = data.inspections || data.data || data || [];
                    if (!Array.isArray(inspections)) inspections = [];
                }

                if (qrResp.ok) {
                    const data = await qrResp.json();
                    qrScans = data.scans || data.data || data || [];
                    if (!Array.isArray(qrScans)) qrScans = [];
                }

                if (liftsResp.status === 401 || liftsResp.status === 403) {
                    console.warn('⚠️ Токен невалідний, перенаправлення на логін...');
                    // Don't clear tokens here — let AuthManager handle session
                    // Just log warning and continue with empty data
                    console.warn('⚠️ Analytics: API auth failed, using empty data');
                }

                console.log('✅ Dados API:', {
                    lifts: lifts.length,
                    requests: requests.length,
                    inspections: inspections.length,
                    qrScans: qrScans.length
                });
            }
        } catch (apiError) {
            console.warn('⚠️ API недоступний:', apiError.message);
        }

        // No localStorage fallback for business data — API is source of truth
        const maintenanceRequests = requests;
        const systemLog = [];
        
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
        
        console.log('📊 Dados carregados:', this.data);
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
                    label: 'Atividade dos elevadores',
                    data: data.liftsActivity,
                    borderColor: this.config.charts.colors.primary,
                    backgroundColor: this.config.charts.colors.primary + '20',
                    tension: 0.4
                }, {
                    label: 'Leitura QR',
                    data: data.qrActivity,
                    borderColor: this.config.charts.colors.success,
                    backgroundColor: this.config.charts.colors.success + '20',
                    tension: 0.4
                }, {
                    label: 'Manutenção realizada',
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
                        text: 'Atividade do sistema nos últimos 7 dias'
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
                labels: ['Ativos', 'Em manutenção', 'Offline', 'Com erros'],
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
                labels: locationData.map(([location]) => location || 'Não especificado'),
                datasets: [{
                    label: 'Número de elevadores',
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
                    label: 'Manutenção planeada',
                    data: maintenanceData.planned,
                    borderColor: this.config.charts.colors.success,
                    backgroundColor: this.config.charts.colors.success + '20'
                }, {
                    label: 'Manutenção de emergência',
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
                    label: 'Leituras por hora',
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
            type: 'bar',
            data: {
                labels: this.data.qr.topUsers.map(u => u.name),
                datasets: [{
                    label: 'Leituras',
                    data: this.data.qr.topUsers.map(u => u.count),
                    backgroundColor: this.config.charts.colors.purple
                }]
            },
            options: {
                indexAxis: 'y',
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

        // Знищуємо існуючий графік якщо вже є
        const existing = Chart.getChart(ctx);
        if (existing) existing.destroy();
        if (this.charts.prediction) { try { this.charts.prediction.destroy(); } catch(e) {} this.charts.prediction = null; }

        const predictions = this.generatePredictions();
        
        this.charts.prediction = new Chart(ctx, {
            type: 'line',
            data: {
                labels: predictions.labels,
                datasets: [{
                    label: 'Probabilidade de falha (%)',
                    data: predictions.breakdown,
                    borderColor: this.config.charts.colors.danger,
                    backgroundColor: this.config.charts.colors.danger + '20',
                    tension: 0.4
                }, {
                    label: 'Previsão de carga (%)' ,
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
     * 📊 Atualização KPI карток
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
                title: 'Muitos elevadores offline',
                message: `${this.data.lifts.offline} elevadores indisponíveis`,
                icon: 'fas fa-exclamation-triangle'
            });
        }
        
        // Перевіряємо прострочені Manutenção
        if (this.data.maintenance.overdue.length > this.config.alertThresholds.maintenanceOverdue) {
            alerts.push({
                type: 'warning',
                title: 'Manutenção em atraso',
                message: `${this.data.maintenance.overdue.length} manutenções precisam de atenção`,
                icon: 'fas fa-clock'
            });
        }
        
        // Перевіряємо падіння QR активності
        const qrDrop = this.calculateQRActivityDrop();
        if (qrDrop > this.config.alertThresholds.qrScansDropped) {
            alerts.push({
                type: 'info',
                title: 'Redução da atividade QR',
                message: `Leituras caíram ${qrDrop}%`,
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
        
        // Аналіз Manutenção
        if (this.data.maintenance.pending > 5) {
            recommendations.push({
                type: 'maintenance',
                priority: 'high',
                title: 'Otimização do calendário de manutenção',
                description: 'Recomenda-se redistribuir a carga de trabalho entre os técnicos para reduzir a fila de manutenção.',
                action: 'Ver calendário'
            });
        }
        
        // Аналіз використання QR
        if (this.data.qr.today < this.data.qr.thisWeek / 7 * 0.5) {
            recommendations.push({
                type: 'qr',
                priority: 'medium',
                title: 'Baixa atividade QR',
                description: 'A atividade de leitura QR de hoje está abaixo da média. Recomenda-se verificar a disponibilidade do sistema.',
                action: 'Verificar sistema'
            });
        }
        
        // Прогноз поломок
        const riskLifts = this.data.lifts.raw.filter(lift => this.calculateBreakdownRisk(lift) > 70);
        if (riskLifts.length > 0) {
            recommendations.push({
                type: 'prediction',
                priority: 'critical',
                title: 'Alto risco de falhas',
                description: `${riskLifts.length} elevadores têm alto risco de falha em breve.`,
                action: 'Planear manutenção'
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
                
                console.log('🔄 Dados atualizados:', new Date().toLocaleTimeString());
                
            } catch (error) {
                console.error('❌ Erro оновлення даних:', error);
            }
        }, this.config.updateInterval);
    }

    /**
     * 📊 Atualização всіх графіків
     */
    updateCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.update === 'function') {
                // Перевіряємо що canvas елемент ще є в DOM
                try {
                    if (chart.canvas && document.contains(chart.canvas)) {
                        chart.update('none'); // Без анімації для реал-тайм
                    }
                } catch (e) {
                    // Мовчки ігноруємо — canvas міг бути видалений при переключенні вкладок
                }
            }
        });
    }

    /**
     * 🛠️ Допоміжні методи
     */
    
    groupByLocation(lifts) {
        const groups = {};
        lifts.forEach(lift => {
            let location = lift.location || lift.address || 'Não especificado';

            if (location && typeof location === 'object') {
                const city = location.city || location.cidade || location.locality || location.municipality;
                const district = location.district || location.regiao || location.region;
                const street = location.street || location.rua || location.address || location.line1;

                if (city && district) {
                    location = `${city}, ${district}`;
                } else if (city) {
                    location = city;
                } else if (street) {
                    location = street;
                } else {
                    location = 'Não especificado';
                }
            }

            if (typeof location !== 'string') {
                location = String(location || 'Não especificado');
            }

            location = location.trim() || 'Não especificado';
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
            const user = scan.user || 'Anónimo';
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
        
        // Частота Manutenção
        risk += Math.random() * 40; // Випадковий компонент для демо
        
        // Tipo de elevador
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
            labels.push(date.toLocaleDateString('pt-PT', { weekday: 'short' }));
            
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
            labels.push(date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }));
            
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
            labels.push(date.toLocaleDateString('pt-PT', { weekday: 'short' }));
            
            // Генеруємо прогнози
            breakdown.push(Math.max(0, Math.min(100, Math.random() * 30 + 10)));
            load.push(Math.max(0, Math.min(100, Math.random() * 40 + 40)));
        }
        
        return { labels, breakdown, load };
    }

    // Розрахунки змін для KPI
    calculateLiftsChange() {
        return '+2% este mês';
    }

    calculateActiveChange() {
        const percentage = Math.round((this.data.lifts.active / this.data.lifts.total) * 100);
        return `${percentage}% online`;
    }

    calculateScansChange() {
        return '+15% esta semana';
    }

    calculateMaintenanceChange() {
        return this.data.maintenance.pending > 10 ? 'Requer atenção' : 'Planeado';
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
                toastr.info('A abrir o agendador de manutenção...');
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

    // Definições обробників подій
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
    async initFinancialAnalytics() {
        await this.loadFinancialData();
        this.createFinancialChart();
        this.createExpensesPieChart();
        this.createProfitabilityChart();
        this.createPaymentMethodsChart();
        this.updateFinancialMetrics();
        this.renderFinancialBuildingsTable();
    }

    async loadFinancialData() {
        const token = sessionStorage.getItem('liftmanager_jwt') ||
                      localStorage.getItem('liftmanager_jwt') ||
                      localStorage.getItem('authToken') ||
                      localStorage.getItem('token');
        if (!token) {
            this.data.financial = this.getEmptyFinancialData();
            return;
        }

        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        let invoices = [];
        let orcamentos = [];
        try {
            const [invRes, orcRes] = await Promise.all([
                fetch('/api/invoices', { headers }),
                fetch('/api/orcamentos?limit=200', { headers })
            ]);

            if (invRes.ok) {
                const invData = await invRes.json();
                invoices = invData.data || invData.invoices || (Array.isArray(invData) ? invData : []);
            }
            if (orcRes.ok) {
                const orcData = await orcRes.json();
                orcamentos = orcData.data || orcData.orcamentos || (Array.isArray(orcData) ? orcData : []);
            }
        } catch (err) {
            console.warn('⚠️ Erro ao carregar dados financeiros:', err.message);
        }

        this.data.financial = this.computeFinancialData(invoices, orcamentos);
    }

    getEmptyFinancialData() {
        return {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
            revenueData: [0, 0, 0, 0, 0, 0],
            expensesData: [0, 0, 0, 0, 0, 0],
            monthlyRevenue: 0,
            maintenanceCosts: 0,
            netProfit: 0,
            profitabilityRate: 0,
            paymentMethods: { labels: ['Sem dados'], values: [1] },
            expenseStructure: { labels: ['Sem dados'], values: [1] },
            buildings: []
        };
    }

    computeFinancialData(invoices, orcamentos) {
        const now = new Date();
        const monthLabels = [];
        const monthKeys = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthKeys.push(key);
            monthLabels.push(d.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', ''));
        }

        const revenueMap = new Map(monthKeys.map(k => [k, 0]));
        const expensesMap = new Map(monthKeys.map(k => [k, 0]));
        const paymentMethodTotals = new Map();
        const buildingMap = new Map();

        invoices.forEach(inv => {
            const date = new Date(inv.date || inv.createdAt || inv.data || inv.issuedAt || Date.now());
            if (isNaN(date)) return;
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const amount = Number(inv.total || inv.amount || inv.valorTotal || inv.valor || 0) || 0;
            const status = String(inv.status || '').toLowerCase();
            const method = inv.paymentMethod || inv.metodoPagamento || 'Outros';
            const building = inv.building || inv.edificio || inv.clientName || inv.cliente?.nome || 'Sem edifício';

            if (monthKeys.includes(key) && status !== 'cancelled' && status !== 'canceled') {
                revenueMap.set(key, (revenueMap.get(key) || 0) + amount);
            }

            paymentMethodTotals.set(method, (paymentMethodTotals.get(method) || 0) + amount);

            if (!buildingMap.has(building)) {
                buildingMap.set(building, { building, revenue: 0, profit: 0 });
            }
            const row = buildingMap.get(building);
            row.revenue += amount;
        });

        orcamentos.forEach(orc => {
            const date = new Date(orc.data || orc.createdAt || Date.now());
            if (isNaN(date)) return;
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const amount = Number(orc.total || orc.valorTotal || orc.valor || 0) || 0;
            const status = String(orc.status || '').toLowerCase();

            if (monthKeys.includes(key) && status !== 'cancelled' && status !== 'canceled' && status !== 'rejected') {
                expensesMap.set(key, (expensesMap.get(key) || 0) + amount);
            }
        });

        const revenueData = monthKeys.map(k => Math.round(revenueMap.get(k) || 0));
        const expensesData = monthKeys.map(k => Math.round(expensesMap.get(k) || 0));
        const monthlyRevenue = revenueData[revenueData.length - 1] || 0;
        const maintenanceCosts = expensesData[expensesData.length - 1] || 0;
        const netProfit = monthlyRevenue - maintenanceCosts;
        const profitabilityRate = monthlyRevenue > 0 ? (netProfit / monthlyRevenue) * 100 : 0;

        const buildings = Array.from(buildingMap.values())
            .map(r => {
                const costs = r.revenue * 0.45;
                const profit = r.revenue - costs;
                return { ...r, profit, margin: r.revenue > 0 ? (profit / r.revenue) * 100 : 0 };
            })
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 6);

        const paymentEntries = Array.from(paymentMethodTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);

        const totalExpenses = expensesData.reduce((acc, v) => acc + v, 0);
        const expenseStructure = {
            labels: ['Manutenção', 'Peças', 'Operacional', 'Outros'],
            values: totalExpenses > 0
                ? [Math.round(totalExpenses * 0.55), Math.round(totalExpenses * 0.2), Math.round(totalExpenses * 0.15), Math.round(totalExpenses * 0.1)]
                : [1, 0, 0, 0]
        };

        return {
            labels: monthLabels,
            revenueData,
            expensesData,
            monthlyRevenue,
            maintenanceCosts,
            netProfit,
            profitabilityRate,
            paymentMethods: paymentEntries.length
                ? { labels: paymentEntries.map(([k]) => k), values: paymentEntries.map(([, v]) => Math.round(v)) }
                : { labels: ['Sem dados'], values: [1] },
            expenseStructure,
            buildings
        };
    }

    /**
     * 🔮 Ініціалізація AI прогнозування поломок
     */
    async initPredictiveAnalytics() {
        console.log('🔮 Запуск ініціалізації AI прогнозування...');
        
        try {
            // Ініціалізуємо систему прогнозування
            if (typeof PredictiveMaintenanceSystem !== 'undefined') {
                if (!this.predictiveSystem) {
                    this.predictiveSystem = new PredictiveMaintenanceSystem();
                }
                
                // Чекаємо поки система ініціалізується
                if (!this.predictiveSystem.isInitialized) {
                    console.log('⏳ Чекаємо ініціалізації системи прогнозування...');
                    await this.waitForPredictiveInit();
                }
                
                // Створюємо графіки та оновлюємо дані
                this.createPredictionChart();
                this.updateAIRecommendations();
                this.displayPredictiveMetrics();
                
                console.log('✅ AI прогнозування com sucesso ініціалізовано');
                
            } else {
                console.error('❌ PredictiveMaintenanceSystem не знайдено');
            this.showPredictiveError('Sistema AI de previsão indisponível');
            }
            
        } catch (error) {
            console.error('❌ Erro ініціалізації AI прогнозування:', error);
            this.showPredictiveError('Erro ao carregar sistema AI');
        }
    }

    /**
     * ⏳ Очікування ініціалізації системи прогнозування
     */
    async waitForPredictiveInit() {
        return new Promise((resolve) => {
            const checkInit = () => {
                if (this.predictiveSystem && this.predictiveSystem.isInitialized) {
                    resolve();
                } else {
                    setTimeout(checkInit, 500);
                }
            };
            checkInit();
        });
    }

    /**
     * 📊 Створення графіка прогнозів поломок
     */
    createPredictionChart() {
        const ctx = document.getElementById('prediction-chart');
        if (!ctx) {
            console.warn('⚠️ Елемент prediction-chart не знайдено');
            return;
        }

        console.log('📊 Створюємо графік прогнозів...');

        // Знищуємо існуючий графік якщо вже є
        if (this.charts.prediction) {
            this.charts.prediction.destroy();
            this.charts.prediction = null;
        }
        const existingChart = Chart.getChart(ctx);
        if (existingChart) existingChart.destroy();

        // Отримуємо дані прогнозів від AI системи
        const predictions = this.predictiveSystem ? 
            this.predictiveSystem.getSystemPredictions() : 
            this.generateMockPredictions();

        const labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5', 'Semana 6'];
        const riskData = predictions.riskLevels || [15, 25, 35, 20, 45, 30];

        this.charts.prediction = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Risco de falhas (%)' ,
                    data: riskData,
                    borderColor: 'rgba(220, 53, 69, 1)',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Risco: ${context.parsed.y}%`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * 💡 Atualização AI рекомендацій
     */
    updateAIRecommendations() {
        const container = document.getElementById('ai-recommendations');
        if (!container) {
            console.warn('⚠️ Елемент ai-recommendations не знайдено');
            return;
        }

        console.log('💡 Оновлюємо AI рекомендації...');

        // Отримуємо рекомендації від AI системи
        const recommendations = this.predictiveSystem ? 
            this.predictiveSystem.generateRecommendations() : 
            this.generateMockRecommendations();

        container.innerHTML = `
            <div class="recommendation-list">
                ${recommendations.map(rec => `
                    <div class="alert alert-${rec.priority} mb-3">
                        <div class="d-flex align-items-center">
                            <div class="mr-3">
                                <i class="fas ${rec.icon} fa-2x"></i>
                            </div>
                            <div class="flex-grow-1">
                                <h6 class="mb-1">${rec.title}</h6>
                                <p class="mb-1">${rec.description}</p>
                                <small class="text-muted">Precisão: ${rec.confidence}%</small>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * 📈 Відображення метрик прогнозування
     */
    displayPredictiveMetrics() {
        // Оновлюємо метрики в заголовку сторінки
        console.log('📈 Оновлюємо метрики прогнозування...');
        
        // Можна додати логіку оновлення основних KPI карток
        // на основі даних з AI системи
    }

    /**
     * ❌ Показ помилки AI прогнозування
     */
    showPredictiveError(message) {
        const container = document.getElementById('ai-recommendations');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Erro do sistema AI:</strong> ${message}
                </div>
            `;
        }
    }

    /**
     * 🎲 Генерація тестових прогнозів
     */
    generateMockPredictions() {
        return {
            riskLevels: [15, 25, 35, 20, 45, 30],
            totalLifts: 45,
            highRiskLifts: 8,
            scheduledMaintenance: 12
        };
    }

    /**
     * 🎲 Генерація тестових рекомендацій
     */
    generateMockRecommendations() {
        return [
            {
                title: 'Aviso crítico',
                description: 'Elevador #LFT-001 necessita de verificação urgente do sistema de travagem',
                priority: 'danger',
                icon: 'fa-exclamation-triangle',
                confidence: 95
            },
            {
                title: 'Manutenção planeada',
                description: 'Recomenda-se realizar manutenção nos elevadores #LFT-005, #LFT-012 durante a semana',
                priority: 'warning',
                icon: 'fa-wrench',
                confidence: 78
            },
            {
                title: 'Otimização operacional',
                description: 'O sistema recomenda aumentar a frequência de inspeções no centro comercial "Globus"',
                priority: 'info',
                icon: 'fa-lightbulb',
                confidence: 82
            }
        ];
    }

    /**
     * 💰 Створення фінансового графіка
     */
    createFinancialChart() {
        const ctx = document.getElementById('financial-chart');
        if (!ctx) return;

        if (this.charts.financialMain && typeof this.charts.financialMain.destroy === 'function') {
            this.charts.financialMain.destroy();
        }

        const f = this.data.financial || this.getEmptyFinancialData();

        this.charts.financialMain = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: f.labels,
                datasets: [{
                    label: 'Receita',
                    data: f.revenueData,
                    backgroundColor: 'rgba(40, 167, 69, 0.8)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 1
                }, {
                    label: 'Despesas',
                    data: f.expensesData,
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
                                return '€' + Number(value).toLocaleString('pt-PT');
                            }
                        }
                    }
                }
            }
        });
    }

    createExpensesPieChart() {
        const ctx = document.getElementById('expenses-pie-chart');
        if (!ctx) return;
        if (this.charts.financialExpenses && typeof this.charts.financialExpenses.destroy === 'function') {
            this.charts.financialExpenses.destroy();
        }
        const f = this.data.financial || this.getEmptyFinancialData();
        this.charts.financialExpenses = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: f.expenseStructure.labels,
                datasets: [{
                    data: f.expenseStructure.values,
                    backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#6c757d']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    createProfitabilityChart() {
        const ctx = document.getElementById('profitability-chart');
        if (!ctx) return;
        if (this.charts.financialProfitability && typeof this.charts.financialProfitability.destroy === 'function') {
            this.charts.financialProfitability.destroy();
        }
        const f = this.data.financial || this.getEmptyFinancialData();
        const labels = f.buildings.length ? f.buildings.map(b => b.building) : ['Sem dados'];
        const values = f.buildings.length ? f.buildings.map(b => Number((b.margin || 0).toFixed(1))) : [0];
        this.charts.financialProfitability = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Rentabilidade %',
                    data: values,
                    backgroundColor: 'rgba(23, 162, 184, 0.8)',
                    borderColor: 'rgba(23, 162, 184, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { callback: v => `${v}%` } } }
            }
        });
    }

    createPaymentMethodsChart() {
        const ctx = document.getElementById('payment-methods-chart');
        if (!ctx) return;
        if (this.charts.financialPayments && typeof this.charts.financialPayments.destroy === 'function') {
            this.charts.financialPayments.destroy();
        }
        const f = this.data.financial || this.getEmptyFinancialData();
        this.charts.financialPayments = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: f.paymentMethods.labels,
                datasets: [{
                    data: f.paymentMethods.values,
                    backgroundColor: ['#28a745', '#007bff', '#ffc107', '#17a2b8', '#6f42c1', '#6c757d']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    /**
     * 💰 Atualização фінансових метрик
     */
    updateFinancialMetrics() {
        const f = this.data.financial || this.getEmptyFinancialData();
        const fmtEur = (n) => `€ ${Number(n || 0).toLocaleString('pt-PT')}`;
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        setText('monthly-revenue', fmtEur(f.monthlyRevenue));
        setText('maintenance-costs', fmtEur(f.maintenanceCosts));
        setText('net-profit', fmtEur(f.netProfit));
        setText('profitability-rate', `${Number(f.profitabilityRate || 0).toFixed(1)}%`);

        const profitPositive = f.netProfit >= 0;
        setText('monthly-revenue-change', f.monthlyRevenue > 0 ? 'Dados reais (mês atual)' : 'Sem dados');
        setText('maintenance-costs-change', f.maintenanceCosts > 0 ? 'Dados reais (mês atual)' : 'Sem dados');
        setText('net-profit-change', profitPositive ? 'Resultado positivo' : 'Resultado negativo');
        setText('profitability-rate-change', f.monthlyRevenue > 0 ? 'Calculado em tempo real' : 'Sem base de cálculo');
    }

    renderFinancialBuildingsTable() {
        const tbody = document.getElementById('financial-buildings-tbody');
        if (!tbody) return;
        const f = this.data.financial || this.getEmptyFinancialData();

        if (!f.buildings || f.buildings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Sem dados financeiros disponíveis</td></tr>';
            return;
        }

        tbody.innerHTML = f.buildings.map(b => {
            const cls = b.margin >= 45 ? 'success' : (b.margin >= 30 ? 'warning' : 'danger');
            return `<tr>
                <td>${b.building}</td>
                <td>€ ${Number(b.revenue || 0).toLocaleString('pt-PT')}</td>
                <td>€ ${Number(b.profit || 0).toLocaleString('pt-PT')}</td>
                <td class="text-${cls}">${Number(b.margin || 0).toFixed(1)}%</td>
            </tr>`;
        }).join('');
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
                labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
                datasets: [{
                    label: 'Inspeções realizadas',
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
                labels: ['Com sucesso', 'Necessita reparação', 'Crítico'],
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

        const existing = Chart.getChart(ctx);
        if (existing) existing.destroy();

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => i + ':00'),
                datasets: [{
                    label: 'Atividade dos utilizadores',
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
                            text: 'Hora do dia'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Número de utilizadores'
                        }
                    }
                }
            }
        });
    }

    /**
     * 👥 Atualização метрик користувачів — реальні дані з API
     */
    async updateUsersMetrics() {
        try {
            const token = sessionStorage.getItem('liftmanager_jwt') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('authToken') || localStorage.getItem('token');
            const res = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const body = await res.json();
            // API повертає { success, data: [...] } або просто масив
            const users = Array.isArray(body) ? body : (body.data || body.users || []);

            const admins      = users.filter(u => u.role === 'admin').length;
            const technicians = users.filter(u => u.role === 'technician' || u.role === 'tech').length;
            const active      = users.filter(u => u.status !== 'inactive' && u.status !== 'blocked').length;

            const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            set('active-users',       active);
            set('technicians-count',  technicians);
            set('admins-count',       admins);
        } catch (err) {
            console.warn('⚠️ updateUsersMetrics: не вдалось завантажити користувачів', err);
        }
    }

    /**
     * 📄 Ініціалізація звітної аналітики
     */
    initReportsAnalytics() {
        this.updateReportsTable();
        this.bindReportButtons();
    }

    /**
     * 📄 Atualização таблиці звітів
     */
    updateReportsTable() {
        const reportsTableBody = document.getElementById('reports-table');
        if (!reportsTableBody) return;

        reportsTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-3">
                    Sem relatórios reais disponíveis no momento
                </td>
            </tr>
        `;
    }

    /**
     * 📄 Прив'язка кнопок звітів
     */
    bindReportButtons() {
        // Логіка для кнопок швидких звітів буде додана пізніше
        console.log('Relatórios inicializados');
    }

    /**
     * 🔄 Оновлене управління табами
     */
    initTabHandlers() {
        const tabButtons = document.querySelectorAll('[data-toggle="tab"]');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const href = button.getAttribute('href') || button.getAttribute('data-target') || '';
                const targetTab = href.substring(1);
                if (!targetTab) return;
                
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
                
                this.activateTab(targetTab);
            });
        });
    }

    /**
     * ⏳ Чекаємо поки DOM буде повністю готовий
     */
    waitForDOM(callback) {
        const checkDOM = () => {
            const tabsExist = document.querySelectorAll('[data-target]').length > 0;
            if (tabsExist) {
                console.log('✅ DOM готовий, таби знайдено');
                callback();
            } else {
                console.log('⏳ Чекаємо готовності DOM...');
                setTimeout(checkDOM, 500);
            }
        };
        
        // Запускаємо перевірку через requestAnimationFrame для синхронізації з рендерингом
        requestAnimationFrame(checkDOM);
    }

    /**
     * 🔗 Обробка хешу URL для автоматичного переключення табів
     */
    handleUrlHash() {
        const hash = window.location.hash;
        console.log(`🔍 Поточний хеш: "${hash}"`);
        
        if (hash) {
            // Очищаємо хеш від #
            const tabId = hash.substring(1);
            console.log(`🔍 Шукаємо таб: ${tabId}`);
            
            // Використовуємо нашу універсальну функцію активації
            this.activateTab(tabId);
        }
    }

    /**
     * 🎯 Універсальна функція активації таба
     */
    activateTab(tabId) {
        console.log(`🎯 Активуємо таб: ${tabId}`);
        
        // Перевіряємо чи є взагалі таби на сторінці
        const allTabs = document.querySelectorAll('[data-target]');
        console.log(`📋 Знайдено ${allTabs.length} табів на сторінці`);
        
        if (allTabs.length === 0) {
            console.warn('⚠️ На сторінці немає табів для навігації');
            return false;
        }
        
        // Знаходимо відповідну кнопку таба
        const tabButton = document.querySelector(`[data-target="#${tabId}"]`);
        console.log(`🎯 Результат пошуку кнопки таба:`, tabButton);
        
        if (!tabButton) {
            console.warn(`⚠️ Таб з ID "${tabId}" не знайдено. Доступні таби:`, 
                Array.from(document.querySelectorAll('[data-target]')).map(btn => btn.dataset.target));
            return false;
        }

        // Спробуємо кілька способів активації
        console.log(`🎯 Знайдено кнопку таба: ${tabButton.textContent.trim()}`);
        
        // Спpessoas 1: Bootstrap API (якщо доступний)
        if (typeof $ !== 'undefined' && $.fn.tab) {
            console.log('📋 Використовуємо Bootstrap API');
            try {
                $(tabButton).tab('show');
                console.log('✅ Bootstrap API активація успішна');
                
                // Ініціалізуємо контент таба
                if (!tabButton.dataset.initialized) {
                    this.initTabContent(tabId);
                    tabButton.dataset.initialized = 'true';
                }
                return true;
            } catch (error) {
                console.warn('⚠️ Bootstrap API не спрацював, використовуємо DOM маніпуляції');
            }
        }
        
        // Спpessoas 2: Прямі DOM маніпуляції
        console.log('📋 Використовуємо DOM маніпуляції');
        
        // Прибираємо активний клас з усіх табів
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
            
            console.log(`✅ Таб "${tabId}" com sucesso активовано через DOM`);
            return true;
        } else {
            console.error(`❌ Не вдалося знайти панель для таба "${tabId}"`);
            return false;
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
                this.initPredictiveAnalytics();
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
            case 'municipalities-analytics':
                if (typeof window.loadMunicipalitiesAnalytics === 'function') {
                    window.loadMunicipalitiesAnalytics();
                }
                break;
        }
    }
}

// Ініціалізація при завантаженні сторінки
let analyticsEngine;

// Функція для ініціалізації AI прогнозування
window.initPredictiveAnalytics = function() {
    console.log('🤖 Ініціалізація AI прогнозування...');
    
    try {
        // Перевіряємо чи є система прогнозування
        if (!window.predictiveMaintenanceSystem) {
            console.warn('⚠️ PredictiveMaintenanceSystem не знайдена, створюємо...');
            window.predictiveMaintenanceSystem = new PredictiveMaintenanceSystem();
        }
        
        // Ініціалізуємо графік прогнозування
        setTimeout(() => {
            initPredictionChart();
            loadAIRecommendations();
        }, 500);
        
        console.log('✅ AI прогнозування ініціалізовано');
        return true;
        
    } catch (error) {
        console.error('❌ Erro ініціалізації AI прогнозування:', error);
        return false;
    }
};

// Функція для ініціалізації графіка прогнозів
function initPredictionChart(attemptCount = 0) {
    // Максимум 50 спроб (10 секунд)
    if (attemptCount > 50) {
        console.error('❌ Chart.js не завантажився після 10 секунд, пропускаємо графік');
        return;
    }
    
    // Перевіряємо наявність Chart.js
    if (typeof Chart === 'undefined') {
        console.warn('⚠️ Chart.js ще не завантажився, чекаємо... (спроба ' + attemptCount + '/50)');
        setTimeout(() => initPredictionChart(attemptCount + 1), 200);
        return;
    }
    
    console.log('✅ Chart.js завантажено, ініціалізуємо графік прогнозів');
    
    const canvas = document.getElementById('prediction-chart');
    if (!canvas) {
        console.warn('⚠️ Canvas prediction-chart не знайдено');
        return;
    }
    
    const ctx = canvas.getContext('2d');

    // Знищуємо існуючий графік якщо вже є
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();
    
    // Тестові дані для прогнозів
    const predictionData = {
        labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
        datasets: [{
            label: 'Probabilidade de falha (%)',
            data: [15, 23, 35, 48],
            borderColor: '#ff6b6b',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            tension: 0.4,
            fill: true
        }, {
            label: 'Manutenção recomendada (%)' ,
            data: [25, 40, 60, 85],
            borderColor: '#4ecdc4',
            backgroundColor: 'rgba(78, 205, 196, 0.1)',
            tension: 0.4,
            fill: true
        }]
    };
    
    new Chart(ctx, {
        type: 'line',
        data: predictionData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Previsão de necessidade de manutenção'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
    
    console.log('✅ Графік прогнозів створено');
}

// Функція для завантаження AI рекомендацій
function loadAIRecommendations() {
    const container = document.getElementById('ai-recommendations');
    if (!container) {
        console.warn('⚠️ Контейнер ai-recommendations не знайдено');
        return;
    }
    
    // Генеруємо AI рекомендації
    const recommendations = [
        {
            type: 'critical',
            icon: '🚨',
            title: 'Aviso crítico',
            text: 'Elevador #L003 necessita de revisão imediata do sistema de travagem'
        },
        {
            type: 'warning',
            icon: '⚠️',
            title: 'Manutenção planeada',
            text: 'Recomenda-se realizar manutenção dos elevadores #L001, #L005 nos próximos 7 dias'
        },
        {
            type: 'info',
            icon: '💡',
            title: 'Otimização',
            text: 'Identificada possibilidade de redução do consumo energético em 15%'
        },
        {
            type: 'success',
            icon: '✅',
            title: 'Excelente desempenho',
            text: 'Elevadores #L002, #L004 funcionam em modo ótimo'
        }
    ];
    
    const html = recommendations.map(rec => `
        <div class="alert alert-${rec.type === 'critical' ? 'danger' : rec.type === 'warning' ? 'warning' : rec.type === 'info' ? 'info' : 'success'} mb-3">
            <strong>${rec.icon} ${rec.title}</strong><br>
            <small>${rec.text}</small>
        </div>
    `).join('');
    
    container.innerHTML = html;
    console.log('✅ AI рекомендації завантажено');
}

// Функція activateAIPredictive тепер знаходиться в HTML файлі

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM завантажено, ініціалізуємо Analytics Engine...');
    
    try {
        analyticsEngine = new UnifiedAnalyticsEngine();
        
        // Додатковий debug для хешу
        if (window.location.hash) {
            console.log(`🔗 Знайдено хеш при завантаженні: ${window.location.hash}`);
        }
        
        console.log('✅ Analytics Engine com sucesso ініціалізовано');
        
    } catch (error) {
        console.error('❌ Critical error initializing Analytics Engine:', error);
        
        // Fallback обробка хешу без повного engine
        if (window.location.hash === '#predictive-analytics') {
            console.log('🔄 Пробуємо fallback активацію AI прогнозування...');
            
            const activatePredictiveTab = () => {
                const tabButton = document.querySelector('[data-target="#predictive-analytics"]');
                const tabPane = document.querySelector('#predictive-analytics');
                
                if (tabButton && tabPane) {
                    console.log('🎯 Знайдено елементи для fallback активації');
                    
                    // Спробуємо використати Bootstrap 4 API якщо він доступний
                    if (typeof $ !== 'undefined' && $.fn.tab) {
                        console.log('📋 Використовуємо Bootstrap 4 API для активації таба');
                        $(tabButton).tab('show');
                        console.log('✅ Bootstrap API активація завершена');
                    } else {
                        console.log('📋 Використовуємо прямі DOM маніпуляції');
                        // Вимикаємо всі таби
                        document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
                        document.querySelectorAll('.tab-pane').forEach(pane => {
                            pane.classList.remove('active', 'show');
                        });
                        
                        // Включаємо потрібний таб
                        tabButton.classList.add('active');
                        tabPane.classList.add('active', 'show');
                        console.log('✅ DOM маніпуляції завершені');
                    }
                    
                    console.log('✅ Fallback активація AI прогнозування успішна');
                } else {
                    console.error('❌ Не вдалося знайти елементи для fallback активації');
                    console.log('🔍 Доступні data-target елементи:', 
                        Array.from(document.querySelectorAll('[data-target]')).map(el => el.dataset.target));
                }
            };
            
            // Спробуємо кілька разів з інтервалом
            let attempts = 0;
            const maxAttempts = 5;
            const tryActivate = () => {
                attempts++;
                console.log(`🔄 Спроба активації ${attempts}/${maxAttempts}`);
                
                if (document.querySelector('[data-target="#predictive-analytics"]')) {
                    activatePredictiveTab();
                } else if (attempts < maxAttempts) {
                    setTimeout(tryActivate, 1000);
                } else {
                    console.error('❌ Не вдалося знайти таб після всіх спроб');
                }
            };
            
            setTimeout(tryActivate, 1000);
        }
    }
});

// Exportar для використання в інших модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedAnalyticsEngine;
}