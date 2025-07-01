# Bot Setup Troubleshooting Guide

This guide addresses common issues that may arise during the setup and operation of your OPTRIXTRADES Telegram bot.

## Connection Issues

### Bot Not Responding to Commands

**Symptoms:**
- Bot doesn't respond to any commands
- No error messages in logs

**Possible Causes and Solutions:**

1. **Invalid Bot Token**
   - Verify your `TELEGRAM_BOT_TOKEN` in the .env file
   - Ensure there are no extra spaces or characters
   - Try regenerating the token via BotFather with `/revoke` and then `/token`

2. **Bot Not Running**
   - Check if your application is running
   - Verify there are no startup errors in the console
   - Restart the application

3. **Webhook Issues (Production)**
   - Verify your webhook URL is correct and accessible
   - Check SSL certificate validity
   - Test webhook setup with:
     ```
     https://api.telegram.org/bot<your_token>/getWebhookInfo
     ```
   - If needed, reset webhook with:
     ```
     https://api.telegram.org/bot<your_token>/setWebhook?url=<your_webhook_url>
     ```

4. **Polling Issues (Development)**
   - Ensure `TELEGRAM_USE_WEBHOOK=false` is set
   - Check for network connectivity issues
   - Verify firewall settings aren't blocking outgoing connections

### Redis Connection Errors

**Symptoms:**
- Error messages like: `Error: getaddrinfo ENOTFOUND red-xxxxx`
- Bot starts but some features may not work

**Solutions:**

1. **For Development:**
   - Set `USE_REDIS=false` in your .env file if Redis is not needed
   - Install Redis locally and ensure it's running
   - Check Redis connection parameters

2. **For Production:**
   - Verify Redis URL is correct
   - Check if Redis service is running
   - Ensure network allows connections to Redis

### Database Connection Issues

**Symptoms:**
- Errors mentioning database connection failures
- Bot starts but commands that require database access fail

**Solutions:**

1. **For Development:**
   - Ensure PostgreSQL is installed and running locally
   - Verify database credentials in .env file
   - Check if database exists and create it if needed

2. **For Production:**
   - Verify database connection string
   - Check if database service is running
   - Ensure IP allowlisting is configured correctly

## Command Registration Issues

### Commands Not Showing in Telegram

**Symptoms:**
- Commands don't appear in the command menu in Telegram
- Autocomplete doesn't work for commands

**Solutions:**

1. **BotFather Configuration:**
   - Send `/setcommands` to BotFather
   - Select your bot
   - Enter the list of commands with descriptions

2. **Command Registration in Code:**
   - Verify that command handlers are properly registered in controller files
   - Check for syntax errors in command registration

### Some Commands Not Working

**Symptoms:**
- Some commands work, others don't
- No error messages when using non-working commands

**Solutions:**

1. **Check Command Handlers:**
   - Verify that all command handlers are properly implemented
   - Look for errors in specific command handler functions

2. **Check Middleware:**
   - Ensure middleware isn't blocking certain commands
   - Check for permission issues (admin-only commands)

## Channel and Permission Issues

### Bot Cannot Post to Channel

**Symptoms:**
- Bot doesn't post messages to channels
- Error messages about insufficient permissions

**Solutions:**

1. **Check Bot Permissions:**
   - Ensure bot is added as an administrator to the channel
   - Verify bot has "Send Messages" permission

2. **Check Channel ID:**
   - Verify the channel ID in your .env file
   - Ensure it's in the correct format (usually `-100xxxxxxxxxx`)

### Admin Commands Not Working

**Symptoms:**
- Admin commands don't work for administrators
- No response or unauthorized messages

**Solutions:**

1. **Check Admin IDs:**
   - Verify `ADMIN_TELEGRAM_IDS` in your .env file
   - Ensure admin IDs are correct and comma-separated
   - Get your Telegram ID by messaging @userinfobot

2. **Check Admin Verification Logic:**
   - Review the `isAdmin` function in your code
   - Ensure admin verification is working correctly

## File Upload Issues

### Verification Screenshots Not Uploading

**Symptoms:**
- Users cannot upload verification screenshots
- Error messages during file upload

**Solutions:**

1. **Check S3 Configuration:**
   - Verify AWS credentials in .env file
   - Ensure S3 bucket exists and is accessible
   - Check permissions on S3 bucket

2. **Check File Size Limits:**
   - Ensure files aren't exceeding Telegram's size limits
   - Check for file type restrictions

## Deployment Issues

### Bot Works Locally But Not in Production

**Symptoms:**
- Bot functions correctly in development but fails in production
- Different behavior between environments

**Solutions:**

1. **Environment Variables:**
   - Compare development and production environment variables
   - Ensure all required variables are set in production

2. **Webhook Configuration:**
   - Verify webhook is properly set up for production
   - Check SSL certificate validity

3. **Network Configuration:**
   - Ensure production environment allows necessary outbound connections
   - Check for firewall or proxy issues

## Logging and Debugging

### Enabling Enhanced Logging

To help diagnose issues, you can enable more detailed logging:

1. **Development:**
   - Set `NODE_ENV=development` in your .env file
   - Check console output for detailed logs

2. **Production:**
   - If possible, temporarily set `NODE_ENV=development`
   - Check application logs in your hosting provider's dashboard

### Common Debugging Techniques

1. **Test Bot API Connection:**
   ```
   https://api.telegram.org/bot<your_token>/getMe
   ```
   This should return information about your bot if the token is valid.

2. **Check Webhook Status:**
   ```
   https://api.telegram.org/bot<your_token>/getWebhookInfo
   ```
   This shows if your webhook is properly configured.

3. **Test Database Connection:**
   Add temporary code to test database connectivity on startup.

4. **Monitor Redis Connection:**
   Add logging for Redis connection events.

## Getting Help

If you've tried the solutions above and are still experiencing issues:

1. Check the Telegram Bot API documentation: https://core.telegram.org/bots/api
2. Review the node-telegram-bot-api documentation: https://github.com/yagop/node-telegram-bot-api
3. Search for similar issues in the project's issue tracker
4. Reach out to the development team with detailed information about the issue, including:
   - Error messages
   - Environment (development or production)
   - Steps to reproduce
   - Logs (with sensitive information redacted)

---

Remember that most bot issues fall into a few categories: configuration problems, permission issues, or connectivity problems. Systematically checking each of these areas will help you identify and resolve the issue quickly.