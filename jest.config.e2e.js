/**
 * Jest configuration for E2E tests
 * These tests require Python environment and are run separately
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/e2e'],
  testMatch: ['**/*.e2e.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }],
  },
  // E2E tests may take longer
  testTimeout: 60000,
  globalSetup: '<rootDir>/tests/e2e/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/e2e/globalTeardown.ts',
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