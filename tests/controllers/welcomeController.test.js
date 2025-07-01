const { expect } = require('chai');
const sinon = require('sinon');
const TelegramBot = require('node-telegram-bot-api');

// Import the modules to test
const welcomeController = require('../../src/controllers/welcomeController');
const userService = require('../../src/services/userService');
const followUpService = require('../../src/services/followUpService');
const { bot } = require('../../src/config/bot');

describe('Welcome Controller', () => {
  // Create stubs for dependencies
  let sendMessageStub;
  let createOrUpdateUserStub;
  let getUserByTelegramIdStub;
  let startFollowUpSequenceStub;
  let answerCallbackQueryStub;
  
  beforeEach(() => {
    // Stub bot methods
    sendMessageStub = sinon.stub(bot, 'sendMessage').resolves({ message_id: 123 });
    answerCallbackQueryStub = sinon.stub(bot, 'answerCallbackQuery').resolves();
    
    // Stub userService methods
    createOrUpdateUserStub = sinon.stub(userService, 'createOrUpdateUser');
    getUserByTelegramIdStub = sinon.stub(userService, 'getUserByTelegramId');
    
    // Stub followUpService methods
    startFollowUpSequenceStub = sinon.stub(followUpService, 'startFollowUpSequence').resolves();
  });
  
  afterEach(() => {
    // Restore all stubs
    sinon.restore();
  });
  
  describe('/start command', () => {
    it('should send welcome message to new users', async () => {
      // Arrange
      const msg = {
        chat: { id: 123456 },
        from: {
          id: 123456,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser',
          language_code: 'en'
        }
      };
      
      // Mock user service to return a new user
      createOrUpdateUserStub.resolves({
        telegram_id: '123456',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        verification_status: 'unverified',
        follow_up_sequence_active: false
      });
      
      // Act
      await welcomeController.handleStart(msg);
      
      // Assert
      expect(createOrUpdateUserStub.calledOnce).to.be.true;
      expect(sendMessageStub.calledOnce).to.be.true;
      expect(startFollowUpSequenceStub.calledOnce).to.be.true;
      
      // Verify the message contains welcome text and has inline keyboard
      const sendMessageArgs = sendMessageStub.firstCall.args;
      expect(sendMessageArgs[0]).to.equal(123456);
      expect(sendMessageArgs[1]).to.include('Welcome');
      expect(sendMessageArgs[2].reply_markup.inline_keyboard).to.exist;
    });
    
    it('should send different message to verified users', async () => {
      // Arrange
      const msg = {
        chat: { id: 123456 },
        from: {
          id: 123456,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser',
          language_code: 'en'
        }
      };
      
      // Mock user service to return a verified user
      createOrUpdateUserStub.resolves({
        telegram_id: '123456',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        verification_status: 'verified',
        subscription_tier: 'premium'
      });
      
      // Act
      await welcomeController.handleStart(msg);
      
      // Assert
      expect(createOrUpdateUserStub.calledOnce).to.be.true;
      expect(sendMessageStub.calledOnce).to.be.true;
      expect(startFollowUpSequenceStub.called).to.be.false;
      
      // Verify the message contains welcome back text and has reply keyboard
      const sendMessageArgs = sendMessageStub.firstCall.args;
      expect(sendMessageArgs[0]).to.equal(123456);
      expect(sendMessageArgs[1]).to.include('Welcome back');
      expect(sendMessageArgs[1]).to.include('PREMIUM');
      expect(sendMessageArgs[2].reply_markup.keyboard).to.exist;
    });
    
    it('should send pending verification message to users with pending status', async () => {
      // Arrange
      const msg = {
        chat: { id: 123456 },
        from: {
          id: 123456,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser',
          language_code: 'en'
        }
      };
      
      // Mock user service to return a user with pending verification
      createOrUpdateUserStub.resolves({
        telegram_id: '123456',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        verification_status: 'pending',
        follow_up_sequence_active: true
      });
      
      // Act
      await welcomeController.handleStart(msg);
      
      // Assert
      expect(createOrUpdateUserStub.calledOnce).to.be.true;
      expect(sendMessageStub.calledOnce).to.be.true;
      expect(startFollowUpSequenceStub.called).to.be.false;
      
      // Verify the message contains pending verification text
      const sendMessageArgs = sendMessageStub.firstCall.args;
      expect(sendMessageArgs[0]).to.equal(123456);
      expect(sendMessageArgs[1]).to.include('pending');
      expect(sendMessageArgs[2].reply_markup.keyboard).to.exist;
    });
    
    it('should handle errors gracefully', async () => {
      // Arrange
      const msg = {
        chat: { id: 123456 },
        from: {
          id: 123456,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser',
          language_code: 'en'
        }
      };
      
      // Mock user service to throw an error
      createOrUpdateUserStub.rejects(new Error('Database error'));
      
      // Act
      await welcomeController.handleStart(msg);
      
      // Assert
      expect(createOrUpdateUserStub.calledOnce).to.be.true;
      expect(sendMessageStub.calledOnce).to.be.true;
      
      // Verify the error message was sent
      const sendMessageArgs = sendMessageStub.firstCall.args;
      expect(sendMessageArgs[0]).to.equal(123456);
      expect(sendMessageArgs[1]).to.include('Sorry');
    });
  });
  
  describe('/help command', () => {
    it('should send help message to verified users', async () => {
      // Arrange
      const msg = {
        chat: { id: 123456 },
        from: {
          id: 123456,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser'
        }
      };
      
      // Mock user service to return a verified user
      getUserByTelegramIdStub.resolves({
        telegram_id: '123456',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        verification_status: 'verified',
        subscription_tier: 'premium'
      });
      
      // Act
      await welcomeController.handleHelp(msg);
      
      // Assert
      expect(getUserByTelegramIdStub.calledOnce).to.be.true;
      expect(sendMessageStub.calledOnce).to.be.true;
      
      // Verify the help message for verified users
      const sendMessageArgs = sendMessageStub.firstCall.args;
      expect(sendMessageArgs[0]).to.equal(123456);
      expect(sendMessageArgs[1]).to.include('OPTRIXTRADES Help');
      expect(sendMessageArgs[1]).to.include('Trading Signals');
      expect(sendMessageArgs[1]).to.include('PREMIUM');
    });
    
    it('should send different help message to unverified users', async () => {
      // Arrange
      const msg = {
        chat: { id: 123456 },
        from: {
          id: 123456,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser'
        }
      };
      
      // Mock user service to return an unverified user
      getUserByTelegramIdStub.resolves({
        telegram_id: '123456',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        verification_status: 'unverified'
      });
      
      // Act
      await welcomeController.handleHelp(msg);
      
      // Assert
      expect(getUserByTelegramIdStub.calledOnce).to.be.true;
      expect(sendMessageStub.calledOnce).to.be.true;
      
      // Verify the help message for unverified users
      const sendMessageArgs = sendMessageStub.firstCall.args;
      expect(sendMessageArgs[0]).to.equal(123456);
      expect(sendMessageArgs[1]).to.include('OPTRIXTRADES Help');
      expect(sendMessageArgs[1]).to.include('Register with our partner broker');
    });
  });
  
  describe('register callback', () => {
    it('should send registration instructions when register callback is received', async () => {
      // Arrange
      const callbackQuery = {
        id: 'callback123',
        message: {
          chat: { id: 123456 }
        },
        from: {
          id: 123456,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser'
        }
      };
      
      // Act
      await welcomeController.handleRegister(callbackQuery);
      
      // Assert
      expect(answerCallbackQueryStub.calledOnce).to.be.true;
      expect(sendMessageStub.calledOnce).to.be.true;
      
      // Verify the registration instructions
      const sendMessageArgs = sendMessageStub.firstCall.args;
      expect(sendMessageArgs[0]).to.equal(123456);
      expect(sendMessageArgs[1].toLowerCase()).to.include('register');
      expect(sendMessageArgs[2].reply_markup.inline_keyboard).to.exist;
    });
  });
});