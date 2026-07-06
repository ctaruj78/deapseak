const mongoose = require('mongoose');

// Catálogo de categorias de materiais/trabalhos para orçamentos de modernização.
// Cada categoria pode ser usada como linha de serviço (nome/descricao/preco) quando
// vendida, e/ou gerar uma nota de não-conformidade no PDF quando NÃO for vendida
// (campo notaNaoConformidade), à semelhança do aviso regulamentar EN 81-20 usado
// nos orçamentos de modernização.
const orcamentoCategoriaSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: true,
        trim: true
    },

    // Agrupamento para organização no catálogo/admin
    grupo: {
        type: String,
        enum: ['eletrico', 'mecanico', 'estrutural', 'seguranca', 'outro'],
        default: 'outro'
    },

    // Texto completo usado como descrição da linha de serviço quando esta categoria é vendida
    descricao: {
        type: String,
        required: true
    },

    unidade: {
        type: String,
        default: 'un'
    },

    precoSugerido: {
        type: Number,
        min: 0,
        default: 0
    },

    // Citação normativa (ex.: "EN 81-20:2014, Art. 5.2.1; D.L. n.º 320/2002, Art. 9.º")
    norma: {
        type: String,
        default: ''
    },

    // Parágrafo de aviso a inserir no PDF quando esta categoria NÃO está incluída no orçamento
    notaNaoConformidade: {
        type: String,
        default: ''
    },

    // Se true, a ausência desta categoria no orçamento deve gerar aviso no PDF
    critico: {
        type: Boolean,
        default: false
    },

    ativo: {
        type: Boolean,
        default: true
    },

    // Ordem de exibição no catálogo
    ordem: {
        type: Number,
        default: 0
    },

    criadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

orcamentoCategoriaSchema.index({ grupo: 1, ordem: 1 });
orcamentoCategoriaSchema.index({ ativo: 1 });

const OrcamentoCategoria = mongoose.model('OrcamentoCategoria', orcamentoCategoriaSchema);

module.exports = OrcamentoCategoria;
