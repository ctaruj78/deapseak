const Lift = require('../models/Lift');
const LiftInvoice = require('../models/LiftInvoice');

// GET /api/client/invoices?year=2025
// Auth: client role only — aggregates all invoices across all client's lifts
exports.getInvoicesByClient = async (req, res) => {
    try {
        if (req.user.role !== 'client') {
            return res.status(403).json({ success: false, message: 'Acesso negado' });
        }

        const userId = req.user._id || req.user.id;
        const lifts = await Lift.find({ client: userId }, 'moloniCode nif').lean();
        const emptySummary = {
            totalGross: 0, totalPaid: 0, totalOutstanding: 0,
            totalPending: 0, totalOverdue: 0,
            countTotal: 0, countPaid: 0, countPending: 0, countOverdue: 0,
        };
        const currentYear = new Date().getFullYear();

        if (!lifts.length) {
            return res.json({ success: true, invoices: [], summary: emptySummary, years: [], currentYear });
        }

        const moloniCodes = [...new Set(lifts.map(l => l.moloniCode).filter(Boolean))];
        const nifs        = [...new Set(lifts.map(l => l.nif).filter(Boolean))];

        if (!moloniCodes.length && !nifs.length) {
            return res.json({ success: true, invoices: [], summary: emptySummary, years: [], currentYear });
        }

        const $or = [];
        if (moloniCodes.length) $or.push({ moloniCode: { $in: moloniCodes } });
        if (nifs.length)        $or.push({ nif:        { $in: nifs        } });

        const year  = req.query.year;
        const query = { $or };
        if (year && year !== 'all') {
            const y = parseInt(year, 10);
            query.invoiceDate = { $gte: new Date(`${y}-01-01`), $lte: new Date(`${y}-12-31T23:59:59.999Z`) };
        }

        const invoices = await LiftInvoice.find(query).sort({ invoiceDate: -1 }).lean();
        const yearAgg = await LiftInvoice.aggregate([
            { $match: { $or } },
            { $group: { _id: { $year: '$invoiceDate' } } },
            { $sort: { _id: -1 } },
        ]);
        const years = yearAgg.map(d => d._id).filter(Boolean);

        const summary = { ...emptySummary };
        for (const inv of invoices) {
            if (inv.status === 'cancelled') continue;
            summary.totalGross       += inv.grossTotal || 0;
            summary.totalPaid        += inv.amountPaid || 0;
            summary.totalOutstanding += inv.outstanding || 0;
            summary.countTotal++;
            if (inv.status === 'paid') {
                summary.countPaid++;
            } else if (inv.status === 'overdue') {
                summary.countOverdue++;
                summary.totalOverdue += inv.outstanding || 0;
            } else {
                summary.countPending++;
                summary.totalPending += inv.outstanding || 0;
            }
        }

        res.json({ success: true, invoices, summary, years, currentYear });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/lifts/:liftId/invoices?year=2025
// year: omit or 'all' for all years, or '2025' for specific year
exports.getInvoicesByLift = async (req, res) => {
    try {
        const liftId = req.params.liftId || req.params.id;

        // Security: verify lift access
        const lift = await Lift.findById(liftId, '_id client nif moloniCode municipalNumber').lean();
        if (!lift) return res.status(404).json({ success: false, message: 'Elevador não encontrado' });

        if (req.user.role === 'client') {
            const uid = (req.user._id || req.user.id || '').toString();
            if (!lift.client || lift.client.toString() !== uid) {
                return res.status(403).json({ success: false, message: 'Acesso negado' });
            }
        } else if (!['admin', 'dispatcher'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Acesso negado' });
        }

        const year = req.query.year;
        let query;
        if (lift.moloniCode) {
            query = { moloniCode: lift.moloniCode };
        } else if (lift.nif) {
            query = { nif: lift.nif };
        } else {
            const emptySummary = {
                totalGross: 0, totalPaid: 0, totalOutstanding: 0,
                totalPending: 0, totalOverdue: 0,
                countTotal: 0, countPaid: 0, countPending: 0, countOverdue: 0,
            };
            return res.json({ success: true, invoices: [], summary: emptySummary, years: [], currentYear: new Date().getFullYear() });
        }
        if (year && year !== 'all') {
            const y = parseInt(year, 10);
            query.invoiceDate = { $gte: new Date(`${y}-01-01`), $lte: new Date(`${y}-12-31T23:59:59.999Z`) };
        }

        const invoices = await LiftInvoice.find(query)
            .sort({ invoiceDate: -1 })
            .lean();

        // Derive years from actual invoice dates (not fiscalYear field, which may be stale)
        const yearQuery = lift.moloniCode ? { moloniCode: lift.moloniCode } : { nif: lift.nif };
        const yearAgg = await LiftInvoice.aggregate([
            { $match: yearQuery },
            { $group: { _id: { $year: '$invoiceDate' } } },
            { $sort: { _id: -1 } },
        ]);
        const years = yearAgg.map(d => d._id).filter(Boolean);
        const currentYear = new Date().getFullYear();

        // Summary
        const summary = {
            totalGross: 0,
            totalPaid: 0,
            totalOutstanding: 0,
            totalPending: 0,
            totalOverdue: 0,
            countTotal: 0,
            countPaid: 0,
            countPending: 0,
            countOverdue: 0,
        };
        for (const inv of invoices) {
            if (inv.status === 'cancelled') continue;
            summary.totalGross += inv.grossTotal || 0;
            summary.totalPaid += inv.amountPaid || 0;
            summary.totalOutstanding += inv.outstanding || 0;
            summary.countTotal++;
            if (inv.status === 'paid') {
                summary.countPaid++;
            } else if (inv.status === 'overdue') {
                summary.countOverdue++;
                summary.totalOverdue += inv.outstanding || 0;
            } else {
                summary.countPending++;
                summary.totalPending += inv.outstanding || 0;
            }
        }

        res.json({ success: true, invoices, summary, years, currentYear, municipalNumber: lift.municipalNumber });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/lifts/:liftId/invoices/summary
exports.getInvoiceSummaryForLift = async (req, res) => {
    try {
        const liftId = req.params.liftId || req.params.id;

        const lift = await Lift.findById(liftId, '_id client nif moloniCode').lean();
        if (!lift) return res.status(404).json({ success: false, message: 'Elevador não encontrado' });

        if (req.user.role === 'client') {
            const uid = (req.user._id || req.user.id || '').toString();
            if (!lift.client || lift.client.toString() !== uid) {
                return res.status(403).json({ success: false, message: 'Acesso negado' });
            }
        } else if (!['admin', 'dispatcher'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Acesso negado' });
        }

        const currentYear = String(new Date().getFullYear());
        let baseQuery;
        if (lift.moloniCode) {
            baseQuery = { moloniCode: lift.moloniCode };
        } else if (lift.nif) {
            baseQuery = { nif: lift.nif };
        } else {
            const emptySummary = {
                totalGross: 0, totalPaid: 0, totalOutstanding: 0,
                totalPending: 0, totalOverdue: 0,
                countTotal: 0, countPaid: 0, countPending: 0, countOverdue: 0,
            };
            return res.json({ success: true, summary: emptySummary, years: [], currentYear: Number(currentYear) });
        }

        const invoices = await LiftInvoice.find(
            { ...baseQuery, fiscalYear: currentYear },
            'status grossTotal amountPaid outstanding'
        ).lean();

        const allYears = await LiftInvoice.distinct('fiscalYear', baseQuery);
        const years = allYears.filter(Boolean).map(Number).sort((a, b) => b - a);

        const summary = {
            totalGross: 0, totalPaid: 0, totalOutstanding: 0,
            totalPending: 0, totalOverdue: 0,
            countTotal: 0, countPaid: 0, countPending: 0, countOverdue: 0,
        };
        for (const inv of invoices) {
            if (inv.status === 'cancelled') continue;
            summary.totalGross += inv.grossTotal || 0;
            summary.totalPaid += inv.amountPaid || 0;
            summary.totalOutstanding += inv.outstanding || 0;
            summary.countTotal++;
            if (inv.status === 'paid') {
                summary.countPaid++;
            } else if (inv.status === 'overdue') {
                summary.countOverdue++;
                summary.totalOverdue += inv.outstanding || 0;
            } else {
                summary.countPending++;
                summary.totalPending += inv.outstanding || 0;
            }
        }

        res.json({ success: true, summary, years, currentYear: Number(currentYear) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/invoices/:invoiceNo/pdf
// Auth: admin, dispatcher, client (client only if lift belongs to them)
exports.getInvoicePdf = async (req, res) => {
    try {
        const invoiceNo = (req.query.no || '').trim();
        if (!invoiceNo) return res.status(400).json({ success: false, message: 'Número de fatura inválido' });

        const inv = await LiftInvoice.findOne({ invoiceNo }).lean();
        if (!inv) return res.status(404).json({ success: false, message: 'Fatura não encontrada' });

        // Security: clients may only see invoices tied to their lifts
        if (req.user.role === 'client') {
            const uid = (req.user._id || req.user.id || '').toString();
            const lift = await Lift.findOne({
                client: uid,
                $or: [
                    inv.moloniCode ? { moloniCode: inv.moloniCode } : null,
                    inv.nif        ? { nif: inv.nif }               : null,
                ].filter(Boolean),
            }, '_id').lean();
            if (!lift) return res.status(403).json({ success: false, message: 'Acesso negado' });
        } else if (!['admin', 'dispatcher'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Acesso negado' });
        }

        // ── Try Moloni API first (original PDF with ATCUD) ──────────────────────
        const moloni = require('../../services/moloniService');
        if (moloni.isConfigured()) {
            try {
                await moloni.streamInvoicePdf(invoiceNo, res);
                return;
            } catch (moloniErr) {
                console.warn('[Moloni PDF] Falhou para', invoiceNo, '—', moloniErr.message, '— usando PDF local');
                if (res.headersSent) return;
            }
        }

        // ── Fallback: generate summary PDF locally ──────────────────────────────
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        const chunks = [];
        doc.on('data', c => chunks.push(c));
        doc.on('end', () => {
            const buf = Buffer.concat(chunks);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="Fatura_${invoiceNo}.pdf"`);
            res.setHeader('Content-Length', buf.length);
            res.send(buf);
        });

        const fmt  = n => Number(n || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
        const fmtD = d => d ? new Date(d).toLocaleDateString('pt-PT') : '—';
        const statusLabel = { paid: 'Pago', partial: 'Parcial', overdue: 'Em atraso', pending: 'Pendente', cancelled: 'Anulado' };
        const typeLabel   = { FT: 'Fatura', FR: 'Fatura-Recibo', ND: 'Nota de Débito', NC: 'Nota de Crédito' };

        // ── Header ─────────────────────────────────────────────────────────────
        doc.fontSize(20).font('Helvetica-Bold').fillColor('#c0392b')
            .text('FestLift — Elevadores e Serviços, Lda.', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(9).font('Helvetica').fillColor('#555')
            .text('NIF: 515 924 741  |  info@festlift.pt  |  +351 214 190 863', { align: 'center' });

        doc.moveDown(0.8);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#c0392b').lineWidth(1.5).stroke();
        doc.moveDown(0.5);

        // ── Title ──────────────────────────────────────────────────────────────
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#222')
            .text((typeLabel[inv.invoiceType] || inv.invoiceType || 'Fatura') + ' ' + invoiceNo, { align: 'center' });
        doc.moveDown(1);

        // ── Info block ─────────────────────────────────────────────────────────
        const col1 = 50, col2 = 300;
        const infoRow = (label, value, x, y) => {
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#555').text(label, x, y);
            doc.fontSize(10).font('Helvetica').fillColor('#111').text(String(value || '—'), x, y + 12);
        };

        const y0 = doc.y;
        infoRow('Cliente', inv.customerName, col1, y0);
        infoRow('NIF', inv.customerTaxId, col2, y0);

        doc.moveDown(2.5);
        const y1 = doc.y;
        infoRow('Data da fatura', fmtD(inv.invoiceDate), col1, y1);
        infoRow('Data de vencimento', fmtD(inv.dueDate), col2, y1);

        doc.moveDown(2.5);

        // ── Totals table ───────────────────────────────────────────────────────
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ddd').lineWidth(1).stroke();
        doc.moveDown(0.5);

        const tHeaders = ['Descrição', 'Total', 'Pago', 'Em dívida'];
        const tCols    = [50, 330, 410, 490];
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#555');
        const headerY = doc.y;
        tHeaders.forEach((h, i) => doc.text(h, tCols[i], headerY, { width: 80, align: i === 0 ? 'left' : 'right' }));
        doc.moveDown(0.6);

        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ddd').lineWidth(0.5).stroke();
        doc.moveDown(0.4);

        const descLabel = (typeLabel[inv.invoiceType] || 'Serviço') + ' de manutenção de elevadores';
        const rowY = doc.y;
        doc.fontSize(10).font('Helvetica').fillColor('#111')
            .text(descLabel, tCols[0], rowY, { width: 260 })
            .text(fmt(inv.grossTotal),  tCols[1], rowY, { width: 80, align: 'right' })
            .text(fmt(inv.amountPaid),  tCols[2], rowY, { width: 80, align: 'right' })
            .text(fmt(inv.outstanding), tCols[3], rowY, { width: 80, align: 'right' });

        doc.moveDown(1.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#aaa').lineWidth(1).stroke();
        doc.moveDown(0.5);

        // Outstanding highlighted
        if ((inv.outstanding || 0) > 0.01) {
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#c0392b')
                .text('Total em dívida: ' + fmt(inv.outstanding), { align: 'right' });
        } else {
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#27ae60')
                .text('Fatura liquidada', { align: 'right' });
        }

        doc.moveDown(0.5);
        // Status badge
        doc.fontSize(10).font('Helvetica').fillColor('#555')
            .text('Estado: ' + (statusLabel[inv.status] || inv.status || '—') +
                  (inv.daysOverdue > 0 ? '  (' + inv.daysOverdue + ' dias em atraso)' : ''), { align: 'right' });

        doc.moveDown(2);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#eee').lineWidth(0.5).stroke();
        doc.moveDown(0.5);
        doc.fontSize(8).font('Helvetica').fillColor('#999')
            .text('Este documento é gerado automaticamente pelo sistema de gestão FestLift. Não constitui fatura fiscal original.', 50, doc.y, { align: 'center', width: 495 });

        doc.end();
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
