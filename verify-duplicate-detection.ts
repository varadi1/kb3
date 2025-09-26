#!/usr/bin/env npx tsx

/**
 * Verify that duplicate detection is working correctly
 */

import { KnowledgeBaseFactory, createSqlConfiguration } from './src';

async function verifyDuplicateDetection() {
  console.log('=== Verifying Duplicate Detection ===\n');

  // Create knowledge base with SQL storage and duplicate detection enabled
  const config = createSqlConfiguration({
    storage: {
      knowledgeStore: {
        type: 'sql',
        dbPath: './verify-data/knowledge.db',
        urlDbPath: './verify-data/urls.db'
      },
      fileStorage: {
        basePath: './verify-data/files'
      },
      enableDuplicateDetection: true
    }
  });

  const kb = KnowledgeBaseFactory.createKnowledgeBase(config);

  // Use a URL that we know works
  const testUrl = 'https://www.google.com';

  console.log('Step 1: Process URL first time');
  console.log(`URL: ${testUrl}\n`);

  const result1 = await kb.processUrl(testUrl);

  if (result1.success) {
    console.log('✅ First processing successful');
    console.log(`   Entry ID: ${result1.entryId}`);
    console.log(`   Content Type: ${result1.contentType}`);
    console.log(`   Stored at: ${result1.storagePath}\n`);
  } else {
    console.log(`❌ Processing failed: ${result1.error?.message}\n`);
  }

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('Step 2: Try to process the same URL again');
  console.log(`URL: ${testUrl}\n`);

  const result2 = await kb.processUrl(testUrl);

  if (result2.success) {
    console.log('❌ ERROR: Duplicate was not detected!');
    console.log('   The URL was processed twice, which should not happen');
    console.log(`   Second Entry ID: ${result2.entryId}\n`);
  } else if (result2.error?.code === 'DUPLICATE_URL') {
    console.log('✅ Duplicate URL correctly detected!');
    console.log(`   Error code: ${result2.error.code}`);
    console.log(`   Message: ${result2.error.message}`);
    console.log(`   Process count: ${result2.metadata.processCount}`);
    console.log(`   First processed at: ${result2.metadata.originalProcessedAt}\n`);
  } else {
    console.log(`❌ Unexpected error: ${result2.error?.message}\n`);
  }

  console.log('Step 3: Try a third time to confirm');
  console.log(`URL: ${testUrl}\n`);

  const result3 = await kb.processUrl(testUrl);

  if (!result3.success && result3.error?.code === 'DUPLICATE_URL') {
    console.log('✅ Duplicate still correctly detected on third attempt');
    console.log(`   Process count: ${result3.metadata.processCount}\n`);
  } else {
    console.log('❌ Unexpected result on third attempt\n');
  }

  // Test with another URL to make sure new URLs still work
  console.log('Step 4: Process a different URL');
  const testUrl2 = 'https://www.wikipedia.org';
  console.log(`URL: ${testUrl2}\n`);

  const result4 = await kb.processUrl(testUrl2);

  if (result4.success) {
    console.log('✅ New URL processed successfully');
    console.log(`   Entry ID: ${result4.entryId}\n`);
  } else {
    console.log(`❌ New URL failed: ${result4.error?.message}\n`);
  }

  // Summary
  console.log('\n=== Verification Summary ===');

  const duplicateDetectionWorks = !result2.success && result2.error?.code === 'DUPLICATE_URL';
  const newUrlsWork = result4.success;

  console.log(`Duplicate Detection: ${duplicateDetectionWorks ? '✅ WORKING' : '❌ NOT WORKING'}`);
  console.log(`New URL Processing: ${newUrlsWork ? '✅ WORKING' : '❌ NOT WORKING'}`);

  if (duplicateDetectionWorks && newUrlsWork) {
    console.log('\n✨ All duplicate detection features are working correctly!');
  } else {
    console.log('\n⚠️  Some features need attention');
  }
}

// Run the verification
verifyDuplicateDetection().catch(console.error);