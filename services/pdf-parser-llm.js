/**
 * LLM-BASED PDF PARSER — Groq/Gemini structured extraction
 * =========================================================
 * Sends raw PDF text to an LLM and asks for structured JSON.
 * Handles any inspection company format without regex fragility.
 *
 * Output schema matches existing parser output so it can be used
 * as a drop-in replacement / primary extractor in pdf-parser-unified.js.
 *
 * Priority: Groq (fast, free) → Gemini (fallback)
 */

// Max characters to send — keeps token usage manageable while covering full report
const MAX_TEXT_CHARS = 8000;

// ─── PROMPT ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert at extracting structured data from Portuguese elevator inspection reports (relatórios de inspeção de elevadores).

These reports are issued by inspection companies (GATECI, Bureau Veritas, CML, CERTIEL, APCER, NOMINARE, IEP, etc.) and follow Portuguese regulations DL 320/2002.

Your job: extract all relevant fields and return ONLY valid JSON with no markdown, no explanation, no code blocks.

Classification rules:
- C1 = imobilização imediata (immediate immobilization) — most critical
- C2 = reprovação (failed inspection) — serious
- C2* = C2 under Despacho 17/2022 modernization agreement — 2-year correction deadline
- C3 = observação (observation) — minor, no immobilization
- Violations appear as "Cláusula C1/C2/C3 — Artigo Xº — description" or variations

Result interpretation:
- "Aprovado" without C1/C2 violations = passed
- "Aprovado" with C2* = passed with conditions (certType: cert_2_years)
- "Reprovado" or has C1/C2 violations = failed
- C1 → certType: immobilization, nextInspection: +30 days
- C2 plain → certType: reinspection, nextInspection: +30 days
- C2* or clean → certType: cert_2_years, nextInspection: +24 months`;

function buildExtractionPrompt(pdfText) {
    const truncated = pdfText.length > MAX_TEXT_CHARS ? pdfText.slice(0, MAX_TEXT_CHARS) + '\n[... truncated]' : pdfText;
    return `Extract data from this Portuguese elevator inspection report and return ONLY valid JSON.

Required output format:
{
  "inspectionDate": "YYYY-MM-DD or null",
  "result": "approved" | "approved_c2star" | "failed" | "immobilized" | "unknown",
  "reportNumber": "string or null",
  "inspectorName": "string or null",
  "installationNumber": "string or null",
  "address": "string or null",
  "inspectionCompany": "string or null",
  "nextInspectionDate": "YYYY-MM-DD or null (only if explicitly stated in the report)",
  "violations": [
    {
      "classification": "C1" | "C2" | "C3",
      "article": "the article number ONLY (e.g. '25', '25.3', '78º-2') — NOT the decree/law number. If violation cites 'Art. 25 of DL 513/70', article = '25'. If it cites 'DL 320/2002 Art. 8-1', article = '8-1'.",
      "description": "full description text of the violation"
    }
  ]
}

Rules:
- violations must ONLY include actual deficiencies found, NOT legend/explanation text
- Ignore boilerplate sections like "OBRIGAÇÕES DO PROPRIETÁRIO", "SIGNIFICADO DAS CLÁUSULAS", "NOTA DE CLÁUSULAS" legend rows, and footnote tables at the bottom explaining what C1/C2/C3 mean
- description must be the actual defect description, minimum 10 characters
- When a violation has a parenthetical note on the following line (e.g. "( Circuito de Iluminação na Casa das Máquinas )"), append it to the description so each entry is unique
- Some violations reference a Decreto-Lei instead of an article number (e.g. "C3 | DL. 740/74 e Port.949-A/2006 - ..."). Include these as violations; use the DL reference as the article field (e.g. "DL.740/74")
- If a section says "não foram detetadas deficiências" → violations: []
- For result: "immobilized" only if explicit "Imobilização imediata" or C1 present
- nextInspectionDate: only set if the report explicitly states a date like "Requerer Inspeção até DD/MM/YYYY"
- Return null for any field not found in the document
- CRITICAL — classification label: ALWAYS use the explicit label written in the document ("C1 |", "C2 |", "C3 |") as the violation classification. Do NOT infer or override based on the regulation article or decree number. If the document writes "C3 | Despacho nº18/2022" classify as C3, even if you believe that regulation is normally C2 or C2*. The inspector's label in the document is always authoritative.

REPORT TEXT:
${truncated}`;
}

// ─── API CALLS ────────────────────────────────────────────────────────────────

async function callGroq(pdfText) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY not set');

    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: buildExtractionPrompt(pdfText) }
            ],
            temperature: 0.1,
            max_tokens: 2048,
            response_format: { type: 'json_object' }
        }),
        signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Groq HTTP ${response.status}: ${err.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('Groq: empty response');
    return text;
}

async function callGemini(pdfText) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');

    const model = process.env.GOOGLE_AI_MODEL || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `${SYSTEM_PROMPT}\n\n${buildExtractionPrompt(pdfText)}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 2048,
                responseMimeType: 'application/json'
            }
        }),
        signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini HTTP ${response.status}: ${err.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini: empty response');
    return text;
}

// ─── JSON VALIDATION ─────────────────────────────────────────────────────────

function parseAndValidateLLMResponse(raw) {
    let cleaned = raw.trim();
    // Strip markdown code block if LLM ignored instructions
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const obj = JSON.parse(cleaned);

    // Validate required shape
    if (typeof obj !== 'object' || obj === null) throw new Error('Response is not an object');

    // Normalize violations
    if (!Array.isArray(obj.violations)) obj.violations = [];
    obj.violations = obj.violations.filter(v => {
        if (!v || typeof v !== 'object') return false;
        if (!['C1', 'C2', 'C3'].includes(v.classification)) return false;
        if (typeof v.description !== 'string' || v.description.trim().length < 10) return false;
        return true;
    }).map(v => ({
        classification: v.classification,
        article: String(v.article || '').trim() || '0',
        description: String(v.description).trim(),
        _llm: true   // bypass artNum>500 filter in isValidViolationObject
    }));

    return obj;
}

// ─── MAP TO STANDARD FORMAT ───────────────────────────────────────────────────

function mapToStandardFormat(llmData) {
    return {
        success: true,
        metadata: {
            date: llmData.inspectionDate || null,
            reportNumber: llmData.reportNumber || null,
            inspector: llmData.inspectorName || null,
            installationNumber: llmData.installationNumber || null,
            address: llmData.address || null,
            company: llmData.inspectionCompany || null,
            nextInspectionDate: llmData.nextInspectionDate || null,
            llmResult: llmData.result || 'unknown'
        },
        violations: llmData.violations || [],
        rawText: '',  // set by caller
        detectedFormat: 'llm',
        _llmExtracted: true
    };
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

/**
 * Extract structured data from PDF text using an LLM.
 * Tries Groq first, falls back to Gemini.
 *
 * @param {string} pdfText  - Raw text extracted from PDF
 * @returns {Promise<Object|null>} - Standard parser result object, or null on failure
 */
async function extractWithLLM(pdfText) {
    if (!pdfText || pdfText.trim().length < 100) return null;

    let rawJson = null;

    // Try Groq first
    if (process.env.GROQ_API_KEY) {
        try {
            rawJson = await callGroq(pdfText);
            console.log('✅ LLM parser: Groq extraction successful');
        } catch (err) {
            console.warn('⚠️ LLM parser: Groq failed —', err.message);
        }
    }

    // Fall back to Gemini
    if (!rawJson && process.env.GEMINI_API_KEY) {
        try {
            rawJson = await callGemini(pdfText);
            console.log('✅ LLM parser: Gemini extraction successful');
        } catch (err) {
            console.warn('⚠️ LLM parser: Gemini failed —', err.message);
        }
    }

    if (!rawJson) return null;

    try {
        const llmData = parseAndValidateLLMResponse(rawJson);
        const result = mapToStandardFormat(llmData);
        result.rawText = pdfText;
        return result;
    } catch (err) {
        console.warn('⚠️ LLM parser: JSON parse/validation failed —', err.message);
        return null;
    }
}

module.exports = { extractWithLLM };
