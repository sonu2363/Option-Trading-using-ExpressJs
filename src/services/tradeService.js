const Trade = require('../models/Trade');
const Event = require('../models/Event');
const User = require('../models/User');
const logger = require('../../utils/logger');

class TradeService {
    // Place a new trade
    static async placeTrade(userId, eventId, amount, selectedOption) {
        try {
            // Find event and verify it's live
            const event = await Event.findById(eventId);
            if (!event || event.status !== 'live') {
                throw new Error('Event not available for trading');
            }

            // Get latest odds for selected option
            const latestOdds = event.odds
                .filter(odd => odd.option === selectedOption)
                .sort((a, b) => b.timestamp - a.timestamp)[0];

            if (!latestOdds) {
                throw new Error('Invalid trading option');
            }

            // Verify and update user balance
            const user = await User.findById(userId);
            await user.updateBalance(-amount);

            // Create and save trade
            const trade = new Trade({
                user: userId,
                event: eventId,
                amount,
                selectedOption,
                odds: latestOdds.value
            });

            await trade.save();
            await trade.populate('event', 'title type status');

            return trade;
        } catch (error) {
            logger.error('Error placing trade:', error);
            throw error;
        }
    }

    // Get user's trades
    static async getUserTrades(userId, filters = {}) {
        try {
            const query = { user: userId };
            
            if (filters.status) query.status = filters.status;
            if (filters.eventType) {
                const events = await Event.find({ type: filters.eventType })
                    .select('_id');
                query.event = { $in: events.map(e => e._id) };
            }

            return await Trade.find(query)
                .populate('event', 'title type status startTime')
                .sort({ createdAt: -1 });
        } catch (error) {
            logger.error('Error fetching user trades:', error);
            throw error;
        }
    }

    // Cancel a trade
    static async cancelTrade(tradeId, userId) {
        try {
            const trade = await Trade.findOne({
                _id: tradeId,
                user: userId,
                status: 'pending'
            }).populate('event');

            if (!trade) {
                throw new Error('Trade not found');
            }

            if (trade.event.status !== 'upcoming') {
                throw new Error('Cannot cancel trade after event has started');
            }

            // Refund user's balance
            const user = await User.findById(userId);
            await user.updateBalance(trade.amount);

            trade.status = 'cancelled';
            await trade.save();

            return trade;
        } catch (error) {
            logger.error('Error cancelling trade:', error);
            throw error;
        }
    }

    // Settle trades for an event
    static async settleEventTrades(eventId) {
        try {
            const event = await Event.findById(eventId);
            if (!event || event.status !== 'completed' || !event.result) {
                throw new Error('Event not ready for settlement');
            }

            const trades = await Trade.find({
                event: eventId,
                status: 'pending'
            });

            const results = await Promise.all(trades.map(async (trade) => {
                const user = await User.findById(trade.user);
                
                // Calculate and update winnings if correct
                if (trade.selectedOption === event.result) {
                    const winnings = trade.amount * trade.odds;
                    await user.updateBalance(winnings);
                    trade.settledAmount = winnings;
                } else {
                    trade.settledAmount = 0;
                }

                trade.status = 'settled';
                trade.result = event.result;
                await trade.save();

                return trade;
            }));

            return {
                event,
                settledTrades: results.length,
                trades: results
            };
        } catch (error) {
            logger.error('Error settling trades:', error);
            throw error;
        }
    }

    // Get trade statistics
    static async getTradeStats(userId) {
        try {
            const stats = await Trade.aggregate([
                { $match: { user: mongoose.Types.ObjectId(userId) } },
                {
                    $group: {
                        _id: null,
                        totalTrades: { $sum: 1 },
                        totalAmount: { $sum: '$amount' },
                        settledAmount: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$status', 'settled'] },
                                    '$settledAmount',
                                    0
                                ]
                            }
                        },
                        pendingTrades: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$status', 'pending'] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]);

            return stats[0] || {
                totalTrades: 0,
                totalAmount: 0,
                settledAmount: 0,
                pendingTrades: 0
            };
        } catch (error) {
            logger.error('Error getting trade stats:', error);
            throw error;
        }
    }
}

module.exports = TradeService;