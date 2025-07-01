/**
 * Bot Extensions - Custom methods for the Telegram Bot API
 * 
 * This file extends the TelegramBot prototype with custom methods
 * that are not available in the official Telegram Bot API.
 */

const TelegramBot = require('node-telegram-bot-api');
const { logger, logUserAction, logError } = require('./logger');
const config = require('../config/botExtensions');
const { trackEvent, checkRateLimit } = require('./analytics');
const { 
  BotError, 
  ChannelError, 
  UserError, 
  PermissionError, 
  RateLimitError, 
  InvitationError,
  mapTelegramError,
  isValidChannelId,
  isValidUserId
} = require('./botErrors');

/**
 * Helper function to delay execution
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Invite a user to a channel
 * 
 * This method creates an invite link for a channel and sends it to the user.
 * Note: The bot must be an administrator in the channel with the appropriate permissions.
 * 
 * @param {string} channelId - The ID of the channel to invite the user to
 * @param {string} userId - The Telegram ID of the user to invite
 * @param {Object} options - Additional options
 * @param {string} options.channelType - Type of channel (default, premium, vip)
 * @param {number} options.expireHours - Hours until the invite link expires
 * @param {number} options.memberLimit - Maximum number of users who can use the link
 * @param {boolean} options.createJoinRequest - Whether the link creates join requests
 * @returns {Promise<Object>} - The result of the operation
 */
TelegramBot.prototype.inviteUserToChannel = async function(channelId, userId, options = {}) {
  const startTime = Date.now();
  const {
    channelType = 'default',
    expireHours = 24,
    memberLimit = null,
    createJoinRequest = false
  } = options;
  
  // Validate inputs
  if (!isValidChannelId(channelId)) {
    const error = new ChannelError(config.errorMessages.invalidChannelId, 'INVALID_CHANNEL_ID', { channelId });
    logError(userId, 'inviteUserToChannel', error);
    throw error;
  }
  
  if (!isValidUserId(userId)) {
    const error = new UserError(config.errorMessages.invalidUserId, 'INVALID_USER_ID', { userId });
    logError(userId, 'inviteUserToChannel', error);
    throw error;
  }
  
  // Check rate limits
  const userRateLimited = await checkRateLimit(
    'channel_invitation_user',
    userId,
    config.invitation.rateLimit.maxInvitationsPerUserPerDay,
    86400 // 24 hours
  );
  
  if (!userRateLimited) {
    const error = new RateLimitError(
      config.errorMessages.rateLimitExceeded,
      'USER_RATE_LIMIT_EXCEEDED',
      { userId, channelId }
    );
    logError(userId, 'inviteUserToChannel', error);
    throw error;
  }
  
  const channelRateLimited = await checkRateLimit(
    'channel_invitation_channel',
    channelId,
    config.invitation.rateLimit.maxInvitationsPerChannelPerDay,
    86400 // 24 hours
  );
  
  if (!channelRateLimited) {
    const error = new RateLimitError(
      config.errorMessages.rateLimitExceeded,
      'CHANNEL_RATE_LIMIT_EXCEEDED',
      { userId, channelId }
    );
    logError(userId, 'inviteUserToChannel', error);
    throw error;
  }
  
  // Track invitation attempt
  trackEvent('channel_invitation_attempt', {
    userId,
    channelId,
    channelType,
    timestamp: Date.now()
  });
  
  let attempts = 0;
  let lastError = null;
  
  while (attempts < config.invitation.maxRetries) {
    try {
      // If not the first attempt, delay before retrying
      if (attempts > 0) {
        await delay(config.invitation.retryDelay);
        logger.info(`Retrying invitation for user ${userId} to channel ${channelId} (attempt ${attempts + 1})`);
      }
      
      attempts++;
      
      // Create an invite link for the channel with options
      let inviteLink;
      try {
        // Try to create a new invite link with options
        const inviteLinkObj = await this.createChatInviteLink(channelId, {
          name: `Invite for user ${userId}`,
          expire_date: Math.floor(Date.now()/1000) + (expireHours * 3600),
          member_limit: memberLimit,
          creates_join_request: createJoinRequest
        });
        inviteLink = inviteLinkObj.invite_link;
      } catch (createLinkError) {
        // Fallback to exporting existing invite link if creation fails
        logger.warn(`Failed to create invite link, falling back to export: ${createLinkError.message}`);
        inviteLink = await this.exportChatInviteLink(channelId);
      }
      
      // Get the appropriate message template
      const messageTemplate = config.inviteMessages[channelType] || config.inviteMessages.default;
      
      // Replace placeholders in the template
      const message = messageTemplate.replace('{inviteLink}', inviteLink);
      
      // Send the invite link to the user
      await this.sendMessage(userId, message);
      
      // Log success
      logger.info(`Sent channel invite to user ${userId} for channel ${channelId}`);
      logUserAction(userId, 'channel_invitation_sent', { channelId, channelType });
      
      // Track successful invitation
      trackEvent('channel_invitation', {
        status: 'success',
        userId,
        channelId,
        channelType,
        responseTime: Date.now() - startTime
      });
      
      // Store response time for analytics
      const responseTime = Date.now() - startTime;
      require('../config/redis').redis.lpush('channel_invitation:response_times', responseTime);
      
      return { 
        success: true, 
        inviteLink,
        attempts,
        responseTime
      };
    } catch (error) {
      lastError = error;
      
      // Map Telegram API errors to custom error types
      const mappedError = mapTelegramError(error, { userId, channelId, channelType });
      
      // Log the error
      logError(userId, 'inviteUserToChannel', mappedError);
      
      // If this is a non-retryable error, break immediately
      if (
        mappedError instanceof UserError || 
        mappedError instanceof PermissionError ||
        mappedError instanceof ChannelError
      ) {
        break;
      }
    }
  }
  
  // If we've exhausted all retry attempts, track the failure
  trackEvent('channel_invitation', {
    status: 'error',
    userId,
    channelId,
    channelType,
    errorCode: lastError?.code || 'UNKNOWN_ERROR',
    errorMessage: lastError?.message || 'Unknown error',
    attempts,
    responseTime: Date.now() - startTime
  });
  
  // Throw the last error
  if (lastError) {
    throw lastError;
  } else {
    throw new InvitationError(
      'Failed to invite user to channel after multiple attempts',
      'MAX_RETRIES_EXCEEDED',
      { userId, channelId, attempts }
    );
  }
};

module.exports = TelegramBot;