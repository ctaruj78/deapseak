class ClientManager {
    constructor() {
        this.clients = [];
        this.filteredClients = [];
        this.requests = [];
        this.currentClient = null;
        
        // Визначаємо роль користувача
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        this.userRole = userData.role || 'dispatcher';
        console.log('👤 Роль користувача:', this.userRole);
        
        this.init();
    }

    init() {
        this.loadClients();
        this.setupRealTimeUpdates();
    }

    // Завантаження клієнтів
    async loadClients() {
        try {
            console.log('🔄 Завантаження клієнтів з API...');
            const _token = localStorage.getItem('token') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('authToken') || '';
            const response = await fetch('/api/users?role=client', {
                headers: {
                    'Authorization': `Bearer ${_token}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('📥 Отримано дані від API:', result);
                
                // API повертає {success: true, data: [...]} — фільтруємо тільки клієнтів
                const users = (result.success ? (result.data || []) : []).filter(u => u.role === 'client');
                console.log('👥 Знайдено клієнтів:', users.length);

                // Завантажуємо заявки та ліфти для підрахунку
                let allRequests = [];
                try {
                    const reqRes = await fetch('/api/requests', {
                        headers: { 'Authorization': `Bearer ${_token}` }
                    });
                    if (reqRes.ok) {
                        const reqData = await reqRes.json();
                        allRequests = reqData.requests || reqData.data || [];
                    }
                } catch (e) { /* ігноруємо */ }
                
                // Конвертуємо користувачів у формат клієнтів
                this.clients = users.map((user, index) => {
                    // Генеруємо аватар з першої літери імені
                    const avatar = user.firstName ? user.firstName.charAt(0).toUpperCase() : 'K';
                    
                    // Визначаємо тип клієнта
                    const type = user.clientType || user.companyName ? 'business' : 'individual';
                    
                    // Формуємо повне ім'я
                    const fullName = user.companyName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Без імені';
                    
                    // Підраховуємо заявки для цього клієнта з завантажених даних
                    const uid = String(user._id);
                    const clientReqs = allRequests.filter(r => {
                        const cid = r.client?._id || r.clientId;
                        return cid && String(cid) === uid;
                    });
                    const activeStatuses = ['new', 'assigned', 'in_progress', 'open', 'pending'];
                    const clientActiveReqs = clientReqs.filter(r => activeStatuses.includes(r.status)).length;
                    
                    return {
                        id: user._id,
                        _id: user._id,
                        name: fullName,
                        firstName: user.firstName || '',
                        lastName: user.lastName || '',
                        companyName: user.companyName || '',
                        type: type,
                        email: user.email || 'Не вказано',
                        phone: user.phone || 'Не вказано',
                        status: user.status || 'active',
                        priority: user.priority || 'medium',
                        address: user.address || 'Не вказано',
                        contactPerson: user.contactPerson || fullName,
                        contactPosition: user.contactPosition || 'Клієнт',
                        contractInfo: user.contractInfo || `Договір від ${new Date(user.createdAt || Date.now()).toLocaleDateString('uk-UA')}`,
                        notes: user.notes || '',
                        rating: user.rating || null,
                        totalRequests: clientReqs.length,
                        activeRequests: clientActiveReqs,
                        requestsCount: clientReqs.length,
                        avatar: avatar,
                        createdAt: user.createdAt || new Date().toISOString(),
                        liftsCount: user.liftsCount || 0
                    };
                });
                
                this.requests = allRequests.map(req => ({
                    id: req._id,
                    requestNumber: req.requestNumber || null,
                    clientId: req.client?._id || req.clientId,
                    clientName: req.client
                        ? (`${req.client.firstName || ''} ${req.client.lastName || ''}`.trim() || req.client.companyName || req.client.username || req.client.email || 'Невідомо')
                        : (req.clientName || 'Невідомо'),
                    title: req.title || req.description?.substring(0, 50) || 'Без назви',
                    priority: req.priority || 'medium',
                    status: req.status || 'new',
                    _rawDate: req.createdAt || null,
                    date: req.createdAt ? new Date(req.createdAt).toLocaleString('uk-UA') : '—'
                }));
                
                console.log('✅ Клієнтів оброблено:', this.clients.length);
                this.filteredClients = [...this.clients];
                this.renderClients();
                this.renderRecentRequests();
                this.updateStats();
            } else {
                console.warn('⚠️ API повернув помилку, використовуємо demo дані');
                this.loadDemoClients();
            }
        } catch (error) {
            console.error('❌ Помилка завантаження клієнтів:', error);
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
                phone: "+351912345601",
                status: "active",
                priority: "high",
                address: "Lisboa, Rua da Liberdade, 123",
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
                phone: "+351923456702",
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
                phone: "+351934567803",
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
                phone: "+351945678904",
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
                phone: "+351956789005",
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
        const _tok = localStorage.getItem('token') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('authToken') || '';
        try {
            const response = await fetch('/api/requests', {
                headers: {
                    'Authorization': `Bearer ${_tok}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                // API повертає {success: true, data: [...]}
                const apiRequests = result.success && result.data ? 
                    (Array.isArray(result.data) ? result.data : (result.data.requests || result.data || [])) : [];
                
                this.requests = apiRequests.map(req => ({
                    id: req._id,
                    requestNumber: req.requestNumber || null,
                    clientId: req.client?._id || req.clientId,
                    clientName: req.client
                        ? (`${req.client.firstName || ''} ${req.client.lastName || ''}`.trim() || req.client.companyName || req.client.username || req.client.email || 'Невідомо')
                        : (req.clientName || 'Невідомо'),
                    title: req.title || req.description?.substring(0, 50) || 'Без назви',
                    priority: req.priority || 'medium',
                    status: req.status || 'new',
                    _rawDate: req.createdAt || null,
                    date: req.createdAt ? new Date(req.createdAt).toLocaleString('uk-UA') : '—'
                }));
                
                this.renderRecentRequests();
            } else {
                console.warn('⚠️ API повернув помилку, використовуємо demo дані');
                this.loadDemoRequests();
            }
        } catch (error) {
            console.error('Помилка завантаження заявок:', error);
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
        
        const shownClientsEl = document.getElementById('shownClients');
        const totalClientsCountEl = document.getElementById('totalClientsCount');
        
        if (shownClientsEl) shownClientsEl.textContent = this.filteredClients.length;
        if (totalClientsCountEl) totalClientsCountEl.textContent = this.clients.length;
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
                <div class="col-4">
                    <div class="text-success font-weight-bold">${client.liftsCount || 0}</div>
                    <small class="text-muted">Ліфтів</small>
                </div>
                <div class="col-4">
                    <div class="text-primary font-weight-bold">${client.totalRequests}</div>
                    <small class="text-muted">Заявок</small>
                </div>
                <div class="col-4">
                    <div class="text-warning font-weight-bold">${client.rating != null ? client.rating : '—'}</div>
                    <small class="text-muted">Рейтинг</small>
                </div>
            </div>
            
            <div class="text-center">
                <span class="contract-badge">${client.contractInfo.split(' ')[0]}</span>
            </div>
            
            <div class="action-buttons mt-3">
                <button class="btn btn-sm btn-primary" onclick="clientManager.viewClient('${client.id || client._id}')">
                    <i class="fas fa-eye"></i> Переглянути
                </button>
                ${client.liftsCount > 0 ? `
                <button class="btn btn-sm btn-success" onclick="clientManager.viewAllClientLifts('${client._id || client.id}')">
                    <i class="fas fa-elevator"></i> Ліфти (${client.liftsCount})
                </button>` : ''}
                <button class="btn btn-sm btn-info" onclick="window.location.href='tel:${client.phone}'">
                    <i class="fas fa-phone"></i>
                </button>
                ${this.userRole === 'admin' || this.userRole === 'dispatcher' ? `
                <button class="btn btn-sm btn-warning" onclick="clientManager.editClient('${client.id || client._id}')">
                    <i class="fas fa-edit"></i>
                </button>` : ''}
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
                        <button class="btn btn-info" onclick="clientManager.viewClient('${client.id || client._id}')" title="Переглянути">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-success" onclick="clientManager.sendEmail('${client.id || client._id}')" title="Email">
                            <i class="fas fa-envelope"></i>
                        </button>
                        ${this.userRole === 'admin' || this.userRole === 'dispatcher' ? `
                        <button class="btn btn-warning" onclick="clientManager.editClient('${client.id || client._id}')" title="Редагувати">
                            <i class="fas fa-edit"></i>
                        </button>` : ''}
                        ${this.userRole === 'admin' ? `
                        <button class="btn btn-danger" onclick="clientManager.deleteClient('${client.id || client._id}')" title="Видалити">
                            <i class="fas fa-trash"></i>
                        </button>` : ''}
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
            .sort((a, b) => new Date(b._rawDate || 0) - new Date(a._rawDate || 0))
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
            
            const reqLabel = request.requestNumber || ('#' + String(request.id).slice(-6));
            tr.innerHTML = `
                <td><strong>${reqLabel}</strong></td>
                <td>${request.clientName}</td>
                <td>${request.title}</td>
                <td><span class="priority-badge ${priorityClass}">${priorityText}</span></td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>${request.date}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="clientManager.viewRequest('${request.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
    }

    // Перегляд деталей клієнта
    viewClient(clientId) {
        console.log('🔍 Переглядаємо клієнта:', clientId);
        
        // Шукаємо клієнта за id або _id
        const client = this.clients.find(c => 
            c.id === clientId || 
            c._id === clientId || 
            c.id == clientId || 
            c._id == clientId
        );
        
        if (!client) {
            console.error('❌ Клієнта не знайдено:', clientId);
            alert('Клієнта не знайдено');
            return;
        }
        
        console.log('✅ Знайдено клієнта:', client);
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
                        <p><i class="fas fa-envelope mr-2 text-primary"></i> <a href="mailto:${client.email}">${client.email}</a></p>
                        <p><i class="fas fa-phone mr-2 text-success"></i> <a href="tel:${client.phone}">${client.phone}</a></p>
                        <p><i class="fas fa-map-marker-alt mr-2 text-danger"></i> ${client.address}</p>
                        
                        <div class="mt-3">
                            <button class="btn btn-sm btn-success" onclick="window.location.href='tel:${client.phone}'">
                                <i class="fas fa-phone-alt"></i> Зателефонувати
                            </button>
                            <button class="btn btn-sm btn-primary" onclick="window.location.href='mailto:${client.email}'">
                                <i class="fas fa-envelope"></i> Email
                            </button>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <h6>Деталі клієнта:</h6>
                        <p><strong>Тип:</strong> ${this.getTypeText(client.type)}</p>
                        <p><strong>Статус:</strong> <span class="badge badge-${client.status === 'active' ? 'success' : client.status === 'suspended' ? 'warning' : 'secondary'}">${this.getStatusText(client.status)}</span></p>
                        <p><strong>Пріоритет:</strong> <span class="priority-badge priority-${client.priority}">${this.getPriorityText(client.priority)}</span></p>
                        <p><strong>Рейтинг:</strong> <span class="text-warning"><i class="fas fa-star"></i> ${client.rating != null ? client.rating : '—'}</span></p>
                        
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
                                    <div class="stats-number" id="modalStatTotal">${client.totalRequests}</div>
                                    <div class="stats-label">Всього</div>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="stats-box-sm">
                                    <div class="stats-number" id="modalStatActive">${client.activeRequests}</div>
                                    <div class="stats-label">Активних</div>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="stats-box-sm">
                                    <div class="stats-number" id="modalStatCompleted">${client.totalRequests - client.activeRequests}</div>
                                    <div class="stats-label">Завершено</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Ліфти клієнта: <span id="clientLiftsBadge" class="badge badge-success">...</span></h6>
                        <div id="clientLiftsContainer">
                            <div class="text-center py-3">
                                <i class="fas fa-spinner fa-spin"></i> Завантаження ліфтів...
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Заявки клієнта: <span id="clientRequestsBadge" class="badge badge-info">...</span></h6>
                        <div id="clientRequestsContainer">
                            <div class="text-center py-2">
                                <i class="fas fa-spinner fa-spin"></i> Завантаження заявок...
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
                <button type="button" class="btn btn-primary" onclick="clientManager.editClient('${client._id || client.id}')">Редагувати</button>
            </div>
        `;
        
        this.showCustomModal(modalContent);
        
        // Завантажити ліфти та заявки клієнта після відкриття модалки
        const cid = client._id || client.id;
        setTimeout(() => {
            this.loadClientLifts(cid);
            this.loadClientRequestsForModal(cid);
        }, 100);
    }
    
    // Завантаження ліфтів клієнта
    async loadClientLifts(clientId) {
        const container = document.getElementById('clientLiftsContainer');
        if (!container) return;
        
        try {
            const response = await fetch(`/api/lifts?clientId=${clientId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Помилка завантаження ліфтів');
            }
            
            const result = await response.json();
            const lifts = result.data || result.lifts || [];
            
            // Оновити лічильник
            const badge = document.getElementById('clientLiftsBadge');
            if (badge) badge.textContent = lifts.length;
            
            if (lifts.length === 0) {
                container.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i> У цього клієнта ще немає ліфтів
                    </div>
                `;
                return;
            }
            
            const statusMap = {
                'operational': { badge: 'success', text: 'Активний' },
                'maintenance': { badge: 'warning', text: 'Обслуговування' },
                'repair': { badge: 'danger', text: 'Ремонт' },
                'out_of_service': { badge: 'secondary', text: 'Неактивний' },
                'inspection': { badge: 'info', text: 'Огляд' }
            };
            
            container.innerHTML = `
                <div class="list-group">
                    ${lifts.map(lift => {
                        const st = statusMap[lift.status] || { badge: 'secondary', text: lift.status || 'Невідомо' };
                        const addr = typeof lift.address === 'object'
                            ? [lift.address.street, lift.address.city].filter(Boolean).join(', ')
                            : (lift.address || '');
                        return `
                        <a href="/pages/dispatcher/lifts.html?highlight=${lift._id}" class="list-group-item list-group-item-action" style="cursor: pointer;">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <strong><i class="fas fa-elevator text-primary"></i> ${lift.municipalNumber || 'Без номера'}</strong>
                                    <br>
                                    <small class="text-muted">
                                        <i class="fas fa-map-marker-alt"></i> ${addr || 'Адреса невідома'}
                                    </small>
                                    ${lift.capacity ? `<br><small class="text-muted"><i class="fas fa-weight"></i> ${lift.capacity} кг</small>` : ''}
                                </div>
                                <div class="text-right">
                                    <span class="badge badge-${st.badge}">${st.text}</span>
                                    ${lift.nextInspectionDate ? `<br><small class="text-muted"><i class="fas fa-calendar"></i> ${new Date(lift.nextInspectionDate).toLocaleDateString('uk-UA')}</small>` : ''}
                                </div>
                            </div>
                        </a>
                        `;
                    }).join('')}
                </div>
                <div class="mt-2">
                    <a href="/pages/dispatcher/lifts.html?clientId=${clientId}" class="btn btn-sm btn-outline-primary">
                        <i class="fas fa-external-link-alt"></i> Відкрити всі ліфти
                    </a>
                </div>
            `;
        } catch (error) {
            console.error('❌ Помилка завантаження ліфтів:', error);
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i> Помилка завантаження ліфтів
                </div>
            `;
        }
    }
    
    // Перегляд всіх ліфтів клієнта (перехід на сторінку ліфтів з фільтром)
    viewAllClientLifts(clientId) {
        window.location.href = `/pages/dispatcher/lifts.html?clientId=${clientId}`;
    }

    // Завантаження заявок клієнта для модалки
    async loadClientRequestsForModal(clientId) {
        const container = document.getElementById('clientRequestsContainer');
        const badge = document.getElementById('clientRequestsBadge');
        if (!container) return;

        try {
            const response = await fetch(`/api/requests?clientId=${clientId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });

            let requests = [];
            if (response.ok) {
                const result = await response.json();
                requests = result.data || result.requests || [];
            } else {
                // Fallback: filter from already-loaded requests
                const cid = String(clientId);
                requests = this.requests.filter(r => String(r.clientId) === cid || String(r.client?._id) === cid);
            }

            if (badge) badge.textContent = requests.length;

            // Оновити статистику заявок у модалці
            const activeStatuses = ['new', 'open', 'assigned', 'in_progress', 'pending'];
            const activeCount = requests.filter(r => activeStatuses.includes(r.status)).length;
            const closedCount = requests.length - activeCount;
            const elTotal = document.getElementById('modalStatTotal');
            const elActive = document.getElementById('modalStatActive');
            const elCompleted = document.getElementById('modalStatCompleted');
            if (elTotal) elTotal.textContent = requests.length;
            if (elActive) elActive.textContent = activeCount;
            if (elCompleted) elCompleted.textContent = closedCount;

            if (requests.length === 0) {
                container.innerHTML = `<div class="alert alert-info mb-0"><i class="fas fa-info-circle"></i> Заявок ще немає</div>`;
                return;
            }

            const statusMap = {
                'new': { badge: 'info', text: 'Нова' },
                'open': { badge: 'info', text: 'Відкрита' },
                'assigned': { badge: 'primary', text: 'Призначена' },
                'in_progress': { badge: 'warning', text: 'В роботі' },
                'pending': { badge: 'warning', text: 'Очікує' },
                'completed': { badge: 'success', text: 'Завершена' },
                'cancelled': { badge: 'secondary', text: 'Скасована' }
            };
            const priorityMap = {
                'critical': { badge: 'danger', text: 'Критичний' },
                'high': { badge: 'warning', text: 'Високий' },
                'medium': { badge: 'info', text: 'Середній' },
                'normal': { badge: 'info', text: 'Середній' },
                'low': { badge: 'secondary', text: 'Низький' }
            };

            container.innerHTML = `
                <div class="list-group">
                    ${requests.slice(0, 10).map(req => {
                        const st = statusMap[req.status] || { badge: 'secondary', text: req.status || 'Невідомо' };
                        const pr = priorityMap[req.priority] || { badge: 'secondary', text: req.priority || '' };
                        const title = req.title || req.description?.substring(0, 60) || 'Без назви';
                        const date = req.createdAt ? new Date(req.createdAt).toLocaleDateString('uk-UA') : (req.date || '');
                        return `
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <strong>${title}</strong>
                                    ${date ? `<br><small class="text-muted"><i class="fas fa-calendar"></i> ${date}</small>` : ''}
                                </div>
                                <div class="text-right">
                                    <span class="badge badge-${st.badge}">${st.text}</span>
                                    ${req.priority ? `<br><span class="badge badge-${pr.badge} mt-1">${pr.text}</span>` : ''}
                                </div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
                ${requests.length > 10 ? `<small class="text-muted mt-1 d-block">Показано 10 з ${requests.length} заявок</small>` : ''}
            `;
        } catch (error) {
            console.error('❌ Помилка завантаження заявок:', error);

            // Fallback to in-memory data
            const cid = String(clientId);
            const requests = this.requests.filter(r => String(r.clientId) === cid);
            if (badge) badge.textContent = requests.length;
            if (requests.length === 0) {
                container.innerHTML = `<div class="alert alert-info mb-0"><i class="fas fa-info-circle"></i> Заявок ще немає</div>`;
            } else {
                container.innerHTML = `<div class="alert alert-warning mb-0"><i class="fas fa-exclamation-triangle"></i> Завантажено ${requests.length} заявок з кешу</div>`;
            }
        }
    }

    // Показати модальне вікно додавання клієнта
    showAddClientModal() {
        const titleEl = document.getElementById('clientModalTitle');
        const formEl = document.getElementById('clientForm');
        const idEl = document.getElementById('clientId');
        
        if (titleEl) titleEl.textContent = 'Додати клієнта';
        if (formEl) formEl.reset();
        if (idEl) idEl.value = '';
        
        // Перевірка чи jQuery та Bootstrap модаль доступні
        if (typeof $ !== 'undefined' && $('#clientModal').length) {
            $('#clientModal').modal('show');
        }
    }

    // Редагування клієнта
    editClient(clientId) {
        console.log('✏️ Редагуємо клієнта:', clientId);
        
        // ✅ Диспетчер може редагувати клієнтів (практично для роботи)
        if (this.userRole !== 'admin' && this.userRole !== 'dispatcher') {
            alert('❌ Доступ заборонено! Тільки адміністратори та диспетчери можуть редагувати клієнтів.');
            return;
        }
        
        // Шукаємо клієнта за id або _id
        const client = this.clients.find(c => 
            c.id === clientId || 
            c._id === clientId || 
            c.id == clientId || 
            c._id == clientId
        );
        
        if (!client) {
            console.error('❌ Клієнта не знайдено:', clientId);
            alert('Клієнта не знайдено');
            return;
        }
        
        console.log('✅ Знайдено клієнта для редагування:', client);
        this.currentClient = client;
        
        const titleEl = document.getElementById('clientModalTitle');
        const idEl = document.getElementById('clientId');
        const nameEl = document.getElementById('clientName');
        const typeEl = document.getElementById('clientType');
        const emailEl = document.getElementById('clientEmail');
        const phoneEl = document.getElementById('clientPhone');
        const priorityEl = document.getElementById('clientPriority');
        const statusEl = document.getElementById('clientStatus');
        const addressEl = document.getElementById('clientAddress');
        const contactPersonEl = document.getElementById('contactPerson');
        const contactPositionEl = document.getElementById('contactPosition');
        const contractInfoEl = document.getElementById('contractInfo');
        const notesEl = document.getElementById('clientNotes');
        
        if (titleEl) titleEl.textContent = 'Редагувати клієнта';
        if (idEl) idEl.value = client.id;
        if (nameEl) nameEl.value = client.name;
        if (typeEl) typeEl.value = client.type;
        if (emailEl) emailEl.value = client.email;
        if (phoneEl) phoneEl.value = client.phone;
        if (priorityEl) priorityEl.value = client.priority;
        if (statusEl) statusEl.value = client.status;
        if (addressEl) addressEl.value = client.address || '';
        if (contactPersonEl) contactPersonEl.value = client.contactPerson || '';
        if (contactPositionEl) contactPositionEl.value = client.contactPosition || '';
        if (contractInfoEl) contractInfoEl.value = client.contractInfo || '';
        if (notesEl) notesEl.value = client.notes || '';
        
        if (typeof $ !== 'undefined' && $('#clientModal').length) {
            $('#clientModal').modal('show');
        }
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
                
                const newClientData = await response.json();
                if (response.ok) {
                    this.clients.push(newClientData);
                    const nc = newClientData.newClient;
                    if (nc) {
                        const emailMsg = nc.emailSent === false
                            ? `⚠️ Email não enviado (${nc.emailError || 'SMTP não configurado'})`
                            : '📧 Convite enviado por email';
                        this.showNotification(
                            `✅ Cliente criado!\n👤 ${nc.email}\n🔑 Palavra-passe: ${nc.password}\n${emailMsg}`,
                            'success'
                        );
                    } else {
                        this.showNotification('Cliente já existe — associado com sucesso', 'info');
                    }
                } else {
                    this.showNotification(newClientData.message || 'Erro ao guardar cliente', 'error');
                    return;
                }
            }
            
            this.filteredClients = [...this.clients];
            this.renderClients();
            this.updateStats();
            
            $('#clientModal').modal('hide');
        } catch (error) {
            console.error('Помилка збереження клієнта:', error);
            this.showNotification('Помилка збереження клієнта', 'error');
        }
    }

    // Видалення клієнта
    async deleteClient(clientId) {
        // 🔒 Перевірка ролі користувача
        if (this.userRole === 'dispatcher') {
            alert('❌ Доступ заборонено! Тільки адміністратори можуть видаляти клієнтів.');
            return;
        }
        
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
            console.error('Помилка видалення клієнта:', error);
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

    // Відправка email клієнту
    sendEmail(clientId) {
        console.log('📧 Відправляємо email клієнту:', clientId);
        
        // Шукаємо клієнта за id або _id
        const client = this.clients.find(c => 
            c.id === clientId || 
            c._id === clientId || 
            c.id == clientId || 
            c._id == clientId
        );
        
        if (!client) {
            console.error('❌ Клієнта не знайдено:', clientId);
            alert('Клієнта не знайдено');
            return;
        }
        
        console.log('✅ Знайдено клієнта для email:', client);
        
        // Створюємо mailto link
        const subject = encodeURIComponent('FestLift - Повідомлення');
        const body = encodeURIComponent(`Шановний ${client.name},\n\n`);
        const mailtoLink = `mailto:${client.email}?subject=${subject}&body=${body}`;
        
        // Відкриваємо поштовий клієнт
        window.location.href = mailtoLink;
        
        // Альтернативний варіант - показати модальне вікно для написання повідомлення
        // this.showEmailModal(client);
    }

    // Показати модальне вікно для написання email
    showEmailModal(client) {
        const modalContent = `
            <div class="modal-header">
                <h5 class="modal-title">
                    <i class="fas fa-envelope mr-2"></i>
                    Відправити Email - ${client.name}
                </h5>
                <button type="button" class="close" data-dismiss="modal">
                    <span>&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <form id="emailForm">
                    <div class="form-group">
                        <label>Кому:</label>
                        <input type="email" class="form-control" value="${client.email}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Тема:</label>
                        <input type="text" class="form-control" id="emailSubject" placeholder="Введіть тему...">
                    </div>
                    <div class="form-group">
                        <label>Повідомлення:</label>
                        <textarea class="form-control" id="emailBody" rows="8" placeholder="Введіть текст повідомлення..."></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Скасувати</button>
                <button type="button" class="btn btn-primary" onclick="clientManager.sendClientEmail('${client.email}')">
                    <i class="fas fa-paper-plane mr-2"></i>Відправити
                </button>
            </div>
        `;
        
        this.showCustomModal(modalContent);
    }

    // Відправка email через API
    async sendClientEmail(email) {
        const subject = document.getElementById('emailSubject')?.value;
        const body = document.getElementById('emailBody')?.value;
        
        if (!subject || !body) {
            alert('Заповніть тему та текст повідомлення');
            return;
        }
        
        try {
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    to: email,
                    subject: subject,
                    body: body
                })
            });
            
            if (response.ok) {
                alert('Email успішно відправлено!');
                $('#customModal').modal('hide');
            } else {
                const error = await response.json();
                alert('Помилка відправки email: ' + (error.message || 'Невідома помилка'));
            }
        } catch (error) {
            console.error('Помилка відправки email:', error);
            alert('Помилка відправки email: ' + error.message);
        }
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
        const totalRequests = this.clients.reduce((sum, client) => sum + (client.requestsCount || 0), 0);
        const ratedClients = this.clients.filter(c => c.rating != null);
        const avgRating = ratedClients.length > 0
            ? (ratedClients.reduce((sum, c) => sum + c.rating, 0) / ratedClients.length).toFixed(1)
            : '—';
        
        // Безпечне оновлення DOM елементів (можуть не існувати на всіх сторінках)
        const totalClientsEl = document.getElementById('totalClients');
        const activeClientsEl = document.getElementById('activeClients');
        const totalRequestsEl = document.getElementById('totalRequests');
        const avgRatingEl = document.getElementById('avgRating');
        const clientsBadgeEl = document.getElementById('clientsBadge');
        
        if (totalClientsEl) totalClientsEl.textContent = totalClients;
        if (activeClientsEl) activeClientsEl.textContent = activeClients;
        if (totalRequestsEl) totalRequestsEl.textContent = totalRequests;
        if (avgRatingEl) avgRatingEl.textContent = avgRating;
        if (clientsBadgeEl) clientsBadgeEl.textContent = totalClients;
    }

    // Налаштування реальних оновлень
    setupRealTimeUpdates() {
        setInterval(() => {
            // Оновлення часу останнього оновлення
            const now = new Date();
            const lastUpdateEl = document.getElementById('lastUpdate');
            if (lastUpdateEl) {
                lastUpdateEl.textContent = `Оновлено: ${now.toLocaleTimeString('uk-UA')}`;
            }
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
                <div class="modal-dialog modal-lg modal-dialog-scrollable" role="document">
                    <div class="modal-content">
                        ${content}
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            modal.querySelector('.modal-content').innerHTML = content;
            // Ensure scrollable class is present
            const dlg = modal.querySelector('.modal-dialog');
            if (dlg) dlg.classList.add('modal-dialog-scrollable');
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