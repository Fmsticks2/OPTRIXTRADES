# OPTRIXTRADES Manual Verification Guide for Administrators

## Overview

This document provides step-by-step instructions for administrators to manually verify users when the automated verification system fails or requires human intervention. Manual verification is a critical process that ensures users can access appropriate subscription tiers based on their deposits while maintaining system integrity.

## When Manual Verification is Required

Manual verification may be necessary in the following scenarios:

1. **Automated System Failure**: When the automated verification system encounters errors or is temporarily unavailable
2. **Ambiguous Verification Evidence**: When deposit screenshots or broker information requires human judgment
3. **Special Cases**: Users with unique circumstances that don't fit standard verification criteria
4. **Verification Appeals**: Users appealing a previously rejected verification request
5. **System Flags**: Verification requests flagged by the system as potentially fraudulent

## Prerequisites

Before performing manual verification, ensure you have:

1. Administrator access to the OPTRIXTRADES bot
2. Access to the admin verification panel
3. Authorization to approve/reject verification requests
4. Familiarity with the verification criteria for each subscription tier

## Manual Verification Process

### 1. Accessing the Admin Verification Panel

1. Log in to your Telegram account
2. Open a chat with the OPTRIXTRADES bot
3. Send the `/admin` command
4. Enter your admin password if prompted
5. Select "Verifications" from the admin menu

### 2. Reviewing Pending Verification Requests

1. The system will display a list of pending verification requests
2. Each request will show:
   - User ID/username
   - Submission date
   - Current status

3. Select a verification request to review by clicking on it

### 3. Examining Verification Details

1. Review the user's information:
   - Registration date
   - Current subscription tier
   - Previous verification history (if any)

2. Check the broker UID provided by the user
   - Verify the format is correct for the specified broker
   - Note any discrepancies or suspicious patterns

3. Examine the deposit screenshot:
   - Click "View Screenshot" to open the image
   - Verify the screenshot shows a valid deposit receipt
   - Confirm the deposit amount is visible and clear
   - Check that the date of the deposit is recent (within 30 days)
   - Verify the broker account matches the provided broker UID

### 4. Verifying Deposit Amounts

Verify that the deposit meets the minimum requirements for the requested tier:

- **Premium Tier**: Minimum deposit of $100 up to $999
- **VIP Tier**: Minimum deposit of $1,000 or more

#### Verification Checks

1. **Currency Conversion**: If the deposit is not in USD, convert to USD using current exchange rates
2. **Multiple Deposits**: If the user has submitted evidence of multiple deposits, ensure they are all for the same broker account
3. **Deposit Date**: Confirm the deposit was made after the user registered with OPTRIXTRADES

### 5. Approving Verification

If the verification meets all requirements:

1. Click the "Approve" button
2. Select the appropriate tier based on the deposit amount:
   - Select "Premium" for deposits between $100-$999
   - Select "VIP" for deposits of $1,000 or more
3. Confirm your decision
4. The system will:
   - Update the user's verification status to "verified"
   - Set the user's subscription tier accordingly
   - Send an automatic notification to the user
   - Record the verification in the system logs

### 6. Rejecting Verification

If the verification does not meet requirements:

1. Click the "Reject" button
2. Enter a detailed reason for rejection, such as:
   - "Insufficient deposit amount (minimum $100 required)"
   - "Screenshot does not clearly show deposit amount"
   - "Broker account does not match provided UID"
   - "Deposit date outside of acceptable timeframe"
3. Confirm your decision
4. The system will:
   - Maintain the user's "unverified" status
   - Send the rejection reason to the user
   - Allow the user to submit a new verification request

### 7. Handling Special Cases

#### Partial Deposits

If a user has made multiple smaller deposits that collectively meet the tier requirements:

1. Request additional screenshots for each deposit
2. Verify all deposits are to the same broker account
3. Confirm the total meets the minimum requirement
4. Approve for the appropriate tier based on the total amount

#### Technical Issues

If a user reports they cannot upload screenshots due to technical issues:

1. Ask them to send the screenshot directly in the chat
2. Save the image manually to your device
3. Upload it to the verification system on their behalf
4. Process the verification as normal

#### Broker Discrepancies

If the broker information doesn't match but the deposit is valid:

1. Request clarification from the user
2. If they provide satisfactory explanation (e.g., multiple accounts), proceed with verification
3. Document the exception in the verification notes

## Post-Verification Actions

### 1. User Communication

While the system automatically notifies users of verification decisions, in special cases you may need to provide additional information:

1. For approved verifications with special circumstances:
   - Explain any special considerations applied
   - Provide information about their new tier benefits

2. For rejected verifications:
   - Provide clear instructions on how to correct the issues
   - Set expectations for resubmission timeframes

### 2. Record Keeping

Ensure proper documentation of all manual verifications:

1. All verification decisions are automatically logged in the system
2. For special cases, add detailed notes explaining the decision
3. For potential fraud cases, flag the account for monitoring

### 3. Follow-up

For certain cases, schedule follow-up actions:

1. For borderline approvals, set a reminder to review the account activity
2. For rejected verifications, check if the user resubmits with corrections
3. For special exceptions, document the precedent for future reference

## Troubleshooting Common Issues

### User Cannot Access Premium Features After Approval

1. Verify the user's subscription tier is correctly set in the database
2. Check if the user has restarted their bot session
3. Manually send the tier update command if necessary

### Screenshot Not Visible in Admin Panel

1. Check S3 storage connectivity
2. Ask the user to resubmit the screenshot
3. If persistent, contact the development team to check storage permissions

### User Reports Not Receiving Verification Notification

1. Check if the notification was sent in the system logs
2. Manually send a verification confirmation message
3. Verify the user hasn't blocked the bot

## Best Practices for Manual Verification

1. **Consistency**: Apply verification criteria consistently across all users
2. **Documentation**: Document unusual cases or exceptions for future reference
3. **Timeliness**: Process verification requests within 24-48 hours
4. **Security**: Be vigilant for fraudulent verification attempts
5. **Communication**: Provide clear explanations for rejections

## Security Considerations

1. **Fraud Detection**: Watch for these red flags:
   - Edited or manipulated screenshots
   - Multiple accounts using the same broker ID
   - Unusual deposit patterns or amounts
   - Screenshots with mismatched dates or timestamps

2. **Admin Account Security**:
   - Never share admin credentials
   - Log out of admin sessions when not in use
   - Regularly change admin passwords
   - Use 2FA if available

## Conclusion

Manual verification is an essential backup process that ensures users can access appropriate subscription tiers even when automated systems fail. By following this guide, administrators can maintain a consistent, fair, and secure verification process that upholds the integrity of the OPTRIXTRADES subscription system while providing excellent service to users.

For any questions or situations not covered in this guide, please contact the development team or senior administration for guidance.