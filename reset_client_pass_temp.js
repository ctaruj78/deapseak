const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const client = new MongoClient('mongodb://localhost:27017');
client.connect().then(async () => {
  const db = client.db('deapseak');
  const newPassword = 'BDIB1991$';
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(newPassword, salt);
  const result = await db.collection('users').updateOne(
    { email: 'exclusivapartilha@gmail.com' },
    {
      $set: {
        password: hashed,
        isActive: true,
        loginAttempts: 0,
        lockUntil: null
      }
    }
  );
  if (result.modifiedCount === 1) {
    console.log('Password reset successfully for exclusivapartilha@gmail.com');
    console.log('New password: ' + newPassword);
  } else {
    console.log('User not found or not updated');
  }
  await client.close();
}).catch(function(e) { console.error('Error:', e.message); });
