/**
 * DeepDoctection scraper implementation with Python bridge
 * Single Responsibility: Deep document analysis and extraction using ML models
 */

import { BaseScraper } from './BaseScraper';
import {
  ScraperOptions,
  ScrapedContent,
  ScraperType,
  ScrapedMetadata
} from '../interfaces/IScraper';
import { DeepDoctectionParameters } from '../interfaces/IScraperParameters';
import { PythonBridge } from './PythonBridge';
import * as path from 'path';

export class DeepDoctectionScraper extends BaseScraper {
  private pythonBridge: PythonBridge;
  private wrapperPath: string;

  constructor() {
    super(ScraperType.DEEPDOCTECTION, {
      javascript: false,
      cookies: false,
      proxy: false,
      screenshot: false,
      pdfGeneration: false,
      multiPage: true  // Can handle multi-page documents
    });

    this.pythonBridge = new PythonBridge();
    // Use v2 wrapper with better compatibility
    this.wrapperPath = path.join(__dirname, 'python_wrappers', 'deepdoctection_wrapper_v2.py');
  }

  async scrape(url: string, options?: ScraperOptions): Promise<ScrapedContent> {
    // Check if URL can be handled first
    if (!this.canHandle(url)) {
      throw new Error(`Invalid URL or unsupported document type: ${url}`);
    }

    this.validateOptions(options);
    const mergedOptions = this.mergeOptions(options);
    const params = this.extractDeepDoctectionParams(mergedOptions);

    const startTime = Date.now();

    try {
      // Prepare configuration for Python wrapper
      const pythonConfig = {
        document_url: url,
        options: this.buildDeepDoctectionOptions(params)
      };

      // Execute document analysis via Python bridge
      const pythonResult = await this.pythonBridge.execute(this.wrapperPath, [pythonConfig], {
        timeout: params.timeout || 120000  // 2 minutes default for complex documents
      });

      if (!pythonResult.success) {
        throw new Error(pythonResult.error || 'Python execution failed');
      }

      const result = pythonResult.data;

      if (!result.success) {
        // Check if it's a mock response
        if (result.mock) {
          // Return a basic result for mock responses
          return {
            url,
            content: Buffer.from(result.document?.text || 'DeepDoctection not available'),
            mimeType: 'text/plain',
            metadata: {
              title: result.metadata?.title || 'Mock Analysis',
              statusCode: 200,
              loadTime: Date.now() - startTime,
              error: result.error,
              scraperMetadata: {
                mock: true
              }
            },
            scraperName: this.name,
            timestamp: new Date()
          };
        }
        throw new Error(result.error || 'DeepDoctection processing failed');
      }

      // Extract content based on requested format
      const content = await this.extractContent(result, params);

      // Build metadata
      const metadata = this.buildMetadata(result, params, startTime);

      return {
        url,
        content,
        mimeType: this.getMimeType(params.outputFormat),
        metadata,
        scraperName: this.name,
        timestamp: new Date()
      };

    } catch (error) {
      throw new Error(`DeepDoctection analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private extractDeepDoctectionParams(options: ScraperOptions): DeepDoctectionParameters {
    const defaults: DeepDoctectionParameters = {
      analyzerType: 'auto',
      ocr: true,
      tableDetection: true,
      layoutDetection: true,
      outputFormat: 'json',
      timeout: options.timeout || 60000,
      userAgent: options.userAgent,
      headers: options.headers
    };

    if (options.scraperSpecific) {
      return { ...defaults, ...options.scraperSpecific as DeepDoctectionParameters };
    }

    return defaults;
  }

  private buildDeepDoctectionOptions(params: DeepDoctectionParameters): any {
    return {
      analyzer_type: params.analyzerType,
      ocr: params.ocr,
      table_detection: params.tableDetection,
      layout_detection: params.layoutDetection,
      figure_detection: params.figureDetection,
      formula_detection: params.formulaDetection,
      language: params.language,
      dpi: params.dpi,
      max_pages: params.maxPages,
      page_range: params.pageRange,
      confidence_threshold: params.confidenceThreshold,
      merge_cells: params.mergeCells,
      extract_images: params.extractImages,
      extract_metadata: params.extractMetadata !== false
    };
  }

  private async extractContent(result: any, params: DeepDoctectionParameters): Promise<Buffer> {
    let content: string;

    switch (params.outputFormat) {
      case 'markdown':
        content = result.document?.markdown || this.convertToMarkdown(result);
        break;

      case 'text':
        content = result.document?.text || '';
        break;

      case 'html':
        content = this.convertToHTML(result);
        break;

      case 'json':
      default:
        // Return full structured data as JSON
        content = JSON.stringify({
          document: result.document,
          metadata: result.metadata,
          tables: result.tables || [],
          figures: result.figures || [],
          pages: result.pages || []
        }, null, 2);
        break;
    }

    return Buffer.from(content, 'utf-8');
  }

  private convertToMarkdown(result: any): string {
    let markdown = '';

    // Add title if available
    if (result.metadata?.title) {
      markdown += `# ${result.metadata.title}\n\n`;
    }

    // Add document text
    if (result.document?.text) {
      markdown += result.document.text + '\n\n';
    }

    // Add tables section if present
    if (result.tables && result.tables.length > 0) {
      markdown += '## Tables\n\n';
      result.tables.forEach((table: any, index: number) => {
        markdown += `### Table ${index + 1}\n`;
        markdown += `Columns: ${table.columns || 'Unknown'}\n\n`;
      });
    }

    // Add figures section if present
    if (result.figures && result.figures.length > 0) {
      markdown += '## Figures\n\n';
      result.figures.forEach((figure: any, index: number) => {
        markdown += `- Figure ${index + 1}: ${figure.caption || 'No caption'}\n`;
      });
    }

    return markdown;
  }

  private convertToHTML(result: any): string {
    let html = '<!DOCTYPE html><html><head><title>';
    html += result.metadata?.title || 'Document Analysis';
    html += '</title></head><body>';

    if (result.metadata?.title) {
      html += `<h1>${result.metadata.title}</h1>`;
    }

    // Add document content
    if (result.document?.text) {
      const paragraphs = result.document.text.split('\n\n');
      paragraphs.forEach((p: string) => {
        if (p.trim()) {
          html += `<p>${p}</p>`;
        }
      });
    }

    // Add tables if present
    if (result.tables && result.tables.length > 0) {
      html += '<h2>Tables</h2>';
      result.tables.forEach((table: any, index: number) => {
        html += `<h3>Table ${index + 1}</h3>`;
        html += `<p>Columns: ${table.columns || 'Unknown'}</p>`;
      });
    }

    // Add figures if present
    if (result.figures && result.figures.length > 0) {
      html += '<h2>Figures</h2><ul>';
      result.figures.forEach((figure: any, index: number) => {
        html += `<li>Figure ${index + 1}: ${figure.caption || 'No caption'}</li>`;
      });
      html += '</ul>';
    }

    html += '</body></html>';
    return html;
  }

  private buildMetadata(result: any, params: DeepDoctectionParameters, startTime: number): ScrapedMetadata {
    return {
      title: result.metadata?.title,
      statusCode: 200,
      loadTime: Date.now() - startTime,
      scraperConfig: params,
      scraperMetadata: {
        analyzer: result.metadata?.analyzer || 'deepdoctection',
        pageCount: result.metadata?.page_count || 0,
        tableCount: result.metadata?.table_count || 0,
        figureCount: result.metadata?.figure_count || 0,
        documentFormat: result.document?.format || 'unknown',
        processingTime: Date.now() - startTime,
        documentAnalysis: {
          tables: result.tables?.length || 0,
          figures: result.figures?.length || 0,
          pages: result.pages?.length || 0,
          hasOCR: params.ocr,
          layoutDetected: params.layoutDetection
        }
      }
    };
  }

  private getMimeType(format?: string): string {
    switch (format) {
      case 'markdown':
        return 'text/markdown';
      case 'html':
        return 'text/html';
      case 'text':
        return 'text/plain';
      case 'json':
      default:
        return 'application/json';
    }
  }

  canHandle(url: string): boolean {
    // DeepDoctection can handle any URL
    if (!super.canHandle(url)) return false;

    // Particularly good for PDFs and complex documents, but can analyze any content
    // Always returns true for valid URLs since it can fall back to basic text extraction
    return true;
  }
}