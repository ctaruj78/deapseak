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

    async init() {
        console.log('🏗️ Ініціалізація AR помічника...');
        this.loadUserInfo();
        this.loadLiftModels();
        this.setupEventListeners();
        this.setupComponentControls();
        this.checkARSupport();
        await this.setupWebSocket();
        this.setupRealTimeFeatures();
        
        console.log('✅ AR помічник успішно ініціалізовано');
    }

    async setupWebSocket() {
        // Підключення до WebSocket для real-time функціональності
        this.userId = localStorage.getItem('userId') || 'ar-tech-001';
        
        if (typeof WebSocketUtils !== 'undefined') {
            this.wsClient = WebSocketUtils.init(this.userId, localStorage.getItem('authToken'));
            
            // Обробники WebSocket подій
            this.wsClient.on('ar_instruction', (data) => {
                this.handleRemoteInstruction(data);
            });
            
            this.wsClient.on('lift_status_changed', (data) => {
                this.handleLiftStatusChange(data);
            });

            this.wsClient.on('ar_collaboration', (data) => {
                this.handleCollaboration(data);
            });

            this.wsClient.on('ar_emergency', (data) => {
                this.handleEmergencyAlert(data);
            });
            
            console.log('🔌 WebSocket підключено до AR Helper');
        }
    }

    setupRealTimeFeatures() {
        // Real-time статус
        this.broadcastStatus();
        setInterval(() => this.broadcastStatus(), 30000); // Кожні 30 секунд

        // Синхронізація аннотацій
        // TODO: Реалізувати метод syncAnnotations()
        // this.syncAnnotations();
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
            },
            'model7': {
                name: 'Arkel',
                manufacturer: 'Arkel Otomotiv ve Elektronik',
                year: '2022',
                components: ['motor', 'controlSystem', 'brakes', 'safetySystem', 'doors'],
                manualUrl: '../../docs/arkel-manual.pdf',
                model3D: '../../models/arkel.glb'
            },
            'model8': {
                name: 'Edel',
                manufacturer: 'Edel Elevadores',
                year: '2021',
                components: ['hydraulicUnit', 'controlSystem', 'safetySystem', 'doors'],
                manualUrl: '../../docs/edel-manual.pdf',
                model3D: '../../models/edel.glb'
            },
            'model9': {
                name: 'Megom 2000',
                manufacturer: 'Megom 2000 S.A.',
                year: '2020',
                components: ['hydraulicUnit', 'controlSystem', 'safetySystem', 'doors'],
                manualUrl: '../../docs/megom-manual.pdf',
                model3D: '../../models/megom.glb'
            },
            'model10': {
                name: 'CTA Elevadores',
                manufacturer: 'CTA Construções Técnicas de Ascensores',
                year: '2021',
                components: ['motor', 'controlSystem', 'brakes', 'safetySystem', 'doors'],
                manualUrl: '../../docs/cta-manual.pdf',
                model3D: '../../models/cta.glb'
            },
            'model11': {
                name: 'Mikrolift',
                manufacturer: 'Mikrolift Elevadores',
                year: '2022',
                components: ['motor', 'controlSystem', 'safetySystem', 'doors'],
                manualUrl: '../../docs/mikrolift-manual.pdf',
                model3D: '../../models/mikrolift.glb'
            },
            'model12': {
                name: 'Heytech',
                manufacturer: 'Heytech Elevadores',
                year: '2023',
                components: ['motor', 'controlSystem', 'brakes', 'safetySystem', 'doors'],
                manualUrl: '../../docs/heytech-manual.pdf',
                model3D: '../../models/heytech.glb'
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

        // Клік по компоненту — показати технічні деталі
        $(document).on('click', '.component-item', (e) => {
            const componentId = $(e.currentTarget).data('component');
            $('.component-item').removeClass('active');
            $(e.currentTarget).addClass('active');
            const modelId = $('#liftModelSelect').val();
            this.showComponentInfo(componentId, modelId);
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
                const componentInfo = this.getComponentInfo(componentId, modelId);
                const componentItem = `
                    <div class="component-item" data-component="${componentId}" style="cursor:pointer" title="Натисніть для деталей">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <i class="${componentInfo.icon} mr-2"></i>
                                <strong>${componentInfo.name}</strong>
                            </div>
                            <div class="component-status">
                                <span class="badge badge-success">Активний</span>
                            </div>
                        </div>
                        <small class="text-muted">${componentInfo.description.substring(0, 60)}${componentInfo.description.length > 60 ? '…' : ''}</small>
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
        this.measurements = [];
        this.isMeasuring = false;
        this.measureStartPoint = null;

        // Додаємо обробники подій для вимірювання
        this.setupMeasureEventListeners();

        // Показуємо підказку
        this.showToolHint('Натисніть на точку для початку вимірювання, потім на кінцеву точку');
    }

    deactivateMeasureTool() {
        console.log('Деактивація інструменту вимірювання');
        this.removeMeasureEventListeners();
        this.clearMeasurements();
        this.hideToolHint();
    }

    setupMeasureEventListeners() {
        // Обробка кліків по AR сцені для вимірювання
        $(document).on('click.measureTool', '.ar-scene, #arScene', (e) => {
            if (!this.isARActive) return;

            const point = this.getClickPoint(e);
            if (!this.isMeasuring) {
                // Початок вимірювання
                this.startMeasurement(point);
            } else {
                // Кінець вимірювання
                this.endMeasurement(point);
            }
        });

        // Обробка клавіш
        $(document).on('keydown.measureTool', (e) => {
            if (e.key === 'Escape') {
                this.cancelMeasurement();
            }
        });
    }

    removeMeasureEventListeners() {
        $(document).off('click.measureTool');
        $(document).off('keydown.measureTool');
    }

    startMeasurement(point) {
        this.isMeasuring = true;
        this.measureStartPoint = point;

        // Візуально показуємо початкову точку
        this.showMeasurementPoint(point, 'start');

        this.showToolHint('Натисніть на кінцеву точку або Esc для скасування');
    }

    endMeasurement(point) {
        if (!this.measureStartPoint) return;

        const distance = this.calculateDistance(this.measureStartPoint, point);
        const measurement = {
            id: Date.now(),
            start: this.measureStartPoint,
            end: point,
            distance: distance,
            unit: 'cm' // Можна додати вибір одиниць
        };

        this.measurements.push(measurement);
        this.isMeasuring = false;
        this.measureStartPoint = null;

        // Візуально показуємо лінію вимірювання
        this.showMeasurementLine(measurement);

        // Показуємо результат
        this.showMeasurementResult(measurement);

        this.showToolHint('Вимірювання завершено. Натисніть для нового вимірювання');
    }

    cancelMeasurement() {
        if (this.isMeasuring) {
            this.clearMeasurementPoints();
            this.isMeasuring = false;
            this.measureStartPoint = null;
            this.showToolHint('Вимірювання скасовано');
        }
    }

    calculateDistance(point1, point2) {
        // Просте евклідове відстань (в пікселях)
        // У реальному AR це буде 3D відстань
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getClickPoint(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    showMeasurementPoint(point, type) {
        const pointElement = $(`
            <div class="measurement-point measurement-${type}" 
                 style="position: absolute; left: ${point.x - 5}px; top: ${point.y - 5}px; 
                        width: 10px; height: 10px; background: ${type === 'start' ? 'green' : 'red'}; 
                        border-radius: 50%; border: 2px solid white; z-index: 1000;">
            </div>
        `);
        $('#arScene').append(pointElement);
    }

    showMeasurementLine(measurement) {
        const lineElement = $(`
            <div class="measurement-line" 
                 style="position: absolute; left: ${Math.min(measurement.start.x, measurement.end.x)}px; 
                        top: ${Math.min(measurement.start.y, measurement.end.y)}px; 
                        width: ${Math.abs(measurement.end.x - measurement.start.x)}px; 
                        height: ${Math.abs(measurement.end.y - measurement.start.y)}px; 
                        border: 2px solid blue; z-index: 999;">
            </div>
        `);
        $('#arScene').append(lineElement);
    }

    showMeasurementResult(measurement) {
        const midX = (measurement.start.x + measurement.end.x) / 2;
        const midY = (measurement.start.y + measurement.end.y) / 2;

        const resultElement = $(`
            <div class="measurement-result" 
                 style="position: absolute; left: ${midX}px; top: ${midY - 20}px; 
                        background: rgba(0,0,0,0.8); color: white; padding: 2px 6px; 
                        border-radius: 3px; font-size: 12px; z-index: 1001;">
                ${measurement.distance.toFixed(1)} ${measurement.unit}
            </div>
        `);
        $('#arScene').append(resultElement);
    }

    clearMeasurements() {
        $('.measurement-point, .measurement-line, .measurement-result').remove();
        this.measurements = [];
    }

    activateAnnotationTool() {
        console.log('Активація інструменту анотацій');
        this.isAnnotating = false;

        // Додаємо обробники подій для анотацій
        this.setupAnnotationEventListeners();

        this.showToolHint('Натисніть на точку для додавання анотації');
    }

    deactivateAnnotationTool() {
        console.log('Деактивація інструменту анотацій');
        this.removeAnnotationEventListeners();
        this.hideToolHint();
    }

    setupAnnotationEventListeners() {
        $(document).on('click.annotationTool', '.ar-scene, #arScene', (e) => {
            if (!this.isARActive) return;

            const point = this.getClickPoint(e);
            this.addAnnotation(point);
        });
    }

    removeAnnotationEventListeners() {
        $(document).off('click.annotationTool');
    }

    addAnnotation(point) {
        const annotationText = prompt('Введіть текст анотації:');
        if (!annotationText || annotationText.trim() === '') return;

        const annotation = {
            id: Date.now(),
            point: point,
            text: annotationText.trim(),
            timestamp: new Date()
        };

        this.annotations.push(annotation);
        this.showAnnotation(annotation);

        this.logAREvent('annotation_added', { annotationId: annotation.id });
    }

    showAnnotation(annotation) {
        const annotationElement = $(`
            <div class="annotation" data-id="${annotation.id}" 
                 style="position: absolute; left: ${annotation.point.x}px; top: ${annotation.point.y}px; 
                        background: rgba(255,255,0,0.9); color: black; padding: 4px 8px; 
                        border-radius: 4px; font-size: 12px; max-width: 150px; z-index: 1000;">
                <div class="annotation-text">${annotation.text}</div>
                <button class="annotation-delete btn btn-xs btn-danger" 
                        style="position: absolute; top: -5px; right: -5px; width: 16px; height: 16px; padding: 0; font-size: 10px;">×</button>
            </div>
        `);

        $('#arScene').append(annotationElement);

        // Обробка видалення анотації
        annotationElement.find('.annotation-delete').on('click', (e) => {
            e.stopPropagation();
            this.removeAnnotation(annotation.id);
        });
    }

    removeAnnotation(annotationId) {
        this.annotations = this.annotations.filter(a => a.id !== annotationId);
        $(`.annotation[data-id="${annotationId}"]`).remove();
        this.logAREvent('annotation_removed', { annotationId });
    }

    activateHotspotTool() {
        console.log('Активація інструменту хот-спотів');
        this.isCreatingHotspot = false;

        // Додаємо обробники подій для хот-спотів
        this.setupHotspotEventListeners();

        this.showToolHint('Натисніть на точку для створення хот-споту');
    }

    deactivateHotspotTool() {
        console.log('Деактивація інструменту хот-спотів');
        this.removeHotspotEventListeners();
        this.hideToolHint();
    }

    setupHotspotEventListeners() {
        $(document).on('click.hotspotTool', '.ar-scene, #arScene', (e) => {
            if (!this.isARActive) return;

            const point = this.getClickPoint(e);
            this.createHotspot(point);
        });
    }

    removeHotspotEventListeners() {
        $(document).off('click.hotspotTool');
    }

    createHotspot(point) {
        const hotspotTitle = prompt('Введіть назву хот-споту:');
        if (!hotspotTitle || hotspotTitle.trim() === '') return;

        const hotspot = {
            id: Date.now(),
            point: point,
            title: hotspotTitle.trim(),
            description: '',
            actions: [],
            timestamp: new Date()
        };

        // Додаємо до моделі, якщо є
        if (this.currentModel) {
            if (!this.currentModel.hotspots) {
                this.currentModel.hotspots = [];
            }
            this.currentModel.hotspots.push(hotspot);
        }

        this.showHotspot(hotspot);

        this.logAREvent('hotspot_created', { hotspotId: hotspot.id });
    }

    showHotspot(hotspot) {
        const hotspotElement = $(`
            <div class="hotspot" data-id="${hotspot.id}" 
                 style="position: absolute; left: ${hotspot.point.x - 10}px; top: ${hotspot.point.y - 10}px; 
                        width: 20px; height: 20px; background: rgba(255,0,0,0.8); 
                        border-radius: 50%; border: 2px solid white; cursor: pointer; z-index: 1000;">
                <div class="hotspot-tooltip" style="position: absolute; bottom: 25px; left: 50%; 
                        transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; 
                        padding: 4px 8px; border-radius: 4px; font-size: 12px; white-space: nowrap; 
                        display: none;">
                    ${hotspot.title}
                </div>
            </div>
        `);

        $('#arScene').append(hotspotElement);

        // Показуємо підказку при наведенні
        hotspotElement.on('mouseenter', () => {
            hotspotElement.find('.hotspot-tooltip').show();
        }).on('mouseleave', () => {
            hotspotElement.find('.hotspot-tooltip').hide();
        });

        // Клік для показу деталей
        hotspotElement.on('click', (e) => {
            e.stopPropagation();
            this.showHotspotDetails(hotspot);
        });
    }

    showHotspotDetails(hotspot) {
        // Показуємо деталі хот-споту
        const details = `
            <strong>${hotspot.title}</strong><br>
            <small>Створено: ${hotspot.timestamp.toLocaleString('pt-PT')}</small>
        `;
        this.showNotification(details, 'info');
    }

    showToolHint(text) {
        if (!this.hintElement) {
            this.hintElement = $(`
                <div class="ar-tool-hint" 
                     style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); 
                            background: rgba(0,0,0,0.8); color: white; padding: 8px 16px; 
                            border-radius: 20px; font-size: 14px; z-index: 10000;">
                </div>
            `);
            $('body').append(this.hintElement);
        }
        this.hintElement.text(text).show();
    }

    hideToolHint() {
        if (this.hintElement) {
            this.hintElement.hide();
        }
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
        try {
            // Спробуємо захопити поточний вид AR сцени
            const arScene = document.getElementById('arScene');
            if (arScene) {
                // Використовуємо html2canvas для захоплення DOM елемента
                if (typeof html2canvas !== 'undefined') {
                    const canvas = await html2canvas(arScene);
                    return canvas.toDataURL('image/png');
                }
            }

            // Fallback: створюємо canvas з текстом
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 600;
            const ctx = canvas.getContext('2d');

            // Фон
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#2c3e50');
            gradient.addColorStop(1, '#34495e');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Текст
            ctx.fillStyle = 'white';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('AR Screenshot', canvas.width / 2, canvas.height / 2 - 50);

            ctx.font = '16px Arial';
            ctx.fillText(`Model: ${this.currentModel?.name || 'None'}`, canvas.width / 2, canvas.height / 2 - 10);
            ctx.fillText(`Time: ${new Date().toLocaleString('pt-PT')}`, canvas.width / 2, canvas.height / 2 + 20);
            ctx.fillText(`Active Tools: ${this.activeTool || 'None'}`, canvas.width / 2, canvas.height / 2 + 50);

            // Додаємо рамку
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 4;
            ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

            return canvas.toDataURL('image/png');
        } catch (error) {
            console.error('Помилка захоплення AR виду:', error);
            // Emergency fallback
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 300;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Screenshot Error', canvas.width / 2, canvas.height / 2);
            return canvas.toDataURL('image/png');
        }
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
                         alt="Screenshot ${screenshot.timestamp.toLocaleString('pt-PT')}"
                         class="img-fluid rounded"
                         style="height: 100px; object-fit: cover; width: 100%;">
                    <div class="text-center mt-1">
                        <small class="text-muted">${screenshot.timestamp.toLocaleTimeString('pt-PT')}</small>
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

    showComponentInfo(componentId, modelId) {
        const info = this.getComponentInfo(componentId, modelId);
        const infoPanel = $('#componentInfo');

        const specsHtml = info.specs.length > 0
            ? `<table class="table table-sm table-borderless mb-2">
                ${info.specs.map(s => `<tr><td class="text-muted pr-2" style="white-space:nowrap;width:45%">${s.label}</td><td><strong>${s.value}</strong></td></tr>`).join('')}
               </table>`
            : '';

        const maintenanceHtml = info.maintenance.length > 0
            ? `<div class="mt-2"><strong><i class="fas fa-tools mr-1 text-primary"></i>Обслуговування:</strong><ul class="mb-1 mt-1 pl-3">
                ${info.maintenance.map(m => `<li class="small">${m}</li>`).join('')}
               </ul></div>`
            : '';

        const issuesHtml = info.issues.length > 0
            ? `<div class="mt-2"><strong><i class="fas fa-exclamation-triangle mr-1 text-warning"></i>Типові несправності:</strong><ul class="mb-1 mt-1 pl-3">
                ${info.issues.map(i => `<li class="small text-danger">${i}</li>`).join('')}
               </ul></div>`
            : '';

        infoPanel.html(`
            <h6 class="text-primary mb-1"><i class="${info.icon} mr-1"></i>${info.name}</h6>
            <p class="small mb-2">${info.description}</p>
            ${specsHtml}
            ${maintenanceHtml}
            ${issuesHtml}
            ${info.manual ? `<div class="mt-2"><small class="text-muted"><i class="fas fa-book mr-1"></i>${info.manual}</small></div>` : ''}
        `);
    }

    getComponentInfo(componentId, modelId) {
        // Базові дані компонентів (загальні)
        const baseComponents = {
            'motor': { name: 'Двигун', icon: 'fas fa-cogs', color: '#dc3545' },
            'controlSystem': { name: 'Система управління', icon: 'fas fa-microchip', color: '#007bff' },
            'brakes': { name: 'Гальмівна система', icon: 'fas fa-stop-circle', color: '#28a745' },
            'safetySystem': { name: 'Система безпеки', icon: 'fas fa-shield-alt', color: '#ffc107' },
            'doors': { name: 'Дверні механізми', icon: 'fas fa-door-open', color: '#6f42c1' },
            'display': { name: 'Дисплей та індикація', icon: 'fas fa-tv', color: '#17a2b8' },
            'emergency': { name: 'Аварійна система', icon: 'fas fa-exclamation-triangle', color: '#fd7e14' },
            'aiModule': { name: 'AI модуль', icon: 'fas fa-brain', color: '#e83e8c' },
            'energySaver': { name: 'Енергозберігач', icon: 'fas fa-bolt', color: '#20c997' },
            'smartControl': { name: 'Smart контроль', icon: 'fas fa-magic', color: '#6c757d' },
            'hydraulicUnit': { name: 'Гідравлічний агрегат', icon: 'fas fa-oil-can', color: '#795548' }
        };

        // Повна технічна база по моделях
        const modelComponentData = {
            'model1': { // Otis Gen2
                'motor': {
                    description: 'Синхронний безредукторний двигун з постійними магнітами (PMSM). Вбудований у шківний вузол без машинного приміщення.',
                    specs: [
                        { label: 'Тип', value: 'PMSM, безредукторний' },
                        { label: 'Потужність', value: '7.5 / 11 / 15 кВт' },
                        { label: 'Швидкість кабіни', value: '1.0 – 1.75 м/с' },
                        { label: 'Вантажопідйомність', value: '480 – 1275 кг' },
                        { label: 'Клас ізоляції', value: 'F (155°C)' },
                        { label: 'Ступінь захисту', value: 'IP21' },
                    ],
                    maintenance: ['Перевірка вібрації/шуму — щомісяця', 'Перевірка затягування болтів кріплення — кожні 6 міс.', 'Вимірювання ізоляції обмоток — раз на рік', 'Заміна підшипників — кожні 5 років або 20 000 год.'],
                    issues: ['Перегрів через засмічення вентиляційних отворів', 'Вібрація при зносі підшипників', 'Помилки енкодера через пошкодження кабелю'],
                    manual: 'Otis Gen2 MRL Motor Manual Rev.6'
                },
                'controlSystem': {
                    description: 'Контролер OTIS OVF20CR (VVVF-привод). Вбудований у шафу управління, підтримує діагностику через порт RS-485.',
                    specs: [
                        { label: 'Тип привода', value: 'VVVF (змінний напруга/частота)' },
                        { label: 'Живлення', value: '3×400 V / 50 Hz' },
                        { label: 'Протокол', value: 'CANopen, RS-485' },
                        { label: 'Макс. зупинок', value: '64' },
                        { label: 'ПЗ', value: 'OVF20CR v4.x' },
                    ],
                    maintenance: ['Перевірка журналів помилок — щомісяця', 'Очищення вентиляції шафи — кожні 3 міс.', 'Резервна копія параметрів — після будь-яких змін', 'Тест навчального пробігу — після ТО'],
                    issues: ['Помилка E221 — збій сигналу давача рівня', 'Помилка E541 — перевищення температури привода', 'Відмова CAN-шини при окисленні роз\'ємів'],
                    manual: 'OVF20CR Controller Programming Guide'
                },
                'brakes': {
                    description: 'Двогальмівний електромагнітний вузол, інтегрований у двигун. Відповідає EN 81-20.',
                    specs: [
                        { label: 'Тип', value: 'Електромагнітний, spring-set' },
                        { label: 'Напруга розблокування', value: '230 VDC' },
                        { label: 'Зусилля затиску', value: '2× 400 N·m' },
                        { label: 'Зазор', value: '0.3 – 0.5 мм' },
                    ],
                    maintenance: ['Перевірка зазору гальмівних колодок — кожні 3 міс.', 'Перевірка спрацювання мікроперемикача — щомісяця', 'Змащення осей — раз на рік', 'Заміна колодок при зносі > 1 мм'],
                    issues: ['Вібрація при гальмуванні — знос колодок', 'Гальмо не відпускає — низька напруга котушки', 'Занадто малий зазор — перегрів колодок'],
                    manual: 'Otis Gen2 Brake Adjustment Manual'
                },
                'safetySystem': {
                    description: 'Ловіч кабіни (обмежувач швидкості + прогресивний вловлювач), буфери, кінцеві вимикачі.',
                    specs: [
                        { label: 'Обмежувач швидкості', value: 'Спрацювання при 1.4× Vном' },
                        { label: 'Тип вловлювача', value: 'Прогресивний' },
                        { label: 'Буфери', value: 'Полімерні, EN 81-20 §5.8' },
                        { label: 'Перевантаження', value: 'Датчик на платформі кабіни' },
                    ],
                    maintenance: ['Перевірка вловлювача та обмежувача — раз на рік', 'Змащення каната обмежувача — кожні 6 міс.', 'Тест аварійного зупинення — під час щорічного ТО'],
                    issues: ['Спрацювання вловлювача без причини — знос каната', 'Буфер не повертається — пошкоджений полімер'],
                    manual: 'Otis Gen2 Safety System Manual'
                },
                'doors': {
                    description: 'Центральнорозсувні двері з оператором Wittur NOVA 2000. Фотоелектрична захисна завіса.',
                    specs: [
                        { label: 'Тип', value: 'Центральнорозсувні, 2-стулкові' },
                        { label: 'Оператор', value: 'Wittur NOVA 2000' },
                        { label: 'Час відкриття', value: '≤ 2.5 с' },
                        { label: 'Захисна завіса', value: 'Всесторонній захист, 80 сенсорів' },
                        { label: 'Силовий зв\'язок', value: 'Вузол WID (безключний)' },
                    ],
                    maintenance: ['Змащення роликів і напрямних — кожні 3 міс.', 'Перевірка фотозавіси — щомісяця', 'Регулювання силового зв\'язку — при заїданні', 'Заміна ременя оператора — кожні 3 роки'],
                    issues: ['Двері відкриваються повільно — знос ременя', 'Помилка Door Zone — збій сенсора DVZ', 'Часткове відкриття — забруднення завіси'],
                    manual: 'Wittur NOVA 2000 Operator Manual'
                }
            },
            'model2': { // Schindler 3300
                'motor': {
                    description: 'Двигун з постійними магнітами Schindler EcoGear. Безредукторна конструкція без машинного приміщення (MRL).',
                    specs: [
                        { label: 'Тип', value: 'PMM (постійні магніти), MRL' },
                        { label: 'Потужність', value: '11 / 15 кВт' },
                        { label: 'Швидкість кабіни', value: '1.0 / 1.6 м/с' },
                        { label: 'Вантажопідйомність', value: '320 – 1000 кг' },
                        { label: 'Клас ізоляції', value: 'F' },
                        { label: 'Охолодження', value: 'природна конвекція (IC410)' },
                    ],
                    maintenance: ['Перевірка рівня вібрації — кожні 3 міс.', 'Затягування клемних з\'єднань — раз на рік', 'Перевірка ізоляції обмоток мегоометром — раз на рік', 'Заміна підшипників — через 40 000 год. або 10 років'],
                    issues: ['Нагрів при навантаженні > 80% — перевірити вентиляцію шахти', 'Стук при пуску — перевірити посадку шківа', 'Код F50 — помилка резолвера (перевірити кабель)'],
                    manual: 'Schindler 3300 Motor Technical Manual SV-3301'
                },
                'controlSystem': {
                    description: 'Контролер Schindler ACVF3 Drive з інвертором. Шафа у верхній частині шахти. Підключення діагностики через Schindler ADMS.',
                    specs: [
                        { label: 'Тип привода', value: 'VVVF, ACVF3' },
                        { label: 'Живлення', value: '3×400 V / 50 Hz ±10%' },
                        { label: 'Протокол зв\'язку', value: 'Schindler PBUS (RS-485)' },
                        { label: 'Зони зупинок', value: 'до 40' },
                        { label: 'Діагностика', value: 'Schindler ADMS / IMOS' },
                    ],
                    maintenance: ['Зчитування кодів помилок через IMOS — щомісяця', 'Перевірка контактних з\'єднань — кожні 6 міс.', 'Оновлення ПЗ — за рекомендацією Schindler', 'Навчальний пробіг після ТО'],
                    issues: ['Помилка 3312 — відхилення позиції кабіни', 'Помилка 5011 — відмова дверного контролера', 'Перегрів IGBT-транзисторів при частих пусках'],
                    manual: 'Schindler 3300 ACVF3 Controller Manual'
                },
                'brakes': {
                    description: 'Два незалежних електромагнітних гальма, вбудовані в двигун. Моніторинг через мікроперемикачі.',
                    specs: [
                        { label: 'Тип', value: 'Електромагнітний bi-stable' },
                        { label: 'Напруга', value: '100 VDC (утримуюча 50 VDC)' },
                        { label: 'Зазор колодок', value: '0.25 – 0.45 мм' },
                        { label: 'Мін. товщина колодки', value: '≥ 2 мм' },
                    ],
                    maintenance: ['Вимір зазору — кожні 3 міс.', 'Перевірка мікровимикачів — щомісяця', 'Змащення пружин — раз на рік (тільки суха мастила)', 'Заміна накладок при зносі до межі'],
                    issues: ['Заклинювання при низьких температурах — конденсат у котушці', 'Зашумлення при відпусканні — нерівний знос накладок', 'Помилка BRS — сигнал мікровимикача не надходить'],
                    manual: 'Schindler 3300 Brake Service Manual SV-3304'
                },
                'doors': {
                    description: 'Розсувні двері з оператором Sematic S600. EDF-система (ElectroDynamic Force) для плавного ходу.',
                    specs: [
                        { label: 'Тип', value: '2-панельні, телескопічні або центральні' },
                        { label: 'Оператор', value: 'Sematic S600' },
                        { label: 'Час відкриття', value: '2.0 – 3.0 с' },
                        { label: 'Захисна завіса', value: 'Multiscan 40/80 зон' },
                        { label: 'Зв\'язок', value: 'CAN Bus між оператором і контролером' },
                    ],
                    maintenance: ['Змащення верхньої напрямної (силікон) — кожні 3 міс.', 'Чищення датчиків завіси — щомісяця', 'Перевірка натяжного пристрою нижньої лопаті — кожні 6 міс.', 'Калібрування оператора S600 після заміни'],
                    issues: ['Помилки сенсора EDF — забруднення повзунів', 'Вибій дверей — знос обмежувача ходу', 'CAN-помилка — обрив або занадто довгий кабель'],
                    manual: 'Schindler 3300 Door System Manual SV-3306'
                },
                'controlSystem_extra': {
                    description: 'IMOS (Intelligent Monitoring) — вбудований інтерфейс для зчитування журналів, налаштування зон та оновлення ПЗ.',
                    specs: [],
                    maintenance: ['Підключення ноутбука через RS-232 адаптер', 'Ввести пароль техніка рівня L2', 'Меню: Diagnostics → Error Log → Clear'],
                    issues: [],
                    manual: 'Schindler IMOS User Guide v3.2'
                },
                'display': {
                    description: 'LCD-індикатор поверху та індикатор в кабіні. COP/LOP з підсвіткою кнопок і голосовим сповіщенням.',
                    specs: [
                        { label: 'Тип дисплея COP', value: 'LCD 7-сегментний + точковий' },
                        { label: 'Інтерфейс LOP', value: 'CAN Bus' },
                        { label: 'Голосові повідомлення', value: 'SD-картка, WAV/MP3' },
                        { label: 'Кнопки', value: 'LED-підсвічування 24V' },
                    ],
                    maintenance: ['Чищення кнопок та дисплеїв — щомісяця', 'Перевірка кабельних клемних контактів LOP — раз на рік', 'Заміна SD-картки при пошкодженні аудіо'],
                    issues: ['Не горять поверхові кнопки — перегоріло LED або обрив живлення', 'Дисплей не показує поверх — збій CAN-адреси LOP', 'Немає аудіо — пошкоджена SD або низький рівень гучності'],
                    manual: 'Schindler COP/LOP Technical Manual SV-3308'
                }
            },
            'model3': { // Kone MonoSpace
                'motor': {
                    description: 'Дисковий двигун Kone EcoDisc — плоска конструкція, вбудована над шахтою без окремого машинного приміщення.',
                    specs: [
                        { label: 'Тип', value: 'EcoDisc (дисковий PM)' },
                        { label: 'Потужність', value: '3.5 – 11 кВт' },
                        { label: 'Швидкість', value: '0.63 – 1.6 м/с' },
                        { label: 'Вантажопідйомність', value: '320 – 1000 кг' },
                        { label: 'ККД', value: '> 86%' },
                        { label: 'Маса', value: '145 кг (типово)' },
                    ],
                    maintenance: ['Контроль температури секцій обмотки — щомісяця', 'Перевірка підшипників: 50 000 год. або 10 р.', 'Клинопасова передача відсутня — мастило не потрібне'],
                    issues: ['Перегрів при тривалому навантаженні — вентиляція шахти', 'Помилка EN3 — несправність енкодера EcoDisc', 'Стукіт — ослаблення кріплення диску'],
                    manual: 'Kone EcoDisc Motor Service Manual KM803001'
                },
                'controlSystem': {
                    description: 'Контролер Kone V3F16L (VVVF). Шафа KCE, підтримка Kone Care Remote Monitoring.',
                    specs: [
                        { label: 'Тип', value: 'V3F16L VVVF' },
                        { label: 'Живлення', value: '3×400 V / 50 Hz' },
                        { label: 'Зв\'язок', value: 'KNX, ModBus, Kone Care' },
                        { label: 'Зупинок', value: 'до 32' },
                        { label: 'Моніторинг', value: 'Kone Care 24/7' },
                    ],
                    maintenance: ['Перевірка інверторних конденсаторів — раз на 5 р.', 'Чистка фільтрів шафи — кожні 3 міс.', 'Тест навчального пробігу після ТО'],
                    issues: ['Помилка F16 — відхилення напруги ланки DC', 'Помилка F22 — перегрів IGBT', 'Не завантажується ПЗ — перевірити EEPROM'],
                    manual: 'Kone V3F16L Service Manual KM71352'
                },
                'brakes': {
                    description: 'Вбудовані дискові гальма в корпус EcoDisc. Два незалежних механізми з електронним моніторингом.',
                    specs: [
                        { label: 'Тип', value: 'Дисковий, spring-set' },
                        { label: 'Спрацювання', value: 'Вимкнення живлення котушки' },
                        { label: 'Зазор', value: '0.20 – 0.40 мм' },
                        { label: 'Мін. товщина накладки', value: '≥ 3 мм' },
                    ],
                    maintenance: ['Вимір зазору через інспекційний лючок — кожні 3 міс.', 'Перевірка BMON-сигналу — щомісяця', 'Заміна пружин та накладок — кожні 10 р.'],
                    issues: ['Кабіна не утримується — мала сила затиску, регулювати пружину', 'BMON-помилка — обрив дроту мікровимикача', 'Перегрів дисків — занадто малий зазор'],
                    manual: 'Kone EcoDisc Brake Guide KM803005'
                },
                'safetySystem': {
                    description: 'Kone SafetyPro: двоканальна система безпеки з навчальним ехо-тестом щоразу при вмиканні.',
                    specs: [
                        { label: 'Обмежувач швидкості', value: 'Kone OSG-LD' },
                        { label: 'Вловлювач', value: 'Прогресивний, Kone SIP' },
                        { label: 'Буфери', value: 'По EN 81-20, маслогідравлічні' },
                    ],
                    maintenance: ['Тест обмежувача швидкості — раз на рік', 'Заміна мастила буфера — кожні 2 р.', 'Самодіагностика SafetyPro при кожному пуску'],
                    issues: ['Спрацювання OSG без причини — знос або бруд на канаті', 'Кабіна опускається повільно після спрацювання — буфер недозаряджений'],
                    manual: 'Kone SafetyPro Manual KM803010'
                },
                'emergency': {
                    description: 'ARO (Automatic Rescue Operation) — автоматичне самоперевезення до найближчого поверху при зникненні живлення від батареї ARD.',
                    specs: [
                        { label: 'Тип', value: 'ARO (ARD — Automatic Rescue Device)' },
                        { label: 'Напруга батареї', value: '48 VDC, 20 Ah' },
                        { label: 'Час резерву', value: '≥ 1 урятувальний хід' },
                        { label: 'Самотест', value: 'Щоденно' },
                    ],
                    maintenance: ['Перевірка заряду батареї — щомісяця', 'Заміна батареї — кожні 3–4 роки', 'Тест ARO пробігу — раз на рік'],
                    issues: ['ARO не спрацьовує — розряджена батарея', 'Помилка ARD-FAULT — обрив у ланцюзі батареї'],
                    manual: 'Kone ARD Installation & Maintenance KM71360'
                },
                'doors': {
                    description: 'Двері KONE MiniSpace з оператором Sematic або Fermator. Інфрачервона завіса + механічний реверс.',
                    specs: [
                        { label: 'Тип', value: '2-стулкові центральні або бокові' },
                        { label: 'Оператор', value: 'Sematic SM2000 / Fermator VF5' },
                        { label: 'Час циклу', value: '2.5 – 4.0 с' },
                        { label: 'Захист', value: 'ІЧ-завіса + механічна реверсна стрічка' },
                    ],
                    maintenance: ['Змащення роликів та напрямних — кожні 3 міс.', 'Перевірка ІЧ-завіси — щомісяця', 'Регулювання кінцевого демпфера — при ударах'],
                    issues: ['Двері не відкриваються повністю — знос чи знеструмлення оператора', 'Помилки DE code — збій CAN між кабіною і контролером'],
                    manual: 'Kone Door System Manual KM803020'
                }
            },
            'model4': { // Thyssenkrupp Evolution
                'motor': {
                    description: 'Синхронний двигун з постійними магнітами Thyssenkrupp SYN. Модульна конструкція для швидкої заміни.',
                    specs: [
                        { label: 'Тип', value: 'PMSM синхронний' },
                        { label: 'Потужність', value: '7.5 – 22 кВт' },
                        { label: 'Швидкість', value: '1.0 – 2.5 м/с' },
                        { label: 'Вантажопідйомність', value: '480 – 1600 кг' },
                        { label: 'Ізоляція', value: 'Клас H (180°C)' },
                    ],
                    maintenance: ['Перевірка температури за PTC-датчиком — щомісяця', 'Вимірювання ізоляції — раз на рік', 'Заміна підшипників — через 60 000 год.'],
                    issues: ['PTC-трипінг — перевантаження або забита вентиляція', 'Помилка ENC_FAULT — збій енкодера SIL2', 'Ненормальний шум — підшипник або ослаблений кронштейн'],
                    manual: 'TKE Evolution Motor Service Manual TK-EV-MOT-01'
                },
                'controlSystem': {
                    description: 'Контролер MAX (Multiple Architecture eXchange). Web-based діагностика через MAX Connect.',
                    specs: [
                        { label: 'Тип', value: 'MAX VVVF' },
                        { label: 'Живлення', value: '3×400–480 V / 50–60 Hz' },
                        { label: 'Зв\'язок', value: 'Ethernet / LAN, MAX Connect' },
                        { label: 'Зупинок', value: 'до 64' },
                        { label: 'Хмарний моніторинг', value: 'TK Cloud Service' },
                    ],
                    maintenance: ['Перевірка та очищення плат — кожні 6 міс.', 'Оновлення ПЗ через MAX Connect', 'Архів журналів помилок — перед ТО'],
                    issues: ['Помилка MAX-0234 — відмова комунікаційного модуля', 'MAX не підключається — перевірити IP та firewall', 'Підвисання контролера — зробити холодний перезапуск'],
                    manual: 'TKE MAX Controller Technical Manual'
                },
                'brakes': {
                    description: 'Два незалежних гальма з функцією SlowDown (плавне гальмування).',
                    specs: [
                        { label: 'Тип', value: 'Електромагнітний, захисний spring-set' },
                        { label: 'Напруга', value: '205 VDC' },
                        { label: 'SlowDown', value: 'Так, ETSL sensorless' },
                        { label: 'Зазор', value: '0.2 – 0.4 мм' },
                    ],
                    maintenance: ['Перевірка зазору — кожні 3 міс.', 'Тест функції SlowDown — раз на рік', 'Заміна котушок — при опорі < 45 Ω'],
                    issues: ['Кабіна не зупиняється рівно — неоднаковий зазор двох гальм', 'SlowDown не спрацьовує — помилка реле ETSL'],
                    manual: 'TKE Evolution Brake Guide TK-EV-BRK-02'
                },
                'safetySystem': {
                    description: 'Thyssenkrupp ACCEL Guard — безконтактна система безпеки SIL3. Моніторинг швидкості, прискорення, позиції.',
                    specs: [
                        { label: 'Рівень безпеки', value: 'SIL 3, EN 13849' },
                        { label: 'Вловлювач', value: 'TK SafetyGrip прогресивний' },
                        { label: 'Моніторинг', value: 'ACCEL Guard (акселерометр)' },
                    ],
                    maintenance: ['Самотест при кожному пуску (SIL3)', 'Перевірка вловлювача — раз на рік', 'Сертифікація ACCEL Guard — кожні 5 р.'],
                    issues: ['Помилка SG-TRIP — спрацювання вловлювача, Reset: виклик тех.', 'ACCEL Guard FAULT — замінити акселерометричний блок'],
                    manual: 'TKE ACCEL Guard Safety Manual TK-EV-SAF-03'
                },
                'aiModule': {
                    description: 'AI-модуль MAX Edge для предиктивного обслуговування: аналізує вібрацію, струм двигуна, температуру в реальному часі.',
                    specs: [
                        { label: 'Платформа', value: 'MAX Edge (Edge Computing)' },
                        { label: 'Алгоритми', value: 'Vibration FFT, thermal trend, motor current signature' },
                        { label: 'Зв\'язок', value: 'LTE / WiFi → TK Cloud' },
                        { label: 'Сповіщення', value: 'Push / SMS / API' },
                    ],
                    maintenance: ['Перевірка підключення до TK Cloud — щомісяця', 'Оновлення ML-моделей автоматичне', 'Калібрування датчиків — раз на рік'],
                    issues: ['Не надходять сповіщення — перевірити SIM або WiFi налаштування', 'Хибні попередження — зробити recalibration у MAX Connect'],
                    manual: 'TKE MAX Edge AI Manual TK-EV-AI-04'
                },
                'doors': {
                    description: 'Двері з оператором TK Door Classic / Premium. Підтримка активного VVVF-дверного привода.',
                    specs: [
                        { label: 'Тип', value: '2 / 4-панельні телескопічні або центральні' },
                        { label: 'Оператор', value: 'TK Door Premium (VVVF)' },
                        { label: 'Завіса', value: '3D MultiScan (40 – 120 зон)' },
                        { label: 'Час', value: '2.0 – 3.0 с' },
                    ],
                    maintenance: ['Змащення верхньої напрямної — кожні 3 міс.', 'Перевірка MultiScan — щомісяця', 'Калібрування VVVF-оператора після заміни'],
                    issues: ['VVVF Door Fault — перевірити параметри оператора', 'MultiScan false trip — очистити лінзи'],
                    manual: 'TKE Door System Manual TK-EV-DOR-05'
                }
            },
            'model5': { // Mitsubishi Electric
                'motor': {
                    description: 'Синхронний двигун MELSERVO Mitsubishi з вбудованим рекуперативним інвертором VFCL.',
                    specs: [
                        { label: 'Тип', value: 'PMSM + рекуперація' },
                        { label: 'Потужність', value: '5.5 – 18.5 кВт' },
                        { label: 'Швидкість', value: '0.75 – 2.0 м/с' },
                        { label: 'Вантажопідйомність', value: '450 – 1350 кг' },
                        { label: 'Рекуперація', value: '20–30 % економії' },
                    ],
                    maintenance: ['Контроль температури обмотки — щомісяця', 'Очищення теплового раіатора інвертора — кожні 3 міс.', 'Заміна підшипників — кожні 50 000 год.'],
                    issues: ['Помилка OC (overcurrent) — перевірити міжвиткове КЗ', 'Висока температура — засмічення вентиляційних ребер інвертора', 'Збій резолвера — замінити кабель або модуль'],
                    manual: 'Mitsubishi NEXIEZ-MRL Motor Manual GMC-2023'
                },
                'controlSystem': {
                    description: 'Контролер VFCL-2S (Vector Frequency Control) з мережевим рекуперативним конвертором.',
                    specs: [
                        { label: 'Тип', value: 'VFCL-2S VVVF з рекуперацією' },
                        { label: 'Живлення', value: '3×380–480 V' },
                        { label: 'Зв\'язок', value: 'M-Net, Modbus RTU' },
                        { label: 'Зупинок', value: 'до 48' },
                        { label: 'Сервіс', value: 'Mitsubishi MELVIT II (ноутбук)' },
                    ],
                    maintenance: ['Підключення MELVIT II — щорічна діагностика', 'Очищення плат від пилу — кожні 6 міс.', 'Перевірка рекупераційного модуля — раз на рік'],
                    issues: ['Помилка MC-0011 — відмова основного реле', 'Помилка MC-0044 — перевищення похибки позиціонування', 'Рекуператор не працює — перевірити опір на вхідних контакторах'],
                    manual: 'Mitsubishi VFCL-2S Technical Manual GMC-CTRL-2023'
                },
                'brakes': {
                    description: 'Два незалежних гальма MELBRAKE вбудовані в шківний вузол. Контроль через BMS (Brake Monitoring System).',
                    specs: [
                        { label: 'Тип', value: 'MELBRAKE, spring-set' },
                        { label: 'Напруга', value: '190 VDC' },
                        { label: 'Зазор', value: '0.3 – 0.5 мм' },
                    ],
                    maintenance: ['Перевірка BMS-сигналів — щомісяця', 'Вимір зазору — кожні 3 міс.', 'Заміна накладок — при товщині < 2 мм'],
                    issues: ['BMS-FAULT — перевірити мікровимикач та дроти', 'Подвійне спрацювання гальм — перевірити напругу котушки'],
                    manual: 'Mitsubishi MELBRAKE Service Manual GMC-BRK-23'
                },
                'energySaver': {
                    description: 'Система рекуперативного живлення MELREG повертає до 30% енергії в мережу при русі завантаженої кабіни вниз.',
                    specs: [
                        { label: 'Тип', value: 'Active Front End (AFE) рекуперація' },
                        { label: 'Ефективність', value: '≥ 95% конверсії' },
                        { label: 'Економія', value: 'до 30% від загального споживання' },
                        { label: 'Cos φ', value: '≥ 0.99' },
                    ],
                    maintenance: ['Перевірка ємності конденсаторів — раз на 3 р.', 'Очищення фільтрів', 'Тест рекуперації при ТО — фіксувати у журнал'],
                    issues: ['Рекуперація відключена — хмарка THD або збій AFE', 'Помилка REGEN-OC — замінити IGBT модуль'],
                    manual: 'Mitsubishi MELREG Energy Recovery Manual'
                },
                'safetySystem': {
                    description: 'Система безпеки MELSAFE з двоканальним ПЛК безпеки SIL2. OSG + прогресивний вловлювач.',
                    specs: [
                        { label: 'Рівень', value: 'SIL 2' },
                        { label: 'OSG', value: 'MELSAFE-OSG1' },
                        { label: 'Вловлювач', value: 'Прогресивний' },
                    ],
                    maintenance: ['Тест OSG — раз на рік', 'Самотест MELSAFE przy кожному вмиканні', 'Сертифікація SIL2 — кожні 5 р.'],
                    issues: ['MELSAFE TRIP — скинути через MELVIT II',  'Помилка OSG — перевірити канат і напрямні'],
                    manual: 'Mitsubishi MELSAFE Safety Manual GMC-SAF-23'
                },
                'doors': {
                    description: 'Двері Mitsubishi MRL з оператором VF5 (Fermator) або MELDOOR. Безконтактна багатопроменева завіса.',
                    specs: [
                        { label: 'Оператор', value: 'MELDOOR 3.0 або Fermator VF5' },
                        { label: 'Завіса', value: 'Mitsubishi MultiLight 60 або 80 променів' },
                        { label: 'Час', value: '2.5 – 3.5 с' },
                    ],
                    maintenance: ['Змащення роликів — кожні 3 міс.', 'Перевірка MultiLight — щомісяця', 'Регулювання кінцевих датчиків після ТО'],
                    issues: ['Помилка MLD-05 — сенсор завіси MultiLight', 'Двері трясуть при закритті — знос напрямної'],
                    manual: 'Mitsubishi MRL Door System Manual GMC-DOR-23'
                }
            },
            'model6': { // Hyundai Elevator
                'motor': {
                    description: 'PMSM двигун Hyundai HIPER з вбудованим гальмом та енкодером. Компактна конструкція MRL.',
                    specs: [
                        { label: 'Тип', value: 'PMSM HIPER, MRL' },
                        { label: 'Потужність', value: '5.5 – 15 кВт' },
                        { label: 'Швидкість', value: '1.0 – 1.75 м/с' },
                        { label: 'Вантажопідйомність', value: '450 – 1050 кг' },
                    ],
                    maintenance: ['Перевірка підшипників і шуму — кожні 3 міс.', 'Вимірювання ізоляції — раз на рік', 'Заміна підшипників — кожні 35 000 год.'],
                    issues: ['Помилка ENC-ERR — збій магнітного енкодера (перевірити повітряний зазор)', 'Перегрів при частих пусках — перевірити вентиляцію шахти'],
                    manual: 'Hyundai HIPER Motor Manual HE-MOT-2023'
                },
                'controlSystem': {
                    description: 'Контролер HYUNDAI SVT (VVVF) з модульною шафою ECD та підтримкою Remote Monitoring через HiEMS.',
                    specs: [
                        { label: 'Тип', value: 'SVT-3000 VVVF' },
                        { label: 'Живлення', value: '3×380–415 V / 50 Hz' },
                        { label: 'Зв\'язок', value: 'CAN, Modbus, HiEMS (4G)' },
                        { label: 'Зупинок', value: 'до 64' },
                    ],
                    maintenance: ['Зчитування журналу HiEMS — щомісяця', 'Очищення повітряних фільтрів — кожні 3 міс.', 'Оновлення ПЗ — за рекомендацією Hyundai'],
                    issues: ['Помилка F031 — відмова дверного зворотного зв\'язку', 'Помилка F045 — перевищення відхилення позиції', 'HiEMS offline — перевірити SIM-картку або антену'],
                    manual: 'Hyundai SVT-3000 Controller Manual HE-CTRL-23'
                },
                'brakes': {
                    description: 'Два пружинних електромагнітних гальма з BIME (Brake Intelligent Monitoring Electronics).',
                    specs: [
                        { label: 'Тип', value: 'EM spring-set + BIME' },
                        { label: 'Напруга', value: '195 VDC' },
                        { label: 'Зазор', value: '0.25 – 0.45 мм' },
                    ],
                    maintenance: ['Контроль BIME-журналу — щомісяця', 'Регулювання зазору гальма — кожні 3 міс.', 'Заміна накладок — при зносі < 2 мм'],
                    issues: ['BIME-ALERT — перевірити мікроперемикач', 'Гальмо не відпускає — знижена напруга VDC на котушці'],
                    manual: 'Hyundai BIME Brake Manual HE-BRK-23'
                },
                'safetySystem': {
                    description: 'HyunSafe SIL2 — двоканальна система безпеки. OSG, прогресивний вловлювач, ETSL (Electronic Terminal Speed Limiting).',
                    specs: [
                        { label: 'Рівень', value: 'SIL 2 EN 62061' },
                        { label: 'ETSL', value: 'Електронне обмеження на кінцевих поверхах' },
                        { label: 'OSG', value: 'HyunSafe OSG-V1' },
                    ],
                    maintenance: ['Тест ETSL — кожні 6 міс.', 'Перевірка OSG — раз на рік', 'HyunSafe самодіагностика — при кожному пуску'],
                    issues: ['Помилка ETSL-TRIP — перевірити позицію кодера рівня', 'OSG-FAIL — знос або забруднення каната'],
                    manual: 'Hyundai HyunSafe Safety Manual HE-SAF-23'
                },
                'smartControl': {
                    description: 'Hyundai iPOP (Intelligent Predictive Operation Program) — AI-система оптимізації диспетчеризації і передбачення відказів.',
                    specs: [
                        { label: 'Платформа', value: 'iPOP Cloud + Edge' },
                        { label: 'Функції', value: 'Predictive dispatch, energy optimization, fault prediction' },
                        { label: 'Зв\'язок', value: 'LTE → HiEMS Cloud' },
                        { label: 'Аналітика', value: 'Real-time dashboard у HiEMS App' },
                    ],
                    maintenance: ['Перевірка підключення до HiEMS — щомісяця', 'Оновлення iPOP-алгоритмів — автоматично', 'Калібрування датчиків — раз на рік'],
                    issues: ['iPOP не оновлюється — проблема з мережею', 'Хибні попередження — зробити baseline recalibration у HiEMS'],
                    manual: 'Hyundai iPOP Smart Control Manual HE-SMART-23'
                },
                'doors': {
                    description: 'Двері Hyundai з оператором GEZE Slimdrive ECdrive або власним HE DoorMaster.',
                    specs: [
                        { label: 'Оператор', value: 'HE DoorMaster або GEZE ECdrive' },
                        { label: 'Завіса', value: 'BODE InfraLight 80 зон або HE SafeLight' },
                        { label: 'Час', value: '2.5 – 4.0 с' },
                    ],
                    maintenance: ['Змащення роликів — кожні 3 міс.', 'Перевірка SafeLight — щомісяця', 'Калібрування оператора після ТО'],
                    issues: ['Помилка DM-003 — сенсор дверей не підтверджує закриття', 'Двері повільні — знос зубчастого ременя'],
                    manual: 'Hyundai DoorMaster Service Manual HE-DOR-23'
                }
            },

            // ── ПОРТУГАЛЬСЬКІ ТА ІБЕРІЙСЬКІ МАРКИ ──────────────────────────────

            'model7': { // Arkel
                'motor': {
                    description: 'Безредукторний PMSM-двигун підбирається під контролер ARCONTROL. Часто встановлюється серія Ziehl-Abegg або власна Arkel AM-серія у компактному виконанні без МП.',
                    specs: [
                        { label: 'Тип', value: 'PMSM, безредукторний MRL' },
                        { label: 'Потужність', value: '3 – 11 кВт' },
                        { label: 'Швидкість', value: '1.0 – 1.75 м/с' },
                        { label: 'Вантажопідйомність', value: '320 – 1275 кг' },
                        { label: 'Напруга', value: '3×400 V / 50 Hz' },
                    ],
                    maintenance: ['Перевірка підшипників на вібрацію — кожні 3 міс.', 'Вимірювання ізоляції обмоток — раз на рік', 'Контроль кріплення шківа — кожні 6 міс.'],
                    issues: ['Перегрів при навантаженні > 90% — перевірити вентиляцію', 'Вібрація — знос підшипників або розбалансування шківа'],
                    manual: 'Arkel AM-Series Motor Technical Manual v3.2'
                },
                'controlSystem': {
                    description: 'Контролер ARCONTROL KM50-T (або KM200) — VVVF-привод турецького виробника Arkel. Широко застосовується в Португалії та Іспанії, підтримує CAN та ModbusTCP.',
                    specs: [
                        { label: 'Серія', value: 'ARCONTROL KM50-T / KM200' },
                        { label: 'Привод', value: 'VVVF (AC-VVVF)' },
                        { label: 'Протокол', value: 'CAN, Modbus TCP/IP' },
                        { label: 'Зупинок', value: 'до 32' },
                        { label: 'ПЗ', value: 'ARCSOFT v5.x' },
                        { label: 'Дисплей', value: 'LCD + USB-порт для оновлень' },
                    ],
                    maintenance: ['Зчитування журналу помилок — щомісяця', 'Оновлення ARCSOFT — при новому ТО', 'Резервна копія параметрів — після будь-яких змін', 'Очищення шафи управління — кожні 3 міс.'],
                    issues: ['Помилка E12 — збій сигналу енкодера', 'Помилка E27 — відхилення напруги DC-ланки', 'Помилка E43 — перегрів IGBT модуля'],
                    manual: 'Arkel ARCONTROL KM50-T Programmer\'s Guide v5'
                },
                'brakes': {
                    description: 'Подвійне електромагнітне пружинне гальмо, вбудоване у двигун AM-серії. Відповідає EN 81-20 та EN 81-50.',
                    specs: [
                        { label: 'Тип', value: 'EM spring-set, подвійне' },
                        { label: 'Напруга котушки', value: '230 VDC' },
                        { label: 'Зусилля', value: '2× 350 N·m' },
                        { label: 'Зазор', value: '0.25 – 0.50 мм' },
                    ],
                    maintenance: ['Перевірка зазору — кожні 3 міс.', 'Перевірка мікроперемикачів BS — щомісяця', 'Заміна накладок при зносі > 1 мм'],
                    issues: ['Гальмо не відпускає — знижена напруга котушки', 'Гальмо дзвенить — зазор занадто великий'],
                    manual: 'Arkel Brake Adjustment & Safety Manual AR-BRK-21'
                },
                'safetySystem': {
                    description: 'Система безпеки ARKEL SafeGuard: OSG (обмежувач швидкості), прогресивний вловлювач, буфери EN 81-20, ETSL через ARCONTROL.',
                    specs: [
                        { label: 'OSG', value: 'Arkel SG-100V / SG-120V' },
                        { label: 'Вловлювач', value: 'Прогресивний, EN 81-50' },
                        { label: 'Буфер', value: 'Polyurethane, EN 81-20' },
                        { label: 'ETSL', value: 'Через ARCONTROL (software)' },
                    ],
                    maintenance: ['Тест OSG + вловлювача — раз на рік', 'Перевірка буферів шахти — кожні 6 міс.', 'Тест ETSL-функції — кожні 6 міс.'],
                    issues: ['OSG спрацювала помилково — перевірити натяг каната OSG', 'ETSL-TRIP — перекалібрувати позиційний кодер'],
                    manual: 'Arkel SafeGuard Safety System Manual AR-SAF-22'
                },
                'doors': {
                    description: 'Двірні оператори Fermator або Wittur, підключені до ARCONTROL через LIMAX-33CP або CEDES-шину. Типова конфігурація для Португалії.',
                    specs: [
                        { label: 'Оператор', value: 'Fermator VF5 або Wittur ACVF' },
                        { label: 'Ширина', value: '700 – 1000 мм' },
                        { label: 'Завіса', value: 'CEDES Safe Light 3D' },
                        { label: 'Час циклу', value: '2.8 – 3.8 с' },
                    ],
                    maintenance: ['Змащення рейок напрямних — кожні 3 міс.', 'Перевірка гумових буферів — раз на рік', 'Калібрування оператора — після ТО'],
                    issues: ['Двері не закриваються повністю — замінити гумові буфери', 'Помилка LIMAX — перевірити кріплення магнітної стрічки'],
                    manual: 'Fermator VF5 Operator Service Manual + Arkel Door Integration AR-DOR-21'
                }
            },

            'model8': { // Edel Elevadores
                'hydraulicUnit': {
                    description: 'Гідростанція Edel з насосним агрегатом Bucher Hydraulics або BERINGER. Прямодіючий гідравлічний привод без редуктора. Типова установка в Португалії для 2–6 поверхів.',
                    specs: [
                        { label: 'Тип приводу', value: 'Гідравлічний, прямодіючий' },
                        { label: 'Насос', value: 'Bucher QX / BERINGER VP серія' },
                        { label: 'Тиск', value: '80 – 160 бар (залежно від вантажу)' },
                        { label: 'Мастило', value: 'ENV46 або Biodegradable HLP46' },
                        { label: 'Ємність бака', value: '80 – 250 л' },
                        { label: 'Вантажопідйомність', value: '320 – 1600 кг' },
                        { label: 'Швидкість', value: '0.63 – 1.0 м/с' },
                    ],
                    maintenance: ['Перевірка рівня масла — щомісяця', 'Заміна мастила — кожні 2 роки або 10 000 год.', 'Перевірка герметичності гідроциліндра — кожні 3 міс.', 'Чищення фільтра — кожні 6 міс.', 'Перевірка клапанів безпеки — раз на рік'],
                    issues: ['Витік масла під циліндром — знос ущільнень поршня', 'Повільне підняття — засмічений фільтр або низький рівень масла', 'Дрейф кабіни вниз — внутрішній витік клапана утримання'],
                    manual: 'Edel Hydraulic Unit Service Manual EDL-HYD-21'
                },
                'controlSystem': {
                    description: 'Контролер Edel базується на платформі Löhnert Elektronik або власній PCB-стійці. VVVF-перетворювач Schneider Electric ATV312 для управління насосним агрегатом.',
                    specs: [
                        { label: 'Контролер', value: 'Edel ELC-300 або Löhnert LE400' },
                        { label: 'Частотник', value: 'Schneider ATV312 або Siemens G120' },
                        { label: 'Протокол', value: 'CAN або RS-485 Modbus' },
                        { label: 'Зупинок', value: 'до 16' },
                        { label: 'Живлення', value: '1×230 V або 3×400 V / 50 Hz' },
                    ],
                    maintenance: ['Перевірка журналу — щомісяця', 'Очищення шафи — кожні 3 міс.', 'Резервна копія конфігурації — після змін'],
                    issues: ['Помилка A-HYD01 — тиск не досягнуто за час', 'Помилка A-LVL02 — кабіна не на рівні поверху', 'Помилка A-OVT — перегрів мастила (> 70°C)'],
                    manual: 'Edel ELC-300 Controller Manual EDL-CTRL-20'
                },
                'safetySystem': {
                    description: 'Система безпеки гідравлічного ліфта Edel: клапан розриву трубопроводу (pipe-rupture valve), обмежувач швидкості EN 81-20, ETSL.',
                    specs: [
                        { label: 'Клапан розриву', value: 'Sun Hydraulics CBCA або HAWE' },
                        { label: 'OSG', value: 'Dynatech або KÃ¼bler SG-50' },
                        { label: 'Буфер', value: 'Гумовий, EN 81-20' },
                        { label: 'Стандарт', value: 'EN 81-2:1998 + A3:2009' },
                    ],
                    maintenance: ['Тест клапана розриву — раз на рік', 'Перевірка вловлювача — раз на рік', 'Тест аварійного опускання — кожні 6 міс.'],
                    issues: ['Кабіна опускається при простої — внутрішній витік клапана або поршня', 'Клапан розриву спрацьовує помилково — відрегулювати тарування'],
                    manual: 'Edel Safety Systems Manual EDL-SAF-21'
                },
                'doors': {
                    description: 'Двері Fermator або SELCOM із напівавтоматичним або автоматичним оператором. Типово: розсувні, центральне відкриття.',
                    specs: [
                        { label: 'Оператор', value: 'Fermator VF5 або SELCOM SUPRA' },
                        { label: 'Тип', value: 'Автоматичний, центральне відкриття' },
                        { label: 'Ширина', value: '700 – 900 мм' },
                        { label: 'Завіса', value: 'Riedel FB-200 або SafeLight 2D' },
                    ],
                    maintenance: ['Змащення — кожні 3 міс.', 'Перевірка завіси — щомісяця', 'Регулювання зусилля закриття — раз на рік'],
                    issues: ['Двері відчиняються самостійно — збій датчика кабіни на рівні', 'Завіса не реагує — забруднені лінзи або зсув суппорта'],
                    manual: 'Fermator VF5 + Edel Door Integration EDL-DOR-20'
                }
            },

            'model9': { // Megom 2000
                'hydraulicUnit': {
                    description: 'Гідростанція Megom 2000 з агрегатом BERINGER або власним MEGOM HPS-серії. Характерна для невисоких будівель (2–4 поверхи) у Лісабоні та Порту.',
                    specs: [
                        { label: 'Тип', value: 'Гідравлічний прямодіючий' },
                        { label: 'Насос', value: 'MEGOM HPS-80 або BERINGER VP22' },
                        { label: 'Тиск', value: '60 – 140 бар' },
                        { label: 'Мастило', value: 'HLP46 мінеральне або HETG 46 біо' },
                        { label: 'Ємність бака', value: '60 – 160 л' },
                        { label: 'Вантажопідйомність', value: '250 – 1000 кг' },
                        { label: 'Швидкість', value: '0.50 – 0.63 м/с' },
                    ],
                    maintenance: ['Рівень мастила — щомісяця', 'Заміна мастила — раз на 2 роки', 'Заміна ущільнень — за потребою або кожні 5 років', 'Очищення фільтрів — кожні 6 міс.', 'Тиск і герметичність — раз на рік'],
                    issues: ['Кабіна не піднімається до потрібного поверху — знос насоса або засмічений фільтр', 'Витік масла з ущільнень штока — зношені манжети', 'Стуки при пуску — повітря у гідравлічному контурі'],
                    manual: 'Megom 2000 HPS Hydraulic Service Manual MG-HYD-20'
                },
                'controlSystem': {
                    description: 'Контролер Megom 2000 MCP-200 — власна розробка на базі PLC Siemens S7-200 SMART. Режими: автоматичний, ревізія, аварійне опускання.',
                    specs: [
                        { label: 'Контролер', value: 'Megom MCP-200' },
                        { label: 'Базова PLC', value: 'Siemens S7-200 SMART' },
                        { label: 'Дисплей', value: 'LCD 4-рядки + STEP7 Micro/Win' },
                        { label: 'Протокол', value: 'RS-485 ModbusRTU' },
                        { label: 'Зупинок', value: 'до 8' },
                    ],
                    maintenance: ['Резервна копія PLC — після змін', 'Зчитування журналу аварій — щомісяця', 'Перевірка живлення 24VDC — кожні 3 міс.'],
                    issues: ['STOP F10 — збій давача рівня', 'STOP F22 — перевантаження насосного агрегату', 'Контролер зависає — перевірити живлення 24V та RTC-батарею'],
                    manual: 'Megom MCP-200 Controller & PLC Manual MG-CTRL-19'
                },
                'safetySystem': {
                    description: 'Система безпеки Megom 2000: клапан обмеження тиску, pipe-rupture valve HAWE, механічний вловлювач і OSG EN 81-2.',
                    specs: [
                        { label: 'Pipe-rupture valve', value: 'HAWE RHC-25 або Sun CBCA' },
                        { label: 'OSG', value: 'Dynatech SG-40' },
                        { label: 'Аварійне опускання', value: 'Ручне або автоматичне (24V)' },
                        { label: 'Стандарт', value: 'EN 81-2:1998 + NP EN 81-20' },
                    ],
                    maintenance: ['Тест аварійного опускання — кожні 6 міс.', 'Перевірка pipe-rupture valve — раз на рік', 'Контроль вловлювача — раз на рік'],
                    issues: ['Кабіна повільно дрейфує вниз — внутрішній витік клапана HAWE', 'Аварійне опускання не спрацьовує — перевірити соленоїд 24V'],
                    manual: 'Megom 2000 Safety & Hydraulic Valve Manual MG-SAF-19'
                },
                'doors': {
                    description: 'Напівавтоматичні або автоматичні двері SELCOM чи Fermator. Блокування типу Wittur або APRIMATIC.',
                    specs: [
                        { label: 'Тип', value: 'Авто або напівавто, бічне відкриття' },
                        { label: 'Оператор', value: 'SELCOM SUPRA або Fermator EC' },
                        { label: 'Блокування', value: 'Wittur WT300 або APRIMATIC' },
                        { label: 'Ширина', value: '700 – 800 мм' },
                    ],
                    maintenance: ['Змащення механізму — кожні 3 міс.', 'Перевірка блокував дверей — щомісяця', 'Регулювання зазорів — раз на рік'],
                    issues: ['Блокування не знімається — перевірити котушку замка та напругу 230V', 'Двері туго закриваються — знос гумових буферів або засмічення рейки'],
                    manual: 'Megom 2000 Door System Manual MG-DOR-19'
                }
            },

            'model10': { // CTA Elevadores
                'motor': {
                    description: 'Тяговий агрегат CTA на базі Ziehl-Abegg ZAgiva або SIEI ARVO-серії — безредукторний, у шахті (MRL). CTA Elevadores встановлює переважно в Лісабоні та Алгарве.',
                    specs: [
                        { label: 'Тип', value: 'PMSM, безредукторний' },
                        { label: 'Потужність', value: '4 – 15 кВт' },
                        { label: 'Серія', value: 'Ziehl-Abegg ZAgiva або SIEI ARVO' },
                        { label: 'Швидкість', value: '1.0 – 2.5 м/с' },
                        { label: 'Вантажопідйомність', value: '320 – 2000 кг' },
                        { label: 'Напруга', value: '3×400 V / 50 Hz' },
                    ],
                    maintenance: ['Перевірка вібрації — кожні 3 міс.', 'Вимірювання ізоляції — раз на рік', 'Перевірка кріплення шківа — кожні 6 міс.'],
                    issues: ['Нагрів при пікових навантаженнях — перевірити вентиляцію шахти', 'Шум — знос підшипників'],
                    manual: 'Ziehl-Abegg ZAgiva Motor Technical Manual ZA-MRL-22'
                },
                'controlSystem': {
                    description: 'Контролер CTA CTACONTROL-2100 або SIEI ACE3000 — VVVF-привод для тягового ліфта. Підтримує EnDat/SinCos-енкодер, CAN-шину та дистанційний моніторинг.',
                    specs: [
                        { label: 'Контролер', value: 'CTACONTROL-2100 або SIEI ACE3000' },
                        { label: 'Привод', value: 'VVVF, PM motor control' },
                        { label: 'Протокол', value: 'CAN, EnDat 2.2' },
                        { label: 'Зупинок', value: 'до 32' },
                        { label: 'Моніторинг', value: 'CTA Remote Monitor (GSM/IP)' },
                    ],
                    maintenance: ['Зчитування журналу — щомісяця', 'Резервна копія після змін — обов\'язково', 'Тест навчального пробігу — після ТО'],
                    issues: ['Помилка C11 — відхилення швидкості', 'Помилка C34 — збій EnDat-зв\'язку', 'Помилка C52 — перегрів IGBT'],
                    manual: 'CTA CTACONTROL-2100 Service Manual CTA-CTRL-21'
                },
                'brakes': {
                    description: 'Подвійне МП-гальмо з моніторингом стану через CTACONTROL. Відповідає EN 81-20.',
                    specs: [
                        { label: 'Тип', value: 'EM spring-set, MRL-монтаж' },
                        { label: 'Напруга', value: '230 VDC' },
                        { label: 'Зазор', value: '0.30 – 0.55 мм' },
                        { label: 'Контроль', value: 'Мікроперемикач BS1/BS2' },
                    ],
                    maintenance: ['Перевірка зазору — кожні 3 міс.', 'Перевірка BS1/BS2 — щомісяця', 'Змащення осей важелів — раз на рік'],
                    issues: ['Гальмо не відпускає — низька напруга 230V', 'Надмірний знос — збільшений зазор понад 0.55 мм'],
                    manual: 'CTA Brake System Manual CTA-BRK-21'
                },
                'safetySystem': {
                    description: 'Система безпеки CTA SafeElev: OSG Dynatech, прогресивний вловлювач Montanari, буфери EN 81-20. ETSL реалізований через CTACONTROL-2100.',
                    specs: [
                        { label: 'OSG', value: 'Dynatech V100 або Montanari MO-25' },
                        { label: 'Вловлювач', value: 'Montanari progressive' },
                        { label: 'ETSL', value: 'Software у CTACONTROL-2100' },
                        { label: 'Норматив', value: 'EN 81-20, NP EN 81-20' },
                    ],
                    maintenance: ['Тест OSG + вловлювача — раз на рік', 'Тест ETSL — кожні 6 міс.', 'Перевірка буферів ями та перекрою — кожні 6 міс.'],
                    issues: ['OSG не спрацьовує — знос або корозія храповика OSG', 'ETSL-TRIP — рекалібрувати кодер рівня'],
                    manual: 'CTA SafeElev Safety Manual CTA-SAF-21'
                },
                'doors': {
                    description: 'Двері Fermator VVVF або SELCOM SUPRA з контролером, інтегрованим у CTACONTROL. Завіса Riedel або CEDES.',
                    specs: [
                        { label: 'Оператор', value: 'Fermator VVVF або SELCOM SUPRA' },
                        { label: 'Ширина', value: '700 – 1100 мм' },
                        { label: 'Завіса', value: 'CEDES Safe Light 3D або Riedel FB-100' },
                        { label: 'Час циклу', value: '2.5 – 4.0 с' },
                    ],
                    maintenance: ['Змащення — кожні 3 міс.', 'Перевірка завіси — щомісяця', 'Калібрування VVVF-оператора — після ТО'],
                    issues: ['Двері зупиняються в середині ходу — помилка VVVF-оператора', 'Завіса не спрацьовує — перевірити вирівнювання TX/RX'],
                    manual: 'Fermator VVVF Operator Manual + CTA Door Guide CTA-DOR-21'
                }
            },

            'model11': { // Mikrolift
                'motor': {
                    description: 'Компактний двигун Mikrolift ML-Drive або Ziehl-Abegg FI-серія для малих житлових ліфтів (до 4 поверхів). Вбудований у нішу без машинного приміщення.',
                    specs: [
                        { label: 'Тип', value: 'PMSM, компактний MRL' },
                        { label: 'Потужність', value: '1.5 – 5.5 кВт' },
                        { label: 'Вантажопідйомність', value: '150 – 630 кг' },
                        { label: 'Швидкість', value: '0.63 – 1.0 м/с' },
                        { label: 'Напруга', value: '1×230 V або 3×400 V / 50 Hz' },
                    ],
                    maintenance: ['Перевірка шуму/вібрації — кожні 3 міс.', 'Вимірювання ізоляції — раз на рік', 'Перевірка ременя або ланцюга (якщо є) — кожні 6 міс.'],
                    issues: ['Підвищений шум — знос підшипників або ремінного приводу', 'Ліфт не рухається — перевірити термозахист двигуна (overload relay)'],
                    manual: 'Mikrolift ML-Drive Motor Maintenance Manual ML-MOT-22'
                },
                'controlSystem': {
                    description: 'Контролер Mikrolift INTELLIFT-50 або інтегрований блок на базі Omron CP1L. Простий і надійний. Підключення через USB або RS-232.',
                    specs: [
                        { label: 'Контролер', value: 'INTELLIFT-50 або Omron CP1L' },
                        { label: 'Привод', value: 'VVVF або прямий пуск (DOL)' },
                        { label: 'Інтерфейс', value: 'USB / RS-232' },
                        { label: 'Зупинок', value: 'до 8' },
                        { label: 'Живлення', value: '1×230 V або 3×400 V' },
                    ],
                    maintenance: ['Журнал подій — щомісяця', 'Резервна копія — після будь-яких змін', 'Перевірка живлення 24V — кожні 3 міс.'],
                    issues: ['Ліфт зупинився між поверхами — перевірити сигнал рівня (leveling sensor)', 'Дисплей не відображає поверх — збій RS-485'],
                    manual: 'Mikrolift INTELLIFT-50 Controller Manual ML-CTRL-22'
                },
                'safetySystem': {
                    description: 'Система безпеки Mikrolift: OSG Dynatech або KÃ¼bler, клиновий вловлювач (EN 81-20), паракетні буфери, захист від перевантаження (load sensor).',
                    specs: [
                        { label: 'OSG', value: 'Dynatech SG-30 або Kübler KG-40' },
                        { label: 'Вловлювач', value: 'Клиновий (residential EN 81-20)' },
                        { label: 'Датчик навант.', value: 'Strain gauge або пружинний' },
                        { label: 'Стандарт', value: 'EN 81-20 / NP EN 81-20' },
                    ],
                    maintenance: ['Тест OSG + вловлювача — раз на рік', 'Перевірка датчика навантаження — кожні 6 міс.', 'Перевірка буферів — кожні 6 міс.'],
                    issues: ['Ліфт не пускається при нормальному навантаженні — збій/зміщення датчика навантаження', 'OSG не підтягується після спрацювання — перевірити натяг каната OSG'],
                    manual: 'Mikrolift Safety System Manual ML-SAF-22'
                },
                'doors': {
                    description: 'Напівавтоматичні розсувні двері або телескопічні автоматичні, оператор Fermax або APRIMATIC. Характерні для малих житлових ліфтів.',
                    specs: [
                        { label: 'Тип', value: 'Авто або напівавто розсувні' },
                        { label: 'Оператор', value: 'APRIMATIC TS200 або Fermax' },
                        { label: 'Ширина', value: '600 – 800 мм' },
                        { label: 'Завіса', value: 'SafeRay 2D або мікроперемикач' },
                    ],
                    maintenance: ['Змащення рейки — кожні 3 міс.', 'Перевірка замків — щомісяця', 'Регулювання сили закриття — раз на рік'],
                    issues: ['Двері відкриваються самостійно — знос або збій замка кабінних дверей', 'Оператор не відпрацьовує до кінця — перевірити кінцевий вимикач'],
                    manual: 'Mikrolift Door Installation & Service Manual ML-DOR-22'
                }
            },

            'model12': { // Heytech
                'motor': {
                    description: 'Двигун Heytech EcoTraction (PM MRL) або Leroy-Somer серії DYNEO — безредукторний, вбудований у шахту. Встановлюється в житлових та малих комерційних будівлях Португалії.',
                    specs: [
                        { label: 'Тип', value: 'PMSM, безредукторний' },
                        { label: 'Серія', value: 'Heytech EcoTraction або Leroy-Somer DYNEO' },
                        { label: 'Потужність', value: '3 – 12 кВт' },
                        { label: 'Швидкість', value: '1.0 – 1.6 м/с' },
                        { label: 'Вантажопідйомність', value: '320 – 1000 кг' },
                        { label: 'Напруга', value: '3×380–415 V / 50 Hz' },
                    ],
                    maintenance: ['Перевірка підшипників — кожні 3 міс.', 'Вимірювання ізоляції обмоток — раз на рік', 'Перевірка шківа на знос — кожні 6 міс.'],
                    issues: ['Перегрів — засмічені вентиляційні ребра або неправильна ориентація монтажу', 'Нерівномірний хід — знос канатів або перекіс шківа'],
                    manual: 'Heytech EcoTraction Motor Manual HT-MOT-23'
                },
                'controlSystem': {
                    description: 'Контролер Heytech HTCTRL-500 (VVVF) на базі частотника Danfoss FC302 або Schneider ATV650. Підключення лифту до Heytech Connect (IoT-хмара) через GSM/IP.',
                    specs: [
                        { label: 'Контролер', value: 'Heytech HTCTRL-500' },
                        { label: 'Частотник', value: 'Danfoss FC302 або Schneider ATV650' },
                        { label: 'Протокол', value: 'CANopen, ModbusTCP' },
                        { label: 'Зупинок', value: 'до 24' },
                        { label: 'IoT', value: 'Heytech Connect (4G/Wi-Fi)' },
                    ],
                    maintenance: ['Зчитування журналу HTCTRL — щомісяця', 'Оновлення ПЗ через Heytech Connect — автоматично', 'Очищення шафи — кожні 3 міс.'],
                    issues: ['Помилка HT-E05 — відхилення швидкості > 5%', 'Помилка HT-E14 — збій зв\'язку CAN', 'Heytech Connect offline — перевірити SIM або модуль 4G'],
                    manual: 'Heytech HTCTRL-500 Controller Service Manual HT-CTRL-23'
                },
                'brakes': {
                    description: 'Вбудоване подвійне EM-гальмо Heytech EcoBrake — пружинного типу з моніторингом зношеності накладок через HTCTRL.',
                    specs: [
                        { label: 'Тип', value: 'EM spring-set, подвійне (EcoBrake)' },
                        { label: 'Напруга котушки', value: '230 VDC' },
                        { label: 'Зазор', value: '0.25 – 0.45 мм' },
                        { label: 'Контроль', value: 'Мікроперемикач + wear indicator' },
                    ],
                    maintenance: ['Перевірка зазору — кожні 3 міс.', 'Перевірка wear indicator — щомісяця', 'Заміна накладок при зносі > 1.5 мм'],
                    issues: ['Гальмо дзвенить — зазор >0.50 мм', 'Помилка HT-B01 — мікроперемикач не підтверджує відпускання гальма'],
                    manual: 'Heytech EcoBrake Service Manual HT-BRK-23'
                },
                'safetySystem': {
                    description: 'Безпека Heytech SafeCore SIL2: двоканальний OSG, прогресивний вловлювач Montanari або Dynatech, ETSL через HTCTRL-500.',
                    specs: [
                        { label: 'Рівень', value: 'SIL 2 (EN 62061)' },
                        { label: 'OSG', value: 'Heytech SG-150 або Dynatech V80' },
                        { label: 'Вловлювач', value: 'Montanari progressive або Dynatech PC-35' },
                        { label: 'ETSL', value: 'HTCTRL-500 software + encoder' },
                        { label: 'Стандарт', value: 'EN 81-20, NP EN 81-20' },
                    ],
                    maintenance: ['Тест OSG + вловлювача — раз на рік', 'Тест ETSL — кожні 6 міс.', 'Перевірка буферів ями — кожні 6 міс.'],
                    issues: ['SafeCore-ALRM01 — помилкова активація — перевірити натяг каната OSG', 'ETSL-TRIP — рекалібрувати кодер через HTCTRL Service Mode'],
                    manual: 'Heytech SafeCore SIL2 Safety Manual HT-SAF-23'
                },
                'doors': {
                    description: 'Двері Fermator VVVF або власна серія Heytech AutoDoor із завісою CEDES або Riedel. Оператор інтегрований у HTCTRL-500.',
                    specs: [
                        { label: 'Оператор', value: 'Heytech AutoDoor або Fermator VVVF' },
                        { label: 'Тип', value: 'Авто, центральне або бічне відкриття' },
                        { label: 'Ширина', value: '700 – 900 мм' },
                        { label: 'Завіса', value: 'CEDES 3D або Riedel FB-200' },
                        { label: 'Час', value: '2.8 – 4.0 с' },
                    ],
                    maintenance: ['Змащення роликів і рейки — кожні 3 міс.', 'Перевірка завіси — щомісяця', 'Калібрування AutoDoor — після ТО'],
                    issues: ['Помилка DOR-03 — дверний оператор не повертає сигнал закриття', 'Двері туго відкриваються — знос верхнього ролика або засмічення рейки'],
                    manual: 'Heytech AutoDoor Service Manual HT-DOR-23'
                }
            }
        };

        const base = baseComponents[componentId] || { name: componentId, icon: 'fas fa-cube', color: '#888888' };

        // Якщо є специфічні дані для моделі — мерджимо
        const modelData = (modelId && modelComponentData[modelId] && modelComponentData[modelId][componentId])
            ? modelComponentData[modelId][componentId]
            : null;

        return {
            ...base,
            description: modelData?.description || `Компонент: ${base.name}`,
            specs: modelData?.specs || [],
            maintenance: modelData?.maintenance || [],
            issues: modelData?.issues || [],
            manual: modelData?.manual || null
        };
    }

    showComponentManual(componentId, modelId) {
        const info = this.getComponentInfo(componentId, modelId);
        if (info.manual) {
            this.showNotification(`Мануал: ${info.manual}`, 'info');
        } else {
            this.showNotification(`Документація не знайдена`, 'warning');
        }
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

    // ===================================
    // WEBSOCKET REAL-TIME ФУНКЦІОНАЛЬНІСТЬ
    // ===================================

    broadcastStatus() {
        if (this.wsClient) {
            this.wsClient.send({
                type: 'ar_status_update',
                data: {
                    userId: this.userId,
                    isARActive: this.isARActive,
                    currentModel: this.currentModel?.name,
                    activeTool: this.activeTool,
                    annotationsCount: this.annotations.length,
                    timestamp: new Date().toISOString()
                }
            });
        }
    }

    handleRemoteInstruction(data) {
        console.log('📱 Отримано віддалену інструкцію:', data);
        
        const { action, payload } = data;
        
        switch (action) {
            case 'start_ar_session':
                this.startARSession(payload.modelId);
                break;
            case 'stop_ar_session':
                this.stopARSession();
                break;
            case 'add_annotation':
                this.addRemoteAnnotation(payload);
                break;
            case 'highlight_component':
                this.highlightComponent(payload.componentId, payload.color);
                break;
            case 'emergency_stop':
                this.handleEmergencyStop();
                break;
        }
    }

    handleLiftStatusChange(data) {
        console.log('🔄 Статус ліфта змінено:', data);
        this.showNotification(`Ліфт ${data.liftId}: ${data.status}`, 
            data.status === 'error' ? 'error' : 'info');
    }

    handleCollaboration(data) {
        console.log('👥 Колаборативні дані:', data);
        const { type, user, payload } = data;
        
        if (type === 'annotation_added') {
            this.addCollaborativeAnnotation(payload, user);
        }
    }

    addCollaborativeAnnotation(annotation, user) {
        const collaborativeAnnotation = {
            ...annotation,
            collaborator: user.firstName,
            isCollaborative: true,
            timestamp: new Date().toISOString()
        };
        
        this.annotations.push(collaborativeAnnotation);
        this.showNotification(`${user.firstName} додав аннотацію`, 'info');
    }

    handleEmergencyStop() {
        if (this.isARActive) {
            this.stopARSession();
        }
        this.showNotification('Аварійна зупинка AR сесії', 'error');
    }
}

// Автоматична ініціалізація
$(document).ready(function() {
    window.arHelper = new ARHelper();
});