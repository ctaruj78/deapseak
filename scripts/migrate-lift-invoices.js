#!/usr/bin/env node
// Migrates existing SaftImport.debtors[].invoices[] to LiftInvoice collection.
// Only overdue invoices are recoverable from past imports (full history requires re-upload).
// Run: node scripts/migrate-lift-invoices.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || process.env.DB_URI || 'mongodb://localhost:27017/deapseak';

async function migrate() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected:', MONGODB_URI.replace(/:\/\/.*@/, '://***@'));

    // Lazy-load models to avoid circular deps
    const SaftImport  = require('../backend/models/SaftImport');
    const LiftInvoice = require('../backend/models/LiftInvoice');
    const Lift        = require('../backend/models/Lift');

    const imports = await SaftImport.find({}).sort({ createdAt: 1 }).lean();
    console.log(`Processing ${imports.length} SAF-T imports...`);

    let created = 0, updated = 0, errors = 0;

    for (const imp of imports) {
        const fiscalYear = imp.period?.fiscalYear || String(new Date(imp.createdAt).getFullYear());

        for (const debtor of (imp.debtors || [])) {
            const nif = debtor.customerTaxId;
            if (!nif) continue;

            const lifts = await Lift.find({ nif }, '_id').lean();
            const liftId = lifts[0]?._id || null;

            for (const inv of (debtor.invoices || [])) {
                if (!inv.invoiceNo) continue;

                const outstanding = inv.outstanding || 0;
                const amountPaid  = inv.amountPaid  || 0;
                const status = outstanding < 0.01 ? 'paid'
                    : amountPaid > 0.01 ? 'partial'
                    : (inv.daysOverdue || 0) > 30 ? 'overdue'
                    : 'pending';

                try {
                    const res = await LiftInvoice.updateOne(
                        { invoiceNo: inv.invoiceNo },
                        { $setOnInsert: {
                            liftId, nif, invoiceNo: inv.invoiceNo,
                            invoiceDate:  inv.invoiceDate,
                            invoiceType:  inv.invoiceType || 'FT',
                            grossTotal:   inv.grossTotal  || 0,
                            amountPaid,
                            outstanding,
                            daysOverdue:  inv.daysOverdue || 0,
                            fiscalYear,
                            status, source: 'saft',
                            customerName: debtor.customerName,
                            customerTaxId: nif,
                            saftImportId: imp._id,
                        }},
                        { upsert: true }
                    );
                    if (res.upsertedCount) created++;
                    else updated++;
                } catch (e) {
                    if (e.code !== 11000) { console.error('ERR', inv.invoiceNo, e.message); errors++; }
                }
            }
        }
    }

    console.log(`Done: ${created} created, ${updated} existing, ${errors} errors`);
    await mongoose.disconnect();
}

migrate().catch(err => { console.error(err); process.exit(1); });
