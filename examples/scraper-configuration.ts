/**
 * Example: Configuring Scraping Libraries for KB3
 *
 * This example shows how to configure different scraping libraries
 * for specific URLs and use cases.
 */

import { createDefaultConfiguration } from '../src/config/Configuration';
import { KnowledgeBaseFactory } from '../src/factory/KnowledgeBaseFactory';

// Example 1: Basic configuration with HTTP scraper (default)
const basicConfig = createDefaultConfiguration({
  scraping: {
    enabledScrapers: ['http'],
    defaultScraper: 'http'
  }
});

// Example 2: Advanced configuration with multiple scrapers
const advancedConfig = createDefaultConfiguration({
  scraping: {
    // Enable multiple scraping libraries
    enabledScrapers: ['http', 'playwright', 'crawl4ai', 'firecrawl', 'docling'],

    // Set default scraper for unmatched URLs
    defaultScraper: 'http',

    // Define URL-to-scraper mapping rules
    scraperRules: [
      // Use Playwright for JavaScript-heavy SPAs
      {
        pattern: '*.example.com/app/*',
        scraperName: 'playwright',
        priority: 10
      },

      // Use Crawl4AI for news sites and blogs
      {
        pattern: /^https:\/\/(www\.)?(medium\.com|dev\.to|hackernews\.com)/,
        scraperName: 'crawl4ai',
        priority: 10
      },

      // Use Docling for document URLs
      {
        pattern: '*.pdf',
        scraperName: 'docling',
        priority: 20
      },
      {
        pattern: '*.docx',
        scraperName: 'docling',
        priority: 20
      },

      // Use Firecrawl for API documentation
      {
        pattern: 'docs.*.com',
        scraperName: 'firecrawl',
        priority: 15
      }
    ],

    // Configuration for specific scrapers
    scraperConfigs: {
      firecrawl: {
        apiKey: process.env.FIRECRAWL_API_KEY
      }
    }
  }
});

// Example 3: Domain-based configuration
const domainConfig = createDefaultConfiguration({
  scraping: {
    enabledScrapers: ['http', 'playwright'],
    defaultScraper: 'http',
    scraperRules: [
      // Use Playwright for all GitHub pages
      {
        pattern: 'github.com',
        scraperName: 'playwright',
        priority: 10
      },
      // Use Playwright for all LinkedIn pages
      {
        pattern: 'linkedin.com',
        scraperName: 'playwright',
        priority: 10
      }
    ]
  }
});

// Example 4: Using the configured scrapers
async function demonstrateScraperUsage() {
  // Create knowledge base with scraper configuration
  const kb = KnowledgeBaseFactory.createKnowledgeBase(advancedConfig);

  // Process URLs - the system will automatically select appropriate scrapers
  const results = await kb.processUrls([
    'https://example.com/app/dashboard',        // Will use Playwright
    'https://medium.com/article',               // Will use Crawl4AI
    'https://example.com/report.pdf',           // Will use Docling
    'https://docs.api.com/reference',           // Will use Firecrawl
    'https://regular-site.com'                  // Will use default HTTP scraper
  ]);

  console.log('Processing results:', results);
}

// Example 5: Dynamic scraper configuration
async function configureDynamicScrapers() {
  const kb = KnowledgeBaseFactory.createKnowledgeBase(basicConfig);

  // Access the scraper-aware fetcher if configured
  const fetcher = kb as any; // Would need proper typing in production

  if (fetcher.getScraperSelector && fetcher.getScraperRegistry) {
    const selector = fetcher.getScraperSelector();
    const registry = fetcher.getScraperRegistry();

    // Dynamically add rules at runtime
    selector.addRule({
      pattern: 'special-site.com',
      scraperName: 'playwright',
      priority: 100
    });

    // Batch configure URLs
    selector.setScraperForUrls(
      ['site1.com', 'site2.com', 'site3.com'],
      'crawl4ai',
      50
    );
  }
}

// Example 6: Custom scraper implementation
import { BaseScraper } from '../src/scrapers/BaseScraper';
import { ScrapedContent, ScraperOptions } from '../src/interfaces/IScraper';

class CustomAPIScraper extends BaseScraper {
  constructor() {
    super('custom-api', {
      javascript: false,
      cookies: true,
      proxy: false,
      screenshot: false,
      pdfGeneration: false,
      multiPage: false
    });
  }

  async scrape(url: string, options?: ScraperOptions): Promise<ScrapedContent> {
    // Custom scraping logic here
    // For example, use a specialized API client

    return {
      url,
      content: Buffer.from('Custom scraped content'),
      mimeType: 'application/json',
      metadata: {
        title: 'Custom API Response',
        statusCode: 200
      },
      scraperName: this.name,
      timestamp: new Date()
    };
  }

  canHandle(url: string): boolean {
    // Only handle specific API endpoints
    return url.includes('/api/v2/');
  }
}

// Register custom scraper
async function registerCustomScraper() {
  const config = createDefaultConfiguration({
    scraping: {
      enabledScrapers: ['http', 'custom-api'],
      defaultScraper: 'http'
    }
  });

  // Would need to register the custom scraper with the factory
  // ScraperFactory.registerCustomScrapers([
  //   { name: 'custom-api', scraper: new CustomAPIScraper() }
  // ]);

  const kb = KnowledgeBaseFactory.createKnowledgeBase(config);

  // Process API endpoint
  const result = await kb.processUrl('https://example.com/api/v2/data');
  console.log('Custom scraper result:', result);
}

// Export example functions
export {
  basicConfig,
  advancedConfig,
  domainConfig,
  demonstrateScraperUsage,
  configureDynamicScrapers,
  registerCustomScraper,
  CustomAPIScraper
};