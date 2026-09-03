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

    // Validade (30 dias a partir da data). Default como função (não no
    // pre('save')) porque o hook de validação do Mongoose corre ANTES de
    // qualquer pre('save') do utilizador — um pre('save') a atribuir isto
    // chegaria tarde de mais e a validação "required" falharia sempre que o
    // documento fosse criado sem validadeAte explícito.
    validadeAte: {
        type: Date,
        required: true,
        default: function() {
            const dataInicio = this.data || new Date();
            const validade = new Date(dataInicio);
            validade.setDate(validade.getDate() + 30);
            return validade;
        }
    },

    // Dados do cliente
    cliente: {
        nome: { type: String, required: true, maxlength: 200 },
        morada: { type: String, maxlength: 300 },
        codigoPostal: { type: String, maxlength: 100 },
        nif: { type: String, maxlength: 30 },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            maxlength: 200
        }
    },

    // Dados da instalação — o NIF aqui é o do prédio/condomínio a manter,
    // que é frequentemente diferente do NIF do contacto/cliente acima
    // (ex.: administradora de condomínios a pedir em nome de um prédio de terceiros)
    instalacao: {
        edificio: { type: String, maxlength: 200 },
        nome: { type: String, maxlength: 200 },
        morada: { type: String, maxlength: 300 },
        codigoPostal: { type: String, maxlength: 100 },
        nif: { type: String, maxlength: 30 }
    },

    // Morada de faturação — pode ter NIF próprio (ex.: entidade de faturação
    // diferente do prédio, como uma administradora ou gestora de condomínio)
    faturacao: {
        nome: { type: String, maxlength: 200 },
        nif: { type: String, maxlength: 30 },
        unidadesContratadas: { type: String, maxlength: 100 },
        morada: { type: String, maxlength: 300 },
        codigoPostal: { type: String, maxlength: 20 }
    },

    // Tipo de manutenção: 'simples' (inspeção/conservação) ou 'completa'
    // (inclui reparações/peças — condições gerais próprias, ver
    // backend/constants/propostaManutencaoTerms.js)
    tipo: {
        type: String,
        enum: ['simples', 'completa'],
        default: 'simples'
    },

    // Quando as duas versões (simples + completa) são criadas em conjunto
    // para o mesmo pedido, ligam-se uma à outra para navegação cruzada na UI
    propostaIrmaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PropostaManutencao',
        default: null
    },

    // Termos do contrato
    numAscensores: {
        type: Number,
        min: 1,
        max: 50
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

    // Notas — texto oficial impresso no PDF (condições/validade). NUNCA deve ser
    // preenchido diretamente com texto livre do cliente — ver observacaoCliente.
    notas: {
        type: String,
        default: 'Esta proposta é válida por 30 dias a partir da data de apresentação.'
    },

    // Observações livres submetidas pelo próprio cliente ao pedir a proposta
    // (ex.: "atualmente com outra empresa, contrato termina em..."). Visível
    // apenas internamente (admin/dispatcher) — não é impressa no PDF oficial.
    observacaoCliente: {
        type: String,
        maxlength: 2000
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
