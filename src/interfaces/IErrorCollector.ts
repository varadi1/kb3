/**
 * Interface Segregation Principle: Focused interface for error collection
 * Single Responsibility: Only responsible for collecting and managing errors/warnings
 */

/**
 * Error collector interface for tracking scraping issues
 */
export interface IErrorCollector {
  /**
   * Records an error that occurred during scraping
   * @param context The context where error occurred (e.g., URL, scraper name)
   * @param error The error that occurred
   * @param metadata Additional metadata about the error
   */
  recordError(context: string, error: Error | string, metadata?: Record<string, any>): void;

  /**
   * Records a warning that occurred during scraping
   * @param context The context where warning occurred
   * @param warning The warning message
   * @param metadata Additional metadata about the warning
   */
  recordWarning(context: string, warning: string, metadata?: Record<string, any>): void;

  /**
   * Gets all errors for a specific context
   * @param context The context to get errors for
   * @returns Array of error entries
   */
  getErrors(context: string): ErrorEntry[];

  /**
   * Gets all warnings for a specific context
   * @param context The context to get warnings for
   * @returns Array of warning entries
   */
  getWarnings(context: string): WarningEntry[];

  /**
   * Gets all issues (errors and warnings) for a context
   * @param context The context to get issues for
   * @returns Object containing errors and warnings
   */
  getIssues(context: string): ScrapingIssues;

  /**
   * Clears issues for a context
   * @param context The context to clear, or undefined to clear all
   */
  clearIssues(context?: string): void;

  /**
   * Exports all collected issues
   * @returns Map of context to issues
   */
  exportIssues(): Map<string, ScrapingIssues>;
}

/**
 * Error entry with details
 */
export interface ErrorEntry {
  timestamp: Date;
  message: string;
  stack?: string;
  code?: string;
  metadata?: Record<string, any>;
  severity: 'critical' | 'error' | 'recoverable';
}

/**
 * Warning entry with details
 */
export interface WarningEntry {
  timestamp: Date;
  message: string;
  metadata?: Record<string, any>;
  severity: 'warning' | 'info';
}

/**
 * Combined issues for a context
 */
export interface ScrapingIssues {
  errors: ErrorEntry[];
  warnings: WarningEntry[];
  summary: {
    errorCount: number;
    warningCount: number;
    firstError?: Date;
    lastError?: Date;
    criticalErrors: number;
  };
}