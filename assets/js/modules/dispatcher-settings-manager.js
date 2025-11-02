class DispatcherSettingsManager {
    constructor() {
        this.settings = {};
        this.userData = null;
        this.init();
    }

    init() {
        this.loadUserData();
        this.loadSettings();
        this.setupEventListeners();
        this.initializeFormValues();
        this.applySettings();
    }

    loadUserData() {
        this.userData = JSON.parse(localStorage.getItem('userData')) || {
            firstName: 'Диспетчер',
            lastName: 'Системи',
            email: 'dispatcher@example.com',
            phone: '+380001234567',
            role: 'dispatcher',
            lastLogin: new Date().toLocaleString('uk-UA')
        };
        this.updateUserInterface();
    }

    loadSettings() {
        this.settings = JSON.parse(localStorage.getItem('dispatcherSettings')) || this.getDefaultSettings();
    }

    getDefaultSettings() {
        return {
            notifications: {
                emailMaintenance: true,
                emailErrors: true,
                pushUrgent: true,
                pushAssignments: true,
                soundEnabled: true
            },
            interface: {
                autoRefresh: true,
                compactMode: false,
                showTechnicalInfo: false
            }
        };
    }

    setupEventListeners() {
        // Обробка форми сповіщень
        const notificationsForm = document.getElementById('notificationsForm');
        if (notificationsForm) {
            notificationsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveNotificationSettings();
            });
        }

        // Обробка форми інтерфейсу
        const interfaceForm = document.getElementById('interfaceForm');
        if (interfaceForm) {
            interfaceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveInterfaceSettings();
            });
        }

        // Кнопки дій
        document.getElementById('saveProfileBtn')?.addEventListener('click', () => this.saveProfile());
        document.getElementById('changePasswordBtn')?.addEventListener('click', () => this.changePassword());

        // Автозбереження при зміні налаштувань
        this.setupAutoSave();
    }

    initializeFormValues() {
        this.updateFormValues('notifications', this.settings.notifications);
        this.updateFormValues('interface', this.settings.interface);
        this.updateProfileForm();
    }

    updateProfileForm() {
        document.getElementById('userFirstName').value = this.userData.firstName || '';
        document.getElementById('userLastName').value = this.userData.lastName || '';
        document.getElementById('userEmail').value = this.userData.email || '';
        document.getElementById('userPhone').value = this.userData.phone || '';
    }

    updateFormValues(section, values) {
        Object.entries(values).forEach(([key, value]) => {
            const element = document.getElementById(key);
            if (element && element.type === 'checkbox') {
                element.checked = value;
            }
        });
    }

    saveNotificationSettings() {
        this.settings.notifications = {
            emailMaintenance: document.getElementById('emailMaintenance').checked,
            emailErrors: document.getElementById('emailErrors').checked,
            pushUrgent: document.getElementById('pushUrgent').checked,
            pushAssignments: document.getElementById('pushAssignments').checked,
            soundEnabled: document.getElementById('soundEnabled').checked
        };

        this.saveSettings();
        this.showNotification('Налаштування сповіщень збережено', 'success');
    }

    saveInterfaceSettings() {
        this.settings.interface = {
            autoRefresh: document.getElementById('autoRefresh').checked,
            compactMode: document.getElementById('compactMode').checked,
            showTechnicalInfo: document.getElementById('showTechnicalInfo').checked
        };

        this.saveSettings();
        this.applyInterfaceSettings();
        this.showNotification('Налаштування інтерфейсу збережено', 'success');
    }

    saveProfile() {
        const profileData = {
            firstName: document.getElementById('userFirstName').value,
            lastName: document.getElementById('userLastName').value,
            email: document.getElementById('userEmail').value,
            phone: document.getElementById('userPhone').value
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

        if (newPassword.length < 8) {
            this.showNotification('Пароль повинен містити至少 8 символів', 'error');
            return;
        }

        try {
            this.showNotification('Пароль успішно змінено', 'success');
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } catch (error) {
            this.showNotification('Помилка зміни пароля', 'error');
        }
    }

    saveSettings() {
        localStorage.setItem('dispatcherSettings', JSON.stringify(this.settings));
        this.applySettings();
    }

    applySettings() {
        this.applyInterfaceSettings();
        this.updateUI();
    }

    applyInterfaceSettings() {
        const interfaceSettings = this.settings.interface;
        
        // Застосування компактного режиму
        if (interfaceSettings.compactMode) {
            document.body.classList.add('sidebar-collapse');
        } else {
            document.body.classList.remove('sidebar-collapse');
        }

        // Автооновлення
        if (interfaceSettings.autoRefresh) {
            this.setupAutoRefresh();
        } else {
            this.clearAutoRefresh();
        }
    }

    setupAutoRefresh() {
        // Логіка автооновлення даних
        // logger.log('Автооновлення активовано');
    }

    clearAutoRefresh() {
        // Логіка вимкнення автооновлення
        // logger.log('Автооновлення вимкнено');
    }

    updateUI() {
        this.updateUserInterface();
    }

    updateUserInterface() {
        document.getElementById('userName').textContent = 
            `${this.userData.firstName} ${this.userData.lastName}`;
    }

    setupAutoSave() {
        const autoSaveElements = ['autoRefresh', 'compactMode', 'showTechnicalInfo'];
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

        const headerClass = {
            'success': 'bg-success',
            'error': 'bg-danger',
            'warning': 'bg-warning',
            'info': 'bg-info'
        }[type] || 'bg-info';

        toast.find('.toast-header').addClass(`${headerClass} text-white`);
        $('#toastContainer').append(toast);
        toast.toast({ delay: 3000 }).toast('show');
        toast.on('hidden.bs.toast', function () { $(this).remove(); });
    }
}

// Ініціалізація менеджера налаштувань диспетчера
document.addEventListener('DOMContentLoaded', function() {
    window.dispatcherSettingsManager = new DispatcherSettingsManager();
});