require('dotenv').config();
const { bot } = require('./config/bot');
const { initDatabase } = require('./database/init');
const { initializeScheduledJobs } = require('./jobs');
const { logger } = require('./utils/logger');

// Check if webhook mode is enabled
const useWebhook = process.env.TELEGRAM_USE_WEBHOOK === 'true';

// Import controllers
const welcomeController = require('./controllers/welcomeController');
const verificationController = require('./controllers/verificationController');
const tradingController = require('./controllers/tradingController');
const supportController = require('./controllers/supportController');
const accountController = require('./controllers/accountController');
const adminController = require('./controllers/adminController');

/**
 * Initialize the bot and all services
 */
async function initializeBot() {
  try {
    // Initialize database (skip if there's an error)
    try {
      const dbInitialized = await initDatabase();
      if (dbInitialized) {
        logger.info('Database initialized successfully');
      } else {
        logger.warn('Database initialization skipped or failed - continuing without database');
      }
    } catch (dbError) {
      logger.warn('Database initialization error - continuing without database:', dbError.message);
    }
    
    // Initialize scheduled jobs (skip if there's an error)
    try {
      await initializeScheduledJobs();
      logger.info('Scheduled jobs initialized successfully');
    } catch (jobsError) {
      logger.warn('Scheduled jobs initialization error - continuing without jobs:', jobsError.message);
    }
    
    // Start the bot (only start polling if not using webhook)
    if (!useWebhook) {
      bot.startPolling();
      logger.info(`Bot started in polling mode. Username: ${(await bot.getMe()).username}`);
    } else {
      logger.info(`Bot configured for webhook mode. Username: ${(await bot.getMe()).username}`);
      logger.info(`Webhook URL: ${process.env.TELEGRAM_WEBHOOK_URL}`);
    }
    
    // Log startup
    logger.info('OPTRIXTRADES Bot is now running');
  } catch (error) {
    logger.error('Error initializing bot:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// Initialize the bot
initializeBot();

// If using webhook mode, also require the server
if (useWebhook) {
  require('./server');
}