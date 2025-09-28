### Components, classes, and exported functions

| Component | File | Classes | Exported functions | Description | Inputs | Outputs |
|---|---|---|---|---|---|---|
| config | `src/config/Configuration.ts` | — | - `createDefaultConfiguration`<br>- `createProductionConfiguration`<br>- `createDevelopmentConfiguration`<br>- `createSqlConfiguration`<br>- `validateConfiguration` | - Build default config with optional overrides<br>- Build production-ready config<br>- Build development config<br>- Build SQL-backed config with optional overrides<br>- Validate a configuration object | - overrides?: Partial<KnowledgeBaseConfig><br>- none<br>- none<br>- overrides?: Partial<KnowledgeBaseConfig><br>- config: KnowledgeBaseConfig | - KnowledgeBaseConfig<br>- KnowledgeBaseConfig<br>- KnowledgeBaseConfig<br>- KnowledgeBaseConfig<br>- void (throws on invalid) |
| config | `src/config/index.ts` | — | — | Re-exports configuration APIs | — | — |
| detectors | `src/detectors/BaseUrlDetector.ts` | `BaseUrlDetector` (abstract) | — | Abstract base for URL detectors | — | — |
| detectors | `src/detectors/ContentBasedDetector.ts` | `ContentBasedDetector` | — | Detects content type from content sample | — | — |
| detectors | `src/detectors/ExtensionBasedDetector.ts` | `ExtensionBasedDetector` | — | Detects content type from URL extension | — | — |
| detectors | `src/detectors/HeaderBasedDetector.ts` | `HeaderBasedDetector` | — | Detects content type from HTTP headers | — | — |
| detectors | `src/detectors/UrlDetectorRegistry.ts` | `UrlDetectorRegistry` | — | Holds and prioritizes detectors | — | — |
| detectors | `src/detectors/index.ts` | — | - `createDefaultDetectorRegistry` | Create a registry with extension, header, and content detectors | none | UrlDetectorRegistry |
| factory | `src/factory/KnowledgeBaseFactory.ts` | `KnowledgeBaseFactory` | — | Constructs configured orchestrators and components | — | — |
| factory | `src/factory/KnowledgeBaseFactoryWithTags.ts` | `KnowledgeBaseFactoryWithTags` | `createKnowledgeBaseWithTags` | Factory for creating knowledge base with tag support | config: KnowledgeBaseConfigWithTags | KnowledgeBaseOrchestratorWithTags |
| factory | `src/factory/index.ts` | — | — | Re-exports factory APIs | — | — |
| fetchers | `src/fetchers/BaseFetcher.ts` | `BaseFetcher` (abstract) | — | Abstract base for content fetchers | — | — |
| fetchers | `src/fetchers/HttpFetcher.ts` | `HttpFetcher` | — | Fetches content over HTTP/HTTPS | — | — |
| fetchers | `src/fetchers/SmartHttpFetcher.ts` | `SmartHttpFetcher` | — | HTTP fetcher handling redirects/special cases | — | — |
| fetchers | `src/fetchers/FileFetcher.ts` | `FileFetcher` | — | Reads content from local files | — | — |
| fetchers | `src/fetchers/FetcherRegistry.ts` | `FetcherRegistry` | — | Manages a set of fetchers | — | — |
| fetchers | `src/fetchers/ScraperAwareContentFetcher.ts` | `ScraperAwareContentFetcher` | — | Enhanced content fetcher with scraping, rate limiting, and error collection | url: string, options?: FetchOptions | FetchedContent with metadata |
| fetchers | `src/fetchers/index.ts` | — | - `createDefaultFetcherRegistry` | Create registry with `SmartHttpFetcher` and `FileFetcher` | none | FetcherRegistry |
| scrapers | `src/scrapers/BaseScraper.ts` | `BaseScraper` (abstract) | — | Abstract base for scraper implementations | — | — |
| scrapers | `src/scrapers/HttpScraper.ts` | `HttpScraper` | — | Adapter for HTTP fetcher as scraper | — | — |
| scrapers | `src/scrapers/PlaywrightScraper.ts` | `PlaywrightScraper` | — | Full browser automation with Playwright - supports JS, screenshots, PDFs, cookies | url: string, options?: ScraperOptions | ScrapedContent |
| scrapers | `src/scrapers/Crawl4AIScraper.ts` | `Crawl4AIScraper` | — | AI-powered web crawling with extraction strategies and content chunking | url: string, options?: ScraperOptions | ScrapedContent |
| scrapers | `src/scrapers/FirecrawlScraper.ts` | `FirecrawlScraper` | — | API-based scraping service (placeholder) | — | — |
| scrapers | `src/scrapers/DoclingScraper.ts` | `DoclingScraper` | — | Document extraction with OCR support for PDF, DOCX, PPTX, images | url: string, options?: ScraperOptions | ScrapedContent |
| scrapers | `src/scrapers/DeepDoctectionScraper.ts` | `DeepDoctectionScraper` | — | Deep document analysis (placeholder) | — | — |
| scrapers | `src/scrapers/ScraperRegistry.ts` | `ScraperRegistry` | — | Singleton registry for managing scrapers | — | — |
| scrapers | `src/scrapers/ScraperSelector.ts` | `ScraperSelector`, `DomainBasedSelectionStrategy` | — | Selects appropriate scraper for URLs based on rules | — | — |
| scrapers | `src/scrapers/ScraperFactory.ts` | `ScraperFactory` | — | Factory for creating and configuring scrapers | — | — |
| scrapers | `src/scrapers/ScraperParameterManager.ts` | `ScraperParameterManager`, `PlaywrightParameterValidator`, `Crawl4AIParameterValidator`, `DoclingParameterValidator` | — | Manages and validates scraper-specific parameters | url: string, config: ScraperConfiguration | void |
| scrapers | `src/scrapers/BatchConfigurationManager.ts` | `BatchConfigurationManager` | — | Handles batch configuration operations and presets | operation: BatchOperation | BatchConfigurationResult |
| scrapers | `src/scrapers/DomainRateLimiter.ts` | `DomainRateLimiter` | — | Implements domain-based rate limiting with configurable intervals | domain: string, intervalMs?: number | Promise<void> (wait), number (getWaitTime) |
| scrapers | `src/scrapers/ScrapingErrorCollector.ts` | `ScrapingErrorCollector` | — | Collects and categorizes errors/warnings during scraping with severity classification | context: string, error: Error \| string, metadata?: any | ScrapingIssues |
| interfaces | `src/interfaces/IUrlDetector.ts` | — | — | Interface definitions for URL detection | — | — |
| interfaces | `src/interfaces/IOrchestrator.ts` | — | — | Orchestrator interfaces and types | — | — |
| interfaces | `src/interfaces/IContentFetcher.ts` | — | — | Fetcher interfaces and types | — | — |
| interfaces | `src/interfaces/IScraper.ts` | — | — | Scraper interfaces and types | — | — |
| interfaces | `src/interfaces/IScraperParameters.ts` | — | — | Comprehensive parameter interfaces for all scrapers | — | — |
| interfaces | `src/interfaces/IRateLimiter.ts` | — | — | Interface for rate limiting implementations | — | — |
| interfaces | `src/interfaces/IErrorCollector.ts` | — | — | Interface for error collection and reporting | — | — |
| interfaces | `src/interfaces/IBatchProcessingOptions.ts` | — | — | Interface for batch processing with per-URL configurations | — | — |
| interfaces | `src/interfaces/IFileStorage.ts` | — | — | File storage interfaces and types | — | — |
| interfaces | `src/interfaces/IKnowledgeStore.ts` | — | — | Knowledge store interfaces and types | — | — |
| interfaces | `src/interfaces/IContentProcessor.ts` | — | — | Processor interfaces and types | — | — |
| interfaces | `src/interfaces/ITextCleaner.ts` | — | — | Text cleaner interfaces and types | — | — |
| interfaces | `src/interfaces/IUrlRepository.ts` | — | — | URL repository interfaces and types | — | — |
| interfaces | `src/interfaces/ITag.ts` | — | — | Tag interfaces and types for URL organization | — | — |
| interfaces | `src/interfaces/ITagManager.ts` | — | — | Tag management interfaces | — | — |
| interfaces | `src/interfaces/IUrlTagRepository.ts` | — | — | URL-tag relationship interfaces | — | — |
| interfaces | `src/interfaces/index.ts` | — | — | Re-exports interfaces | — | — |
| orchestrator | `src/orchestrator/KnowledgeBaseOrchestrator.ts` | `KnowledgeBaseOrchestrator` | — | Coordinates pipeline with batch processing, per-URL configs, and metadata persistence | processUrl, processUrls, processUrlsWithConfigs | ProcessingResult[] with full metadata |
| orchestrator | `src/orchestrator/KnowledgeBaseOrchestratorWithTags.ts` | `KnowledgeBaseOrchestratorWithTags` | — | Enhanced orchestrator with tag support for batch operations | processUrlWithTags, processUrlsWithTags, processUrlsByTags | ProcessingResult[] with tags metadata |
| orchestrator | `src/orchestrator/index.ts` | — | — | Re-exports orchestrator | — | — |
| processors | `src/processors/BaseProcessor.ts` | `BaseProcessor` (abstract) | — | Abstract base for content processors | — | — |
| processors | `src/processors/TextProcessor.ts` | `TextProcessor` | — | Processes plain text | — | — |
| processors | `src/processors/HtmlProcessor.ts` | `HtmlProcessor` | — | Processes HTML to text/metadata | — | — |
| processors | `src/processors/PdfProcessor.ts` | `PdfProcessor` | — | Processes PDFs | — | — |
| processors | `src/processors/DocProcessor.ts` | `DocProcessor` | — | Processes legacy Word docs | — | — |
| processors | `src/processors/DocumentProcessor.ts` | `DocumentProcessor` | — | Processes modern Office docs | — | — |
| processors | `src/processors/SpreadsheetProcessor.ts` | `SpreadsheetProcessor` | — | Processes spreadsheets | — | — |
| processors | `src/processors/ProcessorRegistry.ts` | `ProcessorRegistry` | — | Manages processors and fallback | — | — |
| processors | `src/processors/ContentProcessorWithCleaning.ts` | `ContentProcessorWithCleaning` | — | Decorator that adds text cleaning to content processors | content: Buffer \| string, contentType: ContentType, options?: ProcessingOptionsWithCleaning | ProcessedContentWithCleaning |
| processors | `src/processors/index.ts` | — | - `createDefaultProcessorRegistry` | Create registry with standard processors and fallback | none | ProcessorRegistry |
| cleaners | `src/cleaners/BaseTextCleaner.ts` | `BaseTextCleaner` (abstract) | — | Abstract base for text cleaners with common functionality | — | — |
| cleaners | `src/cleaners/SanitizeHtmlCleaner.ts` | `SanitizeHtmlCleaner` | — | Removes dangerous HTML elements and attributes | input: string, config?: ITextCleanerConfig | ITextCleaningResult |
| cleaners | `src/cleaners/XssCleaner.ts` | `XssCleaner` | — | Prevents XSS attacks by filtering malicious content | input: string, config?: ITextCleanerConfig | ITextCleaningResult |
| cleaners | `src/cleaners/VocaCleaner.ts` | `VocaCleaner` | — | Text normalization and manipulation (whitespace, case) | input: string, config?: ITextCleanerConfig | ITextCleaningResult |
| cleaners | `src/cleaners/StringJsCleaner.ts` | `StringJsCleaner` | — | Advanced string operations (HTML stripping, entity decoding) | input: string, config?: ITextCleanerConfig | ITextCleaningResult |
| cleaners | `src/cleaners/RemarkCleaner.ts` | `RemarkCleaner` | — | Markdown processing and cleaning | input: string, config?: ITextCleanerConfig | ITextCleaningResult |
| cleaners | `src/cleaners/ReadabilityCleaner.ts` | `ReadabilityCleaner` | — | Extract main content from web pages | input: string, config?: ITextCleanerConfig | ITextCleaningResult |
| cleaners | `src/cleaners/TextCleanerRegistry.ts` | `TextCleanerRegistry` | — | Singleton registry for managing text cleaners | — | — |
| cleaners | `src/cleaners/TextCleanerChain.ts` | `TextCleanerChain` | — | Sequential text processing through multiple cleaners | input: string, format: TextFormat | IChainResult |
| cleaners | `src/cleaners/TextCleanerConfigManager.ts` | `TextCleanerConfigManager` | — | Manages per-URL cleaner configurations | url: string, cleanerName: string, config: ITextCleanerConfig | Promise<void> |
| cleaners | `src/cleaners/TextCleaningOrchestrator.ts` | `TextCleaningOrchestrator` | — | Coordinates text cleaning operations and cleaner selection | text: string, format: TextFormat, url?: string | IChainResult |
| storage | `src/storage/BaseKnowledgeStore.ts` | `BaseKnowledgeStore` (abstract) | — | Abstract base for knowledge stores | — | — |
| storage | `src/storage/MemoryKnowledgeStore.ts` | `MemoryKnowledgeStore` | — | In-memory store for entries (dev/test) | — | — |
| storage | `src/storage/FileKnowledgeStore.ts` | `FileKnowledgeStore` | — | File-based persistent knowledge store | — | — |
| storage | `src/storage/SqlKnowledgeStore.ts` | `SqlKnowledgeStore` | — | SQL-backed persistent knowledge store | — | — |
| storage | `src/storage/BaseFileStorage.ts` | `BaseFileStorage` (abstract) | — | Abstract base for file storage | — | — |
| storage | `src/storage/LocalFileStorage.ts` | `LocalFileStorage` | — | Stores raw bytes+metadata on local FS | — | — |
| storage | `src/storage/SqlUrlRepository.ts` | `SqlUrlRepository` | — | Tracks URLs/hashes for duplicate detection | — | — |
| storage | `src/storage/SqlUrlRepositoryWithTags.ts` | `SqlUrlRepositoryWithTags` | — | Enhanced URL repository with tag support | registerWithTags, getUrlsByTags, addTagsToUrl | string (URL ID) |
| storage | `src/storage/SqlTagManager.ts` | `SqlTagManager` | — | SQL-based tag management with hierarchical support | createTag, getTag, deleteTag, listTags | ITag |
| storage | `src/storage/SqlUrlTagRepository.ts` | `SqlUrlTagRepository` | — | Manages many-to-many URL-tag relationships | addTagsToUrl, getTagsForUrl, getUrlsWithTag | boolean/ITag[]/string[] |
| storage | `src/storage/index.ts` | — | - `createDefaultKnowledgeStore`<br>- `createDefaultFileStorage` | - Create memory/file knowledge store (based on path)<br>- Create local file storage rooted at basePath | - storePath?: string<br>- basePath: string | - BaseKnowledgeStore (Memory or File)<br>- LocalFileStorage |
| utils | `src/utils/ErrorHandler.ts` | `ErrorHandler` | — | Centralized error handling utilities | — | — |
| utils | `src/utils/ValidationUtils.ts` | `ValidationUtils` | — | Validation helpers for URLs, config, etc. | — | — |
| utils | `src/utils/index.ts` | — | — | Re-exports utilities | — | — |
| root | `src/index.ts` | — | - `createKnowledgeBase` | Create an orchestrator using default or provided config | config?: Partial<KnowledgeBaseConfig> | KnowledgeBaseOrchestrator |

## New Features (Rate Limiting & Error Collection)

### Rate Limiting Components

**DomainRateLimiter** (`src/scrapers/DomainRateLimiter.ts`)
- **Purpose**: Prevents overwhelming servers by enforcing time intervals between requests to the same domain
- **Key Methods**:
  - `waitForDomain(domain)`: Waits if necessary before allowing request
  - `setDomainInterval(domain, ms)`: Sets custom interval for specific domain
  - `getWaitTime(domain)`: Returns milliseconds to wait
  - `getStats(domain)`: Returns request statistics
- **Configuration**:
  - Default interval: 1000ms
  - Per-domain custom intervals
  - Can be disabled globally

### Error Collection Components

**ScrapingErrorCollector** (`src/scrapers/ScrapingErrorCollector.ts`)
- **Purpose**: Collects, categorizes, and reports errors/warnings during scraping
- **Severity Levels**:
  - `critical`: Fatal errors requiring immediate attention
  - `error`: Standard errors that failed operations
  - `recoverable`: Transient errors that might succeed on retry
  - `warning`: Non-critical issues (deprecations, performance)
  - `info`: Informational messages
- **Key Methods**:
  - `recordError(context, error, metadata)`: Records an error with automatic severity classification
  - `recordWarning(context, warning, metadata)`: Records a warning
  - `getIssues(context)`: Gets all issues for a URL/context
  - `getFormattedSummary()`: Returns formatted report
- **Automatic Classification**:
  - Connection/timeout errors → `recoverable`
  - Fatal/critical keywords → `critical`
  - Deprecation warnings → `warning`
  - Rate limit warnings → `info`

### Enhanced Content Fetcher

**ScraperAwareContentFetcher** (Enhanced)
- **New Capabilities**:
  - Integrated rate limiting per domain
  - Automatic error collection and reporting
  - Per-URL configuration support
  - Batch processing with individual settings
- **New Methods**:
  - `setDomainRateLimit(domain, ms)`: Configure domain-specific rate limits
  - `setUrlParameters(url, config)`: Set per-URL scraper parameters
  - `getRateLimiter()`: Access rate limiter for configuration
  - `getErrorCollector()`: Access error collector
  - `getScrapingIssues(url)`: Get issues for specific URL
- **Metadata Enhancement**:
  - Adds `rateLimitInfo` with wait times and request counts
  - Adds `scrapingIssues` with errors/warnings and severity breakdown
  - Preserves all scraper configuration and parameters

### Batch Processing

**KnowledgeBaseOrchestrator** (Enhanced)
- **New Method**: `processUrlsWithConfigs(urlConfigs, globalOptions)`
- **URL Configuration**:
  ```typescript
  {
    url: string;
    rateLimitMs?: number;        // Custom rate limit for this URL's domain
    scraperOptions?: any;         // Scraper-specific parameters
    processingOptions?: ProcessingOptions;
  }
  ```
- **Features**:
  - Per-URL rate limits applied before processing
  - Individual scraper parameters per URL
  - All settings saved to database metadata
  - Maintains SOLID principles through dependency injection

### Integration Example

```typescript
// Create KB with rate limiting and error collection
const kb = KnowledgeBaseFactory.createKnowledgeBase(config);

// Access enhanced fetcher
const fetcher = (kb as any).contentFetcher as ScraperAwareContentFetcher;

// Configure rate limits
fetcher.setDomainRateLimit('example.com', 2000);  // 2 second interval

// Process with per-URL settings
await kb.processUrlsWithConfigs([
  {
    url: 'https://example.com/page1',
    rateLimitMs: 3000,  // Override to 3 seconds
    scraperOptions: {
      scraperType: 'playwright',
      parameters: { headless: false }
    }
  },
  {
    url: 'https://api.example.com/data',
    rateLimitMs: 500,   // Faster for API
    scraperOptions: { scraperType: 'http' }
  }
]);

// Check for issues
const issues = fetcher.getScrapingIssues('https://example.com/page1');
console.log(`Errors: ${issues.summary.errorCount}`);
console.log(`Warnings: ${issues.summary.warningCount}`);
```

### Metadata Persistence

All rate limiting information and scraping issues are automatically saved to:
- **SQL Database**: `urls.metadata` column (JSON)
- **File Storage**: `.meta.json` files alongside content
- **Knowledge Entries**: Searchable metadata in knowledge store

### Testing Coverage

- **Unit Tests**: Individual component testing (95%+ coverage)
- **Integration Tests**: End-to-end batch processing tests
- **SOLID Compliance Tests**: Verify adherence to all SOLID principles
- **Coverage Report**: Automated verification of test coverage

## Tag System Architecture

The tagging system provides a hierarchical organization structure for URLs with the following components:

### Core Components

1. **SqlTagManager** - Manages tag lifecycle (CRUD operations, hierarchy)
2. **SqlUrlTagRepository** - Handles many-to-many URL-tag relationships
3. **SqlUrlRepositoryWithTags** - Enhanced URL repository with tag integration
4. **KnowledgeBaseOrchestratorWithTags** - Extended orchestrator for tag-based operations

### Database Schema

```sql
-- Tags table with hierarchical support
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  parent_id TEXT REFERENCES tags(id),
  description TEXT,
  color TEXT,
  created_at INTEGER NOT NULL
);

-- URL-Tags junction table
CREATE TABLE url_tags (
  url_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (url_id, tag_id)
);
```

### Tag Features

- **Hierarchical Organization**: Tags can have parent-child relationships
- **Many-to-Many Relationships**: URLs can have multiple tags, tags can reference multiple URLs
- **Batch Processing by Tags**: Process all URLs with specific tags
- **Tag-based Selection**: Filter and select URLs using tag criteria
- **Dynamic Tag Creation**: Tags are automatically created when assigned
- **Tag Persistence**: All tag relationships are stored in the database

### Usage Example

```typescript
import { KnowledgeBaseFactoryWithTags } from './src/factory/KnowledgeBaseFactoryWithTags';

const kb = KnowledgeBaseFactoryWithTags.createKnowledgeBaseWithTags(config);

// Create tag hierarchy
await kb.createTag('content');
await kb.createTag('technical', 'content');
await kb.createTag('tutorials', 'content');

// Process URLs with tags
await kb.processUrlsWithTags([
  { url: 'https://example.com/api', tags: ['technical', 'api'] },
  { url: 'https://example.com/guide', tags: ['tutorials'] }
]);

// Batch process by tag
await kb.processUrlsByTags(['technical'], { includeChildTags: true });
```

## Text Cleaning System Architecture

The text cleaning system provides comprehensive content sanitization and normalization through a flexible, extensible architecture:

### Core Components

1. **BaseTextCleaner** (`src/cleaners/BaseTextCleaner.ts`)
   - Abstract base class providing common functionality for all cleaners
   - Handles configuration management, validation, and result creation
   - Ensures consistent interface implementation across all cleaners

2. **TextCleanerRegistry** (`src/cleaners/TextCleanerRegistry.ts`)
   - Singleton registry for managing all available text cleaners
   - Provides discovery of cleaners by name or format support
   - Initializes default cleaners automatically
   - Methods:
     - `register(cleaner)`: Register a new cleaner
     - `getCleaner(name)`: Get cleaner by name
     - `getCleanersForFormat(format)`: Get cleaners supporting a format
     - `initializeDefaultCleaners()`: Set up built-in cleaners

3. **TextCleanerChain** (`src/cleaners/TextCleanerChain.ts`)
   - Implements Chain of Responsibility pattern for sequential processing
   - Processes text through multiple cleaners in priority order
   - Collects results from each stage for analysis
   - Methods:
     - `addCleaner(cleaner, config)`: Add cleaner to chain
     - `process(text, format)`: Process through entire chain
     - `clear()`: Remove all cleaners from chain

4. **TextCleanerConfigManager** (`src/cleaners/TextCleanerConfigManager.ts`)
   - Manages per-URL cleaner configurations
   - Stores configurations in memory (can be extended for persistence)
   - Supports batch configuration and pattern-based templates
   - Methods:
     - `setUrlConfig(url, cleanerName, config)`: Set URL-specific config
     - `batchSetConfig(urls, cleanerName, config)`: Configure multiple URLs
     - `applyConfigTemplate(pattern, cleanerName, config)`: Apply to pattern

5. **TextCleaningOrchestrator** (`src/cleaners/TextCleaningOrchestrator.ts`)
   - High-level coordinator for cleaning operations
   - Manages cleaner selection based on format and configuration
   - Integrates registry, chain, and config manager
   - Methods:
     - `cleanAuto(text, format, url?)`: Auto-select cleaners
     - `cleanWithCleaners(text, cleanerNames, format, url?)`: Use specific cleaners
     - `configureForUrl(url, configs)`: Configure cleaners for URL

6. **ContentProcessorWithCleaning** (`src/processors/ContentProcessorWithCleaning.ts`)
   - Decorator pattern implementation
   - Wraps existing content processors with cleaning capabilities
   - Preserves SOLID principles through composition
   - Features:
     - Optional cleaning based on configuration
     - Format detection and mapping
     - Original text preservation
     - Metadata tracking

### Available Cleaners

#### SanitizeHtmlCleaner
- **Purpose**: Remove dangerous HTML elements and sanitize markup
- **Features**:
  - Removes script tags, style tags, comments
  - Sanitizes attributes, removes event handlers
  - Configurable allowed tags and attributes
  - Multiple disallowed tags modes (discard, escape)
- **Configuration Options**:
  ```typescript
  {
    allowedTags: ['p', 'h1', 'h2', 'h3', 'ul', 'li', 'a'],
    allowedAttributes: {
      'a': ['href', 'title']
    },
    disallowedTagsMode: 'discard' | 'escape',
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedClasses: {},
    transformTags: {}
  }
  ```

#### XssCleaner
- **Purpose**: Prevent XSS attacks through content filtering
- **Features**:
  - Removes JavaScript URIs and protocols
  - Filters dangerous attributes (onclick, onerror, etc.)
  - Escapes special characters
  - Whitelist-based attribute filtering
- **Configuration Options**:
  ```typescript
  {
    whiteList: {
      a: ['href', 'title'],
      p: [],
      div: ['class']
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: false,
    escapeHtml: function(html) { return escaped; }
  }
  ```

#### VocaCleaner
- **Purpose**: Text normalization and manipulation
- **Features**:
  - Whitespace trimming and normalization
  - Control character removal
  - Case conversion (lower, upper, camel, etc.)
  - Character limit enforcement
- **Configuration Options**:
  ```typescript
  {
    trimWhitespace: true,
    normalizeWhitespace: true,
    removeControlCharacters: true,
    convertCase: 'lower' | 'upper' | 'camel' | 'kebab' | 'snake',
    maxLength: 10000
  }
  ```

#### StringJsCleaner
- **Purpose**: Advanced string operations
- **Features**:
  - HTML tag stripping
  - HTML entity decoding
  - Diacritic removal
  - Special character cleaning
- **Configuration Options**:
  ```typescript
  {
    stripHtml: true,
    decodeHtmlEntities: true,
    removeDiacritics: true,
    removeSpecialCharacters: true,
    preserveLinks: false
  }
  ```

#### RemarkCleaner
- **Purpose**: Markdown processing and cleaning
- **Features**:
  - Parse and clean Markdown syntax
  - Remove or modify specific elements
  - Format conversion
  - Link simplification
- **Configuration Options**:
  ```typescript
  {
    removeImages: false,
    simplifyLinks: true,
    removeCodeBlocks: false,
    removeBlockquotes: false,
    stripFormatting: false
  }
  ```

#### ReadabilityCleaner
- **Purpose**: Extract main content from web pages
- **Features**:
  - Remove ads, navigation, sidebars
  - Preserve article structure
  - Extract metadata (title, author, date)
  - Content scoring algorithm
- **Configuration Options**:
  ```typescript
  {
    extractMainContent: true,
    removeAds: true,
    preserveImages: true,
    minTextLength: 100,
    minScore: 20
  }
  ```

### Text Cleaning Flow

```
Input Text → Format Detection → Cleaner Selection → Chain Processing → Result
                                        ↓
                                Per-URL Config
```

1. **Input Processing**: Text from content processor
2. **Format Detection**: Determine text format (HTML, Markdown, Plain)
3. **Cleaner Selection**:
   - Auto-select based on format
   - Or use specified cleaners
   - Apply per-URL configuration
4. **Chain Processing**: Sequential processing through cleaners
5. **Result Generation**: Cleaned text with metadata

### Configuration Hierarchy

1. **Default Configuration**: Built into each cleaner
2. **Registry Configuration**: Set when registering cleaner
3. **URL-Specific Configuration**: Per-URL overrides
4. **Runtime Configuration**: Passed during processing

Priority: Runtime > URL-Specific > Registry > Default

### Integration Points

#### With Content Processing
```typescript
const processor = new ContentProcessorWithCleaning(baseProcessor);
const result = await processor.process(content, contentType, {
  textCleaning: {
    enabled: true,
    autoSelect: true,
    preserveOriginal: true
  }
});
```

#### With Knowledge Base
```typescript
const kb = KnowledgeBaseFactory.createKnowledgeBase(config);
const result = await kb.processUrl(url, {
  textCleaning: {
    enabled: true,
    cleanerNames: ['sanitize-html', 'xss']
  }
});
```

#### Standalone Usage
```typescript
const orchestrator = new TextCleaningOrchestrator(registry, configManager);
const result = await orchestrator.cleanAuto(htmlText, TextFormat.HTML);
```

### SOLID Compliance

- **Single Responsibility**: Each cleaner has one specific cleaning task
- **Open/Closed**: New cleaners can be added without modifying existing code
- **Liskov Substitution**: All cleaners implement ITextCleaner consistently
- **Interface Segregation**: Focused interfaces for different concerns
- **Dependency Inversion**: Depends on abstractions (ITextCleaner interface)

### Testing Coverage

- **Unit Tests**: Each cleaner tested individually
- **Integration Tests**: Chain processing and orchestration tests
- **Format Tests**: Format-specific cleaning scenarios
- **Configuration Tests**: Per-URL and batch configuration
- **Error Handling Tests**: Graceful failure scenarios

