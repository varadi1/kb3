/**
 * Integration tests for Text Cleaning System
 * Tests the complete cleaning pipeline with real libraries
 */

import { TextCleanerRegistry } from '../../src/cleaners/TextCleanerRegistry';
import { TextCleanerChain } from '../../src/cleaners/TextCleanerChain';
import { TextCleaningOrchestrator } from '../../src/cleaners/TextCleaningOrchestrator';
import { TextCleanerConfigManager } from '../../src/cleaners/TextCleanerConfigManager';
import { ContentProcessorWithCleaning } from '../../src/processors/ContentProcessorWithCleaning';
import { TextFormat } from '../../src/interfaces/ITextCleaner';
import { ContentType } from '../../src/interfaces/IUrlDetector';
import * as fs from 'fs';
import * as path from 'path';

// Mock content processor for testing
class MockContentProcessor {
  getSupportedTypes() {
    return [ContentType.HTML, ContentType.TXT, ContentType.JSON];
  }

  canProcess(contentType: ContentType) {
    return this.getSupportedTypes().includes(contentType);
  }

  async process(content: Buffer | string, contentType: ContentType) {
    return {
      text: content.toString(),
      metadata: {
        contentType,
        originalLength: content.length
      }
    };
  }
}

describe('Text Cleaning Integration', () => {
  let registry: TextCleanerRegistry;
  let orchestrator: TextCleaningOrchestrator;
  let configManager: TextCleanerConfigManager;
  let testDbPath: string;

  beforeAll(() => {
    // Create test database path
    testDbPath = path.join(__dirname, '../../test-data/cleaner_test.db');

    // Ensure test directory exists
    const testDir = path.dirname(testDbPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  beforeEach(() => {
    try {
      // Clean up test database
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }

      // Initialize components
      registry = TextCleanerRegistry.getInstance();
      registry.clear();
      registry.initializeDefaultCleaners();

      configManager = new TextCleanerConfigManager(testDbPath);
      orchestrator = new TextCleaningOrchestrator(registry, configManager);
    } catch (error) {
      console.error('Error in beforeEach:', error);
      throw error;
    }
  });

  afterEach(() => {
    if (configManager) {
      configManager.close();
    }
    if (registry) {
      registry.clear();
    }
  });

  afterAll(() => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Registry Integration', () => {
    test('initializes all default cleaners', () => {
      const cleaners = registry.getAllCleaners();
      const cleanerNames = cleaners.map(c => c.name);

      expect(cleanerNames).toContain('sanitize-html');
      expect(cleanerNames).toContain('readability');
      expect(cleanerNames).toContain('xss');
      expect(cleanerNames).toContain('voca');
      expect(cleanerNames).toContain('string-js');
      expect(cleanerNames).toContain('remark');
    });

    test('gets cleaners by format', () => {
      const htmlCleaners = registry.getCleanersForFormat(TextFormat.HTML);
      const markdownCleaners = registry.getCleanersForFormat(TextFormat.MARKDOWN);

      expect(htmlCleaners.length).toBeGreaterThan(0);
      expect(markdownCleaners.length).toBeGreaterThan(0);

      // XSS and Sanitize should support HTML
      const htmlCleanerNames = htmlCleaners.map(c => c.name);
      expect(htmlCleanerNames).toContain('xss');
      expect(htmlCleanerNames).toContain('sanitize-html');

      // Remark should support Markdown
      const mdCleanerNames = markdownCleaners.map(c => c.name);
      expect(mdCleanerNames).toContain('remark');
    });

    test('sorts cleaners by priority', () => {
      const sorted = registry.getCleanersByPriority();

      // XSS should have highest priority (95)
      expect(sorted[0].name).toBe('xss');

      // Verify descending order
      for (let i = 1; i < sorted.length; i++) {
        const prevPriority = sorted[i - 1].getConfig().priority || 0;
        const currPriority = sorted[i].getConfig().priority || 0;
        expect(prevPriority).toBeGreaterThanOrEqual(currPriority);
      }
    });
  });

  describe('Chain Integration', () => {
    test('processes text through multiple cleaners', async () => {
      const chain = new TextCleanerChain();

      const xssCleaner = registry.getCleaner('xss');
      const sanitizeCleaner = registry.getCleaner('sanitize-html');
      const vocaCleaner = registry.getCleaner('voca');

      if (xssCleaner) chain.addCleaner(xssCleaner);
      if (sanitizeCleaner) chain.addCleaner(sanitizeCleaner);
      if (vocaCleaner) chain.addCleaner(vocaCleaner);

      const input = `
        <script>alert('XSS')</script>
        <h1>Title</h1>
        <p onclick="badStuff()">  Paragraph   with   spaces  </p>
      `;

      const result = await chain.process(input, TextFormat.HTML);

      // Script should be removed
      expect(result.finalText).not.toContain('<script');
      expect(result.finalText).not.toContain('alert');

      // Event handler should be removed
      expect(result.finalText).not.toContain('onclick');

      // Text should be normalized (if Voca is configured to do so)
      expect(result.finalText).toContain('Title');
      expect(result.finalText).toContain('Paragraph');

      // Should have results from all cleaners
      expect(result.cleanerResults.length).toBe(3);
      expect(result.cleanerResults[0].metadata.cleanerName).toBe('xss');
      expect(result.cleanerResults[1].metadata.cleanerName).toBe('sanitize-html');
      expect(result.cleanerResults[2].metadata.cleanerName).toBe('voca');
    });

    test('respects cleaner priorities', async () => {
      const chain = new TextCleanerChain();

      // Add cleaners in wrong order
      const vocaCleaner = registry.getCleaner('voca');
      const xssCleaner = registry.getCleaner('xss');
      const sanitizeCleaner = registry.getCleaner('sanitize-html');

      if (vocaCleaner) chain.addCleaner(vocaCleaner);
      if (sanitizeCleaner) chain.addCleaner(sanitizeCleaner);
      if (xssCleaner) chain.addCleaner(xssCleaner);

      const input = '<script>alert(1)</script><p>Text</p>';
      const result = await chain.process(input, TextFormat.HTML);

      // Should process in priority order: XSS (95) -> Sanitize (90) -> Voca (70)
      expect(result.cleanerResults[0].metadata.cleanerName).toBe('xss');
      expect(result.cleanerResults[1].metadata.cleanerName).toBe('sanitize-html');
      expect(result.cleanerResults[2].metadata.cleanerName).toBe('voca');
    });

    test('handles cleaner failures gracefully', async () => {
      const chain = new TextCleanerChain();

      // Add a cleaner that will fail with certain input
      const xssCleaner = registry.getCleaner('xss');
      if (xssCleaner) {
        // Force an error by passing invalid config
        const badConfig = {
          enabled: true,
          priority: 100,
          options: {
            whiteList: null // This might cause an error
          }
        };
        chain.addCleaner(xssCleaner, badConfig as any);
      }

      const vocaCleaner = registry.getCleaner('voca');
      if (vocaCleaner) chain.addCleaner(vocaCleaner);

      const input = '<p>Test</p>';

      // Should not throw, should continue with next cleaner
      const result = await chain.process(input, TextFormat.HTML);
      expect(result.finalText).toBeDefined();
    });
  });

  describe('Orchestrator Integration', () => {
    test('auto-selects appropriate cleaners for HTML', async () => {
      const htmlContent = `
        <script>alert(1)</script>
        <h1>Article Title</h1>
        <nav>Navigation</nav>
        <p>Main content here</p>
        <footer>Footer</footer>
      `;

      const result = await orchestrator.cleanAuto(htmlContent, TextFormat.HTML);

      // Should remove script
      expect(result.finalText).not.toContain('<script');

      // Should preserve main content
      expect(result.finalText).toContain('Article Title');
      expect(result.finalText).toContain('Main content');
    });

    test('auto-selects appropriate cleaners for Markdown', async () => {
      const markdownContent = `
        # Heading

        Some **bold** text and *italic* text.

        [Link](http://example.com)

        \`\`\`javascript
        console.log('code');
        \`\`\`
      `;

      const result = await orchestrator.cleanAuto(markdownContent, TextFormat.MARKDOWN);

      expect(result.finalText).toBeDefined();
      expect(result.cleanerResults.length).toBeGreaterThan(0);
    });

    test('uses specific cleaners when requested', async () => {
      const input = '<p>  Text  with  spaces  </p>';

      const result = await orchestrator.cleanWithCleaners(
        input,
        ['voca', 'string-js'],
        TextFormat.PLAIN_TEXT
      );

      expect(result.cleanerResults.length).toBe(2);
      expect(result.cleanerResults[0].metadata.cleanerName).toBe('voca');
      expect(result.cleanerResults[1].metadata.cleanerName).toBe('string-js');
    });
  });

  describe('Configuration Management', () => {
    test('stores and retrieves URL-specific configurations', async () => {
      const url = 'https://example.com/page';
      const config = {
        enabled: true,
        priority: 100,
        options: {
          allowedTags: ['p', 'div', 'span']
        }
      };

      await configManager.setUrlConfig(url, 'sanitize-html', config);

      const retrieved = await configManager.getUrlConfig(url, 'sanitize-html');
      expect(retrieved).toEqual(config);
    });

    test('batch configures multiple URLs', async () => {
      const urls = [
        'https://example.com/page1',
        'https://example.com/page2',
        'https://example.com/page3'
      ];

      const config = {
        enabled: true,
        options: {
          stripTags: true
        }
      };

      await configManager.batchSetConfig(urls, 'voca', config);

      for (const url of urls) {
        const retrieved = await configManager.getUrlConfig(url, 'voca');
        expect(retrieved).toEqual(config);
      }
    });

    test('applies configuration templates', async () => {
      // First, set up some URLs
      await configManager.setUrlConfig('https://site1.com/page', 'test', { enabled: false });
      await configManager.setUrlConfig('https://site2.com/page', 'test', { enabled: false });
      await configManager.setUrlConfig('https://other.org/page', 'test', { enabled: false });

      // Apply template to .com domains
      const config = { enabled: true, priority: 50 };
      const count = await configManager.applyConfigTemplate(
        /\.com\//,
        'test',
        config
      );

      expect(count).toBe(2); // Should match site1.com and site2.com

      // Verify configurations were updated
      const site1Config = await configManager.getUrlConfig('https://site1.com/page', 'test');
      const site2Config = await configManager.getUrlConfig('https://site2.com/page', 'test');

      expect(site1Config).toEqual(config);
      expect(site2Config).toEqual(config);
    });

    test('exports and imports configurations', async () => {
      // Set up some configurations
      await configManager.setUrlConfig('https://example.com', 'xss', { enabled: true, priority: 100 });
      await configManager.setUrlConfig('https://example.com', 'voca', { enabled: false });
      await configManager.setUrlConfig('https://other.com', 'remark', { enabled: true });

      // Export configurations
      const exported = await configManager.exportConfigurations();

      // Clear and re-import
      configManager.close();
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      configManager = new TextCleanerConfigManager(testDbPath);

      await configManager.importConfigurations(exported);

      // Verify imported correctly
      const xssConfig = await configManager.getUrlConfig('https://example.com', 'xss');
      const vocaConfig = await configManager.getUrlConfig('https://example.com', 'voca');
      const remarkConfig = await configManager.getUrlConfig('https://other.com', 'remark');

      expect(xssConfig).toEqual({ enabled: true, priority: 100 });
      expect(vocaConfig).toEqual({ enabled: false });
      expect(remarkConfig).toEqual({ enabled: true });
    });
  });

  describe('Content Processor Integration', () => {
    test('integrates cleaning with content processing', async () => {
      const baseProcessor = new MockContentProcessor();
      const processor = new ContentProcessorWithCleaning(baseProcessor, orchestrator);

      const htmlContent = Buffer.from(`
        <script>alert(1)</script>
        <h1>Title</h1>
        <p onclick="bad()">Content</p>
      `);

      const result = await processor.process(htmlContent, ContentType.HTML, {
        textCleaning: {
          enabled: true,
          autoSelect: true,
          storeMetadata: true,
          preserveOriginal: true
        }
      });

      // Should have cleaned text
      expect(result.text).not.toContain('<script');
      expect(result.text).not.toContain('onclick');

      // Should preserve original
      expect(result.originalText).toContain('<script');

      // Should have cleaning metadata
      expect(result.metadata.textCleaning).toBeDefined();
      expect(result.metadata.textCleaning.cleanersUsed).toBeDefined();
      expect(result.metadata.textCleaning.cleanersUsed.length).toBeGreaterThan(0);
      expect(result.metadata.textCleaning.compressionRatio).toBeDefined();
    });

    test('uses URL-specific configuration', async () => {
      const baseProcessor = new MockContentProcessor();
      const processor = new ContentProcessorWithCleaning(baseProcessor, orchestrator);
      const url = 'https://special-site.com/page';

      // Configure specific cleaners for this URL
      await processor.configureCleanersForUrl(url, new Map([
        ['sanitize-html', {
          enabled: true,
          options: {
            allowedTags: ['h1', 'p'], // Very restrictive
            allowedAttributes: {}
          }
        }]
      ]));

      const htmlContent = Buffer.from(`
        <div class="wrapper">
          <h1>Title</h1>
          <p>Content</p>
          <img src="image.jpg">
        </div>
      `);

      const result = await processor.process(htmlContent, ContentType.HTML, {
        textCleaning: {
          enabled: true,
          cleanerNames: ['sanitize-html'],
          url,
          storeMetadata: true
        }
      });

      // div and img should be removed based on configuration
      expect(result.text).not.toContain('<div');
      expect(result.text).not.toContain('<img');

      // h1 and p should be preserved
      expect(result.text).toContain('<h1>Title</h1>');
      expect(result.text).toContain('<p>Content</p>');
    });

    test('handles processing without cleaning', async () => {
      const baseProcessor = new MockContentProcessor();
      const processor = new ContentProcessorWithCleaning(baseProcessor, orchestrator);

      const content = Buffer.from('<p>Text</p>');

      const result = await processor.process(content, ContentType.HTML);

      // Should just return base processor result
      expect(result.text).toBe('<p>Text</p>');
      expect(result.cleaningResult).toBeUndefined();
    });
  });

  describe('Real-World Scenarios', () => {
    test('cleans a complex HTML page', async () => {
      const complexHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test Page</title>
          <script src="evil.js"></script>
          <style>@import url('evil.css');</style>
        </head>
        <body onload="track()">
          <nav>Navigation Menu</nav>
          <article>
            <h1>Main Article</h1>
            <p onclick="clickTrack()">
              This is the main content with <a href="javascript:void(0)">bad link</a>.
            </p>
            <img src="x" onerror="imageError()">
            <iframe src="tracker.html"></iframe>
          </article>
          <aside>Sidebar</aside>
          <footer>Footer</footer>
          <script>
            document.cookie = 'tracked=yes';
          </script>
        </body>
        </html>
      `;

      const result = await orchestrator.cleanAuto(complexHtml, TextFormat.HTML);

      // All dangerous content should be removed
      expect(result.finalText).not.toContain('<script');
      expect(result.finalText).not.toContain('onload');
      expect(result.finalText).not.toContain('onclick');
      expect(result.finalText).not.toContain('onerror');
      expect(result.finalText).not.toContain('javascript:');
      expect(result.finalText).not.toContain('<iframe');
      expect(result.finalText).not.toContain('@import');
      expect(result.finalText).not.toContain('document.cookie');

      // Safe content should be preserved
      expect(result.finalText).toContain('Main Article');
      expect(result.finalText).toContain('main content');
    });

    test('processes markdown with code blocks', async () => {
      const markdown = `
        # Technical Article

        Here's some code:

        \`\`\`javascript
        function dangerous() {
          eval('alert(1)');
        }
        \`\`\`

        And some inline \`code\` too.

        > Blockquote with **emphasis**

        - List item 1
        - List item 2
      `;

      const result = await orchestrator.cleanAuto(markdown, TextFormat.MARKDOWN);

      expect(result.finalText).toBeDefined();
      expect(result.finalText.length).toBeGreaterThan(0);

      // Structure should be preserved (unless configured otherwise)
      if (!result.chainConfig.find(c => c.options?.removeCodeBlocks)) {
        expect(result.finalText).toContain('function dangerous');
      }
    });

    test('handles mixed content appropriately', async () => {
      const mixedContent = `
        <h1>HTML Title</h1>
        Some plain text here.
        <script>badStuff();</script>
        More plain text.
        <p>HTML paragraph</p>
      `;

      const result = await orchestrator.cleanAuto(mixedContent, TextFormat.MIXED);

      expect(result.finalText).not.toContain('<script');
      expect(result.finalText).toContain('HTML Title');
      expect(result.finalText).toContain('plain text');
      expect(result.finalText).toContain('HTML paragraph');
    });
  });

  describe('Performance', () => {
    test('handles large documents efficiently', async () => {
      // Create a large HTML document
      const largeHtml = `
        <html>
        <body>
        ${Array(1000).fill('<p onclick="track()">Paragraph content</p>').join('\n')}
        </body>
        </html>
      `;

      const start = Date.now();
      const result = await orchestrator.cleanAuto(largeHtml, TextFormat.HTML);
      const duration = Date.now() - start;

      expect(result.finalText).toBeDefined();
      expect(result.finalText).not.toContain('onclick');
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('caches configurations efficiently', async () => {
      const url = 'https://cached-site.com';

      // Set configuration
      await configManager.setUrlConfig(url, 'test', { enabled: true });

      // First retrieval (from database)
      const start1 = Date.now();
      const config1 = await configManager.getUrlConfig(url, 'test');
      const duration1 = Date.now() - start1;

      // Second retrieval (should be cached)
      const start2 = Date.now();
      const config2 = await configManager.getUrlConfig(url, 'test');
      const duration2 = Date.now() - start2;

      expect(config1).toEqual(config2);
      expect(duration2).toBeLessThanOrEqual(duration1); // Cache should be faster or equal
    });
  });
});