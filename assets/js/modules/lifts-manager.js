// lifts-manager.js - РОЗШИРЕНА ВЕРСІЯ ДЛЯ ADMINLTE
class LiftsManager {
    constructor() {
        this.lifts = [];
        this.filters = {
            status: 'all',
            type: 'all',
            sort: 'name'
        };
        this.currentLift = null;
        this.init();
    }

    init() {
        this.loadLifts();
        this.setupEventListeners();
        this.updateOverview();
        this.loadMaintenanceSchedule();
        this.loadStatistics();
        this.loadDocuments();
    }

    async loadLifts() {
        try {
            // Спроба отримати дані з API
            const response = await fetch('/api/lifts', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                this.lifts = await response.json();
                localStorage.setItem('lifts', JSON.stringify(this.lifts));
            } else {
                throw new Error('API недоступне');
            }
        } catch (error) {
            console.warn('Використання локальних даних:', error);
            this.lifts = JSON.parse(localStorage.getItem('lifts')) || [];
            
            if (this.lifts.length === 0) {
                this.lifts = this.createSampleLifts();
                localStorage.setItem('lifts', JSON.stringify(this.lifts));
            }
        }

        this.applyFilters();
    }

    createSampleLifts() {
        return [
            {
                id: 'lift1',
                model: 'Otis Gen2',
                type: 'passenger',
                location: 'вул. Центральна, 12',
                status: 'operational',
                lastMaintenance: '2024-01-15',
                nextMaintenance: '2024-02-15',
                installationDate: '2020-05-10',
                capacity: 8,
                floors: 12,
                manufacturer: 'Otis',
                serialNumber: 'OTIS-GEN2-12345',
                maintenanceHistory: [
                    { date: '2024-01-15', type: 'Планове ТО', technician: 'Іван Петренко' },
                    { date: '2023-12-10', type: 'Ремонт дверей', technician: 'Петро Іваненко' }
                ]
            },
            {
                id: 'lift2',
                model: 'Schindler 3300',
                type: 'cargo',
                location: 'пр. Перемоги, 45',
                status: 'maintenance',
                lastMaintenance: '2024-01-10',
                nextMaintenance: '2024-03-10',
                installationDate: '2019-08-15',
                capacity: 2000,
                floors: 8,
                manufacturer: 'Schindler',
                serialNumber: 'SCH-3300-67890',
                maintenanceHistory: [
                    { date: '2024-01-10', type: 'Аварійний ремонт', technician: 'Олексій Сидоренко' }
                ]
            },
            {
                id: 'lift3',
                model: 'KONE MonoSpace',
                type: 'passenger',
                location: 'вул. Шевченка, 78',
                status: 'attention',
                lastMaintenance: '2023-12-20',
                nextMaintenance: '2024-01-25',
                installationDate: '2021-03-15',
                capacity: 10,
                floors: 15,
                manufacturer: 'KONE',
                serialNumber: 'KONE-MS-54321'
            }
        ];
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

        $('#sortFilter').on('change', (e) => {
            this.filters.sort = e.target.value;
            this.applyFilters();
        });

        // Обробка пошуку
        $('#searchInput').on('input', (e) => {
            this.applyFilters();
        });
    }

    applyFilters() {
        let filteredLifts = [...this.lifts];

        // Фільтрація за статусом
        if (this.filters.status !== 'all') {
            filteredLifts = filteredLifts.filter(lift => 
                lift.status === this.filters.status
            );
        }

        // Фільтрація за типом
        if (this.filters.type !== 'all') {
            filteredLifts = filteredLifts.filter(lift => 
                lift.type === this.filters.type
            );
        }

        // Пошук
        const searchTerm = $('#searchInput').val().toLowerCase();
        if (searchTerm) {
            filteredLifts = filteredLifts.filter(lift =>
                lift.model.toLowerCase().includes(searchTerm) ||
                lift.location.toLowerCase().includes(searchTerm) ||
                lift.manufacturer.toLowerCase().includes(searchTerm)
            );
        }

        filteredLifts = this.sortLifts(filteredLifts);
        this.renderLifts(filteredLifts);
        this.updateOverview(filteredLifts);
    }

    resetFilters() {
        $('#statusFilter').val('all');
        $('#typeFilter').val('all');
        $('#sortFilter').val('name');
        $('#searchInput').val('');
        this.filters = { status: 'all', type: 'all', sort: 'name' };
        this.applyFilters();
    }

    sortLifts(lifts) {
        return lifts.sort((a, b) => {
            switch (this.filters.sort) {
                case 'name': return a.model.localeCompare(b.model);
                case 'status': return a.status.localeCompare(b.status);
                case 'location': return a.location.localeCompare(b.location);
                case 'maintenance': 
                    return new Date(a.nextMaintenance) - new Date(b.nextMaintenance);
                default: return a.model.localeCompare(b.model);
            }
        });
    }

    renderLifts(lifts) {
        const grid = $('#liftsGrid');
        grid.empty();

        if (lifts.length === 0) {
            grid.html(`
                <div class="col-12">
                    <div class="empty-state">
                        <i class="fas fa-search fa-3x mb-3 text-muted"></i>
                        <h4>Ліфтів не знайдено</h4>
                        <p>Спробуйте змінити параметри пошуку або фільтри</p>
                        <button class="btn btn-primary" onclick="liftsManager.resetFilters()">
                            Скинути фільтри
                        </button>
                    </div>
                </div>
            `);
            return;
        }

        lifts.forEach(lift => {
            const card = this.createLiftCard(lift);
            grid.append(card);
        });
    }

    createLiftCard(lift) {
        const statusClass = this.getStatusBadgeClass(lift.status);
        const statusText = this.getStatusText(lift.status);
        const typeText = this.getTypeText(lift.type);
        
        return $(`
            <div class="col-lg-4 col-md-6">
                <div class="card lift-card">
                    <div class="card-header">
                        <h3 class="card-title">${lift.model}</h3>
                        <span class="badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="card-body p-0">
                        <div class="lift-image position-relative">
                            <img src="../../assets/img/lifts/${lift.model.toLowerCase().replace(/\s+/g, '-')}.jpg" 
                                 alt="${lift.model}" 
                                 onerror="this.src='../../assets/img/lifts/default.jpg'">
                            <div class="lift-overlay">
                                <button class="btn btn-primary" onclick="liftsManager.viewLiftDetails('${lift.id}')">
                                    <i class="fas fa-eye"></i> Деталі
                                </button>
                            </div>
                        </div>
                        <div class="p-3">
                            <p><strong><i class="fas fa-map-marker-alt mr-2"></i>Локація:</strong> ${lift.location}</p>
                            <p><strong><i class="fas fa-tag mr-2"></i>Тип:</strong> ${typeText}</p>
                            <p><strong><i class="fas fa-wrench mr-2"></i>Останнє ТО:</strong> ${this.formatDate(lift.lastMaintenance)}</p>
                            <p><strong><i class="fas fa-calendar-alt mr-2"></i>Наступне ТО:</strong> ${this.formatDate(lift.nextMaintenance)}</p>
                            ${lift.capacity ? `<p><strong><i class="fas fa-users mr-2"></i>Місткість:</strong> ${lift.capacity} ${lift.type === 'passenger' ? 'осіб' : 'кг'}</p>` : ''}
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-sm btn-primary" onclick="liftsManager.requestService('${lift.id}')">
                            <i class="fas fa-tools"></i> Замовити послугу
                        </button>
                        <button class="btn btn-sm btn-info" onclick="liftsManager.viewHistory('${lift.id}')">
                            <i class="fas fa-history"></i> Історія
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="liftsManager.viewLiftDetails('${lift.id}')">
                            <i class="fas fa-info-circle"></i> Деталі
                        </button>
                    </div>
                </div>
            </div>
        `);
    }

    getStatusText(status) {
        const statuses = {
            'operational': 'Працює',
            'maintenance': 'Обслуговування',
            'attention': 'Потребує уваги',
            'out-of-service': 'Не працює'
        };
        return statuses[status] || status;
    }

    getStatusBadgeClass(status) {
        const classes = {
            'operational': 'badge-success',
            'maintenance': 'badge-warning',
            'attention': 'badge-danger',
            'out-of-service': 'badge-secondary'
        };
        return classes[status] || 'badge-secondary';
    }

    getTypeText(type) {
        const types = {
            'passenger': 'Пасажирський',
            'cargo': 'Вантажний',
            'hospital': 'Лікарняний'
        };
        return types[type] || type;
    }

    formatDate(dateString) {
        if (!dateString) return 'Немає даних';
        return new Date(dateString).toLocaleDateString('uk-UA');
    }

    updateOverview(lifts = this.lifts) {
        $('#totalLifts').text(lifts.length);
        $('#operationalLifts').text(lifts.filter(lift => lift.status === 'operational').length);
        $('#maintenanceLifts').text(lifts.filter(lift => lift.status === 'maintenance').length);
        
        const needsAttention = lifts.filter(lift => 
            lift.status === 'attention' || this.needsAttention(lift)
        ).length;
        $('#needsAttention').text(needsAttention);
        
        // Оновлення лічильника в сайдбарі
        $('#liftsCount').text(lifts.length);
    }

    needsAttention(lift) {
        if (!lift.nextMaintenance) return false;
        const nextDate = new Date(lift.nextMaintenance);
        const today = new Date();
        const daysDiff = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
        return daysDiff <= 7;
    }

    viewLiftDetails(liftId) {
        const lift = this.lifts.find(l => l.id === liftId);
        if (!lift) return;

        currentLiftId = liftId;
        this.currentLift = lift;

        const modalContent = this.createLiftDetails(lift);
        $('#liftDetailsContent').html(modalContent);
        $('#liftDetailsModal').modal('show');
    }

    createLiftDetails(lift) {
        const maintenanceStatus = this.getMaintenanceStatus(lift);
        const maintenanceStatusClass = this.getMaintenanceStatusClass(maintenanceStatus);
        
        return `
            <div class="lift-details">
                <div class="details-header text-center mb-4">
                    <h2>${lift.model}</h2>
                    <span class="badge ${this.getStatusBadgeClass(lift.status)}">
                        ${this.getStatusText(lift.status)}
                    </span>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <div class="card mb-3">
                            <div class="card-header">
                                <h5 class="card-title">Основна інформація</h5>
                            </div>
                            <div class="card-body">
                                <p><strong><i class="fas fa-map-marker-alt"></i> Локація:</strong> ${lift.location}</p>
                                <p><strong><i class="fas fa-tag"></i> Тип:</strong> ${this.getTypeText(lift.type)}</p>
                                <p><strong><i class="fas fa-industry"></i> Виробник:</strong> ${lift.manufacturer || 'Невідомо'}</p>
                                <p><strong><i class="fas fa-barcode"></i> Серійний номер:</strong> ${lift.serialNumber || 'Невідомо'}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="card mb-3">
                            <div class="card-header">
                                <h5 class="card-title">Технічні характеристики</h5>
                            </div>
                            <div class="card-body">
                                <p><strong><i class="fas fa-calendar-alt"></i> Дата встановлення:</strong> ${this.formatDate(lift.installationDate)}</p>
                                <p><strong><i class="fas fa-users"></i> Місткість:</strong> ${lift.capacity || 'Невідомо'} ${lift.type === 'passenger' ? 'осіб' : 'кг'}</p>
                                <p><strong><i class="fas fa-building"></i> Кількість поверхів:</strong> ${lift.floors || 'Невідомо'}</p>
                                <p><strong><i class="fas fa-info-circle"></i> Статус ТО:</strong> 
                                    <span class="badge ${maintenanceStatusClass}">${maintenanceStatus}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                ${lift.maintenanceHistory && lift.maintenanceHistory.length > 0 ? `
                <div class="card">
                    <div class="card-header">
                        <h5 class="card-title">Історія обслуговування</h5>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Дата</th>
                                        <th>Тип робіт</th>
                                        <th>Технік</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${lift.maintenanceHistory.map(entry => `
                                        <tr>
                                            <td>${this.formatDate(entry.date)}</td>
                                            <td>${entry.type}</td>
                                            <td>${entry.technician}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    getMaintenanceStatus(lift) {
        if (!lift.nextMaintenance) return 'Немає даних';
        
        const nextDate = new Date(lift.nextMaintenance);
        const today = new Date();
        const daysDiff = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysDiff < 0) return 'Протерміновано';
        if (daysDiff <= 3) return 'Термінове ТО';
        if (daysDiff <= 7) return 'Скоро ТО';
        if (daysDiff <= 30) return 'Заплановане ТО';
        return 'В нормі';
    }

    getMaintenanceStatusClass(status) {
        const classes = {
            'Протерміновано': 'badge-danger',
            'Термінове ТО': 'badge-danger',
            'Скоро ТО': 'badge-warning',
            'Заплановане ТО': 'badge-info',
            'В нормі': 'badge-success',
            'Немає даних': 'badge-secondary'
        };
        return classes[status] || 'badge-secondary';
    }

    loadMaintenanceSchedule() {
        const schedule = this.lifts
            .filter(lift => lift.nextMaintenance)
            .sort((a, b) => new Date(a.nextMaintenance) - new Date(b.nextMaintenance))
            .slice(0, 5);

        const scheduleContainer = $('#maintenanceSchedule');
        scheduleContainer.empty();

        if (schedule.length === 0) {
            scheduleContainer.html('<p>Немає запланованих техобслуговувань</p>');
            return;
        }

        schedule.forEach(lift => {
            const status = this.getMaintenanceStatus(lift);
            const statusClass = this.getMaintenanceStatusClass(status);
            
            const item = `
                <div class="schedule-item">
                    <div>
                        <strong>${this.formatDate(lift.nextMaintenance)}</strong>
                        <br>
                        <small>${lift.model} - ${lift.location}</small>
                    </div>
                    <span class="badge ${statusClass}">${status}</span>
                </div>
            `;
            scheduleContainer.append(item);
        });
    }

    loadStatistics() {
        const statsContainer = $('#statisticsContent');
        statsContainer.empty();

        const stats = {
            totalUptime: this.calculateUptime(),
            maintenanceCosts: this.calculateMaintenanceCosts(),
            usageStats: this.calculateUsageStats()
        };

        statsContainer.html(`
            <div class="stat-item">
                <h5><i class="fas fa-chart-line"></i> Загальна доступність</h5>
                ${Object.entries(stats.totalUptime).map(([model, uptime]) => `
                    <p>${model}: <strong>${uptime}%</strong></p>
                `).join('')}
            </div>
            <div class="stat-item">
                <h5><i class="fas fa-money-bill-wave"></i> Витрати на обслуговування</h5>
                ${Object.entries(stats.maintenanceCosts).map(([model, cost]) => `
                    <p>${model}: <strong>${cost} грн</strong></p>
                `).join('')}
            </div>
            <div class="stat-item">
                <h5><i class="fas fa-chart-bar"></i> Статистика використання</h5>
                ${Object.entries(stats.usageStats).map(([model, usage]) => `
                    <p>${model}: <strong>${usage} перевезень</strong></p>
                `).join('')}
            </div>
        `);
    }

    calculateUptime() {
        // Імітація розрахунків
        return {
            'Otis Gen2': '98.7%',
            'Schindler 3300': '95.2%',
            'KONE MonoSpace': '99.1%'
        };
    }

    calculateMaintenanceCosts() {
        // Імітація розрахунків
        return {
            'Otis Gen2': '8,500',
            'Schindler 3300': '12,300',
            'KONE MonoSpace': '7,200'
        };
    }

    calculateUsageStats() {
        // Імітація розрахунків
        return {
            'Otis Gen2': '12,456',
            'Schindler 3300': '8,923',
            'KONE MonoSpace': '15,678'
        };
    }

    loadDocuments() {
        const documents = [
            { id: 'passport-otis', name: 'Паспорт ліфта Otis Gen2', type: 'pdf' },
            { id: 'manual-otis', name: 'Інструкція експлуатації', type: 'pdf' },
            { id: 'act-otis', name: 'Акт введення в експлуатацію', type: 'doc' },
            { id: 'certificate-schindler', name: 'Сертифікат відповідності Schindler', type: 'pdf' }
        ];

        const documentsContainer = $('#documentsList');
        documentsContainer.empty();

        documents.forEach(doc => {
            const icon = doc.type === 'pdf' ? 'fa-file-pdf' : 'fa-file-word';
            const color = doc.type === 'pdf' ? 'text-danger' : 'text-primary';
            
            const item = `
                <div class="document-item">
                    <div>
                        <i class="fas ${icon} ${color} fa-2x mr-3"></i>
                        <span>${doc.name}</span>
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="liftsManager.downloadDocument('${doc.id}')">
                        <i class="fas fa-download"></i> Завантажити
                    </button>
                </div>
            `;
            documentsContainer.append(item);
        });
    }

    downloadDocument(docId) {
        this.showNotification(`Завантаження документа ${docId}...`, 'info');
        // Імітація завантаження
        setTimeout(() => {
            this.showNotification('Документ успішно завантажено', 'success');
        }, 2000);
    }

    requestService(liftId) {
        const lift = this.lifts.find(l => l.id === liftId);
        if (!lift) return;

        window.location.href = `requests.html?liftId=${liftId}&action=create`;
    }

    viewHistory(liftId) {
        window.location.href = `history.html?liftId=${liftId}`;
    }

    showNotification(message, type = 'success') {
        // Використання toast-сповіщень AdminLTE
        $.notify(message, {
            className: type,
            position: 'bottom right',
            autoHideDelay: 3000
        });
    }
}

// Ініціалізація
$(document).ready(function() {
    window.liftsManager = new LiftsManager();
});