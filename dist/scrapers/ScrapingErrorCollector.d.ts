/**
 * Scraping error collector implementation
 * Single Responsibility: Collects and manages errors/warnings during scraping
 * Open/Closed: Can be extended for different error handling strategies
 */
import { IErrorCollector, ErrorEntry, WarningEntry, ScrapingIssues } from '../interfaces/IErrorCollector';
export declare class ScrapingErrorCollector implements IErrorCollector {
    private errors;
    private warnings;
    recordError(context: string, error: Error | string, metadata?: Record<string, any>): void;
    recordWarning(context: string, warning: string, metadata?: Record<string, any>): void;
    getErrors(context: string): ErrorEntry[];
    getWarnings(context: string): WarningEntry[];
    getIssues(context: string): ScrapingIssues;
    clearIssues(context?: string): void;
    exportIssues(): Map<string, ScrapingIssues>;
    /**
     * Merges issues from another collector
     * @param other The other collector to merge from
     */
    merge(other: IErrorCollector): void;
    /**
     * Gets a formatted summary of all issues
     * @returns Formatted string summary
     */
    getFormattedSummary(): string;
    private createErrorEntry;
    private classifyErrorSeverity;
    private classifyWarningSeverity;
    private calculateSummary;
}
//# sourceMappingURL=ScrapingErrorCollector.d.ts.map