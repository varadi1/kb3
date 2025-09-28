/**
 * XSS Cleaner Implementation
 * Single Responsibility: XSS attack prevention using xss library
 */

import * as xss from 'xss';
import { BaseTextCleaner } from './BaseTextCleaner';
import { ITextCleanerConfig, TextFormat, ICleaningStatistics } from '../interfaces/ITextCleaner';

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

export class XssCleaner extends BaseTextCleaner {
  constructor() {
    super(
      'xss',
      'Prevents XSS attacks by filtering dangerous HTML and JavaScript',
      [TextFormat.HTML, TextFormat.MIXED],
      {
        enabled: true,
        priority: 95, // High priority - security first
        options: {
          whiteList: {
            a: ['href', 'title', 'target', 'rel'],
            abbr: ['title'],
            address: [],
            area: ['shape', 'coords', 'href', 'alt'],
            article: [],
            aside: [],
            b: [],
            bdi: ['dir'],
            bdo: ['dir'],
            blockquote: ['cite'],
            br: [],
            caption: [],
            cite: [],
            code: [],
            col: ['align', 'valign', 'span', 'width'],
            colgroup: ['align', 'valign', 'span', 'width'],
            dd: [],
            del: ['datetime'],
            details: ['open'],
            div: ['class', 'id'],
            dl: [],
            dt: [],
            em: [],
            footer: [],
            h1: ['class', 'id'],
            h2: ['class', 'id'],
            h3: ['class', 'id'],
            h4: ['class', 'id'],
            h5: ['class', 'id'],
            h6: ['class', 'id'],
            header: [],
            hr: [],
            i: [],
            img: ['src', 'alt', 'title', 'width', 'height'],
            ins: ['datetime'],
            li: [],
            mark: [],
            nav: [],
            ol: [],
            p: ['class', 'id'],
            pre: [],
            q: ['cite'],
            section: [],
            small: [],
            span: ['class', 'id'],
            strong: [],
            sub: [],
            summary: [],
            sup: [],
            table: ['width', 'border', 'align', 'valign'],
            tbody: ['align', 'valign'],
            td: ['width', 'rowspan', 'colspan', 'align', 'valign'],
            tfoot: ['align', 'valign'],
            th: ['width', 'rowspan', 'colspan', 'align', 'valign'],
            thead: ['align', 'valign'],
            tr: ['rowspan', 'align', 'valign'],
            u: [],
            ul: [],
            video: ['autoplay', 'controls', 'crossorigin', 'loop', 'muted', 'playsinline', 'poster', 'preload', 'src', 'height', 'width']
          },
          stripIgnoreTag: true,
          stripIgnoreTagBody: ['script', 'style'],
          allowCommentTag: false,
          stripBlankChar: false,
          css: false,
          enableStrictMode: true
        } as XssOptions
      }
    );
  }

  protected async performCleaning(input: string, config: ITextCleanerConfig): Promise<string> {
    const options = this.buildXssOptions(config.options || {});

    try {
      // Create custom XSS filter with options
      const myxss = new xss.FilterXSS(options);

      // Process the input
      const cleaned = myxss.process(input);

      // Additional safety check for common XSS patterns
      const doubleChecked = this.additionalXssCheck(cleaned);

      return doubleChecked;
    } catch (error) {
      console.error(`XSS cleaning failed: ${error}`);
      throw new Error(`XSS filtering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildXssOptions(customOptions: XssOptions): any {
    const defaultOptions = this.defaultConfig.options as XssOptions;
    const merged = { ...defaultOptions, ...customOptions };

    // Add custom handlers if needed
    if (!merged.onTagAttr) {
      merged.onTagAttr = (_tag: string, name: string, value: string, _isWhiteAttr: boolean) => {
        // Block javascript: protocol
        if (name === 'href' || name === 'src') {
          if (value.match(/^javascript:/i)) {
            return '';
          }
          // Block data URIs that could contain scripts (except images)
          if (value.match(/^data:/i) && !value.match(/^data:image\//i)) {
            return '';
          }
        }

        // Block event handlers
        if (name.match(/^on[a-z]+$/i)) {
          return '';
        }

        // Default behavior
        return undefined;
      };
    }

    if (!merged.safeAttrValue) {
      merged.safeAttrValue = (tag: string, name: string, value: string, cssFilter: any) => {
        // Use default XSS safe attribute value processing
        return xss.safeAttrValue(tag, name, value, cssFilter);
      };
    }

    return merged;
  }

  private additionalXssCheck(input: string): string {
    // Additional patterns to remove
    const patterns = [
      // JavaScript event handlers
      /on\w+\s*=\s*["'][^"']*["']/gi,
      /on\w+\s*=\s*[^\s>]+/gi,

      // JavaScript protocols
      /javascript\s*:/gi,
      /vbscript\s*:/gi,

      // Dangerous attributes
      /data\s*:\s*text\/html/gi,

      // Import statements
      /@import/gi,

      // Expression calls
      /expression\s*\(/gi,

      // Meta refresh
      /<meta[^>]*http-equiv[^>]*refresh[^>]*>/gi,

      // Base tag manipulation
      /<base[^>]*href[^>]*>/gi,

      // Form actions
      /formaction\s*=/gi,

      // SVG scripts
      /<svg[^>]*onload[^>]*>/gi
    ];

    let cleaned = input;
    for (const pattern of patterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    return cleaned;
  }

  protected calculateStatistics(original: string, cleaned: string): ICleaningStatistics {
    const scriptsInOriginal = (original.match(/<script[^>]*>/gi) || []).length;
    const eventsInOriginal = (original.match(/on\w+\s*=/gi) || []).length;
    const jsProtocolsInOriginal = (original.match(/javascript:/gi) || []).length;
    const iframesInOriginal = (original.match(/<iframe[^>]*>/gi) || []).length;
    const embedsInOriginal = (original.match(/<embed[^>]*>/gi) || []).length;
    const objectsInOriginal = (original.match(/<object[^>]*>/gi) || []).length;

    return {
      scriptsRemoved: scriptsInOriginal,
      custom: {
        eventHandlersRemoved: eventsInOriginal,
        jsProtocolsRemoved: jsProtocolsInOriginal,
        iframesRemoved: iframesInOriginal,
        embedsRemoved: embedsInOriginal,
        objectsRemoved: objectsInOriginal,
        xssPatternsFound: (
          scriptsInOriginal +
          eventsInOriginal +
          jsProtocolsInOriginal +
          iframesInOriginal +
          embedsInOriginal +
          objectsInOriginal
        ) as any,
        cleanlinessScore: cleaned.length > 0
          ? ((1 - (scriptsInOriginal + eventsInOriginal) / (cleaned.length / 100)) * 100).toFixed(2) as any
          : '100' as any
      }
    };
  }

  protected generateWarnings(original: string, cleaned: string): string[] | undefined {
    const warnings: string[] = [];

    if (original.match(/<script[^>]*>/gi)) {
      warnings.push('Script tags were removed for security');
    }

    if (original.match(/on\w+\s*=/gi)) {
      warnings.push('Event handlers were removed for security');
    }

    if (original.match(/javascript:/gi)) {
      warnings.push('JavaScript protocols were removed');
    }

    if (original.match(/<iframe[^>]*>/gi)) {
      warnings.push('Iframes were removed for security');
    }

    if (original.match(/<form[^>]*>/gi) && !cleaned.match(/<form[^>]*>/gi)) {
      warnings.push('Form elements were removed - may affect functionality');
    }

    const reduction = 1 - (cleaned.length / original.length);
    if (reduction > 0.5) {
      warnings.push(`${(reduction * 100).toFixed(0)}% of content was removed for security`);
    }

    return warnings.length > 0 ? warnings : undefined;
  }

  protected validateSpecificConfig(
    config: ITextCleanerConfig,
    errors: string[],
    warnings: string[]
  ): void {
    const options = config.options as XssOptions;

    if (options?.css === true && !options?.enableStrictMode) {
      warnings.push('Allowing CSS without strict mode may pose security risks');
    }

    if (options?.allowCommentTag) {
      warnings.push('Allowing HTML comments may preserve sensitive information');
    }

    if (options?.whiteList && Object.keys(options.whiteList).includes('script')) {
      errors.push('Script tags should never be whitelisted for XSS prevention');
    }

    if (options?.stripIgnoreTag === false && options?.stripIgnoreTagBody === false) {
      warnings.push('Not stripping ignored tags may leave dangerous content');
    }
  }
}