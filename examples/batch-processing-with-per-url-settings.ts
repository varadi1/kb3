/**
 * Example: Batch Processing with Per-URL Rate Limits and Settings
 *
 * This example demonstrates how rate limit settings and error information
 * are saved to the database and how to configure individual URLs in batch processing.
 */

import { KnowledgeBaseFactory, createSqlConfiguration } from '../src';

async function demonstrateBatchProcessingWithPerUrlSettings() {
  console.log('=== Batch Processing with Per-URL Settings ===\n');

  // 1. Create KB with SQL storage to persist all metadata
  const config = createSqlConfiguration({
    storage: {
      knowledgeStore: {
        type: 'sql',
        dbPath: './data/knowledge.db',
        urlDbPath: './data/urls.db'
      },
      fileStorage: {
        basePath: './data/files'
      }
    },
    scraping: {
      enabledScrapers: ['http', 'playwright', 'crawl4ai'],
      rateLimiting: {
        enabled: true,
        defaultIntervalMs: 1000 // Default 1 second between requests
      },
      errorCollection: {
        enabled: true,
        includeStackTraces: true
      }
    }
  });

  const kb = KnowledgeBaseFactory.createKnowledgeBase(config);

  // 2. Configure URLs with individual rate limits for batch processing
  const urlConfigs = [
    {
      url: 'https://api.github.com/users/octocat',
      rateLimitMs: 2000, // 2 seconds for GitHub API
      scraperOptions: {
        collectErrors: true,
        errorContext: 'github-api-user'
      },
      processingOptions: {
        forceReprocess: false
      }
    },
    {
      url: 'https://example.com/page1',
      rateLimitMs: 500, // 0.5 seconds for example.com
      scraperOptions: {
        collectErrors: true,
        errorContext: 'example-page1'
      }
    },
    {
      url: 'https://fast-api.service.com/endpoint',
      rateLimitMs: 100, // 100ms for fast API
      scraperOptions: {
        skipRateLimit: false, // Apply the 100ms rate limit
        collectErrors: true
      }
    },
    {
      url: 'https://slow-site.com/resource',
      rateLimitMs: 5000, // 5 seconds for slow site
      scraperOptions: {
        timeout: 30000, // 30 second timeout for slow site
        collectErrors: true
      }
    },
    {
      url: 'https://urgent-api.com/critical',
      rateLimitMs: 0, // Process immediately
      scraperOptions: {
        skipRateLimit: true, // Skip rate limiting entirely
        collectErrors: true,
        errorContext: 'urgent-critical'
      }
    }
  ];

  // 3. Process URLs with individual configurations
  console.log(`Processing ${urlConfigs.length} URLs with individual rate limits...\n`);

  const results = await kb.processUrlsWithConfigs(urlConfigs, {
    concurrency: 3, // Process 3 URLs in parallel
    scraperSpecific: {
      collectErrors: true // Global setting for all URLs
    }
  });

  // 4. Display results with saved metadata
  console.log('\n=== Processing Results ===\n');

  for (const result of results) {
    console.log(`URL: ${result.url}`);
    console.log(`  Success: ${result.success}`);
    console.log(`  Processing Time: ${result.processingTime}ms`);

    if (result.success && result.metadata) {
      // Rate limit information (saved to database)
      if (result.metadata.rateLimitInfo) {
        console.log(`  Rate Limit Applied:`);
        console.log(`    - Waited: ${result.metadata.rateLimitInfo.waitedMs}ms`);
        console.log(`    - Domain: ${result.metadata.rateLimitInfo.domain}`);
        console.log(`    - Request #: ${result.metadata.rateLimitInfo.requestNumber}`);
      }

      // Scraping issues (saved to database)
      if (result.metadata.scrapingIssues) {
        const { summary } = result.metadata.scrapingIssues;
        console.log(`  Scraping Issues:`);
        console.log(`    - Errors: ${summary.errorCount}`);
        console.log(`    - Warnings: ${summary.warningCount}`);
        console.log(`    - Critical: ${summary.criticalErrors}`);
      }

      // Scraper configuration (saved to database)
      if (result.metadata.scraperConfig) {
        console.log(`  Scraper Config Saved: Yes`);
      }

      console.log(`  Stored at: ${result.storagePath}`);
    } else if (!result.success) {
      console.log(`  Error: ${result.error?.message}`);
    }

    console.log();
  }

  // 5. Verify data persistence by retrieving from database
  console.log('=== Verifying Database Persistence ===\n');

  // Access the URL repository to check saved metadata
  const urlRepository = (kb as any).urlRepository;
  if (urlRepository) {
    for (const config of urlConfigs) {
      const urlInfo = await urlRepository.getUrlInfo(config.url);
      if (urlInfo && urlInfo.metadata) {
        console.log(`${config.url}:`);
        console.log('  Persisted Metadata:');

        if (urlInfo.metadata.rateLimitInfo) {
          console.log(`    - Rate limit wait time: ${urlInfo.metadata.rateLimitInfo.waitedMs}ms`);
        }

        if (urlInfo.metadata.scrapingIssues) {
          console.log(`    - Total errors: ${urlInfo.metadata.scrapingIssues.summary.errorCount}`);
          console.log(`    - Total warnings: ${urlInfo.metadata.scrapingIssues.summary.warningCount}`);
        }

        if (urlInfo.metadata.scraperUsed) {
          console.log(`    - Scraper used: ${urlInfo.metadata.scraperUsed}`);
        }

        console.log(`    - Last processed: ${urlInfo.lastProcessed}`);
        console.log();
      }
    }
  }

  // 6. Demonstrate dynamic rate limit adjustment during batch processing
  console.log('=== Dynamic Rate Limit Adjustment ===\n');

  const fetcher = (kb as any).contentFetcher;
  if (fetcher && 'setDomainRateLimit' in fetcher) {
    // Adjust rate limits based on API responses or performance
    console.log('Adjusting rate limits based on performance...');

    // Simulate adjusting rate limits based on response times
    for (const result of results) {
      if (result.success && result.processingTime) {
        const url = new URL(result.url);
        const domain = url.hostname;

        // If processing was slow, increase rate limit
        if (result.processingTime > 5000) {
          const newLimit = 10000; // 10 seconds for slow domains
          fetcher.setDomainRateLimit(domain, newLimit);
          console.log(`  Increased rate limit for ${domain} to ${newLimit}ms (slow response)`);
        }
        // If we got rate limited warnings, increase the interval
        else if (result.metadata?.scrapingIssues?.warnings.some(
          (w: any) => w.message.includes('Rate limited')
        )) {
          const newLimit = 3000; // Increase to 3 seconds
          fetcher.setDomainRateLimit(domain, newLimit);
          console.log(`  Increased rate limit for ${domain} to ${newLimit}ms (rate limit warning)`);
        }
      }
    }
  }

  return results;
}

// Advanced example: Batch processing with domain grouping
async function batchProcessWithDomainGrouping() {
  console.log('\n=== Batch Processing with Domain Grouping ===\n');

  const config = createSqlConfiguration({
    scraping: {
      rateLimiting: {
        enabled: true,
        defaultIntervalMs: 1000
      }
    }
  });

  const kb = KnowledgeBaseFactory.createKnowledgeBase(config);

  // Group URLs by domain to optimize rate limiting
  const urlsByDomain = {
    'api.github.com': {
      urls: [
        'https://api.github.com/users/torvalds',
        'https://api.github.com/repos/nodejs/node',
        'https://api.github.com/orgs/microsoft'
      ],
      rateLimitMs: 2000 // 2 seconds between GitHub API calls
    },
    'example.com': {
      urls: [
        'https://example.com/page1',
        'https://example.com/page2',
        'https://example.com/page3'
      ],
      rateLimitMs: 500 // 0.5 seconds between example.com calls
    }
  };

  // Process each domain group with its specific rate limit
  const allResults = [];

  for (const [domain, config] of Object.entries(urlsByDomain)) {
    console.log(`Processing ${domain} URLs with ${config.rateLimitMs}ms rate limit...`);

    const urlConfigs = config.urls.map(url => ({
      url,
      rateLimitMs: config.rateLimitMs,
      scraperOptions: {
        collectErrors: true,
        errorContext: `${domain}-batch`
      }
    }));

    // Process domain batch sequentially to respect rate limits
    const results = await kb.processUrlsWithConfigs(urlConfigs, {
      concurrency: 1 // Sequential for same domain
    });

    allResults.push(...results);

    // Summary for this domain
    const successful = results.filter(r => r.success).length;
    const totalWaitTime = results.reduce((sum, r) =>
      sum + (r.metadata?.rateLimitInfo?.waitedMs || 0), 0
    );

    console.log(`  ✓ Processed ${successful}/${results.length} successfully`);
    console.log(`  ⏱ Total rate limit wait time: ${totalWaitTime}ms\n`);
  }

  return allResults;
}

// Example: Retrieving and analyzing saved metadata
async function analyzeSavedMetadata() {
  console.log('\n=== Analyzing Saved Metadata ===\n');

  const config = createSqlConfiguration();
  const kb = KnowledgeBaseFactory.createKnowledgeBase(config);

  // Get all processed URLs from database
  const urlRepository = (kb as any).urlRepository;
  if (!urlRepository) {
    console.log('URL repository not available');
    return;
  }

  // SQL query to analyze rate limiting patterns
  // This would need actual SQL implementation in SqlUrlRepository
  console.log('Rate Limiting Analysis:');
  console.log('- Domains with highest wait times');
  console.log('- URLs with most errors');
  console.log('- Average processing time by domain');
  console.log('- Rate limit violations');

  // Example of retrieving specific URL metadata
  const testUrl = 'https://api.github.com/users/octocat';
  const urlInfo = await urlRepository.getUrlInfo(testUrl);

  if (urlInfo && urlInfo.metadata) {
    console.log(`\nDetailed metadata for ${testUrl}:`);
    console.log(JSON.stringify(urlInfo.metadata, null, 2));
  }
}

// Run examples
if (require.main === module) {
  (async () => {
    try {
      // Run main demonstration
      await demonstrateBatchProcessingWithPerUrlSettings();

      // Run domain grouping example
      await batchProcessWithDomainGrouping();

      // Analyze saved metadata
      await analyzeSavedMetadata();

    } catch (error) {
      console.error('Error in batch processing demonstration:', error);
    }
  })();
}

export {
  demonstrateBatchProcessingWithPerUrlSettings,
  batchProcessWithDomainGrouping,
  analyzeSavedMetadata
};