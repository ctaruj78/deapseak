const mongoose = require('mongoose');

const saftImportSchema = new mongoose.Schema({
    importedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    period: {
        start: Date,
        end: Date,
        fiscalYear: String,
    },
    taxEntity: String,
    softwareName: String,
    stats: {
        customersFound: { type: Number, default: 0 },
        liftsUpdated:   { type: Number, default: 0 },
        invoicesTotal:  { type: Number, default: 0 },
        paymentsTotal:  { type: Number, default: 0 },
        debtorsFound:   { type: Number, default: 0 },
        alertsSent:     { type: Number, default: 0 },
    },
    liftsUpdated: [{
        liftId:          mongoose.Schema.Types.ObjectId,
        municipalNumber: String,
        nif:             String,
        street:          String,
    }],
    debtors: [{
        customerTaxId:   String,
        customerName:    String,
        clientEmail:     String,
        totalOutstanding:{ type: Number, default: 0 },
        alertSent:       { type: Boolean, default: false },
        alertSentAt:     Date,
        invoices: [{
            invoiceNo:   String,
            invoiceDate: Date,
            invoiceType: String,
            grossTotal:  Number,
            amountPaid:  Number,
            outstanding: Number,
            daysOverdue: Number,
        }],
    }],
    warnings: [String],
}, {
    timestamps: true,
});

module.exports = mongoose.model('SaftImport', saftImportSchema);
