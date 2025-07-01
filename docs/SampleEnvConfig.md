# Sample Environment Configuration for OPTRIXTRADES Bot

This document provides sample environment configurations for both development and production environments. These configurations are essential for the proper functioning of your Telegram bot.

## Development Environment (.env)

Use this configuration for local development and testing:

```
# Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
ADMIN_TELEGRAM_IDS=your_admin_id_here
PREMIUM_CHANNEL_ID=your_premium_channel_id
VIP_CHANNEL_ID=your_vip_channel_id

# Telegram Webhook Configuration
TELEGRAM_USE_WEBHOOK=false
# No need to set TELEGRAM_WEBHOOK_URL in development mode

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=optrixtrades
DB_USER=postgres
DB_PASSWORD=your_local_db_password
DB_FORCE_SYNC=true

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
USE_REDIS=false

# AWS S3 Configuration (Optional for development)
# AWS_ACCESS_KEY_ID=your_aws_access_key_id
# AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
# AWS_REGION=your_aws_region
# AWS_S3_BUCKET=your_s3_bucket_name

# Broker Configuration
BROKER_AFFILIATE_LINK=https://example.com/affiliate

# Server Configuration
PORT=8080
NODE_ENV=development

# Logging Configuration
CAN_WRITE_LOGS=true
```

## Production Environment (.env.production)

Use this configuration for deployment to production servers:

```
# Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
ADMIN_TELEGRAM_IDS=your_admin_ids_here
PREMIUM_CHANNEL_ID=your_premium_channel_id
VIP_CHANNEL_ID=your_vip_channel_id

# Telegram Webhook Configuration
TELEGRAM_WEBHOOK_URL=https://your-app-name.onrender.com/telegram-webhook
TELEGRAM_USE_WEBHOOK=true

# Database Configuration
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=optrixtrades
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_FORCE_SYNC=false

# Redis Configuration
# For Render Redis, use the full URL provided by Render
REDIS_HOST=redis://your-redis-url:6379
# REDIS_PORT and REDIS_PASSWORD are not needed when using a Redis URL
USE_REDIS=true

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_s3_bucket_name

# Broker Configuration
BROKER_API_URL=your_broker_api_url
BROKER_WSS_URL=your_broker_wss_url
BROKER_AFFILIATE_LINK=your_broker_affiliate_link

# Server Configuration
PORT=8080
NODE_ENV=production

# Logging Configuration
# Set to 'false' in environments where file system writes are restricted (like Render)
CAN_WRITE_LOGS=false
```

## Important Notes

1. **Security**: Never commit your actual .env files to version control. Always use .env.example files with placeholder values.

2. **Telegram Bot Token**: Obtain this from BotFather when creating your bot.

3. **Admin IDs**: These are the Telegram user IDs of administrators who will have access to admin commands. You can get your Telegram ID by messaging @userinfobot.

4. **Channel IDs**: Obtain these by forwarding a message from your channel to @username_to_id_bot.

5. **Webhook Setup**: In production, ensure your server has a valid SSL certificate as Telegram requires HTTPS for webhooks.

6. **Database**: For production, use a managed database service for reliability.

7. **Redis**: Redis is used for caching and session management. In development, you can disable it by setting USE_REDIS=false.

8. **S3 Storage**: Required for storing verification screenshots and other user-uploaded files in production.

## Testing Your Configuration

After setting up your environment variables:

1. Start your application with `node src/index.js`
2. Send a message to your bot on Telegram
3. Check the console logs for any errors
4. If using webhook mode in production, verify the webhook is properly registered by visiting:
   ```
   https://api.telegram.org/bot<your_token>/getWebhookInfo
   ```

Refer to the [ComprehensiveBotFatherGuide.md](./ComprehensiveBotFatherGuide.md) for detailed instructions on setting up your bot with BotFather.