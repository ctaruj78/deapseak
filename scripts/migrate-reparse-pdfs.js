#!/usr/bin/env node
/**
 * Migração: re-parseia todos os PDFs de inspeção existentes em MongoDB
 * e actualiza violations, stats, validUntil, nextInspectionDate, status.
 *
 * Uso:
 *   node scripts/migrate-reparse-pdfs.js [--dry-run] [--lift <municipalNumber>]
 *
 * Flags:
 *   --dry-run   Mostra o que seria alterado sem gravar
 *   --lift MN   Processa apenas o lift com aquele municipalNumber
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const path     = require('path');
const fs       = require('fs');
const { parsePDF } = require('../services/pdf-parser-unified');

const DRY_RUN    = process.argv.includes('--dry-run');
const LIFT_FILTER = (() => {
    const idx = process.argv.indexOf('--lift');
    return idx !== -1 ? process.argv[idx + 1] : null;
})();

const BASE_DIR = path.join(__dirname, '..');

// ── MongoDB ──────────────────────────────────────────────────────────────────

async function getDB() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/deapseak';
    await mongoose.connect(uri);
    return mongoose.connection.db;
}

// ── Normalizar violations para o formato novo ─────────────────────────────────
// Histórico antigo usava { type: 'C2', article, description }
// Novo parser usa { classification: 'C2', article, description }

function normalizeViolations(violations) {
    return (violations || []).map(v => {
        const out = { ...v };
        if (!out.classification && out.type) {
            out.classification = out.type;
        }
        return out;
    });
}

function countViolations(violations) {
    let c1 = 0, c2 = 0, c3 = 0;
    for (const v of violations || []) {
        const cls = (v.classification || v.type || '').toUpperCase().replace('*', '');
        if (cls === 'C1') c1++;
        else if (cls === 'C2') c2++;
        else if (cls === 'C3') c3++;
    }
    return { c1, c2, c3 };
}

// ── Resolução do caminho físico do PDF ───────────────────────────────────────

function resolvePdfPath(reportFile) {
    if (!reportFile) return null;
    // reportFile é "/uploads/pdfs/report-xxx.pdf" → caminho absoluto
    const rel = reportFile.startsWith('/') ? reportFile.slice(1) : reportFile;
    const abs = path.join(BASE_DIR, rel);
    return fs.existsSync(abs) ? abs : null;
}

// ── Migração ──────────────────────────────────────────────────────────────────

async function run() {
    const db = await getDB();
    const collection = db.collection('lifts');

    const query = LIFT_FILTER
        ? { municipalNumber: LIFT_FILTER, 'inspectionHistory.0': { $exists: true } }
        : { 'inspectionHistory.0': { $exists: true } };

    const lifts = await collection.find(query).toArray();
    console.log(`\n📋 Lifts a processar: ${lifts.length}${LIFT_FILTER ? ` (filtro: ${LIFT_FILTER})` : ''}${DRY_RUN ? ' [DRY-RUN]' : ''}\n`);

    let total = 0, updated = 0, skipped = 0, errors = 0, noPdf = 0;

    for (const lift of lifts) {
        const mn = lift.municipalNumber || String(lift._id);
        const history = lift.inspectionHistory || [];

        let liftModified = false;
        const newHistory = [];

        for (const entry of history) {
            total++;
            const pdfAbsPath = resolvePdfPath(entry.reportFile || entry.pdfPath);

            if (!pdfAbsPath) {
                noPdf++;
                console.log(`  ⚠️  ${mn} — PDF não encontrado: ${entry.reportFile || '(sem reportFile)'}`);
                newHistory.push(entry);
                continue;
            }

            let parsed;
            try {
                parsed = await parsePDF(pdfAbsPath);
            } catch (err) {
                errors++;
                console.error(`  ❌ ${mn} — Erro ao parsear ${path.basename(pdfAbsPath)}: ${err.message}`);
                newHistory.push(entry);
                continue;
            }

            const newViolations = normalizeViolations(parsed.violations || []);
            const newCounts     = countViolations(newViolations);
            const oldCounts     = countViolations(entry.violations);

            const changed =
                newCounts.c1 !== oldCounts.c1 ||
                newCounts.c2 !== oldCounts.c2 ||
                newCounts.c3 !== oldCounts.c3 ||
                (entry.violations || []).length !== newViolations.length;

            const dateStr = entry.date
                ? new Date(entry.date).toISOString().slice(0, 10)
                : '(sem data)';

            if (!changed) {
                skipped++;
                console.log(`  ✅ ${mn}  [${dateStr}]  C1:${oldCounts.c1} C2:${oldCounts.c2} C3:${oldCounts.c3}  — sem alterações`);
                newHistory.push(entry);
                continue;
            }

            updated++;
            liftModified = true;
            console.log(
                `  🔄 ${mn}  [${dateStr}]  ` +
                `C1:${oldCounts.c1}→${newCounts.c1}  ` +
                `C2:${oldCounts.c2}→${newCounts.c2}  ` +
                `C3:${oldCounts.c3}→${newCounts.c3}  ` +
                `(${path.basename(pdfAbsPath)})`
            );

            const updatedEntry = {
                ...entry,
                violations:          newViolations,
                stats: {
                    critical: newCounts.c1,
                    medium:   newCounts.c2,
                    low:      newCounts.c3,
                },
                pdfPath:             pdfAbsPath,
                certType:            parsed.certType            ?? entry.certType,
                validUntil:          parsed.validUntil          ?? entry.validUntil,
                nextInspectionDate:  parsed.nextInspectionDate  ?? entry.nextInspectionDate,
                parsedAt:            new Date(),
            };

            // Actualizar status do lift com base no histórico mais recente (entrada mais nova)
            if (!lift._latestDate || new Date(entry.date) > new Date(lift._latestDate)) {
                lift._latestDate    = entry.date;
                lift._latestStatus  = parsed.passed ? 'approved' : 'failed';
                lift._latestValidUntil = parsed.validUntil;
                lift._latestNext       = parsed.nextInspectionDate;
            }

            newHistory.push(updatedEntry);
        }

        if (!liftModified) continue;

        if (DRY_RUN) {
            console.log(`    [dry-run] não gravado\n`);
            continue;
        }

        // Preparar update
        const updateFields = {
            inspectionHistory: newHistory,
        };
        if (lift._latestValidUntil) {
            updateFields.nextInspectionDate = lift._latestNext || lift._latestValidUntil;
            updateFields.inspectionStatus   = lift._latestStatus;
        }

        await collection.updateOne(
            { _id: lift._id },
            { $set: updateFields }
        );
        console.log(`    💾 Gravado: ${mn}\n`);
    }

    console.log('\n─────────────────────────────────────────');
    console.log(`Total entradas : ${total}`);
    console.log(`Actualizadas   : ${updated}`);
    console.log(`Sem alterações : ${skipped}`);
    console.log(`Sem PDF        : ${noPdf}`);
    console.log(`Erros          : ${errors}`);
    console.log('─────────────────────────────────────────\n');

    await mongoose.disconnect();
}

run().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
});
