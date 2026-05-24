const mongoose = require('mongoose');

const orcamentoSchema = new mongoose.Schema({
    // Номер орçаменту (ORC-2024-12-001)
    numero: {
        type: String,
        required: true,
        unique: true
    },
    
    // Дата створення орçаменту
    data: {
        type: Date,
        required: true,
        default: Date.now
    },
    
    // Валідність (30 днів від дати)
    validadeAte: {
        type: Date,
        required: true
    },
    
    // Дані клієнта
    cliente: {
        nome: {
            type: String,
            required: true
        },
        morada: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },
        nif: String  // Опціонально - NIF клієнта
    },
    
    // Послуги/товари
    servicos: [{
        descricao: {
            type: String,
            required: true
        },
        quantidade: {
            type: Number,
            required: true,
            min: 1
        },
        precoUnitario: {
            type: Number,
            required: true,
            min: 0
        },
        total: {
            type: Number,
            required: true,
            min: 0
        }
    }],
    
    // Фінансові дані
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    
    iva: {
        type: Number,
        required: true,
        min: 0,
        default: function() {
            return this.subtotal * 0.23; // IVA 23%
        }
    },
    
    total: {
        type: Number,
        required: true,
        min: 0
    },
    
    // Примітки
    notas: {
        type: String,
        default: 'Este orçamento é válido por 30 dias a partir da data de apresentação.'
    },
    
    // Статус орçаменту
    status: {
        type: String,
        enum: ['rascunho', 'enviado', 'aprovado', 'rejeitado', 'expirado'],
        default: 'rascunho'
    },
    
    // Хто створив (admin user)
    criadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Дата відправки клієнту
    dataEnvio: Date,
    
    // Дата схвалення/відхилення
    dataResposta: Date,

    // Хто схвалив/відхилив ('cliente' | 'admin' | 'dispatcher')
    aprovadoPor: {
        type: String,
        enum: ['cliente', 'admin', 'dispatcher']
    },

    // ID do utilizador que aprovou/rejeitou
    aprovadoPorUser: {
        type: mongoose.Schema.Types.Mixed
    },

    // Observação/motivo fornecido pelo cliente ou admin
    observacao: {
        type: String
    },

    // Ligação ao elevador (se detectado por morada) — mantido para compatibilidade
    liftId: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },

    // Array de elevadores vinculados (objectos {liftId, address, ...} ou IDs)
    lifts: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },

    // Endereço do elevador ligado (para exibição rápida)
    liftAddress: {
        type: String,
        default: null
    },

    // Архів
    archived: { type: Boolean, default: false },
    archivedAt: { type: Date },
    archivedBy: { type: String },

    // Фотографії прикріплені до орçаменту
    fotos: {
        type: [String],
        default: []
    },

    // PDF файл (якщо збережено)
    pdfPath: String,
    
    // Email історія
    emailsEnviados: [{
        data: {
            type: Date,
            default: Date.now
        },
        para: String,
        assunto: String,
        sucesso: Boolean
    }]
}, {
    timestamps: true // createdAt, updatedAt автоматично
});

// Índices para pesquisa rápida
// orcamentoSchema.index({ numero: 1 }); // já criado pelo unique:true
orcamentoSchema.index({ 'cliente.email': 1 });
orcamentoSchema.index({ status: 1 });
orcamentoSchema.index({ data: -1 });
orcamentoSchema.index({ criadoPor: 1 });
orcamentoSchema.index({ liftId: 1 });

// Метод для генерації номеру орçаменту
orcamentoSchema.statics.gerarNumero = async function() {
    const ano = new Date().getFullYear();
    const mes = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Знайти останній орçаменто цього місяця
    const ultimoOrcamento = await this.findOne({
        numero: new RegExp(`^ORC-${ano}-${mes}`)
    }).sort({ numero: -1 });
    
    let sequencia = 1;
    if (ultimoOrcamento) {
        const match = ultimoOrcamento.numero.match(/ORC-\d{4}-\d{2}-(\d{3})/);
        if (match) {
            sequencia = parseInt(match[1]) + 1;
        }
    }
    
    return `ORC-${ano}-${mes}-${String(sequencia).padStart(3, '0')}`;
};

// Метод для calcular валідність (30 днів)
orcamentoSchema.methods.calcularValidadeAte = function() {
    const dataInicio = this.data || new Date();
    const validadeAte = new Date(dataInicio);
    validadeAte.setDate(validadeAte.getDate() + 30);
    return validadeAte;
};

// Метод для verificar чи expired
orcamentoSchema.methods.isExpirado = function() {
    return new Date() > this.validadeAte;
};

// Auto-update status se expirado
orcamentoSchema.pre('save', function(next) {
    if (!this.validadeAte) {
        this.validadeAte = this.calcularValidadeAte();
    }
    
    if (this.isExpirado() && this.status === 'enviado') {
        this.status = 'expirado';
    }
    
    next();
});

const Orcamento = mongoose.model('Orcamento', orcamentoSchema);

module.exports = Orcamento;
