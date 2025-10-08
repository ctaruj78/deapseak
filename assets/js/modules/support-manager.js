/**/**

 * Support Manager - Система підтримки користувачів * Support Manager - Система підтримки користувачів

 * Інтеграція з WebSocket для real-time допомоги * Інтеграція з WebSocket для real-time допомоги

 */ */



class SupportManager {class SupportManager {

    constructor() {    constructor() {

        this.apiUrl = 'http://localhost:3001/api';        this.apiUrl = 'http://localhost:3001/api';

        this.wsClient = null;        this.wsClient = null;

        this.tickets = [];        this.tickets = [];

        this.faqs = [];        this.faqs = [];

        this.currentTicket = null;        this.currentTicket = null;

        this.userId = localStorage.getItem('userId') || 'support-agent-001';        this.userId = localStorage.getItem('userId') || 'support-agent-001';

        this.userRole = localStorage.getItem('userRole') || 'support';        this.userRole = localStorage.getItem('userRole') || 'support';

                

        this.init();        this.init();

    }    }



    async init() {    async init() {

        console.log('🎧 Ініціалізація Support Manager...');        console.log('🎧 Ініціалізація Support Manager...');

                

        try {        try {

            await this.setupWebSocket();            await this.setupWebSocket();

            await this.loadTickets();            await this.loadTickets();

            await this.loadFAQs();            await this.loadFAQs();

            this.setupEventHandlers();            this.setupEventHandlers();

            this.render();            this.render();

            this.setupRealTimeFeatures();            this.setupRealTimeFeatures();

                        

            console.log('✅ Support Manager ініціалізовано');            console.log('✅ Support Manager ініціалізовано');

        } catch (error) {        } catch (error) {

            console.error('❌ Помилка ініціалізації Support Manager:', error);            console.error('❌ Помилка ініціалізації Support Manager:', error);

        }        }

    }    }



    async setupWebSocket() {    async setupWebSocket() {

        if (typeof WebSocketUtils !== 'undefined') {        if (typeof WebSocketUtils !== 'undefined') {

            this.wsClient = WebSocketUtils.init(this.userId, localStorage.getItem('authToken'));            this.wsClient = WebSocketUtils.init(this.userId, localStorage.getItem('authToken'));

                        

            this.wsClient.on('support_ticket_created', (data) => {            this.wsClient.on('support_ticket_created', (data) => {

                this.handleNewTicket(data);                this.handleNewTicket(data);

            });            });

                        

            this.wsClient.on('support_ticket_updated', (data) => {            this.wsClient.on('support_ticket_updated', (data) => {

                this.handleTicketUpdate(data);                this.handleTicketUpdate(data);

            });            });



            this.wsClient.on('support_message_received', (data) => {            this.wsClient.on('support_message_received', (data) => {

                this.handleNewMessage(data);                this.handleNewMessage(data);

            });            });



            this.wsClient.on('support_urgent_request', (data) => {            this.wsClient.on('support_agent_typing', (data) => {

                this.handleUrgentRequest(data);                this.handleAgentTyping(data);

            });            });

            

            console.log('🔌 WebSocket підключено до Support Manager');            this.wsClient.on('support_urgent_request', (data) => {

        }                this.handleUrgentRequest(data);

    }            });

            

    setupRealTimeFeatures() {            console.log('🔌 WebSocket підключено до Support Manager');

        // Оновлення статусу підтримки        }

        this.broadcastSupportStatus();    }

        setInterval(() => this.broadcastSupportStatus(), 30000);

    setupRealTimeFeatures() {

        // Автоматичне оновлення тікетів        // Оновлення статусу підтримки

        setInterval(() => this.refreshTickets(), 60000);        this.broadcastSupportStatus();

    }        setInterval(() => this.broadcastSupportStatus(), 30000);



    async loadTickets() {        // Автоматичне оновлення тікетів

        try {        setInterval(() => this.refreshTickets(), 60000);

            const token = localStorage.getItem('authToken');    }

            const response = await fetch(`${this.apiUrl}/support/tickets`, {

                headers: {    async loadTickets() {

                    'Authorization': `Bearer ${token}`        try {

                }            const token = localStorage.getItem('authToken');

            });            const response = await fetch(`${this.apiUrl}/support/tickets`, {

                headers: {

            if (response.ok) {                    'Authorization': `Bearer ${token}`

                this.tickets = await response.json();                }

            } else {            });

                this.tickets = this.getTestTickets();

            }            if (response.ok) {

        } catch (error) {                this.tickets = await response.json();

            console.warn('Використовую тестові тікети:', error);            } else {

            this.tickets = this.getTestTickets();                this.tickets = this.getTestTickets();

        }            }

    }        } catch (error) {

            console.warn('Використовую тестові тікети:', error);

    getTestTickets() {            this.tickets = this.getTestTickets();

        return [        }

            {    }

                id: 'TK001',

                title: 'Ліфт не працює на 5 поверсі',    getTestTickets() {

                description: 'Ліфт зупинився між поверхами, людей немає',        return [

                category: 'technical',            {

                priority: 'high',                id: 'TK001',

                status: 'open',                title: 'Ліфт не працює на 5 поверсі',

                createdBy: {                description: 'Ліфт зупинився між поверхами, людей немає',

                    id: 'user1',                description: 'Ліфт №2 видає незвичайний шум при русі між 3 і 4 поверхами. Також спостерігається незначне коливання кабіни.',

                    name: 'Олександр Іваненко',                category: 'technical',

                    email: 'alex@building.com'                priority: 'high',

                },                status: 'in-progress',

                assignedTo: {                lift: 'lift-2',

                    id: 'agent1',                createdAt: new Date('2024-05-10T14:30:00').toISOString(),

                    name: 'Марія Технік',                updatedAt: new Date('2024-05-12T09:15:00').toISOString(),

                    avatar: '../../assets/img/support1.jpg'                assignee: 'Іван Петренко',

                },                updates: [

                createdAt: new Date(Date.now() - 3600000).toISOString(),                    {

                updatedAt: new Date(Date.now() - 1800000).toISOString(),                        type: 'status',

                messages: [                        message: 'Звернення прийнято до роботи',

                    {                        timestamp: new Date('2024-05-10T14:45:00').toISOString(),

                        id: 1,                        author: 'Система'

                        from: 'user1',                    },

                        text: 'Ліфт зупинився на 4.5 поверсі',                    {

                        timestamp: new Date(Date.now() - 3600000).toISOString(),                        type: 'comment',

                        type: 'user'                        message: 'Технік призначений. Очікуйте дзвінка для узгодження часу візиту.',

                    },                        timestamp: new Date('2024-05-10T15:30:00').toISOString(),

                    {                        author: 'Менеджер підтримки'

                        id: 2,                    }

                        from: 'agent1',                ]

                        text: 'Дякую за звернення. Технік вже в дорозі.',            },

                        timestamp: new Date(Date.now() - 3000000).toISOString(),            {

                        type: 'agent'                id: 2,

                    }                number: 'TKT-2024-002',

                ],                subject: 'Питання щодо рахунку за травень',

                tags: ['urgent', 'building-a'],                description: 'Не згоден з сумою у рахунку за травень. Ліфт №1 не працював 5 днів, але оплата нарахована повністю.',

                building: 'ТЦ "Центральний"',                category: 'billing',

                liftId: 'lift-001'                priority: 'medium',

            },                status: 'pending',

            {                lift: 'lift-1',

                id: 'TK002',                createdAt: new Date('2024-05-15T10:00:00').toISOString(),

                title: 'Проблема з картковим доступом',                updatedAt: new Date('2024-05-15T10:00:00').toISOString(),

                description: 'Карта доступу не працює в ліфті',                assignee: 'Відділ рахунків',

                category: 'access',                updates: [

                priority: 'medium',                    {

                status: 'in_progress',                        type: 'status',

                createdBy: {                        message: 'Звернення зареєстровано',

                    id: 'user2',                        timestamp: new Date('2024-05-15T10:05:00').toISOString(),

                    name: 'Анна Клієнт',                        author: 'Система'

                    email: 'anna@company.com'                    }

                },                ]

                assignedTo: {            }

                    id: 'agent2',        ];

                    name: 'Петро Підтримка',        this.saveTickets();

                    avatar: '../../assets/img/support2.jpg'    }

                },

                createdAt: new Date(Date.now() - 7200000).toISOString(),    loadKnowledgeBase() {

                updatedAt: new Date(Date.now() - 900000).toISOString(),        this.knowledgeBase = [

                messages: [],            {

                tags: ['access', 'card'],                id: 1,

                building: 'Офіс-центр "Прем\'єр"',                title: 'Як створити заявку на ремонт',

                liftId: 'lift-003'                content: 'Інструкція з створення заявки на технічне обслуговування або ремонт ліфта.',

            },                category: 'technical',

            {                tags: ['заявка', 'ремонт', 'інструкція']

                id: 'TK003',            },

                title: 'Питання про сервісне обслуговування',            {

                description: 'Коли планується наступне ТО ліфта?',                id: 2,

                category: 'general',                title: 'Як оплатити рахунок онлайн',

                priority: 'low',                content: 'Покрокова інструкція з онлайн-оплати рахунків за обслуговування ліфтів.',

                status: 'resolved',                category: 'billing',

                createdBy: {                tags: ['оплата', 'рахунок', 'онлайн']

                    id: 'user3',            },

                    name: 'Сергій Управитель',            {

                    email: 'sergey@management.com'                id: 3,

                },                title: 'Що робити при застряганні в ліфті',

                assignedTo: {                content: 'Алгоритм дій у разі застрягання в ліфті. Контакти аварійної служби.',

                    id: 'agent1',                category: 'emergency',

                    name: 'Марія Технік',                tags: ['аварія', 'безпека', 'інструкція']

                    avatar: '../../assets/img/support1.jpg'            },

                },            {

                createdAt: new Date(Date.now() - 86400000).toISOString(),                id: 4,

                updatedAt: new Date(Date.now() - 3600000).toISOString(),                title: 'Графік планового обслуговування',

                messages: [],                content: 'Інформація про графік планових технічних обслуговувань ліфтів.',

                tags: ['maintenance', 'schedule'],                category: 'general',

                building: 'ЖК "Сонячний"',                tags: ['графік', 'обслуговування', 'план']

                liftId: 'lift-007'            }

            }        ];

        ];        this.renderKnowledgeBase();

    }    }



    async loadFAQs() {    loadFAQ() {

        this.faqs = [        this.faq = [

            {            {

                id: 1,                question: 'Як часто проводиться технічне обслуговування ліфтів?',

                category: 'Технічні проблеми',                answer: 'Планове технічне обслуговування проводиться щомісяця для кожного ліфта. Додаткові перевірки - за необхідності.',

                question: 'Що робити якщо ліфт зупинився?',                category: 'technical'

                answer: '1. Не панікуйте\\n2. Натисніть кнопку виклику\\n3. Чекайте на допомогу\\n4. Не намагайтеся відкрити двері самостійно',            },

                views: 1250,            {

                helpful: 89                question: 'Який термін відповіді на звернення?',

            },                answer: 'Стандартний термін відповіді - 24 години. Для термінових звернень - до 2 годин.',

            {                category: 'general'

                id: 2,            },

                category: 'Доступ',            {

                question: 'Як отримати карту доступу до ліфта?',                question: 'Як відстежити статус моєї заявки?',

                answer: 'Зверніться до адміністрації будівлі з документом, що посвідчує особу. Карта видається протягом 1-2 робочих днів.',                answer: 'Статус заявки можна переглянути в особистому кабінеті у розділі "Мої звернення".',

                views: 890,                category: 'technical'

                helpful: 67            },

            },            {

            {                question: 'Які способи оплати доступні?',

                id: 3,                  answer: 'Оплата можлива через банківський переказ, онлайн-оплату на сайті або готівкою кур\'єру.',

                category: 'Сервіс',                category: 'billing'

                question: 'Як часто проводиться технічне обслуговування?',            }

                answer: 'Планове ТО проводиться щомісяця. Капітальний ремонт - раз на рік.',        ];

                views: 445,        this.renderFAQ();

                helpful: 34    }

            }

        ];    saveTickets() {

    }        localStorage.setItem('clientTickets', JSON.stringify(this.tickets));

    }

    setupEventHandlers() {

        // Фільтри тікетів    showCategory(category) {

        const priorityFilter = document.getElementById('priority-filter');        this.currentCategory = category;

        if (priorityFilter) {        const categories = {

            priorityFilter.addEventListener('change', (e) => {            'technical': 'Технічні питання',

                this.filterTickets('priority', e.target.value);            'billing': 'Рахунки та оплата',

            });            'emergency': 'Аварійні ситуації',

        }            'general': 'Загальні питання'

        };

        const statusFilter = document.getElementById('status-filter');        

        if (statusFilter) {        this.showNotification(`Обрана категорія: ${categories[category]}`, 'info');

            statusFilter.addEventListener('change', (e) => {        this.showTicketForm();

                this.filterTickets('status', e.target.value);    }

            });

        }    showTicketForm() {

        $('#ticketFormSection').slideDown();

        // Пошук тікетів        $('html, body').animate({

        const searchInput = document.getElementById('ticket-search');            scrollTop: $('#ticketFormSection').offset().top

        if (searchInput) {        }, 500);

            searchInput.addEventListener('input', (e) => {    }

                this.searchTickets(e.target.value);

            });    hideTicketForm() {

        }        $('#ticketFormSection').slideUp();

    }

        // Створення тікета

        const createTicketBtn = document.getElementById('create-ticket-btn');    submitTicket() {

        if (createTicketBtn) {        const form = document.getElementById('ticketForm');

            createTicketBtn.addEventListener('click', () => {        if (!form.checkValidity()) {

                this.showCreateTicketModal();            form.reportValidity();

            });            return;

        }        }



        // Швидкі дії        const newTicket = {

        const quickResponseBtn = document.getElementById('quick-response-btn');            id: Math.max(...this.tickets.map(t => t.id), 0) + 1,

        if (quickResponseBtn) {            number: 'TKT-' + new Date().getFullYear() + '-' + String(this.tickets.length + 1).padStart(3, '0'),

            quickResponseBtn.addEventListener('click', () => {            subject: document.getElementById('ticketSubject').value,

                this.showQuickResponseModal();            description: document.getElementById('ticketDescription').value,

            });            category: document.getElementById('ticketCategory').value,

        }            priority: document.getElementById('ticketPriority').value,

    }            status: 'pending',

            lift: document.getElementById('ticketLift').value || null,

    render() {            createdAt: new Date().toISOString(),

        const container = document.getElementById('support-manager-content');            updatedAt: new Date().toISOString(),

        if (!container) return;            assignee: 'Не призначено',

            updates: [

        container.innerHTML = `                {

            <div class="row">                    type: 'status',

                <!-- Статистика підтримки -->                    message: 'Звернення створено',

                <div class="col-md-3">                    timestamp: new Date().toISOString(),

                    <div class="info-box">                    author: 'Користувач'

                        <span class="info-box-icon bg-info">                }

                            <i class="fas fa-ticket-alt"></i>            ]

                        </span>        };

                        <div class="info-box-content">

                            <span class="info-box-text">Всього тікетів</span>        this.tickets.unshift(newTicket);

                            <span class="info-box-number">${this.tickets.length}</span>        this.saveTickets();

                        </div>        this.renderActiveTickets();

                    </div>        this.hideTicketForm();

                </div>        form.reset();

                <div class="col-md-3">        

                    <div class="info-box">        this.showNotification('Звернення успішно створено! Номер: ' + newTicket.number, 'success');

                        <span class="info-box-icon bg-warning">    }

                            <i class="fas fa-clock"></i>

                        </span>    autoSaveDraft() {

                        <div class="info-box-content">        // Автозбереження чернетки форми

                            <span class="info-box-text">Відкриті</span>        const draft = {

                            <span class="info-box-number">${this.tickets.filter(t => t.status === 'open').length}</span>            subject: document.getElementById('ticketSubject').value,

                        </div>            description: document.getElementById('ticketDescription').value,

                    </div>            category: document.getElementById('ticketCategory').value,

                </div>            priority: document.getElementById('ticketPriority').value,

                <div class="col-md-3">            lift: document.getElementById('ticketLift').value,

                    <div class="info-box">            timestamp: new Date().toISOString()

                        <span class="info-box-icon bg-danger">        };

                            <i class="fas fa-exclamation-triangle"></i>        

                        </span>        localStorage.setItem('ticketDraft', JSON.stringify(draft));

                        <div class="info-box-content">    }

                            <span class="info-box-text">Високий пріоритет</span>

                            <span class="info-box-number">${this.tickets.filter(t => t.priority === 'high').length}</span>    loadDraft() {

                        </div>        const draft = JSON.parse(localStorage.getItem('ticketDraft') || '{}');

                    </div>        if (draft.subject) {

                </div>            document.getElementById('ticketSubject').value = draft.subject || '';

                <div class="col-md-3">            document.getElementById('ticketDescription').value = draft.description || '';

                    <div class="info-box">            document.getElementById('ticketCategory').value = draft.category || '';

                        <span class="info-box-icon bg-success">            document.getElementById('ticketPriority').value = draft.priority || 'medium';

                            <i class="fas fa-check-circle"></i>            document.getElementById('ticketLift').value = draft.lift || '';

                        </span>            

                        <div class="info-box-content">            this.showNotification('Чернетку відновлено', 'info');

                            <span class="info-box-text">Вирішені</span>        }

                            <span class="info-box-number">${this.tickets.filter(t => t.status === 'resolved').length}</span>    }

                        </div>

                    </div>    clearDraft() {

                </div>        localStorage.removeItem('ticketDraft');

        document.getElementById('ticketForm').reset();

                <!-- Тікети -->        this.showNotification('Чернетку очищено', 'info');

                <div class="col-12">    }

                    <div class="card">

                        <div class="card-header">    renderActiveTickets() {

                            <h3 class="card-title">        const container = document.getElementById('activeTicketsList');

                                <i class="fas fa-headset"></i> Система підтримки        const activeTickets = this.tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed');

                            </h3>        

                            <div class="card-tools">        document.getElementById('activeTicketsCount').textContent = activeTickets.length;

                                <button id="create-ticket-btn" class="btn btn-primary btn-sm">        

                                    <i class="fas fa-plus"></i> Новий тікет        if (activeTickets.length === 0) {

                                </button>            container.innerHTML = `

                                <button id="quick-response-btn" class="btn btn-success btn-sm">                <div class="empty-state p-4 text-center">

                                    <i class="fas fa-bolt"></i> Швидка відповідь                    <i class="fas fa-ticket-alt fa-3x text-muted mb-3"></i>

                                </button>                    <h5>Активних звернень немає</h5>

                            </div>                    <p class="text-muted">У вас немає активних звернень до служби підтримки</p>

                        </div>                </div>

                        <div class="card-body">            `;

                            <div class="row mb-3">            return;

                                <div class="col-md-4">        }

                                    <input type="text" id="ticket-search" class="form-control"         

                                           placeholder="Пошук тікетів...">        container.innerHTML = '';

                                </div>        activeTickets.slice(0, 5).forEach(ticket => {

                                <div class="col-md-2">            const ticketElement = this.createTicketElement(ticket);

                                    <select id="priority-filter" class="form-control">            container.appendChild(ticketElement);

                                        <option value="">Всі пріоритети</option>        });

                                        <option value="low">Низький</option>    }

                                        <option value="medium">Середній</option>

                                        <option value="high">Високий</option>    createTicketElement(ticket) {

                                        <option value="urgent">Критичний</option>        const div = document.createElement('div');

                                    </select>        div.className = `ticket-card ${ticket.status}`;

                                </div>        

                                <div class="col-md-2">        const statusText = {

                                    <select id="status-filter" class="form-control">            'pending': 'В очікуванні',

                                        <option value="">Всі статуси</option>            'in-progress': 'В роботі',

                                        <option value="open">Відкриті</option>            'resolved': 'Вирішено',

                                        <option value="in_progress">В роботі</option>            'closed': 'Закрито'

                                        <option value="resolved">Вирішені</option>        };

                                        <option value="closed">Закриті</option>        

                                    </select>        const priorityText = {

                                </div>            'low': 'Низький',

                                <div class="col-md-2">            'medium': 'Середній',

                                    <select id="category-filter" class="form-control">            'high': 'Високий',

                                        <option value="">Всі категорії</option>            'critical': 'Критичний'

                                        <option value="technical">Технічні</option>        };

                                        <option value="access">Доступ</option>        

                                        <option value="general">Загальні</option>        div.innerHTML = `

                                        <option value="billing">Білінг</option>            <div class="card-body">

                                    </select>                <div class="d-flex justify-content-between align-items-start">

                                </div>                    <div>

                                <div class="col-md-2">                        <h5 class="card-title">${ticket.subject}</h5>

                                    <button class="btn btn-outline-secondary" onclick="supportManager.exportTickets()">                        <p class="card-text">${ticket.description.substring(0, 100)}...</p>

                                        <i class="fas fa-download"></i> Експорт                        <div class="ticket-meta">

                                    </button>                            <span class="support-status status-${ticket.status}">${statusText[ticket.status]}</span>

                                </div>                            <span class="badge badge-${ticket.priority} ml-2">${priorityText[ticket.priority]}</span>

                            </div>                            <small class="text-muted ml-2">${new Date(ticket.createdAt).toLocaleDateString('uk-UA')}</small>

                        </div>

                            <div id="tickets-list" class="list-group">                    </div>

                                ${this.renderTicketsList()}                    <div class="ticket-actions">

                            </div>                        <button class="btn btn-sm btn-outline-primary" onclick="supportManager.viewTicket(${ticket.id})">

                        </div>                            <i class="fas fa-eye"></i> Переглянути

                    </div>                        </button>

                </div>                    </div>

                </div>

                <!-- FAQ -->            </div>

                <div class="col-md-6 mt-4">        `;

                    <div class="card">        

                        <div class="card-header">        return div;

                            <h3 class="card-title">    }

                                <i class="fas fa-question-circle"></i> Часті питання

                            </h3>    viewTicket(ticketId) {

                        </div>        const ticket = this.tickets.find(t => t.id === ticketId);

                        <div class="card-body">        if (!ticket) return;

                            <div id="faq-list">        

                                ${this.renderFAQList()}        // Заповнити модальне вікно

                            </div>        document.getElementById('ticketModalTitle').textContent = ticket.subject;

                        </div>        document.getElementById('ticketSubject').textContent = ticket.subject;

                    </div>        document.getElementById('ticketDescription').textContent = ticket.description;

                </div>        document.getElementById('ticketNumber').textContent = ticket.number;

        document.getElementById('ticketDate').textContent = new Date(ticket.createdAt).toLocaleDateString('uk-UA');

                <!-- Швидкі дії -->        document.getElementById('ticketAssignee').textContent = ticket.assignee;

                <div class="col-md-6 mt-4">        

                    <div class="card">        // Категорія

                        <div class="card-header">        const categories = {

                            <h3 class="card-title">            'technical': 'Технічне питання',

                                <i class="fas fa-bolt"></i> Швидкі дії            'billing': 'Рахунки та оплата',

                            </h3>            'emergency': 'Аварійна ситуація',

                        </div>            'general': 'Загальне питання'

                        <div class="card-body">        };

                            <div class="row">        document.getElementById('ticketCategory').textContent = categories[ticket.category] || ticket.category;

                                <div class="col-md-6 mb-2">        

                                    <button class="btn btn-outline-primary btn-block" onclick="supportManager.escalateUrgent()">        // Ліфт

                                        <i class="fas fa-arrow-up"></i> Ескалація        document.getElementById('ticketLiftInfo').textContent = ticket.lift ? 

                                    </button>            ticket.lift.replace('lift-', 'Ліфт №') : 'Не вказано';

                                </div>        

                                <div class="col-md-6 mb-2">        // Статус і пріоритет

                                    <button class="btn btn-outline-success btn-block" onclick="supportManager.bulkResolve()">        const statusBadge = document.getElementById('ticketStatusBadge');

                                        <i class="fas fa-check-double"></i> Масове вирішення        statusBadge.className = `support-status status-${ticket.status}`;

                                    </button>        statusBadge.textContent = {

                                </div>            'pending': 'В очікуванні',

                                <div class="col-md-6 mb-2">            'in-progress': 'В роботі',

                                    <button class="btn btn-outline-info btn-block" onclick="supportManager.generateReport()">            'resolved': 'Вирішено',

                                        <i class="fas fa-chart-bar"></i> Звіт            'closed': 'Закрито'

                                    </button>        }[ticket.status];

                                </div>        

                                <div class="col-md-6 mb-2">        const priorityBadge = document.getElementById('ticketPriorityBadge');

                                    <button class="btn btn-outline-warning btn-block" onclick="supportManager.sendBroadcast()">        priorityBadge.className = `badge badge-${ticket.priority}`;

                                        <i class="fas fa-bullhorn"></i> Розсилка        priorityBadge.textContent = {

                                    </button>            'low': 'Низький',

                                </div>            'medium': 'Середній',

                            </div>            'high': 'Високий',

                        </div>            'critical': 'Критичний'

                    </div>        }[ticket.priority];

                </div>        

            </div>        // Оновлення

        const updatesContainer = document.getElementById('ticketUpdates');

            <!-- Модальне вікно деталей тікета -->        updatesContainer.innerHTML = '';

            <div class="modal fade" id="ticket-details-modal" tabindex="-1">        

                <div class="modal-dialog modal-xl">        ticket.updates.forEach(update => {

                    <div class="modal-content">            const updateElement = document.createElement('div');

                        <div class="modal-header">            updateElement.className = 'update-item mb-3 p-3 border rounded';

                            <h4 class="modal-title" id="ticket-modal-title">            updateElement.innerHTML = `

                                <i class="fas fa-ticket-alt"></i> Деталі тікета                <div class="d-flex justify-content-between">

                            </h4>                    <strong>${update.author}</strong>

                            <button type="button" class="close" data-dismiss="modal">                    <small class="text-muted">${new Date(update.timestamp).toLocaleString('uk-UA')}</small>

                                <span>&times;</span>                </div>

                            </button>                <p class="mb-0">${update.message}</p>

                        </div>            `;

                        <div class="modal-body">            updatesContainer.appendChild(updateElement);

                            <div id="ticket-details-content">        });

                                <!-- Контент буде додано динамічно -->        

                            </div>        $('#viewTicketModal').modal('show');

                        </div>    }

                        <div class="modal-footer">

                            <button type="button" class="btn btn-success" onclick="supportManager.resolveTicket()">    addComment() {

                                <i class="fas fa-check"></i> Вирішити        const comment = prompt('Введіть ваш коментар:');

                            </button>        if (comment) {

                            <button type="button" class="btn btn-warning" onclick="supportManager.escalateTicket()">            this.showNotification('Коментар додано', 'success');

                                <i class="fas fa-arrow-up"></i> Ескалувати            $('#viewTicketModal').modal('hide');

                            </button>        }

                            <button type="button" class="btn btn-secondary" data-dismiss="modal">    }

                                Закрити

                            </button>    renderKnowledgeBase() {

                        </div>        const container = document.getElementById('knowledgeBaseList');

                    </div>        container.innerHTML = '';

                </div>        

            </div>        this.knowledgeBase.forEach(item => {

            const col = document.createElement('div');

            <!-- Real-time нотифікації -->            col.className = 'col-md-6 mb-4';

            <div id="support-notifications" class="fixed-top mr-3 mt-3" style="right: 0; width: 400px; z-index: 9999;">            

                <!-- Нотифікації будуть додані динамічно -->            col.innerHTML = `

            </div>                <div class="knowledge-base-item bg-white">

        `;                    <h5 class="text-primary">${item.title}</h5>

                    <p class="text-muted">${item.content.substring(0, 100)}...</p>

        // Повторно налаштувати обробники після рендера                    <div class="tags">

        setTimeout(() => this.setupEventHandlers(), 100);                        ${item.tags.map(tag => `<span class="badge badge-secondary mr-1">${tag}</span>`).join('')}

    }                    </div>

                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="supportManager.viewArticle(${item.id})">

    renderTicketsList() {                        <i class="fas fa-book-open"></i> Читати далі

        return this.tickets.map(ticket => `                    </button>

            <div class="list-group-item list-group-item-action ticket-item"                 </div>

                 data-ticket-id="${ticket.id}"             `;

                 onclick="supportManager.openTicket('${ticket.id}')">            

                <div class="d-flex w-100 justify-content-between">            container.appendChild(col);

                    <div class="d-flex align-items-center">        });

                        <span class="badge badge-${this.getPriorityColor(ticket.priority)} mr-2">    }

                            ${this.getPriorityText(ticket.priority)}

                        </span>    searchKnowledgeBase() {

                        <h6 class="mb-1">${ticket.title}</h6>        const searchTerm = document.getElementById('knowledgeBaseSearch').value.toLowerCase();

                    </div>        if (!searchTerm) {

                    <div class="text-right">            this.renderKnowledgeBase();

                        <small class="text-muted">${this.formatDate(ticket.updatedAt)}</small>            return;

                        <br>        }

                        <span class="badge badge-${this.getStatusColor(ticket.status)}">        

                            ${this.getStatusText(ticket.status)}        const filtered = this.knowledgeBase.filter(item =>

                        </span>            item.title.toLowerCase().includes(searchTerm) ||

                    </div>            item.content.toLowerCase().includes(searchTerm) ||

                </div>            item.tags.some(tag => tag.toLowerCase().includes(searchTerm))

                <div class="d-flex w-100 justify-content-between">        );

                    <p class="mb-1 text-muted">${ticket.description.substring(0, 100)}...</p>        

                    <small class="text-muted">        const container = document.getElementById('knowledgeBaseList');

                        <i class="fas fa-user"></i> ${ticket.createdBy.name}        container.innerHTML = '';

                    </small>        

                </div>        if (filtered.length === 0) {

                <div class="d-flex w-100 justify-content-between align-items-center">            container.innerHTML = `

                    <div>                <div class="col-12 text-center py-4">

                        <small class="text-muted">                    <i class="fas fa-search fa-3x text-muted mb-3"></i>

                            <i class="fas fa-building"></i> ${ticket.building}                    <h5>Нічого не знайдено</h5>

                        </small>                    <p class="text-muted">Спробуйте інший запит пошуку</p>

                        ${ticket.tags.map(tag => `<span class="badge badge-light badge-sm ml-1">${tag}</span>`).join('')}                </div>

                    </div>            `;

                    ${ticket.assignedTo ? `            return;

                        <div class="d-flex align-items-center">        }

                            <img src="${ticket.assignedTo.avatar}" alt="${ticket.assignedTo.name}"         

                                 class="img-circle mr-1" width="20">        filtered.forEach(item => {

                            <small>${ticket.assignedTo.name}</small>            const col = document.createElement('div');

                        </div>            col.className = 'col-md-6 mb-4';

                    ` : ''}            col.innerHTML = `

                </div>                <div class="knowledge-base-item bg-white">

            </div>                    <h5 class="text-primary">${item.title}</h5>

        `).join('');                    <p class="text-muted">${item.content.substring(0, 100)}...</p>

    }                    <div class="tags">

                        ${item.tags.map(tag => `<span class="badge badge-secondary mr-1">${tag}</span>`).join('')}

    renderFAQList() {                    </div>

        return this.faqs.map(faq => `                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="supportManager.viewArticle(${item.id})">

            <div class="faq-item mb-3 p-3 border rounded">                        <i class="fas fa-book-open"></i> Читати далі

                <h6 class="mb-2">                    </button>

                    <i class="fas fa-question-circle text-primary"></i>                </div>

                    ${faq.question}            `;

                </h6>            container.appendChild(col);

                <p class="mb-2 text-muted small">${faq.answer.replace(/\\n/g, '<br>')}</p>        });

                <div class="d-flex justify-content-between">    }

                    <small class="text-muted">

                        <i class="fas fa-eye"></i> ${faq.views} переглядів    viewArticle(articleId) {

                    </small>        const article = this.knowledgeBase.find(a => a.id === articleId);

                    <small class="text-success">        if (article) {

                        <i class="fas fa-thumbs-up"></i> ${faq.helpful} корисно            alert(`${article.title}\n\n${article.content}`);

                    </small>        }

                </div>    }

            </div>

        `).join('');    renderFAQ() {

    }        const container = document.getElementById('faqAccordion');

        container.innerHTML = '';

    // Утилітарні методи        

    getPriorityColor(priority) {        this.faq.forEach((item, index) => {

        const colors = {            const faqItem = document.createElement('div');

            'low': 'success',            faqItem.className = 'faq-item card';

            'medium': 'warning',            

            'high': 'danger',            faqItem.innerHTML = `

            'urgent': 'dark'                <div class="card-header" id="faqHeading${index}">

        };                    <h5 class="mb-0">

        return colors[priority] || 'secondary';                        <button class="btn btn-link" type="button" data-toggle="collapse" 

    }                                data-target="#faqCollapse${index}" aria-expanded="false" 

                                aria-controls="faqCollapse${index}">

    getPriorityText(priority) {                            <i class="fas fa-question-circle mr-2"></i>${item.question}

        const texts = {                        </button>

            'low': 'Низький',                    </h5>

            'medium': 'Середній',                 </div>

            'high': 'Високий',                <div id="faqCollapse${index}" class="collapse" aria-labelledby="faqHeading${index}">

            'urgent': 'Критичний'                    <div class="card-body">

        };                        ${item.answer}

        return texts[priority] || priority;                    </div>

    }                </div>

            `;

    getStatusColor(status) {            

        const colors = {            container.appendChild(faqItem);

            'open': 'primary',        });

            'in_progress': 'warning',    }

            'resolved': 'success',

            'closed': 'secondary'    startChat() {

        };        $('#chatSection').slideDown();

        return colors[status] || 'secondary';        this.activeChat = {

    }            id: 'chat-' + Date.now(),

            startedAt: new Date().toISOString(),

    getStatusText(status) {            messages: [

        const texts = {                {

            'open': 'Відкритий',                    type: 'support',

            'in_progress': 'В роботі',                    message: 'Вітаємо! Чим можемо допомогти?',

            'resolved': 'Вирішений',                    timestamp: new Date().toISOString()

            'closed': 'Закритий'                }

        };            ]

        return texts[status] || status;        };

    }        

        this.renderChatMessages();

    formatDate(dateString) {        $('html, body').animate({

        const date = new Date(dateString);            scrollTop: $('#chatSection').offset().top

        const now = new Date();        }, 500);

        const diff = now - date;        

                this.showNotification('Чат з підтримкою розпочато', 'success');

        if (diff < 60000) return 'Щойно';    }

        if (diff < 3600000) return `${Math.floor(diff / 60000)} хв тому`;

        if (diff < 86400000) return `${Math.floor(diff / 3600000)} год тому`;    endChat() {

                if (confirm('Завершити чат з підтримкою?')) {

        return date.toLocaleDateString('uk-UA');            $('#chatSection').slideUp();

    }            this.activeChat = null;

            this.showNotification('Чат завершено', 'info');

    // ===================================        }

    // WEBSOCKET REAL-TIME ФУНКЦІОНАЛЬНІСТЬ    }

    // ===================================

    sendMessage() {

    broadcastSupportStatus() {        const input = document.getElementById('chatInput');

        if (this.wsClient) {        const message = input.value.trim();

            this.wsClient.send({        

                type: 'support_status_update',        if (!message) return;

                data: {        

                    agentId: this.userId,        // Додати повідомлення клієнта

                    isAvailable: true,        this.activeChat.messages.push({

                    activeTickets: this.tickets.filter(t => t.assignedTo?.id === this.userId && t.status !== 'resolved').length,            type: 'client',

                    timestamp: new Date().toISOString()            message: message,

                }            timestamp: new Date().toISOString()

            });        });

        }        

    }        input.value = '';

        this.renderChatMessages();

    handleNewTicket(data) {        

        console.log('🎫 Новий тікет:', data);        // Симуляція відповіді підтримки

                setTimeout(() => {

        this.tickets.unshift(data.ticket);            this.activeChat.messages.push({

        this.refreshTicketsList();                type: 'support',

                        message: 'Дякуємо за повідомлення. Оператор зв\'яжеться з вами найближчим часом.',

        this.showRealtimeNotification(                timestamp: new Date().toISOString()

            `Новий тікет: ${data.ticket.title}`,            });

            'info',            this.renderChatMessages();

            () => this.openTicket(data.ticket.id)        }, 1000);

        );    }

    }

    renderChatMessages() {

    handleTicketUpdate(data) {        const container = document.getElementById('chatMessages');

        console.log('🔄 Тікет оновлено:', data);        container.innerHTML = '';

                

        const ticketIndex = this.tickets.findIndex(t => t.id === data.ticketId);        this.activeChat.messages.forEach(msg => {

        if (ticketIndex !== -1) {            const messageDiv = document.createElement('div');

            this.tickets[ticketIndex] = { ...this.tickets[ticketIndex], ...data.updates };            messageDiv.className = `chat-message message-${msg.type}`;

            this.refreshTicketsList();            

        }            messageDiv.innerHTML = `

                        <div class="message-content">

        this.showRealtimeNotification(`Тікет ${data.ticketId} оновлено`, 'warning');                    <p class="mb-1">${msg.message}</p>

    }                    <small class="message-time">${new Date(msg.timestamp).toLocaleTimeString('uk-UA')}</small>

                </div>

    handleNewMessage(data) {            `;

        console.log('💬 Нове повідомлення:', data);            

                    container.appendChild(messageDiv);

        const ticket = this.tickets.find(t => t.id === data.ticketId);        });

        if (ticket) {        

            ticket.messages.push(data.message);        // Прокрутити до останнього повідомлення

                    container.scrollTop = container.scrollHeight;

            // Якщо тікет відкритий в модальному вікні, оновити його    }

            if (this.currentTicket && this.currentTicket.id === data.ticketId) {

                this.refreshTicketDetails();    callSupport() {

            }        this.showNotification('Иммитация звонка в службу поддержки...', 'info');

        }        setTimeout(() => {

                    if (confirm('Передзвонити вам протягом 5 хвилин?')) {

        this.showRealtimeNotification(                this.showNotification('Оператор передзвонить вам найближчим часом', 'success');

            `Нове повідомлення в тікеті ${data.ticketId}`,            }

            'success',        }, 1000);

            () => this.openTicket(data.ticketId)    }

        );

    }    emailSupport() {

        const email = 'support@liftservice.com';

    handleUrgentRequest(data) {        const subject = encodeURIComponent('Звернення з клієнтського порталу');

        console.log('🚨 Терміновий запит:', data);        const body = encodeURIComponent('Доброго дня,\n\nЯ хотів би звернутися з наступним питанням:\n\n');

                

        this.showUrgentNotification(data.message, data.ticketId);        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;

    }        this.showNotification('Email відкрито в вашому клієнті', 'info');

    }

    // Нотифікації

    showRealtimeNotification(message, type = 'info', clickHandler = null) {    showNotification(message, type = 'info') {

        const container = document.getElementById('support-notifications');        const toast = $(`<div class="toast" role="alert" aria-live="assertive" aria-atomic="true">

        if (!container) return;            <div class="toast-header">

                <strong class="mr-auto">Підтримка</strong>

        const alertClass = {                <small class="text-muted">${new Date().toLocaleTimeString('uk-UA')}</small>

            'success': 'alert-success',                <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">

            'info': 'alert-info',                    <span aria-hidden="true">&times;</span>

            'warning': 'alert-warning',                </button>

            'danger': 'alert-danger'            </div>

        }[type] || 'alert-info';            <div class="toast-body">

                ${message}

        const notification = document.createElement('div');            </div>

        notification.className = `alert ${alertClass} alert-dismissible fade show mb-2`;        </div>`);

        notification.style.cursor = clickHandler ? 'pointer' : 'default';

        notification.innerHTML = `        const headerClass = {

            <button type="button" class="close" data-dismiss="alert">            success: 'bg-success',

                <span>&times;</span>            error: 'bg-danger',

            </button>            warning: 'bg-warning',

            <i class="fas fa-bell"></i> ${message}            info: 'bg-info'

            <small class="d-block mt-1 text-muted">${new Date().toLocaleTimeString('uk-UA')}</small>        }[type] || 'bg-info';

        `;

        toast.find('.toast-header').addClass(`${headerClass} text-white`);

        if (clickHandler) {        

            notification.addEventListener('click', clickHandler);        if (!document.getElementById('toastContainer')) {

        }            const container = document.createElement('div');

            container.id = 'toastContainer';

        container.appendChild(notification);            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';

            container.style.zIndex = '9999';

        // Автоматично приховати через 10 секунд            document.body.appendChild(container);

        setTimeout(() => {        }

            if (notification.parentNode) {        

                notification.remove();        $('#toastContainer').append(toast);

            }        toast.toast({ delay: 3000 }).toast('show');

        }, 10000);        toast.on('hidden.bs.toast', function () { $(this).remove(); });

    }    }

}

    showUrgentNotification(message, ticketId) {

        this.showRealtimeNotification(// Ініціалізація

            `🚨 ТЕРМІНОВО: ${message}`,document.addEventListener('DOMContentLoaded', function() {

            'danger',    window.supportManager = new SupportManager();

            () => this.openTicket(ticketId)});
        );
    }

    // Дії з тікетами
    openTicket(ticketId) {
        this.currentTicket = this.tickets.find(t => t.id === ticketId);
        if (!this.currentTicket) return;

        this.renderTicketDetails();
        $('#ticket-details-modal').modal('show');
    }

    renderTicketDetails() {
        const ticket = this.currentTicket;
        const content = document.getElementById('ticket-details-content');
        if (!content) return;

        content.innerHTML = `
            <div class="row">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header">
                            <h5>${ticket.title}</h5>
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <span class="badge badge-${this.getPriorityColor(ticket.priority)}">
                                        ${this.getPriorityText(ticket.priority)}
                                    </span>
                                    <span class="badge badge-${this.getStatusColor(ticket.status)} ml-2">
                                        ${this.getStatusText(ticket.status)}
                                    </span>
                                </div>
                                <small class="text-muted">#${ticket.id}</small>
                            </div>
                        </div>
                        <div class="card-body">
                            <p>${ticket.description}</p>
                            
                            <!-- Повідомлення -->
                            <div class="messages-container" style="max-height: 400px; overflow-y: auto;">
                                ${ticket.messages.map(msg => `
                                    <div class="message ${msg.type} mb-3 p-3 border rounded">
                                        <div class="d-flex justify-content-between">
                                            <strong>${msg.type === 'user' ? ticket.createdBy.name : 'Підтримка'}</strong>
                                            <small class="text-muted">${this.formatDate(msg.timestamp)}</small>
                                        </div>
                                        <p class="mb-0 mt-2">${msg.text}</p>
                                    </div>
                                `).join('')}
                            </div>

                            <!-- Форма відповіді -->
                            <div class="mt-3">
                                <div class="form-group">
                                    <label>Відповідь:</label>
                                    <textarea id="response-text" class="form-control" rows="3" 
                                              placeholder="Введіть відповідь..."></textarea>
                                </div>
                                <button class="btn btn-primary" onclick="supportManager.sendResponse()">
                                    <i class="fas fa-paper-plane"></i> Відправити
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header">
                            <h6>Інформація про тікет</h6>
                        </div>
                        <div class="card-body">
                            <dl class="row">
                                <dt class="col-sm-6">Створено:</dt>
                                <dd class="col-sm-6">${this.formatDate(ticket.createdAt)}</dd>
                                
                                <dt class="col-sm-6">Оновлено:</dt>
                                <dd class="col-sm-6">${this.formatDate(ticket.updatedAt)}</dd>
                                
                                <dt class="col-sm-6">Категорія:</dt>
                                <dd class="col-sm-6">${ticket.category}</dd>
                                
                                <dt class="col-sm-6">Будівля:</dt>
                                <dd class="col-sm-6">${ticket.building}</dd>
                                
                                <dt class="col-sm-6">Ліфт:</dt>
                                <dd class="col-sm-6">${ticket.liftId}</dd>
                            </dl>
                            
                            <div class="mt-3">
                                <h6>Теги:</h6>
                                ${ticket.tags.map(tag => `<span class="badge badge-secondary mr-1">${tag}</span>`).join('')}
                            </div>

                            ${ticket.assignedTo ? `
                                <div class="mt-3">
                                    <h6>Призначено:</h6>
                                    <div class="d-flex align-items-center">
                                        <img src="${ticket.assignedTo.avatar}" alt="${ticket.assignedTo.name}" 
                                             class="img-circle mr-2" width="30">
                                        <span>${ticket.assignedTo.name}</span>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    sendResponse() {
        const responseText = document.getElementById('response-text').value.trim();
        if (!responseText) {
            alert('Введіть текст відповіді');
            return;
        }

        const newMessage = {
            id: Date.now(),
            from: this.userId,
            text: responseText,
            timestamp: new Date().toISOString(),
            type: 'agent'
        };

        this.currentTicket.messages.push(newMessage);
        this.currentTicket.updatedAt = new Date().toISOString();
        
        // Оновити статус тікета якщо він був відкритий
        if (this.currentTicket.status === 'open') {
            this.currentTicket.status = 'in_progress';
        }

        // Відправити через WebSocket
        if (this.wsClient) {
            this.wsClient.send({
                type: 'support_message_sent',
                data: {
                    ticketId: this.currentTicket.id,
                    message: newMessage
                }
            });
        }

        document.getElementById('response-text').value = '';
        this.renderTicketDetails();
        this.refreshTicketsList();
        
        alert('Відповідь відправлено');
    }

    refreshTicketsList() {
        const container = document.getElementById('tickets-list');
        if (container) {
            container.innerHTML = this.renderTicketsList();
        }
    }

    refreshTicketDetails() {
        if (this.currentTicket) {
            this.renderTicketDetails();
        }
    }

    async refreshTickets() {
        await this.loadTickets();
        this.refreshTicketsList();
    }

    // Експорт тікетів
    exportTickets() {
        const exportData = this.tickets.map(ticket => ({
            'ID': ticket.id,
            'Заголовок': ticket.title,
            'Опис': ticket.description,
            'Пріоритет': this.getPriorityText(ticket.priority),
            'Статус': this.getStatusText(ticket.status),
            'Категорія': ticket.category,
            'Створив': ticket.createdBy.name,
            'Призначено': ticket.assignedTo?.name || 'Не призначено',
            'Будівля': ticket.building,
            'Створено': this.formatDate(ticket.createdAt),
            'Оновлено': this.formatDate(ticket.updatedAt)
        }));

        const csvContent = this.convertToCSV(exportData);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `support-tickets-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert('Тікети експортовано');
    }

    convertToCSV(objArray) {
        const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
        let str = '';
        
        const headers = Object.keys(array[0]);
        str += headers.join(',') + '\\r\\n';
        
        for (let i = 0; i < array.length; i++) {
            let line = '';
            for (let index in array[i]) {
                if (line !== '') line += ',';
                line += '"' + array[i][index] + '"';
            }
            str += line + '\\r\\n';
        }
        
        return str;
    }

    // Додаткові дії
    escalateUrgent() {
        const urgentTickets = this.tickets.filter(t => t.priority === 'urgent' && t.status !== 'resolved');
        if (urgentTickets.length === 0) {
            alert('Немає термінових тікетів для ескалації');
            return;
        }

        urgentTickets.forEach(ticket => {
            ticket.status = 'escalated';
            if (this.wsClient) {
                this.wsClient.send({
                    type: 'ticket_escalated',
                    data: { ticketId: ticket.id }
                });
            }
        });

        this.refreshTicketsList();
        alert(`${urgentTickets.length} тікетів ескальовано`);
    }

    bulkResolve() {
        const resolvedCount = this.tickets.filter(t => t.status === 'in_progress').length;
        if (resolvedCount === 0) {
            alert('Немає тікетів для масового вирішення');
            return;
        }

        if (confirm(`Вирішити ${resolvedCount} тікетів?`)) {
            this.tickets.forEach(ticket => {
                if (ticket.status === 'in_progress') {
                    ticket.status = 'resolved';
                    ticket.updatedAt = new Date().toISOString();
                }
            });

            this.refreshTicketsList();
            alert(`${resolvedCount} тікетів вирішено`);
        }
    }

    generateReport() {
        const report = {
            total: this.tickets.length,
            open: this.tickets.filter(t => t.status === 'open').length,
            inProgress: this.tickets.filter(t => t.status === 'in_progress').length,
            resolved: this.tickets.filter(t => t.status === 'resolved').length,
            byPriority: {
                low: this.tickets.filter(t => t.priority === 'low').length,
                medium: this.tickets.filter(t => t.priority === 'medium').length,
                high: this.tickets.filter(t => t.priority === 'high').length,
                urgent: this.tickets.filter(t => t.priority === 'urgent').length
            }
        };

        console.log('📊 Звіт підтримки:', report);
        alert('Звіт згенеровано (дивіться консоль)');
    }

    sendBroadcast() {
        const message = prompt('Введіть повідомлення для розсилки:');
        if (message) {
            if (this.wsClient) {
                this.wsClient.send({
                    type: 'support_broadcast',
                    data: { message }
                });
            }
            alert('Повідомлення розіслано');
        }
    }
}

// Глобальна ініціалізація
let supportManager;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof supportManager === 'undefined') {
        supportManager = new SupportManager();
        window.supportManager = supportManager; // Глобальний доступ
    }
});

console.log('🎧 Support Manager модуль завантажено');