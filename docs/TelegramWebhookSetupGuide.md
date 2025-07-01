# Telegram Webhook Setup Guide

## Overview

This guide explains how to set up and verify a Telegram webhook for your bot. Webhooks allow your bot to receive updates from Telegram in real-time, which is more efficient than polling for updates.

## Prerequisites

- A Telegram bot token (obtained from [@BotFather](https://t.me/BotFather))
- A publicly accessible HTTPS server to receive webhook requests
- SSL certificate (Telegram only supports HTTPS webhooks)

## Setting Up Your Webhook

### 1. Prepare Your Server

Ensure your server:
- Is accessible via HTTPS (has a valid SSL certificate)
- Has a dedicated endpoint for the webhook (e.g., `/telegram-webhook`)
- Can process POST requests

### 2. Register Your Webhook with Telegram

You can register your webhook using one of these methods:

#### Method 1: Using the Telegram API directly

**IMPORTANT**: Make sure to include `bot` before your token in the URL path!

Make a HTTPS request to the following URL:

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_WEBHOOK_URL>
```

Replace:
- `<YOUR_BOT_TOKEN>` with your actual bot token
- `<YOUR_WEBHOOK_URL>` with your full webhook URL (must be HTTPS)

Example:
```
https://api.telegram.org/bot123456789:ABCDEF-1234567890/setWebhook?url=https://optrixtrades-bot.onrender.com/telegram-webhook
```

> ⚠️ **Common Error**: If you get a 404 "Not Found" error, make sure you included `bot` before your token in the URL. The correct format is `https://api.telegram.org/bot<TOKEN>/setWebhook`, not `https://api.telegram.org/<TOKEN>/setWebhook`.

#### Method 2: Using code in your application

```javascript
const TelegramBot = require('node-telegram-bot-api');

// Bot configuration
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = 'https://optrixtrades-bot.onrender.com/telegram-webhook';

// Create bot instance
const bot = new TelegramBot(botToken, { webHook: false });

// Set webhook
bot.setWebHook(webhookUrl)
  .then(() => console.log(`Webhook set to: ${webhookUrl}`))
  .catch(err => console.error(`Failed to set webhook: ${err.message}`));
```

## Verifying Your Webhook

### 1. Check Webhook Info

To verify that your webhook is properly set up, make a request to:

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

This will return information about your webhook, including:
- `url`: The current webhook URL
- `has_custom_certificate`: Whether you're using a custom certificate
- `pending_update_count`: Number of updates waiting to be delivered
- `last_error_date` and `last_error_message`: Information about any errors
- `max_connections`: Maximum allowed number of simultaneous HTTPS connections
- `ip_address`: The IP address Telegram is connecting to

Example response:
```json
{
  "ok": true,
  "result": {
    "url": "https://optrixtrades-bot.onrender.com/telegram-webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40,
    "ip_address": "216.24.57.4"
  }
}
```

### 2. Test Receiving Updates

Send a message to your bot and check your server logs to confirm that:
1. Your server receives the webhook POST request
2. Your application correctly processes the update

### 3. Troubleshooting

If your webhook isn't working:

- **404 Not Found Error**: Make sure you included `bot` before your token in the API URL
  - Correct: `https://api.telegram.org/bot<TOKEN>/setWebhook`
  - Incorrect: `https://api.telegram.org/<TOKEN>/setWebhook`

- Verify your server is accessible from the internet
- Ensure your SSL certificate is valid and not self-signed
- Check that your bot token is correct
- Look for error messages in the `getWebhookInfo` response
- Examine your server logs for any errors processing webhook requests

## Current OPTRIXTRADES Webhook Configuration

The OPTRIXTRADES bot is currently configured with the following webhook:

- **Webhook endpoint**: `https://optrixtrades-bot.onrender.com/telegram-webhook`
- **Hosting platform**: Render
- **IP Address**: 216.24.57.4
- **Max Connections**: 40

This webhook is properly configured and receiving updates from Telegram.

### Render-Specific Configuration

When deploying to Render, you need to set the `IS_RENDER=true` environment variable. This is important because:

1. Render's internal routing causes webhook requests to appear from `127.0.0.1` instead of Telegram's IP ranges
2. Setting `IS_RENDER=true` allows the application to bypass IP validation for Render hosting
3. The webhook will still validate the secret token for security

> **Note**: For security reasons, `.env` and `.env.production` files are excluded from Git via `.gitignore`. Never commit these files to your repository. For detailed instructions on managing environment variables, see `docs/EnvironmentVariablesGuide.md`.

## Redis Connection Issues

If you see errors like this in your logs:

```
Error for user system in initializeScheduledJobs: Reached the max retries per request limit (which is 20). Refer to "maxRetriesPerRequest" option for details.
MaxRetriesPerRequestError: Reached the max retries per request limit (which is 20). Refer to "maxRetriesPerRequest" option for details.
```

This indicates a problem connecting to Redis, which is used for job scheduling. Possible solutions:

1. Check your Redis connection string in environment variables
2. Verify Redis service is running and accessible
3. Increase the `maxRetriesPerRequest` option in your Redis configuration
4. Add connection retry logic with exponential backoff

## Additional Configuration Options

When setting up your webhook, you can include additional parameters:

- `max_connections`: Maximum number of simultaneous HTTPS connections (1-100)
- `allowed_updates`: JSON array of update types to receive
- `drop_pending_updates`: Boolean to drop all pending updates

Example with additional parameters:

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_WEBHOOK_URL>&max_connections=40&allowed_updates=["message","callback_query"]
```

## Removing a Webhook

To stop using webhooks and switch back to polling:

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook
```

## References

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api#setwebhook)
- [Webhooks vs. Long Polling](https://core.telegram.org/bots/webhooks)
- [Redis Documentation](https://redis.io/documentation)