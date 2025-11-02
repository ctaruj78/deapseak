class ClientManager {
    constructor() {
        this.clients = [];
        this.filteredClients = [];
        this.requests = [];
        this.currentClient = null;
        this.init();
    }

    init() {
        this.loadClients();
        this.loadClientRequests();
        this.setupRealTimeUpdates();
    }

    // Завантаження клієнтів
    async loadClients() {
        try {
            const response = await fetch('/api/clients', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                this.clients = await response.json();
                this.filteredClients = [...this.clients];
                this.renderClients();
                this.updateStats();
            } else {
                this.loadDemoClients();
            }
        } catch (error) {
            // logger.error('Помилка завантаження клієнтів:', error);
            this.loadDemoClients();
        }
    }

    // Демо-дані клієнтів
    loadDemoClients() {
        this.clients = [
            {
                id: 1,
                name: "ТОВ 'Альфа'",
                type: "business",
                email: "info@alpha.com",
                phone: "+380441234567",
                status: "active",
                priority: "high",
                address: "Київ, вул. Хрещатик, 25",
                contactPerson: "Іваненко Петро",
                contactPosition: "Директор",
                contractInfo: "Договір №123 від 12.01.2024",
                rating: 4.8,
                totalRequests: 15,
                activeRequests: 3,
                avatar: "А",
                notes: "Постійний клієнт, VIP обслуговування"
            },
            {
                id: 2,
                name: "ПП 'Бета'",
                type: "business",
                email: "contact@beta.ua",
                phone: "+380632345678",
                status: "active",
                priority: "medium",
                address: "Львів, вул. Свободи, 15",
                contactPerson: "Марія Коваль",
                contactPosition: "Менеджер",
                contractInfo: "Договір №456 від 15.02.2024",
                rating: 4.5,
                totalRequests: 8,
                activeRequests: 1,
                avatar: "Б",
                notes: "Середній бізнес, стабільний клієнт"
            },
            {
                id: 3,
                name: "ТОВ 'Гамма'",
                type: "business",
                email: "support@gamma.org",
                phone: "+380673456789",
                status: "inactive",
                priority: "low",
                address: "Одеса, вул. Дерибасівська, 10",
                contactPerson: "Олексій Петров",
                contactPosition: "IT-менеджер",
                contractInfo: "Договір №789 від 20.03.2024",
                rating: 3.9,
                totalRequests: 5,
                activeRequests: 0,
                avatar: "Г",
                notes: "Тимчасово неактивний"
            },
            {
                id: 4,
                name: "Державна установа №5",
                type: "government",
                email: "office@gov5.gov.ua",
                phone: "+380444567890",
                status: "active",
                priority: "high",
                address: "Харків, вул. Сумська, 30",
                contactPerson: "Наталія Сидорова",
                contactPosition: "Головний спеціаліст",
                contractInfo: "Держзамовлення №001 від 01.01.2024",
                rating: 4.2,
                totalRequests: 12,
                activeRequests: 2,
                avatar: "Д",
                notes: "Державна установа, пріоритетне обслуговування"
            },
            {
                id: 5,
                name: "Іван Петренко",
                type: "individual",
                email: "ivan.petrenko@email.ua",
                phone: "+380506789012",
                status: "active",
                priority: "medium",
                address: "Дніпро, вул. Набережна, 5",
                contactPerson: "Іван Петренко",
                contactPosition: "Власник",
                contractInfo: "Договір №IND001 від 05.04.2024",
                rating: 4.7,
                totalRequests: 3,
                activeRequests: 1,
                avatar: "І",
                notes: "Фізична особа, техніка для домашнього використання"
            }
        ];
        
        this.filteredClients = [...this.clients];
        this.renderClients();
        this.updateStats();
    }

    // Завантаження заявок клієнтів
    async loadClientRequests() {
        try {
            const response = await fetch('/api/client-requests', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                this.requests = await response.json();
                this.renderRecentRequests();
            } else {
                this.loadDemoRequests();
            }
        } catch (error) {
            // logger.error('Помилка завантаження заявок:', error);
            this.loadDemoRequests();
        }
    }

    // Демо-заявки клієнтів
    loadDemoRequests() {
        this.requests = [
            {
                id: 1001,
                clientId: 1,
                clientName: "ТОВ 'Альфа'",
                title: "Не працює мережеве з'єднання",
                priority: "high",
                status: "new",
                date: new Date().toLocaleString('uk-UA')
            },
            {
                id: 1002,
                clientId: 2,
                clientName: "ПП 'Бета'",
                title: "Заміна жорсткого диска",
                priority: "medium",
                status: "assigned",
                date: new Date(Date.now() - 3600000).toLocaleString('uk-UA')
            },
            {
                id: 1003,
                clientId: 4,
                clientName: "Державна установа №5",
                title: "Встановлення оновлення ПЗ",
                priority: "high",
                status: "in-progress",
                date: new Date(Date.now() - 7200000).toLocaleString('uk-UA')
            },
            {
                id: 1004,
                clientId: 5,
                clientName: "Іван Петренко",
                title: "Налаштування Wi-Fi",
                priority: "low",
                status: "completed",
                date: new Date(Date.now() - 10800000).toLocaleString('uk-UA')
            },
            {
                id: 1005,
                clientId: 1,
                clientName: "ТОВ 'Альфа'",
                title: "Консультація з безпеки",
                priority: "medium",
                status: "new",
                date: new Date(Date.now() - 14400000).toLocaleString('uk-UA')
            }
        ];
        
        this.renderRecentRequests();
    }

    // Відображення клієнтів у вигляді карток
    renderClients() {
        const grid = document.getElementById('clientsGrid');
        grid.innerHTML = '';
        
        if (this.filteredClients.length === 0) {
            grid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-building fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">Клієнти не знайдені</h4>
                    <p>Спробуйте змінити критерії пошуку або додати нового клієнта</p>
                </div>
            `;
            return;
        }
        
        this.filteredClients.forEach(client => {
            const col = document.createElement('div');
            col.className = 'col-lg-4 col-md-6 mb-4';
            
            const clientCard = this.createClientCard(client);
            col.appendChild(clientCard);
            grid.appendChild(col);
        });
        
        document.getElementById('shownClients').textContent = this.filteredClients.length;
        document.getElementById('totalClientsCount').textContent = this.clients.length;
    }

    // Створення картки клієнта
    createClientCard(client) {
        const card = document.createElement('div');
        card.className = 'client-card';
        
        // Визначення статусу
        let statusClass = '';
        let statusText = '';
        
        switch (client.status) {
            case 'active':
                statusClass = 'badge-success';
                statusText = 'Активний';
                break;
            case 'inactive':
                statusClass = 'badge-secondary';
                statusText = 'Неактивний';
                break;
            case 'suspended':
                statusClass = 'badge-warning';
                statusText = 'Призупинений';
                break;
        }
        
        // Визначення типу
        const typeText = {
            'business': 'Бізнес',
            'individual': 'Фіз. особа',
            'government': 'Державний'
        }[client.type] || client.type;
        
        card.innerHTML = `
            <span class="status-badge ${statusClass}">${statusText}</span>
            
            <div class="client-avatar">
                ${client.avatar}
            </div>
            
            <h5 class="text-center">${client.name}</h5>
            <p class="text-center text-muted mb-2">${typeText}</p>
            
            <div class="text-center mb-3">
                <span class="priority-badge priority-${client.priority}">
                    ${this.getPriorityText(client.priority)} пріоритет
                </span>
            </div>
            
            <div class="row text-center mb-3">
                <div class="col-6">
                    <div class="text-primary font-weight-bold">${client.totalRequests}</div>
                    <small class="text-muted">Заявок</small>
                </div>
                <div class="col-6">
                    <div class="text-warning font-weight-bold">${client.rating}</div>
                    <small class="text-muted">Рейтинг</small>
                </div>
            </div>
            
            <div class="text-center">
                <span class="contract-badge">${client.contractInfo.split(' ')[0]}</span>
            </div>
            
            <div class="action-buttons mt-3">
                <button class="btn btn-sm btn-primary" onclick="clientManager.viewClient(${client.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-info" onclick="clientManager.messageClient(${client.id})">
                    <i class="fas fa-envelope"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="clientManager.editClient(${client.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="clientManager.deleteClient(${client.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        return card;
    }

    // Відображення клієнтів у таблиці
    renderClientsTable() {
        const tbody = document.getElementById('clientsTableBody');
        tbody.innerHTML = '';
        
        this.filteredClients.forEach(client => {
            const tr = document.createElement('tr');
            
            // Визначення статусу
            let statusClass = '';
            let statusText = '';
            
            switch (client.status) {
                case 'active':
                    statusClass = 'badge-success';
                    statusText = 'Активний';
                    break;
                case 'inactive':
                    statusClass = 'badge-secondary';
                    statusText = 'Неактивний';
                    break;
                case 'suspended':
                    statusClass = 'badge-warning';
                    statusText = 'Призупинений';
                    break;
            }
            
            // Визначення типу
            const typeText = {
                'business': 'Бізнес',
                'individual': 'Фіз. особа',
                'government': 'Державний'
            }[client.type] || client.type;
            
            tr.innerHTML = `
                <td>${client.id}</td>
                <td>
                    <strong>${client.name}</strong>
                    <br>
                    <small class="text-muted">${client.email}</small>
                </td>
                <td>${typeText}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td><span class="priority-badge priority-${client.priority}">${this.getPriorityText(client.priority)}</span></td>
                <td>
                    <span class="font-weight-bold">${client.totalRequests}</span>
                    <small class="text-muted">(${client.activeRequests} актив.)</small>
                </td>
                <td>
                    <span class="text-warning">
                        <i class="fas fa-star"></i> ${client.rating}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-info" onclick="clientManager.viewClient(${client.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-warning" onclick="clientManager.editClient(${client.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
    }

    // Відображення останніх заявок
    renderRecentRequests() {
        const tbody = document.getElementById('recentRequests');
        tbody.innerHTML = '';
        
        // Сортування за датою (новіші зверху)
        const recentRequests = [...this.requests]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
        
        recentRequests.forEach(request => {
            const tr = document.createElement('tr');
            
            // Визначення пріоритету
            let priorityClass = '';
            let priorityText = '';
            
            switch (request.priority) {
                case 'high':
                    priorityClass = 'priority-high';
                    priorityText = 'Високий';
                    break;
                case 'medium':
                    priorityClass = 'priority-medium';
                    priorityText = 'Середній';
                    break;
                case 'low':
                    priorityClass = 'priority-low';
                    priorityText = 'Низький';
                    break;
            }
            
            // Визначення статусу
            let statusClass = '';
            let statusText = '';
            
            switch (request.status) {
                case 'new':
                    statusClass = 'badge-danger';
                    statusText = 'Нова';
                    break;
                case 'assigned':
                    statusClass = 'badge-warning';
                    statusText = 'Призначена';
                    break;
                case 'in-progress':
                    statusClass = 'badge-info';
                    statusText = 'В роботі';
                    break;
                case 'completed':
                    statusClass = 'badge-success';
                    statusText = 'Завершена';
                    break;
            }
            
            tr.innerHTML = `
                <td><strong>#${request.id}</strong></td>
                <td>${request.clientName}</td>
                <td>${request.title}</td>
                <td><span class="priority-badge ${priorityClass}">${priorityText}</span></td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>${request.date}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="clientManager.viewRequest(${request.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
    }

    // Перегляд деталей клієнта
    viewClient(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) return;
        
        this.currentClient = client;
        
        const modalContent = `
            <div class="modal-header">
                <h5 class="modal-title">${client.name}</h5>
                <button type="button" class="close" data-dismiss="modal">
                    <span>&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <div class="row">
                    <div class="col-md-6">
                        <div class="client-avatar-lg text-center mb-3">
                            <div style="width: 100px; height: 100px; border-radius: 50%; background: #007bff; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; color: white; margin: 0 auto;">
                                ${client.avatar}
                            </div>
                        </div>
                        
                        <h6>Контактна інформація:</h6>
                        <p><i class="fas fa-envelope mr-2"></i> ${client.email}</p>
                        <p><i class="fas fa-phone mr-2"></i> ${client.phone}</p>
                        <p><i class="fas fa-map-marker-alt mr-2"></i> ${client.address}</p>
                    </div>
                    
                    <div class="col-md-6">
                        <h6>Деталі клієнта:</h6>
                        <p><strong>Тип:</strong> ${this.getTypeText(client.type)}</p>
                        <p><strong>Статус:</strong> <span class="badge badge-${client.status === 'active' ? 'success' : client.status === 'suspended' ? 'warning' : 'secondary'}">${this.getStatusText(client.status)}</span></p>
                        <p><strong>Пріоритет:</strong> <span class="priority-badge priority-${client.priority}">${this.getPriorityText(client.priority)}</span></p>
                        <p><strong>Рейтинг:</strong> <span class="text-warning"><i class="fas fa-star"></i> ${client.rating}</span></p>
                        
                        <h6 class="mt-3">Контактна особа:</h6>
                        <p>${client.contactPerson} (${client.contactPosition})</p>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Інформація про договір:</h6>
                        <p class="text-muted">${client.contractInfo}</p>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Статистика заявок:</h6>
                        <div class="row text-center">
                            <div class="col-4">
                                <div class="stats-box-sm">
                                    <div class="stats-number">${client.totalRequests}</div>
                                    <div class="stats-label">Всього</div>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="stats-box-sm">
                                    <div class="stats-number">${client.activeRequests}</div>
                                    <div class="stats-label">Активних</div>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="stats-box-sm">
                                    <div class="stats-number">${client.totalRequests - client.activeRequests}</div>
                                    <div class="stats-label">Завершено</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${client.notes ? `
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Додаткові нотатки:</h6>
                        <p class="text-muted">${client.notes}</p>
                    </div>
                </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Закрити</button>
                <button type="button" class="btn btn-primary" onclick="clientManager.editClient(${client.id})">Редагувати</button>
            </div>
        `;
        
        this.showCustomModal(modalContent);
    }

    // Показати модальне вікно додавання клієнта
    showAddClientModal() {
        document.getElementById('clientModalTitle').textContent = 'Додати клієнта';
        document.getElementById('clientForm').reset();
        document.getElementById('clientId').value = '';
        $('#clientModal').modal('show');
    }

    // Редагування клієнта
    editClient(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) return;
        
        this.currentClient = client;
        
        document.getElementById('clientModalTitle').textContent = 'Редагувати клієнта';
        document.getElementById('clientId').value = client.id;
        document.getElementById('clientName').value = client.name;
        document.getElementById('clientType').value = client.type;
        document.getElementById('clientEmail').value = client.email;
        document.getElementById('clientPhone').value = client.phone;
        document.getElementById('clientPriority').value = client.priority;
        document.getElementById('clientStatus').value = client.status;
        document.getElementById('clientAddress').value = client.address || '';
        document.getElementById('contactPerson').value = client.contactPerson || '';
        document.getElementById('contactPosition').value = client.contactPosition || '';
        document.getElementById('contractInfo').value = client.contractInfo || '';
        document.getElementById('clientNotes').value = client.notes || '';
        
        $('#clientModal').modal('show');
    }

    // Збереження клієнта
    async saveClient() {
        const form = document.getElementById('clientForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const clientData = {
            id: document.getElementById('clientId').value,
            name: document.getElementById('clientName').value,
            type: document.getElementById('clientType').value,
            email: document.getElementById('clientEmail').value,
            phone: document.getElementById('clientPhone').value,
            priority: document.getElementById('clientPriority').value,
            status: document.getElementById('clientStatus').value,
            address: document.getElementById('clientAddress').value,
            contactPerson: document.getElementById('contactPerson').value,
            contactPosition: document.getElementById('contactPosition').value,
            contractInfo: document.getElementById('contractInfo').value,
            notes: document.getElementById('clientNotes').value,
            avatar: document.getElementById('clientName').value.charAt(0).toUpperCase()
        };
        
        try {
            if (clientData.id) {
                // Оновлення існуючого клієнта
                const response = await fetch(`/api/clients/${clientData.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(clientData)
                });
                
                if (response.ok) {
                    const updatedClient = await response.json();
                    const index = this.clients.findIndex(c => c.id === updatedClient.id);
                    if (index !== -1) {
                        this.clients[index] = updatedClient;
                    }
                    this.showNotification('Клієнта успішно оновлено', 'success');
                }
            } else {
                // Додавання нового клієнта
                const response = await fetch('/api/clients', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(clientData)
                });
                
                if (response.ok) {
                    const newClient = await response.json();
                    this.clients.push(newClient);
                    this.showNotification('Клієнта успішно додано', 'success');
                }
            }
            
            this.filteredClients = [...this.clients];
            this.renderClients();
            this.updateStats();
            
            $('#clientModal').modal('hide');
        } catch (error) {
            // logger.error('Помилка збереження клієнта:', error);
            this.showNotification('Помилка збереження клієнта', 'error');
        }
    }

    // Видалення клієнта
    async deleteClient(clientId) {
        if (!confirm('Ви впевнені, що хочете видалити цього клієнта?')) return;
        
        try {
            const response = await fetch(`/api/clients/${clientId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                this.clients = this.clients.filter(c => c.id !== clientId);
                this.filteredClients = this.filteredClients.filter(c => c.id !== clientId);
                this.renderClients();
                this.updateStats();
                this.showNotification('Клієнта успішно видалено', 'success');
            }
        } catch (error) {
            // logger.error('Помилка видалення клієнта:', error);
            this.showNotification('Помилка видалення клієнта', 'error');
        }
    }

    // Надіслати повідомлення клієнту
    messageClient(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) return;
        
        const message = prompt(`Написати повідомлення для ${client.name}:`);
        if (message) {
            this.showNotification(`Повідомлення відправлено для ${client.name}`, 'info');
        }
    }

    // Перегляд заявки
    viewRequest(requestId) {
        const request = this.requests.find(r => r.id === requestId);
        if (request) {
            alert(`Деталі заявки #${request.id}\n\nКлієнт: ${request.clientName}\nЗаголовок: ${request.title}\nПріоритет: ${request.priority}\nСтатус: ${request.status}`);
        }
    }

    // Фільтрація клієнтів
    filterClients() {
        const statusFilter = document.getElementById('statusFilter').value;
        const typeFilter = document.getElementById('typeFilter').value;
        const priorityFilter = document.getElementById('priorityFilter').value;
        
        this.filteredClients = this.clients.filter(client => {
            let statusMatch = statusFilter === 'all' || client.status === statusFilter;
            let typeMatch = typeFilter === 'all' || client.type === typeFilter;
            let priorityMatch = priorityFilter === 'all' || client.priority === priorityFilter;
            
            return statusMatch && typeMatch && priorityMatch;
        });
        
        this.renderClients();
    }

    // Пошук клієнтів
    searchClients() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        
        if (!searchTerm) {
            this.filterClients();
            return;
        }
        
        this.filteredClients = this.clients.filter(client => {
            return client.name.toLowerCase().includes(searchTerm) ||
                   client.email.toLowerCase().includes(searchTerm) ||
                   client.contactPerson.toLowerCase().includes(searchTerm) ||
                   client.contractInfo.toLowerCase().includes(searchTerm);
        });
        
        this.renderClients();
    }

    // Експорт клієнтів
    exportClients() {
        const data = JSON.stringify(this.filteredClients, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `clients_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Дані клієнтів експортовано', 'success');
    }

    // Показати всі заявки
    showAllRequests() {
        alert('Функціонал перегляду всіх заявок буде реалізовано в наступній версії');
    }

    // Оновлення статистики
    updateStats() {
        const totalClients = this.clients.length;
        const activeClients = this.clients.filter(c => c.status === 'active').length;
        const totalRequests = this.clients.reduce((sum, client) => sum + client.totalRequests, 0);
        const avgRating = totalClients > 0 
            ? (this.clients.reduce((sum, client) => sum + client.rating, 0) / totalClients).toFixed(1)
            : '0.0';
        
        document.getElementById('totalClients').textContent = totalClients;
        document.getElementById('activeClients').textContent = activeClients;
        document.getElementById('totalRequests').textContent = totalRequests;
        document.getElementById('avgRating').textContent = avgRating;
        
        // Оновлення бейджа
        document.getElementById('clientsBadge').textContent = totalClients;
    }

    // Налаштування реальних оновлень
    setupRealTimeUpdates() {
        setInterval(() => {
            // Оновлення часу останнього оновлення
            const now = new Date();
            document.getElementById('lastUpdate').textContent = 
                `Оновлено: ${now.toLocaleTimeString('uk-UA')}`;
        }, 30000);
    }

    // Допоміжні методи
    getPriorityText(priority) {
        switch (priority) {
            case 'high': return 'Високий';
            case 'medium': return 'Середній';
            case 'low': return 'Низький';
            default: return priority;
        }
    }

    getStatusText(status) {
        switch (status) {
            case 'active': return 'Активний';
            case 'inactive': return 'Неактивний';
            case 'suspended': return 'Призупинений';
            default: return status;
        }
    }

    getTypeText(type) {
        switch (type) {
            case 'business': return 'Бізнес';
            case 'individual': return 'Фізична особа';
            case 'government': return 'Державна установа';
            default: return type;
        }
    }

    // Показати сповіщення
    showNotifications() {
        alert('Функціонал сповіщень буде реалізовано в наступній версії');
    }

    // Показати повідомлення
    showMessages() {
        alert('Функціонал повідомлень буде реалізовано в наступній версії');
    }

    // Показати кастомне модальне вікно
    showCustomModal(content) {
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

    // Показати сповіщення
    showNotification(message, type = 'info') {
        if (typeof toastr !== 'undefined') {
            toastr[type](message);
        } else {
            alert(message);
        }
    }
}