/**
 * Utility functions for creating Telegram keyboard layouts
 */

/**
 * Create a keyboard with inline buttons
 * @param {Array} buttons - Array of button objects with text and callback_data
 * @param {number} columns - Number of columns in the keyboard
 * @returns {Object} - Inline keyboard markup
 */
const createInlineKeyboard = (buttons, columns = 1) => {
  const keyboard = [];
  let row = [];
  
  buttons.forEach((button, index) => {
    row.push({
      text: button.text,
      callback_data: button.callback_data
    });
    
    if ((index + 1) % columns === 0 || index === buttons.length - 1) {
      keyboard.push([...row]);
      row = [];
    }
  });
  
  return {
    reply_markup: {
      inline_keyboard: keyboard
    }
  };
};

/**
 * Create a keyboard with URL buttons
 * @param {Array} buttons - Array of button objects with text and url
 * @param {number} columns - Number of columns in the keyboard
 * @returns {Object} - Inline keyboard markup with URL buttons
 */
const createUrlKeyboard = (buttons, columns = 1) => {
  const keyboard = [];
  let row = [];
  
  buttons.forEach((button, index) => {
    row.push({
      text: button.text,
      url: button.url
    });
    
    if ((index + 1) % columns === 0 || index === buttons.length - 1) {
      keyboard.push([...row]);
      row = [];
    }
  });
  
  return {
    reply_markup: {
      inline_keyboard: keyboard
    }
  };
};

/**
 * Create a mixed keyboard with both callback and URL buttons
 * @param {Array} rows - Array of button rows
 * @returns {Object} - Inline keyboard markup with mixed button types
 */
const createMixedKeyboard = (rows) => {
  return {
    reply_markup: {
      inline_keyboard: rows
    }
  };
};

/**
 * Create a regular keyboard (not inline)
 * @param {Array} buttons - Array of button text strings
 * @param {number} columns - Number of columns in the keyboard
 * @param {boolean} oneTime - Whether the keyboard should disappear after one use
 * @param {boolean} resize - Whether the keyboard should resize
 * @returns {Object} - Regular keyboard markup
 */
const createReplyKeyboard = (buttons, columns = 1, oneTime = false, resize = true) => {
  const keyboard = [];
  let row = [];
  
  buttons.forEach((button, index) => {
    row.push(button);
    
    if ((index + 1) % columns === 0 || index === buttons.length - 1) {
      keyboard.push([...row]);
      row = [];
    }
  });
  
  return {
    reply_markup: {
      keyboard,
      one_time_keyboard: oneTime,
      resize_keyboard: resize
    }
  };
};

/**
 * Remove keyboard
 * @param {boolean} selective - Whether the removal is selective
 * @returns {Object} - Remove keyboard markup
 */
const removeKeyboard = (selective = false) => {
  return {
    reply_markup: {
      remove_keyboard: true,
      selective
    }
  };
};

module.exports = {
  createInlineKeyboard,
  createUrlKeyboard,
  createMixedKeyboard,
  createReplyKeyboard,
  removeKeyboard
};