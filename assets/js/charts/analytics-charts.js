class AnalyticsCharts {
    constructor() {
        this.charts = new Map();
        this.dataSources = new Map();
        this.init();
    }

    async init() {
        await this.loadChartTemplates();
        this.setupDataConnections();
        this.initRealTimeUpdates();
        this.setupExportFunctionality();
        this.initResponsiveBehavior();
    }

    async renderDashboard() {
        const dashboardData = await this.loadDashboardData();
        
        this.renderKeyMetrics(dashboardData.metrics);
        this.renderTrendCharts(dashboardData.trends);
        this.renderDistributionCharts(dashboardData.distributions);
        this.renderComparativeCharts(dashboardData.comparisons);
        this.renderPredictiveCharts(dashboardData.predictions);
    }

    renderKeyMetrics(metrics) {
        const container = document.getElementById('metrics-container');
        if (!container) return;

        container.innerHTML = Object.entries(metrics).map(([key, metric]) => `
            <div class="metric-card" data-metric="${key}">
                <div class="metric-value">${this.formatValue(metric.value, metric.format)}</div>
                <div class="metric-label">${metric.label}</div>
                ${metric.trend ? `
                    <div class="metric-trend trend-${metric.trend.direction}">
                        <i class="fas ${metric.trend.direction === 'up' ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                        ${metric.trend.value}%
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    renderTrendCharts(trends) {
        Object.entries(trends).forEach(([chartId, data]) => {
            this.renderLineChart(chartId, data);
        });
    }

    renderLineChart(chartId, data) {
        const ctx = document.getElementById(chartId);
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: data.datasets.map(dataset => ({
                    label: dataset.label,
                    data: dataset.values,
                    borderColor: dataset.color,
                    backgroundColor: this.hexToRgba(dataset.color, 0.1),
                    tension: 0.4,
                    fill: true
                }))
            },
            options: this.getChartOptions('line', data.options)
        });

        this.charts.set(chartId, chart);
    }

    renderDistributionCharts(distributions) {
        Object.entries(distributions).forEach(([chartId, data]) => {
            switch (data.type) {
                case 'pie':
                    this.renderPieChart(chartId, data);
                    break;
                case 'doughnut':
                    this.renderDoughnutChart(chartId, data);
                    break;
                case 'bar':
                    this.renderBarChart(chartId, data);
                    break;
            }
        });
    }

    renderPieChart(chartId, data) {
        const ctx = document.getElementById(chartId);
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: data.colors,
                    borderWidth: 2
                }]
            },
            options: this.getChartOptions('pie', data.options)
        });

        this.charts.set(chartId, chart);
    }

    // Advanced analytics features
    async renderPredictiveAnalytics() {
        const predictions = await this.loadPredictiveData();
        
        this.renderForecastCharts(predictions.forecasts);
        this.renderAnomalyDetection(predictions.anomalies);
        this.renderCorrelationAnalysis(predictions.correlations);
    }

    renderForecastCharts(forecasts) {
        Object.entries(forecasts).forEach(([chartId, forecast]) => {
            this.renderForecastChart(chartId, forecast);
        });
    }

    renderForecastChart(chartId, forecast) {
        const ctx = document.getElementById(chartId);
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: forecast.labels,
                datasets: [{
                    label: 'Historical',
                    data: forecast.historical,
                    borderColor: '#3498db',
                    tension: 0.4
                }, {
                    label: 'Forecast',
                    data: forecast.forecast,
                    borderColor: '#e74c3c',
                    borderDash: [5, 5],
                    tension: 0.4
                }, {
                    label: 'Confidence Interval',
                    data: forecast.confidenceUpper,
                    borderColor: 'transparent',
                    backgroundColor: this.hexToRgba('#e74c3c', 0.1),
                    fill: '+1'
                }, {
                    data: forecast.confidenceLower,
                    borderColor: 'transparent',
                    backgroundColor: this.hexToRgba('#e74c3c', 0.1)
                }]
            },
            options: this.getChartOptions('forecast', forecast.options)
        });

        this.charts.set(chartId, chart);
    }

    // Real-time analytics
    setupRealTimeUpdates() {
        this.realTimeSources.forEach(source => {
            this.setupRealTimeSource(source);
        });
    }

    setupRealTimeSource(source) {
        const eventSource = new EventSource(source.url);
        
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.updateRealTimeCharts(source.chartId, data);
        };

        eventSource.onerror = (error) => {
            // logger.error('Real-time source error:', error);
            this.handleRealTimeError(source, error);
        };
    }

    updateRealTimeCharts(chartId, data) {
        const chart = this.charts.get(chartId);
        if (!chart) return;

        // Update chart data
        chart.data.labels.push(data.label);
        chart.data.datasets.forEach((dataset, index) => {
            dataset.data.push(data.values[index]);
        });

        // Remove old data if needed
        if (chart.data.labels.length > 100) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(dataset => {
                dataset.data.shift();
            });
        }

        chart.update('none');
    }

    // Interactive features
    setupChartInteractions() {
        this.setupTooltipCustomization();
        this.initDrillDownFunctionality();
        this.setupCrossChartFiltering();
        this.initDataHighlighting();
    }

    setupTooltipCustomization() {
        Chart.defaults.plugins.tooltip.callbacks = {
            label: (context) => {
                return this.formatTooltipLabel(context);
            },
            afterLabel: (context) => {
                return this.addAdditionalTooltipInfo(context);
            }
        };
    }

    initDrillDownFunctionality() {
        document.addEventListener('click', (e) => {
            const chartElement = e.target.closest('.chart-container');
            if (chartElement) {
                const chartId = chartElement.dataset.chartId;
                this.handleChartClick(chartId, e);
            }
        });
    }

    // Data export and sharing
    setupExportFunctionality() {
        this.exportFormats = ['png', 'jpg', 'svg', 'csv', 'json'];
        this.initExportButtons();
    }

    initExportButtons() {
        this.exportFormats.forEach(format => {
            const button = document.getElementById(`export-${format}`);
            if (button) {
                button.addEventListener('click', () => {
                    this.exportCharts(format);
                });
            }
        });
    }

    async exportCharts(format) {
        const exportPromises = Array.from(this.charts.entries()).map(
            ([chartId, chart]) => this.exportChart(chart, format, chartId)
        );

        const results = await Promise.allSettled(exportPromises);
        
        if (format === 'csv' || format === 'json') {
            await this.exportChartData(format);
        }
    }

    // Performance optimization
    optimizeChartPerformance() {
        this.setupDataSampling();
        this.initLazyLoading();
        this.setupMemoryManagement();
    }

    setupDataSampling() {
        Chart.defaults.datasets.line.sampling = 'lttb';
        Chart.defaults.datasets.line.maxDataPoints = 1000;
    }

    initLazyLoading() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadChartData(entry.target.dataset.chartId);
                }
            });
        });

        document.querySelectorAll('[data-lazy-chart]').forEach(chart => {
            observer.observe(chart);
        });
    }

    // Utility methods
    getChartOptions(type, customOptions = {}) {
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
                    mode: 'index',
                    intersect: false
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        };

        const typeSpecificOptions = {
            line: {
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true
                    }
                }
            },
            bar: {
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true
                    }
                }
            },
            pie: {
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        };

        return this.mergeOptions(baseOptions, typeSpecificOptions[type], customOptions);
    }

    formatValue(value, format) {
        switch (format) {
            case 'currency':
                return new Intl.NumberFormat('uk-UA', {
                    style: 'currency',
                    currency: 'EUR'
                }).format(value);
            case 'percent':
                return `${value.toFixed(1)}%`;
            case 'number':
                return new Intl.NumberFormat('uk-UA').format(value);
            default:
                return value;
        }
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    mergeOptions(...options) {
        return options.reduce((merged, current) => {
            return this.deepMerge(merged, current);
        }, {});
    }

    deepMerge(target, source) {
        if (typeof target !== 'object' || target === null) {
            return source;
        }

        if (typeof source !== 'object' || source === null) {
            return target;
        }

        const output = { ...target };
        
        Object.keys(source).forEach(key => {
            if (source[key] instanceof Object && key in target) {
                output[key] = this.deepMerge(target[key], source[key]);
            } else {
                output[key] = source[key];
            }
        });

        return output;
    }
}