/**
 * Python Environment Detection and Setup Utility
 * Provides centralized Python environment checking for E2E tests
 */

import { PythonBridge } from '../../src/scrapers/PythonBridge';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface PythonEnvironmentInfo {
  available: boolean;
  pythonVersion?: string;
  pythonPath?: string;
  venvPath?: string;
  venvActive: boolean;
  packages: {
    installed: string[];
    missing: string[];
  };
  errors: string[];
  warnings: string[];
}

export interface PythonPackageInfo {
  name: string;
  installed: boolean;
  version?: string;
  required?: string;
}

export class PythonEnvironment {
  private static instance: PythonEnvironment;
  private environmentInfo?: PythonEnvironmentInfo;
  private requiredPackages = [
    'playwright',
    'crawl4ai',
    'docling',
    'deepdoctection'
  ];

  private constructor() {}

  static getInstance(): PythonEnvironment {
    if (!PythonEnvironment.instance) {
      PythonEnvironment.instance = new PythonEnvironment();
    }
    return PythonEnvironment.instance;
  }

  /**
   * Check and cache environment information
   */
  async checkEnvironment(forceRefresh = false): Promise<PythonEnvironmentInfo> {
    if (!forceRefresh && this.environmentInfo) {
      return this.environmentInfo;
    }

    const info: PythonEnvironmentInfo = {
      available: false,
      venvActive: false,
      packages: { installed: [], missing: [] },
      errors: [],
      warnings: []
    };

    // Check for virtual environment
    const venvPath = path.join(process.cwd(), '.venv');
    const venvPythonPath = path.join(venvPath, 'bin', 'python');
    const venvExists = fs.existsSync(venvPythonPath);

    if (venvExists) {
      info.venvPath = venvPath;
      info.pythonPath = venvPythonPath;
      info.venvActive = true;
    } else {
      info.warnings.push('Virtual environment not found at .venv/');
      // Try system Python
      info.pythonPath = 'python3';
    }

    // Create bridge with detected Python
    const bridge = new PythonBridge({ pythonPath: info.pythonPath });

    try {
      // Check Python availability and version
      const envCheck = await bridge.checkPythonEnvironment(this.requiredPackages);

      if (envCheck.available) {
        info.available = true;
        info.pythonVersion = envCheck.pythonVersion;

        // Categorize packages
        for (const pkg of this.requiredPackages) {
          if (envCheck.missingPackages.includes(pkg)) {
            info.packages.missing.push(pkg);
          } else {
            info.packages.installed.push(pkg);
          }
        }
      } else {
        info.errors.push(envCheck.error || 'Python not available');
      }
    } catch (error) {
      info.errors.push(`Failed to check Python environment: ${error}`);
    }

    this.environmentInfo = info;
    return info;
  }

  /**
   * Get detailed package information
   */
  async getPackageDetails(): Promise<PythonPackageInfo[]> {
    const info = await this.checkEnvironment();
    if (!info.available || !info.pythonPath) {
      return [];
    }

    const bridge = new PythonBridge({ pythonPath: info.pythonPath });

    const code = `
import json
import pkg_resources
import importlib.metadata

packages = ${JSON.stringify(this.requiredPackages)}
result = []

for pkg_name in packages:
    info = {
        "name": pkg_name,
        "installed": False,
        "version": None
    }

    try:
        # Try different ways to get version
        try:
            info["version"] = importlib.metadata.version(pkg_name)
            info["installed"] = True
        except:
            try:
                dist = pkg_resources.get_distribution(pkg_name)
                info["version"] = dist.version
                info["installed"] = True
            except:
                pass
    except:
        pass

    result.append(info)

print(json.dumps(result))
    `;

    try {
      const result = await bridge.executeCode<PythonPackageInfo[]>(code);
      if (result.success && result.data) {
        return result.data;
      }
    } catch {
      // Return basic info
    }

    return this.requiredPackages.map(name => ({
      name,
      installed: info.packages.installed.includes(name),
      version: undefined
    }));
  }

  /**
   * Get setup instructions based on current environment state
   */
  getSetupInstructions(): string[] {
    const instructions: string[] = [];
    const info = this.environmentInfo;

    if (!info) {
      instructions.push('Run PythonEnvironment.checkEnvironment() first');
      return instructions;
    }

    if (!info.available) {
      instructions.push('1. Install Python 3.8 or higher');
      instructions.push('   - macOS: brew install python3');
      instructions.push('   - Ubuntu: sudo apt-get install python3 python3-pip python3-venv');
      instructions.push('   - Windows: Download from https://www.python.org/');
    }

    if (!info.venvActive) {
      instructions.push('2. Create virtual environment:');
      instructions.push('   python3 -m venv .venv');
      instructions.push('');
      instructions.push('3. Activate virtual environment:');
      instructions.push('   - macOS/Linux: source .venv/bin/activate');
      instructions.push('   - Windows: .venv\\Scripts\\activate');
    }

    if (info.packages.missing.length > 0) {
      instructions.push('4. Install required packages:');
      instructions.push('   pip install -r requirements.txt');
      instructions.push('');
      instructions.push('   Or install specific missing packages:');
      for (const pkg of info.packages.missing) {
        instructions.push(`   pip install ${pkg}`);
      }
    }

    if (instructions.length === 0) {
      instructions.push('✅ Python environment is properly configured!');
    }

    return instructions;
  }

  /**
   * Check if specific scrapers are available
   */
  async checkScraperAvailability(): Promise<Record<string, boolean>> {
    const info = await this.checkEnvironment();

    return {
      docling: info.packages.installed.includes('docling'),
      crawl4ai: info.packages.installed.includes('crawl4ai'),
      deepdoctection: info.packages.installed.includes('deepdoctection'),
      playwright: info.packages.installed.includes('playwright')
    };
  }

  /**
   * Print diagnostic information to console
   */
  async printDiagnostics(): Promise<void> {
    const info = await this.checkEnvironment();
    const packages = await this.getPackageDetails();

    console.log('\n🔍 Python Environment Diagnostics');
    console.log('=' .repeat(60));

    // Basic info
    console.log('\n📍 Environment Status:');
    console.log(`   Python Available: ${info.available ? '✅' : '❌'}`);
    console.log(`   Python Path: ${info.pythonPath || 'Not found'}`);
    if (info.pythonVersion) {
      console.log(`   Python Version: ${info.pythonVersion.split('\n')[0]}`);
    }
    console.log(`   Virtual Env: ${info.venvActive ? '✅ Active' : '❌ Not found'}`);

    // Package status
    console.log('\n📦 Package Status:');
    for (const pkg of packages) {
      const status = pkg.installed ? '✅' : '❌';
      const version = pkg.version ? ` (${pkg.version})` : '';
      console.log(`   ${pkg.name}: ${status}${version}`);
    }

    // Errors and warnings
    if (info.errors.length > 0) {
      console.log('\n❌ Errors:');
      for (const error of info.errors) {
        console.log(`   - ${error}`);
      }
    }

    if (info.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      for (const warning of info.warnings) {
        console.log(`   - ${warning}`);
      }
    }

    // Setup instructions
    const instructions = this.getSetupInstructions();
    if (instructions.length > 0 && instructions[0] !== '✅ Python environment is properly configured!') {
      console.log('\n📝 Setup Instructions:');
      for (const instruction of instructions) {
        console.log(`   ${instruction}`);
      }
    }

    console.log('=' .repeat(60));
  }

  /**
   * Skip test helper based on Python availability
   */
  getSkipFunction(testFn: jest.It): jest.It | jest.It['skip'] {
    const info = this.environmentInfo;
    return (info && info.available) ? testFn : testFn.skip;
  }

  /**
   * Skip test helper for specific package
   */
  getSkipFunctionForPackage(testFn: jest.It, packageName: string): jest.It | jest.It['skip'] {
    const info = this.environmentInfo;
    const hasPackage = info && info.packages.installed.includes(packageName.toLowerCase());
    return hasPackage ? testFn : testFn.skip;
  }

  /**
   * Setup script to initialize Python environment
   */
  async setupEnvironment(): Promise<boolean> {
    console.log('🔧 Setting up Python environment...\n');

    try {
      // Check if Python is available
      try {
        execSync('python3 --version', { stdio: 'pipe' });
      } catch {
        console.error('❌ Python 3 is not installed');
        console.log('Please install Python 3.8+ first');
        return false;
      }

      // Create virtual environment if not exists
      const venvPath = path.join(process.cwd(), '.venv');
      if (!fs.existsSync(venvPath)) {
        console.log('Creating virtual environment...');
        execSync('python3 -m venv .venv', { stdio: 'inherit' });
        console.log('✅ Virtual environment created');
      } else {
        console.log('✅ Virtual environment already exists');
      }

      // Install requirements
      const requirementsPath = path.join(process.cwd(), 'requirements.txt');
      if (fs.existsSync(requirementsPath)) {
        console.log('Installing Python packages...');
        const pipPath = path.join(venvPath, 'bin', 'pip');
        execSync(`${pipPath} install -r requirements.txt`, { stdio: 'inherit' });
        console.log('✅ Python packages installed');
      } else {
        console.log('⚠️  requirements.txt not found');
      }

      // Install Playwright browsers if playwright is installed
      const info = await this.checkEnvironment(true);
      if (info.packages.installed.includes('playwright')) {
        console.log('Installing Playwright browsers...');
        const playwrightPath = path.join(venvPath, 'bin', 'playwright');
        execSync(`${playwrightPath} install`, { stdio: 'inherit' });
        console.log('✅ Playwright browsers installed');
      }

      console.log('\n✅ Python environment setup complete!');
      return true;

    } catch (error) {
      console.error('❌ Setup failed:', error);
      return false;
    }
  }

  /**
   * Clear cached environment info
   */
  clearCache(): void {
    this.environmentInfo = undefined;
  }
}

// Export singleton instance
export const pythonEnv = PythonEnvironment.getInstance();