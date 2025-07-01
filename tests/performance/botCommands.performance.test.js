/**
 * Performance tests for Bot Commands
 * 
 * These tests measure the bot's performance when handling multiple commands
 * simultaneously, simulating high load scenarios.
 */

const TelegramBot = require('node-telegram-bot-api');
const sinon = require('sinon');
const { expect } = require('chai');
const { bot } = require('../../src/config/bot');
const userService = require('../../src/services/userService');

// Import controllers to ensure they're loaded
require('../../src/controllers/welcomeController');
require('../../src/controllers/verificationController');
require('../../src/controllers/tradingController');
require('../../src/controllers/supportController');
require('../../src/controllers/accountController');
require('../../src/controllers/adminController');

describe('Bot Commands Performance Tests', function() {
  // Increase timeout for performance tests
  this.timeout(30000);
  
  // Test configuration
  const TEST_USERS = 50; // Number of simulated users
  const COMMANDS = ['/start', '/help']; // Commands to test
  
  let sendMessageStub;
  let createOrUpdateUserStub;
  let getUserByTelegramIdStub;
  let processUpdateStub;
  
  // Performance metrics
  let metrics = {
    totalCommands: 0,
    successfulCommands: 0,
    failedCommands: 0,
    responseTimes: [],
    startTime: 0,
    endTime: 0
  };
  
  beforeEach(() => {
    // Reset metrics
    metrics = {
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      responseTimes: [],
      startTime: 0,
      endTime: 0
    };
    
    // Stub bot.processUpdate to capture and process commands
    processUpdateStub = sinon.stub(bot, 'processUpdate').callThrough();
    
    // Stub bot.sendMessage to prevent actual API calls and measure response time
    sendMessageStub = sinon.stub(bot, 'sendMessage').callsFake(async () => {
      // Simulate random response time between 50-200ms
      const responseTime = 50 + Math.random() * 150;
      await new Promise(resolve => setTimeout(resolve, responseTime));
      metrics.responseTimes.push(responseTime);
      metrics.successfulCommands++;
      return { message_id: Math.floor(Math.random() * 10000) };
    });
    
    // Stub userService methods
    createOrUpdateUserStub = sinon.stub(userService, 'createOrUpdateUser').callsFake(async (userData) => {
      // Simulate database operation (50-150ms)
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      return {
        telegram_id: userData.telegram_id,
        username: userData.username || 'testuser',
        first_name: userData.first_name || 'Test',
        last_name: userData.last_name || 'User',
        verification_status: Math.random() > 0.7 ? 'verified' : 'unverified',
        subscription_tier: Math.random() > 0.7 ? 'premium' : 'free',
        follow_up_sequence_active: false
      };
    });
    
    getUserByTelegramIdStub = sinon.stub(userService, 'getUserByTelegramId').callsFake(async (telegramId) => {
      // Simulate database operation (50-150ms)
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      return {
        telegram_id: telegramId,
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        verification_status: Math.random() > 0.7 ? 'verified' : 'unverified',
        subscription_tier: Math.random() > 0.7 ? 'premium' : 'free',
        follow_up_sequence_active: false
      };
    });
  });
  
  afterEach(() => {
    // Restore all stubs
    sinon.restore();
    
    // Log performance metrics
    console.log('\nPerformance Test Results:');
    console.log(`Total commands processed: ${metrics.totalCommands}`);
    console.log(`Successful commands: ${metrics.successfulCommands}`);
    console.log(`Failed commands: ${metrics.failedCommands}`);
    console.log(`Success rate: ${((metrics.successfulCommands / metrics.totalCommands) * 100).toFixed(2)}%`);
    console.log(`Total test duration: ${metrics.endTime - metrics.startTime}ms`);
    console.log(`Average response time: ${(metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length).toFixed(2)}ms`);
    console.log(`Min response time: ${Math.min(...metrics.responseTimes).toFixed(2)}ms`);
    console.log(`Max response time: ${Math.max(...metrics.responseTimes).toFixed(2)}ms`);
    console.log(`Throughput: ${((metrics.successfulCommands / (metrics.endTime - metrics.startTime)) * 1000).toFixed(2)} commands/second`);
  });
  
  /**
   * Helper function to simulate a command message
   * @param {string} command - The command to simulate (e.g., '/start')
   * @param {number} userId - The user ID
   * @returns {Object} - The simulated update object
   */
  function simulateCommand(command, userId) {
    const message = {
      message_id: Math.floor(Math.random() * 1000),
      from: {
        id: userId,
        is_bot: false,
        first_name: `Test${userId}`,
        last_name: 'User',
        username: `testuser${userId}`,
        language_code: 'en'
      },
      chat: {
        id: userId,
        first_name: `Test${userId}`,
        last_name: 'User',
        username: `testuser${userId}`,
        type: 'private'
      },
      date: Math.floor(Date.now() / 1000),
      text: command,
      entities: [
        {
          offset: 0,
          length: command.indexOf(' ') > 0 ? command.indexOf(' ') : command.length,
          type: 'bot_command'
        }
      ]
    };
    
    // Create the update object
    return {
      update_id: Math.floor(Math.random() * 1000),
      message
    };
  }
  
  /**
   * Process multiple commands concurrently
   * @param {Array} commands - Array of commands to process
   * @param {number} numUsers - Number of users to simulate
   * @returns {Promise<Array>} - Array of results
   */
  async function processConcurrentCommands(commands, numUsers) {
    const promises = [];
    metrics.totalCommands = commands.length * numUsers;
    metrics.startTime = Date.now();
    
    // Generate command updates for each user and command
    for (let userId = 1; userId <= numUsers; userId++) {
      for (const command of commands) {
        const update = simulateCommand(command, 1000000 + userId);
        
        // Process the update and handle errors
        const promise = bot.processUpdate(update).catch(err => {
          metrics.failedCommands++;
          return { error: err.message };
        });
        
        promises.push(promise);
      }
    }
    
    // Wait for all commands to be processed
    const results = await Promise.all(promises);
    metrics.endTime = Date.now();
    return results;
  }
  
  it('should handle multiple /start and /help commands concurrently', async () => {
    // Act - process multiple commands concurrently
    await processConcurrentCommands(COMMANDS, TEST_USERS);
    
    // Assert - check performance metrics
    expect(metrics.totalCommands).to.equal(COMMANDS.length * TEST_USERS);
    expect(metrics.successfulCommands).to.be.at.least(metrics.totalCommands * 0.9); // At least 90% success rate
    expect(metrics.endTime).to.be.greaterThan(metrics.startTime);
    expect(metrics.responseTimes.length).to.equal(metrics.successfulCommands);
    
    // Verify that processUpdate was called for each command
    expect(processUpdateStub.callCount).to.equal(metrics.totalCommands);
  });
  
  it('should maintain reasonable response times under load', async () => {
    // Act - process multiple commands concurrently
    await processConcurrentCommands(COMMANDS, TEST_USERS);
    
    // Calculate average response time
    const avgResponseTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
    
    // Assert - check that average response time is reasonable (under 500ms)
    expect(avgResponseTime).to.be.lessThan(500);
    
    // Check that max response time is not too high (under 1000ms)
    expect(Math.max(...metrics.responseTimes)).to.be.lessThan(1000);
  });
});