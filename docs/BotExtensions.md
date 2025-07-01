# Bot Extensions

This document describes the custom extensions added to the Telegram Bot API for the OPTRIXTRADES bot.

## Overview

The OPTRIXTRADES bot extends the functionality of the `node-telegram-bot-api` library by adding custom methods to the `TelegramBot` prototype. These extensions are loaded when the bot starts and are available throughout the application.

The extensions provide higher-level functionality that combines multiple Telegram API calls, implements retry logic, error handling, and analytics tracking to create a more robust and maintainable codebase.

## Implementation

The extensions are implemented in `src/utils/botExtensions.js` and are loaded in the main `index.js` file during bot initialization.

### Architecture

The bot extensions follow a modular architecture with the following components:

- **Core Extensions**: The main functionality implemented in `src/utils/botExtensions.js`
- **Configuration**: Centralized settings in `src/config/botExtensions.js`
- **Error Handling**: Custom error types and handling in `src/utils/botErrors.js`
- **Logging**: Comprehensive logging via `src/utils/logger.js`
- **Analytics**: Usage tracking and performance monitoring in `src/utils/analytics.js`

### Dependency Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  botExtensions  │────▶│    botErrors    │     │     logger      │
│                 │     │                 │     │                 │
└────────┬────────┘     └─────────────────┘     └────────▲────────┘
         │                                               │
         │                                               │
         │                                               │
         │                                               │
         │            ┌─────────────────┐               │
         │            │                 │               │
         └───────────▶│    analytics    │───────────────┘
                      │                 │
                      └────────┬────────┘
                               │
                               │
                               │
                      ┌────────▼────────┐
                      │                 │
                      │  configuration  │
                      │                 │
                      └─────────────────┘
```

## Available Extensions

### inviteUserToChannel(channelId, userId, options)

Invites a user to a channel by creating an invite link and sending it to the user.

#### Parameters

- `channelId` (string): The ID of the channel to invite the user to. Can be a channel username (e.g., `@channelname`) or a channel ID (e.g., `-100123456789`).
- `userId` (string): The Telegram ID of the user to invite. Can be a numeric ID or a username (e.g., `@username`).
- `options` (object, optional): Additional options for the invitation:
  - `channelType` (string, optional): Type of channel for message customization (`default`, `premium`, `vip`). Defaults to `default`.
  - `expireHours` (number, optional): Hours until the invite link expires. Defaults to 24 hours.
  - `memberLimit` (number, optional): Maximum number of users who can use the link. Defaults to `null` (unlimited).
  - `createJoinRequest` (boolean, optional): Whether the link creates join requests. Defaults to `false`.

#### Returns

- `Promise<Object>`: A promise that resolves to an object containing:
  - `success` (boolean): Whether the operation was successful
  - `inviteLink` (string): The invite link that was sent to the user
  - `attempts` (number): Number of attempts made before success
  - `responseTime` (number): Time taken to complete the operation in milliseconds

#### Example Usage

**Basic Usage:**

```javascript
try {
  const result = await bot.inviteUserToChannel('-100123456789', '987654321');
  console.log(`User invited successfully with link: ${result.inviteLink}`);
} catch (error) {
  console.error('Failed to invite user to channel:', error);
}
```

**With Custom Options:**

```javascript
try {
  const result = await bot.inviteUserToChannel(
    process.env.PREMIUM_CHANNEL_ID, 
    user.telegramId,
    {
      channelType: 'premium',
      expireHours: 48,
      memberLimit: 5,
      createJoinRequest: true
    }
  );
  console.log(`User invited successfully with link: ${result.inviteLink}`);
} catch (error) {
  if (error.code === 'USER_RATE_LIMIT_EXCEEDED') {
    console.log('User has reached the invitation limit for today');
  } else if (error.code === 'CHANNEL_NOT_FOUND') {
    console.log('The specified channel does not exist');
  } else {
    console.error('Failed to invite user to channel:', error);
  }
}
```

**With Username Format:**

```javascript
try {
  // Using channel username and user username
  const result = await bot.inviteUserToChannel('@mychannel', '@username');
  console.log(`User invited successfully with link: ${result.inviteLink}`);
} catch (error) {
  console.error('Failed to invite user to channel:', error);
}
```

#### Requirements

- The bot must be an administrator in the channel with the appropriate permissions:
  - For `createChatInviteLink`: Requires "Invite Users" admin permission
  - For fallback to `exportChatInviteLink`: Requires at least basic admin rights
- The bot must be able to send messages to the user (the user must have started a conversation with the bot)
- Redis must be configured for rate limiting and analytics tracking (optional but recommended)

#### Implementation Details

The method uses the following Telegram Bot API methods:

1. `createChatInviteLink`: Creates a customized invite link for the channel with expiry, member limits, and join request options
2. `exportChatInviteLink`: Used as a fallback if `createChatInviteLink` fails
3. `sendMessage`: Sends the invite link to the user

#### Sequence Diagram

```
┌─────────┐          ┌──────────────┐          ┌─────────────┐          ┌──────────┐          ┌───────┐
│  User   │          │ botExtensions │          │ Telegram API│          │ analytics│          │ redis │
└────┬────┘          └───────┬───────┘          └──────┬──────┘          └────┬─────┘          └───┬───┘
     │                       │                         │                      │                    │
     │ inviteUserToChannel  │                         │                      │                    │
     │───────────────────────>                         │                      │                    │
     │                       │                         │                      │                    │
     │                       │ Validate IDs            │                      │                    │
     │                       │─────────────────────────>                      │                    │
     │                       │                         │                      │                    │
     │                       │ Check rate limits       │                      │                    │
     │                       │─────────────────────────────────────────────────────────────────────>│
     │                       │                         │                      │                    │
     │                       │ Track invitation attempt│                      │                    │
     │                       │──────────────────────────────────────────────>│                    │
     │                       │                         │                      │                    │
     │                       │ createChatInviteLink    │                      │                    │
     │                       │────────────────────────>│                      │                    │
     │                       │                         │                      │                    │
     │                       │ sendMessage             │                      │                    │
     │                       │────────────────────────>│                      │                    │
     │                       │                         │                      │                    │
     │                       │ Track successful invite │                      │                    │
     │                       │──────────────────────────────────────────────>│                    │
     │                       │                         │                      │                    │
     │ Return result         │                         │                      │                    │
     │<───────────────────────                         │                      │                    │
     │                       │                         │                      │                    │
```

#### Error Handling

The method implements comprehensive error handling:

1. **Input Validation**: Validates channel and user IDs before making API calls
2. **Rate Limiting**: Checks rate limits for both users and channels
3. **Retry Logic**: Automatically retries transient errors with exponential backoff
4. **Error Mapping**: Maps Telegram API errors to custom error types for easier handling
5. **Fallback Mechanism**: Falls back to `exportChatInviteLink` if `createChatInviteLink` fails

#### Analytics

The method tracks the following events:

1. `channel_invitation_attempt`: When an invitation is attempted
2. `channel_invitation`: When an invitation succeeds or fails
3. `rate_limit_exceeded`: When rate limits are exceeded

## Adding New Extensions

To add a new extension to the bot, follow these steps:

1. Open `src/utils/botExtensions.js`
2. Add your new method to the `TelegramBot.prototype`
3. Document your method with JSDoc comments
4. Add appropriate error handling and retry logic
5. Implement analytics tracking for important events
6. Add configuration options to `src/config/botExtensions.js`
7. Add custom error types to `src/utils/botErrors.js` if needed
8. Update this documentation file with details about your new method
9. Add tests in `tests/utils/botExtensions.test.js`

## Best Practices

- **Error Handling**: Use custom error types from `botErrors.js` for consistent error handling
- **Configuration**: Store all configurable values in `config/botExtensions.js`
- **Logging**: Use the logger for all significant events and errors
- **Analytics**: Track important events for monitoring and debugging
- **Rate Limiting**: Implement rate limiting for methods that could be abused
- **Validation**: Validate all inputs before making API calls
- **Retry Logic**: Implement retry logic for transient errors
- **Testing**: Write comprehensive tests for all new functionality

## Troubleshooting Guide

### Common Issues

#### 1. Rate Limit Exceeded

**Symptoms:**
- Error with code `USER_RATE_LIMIT_EXCEEDED` or `CHANNEL_RATE_LIMIT_EXCEEDED`
- High volume of invitation requests failing

**Solutions:**
- Adjust rate limits in `config/botExtensions.js`
- Implement queuing for high-volume scenarios
- Add exponential backoff for retries

#### 2. Permission Errors

**Symptoms:**
- Error with code `CHAT_ADMIN_REQUIRED` or `BOT_NOT_ADMIN`
- Unable to create invite links

**Solutions:**
- Ensure the bot is an administrator in the channel
- Check that the bot has the "Invite Users" permission
- Verify the channel ID is correct

#### 3. User Interaction Errors

**Symptoms:**
- Error with code `USER_NOT_FOUND` or `BLOCKED_BY_USER`
- Unable to send messages to users

**Solutions:**
- Ensure the user has started a conversation with the bot
- Verify the user ID is correct
- Implement a fallback notification mechanism

#### 4. Performance Issues

**Symptoms:**
- Slow response times
- High memory usage

**Solutions:**
- Use the performance tests to identify bottlenecks
- Optimize Redis usage
- Implement caching for frequently used data
- Consider implementing a queue for high-load scenarios

## Monitoring and Maintenance

### Key Metrics to Monitor

1. **Invitation Success Rate**: Track the percentage of successful invitations
2. **Response Time**: Monitor the average time to complete an invitation
3. **Rate Limit Hits**: Track how often rate limits are being reached
4. **Error Distribution**: Monitor the types of errors occurring

### Regular Maintenance Tasks

1. **Review Logs**: Regularly review error logs to identify issues
2. **Update Configuration**: Adjust rate limits and retry settings based on usage patterns
3. **Performance Testing**: Run performance tests periodically to ensure optimal performance
4. **Update Documentation**: Keep this documentation up to date with any changes