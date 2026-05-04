class AdminDashboard {
    constructor() {
        this.init();
    }

    init() {
        this.loadStatistics();
        this.loadRecentScans();
        this.setupEventListeners();
        this.updateUserInfo();
        this.initCharts();
        this.loadPendingTasks();
    }

    loadStatistics() {
        try {
            const lifts = JSON.parse(localStorage.getItem('lifts')) || [];
            const users = JSON.parse(localStorage.getItem('users')) || [];
            const scans = JSON.parse(localStorage.getItem('qrScanHistory')) || [];
            
            const today = new Date().toDateString();
            const todayScans = scans.filter(scan => 
                new Date(scan.timestamp).toDateString() === today
            );

            const stats = {
                totalLifts: lifts.length,
                activeLifts: lifts.filter(lift => lift.status === 'active' || lift.status === 'operational').length,
                maintenanceDue: lifts.filter(lift => {
                    if (!lift.nextMaintenance) return false;
                    const nextDate = new Date(lift.nextMaintenance);
                    const today = new Date();
                    return nextDate <= new Date(today.setDate(today.getDate() + 7));
                }).length,
                todayScans: todayScans.length,
                totalUsers: users.length,
                activeTechnicians: users.filter(user => user.role === 'technician' && user.status === 'active').length
            };

            this.updateStatsUI(stats);
        } catch (error) {
            console.error('Erro завантаження статистики:', error);
        }
    }

    updateStatsUI(stats) {
        // Оновлюємо статистичні картки
        const updateCounter = (elementId, value) => {
            const element = document.getElementById(elementId);
            if (element) {
                $(element).animate({ counter: value }, {
                    duration: 2000,
                    easing: 'swing',
                    step: function(now) {
                        $(this).text(Math.ceil(now));
                    }
                });
            }
        };

        updateCounter('totalLifts', stats.totalLifts);
        updateCounter('activeLifts', stats.activeLifts);
        updateCounter('maintenanceDue', stats.maintenanceDue);
        updateCounter('todayScans', stats.todayScans);
        updateCounter('totalUsers', stats.totalUsers);
        updateCounter('activeTechnicians', stats.activeTechnicians);
    }

    loadRecentScans() {
        try {
            const scans = JSON.parse(localStorage.getItem('qrScanHistory')) || [];
            const recentScans = scans
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 10);
            
            this.renderScansTable(recentScans);
        } catch (error) {
            console.error('Erro завантаження сканувань:', error);
        }
    }

    renderScansTable(scans) {
        const tbody = document.querySelector('#scansTable tbody');
        if (!tbody) return;

        tbody.innerHTML = scans.map(scan => `
            <tr>
                <td>
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${scan.liftId}" 
                         class="qr-small" 
                         data-toggle="modal" 
                         data-target="#qrModal" 
                         data-qrdata="${scan.liftId}"
                         style="cursor: pointer;">
                </td>
                <td>${scan.liftId}</td>
                <td>${scan.liftName || 'Desconhecido'}</td>
                <td>${this.formatDateTime(scan.timestamp)}</td>
                <td>${this.getStatusBadge(scan.status)}</td>
                <td>
                    <button class="btn btn-sm btn-info view-scan" data-scan-id="${scan.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Додаємо обробники подій
        this.addScanEventListeners();
    }

    addScanEventListeners() {
        // Обробники для перегляду деталей сканування
        document.querySelectorAll('.view-scan').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scanId = e.currentTarget.dataset.scanId;
                this.viewScanDetails(scanId);
            });
        });
    }

    viewScanDetails(scanId) {
        const scans = JSON.parse(localStorage.getItem('qrScanHistory')) || [];
        const scan = scans.find(s => s.id === scanId);
        
        if (scan) {
            // Можна відкрити модальне вікно з деталями
            $('#scanDetailsModal').modal('show');
            this.renderScanDetails(scan);
        }
    }

    renderScanDetails(scan) {
        const modalBody = document.querySelector('#scanDetailsModal .modal-body');
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h5>Інформація про сканування</h5>
                        <p><strong>ID ліфта:</strong> ${scan.liftId}</p>
                        <p><strong>Nome:</strong> ${scan.liftName || 'Desconhecido'}</p>
                        <p><strong>Час сканування:</strong> ${this.formatDateTime(scan.timestamp)}</p>
                        <p><strong>Estado:</strong> ${this.getStatusText(scan.status)}</p>
                    </div>
                    <div class="col-md-6 text-center">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${scan.liftId}" 
                             class="img-fluid mb-3">
                        <br>
                        <button class="btn btn-primary btn-sm" onclick="downloadQR('${scan.liftId}')">
                            <i class="fas fa-download"></i> Descarregar QR
                        </button>
                    </div>
                </div>
            `;
        }
    }

    getStatusBadge(status) {
        const badges = {
            'completed': '<span class="badge badge-success">Завершено</span>',
            'pending': '<span class="badge badge-warning">Em progresso</span>',
            'issue': '<span class="badge badge-danger">Проблема</span>',
            'cancelled': '<span class="badge badge-secondary">Скасовано</span>'
        };
        return badges[status] || '<span class="badge badge-info">Desconhecido</span>';
    }

    getStatusText(status) {
        const statuses = {
            'completed': 'Завершено',
            'pending': 'Em progresso',
            'issue': 'Проблема',
            'cancelled': 'Скасовано'
        };
        return statuses[status] || 'Desconhecido';
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    initCharts() {
        // Ініціалізація графіків (приклад)
        this.initScanStatsChart();
        this.initLiftStatusChart();
    }

    initScanStatsChart() {
        // Приклад ініціалізації графіка сканувань
        const scans = JSON.parse(localStorage.getItem('qrScanHistory')) || [];
        const last7Days = this.getLast7Days();
        
        const dailyScans = last7Days.map(day => {
            return scans.filter(scan => {
                const scanDate = new Date(scan.timestamp).toDateString();
                return scanDate === day.toDateString();
            }).length;
        });

        // Використовуємо Chart.js або іншу бібліотеку для графіків
        console.log('Графік сканувань:', dailyScans);
    }

    initLiftStatusChart() {
        const lifts = JSON.parse(localStorage.getItem('lifts')) || [];
        
        const statusCount = {
            operational: lifts.filter(lift => lift.status === 'operational').length,
            maintenance: lifts.filter(lift => lift.status === 'maintenance').length,
            broken: lifts.filter(lift => lift.status === 'broken').length,
            inactive: lifts.filter(lift => lift.status === 'inactive').length
        };

        console.log('Estadoи ліфтів:', statusCount);
    }

    getLast7Days() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date);
        }
        return days;
    }

    loadPendingTasks() {
        try {
            const requests = JSON.parse(localStorage.getItem('maintenanceRequests')) || [];
            const pendingTasks = requests.filter(req => req.status === 'pending');
            
            this.renderPendingTasks(pendingTasks);
        } catch (error) {
            console.error('Erro завантаження завдань:', error);
        }
    }

    renderPendingTasks(tasks) {
        const container = document.getElementById('pendingTasksList');
        if (!container) return;

        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-check-circle fa-2x text-success mb-2"></i>
                    <p>Немає завдань, що очікують</p>
                </div>
            `;
            return;
        }

        container.innerHTML = tasks.slice(0, 5).map(task => `
            <div class="task-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${task.title}</h6>
                        <small class="text-muted">Elevador: ${task.liftId}</small>
                    </div>
                    <span class="badge badge-warning">Pendente</span>
                </div>
                <small class="text-muted">Створено: ${this.formatDateTime(task.createdAt)}</small>
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Atualização статистики кожні 5 хвилин
        setInterval(() => this.loadStatistics(), 300000);
        
        // Обробка кнопок швидкого доступу
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = e.currentTarget.getAttribute('data-action');
                this.handleQuickAction(action);
            });
        });

        // Обробка модального вікна QR
        $('#qrModal').on('show.bs.modal', (event) => {
            const button = $(event.relatedTarget);
            const qrData = button.data('qrdata');
            this.showQRModal(qrData);
        });
    }

    handleQuickAction(action) {
        const actions = {
            'create-qr': () => window.location.href = 'pages/qr/generator.html',
            'add-lift': () => window.location.href = 'pages/admin/lifts.html?action=create',
            'add-user': () => window.location.href = 'pages/admin/users.html?action=create',
            'generate-report': () => this.generateReport()
        };

        if (actions[action]) {
            actions[action]();
        }
    }

    generateReport() {
        // A gerar relatório
        $('#reportModal').modal('show');
    }

    showQRModal(qrData) {
        const modal = $('#qrModal');
        modal.find('.modal-title').text(`QR код: ${qrData}`);
        modal.find('#modalQrImage').attr('src', 
            `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}`);
        modal.find('#modalLiftId').text(qrData);
        modal.data('qrData', qrData);
    }

    updateUserInfo() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser) {
            // Оновлюємо інформацію в бічній панелі
            const userInfoElements = document.querySelectorAll('.user-info');
            userInfoElements.forEach(element => {
                element.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
            });

            // Оновлюємо роль
            const roleElements = document.querySelectorAll('.user-role');
            roleElements.forEach(element => {
                element.textContent = this.getRoleLabel(currentUser.role);
            });
        }
    }

    getRoleLabel(role) {
        const roles = {
            'admin': 'Administrador',
            'technician': 'Técnico',
            'client': 'Cliente',
            'dispatcher': 'Dispatcher'
        };
        return roles[role] || role;
    }
}

// Глобальні функції для модальних вікон
function downloadQR(liftId) {
    const link = document.createElement('a');
    link.download = `qr-code-${liftId}.png`;
    link.href = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${liftId}`;
    link.click();
}

// Ініціалізація адмін панелі
document.addEventListener('DOMContentLoaded', function() {
    // Перевіряємо, чи користувач адміністратор
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    const adminDashboard = new AdminDashboard();
    
    // Ініціалізація компонентів AdminLTE
    if (typeof $.AdminLTE !== 'undefined') {
        $.AdminLTE.layout.activate();
        $.AdminLTE.tree('.sidebar');
    }
});

// Додаткові утиліти
function formatDate(date) {
    return new Date(date).toLocaleDateString('pt-PT');
}

function showNotification(message, type = 'info') {
    const toast = $(`<div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="toast-header">
            <strong class="mr-auto">LiftMaster Pro</strong>
            <small>just now</small>
            <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    </div>`);

    toast.toast({ delay: 3000 });
    toast.toast('show');
}