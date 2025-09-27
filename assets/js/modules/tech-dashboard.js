// tech-dashboard.js - ОКРЕМИЙ JS ФАЙЛ ДЛЯ ПАНЕЛІ ТЕХНІКА
class TechDashboard {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        console.log('🏗️ Ініціалізація панелі техніка...');
        this.loadUserInfo();
        this.loadStatistics();
        this.loadTodayTasks();
        this.loadUpcomingMaintenance();
        this.loadRecentActivity();
        this.setupEventListeners();
        this.startClocks();
        
        console.log('✅ Панель техніка успішно ініціалізовано');
    }

    loadUserInfo() {
        try {
            this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || { 
                firstName: 'Технік', 
                lastName: '',
                position: 'Технік з обслуговування'
            };
            
            $('#techName').text(this.currentUser.firstName || 'Технік');
            $('#userName').text(this.currentUser.firstName || 'Технік');
            
        } catch (error) {
            console.error('Помилка завантаження даних користувача:', error);
        }
    }

    loadStatistics() {
        const tasks = this.getTechnicianTasks();
        const stats = {
            totalTasks: tasks.length,
            pendingTasks: tasks.filter(task => task.status === 'pending').length,
            completedTasks: tasks.filter(task => task.status === 'completed').length,
            urgentTasks: tasks.filter(task => task.priority === 'high').length,
            todayTasks: tasks.filter(task => this.isToday(new Date(task.dueDate))).length
        };

        this.updateStatsUI(stats);
    }

    updateStatsUI(stats) {
        $('#totalTasks').text(stats.totalTasks);
        $('#pendingTasks').text(stats.pendingTasks);
        $('#completedTasks').text(stats.completedTasks);
        $('#urgentTasks').text(stats.urgentTasks);
        $('#todayTasks').text(stats.todayTasks);
        $('#todayTasksCount').text(stats.todayTasks);
        $('#tasksBadge').text(stats.pendingTasks);
    }

    getTechnicianTasks() {
        try {
            const requests = JSON.parse(localStorage.getItem('maintenanceRequests')) || [];
            return requests.filter(request => 
                request.assignedTo === this.currentUser?.id && 
                request.status !== 'cancelled'
            );
        } catch (error) {
            console.error('Помилка отримання завдань:', error);
            return [];
        }
    }

    loadTodayTasks() {
        const tasks = this.getTechnicianTasks().filter(task => 
            this.isToday(new Date(task.dueDate)) && 
            task.status !== 'completed'
        );
        
        this.renderTasks(tasks);
    }

    loadUpcomingMaintenance() {
        try {
            const lifts = JSON.parse(localStorage.getItem('lifts')) || [];
            const upcoming = lifts.filter(lift => {
                if (!lift.nextMaintenance) return false;
                const nextDate = new Date(lift.nextMaintenance);
                const today = new Date();
                const nextWeek = new Date(today.setDate(today.getDate() + 7));
                return nextDate <= nextWeek;
            }).slice(0, 5);

            this.renderUpcomingMaintenance(upcoming);
            $('#upcomingMaintenanceCount').text(upcoming.length);
            
        } catch (error) {
            console.error('Помилка завантаження техобслуговування:', error);
        }
    }

    loadRecentActivity() {
        // Завантаження останньої активності
        const activities = [
            { action: 'Завдання завершено', details: 'Ремонт ліфта #LFT-001', time: '2 хвилини тому', icon: 'fa-check-circle', color: 'success' },
            { action: 'Нове завдання', details: 'Профілактика ліфта #LFT-005', time: '15 хвилин тому', icon: 'fa-tasks', color: 'info' },
            { action: 'Оновлення статусу', details: 'Завдання #TASK-024 в процесі', time: '1 годину тому', icon: 'fa-sync', color: 'warning' }
        ];
        
        this.renderRecentActivity(activities);
    }

    renderTasks(tasks) {
        const container = $('#todayTasksList');
        container.empty();

        if (tasks.length === 0) {
            container.html(`
                <tr>
                    <td colspan="4" class="text-center py-4 text-muted">
                        <i class="fas fa-check-circle fa-2x mb-2"></i>
                        <p>Немає завдань на сьогодні</p>
                    </td>
                </tr>
            `);
            return;
        }

        tasks.forEach(task => {
            const row = `
                <tr class="task-item ${task.priority}-priority">
                    <td>
                        <strong>${task.title}</strong>
                        <br>
                        <small class="text-muted">${task.description || 'Без опису'}</small>
                    </td>
                    <td>${task.location || 'Не вказано'}</td>
                    <td>${this.formatTime(new Date(task.dueDate))}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="techDashboard.startTask('${task.id}')">
                            <i class="fas fa-play"></i> Почати
                        </button>
                        <button class="btn btn-sm btn-success ml-2" onclick="techDashboard.completeTask('${task.id}')">
                            <i class="fas fa-check"></i> Завершити
                        </button>
                        <a href="task-map.html?id=${task.id}" class="btn btn-sm btn-info ml-2" target="_blank">
                            <i class="fas fa-map-marker-alt"></i> Карта
                        </a>
                    </td>
                </tr>
            `;
            container.append(row);
        });
    }
    // Завершення завдання з автозаповненням звіту
    completeTask(taskId) {
        try {
            const requests = JSON.parse(localStorage.getItem('maintenanceRequests')) || [];
            const taskIndex = requests.findIndex(req => req.id === taskId);
            if (taskIndex >= 0) {
                // Автоматичне формування звіту
                const report = this.generateAutoReport(requests[taskIndex]);
                requests[taskIndex].status = 'completed';
                requests[taskIndex].completedAt = new Date().toISOString();
                requests[taskIndex].autoReport = report;
                // Геолокація завершення
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        position => {
                            const { latitude, longitude } = position.coords;
                            requests[taskIndex].geoEnd = { latitude, longitude, timestamp: new Date().toISOString() };
                            this._completeTaskFinalize(requests, taskIndex, taskId);
                        },
                        error => {
                            console.warn('Геолокація завершення недоступна:', error);
                            this._completeTaskFinalize(requests, taskIndex, taskId);
                        },
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                    );
                } else {
                    this._completeTaskFinalize(requests, taskIndex, taskId);
                }
            }
        } catch (error) {
            console.error('Помилка завершення завдання:', error);
            this.showNotification('Помилка при завершенні завдання', 'error');
        }
    }

    // Допоміжний метод для завершення завдання
    _completeTaskFinalize(requests, taskIndex, taskId) {
        localStorage.setItem('maintenanceRequests', JSON.stringify(requests));
        this.loadTodayTasks();
        this.showNotification('Завдання завершено, звіт сформовано', 'success');
        // Перенаправлення на сторінку звіту
        setTimeout(() => {
            window.location.href = `task-report.html?id=${taskId}`;
        }, 1000);
    }

    // Генерація автозвіту
    generateAutoReport(task) {
        return {
            taskId: task.id,
            title: task.title,
            description: task.description,
            technician: this.currentUser?.firstName || 'Технік',
            startedAt: task.startedAt,
            completedAt: new Date().toISOString(),
            geoStart: task.geoStart || null,
            geoEnd: task.geoEnd || null,
            status: 'completed',
            notes: 'Автоматичний звіт сформовано системою',
        };
    }

    renderUpcomingMaintenance(lifts) {
        const container = $('#upcomingMaintenanceList');
        container.empty();

        lifts.forEach(lift => {
            const daysLeft = this.getDaysLeft(lift.nextMaintenance);
            const urgencyClass = this.getUrgencyClass(daysLeft);
            
            const item = `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${lift.model || 'Невідома модель'}</h6>
                            <p class="mb-1 text-muted">
                                <i class="fas fa-map-marker-alt"></i> ${lift.location || 'Не вказано'}
                            </p>
                            <small class="text-muted">
                                <i class="fas fa-calendar"></i> ${this.formatDate(new Date(lift.nextMaintenance))}
                            </small>
                        </div>
                        <span class="days-left ${urgencyClass}">${daysLeft}</span>
                    </div>
                </div>
            `;
            container.append(item);
        });
    }

    renderRecentActivity(activities) {
        const container = $('#recentActivity');
        container.empty();

        activities.forEach(activity => {
            const item = `
                <div class="time-label">
                    <span class="bg-${activity.color}">${activity.time}</span>
                </div>
                <div>
                    <i class="fas ${activity.icon} bg-${activity.color}"></i>
                    <div class="timeline-item">
                        <span class="time"><i class="fas fa-clock"></i> ${activity.time}</span>
                        <h3 class="timeline-header">${activity.action}</h3>
                        <div class="timeline-body">${activity.details}</div>
                    </div>
                </div>
            `;
            container.append(item);
        });
    }

    getUrgencyClass(daysLeft) {
        if (daysLeft.includes('Сьогодні') || daysLeft.includes('Завтра') || daysLeft.includes('Протерміновано')) {
            return 'urgent';
        } else if (daysLeft.includes('Через')) {
            return 'warning';
        }
        return 'normal';
    }

    getPriorityLabel(priority) {
        const priorities = {
            'high': 'Високий',
            'medium': 'Середній',
            'low': 'Низький'
        };
        return priorities[priority] || priority;
    }

    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    getDaysLeft(nextMaintenance) {
        const today = new Date();
        const nextDate = new Date(nextMaintenance);
        const diffTime = nextDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Сьогодні';
        if (diffDays === 1) return 'Завтра';
        if (diffDays < 0) return 'Протерміновано';
        return `Через ${diffDays} дн`;
    }

    formatTime(date) {
        return date.toLocaleTimeString('uk-UA', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    formatDate(date) {
        return date.toLocaleDateString('uk-UA', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    startClocks() {
        // Оновлення часу
        setInterval(() => {
            const now = new Date();
            $('#currentTime').text(now.toLocaleTimeString('uk-UA'));
        }, 1000);

        // Оновлення часу при завантаженні
        $('#currentTime').text(new Date().toLocaleTimeString('uk-UA'));
    }

    setupEventListeners() {
        // Оновлення даних кожні 2 хвилини
        setInterval(() => {
            this.loadStatistics();
            this.loadTodayTasks();
        }, 120000);

        // Темна тема
        $('#darkModeToggle').on('click', () => {
            $('body').toggleClass('dark-mode');
            $('#darkModeToggle i').toggleClass('fa-moon fa-sun');
            this.showNotification(
                $('body').hasClass('dark-mode') ? 'Темна тема увімкнена' : 'Темна тема вимкнена', 
                'success'
            );
        });

        // Перевірка з'єднання
        setInterval(() => {
            this.checkConnection();
        }, 30000);

        this.checkConnection();
    }

    checkConnection() {
        const online = navigator.onLine;
        $('#connectionStatus').html(
            online ? 
            '<i class="fas fa-wifi text-success"></i> Online' : 
            '<i class="fas fa-wifi-slash text-danger"></i> Offline'
        );
    }

    startTask(taskId) {
        try {
            const requests = JSON.parse(localStorage.getItem('maintenanceRequests')) || [];
            const taskIndex = requests.findIndex(req => req.id === taskId);

            if (taskIndex >= 0) {
                // Отримання геолокації
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        position => {
                            const { latitude, longitude } = position.coords;
                            requests[taskIndex].geoStart = { latitude, longitude, timestamp: new Date().toISOString() };
                            this._startTaskFinalize(requests, taskIndex, taskId);
                        },
                        error => {
                            console.warn('Геолокація недоступна:', error);
                            this._startTaskFinalize(requests, taskIndex, taskId);
                        },
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                    );
                } else {
                    this._startTaskFinalize(requests, taskIndex, taskId);
                }
            }
        } catch (error) {
            console.error('Помилка старту завдання:', error);
            this.showNotification('Помилка при старті завдання', 'error');
        }

    }

    // Допоміжний метод для завершення старту завдання
    _startTaskFinalize(requests, taskIndex, taskId) {
        requests[taskIndex].status = 'in-progress';
        requests[taskIndex].startedAt = new Date().toISOString();
        localStorage.setItem('maintenanceRequests', JSON.stringify(requests));

        this.loadTodayTasks();
        this.showNotification('Роботу над завданням розпочато', 'success');

        // Перенаправлення на сторінку завдання
        setTimeout(() => {
            window.location.href = `task-detail.html?id=${taskId}`;
        }, 1000);
    }

    showNotification(message, type = 'info') {
        // Використання toast-сповіщень AdminLTE
        $.notify(message, {
            className: type,
            position: 'bottom right',
            autoHideDelay: 3000,
            arrowShow: false
        });
    }
}

// Автоматична ініціалізація при завантаженні документа
$(document).ready(function() {
    window.techDashboard = new TechDashboard();
});