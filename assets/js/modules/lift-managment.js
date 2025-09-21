class LiftManagement {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.init();
    }

    init() {
        this.loadLifts();
        this.setupEventListeners();
        this.setupSearch();
        this.setupFilters();
    }

    loadLifts() {
        const lifts = JSON.parse(localStorage.getItem('lifts')) || [];
        this.renderLiftsTable(lifts);
        this.renderPagination(lifts.length);
    }

    renderLiftsTable(lifts) {
        const tableBody = document.getElementById('liftsTable').querySelector('tbody');
        tableBody.innerHTML = '';

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginatedLifts = lifts.slice(start, end);

        paginatedLifts.forEach(lift => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${lift.id}</td>
                <td>${lift.model}</td>
                <td>${this.getLiftTypeLabel(lift.type)}</td>
                <td>${lift.location}</td>
                <td><span class="status-badge status-${lift.status}">${this.getStatusLabel(lift.status)}</span></td>
                <td>${this.formatDate(lift.lastMaintenance)}</td>
                <td>${this.formatDate(lift.nextMaintenance)}</td>
                <td>
                    <button class="btn btn-icon" onclick="liftManager.editLift('${lift.id}')">✏️</button>
                    <button class="btn btn-icon" onclick="liftManager.deleteLift('${lift.id}')">🗑️</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    getLiftTypeLabel(type) {
        const types = {
            'passenger': 'Пасажирський',
            'cargo': 'Вантажний',
            'hospital': 'Лікарняний'
        };
        return types[type] || type;
    }

    getStatusLabel(status) {
        const statuses = {
            'active': 'Активний',
            'maintenance': 'Обслуговування',
            'inactive': 'Неактивний'
        };
        return statuses[status] || status;
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('uk-UA');
    }

    setupEventListeners() {
        document.getElementById('addLiftBtn').addEventListener('click', () => this.openModal());
        document.getElementById('liftForm').addEventListener('submit', (e) => this.saveLift(e));
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
    }

    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => {
            this.searchLifts(e.target.value);
        });
    }

    setupFilters() {
        const statusFilter = document.getElementById('statusFilter');
        const typeFilter = document.getElementById('typeFilter');

        [statusFilter, typeFilter].forEach(filter => {
            filter.addEventListener('change', () => {
                this.applyFilters();
            });
        });
    }

    searchLifts(query) {
        const lifts = JSON.parse(localStorage.getItem('lifts')) || [];
        const filteredLifts = lifts.filter(lift => 
            lift.model.toLowerCase().includes(query.toLowerCase()) ||
            lift.location.toLowerCase().includes(query.toLowerCase()) ||
            lift.id.toLowerCase().includes(query.toLowerCase())
        );
        this.renderLiftsTable(filteredLifts);
        this.renderPagination(filteredLifts.length);
    }

    applyFilters() {
        const statusFilter = document.getElementById('statusFilter').value;
        const typeFilter = document.getElementById('typeFilter').value;
        const lifts = JSON.parse(localStorage.getItem('lifts')) || [];

        const filteredLifts = lifts.filter(lift => {
            const statusMatch = statusFilter === 'all' || lift.status === statusFilter;
            const typeMatch = typeFilter === 'all' || lift.type === typeFilter;
            return statusMatch && typeMatch;
        });

        this.renderLiftsTable(filteredLifts);
        this.renderPagination(filteredLifts.length);
    }

    openModal(lift = null) {
        const modal = document.getElementById('liftModal');
        const title = document.getElementById('modalTitle');
        
        if (lift) {
            title.textContent = 'Редагувати ліфт';
            this.fillForm(lift);
        } else {
            title.textContent = 'Додати ліфт';
            this.resetForm();
        }
        
        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('liftModal').style.display = 'none';
    }

    fillForm(lift) {
        document.getElementById('liftId').value = lift.id;
        document.getElementById('liftModel').value = lift.model;
        document.getElementById('liftType').value = lift.type;
        document.getElementById('liftLocation').value = lift.location;
        document.getElementById('liftStatus').value = lift.status;
        document.getElementById('lastMaintenance').value = lift.lastMaintenance;
        document.getElementById('nextMaintenance').value = lift.nextMaintenance;
    }

    resetForm() {
        document.getElementById('liftForm').reset();
        document.getElementById('liftId').value = '';
    }

    async saveLift(e) {
        e.preventDefault();
        
        const lift = {
            id: document.getElementById('liftId').value || this.generateId(),
            model: document.getElementById('liftModel').value,
            type: document.getElementById('liftType').value,
            location: document.getElementById('liftLocation').value,
            status: document.getElementById('liftStatus').value,
            lastMaintenance: document.getElementById('lastMaintenance').value,
            nextMaintenance: document.getElementById('nextMaintenance').value,
            createdAt: new Date().toISOString()
        };

        const lifts = JSON.parse(localStorage.getItem('lifts')) || [];
        const existingIndex = lifts.findIndex(l => l.id === lift.id);

        if (existingIndex >= 0) {
            lifts[existingIndex] = lift;
        } else {
            lifts.push(lift);
        }

        localStorage.setItem('lifts', JSON.stringify(lifts));
        
        this.closeModal();
        this.loadLifts();
        this.showNotification('Ліфт успішно збережено', 'success');
    }

    editLift(id) {
        const lifts = JSON.parse(localStorage.getItem('lifts')) || [];
        const lift = lifts.find(l => l.id === id);
        if (lift) {
            this.openModal(lift);
        }
    }

    deleteLift(id) {
        if (confirm('Ви впевнені, що хочете видалити цей ліфт?')) {
            const lifts = JSON.parse(localStorage.getItem('lifts')) || [];
            const filteredLifts = lifts.filter(lift => lift.id !== id);
            localStorage.setItem('lifts', JSON.stringify(filteredLifts));
            this.loadLifts();
            this.showNotification('Ліфт успішно видалено', 'success');
        }
    }

    generateId() {
        return 'LFT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    renderPagination(totalItems) {
        const pagination = document.getElementById('pagination');
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let html = '';
        
        // Попередня сторінка
        html += `<button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
                  onclick="liftManager.changePage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>
                  ←</button>`;
        
        // Номери сторінок
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="page-btn ${this.currentPage === i ? 'active' : ''}" 
                      onclick="liftManager.changePage(${i})">${i}</button>`;
        }
        
        // Наступна сторінка
        html += `<button class="page-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
                  onclick="liftManager.changePage(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>
                  →</button>`;
        
        pagination.innerHTML = html;
    }

    changePage(page) {
        const lifts = JSON.parse(localStorage.getItem('lifts')) || [];
        const totalPages = Math.ceil(lifts.length / this.itemsPerPage);
        
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.loadLifts();
        }
    }

    showNotification(message, type = 'info') {
        // Реалізація сповіщення
        alert(message);
    }
}

// Ініціалізація менеджера ліфтів
const liftManager = new LiftManagement();