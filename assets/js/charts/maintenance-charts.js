class MaintenanceCharts {
    constructor() {
        this.maintenanceData = new Map();
        this.predictiveModels = new Map();
        this.init();
    }

    async init() {
        await this.loadMaintenanceData();
        this.setupPredictiveMaintenance();
        this.initEquipmentHealthMonitoring();
        this.setupCostTracking();
        this.initDowntimeAnalysis();
    }

    async renderMaintenanceDashboard() {
        const maintenanceData = await this.loadMaintenanceData();
        
        this.renderEquipmentHealthCharts(maintenanceData.health);
        this.renderMaintenanceCostCharts(maintenanceData.costs);
        this.renderDowntimeCharts(maintenanceData.downtime);
        this.renderPreventiveMaintenanceCharts(maintenanceData.preventive);
        this.renderPredictiveMaintenanceCharts(maintenanceData.predictive);
    }

    renderEquipmentHealthCharts(healthData) {
        this.renderHealthStatusChart(healthData.status);
        this.renderHealthTrendChart(healthData.trends);
        this.renderComponentHealthChart(healthData.components);
    }

    renderHealthStatusChart(statusData) {
        const ctx = document.getElementById('health-status-chart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: statusData.labels,
                datasets: [{
                    data: statusData.values,
                    backgroundColor: [
                        '#27ae60', // Healthy - green
                        '#f39c12', // Warning - orange
                        '#e74c3c'  // Critical - red
                    ]
                }]
            },
            options: this.getMaintenanceChartOptions('health-status')
        });

        this.charts.set('health-status', chart);
    }

    renderMaintenanceCostCharts(costData) {
        this.renderCostTrendChart(costData.trends);
        this.renderCostBreakdownChart(costData.breakdown);
        this.renderCostEfficiencyChart(costData.efficiency);
        this.renderROIMaintenanceChart(costData.roi);
    }

    renderCostTrendChart(trendData) {
        const ctx = document.getElementById('cost-trend-chart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trendData.periods,
                datasets: [{
                    label: 'Витрати на техобслуговування',
                    data: trendData.costs,
                    borderColor: '#e74c3c',
                    backgroundColor: this.hexToRgba('#e74c3c', 0.1),
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Бюджет',
                    data: trendData.budget,
                    borderColor: '#3498db',
                    borderDash: [5, 5],
                    tension: 0.4
                }]
            },
            options: this.getMaintenanceChartOptions('cost-trend')
        });

        this.charts.set('cost-trend', chart);
    }

    // Predictive maintenance
    async renderPredictiveMaintenance() {
        const predictiveData = await this.calculatePredictiveMetrics();
        
        this.renderFailureProbabilityChart(predictiveData.failureProbability);
        this.renderRemainingUsefulLifeChart(predictiveData.remainingLife);
        this.renderAnomalyDetectionChart(predictiveData.anomalies);
        this.renderMaintenanceRecommendations(predictiveData.recommendations);
    }

    renderFailureProbabilityChart(probabilityData) {
        const ctx = document.getElementById('failure-probability-chart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: probabilityData.equipment,
                datasets: [{
                    label: 'Ймовірність відмови (%)',
                    data: probabilityData.probabilities,
                    backgroundColor: probabilityData.probabilities.map(p => 
                        p > 0.7 ? '#e74c3c' : p > 0.4 ? '#f39c12' : '#27ae60'
                    )
                }]
            },
            options: this.getMaintenanceChartOptions('predictive')
        });

        this.charts.set('failure-probability', chart);
    }

    // Downtime analysis
    async renderDowntimeAnalysis() {
        const downtimeData = await this.analyzeDowntime();
        
        this.renderDowntimeTrendChart(downtimeData.trends);
        this.renderDowntimeCausesChart(downtimeData.causes);
        this.renderMTTRChart(downtimeData.mttr);
        this.renderMTBFChart(downtimeData.mtbf);
    }

    renderDowntimeTrendChart(trendData) {
        const ctx = document.getElementById('downtime-trend-chart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trendData.periods,
                datasets: [{
                    label: 'Час простою (години)',
                    data: trendData.downtimeHours,
                    borderColor: '#e74c3c',
                    backgroundColor: this.hexToRgba('#e74c3c', 0.1),
                    fill: true,
                    tension: 0.4
                }]
            },
            options: this.getMaintenanceChartOptions('downtime')
        });

        this.charts.set('downtime-trend', chart);
    }

    // Preventive maintenance
    async renderPreventiveMaintenance() {
        const preventiveData = await this.analyzePreventiveMaintenance();
        
        this.renderPMScheduleChart(preventiveData.schedule);
        this.renderPMComplianceChart(preventiveData.compliance);
        this.renderPMEffectivenessChart(preventiveData.effectiveness);
    }

    renderPMScheduleChart(scheduleData) {
        const ctx = document.getElementById('pm-schedule-chart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'gantt',
            data: {
                tasks: scheduleData.tasks
            },
            options: this.getMaintenanceChartOptions('gantt')
        });

        this.charts.set('pm-schedule', chart);
    }

    // Equipment performance
    async renderEquipmentPerformance() {
        const performanceData = await this.analyzeEquipmentPerformance();
        
        this.renderOEEChart(performanceData.oee);
        this.renderUtilizationChart(performanceData.utilization);
        this.renderEfficiencyChart(performanceData.efficiency);
    }

    renderOEEChart(oeeData) {
        const ctx = document.getElementById('oee-chart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Доступність', 'Продуктивність', 'Якість', 'Загальний OEE'],
                datasets: [{
                    label: 'Фактичні показники',
                    data: [oeeData.availability, oeeData.performance, oeeData.quality, oeeData.overall],
                    backgroundColor: this.hexToRgba('#3498db', 0.2),
                    borderColor: '#3498db',
                    pointBackgroundColor: '#3498db'
                }, {
                    label: 'Цільові показники',
                    data: [0.9, 0.95, 0.99, 0.85], // Target values
                    backgroundColor: this.hexToRgba('#27ae60', 0.2),
                    borderColor: '#27ae60',
                    pointBackgroundColor: '#27ae60'
                }]
            },
            options: this.getMaintenanceChartOptions('radar')
        });

        this.charts.set('oee', chart);
    }

    // Maintenance optimization
    async renderMaintenanceOptimization() {
        const optimizationData = await this.analyzeMaintenanceOptimization();
        
        this.renderResourceAllocationChart(optimizationData.resourceAllocation);
        this.renderSparePartsInventoryChart(optimizationData.inventory);
        this.renderMaintenanceBacklogChart(optimizationData.backlog);
    }

    renderResourceAllocationChart(allocationData) {
        const ctx = document.getElementById('resource-allocation-chart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: allocationData.categories,
                datasets: [{
                    data: allocationData.values,
                    backgroundColor: [
                        '#3498db', '#e74c3c', '#f39c12', 
                        '#9b59b6', '#1abc9c', '#34495e'
                    ]
                }]
            },
            options: this.getMaintenanceChartOptions('resource-allocation')
        });

        this.charts.set('resource-allocation', chart);
    }

    // Utility methods
    getMaintenanceChartOptions(chartType) {
        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            return this.formatMaintenanceTooltip(context, chartType);
                        }
                    }
                }
            }
        };

        const typeSpecificOptions = {
            'health-status': {
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${context.raw} обладнання (${percentage}%)`;
                            }
                        }
                    }
                }
            },
            'cost-trend': {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => {
                                return new Intl.NumberFormat('uk-UA', {
                                    style: 'currency',
                                    currency: 'UAH',
                                    minimumFractionDigits: 0
                                }).format(value);
                            }
                        }
                    }
                }
            }
        };

        return this.mergeOptions(baseOptions, typeSpecificOptions[chartType] || {});
    }

    formatMaintenanceTooltip(context, chartType) {
        const label = context.dataset.label || '';
        const value = context.raw;
        
        switch (chartType) {
            case 'health-status':
                return `${label}: ${value} обладнання`;
            case 'cost-trend':
                return `${label}: ${this.formatFinancialValue(value, 'currency')}`;
            case 'downtime':
                return `${label}: ${value} годин`;
            case 'predictive':
                return `${label}: ${(value * 100).toFixed(1)}%`;
            default:
                return `${label}: ${value}`;
        }
    }

    calculatePredictiveMetrics() {
        // Implementation for predictive metrics calculation
        return {
            failureProbability: this.calculateFailureProbability(),
            remainingLife: this.calculateRemainingUsefulLife(),
            anomalies: this.detectAnomalies(),
            recommendations: this.generateMaintenanceRecommendations()
        };
    }

    analyzeDowntime() {
        // Implementation for downtime analysis
        return {
            trends: this.analyzeDowntimeTrends(),
            causes: this.analyzeDowntimeCauses(),
            mttr: this.calculateMTTR(),
            mtbf: this.calculateMTBF()
        };
    }
}