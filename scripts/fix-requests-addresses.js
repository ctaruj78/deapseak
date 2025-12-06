const { MongoClient, ObjectId } = require('mongodb');

async function fixRequestsAddresses() {
    const client = new MongoClient('mongodb://localhost:27017');
    
    try {
        await client.connect();
        console.log('✅ Підключено до MongoDB');
        
        const db = client.db('deapseak');
        const requests = db.collection('requests');
        const lifts = db.collection('lifts');
        
        // Знаходимо всі заявки з "[object Object]" в адресі
        const brokenRequests = await requests.find({
            liftAddress: '[object Object]'
        }).toArray();
        
        console.log(`📋 Знайдено заявок з "[object Object]": ${brokenRequests.length}`);
        
        let fixed = 0;
        for (const request of brokenRequests) {
            if (!request.liftId) {
                console.log(`⚠️ Заявка ${request._id} не має liftId, пропускаємо`);
                continue;
            }
            
            // Знаходимо ліфт
            const lift = await lifts.findOne({ 
                _id: new ObjectId(request.liftId) 
            });
            
            if (!lift) {
                console.log(`⚠️ Ліфт ${request.liftId} не знайдено для заявки ${request._id}`);
                continue;
            }
            
            // Формуємо правильну адресу
            let addressText = 'Адреса невідома';
            if (typeof lift.address === 'object' && lift.address !== null) {
                const parts = [];
                if (lift.address.street) parts.push(lift.address.street);
                if (lift.address.city) parts.push(lift.address.city);
                addressText = parts.join(', ') || 'Адреса невідома';
            } else if (typeof lift.address === 'string') {
                addressText = lift.address;
            }
            
            // Оновлюємо заявку
            await requests.updateOne(
                { _id: request._id },
                { 
                    $set: { 
                        liftAddress: addressText,
                        liftMunicipalNumber: lift.municipalNumber || 'Невідомий'
                    } 
                }
            );
            
            console.log(`✅ Виправлено заявку ${request._id}: ${addressText}`);
            fixed++;
        }
        
        console.log(`\n🎉 Виправлено заявок: ${fixed}`);
        
    } catch (error) {
        console.error('❌ Помилка:', error);
    } finally {
        await client.close();
    }
}

fixRequestsAddresses();
