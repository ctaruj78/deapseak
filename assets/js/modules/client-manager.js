class ClientManager {
    constructor() {
        this.clients = [];
        this.filteredClients = [];
        this.requests = [];
        this.currentClient = null;
        
        // Визначаємо роль користувача
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        this.userRole = userData.role || 'dispatcher';
        console.log('👤 Função користувача:', this.userRole);
        
        this.init();
    }

    init() {
        this.loadClients();
        this.setupRealTimeUpdates();
    }

    // Хелпер: повертає JWT токен з будь-якого можливого ключа localStorage
    _getToken() {
        return (typeof AuthManager !== 'undefined' && AuthManager.getAuthToken && AuthManager.getAuthToken())
            || localStorage.getItem('liftmanager_jwt')
            || localStorage.getItem('token')
            || sessionStorage.getItem('liftmanager_jwt')
            || '';
    }

    // A carregar клієнтів
    async loadClients() {
        try {
            console.log('🔄 A carregar клієнтів з API...');
            const _token = localStorage.getItem('token') || localStorage.getItem('liftmanager_jwt') || this._getToken() || '';
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
                    
                    // Визначаємо тип клієнта: спочатку явне поле type/clientType з БД
                    const type = user.type || user.clientType || (user.companyName ? 'business' : 'individual');
                    
                    // Формуємо повне ім'я
                    const fullName = user.companyName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Sem nome';
                    
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
                        email: user.email || 'Não especificado',
                        phone: user.phone || 'Não especificado',
                        status: user.status || 'active',
                        priority: user.priority || 'medium',
                        address: user.address || 'Não especificado',
                        contactPerson: user.contactPerson || fullName,
                        contactPosition: user.contactPosition || 'Cliente',
                        contractInfo: user.contractInfo || `Contrato de ${new Date(user.createdAt || Date.now()).toLocaleDateString('pt-PT')}`,
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
                        ? (`${req.client.firstName || ''} ${req.client.lastName || ''}`.trim() || req.client.companyName || req.client.username || req.client.email || 'Desconhecido')
                        : (req.clientName || 'Desconhecido'),
                    title: req.title || req.description?.substring(0, 50) || 'Sem título',
                    priority: req.priority || 'medium',
                    status: req.status || 'new',
                    _rawDate: req.createdAt || null,
                    date: req.createdAt ? new Date(req.createdAt).toLocaleString('pt-PT') : '—'
                }));
                
                console.log('✅ Clienteів оброблено:', this.clients.length);
                this.filteredClients = [...this.clients];
                this.renderClients();
                this.renderRecentRequests();
                this.updateStats();
            } else {
                console.warn('⚠️ API повернув помилку, без demo fallback');
                this.clients = [];
                this.filteredClients = [];
                this.requests = [];
                this.renderClients();
                this.renderRecentRequests();
                this.updateStats();
            }
        } catch (error) {
            console.error('❌ Erro завантаження клієнтів:', error);
            this.clients = [];
            this.filteredClients = [];
            this.requests = [];
            this.renderClients();
            this.renderRecentRequests();
            this.updateStats();
        }
    }

    // Демо-дані клієнтів
    loadDemoClients() {
        this.clients = [
            {
                id: 1,
                name: "LDA 'Alfa'",
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
                name: "LDA 'Beta'",
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
                notes: "Agoедній бізнес, стабільний клієнт"
            },
            {
                id: 3,
                name: "LDA 'Gama'",
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

    // A carregar заявок клієнтів
    async loadClientRequests() {
        const _tok = localStorage.getItem('token') || localStorage.getItem('liftmanager_jwt') || this._getToken() || '';
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
                        ? (`${req.client.firstName || ''} ${req.client.lastName || ''}`.trim() || req.client.companyName || req.client.username || req.client.email || 'Desconhecido')
                        : (req.clientName || 'Desconhecido'),
                    title: req.title || req.description?.substring(0, 50) || 'Sem título',
                    priority: req.priority || 'medium',
                    status: req.status || 'new',
                    _rawDate: req.createdAt || null,
                    date: req.createdAt ? new Date(req.createdAt).toLocaleString('pt-PT') : '—'
                }));
                
                this.renderRecentRequests();
            } else {
                console.warn('⚠️ API повернув помилку, без demo fallback');
                this.requests = [];
                this.renderRecentRequests();
            }
        } catch (error) {
            console.error('Erro завантаження заявок:', error);
            this.requests = [];
            this.renderRecentRequests();
        }
    }

    // Демо-заявки клієнтів
    loadDemoRequests() {
        this.requests = [
            {
                id: 1001,
                clientId: 1,
                clientName: "LDA 'Alfa'",
                title: "Falha na ligação de rede",
                priority: "high",
                status: "new",
                date: new Date().toLocaleString('pt-PT')
            },
            {
                id: 1002,
                clientId: 2,
                clientName: "LDA 'Beta'",
                title: "Заміна жорсткого диска",
                priority: "medium",
                status: "assigned",
                date: new Date(Date.now() - 3600000).toLocaleString('pt-PT')
            },
            {
                id: 1003,
                clientId: 4,
                clientName: "Державна установа №5",
                title: "Встановлення оновлення ПЗ",
                priority: "high",
                status: "in-progress",
                date: new Date(Date.now() - 7200000).toLocaleString('pt-PT')
            },
            {
                id: 1004,
                clientId: 5,
                clientName: "Іван Петренко",
                title: "Definições Wi-Fi",
                priority: "low",
                status: "completed",
                date: new Date(Date.now() - 10800000).toLocaleString('pt-PT')
            },
            {
                id: 1005,
                clientId: 1,
                clientName: "LDA 'Alfa'",
                title: "Консультація з безпеки",
                priority: "medium",
                status: "new",
                date: new Date(Date.now() - 14400000).toLocaleString('pt-PT')
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
                    <h4 class="text-muted">Nenhum cliente encontrado</h4>
                    <p>Tente alterar os critérios de pesquisa ou adicionar um novo cliente</p>
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
                statusText = 'Ativo';
                break;
            case 'inactive':
                statusClass = 'badge-secondary';
                statusText = 'Inativo';
                break;
            case 'suspended':
                statusClass = 'badge-warning';
                statusText = 'Suspenso';
                break;
        }
        
        // Визначення типу
        const typeText = {
            'business': 'Empresa',
            'individual': 'Particular',
            'government': 'Público'
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
                    ${this.getPriorityText(client.priority)} prioridade
                </span>
            </div>
            
            <div class="row text-center mb-3">
                <div class="col-4">
                    <div class="text-success font-weight-bold">${client.liftsCount || 0}</div>
                    <small class="text-muted">Elevadores</small>
                </div>
                <div class="col-4">
                    <div class="text-primary font-weight-bold">${client.totalRequests}</div>
                    <small class="text-muted">Pedidos</small>
                </div>
                <div class="col-4">
                    <div class="text-warning font-weight-bold">${client.rating != null ? client.rating : '—'}</div>
                    <small class="text-muted">Avaliação</small>
                </div>
            </div>
            
            <div class="text-center">
                <span class="contract-badge">${client.contractInfo.split(' ')[0]}</span>
            </div>
            
            <div class="action-buttons mt-3">
                <button class="btn btn-sm btn-primary" onclick="clientManager.viewClient('${client.id || client._id}')">
                    <i class="fas fa-eye"></i> Ver
                </button>
                ${client.liftsCount > 0 ? `
                <button class="btn btn-sm btn-success" onclick="clientManager.viewAllClientLifts('${client._id || client.id}')">
                    <i class="fas fa-elevator"></i> Elevadores (${client.liftsCount})
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
                    statusText = 'Ativo';
                    break;
                case 'inactive':
                    statusClass = 'badge-secondary';
                    statusText = 'Inativo';
                    break;
                case 'suspended':
                    statusClass = 'badge-warning';
                    statusText = 'Suspenso';
                    break;
            }
            
            // Визначення типу
            const typeText = {
                'business': 'Empresa',
                'individual': 'Particular',
                'government': 'Público'
            }[client.type] || client.type;
            
            tr.innerHTML = `
                <td><span class="badge badge-secondary">#${String(client.id || client._id).slice(-4).toUpperCase()}</span></td>
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
                    <small class="text-muted">(${client.activeRequests} ativos)</small>
                </td>
                <td>
                    <span class="text-warning">
                        <i class="fas fa-star"></i> ${client.rating}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-info" onclick="clientManager.viewClient('${client.id || client._id}')" title="Ver">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-success" onclick="clientManager.sendEmail('${client.id || client._id}')" title="Email">
                            <i class="fas fa-envelope"></i>
                        </button>
                        ${this.userRole === 'admin' || this.userRole === 'dispatcher' ? `
                        <button class="btn btn-warning" onclick="clientManager.editClient('${client.id || client._id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>` : ''}
                        ${this.userRole === 'admin' ? `
                        <button class="btn btn-danger" onclick="clientManager.deleteClient('${client.id || client._id}')" title="Eliminar">
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

        if (recentRequests.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="7" class="text-center text-muted py-3">Sem pedidos reais recentes</td>';
            tbody.appendChild(tr);
            return;
        }
        
        recentRequests.forEach(request => {
            const tr = document.createElement('tr');
            
            // Визначення пріоритету
            let priorityClass = '';
            let priorityText = '';
            
            switch (request.priority) {
                case 'high':
                    priorityClass = 'priority-high';
                    priorityText = 'Alto';
                    break;
                case 'medium':
                    priorityClass = 'priority-medium';
                    priorityText = 'Médio';
                    break;
                case 'low':
                    priorityClass = 'priority-low';
                    priorityText = 'Baixo';
                    break;
            }
            
            // Визначення статусу
            let statusClass = '';
            let statusText = '';
            
            switch (request.status) {
                case 'new':
                    statusClass = 'badge-danger';
                    statusText = 'Novo';
                    break;
                case 'assigned':
                    statusClass = 'badge-warning';
                    statusText = 'Atribuído';
                    break;
                case 'in-progress':
                    statusClass = 'badge-info';
                    statusText = 'Em curso';
                    break;
                case 'completed':
                    statusClass = 'badge-success';
                    statusText = 'Concluído';
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
            console.error('❌ Clienteа не знайдено:', clientId);
            alert('Cliente não encontrado');
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
                        
                        <h6>Informação de Contacto:</h6>
                        <p><i class="fas fa-envelope mr-2 text-primary"></i> ${client.email}</p>
                        <p><i class="fas fa-phone mr-2 text-success"></i> <a href="tel:${client.phone}">${client.phone}</a></p>
                        <p><i class="fas fa-map-marker-alt mr-2 text-danger"></i> ${client.address}</p>
                        
                        <div class="mt-3">
                            <button class="btn btn-sm btn-success" onclick="window.location.href='tel:${client.phone}'">
                                <i class="fas fa-phone-alt"></i> Ligar
                            </button>
                            <button class="btn btn-sm btn-primary" onclick="clientManager.sendEmail('${client.id || client._id}')">
                                <i class="fas fa-envelope"></i> Email
                            </button>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <h6>Detalhes do Cliente:</h6>
                        <p><strong>Tipo:</strong> ${this.getTypeText(client.type)}</p>
                        <p><strong>Estado:</strong> <span class="badge badge-${client.status === 'active' ? 'success' : client.status === 'suspended' ? 'warning' : 'secondary'}">${this.getStatusText(client.status)}</span></p>
                        <p><strong>Prioridade:</strong> <span class="priority-badge priority-${client.priority}">${this.getPriorityText(client.priority)}</span></p>
                        <p><strong>Classificação:</strong> <span class="text-warning"><i class="fas fa-star"></i> ${client.rating != null ? client.rating : '—'}</span></p>
                        
                        <h6 class="mt-3">Pessoa de Contacto:</h6>
                        <p>${client.contactPerson} (${client.contactPosition})</p>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Informação do Contrato:</h6>
                        <p class="text-muted">${client.contractInfo}</p>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Estatísticas de Pedidos:</h6>
                        <div class="row text-center">
                            <div class="col-4">
                                <div class="stats-box-sm">
                                    <div class="stats-number" id="modalStatTotal">${client.totalRequests}</div>
                                    <div class="stats-label">Total</div>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="stats-box-sm">
                                    <div class="stats-number" id="modalStatActive">${client.activeRequests}</div>
                                    <div class="stats-label">Ativos</div>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="stats-box-sm">
                                    <div class="stats-number" id="modalStatCompleted">${client.totalRequests - client.activeRequests}</div>
                                    <div class="stats-label">Concluídos</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Elevadores do Cliente: <span id="clientLiftsBadge" class="badge badge-success">...</span></h6>
                        <div id="clientLiftsContainer">
                            <div class="text-center py-3">
                                <i class="fas fa-spinner fa-spin"></i> A carregar elevadores...
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Pedidos do Cliente: <span id="clientRequestsBadge" class="badge badge-info">...</span></h6>
                        <div id="clientRequestsContainer">
                            <div class="text-center py-2">
                                <i class="fas fa-spinner fa-spin"></i> A carregar pedidos...
                            </div>
                        </div>
                    </div>
                </div>
                
                ${client.notes ? `
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Notas adicionais:</h6>
                        <p class="text-muted">${client.notes}</p>
                    </div>
                </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="button" class="btn btn-warning" onclick="clientManager.sendPasswordToClient('${client._id || client.id}')">
                    <i class="fas fa-key"></i> Enviar senha
                </button>
                <button type="button" class="btn btn-primary" onclick="clientManager.editClient('${client._id || client.id}')">Editar</button>
            </div>
        `;
        
        this.showCustomModal(modalContent);
        
        // Descarregar ліфти та заявки клієнта після відкриття модалки
        const cid = client._id || client.id;
        setTimeout(() => {
            this.loadClientLifts(cid);
            this.loadClientRequestsForModal(cid);
        }, 100);
    }
    
    // A carregar ліфтів клієнта
    async loadClientLifts(clientId) {
        const container = document.getElementById('clientLiftsContainer');
        if (!container) return;
        
        try {
            const response = await fetch(`/api/lifts?clientId=${clientId}`, {
                headers: {
                    'Authorization': `Bearer ${this._getToken()}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Erro ao carregar elevadores');
            }
            
            const result = await response.json();
            const lifts = result.data || result.lifts || [];
            
            // Atualizar лічильник
            const badge = document.getElementById('clientLiftsBadge');
            if (badge) badge.textContent = lifts.length;
            
            if (lifts.length === 0) {
                container.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i> Este cliente ainda não tem elevadores
                    </div>
                `;
                return;
            }
            
            const statusMap = {
                'operational': { badge: 'success', text: 'Ativo' },
                'maintenance': { badge: 'warning', text: 'Manutenção' },
                'repair': { badge: 'danger', text: 'Reparação' },
                'out_of_service': { badge: 'secondary', text: 'Inativo' },
                'inspection': { badge: 'info', text: 'Inspeção' }
            };
            
            container.innerHTML = `
                <div class="list-group">
                    ${lifts.map(lift => {
                        const st = statusMap[lift.status] || { badge: 'secondary', text: lift.status || 'Desconhecido' };
                        const addr = typeof lift.address === 'object'
                            ? [lift.address.street, lift.address.city].filter(Boolean).join(', ')
                            : (lift.address || '');
                        return `
                        <a href="#" onclick="event.preventDefault();clientManager._openLiftPage('${lift._id}')" class="list-group-item list-group-item-action" style="cursor: pointer;">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <strong><i class="fas fa-elevator text-primary"></i> ${lift.municipalNumber || 'Sem número'}</strong>
                                    <br>
                                    <small class="text-muted">
                                        <i class="fas fa-map-marker-alt"></i> ${addr || 'Endereço desconhecido'}
                                    </small>
                                    ${lift.capacity ? `<br><small class="text-muted"><i class="fas fa-weight"></i> ${lift.capacity} kg</small>` : ''}
                                </div>
                                <div class="text-right">
                                    <span class="badge badge-${st.badge}">${st.text}</span>
                                    ${lift.nextInspectionDate ? `<br><small class="text-muted"><i class="fas fa-calendar"></i> ${new Date(lift.nextInspectionDate).toLocaleDateString('pt-PT')}</small>` : ''}
                                </div>
                            </div>
                        </a>
                        `;
                    }).join('')}
                </div>
                <div class="mt-2">
                    <a href="#" onclick="event.preventDefault();clientManager.viewAllClientLifts('${clientId}')" class="btn btn-sm btn-outline-primary">
                        <i class="fas fa-external-link-alt"></i> Ver todos os elevadores
                    </a>
                </div>
            `;
        } catch (error) {
            console.error('❌ Erro завантаження ліфтів:', error);
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i> Erro завантаження ліфтів
                </div>
            `;
        }
    }
    
    // Показати повну модалку деталей ліфта через iframe (з картою, звітами, orcamentos)
    _openLiftPage(liftId) {
        const role = this.userRole;
        const base = role === 'admin' ? '/pages/admin/lifts.html' : '/pages/dispatcher/lifts.html';
        const src = `${base}?openLift=${encodeURIComponent(liftId)}&embed=1`;

        // Видаляємо попередній оверлей якщо є
        document.getElementById('liftIframeOverlay')?.remove();

        // Простий div-оверлей без Bootstrap modal — щоб не дублювати backdrop
        // Всередині iframe Bootstrap modal (#liftDetailsModal) сам показує свій backdrop
        const overlay = document.createElement('div');
        overlay.id = 'liftIframeOverlay';
        // z-index 2000: вище за всі Bootstrap modals (1050) та їхні backdrop (1040)
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0', left: '0',
            width: '100%', height: '100%',
            zIndex: '2000',
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            overflowY: 'auto',
            paddingTop: '20px'
        });
        overlay.innerHTML = `<iframe id="liftIframeContent" src="${src}"
            style="width:96vw;max-width:1400px;height:90vh;border:none;display:block;border-radius:8px;background:#fff;"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox">
        </iframe>`;
        // Клік на тьмяний фон (поза iframe) закриває оверлей
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                overlay.remove();
                window.removeEventListener('message', msgHandler);
                document.removeEventListener('keydown', escHandler);
            }
        });
        document.body.appendChild(overlay);

        // Слухаємо postMessage від iframe — коли закрили #liftDetailsModal всередині
        const msgHandler = (e) => {
            if (e.data && e.data.type === 'liftModalClosed') {
                overlay.remove();
                window.removeEventListener('message', msgHandler);
                document.removeEventListener('keydown', escHandler);
            }
        };
        window.addEventListener('message', msgHandler);

        // ESC на батьківській сторінці прибирає оверлей
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                window.removeEventListener('message', msgHandler);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    // Перегляд всіх ліфтів клієнта (перехід на сторінку ліфтів з фільтром)
    viewAllClientLifts(clientId) {
        const role = this.userRole;
        const base = role === 'admin' ? '/pages/admin/lifts.html' : '/pages/dispatcher/lifts.html';
        window.location.href = `${base}?clientId=${clientId}`;
    }

    // A carregar заявок клієнта для модалки
    async loadClientRequestsForModal(clientId) {
        const container = document.getElementById('clientRequestsContainer');
        const badge = document.getElementById('clientRequestsBadge');
        if (!container) return;

        try {
            const response = await fetch(`/api/requests?clientId=${clientId}`, {
                headers: { 'Authorization': `Bearer ${this._getToken()}` }
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

            // Atualizar статистику заявок у модалці
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
                container.innerHTML = `<div class="alert alert-info mb-0"><i class="fas fa-info-circle"></i> Ainda não há pedidos</div>`;
                return;
            }

            const statusMap = {
                'new': { badge: 'info', text: 'Novo' },
                'open': { badge: 'info', text: 'Aberto' },
                'assigned': { badge: 'primary', text: 'Atribuído' },
                'in_progress': { badge: 'warning', text: 'Em curso' },
                'pending': { badge: 'warning', text: 'Pendente' },
                'completed': { badge: 'success', text: 'Concluído' },
                'cancelled': { badge: 'secondary', text: 'Cancelado' }
            };
            const priorityMap = {
                'critical': { badge: 'danger', text: 'Crítico' },
                'high': { badge: 'warning', text: 'Alto' },
                'medium': { badge: 'info', text: 'Médio' },
                'normal': { badge: 'info', text: 'Médio' },
                'low': { badge: 'secondary', text: 'Baixo' }
            };

            container.innerHTML = `
                <div class="list-group">
                    ${requests.slice(0, 10).map(req => {
                        const st = statusMap[req.status] || { badge: 'secondary', text: req.status || 'Desconhecido' };
                        const pr = priorityMap[req.priority] || { badge: 'secondary', text: req.priority || '' };
                        const title = req.title || req.description?.substring(0, 60) || 'Sem título';
                        const date = req.createdAt ? new Date(req.createdAt).toLocaleDateString('pt-PT') : (req.date || '');
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
                ${requests.length > 10 ? `<small class="text-muted mt-1 d-block">A mostrar 10 de ${requests.length} pedidos</small>` : ''}
            `;
        } catch (error) {
            console.error('❌ Erro завантаження заявок:', error);

            // Fallback to in-memory data
            const cid = String(clientId);
            const requests = this.requests.filter(r => String(r.clientId) === cid);
            if (badge) badge.textContent = requests.length;
            if (requests.length === 0) {
                container.innerHTML = `<div class="alert alert-info mb-0"><i class="fas fa-info-circle"></i> Ainda não há pedidos</div>`;
            } else {
                container.innerHTML = `<div class="alert alert-warning mb-0"><i class="fas fa-exclamation-triangle"></i> ${requests.length} pedidos carregados da cache</div>`;
            }
        }
    }

    // Показати модальне вікно додавання клієнта
    showAddClientModal() {
        const titleEl = document.getElementById('clientModalTitle');
        const formEl = document.getElementById('clientForm');
        const idEl = document.getElementById('clientId');
        
        if (titleEl) titleEl.textContent = 'Adicionar Cliente';
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
        
        // ✅ Dispatcher може редагувати клієнтів (практично для роботи)
        if (this.userRole !== 'admin' && this.userRole !== 'dispatcher') {
            alert('❌ Acesso negado! Apenas administradores e despachantes podem editar clientes.');
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
            console.error('❌ Clienteа не знайдено:', clientId);
            alert('Cliente não encontrado');
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
        
        if (titleEl) titleEl.textContent = 'Editar Cliente';
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
            // Закриваємо кастомне вікно перегляду (якщо відкрите) перед відкриттям форми редагування
            const customModal = document.getElementById('customModal');
            if (customModal && $(customModal).hasClass('show')) {
                $(customModal).modal('hide');
                $(customModal).one('hidden.bs.modal', function () {
                    $('#clientModal').modal('show');
                });
            } else {
                $('#clientModal').modal('show');
            }
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

        // Визначаємо firstName/lastName та companyName
        const nameParts = clientData.name.trim().split(/\s+/);
        const apiPayload = {
            companyName: (clientData.type !== 'individual') ? clientData.name : '',
            firstName: nameParts[0] || clientData.name,
            lastName: nameParts.slice(1).join(' ') || '',
            clientType: clientData.type,
            email: clientData.email,
            phone: clientData.phone !== 'Não especificado' ? clientData.phone : '',
            priority: clientData.priority,
            status: clientData.status,
            address: clientData.address !== 'Não especificado' ? clientData.address : '',
            contactPerson: clientData.contactPerson,
            contactPosition: clientData.contactPosition,
            contractInfo: clientData.contractInfo,
            notes: clientData.notes
        };
        
        try {
            if (clientData.id) {
                // Atualização існуючого клієнта
                const response = await fetch(`/api/users/${clientData.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this._getToken()}`
                    },
                    body: JSON.stringify(apiPayload)
                });
                
                if (response.ok) {
                    const respData = await response.json();
                    const updatedUser = respData.data?.user || respData.data || {};
                    // Оновлюємо локальний масив зібраними даними
                    const index = this.clients.findIndex(c =>
                        (c.id && c.id === clientData.id) ||
                        (c._id && c._id === clientData.id)
                    );
                    if (index !== -1) {
                        const merged = {
                            ...this.clients[index],
                            name: clientData.name,
                            type: clientData.type,
                            phone: clientData.phone,
                            status: clientData.status,
                            priority: clientData.priority,
                            address: clientData.address,
                            contactPerson: clientData.contactPerson,
                            contactPosition: clientData.contactPosition,
                            contractInfo: clientData.contractInfo,
                            notes: clientData.notes,
                            companyName: updatedUser.companyName || clientData.name,
                            firstName: updatedUser.firstName || this.clients[index].firstName,
                            lastName: updatedUser.lastName || this.clients[index].lastName,
                        };
                        this.clients[index] = merged;
                    }
                    this.showNotification('Cliente atualizado com sucesso', 'success');
                } else {
                    const errData = await response.json().catch(() => ({}));
                    this.showNotification(errData.message || 'Erro ao guardar cliente', 'error');
                    return;
                }
            } else {
                // Додавання нового клієнта
                const nameParts = (apiPayload.firstName || clientData.name || '').trim().split(/\s+/);
                const postPayload = {
                    email: apiPayload.email,
                    password: Math.random().toString(36).slice(2, 8).toUpperCase() + Math.floor(1000 + Math.random() * 9000) + '!',
                    firstName: apiPayload.firstName || nameParts[0] || 'Cliente',
                    lastName: apiPayload.lastName || nameParts.slice(1).join(' ') || '',
                    role: 'client',
                    phone: apiPayload.phone || '',
                    address: apiPayload.address || '',
                    company: apiPayload.companyName || '',
                    status: 'active'
                };
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this._getToken()}`
                    },
                    body: JSON.stringify(postPayload)
                });
                
                const newClientData = await response.json();
                if (response.ok) {
                    const nc = newClientData.data || newClientData;
                    const newEntry = {
                        id: nc._id || nc.id,
                        _id: nc._id || nc.id,
                        name: clientData.name,
                        firstName: nc.firstName,
                        lastName: nc.lastName,
                        companyName: nc.company || apiPayload.companyName || '',
                        type: clientData.type,
                        email: nc.email,
                        phone: nc.phone || '',
                        status: nc.status || 'active',
                        priority: clientData.priority,
                        address: nc.address || clientData.address || '',
                        contactPerson: clientData.contactPerson || '',
                        contactPosition: clientData.contactPosition || '',
                        contractInfo: clientData.contractInfo || '',
                        notes: clientData.notes || '',
                        totalRequests: 0,
                        activeRequests: 0,
                        requestsCount: 0,
                        liftsCount: 0,
                        avatar: (nc.firstName || clientData.name || 'K').charAt(0).toUpperCase()
                    };
                    this.clients.push(newEntry);
                    this.showNotification(`✅ Cliente criado!\n🔑 Senha temporária: ${postPayload.password}`, 'success');
                } else {
                    this.showNotification(newClientData.error || newClientData.message || 'Erro ao criar cliente', 'error');
                    return;
                }
            }
            
            this.filteredClients = [...this.clients];
            this.renderClients();
            this.updateStats();
            
            $('#clientModal').modal('hide');
        } catch (error) {
            console.error('Erro ao guardar клієнта:', error);
            this.showNotification('Erro ao guardar cliente', 'error');
        }
    }

    // Видалення клієнта
    async deleteClient(clientId) {
        // 🔒 Перевірка ролі користувача
        if (this.userRole === 'dispatcher') {
            alert('❌ Acesso negado! Apenas administradores podem eliminar clientes.');
            return;
        }
        
        if (!confirm('Tem a certeza que pretende eliminar este cliente?')) return;
        
        try {
            const response = await fetch(`/api/users/${clientId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this._getToken()}`
                }
            });
            
            if (response.ok) {
                this.clients = this.clients.filter(c => c.id !== clientId);
                this.filteredClients = this.filteredClients.filter(c => c.id !== clientId);
                this.renderClients();
                this.updateStats();
                this.showNotification('Cliente eliminado com sucesso', 'success');
            }
        } catch (error) {
            console.error('Erro видалення клієнта:', error);
            this.showNotification('Erro ao eliminar cliente', 'error');
        }
    }

    // Enviar повідомлення клієнту
    messageClient(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) return;
        
        const message = prompt(`Escrever mensagem para ${client.name}:`);
        if (message) {
            this.showNotification(`Mensagem enviada para ${client.name}`, 'info');
        }
    }

    // Перегляд заявки
    viewRequest(requestId) {
        const request = this.requests.find(r => r.id === requestId);
        if (request) {
            alert(`Detalhes do pedido #${request.id}\n\nCliente: ${request.clientName}\nTítulo: ${request.title}\nPrioridade: ${request.priority}\nEstado: ${request.status}`);
        }
    }

    // Filtroація клієнтів
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

    // Enviar тимчасовий пароль клієнту
    async sendPasswordToClient(clientId) {
        if (!confirm('Enviar nova senha temporária para o email do cliente?')) return;
        const token = this._getToken();
        try {
            const res = await fetch(`/api/users/${clientId}/reset-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            if (data.success) {
                this.showNotification(`Senha enviada. Senha temporária: ${data.data.temporaryPassword}`, 'success');
            } else {
                this.showNotification(data.message || 'Erro ao enviar senha', 'error');
            }
        } catch (e) {
            this.showNotification('Erro de ligação', 'error');
        }
    }

    // Відправка email клієнту
    sendEmail(clientId) {
        console.log('📧 Відправляємо email клієнту:', clientId);
        
        const client = this.clients.find(c => 
            c.id === clientId || 
            c._id === clientId || 
            c.id == clientId || 
            c._id == clientId
        );
        
        if (!client) {
            console.error('❌ Clienteа не знайдено:', clientId);
            alert('Cliente não encontrado');
            return;
        }
        
        this.showEmailModal(client);
    }

    // Показати модальне вікно для написання email
    showEmailModal(client) {
        const modalContent = `
            <div class="modal-header">
                <h5 class="modal-title">
                    <i class="fas fa-envelope mr-2"></i>
                    Enviar Email - ${client.name}
                </h5>
                <button type="button" class="close" data-dismiss="modal">
                    <span>&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <form id="emailForm">
                    <div class="form-group">
                        <label>Para:</label>
                        <input type="email" class="form-control" value="${client.email}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Assunto:</label>
                        <input type="text" class="form-control" id="emailSubject" placeholder="Introduza o assunto...">
                    </div>
                    <div class="form-group">
                        <label>Mensagem:</label>
                        <textarea class="form-control" id="emailBody" rows="8" placeholder="Introduza o texto da mensagem..."></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" onclick="clientManager.sendClientEmail('${client.email}')">
                    <i class="fas fa-paper-plane mr-2"></i>Enviar
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
            alert('Preencha o assunto e o texto da mensagem');
            return;
        }
        
        try {
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this._getToken()}`
                },
                body: JSON.stringify({
                    to: email,
                    subject: subject,
                    html: `<p>${body.replace(/\n/g, '<br>')}</p>`
                })
            });
            
            if (response.ok) {
                alert('Email enviado com sucesso!');
                $('#customModal').modal('hide');
            } else {
                const error = await response.json();
                alert('Erro ao enviar email: ' + (error.message || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro відправки email:', error);
            alert('Erro ao enviar email: ' + error.message);
        }
    }

    // Pesquisa клієнтів
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

    // Exportar клієнтів
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
        
        this.showNotification('Dados dos clientes exportados', 'success');
    }

    // Показати всі заявки
    showAllRequests() {
        alert('Funcionalidade de visualização de todos os pedidos será implementada na próxima versão');
    }

    // Atualização статистики
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

    // Definições реальних оновлень
    setupRealTimeUpdates() {
        setInterval(() => {
            // Atualização часу останнього оновлення
            const now = new Date();
            const lastUpdateEl = document.getElementById('lastUpdate');
            if (lastUpdateEl) {
                lastUpdateEl.textContent = `Atualizado: ${now.toLocaleTimeString('pt-PT')}`;
            }
        }, 30000);
    }

    // Допоміжні методи
    getPriorityText(priority) {
        switch (priority) {
            case 'high': return 'Alto';
            case 'medium': return 'Médio';
            case 'low': return 'Baixo';
            default: return priority;
        }
    }

    getStatusText(status) {
        switch (status) {
            case 'active': return 'Ativo';
            case 'inactive': return 'Inativo';
            case 'suspended': return 'Suspenso';
            default: return status;
        }
    }

    getTypeText(type) {
        switch (type) {
            case 'business': return 'Empresa';
            case 'individual': return 'Particular';
            case 'government': return 'Entidade Pública';
            default: return type;
        }
    }

    // Показати сповіщення
    showNotifications() {
        alert('Funcionalidade de notificações será implementada na próxima versão');
    }

    // Показати повідомлення
    showMessages() {
        alert('Funcionalidade de mensagens será implementada na próxima versão');
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