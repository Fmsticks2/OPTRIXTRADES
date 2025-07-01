/**
 * Controller Middleware for OPTRIXTRADES
 * Provides middleware functions for controllers
 */

const { bot } = require('../config/bot');
const { logger } = require('../utils/logger');
const { handleError, AppError } = require('../utils/errorHandler');

/**
 * Middleware to handle errors in controllers
 * @param {Function} handler - The handler function
 * @returns {Function} - Wrapped handler with error handling
 */
const errorHandler = (handler) => {
  return async (msg, ...args) => {
    try {
      return await handler(msg, ...args);
    } catch (error) {
      const userId = msg?.from?.id;
      const chatId = msg?.chat?.id || userId;
      const context = handler.name || 'anonymous_handler';
      
      // Handle the error
      const errorResponse = handleError(error, userId, context);
      
      // Send user-friendly error message
      if (chatId) {
        let errorMessage = 'Sorry, an error occurred while processing your request.';
        
        // Provide more specific message for known error types
        if (error instanceof AppError) {
          switch (error.errorCode) {
            case 'VALIDATION_ERROR':
              errorMessage = `Invalid input: ${error.message}`;
              break;
            case 'AUTHENTICATION_ERROR':
              errorMessage = 'Authentication failed. Please try again.';
              break;
            case 'AUTHORIZATION_ERROR':
              errorMessage = 'You do not have permission to perform this action.';
              break;
            case 'NOT_FOUND_ERROR':
              errorMessage = `Not found: ${error.message}`;
              break;
            case 'SERVICE_UNAVAILABLE':
              errorMessage = 'This service is temporarily unavailable. Please try again later.';
              break;
            default:
              errorMessage = error.message || errorMessage;
          }
        }
        
        await bot.sendMessage(chatId, errorMessage);
      }
    }
  };
};

/**
 * Middleware to track user activity
 * @param {Function} handler - The handler function
 * @returns {Function} - Wrapped handler with activity tracking
 */
const trackActivity = (handler) => {
  return async (msg, ...args) => {
    try {
      const userId = msg?.from?.id;
      const username = msg?.from?.username;
      const handlerName = handler.name || 'anonymous_handler';
      
      if (userId) {
        logger.info(`User activity: ${handlerName}`, {
          userId,
          username,
          handler: handlerName,
          timestamp: new Date().toISOString()
        });
      }
      
      return await handler(msg, ...args);
    } catch (error) {
      logger.error('Error in trackActivity middleware:', error);
      throw error;
    }
  };
};

/**
 * Middleware to handle callback queries
 * @param {Function} handler - The handler function
 * @returns {Function} - Wrapped handler with callback query handling
 */
const handleCallbackQuery = (handler) => {
  return async (query, ...args) => {
    try {
      // Execute the handler
      await handler(query, ...args);
      
      // Answer the callback query to remove the loading state
      if (!query.answered) {
        await bot.answerCallbackQuery(query.id);
        query.answered = true;
      }
    } catch (error) {
      const userId = query?.from?.id;
      const context = handler.name || 'anonymous_callback_handler';
      
      // Handle the error
      const errorResponse = handleError(error, userId, context);
      
      // Answer the callback query with error message
      if (!query.answered) {
        await bot.answerCallbackQuery(query.id, {
          text: 'An error occurred. Please try again.',
          show_alert: true
        });
        query.answered = true;
      }
      
      // Send detailed error message to chat if possible
      if (query?.message?.chat?.id) {
        await bot.sendMessage(
          query.message.chat.id,
          `Sorry, an error occurred: ${errorResponse.error.message}`
        );
      }
    }
  };
};

/**
 * Middleware to validate required parameters
 * @param {Array<string>} requiredParams - Array of required parameter names
 * @returns {Function} - Middleware function
 */
const validateParams = (requiredParams = []) => {
  return (handler) => {
    return async (msg, ...args) => {
      try {
        const chatId = msg?.chat?.id || msg?.from?.id;
        
        // Check for text in message
        if (requiredParams.includes('text') && !msg.text) {
          await bot.sendMessage(chatId, 'Text message is required for this command.');
          return;
        }
        
        // Check for photo in message
        if (requiredParams.includes('photo') && !msg.photo) {
          await bot.sendMessage(chatId, 'Photo is required for this command.');
          return;
        }
        
        // Check for document in message
        if (requiredParams.includes('document') && !msg.document) {
          await bot.sendMessage(chatId, 'Document is required for this command.');
          return;
        }
        
        // Check for callback_query data
        if (requiredParams.includes('callback_data') && (!msg.data || typeof msg.data !== 'string')) {
          await bot.answerCallbackQuery(msg.id, 'Invalid callback data');
          return;
        }
        
        // Continue to the handler
        return await handler(msg, ...args);
      } catch (error) {
        logger.error('Error in validateParams middleware:', error);
        throw error;
      }
    };
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

/**
 * Create a controller with standard middleware applied
 * @param {Function} handler - The handler function
 * @param {Object} options - Middleware options
 * @returns {Function} - Handler with standard middleware applied
 */
const createController = (handler, options = {}) => {
  const {
    trackUserActivity = true,
    handleErrors = true,
    requiredParams = [],
    isCallbackQuery = false,
    customMiddleware = []
  } = options;
  
  const middlewares = [
    ...customMiddleware
  ];
  
  // Add standard middleware based on options
  if (trackUserActivity) {
    middlewares.push(trackActivity);
  }
  
  if (requiredParams.length > 0) {
    middlewares.push(validateParams(requiredParams));
  }
  
  if (isCallbackQuery) {
    middlewares.push(handleCallbackQuery);
  }
  
  // Error handler should be the outermost middleware
  if (handleErrors) {
    middlewares.push(errorHandler);
  }
  
  return applyMiddleware(handler, middlewares);
};

module.exports = {
  errorHandler,
  trackActivity,
  handleCallbackQuery,
  validateParams,
  applyMiddleware,
  createController
};