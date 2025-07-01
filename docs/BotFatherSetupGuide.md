# Telegram Bot Setup Guide

This guide will walk you through the process of creating a Telegram bot using BotFather, configuring it for your application, and adding it to a channel.

## Creating a Bot with BotFather

BotFather is the official bot that allows you to create and manage Telegram bots.

### Step 1: Start a Chat with BotFather

1. Open Telegram and search for `@BotFather`
2. Start a chat with BotFather by clicking the "Start" button

### Step 2: Create a New Bot

1. Send the command `/newbot` to BotFather
2. BotFather will ask you to choose a name for your bot
   - This is the display name that will appear in contacts and conversations
3. Next, choose a username for your bot
   - The username must end with "bot" (e.g., `optrixtrades_bot`)
   - The username must be unique across Telegram

### Step 3: Get Your Bot Token

1. After successfully creating your bot, BotFather will provide you with a token
2. This token looks something like `123456789:ABCDefGhIJKlmNoPQRsTUVwxyZ`
3. **Important**: Keep this token secure! Anyone with this token can control your bot

### Step 4: Configure Bot Settings (Optional)

You can customize various aspects of your bot:

1. Send `/mybots` to BotFather
2. Select your bot from the list
3. You can configure:
   - Bot description: `/setdescription`
   - About text: `/setabouttext`
   - Profile picture: `/setuserpic`
   - Commands list: `/setcommands`
   - Privacy mode: `/setprivacy`
   - Inline mode: `/setinline`

## Linking Your Deployed Bot to the Telegram Bot

After creating your bot on Telegram, you need to connect it to your deployed application.

### Step 1: Configure Environment Variables

1. Add the bot token to your application's environment variables:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   ```

2. If using webhook mode, set the webhook URL:
   ```
   TELEGRAM_USE_WEBHOOK=true
   TELEGRAM_WEBHOOK_URL=https://your-domain.com/telegram-webhook
   ```

### Step 2: Choose Connection Method

Telegram bots can connect to the Telegram API in two ways:

#### Polling Mode (Simpler)

1. Set `TELEGRAM_USE_WEBHOOK=false` in your environment variables
2. Your application will periodically check for new messages
3. This is easier to set up but less efficient for production

#### Webhook Mode (Recommended for Production)

1. Ensure your server has a valid SSL certificate (Telegram requires HTTPS)
2. Set `TELEGRAM_USE_WEBHOOK=true` in your environment variables
3. Set `TELEGRAM_WEBHOOK_URL` to your webhook endpoint
4. Register your webhook with Telegram by making a request to:
   ```
   https://api.telegram.org/bot<your_token>/setWebhook?url=<your_webhook_url>
   ```

### Step 3: Deploy Your Application

1. Deploy your application to your hosting provider
2. Ensure your environment variables are properly set
3. Start your application
4. Verify the connection by sending a message to your bot

## Adding Your Bot to a Channel

To use your bot in a channel, you need to add it as an administrator.

### Step 1: Create a Channel (If Needed)

1. In Telegram, click on the pencil icon (new message)
2. Select "New Channel"
3. Follow the prompts to create your channel

### Step 2: Add the Bot to Your Channel

1. Go to your channel
2. Click on the channel name at the top to open channel info
3. Select "Administrators"
4. Click "Add Administrator"
5. Search for your bot by its username and select it

### Step 3: Configure Bot Permissions

When adding your bot as an administrator, you need to grant it specific permissions:

1. **Required permissions**:
   - Send Messages
   - Edit Messages
   - Delete Messages
   - Invite Users via Link (if your bot needs to invite users)

2. **Optional permissions** (depending on your bot's functionality):
   - Pin Messages
   - Manage Voice Chats
   - Remain Anonymous

### Step 4: Get the Channel ID

To interact with the channel programmatically, you need its ID:

1. Forward a message from your channel to a bot like @username_to_id_bot
2. The bot will reply with the channel ID (usually in the format `-100xxxxxxxxxx`)
3. Add this ID to your environment variables:
   ```
   PREMIUM_CHANNEL_ID=-100xxxxxxxxxx
   ```

## Testing Your Bot

1. Send a message to your bot in a private chat
2. Verify that your application receives the message and responds correctly
3. Test channel functionality by having your bot post to the channel

## Troubleshooting

### Bot Not Responding

1. Check that your application is running
2. Verify that the correct bot token is set in your environment variables
3. If using webhook mode, ensure your webhook URL is accessible and properly configured

### Cannot Add Bot to Channel

1. Ensure you are the creator or an administrator of the channel
2. Check that your bot is not blocked by Telegram
3. Try restarting the bot by sending `/restart` to BotFather

### Bot Cannot Send Messages to Channel

1. Verify that the bot has the necessary administrator permissions
2. Check that you're using the correct channel ID in your code
3. Ensure your bot has not been restricted by Telegram

## Security Considerations

1. Never share your bot token publicly
2. Use environment variables to store sensitive information
3. Implement proper authentication for admin commands
4. Consider implementing rate limiting to prevent abuse

## Additional Resources

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [BotFather Commands Reference](https://core.telegram.org/bots#botfather-commands)
- [node-telegram-bot-api Documentation](https://github.com/yagop/node-telegram-bot-api)