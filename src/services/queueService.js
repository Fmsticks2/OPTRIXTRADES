/**
 * Queue Service for OPTRIXTRADES
 * Provides a centralized queue system for handling background tasks
 */

const Bull = require('bull');
const { logger } = require('../utils/logger');
const { ServiceUnavailableError } = require('../utils/errorHandler');
const { redisClient } = require('../config/redis');

// Parse Redis connection options
let redisOptions;

// Check if REDIS_HOST is a URL (like the one provided by Render)
if (process.env.REDIS_HOST && process.env.REDIS_HOST.startsWith('redis://')) {
  logger.info('Queue service using Redis URL connection string');
  try {
    // Parse the Redis URL to extract host and port
    const redisUrl = new URL(process.env.REDIS_HOST);
    
    // Extract password from auth part of the URL if it exists
    let password = undefined;
    if (redisUrl.username || redisUrl.password) {
      // The password might be in the username field for some Redis URLs
      password = redisUrl.password || redisUrl.username;
    }
    
    redisOptions = {
      host: redisUrl.hostname,
      port: parseInt(redisUrl.port || '6379', 10),
      password: password
    };
    
    logger.info(`Queue Redis config: host=${redisUrl.hostname}, port=${redisOptions.port}`);
  } catch (error) {
    logger.error('Failed to parse Redis URL for queue:', error.message);
    // Fallback to using default options
    redisOptions = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined
    };
  }
} else {
  // Use traditional host/port/password configuration
  redisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined
  };
  
  logger.info(`Queue Redis config: host=${process.env.REDIS_HOST}, port=${redisOptions.port}`);
}

// Queue names
const VERIFICATION_QUEUE = 'verification-processing';
const NOTIFICATION_QUEUE = 'notifications';
const TRADING_SIGNAL_QUEUE = 'trading-signals';
const ANALYTICS_QUEUE = 'analytics-processing';

// Create queues
const queues = {
  [VERIFICATION_QUEUE]: new Bull(VERIFICATION_QUEUE, { redis: redisOptions }),
  [NOTIFICATION_QUEUE]: new Bull(NOTIFICATION_QUEUE, { redis: redisOptions }),
  [TRADING_SIGNAL_QUEUE]: new Bull(TRADING_SIGNAL_QUEUE, { redis: redisOptions }),
  [ANALYTICS_QUEUE]: new Bull(ANALYTICS_QUEUE, { redis: redisOptions })
};

/**
 * Add a job to the verification processing queue
 * @param {Object} verificationData - Verification data to process
 * @param {Object} options - Job options
 * @returns {Promise<Bull.Job>} - The created job
 */
const addVerificationJob = async (verificationData, options = {}) => {
  try {
    const defaultOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000 // 5 seconds
      },
      removeOnComplete: true
    };
    
    const job = await queues[VERIFICATION_QUEUE].add(
      'process-verification',
      verificationData,
      { ...defaultOptions, ...options }
    );
    
    logger.info('Added verification job to queue', {
      jobId: job.id,
      userId: verificationData.userId
    });
    
    return job;
  } catch (error) {
    logger.error('Failed to add verification job to queue', {
      error: error.message,
      userId: verificationData.userId
    });
    throw new ServiceUnavailableError('Unable to process verification request');
  }
};

/**
 * Add a job to the notification queue
 * @param {Object} notificationData - Notification data
 * @param {Object} options - Job options
 * @returns {Promise<Bull.Job>} - The created job
 */
const addNotificationJob = async (notificationData, options = {}) => {
  try {
    const defaultOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000 // 2 seconds
      },
      removeOnComplete: true
    };
    
    // Add priority based on notification type
    if (notificationData.type === 'urgent' || notificationData.type === 'trading_signal') {
      defaultOptions.priority = 1; // High priority
    }
    
    const job = await queues[NOTIFICATION_QUEUE].add(
      'send-notification',
      notificationData,
      { ...defaultOptions, ...options }
    );
    
    logger.info('Added notification job to queue', {
      jobId: job.id,
      type: notificationData.type,
      userId: notificationData.userId
    });
    
    return job;
  } catch (error) {
    logger.error('Failed to add notification job to queue', {
      error: error.message,
      type: notificationData.type,
      userId: notificationData.userId
    });
    throw new ServiceUnavailableError('Unable to send notification');
  }
};

/**
 * Add a job to the trading signal queue
 * @param {Object} signalData - Trading signal data
 * @param {Object} options - Job options
 * @returns {Promise<Bull.Job>} - The created job
 */
const addTradingSignalJob = async (signalData, options = {}) => {
  try {
    const defaultOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000 // 1 second
      },
      removeOnComplete: true,
      priority: 1 // High priority for trading signals
    };
    
    const job = await queues[TRADING_SIGNAL_QUEUE].add(
      'process-signal',
      signalData,
      { ...defaultOptions, ...options }
    );
    
    logger.info('Added trading signal job to queue', {
      jobId: job.id,
      signalId: signalData.id
    });
    
    return job;
  } catch (error) {
    logger.error('Failed to add trading signal job to queue', {
      error: error.message,
      signalData
    });
    throw new ServiceUnavailableError('Unable to process trading signal');
  }
};

/**
 * Add a job to the analytics processing queue
 * @param {Object} analyticsData - Analytics data to process
 * @param {Object} options - Job options
 * @returns {Promise<Bull.Job>} - The created job
 */
const addAnalyticsJob = async (analyticsData, options = {}) => {
  try {
    const defaultOptions = {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 10000 // 10 seconds
      },
      removeOnComplete: true,
      priority: 5 // Lower priority for analytics
    };
    
    const job = await queues[ANALYTICS_QUEUE].add(
      'process-analytics',
      analyticsData,
      { ...defaultOptions, ...options }
    );
    
    logger.info('Added analytics job to queue', {
      jobId: job.id,
      type: analyticsData.type
    });
    
    return job;
  } catch (error) {
    logger.error('Failed to add analytics job to queue', {
      error: error.message,
      type: analyticsData.type
    });
    throw new ServiceUnavailableError('Unable to process analytics request');
  }
};

/**
 * Get queue statistics
 * @param {string} queueName - Name of the queue (optional)
 * @returns {Promise<Object>} - Queue statistics
 */
const getQueueStats = async (queueName) => {
  try {
    if (queueName && queues[queueName]) {
      const queue = queues[queueName];
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount()
      ]);
      
      return {
        queueName,
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + failed + delayed
      };
    }
    
    // Get stats for all queues
    const stats = {};
    
    for (const [name, queue] of Object.entries(queues)) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount()
      ]);
      
      stats[name] = {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + failed + delayed
      };
    }
    
    return stats;
  } catch (error) {
    logger.error('Failed to get queue statistics', { error: error.message });
    throw new ServiceUnavailableError('Unable to retrieve queue statistics');
  }
};

/**
 * Register a processor function for a specific queue and job type
 * @param {string} queueName - Name of the queue
 * @param {string} jobType - Type of job to process
 * @param {Function} processor - Job processor function
 */
const registerProcessor = (queueName, jobType, processor) => {
  if (!queues[queueName]) {
    logger.error(`Queue ${queueName} does not exist`);
    return;
  }
  
  queues[queueName].process(jobType, processor);
  
  // Set up event listeners for the queue
  const queue = queues[queueName];
  
  queue.on('completed', (job) => {
    logger.info(`Job ${job.id} completed in queue ${queueName}`, {
      jobType: job.name,
      data: job.data
    });
  });
  
  queue.on('failed', (job, error) => {
    logger.error(`Job ${job.id} failed in queue ${queueName}`, {
      jobType: job.name,
      error: error.message,
      data: job.data
    });
  });
  
  queue.on('stalled', (job) => {
    logger.warn(`Job ${job.id} stalled in queue ${queueName}`, {
      jobType: job.name,
      data: job.data
    });
  });
  
  logger.info(`Registered processor for ${jobType} jobs in ${queueName} queue`);
};

/**
 * Clean completed and failed jobs from all queues
 * @returns {Promise<void>}
 */
const cleanQueues = async () => {
  try {
    for (const [name, queue] of Object.entries(queues)) {
      await queue.clean(24 * 60 * 60 * 1000, 'completed'); // Clean completed jobs older than 24 hours
      await queue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // Clean failed jobs older than 7 days
      
      logger.info(`Cleaned queue ${name}`);
    }
  } catch (error) {
    logger.error('Failed to clean queues', { error: error.message });
  }
};

/**
 * Initialize the queue service
 */
const initQueueService = () => {
  // Set up queue cleaning every day
  setInterval(cleanQueues, 24 * 60 * 60 * 1000);
  
  // Set up error handlers for all queues
  for (const [name, queue] of Object.entries(queues)) {
    queue.on('error', (error) => {
      logger.error(`Error in queue ${name}`, { error: error.message });
    });
  }
  
  logger.info('Queue service initialized');
};

module.exports = {
  // Queue names
  VERIFICATION_QUEUE,
  NOTIFICATION_QUEUE,
  TRADING_SIGNAL_QUEUE,
  ANALYTICS_QUEUE,
  
  // Queue operations
  addVerificationJob,
  addNotificationJob,
  addTradingSignalJob,
  addAnalyticsJob,
  getQueueStats,
  registerProcessor,
  cleanQueues,
  initQueueService,
  
  // Queue instances (for direct access if needed)
  queues
};