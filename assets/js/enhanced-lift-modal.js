// Enhanced Lift Modal with Map - Updated for new HTML structure
class EnhancedLiftModal {
    constructor() {
        this.currentLiftId = null;
        this.map = null;
        this.marker = null;
        this.currentCoords = null;
        this.detectedCountry = null; // Для автоматичної детекції країни за поштовим кодом
        this.editAddress = {}; // Зберігає city/country при редагуванні (не відображаються в полях)
        this.editMunicipalNumber = ''; // Зберігає municipalNumber при редагуванні (DOM може бути перебудований)
        this.coordsManuallyEdited = false; // true тільки коли користувач або geocode явно встановив координати
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
        
        // Atualização карти при зміні координат (вручну)
        $(document).off('input', '#enhancedLiftLat, #enhancedLiftLng').on('input', '#enhancedLiftLat, #enhancedLiftLng', () => {
            this.coordsManuallyEdited = true;
            this.updateMapFromCoords();
        });
        
        // Скидання форми при відкритті модалки (тільки для нових ліфтів)
        $('#enhancedLiftModal').off('show.bs.modal.enhanced').on('show.bs.modal.enhanced', () => {
            console.log('📝 Enhanced modal opening...');
            console.log('🔍 Current lift ID:', this.currentLiftId);
            console.log('🔍 Municipal number field:', $('#enhancedMunicipalNumber').val());
            
            // Скидаємо форму тільки якщо це не режим редагування
            if (!this.currentLiftId) {
                console.log('➕ CREATE MODE: Resetting form for new lift...');
                this.resetForm();
                // Показуємо QR-генератор відразу
                this.handleLiftsCountChange();
            } else {
                console.log('✏️ EDIT MODE: Keeping existing data, currentLiftId =', this.currentLiftId);
                console.log('✅ Data should be already loaded by loadLiftForEdit()');
            }
            setTimeout(() => this.initializeMap(), 500);
        });
        
        // Atualização розміру карти коли вкладка стає активною
        $('a[data-toggle="tab"]').on('shown.bs.tab', (e) => {
            if ($(e.target).attr('href') === '#location-info' && this.map) {
                setTimeout(() => this.map.invalidateSize(), 100);
            }
        });
        
        // Обробник зміни кількості ліфтів за адресою
        $(document).off('change', '#enhancedLiftsCountAtAddress').on('change', '#enhancedLiftsCountAtAddress', () => {
            this.handleLiftsCountChange();
        });

        // Автозаповнення клієнта по email (тільки для нового ліфта)
        $(document).off('blur', '#enhancedClientEmail').on('blur', '#enhancedClientEmail', () => {
            if (!this.currentLiftId) {
                this.lookupClientByEmail();
            }
        });
        
        console.log('✅ Enhanced event listeners set up');
    }

    async lookupClientByEmail() {
        const email = $('#enhancedClientEmail').val().trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

        // Якщо ім'я вже заповнено — не перезаписувати
        if ($('#enhancedClientName').val().trim()) return;

        try {
            const token = localStorage.getItem('liftmanager_jwt') || localStorage.getItem('authToken') || localStorage.getItem('token');
            const resp = await fetch(`/api/users/by-email?email=${encodeURIComponent(email)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!resp.ok) return;
            const result = await resp.json();
            const user = result.data || result.user || result;
            if (!user || !user.email) return;

            const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
            if (fullName) $('#enhancedClientName').val(fullName);
            if (user.phone) $('#enhancedClientPhone').val(user.phone);

            // Маленька підказка
            const hint = $('<small class="text-success client-lookup-hint"><i class="fas fa-check-circle mr-1"></i>Clienteа знайдено: ' + (fullName || email) + '</small>');
            $('#enhancedClientEmail').closest('.form-group').find('.client-lookup-hint').remove();
            $('#enhancedClientEmail').closest('.form-group').append(hint);
            setTimeout(() => hint.fadeOut(() => hint.remove()), 3000);
        } catch (e) {
            // тихо ігноруємо
        }
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

            // Очищаємо Leaflet-стан з DOM-контейнера, якщо залишився після remove()
            if (mapContainer._leaflet_id) {
                delete mapContainer._leaflet_id;
            }

            // Ініціалізуємо карту
            this.map = L.map('enhancedLiftMap').setView([38.7223, -9.1393], 12); // Lisboa по дефолту
            
            // Додаємо тайли OpenStreetMap
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
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
        
        // Позначаємо що координати встановлені явно (geocode або геолокація)
        this.coordsManuallyEdited = true;
        
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
                .bindPopup('Localização do elevador');
            
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
            this.showMessage('Geolocalização não suportada pelo seu browser', 'warning');
            return;
        }

        const btn = $('#enhancedBtnCurrentLocation');
        const originalHtml = btn.html();
        btn.html('<i class="fas fa-spinner fa-spin"></i> A obter...').prop('disabled', true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                this.setCoordinates(latitude, longitude);
                this.showMessage('Coordenadas obtidas com sucesso!', 'success');
                btn.html(originalHtml).prop('disabled', false);
            },
            (error) => {
                console.error('Enhanced geolocation error:', error);
                this.showMessage('Não foi possível obter coordenadas: ' + error.message, 'error');
                btn.html(originalHtml).prop('disabled', false);
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    }

    geocodeAddress() {
        const address = $('#enhancedLiftAddress').val().trim();
        const postcode = $('#enhancedLiftPostcode').val().trim();

        if (!address) {
            this.showMessage('Introduza um endereço para pesquisar coordenadas', 'warning');
            return;
        }

        const btn = $('#enhancedBtnGeocode');
        const originalHtml = btn.html();
        btn.html('<i class="fas fa-spinner fa-spin"></i>').prop('disabled', true);

        const q = postcode ? `${address}, ${postcode}, Portugal` : `${address}, Portugal`;
        console.log('🔍 Geocoding via proxy:', q);

        fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
            .then(r => r.json())
            .then(data => {
                btn.html(originalHtml).prop('disabled', false);
                if (!data.success) {
                    this.showMessage('Endereço não encontrado. Verifique o nome da rua e o código postal.', 'warning');
                    return;
                }
                const results = data.results || [{ lat: data.lat, lng: data.lng, display: data.display, city: data.city, postcode: data.postcode }];
                // Якщо є кілька результатів з різних міст — показати вибір
                const cities = [...new Set(results.map(r => r.city).filter(Boolean))];
                if (results.length > 1 && !postcode && cities.length > 1) {
                    this._showGeocodeChoiceModal(results, address);
                } else {
                    const r = results[0];
                    this.setCoordinates(r.lat, r.lng);
                    if (r.postcode && !$('#enhancedLiftPostcode').val().trim()) {
                        $('#enhancedLiftPostcode').val(r.postcode);
                    }
                    const cityLabel = r.city || r.display.split(',')[0];
                    this.showMessage(`Coordenadas definidas: ${cityLabel}`, 'success');
                }
            })
            .catch(error => {
                console.error('Enhanced geocoding error:', error);
                btn.html(originalHtml).prop('disabled', false);
                this.showMessage('Erro геокодування. Перевірте з\'єднання.', 'error');
            });
    }

    _showGeocodeChoiceModal(results, address) {
        $('#enhancedGeoChoiceModal').remove();
        const items = results.map((r, i) => `
            <button type="button" class="list-group-item list-group-item-action enhanced-geo-choice py-2" data-idx="${i}">
                <div class="d-flex align-items-start">
                    <span class="badge badge-primary mr-2 mt-1" style="min-width:22px;">${i + 1}</span>
                    <div>
                        <div style="font-size:.9rem;font-weight:600;">${r.city ? `<span class="text-primary">${r.city}</span> · ` : ''}${r.postcode || ''}</div>
                        <div style="font-size:.78rem;color:#555;">${r.display}</div>
                    </div>
                </div>
            </button>`).join('');
        const modal = `
        <div class="modal fade" id="enhancedGeoChoiceModal" tabindex="-1" style="z-index:1070;">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header py-2 bg-info text-white">
                        <h6 class="modal-title mb-0"><i class="fas fa-map-marker-alt mr-1"></i>Encontrados vários endereços — seleccione o correto</h6>
                        <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
                    </div>
                    <div class="modal-body p-2">
                        <div class="list-group">${items}</div>
                    </div>
                </div>
            </div>
        </div>`;
        $('body').append(modal);
        const self = this;
        $('#enhancedGeoChoiceModal').modal('show');
        $(document).off('click.engeo').on('click.engeo', '.enhanced-geo-choice', function() {
            const idx = parseInt($(this).data('idx'));
            const chosen = results[idx];
            self.setCoordinates(chosen.lat, chosen.lng);
            if (chosen.postcode && !$('#enhancedLiftPostcode').val().trim()) {
                $('#enhancedLiftPostcode').val(chosen.postcode);
            }
            const cityLabel = chosen.city || chosen.display.split(',')[0];
            self.showMessage(`Coordenadas estabelecidas: ${cityLabel}`, 'success');
            $('#enhancedGeoChoiceModal').modal('hide');
        });
        $('#enhancedGeoChoiceModal').on('hidden.bs.modal', function() { $(this).remove(); });
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
            
            // Перевіряємо що всі ліфти мають муніципальні номери
            const liftsCount = parseInt($('#enhancedLiftsCountAtAddress').val()) || 1;
            const missingNumbers = [];
            for (let i = 2; i <= liftsCount; i++) {
                const dynInput = document.querySelector(`#eLiftRowsContainer input[data-elift-idx="${i}"]`);
                const val = dynInput ? dynInput.value.trim() : '';
                if (!val) missingNumbers.push(i);
            }
            if (missingNumbers.length > 0) {
                this.showMessage(`⚠️ Preencha o número municipal do elevador ${missingNumbers.join(', ')} — é um campo obrigatório`, 'warning');
                // Підсвічуємо порожні поля
                missingNumbers.forEach(i => {
                    const inp = document.querySelector(`#eLiftRowsContainer input[data-elift-idx="${i}"]`);
                    if (inp) { inp.classList.add('is-invalid'); inp.focus(); }
                });
                const tab1 = document.getElementById('eLiftTab-obj');
                if (tab1) tab1.click();
                return;
            }
            
            // Зберігаємо ліфт
            this.saveLift(formData);
            
        } catch (error) {
            console.error('❌ Error in enhanced form submission:', error);
            this.showMessage('Erro ao processar formulário: ' + error.message, 'error');
        }
    }

    collectFormData() {
        // Збираємо дані з полів з префіксом enhanced
        const data = {
            id: $('#enhancedLiftId').val() || 'lift_' + Date.now(),
            municipalNumber: (() => {
                // В режимі редагування першим пріоритетом — збережений номер (DOM перебудовується eLiftUpdateRows)
                if (this.currentLiftId && this.editMunicipalNumber) return this.editMunicipalNumber;
                // Try static field
                const v = $('#enhancedMunicipalNumber').val();
                if (v) return v;
                // Try dynamic container (new tab design)
                const dyn = document.querySelector('#eLiftRowsContainer input[data-elift-idx="1"]');
                if (dyn && dyn.value) return dyn.value;
                return '';
            })(),
            serialNumber: $('#enhancedSerialNumber').val() || '',
            brand: $('#enhancedLiftBrand').val() || '',
            model: $('#enhancedLiftModel').val() || '',
            type: $('#enhancedLiftType').val() || 'passenger',
            capacity: parseInt($('#enhancedLiftCapacity').val()) || 8,
            speed: parseFloat($('#enhancedLiftSpeed').val()) || 1.0,
            installationYear: parseInt($('#enhancedInstallationYear').val()) || new Date().getFullYear(),
            manufactureYear: parseInt($('#enhancedManufactureYear').val()) || null,
            installYear: parseInt($('#enhancedInstallYear').val()) || null,
            driveType: $('#enhancedDriveType').val() || '',
            doorType: $('#enhancedDoorType').val() || '',
            address: $('#enhancedLiftAddress').val() || '',
            postcode: $('#enhancedLiftPostcode').val() || '',
            liftsCountAtAddress: parseInt($('#enhancedLiftsCountAtAddress').val()) || 1,
            // Координати: перевіряємо чи поля не порожні перед парсингом
            lat: $('#enhancedLiftLat').val() ? parseFloat($('#enhancedLiftLat').val()) : null,
            lng: $('#enhancedLiftLng').val() ? parseFloat($('#enhancedLiftLng').val()) : null,
            // Збираємо додаткові муніципальні номери якщо є
            additionalMunicipalNumbers: this.collectAdditionalMunicipalNumbers(),
            clientName: $('#enhancedClientName').val() || 'Não especificado',
            clientEmail: $('#enhancedClientEmail').val() || '',
            clientPhone: $('#enhancedClientPhone').val() || '',
            sendAccessEmail: $('#enhancedSendAccessEmail').is(':checked'),
            contactPerson: $('#enhancedContactPerson').val() || '',
            accessCode: $('#enhancedAccessCode').val() || '',
            tech: $('#enhancedAssignedTechnician').val() || 'auto',
            status: $('#enhancedLiftStatus').val() || 'operational',
            // Технічні інспекції
            lastMaintenance: $('#lastMaintenance').val() || null,
            nextMaintenance: $('#nextMaintenance').val() || null,
            inspectionFrequency: parseInt($('#enhancedInspectionFrequency').val()) || 24,
            maintenanceNotes: $('#enhancedMaintenanceNotes').val() || '',
            // Ліцензія / сертифікат
            licenseDate: $('[name="licenseDate"]').val() || null,
            licenseExpiry: $('[name="licenseExpiry"]').val() || null,
            // Поля договору
            contractType: $('#editContractType').val() || '',
            contractNumber: $('#editContractNumber').val() || '',
            contractPrice: parseFloat($('#editContractPrice').val()) || null,
            contractStart: $('#editContractStart').val() || null,
            contractAutoRenew: $('#editContractAutoRenew').is(':checked'),
            // Додаткові поля за замовчуванням
            floorsCount: parseInt($('#enhancedFloorsCount').val()) || null,
            doorsCount: 2,
            buildingName: '',
            floorLocation: 'ground',
            qrAccessLevel: 'public',
            enableQrTracking: false,
            // These array fields are only set on creation — never overwrite on PUT
            ...($('#enhancedLiftId').val() ? {} : {
                interventionHistory: [],
                photos: [],
                inspectionHistory: [],
                chat: []
            }),
            createdAt: $('#enhancedLiftId').val() ? undefined : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        return data;
    }

    validateBasicFields(data) {
        console.log('🔍 Validating enhanced lift form fields...');
        const isEdit = !!this.currentLiftId;

        // В режимі редагування гарантуємо, що поле муніципального номера не порожнє
        // (eLiftUpdateRows може перебудувати DOM і тимчасово очистити значення)
        if (isEdit && this.editMunicipalNumber) {
            const munField = $('#enhancedMunicipalNumber');
            console.log('🔧 Edit mode: ensuring municipalNumber field =', this.editMunicipalNumber);
            munField.val(this.editMunicipalNumber);
            const el = munField[0];
            if (el) { el.readOnly = true; el.style.backgroundColor = '#f5f5f5'; el.style.cursor = 'not-allowed'; }
        }
        
        // Створюємо валідатор якщо доступний
        if (typeof FormValidator !== 'undefined') {
            const validator = new FormValidator('#enhancedLiftForm');
            validator.clearErrors();
            
            // Обов'язкові поля (тільки ті що позначені * в новому дизайні)
            // В режимі редагування муніципальний номер вже є в editMunicipalNumber — не перевіряємо DOM
            if (isEdit && this.editMunicipalNumber) {
                // Позначаємо поле як валідне без перевірки (значення відомо з editMunicipalNumber)
                $('#enhancedMunicipalNumber').removeClass('is-invalid').addClass('is-valid');
            } else {
                validator.required('#enhancedMunicipalNumber', 'Número municipal');
            }
            validator.required('#enhancedLiftAddress', 'Endereço');
            // Email не обов'язковий при редагуванні (клієнт вже прив'язаний)
            if (!isEdit) {
                validator.required('#enhancedClientEmail', 'Email do cliente');
            }
            
            // Email формат (тільки якщо заповнений)
            if ($('#enhancedClientEmail').val()) {
                validator.email('#enhancedClientEmail', 'Email do cliente');
            }
            
            // Telefone — лише перевіряємо format якщо вже заповнений І має нестандартні символи
            // (phone є необов'язковим, формат не блокує збереження)
            
            // Числові поля
            if ($('#enhancedLiftCapacity').val()) {
                validator.number('#enhancedLiftCapacity', 'Вантажопідйомність', { min: 1, max: 10000 });
            }
            
            if ($('#enhancedLiftSpeed').val()) {
                validator.number('#enhancedLiftSpeed', 'Velocidade', { min: 0.1, max: 10 });
            }
            
            if (!validator.isValid()) {
                const errors = validator.getErrors();
                console.error('❌ Validation failed:', errors);
                // Show specific user-friendly message (use message, not raw field ID)
                const errNames = errors.map(e => e.message || e.field || e).join(', ');
                this.showMessage('⚠️ Заповніть обов\'язкові поля: ' + errNames, 'warning');
                // Switch back to Tab 1 (Object) where most required fields are
                const tab1 = document.getElementById('eLiftTab-obj');
                if (tab1) tab1.click();
                return false;
            }
            
            console.log('✅ All fields validated successfully');
            return true;
        }
        
        // Fallback валідація якщо FormValidator не завантажився
        // Simож перевіряємо municipal number у динамічному контейнері нового дизайну
        if (!data.municipalNumber || data.municipalNumber.trim() === '') {
            const dynInput = document.querySelector('#eLiftRowsContainer input[data-elift-idx="1"]');
            if (dynInput && dynInput.value.trim()) {
                data.municipalNumber = dynInput.value.trim();
            }
        }
        // При редагуванні email не обов'язковий (клієнт вже прив'язаний)
        const required = isEdit ? ['municipalNumber', 'address'] : ['municipalNumber', 'address', 'clientEmail'];
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
        const munField = document.getElementById('enhancedMunicipalNumber') ||
                         document.querySelector('#eLiftRowsContainer input[data-elift-idx="1"]');
        if (!data.municipalNumber || data.municipalNumber.trim() === '') {
            if (munField) munField.classList.add('is-invalid');
        } else {
            if (munField) munField.classList.remove('is-invalid');
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
                    this.detectedCountry = 'Portugal';
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
            const fieldLabels = {
                municipalNumber: 'Муніципальний № (Вкладка Об\'єкт)',
                address: 'Endereço (Вкладка Об\'єкт)',
                clientEmail: 'Email do cliente (Вкладка Cliente)'
            };
            const labels = missing.map(f => fieldLabels[f] || f);
            this.showMessage('⚠️ Заповніть обов\'язкові поля: ' + labels.join(' · '), 'warning');
            // Navigate to Tab 1 so user sees where to fill
            const tab1 = document.getElementById('eLiftTab-obj');
            if (tab1) tab1.click();
            return false;
        }
        
        return true;
    }

    validateCoordinates(data) {
        // 🏛️ Координати тепер опціональні - backend використає геокодування за адресою
        // Якщо координати вказані - перевіряємо їх валідність
        if (data.lat && data.lng) {
            if (data.lat < -90 || data.lat > 90 || data.lng < -180 || data.lng > 180) {
                this.showMessage('Некоректні координати. Перевірте широту (-90 до 90) та довготу (-180 до 180)', 'warning');
                $('#enhancedLiftLat, #enhancedLiftLng').addClass('is-invalid');
                return false;
            }
        } else {
            console.log('ℹ️ Координати не вказані - backend використає геокодування адреси');
        }
        
        $('#enhancedLiftLat, #enhancedLiftLng').removeClass('is-invalid');
        return true;
    }

    async saveLift(liftData) {
        console.log('💾 Saving enhanced lift data via API...');
        
        try {
            // Перевіряємо чи це редагування (є currentLiftId) чи створення нового
            const isEdit = !!this.currentLiftId;
            const liftId = this.currentLiftId || liftData.id;
            
            console.log(`${isEdit ? '✏️ UPDATE' : '➕ CREATE'} mode, liftId:`, liftId);
            
            // Отримуємо ID клієнта з форми (якщо знайдено через email lookup)
            const testClientId = null; // client буде визначено backend через clientEmail
            
            // Конвертуємо дані в формат API v2
            // 🗺️ Координати: якщо є вручну введені - використовуємо їх
            // Якщо немає - НЕ передаємо location, щоб backend геокодував адресу автоматично
            // hasCoords = true тільки якщо координати ЯВНО встановив користувач або geocode
            // Якщо просто заповнились зі старих даних ліфта — не відправляємо, щоб backend перегеокодував
            const hasCoords = this.coordsManuallyEdited &&
                             liftData.lat && liftData.lng &&
                             !isNaN(parseFloat(liftData.lat)) &&
                             !isNaN(parseFloat(liftData.lng));
            
            console.log('📍 Координати для збереження:', { 
                hasCoords, 
                inputLat: liftData.lat, 
                inputLng: liftData.lng,
                message: hasCoords ? 'Використовуємо введені координати' : '⚡ Backend геокодує адресу автоматично'
            });
            
            // 🏠 Формуємо address як об'єкт (Mongoose вимагає { street, city })
            // ⚠️ city НЕ може fallback до street — це призводить до дублювання адреси в таблиці
            const addressObj = {
                street: liftData.address || '',
                city: this.editAddress.city || '',
                zipCode: liftData.postcode || this.editAddress.zipCode || '',
                country: this.editAddress.country || 'Portugal'
            };

            const apiData = {
                municipalNumber: liftData.municipalNumber,
                serialNumber: liftData.serialNumber,
                manufacturer: liftData.brand,
                model: liftData.model,
                type: liftData.type || 'passenger',
                capacity: liftData.capacity,
                speed: liftData.speed,
                floors: liftData.floorsCount || 5,
                floorsCount: liftData.floorsCount || null,
                driveType: liftData.driveType || null,
                doorType: liftData.doorType || null,
                manufactureYear: liftData.manufactureYear || null,
                installYear: liftData.installYear || null,
                installationDate: liftData.installationYear ? `${liftData.installationYear}-01-01` : null,
                address: addressObj, // ✅ Правильний формат об'єкта
                postalCode: liftData.postcode, // 📮 Código postal для визначення муніципалітету
                clientName: liftData.clientName,
                clientEmail: liftData.clientEmail,
                clientPhone: liftData.clientPhone,
                sendAccessEmail: liftData.sendAccessEmail,
                contactPerson: liftData.contactPerson,
                intercomCode: liftData.accessCode,
                status: liftData.status || 'operational',
                lastInspectionDate: liftData.lastMaintenance,
                nextInspectionDate: liftData.nextMaintenance,
                inspectionFrequency: liftData.inspectionFrequency,
                maintenanceNotes: liftData.maintenanceNotes,
                licenseDate: liftData.licenseDate || null,
                licenseExpiry: liftData.licenseExpiry || null,
                // Поля договору (зберігаються прямо в об'єкті ліфта)
                contractType: liftData.contractType || null,
                contractNumber: liftData.contractNumber || null,
                contractPrice: liftData.contractPrice || null,
                contractStart: liftData.contractStart || null,
                contractAutoRenew: liftData.contractAutoRenew,
            };
            
            // ✅ Додаємо координати ТІЛЬКИ якщо користувач ввів їх вручну
            if (hasCoords) {
                apiData.location = {
                    type: 'Point',
                    coordinates: [parseFloat(liftData.lng), parseFloat(liftData.lat)]
                };
                console.log('✅ Використано вручну введені координати');
            } else {
                console.log('⚡ Backend геокодує адресу: ' + liftData.address);
            }
            
            console.log('📤 Sending to API:', apiData);
            
            // Вибираємо метод та URL залежно від режиму
            let result;
            let liftObject;
            if (isEdit) {
                // Atualização існуючого ліфта
                // ⚠️ Використовуємо fetch напряму — AuthManager.fetchWithAuth повертає вже розпарсений JSON,
                // atrás перевірка response.ok на ньому не працює і призводить до помилки "Network error"
                console.log(`🔄 Updating lift ${liftId} via API...`);
                const response = await fetch(AuthManager.getApiUrl(`/api/lifts/${liftId}`), {
                    method: 'PUT',
                    headers: AuthManager.getAuthHeaders(),
                    body: JSON.stringify(apiData)
                });

                if (response.status === 401) {
                    AuthManager.logout();
                    throw new Error('Сесія закінчилась, увійдіть знову');
                }

                if (!response.ok) {
                    const errBody = await response.json().catch(() => ({}));
                    throw new Error(`API error: ${response.status} ${errBody.message || errBody.error || ''}`);
                }

                const responseData = await response.json();
                result = { success: true, data: responseData };
                liftObject = responseData.data || responseData.lift || responseData;
            } else {
                // Створення нового ліфта
                if (typeof window.saveLiftToAPI === 'function') {
                    liftObject = await window.saveLiftToAPI(apiData);
                    result = { success: true, data: { lift: liftObject } };
                } else {
                    throw new Error('saveLiftToAPI function not found');
                }
            }
            
            console.log('✅ API response:', result);
            console.log('✅ Lift object:', liftObject);
            
            if (result && result.success && liftObject) {
                // 👤 Якщо автоматично створено нового клієнта — показати сповіщення
                const nc = window.__lastNewClient;
                if (nc && nc.created) {
                    let emailStatus;
                    if (nc.emailSkipped) {
                        emailStatus = '📭 Email не надіслано (опцію не обрано). Відправте вручну коли будете готові.';
                    } else if (nc.emailSent === false) {
                        emailStatus = `⚠️ Email не відправлено (${nc.emailError || 'SMTP не налаштовано'})`;
                    } else {
                        emailStatus = '📧 Запрошення відправлено на email';
                    }
                    this.showMessage(
                        `✅ Elevador збережено! 👤 Novo клієнт створено автоматично:<br>` +
                        `<strong>${nc.email}</strong><br>` +
                        `🔑 Тимчасовий пароль: <code style="background:#fff;padding:2px 6px;border-radius:3px">${nc.password}</code><br>` +
                        emailStatus,
                        'success'
                    );
                    window.__lastNewClient = null;
                } else {
                    this.showMessage(isEdit ? 'Elevador com sucesso оновлено!' : 'Elevador com sucesso збережено!', 'success');
                }
                $('#enhancedLiftModal').modal('hide');
                
                // 🏛️ Перевірка municipality notification (тільки для нових ліфтів)
                if (!isEdit && liftObject.municipality && liftObject.municipality.name) {
                    console.log('🏛️ Виявлено município:', liftObject.municipality.name);
                    if (typeof window.showMunicipalityNotificationModal === 'function') {
                        window.showMunicipalityNotificationModal(liftObject);
                    } else {
                        console.warn('⚠️ Функція showMunicipalityNotificationModal не знайдена');
                    }
                }
                
                // Скидаємо currentLiftId та editAddress після com sucessoго збереження
                this.currentLiftId = null;
                this.editAddress = {};
                this.editMunicipalNumber = '';

                // 🏢 Зберігаємо додаткові ліфти як окремі записи
                const additionalNumbers = liftData.additionalMunicipalNumbers || [];
                if (!isEdit && additionalNumbers.length > 0) {
                    let savedCount = 1;
                    for (const additionalInfo of additionalNumbers) {
                        if (!additionalInfo.municipalNumber || !additionalInfo.municipalNumber.trim()) continue;
                        try {
                            const additionalApiData = { ...apiData, municipalNumber: additionalInfo.municipalNumber.trim() };
                            console.log(`🏗️ Зберігаємо ліфт #${additionalInfo.liftNumber}:`, additionalInfo.municipalNumber);
                            await window.saveLiftToAPI(additionalApiData);
                            savedCount++;
                            console.log(`✅ Elevador #${additionalInfo.liftNumber} збережено`);
                        } catch (err) {
                            console.error(`❌ Erro ao guardar ліфта #${additionalInfo.liftNumber}:`, err);
                            this.showMessage(`⚠️ Elevador N.º${additionalInfo.municipalNumber} не вдалося зберегти: ${err.message}`, 'warning');
                        }
                    }
                    if (savedCount > 1) {
                        this.showMessage(`✅ Збережено ${savedCount} ліфти за одною адресою!`, 'success');
                    }
                }

                // Оновлюємо таблицю
                setTimeout(() => {
                    this.refreshTable();
                }, 500);
            } else {
                throw new Error(result?.error || result?.message || 'Erro desconhecido');
            }
            
        } catch (error) {
            console.error('❌ Error saving enhanced lift:', error);
            this.showMessage('Erro ao guardar: ' + error.message, 'error');
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
        console.log('🔍 Available refresh methods:', {
            loadLiftsFromAPI: typeof window.loadLiftsFromAPI,
            liftManager: typeof window.liftManager
        });
        
        // Prioridade: loadLiftsFromAPI > liftManager.loadLifts
        // loadLiftsFromAPI вже викликає applyAllFilters() всередині — пошук збережеться
        if (typeof window.loadLiftsFromAPI === 'function') {
            window.loadLiftsFromAPI();
            console.log('✅ Called window.loadLiftsFromAPI()');
        } else if (typeof window.liftManager !== 'undefined' && window.liftManager.loadLifts) {
            window.liftManager.loadLifts();
            console.log('✅ Called liftManager.loadLifts()');
        } else {
            console.warn('⚠️ No table refresh method available, reloading page...');
            setTimeout(() => location.reload(), 1000);
        }
    }

    resetForm() {
        console.log('🔄 Resetting enhanced form...');
        $('#enhancedLiftForm')[0].reset();
        $('#enhancedLiftId').val('');
        $('.is-invalid').removeClass('is-invalid');
        $('.invalid-feedback').remove();
        $('#enhancedModalTitle').text('Adicionar elevador com mapa');
        
        // Скидаємо ID поточного ліфта, координати та збережену адресу
        this.currentLiftId = null;
        this.currentCoords = null;
        this.editAddress = {};
        this.editMunicipalNumber = '';
        this.coordsManuallyEdited = false;
        if (this.marker && this.map) {
            this.map.removeLayer(this.marker);
            this.marker = null;
        }
        
        // Переходимо на першу вкладку
        $('#basic-tab').click();
    }

    loadLiftForEdit(liftData) {
        console.log('📝 Loading lift for enhanced edit:', liftData);
        console.log('🔍 Lift fields:', Object.keys(liftData));
        
        // Встановлюємо currentLiftId перед заповненням форми
        this.currentLiftId = liftData.id || liftData._id;
        this.editMunicipalNumber = liftData.municipalNumber || '';
        console.log('🔧 Set currentLiftId:', this.currentLiftId);
        console.log('🔧 Set editMunicipalNumber:', this.editMunicipalNumber);
        
        // Переконуємось що eLiftRowsContainer заповнений (створює #enhancedMunicipalNumber в DOM)
        if (typeof eLiftUpdateRows === 'function') eLiftUpdateRows(1);
        
        // Заповнюємо всі поля з префіксом enhanced
        $('#enhancedLiftId').val(this.currentLiftId);
        $('#enhancedMunicipalNumber').val(liftData.municipalNumber || '');
        // В режимі редагування муніципальний номер — незмінний унікальний ключ реєстру
        const munInput = document.getElementById('enhancedMunicipalNumber');
        if (munInput) {
            munInput.readOnly = true;
            munInput.style.backgroundColor = '#f5f5f5';
            munInput.style.cursor = 'not-allowed';
            munInput.title = 'Número municipal не можна змінити після реєстрації ліфта';
        }

        // Додатковий захист: відновити значення муніципального номера після показу модалки
        // (shown.bs.modal викликає eLiftUpdateRows повторно і може скинути readOnly/value)
        const _munNum = liftData.municipalNumber || '';
        const _restoreMun = () => {
            const el = document.getElementById('enhancedMunicipalNumber');
            if (el) {
                if (_munNum) el.value = _munNum;
                el.readOnly = true;
                el.style.backgroundColor = '#f5f5f5';
                el.style.cursor = 'not-allowed';
                el.title = 'Número municipal не можна змінити після реєстрації ліфта';
            }
        };
        $('#enhancedLiftModal').one('shown.bs.modal', _restoreMun);
        $('#enhancedSerialNumber').val(liftData.serial || liftData.serialNumber || '');
        $('#enhancedLiftBrand').val(liftData.brand || '');
        $('#enhancedLiftModel').val(liftData.model || '');
        $('#enhancedLiftType').val(liftData.type || 'passenger');
        $('#enhancedLiftCapacity').val(liftData.capacity || '');
        $('#enhancedLiftSpeed').val(liftData.speed || '');
        $('#enhancedInstallationYear').val(liftData.installationYear || '');
        $('#enhancedManufactureYear').val(liftData.manufactureYear || '');
        $('#enhancedInstallYear').val(liftData.installYear || '');
        $('#enhancedDriveType').val(liftData.driveType || '');
        $('#enhancedDoorType').val(liftData.doorType || '');
        $('#enhancedFloorsCount').val(liftData.floorsCount || liftData.floors || '');
        $('#enhancedLiftAddress').val(liftData.address || '');
        $('#enhancedLiftPostcode').val(liftData.postcode || '');
        $('#enhancedLiftsCountAtAddress').val(liftData.liftsCountAtAddress || 1);
        $('#enhancedLiftLat').val(liftData.lat || '');
        $('#enhancedLiftLng').val(liftData.lng || '');
        // При завантаженні з БД координати НЕ вважаються "вручну встановленими" —
        // якщо адреса зміниться, backend перегеокодує автоматично
        this.coordsManuallyEdited = false;
        $('#enhancedClientName').val(liftData.clientName || '');
        $('#enhancedClientEmail').val(liftData.clientEmail || '');
        $('#enhancedClientPhone').val(liftData.clientPhone || '');
        $('#enhancedContactPerson').val(liftData.contactPerson || '');
        $('#enhancedAccessCode').val(liftData.accessCode || '');
        $('#enhancedAssignedTechnician').val(liftData.tech || '');
        $('#enhancedLiftStatus').val(liftData.status || '');
        // Поля інспекцій
        $('#lastMaintenance').val(liftData.lastMaintenance || '');
        $('#nextMaintenance').val(liftData.nextMaintenance || '');
        $('#enhancedInspectionFrequency').val(liftData.inspectionFrequency || 24);
        $('#enhancedMaintenanceNotes').val(liftData.maintenanceNotes || '');
        // Ліцензія / сертифікат
        $('[name="licenseDate"]').val(liftData.licenseDate ? liftData.licenseDate.split('T')[0] : '');
        $('[name="licenseExpiry"]').val(liftData.licenseExpiry ? liftData.licenseExpiry.split('T')[0] : '');
        
        console.log('✅ All form fields populated');
        console.log('🔍 Municipal number field value:', $('#enhancedMunicipalNumber').val());
        console.log('🔍 Address field value:', $('#enhancedLiftAddress').val());
        
        // Оновлюємо карту з координатами ліфта (БЕЗ позначення як manual — це завантаження з БД)
        if (liftData.lat && liftData.lng) {
            setTimeout(() => {
                this.updateMapMarker(liftData.lat, liftData.lng);
                this.currentCoords = { lat: liftData.lat, lng: liftData.lng };
                // coordsManuallyEdited залишається false — backend перегеокодує якщо адреса зміниться
            }, 500);
        }
        
        $('#enhancedModalTitle').text('Editar elevador (com mapa)');
        console.log('✅ Enhanced lift data loaded for editing. Current ID:', this.currentLiftId);
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

        // Старий контейнер завжди прихований — нова система eLiftRowsContainer все обробляє
        $('#additionalLiftsFields').empty();
        $('#additionalLiftsContainer').addClass('d-none');

        // Делегуємо до нової системи динамічних рядків
        if (typeof window.eLiftUpdateRows === 'function') {
            window.eLiftUpdateRows(count);
        }
    }

    collectAdditionalMunicipalNumbers() {
        const count = parseInt($('#enhancedLiftsCountAtAddress').val()) || 1;
        const additionalNumbers = [];
        
        for (let i = 2; i <= count; i++) {
            // New system: inputs in #eLiftRowsContainer with data-elift-idx
            const dynInput = document.querySelector(`#eLiftRowsContainer input[data-elift-idx="${i}"]`);
            const number = dynInput ? dynInput.value : ($(`#additionalMunicipalNumber${i}`).val() || '');
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
        console.log(`🔄 Generating QR code for input: ${inputId}, lift #${liftNumber}`);
        
        const municipalNumber = $(`#${inputId}`).val();
        
        if (!municipalNumber || !municipalNumber.trim()) {
            this.showMessage('Por favor, введіть муніципальний номер ліфта перед генерацією QR', 'error');
            console.error('❌ Municipal number is empty');
            // Фокусуємо поле
            if (liftNumber === 1) {
                $('#enhancedMunicipalNumber').focus();
            } else {
                $(`#${inputId}`).focus();
            }
            return;
        }
        
        // Отримуємо адресу для QR-коду
        const address = $('#enhancedLiftAddress').val() || '';
        
        if (!address || !address.trim()) {
            this.showMessage('Por favor, введіть адресу ліфта перед генерацією QR', 'error');
            console.error('❌ Address is empty');
            // Фокусуємо поле
            $('#enhancedLiftAddress').focus();
            return;
        }
        
        // Перевірка доступності бібліотеки (qrcode або QRCode)
        if (typeof QRCode === 'undefined' && typeof qrcode === 'undefined') {
            console.error('❌ QRCode library not loaded');
            this.showMessage('Erro: бібліотека QR-коду не завантажена', 'error');
            return;
        }
        
        // Якщо є qrcode але немає QRCode - створюємо псевдонім
        if (typeof qrcode !== 'undefined' && typeof QRCode === 'undefined') {
            window.QRCode = qrcode;
            console.log('🔧 Створено window.QRCode з qrcode');
        }
        
        // ВАЖЛИВО: QR код має обмеження на розмір даних
        // Максимум для CorrectLevel.M (середня корекція): ~890 символів
        // Максимум для CorrectLevel.L (низька): ~1264 символи
        // 
        // ФОРМАТ: Компактний для сканування диспетчером
        // Використовуємо тільки муніципальний номер - він унікальний в системі
        const qrText = municipalNumber.trim();
        const previewContainer = liftNumber === 1 ? '#mainQrPreview' : `#qrPreview${liftNumber}`;
        
        console.log(`📦 QR text: "${qrText}" (length: ${qrText.length} chars)`);
        console.log(`📦 QR lift #${liftNumber}, municipal: ${municipalNumber.trim()}`);
        console.log(`📍 Preview container: ${previewContainer}`);
        
        // Перевіряємо чи існує контейнер
        const $container = $(previewContainer);
        if ($container.length === 0) {
            console.error(`❌ Container ${previewContainer} not found`);
            this.showMessage('Erro: контейнер для QR-коду не знайдено', 'error');
            return;
        }
        
        // Очищуємо попередній QR-код
        $container.empty().removeClass('d-none').addClass('text-center');
        console.log('✅ Container cleared and shown');
        
        try {
            // Генеруємо QR-код використовуючи qrcode-generator API
            console.log('🔧 typeof QRCode:', typeof QRCode);
            console.log('🔧 Container element:', $container[0]);
            console.log('🔧 Container id:', $container[0].id);
            
            // ВАЖЛИВО: qrcode-generator потребує DIVID або елемент
            // API: new QRCode(element, {text, width, height, colorDark, colorLight, correctLevel})
            // CorrectLevel.M (середня корекція) дозволяє більше даних ніж CorrectLevel.H
            const qrInstance = new QRCode($container[0], {
                text: qrText,
                width: 150,
                height: 150,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M  // Змінено з H на M для збільшення ліміту даних
            });
            
            console.log('✅ QR code generated successfully');
            console.log('🔧 QR instance:', qrInstance);
            
            // Видаляємо дублікати - залишаємо тільки перший елемент (canvas або img)
            setTimeout(() => {
                const children = $container[0].children;
                if (children.length > 1) {
                    console.log(`🧹 Видаляємо ${children.length - 1} дублікат(ів) QR`);
                    // Видаляємо всі крім першого
                    while (children.length > 1) {
                        children[children.length - 1].remove();
                    }
                }
                console.log('✅ QR очищено, залишено тільки один елемент');
            }, 100);
            
            // Diagnóstico: що саме створилось
            setTimeout(() => {
                console.log('🔍 Container HTML:', $container[0].innerHTML.substring(0, 200));
                console.log('🔍 Container children count:', $container[0].children.length);
                
                const createdElement = $container.find('img, canvas')[0];
                if (createdElement) {
                    console.log('✅ Created element:', createdElement.tagName);
                    console.log('  Element src:', createdElement.src?.substring(0, 50));
                    console.log('  Element width:', createdElement.width);
                    console.log('  Element height:', createdElement.height);
                    console.log('  Element display:', window.getComputedStyle(createdElement).display);
                    console.log('  Element visibility:', window.getComputedStyle(createdElement).visibility);
                } else {
                    console.error('❌ Елемент НЕ СТВОРИВСЯ! Container innerHTML:', $container[0].innerHTML);
                }
            }, 200);
            
            // 🚀 EventBus: Повідомляємо про генерацію QR коду
            if (window.eventBus) {
                const qrCanvas = $container.find('canvas')[0] || $container.find('img')[0];
                eventBus.emit('qr:generated', {
                    municipalNumber: municipalNumber.trim(),
                    liftNumber: liftNumber,
                    address: address.trim(),
                    qrText: qrText,
                    element: qrCanvas
                }, { source: 'qr-generator' });
            }
            
            // Додаємо кнопки для дій з QR-кодом
            const actionsHtml = `
                <div class="mt-2">
                    <div class="btn-group btn-group-sm d-flex" role="group">
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
            $container.append(actionsHtml);
            
            console.log(`✅ QR code generated for lift #${liftNumber}: ${municipalNumber}`);
            this.showMessage(`QR-код створено для ліфта №${liftNumber}`, 'success');
        } catch (error) {
            console.error('❌ QR generation error:', error);
            this.showMessage('Erro генерації QR-коду: ' + error.message, 'error');
            $container.html(`<div class="text-danger"><i class="fas fa-exclamation-triangle"></i> Erro</div>`);
        }
    }

    // A carregar QR-коду як PNG
    downloadQRCode(inputId, liftNumber = 1) {
        const municipalNumber = $(`#${inputId}`).val().trim();
        const previewContainer = liftNumber === 1 ? '#mainQrPreview' : `#qrPreview${liftNumber}`;
        
        // qrcode-generator створює IMG, а не canvas!
        const img = $(previewContainer).find('img')[0];
        const canvas = $(previewContainer).find('canvas')[0];
        const qrElement = img || canvas;
        
        if (!qrElement) {
            this.showMessage('Спочатку згенеруйте QR-код', 'error');
            console.error('❌ QR element not found in', previewContainer);
            return;
        }
        
        console.log('📥 Downloading QR as PNG:', qrElement.tagName);
        
        // Створюємо посилання для завантаження
        const link = document.createElement('a');
        link.download = `QR-lift-${municipalNumber}-${liftNumber}.png`;
        
        // Якщо це IMG - використовуємо src напряму
        if (qrElement.tagName === 'IMG') {
            link.href = qrElement.src;
        } else {
            // Якщо canvas - конвертуємо в dataURL
            link.href = qrElement.toDataURL();
        }
        
        link.click();
        
        this.showMessage('QR-код carregado', 'success');
    }

    // Друк QR-коду
    printQRCode(inputId, liftNumber = 1) {
        const municipalNumber = $(`#${inputId}`).val().trim();
        const address = $('#enhancedLiftAddress').val() || 'Endereço não especificado';
        const previewContainer = liftNumber === 1 ? '#mainQrPreview' : `#qrPreview${liftNumber}`;
        
        // qrcode-generator створює IMG, а не canvas!
        const img = $(previewContainer).find('img')[0];
        const canvas = $(previewContainer).find('canvas')[0];
        const qrElement = img || canvas;
        
        if (!qrElement) {
            this.showMessage('Спочатку згенеруйте QR-код', 'error');
            console.error('❌ QR element not found in', previewContainer);
            return;
        }
        
        console.log('🖨️ Printing QR:', qrElement.tagName);
        
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
                <div class="info municipal">Número municipal: ${municipalNumber}</div>
                <div class="info">Elevador N.º${liftNumber}</div>
                <div class="info">Endereço: ${address}</div>
                <div class="qr-container">
                    <img src="${qrElement.tagName === 'IMG' ? qrElement.src : qrElement.toDataURL()}" alt="QR код ліфта">
                </div>
                <div class="info">Створено: ${new Date().toLocaleString('pt-PT')}</div>
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
        console.log('🔓 Відкриваємо модальне вікно інспекції...');
        
        // Використовуємо існуюче статичне модальне вікно
        const existingModal = document.getElementById('inspectionReportModal');
        if (existingModal) {
            // Очищуємо форму
            const form = existingModal.querySelector('#inspectionReportForm');
            if (form) {
                form.reset();
            }
            
            // Встановлюємо сьогоднішню дату
            const dateField = existingModal.querySelector('#inspectionDate');
            if (dateField) {
                dateField.value = new Date().toISOString().split('T')[0];
            }
            
            // Відкриваємо модальне вікно
            $('#inspectionReportModal').modal('show');
            console.log('✅ Модальне вікно інспекції відкрито');
        } else {
            console.error('❌ Модальне вікно інспекції не знайдено!');
            this.showMessage('Erro: модальне вікно не знайдено', 'error');
        }
    }

    // Збереження звіту інспекції
    saveInspectionReport() {
        console.log('💾 Спроба збереження з enhanced-lift-modal...');
        
        // Використовуємо функцію з HTML сторінки
        if (typeof window.saveInspectionReport === 'function') {
            console.log('✅ Викликаємо основну функцію збереження');
            window.saveInspectionReport();
        } else {
            console.error('❌ Функція saveInspectionReport не знайдена');
            this.showMessage('Erro ao guardar: функція не знайдена', 'error');
        }
    }
    
    getInspectionTypeText(type) {
        switch (type) {
            case 'routine': return 'Планова інспекція';
            case 'maintenance': return 'Manutenção';
            case 'repair': return 'Після ремонту';
            case 'emergency': return 'Аварійна перевірка';
            case 'annual': return 'Річна інспекція';
            default: return 'Inspeção';
        }
    }
    
    getInspectionResultText(result) {
        switch (result) {
            case 'passed': return 'Пройшов';
            case 'minor_issues': return 'Незначні зауваження';
            case 'major_issues': return 'Agoйозні проблеми';
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