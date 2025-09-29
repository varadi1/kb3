/**
 * Single Responsibility: Manages scraper parameter configuration and validation
 * Open/Closed Principle: Open for extension through new validators
 * Dependency Inversion: Depends on interfaces, not concrete implementations
 */

import {
  IParameterManager,
  IParameterValidator,
  ScraperConfiguration,
  BatchScraperConfiguration,
  ScraperSpecificParameters,
  ParameterValidationResult,
  PlaywrightParameters,
  Crawl4AIParameters,
  DoclingParameters
} from '../interfaces/IScraperParameters';

/**
 * Base validator for common parameter validation
 */
abstract class BaseParameterValidator implements IParameterValidator {
  abstract validate(parameters: any): ParameterValidationResult;
  abstract getDefaultParameters(): ScraperSpecificParameters;
  abstract getSupportedParameters(): string[];

  normalize(parameters: any): ScraperSpecificParameters {
    const result = this.validate(parameters);
    if (result.valid && result.normalizedParams) {
      return result.normalizedParams;
    }
    return this.getDefaultParameters();
  }

  protected validateBaseParameters(params: any): string[] {
    const errors: string[] = [];

    if (params.timeout !== undefined && (typeof params.timeout !== 'number' || params.timeout < 0)) {
      errors.push('timeout must be a positive number');
    }

    if (params.retries !== undefined && (typeof params.retries !== 'number' || params.retries < 0)) {
      errors.push('retries must be a non-negative number');
    }

    if (params.userAgent !== undefined && typeof params.userAgent !== 'string') {
      errors.push('userAgent must be a string');
    }

    if (params.headers !== undefined && typeof params.headers !== 'object') {
      errors.push('headers must be an object');
    }

    if (params.proxy !== undefined && typeof params.proxy !== 'object') {
      errors.push('proxy must be an object with server property');
    }

    return errors;
  }
}

/**
 * Validator for Playwright parameters
 */
export class PlaywrightParameterValidator extends BaseParameterValidator {
  validate(parameters: any): ParameterValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const normalized: PlaywrightParameters = {};

    // Validate base parameters
    errors.push(...this.validateBaseParameters(parameters));

    // Validate Playwright-specific parameters
    if (parameters.headless !== undefined) {
      if (typeof parameters.headless !== 'boolean') {
        errors.push('headless must be a boolean');
      } else {
        normalized.headless = parameters.headless;
      }
    }

    if (parameters.viewport !== undefined) {
      if (typeof parameters.viewport !== 'object' ||
          typeof parameters.viewport.width !== 'number' ||
          typeof parameters.viewport.height !== 'number') {
        errors.push('viewport must have numeric width and height');
      } else {
        normalized.viewport = parameters.viewport;
      }
    }

    if (parameters.waitUntil !== undefined) {
      const validValues = ['load', 'domcontentloaded', 'networkidle', 'commit'];
      if (!validValues.includes(parameters.waitUntil)) {
        errors.push(`waitUntil must be one of: ${validValues.join(', ')}`);
      } else {
        normalized.waitUntil = parameters.waitUntil;
      }
    }

    if (parameters.screenshot !== undefined) {
      if (typeof parameters.screenshot === 'boolean') {
        normalized.screenshot = parameters.screenshot;
      } else if (typeof parameters.screenshot === 'object') {
        normalized.screenshot = parameters.screenshot;
      } else {
        errors.push('screenshot must be boolean or object');
      }
    }

    if (parameters.pdf !== undefined) {
      if (typeof parameters.pdf === 'boolean') {
        normalized.pdf = parameters.pdf;
      } else if (typeof parameters.pdf === 'object') {
        normalized.pdf = parameters.pdf;
      } else {
        errors.push('pdf must be boolean or object');
      }
    }

    if (parameters.slowMo !== undefined) {
      if (typeof parameters.slowMo !== 'number' || parameters.slowMo < 0) {
        errors.push('slowMo must be a non-negative number');
      } else {
        normalized.slowMo = parameters.slowMo;
      }
    }

    // Copy over other valid parameters
    const validParams = this.getSupportedParameters();
    for (const key of Object.keys(parameters)) {
      if (validParams.includes(key) && !normalized.hasOwnProperty(key)) {
        (normalized as any)[key] = parameters[key];
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      normalizedParams: normalized
    };
  }

  getDefaultParameters(): PlaywrightParameters {
    return {
      headless: true,
      viewport: { width: 1280, height: 720 },
      waitUntil: 'networkidle',
      timeout: 30000,
      javaScriptEnabled: true
    };
  }

  getSupportedParameters(): string[] {
    return [
      'headless', 'viewport', 'waitUntil', 'timeout', 'userAgent',
      'bypassCSP', 'ignoreHTTPSErrors', 'javaScriptEnabled',
      'screenshot', 'pdf', 'cookies', 'waitForSelector',
      'waitForFunction', 'scrollToBottom', 'clickSelectors',
      'extraHttpHeaders', 'locale', 'timezone', 'geolocation',
      'permissions', 'offline', 'httpCredentials', 'deviceScaleFactor',
      'isMobile', 'hasTouch', 'slowMo', 'videosPath', 'recordVideo',
      'headers', 'proxy', 'retries'
    ];
  }
}

/**
 * Validator for Crawl4AI parameters
 */
export class Crawl4AIParameterValidator extends BaseParameterValidator {
  validate(parameters: any): ParameterValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const normalized: Crawl4AIParameters = {};

    // Validate base parameters
    errors.push(...this.validateBaseParameters(parameters));

    // Validate Crawl4AI-specific parameters
    if (parameters.maxDepth !== undefined) {
      if (typeof parameters.maxDepth !== 'number' || parameters.maxDepth < 0) {
        errors.push('maxDepth must be a non-negative number');
      } else {
        normalized.maxDepth = parameters.maxDepth;
      }
    }

    if (parameters.jsExecution !== undefined) {
      if (typeof parameters.jsExecution !== 'boolean') {
        errors.push('jsExecution must be a boolean');
      } else {
        normalized.jsExecution = parameters.jsExecution;
      }
    }

    if (parameters.extractionStrategy !== undefined) {
      const validStrategies = ['cosine', 'llm', 'regex', 'xpath', 'css'];
      if (!validStrategies.includes(parameters.extractionStrategy)) {
        errors.push(`extractionStrategy must be one of: ${validStrategies.join(', ')}`);
      } else {
        normalized.extractionStrategy = parameters.extractionStrategy;
      }
    }

    if (parameters.chunkingStrategy !== undefined) {
      if (typeof parameters.chunkingStrategy !== 'object') {
        errors.push('chunkingStrategy must be an object');
      } else {
        normalized.chunkingStrategy = parameters.chunkingStrategy;
      }
    }

    if (parameters.wordCountThreshold !== undefined) {
      if (typeof parameters.wordCountThreshold !== 'number' || parameters.wordCountThreshold < 0) {
        errors.push('wordCountThreshold must be a non-negative number');
      } else {
        normalized.wordCountThreshold = parameters.wordCountThreshold;
      }
    }

    if (parameters.extractLinks !== undefined) {
      if (typeof parameters.extractLinks !== 'boolean') {
        errors.push('extractLinks must be a boolean');
      } else {
        normalized.extractLinks = parameters.extractLinks;
      }
    }

    if (parameters.extractMetadata !== undefined) {
      if (typeof parameters.extractMetadata !== 'boolean') {
        errors.push('extractMetadata must be a boolean');
      } else {
        normalized.extractMetadata = parameters.extractMetadata;
      }
    }

    // Copy over other valid parameters
    const validParams = this.getSupportedParameters();
    for (const key of Object.keys(parameters)) {
      if (validParams.includes(key) && !normalized.hasOwnProperty(key)) {
        (normalized as any)[key] = parameters[key];
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      normalizedParams: normalized
    };
  }

  getDefaultParameters(): Crawl4AIParameters {
    return {
      maxDepth: 1,
      jsExecution: true,
      wordCountThreshold: 50,
      removeOverlay: true,
      timeout: 30000
    };
  }

  getSupportedParameters(): string[] {
    return [
      'maxDepth', 'jsExecution', 'useProxy', 'waitFor',
      'extractionStrategy', 'chunkingStrategy', 'contentFilter',
      'bypassCache', 'cssSelector', 'excludedTags', 'wordCountThreshold',
      'removeOverlay', 'screenshot', 'sessionId', 'magic',
      'onlyMainContent', 'removeForms', 'removeNav', 'socialMediaLinks',
      'antiBot', 'cacheMode', 'delayBefore', 'delayAfter',
      'pageTimeout', 'verbose', 'excludeExternalLinks',
      'excludeInternalLinks', 'excludeDomains', 'includeDomains',
      'maxPages', 'baseUrl', 'timeout', 'userAgent', 'headers',
      'proxy', 'retries', 'extractLinks', 'extractMetadata'
    ];
  }
}

/**
 * Validator for Docling parameters
 */
export class DoclingParameterValidator extends BaseParameterValidator {
  validate(parameters: any): ParameterValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const normalized: DoclingParameters = {};

    // Validate base parameters
    errors.push(...this.validateBaseParameters(parameters));

    // Validate Docling-specific parameters
    if (parameters.format !== undefined) {
      const validFormats = ['json', 'markdown', 'text', 'html'];
      if (!validFormats.includes(parameters.format)) {
        errors.push(`format must be one of: ${validFormats.join(', ')}`);
      } else {
        normalized.format = parameters.format;
      }
    }

    if (parameters.ocr !== undefined) {
      if (typeof parameters.ocr !== 'boolean') {
        errors.push('ocr must be a boolean');
      } else {
        normalized.ocr = parameters.ocr;
      }
    }

    if (parameters.ocrEngine !== undefined) {
      const validEngines = ['tesseract', 'easyocr', 'paddleocr'];
      if (!validEngines.includes(parameters.ocrEngine)) {
        errors.push(`ocrEngine must be one of: ${validEngines.join(', ')}`);
      } else {
        normalized.ocrEngine = parameters.ocrEngine;
      }
    }

    if (parameters.pageRange !== undefined) {
      if (!Array.isArray(parameters.pageRange) ||
          parameters.pageRange.length !== 2 ||
          typeof parameters.pageRange[0] !== 'number' ||
          typeof parameters.pageRange[1] !== 'number') {
        errors.push('pageRange must be an array of two numbers [start, end]');
      } else {
        normalized.pageRange = parameters.pageRange;
      }
    }

    if (parameters.maxPages !== undefined) {
      if (typeof parameters.maxPages !== 'number' || parameters.maxPages < 1) {
        errors.push('maxPages must be a positive number');
      } else {
        normalized.maxPages = parameters.maxPages;
      }
    }

    if (parameters.documentType !== undefined) {
      const validTypes = ['auto', 'pdf', 'docx', 'pptx', 'xlsx', 'image', 'html'];
      if (!validTypes.includes(parameters.documentType)) {
        errors.push(`documentType must be one of: ${validTypes.join(', ')}`);
      } else {
        normalized.documentType = parameters.documentType;
      }
    }

    // Copy over other valid parameters
    const validParams = this.getSupportedParameters();
    for (const key of Object.keys(parameters)) {
      if (validParams.includes(key) && !normalized.hasOwnProperty(key)) {
        (normalized as any)[key] = parameters[key];
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      normalizedParams: normalized
    };
  }

  getDefaultParameters(): DoclingParameters {
    return {
      format: 'markdown',
      ocr: false,
      tableStructure: true,
      documentType: 'auto',
      timeout: 60000
    };
  }

  getSupportedParameters(): string[] {
    return [
      'format', 'ocr', 'ocrEngine', 'tableStructure',
      'exportFigures', 'exportTables', 'exportPageImages',
      'pageRange', 'documentType', 'maxPages', 'languages',
      'tableFormat', 'figureFormat', 'extractFormFields',
      'extractAnnotations', 'extractBookmarks', 'extractEmbeddedFiles',
      'dpi', 'binarize', 'removeWatermarks', 'enhanceScannedText',
      'mergePages', 'splitBySection', 'chunkSize', 'overlapSize',
      'qualityThreshold', 'pipeline', 'timeout', 'userAgent',
      'headers', 'proxy', 'retries'
    ];
  }
}

/**
 * Validator for HTTP scraper parameters
 */
export class HttpParameterValidator extends BaseParameterValidator {
  validate(parameters: any): ParameterValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const normalized: any = {};

    // Validate base parameters
    errors.push(...this.validateBaseParameters(parameters));

    // Check for unknown parameters first
    const validParams = this.getSupportedParameters();
    for (const key of Object.keys(parameters)) {
      if (!validParams.includes(key)) {
        errors.push(`Unknown parameter: ${key}`);
      }
    }

    // HTTP-specific parameters
    if (parameters.timeout !== undefined) {
      if (typeof parameters.timeout !== 'number' || parameters.timeout <= 0) {
        errors.push('timeout must be a positive number');
      } else {
        normalized.timeout = parameters.timeout;
      }
    }

    if (parameters.headers !== undefined) {
      if (typeof parameters.headers !== 'object' || parameters.headers === null) {
        errors.push('headers must be an object');
      } else {
        normalized.headers = parameters.headers;
      }
    }

    if (parameters.userAgent !== undefined) {
      if (typeof parameters.userAgent !== 'string') {
        errors.push('userAgent must be a string');
      } else {
        normalized.userAgent = parameters.userAgent;
      }
    }

    if (parameters.followRedirects !== undefined) {
      if (typeof parameters.followRedirects !== 'boolean') {
        errors.push('followRedirects must be a boolean');
      } else {
        normalized.followRedirects = parameters.followRedirects;
      }
    }

    if (parameters.maxRedirects !== undefined) {
      if (typeof parameters.maxRedirects !== 'number' || parameters.maxRedirects < 0) {
        errors.push('maxRedirects must be a non-negative number');
      } else {
        normalized.maxRedirects = parameters.maxRedirects;
      }
    }

    // Copy over other valid parameters
    for (const key of Object.keys(parameters)) {
      if (validParams.includes(key) && !normalized.hasOwnProperty(key)) {
        (normalized as any)[key] = parameters[key];
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      normalizedParams: normalized
    };
  }

  getDefaultParameters(): any {
    return {
      timeout: 30000,
      followRedirects: true,
      maxRedirects: 5
    };
  }

  getSupportedParameters(): string[] {
    return [
      'timeout', 'headers', 'userAgent', 'proxy',
      'followRedirects', 'maxRedirects', 'retries',
      'retryDelay', 'encoding', 'responseType',
      'auth', 'cookies', 'decompress', 'keepAlive'
    ];
  }
}

/**
 * Validator for DeepDoctection scraper parameters
 */
export class DeepDoctectionParameterValidator extends BaseParameterValidator {
  validate(parameters: any): ParameterValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const normalized: any = {};

    // Validate base parameters
    errors.push(...this.validateBaseParameters(parameters));

    // DeepDoctection-specific parameters
    if (parameters.confidence !== undefined) {
      if (typeof parameters.confidence !== 'number' || parameters.confidence < 0 || parameters.confidence > 1) {
        errors.push('confidence must be a number between 0 and 1');
      } else {
        normalized.confidence = parameters.confidence;
      }
    }

    if (parameters.layoutAnalysis !== undefined) {
      if (typeof parameters.layoutAnalysis !== 'boolean') {
        errors.push('layoutAnalysis must be a boolean');
      } else {
        normalized.layoutAnalysis = parameters.layoutAnalysis;
      }
    }

    // Copy over other valid parameters
    const validParams = this.getSupportedParameters();
    for (const key of Object.keys(parameters)) {
      if (validParams.includes(key) && !normalized.hasOwnProperty(key)) {
        (normalized as any)[key] = parameters[key];
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      normalizedParams: normalized
    };
  }

  getDefaultParameters(): any {
    return {
      confidence: 0.7,
      layoutAnalysis: true
    };
  }

  getSupportedParameters(): string[] {
    return [
      'confidence', 'layoutAnalysis', 'model', 'device',
      'timeout', 'maxPages', 'detectTables', 'detectFigures'
    ];
  }
}

/**
 * Main parameter manager implementation
 */
export class ScraperParameterManager implements IParameterManager {
  private parameters: Map<string, ScraperConfiguration> = new Map();
  private validators: Map<string, IParameterValidator> = new Map();

  constructor() {
    // Register default validators
    this.validators.set('http', new HttpParameterValidator());
    this.validators.set('playwright', new PlaywrightParameterValidator());
    this.validators.set('crawl4ai', new Crawl4AIParameterValidator());
    this.validators.set('docling', new DoclingParameterValidator());
    this.validators.set('deepdoctection', new DeepDoctectionParameterValidator());
  }

  setParameters(url: string, config: ScraperConfiguration): void {
    // Validate parameters before storing
    const validation = this.validateParameters(config.scraperType, config.parameters);
    if (!validation.valid) {
      throw new Error(`Invalid parameters: ${validation.errors?.join(', ')}`);
    }

    this.parameters.set(url, {
      ...config,
      parameters: validation.normalizedParams!
    });
  }

  getParameters(url: string): ScraperConfiguration | null {
    return this.parameters.get(url) || null;
  }

  setBatchParameters(batch: BatchScraperConfiguration): void {
    // Validate parameters once for the batch
    const validation = this.validateParameters(
      batch.configuration.scraperType,
      batch.configuration.parameters
    );

    if (!validation.valid) {
      throw new Error(`Invalid batch parameters: ${validation.errors?.join(', ')}`);
    }

    const normalizedConfig = {
      ...batch.configuration,
      parameters: validation.normalizedParams!
    };

    for (const url of batch.urls) {
      if (batch.overrideExisting || !this.parameters.has(url)) {
        this.parameters.set(url, normalizedConfig);
      }
    }
  }

  getBatchParameters(urls: string[]): Map<string, ScraperConfiguration> {
    const result = new Map<string, ScraperConfiguration>();
    for (const url of urls) {
      const config = this.parameters.get(url);
      if (config) {
        result.set(url, config);
      }
    }
    return result;
  }

  validateParameters(scraperType: string, params: any): ParameterValidationResult {
    const validator = this.validators.get(scraperType);
    if (!validator) {
      return {
        valid: false,
        errors: [`No validator found for scraper type: ${scraperType}`]
      };
    }
    return validator.validate(params);
  }

  mergeWithDefaults(scraperType: string, params: any): ScraperSpecificParameters {
    const validator = this.validators.get(scraperType);
    if (!validator) {
      throw new Error(`No validator found for scraper type: ${scraperType}`);
    }

    const defaults = validator.getDefaultParameters();
    const validation = validator.validate(params);

    if (validation.valid && validation.normalizedParams) {
      return { ...defaults, ...validation.normalizedParams };
    }

    return defaults;
  }

  clearParameters(url?: string): void {
    if (url) {
      this.parameters.delete(url);
    } else {
      this.parameters.clear();
    }
  }

  exportParameters(): Map<string, ScraperConfiguration> {
    return new Map(this.parameters);
  }

  getConfiguredUrls(): string[] {
    return Array.from(this.parameters.keys());
  }

  importParameters(params: Map<string, ScraperConfiguration>): void {
    // Validate all parameters before importing
    for (const [url, config] of params) {
      const validation = this.validateParameters(config.scraperType, config.parameters);
      if (!validation.valid) {
        throw new Error(`Invalid parameters for URL ${url}: ${validation.errors?.join(', ')}`);
      }
    }

    // Clear existing and import new
    this.parameters.clear();
    for (const [url, config] of params) {
      this.parameters.set(url, config);
    }
  }

  /**
   * Register a custom validator for a scraper type
   */
  registerValidator(scraperType: string, validator: IParameterValidator): void {
    this.validators.set(scraperType, validator);
  }

  /**
   * Get supported parameters for a scraper type
   */
  getSupportedParameters(scraperType: string): string[] {
    const validator = this.validators.get(scraperType);
    return validator ? validator.getSupportedParameters() : [];
  }

  /**
   * Get default parameters for a scraper type
   */
  getDefaultParameters(scraperType: string): ScraperSpecificParameters | null {
    const validator = this.validators.get(scraperType);
    return validator ? validator.getDefaultParameters() : null;
  }
}