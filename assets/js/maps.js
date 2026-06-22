// assets/js/maps.js
$(document).ready(function() {
    // Функція для завантаження ліфтів з localStorage
    function loadLiftsFromStorage() {
        try {
            const lifts = JSON.parse(localStorage.getItem('lifts')) || [];
            return lifts.filter(lift => lift.lat && lift.lng); // Тільки ліфти з координатами
        } catch (error) {
            console.error('Erro завантаження ліфтів:', error);
            return [];
        }
    }

    // Функція для отримання кольору статусу
    function getStatusColor(status) {
        switch (status) {
            case 'active': return 'green';
            case 'maintenance': return 'orange';
            case 'inactive': return 'red';
            case 'operational': return 'blue';
            default: return 'gray';
        }
    }

    // Функція для отримання мітки статусу
    function getStatusLabel(status) {
        const labels = {
            'active': 'Ativo',
            'maintenance': 'Manutenção',
            'inactive': 'Inativo',
            'operational': 'Em funcionamento'
        };
        return labels[status] || status;
    }

    // Ініціалізація карти
    const map = L.map('liftsMap').setView([38.7223, -9.1393], 13); // Лісабон
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    let markers = [];
    let routeLayer = null;

    // Функція для оновлення маркерів на карті
    function updateMapMarkers() {
        // Очищення існуючих маркерів
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];

        // Очищення списку для маршрутів
        $('#routeToLift').empty();
        $('#routeToLift').append('<option value="">Оберіть ліфт...</option>');

        // A carregar та відображення ліфтів
        const lifts = loadLiftsFromStorage();

        if (lifts.length === 0) {
            console.log('Немає ліфтів з координатами для відображення на карті');
            return;
        }

        lifts.forEach(lift => {
            const statusColor = getStatusColor(lift.status);
            const marker = L.marker([lift.lat, lift.lng]).addTo(map)
                .bindPopup(`
                    <div class="lift-popup">
                        <h6><i class="fas fa-elevator"></i> ${lift.model}</h6>
                        <p><strong>ID:</strong> ${lift.id}</p>
                        <p><strong>Endereço:</strong> ${lift.location || lift.address || 'Desconhecido'}</p>
                        <p><strong>Estado:</strong> <span style="color: ${statusColor}">${getStatusLabel(lift.status)}</span></p>
                        <p><strong>Cliente:</strong> ${lift.clientName || 'Desconhecido'}</p>
                        <p><strong>Última manutenção:</strong> ${lift.lastMaintenance ? new Date(lift.lastMaintenance).toLocaleDateString('pt-PT') : 'Desconhecido'}</p>
                        <button class="btn btn-primary btn-sm" onclick="window.open('lifts.html', '_blank')">Ver</button>
                    </div>
                `, {
                    maxWidth: 300
                });

            markers.push(marker);

            // Додавання до списку для маршрутів
            $('#routeToLift').append(`<option value="${lift.lat},${lift.lng}">${lift.model} (${lift.location || lift.address || lift.id})</option>`);
        });

        // Підгонка карти до всіх маркерів, якщо їх більше одного
        if (markers.length > 1) {
            const group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.1));
        } else if (markers.length === 1) {
            map.setView([lifts[0].lat, lifts[0].lng], 15);
        }

        console.log(`Відображено ${markers.length} ліфтів на карті`);
    }

    // Початкове завантаження маркерів
    updateMapMarkers();
    updateLastUpdateTime();

    // Обробник кнопки оновлення карти
    $('#btnRefreshMap').click(function() {
        const btn = $(this);
        const originalHtml = btn.html();
        btn.html('<i class="fas fa-spinner fa-spin"></i> Atualização...').prop('disabled', true);

        setTimeout(() => {
            updateMapMarkers();
            updateLastUpdateTime();
            btn.html(originalHtml).prop('disabled', false);
        }, 500);
    });

    // Функція для оновлення часу останнього оновлення
    function updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('pt-PT', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        $('#lastUpdate').text(timeString);
    }
    $('#btnGeocode').click(function() {
        const address = $('#addressInput').val().trim();
        if (!address) {
            toastr.info('Введіть адресу!');
            return;
        }

        // Показати індикатор завантаження
        const btn = $(this);
        const originalText = btn.html();
        btn.html('<i class="fas fa-spinner fa-spin"></i> Pesquisa...').prop('disabled', true);

        $.get('https://nominatim.openstreetmap.org/search', {
            q: address,
            format: 'json',
            addressdetails: 1,
            limit: 1
        }, function(data) {
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                map.setView([lat, lon], 16);
                L.marker([lat, lon]).addTo(map)
                    .bindPopup('Знайдено: ' + address)
                    .openPopup();
            } else {
                toastr.info('Адресу не знайдено!');
            }
        }).fail(function() {
            toastr.error('Erro пошуку адреси. Перевірте інтернет-з\'єднання.');
        }).always(function() {
            btn.html(originalText).prop('disabled', false);
        });
    });

    // Прокладання маршруту (від поточної позиції до ліфта)
    $('#btnRoute').click(function() {
        const selectedLift = $('#routeToLift').val();
        if (!selectedLift) {
            toastr.info('Оберіть ліфт для прокладання маршруту!');
            return;
        }

        if (routeLayer) map.removeLayer(routeLayer);

        if (!navigator.geolocation) {
            toastr.info('Geolocalização não suportada pelo seu browser');
            return;
        }

        // Показати індикатор завантаження
        const btn = $(this);
        const originalText = btn.html();
        btn.html('<i class="fas fa-spinner fa-spin"></i> Визначення...').prop('disabled', true);

        navigator.geolocation.getCurrentPosition(function(pos) {
            const start = [pos.coords.latitude, pos.coords.longitude];
            const end = selectedLift.split(',').map(Number);

            // Створення простої лінії маршруту (в реальному додатку використовуйте routing API)
            routeLayer = L.polyline([start, end], {
                color: 'blue',
                weight: 5,
                opacity: 0.7
            }).addTo(map);

            // Додавання маркерів початку та кінця
            L.marker(start).addTo(map).bindPopup('Ваше місцезнаходження').openPopup();
            L.marker(end).addTo(map).bindPopup('Elevador').openPopup();

            // Підгонка карти до маршруту
            map.fitBounds([start, end], { padding: [20, 20] });

            btn.html(originalText).prop('disabled', false);
        }, function(error) {
            console.error('Erro геолокації:', error);
            let errorMessage = 'Не вдалося отримати ваше місцезнаходження';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Доступ до геолокації заборонено. Дозвольте доступ у налаштуваннях браузера.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Інформація про місцезнаходження недоступна.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Час очікування визначення місцезнаходження минув.';
                    break;
            }
            toastr.error(errorMessage);
            btn.html(originalText).prop('disabled', false);
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
        });
    });

    // Функція для оновлення карти (можна викликати ззовні)
    window.updateLiftsMap = function() {
        updateMapMarkers();
    };

    // Atualização карти при фокусі на вікні (якщо користувач повернувся з іншої сторінки)
    $(window).focus(function() {
        updateMapMarkers();
        updateLastUpdateTime();
    });

    // Прослуховування змін у localStorage (для синхронізації між сторінками)
    $(window).on('storage', function(e) {
        if (e.originalEvent.key === 'lifts') {
            console.log('Дані ліфтів оновлено в іншій вкладці, оновлюємо карту...');
            updateMapMarkers();
            updateLastUpdateTime();
        }
    });

    // Períodoичне оновлення карти (кожні 30 секунд)
    setInterval(function() {
        const lifts = loadLiftsFromStorage();
        const currentMarkersCount = markers.length;

        if (lifts.length !== currentMarkersCount) {
            console.log('Кількість ліфтів змінилася, оновлюємо карту...');
            updateMapMarkers();
            updateLastUpdateTime();
        }
    }, 30000);
});
