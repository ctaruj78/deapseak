// services/manuais.js — biblioteca de manuais/esquemas para técnicos
// Coleções: manual_docs (metadados) + manual_pages (texto por página, para pesquisa).
// Ficheiros em uploads/manuais/ (servidos só com sessão válida, nunca a clientes).
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const pdfParse = require('pdf-parse');

const DIR = path.join(__dirname, '..', 'uploads', 'manuais');

const DOC_TYPES = {
    schematic: 'Esquemas eléctricos',
    programming: 'Programação / parâmetros',
    troubleshooting: 'Avarias / diagnóstico',
    installation: 'Instalação / arranque',
    manual: 'Manual geral',
    quickref: 'Guia rápido'
};
const COMPONENTS = {
    controller: 'Quadro / maniobra',
    drive: 'Variador / inversor',
    panel: 'Painel / botoneira',
    alarm: 'Alarme / GSM',
    governor: 'Limitador / pára-quedas',
    machine: 'Máquina de tracção',
    hydraulic: 'Hidráulico',
    other: 'Outro'
};

// Regras de detecção para ficheiros novos (nome + texto das 1.ªs páginas).
// Ordem importa: primeira que casar ganha. Resultado fica reviewed=false até um humano confirmar.
const BRAND_RULES = [
    [/hidra\s*crono|hidral|orona/i, 'Hidra Crono'],
    [/asenkron|heytech|pva-8120/i, 'Asenkron'],
    [/\bedel\b/i, 'EDEL'],
    [/\botis\b/i, 'Otis'],
    [/arkel|mogilevlift|могилев/i, 'Arkel'],
    [/schindler/i, 'Schindler'],
    [/mlcombo|monarch/i, 'Monarch'],
    [/microbasic|kleemann/i, 'MicroBasic'],
    [/sar\s*plus\s*com|sarpluscom/i, 'SAR'],
    [/comportel/i, 'Comportel'],
    [/can-?lift|cl\s*08/i, 'CAN-LIFT'],
    [/fermator/i, 'Fermator'],
    [/yaskawa/i, 'Yaskawa'],
    [/invt/i, 'INVT'],
    [/kone/i, 'KONE'],
    [/thyssen|tk\s*elevator/i, 'TK Elevator']
];
const TYPE_RULES = [
    [/schemes?|esquemas?|schematic|wiring|diagrama|схем/i, 'schematic'],
    [/aver[ií]as|troubleshoot|fault|diagn[oó]stic|erro|error\s*code/i, 'troubleshooting'],
    [/programaci[oó]n|programming|programa[cç][aã]o|par[aâ]metros|parameter|настройк/i, 'programming'],
    [/gu[ií]a\s*r[aá]pida|quick|refer[eê]ncia\s*r[aá]pida/i, 'quickref'],
    [/instala[cç]|installation|montaje|montagem|setting/i, 'installation']
];
const COMPONENT_RULES = [
    [/variador|inversor|frenic|adrive|inverter|частот|vvvf/i, 'drive'],
    [/alarm|gsm|sarpluscom|plus\s*com/i, 'alarm'],
    [/limitador|governor|paraquedas|pára-quedas/i, 'governor'],
    [/painel|panel|pano|botoneira/i, 'panel'],
    [/hidr[aá]ulic|hidra|oleo|óleo/i, 'hydraulic'],
    [/maniobra|quadro|control\s*panel|controlo|cuadro|lcb|microbasic|combo/i, 'controller']
];

function norm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
function escapeRegex(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function slugify(s) {
    return norm(s).replace(/\.pdf$/i, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'documento';
}
function detectLanguage(text) {
    const t = norm(text).slice(0, 6000);
    if (/[а-я]{4}/i.test(text.slice(0, 3000))) return 'ru';
    const score = (words) => words.reduce((n, w) => n + (t.split(w).length - 1), 0);
    const pt = score([' do ', ' da ', ' para ', ' nao ', 'elevador', 'manual do', ' com ', 'instalacao']);
    const es = score([' del ', ' los ', ' para ', 'ascensor', 'instruccion', ' con ', 'cuadro', 'averias']);
    const en = score([' the ', ' and ', ' of ', ' with ', 'installation', 'lift ']);
    const best = Math.max(pt, es, en);
    if (best < 3) return 'other';
    return best === pt ? 'pt' : best === es ? 'es' : 'en';
}

function detectMeta(filename, firstText) {
    const hay = filename + ' ' + (firstText || '').slice(0, 4000);
    const pick = (rules, h) => { for (const [re, v] of rules) if (re.test(h)) return v; return null; };
    return {
        brand: pick(BRAND_RULES, hay) || 'Outro',
        docType: pick(TYPE_RULES, filename) || pick(TYPE_RULES, (firstText || '').slice(0, 800)) || 'manual',
        component: pick(COMPONENT_RULES, hay) || 'other',
        language: detectLanguage(firstText || '')
    };
}

async function extractPages(buf) {
    const pages = [];
    const r = await pdfParse(buf, {
        pagerender: async (pageData) => {
            const tc = await pageData.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
            let lastY, out = '';
            for (const it of tc.items) {
                if (lastY === undefined || lastY === it.transform[5]) out += it.str;
                else out += '\n' + it.str;
                lastY = it.transform[5];
            }
            pages.push(out.replace(/[ \t]+/g, ' ').trim());
            return out;
        }
    });
    return { numpages: r.numpages, pages };
}

// Importa um PDF (Buffer) → copia para uploads/manuais, grava metadados e texto por página.
// overrides: campos curados (title, brand, model, docType, component, language, tags, reviewed...)
async function importPdf(db, buf, originalName, overrides = {}, user = null) {
    const sha1 = crypto.createHash('sha1').update(buf).digest('hex');
    const docs = db.collection('manual_docs');
    const existing = await docs.findOne({ sha1 });
    if (existing) return { status: 'duplicate', doc: existing };

    const { numpages, pages } = await extractPages(buf);
    const first = pages.slice(0, 3).join('\n');
    const hasText = pages.join('').replace(/\s/g, '').length > 200;
    const base = originalName.replace(/\.pdf$/i, '');
    const det = detectMeta(originalName, first);

    await fsp.mkdir(DIR, { recursive: true });
    let slug = slugify(base), filename = slug + '.pdf', n = 1;
    while (fs.existsSync(path.join(DIR, filename))) filename = `${slug}-${++n}.pdf`;
    await fsp.writeFile(path.join(DIR, filename), buf);

    const now = new Date();
    const doc = {
        title: overrides.title || base.replace(/[_]+/g, ' ').trim(),
        brand: overrides.brand || det.brand,
        model: overrides.model || '',
        docType: overrides.docType || det.docType,
        component: overrides.component || det.component,
        language: overrides.language || det.language,
        tags: overrides.tags || [],
        notes: overrides.notes || '',
        filename,
        originalName,
        sizeBytes: buf.length,
        pages: numpages,
        hasText,
        sha1,
        reviewed: !!overrides.reviewed,
        published: overrides.published !== false,
        views: 0,
        addedBy: user ? (user.username || user.id || null) : 'import',
        createdAt: now,
        updatedAt: now
    };
    const ins = await docs.insertOne(doc);
    doc._id = ins.insertedId;
    if (hasText) {
        await db.collection('manual_pages').insertMany(
            pages.map((text, i) => ({ docId: doc._id, page: i + 1, text, norm: norm(text) })).filter(p => p.text),
            { ordered: false }
        );
    }
    return { status: 'imported', doc };
}

async function ensureIndexes(db) {
    await db.collection('manual_docs').createIndex({ sha1: 1 }, { unique: true });
    await db.collection('manual_docs').createIndex({ brand: 1, docType: 1, component: 1 });
    await db.collection('manual_pages').createIndex({ docId: 1, page: 1 });
}

// Pesquisa: palavras (AND) em metadados e/ou texto das páginas, insensível a acentos/maiúsculas.
async function search(db, params = {}) {
    const { q = '', brand, docType, component, language, sort = 'recent', includeUnpublished = false } = params;
    const filter = {};
    if (!includeUnpublished) filter.published = true;
    if (brand) filter.brand = brand;
    if (docType) filter.docType = docType;
    if (component) filter.component = component;
    if (language) filter.language = language;

    const words = norm(q).split(/\s+/).filter(w => w.length >= 2).slice(0, 6);
    const hits = new Map(); // docId -> {count, snippets}
    let metaIds = new Set();
    const all = await db.collection('manual_docs').find(filter).toArray();

    if (words.length) {
        // metadados
        for (const d of all) {
            const meta = norm([d.title, d.brand, d.model, (d.tags || []).join(' '), d.notes, DOC_TYPES[d.docType], COMPONENTS[d.component]].join(' '));
            if (words.every(w => new RegExp(((w.length <= 3 || /^\d+$/.test(w)) ? '(^|[^a-z0-9])' + escapeRegex(w) + '([^a-z0-9]|$)' : escapeRegex(w))).test(meta))) metaIds.add(String(d._id));
        }
        // texto por página (todas as palavras na mesma página)
        const ids = all.map(d => d._id);
        // tokens curtos/numéricos (ex.: "12", "e1") só como palavra inteira — evita "12" dentro de "8120"
        const rx = (w) => (w.length <= 3 || /^\d+$/.test(w)) ? '(^|[^a-z0-9])' + escapeRegex(w) + '([^a-z0-9]|$)' : escapeRegex(w);
        const cond = words.map(w => ({ norm: { $regex: rx(w) } }));
        const pageHits = await db.collection('manual_pages')
            .find({ docId: { $in: ids }, $and: cond }, { projection: { docId: 1, page: 1, text: 1, norm: 1 } })
            .limit(3000).toArray();
        // páginas de índice (muitos "......") ficam no fim: os resultados úteis aparecem primeiro
        const isToc = (p) => (p.text.match(/\.{4,}/g) || []).length > 3;
        pageHits.sort((x, y) => isToc(x) - isToc(y));
        for (const p of pageHits) {
            const k = String(p.docId);
            const h = hits.get(k) || { count: 0, snippets: [] };
            h.count++;
            if (h.snippets.length < 3) {
                const i = Math.max(0, p.norm.search(new RegExp(rx(words[0]))));
                const s = Math.max(0, i - 60);
                h.snippets.push({ page: p.page, text: p.text.slice(s, s + 220).replace(/[.·_\-]{4,}/g, ' … ').replace(/\s+/g, ' ').trim() });
            }
            hits.set(k, h);
        }
    }

    let list = all;
    if (words.length) list = all.filter(d => metaIds.has(String(d._id)) || hits.has(String(d._id)));
    list = list.map(d => ({ ...d, hitCount: hits.get(String(d._id))?.count || 0, snippets: hits.get(String(d._id))?.snippets || [], metaMatch: metaIds.has(String(d._id)) }));

    const cmp = {
        recent: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        title: (a, b) => a.title.localeCompare(b.title, 'pt'),
        brand: (a, b) => a.brand.localeCompare(b.brand, 'pt') || a.title.localeCompare(b.title, 'pt'),
        pages: (a, b) => b.pages - a.pages,
        views: (a, b) => (b.views || 0) - (a.views || 0),
        relevance: (a, b) => (b.metaMatch - a.metaMatch) || (b.hitCount - a.hitCount)
    };
    list.sort(cmp[words.length && sort === 'recent' ? 'relevance' : sort] || cmp.recent);

    const facet = (key) => {
        const m = {};
        for (const d of list) m[d[key]] = (m[d[key]] || 0) + 1;
        return m;
    };
    return { data: list, total: list.length, facets: { brand: facet('brand'), docType: facet('docType'), component: facet('component'), language: facet('language') } };
}

module.exports = { DIR, DOC_TYPES, COMPONENTS, importPdf, ensureIndexes, search, escapeRegex };
