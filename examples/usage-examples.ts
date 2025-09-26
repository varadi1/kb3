/**
 * Usage examples for the Knowledge Base System
 * Demonstrates various ways to use the system with different configurations
 */

import { createKnowledgeBase, KnowledgeBaseFactory } from '../src';
import { createDefaultConfiguration, createDevelopmentConfiguration } from '../src/config';
import sampleUrls from './sample-urls.json';

// Example 1: Basic Usage with Default Configuration
async function basicUsage() {
  console.log('=== Basic Usage Example ===');

  // Create knowledge base with default settings
  const knowledgeBase = createKnowledgeBase();

  // Process a single URL
  const url = 'https://example.com';
  console.log(`Processing: ${url}`);

  try {
    const result = await knowledgeBase.processUrl(url);

    if (result.success) {
      console.log(`✓ Successfully processed: ${result.entryId}`);
      console.log(`  Content Type: ${result.contentType}`);
      console.log(`  Processing Time: ${result.processingTime}ms`);
    } else {
      console.log(`✗ Failed to process: ${result.error?.message}`);
    }
  } catch (error) {
    console.error('Processing error:', error.message);
  }
}

// Example 2: Batch Processing with Custom Configuration
async function batchProcessing() {
  console.log('\n=== Batch Processing Example ===');

  // Custom configuration for batch processing
  const config = createDefaultConfiguration({
    processing: {
      concurrency: 3,
      timeout: 15000
    },
    network: {
      maxSize: 50 * 1024 * 1024, // 50MB
      timeout: 20000
    }
  });

  const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config);

  // Process multiple URLs from sample data
  const testUrls = sampleUrls.test_scenarios.basic_functionality.urls;

  console.log(`Processing ${testUrls.length} URLs concurrently...`);

  try {
    const results = await knowledgeBase.processUrls(testUrls);

    console.log('\nResults Summary:');
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✓ Successful: ${successful.length}`);
    console.log(`✗ Failed: ${failed.length}`);

    // Show details for successful results
    successful.forEach(result => {
      console.log(`  - ${result.url} (${result.contentType}) - ${result.processingTime}ms`);
    });

    // Show errors for failed results
    failed.forEach(result => {
      console.log(`  - ${result.url} - Error: ${result.error?.message}`);
    });

  } catch (error) {
    console.error('Batch processing error:', error.message);
  }
}

// Example 3: Development Mode with Enhanced Processing
async function developmentMode() {
  console.log('\n=== Development Mode Example ===');

  const knowledgeBase = KnowledgeBaseFactory.createDevelopmentKnowledgeBase();

  // Process with enhanced options
  const url = 'https://httpbin.org/html';
  console.log(`Processing with enhanced options: ${url}`);

  try {
    const result = await knowledgeBase.processUrl(url, {
      extractImages: true,
      extractLinks: true,
      extractMetadata: true,
      preserveFormatting: true
    });

    if (result.success) {
      console.log(`✓ Successfully processed with enhanced data`);
      console.log(`  Entry ID: ${result.entryId}`);
      console.log(`  Metadata keys:`, Object.keys(result.metadata || {}));
    } else {
      console.log(`✗ Processing failed: ${result.error?.message}`);
    }

  } catch (error) {
    console.error('Development processing error:', error.message);
  }
}

// Example 4: Error Handling and Resilience
async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===');

  const knowledgeBase = createKnowledgeBase();

  // Test with URLs that will cause different types of errors
  const errorTestUrls = sampleUrls.test_scenarios.error_resilience.urls;

  console.log('Testing error handling with problematic URLs...');

  for (const url of errorTestUrls) {
    console.log(`\nTesting: ${url}`);

    try {
      const result = await knowledgeBase.processUrl(url);

      if (result.success) {
        console.log(`  ✓ Unexpectedly succeeded`);
      } else if (result.error) {
        console.log(`  ✗ Expected error: ${result.error.code} - ${result.error.message}`);
        console.log(`  Stage: ${result.error.stage}`);
      }
    } catch (error) {
      console.log(`  ✗ Exception: ${error.message}`);
    }
  }
}

// Example 5: Monitoring and Status
async function monitoringExample() {
  console.log('\n=== Monitoring Example ===');

  const knowledgeBase = createKnowledgeBase();

  console.log('Initial status:');
  const initialStatus = await knowledgeBase.getStatus();
  console.log(`  Processing: ${initialStatus.totalProcessing}`);
  console.log(`  Completed: ${initialStatus.completed}`);
  console.log(`  Failed: ${initialStatus.failed}`);

  console.log('\nInitial stats:');
  const initialStats = knowledgeBase.getProcessingStats();
  console.log(`  Total processed: ${initialStats.totalProcessed}`);
  console.log(`  Successful: ${initialStats.successful}`);
  console.log(`  Failed: ${initialStats.failed}`);

  // Process some URLs to generate activity
  const testUrls = sampleUrls.test_scenarios.performance.urls.slice(0, 3);

  console.log('\nProcessing URLs for monitoring...');
  await knowledgeBase.processUrls(testUrls);

  console.log('\nFinal stats:');
  const finalStats = knowledgeBase.getProcessingStats();
  console.log(`  Total processed: ${finalStats.totalProcessed}`);
  console.log(`  Successful: ${finalStats.successful}`);
  console.log(`  Failed: ${finalStats.failed}`);
}

// Example 6: Content Type Specific Processing
async function contentTypeExample() {
  console.log('\n=== Content Type Processing Example ===');

  const knowledgeBase = createKnowledgeBase();

  // Test different content types
  const contentTestUrls = sampleUrls.test_scenarios.content_variety.urls;

  console.log('Testing different content types...');

  for (const url of contentTestUrls) {
    console.log(`\nProcessing: ${url}`);

    try {
      const result = await knowledgeBase.processUrl(url);

      if (result.success) {
        console.log(`  ✓ Type: ${result.contentType}`);
        console.log(`  Processing time: ${result.processingTime}ms`);

        if (result.metadata?.structure) {
          console.log(`  Structure: ${Object.keys(result.metadata.structure).join(', ')}`);
        }
      } else {
        console.log(`  ✗ Error: ${result.error?.message}`);
      }
    } catch (error) {
      console.log(`  ✗ Exception: ${error.message}`);
    }
  }
}

// Example 7: Custom Configuration from File
async function customConfigExample() {
  console.log('\n=== Custom Configuration Example ===');

  // Load configuration from file (simulated)
  const customConfig = createDevelopmentConfiguration();

  // Customize for specific use case
  customConfig.processing.maxTextLength = 50000;
  customConfig.processing.concurrency = 1;
  customConfig.detection.enableContentDetection = false;

  const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(customConfig);

  console.log('Processing with custom configuration...');

  try {
    const result = await knowledgeBase.processUrl('https://httpbin.org/json');

    if (result.success) {
      console.log(`✓ Custom processing completed`);
      console.log(`  Configuration applied successfully`);
    }
  } catch (error) {
    console.error('Custom config error:', error.message);
  }
}

// Main execution function
async function runExamples() {
  console.log('Knowledge Base System - Usage Examples');
  console.log('=====================================\n');

  try {
    await basicUsage();
    await batchProcessing();
    await developmentMode();
    await errorHandlingExample();
    await monitoringExample();
    await contentTypeExample();
    await customConfigExample();

    console.log('\n=== All Examples Completed ===');
  } catch (error) {
    console.error('Example execution error:', error);
  }
}

// Export individual examples for testing
export {
  basicUsage,
  batchProcessing,
  developmentMode,
  errorHandlingExample,
  monitoringExample,
  contentTypeExample,
  customConfigExample,
  runExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}