/**
 * Bot Extensions Configuration
 * 
 * This file contains configuration options for the custom bot extensions.
 * It includes message templates, invitation settings, and error messages.
 */

module.exports = {
  /**
   * Invitation message templates for different channel types
   */
  inviteMessages: {
    default: "🎉 You've been invited to join our channel!\n\nClick the link below to join:\n{inviteLink}",
    premium: "🌟 Welcome to our Premium channel!\n\nAccess exclusive trading signals and analysis.\n\nClick the link below to join:\n{inviteLink}",
    vip: "💎 Welcome to our exclusive VIP channel!\n\nEnjoy priority access to our best trading signals and AI auto-trading.\n\nClick the link below to join:\n{inviteLink}"
  },
  
  /**
   * Invitation settings
   */
  invitation: {
    // Maximum number of retry attempts for failed invitations
    maxRetries: 3,
    
    // Delay between retry attempts in milliseconds
    retryDelay: 5000,
    
    // Invite link expiry time in seconds (24 hours)
    inviteLinkExpiry: 86400,
    
    // Rate limiting settings
    rateLimit: {
      // Maximum number of invitations per user per day
      maxInvitationsPerUserPerDay: 5,
      
      // Maximum number of invitations per channel per day
      maxInvitationsPerChannelPerDay: 100
    }
  },
  
  /**
   * Error messages
   */
  errorMessages: {
    // Input validation errors
    invalidChannelId: "Invalid channel ID format.",
    invalidUserId: "Invalid user ID format.",
    
    // Channel errors
    channelNotFound: "Channel not found. Please check the channel ID and try again.",
    channelDeleted: "The channel has been deleted or is unavailable.",
    
    // User errors
    userNotFound: "User not found. Please check the user ID and try again.",
    userBlocked: "The user has blocked the bot or deleted their account.",
    userAlreadyMember: "User is already a member of the channel.",
    
    // Permission errors
    permissionDenied: "The bot does not have sufficient permissions in the channel.",
    botNotAdmin: "The bot must be an administrator in the channel to perform this action.",
    botNotMember: "The bot is not a member of the channel.",
    adminRequired: "This action requires the bot to have admin privileges in the channel.",
    
    // Invitation errors
    inviteLinkFailed: "Failed to create an invite link. Please try again later.",
    messageFailed: "Failed to send the invitation message to the user.",
    inviteRequestSent: "User has already requested to join the channel.",
    
    // Rate limit errors
    rateLimitExceeded: "Rate limit exceeded. Please try again later.",
    telegramRateLimit: "Telegram API rate limit exceeded. Please try again later.",
    floodWait: "Too many requests. Please wait before trying again.",
    
    // Network and server errors
    networkError: "Network error occurred while communicating with Telegram API.",
    serverError: "Telegram server error occurred. Please try again later.",
    timeoutError: "Request to Telegram API timed out. Please try again later.",
    
    // Authentication errors
    invalidBotToken: "Bot token is invalid or has expired.",
    
    // General errors
    maxRetriesExceeded: "Failed to complete the operation after multiple attempts.",
    unknownError: "An unknown error occurred. Please try again later."
  }
};