/**
 * Auto-translate Ukrainian text to Portuguese (pt-PT)
 * in client, tech, dispatcher panels using Gemini AI.
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });

const UK_REGEX = /[\u0400-\u04FF]/;
const TARGET_DIRS = ['pages/client', 'pages/tech', 'pages/dispatcher'];
const CACHE_FILE = '.translation-cache.json';
const EXTENSIONS = ['.html', '.js'];

// Load cache
let cache = {};
if (fs.existsSync(CACHE_FILE)) {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    console.log(`💾 Loaded ${Object.keys(cache).length} cached translations`);
}

function hasUkrainian(text) {
    return UK_REGEX.test(text);
}

function saveCache() {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

function collectFiles(dirs) {
    const files = [];
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) continue;
        const walk = (d) => {
            for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
                const full = path.join(d, entry.name);
                if (entry.isDirectory()) walk(full);
                else if (EXTENSIONS.includes(path.extname(entry.name))) {
                    files.push(full);
                }
            }
        };
        walk(dir);
    }
    return files;
}

/**
 * Extract Ukrainian-containing line segments for translation.
 * Returns array of {original, lineIndex} objects.
 */
function extractUkrainianSegments(content) {
    const lines = content.split('\n');
    const segments = new Map(); // segment -> first lineIndex

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!hasUkrainian(line)) continue;

        // Extract tokens: non-whitespace runs that contain Ukrainian
        const tokens = line.match(/\S+/g) || [];
        for (const token of tokens) {
            if (hasUkrainian(token) && !cache[token]) {
                if (!segments.has(token)) segments.set(token, i);
            }
        }

        // Also extract multi-word Ukrainian phrases (between quotes or in comments)
        const phrasePatterns = [
            /['"`]([^'"`]*[\u0400-\u04FF][^'"`]*?)['"`]/g,  // quoted strings
            /\/\/\s*(.*[\u0400-\u04FF].*)/g,                  // single-line comments
            /<!--\s*(.*[\u0400-\u04FF].*?)\s*-->/g,           // HTML comments
        ];
        for (const pat of phrasePatterns) {
            let m;
            while ((m = pat.exec(line)) !== null) {
                const phrase = m[1].trim();
                if (hasUkrainian(phrase) && phrase.length > 1 && !cache[phrase]) {
                    segments.set(phrase, i);
                }
            }
        }
    }

    return segments;
}

async function translateBatch(texts) {
    if (!texts.length) return;

    const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join('\n');
    const prompt = `Translate the following Ukrainian words/phrases to European Portuguese (pt-PT).
Context: web application for elevator maintenance management.

Rules:
- Return ONLY a JSON object mapping original → translation
- Keep HTML tags, CSS class names, variable names, URLs unchanged
- Translate only human-readable Ukrainian text
- Use formal/professional Portuguese

Texts:
${numbered}

Return: {"original1": "translation1", "original2": "translation2", ...}`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const translations = JSON.parse(jsonMatch[0]);
            for (const [orig, trans] of Object.entries(translations)) {
                if (trans && typeof trans === 'string') {
                    cache[orig] = trans;
                }
            }
        }
    } catch (e) {
        console.error(`  ⚠️ Gemini error: ${e.message}`);
    }
}

async function processFile(filepath) {
    let content;
    try {
        content = fs.readFileSync(filepath, 'utf-8');
    } catch (e) {
        console.log(`  ❌ Cannot read: ${e.message}`);
        return false;
    }

    if (!hasUkrainian(content)) return false;

    // Get segments to translate
    const segments = extractUkrainianSegments(content);
    const toTranslate = [...segments.keys()].filter(s => !cache[s]);

    if (toTranslate.length > 0) {
        console.log(`  🔄 Translating ${toTranslate.length} new segments...`);
        const BATCH = 40;
        for (let i = 0; i < toTranslate.length; i += BATCH) {
            await translateBatch(toTranslate.slice(i, i + BATCH));
            if (toTranslate.length > BATCH) await new Promise(r => setTimeout(r, 1500));
        }
        saveCache();
    }

    // Apply all cached translations to content
    let newContent = content;
    let changes = 0;

    // Sort by length descending to avoid partial matches
    const allToReplace = [...new Set([...segments.keys(), ...Object.keys(cache).filter(k => hasUkrainian(k) && content.includes(k))])];
    allToReplace.sort((a, b) => b.length - a.length);

    for (const original of allToReplace) {
        const translation = cache[original];
        if (!translation || translation === original || hasUkrainian(translation)) continue;
        if (newContent.includes(original)) {
            newContent = newContent.split(original).join(translation);
            changes++;
        }
    }

    if (changes > 0 && newContent !== content) {
        fs.writeFileSync(filepath, newContent, 'utf-8');
        return true;
    }

    return false;
}

async function main() {
    console.log('🇵🇹 Auto-translate Ukrainian → Portuguese (pt-PT)');
    console.log('='.repeat(60));

    const files = collectFiles(TARGET_DIRS);
    console.log(`📁 Found ${files.length} files\n`);

    let totalChanged = 0;

    for (const filepath of files.sort()) {
        const rel = filepath.replace('/home/andriy/deapseak/', '');

        // Quick pre-check
        try {
            const content = fs.readFileSync(filepath, 'utf-8');
            if (!hasUkrainian(content)) continue;
        } catch { continue; }

        console.log(`📄 ${rel}`);
        const changed = await processFile(filepath);

        if (changed) {
            console.log(`  ✅ File updated`);
            totalChanged++;
        } else {
            console.log(`  ℹ️  No changes`);
        }
    }

    // Final stats
    const remaining = { client: 0, tech: 0, dispatcher: 0 };
    for (const dir of TARGET_DIRS) {
        const key = dir.split('/')[1];
        try {
            const out = execSync(`grep -rl --include="*.html" --include="*.js" -P "[\\x{0400}-\\x{04FF}]" ${dir} 2>/dev/null | wc -l`, { encoding: 'utf-8' }).trim();
            remaining[key] = parseInt(out) || 0;
        } catch {}
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Done! Modified ${totalChanged} files`);
    console.log(`💾 Cache: ${Object.keys(cache).length} translations`);
    console.log(`\n📊 Files still with Ukrainian text:`);
    for (const [k, v] of Object.entries(remaining)) {
        console.log(`  ${k}: ${v} files`);
    }

    if (totalChanged > 0) {
        console.log('\n📝 To commit:');
        console.log('  git add pages/client pages/tech pages/dispatcher');
        console.log('  git commit -m "fix: translate Ukrainian → Portuguese in client/tech/dispatcher panels"');
    }
}

main().catch(console.error);
