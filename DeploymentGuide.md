# OPTRIXTRADES Bot Deployment Guide

## Deploying to Render

This guide will walk you through deploying the OPTRIXTRADES Telegram bot to Render, a cloud platform that offers free and paid hosting options for web services.

### Prerequisites

1. A [Render](https://render.com/) account
2. A valid Telegram bot token from BotFather
3. PostgreSQL database (can be provisioned on Render or elsewhere)
4. Redis instance (can be provisioned on Render or elsewhere)
5. AWS S3 bucket for file storage

### Security Considerations

**Protecting Sensitive Environment Files**

Never commit sensitive environment files to your repository. The following files should be excluded from Git:
- `.env` - Contains development environment variables
- `.env.production` - Contains production environment variables

These files are already listed in `.gitignore`, but if they were previously committed, you need to remove them from Git tracking without deleting the files:

```bash
git rm --cached .env .env.production
git commit -m "Remove sensitive environment files from tracking"
```

Use the provided `.env.production.example` as a template for creating your `.env.production` file.

### Deployment Steps

#### 1. Set Up Database

You have two options for the PostgreSQL database:

**Option A: Use Render's PostgreSQL Service**

1. In your Render dashboard, go to "New" and select "PostgreSQL"
2. Configure your database:
   - Name: `optrixtrades-db`
   - Database: `optrixtrades`
   - User: Render will generate this
   - Create a secure password
3. Click "Create Database"
4. Once created, note the connection details (host, port, database name, username, password)

**Option B: Use External PostgreSQL Database**

If you prefer to use an external PostgreSQL provider (like AWS RDS, DigitalOcean, etc.), make sure you have the connection details ready.

#### 2. Set Up Redis

You have two options for Redis:

**Option A: Use Render's Redis Service**

1. In your Render dashboard, go to "New" and select "Redis"
2. Configure your Redis instance:
   - Name: `optrixtrades-redis`
   - Create a secure password (optional)
3. Click "Create Redis"
4. Once created, Render will provide a Redis URL in the format `redis://red-xxxxxxxxxx:6379`
5. Copy this entire URL and use it as the `REDIS_HOST` value in your environment variables
6. You don't need to set `REDIS_PORT` or `REDIS_PASSWORD` separately when using the Redis URL

**Option B: Use External Redis Service**

If you prefer to use an external Redis provider (like Redis Labs, AWS ElastiCache, etc.), make sure you have the connection details ready.

#### 3. Deploy the Web Service

**Option A: Deploy using render.yaml (Recommended)**

1. Fork or clone the OPTRIXTRADES repository to your GitHub account
2. In your Render dashboard, go to "New" and select "Blueprint"
3. Connect your GitHub account if you haven't already
4. Select your forked/cloned repository
5. Render will detect the `render.yaml` file and suggest services to deploy
6. Click "Apply" to create the services
7. You'll be prompted to fill in environment variables marked with `sync: false` in the render.yaml file
8. Fill in all the required environment variables with your actual values
9. Click "Create Services"

**Option B: Manual Deployment**

1. In your Render dashboard, go to "New" and select "Web Service"
2. Connect your GitHub account if you haven't already
3. Select your forked/cloned repository
4. Configure the service:
   - Name: `optrixtrades-bot`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add all the environment variables from your `.env.production` file
6. Click "Create Web Service"

#### 4. Configure Webhook URL

After your service is deployed:

1. Note the URL of your Render web service (e.g., `https://optrixtrades-bot.onrender.com`)
2. Update the `TELEGRAM_WEBHOOK_URL` environment variable to `https://optrixtrades-bot.onrender.com/telegram-webhook`
3. Make sure `TELEGRAM_USE_WEBHOOK` is set to `true`

#### 5. Verify Webhook Setup

To verify that your webhook is properly set up:

1. Visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo` in your browser (replace `<YOUR_BOT_TOKEN>` with your actual bot token)
2. You should see a JSON response with your webhook URL and status

### Environment Variables

Make sure all these environment variables are properly set in your Render service:

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
NODE_ENV=production

# Redis Configuration
# For Render Redis, use the full URL provided by Render
REDIS_HOST=redis://red-xxxxxxxxxx:6379
# REDIS_PORT and REDIS_PASSWORD are not needed when using a Redis URL
# REDIS_PORT=6379
# REDIS_PASSWORD=your_redis_password
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
PORT=3000
```

### Troubleshooting

1. **Bot not responding to commands**:
   - Check the logs in your Render dashboard
   - Verify webhook is properly set up using getWebhookInfo
   - Ensure your bot token is correct

2. **Database connection issues**:
   - Check database credentials
   - Ensure database is accessible from Render (check network rules)
   - Check if DB_FORCE_SYNC is set correctly (should be false in production)

3. **Redis connection issues**:
   - When using Render's Redis, make sure you're using the full Redis URL in the `REDIS_HOST` variable
   - The URL should look like `redis://red-xxxxxxxxxx:6379`
   - The application has been updated to properly parse Redis URLs in all services (main Redis client, queue service, and jobs service), but if you encounter issues, you can try these alternatives:
       - Option 1: Keep using `REDIS_HOST` with the full URL (recommended)
       - Option 2: Set `REDIS_HOST` to just the hostname (e.g., `red-xxxxxxxxxx`) and set `REDIS_PORT=6379` separately
   - Ensure Redis is accessible from your web service (they should be in the same region)
   - If Redis is optional for your application, you can set `USE_REDIS=false` to use the mock Redis client

4. **File upload issues**:
   - Verify AWS S3 credentials
   - Check bucket permissions
   - Ensure the region is correctly specified

### Scaling Considerations

1. **Upgrade Plan**: If your bot experiences high traffic, consider upgrading from the free tier to a paid plan on Render

2. **Database Scaling**: Monitor database performance and upgrade as needed

3. **Redis Caching**: Ensure Redis is properly configured for caching to reduce database load

4. **Webhook Efficiency**: Using webhooks is more efficient than polling, especially for high-traffic bots

### Maintenance

1. **Logs**: Regularly check logs in the Render dashboard

2. **Updates**: Set up automatic deploys from your GitHub repository

3. **Backups**: Regularly backup your database

4. **Monitoring**: Set up monitoring and alerts for your service