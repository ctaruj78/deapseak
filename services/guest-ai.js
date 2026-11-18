// services/guest-ai.js — Assistente de IA para visitantes (página pública ai-guest.html)
// Objetivo: respostas fundamentadas. O modelo só pode afirmar factos legais que constem do
// CONTEXTO (artigos da base de conhecimento revistos pela equipa) e factos sobre a empresa
// que constem de IDENTITY. Fora disso deve dizer que não tem a informação confirmada.

const crypto = require('crypto');

// Factos sobre a FestLift que podem ser afirmados. NÃO acrescentar nada que não seja verdadeiro:
// o modelo repete literalmente o que está aqui.
const IDENTITY = `FestLift é uma plataforma digital portuguesa de gestão de manutenção e inspeção de elevadores (festlift.pt).
Funcionalidades: ficha de cada elevador com código QR, listas de verificação de manutenção e inspeção, relatórios, pedidos e tarefas para técnicos, propostas e orçamentos, notificações e assistente de IA.
Contactos: para questões gerais, email info@festlift.pt. A linha +351 926 380 243 é apenas para emergências com elevadores (pessoas presas, avaria grave) — não a indiques para outros assuntos.
A FestLift NÃO tem relação com festivais, eventos ou festas. NÃO existem aqui dados sobre o número de elevadores geridos, a equipa, o fundador ou a empresa que desenvolveu a plataforma: se perguntarem, diz que não tens essa informação e indica o email de contacto.`;

// Artigos visíveis para visitantes: legislação/regulamentação e guias técnicos gerais.
// Excluídos: textos de uso interno e o Despacho 17/2022 (revogado pelo Despacho 27/DGEG/2024).
const GUEST_CATEGORIES = ['regulamentacao', 'seguranca', 'manutencao', 'avarias', 'esquemas'];
const EXCLUDE_TITLE = /AIPEL|Circular IPAC|Despacho 17\/2022|Comunicação de início/i;

function strip(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/[#*]{1,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const stem = (t) => (t.length > 8 ? t.slice(0, 7) : t); // modernizar / modernizações / modernização -> "moderni"

// ── Textos oficiais (data/regulations): DL 320/2002 e Despacho 27/2024 (DGEG) ──
const LEGAL_FILES = [
  // [ficheiro, etiqueta, nível]  official = verificado contra fonte oficial; support = resumo de apoio (não verificado)
  ['decreto-lei-320-2002.json', 'DL 320/2002', 'official'],
  ['decreto-lei-58-2017.json', 'DL 58/2017', 'official'],
  ['despacho-27-2024.json', 'Despacho 27/DGEG/2024', 'official'],
  ['dgeg-manutencao-inspecao-ascensores.json', 'DGEG (página oficial)', 'official'],
  ['decreto-513-70.json', 'Decreto 513/70', 'support'],
  ['portaria-1532-2008.json', 'Portaria 1532/2008 (SCIE)', 'support'],
  ['en-81-20-2020.json', 'EN 81-20:2020', 'support'],
  ['en-81-80-2020.json', 'NP EN 81-80:2020', 'support']
];
let _legalCache = null;
// normaliza também a ortografia antiga ("inspecção" -> "inspecao", "actividade" -> "atividade")
const norm2 = (v) => norm(v).replace(/cc/g, 'c').replace(/ct/g, 't');
function loadLegal() {
  if (_legalCache) return _legalCache;
  const out = [];
  for (const [file, label, tier] of LEGAL_FILES) {
    try {
      const d = require('../data/regulations/' + file);
      for (const a of (d.articles || [])) {
        const text = String(a.text || '').trim();
        if (!text) continue;
        const head = `${a.title || ''} ${(a.keywords || []).join(' ')}`;
        out.push({ tier, note: a.note || '', label: `${label} — ${a.number}${a.title ? ' — ' + a.title : ''}`, text, titleN: norm2(head), bodyN: norm2(text), isDespacho: /Despacho/.test(label), art: String(a.number) });
      }
    } catch (e) { console.warn('⚠️ guest-ai legal:', file, e.message); }
  }
  _legalCache = out;
  return out;
}

function legalMatches(question, max = 2) {
  const q = norm2(question);
  const toks = [...new Set(q.split(/[^a-z0-9]+/).filter(t => t.length >= 4).map(stem))];
  const want13 = /coima|multa|contraordena|sancao|punid/.test(q);
  const wantDesp = /despacho|revoga|moderniza|acordo|substitui|remodela|alteracao|alteracoes|norma 81|en 81/.test(q);
  const wantPay = /quem paga|pagar|custos?|encargos|despesas|beneficiac|benfeitoria|obras/.test(q);
  const wantMod = /moderniza|substitui|remodela|alteracao|alteracoes|artigo 20|art 20/.test(q);
  const yr = (q.match(/\b(19[0-9]{2}|200[0-9])\b/g) || []).map(Number);
  const wantOld = /antig|ate 1991|anterior a 1991|pre.?1991|inspecao periodica/.test(q) && (!yr.length || yr.some(y => y <= 1991)) || yr.some(y => y <= 1991);
  return loadLegal().map(x => {
    let sc = 0;
    toks.forEach(t => { if (x.titleN.includes(t)) sc += 4; const h = x.bodyN.split(t).length - 1; sc += Math.min(h, 3); });
    if (want13 && /^13/.test(x.art)) sc += 20;
    if (wantDesp && x.isDespacho && /^(Determinação 1|Considerando 4|Considerando 5|Considerando 2)/.test(x.art)) sc += 12;
    if (wantMod && x.isDespacho && /^Considerando 4, alínea b/.test(x.art)) sc += 24;
    if (wantMod && /^DL 320\/2002/.test(x.label) && x.art === '20') sc += 26;
    if (wantPay && /^DL 320\/2002/.test(x.label) && (x.art === '24' || /^Anexo III/.test(x.art))) sc += 16;
    if (wantOld && x.isDespacho && /^Considerando 4, alínea a/.test(x.art)) sc += 14;
    if (wantOld && /^Decreto 513\/70/.test(x.label) && /^(1|2)$/.test(x.art)) sc += 10;
    return { x, sc };
  }).filter(r => r.sc >= 8).sort((a, b) => b.sc - a.sc).slice(0, max).map(r => r.x);
}

// Artigo "Modernizações — Classificação por cenário": devolve a introdução + os cenários mais relevantes para a pergunta
function modernSections(t, question) {
  const idx = [...t.matchAll(/(?:^|\s)(\d{1,2})\.\s+(?=Alteração|Substituição|Colocação)/g)].map(m => m.index);
  const intro = (idx.length ? t.slice(0, idx[0]) : t.slice(0, 900)).replace(/Usar esta tabela[^.]*\./i, '').replace(/Ao abrigo do Artº 20º do DL 320\/2002\s*,/i, 'Segundo o critério técnico de referência para a aplicação do Artº 20º do DL 320/2002,').trim();
  const note = '[Nota: critério técnico de referência da FestLift, não vinculativo. Texto oficial do art. 20.º do DL 320/2002: a substituição parcial das instalações está sujeita aos requisitos do diploma de conceção/fabrico (hoje DL 58/2017) que estejam diretamente relacionados com a substituição em causa; numa substituição parcial importante deve haver inspeção antes da reposição em serviço. O Despacho 27/DGEG/2024 refere que o art. 20.º deve ser atualizado ao abrigo do DL 58/2017. A avaliação concreta cabe à entidade inspetora.]';
  if (!idx.length) return intro + '\n\n' + note;
  const q = norm2(question);
  const toks = [...new Set(q.split(/[^a-z0-9]+/).filter(x => x.length >= 4 && !['elevador','elevadores','moderniza','modernizacao','norma','obriga'].includes(x)))];
  const secs = idx.map((st, i) => { const body = t.slice(st, idx[i + 1] || t.length).trim(); const hn = norm2(body.slice(0, 120)); let sc = 0; toks.forEach(k => { if (hn.includes(k)) sc += 5; if (norm2(body).includes(k)) sc += 1; }); return { body, sc }; });
  const best = secs.filter(x => x.sc >= 5).sort((a, b) => b.sc - a.sc).slice(0, 2).map(x => x.body.slice(0, 2400));
  return [intro, note, ...best].join('\n\n');
}

async function buildContext(db, question, maxArticles = 4, maxChars = 2000, opts = {}) {
  // opts.staff: utilizadores autenticados (todas as categorias publicadas); opts.noFallback: sem artigos base quando nada corresponde
  if (!db) return { text: '', sources: [] };
  const q = norm(question);
  const STOP = new Set(['elevador','elevadores','ascensor','ascensores','quanto','quantos','quantas','tenho','tenha','temos','quero','preciso','sobre','qual','quais','como','para','mais','muito','esta','este','isso','pode','podem','fazer','ola','bom','dia','obrigado','obrigada','favor','sistema','sistemas','registado','registados','existe','existem']);
  const tokens = [...new Set(q.split(/[^a-z0-9]+/).filter(t => t.length >= 4 && !STOP.has(t)).map(stem))];

  const arts = await db.collection('knowledge_base')
    .find({ published: true }, { projection: { title: 1, content: 1, tags: 1, category: 1 } })
    .toArray();

  const forced = [];
  if (/\bc[123]\b|classifica|prazo|reprova|imobiliz|nao conformidade/.test(q)) forced.push(/Classificação C1/i);
  if (/despacho|moderniza|acordo|\bc2\b|prazo/.test(q)) forced.push(/Despacho 27/i);
  if (/320|manuten|inspe|coima|multa|contraordena|certificad|livro|obriga|contrato|emergencia/.test(q)) forced.push(/DL 320\/2002/i);

  const scored = arts
    .filter(a => !(opts.staff ? /Despacho 17\/2022/i : /Despacho 17\/2022|Comunicação de início/i).test(a.title))
    .map(a => {
      const title = norm(a.title);
      const tags = norm((a.tags || []).join(' '));
      const body = norm(strip(a.content));
      let score = 0;
      tokens.forEach(t => {
        if (title.includes(t)) score += 4;
        if (tags.includes(t)) score += 3;
        const hits = body.split(t).length - 1;
        score += Math.min(hits, 5);
      });
      if (forced.some(re => re.test(a.title))) score += 100;
      return { a, score };
    })
    .filter(x => x.score >= 4)
    .sort((x, y) => y.score - x.score)
    .slice(0, maxArticles);

  // Sem correspondência (ex.: pergunta noutro idioma): usa os artigos base do DL 320/2002 e das classificações
  if (!scored.length && !opts.noFallback) {
    arts.filter(a => /DL 320\/2002|Classificação C1/i.test(a.title)).forEach(a => scored.push({ a, score: 0 }));
  }

  const sources = scored.map(x => x.a.title);
  // Público (site/visitantes): remove o mecanismo C2* (Despacho 17/2022, revogado pelo Despacho 27/DGEG/2024) para o modelo não o apresentar como válido
  const clean = (html, title) => {
    const t = strip(html);
    if (/Modernizações — Classificação/i.test(title)) return modernSections(t, question);
    // Guia prático DL 320/2002: remove secções que contradizem ou não constam do texto oficial (art. 13 = coimas; art. 7 = competências das câmaras; prazos de intervenção não confirmados)
    if (/DL 320\/2002 — Guia/i.test(title)) return t.replace(/Obrigações da empresa de manutenção \(artigo 7\.º\)[\s\S]*?(?=Registos obrigatórios)/i, '').replace(/Sanções por incumprimento[\s\S]*$/i, '').trim();
    if (/Comunicação de início e fim/i.test(title)) return '[Nota: a obrigação legal de a empresa de manutenção comunicar à câmara municipal o início e o fim de cada contrato NÃO consta do texto do DL 320/2002 (nem a pretensa base no art. 11.º, que trata da selagem, nem prazos ou coimas indicados). O texto abaixo descreve um procedimento interno; confirmar a base legal antes de o apresentar como obrigação.] ' + t.replace(/Nos termos do artigo 11\.º do DL 320\/2002\s*,[^.]*\./i, '').replace(/A não comunicação pode resultar em coima[^.]*\./i, '');
    if (opts.staff) return t;
    // Tabela técnica de modernizações: ao público só o princípio geral (vinheta introdutória), sem as tabelas de pontos de norma
    if (/Modernizações — Classificação/i.test(title)) return modernSections(t, question);
    return t.replace(/C2\s*[—-]\s*Acordo de Moderniza[\s\S]*?(?=C3\s*[—-])/i, '').replace(/Comunicar à câmara municipal o início e fim de cada contrato de manutenção/gi, ''); };
  let text = scored.map(x => `### ${x.a.title}\n${clean(x.a.content, x.a.title).slice(0, /Modernizações — Classificação/i.test(x.a.title) ? 5200 : maxChars)}`).join('\n\n');
  // Texto oficial dos diplomas (fonte prioritária para citar artigos)
  const legal = legalMatches(question, 3);
  if (legal.length) {
    text = legal.map(l => (l.tier === 'official' ? `### TEXTO OFICIAL — ${l.label}` : `### RESUMO DE APOIO (não verificado no Diário da República) — ${l.label}`) + `\n${l.text.slice(0, 1300)}` + (l.note ? `\n[Nota: ${l.note}]` : '')).join('\n\n') + (text ? '\n\n' + text : '');
    legal.forEach(l => sources.unshift(l.label));
  }
  return { text, sources };
}

const RULES = `REGRAS (obrigatórias):
1. Idioma: português europeu (pt-PT) — trata o utilizador de forma formal ("o senhor/a senhora" ou forma impessoal), nunca por "tu", "gerir", "equipa", "ecrã"; NUNCA português do Brasil. Se a pergunta estiver escrita noutro idioma, responde nesse idioma mantendo os termos técnicos portugueses (C1, C2, C3, DL 320/2002, ...).
2. Factos legais e prazos: usa APENAS o CONTEXTO. Se o contexto não cobrir a pergunta, diz claramente "Não tenho essa informação confirmada" e recomenda confirmar junto da DGEG, da entidade inspetora (EIIE) ou de um técnico certificado. NÃO cites artigos, números de diplomas, valores, coimas ou prazos que não estejam no CONTEXTO.
3. Quando dois textos do contexto se contradizem, prevalece o diploma mais recente (o Despacho 27/DGEG/2024 revogou os Despachos 17/2022 e 18/2022).
4. Factos sobre a FestLift: usa APENAS a secção SOBRE A FESTLIFT. Nunca inventes quem desenvolveu a plataforma, quantos elevadores gere, nem confundas FestLift com festivais ou eventos.
5. Perguntas técnicas práticas (avarias, componentes): dá orientação geral e prudente, diz que é informação geral e que a avaliação no local deve ser feita por um técnico de manutenção certificado. Nunca incentives a contornar dispositivos de segurança.
6. Se a pergunta for ofensiva, sem sentido ou fora do tema (elevadores, manutenção, normas, FestLift), responde em uma frase educada a explicar o que podes ajudar. Não repitas a pergunta.
7. NUNCA atribuas C1, C2 ou C3 a uma anomalia concreta (ex.: "botoneira em falta") a não ser que esse mesmo exemplo conste do CONTEXTO; caso contrário diz que a classificação cabe à entidade inspetora. NUNCA descrevas procedimentos técnicos, ensaios ou requisitos de equipamento que não estejam no CONTEXTO ou que sejam apenas suposição: nesse caso dá só orientação geral muito prudente e remete para um técnico certificado.
8. Só escreve "Base:" se tiveres usado de facto artigos do CONTEXTO, e lista apenas os que sustentam o que afirmaste. Se não houver artigos relevantes, não escrevas "Base:".
9. Não acrescentes detalhes que não estejam no CONTEXTO (por exemplo, a partir de que data se conta um prazo, se não vier indicado). Para factos sobre a FestLift não escrevas "Base:".
10. Sê direto: máximo 200 palavras, primeiro a resposta, depois (se houver) "Base:" com os títulos dos artigos do CONTEXTO usados. Não inventes referências.`;

function buildChatPrompt(question, ctx) {
  return `És o assistente de IA público da FestLift, especializado em elevadores em Portugal. Estás em modo visitante (demonstração).

${RULES}

SOBRE A FESTLIFT:
${IDENTITY}

CONTEXTO (artigos da base de conhecimento):
${ctx.text || '(nenhum artigo relevante encontrado para esta pergunta)'}

PERGUNTA DO UTILIZADOR:
${String(question).substring(0, 1000)}`;
}

function buildAnalyzePrompt(reportText, ctx) {
  return `És o FEST, assistente virtual da FESTLIFT, empresa de elevadores. Vais explicar a um leigo (administrador de condomínio, proprietário) o relatório de inspeção abaixo e dizer-lhe, de forma clara, o que fazer.

${RULES}

REGRAS ADICIONAIS DO WEBSITE:
${SITE_RULES}

REGRAS ESPECÍFICAS PARA ANÁLISE DE RELATÓRIOS (têm prioridade sobre o limite de tamanho acima: esta é a análise de um documento, até ~350 palavras, com títulos curtos):
- Factos sobre o elevador, datas, números, nomes e classificações: usa APENAS o texto do relatório. Se algo não consta, escreve "não consta no relatório". Não inventes nada.
- Quando o relatório indicar C1, C2 ou C3, explica o significado em linguagem simples e o prazo segundo o CONTEXTO; se o relatório não indicar classificação, não a atribuas (podes dizer que "parece" mais ou menos grave, justificando, e que a classificação oficial cabe à entidade inspetora).
- Prazos: o relatório indica o prazo aplicável. Regra legal verificada (DL 320/2002, Anexo V, n.º 6): quando a inspeção impõe cláusulas relativas à segurança de pessoas, devem ser cumpridas no prazo máximo de 30 dias, findo o qual deve ser pedida reinspeção (os 30 dias são o prazo para cumprir as cláusulas, não um prazo para a reinspeção). Se o relatório indicar outro prazo, prevalece o do relatório.
- Se o relatório indicar elevador imobilizado ou anomalia C1, começa a resposta com um aviso destacado: o elevador não deve ser usado e deve contactar já a empresa de manutenção (FestLift: +351 926 380 243).
- Privacidade: não repitas nomes de pessoas, NIF, telefones nem emails que apareçam no relatório; refere apenas o elevador e a morada, se for preciso.
- Estrutura (títulos curtos): 1. Resumo (elevador, data e resultado, se constarem); 2. O que foi encontrado (o quê, classificação se indicada, risco em palavras simples); 3. O que fazer e em que prazo (por prioridade); 4. O que não é possível concluir só com este texto. Termina com uma única linha de próximo passo (por exemplo, a visita técnica gratuita da FestLift), sem pressionar.

SOBRE A FESTLIFT:
${SITE_IDENTITY}

CONTEXTO (artigos da base de conhecimento):
${ctx.text || '(nenhum artigo relevante encontrado)'}

RELATÓRIO:
---
${String(reportText).substring(0, 6000)}
---`;
}

// Registo para revisão de qualidade (IP guardado só como hash; apagado ao fim de 180 dias)
async function logExchange(db, { kind, ip, question, answer, sources, provider }) {
  if (!db) return;
  try {
    const secret = process.env.JWT_SECRET || 'festlift';
    const ipHash = crypto.createHmac('sha256', secret).update(String(ip || '')).digest('hex').slice(0, 16);
    const col = db.collection('guest_ai_log');
    await col.insertOne({
      kind, ipHash,
      question: String(question || '').slice(0, 1000),
      answer: String(answer || '').slice(0, 3000),
      sources: sources || [],
      provider: provider || null,
      createdAt: new Date()
    });
    col.createIndex({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 3600 }).catch(() => {});
  } catch (e) {
    console.warn('⚠️ guest_ai_log:', e.message);
  }
}


// Assistente do website comercial www.festlift.pt (FEST) — fala em nome da empresa, com a mesma base de conhecimento.
// Só afirmar aqui o que é verdadeiro (contactos/zonas vêm do próprio site).
const SITE_IDENTITY = `FESTLIFT é uma empresa de elevadores com atividade em Lisboa, Santarém e Oeste (festlift.pt). Serviços: manutenção preventiva, reparação e assistência 24h, modernização de elevadores, apoio com certificados e inspeções (DGEG/EIIE) e orçamentos.
Sede: Avenida do Parque n.º 84-B, 2635-609 Rio de Mouro (concelho de Sintra). Não indiques horários de escritório nem convides a deslocações à sede (não afirmes que "não há atendimento"); o contacto é por telefone, WhatsApp ou email.
Zona de cobertura (equipa móvel em expansão): área metropolitana de Lisboa, Península de Setúbal, distrito de Santarém e Região Oeste. Zona principal, com chegada média inferior a 45 minutos no Grande Lisboa: Lisboa, Sintra (Rio de Mouro, Mem Martins), Cascais (Estoril, Alcabideche), Oeiras (Algés, Carnaxide, Barcarena), Amadora (Alfragide, Damaia), Loures (Sacavém, Odivelas), Almada (Costa da Caparica), Setúbal (Seixal, Palmela), Mafra (Ericeira, Malveira), Vila Franca (Alverca, Alhandra). Expansão ativa com técnicos dedicados na região: Santarém (Entroncamento, Torres Novas), Torres Vedras (Bombarral, Cadaval), Caldas da Rainha (Óbidos, Peniche), Tomar (Abrantes, Ferreira do Zêzere).
Contactos: telefone/contacto principal +351 926 380 243 (para tudo, incluindo emergências com pessoas retidas ou avaria grave, 24h); email info@festlift.pt. NUNCA indiques o número +351 214 190 863 nem horários de atendimento; se perguntarem por outro telefone ou pelo horário do escritório, NÃO negues que existam, NÃO digas que não há e NÃO comeces a resposta por "Não"; começa por "O contacto mais rápido e sempre disponível é..."; diz apenas que o contacto mais rápido e sempre disponível é o +351 926 380 243 (telefone ou WhatsApp) e o email info@festlift.pt.
Tempo de chegada em emergência (valor médio publicado no website, não é garantia): inferior a 45 minutos no Grande Lisboa; em Santarém e Oeste, com técnicos dedicados na região. Serviço de emergência 24h, todos os dias.
Orçamentos: NUNCA indiques preços nem prazos de obra; oferece uma vistoria gratuita e pede ao cliente o nome e o telefone (o pedido fica registado e a equipa contacta). Se o cliente quiser ser contactado, pede nome e telefone.
Siglas (usa sempre estas definições): DGEG = Direção-Geral de Energia e Geologia; EIIE = entidade inspetora de instalações de elevação (empresa acreditada que faz a inspeção oficial); EMIE (antes EMA) = empresa de manutenção de instalações de elevação; IPAC = Instituto Português de Acreditação; DL = Decreto-Lei.
Certificações: DGEG dgeg-2.2/208 e IMPIC 96334-PUB (Classe 1). Multimarca: intervêm em elevadores Otis, Schindler, KONE, TK Elevator, Orona, Mitsubishi e outras marcas, de qualquer idade.
Plataforma digital FestLift (crm.festlift.pt): ficha de cada elevador com código QR, listas de verificação de manutenção e inspeção, relatórios, pedidos e tarefas para técnicos, propostas e orçamentos, notificações e assistente de IA.
Mudar de empresa de manutenção (condomínios): processo em 4 passos — (1) primeiro contacto por telefone, WhatsApp ou formulário (ajuda ter o contrato atual à mão); (2) visita técnica gratuita e sem compromisso para conhecer o equipamento; (3) proposta adequada ao elevador, a decisão é do condomínio, sem pressões; (4) início do serviço na data acordada, com piquete de emergência 24h. A data de entrada é planeada em função do fim do contrato atual, para o elevador nunca ficar sem empresa de manutenção responsável (a lei exige-o). O que verificar no contrato atual: data de início e duração; renovação automática; prazo e forma de pré-aviso para não renovar; a mudança de prestador é normalmente aprovada em assembleia de condóminos. A comunicação à empresa atual é feita pela administração do condomínio (que é a parte do contrato). Sobre comunicações à câmara municipal por início ou fim de contrato: NÃO afirmes nada (não está confirmado); se perguntarem, diz que a FestLift esclarece os passos administrativos durante a transição e que o ponto pode ser confirmado junto da câmara ou da DGEG. A FestLift ajuda a perceber o contrato e acompanha a transição. Os contratos variam de empresa para empresa: dá apenas estes pontos gerais, não digas prazos nem direitos concretos e acrescenta, de forma curta, que é informação geral que não substitui aconselhamento jurídico.
Após cada visita a FestLift entrega um relatório digital (o que foi feito, substituído e o que precisa de atenção).
Não tens dados sobre o número de elevadores geridos, a equipa ou o fundador: se perguntarem, diz que não tens essa informação e indica o email.
Não tem relação com festivais, eventos ou festas.`;

function formatHistory(history) {
  if (!Array.isArray(history)) return '';
  return history.slice(-8).map(h => {
    const t = Array.isArray(h && h.parts) ? h.parts.map(p => (p && p.text) || '').join(' ') : '';
    const who = (h && h.role) === 'user' ? 'Cliente' : 'FEST';
    return t.trim() ? `${who}: ${t.trim().slice(0, 600)}` : '';
  }).filter(Boolean).join('\n');
}

const SITE_RULES = `- A "SOBRE A FESTLIFT" abaixo descreve a empresa (e não a plataforma de software): usa-a para serviços, contactos e zona.
- ESTILO: quem fala contigo tem um problema ou uma decisão a tomar. Começa logo pela resposta útil à situação (sem saudações nem apresentações repetidas; cumprimenta só se for a primeira mensagem). Mostra empatia natural numa meia frase quando fizer sentido (por exemplo, "Compreendo que seja incómodo"), sem dramatizar e sem usar a palavra "reconhecer".
- Sê claro e direto: frases simples, sem rodeios, sem repetir a pergunta. O tamanho segue a regra de COMPLETUDE abaixo.
- Quando a pergunta for legal ou normativa, cita o diploma e o artigo exatos que constam do CONTEXTO (texto oficial); nunca cites artigos, valores ou prazos que não estejam no CONTEXTO.
- COMPLETUDE: dá a informação completa e correta de que a pessoa precisa para decidir ou resolver o problema (o que é, qual a gravidade, prazos e obrigações aplicáveis, o que fazer e quem faz), usando o CONTEXTO. Sem preâmbulos nem repetições, mas sem cortar o que é útil: perguntas simples = resposta curta; problemas ou questões legais = resposta estruturada (listas curtas), até ~250 palavras. Antecipa o que a pessoa vai precisar a seguir (prazo, consequência, próximo passo). Usa linguagem simples e explica siglas na primeira vez (por exemplo: "C2 (anomalia grave, a corrigir num prazo)", "entidade inspetora (empresa acreditada que faz a inspeção oficial)"). Diz o PORQUÊ do que recomendas numa frase. Se houver mais, termina com uma oferta curta ("Se quiser, explico em mais detalhe...").
- NÍVEIS DE FONTE: "TEXTO OFICIAL" pode ser citado com diploma e artigo. "RESUMO DE APOIO" é um resumo não verificado: usa-o só para explicar o tema em termos gerais, NÃO cites dele valores numéricos, medidas ou números de artigos, e diz que o detalhe deve ser confirmado na norma ou no diploma oficial. O "critério técnico de referência da FestLift" não é lei: apresenta-o como orientação técnica usada nas inspeções e diz que a avaliação final cabe à entidade inspetora.
- FIDELIDADE: respeita exatamente a quem se aplica cada norma e o que cada artigo diz; as "[Nota: ...]" do CONTEXTO são esclarecimentos verificados e têm de ser respeitadas. Quanto a quem paga as obras, a lei (art. 24.º do DL 320/2002) apenas classifica as obras e remete os encargos para o regime do arrendamento urbano e da propriedade horizontal: não afirmes quem paga em concreto; diz que depende desse regime, do contrato e da decisão do condomínio, e sugere confirmar com a administração ou com um jurista.
- FONTES: o "TEXTO OFICIAL" do CONTEXTO prevalece sobre qualquer resumo ou guia; se houver diferenças entre fontes, usa só o texto oficial e NUNCA menciones ao cliente a discrepância. Se um facto legal (por exemplo, prazo de resposta em emergência, comunicações à câmara) não constar do CONTEXTO, diz que não tens essa informação confirmada. Traduz "EMA" e "EMIE" por "empresa de manutenção".
- QUESTÕES LEGAIS: responde sempre com (1) a regra, com o diploma e o artigo exatos do CONTEXTO, (2) a quem se aplica (por exemplo, proprietário ou empresa de manutenção, conforme o texto), (3) as consequências (coima ou prazo, se constarem do CONTEXTO) e (4) o que fazer a seguir.
- SEGURANÇA NAS AVARIAS: explica o problema provável, a gravidade, o que o técnico vai verificar e fazer, e o que o cliente pode fazer com segurança (não usar o elevador se houver risco, sinalizar, registar o sintoma, contactar a empresa de manutenção). NÃO dês instruções passo-a-passo de desmontagem, ajuste ou reparação e NÃO sugiras ao cliente testar componentes, medir, ajustar (binário, velocidade, tensão de correias, células, fins de curso) nem mexer em guias ou mecanismos: só empresas de manutenção registadas podem intervir nos elevadores. O que o cliente pode fazer: não usar o elevador se houver risco, sinalizar a avaria, anotar quando e como acontece, e contactar a empresa de manutenção.
- Mudança de empresa de manutenção: responde com o essencial em poucas frases — não enumeres os 4 passos (só se o cliente os pedir). Diz o que fazer primeiro: ver no contrato atual o prazo de pré-aviso e se há renovação automática (para não perder a data), lembrar que a decisão costuma ir a assembleia, e que a FestLift acompanha a transição e faz uma visita técnica gratuita. Quando falta muito tempo para o fim do contrato, tranquiliza: há tempo para preparar. Não critiques a empresa atual.
- Anomalias C1/C2/C3: diz o que significa, o prazo e o próximo passo. NÃO menciones despachos revogados nem o mecanismo C2* (modernização) a não ser que o cliente pergunte especificamente por prazos alargados ou modernização.
- Prazos e obrigações do DL 320/2002 (por exemplo, tempos máximos de intervenção em emergência) são obrigações LEGAIS de qualquer empresa de manutenção: apresenta-os como lei, nunca como promessa ou desempenho da FestLift. Sobre a FestLift diz apenas o que consta de "SOBRE A FESTLIFT".
- "Base:" lista APENAS títulos de artigos do CONTEXTO usados para factos legais/técnicos; nunca escrevas "SOBRE A FESTLIFT" nem "Base:" em respostas sobre a empresa, serviços ou contactos.
- Se faltar um dado essencial para ajudar, faz UMA pergunta de esclarecimento (não várias).
- Quando fizer sentido, termina com o próximo passo concreto (por exemplo: o que ter à mão, enviar uma descrição ou fotografia, pedir a visita técnica gratuita). Só pedes nome e telefone quando a pessoa quiser serviços, orçamento, visita ou transição de empresa.
- Se não sabes, diz numa frase que não tens essa informação e indica quem a confirma; nunca inventes. Não prometas prazos nem preços.
- Concorrentes e outras empresas de manutenção: tom neutro e respeitoso; nunca critiques nem compares preços ou qualidade.
- Trata o cliente de forma formal e cordial ("o senhor/a senhora" ou forma impessoal: "pode", "indique-nos"); nunca uses "tu". Esta regra substitui a parte de "tu" da regra 1. A regra 10 (máximo de palavras) é substituída pelo limite de ESTILO acima; "Base:" só se citaste artigos do CONTEXTO, numa linha.
- EMERGÊNCIA com pessoa presa/retida: responde em poucas linhas e APENAS com isto: (1) ligar já para +351 926 380 243 (ou 112 se alguém estiver indisposto ou em risco); (2) manter a calma e não forçar as portas nem tentar sair da cabine; (3) usar o botão de alarme/intercomunicador da cabine, se existir; (4) se a cabine tiver o código QR da FestLift, digitalizá-lo com o telemóvel e escolher a opção "Pessoa presa" (envia um alerta urgente à equipa e ao responsável do edifício). NÃO acrescentes outros passos, NÃO sugiras premir botões de paragem e NÃO prometas tempos de chegada.
- Zona de atuação: confirma que atuam nas localidades listadas em "Zona de cobertura" (a sede é em Rio de Mouro, Sintra) e indica se é zona principal ou de expansão. Para uma localidade que NÃO conste da lista, não afirmes que cobrem nem que não cobrem: diz que a cobertura é confirmada pela equipa (telefone +351 926 380 243 ou info@festlift.pt).`;

function buildSiteChatPrompt(question, ctx, history) {
  const hist = formatHistory(history);
  return `És o FEST, assistente virtual do website da FESTLIFT, empresa de elevadores. Respondes a clientes e potenciais clientes (condomínios, proprietários, gestores).

${RULES}

REGRAS ADICIONAIS DO WEBSITE:
${SITE_RULES}

SOBRE A FESTLIFT:
${SITE_IDENTITY}

CONTEXTO (artigos da base de conhecimento):
${ctx.text || '(nenhum artigo relevante encontrado para esta pergunta)'}
${hist ? `\nCONVERSA ATÉ AGORA:\n${hist}\n` : ''}
PERGUNTA DO CLIENTE:
${String(question).substring(0, 1000)}`;
}

module.exports = { buildContext, buildChatPrompt, buildSiteChatPrompt, buildAnalyzePrompt, logExchange, IDENTITY };
