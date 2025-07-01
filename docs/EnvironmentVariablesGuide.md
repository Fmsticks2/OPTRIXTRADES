# Environment Variables Guide for OPTRIXTRADES Deployment

## Overview

This guide explains how to properly manage environment variables for the OPTRIXTRADES bot, especially when deploying to Render. Since sensitive environment files (`.env` and `.env.production`) are excluded from Git for security reasons, you need to understand how to configure your environment variables correctly.

## Local Development vs Production

### Local Development

For local development, you should use a `.env` file in your project root. This file contains all the environment variables needed for development and testing.

### Production Deployment

For production deployment on Render, you have two options:

1. **Using Render Dashboard**: Configure all environment variables directly in the Render dashboard
2. **Using render.yaml**: Define environment variables in the `render.yaml` file (sensitive values should be set to `sync: false`)

## Environment Files in Git

The following files are now excluded from Git tracking to protect sensitive information:

- `.env` - Contains development environment variables
- `.env.production` - Contains production environment variables

These files are listed in `.gitignore` to prevent them from being committed to your repository.

## Setting Up Environment Variables on Render

### Option 1: Using Render Dashboard (Manual Method)

1. Go to your Render dashboard and select your web service
2. Navigate to the **Environment** tab
3. Add each environment variable from your `.env.production` file manually
4. Click **Save Changes**

### Option 2: Using render.yaml (Blueprint Method)

The `render.yaml` file already includes all necessary environment variables. When deploying with a blueprint:

1. Variables marked with `sync: false` will prompt you to enter values during deployment
2. Variables with predefined values will be set automatically

## Required Environment Variables

```
# Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
ADMIN_TELEGRAM_IDS=your_admin_ids_here
PREMIUM_CHANNEL_ID=your_premium_channel_id
VIP_CHANNEL_ID=your_vip_channel_id

# Telegram Webhook Configuration
TELEGRAM_WEBHOOK_URL=https://your-app-name.onrender.com/telegram-webhook
TELEGRAM_USE_WEBHOOK=true
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret_token

# Database Configuration
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=optrixtrades
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_FORCE_SYNC=false
NODE_ENV=production

# Redis Configuration
REDIS_HOST=redis://red-d1hroc3uibrs73fqp9k0:6379
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
IS_RENDER=true

# Logging Configuration
CAN_WRITE_LOGS=false
```

## Updating Environment Variables

When you need to update environment variables:

1. For local development, update your `.env` file
2. For production:
   - If using the Render dashboard, update variables in the Environment tab
   - If using render.yaml, update the file and redeploy

## Handling Render-Specific Variables

Some variables are specific to Render deployment:

- `IS_RENDER=true` - Indicates the application is running on Render
- `CAN_WRITE_LOGS=false` - Disables file system logging (Render has restrictions on file system writes)

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**: Check if all required variables are set in your Render dashboard
2. **Incorrect Database Connection**: Ensure you're using the full hostname for Render PostgreSQL (e.g., `dpg-xxxxxxxx-a.oregon-postgres.render.com`)
3. **Redis Connection Problems**: When using Render Redis, use the full Redis URL in the `REDIS_HOST` variable

### Verifying Environment Variables

You can verify your environment variables are correctly set by:

1. Checking the logs in your Render dashboard
2. Visiting the `/health` endpoint of your deployed application

## Security Best Practices

1. **Never commit sensitive files**: Keep `.env` and `.env.production` in your `.gitignore`
2. **Rotate secrets regularly**: Change sensitive tokens and passwords periodically
3. **Use environment-specific variables**: Different environments should have different credentials
4. **Limit access to the Render dashboard**: Only give access to team members who need it

## Additional Resources

- [Render Environment Variables Documentation](https://render.com/docs/environment-variables)
- [Render Blueprint Documentation](https://render.com/docs/blueprint-spec)
- [Render Web Services Documentation](https://render.com/docs/web-services)