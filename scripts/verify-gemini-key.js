#!/usr/bin/env node

require('dotenv').config();

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey || geminiApiKey.trim().length === 0 || geminiApiKey.startsWith('your-')) {
    console.error('❌ GEMINI_API_KEY не налаштовано.');
    console.error('Додайте ключ у файл .env і повторіть запуск.');
    console.error('Приклад: GEMINI_API_KEY=...');
    process.exit(1);
}

console.log('✅ GEMINI_API_KEY знайдено. Запускаю сервер...');
