const { bot, isAdmin } = require('../config/bot');
const userService = require('../services/userService');
const verificationService = require('../services/verificationService');
const adminService = require('../services/adminService');
const analyticsService = require('../services/analyticsService');
const { createInlineKeyboard, createReplyKeyboard } = require('../utils/keyboard');
const { logger, logUserAction, logAdminAction, logError } = require('../utils/logger');

/**
 * Handle admin command
 * @param {Object} msg - Telegram message object
 * @returns {Promise<void>}
 */
const handleAdmin = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This command is for administrators only.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'command_admin');
    
    // Get user statistics
    const stats = await adminService.getUserStatistics();
    
    // Format message
    let message = `*OPTRIXTRADES Admin Panel*\n\n` +
      `*User Statistics*\n` +
      `Total Users: ${stats.totalUsers}\n` +
      `Verified Users: ${stats.verifiedUsers}\n` +
      `Premium Users: ${stats.premiumUsers}\n` +
      `VIP Users: ${stats.vipUsers}\n` +
      `Banned Users: ${stats.bannedUsers}\n` +
      `Users in Follow-up: ${stats.followUpUsers}\n` +
      `Auto-Trading Users: ${stats.autoTradingUsers}\n\n` +
      `*Admin Actions*\n` +
      `Select an action from the menu below:`;
    
    // Create keyboard
    const keyboard = createInlineKeyboard([[
      { text: '📊 Analytics', callback_data: 'admin_analytics' }
    ], [
      { text: '✅ Verifications', callback_data: 'admin_verifications' }
    ], [
      { text: '📢 Broadcast', callback_data: 'admin_broadcast' }
    ], [
      { text: '👤 User Management', callback_data: 'admin_users' }
    ]]).reply_markup;
    
    await bot.sendMessage(
      chatId,
      message,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  } catch (error) {
    logError(msg.from.id.toString(), 'handleAdmin', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * Handle admin analytics callback
 * @param {Object} callbackQuery - Telegram callback query
 * @returns {Promise<void>}
 */
const handleAdminAnalytics = async (callbackQuery) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This action is for administrators only.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'callback_admin_analytics');
    
    // Create keyboard
    const keyboard = createInlineKeyboard([[
      { text: '📈 Daily Report', callback_data: 'analytics_daily' }
    ], [
      { text: '📊 Weekly Report', callback_data: 'analytics_weekly' }
    ], [
      { text: '📋 Monthly Report', callback_data: 'analytics_monthly' }
    ], [
      { text: '🔙 Back to Admin', callback_data: 'admin_back' }
    ]]).reply_markup;
    
    await bot.sendMessage(
      chatId,
      `*Analytics Reports*\n\nSelect a report type:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleAdminAnalytics', error);
    
    // Send error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * Handle analytics report callback
 * @param {Object} callbackQuery - Telegram callback query
 * @param {string} reportType - Report type (daily, weekly, monthly)
 * @returns {Promise<void>}
 */
const handleAnalyticsReport = async (callbackQuery, reportType) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This action is for administrators only.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'callback_analytics_report', { reportType });
    
    // Send loading message
    const loadingMsg = await bot.sendMessage(
      chatId,
      `Generating ${reportType} report... This may take a moment.`
    );
    
    // Generate report
    const report = await analyticsService.generateAnalyticsReport(reportType);
    
    // Format report message
    let message = `*OPTRIXTRADES ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Analytics Report*\n` +
      `Generated: ${new Date().toLocaleString()}\n\n`;
    
    // User statistics
    message += `*User Statistics*\n` +
      `Total Registrations: ${report.userStats.totalRegistrations}\n` +
      `New Registrations: ${report.userStats.newRegistrations}\n` +
      `Verification Rate: ${report.verificationStats.verificationRate}%\n` +
      `Premium Users: ${report.verificationStats.premiumUsers}\n` +
      `VIP Users: ${report.verificationStats.vipUsers}\n\n`;
    
    // Follow-up statistics
    message += `*Follow-up Statistics*\n` +
      `Total Follow-ups Sent: ${report.followUpStats.totalSent}\n` +
      `Response Rate: ${report.followUpStats.responseRate}%\n\n`;
    
    // Trading statistics
    message += `*Trading Statistics*\n` +
      `Total Signals: ${report.tradingStats.totalSignals}\n` +
      `Win Rate: ${report.tradingStats.winRate}%\n` +
      `Average Profit: ${report.tradingStats.averageProfit}%\n` +
      `Auto-Trading Users: ${report.autoTradingStats.usersEnabled}\n\n`;
    
    // Delete loading message
    await bot.deleteMessage(chatId, loadingMsg.message_id);
    
    // Send report
    await bot.sendMessage(
      chatId,
      message,
      {
        parse_mode: 'Markdown',
        reply_markup: createInlineKeyboard([[
          { text: '🔙 Back to Analytics', callback_data: 'admin_analytics' }
        ]]).reply_markup
      }
    );
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleAnalyticsReport', error);
    
    // Send error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      `Error generating report: ${error.message}`
    );
  }
};

/**
 * Handle admin verifications callback
 * @param {Object} callbackQuery - Telegram callback query
 * @returns {Promise<void>}
 */
const handleAdminVerifications = async (callbackQuery) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This action is for administrators only.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'callback_admin_verifications');
    
    // Get pending verifications
    const pendingVerifications = await adminService.getPendingVerifications();
    
    if (pendingVerifications.length === 0) {
      await bot.sendMessage(
        chatId,
        `There are no pending verification requests.`,
        {
          reply_markup: createInlineKeyboard([[
            { text: '🔙 Back to Admin', callback_data: 'admin_back' }
          ]]).reply_markup
        }
      );
      return;
    }
    
    // Format message
    let message = `*Pending Verification Requests*\n\n` +
      `There are ${pendingVerifications.length} pending verification requests.\n\n` +
      `Select a request to review:`;
    
    // Create keyboard
    const keyboard = [];
    
    for (const verification of pendingVerifications) {
      keyboard.push([{
        text: `${verification.user.username || verification.user.telegram_id} - UID: ${verification.uid_submitted}`,
        callback_data: `verify_review_${verification.id}`
      }]);
    }
    
    keyboard.push([{ text: '🔙 Back to Admin', callback_data: 'admin_back' }]);
    
    await bot.sendMessage(
      chatId,
      message,
      {
        parse_mode: 'Markdown',
        reply_markup: createInlineKeyboard(keyboard).reply_markup
      }
    );
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleAdminVerifications', error);
    
    // Send error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * Handle verification review callback
 * @param {Object} callbackQuery - Telegram callback query
 * @param {string} verificationId - Verification ID
 * @returns {Promise<void>}
 */
const handleVerificationReview = async (callbackQuery, verificationId) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This action is for administrators only.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'callback_verify_review', { verificationId });
    
    // Get verification details
    const verification = await verificationService.getVerificationById(verificationId);
    
    if (!verification) {
      await bot.sendMessage(
        chatId,
        `Verification request not found.`,
        {
          reply_markup: createInlineKeyboard([[
            { text: '🔙 Back to Verifications', callback_data: 'admin_verifications' }
          ]]).reply_markup
        }
      );
      return;
    }
    
    // Get user details
    const user = await userService.getUserByTelegramId(verification.user_id);
    
    // Format message
    let message = `*Verification Request*\n\n` +
      `User: ${user.username || 'No username'} (${user.telegram_id})\n` +
      `Broker UID: ${verification.uid_submitted}\n` +
      `Submission Date: ${new Date(verification.submission_date).toLocaleString()}\n\n` +
      `The user has submitted a deposit screenshot. Use the button below to view it.`;
    
    // Create keyboard
    const keyboard = createInlineKeyboard([[
      { text: '🖼️ View Screenshot', callback_data: `verify_screenshot_${verification.id}` }
    ], [
      { text: '✅ Approve as Premium', callback_data: `verify_approve_premium_${verification.id}` }
    ], [
      { text: '⭐ Approve as VIP', callback_data: `verify_approve_vip_${verification.id}` }
    ], [
      { text: '❌ Reject', callback_data: `verify_reject_${verification.id}` }
    ], [
      { text: '🔙 Back to Verifications', callback_data: 'admin_verifications' }
    ]]).reply_markup;
    
    await bot.sendMessage(
      chatId,
      message,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleVerificationReview', error);
    
    // Send error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * Handle verification screenshot callback
 * @param {Object} callbackQuery - Telegram callback query
 * @param {string} verificationId - Verification ID
 * @returns {Promise<void>}
 */
const handleVerificationScreenshot = async (callbackQuery, verificationId) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This action is for administrators only.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'callback_verify_screenshot', { verificationId });
    
    // Get verification details
    const verification = await verificationService.getVerificationById(verificationId);
    
    if (!verification) {
      await bot.sendMessage(
        chatId,
        `Verification request not found.`
      );
      return;
    }
    
    // Get screenshot URL
    const screenshotUrl = await verificationService.getScreenshotUrl(verification.id);
    
    // Send screenshot
    await bot.sendPhoto(
      chatId,
      screenshotUrl,
      {
        caption: `Deposit screenshot for verification ID: ${verification.id}\nUser ID: ${verification.user_id}\nBroker UID: ${verification.uid_submitted}`,
        reply_markup: createInlineKeyboard([[
          { text: '🔙 Back to Review', callback_data: `verify_review_${verification.id}` }
        ]]).reply_markup
      }
    );
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleVerificationScreenshot', error);
    
    // Send error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * Handle verification approval callback
 * @param {Object} callbackQuery - Telegram callback query
 * @param {string} verificationId - Verification ID
 * @param {string} tier - Subscription tier (premium or vip)
 * @returns {Promise<void>}
 */
const handleVerificationApproval = async (callbackQuery, verificationId, tier) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This action is for administrators only.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'callback_verify_approve', { verificationId, tier });
    
    // Approve verification
    const depositAmount = tier === 'vip' ? 1000 : 100;
    await adminService.processVerification(verificationId, 'approved', depositAmount, telegramId);
    
    await bot.sendMessage(
      chatId,
      `Verification request ${verificationId} has been approved as ${tier.toUpperCase()}.\n\nThe user has been notified and added to the appropriate channel.`,
      {
        reply_markup: createInlineKeyboard([[
          { text: '🔙 Back to Verifications', callback_data: 'admin_verifications' }
        ]]).reply_markup
      }
    );
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleVerificationApproval', error);
    
    // Send error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * Handle verification rejection callback
 * @param {Object} callbackQuery - Telegram callback query
 * @param {string} verificationId - Verification ID
 * @returns {Promise<void>}
 */
const handleVerificationRejection = async (callbackQuery, verificationId) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This action is for administrators only.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'callback_verify_reject', { verificationId });
    
    // Ask for rejection reason
    await bot.sendMessage(
      chatId,
      `Please enter a reason for rejecting this verification request:`
    );
    
    // Set admin state to wait for rejection reason
    adminStates.set(telegramId, { 
      state: 'waiting_rejection_reason',
      verificationId
    });
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleVerificationRejection', error);
    
    // Send error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * Process rejection reason message
 * @param {Object} msg - Telegram message object
 * @returns {Promise<boolean>} - Whether message was processed
 */
const processRejectionReason = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    
    // Check if admin is waiting for rejection reason
    const adminState = adminStates.get(telegramId);
    
    if (!adminState || adminState.state !== 'waiting_rejection_reason') {
      return false; // Not waiting for rejection reason
    }
    
    const reason = msg.text.trim();
    
    if (!reason) {
      await bot.sendMessage(
        chatId,
        `Please enter a valid rejection reason:`
      );
      return true;
    }
    
    // Reject verification
    await adminService.processVerification(
      adminState.verificationId, 
      'rejected', 
      0, 
      telegramId, 
      reason
    );
    
    // Clear admin state
    adminStates.delete(telegramId);
    
    // Send confirmation
    await bot.sendMessage(
      chatId,
      `Verification request ${adminState.verificationId} has been rejected.\n\nThe user has been notified with your reason.`,
      {
        reply_markup: createInlineKeyboard([[
          { text: '🔙 Back to Verifications', callback_data: 'admin_verifications' }
        ]]).reply_markup
      }
    );
    
    return true;
  } catch (error) {
    logError(msg.from.id.toString(), 'processRejectionReason', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      `Error: ${error.message}`
    );
    
    // Clear admin state
    adminStates.delete(msg.from.id.toString());
    
    return true;
  }
};

/**
 * Handle admin broadcast callback
 * @param {Object} callbackQuery - Telegram callback query
 * @returns {Promise<void>}
 */
const handleAdminBroadcast = async (callbackQuery) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This action is for administrators only.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'callback_admin_broadcast');
    
    // Create keyboard
    const keyboard = createInlineKeyboard([[
      { text: '📢 All Users', callback_data: 'broadcast_all' }
    ], [
      { text: '✅ Verified Users', callback_data: 'broadcast_verified' }
    ], [
      { text: '💎 Premium Users', callback_data: 'broadcast_premium' }
    ], [
      { text: '⭐ VIP Users', callback_data: 'broadcast_vip' }
    ], [
      { text: '🔙 Back to Admin', callback_data: 'admin_back' }
    ]]).reply_markup;
    
    await bot.sendMessage(
      chatId,
      `*Broadcast Message*\n\nSelect a target group for your broadcast:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleAdminBroadcast', error);
    
    // Send error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * Handle broadcast target callback
 * @param {Object} callbackQuery - Telegram callback query
 * @param {string} target - Broadcast target (all, verified, premium, vip)
 * @returns {Promise<void>}
 */
const handleBroadcastTarget = async (callbackQuery, target) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This action is for administrators only.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'callback_broadcast_target', { target });
    
    // Format target name
    let targetName;
    switch (target) {
      case 'all':
        targetName = 'All Users';
        break;
      case 'verified':
        targetName = 'Verified Users';
        break;
      case 'premium':
        targetName = 'Premium Users';
        break;
      case 'vip':
        targetName = 'VIP Users';
        break;
      default:
        targetName = 'Unknown';
    }
    
    // Ask for broadcast message
    await bot.sendMessage(
      chatId,
      `Please enter your broadcast message for ${targetName}:\n\n` +
      `You can use Markdown formatting in your message.`
    );
    
    // Set admin state to wait for broadcast message
    adminStates.set(telegramId, { 
      state: 'waiting_broadcast_message',
      target
    });
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleBroadcastTarget', error);
    
    // Send error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * Process broadcast message
 * @param {Object} msg - Telegram message object
 * @returns {Promise<boolean>} - Whether message was processed
 */
const processBroadcastMessage = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    
    // Check if admin is waiting for broadcast message
    const adminState = adminStates.get(telegramId);
    
    if (!adminState || adminState.state !== 'waiting_broadcast_message') {
      return false; // Not waiting for broadcast message
    }
    
    const message = msg.text.trim();
    
    if (!message) {
      await bot.sendMessage(
        chatId,
        `Please enter a valid message for your broadcast:`
      );
      return true;
    }
    
    // Format target name
    let targetName;
    switch (adminState.target) {
      case 'all':
        targetName = 'All Users';
        break;
      case 'verified':
        targetName = 'Verified Users';
        break;
      case 'premium':
        targetName = 'Premium Users';
        break;
      case 'vip':
        targetName = 'VIP Users';
        break;
      default:
        targetName = 'Unknown';
    }
    
    // Ask for confirmation
    await bot.sendMessage(
      chatId,
      `*Broadcast Preview*\n\n` +
      `Target: ${targetName}\n\n` +
      `Message:\n${message}\n\n` +
      `Are you sure you want to send this broadcast?`,
      {
        parse_mode: 'Markdown',
        reply_markup: createInlineKeyboard([[
          { text: '✅ Send Broadcast', callback_data: `confirm_broadcast_${adminState.target}` }
        ], [
          { text: '❌ Cancel', callback_data: 'admin_broadcast' }
        ]]).reply_markup
      }
    );
    
    // Update admin state with message
    adminState.message = message;
    adminStates.set(telegramId, adminState);
    
    return true;
  } catch (error) {
    logError(msg.from.id.toString(), 'processBroadcastMessage', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      `Error: ${error.message}`
    );
    
    // Clear admin state
    adminStates.delete(msg.from.id.toString());
    
    return true;
  }
};

/**
 * Handle confirm broadcast callback
 * @param {Object} callbackQuery - Telegram callback query
 * @param {string} target - Broadcast target (all, verified, premium, vip)
 * @returns {Promise<void>}
 */
const handleConfirmBroadcast = async (callbackQuery, target) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This action is for administrators only.`
      );
      return;
    }
    
    // Get admin state
    const adminState = adminStates.get(telegramId);
    
    if (!adminState || adminState.state !== 'waiting_broadcast_message' || !adminState.message) {
      await bot.sendMessage(
        chatId,
        `Broadcast message not found. Please try again.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'callback_confirm_broadcast', { target });
    
    // Send loading message
    const loadingMsg = await bot.sendMessage(
      chatId,
      `Sending broadcast... This may take a moment.`
    );
    
    // Send broadcast
    const result = await adminService.broadcastMessage(adminState.message, target, telegramId);
    
    // Clear admin state
    adminStates.delete(telegramId);
    
    // Delete loading message
    await bot.deleteMessage(chatId, loadingMsg.message_id);
    
    // Send confirmation
    await bot.sendMessage(
      chatId,
      `Broadcast sent successfully!\n\n` +
      `Target: ${target}\n` +
      `Recipients: ${result.count}\n` +
      `Failed: ${result.failed}`,
      {
        reply_markup: createInlineKeyboard([[
          { text: '🔙 Back to Admin', callback_data: 'admin_back' }
        ]]).reply_markup
      }
    );
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleConfirmBroadcast', error);
    
    // Send error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      `Error sending broadcast: ${error.message}`
    );
  }
};

/**
 * Handle admin users callback
 * @param {Object} callbackQuery - Telegram callback query
 * @returns {Promise<void>}
 */
const handleAdminUsers = async (callbackQuery) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This action is for administrators only.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'callback_admin_users');
    
    // Create keyboard
    const keyboard = createInlineKeyboard([[
      { text: '🔍 Find User', callback_data: 'admin_find_user' }
    ], [
      { text: '🔄 Update Subscription', callback_data: 'admin_update_subscription' }
    ], [
      { text: '🚫 Ban User', callback_data: 'admin_ban_user' }
    ], [
      { text: '✅ Unban User', callback_data: 'admin_unban_user' }
    ], [
      { text: '🔙 Back to Admin', callback_data: 'admin_back' }
    ]]).reply_markup;
    
    await bot.sendMessage(
      chatId,
      `*User Management*\n\nSelect an action:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleAdminUsers', error);
    
    // Send error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * Handle admin find user callback
 * @param {Object} callbackQuery - Telegram callback query
 * @returns {Promise<void>}
 */
const handleAdminFindUser = async (callbackQuery) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This action is for administrators only.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'callback_admin_find_user');
    
    // Ask for user ID or username
    await bot.sendMessage(
      chatId,
      `Please enter the Telegram ID or username of the user you want to find:`
    );
    
    // Set admin state to wait for user ID
    adminStates.set(telegramId, { 
      state: 'waiting_find_user'
    });
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleAdminFindUser', error);
    
    // Send error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * Process find user message
 * @param {Object} msg - Telegram message object
 * @returns {Promise<boolean>} - Whether message was processed
 */
const processFindUser = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    
    // Check if admin is waiting for user ID
    const adminState = adminStates.get(telegramId);
    
    if (!adminState || adminState.state !== 'waiting_find_user') {
      return false; // Not waiting for user ID
    }
    
    const userIdentifier = msg.text.trim();
    
    if (!userIdentifier) {
      await bot.sendMessage(
        chatId,
        `Please enter a valid Telegram ID or username:`
      );
      return true;
    }
    
    // Clear admin state
    adminStates.delete(telegramId);
    
    // Find user
    let user;
    
    // Check if input is a Telegram ID (numeric)
    if (/^\d+$/.test(userIdentifier)) {
      user = await userService.getUserByTelegramId(userIdentifier);
    } else {
      // Assume it's a username
      user = await userService.getUserByUsername(userIdentifier);
    }
    
    if (!user) {
      await bot.sendMessage(
        chatId,
        `User not found. Please check the ID or username and try again.`,
        {
          reply_markup: createInlineKeyboard([[
            { text: '🔙 Back to User Management', callback_data: 'admin_users' }
          ]]).reply_markup
        }
      );
      return true;
    }
    
    // Get user details
    const userDetails = await adminService.getUserDetails(user.telegram_id);
    
    // Format message
    let message = `*User Details*\n\n` +
      `ID: ${userDetails.user.telegram_id}\n` +
      `Username: ${userDetails.user.username || 'Not set'}\n` +
      `Registered: ${new Date(userDetails.user.registration_date).toLocaleDateString()}\n` +
      `Verification: ${formatVerificationStatus(userDetails.user.verification_status)}\n` +
      `Subscription: ${formatSubscriptionTier(userDetails.user.subscription_tier)}\n` +
      `Banned: ${userDetails.user.is_banned ? '✅ Yes' : '❌ No'}\n`;
    
    if (userDetails.user.verification_status === 'verified') {
      message += `Broker UID: ${userDetails.user.broker_uid || 'Not set'}\n`;
      
      if (userDetails.user.subscription_tier === 'vip') {
        message += `Auto-Trading: ${userDetails.user.auto_trade_enabled ? '✅ Enabled' : '❌ Disabled'}\n`;
        
        if (userDetails.user.auto_trade_enabled) {
          message += `Amount per Trade: $${userDetails.user.auto_trade_amount}\n` +
            `Risk Percentage: ${userDetails.user.auto_trade_risk_percentage}%\n`;
        }
      }
    }
    
    // Add verification history
    if (userDetails.verifications && userDetails.verifications.length > 0) {
      message += `\n*Verification History*\n`;
      
      for (const verification of userDetails.verifications) {
        message += `ID: ${verification.id}\n` +
          `Status: ${verification.approval_status}\n` +
          `Date: ${new Date(verification.submission_date).toLocaleDateString()}\n` +
          `Broker UID: ${verification.uid_submitted}\n` +
          `Deposit: $${verification.deposit_amount_confirmed || 0}\n\n`;
      }
    }
    
    // Add trading history
    if (userDetails.trades && userDetails.trades.length > 0) {
      message += `\n*Recent Trading Activity*\n`;
      
      for (const trade of userDetails.trades) {
        const statusText = trade.status === 'active' ? '🔴 ACTIVE' : '🟢 CLOSED';
        const profitLossText = trade.profit_loss ? 
          (trade.profit_loss > 0 ? 
            `✅ PROFIT: +${trade.profit_loss.toFixed(2)}%` : 
            `❌ LOSS: ${trade.profit_loss.toFixed(2)}%`) : 
          '';
        
        message += `ID: ${trade.signal_id}\n` +
          `Asset: ${trade.asset}\n` +
          `Type: ${trade.trade_type.toUpperCase()}\n` +
          `Amount: $${trade.trade_amount}\n` +
          `Status: ${statusText}\n` +
          (profitLossText ? `${profitLossText}\n` : '') +
          `Time: ${new Date(trade.entry_time).toLocaleDateString()}\n` +
          (trade.auto_traded ? `🤖 Auto-Traded\n` : '') +
          `\n`;
      }
    }
    
    // Create keyboard
    const keyboard = [];
    
    // Add action buttons based on user status
    if (userDetails.user.is_banned) {
      keyboard.push([{ text: '✅ Unban User', callback_data: `unban_user_${userDetails.user.telegram_id}` }]);
    } else {
      keyboard.push([{ text: '🚫 Ban User', callback_data: `ban_user_${userDetails.user.telegram_id}` }]);
    }
    
    // Add subscription update button
    keyboard.push([{ text: '🔄 Update Subscription', callback_data: `update_subscription_${userDetails.user.telegram_id}` }]);
    
    // Add back button
    keyboard.push([{ text: '🔙 Back to User Management', callback_data: 'admin_users' }]);
    
    await bot.sendMessage(
      chatId,
      message,
      {
        parse_mode: 'Markdown',
        reply_markup: createInlineKeyboard(keyboard).reply_markup
      }
    );
    
    return true;
  } catch (error) {
    logError(msg.from.id.toString(), 'processFindUser', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      `Error: ${error.message}`,
      {
        reply_markup: createInlineKeyboard([[
          { text: '🔙 Back to User Management', callback_data: 'admin_users' }
        ]]).reply_markup
      }
    );
    
    // Clear admin state
    adminStates.delete(msg.from.id.toString());
    
    return true;
  }
};

/**
 * Handle admin update subscription callback
 * @param {Object} callbackQuery - Telegram callback query
 * @returns {Promise<void>}
 */
const handleAdminUpdateSubscription = async (callbackQuery) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This action is for administrators only.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'callback_admin_update_subscription');
    
    // Ask for user ID
    await bot.sendMessage(
      chatId,
      `Please enter the Telegram ID of the user whose subscription you want to update:`
    );
    
    // Set admin state to wait for user ID
    adminStates.set(telegramId, { 
      state: 'waiting_update_subscription_user'
    });
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleAdminUpdateSubscription', error);
    
    // Send error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * Process update subscription user message
 * @param {Object} msg - Telegram message object
 * @returns {Promise<boolean>} - Whether message was processed
 */
const processUpdateSubscriptionUser = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    
    // Check if admin is waiting for user ID
    const adminState = adminStates.get(telegramId);
    
    if (!adminState || adminState.state !== 'waiting_update_subscription_user') {
      return false; // Not waiting for user ID
    }
    
    const userId = msg.text.trim();
    
    if (!userId || !/^\d+$/.test(userId)) {
      await bot.sendMessage(
        chatId,
        `Please enter a valid Telegram ID (numeric):`
      );
      return true;
    }
    
    // Check if user exists
    const user = await userService.getUserByTelegramId(userId);
    
    if (!user) {
      await bot.sendMessage(
        chatId,
        `User not found. Please check the ID and try again.`,
        {
          reply_markup: createInlineKeyboard([[
            { text: '🔙 Back to User Management', callback_data: 'admin_users' }
          ]]).reply_markup
        }
      );
      return true;
    }
    
    // Update admin state
    adminState.userId = userId;
    adminState.state = 'waiting_update_subscription_tier';
    adminStates.set(telegramId, adminState);
    
    // Ask for subscription tier
    await bot.sendMessage(
      chatId,
      `Current subscription tier: ${formatSubscriptionTier(user.subscription_tier)}\n\n` +
      `Please select the new subscription tier:`,
      {
        reply_markup: createInlineKeyboard([[
          { text: '🔹 Basic', callback_data: `set_subscription_${userId}_basic` }
        ], [
          { text: '💎 Premium', callback_data: `set_subscription_${userId}_premium` }
        ], [
          { text: '⭐ VIP', callback_data: `set_subscription_${userId}_vip` }
        ]]).reply_markup
      }
    );
    
    return true;
  } catch (error) {
    logError(msg.from.id.toString(), 'processUpdateSubscriptionUser', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      `Error: ${error.message}`,
      {
        reply_markup: createInlineKeyboard([[
          { text: '🔙 Back to User Management', callback_data: 'admin_users' }
        ]]).reply_markup
      }
    );
    
    // Clear admin state
    adminStates.delete(msg.from.id.toString());
    
    return true;
  }
};

/**
 * Handle set subscription callback
 * @param {Object} callbackQuery - Telegram callback query
 * @param {string} userId - User's Telegram ID
 * @param {string} tier - Subscription tier (basic, premium, vip)
 * @returns {Promise<void>}
 */
const handleSetSubscription = async (callbackQuery, userId, tier) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This action is for administrators only.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'callback_set_subscription', { userId, tier });
    
    // Clear admin state
    adminStates.delete(telegramId);
    
    // Update subscription
    await adminService.updateUserSubscription(userId, tier, telegramId);
    
    await bot.sendMessage(
      chatId,
      `User ${userId}'s subscription has been updated to ${formatSubscriptionTier(tier)}.\n\n` +
      `The user has been notified and their channel membership has been updated.`,
      {
        reply_markup: createInlineKeyboard([[
          { text: '🔙 Back to User Management', callback_data: 'admin_users' }
        ]]).reply_markup
      }
    );
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleSetSubscription', error);
    
    // Send error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      `Error: ${error.message}`,
      {
        reply_markup: createInlineKeyboard([[
          { text: '🔙 Back to User Management', callback_data: 'admin_users' }
        ]]).reply_markup
      }
    );
  }
};

/**
 * Handle admin ban user callback
 * @param {Object} callbackQuery - Telegram callback query
 * @returns {Promise<void>}
 */
const handleAdminBanUser = async (callbackQuery) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This action is for administrators only.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'callback_admin_ban_user');
    
    // Ask for user ID
    await bot.sendMessage(
      chatId,
      `Please enter the Telegram ID of the user you want to ban:`
    );
    
    // Set admin state to wait for user ID
    adminStates.set(telegramId, { 
      state: 'waiting_ban_user'
    });
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleAdminBanUser', error);
    
    // Send error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * Process ban user message
 * @param {Object} msg - Telegram message object
 * @returns {Promise<boolean>} - Whether message was processed
 */
const processBanUser = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    
    // Check if admin is waiting for user ID
    const adminState = adminStates.get(telegramId);
    
    if (!adminState || adminState.state !== 'waiting_ban_user') {
      return false; // Not waiting for user ID
    }
    
    const userId = msg.text.trim();
    
    if (!userId || !/^\d+$/.test(userId)) {
      await bot.sendMessage(
        chatId,
        `Please enter a valid Telegram ID (numeric):`
      );
      return true;
    }
    
    // Check if user exists
    const user = await userService.getUserByTelegramId(userId);
    
    if (!user) {
      await bot.sendMessage(
        chatId,
        `User not found. Please check the ID and try again.`,
        {
          reply_markup: createInlineKeyboard([[
            { text: '🔙 Back to User Management', callback_data: 'admin_users' }
          ]]).reply_markup
        }
      );
      return true;
    }
    
    // Check if user is already banned
    if (user.is_banned) {
      await bot.sendMessage(
        chatId,
        `This user is already banned.`,
        {
          reply_markup: createInlineKeyboard([[
            { text: '🔙 Back to User Management', callback_data: 'admin_users' }
          ]]).reply_markup
        }
      );
      return true;
    }
    
    // Update admin state
    adminState.userId = userId;
    adminState.state = 'waiting_ban_reason';
    adminStates.set(telegramId, adminState);
    
    // Ask for ban reason
    await bot.sendMessage(
      chatId,
      `Please enter a reason for banning this user:`
    );
    
    return true;
  } catch (error) {
    logError(msg.from.id.toString(), 'processBanUser', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      `Error: ${error.message}`,
      {
        reply_markup: createInlineKeyboard([[
          { text: '🔙 Back to User Management', callback_data: 'admin_users' }
        ]]).reply_markup
      }
    );
    
    // Clear admin state
    adminStates.delete(msg.from.id.toString());
    
    return true;
  }
};

/**
 * Process ban reason message
 * @param {Object} msg - Telegram message object
 * @returns {Promise<boolean>} - Whether message was processed
 */
const processBanReason = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    
    // Check if admin is waiting for ban reason
    const adminState = adminStates.get(telegramId);
    
    if (!adminState || adminState.state !== 'waiting_ban_reason') {
      return false; // Not waiting for ban reason
    }
    
    const reason = msg.text.trim();
    
    if (!reason) {
      await bot.sendMessage(
        chatId,
        `Please enter a valid reason for banning this user:`
      );
      return true;
    }
    
    // Ban user
    await adminService.banUser(adminState.userId, reason, telegramId);
    
    // Clear admin state
    adminStates.delete(telegramId);
    
    // Send confirmation
    await bot.sendMessage(
      chatId,
      `User ${adminState.userId} has been banned.\n\n` +
      `Reason: ${reason}\n\n` +
      `The user has been notified and removed from all channels.`,
      {
        reply_markup: createInlineKeyboard([[
          { text: '🔙 Back to User Management', callback_data: 'admin_users' }
        ]]).reply_markup
      }
    );
    
    return true;
  } catch (error) {
    logError(msg.from.id.toString(), 'processBanReason', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      `Error: ${error.message}`,
      {
        reply_markup: createInlineKeyboard([[
          { text: '🔙 Back to User Management', callback_data: 'admin_users' }
        ]]).reply_markup
      }
    );
    
    // Clear admin state
    adminStates.delete(msg.from.id.toString());
    
    return true;
  }
};

/**
 * Handle ban user callback
 * @param {Object} callbackQuery - Telegram callback query
 * @param {string} userId - User's Telegram ID
 * @returns {Promise<void>}
 */
const handleBanUser = async (callbackQuery, userId) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This action is for administrators only.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'callback_ban_user', { userId });
    
    // Ask for ban reason
    await bot.sendMessage(
      chatId,
      `Please enter a reason for banning user ${userId}:`
    );
    
    // Set admin state to wait for ban reason
    adminStates.set(telegramId, { 
      state: 'waiting_ban_reason',
      userId
    });
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleBanUser', error);
    
    // Send error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * Handle admin unban user callback
 * @param {Object} callbackQuery - Telegram callback query
 * @returns {Promise<void>}
 */
const handleAdminUnbanUser = async (callbackQuery) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This action is for administrators only.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'callback_admin_unban_user');
    
    // Ask for user ID
    await bot.sendMessage(
      chatId,
      `Please enter the Telegram ID of the user you want to unban:`
    );
    
    // Set admin state to wait for user ID
    adminStates.set(telegramId, { 
      state: 'waiting_unban_user'
    });
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleAdminUnbanUser', error);
    
    // Send error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * Process unban user message
 * @param {Object} msg - Telegram message object
 * @returns {Promise<boolean>} - Whether message was processed
 */
const processUnbanUser = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    
    // Check if admin is waiting for user ID
    const adminState = adminStates.get(telegramId);
    
    if (!adminState || adminState.state !== 'waiting_unban_user') {
      return false; // Not waiting for user ID
    }
    
    const userId = msg.text.trim();
    
    if (!userId || !/^\d+$/.test(userId)) {
      await bot.sendMessage(
        chatId,
        `Please enter a valid Telegram ID (numeric):`
      );
      return true;
    }
    
    // Check if user exists
    const user = await userService.getUserByTelegramId(userId);
    
    if (!user) {
      await bot.sendMessage(
        chatId,
        `User not found. Please check the ID and try again.`,
        {
          reply_markup: createInlineKeyboard([[
            { text: '🔙 Back to User Management', callback_data: 'admin_users' }
          ]]).reply_markup
        }
      );
      return true;
    }
    
    // Check if user is banned
    if (!user.is_banned) {
      await bot.sendMessage(
        chatId,
        `This user is not banned.`,
        {
          reply_markup: createInlineKeyboard([[
            { text: '🔙 Back to User Management', callback_data: 'admin_users' }
          ]]).reply_markup
        }
      );
      return true;
    }
    
    // Unban user
    await adminService.unbanUser(userId, telegramId);
    
    // Clear admin state
    adminStates.delete(telegramId);
    
    // Send confirmation
    await bot.sendMessage(
      chatId,
      `User ${userId} has been unbanned.\n\n` +
      `The user has been notified and can now access the bot again.`,
      {
        reply_markup: createInlineKeyboard([[
          { text: '🔙 Back to User Management', callback_data: 'admin_users' }
        ]]).reply_markup
      }
    );
    
    return true;
  } catch (error) {
    logError(msg.from.id.toString(), 'processUnbanUser', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      `Error: ${error.message}`,
      {
        reply_markup: createInlineKeyboard([[
          { text: '🔙 Back to User Management', callback_data: 'admin_users' }
        ]]).reply_markup
      }
    );
    
    // Clear admin state
    adminStates.delete(msg.from.id.toString());
    
    return true;
  }
};

/**
 * Handle unban user callback
 * @param {Object} callbackQuery - Telegram callback query
 * @param {string} userId - User's Telegram ID
 * @returns {Promise<void>}
 */
const handleUnbanUser = async (callbackQuery, userId) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This action is for administrators only.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'callback_unban_user', { userId });
    
    // Unban user
    await adminService.unbanUser(userId, telegramId);
    
    // Send confirmation
    await bot.sendMessage(
      chatId,
      `User ${userId} has been unbanned.\n\n` +
      `The user has been notified and can now access the bot again.`,
      {
        reply_markup: createInlineKeyboard([[
          { text: '🔙 Back to User Management', callback_data: 'admin_users' }
        ]]).reply_markup
      }
    );
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleUnbanUser', error);
    
    // Send error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * Handle admin back callback
 * @param {Object} callbackQuery - Telegram callback query
 * @returns {Promise<void>}
 */
const handleAdminBack = async (callbackQuery) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This action is for administrators only.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'callback_admin_back');
    
    // Call handleAdmin to show admin panel
    await handleAdmin({ chat: { id: chatId }, from: { id: telegramId } });
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleAdminBack', error);
    
    // Send error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      `Error: ${error.message}`
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
      return '⏳ Pending';
    case 'rejected':
      return '❌ Rejected';
    default:
      return '❓ Not Started';
  }
};

/**
 * Format subscription tier for display
 * @param {string} tier - Subscription tier
 * @returns {string} - Formatted tier
 */
const formatSubscriptionTier = (tier) => {
  switch (tier) {
    case 'premium':
      return '💎 Premium';
    case 'vip':
      return '⭐ VIP';
    default:
      return '🔹 Basic';
  }
};

// Admin states map to track multi-step processes
const adminStates = new Map();

// Register message handler for admin commands
bot.onText(/\/admin/, handleAdmin);

// Register callback query handlers
bot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  
  // Admin panel callbacks
  if (data === 'admin_analytics') {
    await handleAdminAnalytics(callbackQuery);
  } else if (data === 'admin_verifications') {
    await handleAdminVerifications(callbackQuery);
  } else if (data === 'admin_broadcast') {
    await handleAdminBroadcast(callbackQuery);
  } else if (data === 'admin_users') {
    await handleAdminUsers(callbackQuery);
  } else if (data === 'admin_back') {
    await handleAdminBack(callbackQuery);
  } 
  // Analytics callbacks
  else if (data === 'analytics_daily') {
    await handleAnalyticsReport(callbackQuery, 'daily');
  } else if (data === 'analytics_weekly') {
    await handleAnalyticsReport(callbackQuery, 'weekly');
  } else if (data === 'analytics_monthly') {
    await handleAnalyticsReport(callbackQuery, 'monthly');
  } 
  // Verification callbacks
  else if (data.startsWith('verify_review_')) {
    const verificationId = data.replace('verify_review_', '');
    await handleVerificationReview(callbackQuery, verificationId);
  } else if (data.startsWith('verify_screenshot_')) {
    const verificationId = data.replace('verify_screenshot_', '');
    await handleVerificationScreenshot(callbackQuery, verificationId);
  } else if (data.startsWith('verify_approve_premium_')) {
    const verificationId = data.replace('verify_approve_premium_', '');
    await handleVerificationApproval(callbackQuery, verificationId, 'premium');
  } else if (data.startsWith('verify_approve_vip_')) {
    const verificationId = data.replace('verify_approve_vip_', '');
    await handleVerificationApproval(callbackQuery, verificationId, 'vip');
  } else if (data.startsWith('verify_reject_')) {
    const verificationId = data.replace('verify_reject_', '');
    await handleVerificationRejection(callbackQuery, verificationId);
  } 
  // Broadcast callbacks
  else if (data.startsWith('broadcast_')) {
    const target = data.replace('broadcast_', '');
    await handleBroadcastTarget(callbackQuery, target);
  } else if (data.startsWith('confirm_broadcast_')) {
    const target = data.replace('confirm_broadcast_', '');
    await handleConfirmBroadcast(callbackQuery, target);
  } 
  // User management callbacks
  else if (data === 'admin_find_user') {
    await handleAdminFindUser(callbackQuery);
  } else if (data === 'admin_update_subscription') {
    await handleAdminUpdateSubscription(callbackQuery);
  } else if (data === 'admin_ban_user') {
    await handleAdminBanUser(callbackQuery);
  } else if (data === 'admin_unban_user') {
    await handleAdminUnbanUser(callbackQuery);
  } else if (data.startsWith('ban_user_')) {
    const userId = data.replace('ban_user_', '');
    await handleBanUser(callbackQuery, userId);
  } else if (data.startsWith('unban_user_')) {
    const userId = data.replace('unban_user_', '');
    await handleUnbanUser(callbackQuery, userId);
  } else if (data.startsWith('update_subscription_')) {
    const userId = data.replace('update_subscription_', '');
    await handleAdminUpdateSubscription(callbackQuery, userId);
  } else if (data.startsWith('set_subscription_')) {
    const parts = data.replace('set_subscription_', '').split('_');
    const userId = parts[0];
    const tier = parts[1];
    await handleSetSubscription(callbackQuery, userId, tier);
  }
});

// Register message handler for admin multi-step processes
bot.on('message', async (msg) => {
  if (msg.text && !msg.text.startsWith('/')) {
    // Try to process admin messages
    const processed = 
      await processRejectionReason(msg) ||
      await processBroadcastMessage(msg) ||
      await processFindUser(msg) ||
      await processUpdateSubscriptionUser(msg) ||
      await processBanUser(msg) ||
      await processBanReason(msg) ||
      await processUnbanUser(msg);
    
    // If message was processed by admin handlers, stop processing
    if (processed) return;
  }
});

module.exports = {
  handleAdmin,
  handleAdminAnalytics,
  handleAnalyticsReport,
  handleAdminVerifications,
  handleVerificationReview,
  handleVerificationScreenshot,
  handleVerificationApproval,
  handleVerificationRejection,
  handleAdminBroadcast,
  handleBroadcastTarget,
  handleConfirmBroadcast,
  handleAdminUsers,
  handleAdminFindUser,
  handleAdminUpdateSubscription,
  handleSetSubscription,
  handleAdminBanUser,
  handleBanUser,
  handleAdminUnbanUser,
  handleUnbanUser,
  handleAdminBack
};