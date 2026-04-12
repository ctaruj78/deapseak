'use strict';
// Migra inspection_points de DEC_REG_13_1980 para schema correto da UI
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/portugal-lift-regulations.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

const newPoints = [
  {
    article: "Art.39.º",
    requirement: "Encravamento mecânico das portas de patamar",
    urgency: "C1",
    deadline: "Imediato",
    client_explanation: "As portas dos patamares devem ter encravamento mecânico que impede abri-las quando a cabina não está presente. Sem este dispositivo, qualquer pessoa pode abrir a porta e cair na caixa de elevação, causando morte ou lesões graves.",
    description: "Testar: tentar abrir porta de patamar com cabina noutro piso — não deve abrir. Verificar que cabina não arranca com qualquer porta de patamar aberta.",
    common_violations: [
      "Porta abre sem cabina presente = C1 imediato",
      "Encravamento mecanicamente danificado = C1",
      "Apenas encravamento elétrico sem mecânico = C2"
    ]
  },
  {
    article: "Art.40.º",
    requirement: "Controlo elétrico de encravamento e fecho de todas as portas",
    urgency: "C1",
    deadline: "Imediato",
    client_explanation: "Para além do encravamento mecânico, os circuitos elétricos devem confirmar que todas as portas estão fechadas e encravadas antes do elevador poder arrancar. Se um contacto elétrico falhar, o elevador pode arrancar com porta aberta.",
    description: "Verificar circuitos elétricos: cada porta tem contacto de fecho E contacto de encravamento ligados em série no circuito de segurança. Testrar bypassar individualmente — o elevador não deve arrancar.",
    common_violations: [
      "Contacto de porta em curto-circuito (bypass) = C1",
      "Cabo partido no circuito de verificação de portas = C2",
      "Contacto oxidado com falha intermitente = C2"
    ]
  },
  {
    article: "Art.39.º n.º2",
    requirement: "Zona de desencravamento: ±30 cm (automáticas) ou ±17 cm (manuais)",
    urgency: "C2",
    deadline: "30 dias",
    client_explanation: "A 'zona de desencravamento' é a distância em que as portas de patamar podem ser abertas do interior da cabina para nivelamento em caso de emergência. Esta zona está limitada por lei para evitar quedas.",
    description: "Medir zona de desencravamento: para portas automáticas ≤ 2×30 cm centrados na soleira, para portas manuais ≤ 2×17 cm. Zona excessiva = risco de queda.",
    common_violations: [
      "Zona de desencravamento excessiva = C2 (em modernização C1)",
      "Dispositivo de desbloqueio ausente = C2"
    ]
  },
  {
    article: "Art.32.º",
    requirement: "Portas de patamar não abrem para o interior da caixa",
    urgency: "C1",
    deadline: "Imediato",
    client_explanation: "As portas dos patamares devem abrir para fora ou lateralmente (dobradiças/corrediças), nunca para dentro da caixa do elevador. Uma porta a abrir para dentro poderia ser arrancada pela cabina em movimento.",
    description: "Verificar dobradiças e mecanismo de abertura: porta deve abrir para fora ou deslizar lateralmente. Com porta fechada, folga deve impedir entrada de dedo Ø10mm na caixa.",
    common_violations: [
      "Porta abre para interior da caixa = C1",
      "Folga entre porta e ombreira >10mm = C2",
      "Dobradiças deterioradas com desvio = C2"
    ]
  },
  {
    article: "Art.24.º",
    requirement: "Dimensões mínimas da casa das máquinas",
    urgency: "C2",
    deadline: "30 dias",
    client_explanation: "A casa das máquinas onde estão o motor e os aparelhos de controlo deve ter dimensões mínimas para que os técnicos possam trabalhar em segurança durante a manutenção.",
    description: "Verificar: altura livre ≥1,80 m; espaço livre à frente dos aparelhos ≥0,75 m; espaço de manobra ≥0,30 m nas zonas de trabalho.",
    common_violations: [
      "Altura < 1,80 m = C2",
      "Acesso obstruído por arrumos/equipamentos = C2",
      "Porta da casa das máquinas não tranca = C2"
    ]
  },
  {
    article: "Art.42.º",
    requirement: "Altura interior da cabina ≥ 2,00 m",
    urgency: "C2",
    deadline: "30 dias",
    client_explanation: "A cabina deve ter pelo menos 2 metros de altura interior para garantir a segurança e conforto dos utilizadores. Uma cabina baixa representa risco de pancada na cabeça.",
    description: "Medir altura interior da cabina em pelo menos 3 pontos (cantos e centro). Valor mínimo em qualquer ponto ≥ 2,00 m.",
    common_violations: [
      "Altura < 2,00 m em elevador existente = C2 (regularizar em modernização)",
      "Teto falso que reduz altura < 2,00 m = C2"
    ]
  },
  {
    article: "Art.63.º",
    requirement: "Sistema de igualizacão de tensão dos cabos de suspensão",
    urgency: "C1",
    deadline: "Imediato",
    client_explanation: "Quando o elevador tem 2 ou mais cabos de suspensão, deve existir um dispositivo que equalize a tensão entre eles e um sensor que deteta elongamento desigual. Cabos com tensões diferentes desgastam-se de forma irregular e podem partir.",
    description: "Verificar dispositivo de equalização de tensão. Se ≥2 cabos: confirmar sensor de alongamento desigual ligado ao circuito de segurança. Verificar desgaste diferencial visível dos cabos.",
    common_violations: [
      "Sensor elongamento desigual defeituoso/ausente = C1",
      "Diferença de tensão entre cabos >10% = C2",
      "Dispositivo equalizador bloqueado/travado = C2"
    ]
  },
  {
    article: "Art.87.º (DR 13/80)",
    requirement: "Proteção elétrica do motor: sobrecarga, falta de fase e curto-circuito",
    urgency: "C2",
    deadline: "30 dias",
    client_explanation: "O motor de tração do elevador deve ter proteção elétrica contra sobrecarga, falta de fase e curto-circuito. Sem estas proteções o motor pode queimar ou causar incêndio.",
    description: "Verificar presença e funcionalidade de: (1) relé térmico de sobrecarga calibrado para corrente nominal do motor, (2) relé de falta de fase, (3) disjuntor de curto-circuito.",
    common_violations: [
      "Relé térmico bypassado ou ausente = C2",
      "Proteção de falta de fase ausente = C2",
      "Disjuntor sobredimensionado (não protege) = C2"
    ]
  },
  {
    article: "Art.93.º",
    requirement: "Botão STOP vermelho acessível na cabina (cabinas sem portas)",
    urgency: "C2",
    deadline: "30 dias",
    client_explanation: "Em cabinas sem portas (monta-cargas ou plataformas), deve existir um botão STOP de cor vermelha, claramente identificado, que pode ser acionado em caso de emergência.",
    description: "Botão vermelho deve estar acima de todos os outros botões de manobra, com designação 'STOP' ou 'PARAR' em letras de pelo menos 10mm, visível e acessível.",
    common_violations: [
      "Botão STOP ausente = C2",
      "Botão não é vermelho ou não está identificado = C3",
      "Botão bloqueado mecanicamente = C2"
    ]
  },
  {
    article: "Art.94.º",
    requirement: "Alarme sonoro funcional com bateria de emergência",
    urgency: "C2",
    deadline: "30 dias",
    client_explanation: "O elevador deve ter um alarme sonoro que funciona mesmo com a corrente cortada (bateria). O alarme deve ser audível na portaria, átrio ou noutro local vigiado para assistência em caso de encarceramento.",
    description: "Testar alarme: pressionar botão de alarme — deve soar em local vigiado (portaria/átrio). Simular corte de energia — alarme deve continuar a funcionar com bateria recarregável.",
    common_violations: [
      "Alarme inaudível no local de receção = C2",
      "Bateria de emergência descarregada/ausente = C2",
      "Alarme não funciona = C1 (risco de encarceramento)"
    ]
  },
  {
    article: "Art.95.º",
    requirement: "Avisos e instruções indeléveis e legíveis na cabina",
    urgency: "C3",
    deadline: "90 dias",
    client_explanation: "A cabina deve ter avisos obrigatórios (carga máxima, número de pessoas, contacto de emergência) com caracteres maiúsculas de pelo menos 10 mm em material durável e cor contrastante.",
    description: "Verificar: (1) placa de carga máxima em kg e n.º de pessoas, (2) instruções de emergência, (3) caracteres ≥10 mm em maiúsculas, (4) cor contrastante com fundo, (5) material durável/indelével.",
    common_violations: [
      "Placa de carga máxima ausente/ilegível = C3",
      "Caracteres < 10 mm = C3",
      "Papel colado (não durável) = C3"
    ]
  },
  {
    article: "Art.102.º",
    requirement: "Placa de identificação do limitador de velocidade",
    urgency: "C3",
    deadline: "90 dias",
    client_explanation: "O limitador de velocidade — dispositivo que acciona o pára-quedas em caso de sobrevelocidade — deve ter uma placa de identificação com as suas características técnicas para verificação em inspeção.",
    description: "Verificar placa no limitador de velocidade com: diâmetro do cabo, tipo de limitador, material do cabo, velocidade de atuação. Dados devem corresponder ao projeto aprovado.",
    common_violations: [
      "Placa ausente ou ilegível = C3",
      "Velocidade de atuação não corresponde aos dados = C2",
      "Limitador sem placa após substituição = C3"
    ]
  },
  {
    article: "Art.103.º",
    requirement: "Identificação dos circuitos no quadro elétrico da casa das máquinas",
    urgency: "C3",
    deadline: "90 dias",
    client_explanation: "Todos os circuitos elétricos do quadro da casa das máquinas devem estar identificados/etiquetados para que em caso de emergência ou manutenção o técnico possa localizar e desligar o circuito correto.",
    description: "Verificar etiquetagem de todos os circuitos no quadro elétrico: disjuntores, contactores, relés e bornes devem ter identificação legível e permanente.",
    common_violations: [
      "Circuitos não identificados = C3",
      "Etiquetas caídas/ilegíveis = C3",
      "Quadro elétrico sem esquema atualizado = C3"
    ]
  },
  {
    article: "Art.111.º (DR 13/80)",
    requirement: "Vedação da caixa em elevadores antigos (anterior a 1980)",
    urgency: "C2",
    deadline: "30 dias",
    client_explanation: "Nos elevadores instalados antes de 1980, a caixa deve ser vedada em toda a sua altura. Caixas abertas ou parcialmente abertas permitem que objetos caiam sobre a cabina ou pessoas, e propagação de fumo em caso de incêndio.",
    description: "Verificar vedação da caixa em toda a altura: paredes sólidas ou rede metálica com fio ≥3mm e malha ≤75×75mm. Rede apenas permitida acima de 2,50m dos patamares.",
    common_violations: [
      "Caixa aberta ou sem vedação = C2 (em antigos pre-1980)",
      "Rede com malha >75×75mm = C2",
      "Fio de rede < 3mm = C2",
      "Rede abaixo de 2,50m do patamar = C2"
    ]
  }
];

const reg = db.regulations.find(r => r.id === 'DEC_REG_13_1980');
reg.inspection_points = newPoints;

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
console.log('✅ DEC_REG_13_1980 — 14 inspection_points migrados para schema correto');
console.log('   Campos aplicados: article, requirement, urgency, deadline, client_explanation, description, common_violations');
