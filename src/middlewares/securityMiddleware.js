/**
 * Security Middleware for OPTRIXTRADES
 * Provides security-related middleware functions
 */

const { logger } = require('../utils/logger');
const { ValidationError, AuthorizationError } = require('../utils/errorHandler');
const { sanitizeObject } = require('../utils/validator');
const { bot, isAdmin } = require('../config/bot');

/**
 * Middleware to sanitize user input
 * @param {Function} handler - The handler function
 * @returns {Function} - Wrapped handler with input sanitization
 */
const sanitizeInput = (handler) => {
  return async (msg, ...args) => {
    try {
      // Sanitize message object
      if (msg && typeof msg === 'object') {
        // Sanitize text field if present
        if (msg.text) {
          msg.text = sanitizeObject(msg.text);
        }
        
        // Sanitize caption field if present
        if (msg.caption) {
          msg.caption = sanitizeObject(msg.caption);
        }
      }
      
      // Continue to the handler
      return await handler(msg, ...args);
    } catch (error) {
      logger.error('Error in sanitizeInput middleware:', error);
      throw error;
    }
  };
};

/**
 * Middleware to check if user is an admin
 * @param {Function} handler - The handler function
 * @returns {Function} - Wrapped handler with admin check
 */
const adminOnly = (handler) => {
  return async (msg, ...args) => {
    try {
      const chatId = msg.chat?.id || msg.from?.id;
      
      if (!chatId) {
        throw new ValidationError('Invalid message format');
      }
      
      // Check if user is an admin
      if (!isAdmin(chatId.toString())) {
        logger.warn(`Unauthorized access attempt to admin function by user ${chatId}`);
        await bot.sendMessage(chatId, 'You do not have permission to access this function.');
        return;
      }
      
      // Continue to the handler
      return await handler(msg, ...args);
    } catch (error) {
      logger.error('Error in adminOnly middleware:', error);
      throw error;
    }
  };
};

/**
 * Middleware to rate limit requests
 * @param {number} maxRequests - Maximum number of requests allowed in the time window
 * @param {number} timeWindow - Time window in seconds
 * @returns {Function} - Middleware function
 */
const rateLimit = (maxRequests = 10, timeWindow = 60) => {
  const requests = new Map();
  
  return (handler) => {
    return async (msg, ...args) => {
      try {
        const userId = msg.from?.id;
        
        if (!userId) {
          throw new ValidationError('Invalid message format');
        }
        
        const now = Date.now();
        const userKey = userId.toString();
        
        // Get user's request history
        const userRequests = requests.get(userKey) || [];
        
        // Filter out requests outside the time window
        const recentRequests = userRequests.filter(
          timestamp => now - timestamp < timeWindow * 1000
        );
        
        // Check if user has exceeded the rate limit
        if (recentRequests.length >= maxRequests) {
          logger.warn(`Rate limit exceeded for user ${userId}`);
          await bot.sendMessage(
            msg.chat.id,
            'You are sending too many requests. Please try again later.'
          );
          return;
        }
        
        // Add current request timestamp
        recentRequests.push(now);
        requests.set(userKey, recentRequests);
        
        // Continue to the handler
        return await handler(msg, ...args);
      } catch (error) {
        logger.error('Error in rateLimit middleware:', error);
        throw error;
      }
    };
  };
};

/**
 * Middleware to track verification attempts for security monitoring
 * @param {Function} handler - The handler function
 * @returns {Function} - Wrapped handler with verification tracking
 */
const trackVerificationAttempt = (handler) => {
  // Map to store verification attempts by user
  const verificationAttempts = new Map();
  
  return async (msg, ...args) => {
    try {
      const userId = msg.from?.id;
      
      if (!userId) {
        throw new ValidationError('Invalid message format');
      }
      
      const userKey = userId.toString();
      const now = Date.now();
      
      // Get user's verification attempts
      const userAttempts = verificationAttempts.get(userKey) || [];
      
      // Add current attempt
      userAttempts.push(now);
      
      // Keep only attempts from the last 24 hours
      const recentAttempts = userAttempts.filter(
        timestamp => now - timestamp < 24 * 60 * 60 * 1000
      );
      
      verificationAttempts.set(userKey, recentAttempts);
      
      // Check for suspicious activity (more than 5 attempts in 24 hours)
      if (recentAttempts.length > 5) {
        logger.warn(`Suspicious verification activity detected for user ${userId}: ${recentAttempts.length} attempts in 24 hours`);
      }
      
      // Continue to the handler
      return await handler(msg, ...args);
    } catch (error) {
      logger.error('Error in trackVerificationAttempt middleware:', error);
      throw error;
    }
  };
};

/**
 * Middleware to validate callback query data
 * @param {Function} handler - The handler function
 * @returns {Function} - Wrapped handler with callback data validation
 */
const validateCallbackData = (handler) => {
  return async (query, ...args) => {
    try {
      // Check if query has data property
      if (!query || !query.data) {
        throw new ValidationError('Invalid callback query');
      }
      
      // Validate callback data format (basic check)
      if (typeof query.data !== 'string' || query.data.length > 100) {
        logger.warn(`Invalid callback data received: ${query.data}`);
        await bot.answerCallbackQuery(query.id, 'Invalid request');
        return;
      }
      
      // Continue to the handler
      return await handler(query, ...args);
    } catch (error) {
      logger.error('Error in validateCallbackData middleware:', error);
      throw error;
    }
  };
};

/**
 * Apply multiple middleware functions to a handler
 * @param {Function} handler - The handler function
 * @param {Array<Function>} middlewares - Array of middleware functions to apply
 * @returns {Function} - Handler with all middleware applied
 */
const applyMiddleware = (handler, middlewares = []) => {
  return middlewares.reduceRight((wrappedHandler, middleware) => {
    return middleware(wrappedHandler);
  }, handler);
};

module.exports = {
  sanitizeInput,
  adminOnly,
  rateLimit,
  trackVerificationAttempt,
  validateCallbackData,
  applyMiddleware
};