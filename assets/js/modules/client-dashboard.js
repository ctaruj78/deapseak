// client-dashboard.js
class ClientDashboard {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.loadUserData();
        this.loadDashboardData();
        this.setupEventListeners();
    }

    loadUserData() {
        // Завантаження даних користувача з localStorage або API
        const userData = localStorage.getItem('userData');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.updateUserUI();
        } else {
            // Якщо даних немає, завантажуємо з API (імітація)
            this.fetchUserData();
        }
    }

    fetchUserData() {
        // Імітація запиту до API
        setTimeout(() => {
            this.currentUser = {
                id: 1,
                firstName: 'Олександр',
                lastName: 'Петренко',
                email: 'client@example.com',
                phone: '+380991234567',
                company: 'ТОВ "Українські будівлі"'
            };
            
            localStorage.setItem('userData', JSON.stringify(this.currentUser));
            this.updateUserUI();
        }, 500);
    }

    updateUserUI() {
        if (this.currentUser) {
            $('#clientName').text(`${this.currentUser.firstName} ${this.currentUser.lastName}`);
            $('#userName').text(`${this.currentUser.firstName} ${this.currentUser.lastName}`);
        }
    }

    loadDashboardData() {
        this.loadStatistics();
        this.loadRecentActivities();
        this.loadMaintenanceSchedule();
        this.loadNotifications();
        this.initCharts();
    }

    loadStatistics() {
        // Імітація завантаження статистики
        const stats = {
            totalLifts: 12,
            operationalLifts: 9,
            maintenanceLifts: 2,
            activeRequests: 3,
            notifications: 5
        };

        $('#totalLifts').text(stats.totalLifts);
        $('#operationalLifts').text(stats.operationalLifts);
        $('#maintenanceLifts').text(stats.maintenanceLifts);
        $('#activeRequests').text(stats.activeRequests);
        $('#notificationCount').text(stats.notifications);
        $('#notificationsBadge').text(stats.notifications);
        
        // Оновлення бейджу статусу
        if (stats.maintenanceLifts === 0) {
            $('#statusBadge').text('Всі працюють').removeClass().addClass('status-badge all-operational');
        } else if (stats.maintenanceLifts <= 2) {
            $('#statusBadge').text('Обслуговування').removeClass().addClass('status-badge maintenance-needed');
        } else {
            $('#statusBadge').text('Критично').removeClass().addClass('status-badge critical');
        }
    }

    loadRecentActivities() {
        // Імітація останніх подій
        const activities = [
            {
                id: 1,
                event: 'Планове техобслуговування ліфта #5',
                status: 'completed',
                statusText: 'Завершено',
                time: '10:30',
                date: '2024-05-15'
            },
            {
                id: 2,
                event: 'Ремонт ліфта #2 у будівлі Б',
                status: 'in-progress',
                statusText: 'В роботі',
                time: '09:15',
                date: '2024-05-15'
            },
            {
                id: 3,
                event: 'Огляд ліфта #7',
                status: 'pending',
                statusText: 'Очікує',
                time: '14:20',
                date: '2024-05-14'
            },
            {
                id: 4,
                event: 'Заявка на ремонт ліфта #3',
                status: 'completed',
                statusText: 'Завершено',
                time: '16:45',
                date: '2024-05-14'
            },
            {
                id: 5,
                event: 'Заміна деталей ліфта #1',
                status: 'cancelled',
                statusText: 'Скасовано',
                time: '11:30',
                date: '2024-05-13'
            }
        ];

        this.renderActivities(activities);
    }

    renderActivities(activities) {
        const activitiesContainer = $('#recentActivityList');
        activitiesContainer.empty();

        activities.forEach(activity => {
            const statusClass = this.getStatusClass(activity.status);
            const row = `
                <tr class="activity-item ${activity.status}">
                    <td>${activity.event}</td>
                    <td><span class="badge ${statusClass}">${activity.statusText}</span></td>
                    <td>${activity.time}<br><small>${activity.date}</small></td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="clientDashboard.viewActivityDetails(${activity.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
            activitiesContainer.append(row);
        });
    }

    getStatusClass(status) {
        switch(status) {
            case 'completed': return 'bg-success';
            case 'in-progress': return 'bg-info';
            case 'pending': return 'bg-warning';
            case 'cancelled': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }

    loadMaintenanceSchedule() {
        // Імітація графіка техобслуговування
        const schedule = [
            {
                id: 1,
                lift: 'Ліфт #1 - Будівля А',
                date: '2024-05-20',
                time: '10:00',
                type: 'Плановий огляд',
                priority: 'urgent'
            },
            {
                id: 2,
                lift: 'Ліфт #3 - Будівля Б',
                date: '2024-05-22',
                time: '14:30',
                type: 'Технічне обслуговування',
                priority: 'soon'
            },
            {
                id: 3,
                lift: 'Ліфт #5 - Будівля В',
                date: '2024-05-25',
                time: '09:00',
                type: 'Перевірка безпеки',
                priority: 'normal'
            }
        ];

        this.renderMaintenanceSchedule(schedule);
    }

    renderMaintenanceSchedule(schedule) {
        const scheduleContainer = $('#maintenanceSchedule');
        scheduleContainer.empty();
        
        $('#maintenanceCount').text(schedule.length);

        schedule.forEach(item => {
            const card = `
                <div class="schedule-card ${item.priority}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h5 class="mb-1">${item.lift}</h5>
                            <p class="mb-1">${item.type}</p>
                            <small><i class="fas fa-calendar-alt mr-1"></i>${item.date} о ${item.time}</small>
                        </div>
                        <div>
                            <button class="btn btn-light btn-sm" onclick="clientDashboard.viewMaintenanceDetails(${item.id})">
                                <i class="fas fa-info-circle"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            scheduleContainer.append(card);
        });
    }

    loadNotifications() {
        // Імітація сповіщень
        const notifications = [
            {
                id: 1,
                title: 'Заплановано техобслуговування',
                message: 'Ліфт #1 заплановано на обслуговування 20 травня о 10:00',
                time: '2 години тому',
                read: false
            },
            {
                id: 2,
                title: 'Заявку завершено',
                message: 'Вашу заявку #245 на ремонт ліфта #3 успішно завершено',
                time: '5 годин тому',
                read: true
            },
            {
                id: 3,
                title: 'Новий рахунок',
                message: 'Доступний новий рахунок за техобслуговування. Термін сплати - 31 травня',
                time: '1 день тому',
                read: false
            }
        ];

        this.renderNotifications(notifications);
    }

    renderNotifications(notifications) {
        const notificationsContainer = $('#notificationsList');
        notificationsContainer.empty();
        
        const unreadCount = notifications.filter(n => !n.read).length;
        $('#alertsCount').text(unreadCount);

        notifications.forEach(notification => {
            const alertClass = notification.read ? 'alert-secondary' : 'alert-warning';
            const notificationElement = `
                <div class="alert ${alertClass} alert-dismissible">
                    <button type="button" class="close" data-dismiss="alert" aria-hidden="true" onclick="clientDashboard.markAsRead(${notification.id})">×</button>
                    <h5>${notification.title}</h5>
                    <p>${notification.message}</p>
                    <small>${notification.time}</small>
                </div>
            `;
            notificationsContainer.append(notificationElement);
        });
    }

    initCharts() {
        // Ініціалізація діаграми стану ліфтів
        const ctx = document.getElementById('liftsChart').getContext('2d');
        this.liftsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Працюють нормально', 'На обслуговуванні', 'Не працюють'],
                datasets: [{
                    data: [9, 2, 1],
                    backgroundColor: [
                        'rgba(40, 167, 69, 0.8)',
                        'rgba(255, 193, 7, 0.8)',
                        'rgba(220, 53, 69, 0.8)'
                    ],
                    borderColor: [
                        'rgba(40, 167, 69, 1)',
                        'rgba(255, 193, 7, 1)',
                        'rgba(220, 53, 69, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    }

    refreshActivities() {
        this.showNotification('Оновлення активностей...', 'info');
        setTimeout(() => {
            this.loadRecentActivities();
            this.showNotification('Активності оновлено', 'success');
        }, 1000);
    }

    viewActivityDetails(activityId) {
        alert(`Перегляд деталей активності #${activityId}`);
        // Тут буде перехід на сторінку деталей
    }

    viewMaintenanceDetails(maintenanceId) {
        alert(`Перегляд деталей техобслуговування #${maintenanceId}`);
        // Тут буде перехід на сторінку деталей
    }

    markAsRead(notificationId) {
        this.showNotification('Сповіщення позначено як прочитане', 'success');
        // Тут буде оновлення статусу сповіщення
    }

    showNotification(message, type = 'info') {
        // Проста імітація сповіщення
        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'error' ? 'alert-danger' : 
                          type === 'warning' ? 'alert-warning' : 'alert-info';
        
        const notification = `
            <div class="alert ${alertClass} alert-dismissible" style="position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
                <button type="button" class="close" data-dismiss="alert" aria-hidden="true">×</button>
                ${message}
            </div>
        `;
        
        $('body').append(notification);
        
        // Автоматичне закриття сповіщення через 3 секунди
        setTimeout(() => {
            $('.alert-dismissible').alert('close');
        }, 3000);
    }
}

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', function() {
    window.clientDashboard = new ClientDashboard();
});