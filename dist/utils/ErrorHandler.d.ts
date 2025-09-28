/**
 * Comprehensive error handling utilities
 * Single Responsibility: Centralized error handling and recovery
 */
import { ErrorCode, ProcessingError, ProcessingStage } from '../interfaces/IOrchestrator';
export declare class ErrorHandler {
    private static readonly retryableErrors;
    private static readonly userFriendlyMessages;
    /**
     * Determines if an error is retryable
     * @param error The error to check
     * @returns true if the error is retryable
     */
    static isRetryable(error: Error | ProcessingError): boolean;
    /**
     * Gets a user-friendly error message
     * @param error The error
     * @returns User-friendly message
     */
    static getUserFriendlyMessage(error: Error | ProcessingError): string;
    /**
     * Creates a custom error with additional context
     * @param code Error code
     * @param message Error message
     * @param context Additional context
     * @returns Custom error object
     */
    static createError(code: string, message: string, context?: any): Error;
    /**
     * Categorizes an error by severity
     * @param error The error to categorize
     * @returns Error severity level
     */
    static categorizeError(error: Error | ProcessingError): ErrorSeverity;
    /**
     * Creates a standardized processing error
     * @param originalError The original error
     * @param code The error code
     * @param stage The processing stage
     * @param details Additional error details
     * @returns Standardized processing error
     */
    static createProcessingError(originalError: Error, code: ErrorCode, stage: ProcessingStage, details?: any): ProcessingError;
    /**
     * Handles errors with appropriate logging and recovery
     * @param error The error to handle
     * @param context Error context information
     * @returns Error handling result
     */
    static handleError(error: Error | ProcessingError, context: ErrorContext): ErrorHandlingResult;
    /**
     * Wraps a function with error handling
     * @param fn Function to wrap
     * @param context Error context
     * @returns Wrapped function
     */
    static withErrorHandling<T extends any[], R>(fn: (...args: T) => Promise<R>, context: ErrorContext): (...args: T) => Promise<R>;
    /**
     * Creates an error context for tracking
     * @param operation The operation being performed
     * @param url The URL being processed
     * @param additionalData Additional context data
     * @returns Error context
     */
    static createContext(operation: string, url?: string, additionalData?: Record<string, any>): ErrorContext;
    private static logError;
    private static determineRecoveryStrategy;
}
export declare enum ErrorSeverity {
    INFO = 0,
    WARNING = 1,
    ERROR = 2,
    CRITICAL = 3
}
export declare enum RecoveryStrategy {
    RETRY = "retry",
    SKIP = "skip",
    FAIL = "fail",
    DELAY_AND_RETRY = "delay_and_retry"
}
export interface ErrorContext {
    operation: string;
    url?: string;
    timestamp: Date;
    additionalData?: Record<string, any>;
}
export interface ErrorHandlingResult {
    severity: ErrorSeverity;
    isRetryable: boolean;
    userMessage: string;
    recoveryStrategy: RecoveryStrategy;
    shouldNotifyUser: boolean;
}
//# sourceMappingURL=ErrorHandler.d.ts.map