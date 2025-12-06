const { MongoClient } = require('mongodb');

async function fixUsersData() {
    const client = new MongoClient('mongodb://localhost:27017');
    
    try {
        await client.connect();
        console.log('✅ Підключено до MongoDB');
        
        const db = client.db('deapseak');
        const users = await db.collection('users').find({}).toArray();
        
        console.log(`📊 Знайдено користувачів: ${users.length}\n`);
        
        for (const user of users) {
            const updates = {};
            let needsUpdate = false;
            
            // Додаємо firstName/lastName якщо відсутні
            if (!user.firstName) {
                const emailPart = user.email.split('@')[0];
                updates.firstName = emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
                needsUpdate = true;
            }
            
            if (!user.lastName) {
                updates.lastName = 'User';
                needsUpdate = true;
            }
            
            // Додаємо status якщо відсутній
            if (!user.status) {
                updates.status = 'active';
                needsUpdate = true;
            }
            
            if (needsUpdate) {
                await db.collection('users').updateOne(
                    { _id: user._id },
                    { $set: updates }
                );
                console.log(`✅ Оновлено ${user.email}:`, updates);
            } else {
                console.log(`✓ ${user.email} - всі поля є`);
            }
        }
        
        console.log('\n🎉 Оновлення завершено!');
        
    } catch (error) {
        console.error('❌ Помилка:', error);
    } finally {
        await client.close();
    }
}

fixUsersData();
