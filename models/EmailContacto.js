const mongoose = require('mongoose');

// Registo de emails enviados via "Contactar Cliente" — sem isto não havia
// forma de rever o que foi enviado e a quem (só ficava o BCC na caixa de entrada).
const emailContactoSchema = new mongoose.Schema({
    cliente: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        nome: String,
        email: { type: String, required: true }
    },
    cc: [String],
    assunto: { type: String, required: true },
    mensagem: { type: String, required: true },
    anexos: [String],
    enviadoPor: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        nome: String,
        email: String
    },
    sucesso: { type: Boolean, default: true },
    erro: String
}, {
    timestamps: true
});

emailContactoSchema.index({ 'cliente.id': 1, createdAt: -1 });

module.exports = mongoose.model('EmailContacto', emailContactoSchema);
