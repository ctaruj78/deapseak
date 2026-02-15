// requests-manager.js - РОЗШИРЕНА ВЕРСІЯ ДЛЯ ADMINLTE
class RequestsManager {
    constructor() {
        this.requests = [];
        this.filters = {
            status: 'all',
            priority: 'all',
            lift: 'all'
        };
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.init();
    }

    init() {
        this.loadRequests();
        this.setupEventListeners();
        this.updateStats();
    }

    async loadRequests() {
        try {
            // Спроба отримати дані з API
            const response = await fetch('/api/maintenance-requests', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                this.requests = await response.json();
                localStorage.setItem('maintenanceRequests', JSON.stringify(this.requests));
            } else {
                throw new Error('API недоступне');
            }
        } catch (error) {
            console.warn('Використання локальних даних:', error);
            this.requests = JSON.parse(localStorage.getItem('maintenanceRequests')) || [];
            
            if (this.requests.length === 0) {
                this.requests = this.createSampleRequests();
                localStorage.setItem('maintenanceRequests', JSON.stringify(this.requests));
            }
        }

        this.applyFilters();
    }

    createSampleRequests() {
        return [
            {
                id: '12345',
                title: 'Планове технічне обслуговування',
                description: 'Щомісячне планове технічне обслуговування ліфта. Перевірка всіх систем безпеки, мастильних матеріалів та роботи дверей.',
                liftId: 'lift1',
                priority: 'medium',
                status: 'completed',
                type: 'maintenance',
                createdAt: '2024-01-15T10:00:00Z',
                updatedAt: '2024-01-16T15:30:00Z',
                completedAt: '2024-01-16T15:30:00Z',
                assignedTo: 'tech1',
                technician: 'Іван Петренко',
                cost: 12500.00,
                rating: 5,
                photos: ['photo1.jpg', 'photo2.jpg']
            },
            {
                id: '12346',
                title: 'Аварійний ремонт дверей',
                description: 'Двері ліфта не закриваються належним чином. Виникає проблема з датчиками безпеки та механізмом блокування.',
                liftId: 'lift2',
                priority: 'high',
                status: 'in-progress',
                type: 'repair',
                createdAt: '2024-01-16T14:20:00Z',
                updatedAt: '2024-01-17T09:15:00Z',
                assignedTo: 'tech2',
                technician: 'Марія Коваленко',
                estimatedCost: 8300.00,
                photos: ['photo3.jpg']
            },
            {
                id: '12347',
                title: 'Консультація щодо модернізації',
                description: 'Консультація з приводу можливої модернізації ліфта та оновлення системи керування.',
                liftId: 'lift3',
                priority: 'low',
                status: 'pending',
                type: 'consultation',
                createdAt: '2024-01-18T11:30:00Z',
                updatedAt: '2024-01-18T11:30:00Z',
                photos: []
            },
            {
                id: '12348',
                title: 'Щорічний технічний огляд',
                description: 'Повний технічний огляд ліфта згідно з графіком планових перевірок.',
                liftId: 'lift1',
                priority: 'medium',
                status: 'in-progress',
                type: 'inspection',
                createdAt: '2024-01-20T09:00:00Z',
                updatedAt: '2024-01-20T09:00:00Z',
                assignedTo: 'tech3',
                technician: 'Петро Сидоренко',
                estimatedCost: 15600.00
            }
        ];
    }

    setupEventListeners() {
        $('#statusFilter').on('change', (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        });

        $('#priorityFilter').on('change', (e) => {
            this.filters.priority = e.target.value;
            this.applyFilters();
        });

        $('#liftFilter').on('change', (e) => {
            this.filters.lift = e.target.value;
            this.applyFilters();
        });

        $('#searchInput').on('input', (e) => {
            this.searchRequests(e.target.value);
        });

        // Обробка завантаження фото
        $('#requestPhotos').on('change', (e) => {
            this.handlePhotoUpload(e.target.files);
        });

        // Автоматичне оновлення заголовку при зміні типу
        $('#requestType').on('change', (e) => {
            this.updateRequestTitle(e.target.value);
        });
    }

    updateRequestTitle(type) {
        const titles = {
            'maintenance': 'Технічне обслуговування',
            'repair': 'Ремонт ліфта',
            'inspection': 'Технічний огляд',
            'consultation': 'Консультація',
            'emergency': 'Аварійна ситуація'
        };
        
        if (titles[type]) {
            $('#requestTitle').val(titles[type]);
        }
    }

    applyFilters() {
        let filteredRequests = [...this.requests];

        // Фільтрація за статусом
        if (this.filters.status !== 'all') {
            filteredRequests = filteredRequests.filter(request => 
                request.status === this.filters.status
            );
        }

        // Фільтрація за пріоритетом
        if (this.filters.priority !== 'all') {
            filteredRequests = filteredRequests.filter(request => 
                request.priority === this.filters.priority
            );
        }

        // Фільтрація за ліфтом
        if (this.filters.lift !== 'all') {
            filteredRequests = filteredRequests.filter(request => 
                request.liftId === this.filters.lift
            );
        }

        this.renderRequests(filteredRequests);
        this.updateStats(filteredRequests);
        this.updatePagination(filteredRequests);
    }

    resetFilters() {
        $('#statusFilter').val('all');
        $('#priorityFilter').val('all');
        $('#liftFilter').val('all');
        $('#searchInput').val('');
        this.filters = { status: 'all', priority: 'all', lift: 'all' };
        this.currentPage = 1;
        this.applyFilters();
    }

    searchRequests(query) {
        if (!query.trim()) {
            this.applyFilters();
            return;
        }

        const filteredRequests = this.requests.filter(request =>
            request.title.toLowerCase().includes(query.toLowerCase()) ||
            request.description.toLowerCase().includes(query.toLowerCase()) ||
            request.id.toLowerCase().includes(query.toLowerCase()) ||
            (request.technician && request.technician.toLowerCase().includes(query.toLowerCase()))
        );

        this.renderRequests(filteredRequests);
        this.updateStats(filteredRequests);
    }

    renderRequests(requests) {
        const tbody = $('#requestsTableBody');
        tbody.empty();

        if (requests.length === 0) {
            tbody.html(`
                <tr>
                    <td colspan="8" class="text-center py-5">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <h4>Заявок не знайдено</h4>
                        <p>Спробуйте змінити параметри фільтрів</p>
                    </td>
                </tr>
            `);
            return;
        }

        // Пагінація
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const paginatedRequests = requests.slice(startIndex, startIndex + this.itemsPerPage);

        paginatedRequests.forEach(request => {
            const row = this.createRequestRow(request);
            tbody.append(row);
        });
    }

    createRequestRow(request) {
        const priorityClass = `priority-${request.priority}`;
        const statusClass = `status-${request.status}`;
        const priorityText = this.getPriorityText(request.priority);
        const statusText = this.getStatusText(request.status);
        const liftName = this.getLiftName(request.liftId);
        
        return $(`
            <tr>
                <td><strong>#${request.id}</strong></td>
                <td>${this.formatDate(request.createdAt)}</td>
                <td>${liftName}</td>
                <td>
                    <div><strong>${request.title}</strong></div>
                    <small class="text-muted">${request.description.substring(0, 50)}...</small>
                </td>
                <td><span class="priority-badge ${priorityClass}">${priorityText}</span></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${request.technician || 'Не призначено'}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-info btn-icon" onclick="requestsManager.viewRequest('${request.id}')" title="Перегляд">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary btn-icon" onclick="requestsManager.downloadReport('${request.id}')" title="Звіт">
                            <i class="fas fa-download"></i>
                        </button>
                        ${request.status === 'in-progress' && request.assignedTo ? 
                            `<button class="btn btn-sm btn-success btn-icon" onclick="requestsManager.chatWithTech('${request.id}')" title="Чат">
                                <i class="fas fa-comments"></i>
                            </button>` : ''}
                        ${request.status === 'pending' ? 
                            `<button class="btn btn-sm btn-warning btn-icon" onclick="requestsManager.cancelRequest('${request.id}')" title="Скасувати">
                                <i class="fas fa-times"></i>
                            </button>` : ''}
                    </div>
                </td>
            </tr>
        `);
    }

    getLiftName(liftId) {
        const lifts = JSON.parse(localStorage.getItem('lifts')) || [
            { id: 'lift1', model: 'Otis Gen2', location: 'вул. Центральна, 12' },
            { id: 'lift2', model: 'Schindler 3300', location: 'пр. Перемоги, 45' },
            { id: 'lift3', model: 'KONE MonoSpace', location: 'вул. Шевченка, 78' }
        ];
        const lift = lifts.find(l => l.id === liftId);
        return lift ? `${lift.model} - ${lift.location}` : 'Невідомий ліфт';
    }

    getPriorityText(priority) {
        const priorities = {
            'high': 'Високий',
            'medium': 'Середній',
            'low': 'Низький'
        };
        return priorities[priority] || priority;
    }

    getStatusText(status) {
        const statuses = {
            'pending': 'В очікуванні',
            'in-progress': 'В роботі',
            'completed': 'Завершено',
            'cancelled': 'Скасовано'
        };
        return statuses[status] || status;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('uk-UA');
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('uk-UA');
    }

    updateStats(requests = this.requests) {
        $('#totalRequests').text(requests.length);
        $('#requestsCount').text(requests.filter(req => req.status === 'pending' || req.status === 'in-progress').length);
        
        const pendingRequests = requests.filter(req => req.status === 'pending').length;
        $('#pendingRequests').text(pendingRequests);

        const inProgressRequests = requests.filter(req => req.status === 'in-progress').length;
        $('#inProgressRequests').text(inProgressRequests);

        const completedRequests = requests.filter(req => req.status === 'completed').length;
        $('#completedRequests').text(completedRequests);
    }

    updatePagination(requests) {
        const totalPages = Math.ceil(requests.length / this.itemsPerPage);
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
        const totalPages = Math.ceil(this.getFilteredRequests().length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.applyFilters();
        }
    }

    getFilteredRequests() {
        let filteredRequests = [...this.requests];

        if (this.filters.status !== 'all') {
            filteredRequests = filteredRequests.filter(request => 
                request.status === this.filters.status
            );
        }

        if (this.filters.priority !== 'all') {
            filteredRequests = filteredRequests.filter(request => 
                request.priority === this.filters.priority
            );
        }

        if (this.filters.lift !== 'all') {
            filteredRequests = filteredRequests.filter(request => 
                request.liftId === this.filters.lift
            );
        }

        return filteredRequests;
    }

    createNewRequest() {
        $('#newRequestForm')[0].reset();
        $('#photosPreview').empty();
        $('#newRequestModal').modal('show');
    }

    handlePhotoUpload(files) {
        const preview = $('#photosPreview');
        preview.empty();

        Array.from(files).slice(0, 5).forEach(file => {
            if (file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = $('<img>')
                        .attr('src', e.target.result)
                        .addClass('photo-preview')
                        .attr('title', file.name);
                    preview.append(img);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    async submitNewRequest() {
        const formData = {
            type: $('#requestType').val(),
            liftId: $('#requestLift').val(),
            priority: $('#requestPriority').val(),
            title: $('#requestTitle').val(),
            description: $('#requestDescription').val(),
            urgent: $('#urgentRequest').is(':checked')
        };

        if (!formData.type || !formData.liftId || !formData.title || !formData.description) {
            this.showNotification('Будь ласка, заповніть всі обов\'язкові поля', 'error');
            return;
        }

        let photoUrls = [];
        const photoFiles = $('#requestPhotos')[0].files;
        if (photoFiles.length > 0) {
            const data = new FormData();
            Array.from(photoFiles).slice(0, 5).forEach(file => {
                if (file.type.startsWith('image/')) {
                    data.append('files', file);
                }
            });
            try {
                const res = await fetch('http://localhost:5000/api/upload', {
                    method: 'POST',
                    body: data
                });
                const result = await res.json();
                photoUrls = result.files.map(f => f.url);
            } catch (err) {
                this.showNotification('Помилка завантаження фото', 'error');
            }
        }

        const newRequest = {
            id: Date.now().toString(),
            ...formData,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            photos: photoUrls,
            history: [{
                action: 'Створено заявку',
                timestamp: new Date().toISOString()
            }]
        };

        this.requests.unshift(newRequest);
        localStorage.setItem('maintenanceRequests', JSON.stringify(this.requests));
        $('#newRequestModal').modal('hide');
        this.applyFilters();
        this.showNotification('Заявку успішно створено!', 'success');
    }

    viewRequest(requestId) {
        const request = this.requests.find(req => req.id === requestId);
        if (!request) return;

        currentRequestId = requestId;
        const modalContent = this.createRequestDetails(request);
        $('#requestDetailsContent').html(modalContent);
        
        // Оновлення видимості кнопки чату
        if (request.status === 'in-progress' && request.assignedTo) {
            $('#chatWithTechBtn').show();
        } else {
            $('#chatWithTechBtn').hide();
        }
        
        $('#viewRequestModal').modal('show');
    }

    createRequestDetails(request) {
        const priorityClass = `priority-${request.priority}`;
        const statusClass = `status-${request.status}`;
        const priorityText = this.getPriorityText(request.priority);
        const statusText = this.getStatusText(request.status);
        const liftName = this.getLiftName(request.liftId);
        
        return `
            <div class="request-details">
                <div class="row mb-4">
                    <div class="col-md-8">
                        <h4>Заявка #${request.id}</h4>
                        <h5>${request.title}</h5>
                    </div>
                    <div class="col-md-4 text-right">
                        <span class="priority-badge ${priorityClass}">${priorityText}</span>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>

                <div class="row mb-4">
                    <div class="col-md-6">
                        <div class="info-item">
                            <strong><i class="fas fa-elevator"></i> Ліфт:</strong> ${liftName}
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-tag"></i> Тип:</strong> ${this.getRequestTypeText(request.type)}
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-calendar"></i> Створено:</strong> ${this.formatDateTime(request.createdAt)}
                        </div>
                    </div>
                    <div class="col-md-6">
                        ${request.assignedTo ? `
                            <div class="info-item">
                                <strong><i class="fas fa-user-cog"></i> Технік:</strong> ${request.technician || 'Невідомо'}
                            </div>
                        ` : ''}
                        ${request.startedAt ? `
                            <div class="info-item">
                                <strong><i class="fas fa-play-circle"></i> Початок робіт:</strong> ${this.formatDateTime(request.startedAt)}
                            </div>
                        ` : ''}
                        ${request.completedAt ? `
                            <div class="info-item">
                                <strong><i class="fas fa-check-circle"></i> Завершено:</strong> ${this.formatDateTime(request.completedAt)}
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="card-title"><i class="fas fa-align-left"></i> Опис проблеми</h5>
                    </div>
                    <div class="card-body">
                        <p class="card-text">${request.description || 'Немає детального опису'}</p>
                        ${request.urgent ? '<span class="badge badge-danger">Термінова заявка</span>' : ''}
                    </div>
                </div>

                ${request.photos && request.photos.length > 0 ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-images"></i> Фотографії</h5>
                        </div>
                        <div class="card-body">
                            <div class="d-flex flex-wrap">
                                ${request.photos.map(photo => `
                                    <img src="../../assets/img/requests/${photo}" 
                                         class="photo-preview mr-2 mb-2" 
                                         style="width: 100px; height: 100px; object-fit: cover;"
                                         onerror="this.src='../../assets/img/requests/default.jpg'">
                                `).join('')}
                            </div>
                        </div>
                    </div>
                ` : ''}

                ${request.cost ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-money-bill-wave"></i> Вартість</h5>
                        </div>
                        <div class="card-body">
                            <h4 class="text-success">₴${request.cost.toLocaleString('uk-UA', { minimumFractionDigits: 2 })}</h4>
                        </div>
                    </div>
                ` : request.estimatedCost ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-money-bill-wave"></i> Орієнтовна вартість</h5>
                        </div>
                        <div class="card-body">
                            <h4 class="text-warning">₴${request.estimatedCost.toLocaleString('uk-UA', { minimumFractionDigits: 2 })}</h4>
                        </div>
                    </div>
                ` : ''}

                ${request.rating ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title"><i class="fas fa-star"></i> Оцінка якості</h5>
                        </div>
                        <div class="card-body">
                            <div class="rating-stars h3">
                                ${'⭐'.repeat(request.rating)}${'☆'.repeat(5 - request.rating)}
                            </div>
                        </div>
                    </div>
                ` : ''}

                ${request.history && request.history.length > 0 ? `
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="card-title"><i class="fas fa-history"></i> Історія дій</h5>
                    </div>
                    <div class="card-body">
                        <ul class="list-group">
                            ${request.history.map(h => `<li class="list-group-item"><b>${h.action}</b> <span class="text-muted float-right">${new Date(h.timestamp).toLocaleString('uk-UA')}</span></li>`).join('')}
                        </ul>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    getRequestTypeText(type) {
        const types = {
            'maintenance': 'Технічне обслуговування',
            'repair': 'Ремонт',
            'inspection': 'Технічний огляд',
            'consultation': 'Консультація',
            'emergency': 'Аварійна ситуація'
        };
        return types[type] || type;
    }

    downloadReport(requestId) {
        const request = this.requests.find(req => req.id === requestId);
        if (!request) return;

        this.showNotification(`Підготовка звіту для заявки #${requestId}...`, 'info');
        
        // Імітація створення PDF
        setTimeout(() => {
            const reportContent = this.generateReportContent(request);
            const blob = new Blob([reportContent], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `звіт_заявка_${requestId}.pdf`;
            link.click();
            
            this.showNotification('Звіт успішно завантажено', 'success');
        }, 1500);
    }

    generateReportContent(request) {
        // Імітація створення звіту
        return `
            ЗВІТ ПО ЗАЯВЦІ #${request.id}
            =============================
            
            Заголовок: ${request.title}
            Тип: ${this.getRequestTypeText(request.type)}
            Ліфт: ${this.getLiftName(request.liftId)}
            Статус: ${this.getStatusText(request.status)}
            Пріоритет: ${this.getPriorityText(request.priority)}
            
            Створено: ${this.formatDateTime(request.createdAt)}
            ${request.startedAt ? `Початок робіт: ${this.formatDateTime(request.startedAt)}` : ''}
            ${request.completedAt ? `Завершено: ${this.formatDateTime(request.completedAt)}` : ''}
            
            Опис:
            ${request.description}
            
            ${request.cost ? `Вартість: ₴${request.cost.toLocaleString('uk-UA', { minimumFractionDigits: 2 })}` : ''}
            ${request.rating ? `Оцінка: ${'⭐'.repeat(request.rating)}` : ''}
            
            =============================
            Згенеровано: ${new Date().toLocaleString('uk-UA')}
        `;
    }

    chatWithTech(requestId) {
        const request = this.requests.find(req => req.id === requestId);
        if (!request || !request.assignedTo) {
            this.showNotification('Технік не призначений для цієї заявки', 'warning');
            return;
        }

        this.showNotification('Відкриття чату з техніком...', 'info');
        
        // Імітація переходу в чат
        setTimeout(() => {
            window.open(`../../chat.html?techId=${request.assignedTo}&requestId=${requestId}`, '_blank');
        }, 1000);
    }

    setRequestStatus(request, newStatus) {
        const oldStatus = request.status;
        request.status = newStatus;
        request.updatedAt = new Date().toISOString();
        // Логування дії
        if (!request.history) request.history = [];
        request.history.push({
            action: `Статус змінено: ${oldStatus} → ${newStatus}`,
            timestamp: request.updatedAt
        });
        localStorage.setItem('maintenanceRequests', JSON.stringify(this.requests));
        this.applyFilters();
        // Push-сповіщення
        if (window.pushNotificationsClient) {
            if (newStatus === 'completed') {
                window.pushNotificationsClient.notifyRequestCompleted(request);
            } else if (newStatus === 'cancelled') {
                window.pushNotificationsClient.send('Заявку скасовано', `Заявка №${request.id} була скасована.`);
            } else if (newStatus === 'in-progress') {
                window.pushNotificationsClient.send('Заявка в роботі', `Заявка №${request.id} взята в роботу.`);
            }
        }
    }

    // Приклад використання централізованої зміни статусу
    startRequest(requestId) {
        const request = this.requests.find(req => req.id === requestId);
        if (!request) return;
        this.setRequestStatus(request, 'in-progress');
        this.showNotification('Заявка взята в роботу', 'info');
    }
    completeRequest(requestId) {
        const request = this.requests.find(req => req.id === requestId);
        if (!request) return;
        this.setRequestStatus(request, 'completed');
        this.showNotification('Заявку виконано!', 'success');
    }

    cancelRequest(requestId) {
        const request = this.requests.find(req => req.id === requestId);
        if (!request) return;

        if (confirm('Ви впевнені, що хочете скасувати цю заявку?')) {
            this.setRequestStatus(request, 'cancelled');
            this.showNotification('Заявку скасовано', 'success');
        }
    }

    exportRequests() {
        const filteredRequests = this.getFilteredRequests();
        
        if (filteredRequests.length === 0) {
            this.showNotification('Немає заявок для експорту', 'warning');
            return;
        }

        this.showNotification('Підготовка експорту...', 'info');
        
        // Створення CSV
        const csvContent = this.convertToCSV(filteredRequests);
        this.downloadCSV(csvContent, `заявки_${new Date().toISOString().split('T')[0]}.csv`);
    }

    convertToCSV(requests) {
        const headers = ['ID', 'Тип', 'Ліфт', 'Заголовок', 'Пріоритет', 'Статус', 'Технік', 'Створено'];
        const rows = requests.map(request => [
            request.id,
            this.getRequestTypeText(request.type),
            this.getLiftName(request.liftId),
            request.title,
            this.getPriorityText(request.priority),
            this.getStatusText(request.status),
            request.technician || 'Не призначено',
            this.formatDate(request.createdAt)
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

    printRequests() {
        window.print();
    }

    createMaintenanceRequest() {
        this.openRequestModal('maintenance');
    }

    createRepairRequest() {
        this.openRequestModal('repair');
    }

    createConsultationRequest() {
        this.openRequestModal('consultation');
    }

    createInspectionRequest() {
        this.openRequestModal('inspection');
    }

    openRequestModal(type) {
        $('#newRequestForm')[0].reset();
        $('#requestType').val(type);
        this.updateRequestTitle(type);
        $('#photosPreview').empty();
        $('#newRequestModal').modal('show');
    }

    showNotification(message, type = 'info') {
        if (typeof Swal !== 'undefined') {
            const Toast = Swal.mixin({
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
            const iconMap = { success: 'success', error: 'error', warning: 'warning', info: 'info' };
            Toast.fire({ icon: iconMap[type] || 'info', title: message });
        } else {
            alert(message);
        }
    }
}

// Ініціалізація
$(document).ready(function() {
    window.requestsManager = new RequestsManager();
});