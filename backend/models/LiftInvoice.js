const mongoose = require('mongoose');

const liftInvoiceSchema = new mongoose.Schema({
    moloniCode:  { type: String, index: true },   // Moloni CustomerID (SAF-T CustomerID) — chave primária de ligação
    nif:         { type: String, index: true },    // fallback quando moloniCode não disponível
    liftId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Lift', index: true }, // referência opcional
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
    lines: [{
        description: String,
        quantity:    { type: Number, default: 1 },
        unitPrice:   { type: Number, default: 0 },
        netAmount:   { type: Number, default: 0 },
        taxPct:      { type: Number, default: 0 },
        grossAmount: { type: Number, default: 0 },
    }],
    source:        { type: String, enum: ['saft', 'pendentes'], default: 'saft' },
    customerName:  String,
    customerTaxId: String,
    saftImportId:  { type: mongoose.Schema.Types.ObjectId, ref: 'SaftImport' },
}, { timestamps: true });

// Uma fatura tem um único CustomerID — índice único por invoiceNo
liftInvoiceSchema.index({ invoiceNo: 1 }, { unique: true });
liftInvoiceSchema.index({ moloniCode: 1, fiscalYear: 1 });
liftInvoiceSchema.index({ liftId: 1, fiscalYear: 1 });
liftInvoiceSchema.index({ nif: 1, fiscalYear: 1 });

module.exports = mongoose.model('LiftInvoice', liftInvoiceSchema);
