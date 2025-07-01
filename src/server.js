/**
 * Express server for handling Telegram webhook requests
 * 
 * This file sets up an Express server to receive webhook requests from Telegram.
 * It is only used when the bot is running in webhook mode (TELEGRAM_USE_WEBHOOK=true).
 */

const express = require('express');
const bodyParser = require('body-parser');
const { bot } = require('./config/bot');
const { config } = require('./config/appConfig');
const { logger } = require('./utils/logger');

// Create Express app
const app = express();

// Parse JSON bodies
app.use(bodyParser.json());

// Health check endpoint with detailed status
app.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'OPTRIXTRADES Bot',
      version: require('../package.json').version,
      uptime: `${Math.floor(process.uptime())} seconds`,
      environment: process.env.NODE_ENV || 'development',
      webhook_mode: config.telegram.useWebhook ? 'enabled' : 'disabled',
      components: {
        server: { status: 'ok' }
      }
    };
    
    res.status(200).json(healthStatus);
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Error generating health status',
      error: error.message 
    });
  }
});

// Telegram webhook endpoint
app.post('/telegram-webhook', (req, res) => {
  if (req.body) {
    // Process the update
    bot.processUpdate(req.body);
    logger.debug('Received webhook update from Telegram');
  } else {
    logger.warn('Received webhook request with no body');
  }
  
  // Always respond with 200 OK to Telegram
  res.sendStatus(200);
});

// Get port from environment variable or use default
const PORT = process.env.PORT || 3000;

// Start the server with error handling
logger.info(`Attempting to start Express server on port ${PORT}...`);
let server;

// Add a simple route to test if the server is running
app.get('/', (req, res) => {
  res.send('OPTRIXTRADES Bot server is running');
});

// Log all environment variables for debugging
logger.info(`Environment variables: NODE_ENV=${process.env.NODE_ENV}, PORT=${PORT}`);

try {
  logger.info(`Creating server instance...`);
  server = app.listen(PORT, () => {
    logger.info(`SUCCESS: Express server listening on port ${PORT}`);
    logger.info(`Webhook endpoint: http://localhost:${PORT}/telegram-webhook`);
    logger.info(`Health check endpoint: http://localhost:${PORT}/health`);
    logger.info(`Root endpoint: http://localhost:${PORT}/`);
  });
  logger.info(`Server instance created, waiting for it to start...`);
} catch (error) {
  logger.error(`CRITICAL: Failed to start server on port ${PORT}:`, error);
}

// Add error handling for the server
if (server) {
  logger.info('Adding error handler to server...');
  server.on('error', (error) => {
    logger.error(`SERVER ERROR: ${error.message} (Code: ${error.code})`);
    
    if (error.code === 'EADDRINUSE') {
      logger.error(`CRITICAL: Port ${PORT} is already in use. Please use a different port or stop the other process.`);
      
      // Try another port automatically
      const newPort = parseInt(PORT) + 1;
      logger.info(`Attempting to use port ${newPort} instead...`);
      
      try {
        logger.info(`Creating new server instance on port ${newPort}...`);
        server = app.listen(newPort, () => {
          logger.info(`SUCCESS: Express server listening on alternate port ${newPort}`);
          logger.info(`Webhook endpoint: http://localhost:${newPort}/telegram-webhook`);
          logger.info(`Health check endpoint: http://localhost:${newPort}/health`);
          logger.info(`Root endpoint: http://localhost:${newPort}/`);
        });
        logger.info(`New server instance created, waiting for it to start...`);
      } catch (retryError) {
        logger.error(`CRITICAL: Failed to start server on alternate port ${newPort}:`, retryError);
      }
    } else {
      logger.error('CRITICAL: Server error:', error);
    }
  });
} else {
  logger.error('CRITICAL: Server was not initialized properly');
}

module.exports = { app, server };