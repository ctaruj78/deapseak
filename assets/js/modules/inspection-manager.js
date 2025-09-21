// inspections-manager.js - МЕНЕДЖЕР ІНСПЕКЦІЙ ДЛЯ ТЕХНІКА
class InspectionManager {
    constructor() {
        this.inspections = [];
        this.filters = {
            status: 'all',
            type: 'all',
            priority: 'all'
        };
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.init();
    }

    init() {
        this.loadInspections();
        this.setupEventListeners();
        this.updateStats();
    }

    async loadInspections() {
        try {
            // Спроба отримати дані з API
            const response = await fetch('/api/inspections', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                this.inspections = await response.json();
                localStorage.setItem('inspections', JSON.stringify(this.inspections));
            } else {
                throw new Error('API недоступне');
            }
        } catch (error) {
            console.warn('Використання локальних даних:', error);
            this.inspections = JSON.parse(localStorage.getItem('inspections')) || [];
            
            if (this.inspections.length === 0) {
                this.inspections = this.createSampleInspections();
                localStorage.setItem('inspections', JSON.stringify(this.inspections));
            }
        }

        this.applyFilters();
    }

    createSampleInspections() {
        return [
            {
                id: 'INS-2024-001',
                type: 'safety',
                title: 'Щомісячна перевірка безпеки',
                liftId: 'lift1',
                lift: 'Otis Gen2 - вул. Центральна, 12',
                priority: 'high',
                status: 'completed',
                scheduledDate: '2024-01-15T10:00:00',
                completedDate: '2024-01-15T12:30:00',
                duration: 150,
                result: 'passed',
                score: 95,
                technician: 'Іван Петренко',
                checklist: [
                    { item: 'Перевірка гальмівної системи', status: 'completed', result: 'passed', notes: 'Гальма в нормі' },
                    { item: 'Перевірка датчиків безпеки', status: 'completed', result: 'passed', notes: 'Всі датчики працюють' },
                    { item: 'Перевірка освітлення', status: 'completed', result: 'passed', notes: 'Освітлення в робочому стані' }
                ],
                photos: ['safety1.jpg', 'safety2.jpg'],
                notes: 'Ліфт у відмінному технічному стані. Всі системи безпеки працюють належним чином.'
            },
            {
                id: 'INS-2024-002',
                type: 'technical',
                title: 'Технічний огляд механізмів',
                liftId: 'lift2',
                lift: 'Schindler 3300 - пр. Перемоги, 45',
                priority: 'medium',
                status: 'in-progress',
                scheduledDate: '2024-01-20T09:00:00',
                technician: 'Марія Коваленко',
                checklist: [
                    { item: 'Перевірка тросів', status: 'completed', result: 'passed', notes: 'Троси в хорошому стані' },
                    { item: 'Перевірка двигуна', status: 'in-progress', result: null, notes: '' },
                    { item: 'Перевірка системи керування', status: 'pending', result: null, notes: '' }
                ],
                progress: 40
            },
            {
                id: 'INS-2024-003',
                type: 'periodic',
                title: 'Квартальна перевірка',
                liftId: 'lift3',
                lift: 'KONE MonoSpace - вул. Шевченка, 78',
                priority: 'medium',
                status: 'planned',
                scheduledDate: '2024-02-01T14:00:00',
                technician: 'Петро Сидоренко'
            },
            {
                id: 'INS-2024-004',
                type: 'emergency',
                title: 'Аварійна перевірка після скарги',
                liftId: 'lift1',
                lift: 'Otis Gen2 - вул. Центральна, 12',
                priority: 'high',
                status: 'overdue',
                scheduledDate: '2024-01-10T11:00:00',
                technician: 'Іван Петренко',
                notes: 'Клієнт скаржиться на шум під час роботи ліфта'
            }
        ];
    }

    setupEventListeners() {
        $('#statusFilter').on('change', (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        });

        $('#typeFilter').on('change', (e) => {
            this.filters.type = e.target.value;
            this.applyFilters();
        });

        $('#priorityFilter').on('change', (e) => {
            this.filters.priority = e.target.value;
            this.applyFilters();
        });

        // Пошук
        $('#searchInput').on('input', (e) => {
            this.searchInspections(e.target.value);
        });
    }

    applyFilters() {
        let filteredInspections = [...this.inspections];

        // Фільтрація за статусом
        if (this.filters.status !== 'all') {
            filteredInspections = filteredInspections.filter(inspection => 
                inspection.status === this.filters.status
            );
        }

        // Фільтрація за типом
        if (this.filters.type !== 'all') {
            filteredInspections = filteredInspections.filter(inspection => 
                inspection.type === this.filters.type
            );
        }

        // Фільтрація за пріоритетом
        if (this.filters.priority !== 'all') {
            filteredInspections = filteredInspections.filter(inspection => 
                inspection.priority === this.filters.priority
            );
        }

        this.renderInspections(filteredInspections);
        this.updateStats(filteredInspections);
        this.updatePagination(filteredInspections);
    }

    resetFilters() {
        $('#statusFilter').val('all');
        $('#typeFilter').val('all');
        $('#priorityFilter').val('all');
        $('#searchInput').val('');
        this.filters = { status: 'all', type: 'all', priority: 'all' };
        this.currentPage = 1;
        this.applyFilters();
    }

    searchInspections(query) {
        if (!query.trim()) {
            this.applyFilters();
            return;
        }

        const filteredInspections = this.inspections.filter(inspection =>
            inspection.title.toLowerCase().includes(query.toLowerCase()) ||
            inspection.id.toLowerCase().includes(query.toLowerCase()) ||
            inspection.lift.toLowerCase().includes(query.toLowerCase()) ||
            (inspection.technician && inspection.technician.toLowerCase().includes(query.toLowerCase()))
        );

        this.renderInspections(filteredInspections);
        this.updateStats(filteredInspections);
    }

    renderInspections(inspections) {
        const tbody = $('#inspectionsTableBody');
        tbody.empty();

        if (inspections.length === 0) {
            tbody.html(`
                <tr>
                    <td colspan="8" class="text-center py-5">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <h4>Інспекцій не знайдено</h4>
                        <p>Спробуйте змінити параметри фільтрів</p>
                    </td>
                </tr>
            `);
            return;
        }

        // Пагінація
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const paginatedInspections = inspections.slice(startIndex, startIndex + this.itemsPerPage);

        paginatedInspections.forEach(inspection => {
            const row = this.createInspectionRow(inspection);
            tbody.append(row);
        });
    }

    createInspectionRow(inspection) {
        const statusClass = `status-${inspection.status}`;
        const priorityClass = `priority-${inspection.priority}`;
        const statusText = this.getStatusText(inspection.status);
        const typeText = this.getTypeText(inspection.type);
        const priorityText = this.getPriorityText(inspection.priority);
        
        return $(`
            <tr>
                <td><strong>${inspection.id}</strong></td>
                <td>${this.formatDate(inspection.scheduledDate)}</td>
                <td>${typeText}</td>
                <td>${inspection.lift}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td><span class="priority-badge ${priorityClass}">${priorityText}</span></td>
                <td>${this.getResultText(inspection)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-info btn-icon" onclick="inspectionManager.viewInspection('${inspection.id}')" title="Перегляд">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary btn-icon" onclick="inspectionManager.downloadReport('${inspection.id}')" title="Звіт">
                            <i class="fas fa-download"></i>
                        </button>
                        ${inspection.status === 'in-progress' ? 
                            `<button class="btn btn-sm btn-success btn-icon" onclick="inspectionManager.continueInspection('${inspection.id}')" title="Продовжити">
                                <i class="fas fa-play"></i>
                            </button>` : ''}
                        ${inspection.status === 'planned' ? 
                            `<button class="btn btn-sm btn-warning btn-icon" onclick="inspectionManager.startInspection('${inspection.id}')" title="Розпочати">
                                <i class="fas fa-play-circle"></i>
                            </button>` : ''}
                    </div>
                </td>
            </tr>
        `);
    }

    getStatusText(status) {
        const statuses = {
            'planned': 'Запланована',
            'in-progress': 'В процесі',
            'completed': 'Завершена',
            'overdue': 'Протермінована',
            'cancelled': 'Скасована'
        };
        return statuses[status] || status;
    }

    getTypeText(type) {
        const types = {
            'safety': 'Безпека',
            'technical': 'Технічна',
            'periodic': 'Періодична',
            'emergency': 'Аварійна',
            'custom': 'Інша'
        };
        return types[type] || type;
    }

    getPriorityText(priority) {
        const priorities = {
            'high': 'Високий',
            'medium': 'Середній',
            'low': 'Низький'
        };
        return priorities[priority] || priority;
    }

    getResultText(inspection) {
        if (inspection.status !== 'completed') return '-';
        
        if (inspection.result === 'passed') {
            return `<span class="text-success"><i class="fas fa-check-circle"></i> Пройдено (${inspection.score}%)</span>`;
        } else if (inspection.result === 'failed') {
            return `<span class="text-danger"><i class="fas fa-times-circle"></i> Не пройдено</span>`;
        } else {
            return `<span class="text-warning"><i class="fas fa-exclamation-circle"></i> Умовно пройдено</span>`;
        }
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('uk-UA');
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('uk-UA');
    }

    updateStats(inspections = this.inspections) {
        $('#totalInspections').text(inspections.length);
        $('#inspectionsBadge').text(inspections.filter(i => i.status === 'planned' || i.status === 'in-progress').length);
        
        const planned = inspections.filter(i => i.status === 'planned').length;
        $('#plannedInspections').text(planned);

        const inProgress = inspections.filter(i => i.status === 'in-progress').length;
        $('#inProgressInspections').text(inProgress);

        const completed = inspections.filter(i => i.status === 'completed').length;
        $('#completedInspections').text(completed);
    }

    updatePagination(inspections) {
        const totalPages = Math.ceil(inspections.length / this.itemsPerPage);
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
        const totalPages = Math.ceil(this.getFilteredInspections().length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.applyFilters();
        }
    }

    getFilteredInspections() {
        let filteredInspections = [...this.inspections];

        if (this.filters.status !== 'all') {
            filteredInspections = filteredInspections.filter(inspection => 
                inspection.status === this.filters.status
            );
        }

        if (this.filters.type !== 'all') {
            filteredInspections = filteredInspections.filter(inspection => 
                inspection.type === this.filters.type
            );
        }

        if (this.filters.priority !== 'all') {
            filteredInspections = filteredInspections.filter(inspection => 
                inspection.priority === this.filters.priority
            );
        }

        return filteredInspections;
    }

    startNewInspection() {
        $('#newInspectionForm')[0].reset();
        $('#newInspectionModal').modal('show');
    }

    createInspection() {
        const formData = {
            type: $('#inspectionType').val(),
            liftId: $('#inspectionLift').val(),
            priority: $('#inspectionPriority').val(),
            scheduledDate: $('#inspectionDate').val(),
            description: $('#inspectionDescription').val(),
            checklist: $('#inspectionChecklist').val()
        };

        if (!formData.type || !formData.liftId || !formData.scheduledDate) {
            this.showNotification('Будь ласка, заповніть обов\'язкові поля', 'error');
            return;
        }

        const newInspection = {
            id: `INS-${new Date().getFullYear()}-${String(this.inspections.length + 1).padStart(3, '0')}`,
            title: this.generateInspectionTitle(formData.type),
            status: 'planned',
            ...formData,
            createdAt: new Date().toISOString(),
            technician: $('#techName').text()
        };

        this.inspections.unshift(newInspection);
        localStorage.setItem('inspections', JSON.stringify(this.inspections));
        
        $('#newInspectionModal').modal('hide');
        this.applyFilters();
        
        this.showNotification('Інспекцію успішно створено!', 'success');
    }

    generateInspectionTitle(type) {
        const titles = {
            'safety': 'Перевірка безпеки',
            'technical': 'Технічний огляд',
            'periodic': 'Періодична перевірка',
            'emergency': 'Аварійна перевірка',
            'custom': 'Спеціальна перевірка'
        };
        return titles[type] || 'Нова інспекція';
    }

    viewInspection(inspectionId) {
        const inspection = this.inspections.find(i => i.id === inspectionId);
        if (!inspection) return;

        currentInspectionId = inspectionId;
        const modalContent = this.createInspectionDetails(inspection);
        $('#inspectionDetailsContent').html(modalContent);
        
        // Оновлення видимості кнопки продовження
        if (inspection.status === 'in-progress') {
            $('#continueInspectionBtn').show();
        } else {
            $('#continueInspectionBtn').hide();
        }
        
        $('#viewInspectionModal').modal('show');
    }

    createInspectionDetails(inspection) {
        const statusClass = `status-${inspection.status}`;
        const priorityClass = `priority-${inspection.priority}`;
        const statusText = this.getStatusText(inspection.status);
        const typeText = this.getTypeText(inspection.type);
        const priorityText = this.getPriorityText(inspection.priority);
        
        return `
            <div class="inspection-details">
                <div class="row mb-4">
                    <div class="col-md-8">
                        <h4>${inspection.id}</h4>
                        <h5>${inspection.title}</h5>
                    </div>
                    <div class="col-md-4 text-right">
                        <span class="priority-badge ${priorityClass}">${priorityText}</span>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>

                <div class="row mb-4">
                    <div class="col-md-6">
                        <div class="info-item">
                            <strong><i class="fas fa-elevator"></i> Ліфт:</strong> ${inspection.lift}
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-tag"></i> Тип:</strong> ${typeText}
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-calendar"></i> Заплановано:</strong> ${this.formatDateTime(inspection.scheduledDate)}
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="info-item">
                            <strong><i class="fas fa-user-cog"></i> Технік:</strong> ${inspection.technician || 'Не призначено'}
                        </div>
                        ${inspection.completedDate ? `
                            <div class="info-item">
                                <strong><i class="fas fa-check-circle"></i> Завершено:</strong> ${this.formatDateTime(inspection.completedDate)}
                            </div>
                        ` : ''}
                        ${inspection.duration ? `
                            <div class="info-item">
                                <strong><i class="fas fa-clock"></i> Тривалість:</strong> ${inspection.duration} хв
                            </div>
                        ` : ''}
                    </div>
                </div>

                ${inspection.description ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-align-left"></i> Опис інспекції</h5>
                        </div>
                        <div class="card-body">
                            <p class="card-text">${inspection.description}</p>
                        </div>
                    </div>
                ` : ''}

                ${inspection.checklist && inspection.checklist.length > 0 ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-clipboard-list"></i> Чек-лист</h5>
                            ${inspection.progress ? `
                                <div class="progress progress-sm">
                                    <div class="progress-bar bg-success" style="width: ${inspection.progress}%"></div>
                                </div>
                            ` : ''}
                        </div>
                        <div class="card-body">
                            <div class="checklist">
                                ${inspection.checklist.map(item => `
                                    <div class="checklist-item ${item.status === 'completed' ? (item.result === 'passed' ? 'completed' : 'failed') : ''}">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <span>${item.item}</span>
                                            <span class="badge ${item.status === 'completed' ? (item.result === 'passed' ? 'badge-success' : 'badge-danger') : 'badge-secondary'}">
                                                ${item.status === 'completed' ? (item.result === 'passed' ? 'Пройдено' : 'Не пройдено') : 'В очікуванні'}
                                            </span>
                                        </div>
                                        ${item.notes ? `<p class="mb-0 mt-2"><small>${item.notes}</small></p>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                ` : ''}

                ${inspection.photos && inspection.photos.length > 0 ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-images"></i> Фотографії</h5>
                        </div>
                        <div class="card-body">
                            <div class="d-flex flex-wrap">
                                ${inspection.photos.map(photo => `
                                    <img src="../../assets/img/inspections/${photo}" 
                                         class="photo-preview mr-2 mb-2" 
                                         style="width: 100px; height: 100px; object-fit: cover;"
                                         onerror="this.src='../../assets/img/inspections/default.jpg'">
                                `).join('')}
                            </div>
                        </div>
                    </div>
                ` : ''}

                ${inspection.notes ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-sticky-note"></i> Нотатки</h5>
                        </div>
                        <div class="card-body">
                            <p class="card-text">${inspection.notes}</p>
                        </div>
                    </div>
                ` : ''}

                ${inspection.result ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-chart-bar"></i> Результат</h5>
                        </div>
                        <div class="card-body">
                            <div class="text-center">
                                <h2 class="${inspection.result === 'passed' ? 'text-success' : 'text-danger'}">
                                    ${inspection.result === 'passed' ? 'Пройдено' : 'Не пройдено'}
                                    ${inspection.score ? ` (${inspection.score}%)` : ''}
                                </h2>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    startInspection(inspectionId) {
        const inspection = this.inspections.find(i => i.id === inspectionId);
        if (!inspection) return;

        inspection.status = 'in-progress';
        inspection.startedDate = new Date().toISOString();
        
        localStorage.setItem('inspections', JSON.stringify(this.inspections));
        this.applyFilters();
        
        this.showNotification('Інспекцію розпочато!', 'success');
        this.viewInspection(inspectionId);
    }

    continueInspection(inspectionId) {
        // Перенаправлення на сторінку виконання інспекції
        window.location.href = `inspection-execution.html?id=${inspectionId}`;
    }

    downloadReport(inspectionId) {
        const inspection = this.inspections.find(i => i.id === inspectionId);
        if (!inspection) return;

        this.showNotification(`Підготовка звіту для інспекції ${inspectionId}...`, 'info');
        
        // Імітація створення PDF
        setTimeout(() => {
            const reportContent = this.generateReportContent(inspection);
            const blob = new Blob([reportContent], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `звіт_інспекція_${inspectionId}.pdf`;
            link.click();
            
            this.showNotification('Звіт успішно завантажено', 'success');
        }, 1500);
    }

    generateReportContent(inspection) {
        // Імітація створення звіту
        return `
            ЗВІТ ПРО ІНСПЕКЦІЮ #${inspection.id}
            ===================================
            
            Назва: ${inspection.title}
            Тип: ${this.getTypeText(inspection.type)}
            Ліфт: ${inspection.lift}
            Статус: ${this.getStatusText(inspection.status)}
            Пріоритет: ${this.getPriorityText(inspection.priority)}
            
            Заплановано: ${this.formatDateTime(inspection.scheduledDate)}
            ${inspection.startedDate ? `Розпочато: ${this.formatDateTime(inspection.startedDate)}` : ''}
            ${inspection.completedDate ? `Завершено: ${this.formatDateTime(inspection.completedDate)}` : ''}
            
            ${inspection.description ? `Опис: ${inspection.description}` : ''}
            
            ${inspection.result ? `Результат: ${inspection.result === 'passed' ? 'Пройдено' : 'Не пройдено'}${inspection.score ? ` (${inspection.score}%)` : ''}` : ''}
            
            ===================================
            Згенеровано: ${new Date().toLocaleString('uk-UA')}
        `;
    }

    loadSafetyChecklist() {
        this.showNotification('Завантаження чек-листу безпеки...', 'info');
        // Тут буде реальна логіка завантаження
    }

    loadTechnicalChecklist() {
        this.showNotification('Завантаження технічного чек-листу...', 'info');
        // Тут буде реальна логіка завантаження
    }

    loadAnnualChecklist() {
        this.showNotification('Завантаження щорічного чек-листу...', 'info');
        // Тут буде реальна логіка завантаження
    }

    exportInspections() {
        const filteredInspections = this.getFilteredInspections();
        
        if (filteredInspections.length === 0) {
            this.showNotification('Немає інспекцій для експорту', 'warning');
            return;
        }

        this.showNotification('Підготовка експорту...', 'info');
        
        // Створення CSV
        const csvContent = this.convertToCSV(filteredInspections);
        this.downloadCSV(csvContent, `інспекції_${new Date().toISOString().split('T')[0]}.csv`);
    }

    convertToCSV(inspections) {
        const headers = ['ID', 'Тип', 'Ліфт', 'Статус', 'Пріоритет', 'Заплановано', 'Технік', 'Результат'];
        const rows = inspections.map(inspection => [
            inspection.id,
            this.getTypeText(inspection.type),
            inspection.lift,
            this.getStatusText(inspection.status),
            this.getPriorityText(inspection.priority),
            this.formatDate(inspection.scheduledDate),
            inspection.technician || 'Не призначено',
            inspection.result || '-'
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

    printInspections() {
        window.print();
    }

    importChecklist() {
        this.showNotification('Функція імпорту чек-листів буде реалізована в майбутніх версіях', 'info');
    }

    exportReports() {
        this.showNotification('Функція експорту звітів буде реалізована в майбутніх версіях', 'info');
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
    window.inspectionManager = new InspectionManager();
});