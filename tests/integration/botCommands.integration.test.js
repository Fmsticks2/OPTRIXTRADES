/**
 * Integration tests for Bot Commands
 * 
 * These tests verify that the bot correctly responds to commands
 * by simulating command messages and checking the responses.
 */

const TelegramBot = require('node-telegram-bot-api');
const nock = require('nock');
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

describe('Bot Commands Integration Tests', function() {
  // Increase timeout for integration tests
  this.timeout(5000);
  
  const BOT_TOKEN = 'test_bot_token';
  const TELEGRAM_API = 'https://api.telegram.org';
  const USER_ID = 123456;
  const CHAT_ID = USER_ID;
  
  let telegramApiMock;
  let processUpdateStub;
  let sendMessageStub;
  let createOrUpdateUserStub;
  let getUserByTelegramIdStub;
  let startFollowUpSequenceStub;
  
  beforeEach(() => {
    // Set up nock to intercept API calls
    telegramApiMock = nock(TELEGRAM_API);
    
    // Stub bot.processUpdate to directly call the appropriate controller methods
    processUpdateStub = sinon.stub(bot, 'processUpdate').callsFake(async (update) => {
      if (update.message && update.message.text) {
        const text = update.message.text;
        if (text === '/start') {
          // Call the handleStart method directly
          const welcomeController = require('../../src/controllers/welcomeController');
          await welcomeController.handleStart(update.message);
        } else if (text === '/help') {
          // Call the handleHelp method directly
          const welcomeController = require('../../src/controllers/welcomeController');
          await welcomeController.handleHelp(update.message);
        }
        // Add more command handlers as needed
      }
    });
    
    // Stub bot.sendMessage to prevent actual API calls
    sendMessageStub = sinon.stub(bot, 'sendMessage').resolves({ message_id: 12345 });
    
    // Stub userService methods
    createOrUpdateUserStub = sinon.stub(userService, 'createOrUpdateUser');
    getUserByTelegramIdStub = sinon.stub(userService, 'getUserByTelegramId');
    
    // Stub followUpService.startFollowUpSequence
    const followUpService = require('../../src/services/followUpService');
    startFollowUpSequenceStub = sinon.stub(followUpService, 'startFollowUpSequence').resolves(true);
    
    // Default user data for tests
    const defaultUser = {
      telegram_id: USER_ID.toString(),
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      verification_status: 'unverified',
      subscription_tier: 'free',
      follow_up_sequence_active: false
    };
    
    // Set default behavior for user service stubs
    createOrUpdateUserStub.resolves(defaultUser);
    getUserByTelegramIdStub.resolves(defaultUser);
  });
  
  afterEach(() => {
    // Restore all mocks
    sinon.restore();
    nock.cleanAll();
  });
  
  /**
   * Helper function to simulate a command message
   * @param {string} command - The command to simulate (e.g., '/start')
   * @param {Object} options - Additional options for the message
   * @returns {Object} - The simulated message object
   */
  function simulateCommand(command, options = {}) {
    const message = {
      message_id: Math.floor(Math.random() * 1000),
      from: {
        id: USER_ID,
        is_bot: false,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        language_code: 'en',
        ...options.from
      },
      chat: {
        id: CHAT_ID,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        type: 'private',
        ...options.chat
      },
      date: Math.floor(Date.now() / 1000),
      text: command,
      entities: [
        {
          offset: 0,
          length: command.indexOf(' ') > 0 ? command.indexOf(' ') : command.length,
          type: 'bot_command'
        }
      ],
      ...options.message
    };
    
    // Create the update object
    const update = {
      update_id: Math.floor(Math.random() * 1000),
      message
    };
    
    return update;
  }
  
  describe('Command: /start', () => {
    it('should respond to /start command for new users', async () => {
      // Arrange - simulate a /start command
      const update = simulateCommand('/start');
      
      // Act - process the update
      await bot.processUpdate(update);
      
      // Assert - check that the bot sent a welcome message
      expect(processUpdateStub.calledOnce).to.be.true;
      expect(createOrUpdateUserStub.calledOnce).to.be.true;
      expect(sendMessageStub.calledOnce).to.be.true;
      
      // Verify the message content
      const sendMessageArgs = sendMessageStub.firstCall.args;
      expect(sendMessageArgs[0]).to.equal(CHAT_ID);
      expect(sendMessageArgs[1]).to.include('Welcome');
      expect(sendMessageArgs[2].reply_markup.inline_keyboard).to.exist;
    });
    
    it('should respond differently to /start command for verified users', async () => {
      // Arrange - mock a verified user
      createOrUpdateUserStub.resolves({
        telegram_id: USER_ID.toString(),
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        verification_status: 'verified',
        subscription_tier: 'premium',
        follow_up_sequence_active: false
      });
      
      // Simulate a /start command
      const update = simulateCommand('/start');
      
      // Act - process the update
      await bot.processUpdate(update);
      
      // Assert - check that the bot sent a welcome back message
      expect(processUpdateStub.calledOnce).to.be.true;
      expect(createOrUpdateUserStub.calledOnce).to.be.true;
      expect(sendMessageStub.calledOnce).to.be.true;
      
      // Verify the message content
      const sendMessageArgs = sendMessageStub.firstCall.args;
      expect(sendMessageArgs[0]).to.equal(CHAT_ID);
      expect(sendMessageArgs[1]).to.include('Welcome back');
      expect(sendMessageArgs[1]).to.include('PREMIUM');
      expect(sendMessageArgs[2].reply_markup.keyboard).to.exist;
    });
  });
  
  describe('Command: /help', () => {
    it('should respond to /help command for unverified users', async () => {
      // Arrange - simulate a /help command
      const update = simulateCommand('/help');
      
      // Act - process the update
      await bot.processUpdate(update);
      
      // Assert - check that the bot sent a help message
      expect(processUpdateStub.calledOnce).to.be.true;
      expect(getUserByTelegramIdStub.calledOnce).to.be.true;
      expect(sendMessageStub.calledOnce).to.be.true;
      
      // Verify the message content
      const sendMessageArgs = sendMessageStub.firstCall.args;
      expect(sendMessageArgs[0]).to.equal(CHAT_ID);
      expect(sendMessageArgs[1]).to.include('OPTRIXTRADES Help');
      expect(sendMessageArgs[1]).to.include('Register with our partner broker');
    });
    
    it('should respond differently to /help command for verified users', async () => {
      // Arrange - mock a verified user
      getUserByTelegramIdStub.resolves({
        telegram_id: USER_ID.toString(),
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        verification_status: 'verified',
        subscription_tier: 'premium'
      });
      
      // Simulate a /help command
      const update = simulateCommand('/help');
      
      // Act - process the update
      await bot.processUpdate(update);
      
      // Assert - check that the bot sent a help message for verified users
      expect(processUpdateStub.calledOnce).to.be.true;
      expect(getUserByTelegramIdStub.calledOnce).to.be.true;
      expect(sendMessageStub.calledOnce).to.be.true;
      
      // Verify the message content
      const sendMessageArgs = sendMessageStub.firstCall.args;
      expect(sendMessageArgs[0]).to.equal(CHAT_ID);
      expect(sendMessageArgs[1]).to.include('OPTRIXTRADES Help');
      expect(sendMessageArgs[1]).to.include('Trading Signals');
      expect(sendMessageArgs[1]).to.include('PREMIUM');
    });
  });
  
  // Add more command tests as needed
});