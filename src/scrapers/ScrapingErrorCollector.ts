/**
 * Scraping error collector implementation
 * Single Responsibility: Collects and manages errors/warnings during scraping
 * Open/Closed: Can be extended for different error handling strategies
 */

import {
  IErrorCollector,
  ErrorEntry,
  WarningEntry,
  ScrapingIssues
} from '../interfaces/IErrorCollector';
import { ErrorHandler } from '../utils/ErrorHandler';

export class ScrapingErrorCollector implements IErrorCollector {
  private errors: Map<string, ErrorEntry[]> = new Map();
  private warnings: Map<string, WarningEntry[]> = new Map();

  recordError(
    context: string,
    error: Error | string,
    metadata?: Record<string, any>
  ): void {
    const errorEntry = this.createErrorEntry(error, metadata);

    const contextErrors = this.errors.get(context) || [];
    contextErrors.push(errorEntry);
    this.errors.set(context, contextErrors);
  }

  recordWarning(
    context: string,
    warning: string,
    metadata?: Record<string, any>
  ): void {
    const warningEntry: WarningEntry = {
      timestamp: new Date(),
      message: warning,
      metadata,
      severity: this.classifyWarningSeverity(warning)
    };

    const contextWarnings = this.warnings.get(context) || [];
    contextWarnings.push(warningEntry);
    this.warnings.set(context, contextWarnings);
  }

  getErrors(context: string): ErrorEntry[] {
    return this.errors.get(context) || [];
  }

  getWarnings(context: string): WarningEntry[] {
    return this.warnings.get(context) || [];
  }

  getIssues(context: string): ScrapingIssues {
    const errors = this.getErrors(context);
    const warnings = this.getWarnings(context);

    const summary = this.calculateSummary(errors, warnings);

    return {
      errors,
      warnings,
      summary
    };
  }

  clearIssues(context?: string): void {
    if (context) {
      this.errors.delete(context);
      this.warnings.delete(context);
    } else {
      this.errors.clear();
      this.warnings.clear();
    }
  }

  exportIssues(): Map<string, ScrapingIssues> {
    const allContexts = new Set([
      ...this.errors.keys(),
      ...this.warnings.keys()
    ]);

    const result = new Map<string, ScrapingIssues>();

    for (const context of allContexts) {
      result.set(context, this.getIssues(context));
    }

    return result;
  }

  /**
   * Merges issues from another collector
   * @param other The other collector to merge from
   */
  merge(other: IErrorCollector): void {
    const otherIssues = other.exportIssues();

    for (const [context, issues] of otherIssues) {
      for (const error of issues.errors) {
        this.recordError(context, error.message, {
          ...error.metadata,
          originalTimestamp: error.timestamp
        });
      }

      for (const warning of issues.warnings) {
        this.recordWarning(context, warning.message, {
          ...warning.metadata,
          originalTimestamp: warning.timestamp
        });
      }
    }
  }

  /**
   * Gets a formatted summary of all issues
   * @returns Formatted string summary
   */
  getFormattedSummary(): string {
    const allIssues = this.exportIssues();
    const lines: string[] = [];

    if (allIssues.size === 0) {
      return 'No issues recorded';
    }

    lines.push('Scraping Issues Summary:');
    lines.push('========================');

    for (const [context, issues] of allIssues) {
      if (issues.summary.errorCount === 0 && issues.summary.warningCount === 0) {
        continue;
      }

      lines.push(`\nContext: ${context}`);
      lines.push(`  Errors: ${issues.summary.errorCount} (Critical: ${issues.summary.criticalErrors})`);
      lines.push(`  Warnings: ${issues.summary.warningCount}`);

      if (issues.errors.length > 0) {
        lines.push('  Recent Errors:');
        issues.errors.slice(-3).forEach(error => {
          lines.push(`    - [${error.severity}] ${error.message}`);
        });
      }

      if (issues.warnings.length > 0) {
        lines.push('  Recent Warnings:');
        issues.warnings.slice(-3).forEach(warning => {
          lines.push(`    - [${warning.severity}] ${warning.message}`);
        });
      }
    }

    return lines.join('\n');
  }

  private createErrorEntry(
    error: Error | string,
    metadata?: Record<string, any>
  ): ErrorEntry {
    if (typeof error === 'string') {
      return {
        timestamp: new Date(),
        message: error,
        metadata,
        severity: 'error'
      };
    }

    const categorized = ErrorHandler.categorizeError(error);

    return {
      timestamp: new Date(),
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
      metadata: {
        ...metadata,
        category: categorized.category,
        recoverable: categorized.recoverable
      },
      severity: this.classifyErrorSeverity(error)
    };
  }

  private classifyErrorSeverity(error: Error): 'critical' | 'error' | 'recoverable' {
    const message = error.message.toLowerCase();

    if (message.includes('timeout') ||
        message.includes('network') ||
        message.includes('retry')) {
      return 'recoverable';
    }

    if (message.includes('fatal') ||
        message.includes('critical') ||
        message.includes('invalid configuration')) {
      return 'critical';
    }

    return 'error';
  }

  private classifyWarningSeverity(warning: string): 'warning' | 'info' {
    const message = warning.toLowerCase();

    if (message.includes('deprecated') ||
        message.includes('slow') ||
        message.includes('limit')) {
      return 'warning';
    }

    return 'info';
  }

  private calculateSummary(
    errors: ErrorEntry[],
    warnings: WarningEntry[]
  ): ScrapingIssues['summary'] {
    const criticalErrors = errors.filter(e => e.severity === 'critical').length;
    const errorTimestamps = errors.map(e => e.timestamp);

    return {
      errorCount: errors.length,
      warningCount: warnings.length,
      firstError: errorTimestamps.length > 0
        ? new Date(Math.min(...errorTimestamps.map(d => d.getTime())))
        : undefined,
      lastError: errorTimestamps.length > 0
        ? new Date(Math.max(...errorTimestamps.map(d => d.getTime())))
        : undefined,
      criticalErrors
    };
  }
}