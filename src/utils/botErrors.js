/**
 * Bot Errors Utility
 * 
 * This file provides custom error classes and error handling utilities for bot operations.
 * It includes specialized error types for different scenarios and validation functions.
 */

/**
 * Base class for all bot-related errors
 */
class BotError extends Error {
  constructor(message, code, data = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.data = data;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when a channel operation fails
 */
class ChannelError extends BotError {
  constructor(message, code = 'CHANNEL_ERROR', data = {}) {
    super(message, code, data);
  }
}

/**
 * Error thrown when a user-related operation fails
 */
class UserError extends BotError {
  constructor(message, code = 'USER_ERROR', data = {}) {
    super(message, code, data);
  }
}

/**
 * Error thrown when a permission-related operation fails
 */
class PermissionError extends BotError {
  constructor(message, code = 'PERMISSION_ERROR', data = {}) {
    super(message, code, data);
  }
}

/**
 * Error thrown when a rate limit is exceeded
 */
class RateLimitError extends BotError {
  constructor(message, code = 'RATE_LIMIT_ERROR', data = {}) {
    super(message, code, data);
  }
}

/**
 * Error thrown when an invitation operation fails
 */
class InvitationError extends BotError {
  constructor(message, code = 'INVITATION_ERROR', data = {}) {
    super(message, code, data);
  }
}

/**
 * Map Telegram API error codes to custom error types
 * @param {Error} error - The original error from the Telegram API
 * @param {Object} context - Additional context for the error
 * @returns {BotError} - A custom error instance
 */
const mapTelegramError = (error, context = {}) => {
  // Extract error code and description from Telegram API error
  // Handle different response formats from Telegram API
  const telegramError = error.response?.body?.description || 
                        error.response?.description || 
                        error.description || 
                        error.message;
                        
  const errorCode = error.response?.body?.error_code || 
                    error.response?.error_code || 
                    error.code;
  
  // Enhanced context with original error details
  const enhancedContext = {
    ...context,
    originalError: {
      message: error.message,
      code: errorCode,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }
  };
  
  // Log the raw error for debugging purposes
  console.debug('Raw Telegram error:', {
    message: error.message,
    code: errorCode,
    response: error.response
  });
  
  // Map error codes to custom error types
  // First check by error code
  switch (errorCode) {
    case 400:
      if (telegramError?.includes('chat not found')) {
        return new ChannelError('Channel not found', 'CHANNEL_NOT_FOUND', enhancedContext);
      } else if (telegramError?.includes('user not found')) {
        return new UserError('User not found', 'USER_NOT_FOUND', enhancedContext);
      } else if (telegramError?.includes('PEER_ID_INVALID')) {
        return new UserError('Invalid user ID', 'INVALID_USER_ID', enhancedContext);
      } else if (telegramError?.includes('CHAT_ADMIN_REQUIRED')) {
        return new PermissionError('Bot must be an admin in the channel', 'ADMIN_REQUIRED', enhancedContext);
      } else if (telegramError?.includes('INVITE_REQUEST_SENT')) {
        return new InvitationError('User has already requested to join', 'INVITE_REQUEST_SENT', enhancedContext);
      } else if (telegramError?.includes('USER_ALREADY_PARTICIPANT')) {
        return new InvitationError('User is already a member of the channel', 'USER_ALREADY_MEMBER', enhancedContext);
      }
      break;
      
    case 403:
      if (telegramError?.includes('bot was blocked by the user')) {
        return new UserError('User has blocked the bot', 'USER_BLOCKED_BOT', enhancedContext);
      } else if (telegramError?.includes('not enough rights')) {
        return new PermissionError('Bot does not have sufficient permissions', 'INSUFFICIENT_PERMISSIONS', enhancedContext);
      } else if (telegramError?.includes('CHAT_WRITE_FORBIDDEN')) {
        return new PermissionError('Bot cannot post messages in the channel', 'CHAT_WRITE_FORBIDDEN', enhancedContext);
      }
      break;
      
    case 429:
      // Extract retry_after if available
      const retryAfter = error.response?.body?.parameters?.retry_after || 
                         error.response?.parameters?.retry_after || 
                         error.parameters?.retry_after || 
                         60; // Default to 60 seconds
                         
      return new RateLimitError(
        `Too many requests to Telegram API. Retry after ${retryAfter} seconds`, 
        'TELEGRAM_RATE_LIMIT', 
        {
          ...enhancedContext,
          retryAfter
        }
      );
      
    case 401:
      return new BotError('Bot token is invalid or expired', 'INVALID_BOT_TOKEN', enhancedContext);
      
    case 404:
      return new BotError('Requested resource not found', 'RESOURCE_NOT_FOUND', enhancedContext);
      
    case 500:
    case 502:
    case 503:
    case 504:
      return new BotError('Telegram server error', 'TELEGRAM_SERVER_ERROR', enhancedContext);
  }
  
  // If error code didn't match, try matching by error message
  if (telegramError) {
    if (telegramError.includes('bot is not a member')) {
      return new PermissionError('Bot is not a member of the channel', 'BOT_NOT_MEMBER', enhancedContext);
    } else if (telegramError.includes('FLOOD_WAIT')) {
      // Extract wait time if available
      const waitMatch = telegramError.match(/FLOOD_WAIT_(\d+)/);
      const waitTime = waitMatch ? parseInt(waitMatch[1], 10) : 60;
      
      return new RateLimitError(
        `Flood control exceeded. Wait ${waitTime} seconds`, 
        'FLOOD_WAIT', 
        {
          ...enhancedContext,
          retryAfter: waitTime
        }
      );
    } else if (telegramError.includes('invite link')) {
      return new InvitationError('Failed to create or export invite link', 'INVITE_LINK_ERROR', enhancedContext);
    }
  }
  
  // Default to a generic BotError if no specific mapping is found
  return new BotError(
    telegramError || 'Unknown Telegram API error', 
    'TELEGRAM_API_ERROR', 
    enhancedContext
  );
};

/**
 * Validate a channel ID format
 * @param {string|number} channelId - The channel ID to validate
 * @returns {boolean} - Whether the channel ID is valid
 */
const isValidChannelId = (channelId) => {
  if (!channelId) return false;
  
  // Convert to string if it's a number
  const channelIdStr = String(channelId);
  
  // Channel IDs can be in several formats:
  // 1. Public channels: @channelname
  if (channelIdStr.startsWith('@')) {
    // Username must be 5-32 chars and contain only a-z, 0-9, and underscores
    return /^@[a-z0-9_]{5,32}$/i.test(channelIdStr);
  }
  
  // 2. Private channels: -100 followed by digits (9-10 digits)
  if (/^-100\d{9,10}$/.test(channelIdStr)) {
    return true;
  }
  
  // 3. Legacy group chats: negative numbers
  if (/^-\d+$/.test(channelIdStr) && channelIdStr !== '-100') {
    return true;
  }
  
  return false;
};

/**
 * Validate a user ID format
 * @param {string|number} userId - The user ID to validate
 * @returns {boolean} - Whether the user ID is valid
 */
const isValidUserId = (userId) => {
  if (!userId) return false;
  
  // Convert to string if it's a number
  const userIdStr = String(userId);
  
  // User IDs can be in several formats:
  // 1. Numeric user IDs: positive integers (usually 9-10 digits)
  if (/^\d{1,10}$/.test(userIdStr) && parseInt(userIdStr, 10) > 0) {
    return true;
  }
  
  // 2. Usernames: @username
  if (userIdStr.startsWith('@')) {
    // Username must be 5-32 chars and contain only a-z, 0-9, and underscores
    return /^@[a-z0-9_]{5,32}$/i.test(userIdStr);
  }
  
  return false;
};

module.exports = {
  BotError,
  ChannelError,
  UserError,
  PermissionError,
  RateLimitError,
  InvitationError,
  mapTelegramError,
  isValidChannelId,
  isValidUserId
};