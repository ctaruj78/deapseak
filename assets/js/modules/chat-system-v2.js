/**
 * Chat System - Система комунікації між користувачами
 * Real-time чат з підтримкою WebSocket, групових каналів та файлів
 */
class ChatSystem {
    constructor() {
        this.apiUrl = 'http://localhost:3001/api';
        this.wsUrl = 'ws://localhost:3001';
        
        // Дані чату
        this.contacts = [];
        this.channels = [];
        this.messages = [];
        this.activeConversations = [];
        
        // Поточний стан
        this.currentChat = null;
        this.currentChatType = 'direct'; // 'direct' або 'channel'
        this.currentUser = JSON.parse(localStorage.getItem('userData')) || {};
        
        // WebSocket
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        // Налаштування
        this.messagePageSize = 50;
        this.isTyping = false;
        this.typingTimeout = null;
        this.lastSeen = new Date();
        
        // Стан
        this.isInitialized = false;
        this.isConnected = false;
        
        this.init();
    }

    /**
     * Ініціалізація чат системи
     */
    async init() {
        try {
            console.log('💬 Ініціалізація Chat System...');
            
            await this.loadContacts();
            await this.loadChannels();
            this.setupEventListeners();
            this.setupSocketConnection();
            this.setupNotifications();
            
            this.isInitialized = true;
            console.log('✅ Chat System ініціалізовано');
            
        } catch (error) {
            console.error('❌ Помилка ініціалізації Chat System:', error);
            this.loadFromLocalStorage();
        }
    }

    /**
     * Завантаження контактів
     */
    async loadContacts() {
        try {
            const token = localStorage.getItem('authToken');
            
            const response = await fetch(`${this.apiUrl}/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const allUsers = await response.json();
                
                // Фільтруємо користувачів (виключаємо себе)
                this.contacts = allUsers.filter(user => 
                    user._id !== this.currentUser._id
                ).map(user => ({
                    ...user,
                    isOnline: Math.random() > 0.3, // Симуляція онлайн статусу
                    lastSeen: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
                    unreadCount: Math.floor(Math.random() * 5)
                }));
                
                this.renderContacts();
                return true;
            }
        } catch (error) {
            console.error('Помилка завантаження контактів:', error);
        }
        return false;
    }

    /**
     * Завантаження каналів
     */
    async loadChannels() {
        try {
            const token = localStorage.getItem('authToken');
            
            const response = await fetch(`${this.apiUrl}/chat/channels`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                this.channels = await response.json();
            } else {
                // Створюємо стандартні канали
                this.channels = this.createDefaultChannels();
            }
            
            this.renderChannels();
            return true;
        } catch (error) {
            console.error('Помилка завантаження каналів:', error);
            this.channels = this.createDefaultChannels();
            this.renderChannels();
        }
        return false;
    }

    /**
     * Створення стандартних каналів
     */
    createDefaultChannels() {
        return [
            {
                _id: 'general',
                name: 'Загальний',
                description: 'Загальні обговорення',
                type: 'public',
                members: ['all'],
                unreadCount: Math.floor(Math.random() * 10),
                lastMessage: {
                    text: 'Привіт всім!',
                    timestamp: new Date(Date.now() - Math.random() * 60 * 60 * 1000),
                    sender: { firstName: 'Система' }
                }
            },
            {
                _id: 'tech-support',
                name: 'Технічна підтримка',
                description: 'Канал для технічних питань',
                type: 'public',
                members: ['tech', 'admin', 'dispatcher'],
                unreadCount: Math.floor(Math.random() * 5),
                lastMessage: {
                    text: 'Є питання по ліфту #123',
                    timestamp: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000),
                    sender: { firstName: 'Технік' }
                }
            },
            {
                _id: 'dispatchers',
                name: 'Диспетчери',
                description: 'Канал для диспетчерів',
                type: 'private',
                members: ['dispatcher', 'admin'],
                unreadCount: Math.floor(Math.random() * 3),
                lastMessage: {
                    text: 'Призначив нову заявку',
                    timestamp: new Date(Date.now() - Math.random() * 30 * 60 * 1000),
                    sender: { firstName: 'Диспетчер' }
                }
            }
        ];
    }

    /**
     * Налаштування WebSocket підключення
     */
    setupSocketConnection() {
        // В реальному проекті тут буде справжній WebSocket
        console.log('📡 WebSocket підключення налаштовано (симуляція)');
        
        // Симуляція підключення
        setTimeout(() => {
            this.isConnected = true;
            this.updateConnectionStatus();
            this.simulateIncomingMessages();
        }, 1000);
    }

    /**
     * Симуляція вхідних повідомлень
     */
    simulateIncomingMessages() {
        const messageTemplates = [
            'Привіт! Як справи?',
            'Чи можеш допомогти з заявкою?',
            'Ліфт відремонтовано',
            'Дякую за роботу!',
            'Потрібна консультація',
            'Все готово',
            'Хай день!',
            'Гарної роботи!',
            'Питання по обслуговуванню',
            'Звіт готовий'
        ];

        setInterval(() => {
            if (!this.isInitialized || Math.random() > 0.15) return;
            
            const randomContact = this.contacts[Math.floor(Math.random() * this.contacts.length)];
            const randomTemplate = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
            
            if (randomContact) {
                this.receiveMessage({
                    _id: Date.now().toString(),
                    from: randomContact._id,
                    to: this.currentUser._id,
                    text: randomTemplate,
                    timestamp: new Date(),
                    type: 'direct',
                    sender: randomContact
                });
            }
        }, 15000); // Кожні 15 секунд
    }

    /**
     * Відображення контактів
     */
    renderContacts() {
        const container = document.getElementById('contactsList') || 
                         document.querySelector('.contacts-list');
        
        if (!container) return;

        let html = '';
        
        this.contacts.forEach(contact => {
            const lastMessage = this.getLastMessageWith(contact._id);
            const unreadBadge = contact.unreadCount > 0 ? 
                `<span class="badge badge-primary unread-badge">${contact.unreadCount}</span>` : '';
            
            html += `
                <div class="contact-item ${this.currentChat === contact._id ? 'active' : ''}" 
                     data-contact-id="${contact._id}" 
                     onclick="chatSystem.openDirectChat('${contact._id}')">
                    <div class="contact-avatar">
                        <img src="${this.getAvatarUrl(contact)}" alt="${contact.firstName}" class="avatar-img">
                        <span class="status-indicator ${contact.isOnline ? 'online' : 'offline'}"></span>
                    </div>
                    <div class="contact-info">
                        <div class="contact-header">
                            <h6 class="contact-name mb-0">
                                ${contact.firstName} ${contact.lastName}
                            </h6>
                            ${unreadBadge}
                        </div>
                        <div class="contact-details">
                            <small class="text-muted contact-role">${this.getRoleText(contact.role)}</small>
                            ${contact.isOnline ? 
                                '<small class="text-success">Онлайн</small>' : 
                                `<small class="text-muted">Був(ла) ${this.getTimeAgo(contact.lastSeen)}</small>`
                            }
                        </div>
                        ${lastMessage ? `
                            <div class="last-message">
                                <small class="text-muted">${lastMessage.text.substring(0, 30)}${lastMessage.text.length > 30 ? '...' : ''}</small>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html || '<div class="empty-state">Контакти відсутні</div>';
    }

    /**
     * Відображення каналів
     */
    renderChannels() {
        const container = document.getElementById('channelsList') || 
                         document.querySelector('.channels-list');
        
        if (!container) return;

        let html = '';
        
        this.channels.forEach(channel => {
            if (!this.canAccessChannel(channel)) return;
            
            const unreadBadge = channel.unreadCount > 0 ? 
                `<span class="badge badge-secondary unread-badge">${channel.unreadCount}</span>` : '';
            
            html += `
                <div class="channel-item ${this.currentChat === channel._id ? 'active' : ''}" 
                     data-channel-id="${channel._id}" 
                     onclick="chatSystem.openChannel('${channel._id}')">
                    <div class="channel-icon">
                        <i class="fas ${this.getChannelIcon(channel.type)}"></i>
                    </div>
                    <div class="channel-info">
                        <div class="channel-header">
                            <h6 class="channel-name mb-0">
                                <span class="channel-hash">#</span>${channel.name}
                            </h6>
                            ${unreadBadge}
                        </div>
                        <div class="channel-description">
                            <small class="text-muted">${channel.description}</small>
                        </div>
                        ${channel.lastMessage ? `
                            <div class="last-message">
                                <small class="text-muted">
                                    <strong>${channel.lastMessage.sender.firstName}:</strong> 
                                    ${channel.lastMessage.text.substring(0, 25)}${channel.lastMessage.text.length > 25 ? '...' : ''}
                                </small>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html || '<div class="empty-state">Канали відсутні</div>';
    }

    /**
     * Відкриття приватного чату
     */
    async openDirectChat(contactId) {
        const contact = this.contacts.find(c => c._id === contactId);
        if (!contact) return;

        this.currentChat = contactId;
        this.currentChatType = 'direct';
        
        // Оновлення активного контакту
        this.renderContacts();
        
        // Завантаження повідомлень
        await this.loadMessages(contactId, 'direct');
        
        // Оновлення заголовку чату
        this.updateChatHeader({
            name: `${contact.firstName} ${contact.lastName}`,
            status: contact.isOnline ? 'Онлайн' : `Був(ла) ${this.getTimeAgo(contact.lastSeen)}`,
            avatar: this.getAvatarUrl(contact)
        });
        
        // Позначити повідомлення як прочитані
        this.markAsRead(contactId, 'direct');
    }

    /**
     * Відкриття каналу
     */
    async openChannel(channelId) {
        const channel = this.channels.find(c => c._id === channelId);
        if (!channel || !this.canAccessChannel(channel)) return;

        this.currentChat = channelId;
        this.currentChatType = 'channel';
        
        // Оновлення активного каналу
        this.renderChannels();
        
        // Завантаження повідомлень каналу
        await this.loadMessages(channelId, 'channel');
        
        // Оновлення заголовку чату
        this.updateChatHeader({
            name: `#${channel.name}`,
            status: `${channel.members?.length || 0} учасників`,
            description: channel.description
        });
        
        // Позначити повідомлення як прочитані
        this.markAsRead(channelId, 'channel');
    }

    /**
     * Завантаження повідомлень
     */
    async loadMessages(chatId, type) {
        try {
            const token = localStorage.getItem('authToken');
            
            const response = await fetch(`${this.apiUrl}/chat/messages?chatId=${chatId}&type=${type}&limit=${this.messagePageSize}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                this.messages = await response.json();
            } else {
                // Генерація тестових повідомлень
                this.messages = this.generateTestMessages(chatId, type);
            }
            
            this.renderMessages();
        } catch (error) {
            console.error('Помилка завантаження повідомлень:', error);
            this.messages = this.generateTestMessages(chatId, type);
            this.renderMessages();
        }
    }

    /**
     * Генерація тестових повідомлень
     */
    generateTestMessages(chatId, type) {
        const messages = [];
        const messageCount = 5 + Math.floor(Math.random() * 10);
        
        for (let i = 0; i < messageCount; i++) {
            const isOwnMessage = Math.random() > 0.6;
            let sender;
            
            if (isOwnMessage) {
                sender = this.currentUser;
            } else if (type === 'direct') {
                sender = this.contacts.find(c => c._id === chatId);
            } else {
                sender = this.contacts[Math.floor(Math.random() * this.contacts.length)];
            }
            
            messages.push({
                _id: Date.now() + i,
                text: this.getRandomMessage(),
                timestamp: new Date(Date.now() - (messageCount - i) * 60 * 60 * 1000),
                sender: sender || { firstName: 'Невідомий', lastName: '' },
                type: type,
                chatId: chatId,
                isOwn: isOwnMessage
            });
        }
        
        return messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    /**
     * Відображення повідомлень
     */
    renderMessages() {
        const container = document.getElementById('messagesContainer') || 
                         document.querySelector('.messages-container');
        
        if (!container) return;

        let html = '';
        let lastDate = null;
        
        this.messages.forEach((message, index) => {
            const messageDate = new Date(message.timestamp).toDateString();
            
            // Додаємо розділювач дат
            if (messageDate !== lastDate) {
                html += `
                    <div class="date-divider">
                        <span class="date-text">${this.formatDate(message.timestamp)}</span>
                    </div>
                `;
                lastDate = messageDate;
            }
            
            // Перевіряємо, чи потрібно показати інформацію про відправника
            const showSenderInfo = index === 0 || 
                                  this.messages[index - 1].sender._id !== message.sender._id ||
                                  new Date(message.timestamp) - new Date(this.messages[index - 1].timestamp) > 5 * 60 * 1000;
            
            html += this.createMessageElement(message, showSenderInfo);
        });

        container.innerHTML = html || '<div class="empty-state">Повідомлення відсутні</div>';
        
        // Прокрутка вниз
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Створення елементу повідомлення
     */
    createMessageElement(message, showSenderInfo) {
        const isOwnMessage = message.sender._id === this.currentUser._id;
        const messageClass = isOwnMessage ? 'message-own' : 'message-other';
        
        return `
            <div class="message ${messageClass}" data-message-id="${message._id}">
                ${!isOwnMessage && showSenderInfo && this.currentChatType === 'channel' ? `
                    <div class="message-sender">
                        <img src="${this.getAvatarUrl(message.sender)}" alt="${message.sender.firstName}" class="sender-avatar">
                        <strong class="sender-name">${message.sender.firstName} ${message.sender.lastName}</strong>
                        <small class="message-time">${this.formatTime(message.timestamp)}</small>
                    </div>
                ` : ''}
                <div class="message-content">
                    <div class="message-bubble">
                        <p class="message-text">${this.formatMessageText(message.text)}</p>
                        ${message.attachments?.length > 0 ? `
                            <div class="message-attachments">
                                ${message.attachments.map(att => this.createAttachmentElement(att)).join('')}
                            </div>
                        ` : ''}
                    </div>
                    ${isOwnMessage || (!showSenderInfo && this.currentChatType === 'direct') ? `
                        <small class="message-time">${this.formatTime(message.timestamp)}</small>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Надсилання повідомлення
     */
    async sendMessage(text, attachments = []) {
        if (!text.trim() && attachments.length === 0) return;
        
        const messageData = {
            text: text.trim(),
            chatId: this.currentChat,
            type: this.currentChatType,
            timestamp: new Date(),
            attachments: attachments
        };
        
        try {
            const token = localStorage.getItem('authToken');
            
            const response = await fetch(`${this.apiUrl}/chat/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messageData)
            });
            
            if (response.ok) {
                const sentMessage = await response.json();
                this.addMessageToChat(sentMessage);
            } else {
                throw new Error('Помилка відправки повідомлення');
            }
        } catch (error) {
            console.error('Помилка відправки повідомлення:', error);
            
            // Додаємо повідомлення локально (симуляція)
            const localMessage = {
                _id: Date.now(),
                ...messageData,
                sender: this.currentUser,
                isOwn: true
            };
            
            this.addMessageToChat(localMessage);
        }
        
        // Очищення поля вводу
        this.clearMessageInput();
    }

    /**
     * Додавання повідомлення до чату
     */
    addMessageToChat(message) {
        this.messages.push(message);
        
        // Якщо чат активний, оновлюємо відображення
        if (message.chatId === this.currentChat) {
            this.renderMessages();
        }
        
        // Оновлення списків контактів/каналів
        this.updateLastMessage(message);
    }

    /**
     * Отримання повідомлення
     */
    receiveMessage(message) {
        this.addMessageToChat(message);
        
        // Збільшення лічильника непрочитаних
        if (message.chatId !== this.currentChat) {
            this.incrementUnreadCount(message.chatId, message.type);
        }
        
        // Показ нотифікації
        this.showNotification(message);
        
        // Звук нового повідомлення
        this.playNotificationSound();
    }

    /**
     * Налаштування обробників подій
     */
    setupEventListeners() {
        // Форма надсилання повідомлення
        const messageForm = document.getElementById('messageForm');
        if (messageForm) {
            messageForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = document.getElementById('messageInput');
                if (input && input.value.trim()) {
                    this.sendMessage(input.value);
                }
            });
        }

        // Поле вводу повідомлення
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage(messageInput.value);
                }
            });
            
            // Індикатор набору тексту
            messageInput.addEventListener('input', () => {
                this.handleTyping();
            });
        }

        // Кнопка прикріплення файлів
        const attachButton = document.getElementById('attachButton');
        if (attachButton) {
            attachButton.addEventListener('click', () => {
                this.showAttachmentDialog();
            });
        }

        // Пошук у чатах
        const searchInput = document.getElementById('chatSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchChats(e.target.value);
            });
        }
    }

    /**
     * Допоміжні методи
     */
    getAvatarUrl(user) {
        return user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName + ' ' + user.lastName)}&background=007bff&color=fff`;
    }

    getRoleText(role) {
        const roles = {
            'admin': 'Адміністратор',
            'dispatcher': 'Диспетчер',
            'tech': 'Технік',
            'client': 'Клієнт'
        };
        return roles[role] || role;
    }

    getChannelIcon(type) {
        return type === 'private' ? 'fa-lock' : 'fa-hashtag';
    }

    canAccessChannel(channel) {
        if (channel.type === 'public') return true;
        return channel.members.includes(this.currentUser.role) || 
               channel.members.includes('all') ||
               channel.members.includes(this.currentUser._id);
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInMinutes = Math.floor((now - time) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'щойно';
        if (diffInMinutes < 60) return `${diffInMinutes} хв. тому`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} год. тому`;
        return `${Math.floor(diffInMinutes / 1440)} дн. тому`;
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('uk-UA', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Сьогодні';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Вчора';
        } else {
            return date.toLocaleDateString('uk-UA');
        }
    }

    formatMessageText(text) {
        // Базове форматування: посилання, емоджі тощо
        return text
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')
            .replace(/\n/g, '<br>');
    }

    getRandomMessage() {
        const messages = [
            'Привіт! 👋',
            'Як справи з роботою?',
            'Ліфт відремонтовано ✅',
            'Потрібна допомога з заявкою',
            'Дякую за швидку роботу! 👍',
            'Все готово до здачі',
            'Гарного дня! ☀️',
            'Питання по обладнанню',
            'Звіт надіслано',
            'До зв\'язку!'
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    getLastMessageWith(contactId) {
        return this.messages
            .filter(m => (m.sender._id === contactId && m.type === 'direct') || 
                        (m.sender._id === this.currentUser._id && m.chatId === contactId))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    }

    clearMessageInput() {
        const input = document.getElementById('messageInput');
        if (input) input.value = '';
    }

    updateConnectionStatus() {
        const statusElement = document.getElementById('chatConnectionStatus');
        if (statusElement) {
            statusElement.innerHTML = this.isConnected ? 
                '<i class="fas fa-circle text-success"></i> Підключено' : 
                '<i class="fas fa-circle text-danger"></i> Відключено';
        }
    }

    updateChatHeader(info) {
        const header = document.getElementById('chatHeader');
        if (header) {
            header.innerHTML = `
                <div class="chat-header-info">
                    ${info.avatar ? `<img src="${info.avatar}" alt="${info.name}" class="chat-avatar">` : ''}
                    <div class="chat-details">
                        <h6 class="chat-name mb-0">${info.name}</h6>
                        <small class="chat-status text-muted">${info.status}</small>
                        ${info.description ? `<small class="chat-description text-muted">${info.description}</small>` : ''}
                    </div>
                </div>
                <div class="chat-actions">
                    <button class="btn btn-sm btn-outline-secondary" onclick="chatSystem.showChatInfo()" title="Інформація">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
            `;
        }
    }

    /**
     * Методи для взаємодії з інтерфейсом
     */
    
    // Показ інформації про чат
    showChatInfo() {
        console.log('Інформація про чат:', this.currentChat);
    }

    // Показ діалогу прикріплення
    showAttachmentDialog() {
        console.log('Діалог прикріплення файлів');
    }

    // Пошук у чатах
    searchChats(query) {
        console.log('Пошук:', query);
    }

    // Обробка набору тексту
    handleTyping() {
        if (!this.isTyping) {
            this.isTyping = true;
            // Тут буде WebSocket повідомлення про початок набору
        }
        
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.isTyping = false;
            // Тут буде WebSocket повідомлення про кінець набору
        }, 1000);
    }

    // Позначення як прочитане
    markAsRead(chatId, type) {
        if (type === 'direct') {
            const contact = this.contacts.find(c => c._id === chatId);
            if (contact) contact.unreadCount = 0;
        } else {
            const channel = this.channels.find(c => c._id === chatId);
            if (channel) channel.unreadCount = 0;
        }
    }

    // Збільшення лічильника непрочитаних
    incrementUnreadCount(chatId, type) {
        if (type === 'direct') {
            const contact = this.contacts.find(c => c._id === chatId);
            if (contact) contact.unreadCount = (contact.unreadCount || 0) + 1;
        } else {
            const channel = this.channels.find(c => c._id === chatId);
            if (channel) channel.unreadCount = (channel.unreadCount || 0) + 1;
        }
        
        this.renderContacts();
        this.renderChannels();
    }

    // Оновлення останнього повідомлення
    updateLastMessage(message) {
        if (message.type === 'direct') {
            const contact = this.contacts.find(c => c._id === message.chatId || c._id === message.sender._id);
            if (contact) {
                contact.lastMessage = {
                    text: message.text,
                    timestamp: message.timestamp
                };
            }
        } else {
            const channel = this.channels.find(c => c._id === message.chatId);
            if (channel) {
                channel.lastMessage = {
                    text: message.text,
                    timestamp: message.timestamp,
                    sender: message.sender
                };
            }
        }
    }

    // Налаштування нотифікацій
    setupNotifications() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    // Показ нотифікації
    showNotification(message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(
                `${message.sender.firstName} ${message.sender.lastName}`,
                {
                    body: message.text,
                    icon: this.getAvatarUrl(message.sender)
                }
            );
            
            setTimeout(() => notification.close(), 5000);
        }
    }

    // Звук нотифікації
    playNotificationSound() {
        // Простий звук нотифікації
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N+QQAoUXrTp66hVFApGn+DyvmEaATiKzPHZgC4FHWq+8OOYRwwOUargur');
        audio.volume = 0.3;
        audio.play().catch(() => {
            // Ігнорувати помилки відтворення
        });
    }

    // Завантаження з localStorage
    loadFromLocalStorage() {
        try {
            const saved = JSON.parse(localStorage.getItem('chatData'));
            if (saved) {
                this.contacts = saved.contacts || [];
                this.channels = saved.channels || this.createDefaultChannels();
                this.messages = saved.messages || [];
            } else {
                this.contacts = [];
                this.channels = this.createDefaultChannels();
            }
            
            this.renderContacts();
            this.renderChannels();
        } catch (error) {
            console.error('Помилка завантаження з localStorage:', error);
            this.contacts = [];
            this.channels = this.createDefaultChannels();
        }
    }
}

// Глобальна ініціалізація
let chatSystem;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof chatSystem === 'undefined') {
        chatSystem = new ChatSystem();
        window.chatSystem = chatSystem; // Глобальний доступ
    }
});

// Експорт для використання в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatSystem;
}