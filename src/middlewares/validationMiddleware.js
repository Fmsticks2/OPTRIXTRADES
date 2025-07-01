/**
 * Validation Middleware for OPTRIXTRADES
 * Provides middleware functions for validating and sanitizing input data
 */

const { validator, sanitizer } = require('../utils/validator');
const { ValidationError } = require('../utils/errorHandler');
const { logger } = require('../utils/logger');

/**
 * Validates required fields in the input data
 * @param {Array<string>} requiredFields - List of required field names
 * @returns {Function} - Middleware function
 */
const validateRequired = (requiredFields) => (ctx, next) => {
  const message = ctx.message || {};
  const text = message.text || '';
  const callbackQuery = ctx.callbackQuery || {};
  const data = callbackQuery.data || '';
  
  // For text messages, check if all required fields are present
  if (message && text) {
    const missingFields = requiredFields.filter(field => {
      // Special case for command validation
      if (field === 'command' && text.startsWith('/')) {
        return false;
      }
      
      // Check if the field exists in the message
      return !validator.hasField(message, field);
    });
    
    if (missingFields.length > 0) {
      const errorMessage = `Missing required fields: ${missingFields.join(', ')}`;
      logger.warn(`Validation error: ${errorMessage}`, { userId: message.from?.id });
      throw new ValidationError(errorMessage);
    }
  }
  
  // For callback queries, check if data is present
  if (callbackQuery && requiredFields.includes('callbackData') && !data) {
    const errorMessage = 'Missing callback data';
    logger.warn(`Validation error: ${errorMessage}`, { userId: callbackQuery.from?.id });
    throw new ValidationError(errorMessage);
  }
  
  return next();
};

/**
 * Validates that the input matches a specific pattern
 * @param {string} field - Field to validate
 * @param {RegExp} pattern - Regular expression pattern
 * @param {string} errorMessage - Custom error message
 * @returns {Function} - Middleware function
 */
const validatePattern = (field, pattern, errorMessage) => (ctx, next) => {
  const message = ctx.message || {};
  const text = message.text || '';
  const callbackQuery = ctx.callbackQuery || {};
  const data = callbackQuery.data || '';
  
  let valueToValidate = '';
  
  // Determine which value to validate based on the field
  if (field === 'text' && message) {
    valueToValidate = text;
  } else if (field === 'callbackData' && callbackQuery) {
    valueToValidate = data;
  } else if (message && message[field]) {
    valueToValidate = message[field];
  }
  
  // Validate the value against the pattern
  if (valueToValidate && !validator.matchesPattern(valueToValidate, pattern)) {
    const defaultErrorMessage = `Invalid format for ${field}`;
    logger.warn(`Validation error: ${errorMessage || defaultErrorMessage}`, { userId: ctx.from?.id });
    throw new ValidationError(errorMessage || defaultErrorMessage);
  }
  
  return next();
};

/**
 * Validates that the input is within a numeric range
 * @param {string} field - Field to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} errorMessage - Custom error message
 * @returns {Function} - Middleware function
 */
const validateRange = (field, min, max, errorMessage) => (ctx, next) => {
  const message = ctx.message || {};
  const text = message.text || '';
  
  // Extract the value to validate
  let valueToValidate;
  
  if (field === 'text') {
    // Try to parse a number from the text
    valueToValidate = parseFloat(text);
  } else if (message[field]) {
    valueToValidate = parseFloat(message[field]);
  }
  
  // Validate the value is within range
  if (valueToValidate !== undefined && !validator.isInRange(valueToValidate, min, max)) {
    const defaultErrorMessage = `Value for ${field} must be between ${min} and ${max}`;
    logger.warn(`Validation error: ${errorMessage || defaultErrorMessage}`, { userId: ctx.from?.id });
    throw new ValidationError(errorMessage || defaultErrorMessage);
  }
  
  return next();
};

/**
 * Validates that the input is one of the allowed values
 * @param {string} field - Field to validate
 * @param {Array<string>} allowedValues - List of allowed values
 * @param {string} errorMessage - Custom error message
 * @returns {Function} - Middleware function
 */
const validateEnum = (field, allowedValues, errorMessage) => (ctx, next) => {
  const message = ctx.message || {};
  const text = message.text || '';
  const callbackQuery = ctx.callbackQuery || {};
  const data = callbackQuery.data || '';
  
  let valueToValidate = '';
  
  // Determine which value to validate based on the field
  if (field === 'text' && message) {
    valueToValidate = text;
  } else if (field === 'callbackData' && callbackQuery) {
    valueToValidate = data;
  } else if (message && message[field]) {
    valueToValidate = message[field];
  }
  
  // Validate the value is one of the allowed values
  if (valueToValidate && !validator.isOneOf(valueToValidate, allowedValues)) {
    const defaultErrorMessage = `Value for ${field} must be one of: ${allowedValues.join(', ')}`;
    logger.warn(`Validation error: ${errorMessage || defaultErrorMessage}`, { userId: ctx.from?.id });
    throw new ValidationError(errorMessage || defaultErrorMessage);
  }
  
  return next();
};

/**
 * Sanitizes the input text
 * @returns {Function} - Middleware function
 */
const sanitizeText = () => (ctx, next) => {
  const message = ctx.message || {};
  
  if (message.text) {
    message.text = sanitizer.sanitizeString(message.text);
  }
  
  if (message.caption) {
    message.caption = sanitizer.sanitizeString(message.caption);
  }
  
  return next();
};

/**
 * Sanitizes callback query data
 * @returns {Function} - Middleware function
 */
const sanitizeCallbackData = () => (ctx, next) => {
  const callbackQuery = ctx.callbackQuery || {};
  
  if (callbackQuery.data) {
    callbackQuery.data = sanitizer.sanitizeString(callbackQuery.data);
  }
  
  return next();
};

/**
 * Validates a deposit amount
 * @param {string} field - Field containing the deposit amount
 * @param {number} minAmount - Minimum allowed amount
 * @param {string} errorMessage - Custom error message
 * @returns {Function} - Middleware function
 */
const validateDepositAmount = (field, minAmount = 0, errorMessage) => (ctx, next) => {
  const message = ctx.message || {};
  const text = message.text || '';
  
  // Extract the deposit amount
  let depositAmount;
  
  if (field === 'text') {
    // Try to parse a number from the text
    depositAmount = validator.parseDepositAmount(text);
  } else if (message[field]) {
    depositAmount = validator.parseDepositAmount(message[field]);
  }
  
  // Validate the deposit amount
  if (depositAmount === null || depositAmount < minAmount) {
    const defaultErrorMessage = `Invalid deposit amount. Minimum amount is $${minAmount}`;
    logger.warn(`Validation error: ${errorMessage || defaultErrorMessage}`, { userId: ctx.from?.id });
    throw new ValidationError(errorMessage || defaultErrorMessage);
  }
  
  // Add the parsed deposit amount to the context
  ctx.depositAmount = depositAmount;
  
  return next();
};

/**
 * Validates a broker UID format
 * @param {string} field - Field containing the broker UID
 * @param {string} errorMessage - Custom error message
 * @returns {Function} - Middleware function
 */
const validateBrokerUid = (field, errorMessage) => (ctx, next) => {
  const message = ctx.message || {};
  const text = message.text || '';
  
  // Extract the broker UID
  let brokerUid;
  
  if (field === 'text') {
    brokerUid = text;
  } else if (message[field]) {
    brokerUid = message[field];
  }
  
  // Validate the broker UID format
  if (!validator.isValidBrokerUid(brokerUid)) {
    const defaultErrorMessage = 'Invalid broker UID format';
    logger.warn(`Validation error: ${errorMessage || defaultErrorMessage}`, { userId: ctx.from?.id });
    throw new ValidationError(errorMessage || defaultErrorMessage);
  }
  
  return next();
};

/**
 * Composes multiple middleware functions into a single middleware
 * @param {...Function} middlewares - Middleware functions to compose
 * @returns {Function} - Composed middleware function
 */
const compose = (...middlewares) => (ctx, next) => {
  // Execute each middleware in sequence
  const executeMiddleware = (index) => {
    if (index >= middlewares.length) {
      return next();
    }
    
    const middleware = middlewares[index];
    return middleware(ctx, () => executeMiddleware(index + 1));
  };
  
  return executeMiddleware(0);
};

module.exports = {
  validateRequired,
  validatePattern,
  validateRange,
  validateEnum,
  sanitizeText,
  sanitizeCallbackData,
  validateDepositAmount,
  validateBrokerUid,
  compose
};