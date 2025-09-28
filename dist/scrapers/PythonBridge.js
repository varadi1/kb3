"use strict";
/**
 * Python bridge for executing Python scripts from Node.js
 * Single Responsibility: Handle cross-language communication with Python
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultPythonBridge = exports.PythonBridge = void 0;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const os_1 = require("os");
class PythonBridge {
    pythonPath;
    timeout;
    workingDirectory;
    environment;
    constructor(options = {}) {
        // Use virtual environment Python by default
        this.pythonPath = options.pythonPath || path.join(process.cwd(), '.venv', 'bin', 'python');
        this.timeout = options.timeout || 120000; // 2 minutes default
        this.workingDirectory = options.workingDirectory || process.cwd();
        this.environment = {
            ...process.env,
            ...options.environment
        };
    }
    /**
     * Execute a Python script with arguments and return parsed JSON result
     */
    async execute(scriptPath, args = [], options = {}) {
        const startTime = Date.now();
        const timeoutMs = options.timeout || this.timeout;
        return new Promise((resolve) => {
            // Convert arguments to JSON strings for Python
            const pythonArgs = args.map(arg => JSON.stringify(arg));
            const child = (0, child_process_1.spawn)(this.pythonPath, [scriptPath, ...pythonArgs], {
                cwd: this.workingDirectory,
                env: this.environment,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            let stdout = '';
            let stderr = '';
            let timeoutId;
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
            child.stdout?.on('data', (data) => {
                stdout += data.toString();
            });
            // Collect stderr
            child.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
            // Handle process exit
            child.on('close', (code) => {
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
                    }
                    catch (parseError) {
                        resolve({
                            success: false,
                            error: `Failed to parse Python output as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
                            stderr: stderr || stdout,
                            exitCode: code,
                            executionTime
                        });
                    }
                }
                else {
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
            child.on('error', (error) => {
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
    async executeCode(pythonCode, args = [], options = {}) {
        // Create temporary script file
        const tempDir = (0, os_1.tmpdir)();
        const scriptPath = path.join(tempDir, `python_bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.py`);
        try {
            await fs.writeFile(scriptPath, pythonCode, 'utf-8');
            const result = await this.execute(scriptPath, args, options);
            return result;
        }
        finally {
            // Clean up temporary file
            try {
                await fs.unlink(scriptPath);
            }
            catch {
                // Ignore cleanup errors
            }
        }
    }
    /**
     * Check if Python and required packages are available
     */
    async checkPythonEnvironment(requiredPackages = []) {
        try {
            // Check Python version
            const versionResult = await this.execute('--version');
            if (!versionResult.success) {
                return {
                    available: false,
                    missingPackages: requiredPackages,
                    error: 'Python not available or not executable'
                };
            }
            // Check required packages
            const checkCode = `
import sys
import json

packages = ${JSON.stringify(requiredPackages)}
missing = []

for package in packages:
    try:
        __import__(package)
    except ImportError:
        missing.append(package)

result = {
    "python_version": sys.version,
    "missing_packages": missing
}

print(json.dumps(result))
      `;
            const packageResult = await this.executeCode(checkCode);
            if (packageResult.success && packageResult.data) {
                return {
                    available: true,
                    pythonVersion: packageResult.data.python_version,
                    missingPackages: packageResult.data.missing_packages || []
                };
            }
            else {
                return {
                    available: false,
                    missingPackages: requiredPackages,
                    error: packageResult.error || 'Failed to check package availability'
                };
            }
        }
        catch (error) {
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
    getPythonPath() {
        return this.pythonPath;
    }
    /**
     * Get the working directory
     */
    getWorkingDirectory() {
        return this.workingDirectory;
    }
    /**
     * Create a new bridge instance with different options
     */
    createChild(options) {
        return new PythonBridge({
            pythonPath: this.pythonPath,
            timeout: this.timeout,
            workingDirectory: this.workingDirectory,
            environment: this.environment,
            ...options
        });
    }
}
exports.PythonBridge = PythonBridge;
/**
 * Default bridge instance using virtual environment
 */
exports.defaultPythonBridge = new PythonBridge();
//# sourceMappingURL=PythonBridge.js.map