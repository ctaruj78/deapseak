const { User } = require('../models');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');
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
            throw new AppError('Користувач з таким email ou username вже існує', 400);
        }

        // 🔐 SECURITY: публічна реєстрація ЗАВЖДИ створює клієнта.
        // Роль можна змінити тільки адміністратором через /api/auth/users/:id/role
        const user = await User.create({
            username,
            email,
            password,
            firstName,
            lastName,
            phone,
            role: 'client' // SEMPRE client — papel atribuído apenas pelo administrador
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
                ? 'Utilizador criado. Palavra-passe temporária enviada na resposta.' 
                : 'Utilizador registado com sucesso',
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
        const loginValue = login || email;

        // Захист від NoSQL injection — поля мають бути рядками
        if (typeof loginValue !== 'string' || typeof password !== 'string') {
            throw new AppError('Por favor, forneça email/username e palavra-passe', 400);
        }

        if (!loginValue || !password) {
            throw new AppError('Por favor, forneça email/username e palavra-passe', 400);
        }

        // Пошук користувача (email ou username)
        const user = await User.findOne({
            $or: [{ email: loginValue }, { username: loginValue }]
        }).select('+password +loginAttempts +lockUntil'); // Включаємо пароль та lockout поля

        if (!user) {
            // Однакова відповідь щоб не дати можливість розрізнити існування email
            throw new AppError('Email ou palavra-passe incorretos', 401);
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

        // Перевірка статусу акаунту (явно false — старі записи без поля не блокуємо)
        if (user.isActive === false) {
            throw new AppError('Акаунт заблоковано. Зверніться до адміністратора', 403);
        }

        // Перевірка пароля
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            // Збільшуємо лічильник невдалих спроб
            await user.incrementLoginAttempts();
            throw new AppError('Email ou palavra-passe incorretos', 401);
        }

        // ✅ Login efetuado com sucesso - скидаємо лічильник
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
        // rememberMe = true → refresh token живе 365 днів (не треба логінитися цілий рік)
        const rememberMe = req.body.rememberMe === true;
        const refreshToken = generateRefreshToken(tokenPayload, rememberMe ? '365d' : '30d');

        // Відповідь без пароля
        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({
            success: true,
            message: 'Login efetuado com sucesso',
            data: {
                user: userResponse,
                token,
                refreshToken,
                mustChangePassword: !!user.mustChangePassword
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
            throw new AppError('Utilizador não encontrado', 404);
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
            throw new AppError('Utilizador não encontrado', 404);
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
            throw new AppError('Utilizador não encontrado', 404);
        }

        // Перевірка поточного пароля
        const isPasswordValid = await user.comparePassword(currentPassword);
        if (!isPasswordValid) {
            throw new AppError('Palavra-passe atual incorreta', 401);
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

        // Пошук по імені ou email
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
            throw new AppError('Utilizador não encontrado', 404);
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
            throw new AppError('Utilizador não encontrado', 404);
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
            throw new AppError('Utilizador não encontrado', 404);
        }

        res.json({
            success: true,
            message: 'Utilizador eliminado'
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
            throw new AppError('Utilizador não encontrado', 404);
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
            message: user.isActive ? 'Utilizador desbloqueado' : 'Utilizador bloqueado',
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
            console.error('Erro ao enviar email:', emailError);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();
            throw new AppError('Erro ao enviar email', 500);
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
            throw new AppError('Token inválido ou expirado', 400);
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
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
 * Оновлення access token через refresh token
 * POST /api/auth/refresh
 */
exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Refresh token não fornecido' });
        }

        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch (e) {
            return res.status(403).json({ success: false, message: 'Refresh token недійсний ou прострочений. Будь ласка, увійдіть знову.' });
        }

        // Перевіряємо чи користувач ще існує і активний (явно false — не блокуємо undefined)
        const user = await User.findById(decoded.id).select('-password');
        if (!user || user.isActive === false) {
            return res.status(403).json({ success: false, message: 'Utilizador não encontrado ou bloqueado' });
        }

        // Генеруємо новий access token (7 днів)
        const tokenPayload = { id: user._id.toString(), email: user.email, role: user.role };
        const newToken = generateToken(tokenPayload);
        const newRefreshToken = generateRefreshToken(tokenPayload);

        res.json({
            success: true,
            message: 'Token оновлено',
            data: { token: newToken, refreshToken: newRefreshToken }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Створення користувача адміністратором (POST /api/auth/users)
 * - генерує тимчасовий пароль якщо не переданий
 * - встановлює mustChangePassword=true
 * - надсилає welcome email клієнту
 */
exports.adminCreateUser = async (req, res, next) => {
    try {
        const { username, email, password, firstName, lastName, phone, role = 'client' } = req.body;

        if (!email || !firstName || !lastName) {
            throw new AppError('email, firstName та lastName є обов\'язковими', 400);
        }

        // Генерація username якщо не переданий
        const resolvedUsername = username || email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_') + '_' + Date.now().toString().slice(-4);

        // Перевірка унікальності
        const existing = await User.findOne({ $or: [{ email }, { username: resolvedUsername }] });
        if (existing) {
            throw new AppError('Користувач з таким email ou username вже існує', 400);
        }

        // Якщо пароль не передано — генеруємо тимчасовий
        let isTemporary = false;
        let resolvedPassword = password;
        if (!resolvedPassword) {
            resolvedPassword = generateTemporaryPassword();
            isTemporary = true;
        }

        const user = await User.create({
            username: resolvedUsername,
            email,
            password: resolvedPassword,
            firstName,
            lastName,
            phone,
            role,
            isActive: true,
            mustChangePassword: isTemporary // примусова зміна тільки якщо пароль авто-згенерований
        });

        // Надсилаємо welcome email
        try {
            const emailService = require('../services/emailService');
            await emailService.sendWelcomeClientEmail(user, resolvedPassword);
        } catch (emailErr) {
            console.warn('⚠️  Welcome email не відправлено:', emailErr.message);
            // Не блокуємо відповідь — користувач вже створений
        }

        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: 'Користувача створено' + (isTemporary ? '. Тимчасовий пароль відправлено на email.' : ''),
            data: {
                user: userResponse,
                ...(isTemporary && { temporaryPassword: resolvedPassword })
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Скидання пароля клієнта адміністратором (POST /api/auth/users/:id/reset-password)
 * - генерує новий тимчасовий пароль
 * - надсилає email клієнту
 */
exports.adminResetUserPassword = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) throw new AppError('Utilizador não encontrado', 404);

        const newPassword = generateTemporaryPassword();
        user.password = newPassword;
        user.mustChangePassword = true;
        user.loginAttempts = 0;
        user.lockUntil = null;
        user.isActive = true;
        // validateModifiedOnly: не валідувати поля, які не змінюємо — старі записи
        // клієнтів можуть мати порожній lastName і інакше .save() падав на них
        await user.save({ validateModifiedOnly: true });

        // Надсилаємо email
        try {
            const emailService = require('../services/emailService');
            await emailService.sendWelcomeClientEmail(user, newPassword);
        } catch (emailErr) {
            console.warn('⚠️  Reset email не відправлено:', emailErr.message);
        }

        res.json({
            success: true,
            message: 'Пароль скинуто. Тимчасовий пароль відправлено на email.',
            data: { temporaryPassword: newPassword }
        });
    } catch (error) {
        next(error);
    }
};

// Оновлення даних користувача (admin/dispatcher)
exports.updateUserById = async (req, res, next) => {
    try {
        const allowedFields = [
            'firstName', 'lastName', 'companyName', 'phone', 'email',
            'clientType', 'priority', 'status', 'address',
            'contactPerson', 'contactPosition', 'contractInfo', 'notes'
        ];
        const updates = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).select('-password -refreshToken -resetPasswordToken');

        if (!user) {
            return res.status(404).json({ success: false, message: 'Utilizador não encontrado' });
        }

        res.json({ success: true, message: 'Дані клієнта оновлено', data: { user } });
    } catch (error) {
        next(error);
    }
};
