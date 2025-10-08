/**
 * Support Manager - Адаптований під власний дизайн DeapSeak
 * Використовує власні CSS стилі замість AdminLTE
 */

class SupportManagerRedesigned {
    constructor() {
        this.apiUrl = 'http://localhost:3001/api';
        this.wsClient = null;
        this.tickets = [];
        this.faqs = [];
        this.currentTicket = null;
        this.filteredTickets = [];
        this.userId = localStorage.getItem('userId') || 'support-agent-001';
        this.userRole = localStorage.getItem('userRole') || 'support';
        
        this.init();
    }

    async init() {
        console.log('🎧 Ініціалізація Support Manager (Redesigned)...');
        
        try {
            await this.setupWebSocket();
            await this.loadTickets();
            await this.loadFAQs();
            this.setupEventHandlers();
            this.setupRealTimeFeatures();
            this.renderContent();
            
            console.log('✅ Support Manager (Redesigned) ініціалізовано');
        } catch (error) {
            console.error('❌ Помилка ініціалізації Support Manager:', error);
        }
    }

    async setupWebSocket() {
        if (typeof WebSocketUtils !== 'undefined') {
            try {
                this.wsClient = WebSocketUtils.init(this.userId, localStorage.getItem('authToken'));
                
                this.wsClient.on('support_ticket_created', (data) => {
                    this.handleNewTicket(data);
                });
                
                this.wsClient.on('support_ticket_updated', (data) => {
                    this.handleTicketUpdate(data);
                });

                this.wsClient.on('support_message_received', (data) => {
                    this.handleNewMessage(data);
                });

                this.wsClient.on('support_urgent_request', (data) => {
                    this.handleUrgentRequest(data);
                });
                
                console.log('🔌 WebSocket підключено до Support Manager');
            } catch (error) {
                console.warn('⚠️ WebSocket недоступний, працюємо в автономному режимі');
            }
        }
    }

    setupRealTimeFeatures() {
        // Оновлення статусу підтримки
        this.broadcastSupportStatus();
        setInterval(() => this.broadcastSupportStatus(), 30000);

        // Автоматичне оновлення тікетів
        setInterval(() => this.refreshTickets(), 60000);
    }

    async loadTickets() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${this.apiUrl}/support/tickets`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.tickets = await response.json();
            } else {
                this.tickets = this.getTestTickets();
            }
            
            this.filteredTickets = [...this.tickets];
        } catch (error) {
            console.warn('Використовую тестові тікети:', error);
            this.tickets = this.getTestTickets();
            this.filteredTickets = [...this.tickets];
        }
    }

    getTestTickets() {
        return [
            {
                id: 'TK001',
                title: 'Ліфт не працює на 5 поверсі',
                description: 'Ліфт зупинився між поверхами, людей немає всередині. Потрібна невідкладна технічна допомога.',
                category: 'technical',
                priority: 'high',
                status: 'open',
                createdBy: {
                    id: 'user1',
                    name: 'Олександр Іваненко',
                    email: 'alex@building.com'
                },
                assignedTo: {
                    id: 'agent1',
                    name: 'Марія Технік',
                    avatar: 'https://ui-avatars.com/api/?name=Марія+Технік&background=007bff&color=fff'
                },
                createdAt: new Date(Date.now() - 3600000).toISOString(),
                updatedAt: new Date(Date.now() - 1800000).toISOString(),
                messages: [
                    {
                        id: 1,
                        from: 'user1',
                        text: 'Ліфт зупинився на 4.5 поверсі, двері не відкриваються',
                        timestamp: new Date(Date.now() - 3600000).toISOString(),
                        type: 'user'
                    },
                    {
                        id: 2,
                        from: 'agent1',
                        text: 'Дякую за звернення. Технічний спеціаліст вже в дорозі.',
                        timestamp: new Date(Date.now() - 3000000).toISOString(),
                        type: 'agent'
                    }
                ],
                tags: ['urgent', 'building-a', 'elevator-2'],
                building: 'ТЦ "Центральний"',
                liftId: 'lift-001'
            },
            {
                id: 'TK002',
                title: 'Проблема з картковим доступом',
                description: 'Карта доступу не працює в ліфті, не можу потрапити на потрібний поверх.',
                category: 'access',
                priority: 'medium',
                status: 'in_progress',
                createdBy: {
                    id: 'user2',
                    name: 'Анна Клієнт',
                    email: 'anna@company.com'
                },
                assignedTo: {
                    id: 'agent2',
                    name: 'Петро Підтримка',
                    avatar: 'https://ui-avatars.com/api/?name=Петро+Підтримка&background=28a745&color=fff'
                },
                createdAt: new Date(Date.now() - 7200000).toISOString(),
                updatedAt: new Date(Date.now() - 900000).toISOString(),
                messages: [
                    {
                        id: 1,
                        from: 'user2',
                        text: 'Карта не працює вже третій день',
                        timestamp: new Date(Date.now() - 7200000).toISOString(),
                        type: 'user'
                    }
                ],
                tags: ['access', 'card', 'building-b'],
                building: 'Офіс-центр "Прем\'єр"',
                liftId: 'lift-003'
            },
            {
                id: 'TK003',
                title: 'Питання про сервісне обслуговування',
                description: 'Коли планується наступне технічне обслуговування ліфта? Чи буде попередження?',
                category: 'general',
                priority: 'low',
                status: 'resolved',
                createdBy: {
                    id: 'user3',
                    name: 'Сергій Управитель',
                    email: 'sergey@management.com'
                },
                assignedTo: {
                    id: 'agent1',
                    name: 'Марія Технік',
                    avatar: 'https://ui-avatars.com/api/?name=Марія+Технік&background=007bff&color=fff'
                },
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                updatedAt: new Date(Date.now() - 3600000).toISOString(),
                messages: [
                    {
                        id: 1,
                        from: 'user3',
                        text: 'Коли буде ТО?',
                        timestamp: new Date(Date.now() - 86400000).toISOString(),
                        type: 'user'
                    },
                    {
                        id: 2,
                        from: 'agent1',
                        text: 'ТО заплановано на наступний тиждень, повідомимо заздалегідь.',
                        timestamp: new Date(Date.now() - 82800000).toISOString(),
                        type: 'agent'
                    }
                ],
                tags: ['maintenance', 'schedule', 'planned'],
                building: 'ЖК "Сонячний"',
                liftId: 'lift-007'
            },
            {
                id: 'TK004',
                title: 'Шум у ліфті під час роботи',
                description: 'Ліфт видає незвичний металевий скрип при підйомі. Це безпечно?',
                category: 'technical',
                priority: 'urgent',
                status: 'open',
                createdBy: {
                    id: 'user4',
                    name: 'Ольга Мешканка',
                    email: 'olga@resident.com'
                },
                assignedTo: null,
                createdAt: new Date(Date.now() - 1800000).toISOString(),
                updatedAt: new Date(Date.now() - 1800000).toISOString(),
                messages: [],
                tags: ['urgent', 'noise', 'safety'],
                building: 'ЖК "Висотний"',
                liftId: 'lift-012'
            }
        ];
    }

    async loadFAQs() {
        this.faqs = [
            {
                id: 1,
                category: 'Технічні проблеми',
                question: 'Що робити якщо ліфт зупинився?',
                answer: '1. Не панікуйте та зберігайте спокій\n2. Натисніть кнопку виклику диспетчера\n3. Чекайте на допомогу технічного персоналу\n4. Не намагайтеся відкрити двері самостійно\n5. При потребі зателефонуйте за номером екстреної служби',
                views: 1250,
                helpful: 89
            },
            {
                id: 2,
                category: 'Доступ',
                question: 'Як отримати карту доступу до ліфта?',
                answer: 'Для отримання карти доступу зверніться до адміністрації будівлі з паспортом або іншим документом, що посвідчує особу. Карта видається протягом 1-2 робочих днів після подання заявки.',
                views: 890,
                helpful: 67
            },
            {
                id: 3,  
                category: 'Сервіс',
                question: 'Як часто проводиться технічне обслуговування?',
                answer: 'Планове технічне обслуговування проводиться щомісяця згідно з регламентом. Капітальний ремонт здійснюється раз на рік. Про всі роботи мешканці повідомляються заздалегідь.',
                views: 445,
                helpful: 34
            },
            {
                id: 4,
                category: 'Безпека',
                question: 'Що робити при спрацьовуванні аварійної сигналізації?',
                answer: 'При спрацьовуванні аварійної сигналізації необхідно залишити ліфт на найближчому поверсі та звернутися до диспетчерської служби. Не використовуйте ліфт до усунення неполадки.',
                views: 678,
                helpful: 45
            }
        ];
    }

    setupEventHandlers() {
        // Пошук тікетів
        const searchInput = document.getElementById('ticket-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterTickets();
            });
        }

        // Фільтри
        ['priority-filter', 'status-filter', 'category-filter'].forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => {
                    this.filterTickets();
                });
            }
        });
    }

    renderContent() {
        this.updateStatistics();
        this.renderTickets();
        this.renderFAQs();
    }

    updateStatistics() {
        const totalElement = document.getElementById('total-tickets');
        const openElement = document.getElementById('open-tickets');
        const highPriorityElement = document.getElementById('high-priority-tickets');
        const resolvedElement = document.getElementById('resolved-tickets');

        if (totalElement) totalElement.textContent = this.tickets.length;
        if (openElement) openElement.textContent = this.tickets.filter(t => t.status === 'open').length;
        if (highPriorityElement) highPriorityElement.textContent = this.tickets.filter(t => t.priority === 'high' || t.priority === 'urgent').length;
        if (resolvedElement) resolvedElement.textContent = this.tickets.filter(t => t.status === 'resolved').length;
    }

    renderTickets() {
        const container = document.getElementById('tickets-list');
        if (!container) return;

        if (this.filteredTickets.length === 0) {
            container.innerHTML = `
                <div class="text-center p-5">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h5>Тікети не знайдені</h5>
                    <p class="text-muted">Спробуйте змінити параметри фільтрації</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.filteredTickets.map(ticket => `
            <div class="ticket-item priority-${ticket.priority}" onclick="supportManager.openTicket('${ticket.id}')">
                <div class="ticket-header">
                    <h5 class="ticket-title">${ticket.title}</h5>
                    <div class="ticket-meta">
                        <span class="badge ${this.getPriorityClass(ticket.priority)}">
                            ${this.getPriorityText(ticket.priority)}
                        </span>
                        <span class="badge ${this.getStatusClass(ticket.status)}">
                            ${this.getStatusText(ticket.status)}
                        </span>
                        <small class="text-muted">
                            <i class="fas fa-clock"></i>
                            ${this.formatDate(ticket.updatedAt)}
                        </small>
                    </div>
                </div>
                
                <div class="ticket-description">
                    ${ticket.description.length > 120 ? ticket.description.substring(0, 120) + '...' : ticket.description}
                </div>
                
                <div class="ticket-footer">
                    <div class="d-flex align-items-center gap-3">
                        <small class="text-muted">
                            <i class="fas fa-user"></i>
                            ${ticket.createdBy.name}
                        </small>
                        <small class="text-muted">
                            <i class="fas fa-building"></i>
                            ${ticket.building}
                        </small>
                        <div class="ticket-tags">
                            ${ticket.tags.slice(0, 3).map(tag => `<span class="ticket-tag">${tag}</span>`).join('')}
                        </div>
                    </div>
                    
                    ${ticket.assignedTo ? `
                        <div class="ticket-assignee">
                            <img src="${ticket.assignedTo.avatar}" alt="${ticket.assignedTo.name}" class="assignee-avatar">
                            <span>${ticket.assignedTo.name}</span>
                        </div>
                    ` : `
                        <div class="ticket-assignee">
                            <i class="fas fa-user-plus text-muted"></i>
                            <span class="text-muted">Не призначено</span>
                        </div>
                    `}
                </div>
            </div>
        `).join('');
    }

    renderFAQs() {
        const container = document.getElementById('faq-list');
        if (!container) return;

        container.innerHTML = this.faqs.map(faq => `
            <div class="faq-item">
                <div class="faq-question">
                    <i class="fas fa-question-circle text-primary"></i>
                    ${faq.question}
                </div>
                <div class="faq-answer">
                    ${faq.answer.replace(/\n/g, '<br>')}
                </div>
                <div class="faq-stats">
                    <span>
                        <i class="fas fa-eye text-info"></i>
                        ${faq.views} переглядів
                    </span>
                    <span>
                        <i class="fas fa-thumbs-up text-success"></i>
                        ${faq.helpful} корисно
                    </span>
                </div>
            </div>
        `).join('');
    }

    filterTickets() {
        const searchTerm = document.getElementById('ticket-search')?.value.toLowerCase() || '';
        const priorityFilter = document.getElementById('priority-filter')?.value || '';
        const statusFilter = document.getElementById('status-filter')?.value || '';
        const categoryFilter = document.getElementById('category-filter')?.value || '';

        this.filteredTickets = this.tickets.filter(ticket => {
            const matchesSearch = !searchTerm || 
                ticket.title.toLowerCase().includes(searchTerm) ||
                ticket.description.toLowerCase().includes(searchTerm) ||
                ticket.createdBy.name.toLowerCase().includes(searchTerm);
            
            const matchesPriority = !priorityFilter || ticket.priority === priorityFilter;
            const matchesStatus = !statusFilter || ticket.status === statusFilter;
            const matchesCategory = !categoryFilter || ticket.category === categoryFilter;

            return matchesSearch && matchesPriority && matchesStatus && matchesCategory;
        });

        this.renderTickets();
    }

    openTicket(ticketId) {
        this.currentTicket = this.tickets.find(t => t.id === ticketId);
        if (!this.currentTicket) return;

        this.showTicketModal();
    }

    showTicketModal() {
        const ticket = this.currentTicket;
        const modalContainer = document.getElementById('ticket-modal-container');
        
        modalContainer.innerHTML = `
            <div class="modal fade" id="ticketModal" tabindex="-1" aria-labelledby="ticketModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content" style="border-radius: var(--border-radius-lg); border: none; box-shadow: var(--shadow-lg);">
                        <div class="modal-header" style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: white; border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0; border: none;">
                            <h5 class="modal-title" id="ticketModalLabel">
                                <i class="fas fa-ticket-alt"></i>
                                Тікет #${ticket.id}
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body" style="padding: 25px;">
                            <div class="row">
                                <div class="col-lg-8">
                                    <div class="card">
                                        <div class="card-header">
                                            <h6>${ticket.title}</h6>
                                            <div class="d-flex gap-2 mt-2">
                                                <span class="badge ${this.getPriorityClass(ticket.priority)}">
                                                    ${this.getPriorityText(ticket.priority)}
                                                </span>
                                                <span class="badge ${this.getStatusClass(ticket.status)}">
                                                    ${this.getStatusText(ticket.status)}
                                                </span>
                                            </div>
                                        </div>
                                        <div class="card-body">
                                            <p><strong>Опис:</strong></p>
                                            <p>${ticket.description}</p>
                                            
                                            <div class="messages-container mt-4" style="max-height: 300px; overflow-y: auto; border: 1px solid #eee; border-radius: var(--border-radius); padding: 15px;">
                                                <h6><i class="fas fa-comments"></i> Історія повідомлень</h6>
                                                ${ticket.messages.length > 0 ? ticket.messages.map(msg => `
                                                    <div class="message mb-3 p-3 border-start border-3 ${msg.type === 'user' ? 'border-primary bg-light' : 'border-success'}" style="border-radius: var(--border-radius-sm);">
                                                        <div class="d-flex justify-content-between mb-2">
                                                            <strong>${msg.type === 'user' ? ticket.createdBy.name : 'Підтримка'}</strong>
                                                            <small class="text-muted">${this.formatDate(msg.timestamp)}</small>
                                                        </div>
                                                        <p class="mb-0">${msg.text}</p>
                                                    </div>
                                                `).join('') : '<p class="text-muted"><i>Повідомлень поки немає</i></p>'}
                                            </div>

                                            <div class="mt-4">
                                                <label for="responseText" class="form-label"><strong>Відповідь:</strong></label>
                                                <textarea id="responseText" class="form-control" rows="3" placeholder="Введіть вашу відповідь..."></textarea>
                                                <button class="btn btn-primary mt-2" onclick="supportManager.sendResponse()">
                                                    <i class="fas fa-paper-plane"></i> Відправити
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="col-lg-4">
                                    <div class="card">
                                        <div class="card-header">
                                            <h6><i class="fas fa-info-circle"></i> Інформація</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="info-item mb-3">
                                                <strong>Створено:</strong><br>
                                                <span class="text-muted">${this.formatDate(ticket.createdAt)}</span>
                                            </div>
                                            <div class="info-item mb-3">
                                                <strong>Оновлено:</strong><br>
                                                <span class="text-muted">${this.formatDate(ticket.updatedAt)}</span>
                                            </div>
                                            <div class="info-item mb-3">
                                                <strong>Категорія:</strong><br>
                                                <span class="text-muted">${ticket.category}</span>
                                            </div>
                                            <div class="info-item mb-3">
                                                <strong>Будівля:</strong><br>
                                                <span class="text-muted">${ticket.building}</span>
                                            </div>
                                            <div class="info-item mb-3">
                                                <strong>Ліфт:</strong><br>
                                                <span class="text-muted">${ticket.liftId}</span>
                                            </div>
                                            
                                            <div class="info-item mb-3">
                                                <strong>Теги:</strong><br>
                                                <div class="mt-1">
                                                    ${ticket.tags.map(tag => `<span class="ticket-tag me-1">${tag}</span>`).join('')}
                                                </div>
                                            </div>

                                            ${ticket.assignedTo ? `
                                                <div class="info-item mb-3">
                                                    <strong>Призначено:</strong><br>
                                                    <div class="d-flex align-items-center mt-2">
                                                        <img src="${ticket.assignedTo.avatar}" alt="${ticket.assignedTo.name}" 
                                                             class="assignee-avatar me-2">
                                                        <span>${ticket.assignedTo.name}</span>
                                                    </div>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer" style="border-top: 1px solid #eee; padding: 20px;">
                            <button type="button" class="btn btn-success" onclick="supportManager.resolveTicket()">
                                <i class="fas fa-check"></i> Вирішити
                            </button>
                            <button type="button" class="btn btn-warning" onclick="supportManager.escalateTicket()">
                                <i class="fas fa-arrow-up"></i> Ескалувати
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                Закрити
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('ticketModal'));
        modal.show();
    }

    sendResponse() {
        const responseText = document.getElementById('responseText')?.value.trim();
        if (!responseText) {
            this.showNotification('Введіть текст відповіді', 'warning');
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

        document.getElementById('responseText').value = '';
        this.showTicketModal(); // Оновити модальне вікно
        this.renderContent(); // Оновити список тікетів
        
        this.showNotification('Відповідь відправлено', 'success');
    }

    resolveTicket() {
        if (!this.currentTicket) return;

        this.currentTicket.status = 'resolved';
        this.currentTicket.updatedAt = new Date().toISOString();

        if (this.wsClient) {
            this.wsClient.send({
                type: 'support_ticket_resolved',
                data: {
                    ticketId: this.currentTicket.id
                }
            });
        }

        this.renderContent();
        bootstrap.Modal.getInstance(document.getElementById('ticketModal')).hide();
        this.showNotification(`Тікет ${this.currentTicket.id} вирішено`, 'success');
    }

    escalateTicket() {
        if (!this.currentTicket) return;

        this.currentTicket.priority = 'urgent';
        this.currentTicket.updatedAt = new Date().toISOString();

        if (this.wsClient) {
            this.wsClient.send({
                type: 'support_ticket_escalated',
                data: {
                    ticketId: this.currentTicket.id
                }
            });
        }

        this.renderContent();
        this.showTicketModal(); // Оновити модальне вікно
        this.showNotification(`Тікет ${this.currentTicket.id} ескальовано`, 'warning');
    }

    // WebSocket обробники
    broadcastSupportStatus() {
        if (this.wsClient) {
            this.wsClient.send({
                type: 'support_status_update',
                data: {
                    agentId: this.userId,
                    isAvailable: true,
                    activeTickets: this.tickets.filter(t => t.assignedTo?.id === this.userId && t.status !== 'resolved').length,
                    timestamp: new Date().toISOString()
                }
            });
        }
    }

    handleNewTicket(data) {
        console.log('🎫 Новий тікет:', data);
        this.tickets.unshift(data.ticket);
        this.filterTickets();
        this.updateStatistics();
        this.showNotification(`Новий тікет: ${data.ticket.title}`, 'info');
    }

    handleTicketUpdate(data) {
        console.log('🔄 Тікет оновлено:', data);
        const ticketIndex = this.tickets.findIndex(t => t.id === data.ticketId);
        if (ticketIndex !== -1) {
            this.tickets[ticketIndex] = { ...this.tickets[ticketIndex], ...data.updates };
            this.filterTickets();
            this.updateStatistics();
        }
        this.showNotification(`Тікет ${data.ticketId} оновлено`, 'info');
    }

    handleNewMessage(data) {
        console.log('💬 Нове повідомлення:', data);
        const ticket = this.tickets.find(t => t.id === data.ticketId);
        if (ticket) {
            ticket.messages.push(data.message);
            if (this.currentTicket && this.currentTicket.id === data.ticketId) {
                this.showTicketModal();
            }
        }
        this.showNotification(`Нове повідомлення в тікеті ${data.ticketId}`, 'success');
    }

    handleUrgentRequest(data) {
        console.log('🚨 Терміновий запит:', data);
        this.showNotification(`🚨 ТЕРМІНОВО: ${data.message}`, 'danger');
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <div class="notification-header ${type}">
                <span><i class="fas fa-bell"></i> Сповіщення</span>
                <button class="btn btn-sm btn-outline-light" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="notification-body">
                ${message}
                <br>
                <small class="text-muted">${new Date().toLocaleTimeString('uk-UA')}</small>
            </div>
        `;

        container.appendChild(notification);

        // Автоматично видалити через 8 секунд
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 8000);
    }

    // Утиліти
    getPriorityClass(priority) {
        const classes = {
            'low': 'bg-success',
            'medium': 'bg-warning',
            'high': 'bg-danger',
            'urgent': 'bg-dark'
        };
        return classes[priority] || 'bg-secondary';
    }

    getPriorityText(priority) {
        const texts = {
            'low': 'Низький',
            'medium': 'Середній', 
            'high': 'Високий',
            'urgent': 'Критичний'
        };
        return texts[priority] || priority;
    }

    getStatusClass(status) {
        const classes = {
            'open': 'bg-primary',
            'in_progress': 'bg-warning',
            'resolved': 'bg-success',
            'closed': 'bg-secondary'
        };
        return classes[status] || 'bg-secondary';
    }

    getStatusText(status) {
        const texts = {
            'open': 'Відкритий',
            'in_progress': 'В роботі',
            'resolved': 'Вирішений',
            'closed': 'Закритий'
        };
        return texts[status] || status;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Щойно';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} хв тому`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} год тому`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)} дн тому`;
        
        return date.toLocaleDateString('uk-UA', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Додаткові дії
    async refreshTickets() {
        this.showNotification('Оновлення тікетів...', 'info');
        await this.loadTickets();
        this.renderContent();
        this.showNotification('Тікети оновлено', 'success');
    }

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

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
            [Object.keys(exportData[0]).join(',')]
            .concat(exportData.map(row => Object.values(row).map(field => `"${field}"`).join(',')))
            .join('\n');

        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', `support-tickets-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showNotification('Тікети експортовано', 'success');
    }

    escalateUrgent() {
        const urgentTickets = this.tickets.filter(t => t.priority === 'urgent' && t.status !== 'resolved');
        if (urgentTickets.length === 0) {
            this.showNotification('Немає термінових тікетів для ескалації', 'warning');
            return;
        }

        urgentTickets.forEach(ticket => {
            ticket.status = 'in_progress';
            ticket.priority = 'urgent';
        });

        this.renderContent();
        this.showNotification(`${urgentTickets.length} тікетів ескальовано`, 'success');
    }

    bulkResolve() {
        const inProgressTickets = this.tickets.filter(t => t.status === 'in_progress');
        if (inProgressTickets.length === 0) {
            this.showNotification('Немає тікетів для масового вирішення', 'warning');
            return;
        }

        if (confirm(`Вирішити ${inProgressTickets.length} тікетів?`)) {
            inProgressTickets.forEach(ticket => {
                ticket.status = 'resolved';
                ticket.updatedAt = new Date().toISOString();
            });

            this.renderContent();
            this.showNotification(`${inProgressTickets.length} тікетів вирішено`, 'success');
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
        this.showNotification('Звіт згенеровано (дивіться консоль)', 'info');
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
            this.showNotification('Повідомлення розіслано', 'success');
        }
    }
}

// Глобальна ініціалізація
let supportManager;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof supportManager === 'undefined') {
        supportManager = new SupportManagerRedesigned();
        window.supportManager = supportManager;
    }
});

console.log('🎧 Support Manager (Redesigned) модуль завантажено');