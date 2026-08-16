#!/usr/bin/env node
// Links existing Orcamento documents that have no liftId to a real lift,
// using the same fuzzy scoring logic as detectarLiftPorOrcamento() in
// backend/routes/orcamentos.js (never wired into the live route — dead code
// there, ported here since this is exactly the batch use case it was built for).
//
// Dry-run by default (prints matches, writes nothing). Pass --apply to persist.
// Run: node scripts/migrate-link-lifts.js [--apply]

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || process.env.DB_URI || 'mongodb://localhost:27017/deapseak';
const APPLY = process.argv.includes('--apply');

function normalizeText(value = '') {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9/\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeMunicipal(value = '') {
    return String(value || '').replace(/\s+/g, '').toLowerCase();
}

function extractMunicipalCandidates(text = '') {
    const matches = String(text || '').match(/\b\d{3,6}\/\d{2,6}\b/g) || [];
    return [...new Set(matches.map(normalizeMunicipal))];
}

function liftAddressToString(lift) {
    const addr = lift?.address || {};
    if (typeof addr === 'string') return addr;
    return [addr.street, addr.zipCode, addr.city].filter(Boolean).join(', ');
}

function scoreLiftForOrcamento(orcamento, lift) {
    let score = 0;
    const liftMunicipal = normalizeMunicipal(lift.municipalNumber || '');
    const textPool = [
        orcamento?.cliente?.morada,
        orcamento?.liftAddress,
        orcamento?.notas,
        ...(Array.isArray(orcamento?.servicos) ? orcamento.servicos.map(s => s?.descricao) : [])
    ].filter(Boolean).join(' | ');

    const municipalCandidates = extractMunicipalCandidates(textPool);
    if (liftMunicipal && municipalCandidates.includes(liftMunicipal)) score += 120;

    const liftStreet = normalizeText(lift?.address?.street || '');
    const cliAddress = normalizeText(orcamento?.cliente?.morada || '');
    const liftAddress = normalizeText(orcamento?.liftAddress || '');
    if (liftStreet && cliAddress && (cliAddress.includes(liftStreet) || liftStreet.includes(cliAddress))) score += 70;
    if (liftStreet && liftAddress && (liftAddress.includes(liftStreet) || liftStreet.includes(liftAddress))) score += 85;

    const liftZip = normalizeText(lift?.address?.zipCode || '');
    if (liftZip && (cliAddress.includes(liftZip) || liftAddress.includes(liftZip))) score += 20;

    return score;
}

async function detectarLiftPorOrcamento(db, orcamento) {
    const email = (orcamento?.cliente?.email || '').toLowerCase();

    let lifts = [];
    if (email) {
        lifts = await db.collection('lifts').find({ clientEmail: email }).toArray();
    }
    // Só cai para TODOS os elevadores se este cliente não tiver nenhum próprio —
    // mesma regra da função original; risco conhecido de falso-positivo entre
    // clientes diferentes, mitigado pelo threshold de score abaixo.
    if (!lifts.length) {
        lifts = await db.collection('lifts').find({}).toArray();
    }
    if (!lifts.length) return null;

    const scored = lifts
        .map(lift => ({ lift, score: scoreLiftForOrcamento(orcamento, lift) }))
        .sort((a, b) => b.score - a.score);

    const best = scored[0];
    const second = scored[1];
    if (!best || best.score < 80) return null;
    if (second && best.score - second.score < 20) return null;

    return {
        liftId: best.lift._id,
        liftAddress: liftAddressToString(best.lift),
        municipalNumber: best.lift.municipalNumber || null,
        score: best.score
    };
}

async function migrate() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected:', MONGODB_URI.replace(/:\/\/.*@/, '://***@'));
    console.log(APPLY ? '⚠️  MODE: --apply (vai escrever na base de dados)' : 'MODE: dry-run (nada será escrito — usa --apply para gravar)');

    const db = mongoose.connection.db;
    const orphans = await db.collection('orcamentos').find({
        $or: [{ liftId: null }, { liftId: { $exists: false } }]
    }).toArray();

    console.log(`Encontrados ${orphans.length} orçamento(s) sem liftId.\n`);

    let matched = 0, unmatched = 0;
    for (const orc of orphans) {
        const detected = await detectarLiftPorOrcamento(db, orc);
        const label = `${orc.numero} (${orc.status}) — ${orc.cliente?.nome || 'sem nome'} <${orc.cliente?.email || 's/ email'}>`;

        if (detected) {
            matched++;
            console.log(`✅ ${label}`);
            console.log(`   → lift ${detected.municipalNumber || detected.liftId} — "${detected.liftAddress}" (score ${detected.score})`);
            if (APPLY) {
                await db.collection('orcamentos').updateOne(
                    { _id: orc._id },
                    { $set: { liftId: detected.liftId, liftAddress: detected.liftAddress, lifts: [detected.liftId] } }
                );
                console.log('   ✏️  gravado');
            }
        } else {
            unmatched++;
            console.log(`❌ ${label} — sem correspondência confiante (morada: "${orc.cliente?.morada || 'sem morada'}")`);
        }
    }

    console.log(`\nResumo: ${matched} ligado(s), ${unmatched} sem correspondência confiante, ${orphans.length} total.`);
    if (!APPLY && matched > 0) {
        console.log('Nada foi gravado (dry-run). Reexecuta com --apply para persistir os matches acima.');
    }

    await mongoose.disconnect();
}

migrate().catch(err => {
    console.error('❌ Erro na migração:', err);
    process.exit(1);
});
