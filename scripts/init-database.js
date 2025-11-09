#!/usr/bin/env node

/**
 * MongoDB Database Initialization Script
 * Creates initial admin user and test data
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// Підключення моделей
const modelsPath = path.join(__dirname, '..', 'backend', 'models');
const { User, Lift, Request } = require(modelsPath);

// Кольорові виводи в консоль
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    reset: '\x1b[0m'
};

const log = (msg, color = 'reset') => console.log(`${colors[color]}${msg}${colors.reset}`);

async function initializeDatabase() {
    try {
        log('╔════════════════════════════════════════════════╗', 'blue');
        log('║       DeapSeaK v2 - Database Setup            ║', 'blue');
        log('╚════════════════════════════════════════════════╝', 'blue');
        log('');

        // Підключення до MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/deapseak';
        log(`📡 Connecting to MongoDB: ${mongoUri}`, 'yellow');
        
        await mongoose.connect(mongoUri);
        log('✅ MongoDB connected successfully!', 'green');
        log('');

        // Видалення існуючих даних (опціонально)
        log('🗑️  Clearing existing data...', 'yellow');
        await User.deleteMany({});
        await Lift.deleteMany({});
        await Request.deleteMany({});
        log('✅ Database cleared', 'green');
        log('');

        // Створення адміністратора
        log('👤 Creating admin user...', 'yellow');
        const admin = await User.create({
            username: 'ctaruj78',
            email: 'ctaruj78@gmail.com',
            password: 'Solomia1704fel!',
            firstName: 'Admin',
            lastName: 'DeapSeaK',
            role: 'admin',
            phone: '+380000000000'
        });
        log(`✅ Admin created: ${admin.username} (${admin.email})`, 'green');
        log('');

        // Створення диспетчера
        log('👤 Creating dispatcher...', 'yellow');
        const dispatcher = await User.create({
            username: 'dispatcher1',
            email: 'dispatcher@deapseak.com',
            password: 'dispatcher123',
            firstName: 'Марія',
            lastName: 'Коваленко',
            role: 'dispatcher',
            phone: '+380501234567'
        });
        log(`✅ Dispatcher created: ${dispatcher.username}`, 'green');
        log('');

        // Створення техніків
        log('👤 Creating technicians...', 'yellow');
        const technician1 = await User.create({
            username: 'technician1',
            email: 'tech1@deapseak.com',
            password: 'tech123',
            firstName: 'Олександр',
            lastName: 'Петренко',
            role: 'technician',
            phone: '+380671234567'
        });

        const technician2 = await User.create({
            username: 'technician2',
            email: 'tech2@deapseak.com',
            password: 'tech123',
            firstName: 'Іван',
            lastName: 'Шевченко',
            role: 'technician',
            phone: '+380991234567'
        });
        log(`✅ Technicians created: ${technician1.username}, ${technician2.username}`, 'green');
        log('');

        // Створення клієнтів
        log('👤 Creating clients...', 'yellow');
        const client1 = await User.create({
            username: 'client1',
            email: 'client1@example.com',
            password: 'client123',
            firstName: 'Оксана',
            lastName: 'Мельник',
            role: 'client',
            phone: '+380631234567'
        });

        const client2 = await User.create({
            username: 'client2',
            email: 'client2@example.com',
            password: 'client123',
            firstName: 'Андрій',
            lastName: 'Бондаренко',
            role: 'client',
            phone: '+380931234567'
        });
        log(`✅ Clients created: ${client1.username}, ${client2.username}`, 'green');
        log('');

        // Створення ліфтів
        log('🏢 Creating lifts...', 'yellow');
        const lift1 = await Lift.create({
            municipalNumber: 'LIFT-001-KV',
            address: {
                street: 'вул. Хрещатик, 1',
                city: 'Київ',
                zipCode: '01001',
                country: 'Україна'
            },
            location: {
                type: 'Point',
                coordinates: [30.5234, 50.4501] // [longitude, latitude]
            },
            client: client1._id,
            technician: technician1._id,
            manufacturer: 'Otis',
            model: 'Gen2',
            capacity: 630,
            floors: 12,
            installationDate: new Date('2020-01-15'),
            lastInspectionDate: new Date('2025-10-01'),
            nextInspectionDate: new Date('2026-04-01'),
            status: 'operational',
            qrCode: {
                code: 'QR-LIFT-001',
                accessLevel: 'technician'
            }
        });

        const lift2 = await Lift.create({
            municipalNumber: 'LIFT-002-KV',
            address: {
                street: 'вул. Шевченка, 25',
                city: 'Київ',
                zipCode: '01004',
                country: 'Україна'
            },
            location: {
                type: 'Point',
                coordinates: [30.5167, 50.4547]
            },
            client: client2._id,
            technician: technician2._id,
            manufacturer: 'Schindler',
            model: '3300',
            capacity: 450,
            floors: 9,
            installationDate: new Date('2019-05-20'),
            lastInspectionDate: new Date('2025-09-15'),
            nextInspectionDate: new Date('2026-03-15'),
            status: 'operational',
            qrCode: {
                code: 'QR-LIFT-002',
                accessLevel: 'technician'
            }
        });

        const lift3 = await Lift.create({
            municipalNumber: 'LIFT-003-KV',
            address: {
                street: 'проспект Перемоги, 50',
                city: 'Київ',
                zipCode: '01135',
                country: 'Україна'
            },
            location: {
                type: 'Point',
                coordinates: [30.4512, 50.4501]
            },
            client: client1._id,
            technician: technician1._id,
            manufacturer: 'KONE',
            model: 'MonoSpace',
            capacity: 1000,
            floors: 16,
            installationDate: new Date('2021-03-10'),
            lastInspectionDate: new Date('2025-08-20'),
            nextInspectionDate: new Date('2025-11-20'), // Потребує обслуговування
            status: 'maintenance',
            qrCode: {
                code: 'QR-LIFT-003',
                accessLevel: 'client'
            }
        });

        log(`✅ Lifts created: ${lift1.municipalNumber}, ${lift2.municipalNumber}, ${lift3.municipalNumber}`, 'green');
        log('');

        // Створення запитів
        log('📝 Creating requests...', 'yellow');
        const request1 = await Request.create({
            lift: lift3._id,
            client: client1._id,
            title: 'Ліфт не відкриває двері на 5-му поверсі',
            description: 'Двері ліфта застрягають і не відкриваються повністю на 5-му поверсі. Потрібна термінова перевірка.',
            priority: 'high',
            status: 'new',
            photosBefore: []
        });

        const request2 = await Request.create({
            lift: lift1._id,
            client: client1._id,
            assignedTo: technician1._id,
            title: 'Планове технічне обслуговування',
            description: 'Планове ТО згідно графіку обслуговування.',
            priority: 'medium',
            status: 'assigned',
            photosBefore: []
        });

        const request3 = await Request.create({
            lift: lift2._id,
            client: client2._id,
            assignedTo: technician2._id,
            title: 'Дивні звуки при русі ліфта',
            description: 'Під час руху ліфта вгору чути скрипучі звуки. Просимо перевірити.',
            priority: 'medium',
            status: 'in_progress',
            photosBefore: [],
            workDescription: 'Перевіряю тросову систему...'
        });

        log(`✅ Requests created: 3 service requests`, 'green');
        log('');

        // Виведення облікових даних
        log('╔════════════════════════════════════════════════╗', 'blue');
        log('║         Created User Accounts                  ║', 'blue');
        log('╚════════════════════════════════════════════════╝', 'blue');
        log('');
        log('👑 ADMIN:', 'green');
        log(`   Username: ctaruj78`, 'yellow');
        log(`   Email: ctaruj78@gmail.com`, 'yellow');
        log(`   Password: Solomia1704fel!`, 'yellow');
        log('');
        log('📋 DISPATCHER:', 'green');
        log(`   Username: dispatcher1`, 'yellow');
        log(`   Email: dispatcher@deapseak.com`, 'yellow');
        log(`   Password: dispatcher123`, 'yellow');
        log('');
        log('🔧 TECHNICIANS:', 'green');
        log(`   Username: technician1 / Email: tech1@deapseak.com / Password: tech123`, 'yellow');
        log(`   Username: technician2 / Email: tech2@deapseak.com / Password: tech123`, 'yellow');
        log('');
        log('👥 CLIENTS:', 'green');
        log(`   Username: client1 / Email: client1@example.com / Password: client123`, 'yellow');
        log(`   Username: client2 / Email: client2@example.com / Password: client123`, 'yellow');
        log('');
        log('╔════════════════════════════════════════════════╗', 'blue');
        log('║              Database Summary                  ║', 'blue');
        log('╚════════════════════════════════════════════════╝', 'blue');
        log(`   Users: ${await User.countDocuments()}`, 'yellow');
        log(`   Lifts: ${await Lift.countDocuments()}`, 'yellow');
        log(`   Requests: ${await Request.countDocuments()}`, 'yellow');
        log('');
        log('✅ Database initialized successfully!', 'green');
        log('');
        log('🚀 You can now start the backend server:', 'blue');
        log('   node backend/app.js', 'yellow');
        log('   OR', 'yellow');
        log('   ./start-v2-backend.sh', 'yellow');

    } catch (error) {
        log(`❌ Error: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        log('');
        log('🔌 MongoDB connection closed', 'blue');
    }
}

// Запуск
initializeDatabase();
