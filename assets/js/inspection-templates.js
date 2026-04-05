/**
 * FestLift – Motor de Templates de Inspeção
 * Gera checklists dinâmicos por tipo de ascensor, tipo de porta e modalidade de visita.
 *
 * driveType:  traction | traction_mrl | hydraulic | goods | platform
 * doorType:   automatic | swing | gate
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
    item('lub-fechaduras','Lubrificação das fechaduras e dobradiças',          'Manual fabricante'),
  ];

  // --- Portões de rede / guilhotina (ascensores antigos) ---
  const DOORS_GATE = [
    item('estado-rede',   'Estado geral do portão de rede (deformações, corrosão)', 'DL 348/93 atualizado', true),
    item('fecho-auto-porte','Fecho automático ao início do movimento',           'EN 81-1 § 8.7',      true),
    item('contatos-porta','Contactos elétricos do portão',                      'EN 81-1 § 14.1.2',  true),
    item('guias-porte',   'Guias do portão — estado e folga',                   'EN 81-1 § 8.7.2'),
    item('lub-portao',    'Lubrificação das guias e mecanismo do portão',       'Manual fabricante'),
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

  /* ------------------------------------------------------------------ */
  /* Função principal: retorna secções para a combinação pedida          */
  /* ------------------------------------------------------------------ */
  function getSections(driveType, doorType, visitType) {
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
    let doorItems;
    if (doorType === 'swing') {
      doorItems = DOORS_SWING;
    } else if (doorType === 'gate') {
      doorItems = DOORS_GATE;
    } else {
      doorItems = DOORS_AUTOMATIC;
    }
    sections.push({
      id: 'portas',
      title: doorType === 'gate' ? 'Portões de Rede / Guilhotina'
           : doorType === 'swing' ? 'Portas Batentes'
           : 'Portas Automáticas',
      icon: doorType === 'gate' ? 'grip-lines-vertical'
          : doorType === 'swing' ? 'door-open'
          : 'border-all',
      color: 'primary',
      items: doorItems,
    });

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
      items: DOCUMENTATION,
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
      norm:  'DL 320/2002 Art. 12.º',
    },
    emergency: {
      label: 'Intervenção de Emergência',
      icon:  'exclamation-circle',
      color: 'danger',
      norm:  'EN 81-28',
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
        html += `
            <div class="checklist-item row align-items-center mx-0 py-2 border-bottom ${critClass}" data-item="${it.id}">
              <div class="col-12 col-md-5 d-flex align-items-center">
                ${critBadge}
                <span class="item-label ml-1">${it.label}</span>
              </div>
              <div class="col-12 col-md-3 mt-1 mt-md-0">
                <small class="text-muted item-norm"><i class="fas fa-book fa-xs mr-1"></i>${it.norm}</small>
              </div>
              <div class="col-12 col-md-4 mt-1 mt-md-0 d-flex align-items-center">
                <select class="form-control form-control-sm checklist-status mr-2" style="min-width:110px;">
                  <option value="">— Estado —</option>
                  <option value="ok">✓ Conforme</option>
                  <option value="warning">⚠ Atenção</option>
                  <option value="error">✗ Não conforme</option>
                  <option value="na">N/A</option>
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
      if (isCrit && val === 'error') count++;
    });
    return count;
  }

  /* ------------------------------------------------------------------ */
  /* Exportar                                                            */
  /* ------------------------------------------------------------------ */
  return { getSections, renderChecklist, countCriticalErrors, NORMS_META, DOOR_META, VISIT_META };
})();
