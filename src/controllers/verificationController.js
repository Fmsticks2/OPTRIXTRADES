const { bot, isAdmin } = require('../config/bot');
const userService = require('../services/userService');
const verificationService = require('../services/verificationService');
const { createInlineKeyboard, removeKeyboard } = require('../utils/keyboard');
const { getVerificationInstructions } = require('../utils/messageTemplates');
const { logger, logUserAction, logError } = require('../utils/logger');

// Store users in verification process
const usersInVerification = new Map();

/**
 * Handle verify callback or command
 * @param {Object} msg - Telegram message object or callback query
 * @param {boolean} isCallback - Whether it's a callback query
 * @returns {Promise<void>}
 */
const handleVerify = async (msg, isCallback = false) => {
  try {
    const chatId = isCallback ? msg.message.chat.id : msg.chat.id;
    const telegramId = isCallback ? msg.from.id.toString() : msg.from.id.toString();
    const firstName = isCallback ? msg.from.first_name : msg.from.first_name;
    
    if (isCallback) {
      // Acknowledge callback query
      await bot.answerCallbackQuery(msg.id);
    }
    
    logUserAction(telegramId, 'verification_started');
    
    // Check if user is already verified
    const user = await userService.getUserByTelegramId(telegramId);
    
    if (user && user.verification_status === 'verified') {
      await bot.sendMessage(
        chatId,
        `You are already verified with OPTRIXTRADES.\n\nYour subscription tier: *${user.subscription_tier.toUpperCase()}*\n\nEnjoy your premium trading signals!`,
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    // Check if user has a pending verification
    if (user && user.verification_status === 'pending') {
      await bot.sendMessage(
        chatId,
        `Your verification is currently pending review by our team.\n\nWe'll notify you once your verification is processed.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    // Get verification instructions
    const verificationInstructions = getVerificationInstructions({
      first_name: firstName,
      affiliate_link: process.env.BROKER_AFFILIATE_LINK || 'https://broker.example.com/register'
    });
    
    // Send verification instructions
    await bot.sendMessage(
      chatId,
      verificationInstructions,
      {
        parse_mode: 'Markdown',
        reply_markup: createInlineKeyboard([[
          { text: '🔗 Register with Broker', url: process.env.BROKER_AFFILIATE_LINK || 'https://broker.example.com/register' }
        ]]).reply_markup
      }
    );
    
    // Ask for broker UID
    await bot.sendMessage(
      chatId,
      `Please enter your broker UID (User ID) to begin the verification process.`,
      { reply_markup: removeKeyboard().reply_markup }
    );
    
    // Set user in verification process
    usersInVerification.set(telegramId, { step: 'uid' });
  } catch (error) {
    logError(isCallback ? msg.from.id.toString() : msg.from.id.toString(), 'handleVerify', error);
    
    // Send generic error message
    await bot.sendMessage(
      isCallback ? msg.message.chat.id : msg.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
};

/**
 * Handle verification status command
 * @param {Object} msg - Telegram message object
 * @returns {Promise<void>}
 */
const handleVerificationStatus = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    
    logUserAction(telegramId, 'verification_status_check');
    
    // Get user
    const user = await userService.getUserByTelegramId(telegramId);
    
    if (!user) {
      await bot.sendMessage(
        chatId,
        `You don't have an account with us yet. Please use /start to begin.`
      );
      return;
    }
    
    let statusMessage;
    let keyboard;
    
    if (user.verification_status === 'verified') {
      statusMessage = `✅ *Verification Status: Verified*\n\n` +
        `Congratulations! Your account is verified.\n\n` +
        `Subscription Tier: *${user.subscription_tier.toUpperCase()}*\n` +
        `Verified On: ${new Date(user.verification_date).toLocaleDateString()}\n\n` +
        `You have full access to our premium trading signals.`;
      
      keyboard = createInlineKeyboard([[
        { text: '📊 View Trading Signals', callback_data: 'view_signals' }
      ]]).reply_markup;
    } else if (user.verification_status === 'pending') {
      statusMessage = `⏳ *Verification Status: Pending*\n\n` +
        `Your verification is currently under review by our team.\n\n` +
        `Submitted On: ${new Date(user.verification_submission_date).toLocaleDateString()}\n\n` +
        `We'll notify you once your verification is processed. This typically takes 1-24 hours.`;
      
      keyboard = createInlineKeyboard([[
        { text: '📱 Contact Support', callback_data: 'contact_support' }
      ]]).reply_markup;
    } else if (user.verification_status === 'rejected') {
      statusMessage = `❌ *Verification Status: Rejected*\n\n` +
        `Your verification was rejected.\n\n` +
        `Possible reasons:\n` +
        `- Invalid broker UID\n` +
        `- Unclear screenshot\n` +
        `- Insufficient deposit amount\n\n` +
        `You can try again with the correct information.`;
      
      keyboard = createInlineKeyboard([[
        { text: '🔄 Try Again', callback_data: 'verify' }
      ], [
        { text: '📱 Contact Support', callback_data: 'contact_support' }
      ]]).reply_markup;
    } else {
      statusMessage = `*Verification Status: Not Verified*\n\n` +
        `You haven't completed the verification process yet.\n\n` +
        `Please verify your account to access premium trading signals.`;
      
      keyboard = createInlineKeyboard([[
        { text: '✅ Verify Now', callback_data: 'verify' }
      ]]).reply_markup;
    }
    
    await bot.sendMessage(
      chatId,
      statusMessage,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  } catch (error) {
    logError(msg.from.id.toString(), 'handleVerificationStatus', error);
    
    // Send generic error message
    await bot.sendMessage(
      msg.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
};

/**
 * Process verification message
 * @param {Object} msg - Telegram message object
 * @returns {Promise<boolean>} - Whether message was processed
 */
const processVerificationMessage = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    
    // Check if user is in verification process
    const verificationState = usersInVerification.get(telegramId);
    
    if (!verificationState) {
      return false; // Not in verification process
    }
    
    if (verificationState.step === 'uid') {
      // Process broker UID
      const uid = msg.text.trim();
      
      if (!uid || uid.length < 3) {
        await bot.sendMessage(
          chatId,
          `Invalid broker UID. Please enter a valid UID.`
        );
        return true;
      }
      
      // Update verification state
      verificationState.uid = uid;
      verificationState.step = 'screenshot';
      usersInVerification.set(telegramId, verificationState);
      
      // Update user's broker UID
      await userService.updateBrokerUid(telegramId, uid);
      
      logUserAction(telegramId, 'verification_uid_submitted', { uid });
      
      // Ask for deposit screenshot
      await bot.sendMessage(
        chatId,
        `Thank you! Now please send a screenshot of your deposit in the broker account.\n\nThe screenshot should clearly show:\n- Your broker UID/username\n- The deposit amount\n- The date of the deposit`,
        { parse_mode: 'Markdown' }
      );
      
      return true;
    } else if (verificationState.step === 'screenshot') {
      // Check if message contains a photo
      if (!msg.photo || msg.photo.length === 0) {
        await bot.sendMessage(
          chatId,
          `Please send a screenshot image of your deposit.`
        );
        return true;
      }
      
      // Get the highest resolution photo
      const photo = msg.photo[msg.photo.length - 1];
      
      // Create verification submission
      await verificationService.createVerification(
        telegramId,
        verificationState.uid,
        photo.file_id
      );
      
      logUserAction(telegramId, 'verification_screenshot_submitted');
      
      // Clear verification state
      usersInVerification.delete(telegramId);
      
      // Send confirmation message
      await bot.sendMessage(
        chatId,
        `Thank you for submitting your verification details!\n\nOur team will review your submission and process your verification as soon as possible.\n\nYou'll receive a notification once your verification is complete.`,
        { parse_mode: 'Markdown' }
      );
      
      return true;
    }
    
    return false;
  } catch (error) {
    logError(msg.from.id.toString(), 'processVerificationMessage', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      'Sorry, there was an error processing your verification. Please try again later.'
    );
    
    // Clear verification state
    usersInVerification.delete(msg.from.id.toString());
    
    return true;
  }
};

/**
 * Handle verification approval (admin only)
 * @param {Object} msg - Telegram message object
 * @param {Array} params - Command parameters
 * @returns {Promise<void>}
 */
const handleVerificationApproval = async (msg, params) => {
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
    
    // Check parameters
    if (!params || params.length < 3) {
      await bot.sendMessage(
        chatId,
        `Invalid parameters. Usage: /approve <verification_id> <deposit_amount> <tier>`
      );
      return;
    }
    
    const verificationId = parseInt(params[0]);
    const depositAmount = parseFloat(params[1]);
    const tier = params[2].toLowerCase();
    
    if (isNaN(verificationId) || isNaN(depositAmount) || !['premium', 'vip'].includes(tier)) {
      await bot.sendMessage(
        chatId,
        `Invalid parameters. Usage: /approve <verification_id> <deposit_amount> <tier>\n\nTier must be 'premium' or 'vip'.`
      );
      return;
    }
    
    // Approve verification
    await verificationService.approveVerification(verificationId, depositAmount, telegramId, tier);
    
    await bot.sendMessage(
      chatId,
      `Verification #${verificationId} has been approved with tier: ${tier.toUpperCase()}.`
    );
  } catch (error) {
    logError(msg.from.id.toString(), 'handleVerificationApproval', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * Handle verification rejection (admin only)
 * @param {Object} msg - Telegram message object
 * @param {Array} params - Command parameters
 * @returns {Promise<void>}
 */
const handleVerificationRejection = async (msg, params) => {
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
    
    // Check parameters
    if (!params || params.length < 1) {
      await bot.sendMessage(
        chatId,
        `Invalid parameters. Usage: /reject <verification_id> [reason]`
      );
      return;
    }
    
    const verificationId = parseInt(params[0]);
    const reason = params.slice(1).join(' ') || 'Verification requirements not met';
    
    if (isNaN(verificationId)) {
      await bot.sendMessage(
        chatId,
        `Invalid verification ID. Usage: /reject <verification_id> [reason]`
      );
      return;
    }
    
    // Reject verification
    await verificationService.rejectVerification(verificationId, telegramId, reason);
    
    await bot.sendMessage(
      chatId,
      `Verification #${verificationId} has been rejected.`
    );
  } catch (error) {
    logError(msg.from.id.toString(), 'handleVerificationRejection', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * List pending verifications (admin only)
 * @param {Object} msg - Telegram message object
 * @returns {Promise<void>}
 */
const listPendingVerifications = async (msg) => {
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
    
    // Get pending verifications
    const pendingVerifications = await verificationService.getPendingVerifications();
    
    if (pendingVerifications.length === 0) {
      await bot.sendMessage(
        chatId,
        `No pending verifications.`
      );
      return;
    }
    
    // Format verification list
    let message = `*Pending Verifications (${pendingVerifications.length})*\n\n`;
    
    for (const verification of pendingVerifications) {
      const user = await userService.getUserById(verification.user_id);
      
      message += `ID: ${verification.id}\n` +
        `User: ${user.first_name} ${user.last_name || ''} (${user.username || 'no username'})\n` +
        `Telegram ID: ${user.telegram_id}\n` +
        `Broker UID: ${verification.uid_submitted}\n` +
        `Submitted: ${new Date(verification.submission_date).toLocaleString()}\n\n`;
    }
    
    message += `To approve: /approve <id> <amount> <tier>\n` +
      `To reject: /reject <id> [reason]\n` +
      `To view screenshot: /screenshot <id>`;
    
    await bot.sendMessage(
      chatId,
      message,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logError(msg.from.id.toString(), 'listPendingVerifications', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * View verification screenshot (admin only)
 * @param {Object} msg - Telegram message object
 * @param {Array} params - Command parameters
 * @returns {Promise<void>}
 */
const viewVerificationScreenshot = async (msg, params) => {
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
    
    // Check parameters
    if (!params || params.length < 1) {
      await bot.sendMessage(
        chatId,
        `Invalid parameters. Usage: /screenshot <verification_id>`
      );
      return;
    }
    
    const verificationId = parseInt(params[0]);
    
    if (isNaN(verificationId)) {
      await bot.sendMessage(
        chatId,
        `Invalid verification ID. Usage: /screenshot <verification_id>`
      );
      return;
    }
    
    // Get verification
    const verification = await verificationService.getVerificationById(verificationId);
    
    if (!verification) {
      await bot.sendMessage(
        chatId,
        `Verification #${verificationId} not found.`
      );
      return;
    }
    
    // Get user
    const user = await userService.getUserById(verification.user_id);
    
    // Send screenshot
    await bot.sendPhoto(
      chatId,
      verification.screenshot_url,
      {
        caption: `Verification #${verification.id}\n` +
          `User: ${user.first_name} ${user.last_name || ''} (${user.username || 'no username'})\n` +
          `Telegram ID: ${user.telegram_id}\n` +
          `Broker UID: ${verification.uid_submitted}\n` +
          `Submitted: ${new Date(verification.submission_date).toLocaleString()}`,
        reply_markup: createInlineKeyboard([[
          { text: '✅ Approve', callback_data: `approve_verification:${verification.id}` },
          { text: '❌ Reject', callback_data: `reject_verification:${verification.id}` }
        ]]).reply_markup
      }
    );
  } catch (error) {
    logError(msg.from.id.toString(), 'viewVerificationScreenshot', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      `Error: ${error.message}`
    );
  }
};

module.exports = {
  handleVerify,
  handleVerificationStatus,
  processVerificationMessage,
  handleVerificationApproval,
  handleVerificationRejection,
  listPendingVerifications,
  viewVerificationScreenshot,
  usersInVerification
};