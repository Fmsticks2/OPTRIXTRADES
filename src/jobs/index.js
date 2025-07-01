const Queue = require('bull');
const Redis = require('ioredis');
const { logger, logError } = require('../utils/logger');
const followUpService = require('../services/followUpService');
const analyticsService = require('../services/analyticsService');

// Parse Redis connection options
let redisConfig;

// Check if REDIS_HOST is a URL (like the one provided by Render)
if (process.env.REDIS_HOST && process.env.REDIS_HOST.startsWith('redis://')) {
  logger.info('Jobs service using Redis URL connection string');
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
      port: parseInt(redisUrl.port || '6379', 10),
      host: redisUrl.hostname,
      password: password,
      db: 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    };
    
    logger.info(`Jobs Redis config: host=${redisUrl.hostname}, port=${redisConfig.port}`);
  } catch (error) {
    logger.error('Failed to parse Redis URL for jobs:', error.message);
    // Fallback to using default options
    redisConfig = {
      port: process.env.REDIS_PORT || 6379,
      host: process.env.REDIS_HOST || 'localhost',
      password: process.env.REDIS_PASSWORD || '',
      db: 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    };
  }
} else {
  // Use traditional host/port/password configuration
  redisConfig = {
    port: process.env.REDIS_PORT || 6379,
    host: process.env.REDIS_HOST || 'localhost',
    password: process.env.REDIS_PASSWORD || '',
    db: 0,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  };
  
  logger.info(`Jobs Redis config: host=${process.env.REDIS_HOST}, port=${redisConfig.port}`);
}

// Create Redis client
const redisClient = new Redis(redisConfig);

// Create queues
const followUpQueue = new Queue('follow-up-queue', { 
  redis: { 
    client: redisClient 
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});

const analyticsQueue = new Queue('analytics-queue', { 
  redis: { 
    client: redisClient 
  },
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});

// Process follow-up queue
followUpQueue.process(async (job) => {
  try {
    logger.info(`Processing follow-up job: ${job.id}`, { jobData: job.data });
    
    const { type, data } = job.data;
    
    if (type === 'send_follow_up') {
      await followUpService.sendFollowUp(data.followUpId);
    } else if (type === 'process_pending_follow_ups') {
      await followUpService.processPendingFollowUps();
    } else {
      throw new Error(`Unknown follow-up job type: ${type}`);
    }
    
    return { success: true };
  } catch (error) {
    logError('system', 'followUpQueue.process', error);
    throw error;
  }
});

// Process analytics queue
analyticsQueue.process(async (job) => {
  try {
    logger.info(`Processing analytics job: ${job.id}`, { jobData: job.data });
    
    const { type, data } = job.data;
    
    if (type === 'generate_daily_report') {
      await analyticsService.generateAnalyticsReport({ reportType: 'daily' });
    } else if (type === 'generate_weekly_report') {
      await analyticsService.generateAnalyticsReport({ reportType: 'weekly' });
    } else if (type === 'generate_monthly_report') {
      await analyticsService.generateAnalyticsReport({ reportType: 'monthly' });
    } else if (type === 'generate_custom_report') {
      await analyticsService.generateAnalyticsReport(data);
    } else {
      throw new Error(`Unknown analytics job type: ${type}`);
    }
    
    return { success: true };
  } catch (error) {
    logError('system', 'analyticsQueue.process', error);
    throw error;
  }
});

// Handle queue events
followUpQueue.on('completed', (job, result) => {
  logger.info(`Follow-up job ${job.id} completed`, { result });
});

followUpQueue.on('failed', (job, error) => {
  logError('system', 'followUpQueue.failed', error, { jobId: job.id, jobData: job.data });
});

analyticsQueue.on('completed', (job, result) => {
  logger.info(`Analytics job ${job.id} completed`, { result });
});

analyticsQueue.on('failed', (job, error) => {
  logError('system', 'analyticsQueue.failed', error, { jobId: job.id, jobData: job.data });
});

/**
 * Schedule a follow-up job
 * @param {number} followUpId - Follow-up ID
 * @param {Date} scheduledTime - Scheduled time
 * @returns {Promise<Object>} - Scheduled job
 */
const scheduleFollowUpJob = async (followUpId, scheduledTime) => {
  try {
    const delay = scheduledTime.getTime() - Date.now();
    
    const job = await followUpQueue.add(
      { type: 'send_follow_up', data: { followUpId } },
      { delay: Math.max(0, delay) }
    );
    
    logger.info(`Scheduled follow-up job ${job.id} for follow-up ${followUpId}`, {
      scheduledTime,
      delay
    });
    
    return job;
  } catch (error) {
    logError('system', 'scheduleFollowUpJob', error);
    throw error;
  }
};

/**
 * Schedule processing of pending follow-ups
 * @param {number} intervalMinutes - Interval in minutes
 * @returns {Promise<Object>} - Scheduled job
 */
const schedulePendingFollowUpsJob = async (intervalMinutes = 15) => {
  try {
    const job = await followUpQueue.add(
      { type: 'process_pending_follow_ups', data: {} },
      { 
        repeat: { 
          every: intervalMinutes * 60 * 1000 
        }
      }
    );
    
    logger.info(`Scheduled pending follow-ups job to run every ${intervalMinutes} minutes`);
    
    return job;
  } catch (error) {
    logError('system', 'schedulePendingFollowUpsJob', error);
    throw error;
  }
};

/**
 * Schedule analytics report generation
 * @param {string} reportType - Report type (daily, weekly, monthly)
 * @returns {Promise<Object>} - Scheduled job
 */
const scheduleAnalyticsReport = async (reportType) => {
  try {
    let cronExpression;
    
    if (reportType === 'daily') {
      // Run daily at 1:00 AM
      cronExpression = '0 1 * * *';
    } else if (reportType === 'weekly') {
      // Run weekly on Monday at 2:00 AM
      cronExpression = '0 2 * * 1';
    } else if (reportType === 'monthly') {
      // Run monthly on the 1st at 3:00 AM
      cronExpression = '0 3 1 * *';
    } else {
      throw new Error(`Invalid report type: ${reportType}`);
    }
    
    const job = await analyticsQueue.add(
      { type: `generate_${reportType}_report`, data: {} },
      { 
        repeat: { 
          cron: cronExpression 
        }
      }
    );
    
    logger.info(`Scheduled ${reportType} analytics report job with cron: ${cronExpression}`);
    
    return job;
  } catch (error) {
    logError('system', 'scheduleAnalyticsReport', error);
    throw error;
  }
};

/**
 * Initialize all scheduled jobs
 * @returns {Promise<void>}
 */
const initializeScheduledJobs = async () => {
  try {
    // Clear existing repeatable jobs
    await followUpQueue.removeRepeatable({ jobId: 'process_pending_follow_ups' });
    await analyticsQueue.removeRepeatable({ jobId: 'generate_daily_report' });
    await analyticsQueue.removeRepeatable({ jobId: 'generate_weekly_report' });
    await analyticsQueue.removeRepeatable({ jobId: 'generate_monthly_report' });
    
    // Schedule jobs
    await schedulePendingFollowUpsJob(15); // Check pending follow-ups every 15 minutes
    await scheduleAnalyticsReport('daily');
    await scheduleAnalyticsReport('weekly');
    await scheduleAnalyticsReport('monthly');
    
    logger.info('All scheduled jobs initialized');
  } catch (error) {
    logError('system', 'initializeScheduledJobs', error);
    throw error;
  }
};

module.exports = {
  followUpQueue,
  analyticsQueue,
  scheduleFollowUpJob,
  schedulePendingFollowUpsJob,
  scheduleAnalyticsReport,
  initializeScheduledJobs
};