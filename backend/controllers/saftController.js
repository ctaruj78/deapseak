const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const Lift = require('../models/Lift');
const SaftImport = require('../models/SaftImport');
const SaftSettings = require('../models/SaftSettings');
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
        const invoiceMap = {}; // invoiceNo → { custId, gross, date, type, status }
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

        // ── 1a. Match NIFs → lifts by moloniCode (SAF-T CustomerID) ─────────────
        // Primary: each prédio has its own Moloni client code stored in lift.moloniCode.
        // Fallback: postal code + street keyword + exact house number (all three required
        //   to avoid matching multiple buildings on the same street).
        const liftsUpdated = [];
        const updatedLiftIds = new Set();

        // Extract house number from Portuguese address strings
        // "Rua Casal da Serra nº19" → "19"  |  "Av. de Brasilia nº 22" → "22"
        const extractHouseNum = (s) => {
            const m = String(s).match(/n[.º°]?\s*(\d+)/i) || String(s).match(/(\d+)\s*[A-Za-z-]?\s*$/);
            return m ? m[1] : null;
        };

        for (const cust of Object.values(customerMap)) {
            if (!cust.nif) continue;

            // Primary: moloniCode = SAF-T CustomerID (exact, per-building match)
            let foundViaMoloniCode = false;
            if (cust.id) {
                const lifts = await Lift.find(
                    { moloniCode: cust.id },
                    '_id municipalNumber address nif'
                ).lean();
                for (const lift of lifts) {
                    if (lift.nif === cust.nif || updatedLiftIds.has(String(lift._id))) continue;
                    await Lift.updateOne({ _id: lift._id }, { $set: { nif: cust.nif } });
                    updatedLiftIds.add(String(lift._id));
                    liftsUpdated.push({ liftId: lift._id, municipalNumber: lift.municipalNumber, nif: cust.nif, street: lift.address?.street, matchedBy: 'moloniCode' });
                    foundViaMoloniCode = true;
                }
            }
            if (foundViaMoloniCode) continue;

            // Fallback: postal code + street keyword + exact house number
            if (cust.postalCode && cust.street) {
                const houseNum = extractHouseNum(cust.street);
                const keyword  = cust.street.split(/\s+/).find(w => w.length > 4);
                if (!keyword || !houseNum) continue;

                const lifts = await Lift.find(
                    {
                        $and: [
                            { 'address.zipCode':  cust.postalCode },
                            { 'address.street': { $regex: keyword,                $options: 'i' } },
                            { 'address.street': { $regex: `\\b${houseNum}\\b` } },
                        ],
                    },
                    '_id municipalNumber address nif'
                ).lean();
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
        const settings = await SaftSettings.findOne({ key: 'global' }).lean();
        const ignoredNifs = new Set((settings?.ignoredNifs || []).map(n => String(n).trim()));

        const debtors = [];
        const alertsSent = 0; // always 0 on upload — manual send only via /resend

        for (const [custId, data] of Object.entries(debtorMap)) {
            const cust = customerMap[custId];
            if (!cust) continue;
            if (ignoredNifs.has(cust.nif)) continue; // one-time client, skip

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

exports.deleteImport = async (req, res) => {
    try {
        const record = await SaftImport.findById(req.params.id);
        if (!record) return res.status(404).json({ success: false, message: 'Import não encontrado' });
        // remove uploaded XML file if it exists
        try {
            const xmlPath = path.join(__dirname, '../../uploads/saft', record.filename);
            if (fs.existsSync(xmlPath)) fs.unlinkSync(xmlPath);
        } catch (_) {}
        await record.deleteOne();
        res.json({ success: true });
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

// ── ignore / unignore NIF (one-time clients) ──────────────────────────────────

exports.ignoreNif = async (req, res) => {
    const nif = String(req.params.nif || '').trim();
    if (!nif) return res.status(400).json({ success: false, message: 'NIF inválido' });
    try {
        await SaftSettings.findOneAndUpdate(
            { key: 'global' },
            { $addToSet: { ignoredNifs: nif } },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.unignoreNif = async (req, res) => {
    const nif = String(req.params.nif || '').trim();
    try {
        await SaftSettings.updateOne({ key: 'global' }, { $pull: { ignoredNifs: nif } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getIgnoredNifs = async (req, res) => {
    try {
        const s = await SaftSettings.findOne({ key: 'global' }).lean();
        res.json({ success: true, ignoredNifs: s?.ignoredNifs || [] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── import Moloni clients CSV ─────────────────────────────────────────────────

// Split a single CSV line respecting quoted fields
function splitCsvLine(line, delim) {
    const result = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQ = !inQ; continue; }
        if (!inQ && ch === delim) { result.push(cur); cur = ''; continue; }
        cur += ch;
    }
    result.push(cur);
    return result;
}

const normaliseHdr = (s) => String(s)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

const extractHouseNumCsv = (s) => {
    const m = String(s).match(/n[.º°]?\s*(\d+)/i) || String(s).match(/(\d+)\s*[A-Za-z-]?\s*$/);
    return m ? m[1] : null;
};

exports.importMoloniClients = async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'Nenhum ficheiro CSV enviado.' });
    const filePath = req.file.path;
    try {
        const raw = fs.readFileSync(filePath, 'utf8').replace(/^﻿/, ''); // strip BOM
        fs.unlinkSync(filePath);

        const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l);
        if (lines.length < 2) return res.status(400).json({ success: false, message: 'CSV vazio ou sem dados.' });

        // Moloni exports have metadata rows before the real header (company name, title, date…).
        // Find header row: first line with >4 semicolons (or commas) that contains "contribuinte"
        // or "nif" (case-insensitive, no accent normalisation needed for these words).
        let headerIdx = 0;
        for (let i = 0; i < Math.min(25, lines.length); i++) {
            const lower = lines[i].toLowerCase();
            const sepCount = (lines[i].match(/;/g) || []).length;
            if (sepCount > 4 && (lower.includes('contribuinte') || lower.includes('nif'))) {
                headerIdx = i;
                break;
            }
        }

        const delim = lines[headerIdx].includes(';') ? ';' : ',';
        const headers = splitCsvLine(lines[headerIdx], delim).map(normaliseHdr);

        const col = (...candidates) => {
            for (const c of candidates) {
                const i = headers.findIndex(h => h === c || h.startsWith(c));
                if (i >= 0) return i;
            }
            return -1;
        };

        const iCode = col('codigo', 'code', 'id');
        const iNif  = col('contribuinte', 'nif', 'taxid', 'nrcontribuinte');
        const iAddr = col('morada', 'endereco', 'address', 'rua');
        const iZip  = col('codigopostal', 'codpostal', 'postal', 'zip', 'cp');
        const iName = col('nome', 'name', 'empresa', 'companyname');

        if (iNif < 0) return res.status(400).json({ success: false, message: `Coluna NIF/Contribuinte não encontrada. Colunas detectadas: ${headers.join(' | ')}` });

        // DEBUG: return first 3 parsed clients so we can see raw extracted values
        if (req.query.debug) {
            const dbg = [];
            for (let i = headerIdx + 1; i < Math.min(headerIdx + 4, lines.length); i++) {
                const cols = splitCsvLine(lines[i], delim);
                dbg.push({
                    raw: lines[i].substring(0, 120),
                    code: iCode >= 0 ? cols[iCode] : '?',
                    nif:  iNif  >= 0 ? cols[iNif]  : '?',
                    addr: iAddr >= 0 ? cols[iAddr]  : '?',
                    zip:  iZip  >= 0 ? cols[iZip]   : '?',
                    name: iName >= 0 ? cols[iName]  : '?',
                    colCount: cols.length,
                    iCode, iNif, iAddr, iZip, iName,
                });
            }
            return res.json({ debug: true, headerIdx, delim, headers, samples: dbg });
        }

        // Temporary diagnostic log
        console.log('[CSV] headerIdx=%d delim=%s headers=%j', headerIdx, delim, headers);
        console.log('[CSV] colIdx code=%d nif=%d addr=%d zip=%d name=%d', iCode, iNif, iAddr, iZip, iName);

        const clients = [];
        for (let i = headerIdx + 1; i < lines.length; i++) {
            const cols = splitCsvLine(lines[i], delim);
            const rawNif = (cols[iNif] || '').replace(/\D/g, '').trim();
            if (i <= headerIdx + 3) {
                console.log('[CSV] row %d: cols=%d nif=%j addr=%j zip=%j', i, cols.length,
                    iNif >= 0 ? cols[iNif] : '?', iAddr >= 0 ? cols[iAddr] : '?', iZip >= 0 ? cols[iZip] : '?');
            }
            if (!rawNif || rawNif === '0') continue;

            const code = iCode >= 0 ? (cols[iCode] || '').trim() : '';
            const addr = iAddr >= 0 ? (cols[iAddr] || '').trim() : '';
            const zip  = iZip  >= 0 ? (cols[iZip]  || '').trim().replace(/\s/g, '') : '';
            const name = iName >= 0 ? (cols[iName]  || '').trim() : '';

            // If no dedicated address column, extract from company name
            // "Adm. de Condominio Rua Casal da Serra nº19" → "Rua Casal da Serra nº19"
            const effectiveAddr = addr || (() => {
                const m = name.match(/(?:condomi[nô]{1,2}s?\s+|condominium\s+)(.+)/i);
                return m ? m[1].trim() : name;
            })();

            clients.push({ code, nif: rawNif, address: effectiveAddr, zip, name });
        }

        const updated  = [];
        const notFound = [];
        const doneIds  = new Set();

        for (const c of clients) {
            let matched = false;

            // Primary: already has moloniCode set
            if (c.code) {
                const lifts = await Lift.find({ moloniCode: c.code }, '_id municipalNumber address nif').lean();
                for (const lift of lifts) {
                    if (doneIds.has(String(lift._id))) continue;
                    await Lift.updateOne({ _id: lift._id }, { $set: { nif: c.nif } });
                    doneIds.add(String(lift._id));
                    updated.push({ municipalNumber: lift.municipalNumber, street: lift.address?.street, nif: c.nif, matchedBy: 'moloniCode' });
                    matched = true;
                }
            }

            if (matched) continue;

            // Fallback: zip + street keyword + exact house number
            if (c.zip && c.address) {
                const houseNum = extractHouseNumCsv(c.address);
                // ≥4 chars, not a number token, not "nº" — handles "Tejo" (4 chars)
                const keyword  = c.address.split(/\s+/).find(w =>
                    w.length >= 4 && !/^\d/.test(w) && !/^n[º°.]/i.test(w)
                );
                if (houseNum) {
                    const queryConditions = [
                        { 'address.zipCode':  c.zip },
                        { 'address.street': { $regex: `\\b${houseNum}\\b` } },
                    ];
                    if (keyword) queryConditions.splice(1, 0, { 'address.street': { $regex: keyword, $options: 'i' } });
                    const lifts = await Lift.find(
                        { $and: queryConditions },
                        '_id municipalNumber address nif'
                    ).lean();

                    for (const lift of lifts) {
                        if (doneIds.has(String(lift._id))) continue;
                        const upd = { nif: c.nif };
                        if (c.code) upd.moloniCode = c.code;
                        await Lift.updateOne({ _id: lift._id }, { $set: upd });
                        doneIds.add(String(lift._id));
                        updated.push({ municipalNumber: lift.municipalNumber, street: lift.address?.street, nif: c.nif, matchedBy: 'address' });
                        matched = true;
                    }
                }
            }

            if (!matched) notFound.push({ name: c.name, nif: c.nif, address: c.address });
        }

        res.json({
            success:     true,
            updated:     updated.length,
            notFound:    notFound.length,
            details:     updated,
            notFoundList: notFound,
        });

    } catch (err) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).json({ success: false, message: err.message });
    }
};
