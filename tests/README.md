# OPTRIXTRADES Bot Tests

This directory contains tests for the OPTRIXTRADES Telegram bot.

## Test Structure

The tests are organized to mirror the structure of the `src` directory:

```
tests/
├── config/       # Tests for configuration files
├── controllers/  # Tests for bot controllers
├── models/       # Tests for data models
├── services/     # Tests for business logic services
└── utils/        # Tests for utility functions
```

## Running Tests

To run all tests:

```bash
npm test
```

To run tests for a specific directory:

```bash
npm test -- tests/utils
```

To run a specific test file:

```bash
npm test -- tests/utils/botExtensions.test.js
```

## Testing Framework

The tests use the following libraries:

- **Mocha**: Test runner
- **Chai**: Assertion library
- **Sinon**: Test spies, stubs, and mocks

## Writing Tests

When writing tests, follow these guidelines:

1. Create test files with the `.test.js` extension
2. Place test files in the corresponding directory structure
3. Use descriptive test names that explain what is being tested
4. Follow the Arrange-Act-Assert pattern
5. Mock external dependencies using Sinon
6. Clean up after tests using `afterEach` or `afterAll` hooks

## Example Test

```javascript
const { expect } = require('chai');
const sinon = require('sinon');

describe('Module Name', () => {
  describe('Function Name', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = functionUnderTest(input);
      
      // Assert
      expect(result).to.equal('expected output');
    });
  });
});
```