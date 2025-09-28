// monitoring-manager.js - МЕНЕДЖЕР МОНІТОРИНГУ В РЕАЛЬНОМУ ЧАСІ
class MonitoringManager {
    constructor() {
        this.technicians = [];
        this.assignments = [];
        this.alerts = [];
        this.events = [];
        this.autoRefresh = true;
        this.refreshInterval = null;
        this.websocket = null;
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.setupWebSocket();
        this.setupAutoRefresh();
        this.initializeCharts();
        this.startRealTimeUpdates();
    }

    async loadData() {
        try {
            const [techsRes, assignmentsRes, alertsRes] = await Promise.all([
                fetch('../api/technicians/status'),
                fetch('../api/assignments/active'),
                fetch('../api/alerts/unresolved')
            ]);

            if (techsRes.ok && assignmentsRes.ok && alertsRes.ok) {
                this.technicians = await techsRes.json();
                this.assignments = await assignmentsRes.json();
                this.alerts = await alertsRes.json();
                
                localStorage.setItem('monitoringData', JSON.stringify({
                    technicians: this.technicians,
                    assignments: this.assignments,
                    alerts: this.alerts,
                    timestamp: new Date().toISOString()
                }));
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
        const savedData = JSON.parse(localStorage.getItem('monitoringData')) || {};
        this.technicians = savedData.technicians || [];
        this.assignments = savedData.assignments || [];
        this.alerts = savedData.alerts || [];
        
        if (this.technicians.length === 0) {
            this.createSampleData();
        }
    }

    createSampleData() {
        // Приклад даних для демонстрації з реалістичними координатами Києва
        this.technicians = [
            {
                id: 'TECH-001',
                firstName: 'Іван',
                lastName: 'Петренко',
                status: 'online',
                location: { lat: 50.4501, lng: 30.5234 },
                battery: 85,
                signal: 4,
                lastUpdate: new Date().toISOString(),
                currentAssignment: 'ASSIGN-001',
                speed: 0,
                direction: 0
            },
            {
                id: 'TECH-002',
                firstName: 'Марія',
                lastName: 'Коваленко',
                status: 'busy',
                location: { lat: 50.4512, lng: 30.5245 },
                battery: 60,
                signal: 3,
                lastUpdate: new Date(Date.now() - 5 * 60000).toISOString(),
                currentAssignment: 'ASSIGN-002',
                speed: 0,
                direction: 0
            },
            {
                id: 'TECH-003',
                firstName: 'Олександр',
                lastName: 'Шевченко',
                status: 'online',
                location: { lat: 50.4490, lng: 30.5220 },
                battery: 92,
                signal: 4,
                lastUpdate: new Date(Date.now() - 2 * 60000).toISOString(),
                currentAssignment: null,
                speed: 45,
                direction: 120
            },
            {
                id: 'TECH-004',
                firstName: 'Анна',
                lastName: 'Бондаренко',
                status: 'offline',
                location: { lat: 50.4525, lng: 30.5258 },
                battery: 15,
                signal: 1,
                lastUpdate: new Date(Date.now() - 30 * 60000).toISOString(),
                currentAssignment: null,
                speed: 0,
                direction: 0
            },
            {
                id: 'TECH-005',
                firstName: 'Дмитро',
                lastName: 'Мельник',
                status: 'emergency',
                location: { lat: 50.4485, lng: 30.5210 },
                battery: 25,
                signal: 2,
                lastUpdate: new Date(Date.now() - 1 * 60000).toISOString(),
                currentAssignment: 'ASSIGN-003',
                speed: 0,
                direction: 0
            }
        ];

        this.assignments = [
            {
                id: 'ASSIGN-001',
                title: 'Ремонт ліфта в бізнес-центрі',
                priority: 'high',
                status: 'in-progress',
                technicianId: 'TECH-001',
                progress: 65,
                estimatedCompletion: new Date(Date.now() + 2 * 3600000).toISOString()
            },
            {
                id: 'ASSIGN-002',
                title: 'Технічне обслуговування житлового будинку',
                priority: 'medium',
                status: 'in-progress',
                technicianId: 'TECH-002',
                progress: 30,
                estimatedCompletion: new Date(Date.now() + 4 * 3600000).toISOString()
            },
            {
                id: 'ASSIGN-003',
                title: 'Аварійний ремонт ліфта в лікарні',
                priority: 'high',
                status: 'assigned',
                technicianId: 'TECH-005',
                progress: 0,
                estimatedCompletion: new Date(Date.now() + 1 * 3600000).toISOString()
            }
        ];

        this.alerts = [
            {
                id: 'ALERT-001',
                type: 'battery_low',
                message: 'Низький заряд батареї у TECH-002',
                priority: 'warning',
                timestamp: new Date().toISOString(),
                resolved: false
            },
            {
                id: 'ALERT-002',
                type: 'signal_lost',
                message: 'Втрата зв\'язку з TECH-004',
                priority: 'warning',
                timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
                resolved: false
            },
            {
                id: 'ALERT-003',
                type: 'emergency',
                message: 'Аварійна ситуація: TECH-005 потребує негайної допомоги',
                priority: 'critical',
                timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
                resolved: false
            }
        ];

        localStorage.setItem('monitoringData', JSON.stringify({
            technicians: this.technicians,
            assignments: this.assignments,
            alerts: this.alerts,
            timestamp: new Date().toISOString()
        }));
    }

    updateAllUI() {
        this.updateStatistics();
        this.renderTechnicians();
        this.renderActiveTasks();
        this.renderAlerts();
        this.updateMap();
        this.updateBadges();
        this.updateLastUpdateTime();
    }

    updateStatistics() {
        const onlineTechs = this.technicians.filter(t => t.status === 'online').length;
        const activeAssignments = this.assignments.filter(a => 
            a.status === 'in-progress' || a.status === 'assigned'
        ).length;
        const pendingAlerts = this.alerts.filter(a => !a.resolved).length;
        
        // Розрахунок середнього часу відгуку
        const avgResponse = this.calculateAverageResponseTime();
        
        $('#onlineTechs').text(onlineTechs);
        $('#activeAssignments').text(activeAssignments);
        $('#pendingAlerts').text(pendingAlerts);
        $('#avgResponse').text(avgResponse + 'с');
        $('#emergencyCases').text(this.alerts.filter(a => a.priority === 'critical').length);
        $('#onlineBadge').text(onlineTechs);
        $('#alertsCount').text(pendingAlerts);
        $('#activeTasksCount').text(activeAssignments + ' активних');
    }

    calculateAverageResponseTime() {
        const responseTimes = this.technicians
            .filter(t => t.responseTime)
            .map(t => t.responseTime);
        
        if (responseTimes.length === 0) return 0;
        return (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1);
    }

    renderTechnicians() {
        const container = $('#techStatusContainer');
        container.empty();

        this.technicians.forEach(tech => {
            const techElement = this.createTechElement(tech);
            container.append(techElement);
        });
    }

    createTechElement(tech) {
        const assignment = tech.currentAssignment ? 
            this.assignments.find(a => a.id === tech.currentAssignment) : null;
        
        const statusClass = `status-${tech.status}`;
        const avatarClass = tech.status;
        const batteryLevel = this.getBatteryLevel(tech.battery);
        const signalStrength = this.getSignalStrength(tech.signal);

        return `
            <div class="tech-status-item p-3 border-bottom" data-tech-id="${tech.id}">
                <div class="d-flex align-items-center">
                    <div class="position-relative">
                        <img src="../../assets/img/avatars/tech.png" 
                             class="tech-avatar ${avatarClass}" 
                             alt="${tech.firstName}">
                        <span class="status-indicator ${tech.status}"></span>
                    </div>
                    <div class="ml-3 flex-grow-1">
                        <h6 class="mb-1">${tech.firstName} ${tech.lastName}</h6>
                        <div class="d-flex align-items-center mb-1">
                            <span class="${statusClass} status-badge mr-2">
                                ${this.getStatusText(tech.status)}
                            </span>
                            <div class="connection-quality mr-2">
                                ${this.renderSignalBars(signalStrength)}
                            </div>
                            <div class="battery-indicator">
                                <i class="fas fa-battery-${batteryLevel}"></i> ${tech.battery}%
                            </div>
                        </div>
                        ${assignment ? `
                            <div class="progress progress-xs mb-1">
                                <div class="progress-bar bg-success" style="width: ${assignment.progress}%"></div>
                            </div>
                            <small class="text-muted">${assignment.title}</small>
                        ` : '<small class="text-muted">Не призначено</small>'}
                    </div>
                    <button class="btn btn-sm btn-outline-primary" 
                            onclick="monitoringManager.showTechDetails('${tech.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `;
    }

    renderSignalBars(strength) {
        let bars = '';
        for (let i = 1; i <= 5; i++) {
            bars += `<div class="connection-bar ${i <= strength ? 'active' : ''}"></div>`;
        }
        return bars;
    }

    getBatteryLevel(percentage) {
        if (percentage >= 80) return 'full';
        if (percentage >= 60) return 'three-quarters';
        if (percentage >= 40) return 'half';
        if (percentage >= 20) return 'quarter';
        return 'empty';
    }

    getSignalStrength(strength) {
        return Math.min(Math.max(strength || 0, 0), 5);
    }

    renderActiveTasks() {
        const container = $('#activeTasksContainer');
        container.empty();

        this.assignments.forEach(assignment => {
            if (assignment.status === 'in-progress' || assignment.status === 'assigned') {
                const taskElement = this.createTaskElement(assignment);
                container.append(taskElement);
            }
        });
    }

    createTaskElement(assignment) {
        const tech = this.technicians.find(t => t.id === assignment.technicianId);
        const isCritical = assignment.priority === 'high';
        const isOverdue = assignment.estimatedCompletion && 
                         new Date() > new Date(assignment.estimatedCompletion);

        return `
            <div class="monitoring-card ${isCritical ? 'critical' : 'normal'} ${isOverdue ? 'overdue' : ''}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h5 class="card-title mb-1">${assignment.title}</h5>
                            <p class="card-text text-muted mb-1">ID: ${assignment.id}</p>
                            ${tech ? `
                                <p class="card-text mb-1">
                                    <i class="fas fa-user"></i> ${tech.firstName} ${tech.lastName}
                                </p>
                            ` : ''}
                        </div>
                        <div class="text-right">
                            <span class="priority-badge priority-${assignment.priority}">
                                ${this.getPriorityText(assignment.priority)}
                            </span>
                            <span class="badge ${this.getStatusClass(assignment.status)}">
                                ${this.getStatusText(assignment.status)}
                            </span>
                            ${isOverdue ? '<span class="badge badge-danger ml-1">Протерміновано</span>' : ''}
                        </div>
                    </div>

                    <div class="progress progress-sm mb-3">
                        <div class="progress-bar bg-success" style="width: ${assignment.progress}%"></div>
                    </div>

                    <div class="row">
                        <div class="col-md-6">
                            <small class="text-muted">
                                <i class="fas fa-progress"></i> Виконано: ${assignment.progress}%
                            </small>
                        </div>
                        <div class="col-md-6 text-right">
                            ${assignment.estimatedCompletion ? `
                                <small class="text-muted">
                                    <i class="fas fa-clock"></i> 
                                    ${this.formatTimeRemaining(assignment.estimatedCompletion)}
                                </small>
                            ` : ''}
                        </div>
                    </div>

                    <div class="assignment-actions mt-3">
                        <button class="btn btn-sm btn-info" 
                                onclick="monitoringManager.viewAssignment('${assignment.id}')">
                            <i class="fas fa-eye"></i> Деталі
                        </button>
                        <button class="btn btn-sm btn-warning" 
                                onclick="monitoringManager.sendMessageToTech('${assignment.technicianId}')">
                            <i class="fas fa-comment"></i> Повідомлення
                        </button>
                        ${isCritical ? `
                            <button class="btn btn-sm btn-danger" 
                                    onclick="monitoringManager.escalateAssignment('${assignment.id}')">
                                <i class="fas fa-exclamation-triangle"></i> Ескалація
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderAlerts() {
        const container = $('#alertsContainer');
        container.empty();

        const unresolvedAlerts = this.alerts.filter(a => !a.resolved).slice(0, 10);
        
        if (unresolvedAlerts.length === 0) {
            container.html(`
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-check-circle fa-2x mb-2"></i>
                    <p>Немає активних сповіщень</p>
                </div>
            `);
            return;
        }

        unresolvedAlerts.forEach(alert => {
            const alertElement = this.createAlertElement(alert);
            container.append(alertElement);
        });
    }

    createAlertElement(alert) {
        const priorityClass = alert.priority === 'critical' ? 'danger' :
                             alert.priority === 'warning' ? 'warning' : 'info';

        return `
            <div class="alert alert-${priorityClass} alert-dismissible m-3 p-2" role="alert">
                <button type="button" class="close" onclick="monitoringManager.resolveAlert('${alert.id}')">
                    <span>&times;</span>
                </button>
                <div class="d-flex align-items-center">
                    <i class="fas fa-exclamation-circle fa-lg mr-2"></i>
                    <div>
                        <h6 class="alert-heading mb-1">${this.getAlertTypeText(alert.type)}</h6>
                        <p class="mb-0 small">${alert.message}</p>
                        <small class="text-muted">${this.formatDateTime(alert.timestamp)}</small>
                    </div>
                </div>
            </div>
        `;
    }

    updateMap() {
        const mapContainer = $('#techMap');
        mapContainer.empty();
        
        // Створення справжньої Leaflet карти
        const mapDiv = document.createElement('div');
        mapDiv.id = 'techMapLeaflet';
        mapDiv.style.height = '100%';
        mapDiv.style.width = '100%';
        mapContainer.append(mapDiv);
        
        // Ініціалізація карти
        this.map = L.map('techMapLeaflet').setView([50.4501, 30.5234], 12);
        
        // Додавання тайлів
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);
        
        // Додавання маркерів для техніків
        this.technicians.forEach(tech => {
            if (tech.location && tech.location.lat && tech.location.lng) {
                const markerColor = this.getMarkerColor(tech.status);
                const marker = L.marker([tech.location.lat, tech.location.lng], {
                    icon: this.createTechIcon(markerColor)
                }).addTo(this.map);
                
                // Popup з інформацією про техніка
                const popupContent = `
                    <div class="tech-popup">
                        <h6><i class="fas fa-user"></i> ${tech.firstName} ${tech.lastName}</h6>
                        <p><strong>ID:</strong> ${tech.id}</p>
                        <p><strong>Статус:</strong> <span style="color: ${markerColor}">${this.getStatusText(tech.status)}</span></p>
                        <p><strong>Батарея:</strong> ${tech.battery}%</p>
                        <p><strong>Сигнал:</strong> ${this.renderSignalBars(tech.signal)}</p>
                        <p><strong>Останнє оновлення:</strong> ${this.formatDateTime(tech.lastUpdate)}</p>
                        ${tech.currentAssignment ? `<p><strong>Завдання:</strong> ${this.getAssignmentTitle(tech.currentAssignment)}</p>` : ''}
                        <button class="btn btn-primary btn-sm" onclick="monitoringManager.showTechDetails('${tech.id}')">
                            <i class="fas fa-info-circle"></i> Деталі
                        </button>
                    </div>
                `;
                
                marker.bindPopup(popupContent);
            }
        });
        
        // Підгонка карти до всіх маркерів
        if (this.technicians.length > 0) {
            const validLocations = this.technicians
                .filter(tech => tech.location && tech.location.lat && tech.location.lng)
                .map(tech => [tech.location.lat, tech.location.lng]);
            
            if (validLocations.length > 0) {
                this.map.fitBounds(validLocations, { padding: [20, 20] });
            }
        }
        
        console.log(`Карта ініціалізована з ${this.technicians.length} техніками`);
    }
    
    createTechIcon(color) {
        return L.divIcon({
            html: `<i class="fas fa-user" style="color: ${color}; font-size: 16px;"></i>`,
            className: 'tech-map-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });
    }
    
    getMarkerColor(status) {
        switch (status) {
            case 'online': return '#28a745';
            case 'busy': return '#ffc107';
            case 'offline': return '#6c757d';
            case 'emergency': return '#dc3545';
            default: return '#007bff';
        }
    }

    updateBadges() {
        const onlineCount = this.technicians.filter(t => t.status === 'online').length;
        const alertCount = this.alerts.filter(a => !a.resolved).length;
        
        $('#onlineBadge').text(onlineCount);
        $('#alertsCount').text(alertCount);
    }

    updateLastUpdateTime() {
        $('#lastUpdate').text(`Оновлено: ${new Date().toLocaleTimeString('uk-UA')}`);
    }

    setupEventListeners() {
        // Автооновлення
        $('#autoRefreshIcon').click(() => this.toggleAutoRefresh());
        
        // Пошук техніків
        $('#techSearch').on('input', (e) => {
            this.filterTechnicians(e.target.value);
        });

        // Гарячі клавіші
        $(document).on('keydown', (e) => {
            if (e.ctrlKey) {
                switch(e.key) {
                    case 'r':
                        e.preventDefault();
                        this.refreshData();
                        break;
                    case 'm':
                        e.preventDefault();
                        this.centerMap();
                        break;
                    case 'a':
                        e.preventDefault();
                        this.showAlerts();
                        break;
                }
            }
        });
    }

    setupWebSocket() {
        // Імітація WebSocket з'єднання
        try {
            this.websocket = {
                send: (data) => console.log('WebSocket send:', data),
                close: () => console.log('WebSocket closed')
            };
            
            // Імітація отримання повідомлень
            setInterval(() => {
                this.simulateWebSocketMessage();
            }, 5000);
            
        } catch (error) {
            console.warn('WebSocket не підтримується, використання long polling');
            this.setupLongPolling();
        }
    }

    setupLongPolling() {
        setInterval(() => {
            this.checkForUpdates();
        }, 10000);
    }

    setupAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            if (this.autoRefresh) {
                this.refreshData();
            }
        }, 30000); // Оновлення кожні 30 секунд
        
        this.updateAutoRefreshUI();
    }

    toggleAutoRefresh() {
        this.autoRefresh = !this.autoRefresh;
        this.updateAutoRefreshUI();
        this.showToast(
            this.autoRefresh ? 'Автооновлення увімкнено' : 'Автооновлення вимкнено',
            this.autoRefresh ? 'success' : 'warning'
        );
    }

    updateAutoRefreshUI() {
        const icon = $('#autoRefreshIcon');
        const indicator = $('#liveIndicator');
        
        if (this.autoRefresh) {
            icon.addClass('fa-spin');
            indicator.show();
        } else {
            icon.removeClass('fa-spin');
            indicator.hide();
        }
    }

    startRealTimeUpdates() {
        // Імітація реальних оновлень
        setInterval(() => {
            this.simulateRealTimeChanges();
        }, 8000);
        
        // Оновлення часу відгуку
        setInterval(() => {
            $('#refreshRate').text(`${this.getRefreshRate()}мс`);
        }, 1000);
    }

    simulateRealTimeChanges() {
        if (Math.random() > 0.7) {
            this.simulateTechStatusChange();
        }
        
        if (Math.random() > 0.8) {
            this.simulateNewAlert();
        }
        
        if (Math.random() > 0.6) {
            this.simulateAssignmentProgress();
        }
    }

    simulateTechStatusChange() {
        if (this.technicians.length > 0) {
            const randomTech = this.technicians[Math.floor(Math.random() * this.technicians.length)];
            const oldStatus = randomTech.status;
            
            // Випадкова зміна статусу
            const statuses = ['online', 'busy', 'offline'];
            randomTech.status = statuses[Math.floor(Math.random() * statuses.length)];
            
            if (oldStatus !== randomTech.status) {
                this.addEvent({
                    type: 'status_change',
                    message: `${randomTech.firstName} ${randomTech.lastName} змінив статус на ${this.getStatusText(randomTech.status)}`,
                    priority: 'info'
                });
                
                this.updateAllUI();
            }
        }
    }

    simulateNewAlert() {
        const alertTypes = [
            'battery_low',
            'signal_lost',
            'maintenance_required',
            'emergency'
        ];
        
        const randomType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
        const randomTech = this.technicians[Math.floor(Math.random() * this.technicians.length)];
        
        const newAlert = {
            id: 'ALERT-' + Date.now(),
            type: randomType,
            message: `${this.getAlertTypeText(randomType)}: ${randomTech.firstName} ${randomTech.lastName}`,
            priority: randomType === 'emergency' ? 'critical' : 'warning',
            timestamp: new Date().toISOString(),
            resolved: false
        };
        
        this.alerts.unshift(newAlert);
        this.updateAllUI();
        
        if (newAlert.priority === 'critical') {
            this.showEmergencyAlert(newAlert);
        }
    }

    simulateAssignmentProgress() {
        const activeAssignments = this.assignments.filter(a => 
            a.status === 'in-progress' && a.progress < 100
        );
        
        if (activeAssignments.length > 0) {
            const randomAssignment = activeAssignments[Math.floor(Math.random() * activeAssignments.length)];
            randomAssignment.progress = Math.min(randomAssignment.progress + 5, 100);
            
            if (randomAssignment.progress === 100) {
                randomAssignment.status = 'completed';
                this.addEvent({
                    type: 'assignment_completed',
                    message: `Завдання "${randomAssignment.title}" завершено`,
                    priority: 'success'
                });
            }
            
            this.updateAllUI();
        }
    }

    simulateWebSocketMessage() {
        const messageTypes = [
            'location_update',
            'status_update',
            'battery_update',
            'assignment_update'
        ];
        
        const randomType = messageTypes[Math.floor(Math.random() * messageTypes.length)];
        const randomTech = this.technicians[Math.floor(Math.random() * this.technicians.length)];
        
        this.processWebSocketMessage({
            type: randomType,
            data: {
                technicianId: randomTech.id,
                timestamp: new Date().toISOString(),
                // Додаткові дані залежно від типу повідомлення
            }
        });
    }

    processWebSocketMessage(message) {
        switch(message.type) {
            case 'location_update':
                this.updateTechLocation(message.data);
                break;
            case 'status_update':
                this.updateTechStatus(message.data);
                break;
            case 'battery_update':
                this.updateTechBattery(message.data);
                break;
            case 'assignment_update':
                this.updateAssignment(message.data);
                break;
        }
    }

    updateTechLocation(data) {
        const tech = this.technicians.find(t => t.id === data.technicianId);
        if (tech) {
            tech.location = data.location;
            tech.lastUpdate = data.timestamp;
            this.updateMap();
        }
    }

    refreshData() {
        this.showToast('Оновлення даних...', 'info');
        this.loadData();
    }

    filterTechnicians(query) {
        const container = $('#techStatusContainer');
        const allTechs = container.find('.tech-status-item');
        
        if (!query.trim()) {
            allTechs.show();
            return;
        }
        
        const searchTerm = query.toLowerCase();
        allTechs.each(function() {
            const techText = $(this).text().toLowerCase();
            $(this).toggle(techText.includes(searchTerm));
        });
    }

    showTechDetails(techId) {
        const tech = this.technicians.find(t => t.id === techId);
        if (!tech) return;

        const content = `
            <div class="tech-details">
                <div class="text-center mb-4">
                    <img src="../../assets/img/avatars/tech.png" 
                         class="tech-avatar ${tech.status} mb-3" 
                         style="width: 80px; height: 80px;">
                    <h4>${tech.firstName} ${tech.lastName}</h4>
                    <span class="status-badge status-${tech.status}">
                        ${this.getStatusText(tech.status)}
                    </span>
                </div>

                <div class="row mb-3">
                    <div class="col-md-6">
                        <strong>Статус:</strong> ${this.getStatusText(tech.status)}
                    </div>
                    <div class="col-md-6">
                        <strong>Батарея:</strong> ${tech.battery}%
                    </div>
                </div>

                <div class="row mb-3">
                    <div class="col-md-6">
                        <strong>Сигнал:</strong> ${this.renderSignalBars(tech.signal)}
                    </div>
                    <div class="col-md-6">
                        <strong>Останнє оновлення:</strong> ${this.formatDateTime(tech.lastUpdate)}
                    </div>
                </div>

                ${tech.currentAssignment ? `
                    <div class="assignment-info">
                        <h5>Поточне завдання</h5>
                        <p>${this.getAssignmentTitle(tech.currentAssignment)}</p>
                    </div>
                ` : ''}

                <div class="tech-actions mt-4">
                    <button class="btn btn-primary btn-block" onclick="monitoringManager.sendMessageToTech('${tech.id}')">
                        <i class="fas fa-comment"></i> Надіслати повідомлення
                    </button>
                    <button class="btn btn-info btn-block mt-2" onclick="monitoringManager.requestStatusUpdate('${tech.id}')">
                        <i class="fas fa-sync"></i> Запит статусу
                    </button>
                </div>
            </div>
        `;

        $('#techDetailsContent').html(content);
        $('#techDetailsModal').modal('show');
    }

    showAlerts() {
        this.renderAlerts();
        // Можна відкрити модальне вікно з усіма сповіщеннями
    }

    clearAlerts() {
        if (confirm('Очистити всі сповіщення?')) {
            this.alerts = this.alerts.filter(a => a.resolved);
            this.updateAllUI();
            this.showToast('Сповіщення очищено', 'success');
        }
    }

    resolveAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.resolved = true;
            this.updateAllUI();
            this.showToast('Сповіщення вирішено', 'success');
        }
    }

    startBroadcast() {
        $('#broadcastModal').modal('show');
    }

    sendBroadcast() {
        const message = $('#broadcastModal textarea').val();
        const priority = $('#broadcastModal select').val();
        
        if (!message.trim()) {
            this.showToast('Введіть текст повідомлення', 'error');
            return;
        }

        // Імітація трансляції
        this.technicians.forEach(tech => {
            this.addEvent({
                type: 'broadcast',
                message: `Трансляція: ${message}`,
                priority: priority,
                technicianId: tech.id
            });
        });

        $('#broadcastModal').modal('hide');
        this.showToast('Повідомлення трансльовано', 'success');
    }

    exportLogs() {
        this.showToast('Експорт логів моніторингу...', 'info');
        // Логіка експорту
    }

    systemDiagnostics() {
        this.runDiagnostics().then(results => {
            this.showDiagnosticsResults(results);
        });
    }

    async runDiagnostics() {
        return {
            websocket: this.websocket !== null,
            database: true,
            api: true,
            performance: this.getRefreshRate() < 1000 ? 'good' : 'slow',
            memory: 'normal'
        };
    }

    showSettings() {
        this.showModal('Налаштування моніторингу', `
            <div class="settings-content">
                <div class="form-group">
                    <label>Інтервал оновлення (секунди)</label>
                    <input type="number" class="form-control" value="30" min="5" max="300">
                </div>
                <div class="form-group">
                    <div class="custom-control custom-switch">
                        <input type="checkbox" class="custom-control-input" id="soundAlerts" checked>
                        <label class="custom-control-label" for="soundAlerts">Звукові сповіщення</label>
                    </div>
                </div>
                <div class="form-group">
                    <div class="custom-control custom-switch">
                        <input type="checkbox" class="custom-control-input" id="desktopNotifications" checked>
                        <label class="custom-control-label" for="desktopNotifications">Desktop сповіщення</label>
                    </div>
                </div>
            </div>
        `);
    }

    centerMap() {
        if (this.map && this.technicians.length > 0) {
            const validLocations = this.technicians
                .filter(tech => tech.location && tech.location.lat && tech.location.lng)
                .map(tech => [tech.location.lat, tech.location.lng]);
            
            if (validLocations.length > 0) {
                this.map.fitBounds(validLocations, { padding: [20, 20] });
                this.showToast('Карта центрована', 'info');
            }
        }
    }

    toggleHeatmap() {
        // Теплова карта - простий toggle видимості маркерів
        if (this.map) {
            const markers = this.map.getLayers().filter(layer => layer instanceof L.Marker);
            markers.forEach(marker => {
                if (marker.getOpacity() === 1) {
                    marker.setOpacity(0.3);
                } else {
                    marker.setOpacity(1);
                }
            });
            this.showToast('Теплова карта переключена', 'info');
        }
    }

    initializeCharts() {
        // Ініціалізація графіків Chart.js
        this.initializeSystemLoadChart();
        this.initializeActivityChart();
    }

    initializeSystemLoadChart() {
        const ctx = document.getElementById('systemLoadChart');
        if (ctx) {
            this.systemLoadChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: Array.from({length: 20}, (_, i) => i + 1),
                    datasets: [{
                        label: 'Навантаження системи (%)',
                        data: Array.from({length: 20}, () => Math.random() * 100),
                        borderColor: '#007bff',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    }

    // Допоміжні методи
    getStatusText(status) {
        const statuses = {
            'online': 'Онлайн',
            'busy': 'Зайнятий',
            'offline': 'Офлайн',
            'emergency': 'Аварія'
        };
        return statuses[status] || status;
    }

    getPriorityText(priority) {
        const priorities = {
            'high': 'Високий',
            'medium': 'Середній',
            'low': 'Низький'
        };
        return priorities[priority] || priority;
    }

    getStatusClass(status) {
        const classes = {
            'online': 'badge-success',
            'busy': 'badge-warning',
            'offline': 'badge-secondary',
            'emergency': 'badge-danger'
        };
        return classes[status] || 'badge-secondary';
    }

    getAlertTypeText(type) {
        const types = {
            'battery_low': 'Низький заряд батареї',
            'signal_lost': 'Втрата зв\'язку',
            'maintenance_required': 'Потрібне обслуговування',
            'emergency': 'Аварійна ситуація'
        };
        return types[type] || type;
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('uk-UA');
    }

    formatTimeRemaining(endTime) {
        const now = new Date();
        const end = new Date(endTime);
        const diff = end - now;
        
        if (diff <= 0) return 'Протерміновано';
        
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        
        return `${hours} год ${minutes} хв`;
    }

    getAssignmentTitle(assignmentId) {
        const assignment = this.assignments.find(a => a.id === assignmentId);
        return assignment ? assignment.title : 'Невідоме завдання';
    }

    showToast(message, type = 'info') {
        $.notify(message, {
            className: type,
            position: 'bottom right',
            autoHideDelay: 3000
        });
    }

    showModal(title, content) {
        $('#techDetailsContent').html(content);
        $('#techDetailsModal .modal-title').text(title);
        $('#techDetailsModal').modal('show');
    }

    addEvent(event) {
        this.events.unshift({
            ...event,
            id: 'EVENT-' + Date.now(),
            timestamp: new Date().toISOString()
        });
        
        // Оновлення таймлайну
        this.updateActivityTimeline();
    }

    updateActivityTimeline() {
        const container = $('#activityTimeline');
        container.empty();
        
        this.events.slice(0, 5).forEach(event => {
            const eventElement = `
                <div class="timeline-item">
                    <strong>${event.type}</strong>
                    <p>${event.message}</p>
                    <small class="text-muted">${this.formatDateTime(event.timestamp)}</small>
                </div>
            `;
            container.append(eventElement);
        });
    }

    showEmergencyAlert(alert) {
        // Показати екстрене сповіщення
        if (Notification.permission === 'granted') {
            new Notification('Аварійна ситуація', {
                body: alert.message,
                icon: '../../assets/img/logo.png',
                requireInteraction: true
            });
        }
        
        this.showToast(alert.message, 'error');
    }
}

// Ініціалізація
$(document).ready(function() {
    window.monitoringManager = new MonitoringManager();
});