const mongoose = require('mongoose');
const logger = require('../../utils/logger');

const dbConfig = {
    connect: async () => {
        try {
            const options = {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                autoIndex: true,
                serverSelectionTimeoutMS: 5000, // Timeout after 5s
                socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
            };

            await mongoose.connect(process.env.MONGODB_URI, options);
            logger.info('Successfully connected to MongoDB.');

            mongoose.connection.on('error', (err) => {
                logger.error('MongoDB connection error:', err);
            });

            mongoose.connection.on('disconnected', () => {
                logger.warn('MongoDB connection disconnected');
            });

            // Handle process termination
            process.on('SIGINT', async () => {
                try {
                    await mongoose.connection.close();
                    logger.info('MongoDB connection closed due to app termination');
                    process.exit(0);
                } catch (err) {
                    logger.error('Error closing MongoDB connection:', err);
                    process.exit(1);
                }
            });

        } catch (error) {
            logger.error('Error connecting to MongoDB:', error);
            process.exit(1);
        }
    },

    // Helper function to check if database is connected
    isConnected: () => {
        return mongoose.connection.readyState === 1;
    },

    // Helper function to close database connection
    closeConnection: async () => {
        try {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed');
        } catch (error) {
            logger.error('Error closing MongoDB connection:', error);
            throw error;
        }
    }
};

module.exports = dbConfig;