#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// Populates all empty regulations in portugal-lift-regulations.json
// with comprehensive technical content based on official sources
// ═══════════════════════════════════════════════════════════
'use strict';
const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/portugal-lift-regulations.json');
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

function setArticles(id, articles) {
    const reg = db.regulations.find(r => r.id === id);
    if (!reg) { console.error('NOT FOUND:', id); return; }
    reg.articles = articles;
    console.log(`✅ ${id}: ${articles.length} articles set`);
}

// ─────────────────────────────────────────────────────────────
// NP EN 81-50:2020 — Regras de cálculo, projeto e ensaios
// ─────────────────────────────────────────────────────────────
setArticles('NP_EN_81_50_2020', [
    {
        number: 1,
        classification: 'technical',
        title: 'Âmbito — Ensaios e cálculos para componentes de ascensores',
        text: 'Esta norma define os métodos de cálculo de resistência, critérios de projeto e procedimentos de ensaio para os seguintes elementos: cabos/cadeias de suspensão, dispositivos de segurança (pára-quedas, tampão, limitador de velocidade), porta da cabina, porta de patamar, quadro de cabina, guias e suportes, amortecedores, roda de aderência. Aplica-se em conjunto com NP EN 81-20:2020 para ascensores novos.',
        keywords: ['cálculo resistência', 'ensaios componentes', 'pára-quedas', 'guias', 'amortecedores'],
        relatedViolations: []
    },
    {
        number: 2,
        classification: 'technical',
        title: 'Cabos de suspensão — Requisitos de cálculo',
        text: 'Fator de segurança mínimo para cabos de tração: ≥12 (cabos de aço) ou ≥10 (cintas de poliuretano). Diâmetro mínimo: 8mm para cabos de aço. Número mínimo de cabos: 2. Para roldanas: relação diâmetro da roldana/diâmetro do cabo ≥40 (tração normal) ou ≥26 (para-quedas ou tensionador). Número de fios partidos por passo de torcedura: limite de 10% dos fios totais num grupo de reforço = substituição obrigatória.',
        keywords: ['cabos suspensão', 'fator segurança', 'diâmetro mínimo', 'fios partidos', '10%'],
        relatedViolations: ['C1']
    },
    {
        number: 3,
        classification: 'technical',
        title: 'Dispositivo pára-quedas — Ensaio de funcionamento obrigatório',
        text: 'O pára-quedas deve ser ensaiado em fábrica (ensaio de tipo) e em obra após instalação. Ensaio de fábrica: queda livre à velocidade de actuação do limitador de velocidade com carga nominal. Desaceleração máxima durante actuação: entre 0.2g e 1g. Distância de paragem máxima: definida na norma em função da velocidade nominal. O pára-quedas deve reter a cabina e manter-se retida indefinidamente sem deslizamento. Após actuação do pára-quedas em obra: verificar guias, suportes e cabina antes de reactivar.',
        keywords: ['pára-quedas', 'ensaio fábrica', 'desaceleração', '1g', '0.2g', 'retenção cabina'],
        relatedViolations: ['C1']
    },
    {
        number: 4,
        classification: 'technical',
        title: 'Limitador de velocidade — Velocidades de actuação',
        text: 'O limitador de velocidade actua ANTES que a cabina atinja a velocidade de disparo do pára-quedas. Velocidade de actuação: ≥115% da velocidade nominal. Para ascensores de velocidade nominal ≤1m/s: velocidade de actuação ≤0.8m/s + (velocidade nominal × 0.25). Para velocidades >1m/s: velocidade de actuação ≤1.25× velocidade nominal + 0.25m/s. O limitador deve ser verificado e tarado a cada 2 anos (máx.) ou após intervenção nos cabos.',
        keywords: ['limitador velocidade', '115% velocidade nominal', 'actuação', 'taração', '2 anos'],
        relatedViolations: ['C1', 'C2']
    },
    {
        number: 5,
        classification: 'technical',
        title: 'Amortecedores — Tipos e requisitos',
        text: 'Tipos de amortecedores: a) acumulação de energia (molas ou tampões borracha) — para v ≤1m/s; b) dissipação de energia (hidráulicos) — para v >1m/s. Todos os ascensores devem ter amortecedores na base de caixa para cabina e contrapeso (Art.10.3 EN 81-1:1998). Amortecedores de mola: validação por cálculo do curso total mínimo. Amortecedores hidráulicos: ensaio de impacto a 115% velocidade nominal; desaceleração máxima 1g durante >0.04s. Verificação visual e funcional a cada inspeção.',
        keywords: ['amortecedores', 'mola', 'hidráulico', '1m/s', '1g', 'curso mínimo'],
        relatedViolations: ['C1', 'C2']
    },
    {
        number: 6,
        classification: 'technical',
        title: 'Portas de cabina e patamar — Resistência mecânica',
        text: 'Força horizontal sobre face interior porta fechada (cabina): ≥300N sem deformação permanente; ≤150N sem abertura. Porta de patamar: resistência ao fogo EI 30 exigida (para edifícios com compartimentos de fogo). Juntas entre painéis de porta não devem permitir passagem de dedo de prova Ø25mm (face acessível). Dispositivo de encravamento: ferrolho com resistência mínima 1000N à abertura não autorizada. Velocidade máxima de fecho automático de porta: 0.3m/s no ponto de contacto.',
        keywords: ['portas resistência', '300N', 'EI 30', 'encravamento', '1000N', 'fecho automático'],
        relatedViolations: ['C1', 'C2']
    },
    {
        number: 7,
        classification: 'technical',
        title: 'Guias — Cálculo e tolerâncias',
        text: 'As guias devem ser calculadas para suportar as cargas de paragem do pára-quedas. Material: aço laminado tipo T ou similar. Deflexão máxima das guias durante actuação do pára-quedas: 5mm. Espaçamento entre suportes de guia: função da carga e perfil da guia (definido em tabelas normativas). Tolerância de alinhamento vertical: ≤0.5mm/m. Ligações entre troços: emendas sem ressaltos >0.5mm. Amortecedores de guia (se existentes): verificação anual.',
        keywords: ['guias cálculo', 'deflexão 5mm', 'pára-quedas', 'suportes', 'alinhamento 0.5mm'],
        relatedViolations: ['C2', 'C3']
    },
    {
        number: 8,
        classification: 'technical',
        title: 'Roda de aderência — Cálculo de transmissão de esforços',
        text: 'A tração por aderência (roda de aderência) deve garantir que os cabos não deslizam durante paragem de emergência. Fator de aderência mínimo calculado em condições normais e de emergência. Ranhuras dos cabos: verificação do desgaste e perfil a cada 5 anos ou inspeção completa. Ângulo de embrulho: mínimo 150° para ascensores com contrapeso. Desgaste de ranhuras: perda de profundidade >25% do original = substituição. Tipo de ranhuras: semicirculares, em V, ou com rebaixo (undercut) — cada tipo com fator de aderência diferente.',
        keywords: ['roda aderência', 'aderência cabos', 'ranhuras', '150° embrulho', 'desgaste 25%'],
        relatedViolations: ['C1', 'C2']
    }
]);

// ─────────────────────────────────────────────────────────────
// NP EN 81-70:2022 — Acessibilidade (PMR)
// ─────────────────────────────────────────────────────────────
setArticles('NP_EN_81_70_2022', [
    {
        number: 1,
        classification: 'info',
        title: 'Âmbito — Categorias de acessibilidade',
        text: 'Define dois tipos de elevadores acessíveis: Tipo 1 (acessível a utilizadores de cadeiras de rodas assistidos) e Tipo 2 (acessível a utilizadores de cadeiras de rodas autónomos). Tipo 2 é o requisito mínimo para edifícios de habitação coletiva novos (DL 163/2006) e edifícios públicos. As dimensões da cabina, largura de porta e outros parâmetros são distintos entre Tipo 1 e Tipo 2.',
        keywords: ['acessibilidade', 'PMR', 'cadeira rodas', 'Tipo 1', 'Tipo 2', 'DL 163/2006'],
        relatedViolations: []
    },
    {
        number: 2,
        classification: 'technical',
        title: 'Dimensões mínimas da cabina',
        text: 'Tipo 1: cabina interior mín. 1000mm (largura) × 1250mm (profundidade). Tipo 2: cabina interior mín. 1100mm (largura) × 1400mm (profundidade). A largura de 1100mm permite a entrada de cadeira de rodas elétrica standard. A profundidade de 1400mm permite manobra de rotação parcial. Carga nominal mínima Tipo 2: 630kg (permite cadeira+utilizador+acompanhante). Altura interior mínima: ≥2000mm.',
        keywords: ['dimensões cabina', '1100mm', '1400mm', 'Tipo 1', 'Tipo 2', '630kg'],
        relatedViolations: ['C2', 'C3']
    },
    {
        number: 3,
        classification: 'technical',
        title: 'Largura da porta — Passagem livre mínima',
        text: 'Tipo 1: passagem livre mínima da porta ≥800mm. Tipo 2: passagem livre mínima da porta ≥900mm. A passagem livre é medida com a porta totalmente aberta, entre batentes (sem incluir espessura da porta). Para renovação de elevadores existentes: mínimo recomendado 800mm (Tipo 1). A porta deve manter-se aberta um mínimo de 8 segundos para permitir passagem de cadeira de rodas. Sensor de porta de área obrigatório (não apenas sensor de borracha).',
        keywords: ['largura porta', '800mm', '900mm', 'passagem livre', '8 segundos', 'sensor área'],
        relatedViolations: ['C2']
    },
    {
        number: 4,
        classification: 'technical',
        title: 'Botoneira — Altura, Braille e contraste',
        text: 'Altura dos botões da cabina e de chamada: entre 900mm e 1200mm do piso acabado. Botão de emergência (alarme): ≤900mm (acessível de cadeira de rodas). Botões com indicação Braille ou relevo tátil ao lado de cada botão. Cor dos botões: contraste mínimo 60% com o fundo da botoneira. Dimensão mínima da superfície do botão: 20mm × 20mm (ou Ø20mm). Indicação de andar: visual + auditiva (voz ou tom) na cabina. Painel de botoneira: não deve estar encaixado em local que requeira aproximação lateral além de 600mm.',
        keywords: ['botoneira', '900mm', '1200mm', 'Braille', 'relevo tátil', 'contraste 60%', 'auditivo'],
        relatedViolations: ['C2', 'C3']
    },
    {
        number: 5,
        classification: 'technical',
        title: 'Espelho e corrimão na cabina',
        text: 'Tipo 2: espelho obrigatório na parede oposta à porta (ou paredes laterais) — permite ao utilizador de cadeira de rodas ver o patamar ao recuar para sair. Espelho: do nível 300mm do piso até ≥1000mm altura, em toda a largura (ou mínimo 40% da largura). Corrimão: obrigatório pelo menos numa parede lateral, a 900mm do piso (±25mm). Diâmetro do corrimão: 30-45mm. Afastamento do corrimão à parede: 35-45mm. Não obstruir o espaço livre da porta.',
        keywords: ['espelho cabina', 'corrimão', '900mm', 'Tipo 2', 'cadeira rodas retroceder'],
        relatedViolations: ['C3']
    },
    {
        number: 6,
        classification: 'technical',
        title: 'Indicações visuais e auditivas',
        text: 'Indicador de andar visível no interior da cabina e no exterior em cada patamar: contraste ≥60% com fundo. Caracteres mínimos 40mm altura na cabina. Sinalização auditiva: anúncio vocal do piso de chegada + sinal sonoro de abertura de porta. Volume ajustável: 40-70 dB(A). Sinalização de sobrecarga: visual + auditiva. Indicação de sentido de movimento (para cima/para baixo): visual na botoneira ou painel. Iluminação mínima da cabina: ≥100 lux ao nível do piso.',
        keywords: ['indicador andar', '40mm', 'voz', 'auditivo', '100 lux', 'sobrecarga', 'sinal sonoro'],
        relatedViolations: ['C3']
    },
    {
        number: 7,
        classification: 'technical',
        title: 'Nivelação — Precisão no patamar',
        text: 'Nivelação de parada: ≤±10mm entre piso da cabina e piso do patamar (conforme NP EN 81-20). Para ascensores acessíveis: recomendado ≤±5mm para facilitar passagem de cadeiras de rodas. Nivelação automática com passageiros (re-nivelagem): obrigatória para Tipo 2. Bordo de soleira: chanfrado ou arredondado nos primeiros 20mm para reduzir tropeçamento. Largura de soleira: máx. 20mm (para não criar barreira a cadeiras de rodas).',
        keywords: ['nivelação', '±10mm', '±5mm', 're-nivelagem automática', 'soleira', 'cadeira rodas'],
        relatedViolations: ['C2']
    },
    {
        number: 8,
        classification: 'technical',
        title: 'Sistema de alarme de emergência — Acessibilidade',
        text: 'Botão de alarme: ≤900mm do piso, cor amarela, símbolo de sino, identificado com Braille "ALARME". Comunicação bidirecional de emergência (EN 81-28): o utilizador deve conseguir comunicar mesmo sem energia de rede. Receptor externo: deve funcionar 24h/7 dias. Sistema de intercom: volume mínimo 65 dB(A) na cabina. O alarme deve funcionar sem que o utilizador segure um botão continuamente. Bateria de emergência autónoma: mínimo 1 hora de chamadas.',
        keywords: ['alarme', '900mm', 'bidirecional', 'EN 81-28', 'Braille', 'bateria 1 hora'],
        relatedViolations: ['C1', 'C2']
    },
    {
        number: 9,
        classification: 'technical',
        title: 'Patamar de embarque — Espaço livre mínimo',
        text: 'Espaço livre frente à porta no patamar: Tipo 2: mínimo 1500mm × 1500mm para manobra de cadeira de rodas. Tipo 1: mínimo 1500mm profundidade. Iluminação no patamar, frente à porta: mínimo 100 lux. Contraste visual do bordo da porta vs parede: ≥30% para visibilidade de deficientes visuais. Sinalização tátil no piso do patamar: lista de pontos Braille (recomendada norma ISO 23599 para encaminhamento).',
        keywords: ['espaço patamar', '1500mm', 'manobra cadeira rodas', 'iluminação 100 lux', 'contraste'],
        relatedViolations: ['C3']
    },
    {
        number: 10,
        classification: 'info',
        title: 'Aplicação em edifícios existentes — DL 163/2006',
        text: 'Em edifícios novos (pós DL 163/2006): obrigatório pelo menos um elevador Tipo 2 por cada grupo de elevadores. Em edifícios existentes com renovação: obrigatório cumprir Tipo 1 no mínimo. Excepção: caixas existentes muito pequenas — fiscalização/DGEG pode autorizar solução alternativa (por ex.: cadeira elevadeira em escada). Certificação de acessibilidade: o técnico responsável deve declarar conformidade com EN 81-70 na documentação de licenciamento.',
        keywords: ['edifícios novos', 'DL 163/2006', 'renovação', 'exceção caixa pequena', 'declaração conformidade'],
        relatedViolations: []
    }
]);

// ─────────────────────────────────────────────────────────────
// NP EN 81-71:2022 — Resistência ao vandalismo
// ─────────────────────────────────────────────────────────────
setArticles('NP_EN_81_71_2022', [
    {
        number: 1,
        classification: 'info',
        title: 'Âmbito — Categorias de vandalismo VR1, VR2, VR3',
        text: 'Define três categorias de resistência: VR1 (vandalismo ligeiro — edifícios residenciais), VR2 (vandalismo médio — estações, hospitais, escolas), VR3 (vandalismo severo — locais de risco elevado). A escolha da categoria é decisão do projectista/dono de obra. Para cada categoria define requisitos mínimos de: resistência de painéis de cabina, protecção de botões, vidros, materiais.',
        keywords: ['vandalismo', 'VR1', 'VR2', 'VR3', 'categorias', 'resistência'],
        relatedViolations: []
    },
    {
        number: 2,
        classification: 'technical',
        title: 'Painéis de cabina — Resistência mínima',
        text: 'VR1: painéis suportam força de 250N por 30s sem deformação permanente. VR2: 500N por 30s. VR3: 1000N por 30s. Materiais recomendados: aço inoxidável espessura ≥1.5mm (VR1), ≥2mm (VR2), ≥3mm (VR3), ou material equivalente com ensaio de resistência. Anti-graffiti: aplicação de película ou tratamento superficial nas categorias VR2/VR3. Espelhos (se existentes): vidro laminado anti-vandalismo ou película protectora.',
        keywords: ['painéis resistência', '250N', '500N', '1000N', 'inox', 'anti-graffiti'],
        relatedViolations: ['C3']
    },
    {
        number: 3,
        classification: 'technical',
        title: 'Botões e painel de chamada — Protecção anti-vandalismo',
        text: 'VR2/VR3: botões embutidos ou com protecção metálica saliente. Botões fluorescentes ou iluminados com LED encapsulado (resistente a abertura). Painel de chamada de patamar: protegido com tampa de aço (VR3) ou câmara de alumínio resistente. Cabos de sinalização de patamar: internos à parede ou protegidos em calha metálica fechada. Indicadores de piso: LCD de alta resistência ou LED encapsulado, sem elementos salientes partíveis.',
        keywords: ['botões embutidos', 'protecção metálica', 'painel chamada', 'LED encapsulado'],
        relatedViolations: ['C3']
    },
    {
        number: 4,
        classification: 'technical',
        title: 'Portas — Resistência e protecção',
        text: 'Portas de cabina e patamar: resistência à força perpendicular (centro do painel) ≥500N (VR2) ou ≥1000N (VR3) sem permanente deformação. Vidros em portas: se existentes, laminados. Bordas de detecção: listão emborrachado resistente a impacto. Perfis de alumínio: espessura mínima aumentada em VR2/VR3. Fechadura de patamar: resistência à abertura forçada ≥1000N. Dobradiças de porta de cabina (se salientes): protegidas.',
        keywords: ['portas resistência', '500N', '1000N', 'vidro laminado', 'fechadura', 'forçada'],
        relatedViolations: ['C2']
    },
    {
        number: 5,
        classification: 'technical',
        title: 'Iluminação de emergência — Protecção',
        text: 'Luminárias da cabina: protegidas contra impacto (IK08 mínimo para VR2, IK10 para VR3). Impermeáveis à penetração de líquidos: IP44 mínimo para VR3. Para VR3: luminárias com vidro resistente ou em recesso protegido — não devem poder ser retiradas facilmente. Iluminação de patamar: pelo menos IK06 para VR2. Baterias de iluminação de emergência: em invólucro fechado não acessível do interior da cabina.',
        keywords: ['iluminação emergência', 'IK08', 'IK10', 'IP44', 'protecção impacto'],
        relatedViolations: ['C3']
    },
    {
        number: 6,
        classification: 'info',
        title: 'Câmara de videovigilância — Preparação',
        text: 'Para VR2/VR3: a cabina deve ter preparação para câmara de videovigilância (conduta de cabo + suporte de montagem na parte superior da cabina). A câmara em si é uma decisão do gestor do edifício mas a norma define a possibilidade de instalação. Câmara (se instalada): posição protegida, vedada, com visão total do interior da cabina. A conexão de dados deve ser possível sem intervenção na estrutura da cabina.',
        keywords: ['câmara videovigilância', 'CCTV', 'preparação', 'VR2', 'VR3'],
        relatedViolations: []
    }
]);

// ─────────────────────────────────────────────────────────────
// NP EN 81-72:2020 — Elevadores de bombeiros
// ─────────────────────────────────────────────────────────────
setArticles('NP_EN_81_72_2020', [
    {
        number: 1,
        classification: 'info',
        title: 'Âmbito — Requisitos para elevador de bombeiros',
        text: 'Define requisitos para ascensores que funcionam como elevadores de bombeiros. Aplica-se em conjunto com NP EN 81-20. É obrigatório em edifícios com altura de referência de incêndio >18m acima do nível de acesso dos bombeiros (conforme RGEU e RT-SCIE — Portaria 1532/2008). Pode ser um elevador dedicado ou um elevador normal com modo de bombeiros. O DGEG e as autoridades de proteção civil definem os edifícios que exigem este tipo.',
        keywords: ['bombeiros', 'elevador bombeiros', '>18m', 'RT-SCIE', 'Portaria 1532/2008'],
        relatedViolations: []
    },
    {
        number: 2,
        classification: 'technical',
        title: 'Dimensões mínimas da cabina e capacidade',
        text: 'Cabina mínima: 1100mm (largura) × 2100mm (profundidade) — para acomodar maca de emergência horizontal. Carga nominal mínima: 630kg (recomendado 1000kg para maca de evacuação). Porta: passagem livre mínima 800mm. Velocidade mínima: 1m/s (recomendado ≥1.6m/s em edifícios altos). Altura interior mínima da cabina: 2100mm. Nota: alguns projetos definam 1000×2100 como dimensão de maca, mas 1100×2100 é o mínimo normativo.',
        keywords: ['cabina bombeiros', '1100mm', '2100mm', 'maca', '630kg', '1000kg', '1m/s'],
        relatedViolations: ['C2']
    },
    {
        number: 3,
        classification: 'technical',
        title: 'Alimentação elétrica de emergência',
        text: 'Fonte de alimentação dedicada: circuito independente a partir do quadro geral, resistente ao fogo (cabos RF90 ou equivalente). Gerador de emergência ou UPS: deve entrar em serviço em ≤60 segundos. O elevador de bombeiros deve funcionar mesmo com falha de energia geral. Selecção automática de alimentação de emergência. Cabos de alimentação: traçado protegido separado dos outros elevadores, sem percurso comum por zonas de incêndio não protegidas.',
        keywords: ['alimentação emergência', 'RF90', 'gerador', 'UPS', '60 segundos', 'cabos resistentes fogo'],
        relatedViolations: ['C1', 'C2']
    },
    {
        number: 4,
        classification: 'technical',
        title: 'Caixa do elevador — Resistência ao fogo',
        text: 'Paredes da caixa: resistência ao fogo E 120 (2 horas) ou superior. Portas de patamar: classificação E 90 ou EI 90 (fogo e isolamento). Fundo de poço: impermeável à água (evitar acumulação de água de extinção). Caixa pressurizada ou protegida contra fumo: recomendado para edifícios altos. Vedação de penetrações da caixa: materiais de resistência ao fogo equivalente à caixa. Drenagem no fundo do poço: obrigatória para evacuar água dos sistemas sprinkler.',
        keywords: ['resistência fogo', 'E 120', 'EI 90', 'fundo poço', 'impermeável', 'drenagem'],
        relatedViolations: ['C1']
    },
    {
        number: 5,
        classification: 'technical',
        title: 'Chave de bombeiros — Fases 1 e 2 de operação',
        text: 'FASE 1 (chamada automática ao piso de evacuação): activada pelo sinal de alarme de incêndio → o elevador interrompe qualquer viagem, ignora chamadas de patamar, desce ao piso de evacuação dos bombeiros, abre a porta e fica bloqueado (fora de serviço normal). FASE 2 (controlo manual pelos bombeiros): chave de bombeiros no interior da cabina → os bombeiros controlam o elevador manualmente, as portas NÃO fecham automaticamente (requerem pressão contínua do botão). Chave de bombeiros no patamar de acesso: permite activar/desactivar Fase 2 do exterior. Indicação luminosa verde = pronto para bombeiros.',
        keywords: ['Fase 1', 'Fase 2', 'chave bombeiros', 'alarme incêndio', 'piso evacuação', 'controlo manual'],
        relatedViolations: ['C1', 'C2']
    },
    {
        number: 6,
        classification: 'technical',
        title: 'Comunicação e sinalização específica',
        text: 'Telefone de serviço de bombeiros: na cabina e junto à chave de bombeiros em cada patamar (ou intercomunicador). Identificação exterior: símbolo de bombeiros (capacete vermelho com chamas brancas) em cada patamar e junto à botoeira da chave. Iluminação de emergência autónoma na cabina: mínimo 5 lux ao nível do piso durante ≥1 hora sem rede. Indicador de piso na cabina e no patamar de acesso. Sinalização de "Elevador de Bombeiros" na casa das máquinas.',
        keywords: ['telefone bombeiros', 'símbolo bombeiros', 'iluminação emergência 1 hora', 'identificação'],
        relatedViolations: ['C2', 'C3']
    }
]);

// ─────────────────────────────────────────────────────────────
// NP EN 81-73:2020 — Comportamento em caso de incêndio
// ─────────────────────────────────────────────────────────────
setArticles('NP_EN_81_73_2020', [
    {
        number: 1,
        classification: 'info',
        title: 'Âmbito — Evacuação automática em caso de incêndio',
        text: 'Define o comportamento que todos os elevadores de passageiros devem ter quando o sistema de detecção de incêndio do edifício emite alarme. A norma aplica-se a ascensores novos (pós NP EN 81-20) e é altamente recomendada para modernizações. O objectivo é evitar que ocupantes fiquem presos em elevadores durante incêndio e impedir que o elevador transporte passageiros para pisos em chamas. Não substitui o NP EN 81-72 (elevadores de bombeiros dedicados).',
        keywords: ['incêndio', 'evacuação', 'alarme incêndio', 'comportamento', 'NP EN 81-20'],
        relatedViolations: []
    },
    {
        number: 2,
        classification: 'technical',
        title: 'Fase 1 — Recall automático ao piso de evacuação',
        text: 'Quando o sinal de alarme de incêndio é recebido: 1) O elevador interrompe a viagem em curso no próximo patamar disponível; 2) As portas abrem e ficam abertas; 3) O elevador desce (ou sobe, se já acima do piso de evacuação) ao PISO DE EVACUAÇÃO designado; 4) No piso de evacuação: porta abre e fica aberta; 5) O elevador fica FORA DE SERVIÇO (não responde a chamadas normais) com painel de visualização "FOGO" ou símbolo equivalente. Piso de evacuação: geralmente o piso de saída do edifício (rés-do-chão) ou piso definido no plano de emergência.',
        keywords: ['Fase 1', 'recall', 'piso evacuação', 'porta abre', 'FOGO', 'fora de serviço'],
        relatedViolations: ['C1', 'C2']
    },
    {
        number: 3,
        classification: 'technical',
        title: 'Sinal de alarme de incêndio — Interface com sistema de detecção',
        text: 'O elevador deve receber o sinal de alarme de incêndio do sistema de detecção e alarme (SADI) do edifício. Interface: contacto seco (relé) normalizado — sinal de activação quando fecho do contacto. Tensão do sinal: tipicamente 24V DC (especificado em projecto). Tempo de resposta do elevador ao receber o sinal: ≤30 segundos para início de Fase 1. O sinal de incêndio deve ser por zona (pode haver diferentes pisos de evacuação conforme o piso em chamas) ou geral (um único piso de evacuação). Teste anual do interface SADI-elevador obrigatório.',
        keywords: ['SADI', 'sinal incêndio', 'contacto seco', '24V', '30 segundos', 'teste anual'],
        relatedViolations: ['C2']
    },
    {
        number: 4,
        classification: 'technical',
        title: 'Indicação visual e acústica de emergência de incêndio',
        text: 'Botoeira de patamar: deve mostrar indicação visual de "elevador fora de serviço" ou símbolo de chamas quando em Fase 1. Interior da cabina (durante Fase 1): anúncio auditivo "atenção, incêndio, dirija-se ao piso de saída" ou equivalente (em português). Cancelar anúncios auditivos normais (pisos, etc.) durante Fase 1. As botoneiras de chamada dos pisos não devem funcionar durante Fase 1. Anulação da Fase 1: apenas por chave de acesso ou intervenção dos bombeiros.',
        keywords: ['indicação visual fogo', 'anúncio incêndio', 'botoneiras bloqueadas', 'Fase 1 activa'],
        relatedViolations: ['C2', 'C3']
    },
    {
        number: 5,
        classification: 'info',
        title: 'Reinício após Fase 1 — Procedimento de retorno ao serviço',
        text: 'Após extinção do alarme de incêndio: o elevador NÃO retoma o serviço automaticamente. Retorno ao serviço requer: a) sinal de reset do SADI, E b) reset manual pelo técnico de manutenção ou operador autorizado (chave de serviço ou procedimento específico). Antes do retorno: verificar que não há danos no elevador, caixa ou instalação eléctrica. O técnico EMIE deve verificar o histórico de eventos do controlador e confirmar ausência de falhas. Em edifícios com elevadores de bombeiros (EN 81-72): estes são operados pela equipa de bombeiros e não entram em Fase 1 normal.',
        keywords: ['retorno serviço', 'reset manual', 'chave serviço', 'verificação EMIE', 'após incêndio'],
        relatedViolations: ['C2']
    }
]);

// ─────────────────────────────────────────────────────────────
// NP EN 81-77:2020 — Elevadores com percurso inclinado
// ─────────────────────────────────────────────────────────────
setArticles('NP_EN_81_77_2020', [
    {
        number: 1,
        classification: 'info',
        title: 'Âmbito — Elevadores inclinados (Funiculares de caixa)',
        text: 'Esta norma aplica-se a elevadores cujo percurso não é vertical, i.e., a caixa está inclinada entre 0° (horizontal) e 70° em relação à horizontal. Não abrange teleféricos (cabos aéreos) nem ascensores inclinados ao preço de prateleira (inclinação ≤6°). Aplica-se em zonas costeiras, terrenos montanhosos e jardins com grandes desníveis. Em Portugal: instalações em Sintra, Serra da Estrela e em edifícios históricos com escadas inclinadas.',
        keywords: ['inclinado', '0° a 70°', 'funicular', 'montanha', 'percurso inclinado'],
        relatedViolations: []
    },
    {
        number: 2,
        classification: 'technical',
        title: 'Guias inclinadas — Requisitos e tolerâncias',
        text: 'Perfil de guia: tipo T ou equivalente, calculado para as forças resultantes da inclinação. Alinhamento: desvio máximo lateral ±1mm/m. Emendas: sem ressaltos >0.5mm. Suportes: espaçamento calculado para a carga efectiva incluindo aceleração de emergência do pára-quedas. Lubrificação das guias: por sistema automático ou manual com frequência definida no plano de manutenção. Limpeza das guias (remoção de folhas/detritos em percursos exteriores): incluída nas visitas mensais da EMIE.',
        keywords: ['guias inclinadas', '±1mm/m', 'suportes', 'lubrificação', 'percurso exterior'],
        relatedViolations: ['C2', 'C3']
    },
    {
        number: 3,
        classification: 'technical',
        title: 'Pára-quedas e limitador de velocidade — Adaptação ao percurso inclinado',
        text: 'O sistema pára-quedas deve ser adaptado ao percurso inclinado: para inclinações <15°, o pára-quedas actua nas guias normalmente; para ≥15°, sistemas especiais de frenagem lateral. Velocidade de actuação do limitador: calculada para a componente do percurso (não apenas a vertical). Em percursos exteriores: protecção contra gelo e humidade nos mecanismos de segurança. Ensaio de funcionamento do pára-quedas: realizado a cada 5 anos (igual a ascensores verticais) com cabina vazia.',
        keywords: ['pára-quedas inclinado', 'limitador velocidade', '15°', 'gelo', 'humidade', 'ensaio 5 anos'],
        relatedViolations: ['C1', 'C2']
    },
    {
        number: 4,
        classification: 'technical',
        title: 'Proteção climática — Percursos ao ar livre',
        text: 'Para percursos exteriores (ao ar livre): protecção contra chuva nos aparelhos de comando e painel de botoneiras (IP 55 mínimo). Cabina fechada (com vidros): condensação — ventilação adequada para evitar embaciamento. Guias: material resistente à corrosão (inox ou galvanizado) ou manutenção mais frequente. Roldanas e cabos: vedadores contra humidade/gelo em zonas com temperaturas negativas. Fundações: drenagem adequada para evitar deslizamento de terras sob as guias exteriores.',
        keywords: ['proteção climática', 'exterior', 'IP 55', 'corrosão', 'gelo', 'drenagem'],
        relatedViolations: ['C2', 'C3']
    },
    {
        number: 5,
        classification: 'technical',
        title: 'Segurança em caso de bloqueio no percurso inclinado',
        text: 'Em percurso inclinado: risco de cabina presa a meio do percurso sem patamar de saída imediato. Obrigatório: sistema de comunicação de emergência bidirecional (EN 81-28) activo durante toda a viagem. Procedimento de evacuação: escadas de emergência paralelas ao percurso obrigatórias se trajectória >30m sem patamar intermédio. Manobra de socorro: possibilidade de deslocar a cabina manualmente ao patamar mais próximo por intervenção técnica. Iluminação de emergência na cabina: mínimo 5 lux durante ≥1 hora sem rede.',
        keywords: ['bloqueio percurso', 'evacuação', 'escadas emergência', 'comunicação', 'manobra socorro'],
        relatedViolations: ['C1', 'C2']
    }
]);

// ─────────────────────────────────────────────────────────────
// DL 103/2008 — Diretiva Máquinas 2006/42/CE
// ─────────────────────────────────────────────────────────────
setArticles('DL_103_2008', [
    {
        number: 1,
        classification: 'info',
        title: 'Âmbito — O que abrange o DL 103/2008',
        text: 'Transpõe a Directiva 2006/42/CE (Directiva Máquinas). ÂMBITO: aplica-se a monta-cargas com carga nominal >10kg, escadas mecânicas, tapetes rolantes, e acessórios de elevação. NÃO SE APLICA a ascensores de passageiros (estes são regulados pelo DL 295/98 e DL 58/2017). Em elevadores: aplica-se aos componentes de maquinaria (motores, grupos de tracção, variadores de velocidade) que são instalados como "máquinas" em ascensores.',
        keywords: ['maquinas', 'monta-cargas', 'escadas mecânicas', 'acessórios elevação', 'DL 295/98'],
        relatedViolations: []
    },
    {
        number: 2,
        classification: 'technical',
        title: 'Marcação CE — Declaração de Incorporação',
        text: 'Toda a maquinaria abrangida deve ter marcação CE + declaração de conformidade CE antes de ser colocada no mercado. Para "quase-máquinas" (como motores de ascensores sem toda a maquinaria de segurança) aplica-se "Declaração de Incorporação" (não marcação CE completa) — o fabricante do sistema final (ascensor) é responsável pela conformidade total. Registo electrónico das marcações CE: disponível no RAPEX (sistema europeu de alerta). Colocação da marcação CE em local visível, indelével.',
        keywords: ['marcação CE', 'declaração conformidade', 'declaração incorporação', 'quase-máquinas', 'RAPEX'],
        relatedViolations: ['C2']
    },
    {
        number: 3,
        classification: 'technical',
        title: 'Requisitos de segurança essenciais — Para componentes de ascensores',
        text: 'Componentes de maquinaria em ascensores (motores, variadores, freios) devem: 1) Resistir às forças mecânicas previstas sem deformação perigosa; 2) Dissipar o calor gerado sem risco de incêndio ou sobreaquecimento de outros componentes; 3) Circuitos de segurança manter-se funcionais em caso de falha simples; 4) Proteção IP adequada para o ambiente de instalação (casa de máquinas: mínimo IP 44); 5) Manual técnico em língua portuguesa deve acompanhar o equipamento.',
        keywords: ['requisitos segurança', 'motor', 'variador', 'freio', 'IP 44', 'manual português'],
        relatedViolations: ['C2', 'C3']
    },
    {
        number: 4,
        classification: 'technical',
        title: 'Escadas mecânicas e tapetes rolantes — Requisitos específicos',
        text: 'Velocidade máxima: 0.75m/s (escadas mecânicas), 0.90m/s (tapetes horizontais). Inclinação máxima de escada mecânica: 30° (até 35° se altura ≤6m e degrau ≤1000mm). Dispositivos de paragem: botões de emergência visíveis em cima e em baixo (vermelho). Pentes de entrada e saída: dentes intermesham com degraus (proteção anti-entalamento). Escovas laterais: reduzem risco de entalamento de pé calçado. Velocidade de imersão da pente: ≤0.3m/s.',
        keywords: ['escadas mecânicas', 'tapetes rolantes', '0.75m/s', '30°', 'pentes', 'escovas'],
        relatedViolations: ['C1', 'C2']
    },
    {
        number: 5,
        classification: 'technical',
        title: 'Monta-cargas >10kg — Requisitos específicos',
        text: 'Monta-cargas com carga nominal >10kg e ≤300kg: aplicam-se os requisitos da Directiva Máquinas (DL 103/2008). Monta-cargas >300kg com plataforma de acesso para pessoas: aplica-se a Directiva Ascensores (DL 58/2017). Monta-cargas para carga apenas: vedação da soleira ≥0.60m para impedir acesso acidental. Dispositivo de limitação de carga: obrigatório para carga nominal >300kg. Encravamento de portas (se existentes): obrigatório. Aviso visível "PROIBIDA A PERMANÊNCIA DE PESSOAS" no interior.',
        keywords: ['monta-cargas', '>10kg', '>300kg', 'soleira 0.60m', 'limitação carga', 'pessoas proibido'],
        relatedViolations: ['C1', 'C2']
    },
    {
        number: 6,
        classification: 'info',
        title: 'Fiscalização — ASAE e DGEG',
        text: 'A fiscalização do DL 103/2008 é da competência da ASAE (Autoridade de Segurança Alimentar e Económica) para colocação no mercado, e da DGEG para instalações. As infracções ao DL 103/2008 são contra-ordenações punidas com coima. A ASAE pode retirar do mercado ou ordenar a paragem de equipamentos sem marcação CE ou com declaração de conformidade incompleta. Para escadas mecânicas: a inspeção periódica é exigida pelo DL 320/2002 (adaptado) com frequência idêntica à de ascensores.',
        keywords: ['ASAE', 'DGEG', 'fiscalização', 'contra-ordenação', 'retirada mercado'],
        relatedViolations: []
    }
]);

// ─────────────────────────────────────────────────────────────
// PORT 348/2013 — Regulamento de Inspeção Periódica
// ─────────────────────────────────────────────────────────────
setArticles('PORT_348_2013', [
    {
        number: 1,
        classification: 'info',
        title: 'Âmbito — Regulamento de Inspeção Periódica Obrigatória',
        text: 'Portaria n.º 348/2013, de 29 de Novembro. Aprova o Regulamento de Inspeção Periódica Obrigatória (RIPO) de ascensores, monta-cargas, escadas mecânicas e tapetes rolantes. Complementa o DL 320/2002. A inspeção periódica é realizada por uma EIIE (Entidade Inspetora de Instalações de Elevadores) acreditada. A portaria define: periodicidade, metodologia, critérios de classificação de anomalias, conteúdo do relatório e obrigações de reporte ao DGEG.',
        keywords: ['RIPO', 'inspeção periódica', 'EIIE', 'periodicidade', 'relatório', 'DL 320/2002'],
        relatedViolations: []
    },
    {
        number: 2,
        classification: 'technical',
        title: 'Periodicidade das inspeções — Tabela por tipo',
        text: 'Frequência de inspeção periódica obrigatória: a) Ascensores residenciais (≤4 pisos, área habitual): 2 anos. b) Ascensores residenciais (>4 pisos ou com uso público): 2 anos. c) Ascensores em locais públicos (estações, hospitais, centros comerciais): 2 anos. d) Ascensores de serviço (monta-cargas, plataformas): 4 anos. e) Escadas mecânicas e tapetes rolantes em espaços públicos: 2 anos. Nota: a câmara municipal pode reduzir o intervalo se detectar incumprimento repetido.',
        keywords: ['periodicidade', '2 anos', '4 anos', 'residencial', 'público', 'câmara municipal'],
        relatedViolations: ['C2']
    },
    {
        number: 3,
        classification: 'technical',
        title: 'Classificação de anomalias — C1, C2, C3',
        text: 'C1 — PROIBIÇÃO DE FUNCIONAMENTO IMEDIATA: anomalias que representam perigo imediato para a segurança das pessoas. O elevador é imobilizado no acto da inspeção pela EIIE. Exemplos: encravamento de porta inoperante, para-quedas defeituoso, cabos com >10% fios partidos, ausência de proteções eléctricas críticas. C2 — PRAZO DE 30 DIAS para correção (contados da data do relatório de inspeção). Exemplos: nivelação >5cm, alarme inoperante, botão Stop ausente, ausência de identificação EMIE. C3 — PRAZO DE 90 DIAS. Exemplos: iluminação insuficiente, avisos ilegíveis, livro de conservação desactualizado.',
        keywords: ['C1', 'C2', 'C3', 'proibição', '30 dias', '90 dias', 'anomalias', 'classificação'],
        relatedViolations: ['C1', 'C2', 'C3']
    },
    {
        number: 4,
        classification: 'technical',
        title: 'Relatório de inspeção — Conteúdo obrigatório',
        text: 'O relatório de inspeção deve conter obrigatoriamente: a) Identificação do imóvel e do elevador (morada, número de registo, tipo, fabricante, ano); b) Identificação da EIIE e do inspector; c) Data da inspeção; d) Lista de todas as anomalias detectadas classificadas em C1/C2/C3 com artigo regulamentar correspondente; e) Resultado da inspeção: APROVADO (sem C1 ou C2) ou REPROVADO (com C1 ou C2); f) Prazo para re-inspeção se reprovado; g) Assinaturas do inspector e do representante da EMIE. Formato: digital (submissão ao DGEG) + papel (entregue ao proprietário).',
        keywords: ['relatório inspeção', 'aprovado', 'reprovado', 'conteúdo', 'DGEG', 'submarino digital'],
        relatedViolations: ['C2']
    },
    {
        number: 5,
        classification: 'technical',
        title: 'Procedimento de inspeção — Check list EIIE',
        text: 'A inspeção periódica deve incluir verificação de: máquina de tracção e freio; limitador de velocidade e para-quedas; guias e amortecedores; portas de patamar e cabina (encravamento, dimensões, estado); instalação eléctrica (protecções, quadro); botoneiras e sinalizações; cabina (iluminação, ventilação, avisos); comunicação de emergência; livro de conservação e registos. Cada ponto é verificado com testes funcionais (não apenas visual). A EIIE tem o direito e obrigação de testar o para-quedas a cada 5 anos (ensaio de disparo com carga).',
        keywords: ['check list', 'inspeção', 'testes funcionais', 'para-quedas 5 anos', 'livro conservação'],
        relatedViolations: ['C1', 'C2']
    },
    {
        number: 6,
        classification: 'technical',
        title: 'Consequências e re-inspeção após C1',
        text: 'Após imobilização por C1: a EIIE sela fisicamente o painel de comando ou bloqueia o acesso. O proprietário é notificado por escrito. O elevador NÃO pode voltar ao serviço sem: 1) Correção documentada da C1 pela EMIE; 2) Pedido de re-inspeção à EIIE; 3) Re-inspeção com resultado APROVADO. Colocar o elevador em serviço após imobilização por C1 sem re-inspeção = crime (Art. 291.º Código Penal) e coima ≤44.000€ (DL 320/2002). A câmara municipal é notificada de todos os C1 no prazo de 48h pela EIIE.',
        keywords: ['C1 imobilização', 'selo', 're-inspeção', 'crime', '44.000€', 'câmara municipal 48h'],
        relatedViolations: ['C1']
    },
    {
        number: 7,
        classification: 'info',
        title: 'Registo no DGEG — Sistema SINIME',
        text: 'Cada inspeção realizada deve ser registada no SINIME (Sistema Nacional de Informações de Manutenção de Elevadores) ou sistema equivalente do DGEG. Os dados submetidos incluem: resultado, anomalias, EIIE, inspector, datas. O DGEG mantém estatísticas nacionais de conformidade. Câmaras municipais têm acesso ao SINIME para os elevadores do seu município. A não submissão ao SINIME em 10 dias úteis após inspeção é infracção da EIIE.',
        keywords: ['SINIME', 'DGEG', 'registo', 'câmara municipal', 'estatísticas', '10 dias úteis'],
        relatedViolations: []
    }
]);

// ─────────────────────────────────────────────────────────────
// PORT 185/2013 — Requisitos de acreditação de EIIE
// ─────────────────────────────────────────────────────────────
setArticles('PORT_185_2013', [
    {
        number: 1,
        classification: 'info',
        title: 'Âmbito — Regime de acreditação das EIIE',
        text: 'Portaria n.º 185/2013. Define os requisitos para acreditação e funcionamento das Entidades Inspetoras de Instalações de Elevadores (EIIE). As EIIE são entidades privadas acreditadas pelo IPAC (Instituto Português de Acreditação) por referência à NP EN ISO/IEC 17020 (Requisitos para organismos que realizam inspecções). Só podem realizar inspeções periódicas obrigatórias (PORT 348/2013) as EIIE reconhecidas pelo DGEG.',
        keywords: ['EIIE', 'acreditação', 'IPAC', 'ISO 17020', 'DGEG', 'reconhecimento'],
        relatedViolations: []
    },
    {
        number: 2,
        classification: 'technical',
        title: 'Requisitos dos inspetores — Qualificações mínimas',
        text: 'Os inspetores de elevadores da EIIE devem ter: a) Habilitações académicas mínimas: curso técnico profissional de eletromecânica ou engenharia (licenciatura recomendada); b) Formação específica em elevadores: mínimo 80h de formação técnica certificada (instalação, manutenção, normas EN 81); c) Experiência prática: mínimo 2 anos em manutenção ou inspeção de elevadores; d) Actualização contínua: formação anual ≥24h sobre novas normas e regulamentos. A EIIE é responsável por manter os registos de formação de todos os inspetores.',
        keywords: ['inspector qualificações', '80h formação', '2 anos experiência', '24h/ano', 'EN 81', 'registos formação'],
        relatedViolations: ['C2']
    },
    {
        number: 3,
        classification: 'technical',
        title: 'Independência e imparcialidade da EIIE',
        text: 'A EIIE e os seus inspetores NÃO podem ter qualquer relação comercial ou financeira com a EMIE que mantém o elevador a inspeccionar (requisito NP EN ISO/IEC 17020 — organismo Tipo A). Especificamente proibido: um inspector que tenha feito manutenção num elevador não pode inspeccionar esse mesmo elevador nos 12 meses seguintes. A EIIE não pode ser detida por ou ter participações numa EMIE. Conflitos de interesses devem ser declarados e o inspector impedido de actuar nesse processo.',
        keywords: ['independência', 'imparcialidade', 'EMIE separação', 'Tipo A', '12 meses', 'conflito interesses'],
        relatedViolations: []
    },
    {
        number: 4,
        classification: 'technical',
        title: 'Obrigações de reporte ao DGEG e câmaras municipais',
        text: 'A EIIE deve reportar ao DGEG: a) Lista de todas as inspeções realizadas (mensalmente); b) Todas as imobilizações por C1 (prazo: 48h); c) Situações de risco grave não corrigidas após C1 (imediatamente). Às câmaras municipais: notificação de C1 e C2 dos elevadores no seu município (prazo: 5 dias úteis). Recusa de acesso a um elevador para inspeção: reportar ao DGEG e câmara municipal para acção coerciva. A EIIE archiva todos os relatórios por mínimo 10 anos.',
        keywords: ['reporte DGEG', 'câmara municipal', '48h C1', '10 anos arquivo', 'recusa acesso'],
        relatedViolations: ['C2']
    },
    {
        number: 5,
        classification: 'info',
        title: 'Processo de reconhecimento e renovação pelo DGEG',
        text: 'Pedido de reconhecimento: submissão ao DGEG de certificado de acreditação IPAC + seguro de responsabilidade civil (mínimo 500.000€ por sinistro). Validade do reconhecimento: prazo do certificado IPAC (tipicamente 4 anos). Renovação: submissão antes da expiração da acreditação. Suspensão do reconhecimento pelo DGEG: se EIIE perde acreditação IPAC, pratica infracções graves ou não reporta C1. Lista das EIIE reconhecidas: publicada no site do DGEG.',
        keywords: ['reconhecimento DGEG', 'IPAC', 'seguro 500.000€', '4 anos', 'suspensão', 'lista EIIE'],
        relatedViolations: []
    }
]);

// ─────────────────────────────────────────────────────────────
// NP EN 13015:2003+A1:2009 — Manutenção de ascensores
// ─────────────────────────────────────────────────────────────
setArticles('NP_EN_13015_2003', [
    {
        number: 1,
        classification: 'info',
        title: 'Âmbito — Norma de manutenção de ascensores e escadas mecânicas',
        text: 'NP EN 13015:2003+A1:2009 define os requisitos mínimos para programas de manutenção preventiva de ascensores, monta-cargas, escadas mecânicas e tapetes rolantes. Estabelece: conteúdo obrigatório do plano de manutenção; intervalos máximos entre verificações; documentação e rastreabilidade. É norma harmonizada (mandato da Comissão Europeia) que complementa DL 320/2002. A EMIE deve cumprir esta norma como mínimo.',
        keywords: ['manutenção preventiva', 'plano manutenção', 'intervalos', 'documentação', 'norma harmonizada'],
        relatedViolations: []
    },
    {
        number: 2,
        classification: 'technical',
        title: 'Plano de Manutenção — Conteúdo obrigatório',
        text: 'O plano de manutenção deve ser elaborado com base nos documentos do fabricante e nas normas EN 81 aplicáveis. Deve incluir obrigatoriamente: a) Lista de todos os componentes a verificar com frequência de verificação; b) Procedimento de verificação para cada componente; c) Critérios de aceitação (valores-limite); d) Acções correctivas para cada desvio; e) Referência ao manual do fabricante; f) Competências mínimas exigidas ao técnico. O plano é documento vivo — deve ser actualizado após modificações ao ascensor.',
        keywords: ['plano manutenção', 'componentes', 'frequência', 'critérios aceitação', 'manual fabricante'],
        relatedViolations: ['C2']
    },
    {
        number: 3,
        classification: 'technical',
        title: 'Intervalos máximos de verificação — Componentes críticos',
        text: 'Visita de manutenção: MENSAL (máx.). Verificação visual cabos/cadeias: MENSAL. Verificação funcional encravamento portas: MENSAL. Verificação funcional alarme emergência + comunicação: MENSAL. Ensaio funcional travão e paragem de emergência: SEMESTRAL. Verificação medição isolamento eléctrico: ANUAL. Verificação funcional limitador de velocidade: ANUAL. Lubrificação guias: conforme fabricante (mín. anual). Ensaio do para-quedas (disparo real): a cada 5 ANOS ou 10.000h de operação (o que ocorrer primeiro).',
        keywords: ['mensal', 'semestral', 'anual', '5 anos', 'cabos', 'encravamento', 'para-quedas', 'limitador'],
        relatedViolations: ['C1', 'C2']
    },
    {
        number: 4,
        classification: 'technical',
        title: 'Documentação e rastreabilidade — Livro de conservação',
        text: 'O livro de conservação (ficheiro digital ou em papel) deve conter: a) Dados técnicos do ascensor (fabricante, modelo, ano, carga nominal, velocidade); b) Registo de cada visita de manutenção: data, técnico, trabalhos realizados, anomalias encontradas e acções correctivas; c) Registo de peças substituídas com referência; d) Registos de ensaios periódicos (limitador de velocidade, para-quedas); e) Registo de incidentes/acidentes; f) Cópia dos relatórios de inspeção pela EIIE. Conservado na casa das máquinas e acessível a EMIE, EIIE e DGEG. Prazo mínimo de arquivo: 10 anos.',
        keywords: ['livro conservação', 'rastreabilidade', 'data', 'técnico', 'anomalias', '10 anos'],
        relatedViolations: ['C2', 'C3']
    },
    {
        number: 5,
        classification: 'technical',
        title: 'Competências do técnico de manutenção',
        text: 'O técnico que realiza manutenção deve ter: formação em electromecânica ou electricidade industrial; formação específica em ascensores (mínimo 40h incluindo normas EN 81, riscos em altura, equipamentos de protecção individual); conhecimento do plano de manutenção específico do ascensor em questão. A EMIE é responsável por verificar e documentar as competências de todos os técnicos. Trabalhos em altura (cima da cabina, poço): equipamento de protecção individual obrigatório.',
        keywords: ['competências técnico', '40h formação', 'EN 81', 'trabalhos altura', 'EPI', 'EMIE responsável'],
        relatedViolations: ['C2']
    },
    {
        number: 6,
        classification: 'technical',
        title: 'Resposta a avarias — Tempos e prioridades',
        text: 'C1 (perigo imediato): a EMIE deve deslocar técnico em ≤2 horas e imobilizar o ascensor. C2 (deficiência significativa): prazo de correção ≤30 dias. C3 (deficiência menor): prazo ≤90 dias. Passageiro preso em cabina: EMIE deve ter serviço de resposta 24h/7d com chegada ao local em ≤1 hora em zonas urbanas e ≤2 horas em zonas rurais. Procedimento de libertação de passageiro preso: definido no plano de emergência da EMIE, com comunicação prévia ao passageiro via intercomunicador.',
        keywords: ['avaria', 'passageiro preso', '1 hora', '2 horas', '24h/7d', 'resposta emergência'],
        relatedViolations: ['C1', 'C2']
    },
    {
        number: 7,
        classification: 'technical',
        title: 'Gestão de componentes de segurança — Substituição obrigatória',
        text: 'Componentes de segurança (Art. 1 DL 295/98): encravamento de porta, para-quedas, limitador de velocidade, tampões de fim de curso, amortecedores, dispositivos electro-hidráulicos. Substituição obrigatória por componentes CE conformes (DL 295/98 e/ou DL 58/2017). Não é permitido substituir componentes de segurança por peças sem declaração de conformidade. Prazo de vida útil dos cabos de tração: a EMIE define com base no estado e no manual do fabricante (típico: 10-15 anos). Cabos: substituição quando deterioração superior aos limites de norma (NP EN 81-50).',
        keywords: ['componentes segurança', 'CE', 'DL 295/98', 'cabos vida útil', 'substituição', 'DL 58/2017'],
        relatedViolations: ['C1', 'C2']
    },
    {
        number: 8,
        classification: 'info',
        title: 'Contrato de manutenção — Obrigações legais (DL 320/2002)',
        text: 'O proprietário é **obrigatoriamente** responsável por celebrar contrato de manutenção com uma EMIE autorizada (DL 320/2002 Art. 4.º). O contrato deve cobrir: visitas mensais obrigatórias, correcção de anomalias C1/C2/C3, serviço de emergência 24h, manobra de socorro de passageiros presos. Cópia do contrato deve estar disponível na casa das máquinas. Rescisão do contrato: EMIE deve notificar a câmara municipal e DGEG com 30 dias de antecedência E garantir que nova EMIE assume antes de descontinuar serviço.',
        keywords: ['contrato manutenção', 'obrigatório', 'câmara municipal', 'rescisão 30 dias', 'serviço 24h'],
        relatedViolations: ['C1', 'C2']
    }
]);

// ─────────────────────────────────────────────────────────────
// Save
// ─────────────────────────────────────────────────────────────
db.metadata.last_updated = new Date().toISOString();
let total = 0;
db.regulations.forEach(r => {
    const n = (r.chapters||[]).reduce((a,c)=>a+(c.articles||[]).length,0)+(r.articles||[]).length;
    total += n;
});
db.metadata.total_articles = total;

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
console.log(`\n💾 Saved! Total articles in DB: ${total}`);
