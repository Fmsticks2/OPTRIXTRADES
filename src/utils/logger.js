const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define log directory
const logDir = path.join(process.cwd(), 'logs');

// Create logs directory if it doesn't exist
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    console.log(`Created logs directory at ${logDir}`);
  }
} catch (error) {
  console.error(`Error creating logs directory: ${error.message}`);
  // In production environments like Render, we might not have write access to create directories
  // In this case, we'll just log to console
}

// Determine if we should log to files based on environment
const isProduction = process.env.NODE_ENV === 'production';
const canWriteToFileSystem = process.env.CAN_WRITE_LOGS !== 'false';

// Create transports array
const transports = [
  // Write logs to console
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(
        info => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
      )
    )
  })
];

// Add file transports if we can write to the file system
if (canWriteToFileSystem) {
  try {
    transports.push(
      // Write error logs to file
      new winston.transports.File({ 
        filename: path.join(logDir, 'error.log'), 
        level: 'error' 
      }),
      // Write all logs to file
      new winston.transports.File({ 
        filename: path.join(logDir, 'combined.log') 
      })
    );
  } catch (error) {
    console.error(`Error setting up file transports: ${error.message}`);
  }
}

// Create logger instance
const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'optrixtrades-bot' },
  transports: transports,
  exceptionHandlers: canWriteToFileSystem ? [
    new winston.transports.File({ 
      filename: path.join(logDir, 'exceptions.log') 
    })
  ] : [],
  exitOnError: false // Prevent Winston from exiting on uncaught exceptions
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