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
 * ВИПРАВЛЕННЯ (v2):
 *  - isMetadataNoiseClause: відловлює числові рядки, дати, короткі ідентифікатори
 *    без ключових слів (раніше "Ascensor 2025-06-09" та "6781" проходили фільтр)
 *  - normalizeClauseText: коректно знімає артикули типу "67º", "67º-5", "93º - 1"
 *  - cleanViolations: захист від violations де description — це метадані сертифіката
 *  - isLegendOrBoilerplateClause: додано патерн для "obrigacoes do proprietario" секції
 *
 * ВИКОРИСТАННЯ:
 *  const { parseReport } = require('./pdf-parser-unified');
 *  const result = await parseReport('/path/to/file.pdf');
 */

const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const pdfParserEnhanced = require('./pdf-parser-enhanced');
const { parseBureauVeritasPDF } = require('./pdf-parser-bureau-veritas');
const { extractWithLLM } = require('./pdf-parser-llm');

// ─── НОРМАЛІЗАЦІЯ ТЕКСТУ ─────────────────────────────────────────────────────

function normalizeClauseText(value = '') {
    return String(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        // FIX 1: розширений regex для артикулів — покриває "67º", "67º-5", "93º - 1",
        //        "C3 67º", "art. 67", "artigo 67º-5" на початку рядка
        .replace(/^\s*(?:c[123]\s+)?\d+[a-zº°]*(?:\s*[-–]\s*\d+[a-z0-9º°]*)?\s+/i, '')
        .replace(/^\s*c[123]\s*\d+[a-z0-9.\-º°]*\s*/i, '')
        .replace(/^\s*art(?:igo)?\.?\s*\d+[a-z0-9.\-º°]*(?:\s*[-–]\s*\d+[a-z0-9º°]*)?\s*/i, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ─── ФІЛЬТРИ ЛЕГЕНД ТА BOILERPLATE ───────────────────────────────────────────

function isLegendOrBoilerplateClause(description = '') {
    const d = normalizeClauseText(description);
    if (!d || d.length < 10) return true;

    const boilerplatePatterns = [
        /foram detetadas clausulas tipo c[123]/,
        /correspondem a situacoes/,
        /nao obrigam a imobilizacao/,
        /d[oa] lugar a uma reinspec/,
        /classificacao das clausulas/,
        /grau de perigosidade/,
        /obrigacoes do proprietario/,
        /prazo maximo de 2 anos/,
        /despacho n\s*17\s*2022/,
        /deficiencias a reparar no prazo/,
        /em relacao as deficiencias detetadas/,
        // FIX 2: секція "OBRIGAÇÕES DO PROPRIETÁRIO" — рядки типу
        // "Elevador Aprovado", "Elevador Reprovado com imobilização", etc.
        /^elevador (?:aprovado|reprovado)/,
        /nao foram detetadas deficiencias/,
        /empreender as acoes oportunas/,
        /resolucao deve ser verificada/,
        /reparacoes ou remodelacoes indicadas/,
        // Джерела/посилання в кінці документа
        /^fonte\s*:/,
        /^despacho n\s*\d+/,
        /^mod\s*[\.\s]*oi/,
        /^anotacoes$/,
    ];

    return boilerplatePatterns.some((pattern) => pattern.test(d));
}

// ─── ФІЛЬТР МЕТАДАНИХ ────────────────────────────────────────────────────────

function isMetadataNoiseClause(description = '') {
    const raw = String(description || '').trim();
    if (!raw) return true;

    const d = normalizeClauseText(raw);
    if (!d) return true;

    // FIX 3: Відловлює рядки що є суто числами / датами / кодами
    // "6781", "2025-06-09", "2745-838", "2027-04-09 2027-06-09"
    if (/^[\d\s:\/\-.]+$/.test(raw)) return true;

    // Дати у будь-якому форматі
    if (/^\d{4}[-\/]\d{2}[-\/]\d{2}/.test(raw.trim())) return true;
    if (/^\d{2}[-\/]\d{2}[-\/]\d{4}/.test(raw.trim())) return true;

    // FIX 4: Рядки що містять "Ascensor/Elevador" + дати — це дані сертифіката,
    // не порушення. Патерн: слово + номер + дата, або слово + кілька дат
    const hasInstallWord = /\b(ascensor|elevador|monta.?cargas)\b/i.test(raw);
    const hasDatePattern = /\b\d{4}[-\/]\d{2}[-\/]\d{2}\b/.test(raw);
    if (hasInstallWord && hasDatePattern) return true;

    // FIX 5: Рядок виглядає як "Ascensor 6781" або "Elevador 2" — тип + номер
    if (/^(ascensor|elevador|monta.?cargas)\s+\d+\s*$/i.test(raw)) return true;

    // Відомі поля метаданих на початку
    const startsAsMetadataField = [
        /^codigo postal\b/,
        /^tipo de inspec/,
        /^tipo de edificio\b/,
        /^ascensor\b/,
        /^instalacao\s*n\b/,
        /^processo\s*n\b/,
        /^concelho\b/,
        /^localidade\b/,
        /^freguesia\b/,
        /^morada\b/,
        /^resultado da inspec/,
        /^entidade inspetora\b/,
        /^empresa de manutencao\b/,
        /^proprietario\b/,
        // FIX 6: додаткові поля з GATECI/CERTIEL
        /^ref[a]?\s*emie\b/,
        /^regulamentacao aplicavel\b/,
        /^validacao\b/,
        /^emissao\b/,
        /^validade\b/,
        /^requer(?:er)?\s+inspec/,
        /^certificado de inspec/,
    ].some((rx) => rx.test(d));

    if (startsAsMetadataField) return true;

    // OCR debris: метадані + дати
    const hasMetadataToken = /\b(codigo|postal|inspecao|ascensor|instalacao|processo|concelho|localidade|freguesia|morada)\b/.test(d);
    const mostlyDatesOrCodes =
        /^[\d\s:\/\-.]+$/.test(raw) ||
        /\b\d{4}[\/-]\d{2}[\/-]\d{2}\b/.test(raw) ||
        /\b\d{2}[\/-]\d{2}[\/-]\d{4}\b/.test(raw);
    if (hasMetadataToken && mostlyDatesOrCodes) return true;

    // Короткі фрагменти метаданих
    const wordCount = d.split(/\s+/).filter(Boolean).length;
    if (wordCount <= 4 && hasMetadataToken) return true;

    // FIX 7: Violation де article — це числовий ідентифікатор (номер процесу),
    // а не справжній артикул. "Artigo 6781" — явно не стаття закону.
    // Перевіряється окремо в cleanViolations нижче.

    return false;
}

// ─── ДОДАТКОВИЙ ФІЛЬТР НА РІВНІ VIOLATION OBJECT ────────────────────────────

/**
 * FIX 8: Перевіряє чи є violation об'єкт валідним — article не має бути
 * числом > 1000 (номер процесу) і description має містити хоч якийсь
 * технічний зміст (мінімум 5 слів після нормалізації).
 */
function isValidViolationObject(v) {
    if (!v || !v.classification) return false;

    // LLM-extracted violations are pre-validated — skip the regex-based article filter
    if (v._llm) return true;

    // article типу "6781" — це номер процесу, не артикул закону
    if (v.article) {
        const artNum = parseInt(String(v.article).replace(/\D/g, ''), 10);
        if (!isNaN(artNum) && artNum > 500) return false;
    }

    const desc = String(v.description || '').trim();
    const normalized = normalizeClauseText(desc);
    const wordCount = normalized.split(/\s+/).filter(Boolean).length;
    const technicalTerms = [
        'motor', 'cabo', 'porta', 'seguranca', 'freio', 'limitador',
        'parachoque', 'guardacorpo', 'iluminacao', 'sinalizacao',
        'funcionamento', 'ruido', 'vibracao', 'desgaste', 'corrosao',
        'cabina', 'paragem', 'contrapeso', 'folga', 'travamento',
        'encravamento', 'travagem', 'guias', 'quadro', 'manobra'
    ];
    const hasTechnicalTerm = technicalTerms.some((term) => normalized.includes(term));

    // Allow concise but technical clauses (common in GATECI/BV OCR output).
    if (wordCount < 3 && !hasTechnicalTerm) return false;

    // Опис не має бути суто датами/числами
    const alphaRatio = (normalized.match(/[a-z]/g) || []).length / (normalized.length || 1);
    if (alphaRatio < 0.28 && !hasTechnicalTerm) return false;

    // Guard against short generic fragments without technical substance.
    if (wordCount < 5 && !hasTechnicalTerm && alphaRatio < 0.45) return false;

    return true;
}

// ─── ОЧИЩЕННЯ VIOLATIONS ─────────────────────────────────────────────────────

function cleanViolations(violations = []) {
    const seen = new Map();
    const cleaned = [];

    for (const v of violations) {
        if (!isValidViolationObject(v)) continue;

        const description = String(v.description || '').trim();
        // LLM was explicitly prompted to exclude boilerplate — skip regex filters for its output
        if (!v._llm) {
            if (isLegendOrBoilerplateClause(description)) continue;
            if (isMetadataNoiseClause(description)) continue;
        }

        const normDesc = normalizeClauseText(description);
        if (!normDesc) continue;

        // Cross-parser dedup: same class + semantically same description.
        // For LLM violations use full normDesc so variants of the same article
        // (e.g. multiple "Art. 6º" entries with different contextual notes)
        // are not collapsed into one.
        const dedupKey = v._llm
            ? `${v.classification}|${normDesc}`
            : `${v.classification}|${normDesc.slice(0, 160)}`;
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

// ─── СТАТИСТИКА ──────────────────────────────────────────────────────────────

function getStatsFromViolations(violations = []) {
    return {
        total: violations.length,
        critical: violations.filter((v) => v.classification === 'C1').length,
        medium: violations.filter((v) => v.classification === 'C2').length,
        low: violations.filter((v) => v.classification === 'C3').length
    };
}

// ─── СТАТУС РЕЗУЛЬТАТУ ───────────────────────────────────────────────────────

function inferResultStatus(text = '') {
    const source = String(text || '');
    if (!source) {
        return { status: 'unknown', hasExplicitImmobilization: false, hasApprovedC2Star: false };
    }

    const resultIdx = source.search(/RESULTADO\s+DA\s+INSPE/i);
    const rawScope = resultIdx >= 0 ? source.substring(resultIdx, Math.min(source.length, resultIdx + 2600)) : source;
    // Ignore explanatory legends after the actual result block.
    const cutMarkers = [
        /Observa[çc][õo]es/i,
        /Constata[çc][õo]es/i,
        /CERTIFICADO\s+DE\s+INSPEC/i,
        /OBRIGA[ÇC][ÕO]ES\s+DO\s+PROPRIET/i,
        /EM\s+RELA[ÇC][ÃA]O\s+[AÀ]S\s+DEFICI/i,
        /SIGNIFICADO\s+DAS\s+CL[AÁ]USULAS/i,
    ];
    let scope = rawScope;
    for (const marker of cutMarkers) {
        const idx = rawScope.search(marker);
        if (idx > 80) {
            scope = rawScope.substring(0, idx);
            break;
        }
    }

    // Verdict forms: "Aprovado"/"Reprovado" NOT followed by ":" (that's legend text like "Aprovado: o elevador que...")
    const approved = /\bAprovad[oa]\b(?!\s*:)(?!\s+com\s+Imobiliza)/i.test(scope);
    const failed = /\bReprovad[oa]\b(?!\s*:)|Imobiliza[cç][aã]o/i.test(scope);
    const hasExplicitImmobilization = /Reprovad[oa]\s+com\s+Imobiliza[cç][aã]o|Imobiliza[cç][aã]o\s+imediata/i.test(scope);
    const hasApprovedC2Star = /Aprovad[oa][\s\S]{0,120}C2\*/i.test(scope);

    // If both words appear, trust whichever appears first in RESULTADO block.
    if (approved && failed) {
        const firstApproved = scope.search(/\bAprovad[oa]\b(?!\s*:)/i);
        const firstFailed = scope.search(/\bReprovad[oa]\b(?!\s*:)|Imobiliza[cç][aã]o/i);
        if (firstFailed !== -1 && (firstApproved === -1 || firstFailed < firstApproved)) {
            return { status: 'failed', hasExplicitImmobilization, hasApprovedC2Star };
        }
        return { status: 'approved', hasExplicitImmobilization, hasApprovedC2Star };
    }

    if (failed && !approved) {
        return { status: 'failed', hasExplicitImmobilization, hasApprovedC2Star };
    }
    if (approved) {
        return { status: 'approved', hasExplicitImmobilization, hasApprovedC2Star };
    }
    return { status: 'unknown', hasExplicitImmobilization, hasApprovedC2Star };
}

// ─── ПАРСИНГ ДАТИ ────────────────────────────────────────────────────────────

const _PT_MONTHS = {
    janeiro:1, fevereiro:2, março:3, marco:3, abril:4, maio:5, junho:6,
    julho:7, agosto:8, setembro:9, outubro:10, novembro:11, dezembro:12
};

function parseInspectionDate(rawDate) {
    if (!rawDate) return null;
    const val = String(rawDate).trim();

    // YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    const ymd = val.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if (ymd) return new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])));

    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmy = val.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (dmy) return new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])));

    // Portuguese: "24 de outubro de 2025" or "24 outubro 2025"
    const ptNorm = val.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const ptMatch = ptNorm.match(/^(\d{1,2})\s+(?:de\s+)?([a-záàãâéêíóõôúç]+)\s+(?:de\s+)?(\d{4})$/);
    if (ptMatch) {
        const day = Number(ptMatch[1]);
        const month = _PT_MONTHS[ptMatch[2]];
        const year = Number(ptMatch[3]);
        if (month && day >= 1 && day <= 31) return new Date(Date.UTC(year, month - 1, day));
    }

    const parsed = new Date(val);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// ─── POST-PROCESSING ──────────────────────────────────────────────────────────

function applyUnifiedPostProcessing(result) {
    if (!result || !result.success) return result;

    const rawText = result.rawText || result.analysis?.rawText || '';
    const violations = result.violations || result.analysis?.violations || [];
    const cleanedViolations = cleanViolations(violations);
    const stats = getStatsFromViolations(cleanedViolations);

    const statusInfo = inferResultStatus(rawText);
    // C2* only when the RESULTADO block explicitly says "Aprovado com cláusulas C2*" —
    // do NOT trigger on legend text that mentions "C2*" or "Despacho 17/2022" generically.
    const c2StarEvidence = statusInfo.hasApprovedC2Star;
    const hasC1 = stats.critical > 0;
    const hasC2 = stats.medium > 0;

    let passed;
    let certType;

    // Hard text evidence: "Reprovado (com cláusulas C2...)" or "com cláusulas C2" without C2*
    // IMPORTANT: only check the RESULTADO block, NOT the OBRIGAÇÕES DO PROPRIETÁRIO legend,
    // which contains "Elevador Reprovado\nSe foram detetadas cláusulas tipo C2..." as boilerplate.
    const _resultIdx2 = rawText.search(/RESULTADO\s+DA\s+INSPE[CÇ]/i);
    const _obrigIdx   = rawText.search(/OBRIGA[ÇC][ÕO]ES\s+DO\s+PROPRIET/i);
    const _scopeEnd   = _obrigIdx > 0 ? _obrigIdx : rawText.length;
    const _resultScope = _resultIdx2 >= 0 ? rawText.slice(_resultIdx2, _scopeEnd) : rawText.slice(0, _scopeEnd);
    const explicitReprovadoC2 = /Reprovad[oa][\s\S]{0,100}C2(?!\*)/i.test(_resultScope) ||
                                /com\s+cláusulas?\s+C2(?!\*)/i.test(_resultScope);

    if (hasC1) {
        passed = false;
        certType = 'immobilization';
    } else if (hasC2 || explicitReprovadoC2) {
        const isApprovedC2Star = c2StarEvidence && statusInfo.status === 'approved' && !explicitReprovadoC2;
        passed = Boolean(isApprovedC2Star);
        certType = isApprovedC2Star ? 'cert_2_years' : 'reinspection';
    } else {
        passed = statusInfo.status !== 'failed';
        certType = passed ? 'cert_2_years' : (statusInfo.hasExplicitImmobilization ? 'immobilization' : 'reinspection');
    }

    let validUntil = null;
    const inspectionDate = parseInspectionDate(result.metadata?.date || result.analysis?.metadata?.date);
    if (inspectionDate) {
        const next = new Date(inspectionDate);
        if (certType === 'immobilization') {
            // C1: urgent reinspect within 30 days
            next.setUTCDate(next.getUTCDate() + 30);
        } else if (certType === 'reinspection') {
            // Plain C2 per DL 320/2002: 30 days to request reinspection
            // (report usually contains "Requerer Inspeção Periódica até:" which overrides this)
            next.setUTCDate(next.getUTCDate() + 30);
        } else {
            // cert_2_years: clean cert, C3 only, or C2* with Despacho 17/2022
            next.setUTCMonth(next.getUTCMonth() + 24);
        }
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

    if (
        /\bCML\/\d{2,}\/\d{2,}\b/i.test(text) ||
        /www\.cm-lisboa\.pt/i.test(text) ||
        /NOTA\s+DE\s+CL[ÁA]USULAS/i.test(text)
    ) {
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
        return 'bureau-veritas';
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
        const buffer = await fs.readFile(filePath);

        // Extract full text first — used by both LLM and regex parsers
        let fullText = '';
        try {
            const parsed = await pdfParse(buffer);
            fullText = parsed.text || '';
        } catch {
            // Scanned PDF — will be handled by enhanced parser's OCR fallback
        }

        const format = detectFormat(fullText);
        console.log(`📋 PDF format detected: ${format} → ${filePath}`);

        let result = null;

        // ── STEP 1: LLM extraction (primary, if text is usable) ──────────────
        if (fullText.length >= 300) {
            const llmResult = await extractWithLLM(fullText).catch(err => {
                console.warn('⚠️ LLM extraction threw:', err.message);
                return null;
            });

            if (llmResult?.success) {
                const hasDate = llmResult.metadata?.date;
                const hasViolations = (llmResult.violations?.length || 0) > 0;
                if (hasDate || hasViolations) {
                    console.log(`✅ Using LLM result (date=${hasDate}, violations=${llmResult.violations?.length || 0})`);
                    result = llmResult;
                } else {
                    console.log('⚠️ LLM returned no date and no violations — falling back to regex');
                }
            }
        }

        // ── STEP 2: Regex fallback ────────────────────────────────────────────
        if (!result) {
            if (format === 'bureau-veritas' || format === 'known-pt') {
                result = await parseBureauVeritasPDF(filePath);

                const hasDate = result?.metadata?.date || result?.success === false;
                if (!hasDate) {
                    console.log('⚠️ BV parser found no date — falling back to enhanced parser');
                    const enhanced = await pdfParserEnhanced.parsePDF(filePath).catch(() => null);
                    if (enhanced?.success) result = enhanced;
                }
            } else {
                result = await pdfParserEnhanced.parsePDF(filePath);

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
        }

        if (!result) {
            throw new Error('All parsers returned null');
        }

        result = applyUnifiedPostProcessing(result);

        if (result.success) result.detectedFormat = result.detectedFormat || format;
        return result;

    } catch (error) {
        console.error('❌ Unified parser error:', error.message);
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
    parsePDF: parseReport
};
