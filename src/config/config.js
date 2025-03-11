const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

const config = {
    // Server configuration
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development',
        apiPrefix: '/api'
    },

    // Database configuration
    database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/trading-platform',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            autoIndex: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        }
    },

    // Authentication configuration
    auth: {
        jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
        jwtExpiration: '24h',
        saltRounds: 10
    },

    // WebSocket configuration
    websocket: {
        path: '/ws',
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST']
        }
    },

    // CORS configuration
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization']
    },

    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        dir: path.join(__dirname, '../../logs'),
        format: process.env.LOG_FORMAT || 'combined'
    },

    // Rate limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    },

    // Trading configuration
    trading: {
        minTradeAmount: 1,
        maxTradeAmount: 1000000,
        defaultOddsTimeout: 5000, // 5 seconds
        settlementDelay: 60000 // 1 minute
    },

    // Event configuration
    events: {
        types: ['sports', 'politics', 'economics', 'other'],
        statuses: ['upcoming', 'live', 'completed', 'cancelled'],
        monitoringInterval: 5000 // 5 seconds
    },

    // Security configuration
    security: {
        bcrypt: {
            saltRounds: 10
        },
        helmet: {
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", 'data:', 'https:'],
                }
            }
        }
    }
};

// Environment specific configurations
if (config.server.env === 'development') {
    config.logging.level = 'debug';
    config.security.helmet.contentSecurityPolicy = false;
}

if (config.server.env === 'production') {
    config.cors.origin = process.env.CORS_ORIGIN;
    config.logging.format = 'combined';
    config.security.helmet.contentSecurityPolicy = true;
}

// Validation function to ensure all required environment variables are set
const validateConfig = () => {
    const requiredEnvVars = [
        'MONGODB_URI',
        'JWT_SECRET'
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

    if (missingEnvVars.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missingEnvVars.join(', ')}`
        );
    }
};

// Validate configuration on startup
validateConfig();

module.exports = config;