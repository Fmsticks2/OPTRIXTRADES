const { bot, isAdmin } = require('../config/bot');
const userService = require('../services/userService');
const tradingService = require('../services/tradingService');
const { createInlineKeyboard, createReplyKeyboard } = require('../utils/keyboard');
const { logger, logUserAction, logAdminAction, logError } = require('../utils/logger');
const { requireSubscriptionTier, requireVerification } = require('../middlewares/subscriptionMiddleware');

/**
 * Handle trading signals command
 * @param {Object} msg - Telegram message object
 * @returns {Promise<void>}
 */
const handleTradingSignals = async (msg) => {
  return (requireVerification()(async (msg) => {
    try {
      const chatId = msg.chat.id;
      const telegramId = msg.from.id.toString();
      
      logUserAction(telegramId, 'command_trading_signals');
      
      // Get user
      const user = await userService.getUserByTelegramId(telegramId);
    
    // Get active signals
    const activeSignals = await tradingService.getActiveSignals();
    
    // Get recent closed signals
    const recentClosedSignals = await tradingService.getRecentClosedSignals(5);
    
    // Format message
    let message = `*OPTRIXTRADES Trading Signals*\n\n`;
    
    if (activeSignals.length > 0) {
      message += `*🔴 ACTIVE SIGNALS (${activeSignals.length})*\n\n`;
      
      for (const signal of activeSignals) {
        message += `ID: ${signal.signal_id}\n` +
          `Asset: ${signal.asset}\n` +
          `Type: ${signal.trade_type.toUpperCase()}\n` +
          `Entry: ${signal.entry_price}\n` +
          `Time: ${new Date(signal.entry_time).toLocaleString()}\n\n`;
      }
    } else {
      message += `*🔴 ACTIVE SIGNALS (0)*\n\nNo active signals at the moment.\n\n`;
    }
    
    if (recentClosedSignals.length > 0) {
      message += `*🟢 RECENT CLOSED SIGNALS*\n\n`;
      
      for (const signal of recentClosedSignals) {
        const profitLossText = signal.profit_loss > 0 ? 
          `✅ PROFIT: +${signal.profit_loss.toFixed(2)}%` : 
          `❌ LOSS: ${signal.profit_loss.toFixed(2)}%`;
        
        message += `ID: ${signal.signal_id}\n` +
          `Asset: ${signal.asset}\n` +
          `Type: ${signal.trade_type.toUpperCase()}\n` +
          `Entry: ${signal.entry_price}\n` +
          `Exit: ${signal.exit_price}\n` +
          `${profitLossText}\n` +
          `Closed: ${new Date(signal.exit_time).toLocaleString()}\n\n`;
      }
    }
    
    // Create keyboard based on user tier
    let keyboard;
    
    if (user.subscription_tier === 'vip') {
      keyboard = createInlineKeyboard([[
        { text: '🤖 Auto-Trading Settings', callback_data: 'auto_trade_settings' }
      ], [
        { text: '📊 My Trading History', callback_data: 'trading_history' }
      ]]).reply_markup;
    } else {
      keyboard = createInlineKeyboard([[
        { text: '📊 My Trading History', callback_data: 'trading_history' }
      ], [
        { text: '⭐ Upgrade to VIP', callback_data: 'upgrade_vip' }
      ]]).reply_markup;
    }
    
    await bot.sendMessage(
      chatId,
      message,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  } catch (error) {
    logError(msg.from.id.toString(), 'handleTradingSignals', error);
    
    // Send generic error message
    await bot.sendMessage(
      msg.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
  }))(msg);
};

/**
 * Handle trading history callback
 * @param {Object} callbackQuery - Telegram callback query
 * @returns {Promise<void>}
 */
const handleTradingHistory = async (callbackQuery) => {
  // Create a message-like object from the callback query for middleware
  const msg = {
    chat: { id: callbackQuery.message.chat.id },
    from: { id: callbackQuery.from.id }
  };
  
  // Use the verification middleware
  return requireVerification()(
    async (msg) => {
      try {
        const chatId = msg.chat.id;
        const telegramId = msg.from.id.toString();
        
        // Acknowledge callback query
        await bot.answerCallbackQuery(callbackQuery.id);
        
        logUserAction(telegramId, 'callback_trading_history');
        
        // Get user
        const user = await userService.getUserByTelegramId(telegramId);
    
    // Get user's trading history
    const tradingHistory = await tradingService.getUserTradingHistory(telegramId, 10);
    
    // Format message
    let message = `*Your Trading History*\n\n`;
    
    if (tradingHistory.length > 0) {
      for (const trade of tradingHistory) {
        const statusText = trade.status === 'active' ? '🔴 ACTIVE' : '🟢 CLOSED';
        const profitLossText = trade.profit_loss ? 
          (trade.profit_loss > 0 ? 
            `✅ PROFIT: +${trade.profit_loss.toFixed(2)}%` : 
            `❌ LOSS: ${trade.profit_loss.toFixed(2)}%`) : 
          '';
        
        message += `ID: ${trade.signal_id}\n` +
          `Asset: ${trade.asset}\n` +
          `Type: ${trade.trade_type.toUpperCase()}\n` +
          `Entry: ${trade.entry_price}\n` +
          (trade.exit_price ? `Exit: ${trade.exit_price}\n` : '') +
          `Amount: $${trade.trade_amount}\n` +
          `Status: ${statusText}\n` +
          (profitLossText ? `${profitLossText}\n` : '') +
          `Time: ${new Date(trade.entry_time).toLocaleString()}\n` +
          (trade.auto_traded ? `🤖 Auto-Traded\n` : '') +
          `\n`;
      }
    } else {
      message += `You don't have any trading history yet.\n\nStart trading with our signals to build your history!`;
    }
    
    await bot.sendMessage(
      chatId,
      message,
      {
        parse_mode: 'Markdown',
        reply_markup: createInlineKeyboard([[
          { text: '📊 Trading Signals', callback_data: 'view_signals' }
        ]]).reply_markup
      }
    );
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleTradingHistory', error);
    
    // Send generic error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
    }
  )(msg);
};

/**
 * Handle auto-trading settings callback
 * @param {Object} callbackQuery - Telegram callback query
 * @returns {Promise<void>}
 */
const handleAutoTradeSettings = async (callbackQuery) => {
  // Create a message-like object from the callback query for middleware
  const msg = {
    chat: { id: callbackQuery.message.chat.id },
    from: { id: callbackQuery.from.id }
  };
  
  // Use the subscription middleware to check if user has VIP tier
  return requireVerification()(requireSubscriptionTier(['vip'])(
    async (msg) => {
      try {
        const chatId = msg.chat.id;
        const telegramId = msg.from.id.toString();
        
        // Acknowledge callback query
        await bot.answerCallbackQuery(callbackQuery.id);
        
        logUserAction(telegramId, 'callback_auto_trade_settings');
        
        // Get user
        const user = await userService.getUserByTelegramId(telegramId);
    
    // Format message
    const statusText = user.auto_trade_enabled ? '✅ ENABLED' : '❌ DISABLED';
    
    let message = `*Auto-Trading Settings*\n\n` +
      `Status: ${statusText}\n` +
      (user.auto_trade_enabled ? 
        `Amount per Trade: $${user.auto_trade_amount}\n` +
        `Risk Percentage: ${user.auto_trade_risk_percentage}%\n\n` : 
        '\n') +
      `Auto-trading automatically executes trades based on our signals using your predefined settings.\n\n` +
      `What would you like to do?`;
    
    let keyboard;
    
    if (user.auto_trade_enabled) {
      keyboard = createInlineKeyboard([[
        { text: '⚙️ Update Settings', callback_data: 'update_auto_trade' }
      ], [
        { text: '❌ Disable Auto-Trading', callback_data: 'disable_auto_trade' }
      ]]).reply_markup;
    } else {
      keyboard = createInlineKeyboard([[
        { text: '✅ Enable Auto-Trading', callback_data: 'enable_auto_trade' }
      ]]).reply_markup;
    }
    
    await bot.sendMessage(
      chatId,
      message,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
      } catch (error) {
        logError(msg.from.id.toString(), 'handleAutoTradeSettings', error);
        
        // Send generic error message
        await bot.sendMessage(
          msg.chat.id,
          'Sorry, there was an error processing your request. Please try again later.'
        );
      }
    }
  ))(msg);
};

/**
 * Handle enable auto-trading callback
 * @param {Object} callbackQuery - Telegram callback query
 * @returns {Promise<void>}
 */
const handleEnableAutoTrade = async (callbackQuery) => {
  // Create a message-like object from the callback query for middleware
  const msg = {
    chat: { id: callbackQuery.message.chat.id },
    from: { id: callbackQuery.from.id }
  };
  
  // Use the subscription middleware to check if user has VIP tier
  return requireVerification()(requireSubscriptionTier(['vip'])(
    async (msg) => {
      try {
        const chatId = msg.chat.id;
        const telegramId = msg.from.id.toString();
        
        // Acknowledge callback query
        await bot.answerCallbackQuery(callbackQuery.id);
        
        logUserAction(telegramId, 'callback_enable_auto_trade');
        
        // Get user
        const user = await userService.getUserByTelegramId(telegramId);
    
    // Ask for trade amount
    await bot.sendMessage(
      chatId,
      `Please enter the amount in USD you want to allocate per trade (minimum $10):`
    );
      } catch (error) {
        logError(msg.from.id.toString(), 'handleEnableAutoTrade', error);
        
        // Send generic error message
        await bot.sendMessage(
          msg.chat.id,
          'Sorry, there was an error processing your request. Please try again later.'
        );
      }
    }
  ))(msg);
    
    // Set user state to wait for amount
    userStates.set(telegramId, { state: 'waiting_auto_trade_amount' });
};

/**
 * Handle disable auto-trading callback
 * @param {Object} callbackQuery - Telegram callback query
 * @returns {Promise<void>}
 */
const handleDisableAutoTrade = async (callbackQuery) => {
  // Create a message-like object from the callback query for middleware
  const msg = {
    chat: { id: callbackQuery.message.chat.id },
    from: { id: callbackQuery.from.id }
  };
  
  // Use the subscription middleware to check if user has VIP tier
  return requireVerification()(requireSubscriptionTier(['vip'])(
    async (msg) => {
      try {
        const chatId = msg.chat.id;
        const telegramId = msg.from.id.toString();
        
        // Acknowledge callback query
        await bot.answerCallbackQuery(callbackQuery.id);
        
        logUserAction(telegramId, 'callback_disable_auto_trade');
        
        // Disable auto-trading
        await tradingService.disableAutoTrading(telegramId);
        
        await bot.sendMessage(
          chatId,
          `Auto-trading has been disabled.\n\nYou will no longer receive automatic trades based on our signals.\n\nYou can re-enable auto-trading at any time.`,
          {
            reply_markup: createInlineKeyboard([[
              { text: '✅ Enable Auto-Trading', callback_data: 'enable_auto_trade' }
        ]]).reply_markup
      }
    );
      } catch (error) {
        logError(msg.from.id.toString(), 'handleDisableAutoTrade', error);
        
        // Send generic error message
        await bot.sendMessage(
          msg.chat.id,
          'Sorry, there was an error processing your request. Please try again later.'
        );
      }
    }
  ))(msg);
};

/**
 * Process auto-trade amount message
 * @param {Object} msg - Telegram message object
 * @returns {Promise<boolean>} - Whether message was processed
 */
const processAutoTradeAmount = async (msg) => {
  return (requireVerification()(requireSubscriptionTier(['vip'])(async (msg) => {
    try {
      const chatId = msg.chat.id;
      const telegramId = msg.from.id.toString();
      
      // Check if user is waiting for auto-trade amount
      const userState = userStates.get(telegramId);
      
      if (!userState || userState.state !== 'waiting_auto_trade_amount') {
        return false; // Not waiting for auto-trade amount
      }
      
      // Parse amount
      const amount = parseFloat(msg.text.trim().replace('$', ''));
      
      if (isNaN(amount) || amount < 10) {
        await bot.sendMessage(
          chatId,
          `Invalid amount. Please enter a valid amount in USD (minimum $10):`
        );
        return true;
      }
      
      // Update user state
      userState.amount = amount;
      userState.state = 'waiting_auto_trade_risk';
      userStates.set(telegramId, userState);
      
      // Ask for risk percentage
      await bot.sendMessage(
        chatId,
        `Please enter the risk percentage per trade (1-5%):`
      );
      
      return true;
  } catch (error) {
      logError(msg.from.id.toString(), 'processAutoTradeAmount', error);
      
      // Send error message
      await bot.sendMessage(
        msg.chat.id,
        'Sorry, there was an error processing your request. Please try again later.'
      );
      
      // Clear user state
      userStates.delete(msg.from.id.toString());
      
      return true;
    }
  }))(msg));
};

/**
 * Process auto-trade risk message
 * @param {Object} msg - Telegram message object
 * @returns {Promise<boolean>} - Whether message was processed
 */
const processAutoTradeRisk = async (msg) => {
  return (requireVerification()(requireSubscriptionTier(['vip'])(async (msg) => {
    try {
      const chatId = msg.chat.id;
      const telegramId = msg.from.id.toString();
      
      // Check if user is waiting for auto-trade risk
      const userState = userStates.get(telegramId);
      
      if (!userState || userState.state !== 'waiting_auto_trade_risk') {
        return false; // Not waiting for auto-trade risk
      }
      
      // Parse risk percentage
      const riskPercentage = parseFloat(msg.text.trim().replace('%', ''));
      
      if (isNaN(riskPercentage) || riskPercentage < 1 || riskPercentage > 5) {
        await bot.sendMessage(
          chatId,
          `Invalid risk percentage. Please enter a valid percentage (1-5%):`
        );
        return true;
      }
      
      // Enable auto-trading
      await tradingService.enableAutoTrading(telegramId, {
        amount: userState.amount,
        risk_percentage: riskPercentage
      });
      
      // Clear user state
      userStates.delete(telegramId);
      
      // Send confirmation
      await bot.sendMessage(
        chatId,
        `✅ Auto-trading has been enabled!\n\n` +
        `Amount per Trade: $${userState.amount}\n` +
        `Risk Percentage: ${riskPercentage}%\n\n` +
        `You will now automatically receive trades based on our signals.\n\n` +
        `You can update your settings or disable auto-trading at any time.`,
        {
          reply_markup: createReplyKeyboard([
            ['📊 Trading Signals', '💰 My Account'],
            ['🔔 Notifications', '📱 Support']
          ]).reply_markup
        }
      );
      
      return true;
    } catch (error) {
      logError(msg.from.id.toString(), 'processAutoTradeRisk', error);
      
      // Send error message
      await bot.sendMessage(
        msg.chat.id,
        'Sorry, there was an error processing your request. Please try again later.'
      );
      
      // Clear user state
      userStates.delete(msg.from.id.toString());
      
      return true;
    }
  }))(msg));
};

/**
 * Handle create signal command (admin only)
 * @param {Object} msg - Telegram message object
 * @param {Array} params - Command parameters
 * @returns {Promise<void>}
 */
const handleCreateSignal = async (msg, params) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This command is for administrators only.`
      );
      return;
    }
    
    // Check parameters
    if (!params || params.length < 3) {
      await bot.sendMessage(
        chatId,
        `Invalid parameters. Usage: /signal <asset> <type> <entry_price> [risk_percentage] [notes]`
      );
      return;
    }
    
    const asset = params[0].toUpperCase();
    const type = params[1].toLowerCase();
    const entryPrice = parseFloat(params[2]);
    const riskPercentage = params.length > 3 ? parseFloat(params[3]) : 1;
    const notes = params.length > 4 ? params.slice(4).join(' ') : '';
    
    if (!['buy', 'sell'].includes(type) || isNaN(entryPrice) || isNaN(riskPercentage)) {
      await bot.sendMessage(
        chatId,
        `Invalid parameters. Type must be 'buy' or 'sell', and prices must be valid numbers.`
      );
      return;
    }
    
    // Create signal
    const signal = await tradingService.createSignal({
      asset,
      trade_type: type,
      entry_price: entryPrice,
      risk_percentage: riskPercentage,
      notes
    }, telegramId);
    
    await bot.sendMessage(
      chatId,
      `Signal created successfully!\n\n` +
      `ID: ${signal.signal_id}\n` +
      `Asset: ${signal.asset}\n` +
      `Type: ${signal.trade_type.toUpperCase()}\n` +
      `Entry Price: ${signal.entry_price}\n` +
      `Risk Percentage: ${signal.risk_percentage}%`
    );
  } catch (error) {
    logError(msg.from.id.toString(), 'handleCreateSignal', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * Handle close signal command (admin only)
 * @param {Object} msg - Telegram message object
 * @param {Array} params - Command parameters
 * @returns {Promise<void>}
 */
const handleCloseSignal = async (msg, params) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This command is for administrators only.`
      );
      return;
    }
    
    // Check parameters
    if (!params || params.length < 2) {
      await bot.sendMessage(
        chatId,
        `Invalid parameters. Usage: /close <signal_id> <exit_price> [notes]`
      );
      return;
    }
    
    const signalId = params[0];
    const exitPrice = parseFloat(params[1]);
    const notes = params.length > 2 ? params.slice(2).join(' ') : '';
    
    if (isNaN(exitPrice)) {
      await bot.sendMessage(
        chatId,
        `Invalid exit price. Please enter a valid number.`
      );
      return;
    }
    
    // Close signal
    const signal = await tradingService.closeSignal(signalId, {
      exit_price: exitPrice,
      notes
    }, telegramId);
    
    const profitLossText = signal.profit_loss > 0 ? 
      `✅ PROFIT: +${signal.profit_loss.toFixed(2)}%` : 
      `❌ LOSS: ${signal.profit_loss.toFixed(2)}%`;
    
    await bot.sendMessage(
      chatId,
      `Signal closed successfully!\n\n` +
      `ID: ${signal.signal_id}\n` +
      `Asset: ${signal.asset}\n` +
      `Type: ${signal.trade_type.toUpperCase()}\n` +
      `Entry Price: ${signal.entry_price}\n` +
      `Exit Price: ${signal.exit_price}\n` +
      `${profitLossText}`
    );
  } catch (error) {
    logError(msg.from.id.toString(), 'handleCloseSignal', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      `Error: ${error.message}`
    );
  }
};

// Store user states for multi-step processes
const userStates = new Map();

module.exports = {
  handleTradingSignals,
  handleTradingHistory,
  handleAutoTradeSettings,
  handleEnableAutoTrade,
  handleDisableAutoTrade,
  processAutoTradeAmount,
  processAutoTradeRisk,
  handleCreateSignal,
  handleCloseSignal,
  userStates
};