/**
 * Unit tests for XssCleaner
 * Tests XSS prevention and SOLID compliance
 */

import { XssCleaner } from '../../../src/cleaners/XssCleaner';
import { TextFormat } from '../../../src/interfaces/ITextCleaner';

describe('XssCleaner', () => {
  let cleaner: XssCleaner;

  beforeEach(() => {
    cleaner = new XssCleaner();
  });

  describe('SOLID Compliance', () => {
    test('follows Single Responsibility - only prevents XSS', () => {
      expect(cleaner.name).toBe('xss');
      expect(cleaner.description).toContain('XSS');
      expect(cleaner.supportedFormats).toContain(TextFormat.HTML);
      expect(cleaner.supportedFormats).toContain(TextFormat.MIXED);
    });

    test('follows Open/Closed - configurable without modification', () => {
      const config = {
        enabled: true,
        priority: 100,
        options: {
          whiteList: {
            custom: ['attr1', 'attr2']
          }
        }
      };

      cleaner.updateConfig(config);
      const updated = cleaner.getConfig();

      expect(updated.options?.whiteList?.custom).toEqual(['attr1', 'attr2']);
    });

    test('has highest priority for security', () => {
      const config = cleaner.getConfig();
      expect(config.priority).toBe(95); // Should be high priority
    });
  });

  describe('XSS Prevention', () => {
    test('removes inline JavaScript', async () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).not.toContain('javascript:');
      expect(result.metadata.statistics?.custom?.jsProtocolsRemoved).toBe(1);
    });

    test('removes event handlers', async () => {
      const inputs = [
        '<div onclick="alert(1)">Click</div>',
        '<img onerror="alert(1)" src="x">',
        '<body onload="alert(1)">',
        '<input onfocus="alert(1)">'
      ];

      for (const input of inputs) {
        const result = await cleaner.clean(input);
        expect(result.cleanedText).not.toMatch(/on\w+=/i);
      }
    });

    test('removes script tags completely', async () => {
      const input = '<script>alert(document.cookie)</script><p>Text</p>';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).not.toContain('<script');
      expect(result.cleanedText).not.toContain('document.cookie');
      expect(result.cleanedText).toContain('Text');
    });

    test('removes data URIs with scripts', async () => {
      const input = '<a href="data:text/html,<script>alert(1)</script>">Link</a>';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).not.toContain('data:text/html');
    });

    test('allows safe data URIs (images)', async () => {
      const input = '<img src="data:image/png;base64,iVBORw0KGgoA...">';
      const result = await cleaner.clean(input);

      // Safe image data URIs might be allowed
      expect(result.cleanedText).toBeDefined();
      expect(result.metadata.statistics?.custom?.xssPatternsFound).toBeDefined();
    });

    test('removes vbscript protocol', async () => {
      const input = '<a href="vbscript:alert(1)">Click</a>';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).not.toContain('vbscript:');
    });

    test('removes meta refresh with javascript', async () => {
      const input = '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).not.toContain('meta');
      expect(result.cleanedText).not.toContain('refresh');
    });

    test('removes base tag manipulation', async () => {
      const input = '<base href="http://evil.com/">';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).not.toContain('<base');
    });

    test('removes form action manipulation', async () => {
      const input = '<button formaction="javascript:alert(1)">Submit</button>';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).not.toContain('formaction');
    });

    test('removes SVG with scripts', async () => {
      const input = '<svg onload="alert(1)"><circle r="10"/></svg>';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).not.toContain('onload');
    });

    test('removes iframes', async () => {
      const input = '<iframe src="http://evil.com"></iframe>';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).not.toContain('<iframe');
      expect(result.warnings).toContain('Iframes were removed for security');
    });

    test('removes embed and object tags', async () => {
      const input = '<embed src="evil.swf"><object data="evil.swf"></object>';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).not.toContain('<embed');
      expect(result.cleanedText).not.toContain('<object');
      expect(result.metadata.statistics?.custom?.embedsRemoved).toBe(1);
      expect(result.metadata.statistics?.custom?.objectsRemoved).toBe(1);
    });
  });

  describe('Additional XSS Patterns', () => {
    test('removes import statements', async () => {
      const input = '<style>@import url("http://evil.com/evil.css");</style>';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).not.toContain('@import');
    });

    test('removes expression calls', async () => {
      const input = '<div style="width: expression(alert(1))">Text</div>';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).not.toContain('expression(');
    });

    test('handles encoded XSS attempts', async () => {
      const inputs = [
        '<img src=x onerror="&#97;&#108;&#101;&#114;&#116;&#40;&#49;&#41;">',
        '<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;:alert(1)">',
        '<div onclick="&#97;lert(1)">Click</div>'
      ];

      for (const input of inputs) {
        const result = await cleaner.clean(input);
        expect(result.cleanedText).not.toMatch(/on\w+=/i);
        expect(result.cleanedText).not.toContain('javascript');
      }
    });
  });

  describe('Safe Content Preservation', () => {
    test('preserves safe HTML structure', async () => {
      const input = `
        <h1>Title</h1>
        <p>Paragraph with <strong>bold</strong> and <em>italic</em></p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      `;

      const result = await cleaner.clean(input);

      expect(result.cleanedText).toContain('<h1>Title</h1>');
      expect(result.cleanedText).toContain('<strong>bold</strong>');
      expect(result.cleanedText).toContain('<em>italic</em>');
      expect(result.cleanedText).toContain('<li>Item 1</li>');
    });

    test('preserves safe links', async () => {
      const input = '<a href="https://example.com" rel="nofollow">Safe Link</a>';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).toContain('href="https://example.com"');
      expect(result.cleanedText).toContain('Safe Link');
    });

    test('preserves safe images', async () => {
      const input = '<img src="https://example.com/image.png" alt="Description">';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).toContain('src="https://example.com/image.png"');
      expect(result.cleanedText).toContain('alt="Description"');
    });
  });

  describe('Configuration Options', () => {
    test('respects custom whitelist', async () => {
      const input = '<customtag>Content</customtag>';

      const result = await cleaner.clean(input, {
        enabled: true,
        options: {
          whiteList: {
            customtag: []
          }
        }
      });

      expect(result.cleanedText).toContain('<customtag>Content</customtag>');
    });

    test('strict mode prevents all potentially dangerous content', async () => {
      const input = '<div>Text <!-- comment --></div>';

      const result = await cleaner.clean(input, {
        enabled: true,
        options: {
          enableStrictMode: true,
          allowCommentTag: false
        }
      });

      expect(result.cleanedText).not.toContain('<!--');
      expect(result.cleanedText).not.toContain('comment');
    });
  });

  describe('Statistics and Warnings', () => {
    test('tracks XSS patterns found', async () => {
      const input = `
        <script>alert(1)</script>
        <div onclick="alert(2)">Click</div>
        <a href="javascript:alert(3)">Link</a>
        <iframe src="evil"></iframe>
      `;

      const result = await cleaner.clean(input);

      expect(result.metadata.statistics?.scriptsRemoved).toBe(1);
      expect(result.metadata.statistics?.custom?.eventHandlersRemoved).toBe(1);
      expect(result.metadata.statistics?.custom?.jsProtocolsRemoved).toBe(1);
      expect(result.metadata.statistics?.custom?.iframesRemoved).toBe(1);
    });

    test('generates appropriate warnings', async () => {
      const input = `
        <script>var x = 1;</script>
        <iframe src="content"></iframe>
        <form action="/submit"></form>
        <div onclick="doSomething()">Click</div>
      `;

      const result = await cleaner.clean(input);

      expect(result.warnings).toContain('Script tags were removed for security');
      expect(result.warnings).toContain('Event handlers were removed for security');
      expect(result.warnings).toContain('Iframes were removed for security');
      expect(result.warnings).toContain('Form elements were removed - may affect functionality');
    });

    test('warns about excessive content removal', async () => {
      const input = '<script>' + 'x'.repeat(1000) + '</script><p>X</p>';
      const result = await cleaner.clean(input);

      const warnings = result.warnings || [];
      const removalWarning = warnings.find(w => w.includes('% of content was removed'));
      expect(removalWarning).toBeDefined();
    });
  });

  describe('Configuration Validation', () => {
    test('rejects script tag in whitelist', () => {
      const validation = cleaner.validateConfig({
        enabled: true,
        options: {
          whiteList: {
            script: []
          }
        }
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Script tags should never be whitelisted for XSS prevention');
    });

    test('warns about CSS without strict mode', () => {
      const validation = cleaner.validateConfig({
        enabled: true,
        options: {
          css: true,
          enableStrictMode: false
        }
      });

      expect(validation.warnings).toContain('Allowing CSS without strict mode may pose security risks');
    });

    test('warns about allowing comments', () => {
      const validation = cleaner.validateConfig({
        enabled: true,
        options: {
          allowCommentTag: true
        }
      });

      expect(validation.warnings).toContain('Allowing HTML comments may preserve sensitive information');
    });

    test('warns about not stripping ignored tags', () => {
      const validation = cleaner.validateConfig({
        enabled: true,
        options: {
          stripIgnoreTag: false,
          stripIgnoreTagBody: false
        }
      });

      expect(validation.warnings).toContain('Not stripping ignored tags may leave dangerous content');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty input', async () => {
      const result = await cleaner.clean('');
      expect(result.cleanedText).toBe('');
    });

    test('handles plain text', async () => {
      const input = 'Plain text without HTML';
      const result = await cleaner.clean(input);
      expect(result.cleanedText).toBe(input);
    });

    test('handles malformed HTML', async () => {
      const input = '<div><p>Unclosed<div><span onclick="alert(1)"';
      const result = await cleaner.clean(input);

      expect(result.cleanedText).toBeDefined();
      expect(result.cleanedText).not.toContain('onclick');
    });

    test('handles very long attributes', async () => {
      const longAttribute = 'x'.repeat(10000);
      const input = `<div onclick="${longAttribute}">Text</div>`;

      const result = await cleaner.clean(input);
      expect(result.cleanedText).not.toContain('onclick');
      expect(result.cleanedText).toContain('Text');
    });
  });

  describe('Performance', () => {
    test('processes large documents efficiently', async () => {
      const largeInput = '<div>' + '<p onclick="alert(1)">Content</p>'.repeat(1000) + '</div>';

      const start = Date.now();
      const result = await cleaner.clean(largeInput);
      const duration = Date.now() - start;

      expect(result.cleanedText).toBeDefined();
      expect(result.cleanedText).not.toContain('onclick');
      expect(duration).toBeLessThan(2000); // Should process in under 2 seconds
    });
  });
});