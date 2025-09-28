/**
 * String.js Cleaner Implementation
 * Single Responsibility: String manipulation using String.js library
 */
import { BaseTextCleaner } from './BaseTextCleaner';
import { ITextCleanerConfig, ICleaningStatistics } from '../interfaces/ITextCleaner';
export interface StringJsOptions {
    collapseWhitespace?: boolean;
    decodeHTMLEntities?: boolean;
    escapeHTML?: boolean;
    unescapeHTML?: boolean;
    stripTags?: boolean | string[];
    stripPunctuation?: boolean;
    humanize?: boolean;
    dasherize?: boolean;
    underscore?: boolean;
    camelize?: boolean;
    classify?: boolean;
    capitalize?: boolean;
    titleCase?: boolean;
    slugify?: boolean;
    clean?: boolean;
    truncate?: {
        length: number;
        pruneString?: string;
    };
    pad?: {
        length: number;
        padStr?: string;
        type?: 'left' | 'right' | 'both';
    };
    repeat?: number;
    ensureLeft?: string;
    ensureRight?: string;
    toCSV?: {
        delimiter?: string;
        qualifier?: string;
    };
    lines?: boolean;
    words?: boolean;
    chars?: boolean;
    reverse?: boolean;
    shuffle?: boolean;
    stripLeft?: string | string[];
    stripRight?: string | string[];
    trim?: boolean;
    trimLeft?: boolean;
    trimRight?: boolean;
    replaceAll?: Array<{
        pattern: string | RegExp;
        replacement: string;
    }>;
    between?: {
        left: string;
        right: string;
    };
    chompLeft?: string;
    chompRight?: string;
    latinise?: boolean;
    wrapHTML?: {
        element: string;
        attributes?: Record<string, string>;
    };
    toInt?: boolean;
    toFloat?: boolean;
    toBoolean?: boolean;
}
export declare class StringJsCleaner extends BaseTextCleaner {
    constructor();
    protected performCleaning(input: string, config: ITextCleanerConfig): Promise<string>;
    protected calculateStatistics(original: string, cleaned: string): ICleaningStatistics;
    protected generateWarnings(original: string, cleaned: string): string[] | undefined;
    protected validateSpecificConfig(config: ITextCleanerConfig, errors: string[], warnings: string[]): void;
}
//# sourceMappingURL=StringJsCleaner.d.ts.map