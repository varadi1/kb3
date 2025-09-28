/**
 * Sanitize-HTML Cleaner Implementation
 * Single Responsibility: HTML sanitization using sanitize-html library
 */
import { BaseTextCleaner } from './BaseTextCleaner';
import { ITextCleanerConfig, ICleaningStatistics } from '../interfaces/ITextCleaner';
export interface SanitizeHtmlOptions {
    allowedTags?: string[] | false;
    disallowedTagsMode?: 'discard' | 'escape' | 'recursiveEscape';
    allowedAttributes?: Record<string, string[]> | false;
    selfClosing?: string[];
    allowedSchemes?: string[];
    allowedSchemesByTag?: Record<string, string[]>;
    allowedSchemesAppliedToAttributes?: string[];
    allowProtocolRelative?: boolean;
    enforceHtmlBoundary?: boolean;
    parseStyleAttributes?: boolean;
    allowedClasses?: Record<string, string[] | boolean>;
    allowedStyles?: Record<string, Record<string, RegExp[]>>;
    allowVulnerableTags?: boolean;
    textFilter?: (text: string, tagName?: string) => string;
    exclusiveFilter?: (frame: any) => boolean;
    nonTextTags?: string[];
    nestingLimit?: number;
}
export declare class SanitizeHtmlCleaner extends BaseTextCleaner {
    constructor();
    protected performCleaning(input: string, config: ITextCleanerConfig): Promise<string>;
    private cleanWithTimeout;
    private buildSanitizeOptions;
    protected calculateStatistics(original: string, cleaned: string): ICleaningStatistics;
    protected generateWarnings(original: string, cleaned: string): string[] | undefined;
    protected validateSpecificConfig(config: ITextCleanerConfig, errors: string[], warnings: string[]): void;
}
//# sourceMappingURL=SanitizeHtmlCleaner.d.ts.map