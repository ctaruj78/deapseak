// Enhanced Lift Modal Manager
class EnhancedLiftModal {
    constructor() {
        this.map = null;
        this.marker = null;
        this.interventions = [];
        this.photos = [];
        this.currentLiftId = null;
        this.mapEnabled = true; // Флаг для відключення карти
        this.init();
    }

    init() {
        console.log('Initializing Enhanced Lift Modal...');
        this.initEventListeners();
        this.waitForLeafletAndInitMap();
        this.loadTechniciansData();
    }

    waitForLeafletAndInitMap() {
        // Чекаємо завантаження Leaflet
        const checkLeaflet = () => {
            if (typeof L !== 'undefined') {
                console.log('✅ Leaflet loaded, initializing map...');
                this.initMap();
            } else {
                console.log('⏳ Waiting for Leaflet to load...');
                setTimeout(checkLeaflet, 100);
            }
        };
        checkLeaflet();
    }

    initEventListeners() {
        console.log('🔧 Initializing event listeners...');
        console.log('Form #liftForm exists:', $('#liftForm').length > 0);
        console.log('Submit button exists:', $('button[type="submit"]').length > 0);
        
        // Геокодування адреси
        $('#btnGeocode').on('click', () => this.geocodeAddress());
        
        // Поточна локація користувача
        $('#btnCurrentLocation').on('click', () => this.getCurrentLocation());
        
        // Копіювання координат
        $('#btnCopyLat').on('click', () => this.copyToClipboard($('#liftLat').val(), 'Широту скопійовано'));
        $('#btnCopyLng').on('click', () => this.copyToClipboard($('#liftLng').val(), 'Довготу скопійовано'));
        $('#btnCopyCoords').on('click', () => {
            const lat = $('#liftLat').val();
            const lng = $('#liftLng').val();
            if (lat && lng) {
                this.copyToClipboard(`${lat}, ${lng}`, 'Координати скопійовано');
            }
        });
        
        // Автоматичне геокодування при зміні адреси або поштового коду
        $('#liftAddress').on('blur', () => this.autoGeocodeAddress());
        $('#liftPostcode').on('blur', () => this.autoGeocodeAddress());
        
        // Оновлення карти при зміні координат
        $('#liftLat, #liftLng').on('change', () => {
            const lat = parseFloat($('#liftLat').val());
            const lng = parseFloat($('#liftLng').val());
            
            if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                this.setMapLocation(lat, lng);
                // Спробуємо отримати адресу для нових координат
                this.reverseGeocode(lat, lng);
            }
        });
        
        // Обробка завантаження фотографій
        $('#liftPhotos').on('change', (e) => this.handlePhotoUpload(e));
        
        // Додавання втручання
        $('#addInterventionBtn').on('click', () => this.addIntervention());
        
        // Попередній перегляд даних
        $('#previewDataBtn').on('click', () => this.previewData());
        
        // Генерація QR коду
        $('#generateQrBtn').on('click', () => this.generateQRCode());
        
        // Відправка форми
        $('#liftForm').on('submit', (e) => {
            console.log('🔥 Form submit event triggered!');
            this.submitForm(e);
        });
        
        // Альтернативний обробник для кнопки submit
        $(document).on('click', 'button[type="submit"]', (e) => {
            console.log('🔥 Submit button clicked directly!');
            if ($(e.target).closest('#liftForm').length > 0) {
                e.preventDefault();
                this.submitForm(e);
            }
        });
        
        // Автоматичне обчислення наступного ТО
        $('#lastMaintenance, #inspectionFrequency').on('change', () => this.calculateNextMaintenance());
        
        // Валідація поштового коду
        $('#liftPostcode').on('input', (e) => this.formatPostalCode(e));
        
        // Валідація телефону
        $('#clientPhone').on('input', (e) => this.formatPhoneNumber(e));
        
        // Оновлення статусу при зміні призначеного техніка
        $('#assignedTechnician').on('change', () => this.updateStatusBasedOnTechnician());
        
        // Показати/приховати карточку втручань для існуючих ліфтів
        $('#liftModal').on('show.bs.modal', () => this.onModalShow());
    }

    async initMap() {
        try {
            console.log('🗺️ Initializing map system...');
            console.log('Leaflet available:', typeof L !== 'undefined');
            console.log('#liftMap element exists:', $('#liftMap').length > 0);
            
            // Перевірка наявності Leaflet
            if (typeof L === 'undefined') {
                console.error('❌ Leaflet library not loaded! Map will be disabled.');
                this.hideMapInterface();
                return;
            }
            
            // Чекаємо, поки модальне вікно буде показано, щоб карта правильно ініціалізувалася
            $('#liftModal').on('shown.bs.modal', () => {
                console.log('🗺️ Modal shown, creating map...');
                if (!this.map) {
                    this.createMap();
                } else {
                    // Перерахуємо розмір карти, якщо вона вже існує
                    setTimeout(() => {
                        this.map.invalidateSize();
                    }, 100);
                }
            });
            
            console.log('✅ Map initialization prepared');
        } catch (error) {
            console.error('❌ Error preparing map initialization:', error);
            this.hideMapInterface();
        }
    }

    hideMapInterface() {
        // Сховати карту якщо є проблеми з Leaflet
        this.mapEnabled = false;
        $('#liftMap').parent().hide();
        // Показати повідомлення замість карти
        const mapContainer = $('#liftMap').parent();
        if (mapContainer.find('.map-disabled-message').length === 0) {
            mapContainer.append(`
                <div class="map-disabled-message alert alert-info">
                    <i class="fas fa-info-circle"></i> 
                    Карта тимчасово недоступна. Ви можете заповнити координати вручну або залишити порожніми.
                </div>
            `);
        }
        console.log('🚫 Map interface hidden due to loading issues');
    }

    createMap() {
        try {
            console.log('🗺️ Creating Leaflet map...');
            
            // Перевірка наявності контейнера карти
            const mapContainer = document.getElementById('liftMap');
            if (!mapContainer) {
                console.error('❌ Map container #liftMap not found!');
                return;
            }
            
            // Очистити попередню карту якщо є
            if (this.map) {
                this.map.remove();
                this.map = null;
            }
            
            console.log('📍 Initializing Leaflet map with container:', mapContainer);
            
            // Ініціалізація Leaflet карти з Києвом як центром за замовчуванням
            this.map = L.map('liftMap', {
                center: [50.4501, 30.5234],
                zoom: 10,
                zoomControl: true,
                attributionControl: true
            });
            
            // Додаємо тайли OpenStreetMap
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(this.map);
            
            // Обробник кліку на карту для вибору локації
            this.map.on('click', (e) => {
                console.log('Map clicked at:', e.latlng);
                this.setMapLocation(e.latlng.lat, e.latlng.lng);
                // Автоматично отримуємо адресу за координатами
                this.reverseGeocode(e.latlng.lat, e.latlng.lng);
            });
            
            // Ховаємо індикатор завантаження
            $('.map-loading').hide();
            
            console.log('Map created successfully');
            
            // Якщо є збережені координати, показуємо їх на карті
            const lat = $('#liftLat').val();
            const lng = $('#liftLng').val();
            if (lat && lng) {
                this.setMapLocation(parseFloat(lat), parseFloat(lng));
            }
            
        } catch (error) {
            console.error('Error creating map:', error);
            $('#liftMap').html(`
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    Помилка завантаження карти. Можете вручну ввести координати.
                </div>
            `);
        }
    }

    async geocodeAddress() {
        const address = $('#liftAddress').val().trim();
        const postcode = $('#liftPostcode').val().trim();
        
        if (!address && !postcode) {
            this.showToast('Введіть адресу або поштовий код для геокодування', 'warning');
            return;
        }

        try {
            // Показуємо індикатор завантаження
            $('#btnGeocode').html('<i class="fas fa-spinner fa-spin"></i>').prop('disabled', true);
            
            const result = await this.performGeocode(address, postcode);
            
            if (result) {
                $('#liftLat').val(result.lat);
                $('#liftLng').val(result.lng);
                
                this.setMapLocation(result.lat, result.lng);
                this.showToast('Координати успішно отримані', 'success');
                
                // Автоматично заповнюємо недостаючі поля
                if (result.address && !address) {
                    $('#liftAddress').val(result.address);
                }
                if (result.postcode && !postcode) {
                    $('#liftPostcode').val(result.postcode);
                }
            } else {
                this.showToast('Не вдалося знайти координати для вказаної адреси', 'error');
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            this.showToast('Помилка геокодування', 'error');
        } finally {
            $('#btnGeocode').html('<i class="fas fa-search-location"></i>').prop('disabled', false);
        }
    }

    async autoGeocodeAddress() {
        const address = $('#liftAddress').val().trim();
        const postcode = $('#liftPostcode').val().trim();
        const currentLat = $('#liftLat').val();
        const currentLng = $('#liftLng').val();
        
        // Автоматично геокодуємо тільки якщо немає координат і є адреса або поштовий код
        if ((address || postcode) && (!currentLat || !currentLng)) {
            console.log('Auto-geocoding address...');
            
            try {
                const result = await this.performGeocode(address, postcode, true);
                
                if (result) {
                    $('#liftLat').val(result.lat);
                    $('#liftLng').val(result.lng);
                    
                    if (this.map) {
                        this.setMapLocation(result.lat, result.lng);
                    }
                    
                    // Заповнюємо недостаючі поля без повідомлень
                    if (result.postcode && !postcode) {
                        $('#liftPostcode').val(result.postcode);
                    }
                }
            } catch (error) {
                console.log('Auto-geocoding failed:', error);
                // Тихо ігноруємо помилки автоматичного геокодування
            }
        }
    }

    async performGeocode(address, postcode, silent = false) {
        // Будуємо запит для геокодування
        let query = '';
        if (address && postcode) {
            query = `${address}, ${postcode}`;
        } else if (address) {
            query = address;
        } else if (postcode) {
            query = postcode;
        }
        
        if (!query) return null;
        
        // Додаємо Україну для кращої точності
        query += ', Ukraine';
        
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=3&countrycodes=ua&addressdetails=1`;
        
        if (!silent) {
            console.log('Geocoding URL:', url);
        }
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'DeepSpeak Lift Management System'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            const bestResult = data[0];
            const lat = parseFloat(bestResult.lat);
            const lng = parseFloat(bestResult.lon);
            
            // Витягуємо додаткову інформацію з адреси
            let extractedAddress = bestResult.display_name;
            let extractedPostcode = null;
            
            if (bestResult.address) {
                // Формуємо адресу з компонентів
                const addr = bestResult.address;
                const addressParts = [];
                
                if (addr.road) addressParts.push(addr.road);
                if (addr.house_number) addressParts.push(addr.house_number);
                if (addr.city || addr.town || addr.village) {
                    addressParts.push(addr.city || addr.town || addr.village);
                }
                
                if (addressParts.length > 0) {
                    extractedAddress = addressParts.join(', ');
                }
                
                extractedPostcode = addr.postcode;
            }
            
            if (!silent) {
                console.log('Geocoding result:', { lat, lng, address: extractedAddress, postcode: extractedPostcode });
            }
            
            return {
                lat: lat,
                lng: lng,
                address: extractedAddress,
                postcode: extractedPostcode,
                raw: bestResult
            };
        }
        
        return null;
    }

    async reverseGeocode(lat, lng) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'DeepSpeak Lift Management System'
                }
            });
            
            if (!response.ok) return;
            
            const data = await response.json();
            
            if (data && data.address) {
                const addr = data.address;
                const addressParts = [];
                
                if (addr.road) addressParts.push(addr.road);
                if (addr.house_number) addressParts.push(addr.house_number);
                if (addr.city || addr.town || addr.village) {
                    addressParts.push(addr.city || addr.town || addr.village);
                }
                
                const fullAddress = addressParts.join(', ');
                
                // Заповнюємо поля тільки якщо вони порожні
                if (!$('#liftAddress').val() && fullAddress) {
                    $('#liftAddress').val(fullAddress);
                }
                
                if (!$('#liftPostcode').val() && addr.postcode) {
                    $('#liftPostcode').val(addr.postcode);
                }
                
                console.log('Reverse geocoding result:', fullAddress, addr.postcode);
            }
        } catch (error) {
            console.log('Reverse geocoding failed:', error);
            // Тихо ігноруємо помилки зворотного геокодування
        }
    }

    async getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showToast('Геолокація не підтримується вашим браузером', 'error');
            return;
        }

        const btn = $('#btnCurrentLocation');
        btn.html('<i class="fas fa-spinner fa-spin"></i> Визначення...').prop('disabled', true);

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                });
            });

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;

            console.log('Current location:', lat, lng, 'accuracy:', accuracy);

            // Встановлюємо координати
            this.setMapLocation(lat, lng);
            
            // Отримуємо адресу за координатами
            await this.reverseGeocode(lat, lng);

            this.showToast(`Локація визначена (точність: ${Math.round(accuracy)}м)`, 'success');

        } catch (error) {
            console.error('Geolocation error:', error);
            
            let message = 'Не вдалося визначити поточну локацію';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    message = 'Доступ до геолокації відхилено. Дозвольте доступ у налаштуваннях браузера.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message = 'Інформація про локацію недоступна.';
                    break;
                case error.TIMEOUT:
                    message = 'Час очікування визначення локації вичерпано.';
                    break;
            }
            
            this.showToast(message, 'error');
        } finally {
            btn.html('<i class="fas fa-crosshairs"></i> Моя локація').prop('disabled', false);
        }
    }

    async copyToClipboard(text, successMessage = 'Скопійовано') {
        if (!text) {
            this.showToast('Немає даних для копіювання', 'warning');
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            this.showToast(successMessage, 'success');
        } catch (error) {
            console.error('Clipboard error:', error);
            
            // Fallback для старих браузерів
            try {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showToast(successMessage, 'success');
            } catch (fallbackError) {
                console.error('Fallback clipboard error:', fallbackError);
                this.showToast('Не вдалося скопіювати в буфер обміну', 'error');
            }
        }
    }

    setMapLocation(lat, lng) {
        if (!this.map) {
            console.log('Map not initialized, coordinates saved for later use');
            $('#liftLat').val(lat);
            $('#liftLng').val(lng);
            return;
        }

        try {
            // Встановлюємо центр карти на нові координати
            this.map.setView([lat, lng], 16);
            
            // Видаляємо попередній маркер
            if (this.marker) {
                this.map.removeLayer(this.marker);
            }
            
            // Додаємо новий маркер з кастомним popup
            this.marker = L.marker([lat, lng], {
                draggable: true
            }).addTo(this.map);
            
            // Додаємо popup з інформацією
            this.marker.bindPopup(`
                <div class="text-center">
                    <strong>Локація ліфта</strong><br>
                    <small>Широта: ${lat.toFixed(6)}</small><br>
                    <small>Довгота: ${lng.toFixed(6)}</small><br>
                    <em>Перетягніть маркер для зміни позиції</em>
                </div>
            `).openPopup();
            
            // Обробник перетягування маркера
            this.marker.on('dragend', (e) => {
                const newPos = e.target.getLatLng();
                $('#liftLat').val(newPos.lat.toFixed(6));
                $('#liftLng').val(newPos.lng.toFixed(6));
                
                // Оновлюємо popup з новими координатами
                this.marker.setPopupContent(`
                    <div class="text-center">
                        <strong>Локація ліфта</strong><br>
                        <small>Широта: ${newPos.lat.toFixed(6)}</small><br>
                        <small>Довгота: ${newPos.lng.toFixed(6)}</small><br>
                        <em>Позицію змінено</em>
                    </div>
                `);
                
                // Спробуємо отримати адресу для нових координат
                this.reverseGeocode(newPos.lat, newPos.lng);
            });
            
            // Оновлюємо поля координат
            $('#liftLat').val(lat.toFixed(6));
            $('#liftLng').val(lng.toFixed(6));
            
            console.log('Map location set:', lat, lng);
            
        } catch (error) {
            console.error('Error setting map location:', error);
            // Зберігаємо координати навіть якщо карта не працює
            $('#liftLat').val(lat);
            $('#liftLng').val(lng);
        }
    }

    handlePhotoUpload(event) {
        const files = Array.from(event.target.files);
        const maxFiles = 10;
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (files.length > maxFiles) {
            this.showToast(`Максимум ${maxFiles} фотографій дозволено`, 'warning');
            return;
        }
        
        const validFiles = files.filter(file => {
            if (file.size > maxSize) {
                this.showToast(`Файл ${file.name} занадто великий (більше 5MB)`, 'warning');
                return false;
            }
            return true;
        });
        
        this.photos = validFiles;
        this.displayPhotoPreview(validFiles);
    }

    displayPhotoPreview(files) {
        const previewContainer = $('#photoPreview');
        const gallery = $('#photoGallery');
        
        if (files.length === 0) {
            previewContainer.hide();
            return;
        }
        
        gallery.empty();
        previewContainer.show();
        
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const photoDiv = $(`
                    <div class="photo-preview-item mr-2 mb-2" style="position: relative;">
                        <img src="${e.target.result}" class="img-thumbnail" style="width: 100px; height: 100px; object-fit: cover;">
                        <button type="button" class="btn btn-sm btn-danger photo-remove" data-index="${index}" 
                                style="position: absolute; top: -5px; right: -5px; border-radius: 50%; width: 25px; height: 25px; padding: 0;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `);
                gallery.append(photoDiv);
            };
            reader.readAsDataURL(file);
        });
        
        // Обробник видалення фото
        gallery.on('click', '.photo-remove', (e) => {
            const index = parseInt($(e.currentTarget).data('index'));
            this.removePhoto(index);
        });
    }

    removePhoto(index) {
        this.photos.splice(index, 1);
        this.displayPhotoPreview(this.photos);
        
        // Оновлюємо input file
        const dt = new DataTransfer();
        this.photos.forEach(file => dt.items.add(file));
        $('#liftPhotos')[0].files = dt.files;
    }

    addIntervention() {
        const interventionHtml = `
            <div class="intervention-item border p-3 mb-3 rounded">
                <div class="row">
                    <div class="col-md-3">
                        <div class="form-group">
                            <label>Дата втручання</label>
                            <input type="date" class="form-control intervention-date" required>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label>Тип втручання</label>
                            <select class="form-control intervention-type" required>
                                <option value="">Оберіть тип...</option>
                                <option value="maintenance">Планове ТО</option>
                                <option value="repair">Ремонт</option>
                                <option value="emergency">Аварійний виклик</option>
                                <option value="inspection">Інспекція</option>
                                <option value="modernization">Модернізація</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label>Технік</label>
                            <select class="form-control intervention-tech">
                                <option value="">Не вказано</option>
                                <option value="tech1">Іван Петренко</option>
                                <option value="tech2">Олег Коваленко</option>
                                <option value="tech3">Андрій Сидоренко</option>
                                <option value="tech4">Василь Шевченко</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label>Статус</label>
                            <select class="form-control intervention-status" required>
                                <option value="completed">Завершено</option>
                                <option value="in-progress">В процесі</option>
                                <option value="scheduled">Заплановано</option>
                                <option value="cancelled">Скасовано</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-9">
                        <div class="form-group">
                            <label>Опис втручання</label>
                            <textarea class="form-control intervention-description" rows="2" placeholder="Детальний опис виконаних робіт..."></textarea>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label>Вартість</label>
                            <div class="input-group">
                                <input type="number" class="form-control intervention-cost" min="0" step="0.01" placeholder="0.00">
                                <div class="input-group-append">
                                    <span class="input-group-text">₴</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12">
                        <button type="button" class="btn btn-sm btn-danger remove-intervention">
                            <i class="fas fa-trash"></i> Видалити втручання
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        $('#interventionHistory').append(interventionHtml);
        
        // Обробник видалення втручання
        $('#interventionHistory').on('click', '.remove-intervention', function() {
            $(this).closest('.intervention-item').remove();
        });
    }

    calculateNextMaintenance() {
        const lastMaintenance = $('#lastMaintenance').val();
        const frequency = parseInt($('#inspectionFrequency').val());
        
        if (lastMaintenance && frequency) {
            const lastDate = new Date(lastMaintenance);
            const nextDate = new Date(lastDate);
            nextDate.setMonth(nextDate.getMonth() + frequency);
            
            $('#nextMaintenance').val(nextDate.toISOString().split('T')[0]);
        }
    }

    formatPostalCode(event) {
        let value = event.target.value.replace(/\D/g, '');
        if (value.length > 5) {
            value = value.substring(0, 4) + '-' + value.substring(4, 7);
        }
        event.target.value = value;
    }

    formatPhoneNumber(event) {
        let value = event.target.value.replace(/\D/g, '');
        if (value.startsWith('380')) {
            value = '+' + value;
        } else if (value.startsWith('0')) {
            value = '+38' + value;
        }
        event.target.value = value;
    }

    updateStatusBasedOnTechnician() {
        const technicianId = $('#assignedTechnician').val();
        const currentStatus = $('#liftStatus').val();
        
        if (technicianId && currentStatus === '') {
            $('#liftStatus').val('active');
        }
    }

    onModalShow() {
        const liftId = $('#liftId').val();
        if (liftId) {
            $('#interventionCard').show();
            this.loadInterventionHistory(liftId);
        } else {
            $('#interventionCard').hide();
        }
    }

    async loadInterventionHistory(liftId) {
        try {
            // Тут би мав бути запит до API для завантаження історії втручань
            // Поки що показуємо приклад
            const sampleInterventions = [
                {
                    date: '2024-01-15',
                    type: 'maintenance',
                    technician: 'tech1',
                    status: 'completed',
                    description: 'Планове технічне обслуговування',
                    cost: 1200.00
                }
            ];
            
            this.displayInterventionHistory(sampleInterventions);
        } catch (error) {
            console.error('Error loading intervention history:', error);
        }
    }

    displayInterventionHistory(interventions) {
        const container = $('#interventionHistory');
        container.empty();
        
        interventions.forEach(intervention => {
            // Код для відображення кожного втручання
            this.addInterventionFromData(intervention);
        });
    }

    addInterventionFromData(intervention) {
        // Додає втручання з існуючих даних
        this.addIntervention();
        const lastItem = $('#interventionHistory .intervention-item').last();
        
        lastItem.find('.intervention-date').val(intervention.date);
        lastItem.find('.intervention-type').val(intervention.type);
        lastItem.find('.intervention-tech').val(intervention.technician);
        lastItem.find('.intervention-status').val(intervention.status);
        lastItem.find('.intervention-description').val(intervention.description);
        lastItem.find('.intervention-cost').val(intervention.cost);
    }

    previewData() {
        const data = this.collectFormData();
        const previewHtml = this.generatePreviewHtml(data);
        
        // Показуємо попередній перегляд в окремому модальному вікні
        const previewModal = $(`
            <div class="modal fade" id="previewModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-info">
                            <h5 class="modal-title">Попередній перегляд даних ліфта</h5>
                            <button type="button" class="close" data-dismiss="modal">
                                <span>&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            ${previewHtml}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Закрити</button>
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        $('body').append(previewModal);
        previewModal.modal('show');
        
        previewModal.on('hidden.bs.modal', function() {
            $(this).remove();
        });
    }

    generatePreviewHtml(data) {
        return `
            <div class="row">
                <div class="col-md-6">
                    <h6>Основна інформація</h6>
                    <ul class="list-unstyled">
                        <li><strong>Муніципальний №:</strong> ${data.municipalNumber || 'Не вказано'}</li>
                        <li><strong>Серійний номер:</strong> ${data.serialNumber || 'Не вказано'}</li>
                        <li><strong>Бренд:</strong> ${data.brand || 'Не вказано'}</li>
                        <li><strong>Модель:</strong> ${data.model || 'Не вказано'}</li>
                        <li><strong>Тип:</strong> ${data.type || 'Не вказано'}</li>
                    </ul>
                </div>
                <div class="col-md-6">
                    <h6>Технічні характеристики</h6>
                    <ul class="list-unstyled">
                        <li><strong>Місткість:</strong> ${data.capacity || 'Не вказано'} осіб</li>
                        <li><strong>Швидкість:</strong> ${data.speed || 'Не вказано'} м/с</li>
                        <li><strong>Поверхи:</strong> ${data.floorsCount || 'Не вказано'}</li>
                        <li><strong>Двері:</strong> ${data.doorsCount || 'Не вказано'}</li>
                        <li><strong>Рік встановлення:</strong> ${data.installationYear || 'Не вказано'}</li>
                    </ul>
                </div>
            </div>
            <hr>
            <div class="row">
                <div class="col-md-6">
                    <h6>Розташування</h6>
                    <ul class="list-unstyled">
                        <li><strong>Адреса:</strong> ${data.address || 'Не вказано'}</li>
                        <li><strong>Поштовий код:</strong> ${data.postcode || 'Не вказано'}</li>
                        <li><strong>Координати:</strong> ${data.lat && data.lng ? `${data.lat}, ${data.lng}` : 'Не вказано'}</li>
                    </ul>
                </div>
                <div class="col-md-6">
                    <h6>Клієнт</h6>
                    <ul class="list-unstyled">
                        <li><strong>Ім'я:</strong> ${data.clientName || 'Не вказано'}</li>
                        <li><strong>Email:</strong> ${data.clientEmail || 'Не вказано'}</li>
                        <li><strong>Телефон:</strong> ${data.clientPhone || 'Не вказано'}</li>
                    </ul>
                </div>
            </div>
        `;
    }

    async generateQRCode() {
        const liftData = this.collectFormData();
        const qrData = {
            id: this.currentLiftId || 'new',
            municipalNumber: liftData.municipalNumber,
            address: liftData.address,
            status: liftData.status,
            url: `${window.location.origin}/pages/qr/lift-info.html?id=${this.currentLiftId || 'new'}`
        };

        try {
            const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            $('#liftQrCode').html(`
                <img src="${qrCodeDataURL}" class="img-fluid" alt="QR Code">
                <p class="mt-2 small text-muted">QR код для швидкого доступу до інформації про ліфт</p>
            `);
            $('#qrSection').show();
            $('#generateQrBtn').hide();
            
            this.showToast('QR код успішно створено', 'success');
        } catch (error) {
            console.error('Error generating QR code:', error);
            this.showToast('Помилка створення QR коду', 'error');
        }
    }

    collectFormData() {
        const interventions = [];
        $('#interventionHistory .intervention-item').each(function() {
            interventions.push({
                date: $(this).find('.intervention-date').val(),
                type: $(this).find('.intervention-type').val(),
                technician: $(this).find('.intervention-tech').val(),
                status: $(this).find('.intervention-status').val(),
                description: $(this).find('.intervention-description').val(),
                cost: $(this).find('.intervention-cost').val()
            });
        });

        return {
            id: $('#liftId').val(),
            municipalNumber: $('#municipalNumber').val(),
            serialNumber: $('#serialNumber').val(),
            brand: $('#liftBrand').val(),
            model: $('#liftModel').val(),
            type: $('#liftType').val(),
            capacity: $('#liftCapacity').val(),
            speed: $('#liftSpeed').val(),
            floorsCount: $('#floorsCount').val(),
            doorsCount: $('#doorsCount').val(),
            installationYear: $('#installationYear').val(),
            address: $('#liftAddress').val(),
            postcode: $('#liftPostcode').val(),
            buildingName: $('#buildingName').val(),
            floorLocation: $('#floorLocation').val(),
            accessCode: $('#accessCode').val(),
            lat: $('#liftLat').val(),
            lng: $('#liftLng').val(),
            clientName: $('#clientName').val(),
            clientEmail: $('#clientEmail').val(),
            clientPhone: $('#clientPhone').val(),
            contactPerson: $('#contactPerson').val(),
            clientNotes: $('#clientNotes').val(),
            assignedTechnician: $('#assignedTechnician').val(),
            status: $('#liftStatus').val(),
            lastMaintenance: $('#lastMaintenance').val(),
            nextMaintenance: $('#nextMaintenance').val(),
            inspectionFrequency: $('#inspectionFrequency').val(),
            maintenanceNotes: $('#maintenanceNotes').val(),
            qrAccessLevel: $('#qrAccessLevel').val(),
            enableQrTracking: $('#enableQrTracking').is(':checked'),
            photos: this.photos,
            interventions: interventions
        };
    }

    async submitForm(event) {
        event.preventDefault();
        console.log('🔄 submitForm started');
        
        if (!this.validateForm()) {
            console.log('❌ Form validation failed');
            return;
        }
        console.log('✅ Form validation passed');

        const formData = this.collectFormData();
        console.log('📝 Form data collected:', formData);
        const submitBtn = $('button[type="submit"]');
        
        try {
            console.log('🔄 Starting save process...');
            submitBtn.html('<i class="fas fa-spinner fa-spin"></i> Збереження...').prop('disabled', true);
            
            // Конвертуємо дані в формат, сумісний з існуючою системою
            const liftData = this.convertToLiftFormat(formData);
            console.log('🔄 Converted lift data:', liftData);
            
            // Зберігаємо через існуючу систему
            await this.saveLiftData(liftData);
            console.log('✅ Lift saved successfully');
            
            this.showToast('Ліфт успішно збережено', 'success');
            $('#liftModal').modal('hide');
            
            // Оновлюємо список ліфтів
            if (window.liftManager && typeof window.liftManager.loadLifts === 'function') {
                window.liftManager.loadLifts();
            }
            
        } catch (error) {
            console.error('❌ Error saving lift:', error);
            this.showToast('Помилка збереження ліфта: ' + error.message, 'error');
        } finally {
            console.log('🔄 Restoring submit button');
            submitBtn.html('<i class="fas fa-save"></i> Зберегти ліфт').prop('disabled', false);
        }
    }

    convertToLiftFormat(formData) {
        // Конвертуємо дані в формат, сумісний з існуючою системою
        const now = new Date().toISOString();
        
        return {
            id: formData.id || this.generateUniqueId(),
            municipalNumber: formData.municipalNumber,
            serial: formData.serialNumber,
            brand: formData.brand,
            model: formData.model,
            type: formData.type || 'passenger', // За замовчуванням пасажирський
            capacity: parseInt(formData.capacity) || 8, // За замовчуванням 8 осіб
            speed: parseFloat(formData.speed) || 1.0, // За замовчуванням 1 м/с
            floorsCount: parseInt(formData.floorsCount) || 5, // За замовчуванням 5 поверхів
            doorsCount: parseInt(formData.doorsCount) || 2,
            installationYear: parseInt(formData.installationYear) || new Date().getFullYear(),
            address: formData.address,
            postcode: formData.postcode || formData.postCode || '',
            buildingName: formData.buildingName || '',
            floorLocation: formData.floorLocation || 'ground',
            accessCode: formData.accessCode || '',
            lat: parseFloat(formData.lat) || null,
            lng: parseFloat(formData.lng) || null,
            clientName: formData.clientName || 'Невказано',
            clientEmail: formData.clientEmail || '',
            clientPhone: formData.clientPhone || '',
            contactPerson: formData.contactPerson || '',
            clientNotes: formData.clientNotes || '',
            tech: formData.assignedTechnician || 'auto',
            status: formData.status || 'operational',
            lastInspection: formData.lastMaintenance || null,
            nextInspection: formData.nextMaintenance || null,
            inspectionFrequency: parseInt(formData.inspectionFrequency) || 6,
            maintenanceNotes: formData.maintenanceNotes || '',
            qrAccessLevel: formData.qrAccessLevel || 'public',
            enableQrTracking: formData.enableQrTracking !== false,
            interventionHistory: formData.interventions || [],
            photos: this.photos || [],
            inspectionHistory: [],
            chat: [],
            createdAt: formData.id ? undefined : now, // Не змінюємо дату створення для існуючих
            updatedAt: now
        };
    }

    async saveLiftData(liftData) {
        try {
            console.log('Saving lift data:', liftData);
            
            // Використовуємо глобальну змінну allLifts
            if (typeof allLifts === 'undefined') {
                throw new Error('allLifts не визначено');
            }
            
            // Перевіряємо, чи це редагування існуючого ліфта
            const existingIndex = allLifts.findIndex(l => l.id === liftData.id);
            
            if (existingIndex !== -1) {
                // Оновлюємо існуючий ліфт
                allLifts[existingIndex] = { ...allLifts[existingIndex], ...liftData };
                console.log('Updated existing lift at index:', existingIndex);
            } else {
                // Додаємо новий ліфт
                allLifts.push(liftData);
                console.log('Added new lift. Total lifts:', allLifts.length);
            }
            
            // Зберігаємо в localStorage через CommonUtils
            if (typeof CommonUtils !== 'undefined' && CommonUtils.saveLifts) {
                const saved = CommonUtils.saveLifts(allLifts);
                if (!saved) {
                    throw new Error('Помилка збереження в localStorage');
                }
            } else {
                // Fallback - пряме збереження в localStorage
                localStorage.setItem('lifts', JSON.stringify(allLifts));
            }
            
            console.log('Lift saved successfully');
            return true;
            
        } catch (error) {
            console.error('Error in saveLiftData:', error);
            throw error;
        }
    }

    generateUniqueId() {
        return 'lift_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    validateForm() {
        console.log('🔍 Starting form validation...');
        // Тільки найважливіші поля є обов'язковими
        const requiredFields = [
            { id: '#municipalNumber', name: 'Муніципальний номер' },
            { id: '#serialNumber', name: 'Серійний номер' },
            { id: '#liftBrand', name: 'Бренд' },
            { id: '#liftModel', name: 'Модель' },
            { id: '#liftAddress', name: 'Адреса' }
        ];

        let isValid = true;
        let firstErrorField = null;
        let emptyFields = [];

        requiredFields.forEach(field => {
            const element = $(field.id);
            const value = element.val() ? element.val().trim() : '';
            
            if (!value) {
                element.addClass('is-invalid');
                if (!element.next('.invalid-feedback').length) {
                    element.after(`<div class="invalid-feedback">Поле "${field.name}" обов'язкове</div>`);
                }
                
                if (!firstErrorField) {
                    firstErrorField = element;
                }
                emptyFields.push(field.name);
                isValid = false;
            } else {
                element.removeClass('is-invalid');
                element.next('.invalid-feedback').remove();
            }
        });

        if (emptyFields.length > 0) {
            console.log('❌ Empty required fields:', emptyFields);
        } else {
            console.log('✅ All required fields filled');
        }

        // Додаткова валідація email
        const email = $('#clientEmail').val();
        if (email && !this.isValidEmail(email)) {
            $('#clientEmail').addClass('is-invalid');
            if (!$('#clientEmail').next('.invalid-feedback').length) {
                $('#clientEmail').after('<div class="invalid-feedback">Некоректний формат email</div>');
            }
            isValid = false;
        }

        if (!isValid && firstErrorField) {
            firstErrorField.focus();
            this.showToast('Заповніть всі обов\'язкові поля', 'warning');
        }

        return isValid;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }



    async loadTechniciansData() {
        // Тут би мав бути запит до API для завантаження списку техніків
        // Поки що використовуємо статичні дані
        const technicians = [
            { id: 'tech1', name: 'Іван Петренко' },
            { id: 'tech2', name: 'Олег Коваленко' },
            { id: 'tech3', name: 'Андрій Сидоренко' },
            { id: 'tech4', name: 'Василь Шевченко' }
        ];
        
        const select = $('#assignedTechnician');
        technicians.forEach(tech => {
            select.append(`<option value="${tech.id}">${tech.name}</option>`);
        });
    }

    async loadLiftData(liftId) {
        try {
            this.currentLiftId = liftId;
            $('#liftId').val(liftId);
            
            // Завантажуємо реальні дані з allLifts
            let liftData = null;
            
            if (typeof allLifts !== 'undefined') {
                liftData = allLifts.find(lift => lift.id === liftId);
            }
            
            if (!liftData) {
                throw new Error(`Ліфт з ID ${liftId} не знайдено`);
            }
            
            // Конвертуємо дані в формат форми
            const formData = this.convertFromLiftFormat(liftData);
            this.populateForm(formData);
            
        } catch (error) {
            console.error('Error loading lift data:', error);
            this.showToast('Помилка завантаження даних ліфта', 'error');
        }
    }

    convertFromLiftFormat(liftData) {
        // Конвертуємо дані з формату allLifts в формат форми
        return {
            id: liftData.id,
            municipalNumber: liftData.municipalNumber || liftData.municipal_number || '',
            serialNumber: liftData.serial || '',
            brand: liftData.brand || '',
            model: liftData.model || '',
            type: liftData.type || '',
            capacity: liftData.capacity || '',
            speed: liftData.speed || '',
            floorsCount: liftData.floorsCount || '',
            doorsCount: liftData.doorsCount || 2,
            installationYear: liftData.installationYear || '',
            address: liftData.address || '',
            postcode: liftData.postcode || liftData.postCode || '',
            buildingName: liftData.buildingName || '',
            floorLocation: liftData.floorLocation || '',
            accessCode: liftData.accessCode || '',
            lat: liftData.lat || '',
            lng: liftData.lng || '',
            clientName: liftData.clientName || liftData.client || '',
            clientEmail: liftData.clientEmail || '',
            clientPhone: liftData.clientPhone || '',
            contactPerson: liftData.contactPerson || '',
            clientNotes: liftData.clientNotes || '',
            assignedTechnician: liftData.tech || liftData.assignedTechnician || '',
            status: liftData.status || 'active',
            lastMaintenance: liftData.lastInspection || liftData.lastMaintenance || '',
            nextMaintenance: liftData.nextInspection || liftData.nextMaintenance || '',
            inspectionFrequency: liftData.inspectionFrequency || 6,
            maintenanceNotes: liftData.maintenanceNotes || '',
            qrAccessLevel: liftData.qrAccessLevel || 'public',
            enableQrTracking: liftData.enableQrTracking !== false,
            interventions: liftData.interventionHistory || []
        };
    }

    populateForm(data) {
        // Заповнюємо всі поля форми
        Object.keys(data).forEach(key => {
            const element = $(`#${key}`);
            if (element.length) {
                if (element.is(':checkbox')) {
                    element.prop('checked', data[key]);
                } else {
                    element.val(data[key]);
                }
            }
        });

        // Встановлюємо маркер на карті
        if (data.lat && data.lng) {
            this.setMapLocation(data.lat, data.lng);
        }

        // Показуємо кнопку генерації QR коду для існуючих ліфтів
        $('#generateQrBtn').show();
        $('#interventionCard').show();
    }

    resetForm() {
        console.log('Resetting form for new lift');
        
        // Очищуємо форму
        $('#liftForm')[0].reset();
        $('#liftId').val('');
        $('#photoPreview').hide();
        $('#qrSection').hide();
        $('#generateQrBtn').show();
        $('#interventionHistory').empty();
        $('#interventionCard').hide(); // Ховаємо для нових ліфтів
        
        // Очищуємо валідацію
        $('.is-invalid').removeClass('is-invalid');
        $('.invalid-feedback').remove();
        
        // Очищуємо карту
        if (this.map && this.marker) {
            this.map.removeLayer(this.marker);
            this.marker = null;
        }
        
        // Встановлюємо значення за замовчуванням
        $('#doorsCount').val(2);
        $('#inspectionFrequency').val(6);
        $('#qrAccessLevel').val('public');
        $('#enableQrTracking').prop('checked', true);
        
        // Очищуємо фотографії
        this.photos = [];
        this.currentLiftId = null;
        
        console.log('Form reset completed');
    }

    showToast(message, type = 'info') {
        const toastId = 'toast-' + Date.now();
        const toastClass = {
            'success': 'bg-success',
            'error': 'bg-danger',
            'warning': 'bg-warning',
            'info': 'bg-info'
        }[type] || 'bg-info';

        const toast = $(`
            <div class="toast ${toastClass} text-white" id="${toastId}" role="alert" data-delay="4000">
                <div class="toast-body">
                    ${message}
                    <button type="button" class="ml-2 mb-1 close text-white" data-dismiss="toast">
                        <span>&times;</span>
                    </button>
                </div>
            </div>
        `);

        $('#toastContainer').append(toast);
        toast.toast('show');
        
        toast.on('hidden.bs.toast', function() {
            $(this).remove();
        });
    }
}

// Функція для тестування збереження
function testLiftSave() {
    console.log('🧪 Testing lift save functionality...');
    
    // Перевіримо чи доступні необхідні компоненти
    console.log('📋 System check:');
    console.log('- allLifts available:', typeof allLifts !== 'undefined', allLifts?.length || 0);
    console.log('- CommonUtils available:', typeof CommonUtils !== 'undefined');
    console.log('- enhancedLiftModal available:', typeof window.enhancedLiftModal !== 'undefined');
    
    if (typeof allLifts === 'undefined') {
        console.error('❌ allLifts not defined!');
        return false;
    }
    
    // Створюємо тестові дані
    const testLift = {
        id: 'test_' + Date.now(),
        municipalNumber: 'TEST-SAVE-001',
        serial: 'SER-TEST-001',
        brand: 'TestBrand',
        model: 'TestModel',
        type: 'passenger',
        capacity: 8,
        speed: 1.0,
        floorsCount: 5,
        doorsCount: 2,
        installationYear: 2024,
        address: 'Тестова адреса для збереження',
        postcode: '01001',
        buildingName: 'Тестовий будинок',
        floorLocation: 'ground',
        accessCode: '',
        lat: null,
        lng: null,
        clientName: 'Тестовий клієнт',
        clientEmail: '',
        clientPhone: '',
        contactPerson: '',
        clientNotes: '',
        tech: 'auto',
        status: 'operational',
        lastInspection: null,
        nextInspection: null,
        inspectionFrequency: 6,
        maintenanceNotes: '',
        qrAccessLevel: 'public',
        enableQrTracking: true,
        interventionHistory: [],
        photos: [],
        inspectionHistory: [],
        chat: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    try {
        console.log('🔄 Adding test lift to allLifts array...');
        const beforeCount = allLifts.length;
        allLifts.push(testLift);
        console.log('✅ Lift added to memory. Before:', beforeCount, 'After:', allLifts.length);
        
        console.log('💾 Saving to localStorage...');
        if (typeof CommonUtils !== 'undefined' && CommonUtils.saveLifts) {
            const saved = CommonUtils.saveLifts(allLifts);
            console.log('CommonUtils.saveLifts result:', saved);
        } else {
            localStorage.setItem('lifts', JSON.stringify(allLifts));
            console.log('Direct localStorage save completed');
        }
        
        // Перевіримо збереження
        const stored = localStorage.getItem('lifts');
        if (stored) {
            const parsed = JSON.parse(stored);
            const found = parsed.find(l => l.id === testLift.id);
            if (found) {
                console.log('✅ Test lift successfully saved and found in localStorage!');
                return true;
            } else {
                console.error('❌ Test lift not found in localStorage');
                return false;
            }
        } else {
            console.error('❌ No data in localStorage');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error during test save:', error);
        return false;
    }
}

// Додаємо тестову функцію до глобального контексту
window.testLiftSave = testLiftSave;

// Ініціалізація при завантаженні сторінки
$(document).ready(function() {
    console.log('Initializing Enhanced Lift Modal...');
    window.enhancedLiftModal = new EnhancedLiftModal();
    console.log('Enhanced Lift Modal initialized successfully');
    
    // Додаємо тестову кнопку в режимі розробки
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🔧 Development mode detected - adding test button');
        setTimeout(() => {
            if ($('#test-save-lift').length === 0) {
                $('body').append(`
                    <button id="test-save-lift" style="
                        position: fixed; 
                        top: 10px; 
                        right: 10px; 
                        z-index: 9999; 
                        background: #28a745; 
                        color: white; 
                        border: none; 
                        padding: 10px 15px; 
                        border-radius: 5px;
                        font-size: 12px;
                    " onclick="testLiftSave()">🧪 Тест збереження</button>
                `);
            }
        }, 1000);
    }
});