/**
 * User Manager - Керування користувачами (AdminLTE версія)
 * Розташування: assets/js/modules/users-manager.js
 */

class UserManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.allUsers = [];
        this.filteredUsers = [];
        this.init();
    }

    init() {
        // logger.log('👥 Ініціалізація менеджера користувачів...');
        this.loadUsers();
        this.setupEventListeners();
        this.setupSearch();
        this.setupFilters();
        // logger.log('✅ Менеджер користувачів успішно ініціалізовано');
    }

    loadUsers() {
        try {
            // Спроба використати модуль database.js
            if (typeof Database !== 'undefined') {
                Database.getUsers().then(users => {
                    this.allUsers = users;
                    this.afterLoad();
                });
            } 
            // Спроба використати модуль storage.js
            else if (typeof StorageManager !== 'undefined') {
                StorageManager.getUsers().then(users => {
                    this.allUsers = users;
                    this.afterLoad();
                });
            }
            // Резервний варіант - localStorage
            else {
                const usersData = localStorage.getItem('users');
                this.allUsers = usersData ? JSON.parse(usersData) : [];
                
                // Якщо немає даних, завантажити демо-дані
                if (this.allUsers.length === 0) {
                    this.allUsers = this.getDemoData();
                    this.saveUsers();
                }
                
                this.afterLoad();
            }
        } catch (error) {
            // logger.error('Помилка завантаження користувачів:', error);
            this.showNotification('Помилка завантаження даних', 'error');
        }
    }

    afterLoad() {
        this.filteredUsers = [...this.allUsers];
        this.renderUsersTable();
        this.renderPagination();
        this.updateStats();
    }

    getDemoData() {
        return [
            {
                id: 'ADM-001',
                firstName: 'Адміністратор',
                lastName: 'Системи',
                email: 'admin@liftmaster.com',
                role: 'admin',
                status: 'active',
                phone: '+380501234567',
                department: 'Адміністрування',
                createdAt: '2024-01-01',
                lastLogin: '2024-03-15',
                password: this.hashPassword('admin123')
            },
            {
                id: 'TEC-001',
                firstName: 'Іван',
                lastName: 'Петренко',
                email: 'technician@liftmaster.com',
                role: 'technician',
                status: 'active',
                phone: '+380671234567',
                department: 'Технічний відділ',
                createdAt: '2024-01-15',
                lastLogin: '2024-03-14',
                password: this.hashPassword('tech123')
            },
            {
                id: 'DIS-001',
                firstName: 'Олена',
                lastName: 'Коваленко',
                email: 'dispatcher@liftmaster.com',
                role: 'dispatcher',
                status: 'active',
                phone: '+380631234567',
                department: 'Диспетчерська',
                createdAt: '2024-02-01',
                lastLogin: '2024-03-15',
                password: this.hashPassword('dispatch123')
            },
            {
                id: 'CLI-001',
                firstName: 'ТОВ',
                lastName: 'Будівельник',
                email: 'client@builder.com',
                role: 'client',
                status: 'active',
                phone: '+380441234567',
                department: 'Будівництво',
                createdAt: '2024-02-15',
                lastLogin: '2024-03-10',
                password: this.hashPassword('client123')
            }
        ];
    }

    saveUsers() {
        try {
            if (typeof Database !== 'undefined') {
                Database.saveUsers(this.allUsers);
            } else if (typeof StorageManager !== 'undefined') {
                StorageManager.saveUsers(this.allUsers);
            } else {
                localStorage.setItem('users', JSON.stringify(this.allUsers));
            }
        } catch (error) {
            // logger.error('Помилка збереження даних:', error);
            this.showNotification('Помилка збереження даних', 'error');
        }
    }

    setupEventListeners() {
        // Додавання користувача
        $('#addUserBtn').on('click', () => {
            this.openModal();
        });

        // Збереження форми
        $('#userForm').on('submit', (e) => {
            e.preventDefault();
            this.saveUser();
        });

        // Закриття модального вікна
        $(document).on('click', '[data-dismiss="modal"]', () => {
            $('#userModal').modal('hide');
        });

        // Обробка закриття модального вікна
        $('#userModal').on('hidden.bs.modal', () => {
            this.resetForm();
        });
    }

    setupSearch() {
        $('#searchInput').on('input', (e) => {
            this.searchUsers(e.target.value);
        });
    }

    setupFilters() {
        $('#roleFilter, #statusFilter').on('change', () => {
            this.applyFilters();
        });
    }

    renderUsersTable() {
        const tbody = $('#usersTable tbody');
        tbody.empty();

        if (this.filteredUsers.length === 0) {
            tbody.html(`
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <i class="fas fa-users fa-3x text-muted mb-3"></i>
                        <h5>Користувачів не знайдено</h5>
                        <p class="text-muted">Спробуйте змінити фільтри або додати нового користувача</p>
                        <button class="btn btn-primary" data-toggle="modal" data-target="#userModal">
                            <i class="fas fa-plus"></i> Додати користувача
                        </button>
                    </td>
                </tr>
            `);
            return;
        }

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginatedUsers = this.filteredUsers.slice(start, end);

        paginatedUsers.forEach(user => {
            const row = `
                <tr>
                    <td>${user.id}</td>
                    <td>
                        <div class="user-info">
                            <div class="user-name">${user.firstName} ${user.lastName}</div>
                            <small class="text-muted">${user.email}</small>
                        </div>
                    </td>
                    <td>${user.phone || '-'}</td>
                    <td>${user.department || '-'}</td>
                    <td><span class="badge ${this.getRoleBadgeClass(user.role)}">${this.getRoleLabel(user.role)}</span></td>
                    <td><span class="badge ${this.getStatusBadgeClass(user.status)}">${this.getStatusLabel(user.status)}</span></td>
                    <td>${this.formatDate(user.createdAt)}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-primary" data-toggle="modal" data-target="#userModal" data-user-id="${user.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm ${user.status === 'active' ? 'btn-warning' : 'btn-success'}" onclick="userManager.toggleUserStatus('${user.id}')">
                                <i class="fas ${user.status === 'active' ? 'fa-user-slash' : 'fa-user-check'}"></i>
                            </button>
                            <button class="btn btn-sm btn-info" onclick="userManager.viewUserDetails('${user.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });

        // Додаємо обробники для редагування
        $('[data-user-id]').on('click', (e) => {
            const userId = $(e.currentTarget).data('user-id');
            this.editUser(userId);
        });
    }

    renderPagination() {
        const pagination = $('#pagination');
        pagination.empty();

        const totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
        
        if (totalPages <= 1) {
            pagination.html(`
                <div class="pagination-info">
                    Показано ${this.filteredUsers.length} з ${this.filteredUsers.length} користувачів
                </div>
            `);
            return;
        }

        let html = `
            <div class="pagination-info">
                Показано ${Math.min(this.itemsPerPage, this.filteredUsers.length)} з ${this.filteredUsers.length} користувачів
            </div>
            <ul class="pagination pagination-sm m-0 ml-auto">
        `;

        // Попередня сторінка
        html += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;

        // Сторінки
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${this.currentPage === i ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        // Наступна сторінка
        html += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;

        html += '</ul>';
        pagination.html(html);

        // Обробник кліків по пагінації
        pagination.find('.page-link').on('click', (e) => {
            e.preventDefault();
            const page = parseInt($(e.target).closest('.page-link').data('page'));
            if (page >= 1 && page <= totalPages) {
                this.currentPage = page;
                this.renderUsersTable();
            }
        });
    }

    updateStats() {
        $('#totalUsers').text(this.allUsers.length);
        $('#activeUsers').text(this.allUsers.filter(u => u.status === 'active').length);
        $('#technicianUsers').text(this.allUsers.filter(u => u.role === 'technician').length);
        $('#adminUsers').text(this.allUsers.filter(u => u.role === 'admin').length);
    }

    searchUsers(query) {
        if (!query.trim()) {
            this.filteredUsers = [...this.allUsers];
        } else {
            const searchTerm = query.toLowerCase();
            this.filteredUsers = this.allUsers.filter(user =>
                (user.firstName && user.firstName.toLowerCase().includes(searchTerm)) ||
                (user.lastName && user.lastName.toLowerCase().includes(searchTerm)) ||
                (user.email && user.email.toLowerCase().includes(searchTerm)) ||
                (user.phone && user.phone.toLowerCase().includes(searchTerm)) ||
                (user.department && user.department.toLowerCase().includes(searchTerm)) ||
                (user.id && user.id.toLowerCase().includes(searchTerm))
            );
        }

        this.currentPage = 1;
        this.renderUsersTable();
        this.renderPagination();
    }

    applyFilters() {
        const roleFilter = $('#roleFilter').val();
        const statusFilter = $('#statusFilter').val();

        this.filteredUsers = this.allUsers.filter(user => {
            const roleMatch = roleFilter === 'all' || user.role === roleFilter;
            const statusMatch = statusFilter === 'all' || user.status === statusFilter;
            return roleMatch && statusMatch;
        });

        this.currentPage = 1;
        this.renderUsersTable();
        this.renderPagination();
    }

    openModal(user = null) {
        if (user) {
            $('#modalTitle').text('Редагувати користувача');
            this.fillForm(user);
        } else {
            $('#modalTitle').text('Додати користувача');
            this.resetForm();
        }
        
        $('#userModal').modal('show');
    }

    closeModal() {
        $('#userModal').modal('hide');
    }

    fillForm(user) {
        $('#userId').val(user.id);
        $('#userFirstName').val(user.firstName || '');
        $('#userLastName').val(user.lastName || '');
        $('#userEmail').val(user.email || '');
        $('#userPhone').val(user.phone || '');
        $('#userDepartment').val(user.department || '');
        $('#userRole').val(user.role || '');
        $('#userStatus').val(user.status || 'active');
        
        // Пароль не обов'язковий при редагуванні
        $('#userPassword').prop('required', false);
        $('#userPassword').attr('placeholder', 'Залиште порожнім для збереження поточного пароля');
    }

    resetForm() {
        $('#userForm')[0].reset();
        $('#userId').val('');
        $('#userPassword').prop('required', true);
        $('#userPassword').removeAttr('placeholder');
        
        // Очистити повідомлення про помилки
        $('.invalid-feedback').remove();
        $('.is-invalid').removeClass('is-invalid');
    }

    editUser(id) {
        const user = this.allUsers.find(u => u.id === id);
        if (user) {
            this.openModal(user);
        }
    }

    saveUser() {
        const formData = {
            id: $('#userId').val() || this.generateId('USR-'),
            firstName: $('#userFirstName').val(),
            lastName: $('#userLastName').val(),
            email: $('#userEmail').val(),
            phone: $('#userPhone').val(),
            department: $('#userDepartment').val(),
            role: $('#userRole').val(),
            status: $('#userStatus').val(),
            updatedAt: new Date().toISOString()
        };

        // Валідація
        if (!this.validateUser(formData)) {
            return;
        }

        const password = $('#userPassword').val();
        if (password) {
            formData.password = this.hashPassword(password);
        }

        try {
            const existingIndex = this.allUsers.findIndex(u => u.id === formData.id);
            
            if (existingIndex >= 0) {
                // Оновлення існуючого користувача
                if (!password) {
                    formData.password = this.allUsers[existingIndex].password;
                }
                this.allUsers[existingIndex] = {
                    ...this.allUsers[existingIndex],
                    ...formData
                };
            } else {
                // Додавання нового користувача
                formData.createdAt = new Date().toISOString();
                formData.password = formData.password || this.hashPassword('default123');
                this.allUsers.push(formData);
            }

            this.saveUsers();
            this.filteredUsers = [...this.allUsers];
            this.renderUsersTable();
            this.renderPagination();
            this.updateStats();
            
            this.closeModal();
            this.showNotification('Користувача успішно збережено', 'success');
            
        } catch (error) {
            // logger.error('Помилка збереження користувача:', error);
            this.showNotification('Помилка збереження користувача', 'error');
        }
    }

    validateUser(user) {
        let isValid = true;
        const errors = [];

        // Очистити попередні помилки
        $('.invalid-feedback').remove();
        $('.is-invalid').removeClass('is-invalid');

        if (!user.firstName || !user.firstName.trim()) {
            errors.push('Ім\'я обов\'язкове');
            $('#userFirstName').addClass('is-invalid');
            isValid = false;
        }

        if (!user.lastName || !user.lastName.trim()) {
            errors.push('Прізвище обов\'язкове');
            $('#userLastName').addClass('is-invalid');
            isValid = false;
        }

        if (!user.email || !user.email.trim()) {
            errors.push('Email обов\'язковий');
            $('#userEmail').addClass('is-invalid');
            isValid = false;
        } else if (!this.isValidEmail(user.email)) {
            errors.push('Невірний формат email');
            $('#userEmail').addClass('is-invalid');
            isValid = false;
        }

        if (!user.id && !$('#userPassword').val()) {
            errors.push('Пароль обов\'язковий для нового користувача');
            $('#userPassword').addClass('is-invalid');
            isValid = false;
        }

        if (!isValid) {
            this.showNotification(errors.join('<br>'), 'error');
        }

        return isValid;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    toggleUserStatus(id) {
        if (!confirm('Ви впевнені, що хочете змінити статус цього користувача?')) {
            return;
        }

        const userIndex = this.allUsers.findIndex(u => u.id === id);
        
        if (userIndex >= 0) {
            this.allUsers[userIndex].status = this.allUsers[userIndex].status === 'active' ? 'inactive' : 'active';
            this.saveUsers();
            this.filteredUsers = [...this.allUsers];
            this.renderUsersTable();
            this.updateStats();
            
            this.showNotification(
                `Статус користувача змінено на ${this.getStatusLabel(this.allUsers[userIndex].status)}`, 
                'success'
            );
        }
    }

    viewUserDetails(id) {
        const user = this.allUsers.find(u => u.id === id);
        if (user) {
            // Тут можна реалізувати перегляд деталей користувача
            const details = `
                <strong>ID:</strong> ${user.id}<br>
                <strong>Повне ім'я:</strong> ${user.firstName} ${user.lastName}<br>
                <strong>Email:</strong> ${user.email}<br>
                <strong>Телефон:</strong> ${user.phone || 'Не вказано'}<br>
                <strong>Відділ:</strong> ${user.department || 'Не вказано'}<br>
                <strong>Роль:</strong> ${this.getRoleLabel(user.role)}<br>
                <strong>Статус:</strong> ${this.getStatusLabel(user.status)}<br>
                <strong>Дата реєстрації:</strong> ${this.formatDate(user.createdAt)}<br>
                <strong>Останнє оновлення:</strong> ${this.formatDate(user.updatedAt)}
            `;
            
            this.showNotification(details, 'info', 5000);
        }
    }

    getRoleLabel(role) {
        const roles = {
            'admin': 'Адміністратор',
            'technician': 'Технік',
            'dispatcher': 'Диспетчер',
            'client': 'Клієнт'
        };
        return roles[role] || role;
    }

    getStatusLabel(status) {
        const statuses = {
            'active': 'Активний',
            'inactive': 'Неактивний'
        };
        return statuses[status] || status;
    }

    getRoleBadgeClass(role) {
        const classes = {
            'admin': 'badge-danger',
            'technician': 'badge-warning',
            'dispatcher': 'badge-info',
            'client': 'badge-primary'
        };
        return classes[role] || 'badge-secondary';
    }

    getStatusBadgeClass(status) {
        const classes = {
            'active': 'badge-success',
            'inactive': 'badge-secondary'
        };
        return classes[status] || 'badge-secondary';
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('uk-UA');
        } catch (error) {
            return dateString;
        }
    }

    generateId(prefix = '') {
        return prefix + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    }

    hashPassword(password) {
        // Просте хешування (в реальному додатку використовуйте bcrypt)
        return btoa(encodeURIComponent(password));
    }

    showNotification(message, type = 'info', duration = 3000) {
        // Використання вбудованих сповіщень AdminLTE
        $.notify({
            icon: type === 'success' ? 'fas fa-check' : 
                  type === 'error' ? 'fas fa-exclamation-triangle' : 
                  type === 'warning' ? 'fas fa-exclamation-circle' : 'fas fa-info-circle',
            message: message
        }, {
            type: type,
            placement: {
                from: 'top',
                align: 'right'
            },
            animate: {
                enter: 'animated fadeInRight',
                exit: 'animated fadeOutRight'
            },
            delay: duration,
            template: '<div data-notify="container" class="col-xs-11 col-sm-3 alert alert-{0}" role="alert">' +
                      '<button type="button" aria-hidden="true" class="close" data-notify="dismiss">×</button>' +
                      '<span data-notify="icon"></span> ' +
                      '<span data-notify="title">{1}</span> ' +
                      '<span data-notify="message">{2}</span>' +
                      '</div>'
        });
    }
}

// Ініціалізація після завантаження документа
$(document).ready(function() {
    window.userManager = new UserManager();
});