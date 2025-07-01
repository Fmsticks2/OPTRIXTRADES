# Telegram Bot Synchronization Guide

## Overview

This guide explains how to fully synchronize your OPTRIXTRADES Telegram bot with Telegram servers using webhooks instead of polling. Using webhooks provides several advantages:

- **Improved Reliability**: Webhooks ensure your bot receives updates in real-time without delays
- **Reduced Resource Usage**: Eliminates the need for constant polling, reducing server load
- **Better Scalability**: Handles high message volumes more efficiently
- **Lower Latency**: Provides faster response times to user interactions

## Prerequisites

- A publicly accessible HTTPS server (required by Telegram)
- SSL certificate for your domain
- Your bot token from BotFather

## Implementation Steps

### 1. Update Environment Variables

Add the following variables to your `.env` file:

```
# Telegram Webhook Configuration
TELEGRAM_WEBHOOK_URL=https://your-domain.com/telegram-webhook
TELEGRAM_USE_WEBHOOK=true
```

### 2. Create Express Server for Webhooks

Create a new file `src/server.js` with the following content:

```javascript
const express = require('express');
const bodyParser = require('body-parser');
const { bot } = require('./config/bot');
const { config } = require('./config/appConfig');
const logger = require('./utils/logger');

// Create Express app
const app = express();

// Parse JSON bodies
app.use(bodyParser.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Telegram webhook endpoint
app.post('/telegram-webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app;
```

### 3. Update Bot Configuration

Modify `src/config/bot.js` to support webhook mode:

```javascript
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { config } = require('./appConfig');

// Bot configuration from environment variables
const botToken = process.env.TELEGRAM_BOT_TOKEN;

// Admin Telegram IDs (comma-separated list in .env)
const adminIds = process.env.ADMIN_TELEGRAM_IDS
  ? process.env.ADMIN_TELEGRAM_IDS.split(',').map(id => id.trim())
  : [];

// Channel IDs
const premiumChannelId = process.env.PREMIUM_CHANNEL_ID;
const vipChannelId = process.env.VIP_CHANNEL_ID;

// Broker affiliate link
const brokerAffiliateLink = process.env.BROKER_AFFILIATE_LINK;

// Create bot instance with appropriate options
let bot;
if (config.telegram.useWebhook && config.telegram.webhookUrl) {
  // Webhook mode
  bot = new TelegramBot(botToken, { webHook: { port: process.env.PORT || 3000 } });
  
  // Set webhook
  bot.setWebHook(config.telegram.webhookUrl);
  console.log(`Webhook set to: ${config.telegram.webhookUrl}`);
} else {
  // Polling mode
  bot = new TelegramBot(botToken, { polling: true });
  console.log('Bot started in polling mode');
}

// Check if a user is an admin
const isAdmin = (userId) => {
  return adminIds.includes(userId.toString());
};

module.exports = {
  bot,
  adminIds,
  premiumChannelId,
  vipChannelId,
  brokerAffiliateLink,
  isAdmin
};
```

### 4. Update Main Entry Point

Modify `src/index.js` to support both webhook and polling modes:

```javascript
require('dotenv').config();
const { bot } = require('./config/bot');
const { config } = require('./config/appConfig');
const { initDatabase } = require('./database/init');
const { initializeScheduledJobs } = require('./jobs');
const logger = require('./utils/logger');

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
const initializeBot = async () => {
  try {
    // Initialize database
    await initDatabase();
    logger.info('Database initialized successfully');
    
    // Initialize scheduled jobs
    await initializeScheduledJobs();
    logger.info('Scheduled jobs initialized successfully');
    
    // Start the bot (only start polling if not using webhook)
    if (!config.telegram.useWebhook) {
      bot.startPolling();
      logger.info(`Bot started in polling mode. Username: ${(await bot.getMe()).username}`);
    } else {
      logger.info(`Bot configured for webhook mode. Username: ${(await bot.getMe()).username}`);
      logger.info(`Webhook URL: ${config.telegram.webhookUrl}`);
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
if (config.telegram.useWebhook) {
  require('./server');
}
```

### 5. Update Package.json

Add body-parser dependency by running:

```bash
npm install body-parser --save
```

### 6. Update App.js

Modify `app.js` to support both webhook and polling modes:

```javascript
/**
 * OPTRIXTRADES Bot - Main Entry Point
 * 
 * This file serves as the entry point for the OPTRIXTRADES Telegram bot application.
 * It initializes the bot and all required services.
 */

// Start the bot
require('./src/index');

console.log('OPTRIXTRADES Bot application started');
```

## Deployment Considerations

### SSL Certificate

Telegram requires HTTPS for webhooks. You can use:

- Let's Encrypt for free SSL certificates
- Cloudflare for SSL and proxy services
- A reverse proxy like Nginx with SSL termination

### Server Setup

1. **Nginx Configuration Example**:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location /telegram-webhook {
        proxy_pass http://localhost:3000/telegram-webhook;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

2. **Docker Deployment**:

If using Docker, ensure port 3000 is exposed:

```dockerfile
EXPOSE 3000
```

## Webhook Security

1. **Secret Token**: Consider adding a secret token to your webhook URL for added security
2. **IP Restrictions**: Restrict webhook access to Telegram's IP ranges
3. **Request Validation**: Validate incoming requests to ensure they're from Telegram

## Testing Webhook Setup

You can test your webhook setup using the Telegram Bot API:

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

This will return information about your current webhook configuration.

## Troubleshooting

1. **Webhook Not Working**:
   - Verify your server is publicly accessible
   - Ensure SSL certificate is valid
   - Check server logs for errors

2. **Connection Issues**:
   - Verify firewall settings allow incoming connections
   - Check that your server can handle the request volume

3. **Bot Not Responding**:
   - Verify webhook URL is correctly set
   - Check for errors in your application logs
   - Ensure your bot token is valid

## Conclusion

By implementing webhooks, your OPTRIXTRADES Telegram bot will be more responsive, efficient, and scalable. This setup allows for real-time communication with Telegram's servers, ensuring your users receive prompt responses and notifications.