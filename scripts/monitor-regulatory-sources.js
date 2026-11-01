#!/usr/bin/env node
/**
 * Vigilância de fontes regulamentares (DGEG / IPAC) — deteta alterações e notifica os admins.
 *
 * Fontes:
 *  - IPAC: ficha de cada EIIE em ENTIDADES_IPAC (estado de acreditação / suspensões)
 *  - IPAC: página inicial — lista de circulares publicadas (CC-NN-AAAA.pdf)
 *  - DGEG: acervo documental e página "Manutenção e inspeção de ascensores" (links de documentos)
 *
 * A primeira execução só grava a linha de base (sem notificações). Em execuções seguintes,
 * qualquer diferença gera um registo em `regulatory_alerts` e uma notificação para cada admin.
 * Estado guardado em `regulatory_watch`.
 *
 * Uso:  node scripts/monitor-regulatory-sources.js [--dry-run]
 * Cron: ver crontab (semanal, segunda 08:00).
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');

const DRY = process.argv.includes('--dry-run');
const UA = 'Mozilla/5.0 (FestLift regulatory monitor)';

// EIIE a vigiar (ID da ficha IPAC). Acrescentar aqui outras entidades inspetoras conforme necessário.
const ENTIDADES_IPAC = [
    { id: 'I0095', nome: 'AIPEL' }
];

const decodeEntities = s => s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

const textOf = html => decodeEntities(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]*>/g, ' '))
    .replace(/[ \t\r]+/g, ' ').replace(/\n\s*/g, '\n');

async function fetchText(url, latin1 = false) {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.toString(latin1 ? 'latin1' : 'utf8');
}

// Cada fonte devolve { snapshot: [linhas ordenadas] }
const sources = [
    ...ENTIDADES_IPAC.map(e => ({
        key: `ipac-ficha-${e.id}`,
        label: `IPAC — acreditação ${e.nome} (${e.id})`,
        url: `http://www.ipac.pt/pesquisa/ficha_ois.asp?ID=${e.id}`,
        async read() {
            const t = textOf(await fetchText(this.url, true));
            const linhas = t.split('\n').map(l => l.trim())
                .filter(l => /suspens|certificado|anexo técnico|retirad|cancelad|vigor/i.test(l));
            return [...new Set(linhas)].sort();
        }
    })),
    {
        key: 'ipac-circulares',
        label: 'IPAC — circulares publicadas',
        url: 'https://www.ipac.pt',
        async read() {
            const h = await fetchText(this.url, true);
            return [...new Set([...h.matchAll(/circulares\/([A-Za-z0-9_.-]+\.pdf)/g)].map(m => m[1]))].sort();
        }
    },
    {
        key: 'dgeg-acervo-elevacao',
        label: 'DGEG — acervo documental (instalações de elevação)',
        url: 'https://www.dgeg.gov.pt/pt/areas-setoriais/energia/energia-eletrica/instalacoes-de-elevacao/acervo-documental/',
        async read() {
            const h = await fetchText(this.url);
            return [...new Set([...h.matchAll(/href="([^"]*\.(?:pdf|xlsx?))"/gi)].map(m => decodeURIComponent(m[1])))].sort();
        }
    },
    {
        key: 'dgeg-manutencao-inspecao',
        label: 'DGEG — manutenção e inspeção de ascensores',
        url: 'https://www.dgeg.gov.pt/pt/areas-setoriais/energia/energia-eletrica/instalacoes-de-elevacao/manutencao-e-inspecao-de-ascensores/',
        async read() {
            const h = await fetchText(this.url);
            return [...new Set([...h.matchAll(/href="([^"]*(?:\.pdf|\.xlsx?|instalacoes-de-elevacao\/[^"]+))"/gi)].map(m => decodeURIComponent(m[1])))].sort();
        }
    }
];

async function notificarAdmins(db, alerta) {
    const admins = await db.collection('users').find({ role: 'admin' }).toArray();
    const agora = new Date();
    for (const admin of admins) {
        await db.collection('notifications').insertOne({
            userId: admin._id.toString(),
            type: 'regulatory_change',
            title: 'Alteração em fonte regulamentar',
            message: `${alerta.label}: ${alerta.resumo}`,
            icon: 'fas fa-gavel',
            priority: 'high',
            status: 'unread',
            timestamp: agora,
            createdAt: agora
        });
    }
}

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    let erros = 0;

    for (const src of sources) {
        try {
            const atual = await src.read();
            if (!atual.length) throw new Error('leitura vazia (a página mudou de estrutura?)');

            const anterior = await db.collection('regulatory_watch').findOne({ key: src.key });
            if (!anterior) {
                console.log(`[base] ${src.label}: ${atual.length} itens`);
                if (!DRY) await db.collection('regulatory_watch').insertOne({ key: src.key, label: src.label, url: src.url, snapshot: atual, checkedAt: new Date(), changedAt: null });
                continue;
            }

            const antes = new Set(anterior.snapshot);
            const depois = new Set(atual);
            const novos = atual.filter(x => !antes.has(x));
            const removidos = anterior.snapshot.filter(x => !depois.has(x));

            if (!novos.length && !removidos.length) {
                console.log(`[ok]   ${src.label}: sem alterações`);
                if (!DRY) await db.collection('regulatory_watch').updateOne({ key: src.key }, { $set: { checkedAt: new Date() } });
                continue;
            }

            const resumo = [
                novos.length ? `novo: ${novos.slice(0, 5).join(' | ')}` : '',
                removidos.length ? `removido: ${removidos.slice(0, 5).join(' | ')}` : ''
            ].filter(Boolean).join(' — ');
            console.log(`[ALTERADO] ${src.label}: ${resumo}`);

            if (!DRY) {
                const alerta = { key: src.key, label: src.label, url: src.url, novos, removidos, resumo, createdAt: new Date(), lido: false };
                await db.collection('regulatory_alerts').insertOne(alerta);
                await notificarAdmins(db, alerta);
                await db.collection('regulatory_watch').updateOne({ key: src.key }, { $set: { snapshot: atual, checkedAt: new Date(), changedAt: new Date() } });
            }
        } catch (e) {
            erros++;
            console.error(`[erro] ${src.label}: ${e.message}`);
        }
    }

    await mongoose.disconnect();
    process.exit(erros ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
