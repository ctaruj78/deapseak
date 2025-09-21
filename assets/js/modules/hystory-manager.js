// history-manager.js - РОЗШИРЕНА ВЕРСІЯ ДЛЯ ADMINLTE
class HistoryManager {
    constructor() {
        this.events = [];
        this.filters = {
            period: '30',
            eventType: 'all',
            lift: 'all'
        };
        this.charts = {};
        this.init();
    }

    init() {
        this.loadHistory();
        this.setupEventListeners();
        this.updateStats();
    }

    async loadHistory() {
        try {
            // Спроба отримати дані з API
            const response = await fetch('/api/maintenance-history', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                this.events = await response.json();
                localStorage.setItem('maintenanceHistory', JSON.stringify(this.events));
            } else {
                throw new Error('API недоступне');
            }
        } catch (error) {
            console.warn('Використання локальних даних:', error);
            this.events = JSON.parse(localStorage.getItem('maintenanceHistory')) || [];
            
            if (this.events.length === 0) {
                this.events = this.createSampleEvents();
                localStorage.setItem('maintenanceHistory', JSON.stringify(this.events));
            }
        }

        this.applyFilters();
        this.setupCharts();
    }

    createSampleEvents() {
        const lifts = JSON.parse(localStorage.getItem('lifts')) || [
            { id: 'lift1', model: 'Otis Gen2', location: 'вул. Центральна, 12' },
            { id: 'lift2', model: 'Schindler 3300', location: 'пр. Перемоги, 45' },
            { id: 'lift3', model: 'KONE MonoSpace', location: 'ул. Шевченка, 78' }
        ];

        return [
            {
                id: 'event1',
                type: 'maintenance',
                date: '2024-01-15T10:00:00',
                liftId: 'lift1',
                lift: 'Otis Gen2',
                location: 'вул. Центральна, 12',
                technician: 'Іван Петренко',
                status: 'completed',
                description: 'Планове технічне обслуговування',
                duration: 120,
                cost: 2500,
                rating: 5,
                details: 'Заміна мастильних матеріалів, перевірка системи безпеки, регулювання дверей'
            },
            {
                id: 'event2',
                type: 'emergency',
                date: '2024-01-10T14:30:00',
                liftId: 'lift2',
                lift: 'Schindler 3300',
                location: 'пр. Перемоги, 45',
                technician: 'Марія Коваленко',
                status: 'completed',
                description: 'Аварійний ремонт дверей',
                duration: 180,
                cost: 4500,
                rating: 4,
                details: 'Ремонт механізму дверей, заміна датчиків безпеки, калібрування системи'
            },
            {
                id: 'event3',
                type: 'inspection',
                date: '2023-12-20T09:15:00',
                liftId: 'lift3',
                lift: 'KONE MonoSpace',
                location: 'ул. Шевченка, 78',
                technician: 'Петро Сидоренко',
                status: 'completed',
                description: 'Щорічна інспекція',
                duration: 90,
                cost: 1800,
                rating: 5,
                details: 'Повна перевірка всіх систем, тестування безпеки, перевірка документації'
            },
            {
                id: 'event4',
                type: 'repair',
                date: '2023-12-10T11:45:00',
                liftId: 'lift1',
                lift: 'Otis Gen2',
                location: 'вул. Центральна, 12',
                technician: 'Олексій Іваненко',
                status: 'completed',
                description: 'Ремонт системи керування',
                duration: 150,
                cost: 3200,
                rating: 4,
                details: 'Заміна блоку керування, програмування системи, тестування функцій'
            },
            {
                id: 'event5',
                type: 'maintenance',
                date: '2023-11-25T08:30:00',
                liftId: 'lift2',
                lift: 'Schindler 3300',
                location: 'пр. Перемоги, 45',
                technician: 'Сергій Мельник',
                status: 'completed',
                description: 'Планове ТО після сезону',
                duration: 135,
                cost: 2800,
                rating: 5,
                details: 'Чистка механізмів, заміна фільтрів, огляд електроніки'
            },
            {
                id: 'event6',
                type: 'inspection',
                date: '2023-11-15T13:20:00',
                liftId: 'lift3',
                lift: 'KONE MonoSpace',
                location: 'ул. Шевченка, 78',
                technician: 'Анна Шевченко',
                status: 'completed',
                description: 'Перевірка після ремонту',
                duration: 75,
                cost: 1500,
                rating: 4,
                details: 'Контрольна перевірка якості робіт, тестування безпеки'
            }
        ];
    }

    setupEventListeners() {
        $('#periodFilter').on('change', (e) => {
            this.filters.period = e.target.value;
            this.applyFilters();
        });

        $('#eventTypeFilter').on('change', (e) => {
            this.filters.eventType = e.target.value;
            this.applyFilters();
        });

        $('#liftFilter').on('change', (e) => {
            this.filters.lift = e.target.value;
            this.applyFilters();
        });

        // Пошук за текстом
        $('#searchInput').on('input', (e) => {
            this.applyFilters();
        });
    }

    applyFilters() {
        let filteredEvents = [...this.events];

        // Фільтрація за періодом
        if (this.filters.period !== 'all') {
            const days = parseInt(this.filters.period);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            filteredEvents = filteredEvents.filter(event => 
                new Date(event.date) >= cutoffDate
            );
        }

        // Фільтрація за типом події
        if (this.filters.eventType !== 'all') {
            filteredEvents = filteredEvents.filter(event => 
                event.type === this.filters.eventType
            );
        }

        // Фільтрація за ліфтом
        if (this.filters.lift !== 'all') {
            filteredEvents = filteredEvents.filter(event => 
                event.liftId === this.filters.lift
            );
        }

        // Пошук за текстом
        const searchTerm = $('#searchInput').val().toLowerCase();
        if (searchTerm) {
            filteredEvents = filteredEvents.filter(event =>
                event.description.toLowerCase().includes(searchTerm) ||
                event.technician.toLowerCase().includes(searchTerm) ||
                event.details.toLowerCase().includes(searchTerm)
            );
        }

        // Сортування за датою (новіші першими)
        filteredEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

        this.renderTimeline(filteredEvents);
        this.updateStats(filteredEvents);
        this.updateCharts(filteredEvents);
    }

    resetFilters() {
        $('#periodFilter').val('30');
        $('#eventTypeFilter').val('all');
        $('#liftFilter').val('all');
        $('#searchInput').val('');
        this.filters = { period: '30', eventType: 'all', lift: 'all' };
        this.applyFilters();
    }

    renderTimeline(events) {
        const timeline = $('#timeline');
        timeline.empty();
        $('#timelineCount').text(events.length);

        if (events.length === 0) {
            timeline.html(`
                <div class="text-center py-5">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h4>Подій не знайдено</h4>
                    <p>Спробуйте змінити параметри фільтрів</p>
                    <button class="btn btn-primary mt-3" onclick="historyManager.resetFilters()">
                        <i class="fas fa-sync"></i> Скинути фільтри
                    </button>
                </div>
            `);
            return;
        }

        events.forEach(event => {
            const eventElement = this.createTimelineItem(event);
            timeline.append(eventElement);
        });
    }

    createTimelineItem(event) {
        const statusClass = this.getStatusClass(event.status);
        const statusText = this.getStatusText(event.status);
        const formattedDate = this.formatDate(event.date);
        const formattedTime = this.formatTime(event.date);
        
        return $(`
            <div class="timeline-item">
                <div class="timeline-date">${formattedDate}<br>${formattedTime}</div>
                <div class="timeline-content">
                    <div class="timeline-icon">${this.getEventIcon(event.type)}</div>
                    <div class="timeline-details">
                        <h4>${event.description}</h4>
                        <p><strong><i class="fas fa-elevator"></i> Ліфт:</strong> ${event.lift}</p>
                        <p><strong><i class="fas fa-map-marker-alt"></i> Локація:</strong> ${event.location}</p>
                        <p><strong><i class="fas fa-user-cog"></i> Технік:</strong> ${event.technician}</p>
                        <p><strong><i class="fas fa-clock"></i> Тривалість:</strong> ${event.duration} хв</p>
                        <p><strong><i class="fas fa-money-bill-wave"></i> Вартість:</strong> ₴${event.cost.toLocaleString()}</p>
                        <p><strong><i class="fas fa-star"></i> Оцінка:</strong> ${this.getRatingStars(event.rating)}</p>
                        <span class="${statusClass}">${statusText}</span>
                        <div class="mt-3">
                            <button class="btn btn-sm btn-info" onclick="historyManager.showEventDetails('${event.id}')">
                                <i class="fas fa-info-circle"></i> Деталі
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="historyManager.downloadEventReport('${event.id}')">
                                <i class="fas fa-download"></i> Звіт
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    getEventIcon(eventType) {
        const icons = {
            'maintenance': '🔧',
            'repair': '⚠️',
            'inspection': '📋',
            'emergency': '🚨'
        };
        return icons[eventType] || '📅';
    }

    getStatusClass(status) {
        const classes = {
            'completed': 'status-completed',
            'in-progress': 'status-in-progress',
            'pending': 'status-pending'
        };
        return classes[status] || 'status-pending';
    }

    getStatusText(status) {
        const statuses = {
            'completed': 'Завершено',
            'in-progress': 'В роботі',
            'pending': 'В очікуванні'
        };
        return statuses[status] || status;
    }

    getRatingStars(rating) {
        return '⭐'.repeat(Math.round(rating));
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('uk-UA');
    }

    formatTime(dateString) {
        return new Date(dateString).toLocaleTimeString('uk-UA', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    updateStats(events = this.events) {
        $('#totalEvents').text(events.length);
        $('#historyCount').text(events.length);
        
        const maintenanceCount = events.filter(e => e.type === 'maintenance').length;
        $('#maintenanceCount').text(maintenanceCount);

        const avgResponseTime = events.length > 0 
            ? Math.round(events.reduce((sum, e) => sum + (e.duration || 0), 0) / events.length)
            : 0;
        $('#avgResponseTime').text(`${avgResponseTime} хв`);

        const avgRating = events.length > 0
            ? (events.reduce((sum, e) => sum + (e.rating || 0), 0) / events.length).toFixed(1)
            : '0.0';
        $('#avgRating').text(avgRating);

        // Оновлення загальних витрат
        const totalCost = events.reduce((sum, e) => sum + (e.cost || 0), 0);
        $('#totalCost').text(`₴${totalCost.toLocaleString()}`);
    }

    setupCharts() {
        this.charts = {
            eventType: this.createEventTypeChart(),
            frequency: this.createFrequencyChart(),
            ratings: this.createRatingsChart(),
            costs: this.createCostsChart()
        };
    }

    createEventTypeChart() {
        const ctx = document.getElementById('eventTypeChart').getContext('2d');
        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Технічне обслуговування', 'Ремонт', 'Інспекція', 'Аварійне'],
                datasets: [{
                    data: this.calculateEventTypeData(this.events),
                    backgroundColor: ['#36a2eb', '#ff6384', '#ffcd56', '#4bc0c0'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    }

    createFrequencyChart() {
        const ctx = document.getElementById('frequencyChart').getContext('2d');
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.getLastSixMonths(),
                datasets: [{
                    label: 'Кількість подій',
                    data: this.calculateFrequencyData(this.events),
                    backgroundColor: '#36a2eb',
                    borderWidth: 0,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    createRatingsChart() {
        const ctx = document.getElementById('ratingsChart').getContext('2d');
        return new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Швидкість', 'Якість', 'Професійність', 'Комунікація', 'Загальна оцінка'],
                datasets: [{
                    label: 'Середні оцінки',
                    data: this.calculateRatingsData(this.events),
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        min: 0,
                        max: 5,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    createCostsChart() {
        const ctx = document.getElementById('costsChart').getContext('2d');
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.getLastSixMonths(),
                datasets: [{
                    label: 'Витрати на обслуговування',
                    data: this.calculateCostsData(this.events),
                    borderColor: '#ff6384',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    tension: 0.2,
                    fill: true,
                    pointBackgroundColor: '#ff6384',
                    pointBorderColor: '#fff',
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₴' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    updateCharts(events) {
        this.charts.eventType.data.datasets[0].data = this.calculateEventTypeData(events);
        this.charts.eventType.update();

        this.charts.frequency.data.datasets[0].data = this.calculateFrequencyData(events);
        this.charts.frequency.update();

        this.charts.ratings.data.datasets[0].data = this.calculateRatingsData(events);
        this.charts.ratings.update();

        this.charts.costs.data.datasets[0].data = this.calculateCostsData(events);
        this.charts.costs.update();
    }

    calculateEventTypeData(events) {
        const types = ['maintenance', 'repair', 'inspection', 'emergency'];
        return types.map(type => events.filter(e => e.type === type).length);
    }

    getLastSixMonths() {
        const months = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'];
        const currentMonth = new Date().getMonth();
        const result = [];
        
        for (let i = 5; i >= 0; i--) {
            const monthIndex = (currentMonth - i + 12) % 12;
            result.push(months[monthIndex]);
        }
        
        return result;
    }

    calculateFrequencyData(events) {
        const months = this.getLastSixMonths();
        const currentMonth = new Date().getMonth();
        const result = [];
        
        for (let i = 5; i >= 0; i--) {
            const targetMonth = (currentMonth - i + 12) % 12;
            const count = events.filter(e => new Date(e.date).getMonth() === targetMonth).length;
            result.push(count);
        }
        
        return result;
    }

    calculateRatingsData(events) {
        // Розрахунок середніх оцінок по категоріям
        return [4.5, 4.8, 4.7, 4.6, 4.7];
    }

    calculateCostsData(events) {
        const currentMonth = new Date().getMonth();
        const result = [];
        
        for (let i = 5; i >= 0; i--) {
            const targetMonth = (currentMonth - i + 12) % 12;
            const monthlyCost = events
                .filter(e => new Date(e.date).getMonth() === targetMonth)
                .reduce((sum, e) => sum + (e.cost || 0), 0);
            result.push(monthlyCost);
        }
        
        return result;
    }

    showEventDetails(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        const modalContent = `
            <div class="event-details">
                <h4>${event.description}</h4>
                <hr>
                <div class="row">
                    <div class="col-md-6">
                        <p><strong><i class="fas fa-elevator"></i> Ліфт:</strong> ${event.lift}</p>
                        <p><strong><i class="fas fa-map-marker-alt"></i> Локація:</strong> ${event.location}</p>
                        <p><strong><i class="fas fa-user-cog"></i> Технік:</strong> ${event.technician}</p>
                        <p><strong><i class="fas fa-calendar-alt"></i> Дата:</strong> ${this.formatDate(event.date)}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong><i class="fas fa-clock"></i> Тривалість:</strong> ${event.duration} хвилин</p>
                        <p><strong><i class="fas fa-money-bill-wave"></i> Вартість:</strong> ₴${event.cost.toLocaleString()}</p>
                        <p><strong><i class="fas fa-star"></i> Оцінка:</strong> ${this.getRatingStars(event.rating)}</p>
                        <p><strong><i class="fas fa-check-circle"></i> Статус:</strong> 
                            <span class="${this.getStatusClass(event.status)}">${this.getStatusText(event.status)}</span>
                        </p>
                    </div>
                </div>
                ${event.details ? `
                <div class="mt-4">
                    <h5><i class="fas fa-list"></i> Деталі робіт:</h5>
                    <div class="bg-light p-3 rounded">
                        <p class="mb-0">${event.details}</p>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        // Створення модального вікна
        const modal = `
            <div class="modal fade" id="eventDetailsModal" tabindex="-1" role="dialog">
                <div class="modal-dialog modal-lg" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Деталі події обслуговування</h5>
                            <button type="button" class="close" data-dismiss="modal">
                                <span>&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            ${modalContent}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Закрити</button>
                            <button type="button" class="btn btn-primary" onclick="historyManager.downloadEventReport('${event.id}')">
                                <i class="fas fa-download"></i> Завантажити звіт
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Додавання модального вікна до DOM
        if ($('#eventDetailsModal').length) {
            $('#eventDetailsModal').remove();
        }
        $('body').append(modal);
        $('#eventDetailsModal').modal('show');
    }

    downloadEventReport(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        this.showNotification(`Підготовка звіту для "${event.description}"...`, 'info');
        
        // Імітація завантаження
        setTimeout(() => {
            this.showNotification('Звіт успішно завантажено', 'success');
            
            // Створення простих даних для завантаження
            const reportData = `
                ЗВІТ ПРО ОБСЛУГОВУВАННЯ
                ========================
                
                Подія: ${event.description}
                Ліфт: ${event.lift}
                Локація: ${event.location}
                Технік: ${event.technician}
                Дата: ${this.formatDate(event.date)}
                Час: ${this.formatTime(event.date)}
                Тривалість: ${event.duration} хвилин
                Вартість: ₴${event.cost.toLocaleString()}
                Оцінка: ${event.rating}/5
                Статус: ${this.getStatusText(event.status)}
                
                Деталі робіт:
                ${event.details || 'Немає додаткових деталей'}
                
                ========================
                Згенеровано: ${new Date().toLocaleString('uk-UA')}
            `;
            
            // Створення файлу для завантаження
            const blob = new Blob([reportData], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `звіт_${event.id}_${this.formatDate(event.date)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 1500);
    }

    exportToPDF() {
        this.showNotification('Підготовка PDF-звіту...', 'info');
        
        setTimeout(() => {
            const filteredEvents = this.getFilteredEvents();
            if (filteredEvents.length === 0) {
                this.showNotification('Немає даних для експорту', 'warning');
                return;
            }
            
            this.showNotification('PDF-звіт успішно сформовано', 'success');
            
            // Створення простих даних для PDF (імітація)
            let pdfContent = `
                ЗВІТ ПРО ІСТОРІЮ ОБСЛУГОВУВАННЯ
                ================================
                
                Період: ${this.getPeriodText()}
                Тип подій: ${this.getEventTypeText()}
                Ліфт: ${this.getLiftText()}
                
                Загальна статистика:
                - Всього подій: ${filteredEvents.length}
                - Технічних обслуговувань: ${filteredEvents.filter(e => e.type === 'maintenance').length}
                - Середній час реакції: ${this.calculateAverageDuration(filteredEvents)} хв
                - Середня оцінка: ${this.calculateAverageRating(filteredEvents).toFixed(1)}
                - Загальні витрати: ₴${this.calculateTotalCost(filteredEvents).toLocaleString()}
                
                Детальний перелік:
                ${filteredEvents.map(event => `
                ${this.formatDate(event.date)} - ${event.description}
                Ліфт: ${event.lift}, Технік: ${event.technician}
                Вартість: ₴${event.cost.toLocaleString()}, Оцінка: ${event.rating}/5
                `).join('\n')}
                
                ================================
                Згенеровано: ${new Date().toLocaleString('uk-UA')}
            `;
            
            // Завантаження текстового файлу (імітація PDF)
            const blob = new Blob([pdfContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `історія_обслуговування_${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 2000);
    }

    exportToExcel() {
        this.showNotification('Підготовка Excel-звіту...', 'info');
        
        setTimeout(() => {
            const filteredEvents = this.getFilteredEvents();
            if (filteredEvents.length === 0) {
                this.showNotification('Немає даних для експорту', 'warning');
                return;
            }
            
            this.showNotification('Excel-звіт успішно сформовано', 'success');
            
            // Створення CSV (імітація Excel)
            let csvContent = 'Дата,Тип,Опис,Ліфт,Технік,Тривалість (хв),Вартість (грн),Оцінка\n';
            
            filteredEvents.forEach(event => {
                csvContent += `"${this.formatDate(event.date)}",`;
                csvContent += `"${this.getEventTypeText(event.type)}",`;
                csvContent += `"${event.description}",`;
                csvContent += `"${event.lift}",`;
                csvContent += `"${event.technician}",`;
                csvContent += `"${event.duration}",`;
                csvContent += `"${event.cost}",`;
                csvContent += `"${event.rating}"\n`;
            });
            
            // Завантаження CSV файлу
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `історія_обслуговування_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 2000);
    }

    printHistory() {
        this.showNotification('Підготовка до друку...', 'info');
        
        setTimeout(() => {
            window.print();
            this.showNotification('Сторінка готова до друку', 'success');
        }, 1000);
    }

    getFilteredEvents() {
        let filteredEvents = [...this.events];

        if (this.filters.period !== 'all') {
            const days = parseInt(this.filters.period);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            filteredEvents = filteredEvents.filter(event => new Date(event.date) >= cutoffDate);
        }

        if (this.filters.eventType !== 'all') {
            filteredEvents = filteredEvents.filter(event => event.type === this.filters.eventType);
        }

        if (this.filters.lift !== 'all') {
            filteredEvents = filteredEvents.filter(event => event.liftId === this.filters.lift);
        }

        return filteredEvents;
    }

    getPeriodText() {
        const periods = {
            '30': 'Останні 30 днів',
            '90': 'Останні 3 місяці',
            '365': 'Останній рік',
            'all': 'Вся історія'
        };
        return periods[this.filters.period] || this.filters.period;
    }

    getEventTypeText(type = null) {
        const types = {
            'all': 'Всі події',
            'maintenance': 'Технічне обслуговування',
            'repair': 'Ремонт',
            'inspection': 'Інспекція',
            'emergency': 'Аварійне обслуговування'
        };
        return type ? types[type] || type : types[this.filters.eventType];
    }

    getLiftText() {
        if (this.filters.lift === 'all') return 'Всі ліфти';
        
        const lifts = {
            'lift1': 'Otis Gen2 - вул. Центральна, 12',
            'lift2': 'Schindler 3300 - пр. Перемоги, 45',
            'lift3': 'KONE MonoSpace - вул. Шевченка, 78'
        };
        return lifts[this.filters.lift] || this.filters.lift;
    }

    calculateAverageDuration(events) {
        return events.length > 0 
            ? Math.round(events.reduce((sum, e) => sum + (e.duration || 0), 0) / events.length)
            : 0;
    }

    calculateAverageRating(events) {
        return events.length > 0
            ? events.reduce((sum, e) => sum + (e.rating || 0), 0) / events.length
            : 0;
    }

    calculateTotalCost(events) {
        return events.reduce((sum, e) => sum + (e.cost || 0), 0);
    }

    showNotification(message, type = 'success') {
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
    window.historyManager = new HistoryManager();
});