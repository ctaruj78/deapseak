// assets/js/lifts.js

// Глобальна змінна для ліфтів (ініціалізується порожнім масивом)
let allLifts = [];

// Клас для управління ліфтами
class LiftManager {
    constructor() {
        console.log('LiftManager constructor called');
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filteredLifts = [];
        this.map = null;
        this.marker = null;
        this.init();
    }

    init() {
        console.log('LiftManager init() called');
        this.loadLifts();
        this.initMap();
        this.initEventListeners();
        console.log('LiftManager initialized successfully');
    }

    initEventListeners() {
        // Додавання ліфта
        $('#add-lift-button').on('click', () => {
            console.log('Add lift button clicked');
            this.resetForm();
            $('#modalTitle').text('Adicionar ліфт');
            $('#liftModal').modal('show');
        });

        // Atualização кількості серійних номерів
        $('#lift-lift-count').on('change', function () {
            const count = $(this).val();
            const serialInputs = $('#lift-serial-inputs');
            serialInputs.empty();
            for (let i = 0; i < count; i++) {
                serialInputs.append(`
                    <div class="input-group mb-2">
                        <input type="text" class="form-control lift-serial" placeholder="Número de série ліфта ${i + 1}" required>
                    </div>
                `);
            }
        });

        // Геокодування
        $('#geocode-button').on('click', () => {
            console.log('Geocode button clicked');
            const address = $('#lift-address').val();
            if (address) {
                this.geocodeAddress(address).then(coords => {
                    $('#lift-lat').val(coords.lat);
                    $('#lift-lng').val(coords.lng);
                    if (typeof toastr !== 'undefined') toastr.success('Координати отримані.');
                }).catch(() => {
                    if (typeof toastr !== 'undefined') toastr.error('Не вдалося отримати координати.');
                });
            } else {
                if (typeof toastr !== 'undefined') toastr.error('Введіть адресу.');
            }
        });

        // Збереження нового ліфта
        $('#save-lift-button').on('click', () => {
            console.log('Save lift button clicked - Validating inputs...');
            const address = $('#lift-address').val().trim();
            const postalCode = $('#lift-postal-code').val().trim();
            const liftCount = parseInt($('#lift-lift-count').val());
            const serials = $('.lift-serial').map((i, el) => $(el).val().trim()).get();
            const brand = $('#lift-brand').val().trim();
            const client = $('#lift-client').val().trim();
            const clientEmail = $('#lift-client-email').val().trim();
            const lat = $('#lift-lat').val().trim();
            const lng = $('#lift-lng').val().trim();

            console.log('Input values:', { address, postalCode, liftCount, serials, brand, client, clientEmail, lat, lng });

            if (!address || !postalCode || !liftCount || serials.some(s => !s) || !client || !clientEmail) {
                console.log('Validation failed - Required fields missing');
                if (typeof toastr !== 'undefined') toastr.error('Заповніть усі обов’язкові поля.');
                return;
            }

            for (let i = 0; i < liftCount; i++) {
                const newLift = {
                    id: generateUniqueId(),
                    address,
                    postalCode,
                    serial: serials[i] || `Serial_${i + 1}`,
                    brand,
                    status: 'active',
                    client,
                    clientEmail,
                    tech: null,
                    lastInspection: null,
                    inspectionFrequency: null,
                    capacity: null,
                    speed: null,
                    interventionHistory: [],
                    photos: [],
                    inspectionHistory: [],
                    chat: [],
                    lat: lat ? parseFloat(lat) : null,
                    lng: lng ? parseFloat(lng) : null
                };
                allLifts.push(newLift);
                console.log('Added lift:', newLift);
            }

            saveDataToLocalStorage();
            $('#liftModal').modal('hide');
            this.updateLiftTable();
            if (typeof toastr !== 'undefined') toastr.success('Elevador(и) додано.');
            console.log('Lift saved successfully - Total lifts:', allLifts.length);
        });

        // Перегляд деталей ліфта
        $('#lifts-table-body').on('click', '.details-btn', function () {
            console.log('Details button clicked for lift:', $(this).data('id'));
            const liftId = $(this).data('id');
            const lift = allLifts.find(l => l.id === liftId);
            if (lift) {
                // Заповнюємо модальне вікно деталями
                $('#detail-municipal-number').text(lift.municipalNumber || lift.id);
                $('#detail-id').text(lift.id);
                $('#detail-model').text(this.getModelDisplay(lift));
                $('#detail-type').text(this.getLiftTypeLabel(lift.type));
                $('#detail-status').html(`<span class="badge ${this.getStatusBadgeClass(lift.status)}">${this.getStatusText(lift.status)}</span>`);
                $('#detail-capacity').text(lift.capacity ? lift.capacity + ' pessoas' : '-');
                $('#detail-speed').text(lift.speed ? lift.speed + ' m/s' : '-');
                $('#detail-serial').text(lift.serial || '-');
                $('#detail-frequency').text(lift.inspectionFrequency ? lift.inspectionFrequency + ' місяців' : '-');
                $('#detail-address').text(lift.address || '-');
                $('#detail-postcode').text(lift.postcode || '-');
                $('#detail-coordinates').text(lift.lat && lift.lng ? `${lift.lat}, ${lift.lng}` : '-');
                $('#detail-client').text(lift.clientName || '-');
                $('#detail-email').text(lift.clientEmail || '-');
                $('#detail-access-code').text(lift.accessCode || '-');
                $('#detail-last-maintenance').text(lift.lastMaintenance || '-');
                $('#detail-next-maintenance').text(lift.nextMaintenance || '-');
                $('#detail-created').text(lift.createdAt ? new Date(lift.createdAt).toLocaleString('uk-UA') : '-');
                $('#detail-updated').text(lift.updatedAt ? new Date(lift.updatedAt).toLocaleString('uk-UA') : '-');
                
                $('#liftDetailsModal').modal('show');
            }
        });

        // Редагування з деталей
        $('#edit-lift-from-details').on('click', function() {
            $('#liftDetailsModal').modal('hide');
            // Тут можна додати логіку для відкриття модального вікна редагування
            // або викликати існуючий обробник
        });

        // Editar elevador
        $('#lifts-table-body').on('click', '.edit-btn', function () {
            console.log('Edit button clicked for lift:', $(this).data('id'));
            const liftId = $(this).data('id');
            const lift = allLifts.find(l => l.id === liftId);
            if (lift) {
                $('#edit-lift-id').val(lift.id);
                $('#edit-lift-address').val(lift.address);
                $('#edit-lift-postal-code').val(lift.postalCode);
                $('#edit-lift-serial').val(lift.serial);
                $('#edit-lift-brand').val(lift.brand);
                $('#edit-lift-client').val(lift.client);
                $('#edit-lift-client-email').val(lift.clientEmail);
                $('#edit-lift-capacity').val(lift.capacity);
                $('#edit-lift-speed').val(lift.speed);
                $('#edit-lift-last-inspection').val(lift.lastInspection);
                $('#edit-lift-inspection-frequency').val(lift.inspectionFrequency);
                $('#edit-report-status').text(lift.report ? 'Relatório завантажено' : 'Relatório відсутній');
                $('#editLiftModal').modal('show');
            }
        });

        $('#save-edit-lift-button').on('click', () => {
            console.log('Save edit lift button clicked');
            const liftId = $('#edit-lift-id').val();
            const lift = allLifts.find(l => l.id === liftId);
            if (lift) {
                lift.client = $('#edit-lift-client').val();
                lift.clientEmail = $('#edit-lift-client-email').val();
                lift.capacity = $('#edit-lift-capacity').val();
                lift.speed = $('#edit-lift-speed').val();
                lift.lastInspection = $('#edit-lift-last-inspection').val();
                lift.inspectionFrequency = $('#edit-lift-inspection-frequency').val();
                const fileInput = $('#edit-lift-report')[0].files[0];
                if (fileInput) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        lift.report = e.target.result;
                        CommonUtils.saveLifts(allLifts);
                        $('#edit-report-status').text('Relatório завантажено');
                        if (typeof toastr !== 'undefined') toastr.success('Relatório оновлено.');
                    };
                    reader.readAsDataURL(fileInput);
                }
                CommonUtils.saveLifts(allLifts);
                $('#editLiftModal').modal('hide');
                this.updateLiftTable();
                if (typeof toastr !== 'undefined') toastr.success('Elevador оновлено.');
            }
        });

        // Atribuir técnico
        $('#lifts-table-body').on('click', '.assign-tech-btn', function () {
            console.log('Assign tech button clicked for lift:', $(this).data('id'));
            const liftId = $(this).data('id');
            $('#assign-lift-id').val(liftId);
            const techSelect = $('#assign-tech');
            techSelect.empty();
            allUsers.filter(u => u.role === 'tech').forEach(user => {
                techSelect.append(`<option value="${user.username}">${user.username}</option>`);
            });
            $('#assignTechModal').modal('show');
        });

        $('#save-assign-tech-button').on('click', () => {
            console.log('Save assign tech button clicked');
            const liftId = $('#assign-lift-id').val();
            const tech = $('#assign-tech').val();
            const lift = allLifts.find(l => l.id === liftId);
            if (lift) {
                lift.tech = tech;
                CommonUtils.saveLifts(allLifts);
                $('#assignTechModal').modal('hide');
                this.updateLiftTable();
                if (typeof toastr !== 'undefined') toastr.success('Técnico призначено.');
            }
        });

        // Створення заявки на обслуговування
        $('#lifts-table-body').on('click', '.request-btn', function () {
            console.log('Request button clicked for lift:', $(this).data('id'));
            const liftId = $(this).data('id');
            const lift = allLifts.find(l => l.id === liftId);
            if (lift) {
                // Переходимо на сторінку заявок з предзаповненим ліфтом
                const url = `requests.html?lift=${liftId}&address=${encodeURIComponent(lift.address || '')}`;
                window.location.href = url;
            }
        });

        // Генерація QR-коду
        $('#lifts-table-body').on('click', '.qrcode-btn', function () {
            console.log('QR code button clicked for lift:', $(this).data('id'));
            const liftId = $(this).data('id');
            $('#qr-lift-id').val(liftId);
            $('#qrModal').modal('show');
            this.generateQRCode(liftId);
        });

        $('#save-qr-button').on('click', () => {
            console.log('Save QR button clicked');
            const liftId = $('#qr-lift-id').val();
            const qrCodeUrl = $('#qrcode').find('img').attr('src');
            if (qrCodeUrl) {
                allQRCodes.push({ liftId, qrCodeUrl, timestamp: new Date().toISOString() });
                CommonUtils.saveLifts(allLifts);
                $('#qrModal').modal('hide');
                if (typeof toastr !== 'undefined') toastr.success('QR-код збережено.');
            }
        });

        $('#clear-qr-button').on('click', () => {
            console.log('Clear QR button clicked');
            $('#qrcode').empty();
            if (typeof toastr !== 'undefined') toastr.info('QR-код очищено.');
        });

        // Чат
        $('#send-chat-button').on('click', () => {
            console.log('Send chat button clicked');
            const liftId = $('#chat-lift-id').val();
            const lift = allLifts.find(l => l.id === liftId);
            const message = $('#chat-input').val().trim();
            if (lift && message) {
                const newMessage = this.addChatMessage(currentUser.username, message);
                lift.chat.push(newMessage);
                CommonUtils.saveLifts(allLifts);
                $('#chat-input').val('');
                this.renderChat(lift);
                if (typeof toastr !== 'undefined') toastr.success('Повідомлення відправлено.');
            }
        });

        // Обробник submit для форми liftForm
        $('#liftForm').on('submit', (e) => {
            console.log('Form submit event triggered');
            e.preventDefault();
            this.saveLift();
        });

        // Функція оновлення таблиці
        this.updateLiftTable();
    }

    initMap() {
        try {
            if (typeof L === 'undefined') {
                console.error('Leaflet library not loaded');
                return;
            }
            const mapContainer = document.getElementById('liftMap');
            if (!mapContainer) return;
            mapContainer.style.display = 'block';
            this.map = L.map('liftMap').setView([38.7223, -9.1393], 13); // Лісабон
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);
            // Додавання інтерактиву: клік по карті встановлює координати
            this.map.on('click', (e) => {
                $('#liftLat').val(e.latlng.lat.toFixed(6));
                $('#liftLng').val(e.latlng.lng.toFixed(6));
                if (this.marker) {
                    this.map.removeLayer(this.marker);
                }
                this.marker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(this.map)
                    .bindPopup('Вибрано координати')
                    .openPopup();
            });
            console.log('Map initialized successfully');
        } catch (error) {
            console.error('Map initialization error:', error);
        }
    }

    async geocodeAddress() {
        try {
            const address = $('#liftAddress').val();
            if (!address) {
                CommonUtils.showNotification('Введіть адресу для отримання координат', 'error');
                return;
            }

            const coords = await geocodeAddress(address);
            if (coords) {
                $('#liftLat').val(coords.lat);
                $('#liftLng').val(coords.lng);
                // Atualização карти
                if (this.map) {
                    this.map.setView([coords.lat, coords.lng], 15);
                    if (this.marker) {
                        this.map.removeLayer(this.marker);
                    }
                    this.marker = L.marker([coords.lat, coords.lng]).addTo(this.map)
                        .bindPopup(address)
                        .openPopup();
                }
                CommonUtils.showNotification('Координати отримано com sucesso', 'success');
            } else {
                CommonUtils.showNotification('Адресу не знайдено', 'error');
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            CommonUtils.showNotification('Erro отримання координат', 'error');
        }
    }

    loadLifts() {
        this.filteredLifts = [...allLifts];
        this.renderLiftsTable();
    }

    renderLiftsTable() {
        const tbody = $('#liftsTable tbody');
        if (!tbody.length) return;

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginatedLifts = this.filteredLifts.slice(start, end);

        tbody.empty();

        if (paginatedLifts.length === 0) {
            tbody.html(`
                <tr>
                    <td colspan="10" class="text-center py-4 empty-state">
                        <i class="fas fa-elevator fa-3x mb-3 text-muted"></i>
                        <h5>Elevadorів не знайдено</h5>
                        <p class="mb-3">Додайте перший ліфт до системи</p>
                        <button class="btn btn-primary" data-toggle="modal" data-target="#liftModal">
                            <i class="fas fa-plus"></i> Adicionar ліфт
                        </button>
                    </td>
                </tr>
            `);
            return;
        }

        // Dezпування ліфтів за адресою для чергування кольорів
        const _addrKey = lift => {
            const a = lift.address;
            if (a && typeof a === 'object') {
                const parts = [a.street, a.city].filter(Boolean);
                return parts.join(', ').trim().toLowerCase();
            }
            const locStr = (lift.location && typeof lift.location === 'string') ? lift.location : '';
            return String(a || locStr).trim().toLowerCase();
        };
        const addressGroupMap = new Map();
        paginatedLifts.forEach(lift => {
            const addrKey = _addrKey(lift);
            if (!addressGroupMap.has(addrKey)) {
                addressGroupMap.set(addrKey, addressGroupMap.size);
            }
        });

        paginatedLifts.forEach(lift => {
            const addrKey = _addrKey(lift);
            const groupIndex = addressGroupMap.get(addrKey) ?? 0;
            const rowClass = groupIndex % 2 === 0 ? 'address-group-even' : 'address-group-odd';
            const row = `
                <tr class="${rowClass}">
                    <td>${this.sanitizeHTML(lift.municipalNumber || lift.id)}</td>
                    <td><span class="lift-model-cell" title="${this.sanitizeHTML(this.getModelDisplay(lift))}">${this.sanitizeHTML(this.getModelDisplay(lift))}</span></td>
                    <td>${this.sanitizeHTML(this.getLiftTypeLabel(lift.type))}</td>
                    <td>${this.sanitizeHTML(this._formatAddress(lift))}</td>
                    <td>${this.sanitizeHTML(lift.clientName || '-')}</td>
                    <td>${this.sanitizeHTML(lift.clientEmail || '-')}</td>
                    <td>
                        <span class="badge ${this.getStatusBadgeClass(lift.status)}">
                            ${this.getStatusText(lift.status)}
                        </span>
                    </td>
                    <td>${this.sanitizeHTML(lift.lastMaintenance || '-')}</td>
                    <td>${this.sanitizeHTML(lift.nextMaintenance || '-')}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-info btn-sm details-btn" data-id="${lift.id}">Detalhes</button>
                            <button class="btn btn-warning btn-sm edit-btn" data-id="${lift.id}">Editar</button>
                            <button class="btn btn-success btn-sm assign-tech-btn" data-id="${lift.id}">Atribuir техніка</button>
                            <button class="btn btn-primary btn-sm request-btn" data-id="${lift.id}">Pedido</button>
                            <button class="btn btn-secondary btn-sm qrcode-btn" data-id="${lift.id}">QR-код</button>
                            <button class="btn btn-danger btn-sm delete-btn" data-id="${lift.id}">Eliminar</button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
        
        this.updateCounters();
        this.renderPagination(this.filteredLifts.length);
    }

    updateCounters() {
        const start = (this.currentPage - 1) * this.itemsPerPage + 1;
        const end = Math.min(this.currentPage * this.itemsPerPage, this.filteredLifts.length);
        
        $('#showingCount').text(`${start}-${end}`);
        $('#totalCount').text(this.filteredLifts.length);
    }

    resetForm() {
    $('#liftForm')[0].reset();
    $('#liftId').val('');
    $('#municipalNumber').val('');
    $('#modalTitle').text('Adicionar ліфт');
    $('#liftForm input, #liftForm select').removeClass('is-invalid');
    $('#inspectionReport').val('');
    $('#liftLat').val('');
    $('#liftLng').val('');
    }

    fillForm(lift) {
    $('#liftId').val(lift.id);
    $('#municipalNumber').val(lift.municipalNumber || '');
    $('#liftModel').val(lift.model || '');
    $('#liftType').val(lift.type || '');
    $('#liftAddress').val(lift.address || '');
    $('#liftPostcode').val(lift.postalCode || '');
    $('#clientEmail').val(lift.clientEmail || '');
    $('#liftCapacity').val(lift.capacity || '');
    $('#liftSpeed').val(lift.speed || '');
    $('#inspectionReport').val(''); // файл не заповнюємо
    $('#liftLocation').val(lift.location || '');
    $('#liftLat').val(lift.lat || '');
    $('#liftLng').val(lift.lng || '');
    $('#lastMaintenance').val(lift.lastMaintenance || '');
    $('#nextMaintenance').val(lift.nextMaintenance || '');
    $('#liftStatus').val(lift.status || 'active');

        // Atualização карти
        if (lift.lat && lift.lng && this.map) {
            this.map.setView([lift.lat, lift.lng], 15);
            if (this.marker) {
                this.map.removeLayer(this.marker);
            }
            this.marker = L.marker([lift.lat, lift.lng]).addTo(this.map)
                .bindPopup(lift.address)
                .openPopup();
        }
    }

    saveLift() {
        console.log('saveLift() called');
        try {
            // Валідація обов'язкових полів
            const requiredFields = [
                'municipalNumber', 'liftModel', 'liftType', 'liftAddress', 'liftPostcode',
                'liftCapacity', 'liftSpeed', 'liftLocation', 'liftLat', 'liftLng', 'liftStatus'
            ]; // Manutenção та email необов'язкові
            
            let isValid = true;

            requiredFields.forEach(field => {
                const input = $('#' + field);
                let value = input.val();
                if (field === 'liftPostcode' && value) {
                    // Перевірка формату: 12345 або 1234-567
                    const ua = /^[0-9]{5}$/;
                    const pt = /^[0-9]{4}-[0-9]{3}$/;
                    if (!ua.test(value) && !pt.test(value)) {
                        input.addClass('is-invalid');
                        isValid = false;
                        return;
                    }
                }
                if (!value) {
                    input.addClass('is-invalid');
                    isValid = false;
                } else {
                    input.removeClass('is-invalid');
                }
            });

            if (!isValid) {
                CommonUtils.showNotification('Preencha todos os campos obrigatórios', 'error');
                return;
            }

            const liftId = $('#liftId').val();
            const inspectionFile = $('#inspectionReport')[0].files[0] || null;
            const lift = {
                id: liftId || CommonUtils.generateLiftId(),
                municipalNumber: $('#municipalNumber').val(),
                model: $('#liftModel').val(),
                type: $('#liftType').val(),
                address: $('#liftAddress').val(),
                postalCode: $('#liftPostcode').val(),
                clientEmail: $('#clientEmail').val(),
                capacity: $('#liftCapacity').val() ? parseInt($('#liftCapacity').val()) : null,
                speed: $('#liftSpeed').val() ? parseFloat($('#liftSpeed').val()) : null,
                inspectionReport: inspectionFile ? inspectionFile.name : '',
                location: $('#liftLocation').val(),
                lat: $('#liftLat').val() ? parseFloat($('#liftLat').val()) : null,
                lng: $('#liftLng').val() ? parseFloat($('#liftLng').val()) : null,
                lastMaintenance: $('#lastMaintenance').val(),
                nextMaintenance: $('#nextMaintenance').val(),
                status: $('#liftStatus').val(),
                updatedAt: new Date().toISOString()
            };
            // Можна додати логіку збереження inspectionFile у API/локально

            if (!liftId) {
                lift.createdAt = new Date().toISOString();
                // Генерація QR-коду для нового ліфта
                setTimeout(() => {
                    this.showQrInForm(lift);
                }, 500);
            }

            const existingIndex = allLifts.findIndex(l => l.id === lift.id);

            if (existingIndex >= 0) {
                allLifts[existingIndex] = { ...allLifts[existingIndex], ...lift };
            } else {
                allLifts.push(lift);
            }

            CommonUtils.saveLifts(allLifts);
            $('#liftModal').modal('hide');
            this.loadLifts();
            CommonUtils.showNotification('Elevador com sucesso збережено', 'success');

        } catch (error) {
            console.error('Error saving lift:', error);
            CommonUtils.showNotification('Erro ao guardar ліфта', 'error');
        }
    }

    showQrInForm(lift) {
        const qrContainer = $('#liftQrCode');
        qrContainer.empty();
        if (typeof QRCode !== 'undefined') {
            new QRCode(qrContainer[0], {
                text: JSON.stringify({ id: lift.id, model: lift.model }),
                width: 128,
                height: 128
            });
            $('#qrSection').show();
        }
    }

    editLift(id) {
        const lift = allLifts.find(l => l.id === id);
        if (lift) {
            this.fillForm(lift);
            $('#modalTitle').text('Editar ліфт');
        }
    }

    deleteLift(id) {
        if (confirm('Tem a certeza que pretende eliminar este elevador?')) {
            allLifts = allLifts.filter(lift => lift.id !== id);
            CommonUtils.saveLifts(allLifts);
            this.loadLifts();
            CommonUtils.showNotification('Elevador com sucesso видалено', 'success');
        }
    }

    searchLifts() {
        const query = $('#searchInput').val().toLowerCase();
        this.filteredLifts = allLifts.filter(lift => 
            (lift.model && lift.model.toLowerCase().includes(query)) ||
            (lift.address && lift.address.toLowerCase().includes(query)) ||
            (lift.client && lift.client.toLowerCase().includes(query)) ||
            (lift.serial && lift.serial.toLowerCase().includes(query)) ||
            (lift.id && lift.id.toLowerCase().includes(query))
        );
        this.currentPage = 1;
        this.renderLiftsTable();
    }

    applyFilters() {
        const statusFilter = $('#statusFilter').val();
        const typeFilter = $('#typeFilter').val();
        const sortFilter = $('#sortFilter').val();

        this.filteredLifts = allLifts.filter(lift => {
            const statusMatch = statusFilter === 'all' || lift.status === statusFilter;
            const typeMatch = typeFilter === 'all' || lift.type === typeFilter;
            return statusMatch && typeMatch;
        });

        // Сортування
        this.filteredLifts = this.sortLifts(this.filteredLifts, sortFilter);

        this.currentPage = 1;
        this.renderLiftsTable();
    }

    sortLifts(lifts, sortBy) {
        return lifts.sort((a, b) => {
            switch (sortBy) {
                case 'model':
                    return (a.model || '').localeCompare(b.model || '');
                case 'location':
                    return (a.address || '').localeCompare(b.address || '');
                case 'status':
                    return (a.status || '').localeCompare(b.status || '');
                case 'maintenance':
                    return new Date(a.nextMaintenance || 0) - new Date(b.nextMaintenance || 0);
                default:
                    return (a.model || '').localeCompare(b.model || '');
            }
        });
    }

    generateQR(liftId = null) {
        try {
            let lift;
            if (liftId) {
                lift = allLifts.find(l => l.id === liftId);
            } else {
                // Генерація для нового ліфта
                const model = $('#liftModel').val();
                const serial = $('#liftSerial').val();
                if (!model || !serial) {
                    CommonUtils.showNotification('Заповніть модель та серійний номер', 'error');
                    return;
                }
                lift = {
                    id: CommonUtils.generateLiftId(),
                    model: model,
                    serial: serial,
                    address: $('#liftLocation').val() || 'Nova адреса'
                };
            }

            if (!lift) return;

            const qrData = JSON.stringify({
                id: lift.id,
                model: lift.model,
                serial: lift.serial,
                address: lift.address,
                timestamp: new Date().toISOString()
            });

            $('#qrcode').empty();
            
            if (typeof QRCode !== 'undefined') {
                new QRCode(document.getElementById('qrcode'), {
                    text: qrData,
                    width: 200,
                    height: 200
                });
            } else {
                throw new Error('QRCode library not loaded');
            }

            $('#qrInfo').text(`Elevador: ${lift.model} | Agoійний: ${lift.serial}`);
            $('#qrModal').modal('show');

        } catch (error) {
            console.error('QR generation error:', error);
            CommonUtils.showNotification('Erro генерації QR коду', 'error');
        }
    }

    downloadQR() {
        try {
            const canvas = document.querySelector('#qrcode canvas');
            if (canvas) {
                canvas.toBlob(function(blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'lift-qr-code.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                });
                CommonUtils.showNotification('QR код завантажено', 'success');
            }
        } catch (error) {
            console.error('QR download error:', error);
            CommonUtils.showNotification('Erro завантаження QR коду', 'error');
        }
    }

    exportToExcel() {
        try {
            if (typeof XLSX === 'undefined') {
                throw new Error('XLSX library not loaded');
            }

            const worksheet = XLSX.utils.json_to_sheet(allLifts.map(lift => ({
                'ID': lift.id,
                'Modelo': lift.model,
                'Tipo': this.getLiftTypeLabel(lift.type),
                'Endereço': lift.address,
                'Estado': this.getStatusLabel(lift.status),
                'Cliente': lift.client,
                'Número de série': lift.serial,
                'Última manutenção': this.formatDate(lift.lastMaintenance),
                'Próxima manutenção': this.formatDate(lift.nextMaintenance),
                'Виробник': lift.manufacturer
            })));

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Elevadores');
            XLSX.writeFile(workbook, 'lifts_export.xlsx');
            CommonUtils.showNotification('Дані експортовано в Excel', 'success');

        } catch (error) {
            console.error('Excel export error:', error);
            CommonUtils.showNotification('Erro експорту в Excel', 'error');
        }
    }

    getLiftTypeLabel(type) {
        const types = {
            'passenger': 'Passageiro',
            'cargo': 'Carga',
            'freight': 'Carga',
            'hospital': 'Hospitalar',
            'service': 'Serviço',
            'panoramic': 'Panorâmico',
            'escalator': 'Ескалатор',
            'platform': 'Платформа',
            'other': 'Outro'
        };
        return types[type] || type || '-';
    }

    _formatAddress(lift) {
        const a = lift.address;
        const munCity = lift.municipality && typeof lift.municipality === 'object'
            ? lift.municipality.name
            : (typeof lift.municipality === 'string' ? lift.municipality : '');
        if (a && typeof a === 'object') {
            const city = (a.city && typeof a.city === 'string' && a.city !== a.street) ? a.city : munCity;
            return [a.street, city, a.zipCode].filter(Boolean).join(', ') || '-';
        }
        if (a && typeof a === 'string') return a;
        if (munCity) return munCity;
        const loc = lift.location;
        if (loc && typeof loc === 'string') return loc;
        return '-';
    }

    getModelDisplay(lift) {
        const brandLabels = {
            otis: 'Otis', kone: 'KONE', schindler: 'Schindler',
            thyssen: 'ThyssenKrupp', mitsubishi: 'Mitsubishi Electric',
            fujitec: 'Fujitec', other: ''
        };
        const brand = brandLabels.hasOwnProperty(lift.manufacturer)
            ? brandLabels[lift.manufacturer]
            : (lift.manufacturer || '');
        return [brand, lift.model].filter(Boolean).join(' ') || '-';
    }

    getStatusLabel(status) {
        const statuses = {
            'active': 'Ativo',
            'maintenance': 'Manutenção',
            'inactive': 'Inativo'
        };
        return statuses[status] || status;
    }

    getStatusBadgeClass(status) {
        const classes = {
            'active': 'badge-success',
            'maintenance': 'badge-warning',
            'inactive': 'badge-danger'
        };
        return classes[status] || 'badge-secondary';
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('uk-UA');
        } catch (error) {
            return dateString;
        }
    }

    renderPagination(totalItems) {
        const pagination = $('#pagination');
        if (!pagination.length) return;

        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        if (totalPages <= 1) {
            pagination.empty();
            return;
        }

        let html = '';
        
        if (this.currentPage > 1) {
            html += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="liftManager.changePage(${this.currentPage - 1}); return false;">
                        <i class="fas fa-chevron-left"></i>
                    </a>
                </li>
            `;
        }
        
        for (let i = 1; i <= totalPages; i++) {
            html += `
                <li class="page-item ${this.currentPage === i ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="liftManager.changePage(${i}); return false;">${i}</a>
                </li>
            `;
        }
        
        if (this.currentPage < totalPages) {
            html += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="liftManager.changePage(${this.currentPage + 1}); return false;">
                        <i class="fas fa-chevron-right"></i>
                    </a>
                </li>
            `;
        }
        
        pagination.html(html);
    }

    changePage(page) {
        this.currentPage = page;
        this.renderLiftsTable();
    }

    // Нові функції з інтегрованого коду
    renderRepairHistory(lift) {
        const repairList = $('#repair-list');
        if (!repairList.length) return;
        
        repairList.empty();
        if (!lift.interventionHistory || lift.interventionHistory.length === 0) {
            repairList.append('<li class="list-group-item text-center">Історія поломок і ремонтів відсутня</li>');
            return;
        }
        const repairEntries = lift.interventionHistory.filter(entry =>
            ['status_update', 'photo_upload'].includes(entry.type) &&
            ['out_of_service', 'maintenance', 'completed'].includes(entry.status)
        );
        if (repairEntries.length === 0) {
            repairList.append('<li class="list-group-item text-center">Історія поломок і ремонтів відсутня</li>');
            return;
        }
        repairEntries.forEach(entry => {
            const item = `
                <li class="list-group-item">
                    <strong>Data:</strong> ${entry.date || 'Desconhecido'}<br>
                    <strong>Tipo:</strong> ${entry.type === 'status_update' ? 'Зміна статусу' : 'A carregar фото'}<br>
                    <strong>Estado:</strong> ${this.getStatusText(entry.status)}<br>
                    <strong>Técnico:</strong> ${entry.tech || 'Desconhecido'}<br>
                    <strong>Duração:</strong> ${entry.duration || 'N/A'} хв<br>
                    ${entry.data ? `<a href="${entry.data}" download="repair_photo_${entry.date}.jpg">Descarregar фото</a>` : ''}
                </li>
            `;
            repairList.append(item);
        });
    }

    renderInspectionHistory(lift) {
        const inspectionList = $('#inspection-list');
        if (!inspectionList.length) return;
        
        inspectionList.empty();
        if (!lift.inspectionHistory || lift.inspectionHistory.length === 0) {
            inspectionList.append('<li class="list-group-item text-center">Історія інспекцій відсутня</li>');
            return;
        }
        lift.inspectionHistory.forEach(entry => {
            const item = `
                <li class="list-group-item">
                    <strong>Data:</strong> ${entry.date || 'Desconhecido'}<br>
                    <strong>Técnico:</strong> ${entry.tech || 'Desconhecido'}<br>
                    <strong>Comentário:</strong> ${entry.comment || 'Без коментаря'}<br>
                    ${entry.report ? `<a href="${entry.report}" download="inspection_${lift.id}_${entry.date}.pdf">Descarregar звіт</a>` : 'Relatório відсутній'}
                </li>
            `;
            inspectionList.append(item);
        });
    }

    renderChat(lift) {
        const chatList = $('#chat-list');
        if (!chatList.length) return;
        
        chatList.empty();
        const liftChat = lift.chat || [];
        if (liftChat.length === 0) {
            chatList.append('<li class="list-group-item text-center">Чат порожній</li>');
            return;
        }
        liftChat.forEach(message => {
            chatList.append(`
                <li class="list-group-item">
                    <strong>${message.sender}:</strong> ${message.message} <br>
                    <small>${new Date(message.timestamp).toLocaleString()}</small>
                </li>
            `);
        });
    }

    generateQRCode(liftId) {
        const qrCodeDiv = $('#qrcode');
        if (!qrCodeDiv.length) return;
        
        qrCodeDiv.empty();
        const lift = allLifts.find(l => l.id === liftId);
        if (!lift) return;

        new QRCode(qrCodeDiv[0], {
            text: `https://yourdomain.com/lift/${liftId}`,
            width: 128,
            height: 128,
            colorDark: '#000000',
            colorLight: '#ffffff'
        });
    }

    getStatusText(status) {
        const statuses = {
            'active': 'Ativo',
            'maintenance': 'Manutenção',
            'inactive': 'Inativo',
            'out_of_service': 'Fora de serviço',
            'completed': 'Завершено'
        };
        return statuses[status] || status;
    }

    // Оновлені методи для роботи з новими функціями
    updateLiftTable() {
        console.log('Updating lift table...');
        
        // Перевірка чи завантажені ліфти
        if (!this.lifts || !Array.isArray(this.lifts)) {
            console.log('⏳ Elevadores ще не завантажені, пропускаємо оновлення таблиці');
            return;
        }
        
        const liftsTableBody = $('#lifts-table-body');
        if (!liftsTableBody.length) {
            this.renderLiftsTable();
            return;
        }
        
        liftsTableBody.empty();
        const searchTerm = $('#lift-search').val().toLowerCase();
        const filteredLifts = this.lifts.filter(lift => {
            // Перевірка текстових полів
            if (lift.municipalNumber && lift.municipalNumber.toLowerCase().includes(searchTerm)) return true;
            if (lift.id && lift.id.toString().includes(searchTerm)) return true;
            if (lift.model && lift.model.toLowerCase().includes(searchTerm)) return true;
            if (lift.type && lift.type.toLowerCase().includes(searchTerm)) return true;
            if (lift.manufacturer && lift.manufacturer.toLowerCase().includes(searchTerm)) return true;
            if (lift.status && lift.status.toLowerCase().includes(searchTerm)) return true;
            
            // Перевірка адреси (об'єкт)
            if (lift.address) {
                if (lift.address.street && lift.address.street.toLowerCase().includes(searchTerm)) return true;
                if (lift.address.city && lift.address.city.toLowerCase().includes(searchTerm)) return true;
            }
            
            // Перевірка клієнта
            if (lift.client) {
                if (lift.client.firstName && lift.client.firstName.toLowerCase().includes(searchTerm)) return true;
                if (lift.client.lastName && lift.client.lastName.toLowerCase().includes(searchTerm)) return true;
                if (lift.client.email && lift.client.email.toLowerCase().includes(searchTerm)) return true;
            }
            
            return false;
        });

        $('#lift-count').text(`Загальна кількість ліфтів: ${this.lifts.length}, знайдено: ${filteredLifts.length}`);
        if (filteredLifts.length === 0) {
            $('#no-lifts-message').show();
            $('#lifts-table').hide();
        } else {
            $('#no-lifts-message').hide();
            $('#lifts-table').show();
            // Dezпування за адресою для чергування кольорів
            const _addrKey2 = lift => {
                const a = lift.address;
                if (a && typeof a === 'object') {
                    const parts = [a.street, a.city].filter(Boolean);
                    return parts.join(', ').trim().toLowerCase();
                }
                const locStr = (lift.location && typeof lift.location === 'string') ? lift.location : '';
                return String(a || locStr).trim().toLowerCase();
            };
            const addrGroupMap2 = new Map();
            filteredLifts.forEach(lift => {
                const k = _addrKey2(lift);
                if (!addrGroupMap2.has(k)) addrGroupMap2.set(k, addrGroupMap2.size);
            });
            filteredLifts.forEach(lift => {
                const k = _addrKey2(lift);
                const rowClass = (addrGroupMap2.get(k) ?? 0) % 2 === 0 ? 'address-group-even' : 'address-group-odd';
                liftsTableBody.append(`
                    <tr class="${rowClass}">
                        <td>${this.sanitizeHTML(lift.municipalNumber || lift.id)}</td>
                        <td><span class="lift-model-cell" title="${this.sanitizeHTML(this.getModelDisplay(lift))}">${this.sanitizeHTML(this.getModelDisplay(lift))}</span></td>
                        <td>${this.sanitizeHTML(this.getLiftTypeLabel(lift.type))}</td>
                        <td>${this.sanitizeHTML(this._formatAddress(lift))}</td>
                        <td>${this.sanitizeHTML(lift.clientName || '-')}</td>
                        <td>${this.sanitizeHTML(lift.clientEmail || '-')}</td>
                        <td><span class="badge ${this.getStatusBadgeClass(lift.status)}">${this.getStatusText(lift.status)}</span></td>
                        <td>${this.sanitizeHTML(lift.lastMaintenance || '-')}</td>
                        <td>${this.sanitizeHTML(lift.nextMaintenance || '-')}</td>
                        <td>
                            <button class="btn btn-info btn-sm details-btn" data-id="${lift.id}">Detalhes</button>
                            <button class="btn btn-warning btn-sm edit-btn" data-id="${lift.id}">Editar</button>
                            <button class="btn btn-success btn-sm assign-tech-btn" data-id="${lift.id}">Atribuir техніка</button>
                            <button class="btn btn-primary btn-sm request-btn" data-id="${lift.id}">Pedido</button>
                            <button class="btn btn-secondary btn-sm qrcode-btn" data-id="${lift.id}">QR-код</button>
                            <button class="btn btn-danger btn-sm delete-btn" data-id="${lift.id}">Eliminar</button>
                        </td>
                    </tr>
                `);
            });
        }
    }

    sanitizeHTML(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#39;');
    }

    // Допоміжні методи з інтегрованого коду
    autoCreateRequest(liftId, status) {
        const request = {
            id: CommonUtils.generateLiftId(),
            liftId: liftId,
            status: 'pending',
            description: `Автоматична заявка для ліфта ${liftId} зі статусом ${status}`,
            createdAt: new Date().toISOString(),
            priority: 'medium'
        };
        allServiceRequests.push(request);
        CommonUtils.saveServiceRequests(allServiceRequests);
    }

    sendEmail(to, subject, body, isHtml = false) {
        // Заглушка для відправки email
        console.log('Email sent:', { to, subject, body, isHtml });
        // Тут можна додати реальну логіку відправки email через API
    }

    addChatMessage(sender, message) {
        return {
            sender: sender,
            message: message,
            timestamp: new Date().toISOString()
        };
    }
}

// Ініціалізація при завантаженні
$(document).ready(function() {
    window.liftManager = new LiftManager();
});