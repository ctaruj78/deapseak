const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleAuth');
const { Request, Lift, User } = require('../models');

// In-memory store for generated reports (production should use DB/file storage)
const generatedReports = new Map();

// GET /api/reports - список останніх згенерованих звітів
router.get('/', authenticate, authorizeRoles('admin', 'dispatcher'), (req, res) => {
    const list = Array.from(generatedReports.values())
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 50);
    res.json({ reports: list, total: list.length });
});

// POST /api/reports/generate - генерація звіту за параметрами
router.post('/generate', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const { type = 'maintenance', startDate, endDate, technicianId, status } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Вкажіть startDate та endDate' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Невірний формат дати' });
        }

        // Будуємо запит до БД
        const query = {
            createdAt: { $gte: start, $lte: end }
        };
        if (status) query.status = status;
        if (technicianId) query.assignedTo = technicianId;

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
            createdBy: req.user._id,
            stats,
            items,
        };

        generatedReports.set(reportId, { id: reportId, type, startDate, endDate, createdAt: report.createdAt, stats });

        res.json(report);
    } catch (err) {
        console.error('Reports generate error:', err);
        res.status(500).json({ message: 'Помилка генерації звіту', error: err.message });
    }
});

// GET /api/reports/:id/pdf - заглушка PDF (повертає JSON поки не підключена бібліотека)
router.get('/:id/pdf', authenticate, (req, res) => {
    const report = generatedReports.get(req.params.id);
    if (!report) return res.status(404).json({ message: 'Звіт не знайдено' });
    res.json({ message: 'PDF export не реалізовано', report });
});

// GET /api/reports/:id/excel - заглушка Excel
router.get('/:id/excel', authenticate, (req, res) => {
    const report = generatedReports.get(req.params.id);
    if (!report) return res.status(404).json({ message: 'Звіт не знайдено' });
    res.json({ message: 'Excel export не реалізовано', report });
});

module.exports = router;
