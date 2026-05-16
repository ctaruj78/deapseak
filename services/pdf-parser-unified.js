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

// ─── ДЕТЕКТОР ФОРМАТУ ────────────────────────────────────────────────────────
function detectFormat(text) {
    if (!text) return 'generic';

    const t = text.toUpperCase();

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
