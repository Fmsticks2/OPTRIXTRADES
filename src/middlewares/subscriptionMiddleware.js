/**
 * Subscription Middleware for OPTRIXTRADES
 * Provides middleware functions to check user subscription tier and restrict access to features
 */

const userService = require('../services/userService');
const { bot } = require('../config/bot');
const { logger, logError } = require('../utils/logger');
const { createInlineKeyboard } = require('../utils/keyboard');

/**
 * Check if user has required subscription tier
 * @param {Array<string>} requiredTiers - Array of allowed subscription tiers
 * @returns {Function} - Middleware function
 */
const requireSubscriptionTier = (requiredTiers) => {
  return async (handler) => {
    return async (msg, ...args) => {
      try {
        const telegramId = msg.from.id.toString();
        const chatId = msg.chat.id;
        
        // Get user
        const user = await userService.getUserByTelegramId(telegramId);
        
        if (!user) {
          await bot.sendMessage(
            chatId,
            'User not found. Please restart the bot with /start.'
          );
          return;
        }
        
        // Check if user's subscription tier is in the required tiers
        if (!requiredTiers.includes(user.subscription_tier)) {
          const tierNames = requiredTiers.map(tier => {
            switch(tier) {
              case 'basic': return 'Basic';
              case 'premium': return 'Premium';
              case 'vip': return 'VIP';
              default: return tier.charAt(0).toUpperCase() + tier.slice(1);
            }
          }).join(' or ');
          
          await bot.sendMessage(
            chatId,
            `⚠️ This feature is only available for ${tierNames} subscribers.\n\nPlease upgrade your subscription to access this feature.`,
            {
              reply_markup: createInlineKeyboard([[
                { text: '💰 Upgrade Subscription', callback_data: 'upgrade_subscription' }
              ]]).reply_markup
            }
          );
          return;
        }
        
        // If user has required tier, proceed with handler
        return handler(msg, ...args);
      } catch (error) {
        logError(msg.from.id.toString(), 'requireSubscriptionTier', error);
        logger.error('Error in subscription tier middleware:', error);
        await bot.sendMessage(
          msg.chat.id,
          'An error occurred while checking your subscription. Please try again later.'
        );
      }
    };
  };
};

/**
 * Check if user is verified
 * @returns {Function} - Middleware function
 */
const requireVerification = () => {
  return async (handler) => {
    return async (msg, ...args) => {
      try {
        const telegramId = msg.from.id.toString();
        const chatId = msg.chat.id;
        
        // Get user
        const user = await userService.getUserByTelegramId(telegramId);
        
        if (!user) {
          await bot.sendMessage(
            chatId,
            'User not found. Please restart the bot with /start.'
          );
          return;
        }
        
        // Check if user is verified
        if (user.verification_status !== 'verified') {
          await bot.sendMessage(
            chatId,
            `You need to be verified to access this feature.\n\nPlease complete the verification process first.`,
            {
              reply_markup: createInlineKeyboard([[
                { text: '✅ Verify Now', callback_data: 'verify' }
              ]]).reply_markup
            }
          );
          return;
        }
        
        // If user is verified, proceed with handler
        return handler(msg, ...args);
      } catch (error) {
        logError(msg.from.id.toString(), 'requireVerification', error);
        logger.error('Error in verification middleware:', error);
        await bot.sendMessage(
          msg.chat.id,
          'An error occurred while checking your verification status. Please try again later.'
        );
      }
    };
  };
};

module.exports = {
  requireSubscriptionTier,
  requireVerification
};