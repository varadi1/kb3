# KB3 - Knowledge Base System Development Guidelines

## Project Overview

KB3 is a scalable knowledge base system built with TypeScript that processes URLs and documents while strictly adhering to SOLID principles. The system can detect content types, fetch content from various sources, process different file formats, and store knowledge with metadata.

## Architecture Principles

### SOLID Compliance

This codebase **MUST** follow SOLID principles at all times:

1. **Single Responsibility Principle (SRP)**
   - Each class has ONE reason to change
   - No class should handle multiple concerns
   - Example: `HttpFetcher` only fetches HTTP content, nothing else

2. **Open/Closed Principle (OCP)**
   - Classes are open for extension, closed for modification
   - Use registries to add new functionality
   - Never modify existing classes to add features

3. **Liskov Substitution Principle (LSP)**
   - All implementations must be substitutable for their interfaces
   - No implementation should break the contract of its interface
   - Example: All `IContentProcessor` implementations must behave consistently

4. **Interface Segregation Principle (ISP)**
   - Keep interfaces small and focused
   - Clients should not depend on methods they don't use
   - Example: `IUrlDetector` only has `canHandle()` and `detect()`

5. **Dependency Inversion Principle (DIP)**
   - Depend on abstractions, not concretions
   - Use dependency injection throughout
   - High-level modules should not depend on low-level modules

## Project Structure

```
kb3/
├── src/
│   ├── interfaces/       # Abstract contracts (ISP)
│   ├── detectors/        # URL type detection (SRP)
│   ├── fetchers/         # Content retrieval (SRP)
│   ├── processors/       # Content processing (SRP)
│   ├── storage/          # Persistence layer (SRP)
│   ├── orchestrator/     # Main coordinator (DIP)
│   ├── factory/          # Dependency injection (DIP)
│   ├── config/           # Configuration management
│   └── utils/            # Utilities and error handling
├── tests/
│   ├── solid-compliance/ # SOLID principle tests
│   ├── integration/      # System integration tests
│   └── unit/            # Unit tests
├── data/                # Runtime data storage
│   ├── example-files/    # Example files for processing
│   └── files/            # Processed files storage
├── test-data/           # Test fixtures and samples
│   └── files/            # Test files
├── demo-data/           # Demo data for examples
│   └── files/            # Demo files
├── dev-data/            # Development data
│   └── files/            # Development files
├── verify-data/         # Verification test data
│   └── files/            # Verification files
├── examples/            # Sample data and usage
│   └── configurations/   # Configuration examples
└── docs/                # Documentation
```

## Folder Structure Organization Rules

### CRITICAL: Maintain Clean Folder Structure

The folder structure is organized by purpose and MUST be respected at all times. Each directory has a specific role and content should ONLY go where it belongs.

#### Directory Usage Guidelines

**Source Code (`src/`)**
- Production code ONLY
- No test files, examples, or temporary code
- Each subdirectory follows Single Responsibility Principle

**Tests (`tests/`)**
- `tests/unit/` - Unit tests for individual components
- `tests/integration/` - Integration tests between components
- `tests/solid-compliance/` - SOLID principle verification tests
- NO temporary test files - use `dev-data/` for experiments

**Data Directories**
- `data/` - Production runtime data and processed content
  - Downloaded web pages
  - Processed documents
  - Knowledge base storage
  - User-uploaded files
- `test-data/` - Static test fixtures only
  - Sample files for tests
  - Mock data for testing
  - NEVER modify during runtime
- `demo-data/` - Demo and presentation materials
  - Sample files for demonstrations
  - Example outputs
- `dev-data/` - Development experiments
  - Temporary test files
  - Development scratchpad
  - Experimental data (can be safely deleted)
- `verify-data/` - Verification and validation data
  - Golden test files
  - Expected outputs for comparison

**Documentation (`docs/`)**
- Technical documentation
- API documentation
- Architecture diagrams
- Design decisions
- NO source code, NO test files

**Examples (`examples/`)**
- Working code examples
- Configuration samples
- Usage demonstrations
- NO test code, NO incomplete code

#### Strict Rules

1. **NEVER mix concerns between folders**
   ```
   ❌ WRONG:
   - Putting test files in src/
   - Storing downloaded content in test-data/
   - Creating temp test files in tests/
   - Adding documentation to data/

   ✅ CORRECT:
   - Test files go in tests/
   - Downloaded content goes in data/
   - Temp test files go in dev-data/
   - Documentation goes in docs/
   ```

2. **File Placement Examples**
   ```
   Downloaded webpage → data/files/webpage.html
   Test fixture → test-data/files/sample.pdf
   Temp test file → dev-data/files/temp-test.txt
   Unit test → tests/unit/MyComponent.test.ts
   API docs → docs/api-reference.md
   Usage example → examples/basic-usage.ts
   ```

3. **Data Directory Hierarchy**
   - Always use subdirectories within data folders
   - Group by type or date when appropriate
   - Example structure:
     ```
     data/
     ├── files/           # General file storage
     ├── downloads/       # Downloaded content
     │   ├── 2024-01/    # By date if needed
     │   └── pdfs/       # Or by type
     └── knowledge/       # Processed knowledge base
     ```

4. **Test Data Management**
   - `test-data/` is version controlled and static
   - `dev-data/` is gitignored and ephemeral
   - Never write to `test-data/` during test execution
   - Use `dev-data/` for any temporary test outputs

5. **Clean-up Requirements**
   - `dev-data/` can be cleared anytime
   - `data/` should have a retention policy
   - `test-data/` must remain stable for tests
   - Old files in `verify-data/` need explicit removal

## Development Rules

### 1. Adding New Features

**NEVER** modify existing classes to add features. Instead:

```typescript
// WRONG - Violates OCP
class HttpFetcher {
  fetch() { /* original */ }
  fetchWithCache() { /* NEW - WRONG! */ }
}

// CORRECT - Extension through composition
class CachedHttpFetcher implements IContentFetcher {
  constructor(private fetcher: HttpFetcher, private cache: ICache) {}
  fetch() { /* use cache + fetcher */ }
}
```

### 2. Creating New Components

All new components MUST:
- Implement an interface from `src/interfaces/`
- Have a single, clear responsibility
- Be registered in the appropriate registry
- Include comprehensive tests

Example for adding a new processor:
```typescript
// 1. Implement the interface
class MarkdownProcessor extends BaseProcessor {
  canProcess(type: ContentType): boolean {
    return type === ContentType.MARKDOWN;
  }

  async process(content: Buffer): Promise<ProcessingResult> {
    // Process markdown content
  }
}

// 2. Register in ProcessorRegistry
registry.register(ContentType.MARKDOWN, new MarkdownProcessor());
```

### 3. Testing Requirements

Every component MUST have:
- Unit tests covering all public methods
- SOLID compliance tests
- Integration tests with other components

Test structure:
```typescript
describe('ComponentName', () => {
  describe('SOLID Compliance', () => {
    test('follows Single Responsibility', () => {});
    test('is open for extension', () => {});
    test('is substitutable', () => {});
  });

  describe('Functionality', () => {
    test('handles normal cases', () => {});
    test('handles edge cases', () => {});
    test('handles errors gracefully', () => {});
  });
});
```

### 4. Error Handling

All errors MUST be:
- Properly categorized (use `ErrorHandler.categorizeError()`)
- Logged with context
- Collected for analysis (use `IErrorCollector`)
- Handled gracefully without breaking the system

```typescript
try {
  const result = await processor.process(content);
} catch (error) {
  const categorized = ErrorHandler.categorizeError(error);
  logger.error('Processing failed', { error: categorized, context });

  // Collect error for analysis
  if (errorCollector) {
    errorCollector.recordError(context, error, {
      scraper: scraperName,
      url: currentUrl
    });
  }

  if (categorized.recoverable) {
    return fallbackResult;
  }
  throw categorized;
}
```

#### Error Severity Classification

Classify errors by severity:
- **Critical**: System failures, invalid configuration
- **Error**: Standard processing errors
- **Recoverable**: Timeouts, network issues (can retry)
- **Warning**: Slow responses, deprecations
- **Info**: General information

### 5. Dependency Injection

Always use constructor injection:

```typescript
// CORRECT
class MyClass {
  constructor(
    private fetcher: IContentFetcher,
    private processor: IContentProcessor,
    private store: IKnowledgeStore
  ) {}
}

// WRONG - Hard dependencies
class MyClass {
  private fetcher = new HttpFetcher();  // WRONG!
}
```

### 6. Configuration

All configuration should be:
- Type-safe (use TypeScript interfaces)
- Validated before use
- Provided through the factory

```typescript
const config = createDefaultConfiguration({
  processing: { concurrency: 5 },
  fetching: { timeout: 30000 }
});

const kb = KnowledgeBaseFactory.createKnowledgeBase(config);
```

## Code Quality Standards

### TypeScript Settings

The project uses strict TypeScript settings. NEVER disable these:
- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`

### Naming Conventions

- Interfaces: `I` prefix (e.g., `IContentFetcher`)
- Abstract classes: `Base` prefix (e.g., `BaseProcessor`)
- Registries: `Registry` suffix (e.g., `ProcessorRegistry`)
- Test files: `.test.ts` suffix
- Private methods: `_` prefix (e.g., `_validateInput()`)

### Documentation

All public APIs MUST have JSDoc comments:

```typescript
/**
 * Processes content and extracts metadata
 * @param content - The raw content buffer
 * @param options - Processing options
 * @returns Promise resolving to processing result
 * @throws ProcessingError if content is invalid
 */
async process(content: Buffer, options?: ProcessingOptions): Promise<ProcessingResult>
```

## Common Tasks

### Working with Tags

Tags allow organizing URLs into logical groups for batch processing:

1. **Create tags with hierarchy**:
```typescript
const kb = KnowledgeBaseFactoryWithTags.createKnowledgeBaseWithTags(config);
await kb.createTag('documentation');
await kb.createTag('api-docs', 'documentation'); // Child of documentation
```

2. **Process URLs with tags**:
```typescript
const urlsWithTags = [
  { url: 'https://example.com/api', tags: ['api-docs', 'v1'] },
  { url: 'https://example.com/guide', tags: ['documentation', 'tutorial'] }
];
await kb.processUrlsWithTags(urlsWithTags);
```

3. **Batch process by tags**:
```typescript
// Process all URLs with 'api-docs' tag
await kb.processUrlsByTags(['api-docs']);

// Process URLs with ALL specified tags
await kb.processUrlsByTags(['tutorial', 'beginner'], { requireAllTags: true });

// Include child tags in processing
await kb.processUrlsByTags(['documentation'], { includeChildTags: true });
```

### Adding a New URL Detector

1. Create the detector in `src/detectors/`:
```typescript
export class MyDetector extends BaseUrlDetector {
  canHandle(url: string): boolean { /* ... */ }
  async detect(url: string): Promise<UrlClassification> { /* ... */ }
}
```

2. Register in `UrlDetectorRegistry`:
```typescript
registry.register('my-detector', new MyDetector());
```

3. Add tests in `tests/unit/detectors/`

### Adding a New Content Processor

1. Create processor in `src/processors/`
2. Implement `IContentProcessor` interface
3. Register in `ProcessorRegistry`
4. Add tests including SOLID compliance

### Adding a New Scraping Library

1. Create the scraper in `src/scrapers/`:
```typescript
import { BaseScraper } from './BaseScraper';
import { ScraperOptions, ScrapedContent, ScraperType } from '../interfaces/IScraper';
import { MyScraperParameters } from '../interfaces/IScraperParameters';

export class MyCustomScraper extends BaseScraper {
  constructor() {
    super('my-scraper', {
      javascript: true,  // Supports JS rendering
      cookies: true,     // Supports cookies
      proxy: false,      // Proxy support
      screenshot: false, // Can take screenshots
      pdfGeneration: false,
      multiPage: false
    });
  }

  async scrape(url: string, options?: ScraperOptions): Promise<ScrapedContent> {
    // Check URL validity
    if (!this.canHandle(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    this.validateOptions(options);
    const mergedOptions = this.mergeOptions(options);
    const params = this.extractParameters(mergedOptions);

    // Your scraping logic here
    // Use dynamic imports for optional dependencies:
    try {
      const library = require('your-scraping-library');
      // Scraping implementation
    } catch {
      // Return mock or throw error
      return this.getMockResponse(url);
    }

    return {
      url,
      content: Buffer.from('scraped content'),
      mimeType: 'text/html',
      metadata: {
        scraperConfig: params,
        scraperMetadata: { /* custom metadata */ }
      },
      scraperName: this.name,
      timestamp: new Date()
    };
  }

  canHandle(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }
```

2. Register the scraper:
```typescript
const registry = ScraperRegistry.getInstance();
registry.register('my-scraper', new MyCustomScraper());
```

3. Configure URL rules:
```typescript
const config = createDefaultConfiguration({
  scraping: {
    enabledScrapers: ['http', 'my-scraper'],
    scraperRules: [
      {
        pattern: 'special-site.com',
        scraperName: 'my-scraper',
        priority: 10
      }
    ]
  }
});
```

### Configuring Scrapers for URLs

#### Method 1: Configuration with Parameters
Set up scraper rules with detailed parameters:

```typescript
import { ScraperAwareContentFetcher } from './src/fetchers/ScraperAwareContentFetcher';
import { BatchConfigurationManager } from './src/scrapers/BatchConfigurationManager';

const config = createDefaultConfiguration({
  scraping: {
    enabledScrapers: ['http', 'playwright', 'docling', 'crawl4ai'],
    defaultScraper: 'http',
    scraperRules: [
      { pattern: '*.linkedin.com/*', scraperName: 'playwright', priority: 20 },
      { pattern: /\.pdf$/, scraperName: 'docling', priority: 25 },
      { pattern: 'medium.com', scraperName: 'crawl4ai', priority: 15 }
    ]
  }
});

// Configure URL-specific parameters
const kb = KnowledgeBaseFactory.createKnowledgeBase(config);
const fetcher = (kb as any).contentFetcher as ScraperAwareContentFetcher;

// Set Playwright parameters for a specific URL
fetcher.setUrlParameters('https://app.example.com', {
  scraperType: 'playwright',
  parameters: {
    headless: true,
    viewport: { width: 1920, height: 1080 },
    waitUntil: 'networkidle',
    screenshot: true,
    cookies: [{ name: 'session', value: 'abc123', domain: '.example.com' }]
  }
});

// Set Crawl4AI parameters
fetcher.setUrlParameters('https://blog.example.com', {
  scraperType: 'crawl4ai',
  parameters: {
    maxDepth: 2,
    jsExecution: true,
    extractionStrategy: 'llm',
    magic: true,
    onlyMainContent: true
  }
});

// Set Docling parameters
fetcher.setUrlParameters('https://docs.example.com/report.pdf', {
  scraperType: 'docling',
  parameters: {
    format: 'markdown',
    ocr: true,
    tableStructure: true,
    exportTables: true
  }
});
```

#### Method 2: Batch URL Configuration
Configure multiple URLs at once programmatically:

```typescript
const kb = KnowledgeBaseFactory.createKnowledgeBase(config);

// Access the scraper selector (if needed for dynamic configuration)
const fetcher = kb as any;
if (fetcher.contentFetcher?.getScraperSelector) {
  const selector = fetcher.contentFetcher.getScraperSelector();

  // Set scraper for a batch of URLs
  selector.setScraperForUrls(
    ['https://site1.com', 'https://site2.com', 'https://site3.com'],
    'crawl4ai',  // scraper name
    10           // priority
  );

  // Add individual rules
  selector.addRule({
    pattern: '*.example.com/api/*',
    scraperName: 'firecrawl',
    priority: 20
  });
}
```

#### Method 3: Domain-Based Strategy
Use a domain-based fallback strategy:

```typescript
const strategy = new DomainBasedSelectionStrategy();
strategy.setDomainScraper('example.com', 'playwright');
strategy.setDomainScraper('api.service.com', 'firecrawl');

selector.setFallbackStrategy(strategy);
```

#### Priority System
Rules with higher priority values are evaluated first:
- 25+: Critical patterns (e.g., file extensions)
- 20: Specific URL matches
- 15: Domain patterns
- 10: General patterns
- 0-5: Low-priority fallbacks

### Extending Storage

1. Implement `IKnowledgeStore` or `IFileStorage`
2. Ensure atomicity and consistency
3. Add to factory configuration options
4. Test with concurrent operations

### Adding Rate Limiting to a Component

1. Inject `IRateLimiter` interface:
```typescript
class MyFetcher {
  constructor(
    private rateLimiter: IRateLimiter
  ) {}

  async fetch(url: string): Promise<Content> {
    const domain = DomainRateLimiter.extractDomain(url);
    await this.rateLimiter.waitForDomain(domain);
    this.rateLimiter.recordRequest(domain);

    // Perform fetch
    return content;
  }
}
```

2. Configure rate limits:
```typescript
rateLimiter.setDomainInterval('api.example.com', 2000);
```

3. Test rate limiting behavior

### Adding Error Collection to a Component

1. Inject `IErrorCollector` interface:
```typescript
class MyProcessor {
  constructor(
    private errorCollector: IErrorCollector
  ) {}

  async process(content: Buffer): Promise<Result> {
    try {
      // Process content
    } catch (error) {
      this.errorCollector.recordError(
        'processing-context',
        error,
        { contentType, size }
      );
      throw error;
    }
  }
}
```

2. Monitor errors:
```typescript
const issues = errorCollector.getIssues('context');
if (issues.summary.criticalErrors > 0) {
  // Handle critical errors
}
```

### Implementing Batch Processing with Per-URL Settings

1. Define URL configurations:
```typescript
interface UrlConfig {
  url: string;
  rateLimitMs?: number;
  scraperOptions?: ScraperOptions;
  processingOptions?: ProcessingOptions;
}
```

2. Process with individual settings:
```typescript
async processUrlsWithConfigs(
  configs: UrlConfig[],
  globalOptions: ProcessingOptions
): Promise<Result[]> {
  // Apply per-URL rate limits
  for (const config of configs) {
    if (config.rateLimitMs) {
      const domain = extractDomain(config.url);
      rateLimiter.setDomainInterval(domain, config.rateLimitMs);
    }
  }

  // Process with merged options
  const results = [];
  for (const config of configs) {
    const options = { ...globalOptions, ...config.processingOptions };
    results.push(await processUrl(config.url, options));
  }

  return results;
}
```

## Testing Commands

```bash
# Run all tests
npm test

# Run SOLID compliance tests only
npm run test:solid

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- SingleResponsibility.test.ts
```

## Performance Considerations

1. **Use streaming for large files**: Don't load entire files into memory
2. **Implement connection pooling**: Reuse HTTP connections
3. **Add caching strategically**: Cache expensive operations
4. **Limit concurrency**: Use the configuration to control parallel operations
5. **Lazy load processors**: Only instantiate when needed
6. **Implement rate limiting**: Respect server limits and prevent overwhelming targets
7. **Batch requests by domain**: Group URLs to optimize rate limiting

## Security Guidelines

1. **Validate all URLs**: Use `ValidationUtils.validateUrl()`
2. **Sanitize file paths**: Prevent directory traversal
3. **Limit file sizes**: Configure maximum sizes
4. **Use timeouts**: Prevent hanging operations
5. **Validate content types**: Don't trust file extensions alone

## Debugging

Enable debug logging:
```typescript
const config = createDevelopmentConfiguration({
  logging: { level: 'debug' }
});
```

Use the error categorization for troubleshooting:
```typescript
const error = ErrorHandler.categorizeError(e);
console.log('Error category:', error.category);
console.log('Recoverable:', error.recoverable);
```

### Tracking Scraper Usage and Parameters

The system automatically tracks which scraper and parameters were used for each URL:

1. **Processing Result**: Available immediately after processing
```typescript
const result = await kb.processUrl('https://example.com');
console.log('Scraper used:', result.metadata.scraperUsed);
console.log('Parameters:', result.metadata.scraperConfig);
console.log('Custom metadata:', result.metadata.scraperMetadata);
```

2. **Database Storage**: Persisted for future reference
- **URLs table** (`urls.metadata`): Stores complete scraper configuration as JSON
- **Knowledge entries table** (`knowledge_entries.metadata`): Includes searchable scraper metadata
- **File storage** (`.meta.json` files): Records scraper config and results

3. **Query Scraper Usage**: (If you extend the system)
```typescript
// Example query to find all URLs processed by a specific scraper
const sql = `
  SELECT url, json_extract(metadata, '$.scraperUsed') as scraper
  FROM urls
  WHERE json_extract(metadata, '$.scraperUsed') = 'playwright'
`;
```

## Continuous Improvement

When enhancing the system:

1. **Maintain backwards compatibility**: Never break existing interfaces
2. **Add deprecation notices**: Give time before removing features
3. **Document breaking changes**: If absolutely necessary
4. **Increase test coverage**: Aim for >90%
5. **Refactor regularly**: Keep code clean and maintainable

## Example Usage

### Basic Usage
```typescript
import { createKnowledgeBase } from 'kb3';

const kb = createKnowledgeBase();
const result = await kb.processUrl('https://example.com/document.pdf');
console.log('Processed:', result.metadata);
```

### Advanced Configuration
```typescript
import { KnowledgeBaseFactory, createDefaultConfiguration } from 'kb3';

const config = createDefaultConfiguration({
  processing: {
    concurrency: 10,
    timeout: 60000
  },
  storage: {
    knowledgeStore: {
      type: 'file',
      path: './data/knowledge'
    }
  }
});

const kb = KnowledgeBaseFactory.createKnowledgeBase(config);

// Process multiple URLs
const results = await kb.processUrls([
  'https://example.com/doc1.pdf',
  'https://example.com/doc2.html'
]);
```

### Custom Extension
```typescript
import { BaseProcessor, ProcessorRegistry } from 'kb3';

class CustomProcessor extends BaseProcessor {
  async process(content: Buffer): Promise<ProcessingResult> {
    // Custom processing logic
  }
}

// Register the processor
const registry = ProcessorRegistry.getInstance();
registry.register('custom', new CustomProcessor());
```

## Important Notes

1. **NEVER violate SOLID principles** - The architecture depends on it
2. **Always write tests first** - TDD is encouraged
3. **Keep interfaces stable** - Changes affect many components
4. **Document edge cases** - Help future developers
5. **Review the examples** - They show best practices

## Questions or Issues?

- Check existing tests for examples
- Review the interfaces for contracts
- Look at factory patterns for dependency injection
- Ensure SOLID compliance in all changes

Remember: **Clean architecture > Quick fixes**