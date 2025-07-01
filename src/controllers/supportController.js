const { bot, isAdmin } = require('../config/bot');
const userService = require('../services/userService');
const supportService = require('../services/supportService');
const { createInlineKeyboard, createReplyKeyboard, removeKeyboard } = require('../utils/keyboard');
const { logger, logUserAction, logAdminAction, logError } = require('../utils/logger');

/**
 * Handle support command
 * @param {Object} msg - Telegram message object
 * @returns {Promise<void>}
 */
const handleSupport = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    
    logUserAction(telegramId, 'command_support');
    
    // Get user
    const user = await userService.getUserByTelegramId(telegramId);
    
    // Check if user has active tickets
    const activeTickets = await supportService.getUserActiveTickets(telegramId);
    
    let message = `*OPTRIXTRADES Support*\n\n`;
    
    if (activeTickets.length > 0) {
      message += `You have ${activeTickets.length} active support ticket(s).\n\n`;
      
      for (const ticket of activeTickets) {
        message += `Ticket ID: ${ticket.ticketId}\n` +
          `Subject: ${ticket.subject}\n` +
          `Status: ${ticket.status}\n` +
          `Created: ${new Date(ticket.createdAt).toLocaleString()}\n\n`;
      }
      
      message += `What would you like to do?`;
      
      await bot.sendMessage(
        chatId,
        message,
        {
          parse_mode: 'Markdown',
          reply_markup: createInlineKeyboard([[
            { text: '📝 New Ticket', callback_data: 'new_ticket' }
          ], [
            { text: '📋 View Ticket', callback_data: 'view_ticket' }
          ]]).reply_markup
        }
      );
    } else {
      message += `How can we help you today?\n\n` +
        `Create a new support ticket and our team will assist you as soon as possible.`;
      
      await bot.sendMessage(
        chatId,
        message,
        {
          parse_mode: 'Markdown',
          reply_markup: createInlineKeyboard([[
            { text: '📝 New Ticket', callback_data: 'new_ticket' }
          ]]).reply_markup
        }
      );
    }
  } catch (error) {
    logError(msg.from.id.toString(), 'handleSupport', error);
    
    // Send generic error message
    await bot.sendMessage(
      msg.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
};

/**
 * Handle new ticket callback
 * @param {Object} callbackQuery - Telegram callback query
 * @returns {Promise<void>}
 */
const handleNewTicket = async (callbackQuery) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    logUserAction(telegramId, 'callback_new_ticket');
    
    // Ask for ticket subject
    await bot.sendMessage(
      chatId,
      `Please enter a subject for your support ticket (e.g., "Verification Issue", "Payment Problem", etc.):`,
      { reply_markup: removeKeyboard().reply_markup }
    );
    
    // Set user state to wait for subject
    userStates.set(telegramId, { state: 'waiting_ticket_subject' });
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleNewTicket', error);
    
    // Send generic error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
};

/**
 * Handle view ticket callback
 * @param {Object} callbackQuery - Telegram callback query
 * @returns {Promise<void>}
 */
const handleViewTicket = async (callbackQuery) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    logUserAction(telegramId, 'callback_view_ticket');
    
    // Get user's active tickets
    const activeTickets = await supportService.getUserActiveTickets(telegramId);
    
    if (activeTickets.length === 0) {
      await bot.sendMessage(
        chatId,
        `You don't have any active support tickets.\n\nWould you like to create a new ticket?`,
        {
          reply_markup: createInlineKeyboard([[
            { text: '📝 New Ticket', callback_data: 'new_ticket' }
          ]]).reply_markup
        }
      );
      return;
    }
    
    // If only one ticket, show it directly
    if (activeTickets.length === 1) {
      await showTicketDetails(chatId, telegramId, activeTickets[0].ticketId);
      return;
    }
    
    // If multiple tickets, let user choose
    const keyboard = [];
    
    for (const ticket of activeTickets) {
      keyboard.push([{
        text: `${ticket.ticketId}: ${ticket.subject}`,
        callback_data: `ticket_${ticket.ticketId}`
      }]);
    }
    
    await bot.sendMessage(
      chatId,
      `Please select a ticket to view:`,
      { reply_markup: createInlineKeyboard(keyboard).reply_markup }
    );
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleViewTicket', error);
    
    // Send generic error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
};

/**
 * Handle ticket selection callback
 * @param {Object} callbackQuery - Telegram callback query
 * @param {string} ticketId - Ticket ID
 * @returns {Promise<void>}
 */
const handleTicketSelection = async (callbackQuery, ticketId) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    logUserAction(telegramId, 'callback_ticket_selection', { ticketId });
    
    await showTicketDetails(chatId, telegramId, ticketId);
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleTicketSelection', error);
    
    // Send generic error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
};

/**
 * Show ticket details
 * @param {number} chatId - Telegram chat ID
 * @param {string} telegramId - User's Telegram ID
 * @param {string} ticketId - Ticket ID
 * @returns {Promise<void>}
 */
const showTicketDetails = async (chatId, telegramId, ticketId) => {
  try {
    // Get ticket details
    const ticket = await supportService.getTicketById(ticketId);
    
    if (!ticket || ticket.userId !== telegramId) {
      await bot.sendMessage(
        chatId,
        `Ticket not found or you don't have access to this ticket.`
      );
      return;
    }
    
    // Format message
    let message = `*Support Ticket: ${ticket.ticketId}*\n\n` +
      `Subject: ${ticket.subject}\n` +
      `Status: ${ticket.status}\n` +
      `Created: ${new Date(ticket.createdAt).toLocaleString()}\n\n` +
      `*Conversation:*\n\n`;
    
    // Add messages
    for (const msg of ticket.messages) {
      const sender = msg.isAdmin ? 'Support Team' : 'You';
      message += `*${sender}* (${new Date(msg.timestamp).toLocaleString()}):\n${msg.text}\n\n`;
    }
    
    // Add instructions
    message += `To reply to this ticket, use the button below.`;
    
    let keyboard;
    
    if (ticket.status === 'closed') {
      keyboard = createInlineKeyboard([[
        { text: '📝 New Ticket', callback_data: 'new_ticket' }
      ]]).reply_markup;
    } else {
      keyboard = createInlineKeyboard([[
        { text: '💬 Reply', callback_data: `reply_${ticket.ticketId}` }
      ], [
        { text: '✅ Close Ticket', callback_data: `close_${ticket.ticketId}` }
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
    logError(telegramId, 'showTicketDetails', error);
    
    // Send generic error message
    await bot.sendMessage(
      chatId,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
};

/**
 * Handle reply to ticket callback
 * @param {Object} callbackQuery - Telegram callback query
 * @param {string} ticketId - Ticket ID
 * @returns {Promise<void>}
 */
const handleReplyTicket = async (callbackQuery, ticketId) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    logUserAction(telegramId, 'callback_reply_ticket', { ticketId });
    
    // Ask for reply message
    await bot.sendMessage(
      chatId,
      `Please enter your reply to ticket ${ticketId}:`,
      { reply_markup: removeKeyboard().reply_markup }
    );
    
    // Set user state to wait for reply
    userStates.set(telegramId, { 
      state: 'waiting_ticket_reply',
      ticketId
    });
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleReplyTicket', error);
    
    // Send generic error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
};

/**
 * Handle close ticket callback
 * @param {Object} callbackQuery - Telegram callback query
 * @param {string} ticketId - Ticket ID
 * @returns {Promise<void>}
 */
const handleCloseTicket = async (callbackQuery, ticketId) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    logUserAction(telegramId, 'callback_close_ticket', { ticketId });
    
    // Close ticket
    await supportService.closeTicket(ticketId, telegramId);
    
    await bot.sendMessage(
      chatId,
      `Ticket ${ticketId} has been closed.\n\nThank you for using our support system.`,
      {
        reply_markup: createReplyKeyboard([
          ['📊 Trading Signals', '💰 My Account'],
          ['🔔 Notifications', '📱 Support']
        ]).reply_markup
      }
    );
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleCloseTicket', error);
    
    // Send generic error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
};

/**
 * Process ticket subject message
 * @param {Object} msg - Telegram message object
 * @returns {Promise<boolean>} - Whether message was processed
 */
const processTicketSubject = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    
    // Check if user is waiting for ticket subject
    const userState = userStates.get(telegramId);
    
    if (!userState || userState.state !== 'waiting_ticket_subject') {
      return false; // Not waiting for ticket subject
    }
    
    const subject = msg.text.trim();
    
    if (!subject || subject.length < 3) {
      await bot.sendMessage(
        chatId,
        `Subject is too short. Please enter a more descriptive subject:`
      );
      return true;
    }
    
    // Update user state
    userState.subject = subject;
    userState.state = 'waiting_ticket_message';
    userStates.set(telegramId, userState);
    
    // Ask for ticket message
    await bot.sendMessage(
      chatId,
      `Please describe your issue in detail:`
    );
    
    return true;
  } catch (error) {
    logError(msg.from.id.toString(), 'processTicketSubject', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
    
    // Clear user state
    userStates.delete(msg.from.id.toString());
    
    return true;
  }
};

/**
 * Process ticket message
 * @param {Object} msg - Telegram message object
 * @returns {Promise<boolean>} - Whether message was processed
 */
const processTicketMessage = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    
    // Check if user is waiting for ticket message
    const userState = userStates.get(telegramId);
    
    if (!userState || userState.state !== 'waiting_ticket_message') {
      return false; // Not waiting for ticket message
    }
    
    const message = msg.text.trim();
    
    if (!message || message.length < 10) {
      await bot.sendMessage(
        chatId,
        `Message is too short. Please provide more details about your issue:`
      );
      return true;
    }
    
    // Get user
    const user = await userService.getUserByTelegramId(telegramId);
    
    // Create ticket
    const ticket = await supportService.createTicket({
      userId: telegramId,
      username: user ? user.username : msg.from.username || 'Unknown',
      subject: userState.subject,
      message
    });
    
    // Clear user state
    userStates.delete(telegramId);
    
    // Send confirmation
    await bot.sendMessage(
      chatId,
      `✅ Your support ticket has been created!\n\n` +
      `Ticket ID: ${ticket.ticketId}\n` +
      `Subject: ${ticket.subject}\n\n` +
      `Our support team will review your ticket and respond as soon as possible.\n\n` +
      `You can check the status of your ticket at any time using the /support command.`,
      {
        reply_markup: createReplyKeyboard([
          ['📊 Trading Signals', '💰 My Account'],
          ['🔔 Notifications', '📱 Support']
        ]).reply_markup
      }
    );
    
    return true;
  } catch (error) {
    logError(msg.from.id.toString(), 'processTicketMessage', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
    
    // Clear user state
    userStates.delete(msg.from.id.toString());
    
    return true;
  }
};

/**
 * Process ticket reply message
 * @param {Object} msg - Telegram message object
 * @returns {Promise<boolean>} - Whether message was processed
 */
const processTicketReply = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    
    // Check if user is waiting for ticket reply
    const userState = userStates.get(telegramId);
    
    if (!userState || userState.state !== 'waiting_ticket_reply') {
      return false; // Not waiting for ticket reply
    }
    
    const message = msg.text.trim();
    
    if (!message || message.length < 5) {
      await bot.sendMessage(
        chatId,
        `Message is too short. Please provide a more detailed reply:`
      );
      return true;
    }
    
    // Add message to ticket
    await supportService.addMessageToTicket(userState.ticketId, {
      userId: telegramId,
      isAdmin: false,
      text: message
    });
    
    // Clear user state
    userStates.delete(telegramId);
    
    // Send confirmation
    await bot.sendMessage(
      chatId,
      `✅ Your reply has been sent!\n\n` +
      `Our support team will review your message and respond as soon as possible.`,
      {
        reply_markup: createReplyKeyboard([
          ['📊 Trading Signals', '💰 My Account'],
          ['🔔 Notifications', '📱 Support']
        ]).reply_markup
      }
    );
    
    return true;
  } catch (error) {
    logError(msg.from.id.toString(), 'processTicketReply', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
    
    // Clear user state
    userStates.delete(msg.from.id.toString());
    
    return true;
  }
};

/**
 * Handle admin reply to ticket (admin only)
 * @param {Object} msg - Telegram message object
 * @param {Array} params - Command parameters
 * @returns {Promise<void>}
 */
const handleAdminReply = async (msg, params) => {
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
        `Invalid parameters. Usage: /reply <ticket_id> <message>`
      );
      return;
    }
    
    const ticketId = params[0];
    const message = params.slice(1).join(' ');
    
    // Add message to ticket
    await supportService.addMessageToTicket(ticketId, {
      userId: telegramId,
      isAdmin: true,
      text: message
    });
    
    await bot.sendMessage(
      chatId,
      `Reply sent to ticket ${ticketId}.`
    );
  } catch (error) {
    logError(msg.from.id.toString(), 'handleAdminReply', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * Handle list tickets command (admin only)
 * @param {Object} msg - Telegram message object
 * @returns {Promise<void>}
 */
const handleListTickets = async (msg) => {
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
    
    // Get active tickets
    const activeTickets = await supportService.getActiveTickets();
    
    if (activeTickets.length === 0) {
      await bot.sendMessage(
        chatId,
        `There are no active support tickets.`
      );
      return;
    }
    
    // Format message
    let message = `*Active Support Tickets*\n\n`;
    
    for (const ticket of activeTickets) {
      message += `ID: ${ticket.ticketId}\n` +
        `User: ${ticket.username} (${ticket.userId})\n` +
        `Subject: ${ticket.subject}\n` +
        `Created: ${new Date(ticket.createdAt).toLocaleString()}\n` +
        `Messages: ${ticket.messages.length}\n\n`;
    }
    
    await bot.sendMessage(
      chatId,
      message,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logError(msg.from.id.toString(), 'handleListTickets', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * Handle view ticket command (admin only)
 * @param {Object} msg - Telegram message object
 * @param {Array} params - Command parameters
 * @returns {Promise<void>}
 */
const handleAdminViewTicket = async (msg, params) => {
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
    if (!params || params.length < 1) {
      await bot.sendMessage(
        chatId,
        `Invalid parameters. Usage: /ticket <ticket_id>`
      );
      return;
    }
    
    const ticketId = params[0];
    
    // Get ticket details
    const ticket = await supportService.getTicketById(ticketId);
    
    if (!ticket) {
      await bot.sendMessage(
        chatId,
        `Ticket not found.`
      );
      return;
    }
    
    // Format message
    let message = `*Support Ticket: ${ticket.ticketId}*\n\n` +
      `User: ${ticket.username} (${ticket.userId})\n` +
      `Subject: ${ticket.subject}\n` +
      `Status: ${ticket.status}\n` +
      `Created: ${new Date(ticket.createdAt).toLocaleString()}\n\n` +
      `*Conversation:*\n\n`;
    
    // Add messages
    for (const msg of ticket.messages) {
      const sender = msg.isAdmin ? 'Support Team' : 'User';
      message += `*${sender}* (${new Date(msg.timestamp).toLocaleString()}):\n${msg.text}\n\n`;
    }
    
    // Add instructions
    message += `To reply to this ticket, use: /reply ${ticketId} <message>`;
    
    let keyboard;
    
    if (ticket.status === 'closed') {
      keyboard = createInlineKeyboard([[
        { text: '🔄 Reopen Ticket', callback_data: `admin_reopen_${ticket.ticketId}` }
      ]]).reply_markup;
    } else {
      keyboard = createInlineKeyboard([[
        { text: '✅ Close Ticket', callback_data: `admin_close_${ticket.ticketId}` }
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
    logError(msg.from.id.toString(), 'handleAdminViewTicket', error);
    
    // Send error message
    await bot.sendMessage(
      msg.chat.id,
      `Error: ${error.message}`
    );
  }
};

/**
 * Handle admin close ticket callback (admin only)
 * @param {Object} callbackQuery - Telegram callback query
 * @param {string} ticketId - Ticket ID
 * @returns {Promise<void>}
 */
const handleAdminCloseTicket = async (callbackQuery, ticketId) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This action is for administrators only.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'admin_close_ticket', { ticketId });
    
    // Close ticket
    await supportService.closeTicket(ticketId, telegramId, true);
    
    await bot.sendMessage(
      chatId,
      `Ticket ${ticketId} has been closed.`
    );
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleAdminCloseTicket', error);
    
    // Send generic error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
};

/**
 * Handle admin reopen ticket callback (admin only)
 * @param {Object} callbackQuery - Telegram callback query
 * @param {string} ticketId - Ticket ID
 * @returns {Promise<void>}
 */
const handleAdminReopenTicket = async (callbackQuery, ticketId) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    
    // Acknowledge callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Check if user is admin
    if (!isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        `Unauthorized. This action is for administrators only.`
      );
      return;
    }
    
    logAdminAction(telegramId, 'admin_reopen_ticket', { ticketId });
    
    // Reopen ticket
    const ticket = await supportService.getTicketById(ticketId);
    
    if (!ticket) {
      await bot.sendMessage(
        chatId,
        `Ticket not found.`
      );
      return;
    }
    
    // Update ticket status
    ticket.status = 'open';
    
    // Add system message
    await supportService.addMessageToTicket(ticketId, {
      userId: telegramId,
      isAdmin: true,
      text: 'Ticket reopened by admin.'
    });
    
    await bot.sendMessage(
      chatId,
      `Ticket ${ticketId} has been reopened.`
    );
    
    // Notify user
    await bot.sendMessage(
      ticket.userId,
      `Your support ticket (ID: ${ticketId}) has been reopened by our support team.\n\n` +
      `Subject: ${ticket.subject}\n\n` +
      `You can view and reply to this ticket using the /support command.`
    );
  } catch (error) {
    logError(callbackQuery.from.id.toString(), 'handleAdminReopenTicket', error);
    
    // Send generic error message
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      'Sorry, there was an error processing your request. Please try again later.'
    );
  }
};

// Store user states for multi-step processes
const userStates = new Map();

module.exports = {
  handleSupport,
  handleNewTicket,
  handleViewTicket,
  handleTicketSelection,
  handleReplyTicket,
  handleCloseTicket,
  processTicketSubject,
  processTicketMessage,
  processTicketReply,
  handleAdminReply,
  handleListTickets,
  handleAdminViewTicket,
  handleAdminCloseTicket,
  handleAdminReopenTicket,
  userStates
};