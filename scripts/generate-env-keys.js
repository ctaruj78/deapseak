#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// logger.log('🔐 Генеруємо безпечні ключі для .env...\n');

const jwtSecret = crypto.randomBytes(64).toString('hex');
const refreshSecret = crypto.randomBytes(64).toString('hex');
const apiKey = crypto.randomBytes(32).toString('hex');
const qrKey = crypto.randomBytes(32).toString('hex');
const notifyKey = crypto.randomBytes(32).toString('hex');

// logger.log('✅ Генеровані ключі:\n');
// logger.log(`JWT_SECRET=${jwtSecret}`);
// logger.log(`REFRESH_TOKEN_SECRET=${refreshSecret}`);
// logger.log(`API_KEY=${apiKey}`);
// logger.log(`QR_SERVICE_API_KEY=${qrKey}`);
// logger.log(`NOTIFICATION_SERVICE_KEY=${notifyKey}`);

// logger.log('\n📋 Оновлюю .env файл...');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent = envContent.replace(
        /JWT_SECRET=.*/,
        `JWT_SECRET=${jwtSecret}`
    );
    envContent = envContent.replace(
        /REFRESH_TOKEN_SECRET=.*/,
        `REFRESH_TOKEN_SECRET=${refreshSecret}`
    );
    envContent = envContent.replace(
        /API_KEY=.*/,
        `API_KEY=${apiKey}`
    );
    envContent = envContent.replace(
        /QR_SERVICE_API_KEY=.*/,
        `QR_SERVICE_API_KEY=${qrKey}`
    );
    envContent = envContent.replace(
        /NOTIFICATION_SERVICE_KEY=.*/,
        `NOTIFICATION_SERVICE_KEY=${notifyKey}`
    );
    
    fs.writeFileSync(envPath, envContent);
    // logger.log('✅ .env файл успішно оновлено!');
} else {
    // logger.error('❌ .env файл не знайдено!');
    process.exit(1);
}

// logger.log('\n✨ Готово!\n');