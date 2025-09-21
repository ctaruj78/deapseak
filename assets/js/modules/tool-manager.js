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
        this.setupEventListeners();
        this.updateStats();
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
            console.warn('Використання локальних даних:', error);
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

        this.renderTools(filteredTools);
        this.updateStats(filteredTools);
        this.updatePagination(filteredTools);
    }

    resetFilters() {
        $('#statusFilter').val('all');
        $('#categoryFilter').val('all');
        $('#locationFilter').val('all');
        $('#searchInput').val('');
        this.filters = { status: 'all', category: 'all', location: 'all' };
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
        $('#currentPage').text(this.currentPage);
        $('#totalPages').text(totalPages || 1);
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

        return filteredTools;
    }

    checkLowStock() {
        const lowStockTools = this.tools.filter(tool => 
            tool.quantity <= tool.minQuantity
        );

        const lowStockContainer = $('#lowStockTools');
        lowStockContainer.empty();

        if (lowStockTools.length === 0) {
            lowStockContainer.html(`
                <div class="col-12 text-center py-4">
                    <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
                    <h5>Всі інструменти в наявності</h5>
                    <p class="text-muted">Немає інструментів, які потребують негайного поповнення</p>
                </div>
            `);
            return;
        }

        lowStockTools.forEach(tool => {
            lowStockContainer.append(`
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card border-warning">
                        <div class="card-body">
                            <h6 class="card-title text-warning">
                                <i class="fas fa-exclamation-triangle"></i> ${tool.name}
                            </h6>
                            <p class="card-text mb-1">
                                <small>В наявності: ${tool.quantity} од.</small>
                            </p>
                            <p class="card-text mb-1">
                                <small>Мінімум: ${tool.minQuantity} од.</small>
                            </p>
                            <button class="btn btn-sm btn-outline-warning" onclick="toolManager.orderTool('${tool.id}')">
                                <i class="fas fa-shopping-cart"></i> Замовити
                            </button>
                        </div>
                    </div>
                </div>
            `);
        });
    }

    scanTool() {
        $('#scanToolModal').modal('show');
    }

    checkoutTool(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;

        // Заповнення форми видачі
        $('#toolSelect').val(toolId);
        $('#checkoutToolModal').modal('show');
    }

    returnTool(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;

        if (confirm(`Підтвердити повернення інструменту ${tool.name}?`)) {
            tool.status = 'available';
            delete tool.currentUser;
            delete tool.checkoutDate;
            delete tool.expectedReturn;
            
            localStorage.setItem('tools', JSON.stringify(this.tools));
            this.applyFilters();
            
            this.showNotification('Інструмент успішно повернено!', 'success');
        }
    }

    viewTool(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;

        currentToolId = toolId;
        const modalContent = this.createToolDetails(tool);
        $('#toolDetailsContent').html(modalContent);
        
        // Оновлення видимості кнопок
        this.updateToolButtons(tool);
        
        $('#viewToolModal').modal('show');
    }

    createToolDetails(tool) {
        const statusClass = `status-${tool.status}`;
        const categoryClass = `category-${tool.category}`;
        const statusText = this.getStatusText(tool.status);
        const categoryText = this.getCategoryText(tool.category);
        const locationText = this.getLocationText(tool.location);
        
        return `
            <div class="tool-details">
                <div class="row mb-4">
                    <div class="col-md-8">
                        <h4>${tool.id}</h4>
                        <h5>${tool.name}</h5>
                    </div>
                    <div class="col-md-4 text-right">
                        <span class="category-badge ${categoryClass}">${categoryText}</span>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>

                <div class="row mb-4">
                    <div class="col-md-6">
                        <img src="../assets/img/tools/${tool.image}" 
                             class="img-fluid rounded" 
                             alt="${tool.name}"
                             onerror="this.src='../assets/img/tools/default.jpg'"
                             style="max-height: 200px;">
                    </div>
                    <div class="col-md-6">
                        <div class="qr-code bg-light text-center">
                            <i class="fas fa-qrcode fa-4x text-muted"></i>
                            <div class="mt-2">
                                <small>${tool.id}</small>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row mb-4">
                    <div class="col-md-6">
                        <div class="info-item">
                            <strong><i class="fas fa-industry"></i> Виробник:</strong> ${tool.manufacturer}
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-cube"></i> Модель:</strong> ${tool.model}
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-barcode"></i> Серійний номер:</strong> ${tool.serialNumber || 'Н/Д'}
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-shopping-cart"></i> Дата покупки:</strong> ${this.formatDate(tool.purchaseDate)}
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="info-item">
                            <strong><i class="fas fa-map-marker-alt"></i> Локація:</strong> ${locationText}
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-boxes"></i> Кількість:</strong> ${tool.quantity} од.
                            ${tool.quantity <= tool.minQuantity ? 
                                '<span class="badge badge-warning ml-2">Потребує поповнення</span>' : ''}
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-tachometer-alt"></i> Стан:</strong> ${this.getConditionText(tool.condition)}
                        </div>
                        ${tool.currentUser ? `
                            <div class="info-item">
                                <strong><i class="fas fa-user"></i> Використовує:</strong> ${tool.currentUser}
                            </div>
                            <div class="info-item">
                                <strong><i class="fas fa-calendar"></i> Видано:</strong> ${this.formatDate(tool.checkoutDate)}
                            </div>
                            <div class="info-item">
                                <strong><i class="fas fa-undo"></i> Очікується повернення:</strong> ${this.formatDate(tool.expectedReturn)}
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="row mb-4">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="card-title"><i class="fas fa-calendar-check"></i> Перевірки</h6>
                            </div>
                            <div class="card-body">
                                <div class="info-item">
                                    <strong>Остання перевірка:</strong> ${this.formatDate(tool.lastInspection)}
                                </div>
                                <div class="info-item">
                                    <strong>Наступна перевірка:</strong> ${this.formatDate(tool.nextInspection)}
                                </div>
                                ${this.getInspectionStatus(tool.nextInspection)}
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="card-title"><i class="fas fa-info-circle"></i> Додаткова інформація</h6>
                            </div>
                            <div class="card-body">
                                ${tool.notes ? `
                                    <p class="card-text">${tool.notes}</p>
                                ` : '<p class="card-text text-muted">Немає додаткової інформації</p>'}
                            </div>
                        </div>
                    </div>
                </div>

                ${tool.maintenanceHistory && tool.maintenanceHistory.length > 0 ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h6 class="card-title"><i class="fas fa-history"></i> Історія обслуговування</h6>
                        </div>
                        <div class="card-body maintenance-history">
                            ${tool.maintenanceHistory.map(record => `
                                <div class="timeline-item mb-3">
                                    <div class="d-flex justify-content-between">
                                        <strong>${this.formatDate(record.date)}</strong>
                                        <span class="badge ${record.type === 'regular' ? 'badge-info' : record.type === 'repair' ? 'badge-warning' : 'badge-secondary'}">
                                            ${record.type === 'regular' ? 'Профілактика' : record.type === 'repair' ? 'Ремонт' : 'Діагностика'}
                                        </span>
                                    </div>
                                    <div class="text-muted">Технік: ${record.technician}</div>
                                    <div>${record.notes}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getConditionText(condition) {
        const conditions = {
            'excellent': 'Відмінний',
            'good': 'Хороший',
            'fair': 'Задовільний',
            'poor': 'Поганий',
            'broken': 'Несправний',
            'maintenance': 'На обслуговуванні'
        };
        return conditions[condition] || condition;
    }

    getInspectionStatus(nextInspection) {
        if (!nextInspection) return '';
        
        const now = new Date();
        const inspectionDate = new Date(nextInspection);
        const timeDiff = inspectionDate - now;
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        
        if (daysDiff < 0) {
            return '<div class="alert alert-danger mt-2 py-1"><small>Перевірка протермінована!</small></div>';
        } else if (daysDiff < 30) {
            return '<div class="alert alert-warning mt-2 py-1"><small>Необхідна перевірка найближчим часом</small></div>';
        }
        return '<div class="alert alert-success mt-2 py-1"><small>Перевірка вчасно</small></div>';
    }

    updateToolButtons(tool) {
        if (tool.status === 'available') {
            $('#checkoutBtn').show();
            $('#maintenanceBtn').show();
        } else if (tool.status === 'in-use') {
            $('#checkoutBtn').hide();
            $('#maintenanceBtn').hide();
        } else {
            $('#checkoutBtn').hide();
            $('#maintenanceBtn').show();
        }
    }

    requestMaintenance(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;

        const notes = prompt('Введіть причину обслуговування:');
        if (notes) {
            tool.status = 'maintenance';
            tool.maintenanceHistory = tool.maintenanceHistory || [];
            tool.maintenanceHistory.unshift({
                date: new Date().toISOString().split('T')[0],
                type: 'repair',
                technician: $('#techName').text(),
                notes: notes
            });
            
            localStorage.setItem('tools', JSON.stringify(this.tools));
            this.applyFilters();
            
            this.showNotification('Запит на обслуговування відправлено!', 'success');
        }
    }

    printToolLabel(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;

        this.showNotification(`Підготовка ярлика для ${tool.name}...`, 'info');
        
        // Імітація друку
        setTimeout(() => {
            this.showNotification('Ярлик готовий до друку', 'success');
        }, 1000);
    }

    orderTool(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;

        const quantity = prompt(`Скільки одиниць ${tool.name} замовити?`, tool.minQuantity - tool.quantity + 1);
        if (quantity && !isNaN(quantity)) {
            this.showNotification(`Замовлення на ${quantity} од. ${tool.name} відправлено!`, 'success');
        }
    }

    exportTools() {
        const filteredTools = this.getFilteredTools();
        
        if (filteredTools.length === 0) {
            this.showNotification('Немає інструментів для експорту', 'warning');
            return;
        }

        this.showNotification('Підготовка експорту...', 'info');
        
        // Створення CSV
        const csvContent = this.convertToCSV(filteredTools);
        this.downloadCSV(csvContent, `інструменти_${new Date().toISOString().split('T')[0]}.csv`);
    }

    convertToCSV(tools) {
        const headers = ['ID', 'Назва', 'Категорія', 'Статус', 'Локація', 'Кількість', 'Остання перевірка'];
        const rows = tools.map(tool => [
            tool.id,
            tool.name,
            this.getCategoryText(tool.category),
            this.getStatusText(tool.status),
            this.getLocationText(tool.location),
            tool.quantity,
            this.formatDate(tool.lastInspection)
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        this.showNotification('Експорт успішно завершено', 'success');
    }

    printTools() {
        window.print();
    }

    showNotification(message, type = 'info') {
        // Використання toast-сповіщень AdminLTE
        $.notify(message, {
            className: type,
            position: 'bottom right',
            autoHideDelay: 3000
        });
    }
}

// Ініціалізація
$(document).ready(function() {
    window.toolManager = new ToolManager();
});