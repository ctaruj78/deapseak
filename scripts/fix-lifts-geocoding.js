#!/usr/bin/env node

// ═══════════════════════════════════════════════════════════
// 🔧 СКРИПТ: Виправлення координат ліфтів через геокодування
// ═══════════════════════════════════════════════════════════
// Проблема: Координати ліфтів збережені як геолокація користувача
// Рішення: Геокодувати адреси через OpenStreetMap Nominatim
// ═══════════════════════════════════════════════════════════

const { MongoClient } = require('mongodb');
const https = require('https');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'deapseak';

// ═══════════════════════════════════════════════════════════
// 🌍 Функція геокодування адреси
// ═══════════════════════════════════════════════════════════
async function geocodeAddress(address) {
    return new Promise((resolve, reject) => {
        // Формуємо адресу для запиту
        let searchAddress = '';
        if (typeof address === 'string') {
            searchAddress = address;
        } else if (typeof address === 'object' && address !== null) {
            // Об'єкт адреси: {street, city, zipCode, country}
            const parts = [
                address.street,
                address.zipCode,
                address.city,
                address.country
            ].filter(Boolean);
            searchAddress = parts.join(', ');
        }
        
        if (!searchAddress) {
            console.warn('⚠️  Порожня адреса, пропускаю');
            return resolve(null);
        }
        
        // URL для Nominatim API
        const encodedAddress = encodeURIComponent(searchAddress);
        const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`;
        
        console.log(`   🔍 Geocoding: ${searchAddress}`);
        
        https.get(url, {
            headers: {
                'User-Agent': 'DeapSeaK-LiftManagement/2.0'
            }
        }, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    const results = JSON.parse(data);
                    
                    if (results && results.length > 0) {
                        const lat = parseFloat(results[0].lat);
                        const lon = parseFloat(results[0].lon);
                        
                        console.log(`   ✅ Знайдено: [${lon}, ${lat}]`);
                        
                        resolve({
                            type: 'Point',
                            coordinates: [lon, lat] // GeoJSON формат
                        });
                    } else {
                        console.warn(`   ⚠️  Адреса не знайдена`);
                        resolve(null);
                    }
                } catch (error) {
                    console.error('   ❌ Помилка парсингу:', error.message);
                    resolve(null);
                }
            });
        }).on('error', (error) => {
            console.error('   ❌ Помилка запиту:', error.message);
            resolve(null);
        });
    });
}

// ═══════════════════════════════════════════════════════════
// 📊 Головна функція
// ═══════════════════════════════════════════════════════════
async function fixLiftsGeocoding() {
    let client;
    
    try {
        console.log('🌍 Скрипт виправлення координат ліфтів');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        // Підключення до MongoDB
        console.log('📡 Підключення до MongoDB...');
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        console.log('✅ Підключено до MongoDB\n');
        
        // Отримуємо всі ліфти
        const lifts = await db.collection('lifts').find({}).toArray();
        console.log(`📋 Знайдено ліфтів: ${lifts.length}\n`);
        
        if (lifts.length === 0) {
            console.log('ℹ️  Немає ліфтів для обробки');
            return;
        }
        
        let updated = 0;
        let skipped = 0;
        let failed = 0;
        
        // Обробляємо кожен ліфт
        for (let i = 0; i < lifts.length; i++) {
            const lift = lifts[i];
            console.log(`\n[${i + 1}/${lifts.length}] Ліфт ID: ${lift._id}`);
            
            // Перевіряємо чи є адреса
            if (!lift.address) {
                console.log('   ⚠️  Немає адреси, пропускаю');
                skipped++;
                continue;
            }
            
            // Показуємо поточну адресу
            const addressStr = typeof lift.address === 'string' 
                ? lift.address 
                : [lift.address.street, lift.address.city].filter(Boolean).join(', ');
            console.log(`   📍 Адреса: ${addressStr}`);
            
            // Показуємо поточні координати (якщо є)
            if (lift.location && lift.location.coordinates) {
                const [lon, lat] = lift.location.coordinates;
                console.log(`   📌 Старі координати: [${lon}, ${lat}]`);
            } else {
                console.log('   ⚠️  Координат немає');
            }
            
            // Геокодуємо адресу
            const newLocation = await geocodeAddress(lift.address);
            
            if (newLocation) {
                // Оновлюємо координати в базі
                await db.collection('lifts').updateOne(
                    { _id: lift._id },
                    { 
                        $set: { 
                            location: newLocation,
                            updatedAt: new Date().toISOString(),
                            updatedBy: 'geocoding-script'
                        } 
                    }
                );
                console.log('   💾 Координати оновлено');
                updated++;
            } else {
                console.log('   ❌ Не вдалося геокодувати');
                failed++;
            }
            
            // Пауза між запитами (Nominatim вимагає max 1 req/sec)
            if (i < lifts.length - 1) {
                console.log('   ⏳ Пауза 1 сек...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // Фінальна статистика
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('📊 РЕЗУЛЬТАТИ:');
        console.log(`   ✅ Оновлено: ${updated}`);
        console.log(`   ⏭️  Пропущено (немає адреси): ${skipped}`);
        console.log(`   ❌ Помилки: ${failed}`);
        console.log(`   📋 Всього: ${lifts.length}`);
        console.log('═══════════════════════════════════════════════════════════\n');
        
        if (updated > 0) {
            console.log('✅ Координати успішно виправлено!');
            console.log('ℹ️  Тепер на карті має відображатися правильна відстань.\n');
        }
        
    } catch (error) {
        console.error('\n❌ КРИТИЧНА ПОМИЛКА:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('🔌 З\'єднання з MongoDB закрито');
        }
    }
}

// ═══════════════════════════════════════════════════════════
// 🚀 Запуск
// ═══════════════════════════════════════════════════════════
if (require.main === module) {
    fixLiftsGeocoding()
        .then(() => {
            console.log('\n✅ Скрипт завершено успішно');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Помилка виконання:', error);
            process.exit(1);
        });
}

module.exports = { fixLiftsGeocoding, geocodeAddress };
