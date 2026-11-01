const mongoose = require('mongoose');

// Catálogo de componentes instalados em modernizações (marca/modelo) com os dados
// técnicos e os documentos que acompanham cada um (certificado de exame UE de tipo,
// declaração de conformidade, manual…). No fecho da modernização, os documentos dos
// modelos efetivamente instalados são juntados ao dossier do elevador.
const documentoSchema = new mongoose.Schema({
    tipo: {
        type: String,
        enum: ['certificado_ce', 'declaracao_conformidade', 'manual', 'ensaio', 'outro'],
        required: true
    },
    titulo: { type: String, required: true, trim: true },
    // Caminho relativo a uploads/ (ex.: certificados-componentes/CE-CL-08-200-2022.pdf)
    ficheiro: { type: String, default: '' },
    // Se true, é gerado a partir dos dados do elevador (ex.: Declaração de Conformidade da instalação)
    gerado: { type: Boolean, default: false },

    // Dados do certificado/declaração
    numero: { type: String, default: '' },            // ex.: NL17-400-1002-034-12
    revisao: { type: String, default: '' },
    organismoNotificado: { type: String, default: '' }, // ex.: Liftinstituut B.V. (NB 0400)
    diretiva: { type: String, default: '' },           // ex.: 2014/33/EU
    normas: [{ type: String }],                        // ex.: EN 81-20:2020
    emitidoEm: { type: Date },
    validoAte: { type: Date },

    // Família = "linha" de versões do mesmo documento (ex.: 'ce-tipo', 'doc-fabricante').
    // Uma nova revisão na mesma família substitui a anterior; a antiga fica no catálogo.
    familia: { type: String, default: '' },
    // Data a partir da qual uma revisão posterior substituiu este documento
    substituidoEm: { type: Date },

    // true = ficheiro é amostra/exemplo do fabricante, não o certificado definitivo
    amostra: { type: Boolean, default: false },
    observacao: { type: String, default: '' }
}, { _id: true });

const dadoTecnicoSchema = new mongoose.Schema({
    chave: { type: String, required: true },   // ex.: Velocidade nominal
    valor: { type: String, required: true },   // ex.: 0,2 – 1,6
    unidade: { type: String, default: '' }     // ex.: m/s
}, { _id: false });

const componenteCatalogoSchema = new mongoose.Schema({
    tipo: {
        type: String,
        enum: ['painel', 'limitador', 'porta', 'fechadura', 'maquina', 'travao', 'paraquedas', 'cabina', 'hidraulica', 'outro'],
        required: true
    },
    fabricante: { type: String, required: true, trim: true },
    modelo: { type: String, required: true, trim: true },
    descricao: { type: String, default: '' },
    fabricanteMorada: { type: String, default: '' },
    dadosTecnicos: [dadoTecnicoSchema],
    notas: { type: String, default: '' },
    // Pacotes de orçamento a que este componente se aplica (sugestão no checklist)
    pacotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrcamentoCategoria' }],
    documentos: [documentoSchema],
    ativo: { type: Boolean, default: true }
}, { timestamps: true });

componenteCatalogoSchema.index({ tipo: 1, fabricante: 1, modelo: 1 }, { unique: true });

// Estado de um documento: substituido | valido | a_expirar (<180 dias) | expirado | sem_validade
componenteCatalogoSchema.statics.estadoDocumento = function (doc, ref = new Date()) {
    if (doc.substituidoEm && new Date(doc.substituidoEm) <= ref) return 'substituido';
    if (!doc.validoAte) return 'sem_validade';
    const dias = (new Date(doc.validoAte) - ref) / 86400000;
    return dias < 0 ? 'expirado' : dias < 180 ? 'a_expirar' : 'valido';
};

// Documentos de um componente que estavam em vigor à data `data` (uma versão por família):
// a revisão mais recente emitida até essa data. `foraValidade` avisa se já tinha expirado nessa data.
// Documentos gerados (declaração da instalação) e sem família entram sempre.
componenteCatalogoSchema.statics.documentosEmVigor = function (componente, data) {
    const ref = new Date(data);
    const porFamilia = new Map();
    const soltos = [];
    for (const d of componente.documentos) {
        if (d.gerado || !d.familia) { soltos.push(d); continue; }
        if (d.emitidoEm && new Date(d.emitidoEm) > ref) continue;
        const atual = porFamilia.get(d.familia);
        if (!atual || new Date(d.emitidoEm || 0) > new Date(atual.emitidoEm || 0)) porFamilia.set(d.familia, d);
    }
    return [...soltos, ...porFamilia.values()].map(d => {
        const o = d.toObject ? d.toObject() : { ...d };
        o.foraValidade = !!(o.validoAte && new Date(o.validoAte) < ref);
        return o;
    });
};

module.exports = mongoose.model('ComponenteCatalogo', componenteCatalogoSchema);
