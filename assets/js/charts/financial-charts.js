class FinancialCharts {
    constructor() {
        this.financialData = new Map();
        this.indicators = new Map();
        this.init();
    }

    async init() {
        await this.loadFinancialData();
        this.setupTechnicalIndicators();
        this.initPerformanceMetrics();
        this.setupRiskAnalysis();
        this.initForecastingModels();
    }

    async renderFinancialDashboard() {
        const financialData = await this.loadFinancialData();
        
        this.renderRevenueCharts(financialData.revenue);
        this.renderExpenseCharts(financialData.expenses);
        this.renderProfitabilityCharts(financialData.profitability);
        this.renderCashFlowCharts(financialData.cashFlow);
        this.renderInvestmentCharts(financialData.investments);
    }

    renderRevenueCharts(revenueData) {
        this.renderRevenueTrendChart(revenueData.trends);
        this.renderRevenueBreakdownChart(revenueData.breakdown);
        this.renderRevenueForecastChart(revenueData.forecast);
    }

    renderRevenueTrendChart(trendData) {
        const ctx = document.getElementById('revenue-trend-chart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trendData.periods,
                datasets: [{
                    label: 'Дохід',
                    data: trendData.values,
                    borderColor: '#27ae60',
                    backgroundColor: this.hexToRgba('#27ae60', 0.1),
                    fill: true,
                    tension: 0.4
                }]
            },
            options: this.getFinancialChartOptions('revenue')
        });

        this.charts.set('revenue-trend', chart);
    }

    renderExpenseCharts(expenseData) {
        this.renderExpenseBreakdownChart(expenseData.categories);
        this.renderExpenseTrendChart(expenseData.trends);
        this.renderCostEfficiencyChart(expenseData.efficiency);
    }

    renderExpenseBreakdownChart(categoryData) {
        const ctx = document.getElementById('expense-breakdown-chart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    data: categoryData.values,
                    backgroundColor: [
                        '#e74c3c', '#f39c12', '#3498db', 
                        '#9b59b6', '#1abc9c', '#34495e'
                    ]
                }]
            },
            options: this.getFinancialChartOptions('expense-breakdown')
        });

        this.charts.set('expense-breakdown', chart);
    }

    // Advanced financial analysis
    async renderTechnicalAnalysis() {
        const technicalData = await this.calculateTechnicalIndicators();
        
        this.renderMovingAverages(technicalData.movingAverages);
        this.renderRSIChart(technicalData.rsi);
        this.renderMACDChart(technicalData.macd);
        this.renderBollingerBands(technicalData.bollingerBands);
    }

    renderMovingAverages(maData) {
        const ctx = document.getElementById('moving-averages-chart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: maData.dates,
                datasets: [
                    {
                        label: 'Ціна',
                        data: maData.prices,
                        borderColor: '#2c3e50',
                        tension: 0.1
                    },
                    {
                        label: 'MA-50',
                        data: maData.ma50,
                        borderColor: '#3498db',
                        borderDash: [5, 5],
                        tension: 0.1
                    },
                    {
                        label: 'MA-200',
                        data: maData.ma200,
                        borderColor: '#e74c3c',
                        borderDash: [5, 5],
                        tension: 0.1
                    }
                ]
            },
            options: this.getFinancialChartOptions('technical')
        });

        this.charts.set('moving-averages', chart);
    }

    // Risk management charts
    async renderRiskAnalysis() {
        const riskData = await this.calculateRiskMetrics();
        
        this.renderValueAtRiskChart(riskData.var);
        this.renderStressTestingChart(riskData.stressTests);
        this.renderCorrelationMatrix(riskData.correlations);
        this.renderRiskReturnProfile(riskData.riskReturn);
    }

    renderValueAtRiskChart(varData) {
        const ctx = document.getElementById('var-chart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: varData.periods,
                datasets: [{
                    label: 'Value at Risk (95%)',
                    data: varData.values,
                    backgroundColor: varData.values.map(value => 
                        value > varData.threshold ? '#e74c3c' : '#27ae60'
                    )
                }]
            },
            options: this.getFinancialChartOptions('risk')
        });

        this.charts.set('value-at-risk', chart);
    }

    // Financial forecasting
    async renderFinancialForecasts() {
        const forecasts = await this.generateFinancialForecasts();
        
        this.renderRevenueForecast(forecasts.revenue);
        this.renderExpenseForecast(forecasts.expenses);
        this.renderCashFlowForecast(forecasts.cashFlow);
        this.renderProfitForecast(forecasts.profit);
    }

    renderRevenueForecast(forecastData) {
        const ctx = document.getElementById('revenue-forecast-chart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: forecastData.periods,
                datasets: [
                    {
                        label: 'Історичний дохід',
                        data: forecastData.historical,
                        borderColor: '#3498db',
                        tension: 0.4
                    },
                    {
                        label: 'Прогноз доходу',
                        data: forecastData.forecast,
                        borderColor: '#e74c3c',
                        borderDash: [5, 5],
                        tension: 0.4
                    },
                    {
                        label: 'Довірчий інтервал',
                        data: forecastData.upperBound,
                        borderColor: 'transparent',
                        backgroundColor: this.hexToRgba('#e74c3c', 0.1),
                        fill: '+1'
                    },
                    {
                        data: forecastData.lowerBound,
                        borderColor: 'transparent',
                        backgroundColor: this.hexToRgba('#e74c3c', 0.1)
                    }
                ]
            },
            options: this.getFinancialChartOptions('forecast')
        });

        this.charts.set('revenue-forecast', chart);
    }

    // Performance metrics
    async renderPerformanceDashboard() {
        const performanceData = await this.calculatePerformanceMetrics();
        
        this.renderROIChart(performanceData.roi);
        this.renderROAChart(performanceData.roa);
        this.renderROEChart(performanceData.roe);
        this.renderEfficiencyRatios(performanceData.efficiency);
        this.renderLiquidityRatios(performanceData.liquidity);
    }

    renderROIChart(roiData) {
        const ctx = document.getElementById('roi-chart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: roiData.periods,
                datasets: [{
                    label: 'ROI (%)',
                    data: roiData.values,
                    backgroundColor: roiData.values.map(value => 
                        value > roiData.benchmark ? '#27ae60' : '#e74c3c'
                    )
                }]
            },
            options: this.getFinancialChartOptions('performance')
        });

        this.charts.set('roi', chart);
    }

    // Interactive financial tools
    setupFinancialTools() {
        this.initScenarioAnalysis();
        this.setupSensitivityAnalysis();
        this.initWhatIfAnalysis();
        this.setupFinancialModeling();
    }

    initScenarioAnalysis() {
        const scenarioForm = document.getElementById('scenario-analysis-form');
        if (scenarioForm) {
            scenarioForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.runScenarioAnalysis(new FormData(scenarioForm));
            });
        }
    }

    async runScenarioAnalysis(formData) {
        const scenario = {
            name: formData.get('scenario-name'),
            assumptions: this.parseAssumptions(formData),
            timeframe: formData.get('timeframe')
        };

        const results = await this.calculateScenario(scenario);
        this.displayScenarioResults(results);
    }

    // Export and reporting
    setupFinancialReporting() {
        this.initFinancialStatementExport();
        this.setupComplianceReporting();
        this.initInvestorReporting();
    }

    async generateFinancialReport(format, period) {
        const reportData = await this.prepareFinancialReportData(period);
        
        switch (format) {
            case 'pdf':
                return await this.generatePDFReport(reportData);
            case 'excel':
                return await this.generateExcelReport(reportData);
            case 'presentation':
                return await this.generatePresentation(reportData);
            case 'dashboard':
                return await this.generateInteractiveDashboard(reportData);
        }
    }

    // Utility methods
    getFinancialChartOptions(chartType) {
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
                            return this.formatFinancialTooltip(context, chartType);
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: (value) => {
                            return this.formatFinancialValue(value, chartType);
                        }
                    }
                }
            }
        };

        const typeSpecificOptions = {
            revenue: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => {
                                return new Intl.NumberFormat('uk-UA', {
                                    style: 'currency',
                                    currency: 'UAH'
                                }).format(value);
                            }
                        }
                    }
                }
            },
            'expense-breakdown': {
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${this.formatFinancialValue(value, 'currency')} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        };

        return this.mergeOptions(baseOptions, typeSpecificOptions[chartType] || {});
    }

    formatFinancialValue(value, format) {
        switch (format) {
            case 'currency':
                return new Intl.NumberFormat('uk-UA', {
                    style: 'currency',
                    currency: 'UAH',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(value);
            case 'percent':
                return `${value.toFixed(2)}%`;
            case 'ratio':
                return value.toFixed(2);
            case 'number':
                return new Intl.NumberFormat('uk-UA').format(value);
            default:
                return value;
        }
    }

    formatFinancialTooltip(context, chartType) {
        const label = context.dataset.label || '';
        const value = context.raw;
        
        switch (chartType) {
            case 'revenue':
            case 'expense-breakdown':
                return `${label}: ${this.formatFinancialValue(value, 'currency')}`;
            case 'performance':
                return `${label}: ${this.formatFinancialValue(value, 'percent')}`;
            case 'technical':
                return `${label}: ${this.formatFinancialValue(value, 'number')}`;
            default:
                return `${label}: ${value}`;
        }
    }

    calculateTechnicalIndicators() {
        // Implementation for technical indicators calculation
        return {
            movingAverages: this.calculateMovingAverages(),
            rsi: this.calculateRSI(),
            macd: this.calculateMACD(),
            bollingerBands: this.calculateBollingerBands()
        };
    }

    calculateRiskMetrics() {
        // Implementation for risk metrics calculation
        return {
            var: this.calculateValueAtRisk(),
            stressTests: this.runStressTests(),
            correlations: this.calculateCorrelations(),
            riskReturn: this.calculateRiskReturnProfile()
        };
    }
}