module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  // Exclude E2E tests from default test run - they require Python environment
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/e2e/'  // E2E tests are run separately with npm run test:e2e
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  // Transform ESM packages from node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(unified|remark|remark-parse|remark-stringify|remark-html|bail|is-plain-obj|trough|vfile|vfile-message|unist-util-stringify-position|micromark|mdast-util-from-markdown|mdast-util-to-markdown|mdast-util-to-string|micromark-.*|unist-.*|mdast-.*|decode-named-character-reference|character-entities|property-information|hast-.*|hastscript|html-void-elements|parse-entities|space-separated-tokens|comma-separated-tokens|estree-.*|web-namespaces|zwitch|longest-streak|ccount|markdown-table|escape-string-regexp)/)'
  ],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};