/**
 * MongoDB схема для системи управління заявками
 * Файл: models/assignment-schema.js
 */

const { ObjectId } = require('mongodb');

/**
 * Схема заявки (Assignment)
 */
const assignmentSchema = {
    // Основна інформація
    _id: ObjectId, // MongoDB ID
    assignmentNumber: String, // Унікальний номер заявки (напр: ASG-2024-001)
    title: String, // Заголовок заявки
    description: String, // Детальний опис проблеми/завдання
    
    // Статуси та пріоритет
    status: {
        type: String,
        enum: ['new', 'assigned', 'in-progress', 'completed', 'cancelled', 'on-hold'],
        default: 'new'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    
    // Інформація про клієнта
    client: {
        id: ObjectId, // Посилання на користувача-клієнта
        name: String,
        company: String,
        phone: String,
        email: String,
        address: String
    },
    
    // Локація та ліфт
    location: {
        address: String,
        building: String,
        floor: String,
        liftId: String, // ID ліфта
        liftNumber: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    
    // QR інтеграція
    qrCode: {
        id: ObjectId, // Посилання на QR-код
        code: String, // QR код
        scanHistory: [{
            scannedBy: ObjectId, // ID користувача
            scannedAt: Date,
            action: String, // 'started', 'completed', 'updated'
            notes: String
        }]
    },
    
    // Призначення технікам
    assignment: {
        assignedTo: ObjectId, // ID призначеного техніка
        assignedBy: ObjectId, // ID диспетчера, який призначив
        assignedAt: Date,
        estimatedDuration: Number, // Очікувана тривалість в хвилинах
        deadline: Date,
        instructions: String // Спеціальні інструкції для техніка
    },
    
    // Часові мітки
    timestamps: {
        created: Date,
        updated: Date,
        started: Date,
        completed: Date,
        cancelled: Date
    },
    
    // Робочі дані техніка
    workData: {
        startTime: Date,
        endTime: Date,
        workDuration: Number, // Фактична тривалість в хвилинах
        photoBefore: [String], // URL фото до початку роботи
        photoAfter: [String], // URL фото після завершення
        tools: [String], // Використані інструменти
        parts: [{
            name: String,
            quantity: Number,
            serialNumber: String
        }],
        notes: String, // Нотатки техніка
        issues: String // Виявлені проблеми
    },
    
    // Комунікація
    communication: [{
        from: ObjectId, // ID відправника
        to: ObjectId, // ID отримувача
        message: String,
        timestamp: Date,
        type: String, // 'message', 'update', 'alert'
        attachments: [String] // URL файлів
    }],
    
    // Оцінка та зворотний зв'язок
    feedback: {
        clientRating: Number, // 1-5
        clientComments: String,
        technicianRating: Number, // 1-5 (оцінка роботи техніка від диспетчера)
        dispatcherComments: String
    },
    
    // Вартість та фінанси
    cost: {
        laborCost: Number,
        partsCost: Number,
        totalCost: Number,
        currency: String,
        invoiced: Boolean,
        paid: Boolean
    },
    
    // Метадані
    metadata: {
        source: String, // 'web', 'mobile', 'api', 'qr_scan'
        tags: [String],
        category: String, // 'maintenance', 'repair', 'installation', 'inspection'
        urgency: Boolean, // Терміновість
        repeatJob: Boolean, // Повторювана робота
        parentAssignment: ObjectId // Посилання на батьківську заявку
    }
};

/**
 * Індекси для оптимізації запитів
 */
const assignmentIndexes = [
    { assignmentNumber: 1 }, // Унікальний номер
    { status: 1 },
    { priority: 1 },
    { 'client.id': 1 },
    { 'assignment.assignedTo': 1 },
    { 'timestamps.created': -1 },
    { 'location.liftId': 1 },
    { 'qrCode.code': 1 },
    { 'metadata.category': 1 }
];

/**
 * Схема для історії змін заявки
 */
const assignmentHistorySchema = {
    _id: ObjectId,
    assignmentId: ObjectId,
    changedBy: ObjectId,
    changeType: String, // 'created', 'updated', 'assigned', 'status_changed', 'completed'
    oldValues: Object,
    newValues: Object,
    timestamp: Date,
    notes: String
};

/**
 * Схема для шаблонів заявок
 */
const assignmentTemplateSchema = {
    _id: ObjectId,
    name: String,
    category: String,
    description: String,
    estimatedDuration: Number,
    requiredTools: [String],
    instructions: String,
    priority: String,
    createdBy: ObjectId,
    createdAt: Date,
    isActive: Boolean
};

module.exports = {
    assignmentSchema,
    assignmentHistorySchema,
    assignmentTemplateSchema,
    assignmentIndexes
};