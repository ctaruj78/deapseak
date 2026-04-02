const { User } = require('../models');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const crypto = require('crypto');

/**
 * Генерація випадкового тимчасового пароля
 * @param {number} length - Довжина пароля (за замовчуванням 10)
 * @returns {string} - Випадковий пароль
 */
const generateTemporaryPassword = (length = 10) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    const randomBytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
        password += chars[randomBytes[i] % chars.length];
    }
    
    return password;
};

/**
 * Реєстрація нового користувача
 */
exports.register = async (req, res, next) => {
    try {
        let { username, email, password, firstName, lastName, phone, role } = req.body;

        // Генерація тимчасового пароля, якщо не переданий
        let temporaryPassword = null;
        if (!password) {
            temporaryPassword = generateTemporaryPassword();
            password = temporaryPassword;
        }

        // Перевірка чи існує користувач
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            throw new AppError('Користувач з таким email або username вже існує', 400);
        }

        // Створення користувача (пароль автоматично хешується)
        const user = await User.create({
            username,
            email,
            password,
            firstName,
            lastName,
            phone,
            role: role || 'client' // За замовчуванням клієнт
        });

        // Генерація токенів
        const tokenPayload = {
            id: user._id.toString(),
            email: user.email,
            role: user.role
        };
        const token = generateToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        // Відповідь без пароля
        const userResponse = user.toObject();
        delete userResponse.password;

        const response = {
            success: true,
            message: temporaryPassword 
                ? 'Користувача створено. Тимчасовий пароль надіслано в відповіді.' 
                : 'Користувача успішно зареєстровано',
            data: {
                user: userResponse,
                token,
                refreshToken
            }
        };

        // Додаємо тимчасовий пароль до відповіді, якщо він був згенерований
        if (temporaryPassword) {
            response.data.temporaryPassword = temporaryPassword;
        }

        res.status(201).json(response);
    } catch (error) {
        next(error);
    }
};

/**
 * Вхід користувача
 */
exports.login = async (req, res, next) => {
    try {
        // Підтримуємо як 'login' (старий формат), так і 'email' (новий формат)
        const { login, email, password } = req.body;
        const loginValue = login || email; // Використовуємо login або email

        if (!loginValue || !password) {
            throw new AppError('Будь ласка, надайте email/username та пароль', 400);
        }

        // Пошук користувача (email або username)
        const user = await User.findOne({
            $or: [{ email: loginValue }, { username: loginValue }]
        }).select('+password +loginAttempts +lockUntil'); // Включаємо пароль та lockout поля

        if (!user) {
            // Однакова відповідь щоб не дати можливість розрізнити існування email
            throw new AppError('Невірний email/username або пароль', 401);
        }

        // 🔐 Перевірка account lockout
        if (user.lockUntil && user.lockUntil > new Date()) {
            const remainingMs = user.lockUntil - new Date();
            const remainingMin = Math.ceil(remainingMs / 60000);
            throw new AppError(
                `Акаунт тимчасово заблоковано через надмірну кількість невдалих спроб. Спробуйте через ${remainingMin} хв.`,
                429
            );
        }

        // Перевірка статусу акаунту
        if (!user.isActive) {
            throw new AppError('Акаунт заблоковано. Зверніться до адміністратора', 403);
        }

        // Перевірка пароля
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            // Збільшуємо лічильник невдалих спроб
            await user.incrementLoginAttempts();
            throw new AppError('Невірний email/username або пароль', 401);
        }

        // ✅ Успішний вхід - скидаємо лічильник
        await user.resetLoginAttempts();

        // Оновлення lastLogin (через updateOne щоб не запускати валідацію Mongoose)
        await user.constructor.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

        // Генерація токенів
        const tokenPayload = {
            id: user._id.toString(),
            email: user.email,
            role: user.role
        };
        const token = generateToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        // Відповідь без пароля
        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({
            success: true,
            message: 'Успішний вхід',
            data: {
                user: userResponse,
                token,
                refreshToken
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Отримання профілю поточного користувача
 */
exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            throw new AppError('Користувача не знайдено', 404);
        }

        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Оновлення профілю користувача
 */
exports.updateProfile = async (req, res, next) => {
    try {
        const allowedUpdates = ['firstName', 'lastName', 'phone', 'email'];
        const updates = {};

        // Фільтрація дозволених полів
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        // Перевірка унікальності email
        if (updates.email) {
            const existingUser = await User.findOne({
                email: updates.email,
                _id: { $ne: req.user.id }
            });

            if (existingUser) {
                throw new AppError('Email вже використовується', 400);
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            throw new AppError('Користувача не знайдено', 404);
        }

        res.json({
            success: true,
            message: 'Профіль оновлено',
            data: { user }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Зміна пароля
 */
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            throw new AppError('Надайте поточний та новий пароль', 400);
        }

        const user = await User.findById(req.user.id).select('+password');

        if (!user) {
            throw new AppError('Користувача не знайдено', 404);
        }

        // Перевірка поточного пароля
        const isPasswordValid = await user.comparePassword(currentPassword);
        if (!isPasswordValid) {
            throw new AppError('Невірний поточний пароль', 401);
        }

        // Оновлення пароля (автоматично хешується)
        user.password = newPassword;
        user.mustChangePassword = false; // Знімаємо примусовову після зміни
        user.tempPasswordHint = '';  // Очищаємо підказку пароля після зміни
        await user.save();

        res.json({
            success: true,
            message: 'Palavra-passe alterada com sucesso'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Отримання списку користувачів (тільки для admin)
 */
exports.getAllUsers = async (req, res, next) => {
    try {
        const { role, search, page = 1, limit = 20 } = req.query;

        const query = {};

        // Фільтр по ролі
        if (role) {
            query.role = role;
        }

        // Пошук по імені або email
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find(query)
                .select('-password')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            User.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Отримання користувача по ID (для admin)
 */
exports.getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            throw new AppError('Користувача не знайдено', 404);
        }

        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Оновлення ролі користувача (тільки admin)
 */
exports.updateUserRole = async (req, res, next) => {
    try {
        const { role } = req.body;

        if (!role) {
            throw new AppError('Надайте нову роль', 400);
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            throw new AppError('Користувача не знайдено', 404);
        }

        res.json({
            success: true,
            message: 'Роль користувача оновлено',
            data: { user }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Видалення користувача (тільки admin)
 */
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            throw new AppError('Користувача не знайдено', 404);
        }

        res.json({
            success: true,
            message: 'Користувача видалено'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Блокування/розблокування користувача (тільки admin)
 */
exports.toggleUserBan = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            throw new AppError('Користувача не знайдено', 404);
        }

        // Не можна забанити самого себе
        if (user._id.toString() === req.user.id) {
            throw new AppError('Не можна забанити самого себе', 400);
        }

        // Не можна забанити іншого адміна
        if (user.role === 'admin') {
            throw new AppError('Не можна забанити адміністратора', 400);
        }

        user.isActive = !user.isActive;
        await user.save();

        res.json({
            success: true,
            message: user.isActive ? 'Користувача розблоковано' : 'Користувача заблоковано',
            data: { user }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Запит на відновлення пароля
 */
exports.requestPasswordReset = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            throw new AppError('Надайте email', 400);
        }

        const user = await User.findOne({ email });

        if (!user) {
            // Не розкриваємо чи існує користувач (безпека)
            res.json({
                success: true,
                message: 'Якщо email існує, на нього буде відправлено інструкції'
            });
            return;
        }

        // Генеруємо reset token
        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.resetPasswordToken = resetTokenHash;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 хвилин
        await user.save();

        // Відправляємо email з токеном
        const emailService = require('../services/emailService');
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        
        try {
            await emailService.sendPasswordResetEmail(user.email, resetUrl, user.firstName);
        } catch (emailError) {
            console.error('Помилка відправки email:', emailError);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();
            throw new AppError('Помилка відправки email', 500);
        }

        res.json({
            success: true,
            message: 'Інструкції відправлено на email'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Скидання пароля за токеном
 */
exports.resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            throw new AppError('Надайте токен та новий пароль', 400);
        }

        const crypto = require('crypto');
        const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: resetTokenHash,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            throw new AppError('Токен недійсний або прострочений', 400);
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Пароль успішно змінено'
        });
    } catch (error) {
        next(error);
    }
};

