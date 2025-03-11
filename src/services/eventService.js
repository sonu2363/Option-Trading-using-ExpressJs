const Event = require('../models/Event');
const Trade = require('../models/Trade');
const logger = require('../../utils/logger');

class EventService {
    // Fetch events with filters
    static async getEvents(filters = {}) {
        try {
            const query = {};
            
            if (filters.type) query.type = filters.type;
            if (filters.status) query.status = filters.status;
            if (filters.startTime) {
                query.startTime = {
                    $gte: new Date(filters.startTime)
                };
            }

            return await Event.find(query)
                .sort({ startTime: -1 });
        } catch (error) {
            logger.error('Error fetching events:', error);
            throw error;
        }
    }

    // Create new event
    static async createEvent(eventData) {
        try {
            const event = new Event({
                ...eventData,
                odds: eventData.odds.map(odd => ({
                    ...odd,
                    timestamp: new Date()
                }))
            });

            await event.save();
            return event;
        } catch (error) {
            logger.error('Error creating event:', error);
            throw error;
        }
    }

    // Update event odds
    static async updateEventOdds(eventId, newOdds) {
        try {
            const event = await Event.findById(eventId);
            if (!event) {
                throw new Error('Event not found');
            }

            if (event.status !== 'live') {
                throw new Error('Can only update odds for live events');
            }

            event.updateOdds(newOdds);
            await event.save();
            return event;
        } catch (error) {
            logger.error('Error updating odds:', error);
            throw error;
        }
    }

    // Complete event and settle trades
    static async completeEvent(eventId, result) {
        try {
            const event = await Event.findById(eventId);
            if (!event) {
                throw new Error('Event not found');
            }

            if (event.status !== 'live') {
                throw new Error('Can only complete live events');
            }

            // Update event status
            event.status = 'completed';
            event.result = result;
            event.endTime = new Date();
            await event.save();

            // Find and settle all pending trades
            const pendingTrades = await Trade.find({
                event: eventId,
                status: 'pending'
            });

            for (const trade of pendingTrades) {
                await trade.settle(result);
            }

            return {
                event,
                settledTrades: pendingTrades.length
            };
        } catch (error) {
            logger.error('Error completing event:', error);
            throw error;
        }
    }

    // Get event statistics
    static async getEventStats(eventId) {
        try {
            const trades = await Trade.aggregate([
                { $match: { event: mongoose.Types.ObjectId(eventId) } },
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

            const event = await Event.findById(eventId);
            return {
                event,
                tradeStats: trades
            };
        } catch (error) {
            logger.error('Error fetching event stats:', error);
            throw error;
        }
    }

    // Monitor live events
    static async monitorLiveEvents() {
        try {
            const liveEvents = await Event.findLiveEvents();
            
            // Additional monitoring logic can be added here
            // For example: checking if events should be marked as completed
            // or updating odds based on external data

            return liveEvents;
        } catch (error) {
            logger.error('Error monitoring live events:', error);
            throw error;
        }
    }
}

module.exports = EventService;