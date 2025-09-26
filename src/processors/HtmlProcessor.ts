/**
 * HTML content processor
 * Single Responsibility: Processes HTML content and extracts structured data
 */

import * as cheerio from 'cheerio';
import { BaseProcessor } from './BaseProcessor';
import {
  ProcessingOptions,
  ProcessedContent,
  ExtractedImage,
  ExtractedLink,
  ExtractedTable
} from '../interfaces/IContentProcessor';
import { ContentType } from '../interfaces/IUrlDetector';

export class HtmlProcessor extends BaseProcessor {
  constructor(maxTextLength: number = 1000000) {
    super([ContentType.HTML], maxTextLength);
  }

  protected async performProcessing(
    content: Buffer | string,
    _contentType: ContentType,
    options: ProcessingOptions
  ): Promise<ProcessedContent> {
    const htmlContent = Buffer.isBuffer(content) ? content.toString('utf8') : content;
    const $ = cheerio.load(htmlContent);

    // Remove script and style elements
    $('script, style, noscript').remove();

    const text = this.extractTextContent($, options);
    const title = this.extractHtmlTitle($);
    const links = options.extractLinks ? this.extractHtmlLinks($) : [];
    const images = options.extractImages ? this.extractImages($) : [];
    const tables = this.extractTables($);
    const structure = options.extractMetadata ? this.extractHtmlStructure($) : undefined;
    const metadata = this.extractMetadata($, htmlContent);

    return this.createProcessedContent(
      text,
      title,
      metadata,
      images,
      links,
      tables,
      structure
    );
  }

  private extractTextContent($: cheerio.CheerioAPI, options: ProcessingOptions): string {
    // Remove unwanted elements
    $('nav, footer, aside, .advertisement, .ads, .cookie-notice').remove();

    let text: string;

    if (options.preserveFormatting) {
      text = this.extractFormattedText($);
    } else {
      text = $('body').text() || $.text();
    }

    return this.cleanText(text);
  }

  private extractFormattedText($: cheerio.CheerioAPI): string {
    const textParts: string[] = [];

    // Process headings
    $('h1, h2, h3, h4, h5, h6').each((_, element) => {
      const $el = $(element);
      const level = parseInt(element.tagName[1]);
      const prefix = '#'.repeat(level);
      textParts.push(`${prefix} ${$el.text().trim()}`);
    });

    // Process paragraphs
    $('p').each((_, element) => {
      const text = $(element).text().trim();
      if (text) {
        textParts.push(text);
      }
    });

    // Process lists
    $('ul, ol').each((_, element) => {
      const $list = $(element);
      $list.find('li').each((_, li) => {
        const text = $(li).text().trim();
        if (text) {
          const prefix = element.tagName === 'ol' ? '-' : '*';
          textParts.push(`${prefix} ${text}`);
        }
      });
    });

    // Process blockquotes
    $('blockquote').each((_, element) => {
      const text = $(element).text().trim();
      if (text) {
        textParts.push(`> ${text}`);
      }
    });

    return textParts.join('\n\n');
  }

  private extractHtmlTitle($: cheerio.CheerioAPI): string | undefined {
    // Try multiple sources for title
    const titleSources = [
      $('title').first().text(),
      $('h1').first().text(),
      $('meta[property="og:title"]').attr('content'),
      $('meta[name="title"]').attr('content'),
      $('meta[property="twitter:title"]').attr('content')
    ];

    for (const title of titleSources) {
      if (title && title.trim().length > 0) {
        return title.trim();
      }
    }

    return undefined;
  }

  private extractHtmlLinks($: cheerio.CheerioAPI): ExtractedLink[] {
    const links: ExtractedLink[] = [];

    $('a[href]').each((_, element) => {
      const $link = $(element);
      const href = $link.attr('href');
      const text = $link.text().trim();
      const title = $link.attr('title');

      if (href && text && this.isValidUrl(href)) {
        links.push({
          url: href,
          text,
          title
        });
      }
    });

    // Remove duplicates
    const uniqueLinks = links.filter((link, index, array) =>
      array.findIndex(l => l.url === link.url) === index
    );

    return uniqueLinks;
  }

  private extractImages($: cheerio.CheerioAPI): ExtractedImage[] {
    const images: ExtractedImage[] = [];

    $('img[src]').each((_, element) => {
      const $img = $(element);
      const src = $img.attr('src');
      const alt = $img.attr('alt');
      const title = $img.attr('title');
      const width = this.parseNumber($img.attr('width'));
      const height = this.parseNumber($img.attr('height'));

      if (src) {
        const image: ExtractedImage = {
          src,
          alt,
          caption: title || alt
        };

        if (width && height) {
          image.size = { width, height };
        }

        images.push(image);
      }
    });

    // Also extract images from figure elements
    $('figure img').each((_, element) => {
      const $img = $(element);
      const $figure = $img.closest('figure');
      const src = $img.attr('src');
      const alt = $img.attr('alt');
      const caption = $figure.find('figcaption').text().trim();

      if (src && !images.some(img => img.src === src)) {
        images.push({
          src,
          alt,
          caption: caption || alt
        });
      }
    });

    return images;
  }

  private extractTables($: cheerio.CheerioAPI): ExtractedTable[] {
    const tables: ExtractedTable[] = [];

    $('table').each((_, element) => {
      const $table = $(element);
      const caption = $table.find('caption').text().trim();

      // Extract headers
      const headers: string[] = [];
      $table.find('thead th, tbody tr:first-child th, tr:first-child td').each((_, th) => {
        headers.push($(th).text().trim());
      });

      if (headers.length === 0) return; // Skip tables without clear headers

      // Extract rows
      const rows: string[][] = [];
      const rowSelector = $table.find('thead').length > 0
        ? 'tbody tr'
        : 'tr:not(:first-child)';

      $table.find(rowSelector).each((_, tr) => {
        const row: string[] = [];
        $(tr).find('td, th').each((_, cell) => {
          row.push($(cell).text().trim());
        });

        if (row.length > 0) {
          rows.push(row);
        }
      });

      if (rows.length > 0) {
        tables.push({
          headers,
          rows,
          caption: caption || undefined
        });
      }
    });

    return tables;
  }

  private extractHtmlStructure($: cheerio.CheerioAPI): any {
    const headings: any[] = [];
    const sections: any[] = [];

    // Extract headings
    $('h1, h2, h3, h4, h5, h6').each((_, element) => {
      const $heading = $(element);
      const level = parseInt(element.tagName[1]);
      const text = $heading.text().trim();
      const id = $heading.attr('id') || this.generateHtmlId(text);

      if (text) {
        headings.push({
          level,
          text,
          id
        });
      }
    });

    // Extract sections based on headings
    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const nextHeading = headings[i + 1];

      const $current = $(`h${heading.level}:contains("${heading.text}")`).first();
      const $next = nextHeading
        ? $(`h${nextHeading.level}:contains("${nextHeading.text}")`).first()
        : $();

      let content = '';
      if ($current.length > 0) {
        let $sibling = $current.next();
        while ($sibling.length > 0 && !$sibling.is($next)) {
          if ($sibling.is('p, div, ul, ol, blockquote')) {
            content += $sibling.text().trim() + '\n\n';
          }
          $sibling = $sibling.next();
        }
      }

      if (content.trim()) {
        sections.push({
          title: heading.text,
          content: content.trim()
        });
      }
    }

    return {
      headings,
      sections
    };
  }

  private extractMetadata($: cheerio.CheerioAPI, htmlContent: string): Record<string, any> {
    const metadata: Record<string, any> = {
      contentType: ContentType.HTML,
      characterCount: htmlContent.length
    };

    // Extract meta tags
    const metaTags: Record<string, string> = {};
    $('meta').each((_, element) => {
      const $meta = $(element);
      const name = $meta.attr('name') || $meta.attr('property') || $meta.attr('http-equiv');
      const content = $meta.attr('content');

      if (name && content) {
        metaTags[name] = content;
      }
    });

    if (Object.keys(metaTags).length > 0) {
      metadata.metaTags = metaTags;
    }

    // Extract language
    const lang = $('html').attr('lang') || $('meta[http-equiv="content-language"]').attr('content');
    if (lang) {
      metadata.language = lang;
    }

    // Extract document structure info
    metadata.structure = {
      headingCount: $('h1, h2, h3, h4, h5, h6').length,
      paragraphCount: $('p').length,
      linkCount: $('a[href]').length,
      imageCount: $('img[src]').length,
      tableCount: $('table').length,
      listCount: $('ul, ol').length
    };

    // Extract Open Graph data
    const ogData: Record<string, string> = {};
    $('meta[property^="og:"]').each((_, element) => {
      const $meta = $(element);
      const property = $meta.attr('property');
      const content = $meta.attr('content');

      if (property && content) {
        ogData[property.replace('og:', '')] = content;
      }
    });

    if (Object.keys(ogData).length > 0) {
      metadata.openGraph = ogData;
    }

    // Extract Twitter Card data
    const twitterData: Record<string, string> = {};
    $('meta[name^="twitter:"]').each((_, element) => {
      const $meta = $(element);
      const name = $meta.attr('name');
      const content = $meta.attr('content');

      if (name && content) {
        twitterData[name.replace('twitter:', '')] = content;
      }
    });

    if (Object.keys(twitterData).length > 0) {
      metadata.twitterCard = twitterData;
    }

    return metadata;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      // Check if it's a relative URL
      return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
    }
  }

  private parseNumber(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
  }

  private generateHtmlId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }
}