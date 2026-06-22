class NotificationManager {
    constructor() {
        this.notifications = [];
        this.filteredNotifications = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.init();
    }

    init() {
        this.loadNotifications();
        this.loadSettings();
        this.setupEventListeners();
        this.updateStats();
    }

    setupEventListeners() {
        // Автозбереження налаштувань
        $('input[type="checkbox"]').on('change', () => {
            this.saveSettings();
        });
    }

    loadNotifications() {
        try {
            const token = sessionStorage.getItem('liftmanager_jwt')
                || localStorage.getItem('liftmanager_jwt')
                || localStorage.getItem('authToken')
                || localStorage.getItem('token')
                || '';

            // Real data only: load from backend notifications collection
            fetch('/api/notifications', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            })
                .then(async (response) => {
                    if (!response.ok) throw new Error(`API indisponível (${response.status})`);
                    const payload = await response.json();
                    this.notifications = Array.isArray(payload.notifications)
                        ? payload.notifications
                        : (payload.data || []);

                    this.filteredNotifications = [...this.notifications];
                    this.renderNotifications();
                    this.updateBadges();
                })
                .catch((error) => {
                    console.error('Erro ao carregar notificações reais:', error);
                    this.notifications = [];
                    this.filteredNotifications = [];
                    this.renderNotifications();
                    this.updateBadges();
                });
        } catch (error) {
            console.error('Erro a carregar notificações:', error);
            this.notifications = [];
            this.filteredNotifications = [];
            this.renderNotifications();
            this.updateBadges();
        }
    }

    loadSettings() {
        this.settings = JSON.parse(localStorage.getItem('notificationSettings')) || {
            notifyMaintenance: true,
            notifyAlerts: true,
            notifyBilling: true,
            notifyEmail: true,
            notifyPush: true,
            notifySMS: false
        };
        
        this.applySettings();
    }

    applySettings() {
        Object.entries(this.settings).forEach(([key, value]) => {
            const element = document.getElementById(key);
            if (element) {
                element.checked = value;
            }
        });
    }

    saveSettings() {
        this.settings = {
            notifyMaintenance: document.getElementById('notifyMaintenance').checked,
            notifyAlerts: document.getElementById('notifyAlerts').checked,
            notifyBilling: document.getElementById('notifyBilling').checked,
            notifyEmail: document.getElementById('notifyEmail').checked,
            notifyPush: document.getElementById('notifyPush').checked,
            notifySMS: document.getElementById('notifySMS').checked
        };
        
        localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
        this.showNotification('Definições guardadas', 'success');
    }

    saveNotifications() {
        // No local demo cache anymore; keep only in-memory state.
    }

    renderNotifications() {
        const container = document.getElementById('notificationsContainer');
        container.innerHTML = '';
        
        if (this.filteredNotifications.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bell-slash"></i>
                    <h4>Sem notificações</h4>
                    <p>${this.searchTerm ? 'Tente outro termo de pesquisa' : 'Não tem notificações para o filtro selecionado'}</p>
                </div>
            `;
            return;
        }
        
        // Пагінація
        const totalPages = Math.ceil(this.filteredNotifications.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedNotifications = this.filteredNotifications.slice(startIndex, endIndex);
        
        paginatedNotifications.forEach(notification => {
            const notificationElement = this.createNotificationElement(notification);
            container.appendChild(notificationElement);
        });
        
        this.renderPagination(totalPages);
    }

    createNotificationElement(notification) {
        const div = document.createElement('div');
        div.className = `notification-card ${notification.read ? '' : 'unread'} ${notification.priority}`;
        
        const typeIcon = this.getTypeIcon(notification.type);
        const priorityBadge = this.getPriorityBadge(notification.priority);
        const timeAgo = this.getTimeAgo(notification.timestamp);
        
        div.innerHTML = `
            <div class="card-body">
                <div class="d-flex align-items-start">
                    <div class="notification-type-icon ${this.getTypeClass(notification.type)}">
                        <i class="fas ${typeIcon}"></i>
                    </div>
                    <div class="notification-content">
                        <div class="d-flex justify-content-between align-items-start">
                            <h5 class="notification-title">${notification.title}</h5>
                            <div class="notification-actions">
                                <button class="btn btn-sm btn-outline-secondary" onclick="notificationManager.toggleRead(${notification.id})" title="${notification.read ? 'Marcar como não lido' : 'Marcar como lido'}">
                                    <i class="fas ${notification.read ? 'fa-envelope' : 'fa-envelope-open'}"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="notificationManager.deleteNotification(${notification.id})" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <p class="notification-message">${notification.message}</p>
                        <div class="notification-meta">
                            ${priorityBadge}
                            <span class="notification-time">${timeAgo}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card-footer bg-transparent">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="notificationManager.viewNotification(${notification.id})">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    ${notification.actionUrl ? `
                    <button class="btn btn-outline-success" onclick="location.href='${notification.actionUrl}'">
                        <i class="fas fa-external-link-alt"></i> Detalhes
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        return div;
    }

    renderPagination(totalPages) {
        const pagination = document.getElementById('notificationsPagination');
        pagination.innerHTML = '';
        
        if (totalPages <= 1) return;
        
        // Попередня сторінка
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${this.currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#" onclick="notificationManager.changePage(${this.currentPage - 1})">‹</a>`;
        pagination.appendChild(prevLi);
        
        // Сторінки
        for (let i = 1; i <= totalPages; i++) {
            const pageLi = document.createElement('li');
            pageLi.className = `page-item ${this.currentPage === i ? 'active' : ''}`;
            pageLi.innerHTML = `<a class="page-link" href="#" onclick="notificationManager.changePage(${i})">${i}</a>`;
            pagination.appendChild(pageLi);
        }
        
        // Наступна сторінка
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${this.currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#" onclick="notificationManager.changePage(${this.currentPage + 1})">›</a>`;
        pagination.appendChild(nextLi);
    }

    changePage(page) {
        this.currentPage = page;
        this.renderNotifications();
        window.scrollTo(0, 0);
    }

    filterNotifications(filter) {
        this.currentFilter = filter;
        this.currentPage = 1;
        this.searchTerm = '';
        
        switch (filter) {
            case 'unread':
                this.filteredNotifications = this.notifications.filter(n => !n.read);
                break;
            case 'important':
                this.filteredNotifications = this.notifications.filter(n => n.priority === 'high' || n.priority === 'critical');
                break;
            case 'maintenance':
                this.filteredNotifications = this.notifications.filter(n => n.type === 'maintenance');
                break;
            default:
                this.filteredNotifications = [...this.notifications];
        }
        
        this.renderNotifications();
        this.updateStats();
    }

    searchNotifications() {
        const searchTerm = document.getElementById('searchNotifications').value.toLowerCase();
        this.searchTerm = searchTerm;
        this.currentPage = 1;
        
        if (!searchTerm) {
            this.filterNotifications(this.currentFilter);
            return;
        }
        
        this.filteredNotifications = this.notifications.filter(notification => 
            notification.title.toLowerCase().includes(searchTerm) ||
            notification.message.toLowerCase().includes(searchTerm) ||
            notification.type.toLowerCase().includes(searchTerm)
        );
        
        this.renderNotifications();
        this.updateStats();
    }

    sortByDate() {
        this.filteredNotifications.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        this.renderNotifications();
        this.showNotification('Ordenado por data', 'info');
    }

    sortByPriority() {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        this.filteredNotifications.sort((a, b) => 
            priorityOrder[b.priority] - priorityOrder[a.priority]
        );
        this.renderNotifications();
        this.showNotification('Ordenado por prioridade', 'info');
    }

    viewNotification(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (!notification) return;
        
        // Позначити як прочитане
        if (!notification.read) {
            this.toggleRead(id);
        }
        
        // Заповнити модальне вікно
        document.getElementById('modalNotificationTitle').textContent = notification.title;
        document.getElementById('modalNotificationContent').textContent = notification.message;
        document.getElementById('modalNotificationTime').textContent = this.getTimeAgo(notification.timestamp);
        
        // Іконка та пріоритет
        const iconElement = document.getElementById('modalNotificationIcon');
        iconElement.className = `notification-type-icon ${this.getTypeClass(notification.type)}`;
        iconElement.innerHTML = `<i class="fas ${this.getTypeIcon(notification.type)}"></i>`;
        
        const priorityElement = document.getElementById('modalNotificationPriority');
        priorityElement.className = `notification-badge ${this.getPriorityClass(notification.priority)}`;
        priorityElement.textContent = this.getPriorityText(notification.priority);
        
        // Кнопка дії
        const actionBtn = document.getElementById('modalNotificationActionBtn');
        if (notification.actionUrl) {
            actionBtn.style.display = 'block';
            actionBtn.onclick = () => {
                $('#viewNotificationModal').modal('hide');
                setTimeout(() => {
                    location.href = notification.actionUrl;
                }, 300);
            };
        } else {
            actionBtn.style.display = 'none';
        }
        
        $('#viewNotificationModal').modal('show');
    }

    toggleRead(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
            notification.read = !notification.read;
            this.saveNotifications();
            this.filterNotifications(this.currentFilter);
            this.updateBadges();
            this.showNotification(
                notification.read ? 'Notificação lida' : 'Notificação marcada como não lida', 
                'success'
            );
        }
    }

    markAllAsRead() {
        this.notifications.forEach(notification => {
            notification.read = true;
        });
        
        this.saveNotifications();
        this.filterNotifications(this.currentFilter);
        this.updateBadges();
        this.showNotification('Todas as notificações marcadas como lidas', 'success');
    }

    deleteNotification(id) {
        if (await swalConfirm('Eliminar esta notificação?')) {
            this.notifications = this.notifications.filter(n => n.id !== id);
            this.saveNotifications();
            this.filterNotifications(this.currentFilter);
            this.updateBadges();
            this.showNotification('Notificação eliminada', 'success');
        }
    }

    clearAll() {
        if (await swalConfirm('Eliminar todas as notificações? Esta ação não pode ser desfeita.')) {
            this.notifications = [];
            this.saveNotifications();
            this.filteredNotifications = [];
            this.renderNotifications();
            this.updateBadges();
            this.showNotification('Todas as notificações eliminadas', 'success');
        }
    }

    updateStats() {
        const total = this.notifications.length;
        const unread = this.notifications.filter(n => !n.read).length;
        const important = this.notifications.filter(n => n.priority === 'high' || n.priority === 'critical').length;
        
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayNotifications = this.notifications.filter(n => 
            new Date(n.timestamp) >= todayStart
        ).length;
        
        document.getElementById('totalNotifications').textContent = total;
        document.getElementById('unreadNotifications').textContent = unread;
        document.getElementById('importantNotifications').textContent = important;
        document.getElementById('todayNotifications').textContent = todayNotifications;
    }

    updateBadges() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        document.getElementById('notificationCount').textContent = unreadCount;
        document.getElementById('notificationsBadge').textContent = unreadCount;
        
        // Atualização заголовка вкладки
        document.title = unreadCount > 0 ? `(${unreadCount}) Notificações - Cliente` : 'Notificações - Cliente';
    }

    // Допоміжні методи
    getTypeIcon(type) {
        const icons = {
            maintenance: 'fa-tools',
            alert: 'fa-exclamation-triangle',
            info: 'fa-info-circle',
            update: 'fa-sync',
            billing: 'fa-file-invoice-dollar'
        };
        return icons[type] || 'fa-bell';
    }

    getTypeClass(type) {
        return `type-${type}`;
    }

    getPriorityBadge(priority) {
        const classes = {
            critical: 'bg-danger',
            high: 'bg-warning',
            medium: 'bg-info',
            low: 'bg-success'
        };
        
        const texts = {
            critical: 'Crítico',
            high: 'Alto',
            medium: 'Médio',
            low: 'Baixo'
        };
        
        return `<span class="notification-badge ${classes[priority]}">${texts[priority]}</span>`;
    }

    getPriorityClass(priority) {
        const classes = {
            critical: 'bg-danger',
            high: 'bg-warning',
            medium: 'bg-info',
            low: 'bg-success'
        };
        return classes[priority] || 'bg-secondary';
    }

    getPriorityText(priority) {
        const texts = {
            critical: 'Crítico',
            high: 'Alto',
            medium: 'Médio',
            low: 'Baixo'
        };
        return texts[priority] || 'Desconhecido';
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'agora mesmo';
        if (minutes < 60) return `${minutes} min atrás`;
        if (hours < 24) return `${hours} h atrás`;
        if (days < 7) return `${days} d atrás`;
        
        return time.toLocaleDateString('pt-PT');
    }

    showNotification(message, type = 'info') {
        const toast = $(`<div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <strong class="mr-auto">Notificações</strong>
                <small class="text-muted">${new Date().toLocaleTimeString('pt-PT')}</small>
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

    // Метод для додавання нового сповіщення (для тестування)
    addDemoNotification() {
        const types = ['maintenance', 'alert', 'info', 'update', 'billing'];
        const priorities = ['low', 'medium', 'high', 'critical'];
        const messages = [
            'Nova manutenção programada para a próxima semana.',
            'Detetada potencial falha no sistema de segurança.',
            'Calendário de trabalho dos técnicos atualizado para este mês.',
            'O seu último pedido foi concluído com sucesso.',
            'Nova fatura disponível para consulta na área pessoal.'
        ];
        
        const newNotification = {
            id: Math.max(...this.notifications.map(n => n.id), 0) + 1,
            title: 'Nova notificação',
            message: messages[Math.floor(Math.random() * messages.length)],
            type: types[Math.floor(Math.random() * types.length)],
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            read: false,
            timestamp: new Date().toISOString(),
            relatedTo: 'test',
            actionUrl: 'dashboard.html'
        };
        
        this.notifications.unshift(newNotification);
        this.saveNotifications();
        this.filterNotifications(this.currentFilter);
        this.updateBadges();
        this.showNotification('Notificação de demonstração adicionada', 'success');
    }
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', function() {
    window.notificationManager = new NotificationManager();
});