require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

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

// Webhook configuration
const useWebhook = process.env.TELEGRAM_USE_WEBHOOK === 'true';
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

// Create bot instance with appropriate options
let bot;

// Check if we're in test mode (invalid token)
const isTestMode = !botToken || botToken === 'your_telegram_bot_token_here';

if (isTestMode) {
  // Create a mock bot for testing
  console.log('WARNING: Using mock bot for testing (invalid token)');
  bot = {
    on: () => {},
    onText: () => {},
    sendMessage: () => Promise.resolve({}),
    getMe: () => Promise.resolve({ username: 'test_bot' }),
    processUpdate: () => {},
    setWebHook: () => Promise.resolve(true),
    startPolling: () => {}
  };
} else if (useWebhook && webhookUrl) {
  // Webhook mode - without starting a server
  bot = new TelegramBot(botToken, { webHook: false });
  
  // Set webhook with secret token if available
  const webhookOptions = webhookSecret ? { secret_token: webhookSecret } : {};
  
  bot.setWebHook(webhookUrl, webhookOptions)
    .then(() => {
      console.log(`Webhook set to: ${webhookUrl}`);
      if (webhookSecret) {
        console.log('Webhook secret token configured for enhanced security');
      }
    })
    .catch(err => console.error(`Failed to set webhook: ${err.message}`));
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