/**
 * Файл схеми MongoDB для коллекций, связанных с QR-кодами
 */

const { Schema } = require('mongoose');

/**
 * Схема для QR-кодів
 */
const QRCodeSchema = new Schema({
    // Тип QR-коду: lift, request, technician, client, etc.
    type: {
        type: String,
        required: true,
        enum: ['lift', 'request', 'technician', 'client', 'document', 'other']
    },
    
    // Ідентифікатор пов'язаного об'єкта
    reference: {
        type: String,
        required: true
    },
    
    // Назва QR-коду для відображення
    name: {
        type: String,
        required: true
    },
    
    // JSON дані, які містяться в QR-коді
    data: {
        type: Object,
        required: true
    },
    
    // Статус QR-коду: active, inactive, expired
    status: {
        type: String,
        required: true,
        enum: ['active', 'inactive', 'expired'],
        default: 'active'
    },
    
    // Дата закінчення терміну дії
    expiryDate: {
        type: Date
    },
    
    // Хто створив QR-код
    createdBy: {
        type: String,
        required: true
    },
    
    // Коли був створений QR-код
    createdAt: {
        type: Date,
        default: Date.now
    },
    
    // Хто останній раз оновив QR-код
    updatedBy: {
        type: String
    },
    
    // Коли був оновлений QR-код
    updatedAt: {
        type: Date
    },
    
    // Кількість сканувань QR-коду
    scans: {
        type: Number,
        default: 0
    },
    
    // Дата останнього сканування
    lastScan: {
        type: Date
    }
});

/**
 * Схема для історії сканувань QR-кодів
 */
const QRScanSchema = new Schema({
    // ID QR-коду, якщо він був знайдений в системі
    qrCodeId: {
        type: Schema.Types.ObjectId,
        ref: 'QRCode',
        required: false
    },
    
    // Тип референсу (lift, request, etc.)
    referenceType: {
        type: String
    },
    
    // ID референсу
    referenceId: {
        type: String
    },
    
    // Дані, які були отримані при скануванні
    data: {
        type: Object,
        required: true
    },
    
    // Коли був відсканований QR-код
    scannedAt: {
        type: Date,
        default: Date.now
    },
    
    // Хто відсканував QR-код
    scannedBy: {
        type: String,
        default: 'anonymous'
    },
    
    // Інформація про пристрій, з якого відбулося сканування
    deviceInfo: {
        type: Object,
        default: {}
    },
    
    // Статус сканування: success, unknown, invalid, expired
    status: {
        type: String,
        enum: ['success', 'unknown', 'invalid', 'expired'],
        default: 'unknown'
    }
});

module.exports = {
    QRCodeSchema,
    QRScanSchema
};