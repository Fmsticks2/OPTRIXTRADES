require('dotenv').config();
const Redis = require('ioredis');
const { logger } = require('../utils/logger');

// Check if Redis is disabled
const useRedis = process.env.USE_REDIS !== 'false';

// Create a mock Redis client if Redis is disabled
const createMockRedisClient = () => {
  logger.warn('Using mock Redis client - Redis is disabled');
  return {
    get: () => Promise.resolve(null),
    set: () => Promise.resolve('OK'),
    del: () => Promise.resolve(1),
    keys: () => Promise.resolve([]),
    hget: () => Promise.resolve(null),
    hset: () => Promise.resolve(1),
    hdel: () => Promise.resolve(1),
    hgetall: () => Promise.resolve({}),
    expire: () => Promise.resolve(1),
    ttl: () => Promise.resolve(-1),
    on: () => {}
  };
};

// Redis configuration from environment variables
let redisConfig;

// Check if REDIS_HOST is a URL (like the one provided by Render)
if (process.env.REDIS_HOST && process.env.REDIS_HOST.startsWith('redis://')) {
  // Use the URL directly
  logger.info('Using Redis URL connection string');
  redisConfig = process.env.REDIS_HOST;
} else {
  // Use traditional host/port/password configuration
  redisConfig = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD || undefined, // Only set if not empty
    retryStrategy: (times) => {
      // Exponential backoff with max 30 seconds
      const delay = Math.min(times * 50, 30000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false
  };
}

// Create Redis client or mock client
let redisClient;

if (useRedis) {
  try {
    redisClient = new Redis(redisConfig);
    
    // Handle Redis connection events
    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });
    
    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err.message);
    });
  } catch (error) {
    logger.error('Failed to initialize Redis client:', error.message);
    redisClient = createMockRedisClient();
  }
} else {
  redisClient = createMockRedisClient();
}

module.exports = {
  redisClient
};