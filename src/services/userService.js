const { User } = require('../models');
const { logger, logUserAction, logError } = require('../utils/logger');

/**
 * Create a new user or update existing user
 * @param {Object} userData - User data from Telegram
 * @returns {Promise<Object>} - User object
 */
const createOrUpdateUser = async (userData) => {
  try {
    const { id: telegram_id, first_name, last_name, username } = userData;
    
    // Check if user exists
    const [user, created] = await User.findOrCreate({
      where: { telegram_id: telegram_id.toString() },
      defaults: {
        telegram_id: telegram_id.toString(),
        username,
        first_name,
        last_name,
        registration_date: new Date(),
        last_interaction: new Date()
      }
    });
    
    // If user exists, update last interaction and other fields if changed
    if (!created) {
      await user.update({
        username: username || user.username,
        first_name: first_name || user.first_name,
        last_name: last_name || user.last_name,
        last_interaction: new Date()
      });
      
      logUserAction(telegram_id, 'user_updated', { username, first_name, last_name });
    } else {
      logUserAction(telegram_id, 'user_created', { username, first_name, last_name });
    }
    
    return user;
  } catch (error) {
    logError(userData.id, 'createOrUpdateUser', error);
    throw error;
  }
};

/**
 * Get user by Telegram ID
 * @param {string} telegramId - User's Telegram ID
 * @returns {Promise<Object>} - User object
 */
const getUserByTelegramId = async (telegramId) => {
  try {
    const user = await User.findOne({
      where: { telegram_id: telegramId.toString() }
    });
    
    return user;
  } catch (error) {
    logError(telegramId, 'getUserByTelegramId', error);
    throw error;
  }
};

/**
 * Update user's broker UID
 * @param {string} telegramId - User's Telegram ID
 * @param {string} brokerUid - Broker UID
 * @returns {Promise<Object>} - Updated user object
 */
const updateBrokerUid = async (telegramId, brokerUid) => {
  try {
    const user = await getUserByTelegramId(telegramId);
    
    if (!user) {
      throw new Error(`User with Telegram ID ${telegramId} not found`);
    }
    
    await user.update({ broker_uid: brokerUid });
    logUserAction(telegramId, 'broker_uid_updated', { broker_uid: brokerUid });
    
    return user;
  } catch (error) {
    logError(telegramId, 'updateBrokerUid', error);
    throw error;
  }
};

/**
 * Update user's verification status
 * @param {string} telegramId - User's Telegram ID
 * @param {string} status - Verification status (pending/verified/rejected)
 * @param {number} depositAmount - Deposit amount (optional)
 * @returns {Promise<Object>} - Updated user object
 */
const updateVerificationStatus = async (telegramId, status, depositAmount = null) => {
  try {
    const user = await getUserByTelegramId(telegramId);
    
    if (!user) {
      throw new Error(`User with Telegram ID ${telegramId} not found`);
    }
    
    const updateData = { verification_status: status };
    
    // Update deposit amount if provided
    if (depositAmount !== null) {
      updateData.deposit_amount = depositAmount;
      
      // Update subscription tier based on deposit amount
      if (depositAmount >= 500) {
        updateData.subscription_tier = 'vip';
      } else if (depositAmount >= 100) {
        updateData.subscription_tier = 'premium';
      } else if (depositAmount >= 20) {
        updateData.subscription_tier = 'basic';
      } else {
        updateData.subscription_tier = 'free';
      }
    }
    
    await user.update(updateData);
    
    logUserAction(telegramId, 'verification_status_updated', { 
      status, 
      deposit_amount: depositAmount 
    });
    
    return user;
  } catch (error) {
    logError(telegramId, 'updateVerificationStatus', error);
    throw error;
  }
};

/**
 * Update user's auto-trade settings
 * @param {string} telegramId - User's Telegram ID
 * @param {boolean} enabled - Whether auto-trade is enabled
 * @param {number} riskPerTrade - Risk percentage per trade (optional)
 * @param {number} maxTradeAmount - Maximum trade amount (optional)
 * @returns {Promise<Object>} - Updated user object
 */
const updateAutoTradeSettings = async (telegramId, enabled, riskPerTrade = null, maxTradeAmount = null) => {
  try {
    const user = await getUserByTelegramId(telegramId);
    
    if (!user) {
      throw new Error(`User with Telegram ID ${telegramId} not found`);
    }
    
    const updateData = { auto_trade_enabled: enabled };
    
    if (riskPerTrade !== null) {
      updateData.risk_per_trade = riskPerTrade;
    }
    
    if (maxTradeAmount !== null) {
      updateData.max_trade_amount = maxTradeAmount;
    }
    
    await user.update(updateData);
    
    logUserAction(telegramId, 'auto_trade_settings_updated', { 
      enabled, 
      risk_per_trade: riskPerTrade, 
      max_trade_amount: maxTradeAmount 
    });
    
    return user;
  } catch (error) {
    logError(telegramId, 'updateAutoTradeSettings', error);
    throw error;
  }
};

/**
 * Update user's channel membership status
 * @param {string} telegramId - User's Telegram ID
 * @param {string} channelType - Channel type (premium/vip)
 * @param {boolean} isMember - Whether user is a member
 * @returns {Promise<Object>} - Updated user object
 */
const updateChannelMembership = async (telegramId, channelType, isMember) => {
  try {
    const user = await getUserByTelegramId(telegramId);
    
    if (!user) {
      throw new Error(`User with Telegram ID ${telegramId} not found`);
    }
    
    const updateData = {};
    
    if (channelType === 'premium') {
      updateData.in_premium_channel = isMember;
    } else if (channelType === 'vip') {
      updateData.in_vip_channel = isMember;
    }
    
    await user.update(updateData);
    
    logUserAction(telegramId, 'channel_membership_updated', { 
      channel_type: channelType, 
      is_member: isMember 
    });
    
    return user;
  } catch (error) {
    logError(telegramId, 'updateChannelMembership', error);
    throw error;
  }
};

/**
 * Update user's follow-up sequence status
 * @param {string} telegramId - User's Telegram ID
 * @param {boolean} active - Whether follow-up sequence is active
 * @param {number} day - Current day in sequence (optional)
 * @returns {Promise<Object>} - Updated user object
 */
const updateFollowUpStatus = async (telegramId, active, day = null) => {
  try {
    const user = await getUserByTelegramId(telegramId);
    
    if (!user) {
      throw new Error(`User with Telegram ID ${telegramId} not found`);
    }
    
    const updateData = { follow_up_sequence_active: active };
    
    if (day !== null) {
      updateData.follow_up_sequence_day = day;
    }
    
    await user.update(updateData);
    
    logUserAction(telegramId, 'follow_up_status_updated', { 
      active, 
      day 
    });
    
    return user;
  } catch (error) {
    logError(telegramId, 'updateFollowUpStatus', error);
    throw error;
  }
};

/**
 * Get all users with active follow-up sequences
 * @returns {Promise<Array>} - Array of user objects
 */
const getUsersWithActiveFollowUp = async () => {
  try {
    const users = await User.findAll({
      where: { 
        follow_up_sequence_active: true,
        verification_status: 'pending'
      }
    });
    
    return users;
  } catch (error) {
    logError('system', 'getUsersWithActiveFollowUp', error);
    throw error;
  }
};

/**
 * Get all verified users
 * @param {string} tier - Subscription tier (optional)
 * @returns {Promise<Array>} - Array of user objects
 */
const getVerifiedUsers = async (tier = null) => {
  try {
    const whereClause = { verification_status: 'verified' };
    
    if (tier) {
      whereClause.subscription_tier = tier;
    }
    
    const users = await User.findAll({ where: whereClause });
    
    return users;
  } catch (error) {
    logError('system', 'getVerifiedUsers', error);
    throw error;
  }
};

/**
 * Check if user has required subscription tier
 * @param {string} telegramId - User's Telegram ID
 * @param {Array<string>} requiredTiers - Array of allowed subscription tiers
 * @returns {Promise<boolean>} - True if user has required tier, false otherwise
 */
const hasRequiredSubscriptionTier = async (telegramId, requiredTiers) => {
  try {
    const user = await getUserByTelegramId(telegramId);
    
    if (!user) {
      return false;
    }
    
    return requiredTiers.includes(user.subscription_tier);
  } catch (error) {
    logger.error(`Error checking subscription tier for user ${telegramId}:`, error);
    return false;
  }
};

module.exports = {
  createOrUpdateUser,
  getUserByTelegramId,
  updateBrokerUid,
  updateVerificationStatus,
  updateAutoTradeSettings,
  updateChannelMembership,
  updateFollowUpStatus,
  getUsersWithActiveFollowUp,
  getVerifiedUsers,
  hasRequiredSubscriptionTier
};