const { User } = require('../models');
const { bot, isAdmin } = require('../config/bot');
const { createInlineKeyboard } = require('../utils/keyboard');
const { logger, logUserAction, logError, logAdminAction } = require('../utils/logger');
const userService = require('./userService');

// In-memory storage for active support tickets
// In a production environment, this should be stored in a database
const activeTickets = new Map();

/**
 * Create a new support ticket
 * @param {string} telegramId - User's Telegram ID
 * @param {string} message - Support message
 * @returns {Promise<Object>} - Created ticket
 */
const createSupportTicket = async (telegramId, message) => {
  try {
    const user = await userService.getUserByTelegramId(telegramId);
    
    if (!user) {
      throw new Error(`User with Telegram ID ${telegramId} not found`);
    }
    
    // Generate ticket ID
    const ticketId = generateTicketId();
    
    // Create ticket object
    const ticket = {
      id: ticketId,
      user_id: user.id,
      telegram_id: telegramId,
      username: user.username,
      first_name: user.first_name,
      message: message,
      status: 'open',
      created_at: new Date(),
      updated_at: new Date(),
      messages: [
        {
          sender: 'user',
          telegram_id: telegramId,
          message: message,
          timestamp: new Date()
        }
      ],
      assigned_admin: null
    };
    
    // Store ticket in memory
    activeTickets.set(ticketId, ticket);
    
    logUserAction(telegramId, 'support_ticket_created', { ticket_id: ticketId });
    
    // Notify user
    await bot.sendMessage(
      telegramId,
      `Your support ticket has been created.\n\nTicket ID: ${ticketId}\n\nOur team will respond to your inquiry as soon as possible. Thank you for your patience.`,
      createInlineKeyboard([[
        { text: '❌ Close Ticket', callback_data: `close_ticket:${ticketId}` }
      ]])
    );
    
    // Notify admins
    await notifyAdminsAboutNewTicket(ticket);
    
    return ticket;
  } catch (error) {
    logError(telegramId, 'createSupportTicket', error);
    throw error;
  }
};

/**
 * Add message to support ticket
 * @param {string} ticketId - Ticket ID
 * @param {string} telegramId - Sender's Telegram ID
 * @param {string} message - Message
 * @param {boolean} isAdminMessage - Whether the message is from admin
 * @returns {Promise<Object>} - Updated ticket
 */
const addMessageToTicket = async (ticketId, telegramId, message, isAdminMessage = false) => {
  try {
    const ticket = activeTickets.get(ticketId);
    
    if (!ticket) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }
    
    // Check if user is authorized to add message
    if (!isAdminMessage && ticket.telegram_id !== telegramId) {
      throw new Error('Unauthorized to add message to this ticket');
    }
    
    // Add message to ticket
    const newMessage = {
      sender: isAdminMessage ? 'admin' : 'user',
      telegram_id: telegramId,
      message: message,
      timestamp: new Date()
    };
    
    ticket.messages.push(newMessage);
    ticket.updated_at = new Date();
    
    // If admin is responding, assign them to the ticket
    if (isAdminMessage) {
      ticket.assigned_admin = telegramId;
      logAdminAction(telegramId, 'support_ticket_response', { ticket_id: ticketId });
    } else {
      logUserAction(telegramId, 'support_ticket_message', { ticket_id: ticketId });
    }
    
    // Update ticket in memory
    activeTickets.set(ticketId, ticket);
    
    // Notify the other party
    if (isAdminMessage) {
      // Admin responding to user
      await bot.sendMessage(
        ticket.telegram_id,
        `*Support Response*\n\nTicket ID: ${ticketId}\n\n${message}`,
        {
          parse_mode: 'Markdown',
          reply_markup: createInlineKeyboard([[
            { text: '❌ Close Ticket', callback_data: `close_ticket:${ticketId}` },
            { text: '↩️ Reply', callback_data: `reply_ticket:${ticketId}` }
          ]]).reply_markup
        }
      );
    } else {
      // User responding, notify assigned admin or all admins
      if (ticket.assigned_admin) {
        await bot.sendMessage(
          ticket.assigned_admin,
          `*New Message in Ticket*\n\nTicket ID: ${ticketId}\nFrom: ${ticket.first_name} (${ticket.username || 'no username'})\n\n${message}`,
          {
            parse_mode: 'Markdown',
            reply_markup: createInlineKeyboard([[
              { text: '↩️ Reply', callback_data: `admin_reply:${ticketId}` },
              { text: '✅ Resolve', callback_data: `resolve_ticket:${ticketId}` }
            ]]).reply_markup
          }
        );
      } else {
        await notifyAdminsAboutTicketUpdate(ticket, message);
      }
    }
    
    return ticket;
  } catch (error) {
    logError(telegramId, 'addMessageToTicket', error);
    throw error;
  }
};

/**
 * Close support ticket
 * @param {string} ticketId - Ticket ID
 * @param {string} telegramId - User's Telegram ID
 * @param {boolean} isAdmin - Whether the request is from admin
 * @returns {Promise<boolean>} - Success status
 */
const closeTicket = async (ticketId, telegramId, isAdminAction = false) => {
  try {
    const ticket = activeTickets.get(ticketId);
    
    if (!ticket) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }
    
    // Check if user is authorized to close ticket
    if (!isAdminAction && ticket.telegram_id !== telegramId) {
      throw new Error('Unauthorized to close this ticket');
    }
    
    // Update ticket status
    ticket.status = 'closed';
    ticket.updated_at = new Date();
    ticket.closed_by = telegramId;
    
    // Remove from active tickets
    activeTickets.delete(ticketId);
    
    if (isAdminAction) {
      logAdminAction(telegramId, 'support_ticket_closed', { ticket_id: ticketId });
      
      // Notify user
      await bot.sendMessage(
        ticket.telegram_id,
        `Your support ticket (ID: ${ticketId}) has been resolved and closed by our support team.\n\nIf you need further assistance, please create a new support ticket.`
      );
    } else {
      logUserAction(telegramId, 'support_ticket_closed', { ticket_id: ticketId });
      
      // Notify assigned admin or all admins
      if (ticket.assigned_admin) {
        await bot.sendMessage(
          ticket.assigned_admin,
          `Support ticket (ID: ${ticketId}) has been closed by the user.`
        );
      } else {
        await notifyAdminsAboutTicketClosure(ticket, false);
      }
    }
    
    return true;
  } catch (error) {
    logError(telegramId, 'closeTicket', error);
    return false;
  }
};

/**
 * Get active support tickets
 * @param {boolean} onlyOpen - Whether to get only open tickets
 * @returns {Array} - Active tickets
 */
const getActiveTickets = (onlyOpen = true) => {
  const tickets = Array.from(activeTickets.values());
  
  if (onlyOpen) {
    return tickets.filter(ticket => ticket.status === 'open');
  }
  
  return tickets;
};

/**
 * Get user's support tickets
 * @param {string} telegramId - User's Telegram ID
 * @returns {Array} - User's tickets
 */
const getUserTickets = (telegramId) => {
  const tickets = Array.from(activeTickets.values());
  return tickets.filter(ticket => ticket.telegram_id === telegramId);
};

/**
 * Get ticket by ID
 * @param {string} ticketId - Ticket ID
 * @returns {Object|null} - Ticket object or null
 */
const getTicketById = (ticketId) => {
  return activeTickets.get(ticketId) || null;
};

/**
 * Notify admins about new ticket
 * @param {Object} ticket - Ticket object
 * @returns {Promise<void>}
 */
const notifyAdminsAboutNewTicket = async (ticket) => {
  try {
    const adminIds = process.env.ADMIN_TELEGRAM_IDS.split(',');
    
    for (const adminId of adminIds) {
      try {
        await bot.sendMessage(
          adminId,
          `*New Support Ticket*\n\nTicket ID: ${ticket.id}\nFrom: ${ticket.first_name} (${ticket.username || 'no username'})\nTime: ${ticket.created_at.toISOString().replace('T', ' ').substring(0, 19)}\n\nMessage:\n${ticket.message}`,
          {
            parse_mode: 'Markdown',
            reply_markup: createInlineKeyboard([[
              { text: '↩️ Reply', callback_data: `admin_reply:${ticket.id}` },
              { text: '✅ Resolve', callback_data: `resolve_ticket:${ticket.id}` }
            ]]).reply_markup
          }
        );
      } catch (err) {
        logger.error(`Failed to notify admin ${adminId} about new ticket: ${err.message}`);
      }
    }
  } catch (error) {
    logger.error(`Error notifying admins about new ticket: ${error.message}`);
  }
};

/**
 * Notify admins about ticket update
 * @param {Object} ticket - Ticket object
 * @param {string} message - New message
 * @returns {Promise<void>}
 */
const notifyAdminsAboutTicketUpdate = async (ticket, message) => {
  try {
    const adminIds = process.env.ADMIN_TELEGRAM_IDS.split(',');
    
    for (const adminId of adminIds) {
      try {
        await bot.sendMessage(
          adminId,
          `*Updated Support Ticket*\n\nTicket ID: ${ticket.id}\nFrom: ${ticket.first_name} (${ticket.username || 'no username'})\nTime: ${new Date().toISOString().replace('T', ' ').substring(0, 19)}\n\nNew Message:\n${message}`,
          {
            parse_mode: 'Markdown',
            reply_markup: createInlineKeyboard([[
              { text: '↩️ Reply', callback_data: `admin_reply:${ticket.id}` },
              { text: '✅ Resolve', callback_data: `resolve_ticket:${ticket.id}` }
            ]]).reply_markup
          }
        );
      } catch (err) {
        logger.error(`Failed to notify admin ${adminId} about ticket update: ${err.message}`);
      }
    }
  } catch (error) {
    logger.error(`Error notifying admins about ticket update: ${error.message}`);
  }
};

/**
 * Notify admins about ticket closure
 * @param {Object} ticket - Ticket object
 * @param {boolean} byAdmin - Whether closed by admin
 * @returns {Promise<void>}
 */
const notifyAdminsAboutTicketClosure = async (ticket, byAdmin) => {
  try {
    const adminIds = process.env.ADMIN_TELEGRAM_IDS.split(',');
    
    for (const adminId of adminIds) {
      try {
        await bot.sendMessage(
          adminId,
          `*Support Ticket Closed*\n\nTicket ID: ${ticket.id}\nFrom: ${ticket.first_name} (${ticket.username || 'no username'})\nClosed by: ${byAdmin ? 'Admin' : 'User'}\nTime: ${new Date().toISOString().replace('T', ' ').substring(0, 19)}`,
          { parse_mode: 'Markdown' }
        );
      } catch (err) {
        logger.error(`Failed to notify admin ${adminId} about ticket closure: ${err.message}`);
      }
    }
  } catch (error) {
    logger.error(`Error notifying admins about ticket closure: ${error.message}`);
  }
};

/**
 * Generate unique ticket ID
 * @returns {string} - Ticket ID
 */
const generateTicketId = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `SUP-${year}${month}${day}-${random}`;
};

module.exports = {
  createSupportTicket,
  addMessageToTicket,
  closeTicket,
  getActiveTickets,
  getUserTickets,
  getTicketById
};