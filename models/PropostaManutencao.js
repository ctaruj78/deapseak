const mongoose = require('mongoose');

const propostaManutencaoSchema = new mongoose.Schema({
    // Número da proposta (PROP-2024-12-001)
    numero: {
        type: String,
        required: true,
        unique: true
    },

    // Data de criação
    data: {
        type: Date,
        required: true,
        default: Date.now
    },

    // Validade (30 dias a partir da data)
    validadeAte: {
        type: Date,
        required: true
    },

    // Dados do cliente
    cliente: {
        nome: { type: String, required: true },
        morada: String,
        codigoPostal: String,
        nif: String,
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        }
    },

    // Dados da instalação
    instalacao: {
        edificio: String,
        nome: String,
        morada: String,
        codigoPostal: String
    },

    // Morada de faturação
    faturacao: {
        nome: String,
        unidadesContratadas: String,
        morada: String,
        codigoPostal: String
    },

    // Termos do contrato
    numAscensores: {
        type: Number,
        min: 1
    },
    localInstalacao: String,
    precoMensal: {
        type: Number,
        min: 0
    },
    pagamento: {
        type: String,
        default: 'Trimestral e adiantado'
    },
    dataInicioContrato: Date,
    duracaoAnos: {
        type: Number,
        min: 1,
        default: 1
    },

    // Termos de renovação (modo flexível)
    renovacao: {
        periodo: { type: String, default: '1 ano' },
        avisoDias: { type: String, default: '60 dias' },
        metodoNotificacao: { type: String, default: 'carta registada' },
        emailNotificacao: String
    },

    // Estado da proposta
    // 'solicitado' = pedido submetido pelo cliente, ainda sem termos comerciais definidos pela FestLift
    status: {
        type: String,
        enum: ['solicitado', 'rascunho', 'enviado', 'aprovado', 'rejeitado', 'expirado'],
        default: 'rascunho'
    },

    // Quem originou o registo: 'admin' (criado no painel interno) ou 'cliente' (pedido submetido pelo cliente)
    origem: {
        type: String,
        enum: ['admin', 'cliente'],
        default: 'admin'
    },

    // Quem criou (admin/dispatcher, ou o próprio cliente quando origem === 'cliente')
    criadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Data de envio ao cliente
    dataEnvio: Date,

    // Data de resposta (aprovação/rejeição)
    dataResposta: Date,

    // Quem aprovou/rejeitou
    aprovadoPor: {
        type: String,
        enum: ['cliente', 'admin', 'dispatcher']
    },

    aprovadoPorUser: {
        type: mongoose.Schema.Types.Mixed
    },

    // Observação/motivo
    observacao: String,

    // Ligação a elevador(es) — apenas vinculação manual
    liftId: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    lifts: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    liftAddress: {
        type: String,
        default: null
    },

    // Arquivo
    archived: { type: Boolean, default: false },
    archivedAt: Date,
    archivedBy: String,

    // PDF gerado (se guardado em disco)
    pdfPath: String,

    // Notas
    notas: {
        type: String,
        default: 'Esta proposta é válida por 30 dias a partir da data de apresentação.'
    },

    // Histórico de emails
    emailsEnviados: [{
        data: { type: Date, default: Date.now },
        para: String,
        assunto: String,
        sucesso: Boolean,
        erro: String
    }]
}, {
    timestamps: true
});

// Índices
propostaManutencaoSchema.index({ 'cliente.email': 1 });
propostaManutencaoSchema.index({ status: 1 });
propostaManutencaoSchema.index({ data: -1 });
propostaManutencaoSchema.index({ criadoPor: 1 });
propostaManutencaoSchema.index({ liftId: 1 });

// Geração atómica do número da proposta
propostaManutencaoSchema.statics.gerarNumero = async function() {
    const ano = new Date().getFullYear();
    const mes = String(new Date().getMonth() + 1).padStart(2, '0');
    const key = `PROP-${ano}-${mes}`;
    const counter = await mongoose.connection.db.collection('counters').findOneAndUpdate(
        { _id: key },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' }
    );
    const seq = counter.seq ?? counter.value?.seq ?? 1;
    return `${key}-${String(seq).padStart(3, '0')}`;
};

// Validade (30 dias)
propostaManutencaoSchema.methods.calcularValidadeAte = function() {
    const dataInicio = this.data || new Date();
    const validadeAte = new Date(dataInicio);
    validadeAte.setDate(validadeAte.getDate() + 30);
    return validadeAte;
};

propostaManutencaoSchema.methods.isExpirado = function() {
    return new Date() > this.validadeAte;
};

// Auto-atualizar status se expirado
propostaManutencaoSchema.pre('save', function(next) {
    if (!this.validadeAte) {
        this.validadeAte = this.calcularValidadeAte();
    }

    if (this.isExpirado() && this.status === 'enviado') {
        this.status = 'expirado';
    }

    next();
});

const PropostaManutencao = mongoose.model('PropostaManutencao', propostaManutencaoSchema);

module.exports = PropostaManutencao;
