const mongoose = require('mongoose');

const assinaturaSchema = new mongoose.Schema({
    imagem: String, // data URL (PNG base64) do canvas de assinatura
    data: Date,
    assinadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    nomeAssinante: String
}, { _id: false });

const contratoManutencaoSchema = new mongoose.Schema({
    // Número do contrato (CONT-2026-07-001)
    numero: {
        type: String,
        required: true,
        unique: true
    },

    // Proposta de origem (contrato é sempre gerado a partir de uma proposta aprovada)
    propostaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PropostaManutencao',
        required: true,
        unique: true
    },

    data: {
        type: Date,
        required: true,
        default: Date.now
    },

    // Tipo de manutenção herdado da proposta de origem — determina o título
    // do documento e as Condições Gerais aplicáveis (ver propostaManutencaoTerms.js)
    tipo: {
        type: String,
        enum: ['simples', 'completa'],
        default: 'simples'
    },

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

    instalacao: {
        edificio: String,
        nome: String,
        morada: String,
        codigoPostal: String,
        nif: String
    },

    faturacao: {
        nome: String,
        nif: String,
        unidadesContratadas: String,
        morada: String,
        codigoPostal: String
    },

    numAscensores: { type: Number, min: 1 },
    localInstalacao: String,
    precoMensal: { type: Number, min: 0 },
    pagamento: { type: String, default: 'Trimestral e adiantado' },
    dataInicioContrato: Date,
    duracaoAnos: { type: Number, min: 1, default: 1 },

    // Termos de renovação (modo flexível — igual à Proposta)
    renovacao: {
        periodo: { type: String, default: '1 ano' },
        avisoDias: { type: String, default: '60 dias' },
        metodoNotificacao: { type: String, default: 'carta registada' },
        emailNotificacao: String
    },

    // Estado do contrato
    status: {
        type: String,
        enum: ['pendente', 'assinado_festlift', 'assinado', 'cancelado'],
        default: 'pendente'
    },

    assinaturaEmpresa: assinaturaSchema,
    assinaturaCliente: assinaturaSchema,

    // Token de acesso ao link público de assinatura — aleatório por documento
    // (crypto.randomBytes), não um hash determinístico do id. Gerado uma vez,
    // com expiração, e invalidado após a assinatura.
    accessToken: { type: String, index: true },
    accessTokenExpiresAt: Date,
    accessTokenUsedAt: Date,

    // Ligação a elevador(es) — herdada da proposta
    liftId: { type: mongoose.Schema.Types.Mixed, default: null },
    lifts: { type: [mongoose.Schema.Types.Mixed], default: [] },
    liftAddress: { type: String, default: null },

    criadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Conta de cliente criada automaticamente ao assinar via link público (se ainda não existia)
    contaClienteCriada: { type: Boolean, default: false },

    // Histórico de envios do link de assinatura pública
    emailsEnviados: [{
        data: { type: Date, default: Date.now },
        para: String,
        assunto: String,
        sucesso: Boolean,
        erro: String
    }],

    notas: String
}, {
    timestamps: true
});

contratoManutencaoSchema.index({ 'cliente.email': 1 });
contratoManutencaoSchema.index({ status: 1 });
contratoManutencaoSchema.index({ data: -1 });

contratoManutencaoSchema.statics.gerarNumero = async function() {
    const ano = new Date().getFullYear();
    const mes = String(new Date().getMonth() + 1).padStart(2, '0');
    const key = `CONT-${ano}-${mes}`;
    const counter = await mongoose.connection.db.collection('counters').findOneAndUpdate(
        { _id: key },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' }
    );
    const seq = counter.seq ?? counter.value?.seq ?? 1;
    return `${key}-${String(seq).padStart(3, '0')}`;
};

const ContratoManutencao = mongoose.model('ContratoManutencao', contratoManutencaoSchema);

module.exports = ContratoManutencao;
