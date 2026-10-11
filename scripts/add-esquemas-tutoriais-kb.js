// scripts/add-esquemas-tutoriais-kb.js — Artigos de esquemas (SVG), tutoriais passo a passo,
// segurança e resolução de problemas para a página AR/Manuais do técnico.
// Idempotente: faz upsert por título, não apaga artigos existentes.
require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME   = process.env.DB_NAME || 'deapseak';

const now = new Date();

function table(headers, rows) {
  const thead = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<div class="table-responsive"><table class="table table-bordered table-sm">${thead}${tbody}</table></div>`;
}

function legend(items) {
  return `<ol>${items.map(i => `<li>${i}</li>`).join('')}</ol>`;
}

const S = 'font-family:Arial,Helvetica,sans-serif';
// marcador numerado
const mk = (n, x, y) =>
  `<circle cx="${x}" cy="${y}" r="10" fill="#dc3545"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="12" font-weight="bold" fill="#fff" style="${S}">${n}</text>`;
// caixa com texto (1 ou 2 linhas)
const box = (x, y, w, h, l1, l2, fill = '#e7f1ff', stroke = '#0d6efd') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>` +
  (l2
    ? `<text x="${x + w / 2}" y="${y + h / 2 - 3}" text-anchor="middle" font-size="12" fill="#212529" style="${S}">${l1}</text>` +
      `<text x="${x + w / 2}" y="${y + h / 2 + 12}" text-anchor="middle" font-size="12" fill="#212529" style="${S}">${l2}</text>`
    : `<text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle" font-size="12" fill="#212529" style="${S}">${l1}</text>`);

const arrowDefs = `<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#495057"/></marker></defs>`;
const arrow = (x1, y1, x2, y2) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#495057" stroke-width="2" marker-end="url(#ar)"/>`;

const svgWrap = (vb, body, alt) =>
  `<div class="text-center my-3"><svg viewBox="${vb}" width="100%" style="max-width:640px;background:#fff;border:1px solid #dee2e6;border-radius:8px" role="img" aria-label="${alt}">${arrowDefs}${body}</svg></div>`;

// ─── ESQUEMA 1: elevador de tração ──────────────────────────────────────────
const tracaoSvg = svgWrap('0 0 520 500', `
  <rect x="110" y="20" width="310" height="80" fill="#f1f3f5" stroke="#6c757d" stroke-width="2"/>
  <text x="115" y="34" font-size="10" fill="#6c757d" style="${S}">Casa das máquinas</text>
  <rect x="130" y="100" width="270" height="380" fill="#fff" stroke="#6c757d" stroke-width="2"/>
  <line x1="130" y1="440" x2="400" y2="440" stroke="#adb5bd" stroke-dasharray="4 3"/>
  <text x="136" y="456" font-size="10" fill="#6c757d" style="${S}">Poço</text>
  <!-- guias -->
  <line x1="172" y1="100" x2="172" y2="480" stroke="#adb5bd" stroke-width="4"/>
  <line x1="298" y1="100" x2="298" y2="480" stroke="#adb5bd" stroke-width="4"/>
  <line x1="324" y1="100" x2="324" y2="480" stroke="#adb5bd" stroke-width="4"/>
  <line x1="384" y1="100" x2="384" y2="480" stroke="#adb5bd" stroke-width="4"/>
  <!-- máquina e roldanas -->
  <circle cx="265" cy="62" r="30" fill="#ffe8cc" stroke="#fd7e14" stroke-width="2"/>
  <circle cx="265" cy="62" r="6" fill="#fd7e14"/>
  <circle cx="340" cy="62" r="14" fill="#e9ecef" stroke="#495057" stroke-width="2"/>
  <!-- cabos -->
  <line x1="235" y1="62" x2="235" y2="180" stroke="#212529" stroke-width="2"/>
  <line x1="295" y1="62" x2="326" y2="62" stroke="#212529" stroke-width="2"/>
  <line x1="354" y1="62" x2="354" y2="180" stroke="#212529" stroke-width="2"/>
  <!-- cabine -->
  <rect x="180" y="180" width="110" height="150" fill="#d0ebff" stroke="#1c7ed6" stroke-width="2"/>
  <rect x="190" y="200" width="90" height="110" fill="#fff" stroke="#74c0fc"/>
  <!-- contrapeso -->
  <rect x="330" y="180" width="48" height="140" fill="#ced4da" stroke="#495057" stroke-width="2"/>
  <!-- porta de patamar -->
  <rect x="124" y="250" width="12" height="80" fill="#51cf66" stroke="#2b8a3e"/>
  <!-- limitador de velocidade -->
  <circle cx="150" cy="62" r="12" fill="#ffe3e3" stroke="#e03131" stroke-width="2"/>
  <line x1="150" y1="74" x2="150" y2="448" stroke="#e03131" stroke-width="1.5"/>
  <line x1="150" y1="300" x2="180" y2="300" stroke="#e03131" stroke-width="1.5"/>
  <circle cx="150" cy="454" r="8" fill="#ffe3e3" stroke="#e03131" stroke-width="2"/>
  <!-- amortecedores -->
  <rect x="215" y="445" width="40" height="35" fill="#ffec99" stroke="#f08c00" stroke-width="2"/>
  <rect x="339" y="445" width="30" height="35" fill="#ffec99" stroke="#f08c00" stroke-width="2"/>
  ${mk(1, 265, 62)}${mk(2, 340, 40)}${mk(3, 235, 120)}${mk(4, 235, 255)}${mk(5, 354, 250)}
  ${mk(6, 172, 150)}${mk(7, 150, 38)}${mk(8, 130, 290)}${mk(9, 235, 462)}${mk(10, 150, 478)}
`, 'Esquema de um elevador de tração');

const tracao = `
<h2>Esquema geral de um elevador de tração (com contrapeso)</h2>
<p>Vista lateral simplificada do tipo mais comum em edifícios residenciais em Portugal. Serve para localizar rapidamente cada componente durante a manutenção ou ao descrever uma avaria por telefone.</p>
${tracaoSvg}
${legend([
  '<strong>Máquina de tração</strong> (motor + roldana de tração + travão) — move os cabos por aderência.',
  '<strong>Roldana de desvio</strong> — dirige os cabos para o contrapeso.',
  '<strong>Cabos de tração</strong> — suportam cabine e contrapeso. Verificar desgaste, fios partidos e lubrificação.',
  '<strong>Cabine</strong> — com operador de porta, botoneira, iluminação de emergência e apanha-cargas (travão de segurança) por baixo.',
  '<strong>Contrapeso</strong> — equilibra a cabine (≈ peso da cabine + 40–50 % da carga nominal).',
  '<strong>Guias</strong> — carris em T que conduzem cabine e contrapeso; lubrificar conforme a ficha do fabricante.',
  '<strong>Limitador de velocidade</strong> — aciona o apanha-cargas em excesso de velocidade (selo de inspeção obrigatório).',
  '<strong>Porta de patamar</strong> — com fechadura e contacto de bloqueio (faz parte da cadeia de segurança).',
  '<strong>Amortecedores</strong> (poço) — absorvem o impacto em caso de sobrecurso.',
  '<strong>Roldana tensora do limitador</strong> — mantém o cabo do limitador esticado no poço.'
])}
<div class="alert alert-info"><i class="fas fa-info-circle mr-2"></i><strong>Variantes:</strong> em elevadores <em>sem casa das máquinas</em> (MRL) a máquina fica no topo do poço; em instalações mais antigas pode existir reenvio duplo (2:1). A numeração acima mantém-se válida.</div>
<h3>Pontos de verificação rápida por zona</h3>
${table(['Zona', 'O que olhar primeiro'], [
  ['Casa das máquinas', 'Temperatura, ruído da máquina, estado do travão, quadro de comando, selo do limitador'],
  ['Tecto da cabine', 'Cabos e fixações, patins de guia, operador de porta, estação de inspeção'],
  ['Poço', 'Limpeza, amortecedores, roldana tensora, contacto de paragem do poço, iluminação'],
  ['Patamares', 'Fechaduras, folgas, soleiras, botoneiras e sinalização']
])}`;

// ─── ESQUEMA 2: hidráulico ──────────────────────────────────────────────────
const hidrSvg = svgWrap('0 0 560 330', `
  ${box(20, 40, 120, 56, 'Reservatório', 'de óleo', '#fff3bf', '#f08c00')}
  ${box(20, 160, 120, 56, 'Motor + bomba', 'submersível', '#ffe8cc', '#fd7e14')}
  ${box(200, 100, 130, 76, 'Bloco de', 'válvulas', '#e7f1ff', '#0d6efd')}
  ${box(400, 220, 70, 90, 'Cilindro', '+ êmbolo', '#d3f9d8', '#2b8a3e')}
  ${box(400, 20, 130, 56, 'Cabine', 'e estrutura', '#d0ebff', '#1c7ed6')}
  ${arrow(80, 96, 80, 158)}
  ${arrow(140, 188, 198, 150)}
  ${arrow(330, 138, 435, 218)}
  ${arrow(435, 220, 435, 80)}
  ${arrow(200, 120, 140, 70)}
  <text x="214" y="196" font-size="11" fill="#495057" style="${S}">Subida: bomba → cilindro</text>
  <text x="214" y="212" font-size="11" fill="#495057" style="${S}">Descida: gravidade → válvula → reservatório</text>
  ${mk(1, 28, 48)}${mk(2, 28, 168)}${mk(3, 208, 108)}${mk(4, 408, 228)}${mk(5, 408, 28)}
`, 'Esquema de um elevador hidráulico');

const hidraulico = `
<h2>Esquema do circuito de um elevador hidráulico</h2>
<p>No elevador hidráulico não há contrapeso nem roldana de tração: a cabine sobe porque a bomba empurra óleo para o cilindro e desce por gravidade, com o óleo a regressar ao reservatório através das válvulas.</p>
${hidrSvg}
${legend([
  '<strong>Reservatório</strong> — nível e temperatura do óleo (verificar visor e filtro).',
  '<strong>Motor + bomba</strong> — normalmente submersíveis; ouvir ruídos anormais e verificar o arranque (estrela-triângulo ou arrancador suave).',
  '<strong>Bloco de válvulas</strong> — controla subida, descida, velocidade e nivelamento; contém válvula de limitação de pressão, válvula manual de emergência e válvula paraquedas (quando existe).',
  '<strong>Cilindro e êmbolo</strong> — verificar fugas na bucha, juntas e tubagem flexível.',
  '<strong>Cabine</strong> — ligada ao êmbolo direta (1:1) ou indiretamente por cabos/roldana (2:1).'
])}
<h3>Sintomas típicos e onde procurar</h3>
${table(['Sintoma', 'Causa provável', 'Verificar'], [
  ['Cabine desce sozinha (deriva)', 'Fuga interna na válvula ou externa no cilindro/tubagem', 'Juntas, válvula de descida, nível do óleo'],
  ['Subida lenta ou com solavancos', 'Óleo frio/contaminado, ar no circuito, filtro obstruído', 'Temperatura, purga de ar, filtros'],
  ['Motor trabalha mas a cabine não sobe', 'Válvula de limitação de pressão aberta, falta de óleo, bomba desgastada', 'Nível do óleo, pressão, válvula de alívio'],
  ['Nivelamento incorreto às paragens', 'Regulação das válvulas ou deriva', 'Velocidade de aproximação, sensores de nivelamento']
])}
<div class="alert alert-warning"><i class="fas fa-exclamation-triangle mr-2"></i>Antes de abrir qualquer ligação hidráulica, despressurizar o circuito e imobilizar a cabine. Recolher e tratar o óleo derramado como resíduo.</div>`;

// ─── ESQUEMA 3: cadeia de segurança ─────────────────────────────────────────
const cadeiaSvg = svgWrap('0 0 560 330', `
  ${box(20, 30, 120, 60, 'Stop do poço', '', '#ffe3e3', '#e03131')}
  ${box(220, 30, 120, 60, 'Stop tecto /', 'inspeção cabine', '#ffe3e3', '#e03131')}
  ${box(420, 30, 120, 60, 'Fins de curso', 'finais', '#ffe3e3', '#e03131')}
  ${box(20, 150, 120, 60, 'Limitador /', 'apanha-cargas', '#ffe3e3', '#e03131')}
  ${box(220, 150, 120, 60, 'Contactos de', 'bloqueio (patamar)', '#ffe3e3', '#e03131')}
  ${box(420, 150, 120, 60, 'Contacto da', 'porta da cabine', '#ffe3e3', '#e03131')}
  ${box(220, 260, 120, 50, 'Contactores', 'do motor', '#d3f9d8', '#2b8a3e')}
  ${arrow(140, 60, 218, 60)}
  ${arrow(340, 60, 418, 60)}
  <polyline points="480,90 480,120 80,120 80,148" fill="none" stroke="#495057" stroke-width="2" marker-end="url(#ar)"/>
  ${arrow(140, 180, 218, 180)}
  ${arrow(340, 180, 418, 180)}
  <polyline points="480,210 480,235 280,235 280,258" fill="none" stroke="#495057" stroke-width="2" marker-end="url(#ar)"/>
  <text x="20" y="14" font-size="11" fill="#495057" style="${S}">Todos os contactos em SÉRIE: se um abrir, o circuito corta e o elevador pára.</text>
`, 'Esquema da cadeia de segurança elétrica');

const cadeia = `
<h2>Cadeia de segurança elétrica — esquema de princípio</h2>
<p>Os dispositivos de segurança estão ligados <strong>em série</strong>. A bobina dos contactores de potência só é alimentada se <em>todos</em> os contactos estiverem fechados. Quando um elevador "não arranca" e não dá erro, o problema está quase sempre aqui.</p>
${cadeiaSvg}
<h3>Como localizar o contacto aberto</h3>
<ol>
  <li>Medir tensão à entrada e à saída da cadeia no quadro (a leitura é feita com o circuito sob tensão: usar multímetro categoria adequada e EPI).</li>
  <li>Dividir a cadeia a meio: medir nos bornes intermédios identificados no esquema do fabricante. Se há tensão a montante e não a jusante, o contacto aberto está entre os dois pontos.</li>
  <li>Repetir a divisão até isolar o dispositivo.</li>
  <li>Corrigir a causa (porta mal fechada, fim de curso desregulado, contacto sujo) — <strong>nunca</strong> deixar a cadeia em ponte.</li>
</ol>
<div class="alert alert-danger"><i class="fas fa-ban mr-2"></i><strong>Proibido:</strong> pontear (shuntar) contactos de segurança para "fazer andar" o elevador. Só é admissível um shunt temporário, controlado e identificado, em procedimentos previstos pelo fabricante e com o elevador fora de serviço ao público. Qualquer ponte esquecida é uma não-conformidade grave.</div>
<p class="text-muted small">A ordem e os dispositivos exatos variam com a instalação e com a norma aplicada (EN 81-1/2 em instalações antigas, EN 81-20/50 em novas). Consultar sempre o esquema elétrico do fabricante.</p>`;

// ─── SEGURANÇA ──────────────────────────────────────────────────────────────
const seguranca = `
<h2>Instruções de segurança no trabalho em elevadores</h2>
<div class="alert alert-danger"><i class="fas fa-exclamation-triangle mr-2"></i>Nenhum trabalho justifica um risco evitável. Em caso de dúvida: <strong>parar, sinalizar e pedir apoio</strong>.</div>
<h3>1. Antes de começar</h3>
<ul>
  <li>Avaliar o risco do local e do trabalho; ler o histórico do elevador.</li>
  <li>Utilizar sempre EPI: calçado de proteção, capacete, luvas, óculos e, em trabalhos no poço/tecto, arnês quando houver risco de queda.</li>
  <li>Trabalhar em dupla em intervenções de risco (poço, tecto da cabine, resgate).</li>
  <li>Colocar sinalização <em>"Elevador fora de serviço"</em> em todos os patamares e impedir o acesso de utilizadores.</li>
  <li>Confirmar que não há passageiros na cabine.</li>
</ul>
<h3>2. Trabalho elétrico — as 5 regras de ouro</h3>
<ol>
  <li><strong>Seccionar</strong> todas as fontes de alimentação.</li>
  <li><strong>Impedir a religação</strong> (cadeado + etiqueta pessoal).</li>
  <li><strong>Verificar a ausência de tensão</strong> com instrumento adequado, testado antes e depois.</li>
  <li><strong>Ligar à terra e em curto-circuito</strong>, quando aplicável.</li>
  <li><strong>Proteger</strong> contra elementos vizinhos que continuem sob tensão.</li>
</ol>
<p>Atenção: a bateria do sistema de resgate/iluminação, os condensadores do variador e a alimentação da iluminação do poço podem manter tensão após o corte geral.</p>
<h3>3. Trabalho no tecto da cabine</h3>
<ul>
  <li>Aceder só com a estação de inspeção do tecto <strong>ativada</strong> (modo inspeção) e o botão de paragem acessível.</li>
  <li>Nunca ter partes do corpo fora do perímetro da cabine com a cabine em movimento; manter distância de contrapeso e vigas.</li>
  <li>Usar corrimão/pontos de fixação; não pisar zonas sem proteção.</li>
  <li>Comunicar o movimento ao colega antes de cada manobra.</li>
</ul>
<h3>4. Trabalho no poço</h3>
<ul>
  <li>Acionar o <strong>stop do poço</strong> antes de entrar e usar a escada de acesso, nunca saltar.</li>
  <li>Confirmar o espaço de refúgio disponível e posicionar a cabine em segurança (calços/dispositivo de imobilização conforme o fabricante).</li>
  <li>Iluminar o poço e verificar ausência de água, óleo e detritos.</li>
</ul>
<h3>5. Casa das máquinas e partes rotativas</h3>
<ul>
  <li>Não trabalhar com máquina em movimento sem proteção; cabelos e roupa solta amarrados.</li>
  <li>Travão: nunca soltar manualmente com pessoas na cabine sem seguir o procedimento de resgate e ter controlo da velocidade.</li>
  <li>Superfícies quentes (motor, travão): aguardar arrefecimento.</li>
</ul>
<h3>6. Fim da intervenção</h3>
<ul>
  <li>Retirar ferramentas, pontes e cadeados <em>próprios</em>.</li>
  <li>Repor proteções e tampas; testar paragens, portas e alarme.</li>
  <li>Registar a intervenção no relatório e comunicar anomalias ao cliente.</li>
  <li>Só retirar a sinalização quando o elevador estiver a funcionar com segurança.</li>
</ul>
<h3>Em caso de acidente</h3>
<ol>
  <li>Parar o elevador e proteger o local.</li>
  <li>Chamar o <strong>112</strong> se houver feridos.</li>
  <li>Avisar o responsável da empresa e o cliente.</li>
  <li>Não alterar o estado do equipamento até autorização (investigação).</li>
</ol>`;

// ─── RESOLUÇÃO DE PROBLEMAS ─────────────────────────────────────────────────
const resolucao = `
<h2>Resolução de problemas — guia por sintoma</h2>
<p>Tabela de consulta rápida para avarias comuns em elevadores de tração e hidráulicos. As causas são <em>prováveis</em>: confirmar sempre com medições e com o manual do fabricante (os códigos de erro dos variadores e quadros diferem entre marcas).</p>
${table(['Sintoma', 'Causas prováveis', 'O que verificar / solução'], [
  ['Elevador sem resposta às chamadas', 'Falta de alimentação, disjuntor/diferencial desligado, cadeia de segurança aberta, modo inspeção ativo', 'Quadro geral e da casa das máquinas; led/visor do comando; ver esquema da cadeia de segurança; ver se a estação de inspeção está em "normal"'],
  ['Portas não fecham', 'Obstrução na soleira, célula/cortina suja ou desalinhada, patins gastos, fim de curso do operador', 'Limpar soleira e guias; testar célula; verificar tensão da correia e ajuste de binário/velocidade do operador'],
  ['Portas abrem e fecham repetidamente', 'Célula fotoelétrica sinalizando obstáculo, botão de reabertura preso, sensor de peso/sobrecarga', 'Limpar e alinhar células; testar botão de reabertura; verificar cargas na cabine'],
  ['Elevador pára entre pisos', 'Cadeia de segurança aberta (porta de patamar mal bloqueada, limitador), sobrecorrente no variador, perda de aderência', 'Ler código de erro; verificar contactos de porta; verificar cabos e roldana (patinagem)'],
  ['Nivelamento incorreto (degrau)', 'Ímanes/sensores de nivelamento desalinhados, travão desgastado, cabos alongados; hidráulico: óleo/velocidade de aproximação', 'Reajustar sensores; verificar travão; verificar óleo e regulação das válvulas'],
  ['Ruído ou vibração na viagem', 'Guias secas ou desalinhadas, patins gastos, rolamentos, roldanas, cabos', 'Lubrificar guias; inspecionar patins e rolamentos; ver artigo de diagnóstico de ruídos'],
  ['Solavancos no arranque/paragem', 'Parametrização do variador, travão a atuar cedo/tarde, encoder', 'Verificar curva de velocidade, temporização do travão e sinal do encoder'],
  ['Cabine desce lentamente (hidráulico)', 'Fuga na válvula, junta do cilindro ou tubagem', 'Inspecionar fugas; testar válvula de descida; nível do óleo'],
  ['Óleo quente (hidráulico)', 'Pouca ventilação, filtro obstruído, muitas viagens, óleo degradado', 'Ventilar/arrefecer; limpar filtros; considerar arrefecedor e substituição do óleo'],
  ['Alarme/intercomunicador não funciona', 'Bateria descarregada, linha telefónica/GSM sem rede, botão avariado', 'Testar bateria e rede; substituir módulo; testar ligação ao centro de assistência'],
  ['Luz de emergência não acende', 'Bateria/inversor, lâmpada, ligação', 'Testar autonomia (≥ 1 h conforme norma); substituir bateria/lâmpada']
])}
<div class="alert alert-info"><i class="fas fa-lightbulb mr-2"></i><strong>Método:</strong> 1) falar com quem reportou e recolher sintomas; 2) ver o histórico; 3) ler códigos de erro; 4) isolar a zona (porta, cadeia, tração, comando); 5) corrigir a causa, não só o efeito; 6) testar 3 viagens completas; 7) registar.</div>
<p>Ver também: <em>Tutorial — Diagnóstico: elevador não arranca</em> e <em>Esquema — Cadeia de segurança elétrica</em>.</p>`;

// ─── TUTORIAL 1: visita de manutenção ───────────────────────────────────────
const tutVisita = `
<h2>Tutorial — A visita de manutenção, do início ao fim</h2>
<p>Sequência prática para uma visita de manutenção preventiva. Pode ser usada como guia de trabalho no telemóvel.</p>
<h3>Passo 1 — Preparação (antes de sair)</h3>
<ul><li>Ver no FestLift as tarefas do dia, o histórico e as avarias recentes do elevador.</li><li>Levar EPI, ferramentas, lubrificante, consumíveis habituais e peças pedidas.</li></ul>
<h3>Passo 2 — Chegada e contacto</h3>
<ul><li>Falar com o administrador/porteiro; perguntar se há queixas ou ruídos.</li><li>Colocar sinalização de elevador fora de serviço e evitar que haja passageiros.</li></ul>
<h3>Passo 3 — Teste inicial</h3>
<ul><li>Fazer uma viagem completa e observar: nivelamento, portas, ruído, vibração, botoneira.</li><li>Notar sintomas para o relatório antes de intervir.</li></ul>
<h3>Passo 4 — Casa das máquinas</h3>
<ul><li>Máquina, travão, quadro, ventilação, selo do limitador.</li><li>Cortar, bloquear e verificar a ausência de tensão antes de intervir em órgãos elétricos.</li></ul>
<h3>Passo 5 — Tecto da cabine</h3>
<ul><li>Ativar a inspeção; verificar cabos, fixações, patins, operador de porta e contactos.</li><li>Limpar e lubrificar guias conforme o plano.</li></ul>
<h3>Passo 6 — Poço</h3>
<ul><li>Acionar o stop do poço; verificar limpeza, amortecedores, roldana tensora, contacto de paragem e iluminação.</li></ul>
<h3>Passo 7 — Portas de patamar e cabine</h3>
<ul><li>Fechaduras, folgas, soleiras, patins, células; testar o bloqueio em alguns patamares (rotativamente).</li></ul>
<h3>Passo 8 — Testes finais</h3>
<ul><li>Três viagens completas; testar paragem de emergência, alarme, iluminação de emergência e comunicação.</li></ul>
<h3>Passo 9 — Registo e saída</h3>
<ul><li>Preencher a lista de verificação e o relatório no FestLift; registar peças e tempo gasto.</li><li>Retirar sinalização, informar o cliente de pendentes e pedir assinatura quando aplicável.</li></ul>
<div class="alert alert-success"><i class="fas fa-check-circle mr-2"></i>Se encontrar uma não-conformidade grave, coloque o elevador fora de serviço e comunique de imediato ao responsável.</div>`;

// ─── TUTORIAL 2: diagnóstico (fluxograma) ───────────────────────────────────
const fluxoSvg = svgWrap('0 0 560 440', `
  ${box(20, 10, 220, 46, '1. Há alimentação no quadro?', '', '#e7f1ff', '#0d6efd')}
  ${box(310, 10, 230, 46, 'Reativar disjuntor / ver rede', '', '#ffe3e3', '#e03131')}
  ${arrow(240, 33, 308, 33)}
  <text x="262" y="26" font-size="11" fill="#495057" style="${S}">Não</text>
  ${arrow(130, 56, 130, 92)}
  <text x="136" y="78" font-size="11" fill="#495057" style="${S}">Sim</text>
  ${box(20, 92, 220, 46, '2. Modo normal (não inspeção)?', '', '#e7f1ff', '#0d6efd')}
  ${box(310, 92, 230, 46, 'Repor "normal" nas estações', '', '#ffe3e3', '#e03131')}
  ${arrow(240, 115, 308, 115)}
  <text x="262" y="108" font-size="11" fill="#495057" style="${S}">Não</text>
  ${arrow(130, 138, 130, 174)}
  <text x="136" y="160" font-size="11" fill="#495057" style="${S}">Sim</text>
  ${box(20, 174, 220, 46, '3. Cadeia de segurança fechada?', '', '#e7f1ff', '#0d6efd')}
  ${box(310, 174, 230, 46, 'Localizar contacto aberto', 'esquema da cadeia', '#ffe3e3', '#e03131')}
  ${arrow(240, 197, 308, 197)}
  <text x="262" y="190" font-size="11" fill="#495057" style="${S}">Não</text>
  ${arrow(130, 220, 130, 256)}
  <text x="136" y="242" font-size="11" fill="#495057" style="${S}">Sim</text>
  ${box(20, 256, 220, 46, '4. Portas fechadas e bloqueadas?', '', '#e7f1ff', '#0d6efd')}
  ${box(310, 256, 230, 46, 'Limpar/ajustar porta e fechadura', '', '#ffe3e3', '#e03131')}
  ${arrow(240, 279, 308, 279)}
  <text x="262" y="272" font-size="11" fill="#495057" style="${S}">Não</text>
  ${arrow(130, 302, 130, 338)}
  <text x="136" y="324" font-size="11" fill="#495057" style="${S}">Sim</text>
  ${box(20, 338, 220, 46, '5. Comando dá ordem de marcha?', '', '#e7f1ff', '#0d6efd')}
  ${box(310, 338, 230, 46, 'Ler código de erro do comando', '', '#ffe3e3', '#e03131')}
  ${arrow(240, 361, 308, 361)}
  <text x="262" y="354" font-size="11" fill="#495057" style="${S}">Não</text>
  <text x="20" y="412" font-size="12" fill="#212529" style="${S}">Sim → verificar variador/contactores, travão e motor.</text>
`, 'Fluxograma de diagnóstico: elevador não arranca');

const tutDiag = `
<h2>Tutorial — Diagnóstico: o elevador não arranca</h2>
<p>Siga o fluxograma da esquerda para a direita. Cada resposta "Não" aponta a ação corretiva; só avance quando a anterior estiver resolvida.</p>
${fluxoSvg}
<h3>Detalhe de cada passo</h3>
<ol>
  <li><strong>Alimentação:</strong> medir as três fases (e neutro) no quadro; verificar disjuntores, diferenciais e fusíveis. Atenção à ordem de fases em alguns variadores.</li>
  <li><strong>Modo de funcionamento:</strong> a estação de inspeção do tecto/quadro deve estar em "normal". Um comutador esquecido em "inspeção" é causa frequente.</li>
  <li><strong>Cadeia de segurança:</strong> usar o esquema da cadeia e a divisão a meio para encontrar o contacto aberto.</li>
  <li><strong>Portas:</strong> confirmar que todas as portas de patamar estão fechadas e o contacto de bloqueio fecha; ver soleira, patins e fechadura.</li>
  <li><strong>Comando:</strong> ler o visor/código; consultar o manual do fabricante para o significado do código e o histórico de falhas.</li>
</ol>
<div class="alert alert-warning"><i class="fas fa-exclamation-triangle mr-2"></i>Se o elevador tiver passageiros presos, aplicar primeiro o protocolo de resgate (artigo na categoria Segurança).</div>`;

// ─── TUTORIAL 3: afinação de portas ─────────────────────────────────────────
const tutPortas = `
<h2>Tutorial — Verificação e afinação das portas</h2>
<p>As portas são a origem da maior parte das avarias. Este roteiro cobre o essencial para portas automáticas de cabine e de patamar.</p>
<h3>Material</h3>
<ul><li>Chaves de bocas/allen, pano e produto de limpeza sem solvente agressivo, lubrificante adequado, medidor de folgas, multímetro.</li></ul>
<h3>Passo a passo</h3>
<ol>
  <li><strong>Limpar a soleira e as guias</strong> (sujidade e pedras são causa nº 1 de falhas).</li>
  <li><strong>Inspecionar os patins</strong> (pés de porta): desgaste excessivo → substituir em par.</li>
  <li><strong>Verificar folgas:</strong> entre folhas e entre folha e soleira (≤ 6 mm entre folhas, conforme norma/fabricante).</li>
  <li><strong>Correia e roldanas do operador:</strong> tensão correta, sem fendas.</li>
  <li><strong>Cortina/células:</strong> limpar, verificar alinhamento e reação ao obstáculo.</li>
  <li><strong>Fechadura de patamar e contacto de bloqueio:</strong> deve bloquear mecanicamente e só então fechar o contacto elétrico; testar manualmente.</li>
  <li><strong>Binário e velocidade:</strong> ajustar o operador para fecho suave; tempos típicos de abertura/fecho entre 3 e 5 s.</li>
  <li><strong>Teste final:</strong> abrir/fechar várias vezes, com obstáculo e sem obstáculo; testar em modo normal com viagem real.</li>
</ol>
<div class="alert alert-danger"><i class="fas fa-ban mr-2"></i>Nunca ajustar fechaduras ou contactos de bloqueio de forma a permitir o arranque com a porta aberta.</div>`;

// ─── TUTORIAL 4: leitura de esquemas elétricos ──────────────────────────────
const simbolosSvg = svgWrap('0 0 560 190', `
  <text x="10" y="18" font-size="12" font-weight="bold" fill="#212529" style="${S}">Contacto NA (normalmente aberto)</text>
  <line x1="20" y1="60" x2="60" y2="60" stroke="#212529" stroke-width="2"/>
  <line x1="60" y1="60" x2="90" y2="40" stroke="#212529" stroke-width="2"/>
  <line x1="95" y1="60" x2="135" y2="60" stroke="#212529" stroke-width="2"/>
  <circle cx="60" cy="60" r="3" fill="#212529"/><circle cx="95" cy="60" r="3" fill="#212529"/>
  <text x="10" y="100" font-size="12" font-weight="bold" fill="#212529" style="${S}">Contacto NF (normalmente fechado)</text>
  <line x1="20" y1="140" x2="60" y2="140" stroke="#212529" stroke-width="2"/>
  <line x1="60" y1="140" x2="95" y2="130" stroke="#212529" stroke-width="2"/>
  <line x1="95" y1="140" x2="135" y2="140" stroke="#212529" stroke-width="2"/>
  <circle cx="60" cy="140" r="3" fill="#212529"/><circle cx="95" cy="140" r="3" fill="#212529"/>
  <text x="300" y="18" font-size="12" font-weight="bold" fill="#212529" style="${S}">Bobina de contactor</text>
  <rect x="320" y="35" width="70" height="40" fill="#fff" stroke="#212529" stroke-width="2"/>
  <text x="355" y="60" text-anchor="middle" font-size="13" fill="#212529" style="${S}">K1</text>
  <text x="300" y="100" font-size="12" font-weight="bold" fill="#212529" style="${S}">Motor trifásico</text>
  <circle cx="355" cy="145" r="24" fill="#fff" stroke="#212529" stroke-width="2"/>
  <text x="355" y="150" text-anchor="middle" font-size="13" fill="#212529" style="${S}">M 3~</text>
`, 'Símbolos elétricos básicos');

const tutEsquemas = `
<h2>Tutorial — Como ler um esquema elétrico de elevador</h2>
<p>Os esquemas elétricos seguem convenções comuns (IEC). Dominar o essencial permite seguir qualquer esquema de qualquer fabricante.</p>
<h3>1. Símbolos básicos</h3>
${simbolosSvg}
<h3>2. Convenções úteis</h3>
${table(['Elemento', 'Como se identifica'], [
  ['Contactor / relé', 'Letra K + número (K1, K2…); os contactos ligados à mesma bobina têm a mesma referência'],
  ['Fusíveis e disjuntores', 'F ou Q (F1, Q1); indicados com corrente nominal'],
  ['Terminais / bornes', 'Numerados, por vezes por régua (X1:1, X1:2…)'],
  ['Cabos', 'Cor e secção (ex.: 1,5 mm²); fases L1/L2/L3, neutro N, terra PE'],
  ['Referências cruzadas', 'Números ou coordenadas por baixo da bobina indicam onde estão os seus contactos noutra folha']
])}
<h3>3. Método de leitura em 4 passos</h3>
<ol>
  <li>Localizar o <strong>circuito de potência</strong> (alimentação → disjuntor → contactores → variador/motor).</li>
  <li>Localizar o <strong>circuito de comando</strong> (bobinas e contactos auxiliares).</li>
  <li>Localizar a <strong>cadeia de segurança</strong> (contactos em série até aos contactores de potência).</li>
  <li>Seguir um <strong>sinal concreto</strong> (por exemplo, "chamada registada → comando → variador") e confirmar com medições nos bornes indicados.</li>
</ol>
<div class="alert alert-info"><i class="fas fa-info-circle mr-2"></i>Cada fabricante tem códigos próprios para bornes e erros. Guarde o esquema da instalação no processo do elevador (FestLift) para o ter sempre à mão.</div>`;

const articles = [
  { title: 'Esquema — Componentes de um elevador de tração', category: 'esquemas', difficulty: 'basico',
    summary: 'Vista lateral com a localização e função dos componentes: máquina, cabos, cabine, contrapeso, limitador, amortecedores.',
    content: tracao, tags: ['esquema', 'componentes', 'tração', 'cabine', 'contrapeso', 'limitador'], featured: true },
  { title: 'Esquema — Circuito de um elevador hidráulico', category: 'esquemas', difficulty: 'basico',
    summary: 'Reservatório, bomba, bloco de válvulas e cilindro: como funciona o circuito e onde procurar fugas e avarias.',
    content: hidraulico, tags: ['esquema', 'hidráulico', 'válvulas', 'cilindro', 'bomba'], featured: false },
  { title: 'Esquema — Cadeia de segurança elétrica', category: 'esquemas', difficulty: 'intermedio',
    summary: 'Contactos de segurança em série, como a cadeia corta o movimento e como localizar o contacto aberto.',
    content: cadeia, tags: ['esquema', 'cadeia de segurança', 'contactos', 'segurança elétrica'], featured: false },
  { title: 'Instruções de segurança no trabalho em elevadores — Guia do técnico', category: 'seguranca', difficulty: 'basico',
    summary: 'EPI, 5 regras de ouro elétricas, trabalho no tecto da cabine e no poço, e o que fazer em caso de acidente.',
    content: seguranca, tags: ['segurança', 'EPI', 'poço', 'tecto da cabine', 'bloqueio', 'regras de ouro'], featured: true },
  { title: 'Resolução de problemas — Guia por sintoma', category: 'avarias', difficulty: 'intermedio',
    summary: 'Tabela de causas prováveis e verificações para as avarias mais comuns em elevadores de tração e hidráulicos.',
    content: resolucao, tags: ['avarias', 'resolução de problemas', 'diagnóstico', 'sintomas'], featured: true },
  { title: 'Tutorial — A visita de manutenção, do início ao fim', category: 'tutoriais', difficulty: 'basico',
    summary: 'Roteiro de 9 passos para uma visita de manutenção preventiva: preparação, testes, zonas a verificar e registo.',
    content: tutVisita, tags: ['tutorial', 'manutenção', 'visita', 'passo a passo'], featured: true },
  { title: 'Tutorial — Diagnóstico: o elevador não arranca', category: 'tutoriais', difficulty: 'intermedio',
    summary: 'Fluxograma de 5 passos para encontrar a causa quando o elevador não responde ou não arranca.',
    content: tutDiag, tags: ['tutorial', 'diagnóstico', 'fluxograma', 'não arranca'], featured: false },
  { title: 'Tutorial — Verificação e afinação das portas', category: 'tutoriais', difficulty: 'intermedio',
    summary: 'Limpeza, folgas, patins, correia, células e fechaduras: roteiro para resolver a maioria das avarias de portas.',
    content: tutPortas, tags: ['tutorial', 'portas', 'afinação', 'fechadura', 'células'], featured: false },
  { title: 'Tutorial — Como ler um esquema elétrico de elevador', category: 'tutoriais', difficulty: 'avancado',
    summary: 'Símbolos, convenções e método em 4 passos para seguir qualquer esquema elétrico de elevadores.',
    content: tutEsquemas, tags: ['tutorial', 'esquema elétrico', 'símbolos', 'leitura de esquemas'], featured: false }
];

async function run() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const col = client.db(DB_NAME).collection('knowledge_base');
    for (const a of articles) {
      const r = await col.updateOne(
        { title: a.title },
        {
          $set: { ...a, published: true, author: 'FestLift', updatedAt: now },
          $setOnInsert: { views: 0, createdAt: now }
        },
        { upsert: true }
      );
      console.log(`${r.upsertedCount ? '➕ criado ' : '♻️  atualizado'}: ${a.title}`);
    }
    await col.createIndex({ category: 1 });
  } finally {
    await client.close();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
