const mongoose = require('mongoose');

const liftSchema = new mongoose.Schema({
    municipalNumber: {
        type: String,
        required: [true, 'Municipal number required'],
        unique: true,
        trim: true
    },
    address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        zipCode: String,
        country: { type: String, default: 'Portugal' }
    },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    coordinates: {
        lat: Number,
        lng: Number
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
    // Tipo de accionamento — determina norma e checklist aplicável
    driveType: {
        type: String,
        enum: ['traction', 'traction_mrl', 'hydraulic', 'goods', 'platform'],
        default: 'traction'
    },
    // Tipo de porta — determina itens específicos de portas no checklist
    doorType: {
        type: String,
        enum: ['automatic', 'swing', 'gate'],
        default: 'automatic'
    },
    capacity: { type: Number, required: true },
    speed: Number,
    floors: { type: Number, required: true },
    installationDate: Date,
    lastInspectionDate: Date,
    nextInspectionDate: { type: Date, index: true },
    inspectionFrequency: { type: Number, default: 6 }, // meses
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
        company: String,
        notes: String,
        photos: [String],
        reportFile: String, // ficheiro PDF do relatório
        reportNumber: String,
        processNumber: String,
        certType: { type: String, enum: ['cert_2_years', 'reinspection', 'immobilization', 'conditional'] },
        validUntil: Date,
        reportType: { type: String, enum: ['routine', 'emergency', 'annual', 'certification'], default: 'routine' },
        inspectionType: { type: String, enum: ['inspection', 'maintenance', 'repair', 'emergency'] },
        status: { type: String, enum: ['passed', 'failed', 'conditional', 'completed'], default: 'passed' }
    }],
    photos: [{
        url: String,
        description: String,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now }
    }],
    documents: [{
        type: { 
            type: String, 
            enum: ['contract', 'inspection'], 
            required: true 
        },
        filename: { type: String, required: true },
        storedFilename: { type: String, required: true },
        path: { type: String, required: true },
        mimetype: String,
        size: Number,
        uploadedBy: {
            _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            username: String,
            name: String
        },
        uploadedAt: { type: Date, default: Date.now },
        notes: String
    }],
    maintenanceContract: {
        contractFile: String, // ficheiro PDF do contrato
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
    notes: String,
    deletionRequest: {
        requested: { type: Boolean, default: false },
        requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        requestedAt: Date,
        reason: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

liftSchema.index({ location: '2dsphere' });

// ── Normalize legacy/UI display values → DB enum codes ────────────────────
const DRIVE_MAP = {
    'hydraulic': 'hydraulic',
    'hydraulic':    'hydraulic',
    'traction_mrl': 'traction_mrl',
    'traction_mrl': 'traction_mrl',
    'канатний (з машинним залом)': 'traction',
    'traction':     'traction',
    'гвинтовий':    'platform',
    'платформний':  'platform',
    'platform':     'platform',
    'goods':        'goods',
    'вантажний':    'goods',
};
const DOOR_MAP = {
    'автоматичні (2-стулкові)':       'automatic',
    'автоматичні (4-стулкові)':       'automatic',
    'автоматичні (4-стулкові / телескопічні)': 'automatic',
    'телескопічні':                   'automatic',
    'automatic':                      'automatic',
    'напівавтоматичні':               'swing',
    'напівавтоматичні / розпашні':    'swing',
    'розпашні':                       'swing',
    'swing':                          'swing',
    'ручні':                          'gate',
    'ручні (ґрати)':                  'gate',
    'gate':                           'gate',
};
liftSchema.pre('save', function(next) {
    if (this.driveType) {
        const mapped = DRIVE_MAP[this.driveType.toLowerCase().trim()];
        if (mapped) this.driveType = mapped;
    }
    if (this.doorType) {
        const mapped = DOOR_MAP[this.doorType.toLowerCase().trim()];
        if (mapped) this.doorType = mapped;
    }
    next();
});

// Also normalize on findOneAndUpdate / findByIdAndUpdate
liftSchema.pre('findOneAndUpdate', function(next) {
    const upd = this.getUpdate();
    const body = upd?.$set || upd || {};
    if (body.driveType) {
        const mapped = DRIVE_MAP[body.driveType.toLowerCase().trim()];
        if (mapped) { if (upd.$set) upd.$set.driveType = mapped; else upd.driveType = mapped; }
    }
    if (body.doorType) {
        const mapped = DOOR_MAP[body.doorType.toLowerCase().trim()];
        if (mapped) { if (upd.$set) upd.$set.doorType = mapped; else upd.doorType = mapped; }
    }
    next();
});

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
