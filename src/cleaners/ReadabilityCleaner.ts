/**
 * Readability Cleaner Implementation
 * Single Responsibility: Extract main content using Mozilla's Readability
 */

import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { BaseTextCleaner } from './BaseTextCleaner';
import { ITextCleanerConfig, TextFormat, ICleaningStatistics } from '../interfaces/ITextCleaner';

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

export class ReadabilityCleaner extends BaseTextCleaner {
  constructor() {
    super(
      'readability',
      'Extracts the main content from web pages, removing navigation, ads, and other clutter',
      [TextFormat.HTML],
      {
        enabled: true,
        priority: 85,
        options: {
          debug: false,
          maxElemsToParse: 0, // 0 = no limit
          nbTopCandidates: 5,
          charThreshold: 500,
          classesToPreserve: [],
          keepClasses: false,
          disableJSONLD: false,
          linkDensityModifier: 0,
          minScore: 20,
          minContentLength: 140,
          minTextLength: 25,
          extractExcerpt: true,
          outputFormat: 'text'
        } as ReadabilityOptions
      }
    );
  }

  protected async performCleaning(input: string, config: ITextCleanerConfig): Promise<string> {
    const options = config.options as ReadabilityOptions;

    try {
      // Create a JSDOM instance
      const dom = new JSDOM(input, {
        url: 'https://example.com' // Dummy URL for relative link resolution
      });

      const reader = new Readability(dom.window.document, {
        debug: options.debug || false,
        maxElemsToParse: options.maxElemsToParse || 0,
        nbTopCandidates: options.nbTopCandidates || 5,
        charThreshold: options.charThreshold || 500,
        classesToPreserve: options.classesToPreserve || [],
        keepClasses: options.keepClasses || false,
        serializer: options.serializer,
        disableJSONLD: options.disableJSONLD || false,
        allowedVideoRegex: options.allowedVideoRegex
      });

      const article = reader.parse();

      if (!article) {
        throw new Error('Failed to extract readable content');
      }

      // Return based on output format
      switch (options.outputFormat) {
        case 'html':
          return this.formatAsHtml(article);
        case 'markdown':
          return await this.formatAsMarkdown(article);
        case 'text':
        default:
          return this.formatAsText(article);
      }
    } catch (error) {
      console.error(`Readability cleaning failed: ${error}`);
      throw new Error(`Content extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private formatAsText(article: any): string {
    const parts: string[] = [];

    if (article.title) {
      parts.push(`Title: ${article.title}`);
      parts.push('');
    }

    if (article.byline) {
      parts.push(`Author: ${article.byline}`);
      parts.push('');
    }

    if (article.excerpt) {
      parts.push(`Summary: ${article.excerpt}`);
      parts.push('');
    }

    if (article.textContent) {
      parts.push(article.textContent);
    } else if (article.content) {
      // Strip HTML if only HTML content is available
      const textContent = article.content.replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      parts.push(textContent);
    }

    if (article.length) {
      parts.push('');
      parts.push(`Estimated reading time: ${Math.ceil(article.length / 200)} minutes`);
    }

    return parts.join('\n');
  }

  private formatAsHtml(article: any): string {
    const parts: string[] = [];

    parts.push('<!DOCTYPE html>');
    parts.push('<html>');
    parts.push('<head>');
    parts.push(`<title>${article.title || 'Extracted Content'}</title>`);
    parts.push('<meta charset="utf-8">');
    parts.push('</head>');
    parts.push('<body>');

    if (article.title) {
      parts.push(`<h1>${article.title}</h1>`);
    }

    if (article.byline) {
      parts.push(`<p class="byline">By ${article.byline}</p>`);
    }

    if (article.excerpt) {
      parts.push(`<blockquote class="excerpt">${article.excerpt}</blockquote>`);
    }

    if (article.content) {
      parts.push(article.content);
    }

    parts.push('</body>');
    parts.push('</html>');

    return parts.join('\n');
  }

  private async formatAsMarkdown(article: any): Promise<string> {
    // Simple HTML to Markdown conversion
    const parts: string[] = [];

    if (article.title) {
      parts.push(`# ${article.title}`);
      parts.push('');
    }

    if (article.byline) {
      parts.push(`*By ${article.byline}*`);
      parts.push('');
    }

    if (article.excerpt) {
      parts.push(`> ${article.excerpt}`);
      parts.push('');
    }

    if (article.content) {
      // Basic HTML to Markdown conversion
      let markdown = article.content
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
        .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n')
        .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n')
        .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
        .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
        .replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
        .replace(/<img[^>]+src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
        .replace(/<img[^>]+src="([^"]*)"[^>]*>/gi, '![]($1)')
        .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<br[^>]*>/gi, '\n')
        .replace(/<hr[^>]*>/gi, '---\n')
        .replace(/<ul[^>]*>(.*?)<\/ul>/gi, (_match: string, content: string) => {
          return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
        })
        .replace(/<ol[^>]*>(.*?)<\/ol>/gi, (_match: string, content: string) => {
          let counter = 1;
          return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => {
            return `${counter++}. $1\n`;
          });
        })
        .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
        .replace(/\n{3,}/g, '\n\n') // Clean up excessive newlines
        .trim();

      parts.push(markdown);
    }

    return parts.join('\n');
  }

  protected calculateStatistics(original: string, cleaned: string): ICleaningStatistics {
    const dom = new JSDOM(original);
    const originalElements = dom.window.document.querySelectorAll('*').length;

    const tagsInOriginal = (original.match(/<[^>]+>/g) || []).length;
    const tagsInCleaned = (cleaned.match(/<[^>]+>/g) || []).length;
    const navRemoved = (original.match(/<nav[^>]*>[\s\S]*?<\/nav>/gi) || []).length;
    const sidebarRemoved = (original.match(/class="[^"]*sidebar[^"]*"/gi) || []).length;
    const footerRemoved = (original.match(/<footer[^>]*>[\s\S]*?<\/footer>/gi) || []).length;
    const headerRemoved = (original.match(/<header[^>]*>[\s\S]*?<\/header>/gi) || []).length;

    return {
      tagsRemoved: tagsInOriginal - tagsInCleaned,
      custom: {
        originalElements,
        navigationRemoved: navRemoved,
        sidebarRemoved,
        footerRemoved,
        headerRemoved,
        reductionRatio: ((1 - cleaned.length / original.length) * 100).toFixed(2) as any,
        extractionSuccess: cleaned.length > 100 ? 'true' : 'false' as any
      }
    };
  }

  protected generateWarnings(original: string, cleaned: string): string[] | undefined {
    const warnings: string[] = [];

    if (cleaned.length < 100) {
      warnings.push('Very little content was extracted - the page might not have enough readable content');
    }

    if (cleaned.length < original.length * 0.05) {
      warnings.push('Less than 5% of original content was preserved - check if extraction was successful');
    }

    if (!cleaned.includes('\n') && cleaned.length > 1000) {
      warnings.push('Extracted content appears to be a single block - structure may be lost');
    }

    return warnings.length > 0 ? warnings : undefined;
  }

  protected validateSpecificConfig(
    config: ITextCleanerConfig,
    errors: string[],
    warnings: string[]
  ): void {
    const options = config.options as ReadabilityOptions;

    if (options?.minScore !== undefined && options.minScore < 0) {
      errors.push('Min score must be non-negative');
    }

    if (options?.charThreshold !== undefined && options.charThreshold < 0) {
      errors.push('Char threshold must be non-negative');
    }

    if (options?.minContentLength !== undefined && options.minContentLength < 0) {
      errors.push('Min content length must be non-negative');
    }

    if (options?.outputFormat && !['text', 'html', 'markdown'].includes(options.outputFormat)) {
      errors.push('Output format must be one of: text, html, markdown');
    }

    if (options?.nbTopCandidates !== undefined && options.nbTopCandidates < 1) {
      warnings.push('Having less than 1 top candidate may affect extraction quality');
    }
  }
}