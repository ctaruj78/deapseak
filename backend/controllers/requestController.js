const { Request, Lift, User } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const emailService = require('../services/emailService');
const websocketService = require('../services/websocketService');

/**
 * Створення нового запиту
 */
exports.createRequest = async (req, res, next) => {
    try {
        const {
            lift,
            title,
            description,
            priority,
            photosBefore
        } = req.body;

        // Перевірка існування ліфта
        const liftExists = await Lift.findById(lift);
        if (!liftExists) {
            throw new AppError('Ліфт не знайдено', 404);
        }

        // Створення запиту
        const request = await Request.create({
            lift,
            client: req.user.id, // З токена автентифікації
            title,
            description,
            priority: priority || 'medium',
            photosBefore: photosBefore || []
        });

        await request.populate([
            { path: 'lift', select: 'municipalNumber address' },
            { path: 'client', select: 'firstName lastName email phone' }
        ]);

        // Відправити email клієнту
        if (request.client && request.client.email) {
            emailService.sendNewRequestNotification(request, request.client).catch(err => 
                console.error('Email send failed:', err)
            );
        }

        // WebSocket: Повідомити адміна та диспетчера
        websocketService.notifyNewRequest(request);

        res.status(201).json({
            success: true,
            message: 'Запит створено',
            data: { request }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Отримання всіх запитів з фільтрацією
 */
exports.getAllRequests = async (req, res, next) => {
    try {
        const {
            status,
            priority,
            lift,
            client,
            assignedTo,
            search,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const query = {};

        // Фільтри
        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (lift) query.lift = lift;
        if (client) query.client = client;
        if (assignedTo) query.assignedTo = assignedTo;

        // Пошук по заголовку або опису
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Фільтрація по ролі користувача
        if (req.user.role === 'client') {
            query.client = req.user.id;
        } else if (req.user.role === 'technician') {
            query.assignedTo = req.user.id;
        }

        const skip = (page - 1) * limit;
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        const [requests, total] = await Promise.all([
            Request.find(query)
                .populate('lift', 'municipalNumber address')
                .populate('client', 'firstName lastName email phone')
                .populate('assignedTo', 'firstName lastName email phone')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            Request.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                requests,
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
 * Отримання запиту по ID
 */
exports.getRequestById = async (req, res, next) => {
    try {
        const request = await Request.findById(req.params.id)
            .populate('lift', 'municipalNumber address technician')
            .populate('client', 'firstName lastName email phone')
            .populate('assignedTo', 'firstName lastName email phone')
            .populate('comments.user', 'firstName lastName');

        if (!request) {
            throw new AppError('Запит не знайдено', 404);
        }

        // Перевірка доступу (клієнт може бачити тільки свої запити)
        if (req.user.role === 'client' && request.client._id.toString() !== req.user.id) {
            throw new AppError('Доступ заборонено', 403);
        }

        res.json({
            success: true,
            data: { request }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Оновлення запиту
 */
exports.updateRequest = async (req, res, next) => {
    try {
        const allowedUpdates = ['title', 'description', 'priority'];
        const updates = {};

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const request = await Request.findById(req.params.id);

        if (!request) {
            throw new AppError('Запит не знайдено', 404);
        }

        // Перевірка прав (клієнт може редагувати тільки свої запити у статусі 'new')
        if (req.user.role === 'client') {
            if (request.client.toString() !== req.user.id) {
                throw new AppError('Доступ заборонено', 403);
            }
            if (request.status !== 'new') {
                throw new AppError('Можна редагувати тільки нові запити', 400);
            }
        }

        Object.assign(request, updates);
        await request.save();

        await request.populate([
            { path: 'lift', select: 'municipalNumber address' },
            { path: 'client', select: 'firstName lastName email phone' },
            { path: 'assignedTo', select: 'firstName lastName email phone' }
        ]);

        res.json({
            success: true,
            message: 'Запит оновлено',
            data: { request }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Призначення запиту техніку
 */
exports.assignRequest = async (req, res, next) => {
    try {
        const { technicianId } = req.body;

        if (!technicianId) {
            throw new AppError('Надайте ID техніка', 400);
        }

        // Перевірка техніка
        const technician = await User.findById(technicianId);
        if (!technician || technician.role !== 'technician') {
            throw new AppError('Невірний технік', 400);
        }

        const request = await Request.findById(req.params.id);

        if (!request) {
            throw new AppError('Запит не знайдено', 404);
        }

        await request.changeStatus('assigned', req.user.id);
        request.assignedTo = technicianId;
        await request.save();

        await request.populate([
            { path: 'lift', select: 'municipalNumber address' },
            { path: 'client', select: 'firstName lastName email phone' },
            { path: 'assignedTo', select: 'firstName lastName email phone' }
        ]);

        // Відправити email клієнту та техніку
        if (request.client && request.assignedTo) {
            emailService.sendTechnicianAssignedNotification(
                request, 
                request.assignedTo, 
                request.client
            ).catch(err => console.error('Email send failed:', err));
        }

        // WebSocket: Повідомити всіх
        websocketService.notifyRequestAssigned(request);

        res.json({
            success: true,
            message: 'Запит призначено техніку',
            data: { request }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Зміна статусу запиту
 */
exports.updateRequestStatus = async (req, res, next) => {
    try {
        const { status } = req.body;

        if (!status) {
            throw new AppError('Надайте новий статус', 400);
        }

        const request = await Request.findById(req.params.id);

        if (!request) {
            throw new AppError('Запит не знайдено', 404);
        }

        // Перевірка прав
        if (req.user.role === 'technician' && request.assignedTo?.toString() !== req.user.id) {
            throw new AppError('Цей запит призначено іншому техніку', 403);
        }

        const oldStatus = request.status;
        await request.changeStatus(status, req.user.id);
        await request.save();

        await request.populate([
            { path: 'lift', select: 'municipalNumber address' },
            { path: 'client', select: 'firstName lastName email phone' },
            { path: 'assignedTo', select: 'firstName lastName email phone' }
        ]);

        // Відправити email про зміну статусу
        if (request.client && request.client.email && oldStatus !== status) {
            emailService.sendStatusChangeNotification(
                request, 
                request.client, 
                oldStatus, 
                status
            ).catch(err => console.error('Email send failed:', err));
        }

        // WebSocket: Повідомити всіх про зміну статусу
        websocketService.notifyStatusChange(request, oldStatus, status);

        res.json({
            success: true,
            message: 'Статус запиту оновлено',
            data: { request }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Додавання коментаря до запиту
 */
exports.addComment = async (req, res, next) => {
    try {
        const { text } = req.body;

        if (!text) {
            throw new AppError('Надайте текст коментаря', 400);
        }

        const request = await Request.findById(req.params.id);

        if (!request) {
            throw new AppError('Запит не знайдено', 404);
        }

        await request.addComment(req.user.id, text);
        await request.save();

        await request.populate([
            { path: 'lift', select: 'municipalNumber address' },
            { path: 'client', select: 'firstName lastName email phone' },
            { path: 'assignedTo', select: 'firstName lastName email phone' },
            { path: 'comments.user', select: 'firstName lastName' }
        ]);

        res.json({
            success: true,
            message: 'Коментар додано',
            data: { request }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Додавання фото до запиту
 */
exports.addPhotos = async (req, res, next) => {
    try {
        const { photos, type } = req.body; // type: 'before' або 'after'

        if (!photos || !Array.isArray(photos) || photos.length === 0) {
            throw new AppError('Надайте масив фото', 400);
        }

        const request = await Request.findById(req.params.id);

        if (!request) {
            throw new AppError('Запит не знайдено', 404);
        }

        if (type === 'before') {
            request.photosBefore.push(...photos);
        } else if (type === 'after') {
            request.photosAfter.push(...photos);
        } else {
            throw new AppError('Невірний тип фото (before/after)', 400);
        }

        await request.save();

        res.json({
            success: true,
            message: 'Фото додано',
            data: { request }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Оновлення деталей роботи
 */
exports.updateWorkDetails = async (req, res, next) => {
    try {
        const { workDescription, partsUsed, laborHours } = req.body;

        const request = await Request.findById(req.params.id);

        if (!request) {
            throw new AppError('Запит не знайдено', 404);
        }

        // Тільки призначений технік може оновлювати деталі роботи
        if (req.user.role === 'technician' && request.assignedTo?.toString() !== req.user.id) {
            throw new AppError('Доступ заборонено', 403);
        }

        if (workDescription) request.workDescription = workDescription;
        if (partsUsed) request.partsUsed = partsUsed;
        if (laborHours !== undefined) request.laborHours = laborHours;

        await request.save();

        res.json({
            success: true,
            message: 'Деталі роботи оновлено',
            data: { request }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Завершення запиту
 */
exports.completeRequest = async (req, res, next) => {
    try {
        const { workDescription, partsUsed, laborHours, photosAfter } = req.body;

        const request = await Request.findById(req.params.id);

        if (!request) {
            throw new AppError('Запит не знайдено', 404);
        }

        // Тільки призначений технік може завершити запит
        if (req.user.role === 'technician' && request.assignedTo?.toString() !== req.user.id) {
            throw new AppError('Доступ заборонено', 403);
        }

        // Оновлення деталей роботи
        if (workDescription) request.workDescription = workDescription;
        if (partsUsed) request.partsUsed = partsUsed;
        if (laborHours !== undefined) request.laborHours = laborHours;
        if (photosAfter) request.photosAfter = photosAfter;

        request.completedAt = new Date();
        await request.changeStatus('completed', req.user.id);
        await request.save();

        await request.populate([
            { path: 'lift', select: 'municipalNumber address' },
            { path: 'client', select: 'firstName lastName email phone' },
            { path: 'assignedTo', select: 'firstName lastName email phone' }
        ]);

        // Відправити email клієнту про завершення
        if (request.client && request.client.email) {
            emailService.sendRequestCompletedNotification(
                request, 
                request.client
            ).catch(err => console.error('Email send failed:', err));
        }

        // WebSocket: Повідомити всіх про завершення
        websocketService.notifyRequestCompleted(request);

        res.json({
            success: true,
            message: 'Запит завершено',
            data: { request }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Скасування запиту
 */
exports.cancelRequest = async (req, res, next) => {
    try {
        const { reason } = req.body;

        const request = await Request.findById(req.params.id);

        if (!request) {
            throw new AppError('Запит не знайдено', 404);
        }

        // Клієнт може скасувати тільки свій запит
        if (req.user.role === 'client' && request.client.toString() !== req.user.id) {
            throw new AppError('Доступ заборонено', 403);
        }

        await request.changeStatus('cancelled', req.user.id);

        if (reason) {
            await request.addComment(req.user.id, `Причина скасування: ${reason}`);
        }

        await request.save();

        res.json({
            success: true,
            message: 'Запит скасовано',
            data: { request }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Видалення запиту (тільки admin)
 */
exports.deleteRequest = async (req, res, next) => {
    try {
        const request = await Request.findByIdAndDelete(req.params.id);

        if (!request) {
            throw new AppError('Запит не знайдено', 404);
        }

        res.json({
            success: true,
            message: 'Запит видалено'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Отримання статистики по запитах
 */
exports.getRequestsStats = async (req, res, next) => {
    try {
        const [
            total,
            byStatus,
            byPriority,
            avgCompletionTime
        ] = await Promise.all([
            Request.countDocuments(),
            Request.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Request.aggregate([
                { $group: { _id: '$priority', count: { $sum: 1 } } }
            ]),
            Request.aggregate([
                { $match: { status: 'completed', completedAt: { $exists: true } } },
                {
                    $project: {
                        duration: { $subtract: ['$completedAt', '$createdAt'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgDuration: { $avg: '$duration' }
                    }
                }
            ])
        ]);

        res.json({
            success: true,
            data: {
                total,
                byStatus: byStatus.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                byPriority: byPriority.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                avgCompletionTimeMs: avgCompletionTime[0]?.avgDuration || 0,
                avgCompletionTimeHours: avgCompletionTime[0]?.avgDuration 
                    ? Math.round(avgCompletionTime[0].avgDuration / (1000 * 60 * 60)) 
                    : 0
            }
        });
    } catch (error) {
        next(error);
    }
};
