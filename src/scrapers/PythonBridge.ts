/**
 * Python bridge for executing Python scripts from Node.js
 * Single Responsibility: Handle cross-language communication with Python
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { tmpdir } from 'os';

export interface PythonBridgeOptions {
  pythonPath?: string;
  timeout?: number;
  workingDirectory?: string;
  environment?: Record<string, string>;
}

export interface PythonExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  stderr?: string;
  exitCode?: number;
  executionTime: number;
}

export class PythonBridge {
  private readonly pythonPath: string;
  private readonly timeout: number;
  private readonly workingDirectory: string;
  private readonly environment: Record<string, string>;

  constructor(options: PythonBridgeOptions = {}) {
    // Use virtual environment Python by default
    this.pythonPath = options.pythonPath || path.join(process.cwd(), '.venv', 'bin', 'python');
    this.timeout = options.timeout || 120000; // 2 minutes default
    this.workingDirectory = options.workingDirectory || process.cwd();
    this.environment = {
      ...(process.env as Record<string, string>),
      ...options.environment
    };
  }

  /**
   * Execute a Python script with arguments and return parsed JSON result
   */
  async execute<T = any>(
    scriptPath: string,
    args: any[] = [],
    options: { timeout?: number } = {}
  ): Promise<PythonExecutionResult<T>> {
    const startTime = Date.now();
    const timeoutMs = options.timeout || this.timeout;

    return new Promise((resolve) => {
      // Convert arguments to JSON strings for Python
      const pythonArgs = args.map(arg => JSON.stringify(arg));

      const child: ChildProcess = spawn(
        this.pythonPath,
        [scriptPath, ...pythonArgs],
        {
          cwd: this.workingDirectory,
          env: this.environment,
          stdio: ['pipe', 'pipe', 'pipe']
        }
      );

      let stdout = '';
      let stderr = '';
      let timeoutId: NodeJS.Timeout;

      // Set up timeout
      timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          success: false,
          error: `Python script timed out after ${timeoutMs}ms`,
          stderr,
          exitCode: -1,
          executionTime: Date.now() - startTime
        });
      }, timeoutMs);

      // Collect stdout
      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      // Collect stderr
      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      // Handle process exit
      child.on('close', (code: number | null) => {
        clearTimeout(timeoutId);

        const executionTime = Date.now() - startTime;

        if (code === 0) {
          try {
            // Try to parse JSON result from stdout
            const result = stdout.trim() ? JSON.parse(stdout.trim()) : null;
            resolve({
              success: true,
              data: result,
              stderr: stderr || undefined,
              exitCode: code,
              executionTime
            });
          } catch (parseError) {
            resolve({
              success: false,
              error: `Failed to parse Python output as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
              stderr: stderr || stdout,
              exitCode: code,
              executionTime
            });
          }
        } else {
          resolve({
            success: false,
            error: `Python script exited with code ${code}`,
            stderr,
            exitCode: code || -1,
            executionTime
          });
        }
      });

      // Handle spawn errors
      child.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: `Failed to spawn Python process: ${error.message}`,
          stderr,
          exitCode: -1,
          executionTime: Date.now() - startTime
        });
      });
    });
  }

  /**
   * Execute Python code directly (creates temporary script)
   */
  async executeCode<T = any>(
    pythonCode: string,
    args: any[] = [],
    options: { timeout?: number } = {}
  ): Promise<PythonExecutionResult<T>> {
    // Create temporary script file
    const tempDir = tmpdir();
    const scriptPath = path.join(tempDir, `python_bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.py`);

    try {
      await fs.writeFile(scriptPath, pythonCode, 'utf-8');
      const result = await this.execute<T>(scriptPath, args, options);
      return result;
    } finally {
      // Clean up temporary file
      try {
        await fs.unlink(scriptPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Check if Python and required packages are available
   */
  async checkPythonEnvironment(requiredPackages: string[] = []): Promise<{
    available: boolean;
    pythonVersion?: string;
    missingPackages: string[];
    error?: string;
  }> {
    try {
      // Check Python version by running a simple command
      const versionCode = `
import sys
import json
print(json.dumps({"version": sys.version}))
      `;

      const versionResult = await this.executeCode(versionCode);
      if (!versionResult.success || !versionResult.data) {
        return {
          available: false,
          missingPackages: requiredPackages,
          error: 'Python not available or not executable'
        };
      }

      const pythonVersion = versionResult.data.version;

      // If no packages to check, just return Python is available
      if (requiredPackages.length === 0) {
        return {
          available: true,
          pythonVersion,
          missingPackages: []
        };
      }

      // Check required packages
      const checkCode = `
import sys
import json
import importlib.util

packages = ${JSON.stringify(requiredPackages)}
missing = []
installed = []

for package in packages:
    # First check if package is installed (spec exists)
    spec = importlib.util.find_spec(package)
    if spec is None:
        missing.append(package)
    else:
        # Package is installed even if import fails due to dependencies
        installed.append(package)

result = {
    "missing_packages": missing,
    "installed_packages": installed
}

print(json.dumps(result))
      `;

      const packageResult = await this.executeCode(checkCode);

      if (packageResult.success && packageResult.data) {
        return {
          available: true,
          pythonVersion,
          missingPackages: packageResult.data.missing_packages || []
        };
      } else {
        // Python is available but package check failed
        return {
          available: true,
          pythonVersion,
          missingPackages: requiredPackages,
          error: 'Failed to check package availability'
        };
      }
    } catch (error) {
      return {
        available: false,
        missingPackages: requiredPackages,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get the Python path being used
   */
  getPythonPath(): string {
    return this.pythonPath;
  }

  /**
   * Get the working directory
   */
  getWorkingDirectory(): string {
    return this.workingDirectory;
  }

  /**
   * Create a new bridge instance with different options
   */
  createChild(options: Partial<PythonBridgeOptions>): PythonBridge {
    return new PythonBridge({
      pythonPath: this.pythonPath,
      timeout: this.timeout,
      workingDirectory: this.workingDirectory,
      environment: this.environment,
      ...options
    });
  }
}

/**
 * Default bridge instance using virtual environment
 */
export const defaultPythonBridge = new PythonBridge();