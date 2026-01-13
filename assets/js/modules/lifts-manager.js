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
            const token = localStorage.getItem('token');
            const response = await fetch('/api/lifts', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                // API повертає {success: true, data: [...]}
                this.lifts = result.data || result;
                console.log('✅ Завантажено ліфтів з API:', this.lifts.length);
                if (this.lifts.length > 0) {
                    console.log('📋 Приклад ліфта:', this.lifts[0]);
                }
                localStorage.setItem('lifts', JSON.stringify(this.lifts));
            } else {
                throw new Error('API недоступне');
            }
        } catch (error) {
            console.warn('Помилка завантаження з API:', error);
            this.lifts = JSON.parse(localStorage.getItem('lifts')) || [];
            
            if (this.lifts.length === 0) {
                console.info('ℹ️ Немає даних про ліфти. Додайте ліфти через адмін-панель.');
            }
        }

        this.applyFilters();
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
        const searchTerm = $('#searchInput').val()?.toLowerCase() || '';
        if (searchTerm) {
            filteredLifts = filteredLifts.filter(lift => {
                // Безпечне отримання значень з перевіркою на undefined
                const model = String(lift.model || lift.municipalNumber || '').toLowerCase();
                const addressStr = lift.address ? (typeof lift.address === 'string' ? lift.address : (lift.address.street || '')) : '';
                const location = String(lift.location || addressStr || '').toLowerCase();
                const name = String(lift.name || '').toLowerCase();
                
                return model.includes(searchTerm) ||
                       location.includes(searchTerm) ||
                       name.includes(searchTerm);
            });
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
        
        // Безпечне отримання адреси
        const location = this.formatLocation(lift);
        
        return $(`
            <div class="col-lg-4 col-md-6">
                <div class="card lift-card">
                    <div class="card-header">
                        <h3 class="card-title">${lift.model || lift.name || 'Ліфт'}</h3>
                        <span class="badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="card-body p-0">
                        <div class="lift-image position-relative">
                            <img src="/assets/img/lifts/${(lift.model || 'default').toLowerCase().replace(/\s+/g, '-')}.jpg" 
                                 alt="${lift.model || 'Ліфт'}" 
                                 onerror="this.src='/assets/img/lifts/default.svg'">
                            <div class="lift-overlay">
                                <button class="btn btn-primary" onclick="window.liftsManager.viewLiftDetails('${lift.id || lift._id}')">
                                    <i class="fas fa-eye"></i> Деталі
                                </button>
                            </div>
                        </div>
                        <div class="p-3">
                            <p><strong><i class="fas fa-map-marker-alt mr-2"></i>Локація:</strong> ${location}</p>
                            <p><strong><i class="fas fa-tag mr-2"></i>Тип:</strong> ${typeText}</p>
                            <p><strong><i class="fas fa-wrench mr-2"></i>Останнє ТО:</strong> ${this.formatDate(lift.lastMaintenance)}</p>
                            <p><strong><i class="fas fa-calendar-alt mr-2"></i>Наступне ТО:</strong> ${this.formatDate(lift.nextMaintenance)}</p>
                            ${lift.capacity ? `<p><strong><i class="fas fa-users mr-2"></i>Місткість:</strong> ${lift.capacity} ${lift.type === 'passenger' ? 'осіб' : 'кг'}</p>` : ''}
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-sm btn-primary" onclick="window.liftsManager.requestService('${lift.id || lift._id}')">
                            <i class="fas fa-tools"></i> Замовити послугу
                        </button>
                        <button class="btn btn-sm btn-info" onclick="window.liftsManager.viewHistory('${lift.id || lift._id}')">
                            <i class="fas fa-history"></i> Історія
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="window.liftsManager.viewLiftDetails('${lift.id || lift._id}')">
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

    formatLocation(lift) {
        // Якщо location - рядок, повертаємо його
        if (typeof lift.location === 'string' && lift.location) {
            return lift.location;
        }
        
        // Якщо location - об'єкт, форматуємо його
        if (lift.location && typeof lift.location === 'object') {
            const parts = [];
            if (lift.location.street) parts.push(lift.location.street);
            if (lift.location.city) parts.push(lift.location.city);
            if (lift.location.postalCode) parts.push(lift.location.postalCode);
            if (parts.length > 0) return parts.join(', ');
        }
        
        // Перевіряємо address як альтернативу
        if (lift.address) {
            if (typeof lift.address === 'string') {
                return lift.address;
            }
            if (typeof lift.address === 'object') {
                const parts = [];
                if (lift.address.street) parts.push(lift.address.street);
                if (lift.address.city) parts.push(lift.address.city);
                if (lift.address.postalCode) parts.push(lift.address.postalCode);
                if (parts.length > 0) return parts.join(', ');
            }
        }
        
        return 'Адреса не вказана';
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
        const lift = this.lifts.find(l => (l.id === liftId || l._id === liftId));
        if (!lift) {
            console.error('Lift not found:', liftId);
            Swal.fire({
                icon: 'error',
                title: 'Помилка',
                text: 'Ліфт не знайдено',
                confirmButtonText: 'OK'
            });
            return;
        }

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
                    <h2>${lift.model || lift.name || 'Ліфт'}</h2>
                    <span class="badge ${this.getStatusBadgeClass(lift.status)}">
                        ${this.getStatusText(lift.status)}
                    </span>
                </div>

                <div class="card mb-3">
                    <div class="card-header">
                        <h5 class="card-title">Інформація про ліфт</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong><i class="fas fa-map-marker-alt"></i> Локація:</strong> ${this.formatLocation(lift)}</p>
                                ${lift.type ? `<p><strong><i class="fas fa-tag"></i> Тип:</strong> ${this.getTypeText(lift.type)}</p>` : ''}
                                ${lift.municipalNumber ? `<p><strong><i class="fas fa-id-card"></i> Номер муніципальний:</strong> ${lift.municipalNumber}</p>` : ''}
                            </div>
                            <div class="col-md-6">
                                ${lift.capacity ? `<p><strong><i class="fas fa-users"></i> Місткість:</strong> ${lift.capacity} ${lift.type === 'passenger' ? 'осіб' : 'кг'}</p>` : ''}
                                <p><strong><i class="fas fa-info-circle"></i> Статус ТО:</strong> 
                                    <span class="badge ${maintenanceStatusClass}">${maintenanceStatus}</span>
                                </p>
                                ${lift.qrCode ? `<p><strong><i class="fas fa-qrcode"></i> QR-код:</strong> Згенеровано</p>` : ''}
                            </div>
                        </div>
                    </div>
                </div>

                ${lift.maintenanceHistory && Array.isArray(lift.maintenanceHistory) && lift.maintenanceHistory.length > 0 ? `
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
        if (!statsContainer.length) return;
        
        // Розрахунок реальної статистики з наявних даних
        const totalLifts = this.lifts.length;
        const operational = this.lifts.filter(l => l.status === 'operational').length;
        const maintenance = this.lifts.filter(l => l.status === 'maintenance').length;
        const needsAttention = this.lifts.filter(l => l.status === 'attention').length;
        
        const uptimePercent = totalLifts > 0 ? ((operational / totalLifts) * 100).toFixed(1) : 0;
        
        statsContainer.html(`
            <div class="stat-item">
                <h5><i class="fas fa-chart-line"></i> Загальна доступність</h5>
                <p><strong>${uptimePercent}%</strong> ліфтів працюють без проблем</p>
                <p>Всього ліфтів: <strong>${totalLifts}</strong></p>
            </div>
            <div class="stat-item">
                <h5><i class="fas fa-tools"></i> Статус обслуговування</h5>
                <p>Працюють: <strong>${operational}</strong></p>
                <p>На обслуговуванні: <strong>${maintenance}</strong></p>
                <p>Потребують уваги: <strong>${needsAttention}</strong></p>
            </div>
        `);
    }

    loadDocuments() {
        const documentsContainer = $('#documentsList');
        if (!documentsContainer.length) return;
        
        // Документи будуть завантажені з реальної бази даних через API
        documentsContainer.html(`
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                Документи ліфтів будуть доступні після їх додавання адміністратором.
            </div>
        `);
    }

    requestService(liftId) {
        const lift = this.lifts.find(l => (l.id === liftId || l._id === liftId));
        if (!lift) {
            console.error('Lift not found for service request:', liftId);
            Swal.fire({
                icon: 'error',
                title: 'Помилка',
                text: 'Ліфт не знайдено',
                confirmButtonText: 'OK'
            });
            return;
        }

        // Показуємо модальне вікно для створення запиту
        Swal.fire({
            title: 'Замовити послугу',
            html: `
                <div class="text-left">
                    <p><strong>Ліфт:</strong> ${lift.model || lift.name || 'Ліфт'}</p>
                    <p><strong>Адреса:</strong> ${this.formatLocation(lift)}</p>
                    <hr>
                    <div class="form-group">
                        <label>Тип послуги:</label>
                        <select id="serviceType" class="form-control">
                            <option value="maintenance">Планове обслуговування</option>
                            <option value="repair">Ремонт</option>
                            <option value="inspection">Інспекція</option>
                            <option value="emergency">Аварійна ситуація</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Опис проблеми:</label>
                        <textarea id="serviceDescription" class="form-control" rows="3" placeholder="Детально опишіть проблему або запит..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>Пріоритет:</label>
                        <select id="servicePriority" class="form-control">
                            <option value="low">Низький</option>
                            <option value="medium">Середній</option>
                            <option value="high">Високий</option>
                            <option value="urgent">Термінова</option>
                        </select>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Відправити запит',
            cancelButtonText: 'Скасувати',
            width: '600px',
            preConfirm: () => {
                const serviceType = document.getElementById('serviceType').value;
                const description = document.getElementById('serviceDescription').value;
                const priority = document.getElementById('servicePriority').value;
                
                if (!description || description.trim().length < 10) {
                    Swal.showValidationMessage('Будь ласка, опишіть проблему детальніше (мінімум 10 символів)');
                    return false;
                }
                
                return { serviceType, description, priority };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.submitServiceRequest(liftId, result.value);
            }
        });
    }

    async submitServiceRequest(liftId, data) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    liftId: liftId,
                    type: data.serviceType,
                    description: data.description,
                    priority: data.priority,
                    status: 'pending'
                })
            });

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Успіх!',
                    text: 'Ваш запит успішно відправлено. Ми зв\'яжемося з вами найближчим часом.',
                    confirmButtonText: 'OK'
                });
            } else {
                throw new Error('Помилка відправки запиту');
            }
        } catch (error) {
            console.error('Error submitting service request:', error);
            Swal.fire({
                icon: 'error',
                title: 'Помилка',
                text: 'Не вдалося відправити запит. Спробуйте пізніше.',
                confirmButtonText: 'OK'
            });
        }
    }

    async viewHistory(liftId) {
        const lift = this.lifts.find(l => (l.id === liftId || l._id === liftId));
        if (!lift) {
            console.error('Lift not found for history:', liftId);
            Swal.fire({
                icon: 'error',
                title: 'Помилка',
                text: 'Ліфт не знайдено',
                confirmButtonText: 'OK'
            });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/lifts/${liftId}/history`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            let historyHtml = '';
            
            if (response.ok) {
                const history = await response.json();
                if (history.data && history.data.length > 0) {
                    historyHtml = `
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Дата</th>
                                        <th>Тип</th>
                                        <th>Опис</th>
                                        <th>Технік</th>
                                        <th>Статус</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${history.data.map(entry => `
                                        <tr>
                                            <td>${this.formatDate(entry.date)}</td>
                                            <td><span class="badge badge-info">${entry.type}</span></td>
                                            <td>${entry.description || '-'}</td>
                                            <td>${entry.technician || '-'}</td>
                                            <td><span class="badge badge-${entry.status === 'completed' ? 'success' : 'warning'}">${entry.status}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                } else {
                    historyHtml = '<p class="text-center text-muted">Історія обслуговування відсутня</p>';
                }
            } else {
                // Fallback to lift's maintenance history
                if (lift.maintenanceHistory && lift.maintenanceHistory.length > 0) {
                    historyHtml = `
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
                    `;
                } else {
                    historyHtml = '<p class="text-center text-muted">Історія обслуговування відсутня</p>';
                }
            }

            Swal.fire({
                title: `Історія: ${lift.model || lift.name || 'Ліфт'}`,
                html: historyHtml,
                width: '800px',
                confirmButtonText: 'Закрити'
            });
        } catch (error) {
            console.error('Error loading history:', error);
            Swal.fire({
                icon: 'error',
                title: 'Помилка',
                text: 'Не вдалося завантажити історію',
                confirmButtonText: 'OK'
            });
        }
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