const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
    lift: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lift',
        required: true,
        index: true
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: [200, 'Título não pode exceder 200 caracteres'],
        // Client-submitted free text is rendered into staff notification
        // dropdowns/lists elsewhere in the app — stripping tag syntax here
        // closes that class of stored-HTML-injection regardless of whether
        // every render site remembers to escape.
        set: (v) => (typeof v === 'string' ? v.replace(/[<>]/g, '') : v)
    },
    description: {
        type: String,
        required: true,
        maxlength: [2000, 'Descrição não pode exceder 2000 caracteres'],
        set: (v) => (typeof v === 'string' ? v.replace(/[<>]/g, '') : v)
    },
    status: {
        type: String,
        enum: ['new', 'assigned', 'in_progress', 'completed', 'cancelled'],
        default: 'new',
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent', 'critical'],
        default: 'medium',
        index: true
    },
    type: {
        type: String,
        enum: ['emergency', 'maintenance', 'repair', 'inspection', 'other', 'orcamento'],
        default: 'maintenance',
        index: true
    },
    scheduledDate: {
        type: Date
    },
    requestNumber: {
        type: String,
        index: true
    },
    photosBefore: [String],
    photosAfter: [String],
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: String,
        createdAt: { type: Date, default: Date.now }
    }],
    feedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            trim: true,
            maxlength: 1000
        },
        submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        submittedAt: Date
    },
    statusHistory: [{
        status: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now }
    }],
    workDescription: String,
    partsUsed: String,
    laborHours: Number,
    completedAt: Date
}, {
    timestamps: true
});

requestSchema.methods.addComment = function(userId, text) {
    this.comments.push({ user: userId, text });
};

// Автогенерація requestNumber типу REQ-2026-0010
requestSchema.pre('save', async function(next) {
    if (!this.requestNumber) {
        const year = new Date().getFullYear();
        const count = await mongoose.model('Request').countDocuments({
            requestNumber: new RegExp(`^REQ-${year}-`)
        });
        this.requestNumber = `REQ-${year}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

requestSchema.methods.changeStatus = function(newStatus, userId) {
    this.statusHistory.push({
        status: newStatus,
        changedBy: userId
    });
    this.status = newStatus;
};

requestSchema.virtual('completionTime').get(function() {
    if (!this.completedAt || !this.createdAt) return null;
    return this.completedAt - this.createdAt;
});

module.exports = mongoose.model('Request', requestSchema);
