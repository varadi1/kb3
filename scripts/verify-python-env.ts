#!/usr/bin/env npx tsx

/**
 * Verify Python environment and dependencies
 * This script checks if the Python environment is properly configured for running scrapers
 */

import { PythonBridge } from '../src/scrapers/PythonBridge';
import * as fs from 'fs/promises';
import * as path from 'path';

interface PackageInfo {
  name: string;
  required: boolean;
  description: string;
  wrapperFile: string;
}

const REQUIRED_PACKAGES: PackageInfo[] = [
  {
    name: 'crawl4ai',
    required: false,
    description: 'AI-powered web crawling',
    wrapperFile: 'crawl4ai_wrapper.py'
  },
  {
    name: 'docling',
    required: false,
    description: 'Document processing library',
    wrapperFile: 'docling_wrapper.py'
  },
  {
    name: 'deepdoctection',
    required: false,
    description: 'Document layout analysis',
    wrapperFile: 'deepdoctection_wrapper.py'
  },
  {
    name: 'playwright',
    required: false,
    description: 'Browser automation',
    wrapperFile: ''
  }
];

async function verifyPythonEnvironment() {
  console.log('🐍 Python Environment Verification\n');
  console.log('=' .repeat(80));

  const bridge = new PythonBridge();

  // Check Python availability
  console.log('\n📌 Checking Python Installation...');

  try {
    const env = await bridge.checkPythonEnvironment();

    if (!env.available) {
      console.error('❌ Python is not available');
      console.error(`   Error: ${env.error}`);
      console.error('\n   Please ensure Python is installed and accessible.');
      console.error('   Expected path:', bridge.getPythonPath());
      return false;
    }

    console.log('✅ Python is available');
    console.log(`   Version: ${env.pythonVersion?.split('\n')[0]}`);
    console.log(`   Path: ${bridge.getPythonPath()}`);
  } catch (error) {
    console.error('❌ Failed to check Python environment:', error);
    return false;
  }

  // Check virtual environment
  console.log('\n📌 Checking Virtual Environment...');

  const venvPath = path.join(process.cwd(), '.venv');
  const venvExists = await fs.access(venvPath).then(() => true).catch(() => false);

  if (!venvExists) {
    console.warn('⚠️  Virtual environment not found at .venv');
    console.warn('   Run: python3 -m venv .venv');
    console.warn('   Then: source .venv/bin/activate');
    console.warn('   And: pip install -r requirements.txt');
  } else {
    console.log('✅ Virtual environment exists');

    // Check if we're using the venv Python
    const pythonPath = bridge.getPythonPath();
    if (pythonPath.includes('.venv')) {
      console.log('✅ Using virtual environment Python');
    } else {
      console.warn('⚠️  Not using virtual environment Python');
      console.warn(`   Current: ${pythonPath}`);
      console.warn(`   Expected: ${path.join(venvPath, 'bin', 'python')}`);
    }
  }

  // Check Python packages
  console.log('\n📌 Checking Python Packages...\n');

  const packageNames = REQUIRED_PACKAGES.map(p => p.name);
  const packageCheck = await bridge.checkPythonEnvironment(packageNames);

  const results: Array<{ package: PackageInfo; installed: boolean }> = [];

  for (const pkg of REQUIRED_PACKAGES) {
    const installed = !packageCheck.missingPackages.includes(pkg.name);
    results.push({ package: pkg, installed });

    const status = installed ? '✅' : (pkg.required ? '❌' : '⚠️ ');
    const label = installed ? 'Installed' : (pkg.required ? 'MISSING (Required)' : 'Missing (Optional)');

    console.log(`${status} ${pkg.name.padEnd(20)} - ${label}`);
    console.log(`   ${pkg.description}`);

    // Check wrapper file if package is installed
    if (installed && pkg.wrapperFile) {
      const wrapperPath = path.join(
        process.cwd(),
        'src/scrapers/python_wrappers',
        pkg.wrapperFile
      );

      const wrapperExists = await fs.access(wrapperPath).then(() => true).catch(() => false);

      if (wrapperExists) {
        console.log(`   ✅ Wrapper: ${pkg.wrapperFile}`);
      } else {
        console.log(`   ❌ Wrapper missing: ${pkg.wrapperFile}`);
      }
    }

    console.log('');
  }

  // Check Python wrapper files
  console.log('📌 Checking Python Wrapper Scripts...\n');

  const wrapperDir = path.join(process.cwd(), 'src/scrapers/python_wrappers');

  try {
    const wrapperFiles = await fs.readdir(wrapperDir);
    const pythonFiles = wrapperFiles.filter(f => f.endsWith('.py'));

    console.log(`Found ${pythonFiles.length} Python wrapper scripts:`);

    for (const file of pythonFiles) {
      const filePath = path.join(wrapperDir, file);
      const stats = await fs.stat(filePath);
      const size = stats.size;

      // Try to validate Python syntax
      const syntaxCheck = await bridge.execute('python', ['-m', 'py_compile', filePath])
        .then(() => true)
        .catch(() => false);

      const syntaxStatus = syntaxCheck ? '✅' : '⚠️ ';
      console.log(`${syntaxStatus} ${file.padEnd(30)} (${size} bytes)`);
    }
  } catch (error) {
    console.error('❌ Failed to check wrapper directory:', error);
  }

  // Summary
  console.log('\n' + '=' .repeat(80));
  console.log('\n📊 SUMMARY\n');

  const installedCount = results.filter(r => r.installed).length;
  const requiredMissing = results.filter(r => r.package.required && !r.installed).length;

  console.log(`Python: ${packageCheck.available ? '✅ Available' : '❌ Not Available'}`);
  console.log(`Virtual Environment: ${venvExists ? '✅ Exists' : '⚠️  Missing'}`);
  console.log(`Packages: ${installedCount}/${REQUIRED_PACKAGES.length} installed`);

  if (requiredMissing > 0) {
    console.log(`\n❌ Missing ${requiredMissing} required package(s)`);
    console.log('   Install with: pip install -r requirements.txt');
    return false;
  }

  if (installedCount < REQUIRED_PACKAGES.length) {
    console.log(`\n⚠️  Missing ${REQUIRED_PACKAGES.length - installedCount} optional package(s)`);
    console.log('   Some scrapers may not work. Install with: pip install -r requirements.txt');
  }

  // Test recommendations
  console.log('\n📝 TEST RECOMMENDATIONS\n');

  if (packageCheck.available && installedCount > 0) {
    console.log('✅ You can run E2E tests: npm run test:e2e');
    console.log('✅ You can verify scrapers: npm run verify:scrapers');

    if (installedCount === REQUIRED_PACKAGES.length) {
      console.log('✅ All Python scrapers should work');
    } else {
      const missing = results.filter(r => !r.installed).map(r => r.package.name);
      console.log(`⚠️  These scrapers won\'t work: ${missing.join(', ')}`);
    }
  } else {
    console.log('⚠️  E2E tests will be skipped (Python not properly configured)');
    console.log('   Unit tests will still run with mocked Python execution');
  }

  console.log('\n' + '=' .repeat(80));

  return requiredMissing === 0;
}

// Run the verification
verifyPythonEnvironment()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });