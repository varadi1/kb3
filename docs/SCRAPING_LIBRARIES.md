# Scraping Libraries Integration

## Overview

KB3 now supports multiple scraping libraries that can be configured to handle different types of URLs. The system follows SOLID principles and allows for easy extension with new scraping libraries.

## Supported Scraping Libraries

1. **HTTP (Default)** - Basic HTTP fetcher for standard web pages
   - Fast and lightweight
   - No JavaScript support
   - Best for static HTML pages

2. **Playwright** - Browser automation for JavaScript-heavy sites
   - Full JavaScript rendering
   - Screenshot capabilities
   - PDF generation
   - Best for SPAs and dynamic content

3. **Crawl4AI** - AI-powered web crawling
   - Intelligent content extraction
   - Multi-page crawling
   - Best for news sites and blogs

4. **Firecrawl** - API-based scraping service (placeholder)
   - Requires API key
   - Clean markdown output
   - Best for documentation sites

5. **Docling** - Document extraction (IBM)
   - PDF, DOCX support
   - Table and figure extraction
   - Best for document files

6. **DeepDoctection** - Deep document analysis (placeholder)
   - Layout analysis
   - OCR capabilities
   - Best for complex PDFs

## Configuration

### Basic Configuration

```typescript
const config = {
  scraping: {
    enabledScrapers: ['http'],
    defaultScraper: 'http'
  }
};
```

### Advanced Configuration

```typescript
const config = {
  scraping: {
    enabledScrapers: ['http', 'playwright', 'crawl4ai'],
    defaultScraper: 'http',

    scraperRules: [
      {
        pattern: '*.example.com/app/*',
        scraperName: 'playwright',
        priority: 10
      },
      {
        pattern: /\.pdf$/,
        scraperName: 'docling',
        priority: 20
      }
    ],

    scraperConfigs: {
      firecrawl: {
        apiKey: 'your-api-key'
      }
    }
  }
};
```

## URL-to-Scraper Mapping

### Pattern Types

1. **Exact Match**: `'https://example.com'`
2. **Wildcard**: `'*.example.com/*'`
3. **RegExp**: `/^https:\/\/.*\.example\.com/`

### Priority System

Rules with higher priority values are evaluated first:
- Priority 20: Document files (.pdf, .docx)
- Priority 10: JavaScript-heavy sites
- Priority 0: Default rules

### Batch Configuration

```typescript
selector.setScraperForUrls(
  ['site1.com', 'site2.com', 'site3.com'],
  'playwright',
  10
);
```

## Creating Custom Scrapers

### Step 1: Implement IScraper

```typescript
import { BaseScraper } from 'kb3/scrapers';
import { ScrapedContent } from 'kb3/interfaces';

class MyCustomScraper extends BaseScraper {
  constructor() {
    super('my-scraper', {
      javascript: true,
      cookies: true
    });
  }

  async scrape(url: string): Promise<ScrapedContent> {
    // Your scraping logic
    return {
      url,
      content: Buffer.from('content'),
      mimeType: 'text/html',
      metadata: {},
      scraperName: this.name,
      timestamp: new Date()
    };
  }

  canHandle(url: string): boolean {
    return url.includes('special-site.com');
  }
}
```

### Step 2: Register the Scraper

```typescript
const registry = ScraperRegistry.getInstance();
registry.register('my-scraper', new MyCustomScraper());
```

### Step 3: Configure Rules

```typescript
const selector = new ScraperSelector(registry);
selector.addRule({
  pattern: 'special-site.com',
  scraperName: 'my-scraper',
  priority: 10
});
```

## SOLID Principles Compliance

### Single Responsibility
- `IScraper`: Only responsible for scraping content
- `ScraperRegistry`: Only manages scraper registration
- `ScraperSelector`: Only handles scraper selection

### Open/Closed Principle
- Add new scrapers without modifying existing code
- Extend `BaseScraper` for new implementations
- Add selection strategies without changing selector

### Liskov Substitution
- All scrapers are substitutable for `IScraper`
- `ScraperAwareContentFetcher` substitutes `IContentFetcher`

### Interface Segregation
- `IScraper` interface is focused and minimal
- Optional features via `ScraperFeatures`

### Dependency Inversion
- Components depend on `IScraper` abstraction
- Dependency injection throughout

## Usage Examples

### Process URLs with Auto-Selection

```typescript
const kb = createKnowledgeBase(config);

const results = await kb.processUrls([
  'https://spa-app.com',          // Uses Playwright
  'https://news-site.com',         // Uses Crawl4AI
  'https://example.com/doc.pdf',   // Uses Docling
  'https://static-site.com'        // Uses HTTP
]);
```

### Group URLs by Scraper

```typescript
const groups = selector.groupUrlsByScaper(urls);
for (const [scraper, urlBatch] of groups) {
  const results = await scraper.scrapeBatch(urlBatch);
}
```

## Testing

### Unit Tests
```bash
npm test -- --testPathPattern="scrapers"
```

### SOLID Compliance Tests
```bash
npm test -- --testPathPattern="ScraperSOLID"
```

## Performance Considerations

1. **Batch Processing**: Group URLs by scraper for efficiency
2. **Concurrency**: Configure concurrency per scraper
3. **Caching**: Implement caching at scraper level
4. **Timeouts**: Set appropriate timeouts per scraper type

## Security Considerations

1. **API Keys**: Store securely in environment variables
2. **URL Validation**: All scrapers validate URLs
3. **Content Limits**: Configure max content size
4. **Proxy Support**: Available for supported scrapers

## Future Extensions

The architecture supports adding:
- Puppeteer scraper
- Selenium scraper
- Custom API clients
- Headless Chrome alternatives
- AI-enhanced scrapers

## Migration Guide

Existing code continues to work without changes. To enable scraping:

1. Add `scraping` configuration
2. Enable desired scrapers
3. Define URL rules
4. Process URLs normally

The system automatically selects appropriate scrapers based on configuration.