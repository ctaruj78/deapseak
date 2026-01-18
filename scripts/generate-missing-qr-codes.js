#!/usr/bin/env node

/**
 * 🔧 Генерація QR кодів для існуючих ліфтів
 * 
 * Цей скрипт:
 * 1. Знаходить всі ліфти БЕЗ QR кодів
 * 2. Генерує унікальні QR коди на основі municipalNumber
 * 3. Оновлює записи в MongoDB
 */

const { MongoClient } = require('mongodb');

// Конфігурація MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'deapseak';

/**
 * Генерує QR код на основі муніципального номера
 * @param {string} municipalNumber - Муніципальний номер ліфта
 * @returns {string} - QR код у форматі LIFT-XXX-XXX
 */
function generateQRCode(municipalNumber) {
    if (!municipalNumber || municipalNumber.trim() === '') {
        // Якщо немає номера - генеруємо унікальний ID
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 7);
        return `LIFT-UNKNOWN-${timestamp}-${random}`.toUpperCase();
    }
    
    // Очищаємо номер від пробілів та спецсимволів
    const cleanNumber = municipalNumber
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9-]/g, '')
        .toUpperCase();
    
    return `LIFT-${cleanNumber}`;
}

/**
 * Головна функція
 */
async function generateMissingQRCodes() {
    const client = new MongoClient(MONGO_URI);
    
    try {
        console.log('🔌 Підключення до MongoDB...');
        await client.connect();
        console.log('✅ Підключено до MongoDB');
        
        const db = client.db(DB_NAME);
        const liftsCollection = db.collection('lifts');
        
        // Знаходимо всі ліфти без QR кодів
        console.log('\n🔍 Пошук ліфтів без QR кодів...');
        const liftsWithoutQR = await liftsCollection.find({
            $or: [
                { qrCode: null },
                { qrCode: { $exists: false } },
                { qrCode: '' }
            ]
        }).toArray();
        
        console.log(`📊 Знайдено ліфтів без QR: ${liftsWithoutQR.length}`);
        
        if (liftsWithoutQR.length === 0) {
            console.log('✅ Всі ліфти вже мають QR коди!');
            return;
        }
        
        // Генеруємо та оновлюємо QR коди
        console.log('\n🔧 Генерація QR кодів...\n');
        let successCount = 0;
        let errorCount = 0;
        
        for (const lift of liftsWithoutQR) {
            try {
                const qrCode = generateQRCode(lift.municipalNumber);
                
                // Перевіряємо чи не існує вже такий QR код
                const existingLift = await liftsCollection.findOne({ 
                    qrCode: qrCode,
                    _id: { $ne: lift._id }
                });
                
                let finalQRCode = qrCode;
                if (existingLift) {
                    // Якщо QR вже існує - додаємо унікальний суфікс
                    const timestamp = Date.now().toString(36);
                    finalQRCode = `${qrCode}-${timestamp}`.toUpperCase();
                    console.log(`⚠️  QR код ${qrCode} вже існує, використано ${finalQRCode}`);
                }
                
                // Оновлюємо ліфт
                const result = await liftsCollection.updateOne(
                    { _id: lift._id },
                    { 
                        $set: { 
                            qrCode: finalQRCode,
                            updatedAt: new Date()
                        } 
                    }
                );
                
                if (result.modifiedCount > 0) {
                    console.log(`✅ Ліфт "${lift.municipalNumber || lift._id}" → QR: ${finalQRCode}`);
                    successCount++;
                } else {
                    console.error(`❌ Не вдалося оновити ліфт "${lift.municipalNumber || lift._id}"`);
                    errorCount++;
                }
                
            } catch (error) {
                console.error(`❌ Помилка при обробці ліфта ${lift._id}:`, error.message);
                errorCount++;
            }
        }
        
        // Підсумки
        console.log('\n' + '='.repeat(60));
        console.log('📊 РЕЗУЛЬТАТИ:');
        console.log('='.repeat(60));
        console.log(`✅ Успішно оновлено: ${successCount}`);
        console.log(`❌ Помилок: ${errorCount}`);
        console.log(`📝 Загалом оброблено: ${liftsWithoutQR.length}`);
        console.log('='.repeat(60));
        
        // Фінальна статистика
        const totalLifts = await liftsCollection.countDocuments({});
        const liftsWithQR = await liftsCollection.countDocuments({
            qrCode: { $exists: true, $ne: null, $ne: '' }
        });
        const liftsWithoutQRFinal = totalLifts - liftsWithQR;
        
        console.log('\n📊 ПОТОЧНА СТАТИСТИКА:');
        console.log(`   Всього ліфтів: ${totalLifts}`);
        console.log(`   З QR кодами: ${liftsWithQR}`);
        console.log(`   Без QR кодів: ${liftsWithoutQRFinal}`);
        
        if (liftsWithoutQRFinal === 0) {
            console.log('\n🎉 ВІТАЄМО! Всі ліфти тепер мають QR коди!');
        }
        
    } catch (error) {
        console.error('❌ Критична помилка:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('\n🔌 З\'єднання закрито');
    }
}

// Запуск
if (require.main === module) {
    console.log('🚀 Запуск генерації QR кодів для існуючих ліфтів...\n');
    generateMissingQRCodes()
        .then(() => {
            console.log('\n✅ Скрипт завершено успішно');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Скрипт завершено з помилкою:', error);
            process.exit(1);
        });
}

module.exports = { generateQRCode, generateMissingQRCodes };
