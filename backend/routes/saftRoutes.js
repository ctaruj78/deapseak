const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleAuth');
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

router.use(authenticate, isAdmin);

router.post('/upload', (req, res, next) => {
    uploadXml(req, res, (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });
        next();
    });
}, ctrl.uploadSaft);

router.post('/import-moloni', (req, res, next) => {
    uploadCsv(req, res, (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });
        next();
    });
}, ctrl.importMoloniClients);

router.get('/settings/ignored-nifs',        ctrl.getIgnoredNifs);
router.post('/settings/ignore/:nif',        ctrl.ignoreNif);
router.delete('/settings/ignore/:nif',      ctrl.unignoreNif);

router.get('/debtors',        ctrl.getAllDebtors);
router.post('/debtors/send',  ctrl.sendAlerts);

router.post('/import-pendentes', (req, res, next) => {
    uploadCsv(req, res, (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });
        next();
    });
}, ctrl.importPendentes);

router.get('/',             ctrl.listImports);
router.get('/:id',          ctrl.getImport);
router.post('/:id/resend',  ctrl.resendAlerts);
router.delete('/:id',       ctrl.deleteImport);

module.exports = router;
