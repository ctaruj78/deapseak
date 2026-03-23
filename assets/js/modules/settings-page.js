/**
 * 🎛️ Universal Settings Page Component
 */

class SettingsPage {
    constructor() {
        this.user = AuthManager.getCurrentUser();
        this.settings = null;
    }

    async init() {
        try {
            this.settings = await settingsManager.loadSettings();
            this.render();
            this.attachEventListeners();
            console.log('✅ Settings page initialized');
        } catch (error) {
            console.error('❌ Failed to initialize settings page:', error);
            this.showError('Не вдалося завантажити налаштування');
        }
    }

    render() {
        const container = document.getElementById('settings-content');
        if (!container) return;

        const isAdmin = this.user && this.user.role === 'admin';

        container.innerHTML = `
            <div class="row">
                ${this.renderGeneralSettings()}
                ${this.renderNotificationSettings()}
                ${isAdmin ? this.renderAdminSystemSettings() : ''}
            </div>
            <div class="row mt-4">
                <div class="col-12">
                    <button class="btn btn-primary btn-lg" id="save-settings">
                        <i class="fas fa-save"></i> Зберегти
                    </button>
                    <button class="btn btn-secondary btn-lg ml-2" id="reset-settings">
                        <i class="fas fa-undo"></i> Скинути
                    </button>
                </div>
            </div>
        `;
    }

    renderGeneralSettings() {
        const currentLang = (this.settings && this.settings.language)
            || localStorage.getItem('app_language') || 'uk';

        const languages = [
            { code: 'uk', flag: '🇺🇦', name: 'Українська' },
            { code: 'en', flag: '🇬🇧', name: 'English' },
            { code: 'pt', flag: '🇵🇹', name: 'Português' }
        ];

        return `
            <div class="col-md-6">
                <div class="card card-primary">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-globe"></i> Загальні налаштування</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label><i class="fas fa-language mr-1"></i> Мова інтерфейсу</label>
                            <select class="form-control" id="language-select">
                                ${languages.map(lang =>
                                    '<option value="' + lang.code + '"' + (currentLang === lang.code ? ' selected' : '') + '>' +
                                    lang.flag + ' ' + lang.name + '</option>'
                                ).join('')}
                            </select>
                            <small class="form-text text-muted">Переклад додано частково. Повноцінний переклад буде додано пізніше.</small>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-sun mr-1"></i> Тема</label>
                            <div class="alert alert-light border mb-0 py-2">
                                <i class="fas fa-check-circle text-success mr-1"></i>
                                <strong>Світла тема</strong> &mdash; єдина доступна тема
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderNotificationSettings() {
        const notif = (this.settings && this.settings.notifications) || {};

        return `
            <div class="col-md-6">
                <div class="card card-info">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-bell"></i> Сповіщення</h3>
                    </div>
                    <div class="card-body">
                        <div class="custom-control custom-switch mb-3">
                            <input type="checkbox" class="custom-control-input" id="notif-email"
                                ${notif.email !== false ? 'checked' : ''}>
                            <label class="custom-control-label" for="notif-email">Email сповіщення</label>
                        </div>
                        <div class="custom-control custom-switch mb-3">
                            <input type="checkbox" class="custom-control-input" id="notif-push"
                                ${notif.push !== false ? 'checked' : ''}>
                            <label class="custom-control-label" for="notif-push">Push сповіщення</label>
                        </div>
                        <hr>
                        <h6 class="text-muted">Типи сповіщень:</h6>
                        <div class="custom-control custom-switch mb-2">
                            <input type="checkbox" class="custom-control-input" id="notif-new-request"
                                ${notif.newRequest !== false ? 'checked' : ''}>
                            <label class="custom-control-label" for="notif-new-request">Новий запит</label>
                        </div>
                        <div class="custom-control custom-switch mb-2">
                            <input type="checkbox" class="custom-control-input" id="notif-status-change"
                                ${notif.statusChange !== false ? 'checked' : ''}>
                            <label class="custom-control-label" for="notif-status-change">Зміна статусу</label>
                        </div>
                        <div class="custom-control custom-switch mb-2">
                            <input type="checkbox" class="custom-control-input" id="notif-assignment"
                                ${notif.assignment !== false ? 'checked' : ''}>
                            <label class="custom-control-label" for="notif-assignment">Призначення</label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAdminSystemSettings() {
        const s = this.settings || {};
        return `
            <div class="col-md-6">
                <div class="card card-warning">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-server"></i> Системні налаштування</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label for="sessionTimeout">Таймаут сесії (хвилини)</label>
                            <input type="number" class="form-control" id="sessionTimeout"
                                value="${s.sessionTimeout || 60}" min="5" max="480">
                        </div>
                        <div class="form-group">
                            <label for="apiRateLimit">Ліміт API запитів (за хвилину)</label>
                            <input type="number" class="form-control" id="apiRateLimit"
                                value="${s.apiRateLimit || 100}" min="10" max="1000">
                        </div>
                        <div class="custom-control custom-switch mb-2">
                            <input type="checkbox" class="custom-control-input" id="maintenanceMode"
                                ${s.maintenanceMode ? 'checked' : ''}>
                            <label class="custom-control-label" for="maintenanceMode">
                                Режим обслуговування
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        $('#language-select').on('change', async function() {
            const lang = $(this).val();
            try {
                await settingsManager.updateLanguage(lang);
                toastr.success('Мову змінено. Сторінка оновиться...');
                setTimeout(function() { location.reload(); }, 1500);
            } catch (error) {
                toastr.error('Помилка зміни мови');
            }
        });

        $('#save-settings').on('click', function() {
            window._settingsPageInstance.saveAllSettings();
        });

        $('#reset-settings').on('click', function() {
            window._settingsPageInstance.resetSettings();
        });

        window._settingsPageInstance = this;
    }

    async saveAllSettings() {
        try {
            const newSettings = {
                language: $('#language-select').val(),
                theme: 'light',
                notifications: {
                    email: $('#notif-email').is(':checked'),
                    push: $('#notif-push').is(':checked'),
                    newRequest: $('#notif-new-request').is(':checked'),
                    statusChange: $('#notif-status-change').is(':checked'),
                    assignment: $('#notif-assignment').is(':checked')
                }
            };

            if (this.user && this.user.role === 'admin') {
                newSettings.sessionTimeout = parseInt($('#sessionTimeout').val()) || 60;
                newSettings.apiRateLimit   = parseInt($('#apiRateLimit').val())   || 100;
                newSettings.maintenanceMode = $('#maintenanceMode').is(':checked');
            }

            await settingsManager.saveSettings(newSettings);
            toastr.success('✅ Налаштування збережено!');
        } catch (error) {
            console.error('Save error:', error);
            toastr.error('❌ Помилка збереження');
        }
    }

    async resetSettings() {
        if (!confirm('Ви впевнені? Всі налаштування будуть скинуті до стандартних.')) return;
        try {
            await settingsManager.resetSettings();
        } catch (error) {
            toastr.error('Помилка скидання налаштувань');
        }
    }

    showError(message) {
        toastr.error(message);
    }
}

if (typeof window !== 'undefined') {
    window.SettingsPage = SettingsPage;
}
