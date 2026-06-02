const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleAuth');
const { Request, Lift, User } = require('../models');

// In-memory store for generated reports (production should use DB/file storage)
const generatedReports = new Map();

function resolveUserId(user) {
    return String(user?._id || user?.id || user?.userId || '');
}

function canAccessReport(req, report) {
    if (!report) return false;
    const role = String(req.user?.role || '').toLowerCase();
    if (role === 'admin' || role === 'dispatcher') return true;
    const ownerId = String(report.createdBy || '');
    return ownerId && ownerId === resolveUserId(req.user);
}

// GET /api/reports - список останніх згенерованих звітів
router.get('/', authenticate, authorizeRoles('admin', 'dispatcher', 'client'), (req, res) => {
    const role = String(req.user?.role || '').toLowerCase();
    let list = Array.from(generatedReports.values());
    if (role === 'client') {
        const ownerId = resolveUserId(req.user);
        list = list.filter((r) => String(r.createdBy || '') === ownerId);
    }

    list = list
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 50);
    res.json({ reports: list, total: list.length });
});

// POST /api/reports/generate - генерація звіту за параметрами
router.post('/generate', authenticate, authorizeRoles('admin', 'dispatcher', 'client'), async (req, res) => {
    try {
        const { type = 'maintenance', startDate, endDate, technicianId, status } = req.body;
        const role = String(req.user?.role || '').toLowerCase();

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Indique startDate e endDate' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Formato de data inválido' });
        }

        // Будуємо запит до БД
        const query = {
            createdAt: { $gte: start, $lte: end }
        };
        if (status) query.status = status;
        if (technicianId && role !== 'client') query.assignedTo = technicianId;
        if (role === 'client') query.client = resolveUserId(req.user);

        const requests = await Request.find(query)
            .populate('lift', 'serialNumber address model')
            .populate('assignedTo', 'name')
            .populate('client', 'name')
            .lean();

        // Статистика
        const stats = {
            total: requests.length,
            completed: requests.filter(r => r.status === 'completed').length,
            inProgress: requests.filter(r => r.status === 'in_progress').length,
            pending: requests.filter(r => ['new', 'assigned'].includes(r.status)).length,
            cancelled: requests.filter(r => r.status === 'cancelled').length,
        };

        // Формуємо рядки звіту
        const items = requests.map(r => ({
            id: r._id,
            title: r.title,
            lift: r.lift ? `${r.lift.model || ''} - ${r.lift.address || r.lift.serialNumber || ''}`.trim() : '—',
            technician: r.assignedTo ? r.assignedTo.name : '—',
            client: r.client ? r.client.name : '—',
            status: r.status,
            priority: r.priority,
            createdAt: r.createdAt,
            completedAt: r.completedAt || null,
        }));

        const reportId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const report = {
            id: reportId,
            type,
            startDate,
            endDate,
            createdAt: new Date().toISOString(),
            createdBy: resolveUserId(req.user),
            stats,
            items,
        };

        generatedReports.set(reportId, {
            id: reportId,
            type,
            startDate,
            endDate,
            createdAt: report.createdAt,
            stats,
            createdBy: resolveUserId(req.user),
            createdByRole: role
        });

        res.json(report);
    } catch (err) {
        console.error('Reports generate error:', err);
        res.status(500).json({ message: 'Erro ao gerar relatório', error: err.message });
    }
});

// GET /api/reports/:id/pdf - заглушка PDF (повертає JSON поки не підключена бібліотека)
router.get('/:id/pdf', authenticate, (req, res) => {
    const report = generatedReports.get(req.params.id);
    if (!report) return res.status(404).json({ message: 'Relatório não encontrado' });
    if (!canAccessReport(req, report)) return res.status(403).json({ message: 'Sem permissão para este relatório' });
    res.json({ message: 'Exportação PDF não implementada', report });
});

// GET /api/reports/:id/excel - заглушка Excel
router.get('/:id/excel', authenticate, (req, res) => {
    const report = generatedReports.get(req.params.id);
    if (!report) return res.status(404).json({ message: 'Relatório não encontrado' });
    if (!canAccessReport(req, report)) return res.status(403).json({ message: 'Sem permissão para este relatório' });
    res.json({ message: 'Excel export не реалізовано', report });
});

// DELETE /api/reports/:id - apagar relatório gerado
router.delete('/:id', authenticate, authorizeRoles('admin', 'dispatcher', 'client'), (req, res) => {
    const report = generatedReports.get(req.params.id);
    if (!report) return res.status(404).json({ message: 'Relatório não encontrado' });
    if (!canAccessReport(req, report)) return res.status(403).json({ message: 'Sem permissão para apagar este relatório' });

    generatedReports.delete(req.params.id);
    res.json({ success: true, message: 'Relatório removido' });
});

module.exports = router;
