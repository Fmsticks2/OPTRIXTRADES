/**
 * Cache Service for OPTRIXTRADES
 * Provides caching functionality for frequently accessed data
 */

const { redisClient } = require('../config/redis');
const { logger } = require('../utils/logger');

// Cache key prefixes
const USER_PREFIX = 'cache:user:';
const VERIFICATION_PREFIX = 'cache:verification:';
const TRADING_SIGNAL_PREFIX = 'cache:trading:signal:';
const TRADING_STATS_PREFIX = 'cache:trading:stats:';

// Default TTLs in seconds
const DEFAULT_TTL = 60 * 60; // 1 hour
const USER_TTL = 60 * 60; // 1 hour
const VERIFICATION_TTL = 30 * 60; // 30 minutes
const TRADING_SIGNAL_TTL = 15 * 60; // 15 minutes
const TRADING_STATS_TTL = 60 * 60; // 1 hour

/**
 * Set a value in the cache
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<boolean>} - Success status
 */
const set = async (key, value, ttl = DEFAULT_TTL) => {
  try {
    const serializedValue = JSON.stringify(value);
    await redisClient.set(key, serializedValue, 'EX', ttl);
    return true;
  } catch (error) {
    logger.error(`Error setting cache for key ${key}:`, error);
    return false;
  }
};

/**
 * Get a value from the cache
 * @param {string} key - Cache key
 * @returns {Promise<*|null>} - Cached value or null if not found
 */
const get = async (key) => {
  try {
    const value = await redisClient.get(key);
    if (!value) return null;
    return JSON.parse(value);
  } catch (error) {
    logger.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
};

/**
 * Delete a value from the cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} - Success status
 */
const del = async (key) => {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error(`Error deleting cache for key ${key}:`, error);
    return false;
  }
};

/**
 * Check if a key exists in the cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} - Whether the key exists
 */
const exists = async (key) => {
  try {
    return await redisClient.exists(key) === 1;
  } catch (error) {
    logger.error(`Error checking cache existence for key ${key}:`, error);
    return false;
  }
};

/**
 * Set user data in the cache
 * @param {string} telegramId - User's Telegram ID
 * @param {Object} userData - User data to cache
 * @returns {Promise<boolean>} - Success status
 */
const setUserData = async (telegramId, userData) => {
  return await set(`${USER_PREFIX}${telegramId}`, userData, USER_TTL);
};

/**
 * Get user data from the cache
 * @param {string} telegramId - User's Telegram ID
 * @returns {Promise<Object|null>} - User data or null if not found
 */
const getUserData = async (telegramId) => {
  return await get(`${USER_PREFIX}${telegramId}`);
};

/**
 * Delete user data from the cache
 * @param {string} telegramId - User's Telegram ID
 * @returns {Promise<boolean>} - Success status
 */
const deleteUserData = async (telegramId) => {
  return await del(`${USER_PREFIX}${telegramId}`);
};

/**
 * Set verification data in the cache
 * @param {string} verificationId - Verification ID
 * @param {Object} verificationData - Verification data to cache
 * @returns {Promise<boolean>} - Success status
 */
const setVerificationData = async (verificationId, verificationData) => {
  return await set(`${VERIFICATION_PREFIX}${verificationId}`, verificationData, VERIFICATION_TTL);
};

/**
 * Get verification data from the cache
 * @param {string} verificationId - Verification ID
 * @returns {Promise<Object|null>} - Verification data or null if not found
 */
const getVerificationData = async (verificationId) => {
  return await get(`${VERIFICATION_PREFIX}${verificationId}`);
};

/**
 * Delete verification data from the cache
 * @param {string} verificationId - Verification ID
 * @returns {Promise<boolean>} - Success status
 */
const deleteVerificationData = async (verificationId) => {
  return await del(`${VERIFICATION_PREFIX}${verificationId}`);
};

/**
 * Set trading signal data in the cache
 * @param {string} signalId - Signal ID
 * @param {Object} signalData - Signal data to cache
 * @returns {Promise<boolean>} - Success status
 */
const setTradingSignalData = async (signalId, signalData) => {
  return await set(`${TRADING_SIGNAL_PREFIX}${signalId}`, signalData, TRADING_SIGNAL_TTL);
};

/**
 * Get trading signal data from the cache
 * @param {string} signalId - Signal ID
 * @returns {Promise<Object|null>} - Signal data or null if not found
 */
const getTradingSignalData = async (signalId) => {
  return await get(`${TRADING_SIGNAL_PREFIX}${signalId}`);
};

/**
 * Delete trading signal data from the cache
 * @param {string} signalId - Signal ID
 * @returns {Promise<boolean>} - Success status
 */
const deleteTradingSignalData = async (signalId) => {
  return await del(`${TRADING_SIGNAL_PREFIX}${signalId}`);
};

/**
 * Set trading stats data in the cache
 * @param {string} key - Stats key identifier
 * @param {Object} statsData - Stats data to cache
 * @returns {Promise<boolean>} - Success status
 */
const setTradingStatsData = async (key, statsData) => {
  return await set(`${TRADING_STATS_PREFIX}${key}`, statsData, TRADING_STATS_TTL);
};

/**
 * Get trading stats data from the cache
 * @param {string} key - Stats key identifier
 * @returns {Promise<Object|null>} - Stats data or null if not found
 */
const getTradingStatsData = async (key) => {
  return await get(`${TRADING_STATS_PREFIX}${key}`);
};

/**
 * Delete trading stats data from the cache
 * @param {string} key - Stats key identifier
 * @returns {Promise<boolean>} - Success status
 */
const deleteTradingStatsData = async (key) => {
  return await del(`${TRADING_STATS_PREFIX}${key}`);
};

/**
 * Clear all cache for a specific prefix
 * @param {string} prefix - Cache key prefix
 * @returns {Promise<boolean>} - Success status
 */
const clearCacheByPrefix = async (prefix) => {
  try {
    const keys = await redisClient.keys(`${prefix}*`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    return true;
  } catch (error) {
    logger.error(`Error clearing cache for prefix ${prefix}:`, error);
    return false;
  }
};

/**
 * Invalidate user cache when user data changes
 * @param {string} telegramId - User's Telegram ID
 * @returns {Promise<boolean>} - Success status
 */
const invalidateUserCache = async (telegramId) => {
  return await deleteUserData(telegramId);
};

/**
 * Invalidate verification cache when verification data changes
 * @param {string} verificationId - Verification ID
 * @returns {Promise<boolean>} - Success status
 */
const invalidateVerificationCache = async (verificationId) => {
  return await deleteVerificationData(verificationId);
};

/**
 * Invalidate trading signal cache when signal data changes
 * @param {string} signalId - Signal ID
 * @returns {Promise<boolean>} - Success status
 */
const invalidateTradingSignalCache = async (signalId) => {
  return await deleteTradingSignalData(signalId);
};

/**
 * Invalidate trading stats cache when stats data changes
 * @param {string} key - Stats key identifier
 * @returns {Promise<boolean>} - Success status
 */
const invalidateTradingStatsCache = async (key) => {
  return await deleteTradingStatsData(key);
};

module.exports = {
  // Generic cache methods
  set,
  get,
  del,
  exists,
  clearCacheByPrefix,
  
  // User cache methods
  setUserData,
  getUserData,
  deleteUserData,
  invalidateUserCache,
  
  // Verification cache methods
  setVerificationData,
  getVerificationData,
  deleteVerificationData,
  invalidateVerificationCache,
  
  // Trading signal cache methods
  setTradingSignalData,
  getTradingSignalData,
  deleteTradingSignalData,
  invalidateTradingSignalCache,
  
  // Trading stats cache methods
  setTradingStatsData,
  getTradingStatsData,
  deleteTradingStatsData,
  invalidateTradingStatsCache
};