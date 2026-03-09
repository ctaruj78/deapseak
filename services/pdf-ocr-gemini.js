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
async function pdfToImages(pdfPath, maxPages = 5) {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-ocr-'));
    const outputPrefix = path.join(tmpDir, 'page');
    
    try {
        console.log(`🖼️ Converting PDF to images: ${pdfPath}`);
        console.log(`   tmpDir: ${tmpDir}`);
        
        // pdftoppm: -r 200 (resolution), -l maxPages (last page), -png (format)
        const result = spawnSync('pdftoppm', [
            '-r', '200',
            '-l', String(maxPages),
            '-png',
            pdfPath,
            outputPrefix
        ], { timeout: 60000 });
        
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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    console.log(`🤖 Sending ${images.length} page(s) to Gemini Vision for OCR...`);
    
    const imageParts = images.map(img => ({
        inlineData: {
            data: img.base64,
            mimeType: img.mimeType
        }
    }));
    
    const prompt = `You are an OCR system for Portuguese elevator inspection reports.
Extract ALL text from this document page EXACTLY as it appears, preserving:
- The structure and layout (lines, paragraphs)
- All uppercase/lowercase letters exactly
- All numbers, dates, article references (Art.º, Artigo, etc.)
- All violation classifications (C1, C2, C3)
- All Portuguese special characters (ã, ç, é, ê, ô, etc.)
- All punctuation and special symbols

Do NOT translate, summarize, or interpret. Output ONLY the raw text content.
If the page is blank or illegible, output "(empty page)".`;
    
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
async function ocrPDF(pdfPath, apiKey, maxPages = 8) {
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
