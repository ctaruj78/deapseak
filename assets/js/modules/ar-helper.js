// ar-helper.js - РОЗШИРЕНИЙ AR ПОМІЧНИК
class ARHelper {
    constructor() {
        this.isARActive = false;
        this.currentModel = null;
        this.annotations = [];
        this.measurements = [];
        this.screenshots = [];
        this.activeTool = null;
        this.init();
    }

    init() {
        console.log('🏗️ Ініціалізація AR помічника...');
        this.loadUserInfo();
        this.loadLiftModels();
        this.setupEventListeners();
        this.setupComponentControls();
        this.checkARSupport();
        
        console.log('✅ AR помічник успішно ініціалізовано');
    }

    loadUserInfo() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser')) || { 
                firstName: 'Технік' 
            };
            $('#techName').text(currentUser.firstName);
        } catch (error) {
            console.error('Помилка завантаження даних користувача:', error);
        }
    }

    loadLiftModels() {
        this.models = {
            'model1': {
                name: 'Otis Gen2',
                manufacturer: 'Otis Elevator Company',
                year: '2023',
                components: ['motor', 'controlSystem', 'brakes', 'safetySystem', 'doors'],
                manualUrl: '../../docs/otis-gen2-manual.pdf',
                model3D: '../../models/otis-gen2.glb'
            },
            'model2': {
                name: 'Schindler 3300',
                manufacturer: 'Schindler Group',
                year: '2022',
                components: ['motor', 'controlSystem', 'brakes', 'doors', 'display'],
                manualUrl: '../../docs/schindler-3300-manual.pdf',
                model3D: '../../models/schindler-3300.glb'
            },
            'model3': {
                name: 'Kone MonoSpace',
                manufacturer: 'Kone Corporation',
                year: '2023',
                components: ['motor', 'controlSystem', 'brakes', 'safetySystem', 'emergency'],
                manualUrl: '../../docs/kone-monospace-manual.pdf',
                model3D: '../../models/kone-monospace.glb'
            },
            'model4': {
                name: 'Thyssenkrupp Evolution',
                manufacturer: 'Thyssenkrupp',
                year: '2024',
                components: ['motor', 'controlSystem', 'brakes', 'safetySystem', 'aiModule'],
                manualUrl: '../../docs/thyssenkrupp-evolution-manual.pdf',
                model3D: '../../models/thyssenkrupp-evolution.glb'
            },
            'model5': {
                name: 'Mitsubishi Electric',
                manufacturer: 'Mitsubishi Electric',
                year: '2023',
                components: ['motor', 'controlSystem', 'brakes', 'safetySystem', 'energySaver'],
                manualUrl: '../../docs/mitsubishi-electric-manual.pdf',
                model3D: '../../models/mitsubishi-electric.glb'
            },
            'model6': {
                name: 'Hyundai Elevator',
                manufacturer: 'Hyundai Elevator',
                year: '2022',
                components: ['motor', 'controlSystem', 'brakes', 'safetySystem', 'smartControl'],
                manualUrl: '../../docs/hyundai-elevator-manual.pdf',
                model3D: '../../models/hyundai-elevator.glb'
            }
        };
    }

    setupEventListeners() {
        // Кнопки AR
        $('#startAR, #startARBtn').on('click', () => this.toggleAR());
        
        // Вибір моделі
        $('#liftModelSelect').on('change', (e) => {
            this.changeModel(e.target.value);
        });

        // Інструменти
        $('#measureTool').on('click', () => this.toggleTool('measure'));
        $('#annotationTool').on('click', () => this.toggleTool('annotation'));
        $('#screenshotTool').on('click', () => this.takeScreenshot());
        $('#hotspotTool').on('click', () => this.toggleTool('hotspot'));

        // Подвійний клік по компоненту
        $(document).on('dblclick', '.component-item', (e) => {
            const componentId = $(e.currentTarget).data('component');
            this.showComponentInfo(componentId);
        });

        // Обробка клавіш
        $(document).on('keydown', (e) => {
            if (this.isARActive) {
                this.handleKeyboardShortcuts(e);
            }
        });
    }

    setupComponentControls() {
        // Динамічне оновлення компонентів при зміні моделі
        $('#liftModelSelect').on('change', (e) => {
            this.updateComponentList(e.target.value);
        });
    }

    updateComponentList(modelId) {
        const componentList = $('#componentList');
        componentList.empty();

        if (modelId && this.models[modelId]) {
            const model = this.models[modelId];
            
            model.components.forEach(componentId => {
                const componentInfo = this.getComponentInfo(componentId);
                const componentItem = `
                    <div class="component-item" data-component="${componentId}">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <i class="${componentInfo.icon} mr-2"></i>
                                <strong>${componentInfo.name}</strong>
                            </div>
                            <div class="component-status">
                                <span class="badge badge-success">Активний</span>
                            </div>
                        </div>
                        <small class="text-muted">${componentInfo.description}</small>
                    </div>
                `;
                componentList.append(componentItem);
            });
        } else {
            componentList.html(`
                <div class="text-center text-muted py-3">
                    <i class="fas fa-elevator fa-2x mb-2"></i>
                    <p>Оберіть модель ліфта</p>
                </div>
            `);
        }
    }

    checkARSupport() {
        const supported = this.isWebXRSupported() || this.isARJSSupported();
        if (!supported) {
            $('#startAR, #startARBtn').prop('disabled', true)
                .text('AR не підтримується')
                .removeClass('btn-primary').addClass('btn-secondary');
            
            this.showNotification('AR не підтримується на вашому пристрої', 'error');
        }
        return supported;
    }

    isWebXRSupported() {
        return 'xr' in navigator && navigator.xr && navigator.xr.isSessionSupported;
    }

    isARJSSupported() {
        return typeof AFRAME !== 'undefined' && typeof ARjs !== 'undefined';
    }

    async toggleAR() {
        if (this.isARActive) {
            await this.stopAR();
        } else {
            await this.startAR();
        }
    }

    async startAR() {
        try {
            if (!this.checkARSupport()) {
                this.showNotification('AR не підтримується на вашому пристрої', 'error');
                return;
            }

            // Перевірка дозволу камери
            if (!await this.requestCameraPermission()) {
                this.showNotification('Дозвіл камери не надано', 'error');
                return;
            }

            this.isARActive = true;
            this.updateARUI();

            // Ініціалізація AR середовища
            await this.initializeARScene();

            // Завантаження вибраної моделі
            const modelId = $('#liftModelSelect').val();
            if (modelId) {
                await this.loadModel(modelId);
            }

            this.showNotification('AR режим активовано 🚀', 'success');
            this.logAREvent('ar_session_start');

        } catch (error) {
            console.error('Помилка запуску AR:', error);
            this.showNotification('Помилка запуску AR: ' + error.message, 'error');
        }
    }

    async requestCameraPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment' 
                } 
            });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            return false;
        }
    }

    async initializeARScene() {
        try {
            // Приховуємо плейсхолдер
            $('#arPlaceholder').hide();
            $('#arScene').show();

            // Ініціалізація AR.js сцени
            if (typeof AFRAME !== 'undefined') {
                this.setupAFrameScene();
            }

            console.log('AR сцена ініціалізована');
        } catch (error) {
            throw new Error('Помилка ініціалізації AR сцени: ' + error.message);
        }
    }

    setupAFrameScene() {
        // Налаштування A-Frame сцени
        const scene = document.querySelector('a-scene');
        if (scene) {
            scene.addEventListener('loaded', () => {
                console.log('A-Frame сцена завантажена');
            });
        }
    }

    async loadModel(modelId) {
        if (!this.models[modelId]) {
            throw new Error('Модель не знайдена');
        }

        this.currentModel = this.models[modelId];
        
        // Імітація завантаження 3D моделі
        this.showNotification(`Завантаження моделі: ${this.currentModel.name}`, 'info');
        
        // Оновлення інтерфейсу
        this.updateComponentList(modelId);
        this.updateModelInfo();

        // Додаємо модель до AR сцени
        await this.addModelToScene(this.currentModel);

        this.logAREvent('model_loaded', { model: modelId });
    }

    async addModelToScene(model) {
        // Додавання 3D моделі до AR сцени
        console.log(`Додавання моделі до сцени: ${model.name}`);
        
        // У реальному додатку: завантаження GLB/GLTF моделі
        if (typeof AFRAME !== 'undefined') {
            this.loadAFrameModel(model);
        }
    }

    loadAFrameModel(model) {
        const scene = document.querySelector('a-scene');
        if (scene && model.model3D) {
            // Додаємо 3D модель до маркера
            const marker = document.querySelector('a-marker');
            if (marker) {
                const entity = document.createElement('a-entity');
                entity.setAttribute('gltf-model', model.model3D);
                entity.setAttribute('scale', '0.5 0.5 0.5');
                entity.setAttribute('position', '0 0 0');
                marker.appendChild(entity);
            }
        }
    }

    changeModel(modelId) {
        if (this.isARActive && modelId) {
            this.loadModel(modelId);
        } else {
            this.updateComponentList(modelId);
        }
    }

    toggleTool(toolType) {
        if (this.activeTool === toolType) {
            this.deactivateTool();
        } else {
            this.activateTool(toolType);
        }
    }

    activateTool(toolType) {
        this.deactivateTool();
        this.activeTool = toolType;

        // Активуємо візуально кнопку
        $(`#${toolType}Tool`).addClass('tool-active');
        
        switch (toolType) {
            case 'measure':
                this.activateMeasureTool();
                break;
            case 'annotation':
                this.activateAnnotationTool();
                break;
            case 'hotspot':
                this.activateHotspotTool();
                break;
        }

        this.showNotification(`${this.getToolName(toolType)} активовано`, 'info');
    }

    deactivateTool() {
        if (this.activeTool) {
            $(`#${this.activeTool}Tool`).removeClass('tool-active');
            
            switch (this.activeTool) {
                case 'measure':
                    this.deactivateMeasureTool();
                    break;
                case 'annotation':
                    this.deactivateAnnotationTool();
                    break;
                case 'hotspot':
                    this.deactivateHotspotTool();
                    break;
            }
            
            this.activeTool = null;
        }
    }

    activateMeasureTool() {
        console.log('Активація інструменту вимірювання');
        // Логіка вимірювання відстаней
    }

    activateAnnotationTool() {
        console.log('Активація інструменту анотацій');
        // Логіка додавання анотацій
    }

    activateHotspotTool() {
        console.log('Активація інструменту хот-спотів');
        // Логіка створення хот-спотів
    }

    getToolName(toolType) {
        const names = {
            'measure': 'Вимірювання',
            'annotation': 'Анотації',
            'hotspot': 'Хот-споти'
        };
        return names[toolType] || toolType;
    }

    async takeScreenshot() {
        try {
            if (!this.isARActive) {
                this.showNotification('Спочатку активуйте AR режим', 'warning');
                return;
            }

            const screenshot = {
                id: Date.now(),
                timestamp: new Date(),
                model: this.currentModel?.name,
                components: this.getSelectedComponents(),
                image: await this.captureARView()
            };

            this.screenshots.unshift(screenshot);
            this.saveScreenshot(screenshot);
            this.updateScreenshotsGallery();

            this.showNotification('Знімок збережено 📸', 'success');
            this.logAREvent('screenshot_taken');

        } catch (error) {
            console.error('Помилка знімка:', error);
            this.showNotification('Помилка при знімку', 'error');
        }
    }

    async captureARView() {
        // Захоплення поточного виду AR
        return new Promise((resolve) => {
            // Імітація захоплення екрану
            setTimeout(() => {
                const canvas = document.createElement('canvas');
                canvas.width = 800;
                canvas.height = 600;
                const ctx = canvas.getContext('2d');
                
                ctx.fillStyle = '#2c3e50';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.fillStyle = 'white';
                ctx.font = '20px Arial';
                ctx.fillText('AR Screenshot', 50, 50);
                ctx.font = '16px Arial';
                ctx.fillText(`Model: ${this.currentModel?.name || 'None'}`, 50, 80);
                ctx.fillText(`Time: ${new Date().toLocaleString('uk-UA')}`, 50, 110);
                
                resolve(canvas.toDataURL('image/png'));
            }, 100);
        });
    }

    saveScreenshot(screenshot) {
        // Збереження знімка в localStorage
        const screenshots = JSON.parse(localStorage.getItem('ar_screenshots') || '[]');
        screenshots.unshift(screenshot);
        localStorage.setItem('ar_screenshots', JSON.stringify(screenshots.slice(0, 10))); // Зберігаємо останні 10
    }

    updateScreenshotsGallery() {
        const gallery = $('#screenshotsGallery');
        gallery.empty();

        if (this.screenshots.length === 0) {
            gallery.html(`
                <div class="text-center text-muted py-5 w-100">
                    <i class="fas fa-camera fa-3x mb-2"></i>
                    <p>Ще немає знімків</p>
                </div>
            `);
            return;
        }

        this.screenshots.forEach((screenshot, index) => {
            if (index >= 6) return; // Максимум 6 знімків

            const screenshotElement = `
                <div class="screenshot-item" style="width: 150px;">
                    <img src="${screenshot.image}" 
                         alt="Screenshot ${screenshot.timestamp.toLocaleString('uk-UA')}"
                         class="img-fluid rounded"
                         style="height: 100px; object-fit: cover; width: 100%;">
                    <div class="text-center mt-1">
                        <small class="text-muted">${screenshot.timestamp.toLocaleTimeString('uk-UA')}</small>
                        <br>
                        <button class="btn btn-sm btn-outline-primary mt-1" onclick="arHelper.downloadScreenshot(${screenshot.id})">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
            `;
            gallery.append(screenshotElement);
        });
    }

    downloadScreenshot(screenshotId) {
        const screenshot = this.screenshots.find(s => s.id === screenshotId);
        if (screenshot) {
            const link = document.createElement('a');
            link.href = screenshot.image;
            link.download = `ar_screenshot_${screenshot.timestamp.toISOString().replace(/[:.]/g, '-')}.png`;
            link.click();
        }
    }

    showComponentInfo(componentId) {
        const componentInfo = this.getComponentInfo(componentId);
        const infoPanel = $('#componentInfo');
        
        infoPanel.html(`
            <h6 class="text-primary">${componentInfo.name}</h6>
            <p class="small">${componentInfo.description}</p>
            <div class="component-details">
                <div class="detail-item">
                    <span class="detail-label">Статус:</span>
                    <span class="detail-value badge badge-success">Активний</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Остання перевірка:</span>
                    <span class="detail-value">${new Date().toLocaleDateString('uk-UA')}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Ресурс:</span>
                    <span class="detail-value">90%</span>
                </div>
            </div>
            <button class="btn btn-sm btn-outline-primary mt-2" onclick="arHelper.showComponentManual('${componentId}')">
                <i class="fas fa-book"></i> Документація
            </button>
        `);
    }

    getComponentInfo(componentId) {
        const components = {
            'motor': {
                name: 'Двигун',
                icon: 'fas fa-cogs',
                description: 'Основной двигун ліфта, відповідає за переміщення кабіни',
                color: '#dc3545'
            },
            'controlSystem': {
                name: 'Система управління',
                icon: 'fas fa-microchip',
                description: 'Мікропроцесорна система управління ліфтом',
                color: '#007bff'
            },
            'brakes': {
                name: 'Гальмівна система',
                icon: 'fas fa-stop-circle',
                description: 'Система безпеки та гальмування ліфта',
                color: '#28a745'
            },
            'safetySystem': {
                name: 'Система безпеки',
                icon: 'fas fa-shield-alt',
                description: 'Комплексна система безпеки пасажирів',
                color: '#ffc107'
            },
            'doors': {
                name: 'Дверні механізми',
                icon: 'fas fa-door-open',
                description: 'Механізми відкриття/закриття дверей',
                color: '#6f42c1'
            },
            'display': {
                name: 'Дисплей та індикація',
                icon: 'fas fa-tv',
                description: 'Система відображення інформації',
                color: '#17a2b8'
            },
            'emergency': {
                name: 'Аварійна система',
                icon: 'fas fa-exclamation-triangle',
                description: 'Система аварійного реагування',
                color: '#fd7e14'
            },
            'aiModule': {
                name: 'AI модуль',
                icon: 'fas fa-brain',
                description: 'Штучний інтелект для оптимізації роботи',
                color: '#e83e8c'
            },
            'energySaver': {
                name: 'Енергозберігач',
                icon: 'fas fa-bolt',
                description: 'Система енергозбереження',
                color: '#20c997'
            },
            'smartControl': {
                name: 'Smart контроль',
                icon: 'fas fa-magic',
                description: 'Розумне управління ліфтом',
                color: '#6c757d'
            }
        };
        
        return components[componentId] || { 
            name: componentId, 
            icon: 'fas fa-cube',
            description: 'Компонент ліфта',
            color: '#888888'
        };
    }

    showComponentManual(componentId) {
        const componentInfo = this.getComponentInfo(componentId);
        this.showNotification(`Документація для: ${componentInfo.name}`, 'info');
        // У реальному додатку: відкриття PDF або веб-сторінки
    }

    async stopAR() {
        try {
            this.isARActive = false;
            this.deactivateTool();
            this.updateARUI();

            // Очищення AR сцени
            this.clearARScene();

            // Показуємо плейсхолдер
            $('#arPlaceholder').show();
            $('#arScene').hide();

            this.showNotification('AR режим вимкнено', 'info');
            this.logAREvent('ar_session_end');

        } catch (error) {
            console.error('Помилка вимкнення AR:', error);
            this.showNotification('Помилка при вимкненні AR', 'error');
        }
    }

    clearARScene() {
        // Очищення AR сцени
        if (typeof AFRAME !== 'undefined') {
            const scene = document.querySelector('a-scene');
            if (scene) {
                const marker = document.querySelector('a-marker');
                if (marker) {
                    marker.innerHTML = '';
                }
            }
        }
    }

    updateARUI() {
        const arButton = $('#startAR, #startARBtn');
        const arStatus = $('#arStatus');

        if (this.isARActive) {
            arButton.html('<i class="fas fa-stop"></i> Зупинити AR');
            arButton.removeClass('btn-primary').addClass('btn-danger');
            arStatus.text('Активно').removeClass('badge-info').addClass('badge-success');
        } else {
            arButton.html('<i class="fas fa-play"></i> Запустити AR');
            arButton.removeClass('btn-danger').addClass('btn-primary');
            arStatus.text('Неактивно').removeClass('badge-success').addClass('badge-info');
        }
    }

    updateModelInfo() {
        if (this.currentModel) {
            $('#arStatus').text(`Активно - ${this.currentModel.name}`);
        }
    }

    getSelectedComponents() {
        const selected = [];
        $('.component-item').each(function() {
            selected.push($(this).data('component'));
        });
        return selected;
    }

    handleKeyboardShortcuts(e) {
        switch (e.key) {
            case 'Escape':
                this.deactivateTool();
                break;
            case 'm':
                this.toggleTool('measure');
                break;
            case 'a':
                this.toggleTool('annotation');
                break;
            case 's':
                this.takeScreenshot();
                break;
            case ' ':
                e.preventDefault();
                this.toggleAR();
                break;
        }
    }

    showNotification(message, type = 'info') {
        // Використання toast-сповіщень
        const notification = $(`
            <div class="ar-notification ${type}">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-2"></i>
                ${message}
            </div>
        `);
        
        $('body').append(notification);
        
        setTimeout(() => {
            notification.fadeOut(() => notification.remove());
        }, 3000);
    }

    logAREvent(eventName, data = {}) {
        console.log(`AR Event: ${eventName}`, {
            timestamp: new Date().toISOString(),
            model: this.currentModel?.name,
            ...data
        });
    }

    // Методи для роботи з мануалами
    openManual(manualType) {
        const manual = this.getManual(manualType);
        if (manual) {
            window.open(manual.url, '_blank');
            this.logAREvent('manual_opened', { manual: manualType });
        }
    }

    openVideoTutorials() {
        this.showNotification('Відеоінструкції відкриваються...', 'info');
        // У реальному додатку: відкриття відео платформи
    }

    getManual(manualType) {
        const manuals = {
            'safety': {
                name: 'Інструкція з безпеки',
                url: '../../docs/safety-manual.pdf'
            },
            'components': {
                name: 'Схеми компонентів',
                url: '../../docs/components-guide.pdf'
            },
            'troubleshooting': {
                name: 'Розбір несправностей',
                url: '../../docs/troubleshooting-guide.pdf'
            }
        };
        return manuals[manualType];
    }

    // Додаткові методи для розширеного функціоналу
    startTutorial() {
        this.showNotification('Запуск навчального режиму...', 'info');
        // Логіка інтерактивного навчання
    }

    exportSessionData() {
        const sessionData = {
            timestamp: new Date().toISOString(),
            model: this.currentModel,
            screenshots: this.screenshots,
            annotations: this.annotations,
            measurements: this.measurements
        };
        
        const dataStr = JSON.stringify(sessionData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const link = document.createElement('a');
        link.href = dataUri;
        link.download = `ar_session_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        link.click();
        
        this.showNotification('Дані сесії експортовано', 'success');
    }
}

// Автоматична ініціалізація
$(document).ready(function() {
    window.arHelper = new ARHelper();
});