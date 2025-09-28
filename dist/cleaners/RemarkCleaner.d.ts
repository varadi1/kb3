/**
 * Remark Markdown Cleaner Implementation
 * Single Responsibility: Markdown processing and transformation using Remark
 */
import { BaseTextCleaner } from './BaseTextCleaner';
import { ITextCleanerConfig, ICleaningStatistics } from '../interfaces/ITextCleaner';
export interface RemarkOptions {
    parseOptions?: {
        gfm?: boolean;
        footnotes?: boolean;
        frontmatter?: boolean;
        commonmark?: boolean;
        pedantic?: boolean;
    };
    stringifyOptions?: {
        bullet?: '-' | '*' | '+';
        bulletOther?: '-' | '*' | '+';
        bulletOrdered?: '.' | ')';
        closeAtx?: boolean;
        emphasis?: '_' | '*';
        fence?: '`' | '~';
        fences?: boolean;
        incrementListMarker?: boolean;
        listItemIndent?: 'one' | 'tab' | 'mixed';
        quote?: '"' | "'";
        resourceLink?: boolean;
        rule?: '-' | '*' | '_';
        ruleRepetition?: number;
        ruleSpaces?: boolean;
        setext?: boolean;
        strong?: '_' | '*';
        tightDefinitions?: boolean;
    };
    transformations?: {
        normalizeHeadings?: boolean;
        removeFrontmatter?: boolean;
        removeCodeBlocks?: boolean;
        removeImages?: boolean;
        removeLinks?: boolean;
        removeEmphasis?: boolean;
        removeBlockquotes?: boolean;
        removeTables?: boolean;
        removeFootnotes?: boolean;
        removeHtmlComments?: boolean;
        extractText?: boolean;
        convertToHtml?: boolean;
        minifyMarkdown?: boolean;
        expandLinks?: boolean;
        normalizeLineBreaks?: boolean;
        fixBrokenLinks?: boolean;
        removeEmptyParagraphs?: boolean;
        normalizeLists?: boolean;
        maxHeadingLevel?: number;
    };
    customPlugins?: Array<any>;
}
export declare class RemarkCleaner extends BaseTextCleaner {
    constructor();
    protected performCleaning(input: string, config: ITextCleanerConfig): Promise<string>;
    private applyTransformations;
    private visitNode;
    private removeNodes;
    private extractPlainText;
    private minifyMarkdown;
    private normalizeLineBreaks;
    protected calculateStatistics(original: string, cleaned: string): ICleaningStatistics;
    protected generateWarnings(original: string, cleaned: string): string[] | undefined;
    protected validateSpecificConfig(config: ITextCleanerConfig, errors: string[], warnings: string[]): void;
}
//# sourceMappingURL=RemarkCleaner.d.ts.map