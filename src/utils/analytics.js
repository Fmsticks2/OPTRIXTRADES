/**
 * Analytics Utility
 * 
 * This file provides functions for tracking and analyzing bot usage and performance.
 * It includes event tracking, rate limiting, and performance monitoring capabilities.
 */

const { logger } = require('./logger');
const { User } = require('../models');
const { redis } = require('../config/redis');

/**
 * Track an event with associated data
 * @param {string} eventName - Name of the event to track
 * @param {Object} eventData - Data associated with the event
 * @returns {Promise<boolean>} - Whether the event was successfully tracked
 */
const trackEvent = async (eventName, eventData = {}) => {
  try {
    // Ensure timestamp is included
    const timestamp = eventData.timestamp || Date.now();
    const enrichedData = {
      ...eventData,
      timestamp,
      environment: process.env.NODE_ENV || 'development'
    };
    
    // Log the event with structured data
    logger.info(`EVENT: ${eventName}`, { 
      event: eventName, 
      data: enrichedData,
      source: 'analytics_tracker'
    });
    
    // Skip Redis operations if Redis is not available
    if (!redis) {
      logger.warn('Redis not available for event tracking');
      return true;
    }
    
    // Store event in Redis for real-time analytics
    const eventKey = `event:${eventName}:${timestamp}`;
    await redis.hmset(eventKey, enrichedData);
    
    // Set expiry for Redis keys (30 days)
    await redis.expire(eventKey, 60 * 60 * 24 * 30);
    
    // Increment event counter
    await redis.incr(`event_count:${eventName}`);
    
    // Increment daily event counter
    const today = new Date(timestamp).toISOString().split('T')[0];
    await redis.incr(`event_count:${eventName}:${today}`);
    
    // Increment hourly event counter for more granular analysis
    const hour = new Date(timestamp).toISOString().slice(0, 13).replace('T', '_');
    await redis.incr(`event_count:${eventName}:${hour}`);
    await redis.expire(`event_count:${eventName}:${hour}`, 60 * 60 * 24 * 7); // 7 days
    
    // If user ID is provided, associate event with user
    if (eventData.userId) {
      await redis.sadd(`user:${eventData.userId}:events`, eventKey);
      await redis.expire(`user:${eventData.userId}:events`, 60 * 60 * 24 * 90); // 90 days
    }
    
    // If channel ID is provided, associate event with channel
    if (eventData.channelId) {
      await redis.sadd(`channel:${eventData.channelId}:events`, eventKey);
      await redis.expire(`channel:${eventData.channelId}:events`, 60 * 60 * 24 * 90); // 90 days
    }
    
    // If status is provided, track success/failure metrics
    if (eventData.status) {
      await redis.incr(`event_status:${eventName}:${eventData.status}`);
      await redis.expire(`event_status:${eventName}:${eventData.status}`, 60 * 60 * 24 * 30);
    }
    
    // If response time is provided, track performance metrics
    if (eventData.responseTime) {
      await redis.lpush(`${eventName}:response_times`, eventData.responseTime);
      await redis.ltrim(`${eventName}:response_times`, 0, 999); // Keep last 1000 response times
      
      // Track min/max/avg response times
      const currentMax = await redis.get(`${eventName}:max_response_time`) || 0;
      if (eventData.responseTime > currentMax) {
        await redis.set(`${eventName}:max_response_time`, eventData.responseTime);
      }
      
      const currentMin = await redis.get(`${eventName}:min_response_time`) || Number.MAX_SAFE_INTEGER;
      if (eventData.responseTime < currentMin) {
        await redis.set(`${eventName}:min_response_time`, eventData.responseTime);
      }
    }
    
    return true;
  } catch (error) {
    logger.error(`Error tracking event ${eventName}:`, error);
    return false;
  }
};

/**
 * Get event statistics for a specific event
 * @param {string} eventName - Name of the event
 * @param {Object} options - Options for filtering statistics
 * @param {string} options.startDate - Start date in ISO format (YYYY-MM-DD)
 * @param {string} options.endDate - End date in ISO format (YYYY-MM-DD)
 * @param {string} options.userId - Filter stats by user ID
 * @param {string} options.channelId - Filter stats by channel ID
 * @param {boolean} options.includeHourly - Include hourly breakdown
 * @param {number} options.limit - Limit the number of events to analyze
 * @returns {Promise<Object>} - Event statistics
 */
const getEventStats = async (eventName, options = {}) => {
  try {
    const { 
      startDate, 
      endDate, 
      userId, 
      channelId, 
      includeHourly = false,
      limit = 1000 
    } = options;
    
    // Skip Redis operations if Redis is not available
    if (!redis) {
      logger.warn('Redis not available for event statistics');
      return { error: 'Redis not available' };
    }
    
    const stats = {
      totalCount: 0,
      dailyCounts: {},
      hourlyCounts: {},
      statusBreakdown: {},
      performance: {
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        p95ResponseTime: 0,
        sampleSize: 0
      },
      timeRange: {
        start: startDate || 'all time',
        end: endDate || 'present'
      }
    };
    
    // Get total count
    stats.totalCount = parseInt(await redis.get(`event_count:${eventName}`), 10) || 0;
    
    // Get status breakdown
    const successCount = parseInt(await redis.get(`event_status:${eventName}:success`), 10) || 0;
    const errorCount = parseInt(await redis.get(`event_status:${eventName}:error`), 10) || 0;
    const pendingCount = parseInt(await redis.get(`event_status:${eventName}:pending`), 10) || 0;
    
    stats.statusBreakdown = {
      success: successCount,
      error: errorCount,
      pending: pendingCount,
      other: stats.totalCount - (successCount + errorCount + pendingCount)
    };
    
    // Calculate success rate
    const totalStatusCount = successCount + errorCount;
    if (totalStatusCount > 0) {
      stats.successRate = ((successCount / totalStatusCount) * 100).toFixed(2) + '%';
    } else {
      stats.successRate = 'N/A';
    }
    
    // Get daily counts
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
        const dateStr = day.toISOString().split('T')[0];
        const count = parseInt(await redis.get(`event_count:${eventName}:${dateStr}`), 10) || 0;
        stats.dailyCounts[dateStr] = count;
        
        // Get hourly breakdown if requested
        if (includeHourly) {
          stats.hourlyCounts[dateStr] = {};
          for (let hour = 0; hour < 24; hour++) {
            const hourStr = hour.toString().padStart(2, '0');
            const hourKey = `${dateStr.replace(/-/g, '_')}_${hourStr}`;
            const hourlyCount = parseInt(await redis.get(`event_count:${eventName}:${hourKey}`), 10) || 0;
            stats.hourlyCounts[dateStr][hour] = hourlyCount;
          }
        }
      }
    }
    
    // Get performance metrics
    const minResponseTime = parseInt(await redis.get(`${eventName}:min_response_time`), 10) || 0;
    const maxResponseTime = parseInt(await redis.get(`${eventName}:max_response_time`), 10) || 0;
    
    // Get response times for percentile calculation
    const responseTimes = await redis.lrange(`${eventName}:response_times`, 0, limit - 1);
    if (responseTimes && responseTimes.length > 0) {
      const times = responseTimes.map(t => parseInt(t, 10)).filter(t => !isNaN(t));
      stats.performance.sampleSize = times.length;
      
      if (times.length > 0) {
        // Calculate average
        const sum = times.reduce((acc, time) => acc + time, 0);
        stats.performance.averageResponseTime = (sum / times.length).toFixed(2) + 'ms';
        
        // Use min/max from Redis if available, otherwise calculate from sample
        stats.performance.minResponseTime = (minResponseTime || Math.min(...times)) + 'ms';
        stats.performance.maxResponseTime = (maxResponseTime || Math.max(...times)) + 'ms';
        
        // Calculate 95th percentile
        times.sort((a, b) => a - b);
        const p95Index = Math.floor(times.length * 0.95);
        stats.performance.p95ResponseTime = times[p95Index] + 'ms';
      }
    }
    
    // Get user-specific stats if userId is provided
    if (userId) {
      const userEvents = await redis.smembers(`user:${userId}:events`);
      stats.userStats = {
        totalEvents: userEvents.length,
        firstEventTimestamp: null,
        lastEventTimestamp: null
      };
      
      if (userEvents.length > 0) {
        // Get timestamps from event keys (format: event:name:timestamp)
        const timestamps = userEvents
          .map(key => parseInt(key.split(':')[2], 10))
          .filter(ts => !isNaN(ts));
        
        if (timestamps.length > 0) {
          stats.userStats.firstEventTimestamp = new Date(Math.min(...timestamps)).toISOString();
          stats.userStats.lastEventTimestamp = new Date(Math.max(...timestamps)).toISOString();
        }
      }
    }
    
    // Get channel-specific stats if channelId is provided
    if (channelId) {
      const channelEvents = await redis.smembers(`channel:${channelId}:events`);
      stats.channelStats = {
        totalEvents: channelEvents.length,
        firstEventTimestamp: null,
        lastEventTimestamp: null
      };
      
      if (channelEvents.length > 0) {
        // Get timestamps from event keys (format: event:name:timestamp)
        const timestamps = channelEvents
          .map(key => parseInt(key.split(':')[2], 10))
          .filter(ts => !isNaN(ts));
        
        if (timestamps.length > 0) {
          stats.channelStats.firstEventTimestamp = new Date(Math.min(...timestamps)).toISOString();
          stats.channelStats.lastEventTimestamp = new Date(Math.max(...timestamps)).toISOString();
        }
      }
    }
    
    return stats;
  } catch (error) {
    logger.error(`Error getting stats for event ${eventName}:`, error);
    return { error: error.message };
  }
};

/**
 * Track rate-limited actions to prevent abuse
 * @param {string} actionType - Type of action being rate-limited
 * @param {string} identifier - Identifier (user ID, channel ID, etc.)
 * @param {number} limit - Maximum number of actions allowed in the time window
 * @param {number} windowSeconds - Time window in seconds
 * @param {Object} options - Additional options
 * @param {boolean} options.trackExceeded - Whether to track when rate limit is exceeded
 * @param {boolean} options.strictMode - If true, throws error instead of returning false
 * @returns {Promise<boolean>} - Whether the action is allowed or rate-limited
 */
const checkRateLimit = async (actionType, identifier, limit, windowSeconds, options = {}) => {
  const { trackExceeded = true, strictMode = false } = options;
  
  try {
    // Skip Redis operations if Redis is not available
    if (!redis) {
      logger.warn('Redis not available for rate limiting');
      return true;
    }
    
    const key = `rate_limit:${actionType}:${identifier}`;
    
    // Get current count
    const count = parseInt(await redis.get(key), 10) || 0;
    
    // Get time to reset (TTL of the key)
    const ttl = await redis.ttl(key);
    const resetTime = ttl > 0 ? ttl : windowSeconds;
    
    // If count exceeds limit, rate limit is exceeded
    if (count >= limit) {
      // Track rate limit exceeded event if requested
      if (trackExceeded) {
        await trackEvent('rate_limit_exceeded', {
          actionType,
          identifier,
          limit,
          count,
          resetTime,
          windowSeconds
        });
      }
      
      // Log the rate limit exceeded
      logger.warn(`Rate limit exceeded for ${actionType}:${identifier}. ` +
                 `Count: ${count}/${limit}. Resets in ${resetTime}s`);
      
      // If in strict mode, throw an error
      if (strictMode) {
        const error = new Error(`Rate limit exceeded for ${actionType}`);
        error.code = 'RATE_LIMIT_EXCEEDED';
        error.data = { actionType, identifier, limit, count, resetTime };
        throw error;
      }
      
      return false;
    }
    
    // Increment count
    await redis.incr(key);
    
    // Set expiry if not already set
    if (ttl === -1 || ttl === -2) { // -1: no expiry, -2: key doesn't exist
      await redis.expire(key, windowSeconds);
    }
    
    // Track rate limit usage for monitoring
    if (count > Math.floor(limit * 0.8)) {
      // Track when usage is over 80% of the limit
      await trackEvent('rate_limit_approaching', {
        actionType,
        identifier,
        limit,
        count: count + 1, // Include the increment we just did
        percentUsed: Math.floor(((count + 1) / limit) * 100),
        resetTime
      });
    }
    
    return true;
  } catch (error) {
    // If this is a rate limit error we threw in strict mode, rethrow it
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      throw error;
    }
    
    // For other errors, log and allow the action to proceed
    logger.error(`Error checking rate limit for ${actionType}:${identifier}:`, error);
    return true;
  }
};

/**
 * Get current rate limit status
 * @param {string} actionType - Type of action being rate-limited
 * @param {string} identifier - Identifier (user ID, channel ID, etc.)
 * @param {number} limit - Maximum number of actions allowed in the time window
 * @returns {Promise<Object>} - Rate limit status
 */
const getRateLimitStatus = async (actionType, identifier, limit) => {
  try {
    if (!redis) {
      return { error: 'Redis not available' };
    }
    
    const key = `rate_limit:${actionType}:${identifier}`;
    
    // Get current count and TTL
    const count = parseInt(await redis.get(key), 10) || 0;
    const ttl = await redis.ttl(key);
    
    return {
      actionType,
      identifier,
      current: count,
      limit,
      remaining: Math.max(0, limit - count),
      resetIn: ttl > 0 ? ttl : 0,
      percentUsed: Math.floor((count / limit) * 100)
    };
  } catch (error) {
    logger.error(`Error getting rate limit status for ${actionType}:${identifier}:`, error);
    return { error: error.message };
  }
};

module.exports = {
  trackEvent,
  getEventStats,
  checkRateLimit
};