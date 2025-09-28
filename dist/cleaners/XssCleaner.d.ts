/**
 * XSS Cleaner Implementation
 * Single Responsibility: XSS attack prevention using xss library
 */
import { BaseTextCleaner } from './BaseTextCleaner';
import { ITextCleanerConfig, ICleaningStatistics } from '../interfaces/ITextCleaner';
export interface XssOptions {
    whiteList?: Record<string, string[]>;
    onTag?: (tag: string, html: string, options: any) => string | void;
    onTagAttr?: (tag: string, name: string, value: string, isWhiteAttr: boolean) => string | void;
    onIgnoreTag?: (tag: string, html: string, options: any) => string | void;
    onIgnoreTagAttr?: (tag: string, name: string, value: string, isWhiteAttr: boolean) => string | void;
    safeAttrValue?: (tag: string, name: string, value: string, cssFilter: any) => string;
    escapeHtml?: (html: string) => string;
    stripIgnoreTag?: boolean;
    stripIgnoreTagBody?: boolean | string[];
    allowCommentTag?: boolean;
    stripBlankChar?: boolean;
    css?: boolean | Record<string, any>;
    enableStrictMode?: boolean;
}
export declare class XssCleaner extends BaseTextCleaner {
    constructor();
    protected performCleaning(input: string, config: ITextCleanerConfig): Promise<string>;
    private buildXssOptions;
    private additionalXssCheck;
    protected calculateStatistics(original: string, cleaned: string): ICleaningStatistics;
    protected generateWarnings(original: string, cleaned: string): string[] | undefined;
    protected validateSpecificConfig(config: ITextCleanerConfig, errors: string[], warnings: string[]): void;
}
//# sourceMappingURL=XssCleaner.d.ts.map