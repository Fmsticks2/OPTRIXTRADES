# Command Handler Setup Guide

This guide explains how to set up and register command handlers for the OPTRIXTRADES Telegram bot. Understanding this process is essential for adding new commands or modifying existing ones.

## Command Handler Architecture

The OPTRIXTRADES bot follows a modular architecture for handling commands:

1. **Controllers**: Handle incoming commands and messages
2. **Services**: Contain business logic
3. **Models**: Represent database entities

## Command Registration Process

### Step 1: Create a Command Handler Function

Command handlers are typically defined in controller files located in `src/controllers/`. Each handler is a function that processes a specific command.

Example of a command handler function:

```javascript
/**
 * Handle the /start command
 * @param {Object} msg - Telegram message object
 * @returns {Promise<void>}
 */
async function handleStart(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  try {
    // Create or update user in database
    await userService.createOrUpdateUser({
      telegramId: userId,
      username: msg.from.username,
      firstName: msg.from.first_name,
      lastName: msg.from.last_name
    });
    
    // Send welcome message
    const keyboard = createInlineKeyboard([
      [{ text: 'Get Started', callback_data: 'get_started' }]
    ]);
    
    await bot.sendMessage(
      chatId,
      'Welcome to OPTRIXTRADES! I can help you with trading signals and account verification.',
      { reply_markup: keyboard }
    );
    
    // Log user action
    logUserAction(userId, 'Started bot');
  } catch (error) {
    logError('Error in handleStart', error);
    await bot.sendMessage(chatId, 'Sorry, an error occurred. Please try again later.');
  }
}
```

### Step 2: Register the Command

Commands are registered using the `bot.onText()` method, which takes a regular expression pattern and a handler function.

Example of command registration:

```javascript
// Register the /start command
bot.onText(/\/start/, handleStart);
```

This registers the `handleStart` function to be called whenever a user sends the `/start` command to the bot.

### Step 3: Handle Callback Queries

For inline keyboard buttons, you need to register a callback query handler using `bot.on('callback_query', ...)`.

Example:

```javascript
// Handle callback queries
bot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  const msg = callbackQuery.message;
  const userId = callbackQuery.from.id;
  
  // Handle different callback data
  switch (data) {
    case 'get_started':
      await handleGetStarted(msg, userId);
      break;
    case 'verify_account':
      await handleVerification(msg, userId);
      break;
    // Add more cases as needed
  }
  
  // Answer callback query to remove loading indicator
  await bot.answerCallbackQuery(callbackQuery.id);
});
```

### Step 4: Export the Handlers

Export the handler functions at the end of the controller file:

```javascript
module.exports = {
  handleStart,
  handleHelp,
  // Export other handlers
};
```

## Adding a New Command

Follow these steps to add a new command to the bot:

### Step 1: Create the Handler Function

Create a new handler function in the appropriate controller file:

```javascript
/**
 * Handle the /newcommand command
 * @param {Object} msg - Telegram message object
 * @returns {Promise<void>}
 */
async function handleNewCommand(msg) {
  const chatId = msg.chat.id;
  
  try {
    // Implement command logic here
    await bot.sendMessage(chatId, 'This is a response from the new command!');
  } catch (error) {
    logError('Error in handleNewCommand', error);
    await bot.sendMessage(chatId, 'Sorry, an error occurred. Please try again later.');
  }
}
```

### Step 2: Register the Command

Add the command registration in the same controller file:

```javascript
// Register the /newcommand command
bot.onText(/\/newcommand/, handleNewCommand);
```

### Step 3: Export the Handler

Add the new handler to the module exports:

```javascript
module.exports = {
  // Existing handlers
  handleNewCommand,
};
```

### Step 4: Update BotFather Command List

Update the command list in BotFather to make the new command visible to users:

1. Send `/setcommands` to BotFather
2. Select your bot
3. Add your new command to the list:
   ```
   newcommand - Description of your new command
   ```

## Best Practices for Command Handlers

1. **Error Handling**: Always wrap your handler logic in try/catch blocks
2. **Logging**: Log important actions and errors
3. **User Validation**: Check user permissions when needed
4. **Modular Design**: Keep handlers focused on a single responsibility
5. **Service Layer**: Move business logic to service files
6. **Documentation**: Add JSDoc comments to describe handler functionality

## Command Handler Examples

### Basic Command Handler

```javascript
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, 'Here are the available commands:\n/start - Start the bot\n/help - Show this help message');
});
```

### Command with Parameters

```javascript
bot.onText(/\/echo (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1]; // Captured parameter
  await bot.sendMessage(chatId, `You said: ${text}`);
});
```

### Admin-Only Command

```javascript
bot.onText(/\/admin/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isAdmin(userId)) {
    await bot.sendMessage(chatId, 'Sorry, this command is only available to administrators.');
    return;
  }
  
  // Admin command logic here
  await bot.sendMessage(chatId, 'Welcome, admin! Here are your options...');
});
```

## Debugging Command Handlers

If a command isn't working as expected:

1. Check the command registration pattern
2. Verify the handler function is being called (add console.log statements)
3. Look for errors in the logs
4. Ensure the bot has the necessary permissions
5. Test the command in a private chat with the bot

## Advanced Command Handling

### Command State Management

For multi-step commands, you can use a state management approach:

```javascript
// Store user states
const userStates = new Map();

// Start a multi-step process
bot.onText(/\/verify/, (msg) => {
  const userId = msg.from.id;
  userStates.set(userId, { step: 'awaiting_broker_id' });
  bot.sendMessage(msg.chat.id, 'Please enter your broker ID:');
});

// Handle messages based on user state
bot.on('message', (msg) => {
  const userId = msg.from.id;
  const state = userStates.get(userId);
  
  if (!state) return; // No active state for this user
  
  if (state.step === 'awaiting_broker_id') {
    // Process broker ID
    const brokerId = msg.text;
    userStates.set(userId, { step: 'awaiting_screenshot', brokerId });
    bot.sendMessage(msg.chat.id, 'Now please upload a screenshot of your broker account:');
  } else if (state.step === 'awaiting_screenshot') {
    // Process screenshot
    if (msg.photo) {
      // Handle photo upload
      // ...
      userStates.delete(userId); // Clear state when done
    } else {
      bot.sendMessage(msg.chat.id, 'Please upload a screenshot image.');
    }
  }
});
```

---

By following this guide, you should be able to understand, modify, and create command handlers for the OPTRIXTRADES Telegram bot. Remember to test your commands thoroughly before deploying to production.