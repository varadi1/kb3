module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }
  },
  // Transform ESM packages from node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(unified|remark|remark-parse|remark-stringify|remark-html|bail|is-plain-obj|trough|vfile|vfile-message|unist-util-stringify-position|micromark|mdast-util-from-markdown|mdast-util-to-markdown|mdast-util-to-string|micromark-.*|unist-.*|mdast-.*|decode-named-character-reference|character-entities|property-information|hast-.*|hastscript|html-void-elements|parse-entities|space-separated-tokens|comma-separated-tokens|estree-.*|web-namespaces|zwitch|longest-streak|ccount|markdown-table|escape-string-regexp)/)'
  ],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};