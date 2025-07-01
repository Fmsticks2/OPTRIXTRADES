const { Trading, User } = require('../models');
const { bot } = require('../config/bot');
const { createInlineKeyboard } = require('../utils/keyboard');
const { logger, logUserAction, logError, logAdminAction } = require('../utils/logger');
const userService = require('./userService');

/**
 * Create a new trading signal
 * @param {Object} signalData - Signal data
 * @param {string} adminTelegramId - Admin's Telegram ID
 * @returns {Promise<Object>} - Created signal
 */
const createSignal = async (signalData, adminTelegramId) => {
  try {
    // Validate signal data
    if (!signalData.asset || !signalData.trade_type || !signalData.entry_price) {
      throw new Error('Missing required signal data');
    }
    
    // Create signal record
    const signal = {
      user_id: null, // System signal
      signal_id: generateSignalId(),
      trade_type: signalData.trade_type,
      asset: signalData.asset,
      entry_price: signalData.entry_price,
      exit_price: null,
      quantity: null,
      risk_percentage: signalData.risk_percentage || 1,
      trade_amount: null,
      profit_loss: null,
      tier: signalData.tier || 'premium', // Default to premium if not specified
      status: 'active',
      entry_time: new Date(),
      exit_time: null,
      auto_traded: false,
      notes: signalData.notes || ''
    };
    
    const createdSignal = await Trading.create(signal);
    
    logAdminAction(adminTelegramId, 'signal_created', { 
      signal_id: createdSignal.signal_id,
      asset: createdSignal.asset,
      trade_type: createdSignal.trade_type
    });
    
    // Broadcast signal to verified users
    await broadcastSignal(createdSignal);
    
    // Process auto-trading for eligible users
    await processAutoTrading(createdSignal);
    
    return createdSignal;
  } catch (error) {
    logError(adminTelegramId, 'createSignal', error);
    throw error;
  }
};

/**
 * Close a trading signal
 * @param {string} signalId - Signal ID
 * @param {Object} closeData - Close data
 * @param {string} adminTelegramId - Admin's Telegram ID
 * @returns {Promise<Object>} - Updated signal
 */
const closeSignal = async (signalId, closeData, adminTelegramId) => {
  try {
    const signal = await Trading.findOne({
      where: { signal_id: signalId, status: 'active' }
    });
    
    if (!signal) {
      throw new Error(`Active signal with ID ${signalId} not found`);
    }
    
    // Update signal
    const updatedSignal = await signal.update({
      exit_price: closeData.exit_price,
      status: 'closed',
      exit_time: new Date(),
      profit_loss: calculateProfitLoss(
        signal.trade_type,
        signal.entry_price,
        closeData.exit_price
      ),
      notes: signal.notes + '\n' + (closeData.notes || '')
    });
    
    logAdminAction(adminTelegramId, 'signal_closed', { 
      signal_id: updatedSignal.signal_id,
      profit_loss: updatedSignal.profit_loss
    });
    
    // Broadcast signal close to verified users
    await broadcastSignalClose(updatedSignal);
    
    return updatedSignal;
  } catch (error) {
    logError(adminTelegramId, 'closeSignal', error);
    throw error;
  }
};

/**
 * Broadcast signal to verified users based on their subscription tier
 * @param {Object} signal - Signal object
 * @returns {Promise<number>} - Number of users notified
 */
const broadcastSignal = async (signal) => {
  try {
    // Get all verified users
    const users = await userService.getVerifiedUsers();
    
    // Filter users based on signal tier and user subscription tier
    let eligibleUsers = [];
    
    if (signal.tier === 'basic') {
      // Basic signals go to all verified users with basic tier or higher
      eligibleUsers = users.filter(user => 
        ['basic', 'premium', 'vip'].includes(user.subscription_tier));
    } else if (signal.tier === 'premium') {
      // Premium signals go to premium and VIP users
      eligibleUsers = users.filter(user => 
        ['premium', 'vip'].includes(user.subscription_tier));
    } else if (signal.tier === 'vip') {
      // VIP signals only go to VIP users
      eligibleUsers = users.filter(user => 
        user.subscription_tier === 'vip');
    }
    
    logger.info(`Broadcasting signal ${signal.signal_id} to ${eligibleUsers.length} eligible users`);
    
    let notifiedCount = 0;
    
    for (const user of eligibleUsers) {
      try {
        // Create signal message
        const message = formatSignalMessage(signal);
        
        // Create keyboard with auto-trade button if eligible
        const keyboard = user.subscription_tier === 'vip' ? 
          createInlineKeyboard([[
            { text: '🤖 Auto-Trade This Signal', callback_data: `auto_trade:${signal.signal_id}` }
          ]]) : {};
        
        // Send message
        await bot.sendMessage(user.telegram_id, message, keyboard);
        notifiedCount++;
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        logError(user.telegram_id, 'broadcastSignal', err);
      }
    }
    
    logger.info(`Successfully notified ${notifiedCount} users about signal ${signal.signal_id}`);
    return notifiedCount;
  } catch (error) {
    logError('system', 'broadcastSignal', error);
    throw error;
  }
};

/**
 * Broadcast signal close to verified users based on their subscription tier
 * @param {Object} signal - Signal object
 * @returns {Promise<number>} - Number of users notified
 */
const broadcastSignalClose = async (signal) => {
  try {
    // Get all verified users
    const users = await userService.getVerifiedUsers();
    
    // Filter users based on signal tier and user subscription tier
    let eligibleUsers = [];
    
    if (signal.tier === 'basic') {
      // Basic signals go to all verified users with basic tier or higher
      eligibleUsers = users.filter(user => 
        ['basic', 'premium', 'vip'].includes(user.subscription_tier));
    } else if (signal.tier === 'premium') {
      // Premium signals go to premium and VIP users
      eligibleUsers = users.filter(user => 
        ['premium', 'vip'].includes(user.subscription_tier));
    } else if (signal.tier === 'vip') {
      // VIP signals only go to VIP users
      eligibleUsers = users.filter(user => 
        user.subscription_tier === 'vip');
    }
    
    logger.info(`Broadcasting signal close ${signal.signal_id} to ${eligibleUsers.length} eligible users`);
    
    let notifiedCount = 0;
    
    for (const user of eligibleUsers) {
      try {
        // Create signal close message
        const message = formatSignalCloseMessage(signal);
        
        // Send message
        await bot.sendMessage(user.telegram_id, message);
        notifiedCount++;
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        logError(user.telegram_id, 'broadcastSignalClose', err);
      }
    }
    
    logger.info(`Successfully notified ${notifiedCount} users about signal close ${signal.signal_id}`);
    return notifiedCount;
  } catch (error) {
    logError('system', 'broadcastSignalClose', error);
    throw error;
  }
};

/**
 * Process auto-trading for eligible users
 * @param {Object} signal - Signal object
 * @returns {Promise<number>} - Number of auto-trades created
 */
const processAutoTrading = async (signal) => {
  try {
    // Get all VIP users with auto-trading enabled
    const users = await User.findAll({
      where: {
        verification_status: 'verified',
        subscription_tier: 'vip',
        auto_trade_enabled: true
      }
    });
    
    logger.info(`Processing auto-trading for signal ${signal.signal_id} for ${users.length} eligible users`);
    
    let autoTradeCount = 0;
    
    for (const user of users) {
      try {
        // Create user-specific trade record
        const userTrade = await Trading.create({
          user_id: user.id,
          signal_id: signal.signal_id,
          trade_type: signal.trade_type,
          asset: signal.asset,
          entry_price: signal.entry_price,
          exit_price: null,
          quantity: calculateQuantity(user.auto_trade_amount, signal.entry_price),
          risk_percentage: user.auto_trade_risk_percentage || signal.risk_percentage,
          trade_amount: user.auto_trade_amount,
          profit_loss: null,
          status: 'active',
          entry_time: new Date(),
          exit_time: null,
          auto_traded: true,
          notes: `Auto-traded from signal ${signal.signal_id}`
        });
        
        // Notify user about auto-trade
        await bot.sendMessage(
          user.telegram_id,
          `🤖 *AUTO-TRADE EXECUTED*\n\nSignal: ${signal.signal_id}\nAsset: ${signal.asset}\nType: ${signal.trade_type}\nEntry Price: ${signal.entry_price}\nAmount: $${user.auto_trade_amount}\n\nYour trade has been automatically executed based on your settings.`,
          { parse_mode: 'Markdown' }
        );
        
        logUserAction(user.telegram_id, 'auto_trade_executed', { 
          signal_id: signal.signal_id,
          trade_id: userTrade.id,
          amount: user.auto_trade_amount
        });
        
        autoTradeCount++;
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        logError(user.telegram_id, 'processAutoTrading', err);
      }
    }
    
    logger.info(`Successfully created ${autoTradeCount} auto-trades for signal ${signal.signal_id}`);
    return autoTradeCount;
  } catch (error) {
    logError('system', 'processAutoTrading', error);
    throw error;
  }
};

/**
 * Enable auto-trading for user
 * @param {string} telegramId - User's Telegram ID
 * @param {Object} settings - Auto-trade settings
 * @returns {Promise<Object>} - Updated user
 */
const enableAutoTrading = async (telegramId, settings) => {
  try {
    const user = await userService.getUserByTelegramId(telegramId);
    
    if (!user) {
      throw new Error(`User with Telegram ID ${telegramId} not found`);
    }
    
    // Check if user is VIP
    if (user.subscription_tier !== 'vip') {
      throw new Error('Auto-trading is only available for VIP users');
    }
    
    // Update user settings
    const updatedUser = await userService.updateAutoTradeSettings(
      telegramId,
      true,
      settings.amount,
      settings.risk_percentage
    );
    
    logUserAction(telegramId, 'auto_trade_enabled', { 
      amount: settings.amount,
      risk_percentage: settings.risk_percentage
    });
    
    return updatedUser;
  } catch (error) {
    logError(telegramId, 'enableAutoTrading', error);
    throw error;
  }
};

/**
 * Disable auto-trading for user
 * @param {string} telegramId - User's Telegram ID
 * @returns {Promise<Object>} - Updated user
 */
const disableAutoTrading = async (telegramId) => {
  try {
    const updatedUser = await userService.updateAutoTradeSettings(
      telegramId,
      false
    );
    
    logUserAction(telegramId, 'auto_trade_disabled');
    
    return updatedUser;
  } catch (error) {
    logError(telegramId, 'disableAutoTrading', error);
    throw error;
  }
};

/**
 * Get user's trading history
 * @param {string} telegramId - User's Telegram ID
 * @param {number} limit - Limit of records
 * @returns {Promise<Array>} - Trading history
 */
const getUserTradingHistory = async (telegramId, limit = 10) => {
  try {
    const user = await userService.getUserByTelegramId(telegramId);
    
    if (!user) {
      throw new Error(`User with Telegram ID ${telegramId} not found`);
    }
    
    // Get user's trades
    const trades = await Trading.findAll({
      where: { user_id: user.id },
      order: [['entry_time', 'DESC']],
      limit
    });
    
    return trades;
  } catch (error) {
    logError(telegramId, 'getUserTradingHistory', error);
    throw error;
  }
};

/**
 * Get active signals
 * @returns {Promise<Array>} - Active signals
 */
const getActiveSignals = async () => {
  try {
    return await Trading.findAll({
      where: { 
        user_id: null, // System signals
        status: 'active'
      },
      order: [['entry_time', 'DESC']]
    });
  } catch (error) {
    logError('system', 'getActiveSignals', error);
    throw error;
  }
};

/**
 * Get recent closed signals
 * @param {number} limit - Limit of records
 * @returns {Promise<Array>} - Closed signals
 */
const getRecentClosedSignals = async (limit = 10) => {
  try {
    return await Trading.findAll({
      where: { 
        user_id: null, // System signals
        status: 'closed'
      },
      order: [['exit_time', 'DESC']],
      limit
    });
  } catch (error) {
    logError('system', 'getRecentClosedSignals', error);
    throw error;
  }
};

/**
 * Format signal message
 * @param {Object} signal - Signal object
 * @returns {string} - Formatted message
 */
const formatSignalMessage = (signal) => {
  return `🚨 *NEW TRADING SIGNAL* 🚨\n\n` +
    `Signal ID: ${signal.signal_id}\n` +
    `Asset: ${signal.asset}\n` +
    `Type: ${signal.trade_type.toUpperCase()}\n` +
    `Entry Price: ${signal.entry_price}\n` +
    `Recommended Risk: ${signal.risk_percentage}%\n` +
    `Time: ${signal.entry_time.toISOString().replace('T', ' ').substring(0, 19)}\n\n` +
    (signal.notes ? `Notes: ${signal.notes}\n\n` : '') +
    `Trade responsibly and manage your risk!`;
};

/**
 * Format signal close message
 * @param {Object} signal - Signal object
 * @returns {string} - Formatted message
 */
const formatSignalCloseMessage = (signal) => {
  const profitLossText = signal.profit_loss > 0 ? 
    `✅ PROFIT: +${signal.profit_loss.toFixed(2)}%` : 
    `❌ LOSS: ${signal.profit_loss.toFixed(2)}%`;
  
  return `🔔 *SIGNAL CLOSED* 🔔\n\n` +
    `Signal ID: ${signal.signal_id}\n` +
    `Asset: ${signal.asset}\n` +
    `Type: ${signal.trade_type.toUpperCase()}\n` +
    `Entry Price: ${signal.entry_price}\n` +
    `Exit Price: ${signal.exit_price}\n` +
    `${profitLossText}\n` +
    `Duration: ${formatDuration(signal.entry_time, signal.exit_time)}\n\n` +
    (signal.notes ? `Notes: ${signal.notes}\n\n` : '') +
    `Thank you for trading with OPTRIXTRADES!`;
};

/**
 * Generate unique signal ID
 * @returns {string} - Signal ID
 */
const generateSignalId = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `OPT-${year}${month}${day}-${random}`;
};

/**
 * Calculate profit/loss percentage
 * @param {string} tradeType - Trade type (buy/sell)
 * @param {number} entryPrice - Entry price
 * @param {number} exitPrice - Exit price
 * @returns {number} - Profit/loss percentage
 */
const calculateProfitLoss = (tradeType, entryPrice, exitPrice) => {
  const entry = parseFloat(entryPrice);
  const exit = parseFloat(exitPrice);
  
  if (tradeType.toLowerCase() === 'buy') {
    return ((exit - entry) / entry) * 100;
  } else {
    return ((entry - exit) / entry) * 100;
  }
};

/**
 * Calculate quantity based on amount and price
 * @param {number} amount - Trade amount
 * @param {number} price - Asset price
 * @returns {number} - Quantity
 */
const calculateQuantity = (amount, price) => {
  return amount / parseFloat(price);
};

/**
 * Format duration between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {string} - Formatted duration
 */
const formatDuration = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationMs = end - start;
  
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Get signals based on user's subscription tier
 * @param {string} tier - User's subscription tier (free, basic, premium, vip)
 * @returns {Promise<Array>} - Signals available for the tier
 */
const getSignalsByTier = async (tier) => {
  try {
    let query = { user_id: null, status: 'active' };
    
    if (tier === 'free') {
      // Free users don't see any signals
      return [];
    } else if (tier === 'basic') {
      // Basic users only see basic signals
      query.tier = 'basic';
    } else if (tier === 'premium') {
      // Premium users see basic and premium signals
      query.tier = { $in: ['basic', 'premium'] };
    }
    // VIP users see all signals (no additional filter needed)
    
    return await Trading.findAll({
      where: query,
      order: [['entry_time', 'DESC']]
    });
  } catch (error) {
    logError('system', 'getSignalsByTier', error);
    throw error;
  }
};

module.exports = {
  createSignal,
  closeSignal,
  broadcastSignal,
  broadcastSignalClose,
  processAutoTrading,
  enableAutoTrading,
  disableAutoTrading,
  getUserTradingHistory,
  getActiveSignals,
  getRecentClosedSignals,
  formatSignalMessage,
  formatSignalCloseMessage,
  getSignalsByTier
};