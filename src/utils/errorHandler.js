/**
 * Error handling utilities for OPTRIXTRADES
 * Provides standardized error classes and handling mechanisms
 */

const { logger } = require('./logger');

/**
 * Base error class for application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', data = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.data = data;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error for validation failures
 */
class ValidationError extends AppError {
  constructor(message, data = {}) {
    super(message, 400, 'VALIDATION_ERROR', data);
  }
}

/**
 * Error for authentication failures
 */
class AuthenticationError extends AppError {
  constructor(message, data = {}) {
    super(message, 401, 'AUTHENTICATION_ERROR', data);
  }
}

/**
 * Error for authorization failures
 */
class AuthorizationError extends AppError {
  constructor(message, data = {}) {
    super(message, 403, 'AUTHORIZATION_ERROR', data);
  }
}

/**
 * Error for resource not found
 */
class NotFoundError extends AppError {
  constructor(message, data = {}) {
    super(message, 404, 'NOT_FOUND_ERROR', data);
  }
}

/**
 * Error for service unavailability
 */
class ServiceUnavailableError extends AppError {
  constructor(message, data = {}) {
    super(message, 503, 'SERVICE_UNAVAILABLE', data);
  }
}

/**
 * Error for database operations
 */
class DatabaseError extends AppError {
  constructor(message, data = {}) {
    super(message, 500, 'DATABASE_ERROR', data);
  }
}

/**
 * Error for external service failures
 */
class ExternalServiceError extends AppError {
  constructor(message, data = {}) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', data);
  }
}

/**
 * Global error handler function
 * @param {Error} error - The error object
 * @param {string} userId - User's Telegram ID (optional)
 * @param {string} context - Error context
 * @returns {Object} - Standardized error response
 */
const handleError = (error, userId = null, context = 'general') => {
  // Log the error with appropriate context
  if (userId) {
    logger.logError(userId, context, error);
  } else {
    logger.logger.error(`Error in ${context}: ${error.message}`, {
      context,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  // Determine if this is a known application error or an unexpected error
  const isAppError = error instanceof AppError;
  
  // Create standardized error response
  const errorResponse = {
    success: false,
    error: {
      message: isAppError ? error.message : 'An unexpected error occurred',
      code: isAppError ? error.errorCode : 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    }
  };

  // Add additional data for app errors
  if (isAppError && Object.keys(error.data).length > 0) {
    errorResponse.error.details = error.data;
  }

  return errorResponse;
};

/**
 * Async error handler wrapper for async functions
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Wrapped function with error handling
 */
const asyncErrorHandler = (fn) => {
  return async (msg, ...args) => {
    try {
      await fn(msg, ...args);
    } catch (error) {
      const userId = msg?.from?.id;
      const context = fn.name || 'anonymous_function';
      
      // Handle the error
      const errorResponse = handleError(error, userId, context);
      
      // Send error message to user if possible
      if (msg?.chat?.id) {
        const bot = require('../config/bot').bot;
        await bot.sendMessage(
          msg.chat.id,
          `Sorry, an error occurred: ${errorResponse.error.message}`
        );
      }
    }
  };
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ServiceUnavailableError,
  DatabaseError,
  ExternalServiceError,
  handleError,
  asyncErrorHandler
};