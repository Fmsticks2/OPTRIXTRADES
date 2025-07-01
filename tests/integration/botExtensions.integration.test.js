/**
 * Integration tests for Bot Extensions
 * 
 * These tests use a mock Telegram API server to test the bot extensions
 * in a more realistic environment.
 */

const TelegramBot = require('node-telegram-bot-api');
const nock = require('nock');
const sinon = require('sinon');
const { expect } = require('chai');
const config = require('../../src/config/botExtensions');
const redis = require('../../src/config/redis').redis;

// Mock dependencies before loading bot extensions
const loggerMock = {
  info: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub(),
  debug: sinon.stub()
};

const logUserActionStub = sinon.stub();
const logErrorStub = sinon.stub();

// Mock the logger module
sinon.stub(require('../../src/utils/logger'), 'logger').value(loggerMock);
sinon.stub(require('../../src/utils/logger'), 'logUserAction').value(logUserActionStub);
sinon.stub(require('../../src/utils/logger'), 'logError').value(logErrorStub);

// Load the bot extensions
require('../../src/utils/botExtensions');

describe('Bot Extensions Integration Tests', function() {
  // Increase timeout for integration tests
  this.timeout(5000);
  
  const BOT_TOKEN = 'test_bot_token';
  const TELEGRAM_API = 'https://api.telegram.org';
  const CHANNEL_ID = '-100123456789';
  const USER_ID = '987654321';
  
  let bot;
  let telegramApiMock;
  
  beforeEach(() => {
    // Create a new bot instance for each test
    bot = new TelegramBot(BOT_TOKEN, { polling: false });
    
    // Set up nock to intercept API calls
    telegramApiMock = nock(TELEGRAM_API);
    
    // Mock Redis if available
    if (redis) {
      sinon.stub(redis, 'get').resolves('0');
      sinon.stub(redis, 'incr').resolves(1);
      sinon.stub(redis, 'expire').resolves(1);
      sinon.stub(redis, 'ttl').resolves(86400);
      sinon.stub(redis, 'lpush').resolves();
    }
  });
  
  afterEach(() => {
    // Restore all mocks
    sinon.restore();
    nock.cleanAll();
  });
  
  describe('inviteUserToChannel', () => {
    it('should successfully create an invite link and send it to the user', async () => {
      // Mock the createChatInviteLink API call
      telegramApiMock
        .post(`/bot${BOT_TOKEN}/createChatInviteLink`)
        .reply(200, {
          ok: true,
          result: {
            invite_link: 'https://t.me/joinchat/custom_invite_link',
            creator: { id: 123456, is_bot: true, first_name: 'TestBot' },
            creates_join_request: false,
            is_primary: false,
            is_revoked: false
          }
        });
      
      // Mock the sendMessage API call
      telegramApiMock
        .post(`/bot${BOT_TOKEN}/sendMessage`)
        .reply(200, {
          ok: true,
          result: {
            message_id: 12345,
            from: { id: 123456, is_bot: true, first_name: 'TestBot' },
            chat: { id: USER_ID, first_name: 'Test', last_name: 'User', type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: 'Here is your invite link: https://t.me/joinchat/custom_invite_link'
          }
        });
      
      // Act
      const result = await bot.inviteUserToChannel(CHANNEL_ID, USER_ID);
      
      // Assert
      expect(result).to.have.property('success', true);
      expect(result).to.have.property('inviteLink', 'https://t.me/joinchat/custom_invite_link');
      expect(result).to.have.property('attempts', 1);
      expect(result).to.have.property('responseTime');
      
      // Verify all nock mocks were called
      expect(telegramApiMock.isDone()).to.be.true;
    });
    
    it('should handle Telegram API errors and retry', async () => {
      // Mock the createChatInviteLink API call - first attempt fails with 429 Too Many Requests
      telegramApiMock
        .post(`/bot${BOT_TOKEN}/createChatInviteLink`)
        .reply(429, {
          ok: false,
          error_code: 429,
          description: 'Too Many Requests: retry after 1',
          parameters: { retry_after: 1 }
        });
      
      // Second attempt succeeds
      telegramApiMock
        .post(`/bot${BOT_TOKEN}/createChatInviteLink`)
        .reply(200, {
          ok: true,
          result: {
            invite_link: 'https://t.me/joinchat/custom_invite_link',
            creator: { id: 123456, is_bot: true, first_name: 'TestBot' },
            creates_join_request: false,
            is_primary: false,
            is_revoked: false
          }
        });
      
      // Mock the sendMessage API call
      telegramApiMock
        .post(`/bot${BOT_TOKEN}/sendMessage`)
        .reply(200, {
          ok: true,
          result: {
            message_id: 12345,
            from: { id: 123456, is_bot: true, first_name: 'TestBot' },
            chat: { id: USER_ID, first_name: 'Test', last_name: 'User', type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: 'Here is your invite link: https://t.me/joinchat/custom_invite_link'
          }
        });
      
      // Speed up test by reducing retry delay
      const originalRetryDelay = config.invitation.retryDelay;
      config.invitation.retryDelay = 10;
      
      // Act
      const result = await bot.inviteUserToChannel(CHANNEL_ID, USER_ID);
      
      // Assert
      expect(result).to.have.property('success', true);
      expect(result).to.have.property('inviteLink', 'https://t.me/joinchat/custom_invite_link');
      expect(result).to.have.property('attempts', 2);
      
      // Verify all nock mocks were called
      expect(telegramApiMock.isDone()).to.be.true;
      
      // Restore original retry delay
      config.invitation.retryDelay = originalRetryDelay;
    });
    
    it('should fall back to exportChatInviteLink if createChatInviteLink fails with permission error', async () => {
      // Mock the createChatInviteLink API call - fails with permission error
      telegramApiMock
        .post(`/bot${BOT_TOKEN}/createChatInviteLink`)
        .reply(400, {
          ok: false,
          error_code: 400,
          description: 'Bad Request: not enough rights to manage invite links'
        });
      
      // Mock the exportChatInviteLink API call
      telegramApiMock
        .post(`/bot${BOT_TOKEN}/exportChatInviteLink`)
        .reply(200, {
          ok: true,
          result: 'https://t.me/joinchat/fallback_invite_link'
        });
      
      // Mock the sendMessage API call
      telegramApiMock
        .post(`/bot${BOT_TOKEN}/sendMessage`)
        .reply(200, {
          ok: true,
          result: {
            message_id: 12345,
            from: { id: 123456, is_bot: true, first_name: 'TestBot' },
            chat: { id: USER_ID, first_name: 'Test', last_name: 'User', type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: 'Here is your invite link: https://t.me/joinchat/fallback_invite_link'
          }
        });
      
      // Act
      const result = await bot.inviteUserToChannel(CHANNEL_ID, USER_ID);
      
      // Assert
      expect(result).to.have.property('success', true);
      expect(result).to.have.property('inviteLink', 'https://t.me/joinchat/fallback_invite_link');
      expect(result).to.have.property('attempts', 1);
      
      // Verify all nock mocks were called
      expect(telegramApiMock.isDone()).to.be.true;
    });
    
    it('should handle non-retryable errors', async () => {
      // Mock the createChatInviteLink API call - fails with channel not found
      telegramApiMock
        .post(`/bot${BOT_TOKEN}/createChatInviteLink`)
        .reply(400, {
          ok: false,
          error_code: 400,
          description: 'Bad Request: chat not found'
        });
      
      // Act & Assert
      try {
        await bot.inviteUserToChannel(CHANNEL_ID, USER_ID);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.have.property('code', 'CHANNEL_NOT_FOUND');
        
        // Verify the API was called
        expect(telegramApiMock.isDone()).to.be.true;
      }
    });
    
    it('should handle custom invitation options', async () => {
      const options = {
        channelType: 'premium',
        expireHours: 48,
        memberLimit: 5,
        createJoinRequest: true
      };
      
      // Mock the createChatInviteLink API call with expected parameters
      telegramApiMock
        .post(`/bot${BOT_TOKEN}/createChatInviteLink`, (body) => {
          // Verify the request body contains the expected parameters
          return body.chat_id === CHANNEL_ID &&
                 body.member_limit === 5 &&
                 body.creates_join_request === true &&
                 // Approximate check for expire_date (48 hours from now)
                 Math.abs(body.expire_date - (Math.floor(Date.now()/1000) + 48 * 3600)) < 10;
        })
        .reply(200, {
          ok: true,
          result: {
            invite_link: 'https://t.me/joinchat/premium_invite_link',
            creator: { id: 123456, is_bot: true, first_name: 'TestBot' },
            creates_join_request: true,
            member_limit: 5,
            is_primary: false,
            is_revoked: false
          }
        });
      
      // Mock the sendMessage API call with premium message template
      telegramApiMock
        .post(`/bot${BOT_TOKEN}/sendMessage`, (body) => {
          // Verify the message contains the premium template
          return body.chat_id === USER_ID &&
                 body.text.includes('premium') &&
                 body.text.includes('https://t.me/joinchat/premium_invite_link');
        })
        .reply(200, {
          ok: true,
          result: {
            message_id: 12345,
            from: { id: 123456, is_bot: true, first_name: 'TestBot' },
            chat: { id: USER_ID, first_name: 'Test', last_name: 'User', type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: 'Here is your premium invite link: https://t.me/joinchat/premium_invite_link'
          }
        });
      
      // Act
      const result = await bot.inviteUserToChannel(CHANNEL_ID, USER_ID, options);
      
      // Assert
      expect(result).to.have.property('success', true);
      expect(result).to.have.property('inviteLink', 'https://t.me/joinchat/premium_invite_link');
      
      // Verify all nock mocks were called
      expect(telegramApiMock.isDone()).to.be.true;
    });
  });
});