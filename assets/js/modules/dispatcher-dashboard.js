class DispatcherDashboard {
    // Звіт по роботі техніків
    showTechReport() {
        // Формуємо дані по техніках
        let html = `<table class="table table-bordered table-striped"><thead><tr><th>Технік</th><th>Статус</th><th>Завдань</th><th>Рейтинг</th><th>Останнє призначення</th></tr></thead><tbody>`;
        this.technicians.forEach(tech => {
            // Знаходимо останню заявку для техніка
            const lastReq = this.requests.filter(r => r.assignedTo === `${tech.firstName} ${tech.lastName}`).sort((a,b) => new Date(b.date)-new Date(a.date))[0];
            html += `<tr><td>${tech.firstName} ${tech.lastName}</td><td>${tech.status}</td><td>${tech.currentAssignments}</td><td>${tech.rating}</td><td>${lastReq ? lastReq.date : '-'}</td></tr>`;
        });
        html += '</tbody></table>';
        document.getElementById('techReportContent').innerHTML = html;
        $('#techReportModal').modal('show');
    }

    exportTechReport() {
        // Експорт у CSV
        let csv = 'Технік,Статус,Завдань,Рейтинг,Останнє призначення\n';
        this.technicians.forEach(tech => {
            const lastReq = this.requests.filter(r => r.assignedTo === `${tech.firstName} ${tech.lastName}`).sort((a,b) => new Date(b.date)-new Date(a.date))[0];
            csv += `${tech.firstName} ${tech.lastName},${tech.status},${tech.currentAssignments},${tech.rating},${lastReq ? lastReq.date : '-'}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tech-report.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    constructor() {
        console.log('DispatcherDashboard constructor called');
        console.log('jQuery available:', typeof $ !== 'undefined');
        console.log('jQuery version:', $.fn ? $.fn.jquery : 'unknown');
        this.requests = [];
        this.technicians = [];
        this.activities = [];
        this.notifications = [];
        this.selectedRequests = new Set(); // Масове управління заявками
        this.init();
    }

    init() {
        console.log('DispatcherDashboard init called');
        try {
            this.loadRequests();
            this.loadTechnicians();
            this.loadActivities();
            this.loadNotifications();
            this.setupRealTimeUpdates();
            this.updateStats();
            this.setupEventListeners();
            this.setupFilters();
            console.log('DispatcherDashboard init completed');
        } catch (error) {
            console.error('Error in DispatcherDashboard init:', error);
        }
    }

    // Налаштування обробників подій
    setupEventListeners() {
            console.log('Setting up event listeners, jQuery available:', typeof $ !== 'undefined');
            if (typeof $ === 'undefined') {
                console.error('jQuery not available for event listeners');
                return;
            }

            try {
            // Фільтрація та сортування заявок
            $('#priorityFilter, #statusFilter, #technicianFilter, #dateFilter, #sortSelect').on('change', () => {
                this.renderRequests();
            });

            // Вибір всіх чекбоксів
            $('#selectAllRequests').on('change', (e) => {
                const checked = e.target.checked;
                $('.request-select').prop('checked', checked);
                this.selectedRequests.clear();
                if (checked) {
                    this.requests.forEach(r => this.selectedRequests.add(r.id));
                }
                this.renderBulkActions();
            });

            // Обробники для кнопок дій (делегування подій)
            $(document).on('click', '.btn-action', (e) => {
                e.preventDefault();
                const action = $(e.target).closest('.btn-action').data('action');
                const id = parseInt($(e.target).closest('.btn-action').data('id'));
                console.log('Button action clicked:', action, 'id:', id);
                
                if (window.dispatcherDashboard) {
                    if (action === 'view') {
                        window.dispatcherDashboard.viewRequest(id);
                    } else if (action === 'assign') {
                        window.dispatcherDashboard.assignRequest(id);
                    } else if (action === 'edit') {
                        window.dispatcherDashboard.editRequest(id);
                    }
                } else {
                    console.error('dispatcherDashboard not available');
                }
            });

        // Оновлення даних
        $('#refreshBtn').on('click', () => {
            this.loadRequests();
            this.loadTechnicians();
            this.loadActivities();
            this.showNotification('Дані оновлено', 'success');
        });

        // Швидкі дії
        $('#quickAssignment').on('click', () => {
            this.createNewAssignment();
        });

        $('#quickMonitoring').on('click', () => {
            this.openMonitoring();
        });

        $('#quickBroadcast').on('click', () => {
            this.sendBroadcast();
        });

        $('#quickReport').on('click', () => {
            this.generateReport();
        });

        $('#quickStats').on('click', () => {
            this.quickStats();
        });

        $('#quickEmergency').on('click', () => {
            this.emergencyProtocol();
        });
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    // Завантаження заявок
    async loadRequests() {
        // Використовуємо демо-дані для дашборду
        this.loadDemoRequests();
    }

    // Демо-дані для тестування
    loadDemoRequests() {
        this.requests = [
            {
                id: 1001,
                title: "Не працює мережеве з'єднання",
                client: "ТОВ 'Альфа'",
                priority: "high",
                status: "new",
                date: new Date().toLocaleDateString('uk-UA') + " 10:30",
                assignedTo: null,
                description: "Відсутній доступ до мережі в головному офісі",
                location: "Київ, вул. Хрещатик, 25"
            },
            {
                id: 1002,
                title: "Заміна жорсткого диска",
                client: "ПП 'Бета'",
                priority: "medium",
                status: "assigned",
                date: new Date().toLocaleDateString('uk-UA') + " 09:15",
                assignedTo: "Олександр Петренко",
                description: "Необхідна заміна жорсткого диска на сервері",
                location: "Львів, вул. Свободи, 15"
            },
            {
                id: 1003,
                title: "Встановлення оновлення ПЗ",
                client: "ТОВ 'Гамма'",
                priority: "low",
                status: "in-progress",
                date: new Date(Date.now() - 86400000).toLocaleDateString('uk-UA') + " 16:45",
                assignedTo: "Марія Іваненко",
                description: "Оновлення системи керування базою даних",
                location: "Одеса, вул. Дерибасівська, 10"
            },
            {
                id: 1004,
                title: "Налаштування VPN",
                client: "ТОВ 'Омега'",
                priority: "high",
                status: "new",
                date: new Date().toLocaleDateString('uk-UA') + " 11:20",
                assignedTo: null,
                description: "Налаштування віддаленого доступу для співробітників",
                location: "Харків, вул. Сумська, 30"
            },
            {
                id: 1005,
                title: "Діагностика сервера",
                client: "ПП 'Сигма'",
                priority: "medium",
                status: "completed",
                date: new Date(Date.now() - 172800000).toLocaleDateString('uk-UA') + " 14:10",
                assignedTo: "Василь Шевченко",
                description: "Повна діагностика серверного обладнання",
                location: "Дніпро, вул. Набережна, 5"
            },
            {
                id: 1006,
                title: "Відновлення даних",
                client: "ТОВ 'Дельта'",
                priority: "high",
                status: "new",
                date: new Date().toLocaleDateString('uk-UA') + " 13:45",
                assignedTo: null,
                description: "Екстрене відновлення даних з резервної копії",
                location: "Запоріжжя, пр. Соборний, 18"
            }
        ];
        
        this.renderRequests();
        this.updateStats();
    }

    // Відображення заявок у таблиці
    renderRequests() {
        const tbody = document.getElementById('requestsTableBody');
        if (!tbody) {
            console.error('requestsTableBody element not found');
            return;
        }
        tbody.innerHTML = '';
        // Отримання фільтрів
        const priorityFilter = document.getElementById('priorityFilter');
        const statusFilter = document.getElementById('statusFilter');
        const technicianFilter = document.getElementById('technicianFilter');
        const dateFilter = document.getElementById('dateFilter');
        const sortSelect = document.getElementById('sortSelect');

        if (!priorityFilter || !statusFilter || !technicianFilter || !dateFilter || !sortSelect) {
            console.error('Filter elements not found');
            return;
        }

        const priorityFilterValue = priorityFilter.value;
        const statusFilterValue = statusFilter.value;
        const technicianFilterValue = technicianFilter.value;
        const dateFilterValue = dateFilter.value;
        const sortSelectValue = sortSelect.value;

        let filteredRequests = this.requests.filter(request => {
            let priorityMatch = priorityFilterValue === 'all' || request.priority === priorityFilterValue;
            let statusMatch = statusFilterValue === 'all' || request.status === statusFilterValue;
            let techMatch = technicianFilterValue === 'all' || (request.assignedTo && request.assignedTo === technicianFilterValue);
            let dateMatch = true;
            if (dateFilterValue) {
                // Порівнюємо тільки дату (без часу)
                let reqDate = request.date.split(' ')[0];
                dateMatch = reqDate === dateFilterValue;
            }
            return priorityMatch && statusMatch && techMatch && dateMatch;
        });

        // Сортування
        if (sortSelectValue === 'date-desc') {
            filteredRequests.sort((a, b) => new Date(b.date) - new Date(a.date));
        } else if (sortSelectValue === 'date-asc') {
            filteredRequests.sort((a, b) => new Date(a.date) - new Date(b.date));
        } else if (sortSelectValue === 'priority-desc') {
            const prio = { 'high': 3, 'medium': 2, 'low': 1 };
            filteredRequests.sort((a, b) => prio[b.priority] - prio[a.priority]);
        } else if (sortSelectValue === 'priority-asc') {
            const prio = { 'high': 3, 'medium': 2, 'low': 1 };
            filteredRequests.sort((a, b) => prio[a.priority] - prio[b.priority]);
        } else if (sortSelectValue === 'status') {
            const statusOrder = { 'new': 1, 'assigned': 2, 'in-progress': 3, 'completed': 4 };
            filteredRequests.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
        }

        if (filteredRequests.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <i class="fas fa-inbox fa-2x text-muted mb-2"></i>
                        <p class="text-muted">Заявки не знайдені</p>
                        <button class="btn btn-sm btn-primary" onclick="dispatcherDashboard.loadRequests()">
                            <i class="fas fa-sync"></i> Спробувати знову
                        </button>
                    </td>
                </tr>
            `;
            this.renderBulkActions();
            return;
        }
        filteredRequests.forEach(request => {
            var tr = document.createElement('tr');
            // Визначення класу пріоритету
            var priorityClass = '';
            var priorityText = '';
            switch (request.priority) {
                case 'high': priorityClass = 'priority-high'; priorityText = 'Високий'; break;
                case 'medium': priorityClass = 'priority-medium'; priorityText = 'Середній'; break;
                case 'low': priorityClass = 'priority-low'; priorityText = 'Низький'; break;
            }
            // Визначення статусу
            var statusText = '';
            var statusClass = '';
            switch (request.status) {
                case 'new': statusText = 'Нова'; statusClass = 'badge badge-danger'; break;
                case 'assigned': statusText = 'Призначена'; statusClass = 'badge badge-warning'; break;
                case 'in-progress': statusText = 'В роботі'; statusClass = 'badge badge-info'; break;
                case 'completed': statusText = 'Завершена'; statusClass = 'badge badge-success'; break;
            }
            tr.innerHTML = `
                <td><input type="checkbox" class="request-select" data-id="${request.id}"></td>
                <td><span class="font-weight-bold">#${request.id}</span></td>
                <td>
                    <div class="font-weight-bold">${request.title}</div>
                    <small class="text-muted">${request.client}</small>
                </td>
                <td><span class="priority-badge ${priorityClass}">${priorityText}</span></td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>${request.date}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-info btn-xs" data-action="view" data-id="${request.id}" onclick="window.dispatcherDashboard.viewRequest(${request.id})" title="Перегляд">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-warning btn-xs" data-action="assign" data-id="${request.id}" onclick="window.dispatcherDashboard.assignRequest(${request.id})" title="Призначити">
                            <i class="fas fa-user-plus"></i>
                        </button>
                        <button class="btn btn-success btn-xs" data-action="edit" data-id="${request.id}" onclick="window.dispatcherDashboard.editRequest(${request.id})" title="Редагувати">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-xs" data-action="delete" data-id="${request.id}" onclick="window.dispatcherDashboard.deleteRequest(${request.id})" title="Видалити">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            if (request.priority === 'high') {
                tr.classList.add('table-danger');
            } else if (request.priority === 'medium') {
                tr.classList.add('table-warning');
            }
            tbody.appendChild(tr);
        });
        this.renderBulkActions();
        tbody.querySelectorAll('.request-select').forEach(function(cb) {
            cb.onchange = function(e) {
                var id = parseInt(cb.dataset.id);
                if (cb.checked) {
                    window.dispatcherDashboard.selectedRequests.add(id);
                } else {
                    window.dispatcherDashboard.selectedRequests.delete(id);
                }
                window.dispatcherDashboard.renderBulkActions();
            };
        });
    }

    renderBulkActions() {
        const bulkPanel = document.getElementById('bulkActionsPanel');
        if (!bulkPanel) return;
        
        if (this.selectedRequests.size === 0) {
            bulkPanel.style.display = 'none';
            return;
        }
        
        bulkPanel.style.display = 'block';
        bulkPanel.innerHTML = `
            <div class="alert alert-info py-2 px-3 mb-2">
                <strong>Вибрано заявок: ${this.selectedRequests.size}</strong>
                <div class="btn-group float-right" role="group">
                    <button class="btn btn-danger btn-sm" onclick="window.dispatcherDashboard.bulkDelete()" title="Видалити вибрані">
                        🗑️ Видалити
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="window.dispatcherDashboard.bulkAssign()" title="Призначити техніка">
                        👥 Призначити
                    </button>
                    <button class="btn btn-success btn-sm" onclick="window.dispatcherDashboard.bulkComplete()" title="Завершити вибрані">
                        ✅ Завершити
                    </button>
                </div>
            </div>
        `;
    }

    // Завантаження техніків
    async loadTechnicians() {
        // Використовуємо демо-дані для дашборду
        this.loadDemoTechnicians();
    }

    // Демо-дані техніків
    loadDemoTechnicians() {
        this.technicians = [
            {
                id: 1,
                firstName: "Олександр",
                lastName: "Петренко",
                status: "online",
                specialty: "network",
                workload: "medium",
                currentAssignments: 3,
                avatar: "../../assets/img/avatars/tech1.png",
                skills: ["Cisco", "Juniper", "VPN", "Wi-Fi"],
                rating: 4.8
            },
            {
                id: 2,
                firstName: "Марія",
                lastName: "Іваненко",
                status: "busy",
                specialty: "software",
                workload: "high",
                currentAssignments: 5,
                avatar: "../../assets/img/avatars/tech2.png",
                skills: ["Windows Server", "Linux", "Virtualization", "Backup"],
                rating: 4.9
            },
            {
                id: 3,
                firstName: "Василь",
                lastName: "Шевченко",
                status: "online",
                specialty: "hardware",
                workload: "low",
                currentAssignments: 1,
                avatar: "../../assets/img/avatars/tech3.png",
                skills: ["Принтери", "Сканери", "Робочі станції", "Ноутбуки"],
                rating: 4.5
            },
            {
                id: 4,
                firstName: "Наталія",
                lastName: "Бойко",
                status: "offline",
                specialty: "security",
                workload: "medium",
                currentAssignments: 2,
                avatar: "../../assets/img/avatars/tech4.png",
                skills: ["Firewall", "Antivirus", "Encryption", "Audit"],
                rating: 4.7
            },
            {
                id: 5,
                firstName: "Ігор",
                lastName: "Мельник",
                status: "online",
                specialty: "general",
                workload: "low",
                currentAssignments: 0,
                avatar: "../../assets/img/avatars/tech-default.png",
                skills: ["Підтримка користувачів", "Офісне ПЗ", "Дротові мережі"],
                rating: 4.3
            }
        ];
        
    this.renderTechnicians();
    this.updateStats();
    this.setupFilters();
    }

    // Відображення техніків
    renderTechnicians() {
        const techList = document.getElementById('techList');
        if (!techList) {
            console.error('techList element not found');
            return;
        }
        techList.innerHTML = '';
        
        const onlineTechs = this.technicians.filter(t => t.status === 'online').length;
        const onlineTechsElement = document.getElementById('onlineTechs');
        if (onlineTechsElement) {
            onlineTechsElement.textContent = `${onlineTechs} онлайн`;
        }
        
        // Сортування: спочатку онлайн, потім зайняті, потім офлайн
        const sortedTechs = [...this.technicians].sort((a, b) => {
            const statusOrder = { 'online': 1, 'busy': 2, 'offline': 3 };
            return statusOrder[a.status] - statusOrder[b.status];
        });
        
        sortedTechs.forEach(tech => {
            const div = document.createElement('div');
            div.className = 'tech-item';
            
            // Визначення статусу
            let statusClass = 'offline';
            let statusText = 'Офлайн';
            
            if (tech.status === 'online') {
                statusClass = 'online';
                statusText = 'Онлайн';
            } else if (tech.status === 'busy') {
                statusClass = 'busy';
                statusText = 'Зайнятий';
            }
            
            // Визначення спеціалізації
            const specialties = {
                'network': 'Мережі',
                'hardware': 'Обладнання',
                'software': 'ПЗ',
                'security': 'Безпека',
                'general': 'Загальна'
            };
            
            // Визначення класу завантаження
            let loadClass = 'load-low';
            if (tech.workload === 'medium') loadClass = 'load-medium';
            else if (tech.workload === 'high') loadClass = 'load-high';
            
            div.innerHTML = `
                <img src="${tech.avatar || '../../assets/img/avatars/tech-default.png'}" 
                     class="tech-avatar" alt="${tech.firstName} ${tech.lastName}"
                     onerror="this.src='../../assets/img/avatars/tech-default.png'">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${tech.firstName} ${tech.lastName}</h6>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <span class="status-indicator ${statusClass}"></span>
                            ${statusText}
                        </small>
                        <span class="badge badge-light">${specialties[tech.specialty]}</span>
                    </div>
                    <div class="tech-load-bar">
                        <div class="tech-load-progress ${loadClass}"></div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">${tech.currentAssignments} завдань</small>
                        <small class="text-warning">
                            <i class="fas fa-star"></i> ${tech.rating}
                        </small>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-primary ml-2" 
                        onclick="dispatcherDashboard.messageTechnician(${tech.id})"
                        title="Написати повідомлення">
                    <i class="fas fa-comment"></i>
                </button>
            `;
            
            techList.appendChild(div);
        });
    }

    // Завантаження активностей
    async loadActivities() {
        // Використовуємо демо-дані для дашборду
        this.loadDemoActivities();
    }

    // Демо-дані активностей
    loadDemoActivities() {
        this.activities = [
            {
                id: 1,
                type: "assignment",
                message: "Заявку #1002 призначено техніку Олександр Петренко",
                timestamp: new Date(Date.now() - 3600000).toLocaleString('uk-UA'),
                icon: "fas fa-user-check",
                color: "text-info"
            },
            {
                id: 2,
                type: "completion",
                message: "Заявку #1005 завершено техніком Василь Шевченко",
                timestamp: new Date(Date.now() - 7200000).toLocaleString('uk-UA'),
                icon: "fas fa-check-circle",
                color: "text-success"
            },
            {
                id: 3,
                type: "assignment",
                message: "Створено нову заявку #1004 для ТОВ 'Омега'",
                timestamp: new Date(Date.now() - 10800000).toLocaleString('uk-UA'),
                icon: "fas fa-ticket-alt",
                color: "text-info"
            },
            {
                id: 4,
                type: "system",
                message: "Система оновлена до версії 2.1.0",
                timestamp: new Date(Date.now() - 14400000).toLocaleString('uk-UA'),
                icon: "fas fa-sync",
                color: "text-warning"
            },
            {
                id: 5,
                type: "completion",
                message: "Технік Марія Іваненко розпочав роботу над заявкою #1003",
                timestamp: new Date(Date.now() - 18000000).toLocaleString('uk-UA'),
                icon: "fas fa-play-circle",
                color: "text-success"
            },
            {
                id: 6,
                type: "emergency",
                message: "Створено термінову заявку #1006 - відновлення даних",
                timestamp: new Date(Date.now() - 21600000).toLocaleString('uk-UA'),
                icon: "fas fa-exclamation-triangle",
                color: "text-danger"
            }
        ];
        
        this.renderActivities();
    }

    // Відображення активностей
    renderActivities() {
        const activitiesContainer = document.getElementById('recentActivities');
        activitiesContainer.innerHTML = '';
        
        // Обмеження кількості відображуваних активностей
        const recentActivities = this.activities.slice(0, 8);
        
        recentActivities.forEach(activity => {
            const div = document.createElement('a');
            div.className = 'list-group-item list-group-item-action';
            div.href = '#';
            div.onclick = () => this.viewActivityDetails(activity.id);
            
            div.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">
                        <i class="${activity.icon} ${activity.color || 'text-info'} mr-2"></i>
                        ${activity.message}
                    </h6>
                    <small class="text-muted">${activity.timestamp}</small>
                </div>
                <small class="text-muted">Натисніть для деталей</small>
            `;
            
            activitiesContainer.appendChild(div);
        });
    }

    // Завантаження сповіщень
    async loadNotifications() {
        // Використовуємо демо-дані для дашборду
        this.loadDemoNotifications();
    }

    // Демо-сповіщення
    loadDemoNotifications() {
        this.notifications = [
            {
                id: 1,
                title: "Нова заявка",
                message: "Отримано нову заявку #1006 від ТОВ 'Дельта'",
                type: "info",
                read: false,
                timestamp: new Date().toLocaleString('uk-UA')
            },
            {
                id: 2,
                title: "Технік онлайн",
                message: "Технік Ігор Мельник тепер онлайн",
                type: "success",
                read: false,
                timestamp: new Date(Date.now() - 300000).toLocaleString('uk-UA')
            },
            {
                id: 3,
                title: "Завершено завдання",
                message: "Заявку #1005 успішно завершено",
                type: "success",
                read: true,
                timestamp: new Date(Date.now() - 1800000).toLocaleString('uk-UA')
            }
        ];
        
        this.updateNotificationBadge();
    }

    // Оновлення бейджа сповіщень
    updateNotificationBadge() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const notificationDot = document.getElementById('notificationDot');
        
        if (unreadCount > 0) {
            notificationDot.style.display = 'block';
            notificationDot.textContent = unreadCount > 9 ? '9+' : unreadCount;
        } else {
            notificationDot.style.display = 'none';
        }
    }

    // Фільтрація активностей
    filterActivities(type) {
        const activitiesContainer = document.getElementById('recentActivities');
        activitiesContainer.innerHTML = '';
        
        const filteredActivities = type === 'all' 
            ? this.activities 
            : this.activities.filter(activity => activity.type === type);
        
        // Обмеження кількості відображуваних активностей
        const recentActivities = filteredActivities.slice(0, 8);
        
        recentActivities.forEach(activity => {
            const div = document.createElement('a');
            div.className = 'list-group-item list-group-item-action';
            div.href = '#';
            div.onclick = () => this.viewActivityDetails(activity.id);
            
            div.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">
                        <i class="${activity.icon} ${activity.color || 'text-info'} mr-2"></i>
                        ${activity.message}
                    </h6>
                    <small class="text-muted">${activity.timestamp}</small>
                </div>
                <small class="text-muted">Натисніть для деталей</small>
            `;
            
            activitiesContainer.appendChild(div);
        });
    }

    // Оновлення статистики
    updateStats() {
        const totalRequests = this.requests.length;
        const pendingRequests = this.requests.filter(r => r.status === 'new').length;
        const availableTechs = this.technicians.filter(t => t.status === 'online').length;
        const urgentRequests = this.requests.filter(r => r.priority === 'high' && r.status !== 'completed').length;
        
        const totalRequestsElement = document.getElementById('totalRequests');
        const pendingRequestsElement = document.getElementById('pendingRequests');
        const availableTechsElement = document.getElementById('availableTechs');
        const urgentRequestsElement = document.getElementById('urgentRequests');
        
        if (totalRequestsElement) totalRequestsElement.textContent = totalRequests;
        if (pendingRequestsElement) pendingRequestsElement.textContent = pendingRequests;
        if (availableTechsElement) availableTechsElement.textContent = availableTechs;
        if (urgentRequestsElement) urgentRequestsElement.textContent = urgentRequests;
        
        // Оновлення бейджів
        const statsBadge = document.getElementById('statsBadge');
        const assignmentsBadge = document.getElementById('assignmentsBadge');
        const monitoringBadge = document.getElementById('monitoringBadge');
        const techsBadge = document.getElementById('techsBadge');
        
        if (statsBadge) statsBadge.textContent = totalRequests;
        if (assignmentsBadge) assignmentsBadge.textContent = pendingRequests;
        if (monitoringBadge) monitoringBadge.textContent = availableTechs;
        if (techsBadge) techsBadge.textContent = availableTechs;
    }

    // Налаштування реальних оновлень
    setupRealTimeUpdates() {
        // Симуляція реальних оновлень
        setInterval(() => {
            // Випадкове оновлення статусу заявок
            if (this.requests.length > 0 && Math.random() > 0.7) {
                const randomIndex = Math.floor(Math.random() * this.requests.length);
                const statuses = ['new', 'assigned', 'in-progress', 'completed'];
                
                const oldStatus = this.requests[randomIndex].status;
                this.requests[randomIndex].status = statuses[Math.floor(Math.random() * statuses.length)];
                
                // Додавання активності при зміні статусу
                if (oldStatus !== this.requests[randomIndex].status) {
                    const activity = {
                        id: this.activities.length + 1,
                        type: "system",
                        message: `Статус заявки #${this.requests[randomIndex].id} змінено з "${this.getStatusText(oldStatus)}" на "${this.getStatusText(this.requests[randomIndex].status)}"`,
                        timestamp: new Date().toLocaleString('uk-UA'),
                        icon: "fas fa-sync",
                        color: "text-info"
                    };
                    this.activities.unshift(activity);
                }
                
                this.renderRequests();
                this.updateStats();
            }
            
            // Випадкове оновлення статусу техніків
            if (this.technicians.length > 0 && Math.random() > 0.6) {
                const randomIndex = Math.floor(Math.random() * this.technicians.length);
                const statuses = ['online', 'busy', 'offline'];
                const workloads = ['low', 'medium', 'high'];
                
                const oldStatus = this.technicians[randomIndex].status;
                this.technicians[randomIndex].status = statuses[Math.floor(Math.random() * statuses.length)];
                this.technicians[randomIndex].workload = workloads[Math.floor(Math.random() * workloads.length)];
                this.technicians[randomIndex].currentAssignments = Math.floor(Math.random() * 6);
                
                // Додавання активності при зміні статусу
                if (oldStatus !== this.technicians[randomIndex].status) {
                    const activity = {
                        id: this.activities.length + 1,
                        type: "system",
                        message: `Технік ${this.technicians[randomIndex].firstName} ${this.technicians[randomIndex].lastName} тепер ${this.getStatusText(this.technicians[randomIndex].status)}`,
                        timestamp: new Date().toLocaleString('uk-UA'),
                        icon: "fas fa-user",
                        color: "text-info"
                    };
                    this.activities.unshift(activity);
                }
                
                this.renderTechnicians();
                this.updateStats();
            }
            
            // Випадкове додавання нової заявки
            if (Math.random() > 0.9) {
                const newRequest = {
                    id: 1000 + this.requests.length + 1,
                    title: "Нова автоматична заявка",
                    client: "Тестовий клієнт",
                    priority: Math.random() > 0.7 ? "high" : (Math.random() > 0.5 ? "medium" : "low"),
                    status: "new",
                    date: new Date().toLocaleString('uk-UA'),
                    assignedTo: null,
                    description: "Автоматично створена тестова заявка",
                    location: "Тестова локація"
                };
                
                this.requests.unshift(newRequest);
                
                // Додавання активності
                const activity = {
                    id: this.activities.length + 1,
                    type: "assignment",
                    message: `Створено нову заявку #${newRequest.id} - ${newRequest.title}`,
                    timestamp: new Date().toLocaleString('uk-UA'),
                    icon: "fas fa-ticket-alt",
                    color: "text-info"
                };
                this.activities.unshift(activity);
                
                // Додавання сповіщення
                const notification = {
                    id: this.notifications.length + 1,
                    title: "Нова заявка",
                    message: `Отримано нову заявку #${newRequest.id} від ${newRequest.client}`,
                    type: "info",
                    read: false,
                    timestamp: new Date().toLocaleString('uk-UA')
                };
                this.notifications.unshift(notification);
                
                this.renderRequests();
                this.updateStats();
                this.updateNotificationBadge();
                this.renderActivities();
                
                // Сповіщення про нову заявку
                this.showNotification(`Нова заявка #${newRequest.id}`, 'info');
            }
            
            // Оновлення часу останнього оновлення
            const now = new Date();
            document.getElementById('lastUpdate').textContent = 
                `Оновлено: ${now.toLocaleTimeString('uk-UA')}`;
                
            // Пульсація для індикатора реального часу
            $('.real-time-badge').fadeOut(500).fadeIn(500);
        }, 10000); // Оновлення кожні 10 секунд
    }

    // Отримання текстового представлення статусу
    getStatusText(status) {
        switch (status) {
            case 'new': return 'Нова';
            case 'assigned': return 'Призначена';
            case 'in-progress': return 'В роботі';
            case 'completed': return 'Завершена';
            case 'online': return 'Онлайн';
            case 'busy': return 'Зайнятий';
            case 'offline': return 'Офлайн';
            default: return status;
        }
    }

    // Перегляд заявки
    viewRequest(requestId) {
        console.log('viewRequest called with id:', requestId, 'Available requests:', this.requests.length);
        const request = this.requests.find(r => r.id === requestId);
        if (request) {
            console.log('Found request:', request.title);
            const modalContent = `
                <div class="modal-header">
                    <h5 class="modal-title">Заявка #${request.id}</h5>
                    <button type="button" class="close" data-dismiss="modal">
                        <span>&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Заголовок:</strong> ${request.title}</p>
                            <p><strong>Клієнт:</strong> ${request.client}</p>
                            <p><strong>Пріоритет:</strong> <span class="priority-badge priority-${request.priority}">${this.getPriorityText(request.priority)}</span></p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Статус:</strong> <span class="badge badge-${this.getStatusClass(request.status)}">${this.getStatusText(request.status)}</span></p>
                            <p><strong>Дата:</strong> ${request.date}</p>
                            <p><strong>Призначено:</strong> ${request.assignedTo || 'Не призначено'}</p>
                        </div>
                    </div>
                    <div class="row mt-3">
                        <div class="col-12">
                            <p><strong>Опис:</strong></p>
                            <p>${request.description}</p>
                        </div>
                    </div>
                    <div class="row mt-3">
                        <div class="col-12">
                            <p><strong>Локація:</strong> ${request.location}</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Закрити</button>
                    <button type="button" class="btn btn-primary" onclick="window.dispatcherDashboard.assignRequest(${request.id})">Призначити</button>
                </div>
            `;
            
            this.showCustomModal(modalContent);
        } else {
            console.error('Request not found with id:', requestId);
        }
    }

    // Отримання класу для статусу
    getStatusClass(status) {
        switch (status) {
            case 'new': return 'danger';
            case 'assigned': return 'warning';
            case 'in-progress': return 'info';
            case 'completed': return 'success';
            default: return 'secondary';
        }
    }

    // Отримання текстового представлення пріоритету
    getPriorityText(priority) {
        switch (priority) {
            case 'high': return 'Високий';
            case 'medium': return 'Середній';
            case 'low': return 'Низький';
            default: return priority;
        }
    }

    // Призначення заявки
    assignRequest(requestId) {
        console.log('assignRequest called with id:', requestId, 'Available requests:', this.requests.length, 'Available technicians:', this.technicians.length);
        const request = this.requests.find(r => r.id === requestId);
        if (request) {
            console.log('Found request for assignment:', request.title);
            // Заповнення випадаючих списків
            const requestSelect = document.getElementById('requestSelect');
            const techSelect = document.getElementById('techSelect');
            
            // Очищення списків
            requestSelect.innerHTML = '';
            techSelect.innerHTML = '';
            
            // Додавання поточної заявки
            const option = document.createElement('option');
            option.value = request.id;
            option.textContent = `#${request.id} - ${request.title} (${request.client})`;
            option.selected = true;
            requestSelect.appendChild(option);
            
            // Додавання доступних техніків
            const availableTechs = this.technicians.filter(t => t.status === 'online' && t.workload !== 'high');
            console.log('Available technicians for assignment:', availableTechs.length);
            availableTechs.forEach(tech => {
                const techOption = document.createElement('option');
                techOption.value = tech.id;
                techOption.textContent = `${tech.firstName} ${tech.lastName} (${this.getSpecialtyText(tech.specialty)})`;
                techSelect.appendChild(techOption);
            });
            
            // Встановлення дедлайну (за замовчуванням - через 2 дні)
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + 2);
            document.getElementById('deadline').value = deadline.toISOString().slice(0, 16);
            
            $('#assignmentModal').modal('show');
            console.log('Assignment modal shown');
        } else {
            console.error('Request not found for assignment with id:', requestId);
        }
    }

    // Отримання текстового представлення спеціалізації
    getSpecialtyText(specialty) {
        const specialties = {
            'network': 'Мережі',
            'hardware': 'Обладнання',
            'software': 'ПЗ',
            'security': 'Безпека',
            'general': 'Загальна'
        };
        return specialties[specialty] || specialty;
    }

    // Редагування заявки
    editRequest(requestId) {
        console.log('editRequest called with id:', requestId);
        const request = this.requests.find(r => r.id === requestId);
        if (request) {
            console.log('Found request for editing:', request.title);
            
            // Заповнення форми редагування даними заявки
            document.getElementById('editRequestId').value = request.id;
            document.getElementById('editTitle').value = request.title;
            document.getElementById('editClient').value = request.client;
            document.getElementById('editDescription').value = request.description;
            document.getElementById('editLocation').value = request.location;
            document.getElementById('editPriority').value = request.priority;
            document.getElementById('editStatus').value = request.status;
            
            // Заповнення техніка якщо призначено
            const editAssignedSelect = document.getElementById('editAssignedTo');
            editAssignedSelect.innerHTML = '<option value="">Не призначено</option>';
            
            // Додавання доступних техніків
            this.technicians.forEach(tech => {
                const option = document.createElement('option');
                option.value = tech.id;
                option.textContent = `${tech.firstName} ${tech.lastName}`;
                if (request.assignedTo === `${tech.firstName} ${tech.lastName}`) {
                    option.selected = true;
                }
                editAssignedSelect.appendChild(option);
            });
            
            $('#editRequestModal').modal('show');
            console.log('Edit request modal shown');
        } else {
            console.error('Request not found for editing with id:', requestId);
        }
    }

    // Перегляд деталей активності
    viewActivityDetails(activityId) {
        const activity = this.activities.find(a => a.id === activityId);
        if (activity) {
            this.showNotification(activity.message, 'info');
        }
    }

    // Створення нового призначення
    createNewAssignment() {
        // Очищення випадаючих списків
        const requestSelect = document.getElementById('requestSelect');
        const techSelect = document.getElementById('techSelect');
        
        requestSelect.innerHTML = '<option value="">Оберіть заявку...</option>';
        techSelect.innerHTML = '<option value="">Оберіть техніка...</option>';
        
        // Додавання доступних заявок
        const availableRequests = this.requests.filter(r => r.status === 'new');
        availableRequests.forEach(request => {
            const option = document.createElement('option');
            option.value = request.id;
            option.textContent = `#${request.id} - ${request.title} (${request.client})`;
            requestSelect.appendChild(option);
        });
        
        // Додавання доступних техніків
        const availableTechs = this.technicians.filter(t => t.status === 'online' && t.workload !== 'high');
        availableTechs.forEach(tech => {
            const option = document.createElement('option');
            option.value = tech.id;
            option.textContent = `${tech.firstName} ${tech.lastName} (${this.getSpecialtyText(tech.specialty)})`;
            techSelect.appendChild(option);
        });
        
        // Встановлення дедлайну (за замовчуванням - через 2 дні)
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 2);
        document.getElementById('deadline').value = deadline.toISOString().slice(0, 16);
        
        $('#assignmentModal').modal('show');
    }

    // Відправка призначення
    async submitAssignment() {
        const form = document.getElementById('assignmentForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const requestId = document.getElementById('requestSelect').value;
        const techId = document.getElementById('techSelect').value;
        const priority = document.getElementById('prioritySelect').value;
        const deadline = document.getElementById('deadline').value;
        const notes = document.getElementById('assignmentNotes').value;
        const notifyClient = document.getElementById('notifyClient').checked;
        
        try {
            const response = await fetch('/api/assignments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    requestId,
                    techId,
                    priority,
                    deadline,
                    notes,
                    notifyClient
                })
            });
            if (response.ok) {
                const result = await response.json();
                const request = this.requests.find(r => r.id == requestId);
                const tech = this.technicians.find(t => t.id == techId);
                if (request && tech) {
                    request.status = 'assigned';
                    request.assignedTo = `${tech.firstName} ${tech.lastName}`;
                    tech.currentAssignments++;
                    tech.workload = this.calculateWorkload(tech.currentAssignments);
                    const activity = {
                        id: this.activities.length + 1,
                        type: "assignment",
                        message: `Заявку #${requestId} призначено техніку ${tech.firstName} ${tech.lastName}`,
                        timestamp: new Date().toLocaleString('uk-UA'),
                        icon: "fas fa-user-check",
                        color: "text-success"
                    };
                    this.activities.unshift(activity);
                    this.renderRequests();
                    this.renderTechnicians();
                    this.renderActivities();
                    this.updateStats();
                    this.showNotification('Заявку успішно призначено', 'success');
                }
                $('#assignmentModal').modal('hide');
            } else {
                let errorText = '';
                try {
                    errorText = await response.text();
                } catch (e) {}
                this.showNotification('Помилка призначення заявки: ' + (errorText || response.statusText), 'error');
            }
        } catch (error) {
            this.showNotification('Помилка призначення заявки: ' + error.message, 'error');
        }
    }

    // Розрахунок завантаження техніка
    calculateWorkload(assignments) {
        if (assignments === 0) return 'low';
        if (assignments <= 2) return 'medium';
        return 'high';
    }

    // Відкриття моніторингу
    openMonitoring() {
        window.location.href = 'monitoring.html';
    }

    // Надіслати розсилку
    sendBroadcast() {
        const message = prompt('Введіть повідомлення для розсилки всім технікам:');
        if (message) {
            // Симуляція розсилки
            this.showNotification(`Розсилка відправлена: "${message}"`, 'info');
            
            // Додавання активності
            const activity = {
                id: this.activities.length + 1,
                type: "system",
                message: `Відправлено розсилку технікам: ${message.substring(0, 50)}...`,
                timestamp: new Date().toLocaleString('uk-UA'),
                icon: "fas fa-bullhorn",
                color: "text-warning"
            };
            this.activities.unshift(activity);
            this.renderActivities();
        }
    }

    // Генерація звіту
    generateReport() {
        const reportType = prompt('Оберіть тип звіту:\n1 - Щоденний\n2 - Тижневий\n3 - Місячний');
        if (reportType) {
            const types = { '1': 'щоденний', '2': 'тижневий', '3': 'місячний' };
            this.showNotification(`Генерація ${types[reportType] || 'щоденного'} звіту...`, 'info');
            
            // Симуляція генерації звіту
            setTimeout(() => {
                this.showNotification('Звіт успішно згенеровано та відправлено на email', 'success');
            }, 2000);
        }
    }

    // Швидка статистика
    quickStats() {
        const stats = `
            <div class="modal-header">
                <h5 class="modal-title">Швидка статистика</h5>
                <button type="button" class="close" data-dismiss="modal">
                    <span>&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <div class="row">
                    <div class="col-md-6">
                        <div class="stats-box bg-light p-3 rounded mb-3">
                            <h4>${this.requests.length}</h4>
                            <p>Всього заявок</p>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="stats-box bg-light p-3 rounded mb-3">
                            <h4>${this.requests.filter(r => r.status === 'new').length}</h4>
                            <p>В очікуванні</p>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="stats-box bg-light p-3 rounded mb-3">
                            <h4>${this.technicians.filter(t => t.status === 'online').length}</h4>
                            <p>Доступних техніків</p>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="stats-box bg-light p-3 rounded mb-3">
                            <h4>${this.requests.filter(r => r.priority === 'high' && r.status !== 'completed').length}</h4>
                            <p>Термінових заявок</p>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12">
                        <div class="stats-box bg-light p-3 rounded">
                            <h4>${Math.round((this.requests.filter(r => r.status === 'completed').length / this.requests.length) * 100) || 0}%</h4>
                            <p>Загальна завершеність</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Закрити</button>
                <button type="button" class="btn btn-primary" onclick="window.print()">Друк</button>
            </div>
        `;
        
        this.showCustomModal(stats);
    }

    // Аварійний протокол
    emergencyProtocol() {
        if (confirm('Активувати аварійний протокол? Це сповістить всіх техніків про критичну ситуацію.')) {
            // Симуляція активації аварійного протоколу
            this.showNotification('Аварійний протокол активовано! Всі техніки сповіщені.', 'warning');
            
            // Додавання активності
            const activity = {
                id: this.activities.length + 1,
                type: "emergency",
                message: "Активовано аварійний протокол",
                timestamp: new Date().toLocaleString('uk-UA'),
                icon: "fas fa-exclamation-triangle",
                color: "text-danger"
            };
            this.activities.unshift(activity);
            this.renderActivities();
        }
    }

    // Показати всі заявки
    showAllRequests() {
        window.location.href = 'assignments.html';
    }

    // Показати управління техніками
    showTechManagement() {
        window.location.href = 'technicians.html';
    }

    // Надіслати повідомлення техніку
    messageTechnician(techId) {
        const tech = this.technicians.find(t => t.id === techId);
        if (tech) {
            const message = prompt(`Написати повідомлення для ${tech.firstName} ${tech.lastName}:`);
            if (message) {
                // Симуляція відправки повідомлення
                this.showNotification(`Повідомлення відправлено для ${tech.firstName} ${tech.lastName}`, 'info');
                
                // Додавання активності
                const activity = {
                    id: this.activities.length + 1,
                    type: "message",
                    message: `Відправлено повідомлення техніку ${tech.firstName} ${tech.lastName}`,
                    timestamp: new Date().toLocaleString('uk-UA'),
                    icon: "fas fa-comment",
                    color: "text-info"
                };
                this.activities.unshift(activity);
                this.renderActivities();
            }
        }
    }

    // Показати сповіщення
    showNotifications() {
        const notificationsList = document.getElementById('notificationsList');
        notificationsList.innerHTML = '';
        
        if (this.notifications.length === 0) {
            notificationsList.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-bell-slash fa-3x text-muted mb-3"></i>
                    <p class="text-muted">Немає сповіщень</p>
                </div>
            `;
        } else {
            this.notifications.forEach(notification => {
                const div = document.createElement('div');
                div.className = `alert alert-${notification.type} ${notification.read ? '' : 'alert-bold'}`;
                div.innerHTML = `
                    <div class="d-flex justify-content-between">
                        <h6 class="alert-heading">${notification.title}</h6>
                        <small>${notification.timestamp}</small>
                    </div>
                    <p class="mb-0">${notification.message}</p>
                    ${!notification.read ? '<div class="real-time-badge"></div>' : ''}
                `;
                
                div.onclick = () => this.markNotificationAsRead(notification.id);
                notificationsList.appendChild(div);
            });
        }
        
        $('#notificationsModal').modal('show');
    }

    // Позначити сповіщення як прочитане
    markNotificationAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            this.updateNotificationBadge();
            this.showNotifications(); // Оновлення списку
        }
    }

    // Позначити все як прочитане
    markAllAsRead() {
        this.notifications.forEach(notification => {
            notification.read = true;
        });
        this.updateNotificationBadge();
        $('#notificationsModal').modal('hide');
        this.showNotification('Всі сповіщення позначено як прочитані', 'success');
    }

    // Показати повідомлення
    showMessages() {
        alert('Функціонал повідомлень буде реалізовано в наступній версії');
    }

    // Показати сповіщення (toast)
    showNotification(message, type = 'info') {
        // Використання toastr.js якщо доступний
        if (typeof toastr !== 'undefined') {
            toastr[type](message);
        } else {
            // Просте сповіщення
            const alertClass = {
                'success': 'alert-success',
                'error': 'alert-danger',
                'warning': 'alert-warning',
                'info': 'alert-info'
            }[type] || 'alert-info';
            
            const alert = `
                <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                    ${message}
                    <button type="button" class="close" data-dismiss="alert">
                        <span>&times;</span>
                    </button>
                </div>
            `;
            
            // Додавання сповіщення вгорі сторінки
            $('.content-header').after(alert);
            
            // Автоматичне приховування через 5 секунд
            setTimeout(() => {
                $('.alert').alert('close');
            }, 5000);
        }
    }

    // Показати кастомне модальне вікно
    showCustomModal(content) {
        // Створення модального вікна
        const modalId = 'customModal';
        let modal = document.getElementById(modalId);
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal fade';
            modal.tabIndex = -1;
            modal.role = 'dialog';
            modal.innerHTML = `
                <div class="modal-dialog modal-lg" role="document">
                    <div class="modal-content">
                        ${content}
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            modal.querySelector('.modal-content').innerHTML = content;
        }
        
        $(modal).modal('show');
    }

    // Відправка оновленої заявки
    async submitEditRequest() {
        const form = document.getElementById('editRequestForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const requestId = document.getElementById('editRequestId').value;
        const title = document.getElementById('editTitle').value;
        const client = document.getElementById('editClient').value;
        const description = document.getElementById('editDescription').value;
        const location = document.getElementById('editLocation').value;
        const priority = document.getElementById('editPriority').value;
        const status = document.getElementById('editStatus').value;
        const assignedToId = document.getElementById('editAssignedTo').value;
        
        // Визначення assignedTo
        let assignedTo = null;
        if (assignedToId) {
            const tech = this.technicians.find(t => t.id == assignedToId);
            if (tech) {
                assignedTo = `${tech.firstName} ${tech.lastName}`;
            }
        }
        
        try {
            const response = await fetch(`/api/requests/${requestId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    title,
                    client,
                    description,
                    location,
                    priority,
                    status,
                    assignedTo
                })
            });
            
            if (response.ok) {
                const updatedRequest = await response.json();
                
                // Оновлення локальних даних
                const requestIndex = this.requests.findIndex(r => r.id == requestId);
                if (requestIndex !== -1) {
                    this.requests[requestIndex] = {
                        ...this.requests[requestIndex],
                        title,
                        client,
                        description,
                        location,
                        priority,
                        status,
                        assignedTo
                    };
                }
                
                // Додавання активності
                const activity = {
                    id: this.activities.length + 1,
                    type: "edit",
                    message: `Заявку #${requestId} відредаговано: ${title}`,
                    timestamp: new Date().toLocaleString('uk-UA'),
                    icon: "fas fa-edit",
                    color: "text-info"
                };
                this.activities.unshift(activity);
                
                this.renderRequests();
                this.renderActivities();
                this.updateStats();
                this.showNotification('Заявку успішно оновлено', 'success');
                $('#editRequestModal').modal('hide');
            } else {
                let errorText = '';
                try {
                    errorText = await response.text();
                } catch (e) {}
                this.showNotification('Помилка оновлення заявки: ' + (errorText || response.statusText), 'error');
            }
        } catch (error) {
            this.showNotification('Помилка оновлення заявки: ' + error.message, 'error');
        }
    }

    // Видалення заявки
    async deleteRequest(requestId) {
        if (!confirm('Ви впевнені, що хочете видалити цю заявку?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/requests/${requestId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                // Видалення з локальних даних
                this.requests = this.requests.filter(r => r.id != requestId);
                
                // Додавання активності
                const activity = {
                    id: this.activities.length + 1,
                    type: "delete",
                    message: `Заявку #${requestId} видалено`,
                    timestamp: new Date().toLocaleString('uk-UA'),
                    icon: "fas fa-trash",
                    color: "text-danger"
                };
                this.activities.unshift(activity);
                
                this.renderRequests();
                this.renderActivities();
                this.updateStats();
                this.showNotification('Заявку успішно видалено', 'success');
            } else {
                let errorText = '';
                try {
                    errorText = await response.text();
                } catch (e) {}
                this.showNotification('Помилка видалення заявки: ' + (errorText || response.statusText), 'error');
            }
        } catch (error) {
            this.showNotification('Помилка видалення заявки: ' + error.message, 'error');
        }
    }

    // Масове управління заявками
    async bulkDelete() {
        if (!confirm(`Ви впевнені, що хочете видалити ${this.selectedRequests.size} заявок?`)) {
            return;
        }
        
        const deletePromises = Array.from(this.selectedRequests).map(async (requestId) => {
            try {
                const response = await fetch(`/api/requests/${requestId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });
                return { requestId, success: response.ok };
            } catch (error) {
                return { requestId, success: false, error: error.message };
            }
        });
        
        const results = await Promise.all(deletePromises);
        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;
        
        // Видалення успішно видалених заявок з локальних даних
        results.forEach(result => {
            if (result.success) {
                this.requests = this.requests.filter(r => r.id != result.requestId);
            }
        });
        
        this.selectedRequests.clear();
        this.renderRequests();
        this.updateStats();
        
        if (failCount === 0) {
            this.showNotification(`Успішно видалено ${successCount} заявок`, 'success');
        } else {
            this.showNotification(`Видалено ${successCount} заявок, помилок: ${failCount}`, 'warning');
        }
    }

    bulkAssign() {
        // Для прикладу: призначити техніка "Автоматично"
        this.requests.forEach(r => {
            if (this.selectedRequests.has(r.id)) {
                r.assignedTo = 'Автоматично';
                r.status = 'assigned';
            }
        });
        this.selectedRequests.clear();
        this.renderRequests();
        this.updateStats();
        this.showNotification('Техніка призначено для вибраних заявок', 'info');
    }

    bulkComplete() {
        this.requests.forEach(r => {
            if (this.selectedRequests.has(r.id)) {
                r.status = 'completed';
            }
        });
        this.selectedRequests.clear();
        this.renderRequests();
        this.updateStats();
        this.showNotification('Вибрані заявки завершено', 'success');
    }
}

// Ініціалізація при завантаженні сторінки
// document.addEventListener('DOMContentLoaded', function() {
//     // Перевірка, чи вже ініціалізовано
//     if (!window.dispatcherDashboard) {
//         window.dispatcherDashboard = new DispatcherDashboard();
//     }
// });