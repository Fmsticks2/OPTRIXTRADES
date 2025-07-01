const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define log directory
const logDir = path.join(process.cwd(), 'logs');

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'optrixtrades-bot' },
  transports: [
    // Write logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          info => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
        )
      )
    }),
    // Write all logs to file
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log') 
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'exceptions.log') 
    })
  ]
});

/**
 * Log user action
 * @param {string} userId - User's Telegram ID
 * @param {string} action - Action performed
 * @param {Object} data - Additional data
 */
const logUserAction = (userId, action, data = {}) => {
  logger.info(`User ${userId} performed ${action}`, {
    userId,
    action,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Log error with user context
 * @param {string} userId - User's Telegram ID
 * @param {string} context - Error context
 * @param {Error} error - Error object
 */
const logError = (userId, context, error) => {
  logger.error(`Error for user ${userId} in ${context}: ${error.message}`, {
    userId,
    context,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
};

/**
 * Log admin action
 * @param {string} adminId - Admin's Telegram ID
 * @param {string} action - Action performed
 * @param {Object} data - Additional data
 */
const logAdminAction = (adminId, action, data = {}) => {
  logger.info(`Admin ${adminId} performed ${action}`, {
    adminId,
    action,
    data,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  logger,
  logUserAction,
  logError,
  logAdminAction
};