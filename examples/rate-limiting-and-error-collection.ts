/**
 * Example: Using Rate Limiting and Error Collection with Scrapers
 *
 * This example demonstrates how to configure and use the new rate limiting
 * and error collection features while maintaining SOLID principles.
 */

import { KnowledgeBaseFactory, createDefaultConfiguration } from '../src';
import { ScraperAwareContentFetcher } from '../src/fetchers/ScraperAwareContentFetcher';

async function demonstrateRateLimitingAndErrorCollection() {
  // 1. Configure with rate limiting and error collection
  const config = createDefaultConfiguration({
    scraping: {
      enabledScrapers: ['http', 'playwright', 'crawl4ai'],
      defaultScraper: 'http',

      // Rate limiting configuration
      rateLimiting: {
        enabled: true,
        defaultIntervalMs: 1000, // 1 second between requests by default
        domainIntervals: {
          'api.github.com': 2000,        // 2 seconds for GitHub API
          'linkedin.com': 5000,           // 5 seconds for LinkedIn
          'example.com': 500,             // 0.5 seconds for example.com
          'fast-api.service.com': 100    // 100ms for fast API
        }
      },

      // Error collection configuration
      errorCollection: {
        enabled: true,
        includeStackTraces: true,
        maxErrorsPerContext: 100,
        clearAfterSuccess: false
      },

      // Scraper rules
      scraperRules: [
        { pattern: 'linkedin.com', scraperName: 'playwright', priority: 10 },
        { pattern: 'api.github.com', scraperName: 'http', priority: 10 }
      ]
    }
  });

  // 2. Create knowledge base with configuration
  const kb = KnowledgeBaseFactory.createKnowledgeBase(config);

  // 3. Access the scraper-aware fetcher for advanced configuration
  const fetcher = (kb as any).contentFetcher as ScraperAwareContentFetcher;

  // 4. Set additional domain-specific rate limits dynamically
  fetcher.setDomainRateLimit('slow-site.com', 10000);  // 10 seconds
  fetcher.setDomainRateLimit('medium-site.com', 3000); // 3 seconds

  // 5. Process URLs with automatic rate limiting
  const urls = [
    'https://example.com/page1',
    'https://example.com/page2',  // Will wait 500ms after page1
    'https://api.github.com/users/octocat',
    'https://api.github.com/repos/nodejs/node', // Will wait 2s after previous GitHub request
    'https://slow-site.com/data',
    'https://example.com/page3'   // Will wait based on last example.com request
  ];

  console.log('Processing URLs with rate limiting...\n');

  for (const url of urls) {
    console.log(`Processing: ${url}`);
    const startTime = Date.now();

    try {
      // Process with specific options
      const result = await kb.processUrl(url, {
        scraperSpecific: {
          // These options will be passed to the scraper
          collectErrors: true,
          errorContext: url,
          rateLimitMs: undefined, // Use configured limits
          skipRateLimit: false    // Apply rate limiting
        }
      });

      const elapsed = Date.now() - startTime;
      console.log(`  ✓ Processed in ${elapsed}ms`);

      // Check if rate limiting was applied
      if (result.metadata?.rateLimitInfo) {
        const { waitedMs, domain, requestNumber } = result.metadata.rateLimitInfo;
        console.log(`  ⏱ Rate limited: waited ${waitedMs}ms for domain ${domain} (request #${requestNumber})`);
      }

      // Check for collected errors/warnings
      if (result.metadata?.scrapingIssues) {
        const { errors, warnings, summary } = result.metadata.scrapingIssues;
        if (summary.errorCount > 0 || summary.warningCount > 0) {
          console.log(`  ⚠️ Issues found: ${summary.errorCount} errors, ${summary.warningCount} warnings`);

          // Display errors
          errors.forEach(error => {
            console.log(`    Error [${error.severity}]: ${error.message}`);
          });

          // Display warnings
          warnings.forEach(warning => {
            console.log(`    Warning [${warning.severity}]: ${warning.message}`);
          });
        }
      }

    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.log(`  ✗ Failed after ${elapsed}ms: ${error.message}`);
    }

    console.log();
  }

  // 6. Access collected errors for analysis
  console.log('\n=== Error Collection Summary ===\n');

  const errorCollector = fetcher.getErrorCollector();
  const allIssues = errorCollector.exportIssues();

  for (const [context, issues] of allIssues) {
    if (issues.summary.errorCount > 0 || issues.summary.warningCount > 0) {
      console.log(`Context: ${context}`);
      console.log(`  Total Errors: ${issues.summary.errorCount}`);
      console.log(`  Critical Errors: ${issues.summary.criticalErrors}`);
      console.log(`  Total Warnings: ${issues.summary.warningCount}`);

      if (issues.summary.firstError && issues.summary.lastError) {
        console.log(`  Error Period: ${issues.summary.firstError.toISOString()} to ${issues.summary.lastError.toISOString()}`);
      }
      console.log();
    }
  }

  // 7. Get rate limiting statistics
  console.log('=== Rate Limiting Statistics ===\n');

  const rateLimiter = fetcher.getRateLimiter();
  const domains = ['example.com', 'api.github.com', 'slow-site.com'];

  for (const domain of domains) {
    const stats = (rateLimiter as any).getStats(domain);
    if (stats.requestCount > 0) {
      console.log(`Domain: ${domain}`);
      console.log(`  Requests: ${stats.requestCount}`);
      console.log(`  Total Wait Time: ${stats.totalWaitTime}ms`);
      console.log(`  Average Wait: ${stats.averageWaitTime.toFixed(0)}ms`);
      console.log(`  Last Request: ${stats.lastRequestTime?.toISOString() || 'N/A'}`);
      console.log();
    }
  }

  // 8. Clear errors for specific context
  fetcher.clearScrapingIssues('https://example.com/page1');
  console.log('Cleared errors for https://example.com/page1\n');

  // 9. Disable rate limiting for specific requests
  console.log('=== Processing without rate limiting ===\n');

  const urgentUrls = [
    'https://example.com/urgent1',
    'https://example.com/urgent2'
  ];

  for (const url of urgentUrls) {
    console.log(`Processing (no rate limit): ${url}`);
    const startTime = Date.now();

    const result = await kb.processUrl(url, {
      scraperSpecific: {
        skipRateLimit: true,  // Skip rate limiting for urgent requests
        collectErrors: true
      }
    });

    const elapsed = Date.now() - startTime;
    console.log(`  ✓ Processed in ${elapsed}ms (no rate limit applied)`);
  }
}

// Advanced example: Custom rate limiting per request
async function customRateLimitingExample() {
  const config = createDefaultConfiguration({
    scraping: {
      enabledScrapers: ['http'],
      rateLimiting: {
        enabled: true,
        defaultIntervalMs: 1000
      }
    }
  });

  const kb = KnowledgeBaseFactory.createKnowledgeBase(config);
  const fetcher = (kb as any).contentFetcher as ScraperAwareContentFetcher;

  // Process with custom rate limit for specific request
  const result = await kb.processUrl('https://special-api.com/endpoint', {
    scraperSpecific: {
      rateLimitMs: 5000,  // Override with 5 second rate limit for this request
      errorContext: 'special-api-endpoint'
    }
  });

  // Get issues for specific context
  const issues = fetcher.getScrapingIssues('special-api-endpoint');
  console.log('Issues for special API:', issues);
}

// Example: Monitoring scraping health
async function monitorScrapingHealth() {
  const config = createDefaultConfiguration({
    scraping: {
      errorCollection: {
        enabled: true,
        clearAfterSuccess: true  // Clear errors after successful request
      }
    }
  });

  const kb = KnowledgeBaseFactory.createKnowledgeBase(config);
  const fetcher = (kb as any).contentFetcher as ScraperAwareContentFetcher;

  // Process URLs and monitor health
  const urls = ['https://example.com', 'https://invalid-url-that-fails.com'];

  for (const url of urls) {
    try {
      await kb.processUrl(url);
      console.log(`✅ ${url}: Healthy`);
    } catch (error) {
      const issues = fetcher.getScrapingIssues(url);
      console.log(`❌ ${url}: Unhealthy`);
      console.log(`   Errors: ${issues.summary.errorCount}`);
      console.log(`   Critical: ${issues.summary.criticalErrors}`);
    }
  }

  // Get formatted summary
  const errorCollector = fetcher.getErrorCollector();
  const summary = (errorCollector as any).getFormattedSummary();
  console.log('\nFormatted Summary:\n', summary);
}

// Run the demonstrations
if (require.main === module) {
  (async () => {
    try {
      await demonstrateRateLimitingAndErrorCollection();
      console.log('\n' + '='.repeat(50) + '\n');
      await customRateLimitingExample();
      console.log('\n' + '='.repeat(50) + '\n');
      await monitorScrapingHealth();
    } catch (error) {
      console.error('Error in demonstration:', error);
    }
  })();
}

export {
  demonstrateRateLimitingAndErrorCollection,
  customRateLimitingExample,
  monitorScrapingHealth
};