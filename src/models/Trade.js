const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    selectedOption: {
        type: String,
        required: true
    },
    odds: {
        type: Number,
        required: true,
        min: 1.0
    },
    status: {
        type: String,
        enum: ['pending', 'settled', 'cancelled'],
        default: 'pending',
        index: true
    },
    result: {
        type: String,
        default: null
    },
    settledAmount: {
        type: Number,
        default: null
    },
    settledAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Indexes for common queries
tradeSchema.index({ user: 1, status: 1 });
tradeSchema.index({ event: 1, status: 1 });

// Virtual field for potential winnings
tradeSchema.virtual('potentialWinnings').get(function() {
    return this.amount * this.odds;
});

// Pre-save middleware
tradeSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status === 'settled') {
        this.settledAt = new Date();
    }
    next();
});

// Instance method to settle trade
tradeSchema.methods.settle = async function(eventResult) {
    if (this.status !== 'pending') {
        throw new Error('Trade is already settled or cancelled');
    }

    this.status = 'settled';
    this.result = eventResult;
    
    if (this.selectedOption === eventResult) {
        this.settledAmount = this.amount * this.odds;
    } else {
        this.settledAmount = 0;
    }

    this.settledAt = new Date();
    await this.save();
};

// Static method to find user's active trades
tradeSchema.statics.findActiveTrades = function(userId) {
    return this.find({
        user: userId,
        status: 'pending'
    })
    .populate('event', 'title status startTime')
    .sort({ createdAt: -1 });
};

// Static method to get trade statistics
tradeSchema.statics.getTradeStats = async function(userId) {
    const stats = await this.aggregate([
        { $match: { user: mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                totalSettled: { 
                    $sum: { 
                        $cond: [
                            { $eq: ['$status', 'settled'] },
                            '$settledAmount',
                            0
                        ]
                    }
                }
            }
        }
    ]);

    return stats;
};

const Trade = mongoose.model('Trade', tradeSchema);

module.exports = Trade;