// ============================================
// EMAIL SERVICE - Сервіс відправки email сповіщень
// ============================================

const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.from = process.env.EMAIL_FROM || 'DeapSeaK <noreply@deapseak.com>';
        this.init();
    }

    init() {
        // Налаштування транспортера
        // Для production використовуйте реальні SMTP налаштування
        const emailConfig = {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: false, // true для 465, false для інших портів
            auth: {
                user: process.env.SMTP_USER || '',
                pass: process.env.SMTP_PASS || ''
            }
        };

        // Якщо немає налаштувань - використовуємо ethereal для тестування
        if (!process.env.SMTP_USER) {
            console.log('⚠️ SMTP not configured, using test mode');
            // В тестовому режимі можна використати ethereal.email
            // Для production налаштуйте .env файл з реальними SMTP credentials
            this.testMode = true;
        } else {
            this.transporter = nodemailer.createTransport(emailConfig);
            this.testMode = false;
            console.log('✅ Email service initialized');
        }
    }

    async sendEmail({ to, subject, html, text }) {
        if (this.testMode) {
            console.log('📧 [TEST MODE] Email would be sent:');
            console.log('   To:', to);
            console.log('   Subject:', subject);
            console.log('   Content:', text || html);
            return { success: true, messageId: 'test-' + Date.now() };
        }

        try {
            const info = await this.transporter.sendMail({
                from: this.from,
                to,
                subject,
                text,
                html: html || text
            });

            console.log('✅ Email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Email send error:', error);
            return { success: false, error: error.message };
        }
    }

    // Шаблон сповіщення про нову заявку
    async sendNewRequestNotification({ clientEmail, requestData }) {
        const subject = `🔔 Нова заявка #${requestData.id}`;
        const html = `
            <h2>Нову заявку створено</h2>
            <p>Шановний користувачу!</p>
            <p>Вашу заявку успішно створено та передано в роботу.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <h3>Деталі заявки:</h3>
                <p><strong>Номер:</strong> #${requestData.id}</p>
                <p><strong>Назва:</strong> ${requestData.title}</p>
                <p><strong>Опис:</strong> ${requestData.description}</p>
                <p><strong>Локація:</strong> ${requestData.location || 'Не вказано'}</p>
                <p><strong>Пріоритет:</strong> ${this.getPriorityLabel(requestData.priority)}</p>
                <p><strong>Статус:</strong> ${this.getStatusLabel(requestData.status)}</p>
            </div>
            
            <p>Ми повідомимо вас про зміну статусу заявки.</p>
            <p>З повагою,<br>Команда DeapSeaK</p>
        `;

        return await this.sendEmail({ to: clientEmail, subject, html });
    }

    // Шаблон сповіщення про призначення техніка
    async sendTechnicianAssignmentNotification({ techEmail, requestData, techName }) {
        const subject = `👷 Нова заявка призначена вам #${requestData.id}`;
        const html = `
            <h2>Вам призначено нову заявку</h2>
            <p>Шановний ${techName}!</p>
            <p>Вам призначено нову заявку для виконання.</p>
            
            <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <h3>Деталі заявки:</h3>
                <p><strong>Номер:</strong> #${requestData.id}</p>
                <p><strong>Назва:</strong> ${requestData.title}</p>
                <p><strong>Опис:</strong> ${requestData.description}</p>
                <p><strong>Локація:</strong> ${requestData.location || 'Не вказано'}</p>
                <p><strong>Пріоритет:</strong> ${this.getPriorityLabel(requestData.priority)}</p>
                <p><strong>Клієнт:</strong> ${requestData.client || 'Не вказано'}</p>
            </div>
            
            <p>Будь ласка, зв'яжіться з клієнтом найближчим часом.</p>
            <p>З повагою,<br>Команда DeapSeaK</p>
        `;

        return await this.sendEmail({ to: techEmail, subject, html });
    }

    // Шаблон сповіщення про зміну статусу
    async sendStatusChangeNotification({ clientEmail, requestData, oldStatus, newStatus }) {
        const subject = `📊 Статус заявки #${requestData.id} змінено`;
        const html = `
            <h2>Статус вашої заявки змінено</h2>
            <p>Шановний користувачу!</p>
            <p>Статус вашої заявки було оновлено.</p>
            
            <div style="background: #fff3cd; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <h3>Інформація:</h3>
                <p><strong>Номер заявки:</strong> #${requestData.id}</p>
                <p><strong>Назва:</strong> ${requestData.title}</p>
                <p><strong>Попередній статус:</strong> ${this.getStatusLabel(oldStatus)}</p>
                <p><strong>Новий статус:</strong> ${this.getStatusLabel(newStatus)}</p>
                ${requestData.assignedTo ? `<p><strong>Призначений технік:</strong> ${requestData.assignedTo}</p>` : ''}
            </div>
            
            <p>Дякуємо за використання наших послуг!</p>
            <p>З повагою,<br>Команда DeapSeaK</p>
        `;

        return await this.sendEmail({ to: clientEmail, subject, html });
    }

    // Сповіщення про завершення роботи
    async sendWorkCompletedNotification({ clientEmail, requestData }) {
        const subject = `✅ Роботу за заявкою #${requestData.id} завершено`;
        const html = `
            <h2>Роботу завершено</h2>
            <p>Шановний користувачу!</p>
            <p>Роботу за вашою заявкою успішно завершено.</p>
            
            <div style="background: #d4edda; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <h3>Деталі:</h3>
                <p><strong>Номер заявки:</strong> #${requestData.id}</p>
                <p><strong>Назва:</strong> ${requestData.title}</p>
                <p><strong>Виконавець:</strong> ${requestData.assignedTo || 'Не вказано'}</p>
                <p><strong>Дата завершення:</strong> ${new Date().toLocaleDateString('uk-UA')}</p>
            </div>
            
            <p>Якщо у вас виникли питання, будь ласка, зв'яжіться з нами.</p>
            <p>З повагою,<br>Команда DeapSeaK</p>
        `;

        return await this.sendEmail({ to: clientEmail, subject, html });
    }

    // Допоміжні функції для форматування
    getPriorityLabel(priority) {
        const labels = {
            low: '🟢 Низький',
            medium: '🟡 Середній',
            high: '🔴 Високий',
            urgent: '🚨 Терміново'
        };
        return labels[priority] || priority;
    }

    getStatusLabel(status) {
        const labels = {
            new: '🆕 Нова',
            assigned: '👤 Призначена',
            in_progress: '🔧 В роботі',
            completed: '✅ Завершена',
            cancelled: '❌ Скасована'
        };
        return labels[status] || status;
    }
}

// Створюємо singleton instance
const emailService = new EmailService();

module.exports = emailService;
