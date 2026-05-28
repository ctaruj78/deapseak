/**
 * PDF PARSER UNIFIED — Єдина точка входу для всіх форматів PDF-звітів
 * ====================================================================
 * Автоматично визначає формат звіту і направляє до правильного парсера.
 *
 * ПІДТРИМУВАНІ ФОРМАТИ:
 *  - Bureau Veritas / RINAVE  (NB/DT-XXXX)
 *  - GATECI, CERTIEL, NOMINARE, APCER  (португальські організації)
 *  - Generic / Enhanced  (всі інші PDF-звіти)
 *
 * ПАЙПЛАЙН:
 *  1. pdf-parse  → текстовий PDF
 *  2. Gemini Vision OCR  → скановані PDF (< 200 символів)
 *  3. Gemini structured extraction  → поверх regex для складних документів
 *
 * ВИКОРИСТАННЯ:
 *  const { parseReport } = require('./pdf-parser-unified');
 *  const result = await parseReport('/path/to/file.pdf');
 */

const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const pdfParserEnhanced = require('./pdf-parser-enhanced');
const { parseBureauVeritasPDF } = require('./pdf-parser-bureau-veritas');

function normalizeClauseText(value = '') {
    return String(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    .replace(/^\s*c[123]\s*\d+[a-z0-9.\-º°]*\s*/i, ' ')
    .replace(/^\s*art(?:igo)?\.?\s*\d+[a-z0-9.\-º°]*\s*/i, ' ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isLegendOrBoilerplateClause(description = '') {
    const d = normalizeClauseText(description);
    if (!d || d.length < 10) return true;

    const boilerplatePatterns = [
        /foram detetadas clausulas tipo c[123]/,
        /correspondem a situacoes/,
        /nao obrigam a imobilizacao/,
        /d[oã]o lugar a uma reinspec/, 
        /classificacao das clausulas/,
        /grau de perigosidade/,
        /obrigacoes do proprietario/,
        /prazo maximo de 2 anos/,
        /despacho n\s*17\s*2022/,
        /deficiencias a reparar no prazo/,
        /em relacao as deficiencias detetadas/
    ];

    return boilerplatePatterns.some((pattern) => pattern.test(d));
}

function cleanViolations(violations = []) {
    const seen = new Map();
    const cleaned = [];

    for (const v of violations) {
        if (!v || !v.classification) continue;
        const description = String(v.description || '').trim();
        if (isLegendOrBoilerplateClause(description)) continue;

        const normDesc = normalizeClauseText(description);
        if (!normDesc) continue;

        // Cross-parser dedup: same class + semantically same description.
        const dedupKey = `${v.classification}|${normDesc.slice(0, 160)}`;
        const existingIdx = seen.get(dedupKey);
        if (existingIdx == null) {
            seen.set(dedupKey, cleaned.length);
            cleaned.push(v);
            continue;
        }

        const existing = cleaned[existingIdx];
        const incomingScore = (v.article && v.article !== 'NOTA' ? 2 : 0) + (Number(v.confidence) || 0);
        const existingScore = (existing.article && existing.article !== 'NOTA' ? 2 : 0) + (Number(existing.confidence) || 0);
        if (incomingScore > existingScore) {
            cleaned[existingIdx] = v;
        }
    }

    return cleaned;
}

function getStatsFromViolations(violations = []) {
    return {
        total: violations.length,
        critical: violations.filter((v) => v.classification === 'C1').length,
        medium: violations.filter((v) => v.classification === 'C2').length,
        low: violations.filter((v) => v.classification === 'C3').length
    };
}

function inferResultStatus(text = '') {
    const source = String(text || '');
    if (!source) {
        return { status: 'unknown', hasExplicitImmobilization: false, hasApprovedC2Star: false };
    }

    const resultIdx = source.search(/RESULTADO\s+DA\s+INSPE/i);
    const scope = resultIdx >= 0 ? source.substring(resultIdx, Math.min(source.length, resultIdx + 1400)) : source;

    const approved = /Aprovad[oa](?!\s+com\s+Imobiliza)/i.test(scope);
    const failed = /Reprovad[oa]|Imobiliza[cç][aã]o/i.test(scope);
    const hasExplicitImmobilization = /Reprovad[oa]\s+com\s+Imobiliza[cç][aã]o|Imobiliza[cç][aã]o\s+imediata/i.test(scope);
    const hasApprovedC2Star = /Aprovad[oa][\s\S]{0,120}C2\*/i.test(scope);

    if (failed && !approved) {
        return { status: 'failed', hasExplicitImmobilization, hasApprovedC2Star };
    }
    if (approved) {
        return { status: 'approved', hasExplicitImmobilization, hasApprovedC2Star };
    }
    return { status: 'unknown', hasExplicitImmobilization, hasApprovedC2Star };
}

function parseInspectionDate(rawDate) {
    if (!rawDate) return null;
    const val = String(rawDate).trim();

    const ymd = val.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if (ymd) return new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])));

    const dmy = val.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (dmy) return new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])));

    const parsed = new Date(val);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function applyUnifiedPostProcessing(result) {
    if (!result || !result.success) return result;

    const rawText = result.rawText || result.analysis?.rawText || '';
    const violations = result.violations || result.analysis?.violations || [];
    const cleanedViolations = cleanViolations(violations);
    const stats = getStatsFromViolations(cleanedViolations);

    const statusInfo = inferResultStatus(rawText);
    const c2StarEvidence = statusInfo.hasApprovedC2Star || /C2\*/i.test(rawText) || /Despacho\s+n\.?\s*17\s*\/\s*2022/i.test(rawText);
    const hasC1 = stats.critical > 0;
    const hasC2 = stats.medium > 0;

    let passed;
    let certType;

    // Canonical rule-set requested by product:
    //   C1 -> imobilização
    //   C2 -> reinspeção (except approved C2*)
    //   only C3/clean -> certificado 2 anos
    if (hasC1) {
        passed = false;
        certType = 'immobilization';
    } else if (hasC2) {
        const isApprovedC2Star = c2StarEvidence && statusInfo.status === 'approved';
        passed = Boolean(isApprovedC2Star);
        certType = isApprovedC2Star ? 'cert_2_years' : 'reinspection';
    } else {
        // No C1/C2 clauses detected. Trust explicit failed only as fallback.
        passed = statusInfo.status !== 'failed';
        certType = passed ? 'cert_2_years' : (statusInfo.hasExplicitImmobilization ? 'immobilization' : 'reinspection');
    }

    let validUntil = null;
    const inspectionDate = parseInspectionDate(result.metadata?.date || result.analysis?.metadata?.date);
    if (inspectionDate && passed) {
        const next = new Date(inspectionDate);
        next.setUTCMonth(next.getUTCMonth() + 24);
        validUntil = next.toISOString();
    }

    const finalReportType = passed ? (stats.low > 0 ? 'approved_with_c3' : 'certificate') : 'failed';

    result.violations = cleanedViolations;
    result.stats = stats;
    result.passed = passed;
    result.certType = certType;
    result.validUntil = validUntil;
    result.reportType = result.reportType || finalReportType;

    if (result.analysis) {
        result.analysis.violations = cleanedViolations;
        result.analysis.stats = stats;
        result.analysis.passed = passed;
        result.analysis.certType = certType;
        result.analysis.validUntil = validUntil;
        result.analysis.reportType = finalReportType;
    }

    return result;
}

// ─── ДЕТЕКТОР ФОРМАТУ ────────────────────────────────────────────────────────
function detectFormat(text) {
    if (!text) return 'generic';

    const t = text.toUpperCase();

    // CML Lisboa periodic inspection reports often do not contain explicit
    // C1/C2/C3 markers per line and are parsed better by the Bureau/CML parser.
    if (/\bCML\/\d{2,}\/\d{2,}\b/i.test(text) || /www\.cm-lisboa\.pt/i.test(text) || /NOTA\s+DE\s+CL[ÁA]USULAS/i.test(text)) {
        return 'known-pt';
    }

    if (t.includes('BUREAU VERITAS') || /(?:NB|DT)\d{4}-\d{4}/.test(text)) {
        return 'bureau-veritas';
    }
    if (/\b(?:GATECI|APCER|CERTIEL|NOMINARE)\b/.test(t)) {
        return 'known-pt';
    }
    if (/\bIEP\b/.test(t) && /INSPECTORES/.test(t)) {
        return 'iep';
    }
    if (/\bRINAVE\b/.test(t)) {
        return 'bureau-veritas'; // RINAVE використовує BV формат
    }
    return 'generic';
}

// ─── ГОЛОВНА ФУНКЦІЯ ─────────────────────────────────────────────────────────
/**
 * Парсить PDF звіт інспекції ліфта.
 * Автоматично визначає формат і повертає структурований об'єкт.
 *
 * @param {string} filePath - Абсолютний шлях до PDF файлу
 * @returns {Promise<Object>} - { success, metadata, violations, stats, ... }
 */
async function parseReport(filePath) {
    try {
        // Швидко читаємо першу сторінку для детектування формату
        const buffer = await fs.readFile(filePath);
        let firstPageText = '';
        try {
            const partial = await pdfParse(buffer, { max: 1 });
            firstPageText = partial.text || '';
        } catch {
            // Скановий PDF — format буде generic, OCR спрацює всередині enhanced
        }

        const format = detectFormat(firstPageText);
        console.log(`📋 PDF format detected: ${format} → ${filePath}`);

        let result = null;

        if (format === 'bureau-veritas' || format === 'known-pt') {
            // BV parser підтримує GATECI, CERTIEL, NOMINARE, APCER, RINAVE
            result = await parseBureauVeritasPDF(filePath);

            // Якщо BV не знайшов дату — fallback на enhanced
            const hasDate = result?.metadata?.date || result?.success === false;
            if (!hasDate) {
                console.log('⚠️ BV parser found no date — falling back to enhanced parser');
                const enhanced = await pdfParserEnhanced.parsePDF(filePath).catch(() => null);
                if (enhanced?.success) result = enhanced;
            }
        } else {
            // Generic / IEP → enhanced (з Gemini structured extraction)
            result = await pdfParserEnhanced.parsePDF(filePath);

            // Enhanced не знайшов порушень або метаданих — спробуємо BV
            const hasViolations = result?.violations?.length > 0;
            const hasMetadata = result?.metadata?.date || result?.metadata?.reportNumber;
            if (!hasViolations && !hasMetadata && result?.success) {
                console.log('⚠️ Enhanced found nothing — trying BV parser as last resort');
                const bv = await parseBureauVeritasPDF(filePath).catch(() => null);
                if (bv?.success && (bv.violations?.length > 0 || bv.metadata?.date)) {
                    result = bv;
                }
            }
        }

        if (!result) {
            throw new Error('All parsers returned null');
        }

        result = applyUnifiedPostProcessing(result);

        // Додаємо поле format для інформації
        if (result.success) result.detectedFormat = format;
        return result;

    } catch (error) {
        console.error('❌ Unified parser error:', error.message);
        // Абсолютний fallback — enhanced parser
        try {
            return await pdfParserEnhanced.parsePDF(filePath);
        } catch (fallbackError) {
            return {
                success: false,
                error: error.message,
                fallbackError: fallbackError.message
            };
        }
    }
}

// ─── CLEANUP ─────────────────────────────────────────────────────────────────
async function cleanupFile(filePath) {
    try {
        await fs.unlink(filePath);
        console.log('🗑️ Cleaned up file:', filePath);
    } catch (err) {
        console.warn('⚠️ Could not delete file:', err.message);
    }
}

module.exports = {
    parseReport,
    detectFormat,
    cleanupFile,
    // Re-export для зворотної сумісності
    parsePDF: parseReport
};
