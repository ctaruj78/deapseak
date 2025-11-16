/**
 * 🎛️ Universal Settings Page Component
 * Автоматично адаптується під роль користувача
 */

class SettingsPage {
    constructor() {
        this.user = AuthManager.getCurrentUser();
        this.settings = null;
        this.roleSpecificSettings = this.getRoleSettings();
    }

    // Налаштування специфічні для кожної ролі
    getRoleSettings() {
        const roleSettings = {
            admin: {
                sections: ['general', 'notifications', 'system', 'security', 'backup', 'integrations', 'ai'],
                features: {
                    system: {
                        label: 'Системні налаштування',
                        icon: 'fa-server',
                        items: [
                            { id: 'autoBackup', label: 'Автоматичне резервне копіювання', type: 'checkbox', default: true },
                            { id: 'maintenanceMode', label: 'Режим обслуговування', type: 'checkbox', default: false },
                            { id: 'apiRateLimit', label: 'Ліміт API запитів (за хвилину)', type: 'number', default: 100 },
                            { id: 'sessionTimeout', label: 'Таймаут сесії (хвилин)', type: 'number', default: 60 },
                            { id: 'maxUploadSize', label: 'Макс. розмір файлу (MB)', type: 'number', default: 10 }
                        ]
                    },
                    backup: {
                        label: 'Резервне копіювання',
                        icon: 'fa-database',
                        items: [
                            { id: 'backupSchedule', label: 'Розклад', type: 'select', options: ['Щодня', 'Щотижня', 'Щомісяця'], default: 'Щодня' },
                            { id: 'backupRetention', label: 'Зберігати резервні копії (днів)', type: 'number', default: 30 },
                            { id: 'autoCleanup', label: 'Автоматичне очищення старих копій', type: 'checkbox', default: true }
                        ]
                    },
                    integrations: {
                        label: 'Інтеграції',
                        icon: 'fa-plug',
                        items: [
                            { id: 'emailIntegration', label: 'Email інтеграція', type: 'checkbox', default: true },
                            { id: 'smsIntegration', label: 'SMS інтеграція', type: 'checkbox', default: false },
                            { id: 'telegramBot', label: 'Telegram бот', type: 'checkbox', default: false },
                            { id: 'googleMaps', label: 'Google Maps API', type: 'checkbox', default: true }
                        ]
                    },
                    ai: {
                        label: '🤖 AI Системи',
                        icon: 'fa-robot',
                        items: [
                            { id: 'smartSystemEnabled', label: '🧠 Smart Система (прогнозна аналітика)', type: 'checkbox', default: false },
                            { id: 'voiceAssistantEnabled', label: '🎤 Голосовий Асистент', type: 'checkbox', default: false },
                            { id: 'arHelperEnabled', label: '🥽 AR Помічник', type: 'checkbox', default: false },
                            { id: 'aiMaintenancePrediction', label: 'AI Прогнозування ТО', type: 'checkbox', default: false },
                            { id: 'aiAutoReporting', label: 'Автоматична AI звітність', type: 'checkbox', default: false }
                        ]
                    }
                }
            },
            dispatcher: {
                sections: ['general', 'notifications', 'workflow', 'assignments'],
                features: {
                    workflow: {
                        label: 'Робочий процес',
                        icon: 'fa-tasks',
                        items: [
                            { id: 'autoAssignment', label: 'Автоматичне призначення запитів', type: 'checkbox', default: false },
                            { id: 'priorityFilter', label: 'Фільтрувати за пріоритетом', type: 'checkbox', default: true },
                            { id: 'showOnlyNew', label: 'Показувати тільки нові запити', type: 'checkbox', default: false },
                            { id: 'refreshInterval', label: 'Оновлювати дані кожні (секунд)', type: 'number', default: 30 }
                        ]
                    },
                    assignments: {
                        label: 'Призначення',
                        icon: 'fa-user-check',
                        items: [
                            { id: 'considerWorkload', label: 'Враховувати навантаження техніка', type: 'checkbox', default: true },
                            { id: 'considerLocation', label: 'Враховувати локацію', type: 'checkbox', default: true },
                            { id: 'considerSpecialty', label: 'Враховувати спеціалізацію', type: 'checkbox', default: true },
                            { id: 'maxAssignments', label: 'Макс. призначень на техніка', type: 'number', default: 5 }
                        ]
                    }
                }
            },
            technician: {
                sections: ['general', 'notifications', 'work', 'location'],
                features: {
                    work: {
                        label: 'Робочі налаштування',
                        icon: 'fa-tools',
                        items: [
                            { id: 'autoCheckIn', label: 'Автоматичний check-in при прибутті', type: 'checkbox', default: false },
                            { id: 'requirePhotos', label: 'Обов\'язкові фото після роботи', type: 'checkbox', default: true },
                            { id: 'offlineMode', label: 'Офлайн режим (синхронізація)', type: 'checkbox', default: true },
                            { id: 'voiceNotes', label: 'Голосові нотатки', type: 'checkbox', default: false }
                        ]
                    },
                    location: {
                        label: 'Геолокація',
                        icon: 'fa-map-marker-alt',
                        items: [
                            { id: 'shareLocation', label: 'Ділитися локацією з диспетчером', type: 'checkbox', default: true },
                            { id: 'trackRoute', label: 'Відстежувати маршрут', type: 'checkbox', default: false },
                            { id: 'locationAccuracy', label: 'Точність локації', type: 'select', options: ['Висока', 'Середня', 'Низька'], default: 'Середня' }
                        ]
                    }
                }
            },
            client: {
                sections: ['general', 'notifications', 'requests', 'privacy'],
                features: {
                    requests: {
                        label: 'Мої запити',
                        icon: 'fa-clipboard-list',
                        items: [
                            { id: 'autoNotify', label: 'Сповіщати про зміни статусу', type: 'checkbox', default: true },
                            { id: 'showHistory', label: 'Показувати історію запитів', type: 'checkbox', default: true },
                            { id: 'allowRating', label: 'Дозволити оцінювання роботи', type: 'checkbox', default: true },
                            { id: 'savePaymentInfo', label: 'Зберігати платіжну інформацію', type: 'checkbox', default: false }
                        ]
                    },
                    privacy: {
                        label: 'Приватність',
                        icon: 'fa-shield-alt',
                        items: [
                            { id: 'showEmail', label: 'Показувати email техніку', type: 'checkbox', default: false },
                            { id: 'showPhone', label: 'Показувати телефон техніку', type: 'checkbox', default: true },
                            { id: 'allowAnalytics', label: 'Дозволити аналітику', type: 'checkbox', default: true },
                            { id: 'receiveMarketing', label: 'Отримувати маркетингові email', type: 'checkbox', default: false }
                        ]
                    }
                }
            }
        };

        return roleSettings[this.user?.role] || roleSettings.client;
    }

    // Ініціалізація сторінки
    async init() {
        try {
            // Завантажуємо налаштування
            this.settings = await settingsManager.loadSettings();
            
            // Рендеримо інтерфейс
            this.render();
            
            // Підключаємо обробники подій
            this.attachEventListeners();
            
            console.log('✅ Settings page initialized');
        } catch (error) {
            console.error('❌ Failed to initialize settings page:', error);
            this.showError('Не вдалося завантажити налаштування');
        }
    }

    // Рендер інтерфейсу
    render() {
        const container = document.getElementById('settings-content');
        if (!container) return;

        let html = `
            <div class="row">
                <!-- Загальні налаштування -->
                ${this.renderGeneralSettings()}
                
                <!-- Налаштування сповіщень -->
                ${this.renderNotificationSettings()}
                
                <!-- Роль-специфічні налаштування -->
                ${this.renderRoleSpecificSettings()}
            </div>
            
            <!-- Кнопки -->
            <div class="row mt-4">
                <div class="col-12">
                    <button class="btn btn-primary btn-lg" id="save-settings">
                        <i class="fas fa-save"></i> <span data-i18n="save">Зберегти</span>
                    </button>
                    <button class="btn btn-secondary btn-lg ml-2" id="reset-settings">
                        <i class="fas fa-undo"></i> <span data-i18n="reset">Скинути</span>
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // Загальні налаштування (для всіх ролей)
    renderGeneralSettings() {
        const languages = i18n.getAvailableLanguages();
        const currentLang = this.settings?.language || 'uk';
        const currentTheme = this.settings?.theme || 'light';

        return `
            <div class="col-md-6">
                <div class="card card-primary">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="fas fa-globe"></i> <span data-i18n="general_settings">Загальні налаштування</span>
                        </h3>
                    </div>
                    <div class="card-body">
                        <!-- Мова -->
                        <div class="form-group">
                            <label><span data-i18n="language">Мова</span></label>
                            <select class="form-control" id="language-select">
                                ${languages.map(lang => `
                                    <option value="${lang.code}" ${currentLang === lang.code ? 'selected' : ''}>
                                        ${lang.flag} ${lang.name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <!-- Тема -->
                        <div class="form-group">
                            <label><span data-i18n="theme">Тема</span></label>
                            <select class="form-control" id="theme-select">
                                <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>
                                    ☀️ <span data-i18n="light_mode">Світла</span>
                                </option>
                                <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>
                                    🌙 <span data-i18n="dark_mode">Темна</span>
                                </option>
                                <option value="auto" ${currentTheme === 'auto' ? 'selected' : ''}>
                                    🔄 <span data-i18n="auto_mode">Автоматично</span>
                                </option>
                            </select>
                        </div>

                        <!-- Часовий пояс -->
                        <div class="form-group">
                            <label>Часовий пояс</label>
                            <select class="form-control" id="timezone-select">
                                <option value="Europe/Kiev" selected>Europe/Kiev (UTC+2)</option>
                                <option value="Europe/London">Europe/London (UTC+0)</option>
                                <option value="America/New_York">America/New_York (UTC-5)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Налаштування сповіщень
    renderNotificationSettings() {
        const notif = this.settings?.notifications || {};

        return `
            <div class="col-md-6">
                <div class="card card-info">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="fas fa-bell"></i> <span data-i18n="notifications">Сповіщення</span>
                        </h3>
                    </div>
                    <div class="card-body">
                        <div class="custom-control custom-switch mb-3">
                            <input type="checkbox" class="custom-control-input" id="notif-email" 
                                ${notif.email !== false ? 'checked' : ''}>
                            <label class="custom-control-label" for="notif-email">
                                <span data-i18n="email_notifications">Email сповіщення</span>
                            </label>
                        </div>

                        <div class="custom-control custom-switch mb-3">
                            <input type="checkbox" class="custom-control-input" id="notif-push" 
                                ${notif.push !== false ? 'checked' : ''}>
                            <label class="custom-control-label" for="notif-push">
                                <span data-i18n="push_notifications">Push сповіщення</span>
                            </label>
                        </div>

                        <div class="custom-control custom-switch mb-3">
                            <input type="checkbox" class="custom-control-input" id="notif-sms" 
                                ${notif.sms === true ? 'checked' : ''}>
                            <label class="custom-control-label" for="notif-sms">
                                <span data-i18n="sms_notifications">SMS сповіщення</span>
                            </label>
                        </div>

                        <hr>
                        <h5>Типи сповіщень:</h5>

                        <div class="custom-control custom-switch mb-2">
                            <input type="checkbox" class="custom-control-input" id="notif-new-request" 
                                ${notif.newRequest !== false ? 'checked' : ''}>
                            <label class="custom-control-label" for="notif-new-request">
                                <span data-i18n="notification_new_request">Новий запит</span>
                            </label>
                        </div>

                        <div class="custom-control custom-switch mb-2">
                            <input type="checkbox" class="custom-control-input" id="notif-status-change" 
                                ${notif.statusChange !== false ? 'checked' : ''}>
                            <label class="custom-control-label" for="notif-status-change">
                                <span data-i18n="notification_status_change">Зміна статусу</span>
                            </label>
                        </div>

                        <div class="custom-control custom-switch mb-2">
                            <input type="checkbox" class="custom-control-input" id="notif-assignment" 
                                ${notif.assignment !== false ? 'checked' : ''}>
                            <label class="custom-control-label" for="notif-assignment">
                                <span data-i18n="notification_assignment">Призначення</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Роль-специфічні налаштування
    renderRoleSpecificSettings() {
        const features = this.roleSpecificSettings.features;
        if (!features) return '';

        let html = '';
        for (const [key, section] of Object.entries(features)) {
            html += `
                <div class="col-md-6">
                    <div class="card card-warning">
                        <div class="card-header">
                            <h3 class="card-title">
                                <i class="fas ${section.icon}"></i> ${section.label}
                            </h3>
                        </div>
                        <div class="card-body">
                            ${section.items.map(item => this.renderSettingItem(item)).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        return html;
    }

    // Рендер окремого елемента налаштування
    renderSettingItem(item) {
        const value = this.settings?.[item.id] ?? item.default;

        switch (item.type) {
            case 'checkbox':
                return `
                    <div class="custom-control custom-switch mb-2">
                        <input type="checkbox" class="custom-control-input role-setting" 
                            id="${item.id}" data-setting="${item.id}" 
                            ${value ? 'checked' : ''}>
                        <label class="custom-control-label" for="${item.id}">
                            ${item.label}
                        </label>
                    </div>
                `;
            
            case 'number':
                return `
                    <div class="form-group">
                        <label for="${item.id}">${item.label}</label>
                        <input type="number" class="form-control role-setting" 
                            id="${item.id}" data-setting="${item.id}" 
                            value="${value}" min="1">
                    </div>
                `;
            
            case 'select':
                return `
                    <div class="form-group">
                        <label for="${item.id}">${item.label}</label>
                        <select class="form-control role-setting" 
                            id="${item.id}" data-setting="${item.id}">
                            ${item.options.map(opt => `
                                <option value="${opt}" ${value === opt ? 'selected' : ''}>
                                    ${opt}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                `;
            
            default:
                return '';
        }
    }

    // Обробники подій
    attachEventListeners() {
        // Зміна мови
        $('#language-select').on('change', async (e) => {
            const lang = e.target.value;
            try {
                await settingsManager.updateLanguage(lang);
                toastr.success('Мову змінено. Сторінка оновиться...');
                setTimeout(() => location.reload(), 1500);
            } catch (error) {
                toastr.error('Помилка зміни мови');
            }
        });

        // Зміна теми
        $('#theme-select').on('change', async (e) => {
            const theme = e.target.value;
            try {
                await settingsManager.updateTheme(theme);
                toastr.success('Тему змінено');
            } catch (error) {
                toastr.error('Помилка зміни теми');
            }
        });

        // Збереження налаштувань
        $('#save-settings').on('click', () => this.saveAllSettings());

        // Скидання налаштувань
        $('#reset-settings').on('click', () => this.resetSettings());
    }

    // Збереження всіх налаштувань
    async saveAllSettings() {
        try {
            const newSettings = {
                language: $('#language-select').val(),
                theme: $('#theme-select').val(),
                notifications: {
                    email: $('#notif-email').is(':checked'),
                    push: $('#notif-push').is(':checked'),
                    sms: $('#notif-sms').is(':checked'),
                    newRequest: $('#notif-new-request').is(':checked'),
                    statusChange: $('#notif-status-change').is(':checked'),
                    assignment: $('#notif-assignment').is(':checked')
                },
                display: {
                    timezone: $('#timezone-select').val()
                }
            };

            // Додаємо роль-специфічні налаштування
            $('.role-setting').each(function() {
                const id = $(this).data('setting');
                const type = $(this).attr('type');
                
                if (type === 'checkbox') {
                    newSettings[id] = $(this).is(':checked');
                } else if (type === 'number') {
                    newSettings[id] = parseInt($(this).val());
                } else {
                    newSettings[id] = $(this).val();
                }
            });

            await settingsManager.saveSettings(newSettings);
            toastr.success('✅ Налаштування збережено!');
        } catch (error) {
            console.error('Save error:', error);
            toastr.error('❌ Помилка збереження');
        }
    }

    // Скидання налаштувань
    async resetSettings() {
        if (!confirm('Ви впевнені? Всі налаштування будуть скинуті до стандартних.')) {
            return;
        }

        try {
            await settingsManager.resetSettings();
        } catch (error) {
            toastr.error('Помилка скидання налаштувань');
        }
    }

    // Показати помилку
    showError(message) {
        toastr.error(message);
    }
}

// Ініціалізація при завантаженні сторінки
if (typeof window !== 'undefined') {
    window.SettingsPage = SettingsPage;
}
