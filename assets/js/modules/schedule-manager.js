// schedule-manager.js — Gestor de calendário para técnicos
class ScheduleManager {
    constructor() {
        this.events = [];
        this.calendar = null;
        this.currentView = 'calendar';
        this.init();
    }

    init() {
        this.events = this.loadEvents();
        this.setupEventListeners();
        this.initCalendar();
    }

    loadEvents() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return [
            {
                id: 'event-1',
                title: 'Manutenção técnica - Otis Gen2',
                type: 'maintenance',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0),
                lift: 'Otis Gen2 - R. Central, 12',
                priority: 'high',
                status: 'scheduled',
                description: 'Manutenção técnica mensal programada',
                technician: 'Tech One'
            },
            {
                id: 'event-2',
                title: 'Inspeção de segurança - Schindler 3300',
                type: 'inspection',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0),
                lift: 'Schindler 3300 - Av. da Liberdade, 45',
                priority: 'medium',
                status: 'scheduled',
                description: 'Verificação dos sistemas de segurança',
                technician: 'Tech One'
            },
            {
                id: 'event-3',
                title: 'Reparação de emergência - KONE MonoSpace',
                type: 'emergency',
                start: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 0),
                end: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 13, 0),
                lift: 'KONE MonoSpace - R. do Comércio, 78',
                priority: 'high',
                status: 'scheduled',
                description: 'Reparação de portas do elevador',
                technician: 'Tech One'
            },
            {
                id: 'event-4',
                title: 'Consulta com cliente',
                type: 'task',
                start: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 15, 0),
                end: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 16, 0),
                lift: 'Escritório',
                priority: 'medium',
                status: 'scheduled',
                description: 'Consulta sobre modernização do elevador',
                technician: 'Tech One'
            }
        ];
    }

    setupEventListeners() {
        $('#workSchedule, #notifications').on('change', () => {
            this.showNotification('Definições actualizadas', 'info');
        });
    }

    initCalendar() {
        const calendarEl = document.getElementById('calendar');

        this.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            buttonText: {
                today: 'Hoje',
                month: 'Mês',
                week: 'Semana',
                day: 'Dia'
            },
            locale: 'pt',
            events: this.formatEventsForCalendar(),
            eventClick: (info) => {
                this.viewEvent(info.event.id);
            },
            eventContent: (arg) => {
                return {
                    html: `
                        <div class="fc-event-content">
                            <div class="fc-event-title">${arg.event.title}</div>
                            <div class="fc-event-time">${arg.timeText}</div>
                        </div>
                    `
                };
            },
            eventClassNames: (arg) => {
                return [`event-${arg.event.extendedProps.type}`];
            },
            height: 'auto',
            nowIndicator: true,
            editable: false,
            selectable: false,
            businessHours: {
                daysOfWeek: [1, 2, 3, 4, 5],
                startTime: '09:00',
                endTime: '18:00'
            }
        });

        this.calendar.render();
    }

    formatEventsForCalendar() {
        return this.events.map(event => ({
            id: event.id,
            title: event.title,
            start: event.start,
            end: event.end,
            extendedProps: {
                type: event.type,
                lift: event.lift,
                priority: event.priority,
                status: event.status,
                description: event.description,
                technician: event.technician
            },
            backgroundColor: this.getEventColor(event.type),
            borderColor: this.getEventColor(event.type),
            textColor: '#ffffff'
        }));
    }

    getEventColor(eventType) {
        const colors = {
            'task': '#6a11cb',
            'inspection': '#28a745',
            'maintenance': '#ffc107',
            'emergency': '#dc3545'
        };
        return colors[eventType] || '#007bff';
    }

    renderEvents() {
        this.renderEventsList();
        this.updateCalendar();
        this.updateStats();
    }

    renderEventsList() {
        const tbody = $('#eventsList');
        tbody.empty();

        if (this.events.length === 0) {
            tbody.html(`
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <i class="fas fa-calendar-plus fa-3x text-muted mb-3"></i>
                        <h4>Nenhum evento encontrado</h4>
                        <p>Crie o primeiro evento no seu calendário</p>
                    </td>
                </tr>
            `);
            return;
        }

        this.events.forEach(event => {
            const row = this.createEventRow(event);
            tbody.append(row);
        });
    }

    createEventRow(event) {
        const typeText = this.getTypeText(event.type);
        const priorityText = this.getPriorityText(event.priority);
        const statusText = this.getStatusText(event.status);

        return $(`
            <tr>
                <td>${this.formatDate(event.start)}</td>
                <td>${this.formatTime(event.start)}-${this.formatTime(event.end)}</td>
                <td>${typeText}</td>
                <td>
                    <strong>${event.title}</strong>
                    <br>
                    <small class="text-muted">${event.description}</small>
                </td>
                <td>${event.lift}</td>
                <td><span class="badge badge-${this.getStatusClass(event.status)}">${statusText}</span></td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-info btn-icon" onclick="scheduleManager.viewEvent('${event.id}')" title="Ver">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning btn-icon" onclick="scheduleManager.editEvent('${event.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${event.status === 'scheduled' ?
                            `<button class="btn btn-sm btn-success btn-icon" onclick="scheduleManager.startEvent('${event.id}')" title="Iniciar">
                                <i class="fas fa-play"></i>
                            </button>` : ''}
                    </div>
                </td>
            </tr>
        `);
    }

    getTypeText(type) {
        const types = {
            'task': 'Tarefa',
            'inspection': 'Inspeção',
            'maintenance': 'Manutenção',
            'emergency': 'Avaria'
        };
        return types[type] || type;
    }

    getPriorityText(priority) {
        const priorities = {
            'high': 'Alto',
            'medium': 'Médio',
            'low': 'Baixo'
        };
        return priorities[priority] || priority;
    }

    getStatusText(status) {
        const statuses = {
            'scheduled': 'Agendado',
            'in-progress': 'Em progresso',
            'completed': 'Concluído',
            'cancelled': 'Cancelado'
        };
        return statuses[status] || status;
    }

    getStatusClass(status) {
        const classes = {
            'scheduled': 'info',
            'in-progress': 'warning',
            'completed': 'success',
            'cancelled': 'danger'
        };
        return classes[status] || 'secondary';
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('pt-PT');
    }

    formatTime(date) {
        return new Date(date).toLocaleTimeString('pt-PT', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    updateCalendar() {
        if (this.calendar) {
            this.calendar.removeAllEvents();
            this.calendar.addEventSource(this.formatEventsForCalendar());
        }
    }

    updateStats() {
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
        const weekEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - today.getDay()));

        $('#totalEvents').text(this.events.length);
        $('#scheduleBadge').text(this.events.filter(e => new Date(e.start) > new Date()).length);

        const todayEvents = this.events.filter(event =>
            new Date(event.start) >= todayStart && new Date(event.start) < todayEnd
        );
        $('#todayEvents').text(todayEvents.length);

        const weekEvents = this.events.filter(event =>
            new Date(event.start) >= weekStart && new Date(event.start) <= weekEnd
        );
        $('#upcomingEvents').text(weekEvents.length);

        const urgentEvents = this.events.filter(event =>
            event.priority === 'high' && event.status === 'scheduled'
        );
        $('#urgentEvents').text(urgentEvents.length);
    }

    showCalendarView() {
        $('#calendarView').show();
        $('#listView').hide();
        $('#dayView').hide();
        $('.view-toggle .btn').removeClass('active');
        $('.view-toggle .btn:first').addClass('active');
        this.currentView = 'calendar';
    }

    showListView() {
        $('#calendarView').hide();
        $('#listView').show();
        $('#dayView').hide();
        $('.view-toggle .btn').removeClass('active');
        $('.view-toggle .btn:nth-child(2)').addClass('active');
        this.currentView = 'list';
        this.renderEventsList();
    }

    showDayView() {
        $('#calendarView').hide();
        $('#listView').hide();
        $('#dayView').show();
        $('.view-toggle .btn').removeClass('active');
        $('.view-toggle .btn:nth-child(3)').addClass('active');
        this.currentView = 'day';
        this.loadDaySchedule();
    }

    loadDaySchedule() {
        const selectedDate = $('#daySelector').val();
        if (!selectedDate) return;

        const date = new Date(selectedDate);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

        const dayEvents = this.events.filter(event =>
            new Date(event.start) >= dayStart && new Date(event.start) < dayEnd
        );

        this.renderDaySchedule(dayEvents, date);
    }

    renderDaySchedule(events, date) {
        const container = $('#daySchedule');
        container.empty();

        if (events.length === 0) {
            container.html(`
                <div class="text-center py-5">
                    <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                    <h4>Nenhum evento encontrado</h4>
                    <p>Não há eventos agendados para ${this.formatDate(date)}</p>
                </div>
            `);
            return;
        }

        let html = `<h4 class="mb-4">Agenda para ${this.formatDate(date)}</h4>`;

        events.sort((a, b) => new Date(a.start) - new Date(b.start));

        events.forEach(event => {
            const eventType = this.getTypeText(event.type);
            const eventTime = `${this.formatTime(event.start)}-${this.formatTime(event.end)}`;

            html += `
                <div class="time-slot ${this.getTimeSlotClass(event)}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h5>${event.title}</h5>
                            <p class="mb-1"><strong>Hora:</strong> ${eventTime}</p>
                            <p class="mb-1"><strong>Tipo:</strong> ${eventType}</p>
                            <p class="mb-1"><strong>Localização:</strong> ${event.lift}</p>
                            <p class="mb-0"><strong>Estado:</strong> <span class="badge badge-${this.getStatusClass(event.status)}">${this.getStatusText(event.status)}</span></p>
                        </div>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-info" onclick="scheduleManager.viewEvent('${event.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${event.status === 'scheduled' ?
                                `<button class="btn btn-sm btn-success" onclick="scheduleManager.startEvent('${event.id}')">
                                    <i class="fas fa-play"></i>
                                </button>` : ''}
                        </div>
                    </div>
                    ${event.description ? `<p class="mt-2 mb-0">${event.description}</p>` : ''}
                </div>
            `;
        });

        container.html(html);
    }

    getTimeSlotClass(event) {
        const now = new Date();
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);

        if (event.status === 'completed') return 'free';
        if (event.status === 'cancelled') return 'free';

        if (now > eventEnd) return 'free';
        if (now >= eventStart && now <= eventEnd) return 'partial';
        return 'busy';
    }

    viewEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        currentEventId = eventId;
        const modalContent = this.createEventDetails(event);
        $('#eventDetailsContent').html(modalContent);

        if (event.status === 'scheduled') {
            $('#startEventBtn').show();
        } else {
            $('#startEventBtn').hide();
        }

        $('#eventDetailsModal').modal('show');
    }

    createEventDetails(event) {
        const typeText = this.getTypeText(event.type);
        const priorityText = this.getPriorityText(event.priority);
        const statusText = this.getStatusText(event.status);

        return `
            <div class="event-details">
                <h4>${event.title}</h4>

                <div class="row mt-4">
                    <div class="col-md-6">
                        <div class="info-item">
                            <strong><i class="fas fa-clock"></i> Hora:</strong>
                            ${this.formatDateTime(event.start)} - ${this.formatTime(event.end)}
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-tag"></i> Tipo:</strong> ${typeText}
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-exclamation-circle"></i> Prioridade:</strong>
                            <span class="badge badge-${event.priority === 'high' ? 'danger' : event.priority === 'medium' ? 'warning' : 'success'}">
                                ${priorityText}
                            </span>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="info-item">
                            <strong><i class="fas fa-map-marker-alt"></i> Localização:</strong> ${event.lift}
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-user-cog"></i> Técnico:</strong> ${event.technician}
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-check-circle"></i> Estado:</strong>
                            <span class="badge badge-${this.getStatusClass(event.status)}">${statusText}</span>
                        </div>
                    </div>
                </div>

                ${event.description ? `
                    <div class="mt-4">
                        <h5><i class="fas fa-align-left"></i> Descrição</h5>
                        <p>${event.description}</p>
                    </div>
                ` : ''}

                <div class="mt-4">
                    <h5><i class="fas fa-info-circle"></i> Informação adicional</h5>
                    <div class="alert alert-info">
                        <p class="mb-0">
                            <i class="fas fa-clock"></i> Duração: ${this.getDuration(event)} minutos<br>
                            <i class="fas fa-calendar"></i> Criado: ${this.formatDateTime(event.createdAt || event.start)}
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    getDuration(event) {
        const start = new Date(event.start);
        const end = new Date(event.end);
        return Math.round((end - start) / (1000 * 60));
    }

    formatDateTime(date) {
        return new Date(date).toLocaleString('pt-PT');
    }

    startEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        event.status = 'in-progress';
        event.startedAt = new Date().toISOString();

        localStorage.setItem('scheduleEvents', JSON.stringify(this.events));
        this.renderEvents();

        $('#eventDetailsModal').modal('hide');
        this.showNotification('Evento iniciado!', 'success');

        if (event.type === 'inspection') {
            window.location.href = `inspection-execution.html?id=${eventId}`;
        } else {
            window.location.href = `task-execution.html?id=${eventId}`;
        }
    }

    editEvent(eventId) {
        this.showNotification('A função de edição de eventos estará disponível em versões futuras', 'info');
    }

    prevPeriod() {
        if (this.calendar) this.calendar.prev();
    }

    nextPeriod() {
        if (this.calendar) this.calendar.next();
    }

    today() {
        if (this.calendar) this.calendar.today();
    }

    filterEvents(filterType) {
        let filteredEvents = [...this.events];
        const today = new Date();

        switch (filterType) {
            case 'today': {
                const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
                filteredEvents = filteredEvents.filter(event =>
                    new Date(event.start) >= todayStart && new Date(event.start) < todayEnd
                );
                break;
            }
            case 'week': {
                const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
                const weekEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - today.getDay()));
                filteredEvents = filteredEvents.filter(event =>
                    new Date(event.start) >= weekStart && new Date(event.start) <= weekEnd
                );
                break;
            }
            case 'month': {
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                filteredEvents = filteredEvents.filter(event =>
                    new Date(event.start) >= monthStart && new Date(event.start) <= monthEnd
                );
                break;
            }
        }

        this.renderFilteredEventsList(filteredEvents);
    }

    renderFilteredEventsList(events) {
        const tbody = $('#eventsList');
        tbody.empty();

        if (events.length === 0) {
            tbody.html(`
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <h4>Nenhum evento encontrado</h4>
                        <p>Tente alterar os parâmetros do filtro</p>
                    </td>
                </tr>
            `);
            return;
        }

        events.forEach(event => {
            const row = this.createEventRow(event);
            tbody.append(row);
        });
    }

    exportSchedule() {
        this.showNotification('A preparar exportação do calendário...', 'info');
        const csvContent = this.convertToCSV(this.events);
        this.downloadCSV(csvContent, `agenda_${new Date().toISOString().split('T')[0]}.csv`);
    }

    convertToCSV(events) {
        const headers = ['Data', 'Hora', 'Tipo', 'Evento', 'Localização', 'Prioridade', 'Estado', 'Técnico'];
        const rows = events.map(event => [
            this.formatDate(event.start),
            `${this.formatTime(event.start)}-${this.formatTime(event.end)}`,
            this.getTypeText(event.type),
            event.title,
            event.lift,
            this.getPriorityText(event.priority),
            this.getStatusText(event.status),
            event.technician
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
        this.showNotification('Exportação concluída com sucesso', 'success');
    }

    saveSettings() {
        const workSchedule = $('#workSchedule').val();
        const notifications = $('#notifications').val();
        localStorage.setItem('scheduleSettings', JSON.stringify({
            workSchedule,
            notifications,
            savedAt: new Date().toISOString()
        }));
        this.showNotification('Definições guardadas!', 'success');
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
            toastr.info(message);
        }
    }
}
