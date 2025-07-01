const TelegramBot = require('node-telegram-bot-api');
const sinon = require('sinon');
const { expect } = require('chai');
const { BotError, ChannelError, UserError, RateLimitError } = require('../../src/utils/botErrors');
const config = require('../../src/config/botExtensions');
const analytics = require('../../src/utils/analytics');
const redis = require('../../src/config/redis').redis;

// Mock dependencies before loading bot extensions
const loggerMock = {
  info: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub()
};

const logUserActionStub = sinon.stub();
const logErrorStub = sinon.stub();

// Mock the logger module
sinon.stub(require('../../src/utils/logger'), 'logger').value(loggerMock);
sinon.stub(require('../../src/utils/logger'), 'logUserAction').value(logUserActionStub);
sinon.stub(require('../../src/utils/logger'), 'logError').value(logErrorStub);

// Mock analytics functions
sinon.stub(analytics, 'trackEvent').resolves();
sinon.stub(analytics, 'checkRateLimit').resolves(true);

// Load the bot extensions
require('../../src/utils/botExtensions');

describe('Bot Extensions', () => {
  let bot;
  let exportChatInviteLinkStub;
  let createChatInviteLinkStub;
  let sendMessageStub;
  
  beforeEach(() => {
    // Create a new bot instance for each test
    bot = new TelegramBot('test_token', { polling: false });
    
    // Stub the methods that inviteUserToChannel uses
    exportChatInviteLinkStub = sinon.stub(bot, 'exportChatInviteLink').resolves('https://t.me/joinchat/test_invite_link');
    createChatInviteLinkStub = sinon.stub(bot, 'createChatInviteLink').resolves({
      invite_link: 'https://t.me/joinchat/custom_invite_link'
    });
    sendMessageStub = sinon.stub(bot, 'sendMessage').resolves({ message_id: 123 });
    
    // Reset stubs
    analytics.trackEvent.resetHistory();
    analytics.checkRateLimit.resetHistory();
    logUserActionStub.resetHistory();
    logErrorStub.resetHistory();
    loggerMock.info.resetHistory();
    loggerMock.warn.resetHistory();
    loggerMock.error.resetHistory();
    
    // Mock Redis lpush
    if (redis) {
      sinon.stub(redis, 'lpush').resolves();
    }
  });
  
  afterEach(() => {
    // Restore the stubbed methods
    sinon.restore();
  });
  
  describe('inviteUserToChannel', () => {
    it('should create a custom invite link and send it to the user', async () => {
      // Arrange
      const channelId = '-100123456789';
      const userId = '987654321';
      
      // Act
      const result = await bot.inviteUserToChannel(channelId, userId);
      
      // Assert
      expect(createChatInviteLinkStub.calledOnce).to.be.true;
      expect(sendMessageStub.calledOnce).to.be.true;
      expect(sendMessageStub.firstCall.args[0]).to.equal(userId);
      expect(sendMessageStub.firstCall.args[1]).to.include('https://t.me/joinchat/custom_invite_link');
      expect(result).to.deep.include({
        success: true,
        inviteLink: 'https://t.me/joinchat/custom_invite_link',
        attempts: 1
      });
      expect(result).to.have.property('responseTime');
      
      // Verify analytics tracking
      expect(analytics.trackEvent.calledTwice).to.be.true;
      expect(analytics.trackEvent.firstCall.args[0]).to.equal('channel_invitation_attempt');
      expect(analytics.trackEvent.secondCall.args[0]).to.equal('channel_invitation');
      expect(analytics.trackEvent.secondCall.args[1].status).to.equal('success');
    });
    
    it('should fall back to exportChatInviteLink if createChatInviteLink fails', async () => {
      // Arrange
      const channelId = '-100123456789';
      const userId = '987654321';
      const error = new Error('Failed to create chat invite link');
      
      // Make createChatInviteLink fail
      createChatInviteLinkStub.rejects(error);
      
      // Act
      const result = await bot.inviteUserToChannel(channelId, userId);
      
      // Assert
      expect(createChatInviteLinkStub.calledOnce).to.be.true;
      expect(exportChatInviteLinkStub.calledOnce).to.be.true;
      expect(sendMessageStub.calledOnce).to.be.true;
      expect(result).to.deep.include({
        success: true,
        inviteLink: 'https://t.me/joinchat/test_invite_link',
        attempts: 1
      });
      
      // Verify warning was logged
      expect(loggerMock.warn.calledOnce).to.be.true;
      expect(loggerMock.warn.firstCall.args[0]).to.include('Failed to create invite link');
    });
    
    it('should retry if sendMessage fails temporarily', async () => {
      // Arrange
      const channelId = '-100123456789';
      const userId = '987654321';
      const error = new Error('Failed to send message');
      error.code = 'ETELEGRAM';
      
      // Make sendMessage fail on first attempt, succeed on second
      sendMessageStub.onFirstCall().rejects(error);
      sendMessageStub.onSecondCall().resolves({ message_id: 123 });
      
      // Speed up test by reducing retry delay
      const originalRetryDelay = config.invitation.retryDelay;
      config.invitation.retryDelay = 10;
      
      // Act
      const result = await bot.inviteUserToChannel(channelId, userId);
      
      // Assert
      expect(createChatInviteLinkStub.callCount).to.equal(2);
      expect(sendMessageStub.callCount).to.equal(2);
      expect(result).to.deep.include({
        success: true,
        attempts: 2
      });
      
      // Restore original retry delay
      config.invitation.retryDelay = originalRetryDelay;
    });
    
    it('should throw an error if sendMessage fails after all retries', async () => {
      // Arrange
      const channelId = '-100123456789';
      const userId = '987654321';
      const error = new Error('Failed to send message');
      error.code = 'ETELEGRAM';
      
      // Make sendMessage always fail
      sendMessageStub.rejects(error);
      
      // Speed up test by reducing retry delay and max retries
      const originalRetryDelay = config.invitation.retryDelay;
      const originalMaxRetries = config.invitation.maxRetries;
      config.invitation.retryDelay = 10;
      config.invitation.maxRetries = 2;
      
      // Act & Assert
      try {
        await bot.inviteUserToChannel(channelId, userId);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
        expect(createChatInviteLinkStub.callCount).to.equal(2);
        expect(sendMessageStub.callCount).to.equal(2);
        
        // Verify error tracking
        expect(analytics.trackEvent.calledTwice).to.be.true;
        expect(analytics.trackEvent.secondCall.args[0]).to.equal('channel_invitation');
        expect(analytics.trackEvent.secondCall.args[1].status).to.equal('error');
      }
      
      // Restore original values
      config.invitation.retryDelay = originalRetryDelay;
      config.invitation.maxRetries = originalMaxRetries;
    });
    
    it('should validate channel ID', async () => {
      // Arrange
      const invalidChannelId = 'invalid_channel';
      const userId = '987654321';
      
      // Act & Assert
      try {
        await bot.inviteUserToChannel(invalidChannelId, userId);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(ChannelError);
        expect(err.code).to.equal('INVALID_CHANNEL_ID');
        expect(logErrorStub.calledOnce).to.be.true;
      }
    });
    
    it('should validate user ID', async () => {
      // Arrange
      const channelId = '-100123456789';
      const invalidUserId = 'invalid_user';
      
      // Act & Assert
      try {
        await bot.inviteUserToChannel(channelId, invalidUserId);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(UserError);
        expect(err.code).to.equal('INVALID_USER_ID');
        expect(logErrorStub.calledOnce).to.be.true;
      }
    });
    
    it('should check rate limits', async () => {
      // Arrange
      const channelId = '-100123456789';
      const userId = '987654321';
      
      // Make rate limit check fail
      analytics.checkRateLimit.restore();
      sinon.stub(analytics, 'checkRateLimit')
        .onFirstCall().resolves(true)  // First call for user rate limit
        .onSecondCall().resolves(false); // Second call for channel rate limit
      
      // Act & Assert
      try {
        await bot.inviteUserToChannel(channelId, userId);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(RateLimitError);
        expect(err.code).to.equal('CHANNEL_RATE_LIMIT_EXCEEDED');
        expect(analytics.checkRateLimit.calledTwice).to.be.true;
        expect(logErrorStub.calledOnce).to.be.true;
      }
    });
    
    it('should support custom invitation options', async () => {
      // Arrange
      const channelId = '-100123456789';
      const userId = '987654321';
      const options = {
        channelType: 'premium',
        expireHours: 48,
        memberLimit: 5,
        createJoinRequest: true
      };
      
      // Act
      await bot.inviteUserToChannel(channelId, userId, options);
      
      // Assert
      expect(createChatInviteLinkStub.calledOnce).to.be.true;
      expect(createChatInviteLinkStub.firstCall.args[1]).to.deep.include({
        member_limit: 5,
        creates_join_request: true
      });
      
      // Verify expiry time is approximately 48 hours (with some tolerance)
      const expireArg = createChatInviteLinkStub.firstCall.args[1].expire_date;
      const expectedExpiry = Math.floor(Date.now()/1000) + (48 * 3600);
      expect(expireArg).to.be.closeTo(expectedExpiry, 10);
      
      // Verify premium message template was used
      expect(sendMessageStub.firstCall.args[1]).to.include(config.inviteMessages.premium.replace('{inviteLink}', 'https://t.me/joinchat/custom_invite_link'));
    });
  });
});