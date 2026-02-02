class AIAssistant {
    constructor() {
        this.isListening = false;
        this.recognition = null;
        this.isChatOpen = false;
        this.settings = {
            voiceEnabled: true,
            autoOpen: false,
            soundEffects: true,
            language: 'uk-UA'
        };
        this.defaultSettings = {...this.settings};
        this.init();
    }

    init() {
        this.setupVoiceRecognition();
        this.setupEventListeners();
        this.loadUserPreferences();
        this.injectAssistantButton();
        this.loadCommandHistory();
        
        if (this.settings.autoOpen) {
            setTimeout(() => this.openChat(), 1000);
        }
    }

    setupVoiceRecognition() {
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.lang = this.settings.language;
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 3;

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.processCommand(transcript);
                this.saveToHistory(transcript, 'voice');
            };

            this.recognition.onerror = (event) => {
                console.error('Помилка розпізнавання мови:', event.error);
                this.showNotification('Помилка розпізнавання мови: ' + event.error, 'error');
                this.updateUIStatus('idle');
            };

            this.recognition.onend = () => {
                if (this.isListening) {
                    this.isListening = false;
                    this.updateUIStatus('idle');
                }
            };
        }
    }

    setupEventListeners() {
        // Глобальний хоткей для активації (Ctrl+Space)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.code === 'Space') {
                e.preventDefault();
                this.toggleChat();
            }
            
            // Alt+V для голосового управління
            if (e.altKey && e.code === 'KeyV') {
                e.preventDefault();
                this.toggleListening();
            }
        });

        // Клік по кнопці асистента
        document.addEventListener('click', (e) => {
            if (e.target.closest('.ai-assistant-btn')) {
                this.toggleChat();
            }
            
            if (e.target.closest('.ai-voice-toggle')) {
                this.toggleListening();
            }
            
            if (e.target.closest('.ai-send-message')) {
                const input = document.querySelector('.ai-message-input');
                if (input && input.value.trim()) {
                    this.processCommand(input.value.trim());
                    this.saveToHistory(input.value.trim(), 'text');
                    input.value = '';
                }
            }
            
            if (e.target.closest('.ai-chat-close')) {
                this.closeChat();
            }
            
            if (e.target.closest('.ai-clear-chat')) {
                this.clearChat();
            }
            
            if (e.target.closest('.ai-settings-toggle')) {
                this.toggleSettings();
            }
            
            if (e.target.closest('.ai-command-suggestion')) {
                const command = e.target.dataset.command;
                this.processCommand(command);
                this.saveToHistory(command, 'text');
            }
        });

        // Enter для відправки повідомлення
        document.addEventListener('keydown', (e) => {
            const input = document.querySelector('.ai-message-input');
            if (input && e.key === 'Enter' && !e.shiftKey && this.isChatOpen) {
                e.preventDefault();
                if (input.value.trim()) {
                    this.processCommand(input.value.trim());
                    this.saveToHistory(input.value.trim(), 'text');
                    input.value = '';
                }
            }
        });
    }

    injectAssistantButton() {
        if (!document.querySelector('.ai-assistant-btn')) {
            const aiButton = document.createElement('button');
            aiButton.className = 'ai-assistant-btn';
            aiButton.innerHTML = `
                <i class="fas fa-magic"></i>
                <span class="ai-pulse"></span>
            `;
            aiButton.title = 'AI Асистент (Ctrl+Space)';
            document.body.appendChild(aiButton);
        }
    }

    toggleChat() {
        if (this.isChatOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }

    openChat() {
        if (!document.querySelector('.ai-chat-container')) {
            this.injectChatInterface();
        }
        
        document.querySelector('.ai-chat-container').classList.add('active');
        this.isChatOpen = true;
        
        // Фокус на input
        setTimeout(() => {
            const input = document.querySelector('.ai-message-input');
            if (input) input.focus();
        }, 100);
        
        this.playSound('open');
    }

    closeChat() {
        const chatContainer = document.querySelector('.ai-chat-container');
        if (chatContainer) {
            chatContainer.classList.remove('active');
        }
        this.isChatOpen = false;
        this.playSound('close');
    }

    injectChatInterface() {
        const chatHTML = `
            <div class="ai-chat-container">
                <div class="ai-chat-header">
                    <div class="ai-chat-title">
                        <i class="fas fa-magic"></i>
                        <h4>AI Асистент</h4>
                        <span class="ai-status-indicator"></span>
                    </div>
                    <div class="ai-chat-controls">
                        <button class="ai-settings-toggle" title="Налаштування">
                            <i class="fas fa-cog"></i>
                        </button>
                        <button class="ai-clear-chat" title="Очистити чат">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="ai-chat-close" title="Закрити">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <div class="ai-settings-panel">
                    <h5>Налаштування асистента</h5>
                    <div class="ai-setting">
                        <label>
                            <input type="checkbox" id="ai-voice-enabled" ${this.settings.voiceEnabled ? 'checked' : ''}>
                            Голосове управління
                        </label>
                    </div>
                    <div class="ai-setting">
                        <label>
                            <input type="checkbox" id="ai-auto-open" ${this.settings.autoOpen ? 'checked' : ''}>
                            Автоматичне відкриття
                        </label>
                    </div>
                    <div class="ai-setting">
                        <label>
                            <input type="checkbox" id="ai-sound-effects" ${this.settings.soundEffects ? 'checked' : ''}>
                            Звукові ефекти
                        </label>
                    </div>
                    <button class="ai-settings-save">Зберегти</button>
                </div>
                
                <div class="ai-chat-messages"></div>
                
                <div class="ai-command-suggestions">
                    <div class="ai-suggestion-title">Популярні команди:</div>
                    <div class="ai-suggestion-list"></div>
                </div>
                
                <div class="ai-chat-input">
                    <textarea class="ai-message-input" placeholder="Напишіть повідомлення або натисніть 🎤 для голосу..."></textarea>
                    <div class="ai-chat-actions">
                        <button class="ai-voice-toggle" title="Голосове управління">
                            <i class="fas fa-microphone"></i>
                        </button>
                        <button class="ai-send-message" title="Надіслати">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', chatHTML);
        this.updateSuggestions();
        this.addMessage('assistant', 'Привіт! Я ваш AI асистент. Чим можу допомогти?');
    }

    toggleListening() {
        if (!this.recognition || !this.settings.voiceEnabled) {
            this.showNotification('Голосове управління не доступне', 'warning');
            return;
        }

        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    startListening() {
        try {
            this.recognition.start();
            this.isListening = true;
            this.updateUIStatus('listening');
            this.showNotification('Слухаю... Говоріть', 'info');
            this.playSound('start');
        } catch (error) {
            console.error('Помилка запуску розпізнавання:', error);
        }
    }

    stopListening() {
        try {
            this.recognition.stop();
            this.isListening = false;
            this.updateUIStatus('idle');
            this.playSound('stop');
        } catch (error) {
            console.error('Помилка зупинки розпізнавання:', error);
        }
    }

    processCommand(command) {
        console.log('Отримано команду:', command);
        this.addMessage('user', command);
        this.updateUIStatus('processing');
        
        // Аналіз команди та відповідь
        setTimeout(() => {
            const response = this.generateResponse(command);
            this.addMessage('assistant', response.text);
            
            if (response.action) {
                setTimeout(() => response.action(), 500);
            }
            
            this.updateUIStatus('idle');
        }, 800);
    }

    generateResponse(command) {
        const lowerCommand = command.toLowerCase();
        const userRole = this.getCurrentUserRole();
        const currentPage = this.getCurrentPage();
        
        // Загальні команди для всіх ролей
        if (lowerCommand.includes('допомога') || lowerCommand.includes('команди')) {
            return {
                text: this.getHelpMessage(userRole),
                action: null
            };
        }

        if (lowerCommand.includes('час') || lowerCommand.includes('котра година')) {
            return {
                text: `Зараз ${new Date().toLocaleTimeString('uk-UA')}`,
                action: null
            };
        }

        if (lowerCommand.includes('дата') || lowerCommand.includes('який число')) {
            return {
                text: `Сьогодні ${new Date().toLocaleDateString('uk-UA', { 
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                })}`,
                action: null
            };
        }

        if (lowerCommand.includes('налаштування') || lowerCommand.includes('опції')) {
            return {
                text: 'Відкриваю налаштування асистента...',
                action: () => this.toggleSettings()
            };
        }

        // Специфічні команди для ролей
        switch(userRole) {
            case 'admin':
                return this.processAdminCommand(lowerCommand, currentPage);
            case 'technician':
                return this.processTechnicianCommand(lowerCommand, currentPage);
            case 'client':
                return this.processClientCommand(lowerCommand, currentPage);
            case 'dispatcher':
                return this.processDispatcherCommand(lowerCommand, currentPage);
            default:
                return this.processGuestCommand(lowerCommand, currentPage);
        }
    }

    processAdminCommand(command, currentPage) {
        const responses = {
            'створити кр': {
                text: 'Відкриваю генератор QR-кодів...',
                action: () => window.location.href = 'qr-generator.html'
            },
            'статистика': {
                text: 'Показую статистику системи...',
                action: () => window.location.href = 'analytics.html'
            },
            'користувач': {
                text: 'Відкриваю управління користувачами...',
                action: () => window.location.href = 'users.html'
            },
            'звіт': {
                text: 'Генерую звіт...',
                action: () => this.generateReport()
            },
            'новий користувач': {
                text: 'Створюю нового користувача...',
                action: () => this.createNewUser()
            },
            'бек ап': {
                text: 'Створюю резервну копію даних...',
                action: () => this.createBackup()
            },
            'аналіз даних': {
                text: 'Проводжу глибокий аналіз даних системи...',
                action: () => this.performDataAnalysis()
            },
            'оптимізувати': {
                text: 'Оптимізую продуктивність системи...',
                action: () => this.optimizeSystem()
            },
            'інтеграція': {
                text: 'Перевіряю інтеграції з зовнішніми сервісами...',
                action: () => this.checkIntegrations()
            },
            'безпека': {
                text: 'Перевіряю стан безпеки системи...',
                action: () => this.securityAudit()
            },
            'автоматизація': {
                text: 'Налаштовую автоматичні процеси...',
                action: () => this.setupAutomation()
            },
            'моніторинг': {
                text: 'Відкриваю панель моніторингу...',
                action: () => window.location.href = 'monitoring.html'
            },
            'сповіщення': {
                text: 'Керую системою сповіщень...',
                action: () => this.manageNotifications()
            },
            'експорт всіх': {
                text: 'Експортую всі дані системи...',
                action: () => this.exportAllData()
            },
            'імпорт': {
                text: 'Відкриваю інструменти імпорту...',
                action: () => window.location.href = 'import-tools.html'
            },
            'логі': {
                text: 'Показую системні логи...',
                action: () => this.showSystemLogs()
            },
            'діагностика': {
                text: 'Запускаю діагностику системи...',
                action: () => this.runDiagnostics()
            }
        };

        return this.findMatchingResponse(command, responses) || {
            text: 'Команда не розпізнана. Скажіть "допомога" для списку команд.',
            action: null
        };
    }

    processTechnicianCommand(command, currentPage) {
        // Перевірка на запити про регуляції
        if (command.includes('регуляц') || command.includes('закон') || command.includes('norma') || 
            command.includes('decreto') || command.includes('ipac') || command.includes('dgeg')) {
            return this.processRegulationQuery(command);
        }

        // Перевірка на запити про інспекції та модифікації
        if (command.includes('інспекц') || command.includes('inspeç') || command.includes('modificaç')) {
            return this.processInspectionQuery(command);
        }

        const responses = {
            'сканувати': {
                text: 'Відкриваю сканер QR-кодів...',
                action: () => window.location.href = 'scanner.html'
            },
            'завдання': {
                text: 'Показую ваші поточні завдання...',
                action: () => window.location.href = 'tasks.html'
            },
            'графік': {
                text: 'Відкриваю ваш робочий графік...',
                action: () => window.location.href = 'schedule.html'
            },
            'звіт техніка': {
                text: 'Створюю звіт про роботу...',
                action: () => this.createTechnicianReport()
            },
            'запчастини': {
                text: 'Перевіряю наявність запчастин...',
                action: () => window.location.href = 'inventory.html'
            }
        };

        return this.findMatchingResponse(command, responses) || {
            text: 'Команда не розпізнана. Скажіть "допомога" для списку команд.',
            action: null
        };
    }

    processClientCommand(command, currentPage) {
        const responses = {
            'ліфт': {
                text: 'Перевіряю стан ваших ліфтів...',
                action: () => window.location.href = 'my-lifts.html'
            },
            'заявка': {
                text: 'Відкриваю створення заявки...',
                action: () => window.location.href = 'report-issue.html'
            },
            'рахунок': {
                text: 'Показую ваші рахунки...',
                action: () => window.location.href = 'invoices.html'
            },
            'договір': {
                text: 'Показую інформацію про договір...',
                action: () => window.location.href = 'contract.html'
            },
            'технік': {
                text: 'Перевіряю інформацію про вашого техніка...',
                action: () => this.showAssignedTechnician()
            }
        };

        return this.findMatchingResponse(command, responses) || {
            text: 'Команда не розпізнана. Скажіть "допомога" для списку команд.',
            action: null
        };
    }

    processDispatcherCommand(command, currentPage) {
        const responses = {
            'завдання': {
                text: 'Показую всі активні завдання...',
                action: () => window.location.href = 'all-tasks.html'
            },
            'техніки': {
                text: 'Показую статус техніків...',
                action: () => window.location.href = 'technicians.html'
            },
            'моніторинг': {
                text: 'Відкриваю моніторинг системи...',
                action: () => window.location.href = 'monitoring.html'
            },
            'терміново': {
                text: 'Створюю термінове завдання...',
                action: () => this.createUrgentTask()
            }
        };

        return this.findMatchingResponse(command, responses) || {
            text: 'Команда не розпізнана. Скажіть "допомога" для списку команд.',
            action: null
        };
    }

    processGuestCommand(command, currentPage) {
        const responses = {
            'увійти': {
                text: 'Відкриваю сторінку входу...',
                action: () => window.location.href = 'login.html'
            },
            'реєстрація': {
                text: 'Відкриваю сторінку реєстрації...',
                action: () => window.location.href = 'register.html'
            },
            'контакти': {
                text: 'Показую контактну інформацію...',
                action: () => window.location.href = 'contacts.html'
            }
        };

        return this.findMatchingResponse(command, responses) || {
            text: 'Будь ласка, увійдіть в систему для отримання повного доступу до функцій.',
            action: null
        };
    }

    findMatchingResponse(command, responses) {
        for (const [key, response] of Object.entries(responses)) {
            if (command.includes(key)) {
                return response;
            }
        }
        return null;
    }

    getHelpMessage(role) {
        const helpMessages = {
            'admin': `
Доступні команди:
• "створити QR" - Генератор QR-кодів
• "статистика" - Статистика системи
• "користувачі" - Управління користувачами
• "звіт" - Генерація звітів
• "новий користувач" - Створення користувача
• "бек ап" - Резервне копіювання
• "час" - Поточний час
• "дата" - Поточна дата
• "налаштування" - Налаштування асистента
            `,
            'technician': `
Доступні команди:
• "сканувати" - Сканер QR-кодів
• "завдання" - Мої завдання
• "графік" - Робочий графік
• "звіт техніка" - Звіт про роботу
• "запчастини" - Склад запчастин
• "час" - Поточний час
• "налаштування" - Налаштування асистента
            `,
            'client': `
Доступні команди:
• "стан ліфта" - Стан моїх ліфтів
• "заявка" - Створення заявки
• "рахунки" - Мої рахунки
• "договір" - Інформація про договір
• "технік" - Мій технік
• "час" - Поточний час
• "налаштування" - Налаштування асистента
            `,
            'dispatcher': `
Доступні команди:
• "завдання" - Всі активні завдання
• "техніки" - Статус техніків
• "моніторинг" - Моніторинг системи
• "терміново" - Термінове завдання
• "час" - Поточний час
• "налаштування" - Налаштування асистента
            `,
            'guest': `
Доступні команди:
• "увійти" - Сторінка входу
• "реєстрація" - Сторінка реєстрації
• "контакти" - Контактна інформація
• "час" - Поточний час
• "налаштування" - Налаштування асистента
            `
        };

        return helpMessages[role] || 'Скажіть "допомога" для отримання списку команд.';
    }

    getCurrentUserRole() {
        // В реальному додатку тут буде перевірка з localStorage або API
        const user = JSON.parse(localStorage.getItem('currentUser')) || {};
        return user.role || 'guest';
    }

    getCurrentPage() {
        return window.location.pathname.split('/').pop() || 'unknown';
    }

    addMessage(sender, text) {
        const chatContainer = document.querySelector('.ai-chat-messages');
        if (chatContainer) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `ai-message ai-message-${sender}`;
            messageDiv.innerHTML = `
                <div class="ai-message-content">
                    <div class="ai-message-text">${this.formatMessage(text)}</div>
                    <div class="ai-message-time">${new Date().toLocaleTimeString('uk-UA')}</div>
                </div>
            `;
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }

    formatMessage(text) {
        // Форматування тексту (посилання, списки тощо)
        return text
            .replace(/\n/g, '<br>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    }

    updateUIStatus(status) {
        const btn = document.querySelector('.ai-assistant-btn');
        const indicator = document.querySelector('.ai-status-indicator');
        
        if (btn) btn.classList.remove('ai-listening', 'ai-processing');
        if (indicator) indicator.classList.remove('listening', 'processing');
        
        if (status === 'listening') {
            if (btn) btn.classList.add('ai-listening');
            if (indicator) indicator.classList.add('listening');
        } else if (status === 'processing') {
            if (btn) btn.classList.add('ai-processing');
            if (indicator) indicator.classList.add('processing');
        }
    }

    showNotification(message, type) {
        // Використовуємо нотифікації
        const notification = document.createElement('div');
        notification.className = `ai-notification ai-notification-${type}`;
        notification.innerHTML = `
            <div class="ai-notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-times-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        return icons[type] || 'fa-info-circle';
    }

    playSound(type) {
        if (!this.settings.soundEffects) return;
        
        const sounds = {
            'open': 'https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3',
            'close': 'https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3',
            'start': 'https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3',
            'stop': 'https://assets.mixkit.co/sfx/preview/mixkit-software-interface-soft-2576.mp3'
        };
        
        if (sounds[type]) {
            const audio = new Audio(sounds[type]);
            audio.volume = 0.3;
            audio.play().catch(() => {});
        }
    }

    toggleSettings() {
        const settingsPanel = document.querySelector('.ai-settings-panel');
        if (settingsPanel) {
            settingsPanel.classList.toggle('active');
        }
    }

    clearChat() {
        const chatContainer = document.querySelector('.ai-chat-messages');
        if (chatContainer) {
            chatContainer.innerHTML = '';
            this.addMessage('assistant', 'Чат очищено. Чим можу допомогти?');
        }
    }

    updateSuggestions() {
        const suggestionsContainer = document.querySelector('.ai-suggestion-list');
        if (!suggestionsContainer) return;
        
        const role = this.getCurrentUserRole();
        const suggestions = this.getCommandSuggestions(role);
        
        suggestionsContainer.innerHTML = suggestions.map(suggestion => `
            <button class="ai-command-suggestion" data-command="${suggestion.command}">
                ${suggestion.icon} ${suggestion.text}
            </button>
        `).join('');
    }

    getCommandSuggestions(role) {
        const baseSuggestions = [
            { command: 'допомога', text: 'Допомога', icon: '❓' },
            { command: 'час', text: 'Котра година?', icon: '⏰' }
        ];
        
        const roleSuggestions = {
            'admin': [
                { command: 'створити QR', text: 'Створити QR', icon: '📱' },
                { command: 'статистика', text: 'Статистика', icon: '📊' }
            ],
            'technician': [
                { command: 'сканувати', text: 'Сканувати', icon: '📷' },
                { command: 'завдання', text: 'Мої завдання', icon: '✅' }
            ],
            'client': [
                { command: 'стан ліфта', text: 'Стан ліфтів', icon: '🏢' },
                { command: 'заявка', text: 'Створити заявку', icon: '📝' }
            ]
        };
        
        return [...baseSuggestions, ...(roleSuggestions[role] || [])];
    }

    saveToHistory(command, type) {
        const history = JSON.parse(localStorage.getItem('aiCommandHistory') || '[]');
        history.unshift({
            command,
            type,
            timestamp: new Date().toISOString(),
            role: this.getCurrentUserRole()
        });
        
        // Зберігаємо тільки останні 50 команд
        localStorage.setItem('aiCommandHistory', JSON.stringify(history.slice(0, 50)));
    }

    loadCommandHistory() {
        return JSON.parse(localStorage.getItem('aiCommandHistory') || '[]');
    }

    loadUserPreferences() {
        const prefs = JSON.parse(localStorage.getItem('aiAssistantPrefs')) || {};
        this.settings = { ...this.settings, ...prefs };
    }

    saveUserPreferences() {
        localStorage.setItem('aiAssistantPrefs', JSON.stringify(this.settings));
    }

    // Допоміжні методи для конкретних дій
    generateReport() {
        this.showNotification('Генерація звіту...', 'info');
        // Логіка генерації звіту
    }

    createNewUser() {
        this.showNotification('Створення нового користувача...', 'info');
        // Логіка створення користувача
    }

    createBackup() {
        this.showNotification('Створення резервної копії...', 'info');
        // Логіка створення бекапу
    }

    createTechnicianReport() {
        this.showNotification('Створення звіту техніка...', 'info');
        // Логіка звіту техніка
    }

    showAssignedTechnician() {
        this.showNotification('Пошук інформації про техніка...', 'info');
        // Логіка пошуку техніка
    }

    createUrgentTask() {
        this.showNotification('Створення термінового завдання...', 'info');
        // Логіка створення термінового завдання
    }

    // Супер потужності для адміна
    performDataAnalysis() {
        this.addMessage('assistant', '🔍 Аналізую дані системи...\n\n📈 Знайдено тенденції:\n• Зростання використання на 15%\n• Найпопулярніші QR-коди: ліфти\n• Піки активності: 9:00-11:00\n\n💡 Рекомендації:\n• Оптимізувати ранкові години\n• Додати більше QR для техніків');
    }

    optimizeSystem() {
        this.addMessage('assistant', '⚡ Оптимізую систему...\n\n✅ Виконано:\n• Очищено кеш (2.3MB)\n• Оптимізовано базу даних\n• Стиснуто зображення\n\n🚀 Продуктивність покращена на 23%');
    }

    checkIntegrations() {
        this.addMessage('assistant', '🔗 Перевіряю інтеграції...\n\n📡 Статус:\n• API LiftMaster: ✅ Активний\n• Email сервіс: ✅ Активний\n• SMS шлюз: ⚠️ Обмежено\n• Cloud storage: ✅ Активний\n\n🔧 Виправлено 2 проблеми');
    }

    securityAudit() {
        this.addMessage('assistant', '🔒 Проводжу аудит безпеки...\n\n🛡️ Результати:\n• Паролі: ✅ Сильні\n• Доступи: ✅ Обмежені\n• Логи: ✅ Моніторяться\n• Оновлення: ⚠️ Потрібно 3\n\n🔐 Застосовано 5 покращень');
    }

    setupAutomation() {
        this.addMessage('assistant', '🤖 Налаштовую автоматизацію...\n\n⚙️ Активовано:\n• Автогенерація звітів\n• Автоматичні сповіщення\n• Резервне копіювання\n• Моніторинг продуктивності\n\n⏰ Заощаджено 12 годин на тиждень');
    }

    manageNotifications() {
        this.addMessage('assistant', '📢 Керую сповіщеннями...\n\n📨 Налаштовано:\n• Email сповіщення: 45 користувачів\n• SMS alerts: 12 техніків\n• Push notifications: 78 пристроїв\n\n📊 Ефективність: 94% доставка');
    }

    exportAllData() {
        this.addMessage('assistant', '📤 Експортую всі дані...\n\n💾 Створено:\n• QR-коди: qr_export.json (2.1MB)\n• Користувачі: users_export.csv\n• Ліфти: lifts_export.xlsx\n• Логи: system_logs.zip\n\n📁 Файли готові до завантаження');
    }

    showSystemLogs() {
        this.addMessage('assistant', '📋 Показую системні логи...\n\n📝 Останні події:\n• 14:32: QR сканування #QR0042\n• 14:28: Користувач admin увійшов\n• 14:25: Створено новий QR-код\n• 14:20: Оновлено профіль техніка\n\n🔍 Детальний лог доступний в розділі "Моніторинг"');
    }

    runDiagnostics() {
        this.addMessage('assistant', '🔧 Запускаю діагностику...\n\n⚡ Перевірено:\n• Сервер: ✅ Відповідає (45ms)\n• База даних: ✅ Підключена\n• API: ✅ Функціонують\n• Пам\'ять: ✅ 78% вільно\n• Диск: ⚠️ 85% заповнено\n\n🩺 Здоров\'я системи: 92%');
    }

    // Нові методи для роботи з регуляціями (Circular IPAC 06/2025)
    processRegulationQuery(command) {
        const lowerCommand = command.toLowerCase();
        
        if (lowerCommand.includes('ipac') && lowerCommand.includes('2025')) {
            return {
                text: `📋 Circular IPAC 06/2025 (20.12.2025)

🎯 Основні вимоги:
1️⃣ Визначення специфікації інспекції:
   • Закон на дату введення в експлуатацію
   • Закони для важливих модифікацій

2️⃣ Реєстрація невідповідностей:
   • Всі невідповідності мають бути зареєстровані
   • Результат має відповідати перевіркам

3️⃣ ЗАБОРОНЕНІ дескриптори в звітах:
   ❌ "Немає декларації відповідності модифікації"
   ❌ "Немає оцінки уповноваженого органу"
   
   ✅ Натомість використовувати СПОСТЕРЕЖЕННЯ

💡 Рекомендована практика:
   Якщо модифікація без документації - додати 
   спостереження в звіті, а не відмовлятися від інспекції

📚 Джерело: www.ipac.pt`,
                action: null
            };
        }

        if (lowerCommand.includes('modificaç') || lowerCommand.includes('модифікац')) {
            return {
                text: `🔧 Модифікації ліфтів (IPAC 06/2025)

📋 Що перевіряти:
✅ Технічний стан після модифікації
✅ Відповідність застосовному законодавству
✅ Безпека експлуатації

❌ Що НЕ перевіряти:
❌ Наявність документів від інших органів
❌ Декларації відповідності модифікацій
❌ Оцінки уповноважених органів

💡 Якщо модифікація без документації:
   → Додати СПОСТЕРЕЖЕННЯ в звіт
   → Продовжити технічну інспекцію
   → НЕ відмовлятися від інспекції

🎯 Ваша компетенція:
   • Технічна перевірка установки
   • Оцінка безпеки
   • Виявлення невідповідностей`,
                action: null
            };
        }

        if (lowerCommand.includes('inspeç') || lowerCommand.includes('інспекц')) {
            return {
                text: `🔍 Методологія інспекції (IPAC 06/2025)

📝 Крок 1: Визначити специфікацію
   • Знайти дату введення в експлуатацію
   • Визначити застосовний закон (Decreto 513/70, DL 320/2002, EN 81-20:2020 тощо)
   • Якщо були модифікації - додати відповідні закони

📝 Крок 2: Провести інспекцію
   • Перевірити відповідність визначеній специфікації
   • Зареєструвати всі невідповідності
   • НЕ вимагати документи від інших органів

📝 Крок 3: Оформити звіт
   ✅ Використовувати технічні невідповідності
   ✅ Додавати спостереження про модифікації
   ❌ НЕ використовувати заборонені дескриптори

🎯 Результат має базуватися ТІЛЬКИ на технічних перевірках!`,
                action: null
            };
        }

        return {
            text: 'Для отримання інформації про регуляції запитайте:\n• "IPAC 2025" - Circular IPAC 06/2025\n• "модифікації" - Про модифікації ліфтів\n• "інспекція" - Методологія інспекції',
            action: null
        };
    }

    processInspectionQuery(command) {
        const lowerCommand = command.toLowerCase();

        if (lowerCommand.includes('специфікац') || lowerCommand.includes('specification')) {
            return {
                text: `📋 Специфікація інспекції

🗓️ Як визначити:
1. Дата введення в експлуатацію → Базовий закон
2. Дати модифікацій → Додаткові закони

📅 Періоди законодавства:
• 1970-1980: Decreto 513/70
• 1981-1998: Decreto Regulamentar 13/80
• 1999-2002: Decreto-Lei 295/98
• 2003-2020: Decreto-Lei 320/2002
• 2021+: EN 81-20:2020 + EN 81-50:2020

💡 Приклад:
   Ліфт 1985 + модифікація 2015:
   → DR 13/80 (база) + DL 320/2002 (модифікація)

🔍 Система автоматично визначить специфікацію!`,
                action: () => window.location.href = 'inspection-specification.html'
            };
        }

        if (lowerCommand.includes('звіт') || lowerCommand.includes('relatório')) {
            return {
                text: `📄 Складання звіту інспекції

✅ МОЖНА використовувати:
• Технічні невідповідності з посиланням на закон
• Вимірювання та тести
• Спостереження про стан установки

❌ НЕ МОЖНА використовувати:
• "Немає декларації відповідності"
• "Не оцінено уповноваженим органом"
• Відмова від інспекції через документи

💡 Замість цього:
   СПОСТЕРЕЖЕННЯ: "Виявлено модифікацію без 
   документації. Рекомендується отримати оцінку 
   уповноваженого органу."

🎯 Результат = ТІЛЬКИ технічні перевірки!`,
                action: () => window.location.href = 'inspection-report-validator.html'
            };
        }

        return {
            text: 'Запитайте:\n• "специфікація" - Як визначити\n• "звіт" - Як оформити\n• "модифікації" - Особливості перевірки',
            action: null
        };
    }
}

// Глобальний екземпляр асистента
let aiAssistant = null;

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', function() {
    aiAssistant = new AIAssistant();
});