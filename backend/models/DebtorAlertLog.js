const mongoose = require('mongoose');

const debtorAlertLogSchema = new mongoose.Schema({
    nif:          { type: String, required: true, unique: true },
    customerName: { type: String },
    sentAt:       { type: Date, default: Date.now },
}, { timestamps: false });

module.exports = mongoose.model('DebtorAlertLog', debtorAlertLogSchema);
