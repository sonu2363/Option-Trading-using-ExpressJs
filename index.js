const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const socketIO = require('socket.io');
const dbConfig = require('./src/config/database');
const config = require('./src/config/config');
const logger = require('./utils/logger');
const { setupWebSocket } = require('./src/services/websocket');
const { globalErrorHandler } = require('./src/middleware/error');
const DataFetchService = require('./src/services/dataFetchService');


// Import routes
const authRoutes = require('./src/routes/auth');
const eventRoutes = require('./src/routes/events');
const tradeRoutes = require('./src/routes/trades');
const errorHandler = require('./src/middleware/error');

// Initialize express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = socketIO(httpServer, {
    path: config.websocket.path,
    cors: config.websocket.cors
});

// Middleware
app.use(helmet());
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use(`${config.server.apiPrefix}/auth`, authRoutes);
app.use(`${config.server.apiPrefix}/events`, eventRoutes);
app.use(`${config.server.apiPrefix}/trades`, tradeRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date(),
        dbConnection: dbConfig.isConnected() ? 'connected' : 'disconnected'
    });
});

// Error handling
app.use(errorHandler);

// Handle 404
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found'
    });
});

// Initialize WebSocket service
const wsService = setupWebSocket(io);

// Connect to database and start server
const startServer = async () => {
    try {
        // Connect to MongoDB
        await dbConfig.connect();

        // Start the server
        const PORT = config.server.port;
        httpServer.listen(PORT, () => {
            logger.info(`Server running in ${config.server.env} mode on port ${PORT}`);
            logger.info(`API endpoints available at ${config.server.apiPrefix}`);
            logger.info(`WebSocket server running at ${config.websocket.path}`);
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            // Graceful shutdown
            shutdown();
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (error) => {
            logger.error('Unhandled Rejection:', error);
            // Graceful shutdown
            shutdown();
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

DataFetchService.startDataSync();

// Graceful shutdown function
const shutdown = async () => {
    logger.info('Initiating graceful shutdown...');
    
    try {
        // Close database connection
        await dbConfig.closeConnection();
        
        // Close HTTP server
        httpServer.close(() => {
            logger.info('HTTP server closed');
            process.exit(0);
        });

        // Force close after 10 seconds
        setTimeout(() => {
            logger.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000);

    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
};

// Start the server
startServer();