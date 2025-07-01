/**
 * Performance Monitoring Utility for OPTRIXTRADES
 * Provides utilities for tracking performance metrics and resource usage
 */

const { performance } = require('perf_hooks');
const os = require('os');
const { logger } = require('./logger');
const { redisClient } = require('../config/redis');

// Constants for metric keys
const METRICS_PREFIX = 'metrics:';
const RESPONSE_TIME_KEY = `${METRICS_PREFIX}response_time`;
const ERROR_RATE_KEY = `${METRICS_PREFIX}error_rate`;
const REQUEST_COUNT_KEY = `${METRICS_PREFIX}request_count`;
const RESOURCE_USAGE_KEY = `${METRICS_PREFIX}resource_usage`;

// Metric retention period (in seconds)
const METRICS_TTL = 60 * 60 * 24 * 7; // 7 days

/**
 * Start timing a request
 * @returns {PerformanceMark} - Performance mark object
 */
const startTiming = () => {
  const startMark = `request-${Date.now()}`;
  performance.mark(startMark);
  return startMark;
};

/**
 * End timing a request and record the duration
 * @param {string} startMark - The start mark from startTiming()
 * @param {string} operation - The operation being timed (e.g., 'verification', 'trading_signal')
 * @returns {number} - The duration in milliseconds
 */
const endTiming = async (startMark, operation) => {
  const endMark = `${startMark}-end`;
  performance.mark(endMark);
  
  const measureName = `${startMark}-measure`;
  performance.measure(measureName, startMark, endMark);
  
  const [measure] = performance.getEntriesByName(measureName);
  const duration = measure.duration;
  
  // Clean up performance entries
  performance.clearMarks(startMark);
  performance.clearMarks(endMark);
  performance.clearMeasures(measureName);
  
  // Record the response time in Redis
  try {
    const key = `${RESPONSE_TIME_KEY}:${operation}`;
    await redisClient.lpush(key, duration.toString());
    await redisClient.ltrim(key, 0, 999); // Keep only the last 1000 measurements
    await redisClient.expire(key, METRICS_TTL);
    
    // Increment request count
    const countKey = `${REQUEST_COUNT_KEY}:${operation}`;
    await redisClient.incr(countKey);
    await redisClient.expire(countKey, METRICS_TTL);
  } catch (error) {
    logger.warn('Failed to record response time metric', { error: error.message });
  }
  
  return duration;
};

/**
 * Record an error occurrence
 * @param {string} operation - The operation where the error occurred
 * @param {Error} error - The error object
 */
const recordError = async (operation, error) => {
  try {
    // Increment error count for the operation
    const key = `${ERROR_RATE_KEY}:${operation}`;
    await redisClient.incr(key);
    await redisClient.expire(key, METRICS_TTL);
    
    // Log the error with context
    logger.error(`Error in ${operation}:`, {
      error: error.message,
      stack: error.stack,
      operation
    });
  } catch (redisError) {
    logger.warn('Failed to record error metric', { error: redisError.message });
  }
};

/**
 * Record system resource usage
 */
const recordResourceUsage = async () => {
  try {
    const usage = {
      timestamp: Date.now(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
      },
      cpu: {
        loadAvg: os.loadavg(),
        cpus: os.cpus().length
      },
      uptime: os.uptime()
    };
    
    // Add process-specific metrics
    const processMemoryUsage = process.memoryUsage();
    usage.process = {
      memory: {
        rss: processMemoryUsage.rss,
        heapTotal: processMemoryUsage.heapTotal,
        heapUsed: processMemoryUsage.heapUsed,
        external: processMemoryUsage.external
      },
      uptime: process.uptime()
    };
    
    // Store in Redis
    const key = `${RESOURCE_USAGE_KEY}:${Math.floor(Date.now() / (60 * 1000))}`; // Key by minute
    await redisClient.set(key, JSON.stringify(usage));
    await redisClient.expire(key, METRICS_TTL);
  } catch (error) {
    logger.warn('Failed to record resource usage', { error: error.message });
  }
};

/**
 * Get performance metrics for a specific operation
 * @param {string} operation - The operation to get metrics for
 * @returns {Promise<Object>} - Performance metrics
 */
const getMetrics = async (operation) => {
  try {
    // Get response times
    const responseTimeKey = `${RESPONSE_TIME_KEY}:${operation}`;
    const responseTimes = await redisClient.lrange(responseTimeKey, 0, -1);
    const parsedResponseTimes = responseTimes.map(time => parseFloat(time));
    
    // Calculate response time statistics
    const avgResponseTime = parsedResponseTimes.length > 0
      ? parsedResponseTimes.reduce((sum, time) => sum + time, 0) / parsedResponseTimes.length
      : 0;
    
    // Sort for percentiles
    parsedResponseTimes.sort((a, b) => a - b);
    
    // Get request and error counts
    const requestCountKey = `${REQUEST_COUNT_KEY}:${operation}`;
    const errorRateKey = `${ERROR_RATE_KEY}:${operation}`;
    
    const requestCount = parseInt(await redisClient.get(requestCountKey) || '0', 10);
    const errorCount = parseInt(await redisClient.get(errorRateKey) || '0', 10);
    
    // Calculate error rate
    const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
    
    // Calculate percentiles
    const getPercentile = (percentile) => {
      if (parsedResponseTimes.length === 0) return 0;
      const index = Math.ceil(percentile / 100 * parsedResponseTimes.length) - 1;
      return parsedResponseTimes[Math.max(0, index)];
    };
    
    return {
      operation,
      requestCount,
      errorCount,
      errorRate: errorRate.toFixed(2),
      responseTime: {
        avg: avgResponseTime.toFixed(2),
        min: parsedResponseTimes[0] || 0,
        max: parsedResponseTimes[parsedResponseTimes.length - 1] || 0,
        p50: getPercentile(50),
        p90: getPercentile(90),
        p95: getPercentile(95),
        p99: getPercentile(99)
      }
    };
  } catch (error) {
    logger.error('Failed to get metrics', { error: error.message, operation });
    return {
      operation,
      error: 'Failed to retrieve metrics'
    };
  }
};

/**
 * Get resource usage history
 * @param {number} minutes - Number of minutes of history to retrieve
 * @returns {Promise<Array>} - Resource usage history
 */
const getResourceUsageHistory = async (minutes = 60) => {
  try {
    const currentMinute = Math.floor(Date.now() / (60 * 1000));
    const keys = [];
    
    // Generate keys for the requested time range
    for (let i = 0; i < minutes; i++) {
      keys.push(`${RESOURCE_USAGE_KEY}:${currentMinute - i}`);
    }
    
    // Get all resource usage records
    const results = [];
    
    for (const key of keys) {
      const data = await redisClient.get(key);
      if (data) {
        results.push(JSON.parse(data));
      }
    }
    
    return results.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    logger.error('Failed to get resource usage history', { error: error.message });
    return [];
  }
};

/**
 * Initialize the performance monitoring system
 */
const initPerformanceMonitoring = () => {
  // Record resource usage every minute
  setInterval(recordResourceUsage, 60 * 1000);
  
  // Record initial resource usage
  recordResourceUsage();
  
  logger.info('Performance monitoring initialized');
};

/**
 * Performance monitoring middleware for controllers
 * @param {string} operation - The operation being performed
 * @returns {Function} - Middleware function
 */
const performanceMiddleware = (operation) => async (ctx, next) => {
  const startMark = startTiming();
  
  try {
    // Execute the next middleware or controller
    await next();
    
    // Record the response time
    await endTiming(startMark, operation);
  } catch (error) {
    // Record the error and response time
    await recordError(operation, error);
    await endTiming(startMark, operation);
    
    // Re-throw the error for the error handler
    throw error;
  }
};

module.exports = {
  startTiming,
  endTiming,
  recordError,
  recordResourceUsage,
  getMetrics,
  getResourceUsageHistory,
  initPerformanceMonitoring,
  performanceMiddleware
};