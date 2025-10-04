// Enhanced Lift Modal with Map - Updated for new HTML structure
class EnhancedLiftModal {
    constructor() {
        this.currentLiftId = null;
        this.map = null;
        this.marker = null;
        this.currentCoords = null;
        this.detectedCountry = null; // Для автоматичної детекції країни за поштовим кодом
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
        
        // Обробник кнопки додавання звіту інспекції
        $(document).off('click', '#addInspectionReportBtn').on('click', '#addInspectionReportBtn', () => {
            this.openInspectionReportModal();
        });
        
        console.log('✅ Enhanced event listeners set up');
    }

    initializeMap() {
        console.log('🗺️ Attempting to initialize map...');
        
        if (typeof L === 'undefined') {
            console.log('⚠️ Leaflet not loaded, skipping map initialization');
            return;
        }
        
        const mapContainer = document.getElementById('enhancedLiftMap');
        if (!mapContainer) {
            console.log('⚠️ Enhanced map container not found');
            return;
        }
        
        console.log('✅ Map container found, Leaflet loaded');

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
        
        // Визначаємо країну та код країни за форматом поштового коду
        let country = 'Ukraine';
        let countryCode = 'ua';
        
        if (postcode) {
            const ukrainianRegex = /^[0-9]{5}$/;
            const portugueseRegex = /^[0-9]{4}-[0-9]{3}$/;
            
            if (portugueseRegex.test(postcode)) {
                country = 'Portugal';
                countryCode = 'pt';
            } else if (ukrainianRegex.test(postcode)) {
                country = 'Ukraine';
                countryCode = 'ua';
            }
        }
        
        // Використовуємо раніше визначену країну якщо є
        if (this.detectedCountry) {
            if (this.detectedCountry === 'Portugal') {
                country = 'Portugal';
                countryCode = 'pt';
            } else if (this.detectedCountry === 'Ukraine') {
                country = 'Ukraine';
                countryCode = 'ua';
            }
        }
        
        searchQuery += ', ' + country;
        
        console.log('🔍 Geocoding query:', searchQuery);
        console.log('🌍 Target country:', country, 'Code:', countryCode);
        
        // Використовуємо Nominatim API для геокодування
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&countrycodes=${countryCode}`;
        
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
            // Технічні інспекції
            lastInspection: $('#enhancedLastInspection').val() || null,
            nextInspection: $('#enhancedNextInspection').val() || null,
            inspectionFrequency: parseInt($('#enhancedInspectionFrequency').val()) || 6,
            maintenanceNotes: $('#enhancedMaintenanceNotes').val() || '',
            // Додаткові поля за замовчуванням
            floorsCount: 5,
            doorsCount: 2,
            buildingName: '',
            floorLocation: 'ground',
            accessCode: '',
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
        // Серійний номер та поштовий код НЕ обов'язкові
        // Email клієнта - ОБОВ'ЯЗКОВИЙ для правильної роботи системи
        const required = ['municipalNumber', 'brand', 'model', 'address', 'clientEmail'];
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
        
        // Валідація поштового коду (гнучка для різних форматів)
        if (data.postcode && data.postcode.trim()) {
            const ukrainianRegex = /^[0-9]{5}$/; // 01001
            const portugueseRegex = /^[0-9]{4}-[0-9]{3}$/; // 1234-567
            const generalRegex = /^[a-zA-Z0-9\s\-]{3,10}$/; // Загальний формат для інших країн
            
            if (ukrainianRegex.test(data.postcode) || portugueseRegex.test(data.postcode) || generalRegex.test(data.postcode)) {
                $('#enhancedLiftPostcode').removeClass('is-invalid');
                
                // Визначаємо країну за форматом для покращення геокодування
                if (ukrainianRegex.test(data.postcode)) {
                    this.detectedCountry = 'Ukraine';
                } else if (portugueseRegex.test(data.postcode)) {
                    this.detectedCountry = 'Portugal';
                } else {
                    this.detectedCountry = null; // Загальний пошук без країни
                }
                console.log('🌍 Detected country by postcode format:', this.detectedCountry || 'general');
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
        // Поля інспекцій
        $('#enhancedLastInspection').val(liftData.lastInspection || '');
        $('#enhancedNextInspection').val(liftData.nextInspection || '');
        $('#enhancedInspectionFrequency').val(liftData.inspectionFrequency || 6);
        $('#enhancedMaintenanceNotes').val(liftData.maintenanceNotes || '');
        
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
        
        // Очищуємо контейнер додаткових ліфтів
        $('#additionalLiftsFields').empty();
        
        if (count > 1) {
            // Показуємо контейнер
            $('#additionalLiftsContainer').removeClass('d-none');
            
            // Генеруємо поля для додаткових ліфтів
            for (let i = 2; i <= count; i++) {
                const liftRow = `
                    <div class="row mb-3">
                        <div class="col-md-5">
                            <div class="form-group">
                                <label for="additionalMunicipalNumber${i}">
                                    <i class="fas fa-elevator text-info"></i> 
                                    Муніципальний № ліфта ${i} *
                                </label>
                                <input type="text" 
                                       id="additionalMunicipalNumber${i}" 
                                       name="additionalMunicipalNumber${i}"
                                       class="form-control" 
                                       required
                                       placeholder="Муніципальний номер ліфта ${i}">
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="form-group">
                                <label>&nbsp;</label>
                                <div class="d-block">
                                    <button type="button" class="btn btn-outline-primary btn-sm btn-block" 
                                            onclick="window.enhancedLiftModal.generateQRCode('additionalMunicipalNumber${i}', ${i})">
                                        <i class="fas fa-qrcode"></i> Генерувати QR-код
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="form-group">
                                <label>&nbsp;</label>
                                <div id="qrPreview${i}" class="qr-preview-mini d-none">
                                    <!-- QR код буде тут -->
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                $('#additionalLiftsFields').append(liftRow);
            }
        } else {
            // Ховаємо контейнер
            $('#additionalLiftsContainer').addClass('d-none');
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

    // Генерація QR-коду для ліфта
    generateQRCode(inputId, liftNumber = 1) {
        const municipalNumber = $(`#${inputId}`).val();
        
        if (!municipalNumber || !municipalNumber.trim()) {
            this.showMessage('Будь ласка, введіть муніципальний номер ліфта', 'error');
            return;
        }
        
        // Отримуємо адресу для QR-коду
        const address = $('#enhancedLiftAddress').val() || 'Адреса не вказана';
        
        // Створюємо дані для QR-коду
        const qrData = {
            municipalNumber: municipalNumber.trim(),
            address: address,
            liftNumber: liftNumber,
            createdAt: new Date().toISOString(),
            accessUrl: `${window.location.origin}/lift-access.html?id=${municipalNumber.trim()}`
        };
        
        const qrText = JSON.stringify(qrData);
        const previewContainer = liftNumber === 1 ? '#mainQrPreview' : `#qrPreview${liftNumber}`;
        
        // Очищуємо попередній QR-код
        $(previewContainer).empty().removeClass('d-none');
        
        // Генеруємо QR-код
        QRCode.toCanvas(qrText, {
            width: 120,
            height: 120,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        }, (err, canvas) => {
            if (err) {
                console.error('❌ Error generating QR code:', err);
                this.showMessage('Помилка створення QR-коду', 'error');
                return;
            }
            
            // Додаємо canvas до контейнера
            $(previewContainer).html(canvas);
            
            // Додаємо кнопки для дій з QR-кодом
            const actionsHtml = `
                <div class="mt-2">
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-success btn-sm" 
                                onclick="window.enhancedLiftModal.downloadQRCode('${inputId}', ${liftNumber})">
                            <i class="fas fa-download"></i> PNG
                        </button>
                        <button type="button" class="btn btn-outline-primary btn-sm" 
                                onclick="window.enhancedLiftModal.printQRCode('${inputId}', ${liftNumber})">
                            <i class="fas fa-print"></i> Друк
                        </button>
                    </div>
                </div>
            `;
            $(previewContainer).append(actionsHtml);
            
            console.log(`✅ QR code generated for lift #${liftNumber}: ${municipalNumber}`);
            this.showMessage(`QR-код створено для ліфта №${liftNumber}`, 'success');
        });
    }

    // Завантаження QR-коду як PNG
    downloadQRCode(inputId, liftNumber = 1) {
        const municipalNumber = $(`#${inputId}`).val().trim();
        const previewContainer = liftNumber === 1 ? '#mainQrPreview' : `#qrPreview${liftNumber}`;
        const canvas = $(previewContainer).find('canvas')[0];
        
        if (!canvas) {
            this.showMessage('Спочатку згенеруйте QR-код', 'error');
            return;
        }
        
        // Створюємо посилання для завантаження
        const link = document.createElement('a');
        link.download = `QR-lift-${municipalNumber}-${liftNumber}.png`;
        link.href = canvas.toDataURL();
        link.click();
        
        this.showMessage('QR-код завантажено', 'success');
    }

    // Друк QR-коду
    printQRCode(inputId, liftNumber = 1) {
        const municipalNumber = $(`#${inputId}`).val().trim();
        const address = $('#enhancedLiftAddress').val() || 'Адреса не вказана';
        const previewContainer = liftNumber === 1 ? '#mainQrPreview' : `#qrPreview${liftNumber}`;
        const canvas = $(previewContainer).find('canvas')[0];
        
        if (!canvas) {
            this.showMessage('Спочатку згенеруйте QR-код', 'error');
            return;
        }
        
        // Створюємо нове вікно для друку
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>QR-код ліфта ${municipalNumber}</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                    .qr-container { margin: 20px 0; }
                    .info { margin: 10px 0; font-size: 14px; }
                    .municipal { font-size: 18px; font-weight: bold; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <h2>QR-код доступу до ліфта</h2>
                <div class="info municipal">Муніципальний номер: ${municipalNumber}</div>
                <div class="info">Ліфт №${liftNumber}</div>
                <div class="info">Адреса: ${address}</div>
                <div class="qr-container">
                    <img src="${canvas.toDataURL()}" alt="QR код ліфта">
                </div>
                <div class="info">Створено: ${new Date().toLocaleString('uk-UA')}</div>
            </body>
            </html>
        `);
        printWindow.document.close();
        
        // Автоматично відкриваємо діалог друку
        printWindow.onload = () => {
            printWindow.print();
        };
        
        this.showMessage('Відправлено на друк', 'success');
    }

    // Функція для відкриття модального вікна звіту інспекції
    openInspectionReportModal() {
        const municipalNumber = $('#enhancedMunicipalNumber').val() || 'Новий ліфт';
        
        const modalHtml = `
            <div class="modal fade" id="inspectionReportModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-clipboard-check"></i> Звіт інспекції - ${municipalNumber}
                            </h5>
                            <button type="button" class="close" data-dismiss="modal">
                                <span>&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <form id="inspectionReportForm">
                                <div class="row">
                                    <div class="col-md-4">
                                        <div class="form-group">
                                            <label for="inspectionDate">Дата інспекції *</label>
                                            <input type="date" id="inspectionDate" class="form-control" required value="${new Date().toISOString().split('T')[0]}">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-group">
                                            <label for="inspectionType">Тип інспекції *</label>
                                            <select id="inspectionType" class="form-control" required>
                                                <option value="">Оберіть тип...</option>
                                                <option value="routine">Планова</option>
                                                <option value="maintenance">Технічне обслуговування</option>
                                                <option value="repair">Після ремонту</option>
                                                <option value="emergency">Аварійна</option>
                                                <option value="annual">Річна</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-group">
                                            <label for="inspectionResult">Результат *</label>
                                            <select id="inspectionResult" class="form-control" required>
                                                <option value="">Оберіть результат...</option>
                                                <option value="passed">Пройшов</option>
                                                <option value="minor_issues">Незначні зауваження</option>
                                                <option value="major_issues">Серйозні проблеми</option>
                                                <option value="failed">Не пройшов</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label for="inspectorName">Інспектор</label>
                                            <input type="text" id="inspectorName" class="form-control" placeholder="Ім'я інспектора">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label for="nextInspectionDate">Наступна інспекція</label>
                                            <input type="date" id="nextInspectionDate" class="form-control">
                                        </div>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="inspectionNotes">Деталі та зауваження</label>
                                    <textarea id="inspectionNotes" class="form-control" rows="4" placeholder="Детальний опис результатів інспекції, виявлених проблем, виконаних робіт..."></textarea>
                                </div>
                                <div class="form-group">
                                    <label for="recommendedActions">Рекомендовані дії</label>
                                    <textarea id="recommendedActions" class="form-control" rows="3" placeholder="Рекомендації щодо подальшого обслуговування, ремонту тощо..."></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Скасувати</button>
                            <button type="button" class="btn btn-success" onclick="window.enhancedLiftModal.saveInspectionReport()">
                                <i class="fas fa-save"></i> Зберегти звіт
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Видаляємо попередні модалки та додаємо нову
        $('#inspectionReportModal').remove();
        $('body').append(modalHtml);
        $('#inspectionReportModal').modal('show');
    }

    // Збереження звіту інспекції
    saveInspectionReport() {
        const inspectionDate = $('#inspectionDate').val();
        const inspectionType = $('#inspectionType').val();
        const inspectionResult = $('#inspectionResult').val();
        const inspectorName = $('#inspectorName').val();
        const nextInspectionDate = $('#nextInspectionDate').val();
        const inspectionNotes = $('#inspectionNotes').val();
        const recommendedActions = $('#recommendedActions').val();
        
        if (!inspectionDate || !inspectionType || !inspectionResult) {
            this.showMessage('Заповніть всі обов\'язкові поля', 'warning');
            return;
        }
        
        const report = {
            id: 'inspection_' + Date.now(),
            date: inspectionDate,
            type: inspectionType,
            result: inspectionResult,
            inspector: inspectorName || 'Невказано',
            nextInspectionDate: nextInspectionDate,
            notes: inspectionNotes,
            recommendedActions: recommendedActions,
            createdAt: new Date().toISOString()
        };
        
        // Оновлюємо поля форми
        if (nextInspectionDate) {
            $('#enhancedNextInspection').val(nextInspectionDate);
        }
        $('#enhancedLastInspection').val(inspectionDate);
        
        // Додаємо до нотаток
        const currentNotes = $('#enhancedMaintenanceNotes').val();
        const newNote = `[${inspectionDate}] ${this.getInspectionTypeText(inspectionType)} - ${this.getInspectionResultText(inspectionResult)}`;
        const updatedNotes = currentNotes ? currentNotes + '\n' + newNote : newNote;
        $('#enhancedMaintenanceNotes').val(updatedNotes);
        
        $('#inspectionReportModal').modal('hide');
        this.showMessage('Звіт інспекції додано успішно!', 'success');
        
        console.log('✅ Inspection report saved:', report);
    }
    
    getInspectionTypeText(type) {
        switch (type) {
            case 'routine': return 'Планова інспекція';
            case 'maintenance': return 'ТО';
            case 'repair': return 'Після ремонту';
            case 'emergency': return 'Аварійна перевірка';
            case 'annual': return 'Річна інспекція';
            default: return 'Інспекція';
        }
    }
    
    getInspectionResultText(result) {
        switch (result) {
            case 'passed': return 'Пройшов';
            case 'minor_issues': return 'Незначні зауваження';
            case 'major_issues': return 'Серйозні проблеми';
            case 'failed': return 'Не пройшов';
            default: return 'Результат невизначений';
        }
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