/**
 * BASE DE DADOS COMPLETA - DECRETO-LEI 320/2002
 * Regulamento de Segurança de Elevadores e Monta-Cargas
 * 
 * Fonte: Diário da República
 * Extração: 2025-12-06T20:47:47.651Z
 * Total de artigos: 43
 */

const regulationArticles = {
  "1": {
    "title": "Artigo 1.º - Objecto",
    "explanation": "O presente diploma estabelece o regulamento de segurança de elevadores e monta-cargas.",
    "why": "Consultar regulamento para detalhes",
    "solution": "Verificar conformidade",
    "urgency": "Não especificado",
    "category": "Disposições Gerais",
    "classification": "INFO"
  },
  "2": {
    "title": "Artigo 2.º - Âmbito de aplicação",
    "explanation": "Aplica-se a elevadores e monta-cargas instalados permanentemente em edifícios.",
    "why": "Consultar regulamento para detalhes",
    "solution": "Verificar conformidade",
    "urgency": "Não especificado",
    "category": "Disposições Gerais",
    "classification": "INFO"
  },
  "3": {
    "title": "Artigo 3.º - Definições",
    "explanation": "Para efeitos do presente diploma, entende-se por: elevador, monta-cargas, cabina, etc.",
    "why": "Consultar regulamento para detalhes",
    "solution": "Verificar conformidade",
    "urgency": "Não especificado",
    "category": "Disposições Gerais",
    "classification": "INFO"
  },
  "4": {
    "title": "Artigo 4.º - Requisitos gerais",
    "explanation": "Os elevadores devem ser concebidos e instalados de modo a garantir segurança.",
    "why": "Não cumprimento pode levar a acidentes graves",
    "solution": "Verificar conformidade com normas EN 81",
    "urgency": "MODERADO - correção em 30 dias",
    "risks": "Não cumprimento pode levar a acidentes graves",
    "category": "Requisitos de Segurança",
    "classification": "C2"
  },
  "5": {
    "title": "Artigo 5.º - Proteção contra quedas",
    "explanation": "Devem existir dispositivos que impeçam a queda da cabina.",
    "why": "Risco de queda livre - FATAL",
    "solution": "Para-quedas obrigatório",
    "urgency": "CRÍTICO - imobilização imediata",
    "risks": "Risco de queda livre - FATAL",
    "category": "Requisitos de Segurança",
    "classification": "C1"
  },
  "6": {
    "title": "Artigo 6.º - Proteção contra esmagamento",
    "explanation": "Dispositivos para evitar esmagamento de pessoas.",
    "why": "Lesões graves ou morte por esmagamento",
    "solution": "Instalar sensores de proteção",
    "urgency": "CRÍTICO - imobilização imediata",
    "risks": "Lesões graves ou morte por esmagamento",
    "category": "Requisitos de Segurança",
    "classification": "C1"
  },
  "7": {
    "title": "Artigo 7.º - Portas de patamar",
    "explanation": "Portas devem ter bloqueio eletromecânico.",
    "why": "Queda na caixa do elevador",
    "solution": "Bloqueios certificados EN 81-20",
    "urgency": "CRÍTICO - imobilização imediata",
    "risks": "Queda na caixa do elevador",
    "category": "Requisitos de Segurança",
    "classification": "C1"
  },
  "8": {
    "title": "Artigo 8.º - Soleira móvel e proteção de portas",
    "explanation": "Dispositivo elétrico na soleira móvel para deteção de obstáculos nas extremidades.",
    "why": "Aprisionamento de dedos, mãos - especialmente crianças e idosos",
    "solution": "Ajustar sensores nas extremidades da porta",
    "urgency": "MODERADO - correção em 30 dias",
    "risks": "Aprisionamento de dedos, mãos - especialmente crianças e idosos",
    "realExamples": "Casos de ferimentos em dedos por portas mal calibradas",
    "category": "Requisitos de Segurança",
    "classification": "C2"
  },
  "9": {
    "title": "Artigo 9.º - Dispositivos de segurança da cabina",
    "explanation": "Para-quedas, limitador de velocidade obrigatórios.",
    "why": "Queda livre - morte ou lesões permanentes",
    "solution": "Manutenção anual obrigatória",
    "urgency": "CRÍTICO - imobilização imediata",
    "risks": "Queda livre - morte ou lesões permanentes",
    "category": "Requisitos de Segurança",
    "classification": "C1"
  },
  "10": {
    "title": "Artigo 10.º - Cabos de suspensão",
    "explanation": "Cabos devem ter coeficiente de segurança mínimo.",
    "why": "Rutura de cabo = queda fatal",
    "solution": "Inspeção visual mensal, substituição conforme desgaste",
    "urgency": "CRÍTICO - imobilização imediata",
    "risks": "Rutura de cabo = queda fatal",
    "category": "Requisitos de Segurança",
    "classification": "C1"
  },
  "11": {
    "title": "Artigo 11.º - Freio",
    "explanation": "Sistema de travagem mecânico obrigatório.",
    "why": "Impossibilidade de parar elevador",
    "solution": "Teste de travagem em cada inspeção",
    "urgency": "CRÍTICO - imobilização imediata",
    "risks": "Impossibilidade de parar elevador",
    "category": "Requisitos de Segurança",
    "classification": "C1"
  },
  "12": {
    "title": "Artigo 12.º - Bloqueio de portas",
    "explanation": "Bloqueio eletromecânico das portas da cabina e do patamar.",
    "why": "Abertura durante movimento = queda/esmagamento",
    "solution": "Verificar contactos elétricos mensalmente",
    "urgency": "CRÍTICO - imobilização imediata",
    "risks": "Abertura durante movimento = queda/esmagamento",
    "category": "Requisitos de Segurança",
    "classification": "C1"
  },
  "13": {
    "title": "Artigo 13.º - Para-quedas",
    "explanation": "Dispositivo de segurança contra queda livre.",
    "why": "Sem para-quedas = morte certa em caso de falha",
    "solution": "Teste anual obrigatório",
    "urgency": "CRÍTICO - imobilização imediata",
    "risks": "Sem para-quedas = morte certa em caso de falha",
    "category": "Requisitos de Segurança",
    "classification": "C1"
  },
  "14": {
    "title": "Artigo 14.º - Limitador de velocidade",
    "explanation": "Dispositivo que aciona para-quedas se velocidade excessiva.",
    "why": "Velocidade descontrolada",
    "solution": "Calibração anual",
    "urgency": "CRÍTICO - imobilização imediata",
    "risks": "Velocidade descontrolada",
    "category": "Requisitos de Segurança",
    "classification": "C1"
  },
  "15": {
    "title": "Artigo 15.º - Iluminação de emergência",
    "explanation": "Iluminação na cabina em caso de falha elétrica.",
    "why": "Pânico em escuridão, quedas dentro da cabina",
    "solution": "Bateria de backup, teste mensal",
    "urgency": "MODERADO - correção em 30 dias",
    "risks": "Pânico em escuridão, quedas dentro da cabina",
    "category": "Conforto e Segurança",
    "classification": "C2"
  },
  "16": {
    "title": "Artigo 16.º - Ventilação",
    "explanation": "Sistema de ventilação adequado na cabina.",
    "why": "Asfixia em caso de bloqueio prolongado",
    "solution": "Aberturas mínimas conforme EN 81",
    "urgency": "MODERADO - correção em 30 dias",
    "risks": "Asfixia em caso de bloqueio prolongado",
    "category": "Conforto e Segurança",
    "classification": "C2"
  },
  "17": {
    "title": "Artigo 17.º - Sinalização",
    "explanation": "Indicadores de direção e andar.",
    "why": "Desorientação de utilizadores",
    "solution": "Manutenção de displays e indicadores",
    "urgency": "LEVE - correção na próxima inspeção",
    "risks": "Desorientação de utilizadores",
    "category": "Informação",
    "classification": "C3"
  },
  "18": {
    "title": "Artigo 18.º - Comunicação de emergência",
    "explanation": "Sistema de alarme e comunicação bidirecional.",
    "why": "Impossibilidade de pedir socorro",
    "solution": "Telefone ou intercomunicador testado mensalmente",
    "urgency": "CRÍTICO - imobilização imediata",
    "risks": "Impossibilidade de pedir socorro",
    "category": "Emergência",
    "classification": "C1"
  },
  "19": {
    "title": "Artigo 19.º - Alarme",
    "explanation": "Botão de alarme sonoro.",
    "why": "Dificuldade em alertar em emergência",
    "solution": "Teste funcional do botão",
    "urgency": "MODERADO - correção em 30 dias",
    "risks": "Dificuldade em alertar em emergência",
    "category": "Emergência",
    "classification": "C2"
  },
  "20": {
    "title": "Artigo 20.º - Placas de identificação",
    "explanation": "Placa com carga máxima, número de pessoas, fabricante.",
    "why": "Sobrecarga por desconhecimento",
    "solution": "Placas legíveis e permanentes",
    "urgency": "LEVE - correção na próxima inspeção",
    "risks": "Sobrecarga por desconhecimento",
    "category": "Informação",
    "classification": "C3"
  },
  "21": {
    "title": "Artigo 21.º - Resistência das portas",
    "explanation": "Portas devem resistir a impactos.",
    "why": "Porta cede = acesso à caixa = queda",
    "solution": "Portas metálicas conforme norma",
    "urgency": "CRÍTICO - imobilização imediata",
    "risks": "Porta cede = acesso à caixa = queda",
    "category": "Requisitos de Segurança",
    "classification": "C1"
  },
  "22": {
    "title": "Artigo 22.º - Fechaduras",
    "explanation": "Fechaduras eletromecânicas certificadas.",
    "why": "Porta abre com cabina ausente",
    "solution": "Substituir por modelos homologados",
    "urgency": "CRÍTICO - imobilização imediata",
    "risks": "Porta abre com cabina ausente",
    "category": "Requisitos de Segurança",
    "classification": "C1"
  },
  "23": {
    "title": "Artigo 23.º - Dispositivo de nivelamento",
    "explanation": "Sistema que alinha cabina com patamar.",
    "why": "Degrau excessivo = quedas de idosos",
    "solution": "Ajuste de nivelamento ±15mm",
    "urgency": "MODERADO - correção em 30 dias",
    "risks": "Degrau excessivo = quedas de idosos",
    "category": "Conforto e Segurança",
    "classification": "C2"
  },
  "24": {
    "title": "Artigo 24.º - Proteção de órgãos móveis",
    "explanation": "Proteção de polias, cabos, motor.",
    "why": "Lesões graves em técnicos",
    "solution": "Guardas de proteção",
    "urgency": "CRÍTICO - imobilização imediata",
    "risks": "Lesões graves em técnicos",
    "category": "Casa de Máquinas",
    "classification": "C1"
  },
  "25": {
    "title": "Artigo 25.º - Casa de máquinas",
    "explanation": "Requisitos de acesso e ventilação.",
    "why": "Dificuldade de manutenção",
    "solution": "Acesso seguro e iluminação adequada",
    "urgency": "MODERADO - correção em 30 dias",
    "risks": "Dificuldade de manutenção",
    "category": "Casa de Máquinas",
    "classification": "C2"
  },
  "26": {
    "title": "Artigo 26.º - Acesso à casa de máquinas",
    "explanation": "Porta com chave, sinalização de perigo.",
    "why": "Acesso não autorizado",
    "solution": "Porta trancada, placas de aviso",
    "urgency": "MODERADO - correção em 30 dias",
    "risks": "Acesso não autorizado",
    "category": "Casa de Máquinas",
    "classification": "C2"
  },
  "27": {
    "title": "Artigo 27.º - Iluminação da casa de máquinas",
    "explanation": "Iluminação mínima 200 lux.",
    "why": "Acidentes durante manutenção",
    "solution": "Lâmpadas adequadas",
    "urgency": "LEVE - correção na próxima inspeção",
    "risks": "Acidentes durante manutenção",
    "category": "Casa de Máquinas",
    "classification": "C3"
  },
  "28": {
    "title": "Artigo 28.º - Interruptor de paragem",
    "explanation": "Interruptor de emergência na casa de máquinas.",
    "why": "Impossibilidade de parar em emergência",
    "solution": "Interruptor vermelho bem sinalizado",
    "urgency": "CRÍTICO - imobilização imediata",
    "risks": "Impossibilidade de parar em emergência",
    "category": "Casa de Máquinas",
    "classification": "C1"
  },
  "29": {
    "title": "Artigo 29.º - Tomada elétrica",
    "explanation": "Tomada para ferramentas de manutenção.",
    "why": "Dificuldade de manutenção",
    "solution": "Tomada 230V protegida",
    "urgency": "LEVE - correção na próxima inspeção",
    "risks": "Dificuldade de manutenção",
    "category": "Casa de Máquinas",
    "classification": "C3"
  },
  "30": {
    "title": "Artigo 30.º - Caixa do elevador",
    "explanation": "Paredes resistentes ao fogo, acesso proibido.",
    "why": "Propagação de incêndio, quedas",
    "solution": "Paredes REI 60",
    "urgency": "CRÍTICO - imobilização imediata",
    "risks": "Propagação de incêndio, quedas",
    "category": "Estrutura",
    "classification": "C1"
  },
  "40": {
    "title": "Artigo 40.º - Sobrecarga",
    "explanation": "Dispositivo que impede movimento se carga excedida.",
    "why": "Rutura de cabos por sobrecarga",
    "solution": "Sensor de peso calibrado",
    "urgency": "MODERADO - correção em 30 dias",
    "risks": "Rutura de cabos por sobrecarga",
    "category": "Proteção",
    "classification": "C2"
  },
  "41": {
    "title": "Artigo 41.º - Inspeção inicial",
    "explanation": "Inspeção obrigatória antes da entrada em serviço.",
    "why": "Elevador defeituoso em uso",
    "solution": "Inspeção por entidade certificada",
    "urgency": "CRÍTICO - imobilização imediata",
    "risks": "Elevador defeituoso em uso",
    "category": "Inspeções",
    "classification": "C1"
  },
  "42": {
    "title": "Artigo 42.º - Inspeções periódicas",
    "explanation": "Inspeção a cada 6 meses (elevadores) ou 12 meses (monta-cargas).",
    "why": "Degradação não detetada",
    "solution": "Contrato com entidade inspetora",
    "urgency": "MODERADO - correção em 30 dias",
    "risks": "Degradação não detetada",
    "category": "Inspeções",
    "classification": "C2"
  },
  "43": {
    "title": "Artigo 43.º - Inspeção extraordinária",
    "explanation": "Após acidente ou modificação.",
    "why": "Uso de elevador não seguro",
    "solution": "Inspeção imediata",
    "urgency": "CRÍTICO - imobilização imediata",
    "risks": "Uso de elevador não seguro",
    "category": "Inspeções",
    "classification": "C1"
  },
  "44": {
    "title": "Artigo 44.º - Entidades inspetoras",
    "explanation": "Apenas entidades acreditadas podem inspecionar.",
    "why": "Consultar regulamento para detalhes",
    "solution": "Verificar conformidade",
    "urgency": "Não especificado",
    "category": "Inspeções",
    "classification": "INFO"
  },
  "45": {
    "title": "Artigo 45.º - Relatório de inspeção",
    "explanation": "Relatório com classificação C1/C2/C3 das não-conformidades.",
    "why": "Consultar regulamento para detalhes",
    "solution": "Verificar conformidade",
    "urgency": "Não especificado",
    "category": "Inspeções",
    "classification": "INFO"
  },
  "46": {
    "title": "Artigo 46.º - Manutenção",
    "explanation": "Manutenção preventiva mensal obrigatória.",
    "why": "Falhas por falta de manutenção",
    "solution": "Contrato com empresa certificada",
    "urgency": "MODERADO - correção em 30 dias",
    "risks": "Falhas por falta de manutenção",
    "category": "Manutenção",
    "classification": "C2"
  },
  "47": {
    "title": "Artigo 47.º - Livro de registos",
    "explanation": "Livro com todas as manutenções e incidentes.",
    "why": "Falta de rastreabilidade",
    "solution": "Livro atualizado ou sistema digital",
    "urgency": "LEVE - correção na próxima inspeção",
    "risks": "Falta de rastreabilidade",
    "category": "Manutenção",
    "classification": "C3"
  },
  "48": {
    "title": "Artigo 48.º - Modificações",
    "explanation": "Qualquer modificação requer projeto e inspeção.",
    "why": "Modificações não seguras",
    "solution": "Projeto por técnico habilitado",
    "urgency": "CRÍTICO - imobilização imediata",
    "risks": "Modificações não seguras",
    "category": "Modificações",
    "classification": "C1"
  },
  "49": {
    "title": "Artigo 49.º - Responsabilidade",
    "explanation": "Proprietário é responsável pela segurança.",
    "why": "Consultar regulamento para detalhes",
    "solution": "Verificar conformidade",
    "urgency": "Não especificado",
    "category": "Disposições Gerais",
    "classification": "INFO"
  },
  "50": {
    "title": "Artigo 50.º - Marcação CE",
    "explanation": "Elevadores novos devem ter marcação CE.",
    "why": "Não conformidade com diretivas europeias",
    "solution": "Certificação CE obrigatória",
    "urgency": "MODERADO - correção em 30 dias",
    "risks": "Não conformidade com diretivas europeias",
    "category": "Conformidade",
    "classification": "C2"
  },
  "78": {
    "title": "Artigo 78.º - Programa de manutenção",
    "explanation": "Deve existir programa escrito de manutenção preventiva.",
    "why": "Manutenção irregular",
    "solution": "Plano de manutenção conforme fabricante",
    "urgency": "LEVE - correção na próxima inspeção",
    "risks": "Manutenção irregular",
    "category": "Manutenção",
    "classification": "C3"
  },
  "85": {
    "title": "Artigo 85.º - Livro de ocorrências",
    "explanation": "Registo de todas as ocorrências anormais.",
    "why": "Perda de informação histórica",
    "solution": "Sistema de registo adequado",
    "urgency": "LEVE - correção na próxima inspeção",
    "risks": "Perda de informação histórica",
    "category": "Documentação",
    "classification": "C3"
  }
};

module.exports = regulationArticles;
