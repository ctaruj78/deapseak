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
        // Carrega dados do utilizador a partir do localStorage
        const userData = localStorage.getItem('userData');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.updateUserUI();
        } else {
            this.fetchUserData();
        }
    }

    fetchUserData() {
        // O perfil é carregado a partir de dashboard.html via API autenticada.
        this.currentUser = null;
    }

    updateUserUI() {
        if (this.currentUser) {
            const fullName = `${this.currentUser.firstName || ''} ${this.currentUser.lastName || ''}`.trim()
                || this.currentUser.name
                || this.currentUser.displayName
                || this.currentUser.username
                || this.currentUser.email
                || 'Cliente';
            $('#clientName').text(fullName);
            $('#userName').text(fullName);
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
        this.renderNotifications(notifications || [], lifts || []);
        this.updateChart(lifts || []);
    }

    // ─── Стани завантаження ───
    renderActivitiesLoading() {
        $('#recentActivityList').html(
            '<tr><td colspan="4" class="text-center text-muted py-3"><i class="fas fa-spinner fa-spin mr-2"></i>A carregar...</td></tr>'
        );
    }

    renderMaintenanceLoading() {
        $('#maintenanceSchedule').html(
            '<div class="text-center text-muted py-3"><i class="fas fa-spinner fa-spin mr-2"></i>A carregar...</div>'
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
            container.html('<tr><td colspan="4" class="text-center text-muted py-3">Sem atividade recente</td></tr>');
            return;
        }

        const recent = [...requests]
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
            .slice(0, 5);

        recent.forEach(req => {
            const statusMap = {
                open:        { cls: 'bg-primary',   text: 'Aberta' },
                in_progress: { cls: 'bg-info',      text: 'Em progresso' },
                assigned:    { cls: 'bg-warning',   text: 'Atribuída' },
                completed:   { cls: 'bg-success',   text: 'Concluída' },
                cancelled:   { cls: 'bg-danger',    text: 'Cancelada' }
            };
            const s = statusMap[req.status] || { cls: 'bg-secondary', text: req.status || '—' };
            const dt = new Date(req.updatedAt || req.createdAt);
            const dateStr = isNaN(dt) ? '—' : dt.toLocaleDateString('pt-PT');
            const timeStr = isNaN(dt) ? '' : dt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
            const liftAddr = req.lift?.address?.street || req.lift?.municipalNumber || '—';

            container.append(`
                <tr>
                    <td>${req.title || 'Pedido de assistência'}<br><small class="text-muted">${liftAddr}</small></td>
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

    getLatestInspectionRecord(lift) {
        if (window.InspectionSourceUtils) {
            return window.InspectionSourceUtils.getLatestInspectionRecord(lift);
        }
        const records = Array.isArray(lift?.inspectionHistory) ? lift.inspectionHistory : [];
        if (!records.length) return null;

        return records
            .slice()
            .sort((a, b) => new Date(b.date || b.inspectionDate || 0) - new Date(a.date || a.inspectionDate || 0))[0] || null;
    }

    getEffectiveNextInspectionDate(lift) {
        if (window.InspectionSourceUtils) {
            return window.InspectionSourceUtils.getEffectiveNextInspectionDate(lift);
        }
        const direct = lift?.nextInspectionDate || lift?.licenseExpiry || lift?.certExpiry || null;
        if (direct) {
            const d = new Date(direct);
            if (!Number.isNaN(d.getTime())) return d;
        }

        const latest = this.getLatestInspectionRecord(lift);
        if (!latest) return null;

        const fromReport = latest.validUntil || latest.nextInspectionDate || null;
        if (fromReport) {
            const d = new Date(fromReport);
            if (!Number.isNaN(d.getTime())) return d;
        }

        const baseRaw = latest.date || latest.inspectionDate || lift.lastInspectionDate || lift.licenseDate || null;
        const base = baseRaw ? new Date(baseRaw) : null;
        if (!base || Number.isNaN(base.getTime())) return null;

        const certType = String(latest.certType || '').toLowerCase();
        const status = String(latest.status || lift.inspectionStatus || '').toLowerCase();
        const c1 = Number(latest.c1Count || 0);
        const c2 = Number(latest.c2Count || 0);
        const fallback = new Date(base);

        if (certType === 'cert_2_years' || status === 'passed') {
            fallback.setFullYear(fallback.getFullYear() + 2);
        } else if (certType === 'reinspection' || certType === 'immobilization' || c1 > 0 || c2 > 0 || status === 'failed' || status === 'conditional') {
            fallback.setDate(fallback.getDate() + 30);
        } else {
            fallback.setDate(fallback.getDate() + 180);
        }

        return fallback;
    }

    getInspectionSourceLabel(lift) {
        if (window.InspectionSourceUtils) {
            return window.InspectionSourceUtils.formatSourceLabel(lift, 'short');
        }
        return 'dados estimados';
    }

    buildInspectionAlertsFromLifts(lifts) {
        const now = new Date();
        const alerts = [];

        (lifts || []).forEach((lift) => {
            const address = lift?.address?.street || lift?.municipalNumber || 'Elevador';
            const ref = lift?.municipalNumber ? ` (${lift.municipalNumber})` : '';

            const nextDate = this.getEffectiveNextInspectionDate(lift);
            if (!nextDate || Number.isNaN(new Date(nextDate).getTime())) {
                // Lift has never had an inspection recorded
                alerts.push({
                    synthetic: true,
                    read: false,
                    createdAt: now.toISOString(),
                    title: 'Sem inspeção registada',
                    message: `${address}${ref}: sem inspeção periódica registada — requerer inspeção inicial.`,
                    severity: 'danger',
                    sortDays: -9999
                });
                return;
            }

            const d = new Date(nextDate);
            const daysLeft = Math.ceil((d - now) / 86400000);
            if (daysLeft > 60) return;

            const datePt = d.toLocaleDateString('pt-PT');
            const overdue = daysLeft < 0;
            const title = overdue ? 'Inspeção periódica em atraso' : 'Requerimento de inspeção próximo';
            const sourceLabel = this.getInspectionSourceLabel(lift);
            const message = overdue
                ? `${address}${ref}: inspeção periódica em atraso há ${Math.abs(daysLeft)} dia(s) (prazo: ${datePt}, fonte: ${sourceLabel}).`
                : `${address}${ref}: requerer próxima inspeção em ${daysLeft} dia(s) (prazo: ${datePt}, fonte: ${sourceLabel}).`;

            alerts.push({
                synthetic: true,
                read: false,
                createdAt: now.toISOString(),
                title,
                message,
                severity: overdue ? 'danger' : 'warning',
                sortDays: daysLeft
            });
        });

        return alerts.sort((a, b) => a.sortDays - b.sortDays).slice(0, 5);
    }

    // ─── Графік обслуговування — з реальних nextInspectionDate ліфтів ───
    renderMaintenanceSchedule(lifts) {
        const container = $('#maintenanceSchedule');
        container.empty();

        if (!lifts || lifts.length === 0) {
            container.html('<div class="text-center text-muted py-3">Sem elevadores</div>');
            $('#maintenanceCount').text('0');
            return;
        }

        const now = new Date();
        const upcoming = lifts
            .map(l => {
                const d = this.getEffectiveNextInspectionDate(l);
                if (!d || Number.isNaN(d.getTime())) return null;
                const daysLeft = Math.ceil((d - now) / 86400000);
                return { lift: l, date: d, daysLeft };
            })
            .filter(Boolean)
            .sort((a, b) => a.date - b.date)
            .slice(0, 5);

        $('#maintenanceCount').text(upcoming.length);

        if (upcoming.length === 0) {
            container.html('<div class="text-center text-muted py-3">Sem inspeções periódicas planeadas</div>');
            return;
        }

        upcoming.forEach(({ lift, date, daysLeft }) => {
            let priority = 'normal';
            let priorityLabel = '';
            if (daysLeft < 0) {
                priority = 'urgent';
                priorityLabel = `<span class="badge badge-danger ml-1">Atrasado (${Math.abs(daysLeft)} dias)</span>`;
            } else if (daysLeft <= 30) {
                priority = 'urgent';
                priorityLabel = `<span class="badge badge-danger ml-1">Em ${daysLeft} dias</span>`;
            } else if (daysLeft <= 60) {
                priority = 'soon';
                priorityLabel = `<span class="badge badge-warning ml-1">Em ${daysLeft} dias</span>`;
            } else {
                priorityLabel = `<span class="badge badge-success ml-1">Em ${daysLeft} dias</span>`;
            }

            const addr = lift.address ? `${lift.address.street || ''}, ${lift.address.city || ''}`.trim().replace(/^,|,$/, '').trim() : (lift.municipalNumber || '—');
            const dateStr = date.toLocaleDateString('pt-PT');

            container.append(`
                <div class="schedule-card ${priority}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h5 class="mb-1">${addr} ${priorityLabel}</h5>
                            <p class="mb-1 text-muted">№ ${lift.municipalNumber || '—'}</p>
                            <small><i class="fas fa-calendar-alt mr-1"></i>Data da inspeção: ${dateStr}</small>
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

    // ─── Notificações — з реального API ───
    renderNotifications(notifications, lifts = []) {
        const container = $('#notificationsList');
        container.empty();

        const syntheticAlerts = this.buildInspectionAlertsFromLifts(lifts);
        const combined = [...syntheticAlerts, ...(notifications || [])].slice(0, 8);

        const unread = combined.filter(n => !n.read).length;
        $('#alertsCount').text(unread);

        if (!combined.length) {
            container.html('<div class="text-center text-muted py-3">Sem notificações</div>');
            return;
        }

        combined.slice(0, 5).forEach(n => {
            const alertClass = n.synthetic
                ? (n.severity === 'danger' ? 'alert-danger' : 'alert-warning')
                : (n.read ? 'alert-secondary' : 'alert-warning');
            const dt = n.createdAt ? new Date(n.createdAt).toLocaleString('pt-PT') : '';
            container.append(`
                <div class="alert ${alertClass} alert-dismissible">
                    <button type="button" class="close" data-dismiss="alert">×</button>
                    <h5>${n.title || 'Notificações'}</h5>
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
                labels: ['Operacionais', 'Em manutenção', 'Em reparação', 'Parados'],
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

    // Atualizar діаграму з реальними даними (викликається після API)
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
            this.showNotification('Todas as notificações foram marcadas como lidas', 'success');
        });
    }

    refreshActivities() {
        this.showNotification('Atualização...', 'info');
        // Реальне оновлення через initializeClientDashboard у dashboard.html
    }

    markAsRead(notificationId) {
        this.showNotification('Notificações позначено як прочитане', 'success');
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