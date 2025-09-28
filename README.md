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

### Core Capabilities
- **Scalable URL Classification**: Extensible system for detecting and classifying different URL types
- **Multiple Scraping Libraries**: Support for various scraping tools (HTTP, Playwright, Crawl4AI, Firecrawl, Docling, DeepDoctection)
- **Advanced Parameter Configuration**: Set detailed parameters for each scraper per URL or in batch
- **Modular Content Fetching**: Support for various content sources (web, local files, APIs)
- **Flexible Content Processing**: Pluggable processors for different file types
- **Dynamic Content Detection**: Content type detection beyond file extensions

### Rate Limiting & Traffic Management
- **Domain-Based Rate Limiting**: Configurable intervals between requests per domain
- **Per-URL Rate Limits**: Set individual rate limits for each URL in batch processing
- **Dynamic Rate Adjustment**: Adjust rate limits on-the-fly based on response times or errors
- **Skip Rate Limiting**: Option to bypass rate limiting for urgent requests
- **Rate Limit Statistics**: Track wait times, request counts, and performance metrics

### Error Collection & Monitoring
- **Comprehensive Error Tracking**: Collect all errors and warnings during scraping
- **Severity Classification**: Automatic classification (critical, error, recoverable, warning, info)
- **Context-Based Grouping**: Group issues by URL, domain, or custom context
- **Issue Aggregation**: Summarize errors across batch processing
- **Formatted Reporting**: Generate human-readable error summaries
- **Error Timeline Tracking**: Track when errors first and last occurred

### URL Tagging & Organization
- **Hierarchical Tags**: Create tags with parent-child relationships for better organization
- **Many-to-Many Relationships**: URLs can have multiple tags, tags can have multiple URLs
- **Batch Processing by Tags**: Process all URLs with specific tags in one operation
- **Tag-based Selection**: Select URLs by tag names for targeted batch operations
- **Tag Persistence**: Tags are stored in the database for persistent organization
- **Dynamic Tag Creation**: Tags are automatically created when assigned to URLs

### Original File Tracking
- **Automatic File Tracking**: All scraped and downloaded files are automatically tracked
- **Unique File IDs**: Each file gets a unique identifier (e.g., `file_1759017759658_b3e29cd4695b7927`)
- **Download URLs**: Frontend-ready download links (`/api/files/original/{id}/download`)
- **SHA256 Checksums**: Integrity verification for all tracked files
- **Complete Metadata**: URL source, MIME type, size, scraper used, timestamps
- **File Status Management**: Track file lifecycle (active, archived, deleted, processing, error)
- **Access Tracking**: Automatic `accessed_at` timestamp updates
- **Statistics & Reporting**: Aggregate statistics by file type, status, and scraper

### Batch Processing
- **Per-URL Configuration**: Individual settings for each URL in batch
- **Mixed Configuration**: Combine global and per-URL options
- **Concurrent Processing**: Process multiple URLs in parallel with rate limiting
- **Domain Grouping**: Automatically group URLs by domain for optimal processing
- **Continue on Error**: Option to continue batch processing despite individual failures
- **Tag-based Batch Processing**: Process all URLs sharing specific tags

### Data Persistence
- **Complete Metadata Storage**: All settings, errors, and rate limit info saved to database
- **Scraper Configuration Tracking**: Track which scraper and parameters were used
- **SQL and File Storage**: Dual storage with SQL for queries and files for content
- **Original File Repository**: Dedicated database for tracking all original scraped files
- **Batch Configuration Management**: Configure multiple URLs at once with presets
- **Historical Data**: Maintain history of all processing attempts and results
- **File Lineage**: Track original files separately from processed/transformed versions

### Testing & Quality
- **95%+ Test Coverage**: Comprehensive unit, integration, and edge case tests
- **SOLID Compliance Tests**: Dedicated tests ensuring architectural principles
- **Performance Testing**: Tests for memory efficiency and scalability
- **Coverage Reporting**: Detailed coverage reports and verification

## Installation

```bash
npm install
npm run build
```

## Usage

### Basic Usage

```typescript
import { KnowledgeBaseFactory } from './src/factory/KnowledgeBaseFactory';
import { createDefaultConfiguration } from './src/config/Configuration';

const config = createDefaultConfiguration({
  scraping: {
    rateLimiting: {
      enabled: true,
      defaultIntervalMs: 1000,  // 1 second between requests
      domainIntervals: {
        'api.github.com': 2000,  // 2 seconds for GitHub API
        'example.com': 500       // 0.5 seconds for example.com
      }
    },
    errorCollection: {
      enabled: true,
      includeStackTraces: true
    }
  }
});

const kb = KnowledgeBaseFactory.createKnowledgeBase(config);

// Process a single URL
const result = await kb.processUrl('https://example.com/document.pdf');
console.log('Processing result:', result);

// Check for rate limiting and errors in metadata
if (result.metadata?.rateLimitInfo) {
  console.log(`Waited ${result.metadata.rateLimitInfo.waitedMs}ms due to rate limiting`);
}
if (result.metadata?.scrapingIssues) {
  console.log(`Encountered ${result.metadata.scrapingIssues.summary.errorCount} errors`);
}
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

### Original File Tracking

The original file tracking system automatically tracks all scraped and downloaded files:

#### Basic Usage

```typescript
import { KnowledgeBaseFactoryWithFileTracking } from './src/factory/KnowledgeBaseFactoryWithFileTracking';
import { createSqlConfiguration } from './src/config/Configuration';

// Create knowledge base with file tracking enabled
const config = createSqlConfiguration({
  storage: {
    knowledgeStore: {
      type: 'sql',
      dbPath: './data/knowledge.db'
    },
    originalFileStore: {
      type: 'sql',
      path: './data/original_files.db'
    }
  }
});

const kb = await KnowledgeBaseFactoryWithFileTracking.createKnowledgeBaseWithFileTracking(config);

// Process URLs - files are automatically tracked
const result = await kb.processUrl('https://example.com/document.pdf');

// Access the original file repository
const repository = kb.getOriginalFileRepository();

// Get tracked files for a URL
const trackedFiles = await repository.getOriginalFilesByUrl('https://example.com/document.pdf');
console.log('File ID:', trackedFiles[0].id);
console.log('Download URL:', trackedFiles[0].downloadUrl);
console.log('Checksum:', trackedFiles[0].checksum);
```

#### Querying Tracked Files

```typescript
// List all tracked files
const allFiles = await repository.listOriginalFiles();

// Filter by MIME type
const pdfFiles = await repository.listOriginalFiles({
  mimeType: 'application/pdf'
});

// Filter by status
const activeFiles = await repository.listOriginalFiles({
  status: 'active'
});

// Get a specific file by ID
const file = await repository.getOriginalFile('file_1759017759658_b3e29cd4695b7927');
```

### Working with Tags

The tagging system allows you to organize and process URLs in logical groups:

#### Basic Tag Usage

```typescript
import { KnowledgeBaseFactoryWithTags } from './src/factory/KnowledgeBaseFactoryWithTags';
import { createDefaultConfiguration } from './src/config/Configuration';

const config = createDefaultConfiguration({
  storage: {
    enableUrlTracking: true,
    urlRepositoryPath: './data/urls.db'
  }
});

const kb = KnowledgeBaseFactoryWithTags.createKnowledgeBaseWithTags({
  ...config,
  enableTags: true
});

// Create tags
await kb.createTag('documentation', undefined, 'Documentation resources');
await kb.createTag('api-docs', 'documentation', 'API documentation');
await kb.createTag('tutorials', 'documentation', 'Tutorial content');

// Process URLs with tags
const urlsWithTags = [
  {
    url: 'https://docs.example.com/api/v1',
    tags: ['api-docs', 'v1']
  },
  {
    url: 'https://docs.example.com/tutorial/getting-started',
    tags: ['tutorials', 'beginner']
  },
  {
    url: 'https://blog.example.com/advanced-features',
    tags: ['tutorials', 'advanced']
  }
];

// Process all URLs with their tags
const results = await kb.processUrlsWithTags(urlsWithTags);

// Process all URLs with specific tag
const tutorialResults = await kb.processUrlsByTags(['tutorials']);

// Process URLs with multiple tags (AND condition)
const beginnerTutorials = await kb.processUrlsByTags(
  ['tutorials', 'beginner'],
  { requireAllTags: true }
);

// Process URLs including child tags
const allDocs = await kb.processUrlsByTags(
  ['documentation'],
  { includeChildTags: true }
);
```

#### Managing Tags

```typescript
// List all tags
const allTags = await kb.listTags();

// Get tag hierarchy
const tagPath = await kb.getTagHierarchy('api-docs');
// Returns: [{ name: 'documentation', ... }, { name: 'api-docs', ... }]

// Add tags to existing URL
await kb.addTagsToUrl('https://example.com/page', ['important', 'review']);

// Remove tags from URL
await kb.removeTagsFromUrl('https://example.com/page', ['review']);

// Get all tags for a URL
const urlTags = await kb.getUrlTags('https://example.com/page');

// Delete a tag (with options for children)
await kb.deleteTag('temporary', false); // false = promote children to root
await kb.deleteTag('obsolete', true);   // true = delete children too
```

#### Batch Operations with Tags

```typescript
// Configure rate limiting per tag group
const apiUrls = await kb.processUrlsByTags(['api'], {
  concurrency: 2,  // Process 2 API URLs at a time
  timeout: 30000    // 30 second timeout for APIs
});

const staticContent = await kb.processUrlsByTags(['static', 'cached'], {
  concurrency: 10,  // Process more static content in parallel
  forceReprocess: false  // Skip unchanged content
});
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
## Rate Limiting

The system includes sophisticated rate limiting to respect server limits and prevent overwhelming target sites.

### Configuration

```typescript
const config = createDefaultConfiguration({
  scraping: {
    rateLimiting: {
      enabled: true,
      defaultIntervalMs: 1000,  // Default 1 second between requests
      domainIntervals: {
        'api.github.com': 2000,   // 2 seconds for GitHub API
        'linkedin.com': 5000,     // 5 seconds for LinkedIn
        'example.com': 500,       // 0.5 seconds for example.com
        'urgent-api.com': 0       // No delay for urgent APIs
      }
    }
  }
});
```

### Per-URL Rate Limits in Batch Processing

```typescript
// Process URLs with individual rate limits
const urlConfigs = [
  {
    url: 'https://api.github.com/users/octocat',
    rateLimitMs: 2000,  // 2 seconds for this URL
    scraperOptions: {
      collectErrors: true,
      timeout: 10000
    }
  },
  {
    url: 'https://fast-api.com/endpoint',
    rateLimitMs: 100,   // 100ms for fast API
    scraperOptions: {
      skipRateLimit: false
    }
  },
  {
    url: 'https://urgent.com/critical',
    rateLimitMs: 0,
    scraperOptions: {
      skipRateLimit: true  // Skip rate limiting entirely
    }
  }
];

const results = await kb.processUrlsWithConfigs(urlConfigs, {
  concurrency: 3  // Process 3 URLs in parallel
});

// Results include rate limit information
results.forEach(result => {
  if (result.metadata?.rateLimitInfo) {
    console.log(`URL: ${result.url}`);
    console.log(`  Waited: ${result.metadata.rateLimitInfo.waitedMs}ms`);
    console.log(`  Domain: ${result.metadata.rateLimitInfo.domain}`);
    console.log(`  Request #: ${result.metadata.rateLimitInfo.requestNumber}`);
  }
});
```

### Dynamic Rate Limit Adjustment

```typescript
const fetcher = (kb as any).contentFetcher as ScraperAwareContentFetcher;

// Adjust rate limits dynamically based on performance
fetcher.setDomainRateLimit('slow-site.com', 10000);  // 10 seconds
fetcher.setDomainRateLimit('medium-site.com', 3000);  // 3 seconds

// Get rate limiter for advanced configuration
const rateLimiter = fetcher.getRateLimiter();
const config = rateLimiter.getConfiguration();
console.log('Current rate limits:', config.domainIntervals);

// Get statistics
const stats = rateLimiter.getStats('example.com');
console.log(`Requests to example.com: ${stats.requestCount}`);
console.log(`Total wait time: ${stats.totalWaitTime}ms`);
console.log(`Average wait: ${stats.averageWaitTime}ms`);
```

## Error Collection and Monitoring

Comprehensive error tracking and reporting for all scraping operations.

### Configuration

```typescript
const config = createDefaultConfiguration({
  scraping: {
    errorCollection: {
      enabled: true,
      includeStackTraces: true,
      maxErrorsPerContext: 100,
      clearAfterSuccess: false
    }
  }
});
```

### Error Tracking

```typescript
const fetcher = (kb as any).contentFetcher as ScraperAwareContentFetcher;
const errorCollector = fetcher.getErrorCollector();

// Process URLs
const results = await kb.processUrls(urls);

// Check errors for specific URL
const issues = fetcher.getScrapingIssues('https://example.com');
console.log(`Errors: ${issues.summary.errorCount}`);
console.log(`Warnings: ${issues.summary.warningCount}`);
console.log(`Critical errors: ${issues.summary.criticalErrors}`);

// Get detailed error information
issues.errors.forEach(error => {
  console.log(`[${error.severity}] ${error.message}`);
  if (error.stack) {
    console.log(`Stack: ${error.stack}`);
  }
});

// Get formatted summary
const summary = errorCollector.getFormattedSummary();
console.log(summary);
```

### Error Severity Classification

Errors are automatically classified by severity:

- **Critical**: Fatal errors, invalid configuration
- **Error**: Standard errors
- **Recoverable**: Timeouts, network issues, retryable errors
- **Warning**: Deprecated methods, slow responses, rate limits
- **Info**: General information

### Batch Error Aggregation

```typescript
// Process batch and collect all errors
const results = await kb.processUrlsWithConfigs(urlConfigs, {
  collectAllErrors: true
});

// Export all issues for analysis
const allIssues = errorCollector.exportIssues();

for (const [context, issues] of allIssues) {
  console.log(`Context: ${context}`);
  console.log(`  Total Errors: ${issues.summary.errorCount}`);
  console.log(`  Critical: ${issues.summary.criticalErrors}`);
  console.log(`  Warnings: ${issues.summary.warningCount}`);

  if (issues.summary.firstError && issues.summary.lastError) {
    console.log(`  Error period: ${issues.summary.firstError} to ${issues.summary.lastError}`);
  }
}
```

## Advanced Batch Processing

Process multiple URLs with individual configurations, rate limits, and error handling.

### Batch Processing with Individual Configurations

```typescript
const urlConfigs = [
  {
    url: 'https://api.github.com/users/torvalds',
    rateLimitMs: 2000,
    scraperOptions: {
      timeout: 10000,
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    },
    processingOptions: {
      forceReprocess: false
    }
  },
  {
    url: 'https://example.com/document.pdf',
    rateLimitMs: 500,
    scraperOptions: {
      scraperSpecific: {
        // Docling parameters for PDF
        format: 'markdown',
        ocr: true,
        tableStructure: true
      }
    }
  },
  {
    url: 'https://app.example.com/dashboard',
    rateLimitMs: 1000,
    scraperOptions: {
      scraperSpecific: {
        // Playwright parameters
        viewport: { width: 1920, height: 1080 },
        screenshot: true,
        waitUntil: 'networkidle'
      }
    }
  }
];

// Process with global and individual options
const results = await kb.processUrlsWithConfigs(urlConfigs, {
  concurrency: 3,
  continueOnError: true,
  globalScraperOptions: {
    collectErrors: true,
    userAgent: 'MyBot/1.0'
  }
});

// Analyze results
const successful = results.filter(r => r.success);
const failed = results.filter(r => !r.success);

console.log(`Success: ${successful.length}/${results.length}`);
console.log(`Failed: ${failed.length}/${results.length}`);
```

### Domain-Based Batch Processing

```typescript
// Group URLs by domain for optimal rate limiting
const domainGroups = {
  'api.github.com': {
    urls: [
      'https://api.github.com/users/torvalds',
      'https://api.github.com/repos/nodejs/node',
      'https://api.github.com/orgs/microsoft'
    ],
    rateLimitMs: 2000
  },
  'example.com': {
    urls: [
      'https://example.com/page1',
      'https://example.com/page2',
      'https://example.com/page3'
    ],
    rateLimitMs: 500
  }
};

// Process each domain group
for (const [domain, config] of Object.entries(domainGroups)) {
  const urlConfigs = config.urls.map(url => ({
    url,
    rateLimitMs: config.rateLimitMs
  }));

  const results = await kb.processUrlsWithConfigs(urlConfigs, {
    concurrency: 1  // Sequential for same domain
  });

  console.log(`Processed ${domain}: ${results.length} URLs`);
}
```

## Metadata Persistence

All processing metadata is automatically saved to the database and file storage.

### What Gets Saved

```typescript
// After processing, the following metadata is persisted:
const result = await kb.processUrl(url);

// Saved to database (urls table, metadata column as JSON):
{
  scraperUsed: 'playwright',
  scraperConfig: { /* all parameters used */ },
  scraperMetadata: { /* custom scraper data */ },
  rateLimitInfo: {
    waitedMs: 1500,
    domain: 'example.com',
    requestNumber: 3
  },
  scrapingIssues: {
    errors: [/* error details */],
    warnings: [/* warning details */],
    summary: {
      errorCount: 1,
      warningCount: 2,
      criticalErrors: 0
    }
  }
}

// Also saved to:
// - File storage (.meta.json files)
// - Knowledge entries table
// - Processing history
```

### Querying Saved Metadata

```typescript
// Access URL repository for saved metadata
const urlRepository = (kb as any).urlRepository;

// Get metadata for specific URL
const urlInfo = await urlRepository.getUrlInfo('https://example.com/page');
if (urlInfo && urlInfo.metadata) {
  console.log('Saved metadata:', JSON.stringify(urlInfo.metadata, null, 2));
  console.log('Last processed:', urlInfo.lastProcessed);
  console.log('Process count:', urlInfo.processCount);
}

// SQL queries for analysis (if using SQL storage)
// Find all URLs processed with specific scraper:
// SELECT url, json_extract(metadata, '$.scraperUsed') as scraper
// FROM urls
// WHERE json_extract(metadata, '$.scraperUsed') = 'playwright'

// Find URLs with errors:
// SELECT url, json_extract(metadata, '$.scrapingIssues.summary.errorCount') as errors
// FROM urls
// WHERE json_extract(metadata, '$.scrapingIssues.summary.errorCount') > 0
```

## Testing

The system includes comprehensive tests ensuring code quality and SOLID compliance.

### Running Tests

```bash
# Run all tests with coverage
npm run test:all

# Run specific test suites
npm run test:rate-limit        # Rate limiting tests
npm run test:error-collector   # Error collection tests
npm run test:batch             # Batch processing tests
npm run test:solid             # SOLID compliance tests

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Generate detailed coverage report
npm run test:coverage:detailed
```

### Test Coverage

- **95%+ Overall Coverage**: All major functions tested
- **Unit Tests**: Component-level testing with mocks
- **Integration Tests**: End-to-end flow testing
- **SOLID Compliance Tests**: Architecture validation
- **Performance Tests**: Memory and scalability testing
- **Edge Case Tests**: Boundary and error condition testing

## API Reference

### IOriginalFileRepository

Interface for managing tracked original files:

```typescript
interface IOriginalFileRepository {
  // Record a new original file
  recordOriginalFile(fileInfo: OriginalFileInfo): Promise<string>;

  // Get a specific file by ID
  getOriginalFile(fileId: string): Promise<OriginalFileRecord | null>;

  // Get all files for a URL
  getOriginalFilesByUrl(url: string): Promise<OriginalFileRecord[]>;

  // List files with optional filters
  listOriginalFiles(options?: ListOriginalFilesOptions): Promise<OriginalFileRecord[]>;

  // Update file status
  updateFileStatus(fileId: string, status: FileStatus): Promise<boolean>;

  // Get aggregate statistics
  getStatistics(): Promise<OriginalFileStatistics>;
}
```

#### OriginalFileRecord

```typescript
interface OriginalFileRecord {
  id: string;                  // Unique file identifier
  url: string;                  // Source URL
  filePath: string;             // Storage path
  mimeType: string;             // MIME type
  size: number;                 // File size in bytes
  checksum: string;             // SHA256 hash
  scraperUsed?: string;         // Scraper that downloaded the file
  status: FileStatus;           // Current status
  metadata?: any;               // Additional metadata
  createdAt: Date;              // Creation timestamp
  updatedAt: Date;              // Last update timestamp
  accessedAt?: Date;            // Last access timestamp
  downloadUrl: string;          // Frontend download URL
}
```

#### FileStatus Enum

```typescript
enum FileStatus {
  ACTIVE = 'active',           // File is available
  ARCHIVED = 'archived',       // File is archived
  DELETED = 'deleted',         // Soft deleted
  PROCESSING = 'processing',   // Being processed
  ERROR = 'error'              // Error state
}
```

### KnowledgeBaseWithFileTracking

Extended orchestrator with file tracking:

```typescript
interface KnowledgeBaseWithFileTracking extends KnowledgeBaseOrchestrator {
  // Get the original file repository
  getOriginalFileRepository(): IOriginalFileRepository;
}
```

### KnowledgeBaseOrchestrator

```typescript
class KnowledgeBaseOrchestrator {
  // Process single URL
  async processUrl(url: string, options?: ProcessingOptions): Promise<ProcessingResult>

  // Process multiple URLs
  async processUrls(urls: string[], options?: ProcessingOptions): Promise<ProcessingResult[]>

  // Process URLs with individual configurations
  async processUrlsWithConfigs(
    urlConfigs: Array<{
      url: string;
      rateLimitMs?: number;
      scraperOptions?: any;
      processingOptions?: ProcessingOptions;
    }>,
    globalOptions?: ProcessingOptions
  ): Promise<ProcessingResult[]>
}
```

### ScraperAwareContentFetcher

```typescript
class ScraperAwareContentFetcher {
  // Set domain rate limit
  setDomainRateLimit(domain: string, intervalMs: number): void

  // Get rate limiter
  getRateLimiter(): IRateLimiter

  // Get error collector
  getErrorCollector(): IErrorCollector

  // Get scraping issues for URL
  getScrapingIssues(url: string): ScrapingIssues

  // Clear scraping issues
  clearScrapingIssues(url?: string): void
}
```

### IRateLimiter

```typescript
interface IRateLimiter {
  // Wait before making request to domain
  waitForDomain(domain: string): Promise<void>

  // Record that request was made
  recordRequest(domain: string): void

  // Get current wait time for domain
  getWaitTime(domain: string): number

  // Clear rate limit history
  clearHistory(domain?: string): void

  // Set interval for specific domain
  setDomainInterval(domain: string, intervalMs: number): void

  // Get current configuration
  getConfiguration(): RateLimitConfiguration
}
```

### IErrorCollector

```typescript
interface IErrorCollector {
  // Record an error
  recordError(context: string, error: Error | string, metadata?: any): void

  // Record a warning
  recordWarning(context: string, warning: string, metadata?: any): void

  // Get all errors for context
  getErrors(context: string): ErrorEntry[]

  // Get all warnings for context
  getWarnings(context: string): WarningEntry[]

  // Get all issues for context
  getIssues(context: string): ScrapingIssues

  // Clear issues
  clearIssues(context?: string): void

  // Export all issues
  exportIssues(): Map<string, ScrapingIssues>
}
```

## Examples

See the `examples/` directory for complete working examples:

- `rate-limiting-and-error-collection.ts` - Rate limiting and error tracking examples
- `batch-processing-with-per-url-settings.ts` - Advanced batch processing
- `scraper-configuration.ts` - Scraper setup and parameter configuration

## Contributing

Contributions are welcome! Please ensure:

1. All tests pass (`npm test`)
2. Code follows SOLID principles
3. Test coverage remains above 80%
4. Documentation is updated

## License

MIT