class ExportManager {
    constructor() {
        this.init();
    }

    init() {
        // A carregar залежностей динамічно
        this.loadDependencies();
    }

    async loadDependencies() {
        try {
            // A carregar jsPDF
            if (typeof jsPDF === 'undefined') {
                await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            }
            if (typeof autoTable === 'undefined') {
                await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js');
            }

            // A carregar SheetJS для Excel
            if (typeof XLSX === 'undefined') {
                await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
            }

            console.log('Export dependencies loaded');
        } catch (error) {
            console.error('Failed to load export dependencies:', error);
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Exportar у PDF
    async exportToPDF(data, filename = 'report.pdf', options = {}) {
        try {
            if (typeof jsPDF === 'undefined') {
                throw new Error('jsPDF not loaded');
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF(options.orientation || 'p', 'mm', 'a4');

            // Заголовок
            doc.setFontSize(20);
            doc.text(options.title || 'Relatório LiftManager', 20, 30);

            // Data
            doc.setFontSize(12);
            doc.text(`Data: ${new Date().toLocaleDateString('uk-UA')}`, 20, 45);

            // Таблиця даних
            if (data && Array.isArray(data) && data.length > 0) {
                const headers = Object.keys(data[0]);
                const rows = data.map(item => headers.map(header => item[header] || ''));

                doc.autoTable({
                    head: [headers],
                    body: rows,
                    startY: 60,
                    styles: {
                        fontSize: 8,
                        cellPadding: 2
                    },
                    headStyles: {
                        fillColor: [41, 128, 185],
                        textColor: 255
                    },
                    alternateRowStyles: {
                        fillColor: [245, 245, 245]
                    }
                });
            }

            // Збереження
            doc.save(filename);
            NotificationManager.success('Exportar concluída', `PDF файл ${filename} збережено`);

        } catch (error) {
            console.error('PDF export failed:', error);
            NotificationManager.error('Erro експорту', 'Не вдалося експортувати PDF');
        }
    }

    // Exportar у Excel
    async exportToExcel(data, filename = 'report.xlsx', sheetName = 'Data') {
        try {
            if (typeof XLSX === 'undefined') {
                throw new Error('XLSX not loaded');
            }

            // Створення workbook
            const wb = XLSX.utils.book_new();

            // Конвертація даних у worksheet
            const ws = XLSX.utils.json_to_sheet(data);

            // Додавання worksheet до workbook
            XLSX.utils.book_append_sheet(wb, ws, sheetName);

            // Збереження файлу
            XLSX.writeFile(wb, filename);
            NotificationManager.success('Exportar concluída', `Excel файл ${filename} збережено`);

        } catch (error) {
            console.error('Excel export failed:', error);
            NotificationManager.error('Erro експорту', 'Не вдалося експортувати Excel');
        }
    }

    // Exportar CSV
    exportToCSV(data, filename = 'report.csv') {
        try {
            if (!data || !Array.isArray(data) || data.length === 0) {
                throw new Error('Invalid data for CSV export');
            }

            const headers = Object.keys(data[0]);
            const csvContent = [
                headers.join(','),
                ...data.map(row =>
                    headers.map(header => {
                        const value = row[header] || '';
                        // Escape quotes and wrap in quotes if contains comma or quote
                        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    }).join(',')
                )
            ].join('\n');

            // Створення та завантаження файлу
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            NotificationManager.success('Exportar concluída', `CSV файл ${filename} збережено`);

        } catch (error) {
            console.error('CSV export failed:', error);
            NotificationManager.error('Erro експорту', 'Не вдалося експортувати CSV');
        }
    }

    // Exportar звіту з дашборду
    async exportDashboardReport() {
        try {
            // Отримання даних з API
            const [stats, analytics, lifts] = await Promise.all([
                LiftAPI.getDashboardStats(),
                LiftAPI.getAnalytics('month'),
                LiftAPI.request('/lifts', 'GET')
            ]);

            // Створення звіту
            const reportData = {
                stats,
                analytics,
                liftsCount: lifts.length,
                generatedAt: new Date().toISOString()
            };

            // Exportar у різні формати
            const filename = `dashboard-report-${new Date().toISOString().split('T')[0]}`;

            // PDF звіт
            await this.exportToPDF(
                lifts.slice(0, 50), // Обмежуємо до 50 записів для PDF
                `${filename}.pdf`,
                {
                    title: 'Relatório дашборду LiftManager',
                    orientation: 'l' // landscape
                }
            );

            // Excel з детальними даними
            await this.exportToExcel(lifts, `${filename}.xlsx`, 'Lifts');

        } catch (error) {
            console.error('Dashboard export failed:', error);
            NotificationManager.error('Erro експорту звіту', 'Не вдалося експортувати звіт дашборду');
        }
    }

    // Швидкі методи експорту
    static exportPDF(data, filename, options) {
        return window.exportManager.exportToPDF(data, filename, options);
    }

    static exportExcel(data, filename, sheetName) {
        return window.exportManager.exportToExcel(data, filename, sheetName);
    }

    static exportCSV(data, filename) {
        return window.exportManager.exportToCSV(data, filename);
    }

    static exportDashboard() {
        return window.exportManager.exportDashboardReport();
    }
}

// Ініціалізація
if (typeof window !== 'undefined') {
    window.ExportManager = ExportManager;
    window.exportManager = new ExportManager();
}

// Exportar для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportManager;
}