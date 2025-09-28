/**
 * Verification script to test if all scrapers are actually working with real URLs
 * This script tests each scraper with actual network requests
 */

import { ScraperRegistry } from './src/scrapers/ScraperRegistry';
import { HttpScraper } from './src/scrapers/HttpScraper';
import { PlaywrightScraper } from './src/scrapers/PlaywrightScraper';
import { DoclingScraper } from './src/scrapers/DoclingScraper';
import { Crawl4AIScraper } from './src/scrapers/Crawl4AIScraper';
import { DeepDoctectionScraper } from './src/scrapers/DeepDoctectionScraper';
import { ScraperOptions } from './src/interfaces/IScraper';

interface TestCase {
  scraperName: string;
  testUrl: string;
  description: string;
  options?: ScraperOptions;
}

const testCases: TestCase[] = [
  {
    scraperName: 'http',
    testUrl: 'https://example.com',
    description: 'Simple HTML page'
  },
  {
    scraperName: 'playwright',
    testUrl: 'https://example.com',
    description: 'JavaScript rendering test',
    options: {
      javascriptEnabled: true,
      waitUntil: 'networkidle',
      timeout: 30000
    }
  },
  {
    scraperName: 'docling',
    testUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: 'PDF document'
  },
  {
    scraperName: 'crawl4ai',
    testUrl: 'https://example.com',
    description: 'Web content with AI extraction',
    options: {
      extractionStrategy: 'basic'
    }
  },
  {
    scraperName: 'deepdoctection',
    testUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: 'Document analysis (requires deepdoctection)'
  }
];

async function verifyScrapers() {
  console.log('🔍 Verifying Scraper Functionality\n');
  console.log('=' .repeat(80));

  const registry = ScraperRegistry.getInstance();

  // Register all scrapers
  console.log('📦 Registering scrapers...\n');

  const scrapers = [
    { name: 'http', instance: new HttpScraper() },
    { name: 'playwright', instance: new PlaywrightScraper() },
    { name: 'docling', instance: new DoclingScraper() },
    { name: 'crawl4ai', instance: new Crawl4AIScraper() },
    { name: 'deepdoctection', instance: new DeepDoctectionScraper() }
  ];

  for (const { name, instance } of scrapers) {
    try {
      if (!registry.has(name)) {
        registry.register(name, instance);
        console.log(`✅ Registered: ${name}`);
      } else {
        console.log(`ℹ️  Already registered: ${name}`);
      }
    } catch (error) {
      console.log(`❌ Failed to register ${name}: ${error}`);
    }
  }

  console.log('\n' + '=' .repeat(80));
  console.log('\n🧪 Testing scrapers with real URLs...\n');

  const results: { scraper: string; status: string; details: string }[] = [];

  for (const test of testCases) {
    const scraper = registry.get(test.scraperName);

    if (!scraper) {
      results.push({
        scraper: test.scraperName,
        status: '❌ NOT FOUND',
        details: 'Scraper not registered'
      });
      continue;
    }

    console.log(`\n📌 Testing ${test.scraperName.toUpperCase()} Scraper`);
    console.log(`   URL: ${test.testUrl}`);
    console.log(`   Description: ${test.description}`);

    try {
      // Check if scraper can handle the URL
      if (!scraper.canHandle(test.testUrl)) {
        results.push({
          scraper: test.scraperName,
          status: '⚠️  CANNOT HANDLE',
          details: `Scraper reports it cannot handle URL: ${test.testUrl}`
        });
        console.log(`   ⚠️  Scraper reports it cannot handle this URL`);
        continue;
      }

      // Attempt to scrape
      console.log(`   ⏳ Attempting to scrape...`);
      const startTime = Date.now();

      const result = await scraper.scrape(test.testUrl, {
        ...test.options,
        timeout: 30000
      });

      const elapsed = Date.now() - startTime;

      // Verify result
      if (result && result.content) {
        const contentSize = Buffer.isBuffer(result.content)
          ? result.content.length
          : Buffer.from(result.content).length;

        if (contentSize > 0) {
          results.push({
            scraper: test.scraperName,
            status: '✅ WORKING',
            details: `Content retrieved: ${contentSize} bytes in ${elapsed}ms`
          });
          console.log(`   ✅ SUCCESS: Retrieved ${contentSize} bytes in ${elapsed}ms`);
          console.log(`   📊 MIME Type: ${result.mimeType || 'unknown'}`);

          // Check if it's mock data
          const contentStr = result.content.toString('utf8').substring(0, 200);
          if (contentStr.includes('Mock') || contentStr.includes('mock')) {
            console.log(`   ⚠️  WARNING: Content appears to be mock data!`);
            results[results.length - 1].status = '⚠️  MOCK DATA';
            results[results.length - 1].details += ' (MOCK DATA DETECTED)';
          }
        } else {
          results.push({
            scraper: test.scraperName,
            status: '⚠️  EMPTY',
            details: 'Returned empty content'
          });
          console.log(`   ⚠️  WARNING: Returned empty content`);
        }
      } else {
        results.push({
          scraper: test.scraperName,
          status: '❌ NO CONTENT',
          details: 'No content returned'
        });
        console.log(`   ❌ FAILED: No content returned`);
      }

    } catch (error: any) {
      const errorMsg = error?.message || String(error);

      // Check for common dependency issues
      if (errorMsg.includes('Cannot find module') || errorMsg.includes('require')) {
        results.push({
          scraper: test.scraperName,
          status: '🔧 MISSING DEPS',
          details: `Missing dependency: ${errorMsg.split("'")[1] || 'unknown'}`
        });
        console.log(`   🔧 MISSING DEPENDENCY: ${errorMsg.split("'")[1] || 'unknown'}`);
      } else if (errorMsg.includes('Mock implementation')) {
        results.push({
          scraper: test.scraperName,
          status: '🎭 MOCK MODE',
          details: 'Using mock implementation (dependency not installed)'
        });
        console.log(`   🎭 MOCK MODE: ${errorMsg}`);
      } else if (errorMsg.includes('API') || errorMsg.includes('api')) {
        results.push({
          scraper: test.scraperName,
          status: '🔑 API REQUIRED',
          details: 'Requires API key or configuration'
        });
        console.log(`   🔑 API KEY REQUIRED: ${errorMsg}`);
      } else {
        results.push({
          scraper: test.scraperName,
          status: '❌ ERROR',
          details: errorMsg.substring(0, 100)
        });
        console.log(`   ❌ ERROR: ${errorMsg}`);
      }
    }
  }

  // Print summary
  console.log('\n' + '=' .repeat(80));
  console.log('\n📊 VERIFICATION SUMMARY\n');

  const maxNameLength = Math.max(...results.map(r => r.scraper.length));

  for (const result of results) {
    const padding = ' '.repeat(maxNameLength - result.scraper.length);
    console.log(`${result.scraper.toUpperCase()}${padding} │ ${result.status} │ ${result.details}`);
  }

  console.log('\n' + '=' .repeat(80));

  // Analysis
  const working = results.filter(r => r.status.includes('✅')).length;
  const mock = results.filter(r => r.status.includes('MOCK')).length;
  const missingDeps = results.filter(r => r.status.includes('MISSING DEPS')).length;
  const apiRequired = results.filter(r => r.status.includes('API')).length;
  const errors = results.filter(r => r.status.includes('❌')).length;

  console.log('\n📈 ANALYSIS:\n');
  console.log(`✅ Actually Working: ${working}/${results.length}`);
  console.log(`🎭 Using Mock Data: ${mock}/${results.length}`);
  console.log(`🔧 Missing Dependencies: ${missingDeps}/${results.length}`);
  console.log(`🔑 Requires API Key: ${apiRequired}/${results.length}`);
  console.log(`❌ Errors/Not Working: ${errors}/${results.length}`);

  console.log('\n💡 RECOMMENDATIONS:\n');

  if (missingDeps > 0) {
    console.log('• Install missing dependencies:');
    const depsToInstall = new Set<string>();
    for (const result of results) {
      if (result.status.includes('MISSING DEPS')) {
        if (result.scraper === 'playwright') depsToInstall.add('playwright');
        if (result.scraper === 'docling') depsToInstall.add('docling');
        if (result.scraper === 'crawl4ai') depsToInstall.add('crawl4ai');
        if (result.scraper === 'deepdoctection') depsToInstall.add('deepdoctection');
      }
    }
    if (depsToInstall.size > 0) {
      console.log(`  npm install ${Array.from(depsToInstall).join(' ')}`);
    }
  }

  if (apiRequired > 0) {
    console.log('• Configure API keys for:');
    for (const result of results) {
      if (result.status.includes('API')) {
        console.log(`  - ${result.scraper}: Set environment variable or config`);
      }
    }
  }

  if (mock > 0) {
    console.log('• Scrapers returning mock data need their dependencies installed to work properly');
  }

  console.log('\n' + '=' .repeat(80));
}

// Run verification
verifyScrapers().catch(console.error);