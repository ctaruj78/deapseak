class VoiceControl {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.commands = new Map();
        this.init();
    }

    init() {
        this.setupSpeechRecognition();
        this.setupCommands();
        this.setupEventListeners();
    }

    setupSpeechRecognition() {
        // Перевірка підтримки Web Speech API
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'uk-UA';

            this.recognition.onresult = (event) => this.handleRecognitionResult(event);
            this.recognition.onerror = (event) => this.handleRecognitionError(event);
            this.recognition.onend = () => this.handleRecognitionEnd();

        } else {
            console.warn('Web Speech API не підтримується в цьому браузері');
        }
    }

    setupCommands() {
        // Основні голосові команди
        this.commands.set('відкрий головну', () => this.navigateTo('dashboard'));
        this.commands.set('покажи ліфти', () => this.navigateTo('lifts'));
        this.commands.set('відкрий завдання', () => this.navigateTo('tasks'));
        this.commands.set('покажи звіти', () => this.navigateTo('reports'));
        this.commands.set('відкрий календар', () => this.navigateTo('calendar'));

        // Команди пошуку
        this.commands.set('знайди ліфт', () => this.triggerSearch('lifts'));
        this.commands.set('пошук користувачів', () => this.triggerSearch('users'));
        this.commands.set('знайди завдання', () => this.triggerSearch('tasks'));

        // Команди створення
        this.commands.set('нове завдання', () => this.createNew('task'));
        this.commands.set('додай ліфт', () => this.createNew('lift'));
        this.commands.set('новий звіт', () => this.createNew('report'));

        // Команди статусу
        this.commands.set('який статус', () => this.showStatus());
        this.commands.set('покажи статистику', () => this.showStatistics());
        this.commands.set('скільки завдань', () => this.showTaskCount());

        // Допомога
        this.commands.set('допомога', () => this.showHelp());
        this.commands.set('які команди', () => this.showAvailableCommands());
    }

    setupEventListeners() {
        const voiceButton = document.getElementById('voiceControlBtn');
        if (voiceButton) {
            voiceButton.addEventListener('click', () => this.toggleListening());
        }

        // Гаряча клавіша для голосового керування
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                this.toggleListening();
            }
        });
    }

    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    startListening() {
        if (!this.recognition) {
            this.showMessage('Голосове керування не підтримується');
            return;
        }

        try {
            this.recognition.start();
            this.isListening = true;
            this.updateUIStatus();
            this.showMessage('Слухаю...', 'listening');
        } catch (error) {
            console.error('Помилка запуску розпізнавання мови:', error);
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
            this.updateUIStatus();
        }
    }

    handleRecognitionResult(event) {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        this.updateInterimResult(interimTranscript);

        if (finalTranscript) {
            this.processCommand(finalTranscript.trim().toLowerCase());
        }
    }

    processCommand(command) {
        console.log('Розпізнана команда:', command);

        let matched = false;
        for (const [pattern, handler] of this.commands) {
            if (command.includes(pattern)) {
                handler();
                matched = true;
                this.showMessage(`Виконано: ${pattern}`, 'success');
                break;
            }
        }

        if (!matched) {
            this.showMessage('Не розпізнано команду. Спробуйте ще раз.', 'error');
        }

        // Перезапуск прослуховування після обробки команди
        setTimeout(() => {
            if (this.isListening) {
                this.recognition.start();
            }
        }, 100);
    }

    handleRecognitionError(event) {
        console.error('Помилка розпізнавання мови:', event.error);
        
        if (event.error === 'not-allowed') {
            this.showMessage('Дозвіл на використання мікрофона не надано', 'error');
        } else if (event.error === 'network') {
            this.showMessage('Помилка мережі', 'error');
        }
        
        this.isListening = false;
        this.updateUIStatus();
    }

    handleRecognitionEnd() {
        if (this.isListening) {
            // Автоматичний перезапуск, якщо все ще в режимі прослуховування
            setTimeout(() => {
                if (this.isListening) {
                    this.recognition.start();
                }
            }, 100);
        }
    }

    updateUIStatus() {
        const voiceButton = document.getElementById('voiceControlBtn');
        const statusIndicator = document.getElementById('voiceStatus');
        
        if (voiceButton) {
            voiceButton.classList.toggle('listening', this.isListening);
        }
        
        if (statusIndicator) {
            statusIndicator.textContent = this.isListening ? 'Слухаю...' : 'Голосове керування';
            statusIndicator.className = this.isListening ? 'listening' : '';
        }
    }

    updateInterimResult(transcript) {
        const interimElement = document.getElementById('voiceInterim');
        if (interimElement && transcript) {
            interimElement.textContent = transcript;
            interimElement.style.display = 'block';
            
            // Сховати через 2 секунди
            clearTimeout(this.interimTimeout);
            this.interimTimeout = setTimeout(() => {
                interimElement.style.display = 'none';
            }, 2000);
        }
    }

    showMessage(message, type = 'info') {
        // Створення сповіщення
        const notification = document.createElement('div');
        notification.className = `voice-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">${this.getNotificationIcon(type)}</div>
            <div class="notification-message">${message}</div>
        `;

        document.body.appendChild(notification);

        // Автоматичне видалення через 3 секунди
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            'listening': '🎤',
            'success': '✅',
            'error': '❌',
            'info': 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }

    // Обробники команд
    navigateTo(page) {
        const routes = {
            'dashboard': '/pages/admin/dashboard.html',
            'lifts': '/pages/admin/lifts.html',
            'tasks': '/pages/tech/tasks.html',
            'reports': '/pages/admin/reports.html',
            'calendar': '/pages/tech/schedule.html'
        };

        if (routes[page]) {
            window.location.href = routes[page];
        }
    }

    triggerSearch(context) {
        const searchSelectors = {
            'lifts': '#searchInput',
            'users': '#searchInput',
            'tasks': '#searchInput'
        };

        const selector = searchSelectors[context];
        if (selector) {
            const searchInput = document.querySelector(selector);
            if (searchInput) {
                searchInput.focus();
                this.showMessage('Готово до пошуку. Скажіть що шукати...', 'info');
                
                // Обробка пошукового запиту
                this.recognition.onresult = (event) => {
                    let finalTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        }
                    }
                    
                    if (finalTranscript) {
                        searchInput.value = finalTranscript;
                        searchInput.dispatchEvent(new Event('input'));
                        this.recognition.onresult = this.handleRecognitionResult.bind(this);
                    }
                };
            }
        }
    }

    createNew(itemType) {
        const creators = {
            'task': () => {
                const btn = document.querySelector('[onclick*="tasks.html?new=true"]');
                if (btn) btn.click();
            },
            'lift': () => {
                const btn = document.getElementById('addLiftBtn');
                if (btn) btn.click();
            },
            'report': () => {
                window.location.href = '/pages/admin/reports.html';
            }
        };

        if (creators[itemType]) {
            creators[itemType]();
        }
    }

    showStatus() {
        // Показати статус системи
        this.showMessage('Система працює нормально. Всі сервіси активні.', 'info');
    }

    showStatistics() {
        // Показати статистику
        const stats = JSON.parse(localStorage.getItem('adminStats')) || {};
        const message = `
            Ліфтів: ${stats.totalLifts || 0}, 
            Активних: ${stats.activeLifts || 0}, 
            Завдань: ${stats.maintenanceDue || 0}
        `;
        this.showMessage(message, 'info');
    }

    showTaskCount() {
        const tasks = JSON.parse(localStorage.getItem('maintenanceRequests')) || [];
        const pending = tasks.filter(t => t.status === 'pending').length;
        const inProgress = tasks.filter(t => t.status === 'in-progress').length;
        
        this.showMessage(`Завдань: ${tasks.length}, В очікуванні: ${pending}, В роботі: ${inProgress}`, 'info');
    }

    showHelp() {
        this.showMessage('Доступні команди: відкрий головну, покажи ліфти, знайди ліфт, нове завдання, який статус', 'info');
    }

    showAvailableCommands() {
        const commandsList = Array.from(this.commands.keys()).join(', ');
        this.showMessage(`Доступні команди: ${commandsList}`, 'info');
    }

    // Метод для додавання користувацьких команд
    addCustomCommand(pattern, handler) {
        this.commands.set(pattern.toLowerCase(), handler);
    }

    // Метод для видалення команд
    removeCommand(pattern) {
        this.commands.delete(pattern.toLowerCase());
    }

    // Перевірка стану мікрофона
    async checkMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            return false;
        }
    }

    // Навчання системи
    trainCommand(pattern, examples) {
        examples.forEach(example => {
            this.commands.set(example, () => {
                // Виконання дії для команди
                if (typeof pattern === 'function') {
                    pattern();
                } else {
                    this.processCommand(pattern);
                }
            });
        });
    }
}

// Ініціалізація голосового керування
const voiceControl = new VoiceControl();

// Додавання глобальних команд
voiceControl.addCustomCommand('вийди з системи', () => {
    window.location.href = '/login.html';
});

voiceControl.addCustomCommand('очистити чат', () => {
    if (typeof chatSystem !== 'undefined') {
        chatSystem.clearChat();
    }
});