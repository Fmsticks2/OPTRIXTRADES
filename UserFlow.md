# OPTRIXTRADES Telegram Bot User Flow

## Overview
This document outlines the user flows implemented in the OPTRIXTRADES Telegram bot, with special focus on the verification process. It details what has been implemented and what might need further development.

## User Registration and Onboarding

1. **Initial Contact**
   - User starts the bot with `/start` command
   - Bot sends welcome message with introduction to OPTRIXTRADES
   - User is prompted to register or login

2. **Registration**
   - User provides necessary information (handled by welcomeController.js)
   - System creates a new user record in the database
   - User is assigned a "Basic" subscription tier by default

## Verification Process (Current Implementation)

1. **Initiating Verification**
   - User selects "Verify Account" option from account menu or verification prompt
   - Bot explains verification requirements (deposit screenshot showing at least $100 for Premium or $1,000 for VIP)
   - User is guided to the verification process (handled by verificationController.js)

2. **Submission Process**
   - User is prompted to enter their broker UID
   - User uploads a screenshot of their deposit
   - System validates the submission format
   - Verification request is stored in the database with "pending" status
   - User receives confirmation that their verification is under review

3. **Admin Review**
   - Admins can view pending verification requests through the admin panel
   - For each request, admins can:
     - View user details
     - View the submitted broker UID
     - View the deposit screenshot
     - Approve as Premium (for deposits $100-$999)
     - Approve as VIP (for deposits $1,000+)
     - Reject with a reason

4. **Verification Outcome**
   - If approved:
     - User's verification status is updated to "verified"
     - User's subscription tier is updated to Premium or VIP based on deposit amount
     - User receives notification of successful verification
     - User gains access to tier-specific features
   - If rejected:
     - Verification status remains "unverified"
     - User receives notification with rejection reason
     - User can submit a new verification request

## Subscription Tiers and Features

1. **Basic (Unverified)**
   - Access to basic trading signals
   - Limited access to support
   - Cannot use auto-trading features

2. **Premium (Verified with $100-$999)**
   - Access to all trading signals
   - Priority support
   - Cannot use auto-trading features

3. **VIP (Verified with $1,000+)**
   - Access to all trading signals
   - Priority support
   - Access to auto-trading features
   - Exclusive VIP-only signals

## Account Management

1. **Viewing Account Information**
   - User can view their profile information
   - Information displayed includes:
     - Username
     - Registration date
     - Verification status
     - Subscription tier
     - Broker UID (if verified)
     - Auto-trading status (for VIPs)

2. **Updating Information**
   - Verified users can update their broker UID
   - Users can toggle notification preferences

3. **Upgrading Subscription**
   - Users can request to upgrade from Basic to Premium/VIP
   - Premium users can upgrade to VIP
   - Upgrade requires new verification with appropriate deposit amount

## Trading Features

1. **Trading Signals**
   - Users receive signals based on their subscription tier
   - Signal notifications can be toggled on/off

2. **Auto-Trading (VIP Only)**
   - VIP users can enable/disable auto-trading
   - Auto-trade notifications can be toggled on/off

## Support System

1. **Creating Support Tickets**
   - Users can create support tickets with subject and message
   - Tickets are stored with status "open"

2. **Managing Tickets**
   - Users can view their active tickets
   - Users can reply to existing tickets
   - Users can close their tickets

3. **Admin Support Management**
   - Admins can view all active tickets
   - Admins can reply to user tickets
   - Admins can close or reopen tickets

## Admin Functions

1. **User Management**
   - Find users by Telegram ID or username
   - View comprehensive user details
   - Ban/unban users
   - Update user subscription tiers

2. **Analytics**
   - Generate daily, weekly, and monthly reports
   - View user statistics, follow-up data, and trading metrics

3. **Broadcast Messages**
   - Send messages to targeted user groups (all, verified, premium, VIP)

## Potential Improvements for Verification Process

1. **Enhanced Validation**
   - Implement image analysis to verify deposit screenshots
   - Add broker API integration to automatically verify deposits

2. **Multi-step Verification**
   - Add email verification step
   - Implement two-factor authentication for high-value accounts

3. **Verification Expiry**
   - Add verification expiry dates requiring periodic re-verification
   - Implement automatic downgrade if verification expires

4. **Partial Verification**
   - Allow partial access to features during verification review

5. **Verification History**
   - Maintain a complete history of verification attempts
   - Allow admins to review past verification decisions

6. **Automated Verification**
   - Implement rules-based auto-approval for certain deposit amounts
   - Add fraud detection algorithms to flag suspicious verification attempts

## Current Implementation Status

- ✅ Basic user registration and onboarding
- ✅ Manual verification process (submission and admin review)
- ✅ Subscription tier management
- ✅ Account information display and updates
- ✅ Trading signals distribution
- ✅ Auto-trading for VIP users
- ✅ Support ticket system
- ✅ Admin panel with user management
- ✅ Analytics reporting
- ✅ Broadcast messaging

## Next Steps

1. Enhance verification process with automated validation
2. Implement verification expiry and renewal process
3. Add more detailed analytics for verification conversion rates
4. Improve user experience during verification waiting period
5. Implement verification appeal process for rejected submissions