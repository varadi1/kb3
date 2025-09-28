#!/usr/bin/env node

/**
 * Check script for Python environment
 * Quickly verifies if Python environment is ready for E2E tests
 */

import { pythonEnv } from '../tests/utils/PythonEnvironment';

async function main() {
  console.log('🔍 Checking Python Environment for E2E Tests\n');

  // Print full diagnostics
  await pythonEnv.printDiagnostics();

  // Get environment info
  const envInfo = await pythonEnv.checkEnvironment();
  const packageDetails = await pythonEnv.getPackageDetails();

  // Exit codes for CI/CD integration
  if (!envInfo.available) {
    console.log('\n❌ Python environment is not available');
    console.log('   Run: npm run setup:python\n');
    process.exit(1);
  }

  if (envInfo.packages.missing.length > 0) {
    console.log('\n⚠️  Some Python packages are missing');
    console.log('   Run: npm run setup:python\n');
    process.exit(2); // Different exit code for missing packages
  }

  // Show package versions
  console.log('\n📦 Installed Package Versions:');
  for (const pkg of packageDetails) {
    if (pkg.installed && pkg.version) {
      console.log(`   ${pkg.name}: v${pkg.version}`);
    }
  }

  console.log('\n✅ Python environment is ready for E2E tests!');
  console.log('   Run E2E tests with: npm run test:e2e\n');
  process.exit(0);
}

// Run the check
main().catch(error => {
  console.error('Error checking Python environment:', error);
  process.exit(1);
});