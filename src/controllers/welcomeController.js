const { bot, isAdmin } = require('../config/bot');
const userService = require('../services/userService');
const followUpService = require('../services/followUpService');
const { createReplyKeyboard, createInlineKeyboard, removeKeyboard } = require('../utils/keyboard');
const { getWelcomeMessage, getRegistrationInstructions } = require('../utils/messageTemplates');
const { logger, logUserAction, logError } = require('../utils/logger');

/**
 * Handle /start command
 * @param {Object} msg - Telegram message object
 * @returns {Promise<void>}
 */
const handleStart = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    const firstName = msg.from.first_name || '';
    const lastName = msg.from.last_name || '';
    const username = msg.from.username || null;
    
    // Create or update user
    const user = await userService.createOrUpdateUser({
      telegram_id: telegramId,
      username,
      first_name: firstName,
      last_name: lastName,
      chat_id: chatId.toString(),
      language_code: msg.from.language_code || 'en'
    });
    
    logUserAction(telegramId, 'command_start');
    
    // Check if user is already verified
    if (user.verification_status === 'verified') {
      await bot.sendMessage(
        chatId,
        `Welcome back, ${firstName}! You are already verified with OPTRIXTRADES.\n\nYour subscription tier: *${user.subscription_tier.toUpperCase()}*\n\nUse the menu to access trading signals, support, and more.`,
        {
          parse_mode: 'Markdown',
          reply_markup: createReplyKeyboard([
            ['📊 Trading Signals', '💰 My Account'],
            ['🔔 Notifications', '📱 Support']
          ]).reply_markup
        }
      );
      return;
    }
    
    // Check if user has a pending verification
    if (user.verification_status === 'pending') {
      await bot.sendMessage(
        chatId,
        `Welcome back, ${firstName}! Your verification is currently pending review by our team.\n\nWe'll notify you once your verification is processed.`,
        {
          parse_mode: 'Markdown',
          reply_markup: createReplyKeyboard([
            ['📋 Verification Status', '📱 Support']
          ]).reply_markup
        }
      );
      return;
    }
    
    // Send welcome message for new or unverified users
    const welcomeMessage = getWelcomeMessage(firstName);
    
    await bot.sendMessage(
      chatId,
      welcomeMessage,
      {
        parse_mode: 'Markdown',
        reply_markup: createInlineKeyboard([[
          { text: '🚀 Get Started', callback_data: 'register' }
        ]]).reply_markup
      }
    );
    
    // Start follow-up sequence if not already active
    if (!user.follow_up_sequence_active && user.verification_status !== 'verified') {
      await followUpService.startFollowUpSequence(telegramId);
    }
  } catch (error) {
    logError(msg.from.id.toString(), 'handleStart', error);
    
    // Send generic error message
    await bot.sendMessage(
      msg.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
};

/**
 * Handle registration callback
 * @param {Object} callbackQuery - Telegram callback query
 * @returns {Promise<void>}
 */
const handleRegister = async (callbackQuery) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    const firstName = callbackQuery.from.first_name || '';
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    logUserAction(telegramId, 'callback_register');
    
    // Get registration instructions
    const registrationInstructions = getRegistrationInstructions({
      first_name: firstName,
      affiliate_link: process.env.BROKER_AFFILIATE_LINK || 'https://broker.example.com/register'
    });
    
    // Send registration instructions
    await bot.sendMessage(
      chatId,
      registrationInstructions,
      {
        parse_mode: 'Markdown',
        reply_markup: createInlineKeyboard([[
          { text: '🔗 Register with Broker', url: process.env.BROKER_AFFILIATE_LINK || 'https://broker.example.com/register' }
        ], [
          { text: '✅ I\'ve Registered', callback_data: 'verify' }
        ]]).reply_markup
      }
    );
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleRegister', error);
    
    // Send generic error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
};

/**
 * Handle help command
 * @param {Object} msg - Telegram message object
 * @returns {Promise<void>}
 */
const handleHelp = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    
    logUserAction(telegramId, 'command_help');
    
    // Get user to determine appropriate help message
    const user = await userService.getUserByTelegramId(telegramId);
    
    let helpMessage;
    let keyboard;
    
    if (user && user.verification_status === 'verified') {
      // Help message for verified users
      helpMessage = `*OPTRIXTRADES Help*\n\n` +
        `Here's how to use our trading bot:\n\n` +
        `📊 *Trading Signals* - View active and recent trading signals\n` +
        `💰 *My Account* - View your account details and trading history\n` +
        `🔔 *Notifications* - Manage your notification preferences\n` +
        `📱 *Support* - Contact our support team\n\n` +
        `*Commands*:\n` +
        `/start - Restart the bot\n` +
        `/help - Show this help message\n` +
        `/account - View your account details\n` +
        `/signals - View trading signals\n` +
        `/support - Contact support\n\n` +
        `Your current subscription tier: *${user.subscription_tier.toUpperCase()}*`;
      
      keyboard = createReplyKeyboard([
        ['📊 Trading Signals', '💰 My Account'],
        ['🔔 Notifications', '📱 Support']
      ]);
    } else if (user && user.verification_status === 'pending') {
      // Help message for users with pending verification
      helpMessage = `*OPTRIXTRADES Help*\n\n` +
        `Your verification is currently pending review by our team.\n\n` +
        `*Commands*:\n` +
        `/start - Restart the bot\n` +
        `/help - Show this help message\n` +
        `/status - Check your verification status\n` +
        `/support - Contact support\n\n` +
        `We'll notify you once your verification is processed.`;
      
      keyboard = createReplyKeyboard([
        ['📋 Verification Status', '📱 Support']
      ]);
    } else {
      // Help message for new or unverified users
      helpMessage = `*OPTRIXTRADES Help*\n\n` +
        `Welcome to OPTRIXTRADES! Here's how to get started:\n\n` +
        `1. Register with our partner broker using our affiliate link\n` +
        `2. Verify your account by submitting your broker UID and deposit screenshot\n` +
        `3. Once verified, you'll gain access to our premium trading signals\n\n` +
        `*Commands*:\n` +
        `/start - Restart the bot\n` +
        `/help - Show this help message\n` +
        `/register - Start registration process\n` +
        `/verify - Start verification process\n` +
        `/support - Contact support`;
      
      keyboard = createInlineKeyboard([[
        { text: '🚀 Get Started', callback_data: 'register' }
      ]]);
    }
    
    await bot.sendMessage(
      chatId,
      helpMessage,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard.reply_markup
      }
    );
  } catch (error) {
    logError(msg.from.id.toString(), 'handleHelp', error);
    
    // Send generic error message
    await bot.sendMessage(
      msg.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
};

module.exports = {
  handleStart,
  handleRegister,
  handleHelp
};