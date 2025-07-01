/**
 * Application Configuration for OPTRIXTRADES
 * Centralizes all application configuration settings
 */

require('dotenv').config();
const path = require('path');
const { logger } = require('../utils/logger');

// Environment detection
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';
const isDev = NODE_ENV === 'development';
const isTest = NODE_ENV === 'test';

// Default configuration values
const defaults = {
  // Server settings
  port: 10000,
  host: 'localhost',
  
  // Database settings
  db: {
    host: 'localhost',
    port: 5432,
    database: 'optrixtrades',
    username: 'postgres',
    password: '',
    dialect: 'postgres',
    logging: isDev,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    forceSync: false
  },
  
  // Redis settings
  redis: {
    host: 'localhost',
    port: 6379,
    password: '',
    keyPrefix: 'optrix:'
  },
  
  // Telegram bot settings
  telegram: {
    token: '',
    webhookUrl: '',
    useWebhook: isProd,
    adminIds: [],
    channelIds: {
      announcements: '',
      premium: '',
      vip: ''
    }
  },
  
  // Verification settings
  verification: {
    requiredFields: ['first_name', 'last_name', 'broker_uid', 'deposit_amount'],
    minDepositAmount: 0,
    autoVerifyDeposits: false,
    autoVerifyThreshold: 1000
  },
  
  // Subscription tiers
  subscriptionTiers: {
    free: {
      name: 'Free',
      minDeposit: 0,
      features: ['Limited access to bot features']
    },
    basic: {
      name: 'Basic',
      minDeposit: 20,
      features: ['Basic trading signals', 'Market updates', 'Basic bot functions']
    },
    premium: {
      name: 'Premium',
      minDeposit: 100,
      features: ['Premium trading signals', 'Market analysis', 'Priority support', 'Enhanced bot functions']
    },
    vip: {
      name: 'VIP',
      minDeposit: 500,
      features: ['VIP trading signals', 'One-on-one consultations', 'Exclusive webinars', 'Custom risk management', 'Full access to all bot functions and tools', 'AI Auto-Trading']
    }
  },
  
  // Trading settings
  trading: {
    defaultRiskPerTrade: 1, // Percentage
    maxRiskPerTrade: 5, // Percentage
    maxTradeAmount: 0, // 0 means no limit
    signalValidityHours: 24
  },
  
  // Follow-up sequence settings
  followUp: {
    enabled: true,
    maxDays: 7,
    reminderHour: 12 // Hour of the day to send reminders (0-23)
  },
  
  // Security settings
  security: {
    rateLimits: {
      verification: {
        maxAttempts: 3,
        timeWindowMs: 24 * 60 * 60 * 1000 // 24 hours
      },
      commands: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 20 // Max 20 commands per minute
      }
    },
    inputValidation: {
      maxTextLength: 1000,
      allowedTags: ['b', 'i', 'u', 'code', 'pre']
    }
  },
  
  // Logging settings
  logging: {
    level: isDev ? 'debug' : 'info',
    console: true,
    file: true,
    logDir: path.resolve(process.cwd(), 'logs'),
    maxFiles: '14d', // Keep logs for 14 days
    maxSize: '20m' // 20 MB per file
  },
  
  // Caching settings
  cache: {
    enabled: true,
    ttl: {
      user: 60 * 5, // 5 minutes
      verification: 60 * 30, // 30 minutes
      tradingSignal: 60 * 15, // 15 minutes
      stats: 60 * 60 // 1 hour
    }
  },
  
  // Queue settings
  queue: {
    cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
    jobRetention: {
      completed: 24 * 60 * 60 * 1000, // 24 hours
      failed: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  },
  
  // Performance monitoring
  monitoring: {
    enabled: true,
    resourceCheckInterval: 60 * 1000, // 1 minute
    metricsRetention: 7 * 24 * 60 * 60 // 7 days
  }
};

// Load environment-specific configuration
const loadEnvConfig = () => {
  const config = { ...defaults };
  
  // Server settings
  config.port = parseInt(process.env.PORT || defaults.port, 10);
  config.host = process.env.HOST || defaults.host;
  
  // Database settings
  config.db.host = process.env.DB_HOST || defaults.db.host;
  config.db.port = parseInt(process.env.DB_PORT || defaults.db.port, 10);
  config.db.database = process.env.DB_NAME || defaults.db.database;
  config.db.username = process.env.DB_USER || defaults.db.username;
  config.db.password = process.env.DB_PASSWORD || defaults.db.password;
  config.db.logging = process.env.DB_LOGGING === 'true' ? true : (process.env.DB_LOGGING === 'false' ? false : defaults.db.logging);
  config.db.forceSync = process.env.DB_FORCE_SYNC === 'true';
  
  // Redis settings
  config.redis.host = process.env.REDIS_HOST || defaults.redis.host;
  config.redis.port = parseInt(process.env.REDIS_PORT || defaults.redis.port, 10);
  config.redis.password = process.env.REDIS_PASSWORD || defaults.redis.password;
  config.redis.keyPrefix = process.env.REDIS_KEY_PREFIX || defaults.redis.keyPrefix;
  
  // Telegram bot settings
  config.telegram.token = process.env.TELEGRAM_BOT_TOKEN || defaults.telegram.token;
  config.telegram.webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || defaults.telegram.webhookUrl;
  config.telegram.useWebhook = process.env.TELEGRAM_USE_WEBHOOK === 'true' ? true : (process.env.TELEGRAM_USE_WEBHOOK === 'false' ? false : defaults.telegram.useWebhook);
  
  // Parse admin IDs from environment
  if (process.env.TELEGRAM_ADMIN_IDS) {
    config.telegram.adminIds = process.env.TELEGRAM_ADMIN_IDS.split(',').map(id => id.trim());
  }
  
  // Parse channel IDs from environment
  config.telegram.channelIds.announcements = process.env.TELEGRAM_ANNOUNCEMENTS_CHANNEL || defaults.telegram.channelIds.announcements;
  config.telegram.channelIds.premium = process.env.TELEGRAM_PREMIUM_CHANNEL || defaults.telegram.channelIds.premium;
  config.telegram.channelIds.vip = process.env.TELEGRAM_VIP_CHANNEL || defaults.telegram.channelIds.vip;
  
  // Verification settings
  config.verification.minDepositAmount = parseFloat(process.env.MIN_DEPOSIT_AMOUNT || defaults.verification.minDepositAmount);
  config.verification.autoVerifyDeposits = process.env.AUTO_VERIFY_DEPOSITS === 'true';
  config.verification.autoVerifyThreshold = parseFloat(process.env.AUTO_VERIFY_THRESHOLD || defaults.verification.autoVerifyThreshold);
  
  // Subscription tier thresholds
  config.subscriptionTiers.premium.minDeposit = parseFloat(process.env.PREMIUM_MIN_DEPOSIT || defaults.subscriptionTiers.premium.minDeposit);
  config.subscriptionTiers.vip.minDeposit = parseFloat(process.env.VIP_MIN_DEPOSIT || defaults.subscriptionTiers.vip.minDeposit);
  
  // Trading settings
  config.trading.defaultRiskPerTrade = parseFloat(process.env.DEFAULT_RISK_PER_TRADE || defaults.trading.defaultRiskPerTrade);
  config.trading.maxRiskPerTrade = parseFloat(process.env.MAX_RISK_PER_TRADE || defaults.trading.maxRiskPerTrade);
  config.trading.maxTradeAmount = parseFloat(process.env.MAX_TRADE_AMOUNT || defaults.trading.maxTradeAmount);
  config.trading.signalValidityHours = parseInt(process.env.SIGNAL_VALIDITY_HOURS || defaults.trading.signalValidityHours, 10);
  
  // Follow-up sequence settings
  config.followUp.enabled = process.env.FOLLOW_UP_ENABLED !== 'false';
  config.followUp.maxDays = parseInt(process.env.FOLLOW_UP_MAX_DAYS || defaults.followUp.maxDays, 10);
  config.followUp.reminderHour = parseInt(process.env.FOLLOW_UP_REMINDER_HOUR || defaults.followUp.reminderHour, 10);
  
  // Logging settings
  config.logging.level = process.env.LOG_LEVEL || defaults.logging.level;
  config.logging.console = process.env.LOG_CONSOLE !== 'false';
  config.logging.file = process.env.LOG_FILE !== 'false';
  config.logging.logDir = process.env.LOG_DIR || defaults.logging.logDir;
  
  // Caching settings
  config.cache.enabled = process.env.CACHE_ENABLED !== 'false';
  
  if (process.env.CACHE_TTL_USER) {
    config.cache.ttl.user = parseInt(process.env.CACHE_TTL_USER, 10);
  }
  
  if (process.env.CACHE_TTL_VERIFICATION) {
    config.cache.ttl.verification = parseInt(process.env.CACHE_TTL_VERIFICATION, 10);
  }
  
  if (process.env.CACHE_TTL_TRADING_SIGNAL) {
    config.cache.ttl.tradingSignal = parseInt(process.env.CACHE_TTL_TRADING_SIGNAL, 10);
  }
  
  if (process.env.CACHE_TTL_STATS) {
    config.cache.ttl.stats = parseInt(process.env.CACHE_TTL_STATS, 10);
  }
  
  // Monitoring settings
  config.monitoring.enabled = process.env.MONITORING_ENABLED !== 'false';
  
  return config;
};

// Load configuration
const config = loadEnvConfig();

// Validate critical configuration
const validateConfig = () => {
  const criticalErrors = [];
  
  // Check for Telegram bot token
  if (!config.telegram.token) {
    criticalErrors.push('TELEGRAM_BOT_TOKEN is not set');
  }
  
  // Check for database configuration
  if (!config.db.database || !config.db.username) {
    criticalErrors.push('Database configuration is incomplete');
  }
  
  // Log validation results
  if (criticalErrors.length > 0) {
    logger.error('Critical configuration errors:', { errors: criticalErrors });
    throw new Error(`Configuration validation failed: ${criticalErrors.join(', ')}`);
  }
  
  logger.info('Configuration validated successfully');
  return true;
};

// Export configuration and utilities
module.exports = {
  config,
  validateConfig,
  isProd,
  isDev,
  isTest,
  NODE_ENV
};