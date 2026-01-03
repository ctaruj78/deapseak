#!/usr/bin/env node
/**
 * Test Contact Form Email Sending
 * Перевірка відправки email через /api/contact
 */

const http = require('http');

const testData = {
    name: 'Test User',
    email: 'test@example.com',
    phone: '+351 912 345 678',
    message: 'This is a test message from contact form. Testing Brevo SMTP integration.'
};

const postData = JSON.stringify(testData);

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/contact',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('📧 Testing Contact Form Email...');
console.log('📤 Sending to:', 'info@festlift.pt');
console.log('👤 From:', testData.email);
console.log('');

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('📬 Response Status:', res.statusCode);
        console.log('📄 Response Body:', data);
        
        try {
            const response = JSON.parse(data);
            if (response.success) {
                console.log('\n✅ SUCCESS! Email sent successfully!');
                console.log('📨 Check inbox: info@festlift.pt');
            } else {
                console.log('\n❌ FAILED:', response.message);
            }
        } catch (e) {
            console.log('\n❌ Error parsing response:', e.message);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
});

req.write(postData);
req.end();
