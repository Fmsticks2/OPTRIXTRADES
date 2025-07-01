/**
 * Performance tests for Bot Extensions
 * 
 * These tests evaluate the performance of bot extensions under high load.
 * They measure response times, success rates, and resource usage.
 */

const TelegramBot = require('node-telegram-bot-api');
const nock = require('nock');
const sinon = require('sinon');
const { expect } = require('chai');
const config = require('../../src/config/botExtensions');
const redis = require('../../src/config/redis').redis;
const { performance } = require('perf_hooks');

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

describe('Bot Extensions Performance Tests', function() {
  // Increase timeout for performance tests
  this.timeout(30000);
  
  const BOT_TOKEN = 'test_bot_token';
  const TELEGRAM_API = 'https://api.telegram.org';
  
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
    
    // Reset performance metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      minResponseTime: Number.MAX_SAFE_INTEGER,
      maxResponseTime: 0,
      totalResponseTime: 0,
      startTime: 0,
      endTime: 0
    };
  });
  
  afterEach(() => {
    // Restore all mocks
    sinon.restore();
    nock.cleanAll();
    
    // Calculate and log performance metrics
    const metrics = this.metrics;
    metrics.avgResponseTime = metrics.totalResponseTime / metrics.totalRequests;
    metrics.successRate = (metrics.successfulRequests / metrics.totalRequests) * 100;
    metrics.totalDuration = metrics.endTime - metrics.startTime;
    metrics.throughput = metrics.totalRequests / (metrics.totalDuration / 1000);
    
    console.log('\nPerformance Test Results:');
    console.log(`Total Requests: ${metrics.totalRequests}`);
    console.log(`Successful Requests: ${metrics.successfulRequests}`);
    console.log(`Failed Requests: ${metrics.failedRequests}`);
    console.log(`Success Rate: ${metrics.successRate.toFixed(2)}%`);
    console.log(`Min Response Time: ${metrics.minResponseTime.toFixed(2)}ms`);
    console.log(`Max Response Time: ${metrics.maxResponseTime.toFixed(2)}ms`);
    console.log(`Avg Response Time: ${metrics.avgResponseTime.toFixed(2)}ms`);
    console.log(`Total Duration: ${metrics.totalDuration.toFixed(2)}ms`);
    console.log(`Throughput: ${metrics.throughput.toFixed(2)} requests/second`);
    
    // Calculate percentiles
    if (metrics.responseTimes.length > 0) {
      metrics.responseTimes.sort((a, b) => a - b);
      const p50 = metrics.responseTimes[Math.floor(metrics.responseTimes.length * 0.5)];
      const p90 = metrics.responseTimes[Math.floor(metrics.responseTimes.length * 0.9)];
      const p95 = metrics.responseTimes[Math.floor(metrics.responseTimes.length * 0.95)];
      const p99 = metrics.responseTimes[Math.floor(metrics.responseTimes.length * 0.99)];
      
      console.log(`P50 Response Time: ${p50.toFixed(2)}ms`);
      console.log(`P90 Response Time: ${p90.toFixed(2)}ms`);
      console.log(`P95 Response Time: ${p95.toFixed(2)}ms`);
      console.log(`P99 Response Time: ${p99.toFixed(2)}ms`);
    }
  });
  
  /**
   * Helper function to record metrics for a request
   */
  function recordMetrics(startTime, success) {
    const responseTime = performance.now() - startTime;
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    this.metrics.responseTimes.push(responseTime);
    this.metrics.totalResponseTime += responseTime;
    this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, responseTime);
    this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, responseTime);
  }
  
  /**
   * Helper function to set up API mocks for a successful invitation
   */
  function mockSuccessfulInvitation(channelId, userId) {
    // Mock the createChatInviteLink API call
    telegramApiMock
      .post(`/bot${BOT_TOKEN}/createChatInviteLink`)
      .reply(200, {
        ok: true,
        result: {
          invite_link: 'https://t.me/joinchat/test_invite_link',
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
          chat: { id: userId, first_name: 'Test', last_name: 'User', type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: 'Here is your invite link: https://t.me/joinchat/test_invite_link'
        }
      });
  }
  
  describe('inviteUserToChannel Performance', () => {
    it('should handle multiple concurrent invitations', async function() {
      // Test parameters
      const concurrentRequests = 50;
      const channelIds = Array.from({ length: 5 }, (_, i) => `-10012345678${i}`);
      const userIds = Array.from({ length: 10 }, (_, i) => `98765432${i}`);
      
      // Disable retry delay for faster testing
      const originalRetryDelay = config.invitation.retryDelay;
      config.invitation.retryDelay = 0;
      
      // Set up API mocks for all requests
      for (let i = 0; i < concurrentRequests; i++) {
        const channelId = channelIds[i % channelIds.length];
        const userId = userIds[i % userIds.length];
        mockSuccessfulInvitation.call(this, channelId, userId);
      }
      
      // Create promises for all requests
      const requests = [];
      this.metrics.startTime = performance.now();
      
      for (let i = 0; i < concurrentRequests; i++) {
        const channelId = channelIds[i % channelIds.length];
        const userId = userIds[i % userIds.length];
        
        requests.push(
          (async () => {
            const startTime = performance.now();
            try {
              await bot.inviteUserToChannel(channelId, userId);
              recordMetrics.call(this, startTime, true);
            } catch (error) {
              recordMetrics.call(this, startTime, false);
            }
          })()
        );
      }
      
      // Wait for all requests to complete
      await Promise.all(requests);
      this.metrics.endTime = performance.now();
      
      // Restore original retry delay
      config.invitation.retryDelay = originalRetryDelay;
      
      // Verify all requests were successful
      expect(this.metrics.successfulRequests).to.equal(concurrentRequests);
      expect(this.metrics.failedRequests).to.equal(0);
    });
    
    it('should handle rate limiting gracefully', async function() {
      // Test parameters
      const totalRequests = 30;
      const rateLimitAfter = 10; // Rate limit after this many requests
      const channelId = '-100123456789';
      const userId = '987654321';
      
      // Disable retry delay for faster testing
      const originalRetryDelay = config.invitation.retryDelay;
      config.invitation.retryDelay = 0;
      
      // Set up API mocks for successful and rate-limited requests
      for (let i = 0; i < totalRequests; i++) {
        if (i < rateLimitAfter) {
          // Successful requests
          mockSuccessfulInvitation.call(this, channelId, userId);
        } else {
          // Rate-limited requests
          telegramApiMock
            .post(`/bot${BOT_TOKEN}/createChatInviteLink`)
            .reply(429, {
              ok: false,
              error_code: 429,
              description: 'Too Many Requests: retry after 1',
              parameters: { retry_after: 1 }
            });
        }
      }
      
      // Create promises for all requests
      const requests = [];
      this.metrics.startTime = performance.now();
      
      for (let i = 0; i < totalRequests; i++) {
        requests.push(
          (async () => {
            const startTime = performance.now();
            try {
              await bot.inviteUserToChannel(channelId, userId);
              recordMetrics.call(this, startTime, true);
            } catch (error) {
              recordMetrics.call(this, startTime, false);
            }
          })()
        );
      }
      
      // Wait for all requests to complete
      await Promise.all(requests);
      this.metrics.endTime = performance.now();
      
      // Restore original retry delay
      config.invitation.retryDelay = originalRetryDelay;
      
      // Verify rate-limited requests failed
      expect(this.metrics.successfulRequests).to.equal(rateLimitAfter);
      expect(this.metrics.failedRequests).to.equal(totalRequests - rateLimitAfter);
    });
    
    it('should handle mixed success and failure scenarios', async function() {
      // Test parameters
      const totalRequests = 40;
      const successRate = 0.7; // 70% success rate
      const channelId = '-100123456789';
      const userId = '987654321';
      
      // Disable retry delay for faster testing
      const originalRetryDelay = config.invitation.retryDelay;
      config.invitation.retryDelay = 0;
      
      // Set up API mocks for successful and failed requests
      for (let i = 0; i < totalRequests; i++) {
        if (Math.random() < successRate) {
          // Successful request
          mockSuccessfulInvitation.call(this, channelId, userId);
        } else {
          // Failed request - various error types
          const errorTypes = [
            { code: 400, description: 'Bad Request: chat not found' },
            { code: 403, description: 'Forbidden: bot was kicked from the supergroup chat' },
            { code: 400, description: 'Bad Request: not enough rights to manage invite links' },
            { code: 429, description: 'Too Many Requests: retry after 1', parameters: { retry_after: 1 } }
          ];
          
          const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
          
          telegramApiMock
            .post(`/bot${BOT_TOKEN}/createChatInviteLink`)
            .reply(errorType.code, {
              ok: false,
              error_code: errorType.code,
              description: errorType.description,
              ...(errorType.parameters ? { parameters: errorType.parameters } : {})
            });
        }
      }
      
      // Create promises for all requests
      const requests = [];
      this.metrics.startTime = performance.now();
      
      for (let i = 0; i < totalRequests; i++) {
        requests.push(
          (async () => {
            const startTime = performance.now();
            try {
              await bot.inviteUserToChannel(channelId, userId);
              recordMetrics.call(this, startTime, true);
            } catch (error) {
              recordMetrics.call(this, startTime, false);
            }
          })()
        );
      }
      
      // Wait for all requests to complete
      await Promise.all(requests);
      this.metrics.endTime = performance.now();
      
      // Restore original retry delay
      config.invitation.retryDelay = originalRetryDelay;
      
      // Verify we have both successful and failed requests
      expect(this.metrics.successfulRequests).to.be.greaterThan(0);
      expect(this.metrics.failedRequests).to.be.greaterThan(0);
      expect(this.metrics.totalRequests).to.equal(totalRequests);
    });
  });
});