const mongoose = require('mongoose');
const { Request, Lift, User } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const emailService = require('../services/emailService');
const websocketService = require('../services/websocketService');
const exportService = require('../services/exportService');

/**
 * Збагачує старий формат заявок (liftId/technician/createdBy) даними клієнта та ліфта.
 * Нові заявки (де client вже populated) залишаються без змін.
 */
async function enrichOldFormatRequests(requests) {
    // Збираємо унікальні liftId для старого формату (де client не populated)
    const oldFormatIds = [];
    requests.forEach(r => {
        const raw = r._doc || r;
        if (!r.client && raw.liftId && mongoose.Types.ObjectId.isValid(String(raw.liftId))) {
            oldFormatIds.push(new mongoose.Types.ObjectId(String(raw.liftId)));
        }
    });

    let liftMap = {};
    if (oldFormatIds.length > 0) {
        const lifts = await Lift.find({ _id: { $in: oldFormatIds } })
            .populate('client', 'firstName lastName email phone')
            .select('clientName clientEmail clientPhone client municipalNumber address');
        lifts.forEach(l => { liftMap[String(l._id)] = l; });
    }

    // Збираємо унікальні emails ліфтів для пошуку юзерів по email як fallback
    const emailsToLookup = new Set();
    Object.values(liftMap).forEach(l => {
        if ((!l.client || !l.client.email) && l.clientEmail) {
            emailsToLookup.add(l.clientEmail.toLowerCase());
        }
    });
    let userByEmailMap = {};
    if (emailsToLookup.size > 0) {
        const usersFound = await User.find({ email: { $in: Array.from(emailsToLookup) } })
            .select('firstName lastName email phone');
        usersFound.forEach(u => { userByEmailMap[u.email.toLowerCase()] = u; });
    }

    return requests.map(r => {
        const raw = r._doc || r;
        // Якщо client вже populated — повертаємо як є (новий формат)
        if (r.client && (r.client.firstName || r.client.email)) return r;

        const liftId = raw.liftId ? String(raw.liftId) : null;
        const liftDoc = liftId ? liftMap[liftId] : null;

        let clientData = null;
        if (liftDoc) {
            if (liftDoc.client && (liftDoc.client.firstName || liftDoc.client.email)) {
                // populate успішний — є User з даними
                clientData = liftDoc.client;
            } else if (liftDoc.clientEmail) {
                // Шукаємо User по email (для видалених/переіменованих)
                const foundUser = userByEmailMap[liftDoc.clientEmail.toLowerCase()];
                if (foundUser) {
                    clientData = foundUser;
                } else {
                    // Використовуємо прямі поля ліфта
                    clientData = {
                        firstName: liftDoc.clientName || '',
                        lastName: '',
                        email: liftDoc.clientEmail,
                        phone: liftDoc.clientPhone || ''
                    };
                }
            } else if (liftDoc.clientName) {
                clientData = {
                    firstName: liftDoc.clientName,
                    lastName: '',
                    email: '',
                    phone: liftDoc.clientPhone || ''
                };
            }
        }

        // Перетворюємо на plain object і додаємо збагачені поля
        const plain = r.toObject ? r.toObject() : { ...raw };
        if (clientData) plain.client = clientData;

        // Заповнюємо lift з маппу якщо відсутній
        if (!plain.lift && liftDoc) {
            plain.lift = {
                _id: liftDoc._id,
                municipalNumber: liftDoc.municipalNumber,
                address: liftDoc.address
            };
        }

        // Техніка з old-format: technicianName
        if (!plain.assignedTo && raw.technicianName) {
            plain.assignedTo = { firstName: raw.technicianName, lastName: '', email: '', phone: '' };
        }

        return plain;
    });
}

/**
 * Створення нового запиту
 */
exports.createRequest = async (req, res, next) => {
    try {
        const {
            lift: liftFromBody,
            liftId: liftIdFromBody,       // compatibilidade com frontend (campo legacy)
            title,
            description,
            priority,
            photosBefore,
            client: clientFromBody,
            assignedTo,
            scheduledDate,
            type
        } = req.body;

        const lift = liftFromBody || liftIdFromBody;

        // Cliente: адмін/диспетчер може вказати довільного клієнта, клієнт — тільки себе
        const clientId = (['admin', 'dispatcher'].includes(req.user.role) && clientFromBody)
            ? clientFromBody
            : req.user.id;

        // Перевірка існування ліфта
        const liftExists = await Lift.findById(lift);
        if (!liftExists) {
            throw new AppError('Elevador não encontrado', 404);
        }

        // Створення запиту
        const requestData = {
            lift,
            client: clientId,
            title: title || description?.substring(0, 60) || 'Novo pedido',
            description,
            priority: priority || 'medium',
            photosBefore: photosBefore || []
        };
        if (type) requestData.type = type;
        if (assignedTo) requestData.assignedTo = assignedTo;
        if (scheduledDate) requestData.scheduledDate = scheduledDate;

        const request = await Request.create(requestData);

        // Se o pedido já nasce atribuído a um técnico, a carga dele tem de
        // refletir isso — sem isto, assignRequest() era o único sítio a
        // incrementar currentAssignments e um pedido criado já atribuído
        // nunca contava para o limite de trabalho do técnico.
        if (assignedTo) {
            const assignedTechnician = await User.findById(assignedTo);
            if (assignedTechnician && assignedTechnician.role === 'technician') {
                assignedTechnician.currentAssignments = (assignedTechnician.currentAssignments || 0) + 1;
                if (!['offline', 'vacation'].includes(assignedTechnician.status)) {
                    assignedTechnician.status = assignedTechnician.currentAssignments >= assignedTechnician.maxAssignments ? 'busy' : 'online';
                }
                await assignedTechnician.save();
            }
        }

        await request.populate([
            { path: 'lift', select: 'municipalNumber address' },
            { path: 'client', select: 'firstName lastName email phone' },
            { path: 'assignedTo', select: 'firstName lastName email phone' }
        ]);

        // Email клієнту: підтвердження отримання
        if (request.client && request.client.email) {
            emailService.sendNewRequestNotification(request, request.client).catch(err =>
                console.error('Client email send failed:', err)
            );
        }

        // Email адміну/диспетчеру: внутрішнє сповіщення про новий педіdo
        emailService.sendNewRequestInternalNotification(request, request.client).catch(err =>
            console.error('Internal notification send failed:', err)
        );

        // WebSocket: Повідомити адміна та диспетчера (in-app)
        websocketService.notifyNewRequest(request);

        res.status(201).json({
            success: true,
            message: 'Pedido criado',
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

        // Пошук по заголовку ou опису
        if (search) {
            const safeSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or = [
                { title: { $regex: safeSearch, $options: 'i' } },
                { description: { $regex: safeSearch, $options: 'i' } }
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
                .populate('lift', 'municipalNumber address clientName clientEmail clientPhone client')
                .populate('client', 'firstName lastName email phone')
                .populate('assignedTo', 'firstName lastName email phone')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            Request.countDocuments(query)
        ]);

        // Збагачуємо старий формат заявок даними клієнта з ліфта
        const enrichedRequests = await enrichOldFormatRequests(requests);

        res.json({
            success: true,
            data: {
                requests: enrichedRequests,
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
            .populate('lift', 'municipalNumber address technician clientName clientEmail clientPhone client')
            .populate('client', 'firstName lastName email phone')
            .populate('assignedTo', 'firstName lastName email phone')
            .populate('comments.user', 'firstName lastName');

        if (!request) {
            throw new AppError('Pedido não encontrado', 404);
        }

        // Клієнт може бачити тільки свої запити — перевіряємо всі можливі поля
        if (req.user.role === 'client') {
            const clientId = request.client?._id?.toString() || request.client?.toString();
            const liftClientEmail = request.lift?.clientEmail;
            const liftClientId = request.lift?.client?.toString();
            const isOwner =
                clientId === req.user.id ||
                request.clientEmail === req.user.email ||
                liftClientEmail === req.user.email ||
                liftClientId === req.user.id;
            if (!isOwner) throw new AppError('Acesso negado', 403);
        }

        const [enriched] = await enrichOldFormatRequests([request]);

        res.json({
            success: true,
            data: { request: enriched }
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
            throw new AppError('Pedido não encontrado', 404);
        }

        // Перевірка прав (клієнт може редагувати тільки свої запити у статусі 'new')
        if (req.user.role === 'client') {
            if (request.client.toString() !== req.user.id) {
                throw new AppError('Acesso negado', 403);
            }
            if (request.status !== 'new') {
                throw new AppError('Só é possível editar pedidos novos', 400);
            }
        }

        // Técnico só pode editar pedidos que lhe estão atribuídos
        if (req.user.role === 'technician' && request.assignedTo?.toString() !== req.user.id) {
            throw new AppError('Acesso negado. Este pedido não está atribuído a si.', 403);
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
            message: 'Pedido atualizado',
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
            throw new AppError('Técnico inválido', 400);
        }

        // Перевірка навантаження техніка
        if (technician.currentAssignments >= technician.maxAssignments) {
            throw new AppError('Технік досяг максимального навантаження. Оберіть іншого техніка', 400);
        }

        const request = await Request.findById(req.params.id);

        if (!request) {
            throw new AppError('Pedido não encontrado', 404);
        }

        const previousTechnicianId = request.assignedTo ? request.assignedTo.toString() : null;
        const isSameTechnician = previousTechnicianId === technicianId.toString();

        await request.changeStatus('assigned', req.user.id);
        request.assignedTo = technicianId;
        await request.save();

        // Liberta a carga do técnico anterior (reatribuição) — sem isto, um
        // técnico reatribuído ficava com currentAssignments inflado para
        // sempre, até recusar trabalho novo estando na realidade livre.
        if (previousTechnicianId && !isSameTechnician) {
            const previousTechnician = await User.findById(previousTechnicianId);
            if (previousTechnician && previousTechnician.currentAssignments > 0) {
                previousTechnician.currentAssignments -= 1;
                if (!['offline', 'vacation'].includes(previousTechnician.status)) {
                    previousTechnician.status = previousTechnician.currentAssignments >= previousTechnician.maxAssignments ? 'busy' : 'online';
                }
                await previousTechnician.save();
            }
        }

        // Só incrementa a carga do novo técnico se for de facto uma atribuição
        // nova — repetir a mesma atribuição não deve contar duas vezes.
        if (!isSameTechnician) {
            technician.currentAssignments += 1;
            // Não força o estado de um técnico offline/de férias para online —
            // só ajusta o estado de quem já estava disponível.
            if (!['offline', 'vacation'].includes(technician.status)) {
                technician.status = technician.currentAssignments >= technician.maxAssignments ? 'busy' : 'online';
            }
            await technician.save();
        }

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
            throw new AppError('Pedido não encontrado', 404);
        }

        // Перевірка прав
        if (req.user.role === 'technician' && request.assignedTo?.toString() !== req.user.id) {
            throw new AppError('Цей запит призначено іншому техніку', 403);
        }

        // Клієнт може змінювати статус тільки своїх запитів, і тільки скасовувати їх —
        // призначення/виконання запиту належить диспетчеру/техніку
        if (req.user.role === 'client') {
            if (request.client?.toString() !== req.user.id) {
                throw new AppError('Acesso negado', 403);
            }
            if (status !== 'cancelled') {
                throw new AppError('Clientes só podem cancelar os seus próprios pedidos', 403);
            }
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
            throw new AppError('Pedido não encontrado', 404);
        }

        // Cliente só pode comentar nos seus próprios pedidos; técnico só nos que lhe
        // estão atribuídos — admin/dispatcher sem restrição
        if (req.user.role === 'client' && request.client?.toString() !== req.user.id) {
            throw new AppError('Acesso negado', 403);
        }
        if (req.user.role === 'technician' && request.assignedTo?.toString() !== req.user.id) {
            throw new AppError('Acesso negado', 403);
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
        const { photos, type } = req.body; // type: 'before' ou 'after'

        if (!photos || !Array.isArray(photos) || photos.length === 0) {
            throw new AppError('Надайте масив фото', 400);
        }

        const request = await Request.findById(req.params.id);

        if (!request) {
            throw new AppError('Pedido não encontrado', 404);
        }

        // Cliente só pode adicionar fotos nos seus próprios pedidos; técnico só nos que lhe
        // estão atribuídos — admin/dispatcher sem restrição
        if (req.user.role === 'client' && request.client?.toString() !== req.user.id) {
            throw new AppError('Acesso negado', 403);
        }
        if (req.user.role === 'technician' && request.assignedTo?.toString() !== req.user.id) {
            throw new AppError('Acesso negado', 403);
        }

        if (type === 'before') {
            request.photosBefore.push(...photos);
        } else if (type === 'after') {
            request.photosAfter.push(...photos);
        } else {
            throw new AppError('Tipo de foto inválido (before/after)', 400);
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
            throw new AppError('Pedido não encontrado', 404);
        }

        // Тільки призначений технік може оновлювати деталі роботи
        if (req.user.role === 'technician' && request.assignedTo?.toString() !== req.user.id) {
            throw new AppError('Acesso negado', 403);
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
            throw new AppError('Pedido não encontrado', 404);
        }

        // Тільки призначений технік може завершити запит
        if (req.user.role === 'technician' && request.assignedTo?.toString() !== req.user.id) {
            throw new AppError('Acesso negado', 403);
        }

        // Um pedido já completado não pode ser completado outra vez — sem isto,
        // um duplo-clique ou reenvio de rede decrementava a carga do técnico
        // duas vezes por um único trabalho.
        if (request.status === 'completed') {
            throw new AppError('Este pedido já foi concluído', 400);
        }

        // Зменшити навантаження техніка
        if (request.assignedTo) {
            const technician = await User.findById(request.assignedTo);
            if (technician && technician.currentAssignments > 0) {
                technician.currentAssignments -= 1;
                // Оновити статус техніка
                if (technician.currentAssignments < technician.maxAssignments && !['offline', 'vacation'].includes(technician.status)) {
                    technician.status = 'online';
                }
                await technician.save();
            }
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
            throw new AppError('Pedido não encontrado', 404);
        }

        // Клієнт може скасувати тільки свій запит
        if (req.user.role === 'client' && request.client.toString() !== req.user.id) {
            throw new AppError('Acesso negado', 403);
        }

        // Технік може скасувати тільки призначений йому запит
        if (req.user.role === 'technician' && request.assignedTo?.toString() !== req.user.id) {
            throw new AppError('Acesso negado', 403);
        }

        // Зменшити навантаження техніка при скасуванні призначеного запиту
        if (request.assignedTo && (request.status === 'assigned' || request.status === 'in_progress')) {
            const technician = await User.findById(request.assignedTo);
            if (technician && technician.currentAssignments > 0) {
                technician.currentAssignments -= 1;
                // Оновити статус техніка
                if (technician.currentAssignments < technician.maxAssignments && !['offline', 'vacation'].includes(technician.status)) {
                    technician.status = 'online';
                }
                await technician.save();
            }
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
 * Оцінка виконаної роботи техніка клієнтом
 */
exports.submitFeedback = async (req, res, next) => {
    try {
        const { rating, comment } = req.body;
        // Strip ObjectId('...') wrapper if client sends stringified ObjectId
        const rawId = req.params.id;
        const requestId = /^ObjectId\('([a-f0-9]{24})'\)$/i.test(rawId)
            ? rawId.match(/([a-f0-9]{24})/i)[1]
            : rawId;

        const request = await Request.findById(requestId)
            .populate('client', 'firstName lastName email')
            .populate('assignedTo', 'firstName lastName email');

        if (!request) {
            throw new AppError('Pedido não encontrado', 404);
        }

        if (req.user.role !== 'client') {
            throw new AppError('Apenas clientes podem enviar avaliação', 403);
        }

        if (!request.client || request.client._id.toString() !== req.user.id) {
            throw new AppError('Acesso negado', 403);
        }

        if (request.status !== 'completed') {
            throw new AppError('Só é possível avaliar pedidos concluídos', 400);
        }

        const numericRating = Number(rating);
        if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
            throw new AppError('A classificação deve ser um número entre 1 e 5', 400);
        }

        // Compatibilidade com pedidos antigos: o campo `lift` (required no schema)
        // só passou a ser gravado na criação recentemente — pedidos criados antes
        // disso têm apenas `liftId` (string, campo legacy não declarado no schema,
        // mas ainda presente no documento). Sem isto, request.save() abaixo falhava
        // sempre com ValidationError "Path `lift` is required".
        if (!request.lift) {
            const liftIdLegacy = request.get('liftId');
            if (liftIdLegacy && mongoose.Types.ObjectId.isValid(String(liftIdLegacy))) {
                const liftDoc = await Lift.findById(liftIdLegacy).select('_id');
                if (liftDoc) {
                    request.lift = liftDoc._id;
                }
            }
        }

        request.feedback = {
            rating: numericRating,
            comment: (comment || '').trim(),
            submittedBy: req.user.id,
            submittedAt: new Date()
        };

        await request.save();

        res.json({
            success: true,
            message: 'Avaliação enviada com sucesso',
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
            throw new AppError('Pedido não encontrado', 404);
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

/**
 * Експорт заявки в PDF
 */
exports.exportRequestPDF = async (req, res, next) => {
    try {
        const request = await Request.findById(req.params.id)
            .populate('client', 'firstName lastName email phone')
            .populate('assignedTo', 'firstName lastName email phone')
            .populate('lift', 'municipalNumber clientEmail client');

        if (!request) {
            throw new AppError('Pedido não encontrado', 404);
        }

        // Клієнт може експортувати тільки свої запити — перевіряємо всі можливі поля
        if (req.user.role === 'client') {
            const clientId = request.client?._id?.toString() || request.client?.toString();
            const liftClientEmail = request.lift?.clientEmail;
            const liftClientId = request.lift?.client?.toString();
            const isOwner =
                clientId === req.user.id ||
                request.clientEmail === req.user.email ||
                liftClientEmail === req.user.email ||
                liftClientId === req.user.id;
            if (!isOwner) throw new AppError('Acesso negado', 403);
        }

        const pdfBuffer = await exportService.exportRequestToPDF(request);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=request-${request._id}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
};

/**
 * Експорт заявок в Excel
 */
exports.exportRequestsExcel = async (req, res, next) => {
    try {
        const { status, priority, startDate, endDate } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const requests = await Request.find(filter)
            .populate('client', 'firstName lastName email')
            .populate('assignedTo', 'firstName lastName email')
            .populate('lift', 'municipalNumber')
            .sort({ createdAt: -1 });

        const excelBuffer = await exportService.exportRequestsToExcel(requests);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=requests-${Date.now()}.xlsx`);
        res.send(excelBuffer);
    } catch (error) {
        next(error);
    }
};
