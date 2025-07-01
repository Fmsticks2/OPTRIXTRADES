/**
 * Bot Extensions - Custom methods for the Telegram Bot API
 * 
 * This file extends the TelegramBot prototype with custom methods
 * that are not available in the official Telegram Bot API.
 */

const TelegramBot = require('node-telegram-bot-api');
const { logger } = require('./logger');

/**
 * Invite a user to a channel
 * 
 * This method creates an invite link for a channel and sends it to the user.
 * Note: The bot must be an administrator in the channel with the appropriate permissions.
 * 
 * @param {string} channelId - The ID of the channel to invite the user to
 * @param {string} userId - The Telegram ID of the user to invite
 * @returns {Promise<Object>} - The result of the operation
 */
TelegramBot.prototype.inviteUserToChannel = async function(channelId, userId) {
  try {
    // Create an invite link for the channel
    const inviteLink = await this.exportChatInviteLink(channelId);
    
    // Send the invite link to the user
    const message = `🎉 You've been invited to join our channel!\n\nClick the link below to join:\n${inviteLink}`;
    
    await this.sendMessage(userId, message);
    
    logger.info(`Sent channel invite to user ${userId} for channel ${channelId}`);
    
    return { success: true, inviteLink };
  } catch (error) {
    logger.error(`Error inviting user ${userId} to channel ${channelId}:`, error);
    throw error;
  }
};

module.exports = TelegramBot;