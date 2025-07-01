# OPTRIXTRADES Subscription Tier Implementation

## Overview

This document outlines the implementation of the subscription tier system for OPTRIXTRADES. The system provides different levels of access to bot features based on the user's subscription tier, which is determined by their deposit amount.

## Subscription Tiers

### Free
- **Eligibility**: All registered users
- **Deposit Requirement**: None
- **Features**:
  - Limited access to bot features

### Basic
- **Eligibility**: Users who have completed verification with deposits between $20-$99
- **Deposit Requirement**: $20 minimum
- **Features**:
  - Basic trading signals
  - Market updates
  - Basic bot functions

### Premium
- **Eligibility**: Users who have completed verification with deposits between $100-$499
- **Deposit Requirement**: $100 minimum
- **Features**:
  - Premium trading signals
  - Market analysis
  - Priority support
  - Enhanced bot functions

### VIP
- **Eligibility**: Users who have completed verification with deposits of $500 or more
- **Deposit Requirement**: $500 minimum
- **Features**:
  - VIP trading signals
  - One-on-one consultations
  - Exclusive webinars
  - Custom risk management
  - Full access to all bot functions and tools
  - AI Auto-Trading

## Technical Implementation

### User Model

The User model includes fields for tracking subscription tier and verification status:

```javascript
subscription_tier: {
  type: DataTypes.ENUM('free', 'basic', 'premium', 'vip'),
  allowNull: false,
  defaultValue: 'free'
},
verification_status: {
  type: DataTypes.ENUM('pending', 'verified', 'rejected'),
  allowNull: false,
  defaultValue: 'pending'
},
deposit_amount: {
  type: DataTypes.FLOAT,
  allowNull: true
}
```

### Configuration

Subscription tier thresholds are defined in the application configuration:

```javascript
// Subscription tiers
subscriptionTiers: {
  free: {
    name: 'Free',
    minDeposit: 0,
    features: ['Limited access to bot features']
  },
  basic: {
    name: 'Basic',
    minDeposit: 20,
    features: ['Basic trading signals', 'Market updates', 'Basic bot functions']
  },
  premium: {
    name: 'Premium',
    minDeposit: 100,
    features: ['Premium trading signals', 'Market analysis', 'Priority support', 'Enhanced bot functions']
  },
  vip: {
    name: 'VIP',
    minDeposit: 500,
    features: ['VIP trading signals', 'One-on-one consultations', 'Exclusive webinars', 'Custom risk management', 'Full access to all bot functions and tools', 'AI Auto-Trading']
  }
}
```

### Verification Service

The verification service updates the user's subscription tier based on their deposit amount:

```javascript
// Update subscription tier based on deposit amount
if (depositAmount >= 500) {
  updateData.subscription_tier = 'vip';
} else if (depositAmount >= 100) {
  updateData.subscription_tier = 'premium';
} else if (depositAmount >= 20) {
  updateData.subscription_tier = 'basic';
} else {
  updateData.subscription_tier = 'free';
}
```

### Subscription Middleware

A middleware function is used to restrict access to certain bot features based on the user's subscription tier:

```javascript
const requireSubscriptionTier = (requiredTiers) => {
  return async (handler) => {
    return async (msg, ...args) => {
      try {
        const telegramId = msg.from.id.toString();
        const chatId = msg.chat.id;
        
        // Get user
        const user = await userService.getUserByTelegramId(telegramId);
        
        if (!user) {
          await bot.sendMessage(
            chatId,
            'User not found. Please restart the bot with /start.'
          );
          return;
        }
        
        // Check if user's subscription tier is in the required tiers
        if (!requiredTiers.includes(user.subscription_tier)) {
          const tierNames = requiredTiers.map(tier => {
            switch(tier) {
              case 'basic': return 'Basic';
              case 'premium': return 'Premium';
              case 'vip': return 'VIP';
              default: return tier.charAt(0).toUpperCase() + tier.slice(1);
            }
          }).join(' or ');
          
          await bot.sendMessage(
            chatId,
            `⚠️ This feature is only available for ${tierNames} subscribers.\n\nPlease upgrade your subscription to access this feature.`,
            {
              reply_markup: createInlineKeyboard([[
                { text: '💰 Upgrade Subscription', callback_data: 'upgrade_subscription' }
              ]]).reply_markup
            }
          );
          return;
        }
        
        // If user has required tier, proceed with handler
        return handler(msg, ...args);
      } catch (error) {
        logError(msg.from.id.toString(), 'requireSubscriptionTier', error);
        logger.error('Error in subscription tier middleware:', error);
        await bot.sendMessage(
          msg.chat.id,
          'An error occurred while checking your subscription. Please try again later.'
        );
      }
    };
  };
};
```

### Feature Restriction

Features are restricted based on the user's subscription tier. For example, auto-trading is only available to VIP users:

```javascript
const handleAutoTradeSettings = async (callbackQuery) => {
  // Create a message-like object from the callback query for middleware
  const msg = {
    chat: { id: callbackQuery.message.chat.id },
    from: { id: callbackQuery.from.id }
  };
  
  // Use the subscription middleware to check if user has VIP tier
  return requireVerification()(requireSubscriptionTier(['vip'])(
    async (msg) => {
      // Function implementation...
    }
  ))(msg);
};
```

## User Notification

Users are notified about their subscription tier when their verification is approved:

```javascript
// Add tier-specific information
if (depositAmount >= 500) {
  message += '\n\n🌟 You have been upgraded to VIP tier with access to all premium features including AI Auto-Trading and all bot functions and tools!';
} else if (depositAmount >= 100) {
  message += '\n\n✅ You have been upgraded to Premium tier with access to enhanced bot functions and the OPTRIX Web AI Portal!';
} else if (depositAmount >= 20) {
  message += '\n\n✅ You have been upgraded to Basic tier with access to basic bot functions and trading signals!';
} else {
  message += '\n\n✅ Your account has been verified with Free tier access!';
}
```

## Channel Access

All verified users with a deposit of $20 or more are added to the trading channel, but their access to bot functions is restricted based on their subscription tier:

```javascript
// All verified users are added to the same channel, but with different bot functionality
// based on their subscription tier
if (depositAmount >= 20) {
  try {
    await bot.inviteUserToChannel(premiumChannelId, telegramId);
    await userService.updateChannelMembership(telegramId, 'premium', true);
    logger.info(`Added user ${telegramId} to trading channel`);
  } catch (error) {
    console.error(`Error adding user ${telegramId} to trading channel:`, error);
  }
}

// For backward compatibility, we'll keep the VIP channel membership flag for users with deposits >= $500
// This will be used to determine access to VIP bot functions
if (depositAmount >= 500) {
  try {
    await userService.updateChannelMembership(telegramId, 'vip', true);
    logger.info(`Granted VIP tier access to user ${telegramId}`);
  } catch (error) {
    console.error(`Error granting VIP tier access to user ${telegramId}:`, error);
  }
}
```

## Conclusion

The subscription tier system provides a flexible way to restrict access to bot features based on the user's deposit amount. Users can upgrade their subscription tier by increasing their deposit amount and completing the verification process.