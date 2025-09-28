/**
 * Contract definitions for Python wrapper outputs
 * These interfaces define the expected structure of data returned by Python wrappers
 * Single Responsibility: Define contracts between Python and TypeScript layers
 */

/**
 * Base contract for all Python wrapper responses
 */
export interface IPythonWrapperResponse {
  success: boolean;
  data?: any;
  error?: string;
  stderr?: string;
  exitCode?: number;
  executionTime: number;
}

/**
 * Docling wrapper response contract
 */
export interface IDoclingResponse extends IPythonWrapperResponse {
  data?: {
    success: boolean;
    content?: string;
    format?: string;
    document?: {
      text?: string;
      markdown?: string;
      html?: string;
      json?: any;
    };
    metadata?: {
      title?: string;
      author?: string;
      page_count?: number;
      word_count?: number;
      document_type?: string;
      language?: string;
      created_date?: string;
      modified_date?: string;
    };
    tables?: Array<{
      rows?: string[][];
      caption?: string;
    }>;
    figures?: Array<{
      caption?: string;
      page?: number;
      type?: string;
    }>;
    annotations?: Array<{
      type?: string;
      content?: string;
    }>;
    bookmarks?: Array<{
      title?: string;
      page?: number;
    }>;
    form_fields?: Array<{
      name?: string;
      value?: string;
    }>;
    embedded_files?: Array<{
      name?: string;
      size?: number;
      type?: string;
    }>;
    error?: string;
  };
}

/**
 * Crawl4AI wrapper response contract
 */
export interface ICrawl4AIResponse extends IPythonWrapperResponse {
  data?: {
    success: boolean;
    content?: string;
    markdown?: string;
    html?: string;
    metadata?: {
      title?: string;
      description?: string;
      language?: string;
      keywords?: string[];
      author?: string;
      crawl_depth?: number;
      extraction_strategy?: string;
      links?: Array<{
        url: string;
        text?: string;
        type?: string;
      }>;
      images?: Array<{
        url: string;
        alt?: string;
        title?: string;
      }>;
      word_count?: number;
      session_id?: string;
      cache_mode?: string;
      magic?: boolean;
    };
    chunks?: Array<{
      text: string;
      metadata?: any;
    }>;
    error?: string;
  };
}

/**
 * DeepDoctection wrapper response contract
 */
export interface IDeepDoctectionResponse extends IPythonWrapperResponse {
  data?: {
    success: boolean;
    content?: string;
    tables?: Array<{
      data?: string[][];
      type?: string;
      confidence?: number;
    }>;
    layout?: Array<{
      type: string;
      bbox?: number[];
      text?: string;
      confidence?: number;
    }>;
    metadata?: {
      page_count?: number;
      document_type?: string;
      processing_time?: number;
    };
    error?: string;
  };
}

/**
 * Contract validator interface
 */
export interface IContractValidator<T> {
  validate(response: any): response is T;
  getErrors(): string[];
  getWarnings(): string[];
}

/**
 * Base contract validator implementation
 */
export abstract class BaseContractValidator<T> implements IContractValidator<T> {
  protected errors: string[] = [];
  protected warnings: string[] = [];

  abstract validate(response: any): response is T;

  getErrors(): string[] {
    return [...this.errors];
  }

  getWarnings(): string[] {
    return [...this.warnings];
  }

  protected reset(): void {
    this.errors = [];
    this.warnings = [];
  }

  protected checkRequired(obj: any, field: string, type?: string): boolean {
    if (!(field in obj)) {
      this.errors.push(`Missing required field: ${field}`);
      return false;
    }

    if (type && typeof obj[field] !== type) {
      this.errors.push(`Field ${field} should be ${type}, got ${typeof obj[field]}`);
      return false;
    }

    return true;
  }

  protected checkOptional(obj: any, field: string, type?: string): boolean {
    if (field in obj && type && typeof obj[field] !== type) {
      this.warnings.push(`Field ${field} should be ${type}, got ${typeof obj[field]}`);
      return false;
    }
    return true;
  }

  protected checkArray(obj: any, field: string, required: boolean = false): boolean {
    if (required && !(field in obj)) {
      this.errors.push(`Missing required array: ${field}`);
      return false;
    }

    if (field in obj && !Array.isArray(obj[field])) {
      const level = required ? 'errors' : 'warnings';
      this[level].push(`Field ${field} should be an array`);
      return false;
    }

    return true;
  }
}

/**
 * Docling contract validator
 */
export class DoclingContractValidator extends BaseContractValidator<IDoclingResponse> {
  validate(response: any): response is IDoclingResponse {
    this.reset();

    // Check base response structure
    if (!this.checkRequired(response, 'success', 'boolean')) return false;
    if (!this.checkRequired(response, 'executionTime', 'number')) return false;

    // If success is false, we only need error information
    if (!response.success) {
      this.checkOptional(response, 'error', 'string');
      return true;
    }

    // Check data structure
    if (!this.checkRequired(response, 'data', 'object')) return false;
    const data = response.data;

    if (!this.checkRequired(data, 'success', 'boolean')) return false;

    // Check optional document fields
    if ('document' in data) {
      const doc = data.document;
      this.checkOptional(doc, 'text', 'string');
      this.checkOptional(doc, 'markdown', 'string');
      this.checkOptional(doc, 'html', 'string');
      this.checkOptional(doc, 'json', 'object');
    }

    // Check optional metadata
    if ('metadata' in data) {
      const meta = data.metadata;
      this.checkOptional(meta, 'title', 'string');
      this.checkOptional(meta, 'author', 'string');
      this.checkOptional(meta, 'page_count', 'number');
      this.checkOptional(meta, 'word_count', 'number');
    }

    // Check optional arrays
    this.checkArray(data, 'tables');
    this.checkArray(data, 'figures');
    this.checkArray(data, 'annotations');
    this.checkArray(data, 'bookmarks');
    this.checkArray(data, 'form_fields');
    this.checkArray(data, 'embedded_files');

    return this.errors.length === 0;
  }
}

/**
 * Crawl4AI contract validator
 */
export class Crawl4AIContractValidator extends BaseContractValidator<ICrawl4AIResponse> {
  validate(response: any): response is ICrawl4AIResponse {
    this.reset();

    // Check base response structure
    if (!this.checkRequired(response, 'success', 'boolean')) return false;
    if (!this.checkRequired(response, 'executionTime', 'number')) return false;

    // If success is false, we only need error information
    if (!response.success) {
      this.checkOptional(response, 'error', 'string');
      return true;
    }

    // Check data structure
    if (!this.checkRequired(response, 'data', 'object')) return false;
    const data = response.data;

    if (!this.checkRequired(data, 'success', 'boolean')) return false;

    // Check optional content fields
    this.checkOptional(data, 'content', 'string');
    this.checkOptional(data, 'markdown', 'string');
    this.checkOptional(data, 'html', 'string');

    // Check optional metadata
    if ('metadata' in data) {
      const meta = data.metadata;
      this.checkOptional(meta, 'title', 'string');
      this.checkOptional(meta, 'extraction_strategy', 'string');
      this.checkArray(meta, 'links');
      this.checkArray(meta, 'images');
    }

    // Check optional chunks array
    this.checkArray(data, 'chunks');

    return this.errors.length === 0;
  }
}

/**
 * DeepDoctection contract validator
 */
export class DeepDoctectionContractValidator extends BaseContractValidator<IDeepDoctectionResponse> {
  validate(response: any): response is IDeepDoctectionResponse {
    this.reset();

    // Check base response structure
    if (!this.checkRequired(response, 'success', 'boolean')) return false;
    if (!this.checkRequired(response, 'executionTime', 'number')) return false;

    // If success is false, we only need error information
    if (!response.success) {
      this.checkOptional(response, 'error', 'string');
      return true;
    }

    // Check data structure
    if (!this.checkRequired(response, 'data', 'object')) return false;
    const data = response.data;

    if (!this.checkRequired(data, 'success', 'boolean')) return false;

    // Check optional content
    this.checkOptional(data, 'content', 'string');

    // Check optional arrays
    this.checkArray(data, 'tables');
    this.checkArray(data, 'layout');

    // Check optional metadata
    if ('metadata' in data) {
      const meta = data.metadata;
      this.checkOptional(meta, 'page_count', 'number');
      this.checkOptional(meta, 'document_type', 'string');
    }

    return this.errors.length === 0;
  }
}

/**
 * Factory for creating contract validators
 */
export class ContractValidatorFactory {
  static createValidator(scraperType: string): IContractValidator<any> | null {
    switch (scraperType) {
      case 'docling':
        return new DoclingContractValidator();
      case 'crawl4ai':
        return new Crawl4AIContractValidator();
      case 'deepdoctection':
        return new DeepDoctectionContractValidator();
      default:
        return null;
    }
  }
}