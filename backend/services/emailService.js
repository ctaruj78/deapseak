const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // 📧 SMTP Configuration (Brevo SMTP relay — стабільніший ніж API key)
        // Credentials: smtp-relay.brevo.com / SMTP_USER / SMTP_PASS
        this.smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

        if (!this.smtpConfigured) {
            console.warn('⚠️  SMTP não configurado — emails não serão enviados (definir SMTP_HOST, SMTP_USER, SMTP_PASS no .env)');
        }

        // Professional sender identity
        const fromRaw = process.env.SMTP_FROM || process.env.EMAIL_FROM || '"DeapSeaK System" <noreply@deapseak.com>';
        this.from = fromRaw;

        if (this.smtpConfigured) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                },
                tls: { rejectUnauthorized: false }
            });
            console.log(`✅ Email Service initialized — SMTP: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}`);
        }
    }

    // Helper method to send email via SMTP
    async _sendEmail(to, subject, htmlContent, attachments = []) {
        if (!this.smtpConfigured) {
            console.warn(`⚠️  Email não enviado para ${to} — SMTP não configurado`);
            return;
        }

        // Normalize 'to' to string or array of strings
        let toField;
        if (typeof to === 'string') {
            toField = to;
        } else if (Array.isArray(to)) {
            toField = to.map(t => (typeof t === 'string' ? t : (t.name ? `${t.name} <${t.email}>` : t.email))).join(', ');
        } else if (to && to.email) {
            toField = to.name ? `${to.name} <${to.email}>` : to.email;
        } else {
            console.warn('⚠️  Email não enviado — destinatário inválido:', to);
            return;
        }

        const mailOptions = {
            from: this.from,
            to: toField,
            subject,
            html: htmlContent
        };

        // Inline attachments (logos etc.)
        if (attachments && attachments.length > 0) {
            mailOptions.attachments = attachments.map(a => ({
                filename: a.name,
                content: Buffer.from(a.content, 'base64'),
                cid: a.contentId || undefined,
                encoding: 'base64'
            }));
        }

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email enviado: ${info.messageId} → ${toField}`);
            return info;
        } catch (error) {
            const msg = error.responseCode ? `[${error.responseCode}] ${error.response}` : error.message;
            console.error(`❌ SMTP error: ${msg}`);
            throw error;
        }
    }

    // Публічний метод для відправки email (для API endpoints)
    async sendEmail(to, subject, htmlContent) {
        return await this._sendEmail(to, subject, htmlContent);
    }

    // Відправити email про нову заявку
    async sendNewRequestNotification(request, client) {
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
                            <p><strong>Дата створення:</strong> ${new Date(request.createdAt).toLocaleString('pt-PT')}</p>
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
                            <p><strong>Дата завершення:</strong> ${new Date(request.completedAt || Date.now()).toLocaleString('pt-PT')}</p>
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

    // Welcome email для нового клієнта з тимчасовим паролем
    async sendWelcomeClientEmail(user, temporaryPassword) {
        const frontendUrl = process.env.FRONTEND_URL || 'https://deapseak.com';
        const loginUrl = `${frontendUrl}/pages/auth/login.html`;
        const firstName = user.firstName || 'Cliente';
        const lastName = user.lastName || '';

        const html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
                <div style="background:#1a1a2e;padding:24px 32px;border-radius:8px 8px 0 0;">
                    <h1 style="color:#fff;margin:0;font-size:22px;">🛗 FestLift — Plataforma de Gestão de Elevadores</h1>
                </div>
                <div style="background:#fff;padding:32px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
                    <p style="font-size:16px;">Bem-vindo(a), <strong>${firstName} ${lastName}</strong>!</p>
                    <p>A sua empresa foi registada na plataforma <strong>FestLift</strong> como cliente de manutenção de elevadores.</p>
                    <p>Pode acompanhar o estado dos seus elevadores, consultar relatórios e criar pedidos de serviço.</p>

                    <div style="background:#f0f4ff;border-left:4px solid #4361ee;padding:20px;border-radius:6px;margin:24px 0;">
                        <h3 style="margin-top:0;color:#4361ee;">🔐 Os seus dados de acesso:</h3>
                        <p style="margin:6px 0;"><strong>Email:</strong> ${user.email}</p>
                        <p style="margin:6px 0;"><strong>Palavra-passe temporária:</strong> <code style="background:#e8edff;padding:2px 8px;border-radius:4px;font-size:15px;">${temporaryPassword}</code></p>
                    </div>

                    <div style="background:#fff8e1;border-left:4px solid #ffc107;padding:16px;border-radius:6px;margin:16px 0;">
                        <p style="margin:0;">⚠️ <strong>Por razões de segurança, altere a sua palavra-passe após o primeiro login.</strong></p>
                    </div>

                    <a href="${loginUrl}"
                       style="display:inline-block;background:#4361ee;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;margin-top:16px;">
                        Entrar na plataforma →
                    </a>

                    <p style="color:#888;font-size:13px;margin-top:32px;">
                        Se tiver alguma questão, contacte-nos em <a href="mailto:info@festlift.pt" style="color:#4361ee;">info@festlift.pt</a>
                    </p>
                </div>
            </div>`;

        try {
            await this._sendEmail(user.email, 'Bem-vindo(a) à FestLift — Os seus dados de acesso', html);
        } catch (error) {
            console.error('❌ sendWelcomeClientEmail error:', error.message);
            throw error;
        }
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

    // 🏛️ Відправити форму до муніципалітету (Início de Serviço / Fim de Serviço)
    async sendMunicipalityForm(templateType, liftData, municipalityEmail) {
        try {
            const fs = require('fs');
            const path = require('path');

            // Читаємо HTML шаблон
            const templatePath = path.join(__dirname, '../../templates/emails', `municipality-${templateType}.html`);
            let htmlContent = fs.readFileSync(templatePath, 'utf8');

            // Замінюємо placeholder'и на реальні дані
            htmlContent = htmlContent
                .replace(/{{municipalNumber}}/g, liftData.municipalNumber || 'N/A')
                .replace(/{{address}}/g, liftData.address || 'N/A')
                .replace(/{{brand}}/g, liftData.brand || 'N/A')
                .replace(/{{model}}/g, liftData.model || 'N/A')
                .replace(/{{year}}/g, liftData.installationYear || 'N/A')
                .replace(/{{capacity}}/g, liftData.capacity || 'N/A')
                .replace(/{{municipalityName}}/g, liftData.municipalityName || 'Senhor(a) Presidente')
                .replace(/{{date}}/g, new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }));

            // Читаємо логотип FestLift
            const logoPath = path.join(__dirname, '../../assets/img/festlift-logo.png');
            const logoContent = fs.readFileSync(logoPath).toString('base64');

            // Підготовка attachments для Brevo з inline Content-ID
            const attachments = [{
                name: 'festlift-logo.png',
                content: logoContent,
                contentId: 'festlift-logo' // Це дозволяє використовувати cid:festlift-logo в HTML
            }];

            // Визначаємо subject
            const subject = templateType === 'inicio-servico' 
                ? `📝 FestLift - Elevadores e Serviços - Comunicação de Início de Serviço - Elevador ${liftData.municipalNumber}`
                : `📝 FestLift - Elevadores e Serviços - Comunicação de Fim de Serviço - Elevador ${liftData.municipalNumber}`;

            // Відправляємо email
            await this._sendEmail(municipalityEmail, subject, htmlContent, attachments);
            
            console.log(`✅ Municipality form (${templateType}) sent to ${municipalityEmail} for lift ${liftData.municipalNumber}`);
            return { success: true, message: 'Email enviado com sucesso' };
        } catch (error) {
            console.error('❌ Error sending municipality form:', error);
            throw error;
        }
    }
}

module.exports = new EmailService();
