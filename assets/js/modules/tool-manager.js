// tool-manager.js - МЕНЕДЖЕР ІНСТРУМЕНТІВ ДЛЯ ТЕХНІКА
class ToolManager {
    constructor() {
        this.tools = [];
        this.filters = {
            status: 'all',
            category: 'all',
            location: 'all'
        };
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.init();
    }

    init() {
        this.loadTools();
        this.loadUserInfo();
        this.setupEventListeners();
        this.updateStatistics();
        this.checkLowStock();
    }

    async loadTools() {
        try {
            // Спроба отримати дані з API
            const response = await fetch('../api/tools', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                this.tools = await response.json();
                localStorage.setItem('tools', JSON.stringify(this.tools));
            } else {
                throw new Error('API недоступне');
            }
        } catch (error) {
            // logger.warn('Використання локальних даних:', error);
            this.tools = JSON.parse(localStorage.getItem('tools')) || [];
            
            if (this.tools.length === 0) {
                this.tools = this.createSampleTools();
                localStorage.setItem('tools', JSON.stringify(this.tools));
            }
        }

        this.applyFilters();
    }

    createSampleTools() {
        return [
            {
                id: 'TOOL-001',
                name: 'Гайковий ключ наборний',
                category: 'mechanical',
                status: 'available',
                location: 'van',
                image: 'wrench_set.jpg',
                manufacturer: 'Stanley',
                model: 'STMT73798',
                serialNumber: 'SN2024-001',
                purchaseDate: '2024-01-15',
                lastInspection: '2024-06-01',
                nextInspection: '2024-12-01',
                quantity: 3,
                minQuantity: 2,
                condition: 'excellent',
                notes: 'Повний комплект, стан відмінний',
                maintenanceHistory: [
                    {
                        date: '2024-06-01',
                        type: 'regular',
                        technician: 'Іван Петренко',
                        notes: 'Профілактичний огляд, мащення механізму'
                    }
                ]
            },
            {
                id: 'TOOL-002',
                name: 'Мультиметр цифровий',
                category: 'electrical',
                status: 'in-use',
                location: 'site',
                currentUser: 'Марія Коваленко',
                checkoutDate: '2024-06-15',
                expectedReturn: '2024-06-17',
                image: 'multimeter.jpg',
                manufacturer: 'Fluke',
                model: '117',
                serialNumber: 'SN2024-002',
                purchaseDate: '2024-02-20',
                lastInspection: '2024-05-15',
                nextInspection: '2024-11-15',
                quantity: 1,
                minQuantity: 1,
                condition: 'good',
                notes: 'Точні вимірювання, калібрований'
            },
            {
                id: 'TOOL-003',
                name: 'Динамометричний ключ',
                category: 'mechanical',
                status: 'maintenance',
                location: 'warehouse',
                image: 'torque_wrench.jpg',
                manufacturer: 'CDI',
                model: '2402MFRPH',
                serialNumber: 'SN2024-003',
                purchaseDate: '2024-03-10',
                lastInspection: '2024-04-20',
                nextInspection: '2024-10-20',
                quantity: 2,
                minQuantity: 1,
                condition: 'maintenance',
                notes: 'Потребує калібрування',
                maintenanceHistory: [
                    {
                        date: '2024-06-10',
                        type: 'repair',
                        technician: 'Петро Сидоренко',
                        notes: 'Калібрування точності вимірювань'
                    }
                ]
            },
            {
                id: 'TOOL-004',
                name: 'Детектор напруги',
                category: 'safety',
                status: 'available',
                location: 'van',
                image: 'voltage_detector.jpg',
                manufacturer: 'Klein Tools',
                model: 'NCVT-3',
                serialNumber: 'SN2024-004',
                purchaseDate: '2024-04-05',
                lastInspection: '2024-05-25',
                nextInspection: '2024-11-25',
                quantity: 2,
                minQuantity: 2,
                condition: 'excellent',
                notes: 'Новий, з автоматичним відключенням'
            },
            {
                id: 'TOOL-005',
                name: 'Лазерний далекомір',
                category: 'measuring',
                status: 'broken',
                location: 'warehouse',
                image: 'laser_measure.jpg',
                manufacturer: 'Bosch',
                model: 'GLM 50 C',
                serialNumber: 'SN2024-005',
                purchaseDate: '2024-01-30',
                lastInspection: '2024-05-10',
                nextInspection: '2024-11-10',
                quantity: 1,
                minQuantity: 1,
                condition: 'broken',
                notes: 'Не відображає результати вимірювань',
                maintenanceHistory: [
                    {
                        date: '2024-06-05',
                        type: 'diagnostic',
                        technician: 'Іван Петренко',
                        notes: 'Діагностика дисплея - потребує заміни'
                    }
                ]
            }
        ];
    }

    setupEventListeners() {
        $('#statusFilter').on('change', (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        });

        $('#categoryFilter').on('change', (e) => {
            this.filters.category = e.target.value;
            this.applyFilters();
        });

        $('#locationFilter').on('change', (e) => {
            this.filters.location = e.target.value;
            this.applyFilters();
        });

        // Пошук
        $('#searchInput').on('input', (e) => {
            this.searchTools(e.target.value);
        });

        // Події для модальних вікон
        $('#viewToolModal').on('show.bs.modal', (event) => {
            const button = $(event.relatedTarget);
            const toolId = button.data('tool-id');
            this.showToolDetails(toolId);
        });

        $('#checkoutToolModal').on('show.bs.modal', (event) => {
            const button = $(event.relatedTarget);
            const toolId = button.data('tool-id');
            this.prepareCheckoutForm(toolId);
        });
    }

    applyFilters() {
        let filteredTools = [...this.tools];

        // Фільтрація за статусом
        if (this.filters.status !== 'all') {
            filteredTools = filteredTools.filter(tool => 
                tool.status === this.filters.status
            );
        }

        // Фільтрація за категорією
        if (this.filters.category !== 'all') {
            filteredTools = filteredTools.filter(tool => 
                tool.category === this.filters.category
            );
        }

        // Фільтрація за локацією
        if (this.filters.location !== 'all') {
            filteredTools = filteredTools.filter(tool => 
                tool.location === this.filters.location
            );
        }

        const searchTerm = $('#searchInput').val().toLowerCase();
        filteredTools = filteredTools.filter(tool => {
            const matchesStatus = this.filters.status === 'all' || tool.status === this.filters.status;
            const matchesCategory = this.filters.category === 'all' || tool.category === this.filters.category;
            const matchesLocation = this.filters.location === 'all' || tool.location === this.filters.location;
            const matchesSearch = !searchTerm ||
                tool.name.toLowerCase().includes(searchTerm) ||
                tool.id.toLowerCase().includes(searchTerm) ||
                (tool.manufacturer && tool.manufacturer.toLowerCase().includes(searchTerm));

            return matchesStatus && matchesCategory && matchesLocation && matchesSearch;
        });

        this.renderTools(filteredTools);
        this.updateStats(filteredTools);
        this.updatePagination(filteredTools);
    }

    resetFilters() {
        this.filters = { status: 'all', category: 'all', location: 'all' };
        $('#statusFilter').val('all');
        $('#categoryFilter').val('all');
        $('#locationFilter').val('all');
        $('#searchInput').val('');
        this.currentPage = 1;
        this.applyFilters();
    }

    searchTools(query) {
        if (!query.trim()) {
            this.applyFilters();
            return;
        }

        const filteredTools = this.tools.filter(tool =>
            tool.name.toLowerCase().includes(query.toLowerCase()) ||
            tool.id.toLowerCase().includes(query.toLowerCase()) ||
            tool.manufacturer.toLowerCase().includes(query.toLowerCase()) ||
            tool.model.toLowerCase().includes(query.toLowerCase()) ||
            (tool.serialNumber && tool.serialNumber.toLowerCase().includes(query.toLowerCase()))
        );

        this.renderTools(filteredTools);
        this.updateStats(filteredTools);
    }

    renderTools(tools) {
        const tbody = $('#toolsTableBody');
        tbody.empty();

        if (tools.length === 0) {
            tbody.html(`
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <h4>Інструментів не знайдено</h4>
                        <p>Спробуйте змінити параметри фільтрів</p>
                    </td>
                </tr>
            `);
            return;
        }

        // Пагінація
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const paginatedTools = tools.slice(startIndex, startIndex + this.itemsPerPage);

        paginatedTools.forEach(tool => {
            const row = this.createToolRow(tool);
            tbody.append(row);
        });

        $('#itemsShown').text(paginatedTools.length);
        $('#totalItems').text(tools.length);
    }

    createToolRow(tool) {
        const statusClass = `status-${tool.status}`;
        const categoryClass = `category-${tool.category}`;
        const statusText = this.getStatusText(tool.status);
        const categoryText = this.getCategoryText(tool.category);
        const locationText = this.getLocationText(tool.location);
        
        return $(`
            <tr>
                <td>
                    <img src="../assets/img/tools/${tool.image}" 
                         class="tool-image" 
                         alt="${tool.name}"
                         onerror="this.src='../assets/img/tools/default.jpg'">
                </td>
                <td>
                    <strong>${tool.name}</strong><br>
                    <small class="text-muted">${tool.id}</small>
                </td>
                <td><span class="category-badge ${categoryClass}">${categoryText}</span></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${locationText}</td>
                <td>${this.formatDate(tool.lastInspection)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-info btn-icon" onclick="toolManager.viewTool('${tool.id}')" title="Перегляд">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary btn-icon" onclick="toolManager.printToolLabel('${tool.id}')" title="Друк ярлика">
                            <i class="fas fa-print"></i>
                        </button>
                        ${tool.status === 'available' ? 
                            `<button class="btn btn-sm btn-success btn-icon" onclick="toolManager.checkoutTool('${tool.id}')" title="Видати">
                                <i class="fas fa-sign-out-alt"></i>
                            </button>` : ''}
                        ${tool.status === 'in-use' ? 
                            `<button class="btn btn-sm btn-warning btn-icon" onclick="toolManager.returnTool('${tool.id}')" title="Повернути">
                                <i class="fas fa-sign-in-alt"></i>
                            </button>` : ''}
                    </div>
                </td>
            </tr>
        `);
    }

    getStatusText(status) {
        const statuses = {
            'available': 'Доступний',
            'in-use': 'Використовується',
            'maintenance': 'Обслуговування',
            'broken': 'Несправний'
        };
        return statuses[status] || status;
    }

    getCategoryText(category) {
        const categories = {
            'mechanical': 'Механічний',
            'electrical': 'Електричний',
            'safety': 'Безпека',
            'measuring': 'Вимірювальний'
        };
        return categories[category] || category;
    }

    getLocationText(location) {
        const locations = {
            'van': 'Автомобіль',
            'warehouse': 'Склад',
            'site': 'На об\'єкті'
        };
        return locations[location] || location;
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('uk-UA');
    }

    updateStats(tools = this.tools) {
        $('#totalTools').text(tools.length);
        $('#toolsBadge').text(tools.filter(t => t.status === 'in-use' || t.status === 'maintenance').length);
        
        const available = tools.filter(t => t.status === 'available').length;
        $('#availableTools').text(available);

        const inUse = tools.filter(t => t.status === 'in-use').length;
        $('#inUseTools').text(inUse);

        const maintenance = tools.filter(t => t.status === 'maintenance' || t.status === 'broken').length;
        $('#maintenanceTools').text(maintenance);
    }

    updatePagination(tools) {
        const totalPages = Math.ceil(tools.length / this.itemsPerPage);
        $('#totalPages').text(totalPages);
        $('#currentPage').text(this.currentPage);

        // Оновлення стану кнопок пагінації
        $('.page-item').removeClass('disabled');
        if (this.currentPage === 1) {
            $('.page-item:first-child').addClass('disabled');
        }
        if (this.currentPage === totalPages) {
            $('.page-item:last-child').addClass('disabled');
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.applyFilters();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.getFilteredTools().length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.applyFilters();
        }
    }

    getFilteredTools() {
        let filteredTools = [...this.tools];

        if (this.filters.status !== 'all') {
            filteredTools = filteredTools.filter(tool => 
                tool.status === this.filters.status
            );
        }

        if (this.filters.category !== 'all') {
            filteredTools = filteredTools.filter(tool => 
                tool.category === this.filters.category
            );
        }

        if (this.filters.location !== 'all') {
            filteredTools = filteredTools.filter(tool => 
                tool.location === this.filters.location
            );
        }

        const searchTerm = $('#searchInput').val().toLowerCase();
        filteredTools = filteredTools.filter(tool => {
            const matchesStatus = this.filters.status === 'all' || tool.status === this.filters.status;
            const matchesCategory = this.filters.category === 'all' || tool.category === this.filters.category;
            const matchesLocation = this.filters.location === 'all' || tool.location === this.filters.location;
            const matchesSearch = !searchTerm ||
                tool.name.toLowerCase().includes(searchTerm) ||
                tool.id.toLowerCase().includes(searchTerm) ||
                (tool.manufacturer && tool.manufacturer.toLowerCase().includes(searchTerm));

            return matchesStatus && matchesCategory && matchesLocation && matchesSearch;
        });

        return filteredTools;
    }

    checkLowStock() {
        const lowStockTools = this.tools.filter(tool => tool.quantity <= tool.minQuantity);

        const container = $('#lowStockTools');
        container.empty();

        if (lowStockTools.length === 0) {
            container.html('<p class="text-muted text-center">Всі інструменти в достатній кількості</p>');
            return;
        }

        lowStockTools.forEach(tool => {
            const alertHtml = `
                <div class="col-md-6">
                    <div class="low-stock-alert">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <div class="tool-name">${tool.name}</div>
                                <div class="stock-info">
                                    В наявності: ${tool.quantity} од. | Мінімум: ${tool.minQuantity} од.
                                </div>
                            </div>
                            <button class="btn btn-sm btn-primary" onclick="toolManager.orderTool('${tool.id}')">
                                <i class="fas fa-plus"></i> Замовити
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.append(alertHtml);
        });
    }

    scanTool() {
        $('#scanToolModal').modal('show');
        // Тут буде реалізація QR сканування
        this.showNotification('Функція QR сканування в розробці', 'info');
    }

    saveTools() {
        localStorage.setItem('tools', JSON.stringify(this.tools));
    }

    // Нові методи для HTML інтерфейсу
    loadUserInfo() {
        const user = JSON.parse(localStorage.getItem('currentUser')) || { name: 'Технік' };
        $('#userName').text(user.name || 'Технік');
    }

    updateStatistics() {
        const stats = this.getStats();
        $('#totalTools').text(stats.total);
        $('#availableTools').text(stats.available);
        $('#inUseTools').text(stats.inUse);
        $('#maintenanceTools').text(stats.maintenance);
    }

    getStats() {
        const total = this.tools.length;
        const available = this.tools.filter(t => t.status === 'available').length;
        const inUse = this.tools.filter(t => t.status === 'in-use').length;
        const maintenance = this.tools.filter(t => t.status === 'maintenance' || t.status === 'broken').length;

        return { total, available, inUse, maintenance };
    }

    setupEventListeners() {
        // Фільтри
        $('#statusFilter').on('change', () => {
            this.filters.status = $('#statusFilter').val();
            this.applyFilters();
        });

        $('#categoryFilter').on('change', () => {
            this.filters.category = $('#categoryFilter').val();
            this.applyFilters();
        });

        $('#locationFilter').on('change', () => {
            this.filters.location = $('#locationFilter').val();
            this.applyFilters();
        });

        $('#searchInput').on('input', () => {
            this.applyFilters();
        });

        // Події для модальних вікон
        $('#viewToolModal').on('show.bs.modal', (event) => {
            const button = $(event.relatedTarget);
            const toolId = button.data('tool-id');
            this.showToolDetails(toolId);
        });

        $('#checkoutToolModal').on('show.bs.modal', (event) => {
            const button = $(event.relatedTarget);
            const toolId = button.data('tool-id');
            this.prepareCheckoutForm(toolId);
        });
    }

    applyFilters() {
        const searchTerm = $('#searchInput').val().toLowerCase();
        const filteredTools = this.tools.filter(tool => {
            const matchesStatus = this.filters.status === 'all' || tool.status === this.filters.status;
            const matchesCategory = this.filters.category === 'all' || tool.category === this.filters.category;
            const matchesLocation = this.filters.location === 'all' || tool.location === this.filters.location;
            const matchesSearch = !searchTerm ||
                tool.name.toLowerCase().includes(searchTerm) ||
                tool.id.toLowerCase().includes(searchTerm) ||
                (tool.manufacturer && tool.manufacturer.toLowerCase().includes(searchTerm));

            return matchesStatus && matchesCategory && matchesLocation && matchesSearch;
        });

        this.renderToolsTable(filteredTools);
        this.updatePagination(filteredTools.length);
    }

    renderToolsTable(tools) {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageTools = tools.slice(startIndex, endIndex);

        const tbody = $('#toolsTableBody');
        tbody.empty();

        pageTools.forEach(tool => {
            const row = `
                <tr>
                    <td>
                        <img src="../../assets/img/tools/${tool.image || 'default-tool.png'}"
                             alt="${tool.name}" class="tool-image" onerror="this.src='../../assets/img/tools/default-tool.png'">
                    </td>
                    <td>
                        <strong>${tool.name}</strong><br>
                        <small class="text-muted">${tool.id}</small>
                    </td>
                    <td>${this.getCategoryText(tool.category)}</td>
                    <td>
                        <span class="tool-status status-${tool.status}">${this.getStatusText(tool.status)}</span>
                    </td>
                    <td>${this.getLocationText(tool.location)}</td>
                    <td>${this.formatDate(tool.lastInspection)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-info btn-action" onclick="toolManager.viewTool('${tool.id}')" title="Переглянути">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-warning btn-action" onclick="toolManager.checkoutTool('${tool.id}')" title="Видати">
                                <i class="fas fa-sign-out-alt"></i>
                            </button>
                            <button class="btn btn-sm btn-success btn-action" onclick="toolManager.returnTool('${tool.id}')" title="Повернути">
                                <i class="fas fa-sign-in-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });

        $('#itemsShown').text(pageTools.length);
        $('#totalItems').text(tools.length);
    }

    updatePagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        $('#totalPages').text(totalPages);
        $('#currentPage').text(this.currentPage);

        // Оновлення стану кнопок пагінації
        $('.page-item').removeClass('disabled');
        if (this.currentPage === 1) {
            $('.page-item:first-child').addClass('disabled');
        }
        if (this.currentPage === totalPages) {
            $('.page-item:last-child').addClass('disabled');
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.getFilteredTools().length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.applyFilters();
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.applyFilters();
        }
    }

    getFilteredTools() {
        const searchTerm = $('#searchInput').val().toLowerCase();
        return this.tools.filter(tool => {
            const matchesStatus = this.filters.status === 'all' || tool.status === this.filters.status;
            const matchesCategory = this.filters.category === 'all' || tool.category === this.filters.category;
            const matchesLocation = this.filters.location === 'all' || tool.location === this.filters.location;
            const matchesSearch = !searchTerm ||
                tool.name.toLowerCase().includes(searchTerm) ||
                tool.id.toLowerCase().includes(searchTerm) ||
                (tool.manufacturer && tool.manufacturer.toLowerCase().includes(searchTerm));

            return matchesStatus && matchesCategory && matchesLocation && matchesSearch;
        });
    }

    resetFilters() {
        this.filters = { status: 'all', category: 'all', location: 'all' };
        $('#statusFilter').val('all');
        $('#categoryFilter').val('all');
        $('#locationFilter').val('all');
        $('#searchInput').val('');
        this.currentPage = 1;
        this.applyFilters();
    }

    viewTool(toolId) {
        currentToolId = toolId;
        $('#viewToolModal').modal('show');
    }

    showToolDetails(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;

        const detailsHtml = `
            <div class="tool-details-grid">
                <div class="detail-section">
                    <h5><i class="fas fa-info-circle"></i> Основна інформація</h5>
                    <div class="detail-item">
                        <span class="detail-label">ID:</span>
                        <span class="detail-value">${tool.id}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Назва:</span>
                        <span class="detail-value">${tool.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Категорія:</span>
                        <span class="detail-value">${this.getCategoryText(tool.category)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Виробник:</span>
                        <span class="detail-value">${tool.manufacturer || 'Невідомий'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Модель:</span>
                        <span class="detail-value">${tool.model || 'Невідома'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Серійний номер:</span>
                        <span class="detail-value">${tool.serialNumber || 'Немає'}</span>
                    </div>
                </div>

                <div class="detail-section">
                    <h5><i class="fas fa-cogs"></i> Стан та локація</h5>
                    <div class="detail-item">
                        <span class="detail-label">Статус:</span>
                        <span class="detail-value">
                            <span class="tool-status status-${tool.status}">${this.getStatusText(tool.status)}</span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Локація:</span>
                        <span class="detail-value">${this.getLocationText(tool.location)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Стан:</span>
                        <span class="detail-value">${this.getConditionText(tool.condition)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Кількість:</span>
                        <span class="detail-value">${tool.quantity} од.</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Мінімум:</span>
                        <span class="detail-value">${tool.minQuantity} од.</span>
                    </div>
                </div>

                <div class="detail-section">
                    <h5><i class="fas fa-calendar-alt"></i> Дати</h5>
                    <div class="detail-item">
                        <span class="detail-label">Дата покупки:</span>
                        <span class="detail-value">${this.formatDate(tool.purchaseDate)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Остання перевірка:</span>
                        <span class="detail-value">${this.formatDate(tool.lastInspection)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Наступна перевірка:</span>
                        <span class="detail-value">${this.formatDate(tool.nextInspection)}</span>
                    </div>
                </div>
            </div>

            ${tool.notes ? `
                <div class="detail-section">
                    <h5><i class="fas fa-sticky-note"></i> Примітки</h5>
                    <p>${tool.notes}</p>
                </div>
            ` : ''}

            ${tool.maintenanceHistory && tool.maintenanceHistory.length > 0 ? `
                <div class="detail-section">
                    <h5><i class="fas fa-tools"></i> Історія обслуговування</h5>
                    <div class="maintenance-history">
                        ${tool.maintenanceHistory.map(item => `
                            <div class="maintenance-item ${item.type === 'completed' ? 'completed' : ''}">
                                <div class="date">${this.formatDate(item.date)}</div>
                                <div class="description">${item.notes}</div>
                                <small>Технік: ${item.technician}</small>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${tool.checkoutHistory && tool.checkoutHistory.length > 0 ? `
                <div class="detail-section">
                    <h5><i class="fas fa-exchange-alt"></i> Історія видач</h5>
                    <div class="checkout-history">
                        ${tool.checkoutHistory.map(item => `
                            <div class="checkout-item ${item.returned ? 'returned' : ''}">
                                <div class="technician">${item.technician}</div>
                                <div class="dates">
                                    Видано: ${this.formatDate(item.checkoutDate)}
                                    ${item.returnDate ? `Повернено: ${this.formatDate(item.returnDate)}` : `Очікується: ${this.formatDate(item.expectedReturn)}`}
                                </div>
                                <span class="status ${item.returned ? 'returned' : 'active'}">${item.returned ? 'Повернено' : 'Активно'}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        $('#toolDetailsContent').html(detailsHtml);

        // Оновлення кнопок в залежності від статусу
        const checkoutBtn = $('#checkoutBtn');
        const maintenanceBtn = $('#maintenanceBtn');

        if (tool.status === 'available') {
            checkoutBtn.show();
            maintenanceBtn.show();
        } else if (tool.status === 'in-use') {
            checkoutBtn.hide();
            maintenanceBtn.show();
        } else {
            checkoutBtn.hide();
            maintenanceBtn.hide();
        }
    }

    prepareCheckoutForm(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;

        $('#toolSelect').html(`<option value="${tool.id}">${tool.name} (${tool.id})</option>`);
        $('#technicianName').val('');
        $('#expectedReturnDate').val('');
        $('#checkoutNotes').val('');
    }

    confirmCheckout() {
        const toolId = $('#toolSelect').val();
        const technicianName = $('#technicianName').val().trim();
        const expectedReturnDate = $('#expectedReturnDate').val();
        const notes = $('#checkoutNotes').val().trim();

        if (!technicianName || !expectedReturnDate) {
            this.showNotification('Будь ласка, заповніть всі обов\'язкові поля', 'error');
            return;
        }

        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;

        // Оновлення статусу інструменту
        tool.status = 'in-use';
        tool.currentUser = technicianName;
        tool.checkoutDate = new Date().toISOString().split('T')[0];
        tool.expectedReturn = expectedReturnDate;

        if (!tool.checkoutHistory) tool.checkoutHistory = [];
        tool.checkoutHistory.push({
            technician: technicianName,
            checkoutDate: tool.checkoutDate,
            expectedReturn: expectedReturnDate,
            notes: notes,
            returned: false
        });

        this.saveTools();
        this.applyFilters();
        this.updateStatistics();

        $('#checkoutToolModal').modal('hide');
        this.showNotification(`Інструмент "${tool.name}" видано техніку ${technicianName}`, 'success');
    }

    returnTool(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool || tool.status !== 'in-use') {
            this.showNotification('Інструмент не знаходиться в використанні', 'warning');
            return;
        }

        const returnDate = new Date().toISOString().split('T')[0];
        const lastCheckout = tool.checkoutHistory[tool.checkoutHistory.length - 1];

        if (lastCheckout) {
            lastCheckout.returnDate = returnDate;
            lastCheckout.returned = true;
        }

        tool.status = 'available';
        delete tool.currentUser;
        delete tool.checkoutDate;
        delete tool.expectedReturn;

        this.saveTools();
        this.applyFilters();
        this.updateStatistics();

        this.showNotification(`Інструмент "${tool.name}" повернено`, 'success');
    }

    checkLowStock() {
        const lowStockTools = this.tools.filter(tool => tool.quantity <= tool.minQuantity);

        const container = $('#lowStockTools');
        container.empty();

        if (lowStockTools.length === 0) {
            container.html('<p class="text-muted text-center">Всі інструменти в достатній кількості</p>');
            return;
        }

        lowStockTools.forEach(tool => {
            const alertHtml = `
                <div class="col-md-6">
                    <div class="low-stock-alert">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <div class="tool-name">${tool.name}</div>
                                <div class="stock-info">
                                    В наявності: ${tool.quantity} од. | Мінімум: ${tool.minQuantity} од.
                                </div>
                            </div>
                            <button class="btn btn-sm btn-primary" onclick="toolManager.orderTool('${tool.id}')">
                                <i class="fas fa-plus"></i> Замовити
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.append(alertHtml);
        });
    }

    scanTool() {
        $('#scanToolModal').modal('show');
        // Тут буде реалізація QR сканування
        this.showNotification('Функція QR сканування в розробці', 'info');
    }

    saveTools() {
        localStorage.setItem('tools', JSON.stringify(this.tools));
    }

    showNotification(message, type = 'info') {
        // Використання toast-сповіщень AdminLTE
        $.notify(message, {
            className: type,
            position: 'bottom right',
            autoHideDelay: 3000
        });
    }

    // Допоміжні методи
    getCategoryText(category) {
        const categories = {
            mechanical: 'Механічний',
            electrical: 'Електричний',
            safety: 'Безпека',
            measuring: 'Вимірювальний'
        };
        return categories[category] || category;
    }

    getStatusText(status) {
        const statuses = {
            available: 'Доступний',
            'in-use': 'Використовується',
            maintenance: 'Обслуговування',
            broken: 'Несправний'
        };
        return statuses[status] || status;
    }

    getLocationText(location) {
        const locations = {
            van: 'Автомобіль',
            warehouse: 'Склад',
            site: 'На об\'єкті'
        };
        return locations[location] || location;
    }

    getConditionText(condition) {
        const conditions = {
            excellent: 'Відмінний',
            good: 'Добрий',
            fair: 'Задовільний',
            poor: 'Поганий'
        };
        return conditions[condition] || condition;
    }

    formatDate(dateString) {
        if (!dateString) return 'Невідомо';
        const date = new Date(dateString);
        return date.toLocaleDateString('uk-UA');
    }
}

// Ініціалізація
$(document).ready(function() {
    window.toolManager = new ToolManager();
});