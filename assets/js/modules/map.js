class MapManager {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = {
            center: [38.7223, -9.1393], // Lisboa за замовчуванням
            zoom: 13,
            ...options
        };
        this.map = null;
        this.markers = [];
        this.init();
    }

    async init() {
        try {
            // A carregar Leaflet CSS та JS
            await this.loadLeaflet();

            // Ініціалізація карти
            this.initMap();

        } catch (error) {
            console.error('Failed to initialize map:', error);
            this.showFallback();
        }
    }

    async loadLeaflet() {
        if (typeof L === 'undefined') {
            // A carregar CSS
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(cssLink);

            // A carregar JS
            await this.loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    initMap() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error('Map container not found:', this.containerId);
            return;
        }

        // Ініціалізація карти
        this.map = L.map(this.containerId).setView(this.options.center, this.options.zoom);

        // Додавання тайлів OpenStreetMap
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Додавання контролів
        this.addControls();

        console.log('Map initialized');
    }

    addControls() {
        // Кнопка геолокації
        const locateControl = L.control({ position: 'topright' });
        locateControl.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'leaflet-control-locate');
            div.innerHTML = '<button class="btn btn-primary btn-sm" onclick="mapManager.locateUser()"><i class="fas fa-crosshairs"></i></button>';
            return div;
        };
        locateControl.addTo(this.map);
    }

    // Додавання маркера
    addMarker(lat, lng, options = {}) {
        if (!this.map) return null;

        const marker = L.marker([lat, lng], options).addTo(this.map);

        if (options.popup) {
            marker.bindPopup(options.popup);
        }

        this.markers.push(marker);
        return marker;
    }

    // Додавання маркерів для ліфтів
    async addLiftMarkers() {
        try {
            const lifts = await LiftAPI.request('/lifts', 'GET');

            lifts.forEach(lift => {
                if (lift.location && lift.location.lat && lift.location.lng) {
                    const statusColor = this.getStatusColor(lift.status);
                    const popupContent = `
                        <div class="lift-popup">
                            <h6>${lift.name}</h6>
                            <p><strong>Endereço:</strong> ${lift.location.address || 'Desconhecido'}</p>
                            <p><strong>Estado:</strong> <span style="color: ${statusColor}">${lift.status}</span></p>
                            <p><strong>Останнє обслуговування:</strong> ${lift.lastMaintenance || 'Desconhecido'}</p>
                            <button class="btn btn-primary btn-sm" onclick="viewLiftDetails(${lift.id})">Ver</button>
                        </div>
                    `;

                    this.addMarker(lift.location.lat, lift.location.lng, {
                        popup: popupContent,
                        icon: this.createLiftIcon(statusColor)
                    });
                }
            });

            // Підгонка карти до всіх маркерів
            if (this.markers.length > 0) {
                const group = new L.featureGroup(this.markers);
                this.map.fitBounds(group.getBounds().pad(0.1));
            }

        } catch (error) {
            console.error('Failed to load lift markers:', error);
        }
    }

    createLiftIcon(color) {
        return L.divIcon({
            html: `<i class="fas fa-elevator" style="color: ${color}; font-size: 20px;"></i>`,
            className: 'lift-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });
    }

    getStatusColor(status) {
        switch (status) {
            case 'active': return '#28a745';
            case 'maintenance': return '#ffc107';
            case 'offline': return '#dc3545';
            default: return '#6c757d';
        }
    }

    // Геолокація користувача
    locateUser() {
        if (!navigator.geolocation) {
            NotificationManager.warning('Геолокація недоступна', 'Ваш браузер не підтримує геолокацію');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                this.map.setView([latitude, longitude], 16);

                // Додавання маркера поточного місцезнаходження
                L.marker([latitude, longitude], {
                    icon: L.divIcon({
                        html: '<i class="fas fa-user" style="color: #007bff; font-size: 20px;"></i>',
                        className: 'user-marker',
                        iconSize: [30, 30],
                        iconAnchor: [15, 30]
                    })
                }).addTo(this.map).bindPopup('Ваше місцезнаходження');
            },
            (error) => {
                console.error('Geolocation error:', error);
                NotificationManager.error('Erro геолокації', 'Не вдалося визначити ваше місцезнаходження');
            }
        );
    }

    // Очищення карти
    clearMarkers() {
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = [];
    }

    // Зміна центру карти
    setCenter(lat, lng, zoom = null) {
        if (this.map) {
            this.map.setView([lat, lng], zoom || this.map.getZoom());
        }
    }

    // Показати маршрут (якщо потрібно)
    showRoute(fromLat, fromLng, toLat, toLng) {
        // Тут можна додати інтеграцію з routing service
        console.log('Route from', [fromLat, fromLng], 'to', [toLat, toLng]);
    }

    // Fallback для випадків, коли карта не завантажилася
    showFallback() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div class="map-fallback">
                    <i class="fas fa-map-marked-alt fa-3x text-muted"></i>
                    <p class="mt-3">Карта тимчасово недоступна</p>
                    <small class="text-muted">Спробуйте перезавантажити сторінку</small>
                </div>
            `;
            container.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 400px;
                border: 1px solid #dee2e6;
                border-radius: 5px;
                background-color: #f8f9fa;
            `;
        }
    }

    // Отримання карти
    getMap() {
        return this.map;
    }
}

// Глобальна функція для перегляду деталей ліфта
function viewLiftDetails(liftId) {
    // Тут можна відкрити модальне вікно або перейти на сторінку ліфта
    console.log('View lift details:', liftId);
    NotificationManager.info('Перегляд ліфта', `Перегляд деталей ліфта ID: ${liftId}`);
}

// Ініціалізація
if (typeof window !== 'undefined') {
    window.MapManager = MapManager;
}

// Exportar для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapManager;
}