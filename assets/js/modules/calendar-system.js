class CalendarSystem {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.events = [];
        this.view = 'month'; // month, week, day
        this.init();
    }

    init() {
        this.loadEvents();
        this.renderCalendar();
        this.setupEventListeners();
        this.setupNavigation();
    }

    setupEventListeners() {
        // Перемикання видів
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.view = e.target.dataset.view;
                this.updateView();
            });
        });

        // Навігація
        document.getElementById('prevBtn').addEventListener('click', () => this.navigate(-1));
        document.getElementById('nextBtn').addEventListener('click', () => this.navigate(1));
        document.getElementById('todayBtn').addEventListener('click', () => this.goToToday());

        // Клік по днях
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('calendar-day')) {
                this.handleDayClick(e.target);
            }
        });

        // Фільтри
        document.querySelectorAll('.filter-option input').forEach(input => {
            input.addEventListener('change', () => this.applyFilters());
        });

        // Модальне вікно
        document.getElementById('eventForm').addEventListener('submit', (e) => this.saveEvent(e));
        document.querySelector('.modal .close').addEventListener('click', () => this.closeModal());
    }

    renderCalendar() {
        this.updateHeader();
        
        switch (this.view) {
            case 'month':
                this.renderMonthView();
                break;
            case 'week':
                this.renderWeekView();
                break;
            case 'day':
                this.renderDayView();
                break;
        }

        this.renderUpcomingEvents();
        this.applyFilters();
    }

    renderMonthView() {
        const container = document.querySelector('.calendar-grid');
        container.innerHTML = '';

        // Дні тижня
        const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
        daysOfWeek.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-day-header';
            header.textContent = day;
            container.appendChild(header);
        });

        // Дні місяця
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        
        // Попередній місяць
        const prevMonthLastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            const day = document.createElement('div');
            day.className = 'calendar-day other-month';
            day.textContent = prevMonthLastDay - i;
            container.appendChild(day);
        }

        // Поточний місяць
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const day = document.createElement('div');
            day.className = 'calendar-day';
            day.textContent = i;
            
            const date = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), i);
            if (this.isToday(date)) {
                day.classList.add('today');
            }
            
            if (this.hasEvents(date)) {
                day.classList.add('has-events');
                this.renderDayEvents(day, date);
            }
            
            container.appendChild(day);
        }

        // Наступний місяць
        const totalCells = 42; // 6 рядків по 7 днів
        const remainingCells = totalCells - (startDay + lastDay.getDate());
        for (let i = 1; i <= remainingCells; i++) {
            const day = document.createElement('div');
            day.className = 'calendar-day other-month';
            day.textContent = i;
            container.appendChild(day);
        }
    }

    renderWeekView() {
        // Реалізація тижневого виду
        // logger.log('Render week view');
    }

    renderDayView() {
        // Реалізація денного виду
        // logger.log('Render day view');
    }

    renderDayEvents(dayElement, date) {
        const events = this.getEventsForDate(date);
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'calendar-events';
        
        events.slice(0, 3).forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = `calendar-event event-${event.type}`;
            eventElement.textContent = event.title;
            eventElement.title = event.description;
            eventsContainer.appendChild(eventElement);
        });
        
        if (events.length > 3) {
            const moreElement = document.createElement('div');
            moreElement.className = 'calendar-event event-more';
            moreElement.textContent = `+${events.length - 3} ще`;
            eventsContainer.appendChild(moreElement);
        }
        
        dayElement.appendChild(eventsContainer);
    }

    renderUpcomingEvents() {
        const container = document.querySelector('.upcoming-events');
        const upcoming = this.getUpcomingEvents(5);
        
        container.innerHTML = '';
        upcoming.forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = 'upcoming-event';
            eventElement.innerHTML = `
                <div class="event-date">${this.formatEventDate(event.start)}</div>
                <h4 class="event-title">${event.title}</h4>
                <div class="event-type ${event.type}">${this.getEventTypeLabel(event.type)}</div>
            `;
            container.appendChild(eventElement);
        });
    }

    updateHeader() {
        const monthYear = this.currentDate.toLocaleDateString('uk-UA', {
            month: 'long',
            year: 'numeric'
        });
        document.querySelector('.calendar-title').textContent = monthYear;
    }

    updateView() {
        // Оновлення активних кнопок
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === this.view);
        });
        
        this.renderCalendar();
    }

    navigate(direction) {
        switch (this.view) {
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + direction);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + (direction * 7));
                break;
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() + direction);
                break;
        }
        this.renderCalendar();
    }

    goToToday() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.renderCalendar();
    }

    handleDayClick(dayElement) {
        const day = parseInt(dayElement.textContent);
        if (!isNaN(day)) {
            this.selectedDate = new Date(
                this.currentDate.getFullYear(),
                this.currentDate.getMonth(),
                day
            );
            this.openEventModal();
        }
    }

    openEventModal(event = null) {
        const modal = document.getElementById('eventModal');
        const form = document.getElementById('eventForm');
        
        if (event) {
            document.getElementById('eventId').value = event.id;
            document.getElementById('eventTitle').value = event.title;
            document.getElementById('eventDescription').value = event.description;
            document.getElementById('eventStart').value = event.start.split('T')[0];
            document.getElementById('eventEnd').value = event.end.split('T')[0];
            document.getElementById('eventType').value = event.type;
        } else {
            form.reset();
            document.getElementById('eventId').value = '';
            document.getElementById('eventStart').value = this.selectedDate.toISOString().split('T')[0];
            document.getElementById('eventEnd').value = this.selectedDate.toISOString().split('T')[0];
        }
        
        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('eventModal').style.display = 'none';
    }

    async saveEvent(e) {
        e.preventDefault();
        
        const event = {
            id: document.getElementById('eventId').value || this.generateId(),
            title: document.getElementById('eventTitle').value,
            description: document.getElementById('eventDescription').value,
            start: document.getElementById('eventStart').value,
            end: document.getElementById('eventEnd').value,
            type: document.getElementById('eventType').value,
            createdAt: new Date().toISOString()
        };

        const existingIndex = this.events.findIndex(e => e.id === event.id);
        if (existingIndex >= 0) {
            this.events[existingIndex] = event;
        } else {
            this.events.push(event);
        }

        this.saveEvents();
        this.renderCalendar();
        this.closeModal();
    }

    loadEvents() {
        const saved = localStorage.getItem('calendar_events');
        if (saved) {
            this.events = JSON.parse(saved);
        }
    }

    saveEvents() {
        localStorage.setItem('calendar_events', JSON.stringify(this.events));
    }

    getEventsForDate(date) {
        return this.events.filter(event => {
            const eventDate = new Date(event.start);
            return eventDate.toDateString() === date.toDateString();
        });
    }

    getUpcomingEvents(limit = 5) {
        const today = new Date();
        return this.events
            .filter(event => new Date(event.start) >= today)
            .sort((a, b) => new Date(a.start) - new Date(b.start))
            .slice(0, limit);
    }

    hasEvents(date) {
        return this.getEventsForDate(date).length > 0;
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    applyFilters() {
        const visibleTypes = [];
        document.querySelectorAll('.filter-option input:checked').forEach(input => {
            visibleTypes.push(input.value);
        });

        document.querySelectorAll('.calendar-event').forEach(event => {
            const eventType = event.className.match(/event-(\w+)/)[1];
            event.style.display = visibleTypes.includes(eventType) ? 'block' : 'none';
        });
    }

    generateId() {
        return 'EVT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    formatEventDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('uk-UA', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }

    getEventTypeLabel(type) {
        const types = {
            'maintenance': 'Техобслуговування',
            'inspection': 'Інспекція',
            'repair': 'Ремонт',
            'meeting': 'Зустріч'
        };
        return types[type] || type;
    }
}

// Ініціалізація календаря
const calendarSystem = new CalendarSystem();