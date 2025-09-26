#!/usr/bin/env ts-node

/**
 * Example demonstrating SQL storage with duplicate detection
 */

import { KnowledgeBaseFactory, createSqlConfiguration } from '../src';

async function main() {
  console.log('=== KB3 SQL Storage with Duplicate Detection Example ===\n');

  // Create SQL-based knowledge base with duplicate detection enabled
  const config = createSqlConfiguration({
    storage: {
      knowledgeStore: {
        type: 'sql',
        dbPath: './data/example-knowledge.db',
        urlDbPath: './data/example-urls.db'
      },
      fileStorage: {
        basePath: './data/example-files'
      },
      enableDuplicateDetection: true
    },
    logging: {
      level: 'info',
      enableConsole: true
    }
  });

  const kb = KnowledgeBaseFactory.createKnowledgeBase(config);

  // Test URLs - including duplicates
  const testUrls = [
    'https://file-examples.com/wp-content/storage/2017/02/file-sample_100kB.docx',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    'https://file-examples.com/wp-content/storage/2017/02/file-sample_100kB.docx', // Duplicate!
    'https://www.google.com',
    'https://www.google.com' // Another duplicate!
  ];

  console.log('Processing URLs with duplicate detection...\n');

  for (const url of testUrls) {
    console.log(`\n🔗 URL: ${url}\n`);

    try {
      const result = await kb.processUrl(url);

      if (result.success) {
        console.log('✅ Successfully processed!');
        console.log(`📄 Content Type: ${result.contentType}`);
        console.log(`📝 Entry ID: ${result.entryId}`);
        console.log(`💾 Stored at: ${result.storagePath}`);
        console.log(`⏱️  Processing Time: ${result.processingTime}ms`);
      } else {
        console.log('❌ Processing failed or skipped');

        if (result.error?.code === 'DUPLICATE_URL') {
          console.log('🔄 Duplicate URL detected - already processed');
          console.log(`   Original processed at: ${result.metadata.originalProcessedAt}`);
          console.log(`   Process count: ${result.metadata.processCount}`);
        } else if (result.error?.code === 'DUPLICATE_CONTENT') {
          console.log('🔄 Duplicate content detected - same content from different URL');
          console.log(`   Original URL: ${result.metadata.originalUrl}`);
          console.log(`   Content hash: ${result.metadata.contentHash}`);
        } else {
          console.log(`   Error: ${result.error?.message}`);
          console.log(`   Code: ${result.error?.code}`);
        }
      }
    } catch (error) {
      console.error('💥 Unexpected error:', error);
    }

    console.log('━'.repeat(50));
  }

  // Show processing statistics
  const status = await kb.getStatus();
  console.log('\n📊 Final Statistics:');
  console.log(`   Total processed: ${status.completed + status.failed}`);
  console.log(`   Successful: ${status.completed}`);
  console.log(`   Failed/Skipped: ${status.failed}`);

  // Example: Force reprocessing a duplicate
  console.log('\n\n=== Force Reprocessing Example ===\n');
  console.log('Reprocessing first URL with forceReprocess option...\n');

  const forceResult = await kb.processUrl(testUrls[0], {
    forceReprocess: true
  });

  if (forceResult.success) {
    console.log('✅ Successfully reprocessed!');
    console.log(`📝 New Entry ID: ${forceResult.entryId}`);
  } else {
    console.log('❌ Reprocessing failed:', forceResult.error?.message);
  }

  console.log('\n✨ Example complete!');
}

// Run the example
main().catch(console.error);