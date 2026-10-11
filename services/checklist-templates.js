// services/checklist-templates.js — Listas de verificação padrão (geradas em PDF por /api/checklists/:slug/pdf)
// Cada secção: { title, items: [texto] }. Referências baseadas no DL 320/2002, EN 81-20/50 e boas práticas de manutenção.

const CHECKLISTS = {
  seguranca: {
    title: 'Verificação de segurança',
    subtitle: 'Sistemas de segurança do elevador',
    sections: [
      { title: 'Circuito de segurança', items: [
        'Contactos de bloqueio das portas de patamar funcionam (testar vários pisos)',
        'Contacto da porta da cabine funciona',
        'Botão de paragem do poço funciona',
        'Botão de paragem / estação de inspeção do tecto da cabine funciona',
        'Fins de curso finais atuam corretamente',
        'Não existem pontes (shunts) nem contactos anulados'
      ] },
      { title: 'Limitador de velocidade e paraquedas', items: [
        'Selo do limitador de velocidade intacto e dentro do prazo de inspeção',
        'Cabo do limitador sem desgaste, bem tensionado',
        'Roldana tensora do limitador livre e com contacto operacional',
        'Paraquedas sem sinais de bloqueio, folgas dentro do especificado'
      ] },
      { title: 'Travão e tração', items: [
        'Travão liberta e atua sem ruído anormal; folga das pastilhas dentro do especificado',
        'Cabos de tração sem fios partidos, corrosão ou deformação',
        'Sem patinagem na roldana de tração'
      ] },
      { title: 'Cabine e poço', items: [
        'Iluminação normal e de emergência a funcionar (autonomia mínima de 1 h)',
        'Alarme e intercomunicador testados',
        'Amortecedores sem fugas nem danos',
        'Poço limpo, sem água, óleo ou detritos; iluminação do poço operacional',
        'Placa de capacidade e sinalética de segurança legíveis'
      ] },
      { title: 'Resgate', items: [
        'Dispositivo de resgate / chave de desencravamento disponível e testado',
        'Instruções de resgate afixadas na casa das máquinas'
      ] }
    ]
  },
  tecnica: {
    title: 'Inspeção técnica',
    subtitle: 'Verificação técnica completa do estado do elevador',
    sections: [
      { title: 'Casa das máquinas / quadro de comando', items: [
        'Temperatura e ventilação adequadas',
        'Quadro limpo; aperto de bornes e ligações verificado',
        'Contactores e relés sem sinais de sobreaquecimento',
        'Variador sem erros ativos; registo de erros consultado',
        'Estado do motor, rolamentos e ruído',
        'Nível e estado do óleo (redutor / central hidráulica, se aplicável)'
      ] },
      { title: 'Cabos, roldanas e guias', items: [
        'Cabos de tração e de compensação em bom estado',
        'Roldanas e polias de desvio sem folgas nem ruído',
        'Guias da cabine e do contrapeso lubrificadas e alinhadas',
        'Patins/roletes de guia sem desgaste excessivo'
      ] },
      { title: 'Cabine', items: [
        'Botoneira e sinalização a funcionar',
        'Nivelamento nas paragens (tolerância ±10 mm)',
        'Piso, paredes e teto sem danos',
        'Operador de porta: velocidade, binário e correia'
      ] },
      { title: 'Portas de patamar', items: [
        'Folgas entre folhas e soleiras dentro do especificado',
        'Patins de porta, guias e soleiras limpos',
        'Cortina/células fotoelétricas a reagir',
        'Fechaduras sem folgas nem desgaste'
      ] },
      { title: 'Poço', items: [
        'Amortecedores e fixações',
        'Cabos e contrapeso: distâncias de segurança',
        'Sem infiltrações, limpeza geral'
      ] },
      { title: 'Ensaio final', items: [
        'Três viagens completas entre pisos extremos',
        'Teste da paragem de emergência e do alarme',
        'Livro de manutenção atualizado'
      ] }
    ]
  },
  anual: {
    title: 'Inspeção anual',
    subtitle: 'Lista de verificação para a inspeção anual planeada',
    sections: [
      { title: 'Documentação', items: [
        'Certificado da última inspeção periódica em vigor e afixado',
        'Livro de manutenção completo e assinado',
        'Contrato de manutenção em vigor',
        'Seguro de responsabilidade civil válido',
        'Registo de comunicações à câmara municipal em dia'
      ] },
      { title: 'Ensaios obrigatórios', items: [
        'Ensaio do limitador de velocidade (velocidade de atuação)',
        'Ensaio do paraquedas / apanha-cargas',
        'Ensaio de carga e de sobrecarga (se aplicável)',
        'Ensaio dos amortecedores',
        'Ensaio de travagem (carga nominal, descida)',
        'Medição de isolamento e verificação da ligação à terra'
      ] },
      { title: 'Verificação de componentes', items: [
        'Substituição/lubrificação de acordo com o plano anual',
        'Estado dos cabos (medição do diâmetro, fios partidos)',
        'Desgaste de guias, patins e roletes',
        'Estado do travão (folgas, desgaste dos revestimentos)',
        'Fixações mecânicas e aperto de parafusos críticos',
        'Operador de porta e fechaduras'
      ] },
      { title: 'Preparação para a entidade inspetora', items: [
        'Não-conformidades anteriores (C1/C2/C3) corrigidas e documentadas',
        'Elevador limpo; poço e casa das máquinas arrumados',
        'Chaves e acessos disponíveis no dia da inspeção',
        'Técnico disponível para acompanhar a inspeção'
      ] }
    ]
  },
  mensal: {
    title: 'Verificação mensal',
    subtitle: 'Manutenção preventiva mensal (DL 320/2002)',
    sections: [
      { title: 'Casa das máquinas', items: [
        'Temperatura ambiente e ventilação',
        'Máquina: ruído, vibração, aquecimento',
        'Travão: funcionamento e folgas',
        'Quadro: fusíveis, contactores e relés',
        'Selo do limitador de velocidade',
        'Nível de óleo (hidráulico / redutor)'
      ] },
      { title: 'Tecto da cabine e poço', items: [
        'Cabos e fixações',
        'Lubrificação de guias',
        'Contacto de paragem do poço e iluminação',
        'Amortecedores e roldana tensora do limitador',
        'Limpeza do poço'
      ] },
      { title: 'Cabine e portas', items: [
        'Botões, sinalização e iluminação de emergência',
        'Alarme e intercomunicador',
        'Operador de porta, correia, patins e soleiras',
        'Células/cortina de segurança',
        'Bloqueio de portas de patamar (amostra rotativa)'
      ] },
      { title: 'Ensaio e registo', items: [
        'Três viagens completas',
        'Paragem de emergência testada',
        'Livro de manutenção preenchido e assinado'
      ] }
    ]
  },
  trimestral: {
    title: 'Verificação trimestral',
    subtitle: 'Manutenção preventiva trimestral (inclui os pontos da verificação mensal)',
    sections: [
      { title: 'Pontos da verificação mensal', items: [
        'Verificação mensal completa efetuada (ver lista mensal)'
      ] },
      { title: 'Mecânica', items: [
        'Folga e desgaste das pastilhas do travão medidos e registados',
        'Lubrificação de cabos, guias e roldanas conforme o plano',
        'Aperto de fixações de guias, consolas e suportes da máquina',
        'Estado e tensão dos cabos de tração; medição do diâmetro',
        'Rolamentos da máquina e roldanas: ruído e folga',
        'Patins/roletes de guia da cabine e do contrapeso'
      ] },
      { title: 'Elétrica', items: [
        'Limpeza interior do quadro de comando',
        'Aperto de bornes e ligações de potência',
        'Verificação de fusíveis, disjuntores e diferenciais',
        'Registo de erros do variador consultado e arquivado',
        'Teste da iluminação de emergência (autonomia)'
      ] },
      { title: 'Portas', items: [
        'Regulação do operador de porta (binário, velocidade)',
        'Lubrificação de roletes e guias de porta',
        'Teste de todas as fechaduras de patamar'
      ] },
      { title: 'Registo', items: [
        'Peças substituídas e anomalias registadas',
        'Livro de manutenção preenchido e assinado'
      ] }
    ]
  },
  preinspecao: {
    title: 'Pré-inspeção',
    subtitle: 'Preparação para a inspeção periódica da entidade inspetora',
    sections: [
      { title: 'Documentação', items: [
        'Certificado da última inspeção e relatório com não-conformidades',
        'Livro de manutenção completo e assinado',
        'Contrato de manutenção e seguro em vigor',
        'Esquemas elétricos e instruções de resgate disponíveis'
      ] },
      { title: 'Não-conformidades anteriores', items: [
        'Todas as não-conformidades C1 corrigidas e documentadas',
        'Todas as não-conformidades C2 corrigidas ou com plano acordado',
        'Não-conformidades C3 avaliadas e registadas'
      ] },
      { title: 'Ensaios prévios', items: [
        'Limitador de velocidade e paraquedas testados',
        'Amortecedores e fins de curso testados',
        'Travão testado em carga',
        'Medição de isolamento e ligação à terra',
        'Iluminação de emergência, alarme e intercomunicador'
      ] },
      { title: 'Estado geral', items: [
        'Casa das máquinas, poço e cabine limpos e arrumados',
        'Sinalética e placas legíveis (capacidade, número de registo, avisos)',
        'Acessos e chaves disponíveis no dia da inspeção'
      ] }
    ]
  },
  reparacao: {
    title: 'Lista de verificação de reparação',
    subtitle: 'Antes, durante e depois de uma intervenção corretiva',
    sections: [
      { title: 'Antes da intervenção', items: [
        'Descrição da avaria recolhida junto do cliente',
        'Histórico de avarias do elevador consultado',
        'Elevador colocado fora de serviço e sinalizado',
        'Confirmado que não há passageiros na cabine',
        'EPI e ferramentas adequadas',
        'Corte e bloqueio de energia (se aplicável) e ausência de tensão verificada'
      ] },
      { title: 'Diagnóstico e reparação', items: [
        'Causa da avaria identificada',
        'Peças substituídas registadas (referência e quantidade)',
        'Parâmetros e ajustes anotados',
        'Segurança não comprometida (sem pontes nem contactos anulados)'
      ] },
      { title: 'Após a intervenção', items: [
        'Proteções e tampas repostas',
        'Cadeados, etiquetas e pontes temporárias retirados',
        'Três viagens completas de ensaio',
        'Portas, alarme e paragem de emergência testados',
        'Cliente informado; relatório e assinatura obtidos',
        'Sinalização de fora de serviço retirada'
      ] }
    ]
  }
};

module.exports = { CHECKLISTS };
