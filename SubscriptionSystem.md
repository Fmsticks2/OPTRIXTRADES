# OPTRIXTRADES Subscription System

## Overview

The subscription system is a core component of the OPTRIXTRADES Telegram bot, providing tiered access to features based on user verification status and deposit amount. This document outlines the current implementation, architecture, and potential enhancements for the subscription system.

## Subscription Tiers

### Basic (Unverified)
- **Eligibility**: All registered users
- **Requirements**: None
- **Features**:
  - Access to basic trading signals
  - Limited access to support
  - Cannot use auto-trading features

### Premium (Verified with $100-$999)
- **Eligibility**: Users who have completed verification with deposits between $100-$999
- **Requirements**: 
  - Valid broker UID
  - Screenshot showing deposit of at least $100
  - Admin approval
- **Features**:
  - Access to all trading signals
  - Priority support
  - Cannot use auto-trading features

### VIP (Verified with $1,000+)
- **Eligibility**: Users who have completed verification with deposits of $1,000 or more
- **Requirements**: 
  - Valid broker UID
  - Screenshot showing deposit of at least $1,000
  - Admin approval
- **Features**:
  - Access to all trading signals
  - Priority support
  - Access to auto-trading features
  - Exclusive VIP-only signals

## System Architecture

### Key Components

#### Models

##### User Model (`src/models/User.js`)

Stores user subscription information:

```javascript
{
  // Other user fields...
  subscriptionTier: {
    type: String,
    enum: ['basic', 'premium', 'vip'],
    default: 'basic'
  },
  verificationStatus: {
    type: String,
    enum: ['unverified', 'pending', 'verified', 'rejected'],
    default: 'unverified'
  },
  brokerUid: String,                              // User's broker ID
  depositAmount: Number,                          // User's verified deposit amount
  verificationDate: Date,                         // When user was verified
  verificationExpiryDate: Date,                   // When verification expires (if implemented)
  signalNotifications: { type: Boolean, default: true },  // Receive signal notifications
  autoTrading: { type: Boolean, default: false },        // Auto-trading enabled (VIP only)
  autoTradeNotifications: { type: Boolean, default: true } // Notifications for auto-trades
}
```

##### Verification Model (`src/models/Verification.js`)

Stores verification request data:

```javascript
{
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  telegramId: { type: String, required: true },
  brokerUid: { type: String, required: true },
  screenshotUrl: { type: String, required: true },
  depositAmount: Number,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedTier: {
    type: String,
    enum: ['premium', 'vip', null],
    default: null
  },
  rejectionReason: String,
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: Date,
  reviewedBy: String  // Admin's Telegram ID
}
```

#### Services

##### User Service (`src/services/userService.js`)

Manages user subscription tiers:

```javascript
// Get users by subscription tier
async function getUsersByTier(tier) {...}

// Get users by multiple subscription tiers
async function getUsersByTiers(tiers) {...}

// Update user subscription tier
async function updateSubscriptionTier(telegramId, tier) {...}

// Check if user has access to a feature
async function hasAccess(telegramId, feature) {...}
```

##### Verification Service (`src/services/verificationService.js`)

Manages the verification process that determines subscription tiers:

```javascript
// Create verification request
async function createVerificationRequest(telegramId, brokerUid, screenshotUrl) {...}

// Get pending verification requests
async function getPendingVerifications() {...}

// Approve verification
async function approveVerification(verificationId, tier, adminId) {...}

// Reject verification
async function rejectVerification(verificationId, reason, adminId) {...}
```

#### Controllers

##### Verification Controller (`src/controllers/verificationController.js`)

Manages user interaction with the verification process:

```javascript
// Start verification process
async function handleStartVerification(msg) {...}

// Process broker UID submission
async function processBrokerUid(msg) {...}

// Process screenshot submission
async function processScreenshot(msg) {...}

// Show verification status
async function handleVerificationStatus(msg) {...}
```

##### Admin Controller (Verification-related functions in `src/controllers/adminController.js`)

Manages admin interaction with verification requests:

```javascript
// View pending verifications
async function handlePendingVerifications(msg) {...}

// View verification details
async function handleViewVerification(query) {...}

// Approve verification
async function handleApproveVerification(query) {...}

// Reject verification
async function handleRejectVerification(query) {...}

// Process rejection reason
async function processRejectionReason(msg) {...}
```

## Subscription Management Flow

### User Registration
1. User starts the bot with `/start` command
2. User completes registration process
3. User is assigned the "Basic" subscription tier by default

### Verification and Tier Upgrade
1. User initiates verification process
2. User submits broker UID and deposit screenshot
3. Admin reviews verification request
4. If approved:
   - User's verification status is updated to "verified"
   - User's subscription tier is updated based on deposit amount:
     - $100-$999: Premium tier
     - $1,000+: VIP tier
   - User receives notification of successful verification and new tier
5. If rejected:
   - User remains on Basic tier
   - User receives notification with rejection reason
   - User can submit a new verification request

### Tier-Based Feature Access

The system controls access to features based on the user's subscription tier:

```javascript
// Example of tier-based access control in tradingService.js
async function getSignalsByTier(tier) {
  try {
    let query = { status: 'active' };
    
    if (tier === 'basic') {
      // Basic users only see basic signals
      query.tier = 'basic';
    } else if (tier === 'premium') {
      // Premium users see basic and premium signals
      query.tier = { $in: ['basic', 'premium'] };
    } else if (tier === 'vip') {
      // VIP users see all signals
      // No additional filter needed
    }
    
    return await Trading.find(query).sort({ createdAt: -1 });
  } catch (error) {
    logger.error('Error getting signals by tier:', error);
    throw error;
  }
}

// Example of checking feature access in controller
async function handleAutoTrading(msg) {
  try {
    const chatId = msg.chat.id;
    const user = await userService.getUserById(chatId);
    
    if (!user) {
      return bot.sendMessage(chatId, 'User not found. Please restart the bot with /start.');
    }
    
    // Check if user has VIP access
    if (user.subscriptionTier !== 'vip') {
      return bot.sendMessage(chatId, '⚠️ Auto-trading is only available for VIP users. Please upgrade your subscription to access this feature.');
    }
    
    // Continue with auto-trading settings...
  } catch (error) {
    logger.error('Error handling auto trading:', error);
    await bot.sendMessage(msg.chat.id, 'An error occurred while accessing auto-trading settings. Please try again later.');
  }
}
```

## Current Implementation Status

- ✅ Basic, Premium, and VIP tier definitions
- ✅ User model with subscription tier field
- ✅ Verification model for tracking verification requests
- ✅ Manual verification process for tier assignment
- ✅ Tier-based access control for trading signals
- ✅ VIP-exclusive auto-trading feature
- ✅ Admin interface for managing verifications
- ❌ Subscription expiry system
- ❌ Automated tier assignment based on broker API
- ❌ Subscription renewal process
- ❌ Downgrade mechanism for expired subscriptions

## Potential Enhancements

### 1. Subscription Expiry and Renewal

Implement a system to expire subscriptions after a certain period and require renewal:

```javascript
// Add to User model
const UserSchema = new mongoose.Schema({
  // Existing fields...
  subscriptionExpiryDate: Date,
  subscriptionRenewals: [{
    date: Date,
    previousTier: String,
    newTier: String,
    automatic: Boolean
  }]
});

// Check for expired subscriptions daily
async function checkExpiredSubscriptions() {
  try {
    const now = new Date();
    
    // Find users with expired subscriptions
    const expiredUsers = await User.find({
      subscriptionTier: { $in: ['premium', 'vip'] },
      subscriptionExpiryDate: { $lt: now }
    });
    
    for (const user of expiredUsers) {
      // Downgrade to basic tier
      user.subscriptionTier = 'basic';
      user.verificationStatus = 'expired';
      
      // Record the downgrade
      user.subscriptionRenewals.push({
        date: now,
        previousTier: user.subscriptionTier,
        newTier: 'basic',
        automatic: true
      });
      
      await user.save();
      
      // Notify user
      await bot.sendMessage(user.telegramId, 
        '⚠️ Your subscription has expired. You have been downgraded to the Basic tier. To regain access to premium features, please complete the verification process again.');
    }
    
    return {
      success: true,
      processedCount: expiredUsers.length
    };
  } catch (error) {
    logger.error('Error checking expired subscriptions:', error);
    throw error;
  }
}
```

### 2. Automated Tier Assignment

Integrate with broker APIs to automatically verify deposits and assign tiers:

```javascript
// In verificationService.js
async function verifyDepositWithBrokerApi(brokerUid) {
  try {
    // Call broker API to get account details
    const accountDetails = await brokerService.getAccountDetails(brokerUid);
    
    if (!accountDetails.success) {
      return {
        success: false,
        reason: 'Failed to retrieve account details from broker'
      };
    }
    
    // Verify deposit amount
    const depositAmount = accountDetails.balance;
    
    // Determine tier based on deposit
    let tier = 'basic';
    if (depositAmount >= 1000) {
      tier = 'vip';
    } else if (depositAmount >= 100) {
      tier = 'premium';
    }
    
    return {
      success: true,
      verified: depositAmount >= 100,
      depositAmount,
      tier
    };
  } catch (error) {
    logger.error('Error verifying deposit with broker API:', error);
    throw error;
  }
}
```

### 3. Subscription Analytics

Implement analytics to track subscription metrics:

```javascript
// In analyticsService.js
async function getSubscriptionAnalytics(period = 'month') {
  try {
    // Set date range based on period
    let startDate = new Date();
    if (period === 'day') {
      startDate.setDate(startDate.getDate() - 1);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }
    
    // Get user counts by tier
    const totalUsers = await User.countDocuments();
    const basicUsers = await User.countDocuments({ subscriptionTier: 'basic' });
    const premiumUsers = await User.countDocuments({ subscriptionTier: 'premium' });
    const vipUsers = await User.countDocuments({ subscriptionTier: 'vip' });
    
    // Get verification metrics
    const verifications = await Verification.find({
      submittedAt: { $gte: startDate }
    });
    
    const totalVerifications = verifications.length;
    const approvedVerifications = verifications.filter(v => v.status === 'approved').length;
    const rejectedVerifications = verifications.filter(v => v.status === 'rejected').length;
    const pendingVerifications = verifications.filter(v => v.status === 'pending').length;
    
    // Calculate conversion rates
    const approvalRate = totalVerifications > 0 ? 
      (approvedVerifications / totalVerifications * 100).toFixed(2) : 0;
    
    // Calculate average review time
    let totalReviewTime = 0;
    let reviewedCount = 0;
    
    verifications.forEach(v => {
      if (v.status !== 'pending' && v.reviewedAt && v.submittedAt) {
        totalReviewTime += (v.reviewedAt - v.submittedAt) / (1000 * 60 * 60); // hours
        reviewedCount++;
      }
    });
    
    const avgReviewTime = reviewedCount > 0 ? 
      (totalReviewTime / reviewedCount).toFixed(2) : 0;
    
    return {
      period,
      userCounts: {
        total: totalUsers,
        basic: basicUsers,
        premium: premiumUsers,
        vip: vipUsers
      },
      verificationMetrics: {
        total: totalVerifications,
        approved: approvedVerifications,
        rejected: rejectedVerifications,
        pending: pendingVerifications,
        approvalRate: `${approvalRate}%`,
        avgReviewTime: `${avgReviewTime} hours`
      }
    };
  } catch (error) {
    logger.error('Error generating subscription analytics:', error);
    throw error;
  }
}
```

### 4. Tiered Pricing System

Implement a payment system for subscription tiers as an alternative to deposit verification:

```javascript
// Add to User model
const UserSchema = new mongoose.Schema({
  // Existing fields...
  paymentHistory: [{
    date: Date,
    amount: Number,
    currency: String,
    paymentMethod: String,
    tier: String,
    transactionId: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    }
  }]
});

// In paymentService.js
async function createPaymentLink(telegramId, tier) {
  try {
    const user = await User.findOne({ telegramId });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Determine price based on tier
    let amount = 0;
    if (tier === 'premium') {
      amount = 49.99;
    } else if (tier === 'vip') {
      amount = 99.99;
    }
    
    // Create payment link with payment processor
    const paymentLink = await paymentProcessor.createPayment({
      amount,
      currency: 'USD',
      description: `OPTRIXTRADES ${tier.toUpperCase()} Subscription`,
      metadata: {
        telegramId,
        userId: user._id.toString(),
        tier
      }
    });
    
    // Record pending payment
    user.paymentHistory.push({
      date: new Date(),
      amount,
      currency: 'USD',
      paymentMethod: 'card',
      tier,
      transactionId: paymentLink.transactionId,
      status: 'pending'
    });
    
    await user.save();
    
    return {
      success: true,
      paymentLink: paymentLink.url,
      transactionId: paymentLink.transactionId
    };
  } catch (error) {
    logger.error('Error creating payment link:', error);
    throw error;
  }
}

// Process successful payment webhook
async function processSuccessfulPayment(transactionId) {
  try {
    // Find user with this transaction
    const user = await User.findOne({
      'paymentHistory.transactionId': transactionId
    });
    
    if (!user) {
      throw new Error('User not found for transaction');
    }
    
    // Find the payment record
    const paymentIndex = user.paymentHistory.findIndex(p => 
      p.transactionId === transactionId);
    
    if (paymentIndex === -1) {
      throw new Error('Payment record not found');
    }
    
    // Update payment status
    user.paymentHistory[paymentIndex].status = 'completed';
    
    // Update user subscription
    const tier = user.paymentHistory[paymentIndex].tier;
    user.subscriptionTier = tier;
    user.verificationStatus = 'verified';
    
    // Set expiry date (30 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    user.subscriptionExpiryDate = expiryDate;
    
    await user.save();
    
    // Notify user
    await bot.sendMessage(user.telegramId, 
      `🎉 Your payment has been processed successfully! You now have access to the ${tier.toUpperCase()} subscription tier. Your subscription will expire on ${expiryDate.toDateString()}.`);
    
    return {
      success: true,
      user: {
        telegramId: user.telegramId,
        tier
      }
    };
  } catch (error) {
    logger.error('Error processing successful payment:', error);
    throw error;
  }
}
```

## Conclusion

The Subscription System is a fundamental component of the OPTRIXTRADES Telegram bot, providing tiered access to features based on user verification status. The current implementation includes basic, premium, and VIP tiers with manual verification for tier assignment. Potential enhancements include subscription expiry and renewal, automated tier assignment through broker API integration, subscription analytics, and a tiered pricing system.

The system is designed to be scalable and can be extended with additional features as needed. The modular architecture allows for easy maintenance and future enhancements.