const Lift = require('../models/Lift');
const LiftInvoice = require('../models/LiftInvoice');

// GET /api/lifts/:liftId/invoices?year=2025
// year: omit or 'all' for all years, or '2025' for specific year
exports.getInvoicesByLift = async (req, res) => {
    try {
        const liftId = req.params.liftId || req.params.id;

        // Security: verify lift access
        const lift = await Lift.findById(liftId, '_id client nif').lean();
        if (!lift) return res.status(404).json({ success: false, message: 'Elevador não encontrado' });

        if (req.user.role === 'client') {
            if (!lift.client || lift.client.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, message: 'Acesso negado' });
            }
        } else if (!['admin', 'dispatcher'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Acesso negado' });
        }

        const year = req.query.year;
        const query = { liftId: lift._id };
        if (year && year !== 'all') query.fiscalYear = String(year);

        const invoices = await LiftInvoice.find(query)
            .sort({ invoiceDate: -1 })
            .lean();

        // Get all years with data for this lift
        const allYears = await LiftInvoice.distinct('fiscalYear', { liftId: lift._id });
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

        const lift = await Lift.findById(liftId, '_id client').lean();
        if (!lift) return res.status(404).json({ success: false, message: 'Elevador não encontrado' });

        if (req.user.role === 'client') {
            if (!lift.client || lift.client.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, message: 'Acesso negado' });
            }
        } else if (!['admin', 'dispatcher'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Acesso negado' });
        }

        const currentYear = String(new Date().getFullYear());
        const invoices = await LiftInvoice.find(
            { liftId: lift._id, fiscalYear: currentYear },
            'status grossTotal amountPaid outstanding'
        ).lean();

        const allYears = await LiftInvoice.distinct('fiscalYear', { liftId: lift._id });
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
