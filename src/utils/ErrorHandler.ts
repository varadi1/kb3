/**
 * Comprehensive error handling utilities
 * Single Responsibility: Centralized error handling and recovery
 */

import { ErrorCode, ProcessingError, ProcessingStage } from '../interfaces/IOrchestrator';

export class ErrorHandler {
  private static readonly retryableErrors = new Set([
    ErrorCode.TIMEOUT,
    ErrorCode.RATE_LIMITED,
    'ECONNRESET',
    'ENOTFOUND',
    'ECONNREFUSED'
  ]);

  private static readonly userFriendlyMessages: Record<ErrorCode, string> = {
    [ErrorCode.INVALID_URL]: 'The provided URL is not valid',
    [ErrorCode.UNSUPPORTED_TYPE]: 'This type of content is not supported',
    [ErrorCode.FETCH_FAILED]: 'Failed to retrieve content from the URL',
    [ErrorCode.PROCESSING_FAILED]: 'Failed to process the content',
    [ErrorCode.STORAGE_FAILED]: 'Failed to store the processed content',
    [ErrorCode.TIMEOUT]: 'The operation timed out',
    [ErrorCode.ACCESS_DENIED]: 'Access to the resource was denied',
    [ErrorCode.RATE_LIMITED]: 'Request rate limit exceeded',
    [ErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred',
    [ErrorCode.DUPLICATE_URL]: 'This URL has already been processed',
    [ErrorCode.DUPLICATE_CONTENT]: 'This content already exists from another URL'
  };

  /**
   * Determines if an error is retryable
   * @param error The error to check
   * @returns true if the error is retryable
   */
  static isRetryable(error: Error | ProcessingError): boolean {
    if ('code' in error && error.code) {
      return this.retryableErrors.has(error.code as any);
    }

    const message = error.message?.toLowerCase() || '';
    return this.retryableErrors.has(message as any) ||
           message.includes('timeout') ||
           message.includes('network') ||
           message.includes('connection');
  }

  /**
   * Gets a user-friendly error message
   * @param error The error
   * @returns User-friendly message
   */
  static getUserFriendlyMessage(error: Error | ProcessingError): string {
    if ('code' in error && error.code) {
      return this.userFriendlyMessages[error.code as ErrorCode] || error.message;
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
  static createError(code: string, message: string, context?: any): Error {
    const error = new Error(message) as any;
    error.code = code;
    error.context = context;
    return error;
  }

  /**
   * Categorizes an error by severity
   * @param error The error to categorize
   * @returns Error severity level
   */
  static categorizeError(error: Error | ProcessingError): ErrorSeverity {
    if ('code' in error && error.code) {
      switch (error.code) {
        case ErrorCode.INVALID_URL:
        case ErrorCode.UNSUPPORTED_TYPE:
          return ErrorSeverity.WARNING;

        case ErrorCode.ACCESS_DENIED:
        case ErrorCode.RATE_LIMITED:
          return ErrorSeverity.ERROR;

        case ErrorCode.FETCH_FAILED:
        case ErrorCode.PROCESSING_FAILED:
        case ErrorCode.STORAGE_FAILED:
          return ErrorSeverity.ERROR;

        case ErrorCode.TIMEOUT:
          return ErrorSeverity.WARNING;

        case ErrorCode.UNKNOWN_ERROR:
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
  static createProcessingError(
    originalError: Error,
    code: ErrorCode,
    stage: ProcessingStage,
    details?: any
  ): ProcessingError {
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
  static handleError(error: Error | ProcessingError, context: ErrorContext): ErrorHandlingResult {
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
  static withErrorHandling<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: ErrorContext
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        const handlingResult = this.handleError(error as Error, context);

        // Apply recovery strategy
        if (handlingResult.recoveryStrategy === RecoveryStrategy.RETRY) {
          // Implement retry logic (simplified)
          try {
            return await fn(...args);
          } catch (retryError) {
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
  static createContext(
    operation: string,
    url?: string,
    additionalData?: Record<string, any>
  ): ErrorContext {
    return {
      operation,
      url,
      timestamp: new Date(),
      additionalData
    };
  }

  private static logError(
    error: Error | ProcessingError,
    context: ErrorContext,
    severity: ErrorSeverity
  ): void {
    const logEntry = {
      timestamp: context.timestamp,
      operation: context.operation,
      url: context.url,
      severity: ErrorSeverity[severity],
      error: {
        message: error.message,
        code: 'code' in error ? error.code : undefined,
        stage: 'stage' in error ? error.stage : undefined,
        stack: 'stack' in error ? (error as any).stack : undefined
      },
      context: context.additionalData
    };

    // In a real implementation, use proper logging framework
    if (severity >= ErrorSeverity.ERROR) {
      console.error('ERROR:', JSON.stringify(logEntry, null, 2));
    } else {
      console.warn('WARNING:', JSON.stringify(logEntry, null, 2));
    }
  }

  private static determineRecoveryStrategy(
    error: Error | ProcessingError,
    _context: ErrorContext
  ): RecoveryStrategy {
    if (this.isRetryable(error)) {
      return RecoveryStrategy.RETRY;
    }

    if ('code' in error) {
      switch (error.code) {
        case ErrorCode.INVALID_URL:
        case ErrorCode.UNSUPPORTED_TYPE:
          return RecoveryStrategy.SKIP;

        case ErrorCode.ACCESS_DENIED:
          return RecoveryStrategy.FAIL;

        case ErrorCode.RATE_LIMITED:
          return RecoveryStrategy.DELAY_AND_RETRY;

        default:
          return RecoveryStrategy.FAIL;
      }
    }

    return RecoveryStrategy.FAIL;
  }
}

export enum ErrorSeverity {
  INFO = 0,
  WARNING = 1,
  ERROR = 2,
  CRITICAL = 3
}

export enum RecoveryStrategy {
  RETRY = 'retry',
  SKIP = 'skip',
  FAIL = 'fail',
  DELAY_AND_RETRY = 'delay_and_retry'
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