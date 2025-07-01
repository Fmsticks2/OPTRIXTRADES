# Inline Keyboards and Callback Queries Guide

This guide provides detailed instructions for implementing interactive inline keyboards and handling callback queries in the OPTRIXTRADES Telegram bot. These features allow you to create rich, interactive user experiences with buttons, menus, and multi-step flows.

## Table of Contents

1. [Understanding Inline Keyboards](#understanding-inline-keyboards)
2. [Creating Basic Inline Keyboards](#creating-basic-inline-keyboards)
3. [Handling Callback Queries](#handling-callback-queries)
4. [Advanced Keyboard Patterns](#advanced-keyboard-patterns)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)
7. [Complete Examples](#complete-examples)

## Understanding Inline Keyboards

Inline keyboards in Telegram bots are interactive buttons that appear directly beneath messages. Unlike custom keyboards, inline keyboards:

- Don't replace the user's regular keyboard
- Can be attached to specific messages
- Generate callback queries when pressed
- Can include URLs that open in the browser
- Support various layouts and button types

## Creating Basic Inline Keyboards

### Simple Button Keyboard

Here's how to create a basic inline keyboard with buttons:

```javascript
const { bot } = require('../config/bot');

async function sendWelcomeMessage(chatId) {
  // Create keyboard markup
  const keyboard = {
    inline_keyboard: [
      [
        { text: 'Get Started', callback_data: 'get_started' },
        { text: 'Help', callback_data: 'help' }
      ],
      [
        { text: 'About Us', callback_data: 'about' }
      ]
    ]
  };
  
  // Send message with keyboard
  await bot.sendMessage(
    chatId,
    'Welcome to OPTRIXTRADES! Please select an option:',
    { reply_markup: keyboard }
  );
}
```

### Keyboard with URL Buttons

You can include buttons that open URLs:

```javascript
const keyboard = {
  inline_keyboard: [
    [
      { text: 'Visit Website', url: 'https://optrixtrades.com' },
      { text: 'Contact Support', url: 'https://t.me/optrixtrades_support' }
    ],
    [
      { text: 'Back to Menu', callback_data: 'main_menu' }
    ]
  ]
};
```

### Creating a Utility Function for Keyboards

It's helpful to create a utility function for generating keyboards:

```javascript
// src/utils/keyboard.js

/**
 * Create an inline keyboard markup
 * @param {Array<Array<Object>>} buttons - Array of button rows, each containing button objects
 * @returns {Object} Inline keyboard markup object
 */
function createInlineKeyboard(buttons) {
  return {
    inline_keyboard: buttons
  };
}

/**
 * Create a button object for inline keyboards
 * @param {string} text - Button text
 * @param {string} [callbackData] - Callback data (omit if using url)
 * @param {string} [url] - URL to open (omit if using callbackData)
 * @returns {Object} Button object
 */
function createButton(text, callbackData, url) {
  if (url) {
    return { text, url };
  }
  return { text, callback_data: callbackData };
}

module.exports = {
  createInlineKeyboard,
  createButton
};
```

Using the utility functions:

```javascript
const { createInlineKeyboard, createButton } = require('../utils/keyboard');

async function sendOptionsMenu(chatId) {
  const keyboard = createInlineKeyboard([
    [
      createButton('Account', 'account_menu'),
      createButton('Trading', 'trading_menu')
    ],
    [
      createButton('Support', 'support_menu'),
      createButton('Settings', 'settings_menu')
    ],
    [
      createButton('Visit Website', null, 'https://optrixtrades.com')
    ]
  ]);
  
  await bot.sendMessage(
    chatId,
    'Please select an option:',
    { reply_markup: keyboard }
  );
}
```

## Handling Callback Queries

When a user clicks an inline keyboard button, Telegram sends a callback query to your bot. You need to handle these queries to respond to user interactions.

### Basic Callback Handler

```javascript
bot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const userId = callbackQuery.from.id;
  
  // Log the callback query
  console.log(`Received callback query: ${data} from user ${userId}`);
  
  // Handle different callback data
  switch (data) {
    case 'get_started':
      await handleGetStarted(chatId, userId);
      break;
    case 'help':
      await handleHelp(chatId);
      break;
    case 'about':
      await handleAbout(chatId);
      break;
    default:
      console.log(`Unknown callback data: ${data}`);
  }
  
  // Answer callback query to remove loading indicator
  await bot.answerCallbackQuery(callbackQuery.id);
});

async function handleGetStarted(chatId, userId) {
  // Implementation for Get Started button
  await bot.sendMessage(chatId, 'Let\'s get you started with OPTRIXTRADES...');
}

async function handleHelp(chatId) {
  // Implementation for Help button
  await bot.sendMessage(chatId, 'Here\'s how to use OPTRIXTRADES bot...');
}

async function handleAbout(chatId) {
  // Implementation for About button
  await bot.sendMessage(chatId, 'OPTRIXTRADES is a premium trading signals platform...');
}
```

### Answering Callback Queries

It's important to always answer callback queries to remove the loading indicator. You can also show a notification:

```javascript
// Simple acknowledgment
await bot.answerCallbackQuery(callbackQuery.id);

// With notification
await bot.answerCallbackQuery(callbackQuery.id, {
  text: 'Processing your request...'
});

// With alert (popup)
await bot.answerCallbackQuery(callbackQuery.id, {
  text: 'This feature is only available to premium subscribers!',
  show_alert: true
});
```

### Updating Messages with New Keyboards

You can update the original message with a new keyboard after a button is pressed:

```javascript
async function handleMainMenu(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  
  const keyboard = createInlineKeyboard([
    [
      createButton('Account', 'account_menu'),
      createButton('Trading', 'trading_menu')
    ],
    [
      createButton('Support', 'support_menu'),
      createButton('Settings', 'settings_menu')
    ]
  ]);
  
  await bot.editMessageText(
    'Main Menu - Please select an option:',
    {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard
    }
  );
  
  await bot.answerCallbackQuery(callbackQuery.id);
}
```

## Advanced Keyboard Patterns

### Paginated Lists

Create paginated lists for browsing through multiple items:

```javascript
async function sendPaginatedList(chatId, page = 1, itemsPerPage = 5) {
  // Fetch items (e.g., from database)
  const allItems = await itemService.getAllItems();
  const totalPages = Math.ceil(allItems.length / itemsPerPage);
  
  // Calculate current page items
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = allItems.slice(startIndex, endIndex);
  
  // Create message text
  let messageText = `Items (Page ${page}/${totalPages}):\n\n`;
  
  currentItems.forEach((item, index) => {
    messageText += `${startIndex + index + 1}. ${item.name}\n`;
  });
  
  // Create navigation buttons
  const keyboard = [];
  
  // Add item selection buttons
  currentItems.forEach((item, index) => {
    keyboard.push([
      createButton(`Select ${index + 1}`, `select_item_${item.id}`)
    ]);
  });
  
  // Add pagination controls
  const paginationRow = [];
  
  if (page > 1) {
    paginationRow.push(createButton('⬅️ Previous', `page_${page - 1}`));
  }
  
  if (page < totalPages) {
    paginationRow.push(createButton('Next ➡️', `page_${page + 1}`));
  }
  
  if (paginationRow.length > 0) {
    keyboard.push(paginationRow);
  }
  
  // Add back button
  keyboard.push([createButton('Back to Menu', 'main_menu')]);
  
  await bot.sendMessage(chatId, messageText, {
    reply_markup: createInlineKeyboard(keyboard)
  });
}

// In your callback handler
bot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  
  // Handle pagination
  if (data.startsWith('page_')) {
    const page = parseInt(data.split('_')[1]);
    await sendPaginatedList(chatId, page);
  }
  // Handle item selection
  else if (data.startsWith('select_item_')) {
    const itemId = data.split('_')[2];
    await handleItemSelection(chatId, itemId);
  }
  // Other handlers...
  
  await bot.answerCallbackQuery(callbackQuery.id);
});
```

### Multi-Level Menus

Implement nested menus for complex interfaces:

```javascript
async function sendMainMenu(chatId) {
  const keyboard = createInlineKeyboard([
    [createButton('Account', 'menu_account')],
    [createButton('Trading', 'menu_trading')],
    [createButton('Support', 'menu_support')]
  ]);
  
  await bot.sendMessage(
    chatId,
    'Main Menu - Please select a category:',
    { reply_markup: keyboard }
  );
}

async function sendAccountMenu(chatId, messageId) {
  const keyboard = createInlineKeyboard([
    [createButton('Profile', 'account_profile')],
    [createButton('Subscription', 'account_subscription')],
    [createButton('Settings', 'account_settings')],
    [createButton('Back to Main Menu', 'menu_main')]
  ]);
  
  await bot.editMessageText(
    'Account Menu - Please select an option:',
    {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard
    }
  );
}

// In your callback handler
bot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  
  // Handle menu navigation
  if (data === 'menu_main') {
    await sendMainMenu(chatId, messageId);
  }
  else if (data === 'menu_account') {
    await sendAccountMenu(chatId, messageId);
  }
  else if (data === 'menu_trading') {
    await sendTradingMenu(chatId, messageId);
  }
  // Handle specific actions
  else if (data === 'account_profile') {
    await handleProfile(chatId, callbackQuery.from.id);
  }
  // Other handlers...
  
  await bot.answerCallbackQuery(callbackQuery.id);
});
```

### Data-Rich Buttons

Encode multiple parameters in callback data:

```javascript
// Creating buttons with encoded data
function createDataButton(text, action, ...params) {
  // Join parameters with a separator
  const callbackData = [action, ...params].join('|');
  return { text, callback_data: callbackData };
}

// Example usage
const keyboard = createInlineKeyboard([
  [
    createDataButton('View Signal #123', 'view_signal', 123, 'crypto'),
    createDataButton('Subscribe', 'subscribe', 'premium', 30) // plan, days
  ]
]);

// Parsing in callback handler
bot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  const params = data.split('|');
  const action = params[0];
  
  if (action === 'view_signal') {
    const signalId = params[1];
    const category = params[2];
    await handleViewSignal(callbackQuery, signalId, category);
  }
  else if (action === 'subscribe') {
    const plan = params[1];
    const days = parseInt(params[2]);
    await handleSubscribe(callbackQuery, plan, days);
  }
  // Other handlers...
  
  await bot.answerCallbackQuery(callbackQuery.id);
});
```

## Best Practices

### Organizing Callback Handlers

For complex bots with many callbacks, organize handlers by feature:

```javascript
// src/handlers/callbackHandlers.js
const accountCallbacks = require('./callbacks/accountCallbacks');
const tradingCallbacks = require('./callbacks/tradingCallbacks');
const supportCallbacks = require('./callbacks/supportCallbacks');

/**
 * Main callback query handler
 * @param {Object} bot - Telegram bot instance
 */
function setupCallbackHandlers(bot) {
  bot.on('callback_query', async (callbackQuery) => {
    const data = callbackQuery.data;
    
    try {
      // Route to appropriate handler based on prefix
      if (data.startsWith('account_')) {
        await accountCallbacks.handleCallback(callbackQuery);
      }
      else if (data.startsWith('trading_')) {
        await tradingCallbacks.handleCallback(callbackQuery);
      }
      else if (data.startsWith('support_')) {
        await supportCallbacks.handleCallback(callbackQuery);
      }
      else {
        // Handle general callbacks
        await handleGeneralCallback(callbackQuery);
      }
    } catch (error) {
      console.error('Error handling callback query:', error);
      // Always answer the callback query even if there's an error
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: 'An error occurred. Please try again.',
        show_alert: true
      });
    }
  });
}

async function handleGeneralCallback(callbackQuery) {
  const bot = require('../config/bot');
  const data = callbackQuery.data;
  
  // Handle general callbacks
  // ...
  
  await bot.answerCallbackQuery(callbackQuery.id);
}

module.exports = {
  setupCallbackHandlers
};
```

### Callback Data Naming Conventions

Use a consistent naming convention for callback data:

1. **Prefix-based**: `category_action_id`
   - Example: `account_view_123`, `trading_signal_456`

2. **Parameter-based**: `action|param1|param2`
   - Example: `view|signal|123|crypto`, `subscribe|premium|30`

### Error Handling

Always include error handling in callback processors:

```javascript
bot.on('callback_query', async (callbackQuery) => {
  try {
    // Process callback
    // ...
    
    // Answer callback query
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error('Error processing callback query:', error);
    
    // Always answer the callback query
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: 'An error occurred. Please try again.',
      show_alert: true
    });
    
    // Notify user about the error
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      'Sorry, an error occurred while processing your request. Please try again later.'
    );
  }
});
```

### Callback Data Size Limit

Telegram has a 64-byte limit for callback data. For complex data:

1. Use short codes or IDs
2. Store complex data server-side and use reference IDs
3. Consider using a state management approach

```javascript
// Instead of this (too long)
const callbackData = `view_product_${product.id}_${product.name}_${product.category}`;

// Do this
const callbackData = `p_${product.id}`; // Just store the ID

// Or use a temporary state store
const stateId = generateStateId();
temporaryStateStore.set(stateId, { product });
const callbackData = `state_${stateId}`;
```

## Troubleshooting

### Common Issues and Solutions

#### Callback Query Too Old

**Issue**: Telegram returns "Callback query is too old and can't be answered" error.

**Solution**: This happens when trying to answer a callback query that's more than 48 hours old. Implement proper error handling:

```javascript
try {
  await bot.answerCallbackQuery(callbackQuery.id);
} catch (error) {
  if (error.message.includes('too old')) {
    console.log('Callback query too old, ignoring');
  } else {
    throw error; // Re-throw other errors
  }
}
```

#### Message Not Modified

**Issue**: When using `editMessageText`, you might get "Message is not modified" error.

**Solution**: This happens when the new text and markup are identical to the current ones. Catch and ignore this specific error:

```javascript
try {
  await bot.editMessageText(text, options);
} catch (error) {
  if (error.message.includes('message is not modified')) {
    // Ignore this error
  } else {
    console.error('Error editing message:', error);
  }
}
```

#### Callback Data Too Long

**Issue**: Telegram has a 64-byte limit for callback data.

**Solution**: Use shorter identifiers or server-side state as described in the best practices section.

## Complete Examples

### Multi-Step Form with Inline Keyboards

This example shows how to implement a multi-step form using inline keyboards and state management:

```javascript
// src/controllers/verificationController.js
const bot = require('../config/bot');
const { createInlineKeyboard, createButton } = require('../utils/keyboard');
const userService = require('../services/userService');
const verificationService = require('../services/verificationService');

// Store user states
const userStates = new Map();

// Start verification process
bot.onText(/\/verify/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  // Initialize user state
  userStates.set(userId, {
    step: 'broker_selection',
    data: {}
  });
  
  // Send broker selection keyboard
  const keyboard = createInlineKeyboard([
    [createButton('Broker A', 'verify_broker_a')],
    [createButton('Broker B', 'verify_broker_b')],
    [createButton('Broker C', 'verify_broker_c')],
    [createButton('Cancel', 'verify_cancel')]
  ]);
  
  await bot.sendMessage(
    chatId,
    'Please select your broker:',
    { reply_markup: keyboard }
  );
});

// Handle verification callbacks
bot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const userId = callbackQuery.from.id;
  const messageId = msg.message_id;
  
  // Get user state
  const state = userStates.get(userId);
  
  try {
    // Handle verification flow
    if (data.startsWith('verify_')) {
      // Cancel verification
      if (data === 'verify_cancel') {
        userStates.delete(userId);
        await bot.editMessageText(
          'Verification cancelled.',
          { chat_id: chatId, message_id: messageId }
        );
      }
      // Broker selection
      else if (data.startsWith('verify_broker_')) {
        const broker = data.replace('verify_broker_', '');
        
        // Update user state
        state.data.broker = broker;
        state.step = 'account_id';
        userStates.set(userId, state);
        
        // Ask for account ID
        await bot.editMessageText(
          `You selected Broker ${broker.toUpperCase()}. Please enter your account ID:`,
          { chat_id: chatId, message_id: messageId }
        );
        
        // Add instructions as a new message
        await bot.sendMessage(
          chatId,
          'Type your account ID or /cancel to abort the process.'
        );
      }
      // Handle account ID confirmation
      else if (data.startsWith('verify_confirm_')) {
        const confirmed = data === 'verify_confirm_yes';
        
        if (confirmed) {
          // Update user state
          state.step = 'screenshot';
          userStates.set(userId, state);
          
          // Ask for screenshot
          await bot.editMessageText(
            `Account ID confirmed: ${state.data.accountId}\n\nPlease send a screenshot of your broker account showing your name and account ID.`,
            { chat_id: chatId, message_id: messageId }
          );
        } else {
          // Go back to account ID step
          state.step = 'account_id';
          userStates.set(userId, state);
          
          await bot.editMessageText(
            `Please enter your correct account ID for Broker ${state.data.broker.toUpperCase()}:`,
            { chat_id: chatId, message_id: messageId }
          );
        }
      }
      // Handle verification completion
      else if (data === 'verify_complete') {
        // Process verification
        await verificationService.submitVerification(userId, state.data);
        
        // Clear user state
        userStates.delete(userId);
        
        await bot.editMessageText(
          'Thank you! Your verification has been submitted and will be reviewed by our team. You will be notified once the review is complete.',
          { chat_id: chatId, message_id: messageId }
        );
      }
    }
    
    // Always answer callback query
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error('Error handling verification callback:', error);
    
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: 'An error occurred. Please try again.',
      show_alert: true
    });
  }
});

// Handle text messages for verification flow
bot.on('message', async (msg) => {
  // Ignore commands
  if (msg.text && msg.text.startsWith('/')) {
    if (msg.text === '/cancel') {
      const userId = msg.from.id;
      const chatId = msg.chat.id;
      
      if (userStates.has(userId)) {
        userStates.delete(userId);
        await bot.sendMessage(chatId, 'Verification process cancelled.');
      }
    }
    return;
  }
  
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  
  // Check if user is in verification flow
  const state = userStates.get(userId);
  if (!state) return;
  
  try {
    // Handle account ID step
    if (state.step === 'account_id' && msg.text) {
      const accountId = msg.text.trim();
      
      // Validate account ID (example validation)
      if (accountId.length < 5) {
        await bot.sendMessage(
          chatId,
          'Account ID must be at least 5 characters long. Please try again:'
        );
        return;
      }
      
      // Update user state
      state.data.accountId = accountId;
      userStates.set(userId, state);
      
      // Ask for confirmation
      const keyboard = createInlineKeyboard([
        [
          createButton('Yes, correct', 'verify_confirm_yes'),
          createButton('No, change it', 'verify_confirm_no')
        ]
      ]);
      
      await bot.sendMessage(
        chatId,
        `Is this your correct account ID?\n\n${accountId}`,
        { reply_markup: keyboard }
      );
    }
    // Handle screenshot step
    else if (state.step === 'screenshot' && msg.photo) {
      // Get the largest photo (last in array)
      const photo = msg.photo[msg.photo.length - 1];
      const fileId = photo.file_id;
      
      // Update user state
      state.data.screenshotFileId = fileId;
      userStates.set(userId, state);
      
      // Confirm receipt and offer to complete
      const keyboard = createInlineKeyboard([
        [createButton('Submit Verification', 'verify_complete')],
        [createButton('Cancel', 'verify_cancel')]
      ]);
      
      await bot.sendMessage(
        chatId,
        'Screenshot received. Click "Submit Verification" to complete the process.',
        { reply_markup: keyboard }
      );
    }
    // Remind user what to do if they send wrong type of message
    else if (state.step === 'account_id' && !msg.text) {
      await bot.sendMessage(
        chatId,
        'Please send your account ID as text.'
      );
    }
    else if (state.step === 'screenshot' && !msg.photo) {
      await bot.sendMessage(
        chatId,
        'Please send a screenshot image of your broker account.'
      );
    }
  } catch (error) {
    console.error('Error in verification message handler:', error);
    await bot.sendMessage(
      chatId,
      'An error occurred. Please try again or type /cancel to start over.'
    );
  }
});

module.exports = {
  // Export any functions that need to be accessed from other files
};
```

### Dynamic Menu System

This example shows how to implement a dynamic menu system with multiple levels:

```javascript
// src/utils/menuBuilder.js

/**
 * Menu builder for creating dynamic multi-level menus
 */
class MenuBuilder {
  constructor(bot) {
    this.bot = bot;
    this.menus = new Map();
  }
  
  /**
   * Register a menu
   * @param {string} menuId - Unique identifier for the menu
   * @param {Object} options - Menu options
   * @param {string} options.title - Menu title
   * @param {Function} options.getButtons - Function that returns button rows
   */
  registerMenu(menuId, options) {
    this.menus.set(menuId, options);
  }
  
  /**
   * Send a menu to a chat
   * @param {number} chatId - Telegram chat ID
   * @param {string} menuId - Menu identifier
   * @param {Object} [params] - Additional parameters to pass to getButtons
   */
  async sendMenu(chatId, menuId, params = {}) {
    const menu = this.menus.get(menuId);
    
    if (!menu) {
      throw new Error(`Menu "${menuId}" not found`);
    }
    
    const buttons = await menu.getButtons(params);
    
    await this.bot.sendMessage(
      chatId,
      menu.title,
      {
        reply_markup: {
          inline_keyboard: buttons
        },
        parse_mode: 'Markdown'
      }
    );
  }
  
  /**
   * Update an existing message with a menu
   * @param {number} chatId - Telegram chat ID
   * @param {number} messageId - Message ID to update
   * @param {string} menuId - Menu identifier
   * @param {Object} [params] - Additional parameters to pass to getButtons
   */
  async updateMenu(chatId, messageId, menuId, params = {}) {
    const menu = this.menus.get(menuId);
    
    if (!menu) {
      throw new Error(`Menu "${menuId}" not found`);
    }
    
    const buttons = await menu.getButtons(params);
    
    try {
      await this.bot.editMessageText(
        menu.title,
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: buttons
          },
          parse_mode: 'Markdown'
        }
      );
    } catch (error) {
      if (!error.message.includes('message is not modified')) {
        throw error;
      }
    }
  }
  
  /**
   * Setup callback handler for menu navigation
   * @param {string} callbackPrefix - Prefix for menu callbacks (e.g., 'menu_')
   */
  setupCallbackHandler(callbackPrefix = 'menu_') {
    this.bot.on('callback_query', async (callbackQuery) => {
      const data = callbackQuery.data;
      
      if (data.startsWith(callbackPrefix)) {
        const parts = data.substring(callbackPrefix.length).split('_');
        const menuId = parts[0];
        const action = parts.slice(1).join('_');
        
        try {
          await this.handleMenuCallback(callbackQuery, menuId, action);
        } catch (error) {
          console.error('Error handling menu callback:', error);
          
          await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: 'An error occurred. Please try again.',
            show_alert: true
          });
        }
      }
    });
  }
  
  /**
   * Handle menu callbacks
   * @param {Object} callbackQuery - Telegram callback query
   * @param {string} menuId - Menu identifier
   * @param {string} action - Action identifier
   */
  async handleMenuCallback(callbackQuery, menuId, action) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    
    // Navigate to another menu
    if (action === 'back') {
      const menu = this.menus.get(menuId);
      if (menu && menu.parentMenu) {
        await this.updateMenu(chatId, messageId, menu.parentMenu);
      }
    }
    else if (this.menus.has(action)) {
      await this.updateMenu(chatId, messageId, action);
    }
    else {
      // Custom action handler
      const menu = this.menus.get(menuId);
      if (menu && menu.handleAction) {
        await menu.handleAction(callbackQuery, action);
      }
    }
    
    await this.bot.answerCallbackQuery(callbackQuery.id);
  }
}

module.exports = MenuBuilder;
```

Using the menu builder:

```javascript
// src/controllers/menuController.js
const bot = require('../config/bot');
const MenuBuilder = require('../utils/menuBuilder');
const userService = require('../services/userService');
const tradingService = require('../services/tradingService');

// Create menu builder instance
const menuBuilder = new MenuBuilder(bot);

// Register main menu
menuBuilder.registerMenu('main', {
  title: '📱 *Main Menu*\n\nPlease select an option:',
  getButtons: async () => [
    [{ text: '👤 Account', callback_data: 'menu_main_account' }],
    [{ text: '📈 Trading', callback_data: 'menu_main_trading' }],
    [{ text: '🔔 Notifications', callback_data: 'menu_main_notifications' }],
    [{ text: '❓ Help & Support', callback_data: 'menu_main_support' }]
  ]
});

// Register account menu
menuBuilder.registerMenu('account', {
  title: '👤 *Account Menu*\n\nManage your account settings:',
  parentMenu: 'main',
  getButtons: async (params) => {
    const userId = params.userId;
    const user = await userService.getUserByTelegramId(userId);
    
    return [
      [{ text: '📋 My Profile', callback_data: 'menu_account_profile' }],
      [{ text: '💳 Subscription', callback_data: 'menu_account_subscription' }],
      [{ text: '🔐 Security', callback_data: 'menu_account_security' }],
      [{ text: '⬅️ Back to Main Menu', callback_data: 'menu_account_main' }]
    ];
  },
  handleAction: async (callbackQuery, action) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    
    if (action === 'profile') {
      const user = await userService.getUserByTelegramId(userId);
      await bot.sendMessage(
        chatId,
        `*Your Profile*\n\nName: ${user.firstName} ${user.lastName || ''}\nUsername: @${user.username || 'Not set'}\nMember since: ${new Date(user.createdAt).toLocaleDateString()}`,
        { parse_mode: 'Markdown' }
      );
    }
    else if (action === 'subscription') {
      // Handle subscription action
    }
    else if (action === 'security') {
      // Handle security action
    }
  }
});

// Register trading menu
menuBuilder.registerMenu('trading', {
  title: '📈 *Trading Menu*\n\nAccess trading features:',
  parentMenu: 'main',
  getButtons: async () => [
    [{ text: '📊 Latest Signals', callback_data: 'menu_trading_signals' }],
    [{ text: '📉 Market Analysis', callback_data: 'menu_trading_analysis' }],
    [{ text: '📚 Trading Education', callback_data: 'menu_trading_education' }],
    [{ text: '⬅️ Back to Main Menu', callback_data: 'menu_trading_main' }]
  ],
  handleAction: async (callbackQuery, action) => {
    // Handle trading actions
  }
});

// Set up callback handler
menuBuilder.setupCallbackHandler('menu_');

// Command to show main menu
bot.onText(/\/menu/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  await menuBuilder.sendMenu(chatId, 'main', { userId });
});

module.exports = {
  // Export any functions that need to be accessed from other files
};
```

---

By following this guide, you should be able to implement rich, interactive experiences in your OPTRIXTRADES Telegram bot using inline keyboards and callback queries. These features allow you to create intuitive interfaces that guide users through complex workflows and provide easy access to your bot's functionality.