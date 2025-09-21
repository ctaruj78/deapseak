// assets/js/lifts.js

// Клас для управління ліфтами
class LiftManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filteredLifts = [];
        this.map = null;
        this.marker = null;
        this.init();
    }

    init() {
        this.loadLifts();
        this.initMap();
        console.log('LiftManager initialized successfully');
    }

    initMap() {
        try {
            if (typeof L === 'undefined') {
                console.error('Leaflet library not loaded');
                return;
            }
            
            this.map = L.map('map').setView([50.4501, 30.5234], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);
            
            console.log('Map initialized successfully');
        } catch (error) {
            console.error('Map initialization error:', error);
        }
    }

    async geocodeAddress() {
        try {
            const address = $('#liftLocation').val();
            if (!address) {
                showNotification('Введіть адресу для отримання координат', 'error');
                return;
            }

            const coords = await geocodeAddress(address);
            if (coords) {
                $('#liftLat').val(coords.lat);
                $('#liftLng').val(coords.lng);
                
                // Оновлення карти
                this.map.setView([coords.lat, coords.lng], 15);
                if (this.marker) {
                    this.map.removeLayer(this.marker);
                }
                this.marker = L.marker([coords.lat, coords.lng]).addTo(this.map)
                    .bindPopup(address)
                    .openPopup();
                
                showNotification('Координати отримано успішно', 'success');
            } else {
                showNotification('Адресу не знайдено', 'error');
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            showNotification('Помилка отримання координат', 'error');
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
                    <td colspan="9" class="text-center py-4 empty-state">
                        <i class="fas fa-elevator fa-3x mb-3 text-muted"></i>
                        <h5>Ліфтів не знайдено</h5>
                        <p class="mb-3">Додайте перший ліфт до системи</p>
                        <button class="btn btn-primary" data-toggle="modal" data-target="#liftModal">
                            <i class="fas fa-plus"></i> Додати ліфт
                        </button>
                    </td>
                </tr>
            `);
            return;
        }

        paginatedLifts.forEach(lift => {
            const row = `
                <tr>
                    <td>${lift.id}</td>
                    <td>${lift.model || '-'}</td>
                    <td>${this.getLiftTypeLabel(lift.type)}</td>
                    <td>${lift.location || '-'}</td>
                    <td>
                        <span class="badge ${this.getStatusBadgeClass(lift.status)}">
                            ${this.getStatusLabel(lift.status)}
                        </span>
                    </td>
                    <td>${lift.client || '-'}</td>
                    <td>${this.formatDate(lift.lastMaintenance)}</td>
                    <td>${this.formatDate(lift.nextMaintenance)}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-primary btn-action" 
                                    data-toggle="modal" 
                                    data-target="#liftModal"
                                    data-lift-id="${lift.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-warning btn-action" onclick="liftManager.generateQR('${lift.id}')">
                                <i class="fas fa-qrcode"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-action" onclick="liftManager.deleteLift('${lift.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
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
        $('#modalTitle').text('Додати ліфт');
        $('#liftForm input, #liftForm select').removeClass('is-invalid');
    }

    fillForm(lift) {
        $('#liftId').val(lift.id);
        $('#liftModel').val(lift.model || '');
        $('#liftType').val(lift.type || '');
        $('#liftManufacturer').val(lift.manufacturer || '');
        $('#liftSerial').val(lift.serial || '');
        $('#liftStatus').val(lift.status || 'active');
        $('#liftInstallation').val(lift.installationDate || '');
        $('#liftLocation').val(lift.address || '');
        $('#liftPostal').val(lift.postalCode || '');
        $('#liftLat').val(lift.lat || '');
        $('#liftLng').val(lift.lng || '');
        $('#liftClient').val(lift.client || '');
        $('#liftClientPhone').val(lift.clientPhone || '');
        $('#lastMaintenance').val(lift.lastMaintenance || '');
        $('#nextMaintenance').val(lift.nextMaintenance || '');
        $('#maintenanceFrequency').val(lift.inspectionFrequency || 6);

        // Оновлення карти
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
        try {
            // Валідація обов'язкових полів
            const requiredFields = ['liftModel', 'liftType', 'liftManufacturer', 'liftSerial', 
                                  'liftLocation', 'liftClient', 'lastMaintenance', 'nextMaintenance'];
            let isValid = true;

            requiredFields.forEach(field => {
                const input = $('#' + field);
                if (!input.val()) {
                    input.addClass('is-invalid');
                    isValid = false;
                } else {
                    input.removeClass('is-invalid');
                }
            });

            if (!isValid) {
                showNotification('Заповніть всі обов\'язкові поля', 'error');
                return;
            }

            const liftId = $('#liftId').val();
            const lift = {
                id: liftId || generateUniqueId(),
                model: $('#liftModel').val(),
                type: $('#liftType').val(),
                manufacturer: $('#liftManufacturer').val(),
                serial: $('#liftSerial').val(),
                status: $('#liftStatus').val(),
                installationDate: $('#liftInstallation').val(),
                address: $('#liftLocation').val(),
                postalCode: $('#liftPostal').val(),
                lat: $('#liftLat').val() ? parseFloat($('#liftLat').val()) : null,
                lng: $('#liftLng').val() ? parseFloat($('#liftLng').val()) : null,
                client: $('#liftClient').val(),
                clientPhone: $('#liftClientPhone').val(),
                lastMaintenance: $('#lastMaintenance').val(),
                nextMaintenance: $('#nextMaintenance').val(),
                inspectionFrequency: $('#maintenanceFrequency').val() ? parseInt($('#maintenanceFrequency').val()) : 6,
                updatedAt: new Date().toISOString()
            };

            if (!liftId) {
                lift.createdAt = new Date().toISOString();
            }

            const existingIndex = allLifts.findIndex(l => l.id === lift.id);

            if (existingIndex >= 0) {
                allLifts[existingIndex] = { ...allLifts[existingIndex], ...lift };
            } else {
                allLifts.push(lift);
            }

            saveDataToLocalStorage();
            $('#liftModal').modal('hide');
            this.loadLifts();
            showNotification('Ліфт успішно збережено', 'success');

        } catch (error) {
            console.error('Error saving lift:', error);
            showNotification('Помилка збереження ліфта', 'error');
        }
    }

    editLift(id) {
        const lift = allLifts.find(l => l.id === id);
        if (lift) {
            this.fillForm(lift);
            $('#modalTitle').text('Редагувати ліфт');
        }
    }

    deleteLift(id) {
        if (confirm('Ви впевнені, що хочете видалити цей ліфт?')) {
            allLifts = allLifts.filter(lift => lift.id !== id);
            saveDataToLocalStorage();
            this.loadLifts();
            showNotification('Ліфт успішно видалено', 'success');
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
                    showNotification('Заповніть модель та серійний номер', 'error');
                    return;
                }
                lift = {
                    id: generateUniqueId(),
                    model: model,
                    serial: serial,
                    address: $('#liftLocation').val() || 'Нова адреса'
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

            $('#qrInfo').text(`Ліфт: ${lift.model} | Серійний: ${lift.serial}`);
            $('#qrModal').modal('show');

        } catch (error) {
            console.error('QR generation error:', error);
            showNotification('Помилка генерації QR коду', 'error');
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
                showNotification('QR код завантажено', 'success');
            }
        } catch (error) {
            console.error('QR download error:', error);
            showNotification('Помилка завантаження QR коду', 'error');
        }
    }

    exportToExcel() {
        try {
            if (typeof XLSX === 'undefined') {
                throw new Error('XLSX library not loaded');
            }

            const worksheet = XLSX.utils.json_to_sheet(allLifts.map(lift => ({
                'ID': lift.id,
                'Модель': lift.model,
                'Тип': this.getLiftTypeLabel(lift.type),
                'Адреса': lift.address,
                'Статус': this.getStatusLabel(lift.status),
                'Клієнт': lift.client,
                'Серійний номер': lift.serial,
                'Останнє ТО': this.formatDate(lift.lastMaintenance),
                'Наступне ТО': this.formatDate(lift.nextMaintenance),
                'Виробник': lift.manufacturer
            })));

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Ліфти');
            XLSX.writeFile(workbook, 'lifts_export.xlsx');
            showNotification('Дані експортовано в Excel', 'success');

        } catch (error) {
            console.error('Excel export error:', error);
            showNotification('Помилка експорту в Excel', 'error');
        }
    }

    getLiftTypeLabel(type) {
        const types = {
            'passenger': 'Пасажирський',
            'cargo': 'Вантажний',
            'hospital': 'Лікарняний'
        };
        return types[type] || type;
    }

    getStatusLabel(status) {
        const statuses = {
            'active': 'Активний',
            'maintenance': 'Обслуговування',
            'inactive': 'Неактивний'
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
}

// Ініціалізація при завантаженні
$(document).ready(function() {
    window.liftManager = new LiftManager();
});