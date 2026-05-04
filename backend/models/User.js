// ============================================
// USER MODEL - Mongoose Schema
// ============================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username є обов\'язковим'],
        unique: true,
        trim: true,
        minlength: [3, 'Username deve ter no mínimo 3 caracteres'],
        maxlength: [50, 'Username não pode exceder 50 caracteres']
    },
    email: {
        type: String,
        required: [true, 'Email є обов\'язковим'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Formato de email inválido']
    },
    password: {
        type: String,
        required: [true, 'Пароль є обов\'язковим'],
        minlength: [6, 'Пароль має бути мінімум 6 символів'],
        select: false // Не повертати пароль в запитах за замовчуванням
    },
    role: {
        type: String,
        enum: {
            values: ['admin', 'dispatcher', 'technician', 'tech', 'client'],
            message: 'Роль має бути: admin, dispatcher, technician, tech ou client'
        },
        default: 'client'
    },
    firstName: {
        type: String,
        required: [true, 'Ім\'я є обов\'язковим'],
        trim: true,
        maxlength: [50, 'Ім\'я не може перевищувати 50 символів']
    },
    lastName: {
        type: String,
        required: [true, 'Прізвище є обов\'язковим'],
        trim: true,
        maxlength: [50, 'Прізвище не може перевищувати 50 символів']
    },
    phone: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                // Дозволяємо пусте значення ou формати +380, 380, 0, +351, +1 тощо
                // Пробіли, дефіси та дужки допускаються
                if (!v || v === '') return true;
                const stripped = v.replace(/[\s\-().]/g, '');
                return /^(\+\d{1,4}|0)\d{6,14}$/.test(stripped);
            },
            message: 'Formato de telefone inválido'
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    mustChangePassword: {
        type: Boolean,
        default: false  // true — примусова зміна пароля при першому вході
    },
    tempPasswordHint: {
        type: String,
        default: ''  // тимчасовий пароль (очищається після зміни)
    },
    lastLogin: {
        type: Date
    },
    
    // Налаштування користувача
    settings: {
        language: {
            type: String,
            enum: ['uk', 'en', 'pt'],
            default: 'uk'
        },
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'light'
        },
        notifications: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true },
            sms: { type: Boolean, default: false },
            newRequest: { type: Boolean, default: true },
            statusChange: { type: Boolean, default: true },
            assignment: { type: Boolean, default: true },
            reminders: { type: Boolean, default: true }
        },
        privacy: {
            showEmail: { type: Boolean, default: false },
            showPhone: { type: Boolean, default: false },
            allowAnalytics: { type: Boolean, default: true }
        },
        display: {
            itemsPerPage: { type: Number, default: 20 },
            dateFormat: { type: String, default: 'DD.MM.YYYY' },
            timeFormat: { type: String, default: '24h' },
            timezone: { type: String, default: 'Europe/Lisbon' }
        },
        updatedAt: { type: Date, default: Date.now }
    },
    
    refreshToken: {
        type: String,
        select: false
    },
    resetPasswordToken: {
        type: String,
        select: false
    },
    resetPasswordExpire: {
        type: Date,
        select: false
    },
    // 🔐 Захист від брутфорсу - лічильник невдалих спроб входу
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date,
        default: null
    },

    // Для technician - workload tracking
    currentAssignments: {
        type: Number,
        default: 0
    },
    maxAssignments: {
        type: Number,
        default: 10
    },
    specialty: {
        type: String,
        enum: ['hydraulic', 'electric', 'mechanical', 'general', 'maintenance'], // Додано 'maintenance' для сумісності
        default: 'general'
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'busy', 'active', 'inactive', 'suspended'], // Додано 'suspended' для клієнтів
        default: 'offline'
    },

    // Поля специфічні для клієнтів
    companyName: { type: String, trim: true },
    clientType: {
        type: String,
        enum: ['business', 'individual', 'government'],
        default: 'individual'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'vip'],
        default: 'medium'
    },
    address: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    contactPosition: { type: String, trim: true },
    contractInfo: { type: String, trim: true },
    notes: { type: String, trim: true }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Віртуальне поле для повного імені
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Middleware: Хешування паролю перед збереженням
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Метод: Перевірка паролю
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Метод: Збільшити лічильник невдалих спроб і встановити lockout при потребі
userSchema.methods.incrementLoginAttempts = async function() {
    const MAX_ATTEMPTS = 5;
    const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 хвилин

    // Якщо блокування вже скінчилося — скидаємо лічильник
    if (this.lockUntil && this.lockUntil < new Date()) {
        return this.constructor.updateOne(
            { _id: this._id },
            { $set: { loginAttempts: 1, lockUntil: null } }
        );
    }

    const updates = { $inc: { loginAttempts: 1 } };
    // Якщо досягнуто максимуму — заблокувати на 15 хвилин
    if (this.loginAttempts + 1 >= MAX_ATTEMPTS) {
        updates.$set = { lockUntil: new Date(Date.now() + LOCK_DURATION_MS) };
    }
    return this.constructor.updateOne({ _id: this._id }, updates);
};

// Метод: Скинути лічильник після успішного входу
userSchema.methods.resetLoginAttempts = async function() {
    return this.constructor.updateOne(
        { _id: this._id },
        { $set: { loginAttempts: 0, lockUntil: null } }
    );
};

// Метод: Видалення конфіденційних даних
userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    delete user.refreshToken;
    return user;
};

// Індекси
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
