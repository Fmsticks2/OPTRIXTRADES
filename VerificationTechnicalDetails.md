# OPTRIXTRADES Verification System: Technical Implementation

## Architecture Overview

The verification system in OPTRIXTRADES follows a modular architecture with clear separation of concerns:

```
User Input → Controller → Service → Model → Database
```

With file uploads handled through a separate utility that interfaces with AWS S3.

## Key Components

### Models

#### Verification Model (`src/models/Verification.js`)

Stores verification request data with the following structure:

```javascript
{
  userId: { type: String, required: true },      // Telegram user ID
  brokerUid: { type: String, required: true },   // Broker account identifier
  screenshotUrl: { type: String, required: true },// S3 URL to deposit screenshot
  status: {                                      // Verification status
    type: String, 
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  submissionDate: { type: Date, default: Date.now },
  reviewDate: Date,                              // When admin reviewed
  rejectionReason: String,                       // If rejected
  approvedTier: {                                // If approved
    type: String,
    enum: ['premium', 'vip']
  }
}
```

#### User Model (`src/models/User.js`)

Stores user data including verification status:

```javascript
{
  // Other user fields...
  telegramId: { type: String, required: true, unique: true },
  isVerified: { type: Boolean, default: false },
  subscriptionTier: { 
    type: String, 
    enum: ['basic', 'premium', 'vip'], 
    default: 'basic' 
  },
  brokerUid: String,                             // Added after verification
  verificationHistory: [{                        // History of verifications
    verificationId: String,                      // Reference to Verification
    date: Date,
    outcome: String,                             // approved/rejected
    tier: String                                 // premium/vip if approved
  }]
}
```

### Services

#### Verification Service (`src/services/verificationService.js`)

Handles business logic for verification operations:

```javascript
// Create new verification request
async function createVerificationRequest(userId, brokerUid, screenshotUrl) {...}

// Get verification status for a user
async function getVerificationStatus(userId) {...}

// Get pending verification requests
async function getPendingVerifications() {...}

// Get specific verification request
async function getVerificationById(verificationId) {...}

// Approve verification
async function approveVerification(verificationId, tier) {...}

// Reject verification
async function rejectVerification(verificationId, reason) {...}

// Check if user has pending verification
async function hasPendingVerification(userId) {...}
```

#### User Service (`src/services/userService.js`)

Handles user-related operations including verification status updates:

```javascript
// Update user verification status
async function updateVerificationStatus(userId, isVerified, tier) {...}

// Update user's broker UID
async function updateBrokerUid(userId, brokerUid) {...}

// Get verified users
async function getVerifiedUsers() {...}

// Get users by subscription tier
async function getUsersByTier(tier) {...}
```

### Controllers

#### Verification Controller (`src/controllers/verificationController.js`)

Manages user interaction for the verification process:

```javascript
// Main verification handler
async function handleVerification(msg) {...}

// Start verification process
async function startVerification(chatId) {...}

// Process broker UID input
async function processBrokerUid(msg) {...}

// Process screenshot upload
async function processScreenshot(msg) {...}

// Check verification status
async function checkVerificationStatus(chatId) {...}
```

#### Admin Controller (`src/controllers/adminController.js`)

Manages admin-side verification review:

```javascript
// Show pending verifications
async function handleAdminVerifications(msg) {...}

// Review specific verification
async function handleVerificationReview(query) {...}

// View verification screenshot
async function handleVerificationScreenshot(query) {...}

// Approve verification
async function handleVerificationApproval(query, tier) {...}

// Reject verification
async function handleVerificationRejection(query) {...}

// Process rejection reason
async function processRejectionReason(msg) {...}
```

### Utilities

#### File Upload (`src/utils/fileUpload.js`)

Handles screenshot uploads to AWS S3:

```javascript
// Upload file to S3
async function uploadToS3(fileId, bot) {...}

// Generate S3 URL
function generateS3Url(key) {...}
```

#### Keyboard Utilities (`src/utils/keyboard.js`)

Generates inline keyboards for verification interactions:

```javascript
// Verification menu keyboard
function getVerificationKeyboard() {...}

// Admin verification review keyboard
function getVerificationReviewKeyboard(verificationId) {...}

// Verification approval options keyboard
function getVerificationApprovalKeyboard(verificationId) {...}
```

## State Management

The verification process uses a state machine approach to manage the multi-step verification flow:

```javascript
// In verificationController.js
const userStates = new Map();

// State constants
const AWAITING_BROKER_UID = 'AWAITING_BROKER_UID';
const AWAITING_SCREENSHOT = 'AWAITING_SCREENSHOT';

// Set user state
function setUserState(userId, state, data = {}) {
  userStates.set(userId, { state, data });
}

// Get user state
function getUserState(userId) {
  return userStates.get(userId);
}

// Clear user state
function clearUserState(userId) {
  userStates.delete(userId);
}
```

Similarly, admin verification review uses state management for multi-step processes like rejection:

```javascript
// In adminController.js
const adminStates = new Map();

// Admin state for rejection reason
function setAdminAwaitingRejectionReason(adminId, verificationId) {
  adminStates.set(adminId, {
    state: 'AWAITING_REJECTION_REASON',
    verificationId
  });
}
```

## Verification Flow Implementation

### User Submission Flow

1. User initiates verification:
   ```javascript
   // User sends /verify command or clicks Verify button
   bot.onText(/\/verify/, handleVerification);
   bot.on('callback_query', (query) => {
     if (query.data === 'verify_account') {
       handleVerification(query.message, query.from.id);
     }
   });
   ```

2. System prompts for broker UID:
   ```javascript
   function startVerification(chatId) {
     // Send verification instructions
     bot.sendMessage(chatId, 'Please enter your broker UID:');
     // Set state to await broker UID
     setUserState(chatId, AWAITING_BROKER_UID);
   }
   ```

3. System processes broker UID and requests screenshot:
   ```javascript
   function processBrokerUid(msg) {
     const chatId = msg.chat.id;
     const brokerUid = msg.text;
     
     // Validate broker UID format if needed
     
     // Update state to await screenshot
     setUserState(chatId, AWAITING_SCREENSHOT, { brokerUid });
     
     // Prompt for screenshot
     bot.sendMessage(chatId, 'Please upload a screenshot of your deposit:');
   }
   ```

4. System processes screenshot and completes submission:
   ```javascript
   async function processScreenshot(msg) {
     const chatId = msg.chat.id;
     const state = getUserState(chatId);
     
     // Get file ID of the photo
     const fileId = msg.photo[msg.photo.length - 1].file_id;
     
     // Upload to S3
     const screenshotUrl = await uploadToS3(fileId, bot);
     
     // Create verification request
     await verificationService.createVerificationRequest(
       chatId.toString(),
       state.data.brokerUid,
       screenshotUrl
     );
     
     // Clear state
     clearUserState(chatId);
     
     // Confirm submission
     bot.sendMessage(chatId, 'Your verification request has been submitted and is pending review.');
   }
   ```

### Admin Review Flow

1. Admin views pending verifications:
   ```javascript
   async function handleAdminVerifications(msg) {
     const chatId = msg.chat.id;
     
     // Get pending verifications
     const verifications = await verificationService.getPendingVerifications();
     
     // Create inline keyboard with verification options
     const keyboard = verifications.map(v => [{
       text: `User: ${v.userId} - ${new Date(v.submissionDate).toLocaleDateString()}`,
       callback_data: `review_verification_${v._id}`
     }]);
     
     bot.sendMessage(chatId, 'Pending verifications:', {
       reply_markup: { inline_keyboard: keyboard }
     });
   }
   ```

2. Admin reviews specific verification:
   ```javascript
   async function handleVerificationReview(query) {
     const chatId = query.message.chat.id;
     const verificationId = query.data.split('_')[2];
     
     // Get verification details
     const verification = await verificationService.getVerificationById(verificationId);
     const user = await userService.getUserById(verification.userId);
     
     // Display verification details
     const message = `
       User: ${user.username || user.telegramId}
       Broker UID: ${verification.brokerUid}
       Submitted: ${new Date(verification.submissionDate).toLocaleString()}
     `;
     
     // Create review keyboard
     const keyboard = getVerificationReviewKeyboard(verificationId);
     
     bot.sendMessage(chatId, message, {
       reply_markup: { inline_keyboard: keyboard }
     });
   }
   ```

3. Admin views screenshot:
   ```javascript
   async function handleVerificationScreenshot(query) {
     const chatId = query.message.chat.id;
     const verificationId = query.data.split('_')[2];
     
     // Get verification details
     const verification = await verificationService.getVerificationById(verificationId);
     
     // Send screenshot
     bot.sendPhoto(chatId, verification.screenshotUrl);
   }
   ```

4. Admin approves verification:
   ```javascript
   async function handleVerificationApproval(query, tier) {
     const chatId = query.message.chat.id;
     const verificationId = query.data.split('_')[2];
     
     // Approve verification
     await verificationService.approveVerification(verificationId, tier);
     
     // Get verification to notify user
     const verification = await verificationService.getVerificationById(verificationId);
     
     // Update user status
     await userService.updateVerificationStatus(
       verification.userId,
       true,
       tier
     );
     
     // Notify admin
     bot.sendMessage(chatId, `Verification approved as ${tier.toUpperCase()}.`);
     
     // Notify user
     bot.sendMessage(verification.userId, 
       `Your account has been verified! Your subscription tier is now ${tier.toUpperCase()}.`);
   }
   ```

5. Admin rejects verification:
   ```javascript
   async function handleVerificationRejection(query) {
     const chatId = query.message.chat.id;
     const verificationId = query.data.split('_')[2];
     
     // Set admin state to await rejection reason
     setAdminAwaitingRejectionReason(chatId, verificationId);
     
     // Prompt for rejection reason
     bot.sendMessage(chatId, 'Please enter the reason for rejection:');
   }
   
   async function processRejectionReason(msg) {
     const chatId = msg.chat.id;
     const state = getAdminState(chatId);
     const reason = msg.text;
     
     // Reject verification
     await verificationService.rejectVerification(
       state.verificationId,
       reason
     );
     
     // Get verification to notify user
     const verification = await verificationService.getVerificationById(state.verificationId);
     
     // Clear admin state
     clearAdminState(chatId);
     
     // Notify admin
     bot.sendMessage(chatId, 'Verification rejected.');
     
     // Notify user
     bot.sendMessage(verification.userId, 
       `Your verification was rejected. Reason: ${reason}. You can submit a new verification request.`);
   }
   ```

## Database Operations

### Creating Verification Request

```javascript
// In verificationService.js
async function createVerificationRequest(userId, brokerUid, screenshotUrl) {
  try {
    const verification = new Verification({
      userId,
      brokerUid,
      screenshotUrl,
      status: 'pending',
      submissionDate: new Date()
    });
    
    await verification.save();
    return verification;
  } catch (error) {
    logger.error('Error creating verification request:', error);
    throw error;
  }
}
```

### Approving Verification

```javascript
// In verificationService.js
async function approveVerification(verificationId, tier) {
  try {
    const verification = await Verification.findById(verificationId);
    
    if (!verification) {
      throw new Error('Verification not found');
    }
    
    verification.status = 'approved';
    verification.approvedTier = tier;
    verification.reviewDate = new Date();
    
    await verification.save();
    
    // Update user record
    const user = await User.findOne({ telegramId: verification.userId });
    
    if (user) {
      user.isVerified = true;
      user.subscriptionTier = tier;
      user.brokerUid = verification.brokerUid;
      
      // Add to verification history
      user.verificationHistory.push({
        verificationId,
        date: new Date(),
        outcome: 'approved',
        tier
      });
      
      await user.save();
    }
    
    return verification;
  } catch (error) {
    logger.error('Error approving verification:', error);
    throw error;
  }
}
```

## Security Considerations

1. **Data Validation**
   - All user inputs are validated before processing
   - Broker UID format validation (if applicable)
   - File type validation for screenshots

2. **Access Control**
   - Admin functions are restricted to authorized users
   - Verification review only available to admins

3. **Secure Storage**
   - Screenshots stored in private S3 buckets
   - Access to screenshots controlled via presigned URLs

4. **Audit Trail**
   - All verification actions are logged
   - Verification history maintained for each user

## Potential Enhancements

### Code-Level Improvements

1. **Automated Verification**
   ```javascript
   // Add to verificationService.js
   async function autoVerifyDeposit(screenshotUrl, userId) {
     // Use OCR service to extract deposit amount
     const depositAmount = await ocrService.extractDepositAmount(screenshotUrl);
     
     // Determine tier based on amount
     let tier = null;
     if (depositAmount >= 1000) {
       tier = 'vip';
     } else if (depositAmount >= 100) {
       tier = 'premium';
     }
     
     // Auto-approve if amount is clear
     if (tier) {
       // Get pending verification
       const verification = await Verification.findOne({
         userId,
         status: 'pending'
       });
       
       if (verification) {
         return approveVerification(verification._id, tier);
       }
     }
     
     // Return null if auto-verification not possible
     return null;
   }
   ```

2. **Verification Expiry**
   ```javascript
   // Add to models/User.js schema
   verificationExpiry: Date,
   
   // Add to verificationService.js
   async function setVerificationExpiry(userId, months = 6) {
     const user = await User.findOne({ telegramId: userId });
     
     if (user && user.isVerified) {
       // Set expiry date
       const expiryDate = new Date();
       expiryDate.setMonth(expiryDate.getMonth() + months);
       
       user.verificationExpiry = expiryDate;
       await user.save();
       
       return expiryDate;
     }
     
     return null;
   }
   
   // Add job to check for expired verifications
   async function checkExpiredVerifications() {
     const now = new Date();
     
     // Find users with expired verification
     const expiredUsers = await User.find({
       isVerified: true,
       verificationExpiry: { $lt: now }
     });
     
     // Process expired users
     for (const user of expiredUsers) {
       // Downgrade to basic
       user.isVerified = false;
       user.subscriptionTier = 'basic';
       
       await user.save();
       
       // Notify user
       bot.sendMessage(user.telegramId, 
         'Your verification has expired. Please verify again to restore your subscription tier.');
     }
   }
   ```

3. **Broker API Integration**
   ```javascript
   // Add to verificationService.js
   async function verifyWithBrokerApi(userId, brokerUid) {
     try {
       // Call broker API to verify account
       const brokerResponse = await brokerApiService.verifyAccount(brokerUid);
       
       if (brokerResponse.verified) {
         // Get deposit amount
         const depositAmount = brokerResponse.depositAmount;
         
         // Determine tier
         let tier = 'basic';
         if (depositAmount >= 1000) {
           tier = 'vip';
         } else if (depositAmount >= 100) {
           tier = 'premium';
         }
         
         // Update user if deposit meets requirements
         if (tier !== 'basic') {
           await userService.updateVerificationStatus(userId, true, tier);
           return { success: true, tier };
         }
       }
       
       return { success: false, reason: 'Insufficient deposit' };
     } catch (error) {
       logger.error('Error verifying with broker API:', error);
       return { success: false, reason: 'API error' };
     }
   }
   ```

## Conclusion

The verification system is implemented with a clear separation of concerns across models, services, and controllers. The current implementation provides a solid foundation for manual verification processes, with potential for enhancement through automation, API integration, and improved security measures.