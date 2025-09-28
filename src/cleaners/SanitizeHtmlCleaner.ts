/**
 * Sanitize-HTML Cleaner Implementation
 * Single Responsibility: HTML sanitization using sanitize-html library
 */

import sanitizeHtml from 'sanitize-html';
import { BaseTextCleaner } from './BaseTextCleaner';
import { ITextCleanerConfig, TextFormat, ICleaningStatistics } from '../interfaces/ITextCleaner';

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

export class SanitizeHtmlCleaner extends BaseTextCleaner {
  constructor() {
    super(
      'sanitize-html',
      'Removes dangerous HTML and scripts while preserving safe content',
      [TextFormat.HTML, TextFormat.MIXED],
      {
        enabled: true,
        priority: 90,
        options: {
          allowedTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
            'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
            'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'span', 'img'],
          allowedAttributes: {
            a: ['href', 'name', 'target', 'rel'],
            img: ['src', 'alt', 'title', 'width', 'height'],
            '*': ['class', 'id']
          },
          allowedSchemes: ['http', 'https', 'mailto'],
          allowProtocolRelative: true,
          enforceHtmlBoundary: true,
          parseStyleAttributes: false,
          disallowedTagsMode: 'discard',
          selfClosing: ['img', 'br', 'hr'],
          allowedClasses: {},
          allowedStyles: {},
          textFilter: undefined,
          exclusiveFilter: undefined,
          nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript'],
          nestingLimit: 6
        } as SanitizeHtmlOptions
      }
    );
  }

  protected async performCleaning(input: string, config: ITextCleanerConfig): Promise<string> {
    const options = this.buildSanitizeOptions(config.options || {});

    try {
      // Apply timeout if specified
      if (config.timeout) {
        return await this.cleanWithTimeout(input, options, config.timeout);
      }

      return sanitizeHtml(input, options);
    } catch (error) {
      console.error(`SanitizeHtml cleaning failed: ${error}`);
      throw new Error(`HTML sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async cleanWithTimeout(input: string, options: any, timeout: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Sanitization timeout after ${timeout}ms`));
      }, timeout);

      try {
        const result = sanitizeHtml(input, options);
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  private buildSanitizeOptions(customOptions: SanitizeHtmlOptions): any {
    const defaultOptions = this.defaultConfig.options as SanitizeHtmlOptions;
    const merged = { ...defaultOptions, ...customOptions };

    // Handle special cases
    if (merged.allowedTags === false) {
      merged.allowedTags = false; // Strip all tags
    }
    if (merged.allowedAttributes === false) {
      merged.allowedAttributes = false; // Strip all attributes
    }

    return merged;
  }

  protected calculateStatistics(original: string, cleaned: string): ICleaningStatistics {
    const tagsInOriginal = (original.match(/<[^>]+>/g) || []).length;
    const tagsInCleaned = (cleaned.match(/<[^>]+>/g) || []).length;
    const scriptsRemoved = (original.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || []).length;
    const stylesRemoved = (original.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).length;
    const linksInOriginal = (original.match(/<a[^>]*>/gi) || []).length;
    const linksInCleaned = (cleaned.match(/<a[^>]*>/gi) || []).length;

    return {
      tagsRemoved: tagsInOriginal - tagsInCleaned,
      scriptsRemoved,
      stylesRemoved,
      linksModified: linksInOriginal - linksInCleaned,
      custom: {
        originalTags: tagsInOriginal,
        remainingTags: tagsInCleaned,
        percentageStripped: ((1 - cleaned.length / original.length) * 100).toFixed(2) as any
      }
    };
  }

  protected generateWarnings(original: string, cleaned: string): string[] | undefined {
    const warnings: string[] = [];

    if (cleaned.length < original.length * 0.1) {
      warnings.push('More than 90% of content was removed during sanitization');
    }

    if ((original.match(/<iframe/gi) || []).length > 0) {
      warnings.push('iframes were removed during sanitization');
    }

    if ((original.match(/<form/gi) || []).length > 0) {
      warnings.push('form elements were removed during sanitization');
    }

    return warnings.length > 0 ? warnings : undefined;
  }

  protected validateSpecificConfig(
    config: ITextCleanerConfig,
    errors: string[],
    warnings: string[]
  ): void {
    const options = config.options as SanitizeHtmlOptions;

    if (options?.nestingLimit !== undefined && options.nestingLimit < 1) {
      errors.push('Nesting limit must be at least 1');
    }

    if (options?.allowVulnerableTags) {
      warnings.push('Allowing vulnerable tags may pose security risks');
    }

    if (options?.allowedTags === false && options?.textFilter === undefined) {
      warnings.push('Stripping all tags without text filter may result in unreadable text');
    }
  }
}