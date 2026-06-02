const { Lift, User } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const qrService = require('../services/qrService');
const exportService = require('../services/exportService');
const crypto = require('crypto');

// Утиліта: генерація тимчасового пароля (аналог authController)
const _genTempPassword = (length = 10) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let pw = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) pw += chars[bytes[i] % chars.length];
    return pw;
};

// Утиліта: знайти або створити клієнта за email (повертає { user, created })
// sendEmail: true = надіслати welcome email, false = пропустити
const _findOrCreateClient = async (email, clientName, sendEmail = true) => {
    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });
    if (user) return { user, created: false, tempPassword: null, emailSent: false };

    // Розбиваємо clientName на firstName/lastName
    const nameParts = (clientName || '').trim().split(/\s+/);
    const firstName = nameParts[0] || 'Клієнт';
    const lastName = nameParts.slice(1).join(' ') || normalizedEmail.split('@')[0];

    const username = normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_') + '_' + Date.now().toString().slice(-4);
    const tempPassword = _genTempPassword();

    user = await User.create({
        username,
        email: normalizedEmail,
        password: tempPassword,
        firstName,
        lastName,
        role: 'client',
        isActive: true,
        mustChangePassword: true
    });

    let emailSent = false;
    let emailError = null;

    if (sendEmail) {
        // Спроба відправити welcome email (не блокуємо при невдачі)
        try {
            const emailService = require('../services/emailService');
            await emailService.sendWelcomeClientEmail(user, tempPassword);
            emailSent = true;
            console.log('   📧 Welcome email відправлено:', normalizedEmail);
        } catch (emailErr) {
            emailError = emailErr.message;
            console.warn('   ⚠️  Welcome email не відправлено:', emailErr.message);
        }
    } else {
        console.log('   📭 sendEmail=false — welcome email пропущено для:', normalizedEmail);
    }

    return { user, created: true, tempPassword, emailSent, emailSkipped: !sendEmail, emailError };
};

exports.createLift = async (req, res, next) => {
    try {
        const { municipalNumber, address, location, technician, manufacturer, model, capacity, floors, installationDate, lastInspectionDate, nextInspectionDate, qrCode } = req.body;
        let { client, clientEmail } = req.body;

        const existingLift = await Lift.findOne({ municipalNumber });
        if (existingLift) throw new AppError('Lift with this number exists', 400);

        // Синхронізація client ↔ clientEmail при створенні
        const sendEmail = req.body.sendAccessEmail !== false; // default: надіслати email
        let newClientInfo = null;

        if (clientEmail && !client) {
            const result = await _findOrCreateClient(clientEmail, req.body.clientName, sendEmail);
            client = result.user._id;
            if (result.created) {
                newClientInfo = {
                    created: true,
                    email: result.user.email,
                    password: result.tempPassword,
                    emailSent: result.emailSent,
                    emailSkipped: result.emailSkipped,
                    emailError: result.emailError
                };
            }
        } else if (client && !clientEmail) {
            const clientUser = await User.findById(client).select('email role');
            if (!clientUser || clientUser.role !== 'client') throw new AppError('Invalid client', 400);
            clientEmail = clientUser.email;
        } else if (client) {
            const clientUser = await User.findById(client);
            if (!clientUser || clientUser.role !== 'client') throw new AppError('Invalid client', 400);
        }

        if (technician) {
            const techUser = await User.findById(technician);
            if (!techUser || techUser.role !== 'technician') throw new AppError('Invalid technician', 400);
        }
        const lift = await Lift.create({ municipalNumber, address, location, client, clientEmail, technician, manufacturer, model, capacity, floors, installationDate, lastInspectionDate, nextInspectionDate, qrCode });
        await lift.populate(['client', 'technician']);
        res.status(201).json({ success: true, message: 'Lift created', data: { lift }, newClient: newClientInfo });
    } catch (error) {
        next(error);
    }
};

exports.getAllLifts = async (req, res, next) => {
    try {
        const { status, client, technician, search, needsMaintenance, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'asc' } = req.query;
        const query = {};

        // 🔐 Фільтрація по ролі - клієнт бачить тільки свої ліфти
        if (req.user.role === 'client') {
            query.client = req.user.id;
        } else if (req.user.role === 'technician') {
            // Технік бачить тільки ліфти з призначених завдань — обмеженого доступу до /api/lifts
            // Дозволяємо фільтр по technician ou повертаємо порожній список
            if (technician) {
                query.technician = technician;
            } else {
                query.technician = req.user.id;
            }
        } else if (req.user.role === 'admin' || req.user.role === 'dispatcher') {
            // Адмін і диспетчер бачать всі ліфти (фільтри нижче застосовуються додатково)
            if (client) query.client = client;
        }

        if (status) query.status = status;
        if (search) {
            query.$or = [
                { municipalNumber: { $regex: search, $options: 'i' } },
                { 'address.street': { $regex: search, $options: 'i' } },
                { 'address.city': { $regex: search, $options: 'i' } }
            ];
        }
        if (needsMaintenance === 'true') query.nextInspectionDate = { $lte: new Date() };
        const skip = (page - 1) * limit;
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
        const [lifts, total] = await Promise.all([
            Lift.find(query).populate('client', 'firstName lastName email phone').populate('technician', 'firstName lastName email phone').sort(sort).skip(skip).limit(parseInt(limit)),
            Lift.countDocuments(query)
        ]);
        res.json({ success: true, data: { lifts, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } } });
    } catch (error) {
        next(error);
    }
};

exports.getLiftById = async (req, res, next) => {
    try {
        const lift = await Lift.findById(req.params.id).populate('client', 'firstName lastName email phone').populate('technician', 'firstName lastName email phone').populate('requests');
        if (!lift) throw new AppError('Lift not found', 404);
        res.json({ success: true, data: { lift } });
    } catch (error) {
        next(error);
    }
};

exports.getLiftByMunicipalNumber = async (req, res, next) => {
    try {
        const lift = await Lift.findOne({ municipalNumber: req.params.municipalNumber }).populate('client').populate('technician').populate('requests');
        if (!lift) throw new AppError('Lift not found', 404);
        res.json({ success: true, data: { lift } });
    } catch (error) {
        next(error);
    }
};

exports.updateLift = async (req, res, next) => {
    try {
        const updates = req.body;
        console.log(`\n🔄 updateLift [${req.params.id}] — clientEmail:`, updates.clientEmail ?? '(not sent)', '| client:', updates.client ?? '(not sent)');

        if (updates.municipalNumber) {
            const existingLift = await Lift.findOne({ municipalNumber: updates.municipalNumber, _id: { $ne: req.params.id } });
            if (existingLift) throw new AppError('Municipal number exists', 400);
        }
        // Sanitize address: prevent city from duplicating street value
        if (updates.address && typeof updates.address === 'object') {
            if (updates.address.city && updates.address.city === updates.address.street) {
                updates.address.city = '';
            }
        }

        // Поля для $set і опційний $unset (для client)
        const $set = { ...updates };
        const $unset = {};

        // 🔄 Синхронізація client ↔ clientEmail
        const sendEmail = updates.sendAccessEmail !== false; // default: надіслати email
        let newClientInfo = null;

        if (updates.clientEmail !== undefined) {
            if (updates.clientEmail) {
                const result = await _findOrCreateClient(updates.clientEmail, updates.clientName, sendEmail);
                const { user: clientUser, created } = result;
                console.log('   ↳ Client:', created ? `CREATED NEW (${clientUser.email})` : `FOUND (${clientUser.email})`);

                // Прив'язуємо (нового або існуючого) клієнта
                $set.client = clientUser._id;

                // ✅ Якщо клієнт вже існував — оновлюємо його ім'я/прізвище якщо змінились
                if (!created && updates.clientName && updates.clientName.trim()) {
                    const nameParts = updates.clientName.trim().split(/\s+/);
                    const newFirstName = nameParts[0] || clientUser.firstName;
                    const newLastName = nameParts.slice(1).join(' ') || clientUser.lastName || '';
                    await User.findByIdAndUpdate(clientUser._id, {
                        firstName: newFirstName,
                        lastName: newLastName
                    });
                    console.log(`   ✏️  Оновлено ім'я клієнта ${clientUser.email}: ${newFirstName} ${newLastName}`);
                }

                // ✅ Якщо створено нового клієнта — зберігаємо дані для відповіді
                if (created) {
                    newClientInfo = {
                        created: true,
                        email: clientUser.email,
                        password: result.tempPassword,
                        emailSent: result.emailSent,
                        emailSkipped: result.emailSkipped,
                        emailError: result.emailError
                    };
                }
            } else {
                // clientEmail очищено — знімаємо прив'язку
                delete $set.client;
                $unset.client = 1;
            }
        } else if (updates.client !== undefined) {
            if (updates.client) {
                const clientUser = await User.findById(updates.client).select('email role firstName lastName');
                if (!clientUser || clientUser.role !== 'client') throw new AppError('Invalid client', 400);
                $set.clientEmail = clientUser.email;
                // Оновлюємо clientName у ліфті щоб відповідав User
                if (!updates.clientName) {
                    $set.clientName = `${clientUser.firstName || ''} ${clientUser.lastName || ''}`.trim();
                }
            } else {
                $unset.client = 1;
                delete $set.client;
            }
        }

        // Якщо address.city порожнє — відновлюємо з БД
        if ($set.address && typeof $set.address === 'object' && !$set.address.city) {
            const existingLift = await Lift.findById(req.params.id).select('address').lean();
            if (existingLift?.address?.city) {
                $set.address.city = existingLift.address.city;
            }
        }

        const mongoUpdate = { $set };
        if (Object.keys($unset).length > 0) mongoUpdate.$unset = $unset;

        console.log('   ↳ mongoUpdate $set.client:', $set.client, '| $unset:', Object.keys($unset));

        const lift = await Lift.findByIdAndUpdate(req.params.id, mongoUpdate, { new: true, runValidators: false }).populate('client').populate('technician');
        if (!lift) throw new AppError('Lift not found', 404);
        console.log(`   ✅ Saved — clientEmail: ${lift.clientEmail} | client: ${lift.client?._id || 'null'}`);
        res.json({ success: true, message: 'Lift updated', data: { lift }, newClient: newClientInfo });
    } catch (error) {
        console.error('   ❌ updateLift error:', error.message);
        next(error);
    }
};

exports.deleteLift = async (req, res, next) => {
    try {
        const lift = await Lift.findByIdAndDelete(req.params.id);
        if (!lift) throw new AppError('Lift not found', 404);
        res.json({ success: true, message: 'Lift deleted' });
    } catch (error) {
        next(error);
    }
};

exports.requestDeletion = async (req, res, next) => {
    try {
        const lift = await Lift.findByIdAndUpdate(
            req.params.id,
            { $set: { deletionRequest: {
                requested: true,
                requestedBy: req.user.id,
                requestedAt: new Date(),
                reason: req.body.reason || ''
            }}},
            { new: true, runValidators: false }
        );
        if (!lift) throw new AppError('Lift not found', 404);

        // Сповіщення для адміністраторів
        try {
            const mongoose = require('mongoose');
            const db = mongoose.connection.db;
            const admins = await User.find({ role: 'admin', isActive: true }, '_id').lean();
            const notifications = admins.map(admin => ({
                userId: admin._id.toString(),
                type: 'deletion_request',
                title: 'Pedido de remoção de elevador',
                message: `Operador ${req.user.email} solicitou remoção do elevador №${lift.municipalNumber || lift._id}`,
                liftId: lift._id,
                requestedBy: req.user.id,
                read: false,
                createdAt: new Date()
            }));
            if (notifications.length > 0) {
                await db.collection('notifications').insertMany(notifications);
            }
        } catch (notifErr) {
            // Не блокуємо відповідь якщо сповіщення не вдалось
            console.error('⚠️ Notification error:', notifErr.message);
        }

        res.json({ success: true, message: 'Pedido de remoção enviado ao administradorістратору' });
    } catch (error) {
        next(error);
    }
};

exports.getLiftsStats = async (req, res, next) => {
    try {
        const [total, byStatus, needsMaintenance] = await Promise.all([
            Lift.countDocuments(),
            Lift.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Lift.countDocuments({ nextInspectionDate: { $lte: new Date() } })
        ]);
        res.json({ success: true, data: { total, byStatus: byStatus.reduce((acc, item) => { acc[item._id] = item.count; return acc; }, {}), needsMaintenance } });
    } catch (error) {
        next(error);
    }
};

exports.getLiftsNearby = async (req, res, next) => {
    try {
        const { longitude, latitude, maxDistance = 5000 } = req.query;
        if (!longitude || !latitude) throw new AppError('Provide coordinates', 400);
        const lifts = await Lift.find({
            location: {
                $near: {
                    $geometry: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
                    $maxDistance: parseInt(maxDistance)
                }
            }
        }).populate('client').populate('technician').limit(50);
        res.json({ success: true, data: { lifts, count: lifts.length } });
    } catch (error) {
        next(error);
    }
};

exports.updateLiftStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!status) throw new AppError('Status required', 400);
        const lift = await Lift.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate('client').populate('technician');
        if (!lift) throw new AppError('Lift not found', 404);
        res.json({ success: true, message: 'Status updated', data: { lift } });
    } catch (error) {
        next(error);
    }
};

exports.addInspection = async (req, res, next) => {
    try {
        const { date, inspector, notes, photos } = req.body;
        const lift = await Lift.findById(req.params.id);
        if (!lift) throw new AppError('Lift not found', 404);
        lift.inspectionHistory.push({ date: date || new Date(), inspector, notes, photos: photos || [] });
        lift.lastInspectionDate = date || new Date();
        const nextDate = new Date(lift.lastInspectionDate);
        nextDate.setMonth(nextDate.getMonth() + 6);
        lift.nextInspectionDate = nextDate;
        await lift.save();
        res.json({ success: true, message: 'Inspection added', data: { lift } });
    } catch (error) {
        next(error);
    }
};

exports.addPhoto = async (req, res, next) => {
    try {
        const { url, description } = req.body;
        if (!url) throw new AppError('Photo URL required', 400);
        const lift = await Lift.findById(req.params.id);
        if (!lift) throw new AppError('Lift not found', 404);
        lift.photos.push({ url, description: description || '', uploadedBy: req.user.id });
        await lift.save();
        res.json({ success: true, message: 'Photo added', data: { lift } });
    } catch (error) {
        next(error);
    }
};

exports.assignTechnician = async (req, res, next) => {
    try {
        const { technicianId } = req.body;
        if (!technicianId) throw new AppError('Technician ID required', 400);
        const technician = await User.findById(technicianId);
        if (!technician || technician.role !== 'technician') throw new AppError('Invalid technician', 400);
        const lift = await Lift.findByIdAndUpdate(req.params.id, { technician: technicianId }, { new: true }).populate('client').populate('technician');
        if (!lift) throw new AppError('Lift not found', 404);
        res.json({ success: true, message: 'Technician assigned', data: { lift } });
    } catch (error) {
        next(error);
    }
};

/**
 * Генерація QR коду для ліфта
 */
exports.generateLiftQR = async (req, res, next) => {
    try {
        const lift = await Lift.findById(req.params.id);
        
        if (!lift) {
            throw new AppError('Elevador não encontrado', 404);
        }

        const format = req.query.format || 'dataURL';
        const qrCode = await qrService.generateLiftQR(req.params.id, format);

        if (format === 'buffer') {
            res.set('Content-Type', 'image/png');
            res.send(qrCode);
        } else {
            res.json({
                success: true,
                data: { qrCode }
            });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Експорт ліфтів в Excel
 */
exports.exportLiftsToExcel = async (req, res, next) => {
    try {
        const { status, manufacturer } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (manufacturer) filter.manufacturer = manufacturer;

        const lifts = await Lift.find(filter)
            .populate('client', 'firstName lastName email')
            .populate('technician', 'firstName lastName email')
            .sort({ createdAt: -1 });

        const excelBuffer = await exportService.exportLiftsToExcel(lifts);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=lifts-${Date.now()}.xlsx`);
        res.send(excelBuffer);
    } catch (error) {
        next(error);
    }
};

/**
 * Додати звіт інспекції
 */
exports.addInspectionReport = async (req, res, next) => {
    try {
        const { inspector, notes, reportType, inspectionType, status, photos,
                inspectionDate, nextInspectionDate } = req.body;
        const reportFile = req.file ? `/uploads/${req.file.filename}` : null;

        const lift = await Lift.findById(req.params.id);
        if (!lift) {
            throw new AppError('Elevador não encontrado', 404);
        }

        // Accept custom inspection date from form; fall back to today
        const reportDate = inspectionDate ? new Date(inspectionDate) : new Date();

        const report = {
            date: reportDate,
            inspector: inspector || `${req.user.firstName} ${req.user.lastName}`,
            notes,
            reportType: reportType || inspectionType || 'routine',
            inspectionType: inspectionType || ({ annual: 'inspection', certification: 'inspection', routine: 'maintenance', emergency: 'emergency' })[reportType] || 'inspection',
            status: status || 'passed',
            reportFile,
            photos: photos || []
        };

        lift.inspectionHistory.push(report);
        lift.lastInspectionDate = reportDate;

        // Accept custom nextInspectionDate, or calculate automatically
        if (nextInspectionDate) {
            lift.nextInspectionDate = new Date(nextInspectionDate);
        } else if (status === 'passed') {
            lift.nextInspectionDate = lift.calculateNextMaintenance(6);
        } else if (status === 'failed') {
            // Failed → re-inspect in 6 months
            const nd = new Date(reportDate);
            nd.setMonth(nd.getMonth() + 6);
            lift.nextInspectionDate = nd;
        }

        await lift.save();

        res.json({
            success: true,
            message: 'Relatório de inspeção adicionado',
            data: { lift }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Завантажити контракт на обслуговування
 */
exports.uploadMaintenanceContract = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new AppError('Ficheiro de contrato não carregado', 400);
        }

        const { contractNumber, startDate, endDate, description } = req.body;

        const lift = await Lift.findById(req.params.id);
        if (!lift) {
            throw new AppError('Elevador não encontrado', 404);
        }

        lift.maintenanceContract = {
            contractFile: `/uploads/${req.file.filename}`,
            contractNumber,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            uploadedBy: req.user.id,
            uploadedAt: new Date(),
            description
        };

        await lift.save();
        await lift.populate('maintenanceContract.uploadedBy', 'firstName lastName email');

        res.json({
            success: true,
            message: 'Контракт на обслуговування завантажено',
            data: { lift }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Отримати контракт на обслуговування
 */
exports.getMaintenanceContract = async (req, res, next) => {
    try {
        const lift = await Lift.findById(req.params.id)
            .populate('maintenanceContract.uploadedBy', 'firstName lastName email');

        if (!lift) {
            throw new AppError('Elevador não encontrado', 404);
        }

        if (!lift.maintenanceContract || !lift.maintenanceContract.contractFile) {
            throw new AppError('Contrato não encontrado', 404);
        }

        // Перевірка доступу
        const userRole = req.user.role;
        const isOwner = lift.client && lift.client.toString() === req.user.id;

        if (userRole === 'client' && !isOwner) {
            throw new AppError('Acesso negado', 403);
        }

        res.json({
            success: true,
            data: { contract: lift.maintenanceContract }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Видалити контракт
 */
exports.deleteMaintenanceContract = async (req, res, next) => {
    try {
        const lift = await Lift.findById(req.params.id);
        
        if (!lift) {
            throw new AppError('Elevador não encontrado', 404);
        }

        // Тільки адмін може видаляти контракти
        if (req.user.role !== 'admin') {
            throw new AppError('Тільки адміністратор може видалити контракт', 403);
        }

        lift.maintenanceContract = undefined;
        await lift.save();

        res.json({
            success: true,
            message: 'Контракт видалено'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Поширити контракт на всі ліфти за тією ж адресою (вулиця + індекс)
 */
exports.shareContractToSiblings = async (req, res, next) => {
    try {
        const lift = await Lift.findById(req.params.id);
        if (!lift) throw new AppError('Elevador não encontrado', 404);

        if (!lift.maintenanceContract || !lift.maintenanceContract.contractFile) {
            throw new AppError('У цього ліфта немає контракту для поширення', 400);
        }

        // Шукаємо ліфти за тією ж адресою (вулиця + постальний код)
        const query = { _id: { $ne: lift._id } };
        if (lift.address && lift.address.zipCode) {
            query['address.zipCode'] = lift.address.zipCode;
        }
        if (lift.address && lift.address.street) {
            query['address.street'] = lift.address.street;
        }

        const siblings = await Lift.find(query);

        if (siblings.length === 0) {
            return res.json({
                success: true,
                updated: 0,
                message: 'Немає інших ліфтів за цією адресою'
            });
        }

        // Копіюємо дані контракту (той самий файл PDF, ті самі метадані)
        const contractData = lift.maintenanceContract.toObject();
        delete contractData._id;
        contractData.uploadedAt = new Date();

        await Lift.updateMany(
            { _id: { $in: siblings.map(s => s._id) } },
            { $set: { maintenanceContract: contractData } }
        );

        res.json({
            success: true,
            updated: siblings.length,
            liftNumbers: siblings.map(s => s.municipalNumber),
            message: `Контракт застосовано до ${siblings.length} ліфт${siblings.length === 1 ? 'а' : 'ів'} за цією адресою`
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Надіслати контракт по email
 */
exports.emailMaintenanceContract = async (req, res, next) => {
    try {
        const { recipientEmail } = req.body;
        
        if (!recipientEmail) {
            throw new AppError('Email отримувача не вказано', 400);
        }

        const lift = await Lift.findById(req.params.id)
            .populate('client', 'firstName lastName email')
            .populate('maintenanceContract.uploadedBy', 'firstName lastName');

        if (!lift) {
            throw new AppError('Elevador não encontrado', 404);
        }

        if (!lift.maintenanceContract || !lift.maintenanceContract.contractFile) {
            throw new AppError('Contrato não encontrado', 404);
        }

        // Перевірка доступу
        const userRole = req.user.role;
        const isOwner = lift.client && lift.client._id.toString() === req.user.id;

        if (userRole === 'client' && !isOwner) {
            throw new AppError('Acesso negado', 403);
        }

        // TODO: Інтегрувати з emailService для відправки
        // const emailService = require('../services/emailService');
        // await emailService.sendContractEmail(recipientEmail, lift);

        res.json({
            success: true,
            message: `Контракт надіслано на ${recipientEmail}`,
            data: { 
                recipient: recipientEmail,
                contractFile: lift.maintenanceContract.contractFile
            }
        });
    } catch (error) {
        next(error);
    }
};
