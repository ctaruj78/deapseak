// ============================================
// REQUEST MODEL - Mongoose Schema
// ============================================

const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Назва заявки є обов\'язковою'],
        trim: true,
        maxlength: [200, 'Назва не може перевищувати 200 символів']
    },
    description: {
        type: String,
        required: [true, 'Опис заявки є обов\'язковим'],
        trim: true,
        maxlength: [2000, 'Опис не може перевищувати 2000 символів']
    },
    // Ліфт
    liftId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lift',
        required: [true, 'ID ліфта є обов\'язковим']
    },
    location: {
        type: String,
        trim: true
    },
    // Клієнт
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'ID клієнта є обов\'язковим']
    },
    clientEmail: {
        type: String,
        required: [true, 'Email клієнта є обов\'язковим'],
        trim: true,
        lowercase: true
    },
    // Технік
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Статус
    status: {
        type: String,
        enum: {
            values: ['new', 'assigned', 'in_progress', 'completed', 'cancelled'],
            message: 'Статус має бути: new, assigned, in_progress, completed або cancelled'
        },
        default: 'new'
    },
    priority: {
        type: String,
        enum: {
            values: ['low', 'medium', 'high', 'urgent'],
            message: 'Пріоритет має бути: low, medium, high або urgent'
        },
        default: 'medium'
    },
    // Часові мітки
    assignedAt: {
        type: Date
    },
    startedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    // Робота
    workDescription: {
        type: String,
        maxlength: [2000, 'Опис роботи не може перевищувати 2000 символів']
    },
    workDuration: {
        type: Number, // в хвилинах
        min: 0
    },
    // Фото
    photosBefore: [{
        url: String,
        description: String,
        uploadedAt: Date
    }],
    photosAfter: [{
        url: String,
        description: String,
        uploadedAt: Date
    }],
    // Коментарі та історія
    comments: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        text: {
            type: String,
            required: true,
            maxlength: 1000
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    statusHistory: [{
        status: String,
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        changedAt: {
            type: Date,
            default: Date.now
        },
        comment: String
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Віртуальне поле для часу виконання
requestSchema.virtual('completionTime').get(function() {
    if (this.completedAt && this.createdAt) {
        return Math.floor((this.completedAt - this.createdAt) / (1000 * 60)); // в хвилинах
    }
    return null;
});

// Middleware: Оновлення assignedAt при призначенні
requestSchema.pre('save', function(next) {
    if (this.isModified('assignedTo') && this.assignedTo && !this.assignedAt) {
        this.assignedAt = new Date();
    }
    if (this.isModified('status')) {
        if (this.status === 'in_progress' && !this.startedAt) {
            this.startedAt = new Date();
        }
        if (this.status === 'completed' && !this.completedAt) {
            this.completedAt = new Date();
        }
    }
    next();
});

// Метод: Додавання коментаря
requestSchema.methods.addComment = function(userId, text) {
    this.comments.push({
        userId,
        text,
        createdAt: new Date()
    });
    return this.save();
};

// Метод: Зміна статусу з історією
requestSchema.methods.changeStatus = function(newStatus, userId, comment = '') {
    this.statusHistory.push({
        status: this.status,
        changedBy: userId,
        changedAt: new Date(),
        comment
    });
    this.status = newStatus;
    return this.save();
};

// Індекси
requestSchema.index({ status: 1 });
requestSchema.index({ priority: 1 });
requestSchema.index({ liftId: 1 });
requestSchema.index({ clientId: 1 });
requestSchema.index({ assignedTo: 1 });
requestSchema.index({ createdAt: -1 });

const Request = mongoose.model('Request', requestSchema);

module.exports = Request;
