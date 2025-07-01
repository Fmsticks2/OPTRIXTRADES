# Webhook Implementation Guide for OPTRIXTRADES Telegram Bot

This guide provides detailed instructions for implementing and configuring webhooks for your OPTRIXTRADES Telegram bot. Webhooks offer a more efficient way to receive updates from Telegram compared to polling, making them ideal for production environments.

## Table of Contents

1. [Understanding Webhooks vs. Polling](#understanding-webhooks-vs-polling)
2. [Prerequisites](#prerequisites)
3. [Server Configuration](#server-configuration)
4. [Webhook Implementation in Code](#webhook-implementation-in-code)
5. [Setting Up the Webhook with Telegram](#setting-up-the-webhook-with-telegram)
6. [Testing Your Webhook](#testing-your-webhook)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)
9. [Switching Between Polling and Webhook](#switching-between-polling-and-webhook)

## Understanding Webhooks vs. Polling

### Polling

- **How it works**: Your bot continuously asks Telegram's servers if there are new messages
- **Pros**: Simple to implement, good for development
- **Cons**: Less efficient, higher server load, potential delays

### Webhooks

- **How it works**: Telegram sends updates to your server as they occur
- **Pros**: More efficient, real-time updates, lower server load
- **Cons**: Requires HTTPS, more complex setup, needs a public-facing server

## Prerequisites

Before implementing webhooks, ensure you have:

1. **A domain with SSL certificate**: Telegram requires HTTPS for webhooks
2. **A public-facing server**: Your server must be accessible from the internet
3. **Your bot token**: Obtained from BotFather
4. **Node.js and node-telegram-bot-api**: Installed and configured

## Server Configuration

### Setting Up SSL

If you don't already have SSL configured, you can use Let's Encrypt to get a free SSL certificate:

1. Install Certbot: [https://certbot.eff.org/](https://certbot.eff.org/)
2. Follow the instructions for your server type
3. Verify SSL is working by accessing your domain via HTTPS

### Configuring Your Web Server

#### Nginx Configuration Example

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location /bot {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Apache Configuration Example

```apache
<VirtualHost *:443>
    ServerName your-domain.com
    
    SSLEngine on
    SSLCertificateFile /path/to/fullchain.pem
    SSLCertificateKeyFile /path/to/privkey.pem
    
    ProxyPass /bot http://localhost:8080
    ProxyPassReverse /bot http://localhost:8080
</VirtualHost>
```

## Webhook Implementation in Code

### Basic Webhook Setup

Update your bot configuration in `src/config/bot.js`:

```javascript
const TelegramBot = require('node-telegram-bot-api');
const logger = require('../utils/logger');

// Get configuration from environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
const port = process.env.PORT || 8080;

// Determine if we're in production mode
const isProduction = process.env.NODE_ENV === 'production';

let bot;

if (isProduction) {
  // Production: Use webhook
  bot = new TelegramBot(token, {
    webHook: {
      port: port,
      host: '0.0.0.0' // Bind to all network interfaces
    }
  });
  
  // Set webhook path (the path will be https://your-domain.com/bot<token>)
  const webhookPath = `/bot${token}`;
  bot.setWebHook(`${webhookUrl}${webhookPath}`);
  
  logger.info(`Webhook set to ${webhookUrl}${webhookPath}`);
} else {
  // Development: Use polling
  bot = new TelegramBot(token, { polling: true });
  logger.info('Bot started with polling');
}

module.exports = bot;
```

### Express Server Integration

If you're using Express, update your `src/server.js`:

```javascript
const express = require('express');
const bodyParser = require('body-parser');
const bot = require('./config/bot');
const logger = require('./utils/logger');

// Create Express app
const app = express();

// Parse JSON bodies
app.use(bodyParser.json());

// Get configuration from environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;
const port = process.env.PORT || 8080;
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  // Set the webhook route
  const webhookPath = `/bot${token}`;
  app.post(webhookPath, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
  
  logger.info(`Webhook endpoint configured at ${webhookPath}`);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  logger.info(`Server is running on port ${port}`);
});

module.exports = app;
```

## Setting Up the Webhook with Telegram

### Method 1: Using the Telegram API

You can set up the webhook programmatically as shown in the code above with `bot.setWebHook()`, or you can make a direct HTTP request to the Telegram API:

```
https://api.telegram.org/bot<token>/setWebhook?url=https://your-domain.com/bot<token>
```

Replace `<token>` with your actual bot token.

### Method 2: Using a Setup Script

Create a setup script in your project:

```javascript
// scripts/setup-webhook.js
require('dotenv').config();
const axios = require('axios');

const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;

async function setupWebhook() {
  try {
    const webhookPath = `/bot${token}`;
    const response = await axios.get(
      `https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}${webhookPath}`
    );
    
    console.log('Webhook setup response:', response.data);
  } catch (error) {
    console.error('Error setting up webhook:', error.message);
  }
}

setupWebhook();
```

Run this script with:

```bash
node scripts/setup-webhook.js
```

### Method 3: Checking Webhook Status

To verify your webhook is set correctly:

```
https://api.telegram.org/bot<token>/getWebhookInfo
```

This will return information about your current webhook configuration.

## Testing Your Webhook

### 1. Deploy Your Application

Deploy your application to your server with the webhook configuration.

### 2. Verify Webhook Setup

Check the webhook status using the getWebhookInfo method mentioned above.

### 3. Send a Message to Your Bot

Open Telegram and send a message to your bot. If everything is set up correctly, your bot should respond.

### 4. Check Server Logs

Monitor your server logs to see incoming webhook requests and any potential errors.

## Security Considerations

### 1. Validate Webhook Requests

Ensure that requests to your webhook endpoint are actually from Telegram:

```javascript
app.post(webhookPath, (req, res) => {
  // Simple validation - check if the request has the expected structure
  if (!req.body || !req.body.update_id) {
    return res.status(403).send('Unauthorized');
  }
  
  bot.processUpdate(req.body);
  res.sendStatus(200);
});
```

### 2. Use HTTPS

Always use HTTPS for your webhook endpoint. Telegram requires this, and it ensures that the communication between Telegram and your server is encrypted.

### 3. Limit Access to Your Webhook Endpoint

Configure your firewall to only allow Telegram's IP addresses to access your webhook endpoint if possible.

## Troubleshooting

### Common Issues and Solutions

#### Webhook Not Working

1. **Check SSL Certificate**: Ensure your SSL certificate is valid and not expired
2. **Verify Domain Accessibility**: Make sure your domain is publicly accessible
3. **Check Server Logs**: Look for any errors in your server logs
4. **Verify Webhook URL**: Ensure the webhook URL is correct and includes the full path

#### Error: Self-signed Certificate

Telegram requires a valid SSL certificate. Self-signed certificates won't work unless you explicitly configure the API to accept them (not recommended for production).

#### Error: Connection Refused

Ensure your server is running and the port is open and accessible from the internet.

#### Error: Webhook Request Timeout

Your server is taking too long to respond to webhook requests. Optimize your code to respond quickly.

## Switching Between Polling and Webhook

### From Polling to Webhook

1. Stop your bot
2. Set up the webhook as described above
3. Restart your bot with webhook configuration

### From Webhook to Polling

1. Delete the existing webhook:

```
https://api.telegram.org/bot<token>/deleteWebhook
```

2. Update your code to use polling instead of webhook
3. Restart your bot

### Environment-based Configuration

As shown in the code examples, you can use environment variables to determine whether to use polling or webhook:

```javascript
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  // Use webhook
} else {
  // Use polling
}
```

This allows you to use polling in development and webhook in production.

---

By following this guide, you should be able to successfully implement and configure webhooks for your OPTRIXTRADES Telegram bot. Webhooks provide a more efficient way to receive updates from Telegram, making them ideal for production environments.