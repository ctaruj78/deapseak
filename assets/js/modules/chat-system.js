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
        this.loadUserInfo();
        this.updateStatistics();
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
        div.setAttribute('data-contact-id', contact.id);
        div.innerHTML = `
            <img src="../../assets/img/avatars/${contact.role || 'default'}.png"
                 alt="${contact.firstName}" class="contact-avatar" onerror="this.src='../../assets/img/avatars/default.png'">
            <div class="contact-info">
                <h4>${contact.firstName} ${contact.lastName || ''}</h4>
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
        const contactSearch = document.getElementById('contactSearch');

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

        // Пошук контактів
        contactSearch.addEventListener('input', (e) => {
            this.searchContacts(e.target.value);
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
        if (!this.currentChat) {
            this.showNotification('Оберіть контакт для дзвінка', 'warning');
            return;
        }

        // Перевірка підтримки WebRTC
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showNotification('Ваш браузер не підтримує відеодзвінки', 'error');
            return;
        }

        this.showNotification('Ініціалізація відеодзвінка...', 'info');

        // Створюємо модальне вікно для дзвінка
        const callModal = document.createElement('div');
        callModal.className = 'modal fade';
        callModal.id = 'videoCallModal';
        callModal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Відеодзвінок з ${this.currentChat.firstName} ${this.currentChat.lastName}</h5>
                        <button type="button" class="close" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="video-container">
                            <video id="localVideo" autoplay muted class="w-50"></video>
                            <video id="remoteVideo" autoplay class="w-50"></video>
                        </div>
                        <div class="call-controls text-center mt-3">
                            <button id="muteBtn" class="btn btn-secondary mr-2">
                                <i class="fas fa-microphone"></i>
                            </button>
                            <button id="hangupBtn" class="btn btn-danger">
                                <i class="fas fa-phone-slash"></i> Завершити
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(callModal);
        $(callModal).modal('show');

        // Ініціалізація WebRTC
        this.initializeVideoCall();

        // Обробка завершення дзвінка
        $(callModal).on('hidden.bs.modal', () => {
            this.endVideoCall();
            callModal.remove();
        });
    }

    async initializeVideoCall() {
        try {
            // Отримання доступу до камери та мікрофона
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            const localVideo = document.getElementById('localVideo');
            localVideo.srcObject = stream;
            this.localStream = stream;

            // Імітація підключення до віддаленого користувача
            setTimeout(() => {
                this.showNotification('Відеодзвінок розпочато', 'success');
                // У реальному додатку: встановлення WebRTC з'єднання
            }, 2000);

        } catch (error) {
            console.error('Помилка ініціалізації відеодзвінка:', error);
            this.showNotification('Помилка доступу до камери/мікрофона', 'error');
            $('#videoCallModal').modal('hide');
        }
    }

    endVideoCall() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        this.showNotification('Відеодзвінок завершено', 'info');
    }

    startVoiceCall() {
        if (!this.currentChat) {
            this.showNotification('Оберіть контакт для дзвінка', 'warning');
            return;
        }

        // Перевірка підтримки WebRTC
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showNotification('Ваш браузер не підтримує голосові дзвінки', 'error');
            return;
        }

        this.showNotification('Ініціалізація голосового дзвінка...', 'info');

        // Створюємо модальне вікно для дзвінка
        const callModal = document.createElement('div');
        callModal.className = 'modal fade';
        callModal.id = 'voiceCallModal';
        callModal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Голосовий дзвінок з ${this.currentChat.firstName} ${this.currentChat.lastName}</h5>
                        <button type="button" class="close" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body text-center">
                        <div class="call-avatar mb-3">
                            <i class="fas fa-user-circle fa-5x text-primary"></i>
                        </div>
                        <h4>${this.currentChat.firstName} ${this.currentChat.lastName}</h4>
                        <p class="text-muted">Дзвінок...</p>
                        <div class="call-controls mt-4">
                            <button id="voiceMuteBtn" class="btn btn-secondary mr-2">
                                <i class="fas fa-microphone"></i>
                            </button>
                            <button id="voiceHangupBtn" class="btn btn-danger">
                                <i class="fas fa-phone-slash"></i> Завершити
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(callModal);
        $(callModal).modal('show');

        // Ініціалізація голосового дзвінка
        this.initializeVoiceCall();

        // Обробка завершення дзвінка
        $(callModal).on('hidden.bs.modal', () => {
            this.endVoiceCall();
            callModal.remove();
        });
    }

    async initializeVoiceCall() {
        try {
            // Отримання доступу до мікрофона
            const stream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true
            });

            this.localStream = stream;

            // Імітація підключення до віддаленого користувача
            setTimeout(() => {
                this.showNotification('Голосовий дзвінок розпочато', 'success');
                // У реальному додатку: встановлення WebRTC з'єднання
            }, 2000);

        } catch (error) {
            console.error('Помилка ініціалізації голосового дзвінка:', error);
            this.showNotification('Помилка доступу до мікрофона', 'error');
            $('#voiceCallModal').modal('hide');
        }
    }

    endVoiceCall() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        this.showNotification('Голосовий дзвінок завершено', 'info');
    }

    searchContacts(query) {
        const filteredContacts = this.contacts.filter(contact =>
            `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
            contact.role.toLowerCase().includes(query.toLowerCase())
        );
        
        this.renderFilteredContacts(filteredContacts);
    }

    filterContacts(filterType) {
        let filteredContacts = [...this.contacts];

        switch (filterType) {
            case 'online':
                filteredContacts = this.contacts.filter(c => c.status === 'online');
                break;
            case 'technicians':
                filteredContacts = this.contacts.filter(c => c.role === 'technician');
                break;
            case 'all':
            default:
                filteredContacts = [...this.contacts];
                break;
        }

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

    createGroupChat() {
        // Створюємо модальне вікно для створення групового чату
        const groupModal = document.createElement('div');
        groupModal.className = 'modal fade';
        groupModal.id = 'createGroupModal';
        groupModal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Створити груповий чат</h5>
                        <button type="button" class="close" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="createGroupForm">
                            <div class="form-group">
                                <label for="groupName">Назва групи</label>
                                <input type="text" class="form-control" id="groupName" required>
                            </div>
                            <div class="form-group">
                                <label for="groupDescription">Опис (необов'язково)</label>
                                <textarea class="form-control" id="groupDescription" rows="2"></textarea>
                            </div>
                            <div class="form-group">
                                <label>Додати учасників</label>
                                <div id="groupMembers" class="border p-2" style="max-height: 200px; overflow-y: auto;">
                                    ${this.contacts.slice(0, 10).map(contact => `
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" value="${contact.id}" id="member${contact.id}">
                                            <label class="form-check-label" for="member${contact.id}">
                                                ${contact.firstName} ${contact.lastName} (${contact.role})
                                            </label>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Скасувати</button>
                        <button type="button" class="btn btn-primary" id="createGroupBtn">Створити</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(groupModal);
        $(groupModal).modal('show');

        // Обробка створення групи
        document.getElementById('createGroupBtn').addEventListener('click', () => {
            const groupName = document.getElementById('groupName').value.trim();
            const groupDescription = document.getElementById('groupDescription').value.trim();
            const selectedMembers = Array.from(document.querySelectorAll('#groupMembers input:checked')).map(cb => cb.value);

            if (!groupName) {
                this.showNotification('Введіть назву групи', 'warning');
                return;
            }

            if (selectedMembers.length === 0) {
                this.showNotification('Оберіть хоча б одного учасника', 'warning');
                return;
            }

            // Створюємо груповий чат
            const groupChat = {
                id: 'group_' + Date.now(),
                name: groupName,
                description: groupDescription,
                type: 'group',
                members: selectedMembers,
                messages: [],
                createdAt: new Date(),
                lastMessage: null
            };

            // Додаємо до чатів
            this.chats.unshift(groupChat);
            this.renderChatList();

            // Відправляємо системне повідомлення
            this.sendMessage('Система', `Група "${groupName}" створена`, groupChat.id, 'system');

            $(groupModal).modal('hide');
            groupModal.remove();

            this.showNotification(`Груповий чат "${groupName}" створено`, 'success');
        });

        // Видаляємо модальне вікно після закриття
        $(groupModal).on('hidden.bs.modal', () => {
            groupModal.remove();
        });
    }

    sendBroadcast() {
        // Створюємо модальне вікно для оголошення
        const broadcastModal = document.createElement('div');
        broadcastModal.className = 'modal fade';
        broadcastModal.id = 'broadcastModal';
        broadcastModal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Надіслати оголошення</h5>
                        <button type="button" class="close" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="broadcastForm">
                            <div class="form-group">
                                <label for="broadcastTitle">Заголовок</label>
                                <input type="text" class="form-control" id="broadcastTitle" required>
                            </div>
                            <div class="form-group">
                                <label for="broadcastMessage">Повідомлення</label>
                                <textarea class="form-control" id="broadcastMessage" rows="4" required></textarea>
                            </div>
                            <div class="form-group">
                                <label>Надіслати до</label>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="broadcastTarget" id="broadcastAll" value="all" checked>
                                    <label class="form-check-label" for="broadcastAll">
                                        Всі контакти
                                    </label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="broadcastTarget" id="broadcastTechnicians" value="technicians">
                                    <label class="form-check-label" for="broadcastTechnicians">
                                        Тільки техніки
                                    </label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="broadcastTarget" id="broadcastOnline" value="online">
                                    <label class="form-check-label" for="broadcastOnline">
                                        Тільки онлайн контакти
                                    </label>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Скасувати</button>
                        <button type="button" class="btn btn-primary" id="sendBroadcastBtn">Надіслати</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(broadcastModal);
        $(broadcastModal).modal('show');

        // Обробка відправки оголошення
        document.getElementById('sendBroadcastBtn').addEventListener('click', () => {
            const title = document.getElementById('broadcastTitle').value.trim();
            const message = document.getElementById('broadcastMessage').value.trim();
            const target = document.querySelector('input[name="broadcastTarget"]:checked').value;

            if (!title || !message) {
                this.showNotification('Заповніть всі поля', 'warning');
                return;
            }

            // Визначаємо одержувачів
            let recipients = [];
            switch (target) {
                case 'all':
                    recipients = this.contacts;
                    break;
                case 'technicians':
                    recipients = this.contacts.filter(c => c.role === 'technician');
                    break;
                case 'online':
                    recipients = this.contacts.filter(c => c.status === 'online');
                    break;
            }

            if (recipients.length === 0) {
                this.showNotification('Немає одержувачів для відправки', 'warning');
                return;
            }

            // Надсилаємо оголошення
            const broadcastMessage = `📢 ${title}\n\n${message}`;
            recipients.forEach(contact => {
                this.sendMessage('Оголошення', broadcastMessage, contact.id, 'broadcast');
            });

            $(broadcastModal).modal('hide');
            broadcastModal.remove();

            this.showNotification(`Оголошення надіслано ${recipients.length} контактам`, 'success');
        });

        // Видаляємо модальне вікно після закриття
        $(broadcastModal).on('hidden.bs.modal', () => {
            broadcastModal.remove();
        });
    }

    showChatHistory() {
        // Створюємо модальне вікно для історії чатів
        const historyModal = document.createElement('div');
        historyModal.className = 'modal fade';
        historyModal.id = 'chatHistoryModal';
        historyModal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Історія чатів</h5>
                        <button type="button" class="close" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="historyFilter">Фільтр за періодом</label>
                            <select class="form-control" id="historyFilter">
                                <option value="all">Всі повідомлення</option>
                                <option value="today">Сьогодні</option>
                                <option value="week">Цього тижня</option>
                                <option value="month">Цього місяця</option>
                            </select>
                        </div>
                        <div id="chatHistoryContent" style="max-height: 400px; overflow-y: auto;">
                            ${this.renderChatHistory()}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Закрити</button>
                        <button type="button" class="btn btn-primary" id="exportHistoryBtn">Експортувати</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(historyModal);
        $(historyModal).modal('show');

        // Обробка зміни фільтра
        document.getElementById('historyFilter').addEventListener('change', (e) => {
            document.getElementById('chatHistoryContent').innerHTML = this.renderChatHistory(e.target.value);
        });

        // Обробка експорту
        document.getElementById('exportHistoryBtn').addEventListener('click', () => {
            this.exportChatHistory();
        });

        // Видаляємо модальне вікно після закриття
        $(historyModal).on('hidden.bs.modal', () => {
            historyModal.remove();
        });
    }

    renderChatHistory(filter = 'all') {
        let allMessages = [];

        // Збираємо всі повідомлення з усіх чатів
        this.chats.forEach(chat => {
            if (chat.messages) {
                chat.messages.forEach(msg => {
                    allMessages.push({
                        ...msg,
                        chatName: chat.name || `${chat.firstName} ${chat.lastName}`,
                        chatId: chat.id
                    });
                });
            }
        });

        // Фільтруємо за періодом
        const now = new Date();
        switch (filter) {
            case 'today':
                allMessages = allMessages.filter(msg => {
                    const msgDate = new Date(msg.timestamp);
                    return msgDate.toDateString() === now.toDateString();
                });
                break;
            case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                allMessages = allMessages.filter(msg => new Date(msg.timestamp) >= weekAgo);
                break;
            case 'month':
                const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                allMessages = allMessages.filter(msg => new Date(msg.timestamp) >= monthAgo);
                break;
        }

        // Сортуємо за часом (найновіші зверху)
        allMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (allMessages.length === 0) {
            return '<div class="text-center text-muted py-4"><i class="fas fa-inbox fa-2x mb-2"></i><p>Немає повідомлень в історії</p></div>';
        }

        return allMessages.map(msg => `
            <div class="history-item border-bottom py-2">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong>${msg.sender}</strong> → <span class="text-primary">${msg.chatName}</span>
                        <br>
                        <small class="text-muted">${this.formatMessageTime(msg.timestamp)}</small>
                    </div>
                    <div class="message-content">
                        ${msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content}
                    </div>
                </div>
            </div>
        `).join('');
    }

    exportChatHistory() {
        const historyData = {
            exportDate: new Date().toISOString(),
            chats: this.chats.map(chat => ({
                id: chat.id,
                name: chat.name || `${chat.firstName} ${chat.lastName}`,
                type: chat.type || 'personal',
                messageCount: chat.messages ? chat.messages.length : 0,
                messages: chat.messages || []
            }))
        };

        const json = JSON.stringify(historyData, null, 2);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `chat_history_${new Date().toISOString().split('T')[0]}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showNotification('Історія чатів експортована', 'success');
    }

    showSettings() {
        // Створюємо модальне вікно для налаштувань
        const settingsModal = document.createElement('div');
        settingsModal.className = 'modal fade';
        settingsModal.id = 'chatSettingsModal';
        settingsModal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Налаштування чату</h5>
                        <button type="button" class="close" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="chatSettingsForm">
                            <div class="form-group">
                                <h6>Сповіщення</h6>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="soundEnabled" checked>
                                    <label class="form-check-label" for="soundEnabled">
                                        Звукові сповіщення
                                    </label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="desktopNotifications" checked>
                                    <label class="form-check-label" for="desktopNotifications">
                                        Desktop сповіщення
                                    </label>
                                </div>
                            </div>
                            <div class="form-group">
                                <h6>Зовнішній вигляд</h6>
                                <div class="form-group">
                                    <label for="themeSelect">Тема</label>
                                    <select class="form-control" id="themeSelect">
                                        <option value="light">Світла</option>
                                        <option value="dark">Темна</option>
                                        <option value="auto">Автоматично</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="fontSize">Розмір шрифту</label>
                                    <select class="form-control" id="fontSize">
                                        <option value="small">Маленький</option>
                                        <option value="medium" selected>Середній</option>
                                        <option value="large">Великий</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <h6>Конфіденційність</h6>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="showOnlineStatus" checked>
                                    <label class="form-check-label" for="showOnlineStatus">
                                        Показувати статус "онлайн"
                                    </label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="readReceipts" checked>
                                    <label class="form-check-label" for="readReceipts">
                                        Підтвердження прочитання
                                    </label>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Скасувати</button>
                        <button type="button" class="btn btn-primary" id="saveSettingsBtn">Зберегти</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(settingsModal);
        $(settingsModal).modal('show');

        // Завантажуємо поточні налаштування
        this.loadChatSettings();

        // Обробка збереження
        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.saveChatSettings();
            $(settingsModal).modal('hide');
            settingsModal.remove();
            this.showNotification('Налаштування збережено', 'success');
        });

        // Видаляємо модальне вікно після закриття
        $(settingsModal).on('hidden.bs.modal', () => {
            settingsModal.remove();
        });
    }

    loadChatSettings() {
        const settings = JSON.parse(localStorage.getItem('chat_settings')) || {
            soundEnabled: true,
            desktopNotifications: true,
            theme: 'light',
            fontSize: 'medium',
            showOnlineStatus: true,
            readReceipts: true
        };

        document.getElementById('soundEnabled').checked = settings.soundEnabled;
        document.getElementById('desktopNotifications').checked = settings.desktopNotifications;
        document.getElementById('themeSelect').value = settings.theme;
        document.getElementById('fontSize').value = settings.fontSize;
        document.getElementById('showOnlineStatus').checked = settings.showOnlineStatus;
        document.getElementById('readReceipts').checked = settings.readReceipts;
    }

    saveChatSettings() {
        const settings = {
            soundEnabled: document.getElementById('soundEnabled').checked,
            desktopNotifications: document.getElementById('desktopNotifications').checked,
            theme: document.getElementById('themeSelect').value,
            fontSize: document.getElementById('fontSize').value,
            showOnlineStatus: document.getElementById('showOnlineStatus').checked,
            readReceipts: document.getElementById('readReceipts').checked
        };

        localStorage.setItem('chat_settings', JSON.stringify(settings));

        // Застосовуємо налаштування
        this.applyChatSettings(settings);
    }

    formatMessageTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const oneDay = 24 * 60 * 60 * 1000;

        if (diff < oneDay && date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 7 * oneDay) {
            const days = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
            return days[date.getDay()] + ' ' + date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString('uk-UA') + ' ' + date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
        }
    }

    loadUserInfo() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {
                firstName: 'Користувач'
            };
            $('#userName').text(currentUser.firstName);
        } catch (error) {
            console.error('Помилка завантаження даних користувача:', error);
        }
    }

    updateStatistics() {
        const totalContacts = this.contacts.length;
        const onlineContacts = this.contacts.filter(c => c.status === 'online').length;
        const todayMessages = Math.floor(Math.random() * 50) + 10; // Імітація
        const avgResponseTime = Math.floor(Math.random() * 30) + 5; // Імітація

        $('#totalContacts').text(totalContacts);
        $('#onlineContacts').text(onlineContacts);
        $('#todayMessages').text(todayMessages);
        $('#avgResponseTime').text(avgResponseTime + ' хв');
    }
}

// Ініціалізація чат системи
const chatSystem = new ChatSystem();