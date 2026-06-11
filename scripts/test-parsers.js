#!/usr/bin/env node
/**
 * Testes de regressão para os parsers de PDF de inspecção.
 * Executa: node scripts/test-parsers.js
 *
 * Adicionar um novo teste: inserir uma entrada em TEST_CASES com:
 *   { label, file, expected: { c1, c2, c3, certType?, validUntilDays? } }
 *   validUntilDays: número de dias a partir da data de inspecção (±3 tolerância)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const fs = require('fs');
const { parsePDF } = require('../services/pdf-parser-unified');

const UPLOADS = path.join(__dirname, '..', 'uploads', 'pdfs');

const TEST_CASES = [
    {
        label: 'CML reprovado C2:5',
        file: 'report-1779782037855-805364272.pdf',
        expected: { c1: 0, c2: 5, c3: 0, certType: 'reinspection', validUntilDays: 30 },
    },
    {
        label: 'GATECI reprovado C2:1 C3:5',
        file: 'report-1779782239073-246506521.pdf',
        expected: { c1: 0, c2: 1, c3: 5, certType: 'reinspection', validUntilDays: 30 },
    },
    {
        label: 'GATECI reprovado C2:7 C3:8',
        file: 'report-1779782285154-457500250.pdf',
        expected: { c1: 0, c2: 7, c3: 8, certType: 'reinspection', validUntilDays: 30 },
    },
    {
        label: 'BV aprovado 0 violações (cert 2 anos)',
        file: 'report-1779782423175-227568331.pdf',
        expected: { c1: 0, c2: 0, c3: 0, certType: 'cert_2_years', validUntilDays: 730 },
    },
    {
        label: 'GATECI Despacho17/2022 C3:4 (cert 2 anos)',
        file: 'report-1780397708670-92154567.pdf',
        expected: { c1: 0, c2: 0, c3: 4, certType: 'cert_2_years', validUntilDays: 730 },
    },
];

// ─── runner ───────────────────────────────────────────────────────────────────

function daysDiff(iso) {
    if (!iso) return null;
    return Math.round((new Date(iso) - Date.now()) / 86400000 + 365.25); // relative to inspection date, not now
}

async function run() {
    let passed = 0, failed = 0;

    for (const tc of TEST_CASES) {
        const filePath = path.join(UPLOADS, tc.file);
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  SKIP  ${tc.label} — ficheiro não encontrado`);
            continue;
        }

        let result;
        try {
            result = await parsePDF(filePath);
        } catch (err) {
            console.log(`❌ ERROR  ${tc.label}: ${err.message}`);
            failed++;
            continue;
        }

        const s = result.stats || {};
        const got = { c1: s.critical || 0, c2: s.medium || 0, c3: s.low || 0 };
        const exp = tc.expected;

        const countOk = got.c1 === exp.c1 && got.c2 === exp.c2 && got.c3 === exp.c3;
        const certOk  = !exp.certType || result.certType === exp.certType;

        // validUntil: calculate expected date from inspection date ± 3 days tolerance
        let validUntilOk = true;
        if (exp.validUntilDays && result.validUntil) {
            const inspDate = result.metadata?.date;
            const inspParsed = inspDate ? new Date(inspDate.replace(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/, '$3-$2-$1')) : null;
            if (inspParsed && !isNaN(inspParsed)) {
                const expectedDate = new Date(inspParsed);
                expectedDate.setDate(expectedDate.getDate() + exp.validUntilDays);
                const actualDate = new Date(result.validUntil);
                const diffDays = Math.abs((actualDate - expectedDate) / 86400000);
                validUntilOk = diffDays <= 3;
                if (!validUntilOk) {
                    console.log(`   validUntil got ${result.validUntil?.substring(0,10)} expected ≈${expectedDate.toISOString().substring(0,10)} (diff ${Math.round(diffDays)}d)`);
                }
            }
        }

        const ok = countOk && certOk && validUntilOk;
        if (ok) {
            passed++;
            console.log(`✅ PASS  ${tc.label} | C1:${got.c1} C2:${got.c2} C3:${got.c3} certType:${result.certType} validUntil:${result.validUntil?.substring(0,10)}`);
        } else {
            failed++;
            const details = [];
            if (!countOk)     details.push(`counts got C1:${got.c1} C2:${got.c2} C3:${got.c3} expected C1:${exp.c1} C2:${exp.c2} C3:${exp.c3}`);
            if (!certOk)      details.push(`certType got "${result.certType}" expected "${exp.certType}"`);
            if (!validUntilOk) details.push(`validUntil out of range`);
            console.log(`❌ FAIL  ${tc.label} — ${details.join(' | ')}`);
        }
    }

    console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error('FATAL:', err); process.exit(1); });
