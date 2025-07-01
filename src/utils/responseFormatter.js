/**
 * Response Formatter for OPTRIXTRADES
 * Provides utilities for formatting consistent responses and messages
 */

const { config } = require('../config/appConfig');

/**
 * Format a success response
 * @param {string} message - Success message
 * @param {Object} data - Response data
 * @returns {Object} - Formatted success response
 */
const formatSuccess = (message, data = {}) => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
};

/**
 * Format an error response
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {Object} details - Additional error details
 * @returns {Object} - Formatted error response
 */
const formatError = (message, code = 'ERROR', details = {}) => {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    timestamp: new Date().toISOString()
  };
};

/**
 * Format a Telegram message with proper styling
 * @param {string} message - Message content
 * @param {Object} options - Formatting options
 * @param {boolean} options.bold - Whether to make the entire message bold
 * @param {boolean} options.italic - Whether to make the entire message italic
 * @param {boolean} options.code - Whether to format as code block
 * @param {boolean} options.addSignature - Whether to add bot signature
 * @returns {string} - Formatted message
 */
const formatTelegramMessage = (message, options = {}) => {
  let formattedMessage = message;
  
  // Apply text styling
  if (options.bold) {
    formattedMessage = `<b>${formattedMessage}</b>`;
  }
  
  if (options.italic) {
    formattedMessage = `<i>${formattedMessage}</i>`;
  }
  
  if (options.code) {
    formattedMessage = `<code>${formattedMessage}</code>`;
  }
  
  // Add signature if requested
  if (options.addSignature) {
    formattedMessage = `${formattedMessage}\n\n<i>OPTRIXTRADES Bot</i>`;
  }
  
  return formattedMessage;
};

/**
 * Format a welcome message for new users
 * @param {Object} user - User object
 * @returns {string} - Formatted welcome message
 */
const formatWelcomeMessage = (user) => {
  return formatTelegramMessage(
    `Welcome to OPTRIXTRADES, ${user.first_name}! 🚀\n\n` +
    `I'm your personal trading assistant. Here's what I can do for you:\n\n` +
    `• Provide trading signals based on market analysis\n` +
    `• Help you manage your trading risk\n` +
    `• Keep you updated with market news\n` +
    `• Provide educational resources\n\n` +
    `To get started, please use the /register command to set up your account.\n\n` +
    `Type /help to see all available commands.`,
    { addSignature: true }
  );
};

/**
 * Format a verification request message
 * @param {Object} verification - Verification object
 * @returns {string} - Formatted verification message
 */
const formatVerificationMessage = (verification) => {
  return formatTelegramMessage(
    `📝 <b>Verification Request</b>\n\n` +
    `<b>User:</b> ${verification.user.first_name} ${verification.user.last_name}\n` +
    `<b>Telegram ID:</b> ${verification.user.telegram_id}\n` +
    `<b>Broker UID:</b> ${verification.broker_uid}\n` +
    `<b>Deposit Amount:</b> $${verification.deposit_amount.toFixed(2)}\n` +
    `<b>Submitted:</b> ${new Date(verification.created_at).toLocaleString()}`,
    {}
  );
};

/**
 * Format a trading signal message
 * @param {Object} signal - Trading signal object
 * @returns {string} - Formatted trading signal message
 */
const formatTradingSignal = (signal) => {
  const directionEmoji = signal.direction === 'BUY' ? '🟢' : '🔴';
  const direction = signal.direction === 'BUY' ? 'BUY' : 'SELL';
  
  return formatTelegramMessage(
    `${directionEmoji} <b>TRADING SIGNAL</b> ${directionEmoji}\n\n` +
    `<b>Pair:</b> ${signal.pair}\n` +
    `<b>Direction:</b> ${direction}\n` +
    `<b>Entry Price:</b> ${signal.entry_price}\n` +
    `<b>Stop Loss:</b> ${signal.stop_loss}\n` +
    `<b>Take Profit 1:</b> ${signal.take_profit_1}\n` +
    `<b>Take Profit 2:</b> ${signal.take_profit_2}\n` +
    `<b>Take Profit 3:</b> ${signal.take_profit_3}\n\n` +
    `<b>Risk:</b> ${signal.risk_level}\n` +
    `<b>Timeframe:</b> ${signal.timeframe}\n` +
    `<b>Analysis:</b>\n${signal.analysis}\n\n` +
    `<i>Signal valid until: ${new Date(signal.valid_until).toLocaleString()}</i>`,
    {}
  );
};

/**
 * Format a subscription tier message
 * @param {string} tier - Subscription tier (basic, premium, vip)
 * @returns {string} - Formatted subscription tier message
 */
const formatSubscriptionTierMessage = (tier) => {
  const tierConfig = config.subscriptionTiers[tier.toLowerCase()];
  
  if (!tierConfig) {
    return formatTelegramMessage(
      `Invalid subscription tier: ${tier}`,
      { bold: true }
    );
  }
  
  const features = tierConfig.features.map(feature => `• ${feature}`).join('\n');
  
  return formatTelegramMessage(
    `🌟 <b>${tierConfig.name} Subscription</b> 🌟\n\n` +
    `<b>Minimum Deposit:</b> $${tierConfig.minDeposit}\n\n` +
    `<b>Features:</b>\n${features}\n\n` +
    `To upgrade your subscription tier, increase your deposit amount.`,
    {}
  );
};

/**
 * Format a user profile message
 * @param {Object} user - User object
 * @returns {string} - Formatted user profile message
 */
const formatUserProfile = (user) => {
  const verificationStatus = user.verification_status === 'verified' 
    ? '✅ Verified' 
    : (user.verification_status === 'pending' ? '⏳ Pending' : '❌ Not Verified');
  
  const subscriptionTier = user.subscription_tier.charAt(0).toUpperCase() + user.subscription_tier.slice(1);
  
  return formatTelegramMessage(
    `👤 <b>User Profile</b>\n\n` +
    `<b>Name:</b> ${user.first_name} ${user.last_name || ''}\n` +
    `<b>Username:</b> ${user.username ? '@' + user.username : 'Not set'}\n` +
    `<b>Telegram ID:</b> ${user.telegram_id}\n` +
    `<b>Registered:</b> ${new Date(user.registration_date).toLocaleDateString()}\n\n` +
    `<b>Verification Status:</b> ${verificationStatus}\n` +
    `<b>Subscription Tier:</b> ${subscriptionTier}\n` +
    `<b>Deposit Amount:</b> $${user.deposit_amount ? user.deposit_amount.toFixed(2) : '0.00'}\n\n` +
    `<b>Trading Settings:</b>\n` +
    `• Risk Per Trade: ${user.risk_per_trade || config.trading.defaultRiskPerTrade}%\n` +
    `• Max Trade Amount: ${user.max_trade_amount ? '$' + user.max_trade_amount.toFixed(2) : 'Not set'}\n` +
    `• Auto-Trading: ${user.auto_trade_enabled ? 'Enabled ✅' : 'Disabled ❌'}`,
    {}
  );
};

/**
 * Format an admin dashboard message
 * @param {Object} stats - User statistics
 * @returns {string} - Formatted admin dashboard message
 */
const formatAdminDashboard = (stats) => {
  return formatTelegramMessage(
    `🔐 <b>Admin Dashboard</b> 🔐\n\n` +
    `<b>User Statistics:</b>\n` +
    `• Total Users: ${stats.totalUsers}\n` +
    `• Verified Users: ${stats.verifiedUsers}\n` +
    `• Premium Users: ${stats.premiumUsers}\n` +
    `• VIP Users: ${stats.vipUsers}\n` +
    `• Banned Users: ${stats.bannedUsers}\n` +
    `• Follow-up Sequence: ${stats.followUpUsers}\n` +
    `• Auto-Trading: ${stats.autoTradingUsers}\n\n` +
    `<b>Verification Requests:</b> ${stats.pendingVerifications}\n\n` +
    `Use the buttons below to manage the bot:`,
    {}
  );
};

/**
 * Format a help message with available commands
 * @param {string} userType - User type (user, admin)
 * @returns {string} - Formatted help message
 */
const formatHelpMessage = (userType = 'user') => {
  let commands = [
    { command: '/start', description: 'Start the bot' },
    { command: '/help', description: 'Show this help message' },
    { command: '/register', description: 'Register your account' },
    { command: '/verify', description: 'Submit verification documents' },
    { command: '/profile', description: 'View your profile' },
    { command: '/settings', description: 'Adjust your settings' },
    { command: '/signals', description: 'View recent trading signals' },
    { command: '/subscription', description: 'View subscription information' },
    { command: '/contact', description: 'Contact support' }
  ];
  
  // Add admin commands if user is admin
  if (userType === 'admin') {
    commands = [
      ...commands,
      { command: '/admin', description: 'Access admin dashboard' },
      { command: '/broadcast', description: 'Send message to all users' },
      { command: '/verifications', description: 'Manage verification requests' },
      { command: '/stats', description: 'View detailed statistics' },
      { command: '/user', description: 'Lookup user information' },
      { command: '/signal', description: 'Create a new trading signal' }
    ];
  }
  
  const commandList = commands.map(cmd => `${cmd.command} - ${cmd.description}`).join('\n');
  
  return formatTelegramMessage(
    `📚 <b>Available Commands</b>\n\n${commandList}\n\n` +
    `For more information, visit our website or contact support.`,
    { addSignature: true }
  );
};

/**
 * Format an error message for users
 * @param {Error} error - Error object
 * @param {boolean} isAdmin - Whether the user is an admin
 * @returns {string} - Formatted error message
 */
const formatErrorMessage = (error, isAdmin = false) => {
  // Default user-friendly message
  let message = 'Sorry, something went wrong. Please try again later.';
  
  // Use error message if it's user-friendly
  if (error.userMessage) {
    message = error.userMessage;
  }
  
  // For admins, include technical details
  if (isAdmin) {
    message += `\n\n<b>Technical Details:</b>\n<code>${error.message}</code>`;
    
    if (error.code) {
      message += `\n<b>Error Code:</b> ${error.code}`;
    }
    
    if (error.stack && config.isDev) {
      message += `\n\n<b>Stack Trace:</b>\n<code>${error.stack.split('\n').slice(0, 3).join('\n')}</code>`;
    }
  }
  
  return formatTelegramMessage(message, { bold: true });
};

module.exports = {
  formatSuccess,
  formatError,
  formatTelegramMessage,
  formatWelcomeMessage,
  formatVerificationMessage,
  formatTradingSignal,
  formatSubscriptionTierMessage,
  formatUserProfile,
  formatAdminDashboard,
  formatHelpMessage,
  formatErrorMessage
};