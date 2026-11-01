// scripts/add-limitador-cl08-kb.js — Artigo KB: limitador de velocidade bidirecional CAN-LIFT CL 08
// (instalação, regulação, ensaios, UCM, recuperação, manutenção). Idempotente (upsert por título).
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
<h2>Limitador de velocidade bidirecional CAN-LIFT CL 08</h2>
<p>Resumo do manual do fabricante <em>CL 08 Bi-directional Elevator Overspeed Governor — Installation, Setting, Maintenance Manual</em> (CAN-LIFT Asansör, rev. 3 de 19/07/2022, elaborado segundo EN 13015+A1). Componente de segurança: actua o pára-quedas da cabina em ambos os sentidos e corta a cadeia de segurança antes do bloqueio.</p>

<div class="alert alert-warning"><i class="fas fa-exclamation-triangle mr-2"></i><strong>Atenção:</strong> o selo da regulação de velocidade nunca pode estar partido nem a mola alterada. Limitador com selo danificado não se instala — contactar o fabricante.</div>

<h3>1. Modelos e aplicação</h3>
${table(['Modelo', 'Local', 'Função'], [
  ['CL 08 Ø200 / Ø250 / Ø300', 'Casa das máquinas', 'Só excesso de velocidade; contacto de rearme na cadeia de segurança (terminais 3 e 4, NC). Totalmente mecânico.'],
  ['CL 08 … A3 (UCM)', 'Casa das máquinas', 'Excesso de velocidade + protecção contra movimento não intencional da cabina (UCM, EN 81-20 5.6.7), com bobina e 2.º contacto.'],
  ['CL 08 … UZ (RC)', 'Poço (MRL, sem casa das máquinas)', 'Excesso de velocidade + bobina de ensaio com comando remoto e bobina de rearme no contacto.'],
  ['CL 08 … A3+UZ (UCM+RC)', 'Poço (MRL)', 'UCM + comando remoto: 2 contactos de segurança e 3 bobinas.'],
])}
<ul>
  <li>Cabos Ø6 – 6,5 – 8 mm certificados EN 12385-5. Recomendado com pára-quedas progressivo (também admite instantâneo dentro dos limites da norma).</li>
  <li>Não actua antes de 115 % da velocidade nominal. A regulação é feita por mola e selada.</li>
  <li>O corpo e a roda tensora formam um conjunto: <strong>usar roda tensora de outra marca anula a garantia</strong> e as condições de funcionamento.</li>
  <li>Etiqueta: modelo, sentido, velocidade de actuação/bloqueio, corrente da bobina, data de fabrico, n.º de série, n.º certificado CE. Confirmar que corresponde à velocidade nominal da instalação.</li>
</ul>

<h3>2. Instalação do corpo e da roda tensora</h3>
<ul>
  <li>Corpo e roda tensora <strong>alinhados</strong> (senão o cabo raspa na gola e perde aderência).</li>
  <li>Fixação: 2 buchas químicas M12 certificadas à fadiga (laje de betão) ou 2 parafusos M12 de cabeça cónica (mesa preparada). Em MRL fixa-se numa mesa no poço; em alternativa, suspenso do tecto do poço (pouco recomendado) ou com placa base opcional. Acompanha gabarit de furação em papel.</li>
  <li>Montado de origem à esquerda da guia (em relação ao sentido de descida). Pode ir à direita rodando o conjunto, respeitando as setas subir/descer da etiqueta.</li>
  <li>Fixação à guia com grampo T2 (a força de bloqueio é fixa e não depende da carga da cabina).</li>
  <li><strong>Roda tensora de mola:</strong> sem mecanismo de ajuste. Com o cabo montado e tensionado à mão, a alavanca deve ficar <strong>horizontal</strong>; montar as 2 molas (frente e trás) com o gancho de mão fornecido (força de 660 N). Alongamento máximo previsto do cabo 8 cm (centro da roda desce máx. 4 cm). Deixar o gancho de mão numa ranhura livre para manutenção futura.</li>
  <li><strong>Roda tensora de peso:</strong> contacto de segurança accionado pelo rolete da alavanca (cabo partido/alongado ou alavanca a subir); contacto sem bloqueio, abrir a tampa para ligar.</li>
</ul>

<h3>3. Substituição do limitador com cabo já ligado ao pára-quedas</h3>
<ul>
  <li><strong>Corpo:</strong> retirar os eixos de retenção do cabo (n.º 1) e os parafusos superiores (n.º 2, anilha n.º 3, porca n.º 4); retirar o tubo distanciador (n.º 5); passar o cabo pelo espaço e assentá-lo na gola; repor tudo e apertar.</li>
  <li><strong>Roda tensora de peso:</strong> retirar parafuso n.º 1 da alavanca e eixos n.º 2; soltar parafusos n.º 3 (placas frontais); folgar o parafuso do cubo (n.º 4); passar o cabo, repor e apertar.</li>
  <li><strong>Roda tensora de mola:</strong> retirar primeiro a ponte das molas (4 parafusos n.º 1, peça n.º 2) e eixos n.º 3 e 4; depois igual ao anterior; repor a ponte.</li>
</ul>

<h3>4. Ligações eléctricas</h3>
${table(['Modelo', 'Ligação'], [
  ['Básico (sem UCM / sem UZ)', 'Contacto de rearme: terminais 3 e 4 (NC) + terra no parafuso do painel frontal (ou furo roscado traseiro alternativo).'],
  ['A3 (UCM)', 'Contacto de rearme: terminais 3-4 (NC). Unidade UCM: 1-2 bobina; 3-4 contacto da bobina (sem rearme, NC). Terra no parafuso frontal.'],
  ['UZ (RC)', 'Bobina de ensaio nos terminais 3-4 do bloco interior direito. Unidade remota: 1-2 bobina de rearme; 3-4 contacto UZ (NC).'],
  ['A3+UZ (UCM+RC)', 'Combina os dois: 3-4 bobina de ensaio; unidade remota 1-2 rearme / 3-4 contacto UZ; unidade UCM 1-2 contacto da bobina (NC) / 3-4 bobina UCM.'],
])}
<div class="alert alert-danger"><i class="fas fa-bolt mr-2"></i><strong>Bobinas de ensaio e de rearme (UZ): serviço 3 % ED.</strong> Premir o botão no máximo 3 segundos; se for mais tempo a bobina sobreaquece — aguardar arrefecimento. Para usar contactos NO é necessário puxar cabo separado do contacto.</div>

<h3>5. Ensaios do limitador e do pára-quedas</h3>
<ul>
  <li><strong>Em montagem:</strong> à velocidade de manutenção o limitador não bloqueia por si; tem de ser bloqueado externamente para verificar que actua o pára-quedas.</li>
  <li><strong>Antes da entrada em serviço (EN 81-20 6.3.4):</strong> pára-quedas progressivo — tracção com <strong>125 % da carga nominal</strong>, a velocidade nominal ou inferior, descendo, com bloqueio externo do limitador. Pára-quedas instantâneo: velocidade nominal e carga conforme 6.3.4 a). Se ensaio a velocidade inferior, o fabricante fornece as curvas.</li>
  <li><strong>Inspecções periódicas:</strong> ensaio à velocidade de manutenção.</li>
  <li><strong>Casa das máquinas:</strong> alavanca de ensaio com manípulo amarelo (acessível por ambos os lados). Com a roda a rodar, levantar o manípulo até ao fim bloqueia a gola. Pode-se ensaiar à distância prendendo uma corda forte à ranhura do manípulo e puxando rápido com a cabina em movimento; no fim retirar a corda e repor a alavanca em neutro.</li>
  <li><strong>Poço (UZ/RC):</strong> bloquear pelo botão de ensaio do quadro (bobina, máx. 3 s), sem entrar no poço.</li>
</ul>

<h3>6. UCM — movimento não intencional da cabina (EN 81-20 5.6.7)</h3>
<ul>
  <li>Modelos A3: com a cabina em piso a bobina é desenergizada, o êmbolo sai e fica a controlar um disco dentado na roda. Se a cabina se mover, o disco permite um pequeno movimento e depois bloqueia a roda → o cabo actua o pára-quedas.</li>
  <li>Movimento flexível admitido antes de bloquear: ${'Ø200: 101–231 mm; Ø250: 100–255 mm; Ø300: 105–295 mm'}.</li>
  <li>Limitador CL 08 A3 + pára-quedas progressivo CL SG (P-B / P-U) têm certificado UCM <strong>como conjunto</strong> (organismo notificado, Directiva 2014/33/UE Anexo III pt. 2). Fora do conjunto, a certificação tem de ser feita pelo instalador num organismo notificado.</li>
  <li>Ensaio UCM (6.3.13): cabina vazia a subir na parte superior do poço e carregada a descer na parte inferior, a velocidade pré-definida; confirmar que a distância não excede 5.6.7.5.</li>
  <li>A unidade UCM não é necessária se a máquina tem certificado UCM (travagem electromecânica) e a instalação não nivela com portas abertas.</li>
  <li><strong>Falta de energia</strong> activa o UCM. Para levar a cabina ao piso: (1) rodar a roda de tracção à mão, com o pino de desactivação (preso por corrente atrás da bobina) colocado na ranhura da protecção — <strong>só em MRL com casa das máquinas e só por pessoa competente</strong>; (2) <strong>recomendado:</strong> bateria de emergência a alimentar a bobina UCM (único método possível nos modelos de poço).</li>
  <li><strong>O pino/batente do UCM nunca pode ficar colocado em funcionamento normal</strong> — desactiva a protecção.</li>
</ul>

<h3>7. Recuperação após actuação</h3>
<ul>
  <li><strong>Excesso de velocidade (todos os modelos):</strong> rodar a máquina cerca de <strong>2 cm no sentido contrário</strong> ao da travagem. Liberta o pára-quedas e a gola do came; o pino de rearme do contacto volta e fecha a cadeia de segurança. Modelos UZ: o contacto é rearmado pela bobina de rearme (máx. 3 s).</li>
  <li><strong>UCM:</strong> se o êmbolo não recolher ao energizar a bobina, está sob carga — mover a cabina ≥ 2 cm em sentido contrário à travagem e voltar a energizar.</li>
</ul>

<h3>8. Manutenção (de seis em seis meses)</h3>
<ol>
  <li>Cumprir EN 13015+A1.</li>
  <li>Verificar o sistema tensor quanto a alongamento do cabo.</li>
  <li>Verificar a ligação do cabo ao pára-quedas.</li>
  <li>Desgaste da gola da roda do limitador — se excessivo, substituir a roda.</li>
  <li>Golas limpas; o cabo não pode ter óleo (limpar cabo e roda).</li>
  <li>O-ring e rotação do rolete na alavanca de bloqueio — se não roda ou o O-ring está muito gasto, não operar; substituir o rolete.</li>
  <li><strong>Substituição de peças e reparações só pelo fabricante</strong> — o técnico não repara nem troca peças internas.</li>
</ol>

<h3>9. Garantia (2 anos) — perdida em caso de</h3>
<p>Instalação fora do manual/norma; limitador danificado em transporte; velocidade diferente da nominal; tensão errada nas bobinas; ligação errada; selo partido ou alteração da velocidade/mola; intervenção nas peças ou desactivação do limitador; roda tensora de outra marca; alteração do sistema de peso; cabo fora da EN 12385-5.</p>

<h3>10. Certificados (EU-type examination, Directiva 2014/33/UE)</h3>
${table(['Tipo', 'N.º certificado (rev.)', 'Velocidade nominal', 'Disparo máx.', 'Percurso UCM máx.', 'Documento'], [
  ['CL08-200 (A3)(UZ)(A3+UZ)', 'NL17-400-1002-034-12 (rev. 4)', '0,2 – 1,6 m/s', '0,23 – 2,16 m/s', '231 mm', '<a href="https://canlift.com/en/wp-content/uploads/2024/01/CE-CL-08-200-2022.pdf" target="_blank" rel="noopener">PDF</a>'],
  ['CL08-250 (A3)(UZ)(A3+UZ)', 'NL16-400-1002-034-10 (rev. 5)', '0,3 – 2,0 m/s', '0,35 – 2,63 m/s', '254 mm', '<a href="https://canlift.com/en/wp-content/uploads/2024/01/CE-CL-08-250-2022.pdf" target="_blank" rel="noopener">PDF</a>'],
  ['CL08-300 (A3)(UZ)(A3+UZ)', 'NL16-400-1002-034-11 (rev. 5)', '0,5 – 2,5 m/s', '0,57 – 3,22 m/s', '295 mm', '<a href="https://canlift.com/en/wp-content/uploads/2024/01/CE-CL-08-300-2022.pdf" target="_blank" rel="noopener">PDF</a>'],
])}
<ul>
  <li>Emitidos pelo <strong>Liftinstituut B.V.</strong> (Amesterdão), Organismo Notificado <strong>0400</strong>. Exame UE de 22-07-2022, emitidos em 27-07-2022, <strong>válidos até 27-07-2027</strong>. Substituem a rev. anterior de 14-05-2021.</li>
  <li>Produto: limitador bidirecional para pára-quedas progressivo e instantâneo, com comando remoto e função UCMP. Normas: partes da EN 81-1:1998+A3:2009, EN 81-20:2020 e EN 81-50:2020.</li>
  <li>Tempo de resposta máx. da bobina UCM: 80 ms. As forças de tracção foram determinadas com cabo e gola novos e a força de tensão indicada — ver capítulos 2 e 5 do relatório associado para condições adicionais.</li>
  <li><strong>Com e sem bobina:</strong> o n.º de tipo no certificado é "CL08-xxx (A3) (UZ) (A3+UZ)" — o modelo base (sem bobina) e as variantes opcionais A3 (UCM), UZ (comando remoto) e A3+UZ constam do mesmo certificado. Tempo de resposta 80 ms e percurso UCM máx. aplicam-se apenas às versões com bobina UCM (A3).</li>
  <li>Verificar que a velocidade nominal do elevador está dentro do intervalo do diâmetro (Ø) escolhido.</li>
  <li>Também publicados pelo fabricante (digitalizações): <a href="https://canlift.com/wp-content/uploads/2024/04/2024-CLSG-CE-SERTIFIKASI.pdf" target="_blank" rel="noopener">certificado CE do pára-quedas CL SG</a>, e certificados EAC (<a href="https://canlift.com/wp-content/uploads/2024/04/CL-08-EAC-Sertifikasi.pdf" target="_blank" rel="noopener">CL 08</a>, <a href="https://canlift.com/wp-content/uploads/2024/01/CL-SG-EAC_RU.pdf" target="_blank" rel="noopener">CL SG</a>; EAC não se aplica na UE).</li>
  <li>O fabricante não publica um certificado UCM do <em>conjunto</em> limitador + pára-quedas; pedir-lhe o certificado do conjunto se for necessário para o processo.</li>
</ul>

<div class="alert alert-info"><i class="fas fa-info-circle mr-2"></i>Tradução/resumo em PT-PT do manual em inglês. Em caso de dúvida prevalece o manual original do fabricante.</div>
`;

const article = {
  title: 'Limitador de velocidade bidirecional CAN-LIFT CL 08 — Instalação, ensaios, UCM e manutenção',
  category: 'manutencao',
  difficulty: 'avancado',
  summary: 'Ficha técnica do limitador CL 08 (Ø200/250/300; versões A3 UCM e UZ comando remoto): instalação, roda tensora, ligações eléctricas, ensaios EN 81-20 6.3.4, UCM, recuperação e manutenção semestral.',
  content,
  tags: ['limitador de velocidade', 'CAN-LIFT', 'CL 08', 'UCM', 'pára-quedas', 'EN 81-20', 'EN 13015', 'roda tensora', 'certificado CE', 'Liftinstituut', 'NB 0400'],
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
    const col = client.db(DB_NAME).collection('knowledge_base');
    const existing = await col.findOne({ title: article.title });
    if (existing) {
      await col.updateOne({ _id: existing._id }, { $set: { ...article, createdAt: existing.createdAt, updatedAt: now } });
      console.log(`Artigo atualizado (_id: ${existing._id}).`);
    } else {
      const r = await col.insertOne(article);
      console.log(`Artigo inserido (_id: ${r.insertedId}).`);
    }
  } finally { await client.close(); }
}
run().catch(console.error);
