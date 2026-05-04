/**
 * Reports System - Система звітів (AdminLTE версія)
 * Розташування: assets/js/modules/reports-system.js
 */

class ReportsSystem {
    constructor() {
        this.currentReportType = 'maintenance';
        this.currentReport = null;
        this.reportTemplates = {};
        this.init();
    }

    init() {
        console.log('📊 Ініціалізація системи звітів...');
        this.loadReportTemplates();
        this.setupEventListeners();
        this.setupDefaultDates();
        console.log('✅ Система звітів com sucesso ініціалізована');
    }

    loadReportTemplates() {
        this.reportTemplates = {
            maintenance: {
                title: 'Relatório про технічне обслуговування',
                description: 'Детальний звіт про роботи з технічного обслуговування ліфтів',
                icon: 'fas fa-tools',
                fields: ['period', 'technician', 'status', 'priority'],
                columns: ['ID', 'Elevador', 'Técnico', 'Estado', 'Data створення', 'Data завершення']
            },
            financial: {
                title: 'Фінансовий звіт',
                description: 'Фінансова звітність та аналітика доходів/витрат',
                icon: 'fas fa-money-bill-wave',
                fields: ['period', 'client', 'serviceType', 'paymentStatus'],
                columns: ['ID', 'Cliente', 'Послуга', 'Сума', 'Estado оплати', 'Data']
            },
            performance: {
                title: 'Relatório про продуктивність',
                description: 'Аналіз продуктивності техніків та ефективності робіт',
                icon: 'fas fa-chart-line',
                fields: ['period', 'technician', 'metric', 'comparisonPeriod'],
                columns: ['Técnico', 'Завдань', 'Завершено', 'Agoедній час', 'Ефективність']
            },
            inventory: {
                title: 'Relatório по інвентаризації',
                description: 'Залишки запчастин, матеріалів та комплектуючих',
                icon: 'fas fa-boxes',
                fields: ['category', 'location', 'minStock', 'status'],
                columns: ['Категорія', 'Найменування', 'Кількість', 'Мін. запас', 'Estado']
            }
        };
    }

    setupEventListeners() {
        // Вибір типу звіту
        $(document).on('click', '.report-type-card', (e) => {
            const card = $(e.currentTarget);
            const reportType = card.data('report-type');
            this.selectReportType(reportType);
        });

        // Швидкий вибір періоду
        $(document).on('click', '[data-days]', (e) => {
            const days = $(e.currentTarget).data('days');
            this.setQuickPeriod(days);
        });

        // A gerar relatório
        $(document).on('click', '#generateReportBtn', () => {
            this.generateReport();
        });

        // Exportar
        $(document).on('click', '#exportPdfBtn', () => {
            this.exportToPDF();
        });

        $(document).on('click', '#exportExcelBtn', () => {
            this.exportToExcel();
        });

        // Планування
        $(document).on('click', '#scheduleReportBtn', () => {
            this.scheduleReport();
        });

        // Filtroи
        $('#technicianFilter, #statusFilter, #priorityFilter').on('change', () => {
            this.applyFilters();
        });
    }

    setupDefaultDates() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        $('#startDate').val(this.formatDateForInput(firstDay));
        $('#endDate').val(this.formatDateForInput(lastDay));
    }

    selectReportType(reportType) {
        $('.report-type-card').removeClass('active');
        $(`[data-report-type="${reportType}"]`).addClass('active');
        
        this.currentReportType = reportType;
        this.updateUI();
        
        console.log(`Обрано тип звіту: ${reportType}`);
    }

    setQuickPeriod(days) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        $('#startDate').val(this.formatDateForInput(startDate));
        $('#endDate').val(this.formatDateForInput(endDate));

        this.showNotification(`Встановлено період: останні ${days} днів`, 'info');
    }

    updateUI() {
        const template = this.reportTemplates[this.currentReportType];
        if (!template) return;

        // Atualização заголовка
        $('#reportTitle').text(template.title);
        $('#reportDescription').text(template.description);
    }

    async generateReport() {
        try {
            this.showLoading(true);

            const reportData = this.collectReportData();
            const reportResult = await this.generateReportData(reportData);

            this.currentReport = reportResult;
            this.displayReport(reportResult);
            
            this.showNotification('Relatório com sucesso згенеровано', 'success');

        } catch (error) {
            console.error('Erro генерації звіту:', error);
            this.showNotification('Erro генерації звіту', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    collectReportData() {
        return {
            reportType: this.currentReportType,
            startDate: $('#startDate').val(),
            endDate: $('#endDate').val(),
            technician: $('#technicianFilter').val(),
            status: $('#statusFilter').val(),
            priority: $('#priorityFilter').val(),
            filters: {
                // Додаткові фільтри можна додати тут
            }
        };
    }

    async generateReportData(reportData) {
        // Імітація завантаження даних з сервера
        return new Promise((resolve) => {
            setTimeout(() => {
                const data = this.generateSampleReportData(reportData);
                resolve(data);
            }, 2000);
        });
    }

    generateSampleReportData(reportData) {
        const { reportType, startDate, endDate } = reportData;
        const baseData = {
            title: this.reportTemplates[reportType]?.title || 'Relatório',
            period: `${this.formatDateDisplay(startDate)} - ${this.formatDateDisplay(endDate)}`,
            generatedAt: new Date().toLocaleString('uk-UA'),
            filters: reportData
        };

        switch (reportType) {
            case 'maintenance':
                return {
                    ...baseData,
                    summary: {
                        total: 45,
                        completed: 38,
                        inProgress: 5,
                        pending: 2,
                        averageTime: '2.5 horasи'
                    },
                    details: this.generateMaintenanceDetails()
                };

            case 'financial':
                return {
                    ...baseData,
                    summary: {
                        totalRevenue: '₴120,450',
                        expenses: '₴45,230',
                        profit: '₴75,220',
                        invoices: 45,
                        paid: 38,
                        overdue: 7
                    },
                    details: this.generateFinancialDetails()
                };

            case 'performance':
                return {
                    ...baseData,
                    summary: {
                        totalTasks: 67,
                        completed: 58,
                        completionRate: '86.6%',
                        averageCompletionTime: '3.2 horasи'
                    },
                    details: this.generatePerformanceDetails()
                };

            case 'inventory':
                return {
                    ...baseData,
                    summary: {
                        totalItems: 1245,
                        inStock: 893,
                        lowStock: 45,
                        outOfStock: 12
                    },
                    details: this.generateInventoryDetails()
                };

            default:
                return baseData;
        }
    }

    generateMaintenanceDetails() {
        return [
            {
                id: '#12345',
                lift: 'Otis Gen2 - вул. Центральна, 12',
                technician: 'Іван Петренко',
                status: 'Завершено',
                createdDate: '15.01.2024',
                completedDate: '16.01.2024',
                priority: 'Altий'
            },
            {
                id: '#12346',
                lift: 'Schindler 3300 - пр. Перемоги, 45',
                technician: 'Марія Коваленко',
                status: 'Em progresso',
                createdDate: '16.01.2024',
                completedDate: '-',
                priority: 'Agoедній'
            },
            {
                id: '#12347',
                lift: 'Kone MonoSpace - вул. Шевченка, 78',
                technician: 'Олексій Сидоренко',
                status: 'В очікуванні',
                createdDate: '17.01.2024',
                completedDate: '-',
                priority: 'Низький'
            }
        ];
    }

    generateFinancialDetails() {
        return [
            {
                id: '#F001',
                client: 'ManutençãoВ "Будівельник"',
                service: 'Щомісячне Manutenção',
                amount: '₴15,000',
                status: 'Оплачено',
                date: '15.01.2024',
                invoice: '#INV-2024-001'
            },
            {
                id: '#F002',
                client: 'ЖК "Сонячний"',
                service: 'Reparação de emergência',
                amount: '₴8,500',
                status: 'Pendente оплати',
                date: '18.01.2024',
                invoice: '#INV-2024-002'
            }
        ];
    }

    generatePerformanceDetails() {
        return [
            {
                technician: 'Іван Петренко',
                totalTasks: 15,
                completed: 14,
                avgTime: '2.8 год',
                efficiency: '94%',
                rating: '4.8/5'
            },
            {
                technician: 'Марія Коваленко',
                totalTasks: 12,
                completed: 11,
                avgTime: '3.1 год',
                efficiency: '92%',
                rating: '4.7/5'
            },
            {
                technician: 'Олексій Сидоренко',
                totalTasks: 10,
                completed: 9,
                avgTime: '2.9 год',
                efficiency: '90%',
                rating: '4.5/5'
            }
        ];
    }

    generateInventoryDetails() {
        return [
            {
                category: 'Електричні компоненти',
                item: 'Контролер двигуна',
                quantity: 12,
                minStock: 5,
                status: 'В наявності',
                location: 'Склад A'
            },
            {
                category: 'Механічні компоненти',
                item: 'Трос ліфта',
                quantity: 3,
                minStock: 10,
                status: 'Низький запас',
                location: 'Склад B'
            },
            {
                category: 'Запобіжні пристрої',
                item: 'Emergência гальмів',
                quantity: 0,
                minStock: 3,
                status: 'Відсутній',
                location: 'Склад A'
            }
        ];
    }

    displayReport(reportData) {
        const reportResult = $('#reportResult');
        const reportHTML = this.createReportHTML(reportData);
        
        reportResult.html(reportHTML).slideDown();
        
        // Atualização статистичних карток
        this.updateStatsCards(reportData.summary);
    }

    createReportHTML(reportData) {
        return `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">${reportData.title}</h3>
                    <div class="card-tools">
                        <button type="button" class="btn btn-tool" data-card-widget="collapse">
                            <i class="fas fa-minus"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    ${this.createReportHeaderHTML(reportData)}
                    ${this.createStatsSectionHTML(reportData.summary)}
                    ${this.createDetailsSectionHTML(reportData.details)}
                    ${this.createFooterHTML(reportData)}
                </div>
            </div>
        `;
    }

    createReportHeaderHTML(reportData) {
        return `
            <div class="report-header text-center mb-4">
                <h2>${reportData.title}</h2>
                <p class="text-muted">Período: ${reportData.period}</p>
                <p class="text-small text-muted">Згенеровано: ${reportData.generatedAt}</p>
            </div>
        `;
    }

    createStatsSectionHTML(summary) {
        if (!summary) return '';

        let html = '<div class="row mb-4">';
        
        Object.entries(summary).forEach(([key, value]) => {
            const config = this.getStatCardConfig(key);
            html += `
                <div class="col-md-3 col-sm-6 mb-3">
                    <div class="info-box bg-gradient-${config.color}">
                        <span class="info-box-icon"><i class="${config.icon}"></i></span>
                        <div class="info-box-content">
                            <span class="info-box-text">${config.label}</span>
                            <span class="info-box-number">${value}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    getStatCardConfig(key) {
        const configs = {
            total: { icon: 'fas fa-tasks', color: 'info', label: 'Всього' },
            completed: { icon: 'fas fa-check-circle', color: 'success', label: 'Завершено' },
            inProgress: { icon: 'fas fa-spinner', color: 'warning', label: 'Em progresso' },
            pending: { icon: 'fas fa-clock', color: 'secondary', label: 'В очікуванні' },
            totalRevenue: { icon: 'fas fa-money-bill-wave', color: 'success', label: 'Receita' },
            expenses: { icon: 'fas fa-receipt', color: 'danger', label: 'Витрати' },
            profit: { icon: 'fas fa-chart-line', color: 'info', label: 'Прибуток' },
            totalItems: { icon: 'fas fa-boxes', color: 'primary', label: 'Всього items' },
            inStock: { icon: 'fas fa-check', color: 'success', label: 'В наявності' },
            lowStock: { icon: 'fas fa-exclamation-triangle', color: 'warning', label: 'Мало' },
            outOfStock: { icon: 'fas fa-times', color: 'danger', label: 'Відсутні' }
        };

        return configs[key] || { icon: 'fas fa-info-circle', color: 'info', label: key };
    }

    createDetailsSectionHTML(details) {
        if (!details || details.length === 0) return '';

        const columns = Object.keys(details[0]);
        
        return `
            <div class="table-responsive">
                <table class="table table-bordered table-striped table-hover">
                    <thead class="thead-dark">
                        <tr>
                            ${columns.map(col => 
                                `<th>${this.formatTableHeader(col)}</th>`
                            ).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${details.map(item => `
                            <tr>
                                ${columns.map(col => `
                                    <td>${this.formatTableCell(item[col], col)}</td>
                                `).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    formatTableHeader(key) {
        const translations = {
            'id': 'ID',
            'lift': 'Elevador',
            'technician': 'Técnico',
            'status': 'Estado',
            'createdDate': 'Data створення',
            'completedDate': 'Data завершення',
            'priority': 'Prioridade',
            'client': 'Cliente',
            'service': 'Послуга',
            'amount': 'Сума',
            'date': 'Data',
            'invoice': 'Рахунок',
            'totalTasks': 'Завдань',
            'completed': 'Завершено',
            'avgTime': 'Agoедній час',
            'efficiency': 'Ефективність',
            'rating': 'Рейтинг',
            'category': 'Категорія',
            'item': 'Найменування',
            'quantity': 'Кількість',
            'minStock': 'Мін. запас',
            'location': 'Розташування'
        };
        return translations[key] || key;
    }

    formatTableCell(value, column) {
        if (column === 'status') {
            const statusClass = this.getStatusClass(value);
            return `<span class="badge ${statusClass}">${value}</span>`;
        }
        
        if (column === 'priority') {
            const priorityClass = this.getPriorityClass(value);
            return `<span class="badge ${priorityClass}">${value}</span>`;
        }

        return value || '-';
    }

    getStatusClass(status) {
        const classes = {
            'Завершено': 'badge-success',
            'Em progresso': 'badge-warning',
            'В очікуванні': 'badge-secondary',
            'Оплачено': 'badge-success',
            'Pendente оплати': 'badge-warning',
            'В наявності': 'badge-success',
            'Низький запас': 'badge-warning',
            'Відсутній': 'badge-danger'
        };
        return classes[status] || 'badge-secondary';
    }

    getPriorityClass(priority) {
        const classes = {
            'Altий': 'badge-danger',
            'Agoедній': 'badge-warning',
            'Низький': 'badge-info'
        };
        return classes[priority] || 'badge-secondary';
    }

    createFooterHTML(reportData) {
        return `
            <div class="report-footer mt-4 pt-3 border-top">
                <div class="row">
                    <div class="col-md-6">
                        <small class="text-muted">Filtroи: ${JSON.stringify(reportData.filters)}</small>
                    </div>
                    <div class="col-md-6 text-right">
                        <small class="text-muted">Relatório згенеровано автоматично</small>
                    </div>
                </div>
            </div>
        `;
    }

    updateStatsCards(summary) {
        // Додаткова логіка оновлення статистики
        console.log('Atualização статистичних карток:', summary);
    }

    applyFilters() {
        const filters = {
            technician: $('#technicianFilter').val(),
            status: $('#statusFilter').val(),
            priority: $('#priorityFilter').val()
        };

        console.log('Застосовано фільтри:', filters);
        this.showNotification('Filtros aplicados', 'info');
    }

    async exportToPDF() {
        if (!this.currentReport) {
            this.showNotification('Спочатку згенеруйте звіт', 'warning');
            return;
        }

        this.showNotification('Готуємо PDF-звіт...', 'info');
        
        // Імітація експорту
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.showNotification('PDF-звіт готовий до завантаження', 'success');
    }

    async exportToExcel() {
        if (!this.currentReport) {
            this.showNotification('Спочатку згенеруйте звіт', 'warning');
            return;
        }

        this.showNotification('Готуємо Excel-звіт...', 'info');
        
        // Імітація експорту
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.showNotification('Excel-звіт готовий до завантаження', 'success');
    }

    scheduleReport() {
        this.showNotification('Функція планування звітів буде реалізована в наступній версії', 'info');
    }

    showLoading(show) {
        const buttons = $('.report-actions .btn');
        
        if (show) {
            buttons.prop('disabled', true);
            $('#reportResult').html(`
                <div class="text-center py-5">
                    <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;" role="status">
                        <span class="sr-only">A carregar...</span>
                    </div>
                    <p>A gerar relatório...</p>
                </div>
            `).slideDown();
        } else {
            buttons.prop('disabled', false);
        }
    }

    showNotification(message, type = 'info') {
        if (typeof Swal !== 'undefined') {
            const Toast = Swal.mixin({
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
            const iconMap = { success: 'success', error: 'error', warning: 'warning', info: 'info' };
            Toast.fire({ icon: iconMap[type] || 'info', title: message });
        } else {
            alert(message);
        }
        /* Стара версія з AdminLTE
        $.notify({
            icon: type === 'success' ? 'fas fa-check' : 
                  type === 'error' ? 'fas fa-exclamation-triangle' : 
                  type === 'warning' ? 'fas fa-exclamation-circle' : 'fas fa-info-circle',
            message: message
        }, {
            type: type,
            placement: {
                from: 'top',
                align: 'right'
            },
            animate: {
                enter: 'animated fadeInRight',
                exit: 'animated fadeOutRight'
            },
            delay: 3000,
            template: '<div data-notify="container" class="col-xs-11 col-sm-3 alert alert-{0}" role="alert">' +
                      '<button type="button" aria-hidden="true" class="close" data-notify="dismiss">×</button>' +
                      '<span data-notify="icon"></span> ' +
                      '<span data-notify="title">{1}</span> ' +
                      '<span data-notify="message">{2}</span>' +
                      '</div>'
        });
        */
    }

    formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }

    formatDateDisplay(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('uk-UA');
    }
}

// Ініціалізація
$(document).ready(function() {
    window.reportsSystem = new ReportsSystem();
});