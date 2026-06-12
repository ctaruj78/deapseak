const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
mongoose.connect('mongodb://localhost:27017/deapseak')
  .then(async () => {
    const User = require('./backend/models/User');
    const hash = await bcrypt.hash('Test1234!', 10);
    const emails = ['info@festlift.pt', 'dispatcher@festlift.pt', 'client@festlift.pt', 'ctaruj78@gmail.com', 'tech1@festlift.pt'];
    for (const email of emails) {
      const r = await User.updateOne({email}, {$set: {password: hash}});
      console.log(email + ':', r.modifiedCount ? 'updated' : 'not found');
    }
    process.exit(0);
  }).catch(e => { console.error(e.message); process.exit(1); });
