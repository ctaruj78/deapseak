// assets/js/maps.js
$(document).ready(function() {
    // Геокодування адреси через Nominatim
    $('#btnGeocode').click(function() {
        const address = $('#addressInput').val().trim();
        if (!address) {
            alert('Введіть адресу!');
            return;
        }
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
                    .bindPopup('Координати для: ' + address)
                    .openPopup();
            } else {
                alert('Адресу не знайдено!');
            }
        });
    });
    // Моки для ліфтів (замінити на реальні дані)
    const lifts = window.allLifts || [
        { id: '1', model: 'Otis', lat: 50.4501, lng: 30.5234, address: 'Київ, вул. Хрещатик 1' },
        { id: '2', model: 'Schindler', lat: 50.4547, lng: 30.5238, address: 'Київ, вул. Лесі Українки 5' }
    ];
    const map = L.map('liftsMap').setView([50.4501, 30.5234], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    // Додаємо маркери ліфтів
    lifts.forEach(lift => {
        L.marker([lift.lat, lift.lng]).addTo(map)
            .bindPopup(`<b>${lift.model}</b><br>${lift.address}`);
        $('#routeToLift').append(`<option value="${lift.lat},${lift.lng}">${lift.model} (${lift.address})</option>`);
    });
    // Прокладання маршруту (від поточної позиції до ліфта)
    let routeLayer = null;
    $('#btnRoute').click(function() {
        if (routeLayer) map.removeLayer(routeLayer);
        if (!navigator.geolocation) {
            alert('Геолокація не підтримується');
            return;
        }
        navigator.geolocation.getCurrentPosition(function(pos) {
            const start = [pos.coords.latitude, pos.coords.longitude];
            const end = $('#routeToLift').val().split(',').map(Number);
            routeLayer = L.polyline([start, end], { color: 'blue', weight: 5 }).addTo(map);
            map.setView(start, 14);
            L.marker(start).addTo(map).bindPopup('Ваша позиція').openPopup();
        }, function() {
            alert('Не вдалося отримати вашу позицію');
        });
    });
});
