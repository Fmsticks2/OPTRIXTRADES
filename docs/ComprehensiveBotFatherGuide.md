# Comprehensive BotFather Setup Guide

This guide provides detailed instructions for creating, configuring, and deploying a Telegram bot for the OPTRIXTRADES platform. Follow each step carefully to ensure your bot is properly set up and functional.

## Part 1: Creating Your Bot with BotFather

### Step 1: Start a Chat with BotFather

1. Open Telegram and search for `@BotFather` in the search bar
2. Click on the verified BotFather account (it has a blue checkmark)
3. Start a chat by clicking the "Start" button

### Step 2: Create a New Bot

1. Send the command `/newbot` to BotFather
2. BotFather will ask you to choose a name for your bot
   - This is the display name that will appear in contacts and conversations
   - Example: `OPTRIXTRADES Bot`
3. Next, choose a username for your bot
   - The username must end with "bot" (e.g., `optrixtrades_bot`)
   - The username must be unique across Telegram
   - This will be the @username that users can search for

### Step 3: Get Your Bot Token

1. After successfully creating your bot, BotFather will provide you with a token
2. This token looks something like `123456789:ABCDefGhIJKlmNoPQRsTUVwxyZ`
3. **Important**: Keep this token secure! Anyone with this token can control your bot
4. Save this token in a secure location for later use

## Part 2: Configuring Bot Settings

### Step 1: Set Bot Description

1. Send `/setdescription` to BotFather
2. Select your bot from the list
3. Enter a description for your bot (up to 512 characters)
   - Example: `OPTRIXTRADES official bot for trading signals, account verification, and support.`

### Step 2: Set Bot About Text

1. Send `/setabouttext` to BotFather
2. Select your bot from the list
3. Enter a short about text (up to 120 characters)
   - Example: `Get verified trading signals and manage your OPTRIXTRADES account.`

### Step 3: Set Bot Profile Picture

1. Send `/setuserpic` to BotFather
2. Select your bot from the list
3. Send an image file (square image recommended, at least 640x640 pixels)

### Step 4: Configure Bot Commands

1. Send `/setcommands` to BotFather
2. Select your bot from the list
3. Enter the list of commands with descriptions in the following format:

```
start - Start the bot and register
help - Show help information
verify - Start the verification process
status - Check verification status
signals - View trading signals
history - View trading history
support - Access support system
account - Manage account settings
admin - Access admin panel (admin only)
```

### Step 5: Configure Privacy Settings

1. Send `/setprivacy` to BotFather
2. Select your bot from the list
3. Choose the appropriate privacy mode:
   - **Enabled**: Bot will only receive messages that explicitly mention it or commands
   - **Disabled**: Bot will receive all messages in groups (recommended for moderation bots)
   - For OPTRIXTRADES, select **Enabled** for better privacy

### Step 6: Configure Inline Mode (Optional)

1. Send `/setinline` to BotFather
2. Select your bot from the list
3. If you want to enable inline mode, enter a placeholder text
   - Example: `Search for trading signals...`
   - If you don't need inline mode, you can skip this step

## Part 3: Connecting Your Bot to Your Application

### Step 1: Configure Environment Variables

1. Open your project's `.env` file or create one if it doesn't exist
2. Add the following environment variables:

```
TELEGRAM_BOT_TOKEN=your_bot_token_here
ADMIN_TELEGRAM_IDS=comma_separated_admin_ids
```

3. If you're using webhook mode, add these additional variables:

```
TELEGRAM_USE_WEBHOOK=true
TELEGRAM_WEBHOOK_URL=https://your-domain.com/telegram-webhook
```

### Step 2: Choose Connection Method

#### Polling Mode (Development/Testing)

1. Set `TELEGRAM_USE_WEBHOOK=false` in your environment variables
2. This mode is simpler to set up and ideal for development
3. The bot will periodically check for new messages

#### Webhook Mode (Production)

1. Ensure your server has a valid SSL certificate (Telegram requires HTTPS)
2. Set `TELEGRAM_USE_WEBHOOK=true` in your environment variables
3. Set `TELEGRAM_WEBHOOK_URL` to your webhook endpoint
4. Register your webhook with Telegram by making a request to:

```
https://api.telegram.org/bot<your_token>/setWebhook?url=<your_webhook_url>
```

### Step 3: Deploy Your Application

1. Deploy your application to your hosting provider (e.g., Render, Heroku, AWS)
2. Ensure your environment variables are properly set
3. Start your application

### Step 4: Verify Bot Connection

1. Send a `/start` message to your bot
2. If the bot responds, the connection is successful
3. Check your application logs for any errors if the bot doesn't respond

## Part 4: Adding Your Bot to Channels

### Step 1: Create a Channel (If Needed)

1. In Telegram, click on the pencil icon (new message)
2. Select "New Channel"
3. Enter a channel name and description
4. Choose whether the channel is public or private
5. Add members or skip this step

### Step 2: Add the Bot to Your Channel

1. Go to your channel
2. Click on the channel name at the top to open channel info
3. Select "Administrators"
4. Click "Add Administrator"
5. Search for your bot by its username and select it

### Step 3: Configure Bot Permissions

1. When adding your bot as an administrator, grant these permissions:
   - **Required permissions**:
     - Send Messages
     - Edit Messages
     - Delete Messages
     - Invite Users via Link (if your bot needs to invite users)
   - **Optional permissions** (depending on your bot's functionality):
     - Pin Messages
     - Manage Voice Chats
     - Remain Anonymous

### Step 4: Get the Channel ID

1. Forward a message from your channel to a bot like @username_to_id_bot
2. The bot will reply with the channel ID (usually in the format `-100xxxxxxxxxx`)
3. Add this ID to your environment variables:

```
PREMIUM_CHANNEL_ID=-100xxxxxxxxxx
```

## Part 5: Testing and Troubleshooting

### Step 1: Test Basic Commands

1. Send `/start` to your bot
2. Verify that your bot responds with the welcome message
3. Test other commands like `/help`, `/verify`, etc.

### Step 2: Test Channel Functionality

1. If your bot posts to channels, verify that it can post messages
2. Test any channel-specific functionality

### Step 3: Common Troubleshooting

#### Bot Not Responding

1. Check that your application is running
2. Verify that the correct bot token is set in your environment variables
3. If using webhook mode, ensure your webhook URL is accessible and properly configured
4. Check your application logs for errors

#### Cannot Add Bot to Channel

1. Ensure you are the creator or an administrator of the channel
2. Check that your bot is not blocked by Telegram
3. Try restarting the bot by sending `/restart` to BotFather

#### Bot Cannot Send Messages to Channel

1. Verify that the bot has the necessary administrator permissions
2. Check that you're using the correct channel ID in your code
3. Ensure your bot has not been restricted by Telegram

## Part 6: Security Best Practices

1. Never share your bot token publicly
2. Use environment variables to store sensitive information
3. Implement proper authentication for admin commands
4. Consider implementing rate limiting to prevent abuse
5. Regularly rotate your bot token if you suspect it has been compromised

## Part 7: Maintenance and Updates

### Step 1: Regular Checks

1. Periodically check that your bot is responding correctly
2. Monitor your application logs for errors
3. Keep your dependencies updated

### Step 2: Updating Bot Settings

1. You can update your bot's settings at any time by sending the appropriate command to BotFather
2. To update commands, send `/setcommands` to BotFather again
3. To update the description, send `/setdescription` to BotFather

## Additional Resources

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [BotFather Commands Reference](https://core.telegram.org/bots#botfather-commands)
- [node-telegram-bot-api Documentation](https://github.com/yagop/node-telegram-bot-api)

---

Congratulations! Your OPTRIXTRADES Telegram bot should now be fully set up and functional. If you encounter any issues, refer to the troubleshooting section or consult the additional resources provided.