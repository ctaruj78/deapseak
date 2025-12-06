const mongoose = require('mongoose');

const liftSchema = new mongoose.Schema({
    municipalNumber: {
        type: String,
        required: [true, 'Municipal number required'],
        unique: true,
        trim: true,
        index: true
    },
    address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        zipCode: String,
        country: { type: String, default: 'Ukraine' }
    },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // Додаткові дані клієнта (для випадків коли немає User в БД)
    clientName: String,
    clientEmail: String,
    clientPhone: String,
    contactPerson: String,
    intercomCode: String,
    technician: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    manufacturer: { type: String, required: true },
    model: { type: String, required: true },
    serialNumber: String,
    type: { type: String, default: 'passenger' },
    capacity: { type: Number, required: true },
    speed: Number,
    floors: { type: Number, required: true },
    installationDate: Date,
    lastInspectionDate: Date,
    nextInspectionDate: { type: Date, index: true },
    inspectionFrequency: { type: Number, default: 6 }, // місяців
    maintenanceNotes: String,
    status: {
        type: String,
        enum: ['operational', 'maintenance', 'repair', 'out_of_service', 'inspection'],
        default: 'operational',
        index: true
    },
    inspectionHistory: [{
        date: { type: Date, default: Date.now },
        inspector: String,
        notes: String,
        photos: [String],
        reportFile: String, // PDF файл звіту
        reportType: { type: String, enum: ['routine', 'emergency', 'annual', 'certification'], default: 'routine' },
        status: { type: String, enum: ['passed', 'failed', 'conditional'], default: 'passed' }
    }],
    photos: [{
        url: String,
        description: String,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now }
    }],
    maintenanceContract: {
        contractFile: String, // PDF файл контракту
        contractNumber: String,
        startDate: Date,
        endDate: Date,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: Date,
        description: String
    },
    qrCode: {
        code: { type: String, unique: true, sparse: true },
        generatedAt: Date,
        accessLevel: {
            type: String,
            enum: ['public', 'client', 'technician', 'admin'],
            default: 'client'
        }
    },
    notes: String
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

liftSchema.index({ location: '2dsphere' });

liftSchema.virtual('requests', {
    ref: 'Request',
    localField: '_id',
    foreignField: 'lift'
});

liftSchema.methods.needsMaintenance = function() {
    if (!this.nextInspectionDate) return false;
    return new Date() >= this.nextInspectionDate;
};

liftSchema.methods.calculateNextMaintenance = function(monthsFromNow = 6) {
    const nextDate = new Date(this.lastInspectionDate || new Date());
    nextDate.setMonth(nextDate.getMonth() + monthsFromNow);
    return nextDate;
};

module.exports = mongoose.model('Lift', liftSchema);
