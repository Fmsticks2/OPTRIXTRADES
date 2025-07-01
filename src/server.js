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

// Telegram IP ranges for webhook security
// These are the IP ranges that Telegram uses for webhook requests
// Source: https://core.telegram.org/bots/webhooks#the-short-version
const TELEGRAM_IP_RANGES = [
  '149.154.160.0/20',
  '91.108.4.0/22'
];

// Helper function to check if an IP is in a CIDR range
const ipInRange = (ip, cidr) => {
  const [range, bits = 32] = cidr.split('/');
  const mask = ~(2 ** (32 - bits) - 1);
  
  const ipInt = ip.split('.').reduce((int, oct) => (int << 8) + parseInt(oct, 10), 0) >>> 0;
  const rangeInt = range.split('.').reduce((int, oct) => (int << 8) + parseInt(oct, 10), 0) >>> 0;
  
  return (ipInt & mask) === (rangeInt & mask);
};

// Middleware to validate Telegram webhook requests
const validateTelegramWebhook = (req, res, next) => {
  // 1. Check for secret token if configured
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secretToken) {
    const headerToken = req.headers['x-telegram-bot-api-secret-token'];
    if (headerToken !== secretToken) {
      logger.warn('Webhook request rejected: Invalid secret token');
      return res.status(403).send('Unauthorized');
    }
  }
  
  // 2. Validate IP address if not in development mode
  // Skip IP validation on Render as they use internal routing (127.0.0.1)
  const isRenderHosting = process.env.RENDER === 'true' || 
                         process.env.IS_RENDER === 'true' || 
                         process.env.TELEGRAM_WEBHOOK_URL?.includes('render.com');
  
  if (process.env.NODE_ENV === 'production' && !isRenderHosting) {
    const ip = req.ip || 
              req.connection.remoteAddress || 
              req.socket.remoteAddress || 
              req.connection.socket.remoteAddress;
    
    const isValidIP = TELEGRAM_IP_RANGES.some(range => ipInRange(ip, range));
    
    if (!isValidIP) {
      logger.warn(`Webhook request rejected: IP not from Telegram: ${ip}`);
      return res.status(403).send('Unauthorized');
    }
  }
  
  next();
};

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

// Telegram webhook endpoint with validation middleware
app.post('/telegram-webhook', validateTelegramWebhook, (req, res) => {
  // Validate that the request has the expected structure from Telegram
  if (!req.body || !req.body.update_id) {
    logger.warn('Received invalid webhook request without proper Telegram structure');
    return res.status(403).send('Unauthorized');
  }
  
  // Process the update
  bot.processUpdate(req.body);
  logger.debug('Received webhook update from Telegram');
  
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