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
const EXCLUDE_TITLE = /AIPEL|Circular IPAC|Despacho 17\/2022|Modernizações — Classificação|Comunicação de início/i;

function strip(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/[#*]{1,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

async function buildContext(db, question, maxArticles = 4, maxChars = 2000) {
  if (!db) return { text: '', sources: [] };
  const q = norm(question);
  const tokens = [...new Set(q.split(/[^a-z0-9]+/).filter(t => t.length >= 4))];

  const arts = await db.collection('knowledge_base')
    .find({ published: true, category: { $in: GUEST_CATEGORIES } }, { projection: { title: 1, content: 1, tags: 1, category: 1 } })
    .toArray();

  const forced = [];
  if (/\bc[123]\b|classifica|prazo|reprova|imobiliz|nao conformidade/.test(q)) forced.push(/Classificação C1/i);
  if (/despacho|moderniza|acordo|\bc2\b|prazo/.test(q)) forced.push(/Despacho 27/i);
  if (/320|manuten|inspe|coima|livro|obriga|contrato|emergencia/.test(q)) forced.push(/DL 320\/2002/i);

  const scored = arts
    .filter(a => !EXCLUDE_TITLE.test(a.title))
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

  const sources = scored.map(x => x.a.title);
  const text = scored.map(x => `### ${x.a.title}\n${strip(x.a.content).slice(0, maxChars)}`).join('\n\n');
  return { text, sources };
}

const RULES = `REGRAS (obrigatórias):
1. Idioma: português europeu (pt-PT) — usa "tu/o senhor", "gerir", "equipa", "ecrã"; NUNCA português do Brasil. Se a pergunta estiver escrita noutro idioma, responde nesse idioma mantendo os termos técnicos portugueses (C1, C2, C3, DL 320/2002, ...).
2. Factos legais e prazos: usa APENAS o CONTEXTO. Se o contexto não cobrir a pergunta, diz claramente "Não tenho essa informação confirmada" e recomenda confirmar junto da DGEG, da entidade inspetora (EIIE) ou de um técnico certificado. NÃO cites artigos, números de diplomas, valores, coimas ou prazos que não estejam no CONTEXTO.
3. Quando dois textos do contexto se contradizem, prevalece o diploma mais recente (o Despacho 27/DGEG/2024 revogou os Despachos 17/2022 e 18/2022).
4. Factos sobre a FestLift: usa APENAS a secção SOBRE A FESTLIFT. Nunca inventes quem desenvolveu a plataforma, quantos elevadores gere, nem confundas FestLift com festivais ou eventos.
5. Perguntas técnicas práticas (avarias, componentes): dá orientação geral e prudente, diz que é informação geral e que a avaliação no local deve ser feita por um técnico de manutenção certificado. Nunca incentives a contornar dispositivos de segurança.
6. Se a pergunta for ofensiva, sem sentido ou fora do tema (elevadores, manutenção, normas, FestLift), responde em uma frase educada a explicar o que podes ajudar. Não repitas a pergunta.
7. Não acrescentes detalhes que não estejam no CONTEXTO (por exemplo, a partir de que data se conta um prazo, se não vier indicado). Para factos sobre a FestLift não escrevas "Base:".
8. Sê direto: máximo 200 palavras, primeiro a resposta, depois (se houver) "Base:" com os títulos dos artigos do CONTEXTO usados. Não inventes referências.`;

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
  return `És um especialista em manutenção e inspeção de elevadores em Portugal, ao serviço da FestLift. Vais explicar a um leigo (administrador de condomínio, proprietário) o relatório abaixo.

${RULES}

REGRAS ADICIONAIS PARA ANÁLISE DE RELATÓRIOS:
- Baseia-te APENAS no texto do relatório. Se algo não consta, escreve "não consta no relatório". Não inventes datas, números, nomes, entidades nem classificações.
- Quando o relatório indicar C1, C2 ou C3, explica o significado e o prazo segundo o CONTEXTO; se o relatório não indicar classificação, não a atribuas — podes dizer que "parece" gravidade X, justificando, e que a classificação oficial cabe à entidade inspetora.
- Estrutura da resposta (curta, com títulos):
  1. Resumo (2-3 frases: elevador, data e resultado, se constarem)
  2. Não conformidades / problemas (lista: o quê, classificação se indicada, risco)
  3. O que fazer e em que prazo (por prioridade)
  4. O que não é possível concluir só com este texto
- Máximo 350 palavras.

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

module.exports = { buildContext, buildChatPrompt, buildAnalyzePrompt, logExchange, IDENTITY };
