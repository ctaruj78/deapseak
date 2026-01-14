require('dotenv').config();
const brevo = require('@getbrevo/brevo');

console.log('🔑 BREVO_API_KEY:', process.env.BREVO_API_KEY ? 'EXISTS' : 'NOT FOUND');
console.log('📧 EMAIL_FROM:', process.env.EMAIL_FROM);

// Parse EMAIL_FROM
let senderName = 'FestLift';
let senderEmail = 'info@festlift.pt';

if (process.env.EMAIL_FROM) {
    const fromMatch = process.env.EMAIL_FROM.match(/^(.+?)\s*<(.+?)>$/);
    if (fromMatch) {
        senderName = fromMatch[1].trim();
        senderEmail = fromMatch[2].trim();
    } else {
        senderEmail = process.env.EMAIL_FROM;
    }
}

console.log('👤 Parsed sender:', { name: senderName, email: senderEmail });

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
    brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY
);

const sendSmtpEmail = new brevo.SendSmtpEmail();
sendSmtpEmail.sender = { name: senderName, email: senderEmail };
sendSmtpEmail.to = [{ email: 'ctaruj78@gmail.com', name: 'Test User' }];
sendSmtpEmail.subject = 'Test Email from Orçamentos';
sendSmtpEmail.htmlContent = '<h1>Success!</h1><p>Email configuration is working correctly.</p>';

console.log('\n📤 Sending email...');
console.log('   From:', JSON.stringify(sendSmtpEmail.sender));
console.log('   To:', JSON.stringify(sendSmtpEmail.to));

apiInstance.sendTransacEmail(sendSmtpEmail).then(
    (data) => {
        console.log('\n✅ Email sent successfully!');
        console.log('   Message ID:', data.messageId);
    },
    (error) => {
        console.error('\n❌ Error sending email:');
        console.error('   Status:', error.status);
        console.error('   Message:', error.message);
        console.error('   Details:', error.response?.body || error);
    }
);
