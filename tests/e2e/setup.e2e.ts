/**
 * E2E Test Setup and Environment Configuration
 * Provides hooks and utilities for E2E test execution
 */

import { pythonEnv } from '../utils/PythonEnvironment';

// Global flags for test skipping
export let PYTHON_AVAILABLE = false;
export let PACKAGE_STATUS: Record<string, boolean> = {};

/**
 * Setup function to be called before all E2E tests
 */
export async function setupE2EEnvironment(): Promise<void> {
  console.log('\n🚀 E2E Test Environment Setup');
  console.log('=' .repeat(60));

  // Check Python environment
  const envInfo = await pythonEnv.checkEnvironment();
  PYTHON_AVAILABLE = envInfo.available;

  // Get package availability
  if (PYTHON_AVAILABLE) {
    PACKAGE_STATUS = await pythonEnv.checkScraperAvailability();
  }

  // Print diagnostics
  await pythonEnv.printDiagnostics();

  // Additional E2E specific setup
  if (PYTHON_AVAILABLE) {
    console.log('\n🧪 E2E Tests Configuration:');
    console.log('   Test Timeout: 60 seconds');
    console.log('   Real Network Calls: Enabled');
    console.log('   Python Wrappers: Active');

    const enabledScrapers = Object.entries(PACKAGE_STATUS)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name);

    if (enabledScrapers.length > 0) {
      console.log(`   Available Scrapers: ${enabledScrapers.join(', ')}`);
    } else {
      console.log('   Available Scrapers: None (install Python packages)');
    }
  } else {
    console.log('\n⚠️  E2E tests will be skipped - Python environment not available');
    console.log('   Run unit tests with: npm test');
    console.log('   Setup Python with: npm run setup:python');
  }

  console.log('=' .repeat(60) + '\n');
}

/**
 * Cleanup function to be called after all E2E tests
 */
export async function cleanupE2EEnvironment(): Promise<void> {
  // Clear any cached data
  pythonEnv.clearCache();
}

/**
 * Helper to skip tests when Python is not available
 */
export function skipIfNoPython(testName: string, testFn: jest.ProvidesCallback): void {
  const skipTest = PYTHON_AVAILABLE ? test : test.skip;
  skipTest(testName, testFn);
}

/**
 * Helper to skip tests when specific package is not available
 */
export function skipIfNoPackage(
  packageName: string,
  testName: string,
  testFn: jest.ProvidesCallback
): void {
  const skipTest = PACKAGE_STATUS[packageName] ? test : test.skip;
  skipTest(testName, testFn);
}

/**
 * Helper to conditionally run describe blocks
 */
export function describeIfPython(
  suiteName: string,
  suiteFn: () => void
): void {
  const describeBlock = PYTHON_AVAILABLE ? describe : describe.skip;
  describeBlock(suiteName, suiteFn);
}

/**
 * Helper to conditionally run describe blocks for specific packages
 */
export function describeIfPackage(
  packageName: string,
  suiteName: string,
  suiteFn: () => void
): void {
  const describeBlock = PACKAGE_STATUS[packageName] ? describe : describe.skip;
  describeBlock(suiteName, suiteFn);
}

/**
 * Get a descriptive message for skipped tests
 */
export function getSkipMessage(packageName?: string): string {
  if (!PYTHON_AVAILABLE) {
    return 'Python environment not available';
  }

  if (packageName && !PACKAGE_STATUS[packageName]) {
    return `Python package '${packageName}' not installed`;
  }

  return 'Test requirements not met';
}

/**
 * Assert that Python environment is available (for use in tests)
 */
export function requirePython(): void {
  if (!PYTHON_AVAILABLE) {
    throw new Error(
      'Python environment is required for this test. ' +
      'Run: npm run setup:python'
    );
  }
}

/**
 * Assert that a specific package is available (for use in tests)
 */
export function requirePackage(packageName: string): void {
  requirePython();

  if (!PACKAGE_STATUS[packageName]) {
    throw new Error(
      `Python package '${packageName}' is required for this test. ` +
      `Install with: pip install ${packageName}`
    );
  }
}

/**
 * Test data paths for E2E tests
 */
export const E2E_TEST_DATA = {
  samplePdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  sampleWebsite: 'https://example.com',
  sampleBlog: 'https://example.com/blog',
  localTestFile: '/test-data/files/sample.pdf',
  tempOutputDir: '/dev-data/e2e-output'
};

/**
 * Common test timeouts
 */
export const E2E_TIMEOUTS = {
  short: 10000,   // 10 seconds
  medium: 30000,  // 30 seconds
  long: 60000,    // 60 seconds
  veryLong: 120000 // 2 minutes
};

/**
 * Mock response generator for offline testing
 */
export function getMockResponse(scraperName: string): any {
  return {
    scraperName,
    content: Buffer.from('Mock content for E2E test'),
    mimeType: 'text/plain',
    metadata: {
      mock: true,
      reason: 'Python environment not available'
    },
    timestamp: new Date()
  };
}