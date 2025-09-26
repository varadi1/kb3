#!/usr/bin/env npx tsx

import { createKnowledgeBase } from './src';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function processUrl(url: string) {
  const kb = createKnowledgeBase();

  console.log(`\n🔍 Processing URL: ${url}`);
  console.log('━'.repeat(50));

  try {
    const result = await kb.processUrl(url);

    console.log('✅ Successfully processed!');
    console.log(`📄 Content Type: ${result.contentType}`);
    console.log(`📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`🏷️  Category: ${result.metadata.category || 'general'}`);
    console.log(`🔑 Authority: ${result.metadata.authority || 5}/10`);
    console.log(`📝 Title: ${result.metadata.title || 'Untitled'}`);
    console.log(`💾 Stored at: ${result.storagePath}`);
    console.log(`🔒 Hash: ${result.contentHash}`);

    if (result.metadata.wordCount) {
      console.log(`📖 Word Count: ${result.metadata.wordCount}`);
    }
    if (result.metadata.language) {
      console.log(`🌍 Language: ${result.metadata.language}`);
    }

  } catch (error: any) {
    console.error('❌ Processing failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

async function interactiveMode() {
  console.log('🚀 KB3 Knowledge Base System - Interactive Demo');
  console.log('━'.repeat(50));
  console.log('Enter a URL to process (or "exit" to quit)');
  console.log('Examples:');
  console.log('  - https://example.com');
  console.log('  - https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');
  console.log('  - https://api.github.com/users/github');
  console.log('━'.repeat(50));

  const askForUrl = () => {
    rl.question('\n🔗 URL: ', async (url) => {
      if (url.toLowerCase() === 'exit') {
        console.log('👋 Goodbye!');
        rl.close();
        return;
      }

      if (url) {
        await processUrl(url);
      }

      askForUrl();
    });
  };

  askForUrl();
}

async function batchMode() {
  const sampleUrls = [
    'https://example.com',
    'https://api.github.com/users/github',
    'https://www.w3.org/TR/PNG/iso_8859-1.txt'
  ];

  console.log('🚀 KB3 Knowledge Base System - Batch Demo');
  console.log('━'.repeat(50));
  console.log(`Processing ${sampleUrls.length} sample URLs...`);

  const kb = createKnowledgeBase();

  try {
    const results = await kb.processUrls(sampleUrls);

    console.log(`\n✅ Processed ${results.successful.length} URLs successfully`);

    if (results.failed.length > 0) {
      console.log(`❌ Failed to process ${results.failed.length} URLs`);
      results.failed.forEach(failure => {
        console.log(`  - ${failure.url}: ${failure.error}`);
      });
    }

    console.log('\n📊 Summary:');
    const types = results.successful.reduce((acc, r) => {
      acc[r.contentType] = (acc[r.contentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(types).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Batch processing failed:', error.message);
  }

  rl.close();
}

// Main execution
const mode = process.argv[2];

if (mode === '--batch') {
  batchMode();
} else {
  interactiveMode();
}