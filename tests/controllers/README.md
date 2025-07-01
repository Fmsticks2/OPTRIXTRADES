# Bot Command Tests

This directory contains tests for the bot's command handlers. These tests verify that the bot correctly responds to commands like `/start`, `/help`, etc.

## Test Structure

### Unit Tests

The unit tests focus on testing the command handlers in isolation, with all dependencies mocked. This ensures that the command handlers work correctly regardless of the state of external services.

- `welcomeController.test.js`: Tests for the `/start` and `/help` commands, as well as the `register` callback.

### Integration Tests

The integration tests verify that the bot correctly processes commands in a more realistic environment. These tests simulate command messages and check the responses.

- `botCommands.integration.test.js`: Tests for various bot commands in an integrated environment.

### Performance Tests

The performance tests measure the bot's ability to handle multiple commands simultaneously, simulating high load scenarios.

- `botCommands.performance.test.js`: Tests for bot command performance under load.

## Running the Tests

To run all command tests:

```bash
npm test -- tests/controllers
```

To run a specific test file:

```bash
npm test -- tests/controllers/welcomeController.test.js
```

## Writing New Command Tests

When adding tests for new commands, follow these guidelines:

1. Create unit tests for the command handler in isolation
2. Add integration tests to verify the command works in a realistic environment
3. Update performance tests to include the new command if it's a frequently used command

## Example Test

Here's an example of how to test a new command:

```javascript
describe('Command: /newcommand', () => {
  it('should respond to /newcommand command', async () => {
    // Arrange - simulate a /newcommand command
    const update = simulateCommand('/newcommand');
    
    // Act - process the update
    await bot.processUpdate(update);
    
    // Assert - check that the bot sent the expected response
    expect(sendMessageStub.calledOnce).to.be.true;
    
    // Verify the message content
    const sendMessageArgs = sendMessageStub.firstCall.args;
    expect(sendMessageArgs[0]).to.equal(CHAT_ID);
    expect(sendMessageArgs[1]).to.include('Expected response');
  });
});
```