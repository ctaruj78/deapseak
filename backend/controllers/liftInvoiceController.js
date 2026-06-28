const Lift = require('../models/Lift');
const LiftInvoice = require('../models/LiftInvoice');

// GET /api/client/invoices?year=2025
// Auth: client role only — aggregates all invoices across all client's lifts
exports.getInvoicesByClient = async (req, res) => {
    try {
        if (req.user.role !== 'client') {
            return res.status(403).json({ success: false, message: 'Acesso negado' });
        }

        const lifts = await Lift.find({ client: req.user._id }, 'moloniCode nif').lean();
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
        if (year && year !== 'all') query.fiscalYear = String(year);

        const invoices = await LiftInvoice.find(query).sort({ invoiceDate: -1 }).lean();
        const allYears = await LiftInvoice.distinct('fiscalYear', { $or });
        const years    = allYears.filter(Boolean).map(Number).sort((a, b) => b - a);

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
        const lift = await Lift.findById(liftId, '_id client nif moloniCode').lean();
        if (!lift) return res.status(404).json({ success: false, message: 'Elevador não encontrado' });

        if (req.user.role === 'client') {
            if (!lift.client || lift.client.toString() !== req.user._id.toString()) {
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
        if (year && year !== 'all') query.fiscalYear = String(year);

        const invoices = await LiftInvoice.find(query)
            .sort({ invoiceDate: -1 })
            .lean();

        // Get all years with data for this client
        const yearQuery = lift.moloniCode ? { moloniCode: lift.moloniCode } : { nif: lift.nif };
        const allYears = await LiftInvoice.distinct('fiscalYear', yearQuery);
        const years = allYears.filter(Boolean).map(Number).sort((a, b) => b - a);
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

        res.json({ success: true, invoices, summary, years, currentYear });
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
            if (!lift.client || lift.client.toString() !== req.user._id.toString()) {
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
