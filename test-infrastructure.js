const { MongoClient } = require('mongodb');

async function testInfrastructure() {
    console.log('🔍 ЕТАП 1: Тестування інфраструктури\n');
    
    // 1. MongoDB
    console.log('📊 MongoDB Connection:');
    try {
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        const db = client.db('deapseak');
        
        const collections = await db.listCollections().toArray();
        console.log('✅ MongoDB підключено');
        console.log(`📁 Колекцій: ${collections.length}`);
        
        // Підрахунок даних
        const stats = {};
        for (const coll of collections) {
            const count = await db.collection(coll.name).countDocuments();
            stats[coll.name] = count;
        }
        
        console.log('\n📊 Статистика даних:');
        for (const [name, count] of Object.entries(stats)) {
            console.log(`  ${name}: ${count} документів`);
        }
        
        await client.close();
    } catch (error) {
        console.error('❌ MongoDB помилка:', error.message);
        return false;
    }
    
    // 2. Unified Server
    console.log('\n🌐 Unified Server Status:');
    try {
        const response = await fetch('http://localhost:5000/api/health');
        if (response.ok) {
            console.log('✅ Server працює на порту 5000');
        } else {
            console.log('⚠️ Server відповідає але з помилкою:', response.status);
        }
    } catch (error) {
        console.error('❌ Server недоступний:', error.message);
        return false;
    }
    
    // 3. Логи
    console.log('\n📜 Перевірка логів:');
    const { execSync } = require('child_process');
    try {
        const errors = execSync('tail -100 logs/unified-server.log 2>/dev/null | grep -i "error\\|critical\\|fatal" | wc -l').toString().trim();
        console.log(`⚠️ Помилок в останніх 100 рядках логу: ${errors}`);
        
        if (parseInt(errors) > 0) {
            console.log('\n🔍 Останні помилки:');
            const lastErrors = execSync('tail -100 logs/unified-server.log 2>/dev/null | grep -i "error" | tail -5').toString();
            console.log(lastErrors || '  (деталі недоступні)');
        }
    } catch (error) {
        console.log('⚠️ Не вдалося прочитати логи');
    }
    
    console.log('\n✅ ЕТАП 1 ЗАВЕРШЕНО\n');
    return true;
}

testInfrastructure().then(() => process.exit(0)).catch(err => {
    console.error('❌ Критична помилка:', err);
    process.exit(1);
});
