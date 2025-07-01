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

// Start the server
app.listen(PORT, () => {
  logger.info(`Express server listening on port ${PORT}`);
  logger.info(`Webhook endpoint: http://localhost:${PORT}/telegram-webhook`);
  logger.info(`Health check endpoint: http://localhost:${PORT}/health`);
});

module.exports = app;