#!/bin/bash

# ============================================
# Створення Demo користувачів для DeapSeaK
# ============================================

echo "🔐 Створення demo користувачів..."

# Підключення до MongoDB
mongosh --quiet deapseak << 'EOF'

// Очистити стару колекцію
db.users.deleteMany({});

// Hash паролів (bcrypt hash для "admin123", "dispatcher123", "tech123", "client123")
// admin123 - $2b$10$rZXvL8F5P5YQ5X5X5X5X5eO5X5X5X5X5X5X5X5X5X5X5X5X5X5
// Для простоти demo - використаємо plaintext, unified-server сам хешує

const users = [
    {
        email: 'admin@deapseak.com',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        fullName: 'Адміністратор Системи',
        phone: '+351 912 345 678',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        email: 'dispatcher@deapseak.com',
        username: 'dispatcher',
        password: 'dispatcher123',
        role: 'dispatcher',
        fullName: 'Диспетчер Головний',
        phone: '+351 912 345 679',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        email: 'tech@deapseak.com',
        username: 'tech',
        password: 'tech123',
        role: 'tech',
        fullName: 'Технік Основний',
        phone: '+351 912 345 680',
        specialty: 'Загальне обслуговування',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        email: 'tech1@deapseak.com',
        username: 'tech1',
        password: 'tech123',
        role: 'tech',
        fullName: 'Технік 1',
        phone: '+351 912 345 681',
        specialty: 'Електрика',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        email: 'tech2@deapseak.com',
        username: 'tech2',
        password: 'tech123',
        role: 'tech',
        fullName: 'Технік 2',
        phone: '+351 912 345 682',
        specialty: 'Механіка',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        email: 'client@deapseak.com',
        username: 'client',
        password: 'client123',
        role: 'client',
        fullName: 'Клієнт Тестовий',
        phone: '+351 912 345 683',
        company: 'Test Company Lda',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

// Вставка користувачів БЕЗ хешування - unified-server сам хешує при логіні
// Замість цього, використаємо bcrypt для створення хешів

const bcrypt = require('bcrypt');

async function createUsers() {
    const hashedUsers = [];
    
    for (const user of users) {
        // Хешуємо пароль
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);
        
        hashedUsers.push({
            ...user,
            password: hashedPassword
        });
    }
    
    // Вставка в БД
    const result = await db.users.insertMany(hashedUsers);
    print('✅ Створено користувачів:', result.insertedCount);
    
    // Показати список
    print('\n📋 Список користувачів:');
    const allUsers = await db.users.find({}, { password: 0 }).toArray();
    allUsers.forEach(u => {
        print(`  ${u.role.padEnd(12)} - ${u.email.padEnd(30)} - ${u.fullName}`);
    });
}

createUsers().catch(err => {
    print('❌ Помилка:', err);
});

EOF

echo ""
echo "✅ Demo користувачі створені!"
echo ""
echo "📋 Credentials:"
echo "   Admin:      admin@deapseak.com / admin123"
echo "   Dispatcher: dispatcher@deapseak.com / dispatcher123"
echo "   Technician: tech@deapseak.com / tech123"
echo "   Client:     client@deapseak.com / client123"
echo ""
