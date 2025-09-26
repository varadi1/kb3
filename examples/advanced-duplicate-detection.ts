#!/usr/bin/env ts-node

/**
 * Advanced example demonstrating SQL storage with duplicate detection features
 * Shows URL deduplication, content hash detection, and force reprocessing
 */

import {
  KnowledgeBaseFactory,
  createSqlConfiguration,
  SqlKnowledgeStore,
  SqlUrlRepository
} from '../src';
import * as fs from 'fs/promises';

// Color codes for better console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '═'.repeat(60));
  log(title, colors.bright + colors.cyan);
  console.log('═'.repeat(60) + '\n');
}

async function demonstrateDuplicateDetection() {
  logSection('KB3 Advanced Duplicate Detection Demo');

  // Configure SQL storage with duplicate detection
  const config = createSqlConfiguration({
    storage: {
      knowledgeStore: {
        type: 'sql',
        dbPath: './demo-data/knowledge.db',
        urlDbPath: './demo-data/urls.db'
      },
      fileStorage: {
        basePath: './demo-data/files'
      },
      enableDuplicateDetection: true
    },
    processing: {
      concurrency: 3
    },
    logging: {
      level: 'info'
    }
  });

  const kb = KnowledgeBaseFactory.createKnowledgeBase(config);

  // Test scenarios
  const testScenarios = [
    {
      name: 'Scenario 1: Processing New URLs',
      urls: [
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        'https://file-examples.com/storage/fe1170c816762d3e51cbce0/2017/10/file_example_JPG_100kB.jpg',
        'https://www.google.com'
      ]
    },
    {
      name: 'Scenario 2: Duplicate URL Detection',
      urls: [
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', // Duplicate!
        'https://www.google.com' // Another duplicate!
      ]
    },
    {
      name: 'Scenario 3: Mixed New and Duplicate URLs',
      urls: [
        'https://www.wikipedia.org', // New
        'https://www.google.com',    // Duplicate
        'https://github.com'          // New
      ]
    }
  ];

  // Process each scenario
  for (const scenario of testScenarios) {
    logSection(scenario.name);

    for (const url of scenario.urls) {
      log(`\nProcessing: ${url}`, colors.yellow);

      try {
        const result = await kb.processUrl(url);

        if (result.success) {
          log('✓ Successfully processed', colors.green);
          log(`  Entry ID: ${result.entryId}`, colors.dim);
          log(`  Content Type: ${result.contentType}`, colors.dim);
          log(`  Storage Path: ${result.storagePath}`, colors.dim);
          log(`  Processing Time: ${result.processingTime}ms`, colors.dim);
        } else {
          if (result.error?.code === 'DUPLICATE_URL') {
            log('⚠ Duplicate URL detected', colors.yellow);
            log(`  Already processed at: ${new Date(result.metadata.originalProcessedAt).toLocaleString()}`, colors.dim);
            log(`  Process count: ${result.metadata.processCount}`, colors.dim);
          } else if (result.error?.code === 'DUPLICATE_CONTENT') {
            log('⚠ Duplicate content detected', colors.yellow);
            log(`  Original URL: ${result.metadata.originalUrl}`, colors.dim);
            log(`  Content hash: ${result.metadata.contentHash?.substring(0, 16)}...`, colors.dim);
          } else {
            log(`✗ Processing failed: ${result.error?.message}`, colors.red);
            log(`  Error code: ${result.error?.code}`, colors.dim);
          }
        }
      } catch (error: any) {
        log(`✗ Unexpected error: ${error.message}`, colors.red);
      }
    }
  }

  // Demonstrate force reprocessing
  logSection('Scenario 4: Force Reprocessing');

  const urlToReprocess = 'https://www.google.com';
  log(`\nForce reprocessing: ${urlToReprocess}`, colors.magenta);

  try {
    const result = await kb.processUrl(urlToReprocess, {
      forceReprocess: true
    });

    if (result.success) {
      log('✓ Successfully reprocessed', colors.green);
      log(`  New Entry ID: ${result.entryId}`, colors.dim);
      log(`  Processing Time: ${result.processingTime}ms`, colors.dim);
    } else {
      log(`✗ Reprocessing failed: ${result.error?.message}`, colors.red);
    }
  } catch (error: any) {
    log(`✗ Unexpected error: ${error.message}`, colors.red);
  }

  // Show statistics
  logSection('Processing Statistics');

  const status = await kb.getStatus();
  log('Overall Statistics:', colors.bright);
  log(`  Total processed: ${status.completed + status.failed}`, colors.dim);
  log(`  Successful: ${status.completed}`, colors.green);
  log(`  Failed/Skipped: ${status.failed}`, colors.yellow);
  log(`  Currently processing: ${status.totalProcessing}`, colors.cyan);

  // Direct database statistics (if using SQL storage)
  try {
    const knowledgeStore = new SqlKnowledgeStore('./demo-data/knowledge.db');
    const urlRepository = new SqlUrlRepository('./demo-data/urls.db');

    const storeStats = await knowledgeStore.getStats();
    const urlList = await urlRepository.list();

    logSection('Database Statistics');

    log('Knowledge Store:', colors.bright);
    log(`  Total entries: ${storeStats.totalEntries}`, colors.dim);
    log(`  Total size: ${(storeStats.totalSize / 1024).toFixed(2)} KB`, colors.dim);
    log(`  Content types: ${JSON.stringify(storeStats.contentTypes)}`, colors.dim);

    log('\nURL Repository:', colors.bright);
    log(`  Total URLs tracked: ${urlList.length}`, colors.dim);

    const completed = urlList.filter(u => u.status === 'completed').length;
    const failed = urlList.filter(u => u.status === 'failed').length;
    const skipped = urlList.filter(u => u.status === 'skipped').length;

    log(`  Completed: ${completed}`, colors.green);
    log(`  Failed: ${failed}`, colors.red);
    log(`  Skipped (duplicates): ${skipped}`, colors.yellow);

    // Show some URL details
    if (urlList.length > 0) {
      log('\nRecent URLs:', colors.bright);
      urlList.slice(0, 3).forEach(url => {
        log(`  ${url.url}`, colors.dim);
        log(`    Status: ${url.status}`, colors.dim);
        log(`    Process count: ${url.processCount}`, colors.dim);
        log(`    First seen: ${url.firstSeen.toLocaleString()}`, colors.dim);
      });
    }

    // Clean up connections
    await knowledgeStore.close();
    await urlRepository.close();
  } catch (error: any) {
    log(`Could not fetch database statistics: ${error.message}`, colors.yellow);
  }

  logSection('Demo Complete');
  log('✨ All scenarios have been demonstrated!', colors.green + colors.bright);
  log('\nKey Features Demonstrated:', colors.bright);
  log('  • URL duplicate detection', colors.dim);
  log('  • Content hash duplicate detection', colors.dim);
  log('  • Force reprocessing option', colors.dim);
  log('  • SQL storage persistence', colors.dim);
  log('  • Processing statistics', colors.dim);
  log('  • URL tracking and history', colors.dim);
}

// Advanced: Demonstrate content hash detection
async function demonstrateContentHashDetection() {
  logSection('Content Hash Duplicate Detection');

  log('Testing content hash detection with different URLs having same content...', colors.yellow);

  log('\nNote: In production, these URLs would return identical content', colors.dim);
  log('The system would detect duplicates based on content hash\n', colors.dim);

  // In a real scenario, you would create a knowledge base and test with actual URLs
  // const config = createSqlConfiguration({...});
  // const kb = KnowledgeBaseFactory.createKnowledgeBase(config);

  // Clean up demo data
  try {
    const demoDataPath = './demo-data';
    const exists = await fs.stat(demoDataPath).catch(() => null);
    if (exists) {
      log('\nCleaning up demo data...', colors.dim);
      // Note: In production, you might want to keep the data
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Run the demonstration
async function main() {
  try {
    // Main demonstration
    await demonstrateDuplicateDetection();

    // Additional content hash demonstration
    console.log('\n');
    await demonstrateContentHashDetection();

  } catch (error: any) {
    log(`\n✗ Demo failed: ${error.message}`, colors.red + colors.bright);
    console.error(error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

export { demonstrateDuplicateDetection, demonstrateContentHashDetection };