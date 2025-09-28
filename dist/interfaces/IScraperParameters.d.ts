/**
 * Interface Segregation Principle: Separate interfaces for different scraper parameters
 * Single Responsibility: Each interface represents configuration for one scraper type
 */
/**
 * Base scraper parameters common to all scrapers
 */
export interface BaseScraperParameters {
    timeout?: number;
    retries?: number;
    userAgent?: string;
    headers?: Record<string, string>;
    proxy?: ProxySettings;
    customMetadata?: Record<string, any>;
}
/**
 * Proxy settings for scrapers
 */
export interface ProxySettings {
    server: string;
    username?: string;
    password?: string;
    bypass?: string[];
}
/**
 * Playwright-specific parameters
 */
export interface PlaywrightParameters extends BaseScraperParameters {
    headless?: boolean;
    viewport?: {
        width: number;
        height: number;
    };
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
    bypassCSP?: boolean;
    ignoreHTTPSErrors?: boolean;
    javaScriptEnabled?: boolean;
    screenshot?: boolean | ScreenshotOptions;
    pdf?: boolean | PDFOptions;
    cookies?: Cookie[];
    waitForSelector?: string;
    waitForFunction?: string;
    scrollToBottom?: boolean;
    clickSelectors?: string[];
    extraHttpHeaders?: Record<string, string>;
    locale?: string;
    timezone?: string;
    geolocation?: {
        latitude: number;
        longitude: number;
        accuracy?: number;
    };
    permissions?: string[];
    offline?: boolean;
    httpCredentials?: {
        username: string;
        password: string;
    };
    deviceScaleFactor?: number;
    isMobile?: boolean;
    hasTouch?: boolean;
    slowMo?: number;
    videosPath?: string;
    recordVideo?: boolean;
}
/**
 * Screenshot options for Playwright
 */
export interface ScreenshotOptions {
    fullPage?: boolean;
    type?: 'png' | 'jpeg';
    quality?: number;
    path?: string;
    clip?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    omitBackground?: boolean;
}
/**
 * PDF generation options for Playwright
 */
export interface PDFOptions {
    path?: string;
    scale?: number;
    displayHeaderFooter?: boolean;
    headerTemplate?: string;
    footerTemplate?: string;
    printBackground?: boolean;
    landscape?: boolean;
    pageRanges?: string;
    format?: 'Letter' | 'Legal' | 'Tabloid' | 'Ledger' | 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6';
    width?: string | number;
    height?: string | number;
    margin?: {
        top?: string | number;
        right?: string | number;
        bottom?: string | number;
        left?: string | number;
    };
    preferCSSPageSize?: boolean;
}
/**
 * Cookie interface for Playwright
 */
export interface Cookie {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
}
/**
 * Crawl4AI-specific parameters
 */
export interface Crawl4AIParameters extends BaseScraperParameters {
    maxDepth?: number;
    jsExecution?: boolean;
    useProxy?: boolean;
    waitFor?: string;
    extractionStrategy?: 'cosine' | 'llm' | 'regex' | 'xpath' | 'css';
    chunkingStrategy?: ChunkingStrategy;
    contentFilter?: ContentFilter;
    bypassCache?: boolean;
    cssSelector?: string;
    excludedTags?: string[];
    wordCountThreshold?: number;
    removeOverlay?: boolean;
    screenshot?: boolean;
    sessionId?: string;
    magic?: boolean;
    onlyMainContent?: boolean;
    removeForms?: boolean;
    removeNav?: boolean;
    socialMediaLinks?: boolean;
    antiBot?: boolean;
    cacheMode?: 'enabled' | 'disabled' | 'bypass' | 'write_only' | 'read_only';
    delayBefore?: number;
    delayAfter?: number;
    pageTimeout?: number;
    verbose?: boolean;
    excludeExternalLinks?: boolean;
    excludeInternalLinks?: boolean;
    excludeDomains?: string[];
    includeDomains?: string[];
    maxPages?: number;
    baseUrl?: string;
}
/**
 * Chunking strategy for Crawl4AI
 */
export interface ChunkingStrategy {
    type: 'fixed' | 'semantic' | 'sliding_window' | 'topic_based' | 'regex';
    chunkSize?: number;
    chunkOverlap?: number;
    separators?: string[];
    topicThreshold?: number;
    regexPattern?: string;
}
/**
 * Content filter for Crawl4AI
 */
export interface ContentFilter {
    type: 'keyword' | 'length' | 'css' | 'xpath' | 'regex';
    keywords?: string[];
    minLength?: number;
    maxLength?: number;
    selector?: string;
    pattern?: string;
    includeOnly?: boolean;
}
/**
 * Docling-specific parameters
 */
export interface DoclingParameters extends BaseScraperParameters {
    format?: 'json' | 'markdown' | 'text' | 'html';
    ocr?: boolean;
    ocrEngine?: 'tesseract' | 'easyocr' | 'paddleocr';
    tableStructure?: boolean;
    exportFigures?: boolean;
    exportTables?: boolean;
    exportPageImages?: boolean;
    pageRange?: [number, number];
    documentType?: 'auto' | 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'image' | 'html';
    maxPages?: number;
    languages?: string[];
    tableFormat?: 'markdown' | 'html' | 'csv' | 'json';
    figureFormat?: 'png' | 'jpg' | 'svg';
    extractFormFields?: boolean;
    extractAnnotations?: boolean;
    extractBookmarks?: boolean;
    extractEmbeddedFiles?: boolean;
    dpi?: number;
    binarize?: boolean;
    removeWatermarks?: boolean;
    enhanceScannedText?: boolean;
    mergePages?: boolean;
    splitBySection?: boolean;
    chunkSize?: number;
    overlapSize?: number;
    qualityThreshold?: number;
    pipeline?: DoclingPipeline[];
}
/**
 * Docling pipeline configuration
 */
export interface DoclingPipeline {
    stage: 'preprocessing' | 'extraction' | 'postprocessing';
    operation: string;
    params?: Record<string, any>;
}
/**
 * Union type for all scraper parameters
 */
export type ScraperSpecificParameters = PlaywrightParameters | Crawl4AIParameters | DoclingParameters;
/**
 * Complete scraper configuration including base and specific parameters
 */
export interface ScraperConfiguration {
    scraperType: 'playwright' | 'crawl4ai' | 'docling' | 'http' | 'deepdoctection';
    parameters: ScraperSpecificParameters;
    urlPattern?: string | RegExp;
    priority?: number;
    enabled?: boolean;
}
/**
 * Batch configuration for multiple URLs
 */
export interface BatchScraperConfiguration {
    urls: string[];
    configuration: ScraperConfiguration;
    overrideExisting?: boolean;
}
/**
 * Parameter validation result
 */
export interface ParameterValidationResult {
    valid: boolean;
    errors?: string[];
    warnings?: string[];
    normalizedParams?: ScraperSpecificParameters;
}
/**
 * Interface for parameter validators
 * Single Responsibility: Validate scraper parameters
 */
export interface IParameterValidator {
    validate(parameters: any): ParameterValidationResult;
    normalize(parameters: any): ScraperSpecificParameters;
    getDefaultParameters(): ScraperSpecificParameters;
    getSupportedParameters(): string[];
}
/**
 * Interface for parameter storage
 * Single Responsibility: Store and retrieve scraper parameters
 */
export interface IParameterStorage {
    saveParameters(url: string, params: ScraperConfiguration): Promise<void>;
    getParameters(url: string): Promise<ScraperConfiguration | null>;
    saveParametersBatch(configs: BatchScraperConfiguration[]): Promise<void>;
    getParametersBatch(urls: string[]): Promise<Map<string, ScraperConfiguration>>;
    deleteParameters(url: string): Promise<void>;
    deleteParametersBatch(urls: string[]): Promise<void>;
    getAllParameters(): Promise<Map<string, ScraperConfiguration>>;
}
/**
 * Interface for parameter manager
 * Single Responsibility: Manage scraper parameters lifecycle
 */
export interface IParameterManager {
    setParameters(url: string, config: ScraperConfiguration): void;
    getParameters(url: string): ScraperConfiguration | null;
    setBatchParameters(batch: BatchScraperConfiguration): void;
    getBatchParameters(urls: string[]): Map<string, ScraperConfiguration>;
    validateParameters(scraperType: string, params: any): ParameterValidationResult;
    mergeWithDefaults(scraperType: string, params: any): ScraperSpecificParameters;
    clearParameters(url?: string): void;
    exportParameters(): Map<string, ScraperConfiguration>;
    importParameters(params: Map<string, ScraperConfiguration>): void;
}
//# sourceMappingURL=IScraperParameters.d.ts.map