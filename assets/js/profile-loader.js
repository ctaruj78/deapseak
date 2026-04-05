/**
 * 👤 Універсальний завантажувач профілю користувача
 * Працює для всіх ролей: admin, client, dispatcher, tech
 */

(function() {
    'use strict';

    // Перевірка токену при завантаженні
    const token = sessionStorage.getItem('liftmanager_jwt')
               || localStorage.getItem('liftmanager_jwt')
               || sessionStorage.getItem('authToken')
               || localStorage.getItem('authToken');
    if (!token) {
        console.warn('⚠️ Токен відсутній, перенаправлення на логін');
        window.location.href = '/pages/auth/login.html';
        return;
    }

    /**
     * Завантаження даних користувача з API
     */
    async function loadUserProfile() {
        try {
            console.log('📡 Завантаження профілю користувача...');
            
            const response = await fetch('/api/users/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401 || response.status === 403) {
                console.error('❌ Токен недійсний, перенаправлення на логін');
                sessionStorage.removeItem('liftmanager_jwt');
                localStorage.removeItem('liftmanager_jwt');
                window.location.href = '/pages/auth/login.html';
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const userData = await response.json();
            console.log('✅ Профіль завантажено:', userData);

            // Зберігаємо в localStorage
            localStorage.setItem('user', JSON.stringify(userData));

            // Оновлюємо UI
            updateProfileUI(userData);

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
        // Ім'я користувача
        const nameElements = document.querySelectorAll('[data-user-name]');
        nameElements.forEach(el => {
            const fullName = user.name || user.username || 'Невідомо';
            if (el.tagName === 'INPUT') {
                el.value = fullName;
            } else {
                el.textContent = fullName;
            }
        });

        // Email
        const emailElements = document.querySelectorAll('[data-user-email]');
        emailElements.forEach(el => {
            const email = user.email || '';
            if (el.tagName === 'INPUT') {
                el.value = email;
            } else {
                el.textContent = email;
            }
        });

        // Роль
        const roleElements = document.querySelectorAll('[data-user-role]');
        roleElements.forEach(el => {
            const roleNames = {
                'admin': 'Адміністратор',
                'client': 'Клієнт',
                'dispatcher': 'Диспетчер',
                'technician': 'Технік'
            };
            el.textContent = roleNames[user.role] || user.role;
        });

        // Телефон
        const phoneElements = document.querySelectorAll('[data-user-phone]');
        phoneElements.forEach(el => {
            const phone = user.phone || '';
            if (el.tagName === 'INPUT') {
                el.value = phone;
            } else {
                el.textContent = phone || 'Не вказано';
            }
        });

        // Адреса
        const addressElements = document.querySelectorAll('[data-user-address]');
        addressElements.forEach(el => {
            el.textContent = user.address || 'Не вказано';
        });

        // Компанія
        const companyElements = document.querySelectorAll('[data-user-company]');
        companyElements.forEach(el => {
            el.textContent = user.company || 'Не вказано';
        });

        // Дата реєстрації
        const createdElements = document.querySelectorAll('[data-user-created]');
        createdElements.forEach(el => {
            if (user.createdAt) {
                const date = new Date(user.createdAt);
                el.textContent = date.toLocaleDateString('uk-UA');
            }
        });

        // Аватар
        const avatarElements = document.querySelectorAll('[data-user-avatar]');
        avatarElements.forEach(el => {
            if (user.avatar) {
                el.src = user.avatar;
            } else {
                // Дефолтний аватар на основі першої літери імені
                const initial = (user.name || 'U').charAt(0).toUpperCase();
                el.innerHTML = `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 2.5rem; font-weight: bold;">${initial}</div>`;
            }
        });

        // Спеціалізація (для техніків)
        if (user.role === 'technician' && user.specialization) {
            const specElements = document.querySelectorAll('[data-user-specialization]');
            specElements.forEach(el => {
                el.textContent = user.specialization;
            });
        }

        // Статус
        const statusElements = document.querySelectorAll('[data-user-status]');
        statusElements.forEach(el => {
            const statusText = user.isActive ? 'Активний' : 'Неактивний';
            const statusClass = user.isActive ? 'badge-success' : 'badge-danger';
            el.innerHTML = `<span class="badge ${statusClass}">${statusText}</span>`;
        });

        console.log('✅ UI оновлено з даними користувача');
    }

    /**
     * Показати помилку
     */
    function showError(message) {
        // Якщо є Toastr
        if (typeof toastr !== 'undefined') {
            toastr.error(message);
        } else {
            alert(message);
        }
    }

    /**
     * Оновлення профілю (POST)
     */
    window.updateUserProfile = async function(formData) {
        try {
            console.log('📤 Оновлення профілю...', formData);

            const response = await fetch('/api/users/me', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const updatedUser = await response.json();
            console.log('✅ Профіль оновлено:', updatedUser);

            // Оновлюємо localStorage
            localStorage.setItem('user', JSON.stringify(updatedUser));

            // Оновлюємо UI
            updateProfileUI(updatedUser);

            if (typeof toastr !== 'undefined') {
                toastr.success('Профіль успішно оновлено!');
            } else {
                alert('Профіль успішно оновлено!');
            }

            return updatedUser;

        } catch (error) {
            console.error('❌ Помилка оновлення профілю:', error);
            showError('Не вдалося оновити профіль');
            return null;
        }
    };

    /**
     * Зміна пароля
     */
    window.changeUserPassword = async function(oldPassword, newPassword) {
        try {
            console.log('🔐 Зміна пароля...');

            const response = await fetch('/api/users/change-password', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    oldPassword,
                    newPassword
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Помилка зміни пароля');
            }

            console.log('✅ Пароль змінено');

            if (typeof toastr !== 'undefined') {
                toastr.success('Пароль успішно змінено!');
            } else {
                alert('Пароль успішно змінено!');
            }

            return true;

        } catch (error) {
            console.error('❌ Помилка зміни пароля:', error);
            showError(error.message || 'Не вдалося змінити пароль');
            return false;
        }
    };

    // Автоматичне завантаження при ініціалізації
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadUserProfile);
    } else {
        loadUserProfile();
    }

    // Експортуємо для використання
    window.ProfileLoader = {
        load: loadUserProfile,
        update: window.updateUserProfile,
        changePassword: window.changeUserPassword
    };

    console.log('✅ ProfileLoader ініціалізовано');
})();
