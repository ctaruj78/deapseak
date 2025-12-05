/**
 * 🎛️ Settings Manager
 * Модуль для управління налаштуваннями користувача
 */

class SettingsManager {
    constructor() {
        this.settings = this.getLocalSettings();
        // Use AuthManager's API URL to get the correct endpoint
        this.apiUrl = (typeof AuthManager !== 'undefined' && AuthManager.getApiUrl) 
            ? AuthManager.getApiUrl('/api/settings')
            : 'http://localhost:5000/api/settings';
    }

    // Отримати локальні налаштування
    getLocalSettings() {
        try {
            const stored = localStorage.getItem('user_settings');
            // Перевірка на "undefined" рядок або null
            if (!stored || stored === 'undefined' || stored === 'null') {
                return this.getDefaultSettings();
            }
            return JSON.parse(stored);
        } catch (error) {
            console.warn('Failed to parse stored settings, using defaults:', error);
            return this.getDefaultSettings();
        }
    }

    // Дефолтні налаштування
    getDefaultSettings() {
        return {
            language: 'uk',
            theme: 'light',
            notifications: {
                email: true,
                push: true,
                sms: false,
                newRequest: true,
                statusChange: true,
                assignment: true,
                reminders: true
            },
            privacy: {
                showEmail: false,
                showPhone: false,
                allowAnalytics: true
            },
            display: {
                itemsPerPage: 20,
                dateFormat: 'DD.MM.YYYY',
                timeFormat: '24h',
                timezone: 'Europe/Kiev'
            }
        };
    }

    // Завантажити налаштування з сервера
    async loadSettings() {
        try {
            // Спочатку показуємо локальні налаштування для швидкості
            const localSettings = this.getLocalSettings();
            console.log('📦 Using cached settings while loading from server...');
            
            if (!AuthManager.isAuthenticated()) {
                console.warn('No auth token, using local settings');
                return localSettings;
            }

            const response = await AuthManager.fetchWithAuth('/api/settings', {
                method: 'GET'
            });

            if (!response.ok) {
                console.warn(`Server returned ${response.status}, using cached settings`);
                return localSettings;
            }

            const data = await response.json();
            this.settings = data.settings;
            this.saveLocal(this.settings);
            
            console.log('✅ Settings loaded from server');
            return this.settings;
        } catch (error) {
            console.error('Failed to load settings from server:', error);
            // Використовуємо локальні налаштування при помилці
            return this.getLocalSettings();
        }
    }

    // Зберегти налаштування на сервер
    async saveSettings(newSettings) {
        try {
            const token = AuthManager.getAuthToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await AuthManager.fetchWithAuth("/api/settings", {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newSettings)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            this.settings = data.settings;
            this.saveLocal(this.settings);
            
            this.showNotification('success', i18n.t('settings_saved'));
            return this.settings;
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showNotification('error', i18n.t('settings_save_failed'));
            throw error;
        }
    }

    // Оновити мову
    async updateLanguage(language) {
        try {
            const token = AuthManager.getAuthToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await AuthManager.fetchWithAuth("/api/settings/language", {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ language })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            this.settings.language = language;
            this.saveLocal(this.settings);
            
            // Застосовуємо через GlobalSettings якщо доступний
            if (typeof GlobalSettings !== 'undefined' && GlobalSettings.applyLanguage) {
                GlobalSettings.applyLanguage(language);
            }
            
            // Оновлюємо i18n
            if (typeof i18n !== 'undefined') {
                i18n.setLanguage(language);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to update language:', error);
            throw error;
        }
    }

    // Оновити тему
    async updateTheme(theme) {
        try {
            const token = AuthManager.getAuthToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await AuthManager.fetchWithAuth("/api/settings/theme", {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ theme })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            this.settings.theme = theme;
            this.saveLocal(this.settings);
            
            // Застосовуємо через GlobalSettings якщо доступний
            if (typeof GlobalSettings !== 'undefined' && GlobalSettings.applyTheme) {
                GlobalSettings.applyTheme(theme);
            } else {
                // Fallback на локальний метод
                this.applyTheme(theme);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to update theme:', error);
            throw error;
        }
    }

    // Оновити налаштування сповіщень
    async updateNotifications(notifications) {
        try {
            const token = AuthManager.getAuthToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await AuthManager.fetchWithAuth("/api/settings/notifications", {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ notifications })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            this.settings.notifications = notifications;
            this.saveLocal(this.settings);
            
            return true;
        } catch (error) {
            console.error('Failed to update notifications:', error);
            throw error;
        }
    }

    // Скинути налаштування
    async resetSettings() {
        try {
            const token = AuthManager.getAuthToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await AuthManager.fetchWithAuth("/api/settings/reset", {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            this.settings = data.settings;
            this.saveLocal(this.settings);
            
            this.showNotification('success', i18n.t('settings_reset'));
            window.location.reload();
            
            return true;
        } catch (error) {
            console.error('Failed to reset settings:', error);
            throw error;
        }
    }

    // Зберегти локально
    saveLocal(settings) {
        localStorage.setItem('user_settings', JSON.stringify(settings));
    }

    // Застосувати тему
    applyTheme(theme) {
        const body = document.body;
        body.classList.remove('dark-mode', 'light-mode');
        
        if (theme === 'dark') {
            body.classList.add('dark-mode');
        } else if (theme === 'light') {
            body.classList.add('light-mode');
        } else if (theme === 'auto') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            body.classList.add(isDark ? 'dark-mode' : 'light-mode');
        }
    }

    // Отримати поточну мову
    getLanguage() {
        return this.settings.language || 'uk';
    }

    // Отримати поточну тему
    getTheme() {
        return this.settings.theme || 'light';
    }

    // Показати повідомлення
    showNotification(type, message) {
        if (typeof toastr !== 'undefined') {
            toastr[type](message);
        } else {
            alert(message);
        }
    }

    // Ініціалізація при завантаженні сторінки
    async init() {
        // Застосовуємо збережені налаштування
        this.applyTheme(this.settings.theme);
        
        if (typeof i18n !== 'undefined') {
            i18n.setLanguage(this.settings.language);
        }

        // Завантажуємо налаштування з сервера
        if (AuthManager.isAuthenticated()) {
            await this.loadSettings();
        }
    }
}

// Глобальний екземпляр (робимо доступним через window)
window.settingsManager = new SettingsManager();
// Також створюємо const для сумісності
const settingsManager = window.settingsManager;

// НЕ ініціалізуємо автоматично - буде викликано вручну зі сторінки
// після завантаження всіх залежностей

// Експорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsManager;
}
