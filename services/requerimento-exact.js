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
    for (const ch of str) {
        if (ch === '_') { w += 0.556 * fs; continue; }
        try { w += times.widthOfTextAtSize(ch, fs); } catch (_) { w += 0.5 * fs; } // glifo fora de WinAnsi
    }
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
    const helv = await pdfDoc.embedFont(StandardFonts.HelveticaBold); // negrito: texto mais nítido e escuro
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

    const field = (value, x, baseline, width, { size = 9, tag = '', minSize = 6.5 } = {}) => {
        if (value === undefined || value === null || String(value) === '') return;
        const text = String(value);
        // Reduz o tipo de letra até caber (mínimo `minSize`)
        let sz = size;
        while (sz > minSize && helv.widthOfTextAtSize(text, sz) > width - 1) sz -= 0.5;
        const h = sz + 3;
        const rect = { x, y: baseline - 2, width, height: h };
        const f = form.createTextField(uid());
        f.setText(text);
        f.acroField.setDefaultAppearance(`/Helv ${sz} Tf 0 g`);
        f.addToPage(page, { ...rect, font: helv, textColor: rgb(0, 0, 0), backgroundColor: undefined, borderColor: undefined, borderWidth: 0 });
        f.updateAppearances(helv); // sem isto o pdf-lib desenha o texto na fonte por defeito (Helvetica normal), não em negrito
        placements.push({ tag, value: text, ...rect, textWidth: helv.widthOfTextAtSize(text, sz) });
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
        if (p.textWidth && p.textWidth > p.width + 1) problems.push(`texto excede o campo: "${p.value}" (${p.tag}) ${p.textWidth.toFixed(0)}pt > ${p.width.toFixed(0)}pt`);
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
    const SIZE = 9;
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


// ---------------------------------------------------------------------------------------------
// Motor de regras: cada regra liga um valor a um item do formulário
//   anchor/nth  → item pelo texto (começa por)      pick:{y,x} → item pelas coordenadas (linhas em branco)
//   run         → n-ésima sequência de "__" dentro do item (start/largura exactos)
//   sem run     → começa à direita do item, até à próxima palavra impressa da mesma linha
//   w, dx, dy, size, gap → ajustes;   check:true → cruz à esquerda do item (dx por defeito -12)
// ---------------------------------------------------------------------------------------------
function applyRules(t, pageInfo, rules, ctx) {
    const { items, width: PW } = pageInfo;
    const resolve = r => {
        if (r.at) return { x: r.at.x, y: r.at.y, w: 0, s: '', fs: 9 };
        if (r.pick) {
            const best = items
                .filter(i => Math.abs(i.y - r.pick.y) < 2 && Math.abs(i.x - r.pick.x) < 6)
                .sort((a, b) => Math.abs(a.x - r.pick.x) - Math.abs(b.x - r.pick.x))[0];
            if (!best) throw new Error(`Item não encontrado em y=${r.pick.y} x=${r.pick.x}`);
            return best;
        }
        return t.find(r.anchor, r.nth || 0);
    };
    const nextInkX = (x, y) => {
        let min = PW - 36;
        for (const it of items) {
            if (Math.abs(it.y - y) > 2.5) continue;
            for (const rc of inkRects(it, t.times)) if (rc.x > x + 3 && rc.x < min) min = rc.x;
        }
        return min;
    };
    for (const r of rules) {
        if (r.when === false) continue;
        const item = resolve(r);
        if (r.check) {
            if (r.on !== false) t.cross(item.x + (r.dx === undefined ? -12 : r.dx), item.y + (r.dy || 0), r.tag || r.anchor);
            continue;
        }
        const val = typeof r.v === 'function' ? r.v(ctx) : r.v;
        if (val === undefined || val === null || val === false || String(val) === '') continue;
        let x, w;
        const hasRun = r.pick && r.run === undefined && /_{2,}/.test(item.s);
        if (r.at) {
            x = r.at.x; w = r.w;
        } else if (r.run !== undefined || hasRun) {
            const run = [...item.s.matchAll(/_{2,}/g)][r.run || 0];
            if (!run) throw new Error(`Sem sublinhado #${r.run} em "${item.s.slice(0, 40)}"`);
            x = t.px(item, run.index) + 1;
            w = t.px(item, run.index + run[0].length) - x - 1;
        } else if (r.pick) {
            x = item.x + 1; w = item.w - 2;
        } else {
            x = item.x + item.w + (r.gap === undefined ? 5 : r.gap);
            w = nextInkX(x, item.y) - x - 2;
        }
        x += r.dx || 0;
        if (r.to !== undefined) w = r.to - x;
        else if (r.w !== undefined) w = r.w;
        t.field(val, x, item.y + (r.dy || 0), w, { size: r.size || 9, tag: r.tag || r.anchor || `y${item.y.toFixed(0)}` });
    }
}

const split = (str, sep) => String(str || '').split(sep).map(x => x.trim());
const hoje = () => new Date();
const yy = () => String(hoje().getFullYear()).slice(2);

/** Sintra — IMP.PS.01.204.03: texto corrido com sublinhados. Coordenadas lidas do próprio formulário. */
async function fillSintra(pdfDoc, ctx) {
    const { lift, inspType, requerente, req, owner, pageInfo } = ctx;
    const page = pdfDoc.getPages()[0];
    const t = await makeTools(pdfDoc, page, pageInfo);
    const a = lift.address || {};
    const [cp1, cp2] = split(a.zipCode, '-');
    const [rcp1, rcp2] = split(req.cp, '-');
    const d = hoje();
    const equip = ctx.equip || 'ascensor';

    applyRules(t, pageInfo, [
        // Prédio: NIF do condomínio e morada do elevador
        { pick: { y: 618.7, x: 232 }, v: owner && owner.nif, tag: 'nif-predio' },
        { pick: { y: 601.1, x: 50 }, v: a.street, to: 520, tag: 'rua' },
        { pick: { y: 583.4, x: 280 }, v: a.city, tag: 'localidade' },
        { pick: { y: 565.8, x: 50 }, v: cp1, tag: 'cp1' },
        { pick: { y: 565.8, x: 118 }, v: cp2, w: 40, run: 0, tag: 'cp2' },
        // Manutenção efectuada por (EMIE) e processo camarário
        { pick: { y: 548.0, x: 50 }, run: 0, dx: 3, v: 'FestLift - Elevadores e Serviços, Lda.', tag: 'ema' },
        { pick: { y: 530.2, x: 156 }, v: lift.municipalNumber, tag: 'processo' },
        // Tipo de pedido
        { pick: { y: 494.8, x: 99 }, check: true, on: inspType === 'periodica', dx: -14, tag: 'periodica' },
        { pick: { y: 477.1, x: 99 }, check: true, on: inspType === 'reinspecao', dx: -14, tag: 'reinspecao' },
        { pick: { y: 459.3, x: 162 }, v: '1', tag: 'quantidade' },
        { pick: { y: 435.8, x: 99 }, check: true, on: equip === 'ascensor', dx: -14, tag: 'elevadores' },
        // Requerente
        { pick: { y: 412.3, x: 136 }, run: 0, v: req.name, to: 528, tag: 'req-nome' },
        { pick: { y: 394.6, x: 60 }, run: 0, dx: 4, v: req.nif, tag: 'req-nif' },
        { pick: { y: 394.6, x: 435 }, v: req.address, to: 556, tag: 'req-rua' },
        { pick: { y: 377.0, x: 434 }, v: req.locality, tag: 'req-localidade' },
        { pick: { y: 359.3, x: 244 }, v: rcp1, tag: 'req-cp1' },
        { pick: { y: 359.3, x: 293 }, run: 0, v: rcp2, tag: 'req-cp2' },
        { pick: { y: 359.3, x: 398 }, v: req.email, w: 150, tag: 'req-email' },
        { pick: { y: 341.6, x: 146 }, v: req.phone, tag: 'req-telefone' },
        // Data
        { pick: { y: 306.3, x: 50 }, run: 0, v: String(d.getDate()), tag: 'dia' },
        { pick: { y: 306.3, x: 50 }, run: 1, v: MESES[d.getMonth()], tag: 'mes' },
        { pick: { y: 306.3, x: 203 }, run: 0, v: yy(), tag: 'ano' }
    ].filter(r => r.when !== false), ctx);

    return { placements: t.placements, times: t.times };
}

/** Barreiro — Minuta 7.1.1: formulário com caixas desenhadas (sem texto); campos à direita dos rótulos. */
async function fillBarreiro(pdfDoc, ctx) {
    const { lift, inspType, requerente, req, owner, pageInfo } = ctx;
    const page = pdfDoc.getPages()[0];
    const t = await makeTools(pdfDoc, page, pageInfo);
    const a = lift.address || {};
    const [rcp1, rcp2] = split(req.cp, '-');
    const [fcp1, fcp2] = split('2635-609', '-');
    const [mun1, mun2] = split(lift.municipalNumber, '/');
    const pag = ctx.pagamento || 'transferencia';
    const year = lift.installYear || lift.installationYear || (lift.installationDate ? new Date(lift.installationDate).getFullYear() : '');
    const hid = lift.driveType === 'hydraulic';
    const cliente = requerente === 'cliente';

    // Coordenadas do "Código Postal" (4 + 3 dígitos separados por "-" impresso)
    const cpRule = (nth, v1, v2) => {
        const lab = t.find('Código Postal', nth);
        const dash = pageInfo.items.find(i => Math.abs(i.y - lab.y) < 2 && i.s.trim() === '-' && i.x > lab.x);
        return dash ? [
            { pick: { y: lab.y, x: lab.x }, v: v1, w: dash.x - (lab.x + lab.w + 8) - 2, dx: lab.w + 8, tag: `cp1-${nth}` },
            { pick: { y: lab.y, x: lab.x }, v: v2, w: 40, dx: dash.x + 4 - lab.x, tag: `cp2-${nth}` }
        ] : [];
    };

    applyRules(t, pageInfo, [
        // 01. EMIE (FestLift)
        { anchor: 'NIF/ NIPC', nth: 0, v: '515 924 741', tag: 'ema-nif' },
        { anchor: 'inação', v: 'FestLift - Elevadores e Serviços, Lda.', tag: 'ema-nome' },
        { anchor: 'Morada', nth: 0, v: 'Av. do Parque 84B', tag: 'ema-morada' },
        { anchor: 'reg.', nth: 0, v: 'Rio de Mouro', tag: 'ema-freg' },
        ...cpRule(0, fcp1, fcp2),
        { anchor: 'Telefone', nth: 0, v: '214 190 863', tag: 'ema-tel' },
        { anchor: 'mail', nth: 0, v: 'info@festlift.pt', tag: 'ema-mail' },
        // 02. Administração / proprietário do edifício
        { anchor: 'NIF/ NIPC', nth: 1, v: owner && owner.nif, tag: 'prop-nif' },
        { anchor: 'Nome/Denom.', v: owner && owner.name, tag: 'prop-nome' },
        { anchor: 'Morada', nth: 1, v: cliente && req.address, tag: 'prop-morada' },
        { anchor: 'União / Freg.', v: cliente && req.locality, tag: 'prop-freg' },
        ...(cliente ? cpRule(1, rcp1, rcp2) : []),
        { anchor: 'Telefone', nth: 1, v: cliente && req.phone, tag: 'prop-tel' },
        { anchor: 'mail', nth: 1, v: cliente && req.email, tag: 'prop-mail' },
        // 03. Pedido
        { anchor: 'Inspeção Periódica', check: true, on: inspType === 'periodica', dx: -13, tag: 'periodica' },
        { anchor: 'Inspeção extraordinária', check: true, on: inspType === 'extraordinaria', dx: -13, tag: 'extraordinaria' },
        { anchor: 'Reinspecção', check: true, on: inspType === 'reinspecao', dx: -13, tag: 'reinspecao' },
        // 04. Instalação
        { at: { x: 152, y: 226.3 }, v: mun1, w: 28, tag: 'elv-1' },
        { at: { x: 187, y: 226.3 }, v: mun2, w: 34, tag: 'elv-2' },
        { anchor: 'Ano de instalação', v: year, w: 30, tag: 'ano' },
        { anchor: 'Carga', v: lift.capacity, w: 32, tag: 'carga' },
        { anchor: 'Velocidade', v: lift.speed, w: 28, tag: 'velocidade' },
        { anchor: 'N.º de pisos', v: lift.floorsCount || lift.floors, w: 30, tag: 'pisos' },
        { anchor: 'Elét', check: true, on: !hid && !!lift.driveType, dx: -13, tag: 'eletrico' },
        { anchor: 'Hidráulico', check: true, on: hid, dx: -13, tag: 'hidraulico' },
        // 05. Pagamento
        { anchor: 'Para o efeito junta o cheque', check: true, on: pag === 'cheque', dx: -14, tag: 'cheque' },
        { anchor: 'Numerário / Multibanco', check: true, on: pag === 'dinheiro' || pag === 'multibanco', dx: -14, tag: 'numerario' },
        { anchor: 'Transferência bancária', check: true, on: pag === 'transferencia', dx: -14, tag: 'transferencia' }
    ], ctx);

    return { placements: t.placements, times: t.times };
}


/** Regras do código postal "NNNN - NNN" quando o "-" está impresso entre duas caixas. */
function cpRules(t, pageInfo, anchor, nth, v1, v2, tag) {
    const lab = t.find(anchor, nth);
    const dash = pageInfo.items.find(i => Math.abs(i.y - lab.y) < 2 && i.s.trim() === '-' && i.x > lab.x);
    if (!dash) return [{ at: { x: lab.x + lab.w + 6, y: lab.y }, v: [v1, v2].filter(Boolean).join('-'), w: 70, tag }];
    return [
        { at: { x: lab.x + lab.w + 8, y: lab.y }, v: v1, w: dash.x - (lab.x + lab.w + 8) - 3, tag: `${tag}-1` },
        { at: { x: dash.x + dash.w + 4, y: lab.y }, v: v2, w: 42, tag: `${tag}-2` }
    ];
}

/** Amadora — U22 Inspeção de Elevadores: campos sobre linhas desenhadas, à direita do rótulo. */
async function fillAmadora(pdfDoc, ctx) {
    const { lift, inspType, requerente, req, pageInfo } = ctx;
    const page = pdfDoc.getPages()[0];
    const t = await makeTools(pdfDoc, page, pageInfo);
    const a = lift.address || {};
    const cliente = requerente === 'cliente';
    const equip = ctx.equip || 'ascensor';
    applyRules(t, pageInfo, [
        { anchor: 'Nome/ Designação', v: req.name, tag: 'nome' },
        { anchor: 'Morada/ Sede', v: req.address, tag: 'morada' },
        { anchor: 'Código Postal', nth: 0, v: req.cp, w: 70, tag: 'cp' },
        { anchor: 'Telefone', v: req.phone, w: 110, tag: 'telefone' },
        { anchor: 'E-mail', v: req.email, tag: 'email' },
        { anchor: ', N.º Identificação Fiscal', v: req.nif, w: 120, tag: 'nif' },
        // Qualidade do requerente
        { anchor: 'Proprietário', check: true, on: cliente, dx: -18, tag: 'proprietario' },
        { anchor: 'EMA (Empresa', check: true, on: !cliente, dx: -18, tag: 'ema' },
        // Tipo de pedido e equipamento
        { anchor: 'Inspeção Periódica', check: true, on: inspType === 'periodica', dx: -18, tag: 'periodica' },
        { anchor: 'Inspeção Extraordinária', check: true, on: inspType === 'extraordinaria', dx: -18, tag: 'extraordinaria' },
        { anchor: 'Reinspecção', check: true, on: inspType === 'reinspecao', dx: -18, tag: 'reinspecao' },
        { anchor: 'Ascensor', check: true, on: equip === 'ascensor', dx: -18, tag: 'ascensor' },
        // Local das instalações
        { anchor: 'Edifício sito em', v: [a.street, a.zipCode, a.city].filter(Boolean).join(', '), tag: 'local' },
        { anchor: 'Código Postal', nth: 1, v: a.zipCode, w: 100, tag: 'cp-local' },
        { anchor: ', Freguesia', v: a.parish || a.city, tag: 'freguesia' }
    ], ctx);
    return { placements: t.placements, times: t.times };
}

/** Mafra — AT-123/2: caixas desenhadas; rótulos à esquerda e sublinhados em texto. */
async function fillMafra(pdfDoc, ctx) {
    const { lift, inspType, requerente, req, pageInfo } = ctx;
    const page = pdfDoc.getPages()[0];
    const t = await makeTools(pdfDoc, page, pageInfo);
    const a = lift.address || {};
    const [rcp1, rcp2] = split(req.cp, '-');
    const cliente = requerente === 'cliente';
    const d = hoje();
    applyRules(t, pageInfo, [
        { anchor: 'Nome/Firma', v: req.name, to: 545, tag: 'nome' },
        { anchor: 'NIF:', v: req.nif, w: 110, tag: 'nif' },
        { anchor: 'Morada/Sede:', v: req.address, tag: 'morada' },
        { anchor: 'Localidade:', nth: 0, v: req.locality, tag: 'localidade' },
        ...cpRules(t, pageInfo, 'Código Postal:', 0, rcp1, rcp2, 'cp'),
        { anchor: 'Tlm:', v: req.phone, tag: 'telefone' },
        { anchor: 'E-mail:', v: req.email, tag: 'email' },
        { anchor: 'Proprietário', check: true, on: cliente, dx: -14, tag: 'qualidade-proprietario' },
        // Tipo de pedido (texto com espaços à esquerda: a caixa fica no início do item)
        { anchor: 'INSPECÇÃO PERIÓDICA', check: true, on: inspType === 'periodica', dx: 2, tag: 'periodica' },
        { anchor: 'REINSPECÇÃO', check: true, on: inspType === 'reinspecao', dx: 2, tag: 'reinspecao' },
        { anchor: 'INSPECÇÃO EXTRAORDINÁRIA', check: true, on: inspType === 'extraordinaria', dx: -20, tag: 'extraordinaria' },
        { anchor: 'Para elevador', check: true, on: (ctx.equip || 'ascensor') === 'ascensor', dx: 2, tag: 'elevador' },
        // Local da instalação
        { pick: { y: 334.2, x: 126 }, run: 0, v: a.street, to: 536, tag: 'instalado-em' },
        { pick: { y: 315.2, x: 71 }, run: 0, v: a.city, tag: 'localidade-local' },
        { pick: { y: 315.2, x: 300 }, run: 1, v: lift.municipalNumber, tag: 'processo' },
        { pick: { y: 296.1, x: 71 }, run: 0, dx: 3, v: 'FestLift - Elevadores e Serviços, Lda.', to: 545, tag: 'ema' },
        // Data
        { pick: { y: 165.1, x: 71 }, run: 0, dx: 3, v: String(d.getDate()), tag: 'dia' },
        { pick: { y: 165.1, x: 71 }, run: 1, dx: 3, v: MESES[d.getMonth()], tag: 'mes' }
    ], ctx);
    return { placements: t.placements, times: t.times };
}


/** Odivelas — Mod.E/DL/SLG: quadros de identificação + pedido com caixas de selecção. */
async function fillOdivelas(pdfDoc, ctx) {
    const { lift, inspType, requerente, req, pageInfo } = ctx;
    const page = pdfDoc.getPages()[0];
    const t = await makeTools(pdfDoc, page, pageInfo);
    const cliente = requerente === 'cliente';
    const [rcp1, rcp2] = split(req.cp, '-');
    const equip = ctx.equip || 'ascensor';

    // "Código Postal:   -   -" — o texto do item inclui hífens impressos: preencher entre eles
    const cpItem = t.find('Código Postal:');
    const d1 = cpItem.s.indexOf('-');
    const d2 = cpItem.s.indexOf('-', d1 + 1);
    const cpStart = t.xAfter(cpItem, 'Código Postal:') + 4;
    const cpRules = d1 > 0 ? [
        { at: { x: cpStart, y: cpItem.y }, v: rcp1, w: t.px(cpItem, d1) - cpStart - 3, tag: 'cp-1' },
        ...(d2 > d1 ? [{ at: { x: t.px(cpItem, d1 + 1) + 3, y: cpItem.y }, v: rcp2, w: t.px(cpItem, d2) - t.px(cpItem, d1 + 1) - 6, tag: 'cp-2' }] : [])
    ] : [{ at: { x: cpStart, y: cpItem.y }, v: req.cp, w: 70, tag: 'cp' }];

    applyRules(t, pageInfo, [
        { anchor: 'Nome:', v: req.name, to: 553, tag: 'nome' },
        { anchor: 'Morada:', v: req.address, to: 553, tag: 'morada' },
        { anchor: 'Freguesia:', v: req.locality, tag: 'freguesia' },
        ...cpRules,
        { anchor: 'N.º Telefone:', v: req.phone, tag: 'telefone' },
        { anchor: 'E-mail:', v: req.email, tag: 'email' },
        { anchor: 'N.º de Contribuinte:', v: req.nif, to: 553, tag: 'nif' },
        // Pedido
        { pick: { y: 392.1, x: 136 }, run: 0, v: cliente ? 'Proprietário / Administração do condomínio' : 'Empresa de Manutenção de Elevadores (EMIE)', tag: 'qualidade' },
        { anchor: 'Inspeção Periódica', check: true, on: inspType === 'periodica', dx: -12, tag: 'periodica' },
        { anchor: 'Reinspeção', check: true, on: inspType === 'reinspecao', dx: -12, tag: 'reinspecao' },
        { anchor: 'Inspeção Extraordinária', check: true, on: inspType === 'extraordinaria', dx: -12, tag: 'extraordinaria' },
        // Tipo de instalação
        { pick: { y: 133.4, x: 57 }, check: true, on: equip === 'ascensor', dx: -12, tag: 'ascensor' },
        { pick: { y: 133.4, x: 57 }, run: 0, v: '1', tag: 'quantidade' },
        { pick: { y: 133.4, x: 260 }, run: 1, v: lift.municipalNumber, to: 552, tag: 'identificacao' }
    ], ctx);
    return { placements: t.placements, times: t.times };
}

/** Municípios com mapa de coordenadas exactas (os restantes continuam no preenchimento genérico). */
const EXACT_FILLERS = { Oeiras: fillOeiras, Sintra: fillSintra, Barreiro: fillBarreiro, Amadora: fillAmadora, Mafra: fillMafra, Odivelas: fillOdivelas };

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
