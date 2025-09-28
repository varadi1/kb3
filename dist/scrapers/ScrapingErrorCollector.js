"use strict";
/**
 * Scraping error collector implementation
 * Single Responsibility: Collects and manages errors/warnings during scraping
 * Open/Closed: Can be extended for different error handling strategies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScrapingErrorCollector = void 0;
const ErrorHandler_1 = require("../utils/ErrorHandler");
class ScrapingErrorCollector {
    errors = new Map();
    warnings = new Map();
    recordError(context, error, metadata) {
        const errorEntry = this.createErrorEntry(error, metadata);
        const contextErrors = this.errors.get(context) || [];
        contextErrors.push(errorEntry);
        this.errors.set(context, contextErrors);
    }
    recordWarning(context, warning, metadata) {
        const warningEntry = {
            timestamp: new Date(),
            message: warning,
            metadata,
            severity: this.classifyWarningSeverity(warning)
        };
        const contextWarnings = this.warnings.get(context) || [];
        contextWarnings.push(warningEntry);
        this.warnings.set(context, contextWarnings);
    }
    getErrors(context) {
        return this.errors.get(context) || [];
    }
    getWarnings(context) {
        return this.warnings.get(context) || [];
    }
    getIssues(context) {
        const errors = this.getErrors(context);
        const warnings = this.getWarnings(context);
        const summary = this.calculateSummary(errors, warnings);
        return {
            errors,
            warnings,
            summary
        };
    }
    clearIssues(context) {
        if (context) {
            this.errors.delete(context);
            this.warnings.delete(context);
        }
        else {
            this.errors.clear();
            this.warnings.clear();
        }
    }
    exportIssues() {
        const allContexts = new Set([
            ...this.errors.keys(),
            ...this.warnings.keys()
        ]);
        const result = new Map();
        for (const context of allContexts) {
            result.set(context, this.getIssues(context));
        }
        return result;
    }
    /**
     * Merges issues from another collector
     * @param other The other collector to merge from
     */
    merge(other) {
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
    getFormattedSummary() {
        const allIssues = this.exportIssues();
        const lines = [];
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
    createErrorEntry(error, metadata) {
        if (typeof error === 'string') {
            return {
                timestamp: new Date(),
                message: error,
                metadata,
                severity: 'error'
            };
        }
        const severity = ErrorHandler_1.ErrorHandler.categorizeError(error);
        const isRetryable = ErrorHandler_1.ErrorHandler.isRetryable(error);
        return {
            timestamp: new Date(),
            message: error.message,
            stack: error.stack,
            code: error.code,
            metadata: {
                ...metadata,
                errorSeverity: severity,
                isRetryable: isRetryable
            },
            severity: this.classifyErrorSeverity(error)
        };
    }
    classifyErrorSeverity(error) {
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
    classifyWarningSeverity(warning) {
        const message = warning.toLowerCase();
        if (message.includes('deprecated') ||
            message.includes('slow') ||
            message.includes('limit')) {
            return 'warning';
        }
        return 'info';
    }
    calculateSummary(errors, warnings) {
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
exports.ScrapingErrorCollector = ScrapingErrorCollector;
//# sourceMappingURL=ScrapingErrorCollector.js.map