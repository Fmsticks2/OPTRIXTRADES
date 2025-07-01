# Deploying OPTRIXTRADES Bot to Render

This guide provides step-by-step instructions for deploying the OPTRIXTRADES Telegram bot to Render using the provided `render.yaml` blueprint file.

## Prerequisites

1. A [Render](https://render.com/) account
2. Your GitHub repository with the OPTRIXTRADES bot code
3. A valid Telegram bot token (already configured in your `.env` file)
4. PostgreSQL database (can be provisioned on Render or elsewhere)
5. Redis instance (can be provisioned on Render or elsewhere)

## Deployment Steps

### 1. Prepare Your Repository

1. Make sure your code is pushed to a GitHub repository
2. Ensure your `.env` file is properly configured with all required variables
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

### 2. Deploy Using Blueprint

1. Log in to your [Render Dashboard](https://dashboard.render.com/)
2. Click on **New** and select **Blueprint**
3. Connect your GitHub account if you haven't already
4. Select your OPTRIXTRADES repository
5. Render will detect the `render.yaml` file and suggest services to deploy
6. Click **Apply** to create the services

### 3. Configure Environment Variables

During the deployment process, you'll be prompted to fill in environment variables marked with `sync: false` in the `render.yaml` file. These include:

- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
- `ADMIN_TELEGRAM_IDS`: Comma-separated list of admin Telegram IDs
- `PREMIUM_CHANNEL_ID`: Your premium channel ID
- `VIP_CHANNEL_ID`: Your VIP channel ID
- Database credentials (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`)
- AWS S3 credentials (if using S3 for file storage)

### 4. Update Webhook URL

After your service is deployed:

1. Note the URL of your Render web service (e.g., `https://optrixtrades-bot.onrender.com`)
2. Go to your service's **Environment** tab
3. Update the `TELEGRAM_WEBHOOK_URL` environment variable to match your actual service URL:
   - Change `https://optrixtrades-bot.onrender.com/telegram-webhook` to use your actual app name
   - For example: `https://your-actual-app-name.onrender.com/telegram-webhook`
4. Click **Save Changes**

### 5. Register Webhook with Telegram

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

### 6. Verify Webhook Setup

To verify that your webhook is properly set up:

1. Visit:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
   ```
   Replace `<YOUR_BOT_TOKEN>` with your actual bot token

2. You should see a response containing your webhook URL and status

## Troubleshooting

### Bot Not Responding

1. Check the logs in your Render dashboard
2. Verify webhook is properly set up using `getWebhookInfo`
3. Ensure your bot token is correct

### Database Connection Issues

1. Check database credentials
2. Ensure database is accessible from Render (check network rules)
3. Check if `DB_FORCE_SYNC` is set correctly (should be `false` in production)

### Redis Connection Issues

1. When using Render's Redis, make sure you're using the full Redis URL in the `REDIS_HOST` variable
2. The URL should look like `redis://red-d1hroc3uibrs73fqp9k0:6379`
3. The application has been updated to properly parse Redis URLs in all services (main Redis client, queue service, and jobs service), but if you encounter issues, you can try these alternatives:
   - Option 1: Keep using `REDIS_HOST` with the full URL (recommended)
   - Option 2: Set `REDIS_HOST` to just the hostname (e.g., `red-d1hroc3uibrs73fqp9k0`) and set `REDIS_PORT=6379` separately
4. Ensure Redis is accessible from your web service (they should be in the same region)
5. If Redis is optional for your application, you can set `USE_REDIS=false` to use the mock Redis client

## Scaling Considerations

1. **Upgrade Plan**: If your bot experiences high traffic, consider upgrading from the free tier to a paid plan on Render
2. **Database Scaling**: Monitor database performance and upgrade as needed
3. **Redis Caching**: Ensure Redis is properly configured for caching to reduce database load

## Maintenance

1. **Logs**: Regularly check logs in the Render dashboard
2. **Updates**: Set up automatic deploys from your GitHub repository
3. **Backups**: Regularly backup your database

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- See the `DeploymentGuide.md` for more detailed deployment instructions
- See the `docs/EnvironmentVariablesGuide.md` for detailed instructions on managing environment variables