class ChatSystem {
    constructor() {
        this.contacts = [];
        this.currentChat = null;
        this.messages = [];
        this.socket = null;
        this.init();
    }

    init() {
        this.loadContacts();
        this.setupEventListeners();
        this.setupSocketConnection();
        this.loadChatHistory();
    }

    setupSocketConnection() {
        // Імітація WebSocket з'єднання
        console.log('Ініціалізація чат з\'єднання...');
        // У реальному додатку: this.socket = new WebSocket('wss://your-chat-server.com');
        
        // Імітація отримання повідомлень
        setInterval(() => {
            if (Math.random() > 0.8) {
                this.receiveSimulatedMessage();
            }
        }, 10000);
    }

    loadContacts() {
        // Завантаження контактів з localStorage або API
        const users = JSON.parse(localStorage.getItem('users')) || [];
        this.contacts = users.filter(user => user.role !== 'client'); // Фільтруємо техніків та адмінів
        
        this.renderContacts();
    }

    renderContacts() {
        const contactsContainer = document.getElementById('contactsList');
        contactsContainer.innerHTML = '';

        this.contacts.forEach(contact => {
            const contactElement = this.createContactElement(contact);
            contactsContainer.appendChild(contactElement);
        });
    }

    createContactElement(contact) {
        const div = document.createElement('div');
        div.className = 'contact-item';
        div.innerHTML = `
            <img src="../../assets/img/avatars/${contact.role || 'default'}.png" 
                 alt="${contact.firstName}" class="contact-avatar">
            <div class="contact-info">
                <h4>${contact.firstName} ${contact.lastName}</h4>
                <p class="contact-role">${this.getRoleLabel(contact.role)}</p>
                <p class="contact-status ${contact.status || 'online'}">● ${this.getStatusLabel(contact.status)}</p>
            </div>
            <span class="unread-count" style="display: none;">0</span>
        `;

        div.addEventListener('click', () => this.openChat(contact));
        return div;
    }

    getRoleLabel(role) {
        const roles = {
            'admin': 'Адміністратор',
            'technician': 'Технік',
            'dispatcher': 'Диспетчер'
        };
        return roles[role] || role;
    }

    getStatusLabel(status) {
        const statuses = {
            'online': 'В мережі',
            'offline': 'Не в мережі',
            'busy': 'Зайнятий'
        };
        return statuses[status] || 'В мережі';
    }

    openChat(contact) {
        this.currentChat = contact;
        this.messages = [];
        
        this.updateChatHeader();
        this.loadChatHistory();
        this.markAsRead();
        
        document.getElementById('chatSection').style.display = 'block';
        document.getElementById('contactsSection').style.display = 'none';
    }

    updateChatHeader() {
        const header = document.getElementById('chatHeader');
        header.innerHTML = `
            <button class="back-btn" onclick="chatSystem.showContacts()">←</button>
            <img src="../../assets/img/avatars/${this.currentChat.role || 'default'}.png" 
                 alt="${this.currentChat.firstName}" class="chat-avatar">
            <div class="chat-info">
                <h4>${this.currentChat.firstName} ${this.currentChat.lastName}</h4>
                <p class="chat-status">${this.getStatusLabel(this.currentChat.status)}</p>
            </div>
            <div class="chat-actions">
                <button class="btn btn-icon" onclick="chatSystem.startVideoCall()">📹</button>
                <button class="btn btn-icon" onclick="chatSystem.startVoiceCall()">📞</button>
            </div>
        `;
    }

    showContacts() {
        document.getElementById('chatSection').style.display = 'none';
        document.getElementById('contactsSection').style.display = 'block';
        this.currentChat = null;
    }

    loadChatHistory() {
        if (!this.currentChat) return;

        const chatId = this.getChatId();
        const savedMessages = localStorage.getItem(`chat_${chatId}`);
        
        if (savedMessages) {
            this.messages = JSON.parse(savedMessages);
        } else {
            // Додаємо welcome message
            this.messages = [{
                id: Date.now(),
                sender: this.currentChat.id,
                content: 'Привіт! Як я можу допомогти?',
                timestamp: new Date(),
                type: 'text'
            }];
        }

        this.renderMessages();
    }

    getChatId() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const ids = [currentUser.id, this.currentChat.id].sort();
        return ids.join('_');
    }

    renderMessages() {
        const container = document.getElementById('chatMessages');
        container.innerHTML = '';

        this.messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            container.appendChild(messageElement);
        });

        this.scrollToBottom();
    }

    createMessageElement(message) {
        const isCurrentUser = message.sender === JSON.parse(localStorage.getItem('currentUser'))?.id;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isCurrentUser ? 'outgoing' : 'incoming'}`;

        if (!isCurrentUser) {
            messageDiv.innerHTML = `
                <img src="../../assets/img/avatars/${this.currentChat.role || 'default'}.png" 
                     alt="Avatar" class="message-avatar">
            `;
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        if (message.type === 'text') {
            contentDiv.innerHTML = `
                <p>${message.content}</p>
                <span class="message-time">${this.formatTime(message.timestamp)}</span>
            `;
        } else if (message.type === 'file') {
            contentDiv.innerHTML = `
                <div class="file-message">
                    <span class="file-icon">📎</span>
                    <div class="file-info">
                        <p class="file-name">${message.fileName}</p>
                        <p class="file-size">${this.formatFileSize(message.fileSize)}</p>
                    </div>
                    <a href="${message.fileUrl}" download class="download-btn">⬇️</a>
                </div>
                <span class="message-time">${this.formatTime(message.timestamp)}</span>
            `;
        }

        messageDiv.appendChild(contentDiv);
        return messageDiv;
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();

        if (!content || !this.currentChat) return;

        const message = {
            id: Date.now(),
            sender: JSON.parse(localStorage.getItem('currentUser'))?.id,
            content: content,
            timestamp: new Date(),
            type: 'text'
        };

        this.messages.push(message);
        this.saveChatHistory();
        this.renderMessages();

        input.value = '';
        this.scrollToBottom();

        // Імітація відповіді
        setTimeout(() => {
            this.receiveSimulatedResponse();
        }, 1000 + Math.random() * 2000);
    }

    receiveSimulatedResponse() {
        if (!this.currentChat) return;

        const responses = [
            'Дякую за повідомлення!',
            'Зрозумів, працюю над цим.',
            'Запит прийнято, оновлю інформацію.',
            'Добре, перевірю та повідомлю.',
            'Я передам цю інформацію відповідному фахівцю.'
        ];

        const response = {
            id: Date.now(),
            sender: this.currentChat.id,
            content: responses[Math.floor(Math.random() * responses.length)],
            timestamp: new Date(),
            type: 'text'
        };

        this.messages.push(response);
        this.saveChatHistory();
        this.renderMessages();
        this.scrollToBottom();
    }

    receiveSimulatedMessage() {
        if (this.contacts.length === 0 || this.currentChat) return;

        const randomContact = this.contacts[Math.floor(Math.random() * this.contacts.length)];
        const messages = [
            'Привіт, є нове завдання!',
            'Потрібна ваша допомога з ліфтом.',
            'Нагадую про майбутнє ТО.',
            'Чи є у вас доступність для нового завдання?',
            'Надішлю деталі по останній заявці.'
        ];

        // Оновлюємо лічильник непрочитаних
        this.updateUnreadCount(randomContact.id);
    }

    updateUnreadCount(contactId) {
        const contactElement = document.querySelector(`[data-contact-id="${contactId}"]`);
        if (contactElement) {
            const unreadSpan = contactElement.querySelector('.unread-count');
            let count = parseInt(unreadSpan.textContent || '0');
            unreadSpan.textContent = count + 1;
            unreadSpan.style.display = 'block';
        }
    }

    markAsRead() {
        if (this.currentChat) {
            const unreadSpan = document.querySelector(`[data-contact-id="${this.currentChat.id}"] .unread-count`);
            if (unreadSpan) {
                unreadSpan.style.display = 'none';
                unreadSpan.textContent = '0';
            }
        }
    }

    async sendFile(file) {
        if (!this.currentChat) return;

        // Імітація завантаження файлу
        const message = {
            id: Date.now(),
            sender: JSON.parse(localStorage.getItem('currentUser'))?.id,
            type: 'file',
            fileName: file.name,
            fileSize: file.size,
            fileUrl: URL.createObjectURL(file),
            timestamp: new Date()
        };

        this.messages.push(message);
        this.saveChatHistory();
        this.renderMessages();
        this.scrollToBottom();
    }

    setupEventListeners() {
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendMessage');
        const fileInput = document.getElementById('fileInput');

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        sendButton.addEventListener('click', () => this.sendMessage());

        document.getElementById('attachBtn').addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.sendFile(e.target.files[0]);
                e.target.value = '';
            }
        });
    }

    saveChatHistory() {
        if (!this.currentChat) return;
        
        const chatId = this.getChatId();
        localStorage.setItem(`chat_${chatId}`, JSON.stringify(this.messages));
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('uk-UA', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    scrollToBottom() {
        const container = document.getElementById('chatMessages');
        container.scrollTop = container.scrollHeight;
    }

    startVideoCall() {
        alert('Відеодзвінок буде реалізовано в майбутніх версіях');
    }

    startVoiceCall() {
        alert('Голосовий дзвінок буде реалізовано в майбутніх версіях');
    }

    searchContacts(query) {
        const filteredContacts = this.contacts.filter(contact =>
            `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
            contact.role.toLowerCase().includes(query.toLowerCase())
        );
        
        this.renderFilteredContacts(filteredContacts);
    }

    renderFilteredContacts(contacts) {
        const container = document.getElementById('contactsList');
        container.innerHTML = '';

        contacts.forEach(contact => {
            const contactElement = this.createContactElement(contact);
            container.appendChild(contactElement);
        });
    }
}

// Ініціалізація чат системи
const chatSystem = new ChatSystem();