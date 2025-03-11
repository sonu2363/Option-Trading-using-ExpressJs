const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true,
        trim: true
    },
    type: { 
        type: String, 
        required: true,
        enum: ['sports', 'politics', 'economics', 'other']
    },
    status: { 
        type: String, 
        enum: ['upcoming', 'live', 'completed', 'cancelled'],
        default: 'upcoming'
    },
    startTime: { 
        type: Date, 
        required: true 
    },
    endTime: { 
        type: Date
    },
    odds: [{
        option: {
            type: String,
            required: true
        },
        value: {
            type: Number,
            required: true,
            min: 1.0
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    result: {
        type: String,
        default: null
    },
    description: {
        type: String,
        trim: true
    },
    metadata: {
        type: Map,
        of: String
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
}, {
    timestamps: true
});

// Indexes for better query performance
eventSchema.index({ status: 1, startTime: -1 });
eventSchema.index({ type: 1 });

// Virtual for checking if event is active
eventSchema.virtual('isActive').get(function() {
    return this.status === 'live';
});

// Pre-save middleware
eventSchema.pre('save', function(next) {
    // If event is marked as completed, ensure endTime is set
    if (this.status === 'completed' && !this.endTime) {
        this.endTime = new Date();
    }
    next();
});

// Instance method to update odds
eventSchema.methods.updateOdds = function(newOdds) {
    if (this.status !== 'live') {
        throw new Error('Can only update odds for live events');
    }
    
    this.odds.push(...newOdds.map(odd => ({
        option: odd.option,
        value: odd.value,
        timestamp: new Date()
    })));
};

// Static method to find live events
eventSchema.statics.findLiveEvents = function() {
    return this.find({ 
        status: 'live',
        startTime: { $lte: new Date() },
        $or: [
            { endTime: { $gt: new Date() } },
            { endTime: null }
        ]
    }).sort({ startTime: -1 });
};

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;