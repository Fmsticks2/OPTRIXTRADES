/**
 * Validation utilities for OPTRIXTRADES
 * Provides standardized input validation functions
 */

const { ValidationError } = require('./errorHandler');

/**
 * Validates that a value is not empty
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error message
 * @throws {ValidationError} If validation fails
 */
const validateRequired = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`, { field: fieldName });
  }
};

/**
 * Validates that a value is a string
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error message
 * @throws {ValidationError} If validation fails
 */
const validateString = (value, fieldName) => {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, { field: fieldName });
  }
};

/**
 * Validates that a value is a number
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error message
 * @throws {ValidationError} If validation fails
 */
const validateNumber = (value, fieldName) => {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(`${fieldName} must be a number`, { field: fieldName });
  }
};

/**
 * Validates that a value is a boolean
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error message
 * @throws {ValidationError} If validation fails
 */
const validateBoolean = (value, fieldName) => {
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${fieldName} must be a boolean`, { field: fieldName });
  }
};

/**
 * Validates that a value is a valid date
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error message
 * @throws {ValidationError} If validation fails
 */
const validateDate = (value, fieldName) => {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid date`, { field: fieldName });
  }
};

/**
 * Validates that a value is within a specified range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {string} fieldName - Name of the field for error message
 * @throws {ValidationError} If validation fails
 */
const validateRange = (value, min, max, fieldName) => {
  validateNumber(value, fieldName);
  if (value < min || value > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max}`, {
      field: fieldName,
      min,
      max
    });
  }
};

/**
 * Validates that a value matches a regular expression pattern
 * @param {string} value - Value to validate
 * @param {RegExp} pattern - Regular expression pattern
 * @param {string} fieldName - Name of the field for error message
 * @param {string} customMessage - Custom error message (optional)
 * @throws {ValidationError} If validation fails
 */
const validatePattern = (value, pattern, fieldName, customMessage) => {
  validateString(value, fieldName);
  if (!pattern.test(value)) {
    const message = customMessage || `${fieldName} has an invalid format`;
    throw new ValidationError(message, { field: fieldName });
  }
};

/**
 * Validates that a value is one of a set of allowed values
 * @param {*} value - Value to validate
 * @param {Array} allowedValues - Array of allowed values
 * @param {string} fieldName - Name of the field for error message
 * @throws {ValidationError} If validation fails
 */
const validateEnum = (value, allowedValues, fieldName) => {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      { field: fieldName, allowedValues }
    );
  }
};

/**
 * Validates a Telegram ID format
 * @param {string} value - Value to validate
 * @param {string} fieldName - Name of the field for error message
 * @throws {ValidationError} If validation fails
 */
const validateTelegramId = (value, fieldName = 'Telegram ID') => {
  validateString(value, fieldName);
  // Telegram IDs are numeric strings
  if (!/^\d+$/.test(value)) {
    throw new ValidationError(`${fieldName} must be a valid Telegram ID`, { field: fieldName });
  }
};

/**
 * Validates a broker UID format
 * @param {string} value - Value to validate
 * @param {string} fieldName - Name of the field for error message
 * @throws {ValidationError} If validation fails
 */
const validateBrokerUid = (value, fieldName = 'Broker UID') => {
  validateString(value, fieldName);
  // This pattern should be adjusted based on the actual broker UID format
  if (!/^[A-Za-z0-9]{5,20}$/.test(value)) {
    throw new ValidationError(
      `${fieldName} must be 5-20 alphanumeric characters`,
      { field: fieldName }
    );
  }
};

/**
 * Validates a deposit amount
 * @param {number} value - Value to validate
 * @param {string} fieldName - Name of the field for error message
 * @throws {ValidationError} If validation fails
 */
const validateDepositAmount = (value, fieldName = 'Deposit amount') => {
  validateNumber(value, fieldName);
  if (value <= 0) {
    throw new ValidationError(`${fieldName} must be greater than 0`, { field: fieldName });
  }
};

/**
 * Sanitizes a string by removing potentially dangerous characters
 * @param {string} value - String to sanitize
 * @returns {string} - Sanitized string
 */
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  // Remove HTML tags and special characters
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
};

/**
 * Sanitizes an object by sanitizing all string properties
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Check if an object has a specific field
 * @param {Object} obj - Object to check
 * @param {string} field - Field name to check for
 * @returns {boolean} - True if field exists and is not empty
 */
const hasField = (obj, field) => {
  return obj && obj[field] !== undefined && obj[field] !== null && obj[field] !== '';
};

/**
 * Check if a value matches a pattern
 * @param {string} value - Value to check
 * @param {RegExp} pattern - Pattern to match against
 * @returns {boolean} - True if value matches pattern
 */
const matchesPattern = (value, pattern) => {
  if (typeof value !== 'string') return false;
  return pattern.test(value);
};

/**
 * Check if a value is within a range
 * @param {number} value - Value to check
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} - True if value is within range
 */
const isInRange = (value, min, max) => {
  if (typeof value !== 'number' || isNaN(value)) return false;
  return value >= min && value <= max;
};

/**
 * Check if a value is one of the allowed values
 * @param {*} value - Value to check
 * @param {Array} allowedValues - Array of allowed values
 * @returns {boolean} - True if value is in allowedValues
 */
const isOneOf = (value, allowedValues) => {
  return allowedValues.includes(value);
};

/**
 * Check if a string is a valid broker UID
 * @param {string} value - Value to check
 * @returns {boolean} - True if value is a valid broker UID
 */
const isValidBrokerUid = (value) => {
  if (typeof value !== 'string') return false;
  return /^[A-Za-z0-9]{5,20}$/.test(value);
};

/**
 * Parse a deposit amount from a string
 * @param {string} value - String to parse
 * @returns {number|null} - Parsed amount or null if invalid
 */
const parseDepositAmount = (value) => {
  if (typeof value !== 'string') return null;
  // Remove currency symbols and commas
  const cleanValue = value.replace(/[$,]/g, '');
  const amount = parseFloat(cleanValue);
  return isNaN(amount) ? null : amount;
};

// Group validation functions into validator object
const validator = {
  validateRequired,
  validateString,
  validateNumber,
  validateBoolean,
  validateDate,
  validateRange,
  validatePattern,
  validateEnum,
  validateTelegramId,
  validateBrokerUid,
  validateDepositAmount,
  hasField,
  matchesPattern,
  isInRange,
  isOneOf,
  isValidBrokerUid,
  parseDepositAmount
};

// Group sanitization functions into sanitizer object
const sanitizer = {
  sanitizeString,
  sanitizeObject
};

module.exports = {
  validator,
  sanitizer,
  // For backward compatibility
  validateRequired,
  validateString,
  validateNumber,
  validateBoolean,
  validateDate,
  validateRange,
  validatePattern,
  validateEnum,
  validateTelegramId,
  validateBrokerUid,
  validateDepositAmount,
  sanitizeString,
  sanitizeObject
};