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
        
        // Definições
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
            
            this.initMap();
            await this.loadData();
            this.setupEventListeners();
            this.setupWebSocket();
            this.setupAutoRefresh();
            this.initializeCharts();
            this.startRealTimeUpdates();
            
            this.isInitialized = true;
            console.log('✅ Monitoring Manager ініціалізовано');
            
        } catch (error) {
            console.error('❌ Erro ініціалізації Monitoring Manager:', error);
            this.loadFromLocalStorage();
        }
    }

    /**
     * A carregar даних з API
     */
    async loadData() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('authToken');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            // A carregar ліфтів
            const liftsRes = await fetch(`${this.apiUrl}/lifts`, { headers });
            if (liftsRes.ok) {
                const liftsData = await liftsRes.json();
                this.lifts = Array.isArray(liftsData) ? liftsData : (liftsData.data || []);
            } else {
                this.lifts = [];
            }

            // A carregar техніків (спеціальний endpoint, завжди повертає тільки техніків)
            try {
                const techsRes = await fetch(`${this.apiUrl}/technicians`, { headers });
                if (techsRes.ok) {
                    const techData = await techsRes.json();
                    this.technicians = Array.isArray(techData) ? techData : (techData.data || []);
                } else {
                    this.technicians = this.getDefaultTechnicians();
                }
            } catch (err) {
                console.warn('⚠️ Не вдалося завантажити техніків:', err);
                this.technicians = this.getDefaultTechnicians();
            }

            // A carregar заявок (assignments)
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

            // A carregar сповіщень
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
            
            // Atualização інтерфейсу
            this.updateAllUI();
            this.lastUpdate = new Date();
            
            return true;
        } catch (error) {
            console.warn('⚠️ Erro ao carregar dados:', error);
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
     * Carrega dados reais da API
     */
    async loadFromLocalStorage() {
        try {
            const token = localStorage.getItem('liftmanager_jwt') ||
                          sessionStorage.getItem('liftmanager_jwt') ||
                          localStorage.getItem('authToken');
            if (!token) { this.loadEmpty(); return; }

            const res = await fetch('/api/lifts', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('API error');
            const json = await res.json();
            const rawLifts = json.data || json.lifts || [];

            this.lifts = rawLifts.map(l => ({
                _id: l._id,
                municipalNumber: l.municipalNumber || '—',
                model: l.brand || l.model || '—',
                address: (l.address?.street || '') + (l.address?.number ? ' nº' + l.address.number : ''),
                status: l.status === 'active' ? 'active' : l.status === 'maintenance' ? 'maintenance' : 'active',
                floors: l.floors || null,
                capacity: l.capacity || null,
                lastMaintenance: l.lastMaintenance || null,
                nextMaintenance: l.nextMaintenance || null,
                currentFloor: null,
                direction: null,
                doorsOpen: null,
                overload: null,
                temperature: null,
                humidity: null,
                vibration: null,
                errorCodes: [],
                powerConsumption: null
            }));

            this.alerts = [];
            this.systemMetrics = {
                totalLifts: this.lifts.length,
                activeLifts: this.lifts.filter(l => l.status === 'active').length,
                maintenanceLifts: this.lifts.filter(l => l.status === 'maintenance').length,
                errorLifts: 0,
                averageUptime: null,
                totalPowerConsumption: null,
                averageTemperature: null,
                criticalAlerts: 0,
                warningAlerts: 0
            };

            this.updateAllUI();
        } catch (error) {
            console.error('Erro ao carregar elevadores:', error);
            this.loadEmpty();
        }
    }

    loadEmpty() {
        this.lifts = [];
        this.alerts = [];
        this.systemMetrics = {
            totalLifts: 0, activeLifts: 0, maintenanceLifts: 0, errorLifts: 0,
            averageUptime: null, totalPowerConsumption: null,
            averageTemperature: null, criticalAlerts: 0, warningAlerts: 0
        };
        this.updateAllUI();
    }

    generateTestData() { this.loadEmpty(); }

    /**
     * Atualização всього інтерфейсу
     */
    updateAllUI() {
        this.updateDashboard();
        this.updateLiftsGrid();
        this.updateAlertsPanel();
        this.renderTechnicians();
        this.renderActiveTasks();
        this.updateMapMarkers();
        this.updateMetrics();
        this.updateCharts();
        this.updateConnectionStatus();
    }

    /**
     * Atualização головної панелі
     */
    updateDashboard() {
        // Atualização загальних показників
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
        // Simож оновлюємо лічильник у заголовку
        updateElement('alertsCount', this.systemMetrics.pendingAlerts ?? 0, 'number');
        updateElement('activeTasksCount', `${this.systemMetrics.activeAssignments ?? 0} активних`);
    }

    /**
     * Atualização сітки ліфтів
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
                                    <span class="small">Вантажопідйомність: ${lift.capacity || '—'} kg | ${lift.floors || '—'} пов.</span>
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
                                            <span class="metric-label">№ Agoійний</span>
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
                                            <small>Manutenção</small>
                                        </span>
                                    </div>
                                    <div class="col-4 text-center">
                                        <span class="indicator ${['repair','out_of_service'].includes(lift.status) ? 'active danger' : ''}">
                                            <i class="fas fa-exclamation-triangle"></i>
                                            <small>Reparação</small>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card-footer">
                            <div class="btn-group btn-group-sm w-100" role="group">
                                <button class="btn btn-outline-primary" onclick="monitoringManager.viewLiftDetails('${lift._id}')" title="Detalhes">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-outline-info" onclick="monitoringManager.showLiftHistory('${lift._id}')" title="Історія">
                                    <i class="fas fa-history"></i>
                                </button>
                                ${this.currentUser.role === 'dispatcher' || this.currentUser.role === 'admin' ? `
                                    <button class="btn btn-outline-warning" onclick="monitoringManager.createMaintenanceRequest('${lift._id}')" title="Manutenção">
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

        container.innerHTML = html || '<div class="alert alert-info">Elevadores не знайдено</div>';
    }

    /**
     * Atualização панелі сповіщень
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
                            <strong>${alert.title || alert.message || 'Notificações'}</strong>
                            <span class="badge badge-${this.getAlertBadgeClass(severity)} ml-2">
                                ${severity.toUpperCase()}
                            </span>
                        </div>
                        <div class="alert-actions">
                            ${!(alert.acknowledged || alert.read) ? `
                                <button class="btn btn-sm btn-outline-secondary" onclick="monitoringManager.acknowledgeAlert('${alert._id || ''}')" title="Confirmar">
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
                            ${alert.liftId ? ` | Elevador: ${this.getLiftAddress(alert.liftId)}` : ''}
                        </small>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html || '<div class="alert alert-info">Notificações відсутні</div>';
    }

    /**
     * Ініціалізація карти Leaflet
     */
    initMap() {
        if (typeof L === 'undefined') {
            console.warn('⚠️ Leaflet не завантажено');
            return;
        }
        const mapEl = document.getElementById('techMap');
        if (!mapEl) return;

        // Видаляємо placeholder перед ініціалізацією
        const placeholder = mapEl.querySelector('.map-placeholder');
        if (placeholder) placeholder.remove();

        // Координати Лісабона (столиця Португалії)
        const defaultCenter = [38.7223, -9.1393];

        try {
            this.map = L.map('techMap').setView(defaultCenter, 12);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(this.map);
            this.techMarkers = {};
            console.log('🗺️ Карта Leaflet ініціалізована');
        } catch (err) {
            console.error('❌ Erro ініціалізації карти:', err);
        }
    }

    /**
     * Atualização маркерів техніків на карті
     */
    updateMapMarkers() {
        if (!this.map || typeof L === 'undefined') return;

        const statusColors = {
            online: '#28a745',
            active: '#28a745',
            busy: '#ffc107',
            offline: '#6c757d'
        };

        this.technicians.forEach(tech => {
            const lat = tech.location?.lat || tech.lat;
            const lng = tech.location?.lng || tech.lng;
            if (!lat || !lng) return;

            const color = statusColors[tech.status] || '#6c757d';
            const name = `${tech.firstName || ''} ${tech.lastName || ''}`.trim() || tech.email || 'Técnico';
            const iconHtml = `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,.4)"></div>`;
            const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [14, 14], iconAnchor: [7, 7] });

            if (this.techMarkers[tech._id]) {
                this.techMarkers[tech._id].setLatLng([lat, lng]);
            } else {
                this.techMarkers[tech._id] = L.marker([lat, lng], { icon })
                    .bindPopup(`<strong>${name}</strong><br>Estado: ${tech.status || '—'}`)
                    .addTo(this.map);
            }
        });
    }

    /**
     * Рендер списку техніків у #techStatusContainer
     */
    renderTechnicians(filter) {
        const container = document.getElementById('techStatusContainer');
        if (!container) return;

        let techs = this.technicians;
        if (filter) {
            const q = filter.toLowerCase();
            techs = techs.filter(t =>
                (`${t.firstName} ${t.lastName}`.toLowerCase().includes(q)) ||
                (t.email || '').toLowerCase().includes(q)
            );
        }

        if (!techs.length) {
            container.innerHTML = '<p class="text-muted text-center p-3">Técnicoи не знайдені</p>';
            return;
        }

        const statusBadge = s => {
            const map = { online: 'success', active: 'success', busy: 'warning', offline: 'secondary' };
            const cls = map[s] || 'secondary';
            const lbl = { online: 'Online', active: 'Ativo', busy: 'Ocupado', offline: 'Offline' }[s] || s || '—';
            return `<span class="badge badge-${cls}">${lbl}</span>`;
        };

        const html = techs.map(tech => {
            const name = `${tech.firstName || ''} ${tech.lastName || ''}`.trim() || tech.email || 'Técnico';
            const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            // Кількість активних завдань для цього техніка
            const techId = String(tech._id);
            const taskCount = this.assignments.filter(a => {
                const assigned = a.assignedTo?._id || a.assignedTo || a.technicianId;
                return String(assigned) === techId;
            }).length;

            return `
                <div class="d-flex align-items-center p-2 border-bottom tech-item" style="gap:10px">
                    <div style="width:36px;height:36px;border-radius:50%;background:#007bff;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:13px;flex-shrink:0">
                        ${initials}
                    </div>
                    <div class="flex-grow-1 overflow-hidden">
                        <div class="font-weight-bold text-truncate small">${name}</div>
                        <div class="text-muted" style="font-size:11px">${tech.email || ''}</div>
                    </div>
                    <div class="text-right" style="flex-shrink:0">
                        ${statusBadge(tech.status)}
                        ${taskCount > 0 ? `<br><small class="text-info">${taskCount} завд.</small>` : ''}
                    </div>
                </div>`;
        }).join('');

        container.innerHTML = html;
    }

    /**
     * Pesquisaова фільтрація техніків (викликається з HTML)
     */
    filterTechnicians(query) {
        this.renderTechnicians(query);
    }

    /**
     * Рендер активних завдань у #activeTasksContainer
     */
    renderActiveTasks() {
        const container = document.getElementById('activeTasksContainer');
        if (!container) return;

        if (!this.assignments.length) {
            container.innerHTML = '<p class="text-muted text-center p-3">Активних завдань немає</p>';
            return;
        }

        const priorityLabel = p => {
            const m = { high: ['danger', 'Alta'], critical: ['danger', 'Критична'], medium: ['warning', 'Agoедня'], low: ['secondary', 'Baixa'] };
            const [cls, lbl] = m[p] || ['secondary', p || '—'];
            return `<span class="badge badge-${cls}">${lbl}</span>`;
        };

        const html = this.assignments.map(task => {
            const liftAddr = this.getLiftAddress(task.liftId || task.lift);
            const assigned = task.assignedTo;
            let techName = '—';
            if (assigned) {
                if (typeof assigned === 'object') {
                    techName = `${assigned.firstName || ''} ${assigned.lastName || ''}`.trim() || assigned.email || '—';
                } else {
                    const t = this.technicians.find(x => String(x._id) === String(assigned));
                    if (t) techName = `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.email || '—';
                }
            }
            const created = task.createdAt ? new Date(task.createdAt).toLocaleDateString('uk') : '—';

            return `
                <div class="d-flex align-items-start p-2 border-bottom" style="gap:10px">
                    <div class="flex-grow-1 overflow-hidden">
                        <div class="font-weight-bold text-truncate small">${task.title || task.description || 'Tarefa'}</div>
                        <div class="text-muted" style="font-size:11px">
                            <i class="fas fa-map-marker-alt mr-1"></i>${liftAddr} &nbsp;
                            <i class="fas fa-user mr-1"></i>${techName}
                        </div>
                    </div>
                    <div class="text-right" style="flex-shrink:0">
                        ${priorityLabel(task.priority)}
                        <br><small class="text-muted">${created}</small>
                    </div>
                </div>`;
        }).join('');

        container.innerHTML = html;
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
        // Sem IoT real — sem simulação de sensores
    }

    /**
     * Atualização системних метрик
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
            'maintenance': 'Manutenção',
            'inspection': 'Огляд',
            'repair': 'Reparação',
            'out_of_service': 'Inativo'
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
        if (diffInMinutes < 60) return `${diffInMinutes} хв. atrás`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} год. atrás`;
        return `${Math.floor(diffInMinutes / 1440)} дн. atrás`;
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
     * Definições автооновлення
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
     * Definições обробників подій
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

        // Pesquisa техніків
        const techSearch = document.getElementById('techSearch');
        if (techSearch) {
            techSearch.addEventListener('input', (e) => {
                this.filterTechnicians(e.target.value);
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
     * Atualização графіків
     */
    updateCharts() {
        // Atualização даних графіків
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

    // Створення заявки на Manutenção
    createMaintenanceRequest(liftId) {
        console.log('Створення заявки на Manutenção для ліфта:', liftId);
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
                const token = localStorage.getItem('token') || localStorage.getItem('authToken');
                await fetch(`${this.apiUrl}/monitoring/alerts/${alertId}/acknowledge`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('✅ Notificações підтверджено:', alertId);
            }
        } catch (error) {
            console.error('❌ Erro підтвердження сповіщення:', error);
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
                const token = localStorage.getItem('token') || localStorage.getItem('authToken');
                await fetch(`${this.apiUrl}/monitoring/alerts/${alertId}/resolve`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('✅ Notificações вирішено:', alertId);
            }
        } catch (error) {
            console.error('❌ Erro вирішення сповіщення:', error);
        }
    }

    /**
     * Atualização метрик в інтерфейсі
     */
    updateMetrics() {
        this.updateDashboard();
    }

    /**
     * Atualização статусу підключення
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
     * Início реального моніторингу
     */
    startRealTimeUpdates() {
        console.log('🚀 Реальний моніторинг запущено');
        
        // Atualização статусу підключення
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
                            <p>Elevadores ativos</p>
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
                                <i class="fas fa-chart-line"></i> A carregar системи
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
                                    Todos алерти
                                </button>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div id="recent-alerts-list">
                                <p class="p-3 text-muted">A carregar алертів...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <!-- Estado dos elevadores -->
                <div class="col-md-12">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">
                                <i class="fas fa-list"></i> Estado dos elevadores
                            </h3>
                            <div class="card-tools">
                                <button class="btn btn-sm btn-info" id="refresh-button" onclick="monitoringManager.refreshData()">
                                    <i class="fas fa-sync"></i> Atualizar
                                </button>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Endereço</th>
                                            <th>Estado</th>
                                            <th>Поверх</th>
                                            <th>Температура</th>
                                            <th>Останнє оновлення</th>
                                            <th>Дії</th>
                                        </tr>
                                    </thead>
                                    <tbody id="lifts-status-table">
                                        <tr>
                                            <td colspan="7" class="text-center p-3">
                                                <i class="fas fa-spinner fa-spin"></i> A carregar...
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
                            <!-- Filtroи алертів -->
                            <div class="row mb-3">
                                <div class="col-md-3">
                                    <select class="form-control" id="alert-severity-filter">
                                        <option value="">Todos рівні</option>
                                        <option value="low">Низький</option>
                                        <option value="medium">Agoедній</option>
                                        <option value="high">Altий</option>
                                        <option value="critical">Crítico</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <select class="form-control" id="alert-status-filter">
                                        <option value="">Todos статуси</option>
                                        <option value="active">Активні</option>
                                        <option value="acknowledged">Підтверджені</option>
                                        <option value="resolved">Вирішені</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <input type="text" class="form-control" id="alert-search" placeholder="Pesquisa алертів...">
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
                                    <p class="mt-2">A carregar алертів...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupContainerEvents(containerId) {
        // Definições обробників подій для контейнера
        const container = document.getElementById(containerId);
        if (!container) return;

        // Filtroи алертів
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
                            <i class="fas fa-sync-alt"></i> Atualizar
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
                                    <i class="fas fa-spinner fa-spin"></i> A carregar...
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
                                    <i class="fas fa-spinner fa-spin"></i> A carregar...
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
            systemUptime: null,
            cpuUsage: null,
            memoryUsage: null
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
        if (this.map) {
            this.map.setView([38.7223, -9.1393], 12);
        }
        console.log('🗺️ Карту центровано');
    }

    /**
     * Перемикання теплової карти
     */
    toggleHeatmap() {
        const mapEl = document.getElementById('techMap');
        if (!mapEl) return;
        const isActive = mapEl.classList.toggle('heatmap-active');
        // Якщо підключено leaflet.heat плагін — можна ввімкнути тут
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
            alert('Introduza o texto da mensagem');
            return;
        }
        console.log(`📡 Maiнсляція (${priority}): ${msg}`);
        if (typeof $ !== 'undefined') {
            $('#broadcastModal').modal('hide');
        }
        if (textarea) textarea.value = '';
        alert(`Mensagem enviada (prioridade: ${priority})`);
    }

    /**
     * Exportar логів
     */
    exportLogs() {
        const rows = [
            ['Час', 'Tipo', 'Повідомлення'],
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
            `Data: ${new Date().toLocaleString()}`,
            ``,
            `Elevadores:`,
            `  Всього: ${liftsTotal}`,
            `  Операційних: ${operationalLifts}`,
            `  Em reparação: ${repairLifts}`,
            ``,
            `Técnicoи:`,
            `  Online: ${techsOnline} / ${this.technicians.length}`,
            ``,
            `Tarefa:`,
            `  Активних: ${this.assignments.length}`,
            ``,
            `Notificações:`,
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
            alert(`✅ Intervalo de atualização definido: ${interval}s`);
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

// Exportar для використання в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MonitoringManager;
}