#!/usr/bin/env node

/**
 * 🇵🇹 Скрипт для створення тестових португальських ліфтів
 * Використовує реальні адреси в Лісабоні, Порту, Брага
 */

const MongoClient = require('mongodb').MongoClient;

const portugueseLifts = [
    {
        municipalNumber: 'CML-001/2024',
        address: {
            street: 'Rua Augusta 123',
            city: 'Lisboa',
            postalCode: '1100-053',
            country: 'Portugal'
        },
        city: 'Lisboa',
        country: 'Portugal',
        manufacturer: 'Schindler',
        model: '3300',
        capacity: 630,
        speed: 1.0,
        floors: 8,
        type: 'passenger',
        status: 'active',
        installationDate: new Date('2020-03-15'),
        lastInspection: new Date('2025-12-01'),
        nextInspection: new Date('2026-12-01')
    },
    {
        municipalNumber: 'CML-002/2024',
        address: {
            street: 'Av. da Liberdade 250',
            city: 'Lisboa',
            postalCode: '1250-096',
            country: 'Portugal'
        },
        city: 'Lisboa',
        country: 'Portugal',
        manufacturer: 'Otis',
        model: 'Gen2',
        capacity: 800,
        speed: 1.5,
        floors: 12,
        type: 'passenger',
        status: 'active',
        installationDate: new Date('2019-06-20'),
        lastInspection: new Date('2025-11-15'),
        nextInspection: new Date('2026-11-15')
    },
    {
        municipalNumber: 'CMP-001/2024',
        address: {
            street: 'Rua de Santa Catarina 500',
            city: 'Porto',
            postalCode: '4000-450',
            country: 'Portugal'
        },
        city: 'Porto',
        country: 'Portugal',
        manufacturer: 'Kone',
        model: 'MonoSpace',
        capacity: 630,
        speed: 1.0,
        floors: 6,
        type: 'passenger',
        status: 'active',
        installationDate: new Date('2021-01-10'),
        lastInspection: new Date('2025-10-20'),
        nextInspection: new Date('2026-10-20')
    },
    {
        municipalNumber: 'CMB-001/2024',
        address: {
            street: 'Praça da República 45',
            city: 'Braga',
            postalCode: '4710-305',
            country: 'Portugal'
        },
        city: 'Braga',
        country: 'Portugal',
        manufacturer: 'ThyssenKrupp',
        model: 'Evolution',
        capacity: 1000,
        speed: 2.0,
        floors: 15,
        type: 'passenger',
        status: 'active',
        installationDate: new Date('2018-09-05'),
        lastInspection: new Date('2025-09-30'),
        nextInspection: new Date('2026-09-30')
    },
    {
        municipalNumber: 'CML-003/2024',
        address: {
            street: 'Rua do Ouro 88',
            city: 'Lisboa',
            postalCode: '1100-063',
            country: 'Portugal'
        },
        city: 'Lisboa',
        country: 'Portugal',
        manufacturer: 'Schindler',
        model: '5500',
        capacity: 1600,
        speed: 1.75,
        floors: 10,
        type: 'freight',
        status: 'maintenance',
        installationDate: new Date('2017-11-22'),
        lastInspection: new Date('2025-08-10'),
        nextInspection: new Date('2026-08-10')
    }
];

async function createPortugueseLifts(clientEmail) {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('deapseak');
    
    try {
        console.log('🇵🇹 Створення тестових португальських ліфтів...\n');
        
        // Знайти клієнта
        const user = await db.collection('users').findOne({ email: clientEmail });
        if (!user) {
            console.error(`❌ Клієнт ${clientEmail} не знайдений`);
            process.exit(1);
        }
        
        console.log(`👤 Клієнт: ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`🆔 ID: ${user._id}\n`);
        
        // Видалити старі тестові ліфти (опціонально)
        const deleteResult = await db.collection('lifts').deleteMany({ 
            client: user._id.toString(),
            municipalNumber: { $regex: /^(CML|CMP|CMB)-\d{3}\/2024$/ }
        });
        console.log(`🗑️  Видалено старих тестових ліфтів: ${deleteResult.deletedCount}\n`);
        
        // Створити нові
        let created = 0;
        for (const lift of portugueseLifts) {
            lift.client = user._id.toString();
            lift.createdAt = new Date();
            lift.updatedAt = new Date();
            
            const result = await db.collection('lifts').insertOne(lift);
            console.log(`✅ Створено: ${lift.municipalNumber} - ${lift.address.street}, ${lift.city}`);
            created++;
        }
        
        console.log(`\n🎉 Успішно створено ${created} португальських ліфтів!`);
        
        // Статистика
        const totalLifts = await db.collection('lifts').countDocuments({ client: user._id.toString() });
        console.log(`📊 Загальна кількість ліфтів клієнта: ${totalLifts}`);
        
        const byCity = await db.collection('lifts').aggregate([
            { $match: { client: user._id.toString() } },
            { $group: { _id: '$city', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();
        
        console.log('\n🏙️  По містах:');
        byCity.forEach(c => console.log(`   ${c._id}: ${c.count} ліфтів`));
        
    } catch (error) {
        console.error('❌ Помилка:', error.message);
        throw error;
    } finally {
        await client.close();
    }
}

// Використання
const clientEmail = process.argv[2] || 'client@festlift.pt';
createPortugueseLifts(clientEmail).catch(console.error);
