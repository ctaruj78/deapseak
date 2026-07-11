/**
 * 🏛️ Municipality Model - Португальські муніципалітети
 * 
 * Модель для зберігання інформації про câmaras municipais
 * в радіусі 120 км від Rio de Mouro, Sintra
 */

const mongoose = require('mongoose');

const notificationHistorySchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['novo', 'manutencao_inicio', 'manutencao_fim', 'inspecao', 'mensal', 'anual'],
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    emailId: String,
    subject: String,
    status: {
        type: String,
        enum: ['sent', 'delivered', 'opened', 'failed'],
        default: 'sent'
    },
    liftId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lift'
    },
    liftAddress: String
}, { _id: true });

const municipalitySchema = new mongoose.Schema({
    // Базова інформація
    id: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    distrito: {
        type: String,
        required: true,
        enum: ['Lisboa', 'Setúbal', 'Santarém', 'Leiria']
    },
    
    // Географічні дані
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },
    distance_km: {
        type: Number,
        required: true
    },
    
    // Поштові коди
    postal_codes: [{
        type: String,
        trim: true
    }],
    
    // Контактна інформація
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Невірний формат email']
    },
    website: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    
    // Статистика повідомлень
    notification_stats: {
        total_sent: { type: Number, default: 0 },
        total_lifts: { type: Number, default: 0 },
        last_notification_date: Date,
        last_notification_type: {
            type: String,
            enum: ['novo', 'manutencao_inicio', 'manutencao_fim', 'inspecao', 'mensal', 'anual']
        }
    },
    
    // Історія повідомлень
    notification_history: [notificationHistorySchema],
    
    // Налаштування
    active: {
        type: Boolean,
        default: true
    },
    auto_notify: {
        type: Boolean,
        default: true,
        comment: 'Автоматично відправляти повідомлення при додаванні нових ліфтів'
    },
    
    // Метадані
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'municipalities'
});

// Індекси для швидкого пошуку
municipalitySchema.index({ name: 1 });
municipalitySchema.index({ distrito: 1 });
municipalitySchema.index({ 'postal_codes': 1 });
municipalitySchema.index({ distance_km: 1 });

// Віртуальне поле для форматованої адреси
municipalitySchema.virtual('display_name').get(function() {
    return `Câmara Municipal de ${this.name}`;
});

// Метод для додавання повідомлення в історію
municipalitySchema.methods.addNotification = function(notificationData) {
    this.notification_history.push(notificationData);
    this.notification_stats.total_sent += 1;
    this.notification_stats.last_notification_date = new Date();
    this.notification_stats.last_notification_type = notificationData.type;
    return this.save();
};

// Метод для пошуку за поштовим кодом
municipalitySchema.statics.findByPostalCode = function(postalCode) {
    // Segurança: escapar metacaracteres regex para evitar injeção/ReDoS
    const prefix = String(postalCode || '').substring(0, 4).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.findOne({
        postal_codes: {
            $regex: `^${prefix}`,
            $options: 'i'
        }
    });
};

// Метод для пошуку найближчого муніципалітету
municipalitySchema.statics.findNearest = function(latitude, longitude, maxDistance = 120) {
    // Проста евклідова відстань (достатньо для малих відстаней)
    return this.find({ 
        distance_km: { $lte: maxDistance },
        active: true 
    }).sort({ distance_km: 1 }).limit(1);
};

const Municipality = mongoose.model('Municipality', municipalitySchema);

module.exports = Municipality;
