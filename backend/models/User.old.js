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
        minlength: [3, 'Username має бути мінімум 3 символи'],
        maxlength: [50, 'Username не може перевищувати 50 символів']
    },
    email: {
        type: String,
        required: [true, 'Email є обов\'язковим'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Невірний формат email']
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
            values: ['admin', 'dispatcher', 'technician', 'client'],
            message: 'Роль має бути: admin, dispatcher, technician або client'
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
        match: [/^(\+380|380|0)\d{9}$/, 'Невірний формат телефону']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    refreshToken: {
        type: String,
        select: false
    },
    passwordResetToken: {
        type: String,
        select: false
    },
    passwordResetExpires: {
        type: Date,
        select: false
    }
}, {
    timestamps: true, // Автоматично додає createdAt та updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Віртуальне поле для повного імені
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Middleware: Хешування паролю перед збереженням
userSchema.pre('save', async function(next) {
    // Хешуємо тільки якщо пароль змінився
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

// Метод: Видалення конфіденційних даних при конвертації в JSON
userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    delete user.refreshToken;
    delete user.passwordResetToken;
    delete user.passwordResetExpires;
    return user;
};

// Індекси для швидкого пошуку
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
