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

    // DD/MM/YYYY ou DD-MM-YYYY ou DD.MM.YYYY
    let match = clean.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        return new Date(year, month - 1, day);
    }

    // YYYY/MM/DD ou YYYY-MM-DD
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
 * Calculate validUntil based on inspection result and clause types.
 *
 * Rules (Portuguese elevator inspection framework DL 320/2002):
 *  - No C2/C1 clauses (clean or only C3)  → 2-year certificate (+24 months)
 *  - C2 clauses present (reinspection)    → re-inspection in 30 days (+1 month)
 *  - C1 clauses present (immobilization)  → fix ASAP, reinspect ASAP (+30 days)
 *  - Generic failed / conditional fallback → +6 months
 */
function calcValidUntil(inspDate, passed, c1Count, c2Count) {
    if (!inspDate) return null;
    const d = new Date(inspDate);
    if (c1Count > 0) {
        // C1 = immobilisation, must fix and reinspect as soon as possible
        d.setMonth(d.getMonth() + 1);
    } else if (c2Count > 0) {
        // C2 = reinspection required within ~30 days
        d.setDate(d.getDate() + 30);
    } else if (passed === true) {
        // Clean pass (no C2/C1) → 2-year certificate
        d.setMonth(d.getMonth() + 24);
    } else if (passed === false) {
        // Generic failure (no specific clause info)
        d.setMonth(d.getMonth() + 6);
    } else {
        // Unknown / conditional
        d.setMonth(d.getMonth() + 12);
    }
    return d;
}

/**
 * Determine certificate type label from clause counts and pass status.
 */
function determineCertType(passed, c1Count, c2Count, c3Count) {
    if (c1Count > 0) return 'immobilization';   // C1 → imobilização
    if (c2Count > 0) return 'reinspection';      // C2 → re-inspeção obrigatória
    if (passed === true) return 'cert_2_years';  // clean or only C3 → 2-year cert
    if (passed === false) return 'reinspection'; // generic failed
    return 'conditional';                        // unknown
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
        // Strip common agency prefixes (CML-, CML , BV-, GATECI-, etc.)
        const instBare = inst.replace(/^[A-Z]{2,8}[-\s]/i, '').trim();

        const matchesNum = (stored) => {
            if (!stored) return false;
            const s = stored.trim();
            const sBare = s.replace(/^[A-Z]{2,8}[-\s]/i, '').trim();
            return s === inst || s === instBare || sBare === inst || sBare === instBare;
        };
        if (lift.serialNumber && matchesNum(lift.serialNumber)) score += 60;
        else if (lift.municipalNumber && matchesNum(lift.municipalNumber)) score += 55;
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
            return res.status(400).json({ success: false, message: 'Ficheiro PDF não carregado' });
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
                    message: 'Não foi possível ler o texto do PDF. Possivelmente é uma imagem digitalizada sem текстового шару ou пошкоджений.',
                    details: parsed?.error || null
                });
            }

            const { meta, viols, stats, concl, passed } = normaliseResult(parsed);

            // ── Move file to permanent location ───────────────────────────
            const savedFilename = `insp-${Date.now()}.pdf`;
            const savedPath = path.join(inspPdfDir, savedFilename);
            fs.renameSync(tmpPath, savedPath);
            const savedFileUrl = `/uploads/inspection-pdfs/${savedFilename}`;

            // ── Clause counts for cert-type logic ─────────────────────────
            const c1Count = stats.critical || 0;
            const c2Count = stats.medium   || 0;
            const c3Count = stats.low      || 0;
            const certType = determineCertType(passed, c1Count, c2Count, c3Count);

            // ── Build unified dates from normalised metadata ───────────────
            let inspectionDate = parseDate(meta.date);
            if (!inspectionDate) {
                inspectionDate = extractInspectionDateFromRawText(parsed.rawText || '');
            }
            // Prefer validUntil from PDF metadata (e.g. BV "Validade:2024/11/11") over calculated value
            const validUntil = (meta.validUntil ? parseDate(meta.validUntil) : null)
                || calcValidUntil(inspectionDate, passed, c1Count, c2Count);

            // ── Extract address details from location string ──────────────
            const locationStr = meta.location || '';
            const postalCode  = meta.postalCode || extractPostalCode(locationStr) || null;
            const city        = meta.city || null;
            // Street: first meaningful line before the postal code (or full location)
            let street = locationStr;
            if (postalCode) {
                const cpIdx = locationStr.indexOf(postalCode.replace('-', ' ').trim()) !== -1
                    ? locationStr.indexOf(postalCode.replace('-', ' ').trim())
                    : locationStr.indexOf(postalCode);
                if (cpIdx > 5) street = locationStr.substring(0, cpIdx).replace(/[,\s]+$/, '').trim();
            }

            // ── Prepare extracted data ─────────────────────────────────────
            const extractedData = {
                reportType:         parsed.reportType || (parsed.analysis && parsed.analysis.reportType) || 'inspection',
                reportNumber:       meta.reportNumber || null,
                installationNumber: meta.installationNumber || null,
                date:               inspectionDate ? inspectionDate.toISOString() : null,
                dateFormatted:      meta.date || (inspectionDate ? inspectionDate.toISOString().substring(0, 10) : null),
                location:           locationStr || null,
                address:            street     || locationStr || null,
                postalCode:         postalCode,
                city:               city,
                inspector:          meta.inspector || meta.company || null,
                company:            meta.company || null,
                owner:              meta.owner || null,
                maintenanceCompany: meta.maintenanceCompany || null,
                processNumber:      meta.processNumber || null,
                passed:             passed,
                status:             passed === true ? 'passed' : passed === false ? 'failed' : 'conditional',
                certType,          // 'cert_2_years' | 'reinspection' | 'immobilization' | 'conditional'
                c1Count,
                c2Count,
                c3Count,
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
                // Strip common agency prefixes so "CML-14267-28770" finds "14267-28770" and vice-versa
                const instBare = instNum.replace(/^[A-Z]{2,8}[-\s]/i, '').trim();
                const variants = [...new Set([instNum, instBare])];
                filters.push({ serialNumber:    { $in: variants } });
                filters.push({ municipalNumber: { $in: variants } });
            }

            if (meta.location) {
                // Extract multiple meaningful tokens from address (not just the first one)
                // This handles cases like "Rua Professor Mira Fernandes" where DB stores "Rua Mira Fernandes"
                const addrStopWords = new Set(['rua', 'avenida', 'av', 'travessa', 'praca', 'largo', 'estrada', 'lote', 'bloco', 'piso', 'loja']);
                const addrTokens = normalizeText(meta.location)
                    .split(' ')
                    .filter(t => t.length >= 4 && !addrStopWords.has(t) && !/^\d/.test(t))
                    .slice(0, 5);
                for (const token of addrTokens) {
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
                message: 'Erro ao analisar PDF',
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
        if (!lift) return res.status(404).json({ success: false, message: 'Elevador não encontrado' });

        // Build violation notes summary
        let violationNotes = notes || '';
        if (violations && violations.length) {
            violationNotes = (notes ? notes + '\n\n' : '') +
                'Violações:\n' + violations.map(v => `• [${v.classification || v.severity || v.type || '?'}] ${v.description || v.text || v}`).join('\n');
        }

        // Normalize reportType to valid enum values
        const reportTypeMap = { 'inspection': 'annual', 'annual': 'annual', 'routine': 'routine',
                                'emergency': 'emergency', 'certification': 'certification',
                                'reinspection': 'routine' };
        const normalizedReportType = reportTypeMap[reportType] || reportTypeMap[reportType?.toLowerCase()] || 'annual';

        const report = {
            date: lastInspectionDate ? new Date(lastInspectionDate) : new Date(),
            inspector: inspector || 'Bureau Veritas',
            notes: violationNotes,
            reportType: normalizedReportType,
            inspectionType: ({ annual: 'inspection', certification: 'inspection', routine: 'maintenance', emergency: 'emergency' })[normalizedReportType] || 'inspection',
            status: status || 'passed',
            reportFile: savedFileUrl || null,
            photos: []
        };

        // Calculate next inspection date
        let nextInspDate;
        if (nextInspectionDate) {
            nextInspDate = new Date(nextInspectionDate);
        } else {
            nextInspDate = new Date(report.date);
            nextInspDate.setMonth(nextInspDate.getMonth() + (status === 'passed' ? 24 : 6));
        }

        // Use $push/$set instead of lift.save() to bypass Mongoose validation
        // on pre-existing fields with null enum values (e.g. doorType, driveType).
        const licenseFields = (status === 'passed') ? {
            licenseDate: report.date,
            licenseExpiry: nextInspDate
        } : {};
        await Lift.findByIdAndUpdate(
            req.params.id,
            {
                $push: { inspectionHistory: report },
                $set: {
                    lastInspectionDate: report.date,
                    nextInspectionDate: nextInspDate,
                    inspectionStatus: status === 'passed' ? 'active' : 'needs_attention',
                    ...licenseFields
                }
            }
        );
        const nextInspectionDateSaved = nextInspDate;

        res.json({
            success: true,
            message: 'Relatório de inspeção guardado',
            inspectionEntry: report,
            nextInspectionDate: nextInspectionDateSaved
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
            return res.status(400).json({ success: false, message: 'Sem campos para atualizarя' });
        }

        const lift = await Lift.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
        if (!lift) return res.status(404).json({ success: false, message: 'Elevador não encontrado' });

        res.json({ success: true, message: 'Дати інспекції оновлено', lift });
    } catch (err) {
        console.error('❌ update-inspection-dates error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
