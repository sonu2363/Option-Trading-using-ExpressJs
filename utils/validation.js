const logger = require('./logger');

class ValidationError extends Error {
    constructor(message, fields) {
        super(message);
        this.name = 'ValidationError';
        this.fields = fields;
    }
}

const validate = {
    // User validation
    user: {
        register: (data) => {
            const errors = {};

            if (!data.username || data.username.length < 3) {
                errors.username = 'Username must be at least 3 characters long';
            }

            if (!data.email || !isValidEmail(data.email)) {
                errors.email = 'Please provide a valid email address';
            }

            if (!data.password || data.password.length < 6) {
                errors.password = 'Password must be at least 6 characters long';
            }

            if (Object.keys(errors).length > 0) {
                throw new ValidationError('Invalid user data', errors);
            }
        },

        update: (data) => {
            const errors = {};

            if (data.username && data.username.length < 3) {
                errors.username = 'Username must be at least 3 characters long';
            }

            if (data.email && !isValidEmail(data.email)) {
                errors.email = 'Please provide a valid email address';
            }

            if (Object.keys(errors).length > 0) {
                throw new ValidationError('Invalid user data', errors);
            }
        }
    },

    // Event validation
    event: {
        create: (data) => {
            const errors = {};

            if (!data.title || data.title.trim().length < 3) {
                errors.title = 'Title must be at least 3 characters long';
            }

            if (!data.type || !['sports', 'politics', 'economics', 'other'].includes(data.type)) {
                errors.type = 'Invalid event type';
            }

            if (!data.startTime || !isValidDate(data.startTime)) {
                errors.startTime = 'Please provide a valid start time';
            }

            if (!Array.isArray(data.odds) || data.odds.length === 0) {
                errors.odds = 'Event must have at least one odds option';
            } else {
                data.odds.forEach((odd, index) => {
                    if (!odd.option || !odd.value || odd.value < 1.0) {
                        errors[`odds.${index}`] = 'Invalid odds format';
                    }
                });
            }

            if (Object.keys(errors).length > 0) {
                throw new ValidationError('Invalid event data', errors);
            }
        },

        update: (data) => {
            const errors = {};

            if (data.status && !['upcoming', 'live', 'completed', 'cancelled'].includes(data.status)) {
                errors.status = 'Invalid event status';
            }

            if (data.odds) {
                if (!Array.isArray(data.odds)) {
                    errors.odds = 'Odds must be an array';
                } else {
                    data.odds.forEach((odd, index) => {
                        if (!odd.option || !odd.value || odd.value < 1.0) {
                            errors[`odds.${index}`] = 'Invalid odds format';
                        }
                    });
                }
            }

            if (Object.keys(errors).length > 0) {
                throw new ValidationError('Invalid event data', errors);
            }
        }
    },

    // Trade validation
    trade: {
        create: (data) => {
            const errors = {};

            if (!data.eventId) {
                errors.eventId = 'Event ID is required';
            }

            if (!data.amount || data.amount <= 0) {
                errors.amount = 'Amount must be greater than 0';
            }

            if (!data.selectedOption) {
                errors.selectedOption = 'Selected option is required';
            }

            if (Object.keys(errors).length > 0) {
                throw new ValidationError('Invalid trade data', errors);
            }
        }
    }
};

// Helper functions
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const isValidDate = (date) => {
    const timestamp = Date.parse(date);
    return !isNaN(timestamp);
};

// Middleware factory for validation
const validateRequest = (validationType, dataType) => {
    return (req, res, next) => {
        try {
            validate[dataType][validationType](req.body);
            next();
        } catch (error) {
            if (error instanceof ValidationError) {
                logger.warn('Validation error:', error.fields);
                return res.status(400).json({
                    message: error.message,
                    errors: error.fields
                });
            }
            next(error);
        }
    };
};

module.exports = {
    validate,
    validateRequest,
    ValidationError
};