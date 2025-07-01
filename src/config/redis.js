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
  logger.info('Using Redis URL connection string');
  try {
    // Parse the Redis URL to extract host and port
    const redisUrl = new URL(process.env.REDIS_HOST);
    
    // Extract password from auth part of the URL if it exists
    let password = undefined;
    if (redisUrl.username || redisUrl.password) {
      // The password might be in the username field for some Redis URLs
      password = redisUrl.password || redisUrl.username;
    }
    
    redisConfig = {
      host: redisUrl.hostname,
      port: parseInt(redisUrl.port || '6379', 10),
      password: password,
      retryStrategy: (times) => {
        // Exponential backoff with max 30 seconds
        const delay = Math.min(times * 50, 30000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false
    };
    
    logger.info(`Redis config created: host=${redisUrl.hostname}, port=${redisConfig.port}`);
  } catch (error) {
    logger.error('Failed to parse Redis URL:', error.message);
    // Fallback to using the URL directly
    logger.info('Falling back to using Redis URL directly');
    redisConfig = process.env.REDIS_HOST;
  }
} else {
  // Use traditional host/port/password configuration
  redisConfig = {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined, // Only set if not empty
    retryStrategy: (times) => {
      // Exponential backoff with max 30 seconds
      const delay = Math.min(times * 50, 30000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false
  };
  
  logger.info(`Redis config created: host=${process.env.REDIS_HOST}, port=${redisConfig.port}`);
}

// Create Redis client or mock client
let redisClient;
let usingMockRedis = false;

if (useRedis) {
  try {
    redisClient = new Redis(redisConfig);
    
    // Handle Redis connection events
    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });
    
    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err.message);
      
      // Check if this is a connection error (ENOTFOUND, ECONNREFUSED, etc.)
      if (err.code && (
          err.code === 'ENOTFOUND' || 
          err.code === 'ECONNREFUSED' || 
          err.code === 'ETIMEDOUT' ||
          err.message.includes('getaddrinfo')
        )) {
        // Only switch to mock client if we haven't already
        if (!usingMockRedis) {
          logger.warn('Persistent Redis connection errors detected. Switching to mock Redis client...');
          redisClient = createMockRedisClient();
          usingMockRedis = true;
        }
      }
    });
    
    // Add reconnect event handler
    redisClient.on('reconnecting', () => {
      logger.info('Redis client attempting to reconnect...');
    });
    
    // Add ready event handler
    redisClient.on('ready', () => {
      logger.info('Redis client ready and accepting commands');
    });
  } catch (error) {
    logger.error('Failed to initialize Redis client:', error.message);
    redisClient = createMockRedisClient();
    usingMockRedis = true;
  }
} else {
  redisClient = createMockRedisClient();
  usingMockRedis = true;
}

module.exports = {
  redisClient
};