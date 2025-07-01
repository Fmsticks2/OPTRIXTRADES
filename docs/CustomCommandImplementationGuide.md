# Custom Command Implementation Guide

This guide provides detailed instructions for implementing custom commands in the OPTRIXTRADES Telegram bot. By following these steps, you'll be able to extend the bot's functionality with new commands tailored to your specific needs.

## Table of Contents

1. [Understanding the Command Structure](#understanding-the-command-structure)
2. [Planning Your Custom Command](#planning-your-custom-command)
3. [Implementing a Basic Command](#implementing-a-basic-command)
4. [Advanced Command Features](#advanced-command-features)
5. [Testing Your Command](#testing-your-command)
6. [Registering with BotFather](#registering-with-botfather)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [Example: Complete Custom Command](#example-complete-custom-command)

## Understanding the Command Structure

The OPTRIXTRADES bot follows a modular architecture for handling commands:

1. **Controllers**: Handle incoming commands and messages
2. **Services**: Contain business logic
3. **Models**: Represent database entities

Commands are registered using the `bot.onText()` method, which takes a regular expression pattern and a handler function.

## Planning Your Custom Command

Before implementing a new command, consider the following:

1. **Command Purpose**: What will your command do?
2. **Command Name**: Choose a clear, concise name (e.g., `/stats`, `/profile`)
3. **Required Parameters**: Will your command need additional parameters?
4. **User Permissions**: Who should be able to use this command?
5. **Response Type**: Will it return text, images, files, or interactive elements?
6. **Dependencies**: What services or external APIs will it need?

## Implementing a Basic Command

### Step 1: Choose the Appropriate Controller

Decide which controller should handle your new command. If it doesn't fit into any existing controller, consider creating a new one.

For example, if creating a command for user statistics, you might add it to `accountController.js`.

### Step 2: Create the Command Handler Function

```javascript
/**
 * Handle the /stats command - Show user statistics
 * @param {Object} msg - Telegram message object
 * @returns {Promise<void>}
 */
async function handleStats(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  try {
    // Get user data from database
    const user = await userService.getUserByTelegramId(userId);
    
    if (!user) {
      await bot.sendMessage(chatId, 'You need to start the bot first with /start');
      return;
    }
    
    // Prepare statistics message
    const statsMessage = `
📊 *Your Statistics*

Account created: ${new Date(user.createdAt).toLocaleDateString()}
Subscription status: ${user.isSubscribed ? '✅ Active' : '❌ Inactive'}
Last activity: ${new Date(user.lastActivityAt).toLocaleDateString()}
    `;
    
    await bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
    
    // Log user action
    logger.info(`User ${userId} requested statistics`);
  } catch (error) {
    logger.error('Error in handleStats', error);
    await bot.sendMessage(chatId, 'Sorry, an error occurred while retrieving your statistics.');
  }
}
```

### Step 3: Register the Command

Add the command registration in the same controller file:

```javascript
// Register the /stats command
bot.onText(/\/stats/, handleStats);
```

### Step 4: Export the Handler

Add the new handler to the module exports:

```javascript
module.exports = {
  // Existing handlers
  handleStats,
};
```

## Advanced Command Features

### Commands with Parameters

To create a command that accepts parameters, modify the regular expression pattern:

```javascript
// Command with optional parameter: /search [query]
bot.onText(/\/search(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const searchQuery = match[1]; // This will be undefined if no parameter was provided
  
  if (!searchQuery) {
    await bot.sendMessage(chatId, 'Please provide a search query. Example: /search bitcoin');
    return;
  }
  
  // Perform search with the query
  // ...
});
```

### Interactive Commands with Inline Keyboards

Create commands with interactive buttons:

```javascript
bot.onText(/\/menu/, async (msg) => {
  const chatId = msg.chat.id;
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: '📊 Statistics', callback_data: 'show_stats' },
        { text: '💰 Subscription', callback_data: 'show_subscription' }
      ],
      [
        { text: '📱 Account', callback_data: 'show_account' },
        { text: '❓ Help', callback_data: 'show_help' }
      ]
    ]
  };
  
  await bot.sendMessage(
    chatId,
    'Please select an option:',
    { reply_markup: keyboard }
  );
});

// Handle callback queries from inline keyboard
bot.on('callback_query', async (callbackQuery) => {
  const action = callbackQuery.data;
  const msg = callbackQuery.message;
  const userId = callbackQuery.from.id;
  
  switch (action) {
    case 'show_stats':
      // Show statistics
      await handleStats({ chat: { id: msg.chat.id }, from: { id: userId } });
      break;
    case 'show_subscription':
      // Show subscription info
      // ...
      break;
    // Handle other actions
  }
  
  // Answer callback query to remove loading indicator
  await bot.answerCallbackQuery(callbackQuery.id);
});
```

### Admin-Only Commands

Restrict commands to admin users:

```javascript
bot.onText(/\/admin_stats/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  // Check if user is an admin
  const adminIds = process.env.TELEGRAM_ADMIN_IDS.split(',').map(id => parseInt(id.trim()));
  
  if (!adminIds.includes(userId)) {
    await bot.sendMessage(chatId, 'This command is only available to administrators.');
    return;
  }
  
  // Admin-only functionality
  // ...
});
```

### Multi-Step Commands

For commands that require multiple interactions, use state management:

```javascript
// Store user states
const userStates = new Map();

// Start a multi-step process
bot.onText(/\/feedback/, (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  
  userStates.set(userId, { step: 'awaiting_feedback' });
  
  bot.sendMessage(
    chatId,
    'Please provide your feedback. You can cancel anytime by sending /cancel.'
  );
});

// Cancel command
bot.onText(/\/cancel/, (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  
  if (userStates.has(userId)) {
    userStates.delete(userId);
    bot.sendMessage(chatId, 'Operation canceled.');
  }
});

// Handle messages based on user state
bot.on('message', (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const state = userStates.get(userId);
  
  // Ignore messages that are commands
  if (msg.text && msg.text.startsWith('/')) return;
  
  if (!state) return; // No active state for this user
  
  if (state.step === 'awaiting_feedback') {
    // Process feedback
    const feedback = msg.text;
    
    // Save feedback to database
    // ...
    
    bot.sendMessage(chatId, 'Thank you for your feedback!');
    userStates.delete(userId); // Clear state when done
  }
});
```

## Testing Your Command

### Local Testing

1. Ensure your bot is running in development mode
2. Open Telegram and send your new command to the bot
3. Verify that the command works as expected
4. Check the logs for any errors

### Testing Edge Cases

Test various scenarios:

1. What happens if required parameters are missing?
2. What happens if the user doesn't have permission?
3. What happens if the database query fails?
4. What happens if an external API is unavailable?

## Registering with BotFather

After implementing and testing your command, register it with BotFather:

1. Send `/setcommands` to BotFather
2. Select your bot
3. Send a list of commands with descriptions (one command per line)

Example:

```
start - Begin interaction with the bot
help - Show available commands and how to use them
stats - View your account statistics
feedback - Provide feedback about the bot
```

## Best Practices

### Error Handling

Always include proper error handling in your command handlers:

```javascript
try {
  // Command logic
} catch (error) {
  logger.error('Error in command handler', error);
  await bot.sendMessage(chatId, 'Sorry, an error occurred. Please try again later.');
}
```

### Logging

Log important events and errors:

```javascript
logger.info(`User ${userId} executed command ${command}`);
```

### Command Documentation

Add JSDoc comments to describe your command handlers:

```javascript
/**
 * Handle the /stats command - Show user statistics
 * @param {Object} msg - Telegram message object
 * @param {Array} match - Regex match result (if using parameters)
 * @returns {Promise<void>}
 */
```

### Modular Design

Keep your command handlers focused on a single responsibility. Move complex logic to service functions:

```javascript
async function handleStats(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  try {
    // Call service function for business logic
    const stats = await statisticsService.getUserStats(userId);
    
    // Format and send the response
    await bot.sendMessage(chatId, formatStatsMessage(stats), { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in handleStats', error);
    await bot.sendMessage(chatId, 'Sorry, an error occurred.');
  }
}

// Helper function to format the message
function formatStatsMessage(stats) {
  return `
📊 *Your Statistics*

Account created: ${new Date(stats.createdAt).toLocaleDateString()}
Subscription status: ${stats.isSubscribed ? '✅ Active' : '❌ Inactive'}
Last activity: ${new Date(stats.lastActivityAt).toLocaleDateString()}
  `;
}
```

## Troubleshooting

### Command Not Responding

1. Check if the command is registered correctly
2. Verify that the regular expression pattern is correct
3. Add debug logs to see if the handler is being called
4. Check for errors in the console

### Command Conflicts

If multiple handlers are responding to the same command:

1. Check for duplicate command registrations
2. Make sure regular expressions are specific enough
3. Consider using a command router pattern

### Performance Issues

If a command is slow to respond:

1. Optimize database queries
2. Consider caching frequently accessed data
3. Move heavy processing to background jobs

## Example: Complete Custom Command

Here's a complete example of implementing a `/price` command that fetches cryptocurrency prices:

### Step 1: Create a Service Function

Create or update `src/services/cryptoService.js`:

```javascript
const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Fetch cryptocurrency price from CoinGecko API
 * @param {string} coin - Cryptocurrency symbol (e.g., 'bitcoin', 'ethereum')
 * @returns {Promise<Object>} - Price data
 */
async function getCryptoPrice(coin) {
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd,eur&include_24hr_change=true`
    );
    
    if (!response.data[coin]) {
      throw new Error(`Cryptocurrency '${coin}' not found`);
    }
    
    return response.data[coin];
  } catch (error) {
    logger.error('Error fetching crypto price', error);
    throw error;
  }
}

module.exports = {
  getCryptoPrice,
};
```

### Step 2: Create the Command Handler

Add to `src/controllers/tradingController.js`:

```javascript
const bot = require('../config/bot');
const cryptoService = require('../services/cryptoService');
const logger = require('../utils/logger');

/**
 * Handle the /price command - Get cryptocurrency price
 * @param {Object} msg - Telegram message object
 * @param {Array} match - Regex match result
 * @returns {Promise<void>}
 */
async function handlePrice(msg, match) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const coin = match[1]?.toLowerCase();
  
  try {
    if (!coin) {
      await bot.sendMessage(
        chatId,
        'Please specify a cryptocurrency. Example: /price bitcoin'
      );
      return;
    }
    
    // Show typing indicator
    await bot.sendChatAction(chatId, 'typing');
    
    // Get price data
    const priceData = await cryptoService.getCryptoPrice(coin);
    
    // Format price message
    const usdChange = priceData.usd_24h_change ? priceData.usd_24h_change.toFixed(2) : 'N/A';
    const changeEmoji = priceData.usd_24h_change > 0 ? '🟢' : '🔴';
    
    const message = `
💰 *${coin.toUpperCase()} Price*

USD: $${priceData.usd.toLocaleString()}
EUR: €${priceData.eur.toLocaleString()}
24h Change: ${changeEmoji} ${usdChange}%
    `;
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    
    // Log user action
    logger.info(`User ${userId} requested price for ${coin}`);
  } catch (error) {
    if (error.message.includes('not found')) {
      await bot.sendMessage(
        chatId,
        `Sorry, I couldn't find information for '${coin}'. Please check the spelling or try another cryptocurrency.`
      );
    } else {
      logger.error('Error in handlePrice', error);
      await bot.sendMessage(
        chatId,
        'Sorry, an error occurred while fetching the price. Please try again later.'
      );
    }
  }
}

// Register the /price command
bot.onText(/\/price(?:\s+(.+))?/, handlePrice);

// Export handlers
module.exports = {
  // Existing handlers
  handlePrice,
};
```

### Step 3: Update Package Dependencies

Ensure axios is installed:

```bash
npm install axios --save
```

### Step 4: Register with BotFather

Add the command to your bot's command list:

```
price - Get current cryptocurrency prices
```

### Step 5: Test the Command

Test various scenarios:

- `/price bitcoin` - Should show Bitcoin price
- `/price ethereum` - Should show Ethereum price
- `/price` - Should prompt for a cryptocurrency
- `/price invalidcoin` - Should handle not found error

---

By following this guide, you should be able to implement custom commands for your OPTRIXTRADES Telegram bot. Remember to follow best practices for error handling, logging, and modular design to ensure your commands are reliable and maintainable.