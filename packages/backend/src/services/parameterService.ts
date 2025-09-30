/**
 * Parameter Service - Manages scraper parameter configuration
 * Single Responsibility: Coordinate parameter validation, defaults, and schemas
 * Dependency Inversion: Depends on interfaces from core, not concrete implementations
 */

// Define interfaces locally to avoid import issues
interface ScraperConfiguration {
  scraperType: string;
  parameters: any;
  priority?: number;
  enabled?: boolean;
  urlPattern?: string | RegExp;
}

interface BatchScraperConfiguration {
  urls: string[];
  configuration: ScraperConfiguration;
  overrideExisting?: boolean;
}

interface ParameterValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  normalizedParams?: any;
}

type ScraperSpecificParameters = any;

export interface ParameterSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'select';
  description: string;
  required?: boolean;
  default?: any;
  options?: Array<{ value: any; label: string }>;
  min?: number;
  max?: number;
  properties?: Record<string, ParameterSchema>;
  items?: ParameterSchema;
  group?: string;
}

export interface ScraperParameterSchema {
  scraperType: string;
  displayName: string;
  description: string;
  parameters: Record<string, ParameterSchema>;
  groups?: Array<{ name: string; label: string; description?: string }>;
}

export interface IParameterService {
  getParameterSchema(scraperType: string): ScraperParameterSchema | null;
  validateParameters(scraperType: string, parameters: any): ParameterValidationResult;
  getDefaultParameters(scraperType: string): ScraperSpecificParameters | null;
  getSupportedParameters(scraperType: string): string[];
  setUrlParameters(url: string, config: ScraperConfiguration): void;
  getUrlParameters(url: string): ScraperConfiguration | null;
  setBatchParameters(batch: BatchScraperConfiguration): void;
  getAllParameterSchemas(): ScraperParameterSchema[];
}

// Validator interfaces for extensibility
interface IParameterValidator {
  validate(parameters: any): ParameterValidationResult;
  normalize(parameters: any): ScraperSpecificParameters;
  getDefaultParameters(): ScraperSpecificParameters;
  getSupportedParameters(): string[];
}

// Base validator class for common functionality
abstract class BaseParameterValidator implements IParameterValidator {
  abstract validate(parameters: any): ParameterValidationResult;
  abstract getDefaultParameters(): ScraperSpecificParameters;
  abstract getSupportedParameters(): string[];

  normalize(parameters: any): ScraperSpecificParameters {
    const validation = this.validate(parameters);
    if (validation.normalizedParams) {
      return validation.normalizedParams;
    }
    return parameters;
  }

  protected validateBaseParameters(params: any): string[] {
    const errors: string[] = [];

    if (params.timeout !== undefined) {
      if (typeof params.timeout !== 'number' || params.timeout < 0) {
        errors.push('timeout must be a positive number');
      }
    }

    if (params.retries !== undefined) {
      if (typeof params.retries !== 'number' || params.retries < 0 || params.retries > 10) {
        errors.push('retries must be between 0 and 10');
      }
    }

    return errors;
  }
}

// Specific validator implementations
class PlaywrightParameterValidator extends BaseParameterValidator {
  validate(parameters: any): ParameterValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const normalized: any = {};

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
      if (typeof parameters.viewport !== 'object') {
        errors.push('viewport must be an object');
      } else {
        normalized.viewport = parameters.viewport;
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      normalizedParams: normalized
    };
  }

  getDefaultParameters(): ScraperSpecificParameters {
    return {
      headless: true,
      viewport: { width: 1280, height: 720 },
      timeout: 30000
    };
  }

  getSupportedParameters(): string[] {
    return ['headless', 'viewport', 'timeout', 'waitUntil', 'screenshot', 'userAgent'];
  }
}

class HttpParameterValidator extends BaseParameterValidator {
  validate(parameters: any): ParameterValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const normalized: any = {};

    // Validate base parameters
    errors.push(...this.validateBaseParameters(parameters));

    // Validate HTTP-specific parameters
    if (parameters.followRedirects !== undefined) {
      if (typeof parameters.followRedirects !== 'boolean') {
        errors.push('followRedirects must be a boolean');
      } else {
        normalized.followRedirects = parameters.followRedirects;
      }
    }

    if (parameters.maxRedirects !== undefined) {
      const val = parameters.maxRedirects;
      if (typeof val !== 'number' || val < 0 || val > 20) {
        errors.push('maxRedirects must be a number between 0 and 20');
      } else {
        normalized.maxRedirects = val;
      }
    }

    if (parameters.userAgent !== undefined) {
      if (typeof parameters.userAgent !== 'string') {
        errors.push('userAgent must be a string');
      } else {
        normalized.userAgent = parameters.userAgent;
        // If userAgent is 'custom', require customUserAgent
        if (parameters.userAgent === 'custom' && !parameters.customUserAgent) {
          errors.push('customUserAgent is required when userAgent is set to custom');
        }
      }
    }

    if (parameters.customUserAgent !== undefined) {
      if (typeof parameters.customUserAgent !== 'string') {
        errors.push('customUserAgent must be a string');
      } else {
        normalized.customUserAgent = parameters.customUserAgent;
      }
    }

    if (parameters.acceptHeader !== undefined) {
      if (typeof parameters.acceptHeader !== 'string') {
        errors.push('acceptHeader must be a string');
      } else {
        normalized.acceptHeader = parameters.acceptHeader;
        // If acceptHeader is 'custom', require customAcceptHeader
        if (parameters.acceptHeader === 'custom' && !parameters.customAcceptHeader) {
          errors.push('customAcceptHeader is required when acceptHeader is set to custom');
        }
      }
    }

    if (parameters.customHeaders !== undefined) {
      if (typeof parameters.customHeaders !== 'object' || parameters.customHeaders === null) {
        errors.push('customHeaders must be an object');
      } else {
        normalized.customHeaders = parameters.customHeaders;
      }
    }

    if (parameters.retryAttempts !== undefined) {
      const val = parameters.retryAttempts;
      if (typeof val !== 'number' || val < 0 || val > 10) {
        errors.push('retryAttempts must be a number between 0 and 10');
      } else {
        normalized.retryAttempts = val;
      }
    }

    if (parameters.retryDelay !== undefined) {
      const val = parameters.retryDelay;
      if (typeof val !== 'number' || val < 100 || val > 10000) {
        errors.push('retryDelay must be a number between 100 and 10000');
      } else {
        normalized.retryDelay = val;
      }
    }

    if (parameters.acceptCookies !== undefined) {
      if (typeof parameters.acceptCookies !== 'boolean') {
        errors.push('acceptCookies must be a boolean');
      } else {
        normalized.acceptCookies = parameters.acceptCookies;
      }
    }

    if (parameters.verifyCertificates !== undefined) {
      if (typeof parameters.verifyCertificates !== 'boolean') {
        errors.push('verifyCertificates must be a boolean');
      } else {
        normalized.verifyCertificates = parameters.verifyCertificates;
      }
    }

    if (parameters.encoding !== undefined) {
      const validEncodings = ['utf8', 'latin1', 'binary', 'base64'];
      if (!validEncodings.includes(parameters.encoding)) {
        errors.push(`encoding must be one of: ${validEncodings.join(', ')}`);
      } else {
        normalized.encoding = parameters.encoding;
      }
    }

    if (parameters.proxy !== undefined) {
      if (typeof parameters.proxy !== 'string') {
        errors.push('proxy must be a string URL');
      } else {
        // Basic URL validation for proxy
        try {
          new URL(parameters.proxy);
          normalized.proxy = parameters.proxy;
        } catch {
          errors.push('proxy must be a valid URL (e.g., http://proxy.example.com:8080)');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      normalizedParams: normalized
    };
  }

  getDefaultParameters(): ScraperSpecificParameters {
    return {
      timeout: 30000,
      followRedirects: true,
      maxRedirects: 5,
      userAgent: 'default',
      acceptHeader: 'html',
      retryAttempts: 3,
      retryDelay: 1000,
      acceptCookies: true,
      verifyCertificates: true,
      encoding: 'utf8'
    };
  }

  getSupportedParameters(): string[] {
    return [
      'timeout',
      'followRedirects',
      'maxRedirects',
      'userAgent',
      'customUserAgent',
      'acceptHeader',
      'customAcceptHeader',
      'customHeaders',
      'retryAttempts',
      'retryDelay',
      'acceptCookies',
      'verifyCertificates',
      'encoding',
      'proxy'
    ];
  }

  /**
   * Build actual user agent string from configuration
   */
  getUserAgentString(params: any): string {
    const userAgentMap: Record<string, string> = {
      'chrome': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'firefox': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'safari': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'mobile': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
      'bot': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    };

    if (params.userAgent === 'custom') {
      return params.customUserAgent || '';
    }

    return userAgentMap[params.userAgent] || '';
  }

  /**
   * Build accept header value from configuration
   */
  getAcceptHeader(params: any): string {
    const acceptMap: Record<string, string> = {
      'html': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'json': 'application/json',
      'xml': 'application/xml,text/xml',
      'any': '*/*'
    };

    if (params.acceptHeader === 'custom') {
      return params.customAcceptHeader || '*/*';
    }

    return acceptMap[params.acceptHeader] || acceptMap['html'];
  }
}

class Crawl4AIParameterValidator extends BaseParameterValidator {
  validate(parameters: any): ParameterValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const normalized: any = {};

    // Validate base parameters
    errors.push(...this.validateBaseParameters(parameters));

    // Validate Crawl4AI-specific parameters
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

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      normalizedParams: normalized
    };
  }

  getDefaultParameters(): ScraperSpecificParameters {
    return {
      extractLinks: true,
      extractMetadata: true,
      onlyMainContent: false,
      timeout: 60000
    };
  }

  getSupportedParameters(): string[] {
    return ['extractLinks', 'extractMetadata', 'onlyMainContent', 'maxDepth', 'timeout'];
  }
}

class DoclingParameterValidator extends BaseParameterValidator {
  validate(parameters: any): ParameterValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const normalized: any = {};

    // Validate base parameters
    errors.push(...this.validateBaseParameters(parameters));

    // Validate Docling-specific parameters
    if (parameters.ocr !== undefined) {
      if (typeof parameters.ocr !== 'boolean') {
        errors.push('ocr must be a boolean');
      } else {
        normalized.ocr = parameters.ocr;
      }
    }

    if (parameters.format !== undefined) {
      const validFormats = ['json', 'markdown', 'text', 'html'];
      if (!validFormats.includes(parameters.format)) {
        errors.push(`format must be one of: ${validFormats.join(', ')}`);
      } else {
        normalized.format = parameters.format;
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      normalizedParams: normalized
    };
  }

  getDefaultParameters(): ScraperSpecificParameters {
    return {
      format: 'markdown',
      ocr: false,
      tableStructure: true,
      timeout: 60000
    };
  }

  getSupportedParameters(): string[] {
    return ['format', 'ocr', 'tableStructure', 'pageRange', 'maxPages', 'timeout'];
  }
}

// Manager for scraper parameters using dependency injection
class ScraperParameterManager {
  private validators: Map<string, IParameterValidator>;

  constructor(validators?: Map<string, IParameterValidator>) {
    this.validators = validators || new Map();
  }

  registerValidator(scraperType: string, validator: IParameterValidator): void {
    this.validators.set(scraperType, validator);
  }

  getValidator(scraperType: string): IParameterValidator | undefined {
    return this.validators.get(scraperType);
  }

  validateParameters(scraperType: string, parameters: any): ParameterValidationResult {
    const validator = this.validators.get(scraperType);
    if (!validator) {
      return { valid: false, errors: [`No validator for scraper type: ${scraperType}`] };
    }
    return validator.validate(parameters);
  }

  normalizeParameters(scraperType: string, parameters: any): ScraperSpecificParameters {
    const validator = this.validators.get(scraperType);
    if (!validator) {
      return parameters;
    }
    return validator.normalize(parameters);
  }
}

export class ParameterService implements IParameterService {
  private parameters: Map<string, ScraperConfiguration> = new Map();
  private schemas: Map<string, ScraperParameterSchema>;
  private validators: Map<string, IParameterValidator> = new Map();
  private parameterManager: ScraperParameterManager;

  constructor() {
    this.schemas = new Map();
    this.parameterManager = new ScraperParameterManager();
    this.initializeSchemas();
    this.initializeValidators();
  }

  private initializeSchemas(): void {
    // HTTP Scraper Schema
    this.schemas.set('http', {
      scraperType: 'http',
      displayName: 'HTTP Scraper',
      description: 'Basic HTTP/HTTPS requests with customizable headers and options',
      groups: [
        { name: 'request', label: 'Request Settings', description: 'HTTP request configuration' },
        { name: 'headers', label: 'Headers', description: 'Custom HTTP headers' },
        { name: 'auth', label: 'Authentication', description: 'Authentication settings' },
        { name: 'behavior', label: 'Behavior', description: 'Request behavior and handling' }
      ],
      parameters: {
        timeout: {
          name: 'timeout',
          type: 'number',
          description: 'Request timeout in milliseconds',
          default: 30000,
          min: 1000,
          max: 120000,
          group: 'request'
        },
        followRedirects: {
          name: 'followRedirects',
          type: 'boolean',
          description: 'Automatically follow HTTP redirects',
          default: true,
          group: 'behavior'
        },
        maxRedirects: {
          name: 'maxRedirects',
          type: 'number',
          description: 'Maximum number of redirects to follow',
          default: 5,
          min: 0,
          max: 20,
          group: 'behavior'
        },
        userAgent: {
          name: 'userAgent',
          type: 'select',
          description: 'User agent string for requests',
          default: 'default',
          group: 'headers',
          options: [
            { value: 'default', label: 'Default (Node.js)' },
            { value: 'chrome', label: 'Chrome Browser' },
            { value: 'firefox', label: 'Firefox Browser' },
            { value: 'safari', label: 'Safari Browser' },
            { value: 'mobile', label: 'Mobile Browser' },
            { value: 'bot', label: 'Google Bot' },
            { value: 'custom', label: 'Custom (specify below)' }
          ]
        },
        customUserAgent: {
          name: 'customUserAgent',
          type: 'string',
          description: 'Custom user agent string (when User Agent is set to Custom)',
          group: 'headers'
        },
        acceptHeader: {
          name: 'acceptHeader',
          type: 'select',
          description: 'Accept header for content type',
          default: 'html',
          group: 'headers',
          options: [
            { value: 'html', label: 'HTML (text/html)' },
            { value: 'json', label: 'JSON (application/json)' },
            { value: 'xml', label: 'XML (application/xml)' },
            { value: 'any', label: 'Any (*/*)'  },
            { value: 'custom', label: 'Custom (specify below)' }
          ]
        },
        customAcceptHeader: {
          name: 'customAcceptHeader',
          type: 'string',
          description: 'Custom Accept header value',
          group: 'headers'
        },
        customHeaders: {
          name: 'customHeaders',
          type: 'object',
          description: 'Additional custom headers as key-value pairs',
          group: 'headers',
          properties: {
            'X-API-Key': {
              name: 'X-API-Key',
              type: 'string',
              description: 'API key header'
            },
            'Authorization': {
              name: 'Authorization',
              type: 'string',
              description: 'Authorization header (e.g., Bearer token)'
            },
            'Referer': {
              name: 'Referer',
              type: 'string',
              description: 'Referer URL'
            }
          }
        },
        retryAttempts: {
          name: 'retryAttempts',
          type: 'number',
          description: 'Number of retry attempts on failure',
          default: 3,
          min: 0,
          max: 10,
          group: 'behavior'
        },
        retryDelay: {
          name: 'retryDelay',
          type: 'number',
          description: 'Delay between retries in milliseconds',
          default: 1000,
          min: 100,
          max: 10000,
          group: 'behavior'
        },
        acceptCookies: {
          name: 'acceptCookies',
          type: 'boolean',
          description: 'Accept and store cookies',
          default: true,
          group: 'behavior'
        },
        verifyCertificates: {
          name: 'verifyCertificates',
          type: 'boolean',
          description: 'Verify SSL/TLS certificates',
          default: true,
          group: 'behavior'
        },
        encoding: {
          name: 'encoding',
          type: 'select',
          description: 'Response encoding',
          default: 'utf8',
          group: 'request',
          options: [
            { value: 'utf8', label: 'UTF-8' },
            { value: 'latin1', label: 'Latin-1 (ISO-8859-1)' },
            { value: 'binary', label: 'Binary' },
            { value: 'base64', label: 'Base64' }
          ]
        },
        proxy: {
          name: 'proxy',
          type: 'string',
          description: 'HTTP proxy URL (e.g., http://proxy.example.com:8080)',
          group: 'request'
        }
      }
    });

    // Playwright Schema
    this.schemas.set('playwright', {
      scraperType: 'playwright',
      displayName: 'Playwright Browser',
      description: 'Advanced browser automation with full JavaScript support',
      groups: [
        { name: 'basic', label: 'Basic Settings', description: 'Core browser configuration' },
        { name: 'viewport', label: 'Viewport & Display', description: 'Screen and display settings' },
        { name: 'navigation', label: 'Navigation', description: 'Page load and navigation options' },
        { name: 'interaction', label: 'Interaction', description: 'User interaction simulation' },
        { name: 'capture', label: 'Capture', description: 'Screenshot and PDF generation' },
        { name: 'auth', label: 'Authentication', description: 'Credentials and cookies' },
        { name: 'advanced', label: 'Advanced', description: 'Performance and debugging' }
      ],
      parameters: {
        headless: {
          name: 'headless',
          type: 'boolean',
          description: 'Run browser in headless mode (no UI)',
          default: true,
          group: 'basic'
        },
        viewport: {
          name: 'viewport',
          type: 'object',
          description: 'Browser viewport dimensions',
          group: 'viewport',
          properties: {
            width: {
              name: 'width',
              type: 'number',
              description: 'Viewport width in pixels',
              default: 1280,
              min: 320,
              max: 3840
            },
            height: {
              name: 'height',
              type: 'number',
              description: 'Viewport height in pixels',
              default: 720,
              min: 240,
              max: 2160
            }
          }
        },
        waitUntil: {
          name: 'waitUntil',
          type: 'select',
          description: 'When to consider navigation complete',
          default: 'networkidle',
          group: 'navigation',
          options: [
            { value: 'load', label: 'Load - Page load event fired' },
            { value: 'domcontentloaded', label: 'DOM Ready - DOM content loaded' },
            { value: 'networkidle', label: 'Network Idle - No network activity' },
            { value: 'commit', label: 'Commit - Initial navigation committed' }
          ]
        },
        timeout: {
          name: 'timeout',
          type: 'number',
          description: 'Navigation timeout in milliseconds',
          default: 30000,
          min: 5000,
          max: 120000,
          group: 'navigation'
        },
        javaScriptEnabled: {
          name: 'javaScriptEnabled',
          type: 'boolean',
          description: 'Enable JavaScript execution',
          default: true,
          group: 'basic'
        },
        bypassCSP: {
          name: 'bypassCSP',
          type: 'boolean',
          description: 'Bypass Content Security Policy',
          default: false,
          group: 'advanced'
        },
        ignoreHTTPSErrors: {
          name: 'ignoreHTTPSErrors',
          type: 'boolean',
          description: 'Ignore HTTPS certificate errors',
          default: false,
          group: 'advanced'
        },
        screenshot: {
          name: 'screenshot',
          type: 'boolean',
          description: 'Capture screenshot after loading',
          default: false,
          group: 'capture'
        },
        pdf: {
          name: 'pdf',
          type: 'boolean',
          description: 'Generate PDF of the page',
          default: false,
          group: 'capture'
        },
        waitForSelector: {
          name: 'waitForSelector',
          type: 'string',
          description: 'CSS selector to wait for before continuing',
          group: 'interaction'
        },
        scrollToBottom: {
          name: 'scrollToBottom',
          type: 'boolean',
          description: 'Scroll to bottom to load lazy content',
          default: false,
          group: 'interaction'
        },
        userAgent: {
          name: 'userAgent',
          type: 'string',
          description: 'Custom user agent string',
          group: 'basic'
        },
        locale: {
          name: 'locale',
          type: 'string',
          description: 'Browser locale (e.g., en-US)',
          default: 'en-US',
          group: 'viewport'
        },
        timezone: {
          name: 'timezone',
          type: 'string',
          description: 'Browser timezone (e.g., America/New_York)',
          group: 'viewport'
        },
        deviceScaleFactor: {
          name: 'deviceScaleFactor',
          type: 'number',
          description: 'Device scale factor for high-DPI screens',
          default: 1,
          min: 1,
          max: 3,
          group: 'viewport'
        },
        isMobile: {
          name: 'isMobile',
          type: 'boolean',
          description: 'Emulate mobile device',
          default: false,
          group: 'viewport'
        },
        hasTouch: {
          name: 'hasTouch',
          type: 'boolean',
          description: 'Enable touch events',
          default: false,
          group: 'viewport'
        },
        slowMo: {
          name: 'slowMo',
          type: 'number',
          description: 'Slow down operations by milliseconds',
          default: 0,
          min: 0,
          max: 1000,
          group: 'advanced'
        }
      }
    });

    // Crawl4AI Schema
    this.schemas.set('crawl4ai', {
      scraperType: 'crawl4ai',
      displayName: 'Crawl4AI',
      description: 'AI-powered content extraction with intelligent processing',
      groups: [
        { name: 'crawling', label: 'Crawling', description: 'Crawling behavior settings' },
        { name: 'extraction', label: 'Extraction', description: 'Content extraction options' },
        { name: 'filtering', label: 'Filtering', description: 'Content filtering rules' },
        { name: 'performance', label: 'Performance', description: 'Performance and caching' },
        { name: 'advanced', label: 'Advanced', description: 'Advanced AI features' }
      ],
      parameters: {
        maxDepth: {
          name: 'maxDepth',
          type: 'number',
          description: 'Maximum crawl depth for links',
          default: 1,
          min: 0,
          max: 10,
          group: 'crawling'
        },
        jsExecution: {
          name: 'jsExecution',
          type: 'boolean',
          description: 'Execute JavaScript on pages',
          default: true,
          group: 'crawling'
        },
        extractionStrategy: {
          name: 'extractionStrategy',
          type: 'select',
          description: 'Content extraction strategy',
          default: 'cosine',
          group: 'extraction',
          options: [
            { value: 'cosine', label: 'Cosine Similarity' },
            { value: 'llm', label: 'LLM-based Extraction' },
            { value: 'regex', label: 'Regular Expression' },
            { value: 'xpath', label: 'XPath Selector' },
            { value: 'css', label: 'CSS Selector' }
          ]
        },
        onlyMainContent: {
          name: 'onlyMainContent',
          type: 'boolean',
          description: 'Extract only main article content',
          default: true,
          group: 'extraction'
        },
        wordCountThreshold: {
          name: 'wordCountThreshold',
          type: 'number',
          description: 'Minimum word count for content blocks',
          default: 50,
          min: 0,
          max: 500,
          group: 'filtering'
        },
        removeOverlay: {
          name: 'removeOverlay',
          type: 'boolean',
          description: 'Remove overlays and popups',
          default: true,
          group: 'filtering'
        },
        removeForms: {
          name: 'removeForms',
          type: 'boolean',
          description: 'Remove form elements',
          default: false,
          group: 'filtering'
        },
        removeNav: {
          name: 'removeNav',
          type: 'boolean',
          description: 'Remove navigation elements',
          default: false,
          group: 'filtering'
        },
        bypassCache: {
          name: 'bypassCache',
          type: 'boolean',
          description: 'Skip cached content',
          default: false,
          group: 'performance'
        },
        cacheMode: {
          name: 'cacheMode',
          type: 'select',
          description: 'Cache behavior mode',
          default: 'enabled',
          group: 'performance',
          options: [
            { value: 'enabled', label: 'Enabled - Use cache normally' },
            { value: 'disabled', label: 'Disabled - No caching' },
            { value: 'bypass', label: 'Bypass - Skip cache for read' },
            { value: 'write_only', label: 'Write Only - Update cache only' },
            { value: 'read_only', label: 'Read Only - Read cache only' }
          ]
        },
        magic: {
          name: 'magic',
          type: 'boolean',
          description: 'Enable AI magic mode for best results',
          default: false,
          group: 'advanced'
        },
        antiBot: {
          name: 'antiBot',
          type: 'boolean',
          description: 'Enable anti-bot detection bypass',
          default: false,
          group: 'advanced'
        },
        screenshot: {
          name: 'screenshot',
          type: 'boolean',
          description: 'Capture page screenshot',
          default: false,
          group: 'extraction'
        },
        verbose: {
          name: 'verbose',
          type: 'boolean',
          description: 'Enable verbose logging',
          default: false,
          group: 'advanced'
        },
        delayBefore: {
          name: 'delayBefore',
          type: 'number',
          description: 'Delay before processing (ms)',
          default: 0,
          min: 0,
          max: 10000,
          group: 'performance'
        },
        delayAfter: {
          name: 'delayAfter',
          type: 'number',
          description: 'Delay after processing (ms)',
          default: 0,
          min: 0,
          max: 10000,
          group: 'performance'
        },
        maxPages: {
          name: 'maxPages',
          type: 'number',
          description: 'Maximum pages to crawl',
          default: 10,
          min: 1,
          max: 1000,
          group: 'crawling'
        }
      }
    });

    // Docling Schema
    this.schemas.set('docling', {
      scraperType: 'docling',
      displayName: 'Docling PDF Processor',
      description: 'Advanced document processing with OCR and structure extraction',
      groups: [
        { name: 'format', label: 'Format', description: 'Output format settings' },
        { name: 'ocr', label: 'OCR', description: 'Optical character recognition' },
        { name: 'extraction', label: 'Extraction', description: 'Content extraction options' },
        { name: 'processing', label: 'Processing', description: 'Document processing options' },
        { name: 'quality', label: 'Quality', description: 'Quality and enhancement settings' }
      ],
      parameters: {
        format: {
          name: 'format',
          type: 'select',
          description: 'Output format for extracted content',
          default: 'markdown',
          group: 'format',
          options: [
            { value: 'json', label: 'JSON - Structured data' },
            { value: 'markdown', label: 'Markdown - Formatted text' },
            { value: 'text', label: 'Plain Text' },
            { value: 'html', label: 'HTML - Web format' }
          ]
        },
        ocr: {
          name: 'ocr',
          type: 'boolean',
          description: 'Enable OCR for scanned documents',
          default: false,
          group: 'ocr'
        },
        ocrEngine: {
          name: 'ocrEngine',
          type: 'select',
          description: 'OCR engine to use',
          default: 'tesseract',
          group: 'ocr',
          options: [
            { value: 'tesseract', label: 'Tesseract - Open source' },
            { value: 'easyocr', label: 'EasyOCR - Deep learning' },
            { value: 'paddleocr', label: 'PaddleOCR - High accuracy' }
          ]
        },
        tableStructure: {
          name: 'tableStructure',
          type: 'boolean',
          description: 'Extract and preserve table structure',
          default: true,
          group: 'extraction'
        },
        exportFigures: {
          name: 'exportFigures',
          type: 'boolean',
          description: 'Extract embedded figures',
          default: false,
          group: 'extraction'
        },
        exportTables: {
          name: 'exportTables',
          type: 'boolean',
          description: 'Extract tables separately',
          default: false,
          group: 'extraction'
        },
        extractFormFields: {
          name: 'extractFormFields',
          type: 'boolean',
          description: 'Extract PDF form fields',
          default: false,
          group: 'extraction'
        },
        extractAnnotations: {
          name: 'extractAnnotations',
          type: 'boolean',
          description: 'Extract PDF annotations',
          default: false,
          group: 'extraction'
        },
        documentType: {
          name: 'documentType',
          type: 'select',
          description: 'Document type for specialized processing',
          default: 'auto',
          group: 'processing',
          options: [
            { value: 'auto', label: 'Auto-detect' },
            { value: 'pdf', label: 'PDF Document' },
            { value: 'docx', label: 'Word Document' },
            { value: 'pptx', label: 'PowerPoint' },
            { value: 'xlsx', label: 'Excel Spreadsheet' },
            { value: 'image', label: 'Image File' },
            { value: 'html', label: 'HTML Document' }
          ]
        },
        maxPages: {
          name: 'maxPages',
          type: 'number',
          description: 'Maximum pages to process',
          default: 100,
          min: 1,
          max: 1000,
          group: 'processing'
        },
        dpi: {
          name: 'dpi',
          type: 'number',
          description: 'DPI for image processing',
          default: 300,
          min: 72,
          max: 600,
          group: 'quality'
        },
        binarize: {
          name: 'binarize',
          type: 'boolean',
          description: 'Convert to black and white for OCR',
          default: false,
          group: 'quality'
        },
        removeWatermarks: {
          name: 'removeWatermarks',
          type: 'boolean',
          description: 'Attempt to remove watermarks',
          default: false,
          group: 'quality'
        },
        enhanceScannedText: {
          name: 'enhanceScannedText',
          type: 'boolean',
          description: 'Enhance quality of scanned text',
          default: false,
          group: 'quality'
        },
        mergePages: {
          name: 'mergePages',
          type: 'boolean',
          description: 'Merge content across pages',
          default: false,
          group: 'processing'
        },
        splitBySection: {
          name: 'splitBySection',
          type: 'boolean',
          description: 'Split output by document sections',
          default: false,
          group: 'processing'
        }
      }
    });

    // DeepDoctection Schema
    this.schemas.set('deepdoctection', {
      scraperType: 'deepdoctection',
      displayName: 'Deep Doctection',
      description: 'Deep learning-based document layout analysis',
      groups: [
        { name: 'analysis', label: 'Analysis', description: 'Document analysis settings' },
        { name: 'detection', label: 'Detection', description: 'Content detection options' },
        { name: 'ocr', label: 'OCR', description: 'Text recognition settings' },
        { name: 'output', label: 'Output', description: 'Output configuration' }
      ],
      parameters: {
        analyzerType: {
          name: 'analyzerType',
          type: 'select',
          description: 'Type of document analysis',
          default: 'auto',
          group: 'analysis',
          options: [
            { value: 'auto', label: 'Auto-detect best analyzer' },
            { value: 'layout', label: 'Layout Analysis' },
            { value: 'table', label: 'Table Detection' },
            { value: 'full', label: 'Full Analysis' }
          ]
        },
        ocr: {
          name: 'ocr',
          type: 'boolean',
          description: 'Enable OCR for text extraction',
          default: false,
          group: 'ocr'
        },
        ocrEngine: {
          name: 'ocrEngine',
          type: 'select',
          description: 'OCR engine to use',
          default: 'tesseract',
          group: 'ocr',
          options: [
            { value: 'tesseract', label: 'Tesseract' },
            { value: 'easyocr', label: 'EasyOCR' },
            { value: 'paddleocr', label: 'PaddleOCR' }
          ]
        },
        tableDetection: {
          name: 'tableDetection',
          type: 'boolean',
          description: 'Detect and extract tables',
          default: true,
          group: 'detection'
        },
        layoutDetection: {
          name: 'layoutDetection',
          type: 'boolean',
          description: 'Analyze document layout',
          default: true,
          group: 'detection'
        },
        figureDetection: {
          name: 'figureDetection',
          type: 'boolean',
          description: 'Detect figures and images',
          default: false,
          group: 'detection'
        },
        formulaDetection: {
          name: 'formulaDetection',
          type: 'boolean',
          description: 'Detect mathematical formulas',
          default: false,
          group: 'detection'
        },
        outputFormat: {
          name: 'outputFormat',
          type: 'select',
          description: 'Output format',
          default: 'json',
          group: 'output',
          options: [
            { value: 'json', label: 'JSON' },
            { value: 'markdown', label: 'Markdown' },
            { value: 'text', label: 'Plain Text' },
            { value: 'html', label: 'HTML' }
          ]
        },
        extractImages: {
          name: 'extractImages',
          type: 'boolean',
          description: 'Extract embedded images',
          default: false,
          group: 'output'
        },
        confidenceThreshold: {
          name: 'confidenceThreshold',
          type: 'number',
          description: 'Minimum confidence score',
          default: 0.5,
          min: 0,
          max: 1,
          group: 'analysis'
        },
        maxPages: {
          name: 'maxPages',
          type: 'number',
          description: 'Maximum pages to process',
          default: 50,
          min: 1,
          max: 500,
          group: 'analysis'
        },
        useGPU: {
          name: 'useGPU',
          type: 'boolean',
          description: 'Use GPU acceleration if available',
          default: false,
          group: 'analysis'
        }
      }
    });
  }

  getParameterSchema(scraperType: string): ScraperParameterSchema | null {
    // Handle 'default' as an alias for 'http'
    const effectiveScraperType = scraperType === 'default' ? 'http' : scraperType;
    return this.schemas.get(effectiveScraperType) || null;
  }

  getAllParameterSchemas(): ScraperParameterSchema[] {
    return Array.from(this.schemas.values());
  }

  validateParameters(scraperType: string, parameters: any): ParameterValidationResult {
    try {
      // Handle 'default' as an alias for 'http'
      const effectiveScraperType = scraperType === 'default' ? 'http' : scraperType;

      // Simple validation based on schema
      const schema = this.getParameterSchema(effectiveScraperType);
      if (!schema) {
        return {
          valid: false,
          errors: [`Unknown scraper type: ${scraperType}`]
        };
      }

      const errors: string[] = [];
      const normalizedParams: any = {};

    // Basic validation for known scrapers
    if (effectiveScraperType === 'playwright') {
      if (parameters.timeout !== undefined && typeof parameters.timeout !== 'number') {
        errors.push('timeout must be a number');
      }
      if (parameters.headless !== undefined && typeof parameters.headless !== 'boolean') {
        errors.push('headless must be a boolean');
      }
      Object.assign(normalizedParams, parameters);
    } else if (effectiveScraperType === 'crawl4ai') {
      if (parameters.maxDepth !== undefined && typeof parameters.maxDepth !== 'number') {
        errors.push('maxDepth must be a number');
      }
      Object.assign(normalizedParams, parameters);
    } else if (effectiveScraperType === 'docling') {
      if (parameters.maxPages !== undefined && typeof parameters.maxPages !== 'number') {
        errors.push('maxPages must be a number');
      }
      Object.assign(normalizedParams, parameters);
    } else {
      Object.assign(normalizedParams, parameters);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      normalizedParams
    };
    } catch (error) {
      throw new Error(`Failed to validate parameters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getDefaultParameters(scraperType: string): ScraperSpecificParameters | null {
    const defaults: Record<string, any> = {
      playwright: {
        headless: true,
        viewport: { width: 1280, height: 720 },
        waitUntil: 'networkidle',
        timeout: 30000,
        javaScriptEnabled: true
      },
      crawl4ai: {
        maxDepth: 1,
        jsExecution: true,
        wordCountThreshold: 50,
        removeOverlay: true,
        timeout: 30000
      },
      docling: {
        format: 'markdown',
        ocr: false,
        tableStructure: true,
        documentType: 'auto',
        timeout: 60000
      },
      deepdoctection: {
        analyzerType: 'auto',
        ocr: false,
        tableDetection: true,
        layoutDetection: true,
        outputFormat: 'json'
      }
    };

    return defaults[scraperType] || null;
  }

  getSupportedParameters(scraperType: string): string[] {
    const schema = this.getParameterSchema(scraperType);
    if (!schema) return [];
    return Object.keys(schema.parameters);
  }

  setUrlParameters(url: string, config: ScraperConfiguration): void {
    this.parameters.set(url, config);
  }

  getUrlParameters(url: string): ScraperConfiguration | null {
    return this.parameters.get(url) || null;
  }

  setBatchParameters(batch: BatchScraperConfiguration): void {
    for (const url of batch.urls) {
      if (batch.overrideExisting || !this.parameters.has(url)) {
        this.parameters.set(url, batch.configuration);
      }
    }
  }

  /**
   * Convert parameters to flat structure for storage
   */
  flattenParameters(parameters: any): Record<string, any> {
    const flat: Record<string, any> = {};

    const flatten = (obj: any, prefix = '') => {
      for (const key in obj) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          flatten(value, newKey);
        } else {
          flat[newKey] = value;
        }
      }
    };

    flatten(parameters);
    return flat;
  }

  /**
   * Convert flat parameters back to nested structure
   */
  unflattenParameters(flat: Record<string, any>): any {
    const result: any = {};

    for (const key in flat) {
      const parts = key.split('.');
      let current = result;

      for (let i = 0; i < parts.length - 1; i++) {
        if (!(parts[i] in current)) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }

      current[parts[parts.length - 1]] = flat[key];
    }

    return result;
  }

  /**
   * Initialize validators for each scraper type
   */
  private initializeValidators(): void {
    const httpValidator = new HttpParameterValidator();
    const playwrightValidator = new PlaywrightParameterValidator();
    const crawl4aiValidator = new Crawl4AIParameterValidator();
    const doclingValidator = new DoclingParameterValidator();

    // Register with both collections
    this.validators.set('http', httpValidator);
    this.validators.set('playwright', playwrightValidator);
    this.validators.set('crawl4ai', crawl4aiValidator);
    this.validators.set('docling', doclingValidator);

    this.parameterManager.registerValidator('http', httpValidator);
    this.parameterManager.registerValidator('playwright', playwrightValidator);
    this.parameterManager.registerValidator('crawl4ai', crawl4aiValidator);
    this.parameterManager.registerValidator('docling', doclingValidator);
  }

  /**
   * Register a new validator for extensibility
   */
  registerValidator(scraperType: string, validator: IParameterValidator): void {
    this.validators.set(scraperType, validator);
  }
}