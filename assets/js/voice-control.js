/**
 * 🎤 Voice Control System для DeapSeaK
 * Система голосового управління з інтеграцією EventBus
 */

class DeapSeaKVoiceControl {
    constructor() {
        this.isListening = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.currentLanguage = 'uk-UA';
        this.commands = new Map();
        this.contextMode = 'general'; // general, lift-creation, inspection, qr-generation
        
        this.init();
    }

    init() {
        // logger.log('🎤 Ініціалізація системи голосового управління...');
        
        if (!this.checkBrowserSupport()) {
            // logger.warn('⚠️ Браузер не підтримує голосове управління');
            return false;
        }

        this.setupSpeechRecognition();
        this.registerVoiceCommands();
        this.setupEventBusIntegration();
        
        // logger.log('✅ Voice Control готовий!');
        return true;
    }

    checkBrowserSupport() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.currentLanguage;
        
        this.recognition.onstart = () => {
            // logger.log('🎤 Голосове управління активне');
            this.isListening = true;
            this.showListeningIndicator();
            
            if (window.eventBus) {
                eventBus.emit('voice:listening-started', { language: this.currentLanguage }, { source: 'voice-control' });
            }
        };

        this.recognition.onresult = (event) => {
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

            if (finalTranscript) {
                this.processVoiceCommand(finalTranscript.trim().toLowerCase());
            }

            this.updateTranscriptDisplay(finalTranscript, interimTranscript);
        };

        this.recognition.onerror = (event) => {
            // logger.error('❌ Помилка розпізнавання мови:', event.error);
            this.speak('Виникла помилка розпізнавання мови');
        };

        this.recognition.onend = () => {
            // logger.log('🔇 Голосове управління зупинено');
            this.isListening = false;
            this.hideListeningIndicator();
        };
    }

    registerVoiceCommands() {
        // logger.log('📝 Реєстрація голосових команд...');

        // Загальні команди управління
        this.commands.set('почати слухати', () => this.startListening());
        this.commands.set('зупинити слухання', () => this.stopListening());
        this.commands.set('допомога', () => this.showVoiceHelp());
        this.commands.set('що ти можеш', () => this.listCapabilities());

        // Команди для ліфтів
        this.commands.set('створити ліфт', () => this.openLiftCreationByVoice());
        this.commands.set('новий ліфт', () => this.openLiftCreationByVoice());
        this.commands.set('додати ліфт', () => this.openLiftCreationByVoice());
        this.commands.set('показати ліфти', () => this.showLiftsList());
        this.commands.set('пошукати ліфт', () => this.startLiftSearch());

        // Команди для QR кодів
        this.commands.set('згенерувати qr код', () => this.generateQRByVoice());
        this.commands.set('створити qr код', () => this.generateQRByVoice());
        this.commands.set('кр код', () => this.generateQRByVoice());

        // Команди для інспекцій
        this.commands.set('запланувати інспекцію', () => this.scheduleInspectionByVoice());
        this.commands.set('нова інспекція', () => this.scheduleInspectionByVoice());
        this.commands.set('показати інспекції', () => this.showInspectionsList());

        // Команди навігації
        this.commands.set('відкрити аналітику', () => this.navigateTo('/pages/admin/analytics-dashboard.html'));
        this.commands.set('показати статистику', () => this.navigateTo('/pages/admin/analytics-dashboard.html'));
        this.commands.set('головна сторінка', () => this.navigateTo('/pages/admin/lifts.html'));

        // Команди для налаштувань
        this.commands.set('змінити мову', () => this.changeLanguage());
        this.commands.set('налаштування', () => this.openSettings());

        // logger.log(`✅ Зареєстровано ${this.commands.size} голосових команд`);
    }

    processVoiceCommand(transcript) {
        // logger.log('🎙️ Обробка команди:', transcript);

        // Перевіряємо точні збіги
        if (this.commands.has(transcript)) {
            const command = this.commands.get(transcript);
            this.speak('Виконую команду');
            command();
            return;
        }

        // Перевіряємо часткові збіги
        for (const [commandText, commandFunction] of this.commands) {
            if (transcript.includes(commandText)) {
                this.speak(`Знайдено команду: ${commandText}`);
                commandFunction();
                return;
            }
        }

        // Контекстні команди залежно від поточної сторінки
        if (this.handleContextualCommand(transcript)) {
            return;
        }

        // Команда не знайдена
        this.speak('Команда не розпізнана. Скажіть "допомога" для списку команд');
        // logger.log('❓ Невідома команда:', transcript);
        
        if (window.eventBus) {
            eventBus.emit('voice:command-not-recognized', { 
                transcript: transcript,
                context: this.contextMode 
            }, { source: 'voice-control' });
        }
    }

    handleContextualCommand(transcript) {
        const currentPath = window.location.pathname;

        // Якщо ми на сторінці ліфтів
        if (currentPath.includes('lifts.html')) {
            if (transcript.includes('номер') && transcript.includes('ліфт')) {
                const numbers = transcript.match(/\d+/g);
                if (numbers && numbers.length > 0) {
                    this.fillLiftNumber(numbers[0]);
                    return true;
                }
            }

            if (transcript.includes('адреса')) {
                this.startAddressDictation();
                return true;
            }
        }

        // Якщо ми на сторінці аналітики
        if (currentPath.includes('analytics')) {
            if (transcript.includes('оновити') || transcript.includes('рефреш')) {
                this.refreshAnalytics();
                return true;
            }
        }

        return false;
    }

    // Голосові дії для ліфтів
    openLiftCreationByVoice() {
        this.speak('Відкриваю форму створення ліфта');
        
        if (typeof openEnhancedModal === 'function') {
            openEnhancedModal();
            this.contextMode = 'lift-creation';
            
            setTimeout(() => {
                this.speak('Форма відкрита. Ви можете диктувати номер ліфта або адресу');
            }, 1000);
        } else {
            this.speak('Функція створення ліфта недоступна на цій сторінці');
        }
    }

    generateQRByVoice() {
        this.speak('Розкажіть номер ліфта для генерації QR коду');
        this.contextMode = 'qr-generation';
        
        // Встановлюємо режим очікування номера ліфта
        this.waitForLiftNumber = true;
    }

    scheduleInspectionByVoice() {
        this.speak('Відкриваю планування інспекції');
        
        // Логіка відкриття модального вікна інспекції
        if (document.getElementById('inspectionModal')) {
            $('#inspectionModal').modal('show');
            this.contextMode = 'inspection';
            this.speak('Ви можете диктувати дату інспекції');
        } else {
            this.speak('Модуль інспекцій недоступний');
        }
    }

    fillLiftNumber(number) {
        const liftNumberInput = document.getElementById('enhancedMunicipalNumber');
        if (liftNumberInput) {
            liftNumberInput.value = number;
            this.speak(`Номер ліфта встановлено: ${number}`);
            
            if (window.eventBus) {
                eventBus.emit('voice:lift-number-entered', { number: number }, { source: 'voice-control' });
            }
        }
    }

    startAddressDictation() {
        this.speak('Диктуйте адресу ліфта');
        this.contextMode = 'address-dictation';
        // Тут можна додати спеціальну обробку для диктування адрес
    }

    // Навігація
    navigateTo(path) {
        this.speak('Переходжу на іншу сторінку');
        window.location.href = path;
    }

    // Допоміжні функції
    showVoiceHelp() {
        const helpText = `
        Доступні команди:
        - Створити ліфт
        - Згенерувати QR код  
        - Запланувати інспекцію
        - Показати ліфти
        - Відкрити аналітику
        - Допомога
        `;
        
        this.speak('Показую список команд');
        this.showHelpModal(helpText);
    }

    listCapabilities() {
        this.speak('Я можу створювати ліфти, генерувати QR коди, планувати інспекції та допомагати з навігацією по системі');
    }

    // Управління голосом
    startListening() {
        if (!this.recognition) {
            this.speak('Голосове управління недоступне');
            return;
        }

        if (this.isListening) {
            this.speak('Я вже слухаю');
            return;
        }

        this.recognition.start();
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.speak('Голосове управління зупинено');
        }
    }

    speak(text, options = {}) {
        if (!this.synthesis) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.currentLanguage;
        utterance.rate = options.rate || 1;
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 0.8;

        // logger.log('🔊 Промовляю:', text);
        this.synthesis.speak(utterance);

        if (window.eventBus) {
            eventBus.emit('voice:speech-output', { 
                text: text, 
                language: this.currentLanguage 
            }, { source: 'voice-control' });
        }
    }

    // UI елементи
    showListeningIndicator() {
        let indicator = document.getElementById('voiceListeningIndicator');
        if (!indicator) {
            indicator = this.createListeningIndicator();
            document.body.appendChild(indicator);
        }
        indicator.style.display = 'flex';
    }

    hideListeningIndicator() {
        const indicator = document.getElementById('voiceListeningIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    createListeningIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'voiceListeningIndicator';
        indicator.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 25px;
                border-radius: 25px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                z-index: 10000;
                display: none;
                align-items: center;
                gap: 10px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            ">
                <div class="voice-pulse" style="
                    width: 12px;
                    height: 12px;
                    background: #ff6b6b;
                    border-radius: 50%;
                    animation: voicePulse 1.5s infinite;
                "></div>
                <span>🎤 Слухаю...</span>
            </div>
            
            <style>
                @keyframes voicePulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.3); }
                    100% { opacity: 1; transform: scale(1); }
                }
            </style>
        `;
        return indicator;
    }

    updateTranscriptDisplay(final, interim) {
        let display = document.getElementById('voiceTranscriptDisplay');
        if (!display && (final || interim)) {
            display = this.createTranscriptDisplay();
            document.body.appendChild(display);
        }
        
        if (display) {
            display.innerHTML = `
                <div style="margin-bottom: 10px;"><strong>Розпізнано:</strong> ${final}</div>
                <div style="color: #888; font-style: italic;">${interim}</div>
            `;
            
            if (final && !interim) {
                setTimeout(() => {
                    display.style.display = 'none';
                }, 3000);
            } else {
                display.style.display = 'block';
            }
        }
    }

    createTranscriptDisplay() {
        const display = document.createElement('div');
        display.id = 'voiceTranscriptDisplay';
        display.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(255, 255, 255, 0.95);
            padding: 15px;
            border-radius: 10px;
            border-left: 4px solid #007bff;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 9999;
            max-width: 300px;
            font-size: 14px;
            display: none;
        `;
        return display;
    }

    showHelpModal(content) {
        // Створюємо модальне вікно з командами
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="modal fade" id="voiceHelpModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">🎤 Голосові команди</h5>
                            <button type="button" class="close" data-dismiss="modal">
                                <span>&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <pre style="white-space: pre-wrap; font-family: inherit;">${content}</pre>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" onclick="window.voiceControl.speak('Команди показано')">
                                🔊 Озвучити
                            </button>
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Закрити</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        $('#voiceHelpModal').modal('show');
        
        // Видаляємо модал після закриття
        $('#voiceHelpModal').on('hidden.bs.modal', function () {
            modal.remove();
        });
    }

    // EventBus інтеграція
    setupEventBusIntegration() {
        if (!window.eventBus) return;

        // logger.log('📡 Налаштування EventBus для Voice Control...');

        // Слухаємо створення ліфтів для голосового підтвердження
        eventBus.on('lift:created', (data) => {
            this.speak(`Ліфт ${data.municipalNumber || data.name} успішно створено`);
        }, { module: 'voice-control' });

        // Слухаємо генерацію QR кодів
        eventBus.on('qr:generated', (data) => {
            this.speak(`QR код для ліфта ${data.municipalNumber} згенеровано`);
        }, { module: 'voice-control' });

        // Слухаємо планування інспекцій
        eventBus.on('inspection:scheduled', (data) => {
            this.speak(`Інспекцію заплановано на ${new Date(data.date).toLocaleDateString('uk-UA')}`);
        }, { module: 'voice-control' });

        // logger.log('✅ EventBus інтеграція для Voice Control налаштована');
    }

    // Додаткові методи
    changeLanguage() {
        const languages = ['uk-UA', 'en-US', 'ru-RU'];
        const currentIndex = languages.indexOf(this.currentLanguage);
        const nextIndex = (currentIndex + 1) % languages.length;
        
        this.currentLanguage = languages[nextIndex];
        if (this.recognition) {
            this.recognition.lang = this.currentLanguage;
        }
        
        this.speak(`Мову змінено на ${this.currentLanguage}`);
    }

    // Публічні методи для інтеграції
    addCustomCommand(command, handler) {
        this.commands.set(command.toLowerCase(), handler);
        // logger.log(`➕ Додано голосову команду: "${command}"`);
    }

    removeCommand(command) {
        this.commands.delete(command.toLowerCase());
        // logger.log(`➖ Видалено голосову команду: "${command}"`);
    }

    setContext(context) {
        this.contextMode = context;
        // logger.log(`🎯 Контекст змінено на: ${context}`);
    }

    getCurrentCommands() {
        return Array.from(this.commands.keys());
    }
}

// Експорт та автоініціалізація
if (typeof window !== 'undefined') {
    window.DeapSeaKVoiceControl = DeapSeaKVoiceControl;
    
    // Автоматичне створення інстансу після завантаження EventBus
    if (window.eventBus) {
        window.voiceControl = new DeapSeaKVoiceControl();
    } else {
        // Чекаємо EventBus
        setTimeout(() => {
            if (window.eventBus) {
                window.voiceControl = new DeapSeaKVoiceControl();
            }
        }, 2000);
    }
}

// logger.log('🎤 Voice Control модуль завантажено!');