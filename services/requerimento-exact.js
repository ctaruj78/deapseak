/**
 * Preenchimento de requerimentos com coordenadas EXACTAS (pontos PDF, origem em baixo à esquerda —
 * o mesmo sistema do pdf-lib), lidas com pdf-parse/pdf.js. Substitui a adivinhação a partir do pdf2json
 * (unidades convertidas + correcções empíricas), que deslocava os campos.
 *
 * Cada município tem um "mapa" explícito: âncora (texto impresso no formulário) + deslocamento.
 * validatePlacements() verifica o resultado (dentro da página, sem sobrepor texto impresso nem
 * outros campos) — corre em scripts/test-requerimentos.js para todos os formulários.
 */
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { StandardFonts, rgb, PDFName } = require('pdf-lib');

const itemsCache = new Map(); // caminho → { mtime, page }

/** Itens de texto da 1.ª página: { s, x, y(baseline), w, h } em pontos PDF. */
async function getTextItems(pdfPath) {
    const mtime = fs.statSync(pdfPath).mtimeMs;
    const hit = itemsCache.get(pdfPath);
    if (hit && hit.mtime === mtime) return hit.page;

    let page = null;
    const render = pd => pd.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: true }).then(tc => {
        if (!page) {
            const vp = pd.getViewport(1.0);
            page = {
                width: vp.width, height: vp.height,
                items: tc.items
                    .filter(i => i.str && i.str.trim())
                    .map(i => ({ s: i.str, x: i.transform[4], y: i.transform[5], w: i.width, h: i.height, fs: Math.hypot(i.transform[0], i.transform[1]) }))
            };
        }
        return '';
    });
    await pdfParse(fs.readFileSync(pdfPath), { pagerender: render, max: 1 });
    if (!page) throw new Error(`Sem texto extraível em ${pdfPath}`);
    itemsCache.set(pdfPath, { mtime, page });
    return page;
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Peso relativo de um texto: sublinhados valem 0,556 em (como Arial), o resto mede-se em Times. */
function weight(str, fs, times) {
    let w = 0;
    for (const ch of str) w += ch === '_' ? 0.556 * fs : times.widthOfTextAtSize(ch, fs);
    return w;
}

/** x do carácter nº `idx` de um item, repartindo a largura real `item.w` proporcionalmente. */
function charX(item, idx, times) {
    const total = weight(item.s, item.fs, times) || 1;
    return item.x + item.w * weight(item.s.slice(0, idx), item.fs, times) / total;
}

/** Ferramentas de colocação sobre uma página. `times` mede texto impresso (Word → Times). */
async function makeTools(pdfDoc, page, pageInfo) {
    const form = pdfDoc.getForm();
    const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const times = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const placements = [];

    // Registar a fonte como 'Helv' no AcroForm (necessário para o /DA dos campos)
    try {
        const acro = form.acroForm.dict;
        let dr = acro.get(PDFName.of('DR'));
        if (!dr) { dr = pdfDoc.context.obj({}); acro.set(PDFName.of('DR'), dr); }
        const drObj = pdfDoc.context.lookup(dr);
        let fd = drObj.get(PDFName.of('Font'));
        if (!fd) { fd = pdfDoc.context.obj({}); drObj.set(PDFName.of('Font'), fd); }
        pdfDoc.context.lookup(fd).set(PDFName.of('Helv'), helv.ref);
    } catch (_) { /* sem DR: o pdf-lib usa a fonte por defeito */ }

    let n = 0;
    const uid = () => `rq_${Date.now()}_${++n}`;
    const items = pageInfo.items;

    /** Item cujo texto começa por `text` (n-ésima ocorrência). */
    const find = (text, nth = 0) => {
        const t = text.toLowerCase();
        const found = items.filter(i => i.s.trim().toLowerCase().startsWith(t));
        if (!found[nth]) throw new Error(`Âncora não encontrada: "${text}" (#${nth})`);
        return found[nth];
    };
    /** x do carácter nº `idx` do item — proporcional à largura REAL do item (o formulário mistura fontes). */
    const px = (item, idx) => charX(item, idx, times);
    /** x onde termina o prefixo `prefix` do item. */
    const xAfter = (item, prefix) => {
        if (!item.s.startsWith(prefix)) throw new Error(`Prefixo "${prefix}" não corresponde ao item "${item.s.slice(0, 40)}"`);
        return px(item, prefix.length);
    };

    const field = (value, x, baseline, width, { size = 8, tag = '' } = {}) => {
        if (value === undefined || value === null || String(value) === '') return;
        const h = size + 3;
        const rect = { x, y: baseline - 2, width, height: h };
        const f = form.createTextField(uid());
        f.setText(String(value));
        f.acroField.setDefaultAppearance(`/Helv ${size} Tf 0 g`);
        f.addToPage(page, { ...rect, font: helv, textColor: rgb(0, 0, 0), backgroundColor: undefined, borderColor: undefined, borderWidth: 0 });
        placements.push({ tag, value: String(value), ...rect });
    };

    /** Cruz "X" dentro da caixa ☐ (a caixa fica à esquerda do texto da opção). */
    const cross = (x, baseline, tag = '') => field('X', x, baseline - 0.5, 8, { size: 9, tag: `x:${tag}` });

    return { find, xAfter, px, field, cross, helv, times, placements };
}

// ---------------------------------------------------------------------------------------------
// Validação: devolve lista de problemas (vazia = OK)
// ---------------------------------------------------------------------------------------------

/** Rectângulos das palavras impressas (letras/dígitos/pontuação) de um item — ignora sublinhados e espaços. */
function inkRects(item, times) {
    const rects = [];
    for (const m of item.s.matchAll(/[^_\s|]+/g)) {
        const x0 = charX(item, m.index, times), x1 = charX(item, m.index + m[0].length, times);
        rects.push({ x: x0, y: item.y - item.fs * 0.2, width: x1 - x0, height: item.fs, text: m[0] });
    }
    return rects;
}

function validatePlacements(placements, pageInfo, times) {
    const problems = [];
    const { width: W, height: H, items } = pageInfo;
    const inter = (a, b, eps = 1) =>
        a.x + eps < b.x + b.width && b.x + eps < a.x + a.width && a.y + eps < b.y + b.height && b.y + eps < a.y + a.height;

    placements.forEach((p, i) => {
        if (p.x < 0 || p.y < 0 || p.x + p.width > W + 0.5 || p.y + p.height > H + 0.5) {
            problems.push(`fora da página: ${p.tag || p.value}`);
        }
        // Não pode tapar texto impresso (letras) do formulário
        for (const it of items) {
            for (const box of inkRects(it, times)) {
                if (inter(p, box)) problems.push(`"${p.value}" (${p.tag}) sobrepõe o texto impresso "${box.text}"`);
            }
        }
        for (let j = i + 1; j < placements.length; j++) {
            if (inter(p, placements[j])) problems.push(`"${p.value}" (${p.tag}) sobrepõe "${placements[j].value}" (${placements[j].tag})`);
        }
    });
    return problems;
}


// ---------------------------------------------------------------------------------------------
// Mapas por município
// ---------------------------------------------------------------------------------------------

/**
 * Oeiras — Mod. DPGU/Outras-03/1. Linhas de "caixinhas" |__|__|: o valor entra por cima da linha,
 * a começar no primeiro "|" da linha; a linha seguinte continua nome longo (Proprietário).
 */
async function fillOeiras(pdfDoc, ctx) {
    const { lift, inspType, requerente, req, owner, pageInfo } = ctx;
    const page = pdfDoc.getPages()[0];
    const t = await makeTools(pdfDoc, page, pageInfo);
    const SIZE = 8;
    const addr = lift.address || {};

    // Início das caixinhas de uma linha: 1.º item "|" depois do rótulo, na mesma baseline
    const boxesStart = (label, nth = 0) => {
        const lab = t.find(label, nth);
        const bar = pageInfo.items
            .filter(i => Math.abs(i.y - lab.y) < 1.5 && i.x > lab.x + 5 && i.s.trim().startsWith('|'))
            .sort((a, b) => a.x - b.x)[0];
        return { lab, x: bar ? bar.x + 2 : t.xAfter(lab, lab.s) + 4, y: lab.y };
    };

    // Processo n.º — número municipal do elevador
    const proc = t.find('Processo nº');
    t.field(lift.municipalNumber, t.xAfter(proc, 'Processo nº ') + 4, proc.y, 110, { size: SIZE, tag: 'processo' });

    // Proprietário (do elevador) e respectivo contribuinte
    if (owner && owner.name) {
        const p = boxesStart('Proprietário');
        t.field(owner.name, p.x, p.y, 420, { size: SIZE, tag: 'proprietario' });
    }
    if (owner && owner.nif) {
        const c = boxesStart('Contribuinte', 0);
        t.field(owner.nif, c.x, c.y, 110, { size: SIZE, tag: 'nif-proprietario' });
    }

    // Empresa de manutenção (FestLift) e contribuinte
    const ema = boxesStart('Empresa de Manutenção');
    t.field('FestLift - Elevadores e Serviços, Lda.', ema.x, ema.y, 300, { size: SIZE, tag: 'ema' });
    const emaNif = boxesStart('Contribuinte', 1);
    t.field('515 924 741', emaNif.x, emaNif.y, 110, { size: SIZE, tag: 'nif-ema' });

    // Contactos do requerente (proprietário se `requerente === 'cliente'`, senão a FestLift)
    const m = boxesStart('Morada');
    t.field(req.address, m.x, m.y, 430, { size: SIZE, tag: 'morada' });
    // Código postal: caixinhas 4 + "-" impresso + 3 → escreve cada parte do seu lado do hífen
    const cp = boxesStart('Código Postal');
    const dash = pageInfo.items.find(i => Math.abs(i.y - cp.y) < 1.5 && i.x > cp.x && i.s.trim() === '-');
    const [cp1, cp2] = String(req.cp || '').split('-').map(x => x.trim());
    if (dash) {
        const right = pageInfo.items.filter(i => Math.abs(i.y - cp.y) < 1.5 && i.x > dash.x && i.s.trim().startsWith('|')).sort((a, b) => a.x - b.x)[0];
        t.field(cp1, cp.x, cp.y, dash.x - cp.x - 2, { size: SIZE, tag: 'cp-1' });
        t.field(cp2, right ? right.x + 2 : dash.x + dash.w + 4, cp.y, 48, { size: SIZE, tag: 'cp-2' });
    } else {
        t.field(req.cp, cp.x, cp.y, 75, { size: SIZE, tag: 'cp' });
    }
    const loc = boxesStart('Localidade');
    t.field(req.locality, loc.x, loc.y, 250, { size: SIZE, tag: 'localidade' });
    const tel = boxesStart('Telefone');
    t.field(req.phone, tel.x, tel.y, 105, { size: SIZE, tag: 'telefone' });
    const mail = t.find('E-mail');
    t.field(req.email, t.xAfter(mail, 'E-mail ') + 4, mail.y, 230, { size: SIZE, tag: 'email' });

    // Tipo de inspecção — a caixa ☐ fica à esquerda do texto da opção
    const opt = { periodica: 'Inspecção periódica', reinspecao: 'Reinspecção', extraordinaria: 'Inspecção Extraordinária' }[inspType];
    if (opt) {
        const o = t.find(opt);
        t.cross(o.x - 9, o.y, inspType);
    }

    // Local de instalação: a linha de sublinhados faz parte do próprio item do rótulo
    const inst = t.find('do(s) elevador(es) instalado');
    const local = [addr.street, addr.zipCode, addr.city].filter(Boolean).join(', ');
    t.field(local, t.xAfter(inst, 'do(s) elevador(es) instalado(s) em ') + 9, inst.y, 325, { size: SIZE, tag: 'local-instalacao' });

    // Data (no bloco de quem assina: proprietário em cima, EMA em baixo)
    const hoje = new Date();
    const datas = pageInfo.items.filter(i => /^Oeiras, _+ de _+ de _+/.test(i.s.trim()));
    const linha = datas[requerente === 'cliente' ? 0 : datas.length - 1];
    if (linha) {
        // Segmentos de sublinhado: "Oeiras, ____ de __________ de ________"
        const seg = (a, b) => ({ x: t.xAfter(linha, a) + 3, w: (b ? t.xAfter(linha, b) : linha.x + linha.w) - t.xAfter(linha, a) - 5 });
        const dia = seg('Oeiras, ', 'Oeiras, ____');
        const mes = seg('Oeiras, ____ de ', 'Oeiras, ____ de __________');
        const ano = seg('Oeiras, ____ de __________ de ', null);
        t.field(String(hoje.getDate()), dia.x, linha.y, dia.w, { size: SIZE, tag: 'data-dia' });
        t.field(MESES[hoje.getMonth()], mes.x, linha.y, mes.w, { size: SIZE, tag: 'data-mes' });
        t.field(String(hoje.getFullYear()), ano.x, linha.y, ano.w, { size: SIZE, tag: 'data-ano' });
    }

    return { placements: t.placements, times: t.times };
}

/** Municípios com mapa de coordenadas exactas (os restantes continuam no preenchimento genérico). */
const EXACT_FILLERS = { Oeiras: fillOeiras };

/**
 * Preenche `pdfDoc` com o mapa exacto do município (se existir). Devolve null se o município não tem mapa.
 * Resultado: { placements, problems } — `problems` vazio = colocação validada.
 */
async function fillExact(munName, pdfDoc, pdfPath, ctx) {
    const filler = EXACT_FILLERS[munName];
    if (!filler) return null;
    const pageInfo = await getTextItems(pdfPath);
    const { placements, times } = await filler(pdfDoc, { ...ctx, pageInfo });
    const problems = validatePlacements(placements, pageInfo, times);
    return { placements, problems };
}

module.exports = { getTextItems, validatePlacements, EXACT_FILLERS, makeTools, fillExact };
