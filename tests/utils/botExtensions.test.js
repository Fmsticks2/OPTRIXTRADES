const TelegramBot = require('node-telegram-bot-api');
const sinon = require('sinon');
const { expect } = require('chai');

// Load the bot extensions
require('../../src/utils/botExtensions');

describe('Bot Extensions', () => {
  let bot;
  let exportChatInviteLinkStub;
  let sendMessageStub;
  
  beforeEach(() => {
    // Create a new bot instance for each test
    bot = new TelegramBot('test_token', { polling: false });
    
    // Stub the methods that inviteUserToChannel uses
    exportChatInviteLinkStub = sinon.stub(bot, 'exportChatInviteLink').resolves('https://t.me/joinchat/test_invite_link');
    sendMessageStub = sinon.stub(bot, 'sendMessage').resolves({ message_id: 123 });
  });
  
  afterEach(() => {
    // Restore the stubbed methods
    sinon.restore();
  });
  
  describe('inviteUserToChannel', () => {
    it('should create an invite link and send it to the user', async () => {
      // Arrange
      const channelId = '-100123456789';
      const userId = '987654321';
      
      // Act
      const result = await bot.inviteUserToChannel(channelId, userId);
      
      // Assert
      expect(exportChatInviteLinkStub.calledOnceWith(channelId)).to.be.true;
      expect(sendMessageStub.calledOnce).to.be.true;
      expect(sendMessageStub.firstCall.args[0]).to.equal(userId);
      expect(sendMessageStub.firstCall.args[1]).to.include('https://t.me/joinchat/test_invite_link');
      expect(result).to.deep.equal({
        success: true,
        inviteLink: 'https://t.me/joinchat/test_invite_link'
      });
    });
    
    it('should throw an error if exportChatInviteLink fails', async () => {
      // Arrange
      const channelId = '-100123456789';
      const userId = '987654321';
      const error = new Error('Failed to export chat invite link');
      
      // Restore the stub and create a new one that rejects
      exportChatInviteLinkStub.restore();
      exportChatInviteLinkStub = sinon.stub(bot, 'exportChatInviteLink').rejects(error);
      
      // Act & Assert
      try {
        await bot.inviteUserToChannel(channelId, userId);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
        expect(exportChatInviteLinkStub.calledOnceWith(channelId)).to.be.true;
        expect(sendMessageStub.called).to.be.false;
      }
    });
    
    it('should throw an error if sendMessage fails', async () => {
      // Arrange
      const channelId = '-100123456789';
      const userId = '987654321';
      const error = new Error('Failed to send message');
      
      // Restore the stub and create a new one that rejects
      sendMessageStub.restore();
      sendMessageStub = sinon.stub(bot, 'sendMessage').rejects(error);
      
      // Act & Assert
      try {
        await bot.inviteUserToChannel(channelId, userId);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
        expect(exportChatInviteLinkStub.calledOnceWith(channelId)).to.be.true;
        expect(sendMessageStub.calledOnce).to.be.true;
      }
    });
  });
});