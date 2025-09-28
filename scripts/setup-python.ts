#!/usr/bin/env node

/**
 * Setup script for Python environment
 * Automates the installation and configuration of Python dependencies for E2E tests
 */

import { pythonEnv } from '../tests/utils/PythonEnvironment';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🚀 KB3 Python Environment Setup\n');
  console.log('=' .repeat(60));

  // Check current environment
  console.log('\n📍 Checking current environment...\n');
  await pythonEnv.printDiagnostics();

  // Ask user if they want to proceed with setup
  const envInfo = await pythonEnv.checkEnvironment();

  if (envInfo.available && envInfo.packages.missing.length === 0) {
    console.log('\n✅ Python environment is already properly configured!');
    console.log('   You can run E2E tests with: npm run test:e2e\n');
    process.exit(0);
  }

  console.log('\n📋 Setup will perform the following actions:');
  if (!envInfo.venvActive) {
    console.log('   1. Create Python virtual environment at .venv/');
  }
  if (envInfo.packages.missing.length > 0) {
    console.log('   2. Install missing Python packages:');
    for (const pkg of envInfo.packages.missing) {
      console.log(`      - ${pkg}`);
    }
  }
  console.log('   3. Install/update Playwright browsers (if needed)');

  // Get user confirmation
  console.log('\n❓ Do you want to proceed with setup? (y/N): ');
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('', async (answer: string) => {
    readline.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('\n❌ Setup cancelled by user\n');
      process.exit(0);
    }

    // Perform setup
    console.log('\n🔧 Starting setup...\n');

    try {
      const success = await pythonEnv.setupEnvironment();

      if (success) {
        // Verify setup
        await pythonEnv.clearCache();
        const finalCheck = await pythonEnv.checkEnvironment();

        if (finalCheck.available && finalCheck.packages.missing.length === 0) {
          console.log('\n✅ Setup completed successfully!');
          console.log('\n📝 Next steps:');
          console.log('   1. Activate virtual environment:');
          console.log('      source .venv/bin/activate  # macOS/Linux');
          console.log('      .venv\\Scripts\\activate     # Windows');
          console.log('   2. Run E2E tests:');
          console.log('      npm run test:e2e');
          console.log('\n💡 Tip: E2E tests validate real scraper behavior with Python libraries');
          console.log('   Unit tests (npm test) validate TypeScript logic without Python\n');
        } else {
          console.log('\n⚠️  Setup completed with warnings');
          if (finalCheck.packages.missing.length > 0) {
            console.log(`   Missing packages: ${finalCheck.packages.missing.join(', ')}`);
          }
        }
      } else {
        console.log('\n❌ Setup failed. Please check the errors above.\n');
        process.exit(1);
      }
    } catch (error) {
      console.error('\n❌ Setup error:', error);
      console.log('\n📝 Manual setup instructions:');
      const instructions = pythonEnv.getSetupInstructions();
      for (const instruction of instructions) {
        console.log(`   ${instruction}`);
      }
      process.exit(1);
    }

    process.exit(0);
  });
}

// Run the setup
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});