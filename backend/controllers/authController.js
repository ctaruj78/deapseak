const { User } = require('../models');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

/**
 * Реєстрація нового користувача
 */
exports.register = async (req, res, next) => {
    try {
        const { username, email, password, firstName, lastName, phone, role } = req.body;

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

        res.status(201).json({
            success: true,
            message: 'Користувача успішно зареєстровано',
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
 * Вхід користувача
 */
exports.login = async (req, res, next) => {
    try {
        const { login, password } = req.body; // login може бути email або username

        if (!login || !password) {
            throw new AppError('Будь ласка, надайте email/username та пароль', 400);
        }

        // Пошук користувача (email або username)
        const user = await User.findOne({
            $or: [{ email: login }, { username: login }]
        }).select('+password'); // Явно включаємо пароль

        if (!user) {
            throw new AppError('Невірний email/username або пароль', 401);
        }

        // Перевірка пароля
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw new AppError('Невірний email/username або пароль', 401);
        }

        // Оновлення lastLogin
        user.lastLogin = new Date();
        await user.save();

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
        await user.save();

        res.json({
            success: true,
            message: 'Пароль успішно змінено'
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
