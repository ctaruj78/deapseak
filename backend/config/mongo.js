const mongoose = require('mongoose');

module.exports = async function mongoConnect() {
  const uri = process.env.MONGO_URI;
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    // logger.log('MongoDB connected');
  } catch (err) {
    // logger.error('MongoDB connection error:', err);
    throw err;
  }
};
