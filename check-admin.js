const { MongoClient } = require('mongodb');

async function checkAdmin() {
  const client = new MongoClient('mongodb://localhost:27017');
  try {
    await client.connect();
    const db = client.db('deapseak');
    const admin = await db.collection('users').findOne({ username: 'admin' });
    if (admin) {
      console.log('✅ Admin user created successfully:');
      console.log('Email:', admin.email);
      console.log('Username:', admin.username);
      console.log('Role:', admin.role);
      console.log('Password hash exists:', !!admin.password);
    } else {
      console.log('❌ Admin user not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkAdmin();