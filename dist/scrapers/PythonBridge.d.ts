/**
 * Python bridge for executing Python scripts from Node.js
 * Single Responsibility: Handle cross-language communication with Python
 */
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
export declare class PythonBridge {
    private readonly pythonPath;
    private readonly timeout;
    private readonly workingDirectory;
    private readonly environment;
    constructor(options?: PythonBridgeOptions);
    /**
     * Execute a Python script with arguments and return parsed JSON result
     */
    execute<T = any>(scriptPath: string, args?: any[], options?: {
        timeout?: number;
    }): Promise<PythonExecutionResult<T>>;
    /**
     * Execute Python code directly (creates temporary script)
     */
    executeCode<T = any>(pythonCode: string, args?: any[], options?: {
        timeout?: number;
    }): Promise<PythonExecutionResult<T>>;
    /**
     * Check if Python and required packages are available
     */
    checkPythonEnvironment(requiredPackages?: string[]): Promise<{
        available: boolean;
        pythonVersion?: string;
        missingPackages: string[];
        error?: string;
    }>;
    /**
     * Get the Python path being used
     */
    getPythonPath(): string;
    /**
     * Get the working directory
     */
    getWorkingDirectory(): string;
    /**
     * Create a new bridge instance with different options
     */
    createChild(options: Partial<PythonBridgeOptions>): PythonBridge;
}
/**
 * Default bridge instance using virtual environment
 */
export declare const defaultPythonBridge: PythonBridge;
//# sourceMappingURL=PythonBridge.d.ts.map