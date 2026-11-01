#!/usr/bin/env node
/**
 * Testa o preenchimento exacto de requerimentos: preenche, valida (dentro da página, sem tapar texto
 * impresso, sem sobreposições) e gera PNG para inspecção visual em <saida>/.
 *
 * Uso:  node scripts/test-requerimentos.js [Municipio ...] [--out=/caminho]
 */
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { fillExact, EXACT_FILLERS } = require('../services/requerimento-exact');
const { renderPdfToPng } = require('./render-pdf-preview');

const FILES = { Oeiras: 'Requerimento_CMOeiras.pdf', Sintra: 'Requerimento_CMSintra.pdf', Barreiro: 'Requerimento_CMBarreiro.pdf', Amadora: 'Requerimento_CMAmadora.pdf', Mafra: 'Requerimento_CMMafra.pdf', Odivelas: 'Requerimento_CMOdivelas.pdf' };
const args = process.argv.slice(2);
const outDir = (args.find(a => a.startsWith('--out=')) || '--out=/tmp').slice(6);
const munis = args.filter(a => !a.startsWith('--'));
const alvo = munis.length ? munis : Object.keys(EXACT_FILLERS);

const FESTLIFT = { name: 'FestLift - Elevadores e Serviços, Lda.', address: 'Av. do Parque 84B', cp: '2635-609', locality: 'Rio de Mouro', nif: '515 924 741', email: 'info@festlift.pt', phone: '214 190 863' };
const lift = { municipalNumber: '11.10/001689', capacity: 450, speed: 1, floorsCount: 5, driveType: 'traction', installYear: 2015, address: { street: 'Av. Minas Gerais nº2', zipCode: '2780-024', city: 'Oeiras' } };
const owner = { name: 'Condomínio do Edifício Exemplo, Lda.', nif: '501 234 567' };

(async () => {
    let falhas = 0;
    for (const mun of alvo) {
        for (const requerente of ['empresa', 'cliente']) {
            const pdfPath = path.join(__dirname, '..', 'uploads', 'requerimentos', FILES[mun]);
            const doc = await PDFDocument.load(fs.readFileSync(pdfPath), { ignoreEncryption: true });
            const req = requerente === 'cliente'
                ? { name: owner.name, address: 'Rua do Teste 12, 3.º Esq.', cp: '2780-100', locality: 'Oeiras', nif: owner.nif, email: 'cliente@exemplo.pt', phone: '911 222 333' }
                : FESTLIFT;
            const r = await fillExact(mun, doc, pdfPath, { lift, inspType: 'periodica', requerente, req, owner, pagamento: 'transferencia' });
            const pdfOut = path.join(outDir, `test_${mun}_${requerente}.pdf`);
            fs.writeFileSync(pdfOut, await doc.save());
            await renderPdfToPng(pdfOut, pdfOut.replace(/\.pdf$/, '.png'), 1.4);
            console.log(`${r.problems.length ? 'FALHA' : 'OK   '} ${mun} (${requerente}): ${r.placements.length} campos${r.problems.length ? '\n   - ' + r.problems.join('\n   - ') : ''}`);
            falhas += r.problems.length;
        }
    }
    process.exit(falhas ? 1 : 0);
})().catch(e => { console.error('ERRO', e.stack.split('\n').slice(0, 4).join('\n')); process.exit(2); });
