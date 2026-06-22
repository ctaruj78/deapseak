class ClientManager {
    constructor() {
        this.clients = [];
        this.filteredClients = [];
        this.requests = [];
        this.currentClient = null;

        const userData = this._getUserData();
        this.userRole = userData.role || 'dispatcher';

        this.init();
    }

    init() {
        this.loadClients();
        this.loadClientRequests();
        this.setupRealTimeUpdates();
    }

    _getUserData() {
        try {
            return JSON.parse(localStorage.getItem('userData') || '{}') || {};
        } catch {
            return {};
        }
    }

    _getToken() {
        return (typeof AuthManager !== 'undefined' && AuthManager.getAuthToken && AuthManager.getAuthToken())
            || localStorage.getItem('liftmanager_jwt')
            || localStorage.getItem('token')
            || sessionStorage.getItem('liftmanager_jwt')
            || localStorage.getItem('authToken')
            || '';
    }

    _authHeaders(json = false) {
        const headers = {};
        const token = this._getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
        if (json) headers['Content-Type'] = 'application/json';
        return headers;
    }

    async loadClients() {
        try {
            const response = await fetch('/api/clients', { headers: this._authHeaders() });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const result = await response.json();
            const rawClients = Array.isArray(result) ? result : (result.data || []);
            const liftsCountByClient = await this._loadLiftCountsByClient();

            this.clients = rawClients.map(client => ({
                id: client._id || client.id,
                name: client.name || `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.username || 'Desconhecido',
                type: client.clientType || client.type || 'business',
                email: client.email || '',
                phone: client.phone || '',
                status: client.status || 'active',
                priority: client.priority || 'medium',
                address: client.address || '',
                contactPerson: client.contactPerson || `${client.firstName || ''} ${client.lastName || ''}`.trim(),
                contactPosition: client.contactPosition || '',
                contractInfo: client.contractInfo || client.contractNumber || '—',
                rating: client.rating ?? null,
                totalRequests: client.totalRequests ?? client.requestsCount ?? 0,
                activeRequests: client.activeRequests ?? 0,
                liftsCount: this._resolveClientLiftCount(client, liftsCountByClient),
                avatarUrl: (client.avatar && (client.avatar.startsWith('/') || client.avatar.startsWith('http'))) ? client.avatar : null,
                avatar: (client.avatar && !client.avatar.startsWith('/') && !client.avatar.startsWith('http')) ? client.avatar : (client.name ? client.name.charAt(0).toUpperCase() : 'C'),
                notes: client.notes || ''
            }));

            this.filteredClients = [...this.clients];
            this.renderClients();
            this.renderClientsTable();
            this.updateStats();
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            this.clients = [];
            this.filteredClients = [];
            this.renderClients();
            this.renderClientsTable();
            this.updateStats();
        }
    }

    async _loadLiftCountsByClient() {
        try {
            const response = await fetch('/api/lifts?limit=5000', { headers: this._authHeaders() });
            if (!response.ok) return new Map();

            const payload = await response.json();
            const lifts = Array.isArray(payload?.data)
                ? payload.data
                : (Array.isArray(payload?.data?.lifts) ? payload.data.lifts : []);

            const counts = new Map();
            const add = (key) => {
                if (!key) return;
                const normalized = String(key).trim().toLowerCase();
                if (!normalized) return;
                counts.set(normalized, (counts.get(normalized) || 0) + 1);
            };

            lifts.forEach(lift => {
                add(lift.client?._id || lift.client || lift.clientId);
                add(lift.clientEmail || lift.client?.email);
                add(lift.clientPhone || lift.client?.phone);
            });

            return counts;
        } catch (error) {
            console.warn('Não foi possível carregar contagem de elevadores por cliente:', error);
            return new Map();
        }
    }

    _resolveClientLiftCount(client, countsMap) {
        const explicit = client.liftsCount ?? client.lifts?.length;
        if (Number.isFinite(explicit)) return explicit;

        const keys = [
            client._id,
            client.id,
            client.email,
            client.phone
        ].filter(Boolean).map(value => String(value).trim().toLowerCase());

        for (const key of keys) {
            if (countsMap.has(key)) return countsMap.get(key);
        }

        return 0;
    }

    async loadClientRequests() {
        try {
            const response = await fetch('/api/requests?limit=20', { headers: this._authHeaders() });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const result = await response.json();
            const rawRequests = Array.isArray(result) ? result : (result.data?.requests || result.data || []);

            this.requests = rawRequests.map(req => ({
                id: req._id || req.id,
                clientName: req.client?.name || req.clientName || req.client?.companyName || 'Desconhecido',
                title: req.title || req.description || 'Sem título',
                priority: req.priority || 'medium',
                status: req.status || 'new',
                date: req.createdAt ? new Date(req.createdAt).toLocaleString('pt-PT') : (req.date || '—')
            }));

            this.renderRecentRequests();
        } catch (error) {
            console.error('Erro ao carregar pedidos:', error);
            this.requests = [];
            this.renderRecentRequests();
        }
    }

    renderClients() {
        const grid = document.getElementById('clientsGrid');
        if (!grid) return;
        grid.innerHTML = '';

        if (!this.filteredClients.length) {
            grid.innerHTML = `
                <div class="col-12 text-center py-5 text-muted">
                    <i class="fas fa-users fa-3x mb-3"></i>
                    <h4>Nenhum cliente encontrado</h4>
                    <p>Sem dados reais disponíveis neste momento.</p>
                </div>
            `;
            return;
        }

        this.filteredClients.forEach(client => grid.appendChild(this.createClientCard(client)));
    }

    createClientCard(client) {
        const col = document.createElement('div');
        col.className = 'col-lg-4 col-md-6 mb-4';

        const statusClass = client.status === 'active' ? 'badge-success' : client.status === 'suspended' ? 'badge-warning' : 'badge-secondary';
        const statusText = client.status === 'active' ? 'Ativo' : client.status === 'suspended' ? 'Suspenso' : 'Inativo';
        const typeText = { business: 'Empresa', individual: 'Particular', government: 'Público' }[client.type] || client.type;

        col.innerHTML = `
            <div class="client-card">
                <span class="status-badge ${statusClass}">${statusText}</span>
                <div class="client-avatar">${client.avatarUrl ? `<img src="${client.avatarUrl}" alt="${client.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : (client.avatar || 'C')}</div>
                <h5 class="text-center">${client.name}</h5>
                <p class="text-center text-muted mb-2">${typeText}</p>
                <div class="text-center mb-3">
                    <span class="contract-badge">${(client.contractInfo || '—').split(' ')[0]}</span>
                </div>
                <div class="row text-center mb-3">
                    <div class="col-4">
                        <div class="text-success font-weight-bold">${client.liftsCount || 0}</div>
                        <small class="text-muted">Elevadores</small>
                    </div>
                    <div class="col-4">
                        <div class="text-primary font-weight-bold">${client.totalRequests || 0}</div>
                        <small class="text-muted">Pedidos</small>
                    </div>
                    <div class="col-4">
                        <div class="text-warning font-weight-bold">${client.rating != null ? client.rating : '—'}</div>
                        <small class="text-muted">Avaliação</small>
                    </div>
                </div>
                <div class="action-buttons mt-3">
                    <button class="btn btn-sm btn-primary" onclick="clientManager.viewClient('${client.id}')"><i class="fas fa-eye"></i> Ver</button>
                    ${client.liftsCount > 0 ? `<button class="btn btn-sm btn-success" onclick="clientManager.viewAllClientLifts('${client.id}')"><i class="fas fa-elevator"></i> Elevadores</button>` : ''}
                    <button class="btn btn-sm btn-info" onclick="window.location.href='tel:${client.phone || ''}'"><i class="fas fa-phone"></i></button>
                    ${(this.userRole === 'admin' || this.userRole === 'dispatcher') ? `<button class="btn btn-sm btn-warning" onclick="clientManager.editClient('${client.id}')"><i class="fas fa-edit"></i></button>` : ''}
                </div>
            </div>
        `;
        return col;
    }

    renderClientsTable() {
        const tbody = document.getElementById('clientsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!this.filteredClients.length) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">Sem clientes para mostrar</td></tr>`;
            return;
        }

        this.filteredClients.forEach(client => {
            const statusText = client.status === 'active' ? 'Ativo' : client.status === 'suspended' ? 'Suspenso' : 'Inativo';
            const statusClass = client.status === 'active' ? 'badge-success' : client.status === 'suspended' ? 'badge-warning' : 'badge-secondary';
            const typeText = { business: 'Empresa', individual: 'Particular', government: 'Público' }[client.type] || client.type;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="badge badge-secondary">#${String(client.id).slice(-4).toUpperCase()}</span></td>
                <td><strong>${client.name}</strong><br><small class="text-muted">${client.email || ''}</small></td>
                <td>${typeText}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>${this.getPriorityText(client.priority)}</td>
                <td><span class="font-weight-bold">${client.totalRequests || 0}</span> <small class="text-muted">(${client.activeRequests || 0} ativos)</small></td>
                <td><span class="text-warning"><i class="fas fa-star"></i> ${client.rating != null ? client.rating : '—'}</span></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-info" onclick="clientManager.viewClient('${client.id}')" title="Ver"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-success" onclick="clientManager.sendEmail('${client.id}')" title="Email"><i class="fas fa-envelope"></i></button>
                        ${(this.userRole === 'admin' || this.userRole === 'dispatcher') ? `<button class="btn btn-warning" onclick="clientManager.editClient('${client.id}')" title="Editar"><i class="fas fa-edit"></i></button>` : ''}
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    renderRecentRequests() {
        const tbody = document.getElementById('recentRequests');
        if (!tbody) return;
        tbody.innerHTML = '';

        const requests = this.requests.slice(0, 10);
        if (!requests.length) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Sem pedidos recentes</td></tr>`;
            return;
        }

        requests.forEach(req => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${req.id ? String(req.id).slice(-6).toUpperCase() : '—'}</td>
                <td>${req.clientName || '—'}</td>
                <td>${req.title || '—'}</td>
                <td>${this.getPriorityText(req.priority)}</td>
                <td><span class="badge badge-${this.getStatusBadgeClass(req.status)}">${this.getStatusText(req.status)}</span></td>
                <td>${req.date || '—'}</td>
                <td><button class="btn btn-sm btn-outline-primary" onclick="clientManager.showRequestDetails('${req.id || ''}')"><i class="fas fa-eye"></i></button></td>
            `;
            tbody.appendChild(tr);
        });
    }

    filterClients() {
        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        const typeFilter = document.getElementById('typeFilter')?.value || 'all';
        const priorityFilter = document.getElementById('priorityFilter')?.value || 'all';

        this.filteredClients = this.clients.filter(client => {
            return (statusFilter === 'all' || client.status === statusFilter)
                && (typeFilter === 'all' || client.type === typeFilter)
                && (priorityFilter === 'all' || client.priority === priorityFilter);
        });

        this.renderClients();
        this.renderClientsTable();
        this.updateStats();
    }

    searchClients() {
        const term = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
        if (!term) return this.filterClients();

        this.filteredClients = this.clients.filter(client => {
            const haystack = [client.name, client.email, client.phone, client.address, client.contactPerson, client.contractInfo].join(' ').toLowerCase();
            return haystack.includes(term);
        });

        this.renderClients();
        this.renderClientsTable();
        this.updateStats();
    }

    showAddClientModal() {
        this.currentClient = null;
        const form = document.getElementById('clientForm');
        if (form) form.reset();
        const title = document.getElementById('clientModalTitle');
        if (title) title.textContent = 'Adicionar cliente';
        $('#clientModal').modal('show');
    }

    async saveClient() {
        const form = document.getElementById('clientForm');
        if (!form || !form.checkValidity()) {
            form?.reportValidity();
            return;
        }

        const payload = {
            name: document.getElementById('clientName').value.trim(),
            clientType: document.getElementById('clientType').value,
            type: document.getElementById('clientType').value,
            email: document.getElementById('clientEmail').value.trim(),
            phone: document.getElementById('clientPhone').value.trim(),
            priority: document.getElementById('clientPriority').value,
            status: document.getElementById('clientStatus').value,
            address: document.getElementById('clientAddress').value.trim(),
            contactPerson: document.getElementById('contactPerson').value.trim(),
            contactPosition: document.getElementById('contactPosition').value.trim(),
            contractInfo: document.getElementById('contractInfo').value.trim(),
            notes: document.getElementById('clientNotes').value.trim()
        };

        try {
            const isEdit = !!document.getElementById('clientId').value;
            const url = isEdit ? `/api/clients/${document.getElementById('clientId').value}` : '/api/clients';
            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: this._authHeaders(true),
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok || result.success === false) throw new Error(result.message || `HTTP ${response.status}`);

            await this.loadClients();
            $('#clientModal').modal('hide');
            this.showNotification(isEdit ? 'Cliente actualizado com sucesso' : 'Cliente criado com sucesso', 'success');
        } catch (error) {
            console.error('Erro ao guardar cliente:', error);
            this.showNotification(error.message || 'Erro ao guardar cliente', 'error');
        }
    }

    loadClientToForm(client) {
        if (!client) return;
        this.currentClient = client;
        const setVal = (id, value) => { const el = document.getElementById(id); if (el) el.value = value ?? ''; };
        const title = document.getElementById('clientModalTitle');
        if (title) title.textContent = 'Editar cliente';
        setVal('clientId', client.id || '');
        setVal('clientName', client.name || '');
        setVal('clientType', client.type || 'business');
        setVal('clientEmail', client.email || '');
        setVal('clientPhone', client.phone || '');
        setVal('clientPriority', client.priority || 'medium');
        setVal('clientStatus', client.status || 'active');
        setVal('clientAddress', client.address || '');
        setVal('contactPerson', client.contactPerson || '');
        setVal('contactPosition', client.contactPosition || '');
        setVal('contractInfo', client.contractInfo || '');
        setVal('clientNotes', client.notes || '');
        $('#clientModal').modal('show');
    }

    viewClient(clientId) {
        const client = this.clients.find(c => String(c.id) === String(clientId));
        if (!client) return;
        this.loadClientToForm(client);
    }

    editClient(clientId) {
        this.viewClient(clientId);
    }

    async deleteClient(clientId) {
        this.showNotification('A eliminação direta não está disponível nesta versão.', 'info');
    }

    sendEmail(clientId) {
        const client = this.clients.find(c => String(c.id) === String(clientId));
        if (!client) return;
        window.location.href = `mailto:${client.email || ''}`;
    }

    viewAllClientLifts(clientId) {
        const client = this.clients.find(c => String(c.id) === String(clientId));
        if (!client) return;
        const params = new URLSearchParams();
        params.set('clientId', String(client.id));
        if (client.name) params.set('client', client.name);
        window.location.href = `/pages/dispatcher/lifts.html?${params.toString()}`;
    }

    showRequestDetails(requestId) {
        const req = this.requests.find(r => String(r.id) === String(requestId));
        if (req) toastr.info(`${req.clientName}\n${req.title}`);
    }

    showAllRequests() {
        this.showNotification('Use a página de pedidos para ver todos os pedidos.', 'info');
    }

    exportClients() {
        const data = JSON.stringify(this.filteredClients, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clients_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    getPriorityText(priority) {
        return { high: 'Alta', medium: 'Média', low: 'Baixa' }[priority] || 'Média';
    }

    getStatusText(status) {
        return {
            new: 'Novo',
            assigned: 'Atribuído',
            'in-progress': 'Em progresso',
            completed: 'Concluído',
            active: 'Ativo',
            inactive: 'Inativo',
            suspended: 'Suspenso'
        }[status] || status;
    }

    getStatusBadgeClass(status) {
        return {
            new: 'primary',
            assigned: 'info',
            'in-progress': 'warning',
            completed: 'success',
            active: 'success',
            inactive: 'secondary',
            suspended: 'warning'
        }[status] || 'secondary';
    }

    updateStats() {
        const totalClients = this.clients.length;
        const activeClients = this.clients.filter(c => c.status === 'active').length;
        const totalRequests = this.clients.reduce((sum, c) => sum + (c.totalRequests || 0), 0);
        const rated = this.clients.filter(c => c.rating != null);
        const avgRating = rated.length ? (rated.reduce((sum, c) => sum + Number(c.rating || 0), 0) / rated.length).toFixed(1) : '0.0';

        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        setText('totalClients', totalClients);
        setText('activeClients', activeClients);
        setText('totalRequests', totalRequests);
        setText('avgRating', avgRating);
        setText('shownClients', this.filteredClients.length);
        setText('totalClientsCount', totalClients);
    }

    setupRealTimeUpdates() {
        setInterval(() => this.updateStats(), 60000);
    }

    showNotification(message, type = 'info') {
        if (typeof toastr !== 'undefined' && toastr[type]) toastr[type](message);
        else toastr.info(message);
    }

    showNotifications() { this.showNotification('Funcionalidade de notificações em breve.', 'info'); }
    showMessages() { this.showNotification('Funcionalidade de mensagens em breve.', 'info'); }
}

window.ClientManager = ClientManager;
