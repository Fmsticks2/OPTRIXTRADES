const { bot, isAdmin } = require('../config/bot');
const userService = require('../services/userService');
const verificationService = require('../services/verificationService');
const tradingService = require('../services/tradingService');
const { createInlineKeyboard, createReplyKeyboard } = require('../utils/keyboard');
const { logger, logUserAction, logError } = require('../utils/logger');

/**
 * Handle account command
 * @param {Object} msg - Telegram message object
 * @returns {Promise<void>}
 */
const handleAccount = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    
    logUserAction(telegramId, 'command_account');
    
    // Get user
    const user = await userService.getUserByTelegramId(telegramId);
    
    if (!user) {
      await bot.sendMessage(
        chatId,
        `You don't have an account yet. Please start the bot with /start to register.`
      );
      return;
    }
    
    // Format message
    let message = `*Your OPTRIXTRADES Account*\n\n`;
    
    // User info
    message += `*User Information*\n` +
      `Username: ${user.username || 'Not set'}\n` +
      `Registered: ${new Date(user.registration_date).toLocaleDateString()}\n` +
      `Verification: ${formatVerificationStatus(user.verification_status)}\n`;
    
    // Subscription info
    message += `\n*Subscription*\n` +
      `Tier: ${formatSubscriptionTier(user.subscription_tier)}\n`;
    
    // Trading info if verified
    if (user.verification_status === 'verified') {
      message += `\n*Trading*\n` +
        `Broker UID: ${user.broker_uid || 'Not set'}\n`;
      
      if (user.subscription_tier === 'vip') {
        message += `Auto-Trading: ${user.auto_trade_enabled ? '✅ Enabled' : '❌ Disabled'}\n`;
        
        if (user.auto_trade_enabled) {
          message += `Amount per Trade: $${user.auto_trade_amount}\n` +
            `Risk Percentage: ${user.auto_trade_risk_percentage}%\n`;
        }
      }
    }
    
    // Create keyboard based on user status
    let keyboard;
    
    if (user.verification_status === 'verified') {
      const buttons = [
        [{ text: '📊 Trading Signals', callback_data: 'view_signals' }]
      ];
      
      if (user.subscription_tier === 'vip') {
        buttons.push([{ text: '🤖 Auto-Trading Settings', callback_data: 'auto_trade_settings' }]);
      } else {
        buttons.push([{ text: '⭐ Upgrade to VIP', callback_data: 'upgrade_vip' }]);
      }
      
      buttons.push([{ text: '📝 Update Broker UID', callback_data: 'update_broker_uid' }]);
      
      keyboard = createInlineKeyboard(buttons).reply_markup;
    } else {
      keyboard = createInlineKeyboard([[
        { text: '✅ Verify Account', callback_data: 'verify' }
      ]]).reply_markup;
    }
    
    await bot.sendMessage(
      chatId,
      message,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  } catch (error) {
    logError(msg.from.id.toString(), 'handleAccount', error);
    
    // Send generic error message
    await bot.sendMessage(
      msg.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
};

/**
 * Format verification status for display
 * @param {string} status - Verification status
 * @returns {string} - Formatted status
 */
const formatVerificationStatus = (status) => {
  switch (status) {
    case 'verified':
      return '✅ Verified';
    case 'pending':
      return '⏳ Pending Verification';
    case 'rejected':
      return '❌ Verification Rejected';
    default:
      return '❓ Not Verified';
  }
};

/**
 * Format subscription tier for display
 * @param {string} tier - Subscription tier
 * @returns {string} - Formatted tier
 */
const formatSubscriptionTier = (tier) => {
  switch (tier) {
    case 'vip':
      return '⭐ VIP';
    case 'premium':
      return '💎 Premium';
    default:
      return '🔹 Basic';
  }
};

/**
 * Handle update broker UID callback
 * @param {Object} callbackQuery - Telegram callback query
 * @returns {Promise<void>}
 */
const handleUpdateBrokerUid = async (callbackQuery) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    logUserAction(telegramId, 'callback_update_broker_uid');
    
    // Check if user is verified
    const user = await userService.getUserByTelegramId(telegramId);
    
    if (!user || user.verification_status !== 'verified') {
      await bot.sendMessage(
        chatId,
        `You need to be verified to update your broker UID.\n\nPlease complete the verification process first.`,
        {
          reply_markup: createInlineKeyboard([[
            { text: '✅ Verify Now', callback_data: 'verify' }
          ]]).reply_markup
        }
      );
      return;
    }
    
    // Ask for new broker UID
    await bot.sendMessage(
      chatId,
      `Please enter your new broker UID:`
    );
    
    // Set user state to wait for broker UID
    userStates.set(telegramId, { state: 'waiting_broker_uid' });
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleUpdateBrokerUid', error);
    
    // Send generic error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
};

/**
 * Process broker UID message
 * @param {Object} msg - Telegram message object
 * @returns {Promise<boolean>} - Whether message was processed
 */
const processBrokerUid = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    
    // Check if user is waiting for broker UID
    const userState = userStates.get(telegramId);
    
    if (!userState || userState.state !== 'waiting_broker_uid') {
      return false; // Not waiting for broker UID
    }
    
    const brokerUid = msg.text.trim();
    
    if (!brokerUid || brokerUid.length < 3) {
      await bot.sendMessage(
        chatId,
        `Invalid broker UID. Please enter a valid broker UID:`
      );
      return true;
    }
    
    // Update broker UID
    await userService.updateBrokerUid(telegramId, brokerUid);
    
    // Clear user state
    userStates.delete(telegramId);
    
    // Send confirmation
    await bot.sendMessage(
      chatId,
      `✅ Your broker UID has been updated to: ${brokerUid}\n\n` +
      `This will be used for auto-trading if you have it enabled.`,
      {
        reply_markup: createReplyKeyboard([
          ['📊 Trading Signals', '💰 My Account'],
          ['🔔 Notifications', '📱 Support']
        ]).reply_markup
      }
    );
    
    return true;
  } catch (error) {
    logError(msg.from.id.toString(), 'processBrokerUid', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
    
    // Clear user state
    userStates.delete(msg.from.id.toString());
    
    return true;
  }
};

/**
 * Handle upgrade to VIP callback
 * @param {Object} callbackQuery - Telegram callback query
 * @returns {Promise<void>}
 */
const handleUpgradeVip = async (callbackQuery) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    logUserAction(telegramId, 'callback_upgrade_vip');
    
    // Check if user is verified
    const user = await userService.getUserByTelegramId(telegramId);
    
    if (!user) {
      await bot.sendMessage(
        chatId,
        `You need to register first. Please use /start to register.`
      );
      return;
    }
    
    if (user.verification_status !== 'verified') {
      await bot.sendMessage(
        chatId,
        `You need to be verified before upgrading to VIP.\n\nPlease complete the verification process first.`,
        {
          reply_markup: createInlineKeyboard([[
            { text: '✅ Verify Now', callback_data: 'verify' }
          ]]).reply_markup
        }
      );
      return;
    }
    
    if (user.subscription_tier === 'vip') {
      await bot.sendMessage(
        chatId,
        `You are already a VIP member!\n\nEnjoy all the benefits of your VIP membership.`
      );
      return;
    }
    
    // Send upgrade instructions
    await bot.sendMessage(
      chatId,
      `*Upgrade to VIP Membership*\n\n` +
      `VIP membership gives you access to:\n` +
      `• Auto-trading functionality\n` +
      `• Priority support\n` +
      `• Exclusive VIP signals\n` +
      `• Advanced analytics\n\n` +
      `To upgrade to VIP, you need to deposit at least $1,000 in your broker account.\n\n` +
      `Please submit a new verification with your updated deposit amount to upgrade.`,
      {
        parse_mode: 'Markdown',
        reply_markup: createInlineKeyboard([[
          { text: '✅ Submit Verification', callback_data: 'verify' }
        ]]).reply_markup
      }
    );
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleUpgradeVip', error);
    
    // Send generic error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
};

/**
 * Handle notifications command
 * @param {Object} msg - Telegram message object
 * @returns {Promise<void>}
 */
const handleNotifications = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    
    logUserAction(telegramId, 'command_notifications');
    
    // Get user
    const user = await userService.getUserByTelegramId(telegramId);
    
    if (!user) {
      await bot.sendMessage(
        chatId,
        `You don't have an account yet. Please start the bot with /start to register.`
      );
      return;
    }
    
    // Format message
    let message = `*Notification Settings*\n\n`;
    
    // Notification status
    message += `Signal Notifications: ${user.notifications_enabled ? '✅ Enabled' : '❌ Disabled'}\n`;
    
    if (user.verification_status === 'verified' && user.subscription_tier === 'vip') {
      message += `Auto-Trade Notifications: ${user.auto_trade_notifications ? '✅ Enabled' : '❌ Disabled'}\n`;
    }
    
    message += `\nYou can toggle your notification preferences below:`;
    
    // Create keyboard based on user status
    let keyboard;
    
    if (user.verification_status === 'verified' && user.subscription_tier === 'vip') {
      keyboard = createInlineKeyboard([[
        { 
          text: `${user.notifications_enabled ? '❌ Disable' : '✅ Enable'} Signal Notifications`, 
          callback_data: `toggle_notifications_${!user.notifications_enabled}` 
        }
      ], [
        { 
          text: `${user.auto_trade_notifications ? '❌ Disable' : '✅ Enable'} Auto-Trade Notifications`, 
          callback_data: `toggle_auto_trade_notifications_${!user.auto_trade_notifications}` 
        }
      ]]).reply_markup;
    } else {
      keyboard = createInlineKeyboard([[
        { 
          text: `${user.notifications_enabled ? '❌ Disable' : '✅ Enable'} Signal Notifications`, 
          callback_data: `toggle_notifications_${!user.notifications_enabled}` 
        }
      ]]).reply_markup;
    }
    
    await bot.sendMessage(
      chatId,
      message,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  } catch (error) {
    logError(msg.from.id.toString(), 'handleNotifications', error);
    
    // Send generic error message
    await bot.sendMessage(
      msg.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
};

/**
 * Handle toggle notifications callback
 * @param {Object} callbackQuery - Telegram callback query
 * @param {boolean} enable - Whether to enable notifications
 * @returns {Promise<void>}
 */
const handleToggleNotifications = async (callbackQuery, enable) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    logUserAction(telegramId, 'callback_toggle_notifications', { enable });
    
    // Update notifications setting
    await userService.updateUser(telegramId, { notifications_enabled: enable });
    
    await bot.sendMessage(
      chatId,
      `Signal notifications have been ${enable ? 'enabled' : 'disabled'}.`,
      {
        reply_markup: createReplyKeyboard([
          ['📊 Trading Signals', '💰 My Account'],
          ['🔔 Notifications', '📱 Support']
        ]).reply_markup
      }
    );
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleToggleNotifications', error);
    
    // Send generic error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
};

/**
 * Handle toggle auto-trade notifications callback
 * @param {Object} callbackQuery - Telegram callback query
 * @param {boolean} enable - Whether to enable auto-trade notifications
 * @returns {Promise<void>}
 */
const handleToggleAutoTradeNotifications = async (callbackQuery, enable) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    logUserAction(telegramId, 'callback_toggle_auto_trade_notifications', { enable });
    
    // Check if user is verified and VIP
    const user = await userService.getUserByTelegramId(telegramId);
    
    if (!user || user.verification_status !== 'verified' || user.subscription_tier !== 'vip') {
      await bot.sendMessage(
        chatId,
        `Auto-trade notifications are only available for verified VIP users.`
      );
      return;
    }
    
    // Update auto-trade notifications setting
    await userService.updateUser(telegramId, { auto_trade_notifications: enable });
    
    await bot.sendMessage(
      chatId,
      `Auto-trade notifications have been ${enable ? 'enabled' : 'disabled'}.`,
      {
        reply_markup: createReplyKeyboard([
          ['📊 Trading Signals', '💰 My Account'],
          ['🔔 Notifications', '📱 Support']
        ]).reply_markup
      }
    );
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleToggleAutoTradeNotifications', error);
    
    // Send generic error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
};

// Store user states for multi-step processes
const userStates = new Map();

module.exports = {
  handleAccount,
  handleUpdateBrokerUid,
  processBrokerUid,
  handleUpgradeVip,
  handleNotifications,
  handleToggleNotifications,
  handleToggleAutoTradeNotifications,
  userStates
};