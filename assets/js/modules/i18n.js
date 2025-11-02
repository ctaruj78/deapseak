class I18nManager {
    constructor() {
        this.currentLanguage = 'uk';
        this.translations = {};
        this.listeners = [];
        this.init();
    }

    init() {
        // Завантаження збереженої мови
        const savedLang = StorageManager.load('language') || 'uk';
        this.setLanguage(savedLang);

        // Завантаження перекладів
        this.loadTranslations();
    }

    // Завантаження перекладів
    async loadTranslations() {
        try {
            // В реальному додатку це буде завантаження з API або файлів
            this.translations = {
                uk: {
                    // Загальні
                    'dashboard': 'Дашборд',
                    'lifts': 'Ліфти',
                    'users': 'Користувачі',
                    'reports': 'Звіти',
                    'settings': 'Налаштування',
                    'logout': 'Вийти',
                    'save': 'Зберегти',
                    'cancel': 'Скасувати',
                    'edit': 'Редагувати',
                    'delete': 'Видалити',
                    'add': 'Додати',
                    'search': 'Пошук',
                    'loading': 'Завантаження...',
                    'error': 'Помилка',
                    'success': 'Успішно',
                    'warning': 'Попередження',
                    'info': 'Інформація',

                    // Дашборд
                    'active_lifts': 'Активних ліфтів',
                    'serviced_today': 'Обслугованих сьогодні',
                    'problem_lifts': 'Проблемних ліфтів',
                    'new_scans': 'Нових сканувань',
                    'quick_actions': 'Швидкі дії',
                    'create_qr': 'Створити QR',
                    'add_lift': 'Додати ліфт',
                    'add_user': 'Додати користувача',
                    'daily_report': 'Звіт за день',
                    'recent_scans': 'Останні сканування',
                    'view_all_scans': 'Переглянути всі сканування',
                    'analytics': 'Аналітика',
                    'status_distribution': 'Розподіл за статусом',

                    // Нотифікації
                    'notifications': 'Сповіщення',
                    'new_notifications': 'нових сповіщень',
                    'no_notifications': 'Немає нових сповіщень',
                    'view_all_notifications': 'Переглянути всі сповіщення',
                    'maintenance': 'Обслуговування',
                    'assignment': 'Нове завдання',
                    'payment': 'Оплата',

                    // Статуси
                    'active': 'Активний',
                    'inactive': 'Неактивний',
                    'maintenance': 'Обслуговування',
                    'completed': 'Завершено',
                    'pending': 'Очікує',
                    'in_progress': 'В роботі',

                    // Місяці
                    'jan': 'Січ',
                    'feb': 'Лют',
                    'mar': 'Бер',
                    'apr': 'Кві',
                    'may': 'Тра',
                    'jun': 'Чер',
                    'jul': 'Лип',
                    'aug': 'Сер',
                    'sep': 'Вер',
                    'oct': 'Жов',
                    'nov': 'Лис',
                    'dec': 'Гру'
                },
                en: {
                    // General
                    'dashboard': 'Dashboard',
                    'lifts': 'Lifts',
                    'users': 'Users',
                    'reports': 'Reports',
                    'settings': 'Settings',
                    'logout': 'Logout',
                    'save': 'Save',
                    'cancel': 'Cancel',
                    'edit': 'Edit',
                    'delete': 'Delete',
                    'add': 'Add',
                    'search': 'Search',
                    'loading': 'Loading...',
                    'error': 'Error',
                    'success': 'Success',
                    'warning': 'Warning',
                    'info': 'Info',

                    // Dashboard
                    'active_lifts': 'Active Lifts',
                    'serviced_today': 'Serviced Today',
                    'problem_lifts': 'Problem Lifts',
                    'new_scans': 'New Scans',
                    'quick_actions': 'Quick Actions',
                    'create_qr': 'Create QR',
                    'add_lift': 'Add Lift',
                    'add_user': 'Add User',
                    'daily_report': 'Daily Report',
                    'recent_scans': 'Recent Scans',
                    'view_all_scans': 'View All Scans',
                    'analytics': 'Analytics',
                    'status_distribution': 'Status Distribution',

                    // Notifications
                    'notifications': 'Notifications',
                    'new_notifications': 'new notifications',
                    'no_notifications': 'No new notifications',
                    'view_all_notifications': 'View All Notifications',
                    'maintenance': 'Maintenance',
                    'assignment': 'New Assignment',
                    'payment': 'Payment',

                    // Statuses
                    'active': 'Active',
                    'inactive': 'Inactive',
                    'maintenance': 'Maintenance',
                    'completed': 'Completed',
                    'pending': 'Pending',
                    'in_progress': 'In Progress',

                    // Months
                    'jan': 'Jan',
                    'feb': 'Feb',
                    'mar': 'Mar',
                    'apr': 'Apr',
                    'may': 'May',
                    'jun': 'Jun',
                    'jul': 'Jul',
                    'aug': 'Aug',
                    'sep': 'Sep',
                    'oct': 'Oct',
                    'nov': 'Nov',
                    'dec': 'Dec'
                }
            };
        } catch (error) {
            // logger.error('Failed to load translations:', error);
        }
    }

    // Зміна мови
    setLanguage(language) {
        if (this.translations[language]) {
            this.currentLanguage = language;
            StorageManager.save('language', language);

            // Повідомлення слухачів
            this.notifyListeners('languageChanged', language);

            // Оновлення DOM елементів
            this.updateDOMTranslations();

            return true;
        }
        return false;
    }

    // Отримання поточної мови
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    // Переклад тексту
    translate(key, fallback = '') {
        const translations = this.translations[this.currentLanguage] || {};
        return translations[key] || fallback || key;
    }

    // Короткий метод перекладу
    t(key, fallback = '') {
        return this.translate(key, fallback);
    }

    // Переклад з параметрами
    translateWithParams(key, params = {}, fallback = '') {
        let text = this.translate(key, fallback);

        // Заміна параметрів {param} на значення
        Object.keys(params).forEach(param => {
            text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
        });

        return text;
    }

    // Оновлення всіх елементів з data-i18n атрибутами
    updateDOMTranslations() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const fallback = element.getAttribute('data-i18n-fallback') || '';
            element.textContent = this.translate(key, fallback);
        });

        // Оновлення placeholder'ів
        const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
        placeholders.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.translate(key);
        });

        // Оновлення title атрибутів
        const titles = document.querySelectorAll('[data-i18n-title]');
        titles.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.translate(key);
        });
    }

    // Додавання слухача
    addListener(callback) {
        this.listeners.push(callback);
    }

    // Видалення слухача
    removeListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }

    // Повідомлення слухачів
    notifyListeners(event, data) {
        this.listeners.forEach(callback => callback(event, data));
    }

    // Отримання доступних мов
    getAvailableLanguages() {
        return Object.keys(this.translations);
    }

    // Отримання назви мови
    getLanguageName(language) {
        const names = {
            'uk': 'Українська',
            'en': 'English'
        };
        return names[language] || language;
    }

    // Ініціалізація перемикача мов
    initLanguageSwitcher(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const languages = this.getAvailableLanguages();
        container.innerHTML = '';

        languages.forEach(lang => {
            const button = document.createElement('button');
            button.className = `btn btn-sm ${lang === this.currentLanguage ? 'btn-primary' : 'btn-outline-primary'} mr-1`;
            button.textContent = this.getLanguageName(lang);
            button.onclick = () => this.setLanguage(lang);
            container.appendChild(button);
        });
    }

    // Автоматичне визначення мови браузера
    detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        const lang = browserLang.split('-')[0]; // uk-UA -> uk

        if (this.translations[lang]) {
            return lang;
        }

        return 'uk'; // default
    }

    // Експорт/імпорт перекладів (для розробки)
    exportTranslations() {
        return JSON.stringify(this.translations, null, 2);
    }

    importTranslations(jsonString) {
        try {
            const newTranslations = JSON.parse(jsonString);
            this.translations = { ...this.translations, ...newTranslations };
            this.updateDOMTranslations();
            return true;
        } catch (error) {
            // logger.error('Failed to import translations:', error);
            return false;
        }
    }
}

// Глобальна функція для швидкого перекладу
function __(key, fallback = '') {
    return window.i18nManager ? window.i18nManager.translate(key, fallback) : (fallback || key);
}

// Ініціалізація
if (typeof window !== 'undefined') {
    window.I18nManager = I18nManager;
    window.i18nManager = new I18nManager();
    window.__ = __;
}

// Експорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18nManager;
}