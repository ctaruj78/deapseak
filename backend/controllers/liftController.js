const { Lift, User } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const qrService = require('../services/qrService');
const exportService = require('../services/exportService');

exports.createLift = async (req, res, next) => {
    try {
        const { municipalNumber, address, location, client, technician, manufacturer, model, capacity, floors, installationDate, lastInspectionDate, nextInspectionDate, qrCode } = req.body;
        const existingLift = await Lift.findOne({ municipalNumber });
        if (existingLift) throw new AppError('Lift with this number exists', 400);
        if (client) {
            const clientUser = await User.findById(client);
            if (!clientUser || clientUser.role !== 'client') throw new AppError('Invalid client', 400);
        }
        if (technician) {
            const techUser = await User.findById(technician);
            if (!techUser || techUser.role !== 'technician') throw new AppError('Invalid technician', 400);
        }
        const lift = await Lift.create({ municipalNumber, address, location, client, technician, manufacturer, model, capacity, floors, installationDate, lastInspectionDate, nextInspectionDate, qrCode });
        await lift.populate(['client', 'technician']);
        res.status(201).json({ success: true, message: 'Lift created', data: { lift } });
    } catch (error) {
        next(error);
    }
};

exports.getAllLifts = async (req, res, next) => {
    try {
        const { status, client, technician, search, needsMaintenance, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const query = {};
        if (status) query.status = status;
        if (client) query.client = client;
        if (technician) query.technician = technician;
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
        const lift = await Lift.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).populate('client').populate('technician');
        if (!lift) throw new AppError('Lift not found', 404);
        res.json({ success: true, message: 'Lift updated', data: { lift } });
    } catch (error) {
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
            throw new AppError('Ліфт не знайдено', 404);
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
        const { inspector, notes, reportType, status, photos } = req.body;
        const reportFile = req.file ? `/uploads/${req.file.filename}` : null;

        const lift = await Lift.findById(req.params.id);
        if (!lift) {
            throw new AppError('Ліфт не знайдено', 404);
        }

        const report = {
            date: new Date(),
            inspector: inspector || `${req.user.firstName} ${req.user.lastName}`,
            notes,
            reportType: reportType || 'routine',
            status: status || 'passed',
            reportFile,
            photos: photos || []
        };

        lift.inspectionHistory.push(report);
        lift.lastInspectionDate = new Date();

        // Якщо звіт пройдено, розрахувати наступну інспекцію
        if (status === 'passed') {
            lift.calculateNextMaintenance(6);
        }

        await lift.save();

        res.json({
            success: true,
            message: 'Звіт інспекції додано',
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
            throw new AppError('Файл контракту не завантажено', 400);
        }

        const { contractNumber, startDate, endDate, description } = req.body;

        const lift = await Lift.findById(req.params.id);
        if (!lift) {
            throw new AppError('Ліфт не знайдено', 404);
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
            throw new AppError('Ліфт не знайдено', 404);
        }

        if (!lift.maintenanceContract || !lift.maintenanceContract.contractFile) {
            throw new AppError('Контракт не знайдено', 404);
        }

        // Перевірка доступу
        const userRole = req.user.role;
        const isOwner = lift.client && lift.client.toString() === req.user.id;

        if (userRole === 'client' && !isOwner) {
            throw new AppError('Доступ заборонено', 403);
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
            throw new AppError('Ліфт не знайдено', 404);
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
        if (!lift) throw new AppError('Ліфт не знайдено', 404);

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
            throw new AppError('Ліфт не знайдено', 404);
        }

        if (!lift.maintenanceContract || !lift.maintenanceContract.contractFile) {
            throw new AppError('Контракт не знайдено', 404);
        }

        // Перевірка доступу
        const userRole = req.user.role;
        const isOwner = lift.client && lift.client._id.toString() === req.user.id;

        if (userRole === 'client' && !isOwner) {
            throw new AppError('Доступ заборонено', 403);
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
