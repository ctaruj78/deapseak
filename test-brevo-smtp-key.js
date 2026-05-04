#!/usr/bin/env node

/**
 * 🧪 Тест Brevo API з SMTP ключем (xsmtpsib-)
 */

require('dotenv').config();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📧 Тест Brevo API з SMTP ключем');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Перевірка SMTP_PASS як API ключа
if (!process.env.SMTP_PASS) {
    console.error('❌ SMTP_PASS не знайдено в .env');
    process.exit(1);
}

console.log('🔑 SMTP_PASS знайдено');
console.log('   Довжина:', process.env.SMTP_PASS.length);
console.log('   Починається з:', process.env.SMTP_PASS.substring(0, 15) + '...');
console.log('   Тип:', process.env.SMTP_PASS.startsWith('xsmtpsib-') ? 'SMTP Key' : 'Unknown');
console.log('');

// Імпорт Brevo SDK
const brevo = require('@getbrevo/brevo');

// Створити API instance
const apiInstance = new brevo.TransactionalEmailsApi();

// Спробувати використати SMTP ключ як API ключ
console.log('🔧 Спроба використати SMTP_PASS як API ключ...\n');
apiInstance.setApiKey(
    brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.SMTP_PASS  // Використовуємо xsmtpsib- ключ
);

// Підготувати тестовий email
const sendSmtpEmail = new brevo.SendSmtpEmail();

sendSmtpEmail.sender = {
    name: 'FestLift Test',
    email: 'info@festlift.pt'
};

sendSmtpEmail.to = [{
    email: '8b688f001@smtp-brevo.com',
    name: 'Test Recipient'
}];

sendSmtpEmail.subject = '✅ Тест Brevo API з SMTP ключем';

const currentTime = new Date().toLocaleString('pt-PT');

sendSmtpEmail.htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0;">✅ SMTP Key працює як API Key!</h1>
            <p style="margin: 10px 0 0 0;">Тест успішний</p>
        </div>
        
        <div style="padding: 30px;">
            <h2 style="color: #333;">🎉 Вітаємо!</h2>
            <p>SMTP ключ (xsmtpsib-) може використовуватись для Brevo API v3!</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #667eea;">Результат тесту:</h3>
                <ul style="line-height: 1.8;">
                    <li>✅ SMTP ключ прийнято API</li>
                    <li>✅ Email надіслано успішно</li>
                    <li>✅ Можна використовувати для orçamentos</li>
                </ul>
            </div>
            
            <div style="background: #e7f3ff; padding: 20px; border-radius: 8px;">
                <p style="margin: 0; color: #0066cc;">
                    <strong>Час тесту:</strong> ${currentTime}<br>
                    <strong>Ключ:</strong> SMTP_PASS (xsmtpsib-...)<br>
                    <strong>Метод:</strong> TransactionalEmailsApi
                </p>
            </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
            <p style="margin: 0; color: #666; font-size: 12px;">
                <strong>FestLift, LDA</strong> - Sistema de Orçamentos v2.1.0
            </p>
        </div>
    </div>
`;

// Відправити email
(async () => {
    try {
        console.log('📤 Відправка тестового email через Brevo API...');
        console.log('   Від: FestLift Test <info@festlift.pt>');
        console.log('   До: 8b688f001@smtp-brevo.com');
        console.log('   Тема: ✅ Тест Brevo API з SMTP ключем');
        console.log('');

        const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

        console.log('✅ EMAIL НАДІСЛАНО УСПІШНО!\n');
        console.log('📊 Результат:');
        console.log('   Message ID:', result.messageId);
        console.log('');
        console.log('🎉 SMTP ключ (xsmtpsib-) працює з Brevo API!\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.log('❌ ПОМИЛКА ВІДПРАВКИ:\n');
        console.log('HTTP Status:', error.status);
        console.log('Body:', error.response?.body);
        console.log('');

        if (error.status === 401) {
            console.log('🔴 Помилка автентифікації (401)\n');
            console.log('SMTP ключ (xsmtpsib-) НЕ може використовуватись як API ключ.');
            console.log('Потрібен справжній API ключ (xkeysib-) з:');
            console.log('   https://app.brevo.com/settings/keys/api\n');
        } else {
            console.log('Помилка:', error.message);
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        process.exit(1);
    }
})();
