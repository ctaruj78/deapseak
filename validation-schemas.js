// validation-schemas.js - Схеми валідації для API endpoints

const { validateRequest } = require('./validation');

// Схеми валідації для різних API endpoints
const validationSchemas = {
    // Аутентифікація
    login: {
        email: { type: 'string', required: false, format: 'email', maxLength: 100 },
        username: { type: 'string', required: false, minLength: 3, maxLength: 50 },
        password: { type: 'string', required: true, minLength: 6, maxLength: 100 }
    },

    register: {
        username: { type: 'string', required: true, minLength: 3, maxLength: 50 },
        email: { type: 'string', required: true, format: 'email', maxLength: 100 },
        password: { type: 'string', required: true, minLength: 8, maxLength: 100 },
        firstName: { type: 'string', required: false, minLength: 2, maxLength: 50 },
        lastName: { type: 'string', required: false, minLength: 2, maxLength: 50 },
        role: { type: 'string', required: false, enum: ['admin', 'dispatcher', 'technician', 'client'] },
        phone: { type: 'string', required: false, format: 'phone', maxLength: 20 }
    },

    // Ліфти
    lift: {
        _id: { type: 'string', required: false, format: 'objectId' },
        model: { type: 'string', required: false, minLength: 2, maxLength: 100 },
        type: { type: 'string', required: false, enum: ['passenger', 'cargo', 'service', 'panoramic'] },
        address: { type: 'string', required: true, minLength: 5, maxLength: 200 },
        municipalNumber: { type: 'string', required: false, minLength: 1, maxLength: 50 },
        status: { type: 'string', required: false, enum: ['active', 'maintenance', 'error', 'inactive'] },
        loadCapacity: { type: 'number', required: false, min: 100, max: 20000 },
        floorCount: { type: 'number', required: false, min: 2, max: 100 },
        manufacturingYear: { type: 'number', required: false, min: 1900, max: new Date().getFullYear() + 1 },
        lastInspection: { type: 'string', required: false, format: 'date' },
        nextMaintenance: { type: 'string', required: false, format: 'date' },
        clientName: { type: 'string', required: false, minLength: 2, maxLength: 100 },
        clientEmail: { type: 'string', required: false, format: 'email', maxLength: 100 },
        clientPhone: { type: 'string', required: false, format: 'phone', maxLength: 20 },
        installationDate: { type: 'string', required: false, format: 'date' },
        warrantyExpiry: { type: 'string', required: false, format: 'date' },
        notes: { type: 'string', required: false, maxLength: 1000 }
    },

    // Заявки на обслуговування
    request: {
        _id: { type: 'string', required: false, format: 'objectId' },
        liftId: { type: 'string', required: true, format: 'objectId' },
        title: { type: 'string', required: true, minLength: 5, maxLength: 200 },
        description: { type: 'string', required: true, minLength: 10, maxLength: 2000 },
        priority: { type: 'string', required: false, enum: ['low', 'medium', 'high', 'critical'] },
        status: { type: 'string', required: false, enum: ['new', 'open', 'assigned', 'in_progress', 'completed', 'cancelled'] },
        type: { type: 'string', required: false, enum: ['repair', 'maintenance', 'inspection', 'emergency', 'complaint'] },
        clientId: { type: 'string', required: false, format: 'objectId' },
        technicianId: { type: 'string', required: false, format: 'objectId' },
        createdAt: { type: 'string', required: false, format: 'date' },
        updatedAt: { type: 'string', required: false, format: 'date' },
        completedAt: { type: 'string', required: false, format: 'date' },
        estimatedDuration: { type: 'number', required: false, min: 15, max: 480 }, // хвилини
        actualDuration: { type: 'number', required: false, min: 0, max: 1000 },
        cost: { type: 'number', required: false, min: 0, max: 100000 },
        parts: { type: 'array', required: false, itemType: 'object' },
        notes: { type: 'string', required: false, maxLength: 1000 }
    },

    // Завдання технікам
    assignment: {
        _id: { type: 'string', required: false, format: 'objectId' },
        title: { type: 'string', required: true, minLength: 5, maxLength: 200 },
        description: { type: 'string', required: true, minLength: 10, maxLength: 2000 },
        priority: { type: 'string', required: false, enum: ['low', 'medium', 'high', 'critical'] },
        status: { type: 'string', required: false, enum: ['new', 'assigned', 'in-progress', 'completed', 'cancelled', 'on-hold'] },
        type: { type: 'string', required: false, enum: ['repair', 'maintenance', 'inspection', 'installation'] },
        location: {
            type: 'object',
            required: false,
            properties: {
                liftId: { type: 'string', required: false, format: 'objectId' },
                address: { type: 'string', required: false, minLength: 5, maxLength: 200 },
                coordinates: {
                    type: 'object',
                    required: false,
                    properties: {
                        lat: { type: 'number', required: false, min: -90, max: 90 },
                        lng: { type: 'number', required: false, min: -180, max: 180 }
                    }
                }
            }
        },
        assignment: {
            type: 'object',
            required: false,
            properties: {
                assignedTo: { type: 'string', required: false, format: 'objectId' },
                assignedBy: { type: 'string', required: false, format: 'objectId' },
                assignedAt: { type: 'string', required: false, format: 'date' },
                instructions: { type: 'string', required: false, maxLength: 1000 },
                deadline: { type: 'string', required: false, format: 'date' }
            }
        },
        metadata: {
            type: 'object',
            required: false,
            properties: {
                category: { type: 'string', required: false, enum: ['electrical', 'mechanical', 'doors', 'controls', 'safety', 'other'] },
                source: { type: 'string', required: false, enum: ['web', 'mobile', 'api', 'scheduled'] },
                createdBy: { type: 'string', required: false, format: 'objectId' },
                tags: { type: 'array', required: false, itemType: 'string' }
            }
        },
        timestamps: {
            type: 'object',
            required: false,
            properties: {
                created: { type: 'string', required: false, format: 'date' },
                updated: { type: 'string', required: false, format: 'date' },
                started: { type: 'string', required: false, format: 'date' },
                completed: { type: 'string', required: false, format: 'date' },
                cancelled: { type: 'string', required: false, format: 'date' }
            }
        }
    },

    // QR коди
    qrCode: {
        _id: { type: 'string', required: false, format: 'objectId' },
        type: { type: 'string', required: true, enum: ['lift', 'request', 'technician', 'location', 'equipment'] },
        reference: { type: 'string', required: false, format: 'objectId' },
        name: { type: 'string', required: true, minLength: 2, maxLength: 100 },
        data: { type: 'object', required: true },
        status: { type: 'string', required: false, enum: ['active', 'inactive', 'expired'] },
        expiryDate: { type: 'string', required: false, format: 'date' },
        createdAt: { type: 'string', required: false, format: 'date' },
        createdBy: { type: 'string', required: false, format: 'objectId' },
        scans: { type: 'number', required: false, min: 0 },
        lastScan: { type: 'string', required: false, format: 'date' },
        maxScans: { type: 'number', required: false, min: 1, max: 10000 },
        accessLevel: { type: 'string', required: false, enum: ['public', 'technician', 'admin'] }
    },

    // Сповіщення моніторингу
    alert: {
        _id: { type: 'string', required: false, format: 'objectId' },
        type: { type: 'string', required: true, enum: ['system', 'maintenance', 'error', 'warning', 'info', 'status_change'] },
        title: { type: 'string', required: true, minLength: 5, maxLength: 200 },
        description: { type: 'string', required: true, minLength: 10, maxLength: 1000 },
        liftId: { type: 'string', required: false, format: 'objectId' },
        severity: { type: 'string', required: true, enum: ['info', 'warning', 'critical'] },
        metadata: { type: 'object', required: false },
        timestamp: { type: 'string', required: false, format: 'date' },
        acknowledged: { type: 'boolean', required: false },
        acknowledgedBy: { type: 'string', required: false, format: 'objectId' },
        acknowledgedAt: { type: 'string', required: false, format: 'date' },
        resolvedAt: { type: 'string', required: false, format: 'date' },
        resolvedBy: { type: 'string', required: false, format: 'objectId' },
        resolution: { type: 'string', required: false, maxLength: 500 },
        createdBy: { type: 'string', required: false, format: 'objectId' }
    },

    // Повідомлення чату
    chatMessage: {
        text: { type: 'string', required: true, minLength: 1, maxLength: 2000 },
        chatId: { type: 'string', required: true, format: 'objectId' },
        type: { type: 'string', required: true, enum: ['direct', 'channel'] },
        attachments: {
            type: 'array',
            required: false,
            itemType: 'object',
            maxItems: 10
        },
        timestamp: { type: 'string', required: false, format: 'date' },
        edited: { type: 'boolean', required: false },
        editedAt: { type: 'string', required: false, format: 'date' }
    },

    // Завантаження файлів
    fileUpload: {
        fileName: { type: 'string', required: true, minLength: 1, maxLength: 255 },
        fileData: { type: 'string', required: true, minLength: 1 }, // base64
        chatId: { type: 'string', required: false, format: 'objectId' },
        description: { type: 'string', required: false, maxLength: 500 }
    },

    // Інспекції
    inspection: {
        liftId: { type: 'string', required: true, format: 'objectId' },
        inspectionType: { type: 'string', required: true, enum: ['routine', 'emergency', 'annual', 'quarterly', 'monthly'] },
        results: { type: 'object', required: true },
        notes: { type: 'string', required: false, maxLength: 2000 },
        recommendations: { type: 'array', required: false, itemType: 'string' },
        nextInspectionDate: { type: 'string', required: false, format: 'date' },
        inspectedAt: { type: 'string', required: false, format: 'date' },
        duration: { type: 'number', required: false, min: 15, max: 480 }, // хвилини
        status: { type: 'string', required: false, enum: ['passed', 'failed', 'conditional'] }
    },

    // Рахунки
    invoice: {
        clientId: { type: 'string', required: true, format: 'objectId' },
        amount: { type: 'number', required: true, min: 0.01, max: 1000000 },
        description: { type: 'string', required: true, minLength: 5, maxLength: 500 },
        items: {
            type: 'array',
            required: false,
            itemType: 'object',
            minItems: 1,
            maxItems: 50
        },
        dueDate: { type: 'string', required: false, format: 'date' },
        taxRate: { type: 'number', required: false, min: 0, max: 100 },
        discount: { type: 'number', required: false, min: 0, max: 100 },
        notes: { type: 'string', required: false, maxLength: 1000 },
        status: { type: 'string', required: false, enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'] }
    },

    // Звіти
    report: {
        title: { type: 'string', required: true, minLength: 5, maxLength: 200 },
        type: { type: 'string', required: true, enum: ['lifts', 'requests', 'assignments', 'financial', 'performance', 'custom'] },
        data: { type: 'object', required: true },
        parameters: { type: 'object', required: false },
        dateRange: {
            type: 'object',
            required: false,
            properties: {
                startDate: { type: 'string', required: false, format: 'date' },
                endDate: { type: 'string', required: false, format: 'date' }
            }
        },
        filters: { type: 'object', required: false },
        format: { type: 'string', required: false, enum: ['json', 'pdf', 'excel', 'csv'] },
        createdAt: { type: 'string', required: false, format: 'date' }
    },

    // Email
    email: {
        to: { type: 'string', required: true, format: 'email', maxLength: 100 },
        subject: { type: 'string', required: true, minLength: 5, maxLength: 200 },
        message: { type: 'string', required: true, minLength: 10, maxLength: 5000 },
        cc: { type: 'array', required: false, itemType: 'string', maxItems: 10 },
        bcc: { type: 'array', required: false, itemType: 'string', maxItems: 10 },
        attachments: { type: 'array', required: false, itemType: 'object', maxItems: 5 },
        priority: { type: 'string', required: false, enum: ['low', 'normal', 'high'] },
        template: { type: 'string', required: false, maxLength: 50 }
    },

    // QR сканування
    qrScan: {
        qrData: { type: 'string', required: true, minLength: 1, maxLength: 10000 },
        scannedBy: { type: 'string', required: false, format: 'objectId' },
        deviceInfo: { type: 'object', required: false },
        location: {
            type: 'object',
            required: false,
            properties: {
                lat: { type: 'number', required: false, min: -90, max: 90 },
                lng: { type: 'number', required: false, min: -180, max: 180 },
                accuracy: { type: 'number', required: false, min: 0, max: 1000 }
            }
        },
        action: { type: 'string', required: false, enum: ['scan', 'access', 'maintenance', 'inspection'] },
        notes: { type: 'string', required: false, maxLength: 500 }
    },

    // Шаблони завдань
    assignmentTemplate: {
        name: { type: 'string', required: true, minLength: 3, maxLength: 100 },
        description: { type: 'string', required: true, minLength: 10, maxLength: 500 },
        category: { type: 'string', required: true, enum: ['electrical', 'mechanical', 'doors', 'controls', 'safety', 'other'] },
        priority: { type: 'string', required: true, enum: ['low', 'medium', 'high', 'critical'] },
        estimatedDuration: { type: 'number', required: true, min: 15, max: 480 },
        requiredSkills: { type: 'array', required: false, itemType: 'string', maxItems: 10 },
        checklist: { type: 'array', required: false, itemType: 'string', maxItems: 20 },
        tools: { type: 'array', required: false, itemType: 'string', maxItems: 15 },
        parts: { type: 'array', required: false, itemType: 'object', maxItems: 10 },
        instructions: { type: 'string', required: false, maxLength: 2000 },
        isActive: { type: 'boolean', required: false },
        createdBy: { type: 'string', required: false, format: 'objectId' }
    },

    // Канали чату
    chatChannel: {
        name: { type: 'string', required: true, minLength: 3, maxLength: 50 },
        description: { type: 'string', required: false, maxLength: 200 },
        type: { type: 'string', required: false, enum: ['public', 'private', 'direct'] },
        members: { type: 'array', required: false, itemType: 'string' },
        createdBy: { type: 'string', required: false, format: 'objectId' }
    }
};

// Middleware функції для валідації конкретних endpoints
const validateLogin = validateRequest(validationSchemas.login);
const validateRegister = validateRequest(validationSchemas.register);
const validateLift = validateRequest(validationSchemas.lift);
const validateRequestSchema = validateRequest(validationSchemas.request);
const validateAssignment = validateRequest(validationSchemas.assignment);
const validateQRCode = validateRequest(validationSchemas.qrCode);
const validateAlert = validateRequest(validationSchemas.alert);
const validateChatMessage = validateRequest(validationSchemas.chatMessage);
const validateFileUpload = validateRequest(validationSchemas.fileUpload);
const validateInspection = validateRequest(validationSchemas.inspection);
const validateInvoice = validateRequest(validationSchemas.invoice);
const validateReport = validateRequest(validationSchemas.report);
const validateEmail = validateRequest(validationSchemas.email);
const validateQRScan = validateRequest(validationSchemas.qrScan);
const validateAssignmentTemplate = validateRequest(validationSchemas.assignmentTemplate);
const validateChatChannel = validateRequest(validationSchemas.chatChannel);

module.exports = {
    validationSchemas,
    validateLogin,
    validateRegister,
    validateLift,
    validateRequest: validateRequestSchema,
    validateAssignment,
    validateQRCode,
    validateAlert,
    validateChatMessage,
    validateFileUpload,
    validateInspection,
    validateInvoice,
    validateReport,
    validateEmail,
    validateQRScan,
    validateAssignmentTemplate,
    validateChatChannel
};