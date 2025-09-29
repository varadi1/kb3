module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/e2e'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.e2e.ts'],
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  testTimeout: 30000,
  // No moduleNameMapper - use real modules for E2E tests
  transformIgnorePatterns: [
    'node_modules/'
  ]
};