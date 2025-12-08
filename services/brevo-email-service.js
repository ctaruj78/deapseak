// ============================================
// 📧 BREVO EMAIL SERVICE - REST API Integration
// ============================================
// Використовує Brevo REST API замість SMTP
// Працює з API v3 Key (xkeysib-...)
// ============================================

require('dotenv').config();
const SibApiV3Sdk = require('sib-api-v3-sdk');

class BrevoEmailService {
    constructor() {
        this.defaultClient = SibApiV3Sdk.ApiClient.instance;
        this.apiKey = this.defaultClient.authentications['api-key'];
        this.apiKey.apiKey = process.env.SMTP_PASS; // API v3 Key
        
        this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        this.from = process.env.EMAIL_FROM || 'FestLift <info@festlift.pt>';
        
        console.log('✅ Brevo Email Service ініціалізовано (REST API)');
    }

    /**
     * Відправити email через Brevo API
     * @param {Object} options - Параметри email
     * @param {string|Array} options.to - Email отримувача(ів)
     * @param {string} options.subject - Тема листа
     * @param {string} options.html - HTML контент
     * @param {string} options.text - Текстова версія (опціонально)
     * @param {Array} options.attachments - Вкладення (опціонально)
     * @returns {Promise<Object>} Результат відправки
     */
    async sendEmail({ to, subject, html, text, attachments = [] }) {
        try {
            // Підготовка отримувачів
            const recipients = Array.isArray(to) 
                ? to.map(email => ({ email }))
                : [{ email: to }];

            // Підготовка відправника
            const [senderName, senderEmail] = this.parseSender(this.from);

            // Підготовка email об'єкту
            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
            sendSmtpEmail.sender = { name: senderName, email: senderEmail };
            sendSmtpEmail.to = recipients;
            sendSmtpEmail.subject = subject;
            sendSmtpEmail.htmlContent = html;
            
            if (text) {
                sendSmtpEmail.textContent = text;
            }

            if (attachments && attachments.length > 0) {
                sendSmtpEmail.attachment = this.prepareAttachments(attachments);
            }

            // Відправка
            const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail);

            console.log('✅ Email відправлено через Brevo API');
            console.log(`   Message ID: ${result.messageId}`);
            console.log(`   До: ${to}`);
            console.log(`   Тема: ${subject}`);

            return {
                success: true,
                messageId: result.messageId,
                to: to,
                subject: subject
            };

        } catch (error) {
            console.error('❌ Помилка відправки email через Brevo API:');
            console.error(`   ${error.message}`);
            
            if (error.response) {
                console.error('   Response:', error.response.text);
            }

            return {
                success: false,
                error: error.message,
                details: error.response ? error.response.text : null
            };
        }
    }

    /**
     * Відправити orçamento клієнту
     * @param {Object} orcamento - Об'єкт orçamento з MongoDB
     * @returns {Promise<Object>}
     */
    async enviarOrcamento(orcamento) {
        const html = this.gerarOrcamentoHTML(orcamento);
        
        return await this.sendEmail({
            to: orcamento.cliente.email,
            subject: `Orçamento ${orcamento.numero} - FestLift`,
            html: html,
            text: `Orçamento ${orcamento.numero}\n\nTotal: €${orcamento.total}\nVálido até: ${this.formatarData(orcamento.validadeAte)}`
        });
    }

    /**
     * Генерує HTML для orçamento
     */
    gerarOrcamentoHTML(orcamento) {
        return `
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orçamento ${orcamento.numero}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; }
        .services { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .service-item { border-bottom: 1px solid #eee; padding: 10px 0; }
        .total { background: #667eea; color: white; padding: 20px; text-align: center; 
                 font-size: 24px; font-weight: bold; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; }
        th { background: #667eea; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>FESTLIFT, LDA</h1>
            <p>Especialistas em Manutenção de Elevadores</p>
        </div>
        
        <div class="content">
            <div class="info-box">
                <h2>Orçamento ${orcamento.numero}</h2>
                <p><strong>Data:</strong> ${this.formatarData(orcamento.data)}</p>
                <p><strong>Válido até:</strong> ${this.formatarData(orcamento.validadeAte)}</p>
            </div>
            
            <div class="info-box">
                <h3>Cliente:</h3>
                <p><strong>${orcamento.cliente.nome}</strong></p>
                <p>${orcamento.cliente.morada || ''}</p>
                ${orcamento.cliente.email ? `<p>📧 ${orcamento.cliente.email}</p>` : ''}
            </div>
            
            <div class="services">
                <h3>Serviços:</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Descrição</th>
                            <th>Qtd</th>
                            <th>Preço Unit.</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orcamento.servicos.map(s => `
                        <tr>
                            <td>${s.descricao}</td>
                            <td>${s.quantidade}</td>
                            <td>€${s.precoUnitario.toFixed(2)}</td>
                            <td>€${s.total.toFixed(2)}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="info-box">
                <p><strong>Subtotal:</strong> €${orcamento.subtotal.toFixed(2)}</p>
                <p><strong>IVA (23%):</strong> €${orcamento.iva.toFixed(2)}</p>
            </div>
            
            <div class="total">
                TOTAL: €${orcamento.total.toFixed(2)}
            </div>
            
            ${orcamento.notas ? `
            <div class="info-box">
                <h3>Notas:</h3>
                <p>${orcamento.notas}</p>
            </div>
            ` : ''}
            
            <p style="text-align: center; margin-top: 30px;">
                <strong>Orçamento válido por 30 dias a partir da data de apresentação</strong>
            </p>
        </div>
        
        <div class="footer">
            <p><strong>FESTLIFT, LDA</strong></p>
            <p>Av. do Parque 84B, Rio de Mouro, Lisboa 2635-609</p>
            <p>📞 +351 926 380 243 / 244 | ✉️ info@festlift.pt</p>
            <p>NIF: 515924741</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Parse sender з формату "Name <email@example.com>"
     */
    parseSender(from) {
        const match = from.match(/^(.+?)\s*<(.+?)>$/);
        if (match) {
            return [match[1].trim(), match[2].trim()];
        }
        return ['FestLift', from];
    }

    /**
     * Підготувати вкладення для Brevo API
     */
    prepareAttachments(attachments) {
        return attachments.map(att => ({
            name: att.filename,
            content: att.content.toString('base64')
        }));
    }

    /**
     * Форматувати дату
     */
    formatarData(data) {
        return new Date(data).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }

    /**
     * Перевірити з'єднання
     */
    async verificar() {
        try {
            // Простий тест - отримати account info
            const accountApi = new SibApiV3Sdk.AccountApi();
            const account = await accountApi.getAccount();
            
            console.log('✅ Brevo API підключення УСПІШНЕ!');
            console.log(`   Email: ${account.email}`);
            console.log(`   Plan: ${account.plan[0].type}`);
            console.log(`   Credits: ${account.plan[0].credits} / ${account.plan[0].creditsType}`);
            
            return { success: true, account };
        } catch (error) {
            console.error('❌ Помилка підключення Brevo API:', error.message);
            return { success: false, error: error.message };
        }
    }
}

// Експорт singleton instance
const brevoEmailService = new BrevoEmailService();
module.exports = brevoEmailService;
