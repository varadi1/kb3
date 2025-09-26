/**
 * Example demonstrating content change detection
 *
 * The KB3 system now properly handles content changes:
 * 1. First visit to a URL: Process and store content + hash
 * 2. Subsequent visits: Check if content hash changed
 * 3. If unchanged: Skip reprocessing (saves resources)
 * 4. If changed: Process the new content
 */

import { KnowledgeBaseFactory } from '../src/factory/KnowledgeBaseFactory';
import { createSqlConfiguration } from '../src/config';

async function demonstrateContentChangeDetection() {
  console.log('=== KB3 Content Change Detection Demo ===\n');

  // Create knowledge base with SQL storage and duplicate detection enabled
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
      enableDuplicateDetection: true // Enables content change detection
    }
  });

  const kb = KnowledgeBaseFactory.createKnowledgeBase(config);

  // Example URLs
  const testUrl1 = 'https://example.com/article.html';
  const testUrl2 = 'https://example.com/news.html';

  console.log('1. First Processing of URLs');
  console.log('----------------------------');

  // Process URL 1 for the first time
  console.log(`Processing ${testUrl1}...`);
  const result1 = await kb.processUrl(testUrl1);
  console.log(`Result: ${result1.success ? 'SUCCESS' : 'FAILED'}`);
  if (!result1.success) {
    console.log(`Reason: ${result1.error?.message}`);
  }

  // Process URL 2 for the first time
  console.log(`Processing ${testUrl2}...`);
  const result2 = await kb.processUrl(testUrl2);
  console.log(`Result: ${result2.success ? 'SUCCESS' : 'FAILED'}`);
  if (!result2.success) {
    console.log(`Reason: ${result2.error?.message}`);
  }

  console.log('\n2. Reprocessing Same URLs (Content Unchanged)');
  console.log('----------------------------------------------');

  // Try to process URL 1 again (content hasn't changed)
  console.log(`Reprocessing ${testUrl1}...`);
  const result3 = await kb.processUrl(testUrl1);

  if (result3.success && result3.metadata?.skipped) {
    console.log(`✓ Content unchanged - Skipped reprocessing`);
    console.log(`  Previous hash: ${result3.metadata.previousHash}`);
    console.log(`  Current hash: ${result3.metadata.contentHash}`);
    console.log(`  Last checked: ${result3.metadata.lastChecked}`);
  } else if (!result3.success) {
    console.log(`Result: FAILED - ${result3.error?.message}`);
  }

  console.log('\n3. Force Reprocessing (Override Change Detection)');
  console.log('-------------------------------------------------');

  // Force reprocess even if content hasn't changed
  console.log(`Force reprocessing ${testUrl1}...`);
  const result4 = await kb.processUrl(testUrl1, { forceReprocess: true });
  console.log(`Result: ${result4.success ? 'SUCCESS (Forced)' : 'FAILED'}`);

  console.log('\n4. Content Change Scenario');
  console.log('---------------------------');
  console.log('In real usage:');
  console.log('- If content at URL changes, the new hash will differ');
  console.log('- System will detect the change and reprocess');
  console.log('- Previous hash is preserved for audit trail');
  console.log('- Content version is incremented');

  console.log('\n5. Duplicate Content Detection (Different URLs)');
  console.log('------------------------------------------------');

  // If two different URLs have the same content
  console.log('If two URLs have identical content:');
  console.log('- First URL is processed normally');
  console.log('- Second URL is marked as duplicate content');
  console.log('- Saves storage and processing time');

  console.log('\n=== Key Benefits ===');
  console.log('1. Efficiency: Skip processing unchanged content');
  console.log('2. Accuracy: Detect when content actually changes');
  console.log('3. Storage: Avoid storing duplicate content');
  console.log('4. Audit: Track content versions and changes');
  console.log('5. Flexibility: Force reprocess when needed');

  // Get processing stats
  const stats = kb.getProcessingStats();
  console.log('\n=== Processing Statistics ===');
  console.log(`Total processed: ${stats.totalProcessed}`);
  console.log(`Successful: ${stats.successful}`);
  console.log(`Failed: ${stats.failed}`);
}

// Run the demo
if (require.main === module) {
  demonstrateContentChangeDetection()
    .then(() => {
      console.log('\nDemo completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Demo error:', error);
      process.exit(1);
    });
}