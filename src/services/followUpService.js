const { FollowUp, User } = require('../models');
const { bot } = require('../config/bot');
const { getFollowUpTemplate } = require('../utils/messageTemplates');
const { createInlineKeyboard } = require('../utils/keyboard');
const { logger, logUserAction, logError } = require('../utils/logger');
const userService = require('./userService');

/**
 * Schedule follow-up message
 * @param {string} telegramId - User's Telegram ID
 * @param {number} sequenceDay - Day in the sequence (1-10)
 * @param {number} delayHours - Delay in hours
 * @returns {Promise<Object>} - FollowUp object
 */
const scheduleFollowUp = async (telegramId, sequenceDay, delayHours) => {
  try {
    const user = await userService.getUserByTelegramId(telegramId);
    
    if (!user) {
      throw new Error(`User with Telegram ID ${telegramId} not found`);
    }
    
    // Calculate scheduled time
    const scheduledTime = new Date();
    scheduledTime.setHours(scheduledTime.getHours() + delayHours);
    
    // Get message type from template
    const template = getFollowUpTemplate(sequenceDay, {
      first_name: user.first_name
    });
    
    // Create follow-up record
    const followUp = await FollowUp.create({
      user_id: user.id,
      sequence_day: sequenceDay,
      scheduled_time: scheduledTime,
      sent: false,
      message_type: template.type
    });
    
    // Update user's follow-up sequence day
    await userService.updateFollowUpStatus(telegramId, true, sequenceDay);
    
    logUserAction(telegramId, 'follow_up_scheduled', { 
      sequence_day: sequenceDay,
      scheduled_time: scheduledTime,
      follow_up_id: followUp.id 
    });
    
    return followUp;
  } catch (error) {
    logError(telegramId, 'scheduleFollowUp', error);
    throw error;
  }
};

/**
 * Send follow-up message
 * @param {number} followUpId - FollowUp ID
 * @returns {Promise<boolean>} - Success status
 */
const sendFollowUp = async (followUpId) => {
  try {
    const followUp = await FollowUp.findByPk(followUpId, {
      include: [{ model: User }]
    });
    
    if (!followUp) {
      throw new Error(`FollowUp with ID ${followUpId} not found`);
    }
    
    // Check if already sent
    if (followUp.sent) {
      logger.info(`FollowUp ${followUpId} already sent, skipping`);
      return true;
    }
    
    const user = followUp.User;
    
    // Check if user is verified or follow-up sequence is inactive
    if (user.verification_status === 'verified' || !user.follow_up_sequence_active) {
      logger.info(`Skipping follow-up ${followUpId} for user ${user.telegram_id} (verified or inactive)`);
      await followUp.update({ sent: true, sent_time: new Date() });
      return true;
    }
    
    // Get template for this day
    const template = getFollowUpTemplate(followUp.sequence_day, {
      first_name: user.first_name
    });
    
    // Create keyboard from template buttons
    const keyboard = createInlineKeyboard(template.buttons);
    
    // Send message
    const sentMessage = await bot.sendMessage(
      user.telegram_id,
      template.text,
      keyboard
    );
    
    // Update follow-up record
    await followUp.update({
      sent: true,
      sent_time: new Date(),
      message_id: sentMessage.message_id.toString()
    });
    
    logUserAction(user.telegram_id, 'follow_up_sent', { 
      sequence_day: followUp.sequence_day,
      message_type: followUp.message_type,
      follow_up_id: followUp.id 
    });
    
    // Schedule next follow-up if not the last day
    if (followUp.sequence_day < 10) {
      const nextDay = followUp.sequence_day + 1;
      const delayHours = getDelayHoursForDay(nextDay);
      await scheduleFollowUp(user.telegram_id, nextDay, delayHours);
    }
    
    return true;
  } catch (error) {
    logError('system', 'sendFollowUp', error);
    console.error(`Error sending follow-up ${followUpId}:`, error);
    return false;
  }
};

/**
 * Process pending follow-ups
 * @returns {Promise<number>} - Number of follow-ups processed
 */
const processPendingFollowUps = async () => {
  try {
    // Get all pending follow-ups that are due
    const pendingFollowUps = await FollowUp.findAll({
      where: {
        sent: false,
        scheduled_time: { $lte: new Date() }
      },
      include: [{ model: User }],
      order: [['scheduled_time', 'ASC']]
    });
    
    logger.info(`Processing ${pendingFollowUps.length} pending follow-ups`);
    
    let sentCount = 0;
    
    // Process each follow-up
    for (const followUp of pendingFollowUps) {
      const success = await sendFollowUp(followUp.id);
      if (success) sentCount++;
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    logger.info(`Processed ${sentCount} follow-ups successfully`);
    return sentCount;
  } catch (error) {
    logError('system', 'processPendingFollowUps', error);
    throw error;
  }
};

/**
 * Record user response to follow-up
 * @param {string} telegramId - User's Telegram ID
 * @param {string} response - User's response
 * @returns {Promise<boolean>} - Success status
 */
const recordUserResponse = async (telegramId, response) => {
  try {
    const user = await userService.getUserByTelegramId(telegramId);
    
    if (!user) {
      throw new Error(`User with Telegram ID ${telegramId} not found`);
    }
    
    // Find the most recent follow-up
    const followUp = await FollowUp.findOne({
      where: { user_id: user.id, sent: true },
      order: [['sent_time', 'DESC']]
    });
    
    if (!followUp) {
      logger.info(`No follow-up found for user ${telegramId}`);
      return false;
    }
    
    // Record response
    await followUp.update({
      user_response: response,
      user_response_time: new Date()
    });
    
    logUserAction(telegramId, 'follow_up_response_recorded', { 
      follow_up_id: followUp.id,
      response 
    });
    
    return true;
  } catch (error) {
    logError(telegramId, 'recordUserResponse', error);
    return false;
  }
};

/**
 * Stop follow-up sequence for user
 * @param {string} telegramId - User's Telegram ID
 * @returns {Promise<boolean>} - Success status
 */
const stopFollowUpSequence = async (telegramId) => {
  try {
    await userService.updateFollowUpStatus(telegramId, false);
    
    logUserAction(telegramId, 'follow_up_sequence_stopped');
    
    // Send confirmation message
    await bot.sendMessage(
      telegramId,
      "You've been removed from our follow-up messages. If you change your mind and want to activate your premium access in the future, just send /start to begin again."
    );
    
    return true;
  } catch (error) {
    logError(telegramId, 'stopFollowUpSequence', error);
    return false;
  }
};

/**
 * Start follow-up sequence for user
 * @param {string} telegramId - User's Telegram ID
 * @returns {Promise<boolean>} - Success status
 */
const startFollowUpSequence = async (telegramId) => {
  try {
    const user = await userService.getUserByTelegramId(telegramId);
    
    if (!user) {
      throw new Error(`User with Telegram ID ${telegramId} not found`);
    }
    
    // Only start if user is not verified
    if (user.verification_status === 'verified') {
      logger.info(`User ${telegramId} is already verified, not starting follow-up sequence`);
      return false;
    }
    
    // Reset follow-up status
    await userService.updateFollowUpStatus(telegramId, true, 0);
    
    // Schedule first follow-up (6 hours delay)
    await scheduleFollowUp(telegramId, 1, 6);
    
    logUserAction(telegramId, 'follow_up_sequence_started');
    
    return true;
  } catch (error) {
    logError(telegramId, 'startFollowUpSequence', error);
    return false;
  }
};

/**
 * Get delay hours for each day in the sequence
 * @param {number} day - Day in the sequence (1-10)
 * @returns {number} - Delay in hours
 */
const getDelayHoursForDay = (day) => {
  const delays = {
    1: 6,    // Day 1: 6 hours
    2: 23,   // Day 2: 23 hours
    3: 22,   // Day 3: 22 hours
    4: 24,   // Day 4: 24 hours
    5: 24,   // Day 5: 24 hours
    6: 24,   // Day 6: 24 hours
    7: 24,   // Day 7: 24 hours
    8: 24,   // Day 8: 24 hours
    9: 24,   // Day 9: 24 hours
    10: 24   // Day 10: 24 hours
  };
  
  return delays[day] || 24; // Default to 24 hours
};

module.exports = {
  scheduleFollowUp,
  sendFollowUp,
  processPendingFollowUps,
  recordUserResponse,
  stopFollowUpSequence,
  startFollowUpSequence
};