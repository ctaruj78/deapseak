#!/usr/bin/env node

/**
 * 🧪 Тест Brevo API для відправки email
 */

require('dotenv').config();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📧 Тест Brevo API');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Перевірка API ключа
if (!process.env.BREVO_API_KEY) {
    console.error('❌ BREVO_API_KEY не знайдено в .env');
    console.error('');
    console.error('Додайте до .env:');
    console.error('   BREVO_API_KEY=xkeysib-YOUR-API-KEY-HERE');
    process.exit(1);
}

console.log('🔑 API Key знайдено');
console.log('   Довжина:', process.env.BREVO_API_KEY.length);
console.log('   Починається з:', process.env.BREVO_API_KEY.substring(0, 15) + '...');
console.log('');

// Імпорт Brevo SDK
const brevo = require('@getbrevo/brevo');

// Створити API instance
const apiInstance = new brevo.TransactionalEmailsApi();

// Налаштувати API Key
apiInstance.setApiKey(
    brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY
);

// Підготувати тестовий email
const sendSmtpEmail = new brevo.SendSmtpEmail();
sendSmtpEmail.sender = { 
    name: "FestLift Test", 
    email: "info@festlift.pt" 
};
sendSmtpEmail.to = [{ 
    email: "8b688f001@smtp-brevo.com", // відправимо собі
    name: "Test Recipient"
}];
sendSmtpEmail.subject = "✅ Тест Brevo API - Orçamentos FestLift";
sendSmtpEmail.htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0;">✅ Brevo API працює!</h1>
            <p style="margin: 10px 0 0 0;">Тест успішний</p>
        </div>
        
        <div style="padding: 30px;">
            <h2 style="color: #333;">🎉 Вітаємо!</h2>
            <p>Brevo API успішно налаштовано для системи кошторисів FestLift.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #667eea;">Переваги Brevo API:</h3>
                <ul style="line-height: 1.8;">
                    <li>✅ Швидша доставка</li>
                    <li>✅ Кращий tracking</li>
                    <li>✅ Вища надійність</li>
                    <li>✅ Детальна статистика</li>
                </ul>
            </div>
            
            <div style="background: #e7f3ff; padding: 20px; border-radius: 8px;">
                <p style="margin: 0; color: #0066cc;">
                    <strong>Час тесту:</strong> ${new Date().toLocaleString('pt-PT')}<br>
                    <strong>API Version:</strong> Brevo v3<br>
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

console.log('📤 Відправка тестового email через Brevo API...');
console.log('   Від: FestLift Test <info@festlift.pt>');
console.log('   До: 8b688f001@smtp-brevo.com');
console.log('   Тема:', sendSmtpEmail.subject);
console.log('');

// Відправити email
apiInstance.sendTransacEmail(sendSmtpEmail)
    .then((data) => {
        console.log('✅ EMAIL ВІДПРАВЛЕНО УСПІШНО!');
        console.log('');
        console.log('📋 Деталі відправки:');
        console.log('   Message ID:', data.messageId);
        console.log('');
        console.log('📧 Перевірте email: 8b688f001@smtp-brevo.com');
        console.log('');
        console.log('📊 Tracking в Brevo Dashboard:');
        console.log('   https://app.brevo.com/logs');
        console.log('');
        console.log('🎉 BREVO API ПРАЦЮЄ ІДЕАЛЬНО!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ ПОМИЛКА ВІДПРАВКИ:');
        console.error('');
        
        if (error.response) {
            console.error('HTTP Status:', error.response.status);
            console.error('Body:', error.response.body);
        } else {
            console.error('Повідомлення:', error.message);
        }
        
        console.error('');
        
        if (error.response?.status === 401) {
            console.error('🔴 Помилка автентифікації (401)');
            console.error('');
            console.error('Можливі причини:');
            console.error('   1. Невірний API ключ');
            console.error('   2. API ключ застарів');
            console.error('   3. API ключ анульовано');
            console.error('');
            console.error('Рішення:');
            console.error('   1. Перейдіть: https://app.brevo.com/settings/keys/api');
            console.error('   2. Створіть новий API ключ');
            console.error('   3. Оновіть BREVO_API_KEY в .env');
        } else if (error.response?.status === 400) {
            console.error('🔴 Помилка запиту (400)');
            console.error('');
            console.error('Перевірте:');
            console.error('   1. Email sender верифікований в Brevo');
            console.error('   2. Формат email коректний');
            console.error('   3. HTML не містить помилок');
        }
        
        console.error('');
        console.error('Повна помилка:');
        console.error(error);
        console.error('');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        process.exit(1);
    });
