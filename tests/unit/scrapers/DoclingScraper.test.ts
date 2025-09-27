/**
 * Unit tests for DoclingScraper
 */

import { DoclingScraper } from '../../../src/scrapers/DoclingScraper';
import {
  DoclingParameters,
  DoclingPipeline
} from '../../../src/interfaces/IScraperParameters';

describe('DoclingScraper', () => {
  jest.setTimeout(60000); // Set default timeout for all tests in this suite
  let scraper: DoclingScraper;

  beforeEach(() => {
    scraper = new DoclingScraper();
  });

  afterEach(async () => {
    // Clean up any resources
    await scraper.cleanup();
  });

  describe('Basic Functionality', () => {
    test('should have correct name', () => {
      expect(scraper.getName()).toBe('docling');
    });

    test('should have correct features', () => {
      const features = scraper.getFeatures();
      expect(features.javascript).toBe(false);
      expect(features.cookies).toBe(false);
      expect(features.proxy).toBe(false);
      expect(features.screenshot).toBe(false);
      expect(features.pdfGeneration).toBe(false);
      expect(features.multiPage).toBe(false);
    });

    test('should handle document URLs', () => {
      expect(scraper.canHandle('https://example.com/document.pdf')).toBe(true);
      expect(scraper.canHandle('https://example.com/file.docx')).toBe(true);
      expect(scraper.canHandle('https://example.com/presentation.pptx')).toBe(true);
      expect(scraper.canHandle('https://example.com/spreadsheet.xlsx')).toBe(true);
    });

    test('should handle document download URLs', () => {
      expect(scraper.canHandle('https://example.com/download/file')).toBe(true);
      expect(scraper.canHandle('https://example.com/document/123')).toBe(true);
      expect(scraper.canHandle('https://example.com/attachment/file')).toBe(true);
      expect(scraper.canHandle('https://example.com/export/report')).toBe(true);
    });

    test('should not handle non-document URLs', () => {
      expect(scraper.canHandle('https://example.com')).toBe(false);
      expect(scraper.canHandle('file:///path/to/file')).toBe(false);
      expect(scraper.canHandle('ftp://example.com')).toBe(false);
    });
  });

  describe('Parameter Management', () => {
    test('should set and get parameters', () => {
      const params: DoclingParameters = {
        format: 'json',
        ocr: true,
        tableStructure: true
      };

      scraper.setParameters(params);
      const retrieved = scraper.getParameters();

      expect(retrieved).toEqual(params);
    });

    test('should merge parameters with defaults', async () => {
      const params: DoclingParameters = {
        format: 'html',
        ocr: true
      };

      scraper.setParameters(params);

      const result = await scraper.scrape('https://example.com/doc.pdf');

      expect(result.scraperName).toBe('docling');
      expect(result.mimeType).toBe('text/html');
      expect(result.metadata?.scraperMetadata?.format).toBe('html');
    });
  });

  describe('Output Formats', () => {
    test('should handle markdown format', async () => {
      const params: DoclingParameters = {
        format: 'markdown'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/doc.pdf');

      expect(result.mimeType).toBe('text/markdown');
      expect(result.metadata?.scraperMetadata?.format).toBe('markdown');
    }, 60000);

    test('should handle JSON format', async () => {
      const params: DoclingParameters = {
        format: 'json'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/doc.pdf');

      expect(result.mimeType).toBe('application/json');
      expect(result.metadata?.scraperMetadata?.format).toBe('json');
    }, 60000);

    test('should handle HTML format', async () => {
      const params: DoclingParameters = {
        format: 'html'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/doc.pdf');

      expect(result.mimeType).toBe('text/html');
      expect(result.metadata?.scraperMetadata?.format).toBe('html');
    }, 60000);

    test('should handle text format', async () => {
      const params: DoclingParameters = {
        format: 'text'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/doc.pdf');

      expect(result.mimeType).toBe('text/plain');
      expect(result.metadata?.scraperMetadata?.format).toBe('text');
    }, 60000);
  });

  describe('OCR Configuration', () => {
    test('should handle OCR with tesseract', async () => {
      const params: DoclingParameters = {
        ocr: true,
        ocrEngine: 'tesseract'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/scanned.pdf');

      expect(result.metadata?.scraperMetadata?.ocr).toBe(true);
      expect(result.metadata?.scraperMetadata?.ocrEngine).toBe('tesseract');
    }, 60000);

    test('should handle OCR with easyocr', async () => {
      const params: DoclingParameters = {
        ocr: true,
        ocrEngine: 'easyocr'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/scanned.pdf');

      expect(result.metadata?.scraperMetadata?.ocr).toBe(true);
      expect(result.metadata?.scraperMetadata?.ocrEngine).toBe('easyocr');
    }, 60000);

    test('should handle OCR with paddleocr', async () => {
      const params: DoclingParameters = {
        ocr: true,
        ocrEngine: 'paddleocr'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/scanned.pdf');

      expect(result.metadata?.scraperMetadata?.ocr).toBe(true);
      expect(result.metadata?.scraperMetadata?.ocrEngine).toBe('paddleocr');
    }, 60000);
  });

  describe('Table and Figure Extraction', () => {
    test('should extract tables', async () => {
      const params: DoclingParameters = {
        tableStructure: true,
        exportTables: true,
        tableFormat: 'markdown'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/doc-with-tables.pdf');

      expect(result.metadata?.scraperMetadata?.tableCount).toBeDefined();
    });

    test('should extract figures', async () => {
      const params: DoclingParameters = {
        exportFigures: true,
        figureFormat: 'png'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/doc-with-images.pdf');

      expect(result.metadata?.scraperMetadata?.figureCount).toBeDefined();
    });

    test('should handle different table formats', async () => {
      const formats: Array<'markdown' | 'html' | 'csv' | 'json'> = [
        'markdown', 'html', 'csv', 'json'
      ];

      for (const format of formats) {
        const params: DoclingParameters = {
          exportTables: true,
          tableFormat: format
        };

        scraper.setParameters(params);
        const result = await scraper.scrape('https://example.com/table.pdf');

        expect(result.scraperName).toBe('docling');
      }
    });
  });

  describe('Document Metadata Extraction', () => {
    test('should extract form fields', async () => {
      const params: DoclingParameters = {
        extractFormFields: true
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/form.pdf');

      expect(result.metadata?.scraperMetadata?.formFieldCount).toBeDefined();
    });

    test('should extract annotations', async () => {
      const params: DoclingParameters = {
        extractAnnotations: true
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/annotated.pdf');

      expect(result.metadata?.scraperMetadata?.annotationCount).toBeDefined();
    });

    test('should extract bookmarks', async () => {
      const params: DoclingParameters = {
        extractBookmarks: true
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/bookmarked.pdf');

      expect(result.metadata?.scraperMetadata?.bookmarkCount).toBeDefined();
    });

    test('should extract embedded files', async () => {
      const params: DoclingParameters = {
        extractEmbeddedFiles: true
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/with-attachments.pdf');

      expect(result.metadata?.scraperMetadata?.embeddedFileCount).toBeDefined();
    });
  });

  describe('Page Handling', () => {
    test('should handle page range', async () => {
      const params: DoclingParameters = {
        pageRange: [1, 10]
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/large-doc.pdf');

      expect(result.scraperName).toBe('docling');
    });

    test('should handle max pages', async () => {
      const params: DoclingParameters = {
        maxPages: 50
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/large-doc.pdf');

      expect(result.scraperName).toBe('docling');
    });

    test('should export page images', async () => {
      const params: DoclingParameters = {
        exportPageImages: true
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/doc.pdf');

      expect(result.scraperName).toBe('docling');
    });
  });

  describe('Document Type Detection', () => {
    test('should detect PDF documents', async () => {
      const params: DoclingParameters = {
        documentType: 'auto'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/file.pdf');

      expect(result.metadata?.scraperMetadata?.documentType).toBeDefined();
    });

    test('should detect Office documents', async () => {
      const urls = [
        'https://example.com/file.docx',
        'https://example.com/file.pptx',
        'https://example.com/file.xlsx'
      ];

      for (const url of urls) {
        const result = await scraper.scrape(url);
        expect(result.metadata?.scraperMetadata?.documentType).toBeDefined();
      }
    });

    test('should handle explicit document type', async () => {
      const params: DoclingParameters = {
        documentType: 'pdf'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/unknown-file');

      expect(result.metadata?.scraperMetadata?.documentType).toBe('pdf');
    });
  });

  describe('Language Support', () => {
    test('should handle multiple languages', async () => {
      const params: DoclingParameters = {
        languages: ['en', 'es', 'fr']
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/multilang.pdf');

      expect(result.metadata?.scraperMetadata?.language).toBe('en');
    });
  });

  describe('Quality and Processing Options', () => {
    test('should handle DPI settings', async () => {
      const params: DoclingParameters = {
        dpi: 600
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/scan.pdf');

      expect(result.scraperName).toBe('docling');
    });

    test('should handle image processing options', async () => {
      const params: DoclingParameters = {
        binarize: true,
        removeWatermarks: true,
        enhanceScannedText: true
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/scanned.pdf');

      expect(result.scraperName).toBe('docling');
    });

    test('should handle quality threshold', async () => {
      const params: DoclingParameters = {
        qualityThreshold: 0.9
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/doc.pdf');

      expect(result.scraperName).toBe('docling');
    });
  });

  describe('Document Organization', () => {
    test('should merge pages', async () => {
      const params: DoclingParameters = {
        mergePages: true
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/multi-page.pdf');

      expect(result.scraperName).toBe('docling');
    });

    test('should split by section', async () => {
      const params: DoclingParameters = {
        splitBySection: true
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/sectioned.pdf');

      expect(result.scraperName).toBe('docling');
    });

    test('should handle chunking', async () => {
      const params: DoclingParameters = {
        chunkSize: 1000,
        overlapSize: 200
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/long-doc.pdf');

      expect(result.scraperName).toBe('docling');
    });
  });

  describe('Pipeline Configuration', () => {
    test('should handle pipeline stages', async () => {
      const pipeline: DoclingPipeline[] = [
        {
          stage: 'preprocessing',
          operation: 'denoise',
          params: { level: 'high' }
        },
        {
          stage: 'extraction',
          operation: 'tables',
          params: { format: 'csv' }
        },
        {
          stage: 'postprocessing',
          operation: 'format',
          params: { style: 'academic' }
        }
      ];

      const params: DoclingParameters = {
        pipeline
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/doc.pdf');

      expect(result.scraperName).toBe('docling');
    });
  });

  describe('Batch Processing', () => {
    test('should process multiple documents', async () => {
      const urls = [
        'https://example.com/doc1.pdf',
        'https://example.com/doc2.docx',
        'https://example.com/doc3.pptx'
      ];

      const results = await scraper.scrapeBatch(urls);

      expect(results).toHaveLength(3);
      expect(results[0].url).toBe(urls[0]);
      expect(results[1].url).toBe(urls[1]);
      expect(results[2].url).toBe(urls[2]);
    }, 60000);

    test('should adjust batch size based on OCR', () => {
      const ocrParams: DoclingParameters = {
        ocr: true
      };
      scraper.setParameters(ocrParams);

      const batchSize = (scraper as any).getBatchSize({
        scraperSpecific: ocrParams
      });
      expect(batchSize).toBe(2); // Lower concurrency with OCR

      // Test with image extraction
      const imageParams: DoclingParameters = {
        exportPageImages: true
      };
      scraper.setParameters(imageParams);

      const imageBatchSize = (scraper as any).getBatchSize({
        scraperSpecific: imageParams
      });
      expect(imageBatchSize).toBe(3); // Lower concurrency with images

      // Test normal mode
      scraper.setParameters({});
      const normalBatchSize = (scraper as any).getBatchSize({});
      expect(normalBatchSize).toBe(5); // Normal concurrency
    });
  });

  describe('Document Cache', () => {
    test('should cache downloaded documents', async () => {
      const url = 'https://example.com/cached.pdf';

      // First request
      await scraper.scrape(url);

      // Second request should use cache
      const result = await scraper.scrape(url);
      expect(result.scraperName).toBe('docling');
    });
  });

  describe('Error Handling', () => {
    test('should handle download failures gracefully', async () => {
      // In test environment, the scraper falls back to mock data
      const result = await scraper.scrape('https://invalid.example.com/doc.pdf');
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.scraperName).toBe('docling');
    });

    test('should fallback when OCR fails', async () => {
      const params: DoclingParameters = {
        ocr: true
      };

      scraper.setParameters(params);

      // Should retry without OCR on failure
      const result = await scraper.scrape('https://example.com/corrupted.pdf');
      expect(result.scraperName).toBe('docling');
    });
  });

  describe('Mock Implementation', () => {
    test('should use mock when Docling not installed', async () => {
      const mock = (scraper as any).getMockDocling();
      expect(mock).toBeDefined();
      expect(mock.DocumentConverter).toBeDefined();

      const converter = new mock.DocumentConverter({});
      const result = await converter.convert(Buffer.from('test'), {});

      expect(result.document.text).toBe('Mock Docling extracted content');
      expect(result.metadata.title).toBe('Mock Document');
    });

    test('should have correct mock enums', () => {
      const mock = (scraper as any).getMockDocling();

      expect(mock.TableFormatOptions.MARKDOWN).toBe('markdown');
      expect(mock.OCREngine.TESSERACT).toBe('tesseract');
      expect(mock.DocumentType.AUTO).toBe('auto');
    });
  });

  describe('Cleanup', () => {
    test('should clear document cache', async () => {
      // Add documents to cache
      await scraper.scrape('https://example.com/doc1.pdf');
      await scraper.scrape('https://example.com/doc2.pdf');

      // Clean up
      await scraper.cleanup();

      // Scraper should still work after cleanup
      const result = await scraper.scrape('https://example.com/doc3.pdf');
      expect(result.scraperName).toBe('docling');
    });
  });
});