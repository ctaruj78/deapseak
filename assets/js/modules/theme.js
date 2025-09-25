class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.themes = {
            light: {
                name: 'Світла',
                icon: 'fas fa-sun',
                variables: {
                    '--primary-color': '#007bff',
                    '--secondary-color': '#6c757d',
                    '--success-color': '#28a745',
                    '--danger-color': '#dc3545',
                    '--warning-color': '#ffc107',
                    '--info-color': '#17a2b8',
                    '--light-color': '#f8f9fa',
                    '--dark-color': '#343a40',
                    '--body-bg': '#ffffff',
                    '--body-color': '#212529',
                    '--card-bg': '#ffffff',
                    '--card-border': '#dee2e6',
                    '--navbar-bg': '#ffffff',
                    '--navbar-color': '#212529',
                    '--sidebar-bg': '#343a40',
                    '--sidebar-color': '#c2c7d0',
                    '--input-bg': '#ffffff',
                    '--input-border': '#ced4da',
                    '--input-color': '#495057'
                }
            },
            dark: {
                name: 'Темна',
                icon: 'fas fa-moon',
                variables: {
                    '--primary-color': '#0d6efd',
                    '--secondary-color': '#6c757d',
                    '--success-color': '#198754',
                    '--danger-color': '#dc3545',
                    '--warning-color': '#fd7e14',
                    '--info-color': '#0dcaf0',
                    '--light-color': '#495057',
                    '--dark-color': '#212529',
                    '--body-bg': '#212529',
                    '--body-color': '#ffffff',
                    '--card-bg': '#343a40',
                    '--card-border': '#495057',
                    '--navbar-bg': '#343a40',
                    '--navbar-color': '#ffffff',
                    '--sidebar-bg': '#212529',
                    '--sidebar-color': '#c2c7d0',
                    '--input-bg': '#495057',
                    '--input-border': '#6c757d',
                    '--input-color': '#ffffff'
                }
            },
            auto: {
                name: 'Авто',
                icon: 'fas fa-adjust',
                variables: {} // Використовує системні налаштування
            }
        };
        this.init();
    }

    init() {
        // Завантаження збереженої теми
        const savedTheme = StorageManager.load('theme') || 'light';
        this.setTheme(savedTheme);

        // Слухач зміни системної теми
        this.initSystemThemeListener();
    }

    // Встановлення теми
    setTheme(themeName) {
        if (!this.themes[themeName]) return false;

        this.currentTheme = themeName;
        StorageManager.save('theme', themeName);

        // Якщо авто - визначаємо системну тему
        if (themeName === 'auto') {
            this.applySystemTheme();
        } else {
            this.applyTheme(themeName);
        }

        // Повідомлення слухачів
        this.notifyListeners('themeChanged', themeName);

        return true;
    }

    // Застосування теми
    applyTheme(themeName) {
        const theme = this.themes[themeName];
        if (!theme) return;

        const root = document.documentElement;

        // Застосування CSS змінних
        Object.entries(theme.variables).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });

        // Додавання класу до body
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${themeName}`);

        // Збереження в localStorage
        StorageManager.save('currentThemeVars', theme.variables);
    }

    // Автоматичне визначення системної теми
    applySystemTheme() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const systemTheme = prefersDark ? 'dark' : 'light';
        this.applyTheme(systemTheme);
    }

    // Ініціалізація слухача системної теми
    initSystemThemeListener() {
        if (this.currentTheme === 'auto') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                if (this.currentTheme === 'auto') {
                    this.applySystemTheme();
                }
            });
        }
    }

    // Отримання поточної теми
    getCurrentTheme() {
        return this.currentTheme;
    }

    // Отримання доступних тем
    getAvailableThemes() {
        return Object.keys(this.themes);
    }

    // Отримання інформації про тему
    getThemeInfo(themeName) {
        return this.themes[themeName] || null;
    }

    // Ініціалізація перемикача тем
    initThemeSwitcher(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        this.getAvailableThemes().forEach(themeName => {
            const theme = this.themes[themeName];
            const button = document.createElement('button');
            button.className = `btn btn-sm ${themeName === this.currentTheme ? 'btn-primary' : 'btn-outline-primary'} mr-1`;
            button.innerHTML = `<i class="${theme.icon} mr-1"></i>${theme.name}`;
            button.onclick = () => this.setTheme(themeName);
            container.appendChild(button);
        });
    }

    // Перемикання між світлою та темною
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    // Додавання слухача
    addListener(callback) {
        if (!this.listeners) this.listeners = [];
        this.listeners.push(callback);
    }

    // Видалення слухача
    removeListener(callback) {
        if (!this.listeners) return;
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }

    // Повідомлення слухачів
    notifyListeners(event, data) {
        if (!this.listeners) return;
        this.listeners.forEach(callback => callback(event, data));
    }

    // Кастомізація кольорів (розширена функціональність)
    customizeColors(colors) {
        const currentTheme = this.themes[this.currentTheme];
        if (!currentTheme) return false;

        // Оновлення змінних теми
        const updatedVariables = { ...currentTheme.variables, ...colors };
        currentTheme.variables = updatedVariables;

        // Перезастосування теми
        this.applyTheme(this.currentTheme);

        // Збереження кастомізації
        StorageManager.save('customColors', colors);

        return true;
    }

    // Скидання до стандартних кольорів
    resetColors() {
        StorageManager.remove('customColors');
        this.applyTheme(this.currentTheme);
    }

    // Експорт налаштувань теми
    exportThemeSettings() {
        return {
            currentTheme: this.currentTheme,
            customColors: StorageManager.load('customColors') || {},
            themes: this.themes
        };
    }

    // Імпорт налаштувань теми
    importThemeSettings(settings) {
        try {
            if (settings.currentTheme) {
                this.setTheme(settings.currentTheme);
            }
            if (settings.customColors) {
                this.customizeColors(settings.customColors);
            }
            return true;
        } catch (error) {
            console.error('Failed to import theme settings:', error);
            return false;
        }
    }
}

// Додавання CSS для тем
const themeStyles = `
:root {
    --primary-color: #007bff;
    --secondary-color: #6c757d;
    --success-color: #28a745;
    --danger-color: #dc3545;
    --warning-color: #ffc107;
    --info-color: #17a2b8;
    --light-color: #f8f9fa;
    --dark-color: #343a40;
    --body-bg: #ffffff;
    --body-color: #212529;
    --card-bg: #ffffff;
    --card-border: #dee2e6;
    --navbar-bg: #ffffff;
    --navbar-color: #212529;
    --sidebar-bg: #343a40;
    --sidebar-color: #c2c7d0;
    --input-bg: #ffffff;
    --input-border: #ced4da;
    --input-color: #495057;
}

/* Перехід між темами */
* {
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

/* Світла тема */
.theme-light {
    background-color: var(--body-bg);
    color: var(--body-color);
}

.theme-light .card {
    background-color: var(--card-bg);
    border-color: var(--card-border);
    color: var(--body-color);
}

.theme-light .navbar {
    background-color: var(--navbar-bg) !important;
    color: var(--navbar-color);
}

.theme-light .main-sidebar {
    background-color: var(--sidebar-bg);
    color: var(--sidebar-color);
}

.theme-light .form-control {
    background-color: var(--input-bg);
    border-color: var(--input-border);
    color: var(--input-color);
}

/* Темна тема */
.theme-dark {
    background-color: var(--body-bg);
    color: var(--body-color);
}

.theme-dark .card {
    background-color: var(--card-bg);
    border-color: var(--card-border);
    color: var(--body-color);
}

.theme-dark .navbar {
    background-color: var(--navbar-bg) !important;
    color: var(--navbar-color);
}

.theme-dark .main-sidebar {
    background-color: var(--sidebar-bg);
    color: var(--sidebar-color);
}

.theme-dark .form-control {
    background-color: var(--input-bg);
    border-color: var(--input-border);
    color: var(--input-color);
}

/* Кнопка перемикача тем */
.theme-switcher {
    display: flex;
    align-items: center;
    gap: 5px;
}

.theme-switcher .btn {
    border-radius: 20px;
    padding: 5px 10px;
}
`;

// Додавання стилів
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = themeStyles;
    document.head.appendChild(style);
}

// Ініціалізація
if (typeof window !== 'undefined') {
    window.ThemeManager = ThemeManager;
    window.themeManager = new ThemeManager();
}

// Експорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}