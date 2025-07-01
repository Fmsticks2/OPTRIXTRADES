# Bot Extensions

This document describes the custom extensions added to the Telegram Bot API for the OPTRIXTRADES bot.

## Overview

The OPTRIXTRADES bot extends the functionality of the `node-telegram-bot-api` library by adding custom methods to the `TelegramBot` prototype. These extensions are loaded when the bot starts and are available throughout the application.

## Implementation

The extensions are implemented in `src/utils/botExtensions.js` and are loaded in the main `index.js` file during bot initialization.

## Available Extensions

### inviteUserToChannel(channelId, userId)

Invites a user to a channel by creating an invite link and sending it to the user.

#### Parameters

- `channelId` (string): The ID of the channel to invite the user to
- `userId` (string): The Telegram ID of the user to invite

#### Returns

- `Promise<Object>`: A promise that resolves to an object containing:
  - `success` (boolean): Whether the operation was successful
  - `inviteLink` (string): The invite link that was sent to the user

#### Example Usage

```javascript
try {
  const result = await bot.inviteUserToChannel(process.env.PREMIUM_CHANNEL_ID, user.telegramId);
  console.log(`User invited successfully with link: ${result.inviteLink}`);
} catch (error) {
  console.error('Failed to invite user to channel:', error);
}
```

#### Requirements

- The bot must be an administrator in the channel with the appropriate permissions to create invite links
- The bot must be able to send messages to the user (the user must have started a conversation with the bot)

#### Implementation Details

The method uses the following Telegram Bot API methods:

1. `exportChatInviteLink`: Creates a new invite link for the channel
2. `sendMessage`: Sends the invite link to the user

## Adding New Extensions

To add a new extension to the bot, follow these steps:

1. Open `src/utils/botExtensions.js`
2. Add your new method to the `TelegramBot.prototype`
3. Document your method with JSDoc comments
4. Update this documentation file with details about your new method

## Notes

- Extensions should be used for functionality that is not available in the official Telegram Bot API
- Extensions should be well-documented and follow the same error handling patterns as the rest of the application
- Consider the permissions required for your extension to work properly