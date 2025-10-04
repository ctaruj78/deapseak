// Enhanced Lift Modal with Map - Updated for new HTML structure
class EnhancedLiftModal {
    constructor() {
        this.currentLiftId = null;
        this.map = null;
        this.marker = null;
        this.currentCoords = null;
        this.init();
    }

    init() {
        console.log('🚀 Initializing Enhanced Lift Modal with Map...');
        this.initEventListeners();
        console.log('✅ Enhanced Lift Modal initialized');
    }

    initEventListeners() {
        console.log('🔧 Setting up enhanced event listeners...');
        
        // Основний обробник форми
        $(document).off('submit', '#enhancedLiftForm').on('submit', '#enhancedLiftForm', (e) => {
            console.log('🔥 Enhanced form submit triggered!');
            e.preventDefault();
            this.handleFormSubmit();
        });
        
        // Кнопка геокодування адреси
        $(document).off('click', '#enhancedBtnGeocode').on('click', '#enhancedBtnGeocode', () => {
            this.geocodeAddress();
        });
        
        // Кнопка поточної локації
        $(document).off('click', '#enhancedBtnCurrentLocation').on('click', '#enhancedBtnCurrentLocation', () => {
            this.getCurrentLocation();
        });
        
        // Оновлення карти при зміні координат
        $(document).off('input', '#enhancedLiftLat, #enhancedLiftLng').on('input', '#enhancedLiftLat, #enhancedLiftLng', () => {
            this.updateMapFromCoords();
        });
        
        // Скидання форми при відкритті модалки
        $('#enhancedLiftModal').on('show.bs.modal', () => {
            console.log('📝 Enhanced modal opening, resetting form...');
            this.resetForm();
            setTimeout(() => this.initializeMap(), 500);
        });
        
        // Оновлення розміру карти коли вкладка стає активною
        $('a[data-toggle="tab"]').on('shown.bs.tab', (e) => {
            if ($(e.target).attr('href') === '#location-info' && this.map) {
                setTimeout(() => this.map.invalidateSize(), 100);
            }
        });
        
        console.log('✅ Enhanced event listeners set up');
    }

    initializeMap() {
        if (typeof L === 'undefined') {
            console.log('⚠️ Leaflet not loaded, skipping map initialization');
            return;
        }
        
        const mapContainer = document.getElementById('enhancedLiftMap');
        if (!mapContainer) {
            console.log('⚠️ Enhanced map container not found');
            return;
        }

        try {
            // Видаляємо попередню карту якщо існує
            if (this.map) {
                this.map.remove();
                this.map = null;
            }

            // Ініціалізуємо карту
            this.map = L.map('enhancedLiftMap').setView([50.4501, 30.5234], 10); // Київ по дефолту
            
            // Додаємо тайли OpenStreetMap
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);

            // Обробник кліків по карті
            this.map.on('click', (e) => {
                this.setCoordinates(e.latlng.lat, e.latlng.lng);
            });

            console.log('✅ Enhanced map initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing enhanced map:', error);
        }
    }

    setCoordinates(lat, lng) {
        console.log(`📍 Setting enhanced coordinates: ${lat}, ${lng}`);
        
        // Оновлюємо поля форми з префіксом enhanced
        $('#enhancedLiftLat').val(lat.toFixed(6));
        $('#enhancedLiftLng').val(lng.toFixed(6));
        
        // Оновлюємо маркер на карті
        this.updateMapMarker(lat, lng);
        
        this.currentCoords = { lat, lng };
    }

    updateMapMarker(lat, lng) {
        if (!this.map) return;
        
        try {
            // Видаляємо попередній маркер
            if (this.marker) {
                this.map.removeLayer(this.marker);
            }
            
            // Додаємо новий маркер
            this.marker = L.marker([lat, lng])
                .addTo(this.map)
                .bindPopup('Розташування ліфта');
            
            // Центруємо карту на маркері
            this.map.setView([lat, lng], Math.max(this.map.getZoom(), 15));
            
            console.log('✅ Enhanced map marker updated');
        } catch (error) {
            console.error('❌ Error updating enhanced map marker:', error);
        }
    }

    updateMapFromCoords() {
        const lat = parseFloat($('#enhancedLiftLat').val());
        const lng = parseFloat($('#enhancedLiftLng').val());
        
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            this.updateMapMarker(lat, lng);
            this.currentCoords = { lat, lng };
        }
    }

    getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showMessage('Геолокація не підтримується вашим браузером', 'warning');
            return;
        }

        const btn = $('#enhancedBtnCurrentLocation');
        const originalHtml = btn.html();
        btn.html('<i class="fas fa-spinner fa-spin"></i> Отримання...').prop('disabled', true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                this.setCoordinates(latitude, longitude);
                this.showMessage('Координати успішно отримані!', 'success');
                btn.html(originalHtml).prop('disabled', false);
            },
            (error) => {
                console.error('Enhanced geolocation error:', error);
                this.showMessage('Не вдалось отримати координати: ' + error.message, 'error');
                btn.html(originalHtml).prop('disabled', false);
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    }

    geocodeAddress() {
        const address = $('#enhancedLiftAddress').val().trim();
        if (!address) {
            this.showMessage('Введіть адресу для пошуку координат', 'warning');
            return;
        }

        const btn = $('#enhancedBtnGeocode');
        const originalHtml = btn.html();
        btn.html('<i class="fas fa-spinner fa-spin"></i>').prop('disabled', true);

        // Використовуємо Nominatim API для геокодування
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lng = parseFloat(data[0].lon);
                    this.setCoordinates(lat, lng);
                    this.showMessage('Координати знайдені за адресою!', 'success');
                } else {
                    this.showMessage('Не вдалось знайти координати за цією адресою', 'warning');
                }
                btn.html(originalHtml).prop('disabled', false);
            })
            .catch(error => {
                console.error('Enhanced geocoding error:', error);
                this.showMessage('Помилка при пошуку координат: ' + error.message, 'error');
                btn.html(originalHtml).prop('disabled', false);
            });
    }

    handleFormSubmit() {
        console.log('📋 Processing enhanced form submission...');
        
        try {
            // Збираємо дані з форми (використовуємо enhanced префікси)
            const formData = this.collectFormData();
            console.log('📄 Enhanced form data collected:', formData);
            
            // Валідація
            if (!this.validateBasicFields(formData)) {
                return;
            }
            
            // Додаткова валідація для координат
            if (!this.validateCoordinates(formData)) {
                return;
            }
            
            console.log('✅ Enhanced validation passed');
            
            // Зберігаємо ліфт
            this.saveLift(formData);
            
        } catch (error) {
            console.error('❌ Error in enhanced form submission:', error);
            this.showMessage('Помилка обробки форми: ' + error.message, 'error');
        }
    }

    collectFormData() {
        // Збираємо дані з полів з префіксом enhanced
        const data = {
            id: $('#enhancedLiftId').val() || 'lift_' + Date.now(),
            municipalNumber: $('#enhancedMunicipalNumber').val() || '',
            serialNumber: $('#enhancedSerialNumber').val() || '',
            brand: $('#enhancedLiftBrand').val() || '',
            model: $('#enhancedLiftModel').val() || '',
            type: $('#enhancedLiftType').val() || 'passenger',
            capacity: parseInt($('#enhancedLiftCapacity').val()) || 8,
            speed: parseFloat($('#enhancedLiftSpeed').val()) || 1.0,
            installationYear: parseInt($('#enhancedInstallationYear').val()) || new Date().getFullYear(),
            address: $('#enhancedLiftAddress').val() || '',
            liftsCountAtAddress: parseInt($('#enhancedLiftsCountAtAddress').val()) || 1,
            lat: parseFloat($('#enhancedLiftLat').val()) || null,
            lng: parseFloat($('#enhancedLiftLng').val()) || null,
            clientName: $('#enhancedClientName').val() || 'Невказано',
            clientEmail: $('#enhancedClientEmail').val() || '',
            clientPhone: $('#enhancedClientPhone').val() || '',
            contactPerson: $('#enhancedContactPerson').val() || '',
            tech: $('#enhancedAssignedTechnician').val() || 'auto',
            status: $('#enhancedLiftStatus').val() || 'operational',
            // Додаткові поля за замовчуванням
            floorsCount: 5,
            doorsCount: 2,
            postcode: '',
            buildingName: '',
            floorLocation: 'ground',
            accessCode: '',
            lastInspection: null,
            nextInspection: null,
            inspectionFrequency: 6,
            maintenanceNotes: '',
            qrAccessLevel: 'public',
            enableQrTracking: false,
            interventionHistory: [],
            photos: [],
            inspectionHistory: [],
            chat: [],
            createdAt: $('#enhancedLiftId').val() ? undefined : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        return data;
    }

    validateBasicFields(data) {
        const required = ['municipalNumber', 'serialNumber', 'brand', 'model', 'address'];
        const missing = [];
        
        for (let field of required) {
            if (!data[field] || data[field].trim() === '') {
                missing.push(field);
                $(`#enhanced${field.charAt(0).toUpperCase() + field.slice(1)}`).addClass('is-invalid');
            } else {
                $(`#enhanced${field.charAt(0).toUpperCase() + field.slice(1)}`).removeClass('is-invalid');
            }
        }
        
        // Спеціальна обробка для окремих полів
        if (!data.municipalNumber || data.municipalNumber.trim() === '') {
            $('#enhancedMunicipalNumber').addClass('is-invalid');
        } else {
            $('#enhancedMunicipalNumber').removeClass('is-invalid');
        }
        
        if (!data.address || data.address.trim() === '') {
            $('#enhancedLiftAddress').addClass('is-invalid');
        } else {
            $('#enhancedLiftAddress').removeClass('is-invalid');
        }
        
        if (missing.length > 0) {
            console.log('❌ Missing required fields:', missing);
            this.showMessage('Заповніть обов\'язкові поля: ' + missing.join(', '), 'warning');
            return false;
        }
        
        return true;
    }

    validateCoordinates(data) {
        if (!data.lat || !data.lng) {
            this.showMessage('Вкажіть координати ліфта на карті або введіть їх вручну', 'warning');
            $('#enhancedLiftLat, #enhancedLiftLng').addClass('is-invalid');
            return false;
        }
        
        if (data.lat < -90 || data.lat > 90 || data.lng < -180 || data.lng > 180) {
            this.showMessage('Некоректні координати. Перевірте широту (-90 до 90) та довготу (-180 до 180)', 'warning');
            $('#enhancedLiftLat, #enhancedLiftLng').addClass('is-invalid');
            return false;
        }
        
        $('#enhancedLiftLat, #enhancedLiftLng').removeClass('is-invalid');
        return true;
    }

    saveLift(liftData) {
        console.log('💾 Saving enhanced lift data...');
        
        try {
            // Використовуємо ту ж логіку що і в SimpleLiftModal
            if (typeof window.allLifts === 'undefined') {
                console.log('⚠️ window.allLifts not found, creating new array');
                window.allLifts = [];
            }
            
            const existingIndex = window.allLifts.findIndex(l => l.id === liftData.id);
            console.log('📊 Current lifts count:', window.allLifts.length);
            console.log('🔍 Checking for existing lift with ID:', liftData.id, 'Found at index:', existingIndex);
            
            if (existingIndex !== -1) {
                window.allLifts[existingIndex] = { ...window.allLifts[existingIndex], ...liftData };
                console.log('✏️ Updated existing lift at index:', existingIndex);
            } else {
                window.allLifts.push(liftData);
                console.log('➕ Added new lift. Total count now:', window.allLifts.length);
            }
            
            // Синхронізуємо з глобальною змінною
            if (typeof allLifts !== 'undefined') {
                allLifts = [...window.allLifts];
                console.log('🔄 Synchronized global allLifts variable, count:', allLifts.length);
            }
            
            // Зберігаємо в localStorage
            this.saveToStorage();
            
            // Успіх
            this.showMessage('Ліфт успішно збережено з координатами!', 'success');
            $('#enhancedLiftModal').modal('hide');
            
            // Оновлюємо таблицю
            this.refreshTable();
            
        } catch (error) {
            console.error('❌ Error saving enhanced lift:', error);
            this.showMessage('Помилка збереження: ' + error.message, 'error');
        }
    }

    saveToStorage() {
        try {
            // Використовуємо CommonUtils якщо є
            if (typeof CommonUtils !== 'undefined' && CommonUtils.saveLifts) {
                const saved = CommonUtils.saveLifts(window.allLifts);
                console.log('💾 CommonUtils.saveLifts result:', saved);
                if (!saved) {
                    throw new Error('CommonUtils.saveLifts failed');
                }
            } else {
                localStorage.setItem('lifts', JSON.stringify(window.allLifts));
                console.log('💾 Direct localStorage save completed');
            }
            
            const stored = localStorage.getItem('lifts');
            if (stored) {
                const parsed = JSON.parse(stored);
                console.log('✅ Verification: localStorage contains', parsed.length, 'lifts');
            }
            
        } catch (error) {
            console.error('❌ Storage save error:', error);
            throw error;
        }
    }

    refreshTable() {
        console.log('🔄 Refreshing table after enhanced save...');
        
        if (typeof window.liftManager !== 'undefined' && window.liftManager.loadLifts) {
            setTimeout(() => {
                window.liftManager.loadLifts();
                console.log('✅ liftManager.loadLifts() called from enhanced modal');
            }, 200);
        } else if (typeof window.simpleLiftModal !== 'undefined') {
            window.simpleLiftModal.manualRefreshTable();
            console.log('✅ Used simpleLiftModal.manualRefreshTable()');
        } else {
            console.log('⚠️ No table refresh method available');
        }
    }

    resetForm() {
        console.log('🔄 Resetting enhanced form...');
        $('#enhancedLiftForm')[0].reset();
        $('#enhancedLiftId').val('');
        $('.is-invalid').removeClass('is-invalid');
        $('.invalid-feedback').remove();
        $('#enhancedModalTitle').text('Додати ліфт з картою');
        
        // Скидаємо координати
        this.currentCoords = null;
        if (this.marker && this.map) {
            this.map.removeLayer(this.marker);
            this.marker = null;
        }
        
        // Переходимо на першу вкладку
        $('#basic-tab').click();
    }

    loadLiftForEdit(liftData) {
        console.log('📝 Loading lift for enhanced edit:', liftData);
        
        // Заповнюємо всі поля з префіксом enhanced
        $('#enhancedLiftId').val(liftData.id);
        $('#enhancedMunicipalNumber').val(liftData.municipalNumber || '');
        $('#enhancedSerialNumber').val(liftData.serial || liftData.serialNumber || '');
        $('#enhancedLiftBrand').val(liftData.brand || '');
        $('#enhancedLiftModel').val(liftData.model || '');
        $('#enhancedLiftType').val(liftData.type || 'passenger');
        $('#enhancedLiftCapacity').val(liftData.capacity || '');
        $('#enhancedLiftSpeed').val(liftData.speed || '');
        $('#enhancedInstallationYear').val(liftData.installationYear || '');
        $('#enhancedLiftAddress').val(liftData.address || '');
        $('#enhancedLiftsCountAtAddress').val(liftData.liftsCountAtAddress || 1);
        $('#enhancedLiftLat').val(liftData.lat || '');
        $('#enhancedLiftLng').val(liftData.lng || '');
        $('#enhancedClientName').val(liftData.clientName || '');
        $('#enhancedClientEmail').val(liftData.clientEmail || '');
        $('#enhancedClientPhone').val(liftData.clientPhone || '');
        $('#enhancedContactPerson').val(liftData.contactPerson || '');
        $('#enhancedAssignedTechnician').val(liftData.tech || '');
        $('#enhancedLiftStatus').val(liftData.status || '');
        
        // Оновлюємо карту з координатами ліфта
        if (liftData.lat && liftData.lng) {
            setTimeout(() => {
                this.setCoordinates(liftData.lat, liftData.lng);
            }, 500);
        }
        
        this.currentLiftId = liftData.id;
        $('#enhancedModalTitle').text('Редагувати ліфт (з картою)');
        console.log('✅ Enhanced lift data loaded for editing');
    }

    showMessage(message, type = 'info') {
        const alertClass = type === 'error' ? 'danger' : type;
        const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
        
        $('.enhanced-modal-alert').remove();
        
        const alertHtml = `
            <div class="alert alert-${alertClass} alert-dismissible fade show enhanced-modal-alert" role="alert">
                <i class="fas fa-${icon}"></i> ${message}
                <button type="button" class="close" data-dismiss="alert">
                    <span>&times;</span>
                </button>
            </div>
        `;
        
        $('#enhancedLiftForm').prepend(alertHtml);
        
        setTimeout(() => {
            $('.enhanced-modal-alert').fadeOut();
        }, 5000);
        
        console.log(`📢 Enhanced message shown: ${message}`);
    }
}

// Глобальна ініціалізація
$(document).ready(function() {
    // Перевіряємо чи завантажений Leaflet
    if (typeof L !== 'undefined') {
        console.log('📱 Initializing Enhanced Lift Modal with Leaflet...');
        window.enhancedLiftModal = new EnhancedLiftModal();
        console.log('✅ Enhanced Lift Modal ready');
    } else {
        console.log('⚠️ Leaflet not available, will try to initialize later...');
        // Чекаємо завантаження Leaflet
        setTimeout(() => {
            if (typeof L !== 'undefined') {
                console.log('📱 Leaflet loaded, initializing Enhanced Lift Modal...');
                window.enhancedLiftModal = new EnhancedLiftModal();
                console.log('✅ Enhanced Lift Modal ready (delayed)');
            } else {
                console.log('❌ Leaflet still not available, enhanced modal disabled');
            }
        }, 1000);
    }
});