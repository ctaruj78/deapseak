const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const { isAdmin, isAdminOrDispatcher } = require('../middleware/roleAuth');
const ctrl = require('../controllers/saftController');

const router = express.Router();

const saftDir = path.join(__dirname, '../../uploads/saft');
if (!fs.existsSync(saftDir)) fs.mkdirSync(saftDir, { recursive: true });

const uploadXml = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, saftDir),
        filename:    (req, file, cb) => cb(null, `saft-${Date.now()}${path.extname(file.originalname)}`),
    }),
    fileFilter: (req, file, cb) => {
        const ok = file.mimetype === 'text/xml'
            || file.mimetype === 'application/xml'
            || file.originalname.toLowerCase().endsWith('.xml');
        if (ok) cb(null, true);
        else cb(new Error('Apenas ficheiros XML SAF-T são permitidos'), false);
    },
    limits: { fileSize: 50 * 1024 * 1024 },
}).single('saft');

const uploadCsv = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, saftDir),
        filename:    (req, file, cb) => cb(null, `moloni-${Date.now()}.csv`),
    }),
    fileFilter: (req, file, cb) => {
        const ok = file.mimetype === 'text/csv'
            || file.mimetype === 'application/vnd.ms-excel'
            || file.originalname.toLowerCase().endsWith('.csv');
        if (ok) cb(null, true);
        else cb(new Error('Apenas ficheiros CSV são permitidos'), false);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
}).single('csv');

// Upload SAF-T XML — admin only
router.post('/upload', authenticate, isAdmin, (req, res, next) => {
    uploadXml(req, res, (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });
        next();
    });
}, ctrl.uploadSaft);

// Import Moloni clients CSV — admin only
router.post('/import-moloni', authenticate, isAdmin, (req, res, next) => {
    uploadCsv(req, res, (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });
        next();
    });
}, ctrl.importMoloniClients);

// Import pendentes CSV — admin only
router.post('/import-pendentes', authenticate, isAdmin, (req, res, next) => {
    uploadCsv(req, res, (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });
        next();
    });
}, ctrl.importPendentes);

// NIF ignore settings — admin only
router.get('/settings/ignored-nifs',   authenticate, isAdmin, ctrl.getIgnoredNifs);
router.post('/settings/ignore/:nif',   authenticate, isAdmin, ctrl.ignoreNif);
router.delete('/settings/ignore/:nif', authenticate, isAdmin, ctrl.unignoreNif);

// Delete import — admin only
router.delete('/:id', authenticate, isAdmin, ctrl.deleteImport);

// Read + send alerts — admin and dispatcher
router.get('/debtors',       authenticate, isAdminOrDispatcher, ctrl.getAllDebtors);
router.post('/debtors/send', authenticate, isAdminOrDispatcher, ctrl.sendAlerts);
router.get('/',              authenticate, isAdminOrDispatcher, ctrl.listImports);
router.get('/:id',           authenticate, isAdminOrDispatcher, ctrl.getImport);
router.post('/:id/resend',   authenticate, isAdminOrDispatcher, ctrl.resendAlerts);

module.exports = router;
