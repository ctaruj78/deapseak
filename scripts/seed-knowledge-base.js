// scripts/seed-knowledge-base.js — Seed 20 artigos reais na base de conhecimento
require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME   = process.env.DB_NAME   || 'deapseak';

const now = new Date();
const d = (daysAgo) => new Date(now - daysAgo * 86400000);

const articles = [
  // ─── MANUTENÇÃO ───────────────────────────────────────────────────────────
  {
    title: 'Manutenção mensal obrigatória de elevadores — Lista de verificação completa',
    category: 'manutencao',
    difficulty: 'basico',
    summary: 'Procedimento passo a passo para a manutenção mensal exigida pelo DL 320/2002. Inclui todos os componentes a verificar e registar.',
    content: `<h2>Manutenção mensal obrigatória</h2>
<p>Ao abrigo do <strong>Decreto-Lei n.º 320/2002</strong> e da <strong>Portaria n.º 331/2014</strong>, a empresa de manutenção é obrigada a realizar visitas mensais a cada elevador sob contrato.</p>

<div class="alert alert-warning"><i class="fas fa-exclamation-triangle mr-2"></i><strong>Importante:</strong> Todas as visitas devem ser registadas no livro de manutenção do elevador (formato físico ou digital homologado).</div>

<h3>1. Verificações no poço</h3>
<ul>
  <li>Ausência de humidade, infiltrações e detritos</li>
  <li>Estado dos tampões de borracha e amortecedores</li>
  <li>Tensão e desgaste dos cabos de aço (máx. 10% de fios partidos)</li>
  <li>Lubrificação das guias — aplicar óleo conforme ficha técnica do fabricante</li>
  <li>Verificação do circuito de iluminação do poço (mínimo 50 lux)</li>
  <li>Teste do botão de paragem de emergência do poço</li>
</ul>

<h3>2. Verificações na casa das máquinas</h3>
<ul>
  <li>Temperatura ambiente (máx. 40 °C)</li>
  <li>Estado do motor e nível de aquecimento após operação</li>
  <li>Verificação dos fusíveis e disjuntores</li>
  <li>Teste do limitador de velocidade — verificar selo de inspecção</li>
  <li>Nível de óleo do grupo hidráulico (se aplicável)</li>
  <li>Estado dos contactores e relés de segurança</li>
</ul>

<h3>3. Verificações na cabine</h3>
<ul>
  <li>Funcionamento de todos os botões de chamada e destino</li>
  <li>Operação do alarme de emergência e intercomunicador</li>
  <li>Iluminação normal e de emergência (mínimo 50 lux)</li>
  <li>Nivelamento nas paragens (tolerância ±10 mm)</li>
  <li>Certificado de inspecção em vigor e visível</li>
</ul>

<h3>4. Verificações nas portas</h3>
<ul>
  <li>Tempo de abertura/fecho: 3–5 segundos (ajustar se necessário)</li>
  <li>Funcionamento das células fotoeléctricas de segurança</li>
  <li>Folga entre folhas de porta: máx. 6 mm</li>
  <li>Estado dos vedantes e guias de porta</li>
  <li>Bloqueio mecânico e elétrico das portas de patamar</li>
</ul>

<h3>5. Teste funcional final</h3>
<p>Realizar 3 viagens completas entre pisos extremos, confirmar nivelamento, paragem de emergência e alarme. Registar no livro de manutenção com assinatura e data.</p>`,
    tags: ['manutenção', 'mensal', 'DL 320/2002', 'lista de verificação', 'obrigatório'],
    featured: true,
    published: true,
    views: 0,
    author: 'FestLift',
    authorId: null,
    createdAt: d(60),
    updatedAt: d(5)
  },
  {
    title: 'Lubrificação de guias e componentes mecânicos — Guia prático',
    category: 'manutencao',
    difficulty: 'basico',
    summary: 'Tipos de lubrificantes, intervalos e técnica correta para guias, cabos, roldanas e mecanismo de porta.',
    content: `<h2>Lubrificação de componentes do elevador</h2>
<p>A lubrificação correta é um dos fatores mais importantes para a longevidade do equipamento e para a eliminação de ruídos e vibrações.</p>

<h3>Guias de deslizamento (sapatas de escorregamento)</h3>
<p>Usar <strong>óleo mineral ISO VG 68</strong> ou lubrificante específico do fabricante (ex: Otis OX7, Schindler LUB-100).</p>
<ul>
  <li>Intervalo: <strong>mensal</strong></li>
  <li>Quantidade: 2–3 gotas por sapata por visita</li>
  <li>Verificar desgaste das sapatas — substituir quando espessura &lt; 5 mm</li>
</ul>

<h3>Guias de rolamento (rodas de rolamento)</h3>
<ul>
  <li>Verificar estado dos rolamentos — substituir se ruído ou folga excessiva</li>
  <li>Não lubrificar — rolamentos selados de fábrica</li>
  <li>Limpar guias com pano seco antes de inspecionar</li>
</ul>

<h3>Cabos de aço</h3>
<p>Usar <strong>massa lubrificante para cabos de elevador</strong> (ex: Molykote BR2 Plus ou equivalente).</p>
<ul>
  <li>Intervalo: <strong>trimestral</strong> ou quando os cabos apresentarem brilho seco</li>
  <li>Aplicar uniformemente ao longo de todo o comprimento</li>
  <li>Nunca usar óleos vegetais ou massa comum de automóvel</li>
</ul>

<h3>Mecanismo de porta (operador)</h3>
<ul>
  <li>Lubrificar correia ou cadeia de transmissão com spray de PTFE</li>
  <li>Engatar os rolamentos da alavanca de abertura com uma gota de óleo 3-EM-1</li>
  <li>Verificar e apertar parafusos de fixação do operador</li>
</ul>

<h3>O que NÃO lubrificar</h3>
<div class="alert alert-danger"><i class="fas fa-ban mr-2"></i>Nunca lubrificar: superfície de atrito dos travões, roldanas do limitador de velocidade, borracha dos vedantes de porta, contatos elétricos.</div>`,
    tags: ['lubrificação', 'guias', 'cabos', 'manutenção', 'mecânica'],
    featured: false,
    published: true,
    views: 0,
    author: 'FestLift',
    authorId: null,
    createdAt: d(55),
    updatedAt: d(10)
  },
  {
    title: 'Revisão dos limitadores de velocidade — Procedimento e ajuste',
    category: 'manutencao',
    difficulty: 'avancado',
    summary: 'Como verificar, testar e ajustar o limitador de velocidade. Inclui valores de disparo para diferentes velocidades nominais.',
    content: `<h2>Limitador de velocidade (governor)</h2>
<p>O limitador de velocidade é um dispositivo de segurança crítico que aciona o parachoque em caso de sobrevelocidade. A sua revisão está regulamentada pela <strong>EN 81-20:2014</strong>.</p>

<div class="alert alert-danger"><i class="fas fa-skull-crossbones mr-2"></i><strong>Atenção:</strong> Este procedimento deve ser realizado por técnico certificado. Implica teste de parachoque com potencial de dano ao equipamento se mal executado.</div>

<h3>Velocidades de disparo (EN 81-20)</h3>
<table class="table table-bordered table-sm">
  <thead><tr><th>Velocidade nominal (Vn)</th><th>Disparo mín. (Vt)</th><th>Disparo máx.</th></tr></thead>
  <tbody>
    <tr><td>≤ 0,63 m/s</td><td>Vn + 0,30 m/s</td><td>0,93 m/s</td></tr>
    <tr><td>0,63 – 1,00 m/s</td><td>Vn × 1,25</td><td>1,40 m/s</td></tr>
    <tr><td>1,00 – 1,75 m/s</td><td>Vn × 1,20</td><td>1,75 m/s</td></tr>
    <tr><td>> 1,75 m/s</td><td>Vn + 1/3 × Vn</td><td>—</td></tr>
  </tbody>
</table>

<h3>Procedimento de verificação mensal</h3>
<ol>
  <li>Inspecionar visualmente o cabo do limitador — sem deformações ou ganchos presos</li>
  <li>Verificar tensão do cabo (tensionador livre, sem bloqueios)</li>
  <li>Verificar selo da entidade inspetora — válido?</li>
  <li>Limpar a polia do limitador com pano seco</li>
  <li>Registar no livro de manutenção</li>
</ol>

<h3>Procedimento de teste anual (com entidade inspetora)</h3>
<ol>
  <li>Posicionar a cabine a 1/3 da altura do poço</li>
  <li>Aumentar manualmente a velocidade com o motor de teste (ou usando o acionamento de emergência)</li>
  <li>O limitador deve disparar antes de atingir a velocidade máxima permitida</li>
  <li>Verificar que o parachoque encravou nas guias</li>
  <li>Reposicionar manualmente o parachoque e testar a libertação elétrica</li>
</ol>`,
    tags: ['limitador de velocidade', 'governor', 'segurança', 'EN 81-20', 'parachoque'],
    featured: false,
    published: true,
    views: 0,
    author: 'FestLift',
    authorId: null,
    createdAt: d(50),
    updatedAt: d(15)
  },
  {
    title: 'Manutenção do sistema hidráulico de elevadores',
    category: 'manutencao',
    difficulty: 'avancado',
    summary: 'Verificação do grupo hidráulico, nível e qualidade do óleo, vedações e válvulas de segurança em elevadores hidráulicos.',
    content: `<h2>Sistema hidráulico de elevadores</h2>
<p>Os elevadores hidráulicos requerem atenção especial ao circuito de pressão. Falhas no sistema podem causar descida lenta não controlada.</p>

<h3>Verificação mensal do grupo hidráulico</h3>
<ul>
  <li><strong>Nível de óleo:</strong> verificar no visor lateral do depósito — entre min e max</li>
  <li><strong>Temperatura do óleo:</strong> após 30 min de operação, máx. 55 °C</li>
  <li><strong>Fugas:</strong> inspecionar tubagens, uniões e válvulas — zero fugas admissíveis</li>
  <li><strong>Filtro de óleo:</strong> substituir a cada 2 anos ou quando indicador vermelho</li>
  <li><strong>Vedações do pistão:</strong> verificar cola de óleo na parte superior do cilindro</li>
</ul>

<h3>Qualidade do óleo hidráulico</h3>
<p>Usar óleo <strong>ISO VG 46 ou VG 68</strong> biodegradável (exigência ambiental EU 2019/1021):</p>
<ul>
  <li>Trocar a cada <strong>3–5 anos</strong> ou após análise laboratorial</li>
  <li>Não misturar óleos de marcas diferentes</li>
  <li>Guardar registo da data e quantidade adicionada</li>
</ul>

<h3>Válvula de descida de emergência</h3>
<p>Testar trimestralmente: abrir a válvula manual de descida de emergência — a cabine deve descer suavemente a velocidade controlada (máx. 0,3 m/s).</p>

<h3>Teste de descida livre (anual)</h3>
<div class="alert alert-warning">Realizar com elevador vazio e técnico experiente. A cabine não deve descer mais de 10 mm em 10 minutos com válvula fechada e motor desligado.</div>`,
    tags: ['hidráulico', 'óleo', 'grupo hidráulico', 'pressão', 'manutenção'],
    featured: false,
    published: true,
    views: 0,
    author: 'FestLift',
    authorId: null,
    createdAt: d(45),
    updatedAt: d(20)
  },

  // ─── REPARAÇÃO ────────────────────────────────────────────────────────────
  {
    title: 'Diagnóstico e reparação de falhas no operador de porta',
    category: 'reparacao',
    difficulty: 'intermedio',
    summary: 'Como identificar e resolver as avarias mais comuns no operador de porta automático: motor, correia, encoders e contactos.',
    content: `<h2>Falhas no operador de porta automático</h2>
<p>O operador de porta é um dos componentes com maior taxa de avaria. A maioria dos problemas de "porta não fecha" ou "elevador fica parado no piso" tem origem aqui.</p>

<h3>Sintomas e causas</h3>
<table class="table table-bordered table-sm">
  <thead><tr><th>Sintoma</th><th>Causa provável</th><th>Solução</th></tr></thead>
  <tbody>
    <tr><td>Porta não abre completamente</td><td>Correia partida ou solta</td><td>Substituir/tensionar correia</td></tr>
    <tr><td>Porta fecha e abre em loop</td><td>Célula fotoelétrica suja ou desalinhada</td><td>Limpar/realinhar sensores</td></tr>
    <tr><td>Porta fecha muito devagar</td><td>Velocidade de fecho ajustada baixa ou motor fraco</td><td>Ajustar parâmetro de velocidade no VFD</td></tr>
    <tr><td>Barulho ao fechar</td><td>Rolamentos do operador gastos</td><td>Substituir rolamentos</td></tr>
    <tr><td>Erro de encoder</td><td>Encoder sujo ou com falha</td><td>Limpar pista ou substituir encoder</td></tr>
    <tr><td>Porta preso a meio curso</td><td>Obstáculo no guia inferior</td><td>Limpar canal inferior, verificar vedante</td></tr>
  </tbody>
</table>

<h3>Substituição de correia do operador</h3>
<ol>
  <li>Desligar alimentação elétrica do operador (disjuntor dedicado)</li>
  <li>Marcar posição do braço de acoplamento antes de desmontar</li>
  <li>Soltar os 2 parafusos de tensão da correia</li>
  <li>Retirar correia velha e montar nova do mesmo tipo (verificar catálogo do fabricante)</li>
  <li>Tensionar até deflexão de 5–8 mm com força de 10 N no meio da correia</li>
  <li>Verificar alinhamento da polia motriz e seguidora</li>
  <li>Ligar alimentação e testar 10 ciclos de abertura/fecho</li>
</ol>

<h3>Ajuste de parâmetros no inversor (VFD)</h3>
<p>Na maioria dos operadores modernos (Fermator, Wittur, GAL):</p>
<ul>
  <li>P01: velocidade máxima de abertura (padrão 0,45 m/s)</li>
  <li>P02: velocidade de fecho (padrão 0,35 m/s)</li>
  <li>P03: força de fecho (ajustar se porta não fecha com vento)</li>
  <li>P10: tempo de retecção de obstáculo (padrão 1,5 s)</li>
</ul>`,
    tags: ['porta', 'operador', 'Fermator', 'Wittur', 'correia', 'VFD'],
    featured: true,
    published: true,
    views: 0,
    author: 'FestLift',
    authorId: null,
    createdAt: d(40),
    updatedAt: d(3)
  },
  {
    title: 'Substituição de cabos de aço de tração — Procedimento completo',
    category: 'reparacao',
    difficulty: 'avancado',
    summary: 'Quando e como substituir os cabos de tração: critérios de descarte segundo EN 81-20, ferramentas necessárias e procedimento passo a passo.',
    content: `<h2>Substituição de cabos de tração</h2>
<div class="alert alert-danger"><i class="fas fa-hard-hat mr-2"></i>Trabalho de alto risco. Exige mínimo 2 técnicos, sistema de bloqueio LOTO e autorização da empresa.</div>

<h3>Critérios de descarte (EN 81-20, secção 5.5)</h3>
<p>Substituir os cabos se qualquer um dos seguintes critérios for atingido:</p>
<ul>
  <li>Mais de <strong>10% de fios partidos</strong> num comprimento de 6× o diâmetro do cabo</li>
  <li>Redução do diâmetro &gt; <strong>5%</strong> do nominal</li>
  <li>Deformação visível: kinked, birdcaged, achatado</li>
  <li>Corrosão exterior superior a 10% da superfície</li>
  <li>Mais de <strong>25 anos</strong> de serviço (independentemente do estado visual)</li>
</ul>

<h3>Seleção do cabo de substituição</h3>
<ul>
  <li>Verificar placa de dados do elevador: diâmetro, construção (ex: 8×19 Seale), resistência mínima à tração</li>
  <li>Fator de segurança mínimo: <strong>12 para suspensão simples</strong>, 16 para polipasto 2:1</li>
  <li>Nunca misturar cabos de marcas ou lotes diferentes</li>
  <li>Substituir sempre <strong>todos os cabos</strong> em simultâneo</li>
</ul>

<h3>Procedimento de substituição</h3>
<ol>
  <li>Bloquear a cabine no poço inferior com cavaletes de segurança</li>
  <li>Cortar alimentação elétrica e colocar bloqueio LOTO</li>
  <li>Medir comprimento exato dos cabos antigos antes de retirar</li>
  <li>Fixar cabo novo ao antigo com arame de guia e passar pela polia de desvio</li>
  <li>Montar terminais de cunha (wedge sockets) — não usar grampos de cabo</li>
  <li>Ajustar tensão de todos os cabos com dinamómetro — diferença máxima: 5%</li>
  <li>Testar elevador em modo lento (inspection) 5 viagens completas</li>
  <li>Verificar nivelamento e reajustar se necessário</li>
  <li>Registar data, número do lote e certificado dos cabos no livro de manutenção</li>
</ol>`,
    tags: ['cabos', 'tração', 'EN 81-20', 'substituição', 'LOTO', 'segurança'],
    featured: false,
    published: true,
    views: 0,
    author: 'FestLift',
    authorId: null,
    createdAt: d(35),
    updatedAt: d(12)
  },
  {
    title: 'Verificação e substituição do sistema de travagem',
    category: 'reparacao',
    difficulty: 'avancado',
    summary: 'Inspeção dos travões eletromagnéticos, medição da folga, substituição de pastilhas e teste de eficácia de travagem.',
    content: `<h2>Sistema de travagem de elevadores</h2>
<p>Os travões são o componente de segurança mais crítico do elevador. A EN 81-20 exige que o travão possa segurar a cabine carregada a 125% da carga nominal.</p>

<h3>Tipos de travões</h3>
<ul>
  <li><strong>Travão de disco:</strong> comum em máquinas sem quarto de máquinas (MRL)</li>
  <li><strong>Travão de tambor:</strong> máquinas mais antigas, Otis, KONE</li>
  <li><strong>Travão duplo:</strong> obrigatório em instalações novas (EN 81-20:2014)</li>
</ul>

<h3>Verificação mensal</h3>
<ul>
  <li>Folga das pastilhas: <strong>0,1–0,3 mm</strong> (ajustar parafuso de folga se fora de intervalo)</li>
  <li>Verificar que as bobines soltam completamente ao energizar (sem chiado)</li>
  <li>Inspecionar visualmente pastilhas — substituir se espessura &lt; 2 mm</li>
  <li>Verificar microswitch de confirmação de travão aberto</li>
</ul>

<h3>Teste de eficácia (anual)</h3>
<ol>
  <li>Carregar cabine a 125% da carga nominal (usar pesos calibrados)</li>
  <li>Subir a cabine ao piso superior</li>
  <li>Desligar o motor — o travão deve segurar imediatamente</li>
  <li>A cabine não pode descer mais de 10 mm em 5 minutos</li>
  <li>Registar resultado e data no livro</li>
</ol>

<div class="alert alert-warning"><i class="fas fa-tools mr-2"></i>Nunca lubrificar as superfícies de atrito do travão. Usar apenas ar comprimido para limpar o pó de pastilha.</div>`,
    tags: ['travão', 'brake', 'segurança', 'pastilhas', 'EN 81-20'],
    featured: false,
    published: true,
    views: 0,
    author: 'FestLift',
    authorId: null,
    createdAt: d(30),
    updatedAt: d(8)
  },

  // ─── SEGURANÇA ────────────────────────────────────────────────────────────
  {
    title: 'Protocolo de resgate de passageiros encerrados no elevador',
    category: 'seguranca',
    difficulty: 'basico',
    summary: 'Procedimento passo a passo para resgate seguro de passageiros, comunicação e operação manual de emergência.',
    content: `<h2>Resgate de passageiros — Protocolo FestLift</h2>
<p>O resgate deve ser iniciado em no máximo <strong>30 minutos</strong> após o alarme. O técnico deve estar disponível 24/7.</p>

<div class="alert alert-info"><i class="fas fa-phone mr-2"></i>Linha de emergência FestLift: <strong>+351 926 380 243</strong></div>

<h3>Passo 1 — Avaliação inicial (por telefone)</h3>
<ul>
  <li>Confirmar número de passageiros e estado de saúde</li>
  <li>Perguntar se há crianças, idosos ou pessoas com problemas de saúde</li>
  <li>Instruir para não forçar abertura das portas</li>
  <li>Confirmar localização exata da cabine (entre que pisos)</li>
</ul>

<h3>Passo 2 — Chegada ao local</h3>
<ul>
  <li>Ir diretamente à casa das máquinas — NÃO ao patamar</li>
  <li>Confirmar posição da cabine pelo indicador de posição</li>
  <li>Desligar o motor mas manter o circuito de iluminação da cabine ligado</li>
</ul>

<h3>Passo 3 — Movimentação manual da cabine</h3>
<ol>
  <li>Soltar manualmente o travão com o manípulo de desbloqueio</li>
  <li>Mover a cabine em direção ao piso mais próximo com a manivela de emergência</li>
  <li>Parar quando o indicador de posição mostrar alinhamento com o piso</li>
  <li><strong>Nunca abrir as portas de patamar se a cabine não estiver nivelada</strong> (risco de queda)</li>
</ol>

<h3>Passo 4 — Abertura das portas</h3>
<ul>
  <li>Usar a chave triangular para abrir a porta de patamar apenas quando cabine alinhada</li>
  <li>Assistir os passageiros na saída com calma</li>
  <li>Fechar e bloquear todas as portas antes de qualquer outra ação</li>
</ul>

<h3>Passo 5 — Diagnóstico e relatório</h3>
<ul>
  <li>Identificar a causa da paragem (falha elétrica, sobrecarga, etc.)</li>
  <li>Registar o incidente no sistema FestLift com: hora, causa, duração, passageiros</li>
  <li>Notificar o proprietário/condomínio por escrito</li>
</ul>`,
    tags: ['resgate', 'emergência', 'passageiros', 'protocolo', 'segurança'],
    featured: true,
    published: true,
    views: 0,
    author: 'FestLift',
    authorId: null,
    createdAt: d(58),
    updatedAt: d(2)
  },
  {
    title: 'Inspeção periódica obrigatória — O que a entidade inspetora verifica',
    category: 'seguranca',
    difficulty: 'intermedio',
    summary: 'Guia completo sobre o que é verificado nas inspeções periódicas (APSEI, SGS, Bureau Veritas), prazos e como preparar o elevador.',
    content: `<h2>Inspeção periódica de elevadores em Portugal</h2>
<p>Ao abrigo do <strong>DL 320/2002</strong> e da <strong>Portaria n.º 331/2014</strong>, todos os elevadores devem ser inspecionados por uma entidade acreditada pelo IPAC.</p>

<h3>Prazos de inspeção</h3>
<table class="table table-bordered table-sm">
  <thead><tr><th>Tipo de utilização</th><th>Periodicidade</th></tr></thead>
  <tbody>
    <tr><td>Edifícios de habitação coletiva</td><td>Cada <strong>4 anos</strong></td></tr>
    <tr><td>Edifícios de serviços / comércio</td><td>Cada <strong>2 anos</strong></td></tr>
    <tr><td>Hospitais e estabelecimentos de saúde</td><td>Cada <strong>2 anos</strong></td></tr>
    <tr><td>Após qualquer classificação C1 ou C2</td><td><strong>30 dias</strong> após reparação</td></tr>
  </tbody>
</table>

<h3>O que a entidade inspetora verifica</h3>
<h4>Documentação (verificação prévia)</h4>
<ul>
  <li>Livro de manutenção com registos em dia</li>
  <li>Contrato de manutenção válido</li>
  <li>Resultado da inspeção anterior</li>
  <li>Certificado de conformidade original do equipamento</li>
</ul>

<h4>Verificação técnica no local</h4>
<ul>
  <li>Funcionamento de todos os dispositivos de segurança (limites, parachoque, travões)</li>
  <li>Estado das portas e seus bloqueios elétricos e mecânicos</li>
  <li>Nivelamento nas paragens</li>
  <li>Iluminação de emergência e alarme</li>
  <li>Estado do poço e casa de máquinas</li>
  <li>Medição de velocidade com tacómetro calibrado</li>
</ul>

<h3>Como preparar o elevador para inspeção</h3>
<ol>
  <li>Garantir que todos os registos de manutenção estão em ordem nos últimos 4 anos</li>
  <li>Verificar que a iluminação do poço e cabine funciona</li>
  <li>Testar alarme e intercomunicador na véspera</li>
  <li>Limpar a casa das máquinas e o poço</li>
  <li>Confirmar data de validade dos extintores (se obrigatórios)</li>
  <li>Estar presente durante toda a inspeção</li>
</ol>`,
    tags: ['inspeção', 'periódica', 'IPAC', 'DL 320/2002', 'Bureau Veritas', 'SGS'],
    featured: true,
    published: true,
    views: 0,
    author: 'FestLift',
    authorId: null,
    createdAt: d(52),
    updatedAt: d(1)
  },
  {
    title: 'Medição de velocidade e desaceleração — Procedimento com tacómetro',
    category: 'seguranca',
    difficulty: 'avancado',
    summary: 'Como medir e registar a velocidade real do elevador, comparar com a nominal e ajustar o variador de frequência.',
    content: `<h2>Medição de velocidade do elevador</h2>
<p>A velocidade real não pode exceder a nominal em mais de <strong>5%</strong> nem ser inferior em mais de <strong>8%</strong> (EN 81-20, cláusula 5.2).</p>

<h3>Equipamento necessário</h3>
<ul>
  <li>Tacómetro óptico ou magnético (ex: Testo 470 ou Extech RPM33)</li>
  <li>Fita reflexora (para tacómetro óptico)</li>
  <li>Multímetro para verificar sinal de encoder</li>
  <li>Laptop com software do fabricante do variador (se ajuste necessário)</li>
</ul>

<h3>Procedimento de medição no cabo</h3>
<ol>
  <li>Colar fita reflexora num dos cabos de tração no poço</li>
  <li>Posicionar tacómetro a 5–10 cm da fita</li>
  <li>Fazer 3 viagens a plena carga no sentido de subida</li>
  <li>Registar velocidade máxima de cruzeiro (excluir aceleração e desaceleração)</li>
  <li>Repetir no sentido de descida</li>
  <li>Velocidade admissível = Vn ± 5%</li>
</ol>

<h3>Ajuste do variador de frequência (VFD)</h3>
<p>Após medição, se fora de especificação, ajustar:</p>
<ul>
  <li>Parâmetro de frequência de saída máxima (F01 ou equivalente)</li>
  <li>Parâmetro de curva de aceleração (rampa)</li>
  <li>Re-medir após cada ajuste</li>
  <li>Registar valores antes e depois do ajuste</li>
</ul>

<h3>Valores de referência comuns</h3>
<table class="table table-bordered table-sm">
  <thead><tr><th>Vn nominal</th><th>Mín. permitido</th><th>Máx. permitido</th></tr></thead>
  <tbody>
    <tr><td>0,63 m/s</td><td>0,58 m/s</td><td>0,66 m/s</td></tr>
    <tr><td>1,00 m/s</td><td>0,92 m/s</td><td>1,05 m/s</td></tr>
    <tr><td>1,60 m/s</td><td>1,47 m/s</td><td>1,68 m/s</td></tr>
  </tbody>
</table>`,
    tags: ['velocidade', 'tacómetro', 'VFD', 'EN 81-20', 'medição'],
    featured: false,
    published: true,
    views: 0,
    author: 'FestLift',
    authorId: null,
    createdAt: d(28),
    updatedAt: d(6)
  },

  // ─── AVARIAS ──────────────────────────────────────────────────────────────
  {
    title: 'Diagnóstico de ruídos e vibrações — Guia de identificação',
    category: 'avarias',
    difficulty: 'basico',
    summary: 'Tabela de diagnóstico: tipo de ruído, localização provável e solução para as avarias mais frequentes.',
    content: `<h2>Diagnóstico de ruídos e vibrações em elevadores</h2>
<p>O ruído é frequentemente o primeiro sinal de uma avaria em desenvolvimento. A identificação precoce evita reparações maiores.</p>

<h3>Tabela de diagnóstico rápido</h3>
<table class="table table-bordered table-sm">
  <thead><tr><th>Tipo de ruído</th><th>Quando ocorre</th><th>Causa provável</th><th>Solução</th></tr></thead>
  <tbody>
    <tr><td>Rangido metálico</td><td>Durante movimento</td><td>Guias sem lubrificação</td><td>Lubrificar guias</td></tr>
    <tr><td>Pancada ao arrancar</td><td>Início de movimento</td><td>Folga nos amortecedores do motor</td><td>Apertar/substituir amortecedores</td></tr>
    <tr><td>Vibração na cabine</td><td>Em cruzeiro</td><td>Sapatas de guia gastas</td><td>Substituir sapatas</td></tr>
    <tr><td>Chiado nas portas</td><td>Abertura/fecho</td><td>Correia do operador a secar</td><td>Lubrificar ou substituir correia</td></tr>
    <tr><td>Barulho na paragem</td><td>Ao nivelar</td><td>Travão desajustado</td><td>Ajustar folga das pastilhas</td></tr>
    <tr><td>Zumbido contínuo</td><td>Elevador parado</td><td>Bobine do travão mal alimentada</td><td>Verificar tensão na bobine</td></tr>
    <tr><td>Batida periódica</td><td>Com frequência regular</td><td>Emenda no cabo de aço</td><td>Inspecionar todos os cabos</td></tr>
    <tr><td>Barulho no patamar</td><td>Chegada ao piso</td><td>Chapa de nivelamento desalinhada</td><td>Realinhar chapa magnética</td></tr>
  </tbody>
</table>

<h3>Procedimento de diagnóstico</h3>
<ol>
  <li>Fazer uma viagem de inspeção ouvindo atentamente em cada fase (arranque, cruzeiro, paragem)</li>
  <li>Isolar a origem: poço, máquina, cabine, ou portas</li>
  <li>Medir nível de vibração com smartphone (app VibSensor) — &gt;2 mm/s indica problema</li>
  <li>Fotografar o componente com problema antes de intervir</li>
  <li>Registar no sistema FestLift com descrição do ruído e localização</li>
</ol>`,
    tags: ['ruído', 'vibração', 'diagnóstico', 'avaria', 'troubleshooting'],
    featured: false,
    published: true,
    views: 0,
    author: 'FestLift',
    authorId: null,
    createdAt: d(42),
    updatedAt: d(7)
  },
  {
    title: 'Avaria no sistema de nivelamento — Diagnóstico e ajuste',
    category: 'avarias',
    difficulty: 'intermedio',
    summary: 'Quando o elevador para fora do nível do patamar: causas, ajuste dos sensores magnéticos e configuração do PLC.',
    content: `<h2>Problemas de nivelamento do elevador</h2>
<p>O nivelamento incorreto é uma das principais causas de queixas dos utilizadores e de acidentes por tropeção. A tolerância máxima é <strong>±10 mm</strong> (EN 81-20).</p>

<h3>Tipos de erro de nivelamento</h3>
<ul>
  <li><strong>Nivelamento alto:</strong> cabine para acima do nível do patamar</li>
  <li><strong>Nivelamento baixo:</strong> cabine para abaixo (mais perigoso)</li>
  <li><strong>Nivelamento variável:</strong> difere de piso para piso</li>
  <li><strong>Re-nivelamento excessivo:</strong> cabine oscila após parar</li>
</ul>

<h3>Causas e soluções</h3>
<table class="table table-bordered table-sm">
  <thead><tr><th>Causa</th><th>Diagnóstico</th><th>Solução</th></tr></thead>
  <tbody>
    <tr><td>Chapa magnética desalinhada</td><td>Medir posição da chapa no guia</td><td>Deslocar chapa ±5 mm e testar</td></tr>
    <tr><td>Sensor de vane sujo</td><td>Inspecionar sensor com lanterna</td><td>Limpar com ar comprimido</td></tr>
    <tr><td>Desgaste dos cabos (extensão)</td><td>Nivelamento piora ao longo do tempo</td><td>Ajustar chapa ou substituir cabos</td></tr>
    <tr><td>Parâmetro de rampa VFD</td><td>Nivelamento melhor a baixa carga</td><td>Ajustar parâmetro de desaceleração</td></tr>
    <tr><td>Encoder com drift</td><td>Nivelamento variável aleatório</td><td>Substituir encoder</td></tr>
  </tbody>
</table>

<h3>Procedimento de ajuste da chapa magnética</h3>
<ol>
  <li>Medir a posição real da cabine em relação ao patamar com régua</li>
  <li>Anotar o erro em mm (+ se alto, - se baixo)</li>
  <li>Deslocar a chapa magnética nesse pilar na direção contrária ao erro</li>
  <li>Repetir para todos os pisos</li>
  <li>Fazer 5 viagens de teste e re-medir</li>
</ol>`,
    tags: ['nivelamento', 'sensor', 'chapa magnética', 'VFD', 'ajuste'],
    featured: false,
    published: true,
    views: 0,
    author: 'FestLift',
    authorId: null,
    createdAt: d(25),
    updatedAt: d(9)
  },
  {
    title: 'Verificação do quadro elétrico e circuitos de segurança',
    category: 'avarias',
    difficulty: 'intermedio',
    summary: 'Como inspecionar o quadro de comando, testar a cadeia de segurança e localizar falhas com multímetro.',
    content: `<h2>Quadro elétrico e cadeia de segurança</h2>
<p>A maioria das paragens por avaria elétrica tem origem na <strong>cadeia de segurança</strong> — um circuito série que inclui todos os contactos de segurança do elevador. Se um contacto abrir, o elevador para.</p>

<h3>Componentes da cadeia de segurança</h3>
<ol>
  <li>Contacto do limite superior do poço</li>
  <li>Contacto do limite inferior do poço</li>
  <li>Contactos de fechamento de todas as portas de patamar</li>
  <li>Contacto da porta de cabine</li>
  <li>Contacto de posição do parachoque</li>
  <li>Contacto do limitador de velocidade</li>
  <li>Contacto de posição do travão (se equipado)</li>
</ol>

<h3>Diagnóstico com multímetro</h3>
<ol>
  <li>Desligar a alimentação principal e colocar LOTO</li>
  <li>Medir continuidade entre os terminais de entrada e saída da cadeia</li>
  <li>Se circuito aberto: fechar manualmente cada contacto e medir — o contacto que ao fechar restabelece a continuidade é o defeituoso</li>
  <li>Verificar tensão nos terminais de cada contacto com elevador em modo de inspeção</li>
  <li>Contacto com 0V na entrada indica falha a montante</li>
</ol>

<h3>Problemas comuns no quadro</h3>
<ul>
  <li><strong>Contactor oxidado:</strong> limpar com spray contato ou substituir</li>
  <li><strong>Fusível queimado:</strong> identificar causa da sobrecorrente antes de substituir</li>
  <li><strong>Relé de segurança com falha:</strong> substituir por modelo idêntico</li>
  <li><strong>PLC com erro:</strong> ligar PC ao PLC e ler código de erro</li>
</ul>

<div class="alert alert-warning"><i class="fas fa-exclamation-triangle mr-2"></i>Nunca pôr pontes nos contactos de segurança para "testar". É ilegal e extremamente perigoso.</div>`,
    tags: ['elétrico', 'cadeia de segurança', 'quadro', 'contactor', 'PLC', 'multímetro'],
    featured: false,
    published: true,
    views: 0,
    author: 'FestLift',
    authorId: null,
    createdAt: d(22),
    updatedAt: d(4)
  },

  // ─── REGULAMENTAÇÃO ───────────────────────────────────────────────────────
  {
    title: 'DL 320/2002 — Guia prático para técnicos de manutenção',
    category: 'regulamentacao',
    difficulty: 'basico',
    summary: 'Resumo do Decreto-Lei 320/2002: obrigações da empresa de manutenção, registos obrigatórios e sanções.',
    content: `<h2>Decreto-Lei n.º 320/2002 — O que é e o que implica</h2>
<p>O DL 320/2002 é o principal diploma legal que regula a manutenção de elevadores em Portugal. Define as obrigações das empresas de manutenção, os prazos de inspeção e as sanções por incumprimento.</p>

<h3>Obrigações da empresa de manutenção (artigo 7.º)</h3>
<ul>
  <li>Realizar manutenção mensal a cada elevador sob contrato</li>
  <li>Comunicar à câmara municipal o início e fim de cada contrato de manutenção</li>
  <li>Manter livro de manutenção atualizado, disponível para inspeção</li>
  <li>Disponibilizar serviço de emergência 24/7</li>
  <li>Intervir em chamadas de emergência em máximo <strong>4 horas</strong> (dias úteis) / <strong>6 horas</strong> (fins de semana)</li>
  <li>Comunicar imediatamente à câmara qualquer imobilização por razões de segurança</li>
</ul>

<h3>Registos obrigatórios no livro de manutenção</h3>
<ul>
  <li>Data e hora de cada visita</li>
  <li>Nome e assinatura do técnico</li>
  <li>Trabalhos realizados</li>
  <li>Anomalias detetadas e ações tomadas</li>
  <li>Resultado de testes periódicos (travão, limitador de velocidade, etc.)</li>
</ul>

<h3>Sanções por incumprimento (artigo 15.º)</h3>
<table class="table table-bordered table-sm">
  <thead><tr><th>Infração</th><th>Coima mín.</th><th>Coima máx.</th></tr></thead>
  <tbody>
    <tr><td>Falta de contrato de manutenção</td><td>€ 250</td><td>€ 3.700</td></tr>
    <tr><td>Não comunicar início/fim de contrato</td><td>€ 250</td><td>€ 3.700</td></tr>
    <tr><td>Manutenção não realizada</td><td>€ 1.000</td><td>€ 10.000</td></tr>
    <tr><td>Não disponibilizar serviço 24/7</td><td>€ 500</td><td>€ 5.000</td></tr>
  </tbody>
</table>`,
    tags: ['DL 320/2002', 'regulamentação', 'obrigações', 'câmara municipal', 'coima'],
    featured: true,
    published: true,
    views: 0,
    author: 'FestLift',
    authorId: null,
    createdAt: d(65),
    updatedAt: d(0)
  },
  {
    title: 'Classificação C1, C2 e C3 — Entender as não-conformidades de inspeção',
    category: 'regulamentacao',
    difficulty: 'intermedio',
    summary: 'O que significa cada classificação, prazos de correção obrigatórios e como a FestLift deve atuar após cada resultado.',
    content: `<h2>Classificações de não-conformidade em Portugal</h2>
<p>Quando a entidade inspetora deteta anomalias, classifica-as em C1, C2 ou C3, com diferentes implicações e prazos de correção.</p>

<h3>C1 — Imobilização imediata</h3>
<div class="alert alert-danger"><i class="fas fa-stop-circle mr-2"></i><strong>Risco iminente de acidente.</strong> O elevador é imobilizado no local.</div>
<p>Exemplos de C1: parachoque sem funcionar, travão ineficaz, portas sem bloqueio elétrico, poço inundado.</p>
<ul>
  <li>A empresa de manutenção tem <strong>obrigação imediata</strong> de reparar</li>
  <li>Re-inspeção obrigatória após reparação (prazo: <strong>30 dias</strong>)</li>
  <li>A câmara municipal deve ser notificada em 24h</li>
</ul>

<h3>C2 — Reprovação com prazo de reparação</h3>
<div class="alert alert-warning"><i class="fas fa-exclamation-circle mr-2"></i><strong>Risco presente mas não iminente.</strong> O elevador pode continuar em serviço durante o período de reparação.</div>
<p>Exemplos de C2: iluminação de emergência deficiente, nivelamento &gt;10 mm, desgaste de cabos perto do limite, folga de porta excessiva.</p>
<ul>
  <li>Prazo de reparação: <strong>30 dias</strong> (standard) ou conforme relatório</li>
  <li>Re-inspeção obrigatória após reparação</li>
</ul>

<h3>C2* — Acordo de Modernização (Despacho 17/2022)</h3>
<p>Para anomalias estruturais cuja correção implica modernização completa:</p>
<ul>
  <li>Prazo alargado para <strong>2 anos</strong></li>
  <li>Requer plano de modernização assinado e aprovado</li>
  <li>FestLift emite proposta de modernização ao proprietário</li>
</ul>

<h3>C3 — Observação</h3>
<div class="alert alert-info"><i class="fas fa-info-circle mr-2"></i><strong>Recomendação sem obrigação imediata.</strong></div>
<p>Exemplos de C3: desgaste inicial de componentes, pintura deteriorada, falta de iluminação na casa das máquinas.</p>
<ul>
  <li>Corrigir na próxima visita de manutenção regular</li>
  <li>Sem re-inspeção obrigatória</li>
  <li>Registar ação corretiva no livro de manutenção</li>
</ul>`,
    tags: ['C1', 'C2', 'C3', 'não-conformidade', 'inspeção', 'Despacho 17/2022'],
    featured: true,
    published: true,
    views: 0,
    author: 'FestLift',
    authorId: null,
    createdAt: d(48),
    updatedAt: d(0)
  },
  {
    title: 'Despacho 17/2022 — Acordo de Modernização de Elevadores',
    category: 'regulamentacao',
    difficulty: 'avancado',
    summary: 'O que é o Despacho 17/2022, como funciona o acordo de modernização e quais os requisitos mínimos de segurança exigidos.',
    content: `<h2>Despacho 17/2022 — Acordo de Modernização</h2>
<p>O Despacho n.º 17/2022 criou um mecanismo para elevadores com não-conformidades estruturais (C2 grave) poderem continuar em serviço mediante compromisso de modernização.</p>

<h3>Âmbito de aplicação</h3>
<p>Aplica-se a elevadores que apresentem C2 relacionado com:</p>
<ul>
  <li>Ausência de proteção da maquinaria (guardas)</li>
  <li>Portas de patamar sem bloqueio dual (mecânico + elétrico)</li>
  <li>Ausência de nivelamento automático</li>
  <li>Controlo antigo sem sistema de segurança programável (relay logic)</li>
  <li>Iluminação e ventilação da cabine não conformes com EN 81-20</li>
</ul>

<h3>Como funciona o acordo</h3>
<ol>
  <li>A entidade inspetora emite relatório com C2* (em vez de C2)</li>
  <li>A empresa de manutenção (FestLift) elabora <strong>Plano de Modernização</strong> assinado</li>
  <li>O proprietário assina o compromisso de modernização</li>
  <li>Prazo para execução da modernização: <strong>2 anos</strong> a partir da data de inspeção</li>
  <li>Re-inspeção após conclusão da modernização</li>
</ol>

<h3>O que a FestLift deve incluir no plano</h3>
<ul>
  <li>Descrição técnica das obras previstas</li>
  <li>Orçamento detalhado</li>
  <li>Cronograma de execução</li>
  <li>Confirmação que os trabalhos cumprirão a EN 81-20:2014</li>
</ul>

<h3>Medidas de segurança obrigatórias durante o período de modernização</h3>
<ul>
  <li>Manutenção mensal obrigatória mantida</li>
  <li>Registo de qualquer nova anomalia com notificação imediata ao proprietário</li>
  <li>Se surgir C1 durante o período, imobilização imediata</li>
</ul>`,
    tags: ['Despacho 17/2022', 'modernização', 'C2*', 'EN 81-20', 'regulamentação'],
    featured: false,
    published: true,
    views: 0,
    author: 'FestLift',
    authorId: null,
    createdAt: d(38),
    updatedAt: d(11)
  },
  {
    title: 'Comunicação de início e fim de serviço à câmara municipal',
    category: 'regulamentacao',
    difficulty: 'basico',
    summary: 'Obrigações legais de comunicação à câmara: quando comunicar, como preencher, prazos e o que acontece se não o fizer.',
    content: `<h2>Comunicação à câmara municipal — Obrigação legal</h2>
<p>Nos termos do <strong>artigo 11.º do DL 320/2002</strong>, a empresa de manutenção tem obrigação de comunicar à câmara municipal o início e o fim de cada contrato de manutenção.</p>

<h3>Comunicação de início de serviço</h3>
<ul>
  <li><strong>Prazo:</strong> 15 dias após assinatura do contrato</li>
  <li><strong>Conteúdo obrigatório:</strong>
    <ul>
      <li>Identificação do elevador (número municipal, morada)</li>
      <li>Identificação do proprietário/condomínio</li>
      <li>Data de início do contrato</li>
      <li>Identificação da empresa de manutenção (FestLift — NIF 515924741)</li>
    </ul>
  </li>
  <li><strong>Onde enviar:</strong> Câmara Municipal competente (verificar contacto na plataforma FestLift)</li>
  <li><strong>Formato:</strong> Por escrito (email com AR ou carta registada)</li>
</ul>

<h3>Comunicação de fim de serviço</h3>
<ul>
  <li><strong>Prazo:</strong> 15 dias após a cessação do contrato</li>
  <li><strong>Conteúdo obrigatório:</strong> igual ao de início + data de fim + motivo da cessação</li>
  <li><strong>Importante:</strong> A câmara notifica o proprietário para contratar nova empresa</li>
</ul>

<h3>Como gerar a comunicação no sistema FestLift</h3>
<ol>
  <li>Aceder a <strong>Elevadores → Ações → Enviar para câmara</strong></li>
  <li>Selecionar o tipo: "Início de Serviço" ou "Fim de Serviço"</li>
  <li>Confirmar data e dados do equipamento</li>
  <li>Clicar em "Enviar" — o sistema envia automaticamente para o email da câmara</li>
  <li>Guardar o comprovativo no dossiê do elevador</li>
</ol>

<div class="alert alert-warning"><i class="fas fa-gavel mr-2"></i>A não comunicação pode resultar em coima entre €250 e €3.700. O sistema FestLift regista automaticamente todas as comunicações enviadas.</div>`,
    tags: ['câmara municipal', 'comunicação', 'DL 320/2002', 'início de serviço', 'fim de serviço'],
    featured: false,
    published: true,
    views: 0,
    author: 'FestLift',
    authorId: null,
    createdAt: d(32),
    updatedAt: d(0)
  },
  {
    title: 'Registo e documentação de manutenção — Como preencher o livro',
    category: 'regulamentacao',
    difficulty: 'basico',
    summary: 'Guia para preenchimento correto do livro de manutenção: campos obrigatórios, exemplos e erros comuns a evitar.',
    content: `<h2>Livro de manutenção — Preenchimento correto</h2>
<p>O livro de manutenção é um documento legal. O seu preenchimento incorreto ou incompleto é equiparado a falta de manutenção para efeitos de inspeção e coima.</p>

<h3>Campos obrigatórios por visita</h3>
<table class="table table-bordered table-sm">
  <thead><tr><th>Campo</th><th>Exemplo</th><th>Obrigatório?</th></tr></thead>
  <tbody>
    <tr><td>Data da visita</td><td>13/06/2026</td><td>Sim</td></tr>
    <tr><td>Hora de entrada e saída</td><td>09:15 – 10:45</td><td>Sim</td></tr>
    <tr><td>Nome do técnico</td><td>João Silva</td><td>Sim</td></tr>
    <tr><td>Número de identificação do técnico</td><td>TEC-042</td><td>Sim</td></tr>
    <tr><td>Trabalhos realizados</td><td>"Lubrificação de guias, teste de travão, verificação de portas"</td><td>Sim</td></tr>
    <tr><td>Anomalias detetadas</td><td>"Sapata esquerda com desgaste — programar substituição"</td><td>Se existirem</td></tr>
    <tr><td>Ações corretivas tomadas</td><td>"Substituída sapata esquerda — stock consumido"</td><td>Se existirem</td></tr>
    <tr><td>Assinatura do técnico</td><td>[assinatura]</td><td>Sim</td></tr>
  </tbody>
</table>

<h3>Erros comuns que geram C3 ou C2 na inspeção</h3>
<ul>
  <li>Visitas registadas mas assinatura em falta</li>
  <li>Descrição demasiado vaga: "manutenção efetuada" sem detalhe</li>
  <li>Lacunas temporais &gt;45 dias entre visitas (obrigatório mensal)</li>
  <li>Anomalias detetadas sem registo de ação corretiva</li>
  <li>Datas corrigidas ou rasuras sem rubrica</li>
</ul>

<h3>Formato digital (aprovado pelo IPAC)</h3>
<p>O sistema FestLift gera automaticamente o registo de cada visita de manutenção registada na aplicação. O registo digital tem valor legal equivalente ao livro físico desde que:</p>
<ul>
  <li>Assinado eletronicamente pelo técnico (PIN no app)</li>
  <li>Com timestamp imutável</li>
  <li>Disponível para consulta durante a inspeção (PDF exportável)</li>
</ul>`,
    tags: ['livro de manutenção', 'documentação', 'registo', 'inspeção', 'DL 320/2002'],
    featured: false,
    published: true,
    views: 0,
    author: 'FestLift',
    authorId: null,
    createdAt: d(20),
    updatedAt: d(0)
  },
  {
    title: 'Teste de carga e sobrecarga — Procedimento e registo',
    category: 'seguranca',
    difficulty: 'intermedio',
    summary: 'Como realizar o teste de sobrecarga a 125%, equipamentos necessários, critérios de aprovação e o que fazer em caso de falha.',
    content: `<h2>Teste de carga e sobrecarga</h2>
<p>O teste de sobrecarga a 125% da capacidade nominal é exigido na inspeção periódica (EN 81-20, cláusula 8.2.3). Deve ser realizado com a entidade inspetora presente.</p>

<h3>Cálculo da carga de teste</h3>
<ul>
  <li>Fórmula: <strong>Carga teste = Carga nominal (kg) × 1,25</strong></li>
  <li>Exemplo: elevador 630 kg → usar 630 × 1,25 = <strong>787,5 kg</strong> (usar 790 kg de pesos calibrados)</li>
  <li>Os pesos devem ter certificado de calibração válido</li>
</ul>

<h3>Equipamento necessário</h3>
<ul>
  <li>Pesos calibrados (recomendado: sacos de areia de 25 kg ou pesos metálicos)</li>
  <li>Balança calibrada para verificar total</li>
  <li>Régua de nivelamento (±1 mm)</li>
  <li>Cronómetro para teste de paragem</li>
</ul>

<h3>Procedimento</h3>
<ol>
  <li>Confirmar que a manutenção mensal está em dia</li>
  <li>Carregar a cabine com os pesos calibrados — distribuir uniformemente</li>
  <li>Realizar 3 viagens completas entre pisos extremos no sentido de subida</li>
  <li>Testar o travão: elevar ao piso superior e desligar motor — cabine não pode descer</li>
  <li>Testar o dispositivo de sobrecarga (buzzer ou paragem): carregar +10% adicional — deve alertar e não arrancar</li>
  <li>Medir nivelamento em cada piso com carga</li>
  <li>Registar todos os resultados</li>
</ol>

<h3>Critérios de aprovação</h3>
<table class="table table-bordered table-sm">
  <thead><tr><th>Parâmetro</th><th>Critério</th></tr></thead>
  <tbody>
    <tr><td>Motor arranca com 125% carga</td><td>Sem sobreaquecimento em 3 viagens</td></tr>
    <tr><td>Nivelamento com carga</td><td>≤ ±10 mm em todos os pisos</td></tr>
    <tr><td>Travão com 125% carga</td><td>Descida ≤ 10 mm em 5 min</td></tr>
    <tr><td>Dispositivo de sobrecarga</td><td>Alerta a 100–110% da carga nominal</td></tr>
  </tbody>
</table>`,
    tags: ['teste de carga', 'sobrecarga', '125%', 'inspeção', 'travão', 'EN 81-20'],
    featured: false,
    published: true,
    views: 0,
    author: 'FestLift',
    authorId: null,
    createdAt: d(15),
    updatedAt: d(0)
  },
  {
    title: 'Limpeza e manutenção da caixa (poço) do elevador',
    category: 'manutencao',
    difficulty: 'basico',
    summary: 'Procedimento de limpeza do poço, frequência obrigatória, materiais permitidos e cuidados de segurança.',
    content: `<h2>Limpeza do poço do elevador</h2>
<p>A limpeza do poço é obrigatória e faz parte da manutenção regular. Um poço sujo pode causar falhas nos sensores, acumulação de gases e risco de incêndio.</p>

<h3>Frequência recomendada</h3>
<ul>
  <li><strong>Mensal:</strong> inspeção visual, remoção de detritos visíveis</li>
  <li><strong>Trimestral:</strong> limpeza completa do poço com aspirador</li>
  <li><strong>Anual:</strong> limpeza profunda com desengordurante (antes da inspeção periódica)</li>
</ul>

<h3>Equipamento de proteção individual (EPI)</h3>
<ul>
  <li>Capacete com lanterna integrada</li>
  <li>Luvas de proteção mecânica</li>
  <li>Sapatos de biqueira de aço</li>
  <li>Vestuário de trabalho (sem partes soltas)</li>
</ul>

<h3>Procedimento de acesso ao poço</h3>
<ol>
  <li>Colocar o elevador em modo inspeção (chave de inspeção no quadro)</li>
  <li>Posicionar a cabine no 1.º piso</li>
  <li>Aceder ao poço pelo acesso inferior (se existir) ou pela via de manutenção</li>
  <li>NUNCA entrar no poço sem o elevador em modo inspeção</li>
  <li>Verificar que o botão de STOP do poço está acessível</li>
</ol>

<h3>O que remover/limpar</h3>
<ul>
  <li>Pó e detritos do chão do poço (aspirar — não varrer, para não levantar poeira)</li>
  <li>Óleo acumulado nos amortecedores e fundo do poço (absorventes industriais)</li>
  <li>Teias de aranha e insetos nos sensores</li>
  <li>Detritos nas ranhuras das guias</li>
</ul>

<div class="alert alert-danger"><i class="fas fa-biohazard mr-2"></i>Se houver água estagnada no poço: não entrar. Verificar fonte de infiltração e contactar responsável pelo edifício antes de qualquer intervenção.</div>`,
    tags: ['limpeza', 'poço', 'caixa', 'higiene', 'segurança', 'manutenção'],
    featured: false,
    published: true,
    views: 0,
    author: 'FestLift',
    authorId: null,
    createdAt: d(18),
    updatedAt: d(0)
  }
];

async function seed() {
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const col = db.collection('knowledge_base');

        const existing = await col.countDocuments();
        if (existing > 0) {
            console.log(`⚠️  Já existem ${existing} artigos. A apagar e recriar...`);
            await col.deleteMany({});
        }

        const result = await col.insertMany(articles);
        console.log(`✅ ${result.insertedCount} artigos inseridos na base de conhecimento.`);

        // Criar índices
        await col.createIndex({ category: 1 });
        await col.createIndex({ published: 1, featured: -1, updatedAt: -1 });
        await col.createIndex({ title: 'text', summary: 'text', tags: 'text' });
        console.log('✅ Índices criados.');

        // Resumo por categoria
        const stats = await col.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]).toArray();
        console.log('\n📊 Artigos por categoria:');
        stats.forEach(s => console.log(`   ${s._id}: ${s.count} artigos`));
    } finally {
        await client.close();
    }
}

seed().catch(console.error);
