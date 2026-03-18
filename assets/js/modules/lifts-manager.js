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
        this.loadDocuments();
    }

    async loadLifts() {
        try {
            // Спроба отримати дані з API
            const token = AuthManager.getAuthToken
                ? AuthManager.getAuthToken()
                : (sessionStorage.getItem('liftmanager_jwt') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('authToken') || localStorage.getItem('token'));
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
        this.loadMaintenanceSchedule();
        this.loadStatistics();
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
                case 'name': return (a.model || '').localeCompare(b.model || '');
                case 'status': return (a.status || '').localeCompare(b.status || '');
                case 'location': return this.formatLocation(a).localeCompare(this.formatLocation(b));
                case 'maintenance': 
                    return new Date(a.nextMaintenance || a.nextInspectionDate || 0) - new Date(b.nextMaintenance || b.nextInspectionDate || 0);
                default: return (a.model || '').localeCompare(b.model || '');
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
                            ${lift.municipalNumber ? `<p><strong><i class="fas fa-hashtag mr-2"></i>Муніципальний №:</strong> <span class="badge badge-dark">${lift.municipalNumber}</span></p>` : ''}
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

    async viewLiftDetails(liftId) {
        currentLiftId = liftId;

        // Показуємо модал одразу зі спінером
        $('#liftDetailsContent').html(`
            <div class="text-center py-5">
                <i class="fas fa-spinner fa-spin fa-2x text-primary"></i>
                <p class="mt-2 text-muted">Завантаження даних ліфта...</p>
            </div>
        `);
        $('#liftDetailsModal').modal('show');

        try {
            // Завантажуємо повні дані з API (включно з inspectionHistory та maintenanceContract)
            const token = (typeof AuthManager !== 'undefined' && AuthManager.getAuthToken)
                ? AuthManager.getAuthToken()
                : (sessionStorage.getItem('liftmanager_jwt') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('token'));
            const response = await fetch(`/api/lifts/${liftId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            let lift;
            if (response.ok) {
                const result = await response.json();
                lift = result.data?.data || result.data || result;
            } else {
                lift = this.lifts.find(l => (l.id === liftId || l._id === liftId));
            }

            if (!lift) {
                $('#liftDetailsContent').html(`<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> Ліфт не знайдено</div>`);
                return;
            }

            this.currentLift = lift;
            $('#liftDetailsContent').html(this.createLiftDetails(lift));

            // Ініціалізуємо карту якщо є координати
            this._initClientMap(lift);

        } catch (error) {
            console.error('❌ Помилка завантаження деталей ліфта:', error);
            // Fallback до кешованих даних
            const lift = this.lifts.find(l => (l.id === liftId || l._id === liftId));
            if (lift) {
                this.currentLift = lift;
                $('#liftDetailsContent').html(this.createLiftDetails(lift));
            } else {
                $('#liftDetailsContent').html(`<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> Помилка завантаження даних</div>`);
            }
        }
    }

    _initClientMap(lift) {
        setTimeout(() => {
            const mapEl = document.getElementById('clientLiftMap');
            if (!mapEl || typeof L === 'undefined') return;
            try {
                const coords = lift.location?.coordinates;
                const lat = (coords && coords[1]) || lift.latitude || 38.7223;
                const lng = (coords && coords[0]) || lift.longitude || -9.1393;
                if (window._clientLiftMap) {
                    window._clientLiftMap.remove();
                    window._clientLiftMap = null;
                }
                window._clientLiftMap = L.map('clientLiftMap').setView([lat, lng], 15);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(window._clientLiftMap);
                L.marker([lat, lng])
                    .addTo(window._clientLiftMap)
                    .bindPopup(`<b>${lift.municipalNumber || 'Ліфт'}</b><br>${lift.address?.street || ''}`)
                    .openPopup();
            } catch (e) {
                console.warn('Карта недоступна:', e);
            }
        }, 400);
    }

    createLiftDetails(lift) {
        const liftId = lift._id || lift.id || '';
        const address = lift.address || {};
        const addressStr = address.street
            ? (address.city && address.city !== address.street ? `${address.street}, ${address.city}` : address.street)
            : (typeof lift.address === 'string' ? lift.address : 'Не вказано');
        const postalCode = address.zipCode || lift.postalCode || '';

        // Capacity
        let capacityText = 'Не вказано';
        if (lift.capacity) {
            const persons = Math.floor(lift.capacity / 75);
            capacityText = `${persons} осіб / ${lift.capacity} кг`;
        }

        // Статус
        const statusText = this.getStatusText(lift.status);
        const statusClass = this.getStatusBadgeClass(lift.status);

        // Inspection history
        const reports = (lift.inspectionHistory || []).map((r, i) => ({ ...r, _originalIndex: i }));
        const reportsHtml = this._renderClientReports(reports, liftId);

        // Contract
        const contractHtml = this._renderClientContract(lift, liftId);

        // Coordinates
        const coords = lift.location?.coordinates || [];
        const lat = coords[1] || lift.latitude || '';
        const lng = coords[0] || lift.longitude || '';
        const coordsText = (lat && lng) ? `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}` : 'Не вказано';

        return `
            <div class="lift-details">

                <!-- Основна інформація -->
                <div class="row">
                    <div class="col-md-6">
                        <div class="card mb-3">
                            <div class="card-header bg-info text-white py-2">
                                <h6 class="mb-0"><i class="fas fa-info-circle"></i> Основна інформація</h6>
                            </div>
                            <div class="card-body p-2">
                                <table class="table table-sm mb-0">
                                    <tr><td><strong>Муніципальний №:</strong></td><td>${lift.municipalNumber || '-'}</td></tr>
                                    <tr><td><strong>Марка / Модель:</strong></td><td>${lift.manufacturer ? lift.manufacturer + ' ' : ''}${lift.model || '-'}</td></tr>
                                    <tr><td><strong>Тип:</strong></td><td>${this.getTypeText(lift.type)}</td></tr>
                                    <tr><td><strong>Статус:</strong></td><td><span class="badge ${statusClass}">${statusText}</span></td></tr>
                                    <tr><td><strong>Місткість:</strong></td><td>${capacityText}</td></tr>
                                    ${lift.speed ? `<tr><td><strong>Швидкість:</strong></td><td>${lift.speed} м/с</td></tr>` : ''}
                                    ${lift.driveType ? `<tr><td><strong>Тип приводу:</strong></td><td>${lift.driveType}</td></tr>` : ''}
                                    ${lift.doorType ? `<tr><td><strong>Тип дверей:</strong></td><td>${lift.doorType}</td></tr>` : ''}
                                    ${lift.floorsCount ? `<tr><td><strong>Кількість поверхів:</strong></td><td>${lift.floorsCount}</td></tr>` : ''}
                                    ${lift.inspectionFrequency ? `<tr><td><strong>Частота інспекцій:</strong></td><td>${lift.inspectionFrequency === 24 ? '2 роки' : lift.inspectionFrequency === 12 ? '1 рік' : lift.inspectionFrequency + ' міс.'}</td></tr>` : ''}
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card mb-3">
                            <div class="card-header bg-secondary text-white py-2">
                                <h6 class="mb-0"><i class="fas fa-map-marker-alt"></i> Розташування</h6>
                            </div>
                            <div class="card-body p-2">
                                <table class="table table-sm mb-0">
                                    <tr><td><strong>Адреса:</strong></td><td>${addressStr}</td></tr>
                                    ${postalCode ? `<tr><td><strong>Поштовий індекс:</strong></td><td>${postalCode}</td></tr>` : ''}
                                    <tr><td><strong>Координати:</strong></td><td>${coordsText}</td></tr>
                                    ${(lift.intercomCode || lift.accessCode) ? `<tr><td><strong>Код домофону:</strong></td><td>${lift.intercomCode || lift.accessCode}</td></tr>` : ''}
                                </table>
                            </div>
                        </div>
                        <div class="card mb-3">
                            <div class="card-header bg-warning py-2">
                                <h6 class="mb-0"><i class="fas fa-calendar-check"></i> Обслуговування</h6>
                            </div>
                            <div class="card-body p-2">
                                <table class="table table-sm mb-0">
                                    <tr><td><strong>Останнє ТО:</strong></td><td>${this.formatDate(lift.lastInspectionDate || lift.lastMaintenance)}</td></tr>
                                    <tr><td><strong>Наступне ТО:</strong></td><td>${this.formatDate(lift.nextInspectionDate || lift.nextMaintenance)}</td></tr>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Карта -->
                ${(lat && lng) ? `
                <div class="card mb-3">
                    <div class="card-header bg-light py-2">
                        <h6 class="mb-0"><i class="fas fa-map"></i> Карта розташування</h6>
                    </div>
                    <div class="card-body p-0">
                        <div id="clientLiftMap" style="height: 220px; width: 100%;"></div>
                    </div>
                </div>
                ` : ''}

                <!-- Контракт на обслуговування -->
                <div class="card mb-3">
                    <div class="card-header bg-success text-white py-2 d-flex justify-content-between align-items-center">
                        <h6 class="mb-0"><i class="fas fa-file-contract"></i> Контракт на обслуговування</h6>
                    </div>
                    <div class="card-body p-2">
                        ${contractHtml}
                    </div>
                </div>

                <!-- Звіти інспекцій та втручань -->
                <div class="card mb-3">
                    <div class="card-header bg-primary text-white py-2 d-flex justify-content-between align-items-center">
                        <h6 class="mb-0"><i class="fas fa-clipboard-list"></i> Історія інспекцій та втручань</h6>
                        <span class="badge badge-light text-primary">${reports.length} записів</span>
                    </div>
                    <div class="card-body p-2">
                        <!-- Фільтр по типу -->
                        ${reports.length > 0 ? `
                        <div class="row mb-2">
                            <div class="col-md-4">
                                <select id="clientReportTypeFilter" class="form-control form-control-sm" onchange="window.liftsManager.filterClientReports()">
                                    <option value="">Всі типи</option>
                                    <option value="inspection">Інспекції</option>
                                    <option value="maintenance">ТО</option>
                                    <option value="repair">Ремонти</option>
                                    <option value="emergency">Аварійні</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <select id="clientReportPeriodFilter" class="form-control form-control-sm" onchange="window.liftsManager.filterClientReports()">
                                    <option value="all">Весь час</option>
                                    <option value="30">Останні 30 днів</option>
                                    <option value="90">Останні 3 місяці</option>
                                    <option value="365">Останній рік</option>
                                </select>
                            </div>
                        </div>
                        ` : ''}
                        <div id="clientReportsList">
                            ${reportsHtml}
                        </div>
                    </div>
                </div>

            </div>
        `;
    }

    _renderClientReports(reports, liftId) {
        if (!reports || reports.length === 0) {
            return `<div class="alert alert-warning mb-0"><i class="fas fa-exclamation-triangle"></i> Записів ще немає</div>`;
        }

        // Сортуємо по даті (найновіші спочатку)
        const sorted = [...reports].sort((a, b) => {
            const da = new Date(a.inspectionDate || a.date || 0);
            const db = new Date(b.inspectionDate || b.date || 0);
            return db - da;
        });

        // Зберігаємо для фільтрації
        this._clientAllReports = sorted;
        this._clientLiftId = liftId;

        return this._buildClientReportsList(sorted);
    }

    _buildClientReportsList(reports) {
        if (!reports || reports.length === 0) {
            return `<div class="alert alert-warning mb-0"><i class="fas fa-search"></i> Записів не знайдено</div>`;
        }

        const typeLabels = { inspection: 'Інспекція', maintenance: 'ТО', repair: 'Ремонт', emergency: 'Аварійний виклик' };
        const typeIcons  = { inspection: 'fa-clipboard-check text-primary', maintenance: 'fa-tools text-warning', repair: 'fa-wrench text-danger', emergency: 'fa-exclamation-triangle text-danger' };

        let html = '<div class="list-group">';
        reports.forEach(report => {
            const typeRaw = report.inspectionType || report.type || 'inspection';
            const typeLabel = typeLabels[typeRaw] || typeRaw;
            const typeIcon = typeIcons[typeRaw] || 'fa-clipboard-check text-secondary';
            const date = (report.inspectionDate || report.date)
                ? new Date(report.inspectionDate || report.date).toLocaleDateString('uk-UA', { year: 'numeric', month: '2-digit', day: '2-digit' })
                : 'Невідома дата';
            const status = report.status || 'completed';
            const notes = report.comments || report.findings || report.notes || '';
            const inspector = report.inspectorName || report.inspector || '';
            const fileUrl = report.fileUrl || report.reportFile || report.file || null;

            const statusBadge = (status === 'passed' || status === 'completed')
                ? '<span class="badge badge-success">Виконано</span>'
                : status === 'failed'
                ? '<span class="badge badge-danger">Не пройдено</span>'
                : '<span class="badge badge-info">Виконано</span>';

            const reportJson = JSON.stringify(report).replace(/'/g, '&apos;');

            html += `
                <div class="list-group-item py-2 client-report-item" data-type="${typeRaw}" data-date="${report.inspectionDate || report.date || ''}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="mb-1">
                                <i class="fas ${typeIcon}"></i>
                                <strong>${typeLabel}</strong> ${statusBadge}
                                ${fileUrl ? '<i class="fas fa-paperclip text-success ml-1" title="PDF прикріплено"></i>' : ''}
                            </div>
                            <small class="text-muted">
                                <i class="fas fa-calendar mr-1"></i>${date}
                                ${inspector ? `&nbsp;·&nbsp;<i class="fas fa-user mr-1"></i>${inspector}` : ''}
                            </small>
                            ${notes ? `<div class="mt-1 text-muted" style="font-size:0.85em;">${notes}</div>` : ''}
                        </div>
                        <div class="btn-group-vertical ml-2">
                            <button class="btn btn-sm btn-outline-primary mb-1" onclick='window.liftsManager.viewClientReport(${reportJson})' title="Переглянути">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${fileUrl ? `
                            <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-outline-info mb-1" title="Відкрити PDF">
                                <i class="fas fa-file-pdf"></i>
                            </a>
                            <a href="${fileUrl}" download class="btn btn-sm btn-outline-secondary mb-1" title="Завантажити PDF">
                                <i class="fas fa-download"></i>
                            </a>
                            ` : ''}
                            <button class="btn btn-sm btn-outline-warning mb-1" onclick='window.liftsManager.forwardReportByEmail(${reportJson})' title="Переслати по Email">
                                <i class="fas fa-envelope"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick='window.liftsManager.printClientReport(${reportJson})' title="Роздрукувати">
                                <i class="fas fa-print"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>
            <div class="text-right mt-1">
                <small class="text-muted">Показано ${reports.length} записів</small>
            </div>`;
        return html;
    }

    _renderClientContract(lift, liftId) {
        const contract = lift.maintenanceContract;

        if (!contract || !contract.contractFile) {
            return `<div class="alert alert-info mb-0"><i class="fas fa-info-circle"></i> Контракт ще не завантажено адміністратором</div>`;
        }

        const startDate = contract.startDate ? new Date(contract.startDate).toLocaleDateString('uk-UA') : 'Невідомо';
        const endDate = contract.endDate ? new Date(contract.endDate).toLocaleDateString('uk-UA') : null;
        const contractNumber = contract.contractNumber || 'Не вказано';
        const description = contract.description || '';
        const fileUrl = contract.contractFile.startsWith('/') ? contract.contractFile : `/uploads/${contract.contractFile}`;
        const periodText = endDate ? `${startDate} – ${endDate}` : `з ${startDate} (автоматичне продовження)`;

        return `
            <div class="d-flex align-items-start">
                <div class="flex-grow-1">
                    <p class="mb-1"><i class="fas fa-file-contract text-success mr-2"></i>
                        <strong>Контракт №${contractNumber}</strong>
                    </p>
                    <p class="mb-1 text-muted"><small><i class="fas fa-calendar mr-1"></i>Період: ${periodText}</small></p>
                    ${description ? `<p class="mb-1 text-muted"><small>${description}</small></p>` : ''}
                </div>
                <div class="btn-group ml-2">
                    <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-primary" title="Переглянути контракт">
                        <i class="fas fa-eye"></i> Переглянути
                    </a>
                    <a href="${fileUrl}" download class="btn btn-sm btn-info" title="Завантажити PDF">
                        <i class="fas fa-download"></i>
                    </a>
                    <button class="btn btn-sm btn-warning" onclick='window.liftsManager.forwardContractByEmail("${fileUrl}", "${contractNumber}")' title="Переслати по Email">
                        <i class="fas fa-envelope"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick='window.print()' title="Роздрукувати">
                        <i class="fas fa-print"></i>
                    </button>
                </div>
            </div>
        `;
    }

    filterClientReports() {
        const typeFilter = document.getElementById('clientReportTypeFilter')?.value || '';
        const periodFilter = document.getElementById('clientReportPeriodFilter')?.value || 'all';

        let filtered = [...(this._clientAllReports || [])];

        if (typeFilter) {
            filtered = filtered.filter(r => (r.inspectionType || r.type) === typeFilter);
        }
        if (periodFilter !== 'all') {
            const days = parseInt(periodFilter);
            filtered = filtered.filter(r => {
                const d = new Date(r.inspectionDate || r.date);
                return (Date.now() - d) / (1000 * 60 * 60 * 24) <= days;
            });
        }

        const container = document.getElementById('clientReportsList');
        if (container) container.innerHTML = this._buildClientReportsList(filtered);
    }

    viewClientReport(report) {
        const typeLabels = { inspection: 'Інспекція', maintenance: 'ТО', repair: 'Ремонт', emergency: 'Аварійний виклик' };
        const typeRaw = report.inspectionType || report.type || '';
        const typeLabel = typeLabels[typeRaw] || typeRaw || 'Звіт';
        const date = (report.inspectionDate || report.date)
            ? new Date(report.inspectionDate || report.date).toLocaleDateString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric' })
            : 'Невідома дата';
        const notes = report.comments || report.findings || report.notes || '';
        const inspector = report.inspectorName || report.inspector || '';
        const fileUrl = report.fileUrl || report.reportFile || report.file || null;
        const status = report.status || 'completed';
        const statusBadge = (status === 'passed' || status === 'completed')
            ? '<span class="badge badge-success">Виконано</span>'
            : '<span class="badge badge-danger">Не пройдено</span>';

        const reportJson = JSON.stringify(report).replace(/'/g, '&apos;');

        const html = `
            <div class="card border-0">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0"><i class="fas fa-clipboard-check"></i> ${typeLabel} ${statusBadge}</h5>
                </div>
                <div class="card-body">
                    <div class="row mb-3">
                        <div class="col-6"><strong><i class="fas fa-calendar text-muted"></i> Дата:</strong><br>${date}</div>
                        <div class="col-6"><strong><i class="fas fa-user text-muted"></i> Інспектор:</strong><br>${inspector || '<em class="text-muted">Не вказано</em>'}</div>
                    </div>
                    ${notes ? `<div class="mb-3"><strong><i class="fas fa-comment text-muted"></i> Коментарі:</strong><div class="p-2 bg-light rounded mt-1">${notes}</div></div>` : ''}
                    ${fileUrl ? `
                    <div class="mb-3">
                        <div class="alert alert-success d-flex align-items-center py-2">
                            <i class="fas fa-file-pdf fa-2x mr-3 text-success"></i>
                            <div class="flex-grow-1"><strong>PDF звіт доступний</strong></div>
                            <a href="${fileUrl}" target="_blank" class="btn btn-success btn-sm ml-2" onclick="window.open('${fileUrl}','_blank')">
                                <i class="fas fa-external-link-alt"></i> Відкрити PDF
                            </a>
                        </div>
                    </div>` : '<div class="alert alert-secondary"><i class="fas fa-info-circle"></i> PDF не прикріплено до цього звіту</div>'}
                </div>
                <div class="card-footer">
                    ${fileUrl ? `<a href="${fileUrl}" download class="btn btn-sm btn-info mr-2"><i class="fas fa-download"></i> Завантажити PDF</a>` : ''}
                    <button class="btn btn-sm btn-outline-warning mr-2" onclick='window.liftsManager.forwardReportByEmail(${reportJson})'><i class="fas fa-envelope"></i> Переслати Email</button>
                    <button class="btn btn-sm btn-outline-success" onclick='window.liftsManager.printClientReport(${reportJson})'><i class="fas fa-print"></i> Роздрукувати</button>
                </div>
            </div>
        `;

        // Показуємо у модальному вікні
        if ($('#clientReportViewModal').length === 0) {
            $('body').append(`
                <div class="modal fade" id="clientReportViewModal" tabindex="-1" style="z-index: 1060;">
                    <div class="modal-dialog modal-xl" role="document">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title"><i class="fas fa-file-alt"></i> Звіт</h5>
                                <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
                            </div>
                            <div class="modal-body" id="clientReportViewContent"></div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-dismiss="modal"><i class="fas fa-times"></i> Закрити</button>
                            </div>
                        </div>
                    </div>
                </div>
            `);
        }
        $('#clientReportViewContent').html(html);
        $('#clientReportViewModal').modal('show');
    }

    forwardReportByEmail(report) {
        const typeLabels = { inspection: 'Інспекція', maintenance: 'ТО', repair: 'Ремонт', emergency: 'Аварійний виклик' };
        const typeRaw = report.inspectionType || report.type || '';
        const typeLabel = typeLabels[typeRaw] || typeRaw;
        const date = (report.inspectionDate || report.date)
            ? new Date(report.inspectionDate || report.date).toLocaleDateString('uk-UA')
            : '';

        const email = prompt(`Надіслати звіт "${typeLabel} ${date}" на Email:\n(Введіть адресу одержувача)`, '');
        if (!email) return;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) { alert('Невірний формат email адреси'); return; }

        const token = (typeof AuthManager !== 'undefined' && AuthManager.getAuthToken)
            ? AuthManager.getAuthToken()
            : (sessionStorage.getItem('liftmanager_jwt') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('token'));
        fetch('/api/email/send-inspection-report', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ clientEmail: email, reportData: report })
        })
        .then(r => r.json())
        .then(result => {
            if (result.success) {
                alert(`✅ Звіт успішно надіслано на ${email}`);
            } else {
                alert('❌ Помилка надсилання: ' + (result.message || 'Невідома помилка'));
            }
        })
        .catch(e => alert('❌ Помилка: ' + e.message));
    }

    forwardContractByEmail(fileUrl, contractNumber) {
        const email = prompt(`Надіслати контракт №${contractNumber} на Email:\n(Введіть адресу одержувача)`, '');
        if (!email) return;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) { alert('Невірний формат email адреси'); return; }

        const token = (typeof AuthManager !== 'undefined' && AuthManager.getAuthToken)
            ? AuthManager.getAuthToken()
            : (sessionStorage.getItem('liftmanager_jwt') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('token'));
        // Знаходимо liftId з поточного ліфта
        const liftId = this.currentLift?._id || this.currentLift?.id || '';
        fetch(`/api/lifts/${liftId}/contract/email`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        })
        .then(r => r.json())
        .then(result => {
            if (result.success) {
                alert(`✅ Контракт успішно надіслано на ${email}`);
            } else {
                // Fallback: попередити що надсилання не вдалось але PDF доступний
                alert(`⚠️ Не вдалось надіслати через сервер. Ви можете завантажити PDF і надіслати вручну:\n${window.location.origin}${fileUrl}`);
            }
        })
        .catch(() => alert(`⚠️ Помилка з'єднання. PDF доступний за посиланням:\n${window.location.origin}${fileUrl}`));
    }

    printClientReport(report) {
        const fileUrl = report.fileUrl || report.reportFile || report.file || null;
        if (fileUrl) {
            const win = window.open(fileUrl, '_blank');
            if (win) {
                win.addEventListener('load', () => { try { win.print(); } catch(e) {} });
            }
            return;
        }
        // Якщо немає PDF — друкуємо текстову версію
        const typeLabels = { inspection: 'Інспекція', maintenance: 'ТО', repair: 'Ремонт', emergency: 'Аварійний виклик' };
        const typeRaw = report.inspectionType || report.type || '';
        const typeLabel = typeLabels[typeRaw] || typeRaw;
        const date = (report.inspectionDate || report.date)
            ? new Date(report.inspectionDate || report.date).toLocaleDateString('uk-UA')
            : 'Невідома дата';
        const notes = report.comments || report.findings || report.notes || '';

        const win = window.open('', '_blank');
        win.document.write(`<html><head><title>Звіт: ${typeLabel}</title>
            <style>body{font-family:Arial,sans-serif;padding:20px;}h2{color:#333;}table{width:100%;border-collapse:collapse;}td{padding:8px;border:1px solid #ddd;}</style>
            </head><body>
            <h2>Звіт: ${typeLabel}</h2>
            <table>
                <tr><td><b>Дата:</b></td><td>${date}</td></tr>
                <tr><td><b>Інспектор:</b></td><td>${report.inspectorName || 'Не вказано'}</td></tr>
                <tr><td><b>Статус:</b></td><td>${report.status || 'completed'}</td></tr>
                <tr><td><b>Коментарі:</b></td><td>${notes || '—'}</td></tr>
            </table>
            <script>window.print();<\/script>
            </body></html>`);
        win.document.close();
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
                        <small>${lift.model} - ${this.formatLocation(lift)}</small>
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
                            <option value="consultation">Консультація</option>
                            <option value="orcamento">Орсаменто (Кошторис)</option>
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
                            <option value="medium" selected>Середній</option>
                            <option value="high">Високий</option>
                            <option value="critical">Критичний 🔴</option>
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
            const token = (typeof AuthManager !== 'undefined' && AuthManager.getAuthToken)
                ? AuthManager.getAuthToken()
                : (sessionStorage.getItem('liftmanager_jwt') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('token'));
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
            const token = (typeof AuthManager !== 'undefined' && AuthManager.getAuthToken)
                ? AuthManager.getAuthToken()
                : (sessionStorage.getItem('liftmanager_jwt') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('token'));
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
}

// Ініціалізація
$(document).ready(function() {
    window.liftsManager = new LiftsManager();
});