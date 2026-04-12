// ═══════════════════════════════════════════════════════════
// 🔄 REGULATIONS UPDATER — FestLift
// ═══════════════════════════════════════════════════════════
// Verifica se os URLs dos regulamentos conhecidos continuam
// acessíveis e informa o administrador sobre o que verificar
// manualmente.
//
// LIMITAÇÃO CONHECIDA: DR.pt e DGEG.gov.pt bloqueiam IPs de
// cloud (AWS/GitHub). A verificação de conteúdo não funciona
// a partir de servidores cloud. Timeouts = IP bloqueado, não
// significa que o URL mudou.
// ═══════════════════════════════════════════════════════════
'use strict';

const https = require('https');
const http  = require('http');
const fs    = require('fs').promises;
const path  = require('path');

// ─── Regulamentos a monitorizar ──────────────────────────────────────────────
const KNOWN_REGULATIONS = [
    { id:'DEC_513_1970',    label:'Decreto 513/70 — Regulamento Segurança Ascensores Eléctricos',     url:'https://diariodarepublica.pt/dr/detalhe/decreto/513-1970-179754',           manualUrl:'https://dre.pt/dre/detalhe/decreto/513-1970-179754',           lastKnownPublished:'1970-12-19' },
    { id:'DEC_REG_13_1980', label:'Decreto Regulamentar 13/80 — Alterações ao Dec. 513/70',           url:'https://diariodarepublica.pt/dr/detalhe/decreto-regulamentar/13-1980-473932', manualUrl:'https://dre.pt/dre/detalhe/decreto-regulamentar/13-1980-473932', lastKnownPublished:'1980-07-10' },
    { id:'DL_295_1998',     label:'DL 295/98 — Transposição Diretiva 95/16/CE (elevadores)',          url:'https://diariodarepublica.pt/dr/detalhe/decreto-lei/295-1998-370467',        manualUrl:'https://dre.pt/dre/detalhe/decreto-lei/295-1998-370467',        lastKnownPublished:'1998-09-22' },
    { id:'DL_320_2002',     label:'DL 320/2002 — Manutenção e Inspeção de Elevadores',                url:'https://diariodarepublica.pt/dr/detalhe/decreto-lei/320-2002-463660',        manualUrl:'https://dre.pt/dre/detalhe/decreto-lei/320-2002-463660',        lastKnownPublished:'2002-12-28' },
    { id:'LEI_65_2013',     label:'Lei 65/2013 — Regime de Acesso à Atividade (EMIE/EIIE)',           url:'https://diariodarepublica.pt/dr/detalhe/lei/65-2013-499856',                 manualUrl:'https://dre.pt/dre/detalhe/lei/65-2013-499856',                 lastKnownPublished:'2013-08-27' },
    { id:'DL_58_2017',      label:'DL 58/2017 — Diretiva 2014/33/UE (ascensores novos)',              url:'https://diariodarepublica.pt/dr/detalhe/decreto-lei/58-2017-106740654',      manualUrl:'https://dre.pt/dre/detalhe/decreto-lei/58-2017-106740654',      lastKnownPublished:'2017-05-25' },
    { id:'PORT_348_2013',   label:'Portaria 348/2013 — Regulamento de Inspeção Periódica (RIPO)',     url:'https://diariodarepublica.pt/dr/detalhe/portaria/348-2013-260441',          manualUrl:'https://dre.pt/dre/detalhe/portaria/348-2013-260441',          lastKnownPublished:'2013-11-29' },
    { id:'PORT_185_2013',   label:'Portaria 185/2013 — Acreditação das EIIE',                         url:'https://diariodarepublica.pt/dr/detalhe/portaria/185-2013-258812',          manualUrl:'https://dre.pt/dre/detalhe/portaria/185-2013-258812',          lastKnownPublished:'2013-05-07' },
    { id:'DL_103_2008',     label:'DL 103/2008 — Directiva Máquinas 2006/42/CE',                      url:'https://diariodarepublica.pt/dr/detalhe/decreto-lei/103-2008-539849',        manualUrl:'https://dre.pt/dre/detalhe/decreto-lei/103-2008-539849',        lastKnownPublished:'2008-06-24' }
];

// Links para verificação manual no browser
const MANUAL_CHECK_LINKS = [
    { label:'DGEG — Legislação de Ascensores',           url:'https://www.dgeg.gov.pt/pt/areas-setoriais/energia/ascensores-e-equipamentos-sob-pressao/ascensores/legislacao/', description:'Página oficial DGEG com toda a legislação aplicável' },
    { label:'DR.pt — Pesquisa "ascensores"',             url:'https://diariodarepublica.pt/dr/pesquisa?q=ascensores&tipo=legislacao',  description:'Nova legislação sobre ascensores no Diário da República' },
    { label:'DR.pt — Pesquisa "elevadores"',             url:'https://diariodarepublica.pt/dr/pesquisa?q=elevadores&tipo=legislacao',  description:'Nova legislação sobre elevadores no Diário da República' },
    { label:'IPAC — Entidades acreditadas (EIIE/EMIE)',  url:'https://www.ipac.pt/pesquisa/lista_oa.asp',                              description:'Lista atualizada das entidades acreditadas' }
];

// ─── HTTP com timeout ─────────────────────────────────────────────────────────
function fetchWithTimeout(url, timeoutMs = 7000) {
    return new Promise((resolve) => {
        const protocol = url.startsWith('https') ? https : http;
        let settled = false;

        const done = (result) => { if (!settled) { settled = true; resolve(result); } };

        const timer = setTimeout(() => done({ statusCode: 0, error: 'timeout', body: '' }), timeoutMs);

        const req = protocol.get(url, {
            headers: { 'User-Agent': 'FestLift-Checker/2.0', 'Accept': 'text/html,*/*' }
        }, (res) => {
            clearTimeout(timer);

            // Segue redirect uma vez
            if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
                const redir = res.headers.location.startsWith('http')
                    ? res.headers.location
                    : new URL(res.headers.location, url).href;
                res.destroy();
                fetchWithTimeout(redir, timeoutMs).then(done);
                return;
            }

            let body = '';
            res.on('data', chunk => { if (body.length < 1024) body += chunk; });
            res.on('end',  () => done({ statusCode: res.statusCode, body, error: null }));
            res.on('error',() => done({ statusCode: res.statusCode, body, error: 'read_error' }));
        });

        req.on('error', (err) => { clearTimeout(timer); done({ statusCode: 0, error: err.code || err.message, body: '' }); });
    });
}

function classifyResult(res) {
    if (res.error === 'timeout')  return { status: 'timeout',   label: '⏱️ Timeout — IP cloud provavelmente bloqueado' };
    if (res.error)                return { status: 'net_error', label: `❌ Erro de rede: ${res.error}` };
    if (res.statusCode === 200)   return { status: 'ok',        label: '✅ HTTP 200 acessível' };
    if (res.statusCode === 403)   return { status: 'blocked',   label: '🚫 HTTP 403 Acesso negado' };
    if (res.statusCode === 404)   return { status: 'not_found', label: '❓ HTTP 404 — URL pode ter mudado!' };
    if (res.statusCode === 0)     return { status: 'no_resp',   label: '🔇 Sem resposta' };
    return { status: 'other', label: `⚠️ HTTP ${res.statusCode}` };
}

// ─── Classe Principal ─────────────────────────────────────────────────────────
class RegulationsUpdater {
    constructor() {
        this.dataPath  = path.join(__dirname, '../data/portugal-lift-regulations.json');
        this.logPath   = path.join(__dirname, '../logs/regulations-updates.log');
        this.notifPath = path.join(__dirname, '../logs/admin-notifications.json');
        this.db = null;
    }

    async log(msg) {
        const line = `[${new Date().toISOString()}] ${msg}`;
        console.log(line);
        try { await fs.appendFile(this.logPath, line + '\n'); } catch (_) {}
    }

    async loadDatabase() {
        this.db = JSON.parse(await fs.readFile(this.dataPath, 'utf-8'));
        return this.db;
    }

    // Verifica HTTP status de cada regulamento
    async verifyKnownRegulations() {
        await this.log('─── Verificação HTTP dos regulamentos ──────────────────────');
        const results = [];

        for (const reg of KNOWN_REGULATIONS) {
            const res = await fetchWithTimeout(reg.url, 6000);
            const cls = classifyResult(res);

            const note = cls.status === 'not_found'
                ? `URL pode ter mudado — verificar: ${reg.manualUrl}`
                : (cls.status === 'ok' && res.body.length < 100)
                    ? 'Resposta vazia (IP cloud bloqueado pelo servidor)'
                    : null;

            results.push({ id: reg.id, label: reg.label, url: reg.url, manualUrl: reg.manualUrl,
                lastKnownPublished: reg.lastKnownPublished, httpStatus: res.statusCode,
                classification: cls.status, statusLabel: cls.label, note, checkedAt: new Date().toISOString() });

            await this.log(`   ${cls.label.padEnd(45)} ${reg.id}${note ? '\n      ⤷ ' + note : ''}`);
        }

        return results;
    }

    // Auditoria dos artigos na BD local
    async auditLocalDatabase() {
        const result = { totalRegulations: this.db.regulations.length, totalArticles: 0, empty: [], all: [] };
        for (const reg of this.db.regulations) {
            const n = (reg.articles || []).length +
                      (reg.chapters || []).reduce((s, c) => s + (c.articles || []).length, 0);
            result.totalArticles += n;
            result.all.push({ id: reg.id, articles: n });
            if (n === 0) result.empty.push(reg.id);
        }
        await this.log(`   📚 BD: ${result.totalRegulations} regulamentos, ${result.totalArticles} artigos${result.empty.length ? ' | Vazios: ' + result.empty.join(', ') : ' ✅'}`);
        return result;
    }

    async saveAdminNotification(report) {
        let notifs = [];
        try { notifs = JSON.parse(await fs.readFile(this.notifPath, 'utf-8')); } catch (_) {}
        const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
        notifs = notifs.filter(n => new Date(n.timestamp).getTime() > cutoff);
        notifs.push({ type: 'regulations_check', timestamp: new Date().toISOString(), summary: report.summary });
        await fs.writeFile(this.notifPath, JSON.stringify(notifs, null, 2));
    }

    async checkForUpdates() {
        await this.log('═══════════════════════════════════════════════════════════');
        await this.log('🔄 VERIFICAÇÃO DE REGULAMENTOS — FestLift');
        await this.log('═══════════════════════════════════════════════════════════');

        try { await fs.mkdir(path.join(__dirname, '../logs'), { recursive: true }); } catch (_) {}

        await this.loadDatabase();

        const [urlResults, dbAudit] = await Promise.all([
            this.verifyKnownRegulations(),
            this.auditLocalDatabase()
        ]);

        const notFound = urlResults.filter(r => r.classification === 'not_found');
        const timeouts = urlResults.filter(r => r.classification === 'timeout').length;
        const ok       = urlResults.filter(r => r.classification === 'ok').length;

        let recommendation;
        if (notFound.length > 0)
            recommendation = `⚠️ ${notFound.length} URL(s) com 404 — verificar se mudaram: ${notFound.map(r=>r.id).join(', ')}`;
        else if (timeouts === urlResults.length)
            recommendation = 'ℹ️ Todos os URLs com timeout (IP cloud bloqueado) — URLs provavelmente intactos. Verificar manualmente no browser.';
        else
            recommendation = `✅ Nenhuma alteração crítica. ${ok} URLs acessíveis, ${timeouts} com timeout de IP cloud.`;

        const report = {
            generatedAt: new Date().toISOString(),
            environment: process.env.CODESPACE_NAME ? 'GitHub Codespaces' : (process.env.NODE_ENV || 'local'),
            cloudNote: 'DR.pt e DGEG.gov.pt bloqueiam IPs de cloud — timeout ≠ URL inválido',
            summary: { urlsChecked: urlResults.length, ok, timeouts, notFound: notFound.length, recommendation },
            urlVerification: urlResults,
            databaseAudit: dbAudit,
            manualCheckLinks: MANUAL_CHECK_LINKS,
            nextSteps: [
                'Abrir os "manualCheckLinks" num browser normal (não cloud) para verificar nova legislação',
                'Se encontrar nova lei: atualizar data/portugal-lift-regulations.json e o system prompt',
                'Próxima verificação recomendada: daqui a 6 meses (legislação raramente muda)'
            ]
        };

        const reportPath = path.join(__dirname, '../logs/regulations-check-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        await this.saveAdminNotification(report);

        await this.log('');
        await this.log(`📋 ${recommendation}`);
        await this.log('🔗 Links para verificação manual:');
        MANUAL_CHECK_LINKS.forEach(l => this.log(`   • ${l.url}`));
        await this.log('═══════════════════════════════════════════════════════════');

        return report;
    }
}

if (require.main === module) {
    new RegulationsUpdater().checkForUpdates()
        .then(r => { console.log('\n' + r.summary.recommendation); process.exit(0); })
        .catch(err => { console.error('❌', err.message); process.exit(1); });
}

module.exports = RegulationsUpdater;
