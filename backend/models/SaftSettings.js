const mongoose = require('mongoose');

// Singleton document — always upsert with key 'global'
const saftSettingsSchema = new mongoose.Schema({
    key: { type: String, default: 'global', unique: true },
    // NIFs to skip during debtor detection (one-time clients, not maintenance contracts)
    ignoredNifs: [{ type: String, trim: true }],
});

module.exports = mongoose.model('SaftSettings', saftSettingsSchema);
