const { MongoClient } = require('mongodb');

async function checkAdmin() {
  const client = new MongoClient('mongodb://localhost:27017');
  try {
    await client.connect();
    const db = client.db('deapseak');
    const admin = await db.collection('users').findOne({ username: 'admin' });
    if (admin) {
      // logger.log('✅ Admin user created successfully:');
      // logger.log('Email:', admin.email);
      // logger.log('Username:', admin.username);
      // logger.log('Role:', admin.role);
      // logger.log('Password hash exists:', !!admin.password);
    } else {
      // logger.log('❌ Admin user not found');
    }
  } catch (error) {
    // logger.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkAdmin();