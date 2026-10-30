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
        "nome": "Cabos de suspensão — encurtamento (cabos esticados, fim de curso atua tarde)",
        "grupo": "mecanico",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Encurtamento dos cabos de suspensão com refixação dos terminais e equalização da tensão, para que o fim de curso de segurança atue antes de a cabina/contrapeso assentarem nos pára-choques; inclui ensaio do fim de curso.",
        "norma": "RSEE (Dec. 513/70), Art. 74.º n.º 2 A (fim de curso de segurança)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 74.º n.º 2 A (fim de curso de segurança). Se o fim de curso de segurança só atua depois de a cabina ou o contrapeso já estarem assentes nos pára-choques (amortecedores), os cabos de suspensão alongaram com o uso. O encurtamento dos cabos repõe a posição de paragem e devolve ao fim de curso a sua função de proteção.",
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
        "norma": "RSEE (Dec. 513/70), Art. 74.º n.º 2 A (fim de curso de segurança)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 74.º n.º 2 A (fim de curso de segurança). O fim de curso de segurança tem de atuar antes de a cabina ou o contrapeso assentarem nos pára-choques; se atuar tarde, ou o dispositivo está desafinado ou os cabos alongaram.",
        "critico": false,
        "ordem": 210,
        "zona": "caixa"
    },
    {
        "nome": "Poço — espaço livre sob a cabina inferior a 0,50 m",
        "grupo": "estrutural",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Regularização do espaço livre sob a cabina assente nos pára-choques totalmente comprimidos (mín. 0,50 m): amortecedores de menor curso, plataforma/calços ou rebaixamento do poço, após medição.",
        "norma": "RSEE (Dec. 513/70), Art. 19.º n.º 1",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 19.º n.º 1. Com o poço demasiado raso, a cabina não deixa espaço onde o técnico se proteja. A solução depende das medições e não decorre de cabos esticados.",
        "critico": true,
        "ordem": 220,
        "zona": "poco"
    },
    {
        "nome": "Topo da caixa — altura livre sobre a cabina (contrapeso nos pára-choques)",
        "grupo": "estrutural",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Regularização da altura livre acima da cobertura da cabina quando o contrapeso assenta nos pára-choques (≥ 1 + 0,035V² m): ajuste de amortecedores/contrapeso ou obra no topo da caixa.",
        "norma": "RSEE (Dec. 513/70), Art. 16.º n.º 2",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 16.º n.º 2. No fim do curso, a cabina pode não dispor da altura de segurança sobre a sua cobertura.",
        "critico": true,
        "ordem": 230,
        "zona": "poco"
    },
    {
        "nome": "Contrapeso — curso com a cabina nos pára-choques",
        "grupo": "mecanico",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Regularização do curso do contrapeso com a cabina assente nos pára-choques (≥ 0,035V² m): ajuste de pára-choques e de curso.",
        "norma": "RSEE (Dec. 513/70), Art. 16.º n.º 3",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 16.º n.º 3. Folga de curso insuficiente do contrapeso ao fim do trajeto.",
        "critico": true,
        "ordem": 240,
        "zona": "poco"
    },
    {
        "nome": "Roda tensora do limitador — proteção de saída do cabo",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de proteção contra saída do cabo na roda tensora do limitador de velocidade.",
        "norma": "Relatório de inspeção sem artigo indicado (nota) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Relatório de inspeção sem artigo indicado (nota) [VERIFICAR]. A roda tensora do limitador deve ter proteção que impeça a saída do cabo e a entrada de corpos estranhos.",
        "critico": false,
        "ordem": 250,
        "zona": "maquina"
    },
    {
        "nome": "Gornes — proteção contra saída dos cabos (roda de tração e de desvio)",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de proteção (guarda/varão) nas rodas de tração, de desvio e tensora, impedindo a saída dos cabos dos gornes e o alojamento de corpos estranhos entre os gornes e os cabos.",
        "norma": "RSEE (Dec. 513/70), Art. 64.º n.º 1 A",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 64.º n.º 1 A. Sem esta proteção, um cabo pode saltar do gorne ou ser apanhado por um corpo estranho, com risco de dano grave para o cabo e para quem trabalha na casa das máquinas. É das cláusulas C2 mais repetidas nos relatórios.",
        "critico": true,
        "ordem": 260,
        "zona": "maquina"
    },
    {
        "nome": "Gornes — substituição (desgaste)",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Substituição/maquinagem dos gornes da roda de tração e da roda de desvio com desgaste acentuado.",
        "norma": "RSEE (Dec. 513/70), Art. 6.º (elementos e materiais que garantam o funcionamento regular)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 6.º (elementos e materiais que garantam o funcionamento regular). Gornes com desgaste acentuado danificam os cabos e podem deixar de os reter, comprometendo o funcionamento regular.",
        "critico": false,
        "ordem": 270,
        "zona": "maquina"
    },
    {
        "nome": "Máquina — resguardo de peças rotativas (volante, engrenagens, correias)",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de resguardos nas peças salientes da máquina de tração (volante, engrenagens, correias, rodas).",
        "norma": "RSEE (Dec. 513/70), Art. 85.º",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 85.º. Peças rotativas acessíveis (volante, engrenagens, correias, rodas) podem causar acidentes corporais a quem trabalha na casa das máquinas.",
        "critico": false,
        "ordem": 280,
        "zona": "maquina"
    },
    {
        "nome": "Máquina de tração — reparação de fuga de óleo",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Reparação de fuga de óleo da máquina de tração (substituição de retentores/vedantes, reposição do nível e limpeza).",
        "norma": "RSEE (Dec. 513/70), Art. 6.º (elementos e materiais que garantem o funcionamento regular)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 6.º (elementos e materiais que garantem o funcionamento regular). A fuga de óleo reduz a lubrificação da máquina, suja o travão e a roda de tração e pode afetar a travagem.",
        "critico": false,
        "ordem": 290,
        "zona": "maquina"
    },
    {
        "nome": "Travão — chave de desfrenagem manual",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de chave/alavanca de abertura manual do travão da máquina de tração, guardada junto à máquina e identificada, para a desfrenagem manual em resgate.",
        "norma": "RSEE (Dec. 513/70), Art. 81.º n.º 5 B",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 81.º n.º 5 B. Sem chave de travão, não é possível desfrenar manualmente a máquina para movimentar a cabina em caso de resgate.",
        "critico": true,
        "ordem": 300,
        "zona": "maquina"
    },
    {
        "nome": "Máquina de tração — reparação de folgas no eixo",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Substituição de rolamentos/casquilhos e correção das folgas no eixo da máquina de tração.",
        "norma": "RSEE (Dec. 513/70), Art. 6.º (elementos e materiais que garantem o funcionamento regular) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 6.º (elementos e materiais que garantem o funcionamento regular) [VERIFICAR]. Folgas no eixo provocam desgaste, vibração e desalinhamento da tração, e podem evoluir para avaria da máquina.",
        "critico": false,
        "ordem": 310,
        "zona": "maquina"
    },
    {
        "nome": "Máquina de tração — reparação do apoio (bancada)",
        "grupo": "mecanico",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Reparação/substituição do apoio da máquina de tração (bancada, antivibráticos, fixações).",
        "norma": "Relatório de inspeção: dispositivo mecânico deteriorado a ponto de criar situação perigosa (artigo não indicado) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Relatório de inspeção: dispositivo mecânico deteriorado a ponto de criar situação perigosa (artigo não indicado) [VERIFICAR]. Apoio deteriorado compromete o alinhamento e a tração, com risco de situação perigosa.",
        "critico": true,
        "ordem": 320,
        "zona": "maquina"
    },
    {
        "nome": "Motor de tração — proteção térmica (sonda PTC)",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de sonda térmica (PTC/termístor) nos enrolamentos do motor de tração, ligada ao quadro de comando para paragem do elevador em caso de sobreaquecimento.",
        "norma": "Pontos 13.3.3 e 5.10.4.2 (conforme relatórios de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Pontos 13.3.3 e 5.10.4.2 (conforme relatórios de inspeção) [VERIFICAR]. Um motor sem proteção térmica pode sobreaquecer e queimar ou provocar paragem entre pisos.",
        "critico": true,
        "ordem": 330,
        "zona": "maquina"
    },
    {
        "nome": "Controlo de temperatura (sonda e alarme no quadro)",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de sonda de temperatura na casa das máquinas ligada ao quadro de comando, com alarme/paragem fora do intervalo +5 °C a +40 °C.",
        "norma": "Ponto 0.4.17 (conforme relatórios de inspeção): temperatura entre +5 °C e +40 °C",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 0.4.17 (conforme relatórios de inspeção): temperatura entre +5 °C e +40 °C. A casa das máquinas deve manter-se entre +5 °C e +40 °C para o funcionamento fiável do quadro e do variador; sem monitorização, não há aviso de sobreaquecimento.",
        "critico": true,
        "ordem": 340,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Travão — monitorização",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de dispositivos de monitorização do travão da máquina de tração (microinterruptores/sensores) ligados ao circuito de comando.",
        "norma": "EN 81-20:2014, ponto 5.9.2.2.2 (conforme relatório de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: EN 81-20:2014, ponto 5.9.2.2.2 (conforme relatório de inspeção). Sem monitorização, uma falha no travão pode passar despercebida.",
        "critico": true,
        "ordem": 350,
        "zona": "maquina"
    },
    {
        "nome": "Interruptor geral — junto à máquina / dispositivo STOP",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Deslocação do interruptor geral para junto da máquina (máx. 1 m) ou instalação de dispositivo de paragem (STOP) junto à máquina.",
        "norma": "Ponto 5.12.1.11 (conforme relatório de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 5.12.1.11 (conforme relatório de inspeção) [VERIFICAR]. Com o interruptor geral a mais de 1 m da máquina e sem dispositivo de paragem, o técnico não consegue cortar a energia em segurança junto à máquina.",
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
        "norma": "Ponto 9.9.11.1 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 9.9.11.1 (conforme relatórios de inspeção). Se o limitador não parar a máquina na subida, perde-se a proteção contra excesso de velocidade.",
        "critico": true,
        "ordem": 370,
        "zona": "maquina"
    },
    {
        "nome": "Excesso de velocidade na subida — proteção da cabina",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Instalação/regularização do dispositivo de proteção contra velocidade excessiva da cabina no sentido de subida (paragem ou redução da velocidade) e respetivo ensaio.",
        "norma": "Ponto 9.10.1 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 9.10.1 (conforme relatórios de inspeção). Sem este dispositivo, a cabina pode subir sem controlo (ex.: falha do travão ou da tração com contrapeso mais pesado).",
        "critico": true,
        "ordem": 380,
        "zona": "maquina"
    },
    {
        "nome": "Limitador de velocidade — substituição (desgaste/oxidação)",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Substituição do limitador de velocidade com desgaste/oxidação, com selagem e ensaio de atuação.",
        "norma": "RSEE (Dec. 513/70), Art. 67.º; ponto 9.9 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 67.º; ponto 9.9 (conforme relatórios de inspeção). O limitador de velocidade desgastado ou oxidado pode não atuar na velocidade certa, e é o órgão que aciona o paraquedas.",
        "critico": false,
        "ordem": 390,
        "zona": "maquina"
    },
    {
        "nome": "Limitador de velocidade — substituição do cabo (oxidação/desgaste/aderência)",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Substituição do cabo do limitador de velocidade e verificação da aderência na roda.",
        "norma": "Pontos 9.9.4 e 9.9.6 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Pontos 9.9.4 e 9.9.6 (conforme relatórios de inspeção). Se o cabo do limitador perder aderência ou estiver oxidado, o limitador pode não acionar o paraquedas a tempo.",
        "critico": false,
        "ordem": 400,
        "zona": "maquina"
    },
    {
        "nome": "Limitador de velocidade — selagem",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Selagem do limitador de velocidade após regulação e ensaio.",
        "norma": "RSEE (Dec. 513/70), Art. 67.º n.º 5",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 67.º n.º 5. O limitador deve estar selado após a regulação, para garantir que a velocidade de atuação não é alterada.",
        "critico": false,
        "ordem": 410,
        "zona": "maquina"
    },
    {
        "nome": "Limitador de velocidade — fixação (pontos de fixação)",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Reforço da fixação do limitador de velocidade a todos os pontos previstos pelo fabricante.",
        "norma": "RSEE (Dec. 513/70), Art. 6.º (limitador fixo a apenas 2 dos 6 pontos de fixação)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 6.º (limitador fixo a apenas 2 dos 6 pontos de fixação). O limitador tem de estar fixo a todos os pontos previstos; com fixação parcial pode soltar-se ao atuar.",
        "critico": false,
        "ordem": 420,
        "zona": "maquina"
    },
    {
        "nome": "Imobilização anormal da cabina/contrapeso — dispositivo de paragem",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Instalação/reparação de dispositivo de paragem da máquina em caso de imobilização anormal da cabina ou contrapeso (temporizador de proteção contra bloqueio) no quadro de comando.",
        "norma": "RSEE (Dec. 513/70), Art. 75.º n.º 2 (conforme relatório de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 75.º n.º 2 (conforme relatório de inspeção) [VERIFICAR]. Sem este dispositivo, o motor pode continuar a tracionar contra uma cabina ou contrapeso bloqueados, com risco de dano e de situação perigosa.",
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
        "norma": "EN 81-20:2014, ponto 5.12.1.8.3 d)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: EN 81-20:2014, ponto 5.12.1.8.3 d). Ao ativar o bypass das portas, tem de haver um sinal independente que confirme que a porta de cabina está fechada.",
        "critico": true,
        "ordem": 440,
        "zona": "quadro"
    },
    {
        "nome": "UCM (movimento incontrolável) — condições de ensaio",
        "grupo": "seguranca",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Adaptação do quadro de comando para permitir o ensaio de movimento incontrolável da cabina com porta aberta (UCM).",
        "norma": "EN 81-20 (conforme relatório de inspeção; ponto a confirmar — UCM) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: EN 81-20 (conforme relatório de inspeção; ponto a confirmar — UCM) [VERIFICAR]. Sem condições de ensaio, a proteção UCM não pode ser verificada pelo inspetor.",
        "critico": true,
        "ordem": 450,
        "zona": "quadro"
    },
    {
        "nome": "Modo bombeiros — condições de ensaio",
        "grupo": "seguranca",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Adaptação do quadro de comando para permitir o ensaio do comportamento em caso de incêndio (modo bombeiros).",
        "norma": "EN 81-20 (conforme relatório de inspeção; ponto a confirmar — comportamento de bombeiros) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: EN 81-20 (conforme relatório de inspeção; ponto a confirmar — comportamento de bombeiros) [VERIFICAR]. Sem condições de ensaio, o modo bombeiros não pode ser verificado.",
        "critico": true,
        "ordem": 460,
        "zona": "quadro"
    },
    {
        "nome": "Comunicação bidirecional — cobertura da cabina e poço",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de dispositivos de comunicação bidirecional (pedido de socorro) na cobertura da cabina e no poço, ligados ao serviço de socorro.",
        "norma": "Pontos 5.10 e 5.12.3.1; DL 295/98 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Pontos 5.10 e 5.12.3.1; DL 295/98 (conforme relatórios de inspeção). Um técnico preso no topo da cabina ou no poço tem de poder pedir socorro; sistemas de socorro inoperacionais nesses locais originam C2.",
        "critico": true,
        "ordem": 470,
        "zona": "poco"
    },
    {
        "nome": "Intercomunicador — casa das máquinas–cabina (curso > 30 m)",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Instalação de intercomunicador ou dispositivo análogo alimentado por fonte de segurança entre o local de resgate e a cabina (curso superior a 30 m).",
        "norma": "Ponto 14.2.3.4; DL 295/98 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 14.2.3.4; DL 295/98 (conforme relatórios de inspeção). Em cursos superiores a 30 m, o resgate sem comunicação direta é demorado e inseguro.",
        "critico": true,
        "ordem": 480,
        "zona": "cabina"
    },
    {
        "nome": "Pedido de socorro — sinalização do elevador de origem",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Reparação/instalação da sinalização que identifica de que elevador provém o pedido de socorro.",
        "norma": "Ponto 15.12 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 15.12 (conforme relatórios de inspeção). Em instalações com vários elevadores, o pedido de socorro tem de indicar de que elevador provém.",
        "critico": false,
        "ordem": 490,
        "zona": "cabina"
    },
    {
        "nome": "Iluminação de emergência no teto",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de iluminação de emergência (autónoma) no teto da cabina.",
        "norma": "Ponto 5.4.10.4 (conforme relatório de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 5.4.10.4 (conforme relatório de inspeção). Em falha de energia, o técnico no teto da cabina fica sem luz para o resgate.",
        "critico": true,
        "ordem": 500,
        "zona": "cabina"
    },
    {
        "nome": "Iluminação (≥ 50 lux) — luminárias/LED",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Substituição de luminárias da cabina por LED, garantindo no mínimo 50 lux no pavimento e sobre os órgãos de comando.",
        "norma": "Ponto 8.17.1; DL 295/98 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 8.17.1; DL 295/98 (conforme relatórios de inspeção). A cabina deve ter iluminação permanente de pelo menos 50 lux no pavimento e sobre os órgãos de comando.",
        "critico": false,
        "ordem": 510,
        "zona": "cabina"
    },
    {
        "nome": "Iluminação (≥ 50 lux) — luminárias",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Substituição/instalação de luminárias nos patamares para ≥ 50 lux.",
        "norma": "Ponto 7.6.1 (conforme relatório de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 7.6.1 (conforme relatório de inspeção) [VERIFICAR]. Os patamares devem ter iluminação mínima de 50 lux para uso seguro da entrada e saída.",
        "critico": false,
        "ordem": 520,
        "zona": "patamar"
    },
    {
        "nome": "Iluminação do acesso — luminárias",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Substituição de luminárias do acesso à casa das máquinas.",
        "norma": "Ponto 6.3.6 (conforme relatório de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 6.3.6 (conforme relatório de inspeção) [VERIFICAR]. O acesso à casa das máquinas deve estar iluminado para circulação segura.",
        "critico": false,
        "ordem": 530,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Proteção diferencial 30 mA — tomadas e iluminação",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de aparelhagem de proteção diferencial de alta sensibilidade (≤ 30 mA) nos circuitos de tomadas e iluminação da casa das máquinas.",
        "norma": "DL 740/74 e Portaria 949-A/2006 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: DL 740/74 e Portaria 949-A/2006 (conforme relatórios de inspeção). Sem proteção diferencial de alta sensibilidade (≤ 30 mA), um contacto indireto com a massa pode ser perigoso para o técnico.",
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
        "norma": "DL 740/74 e Portaria 949-A/2006 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: DL 740/74 e Portaria 949-A/2006 (conforme relatórios de inspeção). Sem proteção diferencial nas saídas, existe risco de contacto indireto.",
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
        "norma": "DL 740/74 e Portaria 949-A/2006 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: DL 740/74 e Portaria 949-A/2006 (conforme relatórios de inspeção). Ligações acessíveis sob tensão representam risco de eletrocussão para quem acede ao quadro.",
        "critico": true,
        "ordem": 560,
        "zona": "quadro"
    },
    {
        "nome": "Proteção diferencial — tipo B para variador / ordem das proteções",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de proteção diferencial tipo B para o circuito com variador de frequência e correção da ordem das proteções do circuito de força motriz.",
        "norma": "EN 50678:1998 / EN 62477-1:2012; ponto 13.1 (conforme relatórios de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: EN 50678:1998 / EN 62477-1:2012; ponto 13.1 (conforme relatórios de inspeção) [VERIFICAR]. Circuitos com variador de frequência exigem proteção diferencial adequada (tipo B), instalada na ordem correta face à magnetotérmica.",
        "critico": false,
        "ordem": 570,
        "zona": "quadro"
    },
    {
        "nome": "Quadro elétrico — identificação de circuitos e proteções (em português)",
        "grupo": "eletrico",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Identificação e etiquetagem, em português, dos circuitos e proteções do quadro elétrico da casa das máquinas.",
        "norma": "Pontos 15.1 e 15.4.2 (conforme relatórios de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Pontos 15.1 e 15.4.2 (conforme relatórios de inspeção) [VERIFICAR]. Circuitos e proteções devem estar identificados, em português, para intervenção segura.",
        "critico": false,
        "ordem": 580,
        "zona": "quadro"
    },
    {
        "nome": "Zonas com altura < 1,80 m — sinalização/proteção",
        "grupo": "estrutural",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Sinalização (pintura e aviso de uso de capacete) e proteção das zonas de circulação da casa das máquinas com altura inferior a 1,80 m e espaço livre insuficiente diante dos aparelhos elétricos.",
        "norma": "Ponto 6.3.2.2; RSEE (Dec. 513/70), Art. 24.º n.º 2 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 6.3.2.2; RSEE (Dec. 513/70), Art. 24.º n.º 2 (conforme relatórios de inspeção). Zonas de circulação com altura inferior a 1,80 m devem estar sinalizadas e protegidas para evitar pancadas na cabeça.",
        "critico": false,
        "ordem": 590,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Impermeabilização (infiltração de água)",
        "grupo": "estrutural",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Impermeabilização da casa das máquinas e vedação da ventilação para impedir a entrada de água.",
        "norma": "Ponto 6.3.5.1; RSEE (Dec. 513/70), Art. 27.º (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 6.3.5.1; RSEE (Dec. 513/70), Art. 27.º (conforme relatórios de inspeção). A casa das máquinas deve estar ao abrigo da humidade e da água; infiltrações danificam quadro, máquina e instalação elétrica.",
        "critico": false,
        "ordem": 600,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Humidade — tratamento de vestígios",
        "grupo": "estrutural",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Tratamento de vestígios de humidade (secagem, pintura anti-humidade) na casa das máquinas.",
        "norma": "Ponto 6.3.5.1; DL 295/98; RSEE (Dec. 513/70), Art. 27.º (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 6.3.5.1; DL 295/98; RSEE (Dec. 513/70), Art. 27.º (conforme relatórios de inspeção). Vestígios de humidade na casa das máquinas aceleram a oxidação e a degradação do equipamento elétrico e mecânico.",
        "critico": false,
        "ordem": 610,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Ventilação",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de ventilação (grelha/extrator) na casa das máquinas.",
        "norma": "RSEE (Dec. 513/70), Art. 27.º (conforme relatório de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 27.º (conforme relatório de inspeção) [VERIFICAR]. A casa das máquinas deve ser bem ventilada para evacuar o calor dissipado pelo equipamento.",
        "critico": false,
        "ordem": 620,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Incidência solar direta — proteção",
        "grupo": "estrutural",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Proteção (película/cortina/anteparo) contra a incidência direta de raios solares nos órgãos da instalação.",
        "norma": "RSEE (Dec. 513/70), Art. 29.º n.º 3 (conforme relatório de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 29.º n.º 3 (conforme relatório de inspeção) [VERIFICAR]. Os órgãos da instalação não devem receber raios solares diretos, que sobreaquecem e degradam o equipamento.",
        "critico": false,
        "ordem": 630,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Vedação (porta com fechadura)",
        "grupo": "estrutural",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Vedação da casa das máquinas com porta com fechadura.",
        "norma": "RSEE (Dec. 513/70), Art. 22.º n.º 1 (conforme relatório de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 22.º n.º 1 (conforme relatório de inspeção). A casa das máquinas deve estar fechada a pessoas não autorizadas.",
        "critico": true,
        "ordem": 640,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Portas e alçapões — abertura interior sem chave",
        "grupo": "estrutural",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Instalação de fechadura antipânico/abertura interior sem chave nas portas e alçapões da casa das máquinas.",
        "norma": "RSEE (Dec. 513/70), Art. 25.º n.º 3",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 25.º n.º 3. Quem está na casa das máquinas tem de poder sair sem chave.",
        "critico": true,
        "ordem": 650,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Alçapão contrabalançado — acesso seguro",
        "grupo": "estrutural",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Instalação de contrapeso/mola de gás no alçapão de acesso à casa das máquinas e adequação do acesso para ser fácil e seguro.",
        "norma": "RSEE (Dec. 513/70), Art. 22.º n.º 2 (conforme relatório de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 22.º n.º 2 (conforme relatório de inspeção). Um alçapão pesado e sem contrabalanço é risco de queda e de esmagamento.",
        "critico": true,
        "ordem": 660,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Suporte metálico/gancho de içamento",
        "grupo": "estrutural",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de suporte metálico/gancho no teto da casa das máquinas para montagem e desmontagem de material pesado, com indicação da carga máxima admissível.",
        "norma": "RSEE (Dec. 513/70), Art. 6.º; Art. 30.º (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 6.º; Art. 30.º (conforme relatórios de inspeção). Deve existir no teto da casa das máquinas um suporte ou gancho (com carga máxima indicada) para montar e desmontar material pesado.",
        "critico": false,
        "ordem": 670,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Elementos construtivos — reparação",
        "grupo": "estrutural",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Reparação de pavimento, paredes, cobertura, portas, alçapões e escadas da casa das máquinas.",
        "norma": "RSEE (Dec. 513/70), Art. 23.º n.º 2 (conforme relatório de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 23.º n.º 2 (conforme relatório de inspeção) [VERIFICAR]. Pavimento, paredes, cobertura, portas, alçapões e escadas da casa das máquinas devem ter resistência mecânica suficiente.",
        "critico": false,
        "ordem": 680,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Identificação dos elevadores — placas (piso principal e casa das máquinas)",
        "grupo": "outro",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Colocação de placas de identificação dos elevadores no piso principal e das máquinas na casa das máquinas comum.",
        "norma": "RSEE (Dec. 513/70), Art. 96.º n.os 1 e 2 A",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 96.º n.os 1 e 2 A. Na casa das máquinas e no piso principal, cada elevador/máquina deve estar identificado, para evitar intervenção no elevador errado.",
        "critico": false,
        "ordem": 690,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Instruções de manobra — movimento manual da cabina",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Elaboração e afixação de instruções de movimento manual da cabina conformes com o equipamento instalado.",
        "norma": "RSEE (Dec. 513/70), Art. 105.º; EN 81-20:2014, ponto 5.2.6.2.3",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 105.º; EN 81-20:2014, ponto 5.2.6.2.3. Instruções ausentes ou não conformes com o equipamento podem causar resgate improvisado e acidente.",
        "critico": true,
        "ordem": 700,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Instruções de resgate — chave de desencravamento (paragem intempestiva)",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Afixação, na casa das máquinas/painel de emergência, de instruções pormenorizadas para paragem intempestiva: operação do dispositivo de resgate e uso da chave de desencravamento.",
        "norma": "RSEE (Dec. 513/70), Art. 95.º (conforme relatório de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 95.º (conforme relatório de inspeção) [VERIFICAR]. Sem instruções afixadas, o socorro não é executável em segurança.",
        "critico": true,
        "ordem": 710,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Chave de desencravamento — aviso de perigo",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Afixação de aviso do perigo de utilização da chave de desencravamento.",
        "norma": "Ponto 15.11 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 15.11 (conforme relatórios de inspeção). Junto à chave de desencravamento deve existir aviso do perigo da sua utilização.",
        "critico": false,
        "ordem": 720,
        "zona": "patamar"
    },
    {
        "nome": "Cabos de suspensão — marcação da zona de desencravamento",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Marcação dos cabos de suspensão na zona de desencravamento.",
        "norma": "RSEE (Dec. 513/70), Art. 105.º (conforme relatório de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 105.º (conforme relatório de inspeção) [VERIFICAR]. Os cabos devem ter marcações facilmente identificáveis que indiquem que a cabina está na zona de desencravamento.",
        "critico": false,
        "ordem": 730,
        "zona": "caixa"
    },
    {
        "nome": "Espaço de refúgio — sinalização (poço e topo da cabina)",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Sinalização do espaço de refúgio (postura/nº de pessoas) no poço e no topo da cabina e correção do espaço de refúgio, se inferior ao sinalizado.",
        "norma": "EN 81-20:2014, ponto 5.2.5.7.1 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: EN 81-20:2014, ponto 5.2.5.7.1 (conforme relatórios de inspeção). Quem trabalha no poço ou no topo da cabina tem de ter um espaço de refúgio sinalizado.",
        "critico": true,
        "ordem": 740,
        "zona": "poco"
    },
    {
        "nome": "Espaço de refúgio — aviso de nº de pessoas e postura",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Afixação de aviso legível a partir dos patamares/entrada com o nº de pessoas e a postura do espaço de refúgio.",
        "norma": "EN 81-20:2014, pontos 5.2.5.7.1 e 5.2.6.3.2.1 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: EN 81-20:2014, pontos 5.2.5.7.1 e 5.2.6.3.2.1 (conforme relatórios de inspeção). No poço e no teto da cabina deve existir aviso legível, a partir dos acessos, do nº de pessoas e da postura admitidos no espaço de refúgio.",
        "critico": false,
        "ordem": 750,
        "zona": "poco"
    },
    {
        "nome": "Balaustrada na cobertura",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de balaustrada na cobertura da cabina.",
        "norma": "Ponto 8.3.2 (conforme relatório de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 8.3.2 (conforme relatório de inspeção) [VERIFICAR]. A cobertura da cabina deve ter balaustrada contra o risco de queda de quem trabalha no topo.",
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
        "norma": "RSEE (Dec. 513/70), Art. 9.º n.º 3 e Art. 15.º n.º 1 (conforme relatório de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 9.º n.º 3 e Art. 15.º n.º 1 (conforme relatório de inspeção) [VERIFICAR]. Sem divisória, quem trabalha num elevador fica exposto às peças em movimento do adjacente.",
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
        "norma": "Ponto 5.6.1 (conforme relatório de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 5.6.1 (conforme relatório de inspeção) [VERIFICAR]. Aberturas grandes permitem acesso a peças em movimento do elevador adjacente.",
        "critico": true,
        "ordem": 780,
        "zona": "poco"
    },
    {
        "nome": "Contrapeso — resguardo/divisória de proteção no poço (2 m)",
        "grupo": "estrutural",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Instalação de resguardo/divisória de proteção do contrapeso no poço (altura mínima 2 m; abertura inferior ≤ 0,30 m).",
        "norma": "EN 81-20:2014, pontos 5.2.5 e 5.2.5.5.1 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: EN 81-20:2014, pontos 5.2.5 e 5.2.5.5.1 (conforme relatórios de inspeção). O contrapeso deve estar protegido no poço (altura mínima 2 m) para impedir o acesso a peças em movimento.",
        "critico": false,
        "ordem": 790,
        "zona": "poco"
    },
    {
        "nome": "Contrapeso — folga com a cabina e estrutura",
        "grupo": "mecanico",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Ajuste de guias para folga cabina–contrapeso ≥ 5 cm e reforço da estrutura de perfilados do contrapeso.",
        "norma": "RSEE (Dec. 513/70), Art. 76.º n.º 1 e Art. 55.º n.º 2 (conforme relatórios de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 76.º n.º 1 e Art. 55.º n.º 2 (conforme relatórios de inspeção) [VERIFICAR]. A folga entre cabina e contrapeso deve ser de pelo menos 5 cm, e o contrapeso deve ter estrutura de perfilados que impeça a queda dos blocos.",
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
        "norma": "RSEE (Dec. 513/70), Art. 13.º (conforme relatórios de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 13.º (conforme relatórios de inspeção) [VERIFICAR]. As faces da caixa na zona de acessos devem ser contínuas e lisas para permitir o desencravamento seguro.",
        "critico": false,
        "ordem": 810,
        "zona": "caixa"
    },
    {
        "nome": "Instalações estranhas ao serviço — retirada",
        "grupo": "estrutural",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Retirada de instalações/materiais estranhos ao serviço do ascensor.",
        "norma": "RSEE (Dec. 513/70), Art. 28.º A",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 28.º A. A casa das máquinas e a caixa não podem ser usadas para fins alheios ao elevador.",
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
        "norma": "Ponto 14.2.2.1 (DL 295/98, conforme relatório de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 14.2.2.1 (DL 295/98, conforme relatório de inspeção). Sem inversão do fecho, a porta pode prender a pessoa que entra.",
        "critico": true,
        "ordem": 830,
        "zona": "patamar"
    },
    {
        "nome": "Portas de patamar — batentes de amortecimento do fecho",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Substituição/afinação de batentes de amortecimento das portas de patamar.",
        "norma": "Anexo D.2.a; ponto 16.1.3 (conforme relatório de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Anexo D.2.a; ponto 16.1.3 (conforme relatório de inspeção) [VERIFICAR]. Batentes inoperacionais fazem a porta bater e danificam fechos e contactos.",
        "critico": true,
        "ordem": 840,
        "zona": "patamar"
    },
    {
        "nome": "Portas de patamar — visor (dimensão ≤ 15 cm)",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Substituição de visor das portas de patamar com ambas as dimensões superiores a 15 cm.",
        "norma": "RSEE (Dec. 513/70), Art. 33.º (conforme relatório de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 33.º (conforme relatório de inspeção) [VERIFICAR]. Visor fora da dimensão regulamentar.",
        "critico": true,
        "ordem": 850,
        "zona": "patamar"
    },
    {
        "nome": "Indicação da presença da cabina / luz permanente",
        "grupo": "seguranca",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Instalação de indicação da presença da cabina nos patamares e de luz da cabina permanentemente acesa ou ligada ao botão de chamada.",
        "norma": "Relatório de inspeção (artigo não indicado) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Relatório de inspeção (artigo não indicado) [VERIFICAR]. Com visor opaco e sem indicação, o utilizador pode abrir a porta sem saber se a cabina lá está.",
        "critico": true,
        "ordem": 860,
        "zona": "patamar"
    },
    {
        "nome": "Soleiras cabina/patamar — ajuste de folga (≤ 2 cm)",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Ajuste de soleiras para que a folga entre soleira da cabina e soleira de patamar não exceda 2 cm.",
        "norma": "RSEE (Dec. 513/70), Art. 78.º n.º 2",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 78.º n.º 2. Folga excessiva representa risco de queda de objetos ou pés.",
        "critico": true,
        "ordem": 870,
        "zona": "patamar"
    },
    {
        "nome": "Igualizador de tensão dos cabos — substituição das molas",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Substituição das molas do dispositivo de igualização da tensão dos cabos.",
        "norma": "Ponto 9.5.1 (conforme relatório de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 9.5.1 (conforme relatório de inspeção) [VERIFICAR]. As molas do igualizador mantêm a tensão igual nos cabos; oxidadas, deixam de a equalizar e aceleram o desgaste dos cabos.",
        "critico": false,
        "ordem": 880,
        "zona": "caixa"
    },
    {
        "nome": "Cabos de suspensão — substituição (desgaste, fios partidos)",
        "grupo": "mecanico",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Substituição do conjunto de cabos de suspensão da cabina/contrapeso.",
        "norma": "Ponto 9.2.2; RSEE (Dec. 513/70), Art. 109.º (conforme relatórios de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 9.2.2; RSEE (Dec. 513/70), Art. 109.º (conforme relatórios de inspeção) [VERIFICAR]. Cabos com desgaste, corrosão ou fios partidos perdem resistência e têm de ser substituídos em jogo completo.",
        "critico": false,
        "ordem": 890,
        "zona": "caixa"
    },
    {
        "nome": "Amortecedores/pára-choques — substituição",
        "grupo": "mecanico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Tratamento ou substituição de amortecedores da cabina e do contrapeso com oxidação acentuada.",
        "norma": "Ponto 10.3.1 (conforme relatórios de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 10.3.1 (conforme relatórios de inspeção) [VERIFICAR]. Amortecedores oxidados podem não absorver o impacto da cabina ou do contrapeso no fim de curso.",
        "critico": false,
        "ordem": 900,
        "zona": "poco"
    },
    {
        "nome": "Marcação CE",
        "grupo": "outro",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Colocação de marcação CE clara e visível na cabina.",
        "norma": "Diretiva 95/16/CE, Art. 10.º n.º 2 (conforme relatório de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Diretiva 95/16/CE, Art. 10.º n.º 2 (conforme relatório de inspeção). A cabina deve ter marcação CE de conformidade clara e visível.",
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
        "norma": "RSEE (Dec. 513/70), Art. 6.º (conforme relatórios de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 6.º (conforme relatórios de inspeção) [VERIFICAR]. Oxidação acentuada nas portas de patamar compromete a sua função de proteção e o funcionamento regular.",
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
        "norma": "RSEE (Dec. 513/70), Art. 6.º (conforme relatório de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 6.º (conforme relatório de inspeção). Pontos de oxidação na porta e estruturas metálicas degradam-nas e comprometem o funcionamento regular.",
        "critico": false,
        "ordem": 930,
        "zona": "casa_maquinas"
    },
    {
        "nome": "Botão de abertura da porta",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Fornecimento e instalação de botão de abertura da porta de cabina.",
        "norma": "Ponto 5.3.6.3 (conforme relatório de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 5.3.6.3 (conforme relatório de inspeção) [VERIFICAR]. Sem botão de abertura da porta, o utilizador não consegue reabrir a porta.",
        "critico": true,
        "ordem": 940,
        "zona": "cabina"
    },
    {
        "nome": "Botão STOP — posição e cor",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Reposicionamento (acima dos restantes botões) e cor vermelha do botão STOP da cabina.",
        "norma": "RSEE (Dec. 513/70), Art. 93.º n.º 1 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 93.º n.º 1 (conforme relatórios de inspeção). O botão STOP da cabina deve estar acima dos restantes botões e ser vermelho.",
        "critico": false,
        "ordem": 950,
        "zona": "cabina"
    },
    {
        "nome": "Botões — identificação",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Identificação dos botões da cabina.",
        "norma": "Ponto 15.2.3.2 (conforme relatório de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 15.2.3.2 (conforme relatório de inspeção) [VERIFICAR]. Os botões da cabina devem estar identificados para o utilizador distinguir as funções.",
        "critico": false,
        "ordem": 960,
        "zona": "cabina"
    },
    {
        "nome": "Setas/sinalizadores",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Reparação/substituição de setas de patamar inoperacionais.",
        "norma": "RSEE (Dec. 513/70), Art. 91.º (conforme relatório de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 91.º (conforme relatório de inspeção) [VERIFICAR]. As setas dos patamares devem funcionar para indicar o sentido do movimento.",
        "critico": false,
        "ordem": 970,
        "zona": "patamar"
    },
    {
        "nome": "Número de identificação do elevador",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Renovação do número de identificação do elevador e display legível.",
        "norma": "Ponto 15.2.2 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 15.2.2 (conforme relatórios de inspeção). O número de identificação do elevador na cabina deve estar legível.",
        "critico": false,
        "ordem": 980,
        "zona": "cabina"
    },
    {
        "nome": "Mensagem de voz de posição",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Instalação de módulo de voz para anunciar a posição da cabina.",
        "norma": "EN 81-70:2021, ponto 5.4.4.2",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: EN 81-70:2021, ponto 5.4.4.2. Quando a cabina para, uma mensagem de voz deve indicar a sua posição, para acessibilidade.",
        "critico": false,
        "ordem": 990,
        "zona": "cabina"
    },
    {
        "nome": "Sobrecarga — sinalização sonora e visual",
        "grupo": "eletrico",
        "unidade": "un",
        "precoSugerido": 0,
        "descricao": "Reparação/substituição do aviso sonoro e visual de sobrecarga da cabina.",
        "norma": "DL 320/2002, Art. 17.º n.º 5",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: DL 320/2002, Art. 17.º n.º 5. O dispositivo sonoro e visual de sobrecarga deve estar operacional para impedir viagens acima da carga nominal.",
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
        "norma": "Ponto 8.3.2; RSEE (Dec. 513/70), Art. 44.º (conforme relatórios de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Ponto 8.3.2; RSEE (Dec. 513/70), Art. 44.º (conforme relatórios de inspeção) [VERIFICAR]. Revestimento irregular ou danificado do pavimento da cabina representa risco de tropeção.",
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
        "norma": "RSEE (Dec. 513/70), Art. 44.º n.º 2",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 44.º n.º 2. Os materiais da cabina não podem ser perigosos pela sua inflamabilidade ou pelos gases e fumos libertados em caso de incêndio.",
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
        "norma": "RSEE (Dec. 513/70), Art. 10.º (conforme relatório de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: RSEE (Dec. 513/70), Art. 10.º (conforme relatório de inspeção) [VERIFICAR]. O livro de registo de conservação deve existir em bom estado, com as visitas e intervenções registadas.",
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
        "norma": "Relatório de inspeção sem artigo indicado (nota) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Relatório de inspeção sem artigo indicado (nota) [VERIFICAR]. O reservatório deve ter indicadas, em material durável e indelével, as características do fluido hidráulico.",
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
        "norma": "DL 58/2017, Anexo I; EN 13015:2001+A1:2008 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: DL 58/2017, Anexo I; EN 13015:2001+A1:2008 (conforme relatórios de inspeção). Sem documentos da modificação importante, a inspeção classifica C2.",
        "critico": true,
        "ordem": 1050,
        "zona": "documentos"
    },
    {
        "nome": "DL 58/2017 — validação do cumprimento na substituição parcial",
        "grupo": "outro",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Validação do cumprimento do DL 58/2017 nos componentes substituídos (ex.: quadro de comando, limitadores).",
        "norma": "DL 320/2002, Art. 20.º n.º 2; DL 58/2017 (conforme relatórios de inspeção)",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: DL 320/2002, Art. 20.º n.º 2; DL 58/2017 (conforme relatórios de inspeção). A substituição parcial sem validação do cumprimento do DL 58/2017 origina C2.",
        "critico": true,
        "ordem": 1060,
        "zona": "documentos"
    },
    {
        "nome": "Organismo Notificado — evidência de validação",
        "grupo": "outro",
        "unidade": "verba",
        "precoSugerido": 0,
        "descricao": "Obtenção da validação da modernização por Organismo Notificado.",
        "norma": "Requisitos do DL 58/2017 / ponto 2 das OMS (conforme relatório de inspeção) — [VERIFICAR]",
        "notaNaoConformidade": "[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Artigo: Requisitos do DL 58/2017 / ponto 2 das OMS (conforme relatório de inspeção) [VERIFICAR]. Após modernização parcial importante deve existir evidência da validação por um Organismo Notificado.",
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
