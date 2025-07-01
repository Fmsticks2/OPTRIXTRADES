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
const PORT = process.env.PORT || 8080;

// Add a simple route to test if the server is running
app.get('/', (req, res) => {
  res.send('OPTRIXTRADES Bot server is running');
});

// Log all environment variables for debugging
logger.info(`Environment variables: NODE_ENV=${process.env.NODE_ENV}, PORT=${PORT}`);

// Start the server with proper error handling
let server;

try {
  logger.info(`Starting Express server on port ${PORT}...`);
  server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT}`);
    
    // Use the configured webhook URL from environment variables
    // In production, TELEGRAM_WEBHOOK_URL must be set
    if (!process.env.TELEGRAM_WEBHOOK_URL && process.env.NODE_ENV === 'production') {
      logger.warn('TELEGRAM_WEBHOOK_URL is not set in production environment. Webhook functionality may not work correctly.');
    }
    
    const baseUrl = process.env.TELEGRAM_WEBHOOK_URL 
      ? new URL(process.env.TELEGRAM_WEBHOOK_URL).origin 
      : process.env.NODE_ENV === 'production'
        ? 'https://your-app-domain.com' // Placeholder that should be replaced with actual domain
        : `http://localhost:${PORT}`;
    
    logger.info(`Webhook endpoint: ${baseUrl}/telegram-webhook`);
    logger.info(`Health check endpoint: ${baseUrl}/health`);
    logger.info(`Root endpoint: ${baseUrl}/`);
  });
  
  // Add error handler
  server.on('error', (error) => {
    logger.error(`SERVER ERROR: ${error.message} (Code: ${error.code})`);
    
    if (error.code === 'EADDRINUSE') {
      logger.error(`CRITICAL: Port ${PORT} is already in use. This is likely because another instance is running or the port is reserved.`);
      logger.error(`On Render, make sure the PORT environment variable is set to 8080 in your render.yaml file.`);
    } else {
      logger.error('CRITICAL: Server error:', error);
    }
  });
} catch (error) {
  logger.error(`CRITICAL: Failed to start server on port ${PORT}:`, error);
  server = null;
}

// Error handling for server initialization
if (!server) {
  logger.error('CRITICAL: Server was not initialized properly');
}

module.exports = { app, server };