const mongoose = require('mongoose');

const liftInvoiceSchema = new mongoose.Schema({
    liftId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Lift', index: true },
    nif:         { type: String, index: true },
    moloniCode:  String,
    invoiceNo:   { type: String, required: true },
    invoiceDate: Date,
    dueDate:     Date,
    invoiceType: { type: String, enum: ['FT', 'FR', 'ND', 'NC', 'VD', 'GT'] },
    grossTotal:  { type: Number, default: 0 },
    amountPaid:  { type: Number, default: 0 },
    outstanding: { type: Number, default: 0 },
    daysOverdue: { type: Number, default: 0 },
    fiscalYear:  { type: String, index: true },
    status: {
        type: String,
        enum: ['paid', 'partial', 'overdue', 'pending', 'cancelled'],
        index: true,
        default: 'pending',
    },
    source:        { type: String, enum: ['saft', 'pendentes'], default: 'saft' },
    customerName:  String,
    customerTaxId: String,
    saftImportId:  { type: mongoose.Schema.Types.ObjectId, ref: 'SaftImport' },
}, { timestamps: true });

// Compound unique: same invoice can appear once per lift (shared NIF = same invoice on 2 lifts)
liftInvoiceSchema.index({ invoiceNo: 1, liftId: 1 }, { unique: true });
liftInvoiceSchema.index({ liftId: 1, fiscalYear: 1 });
liftInvoiceSchema.index({ nif: 1, fiscalYear: 1 });

module.exports = mongoose.model('LiftInvoice', liftInvoiceSchema);
