// ============================================
// 📧 BREVO SMTP TEST - Тест відправки email
// ============================================

require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('🚀 Тестування Brevo SMTP...\n');

// Створюємо транспортер
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false, // false для TLS (port 587)
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Тестовий email
const testEmail = {
    from: process.env.EMAIL_FROM,
    to: '8b688f001@smtp-brevo.com', // Твій email Brevo (отримувач)
    subject: '🎉 FestLift - Teste Brevo SMTP',
    html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .success { background: #28a745; color: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .info { background: #17a2b8; color: white; padding: 10px; border-radius: 5px; margin: 10px 0; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Email Funcionando!</h1>
                </div>
                <div class="content">
                    <div class="success">
                        <strong>🎉 Brevo SMTP configurado com sucesso!</strong>
                    </div>
                    
                    <h2>📧 Detalhes do Email:</h2>
                    <div class="info">
                        <strong>Sender:</strong> ${process.env.EMAIL_FROM}<br>
                        <strong>SMTP:</strong> ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}<br>
                        <strong>Data:</strong> ${new Date().toLocaleString('pt-PT', { 
                            timeZone: 'Europe/Lisbon',
                            dateStyle: 'full',
                            timeStyle: 'long'
                        })}
                    </div>
                    
                    <h2>🚀 Próximos Passos:</h2>
                    <ol>
                        <li>✅ SMTP está funcionando perfeitamente!</li>
                        <li>📊 Verifica estatísticas: <a href="https://app.brevo.com/">Dashboard Brevo</a></li>
                        <li>🔧 Integra com orçamentos no sistema</li>
                        <li>📧 Começa a enviar orçamentos aos clientes!</li>
                    </ol>
                    
                    <h2>📊 Limites do Plano Grátis:</h2>
                    <ul>
                        <li><strong>300 emails/dia</strong> - mais que suficiente!</li>
                        <li><strong>Tracking incluído</strong> - vê quem abriu</li>
                        <li><strong>Deliverability 99%+</strong> - não vai para spam</li>
                    </ul>
                    
                    <p style="margin-top: 30px; font-size: 18px; text-align: center;">
                        <strong>🎯 Sistema de email profissional PRONTO!</strong>
                    </p>
                </div>
                <div class="footer">
                    <p><strong>FestLift, LDA</strong><br>
                    Av. do Parque 84B, Rio de Mouro, Lisboa 2635-609<br>
                    📞 +351 926 380 243 / 244 | ✉️ info@festlift.pt<br>
                    NIF: 515924741</p>
                </div>
            </div>
        </body>
        </html>
    `,
    text: `
        ✅ Email Funcionando!
        
        Brevo SMTP configurado com sucesso para FestLift!
        
        Sender: ${process.env.EMAIL_FROM}
        SMTP: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}
        Data: ${new Date().toLocaleString('pt-PT')}
        
        🚀 Próximos Passos:
        1. ✅ SMTP está funcionando!
        2. 📊 Verifica Dashboard Brevo
        3. 🔧 Integra com orçamentos
        4. 📧 Envia orçamentos aos clientes
        
        FestLift, LDA
        info@festlift.pt
    `
};

// Enviar email
console.log('📧 Enviando email de teste...');
console.log(`   De: ${testEmail.from}`);
console.log(`   Para: ${testEmail.to}`);
console.log(`   Assunto: ${testEmail.subject}\n`);

transporter.sendMail(testEmail)
    .then(info => {
        console.log('✅ EMAIL ENVIADO COM SUCESSO!\n');
        console.log('📊 DETALHES:');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Response: ${info.response}\n`);
        console.log('🎉 PARABÉNS! Brevo SMTP está FUNCIONANDO!\n');
        console.log('📈 Próximos passos:');
        console.log('   1. Verifica inbox do email de teste');
        console.log('   2. Acede Dashboard Brevo: https://app.brevo.com/');
        console.log('   3. Vai a Statistics → Real-time');
        console.log('   4. Vê o email enviado agora com tracking!\n');
        console.log('🔗 Links úteis:');
        console.log('   Dashboard: https://app.brevo.com/');
        console.log('   Statistics: https://app.brevo.com/statistics/email');
        console.log('   SMTP Logs: https://app.brevo.com/senders/logs\n');
    })
    .catch(error => {
        console.error('❌ ERRO AO ENVIAR EMAIL:\n');
        console.error(`   Mensagem: ${error.message}`);
        
        if (error.code === 'EAUTH') {
            console.error('\n🔧 SOLUÇÃO:');
            console.error('   1. Verifica SMTP_USER no .env (deve ser: 8b688f001@smtp-brevo.com)');
            console.error('   2. Verifica SMTP_PASS no .env (API Key do Brevo)');
            console.error('   3. Confirma que API Key está ativa no Dashboard Brevo');
        } else if (error.code === 'ECONNECTION') {
            console.error('\n🔧 SOLUÇÃO:');
            console.error('   1. Verifica conexão à internet');
            console.error('   2. Confirma SMTP_HOST: smtp-relay.brevo.com');
            console.error('   3. Confirma SMTP_PORT: 587');
        } else {
            console.error('\n📖 Detalhes completos do erro:');
            console.error(error);
        }
        
        process.exit(1);
    });
