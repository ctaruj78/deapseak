/**
 * FestLift AI Interface Controller
 * ================================
 * 
 * Динамічне управління інтерфейсом на основі AI рекомендацій
 * та персоналізації користувача
 */

class AIInterfaceController {
    constructor() {
        this.userId = null;
        this.userRole = null;
        this.currentInterface = null;
        this.recommendations = [];
        this.isPersonalizationEnabled = true;
        
        // Ініціалізація
        this.init();
        
        console.log('🤖 AI Interface Controller ініціалізовано');
    }
    
    async init() {
        try {
            // Отримання інформації про користувача
            await this.loadUserInfo();
            
            // A carregar персоналізованого інтерфейсу
            await this.loadPersonalizedInterface();
            
            // A carregar рекомендацій
            await this.loadRecommendations();
            
            // Definições відстеження поведінки
            this.setupBehaviorTracking();
            
            // Запуск адаптивних функцій
            this.startAdaptiveFeatures();
            
        } catch (error) {
            console.error('Erro ініціалізації AI інтерфейсу:', error);
        }
    }
    
    async loadUserInfo() {
        try {
            const response = await fetch('/api/user/info');
            const userInfo = await response.json();
            
            this.userId = userInfo.id;
            this.userRole = userInfo.role;
            
            console.log(`👤 Utilizador: ${this.userId} (${this.userRole})`);
            
        } catch (error) {
            console.error('Erro завантаження інформації користувача:', error);
        }
    }
    
    async loadPersonalizedInterface() {
        try {
            const response = await fetch(`/api/ai/personalized-interface/${this.userId}`);
            const interfaceData = await response.json();
            
            this.currentInterface = interfaceData;
            
            // Застосування персоналізованих налаштувань
            this.applyInterfaceSettings(interfaceData);
            
            console.log('🎨 Персоналізований інтерфейс завантажено');
            
        } catch (error) {
            console.error('Erro завантаження інтерфейсу:', error);
            // Використання інтерфейсу за замовчуванням
            this.applyDefaultInterface();
        }
    }
    
    applyInterfaceSettings(interfaceData) {
        try {
            // Застосування теми
            this.applyColorTheme(interfaceData.color_theme);
            
            // Definições layout
            this.applyLayoutSettings(interfaceData.preferred_layout);
            
            // Конфігурація віджетів
            this.configureWidgets(interfaceData.widget_configuration);
            
            // Definições доступності
            this.applyAccessibilitySettings(interfaceData.accessibility_settings);
            
            // Ярлики
            this.setupShortcuts(interfaceData.shortcuts);
            
        } catch (error) {
            console.error('Erro застосування налаштувань інтерфейсу:', error);
        }
    }
    
    applyColorTheme(theme) {
        const body = document.body;
        
        // Видалення попередніх тем
        body.classList.remove('admin_dark', 'dispatcher_blue', 'technician_green', 'client_light');
        
        // Додавання нової теми
        if (theme) {
            body.classList.add(theme);
        }
        
        console.log(`🎨 Тема застосована: ${theme}`);
    }
    
    applyLayoutSettings(layoutSettings) {
        try {
            const sidebar = document.querySelector('.main-sidebar');
            const content = document.querySelector('.content-wrapper');
            
            if (sidebar && layoutSettings.sidebar) {
                switch (layoutSettings.sidebar) {
                    case 'expanded':
                        sidebar.classList.remove('sidebar-collapse');
                        break;
                    case 'collapsed':
                        sidebar.classList.add('sidebar-collapse');
                        break;
                    case 'hidden':
                        sidebar.style.display = 'none';
                        break;
                    case 'mobile_friendly':
                        sidebar.classList.add('mobile-optimized');
                        break;
                }
            }
            
            // Definições щільності
            if (content && layoutSettings.density) {
                content.classList.remove('density-compact', 'density-normal', 'density-comfortable', 'density-large');
                content.classList.add(`density-${layoutSettings.density}`);
            }
            
            console.log('📐 Layout налаштований:', layoutSettings);
            
        } catch (error) {
            console.error('Erro застосування layout:', error);
        }
    }
    
    configureWidgets(widgetConfiguration) {
        try {
            const dashboard = document.querySelector('.dashboard-widgets');
            if (!dashboard) return;
            
            // Очищення поточних віджетів
            dashboard.innerHTML = '';
            
            // Сортування віджетів за позицією
            const sortedWidgets = widgetConfiguration.sort((a, b) => a.position - b.position);
            
            // Створення віджетів
            sortedWidgets.forEach(widgetConfig => {
                if (widgetConfig.enabled) {
                    const widgetElement = this.createWidget(widgetConfig);
                    if (widgetElement) {
                        dashboard.appendChild(widgetElement);
                    }
                }
            });
            
            console.log(`📊 Віджети налаштовані: ${sortedWidgets.length}`);
            
        } catch (error) {
            console.error('Erro конфігурації віджетів:', error);
        }
    }
    
    createWidget(widgetConfig) {
        try {
            const widgetContainer = document.createElement('div');
            widgetContainer.className = `widget-container ${widgetConfig.widget}-widget`;
            widgetContainer.id = `widget-${widgetConfig.widget}`;
            
            // Встановлення пріоритету
            if (widgetConfig.priority === 'high') {
                widgetContainer.classList.add('high-priority');
            }
            
            // A carregar вмісту віджета
            this.loadWidgetContent(widgetContainer, widgetConfig.widget);
            
            return widgetContainer;
            
        } catch (error) {
            console.error(`Erro створення віджета ${widgetConfig.widget}:`, error);
            return null;
        }
    }
    
    async loadWidgetContent(container, widgetName) {
        try {
            // Базові віджети
            const widgetTemplates = {
                'system_stats': this.createSystemStatsWidget,
                'active_requests': this.createActiveRequestsWidget,
                'my_assignments': this.createAssignmentsWidget,
                'my_requests': this.createMyRequestsWidget,
                'user_management': this.createUserManagementWidget,
                'technician_status': this.createTechnicianStatusWidget,
                'emergency_alerts': this.createEmergencyAlertsWidget,
                'map_view': this.createMapViewWidget,
                'route_planner': this.createRoutePlannerWidget,
                'tools_checklist': this.createToolsChecklistWidget,
                'photo_upload': this.createPhotoUploadWidget,
                'lift_status': this.createLiftStatusWidget,
                'contact_support': this.createContactSupportWidget,
                'feedback': this.createFeedbackWidget,
                'reports': this.createReportsWidget,
                'analytics': this.createAnalyticsWidget
            };
            
            const createFunction = widgetTemplates[widgetName];
            if (createFunction) {
                const content = createFunction.call(this);
                container.innerHTML = content;
            } else {
                container.innerHTML = `<div class="widget-placeholder">Widget "${widgetName}" em desenvolvimento</div>`;
            }
            
        } catch (error) {
            console.error(`Erro завантаження вмісту віджета ${widgetName}:`, error);
            container.innerHTML = '<div class="widget-error">Erro ao carregar widget</div>';
        }
    }
    
    createSystemStatsWidget() {
        return `
            <div class="widget-header">
                <h3><i class="fas fa-chart-line"></i> Estatísticas do sistema</h3>
            </div>
            <div class="widget-body">
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-value" id="total-lifts">-</span>
                        <span class="stat-label">Elevadorів</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" id="active-requests">-</span>
                        <span class="stat-label">Pedidos ativos</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" id="technicians-online">-</span>
                        <span class="stat-label">Técnicoів онлайн</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" id="system-uptime">-</span>
                        <span class="stat-label">Tempo de funcionamento</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    createActiveRequestsWidget() {
        return `
            <div class="widget-header">
                <h3><i class="fas fa-tasks"></i> Pedidos ativos</h3>
                <button class="btn btn-sm btn-primary" onclick="showAllRequests()">Todos os pedidos</button>
            </div>
            <div class="widget-body">
                <div id="active-requests-list" class="requests-list">
                    <div class="loading-spinner">A carregar...</div>
                </div>
            </div>
        `;
    }
    
    createAssignmentsWidget() {
        return `
            <div class="widget-header">
                <h3><i class="fas fa-clipboard-list"></i> As minhas atribuições</h3>
            </div>
            <div class="widget-body">
                <div id="my-assignments-list" class="assignments-list">
                    <div class="loading-spinner">A carregar...</div>
                </div>
            </div>
        `;
    }
    
    applyAccessibilitySettings(accessibilitySettings) {
        try {
            const body = document.body;
            
            // Altий контраст
            if (accessibilitySettings.high_contrast) {
                body.classList.add('high-contrast');
            } else {
                body.classList.remove('high-contrast');
            }
            
            // Великі шрифти
            if (accessibilitySettings.large_fonts) {
                body.classList.add('large-fonts');
            } else {
                body.classList.remove('large-fonts');
            }
            
            // Клавіатурна навігація
            if (accessibilitySettings.keyboard_navigation) {
                body.classList.add('keyboard-navigation');
                this.setupKeyboardNavigation();
            }
            
            console.log('♿ Definições доступності застосовані');
            
        } catch (error) {
            console.error('Erro застосування налаштувань доступності:', error);
        }
    }
    
    setupShortcuts(shortcuts) {
        try {
            // Видалення попередніх ярликів
            if (this.shortcutListeners) {
                this.shortcutListeners.forEach(listener => {
                    document.removeEventListener('keydown', listener);
                });
            }
            
            this.shortcutListeners = [];
            
            // Створення нових ярликів
            Object.entries(shortcuts).forEach(([key, action]) => {
                const listener = (event) => {
                    if (this.matchesShortcut(event, key)) {
                        event.preventDefault();
                        this.executeShortcutAction(action);
                    }
                };
                
                document.addEventListener('keydown', listener);
                this.shortcutListeners.push(listener);
            });
            
            console.log(`⌨️ Ярлики налаштовані: ${Object.keys(shortcuts).length}`);
            
        } catch (error) {
            console.error('Erro налаштування ярликів:', error);
        }
    }
    
    async loadRecommendations() {
        try {
            const response = await fetch(`/api/ai/recommendations/${this.userId}`);
            const recommendations = await response.json();
            
            this.recommendations = recommendations;
            
            // Показ рекомендацій
            this.displayRecommendations(recommendations);
            
            console.log(`💡 Рекомендацій завантажено: ${recommendations.length}`);
            
        } catch (error) {
            console.error('Erro завантаження рекомендацій:', error);
        }
    }
    
    displayRecommendations(recommendations) {
        try {
            const container = document.getElementById('ai-recommendations');
            if (!container) return;
            
            container.innerHTML = '';
            
            recommendations.forEach(rec => {
                const recElement = document.createElement('div');
                recElement.className = `recommendation priority-${rec.priority}`;
                recElement.innerHTML = `
                    <div class="rec-header">
                        <h4>${rec.title}</h4>
                        <span class="confidence">${Math.round(rec.confidence * 100)}%</span>
                    </div>
                    <p class="rec-description">${rec.description}</p>
                    <div class="rec-actions">
                        <button class="btn btn-sm btn-success" onclick="aiInterface.acceptRecommendation('${rec.recommendation_id}')">
                            Aplicar
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="aiInterface.dismissRecommendation('${rec.recommendation_id}')">
                            Rejeitar
                        </button>
                    </div>
                `;
                
                container.appendChild(recElement);
                
                // Позначення як показаної
                this.markRecommendationAsShown(rec.recommendation_id);
            });
            
        } catch (error) {
            console.error('Erro відображення рекомендацій:', error);
        }
    }
    
    setupBehaviorTracking() {
        try {
            // Відстеження кліків
            document.addEventListener('click', (event) => {
                this.trackBehavior('click', {
                    target: event.target.tagName,
                    className: event.target.className,
                    id: event.target.id
                });
            });
            
            // Відстеження навігації
            let navigationStartTime = Date.now();
            window.addEventListener('beforeunload', () => {
                const sessionDuration = (Date.now() - navigationStartTime) / 1000;
                this.trackBehavior('session_end', { duration: sessionDuration });
            });
            
            // Відстеження помилок форм
            document.addEventListener('submit', (event) => {
                const form = event.target;
                const isValid = form.checkValidity();
                
                this.trackBehavior('form_submit', {
                    formId: form.id,
                    success: isValid
                });
            });
            
            console.log('📊 Відстеження поведінки налаштовано');
            
        } catch (error) {
            console.error('Erro налаштування відстеження:', error);
        }
    }
    
    async trackBehavior(actionType, context = {}) {
        try {
            if (!this.userId) return;
            
            const behavior = {
                user_id: this.userId,
                action_type: actionType,
                timestamp: new Date().toISOString(),
                context: context,
                success: context.success !== undefined ? context.success : true,
                duration: context.duration || 0
            };
            
            // Відправка в фоновому режимі
            fetch('/api/ai/track-behavior', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(behavior)
            }).catch(error => {
                console.error('Erro відстеження поведінки:', error);
            });
            
        } catch (error) {
            console.error('Erro трекінгу поведінки:', error);
        }
    }
    
    startAdaptiveFeatures() {
        try {
            // Автоматичне оновлення рекомендацій кожні 30 хвилин
            setInterval(() => {
                this.loadRecommendations();
            }, 30 * 60 * 1000);
            
            // Автоматичне збереження налаштувань при зміні
            this.setupAutoSave();
            
            console.log('🔄 Адаптивні функції запущені');
            
        } catch (error) {
            console.error('Erro запуску адаптивних функцій:', error);
        }
    }
    
    async acceptRecommendation(recommendationId) {
        try {
            const recommendation = this.recommendations.find(r => r.recommendation_id === recommendationId);
            if (!recommendation) return;
            
            // Виконання рекомендації
            await this.executeRecommendation(recommendation);
            
            // Повідомлення серверу
            await fetch(`/api/ai/recommendation/${recommendationId}/accept`, {
                method: 'POST'
            });
            
            // Видалення з UI
            this.removeRecommendationFromUI(recommendationId);
            
            // Повторне завантаження інтерфейсу
            await this.loadPersonalizedInterface();
            
            showNotification('Recomendação aplicada!', 'success');
            
        } catch (error) {
            console.error('Erro прийняття рекомендації:', error);
            showNotification('Erro ao aplicar recomendação', 'error');
        }
    }
    
    async executeRecommendation(recommendation) {
        try {
            switch (recommendation.type) {
                case 'workflow_optimization':
                    await this.createShortcut(recommendation.context.action);
                    break;
                    
                case 'schedule_optimization':
                    await this.setupScheduleReminder(recommendation.context.peak_hour);
                    break;
                    
                case 'help_suggestion':
                    this.showHelp(recommendation.context.error_type);
                    break;
                    
                default:
                    console.log('Desconhecido тип рекомендації:', recommendation.type);
            }
            
        } catch (error) {
            console.error('Erro виконання рекомендації:', error);
        }
    }
    
    // Методи для різних типів рекомендацій
    async createShortcut(action) {
        // Створення ярлика для часто використовуваної дії
        const shortcuts = this.currentInterface.shortcuts || {};
        shortcuts[`Ctrl+Shift+${action.charAt(0).toUpperCase()}`] = action;
        
        await this.updateInterfaceSettings({ shortcuts });
    }
    
    async setupScheduleReminder(peakHour) {
        // Definições нагадування для пікового часу
        if (Notification.permission === 'granted') {
            // Створення нагадування
            console.log(`Налаштовано нагадування на ${peakHour}:00`);
        }
    }
    
    showHelp(errorType) {
        // Показ довідки для типу помилки
        const helpModal = document.getElementById('help-modal');
        if (helpModal) {
            // A carregar відповідної довідки
            this.loadHelpContent(errorType);
            $(helpModal).modal('show');
        }
    }
    
    async updateInterfaceSettings(updates) {
        try {
            await fetch(`/api/ai/interface/${this.userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });
            
        } catch (error) {
            console.error('Erro оновлення налаштувань:', error);
        }
    }
    
    removeRecommendationFromUI(recommendationId) {
        const element = document.querySelector(`[data-rec-id="${recommendationId}"]`);
        if (element) {
            element.remove();
        }
    }
    
    async markRecommendationAsShown(recommendationId) {
        try {
            await fetch(`/api/ai/recommendation/${recommendationId}/shown`, {
                method: 'POST'
            });
            
        } catch (error) {
            console.error('Erro позначення рекомендації:', error);
        }
    }
    
    applyDefaultInterface() {
        console.log('Застосування інтерфейсу за замовчуванням');
        // Базові налаштування
        this.applyColorTheme('client_light');
        this.applyLayoutSettings({ sidebar: 'expanded', density: 'normal' });
    }
}

// Глобальний об'єкт для доступу з інших скриптів
window.aiInterface = null;

// Ініціалізація після завантаження DOM
document.addEventListener('DOMContentLoaded', () => {
    window.aiInterface = new AIInterfaceController();
});

// Утилітарні функції
function showAllRequests() {
    window.location.href = '/requests';
}

function showNotification(message, type = 'info') {
    // Показ повідомлення (використовується існуюча система)
    if (window.showAlert) {
        window.showAlert(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// Exportar для використання в інших модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIInterfaceController;
}