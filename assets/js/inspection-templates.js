/**
 * FestLift – Motor de Templates de Inspeção
 * Gera checklists dinâmicos por tipo de ascensor, tipo de porta e modalidade de visita.
 *
 * driveType:  traction | traction_mrl | hydraulic | goods | platform
 * doorType:   automatic | swing | mixed | gate | patim_movel
 * visitType:  maintenance | quarterly | annual | pre_inspection | emergency | repair
 */

const INSPECTION_TEMPLATES = (() => {

  /* ------------------------------------------------------------------ */
  /* Helpers                                                              */
  /* ------------------------------------------------------------------ */
  function item(id, label, norm, critical = false) {
    return { id, label, norm, critical };
  }

  /* ------------------------------------------------------------------ */
  /* Blocos de itens reutilizáveis                                        */
  /* ------------------------------------------------------------------ */

  // --- Segurança (comuns a todos os tipos) ---
  const SAFETY_COMMON = [
    item('alarme',        'Sistema de alarme bidirecional e comunicação',         'EN 81-28 / EN 81-20 § 5.4.9.4', true),
    item('emergencia-luz','Iluminação de emergência (≥ 5 lux na cabina)',          'EN 81-20 § 5.4.11.2', true),
    item('paragem-final', 'Fins-de-curso de piso superior e inferior',            'EN 81-20 § 5.12.1.3'),
    item('contatos-seg',  'Circuito de segurança — verificação global',           'EN 81-20 § 5.11',       true),
  ];

  const SAFETY_TRACTION = [
    item('para-quedas',   'Limitador de velocidade e para-quedas',               'EN 81-20 § 5.6 / EN 81-1 § 9.8 (antigo)', true),
    item('travao-emerg',  'Travão eletromagnético — folga e desgaste',            'EN 81-20 § 5.9.2.2',    true),
    item('amortecedores', 'Amortecedores do fosso (tipo e estado)',               'EN 81-20 § 5.8'),
    item('contrapeso',    'Contrapeso — fixações e guiamento',                   'EN 81-20 § 5.7'),
  ];

  const SAFETY_HYDRAULIC = [
    item('valv-ruptura',  'Válvula de bloqueio / anti-rotura de tubo',           'EN 81-2 § 12.3',        true),
    item('para-quedas-hid','Para-quedas ou sistema equivalente (≥ 0,3 m/s)',     'EN 81-2 § 12.4',        true),
    item('travao-emerg',  'Dispositivo de retenção em caso de descida indevida', 'EN 81-2 § 12.5',        true),
    item('amortecedores', 'Amortecedores / batentes do fosso',                   'EN 81-2 § 12.7'),
  ];

  // --- Vão e fosso ---
  const PIT_COMMON = [
    item('fosso-limp',    'Limpeza e estado geral do fosso',                     'DL 320/2002 Art. 8.º'),
    item('fosso-agua',    'Ausência de água / humidade no fosso',                'EN 81-20 § 5.2.5'),
    item('ilum-fosso',    'Iluminação do fosso funcional',                       'EN 81-20 § 5.2.6'),
    item('escada-fosso',  'Escada de acesso ao fosso (quando existente)',        'EN 81-20 § 5.2.7'),
  ];

  // --- Cabina ---
  const CABIN_COMMON = [
    item('limp-cabina',   'Limpeza da cabina (paredes, chão, teto)',             'DL 320/2002 Art. 8.º'),
    item('espelho',       'Estado do espelho / painel decorativo',               'DL 163/2006 (acessibilidade)'),
    item('carga-util',    'Placa de carga nominal visível e legível',            'EN 81-20 § 5.4.8'),
    item('botoneira-cab', 'Botoneira de cabina — funcionamento e iluminação',   'EN 81-20 § 5.4.9.1'),
    item('indicador-pos', 'Indicador/display de posição',                       'DL 163/2006'),
  ];

  // --- Portas automáticas ---
  const DOORS_AUTOMATIC = [
    item('operador-motor','Operador de portas — motor, correia/corrente, desgaste', 'EN 81-20 § 5.3.5', true),
    item('fotocelas',     'Fotocélulas de proteção (barreira infravermelha/3D)', 'EN 81-20 § 5.3.5.3', true),
    item('borracha-prot', 'Borracha / barra de proteção da porta de cabina',    'EN 81-20 § 5.3.5.3'),
    item('sincronismo',   'Sincronismo porta de cabina ↔ porta de patamar',     'EN 81-20 § 5.3.3'),
    item('fecho-auto',    'Força de fecho ≤ 150 N / velocidade de fecho',       'EN 81-20 § 5.3.5.2'),
    item('contatos-porta','Contactos elétricos das portas de patamar',          'EN 81-20 § 5.3.9.1', true),
    item('fechaduras-pat','Fechaduras de engate dos patamares',                 'EN 81-20 § 5.3.8',   true),
    item('lub-operador',  'Lubrificação: corrediças e rolamentos do operador',  'Manual fabricante'),
  ];

  // --- Portas batentes / semi-automáticas ---
  const DOORS_SWING = [
    item('fechaduras-pat','Fechaduras mecânicas de patamar — engate e desgaste','EN 81-1 § 7.7 / DL 320/2002', true),
    item('mola-retorno',  'Molas de retorno — tensão e funcionamento',          'EN 81-1 § 7.7.3',   true),
    item('contatos-porta','Contactos elétricos das portas de patamar',          'EN 81-1 § 14.1.2',  true),
    item('vedacao-portas','Vedação das folhas de porta (juntas / batentes)',    'EN 81-1 § 7.1'),
    item('dobradicas',    'Dobradiças das portas de patamar (desgaste/folga)',  'EN 81-1 § 7.7.1'),
    item('fecho-cabina',  'Fecho manual da porta de cabina — operação segura', 'EN 81-1 § 8.7'),
    item('stop-cabina',   'Botão STOP vermelho acessível na cabina',           'DR 13/80 Art. 93.º', true),
    item('lub-fechaduras','Lubrificação das fechaduras e dobradiças',          'Manual fabricante'),
  ];

  // --- Portões de rede / guilhotina (ascensores antigos) ---
  const DOORS_GATE = [
    item('estado-rede',   'Estado geral do portão de rede (deformações, corrosão)', 'DL 348/93 atualizado', true),
    item('fecho-auto-porte','Fecho automático ao início do movimento',           'EN 81-1 § 8.7',      true),
    item('contatos-porta','Contactos elétricos do portão',                      'EN 81-1 § 14.1.2',  true),
    item('stop-cabina',   'Botão STOP vermelho acessível na cabina',            'DR 13/80 Art. 93.º', true),
    item('guias-porte',   'Guias do portão — estado e folga',                   'EN 81-1 § 8.7.2'),
    item('lub-portao',    'Lubrificação das guias e mecanismo do portão',       'Manual fabricante'),
  ];

  // --- Cabina sem portas / patim móvel (legacy PT / modernização parcial) ---
  const DOORS_PATIM_MOVEL = [
    item('patim-estado',      'Patim / soleira móvel — fixação, curso e retorno',            'Portaria 121/2005 Art. 8.º', true),
    item('patim-sensores',    'Dispositivo elétrico nas extremidades do patim móvel',         'Portaria 121/2005 Art. 8.º', true),
    item('stop-sem-portas',   'Botão STOP vermelho acessível na cabina sem portas',           'DR 13/80 Art. 93.º',         true),
    item('alarme-sem-portas', 'Alarme sonoro funcional com bateria de emergência',            'DR 13/80 Art. 94.º',         true),
    item('avisos-sem-portas', 'Avisos e instruções legíveis na cabina',                       'DR 13/80 Art. 95.º'),
    item('mov-manual',        'Instruções para o movimento manual da cabina conformes',       'DR 13/80 Art. 105.º',        true),
  ];

  // --- Mecânica elétrica de tração ---
  const MECH_TRACTION = [
    item('cabos-tracao',  'Cabos de tração — fios partidos, diâmetro, passo',  'EN 81-20 § 5.5.2',   true),
    item('polia-tracao',  'Polia de tração — ranhuras e desgaste',             'EN 81-20 § 5.5.2'),
    item('motor',         'Motor elétrico — temperatura, ruído, vibração',     'EN 81-20 § 5.9.2'),
    item('guias',         'Guias da cabina e do contrapeso — alinhamento',     'EN 81-20 § 5.7.1'),
    item('sapatas',       'Sapatas de guiamento — desgaste',                   'EN 81-20 § 5.4.6'),
    item('lub-cabos',     'Lubrificação dos cabos (tipo e quantidade)',         'EN 81-20 Annex E'),
    item('lub-guias',     'Lubrificação das guias',                            'Manual fabricante'),
  ];

  // --- Motor sem engrenagem (MRL / gearless) ---
  const MECH_MRL = [
    item('cabos-tracao',  'Cabos / correias de tração — fios partidos, desgaste', 'EN 81-20 § 5.5.2', true),
    item('motor-gearless','Motor gearless — temperatura, ruído, vibração',      'EN 81-20 § 5.9.2'),
    item('encoder',       'Encoder / sensor de posição absoluta',              'EN 81-20 § 5.12'),
    item('guias',         'Guias da cabina e do contrapeso — alinhamento',     'EN 81-20 § 5.7.1'),
    item('sapatas',       'Sapatas de guiamento — desgaste',                   'EN 81-20 § 5.4.6'),
    item('lub-guias',     'Lubrificação das guias',                            'Manual fabricante'),
  ];

  // --- Sistema hidráulico ---
  const MECH_HYDRAULIC = [
    item('cilindro',      'Cilindro hidráulico — fugas, corrosão, vedações',   'EN 81-2 § 12.1',    true),
    item('bomba-hidro',   'Grupo motobomba — ruído, temperatura, fugas',       'EN 81-2 § 11.2'),
    item('nivel-oleo',    'Nível de óleo no reservatório hidráulico',          'EN 81-2 § 11.6',    true),
    item('fugas-oleo',    'Ausência de fugas de óleo (piso, conexões, valvas)','EN 81-2 § 11.6',    true),
    item('valvulas',      'Válvula de regulação e anti-retorno',               'EN 81-2 § 12.3'),
    item('mangueiras',    'Mangueiras e tubagens — estado e apertos',          'EN 81-2 § 11.4'),
    item('guias',         'Guias da cabina — alinhamento e desgaste',          'EN 81-20 § 5.7.1'),
    item('sapatas',       'Sapatas de guiamento — desgaste',                   'EN 81-20 § 5.4.6'),
    item('lub-guias',     'Lubrificação das guias',                            'Manual fabricante'),
  ];

  // --- Monta-cargas (bens) ---
  const MECH_GOODS = [
    item('porta-carga',   'Porta de carga / rampa — funcionamento e travamento','EN 81-3 § 9.1',    true),
    item('cap-carga',     'Sinalização de capacidade de carga máxima visível', 'EN 81-3 § 5.4'),
    item('aviso-pessoa',  'Aviso de proibição de transporte de pessoas',       'EN 81-3 § 0.4',    true),
    item('guias',         'Guias — alinhamento e desgaste',                   'EN 81-3 § 11.2'),
    item('cabos-tracao',  'Cabos de tração — fios partidos, diâmetro',        'EN 81-3 § 12.2',   true),
    item('lub-guias',     'Lubrificação das guias',                           'Manual fabricante'),
  ];

  // --- Plataforma elevatória ---
  const MECH_PLATFORM = [
    item('acesso-plataf', 'Entradas/saídas da plataforma — folhas e travas',  'EN 81-41 § 5.3',   true),
    item('rampa-plataf',  'Rampa de acesso — articulações e batentes',        'EN 81-41 § 5.4'),
    item('limite-veloc',  'Dispositivo limitador de velocidade',              'EN 81-41 § 5.7',   true),
    item('guias',         'Guias — alinhamento e desgaste',                   'EN 81-41 § 5.5'),
    item('lub-guias',     'Lubrificação das guias',                           'Manual fabricante'),
  ];

  // --- Quadro elétrico (comum) ---
  const ELECTRICAL_COMMON = [
    item('quadro-elec',   'Quadro elétrico — estado, etiquetagem, proteções', 'EN 81-20 § 5.10'),
    item('variador',      'Variador de frequência — erros, ventilação',       'EN 81-20 § 5.9.3'),
    item('ilum-cabina',   'Iluminação normal da cabina (≥ 50 lux)',           'EN 81-20 § 5.4.11'),
    item('botoneiras-pat','Botoneiras de patamar — funcionamento e fixação',  'EN 81-20 § 5.4.9'),
  ];

  // --- Casa das máquinas ---
  const MACHINE_ROOM = [
    item('acesso-cm',     'Acesso à casa das máquinas — chave e sinalizaçao', 'EN 81-20 § 6.3.1'),
    item('temp-cm',       'Ventilação/temperatura da casa das máquinas',      'EN 81-20 § 6.3.2'),
    item('limp-cm',       'Limpeza da casa das máquinas',                     'DL 320/2002 Art. 8.º'),
    item('lub-redutor',   'Nível de óleo do redutor (se aplicável)',          'Manual fabricante'),
  ];

  // --- Documentação ---
  const DOCUMENTATION = [
    item('livro-rev',     'Livro de revisões / registo de manutenção atualizado','DL 320/2002 Art. 12.º', true),
    item('cert-valid',    'Certificado de conformidade válido (OI)',           'DL 320/2002 Art. 14.º', true),
    item('placa-ident',   'Placa de identificação do ascensor visível',       'EN 81-20 § 5.4.8'),
  ];

  const PATIM_MOVEL_DOCUMENTATION = [
    item('doc-patim-legacy', 'Dossier técnico da modernização / manutenção do patim móvel e STOP de cabina disponível', 'Registo técnico EMIE / solução legacy PT', true),
  ];

  // --- Itens extras para revisão trimestral ---
  const QUARTERLY_EXTRA = [
    item('teste-alarme',  'Teste funcional do alarme de emergência',          'DL 320/2002 Art. 12.º', true),
    item('nivelamento',   'Ensaio de nivelamento (precisão ≤ ±10 mm)',        'EN 81-20 § 5.12.1'),
    item('teste-sobrecarga','Teste de sobrecarga (110 % — verificação travão)','EN 81-20 § 5.9.2.2', true),
  ];

  // --- Itens extras para revisão anual ---
  const ANNUAL_EXTRA = [
    item('ins-cabos',     'Inspeção detalhada dos cabos (contagem de fios partidos)', 'EN 81-20 § 5.5.2', true),
    item('teste-pq',      'Ensaio funcional do para-quedas (progressivo)',    'EN 81-20 § 5.6',     true),
    item('teste-limitador','Ensaio do limitador de velocidade',               'EN 81-20 § 5.6.2',   true),
    item('medicao-isolam','Medição da resistência de isolamento',             'EN 81-20 § 5.10.4'),
    item('folga-fosso',   'Verificação das folgas do fosso (dimensões)',      'EN 81-20 § 5.2.3'),
  ];

  // --- Itens pré-inspeção OI ---
  const PRE_INSPECTION_EXTRA = [
    ...ANNUAL_EXTRA,
    item('doc-tecnica',   'Ficha técnica do ascensor disponível para OI',     'DL 95/2019'),
    item('registo-oi',    'Dossier de registo de inspeções anteriores',       'DL 320/2002 Art. 14.º'),
    item('marcacao-ce',   'Marcação CE / declaração de conformidade',         'DL 373/99'),
    item('plano-emerg',   'Plano de emergência e instrução de resgate',       'EN 81-28'),
  ];

  // ================================================================
  // DL 513/70 (RGAE) — Ascensores ANTIGOS — blocos específicos
  // NÃO usar EN 81-20 aqui: soaleiro móvel, fotocélulas, variador de
  // frequência e encoder NÃO existem nestes equipamentos.
  // ================================================================

  // --- DL 513/70 — Segurança ---
  const DL513_SAFETY = [
    item('pq-513',         'Para-quedas — estado, engrenagem e regulação da atuação',      'DL 513/70 Art. 77.º',   true),
    item('lv-513',         'Limitador de velocidade — calibração, encravamento e desbloqueio', 'DL 513/70 Art. 78.º', true),
    item('travao-513',     'Travão eletromagnético — folga pastilhas/disco, desgaste e ajuste', 'DL 513/70 Art. 57.º', true),
    item('fc-sup-513',     'Fim-de-curso superior — contacto e ajuste mecânico',           'DL 513/70 Art. 90.º',   true),
    item('fc-inf-513',     'Fim-de-curso inferior — contacto e ajuste mecânico',           'DL 513/70 Art. 90.º',   true),
    item('cseg-513',       'Circuito de segurança — relés, contactores e contactos',       'DL 513/70 Art. 88.º',   true),
    item('alarme-513',     'Alarme de emergência (campainha / interfone) — funcional',     'DL 513/70 Art. 83.º',   true),
    item('ilum-emg-513',   'Iluminação de emergência na cabina — funcional',               'DL 320/2002 Art. 8.º'),
    item('amort-513',      'Amortecedores ou batentes do fosso — estado e fixação',        'DL 513/70 Art. 73.º'),
    item('cpeso-pq-513',   'Contrapeso — fixação dos blocos e encravamento do para-quedas', 'DL 513/70 Art. 70.º'),
  ];

  // --- DL 513/70 — Mecânica de tração com redutor (sem MRL, sem variador) ---
  const DL513_MECH = [
    item('oleo-nivel-513', 'Nível de óleo do redutor — quantidade e qualidade visual',    'DL 513/70 / Fab.',      true),
    item('oleo-qual-513',  'Qualidade do óleo do redutor — cor, odor e contaminação',     'Manual fabricante'),
    item('cabos-513',      'Cabos de suspensão — fios partidos, diâmetro e terminações',  'DL 513/70 Art. 66.º',   true),
    item('polia-513',      'Polia de tração / tambor — ranhuras e desgaste',              'DL 513/70 Art. 65.º'),
    item('motor-513',      'Motor elétrico — temperatura, escovas (se CC) e ruído',       'DL 513/70 Art. 56.º'),
    item('acoplam-513',    'Acoplamento motor–redutor — estado e folga',                  'DL 513/70 Art. 57.º'),
    item('guias-513',      'Guias da cabina e contrapeso — alinhamento e fixação',        'DL 513/70 Art. 62.º'),
    item('sapatas-513',    'Sapatas de guiamento — desgaste e pressão de ajuste',         'DL 513/70 Art. 63.º'),
    item('lub-cabos-513',  'Lubrificação dos cabos de suspensão (óleo específico)',        'DL 513/70 Art. 66.º'),
    item('lub-guias-513',  'Lubrificação das guias (graxa adequada)',                     'Manual fabricante'),
    item('lub-polias-513', 'Lubrificação de polias de desvio e mancais',                  'Manual fabricante'),
  ];

  // --- DL 513/70 — Portões de rede / guilhotina ---
  const DL513_DOORS_GATE = [
    item('portao-513',     'Portão de rede / guilhotina — estado geral, deformações e corrosão', 'DL 513/70 Art. 27.º', true),
    item('fecho-portao-513','Mecanismo de fecho automático ao arranque — funcionamento',  'DL 513/70 Art. 28.º',   true),
    item('ct-portao-513',  'Contactos elétricos do portão de cabina e de cada patamar',  'DL 513/70 Art. 88.º',   true),
    item('stop-portao-513','Botão STOP vermelho acessível na cabina',                      'DR 13/80 Art. 93.º',    true),
    item('engate-pat-513', 'Fechos de engate dos patamares — mecanismo e desgaste',      'DL 513/70 Art. 30.º',   true),
    item('guias-portao-513','Guias do portão — estado e folga lateral',                  'DL 513/70 Art. 27.º'),
    item('mola-portao-513','Mola de retorno do portão — tensão e funcionamento',         'DL 513/70 Art. 28.º'),
    item('lub-portao-513', 'Lubrificação das guias e mecanismo do portão',               'Manual fabricante'),
  ];

  // --- DL 513/70 — Portas batentes (quando existem em vez de portões) ---
  const DL513_DOORS_SWING = [
    item('ptbat-513',      'Portas batentes — estado geral, folgas e deformações',        'DL 513/70 Art. 24.º',   true),
    item('fechos-bat-513', 'Fechos mecânicos de patamar — engate e desgaste',             'DL 513/70 Art. 25.º',   true),
    item('ct-bat-513',     'Contactos elétricos das portas de patamar',                   'DL 513/70 Art. 88.º',   true),
    item('mola-bat-513',   'Molas de retorno — tensão e funcionamento',                   'DL 513/70 Art. 24.º'),
    item('dobr-bat-513',   'Dobradiças — desgaste e folga',                               'DL 513/70 Art. 24.º'),
    item('fecho-cab-513',  'Fecho da porta de cabina — operação manual segura',           'DL 513/70 Art. 26.º',   true),
    item('stop-bat-513',   'Botão STOP vermelho acessível na cabina',                     'DR 13/80 Art. 93.º',    true),
    item('lub-bat-513',    'Lubrificação de fechos e dobradiças',                         'Manual fabricante'),
  ];

  // --- DL 513/70 — Cabina sem portas / patim móvel ---
  const DL513_DOORS_PATIM_MOVEL = [
    item('patim-513',         'Patim / soleira móvel — curso, fixação e retorno mecânico',   'DL 513/70 Art. 34.º',   true),
    item('patim-elec-513',    'Dispositivo elétrico do patim móvel nas extremidades',         'Portaria 121/2005 Art. 8.º', true),
    item('stop-513',          'Botão STOP vermelho acima dos restantes comandos',              'DR 13/80 Art. 93.º',    true),
    item('alarme-513-portas', 'Alarme da cabina com acumulador de emergência',                'DR 13/80 Art. 94.º',    true),
    item('avisos-513',        'Avisos / instruções visíveis e indeléveis na cabina',          'DR 13/80 Art. 95.º'),
    item('mov-manual-513',    'Instruções para movimento manual da cabina disponíveis',       'DR 13/80 Art. 105.º',   true),
  ];

  // --- DL 513/70 — Vão e fosso ---
  const DL513_PIT = [
    item('limp-fosso-513', 'Limpeza e estado geral do fosso',                             'DL 320/2002 Art. 8.º'),
    item('agua-fosso-513', 'Ausência de água / humidade no fosso',                        'DL 513/70 Art. 4.º'),
    item('ilum-fosso-513', 'Iluminação do fosso — funcional',                             'DL 513/70 Art. 8.º'),
    item('amort-fosso-513','Amortecedores / batentes do fosso — estado e fixação',        'DL 513/70 Art. 73.º'),
  ];

  // --- DL 513/70 — Cabina (sem soaleiro móvel, sem fotocélulas) ---
  const DL513_CABIN = [
    item('limp-cab-513',   'Limpeza da cabina — paredes, chão e teto',                    'DL 320/2002 Art. 8.º'),
    item('carga-nom-513',  'Placa de carga nominal — visível e legível',                  'DL 513/70 Art. 39.º'),
    item('boton-cab-513',  'Botoneira de cabina — funcionamento e iluminação',            'DL 513/70 Art. 82.º'),
    item('soaleiro-513',   'Soaleiro fixo da cabina — fixação e estado (sem peça móvel)', 'DL 513/70 Art. 34.º'),
    item('ventil-cab-513', 'Ventilação da cabina — abertura(s) funcional(is)',            'DL 513/70 Art. 35.º'),
  ];

  // --- DL 513/70 — Sistemas elétricos (sem variador, sem encoder) ---
  const DL513_ELECTRICAL = [
    item('quadro-513',     'Quadro de manobra — relés, contactores, fusíveis e estado',   'DL 513/70 Art. 85.º'),
    item('transf-seg-513', 'Transformador de segurança — tensão de controlo (50 V / 24 V)', 'DL 513/70 Art. 86.º', true),
    item('aquec-quad-513', 'Ausência de aquecimento anormal no quadro (contactores)',     'DL 513/70 Art. 85.º'),
    item('ilum-cab-513',   'Iluminação da cabina — lâmpadas e funcionamento',             'DL 513/70 Art. 83.º'),
    item('boton-pat-513',  'Botoneiras de patamar — funcionamento e fixação',             'DL 513/70 Art. 82.º'),
  ];

  // --- DL 513/70 — Casa das máquinas (sempre presente neste tipo) ---
  const DL513_MACHINE_ROOM = [
    item('acesso-cm-513',  'Acesso à casa das máquinas — chave e sinalização',            'DL 513/70 Art. 48.º'),
    item('limp-cm-513',    'Limpeza da casa das máquinas',                                'DL 320/2002 Art. 8.º'),
    item('temp-cm-513',    'Ventilação / temperatura adequada',                           'DL 513/70 Art. 49.º'),
    item('extintor-513',   'Extintor de incêndio — presente e dentro da validade',        'DL 513/70 Art. 52.º'),
  ];

  // --- DL 513/70 — Documentação ---
  const DL513_DOCUMENTATION = [
    item('livro-rev-513',  'Livro de revisões atualizado com a presente visita',           'DL 320/2002 Art. 12.º', true),
    item('cert-valid-513', 'Certificado de conformidade / registo OI válido',             'DL 320/2002 Art. 14.º', true),
    item('placa-id-513',   'Placa de identificação do ascensor — visível e legível',      'DL 513/70 Art. 14.º'),
  ];

  // --- DL 513/70 — Extras trimestrais ---
  const DL513_QUARTERLY_EXTRA = [
    item('teste-alarme-513','Teste funcional do alarme de emergência',                    'DL 320/2002 Art. 12.º', true),
    item('nivel-513',       'Ensaio de nivelamento — precisão de paragem',               'DL 513/70 Art. 64.º'),
    item('travao-ajuste-513','Travão — verificação do curso de paragem e ajuste',        'DL 513/70 Art. 57.º',   true),
  ];

  // --- DL 513/70 — Extras anuais ---
  const DL513_ANNUAL_EXTRA = [
    item('ins-cabos-513',  'Inspeção detalhada dos cabos — contagem de fios partidos',    'DL 513/70 Art. 66.º',   true),
    item('ensaio-pq-513',  'Ensaio funcional do para-quedas (atuação à velocidade)',      'DL 513/70 Art. 77.º',   true),
    item('ensaio-lv-513',  'Ensaio do limitador de velocidade — atuação nominal',         'DL 513/70 Art. 78.º',   true),
    item('isolam-513',     'Medição da resistência de isolamento elétrico',               'DL 513/70 Art. 87.º'),
    item('folgas-fosso-513','Verificação das folgas do fosso (altura inferior e superior)','DL 513/70 Art. 7.º'),
    item('oleo-troca-513', 'Mudança de óleo do redutor — se ciclo cumprido',             'Manual fabricante'),
  ];

  // --- DL 513/70 — Preparação para inspeção OI ---
  const DL513_PRE_INSPECTION_EXTRA = [
    ...DL513_QUARTERLY_EXTRA,
    ...DL513_ANNUAL_EXTRA,
    item('ficha-tec-513',  'Ficha técnica do ascensor disponível para o OI',             'DL 95/2019'),
    item('dossier-oi-513', 'Dossier de registo de inspeções anteriores completo',        'DL 320/2002 Art. 14.º'),
    item('resgate-513',    'Instrução de resgate por chave de saída de emergência',       'DL 513/70 Art. 79.º',   true),
  ];

  // ================================================================
  // REPARAÇÃO — itens focados no trabalho de reparação
  // ================================================================

  // Diagnóstico
  const REPAIR_DIAGNOSIS = [
    item('avaria-descrita',   'Avaria / anomalia descrita e registada',                     'DL 320/2002 Art. 12.º', true),
    item('causa-raiz',        'Causa-raiz identificada (mecânica / elétrica / desgaste)',   'EN 81-20 / fabricante'),
    item('historico-cons',    'Histórico de manutenção anterior consultado',                'DL 320/2002 Art. 12.º'),
    item('equip-bloqueado',   'Equipamento mantido bloqueado durante intervenção',          'EN 81-20 § 6.5',        true),
  ];

  // Trabalho realizado
  const REPAIR_WORK = [
    item('comp-subst',        'Componentes substituídos — referências registadas',          'Manual fabricante'),
    item('pecas-originais',   'Peças utilizadas: originais / equivalentes certificadas',    'EN 81-20 / EN 81-50',   true),
    item('torque-apertos',    'Reapertamentos / torques aplicados conforme especificação',  'Manual fabricante'),
    item('limpeza-pos',       'Limpeza da zona de trabalho após intervenção',               'DL 320/2002 Art. 8.º'),
    item('lubrificacao-pos',  'Lubrificação dos componentes intervencionados',              'Manual fabricante'),
  ];

  // Verificação pós-reparação (itens de segurança críticos)
  const REPAIR_SAFETY_CHECK = [
    item('contatos-seg-rep',  'Circuito de segurança — verificação após reparação',         'EN 81-20 § 5.11',       true),
    item('travao-rep',        'Travão / sistema de paragem — funcionamento após reparação', 'EN 81-20 § 5.9.2.2',    true),
    item('portas-rep',        'Portas e fechaduras — correto funcionamento',                'EN 81-20 § 5.3',        true),
    item('alarme-rep',        'Alarme de emergência e comunicação — funcional',             'EN 81-28',              true),
    item('nivelamento-rep',   'Nivelamento nas paragens — precisão ≤ ±10 mm',              'EN 81-20 § 5.12.1'),
    item('marcha-vazio',      'Teste em marcha com cabina vazia (3 ciclos completos)',      'EN 81-20 § 6.5',        true),
    item('marcha-carga',      'Teste em marcha com carga nominal',                         'EN 81-20 § 6.5'),
    item('sem-ruido-anorm',   'Ausência de ruídos ou vibrações anómalas em serviço',       'EN 81-20 § 5.9.2'),
  ];

  // Documentação de reparação
  const REPAIR_DOCUMENTATION = [
    item('ordem-trabalho',    'Ordem de trabalho preenchida com detalhe da reparação',     'DL 320/2002 Art. 12.º', true),
    item('livro-rev-rep',     'Livro de revisões atualizado com registo da reparação',     'DL 320/2002 Art. 12.º', true),
    item('garantia-pecas',    'Garantia das peças substituídas documentada',               'Manual fabricante'),
    item('cliente-inf',       'Proprietário/gestor informado sobre a intervenção',         'DL 320/2002 Art. 7.º'),
    item('equip-liberado',    'Equipamento libertado para serviço normal — assinado',      'DL 320/2002 Art. 12.º', true),
  ];

  // ================================================================
  // INTERVENÇÃO DE EMERGÊNCIA — resgate + diagnóstico + ações
  // ================================================================

  // Situação de emergência
  const EMERGENCY_SITUATION = [
    item('passag-resgatados',  'Passageiros resgatados em segurança (confirmar nº)',        'EN 81-28 / EN 81-20 § 5.4.9.4', true),
    item('lesoes-avaliadas',   'Avaliação de lesões — INEM/emergência contactado se necessário', 'EN 81-28',           true),
    item('hora-ocorrencia',    'Hora e local da ocorrência registados',                     'DL 320/2002 Art. 12.º'),
    item('alarme-atuou',       'Sistema de alarme e comunicação bidirecional atuou',        'EN 81-28',              true),
    item('ilum-emerg-atuou',   'Iluminação de emergência da cabina funcionou',              'EN 81-20 § 5.4.11.2',   true),
  ];

  // Diagnóstico da causa
  const EMERGENCY_DIAGNOSIS = [
    item('causa-emerg',        'Causa da emergência identificada e registada',              'DL 320/2002 Art. 12.º', true),
    item('avaria-elec-mec',    'Origem: elétrica / mecânica / externa (queda de tensão…)', 'EN 81-20'),
    item('contatos-seg-emerg', 'Circuito de segurança — estado e anomalias identificadas', 'EN 81-20 § 5.11',       true),
    item('travao-estado',      'Estado do travão / dispositivo de retenção',               'EN 81-20 § 5.9.2.2',    true),
    item('para-quedas-emerg',  'Para-quedas — verificação de atuação indevida',            'EN 81-20 § 5.6',        true),
    item('portas-emerg',       'Portas e fechaduras — verificação após emergência',        'EN 81-20 § 5.3',        true),
  ];

  // Ações corretivas de emergência
  const EMERGENCY_ACTIONS = [
    item('correcao-realizada',  'Ação corretiva imediata realizada',                       'DL 320/2002 Art. 7.º',  true),
    item('reset-quadro',        'Reset do quadro / falha elétrica corrigida',              'EN 81-20 § 5.10'),
    item('reparacao-temp',      'Reparação temporária efetuada (se aplicável)',            'Manual fabricante'),
    item('componente-subst',    'Componente substituído ou bloqueado preventivamente',     'Manual fabricante',     true),
  ];

  // Estado final após emergência
  const EMERGENCY_FINAL_STATUS = [
    item('ensaio-funcional',   'Ensaio funcional completo após intervenção',               'EN 81-20 § 6.5',        true),
    item('apto-servico',       'Equipamento declarado → APTO para serviço normal',         'DL 320/2002 Art. 12.º', true),
    item('inapto-bloqueado',   'Equipamento declarado → INAPTO e bloqueado (se caso)',     'DL 320/2002 Art. 7.º',  true),
    item('reparacao-futura',   'Reparação definitiva agendada (se reparação temp. feita)', 'DL 320/2002 Art. 12.º'),
    item('follow-up',          'Follow-up / visita de verificação agendada',               'DL 320/2002 Art. 12.º'),
  ];

  // Documentação de emergência
  const EMERGENCY_DOCUMENTATION = [
    item('relatorio-emerg',    'Relatório de emergência preenchido com todos os detalhes', 'DL 320/2002 Art. 12.º', true),
    item('livro-rev-emerg',    'Livro de revisões atualizado com registo da ocorrência',   'DL 320/2002 Art. 12.º', true),
    item('proprietario-inf',   'Proprietário / gestor informado por escrito',              'DL 320/2002 Art. 7.º',  true),
    item('seguradora-inf',     'Seguradora contactada se danos em pessoas ou bens',        'DL 320/2002 Art. 7.º'),
  ];

  /* ------------------------------------------------------------------ */
  /* Função principal: retorna secções para a combinação pedida          */
  /* ------------------------------------------------------------------ */
  function getSections(driveType, doorType, visitType) {
    const isMixedAutomatic = doorType === 'mixed' || doorType === 'mixed_auto';
    const isMixedGate = doorType === 'mixed_gate';
    const isMixedPatim = doorType === 'mixed_patim';

    // ================================================================
    // REPARAÇÃO — checklist focado (NÃO usa o checklist de manutenção)
    // ================================================================
    if (visitType === 'repair') {
      return [
        { id: 'rep-diagnostico',  title: 'Diagnóstico da Avaria',             icon: 'search',          color: 'warning',   items: REPAIR_DIAGNOSIS,      binary: true },
        { id: 'rep-trabalho',     title: 'Trabalho Realizado',                icon: 'tools',           color: 'secondary', items: REPAIR_WORK,           binary: true },
        { id: 'rep-verificacao',  title: 'Verificação Pós-Reparação',         icon: 'check-double',    color: 'danger',    items: REPAIR_SAFETY_CHECK,   binary: true },
        { id: 'rep-documentacao', title: 'Documentação da Reparação',         icon: 'file-signature',  color: 'info',      items: REPAIR_DOCUMENTATION,  binary: true },
      ];
    }

    // ================================================================
    // INTERVENÇÃO DE EMERGÊNCIA — checklist específico
    // ================================================================
    if (visitType === 'emergency') {
      return [
        { id: 'emg-situacao',    title: 'Situação de Emergência / Resgate',  icon: 'exclamation-triangle', color: 'danger',   items: EMERGENCY_SITUATION,      binary: true },
        { id: 'emg-diagnostico', title: 'Diagnóstico da Causa',              icon: 'search-plus',          color: 'warning',  items: EMERGENCY_DIAGNOSIS,      binary: true },
        { id: 'emg-acoes',       title: 'Ações Corretivas',                  icon: 'hammer',               color: 'secondary', items: EMERGENCY_ACTIONS,        binary: true },
        { id: 'emg-estado',      title: 'Estado Final do Equipamento',       icon: 'traffic-light',        color: 'success',  items: EMERGENCY_FINAL_STATUS,   binary: true },
        { id: 'emg-documentacao',title: 'Documentação da Emergência',        icon: 'file-exclamation',     color: 'info',     items: EMERGENCY_DOCUMENTATION,  binary: true },
      ];
    }

    // ================================================================
    // DL 513/70 — Ascensores ANTIGOS (RGAE) — checklist adaptado
    // Sem soaleiro móvel, fotocélulas, variador de frequência ou encoder
    // ================================================================
    if (driveType === 'dl513') {
      const dl513Sections = [];

      dl513Sections.push({
        id: 'seguranca', title: 'Sistemas de Segurança (DL 513/70)',
        icon: 'shield-alt', color: 'danger', items: DL513_SAFETY,
      });

      // Ascensor DL 513/70 — modernização parcial possível (batentes patamar + automática cabina)
      if (isMixedAutomatic) {
        // Caso mais comum: portas de patamar batentes originais + operador automático na cabina
        dl513Sections.push({
          id: 'portas-pat', title: 'Portas de Patamar — Batentes (DL 513/70)',
          icon: 'door-open', color: 'primary', items: DL513_DOORS_SWING,
        });
        dl513Sections.push({
          id: 'portas-cab', title: 'Porta de Cabina — Automática (Modernização)',
          icon: 'sync-alt', color: 'info', items: DOORS_AUTOMATIC,
        });
      } else if (isMixedGate) {
        dl513Sections.push({
          id: 'portas-pat', title: 'Portas de Patamar — Batentes (DL 513/70)',
          icon: 'door-open', color: 'primary', items: DL513_DOORS_SWING,
        });
        dl513Sections.push({
          id: 'portas-cab', title: 'Porta de Cabina — Portões / Guilhotina (DL 513/70)',
          icon: 'grip-lines-vertical', color: 'info', items: DL513_DOORS_GATE,
        });
      } else if (isMixedPatim) {
        dl513Sections.push({
          id: 'portas-pat', title: 'Portas de Patamar — Batentes (DL 513/70)',
          icon: 'door-open', color: 'primary', items: DL513_DOORS_SWING,
        });
        dl513Sections.push({
          id: 'portas-cab', title: 'Cabina sem Portas / Patim Móvel (DL 513/70)',
          icon: 'arrows-alt-h', color: 'info', items: DL513_DOORS_PATIM_MOVEL,
        });
      } else {
        let dl513DoorItems, dl513DoorTitle, dl513DoorIcon;
        if (doorType === 'automatic') {
          dl513DoorItems = DOORS_AUTOMATIC;
          dl513DoorTitle = 'Portas Automáticas (Modernização — DL 513/70)';
          dl513DoorIcon  = 'sync-alt';
        } else if (doorType === 'patim_movel') {
          dl513DoorItems = DL513_DOORS_PATIM_MOVEL;
          dl513DoorTitle = 'Cabina sem Portas / Patim Móvel (DL 513/70)';
          dl513DoorIcon  = 'arrows-alt-h';
        } else if (doorType === 'swing') {
          dl513DoorItems = DL513_DOORS_SWING;
          dl513DoorTitle = 'Portas Batentes (DL 513/70)';
          dl513DoorIcon  = 'door-open';
        } else {
          // gate (padrão RGAE — portões de rede / guilhotina)
          dl513DoorItems = DL513_DOORS_GATE;
          dl513DoorTitle = 'Portões de Rede / Guilhotina (DL 513/70)';
          dl513DoorIcon  = 'grip-lines-vertical';
        }
        dl513Sections.push({
          id: 'portas', title: dl513DoorTitle,
          icon: dl513DoorIcon, color: 'primary', items: dl513DoorItems,
        });
      }

      dl513Sections.push({
        id: 'mecanica', title: 'Mecânica e Lubrificação (DL 513/70)',
        icon: 'cogs', color: 'secondary', items: DL513_MECH,
      });

      dl513Sections.push({
        id: 'fosso', title: 'Vão e Fosso',
        icon: 'layer-group', color: 'dark', items: DL513_PIT,
      });

      dl513Sections.push({
        id: 'cabina', title: 'Cabina',
        icon: 'cube', color: 'info', items: DL513_CABIN,
      });

      dl513Sections.push({
        id: 'eletrica', title: 'Sistemas Elétricos (DL 513/70)',
        icon: 'bolt', color: 'warning', items: DL513_ELECTRICAL,
      });

      dl513Sections.push({
        id: 'cm', title: 'Casa das Máquinas',
        icon: 'warehouse', color: 'secondary', items: DL513_MACHINE_ROOM,
      });

      if (visitType === 'quarterly') {
        dl513Sections.push({
          id: 'trimestral', title: 'Verificações Trimestrais (DL 513/70)',
          icon: 'calendar-check', color: 'success', items: DL513_QUARTERLY_EXTRA,
        });
      }
      if (visitType === 'annual') {
        dl513Sections.push({
          id: 'anual', title: 'Verificações Anuais / Periódicas (DL 513/70)',
          icon: 'star', color: 'success',
          items: [...DL513_QUARTERLY_EXTRA, ...DL513_ANNUAL_EXTRA],
        });
      }
      if (visitType === 'pre_inspection') {
        dl513Sections.push({
          id: 'pre-oi', title: 'Preparação para Inspeção OI (DL 513/70)',
          icon: 'clipboard-check', color: 'success', items: DL513_PRE_INSPECTION_EXTRA,
        });
      }

      dl513Sections.push({
        id: 'documentacao', title: 'Documentação',
        icon: 'file-alt', color: 'info', items: (doorType === 'patim_movel' || doorType === 'mixed_patim') ? [...DL513_DOCUMENTATION, ...PATIM_MOVEL_DOCUMENTATION] : DL513_DOCUMENTATION,
      });

      return dl513Sections;
    }

    // ================================================================
    // MANUTENÇÃO / REVISÃO / PRÉ-INSPEÇÃO — checklist completo
    // ================================================================
    const sections = [];

    // ---- Segurança ----
    const safetyItems = [...SAFETY_COMMON];
    if (driveType === 'hydraulic') {
      safetyItems.push(...SAFETY_HYDRAULIC);
    } else {
      safetyItems.push(...SAFETY_TRACTION);
    }
    sections.push({
      id: 'seguranca',
      title: 'Sistemas de Segurança',
      icon: 'shield-alt',
      color: 'danger',
      items: safetyItems,
    });

    // ---- Portas ----
    if (isMixedAutomatic) {
      // Modernização parcial: portas de patamar batentes + operador automático na cabina
      sections.push({
        id: 'portas-pat',
        title: 'Portas de Patamar — Batentes',
        icon: 'door-open',
        color: 'primary',
        items: DOORS_SWING,
      });
      sections.push({
        id: 'portas-cab',
        title: 'Porta de Cabina — Automática',
        icon: 'sync-alt',
        color: 'info',
        items: DOORS_AUTOMATIC,
      });
    } else if (isMixedGate) {
      sections.push({
        id: 'portas-pat',
        title: 'Portas de Patamar — Batentes',
        icon: 'door-open',
        color: 'primary',
        items: DOORS_SWING,
      });
      sections.push({
        id: 'portas-cab',
        title: 'Porta de Cabina — Portões / Guilhotina',
        icon: 'grip-lines-vertical',
        color: 'info',
        items: DOORS_GATE,
      });
    } else if (isMixedPatim) {
      sections.push({
        id: 'portas-pat',
        title: 'Portas de Patamar — Batentes',
        icon: 'door-open',
        color: 'primary',
        items: DOORS_SWING,
      });
      sections.push({
        id: 'portas-cab',
        title: 'Cabina sem Portas / Patim Móvel',
        icon: 'arrows-alt-h',
        color: 'info',
        items: DOORS_PATIM_MOVEL,
      });
    } else {
      let doorItems;
      if (doorType === 'swing') {
        doorItems = DOORS_SWING;
      } else if (doorType === 'patim_movel') {
        doorItems = DOORS_PATIM_MOVEL;
      } else if (doorType === 'gate') {
        doorItems = DOORS_GATE;
      } else {
        doorItems = DOORS_AUTOMATIC;
      }
      sections.push({
        id: 'portas',
        title: doorType === 'gate' ? 'Portões de Rede / Guilhotina'
             : doorType === 'patim_movel' ? 'Cabina sem Portas / Patim Móvel'
             : doorType === 'swing' ? 'Portas Batentes'
             : 'Portas Automáticas',
        icon: doorType === 'gate' ? 'grip-lines-vertical'
            : doorType === 'patim_movel' ? 'arrows-alt-h'
            : doorType === 'swing' ? 'door-open'
            : 'border-all',
        color: 'primary',
        items: doorItems,
      });
    }

    // ---- Mecânica / Accionamento ----
    let mechItems;
    switch (driveType) {
      case 'hydraulic':  mechItems = MECH_HYDRAULIC; break;
      case 'traction_mrl': mechItems = MECH_MRL;    break;
      case 'goods':      mechItems = MECH_GOODS;    break;
      case 'platform':   mechItems = MECH_PLATFORM; break;
      default:           mechItems = MECH_TRACTION; break;
    }
    sections.push({
      id: 'mecanica',
      title: driveType === 'hydraulic'   ? 'Sistema Hidráulico'
           : driveType === 'traction_mrl'? 'Sistema de Tração (MRL / s/ CM)'
           : driveType === 'goods'       ? 'Mecânica — Monta-cargas'
           : driveType === 'platform'    ? 'Mecânica — Plataforma Elevatória'
           : 'Sistema de Tração',
      icon: driveType === 'hydraulic' ? 'tint' : 'cogs',
      color: 'secondary',
      items: mechItems,
    });

    // ---- Vão / Fosso ----
    sections.push({
      id: 'fosso',
      title: 'Vão e Fosso',
      icon: 'layer-group',
      color: 'dark',
      items: PIT_COMMON,
    });

    // ---- Cabina ----
    sections.push({
      id: 'cabina',
      title: 'Cabina',
      icon: 'cube',
      color: 'info',
      items: CABIN_COMMON,
    });

    // ---- Elétrica ----
    sections.push({
      id: 'eletrica',
      title: 'Sistemas Elétricos',
      icon: 'bolt',
      color: 'warning',
      items: ELECTRICAL_COMMON,
    });

    // ---- Casa das máquinas (apenas se tiver CM) ----
    if (driveType === 'traction') {
      sections.push({
        id: 'cm',
        title: 'Casa das Máquinas',
        icon: 'warehouse',
        color: 'secondary',
        items: MACHINE_ROOM,
      });
    }

    // ---- Extras por tipo de visita ----
    if (visitType === 'quarterly') {
      sections.push({
        id: 'trimestral',
        title: 'Verificações Trimestrais',
        icon: 'calendar-check',
        color: 'success',
        items: QUARTERLY_EXTRA,
      });
    }
    if (visitType === 'annual') {
      sections.push({
        id: 'anual',
        title: 'Verificações Anuais / Periódicas',
        icon: 'star',
        color: 'success',
        items: [...QUARTERLY_EXTRA, ...ANNUAL_EXTRA],
      });
    }
    if (visitType === 'pre_inspection') {
      sections.push({
        id: 'pre-oi',
        title: 'Preparação para Inspeção OI',
        icon: 'clipboard-check',
        color: 'success',
        items: PRE_INSPECTION_EXTRA,
      });
    }

    // ---- Documentação ----
    sections.push({
      id: 'documentacao',
      title: 'Documentação',
      icon: 'file-alt',
      color: 'info',
      items: (doorType === 'patim_movel' || doorType === 'mixed_patim') ? [...DOCUMENTATION, ...PATIM_MOVEL_DOCUMENTATION] : DOCUMENTATION,
    });

    return sections;
  }

  /* ------------------------------------------------------------------ */
  /* Metadados de normas por tipo                                        */
  /* ------------------------------------------------------------------ */
  const NORMS_META = {
    traction: {
      label: 'Elevador Elétrico c/ Casa das Máquinas',
      norms: ['EN 81-1 (antigo) / EN 81-20+50 (novo)', 'DL 320/2002 (alt. DL 176/2024)', 'DL 95/2019'],
      icon: 'building',
      color: 'primary',
    },
    traction_mrl: {
      label: 'Elevador Elétrico MRL (s/ Casa das Máquinas)',
      norms: ['EN 81-20+50', 'DL 320/2002 (alt. DL 176/2024)', 'DL 95/2019'],
      icon: 'microchip',
      color: 'info',
    },
    hydraulic: {
      label: 'Elevador Hidráulico',
      norms: ['EN 81-2', 'DL 320/2002 (alt. DL 176/2024)'],
      icon: 'tint',
      color: 'secondary',
    },
    goods: {
      label: 'Monta-cargas (só bens)',
      norms: ['EN 81-3', 'DL 320/2002 (alt. DL 176/2024)'],
      icon: 'box',
      color: 'warning',
    },
    platform: {
      label: 'Plataforma Elevatória (acessibilidade)',
      norms: ['EN 81-41', 'DL 163/2006'],
      icon: 'wheelchair',
      color: 'success',
    },
    dl513: {
      label: 'Ascensor Elétrico — DL 513/70 (RGAE) — instalação antiga',
      norms: ['DL 513/70 (RGAE)', 'DL 320/2002 (alt. DL 176/2024)', 'EN 81-1 (referência)'],
      icon: 'history',
      color: 'warning',
    },
  };

  const DOOR_META = {
    automatic: {
      label: 'Portas Automáticas',
      icon:  'border-all',
      norm:  'EN 81-20 § 5.3.5',
    },
    swing: {
      label: 'Portas Batentes / Semi-automáticas',
      icon:  'door-open',
      norm:  'EN 81-1 § 7.7',
    },
    gate: {
      label: 'Portões de Rede / Guilhotina',
      icon:  'grip-lines-vertical',
      norm:  'EN 81-1 § 8.7 (instalações antigas)',
    },
    patim_movel: {
      label: 'Cabina sem Portas / Patim Móvel',
      icon:  'arrows-alt-h',
      norm:  'DL 513/70 / DR 13/80 / Portaria 121/2005 Art. 8.º',
      note:  'Exceção legacy PT: pode manter patim móvel + STOP em modernização parcial, desde que a solução esteja documentada e mantida em segurança.',
    },
    mixed: {
      label: 'Misto — Batentes (patamar) + Automática (cabina)',
      icon:  'random',
      norm:  'DL 513/70 / EN 81-20 (modernização parcial)',
    },
    mixed_gate: {
      label: 'Misto — Batentes (patamar) + Portões / Guilhotina (cabina)',
      icon:  'random',
      norm:  'DL 513/70 / EN 81-1 (patamar) / Art. 27.º',
    },
    mixed_patim: {
      label: 'Misto — Batentes (patamar) + Cabina sem portas / Patim móvel',
      icon:  'random',
      norm:  'DL 513/70 / DR 13/80 / Portaria 121/2005',
    },
  };

  const VISIT_META = {
    maintenance: {
      label: 'Manutenção Preventiva Mensal (Obrigatória)',
      icon:  'calendar-alt',
      color: 'primary',
      norm:  'DL 320/2002 Art. 5.º § 1 (atualizado DL 176/2024) — periodicidade mínima mensal obrigatória',
      mandatory: true,
    },
    quarterly: {
      label: 'Revisão Trimestral',
      icon:  'search',
      color: 'info',
      norm:  'DL 320/2002 Art. 12.º',
    },
    annual: {
      label: 'Revisão Anual / Periódica',
      icon:  'star',
      color: 'success',
      norm:  'DL 320/2002 Art. 13.º',
    },
    pre_inspection: {
      label: 'Preparação para Inspeção OI',
      icon:  'clipboard-check',
      color: 'warning',
      norm:  'DL 320/2002 Art. 14.º / DL 95/2019',
    },
    repair: {
      label: 'Reparação',
      icon:  'wrench',
      color: 'secondary',
      norm:  'DL 320/2002 Art. 12.º — registo obrigatório de todas as reparações no livro de revisões',
    },
    emergency: {
      label: 'Intervenção de Emergência',
      icon:  'exclamation-circle',
      color: 'danger',
      norm:  'EN 81-28 / DL 320/2002 Art. 7.º — obrigação de comunicação ao proprietário e registo da ocorrência',
    },
  };

  /* ------------------------------------------------------------------ */
  /* Renderer HTML                                                       */
  /* ------------------------------------------------------------------ */
  function renderChecklist(driveType, doorType, visitType) {
    const sections = getSections(driveType, doorType, visitType);
    let html = '';

    sections.forEach(section => {
      html += `
        <div class="inspection-section mb-4" data-section="${section.id}">
          <div class="section-header d-flex align-items-center py-2 px-3 mb-2"
               style="background:var(--section-bg,#f8f9fa);border-left:4px solid var(--${section.color},#6c757d);border-radius:4px;">
            <i class="fas fa-${section.icon} text-${section.color} mr-2"></i>
            <strong>${section.title}</strong>
            <span class="ml-auto badge badge-secondary">${section.items.length} itens</span>
          </div>
          <div class="section-items">`;

      section.items.forEach(it => {
        const critClass = it.critical ? 'border-left border-danger' : '';
        const critBadge = it.critical ? '<span class="badge badge-danger ml-1" title="Item crítico de segurança">CRIT</span>' : '';
        const selectOptions = section.binary
          ? `<option value="">— ? —</option>
                  <option value="yes">✓ Sim</option>
                  <option value="no">✗ Não</option>
                  <option value="na">N/A</option>`
          : `<option value="">— Estado —</option>
                  <option value="ok">✓ Conforme</option>
                  <option value="warning">⚠ Atenção</option>
                  <option value="error">✗ Não conforme</option>
                  <option value="na">N/A</option>`;
        html += `
            <div class="checklist-item row align-items-center mx-0 py-2 border-bottom ${critClass}" data-item="${it.id}" data-binary="${section.binary ? '1' : '0'}">
              <div class="col-12 col-md-5 d-flex align-items-center">
                ${critBadge}
                <span class="item-label ml-1">${it.label}</span>
              </div>
              <div class="col-12 col-md-3 mt-1 mt-md-0">
                <small class="text-muted item-norm"><i class="fas fa-book fa-xs mr-1"></i>${it.norm}</small>
              </div>
              <div class="col-12 col-md-4 mt-1 mt-md-0 d-flex align-items-center">
                <select class="form-control form-control-sm checklist-status mr-2" style="min-width:100px;">
                  ${selectOptions}
                </select>
                <input type="text" class="form-control form-control-sm checklist-comment" placeholder="Observação…">
              </div>
            </div>`;
      });

      html += `
          </div>
        </div>`;
    });

    return html;
  }

  /* ------------------------------------------------------------------ */
  /* Contador de itens críticos com erro                                 */
  /* ------------------------------------------------------------------ */
  function countCriticalErrors() {
    let count = 0;
    document.querySelectorAll('.checklist-item').forEach(row => {
      const isCrit = row.classList.contains('border-danger');
      const val = row.querySelector('.checklist-status')?.value;
      const isBinary = row.dataset.binary === '1';
      // binary: critical when answered "Não"; standard: critical when "Não conforme"
      if (isCrit && (isBinary ? val === 'no' : val === 'error')) count++;
    });
    return count;
  }

  /* ------------------------------------------------------------------ */
  /* Exportar                                                            */
  /* ------------------------------------------------------------------ */
  return { getSections, renderChecklist, countCriticalErrors, NORMS_META, DOOR_META, VISIT_META };
})();
