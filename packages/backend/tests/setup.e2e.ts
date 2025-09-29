import { jest } from '@jest/globals';

// E2E test environment setup
process.env.NODE_ENV = 'test';
process.env.PORT = '4001';
process.env.FRONTEND_URL = 'http://localhost:3000';

// Use test database for E2E tests
process.env.DATABASE_PATH = './test-data/e2e-test.db';

// Increase timeout for E2E tests
jest.setTimeout(30000);

// Clean up after tests
afterAll(async () => {
  // Give time for connections to close
  await new Promise(resolve => setTimeout(resolve, 1000));
});