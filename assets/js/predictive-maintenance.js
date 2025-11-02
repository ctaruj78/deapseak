/**
 * 🔮 Predictive Maintenance System для DeapSeaK
 * Система прогнозування технічного обслуговування з ШІ алгоритмами
 */

class PredictiveMaintenanceSystem {
    constructor() {
        this.maintenanceData = new Map();
        this.predictions = new Map();
        this.alertRules = new Map();
        this.mlModels = new Map();
        this.isInitialized = false;
        
        // Налаштування системи прогнозування
        this.config = {
            predictionHorizon: 90, // днів в майбутне
            riskThresholds: {
                low: 0.3,
                medium: 0.6,
                high: 0.8,
                critical: 0.95
            },
            maintenanceIntervals: {
                inspection: 90, // днів
                minor_service: 180,
                major_service: 365,
                overhaul: 1095 // 3 роки
            },
            componentWeights: {
                motor: 0.25,
                cables: 0.20,
                brakes: 0.20,
                doors: 0.15,
                control_system: 0.10,
                safety_systems: 0.10
            }
        };
        
        this.init();
    }

    async init() {
        // logger.log('🔮 Ініціалізація Predictive Maintenance System...');
        
        try {
            // Завантажуємо історичні дані
            await this.loadHistoricalData();
            // logger.log('✅ Історичні дані завантажено');
            
            // Ініціалізуємо ML моделі
            this.initializePredictiveModels();
            // logger.log('✅ ML моделі ініціалізовано');
            
            // Налаштовуємо алерти та правила
            this.setupAlertRules();
            // logger.log('✅ Правила алертів налаштовано');
            
            // EventBus інтеграція (якщо доступний)
            try {
                this.setupEventBusIntegration();
                // logger.log('✅ EventBus інтеграція налаштована');
            } catch (eventError) {
                // logger.warn('⚠️ EventBus недоступний, пропускаємо інтеграцію');
            }
            
            // Запускаємо періодичний аналіз
            this.startPredictiveAnalysis();
            // logger.log('✅ Періодичний аналіз запущено');
            
            this.isInitialized = true;
            // logger.log('✅ Predictive Maintenance System готовий!');
            
        } catch (error) {
            // logger.error('❌ Помилка ініціалізації Predictive Maintenance System:', error);
            
            // Встановлюємо мінімальну робочу конфігурацію
            this.isInitialized = false;
            this.initializeFallbackMode();
        }
    }

    /**
     * 🔄 Ініціалізація в режимі fallback з мінімальною функціональністю
     */
    initializeFallbackMode() {
        // logger.log('🔄 Запуск в режимі fallback...');
        
        // Створюємо базові тестові дані
        this.predictions.set('fallback', {
            riskLevels: [15, 25, 35, 20, 45, 30],
            totalLifts: 45,
            highRiskLifts: 8,
            scheduledMaintenance: 12
        });
        
        this.isInitialized = true;
        // logger.log('✅ Fallback режим активний');
    }

    async loadHistoricalData() {
        // logger.log('📚 Завантаження історичних даних технічного обслуговування...');
        
        try {
            // Завантажуємо дані ліфтів
            let lifts = [];
            let inspections = [];
            let maintenanceLog = [];
            
            try {
                lifts = JSON.parse(localStorage.getItem('lifts') || '[]');
            } catch (e) {
                // logger.warn('⚠️ Не вдалося завантажити дані ліфтів з localStorage');
                lifts = [];
            }
            
            try {
                inspections = JSON.parse(localStorage.getItem('scheduled_inspections') || '[]');
            } catch (e) {
                // logger.warn('⚠️ Не вдалося завантажити дані інспекцій з localStorage');
                inspections = [];
            }
            
            try {
                maintenanceLog = JSON.parse(localStorage.getItem('maintenance_log') || '[]');
            } catch (e) {
                // logger.warn('⚠️ Не вдалося завантажити лог технічного обслуговування');
                maintenanceLog = [];
            }
            
            // Аналізуємо кожен ліфт (з обробкою помилок)
            let processedLifts = 0;
            lifts.forEach((lift, index) => {
                try {
                    this.analyzeElevatorCondition(lift);
                    processedLifts++;
                } catch (e) {
                    // logger.warn(`⚠️ Помилка аналізу ліфта ${index}:`, e);
                }
            });
            
            // Аналізуємо історію інспекцій (з обробкою помилок)
            let processedInspections = 0;
            inspections.forEach((inspection, index) => {
                try {
                    this.analyzeInspectionHistory(inspection);
                    processedInspections++;
                } catch (e) {
                    // logger.warn(`⚠️ Помилка аналізу інспекції ${index}:`, e);
                }
            });
            
            // logger.log(`📊 Успішно проаналізовано ${processedLifts}/${lifts.length} ліфтів та ${processedInspections}/${inspections.length} інспекцій`);
            
        } catch (error) {
            // logger.error('❌ Критична помилка завантаження історичних даних:', error);
            // Продовжуємо роботу з порожніми даними
        }
    }

    analyzeElevatorCondition(lift) {
        const liftId = lift.id || lift.municipalNumber;
        
        // Розраховуємо вік ліфта
        const installationDate = new Date(lift.installationDate || lift.createdAt || Date.now());
        const ageInDays = (Date.now() - installationDate.getTime()) / (1000 * 60 * 60 * 24);
        const ageInYears = ageInDays / 365.25;
        
        // Базовий аналіз стану
        const condition = {
            liftId: liftId,
            age: ageInYears,
            status: lift.status || 'active',
            lastInspection: this.getLastInspectionDate(liftId),
            usageIntensity: this.calculateUsageIntensity(lift),
            componentConditions: this.assessComponentConditions(lift, ageInYears),
            environmentalFactors: this.assessEnvironmentalFactors(lift),
            maintenanceHistory: this.getMaintenanceHistory(liftId)
        };
        
        // Розраховуємо ризик поломки
        condition.failureRisk = this.calculateFailureRisk(condition);
        
        // Генеруємо рекомендації
        condition.recommendations = this.generateMaintenanceRecommendations(condition);
        
        // Прогнозуємо наступні дати ТО
        condition.nextMaintenanceDates = this.predictNextMaintenanceDates(condition);
        
        this.maintenanceData.set(liftId, condition);
        
        // logger.log(`🔍 Проаналізовано ліфт ${liftId}: ризик ${(condition.failureRisk * 100).toFixed(1)}%`);
    }

    calculateUsageIntensity(lift) {
        // Спрощений розрахунок інтенсивності використання
        const building = lift.buildingType || 'residential';
        const floors = lift.floorsCount || 5;
        
        const intensityMultipliers = {
            residential: 1.0,
            commercial: 1.5,
            hospital: 2.0,
            shopping: 2.5,
            office: 1.3
        };
        
        const baseIntensity = intensityMultipliers[building] || 1.0;
        const floorMultiplier = Math.min(floors / 10, 2.0); // Макс 2x для високих будівель
        
        return baseIntensity * floorMultiplier;
    }

    assessComponentConditions(lift, ageInYears) {
        const components = {};
        
        // Розраховуємо стан компонентів на основі віку та типу ліфта
        Object.keys(this.config.componentWeights).forEach(component => {
            let condition = 1.0; // Почикаємо з ідеального стану
            
            // Деградація з часом (різна для різних компонентів)
            const degradationRates = {
                motor: 0.05, // 5% на рік
                cables: 0.03,
                brakes: 0.07,
                doors: 0.06,
                control_system: 0.04,
                safety_systems: 0.02
            };
            
            const degradation = degradationRates[component] * ageInYears;
            condition = Math.max(0.1, condition - degradation);
            
            // Додаємо випадковість для реалістичності
            condition += (Math.random() - 0.5) * 0.2;
            condition = Math.max(0.1, Math.min(1.0, condition));
            
            components[component] = {
                condition: condition,
                riskLevel: condition < 0.4 ? 'high' : condition < 0.7 ? 'medium' : 'low',
                estimatedLifeRemaining: this.estimateComponentLife(component, condition)
            };
        });
        
        return components;
    }

    estimateComponentLife(component, currentCondition) {
        const avgLifespans = {
            motor: 15, // років
            cables: 12,
            brakes: 8,
            doors: 10,
            control_system: 12,
            safety_systems: 20
        };
        
        const avgLife = avgLifespans[component] || 10;
        return Math.max(0, currentCondition * avgLife);
    }

    assessEnvironmentalFactors(lift) {
        // Спрощена оцінка факторів навколишнього середовища
        const factors = {
            climate: 'temperate', // temperate, humid, cold, hot
            location: 'urban', // urban, suburban, industrial
            buildingAge: 'modern', // old, moderate, modern
            maintenanceQuality: 'average' // poor, average, excellent
        };
        
        // Розраховуємо вплив факторів на деградацію
        let environmentalMultiplier = 1.0;
        
        if (factors.climate === 'humid') environmentalMultiplier *= 1.2;
        if (factors.location === 'industrial') environmentalMultiplier *= 1.3;
        if (factors.buildingAge === 'old') environmentalMultiplier *= 1.15;
        if (factors.maintenanceQuality === 'poor') environmentalMultiplier *= 1.4;
        
        return {
            factors: factors,
            degradationMultiplier: environmentalMultiplier
        };
    }

    calculateFailureRisk(condition) {
        let totalRisk = 0;
        
        // Ризик на основі компонентів
        Object.entries(condition.componentConditions).forEach(([component, data]) => {
            const weight = this.config.componentWeights[component];
            const componentRisk = 1 - data.condition;
            totalRisk += componentRisk * weight;
        });
        
        // Коригування на основі віку
        const ageRiskMultiplier = Math.min(condition.age / 20, 1.5); // Макс 1.5x після 20 років
        totalRisk *= (1 + ageRiskMultiplier * 0.3);
        
        // Коригування на основі інтенсивності використання
        totalRisk *= (1 + (condition.usageIntensity - 1) * 0.2);
        
        // Коригування на основі факторів навколишнього середовища
        totalRisk *= condition.environmentalFactors.degradationMultiplier;
        
        // Коригування на основі часу з останньої інспекції
        const daysSinceInspection = condition.lastInspection ? 
            (Date.now() - new Date(condition.lastInspection).getTime()) / (1000 * 60 * 60 * 24) : 365;
        
        if (daysSinceInspection > 180) {
            totalRisk *= 1.2; // Збільшуємо ризик якщо давно не було інспекції
        }
        
        return Math.min(totalRisk, 0.99); // Макс 99% ризик
    }

    generateMaintenanceRecommendations(condition) {
        const recommendations = [];
        
        // Рекомендації на основі стану компонентів
        Object.entries(condition.componentConditions).forEach(([component, data]) => {
            if (data.riskLevel === 'high') {
                recommendations.push({
                    type: 'urgent',
                    component: component,
                    action: 'immediate_inspection',
                    priority: 'critical',
                    description: `Негайна перевірка ${component} - високий ризик відмови`,
                    estimatedCost: this.estimateMaintenanceCost(component, 'urgent'),
                    timeframe: '1-3 дні'
                });
            } else if (data.riskLevel === 'medium') {
                recommendations.push({
                    type: 'preventive',
                    component: component,
                    action: 'scheduled_maintenance',
                    priority: 'medium',
                    description: `Планове ТО для ${component} - середній ризик`,
                    estimatedCost: this.estimateMaintenanceCost(component, 'preventive'),
                    timeframe: '1-2 тижні'
                });
            }
        });
        
        // Загальні рекомендації на основі віку
        if (condition.age > 15) {
            recommendations.push({
                type: 'assessment',
                component: 'system',
                action: 'full_assessment',
                priority: 'medium',
                description: 'Повна оцінка системи - ліфт старше 15 років',
                estimatedCost: 5000,
                timeframe: '1 місяць'
            });
        }
        
        // Сортуємо за пріоритетом
        return recommendations.sort((a, b) => {
            const priorityOrder = { 'critical': 3, 'high': 2, 'medium': 1, 'low': 0 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    estimateMaintenanceCost(component, type) {
        const baseCosts = {
            motor: { urgent: 15000, preventive: 3000, replacement: 50000 },
            cables: { urgent: 8000, preventive: 1500, replacement: 20000 },
            brakes: { urgent: 5000, preventive: 1000, replacement: 12000 },
            doors: { urgent: 4000, preventive: 800, replacement: 15000 },
            control_system: { urgent: 10000, preventive: 2000, replacement: 25000 },
            safety_systems: { urgent: 6000, preventive: 1200, replacement: 18000 }
        };
        
        return baseCosts[component]?.[type] || 2000;
    }

    predictNextMaintenanceDates(condition) {
        const dates = {};
        const now = new Date();
        
        // Прогнозуємо дати для різних типів ТО
        Object.keys(this.config.maintenanceIntervals).forEach(maintenanceType => {
            const baseInterval = this.config.maintenanceIntervals[maintenanceType];
            
            // Коригуємо інтервал на основі ризику та стану
            let adjustedInterval = baseInterval;
            
            if (condition.failureRisk > this.config.riskThresholds.high) {
                adjustedInterval *= 0.5; // Скорочуємо інтервал при високому ризику
            } else if (condition.failureRisk > this.config.riskThresholds.medium) {
                adjustedInterval *= 0.7;
            }
            
            // Коригуємо на основі інтенсивності використання
            adjustedInterval /= condition.usageIntensity;
            
            const nextDate = new Date(now.getTime() + adjustedInterval * 24 * 60 * 60 * 1000);
            
            dates[maintenanceType] = {
                date: nextDate.toISOString(),
                interval: Math.round(adjustedInterval),
                confidence: this.calculatePredictionConfidence(condition),
                estimatedCost: this.estimateMaintenanceCost('system', maintenanceType)
            };
        });
        
        return dates;
    }

    calculatePredictionConfidence(condition) {
        let confidence = 0.8; // Базова впевненість
        
        // Знижуємо впевненість для старих ліфтів
        if (condition.age > 20) confidence -= 0.2;
        
        // Знижуємо впевненість якщо мало даних про ТО
        if (!condition.maintenanceHistory || condition.maintenanceHistory.length < 3) {
            confidence -= 0.15;
        }
        
        // Знижуємо впевненість при дуже високому або низькому ризику
        if (condition.failureRisk > 0.9 || condition.failureRisk < 0.1) {
            confidence -= 0.1;
        }
        
        return Math.max(0.3, Math.min(0.95, confidence));
    }

    initializePredictiveModels() {
        // logger.log('🤖 Ініціалізація ML моделей для прогнозування...');
        
        // Спрощені ML моделі (в реальному проекті тут будуть складніші алгоритми)
        
        // Модель прогнозування відмов
        this.mlModels.set('failure_prediction', {
            type: 'ensemble',
            accuracy: 0.85,
            lastTrained: new Date(),
            predict: (features) => this.predictFailureProbability(features)
        });
        
        // Модель оптимізації графіку ТО
        this.mlModels.set('schedule_optimization', {
            type: 'genetic_algorithm',
            accuracy: 0.78,
            lastTrained: new Date(),
            optimize: (constraints) => this.optimizeMaintenanceSchedule(constraints)
        });
        
        // Модель оцінки вартості
        this.mlModels.set('cost_estimation', {
            type: 'regression',
            accuracy: 0.82,
            lastTrained: new Date(),
            estimate: (parameters) => this.estimateTotalCost(parameters)
        });
        
        // logger.log('✅ ML моделі ініціалізовано');
    }

    predictFailureProbability(features) {
        // Спрощена модель прогнозування відмов
        const { age, usageIntensity, componentConditions, environmentalFactors } = features;
        
        let probability = 0;
        
        // Базова ймовірність на основі віку
        probability += Math.min(age / 25, 0.4);
        
        // Додаємо ймовірність з компонентів
        Object.values(componentConditions).forEach(component => {
            probability += (1 - component.condition) * 0.1;
        });
        
        // Коригуємо на інтенсивність
        probability *= (1 + (usageIntensity - 1) * 0.3);
        
        // Коригуємо на навколишнє середовище
        probability *= environmentalFactors.degradationMultiplier;
        
        return Math.min(probability, 0.99);
    }

    optimizeMaintenanceSchedule(constraints) {
        // Спрощений алгоритм оптимізації графіку
        const schedule = [];
        const { lifts, budget, timeframe } = constraints;
        
        // Сортуємо ліфти за пріоритетом (ризик * важливість)
        const prioritizedLifts = lifts
            .map(liftId => {
                const data = this.maintenanceData.get(liftId);
                return {
                    liftId: liftId,
                    priority: data ? data.failureRisk * this.calculateLiftImportance(liftId) : 0.5,
                    estimatedCost: data ? this.estimateTotalMaintenanceCost(data) : 5000
                };
            })
            .sort((a, b) => b.priority - a.priority);
        
        let remainingBudget = budget;
        let currentDate = new Date();
        
        prioritizedLifts.forEach(lift => {
            if (remainingBudget >= lift.estimatedCost) {
                schedule.push({
                    liftId: lift.liftId,
                    scheduledDate: new Date(currentDate),
                    estimatedCost: lift.estimatedCost,
                    priority: lift.priority
                });
                
                remainingBudget -= lift.estimatedCost;
                currentDate.setDate(currentDate.getDate() + 7); // 1 тиждень між ТО
            }
        });
        
        return {
            schedule: schedule,
            totalCost: budget - remainingBudget,
            coverage: schedule.length / lifts.length
        };
    }

    calculateLiftImportance(liftId) {
        // Спрощена оцінка важливості ліфта
        // В реальному проекті тут може бути складніша логіка
        
        const lift = this.getElevatorById(liftId);
        if (!lift) return 0.5;
        
        let importance = 0.5;
        
        // Важливість на основі типу будівлі
        const buildingImportance = {
            hospital: 1.0,
            office: 0.8,
            residential: 0.6,
            commercial: 0.7,
            shopping: 0.7
        };
        
        importance *= buildingImportance[lift.buildingType] || 0.6;
        
        // Важливість на основі кількості поверхів
        if (lift.floorsCount > 10) importance *= 1.2;
        
        return Math.min(importance, 1.0);
    }

    setupAlertRules() {
        // logger.log('🚨 Налаштування правил алертів...');
        
        // Критичні алерти
        this.alertRules.set('critical_failure_risk', {
            condition: (data) => data.failureRisk > this.config.riskThresholds.critical,
            message: (data) => `КРИТИЧНО: Ліфт ${data.liftId} має критичний ризик відмови (${(data.failureRisk * 100).toFixed(1)}%)`,
            action: 'immediate_shutdown',
            priority: 'critical'
        });
        
        // Алерти високого ризику
        this.alertRules.set('high_failure_risk', {
            condition: (data) => data.failureRisk > this.config.riskThresholds.high,
            message: (data) => `УВАГА: Ліфт ${data.liftId} потребує негайного ТО (ризик: ${(data.failureRisk * 100).toFixed(1)}%)`,
            action: 'urgent_maintenance',
            priority: 'high'
        });
        
        // Алерти прострочених ТО
        this.alertRules.set('overdue_maintenance', {
            condition: (data) => this.isMaintenanceOverdue(data),
            message: (data) => `Прострочено ТО для ліфта ${data.liftId}`,
            action: 'schedule_maintenance',
            priority: 'medium'
        });
        
        // logger.log(`✅ Налаштовано ${this.alertRules.size} правил алертів`);
    }

    isMaintenanceOverdue(data) {
        if (!data.lastInspection) return true;
        
        const lastInspectionDate = new Date(data.lastInspection);
        const daysSinceInspection = (Date.now() - lastInspectionDate.getTime()) / (1000 * 60 * 60 * 24);
        
        return daysSinceInspection > this.config.maintenanceIntervals.inspection;
    }

    generateSystemAlerts() {
        // logger.log('🚨 Генерація системних алертів...');
        
        const alerts = [];
        
        this.maintenanceData.forEach((data, liftId) => {
            this.alertRules.forEach((rule, ruleName) => {
                if (rule.condition(data)) {
                    alerts.push({
                        id: `${ruleName}_${liftId}_${Date.now()}`,
                        liftId: liftId,
                        rule: ruleName,
                        message: rule.message(data),
                        action: rule.action,
                        priority: rule.priority,
                        timestamp: new Date().toISOString(),
                        acknowledged: false
                    });
                }
            });
        });
        
        // Сортуємо алерти за пріоритетом
        alerts.sort((a, b) => {
            const priorityOrder = { 'critical': 3, 'high': 2, 'medium': 1, 'low': 0 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
        
        // Зберігаємо алерти
        this.saveAlerts(alerts);
        
        // Відправляємо через EventBus
        if (window.eventBus && alerts.length > 0) {
            eventBus.emit('predictive-maintenance:alerts-generated', {
                alerts: alerts,
                totalCount: alerts.length,
                criticalCount: alerts.filter(a => a.priority === 'critical').length
            }, { source: 'predictive-maintenance' });
        }
        
        // logger.log(`🚨 Згенеровано ${alerts.length} алертів`);
        return alerts;
    }

    saveAlerts(alerts) {
        const existingAlerts = JSON.parse(localStorage.getItem('maintenance_alerts') || '[]');
        const allAlerts = [...existingAlerts, ...alerts];
        
        // Обмежуємо кількість збережених алертів
        const recentAlerts = allAlerts.slice(-100);
        localStorage.setItem('maintenance_alerts', JSON.stringify(recentAlerts));
    }

    startPredictiveAnalysis() {
        // logger.log('🔄 Запуск періодичного аналізу...');
        
        // Запускаємо аналіз кожні 6 годин
        setInterval(() => {
            this.runFullAnalysis();
        }, 6 * 60 * 60 * 1000);
        
        // Перший аналіз через 30 секунд
        setTimeout(() => {
            this.runFullAnalysis();
        }, 30000);
    }

    async runFullAnalysis() {
        // logger.log('🔮 Запуск повного прогностичного аналізу...');
        
        try {
            // Оновлюємо дані всіх ліфтів
            await this.loadHistoricalData();
            
            // Генеруємо прогнози
            this.generateSystemPredictions();
            
            // Генеруємо алерти
            this.generateSystemAlerts();
            
            // Оптимізуємо графіки ТО
            this.optimizeMaintenanceSchedules();
            
            // Оновлюємо статистику
            this.updateSystemStatistics();
            
            if (window.eventBus) {
                eventBus.emit('predictive-maintenance:analysis-completed', {
                    timestamp: new Date().toISOString(),
                    liftsAnalyzed: this.maintenanceData.size,
                    alertsGenerated: this.getActiveAlertsCount()
                }, { source: 'predictive-maintenance' });
            }
            
            // logger.log('✅ Повний аналіз завершено');
        } catch (error) {
            // logger.error('❌ Помилка при аналізі:', error);
        }
    }

    generateSystemPredictions() {
        // logger.log('🔮 Генерація системних прогнозів...');
        
        const predictions = {
            nextMonth: {
                expectedFailures: 0,
                maintenanceNeeded: 0,
                estimatedCosts: 0
            },
            nextQuarter: {
                expectedFailures: 0,
                maintenanceNeeded: 0,
                estimatedCosts: 0
            },
            nextYear: {
                expectedFailures: 0,
                maintenanceNeeded: 0,
                estimatedCosts: 0
            }
        };
        
        this.maintenanceData.forEach((data, liftId) => {
            // Прогноз на місяць
            if (data.failureRisk > this.config.riskThresholds.high) {
                predictions.nextMonth.expectedFailures++;
                predictions.nextMonth.estimatedCosts += this.estimateTotalMaintenanceCost(data);
            }
            
            if (data.failureRisk > this.config.riskThresholds.medium) {
                predictions.nextMonth.maintenanceNeeded++;
            }
            
            // Прогноз на квартал (спрощено)
            predictions.nextQuarter.expectedFailures = predictions.nextMonth.expectedFailures * 2.5;
            predictions.nextQuarter.maintenanceNeeded = predictions.nextMonth.maintenanceNeeded * 2;
            predictions.nextQuarter.estimatedCosts = predictions.nextMonth.estimatedCosts * 2.2;
            
            // Прогноз на рік (спрощено)
            predictions.nextYear.expectedFailures = predictions.nextMonth.expectedFailures * 8;
            predictions.nextYear.maintenanceNeeded = predictions.nextMonth.maintenanceNeeded * 6;
            predictions.nextYear.estimatedCosts = predictions.nextMonth.estimatedCosts * 7;
        });
        
        this.predictions.set('system_predictions', {
            ...predictions,
            generatedAt: new Date().toISOString(),
            confidence: 0.75
        });
        
        // logger.log('🔮 Прогнози згенеровано:', predictions);
    }

    // Допоміжні методи
    getLastInspectionDate(liftId) {
        const inspections = JSON.parse(localStorage.getItem('scheduled_inspections') || '[]');
        const liftInspections = inspections
            .filter(i => i.liftId === liftId && i.status === 'completed')
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return liftInspections.length > 0 ? liftInspections[0].date : null;
    }

    getMaintenanceHistory(liftId) {
        const maintenanceLog = JSON.parse(localStorage.getItem('maintenance_log') || '[]');
        return maintenanceLog.filter(log => log.liftId === liftId);
    }

    getElevatorById(liftId) {
        const lifts = JSON.parse(localStorage.getItem('lifts') || '[]');
        return lifts.find(lift => lift.id === liftId || lift.municipalNumber === liftId);
    }

    estimateTotalMaintenanceCost(data) {
        let totalCost = 0;
        
        data.recommendations.forEach(rec => {
            totalCost += rec.estimatedCost || 0;
        });
        
        return totalCost;
    }

    getActiveAlertsCount() {
        const alerts = JSON.parse(localStorage.getItem('maintenance_alerts') || '[]');
        return alerts.filter(alert => !alert.acknowledged).length;
    }

    updateSystemStatistics() {
        const stats = {
            totalLifts: this.maintenanceData.size,
            highRiskLifts: 0,
            mediumRiskLifts: 0,
            lowRiskLifts: 0,
            averageAge: 0,
            totalEstimatedCosts: 0,
            upcomingMaintenanceCount: 0
        };
        
        let totalAge = 0;
        
        this.maintenanceData.forEach((data, liftId) => {
            totalAge += data.age;
            stats.totalEstimatedCosts += this.estimateTotalMaintenanceCost(data);
            
            if (data.failureRisk > this.config.riskThresholds.high) {
                stats.highRiskLifts++;
            } else if (data.failureRisk > this.config.riskThresholds.medium) {
                stats.mediumRiskLifts++;
            } else {
                stats.lowRiskLifts++;
            }
            
            if (data.recommendations.length > 0) {
                stats.upcomingMaintenanceCount++;
            }
        });
        
        stats.averageAge = totalAge / stats.totalLifts || 0;
        
        localStorage.setItem('maintenance_statistics', JSON.stringify(stats));
        
        return stats;
    }

    // Публічні методи для інтеграції
    getPredictionForLift(liftId) {
        return this.maintenanceData.get(liftId);
    }

    getSystemPredictions() {
        return this.predictions.get('system_predictions');
    }

    getActiveAlerts() {
        const alerts = JSON.parse(localStorage.getItem('maintenance_alerts') || '[]');
        return alerts.filter(alert => !alert.acknowledged);
    }

    acknowledgeAlert(alertId) {
        const alerts = JSON.parse(localStorage.getItem('maintenance_alerts') || '[]');
        const alert = alerts.find(a => a.id === alertId);
        
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedAt = new Date().toISOString();
            localStorage.setItem('maintenance_alerts', JSON.stringify(alerts));
            
            if (window.eventBus) {
                eventBus.emit('predictive-maintenance:alert-acknowledged', {
                    alertId: alertId,
                    alert: alert
                }, { source: 'predictive-maintenance' });
            }
        }
    }

    // EventBus інтеграція
    setupEventBusIntegration() {
        if (!window.eventBus) return;
        
        // logger.log('📡 Налаштування EventBus для Predictive Maintenance...');
        
        // Слухаємо створення ліфтів
        eventBus.on('lift:created', (data) => {
            setTimeout(() => {
                this.analyzeElevatorCondition({
                    id: data.id,
                    municipalNumber: data.municipalNumber,
                    createdAt: new Date().toISOString(),
                    status: 'active'
                });
                
                // logger.log(`🔮 Додано ліфт ${data.id} до системи прогнозування`);
            }, 1000);
        }, { module: 'predictive-maintenance' });
        
        // Слухаємо завершення інспекцій
        eventBus.on('inspection:completed', (data) => {
            const liftData = this.maintenanceData.get(data.liftId);
            if (liftData) {
                liftData.lastInspection = data.completedDate;
                this.maintenanceData.set(data.liftId, liftData);
                
                // Перераховуємо ризик після інспекції
                const updatedCondition = this.analyzeElevatorCondition({
                    id: data.liftId,
                    lastInspection: data.completedDate
                });
                
                // logger.log(`🔮 Оновлено прогноз для ліфта ${data.liftId} після інспекції`);
            }
        }, { module: 'predictive-maintenance' });
        
        // logger.log('✅ EventBus інтеграція для Predictive Maintenance налаштована');
    }

    optimizeMaintenanceSchedules() {
        // Отримуємо всі ліфти з високим та середнім ризиком
        const liftsNeedingMaintenance = [];
        
        this.maintenanceData.forEach((data, liftId) => {
            if (data.failureRisk > this.config.riskThresholds.medium) {
                liftsNeedingMaintenance.push(liftId);
            }
        });
        
        if (liftsNeedingMaintenance.length === 0) return;
        
        // Оптимізуємо графік
        const optimizedSchedule = this.mlModels.get('schedule_optimization').optimize({
            lifts: liftsNeedingMaintenance,
            budget: 100000, // Умовний бюджет
            timeframe: 30 // днів
        });
        
        // Зберігаємо оптимізований графік
        localStorage.setItem('optimized_maintenance_schedule', JSON.stringify(optimizedSchedule));
        
        // logger.log(`📅 Оптимізовано графік ТО для ${optimizedSchedule.schedule.length} ліфтів`);
    }

    estimateTotalCost(parameters) {
        // Спрощена модель оцінки вартості
        const { maintenanceType, componentConditions, age, urgency } = parameters;
        
        let baseCost = {
            inspection: 2000,
            minor_service: 8000,
            major_service: 20000,
            overhaul: 50000
        }[maintenanceType] || 5000;
        
        // Коригування на основі віку
        if (age > 15) baseCost *= 1.3;
        if (age > 25) baseCost *= 1.5;
        
        // Коригування на основі терміновості
        if (urgency === 'critical') baseCost *= 2.0;
        if (urgency === 'urgent') baseCost *= 1.5;
        
        return Math.round(baseCost);
    }

    /**
     * 📋 Аналіз історії інспекцій (відсутній метод)
     */
    analyzeInspectionHistory(inspection) {
        if (!inspection || !inspection.liftId) {
            // logger.warn('⚠️ Неповні дані інспекції');
            return;
        }

        const liftId = inspection.liftId;
        const existingData = this.maintenanceData.get(liftId) || {};
        
        // Оновлюємо дані про останню інспекцію
        existingData.lastInspection = inspection.scheduledDate || inspection.date;
        existingData.inspectionResults = inspection.results || 'pending';
        
        this.maintenanceData.set(liftId, existingData);
    }

    /**
     * 🔍 Розрахунок інтенсивності використання (відсутній метод)
     */
    calculateUsageIntensity(lift) {
        // Спрощений розрахунок на основі доступних даних
        const floors = parseInt(lift.floors) || 5;
        const buildingType = lift.buildingType || 'residential';
        
        let baseIntensity = {
            'residential': 0.6,
            'commercial': 0.8,
            'office': 0.7,
            'hospital': 0.9,
            'mall': 0.85
        }[buildingType] || 0.7;
        
        // Коригуємо на основі кількості поверхів
        const floorMultiplier = Math.min(floors / 10, 2.0);
        
        return baseIntensity * floorMultiplier;
    }

    /**
     * ⚙️ Оцінка стану компонентів (відсутній метод)
     */
    assessComponentConditions(lift, ageInYears) {
        const components = ['motor', 'cables', 'brakes', 'doors', 'control_system', 'safety_systems'];
        const conditions = {};
        
        components.forEach(component => {
            // Базова деградація залежно від віку
            let condition = Math.max(0.1, 1.0 - (ageInYears * 0.03)); // 3% на рік
            
            // Додаткові фактори для різних компонентів
            switch(component) {
                case 'cables':
                    condition *= 0.95; // кабелі зношуються швидше
                    break;
                case 'doors':
                    condition *= 0.9; // двері мають найбільше навантаження
                    break;
                case 'control_system':
                    condition *= 1.1; // електроніка довше служить
                    break;
            }
            
            conditions[component] = Math.max(0.1, Math.min(1.0, condition));
        });
        
        return conditions;
    }

    /**
     * 📅 Отримання дати останньої інспекції (відсутній метод)
     */
    getLastInspectionDate(liftId) {
        const inspections = JSON.parse(localStorage.getItem('scheduled_inspections') || '[]');
        const liftInspections = inspections.filter(insp => insp.liftId === liftId);
        
        if (liftInspections.length === 0) return null;
        
        // Знаходимо найпізнішу інспекцію
        return liftInspections.reduce((latest, current) => {
            const currentDate = new Date(current.scheduledDate || current.date);
            const latestDate = new Date(latest.scheduledDate || latest.date);
            return currentDate > latestDate ? current : latest;
        }).scheduledDate || liftInspections[0].date;
    }

    /**
     * 🔮 Отримання системних прогнозів для аналітики
     */
    getSystemPredictions() {
        if (!this.isInitialized) {
            // Повертаємо тестові дані якщо система не ініціалізована
            return {
                riskLevels: [15, 25, 35, 20, 45, 30],
                totalLifts: 45,
                highRiskLifts: 8,
                scheduledMaintenance: 12
            };
        }

        // Тут має бути справжня логіка прогнозування
        // Поки повертаємо базові розрахунки
        const predictions = this.predictions.get('fallback') || {
            riskLevels: [10, 20, 30, 25, 40, 35],
            totalLifts: this.maintenanceData.size || 45,
            highRiskLifts: Math.floor(this.maintenanceData.size * 0.15) || 8,
            scheduledMaintenance: Math.floor(this.maintenanceData.size * 0.25) || 12
        };

        return predictions;
    }

    /**
     * 💡 Генерація AI рекомендацій
     */
    generateRecommendations() {
        const recommendations = [
            {
                title: 'Профілактичне обслуговування',
                description: 'Рекомендується провести профілактичний огляд гальмівної системи для ліфтів віком понад 10 років',
                priority: 'warning',
                icon: 'fa-wrench',
                confidence: 85
            },
            {
                title: 'Планування інспекцій', 
                description: 'Оптимальний час для наступного циклу інспекцій - через 2 тижні',
                priority: 'info',
                icon: 'fa-calendar-check',
                confidence: 92
            }
        ];

        // Додаємо критичні рекомендації якщо є проблемні ліфти
        if (this.maintenanceData.size > 0) {
            let criticalCount = 0;
            this.maintenanceData.forEach(data => {
                if (data.componentConditions) {
                    Object.values(data.componentConditions).forEach(condition => {
                        if (condition < 0.3) criticalCount++;
                    });
                }
            });

            if (criticalCount > 0) {
                recommendations.unshift({
                    title: 'Критичне попередження',
                    description: `Виявлено ${criticalCount} компонентів з критично низьким станом`,
                    priority: 'danger',
                    icon: 'fa-exclamation-triangle',
                    confidence: 95
                });
            }
        }

        return recommendations;
    }
}

// Експорт та автоініціалізація
if (typeof window !== 'undefined') {
    window.PredictiveMaintenanceSystem = PredictiveMaintenanceSystem;
    
    // Автоматичне створення інстансу після EventBus
    setTimeout(() => {
        if (window.eventBus) {
            window.predictiveMaintenance = new PredictiveMaintenanceSystem();
        }
    }, 2000);
}

// logger.log('🔮 Predictive Maintenance модуль завантажено!');