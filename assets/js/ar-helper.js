/**
 * 🥽 AR Helper System для DeapSeaK
 * Система доповненої реальності для інтерактивної допомоги
 */

class DeapSeaKARHelper {
    constructor() {
        this.isARActive = false;
        this.arOverlay = null;
        this.arElements = new Map();
        this.currentStep = 0;
        this.arMode = 'guide'; // guide, inspection, qr-scan, lift-visualization
        this.camera = null;
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        // logger.log('🥽 Ініціалізація AR Helper системи...');
        
        if (!this.checkARSupport()) {
            // logger.warn('⚠️ AR не підтримується цим пристроєм/браузером');
            this.initFallbackMode();
            return false;
        }

        await this.setupAREnvironment();
        this.setupEventBusIntegration();
        this.createARInterface();
        
        this.isInitialized = true;
        // logger.log('✅ AR Helper готовий!');
        return true;
    }

    checkARSupport() {
        // Перевіряємо підтримку камери та WebRTC
        return !!(navigator.mediaDevices && 
                 navigator.mediaDevices.getUserMedia && 
                 window.MediaRecorder);
    }

    async setupAREnvironment() {
        try {
            // Отримуємо доступ до камери
            this.camera = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment', // Задня камера для AR
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });
            
            // logger.log('📹 Камера підключена для AR');
            return true;
        } catch (error) {
            // logger.error('❌ Помилка доступу до камери:', error);
            return false;
        }
    }

    createARInterface() {
        // Створюємо AR оверлей
        this.arOverlay = document.createElement('div');
        this.arOverlay.id = 'arOverlay';
        this.arOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 100000;
            display: none;
            flex-direction: column;
        `;

        this.arOverlay.innerHTML = `
            <!-- AR Camera View -->
            <div id="arCameraContainer" style="flex: 1; position: relative; overflow: hidden;">
                <video id="arCamera" autoplay playsinline muted style="
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                "></video>
                
                <!-- AR UI Elements Overlay -->
                <div id="arUIOverlay" style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                ">
                    <!-- AR елементи будуть додаватися тут -->
                </div>
                
                <!-- AR Instructions -->
                <div id="arInstructions" style="
                    position: absolute;
                    bottom: 120px;
                    left: 20px;
                    right: 20px;
                    background: rgba(0, 0, 0, 0.7);
                    color: white;
                    padding: 15px;
                    border-radius: 10px;
                    font-size: 16px;
                    text-align: center;
                ">
                    <div id="arInstructionText">Наведіть камеру на QR код ліфта</div>
                    <div id="arStepCounter" style="font-size: 12px; margin-top: 5px;">
                        Крок <span id="currentStep">1</span> з <span id="totalSteps">3</span>
                    </div>
                </div>
            </div>

            <!-- AR Controls -->
            <div id="arControls" style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
            ">
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button id="arScanQR" class="ar-btn ar-btn-primary">
                        📷 Сканувати QR
                    </button>
                    <button id="arGuideMode" class="ar-btn ar-btn-secondary">
                        🎯 Гід по системі
                    </button>
                    <button id="arInspectionMode" class="ar-btn ar-btn-warning">
                        🔍 AR Інспекція
                    </button>
                    <button id="ar3DVisualization" class="ar-btn ar-btn-info">
                        🏢 3D Візуалізація
                    </button>
                </div>
                
                <div style="display: flex; gap: 10px; align-items: center;">
                    <div id="arStatus" style="
                        color: #4CAF50;
                        font-size: 14px;
                        display: flex;
                        align-items: center;
                        gap: 5px;
                    ">
                        <div class="ar-pulse"></div>
                        AR активний
                    </div>
                    <button id="arVoiceToggle" class="ar-btn ar-btn-voice">
                        🎤
                    </button>
                    <button id="arCloseBtn" class="ar-btn ar-btn-close">
                        ❌ Закрити
                    </button>
                </div>
            </div>

            <!-- AR Styles -->
            <style>
                .ar-btn {
                    padding: 10px 15px;
                    border: none;
                    border-radius: 25px;
                    color: white;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    white-space: nowrap;
                }
                
                .ar-btn-primary { background: #007bff; }
                .ar-btn-secondary { background: #6c757d; }
                .ar-btn-warning { background: #ffc107; color: #000; }
                .ar-btn-info { background: #17a2b8; }
                .ar-btn-voice { background: #28a745; border-radius: 50%; width: 45px; height: 45px; }
                .ar-btn-close { background: #dc3545; }
                
                .ar-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                }
                
                .ar-pulse {
                    width: 8px;
                    height: 8px;
                    background: #4CAF50;
                    border-radius: 50%;
                    animation: arPulse 2s infinite;
                }
                
                @keyframes arPulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.5); }
                    100% { opacity: 1; transform: scale(1); }
                }

                .ar-element {
                    position: absolute;
                    pointer-events: auto;
                    background: rgba(0, 123, 255, 0.9);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    border: 2px solid #007bff;
                    animation: arElementFade 0.5s ease-in;
                }
                
                @keyframes arElementFade {
                    from { opacity: 0; transform: scale(0.5); }
                    to { opacity: 1; transform: scale(1); }
                }

                .ar-highlight {
                    border: 3px solid #ff6b6b;
                    border-radius: 10px;
                    background: rgba(255, 107, 107, 0.2);
                    animation: arHighlightPulse 1.5s infinite;
                }
                
                @keyframes arHighlightPulse {
                    0%, 100% { border-color: #ff6b6b; }
                    50% { border-color: #4ecdc4; }
                }
            </style>
        `;

        document.body.appendChild(this.arOverlay);
        this.setupARControls();
    }

    setupARControls() {
        // QR сканування
        document.getElementById('arScanQR').addEventListener('click', () => {
            this.startQRScanning();
        });

        // Режим гіда
        document.getElementById('arGuideMode').addEventListener('click', () => {
            this.startGuidedTour();
        });

        // AR інспекція
        document.getElementById('arInspectionMode').addEventListener('click', () => {
            this.startARInspection();
        });

        // 3D візуалізація
        document.getElementById('ar3DVisualization').addEventListener('click', () => {
            this.start3DVisualization();
        });

        // Голосове управління в AR
        document.getElementById('arVoiceToggle').addEventListener('click', () => {
            this.toggleVoiceInAR();
        });

        // Закрити AR
        document.getElementById('arCloseBtn').addEventListener('click', () => {
            this.closeAR();
        });
    }

    // Запуск AR режимів
    async startAR(mode = 'guide') {
        if (!this.isInitialized) {
            // logger.warn('⚠️ AR Helper не ініціалізований');
            return false;
        }

        this.arMode = mode;
        this.arOverlay.style.display = 'flex';
        this.isARActive = true;

        // Підключаємо відео потік
        const video = document.getElementById('arCamera');
        if (this.camera && video) {
            video.srcObject = this.camera;
        }

        // Запускаємо відповідний режим
        switch (mode) {
            case 'qr-scan':
                this.startQRScanning();
                break;
            case 'guide':
                this.startGuidedTour();
                break;
            case 'inspection':
                this.startARInspection();
                break;
            case '3d-visualization':
                this.start3DVisualization();
                break;
        }

        if (window.eventBus) {
            eventBus.emit('ar:started', { mode: mode }, { source: 'ar-helper' });
        }

        return true;
    }

    startQRScanning() {
        this.arMode = 'qr-scan';
        this.updateInstructions('Наведіть камеру на QR код ліфта для сканування', 1, 1);
        
        // Симуляція QR сканування (в реальному проекті тут буде бібліотека QR сканування)
        setTimeout(() => {
            this.simulateQRDetection();
        }, 3000);
    }

    startGuidedTour() {
        this.arMode = 'guide';
        this.currentStep = 1;
        const steps = [
            'Ласкаво просимо до AR гіда по системі DeapSeaK',
            'Наведіть камеру на область екрану для інтерактивних підказок',
            'Використовуйте голосові команди або кнопки для навігації'
        ];
        
        this.runGuidedSteps(steps);
    }

    startARInspection() {
        this.arMode = 'inspection';
        this.updateInstructions('AR Інспекція: наведіть камеру на компоненти ліфта для перевірки', 1, 5);
        
        // Показуємо AR елементи для інспекції
        this.showInspectionElements();
    }

    start3DVisualization() {
        this.arMode = '3d-visualization';
        this.updateInstructions('3D Візуалізація: переглядайте 3D модель ліфта в доповненій реальності', 1, 1);
        
        // Показуємо 3D елементи
        this.show3DElements();
    }

    // AR елементи та інтерактивність
    addARElement(id, x, y, content, type = 'info') {
        const element = document.createElement('div');
        element.id = `ar-${id}`;
        element.className = `ar-element ar-element-${type}`;
        element.style.left = `${x}%`;
        element.style.top = `${y}%`;
        element.innerHTML = content;
        
        // Додаємо інтерактивність
        element.addEventListener('click', () => {
            this.handleARElementClick(id, type);
        });
        
        document.getElementById('arUIOverlay').appendChild(element);
        this.arElements.set(id, element);
        
        return element;
    }

    removeARElement(id) {
        const element = this.arElements.get(id);
        if (element) {
            element.remove();
            this.arElements.delete(id);
        }
    }

    clearARElements() {
        this.arElements.forEach((element, id) => {
            element.remove();
        });
        this.arElements.clear();
    }

    handleARElementClick(id, type) {
        // logger.log('🎯 AR елемент натиснуто:', id, type);
        
        if (window.eventBus) {
            eventBus.emit('ar:element-clicked', { 
                elementId: id, 
                type: type,
                mode: this.arMode 
            }, { source: 'ar-helper' });
        }

        // Голосова реакція
        if (window.voiceControl) {
            voiceControl.speak(`Елемент ${id} активовано`);
        }
    }

    // Спеціальні AR режими
    simulateQRDetection() {
        // Імітуємо знаходження QR коду
        const qrOverlay = document.createElement('div');
        qrOverlay.style.cssText = `
            position: absolute;
            left: 40%;
            top: 30%;
            width: 20%;
            height: 20%;
            border: 3px solid #4CAF50;
            border-radius: 10px;
            background: rgba(76, 175, 80, 0.2);
            animation: arHighlightPulse 1.5s infinite;
        `;
        
        document.getElementById('arUIOverlay').appendChild(qrOverlay);
        
        this.updateInstructions('QR код знайдено! Зчитування даних...', 1, 1);
        
        setTimeout(() => {
            qrOverlay.remove();
            this.addARElement('qr-info', 45, 55, `
                <strong>Ліфт #12345</strong><br>
                📍 вул. Хрещатик, 1<br>
                ✅ Статус: Активний<br>
                <button onclick="window.arHelper.openLiftDetails('12345')" style="
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 15px;
                    margin-top: 5px;
                    cursor: pointer;
                ">Детальніше</button>
            `, 'qr-result');
            
            this.updateInstructions('QR код успішно розпізнано!', 1, 1);
            
            if (window.eventBus) {
                eventBus.emit('ar:qr-scanned', { 
                    liftId: '12345',
                    address: 'вул. Хрещатик, 1',
                    status: 'active'
                }, { source: 'ar-helper' });
            }
        }, 2000);
    }

    showInspectionElements() {
        // Показуємо елементи для AR інспекції
        this.addARElement('motor', 20, 20, '🔧 Двигун<br>Стан: Норма', 'inspection');
        this.addARElement('cables', 80, 30, '🔗 Троси<br>Потребує перевірки', 'warning');
        this.addARElement('brakes', 60, 70, '🛑 Гальма<br>Стан: Відмінно', 'inspection');
        this.addARElement('doors', 30, 80, '🚪 Двері<br>Калібрування потрібне', 'warning');
    }

    show3DElements() {
        // Показуємо 3D елементи (спрощений варіант)
        this.addARElement('3d-shaft', 50, 40, `
            <div style="text-align: center;">
                🏢 3D Модель шахти<br>
                <div style="
                    width: 60px;
                    height: 80px;
                    background: linear-gradient(to bottom, #87CEEB, #4682B4);
                    margin: 5px auto;
                    border-radius: 5px;
                    position: relative;
                    animation: float 2s ease-in-out infinite;
                ">
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 40px;
                        height: 20px;
                        background: #FFD700;
                        border-radius: 3px;
                    "></div>
                </div>
            </div>
            
            <style>
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            </style>
        `, '3d-model');
    }

    runGuidedSteps(steps) {
        if (this.currentStep <= steps.length) {
            this.updateInstructions(steps[this.currentStep - 1], this.currentStep, steps.length);
            
            // Показуємо AR елементи для поточного кроку
            this.showGuidedStepElements(this.currentStep);
            
            setTimeout(() => {
                this.currentStep++;
                if (this.currentStep <= steps.length) {
                    this.runGuidedSteps(steps);
                } else {
                    this.updateInstructions('AR гід завершено! Використовуйте кнопки для інших функцій.', steps.length, steps.length);
                }
            }, 5000);
        }
    }

    showGuidedStepElements(step) {
        this.clearARElements();
        
        switch (step) {
            case 1:
                this.addARElement('welcome', 50, 20, '👋 Привіт! Це AR система DeapSeaK', 'welcome');
                break;
            case 2:
                this.addARElement('feature1', 25, 40, '📱 Сканування QR', 'feature');
                this.addARElement('feature2', 75, 60, '🔍 AR Інспекція', 'feature');
                break;
            case 3:
                this.addARElement('voice', 50, 50, '🎤 Скажіть "допомога" для команд', 'voice');
                break;
        }
    }

    // Голосове управління в AR
    toggleVoiceInAR() {
        if (window.voiceControl) {
            if (voiceControl.isListening) {
                voiceControl.stopListening();
                document.getElementById('arVoiceToggle').style.background = '#28a745';
            } else {
                voiceControl.startListening();
                voiceControl.setContext(`ar-${this.arMode}`);
                document.getElementById('arVoiceToggle').style.background = '#dc3545';
                
                // Додаємо AR-специфічні команди
                this.setupARVoiceCommands();
            }
        } else {
            alert('Голосове управління недоступне');
        }
    }

    setupARVoiceCommands() {
        if (!window.voiceControl) return;
        
        // Додаємо AR команди
        voiceControl.addCustomCommand('сканувати qr', () => this.startQRScanning());
        voiceControl.addCustomCommand('почати гід', () => this.startGuidedTour());
        voiceControl.addCustomCommand('інспекція', () => this.startARInspection());
        voiceControl.addCustomCommand('показати 3d', () => this.start3DVisualization());
        voiceControl.addCustomCommand('закрити ar', () => this.closeAR());
        voiceControl.addCustomCommand('наступний крок', () => {
            if (this.arMode === 'guide') {
                this.currentStep++;
                this.runGuidedSteps(['Наступний крок активовано']);
            }
        });
    }

    // Утиліти
    updateInstructions(text, current = 1, total = 1) {
        document.getElementById('arInstructionText').textContent = text;
        document.getElementById('currentStep').textContent = current;
        document.getElementById('totalSteps').textContent = total;
    }

    openLiftDetails(liftId) {
        // Відкриваємо деталі ліфта
        if (window.eventBus) {
            eventBus.emit('ar:lift-details-requested', { liftId: liftId }, { source: 'ar-helper' });
        }
        
        alert(`Відкриваю деталі ліфта ${liftId}`);
        // Тут може бути навігація до сторінки ліфта
    }

    closeAR() {
        this.isARActive = false;
        this.arOverlay.style.display = 'none';
        this.clearARElements();
        
        // Зупиняємо камеру
        if (this.camera) {
            this.camera.getTracks().forEach(track => track.stop());
        }
        
        if (window.eventBus) {
            eventBus.emit('ar:closed', { mode: this.arMode }, { source: 'ar-helper' });
        }

        // logger.log('🥽 AR режим закрито');
    }

    // Fallback режим для пристроїв без AR
    initFallbackMode() {
        // logger.log('📱 Ініціалізація fallback режиму (без AR)');
        
        // Створюємо спрощений інтерфейс
        this.createFallbackInterface();
        this.isInitialized = true;
    }

    createFallbackInterface() {
        const fallbackBtn = document.createElement('button');
        fallbackBtn.innerHTML = '🔍 Smart Helper';
        fallbackBtn.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 25px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            cursor: pointer;
            z-index: 1000;
            font-size: 14px;
            transition: transform 0.3s ease;
        `;
        
        fallbackBtn.addEventListener('click', () => {
            this.showSmartHelperModal();
        });
        
        fallbackBtn.addEventListener('mouseenter', () => {
            fallbackBtn.style.transform = 'translateY(-3px)';
        });
        
        fallbackBtn.addEventListener('mouseleave', () => {
            fallbackBtn.style.transform = 'translateY(0)';
        });
        
        document.body.appendChild(fallbackBtn);
    }

    showSmartHelperModal() {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="modal fade show" style="display: block; background: rgba(0,0,0,0.5);">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">🔍 Smart Helper</h5>
                            <button type="button" class="close" onclick="this.closest('.modal').remove()">
                                <span>&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <p>AR не підтримується, але ви можете використовувати Smart Helper функції:</p>
                            
                            <div class="list-group">
                                <a href="#" class="list-group-item list-group-item-action" onclick="window.arHelper.simulateQRScan()">
                                    📷 Симуляція QR сканування
                                </a>
                                <a href="#" class="list-group-item list-group-item-action" onclick="window.arHelper.showInteractiveGuide()">
                                    🎯 Інтерактивний гід
                                </a>
                                <a href="#" class="list-group-item list-group-item-action" onclick="window.arHelper.showInspectionHelp()">
                                    🔍 Допомога з інспекціями
                                </a>
                                <a href="#" class="list-group-item list-group-item-action" onclick="window.arHelper.show3DPreview()">
                                    🏢 3D Попередній перегляд
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        setTimeout(() => modal.remove(), 30000); // Auto close after 30s
    }

    // Fallback методи
    simulateQRScan() {
        alert('🔍 QR Сканер: Ліфт #12345 знайдено!\n📍 Адреса: вул. Хрещатик, 1\n✅ Статус: Активний');
        
        if (window.eventBus) {
            eventBus.emit('ar:qr-simulated', { liftId: '12345' }, { source: 'ar-helper-fallback' });
        }
    }

    showInteractiveGuide() {
        const steps = [
            'Крок 1: Створення ліфта - використовуйте кнопку "Додати ліфт"',
            'Крок 2: Генерація QR - автоматично створюється при збереженні',
            'Крок 3: Планування інспекції - встановіть дати і налаштування'
        ];
        
        alert('🎯 Інтерактивний гід:\n\n' + steps.join('\n\n'));
    }

    showInspectionHelp() {
        alert('🔍 Допомога з інспекціями:\n\n• Перевірте двигун ліфта\n• Оцініть стан тросів\n• Протестуйте гальмівну систему\n• Перевірте роботу дверей');
    }

    show3DPreview() {
        alert('🏢 3D Попередній перегляд недоступний без AR.\n\nСкористайтеся картою ліфтів для візуалізації розташування.');
    }

    // EventBus інтеграція
    setupEventBusIntegration() {
        if (!window.eventBus) return;

        // logger.log('📡 Налаштування EventBus для AR Helper...');

        // Слухаємо створення ліфтів для AR сповіщень
        eventBus.on('lift:created', (data) => {
            if (this.isARActive) {
                this.addARElement('lift-created', 50, 10, 
                    `✅ Ліфт ${data.municipalNumber} створено!`, 'success');
                
                setTimeout(() => {
                    this.removeARElement('lift-created');
                }, 3000);
            }
        }, { module: 'ar-helper' });

        // Слухаємо QR події
        eventBus.on('qr:generated', (data) => {
            if (this.isARActive && this.arMode === 'qr-scan') {
                this.updateInstructions(`QR код для ліфта ${data.municipalNumber || 'невідомо'} згенеровано!`, 1, 1);
            }
        }, { module: 'ar-helper' });

        // logger.log('✅ EventBus інтеграція для AR Helper налаштована');
    }
}

// Експорт та автоініціалізація
// Система управління AR Helper
class ARHelperManager {
    constructor() {
        this.arHelper = null;
        this.checkUserSettings();
    }
    
    checkUserSettings() {
        // Перевіряємо налаштування користувача
        const settings = this.loadSettings();
        // logger.log('⚙️ Перевірка налаштувань AR Helper:', settings);
        
        if (settings.arHelper) {
            this.initializeAR();
        } else {
            // logger.log('🥽 AR Helper вимкнено в налаштуваннях');
            this.createDisabledState();
        }
    }
    
    loadSettings() {
        const defaultSettings = { arHelper: false }; // По замовчуванню вимкнено
        
        try {
            const saved = localStorage.getItem('deapseak_settings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (error) {
            // logger.warn('⚠️ Помилка читання налаштувань:', error);
            return defaultSettings;
        }
    }
    
    async initializeAR() {
        try {
            // logger.log('🥽 Ініціалізація AR Helper...');
            this.arHelper = new DeapSeaKARHelper();
            window.arHelper = this.arHelper;
            
            // Перевіряємо чи AR готовий
            if (this.arHelper.isInitialized) {
                this.updateARButton(true);
            }
        } catch (error) {
            // logger.error('❌ Помилка ініціалізації AR Helper:', error);
            this.createFallbackState();
        }
    }
    
    createDisabledState() {
        // Створюємо заглушку для AR кнопки
        setTimeout(() => {
            const arBtn = document.getElementById('ar-helper-btn');
            if (arBtn) {
                arBtn.title = 'AR Helper вимкнено в налаштуваннях';
                arBtn.innerHTML = '<i class="fas fa-cog"></i> Налаштування';
                arBtn.onclick = () => {
                    this.showSettingsPrompt();
                };
                arBtn.classList.remove('btn-info');
                arBtn.classList.add('btn-secondary');
            }
        }, 500);
    }
    
    createFallbackState() {
        setTimeout(() => {
            const arBtn = document.getElementById('ar-helper-btn');
            if (arBtn) {
                arBtn.title = 'Smart Helper (AR недоступний)';
                arBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Smart';
                arBtn.onclick = () => {
                    this.showSmartHelper();
                };
            }
        }, 500);
    }
    
    updateARButton(enabled) {
        setTimeout(() => {
            const arBtn = document.getElementById('ar-helper-btn');
            if (arBtn && enabled) {
                arBtn.title = 'AR Helper готовий!';
                arBtn.style.borderColor = '#4CAF50';
                arBtn.onclick = () => {
                    if (this.arHelper) {
                        this.arHelper.startAR('guide');
                    }
                };
            }
        }, 500);
    }
    
    showSettingsPrompt() {
        const result = confirm('AR Helper вимкнено в налаштуваннях.\n\nВи хочете перейти до налаштувань щоб увімкнути AR?');
        if (result) {
            window.open('system-settings.html', '_blank');
        }
    }
    
    showSmartHelper() {
        if (!this.arHelper) {
            // Створюємо тимчасовий fallback інстанс
            this.arHelper = new DeapSeaKARHelper();
            this.arHelper.initFallbackMode();
        }
        this.arHelper.showSmartHelperModal();
    }
    
    // Публічні методи для управління AR
    enableAR() {
        if (!this.arHelper) {
            this.initializeAR();
        }
        this.updateARButton(true);
    }
    
    disableAR() {
        if (this.arHelper && this.arHelper.isARActive) {
            this.arHelper.closeAR();
        }
        this.arHelper = null;
        window.arHelper = null;
        this.createDisabledState();
    }
}

if (typeof window !== 'undefined') {
    window.DeapSeaKARHelper = DeapSeaKARHelper;
    window.ARHelperManager = ARHelperManager;
    
    // Ініціалізуємо менеджер AR Helper (він сам перевірить налаштування)
    setTimeout(() => {
        window.arHelperManager = new ARHelperManager();
        
        // Глобальні функції для налаштувань
        window.enableARHelper = () => window.arHelperManager.enableAR();
        window.disableARHelper = () => window.arHelperManager.disableAR();
        
    }, 1000);
}

// logger.log('🥽 AR Helper модуль завантажено! (Controlled by settings)');