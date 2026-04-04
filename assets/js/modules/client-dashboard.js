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
                phone: '+351912345678',
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
        // Реальні дані завантажуються через initializeClientDashboard() у dashboard.html
        // і передаються сюди через updateWithRealData()
        this.renderActivitiesLoading();
        this.renderMaintenanceLoading();
        this.renderNotificationsLoading();
        this.initCharts([]);
    }

    loadStatistics() {
        $('#totalLifts').text('...');
        $('#activeRequests').text('...');
        $('#completedThisMonth').text('...');
        $('#liftsInMaintenance').text('...');
    }

    // ─── Викликається з dashboard.html після завантаження реальних даних ───
    updateWithRealData(lifts, requests, notifications) {
        this.renderActivities(requests || []);
        this.renderMaintenanceSchedule(lifts || []);
        this.renderNotifications(notifications || []);
        this.updateChart(lifts || []);
    }

    // ─── Стани завантаження ───
    renderActivitiesLoading() {
        $('#recentActivityList').html(
            '<tr><td colspan="4" class="text-center text-muted py-3"><i class="fas fa-spinner fa-spin mr-2"></i>Завантаження...</td></tr>'
        );
    }

    renderMaintenanceLoading() {
        $('#maintenanceSchedule').html(
            '<div class="text-center text-muted py-3"><i class="fas fa-spinner fa-spin mr-2"></i>Завантаження...</div>'
        );
    }

    renderNotificationsLoading() {
        $('#notificationsList').html('');
        $('#alertsCount').text('0');
    }

    // ─── Останні події — з реальних заявок ───
    renderActivities(requests) {
        const container = $('#recentActivityList');
        container.empty();

        if (!requests || requests.length === 0) {
            container.html('<tr><td colspan="4" class="text-center text-muted py-3">Немає активностей</td></tr>');
            return;
        }

        const recent = [...requests]
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
            .slice(0, 5);

        recent.forEach(req => {
            const statusMap = {
                open:        { cls: 'bg-primary',   text: 'Відкрита' },
                in_progress: { cls: 'bg-info',      text: 'В роботі' },
                assigned:    { cls: 'bg-warning',   text: 'Призначена' },
                completed:   { cls: 'bg-success',   text: 'Завершена' },
                cancelled:   { cls: 'bg-danger',    text: 'Скасована' }
            };
            const s = statusMap[req.status] || { cls: 'bg-secondary', text: req.status || '—' };
            const dt = new Date(req.updatedAt || req.createdAt);
            const dateStr = isNaN(dt) ? '—' : dt.toLocaleDateString('pt-PT');
            const timeStr = isNaN(dt) ? '' : dt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
            const liftAddr = req.lift?.address?.street || req.lift?.municipalNumber || '—';

            container.append(`
                <tr>
                    <td>${req.title || 'Заявка на обслуговування'}<br><small class="text-muted">${liftAddr}</small></td>
                    <td><span class="badge ${s.cls}">${s.text}</span></td>
                    <td>${timeStr}<br><small>${dateStr}</small></td>
                    <td>
                        <a href="../client/requests.html" class="btn btn-sm btn-info">
                            <i class="fas fa-eye"></i>
                        </a>
                    </td>
                </tr>
            `);
        });
    }

    getStatusClass(status) {
        switch(status) {
            case 'completed': return 'bg-success';
            case 'in_progress': return 'bg-info';
            case 'open': return 'bg-primary';
            case 'cancelled': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }

    // ─── Графік обслуговування — з реальних nextInspectionDate ліфтів ───
    renderMaintenanceSchedule(lifts) {
        const container = $('#maintenanceSchedule');
        container.empty();

        if (!lifts || lifts.length === 0) {
            container.html('<div class="text-center text-muted py-3">Немає ліфтів</div>');
            $('#maintenanceCount').text('0');
            return;
        }

        const now = new Date();
        const upcoming = lifts
            .filter(l => l.nextInspectionDate)
            .map(l => {
                const d = new Date(l.nextInspectionDate);
                const daysLeft = Math.ceil((d - now) / 86400000);
                return { lift: l, date: d, daysLeft };
            })
            .sort((a, b) => a.date - b.date)
            .slice(0, 5);

        $('#maintenanceCount').text(upcoming.length);

        if (upcoming.length === 0) {
            container.html('<div class="text-center text-muted py-3">Немає запланованих оглядів</div>');
            return;
        }

        upcoming.forEach(({ lift, date, daysLeft }) => {
            let priority = 'normal';
            let priorityLabel = '';
            if (daysLeft < 0) {
                priority = 'urgent';
                priorityLabel = `<span class="badge badge-danger ml-1">Прострочено (${Math.abs(daysLeft)} дн.)</span>`;
            } else if (daysLeft <= 30) {
                priority = 'urgent';
                priorityLabel = `<span class="badge badge-danger ml-1">Через ${daysLeft} дн.</span>`;
            } else if (daysLeft <= 60) {
                priority = 'soon';
                priorityLabel = `<span class="badge badge-warning ml-1">Через ${daysLeft} дн.</span>`;
            } else {
                priorityLabel = `<span class="badge badge-success ml-1">Через ${daysLeft} дн.</span>`;
            }

            const addr = lift.address ? `${lift.address.street || ''}, ${lift.address.city || ''}`.trim().replace(/^,|,$/, '').trim() : (lift.municipalNumber || '—');
            const dateStr = date.toLocaleDateString('pt-PT');

            container.append(`
                <div class="schedule-card ${priority}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h5 class="mb-1">${addr} ${priorityLabel}</h5>
                            <p class="mb-1 text-muted">№ ${lift.municipalNumber || '—'}</p>
                            <small><i class="fas fa-calendar-alt mr-1"></i>Planeado: ${dateStr}</small>
                        </div>
                        <div>
                            <a href="../client/my-lifts.html" class="btn btn-light btn-sm">
                                <i class="fas fa-info-circle"></i>
                            </a>
                        </div>
                    </div>
                </div>
            `);
        });
    }

    // ─── Сповіщення — з реального API ───
    renderNotifications(notifications) {
        const container = $('#notificationsList');
        container.empty();

        const unread = (notifications || []).filter(n => !n.read).length;
        $('#alertsCount').text(unread);

        if (!notifications || notifications.length === 0) {
            container.html('<div class="text-center text-muted py-3">Немає сповіщень</div>');
            return;
        }

        notifications.slice(0, 5).forEach(n => {
            const alertClass = n.read ? 'alert-secondary' : 'alert-warning';
            const dt = n.createdAt ? new Date(n.createdAt).toLocaleString('pt-PT') : '';
            container.append(`
                <div class="alert ${alertClass} alert-dismissible">
                    <button type="button" class="close" data-dismiss="alert">×</button>
                    <h5>${n.title || 'Сповіщення'}</h5>
                    <p>${n.message || ''}</p>
                    ${dt ? `<small class="text-muted">${dt}</small>` : ''}
                </div>
            `);
        });
    }

    // ─── Діаграма — з реальних статусів ліфтів ───
    initCharts(lifts) {
        const existingChart = Chart.getChart('liftsChart');
        if (existingChart) existingChart.destroy();
        if (this.liftsChart) this.liftsChart = null;

        const canvasEl = document.getElementById('liftsChart');
        if (!canvasEl) return;

        const operational = (lifts || []).filter(l => l.status === 'operational').length;
        const maintenance  = (lifts || []).filter(l => l.status === 'maintenance').length;
        const repair       = (lifts || []).filter(l => l.status === 'repair').length;
        const outOfService = (lifts || []).filter(l => l.status === 'out_of_service').length;

        const ctx = canvasEl.getContext('2d');
        this.liftsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Працюють', 'Обслуговування', 'Ремонт', 'Не працюють'],
                datasets: [{
                    data: [operational, maintenance, repair, outOfService],
                    backgroundColor: [
                        'rgba(40, 167, 69, 0.8)',
                        'rgba(255, 193, 7, 0.8)',
                        'rgba(255, 133, 27, 0.8)',
                        'rgba(220, 53, 69, 0.8)'
                    ],
                    borderColor: [
                        'rgba(40, 167, 69, 1)',
                        'rgba(255, 193, 7, 1)',
                        'rgba(255, 133, 27, 1)',
                        'rgba(220, 53, 69, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 12 } } }
                }
            }
        });
    }

    // Оновити діаграму з реальними даними (викликається після API)
    updateChart(lifts) {
        const existingChart = Chart.getChart('liftsChart');
        if (existingChart) existingChart.destroy();
        this.initCharts(lifts);
    }

    setupEventListeners() {
        // Кнопка оновлення активностей
        $(document).on('click', '#refreshActivities', () => this.refreshActivities());

        // Закриття сповіщень
        $(document).on('click', '.notification-item .close', (e) => {
            const id = $(e.currentTarget).closest('.notification-item').data('id');
            if (id) this.markAsRead(id);
        });

        // Позначити всі як прочитані
        $(document).on('click', '#markAllRead', () => {
            $('#notificationsList .alert').alert('close');
            $('#alertsCount').text('0');
            this.showNotification('Всі сповіщення позначено як прочитані', 'success');
        });
    }

    refreshActivities() {
        this.showNotification('Оновлення...', 'info');
        // Реальне оновлення через initializeClientDashboard у dashboard.html
    }

    markAsRead(notificationId) {
        this.showNotification('Сповіщення позначено як прочитане', 'success');
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