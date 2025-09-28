/**
 * Readability Cleaner Implementation
 * Single Responsibility: Extract main content using Mozilla's Readability
 */
import { BaseTextCleaner } from './BaseTextCleaner';
import { ITextCleanerConfig, ICleaningStatistics } from '../interfaces/ITextCleaner';
export interface ReadabilityOptions {
    debug?: boolean;
    maxElemsToParse?: number;
    nbTopCandidates?: number;
    charThreshold?: number;
    classesToPreserve?: string[];
    keepClasses?: boolean;
    serializer?: (node: Node) => string;
    disableJSONLD?: boolean;
    allowedVideoRegex?: RegExp;
    linkDensityModifier?: number;
    minScore?: number;
    minContentLength?: number;
    minTextLength?: number;
    visibilityChecker?: (node: Node) => boolean;
    extractExcerpt?: boolean;
    outputFormat?: 'text' | 'html' | 'markdown';
}
export declare class ReadabilityCleaner extends BaseTextCleaner {
    constructor();
    protected performCleaning(input: string, config: ITextCleanerConfig): Promise<string>;
    private formatAsText;
    private formatAsHtml;
    private formatAsMarkdown;
    protected calculateStatistics(original: string, cleaned: string): ICleaningStatistics;
    protected generateWarnings(original: string, cleaned: string): string[] | undefined;
    protected validateSpecificConfig(config: ITextCleanerConfig, errors: string[], warnings: string[]): void;
}
//# sourceMappingURL=ReadabilityCleaner.d.ts.map