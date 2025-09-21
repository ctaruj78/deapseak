class SupportManager {
    constructor() {
        this.tickets = [];
        this.activeChat = null;
        this.knowledgeBase = [];
        this.faq = [];
        this.currentCategory = null;
        this.init();
    }

    init() {
        this.loadTickets();
        this.loadKnowledgeBase();
        this.loadFAQ();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Автозбереження при зміні форми
        $('#ticketForm').on('input', () => {
            this.autoSaveDraft();
        });
    }

    loadTickets() {
        try {
            const savedTickets = localStorage.getItem('clientTickets');
            if (savedTickets) {
                this.tickets = JSON.parse(savedTickets);
            } else {
                this.loadDemoTickets();
            }
            this.renderActiveTickets();
        } catch (error) {
            console.error('Помилка завантаження звернень:', error);
            this.loadDemoTickets();
        }
    }

    loadDemoTickets() {
        this.tickets = [
            {
                id: 1,
                number: 'TKT-2024-001',
                subject: 'Несправність ліфта №2',
                description: 'Ліфт №2 видає незвичайний шум при русі між 3 і 4 поверхами. Також спостерігається незначне коливання кабіни.',
                category: 'technical',
                priority: 'high',
                status: 'in-progress',
                lift: 'lift-2',
                createdAt: new Date('2024-05-10T14:30:00').toISOString(),
                updatedAt: new Date('2024-05-12T09:15:00').toISOString(),
                assignee: 'Іван Петренко',
                updates: [
                    {
                        type: 'status',
                        message: 'Звернення прийнято до роботи',
                        timestamp: new Date('2024-05-10T14:45:00').toISOString(),
                        author: 'Система'
                    },
                    {
                        type: 'comment',
                        message: 'Технік призначений. Очікуйте дзвінка для узгодження часу візиту.',
                        timestamp: new Date('2024-05-10T15:30:00').toISOString(),
                        author: 'Менеджер підтримки'
                    }
                ]
            },
            {
                id: 2,
                number: 'TKT-2024-002',
                subject: 'Питання щодо рахунку за травень',
                description: 'Не згоден з сумою у рахунку за травень. Ліфт №1 не працював 5 днів, але оплата нарахована повністю.',
                category: 'billing',
                priority: 'medium',
                status: 'pending',
                lift: 'lift-1',
                createdAt: new Date('2024-05-15T10:00:00').toISOString(),
                updatedAt: new Date('2024-05-15T10:00:00').toISOString(),
                assignee: 'Відділ рахунків',
                updates: [
                    {
                        type: 'status',
                        message: 'Звернення зареєстровано',
                        timestamp: new Date('2024-05-15T10:05:00').toISOString(),
                        author: 'Система'
                    }
                ]
            }
        ];
        this.saveTickets();
    }

    loadKnowledgeBase() {
        this.knowledgeBase = [
            {
                id: 1,
                title: 'Як створити заявку на ремонт',
                content: 'Інструкція з створення заявки на технічне обслуговування або ремонт ліфта.',
                category: 'technical',
                tags: ['заявка', 'ремонт', 'інструкція']
            },
            {
                id: 2,
                title: 'Як оплатити рахунок онлайн',
                content: 'Покрокова інструкція з онлайн-оплати рахунків за обслуговування ліфтів.',
                category: 'billing',
                tags: ['оплата', 'рахунок', 'онлайн']
            },
            {
                id: 3,
                title: 'Що робити при застряганні в ліфті',
                content: 'Алгоритм дій у разі застрягання в ліфті. Контакти аварійної служби.',
                category: 'emergency',
                tags: ['аварія', 'безпека', 'інструкція']
            },
            {
                id: 4,
                title: 'Графік планового обслуговування',
                content: 'Інформація про графік планових технічних обслуговувань ліфтів.',
                category: 'general',
                tags: ['графік', 'обслуговування', 'план']
            }
        ];
        this.renderKnowledgeBase();
    }

    loadFAQ() {
        this.faq = [
            {
                question: 'Як часто проводиться технічне обслуговування ліфтів?',
                answer: 'Планове технічне обслуговування проводиться щомісяця для кожного ліфта. Додаткові перевірки - за необхідності.',
                category: 'technical'
            },
            {
                question: 'Який термін відповіді на звернення?',
                answer: 'Стандартний термін відповіді - 24 години. Для термінових звернень - до 2 годин.',
                category: 'general'
            },
            {
                question: 'Як відстежити статус моєї заявки?',
                answer: 'Статус заявки можна переглянути в особистому кабінеті у розділі "Мої звернення".',
                category: 'technical'
            },
            {
                question: 'Які способи оплати доступні?',
                answer: 'Оплата можлива через банківський переказ, онлайн-оплату на сайті або готівкою кур\'єру.',
                category: 'billing'
            }
        ];
        this.renderFAQ();
    }

    saveTickets() {
        localStorage.setItem('clientTickets', JSON.stringify(this.tickets));
    }

    showCategory(category) {
        this.currentCategory = category;
        const categories = {
            'technical': 'Технічні питання',
            'billing': 'Рахунки та оплата',
            'emergency': 'Аварійні ситуації',
            'general': 'Загальні питання'
        };
        
        this.showNotification(`Обрана категорія: ${categories[category]}`, 'info');
        this.showTicketForm();
    }

    showTicketForm() {
        $('#ticketFormSection').slideDown();
        $('html, body').animate({
            scrollTop: $('#ticketFormSection').offset().top
        }, 500);
    }

    hideTicketForm() {
        $('#ticketFormSection').slideUp();
    }

    submitTicket() {
        const form = document.getElementById('ticketForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const newTicket = {
            id: Math.max(...this.tickets.map(t => t.id), 0) + 1,
            number: 'TKT-' + new Date().getFullYear() + '-' + String(this.tickets.length + 1).padStart(3, '0'),
            subject: document.getElementById('ticketSubject').value,
            description: document.getElementById('ticketDescription').value,
            category: document.getElementById('ticketCategory').value,
            priority: document.getElementById('ticketPriority').value,
            status: 'pending',
            lift: document.getElementById('ticketLift').value || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assignee: 'Не призначено',
            updates: [
                {
                    type: 'status',
                    message: 'Звернення створено',
                    timestamp: new Date().toISOString(),
                    author: 'Користувач'
                }
            ]
        };

        this.tickets.unshift(newTicket);
        this.saveTickets();
        this.renderActiveTickets();
        this.hideTicketForm();
        form.reset();
        
        this.showNotification('Звернення успішно створено! Номер: ' + newTicket.number, 'success');
    }

    autoSaveDraft() {
        // Автозбереження чернетки форми
        const draft = {
            subject: document.getElementById('ticketSubject').value,
            description: document.getElementById('ticketDescription').value,
            category: document.getElementById('ticketCategory').value,
            priority: document.getElementById('ticketPriority').value,
            lift: document.getElementById('ticketLift').value,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('ticketDraft', JSON.stringify(draft));
    }

    loadDraft() {
        const draft = JSON.parse(localStorage.getItem('ticketDraft') || '{}');
        if (draft.subject) {
            document.getElementById('ticketSubject').value = draft.subject || '';
            document.getElementById('ticketDescription').value = draft.description || '';
            document.getElementById('ticketCategory').value = draft.category || '';
            document.getElementById('ticketPriority').value = draft.priority || 'medium';
            document.getElementById('ticketLift').value = draft.lift || '';
            
            this.showNotification('Чернетку відновлено', 'info');
        }
    }

    clearDraft() {
        localStorage.removeItem('ticketDraft');
        document.getElementById('ticketForm').reset();
        this.showNotification('Чернетку очищено', 'info');
    }

    renderActiveTickets() {
        const container = document.getElementById('activeTicketsList');
        const activeTickets = this.tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed');
        
        document.getElementById('activeTicketsCount').textContent = activeTickets.length;
        
        if (activeTickets.length === 0) {
            container.innerHTML = `
                <div class="empty-state p-4 text-center">
                    <i class="fas fa-ticket-alt fa-3x text-muted mb-3"></i>
                    <h5>Активних звернень немає</h5>
                    <p class="text-muted">У вас немає активних звернень до служби підтримки</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        activeTickets.slice(0, 5).forEach(ticket => {
            const ticketElement = this.createTicketElement(ticket);
            container.appendChild(ticketElement);
        });
    }

    createTicketElement(ticket) {
        const div = document.createElement('div');
        div.className = `ticket-card ${ticket.status}`;
        
        const statusText = {
            'pending': 'В очікуванні',
            'in-progress': 'В роботі',
            'resolved': 'Вирішено',
            'closed': 'Закрито'
        };
        
        const priorityText = {
            'low': 'Низький',
            'medium': 'Середній',
            'high': 'Високий',
            'critical': 'Критичний'
        };
        
        div.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5 class="card-title">${ticket.subject}</h5>
                        <p class="card-text">${ticket.description.substring(0, 100)}...</p>
                        <div class="ticket-meta">
                            <span class="support-status status-${ticket.status}">${statusText[ticket.status]}</span>
                            <span class="badge badge-${ticket.priority} ml-2">${priorityText[ticket.priority]}</span>
                            <small class="text-muted ml-2">${new Date(ticket.createdAt).toLocaleDateString('uk-UA')}</small>
                        </div>
                    </div>
                    <div class="ticket-actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="supportManager.viewTicket(${ticket.id})">
                            <i class="fas fa-eye"></i> Переглянути
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return div;
    }

    viewTicket(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (!ticket) return;
        
        // Заповнити модальне вікно
        document.getElementById('ticketModalTitle').textContent = ticket.subject;
        document.getElementById('ticketSubject').textContent = ticket.subject;
        document.getElementById('ticketDescription').textContent = ticket.description;
        document.getElementById('ticketNumber').textContent = ticket.number;
        document.getElementById('ticketDate').textContent = new Date(ticket.createdAt).toLocaleDateString('uk-UA');
        document.getElementById('ticketAssignee').textContent = ticket.assignee;
        
        // Категорія
        const categories = {
            'technical': 'Технічне питання',
            'billing': 'Рахунки та оплата',
            'emergency': 'Аварійна ситуація',
            'general': 'Загальне питання'
        };
        document.getElementById('ticketCategory').textContent = categories[ticket.category] || ticket.category;
        
        // Ліфт
        document.getElementById('ticketLiftInfo').textContent = ticket.lift ? 
            ticket.lift.replace('lift-', 'Ліфт №') : 'Не вказано';
        
        // Статус і пріоритет
        const statusBadge = document.getElementById('ticketStatusBadge');
        statusBadge.className = `support-status status-${ticket.status}`;
        statusBadge.textContent = {
            'pending': 'В очікуванні',
            'in-progress': 'В роботі',
            'resolved': 'Вирішено',
            'closed': 'Закрито'
        }[ticket.status];
        
        const priorityBadge = document.getElementById('ticketPriorityBadge');
        priorityBadge.className = `badge badge-${ticket.priority}`;
        priorityBadge.textContent = {
            'low': 'Низький',
            'medium': 'Середній',
            'high': 'Високий',
            'critical': 'Критичний'
        }[ticket.priority];
        
        // Оновлення
        const updatesContainer = document.getElementById('ticketUpdates');
        updatesContainer.innerHTML = '';
        
        ticket.updates.forEach(update => {
            const updateElement = document.createElement('div');
            updateElement.className = 'update-item mb-3 p-3 border rounded';
            updateElement.innerHTML = `
                <div class="d-flex justify-content-between">
                    <strong>${update.author}</strong>
                    <small class="text-muted">${new Date(update.timestamp).toLocaleString('uk-UA')}</small>
                </div>
                <p class="mb-0">${update.message}</p>
            `;
            updatesContainer.appendChild(updateElement);
        });
        
        $('#viewTicketModal').modal('show');
    }

    addComment() {
        const comment = prompt('Введіть ваш коментар:');
        if (comment) {
            this.showNotification('Коментар додано', 'success');
            $('#viewTicketModal').modal('hide');
        }
    }

    renderKnowledgeBase() {
        const container = document.getElementById('knowledgeBaseList');
        container.innerHTML = '';
        
        this.knowledgeBase.forEach(item => {
            const col = document.createElement('div');
            col.className = 'col-md-6 mb-4';
            
            col.innerHTML = `
                <div class="knowledge-base-item bg-white">
                    <h5 class="text-primary">${item.title}</h5>
                    <p class="text-muted">${item.content.substring(0, 100)}...</p>
                    <div class="tags">
                        ${item.tags.map(tag => `<span class="badge badge-secondary mr-1">${tag}</span>`).join('')}
                    </div>
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="supportManager.viewArticle(${item.id})">
                        <i class="fas fa-book-open"></i> Читати далі
                    </button>
                </div>
            `;
            
            container.appendChild(col);
        });
    }

    searchKnowledgeBase() {
        const searchTerm = document.getElementById('knowledgeBaseSearch').value.toLowerCase();
        if (!searchTerm) {
            this.renderKnowledgeBase();
            return;
        }
        
        const filtered = this.knowledgeBase.filter(item =>
            item.title.toLowerCase().includes(searchTerm) ||
            item.content.toLowerCase().includes(searchTerm) ||
            item.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
        
        const container = document.getElementById('knowledgeBaseList');
        container.innerHTML = '';
        
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-4">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h5>Нічого не знайдено</h5>
                    <p class="text-muted">Спробуйте інший запит пошуку</p>
                </div>
            `;
            return;
        }
        
        filtered.forEach(item => {
            const col = document.createElement('div');
            col.className = 'col-md-6 mb-4';
            col.innerHTML = `
                <div class="knowledge-base-item bg-white">
                    <h5 class="text-primary">${item.title}</h5>
                    <p class="text-muted">${item.content.substring(0, 100)}...</p>
                    <div class="tags">
                        ${item.tags.map(tag => `<span class="badge badge-secondary mr-1">${tag}</span>`).join('')}
                    </div>
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="supportManager.viewArticle(${item.id})">
                        <i class="fas fa-book-open"></i> Читати далі
                    </button>
                </div>
            `;
            container.appendChild(col);
        });
    }

    viewArticle(articleId) {
        const article = this.knowledgeBase.find(a => a.id === articleId);
        if (article) {
            alert(`${article.title}\n\n${article.content}`);
        }
    }

    renderFAQ() {
        const container = document.getElementById('faqAccordion');
        container.innerHTML = '';
        
        this.faq.forEach((item, index) => {
            const faqItem = document.createElement('div');
            faqItem.className = 'faq-item card';
            
            faqItem.innerHTML = `
                <div class="card-header" id="faqHeading${index}">
                    <h5 class="mb-0">
                        <button class="btn btn-link" type="button" data-toggle="collapse" 
                                data-target="#faqCollapse${index}" aria-expanded="false" 
                                aria-controls="faqCollapse${index}">
                            <i class="fas fa-question-circle mr-2"></i>${item.question}
                        </button>
                    </h5>
                </div>
                <div id="faqCollapse${index}" class="collapse" aria-labelledby="faqHeading${index}">
                    <div class="card-body">
                        ${item.answer}
                    </div>
                </div>
            `;
            
            container.appendChild(faqItem);
        });
    }

    startChat() {
        $('#chatSection').slideDown();
        this.activeChat = {
            id: 'chat-' + Date.now(),
            startedAt: new Date().toISOString(),
            messages: [
                {
                    type: 'support',
                    message: 'Вітаємо! Чим можемо допомогти?',
                    timestamp: new Date().toISOString()
                }
            ]
        };
        
        this.renderChatMessages();
        $('html, body').animate({
            scrollTop: $('#chatSection').offset().top
        }, 500);
        
        this.showNotification('Чат з підтримкою розпочато', 'success');
    }

    endChat() {
        if (confirm('Завершити чат з підтримкою?')) {
            $('#chatSection').slideUp();
            this.activeChat = null;
            this.showNotification('Чат завершено', 'info');
        }
    }

    sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Додати повідомлення клієнта
        this.activeChat.messages.push({
            type: 'client',
            message: message,
            timestamp: new Date().toISOString()
        });
        
        input.value = '';
        this.renderChatMessages();
        
        // Симуляція відповіді підтримки
        setTimeout(() => {
            this.activeChat.messages.push({
                type: 'support',
                message: 'Дякуємо за повідомлення. Оператор зв\'яжеться з вами найближчим часом.',
                timestamp: new Date().toISOString()
            });
            this.renderChatMessages();
        }, 1000);
    }

    renderChatMessages() {
        const container = document.getElementById('chatMessages');
        container.innerHTML = '';
        
        this.activeChat.messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message message-${msg.type}`;
            
            messageDiv.innerHTML = `
                <div class="message-content">
                    <p class="mb-1">${msg.message}</p>
                    <small class="message-time">${new Date(msg.timestamp).toLocaleTimeString('uk-UA')}</small>
                </div>
            `;
            
            container.appendChild(messageDiv);
        });
        
        // Прокрутити до останнього повідомлення
        container.scrollTop = container.scrollHeight;
    }

    callSupport() {
        this.showNotification('Иммитация звонка в службу поддержки...', 'info');
        setTimeout(() => {
            if (confirm('Передзвонити вам протягом 5 хвилин?')) {
                this.showNotification('Оператор передзвонить вам найближчим часом', 'success');
            }
        }, 1000);
    }

    emailSupport() {
        const email = 'support@liftservice.com';
        const subject = encodeURIComponent('Звернення з клієнтського порталу');
        const body = encodeURIComponent('Доброго дня,\n\nЯ хотів би звернутися з наступним питанням:\n\n');
        
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
        this.showNotification('Email відкрито в вашому клієнті', 'info');
    }

    showNotification(message, type = 'info') {
        const toast = $(`<div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <strong class="mr-auto">Підтримка</strong>
                <small class="text-muted">${new Date().toLocaleTimeString('uk-UA')}</small>
                <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>`);

        const headerClass = {
            success: 'bg-success',
            error: 'bg-danger',
            warning: 'bg-warning',
            info: 'bg-info'
        }[type] || 'bg-info';

        toast.find('.toast-header').addClass(`${headerClass} text-white`);
        
        if (!document.getElementById('toastContainer')) {
            const container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        
        $('#toastContainer').append(toast);
        toast.toast({ delay: 3000 }).toast('show');
        toast.on('hidden.bs.toast', function () { $(this).remove(); });
    }
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', function() {
    window.supportManager = new SupportManager();
});