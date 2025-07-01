const { User, Verification, Trading } = require('../models');
const { bot, isAdmin } = require('../config/bot');
const { createInlineKeyboard } = require('../utils/keyboard');
const { logger, logAdminAction, logError } = require('../utils/logger');
const userService = require('./userService');
const verificationService = require('./verificationService');

/**
 * Broadcast message to all users or a specific group
 * @param {Object} messageData - Message data
 * @param {string} messageData.text - Message text
 * @param {Array} messageData.buttons - Optional buttons
 * @param {Object} options - Broadcast options
 * @param {string} options.targetGroup - Target group (all, verified, premium, vip)
 * @param {string} adminTelegramId - Admin's Telegram ID
 * @returns {Promise<Object>} - Broadcast results
 */
const broadcastMessage = async (messageData, options = {}, adminTelegramId) => {
  try {
    if (!isAdmin(adminTelegramId)) {
      throw new Error('Unauthorized: Only admins can broadcast messages');
    }
    
    const { text, buttons = [] } = messageData;
    const { targetGroup = 'all' } = options;
    
    // Get target users based on group
    let users = [];
    
    if (targetGroup === 'all') {
      users = await User.findAll();
    } else if (targetGroup === 'verified') {
      users = await User.findAll({
        where: { verification_status: 'verified' }
      });
    } else if (targetGroup === 'premium') {
      users = await User.findAll({
        where: { 
          verification_status: 'verified',
          subscription_tier: 'premium'
        }
      });
    } else if (targetGroup === 'vip') {
      users = await User.findAll({
        where: { 
          verification_status: 'verified',
          subscription_tier: 'vip'
        }
      });
    } else {
      throw new Error(`Invalid target group: ${targetGroup}`);
    }
    
    logger.info(`Broadcasting message to ${users.length} users in group: ${targetGroup}`);
    
    // Create keyboard if buttons provided
    const keyboard = buttons.length > 0 ? createInlineKeyboard(buttons) : {};
    
    // Send messages
    let successCount = 0;
    let failCount = 0;
    
    for (const user of users) {
      try {
        await bot.sendMessage(
          user.telegram_id,
          text,
          {
            parse_mode: 'Markdown',
            ...keyboard
          }
        );
        successCount++;
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        failCount++;
        logger.error(`Failed to send broadcast to user ${user.telegram_id}: ${err.message}`);
      }
    }
    
    const result = {
      targetGroup,
      totalUsers: users.length,
      successCount,
      failCount,
      timestamp: new Date()
    };
    
    logAdminAction(adminTelegramId, 'broadcast_message', result);
    
    return result;
  } catch (error) {
    logError(adminTelegramId, 'broadcastMessage', error);
    throw error;
  }
};

/**
 * Get pending verifications
 * @param {string} adminTelegramId - Admin's Telegram ID
 * @returns {Promise<Array>} - Pending verifications
 */
const getPendingVerifications = async (adminTelegramId) => {
  try {
    if (!isAdmin(adminTelegramId)) {
      throw new Error('Unauthorized: Only admins can view pending verifications');
    }
    
    return await verificationService.getPendingVerifications();
  } catch (error) {
    logError(adminTelegramId, 'getPendingVerifications', error);
    throw error;
  }
};

/**
 * Process verification
 * @param {number} verificationId - Verification ID
 * @param {boolean} approved - Whether verification is approved
 * @param {number} depositAmount - Confirmed deposit amount (if approved)
 * @param {string} adminTelegramId - Admin's Telegram ID
 * @returns {Promise<Object>} - Updated verification
 */
const processVerification = async (verificationId, approved, depositAmount, adminTelegramId) => {
  try {
    if (!isAdmin(adminTelegramId)) {
      throw new Error('Unauthorized: Only admins can process verifications');
    }
    
    if (approved) {
      return await verificationService.approveVerification(verificationId, depositAmount, adminTelegramId);
    } else {
      return await verificationService.rejectVerification(verificationId, adminTelegramId);
    }
  } catch (error) {
    logError(adminTelegramId, 'processVerification', error);
    throw error;
  }
};

/**
 * Get user details
 * @param {string} telegramId - User's Telegram ID
 * @param {string} adminTelegramId - Admin's Telegram ID
 * @returns {Promise<Object>} - User details
 */
const getUserDetails = async (telegramId, adminTelegramId) => {
  try {
    if (!isAdmin(adminTelegramId)) {
      throw new Error('Unauthorized: Only admins can view user details');
    }
    
    const user = await userService.getUserByTelegramId(telegramId);
    
    if (!user) {
      throw new Error(`User with Telegram ID ${telegramId} not found`);
    }
    
    // Get user's verification history
    const verifications = await Verification.findAll({
      where: { user_id: user.id },
      order: [['submission_date', 'DESC']]
    });
    
    // Get user's trading history
    const trades = await Trading.findAll({
      where: { user_id: user.id },
      order: [['entry_time', 'DESC']],
      limit: 10
    });
    
    return {
      user,
      verifications,
      trades
    };
  } catch (error) {
    logError(adminTelegramId, 'getUserDetails', error);
    throw error;
  }
};

/**
 * Update user subscription tier
 * @param {string} telegramId - User's Telegram ID
 * @param {string} tier - Subscription tier (premium, vip)
 * @param {string} adminTelegramId - Admin's Telegram ID
 * @returns {Promise<Object>} - Updated user
 */
const updateUserSubscription = async (telegramId, tier, adminTelegramId) => {
  try {
    if (!isAdmin(adminTelegramId)) {
      throw new Error('Unauthorized: Only admins can update user subscriptions');
    }
    
    if (!['premium', 'vip'].includes(tier)) {
      throw new Error(`Invalid subscription tier: ${tier}`);
    }
    
    const user = await userService.getUserByTelegramId(telegramId);
    
    if (!user) {
      throw new Error(`User with Telegram ID ${telegramId} not found`);
    }
    
    // Update user's subscription tier
    await user.update({ subscription_tier: tier });
    
    // Update channel membership
    await userService.updateChannelMembership(telegramId, tier);
    
    logAdminAction(adminTelegramId, 'update_user_subscription', { 
      user_id: user.id,
      telegram_id: telegramId,
      new_tier: tier
    });
    
    // Notify user
    await bot.sendMessage(
      telegramId,
      `🌟 *Subscription Update* 🌟\n\nYour subscription has been updated to *${tier.toUpperCase()}* tier by our admin team.\n\nEnjoy your enhanced benefits!`,
      { parse_mode: 'Markdown' }
    );
    
    return user;
  } catch (error) {
    logError(adminTelegramId, 'updateUserSubscription', error);
    throw error;
  }
};

/**
 * Ban user
 * @param {string} telegramId - User's Telegram ID
 * @param {string} reason - Ban reason
 * @param {string} adminTelegramId - Admin's Telegram ID
 * @returns {Promise<Object>} - Banned user
 */
const banUser = async (telegramId, reason, adminTelegramId) => {
  try {
    if (!isAdmin(adminTelegramId)) {
      throw new Error('Unauthorized: Only admins can ban users');
    }
    
    const user = await userService.getUserByTelegramId(telegramId);
    
    if (!user) {
      throw new Error(`User with Telegram ID ${telegramId} not found`);
    }
    
    // Update user's status
    await user.update({ 
      is_banned: true,
      ban_reason: reason,
      banned_at: new Date()
    });
    
    logAdminAction(adminTelegramId, 'ban_user', { 
      user_id: user.id,
      telegram_id: telegramId,
      reason
    });
    
    // Kick from channels
    const premiumChannelId = process.env.PREMIUM_CHANNEL_ID;
    const vipChannelId = process.env.VIP_CHANNEL_ID;
    
    try {
      if (premiumChannelId) {
        await bot.kickChatMember(premiumChannelId, telegramId);
      }
      
      if (vipChannelId) {
        await bot.kickChatMember(vipChannelId, telegramId);
      }
    } catch (err) {
      logger.error(`Failed to kick banned user from channels: ${err.message}`);
    }
    
    // Notify user
    try {
      await bot.sendMessage(
        telegramId,
        `⛔ *Account Banned* ⛔\n\nYour account has been banned from OPTRIXTRADES.\n\nReason: ${reason}\n\nIf you believe this is a mistake, please contact our support team.`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      logger.error(`Failed to notify banned user: ${err.message}`);
    }
    
    return user;
  } catch (error) {
    logError(adminTelegramId, 'banUser', error);
    throw error;
  }
};

/**
 * Unban user
 * @param {string} telegramId - User's Telegram ID
 * @param {string} adminTelegramId - Admin's Telegram ID
 * @returns {Promise<Object>} - Unbanned user
 */
const unbanUser = async (telegramId, adminTelegramId) => {
  try {
    if (!isAdmin(adminTelegramId)) {
      throw new Error('Unauthorized: Only admins can unban users');
    }
    
    const user = await userService.getUserByTelegramId(telegramId);
    
    if (!user) {
      throw new Error(`User with Telegram ID ${telegramId} not found`);
    }
    
    if (!user.is_banned) {
      throw new Error(`User with Telegram ID ${telegramId} is not banned`);
    }
    
    // Update user's status
    await user.update({ 
      is_banned: false,
      ban_reason: null,
      banned_at: null
    });
    
    logAdminAction(adminTelegramId, 'unban_user', { 
      user_id: user.id,
      telegram_id: telegramId
    });
    
    // Notify user
    try {
      await bot.sendMessage(
        telegramId,
        `✅ *Account Unbanned* ✅\n\nYour account has been unbanned from OPTRIXTRADES.\n\nYou can now use all features again. Welcome back!`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      logger.error(`Failed to notify unbanned user: ${err.message}`);
    }
    
    return user;
  } catch (error) {
    logError(adminTelegramId, 'unbanUser', error);
    throw error;
  }
};

/**
 * Get user statistics
 * @param {string} adminTelegramId - Admin's Telegram ID
 * @returns {Promise<Object>} - User statistics
 */
const getUserStatistics = async (adminTelegramId) => {
  try {
    if (!isAdmin(adminTelegramId)) {
      throw new Error('Unauthorized: Only admins can view user statistics');
    }
    
    // Total users
    const totalUsers = await User.count();
    
    // Verified users
    const verifiedUsers = await User.count({
      where: { verification_status: 'verified' }
    });
    
    // Premium users
    const premiumUsers = await User.count({
      where: { 
        verification_status: 'verified',
        subscription_tier: 'premium'
      }
    });
    
    // VIP users
    const vipUsers = await User.count({
      where: { 
        verification_status: 'verified',
        subscription_tier: 'vip'
      }
    });
    
    // Banned users
    const bannedUsers = await User.count({
      where: { is_banned: true }
    });
    
    // Users in follow-up sequence
    const followUpUsers = await User.count({
      where: { 
        follow_up_sequence_active: true,
        verification_status: { [Op.ne]: 'verified' }
      }
    });
    
    // Users with auto-trading enabled
    const autoTradingUsers = await User.count({
      where: { 
        verification_status: 'verified',
        subscription_tier: 'vip',
        auto_trade_enabled: true
      }
    });
    
    return {
      totalUsers,
      verifiedUsers,
      premiumUsers,
      vipUsers,
      bannedUsers,
      followUpUsers,
      autoTradingUsers,
      verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0
    };
  } catch (error) {
    logError(adminTelegramId, 'getUserStatistics', error);
    throw error;
  }
};

module.exports = {
  broadcastMessage,
  getPendingVerifications,
  processVerification,
  getUserDetails,
  updateUserSubscription,
  banUser,
  unbanUser,
  getUserStatistics
};