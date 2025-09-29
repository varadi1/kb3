"use strict";
/**
 * Comprehensive error handling utilities
 * Single Responsibility: Centralized error handling and recovery
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecoveryStrategy = exports.ErrorSeverity = exports.ErrorHandler = void 0;
const IOrchestrator_1 = require("../interfaces/IOrchestrator");
class ErrorHandler {
    static retryableErrors = new Set([
        IOrchestrator_1.ErrorCode.TIMEOUT,
        IOrchestrator_1.ErrorCode.RATE_LIMITED,
        'ECONNRESET',
        'ENOTFOUND',
        'ECONNREFUSED'
    ]);
    static userFriendlyMessages = {
        [IOrchestrator_1.ErrorCode.INVALID_URL]: 'The provided URL is not valid',
        [IOrchestrator_1.ErrorCode.UNSUPPORTED_TYPE]: 'This type of content is not supported',
        [IOrchestrator_1.ErrorCode.FETCH_FAILED]: 'Failed to retrieve content from the URL',
        [IOrchestrator_1.ErrorCode.PROCESSING_FAILED]: 'Failed to process the content',
        [IOrchestrator_1.ErrorCode.STORAGE_FAILED]: 'Failed to store the processed content',
        [IOrchestrator_1.ErrorCode.TIMEOUT]: 'The operation timed out',
        [IOrchestrator_1.ErrorCode.ACCESS_DENIED]: 'Access to the resource was denied',
        [IOrchestrator_1.ErrorCode.RATE_LIMITED]: 'Request rate limit exceeded',
        [IOrchestrator_1.ErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred',
        [IOrchestrator_1.ErrorCode.DUPLICATE_URL]: 'This URL has already been processed',
        [IOrchestrator_1.ErrorCode.DUPLICATE_CONTENT]: 'This content already exists from another URL'
    };
    /**
     * Determines if an error is retryable
     * @param error The error to check
     * @returns true if the error is retryable
     */
    static isRetryable(error) {
        if ('code' in error && error.code) {
            return this.retryableErrors.has(error.code);
        }
        const message = error.message?.toLowerCase() || '';
        return this.retryableErrors.has(message) ||
            message.includes('timeout') ||
            message.includes('network') ||
            message.includes('connection');
    }
    /**
     * Gets a user-friendly error message
     * @param error The error
     * @returns User-friendly message
     */
    static getUserFriendlyMessage(error) {
        if ('code' in error && error.code) {
            return this.userFriendlyMessages[error.code] || error.message;
        }
        return error.message || 'An unexpected error occurred';
    }
    /**
     * Creates a custom error with additional context
     * @param code Error code
     * @param message Error message
     * @param context Additional context
     * @returns Custom error object
     */
    static createError(code, message, context) {
        const error = new Error(message);
        error.code = code;
        error.context = context;
        return error;
    }
    /**
     * Categorizes an error by severity
     * @param error The error to categorize
     * @returns Error severity level
     */
    static categorizeError(error) {
        if ('code' in error && error.code) {
            switch (error.code) {
                case IOrchestrator_1.ErrorCode.INVALID_URL:
                case IOrchestrator_1.ErrorCode.UNSUPPORTED_TYPE:
                    return ErrorSeverity.WARNING;
                case IOrchestrator_1.ErrorCode.ACCESS_DENIED:
                case IOrchestrator_1.ErrorCode.RATE_LIMITED:
                    return ErrorSeverity.ERROR;
                case IOrchestrator_1.ErrorCode.FETCH_FAILED:
                case IOrchestrator_1.ErrorCode.PROCESSING_FAILED:
                case IOrchestrator_1.ErrorCode.STORAGE_FAILED:
                    return ErrorSeverity.ERROR;
                case IOrchestrator_1.ErrorCode.TIMEOUT:
                    return ErrorSeverity.WARNING;
                case IOrchestrator_1.ErrorCode.UNKNOWN_ERROR:
                default:
                    return ErrorSeverity.CRITICAL;
            }
        }
        return ErrorSeverity.ERROR;
    }
    /**
     * Creates a standardized processing error
     * @param originalError The original error
     * @param code The error code
     * @param stage The processing stage
     * @param details Additional error details
     * @returns Standardized processing error
     */
    static createProcessingError(originalError, code, stage, details) {
        return {
            code,
            message: originalError.message,
            details: details || originalError,
            stage
        };
    }
    /**
     * Handles errors with appropriate logging and recovery
     * @param error The error to handle
     * @param context Error context information
     * @returns Error handling result
     */
    static handleError(error, context) {
        const severity = this.categorizeError(error);
        const isRetryable = this.isRetryable(error);
        const userMessage = this.getUserFriendlyMessage(error);
        // Log error (in real implementation, use proper logging)
        this.logError(error, context, severity);
        // Determine recovery strategy
        const recoveryStrategy = this.determineRecoveryStrategy(error, context);
        return {
            severity,
            isRetryable,
            userMessage,
            recoveryStrategy,
            shouldNotifyUser: severity >= ErrorSeverity.ERROR
        };
    }
    /**
     * Wraps a function with error handling
     * @param fn Function to wrap
     * @param context Error context
     * @returns Wrapped function
     */
    static withErrorHandling(fn, context) {
        return async (...args) => {
            try {
                return await fn(...args);
            }
            catch (error) {
                const handlingResult = this.handleError(error, context);
                // Apply recovery strategy
                if (handlingResult.recoveryStrategy === RecoveryStrategy.RETRY) {
                    // Implement retry logic (simplified)
                    try {
                        return await fn(...args);
                    }
                    catch (retryError) {
                        throw retryError;
                    }
                }
                throw error;
            }
        };
    }
    /**
     * Creates an error context for tracking
     * @param operation The operation being performed
     * @param url The URL being processed
     * @param additionalData Additional context data
     * @returns Error context
     */
    static createContext(operation, url, additionalData) {
        return {
            operation,
            url,
            timestamp: new Date(),
            additionalData
        };
    }
    static logError(error, context, severity) {
        const logEntry = {
            timestamp: context.timestamp,
            operation: context.operation,
            url: context.url,
            severity: ErrorSeverity[severity],
            error: {
                message: error.message,
                code: 'code' in error ? error.code : undefined,
                stage: 'stage' in error ? error.stage : undefined,
                stack: 'stack' in error ? error.stack : undefined
            },
            context: context.additionalData
        };
        // In a real implementation, use proper logging framework
        if (severity >= ErrorSeverity.ERROR) {
            console.error('ERROR:', JSON.stringify(logEntry, null, 2));
        }
        else {
            console.warn('WARNING:', JSON.stringify(logEntry, null, 2));
        }
    }
    static determineRecoveryStrategy(error, _context) {
        if (this.isRetryable(error)) {
            return RecoveryStrategy.RETRY;
        }
        if ('code' in error) {
            switch (error.code) {
                case IOrchestrator_1.ErrorCode.INVALID_URL:
                case IOrchestrator_1.ErrorCode.UNSUPPORTED_TYPE:
                    return RecoveryStrategy.SKIP;
                case IOrchestrator_1.ErrorCode.ACCESS_DENIED:
                    return RecoveryStrategy.FAIL;
                case IOrchestrator_1.ErrorCode.RATE_LIMITED:
                    return RecoveryStrategy.DELAY_AND_RETRY;
                default:
                    return RecoveryStrategy.FAIL;
            }
        }
        return RecoveryStrategy.FAIL;
    }
}
exports.ErrorHandler = ErrorHandler;
var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity[ErrorSeverity["INFO"] = 0] = "INFO";
    ErrorSeverity[ErrorSeverity["WARNING"] = 1] = "WARNING";
    ErrorSeverity[ErrorSeverity["ERROR"] = 2] = "ERROR";
    ErrorSeverity[ErrorSeverity["CRITICAL"] = 3] = "CRITICAL";
})(ErrorSeverity || (exports.ErrorSeverity = ErrorSeverity = {}));
var RecoveryStrategy;
(function (RecoveryStrategy) {
    RecoveryStrategy["RETRY"] = "retry";
    RecoveryStrategy["SKIP"] = "skip";
    RecoveryStrategy["FAIL"] = "fail";
    RecoveryStrategy["DELAY_AND_RETRY"] = "delay_and_retry";
})(RecoveryStrategy || (exports.RecoveryStrategy = RecoveryStrategy = {}));
//# sourceMappingURL=ErrorHandler.js.map