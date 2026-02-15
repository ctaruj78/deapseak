const brevo = require('@getbrevo/brevo');

class EmailService {
    constructor() {
        // 📧 Brevo API v3 Configuration (FestLift Professional Email)
        // 300 emails/day FREE, 99%+ deliverability, tracking included
        if (!process.env.BREVO_API_KEY) {
            console.warn('⚠️  BREVO_API_KEY não configurado - emails não serão enviados');
            this.apiInstance = null;
            this.from = { email: 'noreply@deapseak.com', name: 'DeapSeaK System' };
            return;
        }

        this.apiInstance = new brevo.TransactionalEmailsApi();
        this.apiInstance.setApiKey(
            brevo.TransactionalEmailsApiApiKeys.apiKey,
            process.env.BREVO_API_KEY
        );
        
        // Professional sender identity
        const fromMatch = (process.env.EMAIL_FROM || 'DeapSeaK System <noreply@deapseak.com>').match(/^(.+?)\s*<(.+?)>$/);
        if (fromMatch) {
            this.from = { name: fromMatch[1].trim(), email: fromMatch[2].trim() };
        } else {
            this.from = { email: process.env.EMAIL_FROM || 'noreply@deapseak.com', name: 'DeapSeaK System' };
        }
        
        console.log('✅ Email Service initialized with Brevo API v3');
    }

    // Helper method to send email via Brevo API
    async _sendEmail(to, subject, htmlContent) {
        if (!this.apiInstance) {
            console.warn('⚠️  Email não enviado - BREVO_API_KEY não configurado');
            return;
        }

        const sendSmtpEmail = new brevo.SendSmtpEmail();
        sendSmtpEmail.sender = this.from;
        
        // Обробка різних форматів to
        if (typeof to === 'string') {
            sendSmtpEmail.to = [{ email: to }];
        } else if (Array.isArray(to)) {
            sendSmtpEmail.to = to;
        } else {
            sendSmtpEmail.to = [to];
        }
        
        sendSmtpEmail.subject = subject;
        sendSmtpEmail.htmlContent = htmlContent;

        await this.apiInstance.sendTransacEmail(sendSmtpEmail);
    }

    // Публічний метод для відправки email (для API endpoints)
    async sendEmail(to, subject, htmlContent) {
        return await this._sendEmail(to, subject, htmlContent);
    }

    // Відправити email про нову заявку
    async sendNewRequestNotification(request, client) {
        if (!this.apiInstance) {
            console.warn('⚠️  Email não enviado - BREVO_API_KEY não configurado');
            return;
        }

        try {
            await this._sendEmail(
                [{ email: client.email, name: `${client.firstName} ${client.lastName}` }],
                `✅ Нова заявка #${request._id} створена`,
                `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #28a745;">Заявка успішно створена</h2>
                        <p>Шановний ${client.firstName} ${client.lastName}!</p>
                        <p>Ваша заявка на обслуговування ліфта була успішно створена та передана в роботу.</p>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">Деталі заявки:</h3>
                            <p><strong>Номер:</strong> #${request._id}</p>
                            <p><strong>Назва:</strong> ${request.title}</p>
                            <p><strong>Тип:</strong> ${this.getRequestTypeText(request.type)}</p>
                            <p><strong>Пріоритет:</strong> ${this.getPriorityText(request.priority)}</p>
                            <p><strong>Статус:</strong> ${this.getStatusText(request.status)}</p>
                            <p><strong>Дата створення:</strong> ${new Date(request.createdAt).toLocaleString('uk-UA')}</p>
                        </div>

                        <p>Ми повідомимо вас про зміну статусу заявки.</p>
                        
                        <p style="color: #666; font-size: 12px; margin-top: 30px;">
                            Це автоматичний лист. Будь ласка, не відповідайте на нього.
                        </p>
                    </div>
                `
            );
            console.log(`✅ Email sent to ${client.email} about new request #${request._id}`);
        } catch (error) {
            console.error('❌ Error sending email:', error);
        }
    }

    // Відправити email про призначення техніка
    async sendTechnicianAssignedNotification(request, technician, client) {
        try {
            const mailOptions = {
                from: this.from,
                to: client.email,
                subject: `🔧 Техніка призначено для заявки #${request._id}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #007bff;">Техніка призначено</h2>
                        <p>Шановний ${client.firstName} ${client.lastName}!</p>
                        <p>До вашої заявки призначено техніка.</p>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">Технік:</h3>
                            <p><strong>Ім'я:</strong> ${technician.firstName} ${technician.lastName}</p>
                            <p><strong>Телефон:</strong> ${technician.phone || 'Не вказано'}</p>
                            <p><strong>Email:</strong> ${technician.email}</p>
                        </div>

                        <div style="background: #e9ecef; padding: 15px; border-radius: 8px;">
                            <p><strong>Заявка:</strong> #${request._id} - ${request.title}</p>
                            <p><strong>Статус:</strong> ${this.getStatusText(request.status)}</p>
                        </div>

                        <p style="margin-top: 20px;">Технік зв'яжеться з вами найближчим часом.</p>
                    </div>
                `
            };

            await this._sendEmail(mailOptions.to, mailOptions.subject, mailOptions.html);
            console.log(`✅ Email sent to ${client.email} about technician assignment`);

            // Також відправити техніку
            await this.sendTechnicianTaskNotification(request, technician);
        } catch (error) {
            console.error('❌ Error sending email:', error);
        }
    }

    // Відправити email техніку про нове завдання
    async sendTechnicianTaskNotification(request, technician) {
        try {
            const mailOptions = {
                from: this.from,
                to: technician.email,
                subject: `📋 Нове завдання: Заявка #${request._id}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #ffc107;">Нове завдання призначено</h2>
                        <p>Шановний ${technician.firstName} ${technician.lastName}!</p>
                        <p>Вам призначено нову заявку на обслуговування.</p>
                        
                        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                            <h3 style="margin-top: 0;">Деталі завдання:</h3>
                            <p><strong>Номер:</strong> #${request._id}</p>
                            <p><strong>Назва:</strong> ${request.title}</p>
                            <p><strong>Опис:</strong> ${request.description}</p>
                            <p><strong>Тип:</strong> ${this.getRequestTypeText(request.type)}</p>
                            <p><strong>Пріоритет:</strong> ${this.getPriorityText(request.priority)}</p>
                            <p><strong>Ліфт ID:</strong> ${request.liftId}</p>
                        </div>

                        <p>Будь ласка, зв'яжіться з клієнтом та виконайте завдання якомога швидше.</p>
                        
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/pages/tech/tasks.html" 
                           style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 5px; margin-top: 20px;">
                            Переглянути завдання
                        </a>
                    </div>
                `
            };

            await this._sendEmail(mailOptions.to, mailOptions.subject, mailOptions.html);
            console.log(`✅ Email sent to ${technician.email} about new task`);
        } catch (error) {
            console.error('❌ Error sending email:', error);
        }
    }

    // Відправити email про зміну статусу
    async sendStatusChangeNotification(request, client, oldStatus, newStatus) {
        try {
            const mailOptions = {
                from: this.from,
                to: client.email,
                subject: `🔄 Статус заявки #${request._id} змінено`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #17a2b8;">Статус заявки змінено</h2>
                        <p>Шановний ${client.firstName} ${client.lastName}!</p>
                        <p>Статус вашої заявки було оновлено.</p>
                        
                        <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
                            <p><strong>Заявка:</strong> #${request._id} - ${request.title}</p>
                            <p><strong>Попередній статус:</strong> ${this.getStatusText(oldStatus)}</p>
                            <p><strong>Новий статус:</strong> <span style="color: #28a745; font-weight: bold;">${this.getStatusText(newStatus)}</span></p>
                        </div>

                        <p>Дякуємо за використання нашого сервісу!</p>
                    </div>
                `
            };

            await this._sendEmail(mailOptions.to, mailOptions.subject, mailOptions.html);
            console.log(`✅ Email sent to ${client.email} about status change`);
        } catch (error) {
            console.error('❌ Error sending email:', error);
        }
    }

    // Відправити email про завершення заявки
    async sendRequestCompletedNotification(request, client) {
        try {
            const mailOptions = {
                from: this.from,
                to: client.email,
                subject: `✅ Заявка #${request._id} завершена`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #28a745;">Заявка завершена!</h2>
                        <p>Шановний ${client.firstName} ${client.lastName}!</p>
                        <p>Ваша заявка на обслуговування ліфта була успішно виконана.</p>
                        
                        <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                            <h3 style="margin-top: 0;">Виконана робота:</h3>
                            <p><strong>Заявка:</strong> #${request._id} - ${request.title}</p>
                            <p><strong>Дата завершення:</strong> ${new Date(request.completedAt || Date.now()).toLocaleString('uk-UA')}</p>
                            ${request.workDetails ? `<p><strong>Деталі:</strong> ${request.workDetails}</p>` : ''}
                        </div>

                        <p>Будь ласка, оцініть роботу нашого техніка.</p>
                        
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/pages/client/requests.html" 
                           style="display: inline-block; background: #28a745; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 5px; margin-top: 20px;">
                            Оцінити роботу
                        </a>

                        <p style="margin-top: 30px;">Дякуємо, що обрали DeapSeaK! 🎉</p>
                    </div>
                `
            };

            await this._sendEmail(mailOptions.to, mailOptions.subject, mailOptions.html);
            console.log(`✅ Email sent to ${client.email} about completed request`);
        } catch (error) {
            console.error('❌ Error sending email:', error);
        }
    }

    // Відправити email для скидання паролю
    async sendPasswordResetEmail(email, resetUrl, firstName) {
        try {
            const mailOptions = {
                from: this.from,
                to: email,
                subject: '🔐 Скидання паролю - DeapSeaK',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #dc3545;">Запит на скидання паролю</h2>
                        <p>Шановний ${firstName || 'користувач'}!</p>
                        <p>Ви отримали цей лист, оскільки був надісланий запит на скидання паролю для вашого облікового запису в системі DeapSeaK.</p>
                        
                        <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
                            <p style="margin: 0;"><strong>⚠️ Важливо:</strong> Це посилання дійсне лише протягом <strong>10 хвилин</strong>.</p>
                        </div>

                        <p>Натисніть кнопку нижче, щоб створити новий пароль:</p>
                        
                        <a href="${resetUrl}" 
                           style="display: inline-block; background: #dc3545; color: white; padding: 14px 28px; 
                                  text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold;">
                            Скинути пароль
                        </a>

                        <p style="color: #666; font-size: 14px; margin-top: 20px;">
                            Якщо кнопка не працює, скопіюйте та вставте це посилання в браузер:<br>
                            <span style="word-break: break-all; color: #007bff;">${resetUrl}</span>
                        </p>

                        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #ffc107;">
                            <p style="margin: 0;"><strong>🛡️ Безпека:</strong> Якщо ви не надсилали цей запит, просто проігноруйте цей лист. Ваш пароль залишиться незмінним.</p>
                        </div>

                        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                        
                        <p style="color: #666; font-size: 12px;">
                            Це автоматичний лист від системи DeapSeaK. Будь ласка, не відповідайте на нього.<br>
                            З питань безпеки звертайтеся до вашого адміністратора системи.
                        </p>
                    </div>
                `
            };

            await this._sendEmail(mailOptions.to, mailOptions.subject, mailOptions.html);
            console.log(`✅ Password reset email sent to ${email}`);
        } catch (error) {
            console.error('❌ Error sending password reset email:', error);
            throw error;
        }
    }

    // Допоміжні функції для текстів
    getRequestTypeText(type) {
        const types = {
            maintenance: 'Технічне обслуговування',
            repair: 'Ремонт',
            emergency: 'Аварійна ситуація',
            inspection: 'Інспекція',
            consultation: 'Консультація'
        };
        return types[type] || type;
    }

    getPriorityText(priority) {
        const priorities = {
            low: 'Низький',
            medium: 'Середній',
            high: 'Високий',
            urgent: 'Терміновий'
        };
        return priorities[priority] || priority;
    }

    getStatusText(status) {
        const statuses = {
            new: 'Нова',
            assigned: 'Призначена',
            in_progress: 'В роботі',
            completed: 'Завершена',
            cancelled: 'Скасована'
        };
        return statuses[status] || status;
    }

    // Тестова відправка
    async sendTestEmail(to) {
        try {
            const mailOptions = {
                from: this.from,
                to: to,
                subject: '✅ Test Email from DeapSeaK',
                html: '<h1>Email service is working!</h1><p>This is a test email from your DeapSeaK system.</p>'
            };

            const info = await this._sendEmail(mailOptions.to, mailOptions.subject, mailOptions.html);
            console.log('✅ Test email sent:', info.messageId);
            return true;
        } catch (error) {
            console.error('❌ Error sending test email:', error);
            return false;
        }
    }
}

module.exports = new EmailService();
