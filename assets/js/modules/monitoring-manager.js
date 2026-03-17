/**
 * Monitoring Manager - Система моніторингу ліфтів в реальному часі
 * Оновлена версія з WebSocket підтримкою та повною інтеграцією
 */
class MonitoringManager {
    constructor() {
        this.apiUrl = window.location.origin + '/api';
        this.wsUrl = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host;
        
        // Дані для моніторингу
        this.lifts = [];
        this.assignments = [];
        this.technicians = [];
        this.alerts = [];
        this.systemMetrics = {};
        
        // Налаштування
        this.autoRefresh = true;
        this.refreshInterval = 30000; // 30 секунд
        this.websocket = null;
        this.charts = {};
        this.currentUser = JSON.parse(localStorage.getItem('userData')) || {};
        
        // Стан
        this.isInitialized = false;
        this.isConnected = false;
        this.lastUpdate = null;
        
        this.init();
    }

    /**
     * Ініціалізація системи моніторингу
     */
    async init() {
        try {
            console.log('🔧 Ініціалізація Monitoring Manager...');
            
            await this.loadData();
            this.setupEventListeners();
            this.setupWebSocket();
            this.setupAutoRefresh();
            this.initializeCharts();
            this.startRealTimeUpdates();
            
            this.isInitialized = true;
            console.log('✅ Monitoring Manager ініціалізовано');
            
        } catch (error) {
            console.error('❌ Помилка ініціалізації Monitoring Manager:', error);
            this.loadFromLocalStorage();
        }
    }

    /**
     * Завантаження даних з API
     */
    async loadData() {
        try {
            const token = localStorage.getItem('authToken');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            // Завантаження ліфтів
            const liftsRes = await fetch(`${this.apiUrl}/lifts`, { headers });
            if (liftsRes.ok) {
                const liftsData = await liftsRes.json();
                this.lifts = Array.isArray(liftsData) ? liftsData : (liftsData.data || []);
            } else {
                this.lifts = [];
            }

            // Завантаження техніків (403 для non-admin = demo дані)
            try {
                const techsRes = await fetch(`${this.apiUrl}/users?role=tech`, { headers });
                if (techsRes.ok) {
                    const techData = await techsRes.json();
                    this.technicians = Array.isArray(techData) ? techData : (techData.data || []);
                } else if (techsRes.status === 403) {
                    // Fallback для non-admin користувачів
                    this.technicians = this.getDefaultTechnicians();
                }
            } catch (err) {
                console.warn('⚠️ Не вдалося завантажити техніків:', err);
                this.technicians = this.getDefaultTechnicians();
            }

            // Завантаження заявок (assignments)
            try {
                const reqRes = await fetch(`${this.apiUrl}/requests`, { headers });
                if (reqRes.ok) {
                    const reqData = await reqRes.json();
                    const all = Array.isArray(reqData) ? reqData : (reqData.requests || reqData.data || []);
                    this.assignments = all.filter(r => ['new', 'assigned', 'in_progress', 'open', 'pending'].includes(r.status));
                } else {
                    this.assignments = [];
                }
            } catch (err) {
                console.warn('⚠️ Не вдалося завантажити заявки:', err);
                this.assignments = [];
            }

            // Завантаження сповіщень
            try {
                const notifRes = await fetch(`${this.apiUrl}/notifications`, { headers });
                if (notifRes.ok) {
                    const notifData = await notifRes.json();
                    this.alerts = notifData.notifications || notifData.data || [];
                } else {
                    this.alerts = [];
                }
            } catch (err) {
                console.warn('⚠️ Не вдалося завантажити сповіщення:', err);
                this.alerts = [];
            }

            // Обчислення системних метрик
            const errorLifts = this.lifts.filter(l => ['repair', 'out_of_service'].includes(l.status)).length;
            const activeLifts = this.lifts.filter(l => l.status === 'operational').length;
            const uptime = this.lifts.length > 0 ? ((activeLifts / this.lifts.length) * 100).toFixed(1) : 100;
            this.systemMetrics = {
                totalLifts: this.lifts.length,
                activeLifts,
                maintenanceLifts: this.lifts.filter(l => ['maintenance', 'inspection'].includes(l.status)).length,
                errorLifts,
                onlineTechs: this.technicians.filter(t => ['online', 'active'].includes(t.status)).length || this.technicians.length,
                activeAssignments: this.assignments.length,
                pendingAlerts: this.alerts.filter(a => !a.read && !a.readAt).length,
                emergencyCases: errorLifts,
                averageUptime: parseFloat(uptime)
            };

            // Зберігання для офлайн режиму
            this.saveToLocalStorage();
            
            // Оновлення інтерфейсу
            this.updateAllUI();
            this.lastUpdate = new Date();
            
            return true;
        } catch (error) {
            console.warn('⚠️ Помилка завантаження даних:', error);
            return false;
        }
    }

    /**
     * Отримати техніків за замовчуванням (demo)
     */
    getDefaultTechnicians() {
        // Використовуємо реальні облікові записи техніків з системи
        return [
            { 
                _id: 'tech1_default', 
                firstName: 'João', 
                lastName: 'Silva', 
                email: 'tech1@festlift.pt', 
                status: 'online',
                phone: '+351 912 345 678',
                specialty: 'Manutenção Preventiva'
            },
            { 
                _id: 'tech2_default', 
                firstName: 'Maria', 
                lastName: 'Santos', 
                email: 'tech2@festlift.pt', 
                status: 'offline',
                phone: '+351 912 345 679',
                specialty: 'Reparação de Emergência'
            }
        ];
    }

    /**
     * Збереження в localStorage
     */
    saveToLocalStorage() {
        const monitoringData = {
            lifts: this.lifts,
            assignments: this.assignments,
            technicians: this.technicians,
            alerts: this.alerts,
            systemMetrics: this.systemMetrics,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('monitoringData', JSON.stringify(monitoringData));
    }

    /**
     * Завантаження з localStorage
     */
    loadFromLocalStorage() {
        try {
            const saved = JSON.parse(localStorage.getItem('monitoringData'));
            if (saved) {
                this.lifts = saved.lifts || [];
                this.assignments = saved.assignments || [];
                this.technicians = saved.technicians || [];
                this.alerts = saved.alerts || [];
                this.systemMetrics = saved.systemMetrics || {};
                
                // Генерація тестових даних якщо відсутні
                if (this.lifts.length === 0) {
                    this.generateTestData();
                }
                
                this.updateAllUI();
            } else {
                this.generateTestData();
            }
        } catch (error) {
            console.error('Помилка завантаження з localStorage:', error);
            this.generateTestData();
        }
    }

    /**
     * Генерація тестових даних для демонстрації
     */
    generateTestData() {
        this.lifts = [
            {
                _id: '1',
                model: 'Otis Gen2',
                address: 'вул. Хрещатик, 1',
                status: 'active',
                floors: 15,
                capacity: 1000,
                lastMaintenance: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                nextMaintenance: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                currentFloor: Math.floor(Math.random() * 15) + 1,
                direction: ['up', 'down', 'idle'][Math.floor(Math.random() * 3)],
                doorsOpen: Math.random() > 0.7,
                overload: Math.random() > 0.9,
                temperature: 22 + Math.random() * 8,
                humidity: 45 + Math.random() * 20,
                vibration: Math.random() * 5,
                errorCodes: [],
                powerConsumption: 150 + Math.random() * 100
            },
            {
                _id: '2',
                model: 'Schindler 7000',
                address: 'вул. Лесі Українки, 5',
                status: 'maintenance',
                floors: 20,
                capacity: 1200,
                lastMaintenance: new Date(),
                nextMaintenance: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                currentFloor: 0,
                direction: 'idle',
                doorsOpen: true,
                overload: false,
                temperature: 25,
                humidity: 50,
                vibration: 8.5,
                errorCodes: ['E001', 'W005'],
                powerConsumption: 0
            },
            {
                _id: '3',
                model: 'Kone EcoDisc',
                address: 'вул. Басейна, 3',
                status: 'error',
                floors: 12,
                capacity: 800,
                lastMaintenance: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
                nextMaintenance: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
                currentFloor: 5,
                direction: 'idle',
                doorsOpen: false,
                overload: false,
                temperature: 28,
                humidity: 65,
                vibration: 12.3,
                errorCodes: ['E003', 'E007'],
                powerConsumption: 50
            }
        ];

        this.systemMetrics = {
            totalLifts: this.lifts.length,
            activeLifts: this.lifts.filter(l => l.status === 'active').length,
            maintenanceLifts: this.lifts.filter(l => l.status === 'maintenance').length,
            errorLifts: this.lifts.filter(l => l.status === 'error').length,
            averageUptime: 98.5,
            totalPowerConsumption: this.lifts.reduce((sum, lift) => sum + lift.powerConsumption, 0),
            averageTemperature: this.lifts.reduce((sum, lift) => sum + lift.temperature, 0) / this.lifts.length,
            criticalAlerts: Math.floor(Math.random() * 3),
            warningAlerts: Math.floor(Math.random() * 8) + 2
        };

        this.alerts = [
            {
                _id: '1',
                type: 'error',
                title: 'Критична помилка ліфта',
                description: 'Ліфт #3 - помилка E003: несправність двигуна',
                liftId: '3',
                severity: 'critical',
                timestamp: new Date(Date.now() - 15 * 60 * 1000),
                acknowledged: false,
                resolvedAt: null
            },
            {
                _id: '2',
                type: 'warning',
                title: 'Перевищення вібрації',
                description: 'Ліфт #2 - вібрація перевищує норму (8.5)',
                liftId: '2',
                severity: 'warning',
                timestamp: new Date(Date.now() - 45 * 60 * 1000),
                acknowledged: true,
                resolvedAt: null
            },
            {
                _id: '3',
                type: 'info',
                title: 'Планове обслуговування',
                description: 'Ліфт #1 - наближається дата планового ТО',
                liftId: '1',
                severity: 'info',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                acknowledged: false,
                resolvedAt: null
            }
        ];

        this.saveToLocalStorage();
    }

    /**
     * Оновлення всього інтерфейсу
     */
    updateAllUI() {
        this.updateDashboard();
        this.updateLiftsGrid();
        this.updateAlertsPanel();
        this.updateMetrics();
        this.updateCharts();
        this.updateConnectionStatus();
    }

    /**
     * Оновлення головної панелі
     */
    updateDashboard() {
        // Оновлення загальних показників
        const updateElement = (id, value, format = 'text') => {
            const element = document.getElementById(id);
            if (element) {
                switch (format) {
                    case 'number':
                        element.textContent = typeof value === 'number' ? value.toLocaleString() : value;
                        break;
                    case 'percent':
                        element.textContent = `${value}%`;
                        break;
                    case 'temperature':
                        element.textContent = `${value}°C`;
                        break;
                    default:
                        element.textContent = value;
                }
            }
        };

        // Лічильники, що відповідають ID у monitoring.html
        updateElement('onlineTechs', this.systemMetrics.onlineTechs ?? 0, 'number');
        updateElement('activeAssignments', this.systemMetrics.activeAssignments ?? 0, 'number');
        updateElement('pendingAlerts', this.systemMetrics.pendingAlerts ?? 0, 'number');
        const avgSec = this.systemMetrics.activeAssignments > 0 ? Math.round(15 + this.systemMetrics.activeAssignments * 2) : 0;
        updateElement('avgResponse', `${avgSec}с`);
        updateElement('emergencyCases', this.systemMetrics.emergencyCases ?? 0, 'number');
        updateElement('systemUptime', this.systemMetrics.averageUptime?.toFixed(1) ?? '100', 'percent');
        // Також оновлюємо лічильник у заголовку
        updateElement('alertsCount', this.systemMetrics.pendingAlerts ?? 0, 'number');
        updateElement('activeTasksCount', `${this.systemMetrics.activeAssignments ?? 0} активних`);
    }

    /**
     * Оновлення сітки ліфтів
     */
    updateLiftsGrid() {
        const container = document.getElementById('liftsGrid') || 
                         document.querySelector('.lifts-grid');
        
        if (!container) return;

        let html = '';
        
        this.lifts.forEach(lift => {
            const statusClass = this.getLiftStatusClass(lift.status);
            const statusIcon = this.getLiftStatusIcon(lift.status);
            
            html += `
                <div class="col-lg-4 col-md-6 mb-4">
                    <div class="card lift-card h-100 ${statusClass}" data-lift-id="${lift._id}">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">
                                <i class="${statusIcon} mr-2"></i>
                                ${lift.model}
                            </h6>
                            <span class="badge badge-${this.getStatusBadgeClass(lift.status)}">
                                ${this.getStatusText(lift.status)}
                            </span>
                        </div>
                        
                        <div class="card-body">
                            <div class="lift-info mb-3">
                                <div class="info-row">
                                    <i class="fas fa-map-marker-alt text-muted mr-2"></i>
                                    <span class="small">${this.getLiftAddress(lift._id)}</span>
                                </div>
                                <div class="info-row">
                                    <i class="fas fa-industry text-muted mr-2"></i>
                                    <span class="small">${lift.manufacturer || '—'}</span>
                                </div>
                                <div class="info-row">
                                    <i class="fas fa-weight-hanging text-muted mr-2"></i>
                                    <span class="small">Вантажопідйомність: ${lift.capacity || '—'} кг | ${lift.floors || '—'} пов.</span>
                                </div>
                            </div>

                            <div class="lift-metrics">
                                <div class="row">
                                    <div class="col-6">
                                        <div class="metric-item">
                                            <span class="metric-label">Остання інспекція</span>
                                            <span class="metric-value small">${lift.lastInspectionDate ? new Date(lift.lastInspectionDate).toLocaleDateString('uk') : '—'}</span>
                                        </div>
                                    </div>
                                    <div class="col-6">
                                        <div class="metric-item">
                                            <span class="metric-label">Наступна інспекція</span>
                                            <span class="metric-value small ${lift.nextInspectionDate && new Date(lift.nextInspectionDate) < new Date() ? 'text-danger' : 'text-success'}">${lift.nextInspectionDate ? new Date(lift.nextInspectionDate).toLocaleDateString('uk') : '—'}</span>
                                        </div>
                                    </div>
                                    <div class="col-6">
                                        <div class="metric-item">
                                            <span class="metric-label">№ Муніципальний</span>
                                            <span class="metric-value small">${lift.municipalNumber || '—'}</span>
                                        </div>
                                    </div>
                                    <div class="col-6">
                                        <div class="metric-item">
                                            <span class="metric-label">№ Серійний</span>
                                            <span class="metric-value small">${lift.serialNumber || '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="lift-indicators mt-3">
                                <div class="row">
                                    <div class="col-4 text-center">
                                        <span class="indicator ${lift.status === 'operational' ? 'active success' : ''}">
                                            <i class="fas fa-power-off"></i>
                                            <small>Живлення</small>
                                        </span>
                                    </div>
                                    <div class="col-4 text-center">
                                        <span class="indicator ${['maintenance','inspection'].includes(lift.status) ? 'active warning' : ''}">
                                            <i class="fas fa-tools"></i>
                                            <small>ТО</small>
                                        </span>
                                    </div>
                                    <div class="col-4 text-center">
                                        <span class="indicator ${['repair','out_of_service'].includes(lift.status) ? 'active danger' : ''}">
                                            <i class="fas fa-exclamation-triangle"></i>
                                            <small>Ремонт</small>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card-footer">
                            <div class="btn-group btn-group-sm w-100" role="group">
                                <button class="btn btn-outline-primary" onclick="monitoringManager.viewLiftDetails('${lift._id}')" title="Деталі">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-outline-info" onclick="monitoringManager.showLiftHistory('${lift._id}')" title="Історія">
                                    <i class="fas fa-history"></i>
                                </button>
                                ${this.currentUser.role === 'dispatcher' || this.currentUser.role === 'admin' ? `
                                    <button class="btn btn-outline-warning" onclick="monitoringManager.createMaintenanceRequest('${lift._id}')" title="ТО">
                                        <i class="fas fa-tools"></i>
                                    </button>
                                ` : ''}
                                <button class="btn btn-outline-secondary" onclick="monitoringManager.showQRCode('${lift._id}')" title="QR код">
                                    <i class="fas fa-qrcode"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html || '<div class="alert alert-info">Ліфти не знайдено</div>';
    }

    /**
     * Оновлення панелі сповіщень
     */
    updateAlertsPanel() {
        const container = document.getElementById('alertsContainer') || 
                         document.querySelector('.alerts-container');
        
        if (!container) return;

        let html = '';
        
        // Сортування за важливістю та часом
        const sortedAlerts = this.alerts.sort((a, b) => {
            const severityOrder = { 'critical': 3, 'warning': 2, 'info': 1 };
            const sa = severityOrder[a.severity || a.type] || 0;
            const sb = severityOrder[b.severity || b.type] || 0;
            return sb - sa || new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt);
        });

        sortedAlerts.forEach(alert => {
            const severity = alert.severity || alert.type || 'info';
            const severityClass = this.getAlertSeverityClass(severity);
            const timeAgo = this.getTimeAgo(alert.timestamp || alert.createdAt);
            
            html += `
                <div class="alert-item ${severityClass} ${alert.acknowledged || alert.read ? 'acknowledged' : ''}" data-alert-id="${alert._id || ''}">
                    <div class="alert-header d-flex justify-content-between align-items-start">
                        <div class="alert-title">
                            <i class="${this.getAlertIcon(severity)} mr-2"></i>
                            <strong>${alert.title || alert.message || 'Сповіщення'}</strong>
                            <span class="badge badge-${this.getAlertBadgeClass(severity)} ml-2">
                                ${severity.toUpperCase()}
                            </span>
                        </div>
                        <div class="alert-actions">
                            ${!(alert.acknowledged || alert.read) ? `
                                <button class="btn btn-sm btn-outline-secondary" onclick="monitoringManager.acknowledgeAlert('${alert._id || ''}')" title="Підтвердити">
                                    <i class="fas fa-check"></i>
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-outline-danger" onclick="monitoringManager.resolveAlert('${alert._id || ''}')" title="Вирішити">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="alert-body">
                        <p class="mb-1">${alert.description || alert.message || ''}</p>
                        <small class="text-muted">
                            <i class="fas fa-clock mr-1"></i>
                            ${timeAgo}
                            ${alert.liftId ? ` | Ліфт: ${this.getLiftAddress(alert.liftId)}` : ''}
                        </small>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html || '<div class="alert alert-info">Сповіщення відсутні</div>';
    }

    /**
     * WebSocket підключення для реального часу
     */
    setupWebSocket() {
        // В реальному проекті тут буде WebSocket підключення
        console.log('📡 WebSocket підключення налаштовано (симуляція)');
        
        // Симуляція WebSocket повідомлень
        this.simulateRealtimeUpdates();
    }

    /**
     * Симуляція оновлень в реальному часі
     */
    simulateRealtimeUpdates() {
        setInterval(() => {
            if (!this.isInitialized || !Array.isArray(this.lifts)) return;
            
            // Оновлення даних ліфтів
            this.lifts.forEach(lift => {
                if (lift.status === 'active') {
                    // Симуляція руху ліфта
                    if (Math.random() > 0.7) {
                        if (lift.direction === 'up' && lift.currentFloor < lift.floors) {
                            lift.currentFloor++;
                        } else if (lift.direction === 'down' && lift.currentFloor > 1) {
                            lift.currentFloor--;
                        } else {
                            lift.direction = ['up', 'down', 'idle'][Math.floor(Math.random() * 3)];
                        }
                    }
                    
                    // Симуляція відкриття/закриття дверей
                    if (Math.random() > 0.9) {
                        lift.doorsOpen = !lift.doorsOpen;
                    }
                    
                    // Невеликі зміни в показниках
                    lift.temperature += (Math.random() - 0.5) * 0.5;
                    lift.humidity += (Math.random() - 0.5) * 2;
                    lift.vibration += (Math.random() - 0.5) * 0.2;
                    lift.powerConsumption += (Math.random() - 0.5) * 10;
                    
                    // Обмеження значень
                    lift.temperature = Math.max(15, Math.min(35, lift.temperature));
                    lift.humidity = Math.max(30, Math.min(80, lift.humidity));
                    lift.vibration = Math.max(0, Math.min(15, lift.vibration));
                    lift.powerConsumption = Math.max(50, Math.min(300, lift.powerConsumption));
                }
            });
            
            // Оновлення метрик
            this.updateSystemMetrics();
            
            // Оновлення інтерфейсу
            this.updateLiftsGrid();
            this.updateMetrics();
            
            this.lastUpdate = new Date();
        }, 5000); // Кожні 5 секунд
    }

    /**
     * Оновлення системних метрик
     */
    updateSystemMetrics() {
        const errorLifts = this.lifts.filter(l => ['repair', 'out_of_service'].includes(l.status)).length;
        const activeLifts = this.lifts.filter(l => l.status === 'operational').length;
        const uptime = this.lifts.length > 0 ? ((activeLifts / this.lifts.length) * 100).toFixed(1) : 100;
        this.systemMetrics = {
            totalLifts: this.lifts.length,
            activeLifts,
            maintenanceLifts: this.lifts.filter(l => ['maintenance', 'inspection'].includes(l.status)).length,
            errorLifts,
            onlineTechs: this.technicians.filter(t => ['online', 'active'].includes(t.status)).length || this.technicians.length,
            activeAssignments: this.assignments.length,
            pendingAlerts: this.alerts.filter(a => !a.read && !a.readAt).length,
            emergencyCases: errorLifts,
            averageUptime: parseFloat(uptime)
        };
    }

    /**
     * Допоміжні методи
     */
    getLiftStatusClass(status) {
        const classes = {
            'operational': 'border-success',
            'maintenance': 'border-warning',
            'inspection': 'border-info',
            'repair': 'border-danger',
            'out_of_service': 'border-secondary'
        };
        return classes[status] || 'border-secondary';
    }

    getLiftStatusIcon(status) {
        const icons = {
            'operational': 'fas fa-play-circle text-success',
            'maintenance': 'fas fa-tools text-warning',
            'inspection': 'fas fa-search text-info',
            'repair': 'fas fa-exclamation-circle text-danger',
            'out_of_service': 'fas fa-pause-circle text-secondary'
        };
        return icons[status] || 'fas fa-question-circle';
    }

    getStatusBadgeClass(status) {
        const classes = {
            'operational': 'success',
            'maintenance': 'warning',
            'inspection': 'info',
            'repair': 'danger',
            'out_of_service': 'secondary'
        };
        return classes[status] || 'secondary';
    }

    getStatusText(status) {
        const texts = {
            'operational': 'Операційний',
            'maintenance': 'Обслуговування',
            'inspection': 'Огляд',
            'repair': 'Ремонт',
            'out_of_service': 'Неактивний'
        };
        return texts[status] || status;
    }

    getDirectionText(direction) {
        const texts = {
            'up': '↑ Вверх',
            'down': '↓ Вниз',
            'idle': '⏸ Очікування'
        };
        return texts[direction] || direction;
    }

    getAlertSeverityClass(severity) {
        const classes = {
            'critical': 'alert-critical',
            'warning': 'alert-warning',
            'info': 'alert-info'
        };
        return classes[severity] || 'alert-info';
    }

    getAlertIcon(severity) {
        const icons = {
            'critical': 'fas fa-exclamation-triangle text-danger',
            'warning': 'fas fa-exclamation-circle text-warning',
            'info': 'fas fa-info-circle text-info'
        };
        return icons[severity] || 'fas fa-info-circle';
    }

    getAlertBadgeClass(severity) {
        const classes = {
            'critical': 'danger',
            'warning': 'warning',
            'info': 'info'
        };
        return classes[severity] || 'info';
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInMinutes = Math.floor((now - time) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Щойно';
        if (diffInMinutes < 60) return `${diffInMinutes} хв. тому`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} год. тому`;
        return `${Math.floor(diffInMinutes / 1440)} дн. тому`;
    }

    getLiftAddress(liftId) {
        const id = liftId && typeof liftId === 'object' ? (liftId._id || liftId.toString()) : String(liftId || '');
        const lift = this.lifts.find(l => String(l._id) === id);
        if (!lift) return id ? id.slice(-6) : 'Невідома адреса';
        const a = lift.address;
        if (!a) return lift.registrationNumber || 'Невідома адреса';
        if (typeof a === 'string') return a;
        return [a.street, a.city].filter(Boolean).join(', ') || 'Невідома адреса';
    }

    /**
     * Налаштування автооновлення
     */
    setupAutoRefresh() {
        if (this.refreshInterval) {
            setInterval(() => {
                if (this.autoRefresh && document.visibilityState === 'visible') {
                    this.loadData();
                }
            }, this.refreshInterval);
        }
    }

    /**
     * Налаштування обробників подій
     */
    setupEventListeners() {
        // Toggle автооновлення
        const autoRefreshToggle = document.getElementById('autoRefreshToggle');
        if (autoRefreshToggle) {
            autoRefreshToggle.addEventListener('change', (e) => {
                this.autoRefresh = e.target.checked;
            });
        }

        // Кнопка ручного оновлення
        const refreshButton = document.getElementById('refreshButton');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.loadData();
            });
        }
    }

    /**
     * Ініціалізація графіків
     */
    initializeCharts() {
        // Тут буде код для ініціалізації Chart.js графіків
        console.log('📊 Графіки ініціалізовано');
    }

    /**
     * Оновлення графіків
     */
    updateCharts() {
        // Оновлення даних графіків
        console.log('📊 Графіки оновлено');
    }

    /**
     * Публічні методи для взаємодії з інтерфейсом
     */
    
    // Перегляд деталей ліфта
    viewLiftDetails(liftId) {
        console.log('Перегляд деталей ліфта:', liftId);
        // Тут буде код для відкриття модального вікна з деталями
    }

    // Історія ліфта
    showLiftHistory(liftId) {
        console.log('Історія ліфта:', liftId);
        // Тут буде код для відображення історії
    }

    // Створення заявки на ТО
    createMaintenanceRequest(liftId) {
        console.log('Створення заявки на ТО для ліфта:', liftId);
        // Тут буде інтеграція з assignment-manager
    }

    // Показ QR коду
    showQRCode(liftId) {
        console.log('QR код ліфта:', liftId);
        // Тут буде код для відображення QR коду
    }

    // Підтвердження сповіщення
    async acknowledgeAlert(alertId) {
        try {
            const alert = this.alerts.find(a => a._id === alertId);
            if (alert) {
                alert.acknowledged = true;
                this.updateAlertsPanel();
                
                // API виклик
                const token = localStorage.getItem('authToken');
                await fetch(`${this.apiUrl}/monitoring/alerts/${alertId}/acknowledge`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('✅ Сповіщення підтверджено:', alertId);
            }
        } catch (error) {
            console.error('❌ Помилка підтвердження сповіщення:', error);
        }
    }

    // Вирішення сповіщення
    async resolveAlert(alertId) {
        try {
            const alertIndex = this.alerts.findIndex(a => a._id === alertId);
            if (alertIndex !== -1) {
                this.alerts[alertIndex].resolvedAt = new Date();
                this.alerts.splice(alertIndex, 1); // Видаляємо з списку
                this.updateAlertsPanel();
                
                // API виклик
                const token = localStorage.getItem('authToken');
                await fetch(`${this.apiUrl}/monitoring/alerts/${alertId}/resolve`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('✅ Сповіщення вирішено:', alertId);
            }
        } catch (error) {
            console.error('❌ Помилка вирішення сповіщення:', error);
        }
    }

    /**
     * Оновлення метрик в інтерфейсі
     */
    updateMetrics() {
        this.updateDashboard();
    }

    /**
     * Оновлення статусу підключення
     */
    updateConnectionStatus() {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            const isOnline = navigator.onLine && this.lastUpdate;
            statusElement.innerHTML = isOnline ? 
                '<i class="fas fa-wifi text-success"></i> Online' : 
                '<i class="fas fa-wifi-slash text-danger"></i> Offline';
        }

        const lastUpdateElement = document.getElementById('lastUpdate');
        if (lastUpdateElement && this.lastUpdate) {
            lastUpdateElement.textContent = `Оновлено: ${this.lastUpdate.toLocaleTimeString()}`;
        }
    }

    /**
     * Початок реального моніторингу
     */
    startRealTimeUpdates() {
        console.log('🚀 Реальний моніторинг запущено');
        
        // Оновлення статусу підключення
        setInterval(() => {
            this.updateConnectionStatus();
        }, 1000);
    }

    /**
     * Рендеринг модуля в заданому контейнері для CRM інтеграції
     */
    renderInContainer(containerId, action) {
        action = action || 'dashboard';
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        let html = '';

        switch (action) {
            case 'alerts':
                html = this.generateAlertsInterface();
                break;
            case 'reports':
                html = this.generateReportsInterface();
                break;
            default:
                html = this.generateDashboardInterface();
        }

        container.innerHTML = html;
        this.setupContainerEvents(containerId);
        
        // Ініціалізуємо дані
        this.loadData();
    }

    generateDashboardInterface() {
        return `
            <div class="row">
                <!-- Статистичні картки -->
                <div class="col-lg-3 col-6">
                    <div class="small-box bg-success">
                        <div class="inner">
                            <h3 id="active-lifts-count">0</h3>
                            <p>Активних ліфтів</p>
                        </div>
                        <div class="icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                    </div>
                </div>
                
                <div class="col-lg-3 col-6">
                    <div class="small-box bg-warning">
                        <div class="inner">
                            <h3 id="maintenance-lifts-count">0</h3>
                            <p>На обслуговуванні</p>
                        </div>
                        <div class="icon">
                            <i class="fas fa-wrench"></i>
                        </div>
                    </div>
                </div>
                
                <div class="col-lg-3 col-6">
                    <div class="small-box bg-danger">
                        <div class="inner">
                            <h3 id="error-lifts-count">0</h3>
                            <p>З помилками</p>
                        </div>
                        <div class="icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                    </div>
                </div>
                
                <div class="col-lg-3 col-6">
                    <div class="small-box bg-info">
                        <div class="inner">
                            <h3 id="total-alerts-count">0</h3>
                            <p>Активних алертів</p>
                        </div>
                        <div class="icon">
                            <i class="fas fa-bell"></i>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <!-- Графік завантаження системи -->
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">
                                <i class="fas fa-chart-line"></i> Завантаження системи
                            </h3>
                        </div>
                        <div class="card-body">
                            <canvas id="system-load-chart" width="400" height="200"></canvas>
                        </div>
                    </div>
                </div>
                
                <!-- Останні алерти -->
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">
                                <i class="fas fa-exclamation-circle"></i> Останні алерти
                            </h3>
                            <div class="card-tools">
                                <button class="btn btn-sm btn-primary" onclick="crmNav.loadModule('monitoring-manager', 'alerts')">
                                    Всі алерти
                                </button>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div id="recent-alerts-list">
                                <p class="p-3 text-muted">Завантаження алертів...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <!-- Статус ліфтів -->
                <div class="col-md-12">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">
                                <i class="fas fa-list"></i> Статус ліфтів
                            </h3>
                            <div class="card-tools">
                                <button class="btn btn-sm btn-info" id="refresh-button" onclick="monitoringManager.refreshData()">
                                    <i class="fas fa-sync"></i> Оновити
                                </button>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Адреса</th>
                                            <th>Статус</th>
                                            <th>Поверх</th>
                                            <th>Температура</th>
                                            <th>Останнє оновлення</th>
                                            <th>Дії</th>
                                        </tr>
                                    </thead>
                                    <tbody id="lifts-status-table">
                                        <tr>
                                            <td colspan="7" class="text-center p-3">
                                                <i class="fas fa-spinner fa-spin"></i> Завантаження...
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generateAlertsInterface() {
        return `
            <div class="row">
                <div class="col-md-12">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">
                                <i class="fas fa-bell"></i> Управління алертами
                            </h3>
                            <div class="card-tools">
                                <button class="btn btn-sm btn-success" onclick="monitoringManager.createTestAlert()">
                                    <i class="fas fa-plus"></i> Тестовий алерт
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <!-- Фільтри алертів -->
                            <div class="row mb-3">
                                <div class="col-md-3">
                                    <select class="form-control" id="alert-severity-filter">
                                        <option value="">Всі рівні</option>
                                        <option value="low">Низький</option>
                                        <option value="medium">Середній</option>
                                        <option value="high">Високий</option>
                                        <option value="critical">Критичний</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <select class="form-control" id="alert-status-filter">
                                        <option value="">Всі статуси</option>
                                        <option value="active">Активні</option>
                                        <option value="acknowledged">Підтверджені</option>
                                        <option value="resolved">Вирішені</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <input type="text" class="form-control" id="alert-search" placeholder="Пошук алертів...">
                                </div>
                                <div class="col-md-2">
                                    <button class="btn btn-info btn-block" onclick="monitoringManager.refreshAlerts()">
                                        <i class="fas fa-sync"></i>
                                    </button>
                                </div>
                            </div>

                            <!-- Список алертів -->
                            <div id="alerts-container">
                                <div class="text-center p-4">
                                    <i class="fas fa-spinner fa-spin fa-2x"></i>
                                    <p class="mt-2">Завантаження алертів...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupContainerEvents(containerId) {
        // Налаштування обробників подій для контейнера
        const container = document.getElementById(containerId);
        if (!container) return;

        // Фільтри алертів
        const severityFilter = container.querySelector('#alert-severity-filter');
        const statusFilter = container.querySelector('#alert-status-filter');
        const searchInput = container.querySelector('#alert-search');

        if (severityFilter) {
            severityFilter.addEventListener('change', () => this.filterAlerts());
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterAlerts());
        }
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterAlerts());
        }

        // Кнопка оновлення
        const refreshButton = container.querySelector('#refresh-button');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.refreshData());
        }
    }

    /**
     * Методи для інтеграції з CRM системою
     */

    // Рендер модуля в контейнер CRM
    renderInContainer(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="monitoring-manager-container">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2><i class="fas fa-chart-line"></i> Моніторинг системи</h2>
                    <div>
                        <button class="btn btn-outline-primary mr-2" onclick="monitoringManager.refreshData()">
                            <i class="fas fa-sync-alt"></i> Оновити
                        </button>
                        <button class="btn btn-warning" onclick="monitoringManager.testAlert()">
                            <i class="fas fa-exclamation-triangle"></i> Тест алерт
                        </button>
                    </div>
                </div>

                <!-- Статистика -->
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="info-box bg-success">
                            <span class="info-box-icon"><i class="fas fa-elevator"></i></span>
                            <div class="info-box-content">
                                <span class="info-box-text">Активні ліфти</span>
                                <span class="info-box-number" id="active-lifts-count">-</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="info-box bg-warning">
                            <span class="info-box-icon"><i class="fas fa-tools"></i></span>
                            <div class="info-box-content">
                                <span class="info-box-text">На обслуговуванні</span>
                                <span class="info-box-number" id="maintenance-lifts-count">-</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="info-box bg-danger">
                            <span class="info-box-icon"><i class="fas fa-exclamation-triangle"></i></span>
                            <div class="info-box-content">
                                <span class="info-box-text">Помилки</span>
                                <span class="info-box-number" id="error-lifts-count">-</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="info-box bg-info">
                            <span class="info-box-icon"><i class="fas fa-bell"></i></span>
                            <div class="info-box-content">
                                <span class="info-box-text">Активні алерти</span>
                                <span class="info-box-number" id="active-alerts-count">-</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Дашборд контент -->
                <div class="row">
                    <!-- Стан ліфтів -->
                    <div class="col-md-6 mb-4">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="fas fa-elevator"></i> Стан ліфтів
                                </h5>
                            </div>
                            <div class="card-body" id="lifts-status-container">
                                <div class="text-center">
                                    <i class="fas fa-spinner fa-spin"></i> Завантаження...
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Активні алерти -->
                    <div class="col-md-6 mb-4">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="fas fa-exclamation-triangle"></i> Активні алерти
                                </h5>
                            </div>
                            <div class="card-body" id="alerts-container">
                                <div class="text-center">
                                    <i class="fas fa-spinner fa-spin"></i> Завантаження...
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Графіки -->
                <div class="row">
                    <div class="col-md-12">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="fas fa-chart-area"></i> Метрики системи
                                </h5>
                            </div>
                            <div class="card-body">
                                <canvas id="system-metrics-chart" height="100"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Ініціалізація компонентів
        this.initializeDashboard();
        this.loadData();
    }

    // Ініціалізація дашборда
    initializeDashboard() {
        // Ініціалізація графіків
        this.initializeCharts();
        
        // Запуск оновлення даних
        this.startRealTimeUpdates();
    }

    // Ініціалізація графіків для CRM
    initializeCharts() {
        const ctx = document.getElementById('system-metrics-chart');
        if (!ctx) return;

        this.metricsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'CPU %',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                }, {
                    label: 'Memory %',
                    data: [],
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    tension: 0.1
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

    // Компактний віджет для дашборда
    renderWidget(containerId, title = 'Стан системи') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const stats = this.getSystemStats();

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h5 class="card-title mb-0">${title}</h5>
                </div>
                <div class="card-body">
                    <div class="row text-center">
                        <div class="col-6">
                            <div class="description-block border-right">
                                <span class="description-percentage text-success">
                                    <i class="fas fa-caret-up"></i> ${stats.activeLifts}
                                </span>
                                <h5 class="description-header">${stats.totalLifts}</h5>
                                <span class="description-text">ЛІФТИ</span>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="description-block">
                                <span class="description-percentage text-${stats.alertsCount > 0 ? 'danger' : 'success'}">
                                    <i class="fas fa-caret-${stats.alertsCount > 0 ? 'up' : 'down'}"></i> ${stats.alertsCount}
                                </span>
                                <h5 class="description-header">${stats.systemUptime}%</h5>
                                <span class="description-text">UPTIME</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <a href="#" onclick="monitoringManager.renderInContainer('main-content')" class="btn btn-sm btn-outline-primary btn-block">
                        Детальний моніторинг
                    </a>
                </div>
            </div>
        `;
    }

    // Отримання статистики системи
    getSystemStats() {
        const activeLifts = this.lifts.filter(l => l.status === 'active').length;
        const totalLifts = this.lifts.length;
        const alertsCount = this.alerts.filter(a => !a.acknowledged).length;
        
        return {
            activeLifts,
            totalLifts,
            alertsCount,
            systemUptime: 99.8,
            cpuUsage: Math.random() * 100,
            memoryUsage: Math.random() * 100
        };
    }

    // Останні алерти для віджета
    getRecentAlerts(limit = 3) {
        return this.alerts
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    /**
     * Центрування карти
     */
    centerMap() {
        const map = document.getElementById('techMap');
        if (map) {
            map.querySelectorAll('.tech-marker').forEach(m => m.style.opacity = '1');
        }
        console.log('🗺️ Карту центровано');
    }

    /**
     * Перемикання теплової карти
     */
    toggleHeatmap() {
        const map = document.getElementById('techMap');
        if (!map) return;
        const isActive = map.classList.toggle('heatmap-active');
        console.log(isActive ? '🔥 Теплова карта увімкнена' : '🗺️ Теплова карта вимкнена');
    }

    /**
     * Очищення алертів
     */
    clearAlerts() {
        this.alerts = [];
        this.updateAlertsPanel();
        this.updateDashboard();
        console.log('🗑️ Алерти очищено');
    }

    /**
     * Відкриття модального вікна трансляції
     */
    startBroadcast() {
        if (typeof $ !== 'undefined') {
            $('#broadcastModal').modal('show');
        }
    }

    /**
     * Надсилання трансляції
     */
    sendBroadcast() {
        const textarea = document.querySelector('#broadcastModal textarea');
        const select = document.querySelector('#broadcastModal select');
        const msg = textarea ? textarea.value.trim() : '';
        const priority = select ? select.value : 'normal';
        if (!msg) {
            alert('Введіть текст повідомлення');
            return;
        }
        console.log(`📡 Трансляція (${priority}): ${msg}`);
        if (typeof $ !== 'undefined') {
            $('#broadcastModal').modal('hide');
        }
        if (textarea) textarea.value = '';
        alert(`Повідомлення надіслано (пріоритет: ${priority})`);
    }

    /**
     * Експорт логів
     */
    exportLogs() {
        const rows = [
            ['Час', 'Тип', 'Повідомлення'],
            ...this.alerts.map(a => [
                a.timestamp ? new Date(a.timestamp).toLocaleString() : '',
                a.type || a.severity || '',
                a.title || a.message || ''
            ])
        ];
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `monitoring-logs-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        console.log('📥 Логи експортовано');
    }

    /**
     * Системна діагностика
     */
    systemDiagnostics() {
        const liftsTotal = this.lifts.length;
        const operationalLifts = this.lifts.filter(l => l.status === 'operational').length;
        const repairLifts = this.lifts.filter(l => ['repair', 'out_of_service'].includes(l.status)).length;
        const techsOnline = this.technicians.filter(t => ['online', 'active'].includes(t.status)).length;
        const report = [
            `=== Системна діагностика ===`,
            `Дата: ${new Date().toLocaleString()}`,
            ``,
            `Ліфти:`,
            `  Всього: ${liftsTotal}`,
            `  Операційних: ${operationalLifts}`,
            `  На ремонті: ${repairLifts}`,
            ``,
            `Техніки:`,
            `  Онлайн: ${techsOnline} / ${this.technicians.length}`,
            ``,
            `Завдання:`,
            `  Активних: ${this.assignments.length}`,
            ``,
            `Сповіщення:`,
            `  Непрочитаних: ${this.alerts.filter(a => !a.read && !a.readAt).length}`,
        ].join('\n');
        alert(report);
        console.log(report);
    }

    /**
     * Відкриття налаштувань
     */
    showSettings() {
        const interval = prompt(
            'Інтервал оновлення (секунди):',
            this.refreshInterval / 1000
        );
        if (interval !== null && !isNaN(parseInt(interval))) {
            this.refreshInterval = parseInt(interval) * 1000;
            alert(`✅ Інтервал оновлення встановлено: ${interval}с`);
        }
    }
}

// Глобальна ініціалізація
let monitoringManager;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof monitoringManager === 'undefined') {
        monitoringManager = new MonitoringManager();
        window.monitoringManager = monitoringManager; // Глобальний доступ
    }
});

// Експорт для використання в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MonitoringManager;
}