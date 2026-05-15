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
const { GoogleGenerativeAI } = require('@google/generative-ai');

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
        
        // pdftoppm: -r 300 (high resolution for OCR accuracy), -l maxPages, -png
        const result = spawnSync('pdftoppm', [
            '-r', '300',
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
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    
    console.log(`🤖 Sending ${images.length} page(s) to Gemini Vision for OCR...`);
    
    const imageParts = images.map(img => ({
        inlineData: {
            data: img.base64,
            mimeType: img.mimeType
        }
    }));
    
    const prompt = `You are a professional OCR engine specialised in Portuguese elevator inspection reports (Relatório de Inspeção de Elevadores).

Your task: extract ALL visible text from this image with maximum accuracy.

CRITICAL rules:
1. Preserve EXACT spelling, including Portuguese accented characters: ã, â, á, à, ç, é, ê, í, ó, ô, ú, ü
2. Keep ALL numbers, reference codes and article identifiers exactly: Art.º, Artigo, Decreto-Lei, Portaria, DL, Port.
3. Extract all violation severity codes PRECISELY: C1, C2, C3 (case-sensitive, never skip)
4. Preserve tabular and columnar layout using whitespace or pipe separators
5. Keep dates in original format (DD/MM/YYYY, DD-MM-YYYY)
6. Preserve header/footer content including page numbers, stamp text, signature lines
7. Keep all UPPERCASE text uppercased, lowercase lowercased
8. Do NOT summarise, translate, interpret, or omit any part of the text
9. Do NOT add markdown formatting (* _ # etc.) — plain text only
10. If a section is illegible or blank write: [ilegível]

Output ONLY the raw extracted text, nothing else.`;
    
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
        
        return {
            success: true,
            text: text,
            method: 'gemini_vision_ocr',
            pagesProcessed: images.length
        };
        
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

module.exports = {
    isLikelyScanned,
    ocrPDF,
    pdfToImages,
    extractTextWithGemini
};
