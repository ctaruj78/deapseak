#!/usr/bin/env node
/**
 * Seed de categorias de orçamento derivadas da análise das cláusulas C2/C3 dos
 * relatórios de inspeção carregados no sistema (2026-10-30).
 *
 * 240 cláusulas -> ~160 formulações distintas -> 88 categorias (obra/produto).
 * Cláusulas escritas de formas diferentes mas com a mesma obra foram fundidas
 * numa só categoria (ex.: 6 variantes de "não existe proteção para evitar que
 * os cabos saltem dos gornes" -> 1 categoria).
 *
 * Revisto após feedback: cláusulas com obras diferentes NÃO são fundidas (ex.: fim de curso
 * atua tarde = cabos esticados vs. folgas de poço/topo, que são outras obras). Despacho 18/2022 e
 * Circular 1-2010 não geram categoria (revogado / efeitos suspensos). Inclui o scan Rua Porto Alegre (OCR manual).
 *
 * Idempotente — upsert por `nome` com $setOnInsert; nunca sobrescreve categorias
 * existentes. precoSugerido = 0 em todas (preencher no admin). Categorias com
 * `critico:true` correspondem a cláusulas C2; as normas marcadas [VERIFICAR] /
 * "a confirmar" e as notas [RASCUNHO] devem ser validadas pelo técnico.
 *
 * Uso:  node scripts/seed-orcamento-categorias-inspecoes.js [--dry-run]
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const OrcamentoCategoria = require('../models/OrcamentoCategoria');

const categorias = [
    {
        "nome": "Encurtamento dos cabos de suspensão (cabos esticados — fim de curso atua tarde)",
        "grupo": "mecanico",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Encurtamento dos cabos de suspensão com refixação dos terminais e equalização da tensão, para que o fim de curso de segurança atue antes de a cabina/contrapeso assentarem nos pára-choques; inclui ensaio do fim de curso.",
        "norma": "Regulamento de Segurança de Elevadores Elétricos (Dec. 513/70), Art. 74.º n.º 2 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Se o fim de curso de segurança só atua depois de a cabina ou o contrapeso já estarem assentes nos pára-choques (amortecedores), os cabos de suspensão alongaram com o uso. O encurtamento dos cabos repõe a posição de paragem e devolve ao fim de curso a sua função de proteção.",
        "critico": true,
        "ordem": 200,
        "zona": "caixa"
    },
    {
        "nome": "Fim de curso de segurança — reposicionamento/substituição dos interruptores",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Reposicionamento, substituição e ensaio dos interruptores de fim de curso de segurança (e respetivas calhas/ressaltos), quando os cabos estão em bom estado e a causa é o ajuste ou o desgaste do próprio dispositivo.",
        "norma": "Regulamento de Segurança de Elevadores Elétricos (Dec. 513/70), Art. 74.º n.º 2",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 210,
        "zona": "caixa"
    },
    {
        "nome": "Espaço livre no poço sob a cabina inferior a 0,50 m",
        "grupo": "estrutural",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Regularização do espaço livre sob a cabina assente nos pára-choques totalmente comprimidos (mín. 0,50 m): amortecedores de menor curso, plataforma/calços ou rebaixamento do poço, após medição.",
        "norma": "Regulamento de Segurança de Elevadores Elétricos (Dec. 513/70), Art. 19.º n.º 1 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Com o poço demasiado raso, a cabina não deixa espaço onde o técnico se proteja. A solução depende das medições e não decorre de cabos esticados.",
        "critico": true,
        "ordem": 220,
        "zona": "poco"
    },
    {
        "nome": "Altura livre acima da cobertura da cabina com contrapeso nos pára-choques",
        "grupo": "estrutural",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Regularização da altura livre acima da cobertura da cabina quando o contrapeso assenta nos pára-choques (≥ 1 + 0,035V² m): ajuste de amortecedores/contrapeso ou obra no topo da caixa.",
        "norma": "Regulamento de Segurança de Elevadores Elétricos (Dec. 513/70), Art. 16.º n.º 2 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] No fim do curso, a cabina pode não dispor da altura de segurança sobre a sua cobertura.",
        "critico": true,
        "ordem": 230,
        "zona": "poco"
    },
    {
        "nome": "Curso do contrapeso com a cabina nos pára-choques",
        "grupo": "mecanico",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Regularização do curso do contrapeso com a cabina assente nos pára-choques (≥ 0,035V² m): ajuste de pára-choques e de curso.",
        "norma": "Regulamento de Segurança de Elevadores Elétricos (Dec. 513/70), Art. 16.º n.º 3 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Folga de curso insuficiente do contrapeso ao fim do trajeto.",
        "critico": true,
        "ordem": 240,
        "zona": "poco"
    },
    {
        "nome": "Proteção da roda tensora do limitador (saída do cabo)",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de proteção contra saída do cabo na roda tensora do limitador de velocidade.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 250,
        "zona": "maquina"
    },
    {
        "nome": "Proteção contra saída dos cabos dos gornes (roda de tração, desvio e tensora)",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de proteção (guarda/varão) nas rodas de tração, de desvio e tensora, impedindo a saída dos cabos dos gornes e o alojamento de corpos estranhos entre os gornes e os cabos.",
        "norma": "Regulamento de Segurança de Elevadores Elétricos (Dec. 513/70), Art. 64.º n.º 1 (conforme relatórios de inspeção); [VERIFICAR] EN 81-20:2014, 5.5.7",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Sem esta proteção, um cabo pode saltar do gorne ou ser apanhado por um corpo estranho, com risco de dano grave para o cabo e para quem trabalha na casa das máquinas. É das cláusulas C2 mais repetidas nos relatórios.",
        "critico": true,
        "ordem": 260,
        "zona": "maquina"
    },
    {
        "nome": "Substituição de gornes desgastados (roda de tração/desvio)",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Substituição/maquinagem dos gornes da roda de tração e da roda de desvio com desgaste acentuado.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 270,
        "zona": "maquina"
    },
    {
        "nome": "Resguardo de peças rotativas da máquina (volante, engrenagens, correias)",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de resguardos nas peças salientes da máquina de tração (volante, engrenagens, correias, rodas).",
        "norma": "Regulamento de Segurança de Elevadores Elétricos (Dec. 513/70), Art. 85.º (conforme relatórios de inspeção)",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 280,
        "zona": "maquina"
    },
    {
        "nome": "Reparação de fuga de óleo da máquina de tração",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Reparação de fuga de óleo da máquina de tração (substituição de retentores/vedantes, reposição do nível e limpeza).",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 290,
        "zona": "maquina"
    },
    {
        "nome": "Chave de desfrenagem manual do travão da máquina",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de chave/alavanca de abertura manual do travão da máquina de tração, guardada junto à máquina e identificada, para a desfrenagem manual em resgate.",
        "norma": "Regulamento de Segurança de Elevadores Elétricos (Dec. 513/70), Art. 81.º n.º 5 (conforme relatório de inspeção Rua Porto Alegre, 2023)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Sem chave de travão, não é possível desfrenar manualmente a máquina para movimentar a cabina em caso de resgate.",
        "critico": true,
        "ordem": 300,
        "zona": "maquina"
    },
    {
        "nome": "Reparação de folgas no eixo da máquina de tração",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Substituição de rolamentos/casquilhos e correção das folgas no eixo da máquina de tração.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 310,
        "zona": "maquina"
    },
    {
        "nome": "Reparação do apoio (bancada) da máquina de tração",
        "grupo": "mecanico",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Reparação/substituição do apoio da máquina de tração (bancada, antivibráticos, fixações).",
        "norma": "[VERIFICAR] EN 81-20:2014 (dispositivo mecânico deteriorado a ponto de criar situação perigosa; conforme relatório)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Apoio deteriorado compromete o alinhamento e a tração, com risco de situação perigosa.",
        "critico": true,
        "ordem": 320,
        "zona": "maquina"
    },
    {
        "nome": "Proteção térmica do motor de tração (sonda PTC)",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de sonda térmica (PTC/termístor) nos enrolamentos do motor de tração, ligada ao quadro de comando para paragem do elevador em caso de sobreaquecimento.",
        "norma": "[VERIFICAR] EN 81-20:2014, 5.9.3.10 / 5.5.7 (proteção térmica do motor) — texto exato conforme relatório de inspeção",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Um motor sem proteção térmica pode sobreaquecer e queimar ou provocar paragem entre pisos.",
        "critico": true,
        "ordem": 330,
        "zona": "maquina"
    },
    {
        "nome": "Controlo de temperatura da casa das máquinas (sonda e alarme no quadro)",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de sonda de temperatura na casa das máquinas ligada ao quadro de comando, com alarme/paragem fora do intervalo +5 °C a +40 °C.",
        "norma": "[VERIFICAR] EN 81-20:2014, 0.4.17 e 5.2.6.3.1 (temperatura +5 °C a +40 °C)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] A casa das máquinas deve manter-se entre +5 °C e +40 °C para o funcionamento fiável do quadro e do variador; sem monitorização, não há aviso de sobreaquecimento.",
        "critico": true,
        "ordem": 340,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Monitorização do travão da máquina",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de dispositivos de monitorização do travão da máquina de tração (microinterruptores/sensores) ligados ao circuito de comando.",
        "norma": "[VERIFICAR] EN 81-20:2014, 5.9.2.2.2 (monitorização do travão)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Sem monitorização, uma falha no travão pode passar despercebida.",
        "critico": true,
        "ordem": 350,
        "zona": "maquina"
    },
    {
        "nome": "Interruptor geral próximo da máquina / dispositivo de paragem (STOP)",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Deslocação do interruptor geral para junto da máquina (máx. 1 m) ou instalação de dispositivo de paragem (STOP) junto à máquina.",
        "norma": "[VERIFICAR] RSEE/EN 81-20 — texto conforme relatório de inspeção",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Com o interruptor geral a mais de 1 m da máquina e sem dispositivo de paragem, o técnico não consegue cortar a energia em segurança junto à máquina.",
        "critico": true,
        "ordem": 360,
        "zona": "quadro"
    },
    {
        "nome": "Limitador de velocidade — contacto elétrico de paragem na subida",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Reparação/substituição do contacto elétrico do limitador de velocidade que comanda a paragem da máquina, incluindo ensaio de atuação no sentido de subida.",
        "norma": "",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Se o limitador não parar a máquina na subida, perde-se a proteção contra excesso de velocidade.",
        "critico": true,
        "ordem": 370,
        "zona": "maquina"
    },
    {
        "nome": "Proteção contra excesso de velocidade da cabina na subida",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Instalação/regularização do dispositivo de proteção contra velocidade excessiva da cabina no sentido de subida (paragem ou redução da velocidade) e respetivo ensaio.",
        "norma": "[VERIFICAR] EN 81-20:2014, 5.6.6 (proteção contra velocidade excessiva na subida)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Sem este dispositivo, a cabina pode subir sem controlo (ex.: falha do travão ou da tração com contrapeso mais pesado).",
        "critico": true,
        "ordem": 380,
        "zona": "maquina"
    },
    {
        "nome": "Substituição do limitador de velocidade (desgaste/oxidação)",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Substituição do limitador de velocidade com desgaste/oxidação, com selagem e ensaio de atuação.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 390,
        "zona": "maquina"
    },
    {
        "nome": "Substituição do cabo do limitador de velocidade (oxidação/desgaste/aderência)",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Substituição do cabo do limitador de velocidade e verificação da aderência na roda.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 400,
        "zona": "maquina"
    },
    {
        "nome": "Selagem do limitador de velocidade",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Selagem do limitador de velocidade após regulação e ensaio.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 410,
        "zona": "maquina"
    },
    {
        "nome": "Fixação do limitador de velocidade (pontos de fixação)",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Reforço da fixação do limitador de velocidade a todos os pontos previstos pelo fabricante.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 420,
        "zona": "maquina"
    },
    {
        "nome": "Dispositivo de paragem por imobilização anormal da cabina/contrapeso",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Instalação/reparação de dispositivo de paragem da máquina em caso de imobilização anormal da cabina ou contrapeso (temporizador de proteção contra bloqueio) no quadro de comando.",
        "norma": "[VERIFICAR] EN 81-20:2014 — limitação do tempo de funcionamento do motor (número do ponto a confirmar)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Sem este dispositivo, o motor pode continuar a tracionar contra uma cabina ou contrapeso bloqueados, com risco de dano e de situação perigosa.",
        "critico": true,
        "ordem": 430,
        "zona": "quadro"
    },
    {
        "nome": "Bypass das portas — monitorização independente",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Adaptação do quadro de comando para sinal independente de monitorização do fecho das portas de cabina quando o dispositivo de bypass está ativo.",
        "norma": "EN 81-20:2014, 5.12.1.8.3 d) (conforme relatório de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Ao ativar o bypass das portas, tem de haver um sinal independente que confirme que a porta de cabina está fechada.",
        "critico": true,
        "ordem": 440,
        "zona": "quadro"
    },
    {
        "nome": "Condições para ensaio de movimento incontrolável da cabina (UCM)",
        "grupo": "seguranca",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Adaptação do quadro de comando para permitir o ensaio de movimento incontrolável da cabina com porta aberta (UCM).",
        "norma": "[VERIFICAR] EN 81-20:2014, 5.6.7 (UCM)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Sem condições de ensaio, a proteção UCM não pode ser verificada pelo inspetor.",
        "critico": true,
        "ordem": 450,
        "zona": "quadro"
    },
    {
        "nome": "Condições para ensaio do comportamento de bombeiros",
        "grupo": "seguranca",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Adaptação do quadro de comando para permitir o ensaio do comportamento em caso de incêndio (modo bombeiros).",
        "norma": "[VERIFICAR] EN 81-20:2014 — número do ponto a confirmar",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Sem condições de ensaio, o modo bombeiros não pode ser verificado.",
        "critico": true,
        "ordem": 460,
        "zona": "quadro"
    },
    {
        "nome": "Comunicação bidirecional na cobertura da cabina e no poço",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de dispositivos de comunicação bidirecional (pedido de socorro) na cobertura da cabina e no poço, ligados ao serviço de socorro.",
        "norma": "DL 295/98 (Diretiva 95/16/CE), Anexo I, 4.5/14.2.3.3 e 'Ponto 5.10' (conforme relatórios de inspeção); EN 81-28",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Um técnico preso no topo da cabina ou no poço tem de poder pedir socorro; sistemas de socorro inoperacionais nesses locais originam C2.",
        "critico": true,
        "ordem": 470,
        "zona": "poco"
    },
    {
        "nome": "Intercomunicador casa das máquinas–cabina (curso superior a 30 m)",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Instalação de intercomunicador ou dispositivo análogo alimentado por fonte de segurança entre o local de resgate e a cabina (curso superior a 30 m).",
        "norma": "DL 295/98, Anexo I, ponto 14.2.3.4 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Em cursos superiores a 30 m, o resgate sem comunicação direta é demorado e inseguro.",
        "critico": true,
        "ordem": 480,
        "zona": "cabina"
    },
    {
        "nome": "Sinalização do elevador de origem do pedido de socorro",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Reparação/instalação da sinalização que identifica de que elevador provém o pedido de socorro.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 490,
        "zona": "cabina"
    },
    {
        "nome": "Iluminação de emergência no teto da cabina",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de iluminação de emergência (autónoma) no teto da cabina.",
        "norma": "",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Em falha de energia, o técnico no teto da cabina fica sem luz para o resgate.",
        "critico": true,
        "ordem": 500,
        "zona": "cabina"
    },
    {
        "nome": "Iluminação de cabina (≥ 50 lux) — luminárias/LED",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Substituição de luminárias da cabina por LED, garantindo no mínimo 50 lux no pavimento e sobre os órgãos de comando.",
        "norma": "DL 295/98, Anexo I, ponto 8.17.1 (conforme relatório de inspeção)",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 510,
        "zona": "cabina"
    },
    {
        "nome": "Iluminação dos patamares (≥ 50 lux)",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Substituição/instalação de luminárias nos patamares para ≥ 50 lux.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 520,
        "zona": "patamar"
    },
    {
        "nome": "Iluminação do acesso à casa das máquinas",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Substituição de luminárias do acesso à casa das máquinas.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 530,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Proteção diferencial 30 mA — circuitos de tomadas e iluminação",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de aparelhagem de proteção diferencial de alta sensibilidade (≤ 30 mA) nos circuitos de tomadas e iluminação da casa das máquinas.",
        "norma": "DL 740/74 e Portaria 949-A/2006 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 540,
        "zona": "quadro"
    },
    {
        "nome": "Quadro geral — reparação/substituição do disjuntor diferencial das saídas",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Reparação/substituição do disjuntor diferencial do quadro e proteção diferencial das saídas.",
        "norma": "DL 740/74 e Portaria 949-A/2006 (conforme relatório de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Sem proteção diferencial nas saídas, existe risco de contacto indireto.",
        "critico": true,
        "ordem": 550,
        "zona": "quadro"
    },
    {
        "nome": "Invólucro e barramento do quadro geral — proteção contra contactos diretos",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de proteções (tampas/proteções isolantes) no quadro geral e barramento da casa das máquinas, impedindo o acesso a ligações sob tensão.",
        "norma": "DL 740/74 e Portaria 949-A/2006 (conforme relatório de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Ligações acessíveis sob tensão representam risco de eletrocussão para quem acede ao quadro.",
        "critico": true,
        "ordem": 560,
        "zona": "quadro"
    },
    {
        "nome": "Proteção diferencial adequada ao variador (tipo B / a montante da magnetotérmica)",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de proteção diferencial tipo B para o circuito com variador de frequência e correção da ordem das proteções do circuito de força motriz.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 570,
        "zona": "quadro"
    },
    {
        "nome": "Identificação de circuitos e proteções no quadro elétrico (em português)",
        "grupo": "eletrico",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Identificação e etiquetagem, em português, dos circuitos e proteções do quadro elétrico da casa das máquinas.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 580,
        "zona": "quadro"
    },
    {
        "nome": "Sinalização e proteção de zonas com altura inferior a 1,80 m (casa das máquinas)",
        "grupo": "estrutural",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Sinalização (pintura e aviso de uso de capacete) e proteção das zonas de circulação da casa das máquinas com altura inferior a 1,80 m e espaço livre insuficiente diante dos aparelhos elétricos.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 590,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Impermeabilização da casa das máquinas (infiltração de água)",
        "grupo": "estrutural",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Impermeabilização da casa das máquinas e vedação da ventilação para impedir a entrada de água.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 600,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Tratamento de vestígios de humidade na casa das máquinas",
        "grupo": "estrutural",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Tratamento de vestígios de humidade (secagem, pintura anti-humidade) na casa das máquinas.",
        "norma": "DL 295/98, Anexo I, ponto 6.3.5.1 (conforme relatório de inspeção)",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 610,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Ventilação da casa das máquinas",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de ventilação (grelha/extrator) na casa das máquinas.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 620,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Proteção contra incidência solar direta",
        "grupo": "estrutural",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Proteção (película/cortina/anteparo) contra a incidência direta de raios solares nos órgãos da instalação.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 630,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Vedação da casa das máquinas (porta com fechadura)",
        "grupo": "estrutural",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Vedação da casa das máquinas com porta com fechadura.",
        "norma": "Regulamento de Segurança de Elevadores Elétricos (Dec. 513/70) (conforme relatório)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] A casa das máquinas deve estar fechada a pessoas não autorizadas.",
        "critico": true,
        "ordem": 640,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Abertura interior sem chave das portas e alçapões da casa das máquinas",
        "grupo": "estrutural",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Instalação de fechadura antipânico/abertura interior sem chave nas portas e alçapões da casa das máquinas.",
        "norma": "Regulamento de Segurança de Elevadores Elétricos (Dec. 513/70), Art. 25.º n.º 3 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Quem está na casa das máquinas tem de poder sair sem chave.",
        "critico": true,
        "ordem": 650,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Acesso seguro à casa das máquinas — alçapão contrabalançado",
        "grupo": "estrutural",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Instalação de contrapeso/mola de gás no alçapão de acesso à casa das máquinas e adequação do acesso para ser fácil e seguro.",
        "norma": "",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Um alçapão pesado e sem contrabalanço é risco de queda e de esmagamento.",
        "critico": true,
        "ordem": 660,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Suporte metálico/gancho de içamento na casa das máquinas",
        "grupo": "estrutural",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de suporte metálico/gancho no teto da casa das máquinas para montagem e desmontagem de material pesado, com indicação da carga máxima admissível.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 670,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Reparação de elementos construtivos da casa das máquinas",
        "grupo": "estrutural",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Reparação de pavimento, paredes, cobertura, portas, alçapões e escadas da casa das máquinas.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 680,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Identificação dos elevadores (piso principal e casa das máquinas)",
        "grupo": "outro",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Colocação de placas de identificação dos elevadores no piso principal e das máquinas na casa das máquinas comum.",
        "norma": "Regulamento de Segurança de Elevadores Elétricos (Dec. 513/70), Art. 96.º n.º 2 (conforme relatório de inspeção)",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 690,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Instruções de manobra e movimento manual da cabina",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Elaboração e afixação de instruções de movimento manual da cabina conformes com o equipamento instalado.",
        "norma": "EN 81-20:2014, 5.2.6.2.3 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Instruções ausentes ou não conformes com o equipamento podem causar resgate improvisado e acidente.",
        "critico": true,
        "ordem": 700,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Instruções de resgate e chave de desencravamento (paragem intempestiva)",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Afixação, na casa das máquinas/painel de emergência, de instruções pormenorizadas para paragem intempestiva: operação do dispositivo de resgate e uso da chave de desencravamento.",
        "norma": "[VERIFICAR] EN 81-20:2014 (conforme relatório de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Sem instruções afixadas, o socorro não é executável em segurança.",
        "critico": true,
        "ordem": 710,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Aviso junto à chave de desencravamento",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Afixação de aviso do perigo de utilização da chave de desencravamento.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 720,
        "zona": "patamar"
    },
    {
        "nome": "Marcação dos cabos na zona de desencravamento",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Marcação dos cabos de suspensão na zona de desencravamento.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 730,
        "zona": "caixa"
    },
    {
        "nome": "Sinalização do espaço de refúgio no poço e topo da cabina",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Sinalização do espaço de refúgio (postura/nº de pessoas) no poço e no topo da cabina e correção do espaço de refúgio, se inferior ao sinalizado.",
        "norma": "[VERIFICAR] EN 81-20:2014, 5.2.5.7 (conforme relatório)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Quem trabalha no poço ou no topo da cabina tem de ter um espaço de refúgio sinalizado.",
        "critico": true,
        "ordem": 740,
        "zona": "poco"
    },
    {
        "nome": "Aviso de nº de pessoas e postura (poço / teto da cabina)",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Afixação de aviso legível a partir dos patamares/entrada com o nº de pessoas e a postura do espaço de refúgio.",
        "norma": "EN 81-20:2014, 5.2.5.7.1 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 750,
        "zona": "poco"
    },
    {
        "nome": "Balaustrada na cobertura da cabina",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de balaustrada na cobertura da cabina.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 760,
        "zona": "cabina"
    },
    {
        "nome": "Divisória entre elevadores — altura mínima 2,5 m",
        "grupo": "estrutural",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Instalação/prolongamento de divisória entre elevadores (altura mínima 2,5 m; a toda a altura quando a distância for inferior a 30 cm).",
        "norma": "[VERIFICAR] RSEE, Art. 9.º n.º 3 e 15.º n.º 1 (conforme relatório)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Sem divisória, quem trabalha num elevador fica exposto às peças em movimento do adjacente.",
        "critico": true,
        "ordem": 770,
        "zona": "poco"
    },
    {
        "nome": "Divisória entre elevadores — fecho de aberturas de grande dimensão",
        "grupo": "estrutural",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Fecho/reparação das aberturas de grande dimensão da divisória do fundo da caixa entre elevadores.",
        "norma": "",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Aberturas grandes permitem acesso a peças em movimento do elevador adjacente.",
        "critico": true,
        "ordem": 780,
        "zona": "poco"
    },
    {
        "nome": "Resguardo/divisória de proteção do contrapeso no poço (2 m)",
        "grupo": "estrutural",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Instalação de resguardo/divisória de proteção do contrapeso no poço (altura mínima 2 m; abertura inferior ≤ 0,30 m).",
        "norma": "EN 81-20:2014, 5.2.5",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 790,
        "zona": "poco"
    },
    {
        "nome": "Folga cabina–contrapeso e estrutura do contrapeso",
        "grupo": "mecanico",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Ajuste de guias para folga cabina–contrapeso ≥ 5 cm e reforço da estrutura de perfilados do contrapeso.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 800,
        "zona": "caixa"
    },
    {
        "nome": "Paredes da caixa — superfícies contínuas na zona de desencravamento",
        "grupo": "estrutural",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Regularização das faces interiores das paredes da caixa na zona de acessos e desencravamento.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 810,
        "zona": "caixa"
    },
    {
        "nome": "Retirada de instalações estranhas ao serviço do elevador",
        "grupo": "estrutural",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Retirada de instalações/materiais estranhos ao serviço do ascensor.",
        "norma": "Regulamento de Segurança de Elevadores Elétricos (Dec. 513/70), Art. 28.º (conforme relatório de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] A casa das máquinas e a caixa não podem ser usadas para fins alheios ao elevador.",
        "critico": true,
        "ordem": 820,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Portas de patamar — dispositivo de inversão do fecho",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Reparação/substituição do braço elástico ou dispositivo de inversão do movimento de fecho das portas de patamar.",
        "norma": "DL 295/98, Anexo I, ponto 14.2.2.1 (conforme relatório de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Sem inversão do fecho, a porta pode prender a pessoa que entra.",
        "critico": true,
        "ordem": 830,
        "zona": "patamar"
    },
    {
        "nome": "Batentes de amortecimento do fecho das portas de patamar",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Substituição/afinação de batentes de amortecimento das portas de patamar.",
        "norma": "",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Batentes inoperacionais fazem a porta bater e danificam fechos e contactos.",
        "critico": true,
        "ordem": 840,
        "zona": "patamar"
    },
    {
        "nome": "Visor das portas de patamar (dimensão ≤ 15 cm)",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Substituição de visor das portas de patamar com ambas as dimensões superiores a 15 cm.",
        "norma": "",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Visor fora da dimensão regulamentar.",
        "critico": true,
        "ordem": 850,
        "zona": "patamar"
    },
    {
        "nome": "Indicação da presença da cabina nos patamares / luz permanente da cabina",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Instalação de indicação da presença da cabina nos patamares e de luz da cabina permanentemente acesa ou ligada ao botão de chamada.",
        "norma": "",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Com visor opaco e sem indicação, o utilizador pode abrir a porta sem saber se a cabina lá está.",
        "critico": true,
        "ordem": 860,
        "zona": "patamar"
    },
    {
        "nome": "Folga soleira cabina/patamar",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Ajuste de soleiras para que a folga entre soleira da cabina e soleira de patamar não exceda 2 cm.",
        "norma": "Regulamento de Segurança de Elevadores Elétricos (Dec. 513/70), Art. 78.º n.º 2 (conforme relatório de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Folga excessiva representa risco de queda de objetos ou pés.",
        "critico": true,
        "ordem": 870,
        "zona": "patamar"
    },
    {
        "nome": "Molas do igualizador de tensão dos cabos",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Substituição das molas do dispositivo de igualização da tensão dos cabos.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 880,
        "zona": "caixa"
    },
    {
        "nome": "Substituição de cabos de suspensão (desgaste, fios partidos)",
        "grupo": "mecanico",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Substituição do conjunto de cabos de suspensão da cabina/contrapeso.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 890,
        "zona": "caixa"
    },
    {
        "nome": "Substituição de amortecedores/pára-choques",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Tratamento ou substituição de amortecedores da cabina e do contrapeso com oxidação acentuada.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 900,
        "zona": "poco"
    },
    {
        "nome": "Marcação CE na cabina",
        "grupo": "outro",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Colocação de marcação CE clara e visível na cabina.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 910,
        "zona": "cabina"
    },
    {
        "nome": "Portas de patamar — tratamento anticorrosivo e pintura",
        "grupo": "estrutural",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Tratamento anticorrosivo e pintura das portas de patamar.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 920,
        "zona": "patamar"
    },
    {
        "nome": "Porta da casa das máquinas e estruturas metálicas — tratamento anticorrosivo",
        "grupo": "estrutural",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Tratamento anticorrosivo e pintura da porta da casa das máquinas e estruturas metálicas.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 930,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Botão de abertura da porta de cabina",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de botão de abertura da porta de cabina.",
        "norma": "",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Sem botão de abertura da porta, o utilizador não consegue reabrir a porta.",
        "critico": true,
        "ordem": 940,
        "zona": "cabina"
    },
    {
        "nome": "Botão STOP na cabina — posição e cor",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Reposicionamento (acima dos restantes botões) e cor vermelha do botão STOP da cabina.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 950,
        "zona": "cabina"
    },
    {
        "nome": "Identificação dos botões da cabina",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Identificação dos botões da cabina.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 960,
        "zona": "cabina"
    },
    {
        "nome": "Setas/sinalizadores dos patamares",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Reparação/substituição de setas de patamar inoperacionais.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 970,
        "zona": "patamar"
    },
    {
        "nome": "Número de identificação do elevador na cabina",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Renovação do número de identificação do elevador e display legível.",
        "norma": "DL 295/98, Anexo I, ponto 15.2.2 (conforme relatório)",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 980,
        "zona": "cabina"
    },
    {
        "nome": "Mensagem de voz de posição da cabina",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Instalação de módulo de voz para anunciar a posição da cabina.",
        "norma": "EN 81-70:2021, 5.4.4.2 (conforme relatório de inspeção)",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 990,
        "zona": "cabina"
    },
    {
        "nome": "Sinalização de sobrecarga da cabina",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Reparação/substituição do aviso sonoro e visual de sobrecarga da cabina.",
        "norma": "DL 320/2002, Art. 17.º n.º 5 (conforme relatório de inspeção)",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 1000,
        "zona": "cabina"
    },
    {
        "nome": "Pavimento da cabina — revestimento",
        "grupo": "outro",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Substituição do revestimento do pavimento da cabina.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 1010,
        "zona": "cabina"
    },
    {
        "nome": "Materiais da cabina — combustibilidade",
        "grupo": "outro",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Substituição de materiais da cabina por materiais não perigosos em caso de incêndio.",
        "norma": "Regulamento de Segurança de Elevadores Elétricos (Dec. 513/70), Art. 44.º n.º 2 (conforme relatório de inspeção)",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 1020,
        "zona": "cabina"
    },
    {
        "nome": "Livro de registo de conservação",
        "grupo": "outro",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento de novo livro de registo de conservação.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 1030,
        "zona": "documentos"
    },
    {
        "nome": "Placa do fluido hidráulico",
        "grupo": "outro",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Colocação de placa duradoura com características do fluido hidráulico.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 1040,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Documentos da modificação importante (DL 58/2017, Anexo I; EN 13015)",
        "grupo": "outro",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Elaboração e entrega dos documentos da modificação importante (DL 58/2017, Anexo I; EN 13015).",
        "norma": "DL 58/2017, Anexo I; EN 13015:2001+A1:2008 (conforme relatórios)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Sem documentos da modificação importante, a inspeção classifica C2.",
        "critico": true,
        "ordem": 1050,
        "zona": "documentos"
    },
    {
        "nome": "Validação do cumprimento do DL 58/2017 na substituição parcial",
        "grupo": "outro",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Validação do cumprimento do DL 58/2017 nos componentes substituídos (ex.: quadro de comando, limitadores).",
        "norma": "DL 320/2002, Art. 20.º n.º 2; DL 58/2017 (conforme relatórios)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] A substituição parcial sem validação do cumprimento do DL 58/2017 origina C2.",
        "critico": true,
        "ordem": 1060,
        "zona": "documentos"
    },
    {
        "nome": "Evidência de validação por Organismo Notificado",
        "grupo": "outro",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Obtenção da validação da modernização por Organismo Notificado.",
        "norma": "",
        "notaNaoConformidade": "",
        "critico": false,
        "ordem": 1070,
        "zona": "documentos"
    }
];

async function main() {
    const dry = process.argv.includes('--dry-run');
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/deapseak');
    let criadas = 0, existentes = 0;
    for (const c of categorias) {
        const ja = await OrcamentoCategoria.exists({ nome: c.nome });
        if (ja) { existentes++; continue; }
        if (!dry) await OrcamentoCategoria.updateOne({ nome: c.nome }, { $setOnInsert: { ...c, ativo: true } }, { upsert: true });
        criadas++;
    }
    console.log(`${dry ? '[dry-run] ' : ''}criadas: ${criadas}, já existentes: ${existentes}`);
    await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
