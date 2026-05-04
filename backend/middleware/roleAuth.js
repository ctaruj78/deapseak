// ============================================
// ROLE AUTHORIZATION MIDDLEWARE
// ============================================

const { AppError } = require('./errorHandler');

// Перевірка ролей користувача
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError('Utilizador não autenticado', 401));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(
                new AppError(
                    `Acesso negado. Papel necessário: ${allowedRoles.join(' ou ')}`,
                    403
                )
            );
        }

        next();
    };
};

// Специфічні перевірки ролей
const isAdmin = authorizeRoles('admin');
const isAdminOrDispatcher = authorizeRoles('admin', 'dispatcher');
const isTechnician = authorizeRoles('technician');
const isClient = authorizeRoles('client');

// Перевірка власності ресурсу
const isOwnerOrAdmin = (resourceUserId) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError('Utilizador não autenticado', 401));
        }

        const isOwner = req.user.userId === resourceUserId || req.user.id === resourceUserId;
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return next(
                new AppError('Não tem acesso a este recurso', 403)
            );
        }

        next();
    };
};

// Фільтрація даних за роллю
const filterDataByRole = (data, user) => {
    switch (user.role) {
        case 'admin':
        case 'dispatcher':
            // Повний доступ
            return data;

        case 'technician':
            // Технік бачить тільки призначені йому заявки
            if (Array.isArray(data)) {
                return data.filter(item => 
                    item.assignedTo === user.id || 
                    item.assignedTo === user.email ||
                    item.technicianId === user.id
                );
            }
            return data;

        case 'client':
            // Клієнт бачить тільки свої заявки
            if (Array.isArray(data)) {
                return data.filter(item => 
                    item.clientId === user.id || 
                    item.client === user.email ||
                    item.userId === user.id
                );
            }
            return data;

        default:
            return [];
    }
};

module.exports = {
    authorizeRoles,
    isAdmin,
    isAdminOrDispatcher,
    isTechnician,
    isClient,
    isOwnerOrAdmin,
    filterDataByRole
};
