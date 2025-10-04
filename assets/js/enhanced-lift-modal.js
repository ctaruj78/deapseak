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
        
        // Обробник зміни кількості ліфтів за адресою
        $(document).off('change', '#enhancedLiftsCountAtAddress').on('change', '#enhancedLiftsCountAtAddress', () => {
            this.handleLiftsCountChange();
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
        const postcode = $('#enhancedLiftPostcode').val().trim();
        
        if (!address) {
            this.showMessage('Введіть адресу для пошуку координат', 'warning');
            return;
        }

        const btn = $('#enhancedBtnGeocode');
        const originalHtml = btn.html();
        btn.html('<i class="fas fa-spinner fa-spin"></i>').prop('disabled', true);

        // Комбінуємо адресу з поштовим кодом для точнішого пошуку
        let searchQuery = address;
        if (postcode) {
            searchQuery += ', ' + postcode;
        }
        searchQuery += ', Ukraine'; // Додаємо країну для точності
        
        console.log('🔍 Geocoding query:', searchQuery);
        
        // Використовуємо Nominatim API для геокодування
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&countrycodes=ua`;
        
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
            postcode: $('#enhancedLiftPostcode').val() || '',
            liftsCountAtAddress: parseInt($('#enhancedLiftsCountAtAddress').val()) || 1,
            lat: parseFloat($('#enhancedLiftLat').val()) || null,
            lng: parseFloat($('#enhancedLiftLng').val()) || null,
            // Збираємо додаткові муніципальні номери якщо є
            additionalMunicipalNumbers: this.collectAdditionalMunicipalNumbers(),
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
        // Серійний номер НЕ обов'язковий, тому що багато старих ліфтів не мають шильдиків
        // Email клієнта та поштовий код - ОБОВ'ЯЗКОВІ для правильної роботи системи
        const required = ['municipalNumber', 'brand', 'model', 'address', 'postcode', 'clientEmail'];
        const missing = [];
        
        for (let field of required) {
            if (!data[field] || data[field].trim() === '') {
                missing.push(field);
                // Спеціальна обробка для різних назв полів
                if (field === 'postcode') {
                    $('#enhancedLiftPostcode').addClass('is-invalid');
                } else if (field === 'clientEmail') {
                    $('#enhancedClientEmail').addClass('is-invalid');
                } else {
                    $(`#enhanced${field.charAt(0).toUpperCase() + field.slice(1)}`).addClass('is-invalid');
                }
            } else {
                // Видаляємо is-invalid при правильному заповненні
                if (field === 'postcode') {
                    $('#enhancedLiftPostcode').removeClass('is-invalid');
                } else if (field === 'clientEmail') {
                    $('#enhancedClientEmail').removeClass('is-invalid');
                } else {
                    $(`#enhanced${field.charAt(0).toUpperCase() + field.slice(1)}`).removeClass('is-invalid');
                }
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
        
        // Валідація email формату
        if (data.clientEmail && data.clientEmail.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.clientEmail)) {
                $('#enhancedClientEmail').addClass('is-invalid');
                this.showMessage('Введіть коректний email клієнта (наприклад: osbb@example.com)', 'warning');
                return false;
            } else {
                $('#enhancedClientEmail').removeClass('is-invalid');
            }
        }
        
        // Валідація поштового коду (українські формати)
        if (data.postcode && data.postcode.trim()) {
            const postcodeRegex = /^[0-9]{5}$/;
            if (!postcodeRegex.test(data.postcode)) {
                $('#enhancedLiftPostcode').addClass('is-invalid');
                this.showMessage('Введіть коректний поштовий код (5 цифр, наприклад: 01001)', 'warning');
                return false;
            } else {
                $('#enhancedLiftPostcode').removeClass('is-invalid');
            }
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
            // Ініціалізуємо масив якщо потрібно
            if (typeof window.allLifts === 'undefined') {
                console.log('⚠️ window.allLifts not found, creating new array');
                window.allLifts = [];
            }
            
            // НОВА ЛОГІКА: Створюємо окремі записи для кожного ліфта
            const liftsToSave = this.createSeparateLifts(liftData);
            console.log('🏢 Creating separate lifts:', liftsToSave.length);
            
            let savedCount = 0;
            
            // Зберігаємо кожен ліфт окремо
            for (const lift of liftsToSave) {
                const existingIndex = window.allLifts.findIndex(l => l.id === lift.id);
                
                if (existingIndex !== -1) {
                    // Оновлюємо існуючий
                    window.allLifts[existingIndex] = { ...window.allLifts[existingIndex], ...lift };
                    console.log('✏️ Updated existing lift:', lift.municipalNumber);
                } else {
                    // Додаємо новий
                    window.allLifts.push(lift);
                    console.log('➕ Added new lift:', lift.municipalNumber);
                    savedCount++;
                }
            }
            
            // Синхронізуємо з глобальною змінною
            if (typeof allLifts !== 'undefined') {
                allLifts = [...window.allLifts];
                console.log('🔄 Synchronized global allLifts variable, total count:', allLifts.length);
            }
            
            // Зберігаємо в localStorage
            this.saveToStorage();
            
            // Успіх з кількістю збережених ліфтів
            const message = savedCount > 1 ? 
                `Успішно збережено ${savedCount} ліфтів з координатами!` :
                'Ліфт успішно збережено з координатами!';
            this.showMessage(message, 'success');
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
        $('#enhancedLiftPostcode').val(liftData.postcode || '');
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

    handleLiftsCountChange() {
        const count = parseInt($('#enhancedLiftsCountAtAddress').val()) || 1;
        console.log(`🏢 Lifts count changed to: ${count}`);
        
        // Видаляємо попередні додаткові поля
        $('#additionalLiftsContainer').remove();
        
        if (count > 1) {
            let additionalFields = '<div id="additionalLiftsContainer" class="mt-3"><h6 class="text-info">Муніципальні номери інших ліфтів за цією адресою:</h6>';
            
            for (let i = 2; i <= count; i++) {
                additionalFields += `
                    <div class="form-group">
                        <label for="additionalMunicipalNumber${i}">Муніципальний № ліфта ${i}:</label>
                        <input type="text" 
                               id="additionalMunicipalNumber${i}" 
                               name="additionalMunicipalNumber${i}"
                               class="form-control" 
                               placeholder="Муніципальний номер ліфта ${i}">
                        <small class="form-text text-muted">Цей номер допоможе ідентифікувати інші ліфти в тій же будівлі</small>
                    </div>
                `;
            }
            
            additionalFields += '</div>';
            
            // Додаємо поля після основного поля кількості
            $('#enhancedLiftsCountAtAddress').closest('.form-group').after(additionalFields);
        }
    }

    collectAdditionalMunicipalNumbers() {
        const count = parseInt($('#enhancedLiftsCountAtAddress').val()) || 1;
        const additionalNumbers = [];
        
        for (let i = 2; i <= count; i++) {
            const number = $(`#additionalMunicipalNumber${i}`).val();
            if (number && number.trim()) {
                additionalNumbers.push({
                    liftNumber: i,
                    municipalNumber: number.trim()
                });
            }
        }
        
        console.log('🔢 Additional municipal numbers collected:', additionalNumbers);
        return additionalNumbers;
    }

    createSeparateLifts(baseLiftData) {
        const lifts = [];
        
        // Головний ліфт (завжди створюємо)
        const mainLift = { ...baseLiftData };
        delete mainLift.additionalMunicipalNumbers; // Видаляємо додаткові номери з основного запису
        lifts.push(mainLift);
        
        // Створюємо додаткові ліфти якщо є
        if (baseLiftData.additionalMunicipalNumbers && baseLiftData.additionalMunicipalNumbers.length > 0) {
            for (const additionalInfo of baseLiftData.additionalMunicipalNumbers) {
                if (additionalInfo.municipalNumber && additionalInfo.municipalNumber.trim()) {
                    // Створюємо копію базових даних для додаткового ліфта
                    const additionalLift = { 
                        ...baseLiftData,
                        id: 'lift_' + Date.now() + '_' + additionalInfo.liftNumber, // Унікальний ID
                        municipalNumber: additionalInfo.municipalNumber.trim(),
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    
                    // Видаляємо additionalMunicipalNumbers з копії
                    delete additionalLift.additionalMunicipalNumbers;
                    
                    // Додаємо мітку що це додатковий ліфт
                    additionalLift.isAdditionalLift = true;
                    additionalLift.mainLiftId = mainLift.id;
                    additionalLift.liftNumberInBuilding = additionalInfo.liftNumber;
                    
                    lifts.push(additionalLift);
                    
                    console.log(`🏗️ Created additional lift #${additionalInfo.liftNumber}: ${additionalInfo.municipalNumber}`);
                }
            }
        }
        
        console.log(`📋 Total lifts to save: ${lifts.length} (1 main + ${lifts.length - 1} additional)`);
        return lifts;
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