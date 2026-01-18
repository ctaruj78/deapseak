#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// 🏷️ АВТОМАТИЧНА ГЕНЕРАЦІЯ QR КОДІВ ДЛЯ ІСНУЮЧИХ ЛІФТІВ
// ═══════════════════════════════════════════════════════════
// Скрипт для додавання QR кодів до всіх ліфтів, які їх не мають

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'deapseak';

async function generateQRCodes() {
    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(DB_NAME);
    
    console.log('🔌 Підключено до MongoDB:', DB_NAME);
    
    try {
        // Знайти всі ліфти БЕЗ QR кодів
        const liftsWithoutQR = await db.collection('lifts').find({
            $or: [
                { 'qrCode.code': { $exists: false } },
                { 'qrCode.code': null },
                { 'qrCode.code': '' }
            ]
        }).toArray();
        
        console.log(`\n📊 Знайдено ліфтів без QR кодів: ${liftsWithoutQR.length}`);
        
        if (liftsWithoutQR.length === 0) {
            console.log('✅ Всі ліфти вже мають QR коди!');
            await client.close();
            return;
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        // Генеруємо QR коди для кожного ліфта
        for (const lift of liftsWithoutQR) {
            try {
                // Генерація унікального QR коду
                let qrCode;
                
                if (lift.municipalNumber) {
                    // Якщо є муніципальний номер - використовуємо його
                    qrCode = `LIFT-${lift.municipalNumber.toUpperCase().replace(/\s+/g, '-').replace(/\//g, '-')}`;
                } else {
                    // Якщо немає - використовуємо ID
                    qrCode = `LIFT-${lift._id.toString().substring(0, 8).toUpperCase()}`;
                }
                
                // Перевірка унікальності QR коду
                const existingQR = await db.collection('lifts').findOne({
                    'qrCode.code': qrCode,
                    _id: { $ne: lift._id }
                });
                
                if (existingQR) {
                    // Якщо такий код вже є - додаємо timestamp
                    qrCode = `${qrCode}-${Date.now().toString(36).toUpperCase()}`;
                }
                
                // Оновлюємо ліфт з QR кодом
                const result = await db.collection('lifts').updateOne(
                    { _id: lift._id },
                    {
                        $set: {
                            'qrCode.code': qrCode,
                            'qrCode.generatedAt': new Date(),
                            'qrCode.accessLevel': 'client'
                        }
                    }
                );
                
                if (result.modifiedCount > 0) {
                    successCount++;
                    console.log(`✅ ${successCount}/${liftsWithoutQR.length}: ${lift.municipalNumber || lift._id} → ${qrCode}`);
                } else {
                    errorCount++;
                    console.error(`❌ Не вдалося оновити ліфт: ${lift.municipalNumber || lift._id}`);
                }
                
            } catch (error) {
                errorCount++;
                console.error(`❌ Помилка для ліфта ${lift.municipalNumber || lift._id}:`, error.message);
            }
        }
        
        console.log(`\n📊 Результати генерації QR кодів:`);
        console.log(`   ✅ Успішно: ${successCount}`);
        console.log(`   ❌ Помилки: ${errorCount}`);
        console.log(`   📦 Всього оброблено: ${liftsWithoutQR.length}`);
        
        // Перевірка: підрахувати всі ліфти з QR кодами
        const totalLifts = await db.collection('lifts').countDocuments({});
        const liftsWithQR = await db.collection('lifts').countDocuments({
            'qrCode.code': { $exists: true, $ne: null, $ne: '' }
        });
        
        console.log(`\n🎯 Фінальна статистика:`);
        console.log(`   📦 Всього ліфтів: ${totalLifts}`);
        console.log(`   🏷️ З QR кодами: ${liftsWithQR}`);
        console.log(`   ❓ Без QR кодів: ${totalLifts - liftsWithQR}`);
        
        if (liftsWithQR === totalLifts) {
            console.log('\n✅ ВСІ ЛІФТИ ТЕПЕР МАЮТЬ QR КОДИ! 🎉\n');
        }
        
    } catch (error) {
        console.error('❌ Критична помилка:', error);
        throw error;
    } finally {
        await client.close();
        console.log('🔌 З\'єднання з MongoDB закрито');
    }
}

// Запуск скрипта
if (require.main === module) {
    generateQRCodes()
        .then(() => {
            console.log('\n✅ Скрипт завершено успішно');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Скрипт завершено з помилкою:', error);
            process.exit(1);
        });
}

module.exports = { generateQRCodes };
