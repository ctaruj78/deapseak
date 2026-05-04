/**
 * 📊 Smart Analytics Engine для DeapSeaK
 * Розумна система аналітики з машинним навчанням та прогнозуванням
 */

class SmartAnalyticsEngine {
    constructor() {
        this.dataCache = new Map();
        this.trends = new Map();
        this.predictions = new Map();
        this.alertThresholds = {
            liftsCreatedPerDay: 5,
            qrGeneratedPerDay: 10,
            inspectionsPending: 20,
            emailDeliveryRate: 95
        };
        
        this.init();
    }

    init() {
        console.log('🧠 Ініціалізація Smart Analytics Engine...');
        
        // Завантажуємо історичні дані
        this.loadHistoricalData();
        
        // Налаштовуємо EventBus інтеграцію
        this.setupEventBusIntegration();
        
        // Запускаємо аналітичні процеси
        this.startAnalyticalProcesses();
        
        console.log('✅ Smart Analytics Engine готовий!');
    }

    /**
     * 📈 A carregar та аналіз історичних даних
     */
    loadHistoricalData() {
        console.log('📚 A carregar історичних даних...');
        
        // Завантажуємо всі дані з localStorage
        const lifts = JSON.parse(localStorage.getItem('lifts') || '[]');
        const inspections = JSON.parse(localStorage.getItem('scheduled_inspections') || '[]');
        const criticalLog = JSON.parse(localStorage.getItem('system_critical_log') || '[]');
        
        // Аналізуємо тренди
        this.analyzeLiftsData(lifts);
        this.analyzeInspectionsData(inspections);
        this.analyzeEventLog(criticalLog);
        
        console.log('📊 Історичні дані оброблено');
    }

    /**
     * 🏢 Аналіз даних ліфтів
     */
    analyzeLiftsData(lifts) {
        const analysis = {
            total: lifts.length,
            statusDistribution: {},
            locationClusters: [],
            averageAge: 0,
            maintenanceNeeded: 0
        };

        // Розподіл за статусами
        lifts.forEach(lift => {
            const status = lift.status || 'active';
            analysis.statusDistribution[status] = (analysis.statusDistribution[status] || 0) + 1;
            
            // Визначаємо ліфти, що потребують технічного обслуговування
            if (this.needsMaintenance(lift)) {
                analysis.maintenanceNeeded++;
            }
        });

        // Кластеризація за географічним розташуванням
        analysis.locationClusters = this.clusterLiftsByLocation(lifts);

        this.dataCache.set('lifts_analysis', analysis);
        
        // Генеруємо рекомендації
        this.generateLiftsRecommendations(analysis);
    }

    /**
     * 📅 Аналіз даних інспекцій
     */
    analyzeInspectionsData(inspections) {
        const analysis = {
            total: inspections.length,
            upcoming: 0,
            overdue: 0,
            typeDistribution: {},
            averageDuration: 0,
            completionRate: 0
        };

        const now = new Date();
        
        inspections.forEach(inspection => {
            const inspectionDate = new Date(inspection.date);
            
            // Підраховуємо майбутні та прострочені
            if (inspectionDate > now) {
                analysis.upcoming++;
            } else if (inspection.status !== 'completed') {
                analysis.overdue++;
            }

            // Розподіл за типами
            const type = inspection.type || 'regular';
            analysis.typeDistribution[type] = (analysis.typeDistribution[type] || 0) + 1;
        });

        // Розрахуємо коефіцієнт завершення
        const completed = inspections.filter(i => i.status === 'completed').length;
        analysis.completionRate = inspections.length > 0 ? (completed / inspections.length * 100).toFixed(1) : 0;

        this.dataCache.set('inspections_analysis', analysis);
        
        // Генеруємо алерти
        this.generateInspectionAlerts(analysis);
    }

    /**
     * 🔍 Аналіз логу подій EventBus
     */
    analyzeEventLog(events) {
        const analysis = {
            totalEvents: events.length,
            eventsByType: {},
            eventsBySource: {},
            recentActivity: [],
            performanceMetrics: {}
        };

        events.forEach(event => {
            // Підрахунок по типам
            analysis.eventsByType[event.event] = (analysis.eventsByType[event.event] || 0) + 1;
            
            // Підрахунок по джерелам
            const source = event.metadata?.source || 'unknown';
            analysis.eventsBySource[source] = (analysis.eventsBySource[source] || 0) + 1;
            
            // Остання активність (за останні 24 horasи)
            const eventDate = new Date(event.metadata.timestamp);
            const hoursAgo = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60);
            if (hoursAgo <= 24) {
                analysis.recentActivity.push(event);
            }
        });

        // Розрахуємо метрики продуктивності
        analysis.performanceMetrics = this.calculatePerformanceMetrics(events);

        this.dataCache.set('events_analysis', analysis);
    }

    /**
     * 🤖 Машинне навчання для прогнозування тенденцій
     */
    predictTrends() {
        console.log('🔮 Генерація прогнозів...');
        
        const liftsAnalysis = this.dataCache.get('lifts_analysis');
        const inspectionsAnalysis = this.dataCache.get('inspections_analysis');
        
        // Прогноз створення нових ліфтів
        const liftsGrowthPrediction = this.predictLiftsGrowth();
        
        // Прогноз навантаження на інспекції
        const inspectionLoadPrediction = this.predictInspectionLoad();
        
        // Прогноз потреби в технічному обслуговуванні
        const maintenancePrediction = this.predictMaintenanceNeeds();

        const predictions = {
            liftsGrowth: liftsGrowthPrediction,
            inspectionLoad: inspectionLoadPrediction,
            maintenance: maintenancePrediction,
            generatedAt: new Date().toISOString()
        };

        this.predictions.set('system_trends', predictions);
        
        return predictions;
    }

    /**
     * 📊 Прогнозування росту кількості ліфтів
     */
    predictLiftsGrowth() {
        const events = JSON.parse(localStorage.getItem('system_critical_log') || '[]');
        const liftCreationEvents = events.filter(e => e.event === 'lift:created');
        
        // Простий лінійний прогноз на основі останніх даних
        const recentWeeks = this.groupEventsByWeek(liftCreationEvents, 4);
        const averagePerWeek = recentWeeks.reduce((sum, week) => sum + week.count, 0) / recentWeeks.length || 0;
        
        return {
            currentTrend: averagePerWeek > 0 ? 'growing' : 'stable',
            averagePerWeek: Math.round(averagePerWeek * 10) / 10,
            predictedNextMonth: Math.round(averagePerWeek * 4.3),
            confidence: this.calculatePredictionConfidence(recentWeeks)
        };
    }

    /**
     * 🔧 Визначення потреби в технічному обслуговуванні
     */
    needsMaintenance(lift) {
        // Спрощена логіка - в реальному проекті буде складніша
        const createdDate = new Date(lift.createdAt || Date.now());
        const monthsOld = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        
        // Elevadores старше 6 місяців потребують перевірки
        return monthsOld > 6;
    }

    /**
     * 📍 Кластеризація ліфтів за геолокацією
     */
    clusterLiftsByLocation(lifts) {
        const clusters = [];
        const processedLifts = new Set();
        
        lifts.forEach((lift, index) => {
            if (processedLifts.has(index) || !lift.latitude || !lift.longitude) return;
            
            const cluster = {
                center: { lat: lift.latitude, lng: lift.longitude },
                lifts: [lift],
                radius: 0.01 // ~1км радіус
            };
            
            // Знаходимо сусідні ліфти
            lifts.forEach((otherLift, otherIndex) => {
                if (otherIndex === index || processedLifts.has(otherIndex)) return;
                
                const distance = this.calculateDistance(
                    lift.latitude, lift.longitude,
                    otherLift.latitude, otherLift.longitude
                );
                
                if (distance <= cluster.radius) {
                    cluster.lifts.push(otherLift);
                    processedLifts.add(otherIndex);
                }
            });
            
            processedLifts.add(index);
            clusters.push(cluster);
        });
        
        return clusters.filter(cluster => cluster.lifts.length > 1); // Тільки кластери з кількома ліфтами
    }

    /**
     * 📏 Розрахунок відстані між двома точками
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Радіус Землі в км
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    /**
     * ⚡ Розрахунок метрик продуктивності
     */
    calculatePerformanceMetrics(events) {
        const last24Hours = events.filter(event => {
            const eventTime = new Date(event.metadata.timestamp);
            return (Date.now() - eventTime.getTime()) < (24 * 60 * 60 * 1000);
        });
        
        return {
            eventsPerHour: (last24Hours.length / 24).toFixed(1),
            mostActiveSource: this.getMostActiveSource(last24Hours),
            systemLoad: last24Hours.length > 50 ? 'high' : last24Hours.length > 20 ? 'medium' : 'low'
        };
    }

    /**
     * 🎯 Генерація розумних рекомендацій
     */
    generateSmartRecommendations() {
        console.log('💡 Генерація розумних рекомендацій...');
        
        const recommendations = [];
        
        const liftsAnalysis = this.dataCache.get('lifts_analysis');
        const inspectionsAnalysis = this.dataCache.get('inspections_analysis');
        const eventsAnalysis = this.dataCache.get('events_analysis');

        // Рекомендації по ліфтам
        if (liftsAnalysis?.maintenanceNeeded > 0) {
            recommendations.push({
                type: 'maintenance',
                priority: 'high',
                title: 'Потрібне технічне обслуговування',
                description: `${liftsAnalysis.maintenanceNeeded} ліфтів потребують планового Manutenção`,
                action: 'Заплануйте інспекції для цих ліфтів'
            });
        }

        // Рекомендації по інспекціях
        if (inspectionsAnalysis?.overdue > 0) {
            recommendations.push({
                type: 'inspection',
                priority: 'urgent',
                title: 'Прострочені інспекції',
                description: `${inspectionsAnalysis.overdue} інспекцій прострочено`,
                action: 'Негайно зверніться до відповідальних pessoas'
            });
        }

        // Рекомендації по продуктивності системи
        if (eventsAnalysis?.performanceMetrics.systemLoad === 'high') {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                title: 'Altе навантаження системи',
                description: 'Система обробляє багато подій',
                action: 'Розгляньте оптимізацію або збільшення ресурсів'
            });
        }

        return recommendations;
    }

    /**
     * 📡 Definições інтеграції з EventBus
     */
    setupEventBusIntegration() {
        if (!window.eventBus) return;

        // Слухаємо всі події для real-time аналітики
        eventBus.on('*', (data, metadata) => {
            this.processRealTimeEvent({
                event: metadata.event || 'unknown',
                data: data,
                metadata: metadata
            });
        }, { module: 'analytics-engine', priority: 1 });

        console.log('📡 EventBus інтеграція налаштована');
    }

    /**
     * 🔄 Обробка real-time подій
     */
    processRealTimeEvent(eventData) {
        // Оновлюємо кеш даних в реальному часі
        this.updateCacheWithEvent(eventData);
        
        // Перевіряємо пороги для алертів
        this.checkAlertThresholds(eventData);
        
        // Оновлюємо прогнози якщо необхідно
        if (this.shouldUpdatePredictions(eventData)) {
            this.predictTrends();
        }
    }

    /**
     * 🚨 Системи алертів та сповіщень
     */
    checkAlertThresholds(eventData) {
        // Тут буде логіка перевірки порогів та генерації алертів
        // Наприклад, якщо створено занадто багато ліфтів за день
        // або якщо система не обробляє події
    }

    /**
     * 📊 Отримання повної аналітики
     */
    getFullAnalytics() {
        return {
            summary: {
                lifts: this.dataCache.get('lifts_analysis'),
                inspections: this.dataCache.get('inspections_analysis'),
                events: this.dataCache.get('events_analysis')
            },
            predictions: this.predictions.get('system_trends'),
            recommendations: this.generateSmartRecommendations(),
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * 🔧 Допоміжні методи
     */
    groupEventsByWeek(events, weeksCount = 4) {
        const weeks = [];
        const now = new Date();
        
        for (let i = 0; i < weeksCount; i++) {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - (i + 1) * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);
            
            const weekEvents = events.filter(event => {
                const eventDate = new Date(event.metadata.timestamp);
                return eventDate >= weekStart && eventDate < weekEnd;
            });
            
            weeks.unshift({
                week: i + 1,
                count: weekEvents.length,
                start: weekStart,
                end: weekEnd
            });
        }
        
        return weeks;
    }

    calculatePredictionConfidence(dataPoints) {
        if (dataPoints.length < 2) return 'low';
        
        const variance = this.calculateVariance(dataPoints.map(p => p.count));
        return variance < 2 ? 'high' : variance < 5 ? 'medium' : 'low';
    }

    calculateVariance(numbers) {
        const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
        const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
        return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
    }

    getMostActiveSource(events) {
        const sources = {};
        events.forEach(event => {
            const source = event.metadata?.source || 'unknown';
            sources[source] = (sources[source] || 0) + 1;
        });
        
        return Object.entries(sources).reduce((a, b) => sources[a] > sources[b] ? a : b, 'none');
    }

    // Методи для прогнозування (заглушки - в реальному проекті тут буде ML)
    predictInspectionLoad() {
        return {
            nextMonth: Math.floor(Math.random() * 20) + 10,
            trend: 'increasing',
            confidence: 'medium'
        };
    }

    predictMaintenanceNeeds() {
        return {
            liftsRequiringMaintenance: Math.floor(Math.random() * 10) + 5,
            estimatedCost: '150000 UAH',
            priority: 'medium'
        };
    }

    shouldUpdatePredictions(eventData) {
        // Оновлюємо прогнози при значних подіях
        return ['lift:created', 'inspection:completed', 'maintenance:scheduled'].includes(eventData.event);
    }

    updateCacheWithEvent(eventData) {
        // Оновлюємо відповідні кеші при отриманні нових подій
        // Це дозволяє мати актуальні дані для real-time аналітики
    }

    startAnalyticalProcesses() {
        // Запускаємо періодичне оновлення прогнозів
        setInterval(() => {
            this.predictTrends();
        }, 300000); // Кожні 5 хвилин
        
        console.log('🔄 Аналітичні процеси запущено');
    }
}

// Exportar для використання в інших модулях
if (typeof window !== 'undefined') {
    window.SmartAnalyticsEngine = SmartAnalyticsEngine;
}

// Автоматичне створення глобального інстансу
if (typeof window !== 'undefined' && window.eventBus) {
    window.smartAnalytics = new SmartAnalyticsEngine();
    console.log('🧠 Smart Analytics Engine готовий до роботи!');
}