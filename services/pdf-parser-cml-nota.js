/**
 * Parser determinístico das "NOTA DE CLÁUSULAS" da CML / municípios.
 *
 * Variante A (Lisboa, tabela "ArtigoDescrição"): linha com o artigo ("ART. 20.º", "5.2.5.7.1",
 *   "95.º", "5.5.7.1 e") seguida da descrição. A classe vem do cabeçalho "C 2 - CLÁUSULA(S) …".
 * Variante B (Oeiras/Cascais, "ART. 8 1  ANão …"): cada item termina em "N-C2"/"-C3".
 *
 * Devolve null se o texto não for de nenhuma variante; caso contrário um array
 * (possivelmente vazio) de { classification, article, description, en81 }.
 */

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

function isFooterLine(line) {
    return /^www\.cm-lisboa\.pt/i.test(line) ||
        /^P[áa]gina\s*\d+\s*de\s*\d+/i.test(line) ||
        /^Impresso\b/i.test(line) ||
        /^Documento impresso em/i.test(line);
}

// ── Variante A ───────────────────────────────────────────────────────────────
const ARTICLE_LINE_A = /^(?:ART\.?\s*)?(\d+(?:\.\d+)*)\s*(?:\.?º)?(?:\s*-\s*\d+)?\.?(?:\s+e)?$/i;

function parseVariantA(text) {
    if (!/Artigo\s*Descri[çc][ãa]o/i.test(text)) return null;
    const lines = text.split('\n').map(l => l.trim());
    const out = [];

    // Classe por defeito: "cumprimento imediato … 180 dias" = C2 da CML
    let cls = 'C2';
    let cur = null;
    let inTable = false;

    const flush = () => {
        if (cur) {
            const description = clean(cur.desc.join(' '));
            if (description.length >= 8) {
                out.push({ classification: cur.cls, article: cur.article, description, en81: /^\d+\.\d+/.test(cur.article) });
            }
        }
        cur = null;
    };

    for (const line of lines) {
        if (!line) continue;
        const h = line.match(/^C\s*([123])\s*[-–]\s*CL[ÁA]USULA/i);
        if (h) { flush(); cls = 'C' + h[1]; continue; }
        if (/^Artigo\s*Descri[çc][ãa]o/i.test(line)) { flush(); inTable = true; continue; }
        if (!inTable) continue;
        if (/^Lisboa,\s*\d+\s+de\s+/i.test(line) || /^O\s+DIRETOR\b/i.test(line)) { flush(); inTable = false; continue; }
        if (/^NOTAS\s*:/i.test(line)) { flush(); inTable = false; continue; }
        if (isFooterLine(line)) continue;
        if (/^\(DL$/i.test(line) || /^\d+\/\d+\)$/.test(line)) continue;

        const a = line.match(ARTICLE_LINE_A);
        if (a && line.length <= 16) {
            flush();
            cur = { cls, article: a[1], desc: [] };
            continue;
        }
        if (cur) cur.desc.push(line);
    }
    flush();
    return out;
}

// ── Variante B ───────────────────────────────────────────────────────────────
function parseVariantB(text) {
    if (!/^ART\.\s*(?:(?:ND|E)\d+\s+)?\d+\s+\d*\s*[A-Za-z]\S/m.test(text) || !/-C[123]\b/.test(text) || !/CL[ÁA]USULAS\s+DE\s+CUMPRIMENTO|NOTA\s+DE\s+CL[ÁA]USULAS/i.test(text)) return null;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const out = [];
    let cur = null;

    const flush = () => {
        if (!cur) return;
        const body = cur.lines.join(' ');
        const clsM = [...body.matchAll(/(?:^|[\s\d])-C([123])\b/g)];
        if (clsM.length) {
            const description = clean(
                body.replace(/\s?(?:\d+\s*)?-C[123]\b/g, ' ')
                    .replace(/\bNota\s*:/g, ' Nota:')
            );
            const ponto = description.match(/\bPonto\s+(\d+(?:\.\d+)+)/i);
            let article;
            if (cur.kind === 'ND') article = ponto ? ponto[1] : `${cur.nd}.${cur.nums.join('.')}`;
            else if (cur.kind === 'E') article = ponto ? ponto[1] : 'NOTA';
            else article = cur.nums[0];
            out.push({
                classification: 'C' + clsM[clsM.length - 1][1],
                article,
                description,
                en81: cur.kind === 'E' && Boolean(ponto)
            });
        }
        cur = null;
    };

    for (const line of lines) {
        if (/^(NOTAS\s*:|O\s+DIRECT[OA]R|AS\s+CL[ÁA]USULAS\s+A\s+SEGUIR|C1\s*-\s*Correspondente)/i.test(line)) { flush(); continue; }
        if (isFooterLine(line) || /^\d{4,}$/.test(line) || /^\d{1,2}$/.test(line)) continue;
        const m = line.match(/^ART\.\s*(?:(ND|E)(\d+)\s+)?((?:\d+\s+)*\d+)\s+([A-Za-z])(?:(?=\S)(.*)|\s*)$/);
        if (m) {
            flush();
            cur = { kind: m[1] || null, nd: m[2] != null ? m[2] : null, nums: m[3].trim().split(/\s+/), lines: [m[5] || ''] };
            continue;
        }
        if (cur) cur.lines.push(line);
    }
    flush();
    return out;
}


// ── Variante C (Bureau Veritas / CML: "Tipo Deficiência detectada") ──────────
function parseVariantC(text) {
    const head = /Tipo\s+Defici[êe]ncia\s+detectada/i.exec(text);
    if (!head) return null;
    let region = text.slice(head.index + head[0].length);
    const end = region.search(/RESULTADO\s+DA\s+INSPEC/i);
    if (end >= 0) region = region.slice(0, end);
    const out = [];
    let cur = null;
    const flush = () => {
        if (!cur) return;
        const full = clean(cur.lines.join(' '));
        let article = 'NOTA';
        let desc = full;
        let m = full.match(/^(?:Art[ºo°]?\.?\s*)?(\d+(?:\.\d+)*)\s*[º°.]*\s*(\d+)?\s*[–-]\s*(.*)$/i);
        if (m) {
            article = m[1] + (m[2] ? '.' + m[2] : '');
            desc = m[3];
        } else if ((m = full.match(/^(\d+(?:\.\d+){1,})\s+(.+)$/))) {
            article = m[1];
            desc = m[2];
        } else if ((m = full.match(/PONTO\s+(\d+(?:\.\d+)*)\s*[–-]?\s*(.*)$/i))) {
            article = m[1];
            desc = m[2];
        }
        if (desc.length >= 8) out.push({ classification: cur.cls, article, description: desc, en81: false });
        cur = null;
    };
    for (const raw of region.split('\n')) {
        const line = raw.trim();
        if (!line) continue;
        const m = line.match(/^(C[123])\s+(.+)$/);
        if (m) { flush(); cur = { cls: m[1], lines: [m[2]] }; }
        else if (cur) cur.lines.push(line);
    }
    flush();
    return out;
}

// ── Variante D (IEP: "Nota de Cláusulas" com linhas "C3 | DL. 513/70 (Artº 6º) - …") ──
function parseVariantD(text) {
    const head = /Nota\s+de\s+Cl[áa]usulas/i.exec(text);
    if (!head || !/^C[123]\*?\s*\|/m.test(text)) return null;
    const region = text.slice(head.index + head[0].length);
    const out = [];
    let cur = null;
    const flush = () => {
        if (!cur) return;
        const full = clean(cur.lines.join(' '));
        const a = full.match(/Art[ºo°]?\.?\s*(\d+(?:\.\d+)*)\s*[º°]?(?:\s*-\s*(\d+))?/i);
        const article = a ? a[1] + (a[2] ? '.' + a[2] : '') : 'NOTA';
        const desc = clean(full.replace(/^[^)]*\)\s*-\s*/, ''));
        if (desc.length >= 8) out.push({ classification: cur.cls, article, description: desc, en81: false });
        cur = null;
    };
    for (const raw of region.split('\n')) {
        const line = raw.trim();
        if (!line) continue;
        if (/^Notas\s*:/i.test(line)) { flush(); continue; }
        const m = line.match(/^(C[123])\*?\s*\|\s*(.*)$/);
        if (m) { flush(); cur = { cls: m[1], lines: [m[2]] }; }
        else if (cur) cur.lines.push(line);
    }
    flush();
    return out;
}

// ── Variante E (ISQ/Oeiras: "1 - ART. 63 1 B   C2 descrição…", classe depois do artigo) ──
function parseVariantE(text) {
    if (!/^\s*\d+\s*-\s*ART\.\s*\d/m.test(text) || !/NOTA\s+DE\s+CL[ÁA]USULAS/i.test(text)) return null;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const out = [];
    let cur = null;
    const flush = () => {
        if (!cur) return;
        const full = clean(cur.lines.join(' '));
        const m = full.match(/^((?:\d+\s+)*\d+)\s*(?:[A-Za-z]\s+)?C([123])\s+(.*)$/);
        if (m) {
            const description = clean(m[3]);
            const ponto = description.match(/\bPonto\s+(\d+(?:\.\d+)+)/i);
            if (description.length >= 8) {
                out.push({ classification: 'C' + m[2], article: ponto ? ponto[1] : m[1].split(/\s+/)[0], description, en81: false });
            }
        }
        cur = null;
    };
    for (const line of lines) {
        if (/^(AS\s+CL[ÁA]USULAS\s+A\s+SEGUIR|O\s+DIRECT[OA]R|C1\s*-\s*Correspondente|Impresso\b|P[áa]gina\s*\d)/i.test(line)) { flush(); continue; }
        // Segunda "NOTA DE CLÁUSULAS" no mesmo PDF = outro elevador → só o primeiro é analisado
        if (out.length + (cur ? 1 : 0) > 0 && /^ELEVADOR\s+N[ºo°]\s*:/i.test(line)) { flush(); break; }
        const h = line.match(/^\d+\s*-\s*ART\.\s*(.*)$/);
        if (h) { flush(); cur = { lines: [h[1]] }; continue; }
        if (cur) cur.lines.push(line);
    }
    flush();
    return out;
}

/**
 * PDF único com vários elevadores ("NOTA DE CLÁUSULAS" repetida, uma por elevador).
 * Devolve { elevators: [n.º…], text, matched } — `text` é o bloco do elevador pedido
 * (por n.º municipal, ignorando pontuação/maiúsculas) ou o primeiro se não houver alvo.
 * matched=false quando há alvo e nenhum bloco corresponde. Com 0–1 blocos devolve o texto intacto.
 */
function selectElevatorBlock(text, target) {
    const src = String(text || '');
    const starts = [...src.matchAll(/^[ \t]*NOTA\s+DE\s+CL[ÁA]USULAS[ \t]*$/gmi)].map(m => m.index);
    if (starts.length < 2) return { elevators: [], text: src, matched: true };
    const norm = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const blocks = starts.map((st, i) => {
        const body = src.slice(st, i + 1 < starts.length ? starts[i + 1] : undefined);
        const num = (body.match(/ELEVADOR\s+N[ºo°.]*\s*:?\s*(\d[\d.\-\/]*\d)/i) || [])[1] || null;
        return { num, body };
    });
    const elevators = blocks.map(b => b.num).filter(Boolean);
    if (elevators.length < 2) return { elevators, text: src, matched: true };
    if (!target) return { elevators, text: blocks[0].body, matched: true };
    const hit = blocks.find(b => b.num && norm(b.num) === norm(target));
    return { elevators, text: hit ? hit.body : '', matched: Boolean(hit) };
}

/** Lista de violações da nota CML ou null se o formato não for reconhecido. */
function extractCmlNotaViolations(text) {
    if (!text) return null;
    let r = parseVariantE(text) || parseVariantB(text) || parseVariantC(text);
    let exactOnly = false;
    if (!r) { r = parseVariantD(text); exactOnly = r !== null; }
    if (!r) r = parseVariantA(text);
    if (!r) return null;
    // O PDF repete por vezes itens/a nota completa — deduplicar (uma descrição prefixo da outra = mesmo item)
    const kept = [];
    for (const v of r) {
        const norm = v.description.replace(/[^A-Za-zÀ-ú0-9]/g, '').toLowerCase();
        const dup = kept.some(k => k.v.classification === v.classification && k.v.article === v.article &&
            (exactOnly ? k.norm === norm
                : (k.norm.startsWith(norm.slice(0, 60)) || norm.startsWith(k.norm.slice(0, 60)))));
        if (!dup) kept.push({ v, norm });
    }
    return kept.map(k => k.v);
}

module.exports = { extractCmlNotaViolations, selectElevatorBlock };
