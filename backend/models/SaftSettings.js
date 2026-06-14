const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    invoiceNo:   String,
    invoiceDate: String,
    dueDate:     String,
    total:       Number,
    outstanding: Number,
    daysOverdue: Number,
}, { _id: false });

const pendentesDebtorSchema = new mongoose.Schema({
    customerName:     String,
    customerTaxId:    String,
    moloniCode:       String,
    totalOutstanding: Number,
    avgDaysOverdue:   Number,
    clientEmail:      { type: String, default: null },
    alertSent:        { type: Boolean, default: false },
    invoices:         [invoiceSchema],
}, { _id: false });

const saftSettingsSchema = new mongoose.Schema({
    key:        { type: String, default: 'global', unique: true },
    ignoredNifs: [{ type: String, trim: true }],
    // Latest pendentes import — replaced on each upload
    pendentes: {
        importedAt: Date,
        filename:   String,
        total:      Number,
        debtors:    [pendentesDebtorSchema],
    },
    // Email map from last Moloni clients CSV: { moloniCode: email, nif: email }
    moloniEmailMap: { type: Map, of: String, default: {} },
});

module.exports = mongoose.model('SaftSettings', saftSettingsSchema);
