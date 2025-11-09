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
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['new', 'assigned', 'in_progress', 'completed', 'cancelled'],
        default: 'new',
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        index: true
    },
    photosBefore: [String],
    photosAfter: [String],
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: String,
        createdAt: { type: Date, default: Date.now }
    }],
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
