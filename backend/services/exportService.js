const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

class ExportService {
    /**
     * Експорт заявки в PDF
     */
    async exportRequestToPDF(request) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50 });
                const chunks = [];

                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Header
                doc.fontSize(20).text('Заявка на обслуговування', { align: 'center' });
                doc.moveDown();

                // Request Info
                doc.fontSize(12);
                doc.text(`Номер заявки: #${request._id}`);
                doc.text(`Статус: ${this.getStatusText(request.status)}`);
                doc.text(`Пріоритет: ${this.getPriorityText(request.priority)}`);
                doc.text(`Дата створення: ${new Date(request.createdAt).toLocaleString('uk-UA')}`);
                doc.moveDown();

                // Details
                doc.fontSize(14).text('Деталі:', { underline: true });
                doc.fontSize(12);
                doc.text(`Назва: ${request.title}`);
                doc.text(`Опис: ${request.description}`);
                doc.moveDown();

                // Client Info
                if (request.client) {
                    doc.fontSize(14).text('Клієнт:', { underline: true });
                    doc.fontSize(12);
                    doc.text(`Ім'я: ${request.client.firstName} ${request.client.lastName}`);
                    doc.text(`Email: ${request.client.email}`);
                    doc.text(`Телефон: ${request.client.phone || 'Н/Д'}`);
                    doc.moveDown();
                }

                // Technician Info
                if (request.assignedTo) {
                    doc.fontSize(14).text('Технік:', { underline: true });
                    doc.fontSize(12);
                    doc.text(`Ім'я: ${request.assignedTo.firstName} ${request.assignedTo.lastName}`);
                    doc.text(`Email: ${request.assignedTo.email}`);
                    doc.text(`Телефон: ${request.assignedTo.phone || 'Н/Д'}`);
                    doc.moveDown();
                }

                // Work Details
                if (request.workDescription) {
                    doc.fontSize(14).text('Виконана робота:', { underline: true });
                    doc.fontSize(12);
                    doc.text(request.workDescription);
                    if (request.laborHours) {
                        doc.text(`Годин роботи: ${request.laborHours}`);
                    }
                }

                // Footer
                doc.moveDown(2);
                doc.fontSize(10).text(`Згенеровано: ${new Date().toLocaleString('uk-UA')}`, {
                    align: 'center'
                });

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Експорт заявок в Excel
     */
    async exportRequestsToExcel(requests) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Заявки');

        // Headers
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 25 },
            { header: 'Назва', key: 'title', width: 30 },
            { header: 'Статус', key: 'status', width: 15 },
            { header: 'Пріоритет', key: 'priority', width: 15 },
            { header: 'Клієнт', key: 'client', width: 25 },
            { header: 'Технік', key: 'technician', width: 25 },
            { header: 'Дата створення', key: 'createdAt', width: 20 },
            { header: 'Ліфт', key: 'lift', width: 15 }
        ];

        // Style header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

        // Add data
        requests.forEach(request => {
            worksheet.addRow({
                id: request._id.toString(),
                title: request.title,
                status: this.getStatusText(request.status),
                priority: this.getPriorityText(request.priority),
                client: request.client ? `${request.client.firstName} ${request.client.lastName}` : 'Н/Д',
                technician: request.assignedTo ? `${request.assignedTo.firstName} ${request.assignedTo.lastName}` : 'Не призначено',
                createdAt: new Date(request.createdAt).toLocaleDateString('uk-UA'),
                lift: request.lift?.municipalNumber || 'Н/Д'
            });
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.alignment = { vertical: 'middle', horizontal: 'left' };
        });

        return await workbook.xlsx.writeBuffer();
    }

    /**
     * Експорт статистики в PDF
     */
    async exportStatsToPDF(stats) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50 });
                const chunks = [];

                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Header
                doc.fontSize(22).text('Статистика системи', { align: 'center' });
                doc.moveDown(2);

                // Stats
                doc.fontSize(16).text('Заявки:', { underline: true });
                doc.fontSize(14);
                doc.text(`Всього: ${stats.totalRequests || 0}`);
                doc.text(`Нові: ${stats.newRequests || 0}`);
                doc.text(`В роботі: ${stats.inProgressRequests || 0}`);
                doc.text(`Завершені: ${stats.completedRequests || 0}`);
                doc.moveDown();

                doc.fontSize(16).text('Ліфти:', { underline: true });
                doc.fontSize(14);
                doc.text(`Всього: ${stats.totalLifts || 0}`);
                doc.text(`Працюють: ${stats.operationalLifts || 0}`);
                doc.text(`На обслуговуванні: ${stats.maintenanceLifts || 0}`);
                doc.moveDown();

                // Footer
                doc.moveDown(2);
                doc.fontSize(10).text(`Згенеровано: ${new Date().toLocaleString('uk-UA')}`, {
                    align: 'center'
                });

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    // Helper methods
    getStatusText(status) {
        const map = {
            'new': 'Нова',
            'assigned': 'Призначена',
            'in_progress': 'В роботі',
            'completed': 'Завершена',
            'cancelled': 'Скасована'
        };
        return map[status] || status;
    }

    getPriorityText(priority) {
        const map = {
            'low': 'Низький',
            'medium': 'Середній',
            'high': 'Високий',
            'urgent': 'Терміновий'
        };
        return map[priority] || priority;
    }

    /**
     * Експорт ліфтів в Excel
     */
    async exportLiftsToExcel(lifts) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Ліфти');

        // Headers
        worksheet.columns = [
            { header: 'Муніципальний №', key: 'municipalNumber', width: 20 },
            { header: 'Виробник', key: 'manufacturer', width: 20 },
            { header: 'Модель', key: 'model', width: 20 },
            { header: 'Адреса', key: 'address', width: 40 },
            { header: 'Статус', key: 'status', width: 15 },
            { header: 'Вантажопідйомність', key: 'capacity', width: 20 },
            { header: 'Поверхів', key: 'floors', width: 12 },
            { header: 'Початок обслуговування', key: 'installationDate', width: 25 },
            { header: 'Остання інспекція', key: 'lastInspection', width: 20 }
        ];

        // Style header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF28A745' }
        };
        worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

        // Add data
        lifts.forEach(lift => {
            worksheet.addRow({
                municipalNumber: lift.municipalNumber || 'Н/Д',
                manufacturer: lift.manufacturer || 'Н/Д',
                model: lift.model || 'Н/Д',
                address: lift.address?.full || 'Н/Д',
                status: this.getLiftStatusText(lift.status),
                capacity: lift.capacity ? `${lift.capacity} осіб` : 'Н/Д',
                floors: lift.floors || 'Н/Д',
                installationDate: lift.installationDate ? new Date(lift.installationDate).toLocaleDateString('uk-UA') : 'Н/Д',
                lastInspection: lift.lastInspection ? new Date(lift.lastInspection).toLocaleDateString('uk-UA') : 'Н/Д'
            });
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.alignment = { vertical: 'middle', horizontal: 'left' };
        });

        return await workbook.xlsx.writeBuffer();
    }

    getLiftStatusText(status) {
        const map = {
            'operational': 'Працює',
            'maintenance': 'Обслуговування',
            'broken': 'Поламаний'
        };
        return map[status] || status;
    }
}

module.exports = new ExportService();
