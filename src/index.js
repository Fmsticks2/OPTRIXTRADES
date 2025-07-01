require('dotenv').config();
const { bot } = require('./config/bot');
const { initDatabase } = require('./database/init');
const { initializeScheduledJobs } = require('./jobs');
const { logger } = require('./utils/logger');

// Load bot extensions
require('./utils/botExtensions');

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

// Add graceful shutdown handling
let server;
const gracefulShutdown = () => {
  logger.info('Received shutdown signal, closing server and connections...');
  
  // Stop the bot if it's running
  if (bot) {
    try {
      if (!useWebhook) {
        bot.stopPolling();
      }
      logger.info('Bot stopped successfully');
    } catch (error) {
      logger.error('Error stopping bot:', error);
    }
  }
  
  // Close the server if it's running
  if (server) {
    try {
      server.close(() => {
        logger.info('Express server closed successfully');
      });
    } catch (error) {
      logger.error('Error closing server:', error);
    }
  }
  
  // Allow some time for cleanup before exiting
  setTimeout(() => {
    logger.info('Exiting process...');
    process.exit(0);
  }, 1000);
};

// Listen for termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Initialize the bot
initializeBot();

// If using webhook mode, also require the server
if (useWebhook) {
  try {
    logger.info('Starting Express server for webhook mode...');
    const { server: expressServer } = require('./server');
    server = expressServer; // Store server reference for graceful shutdown
    logger.info('Express server module loaded successfully');
  } catch (error) {
    logger.error('Failed to start Express server:', error);
    logger.warn('Bot will continue running without webhook server');
  }
}