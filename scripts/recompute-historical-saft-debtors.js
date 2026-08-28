#!/usr/bin/env node
// Corrects SaftImport.stats.debtorsFound / SaftImport.debtors for historical SAF-T
// backfill records that were wrongly stamped with the current global "pendentes"
// debtor snapshot instead of debtors computed from their own file's invoices.
//
// Background: uploadSaft() (backend/controllers/saftController.js) used to apply
// the global "pendentes" (Moloni current outstanding balances) debtor list to
// EVERY import when a pendentes upload existed within 90 days — including
// historical backfills imported long after their own period. That produced the
// same debtor count (e.g. 24) on dozens of unrelated past months. The controller
// has been fixed to only do this when the SAF-T's own period is itself recent
// (see periodIsRecent check). This script re-parses each affected file's XML
// (still on disk in uploads/saft/) and recomputes debtors the same way the
// "fallback: detect from this SAF-T file only" branch of uploadSaft does —
// read-only against Lift, no emails, no lift/nif matching side effects.
//
// Usage:
//   node scripts/recompute-historical-saft-debtors.js --dry-run   (preview only)
//   node scripts/recompute-historical-saft-debtors.js             (apply changes)

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { XMLParser } = require('fast-xml-parser');

const DRY_RUN = process.argv.includes('--dry-run');
const MONGODB_URI = process.env.MONGODB_URI || process.env.DB_URI || 'mongodb://localhost:27017/deapseak';
const OVERDUE_DAYS = parseInt(process.env.SAFT_OVERDUE_DAYS) || 30;

const toArray = (v) => (!v ? [] : Array.isArray(v) ? v : [v]);
const parseDate = (s) => {
    if (!s) return null;
    const d = new Date(String(s).substring(0, 10));
    return isNaN(d) ? null : d;
};
const daysBetween = (a, b) => Math.floor((b - a) / (1000 * 60 * 60 * 24));

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '_',
    parseTagValue: true,
    parseAttributeValue: false,
    trimValues: true,
    isArray: (tag) => ['Customer', 'Invoice', 'Payment', 'Line', 'SourceDocumentID'].includes(tag),
});

function buildDebtorMapFromXml(xmlPath) {
    const xml = fs.readFileSync(xmlPath, 'utf8');
    const parsed = xmlParser.parse(xml);
    const root = parsed?.AuditFile || parsed;

    const customerMap = {};
    toArray(root?.MasterFiles?.Customer).forEach(c => {
        const id = String(c.CustomerID || '').trim();
        const nif = String(c.CustomerTaxID || '').trim();
        if (!id || !nif) return;
        customerMap[id] = { id, nif, name: String(c.CompanyName || c.CustomerTaxID || '').trim() };
    });

    const invoiceMap = {};
    toArray(root?.SourceDocuments?.SalesInvoices?.Invoice).forEach(inv => {
        const no = String(inv.InvoiceNo || '').trim();
        const type = String(inv.InvoiceType || '').trim();
        const status = String(inv.InvoiceStatus?.InvoiceStatus || 'N').trim();
        const gross = parseFloat(inv.DocumentTotals?.GrossTotal) || 0;
        const date = parseDate(inv.InvoiceDate);
        const custId = String(inv.CustomerID || '').trim();
        if (!no || !custId) return;
        invoiceMap[no] = { no, type, status, gross, date, custId };
    });

    const paidMap = {};
    toArray(root?.SourceDocuments?.Payments?.Payment).forEach(pmt => {
        toArray(pmt.Line || pmt.Lines?.Line).forEach(line => {
            const baseAmt = parseFloat(line.DebitAmount || line.CreditAmount || 0);
            const taxPct = parseFloat(line.Tax?.TaxPercentage || 0);
            const lineAmt = taxPct > 0 ? +(baseAmt * (1 + taxPct / 100)).toFixed(2) : baseAmt;
            toArray(line.SourceDocumentID).forEach(src => {
                const origNo = String(src.OriginatingON || '').trim();
                if (!origNo || lineAmt <= 0) return;
                paidMap[origNo] = (paidMap[origNo] || 0) + lineAmt;
            });
        });
    });

    const today = new Date();
    const debtorMap = {};
    for (const inv of Object.values(invoiceMap)) {
        if (!['FT', 'FR', 'ND'].includes(inv.type)) continue;
        if (inv.status === 'A') continue;
        if (!inv.date) continue;
        const paid = inv.type === 'FR' ? inv.gross : (paidMap[inv.no] || 0);
        const outstanding = Math.max(0, inv.gross - paid);
        if (outstanding < 0.01) continue;
        const days = daysBetween(inv.date, today);
        if (days < OVERDUE_DAYS) continue;
        if (!debtorMap[inv.custId]) debtorMap[inv.custId] = { invoices: [], totalOutstanding: 0 };
        debtorMap[inv.custId].invoices.push({
            invoiceNo: inv.no, invoiceDate: inv.date, invoiceType: inv.type,
            grossTotal: inv.gross, amountPaid: paid, outstanding, daysOverdue: days,
        });
        debtorMap[inv.custId].totalOutstanding += outstanding;
    }

    return { customerMap, debtorMap };
}

async function main() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected:', MONGODB_URI.replace(/:\/\/.*@/, '://***@'), DRY_RUN ? '(dry run)' : '');

    const SaftImport = require('../backend/models/SaftImport');
    const SaftSettings = require('../backend/models/SaftSettings');
    const Lift = require('../backend/models/Lift');

    const settings = await SaftSettings.findOne({ key: 'global' }).lean();
    const ignoredNifs = new Set((settings?.ignoredNifs || []).map(n => String(n).trim()));

    const imports = await SaftImport.find({}).sort({ createdAt: 1 }).lean();
    console.log(`Checking ${imports.length} SAF-T imports...`);

    let fixed = 0, skipped = 0, errors = 0;

    for (const imp of imports) {
        const periodEnd = imp.period?.end || imp.period?.start;
        const createdAt = imp.createdAt;
        const periodIsRecent = periodEnd ? daysBetween(new Date(periodEnd), new Date(createdAt)) <= 90 : true;

        if (periodIsRecent) { skipped++; continue; } // this one was computed correctly at import time

        const xmlPath = path.join(__dirname, '../uploads/saft', imp.filename);
        if (!fs.existsSync(xmlPath)) {
            console.warn(`⚠️  Missing file for ${imp.filename} (period ${imp.period?.fiscalYear}) — skipped`);
            errors++;
            continue;
        }

        try {
            const { customerMap, debtorMap } = buildDebtorMapFromXml(xmlPath);
            const debtors = [];
            for (const [custId, data] of Object.entries(debtorMap)) {
                const cust = customerMap[custId];
                if (!cust || ignoredNifs.has(cust.nif)) continue;
                const lift = await Lift.findOne({ nif: cust.nif }, 'clientEmail').lean();
                debtors.push({
                    customerTaxId: cust.nif,
                    customerName: cust.name,
                    clientEmail: lift?.clientEmail || null,
                    totalOutstanding: data.totalOutstanding,
                    alertSent: false,
                    invoices: data.invoices,
                });
            }

            const oldCount = imp.stats?.debtorsFound ?? 0;
            const newCount = debtors.length;
            console.log(`${imp.filename} (${imp.period?.fiscalYear}): ${oldCount} → ${newCount} devedores`);

            if (!DRY_RUN) {
                await SaftImport.updateOne(
                    { _id: imp._id },
                    { $set: { debtors, 'stats.debtorsFound': newCount } }
                );
            }
            fixed++;
        } catch (e) {
            console.error(`❌ Error processing ${imp.filename}:`, e.message);
            errors++;
        }
    }

    console.log(`\nDone. Recomputed: ${fixed}, already correct/skipped: ${skipped}, errors: ${errors}`);
    process.exit(0);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
