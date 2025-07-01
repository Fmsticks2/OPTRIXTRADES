# User Authentication and Authorization Guide

This guide provides detailed instructions for implementing secure user authentication and authorization in the OPTRIXTRADES Telegram bot. These features ensure that only legitimate users can access the bot and that different user roles have appropriate access levels.

## Table of Contents

1. [Understanding Authentication vs. Authorization](#understanding-authentication-vs-authorization)
2. [User Registration Process](#user-registration-process)
3. [Authentication Methods](#authentication-methods)
4. [User Roles and Permissions](#user-roles-and-permissions)
5. [Implementing Role-Based Access Control](#implementing-role-based-access-control)
6. [Secure Storage of User Credentials](#secure-storage-of-user-credentials)
7. [Session Management](#session-management)
8. [Security Best Practices](#security-best-practices)
9. [Complete Implementation Examples](#complete-implementation-examples)

## Understanding Authentication vs. Authorization

**Authentication** verifies the identity of a user ("Who are you?"), while **authorization** determines what actions they can perform ("What can you do?").

In the context of the OPTRIXTRADES bot:
- **Authentication**: Verifying that users are who they claim to be
- **Authorization**: Controlling access to specific commands and features based on user roles

## User Registration Process

### Basic Registration Flow

1. User initiates registration with `/start` or `/register`
2. Bot collects necessary information (name, email, etc.)
3. Bot verifies the information (email verification, etc.)
4. User account is created in the database
5. User is assigned initial role/permissions

### Implementation Example

```javascript
// src/controllers/registrationController.js
const bot = require('../config/bot');
const logger = require('../utils/logger');
const userService = require('../services/userService');
const emailService = require('../services/emailService');
const { createInlineKeyboard, createButton } = require('../utils/keyboard');

// Redis for state management
const redis = require('../config/redis');

// Start registration process
bot.onText(/\/register/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  try {
    // Check if user already exists
    const existingUser = await userService.getUserByTelegramId(userId);
    
    if (existingUser) {
      await bot.sendMessage(
        chatId,
        'You are already registered! If you need help, use /support.'
      );
      return;
    }
    
    // Initialize registration state
    await redis.set(
      `registration:${userId}`,
      JSON.stringify({
        step: 'name',
        data: {},
        startedAt: new Date().toISOString()
      }),
      'EX',
      1800 // 30 minutes expiration
    );
    
    await bot.sendMessage(
      chatId,
      'Welcome to OPTRIXTRADES registration!\n\nPlease enter your full name:'
    );
    
    logger.info(`User ${userId} started registration process`);
  } catch (error) {
    logger.error('Error starting registration:', error);
    await bot.sendMessage(
      chatId,
      'Sorry, an error occurred. Please try again later.'
    );
  }
});

// Handle registration messages
bot.on('message', async (msg) => {
  // Skip commands except /cancel
  if (msg.text && msg.text.startsWith('/') && msg.text !== '/cancel') return;
  
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  try {
    // Get registration state
    const stateJson = await redis.get(`registration:${userId}`);
    if (!stateJson) return; // Not in registration flow
    
    const state = JSON.parse(stateJson);
    
    // Process based on current step
    switch (state.step) {
      case 'name':
        await processNameStep(chatId, userId, msg, state);
        break;
      case 'email':
        await processEmailStep(chatId, userId, msg, state);
        break;
      case 'verification_code':
        await processVerificationStep(chatId, userId, msg, state);
        break;
      // Add more steps as needed
    }
  } catch (error) {
    logger.error('Error in registration flow:', error);
    await bot.sendMessage(
      chatId,
      'Sorry, an error occurred. Please try again or use /cancel to start over.'
    );
  }
});

async function processNameStep(chatId, userId, msg, state) {
  if (!msg.text) {
    await bot.sendMessage(chatId, 'Please enter your name as text:');
    return;
  }
  
  const name = msg.text.trim();
  
  // Validate name
  if (name.length < 3) {
    await bot.sendMessage(chatId, 'Name must be at least 3 characters long. Please try again:');
    return;
  }
  
  // Update state
  state.data.name = name;
  state.step = 'email';
  await redis.set(`registration:${userId}`, JSON.stringify(state), 'EX', 1800);
  
  await bot.sendMessage(chatId, `Thanks, ${name}! Now please enter your email address:`);
}

async function processEmailStep(chatId, userId, msg, state) {
  if (!msg.text) {
    await bot.sendMessage(chatId, 'Please enter your email as text:');
    return;
  }
  
  const email = msg.text.trim().toLowerCase();
  
  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    await bot.sendMessage(chatId, 'Please enter a valid email address:');
    return;
  }
  
  // Check if email already exists
  const existingUser = await userService.getUserByEmail(email);
  if (existingUser) {
    await bot.sendMessage(
      chatId,
      'This email is already registered. Please use a different email or contact support.'
    );
    return;
  }
  
  // Generate verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000); // 6-digit code
  
  // Update state
  state.data.email = email;
  state.data.verificationCode = verificationCode;
  state.step = 'verification_code';
  await redis.set(`registration:${userId}`, JSON.stringify(state), 'EX', 1800);
  
  // Send verification email
  await emailService.sendVerificationEmail(email, state.data.name, verificationCode);
  
  await bot.sendMessage(
    chatId,
    `We've sent a verification code to ${email}. Please check your inbox and enter the 6-digit code:`
  );
}

async function processVerificationStep(chatId, userId, msg, state) {
  if (!msg.text) {
    await bot.sendMessage(chatId, 'Please enter the verification code as text:');
    return;
  }
  
  const code = msg.text.trim();
  
  // Validate code
  if (code !== state.data.verificationCode.toString()) {
    await bot.sendMessage(
      chatId,
      'Invalid verification code. Please try again or use /cancel to restart.'
    );
    return;
  }
  
  try {
    // Create user in database
    const user = await userService.createUser({
      telegramId: userId,
      name: state.data.name,
      email: state.data.email,
      role: 'user', // Default role
      registeredAt: new Date()
    });
    
    // Clear registration state
    await redis.del(`registration:${userId}`);
    
    // Send welcome message
    await bot.sendMessage(
      chatId,
      `Registration successful! Welcome to OPTRIXTRADES, ${state.data.name}.\n\nUse /help to see available commands.`
    );
    
    logger.info(`User ${userId} completed registration successfully`);
  } catch (error) {
    logger.error(`Error creating user ${userId}:`, error);
    await bot.sendMessage(
      chatId,
      'Sorry, an error occurred during registration. Please try again later or contact support.'
    );
  }
}

// Cancel registration
bot.onText(/\/cancel/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  const exists = await redis.exists(`registration:${userId}`);
  
  if (exists) {
    await redis.del(`registration:${userId}`);
    await bot.sendMessage(chatId, 'Registration cancelled. You can start again with /register when ready.');
    logger.info(`User ${userId} cancelled registration`);
  }
});

module.exports = {
  // Export any functions that need to be accessed from other files
};
```

## Authentication Methods

### Telegram-Based Authentication

The simplest authentication method leverages Telegram's built-in security:

1. Telegram already authenticates users
2. The bot identifies users by their Telegram ID
3. No additional password is required

```javascript
// src/middleware/authMiddleware.js
const userService = require('../services/userService');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate users
 * @param {Object} msg - Telegram message object
 * @returns {Promise<Object|null>} - User object or null if not authenticated
 */
async function authenticateUser(msg) {
  if (!msg || !msg.from || !msg.from.id) {
    logger.warn('Authentication failed: Invalid message object');
    return null;
  }
  
  const telegramId = msg.from.id;
  
  try {
    // Get user from database
    const user = await userService.getUserByTelegramId(telegramId);
    
    if (!user) {
      logger.info(`Authentication failed: User ${telegramId} not registered`);
      return null;
    }
    
    return user;
  } catch (error) {
    logger.error(`Authentication error for user ${telegramId}:`, error);
    return null;
  }
}

module.exports = {
  authenticateUser
};
```

### Enhanced Authentication with PIN/Password

For additional security, implement a PIN or password requirement for sensitive operations:

```javascript
// src/controllers/securityController.js
const bot = require('../config/bot');
const logger = require('../utils/logger');
const userService = require('../services/userService');
const securityService = require('../services/securityService');
const redis = require('../config/redis');

// Set up PIN
bot.onText(/\/setpin/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  try {
    // Authenticate user
    const user = await userService.getUserByTelegramId(userId);
    
    if (!user) {
      await bot.sendMessage(
        chatId,
        'You need to register first. Use /register to create an account.'
      );
      return;
    }
    
    // Set PIN flow state
    await redis.set(
      `setpin:${userId}`,
      JSON.stringify({
        step: 'enter_pin',
        startedAt: new Date().toISOString()
      }),
      'EX',
      300 // 5 minutes expiration
    );
    
    await bot.sendMessage(
      chatId,
      'Please enter a 4-6 digit PIN code for securing sensitive operations:'
    );
  } catch (error) {
    logger.error(`Error in /setpin for user ${userId}:`, error);
    await bot.sendMessage(
      chatId,
      'Sorry, an error occurred. Please try again later.'
    );
  }
});

// Handle PIN setup messages
bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  try {
    // Check if in PIN setup flow
    const stateJson = await redis.get(`setpin:${userId}`);
    if (!stateJson) return;
    
    const state = JSON.parse(stateJson);
    
    if (state.step === 'enter_pin') {
      const pin = msg.text.trim();
      
      // Validate PIN
      if (!/^\d{4,6}$/.test(pin)) {
        await bot.sendMessage(
          chatId,
          'PIN must be 4-6 digits. Please try again:'
        );
        return;
      }
      
      // Update state for confirmation
      state.pin = pin;
      state.step = 'confirm_pin';
      await redis.set(`setpin:${userId}`, JSON.stringify(state), 'EX', 300);
      
      await bot.sendMessage(
        chatId,
        'Please confirm your PIN by entering it again:'
      );
    }
    else if (state.step === 'confirm_pin') {
      const confirmPin = msg.text.trim();
      
      if (confirmPin !== state.pin) {
        await bot.sendMessage(
          chatId,
          'PINs do not match. Please start over with /setpin.'
        );
        await redis.del(`setpin:${userId}`);
        return;
      }
      
      // Hash and save PIN
      await securityService.setUserPin(userId, state.pin);
      
      // Clear PIN setup state
      await redis.del(`setpin:${userId}`);
      
      await bot.sendMessage(
        chatId,
        'PIN set successfully! You will need this PIN for sensitive operations.'
      );
      
      logger.info(`User ${userId} set up PIN successfully`);
    }
  } catch (error) {
    logger.error(`Error in PIN setup for user ${userId}:`, error);
    await bot.sendMessage(
      chatId,
      'Sorry, an error occurred. Please try again with /setpin.'
    );
    await redis.del(`setpin:${userId}`);
  }
});

// Verify PIN for sensitive operations
async function verifyPin(userId, chatId) {
  return new Promise(async (resolve, reject) => {
    try {
      // Set verification state
      const verificationId = `pin_verify:${Date.now()}`;
      await redis.set(
        `pin_verify:${userId}`,
        JSON.stringify({
          verificationId,
          startedAt: new Date().toISOString()
        }),
        'EX',
        120 // 2 minutes expiration
      );
      
      // Ask for PIN
      await bot.sendMessage(
        chatId,
        'Please enter your PIN to continue:'
      );
      
      // Set up one-time listener for PIN
      const listener = async (pinMsg) => {
        // Only process messages from this user
        if (pinMsg.from.id !== userId) return;
        
        // Remove listener after processing
        bot.removeListener('message', listener);
        
        // Check if still in verification
        const verifyState = await redis.get(`pin_verify:${userId}`);
        if (!verifyState) {
          reject(new Error('PIN verification expired'));
          return;
        }
        
        // Verify PIN
        const pin = pinMsg.text?.trim();
        const isValid = await securityService.verifyUserPin(userId, pin);
        
        // Clean up verification state
        await redis.del(`pin_verify:${userId}`);
        
        if (isValid) {
          resolve(true);
        } else {
          await bot.sendMessage(
            chatId,
            'Invalid PIN. Operation cancelled.'
          );
          reject(new Error('Invalid PIN'));
        }
      };
      
      // Add temporary listener
      bot.on('message', listener);
      
      // Set timeout to clean up if no response
      setTimeout(async () => {
        bot.removeListener('message', listener);
        const verifyState = await redis.get(`pin_verify:${userId}`);
        if (verifyState) {
          await redis.del(`pin_verify:${userId}`);
          await bot.sendMessage(
            chatId,
            'PIN verification timed out. Operation cancelled.'
          );
          reject(new Error('PIN verification timeout'));
        }
      }, 120000); // 2 minutes timeout
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  verifyPin
};
```

## User Roles and Permissions

### Role Hierarchy

Define a clear role hierarchy for your bot:

1. **Guest**: Unregistered users with minimal access
2. **User**: Basic registered users
3. **Premium**: Paid subscribers with additional features
4. **Admin**: System administrators with management capabilities
5. **SuperAdmin**: Full system access

### Database Schema

```sql
-- Users table with role
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  pin_hash VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  registered_at TIMESTAMP NOT NULL,
  last_active_at TIMESTAMP
);

-- Permissions table
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT
);

-- Role-Permission mapping
CREATE TABLE role_permissions (
  role VARCHAR(20) NOT NULL,
  permission_id INTEGER NOT NULL REFERENCES permissions(id),
  PRIMARY KEY (role, permission_id)
);

-- User-specific permissions (overrides)
CREATE TABLE user_permissions (
  user_id INTEGER NOT NULL REFERENCES users(id),
  permission_id INTEGER NOT NULL REFERENCES permissions(id),
  granted BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (user_id, permission_id)
);
```

## Implementing Role-Based Access Control

### Permission Service

```javascript
// src/services/permissionService.js
const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Check if a user has a specific permission
 * @param {number} userId - User ID
 * @param {string} permissionName - Permission to check
 * @returns {Promise<boolean>} - Whether user has permission
 */
async function hasPermission(userId, permissionName) {
  try {
    // First check user-specific permission overrides
    const userPermQuery = `
      SELECT granted FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = $1 AND p.name = $2
    `;
    
    const userPermResult = await db.query(userPermQuery, [userId, permissionName]);
    
    if (userPermResult.rows.length > 0) {
      // User has a specific override for this permission
      return userPermResult.rows[0].granted;
    }
    
    // Check role-based permissions
    const rolePermQuery = `
      SELECT EXISTS (
        SELECT 1 FROM users u
        JOIN role_permissions rp ON u.role = rp.role
        JOIN permissions p ON rp.permission_id = p.id
        WHERE u.id = $1 AND p.name = $2
      ) as has_permission
    `;
    
    const rolePermResult = await db.query(rolePermQuery, [userId, permissionName]);
    return rolePermResult.rows[0].has_permission;
  } catch (error) {
    logger.error(`Error checking permission ${permissionName} for user ${userId}:`, error);
    return false; // Fail closed (deny by default on error)
  }
}

/**
 * Get all permissions for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} - List of permission names
 */
async function getUserPermissions(userId) {
  try {
    // Get user's role
    const userQuery = 'SELECT role FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return [];
    }
    
    const role = userResult.rows[0].role;
    
    // Get role permissions
    const rolePermsQuery = `
      SELECT p.name FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role = $1
    `;
    
    const rolePermsResult = await db.query(rolePermsQuery, [role]);
    const rolePermissions = rolePermsResult.rows.map(row => row.name);
    
    // Get user-specific permission overrides
    const userPermsQuery = `
      SELECT p.name, up.granted FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = $1
    `;
    
    const userPermsResult = await db.query(userPermsQuery, [userId]);
    
    // Apply overrides
    const userOverrides = userPermsResult.rows.reduce((acc, row) => {
      acc[row.name] = row.granted;
      return acc;
    }, {});
    
    // Combine permissions (add granted overrides, remove denied overrides)
    const finalPermissions = rolePermissions
      .filter(perm => userOverrides[perm] !== false) // Remove denied overrides
      .concat(
        Object.keys(userOverrides)
          .filter(perm => userOverrides[perm] && !rolePermissions.includes(perm))
      );
    
    return finalPermissions;
  } catch (error) {
    logger.error(`Error getting permissions for user ${userId}:`, error);
    return [];
  }
}

/**
 * Grant a specific permission to a user
 * @param {number} userId - User ID
 * @param {string} permissionName - Permission to grant
 * @returns {Promise<boolean>} - Success status
 */
async function grantPermission(userId, permissionName) {
  try {
    // Get permission ID
    const permQuery = 'SELECT id FROM permissions WHERE name = $1';
    const permResult = await db.query(permQuery, [permissionName]);
    
    if (permResult.rows.length === 0) {
      logger.error(`Permission ${permissionName} does not exist`);
      return false;
    }
    
    const permissionId = permResult.rows[0].id;
    
    // Upsert user permission
    const upsertQuery = `
      INSERT INTO user_permissions (user_id, permission_id, granted)
      VALUES ($1, $2, TRUE)
      ON CONFLICT (user_id, permission_id)
      DO UPDATE SET granted = TRUE
    `;
    
    await db.query(upsertQuery, [userId, permissionId]);
    return true;
  } catch (error) {
    logger.error(`Error granting permission ${permissionName} to user ${userId}:`, error);
    return false;
  }
}

/**
 * Revoke a specific permission from a user
 * @param {number} userId - User ID
 * @param {string} permissionName - Permission to revoke
 * @returns {Promise<boolean>} - Success status
 */
async function revokePermission(userId, permissionName) {
  try {
    // Get permission ID
    const permQuery = 'SELECT id FROM permissions WHERE name = $1';
    const permResult = await db.query(permQuery, [permissionName]);
    
    if (permResult.rows.length === 0) {
      logger.error(`Permission ${permissionName} does not exist`);
      return false;
    }
    
    const permissionId = permResult.rows[0].id;
    
    // Check if user has this permission through their role
    const hasRolePermQuery = `
      SELECT EXISTS (
        SELECT 1 FROM users u
        JOIN role_permissions rp ON u.role = rp.role
        WHERE u.id = $1 AND rp.permission_id = $2
      ) as has_role_perm
    `;
    
    const hasRolePermResult = await db.query(hasRolePermQuery, [userId, permissionId]);
    
    if (hasRolePermResult.rows[0].has_role_perm) {
      // User has this permission through their role, so we need to add a negative override
      const upsertQuery = `
        INSERT INTO user_permissions (user_id, permission_id, granted)
        VALUES ($1, $2, FALSE)
        ON CONFLICT (user_id, permission_id)
        DO UPDATE SET granted = FALSE
      `;
      
      await db.query(upsertQuery, [userId, permissionId]);
    } else {
      // User doesn't have this through their role, so just remove any override
      const deleteQuery = `
        DELETE FROM user_permissions
        WHERE user_id = $1 AND permission_id = $2
      `;
      
      await db.query(deleteQuery, [userId, permissionId]);
    }
    
    return true;
  } catch (error) {
    logger.error(`Error revoking permission ${permissionName} from user ${userId}:`, error);
    return false;
  }
}

module.exports = {
  hasPermission,
  getUserPermissions,
  grantPermission,
  revokePermission
};
```

### Authorization Middleware

```javascript
// src/middleware/authorizationMiddleware.js
const permissionService = require('../services/permissionService');
const logger = require('../utils/logger');

/**
 * Create middleware that requires specific permission
 * @param {string} permissionName - Required permission
 * @returns {Function} - Middleware function
 */
function requirePermission(permissionName) {
  return async function(msg, user) {
    if (!user || !user.id) {
      logger.warn(`Authorization failed: No authenticated user for permission ${permissionName}`);
      return false;
    }
    
    const hasPermission = await permissionService.hasPermission(user.id, permissionName);
    
    if (!hasPermission) {
      logger.warn(`Authorization failed: User ${user.id} lacks permission ${permissionName}`);
    }
    
    return hasPermission;
  };
}

/**
 * Create middleware that requires admin role
 * @returns {Function} - Middleware function
 */
function requireAdmin() {
  return async function(msg, user) {
    if (!user || !user.id) {
      logger.warn('Authorization failed: No authenticated user for admin check');
      return false;
    }
    
    return user.role === 'admin' || user.role === 'superadmin';
  };
}

/**
 * Create middleware that requires specific role
 * @param {string|Array} roles - Required role(s)
 * @returns {Function} - Middleware function
 */
function requireRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return async function(msg, user) {
    if (!user || !user.id) {
      logger.warn(`Authorization failed: No authenticated user for role check ${allowedRoles}`);
      return false;
    }
    
    const hasRole = allowedRoles.includes(user.role);
    
    if (!hasRole) {
      logger.warn(`Authorization failed: User ${user.id} with role ${user.role} needs one of ${allowedRoles}`);
    }
    
    return hasRole;
  };
}

module.exports = {
  requirePermission,
  requireAdmin,
  requireRole
};
```

## Secure Storage of User Credentials

### Hashing PINs and Passwords

```javascript
// src/services/securityService.js
const bcrypt = require('bcrypt');
const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Set user PIN (hash and store)
 * @param {number} telegramId - User's Telegram ID
 * @param {string} pin - Plain text PIN
 * @returns {Promise<boolean>} - Success status
 */
async function setUserPin(telegramId, pin) {
  try {
    // Hash PIN with bcrypt
    const saltRounds = 10;
    const pinHash = await bcrypt.hash(pin, saltRounds);
    
    // Update user record
    const query = 'UPDATE users SET pin_hash = $1 WHERE telegram_id = $2';
    await db.query(query, [pinHash, telegramId]);
    
    return true;
  } catch (error) {
    logger.error(`Error setting PIN for user ${telegramId}:`, error);
    return false;
  }
}

/**
 * Verify user PIN
 * @param {number} telegramId - User's Telegram ID
 * @param {string} pin - Plain text PIN to verify
 * @returns {Promise<boolean>} - Whether PIN is valid
 */
async function verifyUserPin(telegramId, pin) {
  try {
    // Get stored hash
    const query = 'SELECT pin_hash FROM users WHERE telegram_id = $1';
    const result = await db.query(query, [telegramId]);
    
    if (result.rows.length === 0 || !result.rows[0].pin_hash) {
      logger.warn(`No PIN set for user ${telegramId}`);
      return false;
    }
    
    const storedHash = result.rows[0].pin_hash;
    
    // Compare with bcrypt
    return await bcrypt.compare(pin, storedHash);
  } catch (error) {
    logger.error(`Error verifying PIN for user ${telegramId}:`, error);
    return false;
  }
}

/**
 * Reset user PIN (admin function)
 * @param {number} telegramId - User's Telegram ID
 * @returns {Promise<string|null>} - New PIN or null on failure
 */
async function resetUserPin(telegramId) {
  try {
    // Generate random PIN
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set the new PIN
    const success = await setUserPin(telegramId, newPin);
    
    return success ? newPin : null;
  } catch (error) {
    logger.error(`Error resetting PIN for user ${telegramId}:`, error);
    return null;
  }
}

module.exports = {
  setUserPin,
  verifyUserPin,
  resetUserPin
};
```

## Session Management

### Tracking User Sessions

```javascript
// src/services/sessionService.js
const db = require('../config/database');
const redis = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Record user activity and manage sessions
 * @param {number} telegramId - User's Telegram ID
 * @returns {Promise<void>}
 */
async function recordUserActivity(telegramId) {
  try {
    // Update last_active_at in database
    const query = 'UPDATE users SET last_active_at = NOW() WHERE telegram_id = $1';
    await db.query(query, [telegramId]);
    
    // Set active session in Redis with 30-minute expiration
    await redis.set(`active_session:${telegramId}`, Date.now(), 'EX', 1800);
  } catch (error) {
    logger.error(`Error recording activity for user ${telegramId}:`, error);
  }
}

/**
 * Check if user has an active session
 * @param {number} telegramId - User's Telegram ID
 * @returns {Promise<boolean>} - Whether session is active
 */
async function hasActiveSession(telegramId) {
  try {
    const sessionExists = await redis.exists(`active_session:${telegramId}`);
    return sessionExists === 1;
  } catch (error) {
    logger.error(`Error checking session for user ${telegramId}:`, error);
    return false;
  }
}

/**
 * Terminate user session
 * @param {number} telegramId - User's Telegram ID
 * @returns {Promise<boolean>} - Success status
 */
async function terminateSession(telegramId) {
  try {
    await redis.del(`active_session:${telegramId}`);
    return true;
  } catch (error) {
    logger.error(`Error terminating session for user ${telegramId}:`, error);
    return false;
  }
}

/**
 * Get all active sessions
 * @returns {Promise<Array>} - List of active user IDs
 */
async function getActiveSessions() {
  try {
    const keys = await redis.keys('active_session:*');
    return keys.map(key => parseInt(key.replace('active_session:', ''), 10));
  } catch (error) {
    logger.error('Error getting active sessions:', error);
    return [];
  }
}

module.exports = {
  recordUserActivity,
  hasActiveSession,
  terminateSession,
  getActiveSessions
};
```

## Security Best Practices

### Rate Limiting

Implement rate limiting to prevent abuse:

```javascript
// src/middleware/rateLimitMiddleware.js
const redis = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Create rate limiting middleware
 * @param {number} maxRequests - Maximum requests in time window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} - Middleware function
 */
function createRateLimiter(maxRequests, windowMs) {
  return async function(msg) {
    const userId = msg.from.id;
    const key = `rate_limit:${userId}`;
    
    try {
      // Get current count
      const count = await redis.incr(key);
      
      // Set expiration on first request
      if (count === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }
      
      // Check if over limit
      if (count > maxRequests) {
        logger.warn(`Rate limit exceeded for user ${userId}: ${count} requests`);
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error(`Error in rate limiter for user ${userId}:`, error);
      return true; // Fail open on error
    }
  };
}

// Common rate limiters
const standardLimiter = createRateLimiter(30, 60000); // 30 requests per minute
const strictLimiter = createRateLimiter(10, 60000);  // 10 requests per minute

module.exports = {
  createRateLimiter,
  standardLimiter,
  strictLimiter
};
```

### Command Execution Middleware

Combine authentication, authorization, and rate limiting:

```javascript
// src/middleware/commandMiddleware.js
const bot = require('../config/bot');
const logger = require('../utils/logger');
const { authenticateUser } = require('./authMiddleware');
const { standardLimiter } = require('./rateLimitMiddleware');

/**
 * Register a command with middleware
 * @param {RegExp} regexp - Command regex
 * @param {Array} middleware - Array of middleware functions
 * @param {Function} handler - Command handler function
 */
function registerCommand(regexp, middleware, handler) {
  bot.onText(regexp, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
      // Apply rate limiting
      const passesRateLimit = await standardLimiter(msg);
      if (!passesRateLimit) {
        await bot.sendMessage(
          chatId,
          'You are sending too many requests. Please wait a moment before trying again.'
        );
        return;
      }
      
      // Authenticate user
      const user = await authenticateUser(msg);
      
      // Check if command requires authentication
      const requiresAuth = middleware.some(m => m.name === 'requireAuthentication');
      if (requiresAuth && !user) {
        await bot.sendMessage(
          chatId,
          'You need to be registered to use this command. Use /register to create an account.'
        );
        return;
      }
      
      // Apply all middleware
      for (const mw of middleware) {
        const passes = await mw(msg, user);
        if (!passes) {
          await bot.sendMessage(
            chatId,
            'You do not have permission to use this command.'
          );
          return;
        }
      }
      
      // Execute handler
      await handler(msg, match, user);
    } catch (error) {
      logger.error(`Error executing command ${regexp} for user ${userId}:`, error);
      await bot.sendMessage(
        chatId,
        'Sorry, an error occurred while processing your command. Please try again later.'
      );
    }
  });
}

// Middleware for requiring authentication
function requireAuthentication(msg, user) {
  return !!user;
}

module.exports = {
  registerCommand,
  requireAuthentication
};
```

## Complete Implementation Examples

### Admin Command with Authorization

```javascript
// src/controllers/adminController.js
const bot = require('../config/bot');
const logger = require('../utils/logger');
const userService = require('../services/userService');
const permissionService = require('../services/permissionService');
const securityService = require('../services/securityService');
const { registerCommand } = require('../middleware/commandMiddleware');
const { requireAuthentication } = require('../middleware/authMiddleware');
const { requireAdmin, requirePermission } = require('../middleware/authorizationMiddleware');

// List users (admin only)
registerCommand(
  /\/listusers/,
  [requireAuthentication, requireAdmin()],
  async (msg) => {
    const chatId = msg.chat.id;
    
    try {
      const users = await userService.getAllUsers();
      
      if (users.length === 0) {
        await bot.sendMessage(chatId, 'No users found.');
        return;
      }
      
      const userList = users.map(user => {
        return `ID: ${user.id} | Name: ${user.name} | Role: ${user.role} | Registered: ${new Date(user.registered_at).toLocaleDateString()}`;
      }).join('\n');
      
      await bot.sendMessage(chatId, `*User List*\n\n${userList}`, { parse_mode: 'Markdown' });
      
      logger.info(`Admin ${msg.from.id} listed all users`);
    } catch (error) {
      logger.error(`Error listing users for admin ${msg.from.id}:`, error);
      await bot.sendMessage(chatId, 'Error retrieving user list.');
    }
  }
);

// Change user role (admin only)
registerCommand(
  /\/setrole (\d+) (\w+)/,
  [requireAuthentication, requireAdmin()],
  async (msg, match) => {
    const chatId = msg.chat.id;
    const targetUserId = parseInt(match[1], 10);
    const newRole = match[2].toLowerCase();
    
    // Validate role
    const validRoles = ['user', 'premium', 'admin', 'superadmin'];
    if (!validRoles.includes(newRole)) {
      await bot.sendMessage(
        chatId,
        `Invalid role. Valid roles are: ${validRoles.join(', ')}`
      );
      return;
    }
    
    try {
      const success = await userService.updateUserRole(targetUserId, newRole);
      
      if (success) {
        await bot.sendMessage(
          chatId,
          `User ${targetUserId} role updated to ${newRole}.`
        );
        logger.info(`Admin ${msg.from.id} changed user ${targetUserId} role to ${newRole}`);
      } else {
        await bot.sendMessage(chatId, `User ${targetUserId} not found.`);
      }
    } catch (error) {
      logger.error(`Error setting role for user ${targetUserId}:`, error);
      await bot.sendMessage(chatId, 'Error updating user role.');
    }
  }
);

// Reset user PIN (admin only)
registerCommand(
  /\/resetpin (\d+)/,
  [requireAuthentication, requirePermission('user.reset_pin')],
  async (msg, match) => {
    const chatId = msg.chat.id;
    const targetTelegramId = parseInt(match[1], 10);
    
    try {
      const user = await userService.getUserByTelegramId(targetTelegramId);
      
      if (!user) {
        await bot.sendMessage(chatId, `User with Telegram ID ${targetTelegramId} not found.`);
        return;
      }
      
      const newPin = await securityService.resetUserPin(targetTelegramId);
      
      if (newPin) {
        await bot.sendMessage(
          chatId,
          `PIN reset successful for user ${user.name} (${targetTelegramId}).\n\nNew PIN: ${newPin}`
        );
        
        // Notify user
        try {
          await bot.sendMessage(
            targetTelegramId,
            'Your PIN has been reset by an administrator. Please use the new PIN for secure operations.'
          );
        } catch (notifyError) {
          logger.warn(`Could not notify user ${targetTelegramId} about PIN reset:`, notifyError);
        }
        
        logger.info(`Admin ${msg.from.id} reset PIN for user ${targetTelegramId}`);
      } else {
        await bot.sendMessage(chatId, 'Error resetting PIN.');
      }
    } catch (error) {
      logger.error(`Error resetting PIN for user ${targetTelegramId}:`, error);
      await bot.sendMessage(chatId, 'Error resetting user PIN.');
    }
  }
);

module.exports = {
  // Export any functions that need to be accessed from other files
};
```

### Premium Feature with Role Check

```javascript
// src/controllers/premiumController.js
const bot = require('../config/bot');
const logger = require('../utils/logger');
const premiumService = require('../services/premiumService');
const { registerCommand } = require('../middleware/commandMiddleware');
const { requireAuthentication } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authorizationMiddleware');

// Access premium analysis (premium users only)
registerCommand(
  /\/analysis/,
  [requireAuthentication, requireRole(['premium', 'admin', 'superadmin'])],
  async (msg, match, user) => {
    const chatId = msg.chat.id;
    
    try {
      // Get premium analysis data
      const analysis = await premiumService.generateMarketAnalysis();
      
      await bot.sendMessage(
        chatId,
        `*Premium Market Analysis*\n\n${analysis.summary}\n\nTrend: ${analysis.trend}\nStrength: ${analysis.strength}\nRecommendation: ${analysis.recommendation}`,
        { parse_mode: 'Markdown' }
      );
      
      // Send chart if available
      if (analysis.chartUrl) {
        await bot.sendPhoto(chatId, analysis.chartUrl);
      }
      
      logger.info(`User ${user.id} accessed premium analysis`);
    } catch (error) {
      logger.error(`Error generating premium analysis for user ${user.id}:`, error);
      await bot.sendMessage(
        chatId,
        'Sorry, an error occurred while generating your analysis. Please try again later.'
      );
    }
  }
);

// Check subscription status
registerCommand(
  /\/subscription/,
  [requireAuthentication],
  async (msg, match, user) => {
    const chatId = msg.chat.id;
    
    try {
      const isPremium = user.role === 'premium' || user.role === 'admin' || user.role === 'superadmin';
      
      if (isPremium) {
        // Get subscription details for premium users
        const subscription = await premiumService.getSubscriptionDetails(user.id);
        
        await bot.sendMessage(
          chatId,
          `*Your Premium Subscription*\n\nStatus: Active\nPlan: ${subscription.plan}\nRenews: ${new Date(subscription.renewsAt).toLocaleDateString()}\n\nThank you for being a premium member!`,
          { parse_mode: 'Markdown' }
        );
      } else {
        // Show upgrade options for regular users
        const keyboard = {
          inline_keyboard: [
            [{ text: 'View Premium Plans', callback_data: 'premium_plans' }],
            [{ text: 'Benefits of Premium', callback_data: 'premium_benefits' }]
          ]
        };
        
        await bot.sendMessage(
          chatId,
          '*Subscription Status*\n\nYou are currently on the Basic plan.\n\nUpgrade to Premium to access exclusive features like advanced market analysis, priority support, and more!',
          { 
            parse_mode: 'Markdown',
            reply_markup: keyboard
          }
        );
      }
    } catch (error) {
      logger.error(`Error checking subscription for user ${user.id}:`, error);
      await bot.sendMessage(
        chatId,
        'Sorry, an error occurred while checking your subscription. Please try again later.'
      );
    }
  }
);

// Handle premium-related callbacks
bot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const userId = callbackQuery.from.id;
  
  // Only process premium callbacks
  if (!data.startsWith('premium_')) return;
  
  try {
    // Authenticate user
    const user = await userService.getUserByTelegramId(userId);
    
    if (!user) {
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: 'You need to register first. Use /register to create an account.',
        show_alert: true
      });
      return;
    }
    
    if (data === 'premium_plans') {
      await bot.editMessageText(
        '*Premium Plans*\n\n' +
        '🥈 *Silver Plan* - $9.99/month\n' +
        '• Basic market analysis\n' +
        '• Daily trading signals\n' +
        '• Email support\n\n' +
        '🥇 *Gold Plan* - $19.99/month\n' +
        '• Advanced market analysis\n' +
        '• Real-time trading signals\n' +
        '• Priority support\n' +
        '• Weekly strategy sessions\n\n' +
        '💎 *Platinum Plan* - $49.99/month\n' +
        '• Expert market analysis\n' +
        '• Premium trading signals\n' +
        '• 24/7 dedicated support\n' +
        '• Daily strategy updates\n' +
        '• One-on-one coaching\n\n' +
        'To upgrade, visit our website or contact support.',
        {
          chat_id: chatId,
          message_id: msg.message_id,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Back', callback_data: 'premium_back' }]
            ]
          }
        }
      );
    }
    else if (data === 'premium_benefits') {
      await bot.editMessageText(
        '*Benefits of Premium*\n\n' +
        '📊 *Advanced Analysis*\n' +
        'Get deeper insights into market trends and opportunities\n\n' +
        '⏱️ *Real-time Alerts*\n' +
        'Receive instant notifications for market movements\n\n' +
        '👨‍💼 *Priority Support*\n' +
        'Get faster responses from our expert team\n\n' +
        '📚 *Educational Resources*\n' +
        'Access exclusive guides and training materials\n\n' +
        '🔒 *Risk Management Tools*\n' +
        'Advanced tools to protect your investments\n\n' +
        '🏆 *Success Rate*\n' +
        'Premium users report 32% higher success rates',
        {
          chat_id: chatId,
          message_id: msg.message_id,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Back', callback_data: 'premium_back' }]
            ]
          }
        }
      );
    }
    else if (data === 'premium_back') {
      const isPremium = user.role === 'premium' || user.role === 'admin' || user.role === 'superadmin';
      
      if (isPremium) {
        const subscription = await premiumService.getSubscriptionDetails(user.id);
        
        await bot.editMessageText(
          `*Your Premium Subscription*\n\nStatus: Active\nPlan: ${subscription.plan}\nRenews: ${new Date(subscription.renewsAt).toLocaleDateString()}\n\nThank you for being a premium member!`,
          {
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown'
          }
        );
      } else {
        await bot.editMessageText(
          '*Subscription Status*\n\nYou are currently on the Basic plan.\n\nUpgrade to Premium to access exclusive features like advanced market analysis, priority support, and more!',
          { 
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: 'View Premium Plans', callback_data: 'premium_plans' }],
                [{ text: 'Benefits of Premium', callback_data: 'premium_benefits' }]
              ]
            }
          }
        );
      }
    }
    
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    logger.error(`Error handling premium callback for user ${userId}:`, error);
    
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: 'An error occurred. Please try again.',
      show_alert: true
    });
  }
});

module.exports = {
  // Export any functions that need to be accessed from other files
};
```

---

By implementing these authentication and authorization patterns, you can create a secure, role-based access system for your OPTRIXTRADES Telegram bot. This ensures that users can only access features appropriate to their role and that sensitive operations require proper verification.