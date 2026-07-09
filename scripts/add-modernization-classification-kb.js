// scripts/add-modernization-classification-kb.js — Adiciona artigo sobre classificação C1/C2/C3
// em modernizações (Artº 20º DL 320/02 / EN 81-20), sem apagar artigos existentes.
require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME   = process.env.DB_NAME   || 'deapseak';

const now = new Date();

function table(headers, rows) {
  const thead = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<table class="table table-bordered table-sm">${thead}${tbody}</table>`;
}

const content = `
<h2>Disposições a aplicar nas alterações e remodelações dos elevadores existentes</h2>
<p>Ao abrigo do <strong>Artº 20º do DL 320/2002</strong>, sempre que um elevador existente sofre uma alteração ou remodelação de um componente principal, aplicam-se disposições específicas da <strong>EN 81-20</strong> a esse componente (e não a totalidade da instalação). Cada ponto de norma tem uma classificação de não-conformidade associada (C1/C2/C3) caso não seja cumprido. Este guia organiza as exigências por cenário de intervenção.</p>

<div class="alert alert-info"><i class="fas fa-info-circle mr-2"></i>Usar esta tabela para preparar orçamentos de modernização e para justificar perante o cliente/câmara o âmbito técnico exigido por cada tipo de intervenção.</div>

<h3>1. Alteração da máquina mantendo a velocidade</h3>
${table(['Ponto norma', 'Situação', 'Observações', 'Classe'], [
  ['5.2.6.3.3', 'Buracos na laje com bordaduras', '—', 'C3'],
  ['5.2.6.3.2.1', 'Altura mínima da zona de trabalho na C.M. ≥ 2.10 m / Área ≥ 0.50m x 0.60m', 'No mínimo deve cumprir com EN 81.21', 'C3'],
  ['5.2.1.4.2', 'Iluminação da zona de trabalho (≥200 lux)', '&lt;100 lux (EN 12464-1) → C2 &nbsp;|&nbsp; ≥100 lux → C3', 'C2/C3'],
  ['5.2.1.7', 'Dispositivo para suspensão da máquina', 'Com comprovativo de ensaio de carga ou declaração', 'C3'],
  ['5.5.3', 'Aderência dos cabos', 'Aderência à subida e à descida', 'C1'],
  ['5.5.7.1 e 5.5.7.2', 'Proteção das rodas, tração e desvio', 'Rodas protegidas contra acidentes corporais (zona de convergência de cabos e raios), saída dos cabos e introdução de corpos estranhos', 'C2'],
  ['5.5.2.1', 'Relação diâmetro da roda de aderência / cabos', 'Aceita-se com avaliação de risco ON', 'C2'],
  ['5.5.1.2.a)', 'Diâmetro do cabo ≥ 8 mm', 'Aceita-se com avaliação de risco ON', 'C2'],
  ['5.9.2.3.1.a.3', 'Volante amovível com contacto elétrico', '—', 'C2'],
  ['5.2.6.6.2.c', 'Identificação da zona de desencravamento no quadro de resgate/máquina', '—', 'C2'],
  ['5.9.2.3.3', 'Dispositivo elétrico de socorro se a força for superior a 400 N', '—', 'C3'],
  ['5.9.1.2', 'Peças rotativas e lisas pintadas de amarelo (volante)', '—', 'C3'],
  ['5.10.4.2', 'Proteção contra sobreaquecimento do motor', 'Por PTC ou térmico', 'C2'],
  ['5.12.1.11.1.e', 'Stop na máquina caso o interruptor principal se encontre a mais de 1 m', '—', 'C2'],
  ['5.9.2.2.2.3', 'Monitorização do travão', 'Máquina preparada com dispositivos de controlo; se o comando já é EN-81.20, tem de estar a funcionar', 'C2'],
])}

<h3>2. Alteração da máquina com alteração da velocidade</h3>
<p>Cumula todos os pontos do cenário anterior, mais:</p>
${table(['Ponto norma', 'Situação', 'Observações', 'Classe'], [
  ['5.2.5.7.1', 'Espaço de refúgio no teto da cabina', 'No mínimo cumprir critérios de teto reduzido da EN 81.21', 'C2'],
  ['5.2.5.8.1', 'Espaço de refúgio no poço', 'No mínimo cumprir critérios de poço reduzido da EN 81.21', 'C2'],
  ['5.2.5.7.1 ou 5.2.5.8.1', 'Sinalização dos espaços de refúgio (postura/nº pessoas)', 'Inexistência → C3 &nbsp;|&nbsp; Indicações incorretas → C2', 'C2/C3'],
  ['5.6.2.1.2.1', 'Tipo de paraquedas da cabina', '—', 'C2'],
  ['5.6.2.1.2.3', 'Tipo de paraquedas do contrapeso', '—', 'C2'],
  ['5.6.2.2.1.1', 'Limitador de velocidades', '—', 'C2'],
  ['5.8.1.5', 'Tipo de amortecedor (velocidade superior a 1 m/s)', '—', 'C2'],
  ['5.8.2.1.1.1', 'Curso do amortecedor', '—', 'C2'],
  ['5.7.1', 'Guias cabina / contrapeso', 'Exame visual (fixações / tipo de guias)', 'C3'],
])}

<h3>3. Substituição do comando</h3>
${table(['Ponto norma', 'Situação', 'Observações', 'Classe'], [
  ['Ponto 4.6, anexo I, Diretiva 2014/33/EU', 'Controlo de temperatura máxima da casa da máquina', '—', 'C3'],
  ['5.2.6.3.2.1', 'Altura mínima zona de trabalho na C.M. ≥ 2.10 m / área comando ≥ 0.70m x 0.50m', 'No mínimo deve cumprir EN 81.21', 'C3'],
  ['5.2.1.4.2', 'Iluminação da zona de trabalho (≥200 lux)', '&lt;100 lux → C2 &nbsp;|&nbsp; ≥100 lux → C3', 'C2/C3'],
  ['5.12.1.8.1', 'Dispositivo bypass', 'Incluindo sinalização', 'C2'],
  ['5.12.1.7', 'Bloqueio de chamadas e portas', '—', 'C2'],
  ['5.12.1.7', 'Possibilidade de efetuar chamadas para extremos', '—', 'C2'],
  ['5.9.2.5.2', 'Alimentação do motor por 2 contactores em simultâneo', '—', 'C2'],
  ['5.9.2.7.1 (elét.) / 5.9.3.10 (hid.)', 'Tempo limite de funcionamento do motor', '—', 'C2'],
  ['5.10.1.2.2', 'Proteção dos equipamentos elétricos (grau IP 2X) — comando', '—', 'C2'],
  ['5.10.4.2', 'Proteção contra sobreaquecimento do motor', 'Por PTC ou térmico', 'C2'],
  ['5.10.5.1.1', 'Interruptor principal não deve cortar circuitos monofásicos', '—', 'C2'],
  ['5.10.5.5', 'Interruptor principal tem de imobilizar o ascensor (operações automáticas alimentadas por baterias)', '—', 'C2'],
  ['5.10.1.2.3', 'Proteção diferencial ≤ 30 mA', 'Iluminação cabina e tudo a jusante, tomadas a jusante da iluminação de caixa e série de seguranças', 'C2'],
  ['5.10.8.3', 'Proteção contra sobreintensidades dos circuitos de iluminação e tomadas', 'A proteção da iluminação da cabina tem de ser independente', 'C2'],
  ['5.10.6.3.2', 'Instalação elétrica com cabo de duplo isolamento ou calha técnica', '—', 'C3'],
  ['5.2.6.2.2', 'Identificação dos circuitos com tensão após corte do interruptor principal', '—', 'C3'],
  ['5.11.1.2.j', 'Sequenciador de troca e falta de fase', '—', 'C2'],
  ['5.12.3.2', 'Intercomunicador casa da máquina / cabina', 'Se o curso for superior a 30 m ou a comunicação acústica direta não é possível', 'C2'],
  ['5.12.3.1', 'Sistema de comunicação bidirecional', 'Cabina e caixa', 'C2'],
  ['5.4.8', 'Comando de inspeção no teto da cabina', 'De acordo com EN-81.20', 'C2'],
  ['5.12.1.5.2.4', 'Inscrições na botoneira de inspeção', '—', 'C3'],
  ['5.12.1.5.2.1.d', 'Comutador de inspeção impede o funcionamento automático da porta de cabina', '—', 'C2'],
  ['5.12.1.11.1.c', 'Stop do teto da cabina pára a porta automática (caso exista porta)', '—', 'C2'],
  ['5.4.10.1', 'Iluminação cabina ≥ 100 lux', 'No centro da cabina a 1 m do chão', 'C3'],
  ['5.4.10.3', 'Iluminação cabina permanente (sem porta cabina)', '—', 'C2'],
  ['5.4.10.4', 'Iluminação de emergência na cabina / teto da cabina', 'Existe e garante 5 lux a 1 m do pavimento e no botão de alarme', 'C2/C3'],
  ['5.12.1.1.2', 'Botões identificados/colocados de acordo com EN 81-70 (caso tenha sido alterada a botoneira)', 'Botão do piso de saída saliente (pref. verde), botão de alarme e abrir portas na parte inferior', 'C3'],
  ['5.12.1.9', 'Monitorização dos encravamentos', '—', 'C2'],
  ['5.2.1.4.1', 'Iluminação de caixa', 'De acordo com EN-81.20', 'C2'],
  ['5.2.1.5.1.b', 'Comando de inspeção no poço', '—', 'C2'],
  ['5.12.1.1.4', 'Precisão de paragem +/- 10 mm', '—', 'C2'],
  ['5.9.2.2.2.3', 'Monitorização do travão', 'Comando preparado com dispositivos de controlo; se a máquina já é EN-81.20, tem de estar a funcionar', 'C2'],
  ['5.6.7', 'Proteção contra movimento não intencional da cabina (UCM)', 'Caso exista renivelação ou pré-abertura da porta', 'C2'],
])}

<h3>4. Alteração de comando e máquina com renivelação e/ou pré-abertura de porta</h3>
${table(['Ponto norma', 'Situação', 'Observações', 'Classe'], [
  ['5.6.7', 'Proteção contra movimento não intencional da cabina (UCM)', '—', 'C2'],
])}

<h3>5. Substituição do limitador de velocidades</h3>
${table(['Ponto norma', 'Situação', 'Observações', 'Classe'], [
  ['5.6.2.2.1.1.a', 'Velocidade de atuação de acordo com a legislação aplicável', 'Limitadores substituídos até 1 m/s: cumprir art.º 67º do D 513/70. Acima de 1 m/s: cumprir EN-81.20', 'C2'],
  ['5.6.2.2.1.1.c', 'Sentido de atuação', '—', 'C3'],
  ['5.6.2.2.1.8', 'Etiqueta no limitador de velocidades', '—', 'C3'],
  ['5.6.2.2.1.3', 'Cabo do limitador de velocidades', 'Estado do cabo e amarrações de acordo com EN 13411-5-6-7', 'C3/C2/C1'],
  ['5.6.2.2.1.3.c', 'Relação diâmetro da roda / diâmetro do cabo superior a 30', '—', 'C2'],
  ['5.6.2.2.1.4.a', 'Acessibilidade do limitador de velocidades', 'Para manutenção e ensaios', 'C2'],
  ['5.6.2.2.1.4.c', 'Atuação do limitador de velocidades do exterior da caixa', 'Atuação e rearme (C2); proteção contra atuação involuntária (C3)', 'C2/C3'],
  ['5.6.2.2.1.5', 'Selo do limitador de velocidades', '—', 'C2'],
  ['5.6.2.2.1.6', 'Contacto elétrico do limitador de velocidades', '—', 'C2'],
  ['5.6.2.2.1.6', 'Contacto elétrico da roda tensora', '—', 'C2'],
  ['5.6.2.2.1.3.d', 'Adequação da roda tensora e do cabo ao limitador de velocidades', '—', 'C2'],
  ['5.5.7.1', 'Proteção da saída do cabo da roda do limitador', 'Deve cumprir com o ponto 5.5.7.2', 'C2'],
  ['5.5.7.1', 'Limitador de velocidades protegido contra acidentes corporais', '—', 'C2'],
  ['5.5.7.1.b', 'Proteção contra saída do cabo da roda tensora', 'Deve cumprir com o ponto 5.5.7.2', 'C2'],
  ['5.5.7.1.c', 'Proteção contra introdução de corpos na roda tensora', '—', 'C2'],
])}

<h3>6. Substituição da roda tensora, mantendo o limitador de velocidades</h3>
${table(['Ponto norma', 'Situação', 'Observações', 'Classe'], [
  ['5.6.2.2.1.3.d', 'Adequação da roda tensora e do cabo ao limitador de velocidades', 'Nota: aquando da substituição do limitador de velocidades, a roda tensora não corresponde ao mesmo — enquadra-se no Artº 20º DL 320/02', 'C2'],
  ['5.6.2.2.1.6', 'Contacto elétrico da roda tensora', '—', 'C2'],
  ['5.5.7.1.b', 'Proteção contra saída do cabo da roda tensora', 'Deve cumprir com o ponto 5.5.7.2', 'C2'],
  ['5.5.7.1.c', 'Proteção contra introdução de corpos na roda tensora', '—', 'C2'],
])}

<h3>7. Substituição da cabina</h3>
${table(['Ponto norma', 'Situação', 'Observações', 'Classe'], [
  ['5.4.2.3.1', 'Área útil / nº de pessoas', '—', 'C3'],
  ['5.4.2.3.1', 'Aumento da carga nominal (mantendo o paraquedas)', 'Exige termo de responsabilidade da EMIE; sem ele enquadra-se no Artº 20º DL 320/02', 'C2'],
  ['5.4.5.2', 'Altura do avental, 0,75 m', '—', 'C2'],
  ['5.3.1.2', 'Porta de cabina cheia', '—', 'C2'],
  ['5.3.7.2.2', 'Visor na porta de cabina (caso exista)', 'Tem de ser laminado e com marcação', 'C2'],
  ['5.3.15.2', 'Bloqueio fora de piso (50 mm)', 'Se não existir dispositivo de encravamento, verificar que o bloqueio fora de piso existe e funciona', 'C2'],
  ['5.3.6.2.2.1.b', 'Cortina de luz no caso de porta patamar/cabina automática', '—', 'C2'],
  ['5.3.6.2.2.1.d', 'Proteção contra encontro de obstáculos', '—', 'C2'],
  ['5.3.6.2.2.1.c', 'Esforço para impedir o fecho da porta superior a 150 N', '—', 'C2'],
  ['5.3.6.3', 'Botão de reabertura da porta de cabina', '—', 'C2'],
  ['5.12.1.1.2', 'Botões identificados/colocados EN 81-70 (caso alterada a botoneira)', 'Botão do piso de saída saliente (pref. verde), botão de alarme, abrir portas na parte inferior', 'C3'],
  ['5.4.7.2.b', 'Balaustrada no teto, se a distância livre for superior a 0,30 m', '—', 'C2'],
  ['5.4.7.2.a', 'Rodapé no teto', '—', 'C2'],
  ['5.4.7.b', 'Teto antiderrapante', '—', 'C3'],
  ['5.12.1.11.3', 'Não deve existir stop', '—', 'C3'],
  ['5.2.5.5.1.h', 'Folga cabina/contrapeso', 'Deve cumprir pelo menos EN-81.21', 'C2'],
  ['5.12.1.5.2.1.d', 'Comutador de inspeção imobiliza o funcionamento da porta automática', '—', 'C2'],
])}

<h3>8. Colocação de porta de cabina</h3>
${table(['Ponto norma', 'Situação', 'Observações', 'Classe'], [
  ['5.3.1.2', 'Porta de cabina cheia', '—', 'C2'],
  ['5.3.7.2.2', 'Visor na porta de cabina (caso exista)', 'Tem de ser laminado e com marcação', 'C2'],
  ['5.3.6.2.2.1.b', 'Cortina de luz no caso de porta patamar/cabina automática', '—', 'C2'],
  ['5.3.6.2.2.1.d', 'Proteção contra encontro de obstáculos', '—', 'C2'],
  ['5.3.6.2.2.1.c', 'Esforço para impedir o fecho da porta superior a 150 N', '—', 'C2'],
  ['5.3.6.3', 'Botão de reabertura da porta de cabina', '—', 'C2'],
  ['5.12.1.11.3', 'Não deve existir stop', '—', 'C2'],
  ['5.12.1.11.1.c', 'Stop do teto da cabina pára as portas automáticas (caso exista)', '—', 'C2'],
  ['5.12.1.5.2.1.d', 'Comutador de inspeção impede o funcionamento automático da porta de cabina', '—', 'C2'],
  ['5.3.15.2', 'Bloqueio fora de piso (50 mm)', 'Se não existir dispositivo de encravamento, verificar bloqueio fora de piso existe e funciona', 'C2'],
  ['5.4.5.2', 'Altura do avental, 0,75 m', '—', 'C2'],
  ['5.2.5.5.1.h', 'Folga cabina/contrapeso', 'Deve cumprir pelo menos EN-81.21', 'C2'],
  ['5.4.2.3.1', 'Aumento da massa da cabina (mantendo o paraquedas)', 'Exige termo de responsabilidade da EMIE; sem ele enquadra-se no Artº 20º DL 320/02', 'C2'],
])}

<h3>9. Alteração da arcada da cabina</h3>
${table(['Ponto norma', 'Situação', 'Observações', 'Classe'], [
  ['5.6.2.1.2.1', 'Tipo de paraquedas da cabina', '—', 'C2'],
  ['5.6.2.2.1.1', 'Velocidade de atuação do limitador de velocidades de acordo com o paraquedas', '—', 'C2'],
])}

<h3>10. Colocação de botoneira de revisão no poço</h3>
${table(['Ponto norma', 'Situação', 'Observações', 'Classe'], [
  ['5.2.1.5.1.b)', 'Distância da botoneira ao espaço de refúgio ≤ 30 cm', '—', 'C2'],
  ['5.12.1.5.2.4', 'Inscrições nos botões', '—', 'C3'],
  ['5.2.1.5.1.b)', 'A botoneira não permite deslocar a cabina', '—', 'C2'],
  ['5.12.1.5.2.3', 'Pressão constante no botão de sentido e marcha', '—', 'C2'],
  ['5.12.1.5.1.2', 'Constituição da botoneira e/ou proteção dos botões', '—', 'C2'],
  ['5.12.1.5.2.1', 'O comutador de revisão deve: (a) neutralizar comandos normais; (b) neutralizar manobra elétrica de emergência; (c) desativar nivelamento/renivelamento; (d) neutralizar funcionamento das portas; (e) velocidade ≤0,63 m/s; (f) velocidade ≤0,30 m/s a 2,0 m dos extremos; (g) não ultrapassar limites normais; (h) manter ativos dispositivos de segurança', '—', 'C2'],
  ['5.12.1.5.2.2', 'Retorno à manobra normal do ascensor', 'Reinicialização no exterior da caixa feita no dispositivo de desencravamento ou acessível só a pessoal autorizado. <strong>Não pode ser possível com o stop atuado ou a porta aberta.</strong>', 'C2'],
  ['5.3.9.3.5', 'Saída do técnico do poço', '—', 'C2'],
  ['5.2.5.8.1', 'Espaço de refúgio e folgas no poço: (0.40x0.50)m/altura≥2.0m; (0.50x0.70)m/altura≥1.0m; (0.70x1.00)m/altura≥0.50m', 'No mínimo cumprir critérios de poço reduzido da EN 81.20', 'C2'],
  ['5.2.5.8.1', 'Sinalização do espaço de refúgio (postura/nº pessoas)', 'Inexistência → C3 &nbsp;|&nbsp; Indicações incorretas → C2', 'C2/C3'],
  ['5.2.5.8.2', 'Espaço entre a parte mais baixa da cabina (sobre o amortecedor) e o fundo do poço ≥ 0,50 m', '—', 'C2'],
  ['5.2.5.5.1', 'Proteção do contrapeso no poço', '—', 'C3'],
  ['5.2.2.4.b', 'Dispositivo de acesso (escada)', 'De acordo com EN-81.20', 'C2'],
  ['5.2.1.4.1', 'Iluminação de caixa', 'De acordo com EN-81.20', 'C2'],
])}

<h3>11. Substituição da central hidráulica</h3>
${table(['Ponto norma', 'Situação', 'Observações', 'Classe'], [
  ['5.2.6.3.2.1', 'Altura mínima zona de trabalho na C.M. ≥ 2.10 m / área ≥ 0.50m x 0.60m', 'No mínimo deve cumprir EN 81.21', 'C3'],
  ['5.2.1.4.2', 'Iluminação da zona de trabalho (≥200 lux)', '&lt;100 lux → C2 &nbsp;|&nbsp; ≥100 lux → C3', 'C2/C3'],
  ['5.9.3.3.1.1.c', 'Proteção das tubagens', '—', 'C3'],
  ['5.2.1.9', 'Local da central impermeável', 'Deve ser possível a recolha da totalidade do fluido', 'C3'],
  ['5.12.1.11.1.e', 'Stop na máquina caso o interruptor principal se encontre a mais de 1 m', '—', 'C2'],
  ['5.9.3.11', 'Deteção de temperatura do fluido hidráulico', '—', 'C2'],
  ['5.9.3.5.1.1', 'Válvula de isolamento', '—', 'C2'],
  ['5.9.3.6.1', 'Manómetro', '—', 'C2'],
  ['5.9.3.7', 'Verificação do nível de óleo', '—', 'C2'],
  ['5.9.3.9.1', 'Válvula manual de descida', '—', 'C1'],
  ['5.9.3.9.2.1', 'Válvula manual de subida', 'Deve estar disponível em todos os hidráulicos', 'C1'],
  ['5.9.3.9.3', 'Indicação da zona de pisos', 'Se mais de 2 pisos e sem dispositivo mecânico antideslize', 'C2'],
])}

<div class="alert alert-warning"><i class="fas fa-gavel mr-2"></i>Quando a intervenção é apenas parcial e um novo componente (ex. roda tensora, carga nominal alterada) não cumpre um requisito ligado, o relatório de inspeção costuma citar o <strong>Artº 20º do DL 320/02 em conjugação com o DL 58/2017 de 09/06</strong> e pode exigir termo de responsabilidade da entidade instaladora/EMIE.</div>
`;

const article = {
  title: 'Modernizações — Classificação por cenário (Artº 20º DL 320/02 / EN 81-20)',
  category: 'regulamentacao',
  difficulty: 'avancado',
  summary: 'Tabela completa de disposições EN 81-20 e classificações C1/C2/C3 a aplicar consoante o componente modernizado: máquina, comando, limitador de velocidades, roda tensora, cabina, porta, botoneira de poço e central hidráulica.',
  content,
  tags: ['modernização', 'Artº 20º', 'DL 320/2002', 'EN 81-20', 'C1', 'C2', 'C3', 'DL 58/2017'],
  featured: false,
  published: true,
  views: 0,
  author: 'FestLift',
  authorId: null,
  createdAt: now,
  updatedAt: now
};

async function run() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const col = db.collection('knowledge_base');

    const existing = await col.findOne({ title: article.title });
    if (existing) {
      await col.updateOne({ _id: existing._id }, { $set: { ...article, createdAt: existing.createdAt, updatedAt: now } });
      console.log(`Artigo atualizado (_id: ${existing._id}).`);
    } else {
      const result = await col.insertOne(article);
      console.log(`Artigo inserido (_id: ${result.insertedId}).`);
    }
  } finally {
    await client.close();
  }
}

run().catch(console.error);
