/**
 * Unit tests for DoclingScraper
 */

import { DoclingScraper } from '../../../src/scrapers/DoclingScraper';
import {
  DoclingParameters,
  DoclingPipeline
} from '../../../src/interfaces/IScraperParameters';

describe('DoclingScraper', () => {
  // Reduced timeout since we're mocking Python execution
  jest.setTimeout(10000); // 10 seconds should be plenty for unit tests with mocks
  let scraper: DoclingScraper;
  let mockPythonBridgeExecute: jest.SpyInstance;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    scraper = new DoclingScraper();

    // Save original fetch
    originalFetch = global.fetch;

    // Mock global fetch to prevent actual HTTP requests
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(100),
      headers: new Map([['content-type', 'application/pdf']])
    } as any);

    // Mock the PythonBridge execute method to prevent actual Python subprocess execution
    // This follows SOLID's Dependency Inversion Principle - unit tests should use mocks
    const pythonBridge = (scraper as any).pythonBridge;
    mockPythonBridgeExecute = jest.spyOn(pythonBridge, 'execute').mockImplementation(
      async (...mockArgs: unknown[]) => {
        const args = mockArgs[1] as any[] || [];
        // Extract options from args if provided
        const config = args[0] || {};
        const options = config.options || {};

        // Create mock response based on requested format
        const format = options.format || 'markdown';
        const mockContent = format === 'json'
          ? { title: 'Test Document', content: 'Test content' }
          : 'Test document content';

        return {
          success: true,
          data: {
            success: true,
            content: mockContent,
            format: format,
            document: {
              text: 'Test document content',
              markdown: '# Test Document\n\nTest content',
              html: '<h1>Test Document</h1><p>Test content</p>',
              json: { title: 'Test Document', content: 'Test content' }
            },
            metadata: {
              title: 'Test Document',
              author: 'Test Author',
              page_count: 10,
              word_count: 500,
              document_type: options.document_type || 'pdf',
              language: 'en',
              created_date: '2024-01-01',
              modified_date: '2024-01-02'
            },
            tables: options.export_tables ? [{ rows: [['Header'], ['Data']] }] : [],
            figures: options.export_figures ? [{ caption: 'Figure 1', page: 1 }] : [],
            annotations: options.extract_annotations ? [{ type: 'note', content: 'Test note' }] : [],
            bookmarks: options.extract_bookmarks ? [{ title: 'Chapter 1', page: 1 }] : [],
            form_fields: options.extract_form_fields ? [{ name: 'field1', value: 'value1' }] : [],
            embedded_files: options.extract_embedded_files ? [{ name: 'file.txt', size: 100, type: 'text/plain' }] : []
          },
          stderr: '',
          exitCode: 0,
          executionTime: 100
        };
      }
    );
  });

  afterEach(async () => {
    // Restore mocks
    if (mockPythonBridgeExecute) {
      mockPythonBridgeExecute.mockRestore();
    }

    // Restore original fetch
    global.fetch = originalFetch;

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
    });

    test('should handle JSON format', async () => {
      const params: DoclingParameters = {
        format: 'json'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/doc.pdf');

      expect(result.mimeType).toBe('application/json');
      expect(result.metadata?.scraperMetadata?.format).toBe('json');
    });

    test('should handle HTML format', async () => {
      const params: DoclingParameters = {
        format: 'html'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/doc.pdf');

      expect(result.mimeType).toBe('text/html');
      expect(result.metadata?.scraperMetadata?.format).toBe('html');
    });

    test('should handle text format', async () => {
      const params: DoclingParameters = {
        format: 'text'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/doc.pdf');

      expect(result.mimeType).toBe('text/plain');
      expect(result.metadata?.scraperMetadata?.format).toBe('text');
    });
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
    });

    test('should handle OCR with easyocr', async () => {
      const params: DoclingParameters = {
        ocr: true,
        ocrEngine: 'easyocr'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/scanned.pdf');

      expect(result.metadata?.scraperMetadata?.ocr).toBe(true);
      expect(result.metadata?.scraperMetadata?.ocrEngine).toBe('easyocr');
    });

    test('should handle OCR with paddleocr', async () => {
      const params: DoclingParameters = {
        ocr: true,
        ocrEngine: 'paddleocr'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com/scanned.pdf');

      expect(result.metadata?.scraperMetadata?.ocr).toBe(true);
      expect(result.metadata?.scraperMetadata?.ocrEngine).toBe('paddleocr');
    });
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
    });

    test('should adjust batch size based on OCR', () => {
      const ocrParams: DoclingParameters = {
        ocr: true
      };
      scraper.setParameters(ocrParams);

      const batchSize = (scraper as any).getBatchSize({
        scraperSpecific: ocrParams
      });
      expect(batchSize).toBe(2); // Lower concurrency with OCR

      // Test with figure extraction
      const figureParams: DoclingParameters = {
        exportFigures: true
      };
      scraper.setParameters(figureParams);

      const figureBatchSize = (scraper as any).getBatchSize({
        scraperSpecific: figureParams
      });
      expect(figureBatchSize).toBe(3); // Lower concurrency with figure extraction

      // Test normal mode
      scraper.setParameters({});
      const normalBatchSize = (scraper as any).getBatchSize({});
      expect(normalBatchSize).toBe(5); // Normal concurrency
    });
  });

  describe('Document Cache', () => {
    test('should cache downloaded documents', async () => {
      const url = 'https://example.com/cached.pdf';

      // Mock global fetch for document download
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/pdf']]),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
      } as any);

      // Mock the Python Bridge execute method
      const pythonBridge = (scraper as any).pythonBridge;
      const mockExecute = jest.spyOn(pythonBridge, 'execute').mockResolvedValue({
        success: true,
        data: {
          success: true,
          content: 'Mock PDF content',
          format: 'markdown',
          metadata: {
            title: 'Cached Document',
            page_count: 1
          }
        }
      });

      // First request
      const result1 = await scraper.scrape(url);
      expect(result1.scraperName).toBe('docling');

      // Second request should use cache
      const result2 = await scraper.scrape(url);
      expect(result2.scraperName).toBe('docling');

      // Fetch should be called only once (cache hit on second request)
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Python bridge should be called twice (once for each scrape)
      expect(mockExecute).toHaveBeenCalledTimes(2);

      // Restore mocks
      global.fetch = originalFetch;
      mockExecute.mockRestore();
    });
  });

  describe('Error Handling', () => {
    test('should handle download failures gracefully', async () => {
      // Mock the Python Bridge to simulate failure
      const pythonBridge = (scraper as any).pythonBridge;
      const mockExecute = jest.spyOn(pythonBridge, 'execute').mockResolvedValue({
        success: false,
        error: 'Failed to download document'
      });

      try {
        await scraper.scrape('https://invalid.example.com/doc.pdf');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.message).toContain('Failed');
      }

      mockExecute.mockRestore();
    });

    test('should fallback when OCR fails', async () => {
      const params: DoclingParameters = {
        ocr: true
      };

      // Mock Python Bridge with OCR failure simulation
      const pythonBridge = (scraper as any).pythonBridge;
      const mockExecute = jest.spyOn(pythonBridge, 'execute').mockResolvedValue({
        success: true,
        data: {
          success: true,
          content: 'Fallback content without OCR',
          format: 'markdown',
          metadata: {
            ocr_failed: true,
            fallback_used: true
          }
        }
      });

      scraper.setParameters(params);

      // Should retry without OCR on failure
      const result = await scraper.scrape('https://example.com/corrupted.pdf');
      expect(result.scraperName).toBe('docling');

      mockExecute.mockRestore();
    });
  });

  describe('Python Bridge Integration', () => {
    test('should use Python bridge for document processing', () => {
      // DoclingScraper uses PythonBridge to execute Python scripts
      // The actual Docling library runs in Python, not TypeScript
      const pythonBridge = (scraper as any).pythonBridge;
      expect(pythonBridge).toBeDefined();
      expect(pythonBridge.constructor.name).toBe('PythonBridge');
    });

    test('should have wrapper script path configured', () => {
      const wrapperPath = (scraper as any).wrapperPath;
      expect(wrapperPath).toBeDefined();
      expect(wrapperPath).toContain('docling_wrapper.py');
    });
  });

  describe('Cleanup', () => {
    test('should clear document cache', async () => {
      // Mock Python Bridge for all scrape operations
      const pythonBridge = (scraper as any).pythonBridge;
      const mockExecute = jest.spyOn(pythonBridge, 'execute').mockResolvedValue({
        success: true,
        data: {
          success: true,
          content: 'Mock PDF content',
          format: 'markdown',
          metadata: {
            title: 'Test Document'
          }
        }
      });

      // Add documents to cache
      await scraper.scrape('https://example.com/doc1.pdf');
      await scraper.scrape('https://example.com/doc2.pdf');

      // Clean up
      await scraper.cleanup();

      // Scraper should still work after cleanup
      const result = await scraper.scrape('https://example.com/doc3.pdf');
      expect(result.scraperName).toBe('docling');

      mockExecute.mockRestore();
    });
  });
});