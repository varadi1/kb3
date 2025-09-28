/**
 * Global setup for E2E tests - runs once before all test suites
 */

import { pythonEnv } from '../utils/PythonEnvironment';

export default async function globalSetup(): Promise<void> {
  console.log('\n🔧 Global E2E Test Setup\n');

  // Check Python environment early
  const envInfo = await pythonEnv.checkEnvironment();

  // Store environment info for tests to use
  (global as any).__PYTHON_ENV__ = {
    available: envInfo.available,
    packages: envInfo.packages,
    pythonPath: envInfo.pythonPath
  };

  if (!envInfo.available) {
    console.log('⚠️  Python environment not configured');
    console.log('   E2E tests require Python and packages to be installed');
    console.log('\n   Quick setup:');
    console.log('   1. python3 -m venv .venv');
    console.log('   2. source .venv/bin/activate');
    console.log('   3. pip install -r requirements.txt\n');
  } else {
    console.log('✅ Python environment detected');
    if (envInfo.packages.missing.length > 0) {
      console.log(`⚠️  Missing packages: ${envInfo.packages.missing.join(', ')}`);
    }
  }
}