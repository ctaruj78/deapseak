/**
 * Chat System - Система комунікації між користувачами
 * Real-time чат з підтримкою WebSocket, групових каналів та файлів
 */
class ChatSystem {
    constructor() {
        this.apiUrl = 'http://localhost:3001/api';
        this.wsUrl = 'ws://localhost:3002';
        
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
        
        // Файлова система
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedFileTypes = ['image/*', 'application/pdf', 'application/msword', 
                                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                'text/*', 'audio/*', 'video/*'];
        
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

    /**
     * Методи для інтеграції з CRM системою
     */

    // Рендер модуля в контейнер CRM
    renderInContainer(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="chat-system-container">
                <div class="row">
                    <!-- Бокова панель з контактами -->
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="fas fa-comments"></i> Повідомлення
                                </h5>
                            </div>
                            <div class="card-body p-0">
                                <!-- Пошук -->
                                <div class="p-3 border-bottom">
                                    <input type="text" class="form-control" id="chatSearch" placeholder="Пошук контактів...">
                                </div>
                                
                                <!-- Канали -->
                                <div class="chat-sidebar-section">
                                    <div class="p-2 bg-light border-bottom">
                                        <small class="text-muted font-weight-bold">КАНАЛИ</small>
                                    </div>
                                    <div id="channelsList" class="channels-list">
                                        <!-- Канали будуть завантажені тут -->
                                    </div>
                                </div>

                                <!-- Приватні чати -->
                                <div class="chat-sidebar-section">
                                    <div class="p-2 bg-light border-bottom">
                                        <small class="text-muted font-weight-bold">КОНТАКТИ</small>
                                    </div>
                                    <div id="contactsList" class="contacts-list">
                                        <!-- Контакти будуть завантажені тут -->
                                    </div>
                                </div>
                            </div>
                            <div class="card-footer">
                                <div id="chatConnectionStatus" class="text-center">
                                    <small class="text-muted">
                                        <i class="fas fa-circle text-danger"></i> Підключення...
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Область чату -->
                    <div class="col-md-8">
                        <div class="card chat-container">
                            <!-- Заголовок чату -->
                            <div class="card-header" id="chatHeader">
                                <div class="text-center text-muted">
                                    <i class="far fa-comments fa-2x"></i>
                                    <p class="mb-0 mt-2">Оберіть чат для початку спілкування</p>
                                </div>
                            </div>

                            <!-- Повідомлення -->
                            <div class="card-body messages-area" id="messagesContainer" style="height: 400px; overflow-y: auto;">
                                <!-- Повідомлення будуть відображені тут -->
                            </div>

                            <!-- Поле вводу -->
                            <div class="card-footer">
                                <form id="messageForm" class="d-none">
                                    <div class="input-group">
                                        <input type="text" class="form-control" id="messageInput" placeholder="Введіть повідомлення...">
                                        <div class="input-group-append">
                                            <button type="button" class="btn btn-outline-secondary" id="attachButton" title="Прикріпити файл">
                                                <i class="fas fa-paperclip"></i>
                                            </button>
                                            <button type="submit" class="btn btn-primary">
                                                <i class="fas fa-paper-plane"></i>
                                            </button>
                                        </div>
                                    </div>
                                </form>
                                <div id="no-chat-selected" class="text-center text-muted">
                                    Оберіть чат для надсилання повідомлень
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Ініціалізація після рендеру
        setTimeout(() => {
            this.renderContacts();
            this.renderChannels();
            this.setupEventListeners();
            this.updateConnectionStatus();
        }, 100);
    }

    // Компактний віджет для дашборда
    renderWidget(containerId, title = 'Повідомлення') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const recentMessages = this.getRecentMessages(5);
        const unreadCount = this.getTotalUnreadCount();

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        ${title}
                        ${unreadCount > 0 ? `<span class="badge badge-danger ml-2">${unreadCount}</span>` : ''}
                    </h5>
                </div>
                <div class="card-body p-0">
                    ${recentMessages.length > 0 ? `
                        <div class="list-group list-group-flush">
                            ${recentMessages.map(message => `
                                <div class="list-group-item list-group-item-action">
                                    <div class="d-flex align-items-center">
                                        <img src="${this.getAvatarUrl(message.sender)}" alt="${message.sender.firstName}" class="rounded-circle mr-3" style="width: 40px; height: 40px;">
                                        <div class="flex-grow-1">
                                            <div class="d-flex justify-content-between">
                                                <h6 class="mb-1">${message.sender.firstName} ${message.sender.lastName}</h6>
                                                <small class="text-muted">${this.getTimeAgo(message.timestamp)}</small>
                                            </div>
                                            <p class="mb-1 text-truncate">${message.text}</p>
                                            ${message.type === 'channel' ? `<small class="text-muted">#${message.chatId}</small>` : ''}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="text-center py-4">
                            <i class="far fa-comments fa-2x text-muted mb-2"></i>
                            <p class="text-muted mb-0">Немає повідомлень</p>
                        </div>
                    `}
                </div>
                <div class="card-footer">
                    <a href="#" onclick="chatSystem.renderInContainer('main-content')" class="btn btn-sm btn-outline-primary btn-block">
                        <i class="fas fa-comments"></i> Відкрити чат
                    </a>
                </div>
            </div>
        `;
    }

    // Отримання останніх повідомлень
    getRecentMessages(limit = 5) {
        return this.messages
            .filter(m => m.sender._id !== this.currentUser._id) // Тільки вхідні
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    // Підрахунок непрочитаних повідомлень
    getTotalUnreadCount() {
        const contactsUnread = this.contacts.reduce((sum, contact) => sum + (contact.unreadCount || 0), 0);
        const channelsUnread = this.channels.reduce((sum, channel) => sum + (channel.unreadCount || 0), 0);
        return contactsUnread + channelsUnread;
    }

    // Отримання статистики для CRM дашборда
    getChatStats() {
        return {
            totalContacts: this.contacts.length,
            onlineContacts: this.contacts.filter(c => c.isOnline).length,
            totalChannels: this.channels.length,
            unreadMessages: this.getTotalUnreadCount(),
            todayMessages: this.messages.filter(m => {
                const today = new Date().toDateString();
                return new Date(m.timestamp).toDateString() === today;
            }).length,
            isConnected: this.isConnected
        };
    }

    // Швидкий доступ до чату з конкретним користувачем
    openChatFromCRM(userId, userName) {
        // Спочатку рендеримо чат в CRM
        this.renderInContainer('main-content');
        
        // Потім відкриваємо конкретний чат
        setTimeout(() => {
            this.openDirectChat(userId);
        }, 500);
    }

    // ===================================
    // ФАЙЛОВА СИСТЕМА
    // ===================================

    /**
     * Обробка вибору файлу
     */
    handleFileSelect(event) {
        const files = event.target.files;
        if (files.length === 0) return;

        for (let i = 0; i < files.length; i++) {
            this.uploadFile(files[i]);
        }

        // Очистити input
        event.target.value = '';
    }

    /**
     * Завантаження файлу
     */
    async uploadFile(file) {
        try {
            // Валідація файлу
            if (!this.validateFile(file)) {
                return;
            }

            // Показати прогрес
            const progressId = this.showUploadProgress(file.name);

            // Конвертувати в base64
            const fileData = await this.fileToBase64(file);

            const token = localStorage.getItem('authToken');
            const chatId = this.getChatId();

            const response = await fetch(`${this.apiUrl}/files/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fileName: file.name,
                    fileData,
                    chatId
                })
            });

            const result = await response.json();

            if (result.success) {
                // Надіслати повідомлення з файлом
                await this.sendFileMessage(result.file);
                this.hideUploadProgress(progressId);
                
                toastr.success(`Файл ${file.name} завантажено`);
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            console.error('Помилка завантаження файлу:', error);
            toastr.error(`Не вдалося завантажити файл: ${error.message}`);
        }
    }

    /**
     * Валідація файлу
     */
    validateFile(file) {
        // Перевірка розміру
        if (file.size > this.maxFileSize) {
            toastr.error(`Файл занадто великий. Максимум ${this.maxFileSize / 1024 / 1024}MB`);
            return false;
        }

        // Перевірка типу
        const isAllowed = this.allowedFileTypes.some(type => {
            if (type.endsWith('/*')) {
                return file.type.startsWith(type.slice(0, -1));
            }
            return file.type === type;
        });

        if (!isAllowed) {
            toastr.error('Непідтримуваний тип файлу');
            return false;
        }

        return true;
    }

    /**
     * Конвертація файлу в base64
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Надсилання повідомлення з файлом
     */
    async sendFileMessage(fileMetadata) {
        const messageData = {
            type: 'file',
            file: fileMetadata,
            text: `📎 ${fileMetadata.originalName}`
        };

        if (this.currentChatType === 'direct') {
            messageData.to = this.currentChat;
        } else {
            messageData.chatId = this.currentChat;
        }

        await this.sendMessage('', messageData);
    }

    /**
     * Рендер файлового повідомлення
     */
    renderFileMessage(message) {
        const file = message.file;
        const isImage = file.category === 'images';
        const fileSize = this.formatFileSize(file.size);
        const fileIcon = this.getFileIcon(file.category);

        let fileContent = '';

        if (isImage) {
            fileContent = `
                <div class="file-message image-message">
                    <img src="${file.url}" alt="${file.originalName}" 
                         class="chat-image" onclick="chatSystem.openImageModal('${file.url}', '${file.originalName}')">
                    <div class="file-info">
                        <small class="text-muted">${file.originalName} (${fileSize})</small>
                    </div>
                </div>
            `;
        } else {
            fileContent = `
                <div class="file-message document-message">
                    <div class="file-icon">
                        <i class="fas ${fileIcon}"></i>
                    </div>
                    <div class="file-details">
                        <div class="file-name">${file.originalName}</div>
                        <div class="file-meta text-muted">${fileSize} • ${file.category}</div>
                    </div>
                    <div class="file-actions">
                        <a href="${file.url}" download="${file.originalName}" 
                           class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-download"></i>
                        </a>
                    </div>
                </div>
            `;
        }

        return fileContent;
    }

    /**
     * Показати прогрес завантаження
     */
    showUploadProgress(fileName) {
        const progressId = `upload-${Date.now()}`;
        const progressHtml = `
            <div id="${progressId}" class="upload-progress mb-2">
                <div class="d-flex align-items-center">
                    <i class="fas fa-upload text-primary mr-2"></i>
                    <div class="flex-grow-1">
                        <small>${fileName}</small>
                        <div class="progress progress-sm">
                            <div class="progress-bar progress-bar-striped progress-bar-animated" 
                                 style="width: 100%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = progressHtml;
            messagesContainer.appendChild(tempDiv.firstElementChild);
        }

        return progressId;
    }

    /**
     * Приховати прогрес завантаження
     */
    hideUploadProgress(progressId) {
        const progressElement = document.getElementById(progressId);
        if (progressElement) {
            progressElement.remove();
        }
    }

    /**
     * Форматування розміру файлу
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Отримання іконки файлу
     */
    getFileIcon(category) {
        const icons = {
            images: 'fa-image',
            documents: 'fa-file-alt',
            spreadsheets: 'fa-file-excel',
            presentations: 'fa-file-powerpoint',
            archives: 'fa-file-archive',
            audio: 'fa-file-audio',
            video: 'fa-file-video',
            other: 'fa-file'
        };
        return icons[category] || icons.other;
    }

    /**
     * Відкрити модальне вікно зображення
     */
    openImageModal(imageUrl, imageName) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${imageName}</h5>
                        <button type="button" class="close" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body text-center">
                        <img src="${imageUrl}" alt="${imageName}" class="img-fluid">
                    </div>
                    <div class="modal-footer">
                        <a href="${imageUrl}" download="${imageName}" class="btn btn-primary">
                            <i class="fas fa-download"></i> Завантажити
                        </a>
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Закрити</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        $(modal).modal('show');

        $(modal).on('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    /**
     * Отримання ID поточного чату
     */
    getChatId() {
        if (this.currentChatType === 'direct') {
            return `${this.currentUser._id}_${this.currentChat}`;
        } else {
            return this.currentChat;
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