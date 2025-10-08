class ProfileManager {
    constructor() {
        this.apiUrl = 'http://localhost:3001/api';
        this.wsClient = null;
        this.userData = null;
        this.userStats = null;
        this.users = [];
        this.selectedUser = null;
        this.userId = localStorage.getItem('userId') || 'profile-admin-001';
        this.init();
    }

    async init() {
        this.loadUserData();
        this.loadUserStats();
        await this.setupWebSocket();
        await this.loadUsers();
        this.setupEventListeners();
        this.updateUI();
        this.loadActivity();
        this.loadSessions();
        this.setupRealTimeFeatures();
    }

    async setupWebSocket() {
        if (typeof WebSocketUtils !== 'undefined') {
            this.wsClient = WebSocketUtils.init(this.userId, localStorage.getItem('authToken'));
            
            this.wsClient.on('user_profile_updated', (data) => {
                this.handleProfileUpdate(data);
            });
            
            this.wsClient.on('user_status_changed', (data) => {
                this.handleUserStatusChange(data);
            });

            this.wsClient.on('permission_changed', (data) => {
                this.handlePermissionChange(data);
            });

            this.wsClient.on('user_created', (data) => {
                this.handleUserCreated(data);
            });

            this.wsClient.on('user_deleted', (data) => {
                this.handleUserDeleted(data);
            });
            
            console.log('🔌 WebSocket підключено до Profile Manager');
        }
    }

    setupRealTimeFeatures() {
        // Відправка статусу активності
        this.broadcastUserActivity();
        setInterval(() => this.broadcastUserActivity(), 60000); // Кожну хвилину
    }

    setupEventListeners() {
        // Автозбереження налаштувань
        $('input[type="checkbox"], select').on('change', () => {
            this.saveSettings();
        });
    }

    loadUserData() {
        this.userData = JSON.parse(localStorage.getItem('userData')) || this.getDefaultUserData();
        this.applyUserData();
    }

    getDefaultUserData() {
        return {
            firstName: 'Клієнт',
            lastName: 'Клієнтович',
            email: 'client@example.com',
            phone: '+380 (00) 000-00-00',
            company: 'ТОВ "Приклад"',
            address: 'м. Київ, вул. Прикладна, 123',
            city: 'Київ',
            region: 'Київська область',
            zip: '01001',
            avatar: null,
            settings: {
                language: 'uk',
                timezone: 'Europe/Kiev',
                notifications: {
                    email: true,
                    push: true,
                    sms: false
                },
                security: {
                    twoFactor: true,
                    emailAlerts: true
                }
            },
            subscription: {
                plan: 'premium',
                startDate: '2024-01-01',
                paymentMethod: 'credit_card',
                nextPayment: '2024-06-01'
            },
            createdAt: '2024-01-01T00:00:00.000Z'
        };
    }

    loadUserStats() {
        this.userStats = JSON.parse(localStorage.getItem('userStats')) || {
            lifts: 3,
            activeRequests: 2,
            tickets: 5,
            yearsWithUs: 1
        };
        this.updateStats();
    }

    applyUserData() {
        // Оновлення інтерфейсу з даними користувача
        $('#profileName').text(`${this.userData.firstName} ${this.userData.lastName}`);
        $('#profileEmail').text(this.userData.email);
        $('#sidebarName').text(this.userData.firstName);
        
        // Оновлення інформації в профілі
        $('#infoFullName').text(`${this.userData.firstName} ${this.userData.lastName}`);
        $('#infoEmail').text(this.userData.email);
        $('#infoPhone').text(this.userData.phone);
        $('#infoCompany').text(this.userData.company);
        $('#infoAddress').text(this.userData.address);
        $('#infoCity').text(this.userData.city);
        $('#infoRegion').text(this.userData.region);
        $('#infoZip').text(this.userData.zip);
        
        // Оновлення аватара
        this.updateAvatar();
        
        // Застосування налаштувань
        this.applySettings();
    }

    updateStats() {
        $('#statsLifts').text(this.userStats.lifts);
        $('#statsRequests').text(this.userStats.activeRequests);
        $('#statsTickets').text(this.userStats.tickets);
        
        const yearsWithUs = Math.floor((new Date() - new Date(this.userData.createdAt)) / (365 * 24 * 60 * 60 * 1000));
        $('#statsYears').text(yearsWithUs);
    }

    updateAvatar() {
        if (this.userData.avatar) {
            $('#profileAvatar').html(`<img src="${this.userData.avatar}" alt="Аватар">`);
            $('#sidebarAvatar').attr('src', this.userData.avatar);
        } else {
            const initials = `${this.userData.firstName.charAt(0)}${this.userData.lastName.charAt(0)}`.toUpperCase();
            $('#profileAvatar').html(initials);
        }
    }

    applySettings() {
        // Застосування налаштувань з форми
        if (this.userData.settings) {
            $('#languageSelect').val(this.userData.settings.language || 'uk');
            $('#timezoneSelect').val(this.userData.settings.timezone || 'Europe/Kiev');
            
            if (this.userData.settings.notifications) {
                $('#notifyEmail').prop('checked', this.userData.settings.notifications.email);
                $('#notifyPush').prop('checked', this.userData.settings.notifications.push);
                $('#notifySMS').prop('checked', this.userData.settings.notifications.sms);
            }
            
            if (this.userData.settings.security) {
                $('#security2FA').prop('checked', this.userData.settings.security.twoFactor);
                $('#securityEmail').prop('checked', this.userData.settings.security.emailAlerts);
            }
        }
    }

    handleAvatarUpload(file) {
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            this.showNotification('Будь ласка, виберіть зображення', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('Розмір файлу не повинен перевищувати 5MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.userData.avatar = e.target.result;
            this.saveUserData();
            this.updateAvatar();
            this.showNotification('Аватар успішно оновлено', 'success');
        };
        reader.readAsDataURL(file);
    }

    editProfile() {
        // Заповнення форми редагування
        $('#editFirstName').val(this.userData.firstName);
        $('#editLastName').val(this.userData.lastName);
        $('#editEmail').val(this.userData.email);
        $('#editPhone').val(this.userData.phone);
        $('#editCompany').val(this.userData.company);
        $('#editAddress').val(this.userData.address);
        $('#editCity').val(this.userData.city);
        $('#editZip').val(this.userData.zip);
        
        $('#editProfileModal').modal('show');
    }

    saveProfile() {
        const form = document.getElementById('editProfileForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        this.userData = {
            ...this.userData,
            firstName: $('#editFirstName').val(),
            lastName: $('#editLastName').val(),
            email: $('#editEmail').val(),
            phone: $('#editPhone').val(),
            company: $('#editCompany').val(),
            address: $('#editAddress').val(),
            city: $('#editCity').val(),
            zip: $('#editZip').val()
        };
        
        this.saveUserData();
        this.applyUserData();
        $('#editProfileModal').modal('hide');
        
        this.showNotification('Профіль успішно оновлено', 'success');
    }

    changePassword() {
        const currentPassword = $('#currentPassword').val();
        const newPassword = $('#newPassword').val();
        const confirmPassword = $('#confirmPassword').val();
        
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
        
        // Симуляція зміни пароля
        this.showNotification('Пароль успішно змінено', 'success');
        $('#currentPassword').val('');
        $('#newPassword').val('');
        $('#confirmPassword').val('');
    }

    saveSettings() {
        this.userData.settings = {
            language: $('#languageSelect').val(),
            timezone: $('#timezoneSelect').val(),
            notifications: {
                email: $('#notifyEmail').is(':checked'),
                push: $('#notifyPush').is(':checked'),
                sms: $('#notifySMS').is(':checked')
            },
            security: {
                twoFactor: $('#security2FA').is(':checked'),
                emailAlerts: $('#securityEmail').is(':checked')
            }
        };
        
        this.saveUserData();
        this.showNotification('Налаштування збережено', 'success');
    }

    saveUserData() {
        localStorage.setItem('userData', JSON.stringify(this.userData));
    }

    loadActivity() {
        const activities = [
            {
                type: 'login',
                message: 'Вхід в систему',
                timestamp: new Date().toISOString(),
                icon: 'fa-sign-in-alt'
            },
            {
                type: 'profile_update',
                message: 'Оновлення профілю',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                icon: 'fa-user-edit'
            },
            {
                type: 'ticket_created',
                message: 'Створено нове звернення',
                timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                icon: 'fa-ticket-alt'
            },
            {
                type: 'request_completed',
                message: 'Заявку завершено',
                timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                icon: 'fa-check-circle'
            }
        ];
        
        this.renderActivity(activities);
    }

    renderActivity(activities) {
        const container = document.getElementById('activityTimeline');
        container.innerHTML = '';
        
        activities.forEach(activity => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            
            item.innerHTML = `
                <div class="timeline-date">
                    <i class="fas ${activity.icon} mr-2"></i>
                    ${new Date(activity.timestamp).toLocaleString('uk-UA')}
                </div>
                <div class="timeline-content">
                    ${activity.message}
                </div>
            `;
            
            container.appendChild(item);
        });
    }

    loadSessions() {
        const sessions = [
            {
                device: 'Chrome на Windows',
                location: 'Київ, Україна',
                ip: '192.168.1.1',
                lastActive: new Date().toISOString(),
                current: true
            },
            {
                device: 'Safari на iPhone',
                location: 'Київ, Україна',
                ip: '192.168.1.2',
                lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                current: false
            }
        ];
        
        this.renderSessions(sessions);
    }

    renderSessions(sessions) {
        const container = document.getElementById('activeSessions');
        container.innerHTML = '';
        
        sessions.forEach(session => {
            const sessionElement = document.createElement('div');
            sessionElement.className = 'session-item mb-3 p-3 border rounded';
            
            sessionElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${session.device}</strong>
                        <div class="text-muted small">
                            ${session.location} • ${session.ip}
                        </div>
                        <div class="text-muted smaller">
                            Активність: ${new Date(session.lastActive).toLocaleString('uk-UA')}
                        </div>
                    </div>
                    ${session.current ? 
                        '<span class="badge badge-success">Поточна</span>' :
                        '<button class="btn btn-sm btn-outline-danger">Завершити</button>'
                    }
                </div>
            `;
            
            container.appendChild(sessionElement);
        });
    }

    logoutAllSessions() {
        if (confirm('Завершити всі сесії, крім поточної?')) {
            this.showNotification('Всі інші сесії завершено', 'success');
            this.loadSessions(); // Оновити список сесій
        }
    }

    exportData() {
        const data = {
            userData: this.userData,
            stats: this.userStats,
            exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', `user-data-export-${new Date().toISOString().split('T')[0]}.json`);
        linkElement.click();
        
        this.showNotification('Дані успішно експортовано', 'success');
    }

    deleteAccount() {
        if (confirm('Ви впевнені, що хочете видалити свій акаунт? Цю дію не можна скасувати.')) {
            this.showNotification('Запит на видалення акаунта прийнято', 'info');
            // Тут буде логіка видалення акаунта
        }
    }

    updateUI() {
        // Оновлення інтерфейсу на основі даних
        this.updateSecurityStatus();
    }

    updateSecurityStatus() {
        let securityLevel = 'strong';
        let securityScore = 85;
        
        if (!this.userData.settings.security.twoFactor) {
            securityLevel = 'medium';
            securityScore = 60;
        }
        
        if (this.userData.phone === '+380 (00) 000-00-00') {
            securityLevel = 'weak';
            securityScore = 40;
        }
        
        $('#securityStatus').text({
            'strong': 'Сильний',
            'medium': 'Середній',
            'weak': 'Слабкий'
        }[securityLevel]).removeClass('badge-strong badge-medium badge-weak')
          .addClass(`badge-${securityLevel}`);
        
        $('.progress-bar')
            .removeClass('bg-success bg-warning bg-danger')
            .addClass({
                'strong': 'bg-success',
                'medium': 'bg-warning',
                'weak': 'bg-danger'
            }[securityLevel])
            .css('width', `${securityScore}%`);
    }

    showNotification(message, type = 'info') {
        const toast = $(`<div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <strong class="mr-auto">Профіль</strong>
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
            success: 'bg-success',
            error: 'bg-danger',
            warning: 'bg-warning',
            info: 'bg-info'
        }[type] || 'bg-info';

        toast.find('.toast-header').addClass(`${headerClass} text-white`);
        
        if (!document.getElementById('toastContainer')) {
            const container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        
        $('#toastContainer').append(toast);
        toast.toast({ delay: 3000 }).toast('show');
        toast.on('hidden.bs.toast', function () { $(this).remove(); });
    }

    // ===================================
    // WEBSOCKET REAL-TIME ФУНКЦІОНАЛЬНІСТЬ
    // ===================================

    broadcastUserActivity() {
        if (this.wsClient) {
            this.wsClient.send({
                type: 'user_activity',
                data: {
                    userId: this.userId,
                    activity: 'profile_management',
                    timestamp: new Date().toISOString(),
                    page: window.location.pathname
                }
            });
        }
    }

    handleProfileUpdate(data) {
        console.log('👤 Профіль оновлено:', data);
        
        if (data.userId === this.userId) {
            // Оновити свій профіль
            this.userData = { ...this.userData, ...data.updates };
            this.updateUI();
            this.showNotification('Ваш профіль оновлено', 'success');
        } else {
            // Оновити інформацію іншого користувача
            this.showNotification(`Профіль користувача оновлено`, 'info');
        }
    }

    handleUserStatusChange(data) {
        console.log('🔄 Статус користувача змінено:', data);
        this.showNotification(`Користувач ${data.status === 'online' ? 'онлайн' : 'офлайн'}`, 'info');
    }

    handlePermissionChange(data) {
        console.log('🔐 Права доступу змінено:', data);
        this.showNotification('Права доступу оновлено', 'warning');
    }

    handleUserCreated(data) {
        console.log('👤 Новий користувач:', data);
        this.showNotification(`Новий користувач: ${data.user.firstName}`, 'success');
    }

    handleUserDeleted(data) {
        console.log('🗑️ Користувач видалено:', data);
        this.showNotification('Користувач видалено з системи', 'danger');
    }

    async loadUsers() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${this.apiUrl}/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.users = await response.json();
            } else {
                this.users = this.getTestUsers();
            }
        } catch (error) {
            console.warn('Використовую тестових користувачів:', error);
            this.users = this.getTestUsers();
        }
    }

    getTestUsers() {
        return [
            {
                id: '1',
                firstName: 'Олександр',
                lastName: 'Іваненко',
                email: 'alex@liftmaster.com',
                role: 'admin',
                status: 'active',
                isOnline: true,
                department: 'Управління'
            },
            {
                id: '2',
                firstName: 'Марія',
                lastName: 'Петренко',
                email: 'maria@liftmaster.com',
                role: 'dispatcher',
                status: 'active',
                isOnline: true,
                department: 'Диспетчерська'
            }
        ];
    }

    // Синхронізація профілю
    async syncProfile() {
        if (this.wsClient) {
            this.wsClient.send({
                type: 'profile_sync_request',
                data: {
                    userId: this.userId,
                    timestamp: new Date().toISOString()
                }
            });
        }
    }

    // Оповіщення про зміни профілю
    notifyProfileChange(changes) {
        if (this.wsClient) {
            this.wsClient.send({
                type: 'profile_change_notification',
                data: {
                    userId: this.userId,
                    changes,
                    timestamp: new Date().toISOString()
                }
            });
        }
    }
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', function() {
    window.profileManager = new ProfileManager();
});