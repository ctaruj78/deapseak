const mongoose = require('mongoose');

const inspectionSchema = new mongoose.Schema({
    // Número da inspecção (INSP-2025-01-001)
    numero: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Data da inspecção
    data: {
        type: Date,
        required: true,
        default: Date.now
    },

    // Técnico responsável
    inspector: {
        type: String,
        required: true,
        trim: true
    },

    // Localização do elevador
    liftLocation: {
        type: String,
        required: true,
        trim: true
    },

    // Modelo do elevador
    liftModel: {
        type: String,
        trim: true,
        default: ''
    },

    // Email do cliente
    clientEmail: {
        type: String,
        lowercase: true,
        trim: true,
        default: ''
    },

    // Referência ao elevador (opcional)
    liftId: {
        type: String,
        default: null
    },

    // Checklist de inspecção: { "item-id": { status, comment } }
    checklist: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Observações gerais
    generalComments: {
        type: String,
        default: ''
    },

    // Recomendações
    recommendations: {
        type: String,
        default: ''
    },

    // Estado do relatório
    status: {
        type: String,
        enum: ['rascunho', 'finalizado', 'enviado', 'arquivado'],
        default: 'rascunho'
    },

    // Caminho para o PDF gerado
    pdfPath: {
        type: String,
        default: null
    },

    // Criado por (utilizador autenticado)
    criadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    // Log de emails enviados
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

// ─── Static: gerar número único ──────────────────────────────────────────────
inspectionSchema.statics.gerarNumero = async function () {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');

    const prefix = `INSP-${yyyy}-${mm}-`;
    const last = await this.findOne(
        { numero: new RegExp(`^${prefix}`) },
        {},
        { sort: { numero: -1 } }
    );

    let seq = 1;
    if (last) {
        const parts = last.numero.split('-');
        seq = parseInt(parts[parts.length - 1], 10) + 1;
    }
    return `${prefix}${String(seq).padStart(3, '0')}`;
};

module.exports = mongoose.model('Inspection', inspectionSchema);
