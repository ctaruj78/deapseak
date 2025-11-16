const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

/**
 * Settings Controller
 * Управління налаштуваннями користувачів
 */

// Отримати налаштування поточного користувача
exports.getUserSettings = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('settings');
        
        if (!user) {
            return next(new AppError('Користувача не знайдено', 404));
        }

        // Якщо налаштувань немає, створюємо дефолтні
        if (!user.settings) {
            user.settings = getDefaultSettings();
            await user.save();
        }

        res.json({
            success: true,
            settings: user.settings
        });
    } catch (error) {
        next(error);
    }
};

// Оновити налаштування користувача
exports.updateUserSettings = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return next(new AppError('Користувача не знайдено', 404));
        }

        // Об'єднуємо існуючі налаштування з новими
        user.settings = {
            ...user.settings,
            ...req.body,
            updatedAt: new Date()
        };

        await user.save();

        res.json({
            success: true,
            message: 'Налаштування оновлено',
            settings: user.settings
        });
    } catch (error) {
        next(error);
    }
};

// Скинути налаштування до дефолтних
exports.resetSettings = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return next(new AppError('Користувача не знайдено', 404));
        }

        user.settings = getDefaultSettings();
        await user.save();

        res.json({
            success: true,
            message: 'Налаштування скинуто до стандартних',
            settings: user.settings
        });
    } catch (error) {
        next(error);
    }
};

// Оновити мову інтерфейсу
exports.updateLanguage = async (req, res, next) => {
    try {
        const { language } = req.body;
        
        if (!['uk', 'en', 'pt'].includes(language)) {
            return next(new AppError('Непідтримувана мова', 400));
        }

        const user = await User.findById(req.user.id);
        
        if (!user) {
            return next(new AppError('Користувача не знайдено', 404));
        }

        if (!user.settings) {
            user.settings = getDefaultSettings();
        }

        user.settings.language = language;
        await user.save();

        res.json({
            success: true,
            message: 'Мову змінено',
            language
        });
    } catch (error) {
        next(error);
    }
};

// Оновити тему інтерфейсу
exports.updateTheme = async (req, res, next) => {
    try {
        const { theme } = req.body;
        
        if (!['light', 'dark', 'auto'].includes(theme)) {
            return next(new AppError('Непідтримувана тема', 400));
        }

        const user = await User.findById(req.user.id);
        
        if (!user) {
            return next(new AppError('Користувача не знайдено', 404));
        }

        if (!user.settings) {
            user.settings = getDefaultSettings();
        }

        user.settings.theme = theme;
        await user.save();

        res.json({
            success: true,
            message: 'Тему змінено',
            theme
        });
    } catch (error) {
        next(error);
    }
};

// Оновити налаштування сповіщень
exports.updateNotifications = async (req, res, next) => {
    try {
        const { notifications } = req.body;
        
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return next(new AppError('Користувача не знайдено', 404));
        }

        if (!user.settings) {
            user.settings = getDefaultSettings();
        }

        user.settings.notifications = {
            ...user.settings.notifications,
            ...notifications
        };
        
        await user.save();

        res.json({
            success: true,
            message: 'Налаштування сповіщень оновлено',
            notifications: user.settings.notifications
        });
    } catch (error) {
        next(error);
    }
};

// Функція для отримання дефолтних налаштувань
function getDefaultSettings() {
    return {
        language: 'uk',
        theme: 'light',
        notifications: {
            email: true,
            push: true,
            sms: false,
            newRequest: true,
            statusChange: true,
            assignment: true,
            reminders: true
        },
        privacy: {
            showEmail: false,
            showPhone: false,
            allowAnalytics: true
        },
        display: {
            itemsPerPage: 20,
            dateFormat: 'DD.MM.YYYY',
            timeFormat: '24h',
            timezone: 'Europe/Kiev'
        },
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

module.exports = exports;
