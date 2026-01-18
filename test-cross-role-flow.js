const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'deapseak_secret_key_2024';
const BASE_URL = 'http://localhost:5000';
const DB_URL = 'mongodb://localhost:27017';

async function testCrossRoleFlow() {
    console.log('🔍 ЕТАП 3: Cross-Role Integration Testing\n');
    console.log('📊 Тестуємо повний цикл роботи між ролями:\n');
    console.log('   Client створює request →');
    console.log('   Dispatcher бачить + призначає Tech →');
    console.log('   Tech бачить + виконує →');
    console.log('   Admin бачить результат\n');
    
    const client = new MongoClient(DB_URL);
    await client.connect();
    const db = client.db('deapseak');
    
    // Отримати реальні ID користувачів
    const clientUser = await db.collection('users').findOne({ email: 'client@festlift.pt' });
    const dispatcherUser = await db.collection('users').findOne({ email: 'dispatcher@festlift.pt' });
    const techUser = await db.collection('users').findOne({ email: 'tech1@festlift.pt' });
    const adminUser = await db.collection('users').findOne({ email: 'info@festlift.pt' });
    
    if (!clientUser || !dispatcherUser || !techUser || !adminUser) {
        console.error('❌ Не знайдено користувачів в базі!');
        await client.close();
        return;
    }
    
    // Отримати перший ліфт клієнта
    const lift = await db.collection('lifts').findOne({ client: clientUser._id.toString() });
    if (!lift) {
        console.error('❌ Клієнт не має ліфтів!');
        await client.close();
        return;
    }
    
    console.log('👥 Учасники тесту:');
    console.log(`   👤 Client: ${clientUser.email}`);
    console.log(`   📞 Dispatcher: ${dispatcherUser.email}`);
    console.log(`   🔧 Tech: ${techUser.email}`);
    console.log(`   👨‍💼 Admin: ${adminUser.email}`);
    console.log(`   🏢 Lift: ${lift.name} (${lift.location})\n`);
    
    // Токени
    const clientToken = jwt.sign({ 
        userId: clientUser._id.toString(), 
        username: clientUser.name, 
        role: 'client', 
        email: clientUser.email 
    }, JWT_SECRET, { expiresIn: '1h' });
    
    const dispatcherToken = jwt.sign({ 
        userId: dispatcherUser._id.toString(), 
        username: dispatcherUser.name, 
        role: 'dispatcher', 
        email: dispatcherUser.email 
    }, JWT_SECRET, { expiresIn: '1h' });
    
    const techToken = jwt.sign({ 
        userId: techUser._id.toString(), 
        username: techUser.name, 
        role: 'tech', 
        email: techUser.email 
    }, JWT_SECRET, { expiresIn: '1h' });
    
    const adminToken = jwt.sign({ 
        userId: adminUser._id.toString(), 
        username: adminUser.name, 
        role: 'admin', 
        email: adminUser.email 
    }, JWT_SECRET, { expiresIn: '1h' });
    
    // === КРОК 1: Client створює request ===
    console.log('📝 КРОК 1: Client створює request...');
    const newRequest = {
        liftId: lift._id.toString(),
        title: `TEST: Проблема з ліфтом ${new Date().toISOString()}`,
        description: 'Тестовий запит для перевірки системи',
        priority: 'medium',
        clientId: clientUser._id.toString(),
        clientEmail: clientUser.email,
        clientName: clientUser.name,
        location: lift.location,
        status: 'pending'
    };
    
    try {
        const response = await fetch(`${BASE_URL}/api/requests`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${clientToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newRequest)
        });
        
        if (response.ok) {
            const data = await response.json();
            const requestId = data.data?._id || data.requestId;
            console.log(`✅ Request створено: ID ${requestId}`);
            
            // === КРОК 2: Dispatcher бачить request ===
            console.log('\n📋 КРОК 2: Dispatcher перевіряє нові requests...');
            const dispatcherResponse = await fetch(`${BASE_URL}/api/requests?status=pending`, {
                headers: { 'Authorization': `Bearer ${dispatcherToken}` }
            });
            
            if (dispatcherResponse.ok) {
                const dispData = await dispatcherResponse.json();
                const requests = dispData.data || dispData;
                const foundRequest = Array.isArray(requests) ? 
                    requests.find(r => r._id === requestId) : null;
                
                if (foundRequest) {
                    console.log(`✅ Dispatcher бачить request: "${foundRequest.title}"`);
                } else {
                    console.log(`⚠️ Dispatcher НЕ бачить request (всього pending: ${requests.length})`);
                }
            } else {
                console.log(`❌ Dispatcher не може отримати requests: ${dispatcherResponse.status}`);
            }
            
            // === КРОК 3: Tech перевіряє свої tasks ===
            console.log('\n🔧 КРОК 3: Tech перевіряє свої завдання...');
            const techResponse = await fetch(`${BASE_URL}/api/requests`, {
                headers: { 'Authorization': `Bearer ${techToken}` }
            });
            
            if (techResponse.ok) {
                const techData = await techResponse.json();
                const techRequests = techData.data || techData;
                console.log(`✅ Tech має доступ до ${Array.isArray(techRequests) ? techRequests.length : 0} requests`);
            } else {
                console.log(`❌ Tech не може отримати requests: ${techResponse.status}`);
            }
            
            // === КРОК 4: Admin бачить всі requests ===
            console.log('\n��‍💼 КРОК 4: Admin перевіряє всю систему...');
            const adminResponse = await fetch(`${BASE_URL}/api/requests`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            
            if (adminResponse.ok) {
                const adminData = await adminResponse.json();
                const allRequests = adminData.data || adminData;
                console.log(`✅ Admin бачить ${Array.isArray(allRequests) ? allRequests.length : 0} requests в системі`);
                
                const testRequest = Array.isArray(allRequests) ? 
                    allRequests.find(r => r._id === requestId) : null;
                    
                if (testRequest) {
                    console.log(`✅ Тестовий request присутній в системі`);
                } else {
                    console.log(`⚠️ Тестовий request НЕ знайдено в загальному списку`);
                }
            } else {
                console.log(`❌ Admin не може отримати requests: ${adminResponse.status}`);
            }
            
            // === CLEANUP: Видалити тестовий request ===
            console.log('\n🧹 CLEANUP: Видалення тестового request...');
            await db.collection('requests').deleteOne({ _id: new ObjectId(requestId) });
            console.log('✅ Тестовий request видалено\n');
            
        } else {
            console.log(`❌ Не вдалося створити request: ${response.status}`);
            const text = await response.text();
            console.log(`   └─ ${text.substring(0, 200)}`);
        }
    } catch (error) {
        console.error('❌ Помилка тестування:', error.message);
    }
    
    await client.close();
    console.log('✅ ЕТАП 3 ЗАВЕРШЕНО\n');
}

testCrossRoleFlow().then(() => process.exit(0)).catch(err => {
    console.error('❌ Критична помилка:', err);
    process.exit(1);
});
