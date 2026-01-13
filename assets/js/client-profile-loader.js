/**
 * 🔄 Завантаження профілю клієнта для profile.html
 */

(async function() {
    'use strict';

    console.log('🔄 Ініціалізація завантаження профілю клієнта...');

    // Перевірка токену
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('⚠️ Токен відсутній, перенаправлення на логін');
        window.location.href = '/login.html';
        return;
    }

    /**
     * Завантаження даних користувача з API
     */
    async function loadUserProfile() {
        try {
            console.log('📡 Завантаження профілю з /api/users/me...');
            
            const response = await fetch('/api/users/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401 || response.status === 403) {
                console.error('❌ Токен недійсний, перенаправлення на логін');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('userData');
                window.location.href = '/login.html';
                return null;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const userData = await response.json();
            console.log('✅ Профіль завантажено:', userData);

            // Зберігаємо в localStorage (обидва ключі для сумісності)
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('userData', JSON.stringify(userData));

            // Оновлюємо UI
            updateProfileUI(userData);

            // Завантажуємо статистику
            await loadClientStats(userData.id);

            return userData;

        } catch (error) {
            console.error('❌ Помилка завантаження профілю:', error);
            showError('Не вдалося завантажити дані профілю');
            return null;
        }
    }

    /**
     * Оновлення UI з даними користувача
     */
    function updateProfileUI(user) {
        console.log('🎨 Оновлення UI профілю...');

        // Ім'я в header профілю
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Клієнт';
        $('#profileName').text(fullName);
        
        // Email в header
        $('#profileEmail').text(user.email || 'Немає email');
        
        // Ім'я в info tab
        $('#infoFullName').text(fullName);
        
        // Email в info tab
        $('#infoEmail').text(user.email || 'Немає email');
        
        // Телефон
        if (user.phone) {
            $('#infoPhone').text(user.phone);
        }
        
        // Компанія
        if (user.company || user.companyName) {
            $('#infoCompany').text(user.company || user.companyName);
        }
        
        // Username в sidebar
        $('#clientName').text(user.firstName || user.username);
        $('#sidebarName').text(user.firstName || user.username);

        console.log('✅ UI оновлено');
    }

    /**
     * Завантаження статистики клієнта
     */
    async function loadClientStats(userId) {
        try {
            console.log('📊 Завантаження статистики клієнта...');

            // Статистика ліфтів
            const liftsResponse = await fetch('/api/lifts', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (liftsResponse.ok) {
                const liftsData = await liftsResponse.json();
                const lifts = liftsData.data || liftsData.lifts || liftsData;
                $('#statsLifts').text(lifts.length || 0);
                console.log(`✅ Ліфтів: ${lifts.length}`);
            }

            // Статистика запитів
            const requestsResponse = await fetch('/api/requests?clientId=' + userId, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (requestsResponse.ok) {
                const requestsData = await requestsResponse.json();
                const requests = requestsData.data || requestsData.requests || requestsData;
                const activeRequests = requests.filter(r => r.status === 'pending' || r.status === 'in_progress');
                $('#statsRequests').text(activeRequests.length || 0);
                console.log(`✅ Активних запитів: ${activeRequests.length}`);
            }

            // Років з нами (з дати створення акаунта)
            const createdAt = new Date(localStorage.getItem('userCreatedAt') || Date.now());
            const years = Math.floor((Date.now() - createdAt) / (365 * 24 * 60 * 60 * 1000));
            $('#statsYears').text(years || '< 1');

        } catch (error) {
            console.error('❌ Помилка завантаження статистики:', error);
        }
    }

    /**
     * Показати помилку
     */
    function showError(message) {
        // Використовуємо Toast якщо доступно
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Помилка',
                text: message,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        } else {
            alert(message);
        }
    }

    // Автоматичне завантаження при ініціалізації
    await loadUserProfile();

    // Експортуємо функцію для повторного завантаження
    window.reloadClientProfile = loadUserProfile;

    console.log('✅ Профіль клієнта ініціалізовано');

})();
