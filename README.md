# Knowledge Base System - SOLID Principles Implementation

A comprehensive knowledge base system built following SOLID principles for scalable content management and processing.

## Architecture Overview

This system is designed with clear separation of concerns and follows SOLID principles:

### SOLID Principles Applied

1. **Single Responsibility Principle (SRP)**
   - Each class has a single, well-defined purpose
   - URL detectors handle only URL classification
   - Content fetchers handle only content retrieval
   - Content processors handle only content processing

2. **Open/Closed Principle (OCP)**
   - System is open for extension (new URL types, processors)
   - Closed for modification (core interfaces remain stable)
   - Plugin-based architecture for new content types

3. **Liskov Substitution Principle (LSP)**
   - All implementations can be substituted for their base interfaces
   - Consistent behavior across all content fetchers and processors

4. **Interface Segregation Principle (ISP)**
   - Small, focused interfaces rather than large general ones
   - Clients depend only on interfaces they use

5. **Dependency Inversion Principle (DIP)**
   - High-level modules don't depend on low-level modules
   - Both depend on abstractions (interfaces)
   - Dependency injection throughout the system

## Project Structure

```
kb3/
├── src/
│   ├── interfaces/          # Abstract interfaces and contracts
│   ├── detectors/           # URL type detection and classification
│   ├── fetchers/            # Content retrieval from various sources
│   ├── scrapers/            # Scraping library implementations
│   ├── processors/          # Content processing for different types
│   ├── storage/             # Knowledge store and file storage
│   ├── orchestrator/        # Main coordination logic
│   ├── factory/             # Dependency injection and object creation
│   ├── config/              # Configuration management
│   └── utils/               # Utility functions and helpers
├── tests/                   # Comprehensive test suite
│   ├── solid-compliance/    # SOLID principle compliance tests
│   ├── integration/         # Integration tests
│   └── unit/                # Unit tests
├── data/                    # Runtime data storage
├── test-data/               # Test fixtures and samples
├── demo-data/               # Demo data for examples
├── dev-data/                # Development data
├── verify-data/             # Verification test data
├── examples/                # Sample usage and configurations
└── docs/                    # Additional documentation
```

## Key Features

- **Scalable URL Classification**: Extensible system for detecting and classifying different URL types
- **Multiple Scraping Libraries**: Support for various scraping tools (HTTP, Playwright, Crawl4AI, Firecrawl, Docling, DeepDoctection)
- **Advanced Parameter Configuration**: Set detailed parameters for each scraper per URL or in batch
- **Modular Content Fetching**: Support for various content sources (web, local files, APIs)
- **Flexible Content Processing**: Pluggable processors for different file types
- **Robust Error Handling**: Comprehensive error handling and graceful degradation
- **Dynamic Content Detection**: Content type detection beyond file extensions
- **Scraper Selection & Tracking**: Configure which scraper to use per URL and track in database
- **Batch Configuration Management**: Configure multiple URLs at once with presets or custom settings
- **Persistent Settings**: All scraper configurations stored in database with full metadata
- **Comprehensive Testing**: Full test coverage ensuring SOLID compliance

## Usage

### Basic Usage

```typescript
import { KnowledgeBaseFactory } from './src/factory/KnowledgeBaseFactory';
import { createDefaultConfiguration } from './src/config/Configuration';

const config = createDefaultConfiguration();
const kb = KnowledgeBaseFactory.createKnowledgeBase(config);

// Process a URL
const result = await kb.processUrl('https://example.com/document.pdf');
console.log('Processing result:', result);
```

### Configuring Scraping Libraries

The system supports multiple scraping libraries with comprehensive parameter configuration:

#### Available Scrapers

1. **HTTP (Default)** - Basic HTTP fetcher for static content
2. **Playwright** - Full browser automation with JavaScript rendering
   - Supports: screenshots, PDFs, viewport settings, cookies, geolocation, etc.
3. **Crawl4AI** - AI-powered content extraction and crawling
   - Supports: extraction strategies (LLM, cosine), chunking, content filtering, sessions
4. **Firecrawl** - API-based scraping (requires API key)
5. **Docling** - Advanced document extraction (PDF, DOCX, PPTX, XLSX)
   - Supports: OCR, table/figure extraction, annotations, bookmarks
6. **DeepDoctection** - Deep document analysis with OCR

#### Setting Scraper Parameters

##### Finding Available Parameters

Each scraper has extensive configuration options. To discover what parameters are available:

1. **TypeScript IntelliSense**: The system provides full type definitions
2. **Parameter Interfaces**: Check `src/interfaces/IScraperParameters.ts` for all available options
3. **Documentation**: See the parameter reference below

##### Parameter Configuration Methods

There are multiple ways to configure scraper parameters:

###### 1. URL-Specific Parameters

```typescript
const config = createDefaultConfiguration({
  scraping: {
    enabledScrapers: ['http', 'playwright', 'docling'],
    defaultScraper: 'http',
    scraperRules: [
      // Use Playwright for single-page applications
      {
        pattern: '*.app.example.com/*',
        scraperName: 'playwright',
        priority: 10
      },
      // Use Docling for PDF files
      {
        pattern: /\.pdf$/,
        scraperName: 'docling',
        priority: 20
      },
      // Use Playwright for specific domains
      {
        pattern: 'github.com',
        scraperName: 'playwright',
        priority: 15
      }
    ]
  }
});

const kb = KnowledgeBaseFactory.createKnowledgeBase(config);
```

##### 2. Batch Configuration

```typescript
// Configure multiple URLs at once
const kb = KnowledgeBaseFactory.createKnowledgeBase(config);

// If you have access to the scraper selector (advanced usage)
const fetcher = kb as any; // Type casting for demonstration
if (fetcher.contentFetcher?.getScraperSelector) {
  const selector = fetcher.contentFetcher.getScraperSelector();

  // Set scraper for multiple URLs
  selector.setScraperForUrls(
    ['https://site1.com', 'https://site2.com', 'https://site3.com'],
    'crawl4ai',
    10 // priority
  );
}
```

###### 2. Pattern-based Rules with Parameters

```typescript
const config = createDefaultConfiguration({
  scraping: {
    enabledScrapers: ['http', 'playwright', 'firecrawl'],
    scraperRules: [
      // Wildcard patterns
      { pattern: '*.linkedin.com/*', scraperName: 'playwright', priority: 10 },

      // Regular expression patterns
      { pattern: /^https:\/\/api\..*\.com/, scraperName: 'firecrawl', priority: 15 },

      // Exact match
      { pattern: 'https://example.com/specific-page', scraperName: 'playwright', priority: 20 }
    ],
    scraperConfigs: {
      firecrawl: {
        apiKey: process.env.FIRECRAWL_API_KEY
      }
    }
  }
});
```

###### 3. Batch Parameter Configuration

```typescript
import { ScraperAwareContentFetcher } from './src/fetchers/ScraperAwareContentFetcher';
import { BatchConfigurationManager } from './src/scrapers/BatchConfigurationManager';
import { ScraperParameterManager } from './src/scrapers/ScraperParameterManager';

const kb = KnowledgeBaseFactory.createKnowledgeBase(config);
const fetcher = (kb as any).contentFetcher as ScraperAwareContentFetcher;
const paramManager = fetcher.getParameterManager();
const batchManager = new BatchConfigurationManager(paramManager, fetcher.getScraperSelector());

// Configure all PDFs with Docling parameters
batchManager.createConfigurationBuilder()
  .forScraper('docling')
  .withParameters({
    format: 'markdown',
    ocr: true,
    ocrEngine: 'tesseract',
    tableStructure: true,
    exportTables: true
  })
  .withPriority(25)
  .applyToExtension('.pdf');

// Configure a domain with Playwright parameters
batchManager.createConfigurationBuilder()
  .forScraper('playwright')
  .withParameters({
    headless: true,
    viewport: { width: 1920, height: 1080 },
    waitUntil: 'networkidle',
    screenshot: true,
    scrollToBottom: true
  })
  .applyToDomain('example.com');

// Apply preset configurations
batchManager.applyPreset('aggressive-crawl', ['https://news.site.com']);
batchManager.applyPreset('spa-rendering', ['https://app.example.com']);
```

#### Complete Parameter Reference

##### Playwright Parameters

```typescript
interface PlaywrightParameters {
  // Browser Settings
  headless?: boolean;              // Run browser in headless mode
  slowMo?: number;                  // Slow down operations by ms

  // Viewport
  viewport?: {
    width: number;
    height: number;
  };
  deviceScaleFactor?: number;       // Device scale factor (1-3)
  isMobile?: boolean;               // Emulate mobile device
  hasTouch?: boolean;               // Enable touch events

  // Navigation
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  timeout?: number;                 // Navigation timeout in ms

  // Content Interaction
  waitForSelector?: string;         // CSS selector to wait for
  waitForFunction?: string;         // JS function to wait for
  scrollToBottom?: boolean;         // Scroll to page bottom
  clickSelectors?: string[];        // Elements to click before capture

  // JavaScript
  javaScriptEnabled?: boolean;      // Enable JavaScript execution
  bypassCSP?: boolean;              // Bypass Content Security Policy

  // Network
  ignoreHTTPSErrors?: boolean;      // Ignore HTTPS errors
  offline?: boolean;                // Emulate offline mode
  proxy?: {
    server: string;                 // Proxy server URL
    username?: string;
    password?: string;
    bypass?: string[];              // Domains to bypass proxy
  };
  extraHttpHeaders?: Record<string, string>;
  httpCredentials?: {
    username: string;
    password: string;
  };

  // Cookies
  cookies?: Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }>;

  // Geolocation
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  permissions?: string[];           // Browser permissions to grant

  // Localization
  locale?: string;                  // Browser locale (e.g., 'en-US')
  timezone?: string;                // Timezone (e.g., 'America/New_York')

  // Media Capture
  screenshot?: boolean | {
    fullPage?: boolean;
    type?: 'png' | 'jpeg';
    quality?: number;               // JPEG quality (0-100)
    clip?: { x: number; y: number; width: number; height: number };
    omitBackground?: boolean;
  };

  pdf?: boolean | {
    format?: 'Letter' | 'Legal' | 'A4' | 'A3' | 'A5';
    landscape?: boolean;
    printBackground?: boolean;
    displayHeaderFooter?: boolean;
    headerTemplate?: string;
    footerTemplate?: string;
    margin?: { top?: string; right?: string; bottom?: string; left?: string };
  };

  recordVideo?: boolean;            // Record browser session
  videosPath?: string;              // Path to save videos
}
```

##### Crawl4AI Parameters

```typescript
interface Crawl4AIParameters {
  // Crawling Behavior
  maxDepth?: number;                // Max crawl depth (default: 1)
  maxPages?: number;                // Max pages to crawl
  baseUrl?: string;                 // Base URL for relative links

  // Link Filtering
  excludeExternalLinks?: boolean;   // Skip external links
  excludeInternalLinks?: boolean;   // Skip internal links
  excludeDomains?: string[];        // Domains to exclude
  includeDomains?: string[];        // Domains to include only

  // JavaScript Execution
  jsExecution?: boolean;            // Enable JavaScript execution
  waitFor?: string;                 // Element/condition to wait for

  // Extraction Strategy
  extractionStrategy?: 'cosine' | 'llm' | 'regex' | 'xpath' | 'css';
  cssSelector?: string;             // CSS selector for extraction

  // Chunking Strategy
  chunkingStrategy?: {
    type: 'fixed' | 'semantic' | 'sliding_window' | 'topic_based' | 'regex';
    chunkSize?: number;             // Size of chunks
    chunkOverlap?: number;          // Overlap between chunks
    separators?: string[];          // Separators for semantic chunking
    topicThreshold?: number;        // Threshold for topic-based chunking
    regexPattern?: string;          // Pattern for regex chunking
  };

  // Content Filtering
  contentFilter?: {
    type: 'keyword' | 'length' | 'css' | 'xpath' | 'regex';
    keywords?: string[];            // Keywords to filter
    minLength?: number;             // Min content length
    maxLength?: number;             // Max content length
    selector?: string;              // CSS/XPath selector
    pattern?: string;               // Regex pattern
    includeOnly?: boolean;          // Include only matching content
  };

  // Content Processing
  onlyMainContent?: boolean;        // Extract main content only
  excludedTags?: string[];         // HTML tags to exclude
  wordCountThreshold?: number;      // Min word count threshold
  removeOverlay?: boolean;          // Remove overlay elements
  removeForms?: boolean;            // Remove form elements
  removeNav?: boolean;              // Remove navigation elements

  // Cache Settings
  cacheMode?: 'enabled' | 'disabled' | 'bypass' | 'write_only' | 'read_only';
  bypassCache?: boolean;            // Force fresh crawl
  sessionId?: string;               // Session identifier for caching

  // Anti-Bot Measures
  antiBot?: boolean;                // Enable anti-bot measures
  delayBefore?: number;             // Delay before crawl (ms)
  delayAfter?: number;              // Delay after crawl (ms)

  // Special Features
  magic?: boolean;                  // Enable all smart features
  screenshot?: boolean;             // Capture screenshot
  verbose?: boolean;                // Enable verbose logging
}
```

##### Docling Parameters

```typescript
interface DoclingParameters {
  // Output Format
  format?: 'json' | 'markdown' | 'text' | 'html';

  // OCR Settings
  ocr?: boolean;                    // Enable OCR for scanned documents
  ocrEngine?: 'tesseract' | 'easyocr' | 'paddleocr';
  languages?: string[];             // OCR languages (e.g., ['en', 'es'])

  // Document Type
  documentType?: 'auto' | 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'image' | 'html';

  // Page Handling
  pageRange?: [number, number];     // Page range to extract [start, end]
  maxPages?: number;                // Maximum pages to process
  exportPageImages?: boolean;       // Export each page as image

  // Table Extraction
  tableStructure?: boolean;         // Extract table structure
  exportTables?: boolean;           // Export tables separately
  tableFormat?: 'markdown' | 'html' | 'csv' | 'json';

  // Figure Extraction
  exportFigures?: boolean;          // Extract figures/images
  figureFormat?: 'png' | 'jpg' | 'svg';

  // Metadata Extraction
  extractFormFields?: boolean;      // Extract PDF form fields
  extractAnnotations?: boolean;     // Extract PDF annotations
  extractBookmarks?: boolean;       // Extract PDF bookmarks
  extractEmbeddedFiles?: boolean;   // Extract embedded files

  // Quality Settings
  dpi?: number;                     // DPI for image extraction (default: 300)
  qualityThreshold?: number;        // Quality threshold (0-1)

  // Image Processing
  binarize?: boolean;               // Binarize images for OCR
  removeWatermarks?: boolean;       // Attempt to remove watermarks
  enhanceScannedText?: boolean;     // Enhance scanned text quality

  // Document Organization
  mergePages?: boolean;             // Merge all pages into one
  splitBySection?: boolean;         // Split document by sections
  chunkSize?: number;               // Chunk size for text splitting
  overlapSize?: number;             // Overlap between chunks

  // Pipeline Configuration
  pipeline?: Array<{
    stage: 'preprocessing' | 'extraction' | 'postprocessing';
    operation: string;
    params?: Record<string, any>;
  }>;
}
```

### Using Configuration Presets

The system includes several built-in presets for common use cases:

```typescript
// Available presets:
// - 'aggressive-crawl': Deep crawling with AI extraction
// - 'document-extraction': Optimized for PDF/document processing
// - 'spa-rendering': Full JavaScript rendering for SPAs
// - 'fast-extraction': Quick extraction without JS

const batchManager = new BatchConfigurationManager(paramManager, selector);

// Apply preset to URLs
batchManager.applyPreset('spa-rendering', [
  'https://app.example.com',
  'https://dashboard.example.com'
]);
```

### Batch Processing

```typescript
const urls = [
  'https://example.com/page1.html',    // Uses HTTP scraper
  'https://docs.example.com/guide.pdf', // Uses Docling
  'https://app.example.com/dashboard'   // Uses Playwright
];

const results = await kb.processUrls(urls);

// Each result includes which scraper was used
results.forEach(result => {
  console.log(`URL: ${result.url}, Scraper: ${result.metadata.scraperUsed}`);
});
```

### Tracking Scraper Usage and Configuration

The system automatically tracks which scraper and parameters were used for each URL:

```typescript
const result = await kb.processUrl('https://example.com/document.pdf');

// The scraper information is stored in:
// 1. Result metadata
console.log('Scraper used:', result.metadata.scraperUsed);
console.log('Scraper config:', result.metadata.scraperConfig);
console.log('Scraper metadata:', result.metadata.scraperMetadata);

// 2. URL repository (urls table) - persisted as JSON in metadata column
// 3. Knowledge store (knowledge_entries table)
// 4. File storage metadata (.meta.json files)
```

### Import/Export Configurations

```typescript
// Export all configurations
const exportedJson = batchManager.exportToJSON();
fs.writeFileSync('scraper-configs.json', exportedJson);

// Import configurations
const configJson = fs.readFileSync('scraper-configs.json', 'utf-8');
const importResult = batchManager.importFromJSON(configJson);
console.log(`Imported ${importResult.totalSuccessful} configurations`);
```