/**
 * DeapSeaK Voice Interface
 * ========================
 * 
 * Повнофункціональний голосовий інтерфейс з підтримкою української мови
 */

class VoiceInterface {
    constructor() {
        this.recognition = null;
        this.synthesis = null;
        this.isListening = false;
        this.isSupported = false;
        this.language = 'pt-PT';
        this.voiceCommands = new Map();
        
        // Налаштування
        this.settings = {
            continuous: true,
            interimResults: true,
            maxAlternatives: 3,
            voiceRate: 0.9,
            voicePitch: 1,
            voiceVolume: 0.8
        };
        
        this.init();
    }
    
    init() {
        try {
            // Перевірка підтримки браузера
            this.checkSupport();
            
            if (this.isSupported) {
                this.initSpeechRecognition();
                this.initSpeechSynthesis();
                this.initVoiceCommands();
                
                console.log('🎤 Голосовий інтерфейс ініціалізовано');
            } else {
                console.warn('⚠️ Голосовий інтерфейс не підтримується браузером');
            }
            
        } catch (error) {
            console.error('Помилка ініціалізації голосового інтерфейсу:', error);
        }
    }
    
    checkSupport() {
        // Перевірка Speech Recognition API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.isSupported = true;
        }
        
        // Перевірка Speech Synthesis API
        if ('speechSynthesis' in window) {
            this.synthesis = window.speechSynthesis;
        } else {
            this.isSupported = false;
        }
        
        console.log(`🔍 Підтримка голосового інтерфейсу: ${this.isSupported ? 'ТАК' : 'НІ'}`);
    }
    
    initSpeechRecognition() {
        if (!this.recognition) return;
        
        // Налаштування розпізнавання
        this.recognition.lang = this.language;
        this.recognition.continuous = this.settings.continuous;
        this.recognition.interimResults = this.settings.interimResults;
        this.recognition.maxAlternatives = this.settings.maxAlternatives;
        
        // Обробники подій
        this.recognition.onstart = () => {
            this.isListening = true;
            this.onListeningStart();
            console.log('🎤 Слухаю...');
        };
        
        this.recognition.onresult = (event) => {
            this.handleSpeechResult(event);
        };
        
        this.recognition.onerror = (event) => {
            console.error('Помилка розпізнавання мови:', event.error);
            this.onError(event.error);
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            this.onListeningEnd();
            console.log('🔇 Припинено слухання');
        };
    }
    
    initSpeechSynthesis() {
        if (!this.synthesis) return;
        
        // Очікування завантаження голосів
        if (this.synthesis.getVoices().length === 0) {
            this.synthesis.addEventListener('voiceschanged', () => {
                this.loadAvailableVoices();
            });
        } else {
            this.loadAvailableVoices();
        }
    }
    
    loadAvailableVoices() {
        const voices = this.synthesis.getVoices();
        
        // Пошук українського голосу
        this.ukrainianVoice = voices.find(voice => 
            voice.lang.startsWith('uk') || 
            voice.name.toLowerCase().includes('ukrainian')
        );
        
        // Якщо українського немає, використати російський
        if (!this.ukrainianVoice) {
            this.ukrainianVoice = voices.find(voice => 
                voice.lang.startsWith('ru')
            );
        }
        
        // Якщо і російського немає, використати англійський
        if (!this.ukrainianVoice) {
            this.ukrainianVoice = voices.find(voice => 
                voice.lang.startsWith('en')
            );
        }
        
        console.log(`🗣️ Обрано голос: ${this.ukrainianVoice?.name || 'За замовчуванням'}`);
    }
    
    initVoiceCommands() {
        // Базові команди системи
        this.addVoiceCommand(['допомога', 'help', 'хелп'], () => {
            this.speak('Доступні команди: створити заявку, показати ліфти, статистика, налаштування, вийти');
        });
        
        this.addVoiceCommand(['створити заявку', 'нова заявка', 'create request'], () => {
            this.executeCommand('create_request');
        });
        
        this.addVoiceCommand(['показати ліфти', 'ліфти', 'show lifts'], () => {
            this.executeCommand('show_lifts');
        });
        
        this.addVoiceCommand(['статистика', 'stats', 'dashboard'], () => {
            this.executeCommand('show_dashboard');
        });
        
        this.addVoiceCommand(['налаштування', 'settings', 'конфігурація'], () => {
            this.executeCommand('open_settings');
        });
        
        this.addVoiceCommand(['вихід', 'exit', 'logout', 'вийти'], () => {
            this.executeCommand('logout');
        });
        
        // Навігаційні команди
        this.addVoiceCommand(['назад', 'back', 'повернутись'], () => {
            history.back();
        });
        
        this.addVoiceCommand(['головна', 'home', 'на головну'], () => {
            window.location.href = '/';
        });
        
        // AI асистент команди
        this.addVoiceCommand(['привіт', 'hello', 'hi', 'хай'], () => {
            this.speak('Привіт! Я ваш AI асистент DeapSeaK. Чим можу допомогти?');
        });
        
        this.addVoiceCommand(['дякую', 'thanks', 'спасибо'], () => {
            this.speak('Будь ласка! Завжди радий допомогти.');
        });
        
        console.log(`🎯 Зареєстровано ${this.voiceCommands.size} голосових команд`);
    }
    
    addVoiceCommand(phrases, callback) {
        phrases.forEach(phrase => {
            this.voiceCommands.set(phrase.toLowerCase(), callback);
        });
    }
    
    handleSpeechResult(event) {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            
            if (result.isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Відображення проміжного результату
        if (interimTranscript) {
            this.displayInterimResult(interimTranscript);
        }
        
        // Обробка фінального результату
        if (finalTranscript) {
            this.processFinalResult(finalTranscript.trim());
        }
    }
    
    processFinalResult(text) {
        console.log(`🎤 Розпізнано: "${text}"`);
        
        // Відображення результату
        this.displayFinalResult(text);
        
        // Обробка команди
        const command = this.findMatchingCommand(text.toLowerCase());
        
        if (command) {
            console.log(`⚡ Виконання команди для: "${text}"`);
            command();
        } else {
            // Відправка до AI асистента
            this.sendToAIAssistant(text);
        }
    }
    
    findMatchingCommand(text) {
        // Пошук точного збіgu
        if (this.voiceCommands.has(text)) {
            return this.voiceCommands.get(text);
        }
        
        // Пошук часткового збігу
        for (const [phrase, callback] of this.voiceCommands) {
            if (text.includes(phrase) || phrase.includes(text)) {
                return callback;
            }
        }
        
        return null;
    }
    
    async sendToAIAssistant(text) {
        try {
            // Показати, що обробляємо запит
            this.speak('Обробляю ваш запит...');
            
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: text,
                    voice: true
                })
            });
            
            const result = await response.json();
            
            if (result.response) {
                this.speak(result.response);
            } else {
                this.speak('Вибачте, не зміг обробити ваш запит');
            }
            
        } catch (error) {
            console.error('Помилка відправки до AI:', error);
            this.speak('Помилка зв\'язку з AI асистентом');
        }
    }
    
    speak(text, options = {}) {
        if (!this.synthesis) {
            console.log(`🗣️ [Голос відключено] ${text}`);
            return;
        }
        
        try {
            // Зупинка поточного синтезу
            this.synthesis.cancel();
            
            // Створення нового синтезу
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Налаштування голосу
            if (this.ukrainianVoice) {
                utterance.voice = this.ukrainianVoice;
            }
            
            utterance.rate = options.rate || this.settings.voiceRate;
            utterance.pitch = options.pitch || this.settings.voicePitch;
            utterance.volume = options.volume || this.settings.voiceVolume;
            
            // Обробники подій
            utterance.onstart = () => {
                this.onSpeakingStart();
            };
            
            utterance.onend = () => {
                this.onSpeakingEnd();
            };
            
            utterance.onerror = (error) => {
                console.error('Помилка синтезу мови:', error);
            };
            
            // Запуск синтезу
            this.synthesis.speak(utterance);
            
            console.log(`🗣️ Промовляю: "${text}"`);
            
        } catch (error) {
            console.error('Помилка голосового синтезу:', error);
        }
    }
    
    startListening() {
        if (!this.isSupported || !this.recognition) {
            this.speak('Голосовий інтерфейс не підтримується');
            return;
        }
        
        if (this.isListening) {
            console.log('🎤 Вже слухаю');
            return;
        }
        
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Помилка запуску розпізнавання:', error);
        }
    }
    
    stopListening() {
        if (!this.recognition || !this.isListening) {
            return;
        }
        
        try {
            this.recognition.stop();
        } catch (error) {
            console.error('Помилка зупинки розпізнавання:', error);
        }
    }
    
    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }
    
    executeCommand(commandType) {
        switch (commandType) {
            case 'create_request':
                if (typeof showCreateRequestModal === 'function') {
                    showCreateRequestModal();
                } else {
                    window.location.href = '/create-request';
                }
                break;
                
            case 'show_lifts':
                window.location.href = '/lifts';
                break;
                
            case 'show_dashboard':
                window.location.href = '/dashboard';
                break;
                
            case 'open_settings':
                if (typeof showSettingsModal === 'function') {
                    showSettingsModal();
                } else {
                    window.location.href = '/settings';
                }
                break;
                
            case 'logout':
                if (confirm('Ви дійсно хочете вийти?')) {
                    window.location.href = '/logout';
                }
                break;
                
            default:
                console.log('Невідома команда:', commandType);
        }
    }
    
    // UI колбеки (мають бути перевизначені)
    onListeningStart() {
        const micButton = document.getElementById('voice-button');
        if (micButton) {
            micButton.classList.add('listening');
            micButton.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        }
    }
    
    onListeningEnd() {
        const micButton = document.getElementById('voice-button');
        if (micButton) {
            micButton.classList.remove('listening');
            micButton.innerHTML = '<i class="fas fa-microphone"></i>';
        }
    }
    
    onSpeakingStart() {
        const speakerButton = document.getElementById('speaker-button');
        if (speakerButton) {
            speakerButton.classList.add('speaking');
        }
    }
    
    onSpeakingEnd() {
        const speakerButton = document.getElementById('speaker-button');
        if (speakerButton) {
            speakerButton.classList.remove('speaking');
        }
    }
    
    displayInterimResult(text) {
        const voiceDisplay = document.getElementById('voice-recognition-display');
        if (voiceDisplay) {
            voiceDisplay.innerHTML = `<span class="interim">${text}</span>`;
        }
    }
    
    displayFinalResult(text) {
        const voiceDisplay = document.getElementById('voice-recognition-display');
        if (voiceDisplay) {
            voiceDisplay.innerHTML = `<span class="final">${text}</span>`;
            
            // Очищення через 3 секунди
            setTimeout(() => {
                voiceDisplay.innerHTML = '';
            }, 3000);
        }
    }
    
    onError(error) {
        let message = 'Помилка розпізнавання мови';
        
        switch (error) {
            case 'no-speech':
                message = 'Не вдалося розпізнати мову';
                break;
            case 'audio-capture':
                message = 'Проблеми з мікрофоном';
                break;
            case 'not-allowed':
                message = 'Доступ до мікрофона заборонено';
                break;
            case 'network':
                message = 'Проблеми з мережею';
                break;
        }
        
        console.error(`❌ ${message}`);
        
        if (typeof showNotification === 'function') {
            showNotification(message, 'error');
        }
    }
    
    // Налаштування
    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings);
        
        if (this.recognition) {
            this.recognition.continuous = this.settings.continuous;
            this.recognition.interimResults = this.settings.interimResults;
            this.recognition.maxAlternatives = this.settings.maxAlternatives;
        }
        
        console.log('🔧 Налаштування голосового інтерфейсу оновлено');
    }
    
    // Отримання статистики
    getStats() {
        return {
            isSupported: this.isSupported,
            isListening: this.isListening,
            language: this.language,
            voiceCommandsCount: this.voiceCommands.size,
            currentVoice: this.ukrainianVoice?.name || 'За замовчуванням'
        };
    }
}

// Глобальний об'єкт голосового інтерфейсу
window.voiceInterface = null;

// Ініціалізація після завантаження DOM
document.addEventListener('DOMContentLoaded', () => {
    window.voiceInterface = new VoiceInterface();
    
    // Додавання кнопки голосового управління до інтерфейсу
    addVoiceControlButton();
});

function addVoiceControlButton() {
    // Перевірка, чи вже існує кнопка
    if (document.getElementById('voice-controls')) {
        return;
    }
    
    // Створення контейнера для голосового управління
    const voiceControls = document.createElement('div');
    voiceControls.id = 'voice-controls';
    voiceControls.className = 'voice-controls';
    voiceControls.innerHTML = `
        <button id="voice-button" class="btn btn-voice" title="Голосове управління">
            <i class="fas fa-microphone"></i>
        </button>
        <button id="speaker-button" class="btn btn-voice" title="Вимкнути голос" style="display: none;">
            <i class="fas fa-volume-up"></i>
        </button>
        <div id="voice-recognition-display" class="voice-display"></div>
    `;
    
    // Додавання стилів
    const style = document.createElement('style');
    style.textContent = `
        .voice-controls {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
        }
        
        .btn-voice {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            margin: 5px;
            background: #007bff;
            color: white;
            border: none;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        }
        
        .btn-voice:hover {
            background: #0056b3;
            transform: scale(1.1);
        }
        
        .btn-voice.listening {
            background: #dc3545;
            animation: pulse 1s infinite;
        }
        
        .btn-voice.speaking {
            background: #28a745;
            animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        .voice-display {
            position: absolute;
            bottom: 65px;
            right: 0;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            max-width: 200px;
            font-size: 14px;
            display: none;
        }
        
        .voice-display:not(:empty) {
            display: block;
        }
        
        .voice-display .interim {
            opacity: 0.7;
        }
        
        .voice-display .final {
            font-weight: bold;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(voiceControls);
    
    // Додавання обробників подій
    document.getElementById('voice-button').addEventListener('click', () => {
        if (window.voiceInterface) {
            window.voiceInterface.toggleListening();
        }
    });
    
    console.log('🎤 Кнопка голосового управління додана');
}

// Експорт для використання в інших модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceInterface;
}