# OPTRIXTRADES Telegram Bot

A comprehensive Telegram bot for OPTRIXTRADES, providing trading signals, user verification, support tickets, and auto-trading functionality.

## Features

- **User Management**: Registration, verification, and subscription tiers (Basic, Premium, VIP)
- **Trading Signals**: Create, broadcast, and close trading signals
- **Auto-Trading**: Automatic trade execution for VIP users
- **User Verification**: Process for verifying users with broker UID and deposit screenshots
- **Support System**: Ticket-based support system for user inquiries
- **Follow-Up Sequence**: Automated follow-up messages for unverified users
- **Admin Panel**: Comprehensive admin tools for managing users, verifications, and broadcasts
- **Analytics**: Detailed reports on user activity, trading performance, and more

## Project Structure

```
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Bot command handlers
│   ├── database/       # Database initialization and models
│   ├── jobs/           # Scheduled jobs and background tasks
│   ├── models/         # Data models
│   ├── services/       # Business logic services
│   ├── utils/          # Utility functions
│   │   ├── botExtensions.js  # Custom Telegram Bot API extensions
│   │   └── ...         # Other utility files
│   └── index.js        # Main bot initialization
├── app.js             # Application entry point
├── .env               # Environment variables (not in repo)
└── package.json       # Project dependencies
```

## Services

- **userService**: User registration, retrieval, and management
- **verificationService**: User verification process management
- **tradingService**: Trading signals and auto-trading functionality
- **supportService**: Support ticket system
- **followUpService**: Automated follow-up sequence
- **analyticsService**: Statistical reports and analytics
- **adminService**: Administrative functions

## Bot Extensions

The bot has been extended with custom methods not available in the official Telegram Bot API:

- **inviteUserToChannel(channelId, userId)**: Creates an invite link for a channel and sends it to the user. Used for adding users to premium and VIP channels based on their subscription tier.

## Controllers

- **welcomeController**: Handles /start, /help commands and registration
- **verificationController**: Manages the verification process
- **tradingController**: Handles trading signals and auto-trading settings
- **supportController**: Manages support tickets
- **accountController**: User account settings and information
- **adminController**: Admin panel and administrative functions

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example`
4. Start the bot: `npm start`

### Running in Webhook Mode

The bot can run in two modes:

1. **Polling Mode** (default): The bot polls Telegram servers for updates
2. **Webhook Mode**: Telegram sends updates to your webhook endpoint

To run in webhook mode:

1. Set `TELEGRAM_USE_WEBHOOK=true` in your `.env` file
2. Set `TELEGRAM_WEBHOOK_URL=https://your-domain.com/telegram-webhook` in your `.env` file
3. Ensure your server is accessible via HTTPS (required by Telegram)
4. Start the bot: `npm start`

See the `TelegramSyncGuide.md` file for detailed instructions on setting up webhook mode.

## Environment Variables

Create a `.env` file with the following variables:

```
# Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token
ADMIN_IDS=comma_separated_admin_ids
TELEGRAM_USE_WEBHOOK=false
TELEGRAM_WEBHOOK_URL=https://your-domain.com/telegram-webhook

# Channels
PREMIUM_CHANNEL_ID=premium_channel_id
VIP_CHANNEL_ID=vip_channel_id

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
S3_BUCKET_NAME=your_s3_bucket_name

# Redis Configuration
# For development:
REDIS_HOST=localhost
REDIS_PORT=6379
# For production (Render):
# REDIS_HOST=redis://red-xxxxxxxxxxxx:6379
# USE_REDIS=true
```

### Protecting Sensitive Information

**IMPORTANT**: Never commit sensitive environment files to your repository. The following files should be excluded from Git:
- `.env` - Contains development environment variables
- `.env.production` - Contains production environment variables

These files are already listed in `.gitignore`, but if they were previously committed, you need to remove them from Git tracking without deleting the files:

```bash
git rm --cached .env .env.production
git commit -m "Remove sensitive environment files from tracking"
```

Use the provided example files (`.env.example` and `.env.production.example`) as templates for creating your actual environment files.

## Commands

- `/start` - Start the bot and register
- `/help` - Show help information
- `/verify` - Start the verification process
- `/status` - Check verification status
- `/signals` - View trading signals
- `/history` - View trading history
- `/support` - Access support system
- `/account` - Manage account settings
- `/admin` - Access admin panel (admin only)

## Running Modes

### Polling Mode

Polling mode is the default mode where the bot continuously polls the Telegram servers for updates. This is simpler to set up but less efficient for high-traffic bots.

```bash
# Start in polling mode (default)
npm start
```

### Webhook Mode

Webhook mode is more efficient as Telegram sends updates to your server only when they occur. This requires your server to be accessible via HTTPS.

```bash
# Configure for webhook mode in .env
TELEGRAM_USE_WEBHOOK=true
TELEGRAM_WEBHOOK_URL=https://your-domain.com/telegram-webhook

# Start the bot with webhook support
npm start
```

## Deployment

This project can be deployed to various cloud platforms. We recommend using Render for its simplicity and free tier options.

### Deploying to Render

We've included configuration files to make deployment to Render straightforward:

1. `Dockerfile` - For container-based deployment
2. `render.yaml` - Blueprint for automatic service setup on Render
3. `.env.production` - Template for production environment variables

#### Quick Render Deployment Steps

1. **Fork or clone this repository** to your GitHub account
2. **Log in to your Render account** and go to the Dashboard
3. **Click on "New" and select "Blueprint"**
4. **Connect your GitHub account** if you haven't already
5. **Select your forked/cloned repository**
6. Render will detect the `render.yaml` file and suggest services to deploy
7. **Click "Apply"** to create the services
8. **Update the TELEGRAM_WEBHOOK_URL** in the environment variables with your actual Render app name
   - Replace `optrixtrades-bot` in `https://optrixtrades-bot.onrender.com/telegram-webhook` with your actual app name
9. **Fill in any remaining environment variables** marked with `sync: false` in the render.yaml file
10. **Click "Create Services"**

After deployment, follow the instructions in `DeploymentGuide.md` to register your webhook with Telegram.

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.