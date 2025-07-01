const { Verification, User } = require('../models');
const { uploadTelegramPhoto } = require('../utils/fileUpload');
const { getSignedUrl } = require('../config/s3');
const { bot, premiumChannelId, vipChannelId } = require('../config/bot');
const { logger, logUserAction, logError, logAdminAction } = require('../utils/logger');
const userService = require('./userService');

/**
 * Create a new verification submission
 * @param {string} telegramId - User's Telegram ID
 * @param {string} uidSubmitted - Submitted broker UID
 * @param {string} fileId - Telegram file ID for screenshot
 * @returns {Promise<Object>} - Verification object
 */
const createVerification = async (telegramId, uidSubmitted, fileId) => {
  try {
    // Get user
    const user = await userService.getUserByTelegramId(telegramId);
    
    if (!user) {
      throw new Error(`User with Telegram ID ${telegramId} not found`);
    }
    
    // Upload screenshot to S3
    const uploadResult = await uploadTelegramPhoto(bot, fileId, telegramId);
    
    if (!uploadResult.success) {
      throw new Error(`Failed to upload screenshot: ${uploadResult.error}`);
    }
    
    // Update user's broker UID
    await userService.updateBrokerUid(telegramId, uidSubmitted);
    
    // Create verification submission
    const verification = await Verification.create({
      user_id: user.id,
      uid_submitted: uidSubmitted,
      screenshot_url: uploadResult.url,
      screenshot_s3_key: uploadResult.key,
      submission_date: new Date(),
      admin_reviewed: false,
      approval_status: 'pending'
    });
    
    logUserAction(telegramId, 'verification_submitted', { 
      uid_submitted: uidSubmitted,
      verification_id: verification.id 
    });
    
    // Notify admins about new verification
    notifyAdminsAboutVerification(verification.id, telegramId, uidSubmitted);
    
    return verification;
  } catch (error) {
    logError(telegramId, 'createVerification', error);
    throw error;
  }
};

/**
 * Get verification by ID
 * @param {number} verificationId - Verification ID
 * @returns {Promise<Object>} - Verification object with user data
 */
const getVerificationById = async (verificationId) => {
  try {
    const verification = await Verification.findByPk(verificationId, {
      include: [{ model: User }]
    });
    
    return verification;
  } catch (error) {
    logError('system', 'getVerificationById', error);
    throw error;
  }
};

/**
 * Get all pending verifications
 * @returns {Promise<Array>} - Array of verification objects with user data
 */
const getPendingVerifications = async () => {
  try {
    const verifications = await Verification.findAll({
      where: { approval_status: 'pending' },
      include: [{ model: User }],
      order: [['submission_date', 'ASC']]
    });
    
    return verifications;
  } catch (error) {
    logError('system', 'getPendingVerifications', error);
    throw error;
  }
};

/**
 * Approve verification
 * @param {number} verificationId - Verification ID
 * @param {string} adminId - Admin's Telegram ID
 * @param {number} depositAmount - Confirmed deposit amount
 * @returns {Promise<Object>} - Updated verification object
 */
const approveVerification = async (verificationId, adminId, depositAmount) => {
  try {
    const verification = await getVerificationById(verificationId);
    
    if (!verification) {
      throw new Error(`Verification with ID ${verificationId} not found`);
    }
    
    // Update verification
    await verification.update({
      admin_reviewed: true,
      admin_reviewer_id: adminId,
      review_date: new Date(),
      approval_status: 'approved',
      deposit_amount_confirmed: depositAmount
    });
    
    // Update user verification status and deposit amount
    const user = verification.User;
    await userService.updateVerificationStatus(user.telegram_id, 'verified', depositAmount);
    
    // Add user to appropriate channels based on deposit amount
    await addUserToChannels(user.telegram_id, depositAmount);
    
    logAdminAction(adminId, 'verification_approved', { 
      verification_id: verificationId,
      user_telegram_id: user.telegram_id,
      deposit_amount: depositAmount 
    });
    
    // Notify user about approval
    notifyUserAboutApproval(user.telegram_id, depositAmount);
    
    return verification;
  } catch (error) {
    logError(adminId, 'approveVerification', error);
    throw error;
  }
};

/**
 * Reject verification
 * @param {number} verificationId - Verification ID
 * @param {string} adminId - Admin's Telegram ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>} - Updated verification object
 */
const rejectVerification = async (verificationId, adminId, reason) => {
  try {
    const verification = await getVerificationById(verificationId);
    
    if (!verification) {
      throw new Error(`Verification with ID ${verificationId} not found`);
    }
    
    // Update verification
    await verification.update({
      admin_reviewed: true,
      admin_reviewer_id: adminId,
      review_date: new Date(),
      approval_status: 'rejected',
      rejection_reason: reason
    });
    
    // Update user verification status
    const user = verification.User;
    await userService.updateVerificationStatus(user.telegram_id, 'rejected');
    
    logAdminAction(adminId, 'verification_rejected', { 
      verification_id: verificationId,
      user_telegram_id: user.telegram_id,
      reason 
    });
    
    // Notify user about rejection
    notifyUserAboutRejection(user.telegram_id, reason);
    
    return verification;
  } catch (error) {
    logError(adminId, 'rejectVerification', error);
    throw error;
  }
};

/**
 * Get signed URL for verification screenshot
 * @param {number} verificationId - Verification ID
 * @returns {Promise<string>} - Signed URL
 */
const getVerificationScreenshotUrl = async (verificationId) => {
  try {
    const verification = await getVerificationById(verificationId);
    
    if (!verification) {
      throw new Error(`Verification with ID ${verificationId} not found`);
    }
    
    // Generate signed URL for screenshot
    const signedUrl = getSignedUrl(verification.screenshot_s3_key, 3600); // 1 hour expiry
    
    return signedUrl;
  } catch (error) {
    logError('system', 'getVerificationScreenshotUrl', error);
    throw error;
  }
};

/**
 * Notify admins about new verification
 * @param {number} verificationId - Verification ID
 * @param {string} telegramId - User's Telegram ID
 * @param {string} uidSubmitted - Submitted broker UID
 */
const notifyAdminsAboutVerification = async (verificationId, telegramId, uidSubmitted) => {
  try {
    const { adminIds } = require('../config/bot');
    
    const message = `🔔 New Verification Submission\n\nVerification ID: ${verificationId}\nUser ID: ${telegramId}\nBroker UID: ${uidSubmitted}\nSubmission Time: ${new Date().toISOString()}\n\nUse /admin_verify ${verificationId} to review`;
    
    // Send notification to all admins
    for (const adminId of adminIds) {
      await bot.sendMessage(adminId, message);
    }
    
    logger.info(`Notified admins about verification ${verificationId}`);
  } catch (error) {
    logError('system', 'notifyAdminsAboutVerification', error);
    console.error('Error notifying admins:', error);
  }
};

/**
 * Notify user about verification approval
 * @param {string} telegramId - User's Telegram ID
 * @param {number} depositAmount - Confirmed deposit amount
 */
const notifyUserAboutApproval = async (telegramId, depositAmount) => {
  try {
    let message = `🎉 Congratulations! Your verification has been approved.\n\nYour deposit of $${depositAmount} has been confirmed.`;
    
    // Add tier-specific information
    if (depositAmount >= 500) {
      message += '\n\n🌟 You have been upgraded to VIP tier with access to all premium features including AI Auto-Trading and all bot functions and tools!';
    } else if (depositAmount >= 100) {
      message += '\n\n✅ You have been upgraded to Premium tier with access to enhanced bot functions and the OPTRIX Web AI Portal!';
    } else if (depositAmount >= 20) {
      message += '\n\n✅ You have been upgraded to Basic tier with access to basic bot functions and trading signals!';
    } else {
      message += '\n\n✅ Your account has been verified with Free tier access!';
    }
    
    message += '\n\nThank you for joining OPTRIXTRADES!';
    
    await bot.sendMessage(telegramId, message);
    
    logUserAction(telegramId, 'approval_notification_sent', { deposit_amount: depositAmount });
  } catch (error) {
    logError(telegramId, 'notifyUserAboutApproval', error);
    console.error('Error notifying user about approval:', error);
  }
};

/**
 * Notify user about verification rejection
 * @param {string} telegramId - User's Telegram ID
 * @param {string} reason - Rejection reason
 */
const notifyUserAboutRejection = async (telegramId, reason) => {
  try {
    const message = `❌ Your verification has been rejected.\n\nReason: ${reason}\n\nPlease submit a new verification with the correct information or contact support for assistance.`;
    
    await bot.sendMessage(telegramId, message);
    
    logUserAction(telegramId, 'rejection_notification_sent', { reason });
  } catch (error) {
    logError(telegramId, 'notifyUserAboutRejection', error);
    console.error('Error notifying user about rejection:', error);
  }
};

/**
 * Add user to trading channel based on verification status
 * @param {string} telegramId - User's Telegram ID
 * @param {number} depositAmount - Deposit amount
 */
const addUserToChannels = async (telegramId, depositAmount) => {
  try {
    // All verified users are added to the same channel, but with different bot functionality
    // based on their subscription tier
    if (depositAmount >= 20) {
      try {
        await bot.inviteUserToChannel(premiumChannelId, telegramId);
        await userService.updateChannelMembership(telegramId, 'premium', true);
        logger.info(`Added user ${telegramId} to trading channel`);
      } catch (error) {
        console.error(`Error adding user ${telegramId} to trading channel:`, error);
      }
    }
    
    // For backward compatibility, we'll keep the VIP channel membership flag for users with deposits >= $500
    // This will be used to determine access to VIP bot functions
    if (depositAmount >= 500) {
      try {
        await userService.updateChannelMembership(telegramId, 'vip', true);
        logger.info(`Granted VIP tier access to user ${telegramId}`);
      } catch (error) {
        console.error(`Error granting VIP tier access to user ${telegramId}:`, error);
      }
    }
    
    // Stop follow-up sequence
    await userService.updateFollowUpStatus(telegramId, false);
  } catch (error) {
    logError(telegramId, 'addUserToChannels', error);
    throw error;
  }
};

module.exports = {
  createVerification,
  getVerificationById,
  getPendingVerifications,
  approveVerification,
  rejectVerification,
  getVerificationScreenshotUrl
};