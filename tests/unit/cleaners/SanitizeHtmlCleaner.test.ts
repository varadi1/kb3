/**
 * Unit tests for SanitizeHtmlCleaner
 * Tests SOLID compliance and functionality
 */

import { SanitizeHtmlCleaner } from '../../../src/cleaners/SanitizeHtmlCleaner';
import { TextFormat } from '../../../src/interfaces/ITextCleaner';

describe('SanitizeHtmlCleaner', () => {
  let cleaner: SanitizeHtmlCleaner;

  beforeEach(() => {
    cleaner = new SanitizeHtmlCleaner();
  });

  describe('SOLID Compliance', () => {
    test('follows Single Responsibility - only sanitizes HTML', () => {
      expect(cleaner.name).toBe('sanitize-html');
      expect(cleaner.supportedFormats).toContain(TextFormat.HTML);
      expect(cleaner.supportedFormats).toContain(TextFormat.MIXED);
    });

    test('follows Open/Closed - can be configured without modification', () => {
      cleaner.updateConfig({
        options: {
          allowedTags: ['p', 'div'],
          allowedAttributes: {}
        }
      });

      const newConfig = cleaner.getConfig();
      expect(newConfig.options?.allowedTags).toEqual(['p', 'div']);
      expect(newConfig.options?.allowedAttributes).toEqual({});
    });

    test('follows Liskov Substitution - can be used as ITextCleaner', () => {
      expect(cleaner.clean).toBeDefined();
      expect(cleaner.canClean).toBeDefined();
      expect(cleaner.getConfig).toBeDefined();
      expect(cleaner.updateConfig).toBeDefined();
      expect(cleaner.validateConfig).toBeDefined();
    });
  });

  describe('Functionality', () => {
    test('removes dangerous script tags', async () => {
      const input = '<p>Hello</p><script>alert("XSS")</script><p>World</p>';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).not.toContain('<script>');
      expect(result.cleanedText).not.toContain('alert');
      expect(result.cleanedText).toContain('Hello');
      expect(result.cleanedText).toContain('World');
      expect(result.metadata.statistics?.scriptsRemoved).toBe(1);
    });

    test('removes style tags by default', async () => {
      const input = '<p>Text</p><style>body { color: red; }</style>';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).not.toContain('<style>');
      expect(result.cleanedText).not.toContain('color: red');
      expect(result.metadata.statistics?.stylesRemoved).toBe(1);
    });

    test('preserves allowed tags', async () => {
      const input = '<h1>Title</h1><p>Paragraph</p><a href="http://example.com">Link</a>';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).toContain('<h1>Title</h1>');
      expect(result.cleanedText).toContain('<p>Paragraph</p>');
      expect(result.cleanedText).toContain('<a href="http://example.com">Link</a>');
    });

    test('removes javascript: protocol from href', async () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).not.toContain('javascript:');
      expect(result.cleanedText).toContain('Click');
    });

    test('removes event handlers', async () => {
      const input = '<button onclick="alert(1)">Click</button>';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).not.toContain('onclick');
      expect(result.cleanedText).not.toContain('alert');
    });

    test('handles empty input', async () => {
      const result = await cleaner.clean('');

      expect(result.cleanedText).toBe('');
      expect(result.originalLength).toBe(0);
      expect(result.cleanedLength).toBe(0);
    });

    test('handles plain text', async () => {
      const input = 'Plain text without HTML';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).toBe(input);
    });

    test('removes iframes by default', async () => {
      const input = '<iframe src="http://evil.com"></iframe><p>Content</p>';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).not.toContain('<iframe');
      expect(result.cleanedText).toContain('Content');
      expect(result.warnings).toContain('iframes were removed during sanitization');
    });

    test('removes form elements by default', async () => {
      const input = '<form action="/submit"><input type="text" /></form>';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).not.toContain('<form');
      expect(result.cleanedText).not.toContain('<input');
      expect(result.warnings).toContain('form elements were removed during sanitization');
    });

    test('allows custom configuration', async () => {
      const input = '<custom>Text</custom>';

      // First test with default config - custom tag should be removed
      const result1 = await cleaner.clean(input);
      expect(result1.cleanedText).not.toContain('<custom>');

      // Now allow the custom tag
      const result2 = await cleaner.clean(input, {
        enabled: true,
        options: {
          allowedTags: ['custom']
        }
      });
      expect(result2.cleanedText).toContain('<custom>Text</custom>');
    });

    test('generates statistics correctly', async () => {
      const input = `
        <div>
          <script>alert(1)</script>
          <p>Text</p>
          <style>body{}</style>
          <a href="http://example.com">Link</a>
        </div>
      `;

      const result = await cleaner.clean(input);

      expect(result.metadata.statistics).toBeDefined();
      expect(result.metadata.statistics?.scriptsRemoved).toBe(1);
      expect(result.metadata.statistics?.stylesRemoved).toBe(1);
      expect(result.metadata.statistics?.tagsRemoved).toBeGreaterThan(0);
    });

    test('generates warnings for excessive content removal', async () => {
      const input = '<script>' + 'x'.repeat(1000) + '</script><p>Hi</p>';
      const result = await cleaner.clean(input);

      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContainEqual(
        expect.stringContaining('More than 90% of content was removed')
      );
    });
  });

  describe('Configuration Validation', () => {
    test('validates nesting limit', () => {
      const validation = cleaner.validateConfig({
        enabled: true,
        options: {
          nestingLimit: 0
        }
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Nesting limit must be at least 1');
    });

    test('warns about vulnerable tags', () => {
      const validation = cleaner.validateConfig({
        enabled: true,
        options: {
          allowVulnerableTags: true
        }
      });

      expect(validation.warnings).toContain('Allowing vulnerable tags may pose security risks');
    });

    test('warns about stripping all tags without text filter', () => {
      const validation = cleaner.validateConfig({
        enabled: true,
        options: {
          allowedTags: false,
          textFilter: undefined
        }
      });

      expect(validation.warnings).toContain(
        'Stripping all tags without text filter may result in unreadable text'
      );
    });
  });

  describe('Error Handling', () => {
    test('handles invalid HTML gracefully', async () => {
      const input = '<div><p>Unclosed tags<div><span>';

      // Should not throw
      const result = await cleaner.clean(input);
      expect(result.cleanedText).toBeDefined();
    });

    test('respects timeout configuration', async () => {
      const input = '<p>' + 'Large content '.repeat(10000) + '</p>';

      const start = Date.now();
      await cleaner.clean(input, {
        enabled: true,
        timeout: 100
      });
      const duration = Date.now() - start;

      // Should complete within reasonable time of timeout
      expect(duration).toBeLessThan(200);
    }, 500);
  });

  describe('Performance', () => {
    test('processes large documents efficiently', async () => {
      const largeInput = '<div>' + '<p>Content</p>'.repeat(1000) + '</div>';

      const start = Date.now();
      const result = await cleaner.clean(largeInput);
      const duration = Date.now() - start;

      expect(result.cleanedText).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should process in under 1 second
    });
  });
});