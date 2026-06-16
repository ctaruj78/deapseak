/**
 * BASE DE DADOS DE KEYWORDS DE VIOLAÇÕES
 * Módulo partilhado pelos parsers de PDF para reconhecer violações
 * pelo texto da descrição, mesmo quando o número do artigo está em
 * falta, ilegível ou é uma sub-cláusula não catalogada.
 *
 * Ordenação: do mais específico para o mais genérico.
 */
const violationKeywordsDB = [
    // --- LIMITADOR DE VELOCIDADE ---
    // Limitador de velocidade - C1 when non-functional/absent (safety device per DL 513/70 Art.67)
    {
        patterns: [/limitador\s+de\s+velocidade.{0,30}(em\s+falta|inoperaci|avari|n[ãa]o\s+func|defeitu|parti|bloquea)/i],
        article: '67',
        classification: 'C1',
        title: 'Limitador de velocidade — inoperacional/em falta',
        why: 'Limitador não funcional não aciona o para-quedas em sobrevelocidade — queda livre fatal.',
        solution: 'Imobilizar elevador. Reparar ou substituir o limitador imediatamente.',
        urgency: 'CRÍTICO'
    },
    // Limitador de velocidade - C3 when just maintenance/cosmetic state
    {
        patterns: [/limitador\s+de\s+velocidade.{0,30}(oxidado|desgast|suj|estado\s+de\s+conserv|lubrif)/i],
        article: '9.9',
        classification: 'C3',
        title: 'Limitador de velocidade — estado de conservação',
        why: 'O limitador oxidado pode não acionar o para-quedas em caso de sobrevelocidade.',
        solution: 'Limpar, lubrificar e verificar calibração. Substituir se necessário.',
        urgency: 'MODERADO'
    },
    // --- BALAUSTRADA / COBERTURA DA CABINA ---
    {
        patterns: [/balaustrada/i, /cobertura\s+da\s+cabina/i],
        article: '8.3.2', classification: 'C3',
        title: 'Balaustrada na cobertura da cabina',
        why: 'Sem balaustrada, o técnico pode cair durante trabalhos no teto da cabina.',
        solution: 'Instalar balaustrada conforme EN 81-20 §5.2.6.',
        urgency: 'MODERADO'
    },
    // --- PAVIMENTO / PISO DA CABINA ---
    {
        patterns: [/pavimento\s+da\s+cabina.*danificad/i, /piso\s+da\s+cabina.*danificad/i, /pavimento.*cabina.*(danificad|deteriorad|partido)/i],
        article: '8.3.2', classification: 'C3',
        title: 'Pavimento da cabina danificado',
        why: 'Piso irregular aumenta risco de queda dos utilizadores, especialmente idosos.',
        solution: 'Reparar ou substituir o revestimento do piso da cabina.',
        urgency: 'BAIXO'
    },
    // --- CABOS DE SUSPENSÃO ---
    {
        patterns: [/cabos?\s+de\s+suspens[ãa]o.*desgaste/i, /cabos?\s+de\s+suspens[ãa]o.*partid/i, /cabos?\s+de\s+suspens[ãa]o.*fios?\s+partid/i, /filamentos?\s+partid/i],
        article: '9.2.2', classification: 'C3',
        title: 'Cabos de suspensão — sinais de desgaste',
        why: 'Fios/filamentos partidos indicam degradação. Pode levar a rutura total do cabo.',
        solution: 'Inspeção detalhada por técnico certificado. Substituir conjunto de cabos se necessário.',
        urgency: 'MODERADO'
    },
    {
        patterns: [/cabos?\s+de\s+suspens[ãa]o/i, /cabo.*contrapeso.*desgaste/i],
        article: '10', classification: 'C2',
        title: 'Cabos de suspensão',
        why: 'Rutura de cabo é acidente fatal.',
        solution: 'Substituição conforme EN 81 §9.1.',
        urgency: 'MODERADO'
    },
    // --- ILUMINAÇÃO ACESSO CASA DE MÁQUINAS (mais específico — antes da caixa) ---
    {
        patterns: [
            /ilumina[çc][ãa]o\s+de\s+acesso\s+a\s+casa\s+de\s+m[áa]quinas/i,
            /ilumina[çc][ãa]o.*acesso.*casa\s+de\s+m[áa]quinas/i,
            /pontos?\s+de\s+luz\s+inoperacion.*casa\s+de\s+m[áa]quinas/i
        ],
        article: '6.3.6', classification: 'C3',
        title: 'Iluminação de acesso à casa de máquinas — pontos inoperacionais',
        why: 'Iluminação insuficiente no acesso à casa de máquinas aumenta risco de queda e acidente dos técnicos durante manutenção ou emergência.',
        solution: 'Repor lâmpadas inoperacionais no corredor/acesso à casa de máquinas. Verificar circuito elétrico e disjuntor.',
        urgency: 'MODERADO'
    },
    // --- ILUMINAÇÃO DA CAIXA ---
    {
        patterns: [/ilumina[çc][ãa]o\s+da\s+caixa.*inoperacion/i, /luz.*caixa.*inoperacion/i, /ilumina[çc][ãa]o.*caixa.*avari/i, /na\s+ilumina[çc][ãa]o\s+da\s+caixa/i],
        article: '5.9', classification: 'C3',
        title: 'Iluminação da caixa — pontos inoperacionais',
        why: 'Iluminação insuficiente dificulta trabalhos de manutenção e emergências.',
        solution: 'Repor lâmpadas inoperacionais. Verificar circuito elétrico.',
        urgency: 'BAIXO'
    },
    // --- ILUMINAÇÃO CABINA ---
    {
        patterns: [/ilumina[çc][ãa]o\s+(?:da\s+)?cabina.*inoperacional/i, /luz.*cabina.*avari/i],
        article: '15', classification: 'C2',
        title: 'Iluminação da cabina',
        why: 'Pânico e quedas em caso de falha total de iluminação.',
        solution: 'Substituir lâmpadas e verificar bateria de emergência.',
        urgency: 'MODERADO'
    },
    // --- PORTA DE PATAMAR ---
    {
        patterns: [/porta\s+de\s+patamar.*n[ãa]o\s+fecha/i, /porta.*patamar.*avari/i, /porta.*patamar.*defeito/i],
        article: '7', classification: 'C1',
        title: 'Porta de patamar',
        why: 'Porta aberta com cabina ausente = queda na caixa.',
        solution: 'Reparar mecanismo de fecho e bloqueio imediatamente.',
        urgency: 'CRÍTICO'
    },
    // --- BLOQUEIO / FECHO PORTAS ---
    {
        patterns: [/bloqueio.*porta/i, /fecho.*porta.*avari/i, /contato.*porta.*defeito/i],
        article: '12', classification: 'C1',
        title: 'Bloqueio eletromecânico das portas',
        why: 'Porta abre com cabina em movimento = esmagamento/queda.',
        solution: 'Substituir contatos e verificar intertravamento.',
        urgency: 'CRÍTICO'
    },
    // --- PARA-QUEDAS ---
    {
        patterns: [/para[-\s]quedas.*avari/i, /para[-\s]quedas.*defeito/i, /para[-\s]quedas.*inoperacional/i],
        article: '13', classification: 'C1',
        title: 'Para-quedas',
        why: 'Sem para-quedas funcional a queda livre é fatal.',
        solution: 'Reparação ou substituição imediata. Imobilizar elevador.',
        urgency: 'CRÍTICO'
    },
    // --- NIVELAMENTO ---
    {
        patterns: [/nivelamento.*incorreto/i, /n[ãa]o\s+nivela/i, /desnível.*cabina/i, /sobrenivelamento/i],
        article: '23', classification: 'C2',
        title: 'Nivelamento da cabina',
        why: 'Degrau excessivo = quedas, especialmente em idosos e deficientes.',
        solution: 'Ajustar sistema de nivelamento (tolerância ±15 mm).',
        urgency: 'MODERADO'
    },
    // --- ALARME / COMUNICAÇÃO ---
    {
        patterns: [/bot[ãa]o\s+de\s+alarme.*defeito/i, /alarme.*inoperacional/i, /intercomunicador.*avari/i, /tel[ée]fone.*cabina.*n[ãa]o\s+func/i],
        article: '18', classification: 'C1',
        title: 'Sistema de alarme e comunicação',
        why: 'Pessoa encravada não consegue pedir socorro.',
        solution: 'Reparar botão de alarme e testar comunicação bidirecional.',
        urgency: 'CRÍTICO'
    },
    // --- SOBRECARGA ---
    {
        patterns: [/dispositivo\s+de\s+sobrecarga.*avari/i, /sobrecarga.*n[ãa]o\s+func/i],
        article: '40', classification: 'C2',
        title: 'Dispositivo de sobrecarga',
        why: 'Sobrecarga não detetada pode levar a rutura de cabos.',
        solution: 'Calibrar ou substituir sensor de peso.',
        urgency: 'MODERADO'
    },
    // --- VENTILAÇÃO ---
    {
        patterns: [/ventila[çc][ãa]o.*insuficiente/i, /ventila[çc][ãa]o.*cabina.*defeito/i],
        article: '16', classification: 'C2',
        title: 'Ventilação da cabina',
        why: 'Asfixia em caso de paragem prolongada.',
        solution: 'Garantir aberturas mínimas conforme EN 81.',
        urgency: 'MODERADO'
    },
    // --- PLACA DE IDENTIFICAÇÃO ---
    {
        patterns: [/placa.*carga\s+m[áa]xima/i, /placa.*identifica[çc][ãa]o.*ausente/i, /carga\s+m[áa]xima.*n[ãa]o\s+indicad/i],
        article: '20', classification: 'C3',
        title: 'Placa de identificação',
        why: 'Utilizadores não conhecem a carga máxima e podem sobrecarregar o elevador.',
        solution: 'Colocar placa legível com carga máxima e número de pessoas.',
        urgency: 'BAIXO'
    },
    // --- ILUMINAÇÃO CASA DE MÁQUINAS ---
    {
        patterns: [/ilumina[çc][ãa]o.*casa\s+de\s+m[áa]quinas/i, /luz.*casa\s+de\s+m[áa]quinas.*avari/i],
        article: '27', classification: 'C3',
        title: 'Iluminação da casa de máquinas',
        why: 'Acidentes de trabalho durante manutenção.',
        solution: 'Repor iluminação mínima 200 lux.',
        urgency: 'BAIXO'
    },
    // --- FREIO ---
    {
        patterns: [/freio.*avari/i, /freq.*n[ãa]o\s+func/i, /sistema\s+de\s+travagem.*defeito/i],
        article: '11', classification: 'C1',
        title: 'Sistema de travagem (freio)',
        why: 'Elevador sem freio funcional não consegue parar.',
        solution: 'Imobilizar e reparar imediatamente.',
        urgency: 'CRÍTICO'
    },
    // --- ACESSO CASA DE MÁQUINAS ---
    {
        patterns: [/porta\s+casa\s+de\s+m[áa]quinas.*n[ãa]o\s+fecha/i, /acesso.*casa\s+de\s+m[áa]quinas.*n[ãa]o\s+protegid/i],
        article: '26', classification: 'C2',
        title: 'Acesso à casa de máquinas',
        why: 'Acesso não autorizado a área de alta tensão e componentes em movimento.',
        solution: 'Instalar porta com fechadura e placa de aviso.',
        urgency: 'MODERADO'
    },
    // --- LIVRO DE REGISTOS ---
    {
        patterns: [/livro\s+de\s+registos.*em\s+falta/i, /livro\s+de\s+registos.*n[ãa]o\s+apresentad/i, /registos\s+de\s+manuten[çc][ãa]o.*n[ãa]o\s+apresentad/i, /livro\s+de\s+(?:registos|ocorr[êe]ncias).*atualizado/i, /livro\s+de\s+registos.*n[ãa]o\s+(?:dispon[íi]vel|exibid)/i],
        article: '47', classification: 'C3',
        title: 'Livro de registos de manutenção',
        why: 'Sem rastreabilidade da manutenção.',
        solution: 'Manter livro atualizado com todas as intervenções.',
        urgency: 'BAIXO'
    },
    // --- SINALIZADORES DE FASE ---
    {
        patterns: [
            /sinalizadores?\s+de\s+(?:presen[çc]a\s+de\s+)?fase/i,
            /indicadores?\s+de\s+fase.*inoperacion/i,
            /quadro\s+el[eé]ctrico.*fase.*inoperacion/i
        ],
        article: '13.1.1', classification: 'C3',
        title: 'Sinalizadores de presença de fase — inoperacionais',
        why: 'Sem indicação de fase no quadro elétrico, o técnico não consegue avaliar se o circuito está energizado, aumentando risco de eletrocussão.',
        solution: 'Substituir sinalizadores/lâmpadas piloto de presença de fase no quadro elétrico da casa de máquinas.',
        urgency: 'MODERADO'
    },
    // --- ALTURA INFERIOR A 1.80m NA CASA DE MÁQUINAS ---
    {
        patterns: [
            /altura\s+inferior\s+a\s+1[,.]80/i,
            /zonas?\s+de\s+circula[çc][ãa]o.*altura\s+inferior/i,
            /altura\s+livre.*inferior.*1[,.]80/i,
            /p[eé]-direito.*inferior.*1[,.]80/i
        ],
        article: '6.3.2.2', classification: 'C3',
        title: 'Zona de circulação/trabalho na casa de máquinas com altura < 1,80 m',
        why: 'Altura insuficiente obriga técnicos a trabalhar em posição forçada, aumentando risco de lesões, colisões e acidentes durante manutenção.',
        solution: 'Sinalizar zona com aviso de altura reduzida. Avaliar se é possível estruturalmente elevar o teto. Usar EPI adequado (capacete).',
        urgency: 'BAIXO'
    },
    // --- NÍVEL DE ILUMINAÇÃO CABINA < 50 LUX ---
    {
        patterns: [
            /n[ií]vel\s+de\s+ilumina[çc][ãa]o\s+da\s+cabina/i,
            /ilumina[çc][ãa]o.*cabina.*inferior\s+a\s+50\s+lux/i,
            /50\s+lux/i,
            /lux.*[óo]rg[ãa]os\s+de\s+comando/i
        ],
        article: '8.17.1', classification: 'C3',
        title: 'Nível de iluminação da cabina inferior a 50 lux',
        why: 'Iluminação abaixo de 50 lux na cabina dificulta a leitura dos botões de comando e aumenta risco de queda, especialmente para idosos e deficientes visuais.',
        solution: 'Substituir lâmpada(s) da cabina por solução de maior potência (LED). Verificar que o nível atinge mínimo 50 lux no pavimento e junto dos órgãos de comando.',
        urgency: 'BAIXO'
    },
    // --- OXIDAÇÃO GENÉRICA ---
    {
        patterns: [/oxidado/i, /corros[ãa]o/i, /ferrugem/i],
        article: null, classification: 'C3',
        title: 'Componente com oxidação/corrosão',
        why: 'Oxidação enfraquece componentes estruturais e de segurança.',
        solution: 'Tratar superfície, aplicar anti-corrosivo. Avaliar necessidade de substituição.',
        urgency: 'BAIXO'
    }
];

/**
 * Tenta identificar o artigo e classificação a partir do texto da descrição.
 * @param {string} description
 * @returns {{ article, classification, title, explanation, why, solution, urgency }|null}
 */
function matchByDescriptionText(description) {
    if (!description || description.length < 10) return null;

    for (const entry of violationKeywordsDB) {
        for (const pattern of entry.patterns) {
            if (pattern.test(description)) {
                console.log(`  🔤 Text-match: "${description.substring(0, 50)}" → Art.${entry.article || 'N/A'} (${entry.classification})`);
                return {
                    article: entry.article,
                    classification: entry.classification,
                    title: entry.title,
                    explanation: entry.title,
                    why: entry.why,
                    solution: entry.solution,
                    urgency: entry.urgency
                };
            }
        }
    }
    return null;
}

module.exports = { violationKeywordsDB, matchByDescriptionText };
