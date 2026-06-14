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

const upload = multer({
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
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
}).single('saft');

router.use(authenticate, isAdmin);

router.post('/upload', (req, res, next) => {
    upload(req, res, (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });
        next();
    });
}, ctrl.uploadSaft);

router.get('/',         ctrl.listImports);
router.get('/:id',      ctrl.getImport);
router.post('/:id/resend',  ctrl.resendAlerts);
router.delete('/:id',       ctrl.deleteImport);

module.exports = router;
