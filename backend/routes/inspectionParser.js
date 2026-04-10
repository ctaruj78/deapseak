/**
 * Inspection PDF Parser Route
 * POST /api/lifts/parse-inspection-pdf
 * — Parses a Bureau Veritas / CML Lisboa / Rinave PDF inspection report
 * — Returns extracted data + best-matching lift candidates
 * — Symmetric confirm endpoint handled by existing /api/lifts/:id/inspection-report
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleAuth');
const Lift = require('../models/Lift');
const { parseBureauVeritasPDF } = require('../../services/pdf-parser-bureau-veritas');
const { parsePDF: parsePDFEnhanced } = require('../../services/pdf-parser-enhanced');
const pdfParse = require('pdf-parse');

/**
 * Universal inspection PDF parser.
 * Routes between Bureau-Veritas specialized parser and the AI-assistant enhanced parser.
 * Falls back to the enhanced parser when the BV parser fails or the document is unrecognised.
 */
async function parseUniversal(filePath) {
    let bvResult = null;

    // ── Step 1: peek at first-page text to decide which parser to try first ──
    try {
        const buf = require('fs').readFileSync(filePath);
        const peek = await pdfParse(buf, { max: 1 });
        const txt = peek.text || '';

        const isBV = txt.includes('BUREAU VERITAS') || /(?:NB|DT)\d{4}-\d{4}/.test(txt);
        if (isBV) {
            console.log('📋 Detected Bureau Veritas report — using BV parser');
            bvResult = await parseBureauVeritasPDF(filePath);
            if (bvResult && bvResult.success) {
                bvResult._parserUsed = 'bureau_veritas';
                return bvResult;
            }
            console.warn('⚠️ BV parser failed, falling back to enhanced parser');
        }
    } catch (peekErr) {
        console.warn('⚠️ Peek failed:', peekErr.message);
    }

    // ── Step 2: try enhanced (AI-grade) parser ────────────────────────────────
    try {
        const enhanced = await parsePDFEnhanced(filePath);
        if (enhanced && enhanced.success) {
            enhanced._parserUsed = 'enhanced';
            return enhanced;
        }
        console.warn('⚠️ Enhanced parser also failed');
    } catch (enhErr) {
        console.warn('⚠️ Enhanced parser threw:', enhErr.message);
    }

    // ── Step 3: last-resort — try BV parser anyway (handles APCER, GATECI etc) ─
    if (!bvResult) {
        try {
            bvResult = await parseBureauVeritasPDF(filePath);
            if (bvResult) {
                bvResult._parserUsed = 'bureau_veritas_fallback';
                return bvResult;
            }
        } catch (_) {}
    }

    // Nothing worked
    return { success: false, error: 'All parsers failed to extract text from this PDF.' };
}

/**
 * Normalise parsed result so the rest of the route can use a single field layout
 * regardless of which parser produced the result.
 */
function normaliseResult(parsed) {
    // Enhanced parser wraps fields under `analysis` AND at top level; BV parser puts them only at top level.
    const meta   = parsed.metadata  || (parsed.analysis && parsed.analysis.metadata)  || {};
    const viols  = parsed.violations || (parsed.analysis && parsed.analysis.violations) || [];
    const stats  = parsed.stats     || (parsed.analysis && parsed.analysis.stats)     || { total: 0, critical: 0, medium: 0, low: 0 };
    const concl  = parsed.conclusion || (parsed.analysis && parsed.analysis.conclusion) || { approved: undefined, status: null };
    const passed = ('passed' in parsed)
        ? parsed.passed
        : ((parsed.analysis && 'passed' in parsed.analysis) ? parsed.analysis.passed : concl.approved);

    // Unify lift-id field name: BV uses `installationNumber`, enhanced uses `liftId`
    const installationNumber = meta.installationNumber || meta.liftId || meta.processNumber || null;

    return { meta: { ...meta, installationNumber }, viols, stats, concl, passed };
}

// ─── Multer: temp storage for uploaded PDFs ───────────────────────────────────
const tmpDir = path.join(__dirname, '../../uploads/tmp-pdf-parse');
const inspPdfDir = path.join(__dirname, '../../uploads/inspection-pdfs');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
if (!fs.existsSync(inspPdfDir)) fs.mkdirSync(inspPdfDir, { recursive: true });

const tmpStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, tmpDir),
    filename: (req, file, cb) => {
        const ts = Date.now();
        cb(null, `parse-${ts}${path.extname(file.originalname)}`);
    }
});

const uploadPdf = multer({
    storage: tmpStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are accepted'), false);
    },
    limits: { fileSize: 20 * 1024 * 1024 } // 20 MB
}).single('pdf');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a date string DD/MM/YYYY or YYYY-MM-DD to a Date object.
 */
function parseDate(str) {
    if (!str) return null;
    const raw = String(str).trim();

    const monthMap = {
        janeiro: 1, fevereiro: 2, marco: 3, março: 3, abril: 4, maio: 5, junho: 6,
        julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12
    };

    const clean = raw
        .replace(/\s+/g, ' ')
        .replace(/[;,]+$/, '')
        .trim();

    // DD/MM/YYYY або DD-MM-YYYY або DD.MM.YYYY
    let match = clean.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        return new Date(year, month - 1, day);
    }

    // YYYY/MM/DD або YYYY-MM-DD
    match = clean.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/);
    if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        return new Date(year, month - 1, day);
    }

    // 30 de Junho de 2025
    match = clean
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .match(/^(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})$/);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = monthMap[match[2]];
        const year = parseInt(match[3], 10);
        if (month) return new Date(year, month - 1, day);
    }

    const d = new Date(clean);
    return isNaN(d) ? null : d;
}

function extractInspectionDateFromRawText(text = '') {
    const labeledPatterns = [
        /Data\s+da\s+Inspe[çc][aã]o\s*[:\-]?\s*([^\n]{4,40})/i,
        /Data\s+de\s+Inspe[çc][aã]o\s*[:\-]?\s*([^\n]{4,40})/i,
        /Data\s+Inspe[çc][aã]o\s*[:\-]?\s*([^\n]{4,40})/i
    ];

    for (const pattern of labeledPatterns) {
        const labeled = text.match(pattern);
        if (labeled && labeled[1]) {
            const candidate = labeled[1].split('|')[0].trim();
            const parsed = parseDate(candidate);
            if (parsed) return parsed;
        }
    }

    const genericPatterns = [
        /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})\b/,
        /\b(\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})\b/,
        /\b(\d{1,2}\s+de\s+[A-Za-zçãõéêáíóúÇÃÕÉÊÁÍÓÚ]+\s+de\s+\d{4})\b/
    ];

    for (const pattern of genericPatterns) {
        const found = text.match(pattern);
        if (found && found[1]) {
            const parsed = parseDate(found[1]);
            if (parsed) return parsed;
        }
    }

    return null;
}

/**
 * Calculate validUntil:
 *  passed  → inspection date + 24 months (2 years)
 *  failed  → inspection date + 6 months
 *  conditional → inspection date + 12 months
 */
function calcValidUntil(inspDate, passed) {
    if (!inspDate) return null;
    const d = new Date(inspDate);
    if (passed === true)  d.setMonth(d.getMonth() + 24);
    else if (passed === false) d.setMonth(d.getMonth() + 6);
    else d.setMonth(d.getMonth() + 12); // undefined / conditional
    return d;
}

/**
 * Simple string similarity score (0-1) using common word overlap.
 */
function addressSimilarity(a = '', b = '') {
    const words = s => s.toLowerCase().replace(/[^a-záéíóúàâêôãõç0-9\s]/gi, '').split(/\s+/).filter(Boolean);
    const wa = new Set(words(a));
    const wb = words(b);
    if (!wa.size || !wb.length) return 0;
    const common = wb.filter(w => wa.has(w)).length;
    return common / Math.max(wa.size, wb.length);
}

function normalizeText(value = '') {
    return String(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractPostalCode(text = '') {
    const match = String(text).match(/\b(\d{4}-\d{3}|\d{4}\s\d{3})\b/);
    return match ? match[1].replace(/\s/g, '-') : null;
}

function extractUsefulAddressToken(location = '') {
    const stopWords = new Set(['rua', 'avenida', 'av', 'travessa', 'praca', 'largo', 'estrada', 'n', 'no']);
    const tokens = normalizeText(location).split(' ').filter(t => t.length > 2 && !stopWords.has(t));
    return tokens[0] || null;
}

/**
 * Score a lift against extracted metadata. Returns 0-100.
 */
function scoreLift(lift, meta) {
    let score = 0;

    if (meta.installationNumber) {
        const inst = meta.installationNumber.trim();
        if (lift.serialNumber && lift.serialNumber.trim() === inst) score += 60;
        else if (lift.municipalNumber && lift.municipalNumber.trim() === inst) score += 55;
    }

    if (meta.location) {
        const addressStr = [lift.address?.street, lift.address?.zipCode, lift.address?.city].filter(Boolean).join(', ');
        const sim = addressSimilarity(meta.location, addressStr);
        score += Math.round(sim * 40);

        const metaZip = extractPostalCode(meta.location);
        const liftZip = extractPostalCode(lift.address?.zipCode || '');
        if (metaZip && liftZip) {
            if (metaZip === liftZip) score += 25;
            else score -= 20;
        }

        const normalizedLocation = normalizeText(meta.location);
        const normalizedCity = normalizeText(lift.address?.city || '');
        if (normalizedCity && normalizedLocation.includes(normalizedCity)) {
            score += 15;
        }
    }

    return Math.max(0, Math.min(score, 100));
}

// ─── Route: POST /api/lifts/parse-inspection-pdf ──────────────────────────────

router.post('/parse-inspection-pdf', authenticate, authorizeRoles('admin', 'dispatcher'), (req, res) => {
    uploadPdf(req, res, async (uploadErr) => {
        const tmpPath = req.file ? req.file.path : null;

        // Cleanup helper
        const cleanup = () => { try { if (tmpPath && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {} };

        if (uploadErr) {
            cleanup();
            return res.status(400).json({ success: false, message: uploadErr.message });
        }

        if (!tmpPath) {
            return res.status(400).json({ success: false, message: 'Файл PDF не завантажено' });
        }

        try {
            // ── Parse the PDF with universal router ───────────────────────
            const parsed = await parseUniversal(tmpPath);

            // Even a partial result (success:false) is still useful if we at
            // least extracted some text — let the user fill in missing fields.
            const hasText = parsed && (parsed.rawText || '').length > 50;
            const partialOk = parsed && !parsed.success && hasText;

            if (!parsed || (!parsed.success && !partialOk)) {
                if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
                return res.status(422).json({
                    success: false,
                    message: 'Не вдалося прочитати текст з PDF. Можливо, файл є скан-зображенням без текстового шару або пошкоджений.',
                    details: parsed?.error || null
                });
            }

            const { meta, viols, stats, concl, passed } = normaliseResult(parsed);

            // ── Move file to permanent location ───────────────────────────
            const savedFilename = `insp-${Date.now()}.pdf`;
            const savedPath = path.join(inspPdfDir, savedFilename);
            fs.renameSync(tmpPath, savedPath);
            const savedFileUrl = `/uploads/inspection-pdfs/${savedFilename}`;

            // ── Build unified dates from normalised metadata ───────────────
            let inspectionDate = parseDate(meta.date);
            if (!inspectionDate) {
                inspectionDate = extractInspectionDateFromRawText(parsed.rawText || '');
            }
            const validUntil     = calcValidUntil(inspectionDate, passed);

            // ── Prepare extracted data ─────────────────────────────────────
            const extractedData = {
                reportType:         parsed.reportType || (parsed.analysis && parsed.analysis.reportType) || 'inspection',
                reportNumber:       meta.reportNumber || null,
                installationNumber: meta.installationNumber || null,
                date:               inspectionDate ? inspectionDate.toISOString() : null,
                dateFormatted:      meta.date || (inspectionDate ? inspectionDate.toISOString().substring(0, 10) : null),
                location:           meta.location || null,
                inspector:          meta.inspector || meta.company || null,
                company:            meta.company || null,
                owner:              meta.owner || null,
                maintenanceCompany: meta.maintenanceCompany || null,
                processNumber:      meta.processNumber || null,
                passed:             passed,
                status:             passed === true ? 'passed' : passed === false ? 'failed' : 'conditional',
                conclusion:         concl?.status || (concl?.approved === true ? 'passed' : concl?.approved === false ? 'failed' : null),
                validUntil:         validUntil ? validUntil.toISOString() : null,
                violations:         viols.slice(0, 50),
                stats:              stats || { total: 0, critical: 0, medium: 0, low: 0 },
                pageCount:          parsed.pageCount || null,
                savedFileUrl:       savedFileUrl,
                parserUsed:         parsed._parserUsed || 'unknown',
                partial:            !parsed.success   // flag for frontend to hint user to review
            };

            // ── Search for matching lifts ─────────────────────────────────
            let allMatches = [];

            // Build DB filter: try exact serial/municipal number match first
            const instNum = extractedData.installationNumber;
            const filters = [];

            if (instNum) {
                filters.push({ serialNumber: instNum });
                filters.push({ municipalNumber: instNum });
            }

            if (meta.location) {
                const token = extractUsefulAddressToken(meta.location);
                if (token) {
                    filters.push({ 'address.street': { $regex: token, $options: 'i' } });
                }

                const zip = extractPostalCode(meta.location);
                if (zip) {
                    filters.push({ 'address.zipCode': { $regex: zip, $options: 'i' } });
                }
            }

            if (filters.length) {
                const candidates = await Lift.find({ $or: filters })
                    .select('_id municipalNumber serialNumber address clientName manufacturer model status lastInspectionDate')
                    .lean()
                    .limit(10);

                allMatches = candidates.map(l => ({
                    ...l,
                    confidence: scoreLift(l, meta)
                })).sort((a, b) => b.confidence - a.confidence)
                  .slice(0, 10);
            }

            const topMatch = allMatches.length > 0 ? allMatches[0] : null;
            const AUTO_MATCH_THRESHOLD = 35;
            const suggestedLift = topMatch && topMatch.confidence >= AUTO_MATCH_THRESHOLD ? topMatch : null;

            return res.json({                success: true,
                extractedData,
                suggestedLift,
                confidence: suggestedLift?.confidence ?? 0,
                allMatches,
                rawTextPreview: (parsed.rawText || '').substring(0, 500)
            });

        } catch (err) {
            cleanup();
            console.error('❌ PDF inspection parser error:', err);
            return res.status(500).json({
                success: false,
                message: 'Помилка при аналізі PDF',
                error: err.message
            });
        }
    });
});

// ─── Route: POST /api/lifts/:id/confirm-inspection-from-pdf ──────────────────
// Saves the confirmed parsed PDF data as an inspection history entry on the lift
router.post('/:id/confirm-inspection-from-pdf', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const {
            inspector,
            notes,
            reportType,
            status,        // 'passed' | 'failed' | 'conditional'
            savedFileUrl,  // path saved during parse step
            lastInspectionDate,
            nextInspectionDate,
            violations
        } = req.body;

        const lift = await Lift.findById(req.params.id);
        if (!lift) return res.status(404).json({ success: false, message: 'Ліфт não знайдено' });

        // Build violation notes summary
        let violationNotes = notes || '';
        if (violations && violations.length) {
            violationNotes = (notes ? notes + '\n\n' : '') +
                'Порушення:\n' + violations.map(v => `• [${v.severity || '?'}] ${v.description || v}`).join('\n');
        }

        const report = {
            date: lastInspectionDate ? new Date(lastInspectionDate) : new Date(),
            inspector: inspector || 'Bureau Veritas',
            notes: violationNotes,
            reportType: reportType || 'annual',
            status: status || 'passed',
            reportFile: savedFileUrl || null,
            photos: []
        };

        lift.inspectionHistory.push(report);
        lift.lastInspectionDate = report.date;
        if (nextInspectionDate) {
            lift.nextInspectionDate = new Date(nextInspectionDate);
        } else if (status === 'passed') {
            // Default: +24 months
            const nd = new Date(report.date);
            nd.setMonth(nd.getMonth() + 24);
            lift.nextInspectionDate = nd;
        } else {
            // Failed: +6 months
            const nd = new Date(report.date);
            nd.setMonth(nd.getMonth() + 6);
            lift.nextInspectionDate = nd;
        }

        await lift.save();

        res.json({
            success: true,
            message: 'Звіт інспекції збережено',
            inspectionEntry: report,
            nextInspectionDate: lift.nextInspectionDate
        });
    } catch (err) {
        console.error('❌ confirm-inspection-from-pdf error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── Route: PATCH /api/lifts/:id/update-inspection-dates ─────────────────────
// Called after confirming parsed report — updates lift's next inspection date
router.patch('/:id/update-inspection-dates', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const { lastInspectionDate, nextInspectionDate } = req.body;

        const update = {};
        if (lastInspectionDate) update.lastInspectionDate = new Date(lastInspectionDate);
        if (nextInspectionDate) update.nextInspectionDate = new Date(nextInspectionDate);

        if (!Object.keys(update).length) {
            return res.status(400).json({ success: false, message: 'Немає полів для оновлення' });
        }

        const lift = await Lift.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
        if (!lift) return res.status(404).json({ success: false, message: 'Ліфт не знайдено' });

        res.json({ success: true, message: 'Дати інспекції оновлено', lift });
    } catch (err) {
        console.error('❌ update-inspection-dates error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
