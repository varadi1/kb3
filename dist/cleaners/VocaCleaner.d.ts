/**
 * Voca String Cleaner Implementation
 * Single Responsibility: String manipulation and cleaning using Voca library
 */
import { BaseTextCleaner } from './BaseTextCleaner';
import { ITextCleanerConfig, ICleaningStatistics } from '../interfaces/ITextCleaner';
export interface VocaOptions {
    operations?: VocaOperation[];
    trimWhitespace?: boolean;
    normalizeWhitespace?: boolean;
    removeHtmlTags?: boolean;
    unescapeHtml?: boolean;
    toLowerCase?: boolean;
    toUpperCase?: boolean;
    capitalize?: boolean;
    camelCase?: boolean;
    kebabCase?: boolean;
    snakeCase?: boolean;
    titleCase?: boolean;
    swapCase?: boolean;
    truncate?: {
        length: number;
        ending?: string;
    };
    padLeft?: {
        length: number;
        pad?: string;
    };
    padRight?: {
        length: number;
        pad?: string;
    };
    repeat?: number;
    replaceAll?: Array<{
        search: string | RegExp;
        replace: string;
    }>;
    removeAccents?: boolean;
    latinize?: boolean;
    slugify?: boolean;
    stripBom?: boolean;
    stripTags?: boolean | string[];
    words?: boolean;
    chars?: boolean;
    codePoints?: boolean;
    graphemes?: boolean;
    escapeHtml?: boolean;
    escapeRegExp?: boolean;
}
export interface VocaOperation {
    type: 'trim' | 'clean' | 'replace' | 'transform' | 'format';
    method: string;
    params?: any[];
}
export declare class VocaCleaner extends BaseTextCleaner {
    constructor();
    protected performCleaning(input: string, config: ITextCleanerConfig): Promise<string>;
    private stripBom;
    private removeAccents;
    private normalizeWhitespace;
    private applyCustomOperations;
    protected calculateStatistics(original: string, cleaned: string): ICleaningStatistics;
    protected generateWarnings(original: string, cleaned: string): string[] | undefined;
    protected validateSpecificConfig(config: ITextCleanerConfig, errors: string[], warnings: string[]): void;
}
//# sourceMappingURL=VocaCleaner.d.ts.map