/**
 * State Management Service for OPTRIXTRADES
 * Centralizes user and admin state management
 */

const { redisClient } = require('../config/redis');
const { logger } = require('../utils/logger');
const { ValidationError } = require('../utils/errorHandler');

// Redis key prefixes
const USER_STATE_PREFIX = 'user:state:';
const ADMIN_STATE_PREFIX = 'admin:state:';
const STATE_TTL = 60 * 60; // 1 hour in seconds

/**
 * Set user state in Redis
 * @param {string} telegramId - User's Telegram ID
 * @param {string} state - State name
 * @param {Object} data - Additional state data
 * @returns {Promise<boolean>} - Success status
 */
const setUserState = async (telegramId, state, data = {}) => {
  try {
    if (!telegramId) {
      throw new ValidationError('Telegram ID is required');
    }
    
    const key = `${USER_STATE_PREFIX}${telegramId}`;
    const stateData = {
      state,
      data,
      updatedAt: new Date().toISOString()
    };
    
    await redisClient.set(key, JSON.stringify(stateData), 'EX', STATE_TTL);
    logger.info(`User ${telegramId} state set to ${state}`, { telegramId, state, data });
    
    return true;
  } catch (error) {
    logger.error(`Error setting user state for ${telegramId}:`, error);
    throw error;
  }
};

/**
 * Get user state from Redis
 * @param {string} telegramId - User's Telegram ID
 * @returns {Promise<Object|null>} - User state or null if not found
 */
const getUserState = async (telegramId) => {
  try {
    if (!telegramId) {
      throw new ValidationError('Telegram ID is required');
    }
    
    const key = `${USER_STATE_PREFIX}${telegramId}`;
    const stateData = await redisClient.get(key);
    
    if (!stateData) {
      return null;
    }
    
    return JSON.parse(stateData);
  } catch (error) {
    logger.error(`Error getting user state for ${telegramId}:`, error);
    throw error;
  }
};

/**
 * Clear user state from Redis
 * @param {string} telegramId - User's Telegram ID
 * @returns {Promise<boolean>} - Success status
 */
const clearUserState = async (telegramId) => {
  try {
    if (!telegramId) {
      throw new ValidationError('Telegram ID is required');
    }
    
    const key = `${USER_STATE_PREFIX}${telegramId}`;
    await redisClient.del(key);
    logger.info(`User ${telegramId} state cleared`, { telegramId });
    
    return true;
  } catch (error) {
    logger.error(`Error clearing user state for ${telegramId}:`, error);
    throw error;
  }
};

/**
 * Set admin state in Redis
 * @param {string} adminId - Admin's Telegram ID
 * @param {string} state - State name
 * @param {Object} data - Additional state data
 * @returns {Promise<boolean>} - Success status
 */
const setAdminState = async (adminId, state, data = {}) => {
  try {
    if (!adminId) {
      throw new ValidationError('Admin ID is required');
    }
    
    const key = `${ADMIN_STATE_PREFIX}${adminId}`;
    const stateData = {
      state,
      data,
      updatedAt: new Date().toISOString()
    };
    
    await redisClient.set(key, JSON.stringify(stateData), 'EX', STATE_TTL);
    logger.info(`Admin ${adminId} state set to ${state}`, { adminId, state, data });
    
    return true;
  } catch (error) {
    logger.error(`Error setting admin state for ${adminId}:`, error);
    throw error;
  }
};

/**
 * Get admin state from Redis
 * @param {string} adminId - Admin's Telegram ID
 * @returns {Promise<Object|null>} - Admin state or null if not found
 */
const getAdminState = async (adminId) => {
  try {
    if (!adminId) {
      throw new ValidationError('Admin ID is required');
    }
    
    const key = `${ADMIN_STATE_PREFIX}${adminId}`;
    const stateData = await redisClient.get(key);
    
    if (!stateData) {
      return null;
    }
    
    return JSON.parse(stateData);
  } catch (error) {
    logger.error(`Error getting admin state for ${adminId}:`, error);
    throw error;
  }
};

/**
 * Clear admin state from Redis
 * @param {string} adminId - Admin's Telegram ID
 * @returns {Promise<boolean>} - Success status
 */
const clearAdminState = async (adminId) => {
  try {
    if (!adminId) {
      throw new ValidationError('Admin ID is required');
    }
    
    const key = `${ADMIN_STATE_PREFIX}${adminId}`;
    await redisClient.del(key);
    logger.info(`Admin ${adminId} state cleared`, { adminId });
    
    return true;
  } catch (error) {
    logger.error(`Error clearing admin state for ${adminId}:`, error);
    throw error;
  }
};

/**
 * Check if user is in a specific state
 * @param {string} telegramId - User's Telegram ID
 * @param {string} stateName - State name to check
 * @returns {Promise<boolean>} - Whether user is in the specified state
 */
const isUserInState = async (telegramId, stateName) => {
  try {
    const state = await getUserState(telegramId);
    return state !== null && state.state === stateName;
  } catch (error) {
    logger.error(`Error checking user state for ${telegramId}:`, error);
    return false;
  }
};

/**
 * Check if admin is in a specific state
 * @param {string} adminId - Admin's Telegram ID
 * @param {string} stateName - State name to check
 * @returns {Promise<boolean>} - Whether admin is in the specified state
 */
const isAdminInState = async (adminId, stateName) => {
  try {
    const state = await getAdminState(adminId);
    return state !== null && state.state === stateName;
  } catch (error) {
    logger.error(`Error checking admin state for ${adminId}:`, error);
    return false;
  }
};

module.exports = {
  setUserState,
  getUserState,
  clearUserState,
  setAdminState,
  getAdminState,
  clearAdminState,
  isUserInState,
  isAdminInState
};