module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^kb3$': '<rootDir>/tests/mocks/kb3.mock.js',
    '^sqlite3$': '<rootDir>/tests/mocks/sqlite3.mock.js'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(kb3|sqlite3)/)'
  ],
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  testTimeout: 30000
};