class PDFGenerator {
    constructor() {
        this.pdf = null;
        this.currentY = 0;
        this.margin = 40;
        this.pageHeight = 842;
        this.pageWidth = 595;
        this.init();
    }

    async init() {
        await this.loadPDFLibrary();
        this.setupTemplates();
        this.initFonts();
    }

    async loadPDFLibrary() {
        // Dynamic import of jsPDF
        if (typeof window.jspdf === 'undefined') {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js');
        }
        this.pdf = new window.jspdf.jsPDF();
    }

    async generateReport(type, data, options = {}) {
        switch (type) {
            case 'inspection':
                return await this.generateInspectionReport(data, options);
            case 'maintenance':
                return await this.generateMaintenanceReport(data, options);
            case 'financial':
                return await this.generateFinancialReport(data, options);
            case 'technical':
                return await this.generateTechnicalReport(data, options);
            default:
                throw new Error('Unknown report type');
        }
    }

    async generateInspectionReport(data, options) {
        this.pdf = new window.jspdf.jsPDF();
        this.currentY = this.margin;

        // Add header
        await this.addHeader(options.title || 'Звіт про інспекцію ліфта');
        
        // Add lift information
        this.addLiftInfo(data.lift);
        
        // Add inspection details
        this.addInspectionDetails(data.inspection);
        
        // Add findings
        if (data.findings && data.findings.length > 0) {
            this.addFindings(data.findings);
        }
        
        // Add recommendations
        if (data.recommendations && data.recommendations.length > 0) {
            this.addRecommendations(data.recommendations);
        }
        
        // Add signatures
        this.addSignatures(data.signatures);
        
        // Add footer
        this.addFooter();

        return this.pdf.output('blob');
    }

    async addHeader(title) {
        // Company logo
        try {
            const logoResponse = await fetch('/assets/img/logo.png');
            const logoBlob = await logoResponse.blob();
            const logoDataUrl = await this.blobToDataURL(logoBlob);
            
            this.pdf.addImage(logoDataUrl, 'PNG', this.margin, 20, 50, 20);
        } catch (error) {
            console.warn('Could not load logo:', error);
        }

        // Title
        this.pdf.setFontSize(18);
        this.pdf.setFont(undefined, 'bold');
        this.pdf.text(title, this.pageWidth / 2, 30, { align: 'center' });
        
        // Date
        this.pdf.setFontSize(10);
        this.pdf.setFont(undefined, 'normal');
        this.pdf.text(`Дата створення: ${new Date().toLocaleDateString('uk-UA')}`, this.pageWidth - this.margin, 30, { align: 'right' });

        this.currentY = 60;
    }

    addLiftInfo(lift) {
        this.pdf.setFontSize(12);
        this.pdf.setFont(undefined, 'bold');
        this.pdf.text('Інформація про ліфт:', this.margin, this.currentY);
        this.currentY += 15;

        this.pdf.setFontSize(10);
        this.pdf.setFont(undefined, 'normal');
        
        const liftInfo = [
            ['Адреса:', lift.address],
            ['Серійний номер:', lift.serialNumber],
            ['Виробник:', lift.manufacturer],
            ['Модель:', lift.model],
            ['Рік встановлення:', new Date(lift.installationDate).getFullYear()],
            ['Клієнт:', lift.client]
        ];

        liftInfo.forEach(([label, value]) => {
            if (this.currentY > this.pageHeight - 100) {
                this.pdf.addPage();
                this.currentY = this.margin;
            }
            
            this.pdf.text(`${label}`, this.margin, this.currentY);
            this.pdf.text(`${value}`, this.margin + 60, this.currentY);
            this.currentY += 8;
        });

        this.currentY += 10;
    }

    addInspectionDetails(inspection) {
        this.pdf.setFontSize(12);
        this.pdf.setFont(undefined, 'bold');
        this.pdf.text('Деталі інспекції:', this.margin, this.currentY);
        this.currentY += 15;

        this.pdf.setFontSize(10);
        this.pdf.setFont(undefined, 'normal');

        const inspectionDetails = [
            ['Дата інспекції:', new Date(inspection.date).toLocaleDateString('uk-UA')],
            ['Технік:', inspection.technician],
            ['Тривалість:', `${inspection.duration} хвилин`],
            ['Тип інспекції:', inspection.type],
            ['Загальний стан:', inspection.overallCondition]
        ];

        inspectionDetails.forEach(([label, value]) => {
            if (this.currentY > this.pageHeight - 100) {
                this.pdf.addPage();
                this.currentY = this.margin;
            }
            
            this.pdf.text(`${label}`, this.margin, this.currentY);
            this.pdf.text(`${value}`, this.margin + 60, this.currentY);
            this.currentY += 8;
        });

        this.currentY += 10;
    }

    addFindings(findings) {
        this.pdf.setFontSize(12);
        this.pdf.setFont(undefined, 'bold');
        this.pdf.text('Результати перевірки:', this.margin, this.currentY);
        this.currentY += 15;

        this.pdf.setFontSize(10);
        
        findings.forEach((finding, index) => {
            if (this.currentY > this.pageHeight - 100) {
                this.pdf.addPage();
                this.currentY = this.margin;
            }

            this.pdf.setFont(undefined, 'bold');
            this.pdf.text(`${index + 1}. ${finding.component}`, this.margin, this.currentY);
            this.currentY += 6;

            this.pdf.setFont(undefined, 'normal');
            const lines = this.pdf.splitTextToSize(finding.description, this.pageWidth - 2 * this.margin);
            this.pdf.text(lines, this.margin + 10, this.currentY);
            this.currentY += lines.length * 6 + 4;

            this.pdf.text(`Статус: ${finding.status}`, this.margin + 10, this.currentY);
            this.currentY += 6;

            if (finding.photos && finding.photos.length > 0) {
                this.currentY += 4;
                this.pdf.text('Фото:', this.margin + 10, this.currentY);
                this.currentY += 6;
                
                // Would add photos here in real implementation
            }

            this.currentY += 8;
        });
    }

    addRecommendations(recommendations) {
        this.pdf.setFontSize(12);
        this.pdf.setFont(undefined, 'bold');
        this.pdf.text('Рекомендації:', this.margin, this.currentY);
        this.currentY += 15;

        this.pdf.setFontSize(10);
        this.pdf.setFont(undefined, 'normal');

        recommendations.forEach((rec, index) => {
            if (this.currentY > this.pageHeight - 100) {
                this.pdf.addPage();
                this.currentY = this.margin;
            }

            this.pdf.setFont(undefined, 'bold');
            this.pdf.text(`${index + 1}. ${rec.title}`, this.margin, this.currentY);
            this.currentY += 6;

            this.pdf.setFont(undefined, 'normal');
            const lines = this.pdf.splitTextToSize(rec.description, this.pageWidth - 2 * this.margin);
            this.pdf.text(lines, this.margin + 10, this.currentY);
            this.currentY += lines.length * 6;

            this.pdf.text(`Пріоритет: ${rec.priority}`, this.margin + 10, this.currentY);
            this.pdf.text(`Орієнтовний термін: ${rec.deadline}`, this.margin + 10, this.currentY + 6);
            this.currentY += 12;
        });
    }

    addSignatures(signatures) {
        if (this.currentY > this.pageHeight - 100) {
            this.pdf.addPage();
            this.currentY = this.margin;
        }

        this.pdf.setFontSize(12);
        this.pdf.setFont(undefined, 'bold');
        this.pdf.text('Підписи:', this.margin, this.currentY);
        this.currentY += 20;

        signatures.forEach((signature, index) => {
            const x = this.margin + (index * (this.pageWidth - 2 * this.margin) / signatures.length);
            
            this.pdf.setFontSize(10);
            this.pdf.setFont(undefined, 'normal');
            this.pdf.text(signature.role, x, this.currentY);
            this.pdf.text('________________________', x, this.currentY + 20);
            this.pdf.text(signature.name, x, this.currentY + 30);
            this.pdf.text(signature.date, x, this.currentY + 40);
        });

        this.currentY += 60;
    }

    addFooter() {
        const footerY = this.pageHeight - 30;
        
        this.pdf.setFontSize(8);
        this.pdf.setFont(undefined, 'italic');
        this.pdf.text('Згенеровано LiftMaster Pro System', this.pageWidth / 2, footerY, { align: 'center' });
        this.pdf.text(`Сторінка ${this.pdf.internal.getNumberOfPages()}`, this.pageWidth - this.margin, footerY, { align: 'right' });
    }

    // Table generation
    generateTable(headers, data, options = {}) {
        this.pdf.autoTable({
            startY: this.currentY,
            head: [headers],
            body: data,
            margin: { left: this.margin, right: this.margin },
            styles: { fontSize: 8 },
            headStyles: { fillColor: [66, 139, 202] },
            ...options
        });

        this.currentY = this.pdf.lastAutoTable.finalY + 10;
    }

    // Chart integration
    async addChart(chartData, options = {}) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Create chart using Chart.js
        new Chart(ctx, {
            type: options.type || 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                ...options.chartOptions
            }
        });

        // Convert to image and add to PDF
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for chart render
        
        const imageData = canvas.toDataURL('image/png');
        this.pdf.addImage(imageData, 'PNG', this.margin, this.currentY, options.width || 150, options.height || 100);
        this.currentY += (options.height || 100) + 10;
    }

    // Advanced features
    async addQRCode(url, options = {}) {
        const qrCode = await QRCode.toDataURL(url, {
            width: options.size || 80,
            margin: 1
        });

        this.pdf.addImage(qrCode, 'PNG', options.x || this.margin, options.y || this.currentY, options.size || 80, options.size || 80);
    }

    addWatermark(text) {
        this.pdf.setFontSize(60);
        this.pdf.setFont(undefined, 'bold');
        this.pdf.setTextColor(200, 200, 200, 0.2);
        this.pdf.text(text, this.pageWidth / 2, this.pageHeight / 2, {
            align: 'center',
            angle: 45
        });
        this.pdf.setTextColor(0, 0, 0);
    }

    // Export methods
    async savePDF(filename = 'report.pdf') {
        this.pdf.save(filename);
    }

    async getPDFBlob() {
        return this.pdf.output('blob');
    }

    async getPDFDataURL() {
        return this.pdf.output('datauristring');
    }

    // Utility methods
    async blobToDataURL(blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }

    async loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    initFonts() {
        // Add Ukrainian font support
        this.pdf.addFont('Helvetica', 'Helvetica', 'normal');
        this.pdf.addFont('Helvetica-Bold', 'Helvetica', 'bold');
        this.pdf.addFont('Helvetica-Oblique', 'Helvetica', 'italic');
    }

    setupTemplates() {
        this.templates = {
            inspection: this.generateInspectionReport.bind(this),
            maintenance: this.generateMaintenanceReport.bind(this),
            financial: this.generateFinancialReport.bind(this),
            technical: this.generateTechnicalReport.bind(this)
        };
    }
}

// Initialize PDF generator
document.addEventListener('DOMContentLoaded', function() {
    window.pdfGenerator = new PDFGenerator();
});