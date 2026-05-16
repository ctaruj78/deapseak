/**
 * PDF OCR via Gemini Vision
 * ===========================
 * Fallback для сканованих PDF-файлів:
 * 1. pdftoppm конвертує сторінки в зображення
 * 2. Gemini Vision витягує текст з зображень
 * 3. Повертає повний текст для подальшого парсингу клауз
 */

const { execSync, spawnSync } = require('child_process');
const fsSync = require('fs');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── GEMINI RESPONSE CACHE ──────────────────────────────────────────
// Кеш по SHA-256 хешу вмісту файлу. TTL 24 год. Макс 200 записів.
const _geminiCache = new Map(); // key: sha256hex → { result, expiresAt }
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 години
const CACHE_MAX_SIZE = 200;

function _cacheGet(key) {
    const entry = _geminiCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { _geminiCache.delete(key); return null; }
    return entry.result;
}

function _cacheSet(key, result) {
    // Видаляємо найстаріші записи якщо перевищено ліміт
    if (_geminiCache.size >= CACHE_MAX_SIZE) {
        const oldest = _geminiCache.keys().next().value;
        _geminiCache.delete(oldest);
    }
    _geminiCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

function _fileHash(filePath) {
    try {
        const data = fsSync.readFileSync(filePath);
        return crypto.createHash('sha256').update(data).digest('hex');
    } catch {
        return null;
    }
}

function _textHash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}
// ────────────────────────────────────────────────────────────────────

/**
 * Перевіряє чи PDF є скановим (мало тексту для text-based, багато для scanned)
 * @param {string} text - Витягнутий текст pdf-parse
 * @returns {boolean}
 */
function isLikelyScanned(text) {
    if (!text) return true;
    const cleaned = text.replace(/\s+/g, ' ').trim();
    // Якщо менше 200 символів реального тексту — скоріше за все скан
    return cleaned.length < 200;
}

/**
 * Конвертує PDF в масив base64 зображень за допомогою pdftoppm
 * @param {string} pdfPath - Шлях до PDF файлу
 * @param {number} maxPages - Максимальна кількість сторінок (дефолт 5)
 * @returns {Array<{base64: string, mimeType: string}>}
 */
async function pdfToImages(pdfPath, maxPages = 10) {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-ocr-'));
    const outputPrefix = path.join(tmpDir, 'page');
    
    try {
        console.log(`🖼️ Converting PDF to images: ${pdfPath}`);
        console.log(`   tmpDir: ${tmpDir}`);
        
        // pdftoppm: -r 400 (high resolution for OCR accuracy), -l maxPages, -png
        const result = spawnSync('pdftoppm', [
            '-r', '400',
            '-l', String(maxPages),
            '-png',
            pdfPath,
            outputPrefix
        ], { timeout: 120000 });
        
        if (result.error) {
            throw new Error(`pdftoppm error: ${result.error.message}`);
        }
        
        if (result.status !== 0) {
            const stderr = result.stderr?.toString() || '';
            throw new Error(`pdftoppm exited with ${result.status}: ${stderr}`);
        }
        
        // Читаємо всі PNG файли
        const files = fsSync.readdirSync(tmpDir)
            .filter(f => f.endsWith('.png'))
            .sort() // page-1.png, page-2.png, ...
            .slice(0, maxPages);
        
        console.log(`   ✅ Created ${files.length} page images`);
        
        const images = [];
        for (const file of files) {
            const imgPath = path.join(tmpDir, file);
            const data = await fs.readFile(imgPath);
            images.push({
                base64: data.toString('base64'),
                mimeType: 'image/png'
            });
        }
        
        return images;
    } finally {
        // Прибираємо тимчасові файли
        try {
            const files = fsSync.readdirSync(tmpDir);
            for (const f of files) {
                fsSync.unlinkSync(path.join(tmpDir, f));
            }
            fsSync.rmdirSync(tmpDir);
        } catch (e) {
            console.warn('⚠️ Could not clean up tmp dir:', e.message);
        }
    }
}

/**
 * Витягує текст зі зображень через Gemini Vision
 * @param {Array<{base64, mimeType}>} images
 * @param {string} apiKey
 * @returns {string} - Витягнутий текст
 */
async function extractTextWithGemini(images, apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    console.log(`🤖 Sending ${images.length} page(s) to Gemini Vision for OCR...`);
    
    const imageParts = images.map(img => ({
        inlineData: {
            data: img.base64,
            mimeType: img.mimeType
        }
    }));
    
    const prompt = `You are an expert OCR engine specialized in Portuguese elevator inspection reports (Relatório de Inspeção de Elevadores / Relatório de Inspecção de Ascensores).

Extract ALL visible text from this document image with maximum fidelity.

CRITICAL RULES:
1. PORTUGUESE CHARACTERS: Preserve exactly — ã â á à ç é ê í ó ô ú ü Ã Â Á À Ç É Ê Í Ó Ô Ú
2. VIOLATION CODES: Extract C1, C2, C3 exactly as written (case-sensitive, never omit)
3. LEGAL REFERENCES: Keep exact format — Decreto-Lei n.º 320/2002, Art.º 4.º, Portaria n.º 123/2004, DL, Port., Artigo
4. NUMBERS & CODES: Reproduce exactly — report numbers, lift IDs, dates (DD/MM/YYYY), NIF, certificate numbers
5. TABLE STRUCTURE: Preserve using spaces/pipes — do NOT collapse columns
6. SIGNATURES & STAMPS: Extract all text from stamps, seals, watermarks if readable
7. HEADERS/FOOTERS: Include page numbers, company names, document titles
8. CASE SENSITIVITY: UPPERCASE stays UPPERCASE, lowercase stays lowercase
9. ILLEGIBLE TEXT: Write [ilegível] — never guess
10. NO FORMATTING: Plain text only — no markdown (* _ # ** — [[ ]])
11. NO OMISSIONS: Never summarize, skip or paraphrase any section
12. SUB-CLAUSES: If violations appear as sub-items under C1/C2/C3, preserve the hierarchy with indentation

Output ONLY the raw extracted text. No preamble, no explanation.`;
    
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();
    
    console.log(`   ✅ Gemini Vision extracted ${text.length} characters`);
    return text;
}

/**
 * ГОЛОВНА ФУНКЦІЯ: OCR сканованого PDF
 * Використовується як fallback коли pdf-parse повертає мало тексту
 * 
 * @param {string} pdfPath - Шлях до PDF файлу
 * @param {string} apiKey - Gemini API key
 * @param {number} maxPages - Максимум сторінок для аналізу
 * @returns {{success: boolean, text: string, method: string}}
 */
async function ocrPDF(pdfPath, apiKey, maxPages = 10) {
    try {
        if (!apiKey) {
            return {
                success: false,
                text: '',
                method: 'ocr_skipped',
                error: 'GEMINI_API_KEY not configured'
            };
        }

        // Перевіряємо кеш по хешу файлу
        const fileHash = _fileHash(pdfPath);
        const cacheKey = fileHash ? `ocr:${fileHash}` : null;
        if (cacheKey) {
            const cached = _cacheGet(cacheKey);
            if (cached) {
                console.log(`⚡ OCR cache HIT: ${pdfPath}`);
                return { ...cached, fromCache: true };
            }
        }
        // Конвертуємо в зображення
        const images = await pdfToImages(pdfPath, maxPages);
        
        if (!images || images.length === 0) {
            return {
                success: false,
                text: '',
                method: 'ocr_failed',
                error: 'Could not convert PDF to images'
            };
        }
        
        // Витягуємо текст через Gemini Vision
        const text = await extractTextWithGemini(images, apiKey);
        
        const ocrResult = {
            success: true,
            text: text,
            method: 'gemini_vision_ocr',
            pagesProcessed: images.length
        };

        // Зберігаємо в кеш
        if (cacheKey) _cacheSet(cacheKey, ocrResult);

        return ocrResult;
        
    } catch (error) {
        console.error('❌ OCR error:', error.message);
        return {
            success: false,
            text: '',
            method: 'ocr_error',
            error: error.message
        };
    }
}

/**
 * GEMINI STRUCTURED PARSER
 * Використовує Gemini для витягування структурованих даних з тексту документа.
 * Працює як для OCR-текстів, так і для текстових PDF.
 * Значно точніше за regex для складних форматів.
 *
 * @param {string} text - Повний текст документа (OCR або txt PDF)
 * @param {string} apiKey - Gemini API key
 * @returns {Object|null} - Структурований об'єкт або null при помилці
 */
async function extractStructuredWithGemini(text, apiKey) {
    if (!apiKey || !text || text.length < 100) return null;

    // Кеш по хешу тексту (перші 14000 символів — те що йде в промпт)
    const textHash = _textHash(text.substring(0, 14000));
    const cacheKey = `structured:${textHash}`;
    const cached = _cacheGet(cacheKey);
    if (cached) {
        console.log('⚡ Gemini structured cache HIT');
        return cached;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                temperature: 0.1,        // Майже детерміністично
                topP: 0.95,
                maxOutputTokens: 8192,
            }
        });

        const prompt = `You are an expert parser for Portuguese elevator inspection reports (Relatório de Inspeção / Inspecção de Elevador / Ascensor).

Analyze the following document text and extract ALL information into a JSON object.

RULES:
1. Extract EVERY violation/clause (C1, C2, C3) — never skip any
2. For each violation extract: classification (C1/C2/C3), article reference, full description text
3. Preserve Portuguese accents and special characters exactly
4. If a field is not found, use null (not empty string)
5. Return ONLY valid JSON — no markdown, no explanation, no code blocks
6. For violations with sub-items, list each sub-item as a separate violation entry

JSON STRUCTURE (return exactly this format):
{
  "metadata": {
    "reportNumber": "string or null",
    "date": "DD/MM/YYYY or null",
    "liftId": "string or null",
    "location": "full address string or null",
    "inspector": "full name or null",
    "company": "inspection company name or null",
    "approved": true/false/null,
    "reportType": "Relatório de Inspecção / Relatório de Inspeção / Certificado or null"
  },
  "violations": [
    {
      "classification": "C1" or "C2" or "C3",
      "article": "Art.º X.º / Artigo X / DL 320/2002 Art. X or null",
      "description": "full violation description text in Portuguese",
      "subClause": "sub-clause identifier or null"
    }
  ],
  "conclusion": "full conclusion text or null",
  "passed": true/false/null
}

DOCUMENT TEXT:
---
${text.substring(0, 14000)}
---

Return ONLY the JSON object:`;

        console.log('🤖 Gemini structured extraction starting...');
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let raw = response.text().trim();

        // Видаляємо markdown-обгортку якщо Gemini все-таки її додав
        raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

        const parsed = JSON.parse(raw);
        console.log(`✅ Gemini structured extraction: ${parsed.violations?.length || 0} violations found`);
        _cacheSet(cacheKey, parsed);
        return parsed;

    } catch (err) {
        console.warn('⚠️ Gemini structured extraction failed:', err.message);
        return null;
    }
}

module.exports = {
    isLikelyScanned,
    ocrPDF,
    pdfToImages,
    extractTextWithGemini,
    extractStructuredWithGemini
};
