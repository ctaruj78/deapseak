/**
 * 👤 Profile API Manager - Універсальний модуль для підключення профілів до API
 * Використовується на всіх сторінках профілів (admin, client, dispatcher, tech)
 */

class ProfileAPIManager {
    constructor() {
        this.apiUrl = this.getApiUrl();
        this.token = this.getToken();
        this.currentUser = null;
    }

    /**
     * Отримання API URL
     */
    getApiUrl() {
        // Перевірка GitHub Codespaces
        if (typeof CODESPACE_NAME !== 'undefined' && CODESPACE_NAME) {
            return `https://${CODESPACE_NAME}-5000.app.github.dev`;
        }
        // Локальний сервер
        return 'http://localhost:5000';
    }

    /**
     * Отримання токена авторизації
     */
    getToken() {
        return localStorage.getItem('liftmanager_jwt') || 
               localStorage.getItem('authToken') || 
               localStorage.getItem('token');
    }

    /**
     * Перевірка авторизації
     */
    async checkAuth() {
        if (!this.token) {
            console.warn('❌ Токен відсутній, перенаправлення на логін');
            this.redirectToLogin();
            return false;
        }

        try {
            const response = await fetch(`${this.apiUrl}/api/verify-token`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                console.warn('❌ Токен недійсний, перенаправлення на логін');
                this.redirectToLogin();
                return false;
            }

            const data = await response.json();
            this.currentUser = data.user;
            console.log('✅ Авторизація підтверджена:', this.currentUser);
            return true;
        } catch (error) {
            console.error('❌ Помилка перевірки авторизації:', error);
            return false;
        }
    }

    /**
     * Завантаження даних профілю
     */
    async loadProfile() {
        try {
            const response = await fetch(`${this.apiUrl}/api/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const userData = await response.json();
            this.currentUser = userData;
            
            // Зберігаємо для офлайн режиму
            localStorage.setItem('currentUser', JSON.stringify(userData));
            
            console.log('✅ Профіль завантажено:', userData);
            return userData;
        } catch (error) {
            console.error('❌ Помилка завантаження профілю:', error);
            
            // Fallback на локальні дані
            const cachedUser = localStorage.getItem('currentUser');
            if (cachedUser) {
                console.warn('⚠️ Використовуємо кешовані дані профілю');
                return JSON.parse(cachedUser);
            }
            
            throw error;
        }
    }

    /**
     * Оновлення профілю
     */
    async updateProfile(profileData) {
        try {
            const response = await fetch(`${this.apiUrl}/api/users/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const updatedUser = await response.json();
            this.currentUser = updatedUser;
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            
            console.log('✅ Профіль оновлено:', updatedUser);
            return updatedUser;
        } catch (error) {
            console.error('❌ Помилка оновлення профілю:', error);
            throw error;
        }
    }

    /**
     * Зміна пароля
     */
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await fetch(`${this.apiUrl}/api/users/change-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Помилка зміни пароля');
            }

            const result = await response.json();
            console.log('✅ Пароль змінено успішно');
            return result;
        } catch (error) {
            console.error('❌ Помилка зміни пароля:', error);
            throw error;
        }
    }

    /**
     * Завантаження аватара
     */
    async uploadAvatar(file) {
        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const response = await fetch(`${this.apiUrl}/api/users/avatar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Аватар завантажено:', result);
            return result;
        } catch (error) {
            console.error('❌ Помилка завантаження аватара:', error);
            throw error;
        }
    }

    /**
     * Оновлення UI профілю
     */
    updateProfileUI(userData) {
        // Ім'я користувача
        const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.username;
        
        // Оновлення різних елементів
        const selectors = [
            '#userName', '#clientName', '#sidebarName', '#profileName',
            '.user-name', '.profile-name', '#current-user-name', '#sidebar-user-name'
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el) el.textContent = fullName;
            });
        });

        // Email
        if (userData.email) {
            const emailElements = document.querySelectorAll('#userEmail, .user-email');
            emailElements.forEach(el => {
                if (el) el.textContent = userData.email;
            });
        }

        // Телефон
        if (userData.phone) {
            const phoneElements = document.querySelectorAll('#userPhone, .user-phone');
            phoneElements.forEach(el => {
                if (el) el.textContent = userData.phone;
            });
        }

        // Роль
        if (userData.role) {
            const roleMap = {
                admin: 'Адміністратор',
                dispatcher: 'Диспетчер',
                tech: 'Технік',
                client: 'Клієнт'
            };
            
            const roleElements = document.querySelectorAll('#userRole, .user-role');
            roleElements.forEach(el => {
                if (el) el.textContent = roleMap[userData.role] || userData.role;
            });
        }

        // Аватар
        if (userData.avatar) {
            const avatarElements = document.querySelectorAll('#profileAvatar img, .user-avatar');
            avatarElements.forEach(el => {
                if (el.tagName === 'IMG') {
                    el.src = userData.avatar;
                }
            });
        }

        console.log('✅ UI профілю оновлено');
    }

    /**
     * Заповнення форми профілю
     */
    fillProfileForm(userData) {
        const fields = {
            '#firstName': userData.firstName,
            '#lastName': userData.lastName,
            '#email': userData.email,
            '#phone': userData.phone,
            '#company': userData.company,
            '#address': userData.address,
            '#city': userData.city,
            '#country': userData.country,
            '#bio': userData.bio
        };

        Object.entries(fields).forEach(([selector, value]) => {
            const element = document.querySelector(selector);
            if (element && value) {
                element.value = value;
            }
        });

        console.log('✅ Форма профілю заповнена');
    }

    /**
     * Перенаправлення на логін
     */
    redirectToLogin() {
        localStorage.clear();
        window.location.href = '/login.html';
    }

    /**
     * Ініціалізація профілю (головна функція)
     */
    async init() {
        console.log('🔄 Ініціалізація Profile API Manager...');
        
        // 1. Перевірка авторизації
        const isAuth = await this.checkAuth();
        if (!isAuth) return;

        // 2. Завантаження профілю
        try {
            const userData = await this.loadProfile();
            
            // 3. Оновлення UI
            this.updateProfileUI(userData);
            
            // 4. Заповнення форми (якщо є)
            this.fillProfileForm(userData);
            
            console.log('✅ Profile API Manager ініціалізовано успішно');
            return userData;
        } catch (error) {
            console.error('❌ Помилка ініціалізації профілю:', error);
            this.showError('Не вдалося завантажити дані профілю');
        }
    }

    /**
     * Показати помилку
     */
    showError(message) {
        // Toastr якщо доступний
        if (typeof toastr !== 'undefined') {
            toastr.error(message);
        } else {
            alert(message);
        }
    }

    /**
     * Показати успіх
     */
    showSuccess(message) {
        if (typeof toastr !== 'undefined') {
            toastr.success(message);
        } else {
            alert(message);
        }
    }
}

// Глобальний екземпляр
if (typeof window !== 'undefined') {
    window.profileAPI = new ProfileAPIManager();
}

// Експорт для модулів
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfileAPIManager;
}
