const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const Lift = require('../models/Lift');
const SaftImport = require('../models/SaftImport');
const emailService = require('../services/emailService');

// ── helpers ──────────────────────────────────────────────────────────────────

const toArray = (v) => {
    if (!v) return [];
    return Array.isArray(v) ? v : [v];
};

const parseDate = (s) => {
    if (!s) return null;
    const d = new Date(String(s).substring(0, 10));
    return isNaN(d) ? null : d;
};

const daysBetween = (a, b) =>
    Math.floor((b - a) / (1000 * 60 * 60 * 24));

// ── XML parser config ─────────────────────────────────────────────────────────

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '_',
    parseTagValue: true,
    parseAttributeValue: false,
    trimValues: true,
    isArray: (tag) => [
        'Customer', 'Invoice', 'Payment', 'Line', 'SourceDocumentID',
    ].includes(tag),
});

// ── main upload handler ───────────────────────────────────────────────────────

exports.uploadSaft = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Nenhum ficheiro SAF-T enviado.' });
    }

    const filePath = req.file.path;
    const warnings = [];

    try {
        const xml = fs.readFileSync(filePath, 'utf8');
        const parsed = xmlParser.parse(xml);
        const root = parsed?.AuditFile || parsed;

        // ── header ────────────────────────────────────────────────────────────
        const header = root?.Header || {};
        const period = {
            start:      parseDate(header.StartDate),
            end:        parseDate(header.EndDate),
            fiscalYear: String(header.FiscalYear || ''),
        };
        const taxEntity   = String(header.TaxEntity   || '');
        const softwareName = String(header.SoftwareCertificateNumber || header.ProductID || '');

        // ── customers ─────────────────────────────────────────────────────────
        const rawCustomers = toArray(root?.MasterFiles?.Customer);
        const customerMap = {}; // CustomerID → customer data
        rawCustomers.forEach(c => {
            const id  = String(c.CustomerID || '').trim();
            const nif = String(c.CustomerTaxID || '').trim();
            if (!id || !nif) return;
            customerMap[id] = {
                id,
                nif,
                name:       String(c.CompanyName || c.CustomerTaxID || '').trim(),
                street:     String(c.BillingAddress?.AddressDetail || '').trim(),
                postalCode: String(c.BillingAddress?.PostalCode    || '').trim(),
                city:       String(c.BillingAddress?.City          || '').trim(),
            };
        });

        // ── invoices ──────────────────────────────────────────────────────────
        const rawInvoices = toArray(root?.SourceDocuments?.SalesInvoices?.Invoice);
        const invoiceMap = {}; // invoiceNo → { customerId, grossTotal, date, type, status }
        rawInvoices.forEach(inv => {
            const no     = String(inv.InvoiceNo || '').trim();
            const type   = String(inv.InvoiceType || '').trim();   // FT, FR, ND, NC
            const status = String(inv.InvoiceStatus?.InvoiceStatus || 'N').trim();
            const gross  = parseFloat(inv.DocumentTotals?.GrossTotal) || 0;
            const date   = parseDate(inv.InvoiceDate);
            const custId = String(inv.CustomerID || '').trim();
            if (!no || !custId) return;
            invoiceMap[no] = { no, type, status, gross, date, custId };
        });

        // ── payments — build paid amounts per invoice ─────────────────────────
        const rawPayments = toArray(root?.SourceDocuments?.Payments?.Payment);
        const paidMap = {}; // invoiceNo → total amount paid
        rawPayments.forEach(pmt => {
            toArray(pmt.Lines?.Line).forEach(line => {
                toArray(line.SourceDocumentID).forEach(src => {
                    const origNo = String(src.OriginatingON || '').trim();
                    const credit = parseFloat(src.CreditAmount || line.CreditAmount || 0);
                    if (!origNo) return;
                    paidMap[origNo] = (paidMap[origNo] || 0) + credit;
                });
            });
        });

        // ── 1a. Match NIFs → lifts by postal code + street (building NIF) ────────
        const liftsUpdated = [];
        const updatedLiftIds = new Set(); // track to avoid double-update

        for (const cust of Object.values(customerMap)) {
            if (!cust.nif) continue;

            if (cust.postalCode) {
                const query = { 'address.zipCode': cust.postalCode };
                if (cust.street) {
                    const keyword = cust.street.split(/\s+/).find(w => w.length > 4);
                    if (keyword) query['address.street'] = { $regex: keyword, $options: 'i' };
                }
                const lifts = await Lift.find(query, '_id municipalNumber address nif clientName').lean();
                for (const lift of lifts) {
                    if (lift.nif === cust.nif || updatedLiftIds.has(String(lift._id))) continue;
                    await Lift.updateOne({ _id: lift._id }, { $set: { nif: cust.nif } });
                    updatedLiftIds.add(String(lift._id));
                    liftsUpdated.push({ liftId: lift._id, municipalNumber: lift.municipalNumber, nif: cust.nif, street: lift.address?.street, matchedBy: 'address' });
                }
            }
        }

        // ── 1b. Match NIFs → lifts by client name (company name in SAF-T) ───────
        // For management companies: billing address ≠ building address.
        // Match SAF-T CompanyName → DB clientName using significant-word tokens.
        const normalise = (s) => String(s || '')
            .toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        // Generic words common in Portuguese company names — not discriminative
        const STOPWORDS = new Set([
            'adm', 'admin', 'administracao', 'administrador', 'administradores',
            'condominio', 'condominios', 'condominium',
            'lda', 'ltda', 'unip', 'sgps', 'sociedade', 'gestao',
            'rua', 'avenida', 'praceta', 'praca', 'largo', 'estrada',
            'numero', 'edificio',
        ]);

        const sigTokens = (name) => normalise(name)
            .split(' ')
            .filter(w => w.length >= 5 && !STOPWORDS.has(w));

        for (const cust of Object.values(customerMap)) {
            if (!cust.nif || !cust.name) continue;
            const tokens = sigTokens(cust.name).slice(0, 3);
            // Require at least 1 token of ≥5 chars that is not generic
            if (!tokens.length) continue;

            // Build query: clientName must contain ALL tokens
            const tokenQueries = tokens.map(t => ({ clientName: { $regex: t, $options: 'i' } }));
            const nameQuery = tokenQueries.length === 1 ? tokenQueries[0] : { $and: tokenQueries };

            const lifts = await Lift.find(
                {
                    ...nameQuery,
                    $or: [{ nif: { $exists: false } }, { nif: null }, { nif: '' }],
                },
                '_id municipalNumber address nif clientName'
            ).lean();

            for (const lift of lifts) {
                if (updatedLiftIds.has(String(lift._id))) continue;
                // Verify reverse: SAF-T tokens found in lift clientName
                const liftNorm = normalise(lift.clientName);
                const matched = tokens.filter(t => liftNorm.includes(t)).length;
                if (matched < tokens.length) continue; // all tokens must match

                await Lift.updateOne({ _id: lift._id }, { $set: { nif: cust.nif } });
                updatedLiftIds.add(String(lift._id));
                liftsUpdated.push({
                    liftId:          lift._id,
                    municipalNumber: lift.municipalNumber,
                    nif:             cust.nif,
                    street:          lift.address?.street,
                    matchedBy:       'name:' + (lift.clientName || ''),
                });
            }
        }

        // ── 2. Detect debtors ─────────────────────────────────────────────────
        const OVERDUE_DAYS = parseInt(process.env.SAFT_OVERDUE_DAYS) || 30;
        // Use SAF-T EndDate as reference — not today — so old SAF-T files don't
        // flag all invoices as overdue just because time has passed since export.
        const today = period.end || new Date();

        // Group outstanding invoices by customer
        const debtorMap = {}; // custId → { invoices[], totalOutstanding }
        for (const inv of Object.values(invoiceMap)) {
            // Only FT and FR are chargeable; NC are credit notes (negative)
            if (!['FT', 'FR', 'ND'].includes(inv.type)) continue;
            if (inv.status === 'A') continue; // anulada
            if (!inv.date) continue;

            const paid  = paidMap[inv.no] || 0;
            const outstanding = Math.max(0, inv.gross - paid);
            if (outstanding < 0.01) continue; // paid in full

            const days = daysBetween(inv.date, today);
            if (days < OVERDUE_DAYS) continue; // not yet overdue

            if (!debtorMap[inv.custId]) {
                debtorMap[inv.custId] = { invoices: [], totalOutstanding: 0 };
            }
            debtorMap[inv.custId].invoices.push({
                invoiceNo:   inv.no,
                invoiceDate: inv.date,
                invoiceType: inv.type,
                grossTotal:  inv.gross,
                amountPaid:  paid,
                outstanding,
                daysOverdue: days,
            });
            debtorMap[inv.custId].totalOutstanding += outstanding;
        }

        // ── 3. Find client emails — DO NOT auto-send; admin reviews first ────────
        const debtors = [];
        const alertsSent = 0; // always 0 on upload — manual send only via /resend

        for (const [custId, data] of Object.entries(debtorMap)) {
            const cust = customerMap[custId];
            if (!cust) continue;

            const lift = await Lift.findOne({ nif: cust.nif }, 'clientEmail clientName').lean();
            const clientEmail = lift?.clientEmail || null;

            if (!clientEmail) {
                warnings.push(`Devedor NIF ${cust.nif} (${cust.name}) — sem email em BD`);
            }

            debtors.push({
                customerTaxId:    cust.nif,
                customerName:     cust.name,
                clientEmail,
                totalOutstanding: data.totalOutstanding,
                alertSent:        false,
                invoices:         data.invoices,
            });
        }

        // ── 4. Save import record ─────────────────────────────────────────────
        const record = await SaftImport.create({
            importedBy: req.user.id,
            filename:   req.file.originalname,
            period,
            taxEntity,
            softwareName,
            stats: {
                customersFound: Object.keys(customerMap).length,
                liftsUpdated:   liftsUpdated.length,
                invoicesTotal:  rawInvoices.length,
                paymentsTotal:  rawPayments.length,
                debtorsFound:   debtors.length,
                alertsSent,
            },
            liftsUpdated,
            debtors,
            warnings,
        });

        // Clean up uploaded file
        fs.unlinkSync(filePath);

        res.json({
            success: true,
            importId: record._id,
            stats: record.stats,
            liftsUpdated,
            debtors: debtors.map(d => ({
                nif:             d.customerTaxId,
                name:            d.customerName,
                email:           d.clientEmail,
                totalOutstanding: d.totalOutstanding,
                alertSent:       d.alertSent,
                invoices:        d.invoices.length,
            })),
            warnings,
        });

    } catch (err) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.error('SAF-T parse error:', err);
        res.status(500).json({ success: false, message: 'Erro ao processar SAF-T: ' + err.message });
    }
};

// ── list past imports ─────────────────────────────────────────────────────────

exports.listImports = async (req, res) => {
    try {
        const imports = await SaftImport.find({}, 'filename period stats createdAt importedBy')
            .populate('importedBy', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        res.json({ success: true, imports });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── get single import detail ──────────────────────────────────────────────────

exports.getImport = async (req, res) => {
    try {
        const record = await SaftImport.findById(req.params.id)
            .populate('importedBy', 'firstName lastName')
            .lean();
        if (!record) return res.status(404).json({ success: false, message: 'Import não encontrado' });
        res.json({ success: true, record });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── resend debtor alerts for an import ───────────────────────────────────────

exports.resendAlerts = async (req, res) => {
    try {
        const record = await SaftImport.findById(req.params.id);
        if (!record) return res.status(404).json({ success: false, message: 'Import não encontrado' });

        let sent = 0;
        for (const d of record.debtors) {
            if (!d.clientEmail) continue;
            try {
                await _sendDebtorAlert(d.clientEmail, d.customerName, d.invoices, d.totalOutstanding);
                d.alertSent   = true;
                d.alertSentAt = new Date();
                sent++;
            } catch (e) {
                // continue
            }
        }
        record.stats.alertsSent = sent;
        await record.save();
        res.json({ success: true, alertsSent: sent });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── email template for debtors ────────────────────────────────────────────────

async function _sendDebtorAlert(email, name, invoices, totalOutstanding) {
    const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const fmt = (n) => Number(n).toFixed(2).replace('.', ',') + ' €';
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-PT') : '—';

    const rows = invoices.map(inv => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${esc(inv.invoiceNo)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${fmtDate(inv.invoiceDate)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${fmt(inv.grossTotal)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${fmt(inv.amountPaid)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;color:#c62828;font-weight:bold;">${fmt(inv.outstanding)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${inv.daysOverdue}d</td>
        </tr>`).join('');

    const bodyHtml = `
        <p>Caro(a) <strong>${esc(name)}</strong>,</p>
        <p>Verificamos que existem faturas em aberto associadas ao contrato de manutenção de elevadores com a <strong>FestLift</strong>.</p>
        <div style="background:#fff3cd;border-left:4px solid #f9a825;border-radius:6px;padding:14px 20px;margin:20px 0;">
            <strong>⚠️ Total em dívida: <span style="color:#c62828;">${fmt(totalOutstanding)}</span></strong>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;margin:16px 0;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #ddd;">Fatura</th>
              <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #ddd;">Data</th>
              <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #ddd;">Total</th>
              <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #ddd;">Pago</th>
              <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #ddd;">Em dívida</th>
              <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #ddd;">Atraso</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p>Solicitamos que regularize a situação o mais brevemente possível. Para esclarecimentos sobre pagamentos, entre em contacto connosco:</p>
        <div style="background:#e8f0fe;border-radius:6px;padding:14px 20px;margin:16px 0;">
            <strong>FestLift</strong> — <a href="mailto:info@festlift.pt" style="color:#1565c0;">info@festlift.pt</a>
            &nbsp;·&nbsp; +351 214 190 863
        </div>
        <p style="font-size:12px;color:#888;margin-top:24px;">Este é um email automático gerado pelo sistema de gestão FestLift.</p>`;

    await emailService._sendEmail(
        email,
        `⚠️ Faturas em aberto — FestLift (${fmt(totalOutstanding)})`,
        emailService._tpl('#c62828', 'Aviso de Pagamento', bodyHtml)
    );
}
