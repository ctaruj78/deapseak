// scripts/import-manuais.js <pasta> — importa PDFs para a biblioteca de manuais (idempotente por sha1).
// Metadados curados em CURATED (chave = nome original); ficheiros novos usam detecção automática e ficam reviewed=false.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const manuais = require('../services/manuais');

const CURATED = {
  '604902_0000057401_MO_4320115__31029630_ESP.pdf': { title: 'Hidra Crono — Esquemas eléctricos (MRL, pedido 604902)', brand: 'Hidra Crono', model: 'Crono MRL', docType: 'schematic', component: 'controller', language: 'es', tags: ['esquemas', 'maniobra', 'orona', 'mrl'] },
  'Carlos Silva Crono.pdf': { title: 'Hidra Crono — Manual de programação', brand: 'Hidra Crono', model: 'Crono', docType: 'programming', component: 'controller', language: 'es', tags: ['programação', 'parâmetros', 'orona'] },
  'DC85067A00 MANUAL SOLUCIÓN DE AVERÍAS HIDRA CRONO SPA - ENG.PDF': { title: 'Hidra Crono — Avarias e diagnóstico (ES/EN)', brand: 'Hidra Crono', model: 'Crono', docType: 'troubleshooting', component: 'controller', language: 'es', tags: ['avarias', 'troubleshooting', 'códigos de erro', 'orona'] },
  '8120 ASENKRON pt.pdf': { title: 'Asenkron PVA-8120 — Painel de controlo assíncrono', brand: 'Asenkron', model: 'PVA-8120', docType: 'installation', component: 'panel', language: 'pt', tags: ['heytech', 'painel', 'assíncrono'] },
  'Asenkron-8120-Pano Kullanım pt.pdf': { title: 'Asenkron 8120 — Manual do utilizador do painel (Heytech)', brand: 'Asenkron', model: '8120', docType: 'manual', component: 'panel', language: 'pt', tags: ['heytech', 'painel', 'parâmetros'] },
  'EDEL (Manual de Maniobra 5420_5421 Original).pdf': { title: 'EDEL 5420/5421 — Quadros de manobra simplex/duplex', brand: 'EDEL', model: '5420 / 5421', docType: 'installation', component: 'controller', language: 'es', tags: ['maniobra', 'simplex', 'duplex'] },
  'EDEL (Manual K2 643 VFG Variador FUJI FRENIC LIFT para Maquinas Gearless).pdf': { title: 'EDEL K2 643VFG — Variador Fuji Frenic Lift (gearless)', brand: 'EDEL', model: 'K2 643VFG', docType: 'installation', component: 'drive', language: 'es', tags: ['fuji', 'frenic lift', 'gearless', 'variador'] },
  'ADV DP (1).pdf': { title: 'Otis ADV DP LCB2 — Manual', brand: 'Otis', model: 'ADV DP LCB2', docType: 'manual', component: 'controller', language: 'pt', tags: ['adv', 'lcb2', 'otis'] },
  'Arkel ADrive версия 1.0.pdf': { title: 'Arkel ADrive — Configuração do variador (RU)', brand: 'Arkel', model: 'ADrive 1.0', docType: 'programming', component: 'drive', language: 'ru', tags: ['variador', 'mogilevliftmash', 'ru'] },
  'MLCOMBO-X_schemes.pdf': { title: 'MLCOMBO-X — Esquemas de ligação (quadro, poço, pisos)', brand: 'Monarch', model: 'MLCOMBO-X', docType: 'schematic', component: 'controller', language: 'en', tags: ['esquemas', 'ligações', 'poço', 'pisos'] },
  'Schindler Smart 001002 guia rapida.pdf': { title: 'Schindler Smart MRL 001/002 — Configuração e diagnóstico', brand: 'Schindler', model: 'Smart MRL 001/002', docType: 'quickref', component: 'controller', language: 'es', tags: ['smart', 'mrl', 'diagnóstico', 'configuração'] },
  'myslide.es_microbasic42.pdf': { title: 'MicroBasic 4 — Instalação eléctrica pré-montada', brand: 'MicroBasic', model: 'MicroBasic 4', docType: 'installation', component: 'controller', language: 'es', tags: ['instalação', 'arranque', 'manutenção', 'reparação'] },
  'SARPLUSCOM.pdf': { title: 'SAR plusCOM — Guia de instalação do alarme', brand: 'SAR', model: 'plusCOM', docType: 'installation', component: 'alarm', language: 'en', tags: ['alarme', 'gsm', 'comunicação de emergência'] },
  'comportel 2 de 5.pdf': { title: 'Comportel — Documentação (2 de 5, digitalizado)', brand: 'Comportel', model: '', docType: 'manual', component: 'controller', language: 'other', tags: ['digitalizado', 'sem texto'], notes: 'PDF digitalizado sem texto — pesquisa só por título/tags até haver OCR.' }
};

(async () => {
  const dir = process.argv[2];
  if (!dir || !fs.existsSync(dir)) { console.error('uso: node scripts/import-manuais.js <pasta>'); process.exit(1); }
  const client = await MongoClient.connect(process.env.MONGO_URI || 'mongodb://localhost:27017');
  const db = client.db(process.env.DB_NAME || 'deapseak');
  await manuais.ensureIndexes(db);
  for (const f of fs.readdirSync(dir).filter(f => /\.pdf$/i.test(f)).sort()) {
    try {
      const o = CURATED[f] ? { ...CURATED[f], reviewed: true } : {};
      const r = await manuais.importPdf(db, fs.readFileSync(path.join(dir, f)), f, o);
      console.log(r.status.padEnd(9), r.doc.pages + 'p', r.doc.hasText ? 'texto' : 'SEM-TEXTO', '|', r.doc.brand, '|', r.doc.docType, '|', r.doc.title, o.reviewed ? '' : '(por rever)');
    } catch (e) { console.error('ERRO', f, e.message); }
  }
  await client.close();
})();
