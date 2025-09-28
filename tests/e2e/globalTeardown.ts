/**
 * Global teardown for E2E tests - runs once after all test suites
 */

export default async function globalTeardown(): Promise<void> {
  // Clean up any global resources
  console.log('\n✨ E2E Test Cleanup Complete\n');

  // Clear global environment info
  delete (global as any).__PYTHON_ENV__;

  // Additional cleanup if needed
  // For example: close database connections, clean temp files, etc.
}