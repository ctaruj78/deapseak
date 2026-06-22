/**
 * 🔄 A carregar профілю клієнта для profile.html
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
     * A carregar даних користувача з API
     */
    async function loadUserProfile() {
        try {
            console.log('📡 A carregar профілю з /api/users/me...');
            
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
            console.error('❌ Erro завантаження профілю:', error);
            showError('Não foi possível carregar os dados do perfil');
            return null;
        }
    }

    /**
     * Atualização UI з даними користувача
     */
    function updateProfileUI(user) {
        console.log('🎨 Atualização UI профілю...');

        // Nome в header профілю
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Cliente';
        $('#profileName').text(fullName);
        
        // Email в header
        $('#profileEmail').text(user.email || 'Email não disponível');
        
        // Nome в info tab
        $('#infoFullName').text(fullName);
        
        // Email в info tab
        $('#infoEmail').text(user.email || 'Email não disponível');
        
        // Telefone
        if (user.phone) {
            $('#infoPhone').text(user.phone);
        }
        
        // Empresa
        if (user.company || user.companyName) {
            $('#infoCompany').text(user.company || user.companyName);
        }
        
        // Endereço
        $('#infoAddress').text(user.address || '—');
        $('#infoCity').text(user.city || '—');
        $('#infoRegion').text(user.region || '—');
        $('#infoZip').text(user.zip || user.zipCode || '—');
        
        // Username в sidebar
        $('#clientName').text(user.firstName || user.username);
        $('#sidebarName').text(user.firstName || user.username);

        console.log('✅ UI оновлено');
    }

    /**
     * A carregar статистики клієнта
     */
    async function loadClientStats(userId) {
        try {
            console.log('📊 A carregar статистики клієнта...');

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
                console.log(`✅ Elevadorів: ${lifts.length}`);
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
            console.error('❌ Erro завантаження статистики:', error);
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
                title: 'Erro',
                text: message,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        } else {
            toastr.info(message);
        }
    }

    // Автоматичне завантаження при ініціалізації
    await loadUserProfile();

    // Exportarуємо функцію для повторного завантаження
    window.reloadClientProfile = loadUserProfile;

    console.log('✅ Профіль клієнта ініціалізовано');

})();
