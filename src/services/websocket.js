const EventService = require('./eventService');
const logger = require('../../utils/logger');

class WebSocketService {
    constructor(io) {
        this.io = io;
        this.connectedUsers = new Map();
    }

    // Initialize WebSocket connections
    initialize() {
        this.io.on('connection', (socket) => {
            logger.info(`New WebSocket connection: ${socket.id}`);

            // Handle user authentication
            socket.on('authenticate', (token) => {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    this.connectedUsers.set(socket.id, decoded.userId);
                    socket.join(`user_${decoded.userId}`);
                    logger.info(`User ${decoded.userId} authenticated on socket ${socket.id}`);
                } catch (error) {
                    logger.error('WebSocket authentication error:', error);
                    socket.emit('error', { message: 'Authentication failed' });
                }
            });

            // Subscribe to event updates
            socket.on('subscribe_event', (eventId) => {
                socket.join(`event_${eventId}`);
                logger.info(`Socket ${socket.id} subscribed to event ${eventId}`);
            });

            // Unsubscribe from event updates
            socket.on('unsubscribe_event', (eventId) => {
                socket.leave(`event_${eventId}`);
                logger.info(`Socket ${socket.id} unsubscribed from event ${eventId}`);
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                const userId = this.connectedUsers.get(socket.id);
                if (userId) {
                    this.connectedUsers.delete(socket.id);
                    logger.info(`User ${userId} disconnected from socket ${socket.id}`);
                }
            });
        });

        // Start monitoring events for updates
        this.startEventMonitoring();
    }

    // Broadcast event updates
    broadcastEventUpdate(eventId, data) {
        this.io.to(`event_${eventId}`).emit('event_update', {
            eventId,
            ...data
        });
    }

    // Send personal trade update
    sendTradeUpdate(userId, data) {
        this.io.to(`user_${userId}`).emit('trade_update', data);
    }

    // Monitor events for updates
    async startEventMonitoring() {
        try {
            setInterval(async () => {
                const liveEvents = await EventService.monitorLiveEvents();
                
                for (const event of liveEvents) {
                    this.broadcastEventUpdate(event._id, {
                        type: 'odds_update',
                        odds: event.odds,
                        status: event.status
                    });
                }
            }, 5000); // Check every 5 seconds
        } catch (error) {
            logger.error('Error in event monitoring:', error);
        }
    }

    // Notify users about trade settlement
    notifyTradeSettlement(trade) {
        this.sendTradeUpdate(trade.user, {
            type: 'trade_settled',
            tradeId: trade._id,
            settledAmount: trade.settledAmount,
            result: trade.result
        });
    }

    // Broadcast event completion
    broadcastEventCompletion(event) {
        this.broadcastEventUpdate(event._id, {
            type: 'event_completed',
            result: event.result,
            status: 'completed'
        });
    }

    // Handle errors
    handleError(socket, error) {
        logger.error('WebSocket error:', error);
        socket.emit('error', {
            message: 'An error occurred',
            timestamp: new Date()
        });
    }
}

// Setup function to initialize WebSocket service
const setupWebSocket = (io) => {
    const wsService = new WebSocketService(io);
    wsService.initialize();
    return wsService;
};

module.exports = {
    setupWebSocket
};