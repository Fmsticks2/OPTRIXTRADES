# Message Handling and Conversation Flows Guide

This guide provides detailed instructions for implementing effective message handling and conversation flows in the OPTRIXTRADES Telegram bot. These techniques allow you to create natural, interactive conversations with users and handle various types of messages beyond simple commands.

## Table of Contents

1. [Understanding Message Types](#understanding-message-types)
2. [Basic Message Handling](#basic-message-handling)
3. [Implementing Conversation Flows](#implementing-conversation-flows)
4. [State Management Techniques](#state-management-techniques)
5. [Handling Media and Documents](#handling-media-and-documents)
6. [Natural Language Processing](#natural-language-processing)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [Complete Examples](#complete-examples)

## Understanding Message Types

Telegram bots can receive various types of messages:

1. **Text Messages**: Regular text sent by users
2. **Commands**: Text messages starting with `/`
3. **Callback Queries**: Generated when users click inline keyboard buttons
4. **Media Messages**: Photos, videos, audio, documents, etc.
5. **Location Messages**: Shared geographical locations
6. **Contact Messages**: Shared contact information
7. **Service Messages**: User joined/left, pinned messages, etc.

Each type requires specific handling to create a seamless user experience.

## Basic Message Handling

### Handling Text Messages

To handle regular text messages (non-commands):

```javascript
const bot = require('../config/bot');
const logger = require('../utils/logger');

// Handle all text messages
bot.on('message', (msg) => {
  // Skip commands (they're handled by bot.onText)
  if (msg.text && msg.text.startsWith('/')) return;
  
  // Skip non-text messages
  if (!msg.text) return;
  
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;
  
  logger.info(`Received message from ${userId}: ${text}`);
  
  // Process the message
  processTextMessage(chatId, userId, text);
});

async function processTextMessage(chatId, userId, text) {
  try {
    // Simple echo response
    await bot.sendMessage(chatId, `You said: ${text}`);
  } catch (error) {
    logger.error('Error processing text message:', error);
    await bot.sendMessage(chatId, 'Sorry, an error occurred while processing your message.');
  }
}
```

### Handling Different Message Types

To handle various message types:

```javascript
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  // Handle different message types
  if (msg.photo) {
    handlePhotoMessage(chatId, userId, msg.photo);
  }
  else if (msg.document) {
    handleDocumentMessage(chatId, userId, msg.document);
  }
  else if (msg.location) {
    handleLocationMessage(chatId, userId, msg.location);
  }
  else if (msg.contact) {
    handleContactMessage(chatId, userId, msg.contact);
  }
  else if (msg.text) {
    // Skip commands
    if (!msg.text.startsWith('/')) {
      handleTextMessage(chatId, userId, msg.text);
    }
  }
});

async function handlePhotoMessage(chatId, userId, photos) {
  // Get the largest photo (last in array)
  const photo = photos[photos.length - 1];
  const fileId = photo.file_id;
  
  try {
    await bot.sendMessage(chatId, `Received your photo with file ID: ${fileId}`);
    // Process the photo...
  } catch (error) {
    logger.error('Error handling photo message:', error);
  }
}

async function handleDocumentMessage(chatId, userId, document) {
  try {
    await bot.sendMessage(
      chatId,
      `Received your document: ${document.file_name} (${document.mime_type})`
    );
    // Process the document...
  } catch (error) {
    logger.error('Error handling document message:', error);
  }
}

async function handleLocationMessage(chatId, userId, location) {
  try {
    await bot.sendMessage(
      chatId,
      `Received your location: ${location.latitude}, ${location.longitude}`
    );
    // Process the location...
  } catch (error) {
    logger.error('Error handling location message:', error);
  }
}

async function handleContactMessage(chatId, userId, contact) {
  try {
    await bot.sendMessage(
      chatId,
      `Received contact: ${contact.first_name} ${contact.last_name || ''}, ${contact.phone_number}`
    );
    // Process the contact...
  } catch (error) {
    logger.error('Error handling contact message:', error);
  }
}

async function handleTextMessage(chatId, userId, text) {
  try {
    await bot.sendMessage(chatId, `You said: ${text}`);
    // Process the text...
  } catch (error) {
    logger.error('Error handling text message:', error);
  }
}
```

## Implementing Conversation Flows

Conversation flows allow your bot to maintain context across multiple messages, creating a natural dialogue with users.

### Simple Question-Answer Flow

```javascript
const userStates = new Map();

// Start a conversation flow
bot.onText(/\/feedback/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  // Set user state
  userStates.set(userId, { flow: 'feedback', step: 'awaiting_rating' });
  
  bot.sendMessage(
    chatId,
    'Please rate our service from 1 to 5 (1 being poor, 5 being excellent):'
  );
});

// Handle user responses in conversation flows
bot.on('message', (msg) => {
  // Skip commands
  if (msg.text && msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  // Check if user is in a conversation flow
  const state = userStates.get(userId);
  if (!state) return;
  
  // Handle feedback flow
  if (state.flow === 'feedback') {
    handleFeedbackFlow(chatId, userId, msg, state);
  }
  // Add other flows as needed
});

async function handleFeedbackFlow(chatId, userId, msg, state) {
  try {
    // Handle rating step
    if (state.step === 'awaiting_rating') {
      const rating = parseInt(msg.text);
      
      if (isNaN(rating) || rating < 1 || rating > 5) {
        await bot.sendMessage(
          chatId,
          'Please provide a valid rating from 1 to 5:'
        );
        return;
      }
      
      // Update state with rating and move to next step
      state.rating = rating;
      state.step = 'awaiting_comment';
      userStates.set(userId, state);
      
      await bot.sendMessage(
        chatId,
        `Thank you for your ${rating}-star rating! Please provide any additional comments or suggestions:`
      );
    }
    // Handle comment step
    else if (state.step === 'awaiting_comment') {
      const comment = msg.text;
      
      // Save feedback to database
      await saveFeedback(userId, state.rating, comment);
      
      // Clear user state
      userStates.delete(userId);
      
      await bot.sendMessage(
        chatId,
        'Thank you for your feedback! We appreciate your input.'
      );
    }
  } catch (error) {
    logger.error('Error in feedback flow:', error);
    await bot.sendMessage(
      chatId,
      'Sorry, an error occurred. Please try again later.'
    );
    userStates.delete(userId);
  }
}

async function saveFeedback(userId, rating, comment) {
  // Save to database
  // This is a placeholder for your actual database logic
  logger.info(`Saving feedback from user ${userId}: Rating ${rating}, Comment: ${comment}`);
}
```

### Multi-Step Form with Validation

```javascript
const userForms = new Map();

// Start registration form
bot.onText(/\/register/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  // Initialize form state
  userForms.set(userId, {
    step: 'name',
    data: {}
  });
  
  bot.sendMessage(
    chatId,
    'Welcome to the registration process! Please enter your full name:'
  );
});

// Cancel form
bot.onText(/\/cancel/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userForms.has(userId)) {
    userForms.delete(userId);
    bot.sendMessage(chatId, 'Registration cancelled.');
  }
});

// Handle form inputs
bot.on('message', (msg) => {
  // Skip commands except /cancel (handled above)
  if (msg.text && msg.text.startsWith('/') && msg.text !== '/cancel') return;
  
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  // Check if user is filling a form
  const form = userForms.get(userId);
  if (!form) return;
  
  processFormStep(chatId, userId, msg, form);
});

async function processFormStep(chatId, userId, msg, form) {
  try {
    switch (form.step) {
      case 'name':
        // Validate name
        if (!msg.text || msg.text.length < 3) {
          await bot.sendMessage(chatId, 'Please enter a valid name (at least 3 characters):');
          return;
        }
        
        // Save name and move to next step
        form.data.name = msg.text;
        form.step = 'email';
        userForms.set(userId, form);
        
        await bot.sendMessage(chatId, 'Please enter your email address:');
        break;
        
      case 'email':
        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!msg.text || !emailRegex.test(msg.text)) {
          await bot.sendMessage(chatId, 'Please enter a valid email address:');
          return;
        }
        
        // Save email and move to next step
        form.data.email = msg.text;
        form.step = 'phone';
        userForms.set(userId, form);
        
        await bot.sendMessage(
          chatId,
          'Please enter your phone number (or send /skip to skip this step):'
        );
        break;
        
      case 'phone':
        // Check if user wants to skip
        if (msg.text === '/skip') {
          form.data.phone = null;
        } else {
          // Validate phone (simple validation)
          const phoneRegex = /^\+?[0-9\s-()]{8,20}$/;
          if (!msg.text || !phoneRegex.test(msg.text)) {
            await bot.sendMessage(
              chatId,
              'Please enter a valid phone number (or send /skip to skip this step):'
            );
            return;
          }
          
          form.data.phone = msg.text;
        }
        
        // Move to confirmation step
        form.step = 'confirmation';
        userForms.set(userId, form);
        
        // Show summary and ask for confirmation
        const summary = `Please confirm your information:\n\nName: ${form.data.name}\nEmail: ${form.data.email}\nPhone: ${form.data.phone || 'Not provided'}`;
        
        const keyboard = {
          inline_keyboard: [
            [
              { text: 'Confirm', callback_data: 'register_confirm' },
              { text: 'Cancel', callback_data: 'register_cancel' }
            ]
          ]
        };
        
        await bot.sendMessage(chatId, summary, { reply_markup: keyboard });
        break;
    }
  } catch (error) {
    logger.error('Error processing form step:', error);
    await bot.sendMessage(
      chatId,
      'Sorry, an error occurred. Please try again or type /cancel to start over.'
    );
  }
}

// Handle form confirmation
bot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const userId = callbackQuery.from.id;
  
  // Handle registration confirmation
  if (data === 'register_confirm' || data === 'register_cancel') {
    const form = userForms.get(userId);
    
    if (form && form.step === 'confirmation') {
      if (data === 'register_confirm') {
        try {
          // Save user data
          await saveUserRegistration(userId, form.data);
          
          await bot.editMessageText(
            'Registration successful! Thank you for registering.',
            {
              chat_id: chatId,
              message_id: msg.message_id
            }
          );
        } catch (error) {
          logger.error('Error saving registration:', error);
          await bot.editMessageText(
            'Sorry, an error occurred during registration. Please try again later.',
            {
              chat_id: chatId,
              message_id: msg.message_id
            }
          );
        }
      } else {
        await bot.editMessageText(
          'Registration cancelled.',
          {
            chat_id: chatId,
            message_id: msg.message_id
          }
        );
      }
      
      // Clear form data
      userForms.delete(userId);
    }
    
    await bot.answerCallbackQuery(callbackQuery.id);
  }
});

async function saveUserRegistration(userId, userData) {
  // Save to database
  // This is a placeholder for your actual database logic
  logger.info(`Saving registration for user ${userId}:`, userData);
}
```

## State Management Techniques

Effective state management is crucial for maintaining conversation context. Here are different approaches:

### In-Memory State Management

The simplest approach is using in-memory Maps or objects:

```javascript
// User states for different conversations
const userStates = new Map();

// Set state
userStates.set(userId, { flow: 'verification', step: 'awaiting_id', data: {} });

// Get state
const state = userStates.get(userId);

// Update state
state.step = 'awaiting_photo';
state.data.accountId = '12345';
userStates.set(userId, state);

// Clear state
userStates.delete(userId);
```

Pros: Simple, fast
Cons: Lost on server restart, not scalable across multiple instances

### Redis-Based State Management

For production, use Redis to store conversation state:

```javascript
const redis = require('redis');
const { promisify } = require('util');

// Create Redis client
const client = redis.createClient(process.env.REDIS_URL);
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);
const delAsync = promisify(client.del).bind(client);

// Set state with expiration (30 minutes)
async function setState(userId, state) {
  const key = `user_state:${userId}`;
  await setAsync(key, JSON.stringify(state), 'EX', 1800);
}

// Get state
async function getState(userId) {
  const key = `user_state:${userId}`;
  const data = await getAsync(key);
  return data ? JSON.parse(data) : null;
}

// Clear state
async function clearState(userId) {
  const key = `user_state:${userId}`;
  await delAsync(key);
}

// Usage in conversation handler
bot.on('message', async (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  
  // Get current state
  const state = await getState(userId);
  
  if (!state) return;
  
  if (state.flow === 'verification') {
    if (state.step === 'awaiting_id' && msg.text) {
      // Update state
      state.data.accountId = msg.text;
      state.step = 'awaiting_photo';
      await setState(userId, state);
      
      await bot.sendMessage(chatId, 'Please send a photo of your ID:');
    }
    // Handle other steps...
  }
});
```

Pros: Persistent across restarts, scalable, automatic expiration
Cons: Slightly more complex, requires Redis

### Database-Based State Management

For complex flows, store state in your database:

```javascript
const db = require('../config/database');

// Create conversation in database
async function createConversation(userId, flow, initialData = {}) {
  const result = await db.query(
    'INSERT INTO conversations (user_id, flow, step, data, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id',
    [userId, flow, 'initial', JSON.stringify(initialData)]
  );
  
  return result.rows[0].id;
}

// Update conversation state
async function updateConversation(userId, step, data) {
  await db.query(
    'UPDATE conversations SET step = $1, data = $2, updated_at = NOW() WHERE user_id = $3 AND active = TRUE',
    [step, JSON.stringify(data), userId]
  );
}

// Get active conversation
async function getActiveConversation(userId) {
  const result = await db.query(
    'SELECT id, flow, step, data FROM conversations WHERE user_id = $1 AND active = TRUE',
    [userId]
  );
  
  if (result.rows.length === 0) return null;
  
  const conversation = result.rows[0];
  return {
    id: conversation.id,
    flow: conversation.flow,
    step: conversation.step,
    data: conversation.data
  };
}

// Complete conversation
async function completeConversation(userId) {
  await db.query(
    'UPDATE conversations SET active = FALSE, completed_at = NOW() WHERE user_id = $1 AND active = TRUE',
    [userId]
  );
}
```

Pros: Persistent, queryable history, complex data structures
Cons: More overhead, requires database schema

## Handling Media and Documents

### Processing Photos

```javascript
bot.on('message', async (msg) => {
  if (!msg.photo) return;
  
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  // Get the largest photo (last in array)
  const photo = msg.photo[msg.photo.length - 1];
  const fileId = photo.file_id;
  
  try {
    // Get file path from Telegram
    const fileInfo = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
    
    // Download the file
    const response = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'stream'
    });
    
    // Generate unique filename
    const fileName = `${Date.now()}_${userId}.jpg`;
    const filePath = path.join(__dirname, '../uploads', fileName);
    
    // Save file to disk
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    // Process the image (example: upload to S3)
    const s3Url = await uploadToS3(filePath, fileName);
    
    // Save to database
    await saveUserPhoto(userId, s3Url);
    
    await bot.sendMessage(chatId, 'Photo received and processed successfully!');
  } catch (error) {
    logger.error('Error processing photo:', error);
    await bot.sendMessage(chatId, 'Sorry, an error occurred while processing your photo.');
  }
});

async function uploadToS3(filePath, fileName) {
  // S3 upload logic
  // This is a placeholder for your actual S3 upload code
  return `https://your-bucket.s3.amazonaws.com/${fileName}`;
}

async function saveUserPhoto(userId, photoUrl) {
  // Database save logic
  // This is a placeholder for your actual database code
  logger.info(`Saving photo URL for user ${userId}: ${photoUrl}`);
}
```

### Processing Documents

```javascript
bot.on('message', async (msg) => {
  if (!msg.document) return;
  
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const document = msg.document;
  
  try {
    // Check file size (limit to 10MB)
    if (document.file_size > 10 * 1024 * 1024) {
      await bot.sendMessage(chatId, 'File is too large. Please upload a file smaller than 10MB.');
      return;
    }
    
    // Check file type (example: only allow PDFs)
    if (document.mime_type !== 'application/pdf') {
      await bot.sendMessage(chatId, 'Only PDF files are allowed.');
      return;
    }
    
    // Get file path from Telegram
    const fileInfo = await bot.getFile(document.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
    
    // Download and process the file
    // Similar to photo processing...
    
    await bot.sendMessage(chatId, `Document "${document.file_name}" received and processed successfully!`);
  } catch (error) {
    logger.error('Error processing document:', error);
    await bot.sendMessage(chatId, 'Sorry, an error occurred while processing your document.');
  }
});
```

## Natural Language Processing

For more advanced message handling, integrate natural language processing (NLP):

### Simple Keyword Matching

```javascript
bot.on('message', (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const text = msg.text.toLowerCase();
  
  // Simple keyword matching
  if (text.includes('price') || text.includes('cost')) {
    bot.sendMessage(chatId, 'Our subscription plans start at $9.99 per month.');
  }
  else if (text.includes('help') || text.includes('support')) {
    bot.sendMessage(chatId, 'For support, please use the /support command or email help@optrixtrades.com');
  }
  else if (text.includes('thank')) {
    bot.sendMessage(chatId, "You're welcome! Is there anything else I can help you with?");
  }
  else {
    bot.sendMessage(chatId, "I'm not sure how to respond to that. Try using one of our commands or ask about our services.");
  }
});
```

### Intent Classification with NLP.js

For more sophisticated NLP, use a library like NLP.js:

```javascript
const { NlpManager } = require('node-nlp');

// Initialize NLP manager
const manager = new NlpManager({ languages: ['en'] });

// Add intents and training phrases
manager.addDocument('en', 'what is the price', 'pricing.inquiry');
manager.addDocument('en', 'how much does it cost', 'pricing.inquiry');
manager.addDocument('en', 'subscription cost', 'pricing.inquiry');

manager.addDocument('en', 'I need help', 'support.request');
manager.addDocument('en', 'can you help me', 'support.request');
manager.addDocument('en', 'support please', 'support.request');

manager.addDocument('en', 'how do I verify my account', 'verification.inquiry');
manager.addDocument('en', 'account verification process', 'verification.inquiry');
manager.addDocument('en', 'verify my trading account', 'verification.inquiry');

// Add answers
manager.addAnswer('en', 'pricing.inquiry', 'Our subscription plans start at $9.99 per month. You can view all plans with /pricing');
manager.addAnswer('en', 'support.request', 'I\'m here to help! Please let me know what you need assistance with, or use /support to contact our team.');
manager.addAnswer('en', 'verification.inquiry', 'To verify your account, use the /verify command and follow the instructions. You\'ll need your broker account ID and a screenshot of your account.');

// Train the model
(async () => {
  await manager.train();
  manager.save('./model.nlp');
  console.log('NLP model trained and saved');
})();

// Use in message handler
bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const text = msg.text;
  
  try {
    // Process with NLP
    const result = await manager.process('en', text);
    
    if (result.intent && result.score > 0.7) {
      // We have a confident match
      await bot.sendMessage(chatId, result.answer);
    } else {
      // No confident match
      await bot.sendMessage(
        chatId,
        "I'm not sure I understand. Please try rephrasing or use one of our commands for specific help."
      );
    }
  } catch (error) {
    logger.error('Error in NLP processing:', error);
    await bot.sendMessage(chatId, 'Sorry, I\'m having trouble understanding right now. Please try again later.');
  }
});
```

## Best Practices

### Organizing Message Handlers

For complex bots, organize message handlers by feature:

```javascript
// src/handlers/messageHandlers.js
const textHandler = require('./messages/textHandler');
const photoHandler = require('./messages/photoHandler');
const documentHandler = require('./messages/documentHandler');
const conversationManager = require('../utils/conversationManager');

/**
 * Set up all message handlers
 * @param {Object} bot - Telegram bot instance
 */
function setupMessageHandlers(bot) {
  bot.on('message', async (msg) => {
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    
    try {
      // Check if user is in a conversation
      const conversation = await conversationManager.getActiveConversation(userId);
      
      if (conversation) {
        // Handle conversation flow
        await handleConversationMessage(bot, msg, conversation);
        return;
      }
      
      // Handle different message types
      if (msg.photo) {
        await photoHandler.handle(bot, msg);
      }
      else if (msg.document) {
        await documentHandler.handle(bot, msg);
      }
      else if (msg.text && !msg.text.startsWith('/')) {
        await textHandler.handle(bot, msg);
      }
      // Other message types...
      
    } catch (error) {
      logger.error('Error handling message:', error);
      await bot.sendMessage(
        chatId,
        'Sorry, an error occurred while processing your message. Please try again later.'
      );
    }
  });
}

async function handleConversationMessage(bot, msg, conversation) {
  const handlers = {
    'registration': require('./conversations/registrationHandler'),
    'verification': require('./conversations/verificationHandler'),
    'feedback': require('./conversations/feedbackHandler'),
    // Add other conversation handlers
  };
  
  const handler = handlers[conversation.flow];
  
  if (handler) {
    await handler.processMessage(bot, msg, conversation);
  } else {
    logger.error(`No handler found for conversation flow: ${conversation.flow}`);
  }
}

module.exports = {
  setupMessageHandlers
};
```

### Timeouts and Expiration

Implement timeouts for conversation flows to prevent stale states:

```javascript
// Set conversation with timeout
async function startConversation(userId, flow, initialData = {}) {
  // Set expiration time (30 minutes from now)
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  
  const conversation = {
    flow,
    step: 'initial',
    data: initialData,
    expiresAt: expiresAt.toISOString()
  };
  
  await setState(userId, conversation);
  
  // Schedule cleanup
  setTimeout(() => {
    checkAndExpireConversation(userId);
  }, 30 * 60 * 1000);
}

// Check if conversation has expired
async function checkAndExpireConversation(userId) {
  const state = await getState(userId);
  
  if (state && new Date(state.expiresAt) <= new Date()) {
    // Conversation expired
    await clearState(userId);
    
    // Notify user if needed
    try {
      await bot.sendMessage(
        userId,
        'Your session has expired due to inactivity. Please start again if needed.'
      );
    } catch (error) {
      logger.error('Error sending expiration notification:', error);
    }
  }
}

// When getting state, check expiration
async function getActiveConversation(userId) {
  const state = await getState(userId);
  
  if (!state) return null;
  
  // Check if expired
  if (new Date(state.expiresAt) <= new Date()) {
    await clearState(userId);
    return null;
  }
  
  return state;
}
```

### Error Handling

Implement robust error handling for message processing:

```javascript
async function processMessage(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  try {
    // Message processing logic
    // ...
  } catch (error) {
    // Log the error with context
    logger.error('Error processing message:', {
      error: error.message,
      stack: error.stack,
      userId,
      chatId,
      messageType: getMessageType(msg)
    });
    
    // Send appropriate error message to user
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      await bot.sendMessage(
        chatId,
        'Sorry, I\'m having trouble connecting to our services. Please try again later.'
      );
    } else if (error.code === 'VALIDATION_ERROR') {
      await bot.sendMessage(
        chatId,
        `Invalid input: ${error.message}. Please try again.`
      );
    } else {
      await bot.sendMessage(
        chatId,
        'Sorry, an error occurred while processing your request. Our team has been notified.'
      );
      
      // Notify admins for critical errors
      notifyAdmins(error, userId, msg);
    }
  }
}

function getMessageType(msg) {
  if (msg.text) return 'text';
  if (msg.photo) return 'photo';
  if (msg.document) return 'document';
  if (msg.location) return 'location';
  if (msg.contact) return 'contact';
  return 'other';
}

async function notifyAdmins(error, userId, msg) {
  const adminIds = process.env.TELEGRAM_ADMIN_IDS.split(',');
  const errorMessage = `🚨 *Error Alert*\n\nUser: ${userId}\nError: ${error.message}\nType: ${getMessageType(msg)}\nTime: ${new Date().toISOString()}`;
  
  for (const adminId of adminIds) {
    try {
      await bot.sendMessage(adminId, errorMessage, { parse_mode: 'Markdown' });
    } catch (err) {
      logger.error(`Failed to notify admin ${adminId}:`, err);
    }
  }
}
```

## Troubleshooting

### Common Issues and Solutions

#### Messages Not Being Processed

**Issue**: Bot receives messages but doesn't process them.

**Solution**: Check event handler registration and ensure you're not filtering out messages unintentionally.

```javascript
// Debug by logging all incoming messages
bot.on('message', (msg) => {
  console.log('Received message:', JSON.stringify(msg, null, 2));
  // Rest of your handler
});
```

#### Conversation State Lost

**Issue**: Bot loses track of conversation state.

**Solution**: Check state management implementation and ensure proper error handling.

```javascript
// Add debugging to state management
async function setState(userId, state) {
  try {
    await setAsync(`user_state:${userId}`, JSON.stringify(state), 'EX', 1800);
    logger.debug(`State set for user ${userId}:`, state);
  } catch (error) {
    logger.error(`Failed to set state for user ${userId}:`, error);
    throw error;
  }
}

async function getState(userId) {
  try {
    const data = await getAsync(`user_state:${userId}`);
    const state = data ? JSON.parse(data) : null;
    logger.debug(`Retrieved state for user ${userId}:`, state);
    return state;
  } catch (error) {
    logger.error(`Failed to get state for user ${userId}:`, error);
    return null;
  }
}
```

#### Handling Unexpected Message Types

**Issue**: Bot crashes when receiving unexpected message types.

**Solution**: Implement comprehensive type checking and fallbacks.

```javascript
bot.on('message', (msg) => {
  // Log message type for debugging
  const messageType = Object.keys(msg).filter(key => {
    return [
      'text', 'photo', 'document', 'sticker', 'audio',
      'video', 'voice', 'contact', 'location', 'venue'
    ].includes(key);
  })[0] || 'unknown';
  
  logger.debug(`Received message of type: ${messageType}`);
  
  // Handle based on type with fallback
  try {
    if (msg.text) {
      handleTextMessage(msg);
    } else if (msg.photo) {
      handlePhotoMessage(msg);
    } else {
      // Fallback for unsupported types
      bot.sendMessage(
        msg.chat.id,
        `I received your ${messageType} message, but I'm not sure how to process it.`
      );
    }
  } catch (error) {
    logger.error(`Error handling ${messageType} message:`, error);
  }
});
```

## Complete Examples

### Verification Flow with Media Handling

This example shows a complete verification flow that handles text messages and photos:

```javascript
// src/controllers/verificationController.js
const bot = require('../config/bot');
const logger = require('../utils/logger');
const userService = require('../services/userService');
const verificationService = require('../services/verificationService');
const s3Service = require('../services/s3Service');
const { createInlineKeyboard, createButton } = require('../utils/keyboard');

// Redis-based state management
const redis = require('../config/redis');

async function getVerificationState(userId) {
  const key = `verification:${userId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

async function setVerificationState(userId, state) {
  const key = `verification:${userId}`;
  // Set with 30 minute expiration
  await redis.set(key, JSON.stringify(state), 'EX', 1800);
}

async function clearVerificationState(userId) {
  const key = `verification:${userId}`;
  await redis.del(key);
}

// Start verification process
bot.onText(/\/verify/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  try {
    // Check if user exists
    const user = await userService.getUserByTelegramId(userId);
    
    if (!user) {
      await bot.sendMessage(
        chatId,
        'Please start the bot with /start before attempting verification.'
      );
      return;
    }
    
    // Check if already verified
    if (user.isVerified) {
      await bot.sendMessage(
        chatId,
        'Your account is already verified! If you need to update your verification, please contact support.'
      );
      return;
    }
    
    // Initialize verification state
    await setVerificationState(userId, {
      step: 'broker_selection',
      data: {},
      startedAt: new Date().toISOString()
    });
    
    // Send broker selection keyboard
    const keyboard = createInlineKeyboard([
      [createButton('Broker A', 'verify_broker_a')],
      [createButton('Broker B', 'verify_broker_b')],
      [createButton('Broker C', 'verify_broker_c')],
      [createButton('Other', 'verify_broker_other')],
      [createButton('Cancel', 'verify_cancel')]
    ]);
    
    await bot.sendMessage(
      chatId,
      'Welcome to the account verification process. Please select your broker:',
      { reply_markup: keyboard }
    );
    
    logger.info(`User ${userId} started verification process`);
  } catch (error) {
    logger.error('Error starting verification:', error);
    await bot.sendMessage(
      chatId,
      'Sorry, an error occurred while starting the verification process. Please try again later.'
    );
  }
});

// Cancel verification
bot.onText(/\/cancel/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  const state = await getVerificationState(userId);
  
  if (state) {
    await clearVerificationState(userId);
    await bot.sendMessage(chatId, 'Verification process cancelled.');
    logger.info(`User ${userId} cancelled verification process`);
  }
});

// Handle verification callbacks
bot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const userId = callbackQuery.from.id;
  
  // Only process verification callbacks
  if (!data.startsWith('verify_')) return;
  
  try {
    const state = await getVerificationState(userId);
    
    if (!state) {
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: 'Verification session expired. Please start again with /verify',
        show_alert: true
      });
      return;
    }
    
    // Handle cancellation
    if (data === 'verify_cancel') {
      await clearVerificationState(userId);
      
      await bot.editMessageText(
        'Verification process cancelled.',
        {
          chat_id: chatId,
          message_id: msg.message_id
        }
      );
      
      logger.info(`User ${userId} cancelled verification via button`);
      await bot.answerCallbackQuery(callbackQuery.id);
      return;
    }
    
    // Handle broker selection
    if (data.startsWith('verify_broker_') && state.step === 'broker_selection') {
      const broker = data.replace('verify_broker_', '');
      
      // Update state
      state.data.broker = broker;
      state.step = 'account_id';
      await setVerificationState(userId, state);
      
      await bot.editMessageText(
        `You selected ${broker === 'other' ? 'Other Broker' : `Broker ${broker.toUpperCase()}`}.\n\nPlease enter your account ID:`,
        {
          chat_id: chatId,
          message_id: msg.message_id
        }
      );
      
      logger.info(`User ${userId} selected broker: ${broker}`);
    }
    
    // Handle confirmation callbacks
    else if (data.startsWith('verify_confirm_')) {
      const action = data.replace('verify_confirm_', '');
      
      if (action === 'id_yes' && state.step === 'confirm_id') {
        // Account ID confirmed, move to screenshot step
        state.step = 'screenshot';
        await setVerificationState(userId, state);
        
        await bot.editMessageText(
          `Account ID confirmed: ${state.data.accountId}\n\nPlease send a screenshot of your broker account showing your name and account ID.`,
          {
            chat_id: chatId,
            message_id: msg.message_id
          }
        );
      }
      else if (action === 'id_no' && state.step === 'confirm_id') {
        // Go back to account ID step
        state.step = 'account_id';
        await setVerificationState(userId, state);
        
        await bot.editMessageText(
          `Please enter your correct account ID:`,
          {
            chat_id: chatId,
            message_id: msg.message_id
          }
        );
      }
      else if (action === 'submit' && state.step === 'confirm_submission') {
        // Submit verification
        try {
          await verificationService.submitVerification(userId, state.data);
          
          await bot.editMessageText(
            'Thank you! Your verification has been submitted and will be reviewed by our team. You will be notified once the review is complete.',
            {
              chat_id: chatId,
              message_id: msg.message_id
            }
          );
          
          // Clear state
          await clearVerificationState(userId);
          
          logger.info(`User ${userId} submitted verification successfully`);
        } catch (error) {
          logger.error(`Error submitting verification for user ${userId}:`, error);
          
          await bot.editMessageText(
            'Sorry, an error occurred while submitting your verification. Please try again later or contact support.',
            {
              chat_id: chatId,
              message_id: msg.message_id
            }
          );
        }
      }
      else if (action === 'cancel' && state.step === 'confirm_submission') {
        // Cancel submission
        await clearVerificationState(userId);
        
        await bot.editMessageText(
          'Verification submission cancelled.',
          {
            chat_id: chatId,
            message_id: msg.message_id
          }
        );
      }
    }
    
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    logger.error('Error handling verification callback:', error);
    
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: 'An error occurred. Please try again.',
      show_alert: true
    });
  }
});

// Handle text messages for verification flow
bot.on('message', async (msg) => {
  // Skip non-text messages and commands (except /cancel which is handled separately)
  if (!msg.text || (msg.text.startsWith('/') && msg.text !== '/cancel')) return;
  
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  try {
    // Get verification state
    const state = await getVerificationState(userId);
    
    if (!state) return; // Not in verification flow
    
    // Handle account ID step
    if (state.step === 'account_id') {
      const accountId = msg.text.trim();
      
      // Validate account ID (simple validation)
      if (accountId.length < 5) {
        await bot.sendMessage(
          chatId,
          'Account ID must be at least 5 characters long. Please try again:'
        );
        return;
      }
      
      // Update state
      state.data.accountId = accountId;
      state.step = 'confirm_id';
      await setVerificationState(userId, state);
      
      // Ask for confirmation
      const keyboard = createInlineKeyboard([
        [
          createButton('Yes, correct', 'verify_confirm_id_yes'),
          createButton('No, change it', 'verify_confirm_id_no')
        ]
      ]);
      
      await bot.sendMessage(
        chatId,
        `Is this your correct account ID?\n\n${accountId}`,
        { reply_markup: keyboard }
      );
    }
  } catch (error) {
    logger.error('Error handling verification text message:', error);
    await bot.sendMessage(
      chatId,
      'Sorry, an error occurred. Please try again or type /cancel to start over.'
    );
  }
});

// Handle photo messages for verification flow
bot.on('message', async (msg) => {
  if (!msg.photo) return;
  
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  try {
    // Get verification state
    const state = await getVerificationState(userId);
    
    if (!state) return; // Not in verification flow
    
    // Handle screenshot step
    if (state.step === 'screenshot') {
      // Get the largest photo (last in array)
      const photo = msg.photo[msg.photo.length - 1];
      const fileId = photo.file_id;
      
      // Show processing message
      await bot.sendMessage(chatId, 'Processing your screenshot...');
      
      // Get file info
      const fileInfo = await bot.getFile(fileId);
      
      // Upload to S3
      const s3Key = `verifications/${userId}/${Date.now()}.jpg`;
      const s3Url = await s3Service.uploadTelegramFile(fileInfo, s3Key);
      
      // Update state
      state.data.screenshotUrl = s3Url;
      state.step = 'confirm_submission';
      await setVerificationState(userId, state);
      
      // Show confirmation
      const keyboard = createInlineKeyboard([
        [createButton('Submit Verification', 'verify_confirm_submit')],
        [createButton('Cancel', 'verify_confirm_cancel')]
      ]);
      
      await bot.sendMessage(
        chatId,
        'Screenshot received and uploaded successfully. Please review your submission:\n\n' +
        `Broker: ${state.data.broker === 'other' ? 'Other' : `Broker ${state.data.broker.toUpperCase()}`}\n` +
        `Account ID: ${state.data.accountId}\n\n` +
        'Click "Submit Verification" to complete the process.',
        { reply_markup: keyboard }
      );
      
      logger.info(`User ${userId} uploaded verification screenshot`);
    }
    else {
      // User sent photo but not in screenshot step
      await bot.sendMessage(
        chatId,
        'I received your photo, but it\'s not the right time in the verification process. ' +
        'Please follow the instructions or type /cancel to start over.'
      );
    }
  } catch (error) {
    logger.error('Error handling verification photo message:', error);
    await bot.sendMessage(
      chatId,
      'Sorry, an error occurred while processing your screenshot. Please try again or type /cancel to start over.'
    );
  }
});

module.exports = {
  // Export any functions that need to be accessed from other files
};
```

---

By following this guide, you should be able to implement sophisticated message handling and conversation flows in your OPTRIXTRADES Telegram bot. These techniques allow you to create natural, interactive experiences that guide users through complex processes while maintaining context across multiple messages.