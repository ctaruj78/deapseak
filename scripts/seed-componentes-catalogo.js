#!/usr/bin/env node
/**
 * Seed do catálogo de componentes (models/ComponenteCatalogo) a partir dos certificados
 * em uploads/certificados-componentes. Dados lidos dos próprios certificados.
 * Só mercado europeu (EU-Type / UE) — certificados EAC ou do mercado interno turco não entram.
 * Idempotente (upsert por tipo+fabricante+modelo).
 *
 * Uso:  node scripts/seed-componentes-catalogo.js [--dry-run]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const ComponenteCatalogo = require('../models/ComponenteCatalogo');

const DRY = process.argv.includes('--dry-run');
const DIR = 'certificados-componentes/';
const d = s => new Date(s);

const LIFTINSTITUUT = 'Liftinstituut B.V. (NB 0400)';
const DOC_INSTALACAO = { tipo: 'declaracao_conformidade', titulo: 'Declaração de Conformidade da instalação', gerado: true };

const CANLIFT_MORADA = 'CAN-LIFT Asansör San. ve Tic. Ltd. Şti., Gebze, 41400 Kocaeli, Turquia';
const clNormas = ['EN 81-1:1998+A3:2009 (partes)', 'EN 81-20:2020 (partes)', 'EN 81-50:2020 (partes)'];

// [Ø, nº certificado, revisão, vel. nominal min/max, vel. disparo min/max, distância UCM mm]
const cl08 = [
    [200, 'NL17-400-1002-034-12', '4', '0,2', '1,6', '0,23', '2,16', '231'],
    [250, 'NL16-400-1002-034-10', '5', '0,3', '2,0', '0,35', '2,63', '254'],
    [300, 'NL16-400-1002-034-11', '5', '0,5', '2,5', '0,57', '3,22', '295']
];

const componentes = cl08.map(([dia, num, rev, vmin, vmax, tmin, tmax, ucm]) => ({
    tipo: 'limitador', fabricante: 'CAN-LIFT', modelo: `CL 08 Ø${dia}`,
    descricao: 'Limitador de velocidade bidirecional para pára-quedas progressivo e instantâneo, com comando remoto e UCMP. Variantes: base, A3 (UCM), UZ (comando remoto), A3+UZ.',
    fabricanteMorada: CANLIFT_MORADA,
    dadosTecnicos: [
        { chave: 'Velocidade nominal', valor: `${vmin} – ${vmax}`, unidade: 'm/s' },
        { chave: 'Velocidade de disparo', valor: `${tmin} – ${tmax}`, unidade: 'm/s' },
        { chave: 'Tempo máx. de resposta da bobina UCM', valor: '80', unidade: 'ms' },
        { chave: 'Distância máx. percorrida (disco UCM → pára-quedas)', valor: ucm, unidade: 'mm' },
        { chave: 'Diâmetro da roda', valor: String(dia), unidade: 'mm' }
    ],
    documentos: [
        {
            tipo: 'certificado_ce', familia: 'ce-tipo', titulo: `Certificado de exame UE de tipo — CL08-${dia}`,
            ficheiro: `${DIR}CE-CL-08-${dia}-2022.pdf`, numero: num, revisao: rev,
            organismoNotificado: LIFTINSTITUUT, diretiva: '2014/33/EU', normas: clNormas,
            emitidoEm: d('2022-07-27'), validoAte: d('2027-07-27')
        },
        DOC_INSTALACAO
    ]
}));

const ARKEL_MORADA = 'Arkel Elektrik Elektronik San. ve Tic. A.Ş., Eyup Sultan Mah. Şah Cihan Cad. No:69, 34885 Sancaktepe, Istambul, Turquia';
const ARKEL_FONTE = 'Documentos descarregados de schema.arkel.com.tr (2026-11-01).';
const NB = LIFTINSTITUUT;

const tipoUE = (f, familia, titulo, numero, revisao, normas, emitido, valido, observacao = '') => ({
    tipo: 'certificado_ce', familia, titulo, ficheiro: `${DIR}arkel-${f}.pdf`, numero, revisao,
    organismoNotificado: NB, diretiva: '2014/33/EU', normas, emitidoEm: d(emitido), validoAte: d(valido), observacao
});
// A DoC da Arkel é anual e por intervalo de números de série — usar a do ano do quadro instalado.
const docArkel = (f, familia, titulo, numero, emitido, observacao) => ({
    tipo: 'declaracao_conformidade', familia, titulo, ficheiro: `${DIR}arkel-${f}.pdf`, numero,
    organismoNotificado: NB, diretiva: '2014/33/EU; 2014/30/EU', emitidoEm: d(emitido), observacao
});
const emc = (f, titulo) => ({ tipo: 'outro', familia: 'emc', titulo, ficheiro: `${DIR}arkel-${f}.pdf`, diretiva: '2014/30/EU (EMC)' });

componentes.push({
    tipo: 'painel', fabricante: 'Arkel', modelo: 'ARCODE',
    descricao: 'Unidade de comando para elevadores elétricos com circuito de monitorização da cadeia de segurança, ponte de portas, deteção e ativação do UCMP e monitorização do travão (ACOP/UCMP).',
    fabricanteMorada: ARKEL_MORADA,
    dadosTecnicos: [
        { chave: 'Aplicação', valor: 'Elevadores elétricos' },
        { chave: 'Tempo máx. de resposta da placa DBR', valor: '10', unidade: 'ms' },
        { chave: 'Placas cobertas pelo certificado', valor: 'IBC/IBC-S/IBC-L, DBR, DFC, ApRe, KDB, KBK-10/11/12/13' }
    ],
    notas: ARKEL_FONTE + ' Dois certificados: unidade de comando (componente de segurança) e quadro completo (fabricado pela Arkel). Anotar o nº de série do quadro instalado para escolher a DoC do ano certo.',
    documentos: [
        tipoUE('arcode-type-exam-eu', 'ce-tipo', 'Certificado de exame UE de tipo — unidade ARCODE', 'NL13-400-1002-048-11', '6',
            ['EN 81-20:2020', 'EN 81-50:2020', 'EN 81-1+A3'], '2026-05-08', '2031-05-08'),
        tipoUE('arcode-cp-type-exam-en81-20-50', 'ce-tipo-quadro', 'Certificado de exame UE de tipo — quadro completo ARCODE', 'NL14-400-1002-048-12', '5',
            ['EN 81-20:2020 (partes)', 'EN 81-50:2020 (partes)'], '2022-01-25', '2027-01-25'),
        docArkel('arcode-doc-eu', 'doc-fabricante', 'Declaração UE de Conformidade — unidade ARCODE', 'NL13-400-1002-048-11', '2026-05-11', 'Séries 2026 (…26010010001+); inclui páginas de 2025.'),
        docArkel('arcode-cp-doc', 'doc-fabricante-quadro', 'Declaração UE de Conformidade — quadro ARCODE', 'NL14-400-1002-048-12', '2026-01-02', 'Série 26010010001–2653Z999999; inclui 2025.'),
        emc('arcode-emc', 'Certificado EMC — ARCODE'),
        DOC_INSTALACAO
    ]
});

componentes.push({
    tipo: 'painel', fabricante: 'Arkel', modelo: 'ARCUBE',
    descricao: 'Unidade monobloco de comando com acionamento STO (sem contactores), ACOP e UCMP opcionais: variador VVVF, placa de comando, função de resgate e componentes elétricos numa só unidade. Variantes MRL e SLIM MRL.',
    fabricanteMorada: ARKEL_MORADA,
    dadosTecnicos: [
        { chave: 'Paragens (máx.)', valor: '16' },
        { chave: 'Tipo de acionamento', valor: 'Tração (VVVF; síncrono e assíncrono)' },
        { chave: 'Velocidade máx.', valor: '1,75', unidade: 'm/s' },
        { chave: 'Potência do motor', valor: '4 kW (10 A) / 5,5 kW (14 A) / 7,5 kW (17 A) / 11 kW (26 A)' },
        { chave: 'Manobra', valor: 'Coletiva simples / dupla; descida (MRL); grupo Duplex' },
        { chave: 'Cobertura do certificado', valor: 'Monobloco (MR), armários MRL, placas FX-Cube-(P/S) e KDB-A' },
        { chave: 'Dimensões ARCUBE MRL', valor: '1152 × 337', unidade: 'mm' },
        { chave: 'Dimensões ARCUBE SLIM MRL', valor: '2100 × 250', unidade: 'mm' }
    ],
    notas: ARKEL_FONTE + ' Dados técnicos da brochura ARCUBE_Brosur_EN.pdf. Não há certificado separado de "quadro completo" para o ARCUBE.',
    documentos: [
        tipoUE('arcube-type-exam-eu', 'ce-tipo', 'Certificado de exame UE de tipo — ARCUBE', 'NL19-400-1002-048-19', '2',
            ['EN 81-20:2020 (cl. 5.6.6.2, 5.6.7.x, 5.9.2.5.4 c, 5.10–5.12)', 'EN 81-50:2020 (cl. 5.6, 5.8, 5.15)'], '2024-07-25', '2029-07-25',
            'Ensaios: SASTEK (NÜ4-015 07.19/01, 13-07-2019) e LVT Ankara (19-1324-R01-N01-01, 12-07-2019).'),
        docArkel('arcube-doc-eu', 'doc-fabricante', 'Declaração UE de Conformidade — ARCUBE', 'NL19-400-1002-048-19', '2026-01-02', 'Inclui página de 2025.'),
        emc('arcube-emc', 'Certificado EMC — ARCUBE'),
        DOC_INSTALACAO
    ]
});

componentes.push({
    tipo: 'painel', fabricante: 'Arkel', modelo: 'ARL-700',
    descricao: 'Quadro de comando para elevadores elétricos e hidráulicos, com monitorização da cadeia de segurança, ponte de portas, UCMP e ACOP.',
    fabricanteMorada: ARKEL_MORADA,
    dadosTecnicos: [
        { chave: 'Aplicação', valor: 'Elevadores elétricos e hidráulicos' },
        { chave: 'Tempo máx. de resposta da placa DBR', valor: '10', unidade: 'ms' },
        { chave: 'Placas cobertas pelo certificado', valor: '700 CPU, 700 GLB, HSR, KBK-12/13, KDB, IBC-S' }
    ],
    notas: ARKEL_FONTE + ' Dois certificados: placas de comando (componente de segurança) e quadro completo (fabricado pela Arkel). O ARL-500 não é usado.',
    documentos: [
        tipoUE('arl700-type-exam-eu', 'ce-tipo', 'Certificado de exame UE de tipo — placas ARL-700', 'NL17-400-1002-048-15', '3',
            ['EN 81-20:2020 (cl. 5.6.6.2, 5.6.7.x, 5.11)', 'EN 81-50:2020 (cl. 5.8, 5.15)'], '2022-08-25', '2027-08-25',
            'Placas eletrónicas sem ensaio laboratorial (EN 81-50 §5.6).'),
        tipoUE('arl700-cp-type-exam-en81-20-50', 'ce-tipo-quadro', 'Certificado de exame UE de tipo — quadro completo ARL-700', 'NL19-400-1002-048-16', '1',
            ['EN 81-20:2020 (partes)', 'EN 81-50:2020 (partes)'], '2022-08-25', '2027-08-25'),
        docArkel('arl700-doc-eu', 'doc-fabricante', 'Declaração UE de Conformidade — placas ARL-700', 'NL17-400-1002-048-15', '2026-01-02', 'Inclui página de 2025.'),
        docArkel('arl700-cp-doc', 'doc-fabricante-quadro', 'Declaração UE de Conformidade — quadro ARL-700', 'NL19-400-1002-048-16', '2026-01-02', 'Série 26010010001–2653Z999999; inclui 2025.'),
        emc('arl700-emc', 'Certificado EMC — ARL-700'),
        DOC_INSTALACAO
    ]
});

(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/deapseak');
    for (const c of componentes) {
        if (DRY) { console.log('[dry]', c.tipo, c.fabricante, c.modelo, c.documentos.length, 'docs'); continue; }
        await ComponenteCatalogo.findOneAndUpdate(
            { tipo: c.tipo, fabricante: c.fabricante, modelo: c.modelo }, c, { upsert: true, new: true, runValidators: true });
        console.log('✔', c.fabricante, c.modelo);
    }
    await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
