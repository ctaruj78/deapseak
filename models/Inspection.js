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

    // Número municipal do elevador
    liftMunicipalNumber: {
        type: String,
        trim: true,
        default: ''
    },

    // Nome do cliente
    clientName: {
        type: String,
        trim: true,
        default: ''
    },

    // Tipo de visita (maintenance, quarterly, annual, pre_inspection, repair, emergency)
    visitType: {
        type: String,
        enum: ['maintenance', 'quarterly', 'annual', 'pre_inspection', 'repair', 'emergency', ''],
        default: 'maintenance'
    },

    // Tipo de accionamento e portas (contexto da visita)
    driveType: { type: String, trim: true, default: '' },
    doorType:  { type: String, trim: true, default: '' },

    // Validade da licença extraída do certificado (para visitas IT/anual)
    licenseDate:   { type: Date, default: null },
    licenseExpiry: { type: Date, default: null },

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

// ─── Static: gerar número único (атомарний лічильник) ────────────────────────
inspectionSchema.statics.gerarNumero = async function () {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const key = `INSP-${yyyy}-${mm}`;
    const counter = await mongoose.connection.db.collection('counters').findOneAndUpdate(
        { _id: key },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' }
    );
    const seq = counter.seq ?? counter.value?.seq ?? 1;
    return `${key}-${String(seq).padStart(3, '0')}`;
};

module.exports = mongoose.model('Inspection', inspectionSchema);
