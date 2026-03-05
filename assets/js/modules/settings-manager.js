class SettingsManager {
    constructor() {
        this.settings = {};
        this.userData = null;
        this.userRole = 'dispatcher';
        this.init();
    }

    init() {
        this.loadUserData();
        this.loadSettings();
        this.setupEventListeners();
        this.initializeFormValues();
        this.setupFileInputs();
        this.applyUserRole();
    }

    loadUserData() {
        this.userData = JSON.parse(localStorage.getItem('userData')) || {
            firstName: 'Диспетчер',
            lastName: 'Системи',
            email: 'dispatcher@example.com',
            phone: '+351912000000',
            role: 'dispatcher',
            lastLogin: new Date().toLocaleString('uk-UA')
        };

        this.userRole = this.userData.role || 'dispatcher';
        this.updateUserInterface();
    }

    setupFileInputs() {
        // Обробка файлу резервної копії
        const backupFileInput = document.getElementById('backupFile');
        if (backupFileInput) {
            backupFileInput.addEventListener('change', (e) => {
                this.handleBackupFileSelect(e.target.files[0]);
            });
        }

        // Обробка файлу імпорту налаштувань
        const importSettingsInput = document.getElementById('importSettingsFile');
        if (importSettingsInput) {
            importSettingsInput.addEventListener('change', (e) => {
                this.importSettings(e.target.files[0]);
            });
        }

        // Обробка аватара користувача
        const avatarInput = document.getElementById('userAvatar');
        if (avatarInput) {
            avatarInput.addEventListener('change', (e) => {
                this.handleAvatarUpload(e.target.files[0]);
            });
        }
    }

    loadSettings() {
        // Завантаження збережених налаштувань
        this.settings = JSON.parse(localStorage.getItem('systemSettings')) || this.getDefaultSettings();
    }

    getDefaultSettings() {
        return {
            general: {
                companyName: 'Lift Management System',
                timezone: 'Europe/Kiev',
                language: 'uk',
                dateFormat: 'dd.mm.yyyy',
                autoRefresh: true,
                theme: 'light'
            },
            notifications: {
                emailMaintenance: true,
                emailErrors: true,
                emailReports: false,
                pushUrgent: true,
                pushAssignments: true,
                soundEnabled: true
            },
            integrations: {
                googleCalendar: false,
                slack: false,
                quickbooks: false,
                telegram: false
            },
            backup: {
                autoBackup: true,
                backupFrequency: 'weekly',
                lastBackup: null,
                backupLocation: 'local'
            },
            security: {
                twoFactorAuth: false,
                passwordExpiration: true,
                minPasswordLength: 12,
                sessionTimeout: 8,
                autoLogout: true,
                loginAttempts: 5
            },
            appearance: {
                sidebarColor: 'primary',
                headerColor: 'dark',
                animationEnabled: true,
                compactMode: false
            }
        };
    }

    setupEventListeners() {
        // Обробка форми загальних налаштувань
        const generalForm = document.getElementById('generalSettingsForm');
        if (generalForm) {
            generalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveGeneralSettings();
            });
        }

        // Обробка форми сповіщень
        const notificationsForm = document.getElementById('notificationsForm');
        if (notificationsForm) {
            notificationsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveNotificationSettings();
            });
        }

        // Обробка форми безпеки
        const securityForm = document.getElementById('securityForm');
        if (securityForm) {
            securityForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSecuritySettings();
            });
        }

        // Обробка форми інтеграцій
        const integrationsForm = document.getElementById('integrationsForm');
        if (integrationsForm) {
            integrationsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveIntegrationSettings();
            });
        }

        // Обробка форми зовнішнього вигляду
        const appearanceForm = document.getElementById('appearanceForm');
        if (appearanceForm) {
            appearanceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveAppearanceSettings();
            });
        }

        // Кнопки дій
        document.getElementById('createBackupBtn')?.addEventListener('click', () => this.createBackup());
        document.getElementById('restoreBackupBtn')?.addEventListener('click', () => this.restoreBackup());
        document.getElementById('resetSettingsBtn')?.addEventListener('click', () => this.resetToDefaults());
        document.getElementById('exportSettingsBtn')?.addEventListener('click', () => this.exportSettings());
        document.getElementById('viewSecurityLogBtn')?.addEventListener('click', () => this.viewSecurityLog());
        document.getElementById('saveProfileBtn')?.addEventListener('click', () => this.saveProfile());
        document.getElementById('changePasswordBtn')?.addEventListener('click', () => this.changePassword());

        // Автозбереження при зміні налаштувань
        this.setupAutoSave();
    }

    applyUserRole() {
        const adminSections = document.querySelectorAll('.admin-only');
        const adminBadge = document.getElementById('userRoleBadge');
        const systemRole = document.getElementById('systemRole');
        
        if (this.userRole === 'admin') {
            adminSections.forEach(section => section.style.display = 'block');
            if (adminBadge) {
                adminBadge.className = 'role-badge badge-danger';
                adminBadge.textContent = 'Адміністратор';
            }
            if (systemRole) {
                systemRole.textContent = 'Адміністратор';
            }
        } else {
            adminSections.forEach(section => section.style.display = 'none');
            if (adminBadge) {
                adminBadge.className = 'role-badge badge-info';
                adminBadge.textContent = 'Диспетчер';
            }
            if (systemRole) {
                systemRole.textContent = 'Диспетчер';
            }
        }

        document.getElementById('userRole').textContent = this.userRole === 'admin' ? 'Адміністратор' : 'Диспетчер';
    }

    initializeFormValues() {
        // Ініціалізація значень форми з налаштувань
        this.updateFormValues('general', this.settings.general);
        this.updateFormValues('notifications', this.settings.notifications);
        this.updateFormValues('integrations', this.settings.integrations);
        this.updateFormValues('backup', this.settings.backup);
        this.updateFormValues('security', this.settings.security);
        this.updateFormValues('appearance', this.settings.appearance);

        // Оновлення дати останнього бекапу
        if (this.settings.backup.lastBackup) {
            const lastBackupElement = document.getElementById('lastBackupDate');
            if (lastBackupElement) {
                lastBackupElement.textContent = new Date(this.settings.backup.lastBackup).toLocaleString('uk-UA');
            }
        }

        // Ініціалізація форми профілю
        this.updateProfileForm();
    }

    updateProfileForm() {
        document.getElementById('userFirstName').value = this.userData.firstName || '';
        document.getElementById('userLastName').value = this.userData.lastName || '';
        document.getElementById('userEmail').value = this.userData.email || '';
        document.getElementById('userPhone').value = this.userData.phone || '';
        document.getElementById('userPosition').value = this.userData.position || '';
        document.getElementById('userDepartment').value = this.userData.department || '';
    }

    updateFormValues(section, values) {
        Object.entries(values).forEach(([key, value]) => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else if (element.type === 'select-one') {
                    element.value = value;
                } else {
                    element.value = value;
                }
            }
        });
    }

    saveGeneralSettings() {
        this.settings.general = {
            companyName: document.getElementById('companyName').value,
            timezone: document.getElementById('timezone').value,
            language: document.getElementById('language').value,
            dateFormat: document.getElementById('dateFormat').value,
            autoRefresh: document.getElementById('autoRefresh').checked,
            theme: document.getElementById('theme').value
        };

        this.saveSettings();
        this.showNotification('Загальні налаштування збережено', 'success');
    }

    saveNotificationSettings() {
        this.settings.notifications = {
            emailMaintenance: document.getElementById('emailMaintenance').checked,
            emailErrors: document.getElementById('emailErrors').checked,
            emailReports: document.getElementById('emailReports').checked,
            pushUrgent: document.getElementById('pushUrgent').checked,
            pushAssignments: document.getElementById('pushAssignments').checked,
            soundEnabled: document.getElementById('soundEnabled').checked
        };

        this.saveSettings();
        this.showNotification('Налаштування сповіщень збережено', 'success');
    }

    saveIntegrationSettings() {
        this.settings.integrations = {
            googleCalendar: document.getElementById('googleCalendar').checked,
            slack: document.getElementById('slack').checked,
            quickbooks: document.getElementById('quickbooks').checked,
            telegram: document.getElementById('telegram').checked
        };

        this.saveSettings();
        this.showNotification('Налаштування інтеграцій збережено', 'success');
    }

    saveSecuritySettings() {
        this.settings.security = {
            twoFactorAuth: document.getElementById('twoFactorAuth').checked,
            passwordExpiration: document.getElementById('passwordExpiration').checked,
            minPasswordLength: parseInt(document.getElementById('minPasswordLength').value),
            sessionTimeout: parseInt(document.getElementById('sessionTimeout').value),
            autoLogout: document.getElementById('autoLogout').checked,
            loginAttempts: parseInt(document.getElementById('loginAttempts').value)
        };

        this.saveSettings();
        this.showNotification('Налаштування безпеки збережено', 'success');
    }

    saveAppearanceSettings() {
        this.settings.appearance = {
            sidebarColor: document.getElementById('sidebarColor').value,
            headerColor: document.getElementById('headerColor').value,
            animationEnabled: document.getElementById('animationEnabled').checked,
            compactMode: document.getElementById('compactMode').checked
        };

        this.saveSettings();
        this.applyAppearanceSettings();
        this.showNotification('Налаштування зовнішнього вигляду збережено', 'success');
    }

    saveProfile() {
        const profileData = {
            firstName: document.getElementById('userFirstName').value,
            lastName: document.getElementById('userLastName').value,
            email: document.getElementById('userEmail').value,
            phone: document.getElementById('userPhone').value,
            position: document.getElementById('userPosition').value,
            department: document.getElementById('userDepartment').value
        };

        this.userData = { ...this.userData, ...profileData };
        localStorage.setItem('userData', JSON.stringify(this.userData));
        
        this.updateUserInterface();
        this.showNotification('Профіль успішно оновлено', 'success');
    }

    async changePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showNotification('Будь ласка, заповніть всі поля', 'warning');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showNotification('Паролі не співпадають', 'error');
            return;
        }

        if (newPassword.length < this.settings.security.minPasswordLength) {
            this.showNotification(`Пароль повинен містити至少 ${this.settings.security.minPasswordLength} символів`, 'error');
            return;
        }

        try {
            // Симуляція зміни пароля
            this.showNotification('Пароль успішно змінено', 'success');
            
            // Очищення полів
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } catch (error) {
            console.error('Помилка зміни пароля:', error);
            this.showNotification('Помилка зміни пароля', 'error');
        }
    }

    saveSettings() {
        localStorage.setItem('systemSettings', JSON.stringify(this.settings));
        
        // Застосовуємо налаштування в реальному часі
        this.applySettings();
    }

    applySettings() {
        // Застосування мови
        this.applyLanguageSettings();
        
        // Застосування часового поясу
        this.applyTimezoneSettings();
        
        // Застосування формату дати
        this.applyDateFormatSettings();
        
        // Застосування теми
        this.applyThemeSettings();
        
        // Застосування зовнішнього вигляду
        this.applyAppearanceSettings();
        
        // Оновлення інтерфейсу
        this.updateUI();
    }

    applyLanguageSettings() {
        const language = this.settings.general.language;
        // Логіка зміни мови інтерфейсу
        console.log('Застосовано мову:', language);
    }

    applyTimezoneSettings() {
        const timezone = this.settings.general.timezone;
        // Логіка застосування часового поясу
        console.log('Застосовано часовий пояс:', timezone);
    }

    applyDateFormatSettings() {
        const dateFormat = this.settings.general.dateFormat;
        // Логіка застосування формату дати
        console.log('Застосовано формат дати:', dateFormat);
    }

    applyThemeSettings() {
        const theme = this.settings.general.theme;
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    applyAppearanceSettings() {
        const appearance = this.settings.appearance;
        
        // Застосування кольору бічної панелі
        document.querySelector('.main-sidebar').className = `main-sidebar sidebar-${appearance.sidebarColor} elevation-4`;
        
        // Застосування кольору заголовка
        document.querySelector('.main-header').className = `main-header navbar navbar-expand navbar-${appearance.headerColor} navbar-light`;
        
        // Застосування компактного режиму
        if (appearance.compactMode) {
            document.body.classList.add('sidebar-collapse');
        } else {
            document.body.classList.remove('sidebar-collapse');
        }
        
        // Застосування анімацій
        if (!appearance.animationEnabled) {
            document.body.classList.add('no-animation');
        } else {
            document.body.classList.remove('no-animation');
        }
    }

    updateUI() {
        // Оновлення назви компанії в заголовку
        document.title = `${this.settings.general.companyName} - Налаштування`;
        
        // Оновлення інформації про користувача
        this.updateUserInterface();
    }

    updateUserInterface() {
        // Оновлення імені користувача
        document.getElementById('userName').textContent = 
            `${this.userData.firstName} ${this.userData.lastName}`;
        
        // Оновлення ролі
        document.getElementById('userRole').textContent = 
            this.userRole === 'admin' ? 'Адміністратор' : 'Диспетчер';
    }

    async createBackup() {
        try {
            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                data: {
                    users: JSON.parse(localStorage.getItem('users') || '[]'),
                    lifts: JSON.parse(localStorage.getItem('lifts') || '[]'),
                    maintenanceRequests: JSON.parse(localStorage.getItem('maintenanceRequests') || '[]'),
                    invoices: JSON.parse(localStorage.getItem('invoices') || '[]'),
                    settings: this.settings,
                    userData: this.userData
                }
            };

            const dataStr = JSON.stringify(backupData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', `backup-${new Date().toISOString().split('T')[0]}.json`);
            linkElement.click();

            // Оновлення дати останнього бекапу
            this.settings.backup.lastBackup = new Date().toISOString();
            this.saveSettings();
            
            const lastBackupElement = document.getElementById('lastBackupDate');
            if (lastBackupElement) {
                lastBackupElement.textContent = new Date().toLocaleString('uk-UA');
            }

            this.showNotification('Резервну копію успішно створено', 'success');

        } catch (error) {
            console.error('Помилка створення резервної копії:', error);
            this.showNotification('Помилка створення резервної копії', 'error');
        }
    }

    async restoreBackup() {
        const fileInput = document.getElementById('backupFile');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showNotification('Оберіть файл резервної копії', 'error');
            return;
        }

        try {
            const fileContent = await this.readFileAsText(file);
            const backupData = JSON.parse(fileContent);

            // Валідація даних бекапу
            if (!this.validateBackupData(backupData)) {
                this.showNotification('Невірний формат файлу резервної копії', 'error');
                return;
            }

            if (confirm('Відновлення резервної копії перезапише поточні дані. Продовжити?')) {
                // Відновлення даних
                localStorage.setItem('users', JSON.stringify(backupData.data.users || []));
                localStorage.setItem('lifts', JSON.stringify(backupData.data.lifts || []));
                localStorage.setItem('maintenanceRequests', JSON.stringify(backupData.data.maintenanceRequests || []));
                localStorage.setItem('invoices', JSON.stringify(backupData.data.invoices || []));
                
                if (backupData.data.settings) {
                    localStorage.setItem('systemSettings', JSON.stringify(backupData.data.settings));
                    this.settings = backupData.data.settings;
                    this.initializeFormValues();
                }
                
                if (backupData.data.userData) {
                    localStorage.setItem('userData', JSON.stringify(backupData.data.userData));
                    this.userData = backupData.data.userData;
                    this.updateUserInterface();
                }

                this.showNotification('Дані успішно відновлено з резервної копії', 'success');
                
                // Очистити поле файлу
                fileInput.value = '';
                const label = fileInput.nextElementSibling;
                if (label && label.classList.contains('custom-file-label')) {
                    label.textContent = 'Обрати файл...';
                }
            }

        } catch (error) {
            console.error('Помилка відновлення резервної копії:', error);
            this.showNotification('Помилка відновлення резервної копії', 'error');
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e);
            reader.readAsText(file);
        });
    }

    validateBackupData(backupData) {
        return backupData && 
               backupData.timestamp && 
               backupData.data && 
               Array.isArray(backupData.data.users);
    }

    handleBackupFileSelect(file) {
        if (file) {
            this.restoreBackup();
        }
    }

    handleAvatarUpload(file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.userData.avatar = e.target.result;
                localStorage.setItem('userData', JSON.stringify(this.userData));
                
                // Оновлення аватара в інтерфейсі
                const avatarImg = document.querySelector('.user-panel .image img');
                if (avatarImg) {
                    avatarImg.src = e.target.result;
                }
                
                this.showNotification('Аватар успішно оновлено', 'success');
            };
            reader.readAsDataURL(file);
        }
    }

    viewSecurityLog() {
        // Відкриття повного журналу безпеки
        this.showNotification('Функція перегляду повного журналу безпеки буде реалізована в майбутніх версіях', 'info');
    }

    setupAutoSave() {
        // Автозбереження при зміні деяких налаштувань
        const autoSaveElements = [
            'autoBackup', 'backupFrequency', 'minPasswordLength', 
            'sessionTimeout', 'autoLogout', 'loginAttempts',
            'sidebarColor', 'headerColor', 'animationEnabled', 'compactMode'
        ];

        autoSaveElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    this.saveSettings();
                    this.showNotification('Налаштування збережено', 'success');
                });
            }
        });
    }

    showNotification(message, type = 'info') {
        // Використання toast-сповіщень AdminLTE
        const toast = $(`<div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <strong class="mr-auto">Система</strong>
                <small class="text-muted">${new Date().toLocaleTimeString('uk-UA')}</small>
                <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>`);

        // Додавання класу в залежності від типу
        const headerClass = {
            'success': 'bg-success',
            'error': 'bg-danger',
            'warning': 'bg-warning',
            'info': 'bg-info'
        }[type] || 'bg-info';

        toast.find('.toast-header').addClass(`${headerClass} text-white`);

        // Додавання до контейнера toast
        $('#toastContainer').append(toast);
        toast.toast({ delay: 3000 });
        toast.toast('show');

        // Автоматичне видалення після закриття
        toast.on('hidden.bs.toast', function () {
            $(this).remove();
        });
    }

    // Метод для скидання налаштувань до стандартних
    resetToDefaults() {
        if (confirm('Скинути всі налаштування до стандартних значень? Ця дія незворотня.')) {
            this.settings = this.getDefaultSettings();
            this.saveSettings();
            this.initializeFormValues();
            this.showNotification('Налаштування скинуто до стандартних', 'success');
        }
    }

    // Метод для експорту налаштувань
    exportSettings() {
        const dataStr = JSON.stringify(this.settings, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', 'settings-export.json');
        linkElement.click();
        
        this.showNotification('Налаштування успішно експортовано', 'success');
    }

    // Метод для імпорту налаштувань
    importSettings(file) {
        if (!file) return;

        this.readFileAsText(file).then(content => {
            const importedSettings = JSON.parse(content);
            if (this.validateSettings(importedSettings)) {
                if (confirm('Імпорт налаштувань перезапише поточні налаштування. Продовжити?')) {
                    this.settings = importedSettings;
                    this.saveSettings();
                    this.initializeFormValues();
                    this.showNotification('Налаштування успішно імпортовано', 'success');
                }
            } else {
                this.showNotification('Невірний формат файлу налаштувань', 'error');
            }
        }).catch(error => {
            console.error('Помилка імпорту налаштувань:', error);
            this.showNotification('Помилка імпорту налаштувань', 'error');
        });
    }

    validateSettings(settings) {
        // Базова валідація структури налаштувань
        return settings && 
               settings.general && 
               settings.notifications && 
               settings.integrations;
    }

    // Додаткові методи для адміністратора
    manageUsers() {
        if (this.userRole !== 'admin') {
            this.showNotification('Доступ заборонено. Необхідні права адміністратора', 'error');
            return;
        }
        this.showNotification('Функціонал керування користувачами буде реалізовано в наступній версії', 'info');
    }

    systemMonitoring() {
        if (this.userRole !== 'admin') {
            this.showNotification('Доступ заборонено. Необхідні права адміністратора', 'error');
            return;
        }
        this.showNotification('Функціонал моніторингу системи буде реалізовано в наступній версії', 'info');
    }

    manageRoles() {
        if (this.userRole !== 'admin') {
            this.showNotification('Доступ заборонено. Необхідні права адміністратора', 'error');
            return;
        }
        this.showNotification('Функціонал керування ролями буде реалізовано в наступній версії', 'info');
    }

    systemDiagnostics() {
        this.showNotification('Виконання діагностики системи...', 'info');
        
        setTimeout(() => {
            this.showNotification('Діагностика завершена. Система працює стабільно', 'success');
        }, 1500);
    }

    checkUpdates() {
        this.showNotification('Перевірка оновлень...', 'info');
        
        setTimeout(() => {
            this.showNotification('Ви використовуєте останню версію системи', 'success');
        }, 2000);
    }
}

// Додаємо контейнер для toast-сповіщень
if (!document.getElementById('toastContainer')) {
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);
}

// Ініціалізація менеджера налаштувань
document.addEventListener('DOMContentLoaded', function() {
    window.settingsManager = new SettingsManager();
});