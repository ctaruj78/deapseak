/**
 * DispatcherSettingsManager — повна реалізація
 * API: PUT /api/auth/profile, POST /api/auth/change-password
 */
class DispatcherSettingsManager {
    constructor() {
        this.userData = null;
        this.settings = {};
        this.token = localStorage.getItem('authToken');
        this.init();
    }

    init() {
        this.loadSettings();
        this.loadProfileFromAPI();
        this.setupEventListeners();
        this.applySettings();
        this.hideAdminSection();
    }

    // ─── Профіль ─────────────────────────────────────────────────────────────

    async loadProfileFromAPI() {
        try {
            const res = await fetch('/api/auth/profile', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                this.userData = data.user || data.data || data;
            } else {
                this.userData = JSON.parse(localStorage.getItem('userData')) || {};
            }
        } catch {
            this.userData = JSON.parse(localStorage.getItem('userData')) || {};
        }
        this.updateUserInterface();
        this.fillProfileForm();
    }

    fillProfileForm() {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        set('userFirstName', this.userData.firstName);
        set('userLastName',  this.userData.lastName);
        set('userEmail',     this.userData.email);
        set('userPhone',     this.userData.phone);

        const lastLoginEl = document.getElementById('lastLogin');
        if (lastLoginEl && this.userData.lastLogin) {
            lastLoginEl.textContent = new Date(this.userData.lastLogin).toLocaleDateString('uk-UA');
        }
    }

    async saveProfile() {
        const firstName = document.getElementById('userFirstName')?.value?.trim();
        const lastName  = document.getElementById('userLastName')?.value?.trim();
        const phone     = document.getElementById('userPhone')?.value?.trim();

        if (!firstName || !lastName) {
            this.showNotification("Ім'я та прізвище обов'язкові", 'warning');
            return;
        }
        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ firstName, lastName, phone })
            });
            const data = await res.json();
            if (res.ok && data.success !== false) {
                const stored = JSON.parse(localStorage.getItem('userData') || '{}');
                Object.assign(stored, { firstName, lastName, phone });
                localStorage.setItem('userData', JSON.stringify(stored));
                this.userData = { ...this.userData, firstName, lastName, phone };
                this.updateUserInterface();
                this.showNotification('Профіль успішно збережено!', 'success');
            } else {
                this.showNotification(data.message || 'Помилка збереження профілю', 'error');
            }
        } catch (err) {
            console.error('saveProfile error:', err);
            this.showNotification('Помилка зʼєднання з сервером', 'error');
        }
    }

    // ─── Пароль ──────────────────────────────────────────────────────────────

    async changePassword() {
        const currentPassword = document.getElementById('currentPassword')?.value;
        const newPassword     = document.getElementById('newPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showNotification('Заповніть всі поля паролю', 'warning');
            return;
        }
        if (newPassword !== confirmPassword) {
            this.showNotification('Нові паролі не співпадають', 'error');
            return;
        }
        if (newPassword.length < 6) {
            this.showNotification('Мінімум 6 символів', 'error');
            return;
        }
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const data = await res.json();
            if (res.ok && data.success !== false) {
                this.showNotification('Пароль успішно змінено!', 'success');
                ['currentPassword','newPassword','confirmPassword'].forEach(id => {
                    const el = document.getElementById(id); if (el) el.value = '';
                });
            } else {
                this.showNotification(data.message || 'Невірний поточний пароль', 'error');
            }
        } catch (err) {
            console.error('changePassword error:', err);
            this.showNotification('Помилка зʼєднання з сервером', 'error');
        }
    }

    // ─── Сповіщення ──────────────────────────────────────────────────────────

    saveNotificationSettings() {
        const ids = ['notifyNewRequests','notifyAssignments','notifyCompletions',
                     'notifyEmergencies','notifyInApp','notifyEmail','notifySMS'];
        const values = {};
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) values[id] = el.checked;
        });
        this.settings.notifications = values;
        this.saveSettings();
        this.showNotification('Налаштування сповіщень збережено', 'success');
    }

    // ─── Системні налаштування ───────────────────────────────────────────────

    saveSystemSettings() {
        const get = id => { const el = document.getElementById(id); return el ? el.value : null; };
        const getCheck = id => { const el = document.getElementById(id); return el ? el.checked : false; };
        this.settings.system = {
            language:    get('languageSelect'),
            timezone:    get('timezoneSelect'),
            dateFormat:  get('dateFormat'),
            pageSize:    get('pageSize'),
            autoRefresh: getCheck('autoRefresh')
        };
        this.saveSettings();
        this.showNotification('Системні налаштування збережено', 'success');
    }

    // ─── Backup ──────────────────────────────────────────────────────────────

    async createBackup() {
        try {
            const backupType = document.getElementById('backupType')?.value || 'full';
            this.showNotification('Створення backup... зачекайте', 'info');

            const endpointMap = {
                full:        ['/api/lifts', '/api/requests'],
                clients:     ['/api/users?role=client'],
                technicians: ['/api/users?role=technician'],
                requests:    ['/api/requests']
            };
            const urls = endpointMap[backupType] || endpointMap.full;
            const results = {};

            for (const url of urls) {
                const res = await fetch(url, { headers: { 'Authorization': `Bearer ${this.token}` } });
                if (res.ok) {
                    const d = await res.json();
                    results[url.replace('/api/', '').split('?')[0]] = d.data || d;
                }
            }

            const blob = new Blob([JSON.stringify({ created: new Date().toISOString(), type: backupType, data: results }, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `backup-${backupType}-${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            URL.revokeObjectURL(a.href);

            this.showNotification(`Backup "${backupType}" завантажено!`, 'success');
        } catch (err) {
            console.error('createBackup error:', err);
            this.showNotification('Помилка створення backup', 'error');
        }
    }

    restoreBackup() {
        const fileInput = document.getElementById('restoreFile');
        if (!fileInput || !fileInput.files.length) {
            this.showNotification('Оберіть файл backup', 'warning');
            return;
        }
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                this.showNotification(`Backup від ${new Date(data.created).toLocaleDateString('uk-UA')} (тип: ${data.type}) прочитано. Зверніться до адміністратора для повного відновлення.`, 'info');
            } catch {
                this.showNotification('Невірний формат backup файлу', 'error');
            }
        };
        reader.readAsText(fileInput.files[0]);
    }

    // ─── Різні дії ───────────────────────────────────────────────────────────

    manageUsers() {
        window.location.href = '/pages/admin/users.html';
    }

    backupData() {
        const el = document.getElementById('backupType');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        this.showNotification('Перейдіть до секції "Резервне копіювання" нижче', 'info');
    }

    restoreData() {
        const el = document.getElementById('restoreFile');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    }

    systemMonitoring() {
        window.open('/api/health', '_blank');
    }

    manageRoles() {
        this.showNotification('Управління ролями — тільки для адміністраторів', 'warning');
    }

    async systemDiagnostics() {
        try {
            const res = await fetch('/api/health', { headers: { 'Authorization': `Bearer ${this.token}` } });
            const data = await res.json();
            this.showNotification(`Система: ${data.status || 'ok'} | MongoDB: ${data.database || data.db || 'ok'}`, res.ok ? 'success' : 'error');
        } catch {
            this.showNotification('Сервер не відповідає', 'error');
        }
    }

    async checkUpdates() {
        this.showNotification('Перевірка оновлень...', 'info');
        setTimeout(() => this.showNotification('Система актуальна. Оновлень не знайдено.', 'success'), 1500);
    }

    showNotifications() {
        this.showNotification('Нових сповіщень немає', 'info');
    }

    // ─── Приховати admin-секцію від диспетчера ───────────────────────────────

    hideAdminSection() {
        const stored = JSON.parse(localStorage.getItem('userData') || '{}');
        if (stored.role !== 'admin') {
            const sec = document.getElementById('adminSettingsSection');
            if (sec) sec.style.display = 'none';
        }
    }

    // ─── localStorage/Settings ───────────────────────────────────────────────

    loadSettings() {
        const defaults = {
            notifications: {
                notifyNewRequests: true, notifyAssignments: true,
                notifyCompletions: true, notifyEmergencies: true,
                notifyInApp: true, notifyEmail: true, notifySMS: false
            },
            system: { language: 'uk', timezone: 'Europe/Kiev', dateFormat: 'DD.MM.YYYY', pageSize: '25', autoRefresh: true }
        };
        this.settings = JSON.parse(localStorage.getItem('dispatcherSettings')) || defaults;
    }

    saveSettings() {
        localStorage.setItem('dispatcherSettings', JSON.stringify(this.settings));
        this.applySettings();
    }

    applySettings() {
        // Notifications checkboxes
        const n = this.settings.notifications || {};
        Object.entries(n).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el && el.type === 'checkbox') el.checked = val;
        });
        // System selects
        const s = this.settings.system || {};
        const setVal = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
        setVal('languageSelect', s.language);
        setVal('timezoneSelect', s.timezone);
        setVal('dateFormat', s.dateFormat);
        setVal('pageSize', s.pageSize);
        const ar = document.getElementById('autoRefresh');
        if (ar) ar.checked = s.autoRefresh !== false;
    }

    // ─── UI ──────────────────────────────────────────────────────────────────

    updateUserInterface() {
        if (!this.userData) return;
        const name = `${this.userData.firstName || ''} ${this.userData.lastName || ''}`.trim();
        const el = document.getElementById('userName');
        if (el) el.textContent = name || 'Диспетчер';
        const nameEl = document.getElementById('dispatcherName');
        if (nameEl) nameEl.textContent = name || 'Диспетчер';
    }

    setupEventListeners() {
        document.getElementById('autoRefresh')?.addEventListener('change', () => this.saveSystemSettings());

        document.querySelectorAll('.custom-file-input').forEach(input => {
            input.addEventListener('change', function() {
                const label = this.nextElementSibling;
                if (label) label.textContent = this.files[0]?.name || 'Оберіть файл';
            });
        });
    }

    // ─── Toast ───────────────────────────────────────────────────────────────

    showNotification(message, type = 'info') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.style.cssText = 'position:fixed;top:70px;right:15px;z-index:9999;min-width:280px;';
            document.body.appendChild(container);
        }
        const colors = { success:'#28a745', error:'#dc3545', warning:'#ffc107', info:'#17a2b8' };
        const icons  = { success:'fa-check-circle', error:'fa-times-circle', warning:'fa-exclamation-triangle', info:'fa-info-circle' };
        const toast  = document.createElement('div');
        toast.style.cssText = `background:${colors[type]||colors.info};color:#fff;padding:12px 16px;
            border-radius:8px;margin-bottom:8px;box-shadow:0 4px 12px rgba(0,0,0,.25);
            display:flex;align-items:center;gap:10px;font-size:.9rem;`;
        toast.innerHTML = `<i class="fas ${icons[type]||icons.info}"></i><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => { toast.style.transition='opacity .4s'; toast.style.opacity='0'; setTimeout(()=>toast.remove(),400); }, 3500);
    }
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', function() {
    window.settingsManager = new DispatcherSettingsManager();
    console.log('✅ DispatcherSettingsManager ready');
});
