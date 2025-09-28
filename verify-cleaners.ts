/**
 * Script to verify that all text cleaners are actually functioning
 * This tests real-world content processing, not just test passing
 */

import { TextCleanerRegistry } from './src/cleaners/TextCleanerRegistry';
import { TextCleanerConfigManager } from './src/cleaners/TextCleanerConfigManager';
import { TextCleaningOrchestrator } from './src/cleaners/TextCleaningOrchestrator';
import { TextFormat, ITextCleaningResult } from './src/interfaces/ITextCleaner';

async function verifyCleaners() {
  console.log('='.repeat(80));
  console.log('VERIFYING TEXT CLEANERS FUNCTIONALITY');
  console.log('='.repeat(80));

  // Initialize registry
  const registry = TextCleanerRegistry.getInstance();
  registry.clear();
  registry.initializeDefaultCleaners();

  const cleaners = registry.getAllCleaners();
  console.log(`\n✓ Initialized ${cleaners.length} cleaners:`, cleaners.map(c => c.name).join(', '));

  const configManager = new TextCleanerConfigManager('./dev-data/verify-cleaners.db');
  const orchestrator = new TextCleaningOrchestrator(registry, configManager);

  // Test content samples
  const testCases = [
    {
      name: 'HTML with scripts and styles',
      format: TextFormat.HTML,
      content: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test Page</title>
          <style>body { color: red; }</style>
          <script>alert('XSS');</script>
        </head>
        <body>
          <h1>Hello World</h1>
          <p>This is a <strong>test</strong> paragraph with <a href="javascript:void(0)">dangerous link</a>.</p>
          <script>console.log('another script');</script>
          <div onclick="alert('inline')">Click me</div>
        </body>
        </html>
      `
    },
    {
      name: 'Markdown with various elements',
      format: TextFormat.MARKDOWN,
      content: `
# Main Title

## Subtitle with **bold** and *italic*

This is a paragraph with [a link](https://example.com) and some \`inline code\`.

\`\`\`javascript
function test() {
  console.log('code block');
}
\`\`\`

### Lists

- Item 1
- Item 2
  - Nested item

> This is a blockquote
> with multiple lines

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
      `
    },
    {
      name: 'Plain text with special characters',
      format: TextFormat.PLAIN_TEXT,
      content: `
        This is plain text with lots of     spaces and

        empty lines. It has special characters: @#$%^&*()

        And some Unicode: 你好世界 🌍 émojis!

        Also tabs:	here	and	here.
      `
    }
  ];

  // Test each content type
  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Testing: ${testCase.name}`);
    console.log(`Format: ${testCase.format}`);
    console.log('-'.repeat(80));

    // Show original
    console.log('\nORIGINAL CONTENT:');
    console.log(testCase.content.trim().substring(0, 200) + '...');
    console.log(`Length: ${testCase.content.length} characters`);

    // Get cleaners for this format
    const formatCleaners = registry.getCleanersForFormat(testCase.format);
    console.log(`\nAvailable cleaners for ${testCase.format}:`, formatCleaners.map(c => c.name).join(', '));

    // Process with orchestrator using auto-selection
    const result = await orchestrator.cleanAuto(
      testCase.content,
      testCase.format
    );

    // Show cleaned result
    console.log('\nCLEANED CONTENT:');
    console.log(result.finalText.substring(0, 200) + '...');
    console.log(`Length: ${result.finalText.length} characters`);
    console.log(`Reduction: ${((1 - result.finalText.length / testCase.content.length) * 100).toFixed(1)}%`);

    console.log('\nMETADATA:');
    console.log('- Total processing time:', result.totalProcessingTime, 'ms');
    console.log('- Cleaners applied:', result.cleanerResults.length);

    if (result.cleanerResults.length > 0) {
      const cleanersUsed = result.cleanerResults.map(r =>
        r.metadata?.cleanerName || 'unknown'
      ).filter((v, i, a) => a.indexOf(v) === i);
      console.log('- Cleaners used:', cleanersUsed.join(', '));
    }

    // Test individual cleaners
    console.log('\nINDIVIDUAL CLEANER RESULTS:');
    for (const cleaner of formatCleaners) {
      try {
        const individualResult = await cleaner.clean(testCase.content, {
          enabled: true,
          priority: 50,
          options: {}
        }) as ITextCleaningResult;

        const reduction = ((1 - individualResult.cleanedText.length / testCase.content.length) * 100).toFixed(1);
        console.log(`- ${cleaner.name}: ${individualResult.cleanedText.length} chars (${reduction}% reduction)`);

        // Show a snippet of what this cleaner did
        if (individualResult.cleanedText !== testCase.content) {
          const snippet = individualResult.cleanedText.substring(0, 100).replace(/\n/g, ' ');
          console.log(`  Preview: "${snippet}..."`);
        }
      } catch (error: any) {
        console.log(`- ${cleaner.name}: ERROR - ${error.message}`);
      }
    }
  }

  // Test RemarkCleaner specifically with advanced features
  console.log(`\n${'='.repeat(80)}`);
  console.log('TESTING REMARK CLEANER ADVANCED FEATURES');
  console.log('='.repeat(80));

  const remarkCleaner = registry.getCleaner('remark');
  if (remarkCleaner) {
    const markdownContent = `
# Test Document

## Code Blocks
\`\`\`python
def hello():
    print("world")
\`\`\`

## Links and Images
[Link text](https://example.com)
![Image alt](image.jpg)

## Lists
1. First
2. Second
   - Nested bullet

## Emphasis
This is **bold** and this is *italic* and this is ***both***.
    `;

    // Test with code block removal
    const withoutCode = await remarkCleaner.clean(markdownContent, {
      enabled: true,
      priority: 50,
      options: {
        transformations: {
          removeCodeBlocks: true
        }
      }
    }) as ITextCleaningResult;
    console.log('\nWith code blocks removed:');
    console.log(withoutCode.cleanedText.includes('```') ? '❌ FAILED' : '✓ Code blocks removed');

    // Test with link removal
    const withoutLinks = await remarkCleaner.clean(markdownContent, {
      enabled: true,
      priority: 50,
      options: {
        transformations: {
          removeLinks: true
        }
      }
    }) as ITextCleaningResult;
    console.log('With links removed:');
    console.log(withoutLinks.cleanedText.includes('[Link text]') ? '❌ FAILED' : '✓ Links removed');

    // Test plain text extraction
    const plainText = await remarkCleaner.clean(markdownContent, {
      enabled: true,
      priority: 50,
      options: {
        transformations: {
          extractText: true
        }
      }
    }) as ITextCleaningResult;
    console.log('Plain text extraction:');
    console.log(plainText.cleanedText.includes('#') || plainText.cleanedText.includes('**') ? '❌ FAILED' : '✓ Markdown removed');
    console.log(`Preview: "${plainText.cleanedText.substring(0, 100).replace(/\n/g, ' ')}..."`);
  } else {
    console.log('❌ RemarkCleaner not found!');
  }

  // Cleanup
  configManager.close();
  registry.clear();

  console.log(`\n${'='.repeat(80)}`);
  console.log('VERIFICATION COMPLETE');
  console.log('='.repeat(80));
}

// Run verification
verifyCleaners().catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
});