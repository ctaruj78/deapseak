// lifts-manager.js - РОЗШИРЕНА ВЕРСІЯ ДЛЯ ADMINLTE
class LiftsManager {
    constructor() {
        this.lifts = [];
        this.filters = {
            status: 'all',
            type: 'all',
            sort: 'createdAsc'
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
                throw new Error('API indisponível');
            }
        } catch (error) {
            console.warn('Erro завантаження з API:', error);
            this.lifts = JSON.parse(localStorage.getItem('lifts')) || [];
            
            if (this.lifts.length === 0) {
                console.info('ℹ️ Sem dados про ліфти. Додайте ліфти через адмін-панель.');
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

        // Filtroація за статусом
        if (this.filters.status !== 'all') {
            filteredLifts = filteredLifts.filter(lift => 
                lift.status === this.filters.status
            );
        }

        // Filtroація за типом
        if (this.filters.type !== 'all') {
            filteredLifts = filteredLifts.filter(lift => 
                lift.type === this.filters.type
            );
        }

        // Pesquisa
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
        $('#sortFilter').val('createdAsc');
        $('#searchInput').val('');
        this.filters = { status: 'all', type: 'all', sort: 'createdAsc' };
        this.applyFilters();
    }

    sortLifts(lifts) {
        return lifts.sort((a, b) => {
            switch (this.filters.sort) {
                case 'createdAsc': return this.getLiftCreatedAt(a) - this.getLiftCreatedAt(b);
                case 'createdDesc': return this.getLiftCreatedAt(b) - this.getLiftCreatedAt(a);
                case 'name': return (a.model || '').localeCompare(b.model || '');
                case 'status': return (a.status || '').localeCompare(b.status || '');
                case 'location': return this.formatLocation(a).localeCompare(this.formatLocation(b));
                case 'maintenance': 
                    return new Date(a.nextMaintenance || a.nextInspectionDate || 0) - new Date(b.nextMaintenance || b.nextInspectionDate || 0);
                default: return this.getLiftCreatedAt(a) - this.getLiftCreatedAt(b);
            }
        });
    }

    getLiftCreatedAt(lift) {
        const explicitDate = lift.createdAt || lift.created_at || lift.addedAt || lift.dateCreated;
        if (explicitDate) {
            const parsed = new Date(explicitDate).getTime();
            if (!Number.isNaN(parsed) && parsed > 0) return parsed;
        }

        // Mongo ObjectId keeps creation timestamp in first 8 hex chars.
        const objectId = String(lift._id || lift.id || '').trim();
        if (/^[a-f\d]{24}$/i.test(objectId)) {
            const seconds = parseInt(objectId.substring(0, 8), 16);
            if (!Number.isNaN(seconds)) return seconds * 1000;
        }

        return Number.MAX_SAFE_INTEGER;
    }

    getInspectionAlertInfo(lift) {
        const targetDateRaw = this.getEffectiveNextInspectionDate(lift);
        if (!targetDateRaw) {
            return { hasDate: false, level: 'none', message: '', daysDiff: null };
        }

        const targetDate = new Date(targetDateRaw);
        if (Number.isNaN(targetDate.getTime())) {
            return { hasDate: false, level: 'none', message: '', daysDiff: null };
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));

        if (daysDiff < 0) {
            return {
                hasDate: true,
                level: 'danger',
                daysDiff,
                message: `Inspeção vencida há ${Math.abs(daysDiff)} dias`
            };
        }

        if (daysDiff <= 60) {
            return {
                hasDate: true,
                level: 'warning',
                daysDiff,
                message: `Requerer próxima inspeção em ${daysDiff} dias`
            };
        }

        return {
            hasDate: true,
            level: 'ok',
            daysDiff,
            message: 'Inspeção dentro do prazo'
        };
    }

    getLatestInspectionRecord(lift) {
        if (window.InspectionSourceUtils) {
            return window.InspectionSourceUtils.getLatestInspectionRecord(lift);
        }
        const records = Array.isArray(lift?.inspectionHistory) ? lift.inspectionHistory : [];
        if (!records.length) return null;
        return records
            .slice()
            .sort((a, b) => new Date(b.date || b.inspectionDate || 0) - new Date(a.date || a.inspectionDate || 0))[0] || null;
    }

    getEffectiveLastInspectionDate(lift) {
        if (window.InspectionSourceUtils) {
            return window.InspectionSourceUtils.getEffectiveLastInspectionDate(lift);
        }
        if (lift?.lastInspectionDate) return lift.lastInspectionDate;
        if (lift?.licenseDate) return lift.licenseDate;
        if (lift?.certDate) return lift.certDate;
        if (lift?.lastMaintenance) return lift.lastMaintenance;
        const latest = this.getLatestInspectionRecord(lift);
        return latest?.date || latest?.inspectionDate || null;
    }

    getEffectiveNextInspectionDate(lift) {
        if (window.InspectionSourceUtils) {
            return window.InspectionSourceUtils.getEffectiveNextInspectionDate(lift);
        }
        if (lift?.nextInspectionDate) return lift.nextInspectionDate;
        if (lift?.licenseExpiry) return lift.licenseExpiry;
        if (lift?.certExpiry) return lift.certExpiry;
        if (lift?.nextMaintenance) return lift.nextMaintenance;
        return null;
    }

    getInspectionDataSourceLabel(lift) {
        if (window.InspectionSourceUtils) {
            return window.InspectionSourceUtils.formatSourceLabel(lift, 'long');
        }
        return 'Sem fonte de validade';
    }

    buildInspectionAlertHtml(lift, compact = false) {
        const info = this.getInspectionAlertInfo(lift);
        if (!info.hasDate || info.level === 'ok') return '';

        const icon = info.level === 'danger' ? 'fa-exclamation-triangle' : 'fa-clock';
        const cls = info.level === 'danger' ? 'alert-danger' : 'alert-warning';
        const extraClass = compact ? 'py-2 px-2 mb-2' : 'mb-2';

        return `
            <div class="alert ${cls} ${extraClass}">
                <i class="fas ${icon} mr-1"></i>${info.message}
            </div>
        `;
    }

    renderLifts(lifts) {
        const grid = $('#liftsGrid');
        grid.empty();

        if (lifts.length === 0) {
            grid.html(`
                <div class="col-12">
                    <div class="empty-state">
                        <i class="fas fa-search fa-3x mb-3 text-muted"></i>
                        <h4>Nenhum elevador encontrado</h4>
                        <p>Tente alterar os parâmetros de pesquisa ou filtros</p>
                        <button class="btn btn-primary" onclick="liftsManager.resetFilters()">
                            Repor filtros
                        </button>
                    </div>
                </div>
            `);
            return;
        }

        // Dezпування за адресою для чергування кольорів між адресами
        const addressGroupMap = new Map();
        lifts.forEach(lift => {
            const key = this._normalizeAddressKey(lift);
            if (!addressGroupMap.has(key)) {
                addressGroupMap.set(key, addressGroupMap.size);
            }
        });

        lifts.forEach(lift => {
            const key = this._normalizeAddressKey(lift);
            const groupIndex = addressGroupMap.get(key) ?? 0;
            const colorClass = groupIndex % 2 === 0 ? 'lift-card-group-even' : 'lift-card-group-odd';
            const card = this.createLiftCard(lift, colorClass);
            grid.append(card);
        });
    }

    _normalizeAddressKey(lift) {
        const a = lift.address;
        if (a && typeof a === 'object') {
            const parts = [a.street, a.city].filter(Boolean);
            return parts.join(', ').trim().toLowerCase();
        }
        const locStr = (lift.location && typeof lift.location === 'string') ? lift.location : '';
        return String(a || locStr).trim().toLowerCase();
    }

    createLiftCard(lift, colorClass = 'lift-card-group-even') {
        const statusClass = this.getStatusBadgeClass(lift.status);
        const statusText = this.getStatusText(lift.status);
        const typeText = this.getTypeText(lift.type);
        const inspectionAlertHtml = this.buildInspectionAlertHtml(lift, true);
        
        // Безпечне отримання адреси
        const location = this.formatLocation(lift);
        
        return $(`
            <div class="col-lg-4 col-md-6 ${colorClass}">
                <div class="card lift-card">
                    <div class="card-header">
                        <h3 class="card-title">${lift.model || lift.name || 'Elevador'}</h3>
                        <span class="badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="card-body p-0">
                        <div class="lift-image position-relative">
                            <img src="/assets/img/lifts/${(lift.model || 'default').toLowerCase().replace(/\s+/g, '-')}.jpg" 
                                 alt="${lift.model || 'Elevador'}" 
                                 onerror="this.src='/assets/img/lifts/default.svg'">
                            <div class="lift-overlay">
                                <button class="btn btn-primary" onclick="window.liftsManager.viewLiftDetails('${lift.id || lift._id}')">
                                    <i class="fas fa-eye"></i> Detalhes
                                </button>
                            </div>
                        </div>
                        <div class="p-3">
                            ${inspectionAlertHtml}
                            ${lift.municipalNumber ? `<p><strong><i class="fas fa-hashtag mr-2"></i>N.º Municipal:</strong> <span class="badge badge-dark">${lift.municipalNumber}</span></p>` : ''}
                            <p><strong><i class="fas fa-map-marker-alt mr-2"></i>Morada:</strong> ${location}</p>
                            <p><strong><i class="fas fa-tag mr-2"></i>Tipo:</strong> ${typeText}</p>
                            <p><strong><i class="fas fa-calendar-check mr-2"></i>Última inspeção:</strong> ${this.formatDate(this.getEffectiveLastInspectionDate(lift))}</p>
                            <p><strong><i class="fas fa-calendar-alt mr-2"></i>Próxima inspeção:</strong> ${this.formatDate(this.getEffectiveNextInspectionDate(lift))}</p>
                            ${lift.capacity ? `<p><strong><i class="fas fa-weight-hanging mr-2"></i>Capacidade:</strong> ${lift.type === 'passenger' ? Math.floor(lift.capacity / 75) + ' pessoas / ' : ''}${lift.capacity} kg</p>` : ''}
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-sm btn-primary" onclick="window.liftsManager.requestService('${lift.id || lift._id}')">
                            <i class="fas fa-tools"></i> Solicitar serviço
                        </button>
                        <button class="btn btn-sm btn-info" onclick="window.liftsManager.viewHistory('${lift.id || lift._id}')">
                            <i class="fas fa-history"></i> Histórico
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="window.liftsManager.viewLiftDetails('${lift.id || lift._id}')">
                            <i class="fas fa-info-circle"></i> Detalhes
                        </button>
                    </div>
                </div>
            </div>
        `);
    }

    getStatusText(status) {
        const statuses = {
            'operational': 'Em funcionamento',
            'active': 'Em funcionamento',
            'maintenance': 'Manutenção',
            'repair': 'Em reparação',
            'attention': 'Requer atenção',
            'broken': 'Avariado',
            'inactive': 'Inativo',
            'out-of-service': 'Fora de serviço'
        };
        return statuses[status] || status;
    }

    getStatusBadgeClass(status) {
        const classes = {
            'operational': 'badge-success',
            'active': 'badge-success',
            'maintenance': 'badge-warning',
            'repair': 'badge-warning',
            'attention': 'badge-danger',
            'broken': 'badge-danger',
            'out-of-service': 'badge-secondary',
            'inactive': 'badge-secondary'
        };
        return classes[status] || 'badge-secondary';
    }

    getTypeText(type) {
        const types = {
            'passenger': 'Passageiro',
            'cargo': 'Carga',
            'hospital': 'Hospitalar'
        };
        return types[type] || type;
    }

    formatDate(dateString) {
        if (!dateString) return 'Sem dados';
        return new Date(dateString).toLocaleDateString('pt-PT');
    }

    _escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    formatLocation(lift) {
        // Prioritize address object — has full street data
        if (lift.address && typeof lift.address === 'object') {
            const parts = [];
            if (lift.address.street) parts.push(lift.address.street);
            if (lift.address.zipCode) parts.push(lift.address.zipCode);
            if (lift.address.city) parts.push(lift.address.city);
            if (parts.length > 0) return parts.join(', ');
        }

        // String address
        if (typeof lift.address === 'string' && lift.address) {
            return lift.address;
        }

        // Fall back to location string
        if (typeof lift.location === 'string' && lift.location) {
            return lift.location;
        }

        // Location object (GeoJSON — usually only city)
        if (lift.location && typeof lift.location === 'object') {
            const parts = [];
            if (lift.location.street) parts.push(lift.location.street);
            if (lift.location.city) parts.push(lift.location.city);
            if (parts.length > 0) return parts.join(', ');
        }

        return 'Endereço não especificado';
    }

    updateOverview(lifts = this.lifts) {
        $('#totalLifts').text(lifts.length);
        $('#operationalLifts').text(lifts.filter(lift => lift.status === 'operational' || lift.status === 'active').length);
        $('#maintenanceLifts').text(lifts.filter(lift => lift.status === 'maintenance' || lift.status === 'repair').length);
        
        const needsAttention = lifts.filter(lift => 
            lift.status === 'attention' || lift.status === 'broken' || this.needsAttention(lift)
        ).length;
        $('#needsAttention').text(needsAttention);
        
        // Atualização лічильника в сайдбарі
        $('#liftsCount').text(lifts.length);
    }

    needsAttention(lift) {
        const targetDate = this.getEffectiveNextInspectionDate(lift);
        if (!targetDate) return false;
        const nextDate = new Date(targetDate);
        if (Number.isNaN(nextDate.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        nextDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
        return daysDiff <= 7;
    }

    async viewLiftDetails(liftId) {
        currentLiftId = liftId;

        // Показуємо модал одразу зі спінером
        $('#liftDetailsContent').html(`
            <div class="text-center py-5">
                <i class="fas fa-spinner fa-spin fa-2x text-primary"></i>
                <p class="mt-2 text-muted">A carregar dados do elevador...</p>
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
                $('#liftDetailsContent').html(`<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> Elevador não encontrado</div>`);
                return;
            }

            this.currentLift = lift;
            $('#liftDetailsContent').html(this.createLiftDetails(lift));

            // Ініціалізуємо карту якщо є координати
            this._initClientMap(lift);
            this._loadLiftOrcamentos(lift);

        } catch (error) {
            console.error('❌ Erro завантаження деталей ліфта:', error);
            // Fallback до кешованих даних
            const lift = this.lifts.find(l => (l.id === liftId || l._id === liftId));
            if (lift) {
                this.currentLift = lift;
                $('#liftDetailsContent').html(this.createLiftDetails(lift));
                this._loadLiftOrcamentos(lift);
            } else {
                $('#liftDetailsContent').html(`<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> Erro ao carregar dados</div>`);
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
                L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(window._clientLiftMap);
                L.marker([lat, lng])
                    .addTo(window._clientLiftMap)
                    .bindPopup(`<b>${lift.municipalNumber || 'Elevador'}</b><br>${lift.address?.street || ''}`)
                    .openPopup();
            } catch (e) {
                console.warn('Карта недоступна:', e);
            }
        }, 400);
    }

    createLiftDetails(lift) {
        const liftId = lift._id || lift.id || '';
        const address = lift.address || {};
        const inspectionAlertHtml = this.buildInspectionAlertHtml(lift, false);
        const addressStr = address.street
            ? (address.city && address.city !== address.street ? `${address.street}, ${address.city}` : address.street)
            : (typeof lift.address === 'string' ? lift.address : 'Não especificado');
        const postalCode = address.zipCode || lift.postalCode || '';

        // Capacity
        let capacityText = 'Não especificado';
        if (lift.capacity) {
            const persons = Math.floor(lift.capacity / 75);
            capacityText = `${persons} pessoas / ${lift.capacity} kg`;
        }

        // Estado
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
        const coordsText = (lat && lng) ? `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}` : 'Não especificado';

        return `
            <div class="lift-details">

                <!-- Informação geral -->
                <div class="row">
                    <div class="col-md-6">
                        <div class="card mb-3">
                            <div class="card-header bg-info text-white py-2">
                                <h6 class="mb-0"><i class="fas fa-info-circle"></i> Informação geral</h6>
                            </div>
                            <div class="card-body p-2">
                                <table class="table table-sm mb-0">
                                    <tr><td><strong>N.º Municipal:</strong></td><td>${lift.municipalNumber || '-'}</td></tr>
                                    <tr><td><strong>Marca / Modelo:</strong></td><td>${lift.manufacturer ? lift.manufacturer + ' ' : ''}${lift.model || '-'}</td></tr>
                                    <tr><td><strong>Tipo:</strong></td><td>${this.getTypeText(lift.type)}</td></tr>
                                    <tr><td><strong>Estado:</strong></td><td><span class="badge ${statusClass}">${statusText}</span></td></tr>
                                    <tr><td><strong>Capacidade:</strong></td><td>${capacityText}</td></tr>
                                    ${lift.speed ? `<tr><td><strong>Velocidade:</strong></td><td>${lift.speed} m/s</td></tr>` : ''}
                                    ${lift.driveType ? `<tr><td><strong>Tipo de acionamento:</strong></td><td>${lift.driveType}</td></tr>` : ''}
                                    ${lift.doorType ? `<tr><td><strong>Tipo de porta:</strong></td><td>${lift.doorType}</td></tr>` : ''}
                                    ${lift.floorsCount ? `<tr><td><strong>Número de pisos:</strong></td><td>${lift.floorsCount}</td></tr>` : ''}
                                    ${lift.inspectionFrequency ? `<tr><td><strong>Frequência de inspeções:</strong></td><td>${lift.inspectionFrequency === 24 ? '2 anos' : lift.inspectionFrequency === 12 ? '1 ano' : lift.inspectionFrequency + ' meses'}</td></tr>` : ''}
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card mb-3">
                            <div class="card-header bg-secondary text-white py-2">
                                <h6 class="mb-0"><i class="fas fa-map-marker-alt"></i> Localização</h6>
                            </div>
                            <div class="card-body p-2">
                                <table class="table table-sm mb-0">
                                    <tr><td><strong>Endereço:</strong></td><td>${addressStr}</td></tr>
                                    ${postalCode ? `<tr><td><strong>Código postal:</strong></td><td>${postalCode}</td></tr>` : ''}
                                    <tr><td><strong>Coordenadas:</strong></td><td>${coordsText}</td></tr>
                                    ${(lift.intercomCode || lift.accessCode) ? `<tr><td><strong>Código do intercomunicador:</strong></td><td>${lift.intercomCode || lift.accessCode}</td></tr>` : ''}
                                </table>
                            </div>
                        </div>
                        <div class="card mb-3">
                            <div class="card-header bg-warning py-2">
                                <h6 class="mb-0"><i class="fas fa-calendar-check"></i> Inspeção periódica</h6>
                            </div>
                            <div class="card-body p-2">
                                ${inspectionAlertHtml}
                                <table class="table table-sm mb-0">
                                    <tr><td><strong>Última inspeção periódica:</strong></td><td>${this.formatDate(this.getEffectiveLastInspectionDate(lift))}</td></tr>
                                    <tr><td><strong>Próxima inspeção periódica:</strong></td><td>${this.formatDate(this.getEffectiveNextInspectionDate(lift))}</td></tr>
                                    <tr><td><strong>Fonte dos dados:</strong></td><td>${this.getInspectionDataSourceLabel(lift)}</td></tr>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Карта -->
                ${(lat && lng) ? `
                <div class="card mb-3">
                    <div class="card-header bg-light py-2">
                        <h6 class="mb-0"><i class="fas fa-map"></i> Mapa de localização</h6>
                    </div>
                    <div class="card-body p-0">
                        <div id="clientLiftMap" style="height: 220px; width: 100%;"></div>
                    </div>
                </div>
                ` : ''}

                <!-- Contrato de manutenção -->
                <div class="card mb-3">
                    <div class="card-header bg-success text-white py-2 d-flex justify-content-between align-items-center">
                        <h6 class="mb-0"><i class="fas fa-file-contract"></i> Contrato de manutenção</h6>
                    </div>
                    <div class="card-body p-2">
                        ${contractHtml}
                    </div>
                </div>

                <!-- Orçamentos relacionados -->
                <div class="card mb-3">
                    <div class="card-header bg-dark text-white py-2 d-flex justify-content-between align-items-center">
                        <h6 class="mb-0"><i class="fas fa-file-invoice-dollar"></i> Orçamentos relacionados ao elevador</h6>
                    </div>
                    <div class="card-body p-2" id="liftOrcamentosList">
                        <div class="text-muted"><i class="fas fa-spinner fa-spin mr-1"></i>A carregar orçamentos...</div>
                    </div>
                </div>

                <!-- Histórico de inspeções e intervenções -->
                <div class="card mb-3">
                    <div class="card-header bg-primary text-white py-2 d-flex justify-content-between align-items-center">
                        <h6 class="mb-0"><i class="fas fa-clipboard-list"></i> Histórico de inspeções e intervenções</h6>
                        <span class="badge badge-light text-primary">${reports.length} registos</span>
                    </div>
                    <div class="card-body p-2">
                        <!-- Filtro по типу -->
                        ${reports.length > 0 ? `
                        <div class="row mb-2">
                            <div class="col-md-4">
                                <select id="clientReportTypeFilter" class="form-control form-control-sm" onchange="window.liftsManager.filterClientReports()">
                                    <option value="">Todos os tipos</option>
                                    <option value="inspection">Inspeções</option>
                                    <option value="maintenance">Manutenção</option>
                                    <option value="repair">Reparações</option>
                                    <option value="emergency">Emergências</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <select id="clientReportPeriodFilter" class="form-control form-control-sm" onchange="window.liftsManager.filterClientReports()">
                                    <option value="all">Todo o período</option>
                                    <option value="30">Últimos 30 dias</option>
                                    <option value="90">Últimos 3 meses</option>
                                    <option value="365">Último ano</option>
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
            return `<div class="alert alert-warning mb-0"><i class="fas fa-exclamation-triangle"></i> Sem registos ainda</div>`;
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
            return `<div class="alert alert-warning mb-0"><i class="fas fa-search"></i> Nenhum registo encontrado</div>`;
        }

        const typeLabels = { inspection: 'Inspeção', maintenance: 'Manutenção', repair: 'Reparação', emergency: 'Chamada de emergência' };
        const typeIcons  = { inspection: 'fa-clipboard-check text-primary', maintenance: 'fa-tools text-warning', repair: 'fa-wrench text-danger', emergency: 'fa-exclamation-triangle text-danger' };

        let html = '<div class="list-group">';
        reports.forEach(report => {
            const typeRaw = report.inspectionType || report.type || 'inspection';
            const typeLabel = typeLabels[typeRaw] || typeRaw;
            const typeIcon = typeIcons[typeRaw] || 'fa-clipboard-check text-secondary';
            const date = (report.inspectionDate || report.date)
                ? new Date(report.inspectionDate || report.date).toLocaleDateString('pt-PT', { year: 'numeric', month: '2-digit', day: '2-digit' })
                : 'Data desconhecida';
            const status = report.status || 'completed';
            const notes = this._sanitizeReportText(report.comments || report.findings || report.notes || '');
            const inspector = this._pickReportPersonName(report);
            const fileUrl = report.fileUrl || report.reportFile || report.file || null;

            const statusBadge = (status === 'passed' || status === 'completed')
                ? '<span class="badge badge-success">Concluído</span>'
                : status === 'failed'
                ? '<span class="badge badge-danger">Reprovado</span>'
                : '<span class="badge badge-info">Concluído</span>';

            const reportJson = JSON.stringify(report).replace(/'/g, '&apos;');

            html += `
                <div class="list-group-item py-2 client-report-item" data-type="${typeRaw}" data-date="${report.inspectionDate || report.date || ''}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="mb-1">
                                <i class="fas ${typeIcon}"></i>
                                <strong>${typeLabel}</strong> ${statusBadge}
                                ${fileUrl ? '<i class="fas fa-paperclip text-success ml-1" title="PDF anexado"></i>' : ''}
                            </div>
                            <small class="text-muted">
                                <i class="fas fa-calendar mr-1"></i>${date}
                                ${inspector ? `&nbsp;·&nbsp;<i class="fas fa-user mr-1"></i>${inspector}` : ''}
                            </small>
                            ${notes ? `<div class="mt-1 text-muted" style="font-size:0.85em;">${notes}</div>` : ''}
                        </div>
                        <div class="btn-group-vertical ml-2">
                            <button class="btn btn-sm btn-outline-primary mb-1" onclick='window.liftsManager.viewClientReport(${reportJson})' title="Ver">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${fileUrl ? `
                            <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-outline-info mb-1" title="Abrir PDF">
                                <i class="fas fa-file-pdf"></i>
                            </a>
                            <a href="${fileUrl}" download class="btn btn-sm btn-outline-secondary mb-1" title="Descarregar PDF">
                                <i class="fas fa-download"></i>
                            </a>
                            ` : ''}
                            <button class="btn btn-sm btn-outline-warning mb-1" onclick='window.liftsManager.forwardReportByEmail(${reportJson})' title="Reencaminhar por email">
                                <i class="fas fa-envelope"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick='window.liftsManager.printClientReport(${reportJson})' title="Imprimir">
                                <i class="fas fa-print"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>
            <div class="text-right mt-1">
                <small class="text-muted">A mostrar ${reports.length} registos</small>
            </div>`;
        return html;
    }

    _renderClientContract(lift, liftId) {
        const contract = lift.maintenanceContract;

        if (!contract || !contract.contractFile) {
            return `<div class="alert alert-info mb-0"><i class="fas fa-info-circle"></i> Contrato ainda não carregado pelo administrador</div>`;
        }

        const startDate = contract.startDate ? new Date(contract.startDate).toLocaleDateString('pt-PT') : 'Desconhecido';
        const endDate = contract.endDate ? new Date(contract.endDate).toLocaleDateString('pt-PT') : null;
        const contractNumber = contract.contractNumber || 'Não especificado';
        const description = contract.description || '';
        const fileUrl = contract.contractFile.startsWith('/') ? contract.contractFile : `/uploads/${contract.contractFile}`;
        const periodText = endDate ? `${startDate} – ${endDate}` : `desde ${startDate} (renovação automática)`;

        return `
            <div class="d-flex align-items-start">
                <div class="flex-grow-1">
                    <p class="mb-1"><i class="fas fa-file-contract text-success mr-2"></i>
                        <strong>Contrato N.º ${contractNumber}</strong>
                    </p>
                    <p class="mb-1 text-muted"><small><i class="fas fa-calendar mr-1"></i>Período: ${periodText}</small></p>
                    ${description ? `<p class="mb-1 text-muted"><small>${description}</small></p>` : ''}
                </div>
                <div class="btn-group ml-2">
                    <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-primary" title="Ver contrato">
                        <i class="fas fa-eye"></i> Ver
                    </a>
                    <a href="${fileUrl}" download class="btn btn-sm btn-info" title="Descarregar PDF">
                        <i class="fas fa-download"></i>
                    </a>
                    <button class="btn btn-sm btn-warning" onclick='window.liftsManager.forwardContractByEmail("${fileUrl}", "${contractNumber}")' title="Reencaminhar por email">
                        <i class="fas fa-envelope"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick='window.print()' title="Imprimir">
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
        const typeLabels = { inspection: 'Inspeção', maintenance: 'Manutenção', repair: 'Reparação', emergency: 'Chamada de emergência' };
        const typeRaw = report.inspectionType || report.type || '';
        const typeLabel = typeLabels[typeRaw] || typeRaw || 'Relatório';
        const date = (report.inspectionDate || report.date)
            ? new Date(report.inspectionDate || report.date).toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' })
            : 'Data desconhecida';
        const notes = this._sanitizeReportText(report.comments || report.findings || report.notes || '');
        const inspector = this._pickReportPersonName(report);
        const fileUrl = report.fileUrl || report.reportFile || report.file || null;
        const status = report.status || 'completed';
        const statusBadge = (status === 'passed' || status === 'completed')
            ? '<span class="badge badge-success">Concluído</span>'
            : '<span class="badge badge-danger">Reprovado</span>';

        const reportJson = JSON.stringify(report).replace(/'/g, '&apos;');

        const html = `
            <div class="card border-0">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0"><i class="fas fa-clipboard-check"></i> ${typeLabel} ${statusBadge}</h5>
                </div>
                <div class="card-body">
                    <div class="row mb-3">
                        <div class="col-6"><strong><i class="fas fa-calendar text-muted"></i> Data:</strong><br>${date}</div>
                        <div class="col-6"><strong><i class="fas fa-user text-muted"></i> Inspetor:</strong><br>${inspector || '<em class="text-muted">Não especificado</em>'}</div>
                    </div>
                    ${notes ? `<div class="mb-3"><strong><i class="fas fa-comment text-muted"></i> Comentários:</strong><div class="p-2 bg-light rounded mt-1">${notes}</div></div>` : ''}
                    ${fileUrl ? `
                    <div class="mb-3">
                        <div class="alert alert-success d-flex align-items-center py-2">
                            <i class="fas fa-file-pdf fa-2x mr-3 text-success"></i>
                            <div class="flex-grow-1"><strong>Relatório PDF disponível</strong></div>
                            <a href="${fileUrl}" target="_blank" class="btn btn-success btn-sm ml-2" onclick="window.open('${fileUrl}','_blank')">
                                <i class="fas fa-external-link-alt"></i> Abrir PDF
                            </a>
                        </div>
                    </div>` : '<div class="alert alert-secondary"><i class="fas fa-info-circle"></i> PDF não anexado a este relatório</div>'}
                </div>
                <div class="card-footer">
                    ${fileUrl ? `<a href="${fileUrl}" download class="btn btn-sm btn-info mr-2"><i class="fas fa-download"></i> Descarregar PDF</a>` : ''}
                    <button class="btn btn-sm btn-outline-warning mr-2" onclick='window.liftsManager.forwardReportByEmail(${reportJson})'><i class="fas fa-envelope"></i> Reencaminhar por Email</button>
                    <button class="btn btn-sm btn-outline-success" onclick='window.liftsManager.printClientReport(${reportJson})'><i class="fas fa-print"></i> Imprimir</button>
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
                                <h5 class="modal-title"><i class="fas fa-file-alt"></i> Relatório</h5>
                                <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
                            </div>
                            <div class="modal-body" id="clientReportViewContent"></div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-dismiss="modal"><i class="fas fa-times"></i> Fechar</button>
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
        const typeLabels = { inspection: 'Inspeção', maintenance: 'Manutenção', repair: 'Reparação', emergency: 'Chamada de emergência' };
        const typeRaw = report.inspectionType || report.type || '';
        const typeLabel = typeLabels[typeRaw] || typeRaw;
        const date = (report.inspectionDate || report.date)
            ? new Date(report.inspectionDate || report.date).toLocaleDateString('pt-PT')
            : '';

        const email = prompt(`Enviar relatório "${typeLabel} ${date}" por email:\n(Introduza o endereço do destinatário)`, '');
        if (!email) return;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) { alert('Formato de email inválido'); return; }

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
                alert(`✅ Relatório enviado com sucesso para ${email}`);
            } else {
                alert('❌ Erro ao enviar: ' + (result.message || 'Erro desconhecido'));
            }
        })
        .catch(e => alert('❌ Erro: ' + e.message));
    }

    forwardContractByEmail(fileUrl, contractNumber) {
        const email = prompt(`Enviar contrato N.º${contractNumber} por email:\n(Introduza o endereço do destinatário)`, '');
        if (!email) return;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) { alert('Formato de email inválido'); return; }

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
                alert(`✅ Contrato enviado com sucesso para ${email}`);
            } else {
                // Fallback: попередити що надсилання не вдалось але PDF доступний
                alert(`⚠️ Não foi possível enviar via servidor. Pode descarregar o PDF e enviar manualmente:\n${window.location.origin}${fileUrl}`);
            }
        })
        .catch(() => alert(`⚠️ Erro de ligação. PDF disponível em:\n${window.location.origin}${fileUrl}`));
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
        const typeLabels = { inspection: 'Inspeção', maintenance: 'Manutenção', repair: 'Reparação', emergency: 'Chamada de emergência' };
        const typeRaw = report.inspectionType || report.type || '';
        const typeLabel = typeLabels[typeRaw] || typeRaw;
        const date = (report.inspectionDate || report.date)
            ? new Date(report.inspectionDate || report.date).toLocaleDateString('pt-PT')
            : 'Data desconhecida';
        const notes = this._sanitizeReportText(report.comments || report.findings || report.notes || '');

        const win = window.open('', '_blank');
        win.document.write(`<html><head><title>Relatório: ${typeLabel}</title>
            <style>body{font-family:Arial,sans-serif;padding:20px;}h2{color:#333;}table{width:100%;border-collapse:collapse;}td{padding:8px;border:1px solid #ddd;}</style>
            </head><body>
            <h2>Relatório: ${typeLabel}</h2>
            <table>
                <tr><td><b>Data:</b></td><td>${date}</td></tr>
                <tr><td><b>Inspetor:</b></td><td>${this._pickReportPersonName(report) || 'Não especificado'}</td></tr>
                <tr><td><b>Estado:</b></td><td>${report.status || 'completed'}</td></tr>
                <tr><td><b>Comentários:</b></td><td>${notes || '—'}</td></tr>
            </table>
            <script>window.print();<\/script>
            </body></html>`);
        win.document.close();
    }

    _sanitizeReportText(text) {
        if (!text) return '';
        return String(text)
            .replace(/\[\?\]/g, '')
            .replace(/\(\?\)/g, '')
            .replace(/\s*-\s*\[\?\]\s*/g, ' ')
            .replace(/Порушення/gi, 'Violações')
            .replace(/[А-Яа-яЁёІіЇїЄєҐґ]+/g, ' ')
            .replace(/\s+\uFFFD\s+/g, ' ')
            .replace(/\s+-\s+-\s+/g, ' - ')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    _formatPersonName(value) {
        const clean = this._sanitizeReportText(value || '');
        if (!clean) return '';

        let text = clean.replace(/\s+/g, ' ').trim();

        // Fix glued role + name values like "TécnicoCustóias".
        text = text
            .replace(/\b(T[eé]cnico|Inspector)([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ])/g, '$1 $2')
            .replace(/\b(T[eé]cnico|Inspector)\s*:\s*/g, '$1 ')
            .replace(/^\s*(T[eé]cnico|Inspector)\s+/i, '')
            .trim();

        // Normalize common typo from legacy imports.
        text = text.replace(/\bCust[oó]ias\b/gi, 'Custódias');

        return text;
    }

    _pickReportPersonName(report) {
        const candidates = [
            report?.inspectorName,
            report?.technicianName,
            report?.inspector,
            report?.technician,
            report?.technician?.name,
            `${report?.technician?.firstName || ''} ${report?.technician?.lastName || ''}`,
            report?.assignedTo?.name,
            `${report?.assignedTo?.firstName || ''} ${report?.assignedTo?.lastName || ''}`
        ];

        const names = candidates
            .map(candidate => this._formatPersonName(candidate))
            .filter(Boolean)
            .filter(name => name.toLowerCase() !== 'unknown');

        if (!names.length) return '';

        // Prefer full names when available (e.g., "Rafael Fernandes" over "Custódias").
        const fullName = names.find(name => name.split(' ').filter(Boolean).length >= 2);
        return fullName || names[0];
    }

    _normalizeText(value) {
        return String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9/\s-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    _normalizeMunicipal(value) {
        return String(value || '').replace(/\s+/g, '').toLowerCase();
    }

    _extractOrcamentoLiftIds(orcamento) {
        const ids = new Set();
        if (orcamento?.liftId) {
            const v = typeof orcamento.liftId === 'object' ? (orcamento.liftId.$oid || orcamento.liftId._id || orcamento.liftId.toString?.()) : orcamento.liftId;
            if (v) ids.add(String(v));
        }

        if (Array.isArray(orcamento?.lifts)) {
            orcamento.lifts.forEach(item => {
                if (!item) return;
                if (typeof item === 'string') {
                    ids.add(item);
                    return;
                }
                if (typeof item === 'object') {
                    const raw = item.liftId || item._id || item.id || item.$oid;
                    if (raw) ids.add(String(raw));
                }
            });
        }

        return ids;
    }

    _isOrcamentoRelatedToLift(orcamento, lift) {
        const liftId = String(lift?._id || lift?.id || '');
        const linkedIds = this._extractOrcamentoLiftIds(orcamento);
        if (liftId && linkedIds.has(liftId)) return true;

        const municipal = this._normalizeMunicipal(lift?.municipalNumber || '');
        const rawText = [
            orcamento?.liftAddress,
            orcamento?.cliente?.morada,
            orcamento?.notas,
            ...(Array.isArray(orcamento?.servicos) ? orcamento.servicos.map(s => s?.descricao) : [])
        ].filter(Boolean).join(' | ');
        const normalizedRawText = this._normalizeMunicipal(rawText);
        if (municipal && normalizedRawText.includes(municipal)) return true;

        const liftStreet = this._normalizeText(lift?.address?.street || this.formatLocation(lift));
        const orcAddress = this._normalizeText(orcamento?.liftAddress || orcamento?.cliente?.morada || '');
        if (liftStreet && orcAddress && (orcAddress.includes(liftStreet) || liftStreet.includes(orcAddress))) {
            const matchingLifts = (this.lifts || []).filter(candidate => {
                const candidateStreet = this._normalizeText(candidate?.address?.street || this.formatLocation(candidate));
                return candidateStreet && (orcAddress.includes(candidateStreet) || candidateStreet.includes(orcAddress));
            });

            if (matchingLifts.length === 1) {
                const onlyLiftId = String(matchingLifts[0]?._id || matchingLifts[0]?.id || '');
                return onlyLiftId && onlyLiftId === liftId;
            }

            return false;
        }

        return false;
    }

    async _loadLiftOrcamentos(lift) {
        const container = document.getElementById('liftOrcamentosList');
        if (!container) return;

        try {
            const token = (typeof AuthManager !== 'undefined' && AuthManager.getAuthToken)
                ? AuthManager.getAuthToken()
                : (sessionStorage.getItem('liftmanager_jwt') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('token'));

            const res = await fetch('/api/orcamentos/my', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                container.innerHTML = '<div class="alert alert-warning mb-0"><i class="fas fa-exclamation-triangle"></i> Não foi possível carregar orçamentos.</div>';
                return;
            }

            const payload = await res.json();
            const all = Array.isArray(payload?.data) ? payload.data : [];
            const related = all
                .filter(o => this._isOrcamentoRelatedToLift(o, lift))
                .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));

            if (related.length === 0) {
                container.innerHTML = '<div class="alert alert-light mb-0"><i class="fas fa-info-circle"></i> Sem orçamentos vinculados a este elevador.</div>';
                return;
            }

            const statusClass = {
                enviado: 'badge-warning',
                aprovado: 'badge-success',
                rejeitado: 'badge-danger',
                expirado: 'badge-secondary'
            };
            const statusText = {
                enviado: 'Aguarda resposta',
                aprovado: 'Aprovado',
                rejeitado: 'Rejeitado',
                expirado: 'Expirado'
            };

            container.innerHTML = related.map(o => {
                const data = this.formatDate(o.data);
                const total = Number(o.total || 0).toFixed(2);
                const stClass = statusClass[o.status] || 'badge-secondary';
                const stText = statusText[o.status] || (o.status || '—');
                return `
                    <div class="border rounded p-2 mb-2">
                        <div class="d-flex justify-content-between align-items-center flex-wrap" style="gap:8px;">
                            <div>
                                <strong>${o.numero || 'Orçamento'}</strong>
                                <span class="badge ${stClass} ml-1">${stText}</span>
                                <div class="text-muted small">Data: ${data} · Total: €${total}</div>
                                ${o.liftAddress ? `<div class="text-muted small"><i class="fas fa-map-marker-alt mr-1"></i>${o.liftAddress}</div>` : ''}
                            </div>
                            <div class="btn-group btn-group-sm" role="group" aria-label="Ações do orçamento">
                                <button class="btn btn-outline-primary" onclick="window.liftsManager.viewOrcamentoQuick('${o._id}')" title="Ver detalhe">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-outline-info" onclick="window.liftsManager.openOrcamentoPdf('${o._id}', '${(o.numero || '').replace(/'/g, '\\&#39;')}')" title="PDF">
                                    <i class="fas fa-file-pdf"></i>
                                </button>
                                <button class="btn btn-outline-success" onclick="window.liftsManager.printOrcamentoPdf('${o._id}', '${(o.numero || '').replace(/'/g, '\\&#39;')}')" title="Imprimir">
                                    <i class="fas fa-print"></i>
                                </button>
                                <button class="btn btn-outline-warning" onclick="window.liftsManager.emailOrcamento('${o._id}', '${(o.numero || '').replace(/'/g, '\\&#39;')}')" title="Email">
                                    <i class="fas fa-envelope"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.warn('Erro ao carregar orçamentos relacionados:', error);
            container.innerHTML = '<div class="alert alert-warning mb-0"><i class="fas fa-exclamation-triangle"></i> Erro ao carregar orçamentos relacionados.</div>';
        }
    }

    _getToken() {
        return (typeof AuthManager !== 'undefined' && AuthManager.getAuthToken)
            ? AuthManager.getAuthToken()
            : (sessionStorage.getItem('liftmanager_jwt') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('token'));
    }

    async _fetchOrcamentoById(id) {
        const token = this._getToken();
        const res = await fetch(`/api/orcamentos/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Não foi possível carregar o orçamento');
        const json = await res.json();
        return json.data;
    }

    async viewOrcamentoQuick(id) {
        try {
            const o = await this._fetchOrcamentoById(id);
            const statusClass = {
                enviado: 'badge-warning',
                aprovado: 'badge-success',
                rejeitado: 'badge-danger',
                expirado: 'badge-secondary'
            };
            const statusText = {
                enviado: 'Aguarda resposta',
                aprovado: 'Aprovado',
                rejeitado: 'Rejeitado',
                expirado: 'Expirado'
            };

            const numero = this._escapeHtml(o.numero || '');
            const clienteNome = this._escapeHtml(o.cliente?.nome || '—');
            const clienteEmail = this._escapeHtml(o.cliente?.email || '—');
            const morada = this._escapeHtml(o.cliente?.morada || '—');
            const liftAddress = this._escapeHtml(o.liftAddress || o.cliente?.morada || '—');
            const observacao = this._escapeHtml(o.observacao || '');
            const notas = this._escapeHtml(o.notas || '');
            const stClass = statusClass[o.status] || 'badge-secondary';
            const stText = this._escapeHtml(statusText[o.status] || (o.status || '—'));
            const aprovadoPor = this._escapeHtml(
                (o.status === 'aprovado' || o.status === 'rejeitado')
                    ? (!o.aprovadoPor || o.aprovadoPor === 'cliente' ? 'si próprio(a)' : 'FestLift')
                    : ''
            );
            const numeroForAttr = String(o.numero || '').replace(/'/g, '\\&#39;');

            const linhas = (o.servicos || []).map(s => `
                <tr>
                    <td>${this._escapeHtml(s.descricao || '—')}</td>
                    <td class="text-center">${s.quantidade || 0}</td>
                    <td class="text-right" style="white-space:nowrap;">€${Number(s.precoUnitario || 0).toFixed(2)}</td>
                    <td class="text-right" style="white-space:nowrap;">€${Number(s.total || 0).toFixed(2)}</td>
                </tr>
            `).join('');

            Swal.fire({
                title: `Orçamento ${numero}`,
                width: '980px',
                customClass: {
                    popup: 'text-left'
                },
                html: `
                    <div class="row mb-3 text-left">
                        <div class="col-sm-6 mb-2 mb-sm-0">
                            <p class="mb-1"><strong>Data:</strong> ${this.formatDate(o.data)}</p>
                            <p class="mb-1"><strong>Válido até:</strong> ${o.validadeAte ? this.formatDate(o.validadeAte) : 'N/A'}</p>
                            <p class="mb-1"><strong>Status:</strong> <span class="badge ${stClass}">${stText}</span></p>
                            ${o.dataResposta ? `<p class="mb-1"><strong>Data de resposta:</strong> ${this.formatDate(o.dataResposta)}</p>` : ''}
                            ${(o.status === 'aprovado' || o.status === 'rejeitado') ? `<p class="mb-1"><strong>${o.status === 'aprovado' ? 'Aprovado' : 'Rejeitado'} por:</strong> ${aprovadoPor}</p>` : ''}
                            ${observacao ? `<p class="mb-1"><strong>Observação:</strong> ${observacao}</p>` : ''}
                            <p class="mb-0"><strong><i class="fas fa-map-marker-alt text-warning mr-1"></i>Elevador:</strong> ${liftAddress}</p>
                        </div>
                        <div class="col-sm-6">
                            <p class="mb-1"><strong>Nome:</strong> ${clienteNome}</p>
                            <p class="mb-1"><strong>Email:</strong> ${clienteEmail}</p>
                            <p class="mb-0"><strong>Morada:</strong> ${morada}</p>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-sm table-bordered mb-2">
                            <thead>
                                <tr>
                                    <th>Descrição</th>
                                    <th class="text-center" style="width:72px;">Qtd</th>
                                    <th class="text-right" style="width:120px;">Preço unit.</th>
                                    <th class="text-right" style="width:120px;">Total</th>
                                </tr>
                            </thead>
                            <tbody>${linhas}</tbody>
                            <tfoot>
                                <tr><td colspan="3" class="text-right"><strong>Subtotal</strong></td><td class="text-right" style="white-space:nowrap;">€${Number(o.subtotal || 0).toFixed(2)}</td></tr>
                                <tr><td colspan="3" class="text-right"><strong>IVA (23%)</strong></td><td class="text-right" style="white-space:nowrap;">€${Number(o.iva || 0).toFixed(2)}</td></tr>
                                <tr class="table-active"><td colspan="3" class="text-right"><strong>TOTAL</strong></td><td class="text-right" style="white-space:nowrap;"><strong>€${Number(o.total || 0).toFixed(2)}</strong></td></tr>
                            </tfoot>
                        </table>
                    </div>
                    ${notas ? `<div class="alert alert-light text-left mb-2"><strong>Notas:</strong> ${notas}</div>` : ''}
                    <div class="text-right">
                        <button class="btn btn-sm btn-outline-info mr-1" onclick="window.liftsManager.openOrcamentoPdf('${o._id}', '${numeroForAttr}')">
                            <i class="fas fa-file-pdf"></i> PDF
                        </button>
                        <button class="btn btn-sm btn-outline-success mr-1" onclick="window.liftsManager.printOrcamentoPdf('${o._id}', '${numeroForAttr}')">
                            <i class="fas fa-print"></i> Imprimir
                        </button>
                        <button class="btn btn-sm btn-outline-warning" onclick="window.liftsManager.emailOrcamento('${o._id}', '${numeroForAttr}')">
                            <i class="fas fa-envelope"></i> Email
                        </button>
                    </div>
                `,
                confirmButtonText: 'Fechar'
            });
        } catch (error) {
            Swal.fire('Erro', error.message, 'error');
        }
    }

    async openOrcamentoPdf(id, numero = '') {
        try {
            const token = this._getToken();
            const res = await fetch(`/api/orcamentos/${id}/pdf`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Não foi possível abrir PDF');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 15000);
        } catch (error) {
            Swal.fire('Erro', error.message, 'error');
        }
    }

    async printOrcamentoPdf(id, numero = '') {
        try {
            const token = this._getToken();
            const res = await fetch(`/api/orcamentos/${id}/pdf`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Não foi possível imprimir o PDF');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const win = window.open(url, '_blank');
            if (win) {
                win.addEventListener('load', () => { try { win.print(); } catch (e) {} });
            }
            setTimeout(() => URL.revokeObjectURL(url), 20000);
        } catch (error) {
            Swal.fire('Erro', error.message, 'error');
        }
    }

    async emailOrcamento(id, numero = '') {
        const email = prompt(`Enviar resumo do orçamento ${numero || ''} por email:`, '');
        if (!email) return;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Swal.fire('Email inválido', 'Introduza um email válido.', 'warning');
            return;
        }

        try {
            const o = await this._fetchOrcamentoById(id);
            const subject = encodeURIComponent(`Orçamento ${o.numero || numero || ''}`);
            const body = encodeURIComponent(
                `Segue resumo do orçamento ${o.numero || ''}.\n` +
                `Data: ${this.formatDate(o.data)}\n` +
                `Total: €${Number(o.total || 0).toFixed(2)}\n` +
                `Morada: ${o.liftAddress || o.cliente?.morada || '—'}\n\n` +
                `Pode consultar o documento completo no portal FestLift em Orçamentos.`
            );
            window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
        } catch (error) {
            Swal.fire('Erro', error.message, 'error');
        }
    }

    getMaintenanceStatus(lift) {
        if (!lift.nextMaintenance) return 'Sem dados';
        
        const nextDate = new Date(lift.nextMaintenance);
        const today = new Date();
        const daysDiff = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysDiff < 0) return 'Vencido';
        if (daysDiff <= 3) return 'Manutenção urgente';
        if (daysDiff <= 7) return 'Manutenção em breve';
        if (daysDiff <= 30) return 'Manutenção planeada';
        return 'Normal';
    }

    getMaintenanceStatusClass(status) {
        const classes = {
            'Vencido': 'badge-danger',
            'Manutenção urgente': 'badge-danger',
            'Manutenção em breve': 'badge-warning',
            'Manutenção planeada': 'badge-info',
            'Normal': 'badge-success',
            'Sem dados': 'badge-secondary'
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
            scheduleContainer.html('<p>Sem manutenções agendadas</p>');
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
        const operational = this.lifts.filter(l => l.status === 'operational' || l.status === 'active').length;
        const maintenance = this.lifts.filter(l => l.status === 'maintenance' || l.status === 'repair').length;
        const needsAttention = this.lifts.filter(l => l.status === 'attention' || l.status === 'broken').length;
        
        const uptimePercent = totalLifts > 0 ? ((operational / totalLifts) * 100).toFixed(1) : 0;
        
        statsContainer.html(`
            <div class="stat-item">
                <h5><i class="fas fa-chart-line"></i> Disponibilidade geral</h5>
                <p><strong>${uptimePercent}%</strong> elevadores sem problemas</p>
                <p>Total de elevadores: <strong>${totalLifts}</strong></p>
            </div>
            <div class="stat-item">
                <h5><i class="fas fa-tools"></i> Estado da manutenção</h5>
                <p>Em funcionamento: <strong>${operational}</strong></p>
                <p>Em manutenção: <strong>${maintenance}</strong></p>
                <p>A necessitar de atenção: <strong>${needsAttention}</strong></p>
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
                Os documentos dos elevadores estarão disponíveis após serem adicionados pelo administrador.
            </div>
        `);
    }

    requestService(liftId) {
        const lift = this.lifts.find(l => (l.id === liftId || l._id === liftId));
        if (!lift) {
            console.error('Lift not found for service request:', liftId);
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Elevador não encontrado',
                confirmButtonText: 'OK'
            });
            return;
        }

        // Показуємо модальне вікно для створення запиту
        Swal.fire({
            title: 'Solicitar serviço',
            html: `
                <div class="text-left">
                    <p><strong>Elevador:</strong> ${lift.model || lift.name || 'Elevador'}</p>
                    <p><strong>Endereço:</strong> ${this.formatLocation(lift)}</p>
                    <hr>
                    <div class="form-group">
                        <label>Tipo de serviço:</label>
                        <select id="serviceType" class="form-control">
                            <option value="maintenance">Manutenção programada</option>
                            <option value="repair">Reparação</option>
                            <option value="inspection">Inspeção</option>
                            <option value="consultation">Consultoria</option>
                            <option value="orcamento">Orçamento (Estimativa)</option>
                            <option value="emergency">Situação de emergência</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Descrição do problema:</label>
                        <textarea id="serviceDescription" class="form-control" rows="3" placeholder="Descreva detalhadamente o problema ou pedido..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>Prioridade:</label>
                        <select id="servicePriority" class="form-control">
                            <option value="low">Baixo</option>
                            <option value="medium" selected>Médio</option>
                            <option value="high">Alto</option>
                            <option value="critical">Crítico 🔴</option>
                        </select>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Enviar pedido',
            cancelButtonText: 'Cancelar',
            width: '600px',
            preConfirm: () => {
                const serviceType = document.getElementById('serviceType').value;
                const description = document.getElementById('serviceDescription').value;
                const priority = document.getElementById('servicePriority').value;
                
                if (!description || description.trim().length < 10) {
                    Swal.showValidationMessage('Por favor, descreva o problema com mais detalhe (mínimo 10 caracteres)');
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
                    title: 'Sucesso!',
                    text: 'O seu pedido foi enviado com sucesso. Entraremos em contacto brevemente.',
                    confirmButtonText: 'OK'
                });
            } else {
                throw new Error('Erro ao enviar pedido');
            }
        } catch (error) {
            console.error('Error submitting service request:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Não foi possível enviar o pedido. Tente novamente mais tarde.',
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
                title: 'Erro',
                text: 'Elevador não encontrado',
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

            const normalizeHistoryType = (entry) => {
                const t = String(entry?.type || entry?.inspectionType || entry?.reportType || 'registo').toLowerCase();
                if (t.includes('annual') || t.includes('inspection')) return 'Inspeção periódica';
                if (t.includes('routine') || t.includes('maintenance')) return 'Manutenção';
                if (t.includes('emergency')) return 'Emergência';
                if (t.includes('repair')) return 'Reparação';
                if (t.includes('certification')) return 'Certificação';
                return entry?.type || entry?.inspectionType || entry?.reportType || 'Registo';
            };

            const normalizeHistoryStatus = (entry) => {
                const st = String(entry?.status || '').toLowerCase();
                if (st === 'passed' || st === 'completed') return { cls: 'success', label: 'Concluído' };
                if (st === 'failed') return { cls: 'danger', label: 'Reprovado' };
                if (st === 'conditional') return { cls: 'warning', label: 'Condicional' };
                return { cls: 'secondary', label: entry?.status || 'Sem estado' };
            };

            const isInspectionEntry = (entry) => {
                const t = String(entry?.type || entry?.inspectionType || entry?.reportType || '').toLowerCase();
                return t.includes('inspection') || t.includes('annual') || t.includes('certification');
            };

            const truncateText = (text, max = 180) => {
                const clean = this._sanitizeReportText(text || '');
                if (!clean || clean === '-') return '';
                return clean.length > max ? `${clean.slice(0, max).trim()}...` : clean;
            };

            const formatHistoryPerson = (entry) => {
                const raw = this._sanitizeReportText(entry?.technician || entry?.inspector || '-');
                if (!raw || raw === '-') return '-';

                let text = raw.replace(/\s+/g, ' ').trim();

                // Fix glued labels like "TécnicoCustóias" or "InspectorJoão".
                text = text
                    .replace(/\b(T[eé]cnico|Inspector)([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ])/g, '$1 $2')
                    .replace(/\b(T[eé]cnico|Inspector)\s*:\s*/g, '$1 ')
                    .trim();

                // Keep only the name and remove generic role prefixes.
                text = text.replace(/^\s*(T[eé]cnico|Inspector)\s+/i, '').trim();

                // Normalize common typo seen in imported legacy inspection names.
                text = text.replace(/\bCust[oó]ias\b/gi, 'Custódias');

                return text || '-';
            };

            const renderHistoryCards = (entries = []) => {
                return entries.map(entry => {
                    const status = normalizeHistoryStatus(entry);
                    const typeLabel = normalizeHistoryType(entry);
                    const person = formatHistoryPerson(entry);
                    const personRole = isInspectionEntry(entry) ? 'Inspector' : 'Técnico';
                    const date = this.formatDate(entry?.date);
                    const inspectionEntry = isInspectionEntry(entry);
                    const validUntil = entry?.validUntil ? this.formatDate(entry.validUntil) : '';
                    const shortDescription = truncateText(entry?.description || entry?.notes || '');

                    return `
                        <div class="border rounded p-2 mb-2 text-left">
                            <div class="d-flex justify-content-between align-items-center flex-wrap" style="gap:6px;">
                                <div>
                                    <span class="badge badge-info">${typeLabel}</span>
                                    <span class="ml-2 text-muted small"><i class="far fa-calendar-alt mr-1"></i>${date}</span>
                                </div>
                                <span class="badge badge-${status.cls}">${status.label}</span>
                            </div>
                            <div class="mt-2 text-muted small"><i class="fas fa-user mr-1"></i><strong>${personRole}:</strong> ${person || '-'}</div>
                            ${inspectionEntry
                                ? `${validUntil ? `<div class="mt-1 text-muted small"><i class="far fa-clock mr-1"></i>Válido até: ${validUntil}</div>` : ''}`
                                : `${shortDescription ? `<div class="mt-2 small" style="line-height:1.35;">${shortDescription}</div>` : ''}`
                            }
                        </div>
                    `;
                }).join('');
            };
            
            if (response.ok) {
                const history = await response.json();
                if (history.data && history.data.length > 0) {
                    historyHtml = `<div style="max-height: 60vh; overflow:auto;">${renderHistoryCards(history.data)}</div>`;
                } else {
                    historyHtml = '<p class="text-center text-muted">Sem histórico de manutenção</p>';
                }
            } else {
                // Fallback to lift's maintenance history
                if (lift.maintenanceHistory && lift.maintenanceHistory.length > 0) {
                    historyHtml = `<div style="max-height: 60vh; overflow:auto;">${renderHistoryCards(lift.maintenanceHistory)}</div>`;
                } else if (lift.inspectionHistory && lift.inspectionHistory.length > 0) {
                    historyHtml = `<div style="max-height: 60vh; overflow:auto;">${renderHistoryCards(lift.inspectionHistory)}</div>`;
                } else {
                    historyHtml = '<p class="text-center text-muted">Sem histórico de manutenção</p>';
                }
            }

            const liftLabel = lift.municipalNumber
                ? `${lift.municipalNumber} — ${lift.model || lift.name || 'Elevador'}`
                : (lift.model || lift.name || 'Elevador');

            Swal.fire({
                title: `Histórico: ${liftLabel}`,
                html: historyHtml,
                width: '800px',
                confirmButtonText: 'Fechar'
            });
        } catch (error) {
            console.error('Error loading history:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Não foi possível carregar o histórico',
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