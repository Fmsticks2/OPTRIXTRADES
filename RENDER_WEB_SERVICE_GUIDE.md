# Deploying OPTRIXTRADES Bot to Render as a Web Service

This guide provides comprehensive instructions for deploying the OPTRIXTRADES Telegram bot to Render as a web service. Render is a unified cloud platform that offers fully managed services with free SSL, global CDN, private networks, and auto deploys from Git.

## Prerequisites

1. A [Render](https://render.com/) account
2. Your GitHub repository with the OPTRIXTRADES bot code
3. A valid Telegram bot token (from BotFather)
4. PostgreSQL database (can be provisioned on Render or elsewhere)
5. Redis instance (can be provisioned on Render or elsewhere)
6. AWS S3 bucket for file storage (optional, but recommended)

## Implementation Steps

### 1. Prepare Your Repository

1. Make sure your code is pushed to a GitHub repository
2. Ensure your `.env.production` file is properly configured with all required variables
3. Verify that the `render.yaml` file is present in the root of your repository

> **IMPORTANT: Protecting Sensitive Information**
> 
> Never commit sensitive environment files to your repository. The following files should be excluded from Git:
> - `.env` - Contains development environment variables
> - `.env.production` - Contains production environment variables
> 
> These files are already listed in `.gitignore`, but if they were previously committed, you need to remove them from Git tracking without deleting the files:
> ```bash
> git rm --cached .env .env.production
> git commit -m "Remove sensitive environment files from tracking"
> ```
> 
> Use the provided `.env.production.example` as a template for creating your `.env.production` file.

### 2. Set Up Database

You have two options for the PostgreSQL database:

#### Option A: Use Render's PostgreSQL Service (Recommended)

1. In your Render dashboard, go to "New" and select "PostgreSQL"
2. Configure your database:
   - Name: `optrixtrades-db`
   - Database: `optrixtrades`
   - User: Render will generate this
   - Create a secure password
3. Click "Create Database"
4. Once created, note the connection details (host, port, database name, username, password)
5. **Important**: The database hostname provided by Render will look like `dpg-xxxxxxxx-a`. You must use the full hostname including the region suffix in your environment variables, for example: `dpg-xxxxxxxx-a.oregon-postgres.render.com`

#### Option B: Use External PostgreSQL Database

If you prefer to use an external PostgreSQL provider (like AWS RDS, DigitalOcean, etc.), make sure you have the connection details ready.

### 3. Set Up Redis

You have two options for Redis:

#### Option A: Use Render's Redis Service (Recommended)

1. In your Render dashboard, go to "New" and select "Redis"
2. Configure your Redis instance:
   - Name: `optrixtrades-redis`
   - Create a secure password (optional)
3. Click "Create Redis"
4. Once created, Render will provide a Redis URL in the format `redis://red-xxxxxxxxxx:6379`
5. Copy this entire URL and use it as the `REDIS_HOST` value in your environment variables
6. You don't need to set `REDIS_PORT` or `REDIS_PASSWORD` separately when using the Redis URL

#### Option B: Use External Redis Service

If you prefer to use an external Redis provider (like Redis Labs, AWS ElastiCache, etc.), make sure you have the connection details ready.

### 4. Deploy the Web Service

#### Option A: Deploy using render.yaml (Recommended)

1. In your Render dashboard, go to "New" and select "Blueprint"
2. Connect your GitHub account if you haven't already
3. Select your OPTRIXTRADES repository
4. Render will detect the `render.yaml` file and suggest services to deploy
5. Click "Apply" to create the services
6. You'll be prompted to fill in environment variables marked with `sync: false` in the render.yaml file
7. Fill in all the required environment variables with your actual values:
   - `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
   - `ADMIN_TELEGRAM_IDS`: Comma-separated list of admin Telegram IDs
   - `PREMIUM_CHANNEL_ID`: Your premium channel ID
   - `VIP_CHANNEL_ID`: Your VIP channel ID
   - Database credentials (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`)
   - AWS S3 credentials (if using S3 for file storage)
8. Click "Create Services"

#### Option B: Manual Deployment

1. In your Render dashboard, go to "New" and select "Web Service"
2. Connect your GitHub account if you haven't already
3. Select your OPTRIXTRADES repository
4. Configure the service:
   - Name: `optrixtrades-bot`
   - Environment: `Node`
   - Build Command: `npm install && node prepare-deploy.js`
   - Start Command: `npm start`
   - Plan: Choose appropriate plan (starter is good for beginning)
   - Advanced settings: Enable auto-deploy
5. Add all the environment variables from your `.env.production` file
6. Click "Create Web Service"

### 5. Update Webhook URL

After your service is deployed:

1. Note the URL of your Render web service (e.g., `https://optrixtrades-bot.onrender.com`)
2. Go to your service's **Environment** tab
3. Update the `TELEGRAM_WEBHOOK_URL` environment variable to match your actual service URL:
   - Change `https://optrixtrades-bot.onrender.com/telegram-webhook` to use your actual app name
   - For example: `https://your-actual-app-name.onrender.com/telegram-webhook`
4. Click **Save Changes**
5. Your service will automatically restart with the new environment variables

### 6. Register Webhook with Telegram

After updating the webhook URL, you need to register it with Telegram:

1. Open your web browser and visit:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_WEBHOOK_URL>
   ```
   Replace `<YOUR_BOT_TOKEN>` with your actual bot token and `<YOUR_WEBHOOK_URL>` with your webhook URL

2. You should see a response like:
   ```json
   {"ok":true,"result":true,"description":"Webhook was set"}
   ```

### 7. Verify Webhook Setup

To verify that your webhook is properly set up:

1. Visit:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
   ```
   Replace `<YOUR_BOT_TOKEN>` with your actual bot token

2. You should see a response containing your webhook URL and status

### 8. Test Your Bot

1. Open Telegram and search for your bot
2. Send a `/start` command to your bot
3. Verify that the bot responds correctly
4. Check the logs in your Render dashboard to ensure everything is working properly

## Environment Variables Reference

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
# For Render PostgreSQL, use the full hostname including region
DB_HOST=dpg-xxxxxxxx-a.oregon-postgres.render.com
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
AWS_REGION=eu-north-1
AWS_S3_BUCKET=optrixtrades

# Broker Configuration
BROKER_API_URL=https://iqoption.com/api
BROKER_WSS_URL=wss://iqoption.com/echo/websocket
BROKER_AFFILIATE_LINK=https://affiliate.iqbroker.com/redir/?aff=755757&aff_model=revenue&afftrack=

# Server Configuration
PORT=3000

# Logging Configuration
# Set to 'false' in environments where file system writes are restricted (like Render)
CAN_WRITE_LOGS=false
```

## Troubleshooting

### Bot Not Responding

1. Check the logs in your Render dashboard
2. Verify webhook is properly set up using `getWebhookInfo`
3. Ensure your bot token is correct
4. Check that your bot is not blocked by the user
5. Verify that the bot has the necessary permissions in channels/groups

### Database Connection Issues

1. Check database credentials in your environment variables
2. **Important**: Make sure you're using the full hostname for Render PostgreSQL
   - Incorrect: `dpg-xxxxxxxx-a`
   - Correct: `dpg-xxxxxxxx-a.oregon-postgres.render.com`
3. Ensure SSL is properly configured (the application has been updated to handle this automatically)
4. Check if the database is in the same region as your web service
5. Verify that the database server is running and accessible
6. Check for any firewall or network restrictions
7. If you see a `SequelizeHostNotFoundError`, this typically means the hostname is incorrect or incomplete

### Redis Connection Issues

1. When using Render's Redis, make sure you're using the full Redis URL in the `REDIS_HOST` variable
2. The URL should look like `redis://red-xxxxxxxxxx:6379`
3. The application has been updated to properly parse Redis URLs in all services (main Redis client, queue service, and jobs service), but if you encounter issues, you can try these alternatives:
   - Option 1: Keep using `REDIS_HOST` with the full URL (recommended)
   - Option 2: Set `REDIS_HOST` to just the hostname (e.g., `red-xxxxxxxxxx`) and set `REDIS_PORT=6379` separately
4. Ensure Redis is accessible from your web service (they should be in the same region)
5. If Redis is optional for your application, you can set `USE_REDIS=false` to use the mock Redis client

### Port Already in Use (EADDRINUSE)

If you see an error like `listen EADDRINUSE: address already in use 0.0.0.0:3000`:

1. This typically happens when multiple instances of your app are trying to start on the same port
2. In your Render dashboard, go to your service and check if there are multiple instances running
3. Try restarting the service completely (not just redeploying)
4. If the issue persists, consider changing the port in your environment variables to something other than 3000

### Logging Issues

1. Render has restrictions on file system writes, so the application has been updated to log to the console by default
2. Make sure `CAN_WRITE_LOGS` is set to `false` in your environment variables
3. You can view all logs in the Render dashboard under the "Logs" tab of your service
4. If you need to debug specific issues, you can temporarily increase the log level by setting `NODE_ENV` to `development`
5. For persistent logging, consider using a third-party logging service like Loggly, Papertrail, or LogDNA

### File Upload Issues

1. Verify AWS S3 credentials
2. Check bucket permissions
3. Ensure the region is correctly specified
4. Verify that the S3 bucket exists and is accessible

### Deployment Preparation Script Errors

If you encounter errors with the `prepare-deploy.js` script:

1. Make sure you have a valid `.env.production` file
2. Check that all required environment variables are set
3. Verify that the webhook URL is a valid HTTPS URL
4. Ensure database and Redis configurations are correct

## Performance Optimization

### Scaling Your Web Service

1. **Upgrade Plan**: If your bot experiences high traffic, consider upgrading from the free tier to a paid plan on Render
   - Starter plan: Good for development and low-traffic bots
   - Standard plan: Better for production bots with moderate traffic
   - Plus plan: For high-traffic bots with demanding requirements

2. **Auto-scaling**: Render's paid plans support auto-scaling to handle traffic spikes

3. **Database Scaling**: Monitor database performance and upgrade as needed
   - Consider adding indexes for frequently queried fields
   - Optimize your database queries
   - Use connection pooling effectively

4. **Redis Caching**: Ensure Redis is properly configured for caching to reduce database load
   - Cache frequently accessed data
   - Set appropriate TTL (Time To Live) values for cached items
   - Monitor Redis memory usage

5. **Webhook Efficiency**: Using webhooks is more efficient than polling, especially for high-traffic bots

## Maintenance Best Practices

1. **Logs**: Regularly check logs in the Render dashboard
   - Set up log alerts for critical errors
   - Use structured logging for easier parsing

2. **Updates**: Set up automatic deploys from your GitHub repository
   - Use feature branches for development
   - Test changes thoroughly before merging to main branch

3. **Backups**: Regularly backup your database
   - Set up automated backups
   - Test restoration procedures periodically

4. **Monitoring**: Set up monitoring and alerts for your service
   - Monitor CPU and memory usage
   - Set up uptime checks
   - Monitor response times

5. **Security**: Regularly update dependencies and check for vulnerabilities
   - Run `npm audit` regularly
   - Keep Node.js and npm updated
   - Rotate API keys and credentials periodically

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)