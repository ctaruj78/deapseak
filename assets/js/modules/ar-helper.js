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
        setInterval(() => this.broadcastStatus(), 30000); // A cada 30 segundos

        // Синхронізація аннотацій
        // TODO: Реалізувати метод syncAnnotations()
        // this.syncAnnotations();
    }

    loadUserInfo() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser')) || { 
                firstName: 'Técnico'
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
                    <div class="component-item" data-component="${componentId}" style="cursor:pointer" title="Clique para ver detalhes">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <i class="${componentInfo.icon} mr-2"></i>
                                <strong>${componentInfo.name}</strong>
                            </div>
                            <div class="component-status">
                                <span class="badge badge-success">Ativo</span>
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
                    <p>Escolha o modelo do elevador</p>
                </div>
            `);
        }
    }

    checkARSupport() {
        const supported = this.isWebXRSupported() || this.isARJSSupported();
        if (!supported) {
            $('#startAR, #startARBtn').prop('disabled', true)
                .text('AR não suportado')
                .removeClass('btn-primary').addClass('btn-secondary');
            
            this.showNotification('AR não suportado no seu dispositivo', 'error');
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
                this.showNotification('AR não suportado no seu dispositivo', 'error');
                return;
            }

            // Перевірка дозволу камери
            if (!await this.requestCameraPermission()) {
                this.showNotification('Permissão da câmara não concedida', 'error');
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

            this.showNotification('Modo AR ativado 🚀', 'success');
            this.logAREvent('ar_session_start');

        } catch (error) {
            console.error('Помилка запуску AR:', error);
            this.showNotification('Erro ao iniciar AR: ' + error.message, 'error');
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

            // A cena só é criada ao iniciar o AR — assim a câmara não é pedida ao abrir a página
            if (!document.querySelector('#arScene a-scene')) {
                $('#arScene').prepend(`
                    <a-scene embedded arjs="sourceType: webcam; debugUIEnabled: false;">
                        <a-marker preset="hiro">
                            <a-box position="0 0.5 0" material="color: red;"></a-box>
                        </a-marker>
                        <a-entity camera></a-entity>
                    </a-scene>`);
            }

            // Ініціалізація AR.js сцени
            if (typeof AFRAME !== 'undefined') {
                this.setupAFrameScene();
            }

            console.log('AR сцена ініціалізована');
        } catch (error) {
            throw new Error('Erro ao inicializar a cena AR: ' + error.message);
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
            throw new Error('Modelo não encontrado');
        }

        this.currentModel = this.models[modelId];
        
        // Імітація завантаження 3D моделі
        this.showNotification(`A carregar modelo: ${this.currentModel.name}`, 'info');
        
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

        this.showNotification(`${this.getToolName(toolType)} ativado`, 'info');
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
        this.showToolHint('Clique num ponto para iniciar a medição e depois no ponto final');
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

        this.showToolHint('Clique no ponto final ou prima Esc para cancelar');
    }

    endMeasurement(point) {
        if (!this.measureStartPoint) return;

        const distance = this.calculateDistance(this.measureStartPoint, point);
        const measurement = {
            id: Date.now(),
            start: this.measureStartPoint,
            end: point,
            distance: distance,
            unit: 'cm' // É possível adicionar seleção de unidades
        };

        this.measurements.push(measurement);
        this.isMeasuring = false;
        this.measureStartPoint = null;

        // Візуально показуємо лінію вимірювання
        this.showMeasurementLine(measurement);

        // Показуємо результат
        this.showMeasurementResult(measurement);

        this.showToolHint('Medição concluída. Clique para uma nova medição');
    }

    cancelMeasurement() {
        if (this.isMeasuring) {
            this.clearMeasurementPoints();
            this.isMeasuring = false;
            this.measureStartPoint = null;
            this.showToolHint('Medição cancelada');
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

        this.showToolHint('Clique num ponto para adicionar uma anotação');
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
        const annotationText = prompt('Introduza o texto da anotação:');
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

        this.showToolHint('Clique num ponto para criar um hotspot');
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
        const hotspotTitle = prompt('Introduza o nome do hotspot:');
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
            <small>Criado em: ${hotspot.timestamp.toLocaleString('pt-PT')}</small>
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
            'measure': 'Medição',
            'annotation': 'Anotações',
            'hotspot': 'Hotspots'
        };
        return names[toolType] || toolType;
    }

    async takeScreenshot() {
        try {
            if (!this.isARActive) {
                this.showNotification('Ative primeiro o modo AR', 'warning');
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

            this.showNotification('Captura guardada 📸', 'success');
            this.logAREvent('screenshot_taken');

        } catch (error) {
            console.error('Помилка знімка:', error);
            this.showNotification('Erro ao capturar imagem', 'error');
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
        localStorage.setItem('ar_screenshots', JSON.stringify(screenshots.slice(0, 10))); // Guarda as últimas 10
    }

    updateScreenshotsGallery() {
        const gallery = $('#screenshotsGallery');
        gallery.empty();

        if (this.screenshots.length === 0) {
            gallery.html(`
                <div class="text-center text-muted py-5 w-100">
                    <i class="fas fa-camera fa-3x mb-2"></i>
                    <p>Ainda não há capturas</p>
                </div>
            `);
            return;
        }

        this.screenshots.forEach((screenshot, index) => {
            if (index >= 6) return; // Máximo de 6 capturas

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
            ? `<div class="mt-2"><strong><i class="fas fa-tools mr-1 text-primary"></i>Manutenção:</strong><ul class="mb-1 mt-1 pl-3">
                ${info.maintenance.map(m => `<li class="small">${m}</li>`).join('')}
               </ul></div>`
            : '';

        const issuesHtml = info.issues.length > 0
            ? `<div class="mt-2"><strong><i class="fas fa-exclamation-triangle mr-1 text-warning"></i>Avarias típicas:</strong><ul class="mb-1 mt-1 pl-3">
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
            'motor': { name: 'Motor', icon: 'fas fa-cogs', color: '#dc3545' },
            'controlSystem': { name: 'Sistema de comando', icon: 'fas fa-microchip', color: '#007bff' },
            'brakes': { name: 'Sistema de travagem', icon: 'fas fa-stop-circle', color: '#28a745' },
            'safetySystem': { name: 'Sistema de segurança', icon: 'fas fa-shield-alt', color: '#ffc107' },
            'doors': { name: 'Mecanismos de porta', icon: 'fas fa-door-open', color: '#6f42c1' },
            'display': { name: 'Visor e indicação', icon: 'fas fa-tv', color: '#17a2b8' },
            'emergency': { name: 'Sistema de emergência', icon: 'fas fa-exclamation-triangle', color: '#fd7e14' },
            'aiModule': { name: 'Módulo IA', icon: 'fas fa-brain', color: '#e83e8c' },
            'energySaver': { name: 'Poupança de energia', icon: 'fas fa-bolt', color: '#20c997' },
            'smartControl': { name: 'Controlo inteligente', icon: 'fas fa-magic', color: '#6c757d' },
            'hydraulicUnit': { name: 'Central hidráulica', icon: 'fas fa-oil-can', color: '#795548' }
        };

        // Повна технічна база по моделях
        const modelComponentData = {
            'model1': { // Otis Gen2
                'motor': {
                    description: 'Motor síncrono sem redutor, de ímanes permanentes (PMSM). Integrado no conjunto da polia, sem casa das máquinas.',
                    specs: [
                        { label: 'Tipo', value: 'PMSM, sem redutor' },
                        { label: 'Potência', value: '7.5 / 11 / 15 kW' },
                        { label: 'Velocidade da cabine', value: '1.0 – 1.75 m/s' },
                        { label: 'Carga nominal', value: '480 – 1275 kg' },
                        { label: 'Classe de isolamento', value: 'F (155°C)' },
                        { label: 'Grau de proteção', value: 'IP21' },
                    ],
                    maintenance: ['Verificar vibração/ruído — mensal', 'Verificar aperto dos parafusos de fixação — de 6 em 6 meses', 'Medir isolamento dos enrolamentos — anual', 'Substituir rolamentos — a cada 5 anos ou 20 000 h'],
                    issues: ['Sobreaquecimento por obstrução das aberturas de ventilação', 'Vibração por desgaste dos rolamentos', 'Erros do encoder por cabo danificado'],
                    manual: 'Otis Gen2 MRL Motor Manual Rev.6'
                },
                'controlSystem': {
                    description: 'Controlador OTIS OVF20CR (acionamento VVVF). Integrado no quadro de comando, com diagnóstico através da porta RS-485.',
                    specs: [
                        { label: 'Tipo de acionamento', value: 'VVVF (tensão/frequência variáveis)' },
                        { label: 'Alimentação', value: '3×400 V / 50 Hz' },
                        { label: 'Protocolo', value: 'CANopen, RS-485' },
                        { label: 'Máx. paragens', value: '64' },
                        { label: 'Software', value: 'OVF20CR v4.x' },
                    ],
                    maintenance: ['Verificar registo de erros — mensal', 'Limpar ventilação do quadro — de 3 em 3 meses', 'Cópia de segurança dos parâmetros — após qualquer alteração', 'Teste de viagem de aprendizagem — após a manutenção'],
                    issues: ['Erro E221 — falha do sinal do sensor de nível', 'Erro E541 — temperatura excessiva do acionamento', 'Falha do barramento CAN por oxidação dos conectores'],
                    manual: 'OVF20CR Controller Programming Guide'
                },
                'brakes': {
                    description: 'Conjunto eletromagnético de duplo travão integrado no motor. Conforme a EN 81-20.',
                    specs: [
                        { label: 'Tipo', value: 'Eletromagnético, spring-set' },
                        { label: 'Tensão de libertação', value: '230 VDC' },
                        { label: 'Força de aperto', value: '2× 400 N·m' },
                        { label: 'Folga', value: '0.3 – 0.5 mm' },
                    ],
                    maintenance: ['Verificar folga das pastilhas de travão — de 3 em 3 meses', 'Verificar atuação do microinterruptor — mensal', 'Lubrificar os eixos — anual', 'Substituir pastilhas com desgaste > 1 mm'],
                    issues: ['Vibração na travagem — desgaste das pastilhas', 'O travão não liberta — tensão baixa na bobina', 'Folga demasiado pequena — sobreaquecimento das pastilhas'],
                    manual: 'Otis Gen2 Brake Adjustment Manual'
                },
                'safetySystem': {
                    description: 'Paraquedas da cabine (limitador de velocidade + paraquedas progressivo), amortecedores, fins de curso.',
                    specs: [
                        { label: 'Limitador de velocidade', value: 'Atua a 1.4× Vnom' },
                        { label: 'Tipo de paraquedas', value: 'Progressivo' },
                        { label: 'Amortecedores', value: 'Poliméricos, EN 81-20 §5.8' },
                        { label: 'Sobrecarga', value: 'Sensor na plataforma da cabine' },
                    ],
                    maintenance: ['Verificar paraquedas e limitador — anual', 'Lubrificar o cabo do limitador — de 6 em 6 meses', 'Teste de paragem de emergência — na manutenção anual'],
                    issues: ['Paraquedas atua sem motivo — desgaste do cabo', 'O amortecedor não regressa — polímero danificado'],
                    manual: 'Otis Gen2 Safety System Manual'
                },
                'doors': {
                    description: 'Portas de abertura central com operador Wittur NOVA 2000. Cortina de segurança fotoelétrica.',
                    specs: [
                        { label: 'Tipo', value: 'Abertura central, 2 folhas' },
                        { label: 'Operador', value: 'Wittur NOVA 2000' },
                        { label: 'Tempo de abertura', value: '≤ 2.5 s' },
                        { label: 'Cortina de segurança', value: 'Proteção total, 80 sensores' },
                        { label: 'Ligação de força', value: 'Conjunto WID (sem chave)' },
                    ],
                    maintenance: ['Lubrificar roletes e guias — de 3 em 3 meses', 'Verificar cortina fotoelétrica — mensal', 'Ajustar a ligação de força — em caso de bloqueio', 'Substituir a correia do operador — de 3 em 3 anos'],
                    issues: ['As portas abrem lentamente — desgaste da correia', 'Erro Door Zone — falha do sensor DVZ', 'Abertura parcial — cortina suja'],
                    manual: 'Wittur NOVA 2000 Operator Manual'
                }
            },
            'model2': { // Schindler 3300
                'motor': {
                    description: 'Motor de ímanes permanentes Schindler EcoGear. Construção sem redutor e sem casa das máquinas (MRL).',
                    specs: [
                        { label: 'Tipo', value: 'PMM (ímanes permanentes), MRL' },
                        { label: 'Potência', value: '11 / 15 kW' },
                        { label: 'Velocidade da cabine', value: '1.0 / 1.6 m/s' },
                        { label: 'Carga nominal', value: '320 – 1000 kg' },
                        { label: 'Classe de isolamento', value: 'F' },
                        { label: 'Arrefecimento', value: 'convecção natural (IC410)' },
                    ],
                    maintenance: ['Verificar nível de vibração — de 3 em 3 meses', 'Apertar ligações dos terminais — anual', 'Verificar isolamento dos enrolamentos com megóhmetro — anual', 'Substituir rolamentos — após 40 000 h ou 10 anos'],
                    issues: ['Aquecimento com carga > 80% — verificar ventilação da caixa', 'Pancada no arranque — verificar assentamento da polia', 'Código F50 — erro do resolver (verificar o cabo)'],
                    manual: 'Schindler 3300 Motor Technical Manual SV-3301'
                },
                'controlSystem': {
                    description: 'Controlador Schindler ACVF3 Drive com inversor. Quadro na parte superior da caixa. Diagnóstico através do Schindler ADMS.',
                    specs: [
                        { label: 'Tipo de acionamento', value: 'VVVF, ACVF3' },
                        { label: 'Alimentação', value: '3×400 V / 50 Hz ±10%' },
                        { label: 'Protocolo de comunicação', value: 'Schindler PBUS (RS-485)' },
                        { label: 'Zonas de paragem', value: 'até 40' },
                        { label: 'Diagnóstico', value: 'Schindler ADMS / IMOS' },
                    ],
                    maintenance: ['Ler códigos de erro através do IMOS — mensal', 'Verificar ligações de contacto — de 6 em 6 meses', 'Atualizar software — conforme recomendação da Schindler', 'Viagem de aprendizagem após a manutenção'],
                    issues: ['Erro 3312 — desvio da posição da cabine', 'Erro 5011 — falha do controlador de portas', 'Sobreaquecimento dos transístores IGBT em arranques frequentes'],
                    manual: 'Schindler 3300 ACVF3 Controller Manual'
                },
                'brakes': {
                    description: 'Dois travões eletromagnéticos independentes integrados no motor. Monitorização por microinterruptores.',
                    specs: [
                        { label: 'Tipo', value: 'Eletromagnético bi-stable' },
                        { label: 'Tensão', value: '100 VDC (retenção 50 VDC)' },
                        { label: 'Folga das pastilhas', value: '0.25 – 0.45 mm' },
                        { label: 'Espessura mín. da pastilha', value: '≥ 2 mm' },
                    ],
                    maintenance: ['Medir a folga — de 3 em 3 meses', 'Verificar microinterruptores — mensal', 'Lubrificar as molas — anual (apenas lubrificante seco)', 'Substituir os revestimentos quando atingirem o limite de desgaste'],
                    issues: ['Bloqueio a baixas temperaturas — condensação na bobina', 'Ruído na libertação — desgaste irregular dos revestimentos', 'Erro BRS — o sinal do microinterruptor não chega'],
                    manual: 'Schindler 3300 Brake Service Manual SV-3304'
                },
                'doors': {
                    description: 'Portas de correr com operador Sematic S600. Sistema EDF (ElectroDynamic Force) para movimento suave.',
                    specs: [
                        { label: 'Tipo', value: '2 painéis, telescópicas ou centrais' },
                        { label: 'Operador', value: 'Sematic S600' },
                        { label: 'Tempo de abertura', value: '2.0 – 3.0 s' },
                        { label: 'Cortina de segurança', value: 'Multiscan 40/80 zonas' },
                        { label: 'Comunicação', value: 'CAN Bus entre operador e controlador' },
                    ],
                    maintenance: ['Lubrificar a guia superior (silicone) — de 3 em 3 meses', 'Limpar sensores da cortina — mensal', 'Verificar o dispositivo tensor da folha inferior — de 6 em 6 meses', 'Calibrar o operador S600 após substituição'],
                    issues: ['Erros do sensor EDF — sujidade nos patins', 'Batida das portas — desgaste do limitador de curso', 'Erro CAN — cabo cortado ou demasiado comprido'],
                    manual: 'Schindler 3300 Door System Manual SV-3306'
                },
                'controlSystem_extra': {
                    description: 'IMOS (Intelligent Monitoring) — interface integrada para leitura de registos, configuração de zonas e atualização de software.',
                    specs: [],
                    maintenance: ['Ligar o portátil através de adaptador RS-232', 'Introduzir a palavra-passe de técnico nível L2', 'Menu: Diagnostics → Error Log → Clear'],
                    issues: [],
                    manual: 'Schindler IMOS User Guide v3.2'
                },
                'display': {
                    description: 'Indicador LCD de piso e indicador na cabine. COP/LOP com botões iluminados e aviso por voz.',
                    specs: [
                        { label: 'Tipo de visor COP', value: 'LCD 7 segmentos + matriz de pontos' },
                        { label: 'Interface LOP', value: 'CAN Bus' },
                        { label: 'Mensagens de voz', value: 'Cartão SD, WAV/MP3' },
                        { label: 'Botões', value: 'Iluminação LED 24V' },
                    ],
                    maintenance: ['Limpar botões e visores — mensal', 'Verificar terminais dos cabos do LOP — anual', 'Substituir o cartão SD em caso de áudio danificado'],
                    issues: ['Os botões de piso não acendem — LED queimado ou alimentação cortada', 'O visor não mostra o piso — falha do endereço CAN do LOP', 'Sem áudio — cartão SD danificado ou volume baixo'],
                    manual: 'Schindler COP/LOP Technical Manual SV-3308'
                }
            },
            'model3': { // Kone MonoSpace
                'motor': {
                    description: 'Motor de disco Kone EcoDisc — construção plana, integrada por cima da caixa sem casa das máquinas própria.',
                    specs: [
                        { label: 'Tipo', value: 'EcoDisc (PM de disco)' },
                        { label: 'Potência', value: '3.5 – 11 kW' },
                        { label: 'Velocidade', value: '0.63 – 1.6 m/s' },
                        { label: 'Carga nominal', value: '320 – 1000 kg' },
                        { label: 'Rendimento', value: '> 86%' },
                        { label: 'Massa', value: '145 kg (típica)' },
                    ],
                    maintenance: ['Controlar a temperatura das secções do enrolamento — mensal', 'Verificar rolamentos: 50 000 h ou 10 anos', 'Sem transmissão por correia — não é necessária lubrificação'],
                    issues: ['Sobreaquecimento com carga prolongada — ventilação da caixa', 'Erro EN3 — avaria do encoder EcoDisc', 'Batidas — fixação do disco solta'],
                    manual: 'Kone EcoDisc Motor Service Manual KM803001'
                },
                'controlSystem': {
                    description: 'Controlador Kone V3F16L (VVVF). Quadro KCE, com suporte a Kone Care Remote Monitoring.',
                    specs: [
                        { label: 'Tipo', value: 'V3F16L VVVF' },
                        { label: 'Alimentação', value: '3×400 V / 50 Hz' },
                        { label: 'Comunicação', value: 'KNX, ModBus, Kone Care' },
                        { label: 'Paragens', value: 'até 32' },
                        { label: 'Monitorização', value: 'Kone Care 24/7' },
                    ],
                    maintenance: ['Verificar condensadores do inversor — de 5 em 5 anos', 'Limpar filtros do quadro — de 3 em 3 meses', 'Teste de viagem de aprendizagem após a manutenção'],
                    issues: ['Erro F16 — desvio da tensão do barramento DC', 'Erro F22 — sobreaquecimento do IGBT', 'O software não carrega — verificar a EEPROM'],
                    manual: 'Kone V3F16L Service Manual KM71352'
                },
                'brakes': {
                    description: 'Travões de disco integrados na carcaça do EcoDisc. Dois mecanismos independentes com monitorização eletrónica.',
                    specs: [
                        { label: 'Tipo', value: 'De disco, spring-set' },
                        { label: 'Atuação', value: 'Corte da alimentação da bobina' },
                        { label: 'Folga', value: '0.20 – 0.40 mm' },
                        { label: 'Espessura mín. do revestimento', value: '≥ 3 mm' },
                    ],
                    maintenance: ['Medir a folga pela janela de inspeção — de 3 em 3 meses', 'Verificar o sinal BMON — mensal', 'Substituir molas e revestimentos — de 10 em 10 anos'],
                    issues: ['A cabine não se mantém — força de aperto baixa, regular a mola', 'Erro BMON — fio do microinterruptor cortado', 'Sobreaquecimento dos discos — folga demasiado pequena'],
                    manual: 'Kone EcoDisc Brake Guide KM803005'
                },
                'safetySystem': {
                    description: 'Kone SafetyPro: sistema de segurança de dois canais com teste de eco de aprendizagem em cada arranque.',
                    specs: [
                        { label: 'Limitador de velocidade', value: 'Kone OSG-LD' },
                        { label: 'Paraquedas', value: 'Progressivo, Kone SIP' },
                        { label: 'Amortecedores', value: 'Segundo EN 81-20, hidráulicos' },
                    ],
                    maintenance: ['Testar o limitador de velocidade — anual', 'Substituir o óleo do amortecedor — de 2 em 2 anos', 'Autodiagnóstico SafetyPro em cada arranque'],
                    issues: ['OSG atua sem motivo — desgaste ou sujidade no cabo', 'A cabine desce lentamente após a atuação — amortecedor com carga insuficiente'],
                    manual: 'Kone SafetyPro Manual KM803010'
                },
                'emergency': {
                    description: 'ARO (Automatic Rescue Operation) — deslocação automática até ao piso mais próximo em caso de falha de energia, com a bateria ARD.',
                    specs: [
                        { label: 'Tipo', value: 'ARO (ARD — Automatic Rescue Device)' },
                        { label: 'Tensão da bateria', value: '48 VDC, 20 Ah' },
                        { label: 'Autonomia', value: '≥ 1 viagem de resgate' },
                        { label: 'Autoteste', value: 'Diário' },
                    ],
                    maintenance: ['Verificar a carga da bateria — mensal', 'Substituir a bateria — de 3 em 3 ou 4 em 4 anos', 'Testar a viagem ARO — anual'],
                    issues: ['ARO não atua — bateria descarregada', 'Erro ARD-FAULT — circuito da bateria cortado'],
                    manual: 'Kone ARD Installation & Maintenance KM71360'
                },
                'doors': {
                    description: 'Portas KONE MiniSpace com operador Sematic ou Fermator. Cortina infravermelha + reversão mecânica.',
                    specs: [
                        { label: 'Tipo', value: '2 folhas, centrais ou laterais' },
                        { label: 'Operador', value: 'Sematic SM2000 / Fermator VF5' },
                        { label: 'Tempo de ciclo', value: '2.5 – 4.0 s' },
                        { label: 'Proteção', value: 'Cortina IV + fita de reversão mecânica' },
                    ],
                    maintenance: ['Lubrificar roletes e guias — de 3 em 3 meses', 'Verificar a cortina IV — mensal', 'Regular o amortecedor de fim de curso — em caso de impactos'],
                    issues: ['As portas não abrem completamente — desgaste ou operador sem alimentação', 'Erros DE code — falha do CAN entre cabine e controlador'],
                    manual: 'Kone Door System Manual KM803020'
                }
            },
            'model4': { // Thyssenkrupp Evolution
                'motor': {
                    description: 'Motor síncrono de ímanes permanentes Thyssenkrupp SYN. Construção modular para substituição rápida.',
                    specs: [
                        { label: 'Tipo', value: 'PMSM síncrono' },
                        { label: 'Potência', value: '7.5 – 22 kW' },
                        { label: 'Velocidade', value: '1.0 – 2.5 m/s' },
                        { label: 'Carga nominal', value: '480 – 1600 kg' },
                        { label: 'Isolamento', value: 'Classe H (180°C)' },
                    ],
                    maintenance: ['Verificar a temperatura pelo sensor PTC — mensal', 'Medir o isolamento — anual', 'Substituir rolamentos — após 60 000 h'],
                    issues: ['Disparo PTC — sobrecarga ou ventilação obstruída', 'Erro ENC_FAULT — falha do encoder SIL2', 'Ruído anormal — rolamento ou suporte solto'],
                    manual: 'TKE Evolution Motor Service Manual TK-EV-MOT-01'
                },
                'controlSystem': {
                    description: 'Controlador MAX (Multiple Architecture eXchange). Diagnóstico web através do MAX Connect.',
                    specs: [
                        { label: 'Tipo', value: 'MAX VVVF' },
                        { label: 'Alimentação', value: '3×400–480 V / 50–60 Hz' },
                        { label: 'Comunicação', value: 'Ethernet / LAN, MAX Connect' },
                        { label: 'Paragens', value: 'até 64' },
                        { label: 'Monitorização na nuvem', value: 'TK Cloud Service' },
                    ],
                    maintenance: ['Verificar e limpar as placas — de 6 em 6 meses', 'Atualizar o software através do MAX Connect', 'Arquivar o registo de erros — antes da manutenção'],
                    issues: ['Erro MAX-0234 — falha do módulo de comunicação', 'O MAX não liga — verificar IP e firewall', 'Controlador bloqueado — fazer um reinício a frio'],
                    manual: 'TKE MAX Controller Technical Manual'
                },
                'brakes': {
                    description: 'Dois travões independentes com função SlowDown (travagem suave).',
                    specs: [
                        { label: 'Tipo', value: 'Eletromagnético, de segurança spring-set' },
                        { label: 'Tensão', value: '205 VDC' },
                        { label: 'SlowDown', value: 'Sim, ETSL sensorless' },
                        { label: 'Folga', value: '0.2 – 0.4 mm' },
                    ],
                    maintenance: ['Verificar a folga — de 3 em 3 meses', 'Testar a função SlowDown — anual', 'Substituir bobinas — com resistência < 45 Ω'],
                    issues: ['A cabine não pára nivelada — folga desigual dos dois travões', 'SlowDown não atua — erro do relé ETSL'],
                    manual: 'TKE Evolution Brake Guide TK-EV-BRK-02'
                },
                'safetySystem': {
                    description: 'Thyssenkrupp ACCEL Guard — sistema de segurança sem contacto SIL3. Monitorização de velocidade, aceleração e posição.',
                    specs: [
                        { label: 'Nível de segurança', value: 'SIL 3, EN 13849' },
                        { label: 'Paraquedas', value: 'TK SafetyGrip progressivo' },
                        { label: 'Monitorização', value: 'ACCEL Guard (acelerómetro)' },
                    ],
                    maintenance: ['Autoteste em cada arranque (SIL3)', 'Verificar o paraquedas — anual', 'Certificação do ACCEL Guard — de 5 em 5 anos'],
                    issues: ['Erro SG-TRIP — atuação do paraquedas, Reset: chamar o técnico', 'ACCEL Guard FAULT — substituir o bloco do acelerómetro'],
                    manual: 'TKE ACCEL Guard Safety Manual TK-EV-SAF-03'
                },
                'aiModule': {
                    description: 'Módulo de IA MAX Edge para manutenção preditiva: analisa vibração, corrente do motor e temperatura em tempo real.',
                    specs: [
                        { label: 'Plataforma', value: 'MAX Edge (Edge Computing)' },
                        { label: 'Algoritmos', value: 'Vibration FFT, thermal trend, motor current signature' },
                        { label: 'Comunicação', value: 'LTE / WiFi → TK Cloud' },
                        { label: 'Alertas', value: 'Push / SMS / API' },
                    ],
                    maintenance: ['Verificar a ligação ao TK Cloud — mensal', 'Atualização automática dos modelos de ML', 'Calibrar os sensores — anual'],
                    issues: ['Não chegam alertas — verificar SIM ou configuração WiFi', 'Avisos falsos — fazer recalibração no MAX Connect'],
                    manual: 'TKE MAX Edge AI Manual TK-EV-AI-04'
                },
                'doors': {
                    description: 'Portas com operador TK Door Classic / Premium. Suporta acionamento de portas VVVF ativo.',
                    specs: [
                        { label: 'Tipo', value: '2 / 4 painéis telescópicas ou centrais' },
                        { label: 'Operador', value: 'TK Door Premium (VVVF)' },
                        { label: 'Cortina', value: '3D MultiScan (40 – 120 zonas)' },
                        { label: 'Tempo', value: '2.0 – 3.0 s' },
                    ],
                    maintenance: ['Lubrificar a guia superior — de 3 em 3 meses', 'Verificar o MultiScan — mensal', 'Calibrar o operador VVVF após substituição'],
                    issues: ['VVVF Door Fault — verificar parâmetros do operador', 'MultiScan false trip — limpar as lentes'],
                    manual: 'TKE Door System Manual TK-EV-DOR-05'
                }
            },
            'model5': { // Mitsubishi Electric
                'motor': {
                    description: 'Motor síncrono MELSERVO Mitsubishi com inversor regenerativo VFCL integrado.',
                    specs: [
                        { label: 'Tipo', value: 'PMSM + regeneração' },
                        { label: 'Potência', value: '5.5 – 18.5 kW' },
                        { label: 'Velocidade', value: '0.75 – 2.0 m/s' },
                        { label: 'Carga nominal', value: '450 – 1350 kg' },
                        { label: 'Regeneração', value: '20–30 % de poupança' },
                    ],
                    maintenance: ['Controlar a temperatura do enrolamento — mensal', 'Limpar o dissipador de calor do inversor — de 3 em 3 meses', 'Substituir rolamentos — a cada 50 000 h'],
                    issues: ['Erro OC (overcurrent) — verificar curto-circuito entre espiras', 'Temperatura elevada — aletas de ventilação do inversor obstruídas', 'Falha do resolver — substituir o cabo ou o módulo'],
                    manual: 'Mitsubishi NEXIEZ-MRL Motor Manual GMC-2023'
                },
                'controlSystem': {
                    description: 'Controlador VFCL-2S (Vector Frequency Control) com conversor regenerativo de rede.',
                    specs: [
                        { label: 'Tipo', value: 'VFCL-2S VVVF com regeneração' },
                        { label: 'Alimentação', value: '3×380–480 V' },
                        { label: 'Comunicação', value: 'M-Net, Modbus RTU' },
                        { label: 'Paragens', value: 'até 48' },
                        { label: 'Assistência', value: 'Mitsubishi MELVIT II (portátil)' },
                    ],
                    maintenance: ['Ligar o MELVIT II — diagnóstico anual', 'Limpar as placas de pó — de 6 em 6 meses', 'Verificar o módulo de regeneração — anual'],
                    issues: ['Erro MC-0011 — falha do relé principal', 'Erro MC-0044 — erro de posicionamento excessivo', 'O regenerador não funciona — verificar a resistência nos contactores de entrada'],
                    manual: 'Mitsubishi VFCL-2S Technical Manual GMC-CTRL-2023'
                },
                'brakes': {
                    description: 'Dois travões independentes MELBRAKE integrados no conjunto da polia. Controlo através do BMS (Brake Monitoring System).',
                    specs: [
                        { label: 'Tipo', value: 'MELBRAKE, spring-set' },
                        { label: 'Tensão', value: '190 VDC' },
                        { label: 'Folga', value: '0.3 – 0.5 mm' },
                    ],
                    maintenance: ['Verificar os sinais BMS — mensal', 'Medir a folga — de 3 em 3 meses', 'Substituir revestimentos — com espessura < 2 mm'],
                    issues: ['BMS-FAULT — verificar microinterruptor e fios', 'Dupla atuação dos travões — verificar a tensão da bobina'],
                    manual: 'Mitsubishi MELBRAKE Service Manual GMC-BRK-23'
                },
                'energySaver': {
                    description: 'O sistema de alimentação regenerativa MELREG devolve até 30% da energia à rede quando a cabine carregada desce.',
                    specs: [
                        { label: 'Tipo', value: 'Regeneração Active Front End (AFE)' },
                        { label: 'Eficiência', value: '≥ 95% de conversão' },
                        { label: 'Poupança', value: 'até 30% do consumo total' },
                        { label: 'Cos φ', value: '≥ 0.99' },
                    ],
                    maintenance: ['Verificar a capacidade dos condensadores — de 3 em 3 anos', 'Limpar filtros', 'Testar a regeneração na manutenção — registar no livro'],
                    issues: ['Regeneração desligada — distorção THD ou falha do AFE', 'Erro REGEN-OC — substituir o módulo IGBT'],
                    manual: 'Mitsubishi MELREG Energy Recovery Manual'
                },
                'safetySystem': {
                    description: 'Sistema de segurança MELSAFE com PLC de segurança SIL2 de dois canais. OSG + paraquedas progressivo.',
                    specs: [
                        { label: 'Nível', value: 'SIL 2' },
                        { label: 'OSG', value: 'MELSAFE-OSG1' },
                        { label: 'Paraquedas', value: 'Progressivo' },
                    ],
                    maintenance: ['Testar o OSG — anual', 'Autoteste MELSAFE em cada arranque', 'Certificação SIL2 — de 5 em 5 anos'],
                    issues: ['MELSAFE TRIP — repor através do MELVIT II',  'Erro OSG — verificar o cabo e as guias'],
                    manual: 'Mitsubishi MELSAFE Safety Manual GMC-SAF-23'
                },
                'doors': {
                    description: 'Portas Mitsubishi MRL com operador VF5 (Fermator) ou MELDOOR. Cortina multifeixe sem contacto.',
                    specs: [
                        { label: 'Operador', value: 'MELDOOR 3.0 ou Fermator VF5' },
                        { label: 'Cortina', value: 'Mitsubishi MultiLight 60 ou 80 feixes' },
                        { label: 'Tempo', value: '2.5 – 3.5 s' },
                    ],
                    maintenance: ['Lubrificar roletes — de 3 em 3 meses', 'Verificar o MultiLight — mensal', 'Regular os sensores de fim de curso após a manutenção'],
                    issues: ['Erro MLD-05 — sensor da cortina MultiLight', 'As portas tremem ao fechar — desgaste da guia'],
                    manual: 'Mitsubishi MRL Door System Manual GMC-DOR-23'
                }
            },
            'model6': { // Hyundai Elevator
                'motor': {
                    description: 'Motor PMSM Hyundai HIPER com travão e encoder integrados. Construção MRL compacta.',
                    specs: [
                        { label: 'Tipo', value: 'PMSM HIPER, MRL' },
                        { label: 'Potência', value: '5.5 – 15 kW' },
                        { label: 'Velocidade', value: '1.0 – 1.75 m/s' },
                        { label: 'Carga nominal', value: '450 – 1050 kg' },
                    ],
                    maintenance: ['Verificar rolamentos e ruído — de 3 em 3 meses', 'Medir o isolamento — anual', 'Substituir rolamentos — a cada 35 000 h'],
                    issues: ['Erro ENC-ERR — falha do encoder magnético (verificar o entreferro)', 'Sobreaquecimento em arranques frequentes — verificar a ventilação da caixa'],
                    manual: 'Hyundai HIPER Motor Manual HE-MOT-2023'
                },
                'controlSystem': {
                    description: 'Controlador HYUNDAI SVT (VVVF) com quadro modular ECD e suporte a Remote Monitoring através do HiEMS.',
                    specs: [
                        { label: 'Tipo', value: 'SVT-3000 VVVF' },
                        { label: 'Alimentação', value: '3×380–415 V / 50 Hz' },
                        { label: 'Comunicação', value: 'CAN, Modbus, HiEMS (4G)' },
                        { label: 'Paragens', value: 'até 64' },
                    ],
                    maintenance: ['Ler o registo do HiEMS — mensal', 'Limpar filtros de ar — de 3 em 3 meses', 'Atualizar software — conforme recomendação da Hyundai'],
                    issues: ['Erro F031 — falha do feedback das portas', 'Erro F045 — desvio de posição excessivo', 'HiEMS offline — verificar cartão SIM ou antena'],
                    manual: 'Hyundai SVT-3000 Controller Manual HE-CTRL-23'
                },
                'brakes': {
                    description: 'Dois travões eletromagnéticos de mola com BIME (Brake Intelligent Monitoring Electronics).',
                    specs: [
                        { label: 'Tipo', value: 'EM spring-set + BIME' },
                        { label: 'Tensão', value: '195 VDC' },
                        { label: 'Folga', value: '0.25 – 0.45 mm' },
                    ],
                    maintenance: ['Controlar o registo BIME — mensal', 'Regular a folga do travão — de 3 em 3 meses', 'Substituir revestimentos — com desgaste < 2 mm'],
                    issues: ['BIME-ALERT — verificar o microinterruptor', 'O travão não liberta — tensão VDC baixa na bobina'],
                    manual: 'Hyundai BIME Brake Manual HE-BRK-23'
                },
                'safetySystem': {
                    description: 'HyunSafe SIL2 — sistema de segurança de dois canais. OSG, paraquedas progressivo, ETSL (Electronic Terminal Speed Limiting).',
                    specs: [
                        { label: 'Nível', value: 'SIL 2 EN 62061' },
                        { label: 'ETSL', value: 'Limitação eletrónica nos pisos extremos' },
                        { label: 'OSG', value: 'HyunSafe OSG-V1' },
                    ],
                    maintenance: ['Testar o ETSL — de 6 em 6 meses', 'Verificar o OSG — anual', 'Autodiagnóstico HyunSafe — em cada arranque'],
                    issues: ['Erro ETSL-TRIP — verificar a posição do encoder de nível', 'OSG-FAIL — desgaste ou sujidade no cabo'],
                    manual: 'Hyundai HyunSafe Safety Manual HE-SAF-23'
                },
                'smartControl': {
                    description: 'Hyundai iPOP (Intelligent Predictive Operation Program) — sistema de IA para otimização do despacho e previsão de avarias.',
                    specs: [
                        { label: 'Plataforma', value: 'iPOP Cloud + Edge' },
                        { label: 'Funções', value: 'Predictive dispatch, energy optimization, fault prediction' },
                        { label: 'Comunicação', value: 'LTE → HiEMS Cloud' },
                        { label: 'Análise', value: 'Real-time dashboard na HiEMS App' },
                    ],
                    maintenance: ['Verificar a ligação ao HiEMS — mensal', 'Atualizar os algoritmos iPOP — automático', 'Calibrar os sensores — anual'],
                    issues: ['O iPOP não atualiza — problema de rede', 'Avisos falsos — fazer baseline recalibration no HiEMS'],
                    manual: 'Hyundai iPOP Smart Control Manual HE-SMART-23'
                },
                'doors': {
                    description: 'Portas Hyundai com operador GEZE Slimdrive ECdrive ou HE DoorMaster próprio.',
                    specs: [
                        { label: 'Operador', value: 'HE DoorMaster ou GEZE ECdrive' },
                        { label: 'Cortina', value: 'BODE InfraLight 80 zonas ou HE SafeLight' },
                        { label: 'Tempo', value: '2.5 – 4.0 s' },
                    ],
                    maintenance: ['Lubrificar roletes — de 3 em 3 meses', 'Verificar o SafeLight — mensal', 'Calibrar o operador após a manutenção'],
                    issues: ['Erro DM-003 — o sensor das portas não confirma o fecho', 'Portas lentas — desgaste da correia dentada'],
                    manual: 'Hyundai DoorMaster Service Manual HE-DOR-23'
                }
            },

            // ── ПОРТУГАЛЬСЬКІ ТА ІБЕРІЙСЬКІ МАРКИ ──────────────────────────────

            'model7': { // Arkel
                'motor': {
                    description: 'O motor PMSM sem redutor é dimensionado para o controlador ARCONTROL. Frequentemente instala-se a série Ziehl-Abegg ou a série própria Arkel AM em versão compacta sem casa das máquinas.',
                    specs: [
                        { label: 'Tipo', value: 'PMSM, sem redutor MRL' },
                        { label: 'Potência', value: '3 – 11 kW' },
                        { label: 'Velocidade', value: '1.0 – 1.75 m/s' },
                        { label: 'Carga nominal', value: '320 – 1275 kg' },
                        { label: 'Tensão', value: '3×400 V / 50 Hz' },
                    ],
                    maintenance: ['Verificar vibração dos rolamentos — de 3 em 3 meses', 'Medir o isolamento dos enrolamentos — anual', 'Controlar a fixação da polia — de 6 em 6 meses'],
                    issues: ['Sobreaquecimento com carga > 90% — verificar a ventilação', 'Vibração — desgaste dos rolamentos ou desequilíbrio da polia'],
                    manual: 'Arkel AM-Series Motor Technical Manual v3.2'
                },
                'controlSystem': {
                    description: 'Controlador ARCONTROL KM50-T (ou KM200) — acionamento VVVF do fabricante turco Arkel. Muito utilizado em Portugal e Espanha, suporta CAN e ModbusTCP.',
                    specs: [
                        { label: 'Série', value: 'ARCONTROL KM50-T / KM200' },
                        { label: 'Acionamento', value: 'VVVF (AC-VVVF)' },
                        { label: 'Protocolo', value: 'CAN, Modbus TCP/IP' },
                        { label: 'Paragens', value: 'até 32' },
                        { label: 'Software', value: 'ARCSOFT v5.x' },
                        { label: 'Visor', value: 'LCD + porta USB para atualizações' },
                    ],
                    maintenance: ['Ler o registo de erros — mensal', 'Atualizar o ARCSOFT — numa nova manutenção', 'Cópia de segurança dos parâmetros — após qualquer alteração', 'Limpar o quadro de comando — de 3 em 3 meses'],
                    issues: ['Erro E12 — falha do sinal do encoder', 'Erro E27 — desvio da tensão do barramento DC', 'Erro E43 — sobreaquecimento do módulo IGBT'],
                    manual: 'Arkel ARCONTROL KM50-T Programmer\'s Guide v5'
                },
                'brakes': {
                    description: 'Travão eletromagnético de mola duplo, integrado no motor da série AM. Conforme a EN 81-20 e a EN 81-50.',
                    specs: [
                        { label: 'Tipo', value: 'EM spring-set, duplo' },
                        { label: 'Tensão da bobina', value: '230 VDC' },
                        { label: 'Força', value: '2× 350 N·m' },
                        { label: 'Folga', value: '0.25 – 0.50 mm' },
                    ],
                    maintenance: ['Verificar a folga — de 3 em 3 meses', 'Verificar os microinterruptores BS — mensal', 'Substituir revestimentos com desgaste > 1 mm'],
                    issues: ['O travão não liberta — tensão baixa na bobina', 'O travão ressoa — folga demasiado grande'],
                    manual: 'Arkel Brake Adjustment & Safety Manual AR-BRK-21'
                },
                'safetySystem': {
                    description: 'Sistema de segurança ARKEL SafeGuard: OSG (limitador de velocidade), paraquedas progressivo, amortecedores EN 81-20, ETSL através do ARCONTROL.',
                    specs: [
                        { label: 'OSG', value: 'Arkel SG-100V / SG-120V' },
                        { label: 'Paraquedas', value: 'Progressivo, EN 81-50' },
                        { label: 'Amortecedor', value: 'Poliuretano, EN 81-20' },
                        { label: 'ETSL', value: 'Através do ARCONTROL (software)' },
                    ],
                    maintenance: ['Testar OSG + paraquedas — anual', 'Verificar os amortecedores da caixa — de 6 em 6 meses', 'Testar a função ETSL — de 6 em 6 meses'],
                    issues: ['OSG atuou por erro — verificar a tensão do cabo do OSG', 'ETSL-TRIP — recalibrar o encoder de posição'],
                    manual: 'Arkel SafeGuard Safety System Manual AR-SAF-22'
                },
                'doors': {
                    description: 'Operadores de portas Fermator ou Wittur, ligados ao ARCONTROL através de LIMAX-33CP ou barramento CEDES. Configuração típica em Portugal.',
                    specs: [
                        { label: 'Operador', value: 'Fermator VF5 ou Wittur ACVF' },
                        { label: 'Largura', value: '700 – 1000 mm' },
                        { label: 'Cortina', value: 'CEDES Safe Light 3D' },
                        { label: 'Tempo de ciclo', value: '2.8 – 3.8 s' },
                    ],
                    maintenance: ['Lubrificar os carris das guias — de 3 em 3 meses', 'Verificar os batentes de borracha — anual', 'Calibrar o operador — após a manutenção'],
                    issues: ['As portas não fecham completamente — substituir os batentes de borracha', 'Erro LIMAX — verificar a fixação da fita magnética'],
                    manual: 'Fermator VF5 Operator Service Manual + Arkel Door Integration AR-DOR-21'
                }
            },

            'model8': { // Edel Elevadores
                'hydraulicUnit': {
                    description: 'Central hidráulica Edel com grupo de bombagem Bucher Hydraulics ou BERINGER. Acionamento hidráulico direto sem redutor. Instalação típica em Portugal para 2–6 pisos.',
                    specs: [
                        { label: 'Tipo de acionamento', value: 'Hidráulico, direto' },
                        { label: 'Bomba', value: 'Bucher QX / BERINGER série VP' },
                        { label: 'Pressão', value: '80 – 160 bar (consoante a carga)' },
                        { label: 'Óleo', value: 'ENV46 ou Biodegradable HLP46' },
                        { label: 'Capacidade do depósito', value: '80 – 250 L' },
                        { label: 'Carga nominal', value: '320 – 1600 kg' },
                        { label: 'Velocidade', value: '0.63 – 1.0 m/s' },
                    ],
                    maintenance: ['Verificar o nível do óleo — mensal', 'Substituir o óleo — de 2 em 2 anos ou 10 000 h', 'Verificar a estanquidade do cilindro hidráulico — de 3 em 3 meses', 'Limpar o filtro — de 6 em 6 meses', 'Verificar as válvulas de segurança — anual'],
                    issues: ['Fuga de óleo sob o cilindro — desgaste das vedações do êmbolo', 'Subida lenta — filtro obstruído ou nível de óleo baixo', 'Deriva da cabine para baixo — fuga interna da válvula de retenção'],
                    manual: 'Edel Hydraulic Unit Service Manual EDL-HYD-21'
                },
                'controlSystem': {
                    description: 'O controlador Edel baseia-se na plataforma Löhnert Elektronik ou num bastidor PCB próprio. Conversor VVVF Schneider Electric ATV312 para comandar o grupo de bombagem.',
                    specs: [
                        { label: 'Controlador', value: 'Edel ELC-300 ou Löhnert LE400' },
                        { label: 'Variador de frequência', value: 'Schneider ATV312 ou Siemens G120' },
                        { label: 'Protocolo', value: 'CAN ou RS-485 Modbus' },
                        { label: 'Paragens', value: 'até 16' },
                        { label: 'Alimentação', value: '1×230 V ou 3×400 V / 50 Hz' },
                    ],
                    maintenance: ['Verificar o registo — mensal', 'Limpar o quadro — de 3 em 3 meses', 'Cópia de segurança da configuração — após alterações'],
                    issues: ['Erro A-HYD01 — pressão não atingida a tempo', 'Erro A-LVL02 — cabine não nivelada com o piso', 'Erro A-OVT — sobreaquecimento do óleo (> 70°C)'],
                    manual: 'Edel ELC-300 Controller Manual EDL-CTRL-20'
                },
                'safetySystem': {
                    description: 'Sistema de segurança do elevador hidráulico Edel: válvula de rutura de tubagem (pipe-rupture valve), limitador de velocidade EN 81-20, ETSL.',
                    specs: [
                        { label: 'Válvula de rutura', value: 'Sun Hydraulics CBCA ou HAWE' },
                        { label: 'OSG', value: 'Dynatech ou Kübler SG-50' },
                        { label: 'Amortecedor', value: 'Borracha, EN 81-20' },
                        { label: 'Norma', value: 'EN 81-2:1998 + A3:2009' },
                    ],
                    maintenance: ['Testar a válvula de rutura — anual', 'Verificar o paraquedas — anual', 'Testar a descida de emergência — de 6 em 6 meses'],
                    issues: ['A cabine desce em repouso — fuga interna da válvula ou do êmbolo', 'A válvula de rutura atua por erro — ajustar a calibração'],
                    manual: 'Edel Safety Systems Manual EDL-SAF-21'
                },
                'doors': {
                    description: 'Portas Fermator ou SELCOM com operador semiautomático ou automático. Tipicamente: de correr, abertura central.',
                    specs: [
                        { label: 'Operador', value: 'Fermator VF5 ou SELCOM SUPRA' },
                        { label: 'Tipo', value: 'Automático, abertura central' },
                        { label: 'Largura', value: '700 – 900 mm' },
                        { label: 'Cortina', value: 'Riedel FB-200 ou SafeLight 2D' },
                    ],
                    maintenance: ['Lubrificar — de 3 em 3 meses', 'Verificar a cortina — mensal', 'Regular a força de fecho — anual'],
                    issues: ['As portas abrem sozinhas — falha do sensor de cabine nivelada', 'A cortina não reage — lentes sujas ou suporte desalinhado'],
                    manual: 'Fermator VF5 + Edel Door Integration EDL-DOR-20'
                }
            },

            'model9': { // Megom 2000
                'hydraulicUnit': {
                    description: 'Central hidráulica Megom 2000 com grupo BERINGER ou MEGOM série HPS próprio. Característica de edifícios baixos (2–4 pisos) em Lisboa e no Porto.',
                    specs: [
                        { label: 'Tipo', value: 'Hidráulico direto' },
                        { label: 'Bomba', value: 'MEGOM HPS-80 ou BERINGER VP22' },
                        { label: 'Pressão', value: '60 – 140 bar' },
                        { label: 'Óleo', value: 'HLP46 mineral ou HETG 46 bio' },
                        { label: 'Capacidade do depósito', value: '60 – 160 L' },
                        { label: 'Carga nominal', value: '250 – 1000 kg' },
                        { label: 'Velocidade', value: '0.50 – 0.63 m/s' },
                    ],
                    maintenance: ['Nível do óleo — mensal', 'Substituir o óleo — de 2 em 2 anos', 'Substituir as vedações — se necessário ou de 5 em 5 anos', 'Limpar os filtros — de 6 em 6 meses', 'Pressão e estanquidade — anual'],
                    issues: ['A cabine não sobe até ao piso pretendido — desgaste da bomba ou filtro obstruído', 'Fuga de óleo pelas vedações da haste — manguitos gastos', 'Pancadas no arranque — ar no circuito hidráulico'],
                    manual: 'Megom 2000 HPS Hydraulic Service Manual MG-HYD-20'
                },
                'controlSystem': {
                    description: 'Controlador Megom 2000 MCP-200 — desenvolvimento próprio com base no PLC Siemens S7-200 SMART. Modos: automático, revisão, descida de emergência.',
                    specs: [
                        { label: 'Controlador', value: 'Megom MCP-200' },
                        { label: 'PLC base', value: 'Siemens S7-200 SMART' },
                        { label: 'Visor', value: 'LCD 4 linhas + STEP7 Micro/Win' },
                        { label: 'Protocolo', value: 'RS-485 ModbusRTU' },
                        { label: 'Paragens', value: 'até 8' },
                    ],
                    maintenance: ['Cópia de segurança do PLC — após alterações', 'Ler o registo de avarias — mensal', 'Verificar a alimentação 24VDC — de 3 em 3 meses'],
                    issues: ['STOP F10 — falha do sensor de nível', 'STOP F22 — sobrecarga do grupo de bombagem', 'O controlador bloqueia — verificar a alimentação 24V e a bateria RTC'],
                    manual: 'Megom MCP-200 Controller & PLC Manual MG-CTRL-19'
                },
                'safetySystem': {
                    description: 'Sistema de segurança Megom 2000: válvula limitadora de pressão, pipe-rupture valve HAWE, paraquedas mecânico e OSG EN 81-2.',
                    specs: [
                        { label: 'Pipe-rupture valve', value: 'HAWE RHC-25 ou Sun CBCA' },
                        { label: 'OSG', value: 'Dynatech SG-40' },
                        { label: 'Descida de emergência', value: 'Manual ou automática (24V)' },
                        { label: 'Norma', value: 'EN 81-2:1998 + NP EN 81-20' },
                    ],
                    maintenance: ['Testar a descida de emergência — de 6 em 6 meses', 'Verificar a pipe-rupture valve — anual', 'Controlar o paraquedas — anual'],
                    issues: ['A cabine desce lentamente — fuga interna da válvula HAWE', 'A descida de emergência não atua — verificar o solenoide 24V'],
                    manual: 'Megom 2000 Safety & Hydraulic Valve Manual MG-SAF-19'
                },
                'doors': {
                    description: 'Portas semiautomáticas ou automáticas SELCOM ou Fermator. Bloqueio do tipo Wittur ou APRIMATIC.',
                    specs: [
                        { label: 'Tipo', value: 'Auto ou semiauto, abertura lateral' },
                        { label: 'Operador', value: 'SELCOM SUPRA ou Fermator EC' },
                        { label: 'Bloqueio', value: 'Wittur WT300 ou APRIMATIC' },
                        { label: 'Largura', value: '700 – 800 mm' },
                    ],
                    maintenance: ['Lubrificar o mecanismo — de 3 em 3 meses', 'Verificar o bloqueio das portas — mensal', 'Regular as folgas — anual'],
                    issues: ['O bloqueio não liberta — verificar a bobina da fechadura e a tensão 230V', 'As portas fecham com dificuldade — desgaste dos batentes de borracha ou carril obstruído'],
                    manual: 'Megom 2000 Door System Manual MG-DOR-19'
                }
            },

            'model10': { // CTA Elevadores
                'motor': {
                    description: 'Grupo de tração CTA baseado em Ziehl-Abegg ZAgiva ou SIEI série ARVO — sem redutor, na caixa (MRL). A CTA Elevadores instala sobretudo em Lisboa e no Algarve.',
                    specs: [
                        { label: 'Tipo', value: 'PMSM, sem redutor' },
                        { label: 'Potência', value: '4 – 15 kW' },
                        { label: 'Série', value: 'Ziehl-Abegg ZAgiva ou SIEI ARVO' },
                        { label: 'Velocidade', value: '1.0 – 2.5 m/s' },
                        { label: 'Carga nominal', value: '320 – 2000 kg' },
                        { label: 'Tensão', value: '3×400 V / 50 Hz' },
                    ],
                    maintenance: ['Verificar a vibração — de 3 em 3 meses', 'Medir o isolamento — anual', 'Verificar a fixação da polia — de 6 em 6 meses'],
                    issues: ['Aquecimento em picos de carga — verificar a ventilação da caixa', 'Ruído — desgaste dos rolamentos'],
                    manual: 'Ziehl-Abegg ZAgiva Motor Technical Manual ZA-MRL-22'
                },
                'controlSystem': {
                    description: 'Controlador CTA CTACONTROL-2100 ou SIEI ACE3000 — acionamento VVVF para elevador de tração. Suporta encoder EnDat/SinCos, barramento CAN e monitorização remota.',
                    specs: [
                        { label: 'Controlador', value: 'CTACONTROL-2100 ou SIEI ACE3000' },
                        { label: 'Acionamento', value: 'VVVF, PM motor control' },
                        { label: 'Protocolo', value: 'CAN, EnDat 2.2' },
                        { label: 'Paragens', value: 'até 32' },
                        { label: 'Monitorização', value: 'CTA Remote Monitor (GSM/IP)' },
                    ],
                    maintenance: ['Ler o registo — mensal', 'Cópia de segurança após alterações — obrigatória', 'Teste de viagem de aprendizagem — após a manutenção'],
                    issues: ['Erro C11 — desvio de velocidade', 'Erro C34 — falha da comunicação EnDat', 'Erro C52 — sobreaquecimento do IGBT'],
                    manual: 'CTA CTACONTROL-2100 Service Manual CTA-CTRL-21'
                },
                'brakes': {
                    description: 'Travão eletromagnético duplo com monitorização de estado através do CTACONTROL. Conforme a EN 81-20.',
                    specs: [
                        { label: 'Tipo', value: 'EM spring-set, montagem MRL' },
                        { label: 'Tensão', value: '230 VDC' },
                        { label: 'Folga', value: '0.30 – 0.55 mm' },
                        { label: 'Controlo', value: 'Microinterruptor BS1/BS2' },
                    ],
                    maintenance: ['Verificar a folga — de 3 em 3 meses', 'Verificar BS1/BS2 — mensal', 'Lubrificar os eixos das alavancas — anual'],
                    issues: ['O travão não liberta — tensão de 230V baixa', 'Desgaste excessivo — folga superior a 0.55 mm'],
                    manual: 'CTA Brake System Manual CTA-BRK-21'
                },
                'safetySystem': {
                    description: 'Sistema de segurança CTA SafeElev: OSG Dynatech, paraquedas progressivo Montanari, amortecedores EN 81-20. ETSL implementado através do CTACONTROL-2100.',
                    specs: [
                        { label: 'OSG', value: 'Dynatech V100 ou Montanari MO-25' },
                        { label: 'Paraquedas', value: 'Montanari progressive' },
                        { label: 'ETSL', value: 'Software no CTACONTROL-2100' },
                        { label: 'Norma', value: 'EN 81-20, NP EN 81-20' },
                    ],
                    maintenance: ['Testar OSG + paraquedas — anual', 'Testar o ETSL — de 6 em 6 meses', 'Verificar os amortecedores do poço e do topo — de 6 em 6 meses'],
                    issues: ['O OSG não atua — desgaste ou corrosão do came do OSG', 'ETSL-TRIP — recalibrar o encoder de nível'],
                    manual: 'CTA SafeElev Safety Manual CTA-SAF-21'
                },
                'doors': {
                    description: 'Portas Fermator VVVF ou SELCOM SUPRA com controlador integrado no CTACONTROL. Cortina Riedel ou CEDES.',
                    specs: [
                        { label: 'Operador', value: 'Fermator VVVF ou SELCOM SUPRA' },
                        { label: 'Largura', value: '700 – 1100 mm' },
                        { label: 'Cortina', value: 'CEDES Safe Light 3D ou Riedel FB-100' },
                        { label: 'Tempo de ciclo', value: '2.5 – 4.0 s' },
                    ],
                    maintenance: ['Lubrificar — de 3 em 3 meses', 'Verificar a cortina — mensal', 'Calibrar o operador VVVF — após a manutenção'],
                    issues: ['As portas param a meio do curso — erro do operador VVVF', 'A cortina não atua — verificar o alinhamento TX/RX'],
                    manual: 'Fermator VVVF Operator Manual + CTA Door Guide CTA-DOR-21'
                }
            },

            'model11': { // Mikrolift
                'motor': {
                    description: 'Motor compacto Mikrolift ML-Drive ou Ziehl-Abegg série FI para pequenos elevadores residenciais (até 4 pisos). Integrado num nicho sem casa das máquinas.',
                    specs: [
                        { label: 'Tipo', value: 'PMSM, MRL compacto' },
                        { label: 'Potência', value: '1.5 – 5.5 kW' },
                        { label: 'Carga nominal', value: '150 – 630 kg' },
                        { label: 'Velocidade', value: '0.63 – 1.0 m/s' },
                        { label: 'Tensão', value: '1×230 V ou 3×400 V / 50 Hz' },
                    ],
                    maintenance: ['Verificar ruído/vibração — de 3 em 3 meses', 'Medir o isolamento — anual', 'Verificar a correia ou corrente (se existir) — de 6 em 6 meses'],
                    issues: ['Ruído elevado — desgaste dos rolamentos ou da transmissão por correia', 'O elevador não se move — verificar a proteção térmica do motor (overload relay)'],
                    manual: 'Mikrolift ML-Drive Motor Maintenance Manual ML-MOT-22'
                },
                'controlSystem': {
                    description: 'Controlador Mikrolift INTELLIFT-50 ou bloco integrado baseado em Omron CP1L. Simples e fiável. Ligação por USB ou RS-232.',
                    specs: [
                        { label: 'Controlador', value: 'INTELLIFT-50 ou Omron CP1L' },
                        { label: 'Acionamento', value: 'VVVF ou arranque direto (DOL)' },
                        { label: 'Interface', value: 'USB / RS-232' },
                        { label: 'Paragens', value: 'até 8' },
                        { label: 'Alimentação', value: '1×230 V ou 3×400 V' },
                    ],
                    maintenance: ['Registo de eventos — mensal', 'Cópia de segurança — após qualquer alteração', 'Verificar a alimentação 24V — de 3 em 3 meses'],
                    issues: ['O elevador parou entre pisos — verificar o sinal de nivelamento (leveling sensor)', 'O visor não mostra o piso — falha do RS-485'],
                    manual: 'Mikrolift INTELLIFT-50 Controller Manual ML-CTRL-22'
                },
                'safetySystem': {
                    description: 'Sistema de segurança Mikrolift: OSG Dynatech ou Kübler, paraquedas de cunha (EN 81-20), amortecedores, proteção de sobrecarga (load sensor).',
                    specs: [
                        { label: 'OSG', value: 'Dynatech SG-30 ou Kübler KG-40' },
                        { label: 'Paraquedas', value: 'De cunha (residential EN 81-20)' },
                        { label: 'Sensor de carga', value: 'Strain gauge ou de mola' },
                        { label: 'Norma', value: 'EN 81-20 / NP EN 81-20' },
                    ],
                    maintenance: ['Testar OSG + paraquedas — anual', 'Verificar o sensor de carga — de 6 em 6 meses', 'Verificar os amortecedores — de 6 em 6 meses'],
                    issues: ['O elevador não arranca com carga normal — falha/desvio do sensor de carga', 'O OSG não rearma após a atuação — verificar a tensão do cabo do OSG'],
                    manual: 'Mikrolift Safety System Manual ML-SAF-22'
                },
                'doors': {
                    description: 'Portas de correr semiautomáticas ou telescópicas automáticas, operador Fermax ou APRIMATIC. Típicas de pequenos elevadores residenciais.',
                    specs: [
                        { label: 'Tipo', value: 'De correr, auto ou semiauto' },
                        { label: 'Operador', value: 'APRIMATIC TS200 ou Fermax' },
                        { label: 'Largura', value: '600 – 800 mm' },
                        { label: 'Cortina', value: 'SafeRay 2D ou microinterruptor' },
                    ],
                    maintenance: ['Lubrificar o carril — de 3 em 3 meses', 'Verificar as fechaduras — mensal', 'Regular a força de fecho — anual'],
                    issues: ['As portas abrem sozinhas — desgaste ou falha da fechadura da porta de cabine', 'O operador não completa o curso — verificar o fim de curso'],
                    manual: 'Mikrolift Door Installation & Service Manual ML-DOR-22'
                }
            },

            'model12': { // Heytech
                'motor': {
                    description: 'Motor Heytech EcoTraction (PM MRL) ou Leroy-Somer série DYNEO — sem redutor, integrado na caixa. Instala-se em edifícios residenciais e pequenos edifícios comerciais em Portugal.',
                    specs: [
                        { label: 'Tipo', value: 'PMSM, sem redutor' },
                        { label: 'Série', value: 'Heytech EcoTraction ou Leroy-Somer DYNEO' },
                        { label: 'Potência', value: '3 – 12 kW' },
                        { label: 'Velocidade', value: '1.0 – 1.6 m/s' },
                        { label: 'Carga nominal', value: '320 – 1000 kg' },
                        { label: 'Tensão', value: '3×380–415 V / 50 Hz' },
                    ],
                    maintenance: ['Verificar rolamentos — de 3 em 3 meses', 'Medir o isolamento dos enrolamentos — anual', 'Verificar o desgaste da polia — de 6 em 6 meses'],
                    issues: ['Sobreaquecimento — aletas de ventilação obstruídas ou orientação de montagem incorreta', 'Marcha irregular — desgaste dos cabos ou polia desalinhada'],
                    manual: 'Heytech EcoTraction Motor Manual HT-MOT-23'
                },
                'controlSystem': {
                    description: 'Controlador Heytech HTCTRL-500 (VVVF) baseado em variador Danfoss FC302 ou Schneider ATV650. Ligação do elevador ao Heytech Connect (nuvem IoT) por GSM/IP.',
                    specs: [
                        { label: 'Controlador', value: 'Heytech HTCTRL-500' },
                        { label: 'Variador de frequência', value: 'Danfoss FC302 ou Schneider ATV650' },
                        { label: 'Protocolo', value: 'CANopen, ModbusTCP' },
                        { label: 'Paragens', value: 'até 24' },
                        { label: 'IoT', value: 'Heytech Connect (4G/Wi-Fi)' },
                    ],
                    maintenance: ['Ler o registo do HTCTRL — mensal', 'Atualizar o software através do Heytech Connect — automático', 'Limpar o quadro — de 3 em 3 meses'],
                    issues: ['Erro HT-E05 — desvio de velocidade > 5%', 'Erro HT-E14 — falha de comunicação CAN', 'Heytech Connect offline — verificar SIM ou módulo 4G'],
                    manual: 'Heytech HTCTRL-500 Controller Service Manual HT-CTRL-23'
                },
                'brakes': {
                    description: 'Travão EM duplo integrado Heytech EcoBrake — do tipo de mola, com monitorização do desgaste dos revestimentos através do HTCTRL.',
                    specs: [
                        { label: 'Tipo', value: 'EM spring-set, duplo (EcoBrake)' },
                        { label: 'Tensão da bobina', value: '230 VDC' },
                        { label: 'Folga', value: '0.25 – 0.45 mm' },
                        { label: 'Controlo', value: 'Microinterruptor + wear indicator' },
                    ],
                    maintenance: ['Verificar a folga — de 3 em 3 meses', 'Verificar o wear indicator — mensal', 'Substituir revestimentos com desgaste > 1.5 mm'],
                    issues: ['O travão ressoa — folga >0.50 mm', 'Erro HT-B01 — o microinterruptor não confirma a libertação do travão'],
                    manual: 'Heytech EcoBrake Service Manual HT-BRK-23'
                },
                'safetySystem': {
                    description: 'Segurança Heytech SafeCore SIL2: OSG de dois canais, paraquedas progressivo Montanari ou Dynatech, ETSL através do HTCTRL-500.',
                    specs: [
                        { label: 'Nível', value: 'SIL 2 (EN 62061)' },
                        { label: 'OSG', value: 'Heytech SG-150 ou Dynatech V80' },
                        { label: 'Paraquedas', value: 'Montanari progressive ou Dynatech PC-35' },
                        { label: 'ETSL', value: 'HTCTRL-500 software + encoder' },
                        { label: 'Norma', value: 'EN 81-20, NP EN 81-20' },
                    ],
                    maintenance: ['Testar OSG + paraquedas — anual', 'Testar o ETSL — de 6 em 6 meses', 'Verificar os amortecedores do poço — de 6 em 6 meses'],
                    issues: ['SafeCore-ALRM01 — ativação falsa — verificar a tensão do cabo do OSG', 'ETSL-TRIP — recalibrar o encoder através do HTCTRL Service Mode'],
                    manual: 'Heytech SafeCore SIL2 Safety Manual HT-SAF-23'
                },
                'doors': {
                    description: 'Portas Fermator VVVF ou série própria Heytech AutoDoor com cortina CEDES ou Riedel. Operador integrado no HTCTRL-500.',
                    specs: [
                        { label: 'Operador', value: 'Heytech AutoDoor ou Fermator VVVF' },
                        { label: 'Tipo', value: 'Auto, abertura central ou lateral' },
                        { label: 'Largura', value: '700 – 900 mm' },
                        { label: 'Cortina', value: 'CEDES 3D ou Riedel FB-200' },
                        { label: 'Tempo', value: '2.8 – 4.0 s' },
                    ],
                    maintenance: ['Lubrificar roletes e carril — de 3 em 3 meses', 'Verificar a cortina — mensal', 'Calibrar o AutoDoor — após a manutenção'],
                    issues: ['Erro DOR-03 — o operador de portas não devolve o sinal de fecho', 'As portas abrem com dificuldade — desgaste do rolete superior ou carril obstruído'],
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
            description: modelData?.description || `Componente: ${base.name}`,
            specs: modelData?.specs || [],
            maintenance: modelData?.maintenance || [],
            issues: modelData?.issues || [],
            manual: modelData?.manual || null
        };
    }

    showComponentManual(componentId, modelId) {
        const info = this.getComponentInfo(componentId, modelId);
        if (info.manual) {
            this.showNotification(`Manual: ${info.manual}`, 'info');
        } else {
            this.showNotification(`Documentação não encontrada`, 'warning');
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

            this.showNotification('Modo AR desativado', 'info');
            this.logAREvent('ar_session_end');

        } catch (error) {
            console.error('Помилка вимкнення AR:', error);
            this.showNotification('Erro ao desativar AR', 'error');
        }
    }

    clearARScene() {
        // Remove a cena e liberta a câmara (o AR.js deixa o <video> ligado)
        $('#arScene').empty();
        document.querySelectorAll('video[id^="arjs-video"]').forEach(v => {
            if (v.srcObject) v.srcObject.getTracks().forEach(t => t.stop());
            v.remove();
        });
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
            arButton.html('<i class="fas fa-stop"></i> Parar AR');
            arButton.removeClass('btn-primary').addClass('btn-danger');
            arStatus.text('Ativo').removeClass('badge-info').addClass('badge-success');
        } else {
            arButton.html('<i class="fas fa-play"></i> Iniciar AR');
            arButton.removeClass('btn-danger').addClass('btn-primary');
            arStatus.text('Inativo').removeClass('badge-success').addClass('badge-info');
        }
    }

    updateModelInfo() {
        if (this.currentModel) {
            $('#arStatus').text(`Ativo - ${this.currentModel.name}`);
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
            window.location.href = manual.url;
            this.logAREvent('manual_opened', { manual: manualType });
        }
    }

    openVideoTutorials() {
        window.location.href = '/pages/tech/knowledge-base.html?topic=tutoriais';
    }

    getManual(manualType) {
        const manuals = {
            'safety': {
                name: 'Instruções de segurança',
                url: '/pages/tech/knowledge-base.html?topic=seguranca'
            },
            'components': {
                name: 'Esquemas de componentes',
                url: '/pages/tech/knowledge-base.html?topic=esquemas'
            },
            'troubleshooting': {
                name: 'Resolução de problemas',
                url: '/pages/tech/knowledge-base.html?topic=avarias'
            }
        };
        return manuals[manualType];
    }

    // Додаткові методи для розширеного функціоналу
    startTutorial() {
        this.showNotification('A iniciar modo de aprendizagem...', 'info');
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
        
        this.showNotification('Dados da sessão exportados', 'success');
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
        this.showNotification(`Elevador ${data.liftId}: ${data.status}`,
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
        this.showNotification(`${user.firstName} adicionou uma anotação`, 'info');
    }

    handleEmergencyStop() {
        if (this.isARActive) {
            this.stopARSession();
        }
        this.showNotification('Paragem de emergência da sessão AR', 'error');
    }
}

// Автоматична ініціалізація
$(document).ready(function() {
    window.arHelper = new ARHelper();
});